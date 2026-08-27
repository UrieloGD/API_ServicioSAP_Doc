---
tags: [mapeo-lan, clasificacion, intelisis, alcance]
proyecto: APIMagento
actualizado: 2026-07-30
modo: A
---

# Clasificación de endpoints por destino de datos

Resultado del **Modo A** sobre los 6 controladores que contienen los endpoints objetivo.
**90 endpoints** clasificados según el destino real de sus datos.

Inventario en CSV: [[_INVENTARIO_NoIntelisis.csv]]

---

## Leyenda de clasificación

| Marca | Clasificación | Qué significa para el equipo |
|---|---|---|
| ✅ | **NO-INTELISIS** | **Foco de trabajo.** Ningún sumidero toca Intelisis. Migrables tal cual |
| 🟡 | **MIXTO** | **En radar.** Combina Intelisis con otros destinos. Se documenta completo pero no se profundiza en los SPs de Intelisis |
| 🔒 | **FUERA DE ALCANCE** | 100% Intelisis. No se mapea ni se migra en este esfuerzo |

## Resumen

| Controlador                 |  Total | ✅ NO-INTELISIS | 🟡 MIXTO | 🔒 FUERA DE ALCANCE |
| --------------------------- | -----: | -------------: | -------: | ------------------: |
| `CreditController`          |     31 |              5 |       11 |                  15 |
| `CustomerServiceController` |     23 |              2 |        1 |                  20 |
| `OrdersController`          |     19 |              1 |       10 |                   8 |
| `ProductsController`        |      9 |              3 |        4 |                   2 |
| `CustomersController`       |      7 |              3 |        0 |                   4 |
| `StatusController`          |      1 |              1 |        0 |                   0 |
| **Total**                   | **90** |         **15** |   **26** |              **49** |

---

## CreditController

