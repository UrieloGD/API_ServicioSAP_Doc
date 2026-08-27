# Plan Maestro de Vinculación de Servicios (Magento -> DMZ -> SAP)

Este plan de implementación define la estrategia arquitectónica para adaptar, vincular y finalizar la comunicación entre las tres capas del ecosistema eCommerce, con el objetivo de erradicar la capa `LAN` (Intelisis) y enrutar todo el tráfico de `Magento` hacia `ServicioSAP`.

## 🏗️ 1. Arquitectura de Interacción (Cómo interactúan las 3 capas)

*   **1. Capa Magento (Frontend):** Es el orquestador de negocio de cara al usuario final. **NUNCA** se conecta directamente a SAP ni a LAN. Todas sus peticiones REST apuntan estáticamente a la base URL de la `DMZ` utilizando un Bearer Token único.
*   **2. Capa DMZ (Puente / API Gateway):** Es el middleware de seguridad. Recibe las peticiones de Magento y funciona como un "Switch" enrutador (Router). Internamente, la DMZ decide si hace un `curl.Post(...)` (legacy) o un `curl.PostSAP(...)` (nuevo) basado en la programación actual.
*   **3. Capa ServicioSAP (El Nuevo Core):** Es el motor puro de S/4HANA y bases de datos locales permanentes (Android DB / SQLite). Transforma el JSON atómico de la DMZ a los modelos OData V2 que entiende SAP (BP, SD, FI, DM).
*   **4. Manejo de Errores (Error Handling):** Para mantener la compatibilidad hacia atrás con Magento, si `ServicioSAP` atrapa un error crítico antes o durante la petición (ej. validación de stock fallida), el controlador sobreescribe la propiedad `Message` del JSON de salida con el valor interno `Zobservaciones`, asegurando que DMZ siempre reciba el texto real de la falla.
*   **🚫 Capa LAN (Legacy):** Conectada a Intelisis y SpAfectar. Debe ser asilada y apagada una vez que todo el ruteo de la DMZ apunte a SAP.

---

## 🚦 2. Análisis Detallado: Mapeo Exhaustivo de Equivalencias

A continuación, el listado riguroso de TODOS los métodos de la DMZ, organizado por fases.

### A. Los "Quick Wins" y Flujos 100% Migrados (Ya listos en SAP)
| Controlador DMZ             | Ruta Original (DMZ -> LAN)                     | Nueva ruta equivalente en SAP                  |
| :-------------------------- | :--------------------------------------------- | :--------------------------------------------- |
| `OrdersController`          | `order/cancelOrder`                            | `order/cancelOrder`                            |
| `OrdersController`          | `order/setOrder`                               | `order/new`                                    |
| `OrdersController`          | `order/returnOrder`                            | `order/setreturn`                              |
| `CustomerServiceController` | `credit/GetAccountDebts`                       | `credit/GetAccountDebts`                       |
| `CreditController`          | `credit/getClienteFactura/{cliente}/{factura}` | `credit/getClienteFactura/{cliente}/{factura}` |
| `WalletCustomerController`  | `customer/wallet/details`                      | `customer/wallet/details`                      |
| `CustomersController`       | `customer/setCustomer`                         | `partner/client`                               |

### B. El GAP Crítico (Flujos pendientes de construir en ServicioSAP)
Estas rutas se listan con su **Lógica Original en LAN** (Tablas y Procedimientos Almacenados exactos de Intelisis) para facilitar a los desarrolladores la construcción de su equivalencia en SAP.

