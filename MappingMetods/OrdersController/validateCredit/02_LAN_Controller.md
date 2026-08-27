# Mapeo del Método: `POST /order/validateCredit` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `ValidateCredit([FromBody] OrderRequest order)` — Líneas **456–482**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Punto de entrada del **flujo asíncrono de crédito**. Delega en `SetPedido` y responde inmediatamente `PROCESANDO`; el resultado real llega a Magento después, por callback, desde un hilo en segundo plano.
**Región:** sin `#region`. Precedido por un comentario de intención (línea **455**): `// Endpoint que recibe el quote de Magento y dispara el proceso de crédito`. Le siguen `GetCreditStatus` (484–504) y `UpdateCreditOrderId` (506–533), que completan el circuito.

> ⚠️ **Su proxy en DMZ está comentado** — la ruta `order/validateCredit` **no existe** en la DMZ. Ver [[01_DMZ_Controller]].

---

## Flujo de Ejecución

```csharp
[HttpPost]
[Route("validateCredit")]
public IHttpActionResult ValidateCredit([FromBody] OrderRequest order)
{
    try
    {
        Logger.SetOrder("ValidateCredit", $"Recibido entityId={order.entityId} incrementId={order.incrementId}");

        var om = new OrderMethods();

        // SetPedido ya maneja CREDIT_METHOD:
        // - guarda datos en la tabla de crédito
        // - lanza el thread de LiberarCliente
        // - el thread llama CallMagentoAuthorizationCallback al terminar
        string resultado = om.SetPedido(order);

        Logger.SetOrder("ValidateCredit", $"SetPedido resultado={resultado} entityId={order.entityId}");

        // Respuesta inmediata — el callback a Magento llega de forma asíncrona
        return Ok(new { status = "PROCESANDO", cuenta = resultado });
    }
    catch (Exception ex)
    {
        Logger.SetOrder("ERROR ValidateCredit", ex.Message);
        return InternalServerError(ex);
    }
}
```

1. Recibe `POST` con body `OrderRequest` y `[FromBody]` **explícito** — solo este método y `UpdateCreditOrderId` (línea 508) lo declaran en todo el controlador.
2. **Traza de entrada (línea 462):** `Logger.SetOrder("ValidateCredit", $"Recibido entityId=… incrementId=…")` → `C:\inetpub\wwwroot\log\setOrder.log` (`Helper/Logger.cs:19–21`). ✅ Cumple la Regla #8 mejor que ningún otro endpoint del bloque, y **no vuelca el payload completo** (a diferencia de `Set`, línea 144, que serializa el `OrderRequest` entero con los datos personales del cliente). Ver observación 5.
3. **Sin guarda de `null`.** El primer uso es `order.entityId` **dentro** del `try` (línea 462): si el body llega vacío, `NullReferenceException` → `catch` → `InternalServerError(ex)` → **HTTP 500**. Contrasta con `Set` (líneas 141–142), `PaynetOrdersResponse` (25–26) y `InsertPaymentData` (58–62), que sí validan.
4. **Sin validación de negocio.** No comprueba que `metodoPago == "omnipro_pago_credito"`, ni que `infoCliente` contenga `"cuenta"`, ni que haya artículos. Ver observación 2.
5. **Delega en `om.SetPedido(order)`** (línea 470) — **exactamente el mismo método que usa `order/setOrder`** (línea 151). No hay lógica propia. El comportamiento diferenciado depende **por completo** de que `order.metodoPago` valga `"omnipro_pago_credito"` (`OrderMethods.cs:30, 605`).
6. **Respuesta inmediata y optimista (línea 475):**
   ```csharp
   return Ok(new { status = "PROCESANDO", cuenta = resultado });
   ```
   `status` es la **constante literal `"PROCESANDO"`**: se emite igual haya ido bien o mal. `cuenta` es el `string` que devuelva `SetPedido` — en la rama de crédito es `order.infoCliente["cuenta"]` (`OrderMethods.cs:645`), pero puede ser `"PedidoExistente"`, `"sin cuenta"`, `"err"`, `"insuficiente"` o `""`. Ver observación 1.
7. **Traza de salida (línea 472)** con el resultado de `SetPedido`, antes del `return`.
8. `catch (Exception ex)` (477–481): loguea `Logger.SetOrder("ERROR ValidateCredit", ex.Message)` y responde `InternalServerError(ex)`. **`InternalServerError(Exception)` incluye el mensaje y, según la configuración de `IncludeErrorDetailPolicy`, el stack trace en el cuerpo.**

---

## El circuito asíncrono completo

Este endpoint es solo el disparador. El ciclo se cierra en otras tres rutas:

