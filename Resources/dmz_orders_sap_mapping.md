# Mapeo de Ingeniería Inversa: DMZ OrdersController (LAN vs SAP)

Este documento centraliza el análisis de los endpoints del `OrdersController` en la DMZ que apuntan a LAN, definiendo la estrategia para sustituirlos con servicios OData de S/4HANA (ServicioSAP).

> [!NOTE]
> **Fuera de Alcance:** Todos los métodos relacionados a Bases de Datos Locales (`MAVICBOSANDROID` para SMS y `SQLite` para transaccional de pagos/guías) han sido excluidos de este mapeo, ya que su migración está asignada a otro equipo de trabajo.

---

### 1. Endpoint: `order/getIntelisisStatuses`
*   **Método LAN (C#):** `OrderMethods.GetIntelisisStatuses(List<string> incrementIds)`
*   **¿Qué hace en LAN?** Ejecuta un `SELECT` a la tabla `Venta` en Intelisis filtrando por un arreglo de IDs de Magento (`idEcommerce`).
*   **Valores que trae de vuelta (JSON Resultante):**
    El código mapea los resultados SQL a la clase `IntelisisStatus` y devuelve una lista con 4 propiedades exactas por cada orden:
    1.  `IdEcommerce`: El ID de Magento de la orden.
    2.  `Status`: El estatus literal en Intelisis (ej. "CONCLUIDO", "PENDIENTE").
    3.  `SucursalOrigen`: El código de la sucursal/planta de donde saldrá.
    4.  `Importe`: El monto monetario (Net Value).
*   **Estrategia SAP (S/4HANA):** 
> [!TIP]
    > **Se creará un nuevo endpoint en el controlador de SAP (`OrderController.cs`)** que respetará la misma ruta (`order/getIntelisisStatuses`) y payload original para que la DMZ se conecte sin cambios estructurales.
    > 
    > **Flujo de Ejecución:**
    > 1. Se recibirá el arreglo de IDs de Magento (`IncrementIds`).
    > 2. Por cada ID recibido, se construirá su llave SAP correspondiente `purchNoC` (con el formato `ZSD_{docType}_{incrementId}`). El `docType` estándar de Magento suele ser `ZMER`.
    > 3. Se invocará el método existente `SalesMethods.CheckDocumentExistsSD36Async(purchNoC)`, el cual ya realiza la consulta OData nativa al servicio `/ZAPI_DOCVTAS_CHECK_CDS`.
    > 4. Con la lista de respuestas (`List<SaleD>`), extraeremos las propiedades homólogas (Estatus de SAP, Planta/SucursalOrigen, y Valor Neto/Importe) para mapearlas al objeto `IntelisisStatus` y retornar el JSON esperado.

### 2. Endpoint: `order/creditStatus/{idSolicitud}`
*   **Método LAN (C#):** `OrderMethods.GetCreditStatus(int idSolicitud)`
*   **¿Qué hace en LAN?** Busca en la tabla `Venta` un registro con `Mov = 'Solicitud Credito'` y evalúa el campo `Estatus` para retornar un string simple.
*   **Valores que trae de vuelta:** Un simple string con el estatus del análisis: `"AUTORIZADO"`, `"RECHAZADO"` o `"EN_ANALISIS"`.
*   **Estrategia SAP (S/4HANA):** 
> [!TIP]
    > **Se reciclará el servicio OData SD36.** Al igual que en el Punto 1, como la solicitud de crédito nace como un Documento de Venta en SAP (con un `DocType` especial para crédito, ej. `ZCRE`), usaremos el mismo método `SalesMethods.CheckDocumentExistsSD36Async(purchNoC)`.
    > 
    > **Flujo de Ejecución:**
    > 1. Se recibirá el `idSolicitud` y se construirá su `purchNoC` (ej. `ZSD_ZCRE_{idSolicitud}`).
    > 2. Se consultará el OData SD36 llamando a `CheckDocumentExistsSD36Async`.
    > 3. Al obtener el documento `SaleD`, se accederá a la extensión de cabecera custom de SAP: `to_zsdt_vbak`.
    > 4. Se evaluará el campo **`Zidstatus`**.
    > 5. Se traducirá el código numérico a la nomenclatura oficial de SAP para retornar el string correspondiente:
    >    - Si `Zidstatus == "01"` ➡️ Retorna `"Pendiente"`
    >    - Si `Zidstatus == "02"` ➡️ Retorna `"Concluido"`
    >    - Si `Zidstatus == "03"` ➡️ Retorna `"Anulado"`

### 3. Endpoint: `order/updateCreditOrderId`
*   **Método LAN (C#):** `OrderMethods.UpdateCreditOrderId(string creditIncrementId, string incrementId, int entityId)`
*   **¿Qué hace en LAN?** Cuando un crédito es aprobado y Magento genera el pedido final, ejecuta 3 sentencias `UPDATE`. Actualiza el `IdEcommerce` en la tabla `Venta` y los campos `IdPedido` / `IdOrden` en la tabla `eCommerceDetPedidos`, reemplazando el ID antiguo temporal (que suele tener un prefijo como 'CRED...') por el ID definitivo de Magento.
*   **Valores que trae de vuelta:** La suma de las filas afectadas por los 3 `UPDATE`.
*   **Estrategia SAP (S/4HANA):** 
> [!TIP]
    > **Duda Técnica / Estrategia:** ¿Se actualizará el documento de venta existente o se tendrá otro proceso? 
    > Puesto que en LAN se actualizan las tablas `Venta` y sus detalles (relacionadas a SD), sabemos que actualmente el proceso de eCommerce actualiza el documento **después** de que se autoriza un crédito, reemplazando el ID temporal "CRED..." por el ID normal de Magento.
    > Es necesario confirmar con SAP si habrá un servicio (ej. `PATCH` a `ZAPI_SALESORDER_SRV`) que permita actualizar este campo de referencia en el documento previamente creado, o si se definirá otra manera de realizar este enlazamiento al flujo oficial de pedidos.

### 4. Endpoint: `order/estimated-delivery/{ecommerceId}`
*   **Método LAN (C#):** `EstimatedDeliveryMethods.GetEstimateDeliveryData(string ecommerceId)`
*   **¿Qué hace en LAN?** Ejecuta la consulta SQL: `SELECT TOP (1) Paqueteria, NoGuia, NoCodigoRastreo FROM INVDPaqueteriaGuia WITH(NOLOCK) WHERE MovId = @MovId` para estimar y calcular días de entrega.
*   **Valores que trae de vuelta:** JSON con rangos de entrega y paqueterías (ej. MinDays, MaxDays, Carrier).
*   **Estrategia SAP (S/4HANA):** 
> [!TIP]
    > **¿Que servicio de SAP o tabla reemplazaria la tabla INVDPaqueteriaGuia?

### 5. Endpoint: `order/GetPickUpCode`
*   **Método LAN (C#):** `CodigoRecogerSucursal.GetPickUpCode(string idEcommerce)`
*   **¿Qué hace en LAN?** Ejecuta la consulta SQL: `SELECT ClaveVenta FROM TrWDM0285_CteRecoge WITH (NOLOCK) WHERE idEcommerce = @idEcommerce` para generar un PIN numérico de seguridad.
*   **Valores que trae de vuelta:** Un string con el código numérico.
*   **Estrategia SAP (S/4HANA):** 
> [!TIP]
    > Se indico que se tiene que crear la tabla en devmavi sigmavi para su uso.

### 6. Endpoints OpenPay: `order/ManagePaynetOrders` y `order/insertPaymentData`
*   **Método LAN (C#):** `OrderMethods.ManagePaynetOrders` y `OrderMethods.InsertPaymentData`.
*   **¿Qué hace en LAN?** 
    *   `ManagePaynetOrders`: Recupera los estatus haciendo `SELECT idecommerce, ID, Estatus FROM venta WITH(NOLOCK) WHERE Mov = 'Pedido'`. Si el estatus es 'SINAFECTAR', invoca el SP `spAfectar` con `@Accion` 'AFECTAR' o 'CANCELAR'.
    *   `insertPaymentData`: Ejecuta un `INSERT INTO CXCCMensajeWebHookOpenPay (ClienteOpenPay, CargoOpenPay, Tipo, Importe, Fecha, Cobro, IDCXC) VALUES ...` para registrar el webhook.
*   **Valores que trae de vuelta:** Booleanos de éxito y cantidad de registros afectados (ej. `RecordsAffected`).
*   **Estrategia SAP (S/4HANA):** 
> [!TIP]
    > El servicio al consultar tabla de venta y ejecutar el spAfectar el cual quedo obsoleto,  ¿donde vamos a validar la informacion del estatus que hace lan?

---

## 👥 Módulo de Customer Service

### 1. Endpoint: `customerService/validarCliente`
*   **Método LAN (C#):** `CustomerServiceMethods.validarCliente(ValidarClienteRequest request)`
*   **¿Qué hace en LAN?** Ejecuta `SELECT TOP 1 ISNULL(PersonalNombres, ''), ISNULL(PersonalApellidoPaterno, '') FROM Cte WITH(NOLOCK) WHERE Cliente = @ClientIntelisis AND IDMagento = @ClientMagento`. Retorna true/false y valida existencia.
*   **Valores que trae de vuelta:** Un booleano (`true`/`false`) o datos básicos del cliente (si es requerido por el frontend).
*   **Estrategia SAP (S/4HANA):** 
    > [!TIP]
    > **Consulta Módulo BP05:** Se consumirá el OData **BP05** (Business Partner). En lugar de cruzar la tabla local `Cte`, se consultarán los datos maestros de SAP filtrando por el ID para extraer los nombres y apellidos reales del Business Partner y devolver la validación positiva hacia la DMZ.
