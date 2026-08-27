---
tags: [mapeo-lan, nuestros, no-sap, sigmavi, devmavi]
proyecto: APIMagento
actualizado: 2026-08-03
fuentes: [endpoints_1(_GLOBAL_MASTER_DB).ods, MIGRATION_STATUS_MASTER_v2.csv]
---

# Nuestros endpoints — todo lo que NO va a SAP

Alcance del equipo: endpoints cuyo destino de datos **no es SAP**. Incluye lo que se queda en ServicioAndroid, AdminDoc, SQLite, servicios externos, Magento, y — lo más importante — **las tablas que hoy están en Intelisis y migrarán a SIGMAVI (DEVMAVI)**.

**Fuente de verdad:** `endpoints_1(_GLOBAL_MASTER_DB).ods` para el destino de cada tabla, y `MIGRATION_STATUS_MASTER_v2.csv` para el `Data Origin` y el estatus.

Listado completo: [[_ENDPOINTS_NoSAP.csv]]

---

## Resumen

| Categoría | Endpoints |
|---|---|
| ✅ **Nuestros** — 0% SAP | **61** |
| 🟡 **Mixtos** — parte SAP, parte nuestra | **32** |
| ⛔ Out of scope / Deprecated | **14** |
| **Total no-SAP** | **107** |

### Nuestros por destino

| Destino | Endpoints | Nota |
|---|---|---|
| **MAGENTO** | 29 | Salida hacia Magento REST vía DMZ |
| **ANDROID** | 14 | `mavicbosandroid` / `ServicioAndroid` |
| **EXTERNO** | 6 | BBVA · STP · Hazten · SuccessFactors |
| **OTRO / local** | 6 | Filesystem, SMB, JWT local |
| **SIGMAVI** | 3 | ⚠️ Tablas que salen de Intelisis hacia DEVMAVI |
| **SQLITE** | 2 | `data.db` local |
| **SIN DEFINIR** | 1 | `order/getprueba` |

---

## 🔴 Lo que cambia respecto a mi clasificación anterior

El `.ods` reveló que **varias tablas que yo había marcado como 100% Intelisis en realidad migran a SIGMAVI (DEVMAVI), no a SAP**. Eso las vuelve responsabilidad nuestra.

| Endpoint | Tabla en Intelisis | Destino real | Mi clasificación previa | Correcta |
|---|---|---|---|---|
| `customerService/obtenerTipoGarantia` | `VTASCProveedorActivoGarantia` | **SIGMAVI** — DM0415 Configuración Garantías *(Valentin/Humberto)* | 🔒 Fuera de alcance | ✅ **Nuestro** |
| `credit/getPlazos` | `VTASCCondicionesCredVtaLinea` | **SIGMAVI** (`CondicionesCredVtaLinea`) | 🔒 Fuera de alcance | 🟡 **Mixto** — el resto va a SD40 |
| `credit/codigoPromocion` | `VTASCVentaCupon` | **SIGMAVI** (`VentaCupon`) | 🔒 Fuera de alcance | 🟡 **Mixto** |
| `customer/setCustomerList` | `VTASCListaNegra`, `VTASCListaBlanca` | **SIGMAVI** (`ListaNegra`, `ListaBlanca`) | 🔒 Fuera de alcance | 🟡 **Mixto** |
| `customer/getCustomerList` | `VTASCListaNegra`, `VTASCListaBlanca` | **SIGMAVI** (`ListaNegra`, `ListaBlanca`) | 🔒 Fuera de alcance | ✅ **Nuestro** |
| `customer/deleteCustomerList` | `VTASCListaBlanca` | **SIGMAVI** (`ListaBlanca`) | 🔒 Fuera de alcance | ✅ **Nuestro** |

> **Los tres endpoints de listas blanca/negra son un bloque.** Comparten el mismo método (`CustomerMethods.blackwhitelist`) y el mismo SP (`SpVTASListaNBMagento` → `SpListaNBMagento` en SIGMAVI). Si las tablas van a SIGMAVI, los tres se migran juntos.

---

## Las tablas que se van a SIGMAVI / DEVMAVI

