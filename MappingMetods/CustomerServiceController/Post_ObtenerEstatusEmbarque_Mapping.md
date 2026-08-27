# Mapeo del Endpoint: `POST /customerService/ObtenerEstatusEmbarque`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomerServiceController` (archivo físico `CustomerServiceController.cs`)
**Método Principal:** `ObtenerEstatusEmbarque(EstatusEmbarqueRequest request)` → invoca `WebApiMagento.Metodos.CustomerServiceMethods.ObtenerEstatusEmbarque(EstatusEmbarqueRequest request)` (método `static`)

## Flujo de Ejecución Detallado

1. **Entrada del request:** El controlador está decorado con `[Authorize]` a nivel de clase y `[RoutePrefix("customerService")]` (`WebApiMagento\Controllers\CustomerServiceController.cs`, líneas 8-9). La acción específica tiene `[HttpPost]` + `[Route("ObtenerEstatusEmbarque")]` (líneas 225-226), por lo que la ruta completa confirmada es `POST /customerService/ObtenerEstatusEmbarque`. El body se deserializa al modelo `WebApiMagento.Models.EstatusEmbarqueRequest` (`WebApiMagento\Models\CustomerServiceRequest.cs`, líneas 133-136), que tiene un único campo: `IdEcommerce` (string).

2. **Llamada a la capa de negocio:** El controlador ejecuta directamente (sin instanciar la clase, el método es `static`):
   ```csharp
   CustomerServiceMethods.ObtenerEstatusEmbarque(request)
   ```
   (línea 229). El resultado (un `string` con JSON ya serializado manualmente) se vuelve a pasar por `JsonConvert.DeserializeObject(...)` y se envuelve en `Ok(...)`. Igual que en otros endpoints de este controlador, hay una doble vuelta JSON: la capa de negocio serializa a string, el controlador la deserializa a un objeto dinámico, y Web API la vuelve a serializar como cuerpo de la respuesta HTTP.

3. **Ejecución de `CustomerServiceMethods.ObtenerEstatusEmbarque`** (`WebApiMagento\Metodos\CustomerServiceMethods.cs`, líneas 1905-1947). Este método **no tiene bloque `try/catch`** (a diferencia de la mayoría de los métodos vecinos en el mismo archivo) y **no llama a ningún Stored Procedure ni a ningún servicio externo** — toda la lógica son dos consultas SQL inline (`CommandType.Text`, por defecto) sobre la misma conexión abierta:
   - Instancia `Connection` y abre un único `SqlConnection` sobre `cnn.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`, línea 26): `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` — la conexión principal de Intelisis/ERP.
   - **Consulta 1** (busca el movimiento de venta asociado al pedido de e-commerce):
     ```sql
     SELECT top 1 V.MovID FROM Venta V with (nolock)
     WHERE V.IDEcommerce = '{request.IdEcommerce}'
     ORDER BY V.FechaEmision DESC
     ```
     El valor de `request.IdEcommerce` se concatena directamente en el string SQL (sin parametrizar — riesgo de SQL injection, relevante como nota de migración). Si `dr.HasRows` es `false` (no existe ninguna venta con ese `IDEcommerce`), el método retorna inmediatamente `JsonConvert.SerializeObject(false)`, es decir, el string `"false"`.
     Si hay filas, se lee `MovID` de la fila (el `while (dr.Read())` es funcionalmente equivalente a leer una sola fila porque la consulta ya trae `TOP 1`). Se cierra el `SqlDataReader` (`dr.Close()`), pero la conexión (`sqlConnection`) permanece abierta para la segunda consulta.
   - **Consulta 2** (busca si ese movimiento de venta tiene un embarque asignado):
     ```sql
     SELECT v.IDEcommerce FROM Embarque e WITH(NOLOCK)
     INNER JOIN EmbarqueMov em WITH(NOLOCK) ON e.ID = em.AsignadoID
     INNER JOIN Venta v WITH(NOLOCK) ON v.MovID = em.MovID AND v.Mov = em.Mov
     WHERE v.MovID = '{movId}'
     ```
     Si `drEstatus.HasRows` es `false` (el `MovID` encontrado en la consulta 1 no tiene ningún `Embarque`/`EmbarqueMov` asociado), el método retorna `JsonConvert.SerializeObject(true)`, es decir, el string `"true"`.
     Si hay filas, se recorre el reader y se acumula un `Dictionary<string,object>` con `IDEcommerce` por cada fila coincidente en `listData` (esta lista se construye pero **no se usa** para el contenido de la respuesta, solo para contar elementos).
   - **Retorno final del método:** `JsonConvert.SerializeObject(listData.Count <= 0)`. Dado que se llega a esta línea únicamente cuando `drEstatus.HasRows` fue `true`, `listData` siempre tendrá al menos 1 elemento en ese camino, por lo que esta expresión es **siempre `false`** en la práctica (el `Count <= 0` nunca se cumple una vez que se entró al bloque `HasRows == true`). Es decir, código muerto/redundante: cuando hay embarque asociado, el resultado observable es `false` sin importar cuántas filas coincidan.
   - La conexión `sqlConnection` está dentro de un bloque `using`, por lo que se cierra automáticamente al salir del método por cualquiera de los tres `return`.

4. **Resumen de la semántica observable:** el endpoint responde con un **booleano plano** (no un objeto):
   - `false` si no existe ninguna venta (`Venta`) con el `IdEcommerce` recibido.
   - `true` si la venta existe pero no tiene ningún `Embarque` asociado todavía.
   - `false` si la venta existe y ya tiene al menos un `Embarque` asociado.

5. **Salida del response:** El controlador retorna `Ok(...)` con el valor booleano ya deserializado desde el string JSON producido por la capa de negocio. No hay llamadas a servicios externos (Magento, SAP, LAN, Curl, etc.) ni ejecución de Stored Procedures en este flujo: toda la lógica de datos ocurre en dos consultas SQL inline consecutivas sobre la misma conexión Intelisis, sin manejo de excepciones explícito en este método.

## Interacciones con Base de Datos (Tablas y SPs)

No se ejecuta ningún Stored Procedure en este endpoint — ambas consultas son SQL inline sobre la conexión `Connection.sCadenaConexion` (Intelisis / `IntelisisTmp` en `MAVICUBOS.grupomavi.com`). Las tres tablas (`Venta`, `Embarque`, `EmbarqueMov`) se leen directamente sobre esa misma conexión, sin servidor vinculado, por lo que las tres se clasifican como `Intelisis`.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/ObtenerEstatusEmbarque, Intelisis, Venta, Select, "MovID, IDEcommerce, FechaEmision, Mov", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/ObtenerEstatusEmbarque, Intelisis, Embarque, Select, "ID", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/ObtenerEstatusEmbarque, Intelisis, EmbarqueMov, Select, "AsignadoID, MovID, Mov", ,
```

## Ejemplo de Respuesta (Response)

No existe un DTO/modelo tipado para la respuesta: el método de negocio serializa manualmente con `JsonConvert.SerializeObject` sobre un valor `bool` primitivo (no un objeto ni un arreglo). El cuerpo de la respuesta HTTP es, en los tres casos posibles, un literal JSON booleano plano:

Caso 1 — no existe venta con el `IdEcommerce` recibido:
```json
false
```

Caso 2 — la venta existe pero aún no tiene ningún embarque asignado:
```json
true
```

Caso 3 — la venta existe y ya tiene al menos un embarque asignado:
```json
false
```
