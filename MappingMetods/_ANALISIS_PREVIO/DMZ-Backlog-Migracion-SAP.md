# APIMagentoDMZ — Backlog de migración a ServicioSAP
### Análisis por controlador y por método faltante

Proyectos analizados:
- `C:\Users\dsvalle\source\repos\APIMagentoDMZ\WebApiMagento` (rama actual: `dbAndroid`; también revisada rama `SAP-DMZ`)
- `C:\Users\dsvalle\source\repos\ServicioSAP\ServicioSap\ServicioSap` (rama `dbAndroid`)
- `C:\Users\dsvalle\source\repos\APIMagento\WebApiMagento` (LAN — referencia del análisis previo)

---

## 1. Arquitectura y flujo de datos

```
                    ┌───────────────────────────────────────────┐
                    │              MAGENTO (e-commerce)         │
                    └────────────┬──────────────────▲───────────┘
             (entrante: consume) │                  │ (saliente: recibe)
                                 ▼                  │
                    ┌───────────────────────────────┴───────────┐
                    │   APIMagentoDMZ  (https://…:7022/api/)     │
                    │   120 endpoints en 14 controladores        │
                    └──┬──────────────────────┬─────────────────┘
        Curl.Post/Get  │                      │  Curl.PostSAP
        URL_INTELISIS  │                      │  URL_SAP
                       ▼                      ▼
        ┌──────────────────────────┐   ┌──────────────────────────┐
        │  APIMagento (LAN)        │   │  ServicioSAP             │
        │  Intelisis / SQLite /    │   │  OData S/4 + CPI + SQL   │
        │  ServicioAndroid …       │   │  47 endpoints            │
        └──────────────────────────┘   └──────────────────────────┘
```

**Dos direcciones distintas en la DMZ, y es clave no confundirlas:**

| Dirección | Controladores | ¿Requiere migración a SAP? |
|---|---|---|
| **Entrante** — Magento llama a DMZ, DMZ resuelve contra LAN/SAP y **le devuelve la información a Magento** | `order`, `credit`, `customerService`, `customer`, `customer/wallet`, `company`, `mercancias`, `prospecto`, `recommender`, `status` | **SÍ** — es el objeto de este backlog |
| **Saliente** — LAN llama a DMZ y DMZ **empuja/lee datos en Magento** vía REST | `magento`, `product`, y 6 rutas de `order` | **NO** en la DMZ. Lo que debe migrar es el *productor* del lado LAN |

**Mecanismo de conmutación**: `Helper/Curl.cs` expone `Post()`/`Get()` (→ `URL_INTELISIS`) y `PostSAP()`/`GetSAP()`/`PatchSAP()` (→ `URL_SAP`). Migrar un endpoint = cambiar la llamada de `Post` a `PostSAP` y ajustar la ruta destino.

---

## 2. Estado actual: lo que YA conecta a ServicioSAP

### 2.1 Cableado en la DMZ (rama `SAP-DMZ`)

| # | Endpoint DMZ | Llamada SAP | Endpoint en ServicioSAP | Estado |
|---|---|---|---|---|
| 1 | `POST customer/setCustomer` | `PostSAP("partner/client")` | `POST partner/client` → `BusinessPartnerMethods.SubmitClientInfoAsync` | ✅ Migrado |
| 2 | `POST order/setOrder` | `PostSAP("order/new")` | `POST order/new` → `OrderMethods.SetOrder(order,"Insert")` | ✅ Migrado |
| 3 | `POST order/returnOrder` | `PostSAP("order/setreturn")` | `POST order/setreturn` → `BuilAdapterReturn` + `SetOrder(…,"return")` | ✅ Migrado |
| 4 | `POST customer/wallet/details` | `PostSAP("customer/wallet/details")` | `POST customer/wallet/details` → `WalletCustomerMethods.GetCustomerWalletAsync` | ✅ Migrado |

En la rama `SAP-DMZ` además se hizo: unificación del token (`Token = TokenSAP`), se comentó el login contra LAN, se agregaron `GetSAP`/`PatchSAP`, un `Logger.SAP()` dedicado, y se **eliminaron** de la DMZ los endpoints `credit/SolicitudMercancia`, `credit/guardardocumento` y `mercancias/ValidarTelefono`.

> ⚠️ **En la rama `dbAndroid` (actual), `order/setOrder` hace DOBLE ESCRITURA**: primero `Post("order/setOrder")` a LAN/Intelisis y luego `PostSAP("order/new")`, y **retorna la respuesta de LAN**, no la de SAP. La rama `SAP-DMZ` ya corrige esto (comenta el tramo LAN y retorna `responseSAP`). Hay que decidir con cuál rama se sigue.

### 2.2 Implementado en ServicioSAP pero SIN consumir desde la DMZ

Estos ya existen del lado SAP; solo falta cambiar el `Post` por `PostSAP` en la DMZ (y ajustar prefijo/verbo):

