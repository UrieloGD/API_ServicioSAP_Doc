# Flujo de Apertura de Cuenta sin Mercancía

Este flujo aplica cuando un usuario solicita un crédito web pero **sin tener artículos en el carrito**, es decir, ingresa directamente por el landing page de "Solicita tu crédito".

## 1. Endpoints Involucrados
*   **DMZ:** `POST https://[url-dmz]/credit/CreditoWeb_SaveFirstData` (y/o `CreditoWeb_SolicitudPrimerGuardado`)
*   **LAN:** `POST http://[url-lan]/credit/CreditoWeb_SaveFirstData`

## 2. Request Body (Payload de Ejemplo)

Solo se envían los datos iniciales de contacto e identidad. No existe la propiedad de artículos ni importes, por lo que el arreglo truncado se ve así:

```json
{
  "op": "SaveFirstData",
  "data": [
    "0",              // [0] idSolicitud 
    "Maria",          // [1] nombre
    "",               // [2] nombre_2
    "Lopez",          // [3] apellido_p
    "Gomez",          // [4] apellido_m
    "5512345678",     // [5] telefono_celular
    "1",              // [6] uen
    "5678",           // [7] nip
    "1",              // [8] validacion
    "WEB",            // [9] origen
    "0"               // [10] IdWEB_DATOS_TEMP
  ]
}
```

## 3. Stored Procedures (SPs) y Parámetros

### `SpCREDISolicitudWebPrimerGuardado`
Ejecutado con los mismos parámetros que el Flujo de Mercancía, pero los parámetros `@Articulo` y `@Importe` llegan vacíos o en cero por omisión.

**Parámetros que difieren:**
*   `@op`: "SaveFirstData"
*   `@Articulo`: ""
*   `@Importe`: 0.00
*   `@Correo`: "" (Si no viene en el índice 13)

### `SpCREDIDatosSolicitudCreditoArt`
Si durante el llenado web se invoca una operación para leer/escribir características complementarias de la solicitud, este SP maneja la transacción.

## 4. Tablas Afectadas
*   `WEB_DATOS_TEMP`: Todo el impacto ocurre a nivel prospecto/temporal. La solicitud se almacena a la espera de que el departamento de crédito la evalúe.
*   **NO** se tocan tablas de líneas de venta (Ej. `SpVTASInsertArtSolCreditoLinea` no es llamado).

---

## 5. Resumen Técnico del Flujo

| Elemento | Nombre en el Sistema |
| :--- | :--- |
| **SP Principal (Datos Iniciales)** | `SpCREDISolicitudWebPrimerGuardado` |
| **SP Secundario (Opcional Datos Extra)**| `SpCREDIDatosSolicitudCreditoArt` |
| **Tablas Afectadas** | `WEB_DATOS_TEMP` |
