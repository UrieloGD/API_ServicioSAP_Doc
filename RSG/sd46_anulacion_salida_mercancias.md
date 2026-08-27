# SD46 - Anulación Salida de Mercancías ligada a Entrega

**Proyecto:** MAVI  
**ID Requerimiento:** SD46  
**Descripción:** API para Anular la Contabilización de la Salida de Mercancías de una Entrega de Salida.

---

## 1. Contexto Funcional y Supuestos
El negocio requiere que el sistema legado (POS / C#) pueda consumir un servicio expuesto en S/4HANA para **anular la contabilización de la salida de mercancías de una entrega de salida** (equivalente funcional a la transacción `VL09` en SAP).

Esta API suele ser el paso anterior (o complementario) a la anulación de la factura (SD48) cuando se gestionan devoluciones o cancelaciones completas.

**Supuestos:**
- El sistema legado (C#) desarrolla la lógica de autenticación (Token/CSRF) y consume directamente la API.
- La ejecución asume que los datos de la entrega están vigentes en S/4HANA.

---

## 2. Información Técnica del Servicio (S/4HANA OData)

- **Nombre del Servicio S4:** `API_OUTBOUND_DELIVERY_SRV;v=2`
- **URL Base:** `/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=2/`
- **Tipo de Servicio:** Sincrónico / RESTful OData

### Métodos y Entidades Expuestas
| Entidad / Acción | Método | Descripción |
| :--- | :--- | :--- |
| `/ReverseGoodsIssue` | `POST` | *Function Import* que ejecuta la anulación de la salida de mercancías. |

---

## 3. Parámetros de Ejecución y Estructura (SD46)

Al igual que en SD48, la acción transaccional de este servicio OData se invoca mandando los parámetros directamente en la Query String de la URL.

### Request OData (POST)
Se requiere invocar la ruta `/ReverseGoodsIssue` concatenando el número de la entrega y la fecha del movimiento en la URL.

| Nodo / Parámetro | Campo en C# / POS | Descripción | Longitud / Tipo OData |
| :--- | :--- | :--- | :--- |
| `DeliveryDocument` | `DELIVERYDOCUMENT` | Número de entrega de salida. | CHAR(10) |
| `ActualGoodsMovementDate` | `ACTUALGOODSMOVEMENTDATE` | Fecha de movimiento (Formato datetime). | DATS8 (`datetime'YYYY-MM-DDThh:mm:ss'`) |

### Response OData
El servicio retorna la entrega afectada junto con la estructura de mensajería estándar de SAP que dictamina si la anulación fue exitosa o falló.

| Nodo | Campo | Descripción | Valor Esperado / Tipo |
| :--- | :--- | :--- | :--- |
| **`DELIVERYDOCUMENT`** | `DELIVERYDOCUMENT` | Número de entrega de salida procesada. | CHAR(10) |
| **`RETURN`** | `TYPE` | Tipo de mensaje de retorno | `S` (Éxito), `E` (Error), `W` (Warning), `I` (Info) |
| | `ID` | Clave técnica del mensaje SAP | CHAR(20) |
| | `MESSAGE` | Texto descriptivo del resultado | CHAR(220) |

---

## 4. Endpoint de Consumo y Ejemplos C#

### Acción: Anulación de Salida de Mercancías (POST)
**Endpoint:**
```http
POST /sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=2/ReverseGoodsIssue?DeliveryDocument='80000545'&ActualGoodsMovementDate=datetime'2025-03-05T00:00:00'&sap-client=110&sap-langu=ES
```
*Observa el casteo estricto de la fecha utilizando `datetime'...'` como dictan las especificaciones OData.*

> [!WARNING]
> **Autenticación Especial (CSRF):** Al igual que SD48, esta API ejecuta una actualización en la base de datos (`POST`). En C#, el flujo obligatorio es:
> 1. Petición `GET` a la raíz del servicio inyectando `X-CSRF-TOKEN: Fetch` y el Bearer Token para recuperar las Cookies (`JSESSIONID`) y el token CSRF.
> 2. Petición `POST` a `/ReverseGoodsIssue` inyectando el Bearer, el Token CSRF y la Cookie JSESSIONID en los headers.

> [!NOTE]
> Se han omitido los detalles de CPI y las capturas gráficas de ABAP para mantener la documentación como referencia arquitectónica y pura para el desarrollo asíncrono en C# .NET.

---
*Etiquetas: #SD46 #Devoluciones #Cancelaciones #OData #S4HANA #POST #CSRF*