| # | Endpoint en ServicioSAP | Endpoint DMZ que debería consumirlo | Ajuste necesario |
|---|---|---|---|
| 1 | `POST credit/GetAccountDebts` → `AbonoMethods.GetDocumentosNoCompensadosAsync` (OData `ZAPI_EX01_NOCOMP_SRV`) | `POST customerService/GetAccountDebts` | Prefijo distinto (`credit` vs `customerService`) + mapear `DocNoCompResponse` al contrato que espera Magento |
| 2 | `POST credit/getClienteFactura/{cliente}/{factura}` → `AbonoMethods.GetParcialidadesAsync` (`ZAPI_TZ01_ZSPLIT_MERC`) | `GET credit/getClienteFactura/{cliente}/{factura}` | **Verbo distinto**: SAP expone POST, la DMZ llama GET |
| 3 | `POST credit/ApplyPaymentNeko` → `AbonoMethods.ApplyPaymentIntentNeko` | `POST customerService/ApplyPaymentNeko` | Prefijo distinto + el payload SAP usa `clientNumber/reference/debts` en minúscula |
| 4 | `POST credit/UpdateStatusPaymentNeko` → `AbonoMethods.UpdatePaymentStatusNekoAsync` | `POST customerService/UpdateStatusPaymentNeko` | Prefijo distinto |
| 5 | `GET partner/client/{clientId}` → `GetClientAsync` | `customerService/validarCliente`, `nombreCliente`, `credit/getCreditAccount`, `company/wholesale-customer/{acct}` | Requiere adaptadores de contrato |
| 6 | `GET partner/client/filter/{sapFilter}` → `GetFilterClientsAsync` | `prospecto/recuperarcuenta` | Construir filtro OData por nombre/RFC/fecha nac. |
| 7 | `PATCH partner/client` → `SubmitClientInfoAsync` | (sin consumidor) | Alta de endpoint DMZ para actualización de cliente |
| 8 | `GET order/validatecupon/{codigo}` → `OrderMethods.HandlePromoCode` | `POST credit/codigoPromocion` | SAP solo cubre "ValidarCupon"; falta Aplicar/Eliminar |
| 9 | `GET order/checkDocument/{purchNoC}` → `SalesMethods.CheckDocumentExistsSD36Async` | `POST order/GetIntelisisStatuses` (parcial) | Base para el estatus de pedido |
| 10 | `POST account/bonus` y `bonus/async` → `AccountMethods.GetBonus` | `POST credit/MonederoSaldoCredito` | Validar equivalencia bonificación vs saldo monedero |
| 11 | `partneraddress/*` (6 endpoints: GET/POST/PATCH direcciones, teléfono, dirección de documento de venta) | (sin consumidor) | Sustituye `DM0312DatosEntrega` de Intelisis |
| 12 | `POST sale/transaction`, `GET sale/{documentId}`, `GET sale/filter/{filters}` | `customerService/obtenerCreditos`, `order/GetIntelisisStatuses` | Base para consulta de documentos de venta |
| 13 | `GET product/*` (~25 endpoints), `GET ecommerce/listado`, `GET etiquetas`, `GET ma/imagenes/*` | (sin consumidor — el flujo de producto sigue en LAN) | El consumidor es `APIMagento/Metodos/ProductMethods.cs`, no la DMZ |

### 2.3 Métodos internos de ServicioSAP que ya cubren lógica de Intelisis

`Methods/Order/OrderMethods.cs` (2725 líneas) ya reimplementó, dentro del flujo de `order/new`:
`SaveToValidateOpenpay`, `SaveOpenpayStoresOrder`, `SaveGuide`, `ObtenerNumeroTablaSms`, `IsValidated`, `HasValidPhoneOriginSAP`, `ProcessCreditPayment`, `CheckClientCredit`, `CheckClientBalance`, `CrearSolicitudCredito`, `InsertCreditArticles`, `HandlePromoCode`, `LiberateClientCredit`, `CallMagentoAuthorizationCallback`, `CallSetCAccountCallback`, `GenerarMonederoSAP`, `DatosEntregaInsert`, `RegisterPickupClientInfo`, `ValidarPreciosConProperlist`, `ValidarStockArticulos`, `ValidarRegionCelulares`, `ValidarPedidoExistenteSAP`.

**Implicación**: buena parte de la lógica ya existe pero está *encapsulada dentro de `SetOrder`*, sin endpoint propio. Varios "faltantes" de la sección 3 son en realidad **exponer** un método existente, no escribirlo desde cero. Se marcan como ⚠️ *Parcial*.

---

## 3. BACKLOG — Faltantes por controlador

