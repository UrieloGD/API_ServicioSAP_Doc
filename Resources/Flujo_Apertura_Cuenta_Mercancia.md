# Flujo de Apertura de Cuenta con Mercancía (Productos MX)

Este flujo se detona cuando un cliente completamente nuevo (Prospecto) realiza una compra de artículos y solicita la apertura de su línea de crédito en el mismo proceso (Checkout de Productos).

## 1. Endpoints Involucrados
*   **DMZ:** `POST https://[url-dmz]/credit/CreditoWeb_SaveFirstData` y `POST https://[url-dmz]/credit/CreditoWeb_SaveData_Articulos`
*   **LAN:** `POST http://[url-lan]/credit/CreditoWeb_SaveFirstData` y `POST http://[url-lan]/credit/CreditoWeb_SaveData_Articulos`

## 2. Request Body (Payload de Ejemplo)

### Paso 2.1: Guardado Inicial (SaveFirstData)
Se envía un arreglo con la información básica para iniciar el proceso de pre-calificación.

```json
{
  "op": "SaveFirstData",
  "data": [
    "0",              // [0] idSolicitud (0 si es nueva)
    "Juan",           // [1] nombre
    "Carlos",         // [2] nombre_2
    "Perez",          // [3] apellido_p
    "Gomez",          // [4] apellido_m
    "3312345678",     // [5] telefono_celular
    "1",              // [6] uen (Ej. 1 Mavi, 2 Viu)
    "1234",           // [7] nip
    "1",              // [8] validacion
    "WEB",            // [9] origen
    "0",              // [10] IdWEB_DATOS_TEMP
    "REST00105",      // [11] Articulo (opcional)
    "4859",           // [12] Importe (opcional)
    "juan@correo.com" // [13] Correo (opcional)
  ]
}
```

### Paso 2.2: Guardado de Artículos
Se adjuntan los artículos al prospecto recién generado.

```json
{
  "op": "InsertarArticulos",
  "data": [
    "Información complementaria del carrito (ej. 35 índices)"
  ],
  "articulos": [
    "1,REST00105" // Formato: "Cantidad,SKU"
  ],
  "prospecto": "P12345" // ID Generado en Intelisis
}
```

## 3. Stored Procedures (SPs) y Parámetros

### `SpCREDISolicitudWebPrimerGuardado`
Se ejecuta en el **SaveFirstData** para registrar en la tabla temporal.
**Parámetros:**
*   `@op`: "SaveFirstData"
*   `@idSolicitud`: 0
*   `@nombre`: "Juan"
*   `@nombre_2`: "Carlos"
*   `@apellido_p`: "Perez"
*   `@apellido_m`: "Gomez"
*   `@telefono_celular`: "3312345678"
*   `@uen`: 1
*   `@nip`: 1234
*   `@validacion`: 1
*   `@origen`: "WEB"
*   `@IdWEB_DATOS_TEMP`: 0
*   `@Articulo`: "REST00105"
*   `@Importe`: 4859
*   `@Correo`: "juan@correo.com"
*   `@Telefono`: "0"
*   `@ClaveMensaje`: ""

### `SP_GeneraConsecutivoCteMavi`
Usado internamente (`exec SP_GeneraConsecutivoCteMavi 'MAVI'`) para obtener el correlativo del nuevo cliente.

### `SpVTASInsertArtSolCreditoLinea`
Se ejecuta para atar los productos a la solicitud.
**Parámetros:**
*   `@IdCredito`: ID de la solicitud
*   `@Cantidad`: 1
*   `@Articulo`: "REST00105"
*   `@Condicion`: "12 M VIU PP"
*   `@Orden`: 1
*   `@SeguCost`: 0.0 (Costo del seguro)
*   `@Cp`: Código Postal del cliente

## 4. Tablas Afectadas
*   `WEB_DATOS_TEMP`: Tabla donde aterriza la captación del prospecto web antes de convertirse en cliente formal en Intelisis.
*   Tablas transaccionales de Solicitudes de Crédito donde se insertan los detalles (`Articulo`, `Cantidad`, `Condicion`).

---

## 5. Resumen Técnico del Flujo

| Elemento | Nombre en el Sistema |
| :--- | :--- |
| **SP Principal (Datos)** | `SpCREDISolicitudWebPrimerGuardado` |
| **SP Secundario (Consecutivo)** | `SP_GeneraConsecutivoCteMavi` |
| **SP Secundario (Artículos)** | `SpVTASInsertArtSolCreditoLinea` |
| **Tablas Afectadas** | `WEB_DATOS_TEMP`, Tablas de detalle de Solicitudes Web |