| Endpoint                                        | Verbo | Método de negocio                                  | BD / Destino                                     | Clasificación       | Evidencia                     | ¿Mapeado?                             |
| ----------------------------------------------- | ----- | -------------------------------------------------- | ------------------------------------------------ | ------------------- | ----------------------------- | ------------------------------------- |
| `/credit/SendSmsNewNumber`                      | POST  | `CreditMethods.SendSmsNewNumber`                   | **ServicioAndroid** (`mavicbosandroid`)          | ✅ NO-INTELISIS      | `CreditMethods.cs:1998`       |                                       |
| `/credit/GetCreditAmounts`                      | POST  | `CredyPrestamoMethods.GetCredilanaInfo`            | **SQLite** `data.db`                             | ✅ NO-INTELISIS      | `CredyPrestamoMethods.cs:834` |                                       |
| `/credit/SaveImagesProductosMx`                 | POST  | `CreditMethods.SaveImagesProductosMx`              | **AdminDoc** + Filesystem                        | ✅ NO-INTELISIS      | `CreditMethods.cs:998`        |                                       |
| `/credit/guardardocumento`                      | POST  | `CreditMethods.GuardarDocumento`                   | **AdminDoc** (`MAVI_DOC_CTE`)                    | ✅ NO-INTELISIS      | `CreditMethods.cs:2665`       |                                       |
| `/credit/ExistRFCAndPhoneCte`                   | POST  | `CreditMethods.ExistRFCAndPhoneCte`                | **Ninguna** — neutralizado                       | ✅ NO-INTELISIS      | `CreditMethods.cs:1426`       | 🔁 `ExistRFCAndPhoneCte/`             |
| `/credit/getSms`                                | POST  | `CreditMethods.ProductosCredito_Nip`               | ServicioAndroid + IntelisisTmp                   | 🟡 MIXTO            | `CreditMethods.cs:2134`       |                                       |
| `/credit/validateSms`                           | POST  | `CreditMethods.ProductosCredito_Clave`             | ServicioAndroid + IntelisisTmp *(linked server)* | 🟡 MIXTO            | `CreditMethods.cs:57`         | 🔁 `validateSms/` ⚠️                  |
| `/credit/CreditoWeb_FormDatos`                  | POST  | `CreditMethods.CreditoWeb_FormDatos`               | SQLite + IntelisisTmp                            | 🟡 MIXTO            | `CreditMethods.cs:681`        |                                       |
| `/credit/CreditoWeb_Informacion`                | POST  | `CreditMethods.CreditoWeb_Informacion`             | SQLite + IntelisisTmp                            | 🟡 MIXTO            | `CreditMethods.cs:1204`       |                                       |
| `/credit/CreditoWeb_SaveFirstData`              | POST  | `CreditMethods.CreditoWeb_SaveFirstData`           | ServicioAndroid + IntelisisTmp *(linked server)* | 🟡 MIXTO            | `CreditMethods.cs:510`        |                                       |
| `/credit/CreditoWeb_SaveData_Articulos`         | POST  | `CreditMethods.CreditoWeb_SaveData_Articulos`      | ServicioAndroid + IntelisisTmp                   | 🟡 MIXTO            | `CreditMethods.cs:473`        |                                       |
| `/credit/CreditoWeb_SaveData`                   | POST  | `CredyPrestamoMethods.CreditoWeb_SaveData`         | ServicioAndroid + IntelisisTmp *(linked server)* | 🟡 MIXTO            | `CredyPrestamoMethods.cs:37`  |                                       |
| `/credit/CreditoWeb_Seguro`                     | POST  | `CredyPrestamoMethods.CreditoWeb_Seguro`           | IntelisisTmp + ServicioAndroid + API Liberador   | 🟡 MIXTO            | `CredyPrestamoMethods.cs:231` |                                       |
| `/credit/SaveHaztenTransaction`                 | POST  | `CreditMethods.SaveHaztenTransaction`              | SIGMAVI + ServicioAndroid + IntelisisTmp         | 🟡 MIXTO            | `CreditMethods.cs:2443`       |                                       |
| `/credit/SaveCredilanaInfo`                     | POST  | `CredyPrestamoMethods.LoadCredilanaInfo`           | SQLite + IntelisisTmp                            | 🟡 MIXTO            | `CredyPrestamoMethods.cs:302` |                                       |
| `/credit/SolicitudMercancia`                    | POST  | `CreditMethods.SolicitudMercancia`                 | ServicioAndroid + IntelisisTmp *(inline)*        | 🟡 MIXTO            | `CreditMethods.cs:656`        |                                       |
| `/credit/getClienteFactura/{cliente}/{factura}` | GET   | `FacturaMethods.getClienteFacturas`                | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `FacturaMethods.cs:16`        |                                       |
| `/credit/getClienteSaldo/{cliente}`             | GET   | `FacturaMethods.getClienteSaldo`                   | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `FacturaMethods.cs:16`        |                                       |
| `/credit/codigoPromocion`                       | POST  | `CreditMethods.CodigoPromocion`                    | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:397`        | 🔁 `codigoPromocion/`                 |
| `/credit/codigoRecomendado`                     | POST  | `CreditMethods.codigoRecomendado`                  | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1114`       |                                       |
| `/credit/codigoRecomendadoWithUen`              | POST  | `CreditMethods.CodigoRecomendadoWithUen`           | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1159`       |                                       |
| `/credit/CreditoWeb_Solicitud`                  | POST  | `CreditMethods.CreditoWeb_Solicitud`               | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1293`       |                                       |
| `/credit/CreditoWeb_SolicitudPrimerGuardado`    | POST  | `CreditMethods.CreditoWeb_SolicitudPrimerGuardado` | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1346`       |                                       |
| `/credit/Validar_Lada`                          | POST  | `CreditMethods.IsLadaValid`                        | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1397`       |                                       |
| `/credit/getCreditAccount/{pAccount}`           | GET   | `CreditMethods.GetCreditAccount`                   | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1558`       | 🔁 `pAccount/` ⚠️ *nombre incorrecto* |
| `/credit/MonederoSaldoCredito`                  | POST  | `CreditMethods.MonederoSaldoCredito`               | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1601`       |                                       |
| `/credit/GetUnificationWalletStatus`            | POST  | `CreditMethods.SelectUnificationWalletStatus`      | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1646`       | 🔁 `GetUnificationWalletStatus/`      |
| `/credit/CheckAccountsPreUnification`           | POST  | `CreditMethods.CheckAccountsPreUnification`        | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1721`       |                                       |
| `/credit/SetUnificationWalletData`              | POST  | `CreditMethods.InsertUnificationWallet`            | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1694`       | 🔁 `SetUnificationWalletData/`        |
| `/credit/GetPhoneValidatedClientSecretName`     | POST  | `CreditMethods.GetPhoneValidatedClientSecretName`  | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:1816`       |                                       |
| `/credit/getPlazos`                             | GET   | `CreditMethods.GetPlazos`                          | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CreditMethods.cs:2553`       | 🔁 `getPlazos/`                       |

---

## CustomerServiceController

| Endpoint                                       | Verbo | Método de negocio             | BD / Destino                                     | Clasificación       | Evidencia                        | ¿Mapeado?                         |
| ---------------------------------------------- | ----- | ----------------------------- | ------------------------------------------------ | ------------------- | -------------------------------- | --------------------------------- |
| `/customerService/obtenerQuejas`               | POST  | `obtenerQuejas`               | **ServicioAndroid** (`ACTES_CATALOGO_QUEJA`)     | ✅ NO-INTELISIS      | `CustomerServiceMethods.cs:720`  |                                   |
| `/customerService/bbvaKeyAdvanced`             | GET   | `GetBBVAKeyAdvanced`          | **SOAP externo** `WSeCommerceMX`                 | ✅ NO-INTELISIS      | `CustomerServiceMethods.cs:1141` | 🔁 `bbvaKeyAdvanced/`             |
| `/customerService/bitacoraAtencionClientes`    | POST  | `bitacoraAtencionClientes`    | ServicioAndroid + IntelisisTmp *(linked server)* | 🟡 MIXTO            | `CustomerServiceMethods.cs:442`  |                                   |
| `/customerService/obtenerTipoGarantia`         | POST  | `obtenerTipoGarantia`         | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:44`   | 🔁 `obtenerTipoGarantia/`         |
| `/customerService/obtenerVentanaConfirmacion`  | POST  | `obtenerVentanaConfirmacion`  | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:155`  |                                   |
| `/customerService/unirCuenta`                  | POST  | `unirCuenta`                  | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:223`  | 🔁 `unirCuenta/`                  |
| `/customerService/validarCliente`              | POST  | `validarCliente`              | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:261`  | 🔁 `validarCliente/`              |
| `/customerService/nombreCliente`               | POST  | `nombreCliente`               | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:319`  | 🔁 `nombreCliente/`               |
| `/customerService/obtenerCreditos`             | POST  | `obtenerCreditos`             | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:505`  | 🔁 `obtenerCreditos/`             |
| `/customerService/GetAccountDebts`             | POST  | `GetAccountDebts`             | IntelisisTmp (`SPCXCCobrosClientesBBVA`)         | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:800`  |                                   |
| `/customerService/ApplyPaymentNeko`            | POST  | `ApplyPaymentNeko`            | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:861`  | 🔁 `ApplyPaymentNeko/`            |
| `/customerService/ApplyPaymentAdvanced`        | POST  | `ApplyPaymentAdvanced`        | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:922`  | 🔁 `ApplyPaymentAdvanced/`        |
| `/customerService/UpdateStatusPaymentNeko`     | POST  | `UpdateStatusPaymentNeko`     | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:973`  | 🔁 `UpdateStatusPaymentNeko/`     |
| `/customerService/UpdateStatusPaymentAdvanced` | POST  | `UpdateStatusPaymentAdvanced` | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1025` | 🔁 `UpdateStatusPaymentAdvanced/` |
| `/customerService/bbvaKeyNeko`                 | GET   | `GetBBVAKeyNeko`              | IntelisisTmp (`master.dbo.dbacseguridad`)        | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1090` | 🔁 `bbvaKeyNeko/`                 |
| `/customerService/LoginClienteCredito`         | POST  | `LoginClienteCredito`         | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1223` |                                   |
| `/customerService/LoginClienteCreditoFechaN`   | POST  | `LoginClienteCreditoFechaN`   | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1265` |                                   |
| `/customerService/GetSTPAccount`               | POST  | `GetSTPAccount`               | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1301` | 🔁 `GetSTPAccount/`               |
| `/customerService/GetSalesChannelsSTP`         | POST  | `GetSalesChannelsSTP`         | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1417` | 🔁 `GetSalesChannelsSTP/`         |
| `/customerService/ValidateSTPAccount`          | GET   | `ValidateSTPAccount`          | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1464` | 🔁 `ValidateSTPAccount/`          |
| `/customerService/validarCoberturaPorCP`       | POST  | `ValidarCoberturaPorCP`       | IntelisisTmp (`CodigoPostal`)                    | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1744` | 🔁 `validarCoberturaPorCP/`       |
| `/customerService/ObtenerEstatusEmbarque`      | POST  | `ObtenerEstatusEmbarque`      | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1908` | 🔁 `ObtenerEstatusEmbarque/`      |
| `/customerService/GetEmpleadoByNomina`         | POST  | `GetEmpleadoByNomina`         | IntelisisTmp                                     | 🔒 FUERA DE ALCANCE | `CustomerServiceMethods.cs:1957` |                                   |

