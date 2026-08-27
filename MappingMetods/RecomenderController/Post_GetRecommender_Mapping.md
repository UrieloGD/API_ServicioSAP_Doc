# Mapeo del Endpoint: `POST /recommender/getRecommender`

**Controlador/Clase:** `WebApiMagento.Controllers.RecommenderController` (archivo físico `RecomenderController.cs`)
**Método Principal:** `GetRecommender(RecommenderIntelisis recommender)` → invoca `RecommenderMethods.GetRecommender(string op, string search, int uen, string nombre, string telefono, string parentesco)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint está declarado con `[Authorize]` a nivel de controlador, `[RoutePrefix("recommender")]` y, en la acción, `[HttpPost] [Route("getRecommender")]`. El body del request se deserializa al modelo `WebApiMagento.Models.RecommenderIntelisis` (`customerName`, `customerAccount`, `requestedCodes`, `uen`), definido en `WebApiMagento\Models\RecommenderRequest.cs`.

2. **Llamada a la capa de negocio:** El controlador instancia `RecommenderMethods` y llama:
   ```csharp
   cm.GetRecommender("9", recommender.customerAccount, 0, "", "", "")
   ```
   Nótese que del payload solo se utiliza `customerAccount` (mapeado al parámetro `search`); los campos `uen`, `nombre`, `telefono` y `parentesco` se envían fijos como `0`, `""`, `""`, `""` respectivamente, y la operación (`op`) se fija como `"9"`.

3. **Ejecución del método `RecommenderMethods.GetRecommender`** (`WebApiMagento\Metodos\RecommenderMethods.cs`, líneas 18-61):
   - Abre una `SqlConnection` usando `Connection.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`), que apunta a `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (coincide con el `USE [IntelisisTmp]` del SP).
   - Arma y ejecuta el `SqlCommand`:
     ```sql
     SpCREDICodigoRecomendador @opcion, @search, @Uen, @Nombre, @Telefono, @Parentesco
     ```
     con `@opcion='9'`, `@search=customerAccount`, `@Uen=0`, `@Nombre=''`, `@Telefono=''`, `@Parentesco=''` (los parámetros `@Aplicacion`, `@Cantidad`, `@FechaInicio`, `@FechaFin`, `@Nomina`, `@TipoCodigo` no se envían y toman sus valores DEFAULT del SP: `'WEB'`, `NULL`, `NULL`, `NULL`, `NULL`, `NULL`).
   - Usa `SqlDataReader.ExecuteReader()`. Si `HasRows`, itera todas las filas (se queda con los valores de la **última** fila leída, ya que no hace `break`):
     - `recommender.customerName = sqlDataReader.GetString(4)` → columna de índice 4 del result set.
     - `recommender.customerAccount = sqlDataReader.GetString(3)` → columna de índice 3 del result set.
   - Si ocurre `SqlException`, se captura y se loggea vía `Helper.Logger.CustomerService("ERROR ", e.Message)`; **no se relanza la excepción**, por lo que el flujo continúa con el objeto `recommender` en su estado por defecto (ambas propiedades `null`).
   - Cierra el `SqlDataReader` y la conexión.
   - Retorna `JsonConvert.SerializeObject(recommender)` — es decir, **ya retorna un string JSON serializado**, no el objeto tipado.

4. **Lógica del Stored Procedure `SpCREDICodigoRecomendador`** (rama `@opcion = 9`, líneas 222-233 del SP, comentada como *"CONSULTA LA INFORMACION CORRESPONDIENTE al cliente autentificado"*):
   ```sql
   SELECT PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno,
          Cliente, Nombre, NIPVenta
   FROM Cte WITH (NOLOCK)
   WHERE Cliente = @search;
   ```
   - Consulta la tabla `Cte` (catálogo de clientes de Intelisis) filtrando por `Cliente = @search` (código de cliente recibido como `customerAccount`).
   - El result set expone 6 columnas en este orden: `[0] PersonalNombres, [1] PersonalApellidoPaterno, [2] PersonalApellidoMaterno, [3] Cliente, [4] Nombre, [5] NIPVenta`.
   - Esto confirma que los índices usados en C# (`GetString(3)` y `GetString(4)`) corresponden exactamente a `Cliente` (→ `customerAccount`) y `Nombre` (→ `customerName`). Las columnas `PersonalNombres`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno` y `NIPVenta` se traen en el SELECT pero **no son consumidas** por la capa .NET.
   - Si no existe ningún cliente con `Cliente = @search`, el reader no tiene filas (`HasRows = false`) y el objeto `recommender` se devuelve con ambas propiedades en `null`.
   - El SP no realiza ninguna escritura (INSERT/UPDATE/DELETE) en esta rama; es de solo lectura.

5. **Salida del response:** El controlador envuelve el string ya serializado en otro `Ok(responseProcess)`. Como `responseProcess` es un `string` (JSON serializado manualmente dentro del método de negocio), ASP.NET Web API vuelve a serializar ese string como valor JSON, produciendo un **JSON anidado/doble-escapado** en el body de la respuesta HTTP (mismo patrón detectado en otros endpoints del mismo controlador, p. ej. `setRecommenderList`). El controlador **no tiene manejo de excepciones propio** en esta acción (a diferencia de `SetRecommenderList`), por lo que cualquier error no capturado por el `catch (SqlException)` interno del método de negocio provocaría un HTTP 500 estándar de Web API.

## Interacciones con Base de Datos (Tablas y SPs)

**SP ejecutado:** `SpCREDICodigoRecomendador` (rama `@opcion = 9`), base de datos `IntelisisTmp`.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.RecommenderController, POST /recommender/getRecommender, Intelisis, Cte, Select, "PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, Cliente, Nombre, NIPVenta", ,
```

## Ejemplo de Respuesta (Response)

El método de negocio serializa el objeto `WebApiMagento.Models.Recommender` (`customerName`, `customerAccount`) y ese string es envuelto nuevamente por `Ok()` del controlador, resultando en un JSON de tipo `string` (doble-serializado):

```json
"{\"customerName\":\"JUAN PEREZ LOPEZ\",\"customerAccount\":\"CW00001\"}"
```

Modelo equivalente si se deserializa el contenido interno (`Recommender`):

```json
{
  "customerName": "JUAN PEREZ LOPEZ",
  "customerAccount": "CW00001"
}
```

Caso sin coincidencia en `Cte` (cliente no encontrado) o error SQL capturado internamente:

```json
"{\"customerName\":null,\"customerAccount\":null}"
```
