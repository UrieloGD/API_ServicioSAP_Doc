# Mapeo del Endpoint: `POST /recommender/setRecommenderList`

**Controlador/Clase:** `WebApiMagento.Controllers.RecommenderController` (archivo físico `WebApiMagento\Controllers\RecomenderController.cs`)
**Método Principal:** `SetRecommenderList(RecommenderRequest recommender)` → `RecommenderMethods.CodigoRecomendador(string op, string search, int uen, string nombre, string telefono, string parentesco)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint está expuesto bajo `[RoutePrefix("recommender")]` con `[HttpPost] [Route("setRecommenderList")]`. El controlador completo tiene `[Authorize]` a nivel de clase, por lo que requiere autenticación válida antes de ejecutarse.

2. **Modelo de entrada:** El body se deserializa a `RecommenderRequest` (`WebApiMagento\Models\RecommenderRequest.cs`), con las propiedades: `name, lastName, lastName2, phone, kinship, code, uen`. De estas, el endpoint sólo usa `code`, `uen`, `name`, `phone` y `kinship` (`lastName`/`lastName2` no se utilizan en este flujo).

3. **Lógica de negocio:** Dentro de un bloque `try/catch`, se instancia `RecommenderMethods` (`WebApiMagento\Metodos\RecommenderMethods.cs`) y se invoca, con la opción de operación **hardcodeada a `"2"`**:
   `cm.CodigoRecomendador("2", recommender.code, recommender.uen, recommender.name, recommender.phone, recommender.kinship)`
   Mapeo de parámetros → `op="2"`, `search=recommender.code`, `uen=recommender.uen`, `nombre=recommender.name`, `telefono=recommender.phone`, `parentesco=recommender.kinship`.

4. **Método `CodigoRecomendador(op, search, uen, nombre, telefono, parentesco)`** (`WebApiMagento\Metodos\RecommenderMethods.cs`, líneas 63-129):
   - Fija el hilo a cultura `es-MX`.
   - Abre `SqlConnection` vía `Connection.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`, línea 26) → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp`.
   - Arma el comando de texto `SpCREDICodigoRecomendador @opcion, @search, @Uen, @Nombre, @Telefono, @Parentesco` (ejecutado como texto SQL que invoca el SP, no vía `CommandType.StoredProcedure`, pero es funcionalmente la ejecución del SP).
   - Parámetros bindeados: `@opcion="2"`, `@search=code`, `@Uen=uen`, `@Nombre=name`, `@Telefono=phone`, `@Parentesco=kinship`. **Nota:** el método C# no tiene parámetro para `@Nomina`, por lo que el SP recibe `@Nomina=NULL` (su valor por defecto).
   - `CommandTimeout = 999999` (bug de sintaxis de asignación repetida en el archivo, no afecta funcionalidad).
   - Ejecuta con `SqlDataAdapter.Fill(DataSet ds)`.
   - Si `ds.Tables.Count <= 0`: devuelve un `List<List<string>>` degenerado que separa el literal `"vacio"` carácter por carácter (bug pre-existente; en la práctica este SP siempre devuelve al menos un `SELECT`, por lo que esta rama no debería activarse para `@opcion=2`).
   - Caso normal: recorre `ds.Tables[0].Rows` y, para cada fila, convierte **todas** las columnas a `string` (`dRow[i].ToString()`) sin usar los nombres de columna, construyendo `List<List<string>>`.

5. **Lógica interna del SP `SpCREDICodigoRecomendador`, rama `@opcion = 2`** (líneas 91-129 de `SpCREDICodigoRecomendador.sql`):
   - Busca el código: `SELECT IdCodigoRecomendador FROM CREDIDCodigoRecomendador WITH (NOLOCK) WHERE Codigo COLLATE Latin1_General_CS_AS = @search AND Cliente IS NOT NULL AND FechaCanjeado IS NULL AND FechaVencimiento > GETDATE()` → variable `@valor`. Es decir, sólo es válido un código que: (a) exista, (b) ya tenga un `Cliente` asignado (fue generado por la opción 1, "generar N códigos para un cliente"), (c) no haya sido canjeado aún, y (d) no esté vencido.
   - **Si `@valor IS NOT NULL` (código válido y vigente):**
     a. `UPDATE CREDIDCodigoRecomendador WITH (ROWLOCK) SET Nombre=@Nombre, Telefono=@Telefono, Parentesco=@Parentesco, Nomina=@Nomina WHERE Codigo COLLATE Latin1_General_CS_AS = @search` — registra los datos de la persona recomendada (Nomina queda en `NULL` porque no se envía desde este endpoint).
     b. Busca el `IdMensaje` de la plantilla `'Código Recomendador (Recomienda y Gana)'` en el servidor vinculado `MAVIANDROID01`, base `ServicioAndroid`, tabla `TcAAEA00030_Mensajes`.
     c. Si existe el mensaje, inserta una fila en `MAVIANDROID01.ServicioAndroid.dbo.TcAAea00030_EnvioMensajes` (mismo servidor vinculado) para encolar el envío de un SMS/notificación al `@Telefono` proporcionado, con `Cliente` fijo `'CW00001'`, `EstatusEnvio=1`, `Tipo=0`, contadores de intento en `0`.
     d. `SELECT @valor VALOR` → devuelve **un único resultset de una fila y una columna** (`VALOR`) con el `IdCodigoRecomendador` (entero) que fue actualizado.
   - **Si `@valor IS NULL` (código inexistente, sin cliente asignado, ya canjeado, o vencido):** `SELECT -1 VALOR` → mismo resultset de una fila/una columna, pero con valor `-1`. No se actualiza ni inserta nada en este caso.

