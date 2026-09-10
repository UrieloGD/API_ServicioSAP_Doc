# Comparativa de creación de orden: `SetPedido` (LAN) vs `SetOrderAsync` (ServicioSAP)

> Documento de análisis + plantilla de verificación de paridad funcional.
> Base analizada: `C:\BackEndEcommerce\Migracion SAP` — solo lectura, sin cambios aplicados.
> Fecha de análisis: 2026-09-07

---

## 1. Identificación de los dos flujos

| | LAN (legado) | ServicioSAP (destino) |
|---|---|---|
| Entrada HTTP | `POST order/setOrder` — `LAN/WebApiMagento/Controllers/OrdersController.cs:137` | `POST order/new` — `ServicioSAP/.../Controllers/OrderController.cs:18` |
| Método orquestador | `SetPedido(OrderRequest order, bool liberado = false)` — `LAN/WebApiMagento/Metodos/OrderMethods.cs:533` | `SetOrderAsync(OrderRequest orderRequest, string tipo = "")` — `ServicioSAP/.../Methods/Order/OrderMethods.cs:1622` |
| Firma / asincronía | Síncrono, devuelve `string` | `async Task<OrderResponse>` |
| Retorno en éxito | Cuenta creada (`GetCreatedAccount(incrementId)`) o literal (`"PedidoExistente"`, `"Concluido"`, `"PrecioIncorrecto"`, `"Incorrecto"`) | Objeto `OrderResponse` de SAP (`PurchNoC`, `Zctefinal`, `to_result.Salesdocument`, `Resultado`) |
| Manejo de error | `try/catch` global que **traga** la excepción y devuelve `"Incorrecto"` | `try/catch` global que **relanza** `Exception("Error en SetOrder: …")` → el controller responde `BadRequest` |
| Segunda entrada | `SetPedido(order, liberado: true)` desde `OpenpayMethods.CheckStatus()` (`OpenpayMethods.cs:276`) | **No existe** |
| Otros llamadores | `ReSetPedido(incrementId)` (`OrderMethods.cs:1688`), `Magento.cs:406`, `validateCredit` (`OrdersController.cs:470`) | Solo `order/new` y `order/setreturn` |

**Cambio de paradigma:** LAN escribe el pedido en Intelisis (SQL Server) mediante SPs y luego "afecta" el documento. SAP construye un `OrderModel` y lo entrega en un único `POST` a `ZAPI_SALESORDER_SRV`, delegando la persistencia atómica a SAP. Consecuencia: todo lo que en LAN eran *pasos separados* (detalle de partidas, monedero, afectación, datos de entrega) en SAP debe viajar **dentro del payload** o resolverse con OData posterior.

---

## 2. Comparativa paso a paso

Leyenda: ✅ migrado equivalente · ⚠️ migrado con diferencia de comportamiento · ❌ no migrado / stub · 🔵 sustituido intencionalmente por arquitectura SAP

