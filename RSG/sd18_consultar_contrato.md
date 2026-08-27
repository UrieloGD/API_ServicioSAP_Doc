---
proyecto: Mavi
id_requerimiento: SD18
descripcion: Especificación Funcional - Consultar Contrato de Condiciones (Monedero)
---

# Especificación Maestra: Consultar Contrato de Condiciones (SD18)

## 1. Contexto Funcional
Esta API "Inbound" permite al sistema POS **consultar** (mediante un método HTTP `GET`) un Contrato de Condiciones en SAP S/4HANA. En el contexto del negocio de MAVI, este contrato equivale a la información de un **Monedero** (Virtual o Físico) y su respectivo saldo disponible.

---

## 2. Lógica de Petición (GET Request)

A diferencia de las APIs SD01, SD03, SD04 y SD09, **SD18 es de solo lectura**. El sistema C# (.NET) realizará una petición `GET` utilizando filtros OData en la URL. No existe un payload (Body JSON).

**Ejemplo de Petición OData (Por Referencia POS):**
`/ConditionContractSet(Reference='13450025')`

**Ejemplo de Petición OData (Filtrando solo con Saldo):**
`/ConditionContractSet?$filter=(ZsaldoCheck eq 'C')`

### 2.1 Parámetros de Búsqueda Soportados
| Parámetro OData | Equivalencia POS | Tipo | Comentarios |
| :--- | :--- | :--- | :--- |
| `Reference` | ID Monedero POS | CHAR16 | Campo llave para la búsqueda de un monedero específico. |
| `ZsaldoCheck` | Verificar Saldo | CHAR1 | "C" (Con saldo), "S" (Sin saldo), " " (Todos). |

---

## 3. Lógica de Respuesta (Response Payload)

Si la consulta es exitosa, SAP retorna un JSON con la estructura OData de la entidad `ConditionContract`. 

### 3.1 Nodos del Response

| Nodo | Descripción | Comentarios/Reglas de Negocio | Tipo/Long. |
| :--- | :--- | :--- | :--- |
| `Reference` | ID Monedero POS | Campo llave | CHAR16 |
| `Num` | ID Monedero S4 | ID Interno de SAP | CHAR10 |
| `ContractType` | Tipo de contrato | `ZMNV` = Virtual, `ZMNF` = Físico | CHAR4 |
| `Assignment` | Asignación | | CHAR16 |
| `CustOwner` | Cliente | Código de Business Partner | CHAR10 |
| `Vkorg` | Organización | | CHAR4 |
| `Vtweg` | Canal | | CHAR2 |
| `Vkbur` | Oficina | | CHAR4 |
| `Zsaldo` | **Saldo de monedero** | Monto consolidado. | CURR10 |
| `ZsaldoCheck` | Indicador de saldo | "C" o "S" | CHAR1 |
| `Zfkdat` | Fecha último mov. | La fecha más reciente de la tabla de facturas. | DATS8 |
| `DateTo` | Vigencia | Fecha fin de validez del monedero | DATS8 |
| `Deact` | Estatus Activo | "X" = Inactivo, vacío = Activo | CHAR1 |
| `CreatedBy` | Creador | Usuario de SAP | CHAR12 |

---

## 4. Orquestación y Lógica ABAP (Extensiones)

Para conocimiento informativo, cuando C# solicita la URL GET, ABAP internamente:
1. Consulta la tabla `WCOCOH` (Cabecera de Contrato de Condición) usando la `Reference` enviada por C#.
2. Hace join con la vista CDS `ZVWB2_VBRKVBRP_1` filtrando por `ZZBSTNKVF = Reference`.
3. Extrae la fecha más reciente (`FKDAT`) para inyectarla en `Zfkdat`.
4. Suma todos los movimientos (positivos y negativos) del campo `BONBA` para calcular dinámicamente el `Zsaldo`.
5. Retorna la estructura JSON consolidada. 

> [!IMPORTANT]
> **REGLA ARQUITECTÓNICA DE C#:** Tal como se acordó, el código .NET solo despachará la URL HTTP GET y mapeará el JSON de respuesta devuelto a la clase `SD18ConditionContractResponse`. No hará lógica de sumatorias ni consultas a tablas locales ni a vistas de SAP.

---

## 5. Detalles Técnicos
- **Objeto S4**: `ZAPI_CONDITIONCONTRACT_SRV`
- **Artefacto CPI**: `RSG_SD18_ZAPI_CONDITIONCONTRACT_SRV`
- **Entidad OData**: `/ConditionContractSet`
- **Método**: `GET`
- **Seguridad**: Autenticación Bearer Token provisto por C# a través de OAuth 2.0. Al ser GET, no se requiere enviar un `X-CSRF-TOKEN` nuevo, solo consumirlo si es la puerta de entrada.
