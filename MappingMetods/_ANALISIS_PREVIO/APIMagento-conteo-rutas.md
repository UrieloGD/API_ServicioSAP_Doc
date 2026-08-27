# APIMagento (LAN) — Conteo de rutas y trazado de conexiones

Proyecto: `C:\Users\dsvalle\source\repos\APIMagento\WebApiMagento`
Cruzado contra: `C:\Users\dsvalle\source\repos\APIMagentoDMZ\WebApiMagento`
Verificación de SPs ejecutada contra `MAVICBOSANDROID` (lecturas de catálogo).

> **Corrección**: en el primer documento reporté "68 endpoints REST" en APIMagento. El conteo real por atributos `[Route]` es **106**. Las tablas de abajo sustituyen esa cifra.

---

## 1. Total de rutas de APIMagento

| # | Controlador | Prefijo | Rutas |
|---|---|---|---|
| 1 | `CreditController` | `credit` | 31 |
| 2 | `CustomerServiceController` | `customerService` | 23 |
| 3 | `OrdersController` | `order` | 19 |
| 4 | `ProductsController` | `product` | 9 |
| 5 | `CustomersController` | `customer` | 7 |
| 6 | `MercanciaController` | `mercancias` | 5 |
| 7 | `WalletCustomerController` | `customer/wallet` | 3 |
| 8 | `RecomenderController` | `recommender` | 3 |
| 9 | `ProspectoController` | `prospecto` | 2 |
| 10 | `WholesaleCustomerController` | `company` | 2 |
| 11 | `LoginController` | `login` | 1 |
| 12 | `StatusController` | `status` | 1 |
| | **TOTAL** | | **106** |

Distribución por verbo: 97 `POST` · 9 `GET`.

---

## 2. Rutas con conexión a la DMZ

Se determinó extrayendo de la DMZ todas las llamadas `Curl.Post()`, `Curl.Get()` y `Curl.PostWithoutThrowingError()` (89 únicas, incluyendo una interpolada) y cruzándolas contra las 106 rutas de APIMagento.

| Situación | Rutas |
|---|---|
| **Consumidas por la DMZ** | **85** |
| Internas — no expuestas vía DMZ | 21 |
| **TOTAL** | **106** |

### 2.1 Detalle por controlador

| Controlador | Total | Consumidas por DMZ | Internas |
|---|---|---|---|
| `CreditController` | 31 | 30 | 1 |
| `CustomerServiceController` | 23 | 23 | 0 |
| `OrdersController` | 19 | 12 | 7 |
| `ProductsController` | 9 | 0 | 9 |
| `CustomersController` | 7 | 5 | 2 |
| `MercanciaController` | 5 | 5 | 0 |
| `WalletCustomerController` | 3 | 2 | 1 |
| `RecomenderController` | 3 | 3 | 0 |
| `ProspectoController` | 2 | 2 | 0 |
| `WholesaleCustomerController` | 2 | 2 | 0 |
| `LoginController` | 1 | 0 | 1 |
| `StatusController` | 1 | 1 | 0 |
| **TOTAL** | **106** | **85** | **21** |

### 2.2 Las 21 rutas internas (invocadas por crones, tareas o la propia LAN)

| Ruta | Controlador | Quién la invoca |
|---|---|---|
| `login/authenticate` | Login | La propia DMZ para autenticarse (no es proxy de negocio) |
| `credit/SaveCredilanaInfo` | Credit | Cron de recarga de catálogos a SQLite |
| `customer/getCuenta` | Customers | Uso interno / tareas |
| `customer/setCuenta` | Customers | Uso interno / tareas |
| `customer/wallet/getCuentaC/{idEcommerce}` | WalletCustomer | ⚠️ **Huérfana** — la DMZ llama `customer/getCuentaC/{x}` (prefijo incorrecto) |
| `order/checkOpenpay` | Orders | Cron de conciliación Openpay |
| `order/createStorepickupCode/{idEcommerce}/{idOrder}` | Orders | Cron |
| `order/generateNewStorepickupCode/{idEcommerce}` | Orders | Cron |
| `order/getOrderId/{idEcommerce}` | Orders | Cron |
| `order/getOrderInfoAndSet/{incrementId}` | Orders | Cron de reproceso de pedidos |
| `order/setOrderStatus` | Orders | Uso interno |
| `order/validateCredit` | Orders | ⚠️ La DMZ la llama por `HttpClient` directo, no por `Curl` |
| `product/updateProduct` | Products | Cron de importación de catálogo |
| `product/updateProductJsonOnly` | Products | Cron |
| `product/updatePrice` | Products | Cron |
| `product/updateConfigurableProduct` | Products | Cron |
| `product/updateStock` | Products | Cron |
| `product/updateStockMavi` | Products | Cron |
| `product/getStockByStore` | Products | Cron |
| `product/existenciasAlmacenArt` | Products | Cron |
| `product/obtenerImagen` | Products | Cron |

