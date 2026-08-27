# Mapeo del Método: `POST /order/getPosCancellations` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `GetPosCancellations(PosCancellationsRequest request)` — Líneas **88–105**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada puro con normalización de `null`.
**Región:** sin `#region` — bloque suelto entre `GetIntelisisStatuses` (71–86) y `Set` (107–228).

---

## Flujo de Ejecución

1. Recibe `POST` con body `PosCancellationsRequest` (`Since`, `Limit`). Controlador decorado con `[Authorize]` y `[RoutePrefix("order")]`.
2. **Normaliza `null` en vez de rechazar** — dentro del `try`:
   ```csharp
   if (request == null)
       request = new PosCancellationsRequest();
   ```
   > A diferencia de [[01_DMZ_Controller|obtenerVentanaConfirmacion]] (que lanza `BadRequest`), aquí un body vacío **no es error**: se construye un request por defecto con `Since = null` y `Limit = 0`, y la capa LAN aplica sus propios defaults (`Since = hoy-7d`, `Limit = 200`). Es la única guarda del endpoint.
3. Instancia `Curl` (`WebApiMagento.Helper.Curl`) y reenvía a LAN:
   ```csharp
   Curl curl = new Curl();
   string response = curl.Post("order/getPosCancellations", JsonConvert.SerializeObject(request));
   return Json(response);
   ```
   La URL base y credenciales salen de `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` — ver `APIMagentoDMZ/WebApiMagento/Helper/Curl.cs` líneas **22–32** (Regla #7: sin hardcodeo).
4. `catch (Exception e) => return BadRequest(e.Message)` — **cualquier** fallo (timeout, DNS, 500 de LAN) se reporta como **HTTP 400** con el texto de la excepción como cuerpo.

## Interacciones con Base de Datos

**Ninguna.** La DMZ no abre `SqlConnection`; toda la persistencia está en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **`return Json(response)` sobre un `string` — doble codificación JSON (hallazgo principal de esta capa).** `curl.Post` devuelve el JSON de LAN **como texto**; `Json(string)` lo serializa **otra vez**, por lo que el consumidor recibe una cadena escapada, no un objeto:
   ```
   "{\"Success\":true,\"Message\":\"\",\"Data\":[...]}"
   ```
   El módulo de Magento tiene que compensarlo a mano — ver `MAGENTO_WEB_ADOBE/app/code/Mavi/PosCancellationSync/Helper/Data.php:118`:
   ```php
   $bodyDecoded = json_decode(trim(stripslashes($response['body'] ?? ''), '"'), true);
   ```
   `stripslashes` + `trim('"')` existen **solo** para deshacer este doble encode. Contrasta con `ManagePaynetOrders` (líneas 22–35 del mismo archivo), que sí hace `JsonConvert.DeserializeObject<PaynetOrdersResponse>(response)` antes de devolver. La DMZ **no tiene clase `PosCancellationsResponse`** (existe en LAN, `Models/OrderRequest.cs:141`, pero no en `APIMagentoDMZ/WebApiMagento/Models/OrderRequest.cs`, que solo declara `PosCancellationsRequest` en la línea 82).
2. **Todo error se convierte en HTTP 400.** Un `WebException` por LAN caída, un timeout o un 500 son indistinguibles de "petición mal formada". Peor: el helper `Curl.Post` de la DMZ **captura la excepción y retorna `e.Message` como si fuera el body**, así que muchos fallos ni siquiera llegan al `catch` — se propagan como un 200 cuyo cuerpo es el texto de la excepción.
3. **Sin `Logger`.** No hay registro de `Since` / `Limit` ni del volumen devuelto. Viola la Regla #8; la única traza del ciclo POS→Magento está del lado LAN (`Logger.intelisis`, `intelisis.log`) y solo para errores.
4. **Método síncrono:** debe migrar a `async/await` (Regla #12).
5. **Puente a SAP (Regla #16):** al migrar debe usarse `curl.PostSAP(...)` (`APIMagentoDMZ/WebApiMagento/Helper/Curl.cs:115`) y el destino en ServicioSAP declararse `[HttpPost]`. Este endpoint **ya es `POST`**, así que la conversión es directa. ⚠️ El master `MIGRATION_STATUS_MASTER_v2.csv` (línea 81) indica que el destino previsto sería `order/cancelInvoice` (SD48), **una ruta y una semántica distintas** — ver [[03_BusinessMethod]] § Destino SAP.
6. **`Limit = 0` por defecto en el modelo.** `PosCancellationsRequest.Limit` es `int` no anulable; si el cliente omite el campo llega `0`, y es LAN quien lo reescribe a `200`. La DMZ no valida rangos: un `Limit = 999999` pasa intacto (LAN lo topa a 1000).

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #OrdersController #getPosCancellations
