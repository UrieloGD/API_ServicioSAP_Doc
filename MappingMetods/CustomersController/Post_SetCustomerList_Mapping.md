# Mapeo del Endpoint: `POST /customer/setCustomerList`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomersController`
**Método Principal:** `SetCustomerEmailage(CustomerRequest customer)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint está expuesto bajo el prefijo `[RoutePrefix("customer")]` con el atributo `[HttpPost] [Route("setCustomerList")]`. El nombre real del método de acción en el controlador es `SetCustomerEmailage` (no coincide textualmente con la ruta, pero es la acción confirmada que atiende `setCustomerList`). El controlador completo tiene `[Authorize]` a nivel de clase, por lo que requiere autenticación válida antes de ejecutarse.

2. **Modelo de entrada:** El body se deserializa a `CustomerRequest` (`WebApiMagento\Models\CustomerRequest.cs`), con las propiedades: `name, lastName, lastName2, dateBirth, email, gender, phone, idMagento, storeCode, list, address`. Para este endpoint sólo se usan `list`, `email`, `name`, `address` e `idMagento`.

3. **Lógica de negocio (branching):** Dentro de un bloque `try/catch`, se evalúa `customer.list`:
   - `"white"` → variable local `lista = "Blanca"`.
   - `"black"` → variable local `lista = "Negra"`.
   - Cualquier otro valor → `return BadRequest()` inmediatamente (HTTP 400), sin tocar base de datos.

4. **Llamada a capa de negocio:** Se instancia `CustomerMethods` (`WebApiMagento\Metodos\CustomerMethods.cs`) y se invoca:
   `cm.blackwhitelist("Insertar", customer.email, lista, customer.name, customer.address, customer.idMagento)`.

5. **Método `blackwhitelist(tipo, correo, lista, nombre, direccionEntrega, numCuenta)`:**
   - Abre conexión con `Connection.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`), que apunta a `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp`.
   - Como `tipo == "Insertar"`, arma la sentencia `exec SpVTASListaNBMagento @Tipo, @Correo, @Lista, @NumPedido, @Nombre, @DireccionEntrega, @NumCuenta, @FechaRegistro`.
   - Parámetros: `@Tipo="Insertar"`, `@Correo=customer.email`, `@Lista="Blanca"|"Negra"`, `@NumPedido="0"` (hardcodeado), `@Nombre=customer.name`, `@DireccionEntrega=customer.address`, `@NumCuenta=customer.idMagento`, `@FechaRegistro=DateTime.Now` (formato `yyyy-MM-dd HH:mm:ss`).
   - Ejecuta `ExecuteReader()` con `CommandTimeout = 999999`.
   - Si `dr.HasRows` es `true`, recorre las filas y fija `result = "true"` en cada iteración (si hay excepción durante el recorrido, `result` sería el `ToString()` de la excepción, pero es código muerto — ver punto 6). Si no hay filas, `result` permanece en su valor inicial `""`.
   - Cierra y libera la conexión (`cnn.Close()/Dispose()`, `executa.Dispose()`).

6. **Comportamiento real del SP para `Insertar` (hallazgo importante):** Al leer `SpVTASListaNBMagento.sql`, las ramas `@Tipo='Insertar'` (tanto para `Lista='Negra'` como `Lista='Blanca'`) **no contienen ningún `SELECT` de resultset** — sólo `IF`, `INSERT` y `DELETE` condicionales. Por lo tanto, `ExecuteReader()` nunca produce filas (`dr.HasRows` siempre `false`) para este flujo, sin importar si el `INSERT` interno realmente ocurrió o no (las condiciones internas del SP pueden hacer que no se inserte nada, silenciosamente). Esto significa que `blackwhitelist` **siempre devuelve `""` (cadena vacía)** en el camino de éxito de este endpoint, nunca `"true"`.

7. **Lógica interna del SP `SpVTASListaNBMagento` (rama relevante a este endpoint, `@Tipo='Insertar'`):**
   - **`@Lista = 'Negra'`:** Verifica que exista un cliente con ese correo en tabla `cte` (`COUNT(c.cliente) FROM cte WHERE eMail1=@Correo > 0`) Y que el correo NO esté ya en `VTASCListaNegra`. Si ambas condiciones se cumplen: `INSERT INTO VTASCListaNegra (NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro)`. Adicionalmente, si el correo existe en `VTASCListaBlanca`, lo elimina de ahí (`DELETE FROM VTASCListaBlanca WHERE Correo=@Correo`) — es decir, agregar a lista negra remueve automáticamente de la lista blanca.
   - **`@Lista = 'Blanca'`:** Verifica que exista el cliente en `cte` por correo, Y que el correo NO esté ya en `VTASCListaNegra` NI en `VTASCListaBlanca`. Si se cumplen las tres condiciones: `INSERT INTO VTASCListaBlanca (NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro)`.
   - (Las ramas `@Tipo='Consultar'` y `@Tipo='Eliminar'` del mismo SP pertenecen a los otros endpoints hermanos `getCustomerList` y `deleteCustomerList`, no a `setCustomerList`, y no se ejecutan en este flujo.)

8. **Salida:** El controlador retorna `Ok(responseProcess)`. Dado el punto 6, en el camino normal esto es `Ok("")` → HTTP 200 con body `""`. Si ocurre una excepción no controlada dentro de `blackwhitelist` (p. ej. falla de conexión SQL), el `catch` del controlador ejecuta `Ok(e.ToString())` **sin `return`** (bug existente en el código fuente), por lo que ese valor se descarta y el flujo cae al final del método, devolviendo `return Ok();` → HTTP 200 con body `null`. El único otro código de estado posible es HTTP 400 (`BadRequest()`) cuando `customer.list` no es `"white"` ni `"black"`.

## Interacciones con Base de Datos (Tablas y SPs)

**SP ejecutado:** `SpVTASListaNBMagento` (parámetros `@Tipo='Insertar'`, `@Lista='Blanca'|'Negra'`) — Base de datos `IntelisisTmp` (server `MAVICUBOS.grupomavi.com`).

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomersController, POST /customer/setCustomerList, Intelisis, cte, Select, "Cliente, eMail1", ,
WebApiMagento.Controllers.CustomersController, POST /customer/setCustomerList, Intelisis, VTASCListaNegra, Select, "Cliente, Correo", ,
WebApiMagento.Controllers.CustomersController, POST /customer/setCustomerList, Intelisis, VTASCListaNegra, Insert, "NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro", ,
WebApiMagento.Controllers.CustomersController, POST /customer/setCustomerList, Intelisis, VTASCListaBlanca, Select, "Cliente, Correo", ,
WebApiMagento.Controllers.CustomersController, POST /customer/setCustomerList, Intelisis, VTASCListaBlanca, Insert, "NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro", ,
WebApiMagento.Controllers.CustomersController, POST /customer/setCustomerList, Intelisis, VTASCListaBlanca, Delete, "Correo", ,
```

