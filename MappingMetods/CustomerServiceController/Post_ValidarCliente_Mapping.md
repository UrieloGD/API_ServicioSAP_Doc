# Mapeo del Endpoint: `POST /customerService/validarCliente`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomerServiceController`
**Método Principal:** `validarCliente(ValidarClienteRequest request)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint está expuesto bajo el prefijo `[RoutePrefix("customerService")]` con el atributo `[HttpPost] [Route("validarCliente")]`. El nombre de la acción en el controlador coincide exactamente con la ruta: `validarCliente`. El controlador completo tiene `[Authorize]` a nivel de clase (`WebApiMagento\Controllers\CustomerServiceController.cs`, línea 8), por lo que requiere autenticación válida antes de ejecutarse; no se encontró un `AuthorizeAttribute` personalizado en el repo, por lo que es el filtro estándar de `System.Web.Http.AuthorizeAttribute` (infraestructura genérica, no lógica de negocio propia de este endpoint).

2. **Modelo de entrada:** El body se deserializa a `ValidarClienteRequest` (`WebApiMagento\Models\CustomerServiceRequest.cs`, líneas 30-34), que tiene únicamente dos propiedades: `id_cliente_intelisis` (string) e `id_cliente_magento` (string). Ambas se usan.

3. **Llamada a capa de negocio:** El controlador instancia `CustomerServiceMethods` (`WebApiMagento\Metodos\CustomerServiceMethods.cs`) y llama a `csm.validarCliente(request)`. El resultado (un `string` JSON) se pasa a `JsonConvert.DeserializeObject(...)` y se envuelve en `Ok(...)`.

4. **Método `validarCliente(ValidarClienteRequest request)` (línea 255):**
   - Abre una conexión SQL directa con `Connection.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`, línea 26): `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` — la conexión principal del ERP Intelisis. *(Credenciales omitidas intencionalmente de este documento.)*
   - Ejecuta una consulta **SQL inline** (no es un Stored Procedure) contra la tabla `Cte`:
     ```sql
     SELECT TOP 1
         ISNULL(PersonalNombres, ''), ISNULL(PersonalApellidoPaterno, ''), ISNULL(PersonalApellidoMaterno, '')
     FROM Cte WITH(NOLOCK)
     WHERE Cliente = @ClientIntelisis AND IDMagento = @ClientMagento
     ```
     con `@ClientIntelisis = request.id_cliente_intelisis` y `@ClientMagento = request.id_cliente_magento` (ambos `SqlDbType.VarChar`). Nota de código: el segundo `SqlParameter` está literalmente nombrado `"@ClientMAgento"` (mayúscula/minúscula distinta a la usada en el texto del query, `@ClientMagento`); en ADO.NET el emparejamiento de parámetros por nombre para `SqlClient` es *case-insensitive*, así que el binding funciona correctamente pese a la diferencia de capitalización — no es un bug funcional, sólo una inconsistencia de estilo.
   - `CommandTimeout = 9999999`.
   - Si `dr.HasRows` es `true`, itera las filas (con `TOP 1` sólo puede haber una) y arma un objeto anónimo:
     ```csharp
     new {
         nombres = ocultarLetrasNombres(dr.GetString(0)),
         apellido_paterno = ocultarLetrasNombres(dr.GetString(1)),
         apellido_materno = ocultarLetrasNombres(dr.GetString(2))
     }
     ```
     serializado a JSON con `JsonConvert.SerializeObject(...)` y asignado a `respuesta`.
   - Si `dr.HasRows` es `false` (no existe ningún registro en `Cte` que combine ese `Cliente` + `IDMagento`), `respuesta` conserva su valor inicial `"false"` (string literal).
   - Cierra el `SqlDataReader` y la conexión.
   - **Manejo de excepciones:** si ocurre cualquier error (p. ej. falla de conexión SQL), se captura, se registra vía `Logger.CustomerService("ERROR ", e.Message)` (`WebApiMagento\Helper\Logger.cs`) y `respuesta` se reemplaza por el mensaje de excepción en texto plano (no JSON válido).

5. **Método auxiliar `ocultarLetrasNombres(string nombre)` (línea 372):** lógica pura en memoria, sin acceso a datos ni llamadas externas. Divide el nombre por espacios; para cada palabra conserva el primer carácter y reemplaza el resto de las letras (`[a-zA-Z]`) por `*` mediante `Regex.Replace`, uniendo las palabras con espacio. Ejemplo: `"Juan Perez"` → `"J**n P***z"`.

6. **Salida:** El controlador toma el `string` devuelto por `validarCliente` y lo pasa por `JsonConvert.DeserializeObject(...)`:
   - Caso encontrado: `respuesta` es un JSON válido (`{"nombres":"...","apellido_paterno":"...","apellido_materno":"..."}`) → se deserializa a un `JObject`/`JToken` y se envuelve en `Ok(...)` → HTTP 200 con ese objeto como body.
   - Caso no encontrado: `respuesta = "false"` es un literal JSON válido → `JsonConvert.DeserializeObject("false")` produce el booleano `false` → `Ok(false)` → HTTP 200 con body `false`.
   - Caso excepción: `respuesta` es el mensaje de la excepción en texto plano, que generalmente **no** es JSON válido; `JsonConvert.DeserializeObject(...)` lanzaría una `JsonReaderException` no controlada en el controlador, resultando en una respuesta de error HTTP 500 estándar de ASP.NET Web API (no personalizada por este endpoint).

No hay ningún Stored Procedure ni llamada a servicio/API externa en este flujo: toda la lógica de datos se resuelve con una única consulta SQL inline sobre la tabla `Cte`, seguida de transformación de texto en memoria.

## Interacciones con Base de Datos (Tablas y SPs)

Consulta única, SQL inline (no SP), `SELECT` puro sin efectos secundarios, ejecutada siempre (una sola vez por invocación del endpoint).

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/validarCliente, Intelisis, Cte, Select, "PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno (filtros: Cliente, IDMagento)", ,
```

