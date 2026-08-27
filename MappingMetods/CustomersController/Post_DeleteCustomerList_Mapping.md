# Mapeo del Endpoint: `POST /customer/deleteCustomerList`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomersController`
**Método Principal:** `DeleteCustomerEmailage(CustomerRequest customer)`

## Flujo de Ejecución Detallado

1. **Entrada HTTP:** El endpoint está decorado con `[HttpPost]` y `[Route("deleteCustomerList")]`, bajo el `[RoutePrefix("customer")]` de la clase (`WebApiMagento\Controllers\CustomersController.cs`, líneas 79-87). El controlador completo además tiene `[Authorize]`, por lo que requiere autenticación previa (no se traza aquí el mecanismo de autenticación, solo se deja constancia de que existe el filtro).
2. El método recibe un objeto `CustomerRequest customer` deserializado del body JSON del request. De este objeto solo se utiliza el campo `customer.email`.
3. Se instancia `CustomerMethods cm = new CustomerMethods();` y se invoca `cm.blackwhitelist("Eliminar", customer.email);` — nótese que solo se pasan 2 de los 6 parámetros del método; los demás (`lista`, `nombre`, `direccionEntrega`, `numCuenta`) toman su valor por defecto `""`.
4. Dentro de `blackwhitelist` (`WebApiMagento\Metodos\CustomerMethods.cs`, líneas 120-183):
   - Como `tipo == "Eliminar"` (distinto de `"Insertar"`), se usa la variante corta de la consulta: `exec SpVTASListaNBMagento @Tipo, @Correo, @Lista` (línea 124). La rama de 8 parámetros (línea 126, usada solo cuando `tipo == "Insertar"`) no se ejecuta en este flujo.
   - Parámetros enlazados: `@Tipo = "Eliminar"`, `@Correo = customer.email`, `@Lista = ""` (cadena vacía, porque el controlador nunca envía este valor para el caso de borrado).
   - La conexión se obtiene de `WebApiMagento\Conn\Connection.cs`, propiedad `sCadenaConexion` (`server=MAVICUBOS.grupomavi.com; ... database=IntelisisTmp`), consistente con el `USE [IntelisisTmp]` al inicio del SP.
   - Se ejecuta con `SqlCommand.ExecuteReader()` (no `ExecuteNonQuery`), con `CommandTimeout = 999999`. El `CommandType` queda en el valor por defecto `Text` (comando inline `exec ...`), no `StoredProcedure`.
5. **Lógica del Stored Procedure `SpVTASListaNBMagento`** (`C:\Users\jhherrera\Documents\e-commerce\lan-sap-migration\SPsOrden\SpVTASListaNBMagento.sql`), rama efectivamente ejecutada (`@Tipo = 'Eliminar'`, líneas 66-70):
   ```sql
   IF @Tipo = 'Eliminar'
   BEGIN
     DELETE VTASCListaBlanca
     WHERE Correo = @Correo
   END
   ```
   - **Detalle de negocio importante:** a pesar de que el método C# se llama `blackwhitelist` (sugiriendo que maneja lista negra y blanca), la rama `'Eliminar'` del SP **solo borra de la tabla `VTASCListaBlanca` (lista blanca)**, filtrando por `Correo = @Correo`. No toca `VTASCListaNegra` en ningún caso para `Tipo = 'Eliminar'`. El parámetro `@Lista` (que en este endpoint siempre llega vacío `""`) no se evalúa en absoluto dentro de esta rama del SP — el `DELETE` se ejecuta incondicionalmente para cualquier valor de `@Lista` mientras `@Tipo = 'Eliminar'`.
   - El SP no contiene ningún `SELECT` dentro de la rama `'Eliminar'`, por lo que no produce ningún result set.
6. **Consecuencia en el código C#:** dado que el `DELETE` no genera un result set, al llamar `dr.HasRows` sobre el `SqlDataReader` este será `false` (no hay filas que leer, independientemente de si el `DELETE` afectó 0 o N registros). Por lo tanto el bucle `while (dr.Read())` nunca se ejecuta y la variable `result` conserva su valor inicial: cadena vacía `""` (línea 123: `string result = "";`). No existe manejo de error explícito para este camino (el único `catch` interno está dentro del `while`, que nunca se alcanza).
7. Se cierra y libera la conexión (`cnn.Close(); cnn.Dispose(); executa.Dispose();`) y `blackwhitelist` retorna `result` (`""`) al controlador.
8. El controlador retorna `return Ok(responseProcess);`, es decir, un HTTP 200 OK cuyo cuerpo es el string vacío serializado como JSON (`""`). No hay diferenciación de status code entre "correo encontrado y borrado" y "correo no encontrado" — ambos casos devuelven el mismo `""` con 200 OK, ya que el SP no reporta el número de filas afectadas y el código C# no lo consulta (`ExecuteReader` en vez de `ExecuteNonQuery`).

## Interacciones con Base de Datos (Tablas y SPs)

**Stored Procedure ejecutado:** `SpVTASListaNBMagento` (rama `@Tipo = 'Eliminar'`) — base de datos `IntelisisTmp`.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomersController, POST /customer/deleteCustomerList, Intelisis, VTASCListaBlanca, Delete, "Correo", ,
```

*Nota: el SP `SpVTASListaNBMagento` contiene además ramas para `Tipo='Consultar'` (SELECT sobre `VTASCListaNegra`/`VTASCListaBlanca`) y `Tipo='Insertar'` (INSERT en `VTASCListaNegra`/`VTASCListaBlanca`, con validación contra la tabla `cte`), pero ninguna de esas ramas se ejecuta desde el endpoint `deleteCustomerList`, ya que este siempre invoca el SP con `@Tipo = 'Eliminar'`. Se documentan aquí únicamente para referencia, no forman parte del flujo de este endpoint.*

## Ejemplo de Respuesta (Response)

La respuesta HTTP siempre es `200 OK` (no hay ramas de error en el controlador ni en `blackwhitelist` para este flujo). El cuerpo es un string JSON simple, correspondiente al valor de retorno de `blackwhitelist`, que en la práctica siempre es cadena vacía para el caso `Eliminar` (ver punto 6 del flujo):

```json
""
```

Si en el futuro se modificara el SP para incluir un `SELECT` de confirmación tras el `DELETE` (como sí ocurre implícitamente en la rama `Insertar`, donde `dr.HasRows` puede ser verdadero), el valor devuelto por `blackwhitelist` pasaría a ser el string `"true"`:

```json
"true"
```
