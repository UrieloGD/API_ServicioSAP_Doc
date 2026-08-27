# Mapeo del Método: `GET /order/generateNewStorepickupCode/{idEcommerce}` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `generateNewStorepickupCode(string idEcommerce)` — Líneas **393–414**
**Capa:** LAN (Nexo) — **sin capa DMZ** ([[01_DMZ_Controller]])
**Rol en el flujo:** Dispatcher. Devuelve el código regenerado como texto plano.
**Región:** sin `#region`. Tercero del bloque *storepickup*, tras `createStorepickupCode` (371–391).

---

## Flujo de Ejecución

1. Recibe **`GET`** con un parámetro de ruta: `{idEcommerce}`. Controlador con `[Authorize]` y `[RoutePrefix("order")]`.
   > 🚩 **`[HttpGet]` (línea 393) sobre una operación que ejecuta un `UPDATE`.** Es el único de los tres endpoints de *storepickup* declarado como `GET`, y el único que muta estado con ese verbo. Ver observación 1.
2. **Loguea el request (línea 397):**
   ```csharp
   Logger.OrderStatus("INFO ", "Generar nuevo codigo recoger sucursal " + idEcommerce);
   ```
   Destino: `C:\inetpub\wwwroot\log\orderStatus.log` (`Helper/Logger.cs:39–41`).
3. **Guarda inútil (líneas 398–399):**
   ```csharp
   if (idEcommerce == null)
       return NotFound();
   ```
   `idEcommerce` es un segmento obligatorio de la ruta: si falta, Web API no enruta y devuelve 404 antes de entrar al método. **La condición nunca se cumple.** Mismo código muerto que en `createStorepickupCode` (línea 376).
4. Instancia `CodigoRecogerSucursal sp = new CodigoRecogerSucursal();` (línea 402) y despacha:
   ```csharp
   response = sp.NuevoCodigoRecogerSucursal(idEcommerce);
   ```
5. **`catch` que descarta la excepción capturada (líneas 408–411):**
   ```csharp
   catch (Exception e)
   {
       throw new HttpResponseException(HttpStatusCode.InternalServerError);
   }
   ```
   La variable `e` **se declara y nunca se usa** (produce warning CS0168 en compilación). El detalle del error se pierde por completo: sin `Logger`, sin cuerpo, sin correlación. **HTTP 500 opaco.**
6. `return Ok(response);` (línea 413) — texto plano, no JSON.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia y la notificación ocurren en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **`[HttpGet]` sobre una operación destructiva — hallazgo principal de esta capa.** El método ejecuta `UPDATE TrWDM0285_CteRecoge SET ClaveVenta = ...`, invalidando el PIN anterior. Un `GET` es, por contrato HTTP, seguro e idempotente: navegadores, proxies, crawlers y mecanismos de *prefetch* pueden invocarlo sin intención del usuario. **Cada invocación accidental deja al cliente con una clave distinta a la que recibió por correo.** Debe ser `POST` (o `PUT`) al migrar; es un cambio de contrato que hay que coordinar con el consumidor desconocido.
2. **El `catch` traga el diagnóstico.** `catch (Exception e)` sin usar `e`, sin `Logger`, y relanzando un 500 genérico. Combinado con que el método de negocio **también** captura sus propios errores y devuelve el literal `"failure to try update ClaveVenta"` (ver [[03_BusinessMethod]] paso 4), el resultado es que **el fallo más probable ni siquiera llega a este `catch`**: sale por la puerta del 200.
3. **`Ok(response)` con dos semánticas incompatibles.** El mismo **HTTP 200** transporta:
   - un código válido: `"A1B2C3D4"`
   - un mensaje de error: `"failure to try update ClaveVenta"`

   El consumidor tendría que comparar contra ese literal para distinguirlos. Es el mismo antipatrón que [[02_LAN_Controller|obtenerVentanaConfirmacion]], en versión más sutil: aquí ni siquiera hay una excepción que delate el problema.
4. **Guarda de `null` sobre parámetro de ruta obligatorio — código muerto** (paso 3).
5. **Devuelve el código y su hermano no.** `createStorepickupCode` es `void` y responde `"ok"`; este devuelve el PIN. Asimetría injustificada entre dos endpoints de la misma funcionalidad, con la misma clase de negocio.
6. **Sin log del resultado.** Se loguea la entrada pero no el código generado ni el desenlace. En un endpoint cuyo propósito es reemitir un secreto, la ausencia de bitácora impide auditar quién regeneró qué y cuándo. Regla #8.
7. **Método síncrono** que además dispara un `Task` en segundo plano cuyo resultado nadie espera (ver [[03_BusinessMethod]] paso 3). Migrar a `async/await` (Regla #12).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #OrdersController #generateNewStorepickupCode #storepickup