**Leyenda de estado**
- ❌ **FALTA** — no existe nada equivalente en ServicioSAP
- ⚠️ **PARCIAL** — la lógica existe en ServicioSAP pero sin endpoint, o cubre solo parte del caso
- 🔌 **SOLO CABLEAR** — ya existe en ServicioSAP; falta cambiar `Post` → `PostSAP` en la DMZ
- ✅ **LISTO** — ya migrado
- ⬜ **NO REQUIERE SAP** — el origen del dato no es Intelisis (ServicioAndroid, AdminDoc, SIGMAVI, SQLite, servicio externo, filesystem)
- 🔴 **ROTO** — el endpoint DMZ apunta a una ruta que no existe en LAN

---

### 3.1 `OrdersController` — prefijo `order` (20 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `POST ManagePaynetOrders` | Intelisis: `Venta` + SP de afectación | ❌ FALTA | Endpoint `POST order/paynet/manage`. Conciliar pagos Paynet contra el documento de ventas SAP y disparar la afectación |
| `POST InsertPaymentData` | Intelisis: inserción de pago | ❌ FALTA | Endpoint `POST order/payment`. Registrar el pago contra el documento SD |
| `POST GetIntelisisStatuses` | Intelisis: `Venta.Estatus` por lista de `incrementId` | ⚠️ PARCIAL | Existe `GET order/checkDocument/{purchNoC}` (1 documento). Falta versión **batch** que reciba `List<incrementId>` y devuelva estatus + factura |
| `POST getPosCancellations` | Intelisis: cancelaciones POS desde fecha | ❌ FALTA | Endpoint `POST order/cancellations` con filtro por fecha y límite. Lo consume el cron `Mavi_PosCancellationSync` de Magento |
| `POST setOrder` | — | ✅ LISTO | `order/new` — pendiente **quitar la doble escritura** de la rama `dbAndroid` |
| `POST getGuide` | SQLite `servicio_guias` | ⚠️ PARCIAL | `OrderMethods.SaveGuide` ya existe (privado, escritura). Falta el **endpoint de lectura** `GET order/guide/{idEcommerce}` |
| `POST GetPickUpCode` | Intelisis: `TrWDM0285_CteRecoge.ClaveVenta` | ❌ FALTA | Endpoints `GET order/pickupcode/{idEcommerce}` y `POST order/pickupcode` (generar/regenerar). `RegisterPickupClientInfo` ya existe pero solo escribe |
| `POST cancelOrder` | Intelisis: `cancelamagento` | ⚠️ PARCIAL | **El código existe pero está COMENTADO** en `OrderController.cs:131-175` (`CancelOrder` + `ReverseGoodsIssueAsync`). Descomentar, probar y cablear |
| `POST returnOrder` | — | ✅ LISTO | `order/setreturn` |
| `POST validateCredit` | LAN: `OrderMethods.SetPedido` con `CREDIT_METHOD` | ⚠️ PARCIAL | La lógica vive dentro de `SetOrder` (`ProcessCreditPayment` → `CrearSolicitudCredito` → `LiberateClientCredit`). Falta endpoint dedicado `POST order/credit/validate` |
| `POST updateCreditOrderId` | Intelisis: `UPDATE Venta SET IdEcommerce` | ❌ FALTA | Endpoint `PATCH order/credit/orderid`. Sustituir el `IdEcommerce` temporal (`CRED…`) por el `incrementId` real en el documento SD |
| `GET creditStatus/{idSolicitud}` | Intelisis: `Venta.Situacion = 'Liberado'` | ❌ FALTA | Endpoint `GET order/credit/status/{idSolicitud}`. Lo consulta el cron de Magento hasta que libere |
| `GET estimated-delivery/{ecommerceId}` | Intelisis: `INVDPaqueteriaGuia` + `EMBCConfiguracionPaqueteria` | ❌ FALTA | Endpoint `GET order/delivery/{ecommerceId}` → paquetería, guía, código de rastreo y URL de rastreo |
| `POST sendStorePickupEmail` | Magento REST | ⬜ NO REQUIERE | Salida a Magento |
| `POST setOrderStatus` | Magento REST | ⬜ NO REQUIERE | Salida a Magento |
| `GET getOrderInfo/{incrementId}` | Magento REST | ⬜ NO REQUIERE | Salida a Magento |
| `GET jsonOrders/{incrementId}` | Magento REST | ⬜ NO REQUIERE | Salida a Magento |
| `POST setCAccount` | Magento REST | ⬜ NO REQUIERE | SAP ya lo invoca vía `CallSetCAccountCallback` |
| `POST authorizationResult` | Magento REST | ⬜ NO REQUIERE | SAP ya lo invoca vía `CallMagentoAuthorizationCallback` |
| `GET getprueba` | Local | ⬜ NO REQUIERE | Health-check |

**Falta además** (endpoints que existen en LAN y **no** están expuestos en la DMZ; los invocan crones/tareas y deben tener destino SAP): `order/createStorepickupCode`, `order/generateNewStorepickupCode`, `order/getOrderId`, `order/getOrderInfoAndSet`, `order/checkOpenpay`.