Notas sobre las filas:
- `cte, Select`: validación de existencia del cliente por correo (`eMail1`), ejecutada en ambas ramas (Negra y Blanca). Sólo se usa el `COUNT`, no se consumen datos del cliente en la respuesta.
- `VTASCListaNegra, Select`: verificación de duplicados (`COUNT(Cliente) WHERE Correo=@Correo`), se ejecuta en ambas ramas (para no duplicar en Negra, y para no permitir alta en Blanca si ya está en Negra).
- `VTASCListaNegra, Insert`: sólo ocurre cuando `@Lista='Negra'` y pasa la validación de `cte` + no-duplicado.
- `VTASCListaBlanca, Select`: verificación de duplicados, se ejecuta en ambas ramas (para no duplicar en Blanca, y para saber si hay que removerlo de Blanca al insertar en Negra).
- `VTASCListaBlanca, Insert`: sólo ocurre cuando `@Lista='Blanca'` y pasa las tres validaciones.
- `VTASCListaBlanca, Delete`: efecto colateral que ocurre sólo cuando `@Lista='Negra'` y el correo ya existía en `VTASCListaBlanca` (remoción cruzada al pasar a lista negra).

## Ejemplo de Respuesta (Response)

El método de negocio (`blackwhitelist`) retorna un `string` plano (no un DTO/objeto JSON), por lo que el controlador lo envuelve directamente en `Ok(...)`. Basado en el código fuente real (no hay SELECT en la rama "Insertar" del SP, ver punto 6-7 arriba):

```json
// HTTP 200 OK - Camino normal de éxito (el registro se haya insertado o no según las validaciones internas del SP; el SP no devuelve resultset en este flujo)
""
```

```json
// HTTP 200 OK - Camino de excepción no controlada (bug: el catch no hace return de e.ToString(), cae al Ok() final)
null
```

```json
// HTTP 400 Bad Request - cuando customer.list no es "white" ni "black" (sin body adicional, respuesta estándar de ASP.NET Web API)
```