> **`ProductsController` completo (9 rutas) es interno**: todo el flujo de catálogo lo dispara un cron sobre la LAN, no Magento.

### 2.3 Llamadas de la DMZ sin ruta destino en APIMagento (4)

| Llamada desde la DMZ | Controlador DMZ | Problema |
|---|---|---|
| `customerService/ActualizarCamposConfigurables` | CustomerService | No existe en APIMagento |
| `customerService/InsertarDesdeTablerateNativo` | CustomerService | No existe en APIMagento |
| `customerService/InsertarDesdeTablerateCustom` | CustomerService | No existe en APIMagento |
| `customer/getCuentaC/{ordenCompra}` | WalletCustomer | Existe como `customer/wallet/getCuentaC` (prefijo y verbo distintos) |

---

## 3. De las rutas consumidas por la DMZ: Intelisis vs otros servicios

| Destino final | Rutas | % |
|---|---|---|
| **Intelisis** (`IntelisisTmp` en MAVICUBOS, directo o vía linked server `ERPMAVI`) | **72** | 84.7% |
| **Otros servicios** (ServicioAndroid, AdminDoc, SQLite, SMB, SOAP externo, sin BD) | **13** | 15.3% |
| **TOTAL consumidas por DMZ** | **85** | 100% |

### 3.1 Desglose por controlador

| Controlador | Consumidas por DMZ | → Intelisis | → Otros |
|---|---|---|---|
| `CreditController` | 30 | 22 | 8 |
| `CustomerServiceController` | 23 | 21 | 2 |
| `OrdersController` | 12 | 11 | 1 |
| `CustomersController` | 5 | 4 | 1 |
| `MercanciaController` | 5 | 5 | 0 |
| `RecomenderController` | 3 | 3 | 0 |
| `ProspectoController` | 2 | 2 | 0 |
| `WalletCustomerController` | 2 | 2 | 0 |
| `WholesaleCustomerController` | 2 | 2 | 0 |
| `StatusController` | 1 | 0 | 1 |
| **TOTAL** | **85** | **72** | **13** |

### 3.2 Desglose de los "otros servicios" por backend

| Backend | Rutas |
|---|---|
| ServicioAndroid (`mavicbosandroid`) | 2 |
| AdminDoc (`mavicbosandroid`) | 2 |
| SQLite local `data.db` | 3 |
| Filesystem + share SMB | 2 |
| SOAP externo `WSeCommerceMX` | 1 |
| Sin conexión a BD | 3 |
| **TOTAL** | **13** |

---

## 4. Conteo independiente: rutas que NO conectan a Intelisis

Incluye tanto las consumidas por la DMZ como las internas. Total en todo APIMagento: **18 rutas**.

| | Rutas |
|---|---|
| No-Intelisis consumidas por la DMZ | 13 |
| No-Intelisis internas (crones) | 5 |
| **TOTAL sin Intelisis** | **18** |
| Con Intelisis | 87 |
| `login/authenticate` (infraestructura, sin backend de negocio) | 1 |
| **TOTAL rutas APIMagento** | **106** |

### 4.1 Por controlador

| Controlador | Rutas sin Intelisis | De ellas vía DMZ | Internas |
|---|---|---|---|
| `CreditController` | 8 | 8 | 0 |
| `CustomersController` | 3 | 1 | 2 |
| `ProductsController` | 3 | 0 | 3 |
| `CustomerServiceController` | 2 | 2 | 0 |
| `OrdersController` | 1 | 1 | 0 |
| `StatusController` | 1 | 1 | 0 |
| **TOTAL** | **18** | **13** | **5** |

Controladores con **0 rutas** libres de Intelisis: `MercanciaController`, `WalletCustomerController`, `RecomenderController`, `ProspectoController`, `WholesaleCustomerController`.

### 4.2 Por controlador y método utilizado — detalle completo

#### `CreditController` — 8 rutas

