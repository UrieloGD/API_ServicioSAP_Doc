# Mapeo del Método: `POST /product/getStockByStore` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/ProductsController.cs`
**Método:** `getStockStore(StoreStockRequest storeStock)` — Líneas **61–66**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** **Ninguno real. Es un stub.** No proxea, no consulta, no reenvía.
**Región:** sin `#region` (el controlador DMZ no está regionalizado)

---

> **Corrección de contexto documentada.** El inventario previo clasificó este endpoint como *LAN-only* (`_INVENTARIO_NoIntelisis.csv` línea 81, `MIGRATION_STATUS_MASTER_v3.csv` línea 130: *"No DMZ route - LAN-only endpoint"*). **Eso es incorrecto: la ruta SÍ existe en la DMZ**, en el mismo controlador y con el mismo nombre de ruta (`product/getStockByStore`). Lo que no existe es el **puente** entre ambas: la ruta DMZ no llama a la LAN.

---

## Flujo de Ejecución

1. Recibe `POST` con el body `StoreStockRequest`. El controlador está decorado con `[Authorize]` y `[RoutePrefix("product")]` (líneas 19–21).
2. **No hace absolutamente nada con el body.** El código completo del método es:
   ```csharp
   [HttpPost]
   [Route("getStockByStore")]
   public IHttpActionResult getStockStore(StoreStockRequest storeStock)
   {
       return Ok("stores");
   }
   ```
3. Devuelve **HTTP 200** con el literal `"stores"` (una cadena JSON de 8 caracteres), siempre, para cualquier entrada.

**No hay `Curl`, no hay `curl.Post("product/getStockByStore", ...)`, no hay `Magento mage = new Magento()`.** El parámetro `storeStock` se deserializa y se descarta.

## Interacciones con Base de Datos

**Ninguna.**

## Colisión de rutas LAN ↔ DMZ

Es el punto estructural más importante de este endpoint. **La misma ruta existe en las dos capas con semánticas distintas y sin conexión entre ellas:**

| Capa | Archivo:línea | Modelo de entrada | Comportamiento | Salida |
|---|---|---|---|---|
| DMZ | `APIMagentoDMZ/.../ProductsController.cs:61–66` | `StoreStockRequest` (`Models/Product.cs:65–70`) | Stub — ignora el body | `"stores"` (literal) |
| LAN | `APIMagento/.../ProductsController.cs:192–200` | `StoreStockRequest` (`Models/Product.cs:245–250`) | Ejecuta SP contra IntelisisTmp | `List<string>` de SKUs |

Los **dos modelos `StoreStockRequest` son idénticos** campo por campo (`store_id`, `state`, `products`), lo que confirma que en algún momento se planeó el puente DMZ→LAN y **quedó sin implementar** (o se implementó y se revirtió). Ver [[02_LAN_Controller]].

## Observaciones técnicas detectadas

1. **El endpoint DMZ es código muerto que responde 200.** Un consumidor externo que llame a `product/getStockByStore` en la DMZ recibe `"stores"` y **cree que la petición fue exitosa**. No hay `501 Not Implemented`, ni `404`, ni log. Es un falso positivo permanente. **Debe eliminarse o implementarse; dejarlo como está es la peor de las tres opciones.**

2. **Contradice lo que dice la fuente maestra.** `MIGRATION_STATUS_MASTER_v3.csv` línea 101 afirma: *"Handled by `new Magento()` in the DMZ; calls the Magento REST API directly. Never reaches Intelisis."* **Eso no es cierto según el código:** no existe ninguna instancia de `Magento` en este método. La única fuente que lo describe correctamente es `_ANALISIS_PREVIO/sin-intelisis.csv` línea 196 (*"Retorna literal stores - sin destino ... Stub"*). Hay que corregir el master.

3. **Sin guarda de `null`.** A diferencia de [[obtenerVentanaConfirmacion]] (que sí lanza `HttpResponseException(BadRequest)`), aquí no hay validación — aunque es irrelevante porque el body nunca se toca. Si algún día se implementa el proxy, la guarda debe añadirse.

4. **Sin `Logger`.** No se registra ni la petición ni el hecho de que se está sirviendo una respuesta falsa (Regla #8).

5. **Método síncrono:** debe migrar a `async/await` (Regla #12) — si sobrevive.

6. **Puente a SAP (Regla #16):** si el Líder Técnico decide **implementar** el proxy, la llamada nueva debe ser `curl.PostSAP("product/getStockByStore", json)` (`Helper/Curl.cs:115`, que resuelve `ConfigurationManager.AppSettings["URL_SAP"]` en `Curl.cs:23`) y el destino en ServicioSAP declararse `[HttpPost]`. El endpoint ya es `POST`, así que la conversión sería directa. **Pero antes hay que decidir si el endpoint debe existir del lado externo** — hoy la lógica real (LAN) es 100% Intelisis y está marcada *Fuera de alcance*.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #ProductsController #getStockByStore