| # | Paso en LAN | Ref. LAN | Equivalente en SAP | Ref. SAP | Estado |
|---|---|---|---|---|---|
| 01 | `AgruparCantidadPorSKU` — consolida SKUs repetidos, suma cantidad y descuento | `OrderMethods.cs:487` | `AgruparCantidadPorSKU` con LINQ `GroupBy` | `OrderMethods.cs:75` | ✅ |
| 02 | Guarda `forzarOrderOriginal` **antes** de `ToArray()` (porque `ToArray` lo muta a `"1"`) | `OrderMethods.cs:536` | **No se guarda**; se lee `orderRequest.forzarOrder` ya mutado | `OrderMethods.cs:1645` | ❌ D-01 |
| 03 | `ToArray(order)` → arreglo plano de **39** posiciones (`enum Venta 0..38`) | `OrderMethods.cs:340` / `Models/Enums.cs:10` | `ToArray(order)` → arreglo de **38** posiciones (falta `Origen`) | `OrderMethods.cs:186` | ⚠️ D-10 |
| 04 | Idempotencia: `obtenerIdVenta(idEcommerce) > 0 && (forzarOrderOriginal=="0" o metodoPago==paypal)` → `"PedidoExistente"` | `OrderMethods.cs:540` | `ValidarPedidoExistenteSAPAsync("ZSD_{docType}_{incrementId}")` vía SD36 | `OrderMethods.cs:1645` | ⚠️ D-01 |
| 05 | Openpay tarjetas (`openpay_cards`) y `!liberado` → `SaveToValidateOpenpay` y **return** | `OrderMethods.cs:545` | `SaveToValidateOpenpay` y **return** — sin bandera `liberado` | `OrderMethods.cs:1657` | ❌ D-05 |
| 06 | Openpay tiendas (`openpay_stores`) → guarda y **continúa** | `OrderMethods.cs:551` | `SaveOpenpayStoresOrder` y continúa | `OrderMethods.cs:1668` | ✅ |
| 07 | Selección de SP: `SP_eCommerceNuevoPed` (valida precio) vs `SPVTASPedidosMagento` (fuerza) según `forzarOrder` | `OrderMethods.cs:556` | Sin equivalente; `docType` siempre `ZMER`, validación de precio siempre activa | — | ⚠️ D-15 |
| 08 | `recogeSucursal = metodoEnvio == "instore_pickup" ? 1 : 0` (se pasa a `detallePedido`) | `OrderMethods.cs:566` | No aplica (no hay `detallePedido`) | — | 🔵 |
| 09 | `totalArticulos()` + bucle `detallePedido("Limpiar"/"Insertar")` → SP `SpVTASeCommerceDetPedidos`, acumula `fTotalDescuento` | `OrderMethods.cs:576-601` / `:963` | Eliminado por diseño: las partidas viajan en `to_items` del payload | `OrderMethods.cs:2288` (nota en `:472`) | 🔵 / ⚠️ D-17 |
| 10 | `NombreClienteMavi` = `ApellidoP + ApellidoM + Nombre` en mayúsculas | `OrderMethods.cs:603` | `ConstruirNombreClienteMavi(infoCliente)` — mismo orden | `OrderMethods.cs:345` | ✅ |
| 11 | `SaveGuide(idEcommerce, NombreClienteMavi)` en SQLite — **antes** del bloque de crédito | `OrderMethods.cs:606` | `SaveGuide(incrementId, NombreClienteMavi)` — **después** del early-exit de crédito | `OrderMethods.cs:1732` | ⚠️ D-06 |
| 12 | Crédito (`omnipro_pago_credito`): arma `articulos` + `SEGU00001` por costo de envío, obtiene SMS/validación, llama `CreditMethods.ProductosCreditoWeb_SaveData(...)` y **return cuenta** | `OrderMethods.cs:610-648` | `ProcessCreditPaymentAsync(...)` y **return** `OrderResponse` | `OrderMethods.cs:1677-1699` / `:613` | ⚠️ D-14, D-16 |
| 12a | └ `checkCliente` / `checkSaldo` → si no alcanza, marca `"insuficiente"` pero **igual crea la solicitud** | `CreditMethods.cs:124-133` | `CheckClientCreditAsync` / `CheckClientBalanceAsync` → **`throw`**, aborta la orden | `OrderMethods.cs:625-635` | ⚠️ D-16 |
| 12b | └ `getClientInfo(cuenta)` trae apellidos, fecha nac., RFC, sexo, estado civil desde Intelisis | `CreditMethods.cs:137` | No se consulta; campos enviados vacíos al SP | `OrderMethods.cs:770-782` | ❌ D-14 |
| 12c | └ `CreditoWeb_InsertArticulo(articulos, IdSolicitud, condicion, cp)` | `CreditMethods.cs:201` | `InsertCreditArticlesAsync(...)` con precios de SD29 ProperList | `OrderMethods.cs:849` | ⚠️ (UEN hardcodeada `"3"`, `:853`) |
| 12d | └ Código promotor: `data[6]` → `CodigoPromocion(codigo, "Elimina", idMagento)` | `CreditMethods.cs:203-206` | `HandlePromoCodeAsync(datosArray[72], …)` — índice inexistente | `OrderMethods.cs:657` | ❌ D-04 |
| 12e | └ Cuenta prospecto (`startsWith("C")`) → hilo liberador + `CallMagentoAuthorizationCallback` | `CreditMethods.cs:208-241` | **Bloque completo comentado** | `OrderMethods.cs:664-693` | ❌ D-13 |
| 13 | — (lo hacía el SP) | — | Validación de precios contra ProperList SD29, ajusta hacia arriba sin fallar | `OrderMethods.cs:1717` / `:1851` | 🔵 nuevo |
| 14 | — (no existe en LAN) | — | `ValidarStockArticulos` contra DIM11 — **fail-fast**, devuelve `Resultado="Error"` | `OrderMethods.cs:1720` / `:1912` | 🔵 nuevo (LAN no bloqueaba) |
| 15 | — (no existe en LAN) | — | `ValidarRegionCelulares(order, codigoPostal)` — **recibe `sDatosPedido[20]` = estado, no el CP** | `OrderMethods.cs:1709`, `:1723` | ❌ D-02 |
| 16 | Cliente: lo resuelve/crea el SP `SP_eCommerceNuevoPed` en Intelisis | `OrderMethods.cs:662` | `ResolvePartnerNumberForOrderAsync` → BP existente o `SubmitClientInfoAsync` (BP01) | `OrderMethods.cs:1726` / `:2431` | 🔵 |
| 17 | `sDatosPedido[Agente] = order.Agente` justo antes de crear el pedido → `@Agente` del SP | `OrderMethods.cs:650` | `sDatosPedido[35] = orderRequest.Agente` — pero `sDatosPedido` **ya no se usa** después | `OrderMethods.cs:1738` | ❌ D-09 |
| 18 | Pickup: `setNameToReference(...)` → SP `SpWDM0285_CteRecoge`, **antes** de crear el pedido (parche requerido por el SP) | `OrderMethods.cs:659` / `:1273` | `RegisterPickupClientInfo(...)` **después** del POST a SAP, y es un **stub** con `Console.WriteLine` | `OrderMethods.cs:1805` / `:1472` | ❌ D-03, D-11, D-12 |
| 19 | `crearPedido(sDatosPedido, fTotalDescuento, sp)` → SP con 27 parámetros (subtotal, total, impuesto, descuento, costo envío, pagos/cuotas, monedero, referencia/origen…) | `OrderMethods.cs:662` / `:1106` | `BuildSapOrderAsync(...)` + `POST ZAPI_SALESORDER_SRV` | `OrderMethods.cs:1741-1777` / `:2067` | ⚠️ D-07, D-08 |
| 20 | `UpdateIdEcommerceEnVenta(sId, incrementId)` cuando el id empieza con `CRED` | `OrderMethods.cs:666-671` | Eliminado ("SAP mantiene `Zidecomm`") | nota `OrderMethods.cs:1281` | ⚠️ D-18 |
| 21 | `pasaAfectado = metodoPago ∈ {openpay_cards, paypal_express}` | `OrderMethods.cs:673` | Idéntico | `OrderMethods.cs:1815` | ✅ (inalcanzable para openpay por D-05) |
| 22 | Si `"Concluido"`: `GetCreatedAccount` si no hay cuenta + `DatosEntregaInsert` → `INSERT DM0312DatosEntrega` | `OrderMethods.cs:678-687` / `:918` | `sapResponse.Zctefinal` + `DatosEntregaInsertAsync` → OData `A_BusinessPartnerAddress` + `AS_POST_SALESDOC_ADDRCHANGE` | `OrderMethods.cs:1780-1811` / `:1315` | 🔵 ⚠️ (SAP hace early-return en pickup, `:1319`) |
| 23 | Pickup + `Agente != null` + `banktransfer` → `crearPrimerCodigoRecogerSucbanktransfer` (clave de recolección + correo al cliente) | `OrderMethods.cs:689-703` | **Sin equivalente en `SetOrderAsync`** | — | ❌ D-11 |
| 24 | Si `"Concluido"` y `pasaAfectado`: `obtenerIdVenta` → `GenerarMonedero(idVenta, uen, cuentaC)` → `afectar(idVenta, storeId)` (SP `spAfectar`) | `OrderMethods.cs:705-722` / `:1426` / `:1540` | `GenerarMonederoSAPAsync(...)` — **stub TODO**; `afectar(...)` — **stub que devuelve `true`** | `OrderMethods.cs:1824` / `:1296` / `:1450` | ❌ D-12 |
| 25 | Retorno de cuenta al DMZ; el DMZ llama `order/setCAccount` a Magento | `OrderMethods.cs:732` | `CallSetCAccountCallbackAsync(incrementId, Zctefinal)` — webhook directo al DMZ con 3 reintentos | `OrderMethods.cs:1828` / `:1193` | 🔵 mejora |
| 26 | Logging estructurado `Logger.SetOrder(...)` en cada hito | `OrderMethods.cs:664`, `:696`, `:700` | Mayormente `Console.WriteLine`; `Logger.SAP` solo para request/response de SAP | `OrderMethods.cs:1754`, `:1760` | ⚠️ D-20 |

