# Flujo Cliente Casa (Cliente con Cuenta de Crédito Activa)

Este flujo es el principal para ventas de comercio electrónico. Se detona cuando el cliente ya tiene una cuenta y saldo pre-aprobado y decide generar el pedido de productos.

## 1. Endpoints Involucrados
*   **DMZ:** `POST https://[url-dmz]/order/setOrder`
*   **LAN:** `POST http://[url-lan]/order/setOrder`

Posteriormente, cuando la solicitud en Intelisis se libera, el Cron Job invoca:
*   **DMZ:** `POST https://[url-dmz]/order/updateCreditOrderId`
*   **LAN:** `POST http://[url-lan]/order/updateCreditOrderId`

## 2. Request Body (Payload Saliente de Magento)

### Paso 2.1: Generación de Pedido (`/order/setOrder`)
Magento envía el objeto JSON `OrderRequest` serializado con el detalle de artículos, subtotales e información del cliente de la base de Magento.

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

## 3. Stored Procedures (SPs) y Parámetros

### `SP_CREDITO_WEB_DATOS`
Se ejecuta bajo la operación `"Insert"` para validar cliente e insertar el pedido temporal restando saldos.
**Parámetros extraídos del body:**
*   `@Id`: 0
*   `@Op`: "Insert"
*   `@apellido_p`: "Luna" (De `apellidoPaternoClienteMavi`)
*   `@apellido_m`: "Godoy"
*   `@nombre`: "Eve"
*   `@rfc`: Extraído de base de datos
*   `@email`: "eve.luna.godoy@gmail.com"
*   `@direccion`: "Chiapas "
*   `@exterior`: "1667"
*   `@interior`: ""
*   `@codigo_postal`: "44260"
*   `@uen`: 2 (Viu)
*   `@condicion`: "12 M VIU PP"
*   `@cliente`: "C00000020"
*   `@idMagento`: "12100049999" (IncrementId)
*   `@MetodoEnvio`: "tablerate_bestway"

### `SpVTASInsertArtSolCreditoLinea`
Inserta los productos iterando el arreglo `articulos`.
**Parámetros:**
*   `@IdCredito`: (Devuelto por el paso anterior)
*   `@Cantidad`: 1
*   `@Articulo`: "REST00105"
*   `@Condicion`: "12 M VIU PP"

## 4. Tablas Afectadas (Actualización Final)
Una vez que en Intelisis se autoriza, el cron de Magento llama a `updateCreditOrderId`.
Aquí se aplican queries directos en ADO.NET (sin SPs formales) a las siguientes tablas transaccionales:
*   `Venta`: `UPDATE Venta WITH(ROWLOCK) SET IdEcommerce = @NuevoId WHERE IdEcommerce = @IdAntiguo`
*   `eCommerceDetPedidos`: `UPDATE eCommerceDetPedidos WITH(ROWLOCK) SET IdPedido = @NuevoId WHERE IdPedido = @IdAntiguo` y posteriormente `SET IdOrden = @EntityId WHERE IdPedido = @IncrementId`

---

## 5. Resumen Técnico del Flujo

| Elemento | Nombre en el Sistema |
| :--- | :--- |
| **SP Principal (Descuento/Aprobación)** | `SP_CREDITO_WEB_DATOS` |
| **SP Secundario (Artículos del Pedido)**| `SpVTASInsertArtSolCreditoLinea` |
| **Consultas SQL Directas (ADO.NET)**| Updates manuales a `Venta` y `eCommerceDetPedidos` |
| **Tablas Afectadas** | `Venta`, `eCommerceDetPedidos` |
