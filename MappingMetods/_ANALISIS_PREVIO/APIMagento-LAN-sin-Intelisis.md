
# APIMagento (LAN) — Inventario de código que NO conecta a Intelisis

Proyecto analizado: `C:\Users\dsvalle\source\repos\APIMagento\WebApiMagento`
Archivos .cs revisados: 80 (excluyendo `obj/`)

---

## 0. Criterio de clasificación

En `Conn/Connection.cs` se declaran 7 cadenas de conexión + credenciales de red:

| # | Campo | Servidor / BD | ¿Es Intelisis? |
|---|---|---|---|
| 1 | `sCadenaConexion` | `MAVICUBOS.grupomavi.com` / **IntelisisTmp** | **SÍ** |
| 2 | `sCadenaConexionMaster` | `172.16.202.25` / **IntelisisTmp** | **SÍ** (⚠ declarada pero NUNCA usada) |
| 3 | `sCadenaConexionAndriod` | `mavicbosandroid.grupomavi.com` / **ServicioAndroid** | NO |
| 4 | `sCadenaConexionAdminDoc` | `mavicbosandroid.grupomavi.com` / **AdminDoc** | NO |
| 5 | `sCadenaConexionSigMavi` | `mavicbosandroid.grupomavi.com` / **SIGMAVI** | NO |
| 6 | `sCadenaComercializadora` | `MAVICUBOS.grupomavi.com` / **Comercializadora** | NO (BD distinta; además está en código muerto) |
| 7 | `sCadenaConexionMysql` | `172.16.202.29` / **aplicaciones_web** (MySQL) | NO |
| — | `domainImages/userImages/passImages` | Impersonación Windows para shares SMB | NO |

Fuentes de datos adicionales que **no son Intelisis**:
- **SQLite local**: `C:\inetpub\wwwroot\api\data.db` (vía `Conn/DB.cs` y `SQLiteConnection` directo)
- **Magento vía DMZ**: `Helper/Curl.cs` → `URL_DMZ = https://kdll3fhcyo.mavi.mx:7022/api/`
- **API Openpay** (SDK `Openpay`)
- **API Liberador de Crédito**: `http://172.16.215.51:3026/api/{login,venta,credilana}`
- **SOAP Multipagos BBVA**: `http://172.16.215.51:3024/WSeCommerceMX.asmx`
- **SMTP** (`server.mavi.mx`, `mail.mueblesamerica.mx`)
- **Sistema de archivos / shares**: `\\MAVIWEB01\ImagenesWEBMagento`, `\\172.16.202.4\ecom\...`, `\\172.16.200.2\mavica\ecom\...`, `C:\inetpub\wwwroot\api\images`, `C:\inetpub\wwwroot\log`, `E:\logspedmagto`
- **Proceso externo**: `python.exe C:\inetpub\tasks\delta\main.py` (deltas de producto)

---

## 1. ARCHIVOS 100% LIBRES DE INTELISIS

### 1.1 Infraestructura / Seguridad (sin BD alguna)

| Archivo | Miembros | Qué hace |
|---|---|---|
| `Controllers/LoginController.cs` | `Authenticate(LoginRequest)` — ruta `POST login/authenticate` | Valida usuario/pass contra hashes de `Web.config` y emite JWT |
| `Controllers/TokenGenerator.cs` | `GenerateTokenJwt(string)` | Genera JWT HMAC-SHA256 |
| `Controllers/TokenValidationHandler.cs` | `TryRetrieveToken`, `SendAsync`, `LifetimeValidator` | DelegatingHandler de validación de JWT |
| `Conn/HashService.cs` | `HashString`, `ComputeHash`, `GenerateSalt`, `VerifyPassword`, `AreHashesEqual` | PBKDF2 (Rfc2898) |
| `App_Start/WebApiConfig.cs` | `Register(HttpConfiguration)` | Rutas + registro del handler |
| `Global.asax.cs` | `Application_Start` | Bootstrap |
| `Properties/AssemblyInfo.cs` | — | Metadatos |

### 1.2 Controllers sin ninguna conexión SQL

| Archivo | Endpoint | Detalle |
|---|---|---|
| `Controllers/StatusController.cs` | `GET status/getStatus` | Solo hace `Ping` ICMP a `172.16.202.2`. No abre ninguna conexión SQL (aunque el mensaje diga "no se tiene conexión con la base de datos") |