---

## 3. Hallazgos

### 3.1 Defectos confirmados por lectura de código

| ID | Sev. | Hallazgo | Evidencia |
|---|---|---|---|
| **D-01** | 🔴 Alta | `ToArray()` muta `order.forzarOrder` a `"1"` cuando algún artículo trae `precioEspecial != 0` (`OrderMethods.cs:224`). SAP evalúa la idempotencia **después** de esa mutación, así que **la validación de duplicados se salta en toda orden con precio especial**. LAN lo evita guardando `forzarOrderOriginal` antes de llamar a `ToArray`. | SAP `:1633-1645` vs LAN `:536-540` |
| **D-02** | 🔴 Alta | `string codigoPostal = sDatosPedido[20]; // Índice DirCP` — el índice 20 es **`estado`**; el CP es el 17. Ese valor alimenta `ValidarRegionCelulares`, que decide la región del SKU con `codigoPostal.Substring(0,1)` → puede reescribir SKUs de telefonía con la región equivocada. | SAP `:1709`, `:1723`, `:1990` |
| **D-03** | 🟠 Media | `RegisterPickupClientInfo(incrementId, NombreClienteMavi, sDatosPedido[16], telefonoLong)` — el índice 16 es **`numInt`**; el correo es el 29. | SAP `:1805` |
| **D-04** | 🟠 Media | `HandlePromoCodeAsync(datosArray[72], …)` protegido por `datosArray.Length > 72`, pero `ToArray` produce 38 elementos → **el código promotor nunca se procesa**. Además `codigo_promotor` no existe en `InfoClienteRequest` de SAP. | SAP `:656-658`, `:186` |
| **D-05** | 🔴 Alta | Openpay tarjetas: SAP guarda en `openpay_orders` y hace `return`, pero **no existe** el `bool liberado` ni un equivalente de `OpenpayMethods.CheckStatus()` que reprocese la orden al confirmarse el cargo. No hay ningún archivo de Openpay en ServicioSAP. → **las órdenes con tarjeta Openpay nunca llegan a SAP.** | SAP `:1657`; LAN `OpenpayMethods.cs:70-101`, `:271-277` |
| **D-06** | 🟡 Baja | LAN ejecuta `SaveGuide` **antes** del bloque de crédito; SAP lo ejecuta **después** del early-exit → las órdenes de crédito quedan sin registro en `servicio_guias` (afecta `order/getGuide`). | LAN `:606` vs SAP `:1699`, `:1732` |
| **D-07** | 🔴 Alta | El **costo de envío no llega a SAP** en el flujo de contado. LAN lo manda como `@costoenvio` al SP; en crédito ambos lo agregan como `SEGU00001`. En `BuildSapOrderAsync` no hay ítem ni condición para `costoEnvio`. | SAP `:2067-2412`; única referencia en `:1686` (solo crédito) |
| **D-08** | 🟠 Media | Tampoco viajan a SAP: `subTotal`, `total`, `impuesto`, `cuotas` (LAN `@Pagos`, con la regla `0 → 1`) ni el descuento total (`fTotalDescuento` → `@Descto`). El total del documento queda a merced del recálculo de SAP a partir de `to_conditions`. | LAN `:1106-1240` vs SAP `:2178-2412` |
| **D-09** | 🟠 Media | `order.Agente` se asigna a `sDatosPedido[35]` pero ese arreglo ya no se usa; `BuildSapOrderAsync` escribe literales `"Tadeo"` en `Name`, `Zsituacionusuario` y `Bname`. El agente/vendedor se pierde. | SAP `:1738`, `:2192`, `:2210`, `:2248` |
| **D-10** | 🟡 Baja | `ToArray` de SAP omite el índice 38 (`Origen` = `infoCliente["origen"]`), que en LAN alimenta `@Referencia` del SP y `@origen` de la solicitud de crédito (SAP hardcodea `"ServicioSAP"`). | SAP `:186-277`, `:810` vs LAN `:432-437`, `:1229` |
| **D-11** | 🔴 Alta | Retiro en sucursal: no se genera la clave de recolección ni se envía el correo al cliente (`crearPrimerCodigoRecogerSucbanktransfer`). `StorePickupMethods` de SAP no tiene el método y `SetOrderAsync` no lo invoca. | LAN `:689-703`; SAP `Methods/Order/StorePickupMethods.cs` |
| **D-12** | 🔴 Alta | Tres piezas son **stubs declarados**: `afectar()` devuelve `true` sin hacer nada (`:1450`), `GenerarMonederoSAPAsync()` solo escribe en consola (`:1296`), `RegisterPickupClientInfo()` solo escribe en consola (`:1472`). | SAP `:1450`, `:1296`, `:1472` |
| **D-13** | 🔴 Alta | Liberador de crédito para cliente nuevo/prospecto y el callback de autorización a Magento están **comentados** en `ProcessCreditPaymentAsync`. La orden de crédito de cliente nuevo queda sin resolución. | SAP `:664-693` |
| **D-14** | 🟠 Media | `CrearSolicitudCredito` pierde respecto a LAN: `@entre_calles`, `@RedimirMonedero`, `@ValidacionTelefono`, `@OrigenIdMagento`, `@ClienteMagento`, `@sucursalDestino` (hardcodeado 0 vs `order.sucursalDestino`), `@sucursal` (0 vs `504/505` por UEN), `@origen` (`"ServicioSAP"` vs origen real), `@poblacion` y los datos de perfil (`rfc`, `fecha_nacimiento`, `sexo`, `estado_civil`). `@lada_particular` / `@telefono_particular` van en 0. | SAP `:748-848` vs LAN `CreditMethods.cs:150-188` |
| **D-15** | 🟠 Media | LAN conmuta el SP (`SP_eCommerceNuevoPed` ↔ `SPVTASPedidosMagento`) según `forzarOrder` para **saltarse la validación de precio**. SAP no replica esa bifurcación: `ValidarPreciosConProperlistAsync` siempre corre y siempre sube el precio al mínimo, ignorando `forzarOrder` y `precioEspecial`. | LAN `:556-564` vs SAP `:1717`, `:1851` |
| **D-16** | 🟠 Media | Crédito con saldo insuficiente: LAN registra `"insuficiente"` pero **continúa** creando la solicitud; SAP lanza excepción y **aborta la orden completa**. Cambio de comportamiento de negocio. | LAN `CreditMethods.cs:126-133` vs SAP `:631-635` |
| **D-17** | 🟡 Baja | `SpVTASeCommerceDetPedidos` en LAN no solo insertaba partidas: era el origen de la validación `PrecioIncorrecto` y del reporte `CorreoErrorPrecio`. Al eliminarlo hay que confirmar que la validación ProperList cubre el mismo caso de negocio, y qué pasa con la alerta por correo. | LAN `:963`, `:1319` |
| **D-18** | 🟡 Baja | LAN renombra el `IdEcommerce` de `CRED…` al `incrementId` real cuando la orden de crédito se materializa. En SAP el documento se crea con `PurchNoC = ZSD_ZMER_{incrementId}` de entrada; falta confirmar el caso en que la orden nace como `CRED…`. | LAN `:666-671`; nota SAP `:1281` |
| **D-19** | 🟡 Baja | El `catch` de `ValidarPedidoExistenteSAPAsync` devuelve `false` ante error de red → con SD36 caído se **crea el pedido duplicado**. Marcado en el propio código como "debería manejarse mejor en prod". | SAP `:397-402` |
| **D-20** | 🟡 Baja | Observabilidad: LAN escribe a `Logger.SetOrder` en cada hito (consumible por soporte); SAP usa `Console.WriteLine` salvo el request/response de SAP. En IIS eso se pierde. | SAP `:1646-1833` |

