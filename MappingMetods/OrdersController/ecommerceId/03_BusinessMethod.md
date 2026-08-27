# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `GET /order/estimated-delivery/{ecommerceId}`

**Controlador/Clase:** `OrdersController`
**Método Principal:** `GetEstimatedDelivery(string ecommerceId)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe una petición HTTP GET pasando el parámetro `ecommerceId` (string) en la URL.
2. **Llamada a la lógica de negocio:** 
   - El controlador instancia `EstimatedDeliveryMethods` y llama a `GetEstimateDeliveryData(ecommerceId)`.
3. **Ejecución en Base de Datos (Validaciones Directas):**
   - **`GetMovId`:** Primero, se conecta a la base de datos principal y hace un `SELECT TOP (1)` a la tabla `Venta` filtrando por `IDEcommerce` y buscando que el movimiento sea una factura (`Mov IN ('Factura', 'Factura VIU')`). Retorna el `MovId`.
   - **Búsqueda de Paquetería:** Si encuentra el `MovId`, realiza una segunda consulta a la tabla `INVDPaqueteriaGuia`, buscando el registro que coincida con ese `MovId` y que tenga la guía y código de rastreo llenos (`NoGuia IS NOT NULL AND NoCodigoRastreo IS NOT NULL`). Extrae paquetería, guía y código de rastreo.
   - **`GetUrlDelivery`:** Finalmente, con el nombre de la paquetería obtenido en el paso anterior, hace una tercera consulta a la tabla de configuración `EMBCConfiguracionPaqueteria` para obtener el link/URL correspondiente (`LinkPaqueteria`).
4. **Respuesta Final:**
   - Retorna un objeto anónimo con las propiedades `paqueteria`, `NoGuia`, `NoCodigoRastreo`, y `url`. El controlador lo envuelve en un HTTP 200 (Ok) convirtiéndolo a JSON.

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**
Se realizan 3 cruces/lecturas a diferentes tablas mediante queries directos.

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Venta, Select, "MovId, IDEcommerce, Mov", , 
INVDPaqueteriaGuia, Select, "Paqueteria, NoGuia, NoCodigoRastreo, MovId", , 
EMBCConfiguracionPaqueteria, Select, "LinkPaqueteria, NombrePaqueteria", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Get_estimated-delivery_Tablas.csv`)*

## Ejemplo de Petición (Request)

*Petición GET vía URL.*
```
GET /order/estimated-delivery/100012345
```

## Ejemplo de Respuesta (Response)

El endpoint retorna la información de paquetería:

```json
{
  "paqueteria": "FEDEX",
  "NoGuia": "1234567890",
  "NoCodigoRastreo": "FDX-123",
  "url": "https://www.fedex.com/tracking?tracknumbers="
}
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
