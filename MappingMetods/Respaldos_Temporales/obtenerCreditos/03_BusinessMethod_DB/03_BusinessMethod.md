# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.obtenerCreditos()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public string obtenerCreditos(ObtenerCreditosRequest request)` — Líneas 499–600
**Capa:** LAN (Nexo)
**Rol en el flujo:** Obtiene el historial de solicitudes de crédito de un cliente para una UEN específica, cruzando la información de venta, detalle de venta (artículos) y estatus del pedido.

---

## Flujo de Ejecución Detallado

1. Ejecuta una Query SELECT muy extensa en Intelisis con múltiples JOINs:
   - `Venta v` (con `v.Mov = 'solicitud credito'`)
   - `Cte c` (para el nombre)
   - `VentaD vd` (detalle del artículo/precio)
   - `Art at` (descripción del artículo)
   - Varios LEFT JOIN sobre la misma tabla `Venta` usando alias `a` (análisis), `p` (pedido) y `f` (estatus de factura/crédito) para rastrear el ciclo de vida del movimiento a través de la columna `OrigenID` conectada con `MovID`.
   - `TarjetaSerieMovMAVI tsmm` (puntos redimidos).
2. Pasa los parámetros `@ClientId` y `@Uen`. Filtra las ventas de los últimos 2 años (vía `dateadd(year, -2, getdate())`).
3. Itera sobre los resultados mapeando cada registro a un struct interno `CreditStruct` (con propiedades como Id, Estatus, Articulo, Subtotal, Fechas varias, Puntos redimidos, Descuento).
4. Retorna un JSON serializado de la lista de struct.

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Venta | Select | Id, MovId, FechaEmision, Importe, PrecioTotal, Estatus, OrigenID |
| IntelisisTmp | MAVICUBOS.grupomavi.com | Cte | Select | Nombre |
| IntelisisTmp | MAVICUBOS.grupomavi.com | VentaD | Select | Cantidad, Articulo, Precio, PrecioAnterior |
| IntelisisTmp | MAVICUBOS.grupomavi.com | Art | Select | Descripcion1 |
| IntelisisTmp | MAVICUBOS.grupomavi.com | TarjetaSerieMovMAVI | Select | Importe |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
