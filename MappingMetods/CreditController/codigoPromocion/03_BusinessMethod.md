# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /credit/codigoPromocion`

**Controlador/Clase:** `CreditController`
**Método Principal:** `CodigoPromocion(CodigoPromocion cp)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe por POST un cuerpo JSON mapeado al modelo `CodigoPromocion`, el cual contiene las propiedades `codigo`, `opcion` y `idMagento`.
2. **Llamada a la lógica de negocio:** 
   - El controlador instancia `CreditMethods` e invoca al método `CodigoPromocion(cp.codigo, cp.opcion, cp.idMagento)` dentro de un bloque `try-catch`.
3. **Ejecución en Base de Datos (SP):**
   - En `CreditMethods`, se abre una conexión a base de datos usando `Connection().sCadenaConexion`.
   - Se ejecuta el Stored Procedure `SpVTASVentaCupon` pasándole los 3 parámetros de entrada: `@opcion`, `@Codigo` e `@IdEcommerce`.
   - El resultado del SP llena un `DataTable` mediante un `SqlDataReader`.
   - Dependiendo del parámetro `@opcion`, el SP realiza diferentes lógicas:
     - Si es `"ValidarCupon"`, busca el código en `VTASCVentaCupon`. Si no lo halla, busca al personal en `Comercializadora.dbo.Personal` y cruza su puesto contra la tabla de configuración `TablaStD`. Si tiene permiso, auto-genera un cupón llamando recursivamente al mismo SP con la opción `"NUEVO"`. Al final retorna una tabla con una columna `Conteo` (0 o 1).
     - Si es `"Elimina"`, actualiza (Update) la `FechaUtilizacion` e `IdEcommerce` en el cupón no utilizado de la tabla `VTASCVentaCupon` y, posteriormente, llama a la opción `"NUEVO"` recursivamente para reasignarle otro cupón.
     - Si es `"NUEVO"`, hace un `SELECT` a las tablas `Agente` y `Sucursal` e inserta un nuevo registro en `VTASCVentaCupon`.
4. **Validación de Resultados en C#:**
   - Si la opción es `"ValidarCupon"`:
     - Lee el valor devuelto en la columna `Conteo`.
     - Si `Conteo == "0"`, retorna el string `"Erroneo"`.
     - Si `Conteo == "2"`, retorna el string `"Utilizado"`.
     - De lo contrario, retorna `"OK"`.
   - Si la opción es `"Elimina"`:
     - Si el `DataTable` retornó vacío (`dt.Rows.Count == 0`), retorna `"Eliminado"`.
5. **Respuesta Final:**
   - El controlador retorna el string resultante envuelto en un HTTP 200 (Ok).
   - En caso de ocurrir alguna excepción, retorna un 500 (`InternalServerError`).

## Interacciones con Base de Datos (Tablas y SPs)

**Stored Procedure Ejecutado:** `SpVTASVentaCupon`

Dado que el parámetro `@opcion` altera completamente el flujo, este SP toca múltiples tablas (lectura, inserción y actualización):

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
VTASCVentaCupon, Select, "Codigo", , 
Comercializadora.dbo.Personal, Select, "Departamento, Puesto", , 
TablaStD, Select, "Valor, TablaSt, Nombre", , 
VTASCVentaCupon, Update, "FechaUtilizacion, IdEcommerce, Codigo", , 
Agente, Select, "Sucursal, Agente, SucursalEmpresa", , 
Sucursal, Select, "Sucursal", , 
VTASCVentaCupon, Insert, "Codigo, Agente, FechaEnvio, Cliente, Sucursal", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Post_codigoPromocion_Tablas.csv`)*

## Ejemplo de Petición (Request)

```json
{
  "codigo": "PROMO2023",
  "opcion": "ValidarCupon",
  "idMagento": "100"
}
```

## Ejemplo de Respuesta (Response)

El endpoint retorna un texto plano (string de JSON) según la validación:

```json
"OK"
```
*(Posibles valores: `"OK"`, `"Erroneo"`, `"Utilizado"`, `"Eliminado"`).*


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
