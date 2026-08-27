# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /prospecto/recuperarcuenta`

**Controlador/Clase:** `ProspectoController`
**Método Principal:** `RecuperarCuenta(RecuperarCuentaRequest request)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe por POST un cuerpo JSON mapeado al modelo `RecuperarCuentaRequest` (con `nombre`, `apellidoPaterno`, `apellidoMaterno`, `fechaNacimiento`, `rfc`).
2. **Validación Inicial:**
   - Verifica que el request no sea nulo y que ninguno de los campos de entrada esté vacío. Si falta alguno, retorna "Datos inválidos" (estado = 4).
3. **Ejecución en Base de Datos (Validaciones Directas):**
   - El controlador se conecta a la base de datos principal (`sCadenaConexion`).
   - Ejecuta una consulta directa (`SELECT`) a la tabla `Cte`.
   - Filtra buscando una coincidencia exacta de los parámetros (sin acentos, usando el método `QuitarAcentos` internamente): `PersonalNombres`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`, `FechaNacimiento` y `RFC`.
   - Si encuentra un registro, extrae el `Cliente` y concatena los nombres para formar el nombre completo.
   - Pasa el nombre completo por la función `EncriptarNombre` (que ofusca las letras intermedias de cada palabra con asteriscos, ej: `J***n P***z`).
4. **Respuesta Final:**
   - Retorna un modelo `RecuperarCuentaResult` con el id de cliente, el nombre ofuscado y un estado de éxito (`estado = 1`).
   - El controlador serializa la respuesta a JSON.
   - En caso de excepción, devuelve objeto vacío con estado = 0.

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Cte, Select, "Cliente, PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, FechaNacimiento, RFC", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Post_recuperarcuenta_Tablas.csv`)*

## Ejemplo de Petición (Request)

```json
{
  "nombre": "JUAN",
  "apellidoPaterno": "PEREZ",
  "apellidoMaterno": "GARCIA",
  "fechaNacimiento": "1990-01-01",
  "rfc": "PEGJ900101XYZ"
}
```

## Ejemplo de Respuesta (Response)

```json
{
  "Cliente": "C00012345",
  "Nombre": "J**N P***Z G****A",
  "Estado": 1
}
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
