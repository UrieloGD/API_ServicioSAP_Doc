# Mapeo del Método: `ProductMethods.getStockStore()` — Lógica de Negocio

**Endpoint:** `POST /product/getStockByStore`
**Archivo:** `APIMagento/WebApiMagento/Metodos/ProductMethods.cs`
**Método:** `public List<string> getStockStore(StoreStockRequest storeStock)` — Líneas **1000–1070**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dado un conjunto de SKUs, una tienda y un estado, devolver **qué SKUs de la lista tienen existencia disponible** en esa tienda/estado. Filtro de disponibilidad por punto de venta.
**Región:** `#region Stock Store` (`ProductMethods.cs:999–1071`)

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `StoreStockRequest` — `APIMagento/WebApiMagento/Models/Product.cs` líneas **245–250**:

| Campo | Tipo C# | Uso dentro del método | Parámetro SQL |
|---|---|---|---|
| `store_id` | **string** | Identificador de la tienda | `@P1` — declarado **`SqlDbType.Int`** (⚠️ ver obs. 4) |
| `state` | string | Estado/entidad de la tienda | `@P2` — `SqlDbType.VarChar` (sin tamaño) |
| `products` | `List<string>` | Lista de SKUs a evaluar | `@P0` — **`SqlDbType.Structured`** (TVP `VTASPedidoMagento`) |

El modelo espejo en DMZ está en `APIMagentoDMZ/WebApiMagento/Models/Product.cs` líneas **65–70** — **estructura idéntica**, pero la DMZ nunca lo usa ([[01_DMZ_Controller]]).

**No hay validación de ningún campo.** Ni `null`, ni vacío, ni formato, ni cardinalidad.

---

## Flujo de Ejecución Detallado

```csharp
public List<string> getStockStore(StoreStockRequest storeStock)
{
    List<string> resultado = new List<string>();

    Connection cadenac = new Connection();
    using (SqlConnection conexion = new SqlConnection(cadenac.sCadenaConexion))
    {
        DataTable dt = new DataTable("PedidoMagento");
        dt.Columns.Add("sku", typeof(string));
        dt.Columns.Add("qty", typeof(int));

        foreach (string sku in storeStock.products)
        {
            DataRow fila = dt.NewRow();
            fila["sku"] = sku;
            fila["qty"] = 1;
            dt.Rows.Add(fila);
        }

        conexion.Open();

        SqlCommand command = new SqlCommand(@"SpVTASEcommerceStoreStock @P0, @P1 ,@P2", conexion);
        SqlParameter P0 = new SqlParameter("@P0", System.Data.SqlDbType.Structured);
        SqlParameter P1 = new SqlParameter("@P1", SqlDbType.Int);
        SqlParameter P2 = new SqlParameter("@P2", SqlDbType.VarChar);

        P0.Value = dt;
        P0.TypeName = "VTASPedidoMagento";
        P1.Value = storeStock.store_id;
        P2.Value = storeStock.state;

        command.CommandTimeout = 10000;
        command.Parameters.AddRange(new SqlParameter[] { P0, P1, P2 });

        SqlDataAdapter da = new SqlDataAdapter(command);
        DataSet ds = new DataSet();
        da.Fill(ds);
        int num_filas = ds.Tables[0].Rows.Count;

        if (num_filas > 0)
        {
            int ino = 0;
            foreach (DataRow dRow in ds.Tables[0].Rows)
            {
                resultado.Add(dRow[0].ToString());
            }
        }
        else
        {
            resultado.Add("sinexistencia");
        }
    }
    return resultado;
}
```

