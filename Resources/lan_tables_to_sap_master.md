# Extracción de Código LAN: Tablas y SPs vs SAP S/4HANA
*(Análisis Crudo del Proyecto WebApiMagento)*

Este listado se construyó escaneando **directamente el código fuente C# del proyecto LAN** (específicamente `OrderMethods.cs`, `CreditMethods.cs`, `ProductMethods.cs`, etc.). Representa la totalidad de los comandos SQL (`SELECT`, `INSERT`, `UPDATE` y `SqlCommand`) que el código antiguo ejecuta, y su equivalente o estrategia de migración en la nueva arquitectura `ServicioSAP`.

---

## 1. Tablas Afectadas por Inline SQL (Consultas Directas C#)
*(Aquellas donde el código hace `SELECT`, `INSERT` o `UPDATE` directamente por ADO.NET)*

| Tabla LAN (SQL Query)                  | Uso en C#                                                                                                                        | Estrategia de Migración SAP                                                                                                               |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **`CteTel`**                           | `SELECT` y `UPDATE` para validar el teléfono del cliente al solicitar crédito.                                                   | **Descartada**. La validación del perfil del cliente (incluyendo el teléfono) se integra en SAP BP.                                       |
| **`TcAAEA00030_EnvioMensajes`**        | `SELECT` para verificar si el SMS fue enviado.                                                                                   | **Mantenida (Android DB)**. El flujo de validación de SMS se separa de SAP.                                                               |
| **`VTASDCodigoVerificacioneCommerce`** | `SELECT` del PIN de verificación de eCommerce.                                                                                   | **Mantenida (Android DB)**.                                                                                                               |
| **`Venta`**                            | `SELECT` histórico de `IDEcommerce`, `Estatus`, `Situacion`.<br/>`UPDATE` para reemplazar el `IdEcommerce` temporal por el real. | **Sustituida**. Para consultar estatus de pedidos, se consume el OData **SD36**. Para crear el pedido, se usa el Payload de **SD01**.     |
| **`eCommerceDetPedidos`**              | `UPDATE` para sincronizar los `EntityId` de Magento en las partidas.                                                             | **Descartada**. En SAP el Entity ID de Magento se envía como número de referencia de cliente al OData **SD01** al momento de la creación. |
| **`DM0312DatosEntrega`**               | `INSERT INTO` de los datos de la dirección de envío del pedido.                                                                  | **Absorbida**. Los datos viajan como nodos `PartnerFunctions` (Dirección de Entrega) en el OData **SD01**.                                |
| **`servicio_guias`**                   | `INSERT OR IGNORE` y `SELECT` de guías del pedido.                                                                               | **Mantenida (SQLite Local)**. Temporalmente para llevar el histórico de guías fuera del ERP.                                              |
| **`VTASDEcommerceExportaArtPrecio`**   | `SELECT` de precios directo de Intelisis en `ProductMethods`.                                                                    | **Sustituida (SD29/MM)**. La consulta de precios viaja vía OData de SAP, no a base de datos local.                                        |

---

## 2. Procedimientos Almacenados (Ejecutados vía `CommandType.StoredProcedure`)

