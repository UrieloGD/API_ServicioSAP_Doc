# Mapeo del Endpoint: `POST /recommender/setCodes`

**Controlador/Clase:** `WebApiMagento.Controllers.RecommenderController` (archivo físico `RecomenderController.cs`)
**Método Principal:** `setCodes(RecommenderIntelisis recommender)` → invoca `RecommenderMethods.TraerCodigosRecomendadoscliente(string op, string search, int uen, string aplicacion, int cantidad)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint está declarado con `[Authorize]` a nivel de controlador, `[RoutePrefix("recommender")]` y, en la acción, `[HttpPost] [Route("setCodes")]` (`WebApiMagento\Controllers\RecomenderController.cs`, líneas 40-48). El body se deserializa al modelo `WebApiMagento.Models.RecommenderIntelisis` (`WebApiMagento\Models\RecommenderRequest.cs`, líneas 19-25): `customerName`, `customerAccount`, `requestedCodes` (int), `uen` (int).

2. **Llamada a la capa de negocio:** El controlador instancia `RecommenderMethods` y llama:
   ```csharp
   cm.TraerCodigosRecomendadoscliente("1", recommender.customerAccount, recommender.requestedCodes, "WEB", recommender.uen)
   ```
   La firma del método de negocio es `TraerCodigosRecomendadoscliente(string op, string search, int uen, string aplicacion, int cantidad)`. **Importante (bug de wiring de parámetros detectado en el código fuente actual, relevante para la migración a SAP):** por posición, el argumento `recommender.requestedCodes` cae en el parámetro llamado `uen`, y el argumento `recommender.uen` cae en el parámetro llamado `cantidad`. Es decir, están cruzados respecto a su nombre semántico:
   - `op` = `"1"` (fijo)
   - `search` = `recommender.customerAccount`
   - `uen` (parámetro) = `recommender.requestedCodes` (valor real recibido, aunque el parámetro se llame "uen")
   - `aplicacion` = `"WEB"` (fijo, no viene del payload)
   - `cantidad` (parámetro) = `recommender.uen` (valor real recibido, aunque el parámetro se llame "cantidad")

3. **Ejecución de `RecommenderMethods.TraerCodigosRecomendadoscliente`** (`WebApiMagento\Metodos\RecommenderMethods.cs`, líneas 132-200):
   - Fija cultura `es-MX` en el hilo actual.
   - Abre `SqlConnection` con `Connection.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`), que apunta a `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (coincide con el `USE [IntelisisTmp]` del SP).
   - Arma y ejecuta vía `SqlDataAdapter`:
     ```sql
     SpCREDICodigoRecomendador @opcion, @search, @Uen, NULL, NULL, NULL, @Aplicacion, @Cantidad
     ```
     con `@opcion='1'`, `@search=customerAccount`, `@Uen=requestedCodes` (por el cruce de parámetros descrito arriba), `@Nombre=NULL`, `@Telefono=NULL`, `@Parentesco=NULL` (literales fijos en el texto SQL, no parametrizados), `@Aplicacion='WEB'`, `@Cantidad=recommender.uen` (por el mismo cruce). Los parámetros `@FechaInicio`, `@FechaFin`, `@Nomina`, `@TipoCodigo` no se envían y toman su DEFAULT `NULL` en el SP.
   - `da.Fill(ds)` llena un `DataSet`. Si `ds.Tables.Count <= 0` retorna un valor centinela (`["v","a","c","i","o"]`, artefacto de un `Select` sobre el string `"vacio"` carácter por carácter) — esta rama es prácticamente inalcanzable en la práctica porque `SqlDataAdapter.Fill` siempre crea al menos una tabla con el esquema de columnas del result set, aunque tenga cero filas.
   - En el caso normal, recorre cada fila y cada columna de `ds.Tables[0]` y las convierte a `string` (`ToString()`), armando `List<List<string>>` (una lista interna por fila, con tantos elementos como columnas devuelva el SP).
   - Cierra la conexión y retorna el `List<List<string>>` **tal cual** (no hace `JsonConvert.SerializeObject` aquí, a diferencia de `GetRecommender`).