1. **Conexión:** instancia `new Connection()` y usa `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)* **Sí usa `using`** sobre el `SqlConnection` (línea 1005) — de los pocos métodos del proyecto que lo hacen correctamente.

2. **Construcción del *table-valued parameter*** (líneas 1008–1021). Se arma un `DataTable` en memoria llamado `"PedidoMagento"` con dos columnas:

   | Columna | Tipo | Origen del valor |
   |---|---|---|
   | `sku` | `string` | cada elemento de `storeStock.products` |
   | `qty` | `int` | **constante `1`, siempre** |

   > **`qty` es un campo fantasma.** `StoreStockRequest` no tiene ningún campo de cantidad, así que el código escribe `1` en todas las filas (línea 1018). El SP recibe una columna que **jamás transporta información del request**. O el SP la ignora, o la consulta de disponibilidad se está haciendo contra una cantidad ficticia de 1 unidad por SKU. **No es posible determinar cuál sin el fuente del SP** (Regla #5). Es la primera pregunta a resolver.

   El `DataTable` se envía como tipo de tabla definido por el usuario `VTASPedidoMagento` (`P0.TypeName`, línea 1031). **Ese UDT es una dependencia de esquema adicional al SP**, y también falta su fuente.

3. **Invocación del Stored Procedure `SpVTASEcommerceStoreStock`** (línea 1025). Nótese la forma:
   ```csharp
   new SqlCommand(@"SpVTASEcommerceStoreStock @P0, @P1 ,@P2", conexion);
   ```
   - Es un `SqlCommand` con `CommandType.Text` (el valor por defecto) — **no** `CommandType.StoredProcedure`. Funciona solo porque T-SQL permite invocar un procedimiento sin `EXECUTE` **cuando es la primera sentencia del lote**. Es frágil y semánticamente incorrecto (ver obs. 3).
   - Los parámetros son **posicionales y anónimos** (`@P0`, `@P1`, `@P2`): el código **no documenta qué significa cada uno**. La correspondencia se deduce únicamente de las asignaciones de las líneas 1030–1034.

4. **`CommandTimeout = 10000`** (línea 1036) → **2 horas 46 minutos**. Sin timeout efectivo (ver obs. 6).

5. **Ejecución y lectura:** `SqlDataAdapter.Fill(ds)` vuelca **todos** los result sets del SP en un `DataSet` (línea 1042), pero solo se consume `ds.Tables[0]`. Si el SP devuelve más de un result set, el resto se descarta silenciosamente.

6. **Proyección del resultado** (líneas 1046–1063):
   - Si hay filas: por cada una se agrega **`dRow[0].ToString()`** a `resultado`. **Acceso por índice, no por nombre de columna.** Solo se lee la **primera columna**; el nombre y el tipo de esa columna son desconocidos sin el fuente del SP (presumiblemente el SKU o el artículo disponible).
   - Si **no** hay filas: se agrega el literal **`"sinexistencia"`** como único elemento de la lista (línea 1061). Ver obs. 5.

7. **Código muerto:** `int ino = 0;` (línea 1048) se declara y nunca se usa. También queda comentada la línea `//List<string> fila = new List<string>(num_columnas);` (línea 1052), residuo de una versión anterior que leía todas las columnas.

8. **Sin `try/catch`, sin `Logger`, sin `finally`.** Toda excepción sube al controller LAN, que tampoco la captura ([[02_LAN_Controller]] obs. 1) → HTTP 500.

**No hay servicios externos, ni Magento, ni SQLite, ni escrituras** en este flujo: es una única invocación de SP de lectura.

---

## Lógica del Stored Procedure `SpVTASEcommerceStoreStock`

> ⛔ **EL CUERPO DEL SP NO FUE ANALIZADO POR FALTA DEL FUENTE.**
> No existe `SpVTASEcommerceStoreStock.sql` en `lan-sap-migration/SPsOrden/` (directorio verificado: 36 archivos, ninguno corresponde). Conforme a la **Regla #5 (prohibido alucinar la lógica)**, **no se describe ni se infiere** qué tablas consulta, cómo calcula la disponibilidad ni qué reglas de negocio aplica.
>
> Detalle de lo que sí es verificable desde C# → ver [[_SPS_FALTANTES.txt]].

**Correcciones respecto al brief de asignación:** se sospechaba que este flujo invocara `SpVTASEcommerceExistencia`, `SpVTASEcommercePrecio`, `SpVTASECommerceDisponibilidadArt` o `SpINVRepServ`. **Ninguno de los cuatro aparece en este método** (verificado por búsqueda directa en `ProductMethods.cs`). El único SP invocado es `SpVTASEcommerceStoreStock`, que **no figuraba en la lista de faltantes conocidos del proyecto** — es un faltante **nuevo**, más el tipo de tabla `VTASPedidoMagento`.