#### 💳 Módulo de Crédito
| Controlador DMZ    | Ruta Original (DMZ -> LAN)        | Lógica Original en LAN (Intelisis / SQL)                                                                                                                | Nueva ruta equivalente en SAP |
| :----------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------- |
| `CreditController` | `credit/getClienteSaldo/{c}`      | Consulta a tabla `Cte` y `CteEnviarA`. *(Nota: Ya está aplicado el método para TZ01/parcialidades. Pendiente definición por Uriel sobre su uso exacto)* | **Por definir / OData FI-CA** |
| `CreditController` | `credit/getSms`                   | Ejecuta SP `VTASCodigoSMSEcommerce` para emitir y registrar SMS en tabla temporal.                                                                      | Por definir / MAVICBOSANDROID |
| `CreditController` | `credit/validateSms`              | Ejecuta SP `VTASCodigoSMSEcommerce` (Op validación) comprueba SMS.                                                                                      | Por definir / MAVICBOSANDROID |
| `CreditController` | `credit/codigoPromocion`          | Ejecuta SP `spVTASValidaPromocionWeb` o similar para checar validez de cupón.                                                                           | Por definir / SAP Promotions  |
| `CreditController` | `credit/codigoRecomendado`        | Ejecuta SP `spWebConsultaRecomendado` validando cliente en tabla `Cte`.                                                                                 | Por definir / SAP BP05        |
| `CreditController` | `credit/MonederoSaldoCredito`     | Consulta SP `spVTASMonedero` (o similar) saldo disponible.                                                                                              | Por definir / OData Monedero  |
| `CreditController` | `credit/GetUnificationWallet...`  | Consulta estatus en tablas transaccionales de monederos (`TarjetaMonedero`).                                                                            | Por definir / OData Monedero  |
| `CreditController` | `credit/CheckAccountsPreUnifi...` | Valida con `SELECT` en tabla `Cte` si ambas cuentas son de crédito.                                                                                     | Por definir / SAP BP          |
| `CreditController` | `credit/SetUnificationWalletData` | `INSERT INTO` en tabla temporal propia (ej. `VTAS_Monedero_Unifica`).                                                                                   | Por definir / SAP BP          |
| `CreditController` | `credit/SaveHaztenTransaction`    | `INSERT INTO` tabla local externa (Hazten).                                                                                                             | Por definir / SQLite          |
| `CreditController` | `credit/getCreditAccount/{pAcc}`  | Consulta a `Cte` usando la cuenta crédito.                                                                                                              | Por definir / SAP BP05        |
| `CreditController` | `credit/GetPhoneValidated...`     | SELECT a bitácora de SMS validados de Intelisis.                                                                                                        | Por definir / MAVICBOSANDROID |
| `CreditController` | `credit/GetCreditAmounts`         | Ejecuta SP de análisis de crédito (Ej. `spVTASCreditoDisponible`).                                                                                      | Por definir / OData FI        |
| `CreditController` | `credit/ExistRFCAndPhoneCte`      | Ejecuta consulta `SELECT` sobre tabla `Cte` buscando el RFC y Telefóno.                                                                                 | Por definir / SAP BP05        |
| `CreditController` | `credit/getPlazos`                | Consulta catálogos de enganches y `Condicion` de pago Intelisis.                                                                                        | Por definir / SAP FI          |
| `CreditController` | `credit/guardardocumento`         | `INSERT` a gestor de adjuntos Intelisis.                                                                                                                | Por definir / Archivos SAP    |

