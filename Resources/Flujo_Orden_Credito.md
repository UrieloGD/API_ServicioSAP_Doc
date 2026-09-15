# Análisis del Flujo de una Orden de Crédito

Este documento detalla el flujo de una orden de crédito de un cliente, abarcando desde la capa de Frontend en Magento (Origen) pasando por la capa expuesta en DMZ (Centinela) hasta la resolución lógica en LAN (Nexo) que conecta directamente con la base de datos y ERP Intelisis.

## 1. Capa Magento (Origen)
**Ubicación:** `C:\Users\urvalencia\dev\MagentoDev`

*   **Módulos Involucrados:** `Omnipro_MaviCredito`, `Mavi_CreditoCheckout`
*   **Método de Pago:** `omnipro_pago_credito`
*   **Flujo:**
    1.  Cuando un cliente realiza un checkout y selecciona la opción de "Crédito MAVI", el sistema registra el pago bajo el código `omnipro_pago_credito`.
    2.  Existen validaciones de frontend e integraciones en `Mavi_CreditoCheckout` para el llenado y pre-solicitud.
    3.  Al finalizar el flujo, se envía la información (SaveFirstData, Solicitar Crédito, etc.) a la DMZ.
    4.  Existe un proceso Cron (`Mavi\CreditoCheckout\Cron\PollCreditStatus.php`) encargado de consultar iterativamente (Polling) el estado de la solicitud y actualización del ID en caso de ser aprobado o liberado (`/updateCreditOrderId`).

## 2. Capa DMZ (Centinela) y Capa LAN (Nexo) - Endpoints Paso a Paso

El flujo principal de creación de la orden cuando el cliente presiona "Comprar" se divide en las siguientes peticiones. Se detalla el flujo tomando como base que DMZ sirve como pasarela hacia LAN (los payloads y responses son idénticos).

### PASO 1: Creación del Pedido (Pre-solicitud / Apartado)
**Endpoint DMZ:** `POST https://[url-dmz]/order/setOrder`
**Endpoint LAN:** `POST http://[url-lan]/order/setOrder`

*Cuando el cliente completa el checkout, Magento envía el detalle completo de la compra. (Nota: En crédito el método será `omnipro_pago_credito`).*

**Request Body (Ejemplo Saliente de Magento):**
```json
{
    "entityId": "62800",
    "incrementId": "12100049999",
    "storeId": "viu",
    "status": "payment_review",
    "subTotal": "4859",
    "total": "4859",
    "cuotas": "1",
    "impuesto": "0",
    "metodoPago": "omnipro_pago_credito",
    "costoEnvio": "0",
    "metodoEnvio": "tablerate_bestway",
    "articulos": [
        {
            "sku": "REST00105",
            "cantidad": "1",
            "precio": "4859",
            "precioEspecial": "0",
            "descuento": "0",
            "condicion": "12 M VIU PP"
        }
    ],
    "infoCliente": {
        "cuenta": "C00000020",
        "nombre": "Eve Luna",
        "cliente": "10138",
        "telefono": "3318855307",
        "direccion": "Chiapas ",
        "codigoPostal": "44260",
        "municipio": "GUADALAJARA",
        "estado": "Jalisco",
        "pais": "MX",
        "correo": "eve.luna.godoy@gmail.com",
        "colonia": "SAN MIGUEL DE MEZQUITAN",
        "referencia": "",
        "numExt": "1667",
        "numInt": "",
        "nombreClienteMavi": "Eve",
        "apellidoPaternoClienteMavi": "Luna",
        "apellidoMaternoClienteMavi": "Godoy",
        "telefonoClienteMavi": "3318855307",
        "entreCalles": "",
        "razonSocial": "",
        "idCarrito": "532252"
    },
    "codigoRecogerSucursal": "",
    "sucursalDestino": 0,
    "forzarOrder": "0",
    "state": null,
    "RedimirMonedero": 0.0,
    "Agente": null,
    "utmSource": "WEBSITE"
}
```

**Response (Ejemplo):**
```json
"C123456"
```
*(Nota: Devuelve un string que comienza con "C" seguido del ID del Pedido creado en Intelisis, o mensajes de error como `"PedidoExistente"` o `"sin cuenta"`).*

### PASO 2: Actualización de la Orden Aprobada (Cron Polling)
Una vez que el liberador de crédito aprueba la orden en el ERP, el cron de Magento se da cuenta e invoca este endpoint para actualizar el identificador temporal por el final.

**Endpoint DMZ:** `POST https://[url-dmz]/order/updateCreditOrderId`
**Endpoint LAN:** `POST http://[url-lan]/order/updateCreditOrderId`

**Request Body (JSON):**
```json
{
    "CreditIncrementId": "credit_12100049999",
    "IncrementId": "12100049999",
    "EntityId": 62800
}
```

**Response (Ejemplo):**
```json
3
```
*(Nota: Devuelve un número entero indicando el total de filas afectadas/actualizadas en las tablas de `Venta` y `eCommerceDetPedidos`).*
**Ubicación:** `C:\Users\urvalencia\dev\APIMagento`

Aquí reside la lógica de negocio real y la manipulación de base de datos.
*   **Archivos Involucrados:** `CreditMethods.cs`, `OrderMethods.cs`, `LiberadorCreditoMethods.cs`.
*   **Flujo General y Métodos:**
    1.  `CreditoWeb_SaveData` (dentro de `CreditMethods.cs`): Invoca la validación de montos, cliente y datos. Hace un llamado al Stored Procedure principal que interactúa con las tablas.
    2.  `UpdateCreditOrderId` (dentro de `OrderMethods.cs`): Función llamada cuando una orden ha sido validada/aprobada. 
    3.  `LiberadorCreditoMethods.cs`: Este submódulo tiene la función `LiberarCliente` que interactúa con un servicio externo o interno a través de REST (URL de autenticación y de venta, configurables) para conocer si una orden ha sido aprobada y retornar el status `AUTORIZADO`, `EN_ANALISIS` o `RECHAZADO`. Si el idVenta se crea en este paso externo, el Cron de Magento estará en Polling hasta que Intelisis tenga el pedido Liberado para crear la orden final.

## 3. Capa LAN (Nexo) y Base de Datos (Intelisis) - Flujos Específicos

En la capa LAN es donde la solicitud se bifurca dependiendo de la naturaleza del cliente y lo que está solicitando. Cada flujo interactúa de forma distinta con los Controladores, Métodos, Base de Datos (SPs) y Tablas en Intelisis.

**Consulta los documentos detallados para cada flujo (Endpoints, Request Bodies, Parámetros, SPs y Tablas):**

*   [[Flujo_Apertura_Cuenta_Mercancia]] - Flujo para prospectos/nuevos que se registran y compran artículos al mismo tiempo.
*   [[Flujo_Apertura_Cuenta_Sin_Mercancia]] - Flujo de llenado de formulario sin mercancía en el carrito.
*   [[Flujo_Credilana]] - Flujo de préstamos en efectivo con seguros asociados.
*   [[Flujo_Cliente_Casa]] - Flujo principal de venta a crédito para clientes con saldo pre-aprobado (Checkout Mavi/Viu).