Igualmente se verificó que **ni `spQuitaPreposicionesArticulos` ni `spVerCosto`** (ambos sí disponibles en `SPsOrden/`) son invocados desde este flujo ni desde ninguna otra parte de `Metodos/` — búsqueda sin coincidencias. No se diseccionan aquí porque no forman parte de la cadena.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | Objeto | Tipo | Acción | Notas |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `SpVTASEcommerceStoreStock` | Stored Procedure | Select (presunta) | **Fuente no disponible.** Tablas subyacentes desconocidas. |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `VTASPedidoMagento` | User-Defined Table Type | Entrada (TVP) | Columnas `sku` (string), `qty` (int, siempre `1`) |

Una sola conexión y una sola ejecución por request. **Cero escrituras verificables desde C#** (pero no puede descartarse que el SP escriba, precisamente porque falta el fuente).

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** (algunos SKUs con existencia en la tienda) — **HTTP 200**:
```json
["1030025", "1045912", "2200481"]
```
Array plano de cadenas: el contenido de la **primera columna** de cada fila devuelta por el SP.

**Caso sin existencia** (el SP no devuelve filas) — **HTTP 200**:
```json
["sinexistencia"]
```
El literal viaja **en el mismo canal** que los SKUs reales (ver obs. 5).

**Caso de error** (BD caída, `store_id` no numérico, `products` nulo, timeout) — **HTTP 500**:
```
Excepción no manejada — sube desde ProductMethods.getStockStore()
sin try/catch en negocio ni en el controller LAN.
```
No hay log, no hay mensaje controlado, y según `customErrors` puede exponerse el stack trace con el nombre del SP y del servidor.

> **Dos de los tres desenlaces devuelven 200; el tercero es un 500 crudo. Ninguno es un 4xx/204 semánticamente correcto.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **Cero manejo de excepciones en toda la cadena — el hallazgo más grave.** Ni el método de negocio (`ProductMethods.cs:1000–1070`), ni el controller LAN (`ProductsController.cs:192–200`), ni la DMZ (que es un stub) capturan nada. Cualquier fallo se convierte en **HTTP 500 con detalle de excepción**. Es la contracara del problema del resto del proyecto: aquí no se traga el error, se **grita** con demasiado detalle.

2. **`SpVTASEcommerceStoreStock` no existe en `SPsOrden/` — bloqueante para la migración.** Sin su cuerpo no se puede saber qué tablas de existencias toca, si aplica reservas, si contempla almacenes/sucursales, ni qué significan `state` y `qty`. Se documenta en [[_SPS_FALTANTES.txt]]. **Añadir a la ronda 2 junto con el UDT `VTASPedidoMagento`.**

3. **SP invocado como texto libre, no como `CommandType.StoredProcedure`.** `new SqlCommand("SpVTASEcommerceStoreStock @P0, @P1 ,@P2", ...)` depende de que la invocación sea la primera sentencia del lote. Además impide que ADO.NET descubra la firma y valida nada. Al migrar debe usarse `CommandType.StoredProcedure` con parámetros nombrados semánticamente (`@Productos`, `@Tienda`, `@Estado`), no `@P0/@P1/@P2`.

4. **Desajuste de tipo en `store_id`: `string` en C#, `SqlDbType.Int` en el parámetro.** `StoreStockRequest.store_id` es `string` (`Models/Product.cs:247`) pero `P1` se declara `SqlDbType.Int` (`ProductMethods.cs:1027`). ADO.NET intenta la conversión en `Fill()`: si el consumidor manda `"MTY-01"` o `""` en lugar de `"12"`, **revienta con excepción de conversión → HTTP 500**, no con un 400. El contrato es ambiguo: no se sabe si `store_id` es realmente numérico. **Definir el tipo en el contrato nuevo.**

5. **`"sinexistencia"` como valor en banda — anti-patrón de contrato.** El "sin resultados" se señaliza metiendo un string mágico **dentro del mismo array** que transporta los SKUs (`ProductMethods.cs:1061`). Consecuencias:
   - El consumidor debe hacer *string matching* contra un literal en español, sin acento y sin espacios, para saber si hubo resultados.
   - Un artículo cuyo identificador fuera literalmente `sinexistencia` sería indistinguible.
   - La respuesta correcta sería **HTTP 204** o un array vacío `[]`. **Debe eliminarse en la migración** — pero rompe a cualquier consumidor actual que dependa del literal, y el consumidor **es desconocido** (ver obs. 10).

6. **`CommandTimeout = 10000` (2 h 46 min).** Efectivamente ilimitado: una consulta de existencias bloqueada retiene el hilo de IIS casi tres horas. Debe fijarse un timeout razonable (10–30 s) — es una consulta de disponibilidad, debe ser rápida por definición.

