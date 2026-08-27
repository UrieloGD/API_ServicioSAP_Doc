# Mapeo del Método: `POST /order/GetPickUpCode` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `GetPickUpCode(StoreReadyPickupRequest request)` — Líneas **346–368**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher con doble guarda (`null` y cadena vacía) y traducción a 404.
**Región:** sin `#region`. Es el primero del bloque *storepickup*, seguido de `createStorepickupCode` (371–391) y `generateNewStorepickupCode` (393–414).

---

## Flujo de Ejecución

1. Recibe `POST` con body `StoreReadyPickupRequest`. Controlador decorado con `[Authorize]` y `[RoutePrefix("order")]`.
2. **Todo el cuerpo está dentro de un `try`** (línea 350) — incluida la guarda, a diferencia de [[02_LAN_Controller|getPosCancellations]]:
   ```csharp
   if (request.IdEcommerce == null)
       return NotFound();
   var pickUpCode = new CodigoRecogerSucursal().GetPickUpCode(request.IdEcommerce);
   if (pickUpCode == "")
       return NotFound();
   return Json(new StoreReadyPickupResponse { PickupCode = pickUpCode });
   ```
3. **Dos rutas distintas al mismo 404 (líneas 352–353 y 356–357):**

   | Condición | Significado real | Código devuelto |
   |---|---|---|
   | `request.IdEcommerce == null` | petición mal formada | 404 (debería ser 400) |
   | `pickUpCode == ""` | el pedido no tiene fila en `TrWDM0285_CteRecoge`, **o** la tiene con `ClaveVenta` vacía | 404 (correcto) |

   Un `IdEcommerce = ""` **no** se rechaza en la guarda: llega hasta la query y produce el segundo 404 (sin filas). Un `request == null` produce `NullReferenceException` → `catch` → **HTTP 400**.
4. Instancia el método de negocio **en línea**: `new CodigoRecogerSucursal().GetPickUpCode(...)` (línea 354) — no guarda la referencia, a diferencia de `createStorepickupCode` (línea 379) y `generateNewStorepickupCode` (línea 402), que sí declaran la variable `sp`. Detalle de estilo inconsistente dentro del mismo bloque.
5. **Respuesta tipada:** único de los tres endpoints de *storepickup* que devuelve un DTO (`StoreReadyPickupResponse`, `Models/OrderRequest.cs:114–117`) en vez de un `string` suelto. Los otros dos devuelven `Ok("ok")` y `Ok(response)`.
6. `catch (Exception e) => return BadRequest(e.Message)` (líneas 364–367).

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **404 para dos condiciones incompatibles.** "No me mandaste el parámetro" y "el pedido no tiene clave" comparten código de estado. El consumidor no puede distinguir un bug del cliente de un pedido legítimamente sin clave — y el flujo de correo de Magento necesita justo esa distinción para decidir si aborta el envío o lo manda sin clave.
2. **"Sin código" y "código vacío" son indistinguibles.** El método de negocio devuelve `""` tanto cuando no hay fila como cuando la fila existe con `ClaveVenta = ''`. **El segundo caso ocurre de verdad en producción:** `OrderMethods.setNameToReference` (`OrderMethods.cs:1253–1296`) inserta filas en `TrWDM0285_CteRecoge` con `@ClaveVenta = ""` durante `SetPedido` cuando `metodoEnvio == "instore_pickup"` (`OrderMethods.cs:653–656`). Ver [[03_BusinessMethod]] obs. 2 y la referencia cruzada con [[01_DMZ_Controller|createStorepickupCode]].
3. **`BadRequest(e.Message)` filtra detalle interno.** Un `SqlException` expone servidor y tabla. Debe reemplazarse por mensaje genérico + correlación por log.
4. **Sin `Logger` en ninguna rama.** Ni `INFO` del `IdEcommerce`, ni `ERROR` en el `catch`. Es una regresión respecto a sus dos hermanos, que **sí** loguean con `Logger.OrderStatus("INFO ", ...)` (líneas 375 y 397). Regla #8.
5. **Sin `[FromBody]` explícito** — irrelevante aquí por ser un tipo complejo, pero inconsistente con `ValidateCredit` (línea 458) y `UpdateCreditOrderId` (línea 508), que sí lo declaran.
6. **Método síncrono:** migrar a `async/await` (Regla #12).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #OrdersController #GetPickUpCode #storepickup