### 3.2 Diferencias de contrato (request Magento → API)

| Campo | LAN | SAP | Riesgo |
|---|---|---|---|
| `articulos` | `List<Dictionary<string,string>>` | `List<ArticuloRequest>` tipado | Bajo — mismos nombres |
| `infoCliente` | `Dictionary<string,string>` (claves dinámicas) | `InfoClienteRequest` tipado | 🔴 Claves usadas en LAN y **ausentes** en el modelo SAP: `origen`, `codigo_promotor`, `OrigenIdMagento`, `OrigenIdSplit`. Al deserializar se descartan en silencio. |
| `subTotal`, `total`, `impuesto`, `costoEnvio` | `string` | `decimal` | 🟠 Cultura/formato: `"1,234.56"` vs `"1234,56"` fallan distinto. `ToArray` de SAP hace `.ToString()` sin `InvariantCulture`. |
| `forzarOrder` | `string`, mutado por `ToArray` | igual, y sin salvaguarda | 🔴 ver D-01 |
| `RedimirMonedero` | `float` | `float` | ✅ |
| `docType`, `pmnttrms`, `refDoc`, `refDocCat`, `usuarioPos`, `salesOrg`… | no existen | existen | 🔵 nuevos campos SAP; confirmar que Magento no los envía y que los defaults son correctos |