### 1.3 Helpers

| Archivo | Métodos | Destino real |
|---|---|---|
| `Helper/Logger.cs` | `intelisis`, `SetOrder`, `Openpay`, `OrderStatus`, `ProductAttributes`, `ProductImport`, `ProductImages`, `Credit`, `LiberadorCredito`, `GeneraEtiquetas`, `CodigoPromocion`, `purgeLogProductImport`, `CustomerService`, `EnvioCorreo`, `PaymentBBVA`, `CredilanaClienteNuevo` | Archivos en `C:\inetpub\wwwroot\log\`. ⚠ `Logger.intelisis()` **solo escribe `intelisis.log`**, no conecta a nada |
| `Helper/Tool.cs` | `log(string[], string)` | `E:\logspedmagto\*.log` — **código muerto** (0 referencias) |
| `Helper/Email.cs` | `enviar_correo(...)` | SMTP puro |
| `Helper/Curl.cs` | `WebClientCustom.GetWebRequest`, `Curl()`, `PostFile`, `ExistFile`, `Post`, `Get` | 100% HTTP contra la API DMZ |
| `Helper/Delta.cs` | `Delta()`, `IsDelta`, `ProductDelta` | Solo SQLite (`products`, `product_history`) |
| `Conn/DB.cs` | `OpenConn`, `CloseConn`, `Set`, `Get(query, campos)`, `Get(query)` | Solo SQLite `data.db` |
| `Helper/Cadena.cs` | `QueryImportVIU`, `QueryImportMA` (constantes) | Contienen SQL de Intelisis pero **es código muerto** (0 referencias) — no ejecuta nada |

### 1.4 Métodos de negocio / integración

| Archivo | Métodos | Destino |
|---|---|---|
| `Metodos/LiberadorCreditoMethods.cs` | `LiberarCliente(cliente, id, uen)` + structs | HTTP a API Liberador (`172.16.215.51:3026`) |
| `Metodos/Credit/CredYPrestamo/Liberador.cs` | `LiberarCliente(id, cliente, uen, idVenta, metodoEnvio, cuentaClabe, banco)` | HTTP a API Credilana (`/api/credilana`) |
| `Metodos/Credit/CredYPrestamo/maviCrypto.cs` | `Encripta`, `DesEncripta` | 3DES/MD5 en memoria |
| `Metodos/ProductDeltaConfig.cs` | `GetConfiguration()` | Lee/crea `C:\inetpub\wwwroot\api\config-delta.json` |
| `Metodos/Credit/CredYPrestamo/CredYprestamoModels.cs`, `ModelRequest.cs` | POCOs | — |
| `Metodos/AppMercancias/MercanciaQueries.cs` | Constantes SQL | Solo strings (los SQL sí son de Intelisis, pero el archivo no conecta) |
| `Properties/Querys.cs` | 55 propiedades que leen `.sql` embebidos | ⚠ **Código muerto**: 0 referencias y solo existe `SqlQuerys/ObtenerRFC.sql`, además no está marcado como EmbeddedResource → lanzaría excepción si se usara |
| `Models/*` (todos: `ClienteRequest`, `Config`, `CreditRequest`, `CustomerRequest`, `CustomerServiceRequest`, `Enums`, `HaztenTransaction`, `LoginRequest`, `OrderRequest`, `Product`, `RecommenderRequest`, `RfcModels`, `ServiceOrderRequest`, `StoreRequest`, `ValidarTelefonoRequest/Response`, `WalletCustomerRequest`, `WholesaleCustomerRequest`, `Magento/*`, `AppMercancias/AppMercanciaModels`) | DTOs/POCOs | Ninguna conexión |

---

## 2. ENDPOINTS (Controllers) QUE NO TOCAN INTELISIS

| Controller | Ruta | Método destino | Fuente real |
|---|---|---|---|
| CustomersController | `POST customer/getCuenta` | `Magento.getCuenta` | **Curl → DMZ** |
| CustomersController | `POST customer/setCuenta` | `Magento.setCuenta` | **Curl → DMZ** |
| CustomersController | `POST customer/cashCustomerReport` | `CustomerMethods.CreateCashReport` | **Filesystem + share `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE`** |
| OrdersController | `POST order/getGuide` | `OrderMethods.GetGuide` | **SQLite** (`servicio_guias`) |
| ProductsController | `POST product/updateProductJsonOnly` | `ProductMethods.BuildJsonAndSend` ×3 | **SQLite + Curl** |
| ProductsController | `POST product/updateConfigurableProduct` | `Magento.deleteChildren/getChildren` + `BuildJsonAndSendConfigurable` | **SQLite + Curl** |
| ProductsController | `POST product/obtenerImagen` | `ProductImage.Methods.getImages` | **Impersonación + copia SMB** |
| MercanciaController | `POST mercancias/getLimiteMercancia` | `MercanciaMethods.GetLimiteMercancia` | **Ninguna** (`// TODO: Query pendiente de ERP`, devuelve lista vacía) |
| CustomerServiceController | `POST customerService/obtenerQuejas` | `CustomerServiceMethods.obtenerQuejas` | **ServicioAndroid** (`actes_catalogo_queja`) |
| CustomerServiceController | `POST customerService/bitacoraAtencionClientes` | `bitacoraAtencionClientes` | **ServicioAndroid** (`SP_ACTES_REGISTRO`) |
| CustomerServiceController | `GET customerService/bbvaKeyAdvanced` | `GetBBVAKeyAdvanced` | **SOAP externo WSeCommerceMX** |
| CreditController | `POST credit/validateSms` | `CreditMethods.ProductosCredito_Clave` | **ServicioAndroid** (`SPVTASCodigoSeguridadeCommerce`) |
| CreditController | `POST credit/SendSmsNewNumber` | `CreditMethods.SendSmsNewNumber` | **ServicioAndroid** (`TcAAEA00030_EnvioMensajes`, `VTASDCodigoVerificacioneCommerce`) |
| CreditController | `POST credit/GetCreditAmounts` | `CredyPrestamoMethods.GetCredilanaInfo` | **SQLite** (`mavi_credilana_info`) |
| CreditController | `POST credit/SaveImagesProductosMx` | `CreditMethods.SaveImagesProductosMx` | **Filesystem + AdminDoc** |
| CreditController | `POST credit/guardardocumento` | `CreditMethods.GuardarDocumento` | **AdminDoc** (`MAVI_DOC_CTE`) |
| CreditController | `POST credit/CreditoWeb_FormDatos` (op ∈ GetAnioMes, EstadosMA, EstadosVIU, DelegacionMA, DelegacionVIU, GetAtencionClientes) | `GetCredilanaInfo<T>` | **SQLite** (el `return` final sí va a Intelisis) |
| CreditController | `POST credit/CreditoWeb_Informacion` (op=`banco` con BINESBANCARIOS/INSTITUCIONESUC, y `GeLeyendaCatDimas`) | `GetCredilanaInfo<T>` | **SQLite** (el `return` final sí va a Intelisis) |

---

## 3. MÉTODOS QUE NO TOCAN INTELISIS, POR ARCHIVO

### 3.1 `Conn/Magento.cs` — SQLite + Curl (DMZ)
Toda la clase es no-Intelisis salvo 2 métodos que delegan:

| Método | Fuente |
|---|---|
| `Magento()` (ctor) | Curl (login DMZ) |
| `getAttributes()` | Curl + SQLite `attribute_options` |
| `getGeneralAttributes()` | Curl + SQLite `attributes` |
| `getAttributeSets()` | Curl + SQLite `attribute_sets` |
| `getCategories()` | Curl + SQLite `categories` |
| `deleteChildren()` | SQLite `children` |
| `getChildren(store)` | Curl + SQLite `children` |
| `deleteReservations()` | Curl |
| `getNoImageProduct(store)` | Curl + SQLite — ⚠ **código muerto** |
| `getCuenta(cliente)` / `setCuenta(cliente)` | Curl |
| `getProductWithWebsites()` | Curl + SQLite `product_in_stores` |
| `deletePromociones()` | Curl |
| `SetCAccount(incrementId, cAccount)` | Curl |
| ⚠ `sendAttributesToIntelisis()` | SQLite + Curl + `ignoreAttributes.txt`, **pero llama a `AttributeMethods.sendIntelisis()` → sí llega a Intelisis** |
| ⚠ `getOrderInfoAndSet(incrementId)` | Curl, **pero llama a `OrderMethods.ReSetPedido/SetPedido` → sí llega a Intelisis** |

### 3.2 `Metodos/CreditMethods.cs` (2738 líneas — el más mezclado)

**Solo ServicioAndroid (no Intelisis):**
- `ProductosCredito_Clave(cliente, clave, carrito)` — `SPVTASCodigoSeguridadeCommerce`
- `ProductosCredito_UpdateInfo(idMagento, email, phone)`
- `getClienteMagento(idMagento)`
- `getClienteInfoSaldo(cliente, idmagento)`
- `checkSaldo(cliente)`
- `SolicitudMercancia(request)`
- `SendSmsNewNumber(request)` *(static)*
- `GetIdRef(cliente, idCarrito)` *(static)*
- `InsertCodigoVerificacion(cliente, idCarrito)` *(static)*
- `InsertSendingSms(idRef, cliente, telefonoValidado)` *(static)*
- `GetSmsStatus(cliente)` *(static)*
- `GetVerificationCode(cliente, idCarrito)` *(static)*

**Solo AdminDoc:**
- `SaveSelfieImageForCredit(SaveImagesRequest)` — INSERT en `MAVI_DOC_CTE`
- `GuardarDocumento(BodyImagenBase64)` — INSERT/UPDATE en `MAVI_DOC_CTE`

**Solo SIGMAVI:**
- `SaveHaztenEtapaProcesamiento(process, idBiometrico)` — `CREDIDEtapaProcesamiento`
- `SaveHaztenMetaData(metadata, idBiometrico)` — `CREDIDTransaccionMetaDato`

**Sin BD (memoria / filesystem / HTTP):**
- `ProductosCredito_Nip(...)` — solo orquesta (el trabajo real lo hace `VTASCodigoSMSEcommerce`, que sí es mixto)
- `SaveImagesProductosMx(request)` — `Task.Run` + filesystem
- `SaveCompressedFile(img, index)` — `C:\inetpub\wwwroot\api\images\credit`
- `CompressBytesFromBase64Image(base64, mime, maxBytes)` — memoria
- `GetEncoder(mime)` *(static)* — memoria
- `VerificarConexionURL(mURL)` — `HttpWebRequest`
- `HidePhoneNumber(number)` *(static)* — string
- `HideNames(name)` *(static)* — string
- `GetQueryDelayedDays(condition)` *(private)* — solo arma un string SQL

**Código muerto / neutralizado:**
- `CURPValidation(data)` — ⚠ tiene `return` incondicional en la 1ª línea; el bloque con `sCadenaComercializadora` y el de Intelisis son **inalcanzables**
- `RFCValidation(data)` — ⚠ mismo caso: `return` incondicional, código Intelisis inalcanzable
- ⇒ `ExistRFCAndPhoneCte(data)` (endpoint `credit/ExistRFCAndPhoneCte`) hoy **no toca ninguna BD**

**Mixtos (contienen ambas):** `ProductosCreditoWeb_SaveData`, `CreditoWeb_SaveFirstData`, `CreditoWeb_SaveData_Articulos`, `VTASCodigoSMSEcommerce`, `SaveHaztenTransaction`, `SaveCoordsInNewTable`.

### 3.3 `Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs`

**Solo ServicioAndroid:**
- `CreditoWeb_SaveData(op, data)` — `SP_CREDITO_WEB_DATOS` + `TrWACW00041_RefSolCredWeb` (⚠ solo llama a `cte_prospecto()` que sí es Intelisis)
- `UpdatePickUpAtBank(id, isPickUpAtBank)` — `CRED_SOLICITUD_WEB_DATOS_TEMP`

**Solo SQLite (`data.db` → `mavi_credilana_info`):**
- `SaveCredilanaInfo(request)`
- `GetCredilanaInfo<T>(field, uen)`
- `ExistFieldCredilanaInfo(connection, table, field, uen)`
- `UpdateCredilanaInfo(connection, request, id, table)`
- `InsertCredilanaInfo(connection, request, table)`

**Puro cálculo / memoria (0 BD):**
- `RemoveTildes(texto)` *(static)*
- `GetCreditPlazos(data, monto, uen)`
- `CalculatePrestamoPersonalInfo(row)` *(protected)* — CAT/TASA/pago fijo
- `CalculateCredilanaInfo(row)` *(protected)*
- `Truncate(num, fixedDigits)`
- `GetCreditAmountCteC(data)`

**Sin BD directa pero orquesta:**
- `ProcesoAsynCredilanaCte(data, id)` — llama `OrderMethods.IsValidated` (Intelisis), `CreditMethods.IsInTableStd` (Intelisis), `UpdatePickUpAtBank` (Android) y `Liberador.LiberarCliente` (HTTP)
- `LoadCredilanaInfo()` — escribe SQLite pero **lee de Intelisis** vía `CreditMethods`

**Código muerto:** `SeguroVida(id)` — 0 referencias (usa Intelisis, pero nunca se invoca).

### 3.4 `Metodos/Credit/Methods.cs`
- `CreditoWeb_SaveData(op, data, prospecto)` *(static)* — **ServicioAndroid** completo (`SP_CREDITO_WEB_DATOS` + 3 inserts a `TrWACW00041_RefSolCredWeb`). Solo `cte_prospecto()` cae en Intelisis.
- `cte_prospecto()` *(static)* — **SÍ Intelisis** (`SP_GeneraConsecutivoCteMavi`)

### 3.5 `Metodos/AttributeMethods.cs`
- `AttributeMethods()` (ctor) — memoria
- `getAtributosDeMagento()` *(private)* — **SQLite** (`atributos_de_magento`)
- `getValorLista()` *(private)* — **SQLite** (`attribute_options`)
- `executeCommand(query)` *(private)* — **MySQL** (`aplicaciones_web`: `atributosdemagento`, `atribmgtovalorlista`)
- ⚠ `sendIntelisis()` — orquesta lo anterior **y** ejecuta `SpWDM0285_AtributosdeMagento` en Intelisis

### 3.6 `Metodos/OpenpayMethods.cs` — casi todo SQLite + API Openpay
- `OpenpayMethods()` (ctor) — instancia `OrderMethods` y `DB`
- `SaveToValidateOpenpay(order)` — **SQLite** `openpay_orders`
- `SaveOpenpayStoresOrder(order)` — **SQLite** `openpay_stores`
- `CheckOrderOpenpay(incrementId, checkedCount, orderString)` — **API Openpay + SQLite + Curl**
- `CheckOrderStoresOpenpay(incrementId)` — **API Openpay**
- ⚠ `CheckStatus()` — SQLite + Openpay, pero llama `GetFailedStatus()` y `SetPedido()`
- ⚠ `CheckStoresStatus()` — SQLite + Openpay + Curl, pero llama `om.obtenerEstatusVenta` y `om.cancelamagento` (Intelisis)
- ⚠ `SetPedido(json)` *(private)* — llama `om.SetPedido` (Intelisis)
- ⚠ `GetFailedStatus()` *(private)* — `Connection.GetConfig("RECHAZAOPENPAY")` → **tabla `tablastd` en Intelisis**

### 3.7 `Metodos/OrderMethods.cs`

**Solo SQLite:**
- `SaveGuide(idEcommerce, fullName)` — `servicio_guias`
- `GetGuide(GuidesRequest)` — `servicio_guias`

**Solo ServicioAndroid:**
- `ObtenerNumeroTablaSms(cliente)` *(static, private)* — `TcAAEA00030_EnvioMensajes`

**Solo HTTP a DMZ:**
- `CallMagentoAuthorizationCallback(entityId, status, cuenta, idSolicitud)` *(static)* — `HttpClient` → `order/authorizationResult`

**Puro procesamiento (0 BD):**
- `ToArray(OrderRequest)` *(private)* — mapea el request a `string[]`
- `ValidateOnlyNumbers(numeros)` *(private)*
- `AgruparCantidadPorSKU(order)` *(private)*
- `totalArticulos(sArticulos)`
- `separarDatos(sCadenaASeparar, num, tot)`
- `sntz(sCadenaAValidar)`
- `CorreoErrorPrecio(uen, idecommerce, partidas, numpagos)` — arma HTML de correo; ⚠ el `enviar_correo` está **comentado**, y llama `detallePedido` (Intelisis)

**Todo lo demás es Intelisis:** `ManagePaynetOrders`, `GetOrdersData`, `ExecuteSP`, `InsertPaymentData`, `GetPosCancellations`, `GetIntelisisStatuses`, `InsertDetPedido`, `SetPedido`, `IsValidated`, `UpdateSetNoValidated`, `GetCreatedAccount`, `DatosEntregaInsert`, `detallePedido`, `crearPedido`, `setNameToReference`, `cancelamagento`, `GenerarMonedero`, `afectar`, `obtenerIdVenta`, `esCancelado`, `ReSetPedido`, `obtenerEstatusVenta`, `UpdateIdEcommerceEnVenta`, `GetCreditStatus`, `UpdateCreditOrderId`.

### 3.8 `Metodos/ProductMethods.cs` (3025 líneas)

**Solo SQLite (`data.db`):**
- `getParentAndAddTipo(sku, store)`, `GetChildTag(parentSku, store)`, `GetImages(sku)`, `GetStores(sku)`, `DeleteProducts()`, `GetAttributeSetId(name)`, `GetCategoryId(name, level, pos, parentId)`, `ExistAttribute(code)`, `GetFiltrableColor(sku, color, website)`, `GetAttributeValueId(code, label)`, `GetAttributeId(code)`, `GetChild(sku)`, `GetAndSavePrice(sku, uen, children)`, `isInMagento(sku, store)`, `GetWarranty(sku, storeView)`, `GetWebsites(sku)`, `IsMayoristaOrElite(sku)`, `DeleteWebsites()` *(⚠ código muerto)*

**Solo SQLite + Curl (generación y envío a Magento):**
- `BuildJsonAndSendConfigurable(uen)`
- `BuildJsonAndSend(uen)`
- `BuildJsonAndSendWithImage()`
- `uploadProductImages()`
- `BuildCSV(uen)`

**Filesystem / proceso externo:**
- `ProductMethods()` (ctor) — lee `config-delta.json`
- `createBackup()` — copia `data.db` → `old-data.db` → `old-data-bk.db`
- `runDelta(type, store, product_type)` — lanza `python.exe main.py`

**Cálculo puro:**
- `RoundAccordingPrice(valor)`
- `confiSlplit(text)` *(static)*

**Sí Intelisis:** `updatePrices`, `getSpecialPrices`, `getPricesCredit`, `updateStockJson`, `getStockStore`, `exporta_bundle`, `exporta_art`, `BuildCSVStock` *(muerto)*, `genera_reporte` *(muerto)*, `agruparconfigurables`, `existencias` *(muerto)*, `ejecutarSp`.

### 3.9 `Metodos/ProductImage/Methods.cs`

**Sin Intelisis:**
- `GetImages()` — SQLite + Curl + share `\\MAVIWEB01\ImagenesWEBMagento` *(⚠ código muerto)*
- `GetImagesBySku(sku)` *(private)* — SQLite `product_images`
- `searchAndUploadImage(image)` — Curl *(⚠ código muerto)*
- `uploadImagesToMagento()` — SQLite + Curl + filesystem
- `assingImages()` — Curl + JSON *(⚠ código muerto)*
- `deleteImages()` — SQLite
- `getImages(magento, original)` — **Impersonación Windows + copia desde `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\`**
- Clase `Impersonation` completa (`LogonUser`, `CloseHandle`, ctor, `Dispose`) — Win32 API
- Clases `ProductList`, `ProductImage`, `Extension_Attributes`, `Product_Images` — POCOs

**Sí Intelisis:** `uploadNewImagesToMagento()` (`ecommerceactualizarimagenes`), `imagenesmagento()`, `imagenesmagentoconf()`.

### 3.10 `Metodos/CustomerServiceMethods.cs`

**Solo ServicioAndroid:**
- `bitacoraAtencionClientes(request)` — `SP_ACTES_REGISTRO`
- `obtenerQuejas()` — `actes_catalogo_queja`

**Solo servicio externo:**
- `GetBBVAKeyAdvanced()` *(static)* — SOAP `WSeCommerceMX.asmx` / `GetMasterSeguridad`

**Puro procesamiento (0 BD):**
- `ocultarLetrasNombres(nombre)`
- `OcultarTelefono(telefono, numVisibles)`
- `FormatearDatos(listaFacturas)` *(static, private)* — agrupa por canal de venta
- `FiltrarPorFecha(facturas, clientNumber)` *(static, private)* — ⚠ llama a `obtenerMoratorioXPolitica` y `ObtenerEstadoPago` (esos sí van a Intelisis)
- `OrdenarDocumentos(facturas)` *(static)*
- `ToDouble(val)` *(static, private)*

**Sí Intelisis:** `obtenerTipoGarantia`, `guardarSoporte`, `obtenerVentanaConfirmacion`, `unirCuenta`, `validarCliente`, `nombreCliente`, `obtenerCreditos`, `GetAccountDebts`/`GetAccountDebtsSp`, `ApplyPaymentNeko`, `ApplyPaymentAdvanced`, `UpdateStatusPaymentNeko`, `UpdateStatusPaymentAdvanced`, `GetBBVAKeyNeko`, `LoginClienteCredito`, `LoginClienteCreditoFechaN`, `GetSTPAccount`, `GetSalesChannelsSTP`, `ValidateSTPAccount`, `obtenerMoratorioXPolitica`, `ObtenerEstadoPago`, `ValidarCoberturaPorCP`, `ObtenerEstatusEmbarque`, `GetEmpleadoByNomina`.

### 3.11 `Metodos/CustomerMethods.cs`
- `sntz(a)` — sanitizado de strings, sin BD
- `CreateCashReport(customerReportRequest)` — **Base64 → archivo + copia a `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\` con impersonación**
- *(Sí Intelisis: `ClientToIntelisis`, `blackwhitelist`)*

### 3.12 `Metodos/ServiceOrderMethods.cs`
- `generateWorkstation()` — **SQLite** tabla `workstation`
- `clearWorkstation(workstn)` — **SQLite**
- *(Sí Intelisis: `estaFacturado`, `sendReporte`, `insertReporte`, `afectarReporte`, `sendSolicitudDevolucion`, `borrarVentaCteD`, `InsertspVentaCte_Dev`, `fechaA`, `VentaCteDAceptar`, `UpdateVentaCteD`)*

### 3.13 `Metodos/StorePickup/CodigoRecogerSucursal.cs`
- `SendNotifyPickUpOrder(idOrder)` *(private)* — **Curl → `order/sendStorePickupEmail`**
- `GetRandomString()` — CRC/aleatorio, sin BD
- `RecogerEnSucursalCorreo(uen, correo, nombreCliente, orden, clave)` — arma HTML y envía **SMTP**
- `EnviarCorreo(datos, asunto, cuerpo, correos, rutaarchivo, html)` — **SMTP** (`server.mavi.mx`)
- `GenerarIdRecogerEnSucursal(IdEcommerce)` — genera código; sin conexión propia (delega en `GetCodigoDuplicado`, que sí es Intelisis)
- `NuevoCodigoRecogerSucursal(idEcommerce)` — orquestador (delega)
- Clases `OrderPickup`, `OrderDetailsPickup` — POCOs
- *(Sí Intelisis: `OrderId`, `GetPickUpCode`, `crearPrimerCodigoRecogerSuc`, `ValidaDuplicidadIdEcommerce`, `UpdatePickUpCode`, `GetCodigoDuplicado`, `GetDatosCte`, `GetDatosCteCorreo`)*

### 3.14 `Metodos/TagsMethods.cs`
- `GetTags(uen)` — **SQLite** tabla `tags`
- *(`generaEtiqueta()` es mixto: lee Intelisis `VTASDEtiqueta` y escribe SQLite; `executeCommand` es Intelisis)*

### 3.15 `Metodos/WarrantyMethods.cs`
- `getWarranties(store)` — borra en **SQLite** y delega
- *(`getFromDB(uen)` sí es Intelisis: `SPVTASexportaGarantiaampliada`)*

### 3.16 `Metodos/ProductStock/ActualizacionStock.cs`
- `isInMagento(sku, source_code)` *(private)* — **SQLite** (`product_in_stores`, `sucursales`)
- *(`GetCambiosExistencias(uen)` es mixto: SP de Intelisis + Curl a Magento)*

### 3.17 `Metodos/AppMercancias/MercanciaMethods.cs`
- `GetLimiteMercancia(cliente)` — **no consulta nada**, `// TODO: Query pendiente de ERP`, retorna `new List<object>()`
- *(Sí Intelisis: `GetConnection`, `GetAbonos`, `GetProximosPagos`, `GetSaldoVencido`, `ValidarTelefono`)*

### 3.18 `Controllers/ProspectoController.cs`
- `EncriptarNombre(nombreCliente)` *(static)* — enmascarado de texto, sin BD
- `QuitarAcentos(texto)` *(static)* — normalización Unicode, sin BD
- *(Sí Intelisis: `ObtenerRFC` → `spRegistroSugerir`; `RecuperarCuenta` → tabla `Cte`)*

### 3.19 `Controllers/OrdersController.cs` / `ProductsController.cs` — lógica in-controller sin BD
- `OrdersController.updateStatus` filtra `GenericOrderId = 11111` y hace `Curl.Post` (la parte Intelisis es `Provider.CompraArtVirtual`)
- `ProductsController.updateProducts` — orquestador: las llamadas a `Magento.*` son DMZ/SQLite; las de `ProductMethods.exporta_art/updatePrices/ejecutarSp` son Intelisis

---

## 4. ARCHIVOS 100% INTELISIS (para contraste)

`Metodos/FacturaMethods.cs`, `Metodos/RecommenderMethods.cs`, `Metodos/WalletCustomerMethods.cs`, `Metodos/WholesaleCustomerMethods.cs`, `Metodos/EstimatedDeliveryMethods.cs`, `Metodos/Order/Provider.cs`, `Metodos/AppMercancias/MercanciaMethods.cs` (salvo `GetLimiteMercancia`), `Controllers/WalletCustomerController.cs`, `Controllers/WholesaleCustomerController.cs`, `Controllers/RecomenderController.cs`.

---

## 5. HALLAZGOS ADICIONALES

1. **`sCadenaConexionMaster`** (IntelisisTmp en `172.16.202.25`) se declara y se asigna pero **nunca se usa** en todo el proyecto.
2. **Credenciales en texto plano**: `Conn/Connection.cs` (usuarios/passwords de 6 BD + credenciales de dominio para impersonación), `Web.config` (llaves de Openpay, JWT, passwords del Liberador), `CodigoRecogerSucursal.cs` (`webmaster@viu.mx` + password), `OrderMethods.CorreoErrorPrecio` (`webmaster9`), `maviCrypto` (llave 3DES hardcodeada).
3. **Código muerto identificado** (0 referencias): `Helper/Cadena.cs`, `Helper/Tool.cs`, `Properties/Querys.cs`, `Magento.getNoImageProduct`, `ProductImage.GetImages()`, `ProductImage.searchAndUploadImage`, `ProductImage.assingImages`, `ProductMethods.DeleteWebsites`, `ProductMethods.BuildCSVStock`, `ProductMethods.genera_reporte`, `ProductMethods.existencias`, `CredyPrestamoMethods.SeguroVida`, `Logger.purgeLogProductImport`, `Curl.ExistFile` (además retorna el literal `"response.Content"`).
4. **Validaciones neutralizadas**: `CreditMethods.CURPValidation` y `RFCValidation` tienen `return` en la primera línea → todo el código SQL posterior es inalcanzable. El endpoint `credit/ExistRFCAndPhoneCte` hoy siempre responde "puede continuar".
5. **Duplicación**: `Metodos/Credit/Methods.cs::CreditoWeb_SaveData` y `Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs::CreditoWeb_SaveData` son casi idénticos (mismo SP en ServicioAndroid, firmas distintas). Igual con `cte_prospecto()` duplicado en ambos.
6. **SQLite `data.db`** está versionado en el repo (51 MB en la raíz de `APIMagento`), pero en runtime se usa `C:\inetpub\wwwroot\api\data.db`.
7. **`Connection.GetConfig(tablaST)`** es la única función de `Connection` que consulta (tabla `tablastd` de Intelisis) y solo la usa `OpenpayMethods.GetFailedStatus`.

---

## 6. RESUMEN CUANTITATIVO

| Categoría | Cantidad |
|---|---|
| Archivos .cs totales (sin `obj/`) | 80 |
| Archivos 100% sin Intelisis | **48** (7 infra/seguridad, 7 helpers, 6 métodos/integración, 26 modelos y POCOs, 2 dead code) |
| Archivos mixtos (Intelisis + otras fuentes) | 22 |
| Archivos 100% Intelisis | 10 |
| Endpoints REST totales | 68 |
| Endpoints sin Intelisis (total o condicionalmente) | **18** |
| Conexiones distintas a Intelisis en uso | 6 BD/servicios + SQLite + DMZ + 3 APIs externas + SMTP + 3 shares SMB |
