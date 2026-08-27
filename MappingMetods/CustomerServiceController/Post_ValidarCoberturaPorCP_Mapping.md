# Mapeo del Endpoint: `POST /customerService/validarCoberturaPorCP`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomerServiceController`
**Método Principal:** `ValidarCoberturaPorCP(ValidarCoberturaPorCPRequest request)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint está declarado en `CustomerServiceController.cs` (líneas 212-219) dentro de la región `Validación de Cobertura`:
   ```csharp
   [HttpPost]
   [Route("validarCoberturaPorCP")]
   public IHttpActionResult ValidarCoberturaPorCP(ValidarCoberturaPorCPRequest request)
   {
       CustomerServiceMethods csm = new CustomerServiceMethods();
       return Ok(JsonConvert.DeserializeObject(csm.ValidarCoberturaPorCP(request)));
   }
   ```
   El controlador recibe el body deserializado como `ValidarCoberturaPorCPRequest` (modelo en `WebApiMagento\Models\CustomerServiceRequest.cs`, líneas 119-127), con los campos: `op` (string, discriminador de operación), `search` (CP a validar), `uen` (int, no usado dentro del método), `searchState`, `searchDelegation`, `searchCologne` (este último tampoco se usa dentro del método).
   El controlador instancia `CustomerServiceMethods` y delega toda la lógica a `csm.ValidarCoberturaPorCP(request)` (método de instancia, sin estado propio en la clase que lo afecte).

2. **Lógica de negocio (`CustomerServiceMethods.ValidarCoberturaPorCP`, líneas 1738-1899 de `WebApiMagento\Metodos\CustomerServiceMethods.cs`):**
   - Crea una `Connection` (`WebApiMagento\Conn\Connection.cs`) y abre una `SqlConnection` usando `conn.sCadenaConexion` → cadena de conexión a `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis/IntelisisTmp**). *(Credenciales omitidas intencionalmente de este documento — ver `Connection.cs` en el repo si se necesitan.)*
   - Según el valor de `request.op`, arma dinámicamente una de cuatro consultas SQL inline (no hay SPs involucrados, todo es texto SQL directo contra la tabla `CodigoPostal`):
     - `op == "states"` → `SELECT DISTINCT Estado FROM CodigoPostal WITH(NOLOCK) WHERE Colonia != 'SIN COLONIA' AND MaviRutaSupervision IS NOT NULL AND mavirutasupervision != ''`
     - `op == "delegations"` → misma tabla/filtros + `AND Estado = @SearchState`, seleccionando `Delegacion`.
     - `op == "table"` → selecciona `CodigoPostal, Colonia, Delegacion, Delegacion AS Poblacion, Estado`, filtrando por `Estado = @SearchState AND Delegacion = @SearchDelegation`, ordenado por `CodigoPostal`.
     - `op == "coverage"` → `SELECT TOP 1 CodigoPostal, Colonia, Delegacion, Delegacion AS Poblacion, Estado FROM CodigoPostal WITH (NOLOCK) WHERE Colonia != 'SIN COLONIA' AND mavirutasupervision IS NOT NULL AND mavirutasupervision != '' AND CodigoPostal = @Search ORDER BY estado` — esta es la variante que valida cobertura de un CP específico (el CP se considera "con cobertura" si la consulta regresa al menos una fila).
   - Si `request.op` no coincide con ninguno de los cuatro valores esperados, `querySql` queda como cadena vacía; al ejecutarse `ExecuteReader()` sobre un comando vacío se produce una excepción SQL que cae en el `catch` (ver abajo).
   - Se arma un arreglo de `SqlParameter` con `@SearchState`, `@SearchDelegation` y `@Search` (todos `VarChar`), tomados de `request.searchState`, `request.searchDelegation` y `request.search` respectivamente. Nota: los parámetros se agregan siempre los tres, aunque la query en cuestión solo use un subconjunto de ellos (ADO.NET simplemente ignora los parámetros no referenciados en el texto SQL).
   - `CommandTimeout` se fija en `9999999`. Se abre la conexión y se ejecuta `ExecuteReader()`.
   - Se recorre el `SqlDataReader` fila por fila, construyendo objetos anónimos distintos según `op`:
     - `states` → `{ estado }`
     - `delegations` → `{ delegacion }`
     - `table` → `{ codigoPostal, colonia, delegacion, poblacion, estado }`
     - `coverage` → `{ codigoPostal, colonia, delegacion, poblacion, estado }` (a lo sumo 1 elemento por el `TOP 1`)
   - Se cierra el `SqlDataReader` y la conexión, y se serializa la lista resultante (`listObject`) a JSON con `JsonConvert.SerializeObject`, guardándolo en `respuesta`.
   - Si ocurre cualquier excepción, se registra vía `Logger.CustomerService("ERROR ", e.Message)` (escribe a un archivo de log local `C:\inetpub\wwwroot\log\customerService.log`, no es una tabla de base de datos) y `respuesta` queda como el mensaje de la excepción (texto plano, no JSON válido).
   - El método regresa `respuesta` (string JSON, o el mensaje de error en caso de excepción).

