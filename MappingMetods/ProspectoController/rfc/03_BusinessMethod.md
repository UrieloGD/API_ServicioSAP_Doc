# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /prospecto/rfc`

**Controlador/Clase:** `ProspectoController`
**Método Principal:** `ObtenerRFC(RFCRequest request)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe por POST un cuerpo JSON mapeado al modelo `RFCRequest` (con `nombre`, `paterno`, `materno`, `nacimiento`).
2. **Validación Inicial:**
   - Verifica que el request no sea nulo y que los campos requeridos no estén en blanco. Si alguno falta, retorna `Datos inválidos`.
3. **Ejecución en Base de Datos (Validaciones Directas y Stored Procedure):**
   - El controlador se conecta a la base de datos a través de `Connection().sCadenaConexion`.
   - Llama al Stored Procedure **`spRegistroSugerir`** pasándole el parámetro `@Cual = 'RFC'` y los datos de la persona (usando el método local `QuitarAcentos` para limpiar los strings).
   - **Dentro de `spRegistroSugerir`:**
     - Genera la estructura base del RFC usando las reglas estándar de los apellidos y el nombre.
     - Valida contra la tabla `RFCAnexoIV` para evitar palabras altisonantes (sustituyendo la vocal por 'X').
     - Ejecuta internamente otros sub-procedimientos para cálculo (`spRFCClaveHomonima`, `spRFCDigitoVerificador`) que generan la homoclave y el dígito verificador.
4. **Respuesta Final:**
   - El SP retorna el RFC calculado usando `ExecuteScalar()`.
   - El controlador retorna este resultado serializado en un objeto `RFCResult` con estado 1 (éxito).

## Interacciones con Base de Datos (Tablas y SPs)

**Stored Procedure Principal Ejecutado:** `spRegistroSugerir`
El SP consulta las siguientes tablas para validar el RFC:

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
RFCAnexoIV, Select, "Palabra", , 
```
*(Opcionalmente, si se llamara con `@Cual = 'CURP'`, también consultaría `PaisEstado`, pero el endpoint lo llama fijo con `'RFC'`)*

*(El archivo CSV independiente fue generado en esta carpeta como `Post_rfc_Tablas.csv`)*

## Ejemplo de Petición (Request)

```json
{
  "nombre": "Juan",
  "paterno": "Perez",
  "materno": "Gomez",
  "nacimiento": "1990-01-01"
}
```

## Ejemplo de Respuesta (Response)

El endpoint retorna el RFC sugerido en JSON:

```json
{
  "rfc": "PEGJ900101XYZ",
  "estado": 1
}
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