---

## OrdersController

| Endpoint | Verbo | Método de negocio | BD / Destino | Clasificación | Evidencia | ¿Mapeado? |
|---|---|---|---|---|---|---|
| `/order/getGuide` | POST | `OrderMethods.GetGuide` | **SQLite** (`servicio_guias`) | ✅ NO-INTELISIS | `OrderMethods.cs:738` | |
| `/order/setOrder` | POST | `OrderMethods.SetPedido` | IntelisisTmp + SQLite + ServicioAndroid + API Liberador | 🟡 MIXTO | `OrderMethods.cs:458` | |
| `/order/validateCredit` | POST | `OrderMethods.SetPedido` | IntelisisTmp + SQLite + ServicioAndroid | 🟡 MIXTO | `OrderMethods.cs:458` | |
| `/order/cancelOrder` | POST | `ServiceOrderMethods.sendReporte` | IntelisisTmp + SQLite (`workstation`) | 🟡 MIXTO | `ServiceOrderMethods.cs:820` | |
| `/order/returnOrder` | POST | `ServiceOrderMethods.sendReporte` | IntelisisTmp + SQLite (`workstation`) | 🟡 MIXTO | `ServiceOrderMethods.cs:820` | |
| `/order/setOrderStatus` | POST | `Provider.CompraArtVirtual` | IntelisisTmp + Magento *(vía DMZ)* | 🟡 MIXTO | `Order/Provider.cs:27` | |
| `/order/createStorepickupCode/{idEcommerce}/{idOrder}` | POST | `CodigoRecogerSucursal.crearPrimerCodigoRecogerSuc` | IntelisisTmp + Magento + SMTP | 🟡 MIXTO | `StorePickup/CodigoRecogerSucursal.cs:126` | |
| `/order/generateNewStorepickupCode/{idEcommerce}` | GET | `CodigoRecogerSucursal.NuevoCodigoRecogerSucursal` | IntelisisTmp + Magento *(vía DMZ)* | 🟡 MIXTO | `StorePickup/CodigoRecogerSucursal.cs:274` | |
| `/order/getOrderId/{idEcommerce}` | POST | `OrderMethods.InsertDetPedido` | Magento *(vía DMZ)* + IntelisisTmp | 🟡 MIXTO | `OrderMethods.cs:458` | |
| `/order/getOrderInfoAndSet/{incrementId}` | GET | `Magento.getOrderInfoAndSet` | Magento *(vía DMZ)* + IntelisisTmp | 🟡 MIXTO | `Conn/Magento.cs:371` | |
| `/order/checkOpenpay` | POST | `OpenpayMethods.CheckStatus` | SQLite + API Openpay + IntelisisTmp | 🟡 MIXTO | `OpenpayMethods.cs:292` | |
| `/order/ManagePaynetOrders` | POST | `OrderMethods.ManagePaynetOrders` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `OrderMethods.cs:63` | |
| `/order/insertPaymentData` | POST | `OrderMethods.InsertPaymentData` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `OrderMethods.cs:187` | |
| `/order/getIntelisisStatuses` | POST | `OrderMethods.GetIntelisisStatuses` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `OrderMethods.cs:298` | 🔁 `getIntelisisStatuses/` |
| `/order/getPosCancellations` | POST | `OrderMethods.GetPosCancellations` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `OrderMethods.cs:240` | |
| `/order/GetPickUpCode` | POST | `CodigoRecogerSucursal.GetPickUpCode` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `StorePickup/CodigoRecogerSucursal.cs:60` | |
| `/order/creditStatus/{idSolicitud}` | GET | `OrderMethods.GetCreditStatus` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `OrderMethods.cs:1851` | 🔁 `idSolicitud/` ⚠️ *nombre incorrecto* |
| `/order/updateCreditOrderId` | POST | `OrderMethods.UpdateCreditOrderId` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `OrderMethods.cs:1982` | |
| `/order/estimated-delivery/{ecommerceId}` | GET | `EstimatedDeliveryMethods.GetEstimateDeliveryData` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `EstimatedDeliveryMethods.cs:30` | 🔁 `ecommerceId/` ⚠️ *nombre incorrecto* |