---

### 3.2 `CreditController` — prefijo `credit` (30 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `GET getClienteSaldo/{cliente}` | Intelisis: `FacturaMethods.getClienteSaldo` | ❌ FALTA | Endpoint `GET credit/balance/{bp}` → saldo actual + facturas pendientes. Complementa `GetAccountDebts` |
| `GET getClienteFactura/{c}/{f}` | Intelisis: `FacturaMethods.getClienteFacturas` | 🔌 SOLO CABLEAR | Existe `POST credit/getClienteFactura/{cliente}/{factura}` — **corregir verbo** (SAP=POST, DMZ llama GET) |
| `POST getSms` | ServicioAndroid + Intelisis (`VTASCodigoSMSEcommerce`) | ⚠️ PARCIAL | `CreditMethods.SendSmsNewNumber` e `IsValidated` ya existen. Falta **controller** `POST credit/sms/send` y la parte Intelisis (`UpdateMagentoId`, `IsFirstPurchase`, `IsInTableStd`) |
| `POST validateSms` | ServicioAndroid puro | ⬜ NO REQUIERE | Se queda en LAN/Android |
| `POST codigoPromocion` | Intelisis: `CodigoPromocion` | ⚠️ PARCIAL | `HandlePromoCode` + `GET order/validatecupon/{codigo}` cubren solo *ValidarCupon*. Faltan operaciones **Aplica** y **Elimina** y exponerlas bajo `credit/` |
| `POST CreditoWeb_FormDatos` | SQLite + Intelisis (fallback) | ❌ FALTA | Endpoint `GET credit/catalogos/{tipo}` para: antigüedad domiciliaria, estados MA/VIU, municipios, atención a clientes, bonificación |
| `POST CreditoWeb_SaveFirstData` | ServicioAndroid | ⬜ NO REQUIERE | Se queda en LAN/Android |
| `POST CreditoWeb_SaveData_Articulos` | ServicioAndroid + Intelisis | ⚠️ PARCIAL | `InsertCreditArticles` ya existe (privado). Falta exponerlo |
| `POST CreditoWeb_SaveData` | ServicioAndroid + `cte_prospecto` (Intelisis) | ⚠️ PARCIAL | Solo falta el consecutivo de cliente (`SP_GeneraConsecutivoCteMavi`) → lo sustituye la creación de BP en `POST partner/client` |
| `POST codigoRecomendado` | Intelisis | ❌ FALTA | Endpoint `POST credit/recommender/validate` |
| `POST codigoRecomendadoWithUen` | Intelisis | ❌ FALTA | Variante con UEN del anterior |
| `POST SaveImagesProductosMx` | Filesystem + AdminDoc | ⬜ NO REQUIERE | Se queda en LAN |
| `POST MonederoSaldoCredito` | Intelisis: `MonederoSaldoCredito` | ⚠️ PARCIAL | `customer/wallet/details` devuelve saldo y `account/bonus` la bonificación — **validar equivalencia de contrato** antes de cablear |
| `POST GetUnificationWalletStatus` | Intelisis | ❌ FALTA | Endpoint `GET credit/wallet/unification/{bp}` → `COMPLETADO`/`RECHAZADO`/`DESCONOCIDO` |
| `POST CheckAccountsPreUnification` | Intelisis (`AccountType`, `ClienteTieneSerieMonedero`) | ⚠️ PARCIAL | `BusinessPartnerMethods.EnableBpCombinationAsync` es la base. Falta endpoint y la validación previa de ambas cuentas |
| `POST SetUnificationWalletData` | Intelisis (tabla temporal) | ⚠️ PARCIAL | Igual que el anterior: exponer `EnableBpCombinationAsync` |
| `POST SaveHaztenTransaction` | SIGMAVI + ServicioAndroid + Intelisis | ⚠️ PARCIAL | Solo `SaveCoordsInNewTable` (INSERT en `RM0855ACoordenadasProspecto`) toca Intelisis. Falta ese tramo; el resto (SIGMAVI/Android) no requiere SAP |
| `GET getCreditAccount/{pAccount}` | Intelisis | ⚠️ PARCIAL | `GET partner/client/{clientId}` es la base. Falta el mapeo `CreditAccount` |
| `POST GetPhoneValidatedClientSecretName` | Intelisis: `Cte` + `CteTel` | ⚠️ PARCIAL | `CreditMethods.IsValidated` existe. Faltan `NombreCliente`, `IsPhoneValidatedSecretPhone`, `HideNames`, `HidePhoneNumber` y el endpoint |
| `POST SendSmsNewNumber` | ServicioAndroid | 🔌 SOLO CABLEAR | `CreditMethods.SendSmsNewNumber` ya está en ServicioSAP — falta **controller** que lo exponga |
| `POST SolicitudMercancia` | ServicioAndroid | ⬜ NO REQUIERE | Eliminado en rama `SAP-DMZ` |
| `POST CreditoWeb_Informacion` | SQLite + Intelisis | ❌ FALTA | Endpoint de catálogos: bines bancarios, instituciones, leyenda Dimas, artículos y condiciones de crédito |
| `POST GetCreditAmounts` | SQLite `mavi_credilana_info` | ⚠️ PARCIAL | El endpoint lee SQLite, pero el **alimentador** (`LoadCredilanaInfo` → `FnVTASListaCredilanas` en Intelisis) sí requiere SAP |
| `POST CreditoWeb_Solicitud` | Intelisis | ❌ FALTA | Endpoint de alta de solicitud de crédito web |
| `POST CreditoWeb_SolicitudPrimerGuardado` | Intelisis | ❌ FALTA | Variante de primer guardado del anterior |
| `POST CreditoWeb_Seguro` | Intelisis: `SpCREDICredilanaSeguroDeVida` | ❌ FALTA | Endpoint de seguro de vida Credilana (SetClabe, Solicitud, beneficiarios) |
| `POST Validar_Lada` | Intelisis | ❌ FALTA | Endpoint `GET credit/lada/{lada}` |
| `POST ExistRFCAndPhoneCte` | **Neutralizado en LAN** | ⚠️ DECIDIR | En LAN el método tiene un `return` incondicional en la 1ª línea: hoy **no valida nada**. Definir si se reimplementa en SAP o se elimina |
| `GET getPlazos` | Intelisis: `GetDelayedDays` | ❌ FALTA | Endpoint `GET credit/plazos` → días diferidos por condición de pago |
| `POST guardardocumento` | AdminDoc (`MAVI_DOC_CTE`) | ⬜ NO REQUIERE | Eliminado en rama `SAP-DMZ` |

