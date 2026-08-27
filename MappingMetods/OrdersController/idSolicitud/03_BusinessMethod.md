# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `GET /order/creditStatus/{idSolicitud}`

**Controlador/Clase:** `OrdersController`
**Método Principal:** `GetCreditStatus(int idSolicitud)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe una petición HTTP GET con el parámetro numérico `idSolicitud` en la URL.
2. **Validación Inicial:**
   - Si `idSolicitud` es menor o igual a 0, retorna `BadRequest("idSolicitud debe ser mayor a 0")`.
3. **Llamada a la lógica de negocio:** 
   - El controlador llama a `om.GetCreditStatus(idSolicitud)` dentro de un bloque `try-catch`.
4. **Ejecución en Base de Datos (Validaciones Directas):**
   - El método hace tres consultas escalonadas directamente a la tabla `Venta`:
     - **Paso 1 (Solicitud de Crédito):** Busca el `IDEcommerce` y el `Estatus` donde `ID = @IdSolicitud` y `Mov = 'Solicitud Credito'`. Si no existe, retorna `"EN_ANALISIS"`. Si está `"CANCELADO"`, retorna `"RECHAZADO"`.
     - **Paso 2 (Análisis de Crédito):** Busca el `Estatus` donde el `IDEcommerce` coincida con el anterior y el `Mov` sea 'Analisis Credito' (o con acentos). Si alguno de estos movimientos está `"CANCELADO"`, retorna `"RECHAZADO"`.
     - **Paso 3 (Pedido):** Busca la `Situacion` y el `Estatus` del pedido (`Mov = 'Pedido'`) ordenando descendentemente para tomar el último. Si no existe, retorna `"EN_ANALISIS"`. Si la situación es `"Rechazado"` o el estatus es `"CANCELADO"`, retorna `"RECHAZADO"`.
     - Si pasa todas estas barreras sin ser rechazado o quedarse en análisis, asume que el crédito fue aprobado y retorna `"AUTORIZADO"`.
5. **Respuesta Final:**
   - El string resultante (`"EN_ANALISIS"`, `"RECHAZADO"` o `"AUTORIZADO"`) se serializa a JSON (`{ status: "..." }`).

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**
Tres consultas `SELECT` a la misma tabla usando distintos filtros lógicos de negocio.

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Venta, Select, "IDEcommerce, Estatus, Situacion, Mov, ID", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Get_creditStatus_Tablas.csv`)*

## Ejemplo de Petición (Request)

*Petición GET vía URL.*
```
GET /order/creditStatus/123456
```

## Ejemplo de Respuesta (Response)

El endpoint retorna el estado procesado en JSON:

```json
{
  "status": "AUTORIZADO"
}
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
