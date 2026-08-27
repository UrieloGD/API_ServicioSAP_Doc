# Mapeo del Endpoint: `POST /company/negotiable-quote/create`

**Controlador/Clase:** `WebApiMagento.Controllers.WholesaleCustomerController` (`[RoutePrefix("company")]`, clase decorada con `[Authorize]`)
**Método Principal:** `GetWholesaleAccount(NegotiableQuoteRequest negotiableQuoteRequest)` → delega en `WebApiMagento.Metodos.WholesaleCustomerMethods.CrateNegotiableQuote(NegotiableQuoteRequest negotiableQuoteRequest)`

> Nota: el método de acción se llama `GetWholesaleAccount` pese a estar bajo el atributo `[HttpPost]` y la región `#region CrateNegotiableQuote` — nombre heredado/probablemente copiado del endpoint GET vecino, no afecta el enrutamiento (el `[Route("negotiable-quote/create")]` es explícito).

## Flujo de Ejecución Detallado

1. **Entrada del request:** El endpoint recibe un `POST` a `/company/negotiable-quote/create` con el body deserializado automáticamente (model binding de Web API) a un objeto `NegotiableQuoteRequest` (definido en `WebApiMagento\Models\WholesaleCustomerRequest.cs`), con las propiedades: `folioIdEcommerce` (int), `cuenta` (string), `agente` (string), `condicion` (string), `canal` (int), `almacen` (string), `sucursal` (int), `importe` (float), `impuesto` (float), `articulos` (`List<Dictionary<string,string>>`, cada diccionario se espera con llaves `sku`, `cantidad`, `precio`).

2. **Sobrescritura de valores fijos en el controlador:** Antes de invocar la lógica de negocio, el controlador pisa 4 campos del request recibido, ignorando lo que el cliente haya enviado en ellos:
   - `agente = "P000098"`
   - `canal = 11`
   - `almacen = "V00096"`
   - `sucursal = 98`

3. **`WholesaleCustomerMethods.CrateNegotiableQuote(negotiableQuoteRequest)`** (única puerta de entrada a la lógica de negocio):
   ```csharp
   internal string CrateNegotiableQuote(NegotiableQuoteRequest negotiableQuoteRequest)
   {
       int tableVentaId = this.InsertTableVenta(negotiableQuoteRequest);
       return (tableVentaId != 0) ? this.InsertTableVentaD(negotiableQuoteRequest, tableVentaId).ToString() : "0";
   }
   ```

   a. **`InsertTableVenta(negotiableQuoteRequest)`** — crea el encabezado del pedido de mayoreo:
      - Abre `SqlConnection` con la cadena `Connection.sCadenaConexion` (`WebApiMagento\Conn\Connection.cs`, apunta a `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp`).
      - Ejecuta un `INSERT INTO VENTA(...) VALUES(...) SELECT SCOPE_IDENTITY() AS idVenta` (SQL directo parametrizado, sin SP) con `SqlCommand.ExecuteReader()`.
      - Valores fijos/hardcodeados de negocio: `Empresa='MAVI'`, `Mov='Pedido Mayoreo'`, `UEN=3`, `Moneda='PESOS'`, `Estatus='SINAFECTAR'`, `Situacion='En Revision Ventas Mayoreo'`, `SituacionUsuario='VENTM00094'`, `Directo=1`, `Prioridad='normal'`, `RenglonID=1`, `Condicion='CONTADO MAY FORANEO'`, banderas de servicio en 0, `ZonaImpuesto='OCCIDENTE'`, `DesglosarImpuestos=1`, `SubModulo='VTAS'`, `SucursalVenta=98`, `FormaPagoTipo='Mayoreo'`, `SucursalOrigen=SucursalDestino=OrigenSucursal=98`, `ArtQ=0`, `VtaDIMANuevo=0`, `POSRedondeoVerif=0`, `Reactivado=1`, `FacDesgloseIVA=0`, `Observaciones` = texto fijo de aviso de intereses moratorios.
      - Parámetros dinámicos: `FechaEmision`/`SituacionFecha` = `DateTime.Now`, `Cliente = cuenta`, `EnviarA = canal`, `Almacen = almacen`, `Agente = agente`, `Sucursal = sucursal`, `IDEcommerce = folioIdEcommerce`, `ReferenciaOrdenCompra = folioIdEcommerce`.
      - Lee el primer (y único) registro del reader y castea `SCOPE_IDENTITY()` (decimal) a `int` → `tableVentaId`.
      - Si ocurre `SqlException`, se registra con `Logger.CustomerService("ERROR ", e.Message)` y el método retorna `0` (encabezado no creado).

   b. Si `tableVentaId != 0`, se llama **`InsertTableVentaD(negotiableQuoteRequest, tableVentaId)`** — inserta las líneas/partidas del pedido:
      - Itera cada `item` (Dictionary) en `negotiableQuoteRequest.articulos`, con índice `i` empezando en 1:
        - Llama a **`getUnidadArt(item["sku"])`**: abre una nueva `SqlConnection`, ejecuta `SELECT unidad FROM art WITH(NOLOCK) WHERE Articulo = @Articulo` y retorna el valor de `unidad` de la primera fila (o `""` si no hay filas).
        - Calcula `renglon = i * 2048` (numeración de línea espaciada).
        - Ejecuta `INSERT INTO VENTAD(ID, Renglon, RenglonSub, RenglonID, RenglonTipo, Cantidad, Almacen, EnviarA, Articulo, Precio, PrecioSugerido, Impuesto1, FechaRequerida, Agente, Sucursal, SucursalOrigen, UEN, MonxRedApli, unidad) VALUES(...)` por cada artículo, con `ExecuteNonQuery()`. Valores fijos: `RenglonSub=0`, `RenglonTipo='N'`, `Impuesto1=16`, `SucursalOrigen=98`, `UEN=3`, `MonxRedApli=0`.
        - Parámetros dinámicos: `ID = ventaId` (encabezado creado en el paso anterior), `Renglon`, `RenglonID = i`, `Cantidad = item["cantidad"]`, `Almacen = almacen`, `EnviarA = canal`, `Articulo = item["sku"]`, `Precio = PrecioSugerido = item["precio"]`, `FechaRequerida = DateTime.Now`, `Agente = agente`, `Sucursal = sucursal`, `Unidad` (resultado de `getUnidadArt`).
        - *Observación de código:* se define un parámetro `@Cliente` (con `negotiableQuoteRequest.cuenta`) que nunca se referencia en el texto del `INSERT` — parámetro muerto, no rompe la ejecución pero es ruido a limpiar en la migración.
      - Si cualquier iteración lanza excepción, se registra el error y el método corta inmediatamente el ciclo retornando `0` (líneas ya insertadas antes del error quedan persistidas — no hay transacción ni rollback).
      - Si todas las líneas se insertan sin error, retorna `1`.

