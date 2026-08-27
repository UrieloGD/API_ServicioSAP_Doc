# Mapeo del Método: `GET /order/getOrderInfoAndSet/{incrementId}` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `GetOrderInfoAndSet(string incrementId)` — Líneas **436–443**
**Capa:** LAN (Nexo) — **sin capa DMZ** ([[01_DMZ_Controller]])
**Rol en el flujo:** Dispatcher desnudo. **Es el controller más corto y menos protegido de todo `OrdersController`.**
**Región:** sin `#region`. Entre `getOrderId` (416–434) y `CheckOpenpay` (445–453).

---

## Flujo de Ejecución

El método completo son **ocho líneas**:

```csharp
[HttpGet]
[Route("getOrderInfoAndSet/{incrementId}")]
public IHttpActionResult GetOrderInfoAndSet(string incrementId)
{
    Magento mag = new Magento();

    return Ok(mag.getOrderInfoAndSet(incrementId));
}
```

1. Recibe **`GET`** con el parámetro de ruta `{incrementId}`. Controlador con `[Authorize]` y `[RoutePrefix("order")]`.
2. **Cero validación:** no comprueba `null`, ni vacío, ni formato.
3. **Cero manejo de errores:** sin `try/catch`.
4. **Cero trazabilidad:** sin `Logger` de entrada ni de salida.
5. Instancia `Magento mag = new Magento();` — ⚠️ **el constructor de `Magento` (`Conn/Magento.cs:17–20`) instancia un `Curl`**, y el constructor de `Curl` (`Helper/Curl.cs:25–39`) **ejecuta de inmediato una petición HTTP de autenticación** contra la DMZ:
   ```csharp
   Token = webClient.UploadString(Ip + "login/authenticate", "POST", user);
   ```
   Es decir: **la línea 440 ya hace un salto de red**, antes de saber si se va a necesitar. Si la DMZ está caída, la excepción sale del constructor, no la captura nadie, y el endpoint devuelve **HTTP 500**.
6. `return Ok(mag.getOrderInfoAndSet(incrementId));` — devuelve **como cuerpo de la respuesta** el `string` que produzca el método de negocio, sea lo que sea.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia (y la lectura de un archivo del disco) ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **🚩 `[HttpGet]` sobre una operación que crea un pedido en el ERP — hallazgo principal.** El método de negocio termina llamando a `OrderMethods.SetPedido`, que ejecuta `SP_eCommerceNuevoPed` / `SPVTASPedidosMagento` y **da de alta el pedido en `Venta`**. Un `GET` es, por contrato HTTP, seguro e idempotente: un prefetch de navegador, un crawler, una recarga o un reintento automático de proxy **pueden crear un pedido real en Intelisis**. Es el mismo defecto de [[02_LAN_Controller|generateNewStorepickupCode]], pero con consecuencias mucho mayores.

2. **El `string` de retorno tiene al menos siete significados distintos, todos con HTTP 200.** El método de negocio y `SetPedido` devuelven texto libre:

   | Cuerpo devuelto | Significado real | HTTP |
   |---|---|---|
   | `"C00012345"` | pedido creado, cuenta del cliente | 200 |
   | `"PedidoExistente"` | ya existe y no se forzó | 200 |
   | `"No cumple las condiciones"` | existe y no está cancelado | 200 |
   | `"no existe"` (interno) | no está en el log; **dispara la rama 2** | — |
   | `"Incorrecto"` / `"PrecioIncorrecto"` | el SP rechazó el pedido | 200 |
   | mensaje de Magento (`jsonOrder.message`) | Magento no devolvió el pedido | 200 |
   | `"Ocurrió un error: <ex.Message>"` | excepción capturada abajo | 200 |

   **Ningún código de estado distingue el éxito del fracaso.** El consumidor tendría que comparar contra literales en español. Es el antipatrón de [[02_LAN_Controller|obtenerVentanaConfirmacion]] llevado al extremo: aquí ni siquiera hay una excepción posterior que delate el problema, porque el método de negocio **captura todo** (`Conn/Magento.cs:407–410`).

3. **Fuga de detalle interno en el cuerpo.** El `catch` del método de negocio devuelve `"Ocurrió un error: " + ex.Message` (`Conn/Magento.cs:409`), y este controller lo emite con **HTTP 200**. Un `SqlException` expone servidor, base y tabla; un `IOException` expone la ruta `C:\inetpub\wwwroot\log\setOrder.log`.

4. **Sin `Logger` en ninguna rama.** Junto con [[02_LAN_Controller|getOrderId]], es uno de los dos endpoints del controlador **sin una sola línea de traza**. Consecuencias: (a) viola la Regla #8; (b) como el consumidor es desconocido ([[01_DMZ_Controller]]), no hay forma de identificarlo desde la aplicación; (c) **no queda registro de que alguien reejecutó la creación de un pedido**, que es precisamente la operación que más auditoría necesita.

5. **Salto de red oculto en el constructor** (paso 5). `new Magento()` autentica contra la DMZ antes de cualquier lógica. Si el método de negocio resuelve por la rama 1 (`ReSetPedido` encuentra la línea en el log), **esa autenticación fue trabajo desperdiciado**. Y si la DMZ está caída, el endpoint falla aunque no la necesitara.

6. **Sin validación de `incrementId`.** Se propaga a: (a) una búsqueda de subcadena sobre el contenido completo del archivo de log; (b) una URL concatenada sin escapar (`Conn/Magento.cs:371`); (c) consultas SQL parametrizadas (`obtenerIdVenta`, `esCancelado`). Ver [[03_BusinessMethod]].

7. **Método síncrono** que encadena: lectura de un archivo completo del disco → petición HTTP a la DMZ → petición HTTP a Magento → N ejecuciones de SP en Intelisis. Con `Curl.Timeout = 9999999` (`Helper/Curl.cs:35, 121`) no hay techo real de duración. Migrar a `async/await` (Regla #12).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #OrdersController #getOrderInfoAndSet