---

## 4. PLANTILLA DE VERIFICACIÓN DE PARIDAD LAN → SAP

> Cómo usarla: una copia por **release candidate**. Cada fila se cierra solo con evidencia reproducible (id de orden en ambos sistemas, captura del payload y de la respuesta, o consulta SQL/OData). Una fila sin evidencia cuenta como ❌.

### Sección A — Matriz de escenarios obligatorios

Cada escenario se ejecuta en LAN y en SAP con **el mismo payload** y se compara campo a campo.

| Esc. | Escenario | `metodoPago` | `metodoEnvio` | Cliente | Resultado esperado | LAN OK | SAP OK | Riesgo |
|---|---|---|---|---|---|---|---|---|
| E-01 | Contado MA, invitado | `banktransfer` | `flatrate` | sin `cuenta` ni `cliente` | crea BP invitado + documento | ☐ | ☐ | |
| E-02 | Contado MA, cliente existente | `banktransfer` | `flatrate` | con `cuenta` | reutiliza BP + documento | ☐ | ☐ | |
| E-03 | Contado MA, cliente nuevo logueado | `banktransfer` | `flatrate` | `cliente` sin `cuenta` | BP01 crea BP + documento | ☐ | ☐ | |
| E-04 | VIU contado | `openpay_stores` | `flatrate` | con `cuenta` | registro `openpay_stores` + documento | ☐ | ☐ | |
| E-05 | Openpay tarjetas | `openpay_cards` | `flatrate` | cualquiera | registro y, al confirmar cargo, documento | ☐ | ☐ | **D-05** |
| E-06 | PayPal | `paypal_express` | `flatrate` | cualquiera | documento + monedero + afectación | ☐ | ☐ | **D-12** |
| E-07 | Crédito, cliente de casa con saldo | `omnipro_pago_credito` | `flatrate` | `cuenta` con crédito | IdSolicitud + artículos | ☐ | ☐ | |
| E-08 | Crédito, saldo insuficiente | `omnipro_pago_credito` | `flatrate` | `cuenta` sin saldo | **definir el esperado** | ☐ | ☐ | **D-16** |
| E-09 | Crédito, cliente nuevo / prospecto | `omnipro_pago_credito` | `flatrate` | cuenta `C…` | liberador + callback a Magento | ☐ | ☐ | **D-13** |
| E-10 | Retiro en sucursal | `banktransfer` | `instore_pickup` | con `Agente` | clave de recolección + correo | ☐ | ☐ | **D-11** |
| E-11 | Orden duplicada, `forzarOrder="0"` | cualquiera | — | — | `PedidoExistente` | ☐ | ☐ | |
| E-12 | Orden duplicada con `precioEspecial` | cualquiera | — | — | `PedidoExistente` | ☐ | ☐ | **D-01** |
| E-13 | Reintento con `forzarOrder="1"` | cualquiera | — | — | crea de nuevo | ☐ | ☐ | **D-15** |
| E-14 | SKU repetido en el carrito | cualquiera | — | — | 1 partida con cantidad sumada | ☐ | ☐ | |
| E-15 | Artículo con `precioEspecial` | cualquiera | — | — | precio especial respetado | ☐ | ☐ | **D-15** |
| E-16 | Con costo de envío > 0 | cualquiera | `flatrate` | — | envío cobrado en el documento | ☐ | ☐ | **D-07** |
| E-17 | Con `RedimirMonedero > 0` | cualquiera | — | — | puntos aplicados | ☐ | ☐ | **D-12** |
| E-18 | Meses sin intereses (`cuotas > 1`) | cualquiera | — | — | plazo correcto en el documento | ☐ | ☐ | **D-08** |
| E-19 | Telefonía con SKU `-R5` / `-R6` | cualquiera | — | CP de otra región | SKU con región correcta | ☐ | ☐ | **D-02** |
| E-20 | Stock insuficiente | cualquiera | — | — | **definir el esperado** | ☐ | ☐ | |
| E-21 | Con `codigo_promotor` | `omnipro_pago_credito` | — | — | cupón consumido | ☐ | ☐ | **D-04** |
| E-22 | Payload con `origen` poblado | cualquiera | — | — | origen persistido | ☐ | ☐ | **D-10** |
| E-23 | Orden nacida como `CRED…` | `omnipro_pago_credito` | — | — | id final = `incrementId` de Magento | ☐ | ☐ | **D-18** |
| E-24 | SD36 no disponible al validar duplicado | cualquiera | — | — | falla controlada, sin duplicado | ☐ | ☐ | **D-19** |