---

### 3.3 `CustomerServiceController` — prefijo `customerService` (26 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `POST obtenerTipoGarantia` | Intelisis | ❌ FALTA | Endpoint `GET customerservice/garantia/{tipo}` |
| `POST obtenerVentanaConfirmacion` | Intelisis | ❌ FALTA | Endpoint de ventana de confirmación de garantía |
| `POST unirCuenta` | Intelisis | ⚠️ PARCIAL | `EnableBpCombinationAsync` es la base — falta endpoint y la lógica de unificación |
| `POST validarCliente` | Intelisis: `Cte` | ⚠️ PARCIAL | Usar `GET partner/client/{clientId}` + adaptador de contrato |
| `POST nombreCliente` | Intelisis: `Cte` | ⚠️ PARCIAL | Igual que el anterior, con enmascarado (`ocultarLetrasNombres`, `OcultarTelefono` — lógica pura, portable tal cual) |
| `POST bitacoraAtencionClientes` | ServicioAndroid: `SP_ACTES_REGISTRO` | ⬜ NO REQUIERE | Se queda en LAN/Android |
| `POST obtenerCreditos` | Intelisis: `Venta`+`VentaD`+`Cte`+`Art` (query de 60 líneas) | ❌ FALTA | Endpoint `GET customerservice/creditos/{bp}`. `GET sale/filter/{filters}` es la base pero falta todo el armado de estatus (solicitud→análisis→pedido→factura) y puntos redimidos |
| `POST obtenerQuejas` | ServicioAndroid | ⬜ NO REQUIERE | Se queda en LAN/Android |
| `POST GetAccountDebts` | Intelisis: `SPCXCCobrosClientesBBVA` | 🔌 SOLO CABLEAR | `POST credit/GetAccountDebts` ya existe — ajustar prefijo y mapear respuesta |
| `POST ApplyPaymentNeko` | Intelisis: `CXCCFacturaMultipagoBBVA` | 🔌 SOLO CABLEAR | `POST credit/ApplyPaymentNeko` ya existe |
| `POST ApplyPaymentAdvanced` | Intelisis: `CXCCFacturaMultipagoBBVA` (con `Origen`) | ❌ FALTA | Solo existe la variante *Neko*. Falta la variante **Advanced** (referencia única + campo `Origen='BBVA'`) |
| `POST UpdateStatusPaymentNeko` | Intelisis | 🔌 SOLO CABLEAR | `POST credit/UpdateStatusPaymentNeko` ya existe |
| `POST UpdateStatusPaymentAdvanced` | Intelisis (con `FechaRastreoSTP`) | ❌ FALTA | Falta la variante Advanced |
| `POST LoginClienteCredito` | Intelisis: `Cte` | ⚠️ PARCIAL | Base: `GET partner/client/{clientId}` |
| `POST LoginClienteCreditoFechaN` | Intelisis: `Cte` + fecha nacimiento | ⚠️ PARCIAL | Base: `GET partner/client/filter/{sapFilter}` |
| `POST GetSTPAccount` | Intelisis | ❌ FALTA | Endpoint de cuenta CLABE STP del cliente |
| `POST GetSalesChannelsSTP` | Intelisis | ❌ FALTA | Canales de venta habilitados para STP |
| `GET ValidateSTPAccount` | Intelisis | ❌ FALTA | Validación de cuenta STP |
| `POST bbvaKeyNeko` | Intelisis: `master.dbo.dbacseguridad` | ❌ FALTA | Llave de seguridad BBVA. **Revisar**: hoy lee la tabla `master` del servidor Intelisis |
| `POST bbvaKeyAdvanced` | SOAP externo `WSeCommerceMX` | ⬜ NO REQUIERE | Servicio externo, no Intelisis |
| `POST validarCoberturaPorCP` | Intelisis: `CodigoPostal` + `MaviRutaSupervision` | ❌ FALTA | Endpoint `GET customerservice/cobertura` con 4 operaciones: `states`, `delegations`, `table`, `coverage` |
| `POST ObtenerEstatusEmbarque` | Intelisis | ❌ FALTA | Endpoint de estatus de embarque |
| `POST GetEmpleadoByNomina` | Intelisis | ❌ FALTA | Endpoint `GET customerservice/empleado/{nomina}` |
| `POST ActualizarCamposConfigurables` | — | 🔴 ROTO | **No existe destino en LAN.** Decidir: implementar en SAP o eliminar |
| `POST InsertarDesdeTablerateNativo` | — | 🔴 ROTO | **No existe destino en LAN.** Ídem |
| `POST InsertarDesdeTablerateCustom` | — | 🔴 ROTO | **No existe destino en LAN.** Ídem |

