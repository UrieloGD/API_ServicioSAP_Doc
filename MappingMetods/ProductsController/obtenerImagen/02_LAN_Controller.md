# Mapeo del Método: `POST /product/obtenerImagen` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/ProductsController.cs`
**Método:** `obtenerImagen(ImageProduct images)` — Líneas **214–220**
**Capa:** LAN (Nexo) — **sin capa DMZ**, ver [[01_DMZ_Controller]]
**Rol en el flujo:** Dispatcher de una sola línea hacia `ProductImage.Methods.getImages`. **Sin validación, sin `try/catch`, sin log.**
**Región:** sin `#region` (el controlador LAN no está regionalizado)

---

## Flujo de Ejecución

1. Recibe `POST` con el body `ImageProduct`. Controlador decorado con `[Authorize]` y `[RoutePrefix("product")]` (líneas 13–15).
2. Instancia la clase de negocio con su **namespace completo** y despacha en la misma línea del `return`:
   ```csharp
   [HttpPost]
   [Route("obtenerImagen")]
   public IHttpActionResult obtenerImagen(ImageProduct images)
   {
       WebApiMagento.Metodos.ProductImage.Methods pim = new WebApiMagento.Metodos.ProductImage.Methods();
       return Ok(pim.getImages(images.magentoName, images.originalName));
   }
   ```
3. Retorna `Ok(string)` — el valor devuelto por `getImages`, que es **`"Ok"` en el camino feliz o el texto de `e.Message` si algo falló** (ver [[03_BusinessMethod]]). En ambos casos **HTTP 200**.

**Nota sobre el nombre de la clase:** `ProductImage.Methods` colisiona conceptualmente con `WebApiMagento.Metodos.ProductMethods`; por eso el controller la califica con el namespace completo. Es ruido que debe resolverse al migrar (renombrar a `ProductImageMethods` o similar).

## Interacciones con Base de Datos

**Ninguna, en ninguna capa.** Este endpoint **no toca SQL Server, ni SQLite, ni MySQL**. Su único destino es el **sistema de archivos vía SMB**. Confirmado por `_EXCLUIDOS_Intelisis.md:139` (`✅ NO-INTELISIS`, destino *"Filesystem / SMB (172.16.202.4)"*) y `_INVENTARIO_NoIntelisis.csv:83` (`Destinos = Filesystem/SMB`, `EsIntelisis = No`).

## Observaciones técnicas detectadas

1. **`images` sin guarda de `null` — 500 garantizado.** No hay DMZ que valide antes ([[01_DMZ_Controller]]) y aquí tampoco se valida. Un `POST` con body vacío o mal formado produce `NullReferenceException` en `images.magentoName` (línea 219) **dentro del `return`**, antes de entrar al `try/catch` del método de negocio → **HTTP 500 no manejado**. El `try/catch` de `getImages` (`ProductImage/Methods.cs:391`) no protege contra esto porque la excepción ocurre en el controller.

2. **Los dos parámetros viajan sin sanitizar hacia rutas de sistema de archivos.** `images.magentoName` y `images.originalName` se pasan tal cual a `getImages`, que los concatena en un path SMB y en un path local (`ProductImage/Methods.cs:395–397`). **Este controller es el último punto donde se podría validar, y no lo hace.** Es el vector de path traversal descrito en [[03_BusinessMethod]] obs. 1 y 2.

3. **Sin `try/catch`.** Consistente con [[getStockByStore|02_LAN_Controller de getStockByStore]]: el `ProductsController` de la LAN no envuelve ninguno de sus despachadores (la única excepción es `updateProducts`, líneas 21–115, que sí tiene `try/catch` + `Logger.intelisis`). Ese contraste dentro del mismo archivo muestra que la ausencia es descuido, no diseño.

4. **`[Authorize]` sin control de rol.** El atributo está a nivel de clase (línea 13) y solo exige un token válido. **Cualquier identidad autenticada del ecosistema puede disparar una copia de archivo arbitraria bajo la cuenta de dominio de impersonación.** Debe restringirse por rol/scope, o mejor, retirarse de la superficie HTTP.

5. **Sin `Logger` en la capa de controller.** No se registra qué archivo se solicitó ni por quién (Regla #8). El único log del flujo está en el `catch` del método de negocio (`Logger.ProductImages("ERROR ", ...)`, `ProductImage/Methods.cs:404`, con el mismo `"ERROR "` con espacio final que ya se detectó en `CustomerServiceMethods`). **El camino exitoso no deja rastro alguno** — precisamente el que ejecuta la escritura en disco.

6. **El nombre del endpoint miente sobre lo que hace.** `obtenerImagen` sugiere una lectura que devuelve una imagen. En realidad **ejecuta un efecto de escritura en el servidor** (copia un archivo) y devuelve una cadena de estado. Un `POST` que hace `File.Copy` y se llama "obtener" es un contrato engañoso; en la migración debe renombrarse a algo como `copiarImagenOptimizada` o integrarse como paso interno del proceso de importación, sin superficie HTTP.

7. **Método síncrono con I/O de red (SMB).** Un `File.Exists` + `File.Copy` contra `\\172.16.202.4` bloquea el hilo de IIS durante toda la operación, incluidos los timeouts de SMB si el host no responde. Migrar a `async/await` (Regla #12).

8. **Consumidor no identificado en el frontend.** Búsqueda case-insensitive de `obtenerImagen` sobre todo `MAGENTO_WEB_ADOBE/`: **cero coincidencias** — *sin consumidor identificado en el frontend*. `_ANALISIS_PREVIO/APIMagento-conteo-rutas.md:85` lo clasifica como **Cron**, y `Plan-migracion-18-rutas-a-ServicioSAP.md:236` advierte que *"hay que cambiar el cron o la tarea programada que las invoca"*. **La tarea programada concreta no está identificada en el código ni en la documentación.**

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #ProductsController #obtenerImagen #bloqueante