Notas sobre la fila:
- `Cte` es la tabla maestra de clientes del ERP Intelisis; vive físicamente en la base `IntelisisTmp` (server `MAVICUBOS.grupomavi.com`), accedida vía `Connection.sCadenaConexion`.
- El filtro combina `Cliente = @id_cliente_intelisis` (clave del cliente en Intelisis) **y** `IDMagento = @id_cliente_magento` (clave del cliente en Magento), es decir, el endpoint valida que ambos identificadores correspondan al **mismo** registro de cliente antes de devolver sus datos (comportamiento tipo "vinculación"/verificación cruzada Intelisis↔Magento).
- Sólo se leen y exponen 3 columnas (`PersonalNombres`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`); ambas columnas de filtro (`Cliente`, `IDMagento`) no se devuelven en la respuesta.
- Los tres campos de nombre se ofuscan antes de salir de la capa de negocio (`ocultarLetrasNombres`), por lo que el dato crudo de `Cte` nunca llega íntegro al cliente HTTP.

## Ejemplo de Respuesta (Response)

El método de negocio (`validarCliente`) retorna un `string` (JSON serializado o literal `"false"` o mensaje de excepción); el controlador lo redeserializa y lo envuelve en `Ok(...)`. Basado en el código fuente real, hay tres formas posibles de respuesta:

```json
// HTTP 200 OK - Se encontró un registro en Cte para (Cliente = id_cliente_intelisis, IDMagento = id_cliente_magento)
{
  "nombres": "J**n C*****s",
  "apellido_paterno": "P***z",
  "apellido_materno": "L**z"
}
```

```json
// HTTP 200 OK - No existe ningún registro en Cte que combine ambos identificadores
false
```

```
// HTTP 500 Internal Server Error - Excepción no controlada durante JsonConvert.DeserializeObject
// (el string devuelto por validarCliente en este caso es e.Message en texto plano, no JSON válido)
```