> Actualizado con la versión nueva de `endpoints 1.xlsx` (lectura por color). Detalle completo: [[_DECISIONES_ODS]]

| Tabla en Intelisis | Destino en SIGMAVI | Endpoints que la usan | Estado |
|---|---|---|---|
| `VTASCProveedorActivoGarantia` | **SIGMAVI** — la llena PCP | `customerService/obtenerTipoGarantia` | ✅ Confirmado · ⏳ estructura pendiente (**Miguel Marín**) |
| `VTASCCondicionesCredVtaLinea` | `CondicionesCredVtaLinea` | `credit/getPlazos` | ✅ Confirmado |
| `VTASCVentaCupon` | `VentaCupon` | `credit/codigoPromocion` | ✅ Confirmado |
| `VTASCListaNegra` | **SIGMAVI** (`ListaNegra`) — control de ecommerce | `customer/getCustomerList` · `setCustomerList` | ✅ **Resuelto** |
| `VTASCListaBlanca` | **SIGMAVI** (`ListaBlanca`) — control de ecommerce | los 3 endpoints de listas | ✅ **Resuelto** |
| `CREDIHUnificacionMonedero` | *(sin definir)* | `credit/GetUnificationWalletStatus` · `SetUnificationWalletData` | 🟢 ⚠️ **«no está migrado la unificación de monedero»** |
| `TarjetaSerieMovMAVI` | **se descarta** | `customerService/obtenerCreditos` | 🔴 «no existe y no se usará» |

### Cambios de alcance por el xlsx actualizado

| Endpoint | Antes | Ahora |
|---|---|---|
| `customerService/obtenerTipoGarantia` | 🔒 Fuera de alcance | ✅ **Nuestro** — tabla nueva en SIGMAVI, alimentada por PCP |
| `customer/setCustomerList` · `getCustomerList` · `deleteCustomerList` | 🔒 Fuera de alcance | ✅ **Nuestros** — quedan en SIGMAVI, control de ecommerce |
| `credit/GetUnificationWalletStatus` · `SetUnificationWalletData` | 🔒 Fuera de alcance | ⚠️ **Pendiente crítico** — proceso no migrado, sin destino |
| `customerService/bbvaKeyNeko` | 🔒 Fuera de alcance | ⛔ **Se elimina** — «no debe estar en uso» |
| `credit/getCreditAccount/{pAccount}` | 🔒 Fuera de alcance | 🔒 Sigue fuera — se resuelve con `ZSDT_CTE.ZtipoCliente = PROSPECTO` |
---

## Nuestros por controlador

### CreditController

