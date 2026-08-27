# Borrador de Correo: Dudas Técnicas de Migración a SAP S/4HANA

**Asunto:** Dudas Técnicas Arquitectura DMZ -> SAP (GAP Crítico)

**Para:** Equipo de SAP / Arquitectura / Líderes Técnicos
**De:** Equipo de Desarrollo DMZ / Middleware
**Fecha:** [Fecha de envío]

Estimado equipo,

A continuación, detallamos las dudas técnicas específicas (GAP Crítico) que han surgido del análisis de los controladores de la DMZ y su actual comportamiento en LAN (Intelisis/SQL). Requerimos su apoyo para definir qué servicios de SAP (OData) cubrirán esta lógica.

### 🏢 1. Módulo de Órdenes (`OrdersController`)

*   **`order/updateCreditOrderId`**: Actualmente cuando un crédito es aprobado, eCommerce hace un `UPDATE` en las tablas `Venta` y `eCommerceDetPedidos` para reemplazar el ID temporal "CRED..." por el ID normal definitivo de Magento.
    *   **Duda Técnica:** ¿Se actualizará el documento de venta existente o se tendrá otro proceso? Necesitamos confirmar si habrá un servicio (ej. `PATCH` a `ZAPI_SALESORDER_SRV`) que permita actualizar este campo de referencia en el documento previamente creado, o si se definirá otra manera de realizar este enlazamiento al flujo oficial de pedidos.
*   **`order/getPosCancellations`**: Este método no existe en LAN actualmente.
    *   **Duda Técnica:** Al no existir en LAN, ¿Debemos crearlo desde cero consultando periódicamente algún OData de SAP para conciliar cancelaciones del POS?
*   **`order/estimated-delivery`**: LAN ejecuta consulta sobre la tabla `INVDPaqueteriaGuia`.
    *   **Duda Técnica:** ¿Cuál es la API de SAP que hace el cálculo de la fecha de entrega de la paquetería?
*   **`order/GetPickUpCode`**: LAN genera un PIN consultando la tabla `TrWDM0285_CteRecoge`.
    *   **Duda Técnica:** En los pedidos tipo "Recoger en Tienda" (PickUp), ¿Qué API de SAP podemos consultar e insertar esta información (PIN)?

### 💳 2. Módulo de Crédito (`CreditController`)

*   **`credit/getSms` / `validateSms`**: LAN hace un `INSERT` directo a la base de datos `MAVICBOSANDROID`.
    *   **Duda Técnica:** Como se hace un insert a mavicbosandroid, ¿se mantendrá de la misma forma o se usará algún servicio SAP?
*   **`credit/codigoPromocion`**: LAN ejecuta el SP `SpVTASVentaCupon`.
    *   **Duda Técnica:** ¿Magento seguirá encargándose de validar promociones, o SAP (vía el OData de Omnichannel/Promotions) calculará la validez del cupón directamente en el ERP?
*   **`credit/codigoRecomendado`**: LAN valida el código cruzando con la tabla `Cte`.
    *   **Duda Técnica:** ¿En qué campo extendido (custom) del OData de Business Partner (BP) de SAP se encuentra almacenado el código de referido o recomendador del cliente?
*   **`credit/MonederoSaldoCredito` / `GetUnificationWallet`**: LAN consulta saldos usando funciones escalares de Intelisis (`SpVTASMonedero`).
    *   **Duda Técnica:** ¿El programa de Monedero migrará nativamente a S/4HANA (Loyalty Management), o seguirá existiendo en una Base de Datos Local transaccional a la que debamos conectarnos?
*   **`credit/ExistRFCAndPhoneCte`**: LAN busca en la tabla `Cte` comparando RFC y Teléfono.
    *   **Duda Técnica:** Al consumir el OData de Business Partner, ¿están habilitados los filtros (`$filter=`) para poder buscar un cliente comparando RFC y Teléfono móvil simultáneamente?
*   **`credit/getPlazos`**: LAN consulta la tabla de `Condicion` de pago.
    *   **Duda Técnica:** ¿Existe un servicio OData que devuelva el catálogo dinámico de enganches y plazos de pago disponibles basado en el perfil y límite del cliente?

### 👥 3. Módulo de Customer Service (`CustomerServiceController`)

*   **`ApplyPaymentAdvanced` / `ApplyPaymentNeko`**: LAN hace un `INSERT` en la tabla `CXCCFacturaMultipagoBBVA`.
    *   **Duda Técnica:** ¿Por cuál API de SAP se reemplazará la inserción de la información de Multipago BBVA?
*   **`UpdateStatusPayment`**: LAN hace un `UPDATE` en `CXCCFacturaMultipagoBBVA` cambiando el estatus a 'CONFIRMADO'.
    *   **Duda Técnica:** ¿Por cuál API de SAP se reemplazará la Actualización de la información de Multipago BBVA?
*   **`obtenerTipoGarantia`**: LAN ejecuta el SP `SpVTASEcommerceSolicitudGarantias`.
    *   **Duda Técnica:** ¿Qué servicio OData se consultarán las garantías aplicables a los artículos?
*   **`unirCuenta`**: LAN actualiza el `IDMagento` en la tabla `Cte`.
    *   **Duda Técnica:** ¿Qué servicio OData debemos invocar para fusionar o ligar el ID de Magento al Business Partner en SAP?
*   **`bitacoraAtencionClientes` / `obtenerQuejas`**: LAN ejecuta el SP `SP_ACTES_REGISTRO`.
    *   **Duda Técnica:** ¿Qué API consulta las quejas como lo realizaba Intelisis?
*   **`validarCoberturaPorCP`**: LAN mapea el código postal contra rutas de distribución (`SpVTASEcommerceConsultaEmbarque`).
    *   **Duda Técnica:** ¿Cuál es la API de logística y transporte para validar si un código postal ingresado tiene cobertura de entrega?

Agradecemos de antemano su apoyo para definir estos flujos.

Saludos cordiales,

**[Atlas / Equipo de Desarrollo]**