4. **Construcción de la respuesta:** `CrateNegotiableQuote` retorna un `string`: `"1"` (éxito total), `"0"` (fallo al crear encabezado o fallo/parcial en el detalle). El controlador envuelve ese string en `Ok(...)`, por lo que Web API serializa el string como valor JSON simple (el body de la respuesta HTTP 200 es literalmente `"1"` o `"0"`, no un objeto JSON con propiedades).

**Puntos relevantes para la migración a SAP:**
- No hay ningún Stored Procedure (`CommandType.StoredProcedure`) involucrado en todo el flujo — toda la persistencia se hace con sentencias `INSERT`/`SELECT` parametrizadas directamente en C#.
- No hay llamadas a servicios externos (`Curl.*`, `Magento.*`) en este flujo — es 100% síncrono contra la base de datos `IntelisisTmp`.
- No hay manejo transaccional (`SqlTransaction`): si falla la inserción de una línea de `VENTAD` a mitad del ciclo, el encabezado `VENTA` y las líneas previas ya insertadas quedan huérfanas/parciales.
- El campo `condicion`, `importe` e `impuesto` del `NegotiableQuoteRequest` se reciben pero **no se usan** en ninguna consulta de este flujo (la condición de pago se hardcodea a `'CONTADO MAY FORANEO'`).

## Interacciones con Base de Datos (Tablas y SPs)

```csv
Controlador, URL, DatabaseConnection, NombreTabla, Accion (Select/Insert/Update/Delete), Campos Principales, Nombre TablaSAP, API SAP
WebApiMagento.Controllers.WholesaleCustomerController, POST /company/negotiable-quote/create, Intelisis, VENTA, Insert, "Empresa, Mov, FechaEmision, UEN, Moneda, Estatus, Situacion, SituacionFecha, SituacionUsuario, Directo, Prioridad, RenglonID, Cliente, EnviarA, Almacen, Agente, ReferenciaOrdenCompra, Condicion, ServicioGarantia, ServicioExpress, ServicioDemerito, ServicioDeducible, GenerarPoliza, ZonaImpuesto, Extra, Sucursal, DesglosarImpuestos, SubModulo, Logico1, Logico2, Logico3, Logico4, Extra1, Extra2, Extra3, SucursalVenta, FormaPagoTipo, SucursalOrigen, SucursalDestino, OrigenSucursal, ArtQ, IDEcommerce, VtaDIMANuevo, POSRedondeoVerif, Reactivado, FacDesgloseIVA, Observaciones",,
WebApiMagento.Controllers.WholesaleCustomerController, POST /company/negotiable-quote/create, Intelisis, VENTAD, Insert, "ID, Renglon, RenglonSub, RenglonID, RenglonTipo, Cantidad, Almacen, EnviarA, Articulo, Precio, PrecioSugerido, Impuesto1, FechaRequerida, Agente, Sucursal, SucursalOrigen, UEN, MonxRedApli, unidad", ,
WebApiMagento.Controllers.WholesaleCustomerController, POST /company/negotiable-quote/create, Intelisis, art, Select, "unidad, Articulo",,
```

## Ejemplo de Respuesta (Response)

No existe un DTO de respuesta tipado: el método de negocio retorna `string` crudo y el controlador lo envuelve en `Ok(string)`, por lo que Web API lo serializa como un literal JSON de tipo string (no un objeto).

```json
"1"
```

Posible respuesta de fallo (encabezado `VENTA` no creado, o error durante la inserción de alguna línea en `VENTAD`):

```json
"0"
```