6. **Salida:** De vuelta en C#, el `DataSet` contiene una sola tabla con una sola fila y una sola columna (el alias `VALOR` se pierde porque el código sólo usa índices posicionales). El resultado final es `List<List<string>>` con un único elemento interno: `[[ "<IdCodigoRecomendador>" ]]` en caso de éxito, o `[[ "-1" ]]` si el código no era válido/vigente. El controlador retorna `Ok(responseProcess)` → HTTP 200, y Web API serializa esa lista como un arreglo JSON de arreglos (sin nombres de campo). Si ocurre cualquier excepción no controlada en el camino (p. ej. falla de conexión SQL), el `catch` del controlador devuelve `Ok(e.ToString())` → HTTP 200 con el texto plano de la excepción como body (no JSON estructurado).

## Interacciones con Base de Datos (Tablas y SPs)

**SP ejecutado:** `SpCREDICodigoRecomendador` (parámetro `@opcion=2`) — Base de datos `IntelisisTmp` (server `MAVICUBOS.grupomavi.com`), con dos escrituras adicionales vía servidor vinculado `MAVIANDROID01` → base `ServicioAndroid`.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.RecommenderController, POST /recommender/setRecommenderList, Intelisis, CREDIDCodigoRecomendador, Select, "IdCodigoRecomendador, Codigo, Cliente, FechaCanjeado, FechaVencimiento", ,
WebApiMagento.Controllers.RecommenderController, POST /recommender/setRecommenderList, Intelisis, CREDIDCodigoRecomendador, Update, "Nombre, Telefono, Parentesco, Nomina (WHERE Codigo)", ,
WebApiMagento.Controllers.RecommenderController, POST /recommender/setRecommenderList, Android, MAVIANDROID01.ServicioAndroid.dbo.TcAAEA00030_Mensajes, Select, "IdMensaje, Descripcion", ,
WebApiMagento.Controllers.RecommenderController, POST /recommender/setRecommenderList, Android, MAVIANDROID01.ServicioAndroid.dbo.TcAAea00030_EnvioMensajes, Insert, "IdRegistro, IdMensaje, Cliente, FechaEnvio, EstatusEnvio, ClienteF, Tipo, IntentoRespuesta, IntentoEnvio, Modem, Telefono", ,
```

Notas sobre las filas:
- `CREDIDCodigoRecomendador, Select`: valida que el código exista, tenga cliente asignado, no esté canjeado y no esté vencido. Determina la rama de éxito/fallo.
- `CREDIDCodigoRecomendador, Update`: sólo ocurre si la validación anterior fue exitosa (`@valor IS NOT NULL`); registra los datos de la persona recomendada (nombre, teléfono, parentesco) sobre el mismo renglón del código.
- `TcAAEA00030_Mensajes, Select` (servidor vinculado `MAVIANDROID01`, base `ServicioAndroid`): sólo ocurre en la rama de éxito; obtiene el `IdMensaje` de la plantilla de notificación "Código Recomendador (Recomienda y Gana)".
- `TcAAea00030_EnvioMensajes, Insert` (servidor vinculado `MAVIANDROID01`, base `ServicioAndroid`): sólo ocurre si la plantilla de mensaje existe; encola el envío del SMS/notificación al teléfono de la persona recomendada.
- En la rama de fallo (`@valor IS NULL`) no se toca ninguna tabla; el SP únicamente hace `SELECT -1 VALOR`.

## Ejemplo de Respuesta (Response)

El método de negocio (`CodigoRecomendador`) retorna un `List<List<string>>` (no un DTO tipado), que ASP.NET Web API serializa como arreglo de arreglos de strings, sin nombres de campo (el alias SQL `VALOR` no se preserva en el JSON):

```json
// HTTP 200 OK - Código válido y vigente (rama de éxito, @valor = IdCodigoRecomendador actualizado)
[
  ["1042"]
]
```

```json
// HTTP 200 OK - Código inexistente, sin cliente asignado, ya canjeado o vencido (rama de fallo)
[
  ["-1"]
]
```

```json
// HTTP 200 OK - Excepción no controlada (el catch del controlador hace Ok(e.ToString()), no un JSON estructurado)
"System.Exception: ..."
```