| Nombre del Stored Procedure           | Propósito Legacy LAN                                                        | Equivalente SAP / Estrategia                                                                             |
| :------------------------------------ | :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **`SP_eCommerceNuevoPed`**            | Crea el pedido base, insertando cabeceras y detalles.                       | **Sustituido (SD01)**. Se envía un Payload JSON al OData ZAPI_SALESORDER.                                |
| **`SPVTASPedidosMagento`**            | Crea pedido en firme ignorando restricciones de precio.                     | **Sustituido (SD01)**.                                                                                   |
| **`SpVTASeCommerceDetPedidos`**       | Inserción previa de artículos antes de armar el pedido.                     | **Descartado**. S/4HANA recibe encabezado y detalles al mismo tiempo en el OData SD01.                   |
| **`spAfectar`**                       | Dispara toda la afectación de Inventario, Contabilidad, Cuentas por Cobrar. | **Descartado / Muerto**. SAP S/4HANA realiza sus afectaciones de manera nativa sin intervención del API. |
| **`SpWDM0285_CteRecoge`**             | Registra los datos de la persona que pasará a sucursal por Pickup.          | **Absorbido (SD01)**. Viaja en los textos de cabecera o como Interlocutor en el OData del pedido.        |
| **`SpVTASVentaCupon`**                | Valida códigos promocionales y los marca como usados.                       | **En Evaluación (Transición SigMavi / SAP Pricing)**.                                                    |
| **`xpVerificarMovMonederoMAVI`**      | Consulta si se debe cobrar usando puntos del Monedero.                      | **Sustituido (SD18)**. Se llama al API Inbound SD18 para consultar Saldo.                                |
| **`SP_DM0312TarjetaSerieMovMAVI`**    | Genera una tarjeta de deducción para el Monedero.                           | **Absorbido**. Lógica manejada por el motor contable al facturar / afectar.                              |
| **`spGenerarMovMonederoMAVI`**        | Afecta el saldo final en Intelisis.                                         | **Absorbido**.                                                                                           |
| **`SP_CREDITO_WEB_DATOS`**            | Registra y valida los datos de la solicitud de crédito del usuario.         | **Mantenido (Android DB)**. La solicitud de análisis de crédito se registra en `MAVIANDROID`.            |
| **`SpCREDIDatosSolicitudCreditoArt`** | Vincula artículos seleccionados al trámite de crédito.                      | **Mantenido (Android DB)**.                                                                              |
| **`SpCREDICodigoRecomendador`**       | Valida el programa de referidos.                                            | **En Evaluación (SAP)**.                                                                                 |
| **`SpVTASEcommerceExistencia`**       | Consulta de Stock (ATP).                                                    | **Sustituido (SAP MM)**.                                                                                 |
| **`SpVTASEcommerceStoreStock`**       | Consulta el inventario en una sucursal física.                              | **Sustituido (SAP MM)**.                                                                                 |
| **`SpVTASEcommercePrecio`**           | Valida el precio base del SKU.                                              | **Sustituido (SD29 / SAP Pricing)**.                                                                     |
| **`SPVTASHComparadorCategorias`**     | Categorías y metadatos de artículos.                                        | **Sustituido (SAP MM)**.                                                                                 |
| **`SpVTASSolicitudDevolucion`**       | Trámite de devoluciones eCommerce.                                          | **Sustituido (SD09)**. El OData SD09 crea devoluciones con DOC_TYPE ZDME.                                |
| **`SpINVRepServ`**                    | Taller o servicio.                                                          | **Fuera del alcance de eCommerce / Absorbido por Servicio MAVI**.                                        |

> [!TIP]
> **Resumen del Análisis de Código:**
> A diferencia del archivo anterior, este es un mapeo 1 a 1 de lo que existe actualmente "harcodeado" en los métodos de C#. Si encuentras una de estas tablas o SPs en el código que estás refactorizando, mira la columna derecha para saber exactamente si debes borrarla, pasarla a Android DB, OData (SD) o mantenerla en SQLite.

---

## 3. Dependencias del Flujo LAN eCommerce a SAP (SPs, Tablas y Sub-SPs)

Este apartado contiene el desglose técnico de todas las bases de datos, tablas y sub-procedimientos almacenados (Sub-SPs) que son ejecutados a lo largo del flujo de creación de órdenes y solicitudes de crédito en el sistema LAN (WebApiMagento).

### 3.1. Módulo: Creación de Pedidos (Contado / Base)