| Ruta | Verbo | Método invocado | Archivo:línea | Destino real |
|---|---|---|---|---|
| `credit/SendSmsNewNumber` | POST | `CreditMethods.SendSmsNewNumber` | `CreditMethods.cs:1992` | ServicioAndroid — `TcAAEA00030_EnvioMensajes`, `VTASDCodigoVerificacioneCommerce` |
| `credit/SolicitudMercancia` | POST | `CreditMethods.SolicitudMercancia` | `CreditMethods.cs:610` | ServicioAndroid — `CRED_SOLICITUD_WEB_DATOS_TEMP` |
| `credit/GetCreditAmounts` | POST | `CredyPrestamoMethods.GetCredilanaInfo<T>` | `CredyPrestamoMethods.cs:833` | SQLite — `mavi_credilana_info` |
| `credit/CreditoWeb_FormDatos` ¹ | POST | `CredyPrestamoMethods.GetCredilanaInfo<T>` | `CredyPrestamoMethods.cs:833` | SQLite — `mavi_credilana_info` |
| `credit/CreditoWeb_Informacion` ¹ | POST | `CredyPrestamoMethods.GetCredilanaInfo<T>` | `CredyPrestamoMethods.cs:833` | SQLite — `mavi_credilana_info` |
| `credit/SaveImagesProductosMx` | POST | `CreditMethods.SaveImagesProductosMx` | `CreditMethods.cs:971` | Filesystem + AdminDoc `MAVI_DOC_CTE` |
| `credit/guardardocumento` | POST | `CreditMethods.GuardarDocumento` | `CreditMethods.cs:2605` | AdminDoc — `MAVI_DOC_CTE` |
| `credit/ExistRFCAndPhoneCte` ² | POST | `CreditMethods.ExistRFCAndPhoneCte` | `CreditMethods.cs:1414` | Ninguno — neutralizado |

#### `CustomersController` — 3 rutas

| Ruta | Verbo | Método invocado | Archivo:línea | Destino real | Vía DMZ |
|---|---|---|---|---|---|
| `customer/cashCustomerReport` | POST | `CustomerMethods.CreateCashReport` | `CustomerMethods.cs:194` | Filesystem + SMB `\\172.16.200.2` | Sí |
| `customer/getCuenta` | POST | `Magento.getCuenta` | `Conn/Magento.cs:309` | Curl → DMZ → Magento REST | No |
| `customer/setCuenta` | POST | `Magento.setCuenta` | `Conn/Magento.cs:319` | Curl → DMZ → Magento REST | No |

#### `ProductsController` — 3 rutas (todas internas)

| Ruta | Verbo | Método invocado | Archivo:línea | Destino real |
|---|---|---|---|---|
| `product/updateProductJsonOnly` | POST | `ProductMethods.BuildJsonAndSend` ×3 | `ProductMethods.cs:1839` | SQLite + Curl → DMZ |
| `product/updateConfigurableProduct` | POST | `Magento.deleteChildren` + `Magento.getChildren` + `ProductMethods.BuildJsonAndSendConfigurable` | `Conn/Magento.cs:253,260` · `ProductMethods.cs:1407` | SQLite + Curl → DMZ |
| `product/obtenerImagen` | POST | `ProductImage.Methods.getImages` | `ProductImage/Methods.cs:388` | Impersonación + SMB `\\172.16.202.4` |

#### `CustomerServiceController` — 2 rutas

| Ruta | Verbo | Método invocado | Archivo:línea | Destino real |
|---|---|---|---|---|
| `customerService/obtenerQuejas` | POST | `CustomerServiceMethods.obtenerQuejas` | `CustomerServiceMethods.cs:714` | ServicioAndroid — `ACTES_CATALOGO_QUEJA` |
| `customerService/bbvaKeyAdvanced` | GET | `CustomerServiceMethods.GetBBVAKeyAdvanced` | `CustomerServiceMethods.cs:1124` | SOAP externo `WSeCommerceMX.asmx` |

#### `OrdersController` — 1 ruta

| Ruta | Verbo | Método invocado | Archivo:línea | Destino real |
|---|---|---|---|---|
| `order/getGuide` | POST | `OrderMethods.GetGuide` | `OrderMethods.cs:736` | SQLite — `servicio_guias` |

#### `StatusController` — 1 ruta

| Ruta | Verbo | Método invocado | Archivo:línea | Destino real |
|---|---|---|---|---|
| `status/getStatus` | GET | Inline en el controlador | `StatusController.cs:12` | Ping ICMP a `172.16.202.2` — sin conexión SQL |

### 4.3 Métodos distintos involucrados

Las 18 rutas se resuelven con **15 métodos distintos** (`GetCredilanaInfo<T>` atiende 3 rutas):

