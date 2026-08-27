# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `GET /credit/getPlazos`

**Controlador/Clase:** `CreditController`
**Método Principal:** `GetPlazos()`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe una petición HTTP GET sin parámetros.
2. **Llamada a la lógica de negocio:** 
   - El controlador instancia `CreditMethods` e invoca al método `GetPlazos()`.
   - El resultado se des-serializa (ya que internamente el método lo serializa a string) para retornarlo como un objeto JSON nativo.
3. **Ejecución en Base de Datos (Validaciones Directas):**
   - El método `GetPlazos` construye un objeto con dos propiedades: `Diferidos` e `Inmediatos`.
   - Para cada propiedad, hace una llamada al método privado `GetDelayedDays()` pasándole un string de condición (`"DIF"` o `"INM"`) y la conexión activa (`sCadenaConexion`).
   - El método `GetDelayedDays()` obtiene la consulta SQL llamando a `GetQueryDelayedDays()`.
   - La consulta SQL hace un `UNION` entre dos `SELECT TOP 1` que unen las tablas `Condicion` y `VTASCCondicionesCredVtaLinea`.
   - Se filtra donde `Mensualidades = 12`, se separa por `TiendaVirtual` ('MUEBLES AMERICA' o 'VIU') y se aplica un `LIKE` sobre la columna `CondicionPropre` usando la condición recibida (`%DIF%` o `%INM%`).
   - Se recorre el `SqlDataReader` y se mapea una lista de objetos anónimos con las propiedades `Days` (obtenido de `DiasVencimiento`) y `StoreCode` (obtenido de `TiendaVirtual`, pasándolo a mayúsculas y reemplazando espacios por guiones bajos, ej. `MUEBLES_AMERICA`).
4. **Respuesta Final:**
   - Retorna un objeto JSON con dos listas (`Diferidos` e `Inmediatos`).
   - Si ocurre una excepción, se guarda en el log y retorna un objeto de error `{ Error = true, Message = "..." }`.

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**
Se ejecuta el query directamente en código usando la estructura base.

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Condicion, Select, "DiasVencimiento, Condicion", , 
VTASCCondicionesCredVtaLinea, Select, "Condicion, Mensualidades, TiendaVirtual, CondicionPropre", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Get_getPlazos_Tablas.csv`)*

## Ejemplo de Petición (Request)

*Petición GET sin parámetros de entrada.*

## Ejemplo de Respuesta (Response)

El endpoint retorna el objeto serializado con los días de vencimiento por cada tienda:

```json
{
  "Diferidos": [
    {
      "Days": 15,
      "StoreCode": "MUEBLES_AMERICA"
    },
    {
      "Days": 30,
      "StoreCode": "VIU"
    }
  ],
  "Inmediatos": [
    {
      "Days": 0,
      "StoreCode": "MUEBLES_AMERICA"
    },
    {
      "Days": 0,
      "StoreCode": "VIU"
    }
  ]
}
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