---

## ProductsController

| Endpoint | Verbo | Método de negocio | BD / Destino | Clasificación | Evidencia | ¿Mapeado? |
|---|---|---|---|---|---|---|
| `/product/updateProductJsonOnly` | POST | `ProductMethods.BuildJsonAndSend` | **SQLite** + Magento *(vía DMZ)* | ✅ NO-INTELISIS | `ProductMethods.cs:1839` | |
| `/product/updateConfigurableProduct` | POST | `ProductMethods.BuildJsonAndSendConfigurable` | **SQLite** + Magento *(vía DMZ)* | ✅ NO-INTELISIS | `ProductMethods.cs:1407` | |
| `/product/obtenerImagen` | POST | `ProductImage.Methods.getImages` | **Filesystem / SMB** (`172.16.202.4`) | ✅ NO-INTELISIS | `ProductImage/Methods.cs:395` | |
| `/product/updateProduct` | POST | `ProductMethods.exporta_art` | IntelisisTmp + SQLite + Magento + MySQL | 🟡 MIXTO | `ProductMethods.cs:1204` | |
| `/product/updateStockMavi` | POST | `ProductMethods.updateStockJson` | IntelisisTmp + Magento *(vía DMZ)* | 🟡 MIXTO | `ProductMethods.cs:929` | |
| `/product/updateStock` | POST | `ProductMethods.updateStockJson` | IntelisisTmp + Magento *(vía DMZ)* | 🟡 MIXTO | `ProductMethods.cs:929` | |
| `/product/existenciasAlmacenArt` | POST | `ActualizacionStock.GetCambiosExistencias` | IntelisisTmp + SQLite + Magento | 🟡 MIXTO | `ProductStock/ActualizacionStock.cs:45` | |
| `/product/updatePrice` | POST | `ProductMethods.updatePrices` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `ProductMethods.cs:484` | |
| `/product/getStockByStore` | POST | `ProductMethods.getStockStore` | IntelisisTmp | 🔒 FUERA DE ALCANCE | `ProductMethods.cs:1005` | |

