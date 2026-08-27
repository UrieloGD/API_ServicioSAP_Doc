# SD48 - Anulación Factura de Clientes

**Proyecto:** MAVI  
**ID Requerimiento:** SD48  
**Descripción:** API para Anular una Factura de Venta al Cliente.

---

## 1. Contexto Funcional y Supuestos
El negocio requiere que el sistema legado (POS / C#) pueda consumir un servicio expuesto en S/4HANA para **anular la contabilización de la salida de mercancías de una entrega de salida** (equivalente funcional a la transacción `VF11` en SAP).

**Supuestos:**
- El sistema legado (C#) desarrolla la lógica de autenticación (Token/CSRF) y consume directamente la API.
- La ejecución correcta asume que los datos maestros y transaccionales del cliente/factura están actualizados en S/4HANA.

---

## 2. Información Técnica del Servicio (S/4HANA OData)

- **Nombre del Servicio S4:** `API_BILLING_DOCUMENT_SRV`
- **URL Base:** `/sap/opu/odata/SAP/API_BILLING_DOCUMENT_SRV/`
- **Tipo de Servicio:** Sincrónico / RESTful OData

### Métodos y Entidades Expuestas
| Entidad / Acción | Método | Descripción |
| :--- | :--- | :--- |
| `/A_BillingDocument('XXXXX')` | `GET` | Consulta de información general de la factura de venta. |
| `/Cancel` | `POST` | *Function Import* que ejecuta la anulación de la factura indicada en la URL. |

---

## 3. Parámetros de Ejecución y Estructura (SD48)

A diferencia de los métodos de creación estándar, la acción de cancelar en este servicio OData se invoca mandando el parámetro directamente en la Query String (`?BillingDocument='...'`).

### Request OData (POST)
Se requiere invocar la ruta `/Cancel` concatenando el parámetro de la factura. Opcionalmente (según implementación), puede viajar en el *Body* si se consume el endpoint principal.

| Nodo / Parámetro | Campo en C# / POS | Descripción | Longitud |
| :--- | :--- | :--- | :--- |
| `BillingDocument` | `BILLINGDOCUMENT` | Número de Factura de Venta a cancelar. | CHAR(10) |

### Response OData
El servicio retorna el número de documento afectado junto con la estructura de mensajería estándar de SAP que dictamina si la anulación fue exitosa o falló.

| Nodo | Campo | Descripción | Valor Esperado / Tipo |
| :--- | :--- | :--- | :--- |
| **`BILLINGDOCUMENT`** | `BILLINGDOCUMENT` | Número de factura procesada. | CHAR(10) |
| **`RETURN`** | `TYPE` | Tipo de mensaje de retorno | `S` (Éxito), `E` (Error), `W` (Warning), `I` (Info) |
| | `ID` | Clave técnica del mensaje SAP | CHAR(20) |
| | `MESSAGE` | Texto descriptivo del resultado (ej. "Documento anulado") | CHAR(220) |

---

## 4. Endpoint de Consumo y Ejemplos C#

### Acción: Consulta de Factura (GET)
**Endpoint:**
```http
GET /sap/opu/odata/SAP/API_BILLING_DOCUMENT_SRV/A_BillingDocument('9000001404')
```
*Utilizado para validar que la factura existe antes de anularla.*

### Acción: Anulación de Factura (POST)
**Endpoint:**
```http
POST /sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/Cancel?BillingDocument='9000001404'&sap-client=110
```
*Al ser un POST transaccional en OData, este método requiere que el HttpClient en C# envíe el header `X-CSRF-TOKEN` válido previamente obtenido mediante un `GET` con el header `x-csrf-token: fetch`.*

> [!WARNING]
> **Autenticación Especial (CSRF):** A diferencia de las APIs de solo lectura, la API `SD48` de anulación ejecuta inserciones/actualizaciones (`POST`). En C#, el flujo obligatorio es:
> 1. Solicitud Token OAuth 2.0 (Bearer).
> 2. Petición `GET` a SAP inyectando `X-CSRF-TOKEN: Fetch` para recuperar las Cookies (`JSESSIONID`) y el token CSRF.
> 3. Petición `POST` a `/Cancel` inyectando el Bearer, el Token CSRF y la Cookie JSESSIONID.

> [!NOTE]
> Se han omitido los detalles de CPI y las capturas gráficas de ABAP para mantener la documentación como referencia arquitectónica y pura para el desarrollo en C# .NET.

---
*Etiquetas: #SD48 #Cancelaciones #Facturacion #OData #S4HANA #POST #CSRF*