### Sección B — Checklist de paridad por paso del flujo

| ID | Paso del flujo | Criterio de aceptación | Estado actual | Evidencia | Responsable | Fecha |
|---|---|---|---|---|---|---|
| P-01 | Agrupación por SKU | 2 líneas del mismo SKU → 1 partida, cantidad y descuento sumados | ✅ | | | |
| P-02 | Preservación de `forzarOrder` | Orden con `precioEspecial` y `forzarOrder="0"` reenviada → `PedidoExistente` | ❌ D-01 | | | |
| P-03 | Idempotencia | Reenvío del mismo `incrementId` no genera un segundo documento | ⚠️ | | | |
| P-04 | Openpay tarjetas — guardado | Registro en `openpay_orders` con `status='processing'` | ✅ | | | |
| P-05 | Openpay tarjetas — reproceso | Al confirmarse el cargo, la orden llega a SAP y se marca `is_in_intelisis='1'` | ❌ D-05 | | | |
| P-06 | Openpay tiendas | Registro en `openpay_stores` **y** documento creado | ✅ | | | |
| P-07 | Guía de envío | `servicio_guias` poblada en **todos** los métodos de pago, incluido crédito | ⚠️ D-06 | | | |
| P-08 | Nombre cliente Mavi | Formato `APELLIDOP APELLIDOM NOMBRE` en mayúsculas, idéntico en ambos | ✅ | | | |
| P-09 | Partidas del pedido | Nº de partidas, SKU, cantidad y precio idénticos LAN vs SAP | ⚠️ | | | |
| P-10 | Costo de envío | Importe de envío presente y cobrado en el documento SAP | ❌ D-07 | | | |
| P-11 | Totales de cabecera | `subTotal`, `impuesto`, `total` y descuento del documento SAP == los de Magento | ❌ D-08 | | | |
| P-12 | Plazos / cuotas | `cuotas` reflejadas en la condición de pago (regla `0 → 1`) | ❌ D-08 | | | |
| P-13 | Agente / vendedor | El agente de la orden aparece en el documento SAP (no `"Tadeo"`) | ❌ D-09 | | | |
| P-14 | Origen | `origen` del payload persistido como referencia | ❌ D-10 | | | |
| P-15 | Resolución de cliente (BP) | Invitado / existente / nuevo resuelven al BP correcto | ✅ | | | |
| P-16 | Datos de entrega | Domicilio asociado al documento (reutiliza si ya existe, crea si no) | ⚠️ | | | |
| P-17 | Datos de entrega en pickup | Confirmar que el early-return en `instore_pickup` es la regla de negocio deseada | ⚠️ | | | |
| P-18 | Pickup — registro de cliente | Nombre, **correo** y teléfono registrados correctamente | ❌ D-03, D-12 | | | |
| P-19 | Pickup — clave y correo | Clave de recolección generada y correo recibido por el cliente | ❌ D-11 | | | |
| P-20 | Monedero | Tarjeta creada y movimiento generado para Openpay / PayPal | ❌ D-12 | | | |
| P-21 | Afectación | Documento afectado (equivalente a `spAfectar`) | ❌ D-12 | | | |
| P-22 | Callback `setCAccount` | Magento recibe la cuenta / BP asociada a la orden | ✅ | | | |
| P-23 | Crédito — solicitud | `IdSolicitud` generado con **todos** los campos que LAN envía | ⚠️ D-14 | | | |
| P-24 | Crédito — artículos | Artículos y precios (ProperList) insertados; UEN correcta, no fija | ⚠️ | | | |
| P-25 | Crédito — código promotor | Cupón consumido | ❌ D-04 | | | |
| P-26 | Crédito — liberador | Cliente nuevo liberado y Magento notificado (autorizado / rechazado) | ❌ D-13 | | | |
| P-27 | Crédito — saldo insuficiente | Comportamiento acordado con negocio y documentado | ⚠️ D-16 | | | |
| P-28 | Validación de precio | Regla equivalente a `SP_eCommerceNuevoPed` / ProperList, incl. `forzarOrder` | ⚠️ D-15, D-17 | | | |
| P-29 | Validación de stock | Regla de negocio acordada (LAN no bloqueaba, SAP sí) | ⚠️ | | | |
| P-30 | Región de celulares | Se evalúa con el **código postal**, no con el estado | ❌ D-02 | | | |
| P-31 | Contrato de request | Todos los campos que Magento envía existen en el modelo SAP y se usan | ⚠️ | | | |
| P-32 | Formato numérico | Decimales con `InvariantCulture` en toda la serialización | ⚠️ | | | |
| P-33 | Contrato de response | El DMZ / Magento interpretan la respuesta de SAP igual que la de LAN | ⚠️ | | | |
| P-34 | Manejo de error | Toda excepción produce un estado accionable, sin órdenes huérfanas | ⚠️ | | | |
| P-35 | Trazabilidad | Cada hito queda en log persistente y correlacionable por `incrementId` | ⚠️ D-20 | | | |
| P-36 | Devolución (`tipo="return"`) | `ProcesarDevolucionSAPAsync` verificado por separado (fuera del alcance de `SetPedido`) | 🔵 | | | |