```
Magento ──POST order/validateCredit──►  LAN OrdersController.ValidateCredit     ← este documento
                                              │
                                              ▼  om.SetPedido(order)
                                        CreditMethods.ProductosCreditoWeb_SaveData
                                              │  SP_CREDITO_WEB_DATOS → IdSolicitud
                                              │
                                              ├──► respuesta HTTP inmediata: { status: "PROCESANDO", cuenta }
                                              │
                                              └──► Thread (IsBackground) LiberadorCreditoMethods.LiberarCliente
                                                        │  HTTP → VETA_URL_LIBERADOR (API externa)
                                                        ▼
                                                   OrderMethods.CallMagentoAuthorizationCallback
                                                        │  POST → {URL_DMZ}order/authorizationResult
                                                        ▼
                                                   DMZ OrdersController.AuthorizationResult (421–458)
                                                        │  POST → rest/V1/omnipro-credito/authorizationResult
                                                        ▼
                                                     Magento
```

Y en paralelo, dos rutas de consulta/corrección que Magento usa después:

| Ruta LAN | Líneas | Función |
|---|---|---|
| `GET order/creditStatus/{idSolicitud}` | 484–504 | Magento consulta si `Venta.Situacion = 'Liberado'` |
| `POST order/updateCreditOrderId` | 506–533 | sustituye el `IdEcommerce` temporal (`CRED…`) por el real |

Ambas **sí tienen proxy activo en la DMZ** (`APIMagentoDMZ/.../OrdersController.cs:460–482` y `404–419`). **Solo `validateCredit` está comentado** ([[01_DMZ_Controller]]).

---

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **`status = "PROCESANDO"` constante — el hallazgo principal.** La respuesta es siempre la misma independientemente de lo que devuelva `SetPedido`. El campo `cuenta` puede traer, sin distinción de código HTTP:

   | Valor de `cuenta` | Significado real | HTTP |
   |---|---|---|
   | `"C00012345"` | solicitud creada, hilo del Liberador lanzado | 200 |
   | `"PedidoExistente"` | ya existía un `Venta` con ese `IDEcommerce` | 200 |
   | `"sin cuenta"` | `checkCliente` devolvió `false` (`CreditMethods.cs:257`) | 200 |
   | `"insuficiente"` | el total supera el saldo disponible (`CreditMethods.cs:128`) — ⚠️ **pero el flujo continúa igual** | 200 |
   | `"err"` | excepción dentro de `ProductosCreditoWeb_SaveData` (`CreditMethods.cs:251`) | 200 |
   | `""` | excepción tragada por el `catch` de `SetPedido` (`OrderMethods.cs:708–711`) | 200 |

   **Un rechazo de crédito, un error de BD y un alta exitosa son indistinguibles en el cable.** Magento tiene que esperar al callback o consultar `creditStatus` para enterarse — pero si `SetPedido` falló antes de lanzar el hilo, **el callback nunca llega y Magento se queda esperando indefinidamente**.

2. **Sin validación de que el pedido sea de crédito.** Si `metodoPago` no es `"omnipro_pago_credito"`, `SetPedido` ejecuta la rama **normal**: crea el pedido en `Venta` vía `SP_eCommerceNuevoPed` y devuelve la cuenta. El endpoint responde igualmente `{ status: "PROCESANDO" }` — **para un pedido que ya está creado y cerrado, no en proceso**. Es un camino directo a inconsistencia entre Magento e Intelisis.

3. **Sin guarda de `null`** (paso 3) → HTTP 500 con `NullReferenceException` ante un body vacío.

4. **Duplicación funcional con `order/setOrder`.** Los dos endpoints llaman a `om.SetPedido(order)` sin diferencia de parámetros. Difieren solo en el envoltorio (`Set` loguea el payload completo, responde `Ok(response)` y captura la excepción devolviendo `Ok(e.ToString())` — HTTP 200 con stack trace, línea 156). **Al migrar hay que decidir si se conservan los dos o se unifican**; mantener dos puertas a la misma lógica con contratos de respuesta distintos es deuda pura.

5. **Buen manejo de traza, con un matiz.** Es de los pocos endpoints con log de entrada **y** de salida, y —a diferencia de `Set` (línea 144)— **no serializa el `OrderRequest` completo**, evitando volcar nombre, dirección, teléfono y correo del cliente en texto plano. ✅ Ese criterio debe extenderse a `Set`, que hoy sí los escribe (Regla #8: trazabilidad sin exponer datos sensibles).

6. **`InternalServerError(ex)` expone detalle interno** según `IncludeErrorDetailPolicy`. Debe reemplazarse por un identificador de correlación.

7. **Método síncrono que lanza trabajo asíncrono no gestionado.** El controller es síncrono, pero `SetPedido` arranca un `System.Threading.Thread` con `IsBackground = true` (`CreditMethods.cs:215–240`) que sobrevive al request. Y ese hilo usa `.Result` sobre `HttpClient` (`OrderMethods.cs:1766, 1789`) — **prohibido explícitamente por la Regla #12**. Ver [[03_BusinessMethod]] obs. 3.

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #OrdersController #validateCredit #credito