#### 🏢 Módulo de Órdenes
| Controlador DMZ | Ruta Original (DMZ -> LAN) | Lógica Original en LAN (Intelisis / SQL) | Nueva ruta equivalente en SAP |
| :--- | :--- | :--- | :--- |
| `OrdersController` | `order/ManagePaynetOrders` | Consulta y `UPDATE` de referencias en la tabla local `openpay_orders`. | Por definir / SQLite |
| `OrdersController` | `order/insertPaymentData` | `INSERT INTO` tabla de webhooks/pagos de transacciones bancarias. | Por definir / SQLite |
| `OrdersController` | `order/getIntelisisStatuses` | SP `spVTASMagento_EstatusPedido` que lee tabla `Venta` de Intelisis. | Por definir / OData SD01 |
| `OrdersController` | `order/getPosCancellations` | SP para conciliar y procesar cancelaciones del POS (`Venta` Estatus CANCELADO). | Por definir / OData SD01 |
| `OrdersController` | `order/getGuide` | Rastrea mediante SP o API externa la guía de la `Venta`. | Por definir / SQLite Local |
| `OrdersController` | `order/GetPickUpCode` | SP que genera PIN en tabla transaccional temporal. | Por definir / SAP PickUp |
| `OrdersController` | `order/updateCreditOrderId` | `UPDATE` al IdPedido web en la tabla transaccional (Orden crédito). | Por definir / SAP SD01 |
| `OrdersController` | `order/creditStatus/{id}` | SP `spVTASCreditoEstatus` o consulta sobre tabla de Autorizaciones. | Por definir / SAP FI |
| `OrdersController` | `order/estimated-delivery/{id}`| SP de cálculo logístico / Zonas de envío Intelisis. | Por definir / SAP Transporte |

#### 👥 Módulo de Customer Service
| Controlador DMZ   | Ruta Original (DMZ -> LAN)                | Lógica Original en LAN (Intelisis / SQL)                                                                 | Nueva ruta equivalente en SAP |
| :---------------- | :---------------------------------------- | :------------------------------------------------------------------------------------------------------- | :---------------------------- |
| `CustomerService` | `customerService/obtenerTipoGarantia`     | Ejecuta el SP `SpVTASEcommerceSolicitudGarantias`.                                                       | Por definir / SAP Equipos     |
| `CustomerService` | `customerService/unirCuenta`              | Ejecuta SP `spWebUnirCuenta` para fusionar dos cuentas.                                                  | Por definir / SAP BP Merge    |
| `CustomerService` | `customerService/validarCliente`          | Consulta a tabla `Cte` con SP de validación genérica.                                                    | Por definir / SAP BP05        |
| `CustomerService` | `customerService/nombreCliente`           | `SELECT Nombre, ApellidoPaterno... FROM Cte` en Intelisis.                                               | Por definir / SAP BP05        |
| `CustomerService` | `customerService/bitacoraAtencion...`     | Ejecuta SP `SP_ACTES_REGISTRO` de CRM Intelisis.                                                         | Por definir / SAP CRM         |
| `CustomerService` | `customerService/obtenerCreditos`         | Ejecuta SP (Ej. `SpCXCCalcAbonoCobXPol`) o consulta histórico `Venta`.                                   | Por definir / SAP FI-CA       |
| `CustomerService` | `customerService/obtenerQuejas`           | Retorna histórico de reportes de `Soporte` de Intelisis.                                                 | Por definir / SAP QM          |
| `CustomerService` | `customerService/ApplyPaymentNeko`        | *[Transaccional]* `INSERT INTO CXCCFacturaMultipagoBBVA` e invoca `spAfectar` / `SpCXCCalcAbonoCobXPol`. | Por definir / SAP FI          |
| `CustomerService` | `customerService/UpdateStatusPaymentNeko` | *[Transaccional]* `UPDATE CXCCFacturaMultipagoBBVA SET EstatusPago = 'CONFIRMADO'`.                      | Por definir / SAP FI          |
| `CustomerService` | `customerService/LoginClienteCredito`     | Consumo asíncrono a web service asmx (`WSeCommerceMX`) y SP Intelisis.                                   | Por definir / SAP BP05        |
| `CustomerService` | `customerService/GetSTPAccount`           | Consulta en SQL usando función desencriptadora `dbo.FnVTASDesEncripta(@CuentaClabeSTP)`.                 | Por definir / SAP FI CLABE    |
| `CustomerService` | `customerService/validarCoberturaPorCP`   | Consulta tabla de `Agente` o Zonas logísticas Intelisis.                                                 | Por definir / SAP Transporte  |
| `CustomerService` | `customerService/ObtenerEstatusEmbarque`  | Ejecuta SP `SpVTASEcommerceConsultaEmbarque` (O equivalente de Embarques).                               | Por definir / SAP Entregas    |

