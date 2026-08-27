# Mapeo del Método: `POST /product/getStockByStore` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/ProductsController.cs`
**Método:** `getStockStore(StoreStockRequest storeStock)` — Líneas **192–200**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher puro. **Sin trazabilidad, sin validación y sin `try/catch`.**
**Región:** sin `#region` (el controlador LAN no está regionalizado; el método de negocio sí vive en `#region Stock Store`)

---

## Flujo de Ejecución

1. Recibe `POST` con el body `StoreStockRequest`. Controlador decorado con `[Authorize]` y `[RoutePrefix("product")]` (líneas 13–15).
2. Instancia `ProductMethods pm = new ProductMethods();` y despacha:
   ```csharp
   [HttpPost]
   [Route("getStockByStore")]
   public IHttpActionResult getStockStore(StoreStockRequest storeStock)
   {
       ProductMethods pm = new ProductMethods();

       List<string> stores = pm.getStockStore(storeStock);
       return Ok(stores);
   }
   ```
3. Retorna `Ok(stores)` — una `List<string>` que Web API serializa como array JSON.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]] (SP `SpVTASEcommerceStoreStock` contra `IntelisisTmp`).

## Observaciones técnicas detectadas

1. **Sin `try/catch` — hallazgo principal de esta capa.** El método de negocio **tampoco tiene `try/catch`** (ver [[03_BusinessMethod]] obs. 1). Es una diferencia importante contra el patrón dominante del proyecto: aquí la `SqlException` **no se traga ni se convierte en texto**, sino que **sube sin filtro** hasta el pipeline de Web API → **HTTP 500 con detalle de excepción** (stack trace y, según la configuración de `customErrors`, nombre de servidor/base/SP). Es el único endpoint de este par que puede filtrar infraestructura al consumidor en un error.

2. **Retorno tipado — la única cosa bien hecha del par.** A diferencia de casi todo el resto del proyecto, este controller **no** hace el round-trip `string → DeserializeObject → re-serializar`. Devuelve directamente `List<string>`. **Conservar este patrón en la migración.**

3. **Sin validación de entrada.** No hay guarda de `null` en ninguna de las dos capas ([[01_DMZ_Controller]] es un stub que ni siquiera lee el body). Un `POST` con body vacío llega a `ProductMethods.getStockStore` y revienta en `foreach (string sku in storeStock.products)` (`ProductMethods.cs:1013`) con `NullReferenceException` → **HTTP 500**. Lo mismo si `products` viene ausente pero `store_id` presente.

4. **Sin límite de tamaño del payload.** `storeStock.products` es una `List<string>` sin cota; se vuelca íntegra en un *table-valued parameter* hacia SQL Server. Un array de 100 000 SKUs se acepta sin resistencia. Debe fijarse un máximo en el contrato nuevo.

5. **Sin `Logger.ProductImport(...)` ni equivalente.** No se registra qué tienda, qué estado ni qué SKUs se consultaron (Regla #8). No hay forma de auditar quién usa este endpoint — lo cual es especialmente grave porque **el consumidor real es desconocido** (ver punto 7).

6. **Método síncrono:** migrar a `async/await` (Regla #12). Prohibido `.Result` / `.Wait()`.

7. **Consumidor no identificado.** No hay ninguna referencia a `getStockByStore` en el frontend `MAGENTO_WEB_ADOBE/` (búsqueda case-insensitive sobre todo el repositorio: **cero coincidencias**). El propio master lo reconoce: *"no lo consulta magento pero lo puede consultar otra aplicación, se desconoce"* (`MIGRATION_STATUS_MASTER_v3.csv:130`). `_ANALISIS_PREVIO/APIMagento-conteo-rutas.md:83` lo clasifica como **Cron**. **Es un endpoint activo, sin log y sin consumidor conocido: apagarlo a ciegas es riesgoso, y mantenerlo sin trazabilidad también.**

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #ProductsController #getStockByStore