### Sección C — Paridad campo a campo del pedido

Comparar, para un mismo payload, el registro creado en Intelisis contra el documento creado en SAP.

| Campo de negocio | LAN (parámetro SP) | SAP (campo del payload) | ¿Coincide? | Nota |
|---|---|---|---|---|
| Id ecommerce | `@IdMag` | `Zidecomm` / `Zorigenid` / `Zreferencia` | ☐ | |
| Cliente Magento | `@CteMag` | — | ☐ | |
| UEN / tienda | `@UEN` (1/2/3) | `SalesOrg` + `Plant` + `SalesOff` | ☐ | |
| Subtotal | `@Subtotal` | — | ☐ | D-08 |
| Total | `@Total` | — | ☐ | D-08 |
| Impuesto | `@Impuesto` | — | ☐ | D-08 |
| Descuento total | `@Descto` | — | ☐ | D-08 |
| Método de pago | `@tipopago` | `DistrChan` (01 / 02) | ☐ | |
| Costo de envío | `@costoenvio` | — | ☐ | D-07 |
| Nombre de envío | `@nombreenvio` | `to_partners` / dirección BP | ☐ | |
| Nombre cliente Mavi | `@NombreClienteMavi` | — | ☐ | |
| Dirección / num ext / num int | `@direnvio`, `@direnvionum`, `@direnvionumint` | `BPAddressCreate` (post-SAP) | ☐ | |
| CP / municipio / colonia / estado | `@DirCP`, `@DirMun`, `@Dircol`, `@DirEstado` | `BPAddressCreate` | ☐ | |
| Teléfono | `@Telefono` | `ToPhoneNumber` | ☐ | |
| Referencia de dirección | `@refenvio` | `AdditionalStreetSuffixName` | ☐ | |
| Correo | `@CorreoElectronico` | — | ☐ | |
| Método de envío | `@MetodoEnvio` | — | ☐ | |
| Pagos / cuotas | `@Pagos` | — | ☐ | D-08 |
| Agente | `@Agente` | `"Tadeo"` (literal) | ☐ | D-09 |
| Cuenta contado | `@ClienteContado` | `Zctefinal` / `to_partners[AG]` | ☐ | |
| Monedero a redimir | `@MonederoARedimir` | `Zredimepos` / `Zredimepuntos` | ☐ | |
| Origen / referencia | `@Referencia` | — | ☐ | D-10 |
| Condición de pago | vía `condicion` del artículo | `Pmnttrms` (`GetCondicionAsync`) | ☐ | |
| Partidas (SKU / cant / precio) | `SpVTASeCommerceDetPedidos` | `to_items` + `to_conditions` | ☐ | |