| Método | Archivo | Rutas que lo usan | Backend |
|---|---|---|---|
| `CredyPrestamoMethods.GetCredilanaInfo<T>` | `CredyPrestamoMethods.cs:833` | 3 | SQLite |
| `CreditMethods.SendSmsNewNumber` | `CreditMethods.cs:1992` | 1 | ServicioAndroid |
| `CreditMethods.SolicitudMercancia` | `CreditMethods.cs:610` | 1 | ServicioAndroid |
| `CustomerServiceMethods.obtenerQuejas` | `CustomerServiceMethods.cs:714` | 1 | ServicioAndroid |
| `CreditMethods.SaveImagesProductosMx` | `CreditMethods.cs:971` | 1 | Filesystem + AdminDoc |
| `CreditMethods.GuardarDocumento` | `CreditMethods.cs:2605` | 1 | AdminDoc |
| `CustomerMethods.CreateCashReport` | `CustomerMethods.cs:194` | 1 | Filesystem + SMB |
| `ProductImage.Methods.getImages` | `ProductImage/Methods.cs:388` | 1 | SMB + impersonación |
| `OrderMethods.GetGuide` | `OrderMethods.cs:736` | 1 | SQLite |
| `ProductMethods.BuildJsonAndSend` | `ProductMethods.cs:1839` | 1 | SQLite + Curl |
| `ProductMethods.BuildJsonAndSendConfigurable` | `ProductMethods.cs:1407` | 1 | SQLite + Curl |
| `Magento.getCuenta` | `Conn/Magento.cs:309` | 1 | Curl → Magento |
| `Magento.setCuenta` | `Conn/Magento.cs:319` | 1 | Curl → Magento |
| `CustomerServiceMethods.GetBBVAKeyAdvanced` | `CustomerServiceMethods.cs:1124` | 1 | SOAP externo |
| `CreditMethods.ExistRFCAndPhoneCte` | `CreditMethods.cs:1414` | 1 | Ninguno |

---

## 5. Notas sobre la calidad del dato

¹ **`CreditoWeb_FormDatos` y `CreditoWeb_Informacion` son parciales**: resuelven contra SQLite solo para ciertos valores de `op`. El `return` final de ambos métodos cae en `CreditMethods` contra Intelisis. Si se cuentan como "con Intelisis", el total sin Intelisis baja de 18 a 16.

² **`ExistRFCAndPhoneCte` está neutralizado**: `CURPValidation` y `RFCValidation` tienen un `return` incondicional en su primera línea, así que hoy no consulta ninguna base. Si se reactivara la validación, pasaría a Intelisis.

**`status/getStatus`** no abre conexión SQL, pero hace ping precisamente al servidor de Intelisis. Tras la migración quedaría monitoreando el host equivocado.

### Rutas reclasificadas tras verificar los stored procedures

Estas 2 rutas figuraban como "sin Intelisis" en el análisis por cadena de conexión, pero los SPs alcanzan Intelisis por el linked server `ERPMAVI` → `MAVICUBOS`:

| Ruta | SP | Qué toca en Intelisis |
|---|---|---|
| `credit/validateSms` | `SPVTASCodigoSeguridadeCommerce` | `UPDATE Cte`, lee `Cte` y `CteTel` |
| `customerService/bitacoraAtencionClientes` | `SP_ACTES_REGISTRO` | Lee `Personal`, `INSERT` a `RM1138PendientesxValidar` |

También reclasificada: `credit/CreditoWeb_SaveFirstData` (SP `SpCREDISolicitudWebPrimerGuardado`).

### Rutas cuyo backend no existe (fallan en runtime)

| Ruta | Método | Objeto inexistente |
|---|---|---|
| `credit/getSms` (parcial) | `ProductosCredito_UpdateInfo`, `getClienteMagento` | `SpCREDIDatosSolicitudCreditoArt` |
| `credit/SaveHaztenTransaction` | `SaveHaztenTransaction`, `SaveHaztenMetaData` | `CREDIHBiometrico`, `CREDIDTransaccionMetaDato` (SIGMAVI) |

---

## 6. Resumen ejecutivo

```
APIMagento (LAN) ─ 106 rutas
├─ 85 consumidas por la DMZ (flujo Magento)
│   ├─ 72 terminan en Intelisis  ....................  84.7%
│   └─ 13 en otros servicios  ......................  15.3%
├─ 21 internas (crones y tareas)
│   ├─  5 sin Intelisis
│   └─ 16 con Intelisis
└─ Total sin Intelisis en todo el proyecto: 18 de 106  (17.0%)

Además: 4 llamadas de la DMZ apuntan a rutas que no existen en APIMagento.
```

**Lectura para la migración**: el 84.7% de lo que Magento consume termina en Intelisis. El 15.3% restante (13 rutas) puede quedarse donde está — son SQLite, ServicioAndroid, AdminDoc, archivos y un SOAP externo, ninguno afectado por la salida de Intelisis. Las 9 rutas de `ProductsController` no las toca Magento en absoluto: su consumidor es un cron, y su migración depende de los ~30 endpoints `product/*` y `ecommerce/*` que ServicioSAP ya tiene listos.
