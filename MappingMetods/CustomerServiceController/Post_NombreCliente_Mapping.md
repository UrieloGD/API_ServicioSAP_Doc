# Mapeo del Endpoint: `POST /customerService/nombreCliente`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomerServiceController`
**Método Principal:** `nombreCliente(NombreClienteRequest request)` → delega en `WebApiMagento.Metodos.CustomerServiceMethods.nombreCliente(NombreClienteRequest request)`

## Flujo de Ejecución Detallado

0. **Capa DMZ (punto de entrada público):** Antes de llegar a LAN, la petición entra por `APIMagentoDMZ\WebApiMagento\Controllers\CustomerServiceController.cs` (líneas 73-83), que expone la misma ruta `[HttpPost] [Route("nombreCliente")]`. Esta capa:
   - Valida `if (request == null) throw new HttpResponseException(HttpStatusCode.BadRequest)` → HTTP 400 si el body no deserializa. **Esta validación no existe en LAN**, es exclusiva de DMZ.
   - Instancia `Curl curl = new Curl()` y hace `curl.Post("customerService/nombreCliente", JsonConvert.SerializeObject(request))`.
   - `Curl.Post` (`APIMagentoDMZ\WebApiMagento\Helper\Curl.cs`, línea 93) usa `WebClientCustom` con headers `Content-Type: application/json` y `Authorization: Token` (token interno DMZ→LAN), `Timeout = 9999999`, encoding UTF8, y hace `UploadString(Ip + url, "POST", json)` contra la IP de la API LAN.
   - **Manejo de error relevante:** el `catch(Exception e)` de `Curl.Post` retorna `e.ToString()` — es decir, ante fallo de red/timeout devuelve el **texto plano de la excepción**, no JSON. El `JsonConvert.DeserializeObject(response)` posterior en el controlador DMZ lanzaría entonces una `JsonReaderException` → HTTP 500.
   - No hay acceso a base de datos en la capa DMZ; es puro proxy.

1. **Entrada del request (LAN):** El endpoint está expuesto bajo `[RoutePrefix("customerService")]` (a nivel de clase) con `[HttpPost] [Route("nombreCliente")]` (líneas 54-56 de `CustomerServiceController.cs`). El nombre de la acción coincide textualmente con la ruta. La clase controladora tiene `[Authorize]` a nivel de clase, por lo que requiere autenticación válida antes de ejecutarse.

2. **Modelo de entrada:** El body se deserializa a `NombreClienteRequest` (`WebApiMagento\Models\CustomerServiceRequest.cs`, línea 36), que tiene una única propiedad: `id_cliente_intelisis` (string).

3. **Delegación a capa de negocio:** El controlador instancia `CustomerServiceMethods csm = new CustomerServiceMethods();` y llama `csm.nombreCliente(request)`. El resultado (un `string` con JSON serializado) se pasa a `JsonConvert.DeserializeObject(...)` y se envuelve en `Ok(...)`, es decir, el controlador re-parsea el JSON producido por la capa de métodos para devolverlo como objeto (no como string escapado).

4. **Método `CustomerServiceMethods.nombreCliente(request)` (línea 313):**
   - Instancia `Connection conn = new Connection()` y abre `SqlConnection` sobre `conn.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`, línea 26: `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` — la base principal de Intelisis).
   - Ejecuta una consulta SQL **inline** (no es un Stored Procedure) contra la tabla `Cte`:
     ```sql
     SELECT TOP 1 
         ISNULL(PersonalNombres, ''), ISNULL(PersonalApellidoPaterno, ''), ISNULL(PersonalApellidoMaterno, ''),
         ISNULL(PersonalTelefonos, '')
     FROM Cte WITH(NOLOCK) WHERE Cliente = @ClientIntelisis
     ```
     con `@ClientIntelisis = request.id_cliente_intelisis` (tipado `SqlDbType.VarChar`).
   - Nota: la columna `PersonalTelefonos` (4ta columna del SELECT) se lee vía `dr.GetValues(values)` pero **no se usa** en la construcción de la respuesta (el teléfono final viene de otra fuente, ver paso siguiente). Es codigo muerto/no utilizado dentro del `SELECT`.
   - Inmediatamente después de abrir el reader (antes de iterarlo), llama a `string telefono = OrderMethods.IsValidated(request.id_cliente_intelisis);` — este es un método **estático** de `WebApiMagento.Metodos.OrderMethods` (línea 766) que abre **su propia** conexión independiente (`new SqlConnection(cnn.sCadenaConexion)`, misma cadena `Intelisis/IntelisisTmp`) y ejecuta esta consulta inline (tampoco es SP) contra la tabla `CteTel`:
     ```sql
     SELECT TOP 1 CONCAT(ct.Lada, ct.Telefono) as Tel FROM CteTel ct WITH(NOLOCK) 
     WHERE ct.Cliente = '{cliente}' AND ct.Tipo = 'Movil' AND ct.ValidacionTel = 1 ORDER BY Fecha DESC;
     ```
     construida por concatenación de string (`string.Format`, sin `SqlParameter` — potencial vector de SQL injection, aunque no forma parte del alcance de este mapeo). Devuelve el teléfono móvil validado más reciente del cliente, o `""` si no existe/hay error (capturado internamente y logueado vía `Logger.CustomerService`).
   - Si el primer `SELECT` (`Cte`) tiene filas (`dr.HasRows`), itera (una sola vez relevante por el `TOP 1`) y construye un objeto anónimo:
     - `nombres` = `ocultarLetrasNombres(PersonalNombres)`
     - `apellido_paterno` = `ocultarLetrasNombres(PersonalApellidoPaterno)`
     - `apellido_materno` = `ocultarLetrasNombres(PersonalApellidoMaterno)`
     - `telefono` = el valor devuelto por `OrderMethods.IsValidated(...)` (de `CteTel`, no de `Cte.PersonalTelefonos`)
     - `telefono_oculto` = `OcultarTelefono(telefono, 4)`
   - Ese objeto se serializa con `JsonConvert.SerializeObject(infoToAdd)` y se asigna a `respuesta`.
   - Si `Cte` no devuelve filas para el `Cliente` dado, `respuesta` permanece en su valor inicial: el string literal `"false"`.
   - Cierra el `SqlDataReader` y la conexión.
   - Cualquier excepción (SQL, parseo, etc.) es capturada: se loguea con `Logger.CustomerService("ERROR ", e.Message)` y `respuesta` se sobrescribe con `e.Message` (el mensaje de excepción crudo, no JSON válido — si esto ocurre, el `JsonConvert.DeserializeObject` posterior en el controlador probablemente lanzaría una `JsonReaderException` no controlada, resultando en HTTP 500 estándar).

