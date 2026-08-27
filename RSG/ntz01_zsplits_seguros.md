# Especificación Funcional: N-TZ01 (Parcialidades Seguros - ZSE_SPLITS)

**Proyecto:** MAVI
**Número de Ticket o Delta:** N-TZ01-Seguros
**Descripción:** API para creación, consulta, actualización de parcialidades en tabla Zsplits Seguros (`ZSE_SPLITS`).
*(Nota: Aplica para facturas de seguros, e incluye campos específicos para manejo de cancelaciones y siniestros).*

---

## 1. Especificación Funcional

### 1.1. Dependencias
- **Tabla `ZSE_SPLIT`**: Creación información de parcialidades Seguros.

### 1.2. Supuestos
- El cliente define el periodo de tiempo en el cual se ejecutará el llamado de la API.
- El sistema legado (C#) debe desarrollar la lógica para poder utilizar los artefactos expuestos desde SAP.
- La API solo está expuesta para los métodos y entidades descritos en este documento.
- El método estándar de comunicación entre un sistema no SAP y SAP es por medio de APIs OData.

### 1.3. Contexto Funcional
El negocio requiere contar con una tabla Z en S4 con los campos que se utilizarán para llevar el control de los Seguros a nivel parcialidad. La actualización de esta tabla se realizará mayormente mediante esta API.

El integrador utilizará la API expuesta para realizar las siguientes operaciones (CRUD) en la tabla `ZSE_SPLITS`:
- Lectura de registros (GET)
- Creación de registros (POST)
- Modificación / Actualización de registros (PUT/PATCH)
- Eliminación de registros (DELETE)

### 1.4. Descripción del Requerimiento
Se requiere la construcción de una API para que desde el legado se pueda leer, crear, modificar o eliminar registros en la tabla `ZSE_SPLITS`.

**Campos Llave (Primary Keys):**
- `FKART` - Clase de factura (ej. ZPI1, ZPRE)
- `VBELN` - Documento de facturación
- `ZSPLIT` - Numero de parcialidad

---

## 2. Información Técnica y Objetos

- **Nombre de Objeto S4:** `Z_SRVB_TZ01_ZSPLIT_SEGUROS`
- **URL S4 (Base):** `https://10.30.2.135:44300/sap/opu/odata4/sap/z_srvb_tz01_zsplit_seguros/srvd_a2x/sap/Z_SRVB_TZ01_ZSPLIT_SEGUROS/0001/`
- **Entidad Principal:** `zsplits` *(Nota: En la sección técnica se menciona "Headerset" pero la URL expone `zsplits`)*

*(Nota de Integración: Las URLs de CPI han sido omitidas de esta documentación técnica para mantener el estándar de apuntar directamente a los endpoints nativos de S/4HANA).*

### 2.1 Métodos y Entidades del Servicio Expuesto

| Entidad | Método | Descripción |
|---|---|---|
| `zsplits` | GET | Recuperar registros |
| `zsplits` | POST | Creación de registro |
| `zsplits` | PUT / PATCH | Actualizar campos |
| `zsplits` | DELETE | Eliminar registros |

#### Diccionario de Datos Principal (Estructura S4H)
| Campo S4H | Descripción | Tipo Dato S4H |
|---|---|---|
| **`FKART`** | **Clase de factura** | CHAR (4) |
| **`VBELN`** | **Documento de facturación** | CHAR (10) |
| **`ZSPLIT`** | **Numero de parcialidad** | INT4 |
| `FKDAT` | Fecha factura | DATS (8) |
| `VKORG` | Organización de ventas | CHAR (4) |
| `VTWEG` | Canal de distribución | CHAR (2) |
| `VKBUR` | Oficina de ventas | CHAR (4) |
| `VGBEL` | Número de documento del documento modelo | CHAR (10) |
| `AUGRU_AUFT`| Motivo de pedido | CHAR (3) |
| `PARTNER` | Socio comercial | CHAR (10) |
| `ZBF` | Numero de BP del Beneficiario Final | CHAR (10) |
| `ZTOTAL` | Importe total de la venta | CURR (23,2) |
| `ZZTERM` | Condición de pago | CHAR (4) |
| `ZMONTO_SPLIT` | Importe de la parcialidad | CURR (23,2) |
| `ZVENC_SPLIT` | Vencimiento de la parcialidad | DATS (8) |
| `ZCONC_SPLIT` | Fecha de conclusión de la parcialidad | DATS (8) |
| `ZANULA` | Check indicando parcialidad anulada | CHAR (1) |
| `ZFECHA_ANULA` | Fecha de Anulación de la Parcialidad | DATS (8) |
| `ZCOBROS` | Importe acumulado de cobros recibidos | CURR (23,2) |
| `ZNCREDITOS` | Importe acumulado bonif. manuales recibidas | CURR (23,2) |
| `ZCANCELACION`| Importe acumulado de la cancelación del seguro| CURR (23,2) |
| `ZABONOS` | Sumatoria de todos los abonos | CURR (23,2) |
| `ZSALDO` | Saldo actual de la parcialidad | CURR (23,2) |
| `ZDIAS_VENC` | Días Vencidos actuales de la Parcialidad | INT4 |
| `ZMAX_DV` | Máximo Histórico de Días Vencidos | INT4 |
| `ZDIAS_INAC` | Días Inactivos actuales de la Parcialidad | INT4 |
| `ZMAX_DI` | Máximo Histórico de Días Inactivos | INT4 |
| `ZSDO_INICIAL`| Movimiento considerado en Cargas Iniciales | CHAR (1) |

---

## 3. Pruebas Unitarias S4H (Endpoints y Payloads)

### Método GET
**URL:** `GET https://10.30.2.135:44300/sap/opu/odata4/sap/z_srvb_tz01_zsplit_seguros/srvd_a2x/sap/Z_SRVB_TZ01_ZSPLIT_SEGUROS/0001/zsplits?$format=json&sap-client=110`

---

### Método POST (Creación)
**URL:** `POST https://10.30.2.135:44300/sap/opu/odata4/sap/z_srvb_tz01_zsplit_seguros/srvd_a2x/sap/Z_SRVB_TZ01_ZSPLIT_SEGUROS/0001/zsplits?sap-client=110`

**Body (Ejemplo con FKART = ZPI1):**
```json
{
    "Fkart": "ZPI1",
    "Vbeln": "9000000495",
    "Zsplit": 5,
    "Fkdat": "2025-01-01",
    "Vkorg": "01",
    "Vtweg": "02",
    "Vkbur": "001",
    "Vgbel": "9000000493",
    "AugruAuft": "",
    "Partner": "1000000",
    "Zbf": "1000000",
    "Ztotal": 6000.00,
    "Zzterm": "NT30",
    "ZmontoSplit": 1000.00,
    "ZvencSplit": "2025-05-01",
    "ZconcSplit": null,
    "Zanula": "",
    "ZfechaAnula": null,
    "Zcobros": 0.00,
    "Zncreditos": 0.00,
    "Zcancelacion": 0.00,
    "Zabonos": 0.00,
    "Zsaldo": 1000.00,
    "ZdiasVenc": 0,
    "ZmaxDv": 0,
    "ZdiasInac": 0,
    "ZmaxDi": 0,
    "ZsdoInicial": "",
    "Zmoneda": "MXN"
}
```

---

### Método PATCH (Actualización)
**URL:** `PATCH .../zsplits(Fkart='ZPI1',Vbeln='9000000495',Zsplit=5)?sap-client=110`

**Body:**
```json
{
    "Zcobros": 500,
    "Zmoneda": "MXN"
}
```

---

### Método DELETE
**URL:** `DELETE .../zsplits(Fkart='ZPRE',Vbeln='9000000493',Zsplit=18)?sap-client=110`

---

### Método BATCH (Múltiples Operaciones)
*Ideal para enviar múltiples parcialidades de seguros en un solo request.*

**URL:** `POST .../$batch?sap-client=110`

**Body (Multipart):**
```text
--batch_dca6-74d2-d53f
Content-Type: multipart/mixed; boundary=changeset_21cc-1e7e-f983

--changeset_21cc-1e7e-f983
Content-Type: application/http
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1
Content-Type: application/json
Accept: application/json

{
    "Fkart": "ZPI1",
    "Vbeln": "9000000495",
    "Zsplit": 10,
    ...
}

--changeset_21cc-1e7e-f983
Content-Type: application/http
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1
Content-Type: application/json
Accept: application/json

{
    "Fkart": "ZPI1",
    "Vbeln": "9000000495",
    "Zsplit": 11,
    ...
}
--changeset_21cc-1e7e-f983--
--batch_dca6-74d2-d53f--
```
