---
tags: [LAN, mapeo, CustomerServiceController, nexo]
proyecto: APIMagento
actualizado: 2026-07-30
---

# CustomerServiceController — Índice de Mapeo

Índice raíz del controlador `CustomerServiceController` dentro del proyecto `MapeoLAN`. Cada endpoint tiene su propia subcarpeta con todos los métodos de su flujo documentados individualmente.

---

## 📊 CSV Global de Tablas

> Consolidado de todas las tablas tocadas por este controlador a través de todos sus endpoints.

[[_GLOBAL_CustomerServiceController_DB.csv]]

---

## 🔀 Endpoints Mapeados

### `POST /customerService/ApplyPaymentNeko`

Registra deudas pagadas (vía BBVA Neko) en la BD con estatus PENDIENTE. No aplica el pago en Intelisis directamente; es un pre-registro para conciliación posterior.

📁 Carpeta: `ApplyPaymentNeko/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[ApplyPaymentNeko/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada, logging PaymentBBVA y retransmisión a LAN |
| 02 | [[ApplyPaymentNeko/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[ApplyPaymentNeko/03_BusinessMethod]] | LAN | Business Method | SELECT anti-dup + INSERT por cada debt |
| 04 | [[ApplyPaymentNeko/04_Helper_ToDouble]] | LAN | Helper | Conversión string → double para el campo Monto |
| 05 | [[ApplyPaymentNeko/05_Helper_Logger_CustomerService]] | LAN | Helper | Logging en `customerService.log` |
| 06 | [[ApplyPaymentNeko/06_Helper_Logger_PaymentBBVA]] | LAN/DMZ | Helper | Logging en `paymentbbva.log` |

**CSV de BD:** [[ApplyPaymentNeko/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/UpdateStatusPaymentNeko`

Actualiza el estatus de pago (`CONFIRMADO` o `FALLIDO`) de todos los registros de un grupo de pago. Se llama una vez que BBVA confirma el resultado del cobro.

📁 Carpeta: `UpdateStatusPaymentNeko/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[UpdateStatusPaymentNeko/01_DMZ_Controller]] | DMZ | Controller | Proxy (sin logging PaymentBBVA, usa `Post()` estándar) |
| 02 | [[UpdateStatusPaymentNeko/02_LAN_Controller]] | LAN | Controller | Dispatcher sin validación de null |
| 03 | [[UpdateStatusPaymentNeko/03_BusinessMethod]] | LAN | Business Method | UPDATE con LIKE sobre referencia base → CONFIRMADO/FALLIDO |
| 04 | [[UpdateStatusPaymentNeko/04_Helper_Logger_CustomerService]] | LAN | Helper | Logging en `customerService.log` (solo en SqlException) |

**CSV de BD:** [[UpdateStatusPaymentNeko/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/ApplyPaymentAdvanced`

Registra deudas pagadas de BBVA en Intelisis (variante Advanced). A diferencia de Neko, este no tiene validación de duplicados y asigna el origen 'BBVA'.

📁 Carpeta: `ApplyPaymentAdvanced/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[ApplyPaymentAdvanced/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada, logging PaymentBBVA y retransmisión a LAN |
| 02 | [[ApplyPaymentAdvanced/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[ApplyPaymentAdvanced/03_BusinessMethod]] | LAN | Business Method | INSERT por cada debt (SIN validación anti-dup previa) |
| 04 | [[ApplyPaymentAdvanced/04_Helper_ToDouble]] | LAN | Helper | Conversión string → double para el campo Monto |
| 05 | [[ApplyPaymentAdvanced/05_Helper_Logger_CustomerService]] | LAN | Helper | Logging en `customerService.log` |
| 06 | [[ApplyPaymentAdvanced/06_Helper_Logger_PaymentBBVA]] | LAN/DMZ | Helper | Logging en `paymentbbva.log` |

**CSV de BD:** [[ApplyPaymentAdvanced/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/UpdateStatusPaymentAdvanced`

Actualiza el estatus de pago (`CONFIRMADO` o `FALLIDO`) usando `mp_reference` directa y tiene validación para evitar doble procesamiento.

📁 Carpeta: `UpdateStatusPaymentAdvanced/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[UpdateStatusPaymentAdvanced/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[UpdateStatusPaymentAdvanced/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[UpdateStatusPaymentAdvanced/03_BusinessMethod]] | LAN | Business Method | UPDATE exacto (sin LIKE) con SELECT preventivo |

**CSV de BD:** [[UpdateStatusPaymentAdvanced/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/GetSTPAccount`

Valida que el cliente tenga una cuenta STP válida y luego inserta un registro por cada deuda marcándolo con origen 'STP'. Llama internamente a `ValidateSTPAccount`.

📁 Carpeta: `GetSTPAccount/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[GetSTPAccount/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[GetSTPAccount/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[GetSTPAccount/03_BusinessMethod]] | LAN | Business Method | Llamada a helper + INSERT por deuda |

**CSV de BD:** [[GetSTPAccount/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/GetSalesChannelsSTP`

Consulta los canales de venta (`ID` en `CteEnviarA`) permitidos para un cliente y UEN dados.

