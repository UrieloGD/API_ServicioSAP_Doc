# Mapeo del Endpoint: `POST /customerService/obtenerCreditos`

**Controlador/Clase:** `WebApiMagento.Controllers.CustomerServiceController` (archivo físico `CustomerServiceController.cs`)
**Método Principal:** `obtenerCreditos(ObtenerCreditosRequest request)` → invoca `WebApiMagento.Metodos.CustomerServiceMethods.obtenerCreditos(ObtenerCreditosRequest request)`

## Flujo de Ejecución Detallado

1. **Entrada del request:** El controlador tiene `[Authorize]` a nivel de clase y `[RoutePrefix("customerService")]` (`WebApiMagento\Controllers\CustomerServiceController.cs`, línea 9). La acción está decorada con `[HttpPost]` + `[Route("obtenerCreditos")]` (líneas 76-78), por lo que la ruta completa confirmada es `POST /customerService/obtenerCreditos`. El body se deserializa al modelo `WebApiMagento.Models.ObtenerCreditosRequest` (`WebApiMagento\Models\CustomerServiceRequest.cs`, líneas 55-59), con dos campos: `cliente_id` (string) y `uen` (int).

2. **Llamada a la capa de negocio:** El controlador instancia `CustomerServiceMethods` y ejecuta:
   ```csharp
   csm.obtenerCreditos(request)
   ```
   El resultado (un `string` con JSON ya serializado manualmente) se vuelve a pasar por `JsonConvert.DeserializeObject(...)` y se envuelve en `Ok(...)` (línea 82). Hay doble vuelta JSON (igual que en `obtenerTipoGarantia`): la capa de negocio serializa a string, el controlador la deserializa a objeto dinámico, y Web API la vuelve a serializar como cuerpo de la respuesta HTTP. El resultado visible para el cliente es equivalente al JSON producido por la capa de negocio.