---

## CustomersController

| Endpoint | Verbo | Método de negocio | BD / Destino | Clasificación | Evidencia | ¿Mapeado? |
|---|---|---|---|---|---|---|
| `/customer/getCuenta` | POST | `Magento.getCuenta` | **Magento** *(vía DMZ)* | ✅ NO-INTELISIS | `Conn/Magento.cs:311` | |
| `/customer/setCuenta` | POST | `Magento.setCuenta` | **Magento** *(vía DMZ)* | ✅ NO-INTELISIS | `Conn/Magento.cs:321` | |
| `/customer/cashCustomerReport` | POST | `CustomerMethods.CreateCashReport` | **Filesystem / SMB** (`172.16.200.2`) | ✅ NO-INTELISIS | `CustomerMethods.cs:214` | |
| `/customer/setCustomer` | POST | `CustomerMethods.ClientToIntelisis` | IntelisisTmp (`SP_eCommerceCtenuevo`) | 🔒 FUERA DE ALCANCE | `CustomerMethods.cs:97` | |
| `/customer/setCustomerList` | POST | `CustomerMethods.blackwhitelist` | IntelisisTmp (`SpVTASListaNBMagento`) | 🔒 FUERA DE ALCANCE | `CustomerMethods.cs:128` | 🔁 `Post_SetCustomerList_Mapping.md` |
| `/customer/getCustomerList` | POST | `CustomerMethods.blackwhitelist` | IntelisisTmp (`SpVTASListaNBMagento`) | 🔒 FUERA DE ALCANCE | `CustomerMethods.cs:128` | 🔁 `Post_GetCustomerList_Mapping.md` |
| `/customer/deleteCustomerList` | POST | `CustomerMethods.blackwhitelist` | IntelisisTmp (`SpVTASListaNBMagento`) | 🔒 FUERA DE ALCANCE | `CustomerMethods.cs:128` | 🔁 `Post_DeleteCustomerList_Mapping.md` |