4. **Lógica del Stored Procedure `SpCREDICodigoRecomendador`, rama `@opcion = 1`** (`GENERAR N CODIGOS PARA UN CLIENTE`, líneas 52-89 del SP):
   - Crea una tabla temporal de sesión `#TEMPID (ID int)` (se limpia al inicio y al final del SP si ya existía de una ejecución previa en la misma conexión).
   - `@dias` = `SELECT VALOR FROM CREDICMenudeoParametros WITH (NOLOCK) WHERE Descripcion = 'Vigencia de cupón Recomienda y Gana'` — lee de una tabla de parámetros de configuración el número de días de vigencia del cupón.
   - `@fechaFinal = DATEADD(DAY, @dias, GETDATE())` — calcula la nueva fecha de vencimiento del código a partir de hoy.
   - `UPDATE TOP (@Cantidad) CREDIDCodigoRecomendador WITH (ROWLOCK)` — **reclama hasta `@Cantidad` códigos disponibles** (nótese: por el bug de wiring del paso 2, `@Cantidad` en realidad contiene el valor de `recommender.uen`, no `recommender.requestedCodes`). Actualiza, para cada fila reclamada:
     - `Cliente = @search` (asigna el código al cliente que hace la solicitud)
     - `FechaVencimiento = @fechaFinal`
     - `FechaRegistro = GETDATE()`
     - `Nombre = NULL`, `Telefono = NULL`, `Parentesco = NULL`, `Impreso = NULL` (limpia datos de un uso previo del código)
     - `UEN = @Uen` (por el mismo bug de wiring, en realidad contiene `recommender.requestedCodes`, no la UEN real)
     - `Aplicacion = @Aplicacion` (= `'WEB'`, fijo)
     - Filtra candidatos con `WHERE Cliente IS NULL OR (FechaCanjeado IS NULL AND FechaVencimiento < GETDATE())` — es decir, códigos libres (nunca asignados) o códigos previamente asignados pero no canjeados y ya vencidos (reciclables).
     - `OUTPUT INSERTED.IdCodigoRecomendador INTO #TEMPID` — captura los IDs de las filas efectivamente actualizadas.
   - `SELECT CONCAT(C.Codigo, '|', C.IdCodigoRecomendador) AS CODIGO FROM CREDIDCodigoRecomendador C WITH (NOLOCK) JOIN #TEMPID T ON C.IdCodigoRecomendador = T.ID` — este es el único result set que llega al `SqlDataAdapter` en C#, con **una sola columna** (`CODIGO`), una fila por cada código recién reclamado, con formato de texto `"<Codigo>|<IdCodigoRecomendador>"`.
   - **Casos límite relevantes:** si `@Cantidad` (= `recommender.uen` real) es `0` (valor por defecto de un `int` no enviado en el JSON) o `NULL`, `UPDATE TOP (0)`/`TOP (NULL)` no actualiza ninguna fila, `#TEMPID` queda vacío y el SELECT final no devuelve filas → la API responde `[]`. Si no hay códigos libres/reciclables disponibles en `CREDIDCodigoRecomendador` que cumplan el `WHERE`, ocurre lo mismo aunque `@Cantidad` sea mayor a cero.
   - El resto de las ramas del SP (`@opcion` 2 a 17) no se ejecutan para este endpoint, ya que `@opcion` siempre llega fijo en `"1"`.

5. **Salida del response:** El controlador retorna `Ok(responseProcess)` donde `responseProcess` es el `List<List<string>>` devuelto por el método de negocio (no hay doble serialización aquí, a diferencia de `getRecommender`). ASP.NET Web API serializa esta estructura como un **arreglo JSON de arreglos de un solo string** (uno por columna del result set, que en esta rama del SP es siempre 1 columna: `CODIGO`). El controlador **no tiene manejo de excepciones propio** en esta acción; cualquier excepción no controlada (p. ej. `SqlException` por timeout o violación de conexión) provoca un HTTP 500 estándar de Web API, ya que a diferencia de `RecommenderMethods.GetRecommender`, el método `TraerCodigosRecomendadoscliente` no tiene bloque `try/catch`.

## Interacciones con Base de Datos (Tablas y SPs)

**SP ejecutado:** `SpCREDICodigoRecomendador` (rama `@opcion = 1`), base de datos `IntelisisTmp`.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.RecommenderController, POST /recommender/setCodes, Intelisis, CREDICMenudeoParametros, Select, "Descripcion, VALOR", ,
WebApiMagento.Controllers.RecommenderController, POST /recommender/setCodes, Intelisis, CREDIDCodigoRecomendador, Update, "Cliente, FechaVencimiento, FechaRegistro, Nombre, Telefono, Parentesco, Impreso, UEN, Aplicacion, IdCodigoRecomendador (OUTPUT), FechaCanjeado (filtro WHERE)", ,
WebApiMagento.Controllers.RecommenderController, POST /recommender/setCodes, Intelisis, CREDIDCodigoRecomendador, Select, "Codigo, IdCodigoRecomendador", ,
WebApiMagento.Controllers.RecommenderController, POST /recommender/setCodes, Intelisis, "#TEMPID (tabla temporal de sesión, no persistente)", Insert, "ID (OUTPUT INSERTED.IdCodigoRecomendador)", ,
```

*Nota:* `#TEMPID` es una tabla temporal local (`tempdb`), creada y destruida dentro del mismo `SqlConnection`/ejecución del SP; no es una entidad de negocio persistente, por lo que no aplica un mapeo a SAP.

## Ejemplo de Respuesta (Response)

El método de negocio retorna directamente un `List<List<string>>` (sin serialización manual previa), que Web API convierte en un arreglo JSON de arreglos. Cada elemento interno corresponde a la columna `CODIGO` (`"<Codigo>|<IdCodigoRecomendador>"`) de una fila reclamada por el `UPDATE TOP (@Cantidad)`:

Caso con códigos reclamados (ejemplo con 3 filas devueltas por el SP):

```json
[
  ["REC10293|4551"],
  ["REC10294|4552"],
  ["REC10295|4553"]
]
```

Caso sin códigos reclamados (p. ej. `recommender.uen` = `0`/no enviado, o no hay códigos libres/reciclables disponibles para el UEN y aplicación indicados — recordar el cruce de parámetros descrito en el flujo, que hace que `@Cantidad` real provenga de `recommender.uen` y no de `recommender.requestedCodes`):

```json
[]
```

Caso límite teórico (`ds.Tables.Count <= 0`, prácticamente inalcanzable con `SqlDataAdapter.Fill`):

```json
[["v", "a", "c", "i", "o"]]
```