5. **Helpers de enmascarado (lógica pura, sin acceso a datos):**
   - `ocultarLetrasNombres(nombre)`: separa por palabras (espacio) y, por cada palabra, conserva la primera letra visible y reemplaza el resto de las letras `[a-zA-Z]` por `*` (los espacios y separadores entre palabras se preservan).
   - `OcultarTelefono(telefono, numVisibles=4)`: reemplaza todos los dígitos excepto los últimos `numVisibles` por `*`.

6. **Salida:** El controlador retorna `Ok(JsonConvert.DeserializeObject(csm.nombreCliente(request)))` → HTTP 200 con:
   - Un objeto JSON `{ nombres, apellido_paterno, apellido_materno, telefono, telefono_oculto }` (todos como strings, nombres/apellidos enmascarados) si el cliente existe en `Cte`.
   - El booleano `false` (JSON) si no existe ningún registro en `Cte` para ese `Cliente`.
   - En caso de excepción no controlada aguas abajo, un error HTTP 500 estándar de ASP.NET Web API.

## Interacciones con Base de Datos (Tablas y SPs)

No hay Stored Procedures en este flujo — ambas consultas son SQL inline construido en C#. Se verificó el directorio `SPsOrden` y no aplica ningún SP a este endpoint.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/nombreCliente, Intelisis, Cte, Select, "PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, PersonalTelefonos (no usado) (filtro: Cliente = @ClientIntelisis, TOP 1)", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/nombreCliente, Intelisis, CteTel, Select, "Lada, Telefono (concatenados como Tel) (filtro: Cliente, Tipo='Movil', ValidacionTel=1; orden: Fecha DESC, TOP 1)", ,
```

Notas sobre las filas:
- `Cte, Select`: se ejecuta siempre, en cada invocación. Determina si el `id_cliente_intelisis` existe y trae nombres/apellidos. La columna `PersonalTelefonos` se lee del reader pero se descarta (no llega a la respuesta).
- `CteTel, Select`: se ejecuta siempre (vía `OrderMethods.IsValidated`), independientemente de si `Cte` tuvo filas o no (se llama antes de evaluar `dr.HasRows`). Es la fuente real del campo `telefono`/`telefono_oculto` de la respuesta.
- Ambas tablas físicamente residen en la base `IntelisisTmp` sobre `MAVICUBOS.grupomavi.com` (conexión `Connection.sCadenaConexion`), por lo que se clasifican como `Intelisis`.
- Ninguna de las dos consultas realiza `INSERT`/`UPDATE`/`DELETE`; son puramente de lectura.
- No hay llamadas a servicios externos (Magento, SAP) ni a otras conexiones (`Android`, `AdminDoc`, `SigMavi`, `Comercializadora`, MySQL) en este flujo. La única llamada saliente es el salto interno DMZ → LAN vía `Curl.Post`, que no toca base de datos.
- La capa DMZ (`APIMagentoDMZ`) no realiza **ninguna** interacción con base de datos; actúa solo como proxy HTTP hacia LAN.

## Ejemplo de Respuesta (Response)

El objeto de respuesta es anónimo (no un DTO tipado), serializado directamente desde `CustomerServiceMethods.nombreCliente`. Basado en el código fuente real, hay dos formas posibles de respuesta:

```json
// HTTP 200 OK - Cliente encontrado en Cte
{
  "nombres": "J*** C**** M*****",
  "apellido_paterno": "H******",
  "apellido_materno": "R*****",
  "telefono": "5512345678",
  "telefono_oculto": "******5678"
}
```

```json
// HTTP 200 OK - Cliente NO encontrado en Cte (dr.HasRows == false)
false
```
