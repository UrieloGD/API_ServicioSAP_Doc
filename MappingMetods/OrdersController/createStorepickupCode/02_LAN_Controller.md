# Mapeo del Método: `POST /order/createStorepickupCode/{idEcommerce}/{idOrder}` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `createStorepickupCode(string idEcommerce, string idOrder)` — Líneas **371–391**
**Capa:** LAN (Nexo) — **sin capa DMZ** ([[01_DMZ_Controller]])
**Rol en el flujo:** Dispatcher de un método `void` con efectos secundarios. Responde `"ok"` de forma incondicional.
**Región:** sin `#region`. Segundo del bloque *storepickup*, entre `GetPickUpCode` (346–368) y `generateNewStorepickupCode` (393–414).

---

## Flujo de Ejecución

1. Recibe `POST` con **dos parámetros de ruta y sin body**: `{idEcommerce}` (id de pedido eCommerce, corresponde a `Venta.IDEcommerce`) y `{idOrder}` (id de orden de Magento, corresponde a `eCommerceDetPedidos.idOrden`). Controlador con `[Authorize]` y `[RoutePrefix("order")]`.
2. **Loguea el request (línea 375)** — a diferencia de su hermano `GetPickUpCode`, que no loguea nada:
   ```csharp
   Logger.OrderStatus("INFO ", "Crear codigo recoger en sucursal " + idEcommerce + " " + idOrder);
   ```
   Destino: `C:\inetpub\wwwroot\log\orderStatus.log` (`Helper/Logger.cs:39–41`).
3. **Guarda inútil (líneas 376–377):**
   ```csharp
   if (idEcommerce == null)
       return NotFound();
   ```
   `idEcommerce` es un **segmento obligatorio de la ruta**: si falta, ASP.NET Web API no enruta la petición y devuelve 404 antes de llegar al método. La condición **nunca puede ser verdadera**. Además:
   - No valida `idOrder` (que sí puede causar daño — ver [[03_BusinessMethod]] obs. 3).
   - No valida cadena vacía ni formato.
4. Instancia `CodigoRecogerSucursal sp = new CodigoRecogerSucursal();` (línea 379) y despacha dentro de un `try`:
   ```csharp
   sp.crearPrimerCodigoRecogerSuc(idEcommerce, idOrder);
   ```
   El método de negocio es **`void`** (`CodigoRecogerSucursal.cs:88`): no devuelve el código generado, ni un indicador de éxito, ni el número de filas afectadas.
5. `catch (Exception e) => return BadRequest(e.Message)` (líneas 385–388).
6. **Retorno fijo:** `return Ok("ok");` (línea 390). Texto plano, no JSON.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia y las llamadas salientes ocurren en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **`Ok("ok")` incondicional es el hallazgo principal de esta capa.** El método de negocio es `void` y **captura internamente casi todos sus errores** (`ValidaDuplicidadIdEcommerce` línea 247, `GetCodigoDuplicado` línea 381 y `GetDatosCte` línea 465 hacen `Console.WriteLine` y siguen; `UpdatePickUpCode` línea 296 devuelve `false` que **nadie lee**; `EnviarCorreo` línea 717 loguea y sigue). Consecuencia: el endpoint responde **`200 "ok"` incluso cuando no generó ningún código, no actualizó nada, no cambió el estado en Magento y no envió el correo.** El consumidor no tiene forma de saberlo.
2. **No devuelve el código generado.** Quien invoca este endpoint tiene que llamar después a [[02_LAN_Controller|GetPickUpCode]] para obtener el PIN — una segunda petición y una segunda oportunidad de leer un valor obsoleto. `NuevoCodigoRecogerSucursal` (hermano) **sí** devuelve el código; la asimetría no tiene justificación.
3. **Guarda de `null` sobre un parámetro de ruta obligatorio — código muerto** (paso 3). El parámetro que sí necesita validación (`idOrder`) no se valida.
4. **`BadRequest(e.Message)` filtra detalle interno.** Solo se alcanza si la excepción escapa a los `catch` internos del método de negocio (p. ej. `datosCte[3]` con `Regex.Replace` sobre un `null`, o el `IndexOutOfRange` de `order.orders[0]`). Cuando ocurre, expone el mensaje crudo.
5. **`POST` sin body con parámetros en la ruta.** Un `POST` que muta estado, dispara un correo al cliente y no recibe cuerpo es un diseño REST inconsistente con el resto del controlador. Al migrar debe pasar a un contrato con DTO.
6. **Método síncrono con efectos de red en cadena.** El hilo de IIS queda bloqueado durante dos llamadas HTTP salientes (`order/setOrderStatus`, `order/sendStorePickupEmail`) más el SMTP — ver [[03_BusinessMethod]]. `Curl` usa `Timeout = 9999999` (`APIMagento/WebApiMagento/Helper/Curl.cs:35, 99, 121`), por lo que **no hay techo real de duración**. Migrar a `async/await` (Regla #12) es aquí una necesidad operativa, no cosmética.
7. **Log de `INFO` sin resultado.** Se registra la entrada pero nunca el desenlace: no hay `Logger` del código generado, ni de si fue `INSERT` o `UPDATE`, ni de si el correo salió. Regla #8 a medias.

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #OrdersController #createStorepickupCode #storepickup
