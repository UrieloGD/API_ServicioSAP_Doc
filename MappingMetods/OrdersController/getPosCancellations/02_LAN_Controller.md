# Mapeo del Método: `POST /order/getPosCancellations` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `GetPosCancellations(PosCancellationsRequest request)` — Líneas **112–132**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher con traducción de resultado de negocio a código HTTP. **Es de los pocos endpoints del proyecto que sí distingue error de resultado vacío.**
**Región:** sin `#region`. Precedido por un comentario de intención (líneas **109–111**) — inusual en este archivo:
```csharp
// Devuelve los pedidos cancelados en Intelisis (POS u otro origen) a partir
// de una fecha. El cron de Magento Mavi_PosCancellationSync consume este
// endpoint para reconciliar las cancelaciones del POS hacia Magento.
```

---

## Flujo de Ejecución

1. Recibe `POST` con body `PosCancellationsRequest`. Controlador decorado con `[Authorize]` y `[RoutePrefix("order")]`.
2. **Normaliza `null`** igual que la DMZ (línea 116–117):
   ```csharp
   if (request == null)
       request = new PosCancellationsRequest();
   ```
   La guarda está **fuera** del `try`. No hay validación de `Since` ni de `Limit` aquí — ambos se saneen dentro del método de negocio.
3. Instancia `OrderMethods om = new OrderMethods();` y despacha:
   ```csharp
   var result = om.GetPosCancellations(request.Since, request.Limit);
   if (!result.Success)
       return Content(HttpStatusCode.InternalServerError, result);
   return Json(result);
   ```
4. **Traducción de estado:** el método de negocio nunca lanza; devuelve `PosCancellationsResponse.Success = false` + `Message = ex.Message` cuando falla. El controller convierte ese flag en **HTTP 500** conservando el objeto completo en el cuerpo.
5. `catch (Exception e)` (líneas 127–131): loguea `Logger.intelisis("ERROR GetPosCancellations Controller: ", e.Message)` → `C:\inetpub\wwwroot\log\intelisis.log` (`Helper/Logger.cs:9–11`) y responde `InternalServerError(e)`.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **Patrón correcto y aislado en el archivo.** Este endpoint **sí** distingue los tres desenlaces (200 con datos, 200 con `Data: []`, 500 con `Message`). Contrasta con la mayoría de `OrdersController`: `Set` (líneas 137–161) devuelve `Ok(e.ToString())` — **HTTP 200 con un stack trace como payload**; `Cancel` (185–250) y `GetGuideWithName` (163–183) tragan la excepción en `catch (Exception)` sin loguear. Este método debe usarse como plantilla al migrar el resto.
2. **`return Json(result)` sí serializa un objeto tipado** (no un `string`), por lo que la doble codificación que sufre la respuesta **la introduce la DMZ, no LAN** — ver [[01_DMZ_Controller]] obs. 1.
3. **Fuga de detalle de infraestructura en el 500.** `Content(HttpStatusCode.InternalServerError, result)` devuelve `result.Message`, que es literalmente `ex.Message` del `SqlException` (ver [[03_BusinessMethod]] paso 5). Puede exponer nombre de servidor, base y tabla. Debe sustituirse por un mensaje genérico + correlación por log.
4. **Sin `Logger` de `INFO` del request.** Solo se loguea el error. No queda traza de qué ventana (`Since`) pidió el cron ni cuántas filas se devolvieron — imposible auditar por qué una cancelación no llegó a Magento. Regla #8.
5. **Sin validación de `Limit` ni de `Since` en la frontera.** Se delega al método de negocio. Un `Since` en el futuro devuelve `[]` silenciosamente; un `Since = null` reescribe la ventana a 7 días sin avisar al consumidor.
6. **Método síncrono:** migrar a `async/await` (Regla #12).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #OrdersController #getPosCancellations