#### 📦 Módulo de Mercancías
| Controlador DMZ | Ruta Original (DMZ -> LAN) | Lógica Original en LAN (Intelisis / SQL) | Nueva ruta equivalente en SAP |
| :--- | :--- | :--- | :--- |
| `MercanciaController`| `mercancias/getAbonos` | Ejecuta SP enfocado a CXC y CxcD (Ej. `SpCXCCalcAbonoCobXPol`). | Por definir / SAP FI-CA EX01 |
| `MercanciaController`| `mercancias/getProximosPagos` | SP que calcula montos/fechas usando Vencimientos en Cxc de Intelisis. | Por definir / SAP FI-CA EX01 |
| `MercanciaController`| `mercancias/getSaldoVencido` | SP que obtiene la suma del Saldo Vencido leyendo CXC de Intelisis. | Por definir / SAP FI-CA EX01 |
| `MercanciaController`| `mercancias/getLimiteMercancia`| Ejecuta SP de evaluación financiera (`spVTASCreditoDisponible`). | Por definir / SAP FI |
| `MercanciaController`| `mercancias/ValidarTelefono` | Valida con `SELECT` que exista teléfono en la tabla `Cte`. | Por definir / SAP BP |

### C. Mapeo Físico de Bases de Datos Locales (LAN vs DMZ)
Estas 8 rutas **no** se comunicarán con S/4HANA. Su lógica depende exclusivamente de MAVICBOSANDROID (SQL Server) o SQLite, y deberán ser replicadas en `ServicioSAP` para poder apagar los controladores homólogos en la capa `LAN`.

**Instrucción de Migración:** La indicación estricta para estos métodos es que **se migre la lógica tal cual existe actualmente**, y se haga uso de las credenciales, conexiones y queries ya existentes en LAN, para reconstruirlos idénticamente en ServicioSAP, sin alterar la funcionalidad.

#### 📱 Módulo Android DB (Validación SMS)
| Endpoint Legacy | Ubicación Física DMZ | Ubicación Física LAN |
| :--- | :--- | :--- |
| `credit/getSms` | `[DMZ]\WebApiMagento\Controllers\CreditController.cs` (L68) | `[LAN]\WebApiMagento\Controllers\CreditController.cs` (L25) |
| `credit/validateSms` | `[DMZ]\WebApiMagento\Controllers\CreditController.cs` (L99) | `[LAN]\WebApiMagento\Controllers\CreditController.cs` (L47) |
| `credit/GetPhoneValidatedClientSecretName`| `[DMZ]\WebApiMagento\Controllers\CreditController.cs` (L290) | `[LAN]\WebApiMagento\Controllers\CreditController.cs` (L541) |

#### 🗄️ Módulo SQLite Local (Pasarelas y Logística)
| Endpoint Legacy | Ubicación Física DMZ | Ubicación Física LAN |
| :--- | :--- | :--- |
| `order/ManagePaynetOrders` | `[DMZ]\WebApiMagento\Controllers\OrdersController.cs` (L21) | `[LAN]\WebApiMagento\Controllers\OrdersController.cs` (L22) |
| `order/InsertPaymentData` | `[DMZ]\WebApiMagento\Controllers\OrdersController.cs` (L52) | `[LAN]\WebApiMagento\Controllers\OrdersController.cs` (L55) |
| `order/getGuide` | `[DMZ]\WebApiMagento\Controllers\OrdersController.cs` (L231) | `[LAN]\WebApiMagento\Controllers\OrdersController.cs` (L139) |
| `credit/SaveHaztenTransaction`| `[DMZ]\WebApiMagento\Controllers\CreditController.cs` (L264) | `[LAN]\WebApiMagento\Controllers\CreditController.cs` (L424) |
| `customerService/GetSTPAccount`| `[DMZ]\WebApiMagento\Controllers\CustomerServiceController.cs` (L231)| `[LAN]\WebApiMagento\Controllers\CustomerServiceController.cs` (L981) |