3. **Ejecución de `CustomerServiceMethods.obtenerCreditos`** (`WebApiMagento\Metodos\CustomerServiceMethods.cs`, líneas 499-712):
   - Instancia `Connection` y abre un `SqlConnection` sobre `conn.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`, línea 26): `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` — la conexión principal de Intelisis/ERP.
   - Ejecuta una consulta **SQL inline** (no es un Stored Procedure) vía `SqlCommand`/`ExecuteReader`, con parámetros `@ClientId` (`SqlDbType.VarChar` ← `request.cliente_id`) y `@Uen` (`SqlDbType.Int` ← `request.uen`):
     ```sql
     SELECT
         v.id as IdVenta,
         v.MovId,
         ISNULL(v.FechaEmision, '') as 'FECHA SOLICITUD DE CREDITO',
         ISNULL(a.FechaEmision, '') as 'FECHA ANALISIS DE CREDITO',
         ISNULL(p.FechaEmision, '') as 'FECHA ESTATUS PEDIDO',
         ISNULL(f.FechaEmision, '') as 'FECHA ESTATUS',
         v.Importe as subtotal,
         v.PrecioTotal as total,
         c.Nombre as Cliente,
         vd.cantidad,
         vd.Articulo as sku,
         at.Descripcion1 as articulo,
         vd.Precio,
         CASE
             WHEN vd.PrecioAnterior = 99999.99 THEN 0
             WHEN ISNULL(vd.PrecioAnterior, 0) > 0 THEN vd.PrecioAnterior - vd.Precio
             ELSE 0
         END AS Descuento,
         ISNULL(v.estatus, '') as 'ESTATUS SOLICITUD DE CREDITO',
         ISNULL(a.Estatus, '') as 'ESTATUS ANALISIS DE CREDITO',
         ISNULL(p.Estatus, '') as 'ESTATUS PEDIDO',
         ISNULL(f.Estatus, '') as 'ESTATUS',
         CASE
             WHEN v.RedimePtos = 1 THEN tsmm.Importe
             ELSE 0
         END AS PuntosRedimidos
     FROM Venta v WITH(NOLOCK)
     JOIN Cte c WITH(NOLOCK) ON c.Cliente = v.Cliente
     JOIN VentaD vd WITH(NOLOCK) ON v.id = vd.id
     JOIN Art at WITH(NOLOCK) ON vd.Articulo = at.Articulo
     LEFT JOIN venta a WITH(NOLOCK) ON v.MovID = a.OrigenID AND a.Mov = 'analisis credito'
     LEFT JOIN venta p WITH(NOLOCK) ON a.MovID = p.OrigenID AND p.Mov = 'pedido'
     LEFT JOIN venta f WITH(NOLOCK) ON p.MovID = f.OrigenID
         AND f.Mov IN ('Credilana','Factura','Factura VIU','Prestamo Personal','Venta Perdida')
     LEFT JOIN TarjetaSerieMovMAVI tsmm WITH(NOLOCK) ON tsmm.ID = v.id
     WHERE v.Mov = 'solicitud credito'
       AND v.UEN = @Uen
       AND v.Cliente = @ClientId
       AND v.FechaEmision > (select dateadd(year, -2, getdate()))
       AND ISNULL(v.MovId, '') <> ''
     ORDER BY v.FechaEmision DESC
     ```
   - **Qué representa la consulta:** parte de las solicitudes de crédito del cliente (`Venta` con `Mov = 'solicitud credito'`, filtradas por `UEN` y `Cliente`, últimos 2 años) y encadena, vía `OrigenID`/`MovID`, la cadena de documentos derivados de esa solicitud dentro de la misma tabla `Venta` (self-joins con alias `a`, `p`, `f`):
     - `v` = Solicitud de Crédito (`Mov = 'solicitud credito'`)
     - `a` = Análisis de Crédito (`Mov = 'analisis credito'`, `a.OrigenID = v.MovID`)
     - `p` = Pedido (`Mov = 'pedido'`, `p.OrigenID = a.MovID`)
     - `f` = Documento final (`Mov IN ('Credilana','Factura','Factura VIU','Prestamo Personal','Venta Perdida')`, `f.OrigenID = p.MovID`)
     - Además hace join a `Cte` (datos del cliente), `VentaD`+`Art` (detalle de artículos de la solicitud) y `TarjetaSerieMovMAVI` (para obtener puntos redimidos si `v.RedimePtos = 1`).
   - Cada fila del `SqlDataReader` representa **un artículo** de una solicitud de crédito (por el join a `VentaD`), por lo que una misma solicitud (`id` = `v.MovId`, columna índice 1) puede generar varias filas.
   - **Derivación de `estatus`** (líneas 604-617), evaluada con sentencias `if` independientes (no `else if`, por lo que una condición posterior puede sobreescribir el resultado de una anterior dentro del mismo `while`):
     - `estatusSolicitudCredito` (`SINAFECTAR` o `PENDIENTE`) → `"pendiente"`
     - `estatusSolicitudCredito == "CONCLUIDO"` y `estatusAnalisisCredito` en (`PENDIENTE`,`SINAFECTAR`) → `"en proceso"`
     - Si cualquiera de `estatusSolicitudCredito`/`estatusAnalisisCredito`/`estatusPedido`/`estatusVenta` es `"CANCELADO"` → `"rechazado"`
     - `estatusAnalisisCredito == "CONCLUIDO "` (nota: el literal en código tiene un espacio final — posible bug preexistente que impediría que esta condición se cumpla si el dato real no trae ese espacio) y `estatusPedido` vacío/`PENDIENTE`/`SINAFECTAR` y `estatusVenta` vacío/`SINAFECTAR` → `"aceptado"`
     - `estatusVenta == "CONCLUIDO"` → `"entregado"`
   - **Derivación de `fecha`:** arranca en `fechaSolicitudCredito` (columna 2) y avanza a `fechaAnalisisCredito` (3), `fechaEstatusPedido` (4), `fechaEstatus` (5) cada vez que la siguiente fecha en la cadena es posterior a la anterior — en efecto toma la fecha más reciente disponible en la cadena de documentos, formateada `yyyy-MM-dd`.
   - `total` = columna 7 (`v.PrecioTotal`); `subtotal` = `Math.Round(columna 6, 2)` (`v.Importe`); `cliente` = columna 8 (`c.Nombre`); `point_redeemed` = columna 18 (`PuntosRedimidos` calculado en SQL).
   - Por cada fila arma un objeto `articulo` (`sku` = col 10, `nombre` = col 11, `precio` = col 12, `Descuento` = col 13) y un item `{ cantidad = col 9, articulo }`.
   - **Agrupación:** usa `id` = columna 1 (`v.MovId`) como llave. Si ya existe una entrada con ese `id` en `listF`, agrega el nuevo item a su lista `productos`; si no existe, crea una nueva entrada `CreditStruct` con `id`, `fecha`, `total`, `subtotal`, `estatus`, `cliente`, `point_redeemed` y `productos = [item]`. Esto consolida múltiples filas (una por artículo) en un único objeto por solicitud de crédito.
   - Serializa la lista final `listF` con `JsonConvert.SerializeObject(listF)`.
   - Cierra el `SqlDataReader` y la conexión.
   - **Manejo de errores:** todo el método está en un único `try/catch`. Ante cualquier excepción se registra vía `Logger.CustomerService("ERROR ", e.Message)` — que solo escribe a un archivo de log local (`C:\inetpub\wwwroot\log\customerService.log`, `WebApiMagento\Helper\Logger.cs`, líneas 134-142; no es interacción de base de datos ni servicio externo) — y `respuesta` se sobreescribe con el mensaje de excepción en texto plano (no JSON válido). En ese caso, `JsonConvert.DeserializeObject(...)` del controlador fallaría o produciría un valor no estructurado; no hay manejo adicional de ese caso límite en el código actual.

