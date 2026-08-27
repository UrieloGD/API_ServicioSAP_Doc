# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /order/getIntelisisStatuses`

**Controlador/Clase:** `OrdersController`
**Método Principal:** `GetIntelisisStatuses(InvoiceDataRequest request)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe por POST un cuerpo JSON con el modelo `InvoiceDataRequest`, que contiene una lista de strings `IncrementIds`.
2. **Validación Inicial:**
   - Si la lista de IDs viene nula o vacía, retorna un HTTP 400 (`BadRequest`) indicando "No se proporcionaron IDs".
3. **Llamada a la lógica de negocio:** 
   - El controlador instancia `OrderMethods` e invoca al método `GetIntelisisStatuses(request.IncrementIds)`.
4. **Ejecución en Base de Datos (Validaciones Directas):**
   - El método establece conexión con la base de datos a través de `Connection().sCadenaConexion`.
   - Construye dinámicamente un `SELECT` usando la lista de `IncrementIds` separada por comas dentro de la cláusula `IN`.
   - Consulta la tabla `venta` buscando los folios de eCommerce que correspondan a facturas (`Mov LIKE 'Factura%'`).
   - El resultado llena una lista de objetos `IntelisisStatus` (IdEcommerce, Status, SucursalOrigen, Importe).
5. **Respuesta Final:**
   - Retorna un modelo `InvoiceDataResponse` serializado como JSON nativo.
   - Si ocurre una excepción, retorna un HTTP 500 (`InternalServerError`).

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
venta, Select, "idEcommerce, Estatus, OrigenSucursal, Importe", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Post_getIntelisisStatuses_Tablas.csv`)*

## Ejemplo de Petición (Request)

```json
{
  "IncrementIds": [
    "100012345",
    "100012346"
  ]
}
```

## Ejemplo de Respuesta (Response)

```json
{
  "Data": [
    {
      "IdEcommerce": "100012345",
      "Status": "Concluido",
      "SucursalOrigen": "02",
      "Importe": "1500.50"
    }
  ]
}
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
