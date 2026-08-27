# Mapeo del Método: `POST /customerService/ObtenerEstatusEmbarque` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ObtenerEstatusEmbarque(EstatusEmbarqueRequest request)` — Líneas **225–230**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher puro. **Sin trazabilidad, sin validación y sin red de seguridad de excepciones.**
**Región:** `#region Estatus Embarque` (líneas 223–232)

---

## Flujo de Ejecución

1. Recibe `POST` con el body `EstatusEmbarqueRequest`. Controlador decorado con `[Authorize]` y `[RoutePrefix("customerService")]` (líneas **8–9**).
2. Retorna en una sola línea, **sin instanciar la clase** — a diferencia de los endpoints de la `#region Garantías` (`CustomerServiceMethods csm = new ...`), aquí el método de negocio es `static`:
   ```csharp
   return Ok(JsonConvert.DeserializeObject(CustomerServiceMethods.ObtenerEstatusEmbarque(request)));
   ```
3. El método de negocio devuelve un **`string`** que contiene un literal JSON booleano (`"true"` o `"false"`), que se re-deserializa aquí para que Web API lo vuelva a serializar en la respuesta.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **Sin `try/catch` en el controller *y* sin `try/catch` en el método de negocio — combinación única en este controlador.**
   El patrón dominante del proyecto es: negocio captura la excepción, la loguea y devuelve `e.Message` como texto (ver [[obtenerVentanaConfirmacion]], `GetEmpleadoByNomina` en `CustomerServiceMethods.cs:1995`). Aquí **no ocurre ni una cosa ni la otra**: `CustomerServiceMethods.ObtenerEstatusEmbarque` (`CustomerServiceMethods.cs:1905–1947`) no tiene ningún `catch`, de modo que un `SqlException` **se propaga sin manejar** hasta el pipeline de Web API → **HTTP 500 desde la LAN**, sin entrada en `customerService.log`.
   > Paradójicamente esto es *menos malo* para el consumidor (un 500 es honesto) y *peor* para la operación (el error no queda registrado en ninguna parte).

2. **Sin `Logger.CustomerService("INFO", ...)` del request.** Viola la Regla #8 (Trazabilidad). No hay ningún log — ni de `INFO` ni de `ERROR` — para este endpoint. Dado que la respuesta booleana **habilita o bloquea la cancelación de un pedido en Magento** (ver §Consumidor real), la ausencia total de auditoría es un hallazgo de negocio, no solo técnico: **no es posible reconstruir por qué a un cliente se le negó la cancelación.**

3. **Sin validación de `request` ni de `IdEcommerce`.** La guarda de `null` solo existe en DMZ ([[01_DMZ_Controller]]). Si este endpoint se invoca directamente dentro de la LAN con body vacío, `request.IdEcommerce` produce `NullReferenceException` → HTTP 500. Si `IdEcommerce` llega como `null` desde la DMZ (que sí deja pasar `{ }`), `string.Format` inserta cadena vacía y la consulta se ejecuta como `WHERE V.IDEcommerce = ''`.

4. **Doble serialización innecesaria:** negocio serializa un `bool` a `string` → controller deserializa a `object` → Web API vuelve a serializar. Para un booleano primitivo el round-trip es puro desperdicio. En la migración debe retornarse un DTO tipado (idealmente con causa del resultado, no solo el booleano).

5. **Método síncrono:** debe migrar a `async/await` (Regla #12).

6. **Inconsistencia de nomenclatura de ruta.** Es el único endpoint de la región cuyo `[Route]` empieza en mayúscula (`ObtenerEstatusEmbarque`), frente a `obtenerTipoGarantia`, `obtenerVentanaConfirmacion`, `validarCoberturaPorCP`. Como IIS/Web API enruta sin distinguir mayúsculas no rompe hoy, pero debe unificarse el criterio al publicar el contrato nuevo.

## Consumidor real identificado (frontend)

Contrario al patrón habitual de este controlador, este endpoint **sí tiene consumidor rastreable** en `MAGENTO_WEB_ADOBE`:

| Archivo | Líneas | Rol |
|---|---|---|
| `app/code/Mavi/ShipmentStatus/etc/webapi.xml` | **4–15** | Expone dos rutas Magento (`/V1/mavi-shipmentstatus/guest/...` **anónima** y `/customer/...`) |
| `app/code/Mavi/ShipmentStatus/Api/ShipmentStatusManagementInterface.php` | **10** | Contrato: `ObtenerEstatusEmbarque(string $IdEcommerce): bool` |
| `app/code/Mavi/ShipmentStatus/Model/ShipmentStatusManagement.php` | **66–79** | Arma `{"IdEcommerce": ...}` y hace POST vía `Omnipro\IntelisisIntegration\Model\Adapter` |
| `app/code/Omnipro/OrderCancel/Plugin/OrderRepositoryPlugin.php` | **122–146** | **Decide si el pedido es cancelable** (`getStatusCancelable`), llamadas en **137** y **142** |

El booleano de este endpoint es, literalmente, el interruptor de "¿puede el cliente cancelar su pedido?". Ver detalle semántico en [[03_BusinessMethod]].

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #CustomerServiceController #ObtenerEstatusEmbarque #bloqueante
