# Mapeo del Método: `POST /order/validateCredit` — Capa DMZ (Proxy **desactivado**)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `ValidateCredit([FromBody] OrderRequest order)` — Líneas **365–402**
**Capa:** DMZ (Centinela)
**Estado:** 🚫 **CÓDIGO COMENTADO EN BLOQUE — la ruta NO está registrada en el enrutador.**
**Región:** sin `#region`. Entre `SetCAccount` (357–363) y `UpdateCreditOrderId` (404–419).

---

## ⚠️ El proxy existe en el archivo pero está deshabilitado

El bloque completo —incluidos los atributos `[HttpPost]` y `[Route("validateCredit")]`— está dentro de un comentario `/* ... */` (líneas **366–402**), encabezado por:

```csharp
// Proxy al LAN para validar crédito
/* CODIGO LEGACY COMENTADO PARA MIGRACION A SAP
 * Reemplazado por validación nativa de SAP a través de OData FI/FICA en ServicioSAP.
 * La validación local de LAN queda obsoleta.
[HttpPost]
[Route("validateCredit")]
public async Task<IHttpActionResult> ValidateCredit([FromBody] OrderRequest order)
{ ... }
*/
```

**Consecuencia inmediata:** como los atributos de ruta están comentados, ASP.NET Web API **no registra `order/validateCredit`** en la DMZ. Cualquier petición externa a esa ruta recibe **HTTP 404**. El endpoint LAN (`APIMagento/.../OrdersController.cs:456–482`) **sigue vivo y accesible**, pero **solo desde dentro de la LAN**.

> Es un caso distinto a los otros seis endpoints analizados: aquí no hay un *gap* histórico, hay una **desconexión deliberada y en curso**. La ruta LAN quedó huérfana de su puente.

---

## Qué hacía el proxy cuando estaba activo (para la trazabilidad)

1. Recibía `POST` con body `OrderRequest`, decorado con `[Authorize]` y `[RoutePrefix("order")]`.
2. **No usaba `Curl`** — a diferencia de todos sus vecinos. Construía la URL a mano y usaba `HttpClient` directamente:
   ```csharp
   string lanUrl = ConfigurationManager.AppSettings["URL_INTELISIS"] + "validateCredit";
   using (var client = new System.Net.Http.HttpClient()) { ... await client.PostAsync(lanUrl, content); }
   ```
   🚩 **La URL construida es `{URL_INTELISIS}validateCredit`, sin el prefijo `order/`.** Los demás endpoints invocan `curl.Post("order/…")`, que concatena sobre la misma base. Si `URL_INTELISIS` es la raíz del servicio LAN, esta URL apunta a `.../validateCredit` en lugar de `.../order/validateCredit` — **una ruta que no existe en LAN**. No es verificable sin el valor de la app setting, pero es una discrepancia real frente al patrón del archivo y debe comprobarse antes de reactivar el bloque.
3. **Era el único endpoint `async` del controlador** (`async Task<IHttpActionResult>` con `await client.PostAsync` / `ReadAsStringAsync`) — cumple la Regla #12, a diferencia de todo lo que lo rodea.
4. Sí registraba traza: `Logger.SetOrder("DMZ ValidateCredit", $"LAN status={response.StatusCode} body={body}")`.
5. Traducía el resultado: `Ok(JsonConvert.DeserializeObject(body))` si `IsSuccessStatusCode`, `InternalServerError` en caso contrario.

---

## Los endpoints de crédito que SÍ siguen activos en la DMZ

El flujo de crédito **no está muerto en la DMZ**: quedaron tres rutas vivas que forman el circuito asíncrono. Es imprescindible entender que el ciclo se completa **con LAN llamando a la DMZ**, no al revés:

| Ruta DMZ | Líneas | Rol | Dirección |
|---|---|---|---|
| `POST order/updateCreditOrderId` | 404–419 | proxy a LAN (`curl.Post("order/updateCreditOrderId", …)`) | DMZ → LAN |
| `POST order/authorizationResult` | 421–458 | **recibe el callback de LAN** y lo reenvía a Magento (`rest/V1/omnipro-credito/authorizationResult`) | **LAN → DMZ → Magento** |
| `GET order/creditStatus/{idSolicitud}` | 460–482 | proxy a LAN (`curl.Get("order/creditStatus/" + idSolicitud)`) | DMZ → LAN |

