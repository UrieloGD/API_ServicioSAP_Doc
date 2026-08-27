# Especificación Funcional: TZ01 (Parcialidades Credilana / Abonos - ZPR_SPLITS)

**Proyecto:** MAVI
**Número de Ticket o Delta:** TZ01
**Descripción:** API para creación, consulta, actualización de parcialidades en tabla ZsplitsCredilanas (`ZPR_SPLITS`). 
*(Nota: Soporta la gestión de abonos y créditos para las clases de factura ZPRE, ZMER, ZSEG, etc.)*

---

## 1. Especificación Funcional

### 1.1. Dependencias
- **Tabla `ZPR_SPLIT`**: Creación de información de parcialidades Credilana.

### 1.2. Supuestos
- El cliente define el periodo de tiempo en el cual se ejecutará el llamado de la API.
- El sistema legado (C#) debe desarrollar la lógica para poder utilizar los artefactos expuestos desde SAP.
- La API solo está expuesta para los métodos y entidades descritos en este documento.
- El método estándar de comunicación entre un sistema no SAP y SAP es por medio de APIs OData.

### 1.3. Contexto Funcional
El negocio requiere contar con una tabla Z en S4 con los campos que se utilizarán para llevar el control de los Préstamos a nivel parcialidad. La actualización de esta tabla se realizará mayormente mediante esta API.

El integrador utilizará la API expuesta para realizar las siguientes operaciones (CRUD) en la tabla `ZPR_SPLITS`:
- Lectura de registros (GET)
- Creación de registros (POST)
- Modificación / Actualización de registros (PUT/PATCH)
- Eliminación de registros (DELETE)

### 1.4. Descripción del Requerimiento
Se requiere la construcción de una API para que desde el legado se pueda leer, crear, eliminar y modificar registros en la tabla `ZPR_SPLITS`.

**Campos Llave (Primary Keys):**
- `FKART` - Clase de factura (ej. ZPRE, ZMER, ZSEG)
- `VBELN` - Documento de facturación
- `ZSPLIT` - Numero de parcialidad

---

## 2. Información Técnica y Objetos

- **Nombre de Objeto S4:** `z_srvb_tz01_zsplit`
- **URL S4 (Base):** `https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata4/sap/z_srvb_tz01_zsplit/srvd_a2x/sap/zsd_tz01_zsplit/0001/`
- **Entidad Principal:** `zsplits`

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
| `AUGRU_AUFT` | Motivo de pedido | CHAR (3) |
| `PARTNER` | Socio comercial | CHAR (10) |
| `ZBF` | Numero de BP del Beneficiario Final | CHAR (10) |
| `ZCAPITAL` | Importe Capital Prestado | CURR (23,2) |
| `ZFINANCIAMIENTO` | Importe Financiamiento con IVA | CURR (23,2) |
| `ZTOTAL` | Importe total de la venta | CURR (23,2) |
| `ZPORC_CAP` | Porcentaje de Capital | DEC (15,13) |
| `ZPORC_FIN` | Porcentaje de Financiamiento | DEC (15,13) |
| `ZZTERM` | Condición de pago | CHAR (4) |
| `ZMONTO_SPLIT` | Importe de la parcialidad | CURR (23,2) |
| `ZVENC_SPLIT` | Vencimiento de la parcialidad | DATS (8) |
| `ZCONC_SPLIT` | Fecha de conclusión de la parcialidad | DATS (8) |
| `ZANULA` | Check indicando parcialidad anulada | CHAR (1) |

---

## 3. Pruebas Unitarias S4H (Endpoints y Payloads)

### Método GET
**URL:** `GET https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata4/sap/z_srvb_tz01_zsplit/srvd_a2x/sap/zsd_tz01_zsplit/0001/zsplits?$format=json&sap-client=110`

**URL con Filtros:**
`GET .../zsplits?$format=json&sap-client=110&$filter=Vbeln eq '9000000493' and Zsplit eq 2`

---

### Método POST (Creación)
**URL:** `POST https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata4/sap/z_srvb_tz01_zsplit/srvd_a2x/sap/zsd_tz01_zsplit/0001/zsplits?sap-client=110`

**Body (Ejemplo con FKART = ZPRE):**
```json
{
    "Fkart": "ZPRE",
    "Vbeln": "9000000493",
    "Zsplit": 30,
    "Fkdat": "2024-05-07",
    "Vkorg": "01",
    "Vtweg": "03",
    "Vkbur": "01",
    "Vgbel": "9000000000",
    "AugruAuft": "",
    "Partner": "1500000023",
    "Zbf": "1500000023",
    "Zcapital": 8000.00,
    "Zfinanciamiento": 4000.00,
    "Ztotal": 12000.00,
    "ZporcCap": 66.6666700000000,
    "ZporcFin": 33.3333300000000,
    "Zzterm": "012M",
    "ZmontoSplit": 1000.00,
    "ZvencSplit": "2024-11-01",
    "ZconcSplit": null,
    "Zanula": "",
    "ZfechaAnula": null,
    "ZidbonCc": 0,
    "ZbonCc": 0.00,
    "ZidbonPp": 0,
    "ZbonPp": 0.00,
    "ZcobroPp": 0.00,
    "ZbonExtDgracia": 0,
    "ZbonExt": 0.00,
    "ZcobroExt": 0.00,
    "ZmontoPue": 0.00,
    "ZdoctoPpd": "",
    "ZmontoPpd": 0.00,
    "ZcobroPpd": 0.00,
    "ZncredPpd": 0.00,
    "Zcobros": 0.00,
    "ZbonAut": 0.00,
    "ZbonMan": 0.00,
    "Zadjudica": 0.00,
    "Zquebranto": 0.00,
    "ZconvenioRd": 0.00,
    "Zabonos": 0.00,
    "Zsaldo": 100.00,
    "ZdiasVenc": 0,
    "ZmaxDv": 0,
    "ZdiasInac": 0,
    "ZmaxDi": 0,
    "Zinterv": "",
    "ZultPagoIm": "2024-12-15",
    "Zremanente": 0.00,
    "Zmoratorio": 0.00,
    "ZusrAutCi": "",
    "ZfecAutCi": null,
    "ZejercicioQf": 0,
    "ZmontoQf": 0.00,
    "ZsdoInicial": "",
    "Zmoneda": "MXN"
}
```

---

### Método PUT / PATCH (Actualización)
**URL:** `PATCH .../zsplits(Fkart='ZPRE',Vbeln='9000000493',Zsplit=30)?$format=json&sap-client=110`

**Body:**
```json
{
    "Zcapital": 8000.00,
    "Zfinanciamiento": 4000.00,
    "Ztotal": 12000.00,
    "Zmoneda": "MXN"
}
```

---

### Método DELETE
**URL:** `DELETE .../zsplits(Fkart='ZPRE',Vbeln='9000000493',Zsplit=30)?sap-client=110`

---

### Método BATCH (Múltiples Operaciones)
*Ideal para enviar múltiples parcialidades en un solo request.*

**URL:** `POST .../$batch?sap-client=110`

**Body (Multipart):**
```text
--batch_01
Content-Type: multipart/mixed; boundary=changeset_01

--changeset_01
Content-Type: application/http
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1
Content-Type: application/json
Accept: application/json

{
    "Fkart": "ZPRE",
    "Vbeln": "9000000493",
    "Zsplit": 61,
    ...
}

--changeset_01
Content-Type: application/http
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1
Content-Type: application/json
Accept: application/json

{
    "Fkart": "ZPRE",
    "Vbeln": "9000000493",
    "Zsplit": 62,
    ...
}

--changeset_01--
--batch_01--
```