| Endpoint | Verbo | Data Origin | Estatus |
|---|---|---|---|
| `credit/getSms` | POST | ANDROID (`TcAAEA00030_EnvioMensajes`) | Planed Dev 1 |
| `credit/SendSmsNewNumber` | POST | ANDROID | Planed Dev 1 |
| `credit/SolicitudMercancia` | POST | ANDROID | Planed Dev 1 |
| `credit/GetPhoneValidatedClientSecretName` | POST | ANDROID | Planed Dev 1 |
| `credit/GetCreditAmounts` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_FormDatos` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_Informacion` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_SaveFirstData` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_SaveData` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_SaveData_Articulos` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_Solicitud` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_SolicitudPrimerGuardado` | POST | ANDROID | Planed Dev 1 |
| `credit/CreditoWeb_Seguro` | POST | ANDROID | Planed Dev 1 |
| `credit/guardardocumento` | POST | EXT (Hazten document store) | Planed Dev 1 |
| `credit/SaveImagesProductosMx` | POST | EXT | Planed Dev 1 |
| `credit/codigoPromocion` | POST | EXT (SuccessFactors / **Sigmavi**) | Not Migrated |
| `credit/getPlazos` 🟡 | GET | SAP (SD40) + **SIGMAVI** | To Plan |
| `credit/validateSms` 🟡 | POST | SAP (BP05) + ANDROID | In Progress |
| `credit/Validar_Lada` ⛔ | POST | ANDROID | Deprecated |
| `credit/SaveHaztenTransaction` ⛔ | POST | EXT (Hazten) | Out of scope |

### CustomerServiceController

| Endpoint | Verbo | Data Origin | Estatus |
|---|---|---|---|
| `customerService/obtenerQuejas` | POST | ANDROID | Planed Dev 1 |
| `customerService/bitacoraAtencionClientes` | POST | ANDROID (**Sigmavi**) | Planed Dev 1 |
| `customerService/obtenerTipoGarantia` | POST | **SIGMAVI** | Not Migrated |
| `customerService/bbvaKeyAdvanced` | POST | EXT (BBVA) | Planed Dev 1 |
| `customerService/GetSTPAccount` | POST | EXT (STP) | Not Migrated |
| `customerService/GetSalesChannelsSTP` | POST | EXT (STP) | Not Migrated |
| `customerService/ValidateSTPAccount` | GET | EXT (STP) | To Plan |
| `customerService/ActualizarCamposConfigurables` | POST | Unknown | Planed Dev 1 |
| `customerService/InsertarDesdeTablerateNativo` | POST | Unknown | Planed Dev 1 |
| `customerService/InsertarDesdeTablerateCustom` | POST | Unknown | Planed Dev 1 |
| `customerService/bbvaKeyNeko` ⛔ | GET | EXT (BBVA) | Deprecated |

> ⚠️ Los 3 de tablerate siguen sin destino en la LAN — la DMZ los llama pero la ruta no existe en APIMagento.

### CustomersController

| Endpoint | Verbo | Data Origin | Estatus |
|---|---|---|---|
| `customer/getCustomerList` | POST | **SIGMAVI** + SAP | Not Migrated |
| `customer/deleteCustomerList` | POST | **SIGMAVI** *(según ODS)* | Not Migrated |
| `customer/cashCustomerReport` | POST | OTRO (Filesystem + SMB) | Planed Dev 1 |
| `customer/getCuenta` | POST | MAGENTO | Planed Dev 1 |
| `customer/setCuenta` | POST | MAGENTO | Planed Dev 1 |
| `customer/setCustomerList` 🟡 | POST | **SIGMAVI** + SAP | Not Migrated |

### OrdersController

| Endpoint | Verbo | Data Origin | Estatus |
|---|---|---|---|
| `order/getGuide` | POST | SQLITE | Planed Dev 1 |
| `order/InsertPaymentData` | POST | SQLITE (`CXCCMensajeWebHookOpenPay`) | Planed Dev 1 |
| `order/setOrderStatus` | POST | MAGENTO | Planed Dev 1 |
| `order/authorizationResult` | POST | MAGENTO | Planed Dev 1 |
| `order/getOrderInfo/{incrementId}` | GET | MAGENTO | Planed Dev 1 |
| `order/jsonOrders/{incrementId}` | GET | MAGENTO | Planed Dev 1 |
| `order/setCAccount` | POST | MAGENTO | Planed Dev 1 |
| `order/sendStorePickupEmail` | POST | MAGENTO | Planed Dev 1 |
| `order/getprueba` | GET | *(sin definir)* | Planed Dev 1 |
| `order/updateCreditOrderId` | POST | Unknown | Planed Dev 1 |
| `order/ManagePaynetOrders` 🟡 | POST | SQLITE / INTELISIS (`spAfectar`) | Planed Dev 1 |
| `order/checkOpenpay` 🟡 | POST | SQLITE / INTELISIS | Planed Dev 2 |

### ProductsController y MagentoController

Los 13 endpoints de `MagentoController` y los 8 de `ProductsController` (versión DMZ) son **100% MAGENTO** — salida hacia Magento REST. Todos en `Planed Dev 1`.

Los de `ProductsController` (LAN-only) están marcados `INTELISIS` en el status master porque su tabla de paso se alimenta de ahí: `updateProduct`, `updateProductJsonOnly`, `updatePrice`, `updateConfigurableProduct`, `updateStockMavi`, `updateStock`, `existenciasAlmacenArt` en **Planed Dev 2**; `getStockByStore` y `obtenerImagen` **Out of scope**.

### LoginController

| Endpoint | Verbo | Data Origin | Estatus |
|---|---|---|---|
| `login/authenticate` | POST | (local JWT) | Planed Dev 1 |

---

## ⚠️ Discrepancias detectadas entre fuentes

| Endpoint | `MIGRATION_STATUS` dice | El `.ods` dice | Mi análisis de código dice |
|---|---|---|---|
| `customer/deleteCustomerList` | INTELISIS | **SIGMAVI** (`VTASCListaBlanca`) | Intelisis vía `SpVTASListaNBMagento` |
| `product/updateProductJsonOnly` | INTELISIS | *(no aparece)* | SQLite + Magento — la tabla de paso ya está poblada |
| `product/obtenerImagen` | INTELISIS | *(no aparece)* | Filesystem/SMB, sin BD |
| `status/getStatus` | INTELISIS | *(no aparece)* | Solo `Ping` ICMP, sin conexión SQL |
| `credit/GetCreditAmounts` | ANDROID | *(no aparece)* | SQLite `mavi_credilana_info` |
| `credit/CreditoWeb_*` (8 endpoints) | ANDROID | *(no aparecen)* | Mixtos: Android + Intelisis vía linked server |

**Criterio para resolverlas:** el `.ods` manda sobre el destino de cada tabla; el `MIGRATION_STATUS` manda sobre el estatus y la planeación; mi análisis de código aporta el detalle de qué toca el endpoint hoy. Donde el status dice `ANDROID` pero el SP cruza a Intelisis por linked server, **el endpoint es mixto** y hay que tratarlo como tal.

### Los que alcanzan Intelisis por linked server `ERPMAVI` → `MAVICUBOS`

No se ven en el `Data Origin`. Verificados directamente contra la base:

| Endpoint | Mecanismo | Objeto Intelisis |
|---|---|---|
| `credit/validateSms` | SP `SPVTASCodigoSeguridadeCommerce` | `UPDATE` a `Cte`, lee `CteTel` |
| `customerService/bitacoraAtencionClientes` | SP `SP_ACTES_REGISTRO` | lee `Personal`, `INSERT` a `RM1138PendientesxValidar` |
| `credit/CreditoWeb_SaveData` | SP `SP_CREDITO_WEB_DATOS` | `CREDICCondicionArt`, `TablaStD`, `CteTel` |
| `credit/CreditoWeb_SaveFirstData` | SP `SpCREDISolicitudWebPrimerGuardado` | referencias a `IntelisisTMP` |
| `credit/SolicitudMercancia` | **SQL inline** | `FROM ERPMAVI.IntelisisTMP.dbo.Cte` |

---

## Pendientes de definición

1. ~~**`VTASCListaNegra` / `VTASCListaBlanca`**~~ → ✅ **RESUELTO**: se quedan en SIGMAVI como `ListaNegra` y `ListaBlanca` (se descarta el módulo y el tipo del nombre). Scripts creados en el repo MaviSAP.
2. **`VTASCProveedorActivoGarantia`** → ✅ Confirmado SIGMAVI, la llena PCP. 🔒 **Bloqueante activo**: falta que **Miguel Marín** entregue la estructura de la tabla.
3. **`TarjetaSerieMovMAVI`** → sin equivalente SAP ni SIGMAVI. La usa `obtenerCreditos`.
4. **`master.dbo.dbacseguridad`** → "Revisar con Valentin" / "Pendiente SAP". La usa `bbvaKeyNeko` *(Deprecated)*.
5. **`Comercializadora.dbo.Personal`** → "API de SuccessFactors / PONCE". La usa `codigoPromocion`.
6. **Los 3 endpoints de tablerate** → `Data Origin = Unknown` y sin ruta destino en la LAN.

---

## Navegación

- Listado completo: [[_ENDPOINTS_NoSAP.csv]]
- Clasificación por destino de datos: [[_EXCLUIDOS_Intelisis]]
- Inventario del barrido Modo A: [[_INVENTARIO_NoIntelisis.csv]]

---

**Mapa raíz de la capa:** [[LAN - Mapa]]
