# Los 18 endpoints de APIMagento a migrar

Reparto: **14 sin Intelisis · 4 con Intelisis** (02, 16, 17, 18).

| # | Verbo | Ruta | Controlador | Método | Backend | Acceso |
|---|---|---|---|---|---|---|
| 01 | POST | `credit/SendSmsNewNumber` | `CreditController.cs:549` | `CreditMethods.SendSmsNewNumber` `:1992` | ServicioAndroid | DMZ |
| 02 | POST | `credit/SolicitudMercancia` | `CreditController.cs:560` | `CreditMethods.SolicitudMercancia` `:610` | ServicioAndroid + **Intelisis** | DMZ |
| 03 | POST | `customerService/obtenerQuejas` | `CustomerServiceController.cs:87` | `CustomerServiceMethods.obtenerQuejas` `:714` | ServicioAndroid | DMZ |
| 04 | POST | `order/getGuide` | `OrdersController.cs:165` | `OrderMethods.GetGuide` `:736` | SQLite | DMZ |
| 05 | POST | `credit/GetCreditAmounts` | `CreditController.cs:315` | `CredyPrestamoMethods.GetCredilanaInfo<T>` `:833` | SQLite | DMZ |
| 06 | POST | `credit/guardardocumento` | `CreditController.cs:592` | `CreditMethods.GuardarDocumento` `:2605` | AdminDoc | DMZ |
| 07 | POST | `credit/SaveImagesProductosMx` | `CreditController.cs:272` | `CreditMethods.SaveImagesProductosMx` `:971` | AdminDoc + Filesystem | DMZ |
| 08 | GET | `customerService/bbvaKeyAdvanced` | `CustomerServiceController.cs:159` | `CustomerServiceMethods.GetBBVAKeyAdvanced` `:1124` | SOAP externo | DMZ |
| 09 | GET | `status/getStatus` | `StatusController.cs:12` | *(inline)* | Ninguno — ping ICMP | DMZ |
| 10 | POST | `product/obtenerImagen` | `ProductsController.cs:216` | `ProductImage.Methods.getImages` `:388` | SMB + impersonación | Interno |
| 11 | POST | `customer/cashCustomerReport` | `CustomersController.cs:109` | `CustomerMethods.CreateCashReport` `:194` | Filesystem + SMB | DMZ |
| 12 | POST | `customer/getCuenta` | `CustomersController.cs:91` | `Magento.getCuenta` `:309` | DMZ → Magento | Interno |
| 13 | POST | `customer/setCuenta` | `CustomersController.cs:100` | `Magento.setCuenta` `:319` | DMZ → Magento | Interno |
| 14 | POST | `product/updateProductJsonOnly` | `ProductsController.cs:120` | `ProductMethods.BuildJsonAndSend` `:1839` | SQLite + DMZ | Interno |
| 15 | POST | `product/updateConfigurableProduct` | `ProductsController.cs:145` | `ProductMethods.BuildJsonAndSendConfigurable` `:1407` | SQLite + DMZ | Interno |
| 16 | POST | `credit/CreditoWeb_FormDatos` | `CreditController.cs:145` | `CreditMethods.CreditoWeb_FormDatos` `:677` | SQLite / **Intelisis** | DMZ |
| 17 | POST | `credit/CreditoWeb_Informacion` | `CreditController.cs:289` | `CreditMethods.CreditoWeb_Informacion` `:1191` | SQLite / **Intelisis** | DMZ |
| 18 | POST | `credit/ExistRFCAndPhoneCte` | `CreditController.cs:376` | `CreditMethods.ExistRFCAndPhoneCte` `:1414` | Ninguno — neutralizado | DMZ |

---

## Por backend

| Backend | Endpoints |
|---|---|
| ServicioAndroid | 01, 02, 03 |
| SQLite | 04, 05, 14, 15, 16, 17 |
| AdminDoc | 06, 07 |
| Filesystem / SMB | 07, 10, 11 |
| DMZ → Magento | 12, 13, 14, 15 |
| SOAP externo | 08 |
| Sin conexión | 09, 18 |
| **Intelisis** | **02, 16, 17, 18** |

## Por acceso

| Acceso | Endpoints |
|---|---|
| Consumidos por la DMZ (13) | 01, 02, 03, 04, 05, 06, 07, 08, 09, 11, 16, 17, 18 |
| Internos — los dispara un cron (5) | 10, 12, 13, 14, 15 |

## Notas

- **02** — abre conexión contra ServicioAndroid pero su SQL inline lee de `ERPMAVI.IntelisisTMP.dbo.Cte`. Es el caso más simple de los 4 con Intelisis: un solo `SELECT`, sustituible por `GET partner/client/{clientId}`.
- **16 y 17** — bifurcan según el parámetro `op`: unos valores resuelven contra SQLite y el resto cae a Intelisis.
- **18** — `CURPValidation` y `RFCValidation` tienen `return` incondicional en su primera línea. Hoy no consulta ninguna base.
- **14 y 15** — ambos invocan `runDelta`, que lanza `python.exe main.py` como proceso externo.
