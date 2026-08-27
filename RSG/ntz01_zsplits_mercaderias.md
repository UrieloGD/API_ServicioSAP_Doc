# Especificación Funcional: N-TZ01 (Parcialidades Mercaderías - ZME_SPLITS)

**Proyecto:** MAVI
**Número de Ticket o Delta:** N-TZ01-Mercaderías
**Descripción:** API para creación, consulta, actualización de parcialidades en tabla Zsplits Mercaderías (`ZME_SPLITS`).
*(Nota: Aplica para facturas de mercadería, e incluye campos específicos como Anticipos y Monedero).*

---

## 1. Especificación Funcional

### 1.1. Dependencias
- **Tabla `ZME_SPLIT`**: Creación información de parcialidades Mercaderías.

### 1.2. Supuestos
- El cliente define el periodo de tiempo en el cual se ejecutará el llamado de la API.
- El sistema legado (C#) debe desarrollar la lógica para poder utilizar los artefactos expuestos desde SAP.
- La API solo está expuesta para los métodos y entidades descritos en este documento.
- El método estándar de comunicación entre un sistema no SAP y SAP es por medio de APIs OData.

### 1.3. Contexto Funcional
El negocio requiere contar con una tabla Z en S4 con los campos que se utilizarán para llevar el control de las Facturas de mercadería a nivel parcialidad. La actualización de esta tabla se realizará mayormente mediante esta API.

El integrador utilizará la API expuesta para realizar las siguientes operaciones (CRUD) en la tabla `ZME_SPLITS`:
- Lectura de registros (GET)
- Creación de registros (POST)
- Modificación / Actualización de registros (PATCH)
- Eliminación de registros (DELETE)

### 1.4. Descripción del Requerimiento
Se requiere la construcción de una API para que desde el legado se pueda leer, crear, modificar o eliminar registros en la tabla `ZME_SPLITS`.

**Campos Llave (Primary Keys):**
- `FKART` - Clase de factura (ej. ZMER)
- `VBELN` - Documento de facturación
- `ZSPLIT` - Numero de parcialidad

---

## 2. Información Técnica y Objetos

- **Nombre de Objeto S4:** `zsb_ntz01_zsplit_merc`
- **URL S4 (Base):** `https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata4/sap/zsb_ntz01_zsplit_merc/srvd_a2x/sap/zsd_ntz01_zsplit_merc/0001/`
- **Entidad Principal:** `zsplits`

*(Nota de Integración: Las URLs de CPI han sido omitidas de esta documentación técnica para mantener el estándar de apuntar directamente a los endpoints nativos de S/4HANA).*

### 2.1 Métodos y Entidades del Servicio Expuesto

| Entidad | Método | Descripción |
|---|---|---|
| `zsplits` | GET | Recuperar registros |
| `zsplits` | POST | Creación de registro |
| `zsplits` | PATCH | Actualizar campos |
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
| `ZIDBON_CC` | Id Campaña Bonificación Contado Comercial | INT4 |
| `ZANTICIPOS`| Importe acumulado de los enganches recibidos | CURR (23,2) |
| `ZCOBROS` | Importe acum. cobros parcialidad recibida | CURR (23,2) |
| `ZBON_AUT` | Importe acum. Bonif. Aut. Recibida a parc. | CURR (23,2) |
| `ZMONEDERO` | Importe acum. redenciones monedero | CURR (23,2) |
| `ZADJUDICA` | Importe acum. cobros especie X adjudicación| CURR (23,2) |
| `ZABONOS` | Sumatoria de los Abonos | CURR (23,2) |
| `ZSALDO` | Saldo actual de la parcialidad | CURR (23,2) |

---

## 3. Pruebas Unitarias S4H (Endpoints y Payloads)

### Método GET
**URL:** `GET https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata4/sap/zsb_ntz01_zsplit_merc/srvd_a2x/sap/zsd_ntz01_zsplit_merc/0001/zsplits?sap-client=110&$format=json`

**URL con Filtros:**
`GET .../zsplits?sap-client=110&$filter=Vbeln eq '9000000136' and Zsplit eq 3&$format=json`

---

### Método POST (Creación)
**URL:** `POST https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata4/sap/zsb_ntz01_zsplit_merc/srvd_a2x/sap/zsd_ntz01_zsplit_merc/0001/zsplits?sap-client=110`

**Body (Ejemplo con FKART = ZMER):**
```json
{
    "Fkart": "ZMER",
    "Vbeln": "9000000136",
    "Zsplit": 20,
    "Fkdat": "2024-07-07",
    "Vkorg": "1",
    "Vtweg": "2",
    "Vkbur": "1",
    "Vgbel": "9000000000",
    "AugruAuft": "",
    "Partner": "1500000082",
    "Zbf": "1500000082",
    "Ztotal": 12000.00,
    "Zzterm": "NT30",
    "ZmontoSplit": 1000.00,
    "ZvencSplit": "2024-08-07",
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
    "Zanticipos": 0.00,
    "Zcobros": 0.00,
    "ZbonAut": 0.00,
    "ZbonMan": 0.00,
    "Zmonedero": 0.00,
    "Zadjudica": 0.00,
    "Zquebranto": 0.00,
    "ZconvenioRd": 0.00,
    "Zabonos": 0.00,
    "Zsaldo": 1000.00,
    "ZdiasVenc": 0,
    "ZmaxDv": 0,
    "ZdiasInac": 0,
    "ZmaxDi": 0,
    "Zinterv": "",
    "ZultPagoIm": "2025-01-01",
    "Zremanente": 0.00,
    "Zmoratorio": 0.00,
    "ZusrAutCi": "",
    "ZfecAutCi": null,
    "ZejercicioQf": 0,
    "ZmontoQf": 0.00,
    "ZsdoInicial":"",
    "Zmoneda": "MXN"
}
```

---

### Método PATCH (Actualización)
**URL:** `PATCH .../zsplits(Fkart='ZMER',Vbeln='9000000463',Zsplit=20)`

**Body:**
```json
{
    "Vkorg":"5510"
}
```

---

### Método DELETE
**URL:** `DELETE .../zsplits(Fkart='ZPRE',Vbeln='9000000493',Zsplit=1)?sap-client=110`

---

### Método BATCH (Múltiples Operaciones)
*Ideal para enviar múltiples parcialidades de mercadería en un solo request.*

**URL:** `POST .../$batch?sap-client=110`

**Body (Multipart):**
```text
--batch_dca6-74d2-d53f
Content-Type: multipart/mixed; boundary=changeset_21cc-1e7e-f982

--changeset_21cc-1e7e-f982
Content-Type: application/http
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1
Content-Type: application/json
Accept: application/json

{
   "Fkart": "ZMER",
   "Vbeln": "9000000136",
   "Zsplit": 25,
   ...
}

--changeset_21cc-1e7e-f982
Content-Type: application/http
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1
Content-Type: application/json
Accept: application/json

{
    "Fkart": "ZMER",
    "Vbeln": "9000000136",
    "Zsplit": 26,
    ...
}
--changeset_21cc-1e7e-f982--
--batch_dca6-74d2-d53f--
```