3. **Salida:** El controlador toma el string devuelto por `csm.ValidarCoberturaPorCP(request)` y lo vuelve a deserializar con `JsonConvert.DeserializeObject(...)` para envolverlo en `Ok(...)` (HTTP 200), de forma que la respuesta final es un arreglo JSON (o, en el caso de error, potencialmente una excepción de deserialización si `e.Message` no es JSON válido — comportamiento no controlado explícitamente por el código).

No hay llamadas a Stored Procedures, ni a servicios/APIs externos (Magento, Curl, SAP, etc.) en este flujo: es 100% SQL inline contra la tabla `CodigoPostal` en la base Intelisis/IntelisisTmp.

## Interacciones con Base de Datos (Tablas y SPs)

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/validarCoberturaPorCP, Intelisis, CodigoPostal, Select, "Estado (DISTINCT, filtrado por Colonia <> 'SIN COLONIA' AND MaviRutaSupervision IS NOT NULL AND MaviRutaSupervision != '') -- caso op=states", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/validarCoberturaPorCP, Intelisis, CodigoPostal, Select, "Delegacion (DISTINCT, filtrado por Colonia, MaviRutaSupervision, Estado=@SearchState) -- caso op=delegations", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/validarCoberturaPorCP, Intelisis, CodigoPostal, Select, "CodigoPostal, Colonia, Delegacion, Delegacion AS Poblacion, Estado (filtrado por Colonia, MaviRutaSupervision, Estado=@SearchState, Delegacion=@SearchDelegation; ORDER BY CodigoPostal) -- caso op=table", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/validarCoberturaPorCP, Intelisis, CodigoPostal, Select, "TOP 1 CodigoPostal, Colonia, Delegacion, Delegacion AS Poblacion, Estado (filtrado por Colonia, MaviRutaSupervision, CodigoPostal=@Search; ORDER BY Estado) -- caso op=coverage (valida cobertura del CP)", ,
```

*Nota: no se generan filas para `Logger.CustomerService`, ya que escribe en un archivo de log local en disco (`customerService.log`), no en una base de datos.*

## Ejemplo de Respuesta (Response)

La forma de la respuesta depende del valor de `request.op` enviado (el endpoint es multi-propósito bajo una misma ruta). El cuerpo HTTP siempre es un arreglo JSON (200 OK), consecuencia de serializar `listObject` y volver a deserializarlo en el controlador.

Caso `op = "states"`:
```json
[
  { "estado": "CIUDAD DE MEXICO" },
  { "estado": "ESTADO DE MEXICO" }
]
```

Caso `op = "delegations"`:
```json
[
  { "delegacion": "COYOACAN" },
  { "delegacion": "BENITO JUAREZ" }
]
```

Caso `op = "table"`:
```json
[
  {
    "codigoPostal": "04100",
    "colonia": "COPILCO UNIVERSIDAD",
    "delegacion": "COYOACAN",
    "poblacion": "COYOACAN",
    "estado": "CIUDAD DE MEXICO"
  }
]
```

Caso `op = "coverage"` (valida un CP puntual; arreglo vacío `[]` si el CP no tiene cobertura):
```json
[
  {
    "codigoPostal": "04100",
    "colonia": "COPILCO UNIVERSIDAD",
    "delegacion": "COYOACAN",
    "poblacion": "COYOACAN",
    "estado": "CIUDAD DE MEXICO"
  }
]
```

Caso de error interno (excepción SQL, p. ej. `op` desconocido o conexión fallida): el método regresa el mensaje de excepción como texto plano, el cual el controlador intenta pasar a `JsonConvert.DeserializeObject(...)`; si el mensaje no es JSON válido esto puede provocar una excepción de deserialización no capturada en el controlador (comportamiento no manejado explícitamente en el código fuente).