---

### 3.4 `CustomersController` — prefijo `customer` (5 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `POST setCustomer` | — | ✅ LISTO | `POST partner/client` |
| `POST setCustomerList` | Intelisis: `SpVTASListaNBMagento` | ❌ FALTA | Endpoint `POST partner/list` — alta en lista blanca/negra (antifraude Emailage) |
| `GET getCustomerList` | Intelisis: `SpVTASListaNBMagento` | ❌ FALTA | Consulta de lista blanca/negra por email |
| `POST deleteCustomerList` | Intelisis: `SpVTASListaNBMagento` | ❌ FALTA | Baja de lista |
| `POST cashCustomerReport` | Filesystem + share SMB | ⬜ NO REQUIERE | Se queda en LAN |

---

### 3.5 `WalletCustomerController` — prefijo `customer/wallet` (3 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `POST details` | — | ✅ LISTO | `POST customer/wallet/details` |
| `GET getCuentaC/{ordenCompra}` | Intelisis | ❌ FALTA + 🔴 ROTO | Endpoint `GET customer/wallet/bp/{incrementId}`. **Además está roto hoy**: la DMZ llama `GET customer/getCuentaC/…` pero LAN expone `POST customer/wallet/getCuentaC/…` (prefijo y verbo no coinciden) |
| `POST getMinimumCostToRedeem` | Intelisis (por canal y familia) | ❌ FALTA | Endpoint `POST customer/wallet/minimum-redeem` |

---

### 3.6 `WholesaleCustomerController` — prefijo `company` (2 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `GET wholesale-customer/{acct}` | Intelisis: `Cte` mayorista | ⚠️ PARCIAL | Base: `GET partner/client/{clientId}` + filtrar por rol/grupo de cuenta mayorista |
| `POST negotiable-quote/create` | Intelisis: `Venta` + `VentaD` (cotización) | ⚠️ PARCIAL | Base: `POST order/new` con tipo *cotización*. Falta el tipo de documento SD para negotiable quote y el hardcode de agente/canal/almacén/sucursal |

---

### 3.7 `MercanciaController` — prefijo `mercancias` (5 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `POST getAbonos` | Intelisis: `MercanciaQueries.AbonadoSolicitud` + `DescripcionesFacturas` | ⚠️ PARCIAL | Los servicios OData `ZAPI_EX01_NOCOMP_SRV` y `ZAPI_TZ01_ZSPLIT_MERC` ya están integrados en `AbonoMethods`. Falta endpoint `POST mercancias/abonos` con el contrato de la App |
| `POST getProximosPagos` | Intelisis: `MercanciaQueries.ProximosPagos` | ❌ FALTA | Endpoint `POST mercancias/proximospagos` |
| `POST getSaldoVencido` | Intelisis: `MercanciaQueries.SaldoVencido` | ⚠️ PARCIAL | `GetDocumentosNoCompensadosAsync` es la base. Falta separar vencido vs por vencer (parámetro `opcion`) |
| `POST getLimiteMercancia` | **Sin query** — `// TODO: Query pendiente de ERP` | ❌ DEFINIR | Nunca se implementó en Intelisis: hoy devuelve lista vacía. Definir la regla de negocio y construirla directo en SAP |
| `POST ValidarTelefono` | Intelisis: `SpCREDIValidarTelefono` | ❌ FALTA | Endpoint `POST mercancias/validartelefono`. Eliminado de la rama `SAP-DMZ` — confirmar si se retoma |