### Sección D — Criterios de cierre ("Definition of Done")

- [ ] Los 24 escenarios de la Sección A ejecutados en LAN y SAP con el mismo payload, con diff documentado.
- [ ] Ningún hallazgo 🔴 abierto (D-01, D-02, D-05, D-07, D-11, D-12, D-13).
- [ ] Los hallazgos 🟠 / 🟡 con decisión explícita: corregir, o aceptar con firma de negocio.
- [ ] Todo `TODO` / `PENDIENTE` / bloque comentado dentro del flujo de `SetOrderAsync` resuelto o convertido en ticket con fecha.
- [ ] Los índices de `sDatosPedido` documentados y validados contra el `enum Venta`, o el arreglo retirado en favor del objeto tipado.
- [ ] Prueba de duplicidad concurrente: dos POST simultáneos del mismo `incrementId` producen un solo documento.
- [ ] Prueba de resiliencia: SD36 / BP01 / ZAPI_SALESORDER caídos no generan órdenes huérfanas ni duplicadas.
- [ ] Logging persistente y correlacionable por `incrementId` en los hitos del flujo.
- [ ] Los campos que Magento envía y SAP no modela (`origen`, `codigo_promotor`, `OrigenIdMagento`, `OrigenIdSplit`) modelados o descartados formalmente.

### Sección E — Registro de decisiones

| # | Punto en duda | Decisión | Quién | Fecha |
|---|---|---|---|---|
| 1 | Openpay tarjetas: ¿quién reprocesa la orden tras el cargo (watcher en SAP, en DMZ o job externo)? | | | |
| 2 | Monedero y afectación: ¿existen APIs SAP equivalentes o se quedan en Intelisis? | | | |
| 3 | Crédito con saldo insuficiente: ¿abortar (SAP) o registrar la solicitud (LAN)? | | | |
| 4 | Stock insuficiente: ¿bloquear la orden (SAP) o permitirla (LAN)? | | | |
| 5 | Validación de precio: ¿la ProperList sustituye a `SP_eCommerceNuevoPed`? ¿Sigue vivo `CorreoErrorPrecio`? | | | |
| 6 | Retiro en sucursal: ¿la clave y el correo se generan en SAP, en el DMZ o en Magento? | | | |
| 7 | Totales: ¿SAP recalcula subtotal / impuesto / total, o Magento manda la verdad? | | | |
| 8 | Agente / vendedor: ¿qué campo SAP lo recibe? | | | |
| 9 | `Zliberado = "1234"` y `Name` / `Bname` = `"Tadeo"`: ¿son placeholders de desarrollo? | | | |
| 10 | `order/validateCredit` (LAN) → ¿mismo `order/new` o endpoint propio? | | | |

---

## 5. Preguntas abiertas

1. **Openpay tarjetas** — es la brecha más grande. ¿Se planeó un servicio aparte que llame a `order/new` cuando el cargo se confirma, o el `CheckStatus` debe portarse a ServicioSAP?
2. **Monedero y `spAfectar`** — ¿se quedan en Intelisis durante la convivencia, o hay APIs SAP definidas? Hoy son stubs que devuelven éxito, lo que puede dar falsos positivos en pruebas.
3. **Totales e impuestos** — ¿SAP es la fuente de verdad del importe, o hay que enviar los de Magento para validar contra ellos? De eso depende si D-07 / D-08 son defectos o diseño.
4. **`"Tadeo"` y `Zliberado = "1234"`** — ¿placeholders de desarrollo o valores acordados con el equipo ABAP?
5. **Alcance** — esta revisión está acotada a la creación de orden. ¿Extiendo el mismo formato a `cancelOrder` / `returnOrder` / `validateCredit`?