---

## StatusController

| Endpoint | Verbo | Método de negocio | BD / Destino | Clasificación | Evidencia | ¿Mapeado? |
|---|---|---|---|---|---|---|
| `/status/getStatus` | GET | *(inline en el controlador)* | **Ninguna** — solo `Ping` ICMP a `172.16.202.2` | ✅ NO-INTELISIS | `StatusController.cs:20` | |

---

## Los 15 ✅ NO-INTELISIS — foco del equipo

| # | Endpoint | BD / Destino |
|---|---|---|
| 1 | `/credit/SendSmsNewNumber` | ServicioAndroid |
| 2 | `/credit/GetCreditAmounts` | SQLite |
| 3 | `/credit/SaveImagesProductosMx` | AdminDoc + Filesystem |
| 4 | `/credit/guardardocumento` | AdminDoc |
| 5 | `/credit/ExistRFCAndPhoneCte` | Ninguna (neutralizado) |
| 6 | `/customerService/obtenerQuejas` | ServicioAndroid |
| 7 | `/customerService/bbvaKeyAdvanced` | SOAP externo |
| 8 | `/order/getGuide` | SQLite |
| 9 | `/product/updateProductJsonOnly` | SQLite + Magento |
| 10 | `/product/updateConfigurableProduct` | SQLite + Magento |
| 11 | `/product/obtenerImagen` | Filesystem / SMB |
| 12 | `/customer/getCuenta` | Magento |
| 13 | `/customer/setCuenta` | Magento |
| 14 | `/customer/cashCustomerReport` | Filesystem / SMB |
| 15 | `/status/getStatus` | Ninguna |

### Destinos que hay que sostener tras apagar Intelisis

| Destino | Servidor / Ruta | Endpoints |
|---|---|---|
| **ServicioAndroid** | `mavicbosandroid.grupomavi.com` | 1, 6 |
| **AdminDoc** | `mavicbosandroid.grupomavi.com` | 3, 4 |
| **SQLite** `data.db` | Local del servidor | 2, 8, 9, 10 |
| **Magento** *(vía DMZ)* | `kdll3fhcyo.mavi.mx:7022` | 9, 10, 12, 13 |
| **Filesystem / SMB** | `172.16.202.4` · `172.16.200.2` | 3, 11, 14 |
| **SOAP** `WSeCommerceMX` | `172.16.215.51:3024` | 7 |
| **Ninguno** | — | 5, 15 |