---

### 3.8 `ProspectoController` — prefijo `prospecto` (2 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `POST rfc` | Intelisis: SP `spRegistroSugerir` | ❌ FALTA | Endpoint `POST prospecto/rfc`. Alternativa: portar el algoritmo de generación de RFC a C# (no requiere ERP) |
| `POST recuperarcuenta` | Intelisis: `Cte` por nombre+RFC+fecha nac. | ⚠️ PARCIAL | Base: `GET partner/client/filter/{sapFilter}` con filtro OData. Falta el enmascarado del nombre (`EncriptarNombre`, lógica pura) |

---

### 3.9 `RecommenderController` — prefijo `recommender` (3 endpoints)

| Endpoint DMZ | Origen del dato en LAN | Estado | Qué falta implementar en ServicioSAP |
|---|---|---|---|
| `POST setRecommenderList` | Intelisis: `RecommenderMethods.CodigoRecomendador` | ❌ FALTA | Endpoint `POST recommender/list` |
| `POST getRecommender` | Intelisis: `RecommenderMethods.GetRecommender` | ❌ FALTA | Endpoint `GET recommender/{bp}` |
| `POST setCodes` | Intelisis: `TraerCodigosRecomendadoscliente` | ❌ FALTA | Endpoint `POST recommender/codes` |

> Módulo completo sin ninguna cobertura en ServicioSAP.

---

### 3.10 `StatusController` — prefijo `status` (1 endpoint)

| Endpoint DMZ | Origen | Estado | Qué falta |
|---|---|---|---|
| `POST getStatus` | LAN → ping ICMP a `172.16.202.2` | ❌ FALTA | Health-check contra ServicioSAP/OData S4. Hoy solo verifica la LAN de Intelisis |

---

### 3.11 Controladores de salida (no requieren migración en DMZ)

| Controlador | Endpoints | Nota |
|---|---|---|
| `MagentoController` (`magento`) | 13 — `attributes`, `general/attributes`, `attributeSets`, `attributeSetChildren/{id}`, `categories`, `children/{page}/{size}/{store}`, `noImagenProduct/{store}`, `productWithWebsites/{page}/{size}`, `getOrderId/{incrementId}`, `deletePromociones`, `deleteReservations`, `getCuenta`, `setCuenta` | LAN → DMZ → Magento REST. ⬜ |
| `ProductsController` (`product`) | 8 — `updateProduct/{store}`, `updateConfigurableProduct/{store}`, `updateConfigurableProductLink/{sku}`, `updateStock`, `getStockByStore`, `updatePrice`, `uploadImage`, `uploadImagesToMagento` | LAN → DMZ → Magento REST. ⬜ |
| `LoginController` (`login`) | 1 | JWT local. Equivale a `POST login/auth` de ServicioSAP ⬜ |
| `LoggingController` (`logging`) | 1 | Log centralizado en `monitor.log` ⬜ |

> **Pero ojo**: el *productor* de esos flujos es `APIMagento/Metodos/ProductMethods.cs` (3025 líneas) y `TagsMethods`/`WarrantyMethods`/`ProductImage`, que sí leen de Intelisis. ServicioSAP **ya tiene listo** el lado de lectura (`product/*`, `ecommerce/listado`, `etiquetas`, `ma/imagenes/*` — unos 30 endpoints). Falta reescribir el consumidor en LAN, no en la DMZ.

---

## 4. Resumen cuantitativo

| Categoría | Endpoints |
|---|---|
| **Total de endpoints en la DMZ** | **120** |
| ✅ Ya migrados a SAP | 4 |
| 🔌 Solo cablear (ya existe en ServicioSAP) | 5 |
| ⚠️ Parcial (lógica existe, falta exponer o completar) | 19 |
| ❌ Faltantes completos | 43 |
| ⬜ No requieren SAP (origen no es Intelisis) | 15 |
| ⬜ Salida a Magento (no aplica en DMZ) | 30 |
| 🔴 Rotos / a decidir | 4 |

**Endpoints en ServicioSAP hoy**: 47 en 12 controladores (`login`, `order`, `partner`, `partneraddress`, `customer/wallet`, `credit`, `account`, `sale`, `product`, `ecommerce`, `etiquetas`, `ma/imagenes`).
De esos, **solo 4 están siendo consumidos por la DMZ**.

---

## 5. Priorización sugerida

### Ola 0 — Sin desarrollo nuevo (días)
Ya existe todo del lado SAP; solo cambiar `Post` → `PostSAP` y ajustar prefijo/verbo:
1. `customerService/GetAccountDebts` → `credit/GetAccountDebts`
2. `customerService/ApplyPaymentNeko` → `credit/ApplyPaymentNeko`
3. `customerService/UpdateStatusPaymentNeko` → `credit/UpdateStatusPaymentNeko`
4. `credit/getClienteFactura/{c}/{f}` → mismo nombre, corregir verbo a POST
5. Exponer `CreditMethods.SendSmsNewNumber` en un controller y cablear `credit/SendSmsNewNumber`

