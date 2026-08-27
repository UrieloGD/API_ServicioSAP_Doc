# Mapeo del Método: `POST /order/GetPickUpCode` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `GetPickUpCode(StoreReadyPickupRequest request)` — Líneas **252–269**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada con guarda de campo (no de instancia).
**Región:** sin `#region` — entre `getGuide(OrderIdsRequest)` / `sendStorePickupEmail` (241–250) y `Cancel` (271–298).

---

## Flujo de Ejecución

1. Recibe `POST` con body `StoreReadyPickupRequest` (`IdEcommerce`). Controlador decorado con `[Authorize]` y `[RoutePrefix("order")]`.
2. **Valida el campo, no el body** (líneas 258–259):
   ```csharp
   if (request.IdEcommerce == null)
       return NotFound();
   ```
   > Guarda invertida respecto al patrón del proyecto: aquí se valida `request.IdEcommerce` pero **no `request`**. Si el body llega vacío o mal formado, `request` es `null` y la línea 258 lanza `NullReferenceException` — capturada por el `catch` de la línea 265 y devuelta como **HTTP 400** con el texto `"Object reference not set to an instance of an object."`. Compárese con `getGuide` (líneas 232–239) o `Cancel` (273–276), que sí validan `data == null`.
   > Nótese además que un `IdEcommerce = ""` **pasa** el filtro (solo se compara contra `null`); el vacío se filtra recién en LAN ([[02_LAN_Controller]]).
3. **`NotFound()` como respuesta a una petición inválida.** Un `IdEcommerce` ausente es un error del cliente (400), no un recurso inexistente (404). Coincide por casualidad con el 404 legítimo que LAN devuelve cuando no hay código — ver observación 2.
4. Reenvía a LAN (líneas 261–263):
   ```csharp
   Curl curl = new Curl();
   string response = curl.Post("order/GetPickUpCode", JsonConvert.SerializeObject(request));
   return Json(response);
   ```
   URL base y credenciales desde `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` — `APIMagentoDMZ/WebApiMagento/Helper/Curl.cs` líneas **22–32** (Regla #7).
5. `catch (Exception e) => return BadRequest(e.Message)`.

## Interacciones con Base de Datos

**Ninguna.** Toda la persistencia está en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **`return Json(response)` sobre un `string` — doble codificación JSON.** Mismo defecto que [[01_DMZ_Controller|getPosCancellations]]: `curl.Post` devuelve texto y `Json(string)` lo re-serializa. El consumidor recibe `"{\"PickupCode\":\"A1B2C3D4\"}"`. El módulo de Magento lo repara explícitamente en `MAGENTO_WEB_ADOBE/app/code/Mavi/StorePickupReadyTemplate/Helper/Data.php:52`:
   ```php
   return json_decode(trim(stripslashes($response['body']), '"'));
   ```
   La DMZ **sí tiene** el modelo `StoreReadyPickupResponse` (`APIMagentoDMZ/WebApiMagento/Models/OrderRequest.cs:98–101`) pero **no lo usa**: bastaría `JsonConvert.DeserializeObject<StoreReadyPickupResponse>(response)` para devolver un objeto real. Es deuda de una línea.
2. **El 404 de LAN se convierte en un 400 con texto de excepción.** Cuando el pedido no tiene código, LAN responde **HTTP 404** ([[02_LAN_Controller]] paso 3). El helper `Curl.Post` de la DMZ captura el `WebException` y **retorna `e.Message` como si fuera el body** (`Curl.cs`, bloque `catch` del `Post`), por lo que `response` termina siendo `"The remote server returned an error: (404) Not Found."` y la DMZ responde **HTTP 200 con ese texto codificado como JSON**. El consumidor de Magento hace `if (!$response) return $proceed($vars);` (`TransportBuilderPlugin.php:54`) — la cadena de error **es truthy en PHP**, así que sigue de largo y revienta en `$response->PickupCode` (propiedad de un `string`) → `WebapiException` "No se pudo obtener el código para recoger en sucursal." (`TransportBuilderPlugin.php:63–65`). **Cadena de degradación de tres saltos por un 404 legítimo.**
3. **Sin `Logger`.** No hay traza del `IdEcommerce` consultado (Regla #8). Como este endpoint se dispara al enviar el correo "pedido listo para recoger", la ausencia de log deja sin evidencia los casos en que el cliente recibe el correo sin clave.
4. **Método síncrono:** migrar a `async/await` (Regla #12).
5. **Puente a SAP (Regla #16):** al migrar debe usarse `curl.PostSAP(...)` (`APIMagentoDMZ/WebApiMagento/Helper/Curl.cs:115`) y el destino en ServicioSAP declararse `[HttpPost]`. El endpoint ya es `POST` → conversión directa. **Pero el destino no existe:** `MIGRATION_STATUS_MASTER_v2.csv:85` marca `Unknown` / `Not Migrated` / *"Blocked, unassigned. Business has not defined the clave venta PIN process"* — ver [[03_BusinessMethod]] § Destino SAP.
6. **Asimetría de exposición dentro de la misma funcionalidad.** De los tres endpoints de *storepickup* en LAN, **solo este tiene proxy en DMZ**: `createStorepickupCode` y `generateNewStorepickupCode` no existen en ninguno de los 14 controladores de `APIMagentoDMZ/WebApiMagento/Controllers/` (verificado por búsqueda exhaustiva). Ver [[01_DMZ_Controller|createStorepickupCode]] y [[01_DMZ_Controller|generateNewStorepickupCode]]. Es decir: **la DMZ expone la lectura del código pero no su creación ni su regeneración.**

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #OrdersController #GetPickUpCode #storepickup
