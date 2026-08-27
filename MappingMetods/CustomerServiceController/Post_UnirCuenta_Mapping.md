# Mapeo del Endpoint: `POST /customerService/unirCuenta`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomerServiceController`
**Método Principal:** `unirCuenta(UnirCuentaRequest request)` (acción del controlador) → delega en `CustomerServiceMethods.unirCuenta(UnirCuentaRequest request)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El controlador `CustomerServiceController` está decorado con `[Authorize]` a nivel de clase y `[RoutePrefix("customerService")]`. La acción `unirCuenta` está expuesta con `[HttpPost] [Route("unirCuenta")]`, por lo que la ruta completa confirmada es `POST /customerService/unirCuenta`. Requiere autenticación válida (token) antes de ejecutarse, igual que el resto de acciones del controlador.

2. **Modelo de entrada:** El body se deserializa a `UnirCuentaRequest` (`WebApiMagento\Models\CustomerServiceRequest.cs`, región "Unir Cuentas"), con dos propiedades:
   - `cliente` (`string`): número/clave de cliente en Intelisis.
   - `id_magento` (`int`): id de cliente/cuenta en Magento a vincular.

3. **Acción del controlador:** Se instancia `CustomerServiceMethods csm = new CustomerServiceMethods();` y se invoca directamente `csm.unirCuenta(request)`. El resultado (un `bool`) se envuelve tal cual en `Ok(...)` — **no** pasa por `JsonConvert.DeserializeObject` como sí ocurre en otras acciones hermanas del mismo controlador (`obtenerTipoGarantia`, `validarCliente`, etc.). Esto es relevante porque el valor de retorno final es un booleano JSON plano, no un objeto/DTO.

4. **Lógica de negocio `CustomerServiceMethods.unirCuenta` (líneas 212-253 de `WebApiMagento\Metodos\CustomerServiceMethods.cs`):**
   - Extrae `cliente = request.cliente` e `idMagento = request.id_magento`.
   - Inicializa `recordsAffected = 0`.
   - Dentro de un bloque `try/catch`:
     - Crea `Connection connection = new Connection();` (`WebApiMagento\Conn\Connection.cs`) y abre una `SqlConnection` usando `connection.sCadenaConexion`, que apunta a `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (conexión Intelisis/ERP).
     - Arma la sentencia SQL **inline** (no es un Stored Procedure, `CommandType` queda en su valor por defecto `Text`):
       ```sql
       UPDATE Cte WITH (ROWLOCK) SET IDMagento = @idMagento WHERE Cliente = @Cliente
       ```
     - Parámetros: `@Cliente` (`SqlDbType.VarChar` = `cliente`), `@idMagento` (`SqlDbType.Int` = `idMagento`).
     - `CommandTimeout = 9999999` (timeout extremadamente alto, posible copy-paste de otros métodos del mismo archivo).
     - Ejecuta con `sqlCommand.ExecuteReader()` (en vez de `ExecuteNonQuery()`, que sería lo idiomático para un `UPDATE`; funciona igual porque `SqlDataReader.RecordsAffected` se puebla también así, pero es un patrón inusual repetido en este archivo).
     - Toma `recordsAffected = sqlReader.RecordsAffected` y cierra el reader y la conexión.
   - Si ocurre cualquier excepción, se captura, se registra vía `Logger.CustomerService("ERROR ", ex.Message)` (escribe una línea de texto en el archivo local `C:\inetpub\wwwroot\log\customerService.log`; no es una tabla de base de datos ni un servicio externo) y `recordsAffected` permanece en `0` (no se relanza la excepción).
   - **Retorno del método de negocio:** `return recordsAffected != 0;` → `true` si el `UPDATE` afectó al menos una fila (es decir, existía un registro en `Cte` con `Cliente = @Cliente`), `false` en caso contrario (cliente no encontrado, o ocurrió una excepción SQL).

5. **Salida:** El controlador retorna `Ok(csm.unirCuenta(request))` → HTTP 200 con body `true` o `false` (JSON booleano plano). No hay ninguna rama que devuelva `BadRequest` o `InternalServerError` explícitamente; cualquier error de negocio (cliente no encontrado) o de infraestructura (falla SQL) se traduce silenciosamente en `false` con HTTP 200.

6. **Sin llamadas externas ni SPs:** Este endpoint no ejecuta ningún Stored Procedure, no realiza llamadas HTTP a servicios externos (Magento, SAP, Curl, etc.) y no toca ninguna otra tabla. Es un flujo de una sola sentencia SQL directa sobre una sola tabla (`Cte`).

## Interacciones con Base de Datos (Tablas y SPs)

No se ejecuta ningún Stored Procedure en este flujo — es una sentencia `UPDATE` inline (`CommandType.Text`) ejecutada directamente sobre la conexión Intelisis (`Connection.sCadenaConexion`, server `MAVICUBOS.grupomavi.com`, base de datos `IntelisisTmp`).

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/unirCuenta, Intelisis, Cte, Update, "IDMagento (SET), Cliente (WHERE)", ,
```

Notas sobre la fila:
- `Cte, Update`: vincula la cuenta Magento (`id_magento` del request) al registro del cliente Intelisis, localizándolo por su clave `Cliente`. Usa el hint `WITH (ROWLOCK)`. No hay `SELECT` previo de validación dentro de este método (la existencia del cliente se infiere sólo del `RecordsAffected` del propio `UPDATE`).

## Ejemplo de Respuesta (Response)

El método de negocio (`unirCuenta`) retorna un `bool` plano (no un DTO/objeto JSON), y el controlador lo envuelve directamente en `Ok(...)` sin pasar por `JsonConvert.DeserializeObject`. Por lo tanto la respuesta HTTP es un booleano JSON crudo:

```json
// HTTP 200 OK - El UPDATE afectó al menos una fila (Cliente encontrado en Cte)
true
```

```json
// HTTP 200 OK - El UPDATE no afectó ninguna fila (Cliente no encontrado en Cte), o ocurrió una excepción SQL capturada internamente
false
```