### Ola 1 — Bloqueantes del flujo de venta
6. Descomentar y probar `order/cancelOrder` + `order/cancelInvoice` en ServicioSAP
7. `order/GetIntelisisStatuses` (batch) sobre `CheckDocumentExistsSD36Async`
8. `order/getPosCancellations`
9. `order/estimated-delivery`
10. `order/GetPickUpCode` + `createStorepickupCode` + `generateNewStorepickupCode`
11. `order/getGuide` (lectura)
12. Quitar la doble escritura de `order/setOrder` en `dbAndroid` (o migrar a la rama `SAP-DMZ`)

### Ola 2 — Pagos y monedero
13. `ApplyPaymentAdvanced` + `UpdateStatusPaymentAdvanced`
14. `credit/getClienteSaldo`
15. `customer/wallet/getCuentaC` (+ corregir la ruta rota) y `getMinimumCostToRedeem`
16. Validar equivalencia `MonederoSaldoCredito` ↔ `account/bonus` / `wallet/details`
17. Unificación de monedero (3 endpoints) sobre `EnableBpCombinationAsync`
18. `GetSTPAccount`, `GetSalesChannelsSTP`, `ValidateSTPAccount`, `bbvaKeyNeko`

### Ola 3 — Crédito web / Credilana
19. `CreditoWeb_Solicitud`, `CreditoWeb_SolicitudPrimerGuardado`, `CreditoWeb_Seguro`
20. Catálogos: `CreditoWeb_FormDatos`, `CreditoWeb_Informacion`, `getPlazos`, `Validar_Lada`
21. Alimentador de `mavi_credilana_info` (`FnVTASListaCredilanas`)
22. `GetPhoneValidatedClientSecretName`, `getSms`
23. `codigoPromocion` (operaciones Aplica/Elimina)

### Ola 4 — Atención a clientes, mercancías y complementarios
24. `obtenerCreditos`, `validarCoberturaPorCP`, `ObtenerEstatusEmbarque`, `GetEmpleadoByNomina`
25. `obtenerTipoGarantia`, `obtenerVentanaConfirmacion`, `unirCuenta`
26. Módulo `mercancias` completo (5 endpoints)
27. Módulo `recommender` completo (3 endpoints)
28. Listas blanca/negra de clientes (3 endpoints)
29. `prospecto/rfc`, `prospecto/recuperarcuenta`
30. `company/wholesale-customer`, `company/negotiable-quote/create`
31. `status/getStatus` apuntando a SAP

### Decisiones pendientes (no son desarrollo)
- Los 3 endpoints de **tablerate** no tienen destino en LAN: ¿se implementan o se eliminan?
- `ExistRFCAndPhoneCte` está **neutralizado** en LAN (validación muerta): ¿se reimplementa en SAP o se elimina?
- `mercancias/getLimiteMercancia` nunca tuvo query: definir la regla de negocio.
- `mercancias/ValidarTelefono`, `credit/SolicitudMercancia` y `credit/guardardocumento` fueron **eliminados** en la rama `SAP-DMZ`: confirmar si es definitivo.

---

## 6. Riesgos técnicos detectados

1. **Doble escritura en `order/setOrder`** (rama `dbAndroid`): cada pedido se crea en Intelisis **y** en SAP, y a Magento se le devuelve la cuenta de Intelisis. Riesgo de divergencia de datos mientras dure la convivencia.
2. **Dos ramas divergentes** (`dbAndroid` vs `SAP-DMZ`) tocando los mismos archivos. `SAP-DMZ` elimina endpoints que `dbAndroid` agregó (`ValidarTelefono`, `SolicitudMercancia`, `guardardocumento`, `validateCredit`). Hay que resolver el merge antes de seguir migrando.
3. **`Curl` autentica contra LAN y SAP en cada construcción** (`new Curl()`), y varios controladores instancian uno por request. En la rama `dbAndroid` el constructor hace `throw` si falla el login SAP → **si SAP se cae, se caen también todos los endpoints que solo usan LAN**.
4. **Prefijos incoherentes**: la DMZ agrupa abonos en `customerService/`, ServicioSAP los expone en `credit/`. Definir la convención antes de cablear masivamente para no propagar el desorden.
5. **Rutas rotas ya en producción**: `customer/wallet/getCuentaC` (prefijo y verbo distintos) y los 3 endpoints de tablerate (sin destino). Conviene corregirlos o retirarlos en el mismo esfuerzo.
6. **Credenciales en texto plano** replicadas en los tres `Web.config` (`USER_SAP`, `S4_PASS`, `SAP_OAUTH_CLIENT_SECRET`, password del Liberador).