📁 Carpeta: `GetSalesChannelsSTP/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[GetSalesChannelsSTP/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[GetSalesChannelsSTP/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[GetSalesChannelsSTP/03_BusinessMethod]] | LAN | Business Method | Consulta SELECT (Vulnerable a Inyección SQL) |

**CSV de BD:** [[GetSalesChannelsSTP/03_BusinessMethod_DB.csv]]

---

### `GET /customerService/ValidateSTPAccount`

Endpoint y helper que consulta la Cuenta CLABE (STP) encriptada de un cliente y la desencripta vía función nativa de SQL Server.

📁 Carpeta: `ValidateSTPAccount/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[ValidateSTPAccount/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada (vía QueryString) |
| 02 | [[ValidateSTPAccount/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[ValidateSTPAccount/03_BusinessMethod]] | LAN | Business Method | SELECT y llamada a función de desencriptación |

**CSV de BD:** [[ValidateSTPAccount/03_BusinessMethod_DB.csv]]

---

### `GET /customerService/bbvaKeyNeko`

Consulta la base de datos `master` para obtener una llave o token de seguridad.

📁 Carpeta: `bbvaKeyNeko/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[bbvaKeyNeko/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[bbvaKeyNeko/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[bbvaKeyNeko/03_BusinessMethod]] | LAN | Business Method | SELECT TOP 1 en master.dbo.dbacseguridad |

**CSV de BD:** [[bbvaKeyNeko/03_BusinessMethod_DB.csv]]

---

### `GET /customerService/bbvaKeyAdvanced`

Consulta a un servicio web SOAP (WSeCommerceMX) para obtener la Master Seguridad. No interactúa con BD.

📁 Carpeta: `bbvaKeyAdvanced/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[bbvaKeyAdvanced/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[bbvaKeyAdvanced/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[bbvaKeyAdvanced/03_BusinessMethod]] | LAN | Business Method | Petición SOAP vía RestClient a APIKEY_URL |

---

### `POST /customerService/obtenerTipoGarantia`

Consulta el tipo de garantía para un artículo (product_id) especificado.

📁 Carpeta: `obtenerTipoGarantia/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[obtenerTipoGarantia/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[obtenerTipoGarantia/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[obtenerTipoGarantia/03_BusinessMethod]] | LAN | Business Method | SELECT TOP 1 en VTASCProveedorActivoGarantia y Art |

**CSV de BD:** [[obtenerTipoGarantia/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/unirCuenta`

Actualiza el IDMagento de un Cliente en la base de datos de Intelisis.

📁 Carpeta: `unirCuenta/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[unirCuenta/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[unirCuenta/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[unirCuenta/03_BusinessMethod]] | LAN | Business Method | UPDATE en tabla Cte |

**CSV de BD:** [[unirCuenta/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/validarCliente`

Consulta y retorna el nombre completo enmascarado/oculto de un cliente validando que coincida el ID de Intelisis y el ID de Magento.

📁 Carpeta: `validarCliente/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[validarCliente/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[validarCliente/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[validarCliente/03_BusinessMethod]] | LAN | Business Method | SELECT en tabla Cte y lógica de enmascaramiento |

**CSV de BD:** [[validarCliente/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/nombreCliente`

Obtiene y enmascara el nombre y teléfono validados del cliente para propósitos de despliegue seguro (ej. front-end).

📁 Carpeta: `nombreCliente/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[nombreCliente/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[nombreCliente/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[nombreCliente/03_BusinessMethod]] | LAN | Business Method | SELECT en Cte y Helper (OrderMethods.IsValidated) |

**CSV de BD:** [[nombreCliente/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/validarCoberturaPorCP`

Valida, busca o enlista la cobertura de entrega (rutas Mavi) basándose en Código Postal, Estado o Delegación.

📁 Carpeta: `validarCoberturaPorCP/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[validarCoberturaPorCP/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[validarCoberturaPorCP/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[validarCoberturaPorCP/03_BusinessMethod]] | LAN | Business Method | Querys condicionadas (SELECT) sobre CodigoPostal |

**CSV de BD:** [[validarCoberturaPorCP/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/obtenerCreditos`

Obtiene el historial de solicitudes de crédito de un cliente para una UEN específica.

📁 Carpeta: `obtenerCreditos/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[obtenerCreditos/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[obtenerCreditos/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[obtenerCreditos/03_BusinessMethod]] | LAN | Business Method | Query masiva con múltiples JOINs en Venta, Cte, VentaD, etc. |

**CSV de BD:** [[obtenerCreditos/03_BusinessMethod_DB.csv]]

---

### `POST /customerService/ObtenerEstatusEmbarque`

Valida si un pedido (identificado por IDEcommerce) ha sido embarcado, consultando sus movimientos en Intelisis.

📁 Carpeta: `ObtenerEstatusEmbarque/`

| # | Archivo | Capa | Tipo | Descripción |
|---|---|---|---|---|
| 01 | [[ObtenerEstatusEmbarque/01_DMZ_Controller]] | DMZ | Controller | Proxy de entrada |
| 02 | [[ObtenerEstatusEmbarque/02_LAN_Controller]] | LAN | Controller | Dispatcher hacia el método de negocio |
| 03 | [[ObtenerEstatusEmbarque/03_BusinessMethod]] | LAN | Business Method | SELECT encadenado entre Venta y Embarque (Inyección SQL) |

**CSV de BD:** [[ObtenerEstatusEmbarque/03_BusinessMethod_DB.csv]]

---

## 🔗 Navegación

- Mapa raíz LAN: [[LAN - Mapa]]
- Carpeta raíz de mapeos: [[_ANALISIS_PREVIO/README]]