---

## 🛠️ 3. Plan de Implementación (Fases)

### Fase 1: Redirección de "Quick Wins" en la DMZ
En esta fase entraremos exclusivamente a la DMZ para cambiar de forma rigurosa las siguientes rutas, pasando de `curl.Post` a `curl.PostSAP(...)`:

1.  **`OrdersController`**
    *   Ruta `order/cancelOrder` apuntará hacia `order/cancelOrder`
    *   Ruta `order/setOrder` apuntará hacia `order/new`
    *   Ruta `order/returnOrder` apuntará hacia `order/setreturn`
2.  **`CustomerServiceController`**
    *   Ruta `credit/GetAccountDebts` apuntará hacia `credit/GetAccountDebts`
3.  **`CreditController`**
    *   Ruta `credit/getClienteFactura/{cliente}/{factura}` apuntará hacia `credit/getClienteFactura/{cliente}/{factura}`
4.  **`WalletCustomerController`**
    *   Ruta `customer/wallet/details` apuntará hacia `customer/wallet/details`
5.  **`CustomersController`**
    *   Ruta `customer/setCustomer` apuntará hacia `partner/client`

### Fase 2: Construcción del "GAP Crítico" en SAP
El levantamiento de los endpoints faltantes en `ServicioSAP` se construirá siguiendo estrictamente las directrices y reglas arquitectónicas maestras del skill (`lan-sap-migration`):

*   **Regla Absoluta de Migración (Intelisis -> SAP):** Se eliminará cualquier invocación heredada a `spAfectar` o inserciones/consultas línea por línea a tablas Transaccionales de Intelisis.
*   **Bases de Datos Locales (Reglas de Persistencia Temporal):**
    *   **Android DB (`MAVICBOSANDROID`):** Se configurará y utilizará **exclusivamente** para destrabar el bloqueo de SMS.
    *   **SQLite (OpenPay / Webhooks):** Se instanciará para mantener vivas las operaciones de rastreo de OpenPay y las intenciones de pago (`CXCCFacturaMultipagoBBVA`).
*   **Cero Consultas SQL a SAP:** El equipo de DMZ transformará sus objetos a JSON atómico, y todo el consumo hacia S4HANA se procesará por OData V2.
*   **Abstracción de Rutas y Puente DMZ:** Se respetará la regla #16. Todos los controladores nuevos en DMZ obligatoriamente usarán la función nativa `curl.PostSAP`.

### Fase 3: Switcheo Final
1.  Apuntar de manera final todas las rutas de la Fase 2 mediante `curl.PostSAP(...)` desde la DMZ hacia ServicioSAP.
2.  Aislar/Apagar permanentemente el ruteo hacia el proyecto LAN heredado.

---

## 🚫 4. Elementos Fuera de Alcance (Mantenimiento por Terceros)

**Módulo CrediLana:**
De acuerdo a las reglas arquitectónicas (Regla #15 Exclusión Estricta), todo el ecosistema perteneciente a CrediLana **no migrará hacia SAP** y queda explícitamente fuera del alcance de las responsabilidades. Rutas excluidas:
*   `credit/CreditoWeb_FormDatos`
*   `credit/CreditoWeb_SaveFirstData`
*   `credit/CreditoWeb_SaveData_Articulos`
*   `credit/CreditoWeb_Informacion`
*   `credit/CreditoWeb_Solicitud`
*   `credit/CreditoWeb_SolicitudPrimerGuardado`
*   `credit/CreditoWeb_Seguro`
*   `credit/CreditoWeb_SaveData`

## ❓ Open Questions
1.  **Ejecución:** Con esta descripción a fondo de las tablas SQL y SPs en LAN, ¿apruebas que arranquemos con la migración de código de la Fase 1?
