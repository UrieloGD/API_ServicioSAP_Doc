# Mapeo del Endpoint: `POST /customerService/obtenerTipoGarantia`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomerServiceController` (archivo físico `CustomerServiceController.cs`)
**Método Principal:** `obtenerTipoGarantia(TipoGarantiaRequest request)` → invoca `WebApiMagento.Metodos.CustomerServiceMethods.obtenerTipoGarantia(TipoGarantiaRequest request)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El controlador está decorado con `[Authorize]` a nivel de clase y `[RoutePrefix("customerService")]` (`WebApiMagento\Controllers\CustomerServiceController.cs`, línea 9). La acción específica tiene `[HttpPost]` + `[Route("obtenerTipoGarantia")]` (líneas 14-15), por lo que la ruta completa es `POST /customerService/obtenerTipoGarantia`. El body se deserializa al modelo `WebApiMagento.Models.TipoGarantiaRequest` (`WebApiMagento\Models\CustomerServiceRequest.cs`, líneas 10-13), que tiene un único campo: `product_id` (string).

2. **Llamada a la capa de negocio:** El controlador instancia `CustomerServiceMethods` y ejecuta:
   ```csharp
   csm.obtenerTipoGarantia(request)
   ```
   El resultado (un `string` con JSON ya serializado) se vuelve a pasar por `JsonConvert.DeserializeObject(...)` y se envuelve en `Ok(...)` (línea 20). Es decir, hay una doble vuelta JSON: el método de negocio serializa manualmente a string, y el controlador la deserializa a un objeto dinámico antes de que Web API la vuelva a serializar como cuerpo de la respuesta HTTP. El resultado final visible para el cliente es equivalente al JSON producido por la capa de negocio.

3. **Ejecución de `CustomerServiceMethods.obtenerTipoGarantia`** (`WebApiMagento\Metodos\CustomerServiceMethods.cs`, líneas 37-115):
   - Instancia `Connection` y abre un `SqlConnection` sobre `conn.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`, línea 26): `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` — la conexión principal de Intelisis/ERP.
   - Ejecuta una consulta **SQL inline** (no es un Stored Procedure) vía `SqlCommand`/`ExecuteReader`, con un único parámetro `@ProductId` (`SqlDbType.VarChar`) mapeado a `request.product_id`:
     ```sql
     SELECT TOP 1
               pg.TipoGarantia,
               pg.Marca,
               pg.Telefono
             FROM VTASCProveedorActivoGarantia pg WITH (NOLOCK)
             INNER JOIN Art a WITH (NOLOCK)
               ON a.Proveedor = pg.Proveedor
               AND a.MarcaE = pg.Marca
               AND pg.Linea = a.Linea
             WHERE a.Articulo = @ProductId
             ORDER BY pg.TipoGarantia DESC
     ```
     Esta consulta busca, para el artículo (`Art.Articulo`) recibido como `product_id`, el/los proveedor(es) activos con garantía asociados (join por `Proveedor` + `MarcaE`/`Marca` + `Linea`), ordenando por `TipoGarantia` descendente y limitando a **1 sola fila** (`TOP 1`).
   - **Nota de comportamiento (relevante para migración a SAP):** el código arma un `while (dr.Read())` como si pudiera haber múltiples filas, pero el `TOP 1` de la consulta garantiza que el `SqlDataReader` nunca entregará más de una fila; en la práctica el bucle se ejecuta 0 o 1 vez.
   - Si hay fila (`dr.HasRows`):
     - `tipoGarantia` = columna `0` (`pg.TipoGarantia`). Si viene como cadena vacía `""`, se sustituye por el literal `"Proveedor"`.
     - Se agrega a `listObject` un objeto anónimo `{ nombre = columna 1 (pg.Marca), telefono = columna 2 (pg.Telefono) }`.
   - Si no hay filas, `tipoGarantia` queda como cadena vacía `""` y `listObject` queda como lista vacía `[]` (inicializada vía `JsonConvert.DeserializeObject<List<Object>>("[]")`).
   - Cierra el `SqlDataReader` y la conexión.
   - Arma la respuesta final como una lista de un solo elemento:
     ```csharp
     new { tipoGarantia = tipoGarantia, proveedores = listObject }
     ```
     y la serializa con `JsonConvert.SerializeObject(arrayRespuesta)` a un string JSON que representa un **arreglo con un único objeto**.
   - **Manejo de errores:** el método completo está en un `try/catch`. Ante cualquier excepción (p. ej. fallo de conexión SQL, timeout, `NullReferenceException` si `dr.GetString` falla por un valor `NULL` en `Marca`/`Telefono`), se registra vía `Logger.CustomerService("ERROR ", e.Message)` — que solo escribe a un archivo de log local (`C:\inetpub\wwwroot\log\customerService.log`, `WebApiMagento\Helper\Logger.cs`, líneas 134-139; no es una interacción de base de datos ni un servicio externo) — y `respuesta` se sobrescribe con el mensaje de excepción en texto plano (no JSON válido). En ese caso, el `JsonConvert.DeserializeObject(...)` del controlador fallaría o produciría un valor no estructurado; no hay manejo adicional de ese caso límite en el código actual.

4. **Salida del response:** El controlador retorna `Ok(...)` con el objeto ya deserializado desde el string JSON producido por la capa de negocio. No hay llamadas a servicios externos (Magento, SAP, LAN, Curl, etc.) ni ejecución de Stored Procedures en este flujo: toda la lógica de datos ocurre en una única consulta SQL inline sobre la conexión Intelisis.

## Interacciones con Base de Datos (Tablas y SPs)

No se ejecuta ningún Stored Procedure en este endpoint — toda la consulta es SQL inline sobre la conexión `Connection.sCadenaConexion` (Intelisis / `IntelisisTmp` en `MAVICUBOS.grupomavi.com`). Ambas tablas (`VTASCProveedorActivoGarantia`, `Art`) se leen directamente sobre esa misma conexión, sin servidor vinculado, por lo que ambas se clasifican como `Intelisis`.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/obtenerTipoGarantia, Intelisis, VTASCProveedorActivoGarantia, Select, "TipoGarantia, Marca, Telefono, Proveedor, Linea", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/obtenerTipoGarantia, Intelisis, Art, Select, "Articulo, Proveedor, MarcaE, Linea", ,
```

## Ejemplo de Respuesta (Response)

No existe un DTO/modelo tipado para la respuesta: se construye en tiempo de ejecución con objetos anónimos y se serializa manualmente con `JsonConvert.SerializeObject`. El resultado es un **arreglo JSON de un solo elemento**, con un objeto que contiene `tipoGarantia` (string) y `proveedores` (arreglo de 0 o 1 elementos, por el `TOP 1` de la consulta).

Caso con proveedor encontrado:

```json
[
  {
    "tipoGarantia": "Proveedor",
    "proveedores": [
      {
        "nombre": "NOMBRE_MARCA",
        "telefono": "5555555555"
      }
    ]
  }
]
```

Caso sin resultados (ningún proveedor activo con garantía para el `product_id` recibido):

```json
[
  {
    "tipoGarantia": "",
    "proveedores": []
  }
]
```
