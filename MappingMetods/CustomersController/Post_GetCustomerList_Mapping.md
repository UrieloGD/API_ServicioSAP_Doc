# Mapeo del Endpoint: `POST /customer/getCustomerList`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomersController`
**Método Principal:** `GetCustomerEmailage(CustomerRequest customer)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint está expuesto bajo el prefijo `[RoutePrefix("customer")]` con el atributo `[HttpPost] [Route("getCustomerList")]`. El nombre real del método de acción en el controlador es `GetCustomerEmailage` (no coincide textualmente con la ruta, pero es la acción confirmada que atiende `getCustomerList`). El controlador completo tiene `[Authorize]` a nivel de clase, por lo que requiere autenticación válida antes de ejecutarse.

2. **Modelo de entrada:** El body se deserializa a `CustomerRequest` (`WebApiMagento\Models\CustomerRequest.cs`). De todas sus propiedades (`name, lastName, lastName2, dateBirth, email, gender, phone, idMagento, storeCode, list, address`), este endpoint sólo usa `customer.email`.

3. **Llamada a capa de negocio (primer intento, lista negra):** Se instancia `CustomerMethods` (`WebApiMagento\Metodos\CustomerMethods.cs`) y se invoca `cm.blackwhitelist("Consultar", customer.email, "Negra")`.

4. **Método `blackwhitelist(tipo, correo, lista, ...)`:**
   - Abre conexión con `Connection.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`), que apunta a `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp`.
   - Como `tipo != "Insertar"`, arma la sentencia de 3 parámetros: `exec SpVTASListaNBMagento @Tipo, @Correo, @Lista` con `@Tipo="Consultar"`, `@Correo=customer.email`, `@Lista="Negra"`.
   - Ejecuta `ExecuteReader()` con `CommandTimeout = 999999`.
   - Si `dr.HasRows` es `true`, recorre las filas (sin inspeccionar valores de columnas) y fija `result = "true"`. Si no hay filas, `result` permanece en `""` (valor inicial).
   - Cierra y libera la conexión.

5. **Lógica interna del SP `SpVTASListaNBMagento` para `@Tipo='Consultar' AND @Lista='Negra'`:** Ejecuta
   `SELECT 'Negra' AS Lista, NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro FROM VTASCListaNegra WITH (NOLOCK) WHERE Correo = @Correo`.
   Es un `SELECT` puro (sin side-effects), filtrando únicamente por el correo recibido.

6. **Branching en el controlador (resultado de la consulta a lista negra):**
   - Si `responseProcess == "true"` (el correo existe en `VTASCListaNegra`) → `responseProcess = "black"` y se retorna inmediatamente, **sin** consultar la lista blanca.
   - Si `responseProcess != "true"` (correo no está en lista negra) → se ejecuta un **segundo llamado** a `cm.blackwhitelist("Consultar", customer.email, "Blanca")`.

7. **Segundo llamado a `blackwhitelist` (lista blanca):** Mismo método, misma conexión/SP, ahora con `@Tipo="Consultar"`, `@Lista="Blanca"`. La rama correspondiente del SP ejecuta
   `SELECT 'Blanca' AS Lista, NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro FROM VTASCListaBlanca WITH (NOLOCK) WHERE Correo = @Correo`.
   - Si `dr.HasRows` → `result = "true"`; si no, `result = ""`.

8. **Branching final:**
   - Si el segundo resultado es `"true"` (correo existe en `VTASCListaBlanca`) → `responseProcess = "white"`.
   - Si no (el correo no está en ninguna de las dos listas) → `responseProcess = "No esta en listas"`.

9. **Salida:** El controlador retorna `Ok(responseProcess)`, donde `responseProcess` es un `string` plano con uno de tres valores posibles: `"black"`, `"white"`, o `"No esta en listas"` → HTTP 200 con ese string como body JSON. No hay manejo de excepciones (`try/catch`) en esta acción, a diferencia de `setCustomerList`; una excepción no controlada (p. ej. falla de conexión SQL) resultaría en una respuesta de error HTTP 500 estándar de ASP.NET Web API (no personalizada por el código de este endpoint).

## Interacciones con Base de Datos (Tablas y SPs)

**SP ejecutado:** `SpVTASListaNBMagento` (parámetros `@Tipo='Consultar'`, `@Lista='Negra'` primero y, condicionalmente, `@Lista='Blanca'` después) — Base de datos `IntelisisTmp` (server `MAVICUBOS.grupomavi.com`). Ambas ramas del SP relevantes a este endpoint son `SELECT` puros, sin `INSERT`/`UPDATE`/`DELETE`.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomersController, POST /customer/getCustomerList, Intelisis, VTASCListaNegra, Select, "Lista (literal 'Negra'), NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro (filtro: Correo)", ,
WebApiMagento.Controllers.CustomersController, POST /customer/getCustomerList, Intelisis, VTASCListaBlanca, Select, "Lista (literal 'Blanca'), NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro (filtro: Correo)", ,
```

Notas sobre las filas:
- `VTASCListaNegra, Select`: se ejecuta siempre, en cada invocación del endpoint (primer llamado a `blackwhitelist`). Determina si el correo está en la lista negra.
- `VTASCListaBlanca, Select`: se ejecuta **condicionalmente**, sólo si el correo NO estaba en `VTASCListaNegra` (segundo llamado a `blackwhitelist`, ejecutado desde el controlador, no desde el SP).
- El controlador únicamente usa `dr.HasRows` (existencia de al menos una fila) para decidir el resultado; las columnas devueltas por el `SELECT` (`NumPedido, Nombre, Correo, Direccion, Cliente, FechaRegistro`) no se leen ni se exponen en la respuesta del endpoint — se descartan.
- Las ramas `@Tipo='Insertar'` y `@Tipo='Eliminar'` del mismo SP (que sí tocan `cte` y hacen `INSERT`/`DELETE` sobre `VTASCListaNegra`/`VTASCListaBlanca`) pertenecen a los endpoints hermanos `setCustomerList` y `deleteCustomerList`, no a `getCustomerList`, y no se ejecutan en este flujo.

## Ejemplo de Respuesta (Response)

El método de negocio (`blackwhitelist`) retorna un `string` plano (no un DTO/objeto JSON); el controlador lo envuelve directamente en `Ok(...)`. Basado en el código fuente real, hay tres valores posibles:

```json
// HTTP 200 OK - El correo existe en VTASCListaNegra
"black"
```

```json
// HTTP 200 OK - El correo NO existe en VTASCListaNegra, pero SÍ en VTASCListaBlanca
"white"
```

```json
// HTTP 200 OK - El correo no existe en ninguna de las dos listas
"No esta en listas"
```
