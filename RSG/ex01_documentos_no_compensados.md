# EX01 - Exposición de Documentos Contables No Compensados

**Proyecto:** MAVI  
**ID Requerimiento:** EX01  
**Descripción:** Exposición de Documentos contables No Compensados (Cuentas por Cobrar).

---

## 1. Contexto Funcional y Supuestos
Se requiere contar con información de todos los documentos contables de deudor que aún no hayan concluido su proceso de cuenta por cobrar (facturas no liquidadas, anticipos no aplicados a facturas, pagos parciales). 

Para lograrlo, SAP expone el CDS View **`ZFI_PA_CLIENTES`**, el cual une información de múltiples tablas (FI y SD), calcula sumatorias (saldos) y clasifica el tipo de documento. 
- **Supuestos:** Existe configuración previa de Condiciones de Pago en SAP y la tabla `ZAGRUPADORESCOBRO`. El sistema legado (C#) utilizará la API resultante para consumir esta vista.

---

## 2. Construcción de la Vista S4HANA (Lógica de Negocio)

La lógica para formar los datos de la API se compone de las siguientes reglas de agrupación y cálculo nativas en SAP:

### 2.1. Universo Base (Tabla BSEG)
Se buscan los registros en el Segmento de Contabilidad (`BSEG`) donde:
- Sociedad `BUKRS = 5510`
- Clase de cuenta `KOART = D` (Deudor)
- Documento de compensación `AUGBL = Vacío`

*(Esto trae 31 campos base como BELNR, DMBTR, SGTXT, ZTERM, etc.)*

### 2.2. Cruce con Cabecera (Tabla BKPF)
Se hace un JOIN con `BKPF` mediante Sociedad, Documento y Ejercicio, extrayendo 20 campos de cabecera como:
- `BLART` (Clase doc FI), `BLDAT` (Fecha doc.), `USNAM` (Usuario), Referencias y Anulaciones.

### 2.3. Cálculo de Impuestos (BSET / KONP)
Se adiciona el Importe de Impuestos dependiendo de la **Clase de documento (BLART)**:
1. **Si es Factura/Nota (RV, RZ, RG, RJ, RC, RD, DW, DY):**  
   Se toma el impuesto de `BSET-HWSTE`.
2. **Si es Cobro/Reversa (DV, DZ, DX):**  
   Se busca el documento original en `BSEG` vía `ZUONR`. Se obtiene el indicador `MWSKZ`.
   - Se busca el indicador en tabla `A003` para País MX.
   - Con el `KNUMH` de `A003`, se busca el porcentaje en tabla `KONP-KBETR`.
   - Si KONP > 0: `PORCENTAJE = KONP / 1000`.
   - `Importe Impuesto = (BSEG-DMBTR / (1+PORCENTAJE)) * PORCENTAJE`.

### 2.4. Datos Complementarios (Anticipos, Cobros y CeBe)
- **Cobros/Anticipos (DW, DY, TVARVC ZFIClasesCobro):** Se busca en `BSEG` donde `KOART=S` (Cta. Mayor) y `HKONT` no inicie en 0022. Se extrae `VALUT`, se mapea `ZUONR` como **Referencia de Pago** y `XREF1` como **BP Cajero del movimiento**.
- **Centro de Beneficio (CeBe):** Bajo las mismas reglas de búsqueda, se extrae el campo `PRCTR`.

### 2.5. Datos de Ventas SD (Left Join)
Para facturas o Notas (RV, RZ, RG, RJ, RC, RD), se cruza con las tablas SD:
- **VBRK / VBRP:** Para Clase factura, Organización, Canal, Sector, Centro, Oficina, Motivo.
- **ZSDT_VBAK:** Contadores de impresión (Simple, Ciego, CFD).
- **ZTSD_VBRK (SD_VBRK):** Factura Asociada (`ZORIGTRANSNUMBER`).
- **VRKPA:** Función interlocutor Agente (Z1), que reemplaza el valor de **BP Cajero**.

### 2.6. Clasificación de Movimiento (Bandera "Contable")
La bandera "Contable" define si el registro **no** se incluye en el estado de cuenta del cliente (Valor 1).
- **Documentos SD (Facturas/Notas):** `ValorSD = SD_ + VBRP-AUGRU_AUFT`. Si existe en la variable `CLASIFDEX01` de la tabla `STVARC`, `Contable = 1`.
- **Documentos FI (Cobros):** `ValorFI = FI_ + BLART + ZZ1_CLASEFACTURA_JEI`. Si existe en `CLASIFDEX01`, `Contable = 1`.
- **Anticipos/Reversas (DW, DX):** `Contable = 0`.

### 2.7. Sumatoria de Saldo (`SALDO`)
Para los documentos donde `Contable` es vacío:
- Se sumariza `DMBTR` agrupando por `ZUONR`. Si `SHKZG = H` (Haber), el `DMBTR` se vuelve negativo.
- El valor calculado se inyecta en el campo `SALDO` de todos los registros donde `BELNR = ZUONR`.

---

## 3. Pruebas Unitarias de Casos de Uso (CDVIEW)

La validación del requerimiento cubre estos escenarios E2E nativos:

| ID | Caso de Uso | Resultados Esperados / Validaciones |
| :--- | :--- | :--- |
| 1 | Movimientos de Facturas (Credilanas, Seguros, Mercaderías) | Campos completos, Saldo calculado correcto, Contable correcto. |
| 2 | Notas de Cargo (Credilanas, Seguros, Mercaderías) | Campos completos, Saldo calculado correcto, Contable correcto. |
| 3 | Notas de Crédito (Credilanas, Seguros, Mercaderías) | Contable correcto, Campos SD complementarios presentes. |
| 4 | Cobros | Contable correcto, Campos de contracuenta (banco/caja) presentes. |
| 5 | Cobro de Intereses Moratorios | Campos completos, contracuenta presente. |
| 6 | Factura Espejo | Campos completos, contracuenta presente. |
| 7 | Anticipos | Clasificación de Contable correcta. |
| 8 | Notas de Crédito Credilana (Escenario 1b) | Ver cómo factura disminuye el saldo a esta nota. |

---

## 4. Endpoint OData y Consumo (.NET C#)

- **Nombre del Servicio:** `ZAPI_EX01_NOCOMP_SRV`
- **Entidad Expuesta:** `DocNoCompSet`
- **Método HTTP:** `GET`
- **Llaves Principales:** `BUKRS`, `BELNR`, `GJAHR`

### Filtros Principales Soportados (`$filter`)
La API soporta `$filter` para una amplia gama de campos como `BUKRS`, `BELNR`, `KUNNR` (Cliente), `BLDAT` (Fechas), `ZUONR` (Asignación), `Contable` (Filtro por Clasificación), `BPCAJERO` y `REFPAGO`.

**Ejemplo de Petición S4:**
```http
GET /sap/opu/odata/sap/ZAPI_EX01_NOCOMP_SRV/DocNoCompSet?$filter=( Belnr eq '9000000088' or Belnr eq '9000000161' or Belnr eq '9000000284' )&$format=json
```

---

## 5. Glosario Técnico Clave
| Concepto | Descripción |
| :--- | :--- |
| **BSEG-KOART** | D-Deudor, S-Cuenta mayor, K-Acreedor. |
| **BSEG-ZUONR** | Asignación. Agrupa movimientos para permitir compensación de saldo a cero. |
| **A003 / KONP** | Tablas de indicadores e importes de condición para impuestos en México. |
| **TVARVC** | Tabla estándar SAP para almacenar valores de variantes (evita hardcode). |
| **SHKZG** | Indicador de Cargo (S) o Haber (H). |

---
*Etiquetas: #EX01 #Abonos #CuentasPorCobrar #OData #S4HANA #Consultas #LogicaDeNegocio*
