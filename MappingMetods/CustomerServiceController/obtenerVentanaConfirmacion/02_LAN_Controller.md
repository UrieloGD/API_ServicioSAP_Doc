# Mapeo del Método: `POST /customerService/obtenerVentanaConfirmacion` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `obtenerVentanaConfirmacion(VentanaConfirmacionRequest request)` — Líneas **23–30**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher puro. **Sin trazabilidad y sin red de seguridad de excepciones.**
**Región:** `#region Garantías`

---

## Flujo de Ejecución

1. Recibe `POST` con el body `VentanaConfirmacionRequest`. Controlador decorado con `[Authorize]` y `[RoutePrefix("customerService")]`.
2. Instancia `CustomerServiceMethods csm = new CustomerServiceMethods();`
3. Retorna en una sola línea:
   ```csharp
   return Ok(JsonConvert.DeserializeObject(csm.obtenerVentanaConfirmacion(request)));
   ```
   El método de negocio devuelve un **`string`** (JSON serializado), que se re-deserializa aquí para que Web API lo vuelva a serializar en la respuesta.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

- **Sin `try/catch` — es el hallazgo principal de esta capa.** Contrasta con el patrón dominante del proyecto (ej. [[02_LAN_Controller|CheckAccountsPreUnification]], que sí envuelve todo en `try/catch` + `Logger`). Aquí:
  - El método de negocio **captura** su propia excepción y devuelve `e.Message` como texto plano.
  - Ese texto llega a `JsonConvert.DeserializeObject(...)`, que **no puede parsearlo** → `JsonReaderException` **no capturada** en esta capa → **HTTP 500**.
  - Resultado: una excepción de BD manejada abajo se convierte en una **segunda excepción no manejada** aquí. El error original se pierde del response y solo queda en `customerService.log`.
- **Sin `Logger.CustomerService("INFO", ...)` del request.** Viola la Regla #8 (Trazabilidad). No hay registro del `order_id` consultado; solo se loguean errores, y desde la capa de negocio. Comparar con `CreditController`, donde sí se registra el request completo antes de despachar.
- **Doble serialización innecesaria:** negocio serializa a `string` → controller deserializa a `object` → Web API vuelve a serializar. En la migración debe retornarse un DTO tipado directamente.
- **Método síncrono:** debe migrar a `async/await` (Regla #12).
- **Sin validación de `order_id`.** La guarda de `null` solo existe en DMZ ([[01_DMZ_Controller]]); si este endpoint se invoca directamente dentro de la LAN, un `request == null` produce `NullReferenceException` al llegar a `request.order_id` en el método de negocio.

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #CustomerServiceController #obtenerVentanaConfirmacion
