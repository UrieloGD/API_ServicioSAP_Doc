# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /credit/GetUnificationWalletStatus`

**Controlador/Clase:** `CreditController`
**Método Principal:** `GetUnificationWalletStatus(UnificationWalletStatusRequest data)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe una petición HTTP POST con el objeto JSON mapeado a `UnificationWalletStatusRequest`, el cual contiene la propiedad `IdEcommerce`.
2. **Llamada a la lógica de negocio:** 
   - El controlador instancia `CreditMethods` e invoca al método `SelectUnificationWalletStatus(data)` dentro de un bloque `try-catch`.
3. **Ejecución en Base de Datos (Validaciones Directas):**
   - El método establece conexión con la base de datos a través de `Connection().sCadenaConexion`.
   - Se ejecuta una consulta directa (sin SP) a la tabla `CREDIHUnificacionMonedero`:
     `SELECT Estatus, FechaUnificacion FROM CREDIHUnificacionMonedero WITH (NOLOCK) WHERE IdEcommerce = @IdEcommerce`
   - Si no hay registros encontrados, retorna el string `"DESCONOCIDO"`.
   - Si se encuentra un registro, se lee:
     - Si la columna 1 (`FechaUnificacion`) es nula, retorna `"PENDIENTE"`.
     - Si no es nula, lee la columna 0 (`Estatus` tipo booleano). Si es verdadero, retorna `"COMPLETADO"`; si es falso, retorna `"RECHAZADO"`.
4. **Respuesta Final:**
   - El string retornado se serializa en el controlador usando `JsonConvert.SerializeObject` y se envuelve en un HTTP 200 (Ok).
   - En caso de ocurrir alguna excepción, se guarda en el log y retorna `"DESCONOCIDO"`.

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
CREDIHUnificacionMonedero, Select, "Estatus, FechaUnificacion, IdEcommerce", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Post_GetUnificationWalletStatus_Tablas.csv`)*

## Ejemplo de Petición (Request)

```json
{
  "IdEcommerce": "WEB-12345"
}
```

## Ejemplo de Respuesta (Response)

El endpoint retorna el estado en forma de string JSON:

```json
"COMPLETADO"
```
*(Posibles valores: `"COMPLETADO"`, `"RECHAZADO"`, `"PENDIENTE"`, `"DESCONOCIDO"`).*


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