---

## Los 26 🟡 MIXTO — en radar

Combinan Intelisis con otros destinos. **Al apagar Intelisis se rompen parcialmente**: la parte no-Intelisis sigue viva pero el flujo completo deja de funcionar.

| Controlador | Endpoints en radar |
|---|---|
| `CreditController` (11) | `getSms` · `validateSms` · `CreditoWeb_FormDatos` · `CreditoWeb_Informacion` · `CreditoWeb_SaveFirstData` · `CreditoWeb_SaveData_Articulos` · `CreditoWeb_SaveData` · `CreditoWeb_Seguro` · `SaveHaztenTransaction` · `SaveCredilanaInfo` · `SolicitudMercancia` |
| `CustomerServiceController` (1) | `bitacoraAtencionClientes` |
| `OrdersController` (10) | `setOrder` · `validateCredit` · `cancelOrder` · `returnOrder` · `setOrderStatus` · `createStorepickupCode` · `generateNewStorepickupCode` · `getOrderId` · `getOrderInfoAndSet` · `checkOpenpay` |
| `ProductsController` (4) | `updateProduct` · `updateStockMavi` · `updateStock` · `existenciasAlmacenArt` |

### Los que alcanzan Intelisis por **linked server** `ERPMAVI` → `MAVICUBOS`

No se detectan mirando la cadena de conexión: abren contra `ServicioAndroid` pero el SP o el SQL cruzan a Intelisis.

| Endpoint | Mecanismo | Objeto Intelisis |
|---|---|---|
| `/credit/validateSms` | SP `SPVTASCodigoSeguridadeCommerce` | `UPDATE` a `Cte`, lee `CteTel` |
| `/customerService/bitacoraAtencionClientes` | SP `SP_ACTES_REGISTRO` | lee `Personal`, `INSERT` a `RM1138PendientesxValidar` |
| `/credit/CreditoWeb_SaveData` | SP `SP_CREDITO_WEB_DATOS` | `CREDICCondicionArt`, `TablaStD`, `CteTel` |
| `/credit/CreditoWeb_SaveFirstData` | SP `SpCREDISolicitudWebPrimerGuardado` | referencias a `IntelisisTMP` |
| `/credit/SolicitudMercancia` | **SQL inline** | `FROM ERPMAVI.IntelisisTMP.dbo.Cte` |

---

## Pendientes registrados

- **20 endpoints 🔒 ya tienen carpeta** creada antes de aplicar este criterio (marcados 🔁). No se retiraron.
- **3 carpetas con nombre de parámetro** en vez de endpoint: `pAccount/`, `idSolicitud/`, `ecommerceId/`.
- **`validateSms/03_BusinessMethod.md` está incompleto**: documenta solo `VTASDCodigoVerificacioneCommerce` y omite el `UPDATE` a `Cte` vía linked server. Su clasificación real es 🟡 MIXTO, no NO-INTELISIS.
- **14 carpetas de `CustomerServiceController` sin `03_BusinessMethod.md`** — enlaces rotos en el README del controlador. *(No se completaron por indicación del usuario.)*

## Controladores fuera de este barrido

`RecomenderController` (3), `WholesaleCustomerController` (2) y `ProspectoController` (2) no contienen ninguno de los endpoints objetivo. Por clasificación previa los 7 son 100% Intelisis, pero **sin evidencia verificada en este barrido**.

---

## Navegación

- Inventario global: [[_INVENTARIO_NoIntelisis.csv]]
- Índice de CustomerServiceController: [[CustomerServiceController/README]]

---

**Mapa raíz de la capa:** [[LAN - Mapa]]