**`order/authorizationResult` es la pieza clave.** Es el destino de `OrderMethods.CallMagentoAuthorizationCallback` (`APIMagento/WebApiMagento/Metodos/OrderMethods.cs:1731–1813`), que el hilo del Liberador invoca desde LAN al terminar el análisis de crédito:
```csharp
string dmzBase = ConfigurationManager.AppSettings["URL_DMZ"];
string authUrl = dmzBase + "login/authenticate";
string callbackUrl = dmzBase + "order/authorizationResult";
```
Es decir: **la ruta de entrada (`validateCredit`) está comentada, pero la ruta de salida del callback sigue operativa.** El circuito quedó abierto por un extremo.

---

## Estado del flujo de crédito en la migración — evidencia del propio código

`APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs` contiene **cinco bloques comentados** con el marcador `CODIGO LEGACY COMENTADO PARA MIGRACION A SAP`, todos dentro de `Set` (`order/setOrder`) y de `ValidateCredit`:

| Líneas | Qué se desactivó | Justificación escrita en el código |
|---|---|---|
| 118–126 | validación de `infoCliente["cuenta"]` en método crédito | *"SAP/ServicioSAP valida internamente el BP, no exigimos la palabra clave 'cuenta'."* |
| 132–183 | el `POST` a LAN `order/setOrder` completo | *"Se deshabilita el POST doble hacia order/setOrder ya que provocaba error 404 al enrutarse a ServicioSAP. Toda orden fluirá exclusivamente por order/new."* |
| 168–176 | validación de que la respuesta empiece con `C` | *"SAP retornará identificadores puramente numéricos (BP), por lo que ya no evaluamos la letra 'C'."* |
| 185–213 | el `if (order.metodoPago != CREDIT_METHOD)` que excluía a crédito de SAP | *"Ahora enviamos TODO a SAP de forma agnóstica."* |
| **365–402** | **este proxy `validateCredit`** | *"Reemplazado por validación nativa de SAP a través de OData FI/FICA en ServicioSAP. La validación local de LAN queda obsoleta."* |

**Lectura conjunta:** la DMZ ya redirige **todo** el alta de pedidos a SAP vía `curl.PostSAP("order/new", …)` (línea 196), incluidos los de crédito, y la validación crediticia se declara responsabilidad de OData FI/FICA. **La LAN todavía no lo sabe:** `OrderMethods.SetPedido` mantiene íntegra su rama de crédito contra Intelisis, y `CallMagentoAuthorizationCallback` sigue apuntando a la DMZ.

---

## Puente a SAP (Regla #16)

**Este endpoint es el ejemplo canónico de la regla ya aplicada — y a la vez de su aplicación incompleta.**

- `Set` (`order/setOrder`) **ya migró**: `curl.Post("order/setOrder", …)` fue reemplazado por `curl.PostSAP("order/new", …)` (línea **196**), con `Curl.PostSAP` disponible en `APIMagentoDMZ/WebApiMagento/Helper/Curl.cs:115` y `URL_SAP` en la línea 23. `Cancel` (línea 282) y `Return` (línea 317) también usan ya `PostSAP`.
- `ValidateCredit` **no migró: se comentó.** No se convirtió a `curl.PostSAP(...)`; simplemente dejó de existir como ruta.

⚠️ **Pregunta abierta que debe cerrarse:** si la validación de crédito la asume SAP dentro de `order/new`, ¿por qué sigue existiendo el endpoint LAN `order/validateCredit` y el callback `order/authorizationResult`? Y si el flujo asíncrono de autorización se conserva, **¿quién lo dispara ahora que la ruta de entrada en DMZ no existe?** Ver [[03_BusinessMethod]] § Destino SAP.

---

## Interacciones con Base de Datos

**Ninguna** (el bloque está comentado; y aun activo, la DMZ no abría `SqlConnection`).

## Observaciones técnicas detectadas

1. **La ruta no está registrada** — cualquier consumidor externo recibe 404. El endpoint LAN queda accesible solo desde dentro de la red.
2. **Circuito asimétrico:** entrada comentada, salida (`authorizationResult`) activa. Si algo dentro de la LAN sigue invocando `order/validateCredit`, el flujo se ejecuta completo y el callback llega a Magento — **sin que la DMZ tenga registro de la petición inicial**.
3. **`URL_INTELISIS + "validateCredit"` sin prefijo `order/`** (línea 375) — discrepancia con el patrón del archivo; verificar antes de reactivar.
4. **Código comentado en producción.** Cinco bloques de código muerto documentado en un solo archivo. Al cerrar la migración deben eliminarse; mientras tanto, son la **mejor documentación disponible** de las decisiones tomadas y conviene no perderlos sin registrarlos (ya quedan registrados aquí).
5. **Era el único método `async` del controlador.** Su patrón (`async Task<IHttpActionResult>` + `await`) es el que deben seguir el resto de los endpoints al migrar (Regla #12).

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #OrdersController #validateCredit #credito #bloqueante