7. **Payload de entrada sin cota.** `storeStock.products` se materializa entero en un `DataTable` en memoria y viaja como TVP. Sin límite de elementos ni validación de formato de SKU. Debe imponerse un máximo explícito (p. ej. 100 SKUs por llamada) en el contrato nuevo.

8. **Lectura por índice (`dRow[0]`) y descarte del resto.** Se ignora el nombre de la columna y todas las demás columnas que el SP pueda devolver, así como cualquier result set adicional. Frágil ante cambios del SP: si alguien reordena el `SELECT` final, el endpoint devuelve otra cosa **sin fallar**. Debe leerse por nombre de columna.

9. **Código muerto:** `int ino = 0;` (línea 1048) declarado y nunca usado; línea 1052 comentada (`num_columnas`). Limpiar (Regla #12).

10. **Sin trazabilidad (Regla #8) y sin consumidor identificado.** No hay `Logger` de ningún tipo. Búsqueda case-insensitive de `getStockByStore` / `getstockbystore` sobre todo `MAGENTO_WEB_ADOBE/`: **cero coincidencias**. El master lo admite explícitamente (`MIGRATION_STATUS_MASTER_v3.csv:130`) y `_ANALISIS_PREVIO/APIMagento-conteo-rutas.md:83` lo etiqueta como *Cron*. **Antes de tocarlo hay que instrumentarlo con log de INFO para descubrir quién lo llama.**

11. **`qty` hardcodeado a `1`.** Ver paso 2 del flujo. O es código muerto en el TVP, o la disponibilidad se está evaluando contra una cantidad ficticia. No resoluble sin el SP.

12. **Método síncrono:** migrar a `async/await` (`FillAsync` no existe en `SqlDataAdapter`; corresponde reescribir con `SqlDataReader` + `ExecuteReaderAsync`). Regla #12.

13. **`SqlDataAdapter`/`DataSet` para leer una sola columna.** Sobrecarga innecesaria de memoria: se materializa el result set completo para proyectar una columna. Al migrar, `ExecuteReaderAsync` + `yield` o un DTO tipado.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

**Regla #10 (Cero Suposiciones): no se asigna ningún servicio OData ni tabla SAP en este documento.**

Las fuentes maestras se contradicen entre sí **y consigo mismas**, porque el nombre de ruta existe duplicado en LAN y DMZ y cada fuente documentó una capa distinta:

| Fuente | Fila / línea | Capa que describe | Clasificación asignada | Data Origin |
|---|---|---|---|---|
| `MIGRATION_STATUS_MASTER_v3.csv` | línea **101** | DMZ (`ProductsController.cs:62`) | `Planed Dev 1` | `MAGENTO` |
| `MIGRATION_STATUS_MASTER_v3.csv` | línea **130** | LAN (`ProductsController.cs:193`) | **`Out of scope`** | `INTELISIS` |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` | línea **82** | DMZ | `Planed Dev 1`, `EsNuestro = Si` | MAGENTO→MAGENTO |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` | línea **106** | LAN | **`Out of scope`**, `EsNuestro = No` | INTELISIS→INTELISIS |
| `_EXCLUIDOS_Intelisis.md` | línea **145** | LAN (`ProductMethods.cs:1005`) | 🔒 **FUERA DE ALCANCE** | IntelisisTmp |
| `_INVENTARIO_NoIntelisis.csv` | línea **81** | LAN (`ProductMethods.cs:1005`) | `EnAlcance = No` — *"100% Intelisis (sCadenaConexion)"* | IntelisisTmp |
| `MIGRATION_STATUS_MASTER.csv` (versión previa, raíz de `e-commerce/`) | línea **130** | LAN | **`In Progress`** — nota: *"Per-store stock query. **SAP DIM11 equivalent exists.** ⚠️ Name collision"* | INTELISIS |
| `_ANALISIS_PREVIO/sin-intelisis.csv` | línea **196** | DMZ | *"Retorna literal stores - sin destino"* — **Stub** | Ninguno |

**Se declara conflicto documental abierto en tres frentes:**

1. **DMZ vs. LAN tratados como si fueran el mismo endpoint.** No lo son (ver [[01_DMZ_Controller]]): comparten nombre de ruta y modelo, pero no hay puente entre ellos. **Toda fila del master que mezcle ambos es inválida.**
2. **`Out of scope` (v3, `_EXCLUIDOS`, `_INVENTARIO`) vs. `In Progress` + *"SAP DIM11 equivalent exists"* (master previo).** La versión anterior del master afirmaba que existe equivalente SAP; la vigente lo saca de alcance. **Nadie documentó por qué cambió.**
3. **La nota del master sobre la DMZ es factualmente falsa** (*"Handled by `new Magento()` in the DMZ; calls the Magento REST API directly"*) — el código es `return Ok("stores")`. Ver [[01_DMZ_Controller]] obs. 2.

**Nueva URL propuesta en las fuentes:** `MIGRATION_STATUS_MASTER_v3.csv:130` registra `product/stock/filter/{filter}` **GET** como destino. Se reporta como dato de la fuente maestra; **no se valida, no se diseña, y no se propone ningún servicio OData** — el análisis de la spec de existencias quedó explícitamente **fuera del alcance de esta ronda** por decisión del usuario.

**Bloqueante previo a cualquier discusión SAP:** sin el fuente de `SpVTASEcommerceStoreStock` **no se puede evaluar equivalencia con nada**. No se sabe qué tablas de existencias consulta, si considera reservas/apartados, si opera a nivel almacén o sucursal, ni qué representa `state`.

### Puntos a cerrar con el Líder Técnico

1. **Separar formalmente las dos filas del master.** `product/getStockByStore` (DMZ) y `product/getStockByStore` (LAN) deben quedar como endpoints distintos con estatus independiente, y corregirse la nota falsa de la línea 101 (*"calls the Magento REST API directly"*). Es un error de inventario que ya causó que este endpoint se catalogara como *LAN-only*.
2. **Decidir el destino del stub DMZ** (`ProductsController.cs:61–66`): ¿se elimina, se implementa como proxy a la LAN, o se documenta como *deprecated* con `501`? Hoy devuelve `"stores"` con HTTP 200 a cualquier consumidor externo.
3. **Exportar `SpVTASEcommerceStoreStock` y el UDT `VTASPedidoMagento` desde Intelisis** y guardarlos en `SPsOrden/`. Sin esto la migración de este endpoint está bloqueada. Ver [[_SPS_FALTANTES.txt]].
4. **Resolver el conflicto de alcance:** ¿`Out of scope` (v3 / `_EXCLUIDOS` / `_INVENTARIO`) o `In Progress` con equivalente de existencias en SAP (master previo)? Es la decisión de la que dependen todas las demás.
5. **Instrumentar el endpoint con `Logger` antes de tocarlo**, para identificar al consumidor real (hoy desconocido; no está en `MAGENTO_WEB_ADOBE/`). Sin eso, ni apagarlo ni cambiar su contrato son operaciones seguras.
6. **Definir el contrato nuevo:** tipo real de `store_id` (obs. 4), semántica de `state`, si `qty` debe existir (obs. 11), límite de SKUs por llamada (obs. 7), y **eliminación del literal `"sinexistencia"`** a favor de `204`/`[]` (obs. 5) — con plan de compatibilidad para el consumidor desconocido.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el punto 3 (fuente del SP) y el punto 1 (corrección del inventario). Sin el SP no hay discusión técnica posible.

---

## Referencias cruzadas

- Capa DMZ (stub): [[01_DMZ_Controller]] · Capa LAN: [[02_LAN_Controller]]
- SP faltante y su ficha de exportación: [[_SPS_FALTANTES.txt]]
- Endpoint hermano del mismo controlador documentado en esta ronda: [[obtenerImagen]]
- Métodos hermanos de stock en el mismo archivo (no documentados en esta ronda): `ProductMethods.updateStockJson` (`ProductMethods.cs:929`), `ActualizacionStock.GetCambiosExistencias` (`ProductStock/ActualizacionStock.cs:45`)
- Modelo de entrada: `StoreStockRequest` (`Models/Product.cs:245–250`)
- Inventario y alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v3]]
- Patrón de contraste (endpoint con `try/catch` y `e.Message` como payload): [[obtenerVentanaConfirmacion]]

---

#migracion #SAP #analisis_bd #dotnet #ProductsController #getStockByStore #SpVTASEcommerceStoreStock #bloqueante