| Stored Procedure Principal | Tablas Afectadas / Consultadas | Sub-SPs Ejecutados (Dependencias) | Propósito en LAN |
| :--- | :--- | :--- | :--- |
| **`SP_eCommerceNuevoPed`** | `Venta`, `VentaD`, `Cte`, `CteTel`, `VentaCobro`, `MovTipo` | `SP_eCommerceCtenuevo`, `SP_InsertaTarjetaMonVirtual`, `spRedimirMovMonederoMAVI`, `spAfectar` | Creación del pedido eCommerce y encabezado. |
| **`SPVTASPedidosMagento`** | `Venta`, `VentaD`, `Cte`, `VentaCobro` | `SP_eCommerceCtenuevo`, `SP_InsertaTarjetaMonVirtual`, `spRedimirMovMonederoMAVI`, `spAfectar` | Variante para forzar la creación de pedido brincando validaciones de precio. |
| **`SpVTASeCommerceDetPedidos`** | `eCommerceDetPedidos`, `Art`, `VTASCRegionSku`, `VTASCCodigoPostalRegionCelular`, `eCommerceExist`, `VTASDEcommerceExportaArtExistencia`, `ecomerceexportaart` | *(Ninguno)* | Pre-inserción de partidas, validación de stock y mutación de SKU regional (Celulares). |
| **`SpWDM0285_CteRecoge`** | `TrWDM0285_CteRecoge` | *(Ninguno)* | Guarda los datos de la persona que recoge en sucursal (Pickup). |
| **`SpVTASVentaCupon`** | `VTASCVentaCupon`, `Comercializadora.dbo.Personal`, `TablaStD`, `Agente`, `Sucursal` | `SpVTASVentaCupon` (recursividad para generar cupón de promotor) | Valida códigos promocionales y números de nómina, y los marca como utilizados. |

### 3.2. Módulo: Crédito Web y SMS (Android DB / Intelisis)

| Stored Procedure Principal | Tablas Afectadas / Consultadas | Sub-SPs Ejecutados (Dependencias) | Propósito en LAN |
| :--- | :--- | :--- | :--- |
| **`SP_CREDITO_WEB_DATOS`** | `VTASdArtCreditoWeb`, `MAVIANDROID01` (Varias tablas) | *(Lógica interna en Android DB)* | Guarda la solicitud de crédito con datos generales y cruza validación SMS. |
| **`SpCREDIDatosSolicitudCreditoArt`** | `Cte`, `CteTel`, `Venta`, `Art` | *(Ninguno)* | Extrae saldos, límites de crédito e historial del cliente antes de cotizar. |
| **`SpVTASInsertArtSolCreditoLinea`** | `VTASdArtCreditoWeb` | *(Ninguno)* | Vincula los artículos seleccionados en el carrito hacia la solicitud de crédito en BD Android. |

### 3.3. Módulo: Monedero y Saldos (OpenPay / MAVI)

| Stored Procedure Principal | Tablas Afectadas / Consultadas | Sub-SPs Ejecutados (Dependencias) | Propósito en LAN |
| :--- | :--- | :--- | :--- |
| **`xpVerificarMovMonederoMAVI`** | `TarjetaSerieMov` | *(Ninguno)* | Consulta si el cliente decidió cobrar parcial o totalmente con saldo del monedero. |
| **`spGenerarMovMonederoMAVI`** | `Monedero` (Módulo Intelisis), `Venta` | `spAfectar` (internamente para contabilidad) | Efectúa la transacción de reducción de puntos en el saldo del monedero. |
| **`SP_DM0312TarjetaSerieMovMAVI`** | `TarjetaSerieMov` | *(Ninguno)* | Genera el folio y registro de la deducción temporal del monedero electrónico. |

### 3.4. Módulo Core Intelisis (Afectación - Deprecado)

| Stored Procedure Principal | Tablas Afectadas / Consultadas | Sub-SPs Ejecutados (Dependencias) | Propósito en LAN |
| :--- | :--- | :--- | :--- |
| **`spAfectar`** | *(Cientos de tablas de Inventario, Contabilidad, Clientes y Cuentas por Cobrar)* | `spAntesAfectar`, `spInv`, `spCx`, `spCont`, `spDinero`, `spEmbarque`, `spGasto`, `spDespuesAfectar` | Motor core de Intelisis ERP para procesar inventarios, contabilidad y facturación. (Reemplazado 100% por SAP S/4HANA). |


---

## Anexo: Matriz de Equivalencias (�rdenes LAN vs SAP)

# Planificación de Migración: Módulo de Órdenes a SAP
**(Migrated Order Module to SAP)**

Este documento es mantenido por el **[Subagente_Planificador_SAP]**. Su objetivo es cruzar los hallazgos del *Auditor SQL* y el *Analista Lógica* con la arquitectura del nuevo proyecto `ServicioSAP` (.NET 4.7.2) para identificar equivalencias, Gaps y la estrategia de reescritura.

