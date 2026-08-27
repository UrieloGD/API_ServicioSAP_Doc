# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /credit/validateSms`

**Controlador/Clase:** `CreditController`
**Método Principal:** `ValidateSms(ClaveRequest clave)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe un cuerpo (body) en la petición tipo POST que se enlaza al modelo `ClaveRequest`, el cual contiene las propiedades `cuenta`, `claveSms` y `idCarritoCliente`.
2. **Validación Inicial:**
   - Si el objeto `clave` es nulo, arroja una excepción `HttpResponseException` con un código 400 (`BadRequest`).
3. **Llamada a la lógica de negocio:** 
   - El controlador instancia `CreditMethods` e invoca al método `ProductosCredito_Clave(clave.cuenta, clave.claveSms, int.Parse(clave.idCarritoCliente))` dentro de un bloque `try-catch`.
4. **Ejecución en Base de Datos (SP):**
   - Se abre una conexión a base de datos (Android) usando `cadenac.sCadenaConexionAndriod`.
   - Se ejecuta el Stored Procedure `SPVTASCodigoSeguridadeCommerce` con los siguientes parámetros:
     - `@Cliente = cuenta`
     - `@IdCarrito = idCarritoCliente` (convertido a entero)
     - `@CodigoWeb = claveSms`
     - `@Op = "CODIGO"` (Es decir, la operación está fija para verificar el código SMS).
   - Internamente, el SP entra en la condición `IF (@Op = 'CODIGO')` y consulta la tabla `VTASDCodigoVerificacioneCommerce`.
   - Verifica si existe un registro activo para ese cliente, ese carrito y que el código coincida.
   - Retorna un valor numérico escalar: `5` si el código es aceptado, o `6` si no coincide.
   - El valor devuelto (`@retValue`) se convierte a string y se retorna al controlador.
5. **Respuesta Final:**
   - El controlador retorna el valor numérico en texto (`"5"` o `"6"`) envuelto en un HTTP 200 (Ok).
   - En caso de ocurrir alguna excepción, el sistema retorna un código 500 (`InternalServerError`).

## Interacciones con Base de Datos (Tablas y SPs)

**Stored Procedure Ejecutado:** `SPVTASCodigoSeguridadeCommerce`

Dado que el parámetro `@Op` se pasa siempre como `"CODIGO"` desde este endpoint, el flujo del SP ignora las demás tablas y únicamente consulta la siguiente:

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
VTASDCodigoVerificacioneCommerce, Select, "IdCodigoVerificacioneCommerce, Cliente, IdCarrito, Codigo", , 
```

*(Nota: También se ha generado el archivo `Post_validateSms_Tablas.csv` independiente en esta misma carpeta para que lo puedas abrir directo en Excel).*

## Ejemplo de Petición (Request)

```json
{
  "cuenta": "C00000820",
  "claveSms": "5A4B2C",
  "idCarritoCliente": "12345"
}
```

## Ejemplo de Respuesta (Response)

El endpoint retorna el valor de éxito (5) o fallo (6) en texto plano o string JSON:

```json
"5"
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