4. **Salida del response:** El controlador retorna `Ok(...)` con el objeto ya deserializado desde el string JSON producido por la capa de negocio. No hay llamadas a servicios externos (Magento, SAP, LAN, Curl, etc.) ni ejecución de Stored Procedures en este flujo: toda la lógica de datos ocurre en una única consulta SQL inline sobre la conexión Intelisis, más lógica de agregación/derivación de estatus en memoria (C#).

## Interacciones con Base de Datos (Tablas y SPs)

No se ejecuta ningún Stored Procedure en este endpoint — toda la consulta es SQL inline sobre la conexión `Connection.sCadenaConexion` (Intelisis / `IntelisisTmp` en `MAVICUBOS.grupomavi.com`). Todas las tablas se leen directamente sobre esa misma conexión, sin servidor vinculado, por lo que todas se clasifican como `Intelisis`. La tabla `Venta` se auto-referencia 4 veces (alias `v`, `a`, `p`, `f`) para encadenar los documentos derivados de la solicitud de crédito; se documenta como una sola fila indicando los distintos roles/alias.

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/obtenerCreditos, Intelisis, Venta, Select, "id, MovId, MovID, OrigenID, Mov, UEN, Cliente, FechaEmision, Importe, PrecioTotal, estatus, Estatus, RedimePtos (alias v=Solicitud Credito; a=Analisis Credito; p=Pedido; f=Factura/Credilana/Factura VIU/Prestamo Personal/Venta Perdida)", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/obtenerCreditos, Intelisis, Cte, Select, "Cliente, Nombre", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/obtenerCreditos, Intelisis, VentaD, Select, "id, cantidad, Articulo, Precio, PrecioAnterior", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/obtenerCreditos, Intelisis, Art, Select, "Articulo, Descripcion1", ,
WebApiMagento.Controllers.CustomerServiceController, POST /customerService/obtenerCreditos, Intelisis, TarjetaSerieMovMAVI, Select, "ID, Importe", ,
```

## Ejemplo de Respuesta (Response)

No existe un DTO/modelo tipado expuesto públicamente para la respuesta; se serializa el `struct` interno `CreditStruct` (`WebApiMagento\Metodos\CustomerServiceMethods.cs`, líneas 702-712) más objetos anónimos anidados para `productos`/`articulo`. El resultado es un **arreglo JSON**, con un elemento por cada solicitud de crédito (`id` = `MovId`) encontrada, agrupando sus artículos en `productos`:

```json
[
  {
    "id": "MOV-000123",
    "fecha": "2026-05-14",
    "total": 12500.00,
    "subtotal": 11800.50,
    "estatus": "en proceso",
    "cliente": "NOMBRE DEL CLIENTE",
    "point_redeemed": 0.0,
    "productos": [
      {
        "cantidad": 1.0,
        "articulo": {
          "sku": "SKU-0001",
          "nombre": "DESCRIPCION DEL ARTICULO",
          "precio": 11800.50,
          "Descuento": 0.0
        }
      },
      {
        "cantidad": 2.0,
        "articulo": {
          "sku": "SKU-0002",
          "nombre": "OTRO ARTICULO",
          "precio": 350.00,
          "Descuento": 25.00
        }
      }
    ]
  }
]
```

Si no hay filas (`dr.HasRows == false`), `respuesta` queda como `JsonConvert.SerializeObject("")` (la cadena JSON `""`, no un arreglo vacío `[]`) — comportamiento tal cual está en el código, relevante para la migración.
