# Mapeo del Endpoint: `POST /credit/MonederoSaldoCredito`

**Controlador/Clase:** `CreditController`
**Método Principal:** `MonederoSaldoCredito(MonederoSaldoRequest request)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe un cuerpo (body) en la petición tipo POST que se enlaza al modelo `MonederoSaldoRequest`, el cual contiene las propiedades `Uen` y `Client`.
2. **Llamada a la lógica de negocio:** 
   - El controlador instancia `CreditMethods` e invoca al método `MonederoSaldoCredito(request.Uen, request.Client)` dentro de un bloque `try-catch`.
3. **Ejecución en Base de Datos (Primer Query):**
   - Se abre una conexión a base de datos usando `Connection().sCadenaConexion`.
   - Se ejecuta una consulta a la tabla `Cte`: 
     `SELECT ISNULL(CASE WHEN '{Uen}' = 1 THEN c.SerieMonedero ELSE c.SerieMonederoVIU END, '') from Cte c WITH (NOLOCK) WHERE c.Cliente = '{Client}'`.
   - El resultado escalar se almacena en la variable `resultSerie`.
4. **Ejecución de Función Escalar en Base de Datos (Segundo Query):**
   - Se ejecuta una segunda consulta invocando a la función escalar `dbo.FnVTASCalcularSaldo` pasándole como parámetros `resultSerie` y `Uen`.
   - Esta función (`FnVTASCalcularSaldo`) internamente:
     - Suma el importe (`Importe`) en estado "PENDIENTE" de la tabla `TarjetaSeriemovMavi` para la `Serie`.
     - Obtiene la sumatoria del saldo de la tabla `SaldoP` que coincida con la `Cuenta` y la `UEN`.
     - Realiza la resta aritmética del saldo menos el importe y devuelve el saldo neto calculado.
   - El resultado decimal se retorna al controlador.
5. **Respuesta Final:**
   - El controlador retorna el valor numérico (decimal) envuelto en un HTTP 200 (Ok).
   - En caso de ocurrir alguna excepción, el sistema lo captura, guarda el error usando `Logger.Credit` y retorna un booleano falso serializado (`"false"`).

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas y a través de Función Escalar:** `dbo.FnVTASCalcularSaldo`

A continuación el desglose de las tablas involucradas:

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Cte, Select, "SerieMonedero, SerieMonederoVIU, Cliente", , 
TarjetaSeriemovMavi, Select, "Importe, Serie, Estatus", , 
SaldoP, Select, "Saldo, Cuenta, UEN", , 
```

## Ejemplo de Petición (Request)

```json
{
  "Uen": "1",
  "Client": "C00000820"
}
```

## Ejemplo de Respuesta (Response)

El endpoint retorna el valor numérico en texto plano o primitivo JSON:

```json
150.50
```

*(En caso de error, retorna: `"false"`)*
