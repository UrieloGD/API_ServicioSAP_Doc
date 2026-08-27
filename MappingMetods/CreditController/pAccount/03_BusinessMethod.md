# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `GET /credit/getCreditAccount/{pAccount}`

**Controlador/Clase:** `CreditController`
**Método Principal:** `GetCreditAccount(string pAccount)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe una petición HTTP GET con el parámetro `pAccount` (Prospecto) en la URL.
2. **Llamada a la lógica de negocio:** 
   - El controlador instancia `CreditMethods` e invoca al método `GetCreditAccount(pAccount)` dentro de un bloque `try-catch`.
3. **Ejecución en Base de Datos (Validaciones Directas):**
   - El método `GetCreditAccount` se conecta a la base de datos a través de `Connection().sCadenaConexion`.
   - Arma directamente un string de `SELECT` para la tabla `CREDIHProspectoACliente` filtrando por el campo `Prospecto`.
   - Si obtiene resultados en el `SqlDataReader`, crea y retorna una nueva instancia del modelo `CreditAccount` llenando las propiedades:
     - `pAccount` = valor de la columna `Prospecto`.
     - `cAccount` = valor de la columna `Cliente`.
     - `date` = valor de la columna `Fecha` convertido a `DateTime`.
   - Si no hay resultados, retorna `null`.
4. **Respuesta Final:**
   - El controlador toma el modelo `CreditAccount` y lo retorna serializado como JSON nativo (`return Json(account)`).
   - Si ocurre una excepción, lanza un HTTP 500.

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**
La consulta a SQL Server se arma de forma directa, interactuando con una única tabla.

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
CREDIHProspectoACliente, Select, "Prospecto, Cliente, Fecha", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Get_getCreditAccount_Tablas.csv`)*

## Ejemplo de Petición (Request)

*Petición GET vía URL.*
```
GET /credit/getCreditAccount/P00012345
```

## Ejemplo de Respuesta (Response)

El endpoint retorna el objeto serializado de la cuenta de crédito (o nulo si no existe):

```json
{
  "pAccount": "P00012345",
  "cAccount": "C00012345",
  "date": "2023-01-01T00:00:00"
}
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