## 1. Estado de la API Actual (ServicioSAP)
**Ubicación Escaneada:** `c:\Users\magalindo\Documents\Migracion SAP\ServicioSAP\ServicioSap\ServicioSap\`

### 1.1 Controladores Existentes
* `OrderController.cs`: *(Pendiente de escaneo profundo)*

### 1.2 Métodos y Contratos Existentes
* `OrderMethods.cs`: *(Pendiente de escaneo profundo)*

## 2. Matriz de Equivalencias (Intelisis vs SAP)
Basado en el análisis comparativo, el enfoque de SAP elimina las inserciones a base de datos línea por línea y en su lugar envía estructuras anidadas atómicas (JSON/XML) a través de los módulos nativos de SAP.

| Entidad / Proceso LAN (Legacy) | Componente SAP (Nuevo .NET 4.7.2) | Estrategia / Mapeo |
| :--- | :--- | :--- |
| `SP_eCommerceNuevoPed`, `SPVTASPedidosMagento` | **Módulo SD (Sales and Distribution)** | Eliminados. SAP se encarga de crear la orden y detalle al enviar el JSON mediante el namespace `ServicioSap.Models.SAP.Order`. |
| `spAfectar` | **Módulo Legacy (Base de Datos por definir)** | **Mantenido**. A pesar de la existencia de SD, este SP se conservará tal cual en el código C# para orquestar los procesos legados post-orden. Se definirá la BD destino. |
| Tablas `Venta`, `VentaD`, `VentaEntrega`, `VTASCVentaCupon` | **Objeto `OrderModel` (Payload Atómico)** | Ya no hay inserts separados. `VentaD` se mapea a la colección `to_items` del request de SAP. La dirección se va dentro del nodo del cliente en el Payload. |
| Tablas `Cte`, `TrWDM0285_CteRecoge`, `DM0312DatosEntrega` | **Módulo BP (Business Partner)** | La validación de cliente e inserción de domicilio se delega a `ServicioSap.Methods.BusinessPartner`. SAP BP centraliza esto. |
| Tablas `Art`, `eCommerceExist`, `VTASCRegionSku` | **Módulo MM (Material Management)** | El mapeo regional y de existencias se maneja a través de `ProductMethods` llamando a BAPIs/OData del módulo MM. |
| Base de Datos SQLite (`openpay_orders`, `servicio_guias`) | **SQLite Local (Mantenido temporalmente)** | Estas tablas que guardan rastros temporales de webhooks y guías se reescribirán pero mantendrán su naturaleza de SQLite. |

## 3. Estrategia de Refactorización a SAP (.NET 4.5 -> .NET 4.7.2)
Tras revisar el borrador actual en `ServicioSAP\Methods\Order\OrderMethods.cs`, esta es la arquitectura que el **[Subagente_Planificador_SAP]** ejecutará:

1. **Eliminación de la Fase Transaccional SQL (Cero `ExecuteSP`)**: 
   Todo rastro de `SqlCommand`, `ExecuteReader` y dependencias a ADO.NET contra tablas de venta será purgado. Todo esto es absorbido por SAP al momento de crear la orden.
2. **Construcción de JSON Atómico (`BuildSapOrder`)**: 
   En LAN, el detalle del pedido se insertaba artículo por artículo. En la nueva API, armaremos un modelo fuerte `OrderModel` que contendrá el encabezado y una lista `to_items` con los detalles.
3. **Delegación de Reglas a SAP**:
   Reglas duras de negocio como "validar si hay existencia" o "sumar impuestos de cierta zona" (`ZonaImp`) ya no se calcularán en el backend de C#. Le pasaremos la tienda, el método y el sku a SAP, y su motor interno de *Pricing* hará el cálculo.
4. **Desacoplamiento de Servicios de Terceros (OpenPay / SMS)**:
   Las funciones periféricas como envío de SMS (`TcAAEA00030_EnvioMensajes`) o Webhooks se mantendrán aisladas en la conexión secundaria de Android/SQLite, evitando contaminar el payload de SAP.
