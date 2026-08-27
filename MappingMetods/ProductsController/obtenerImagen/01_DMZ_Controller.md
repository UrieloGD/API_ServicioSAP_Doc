# Mapeo del Método: `POST /product/obtenerImagen` — Capa DMZ

## ⛔ NO EXISTE CAPA DMZ

**No hay par de este endpoint en ningún controlador de la DMZ.**

---

## Búsqueda realizada (evidencia)

Se buscó en **todos** los controladores de `APIMagentoDMZ/WebApiMagento/Controllers/` (15 archivos):
`CreditController.cs`, `CustomerServiceController.cs`, `CustomersController.cs`, `LoginController.cs`, `MagentoController.cs`, `MercanciaController.cs`, `OrdersController.cs`, `ProductsController.cs`, `ProspectoController.cs`, `RecommenderController.cs`, `StatusController.cs`, `TokenGenerator.cs`, `TokenValidationHandler.cs`, `WalletCustomerController.cs`, `WholesaleCustomerController.cs`.

| Patrón buscado (case-insensitive, todo `APIMagentoDMZ/`) | Coincidencias |
|---|---|
| `obtenerImagen` | **0** |
| `getImages` | **0** |
| `ImageProduct` | **0** |

Se verificó explícitamente el escenario del que advierte la especificación (§2): *"a veces el par está en otro controlador"* — como ocurre con `getOrderId`, que vive en `MagentoController.cs`. **No es el caso aquí:** el término no aparece en ningún archivo del proyecto DMZ, ni siquiera en `Models/`.

Las 8 rutas que sí expone el `ProductsController` de la DMZ son: `updateProduct/{store}` (26), `updateConfigurableProduct/{store}` (35), `updateConfigurableProductLink/{sku}` (44), `updateStock` (53), `getStockByStore` (62), `updatePrice` (69), `uploadImage` (78), `uploadImagesToMagento` (101). **Ninguna corresponde a `obtenerImagen`.**

---

## ¿Es intencional (uso interno LAN) o un gap de exposición?

**Veredicto: es intencional — y debe seguir siéndolo. La ausencia de ruta DMZ es lo único que hoy contiene un riesgo de seguridad grave.**

### Por qué es intencional

1. **La dirección del flujo es la opuesta.** El `obtenerImagen` de la LAN **no devuelve una imagen**: dispara una **copia de archivo servidor-a-servidor**, desde el recurso compartido SMB `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\` hacia el disco local `C:\inetpub\wwwroot\api\images\` del servidor LAN (`ProductImage/Methods.cs:395–398`). Ver [[03_BusinessMethod]]. El endpoint que **sí** está en la DMZ y sí recibe imágenes es `uploadImage` (`ProductsController.cs:78–98`), y la LAN lo invoca vía `curl.PostFile("product/uploadImage", ...)`. **El sentido del tráfico es LAN → DMZ, no DMZ → LAN.**

2. **`getImages` es un método interno de la cadena de importación**, no un servicio de consulta. Se invoca desde otros dos métodos del mismo archivo, no desde el exterior:
   - `Methods.uploadImagesToMagento()` → `ProductImage/Methods.cs:105`
   - `Methods.uploadNewImagesToMagento()` → `ProductImage/Methods.cs:148`

   El endpoint HTTP (`ProductsController.cs:214–220`) es un **atajo manual/cron** para invocar una pieza interna del proceso de importación, no una API de negocio.

3. **Depende de recursos que no existen en la DMZ:** impersonación con una cuenta de dominio `GRUPOMAVI` (`Conn/Connection.cs:33–35`) y acceso SMB a `172.16.202.4`. Un servidor en DMZ no tiene —ni debe tener— ninguna de las dos cosas.

4. **Las fuentes maestras lo confirman de forma consistente** (es de los pocos endpoints sin conflicto documental sobre este punto):
   - `MIGRATION_STATUS_MASTER_v3.csv:132` → *"No DMZ route - LAN-only endpoint"*
   - `_ANALISIS_PREVIO/LISTA-18-endpoints.md:16` → `Interno`
   - `_ANALISIS_PREVIO/MAPEO-endpoints-flujo-y-responses.md:484` → *"(interno — no pasa por la DMZ)"*
   - `_ANALISIS_PREVIO/Plan-migracion-18-rutas-a-ServicioSAP.md:236` → lo agrupa con las rutas que *"No pasan por la DMZ: hay que cambiar el cron o la tarea programada que las invoca."*

### Por qué NO debe convertirse en un gap de exposición

**Exponer este endpoint en la DMZ sería una vulnerabilidad crítica, no una mejora de cobertura.** El método de negocio concatena **sin sanitizar** dos cadenas controladas por el cliente (`magentoName`, `originalName`) dentro de rutas de archivo, y ejecuta `File.Copy` entre ellas bajo una cuenta de dominio privilegiada. Ver [[03_BusinessMethod]] obs. 1 y 2: hay **path traversal de lectura sobre el recurso SMB y path traversal de escritura sobre `C:\inetpub\wwwroot\`**.

Hoy el único control compensatorio efectivo es que **la ruta solo es alcanzable desde dentro de la LAN**. `[Authorize]` no basta: no hay validación de rol, y cualquier token válido del ecosistema sirve.

> **Recomendación explícita: no crear ruta DMZ para este endpoint. Si el proceso de importación requiere disparo remoto, debe hacerse por un canal interno autenticado y con los nombres de archivo saneados y validados contra un catálogo, nunca por concatenación libre.**

---

## Interacciones con Base de Datos

**Ninguna** (no hay capa DMZ). El método de negocio tampoco toca base de datos — ver [[03_BusinessMethod]].

## Puente DMZ (Regla #16)

**No aplica.** No existe `curl.Post(...)` que convertir a `curl.PostSAP(...)` porque no hay proxy. La Regla #16 quedará sin efecto para este endpoint **salvo que el Líder Técnico decida exponerlo**, decisión que este documento recomienda no tomar.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #ProductsController #obtenerImagen #bloqueante
