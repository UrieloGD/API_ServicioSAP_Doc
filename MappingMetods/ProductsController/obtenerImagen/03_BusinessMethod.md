# Mapeo del Método: `ProductImage.Methods.getImages()` — Lógica de Negocio

**Endpoint:** `POST /product/obtenerImagen`
**Archivo:** `APIMagento/WebApiMagento/Metodos/ProductImage/Methods.cs`
**Método:** `public string getImages(string magento, string original)` — Líneas **388–407**
**Capa:** LAN (Nexo) — **sin capa DMZ**
**Rol en el flujo:** Copiar un archivo de imagen desde el recurso compartido SMB de imágenes optimizadas hacia el directorio local del servidor web, **suplantando una cuenta de dominio** para obtener permisos sobre el recurso.
**Clase auxiliar:** `Impersonation : IDisposable` — mismo archivo, líneas **410–446**

> Cadena de flujo completa: [[01_DMZ_Controller]] *(NO EXISTE)* → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `ImageProduct` — `APIMagento/WebApiMagento/Models/Product.cs` líneas **281–285**:

| Campo | Tipo | Uso dentro del método | Destino real |
|---|---|---|---|
| `magentoName` | string | Parámetro `magento` | **Nombre del archivo DESTINO** en `C:\inetpub\wwwroot\api\images\` |
| `originalName` | string | Parámetro `original` | **Nombre del archivo ORIGEN** en `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\` |

**Sin modelo espejo en DMZ** (`ImageProduct` no existe en `APIMagentoDMZ/`) — ver [[01_DMZ_Controller]].
**Sin validación de ningún tipo:** ni `null`, ni cadena vacía, ni extensión, ni caracteres de traversal, ni longitud, ni catálogo.

---

## Flujo de Ejecución Detallado

```csharp
public string getImages(string magento, string original)
{
    con = new Connection();
    try
    {
        using (var imp = new Impersonation(con.userImages, con.domainImages, con.passImages))
        {
            if (File.Exists(@"\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\" + original))
            {
                File.Copy(@"\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\" + original,
                          @"C:\inetpub\wwwroot\api\images\" + magento);
            }
        }
        return "Ok";
    }
    catch (Exception e)
    {
        Logger.ProductImages("ERROR ", e.Message);
        return e.Message;
    }
}
```

1. **Instancia `new Connection()`** (línea 390) — **pero no abre ninguna conexión a base de datos.** La clase `Connection` se usa aquí exclusivamente como **contenedor de credenciales de dominio**: `userImages`, `domainImages`, `passImages` (`Conn/Connection.cs` líneas 33–35). El resto de sus cadenas de conexión (`sCadenaConexion`, `sCadenaConexionAdminDoc`, etc.) se construyen igualmente en el constructor y quedan sin usar. *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` líneas 33–35.)*

   > **Respuesta explícita a la pregunta de origen de las imágenes:** no es `AdminDoc`, no es un BLOB en base de datos, no es un servicio externo. **Es una ruta UNC / recurso compartido SMB.** `sCadenaConexionAdminDoc` **no participa en este flujo** (verificado: no aparece en `ProductImage/Methods.cs`).

2. **Impersonación de Windows** (línea 393). Se abre un `using` sobre `Impersonation`, que en su constructor (líneas 421–435):
   - Llama a la API nativa `LogonUser` (P/Invoke a `advapi32.dll`, línea 413) con `dwLogonType = 2` (**`LOGON32_LOGON_INTERACTIVE`**) y `dwLogonProvider = 0`.
   - Si falla, lanza `UnauthorizedAccessException` con el código de error Win32.
   - Construye un `WindowsIdentity` desde el token y llama a `identity.Impersonate()`.
   - Cierra el handle del token con `CloseHandle(userToken)`.
   - `Dispose()` (líneas 437–445) hace `Undo()` + `Dispose()` del contexto.

   El orden de argumentos de la llamada (`userImages, domainImages, passImages`) coincide con la firma `(userName, domainName, password)` — **verificado, no hay bug de orden**. El `WindowsIdentity` sí queda sin disponer (fuga menor de handle).

3. **Verificación de existencia del origen** (línea 395):
   ```csharp
   File.Exists(@"\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\" + original)
   ```
   - Ruta **hardcodeada por IP**, no por nombre de host (Regla #7). Nótese el typo del directorio en el servidor: **`Desarollo`** (una sola "r") — está así en el recurso real, no es error de transcripción.
   - Es un recurso **distinto** al que usan otros métodos del mismo archivo: `GetImages()` (línea 36) y `imagenesmagentoconf()` (línea 374) apuntan a `\\MAVIWEB01\ImagenesWEBMagento\`. **Hay dos repositorios de imágenes conviviendo en el mismo archivo**, sin ninguna configuración que los relacione.

4. **Copia** (línea 397): `File.Copy(origen, destino)` — **sin el tercer parámetro `overwrite`**, por lo que si el destino ya existe lanza `IOException` (ver obs. 4).
   - Destino: `C:\inetpub\wwwroot\api\images\` + `magento`. Es el mismo directorio que luego lee `uploadImagesToMagento` (`ProductImage/Methods.cs:116–117`) para subir a Magento vía `curl.PostFile("product/uploadImage", ...)`, y el mismo que la DMZ declara en `ProductsController.cs:23`.

5. **Si el archivo origen NO existe: no pasa nada.** El `if` no tiene `else`. El método **devuelve `"Ok"` igualmente** (línea 400). Ver obs. 3.

6. **Retorno del camino feliz:** el literal `"Ok"` (string). **No devuelve la imagen** ni bytes ni base64 ni URL. Ver obs. 6.

7. **Manejo de error:** el `catch` (líneas 402–406) registra `Logger.ProductImages("ERROR ", e.Message)` — archivo `C:\inetpub\wwwroot\log\productImages.log` (`Helper/Logger.cs:69–77`) — y **devuelve `e.Message` como payload**, con **HTTP 200**. Nótese el `"ERROR "` con espacio final, la misma inconsistencia detectada en [[obtenerVentanaConfirmacion]].

**No hay Stored Procedures, no hay SQL, no hay servicios externos (SOAP/REST/OpenPay), no hay SQLite.** El único efecto del método es una operación de sistema de archivos.

### Otros invocadores de `getImages` (contexto de uso interno)

| Invocador | Archivo:línea | Origen de los nombres de archivo |
|---|---|---|
| `Methods.uploadImagesToMagento()` | `ProductImage/Methods.cs:105` | `GetImagesBySku()` → tabla SQLite `product_images` |
| `Methods.uploadNewImagesToMagento()` | `ProductImage/Methods.cs:148` | `GetImagesBySku()` → SQLite, alimentado desde `ecommerceactualizarimagenes` (IntelisisTmp) |

> **Este es el punto clave para entender el riesgo:** cuando `getImages` se llama *internamente*, los nombres provienen de la base de datos (confiables). Cuando se llama por HTTP vía `obtenerImagen`, **provienen del cliente** y nadie los valida. **El método fue escrito asumiendo entrada confiable y luego se expuso como endpoint.**

---

## Interacciones con Base de Datos

Ver CSV: [[03_BusinessMethod_DB.csv]]

**NINGUNA.** Este flujo no ejecuta una sola sentencia SQL. Se instancia `Connection` (línea 390) únicamente para leer tres credenciales de dominio en memoria; **no se abre ningún `SqlConnection`**.

| Recurso | Tipo | Acción | Detalle |
|---|---|---|---|
| `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\` | Recurso compartido SMB | **Read** | `File.Exists` + `File.Copy` (origen). Ruta hardcodeada por IP. |
| `C:\inetpub\wwwroot\api\images\` | Filesystem local del servidor LAN | **Write** | `File.Copy` (destino). Bajo la raíz web de IIS. |
| Cuenta de dominio `GRUPOMAVI\...` | Credencial (P/Invoke `LogonUser`) | Impersonación | `Conn/Connection.cs:33–35`, hardcodeada en el fuente |

Clasificación coincidente en las fuentes maestras: `_EXCLUIDOS_Intelisis.md:139` → `✅ NO-INTELISIS`, destino *"Filesystem / SMB (172.16.202.4)"*.

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** (el archivo origen existe y se copió) — **HTTP 200**:
```json
"Ok"
```

**Caso "sin datos"** (el archivo origen **NO** existe en el recurso SMB) — **HTTP 200**:
```json
"Ok"
```
> **Indistinguible del caso exitoso.** El `if (File.Exists(...))` sin `else` hace que la ausencia del archivo sea silenciosa: no se copia nada, no se loguea nada, y se responde exactamente lo mismo. Ya estaba señalado en `_ANALISIS_PREVIO/MAPEO-endpoints-flujo-y-responses.md:920` (*"Devuelve `Ok` aunque el archivo origen no exista"*), y aquí se confirma en el código.

**Caso de error** (impersonación fallida, SMB inalcanzable, destino ya existente, permisos) — **HTTP 200** con el mensaje crudo de la excepción:
```json
"The file 'C:\\inetpub\\wwwroot\\api\\images\\1030025_x1.JPG' already exists."
```
o
```json
"LogonUser failed with error code: 1326"
```
> **Fuga de información en el payload:** se exponen rutas absolutas del servidor, nombres de recursos compartidos y códigos de error de autenticación de Windows (`1326` = credenciales incorrectas). Todo con HTTP 200.

**Caso body nulo/malformado** — **HTTP 500** (`NullReferenceException` en el controller, antes del `try`). Ver [[02_LAN_Controller]] obs. 1.

> **Cuatro desenlaces. Tres devuelven 200. Dos de ellos son literalmente idénticos.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **🚨 PATH TRAVERSAL DE ESCRITURA — vulnerabilidad crítica, hallazgo más grave del par.**
   `magentoName` llega del body HTTP y se concatena directamente al destino del `File.Copy`:
   ```csharp
   @"C:\inetpub\wwwroot\api\images\" + magento
   ```
   No hay `Path.GetFileName`, ni validación de `..`, ni comprobación de que la ruta resultante quede dentro del directorio permitido, ni whitelist de extensión. Un `magentoName` como `..\..\shell.aspx` escribe **fuera** de `api\images\`, **dentro de la raíz web de IIS**, y bajo la identidad impersonada `GRUPOMAVI\...`. Combinado con el control sobre el *contenido* (el atacante elige qué archivo del recurso SMB copiar), esto es **escritura arbitraria de archivos en el servidor web de la LAN** → potencial ejecución remota de código, o sobreescritura de `web.config`. `File.Copy` sin `overwrite` limita el sobreescribir archivos existentes, pero **no impide crear archivos nuevos en cualquier ruta**.

2. **🚨 PATH TRAVERSAL DE LECTURA sobre el recurso SMB.**
   Simétricamente, `originalName` se concatena al origen:
   ```csharp
   @"\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\" + original
   ```
   Un `originalName` con `..\..\` permite **leer cualquier archivo del share `ecom`** al que tenga acceso la cuenta impersonada, y depositarlo en `C:\inetpub\wwwroot\api\images\` — es decir, **en una ruta servida por HTTP**. Exfiltración de documentos internos con una sola petición.

   > **Mitigación única existente hoy: el endpoint no está expuesto en la DMZ** ([[01_DMZ_Controller]]). `[Authorize]` no valida rol. **Cualquier decisión de exponerlo debe bloquearse hasta que se saneen ambos parámetros.**

3. **Falso positivo estructural: `"Ok"` cuando el archivo no existe.** El `if (File.Exists(...))` sin `else` (líneas 395–398) convierte "el archivo no está" en un éxito silencioso. Nada se copia, nada se loguea, el consumidor cree que funcionó. **Es el motivo de que los procesos de importación reporten éxito con imágenes faltantes.** Debe devolver `404`/`false` explícito.

4. **`File.Copy` sin `overwrite` → error en la reejecución.** La segunda ejecución con el mismo `magentoName` lanza `IOException` ("already exists"), que se captura y se devuelve como texto con HTTP 200. **El endpoint no es idempotente.** Contrasta con `imagenesmagentoconf()` (línea 374), que en el mismo archivo **sí** pasa `true` como tercer parámetro. Inconsistencia dentro del propio archivo.

5. **Credenciales de dominio hardcodeadas en el código fuente.** `domainImages`, `userImages` y `passImages` están escritas como literales en `Conn/Connection.cs:33–35` y viajan al repositorio de código. Es una **cuenta de dominio real de `GRUPOMAVI`** usada para suplantación. Debe migrar a un almacén de secretos / cuenta de servicio gestionada (Regla #7 en espíritu, y requisito de seguridad duro).

6. **El endpoint NO devuelve una imagen — el nombre y el contrato mienten.**
   **Tipo de retorno real: `string`.** Valores posibles: `"Ok"` o `e.Message`. **No es `byte[]`, no es base64, no es URL.** Semánticamente es un **comando de copia servidor-a-servidor**, no una consulta. La respuesta a la pregunta del brief es inequívoca: *ruta de disco/UNC*, no `AdminDoc`, no servicio externo, no BLOB.

7. **`LOGON32_LOGON_INTERACTIVE` (`dwLogonType = 2`) para acceso a red.** El tipo de logon correcto para acceder a un recurso SMB remoto es `LOGON32_LOGON_NEW_CREDENTIALS` (9) con provider `WINNT50` (3), o `NETWORK` (3). Usar `INTERACTIVE` desde un proceso de servicio requiere el privilegio *"Permitir el inicio de sesión local"* para la cuenta y **carga el perfil completo del usuario**, lo cual es innecesariamente costoso y frágil. Es una fuente probable de los `LogonUser failed with error code` en `productImages.log`.

8. **`WindowsIdentity` no se libera.** En `Impersonation` (líneas 431–434) se crea `WindowsIdentity identity` y solo se hace `CloseHandle(userToken)`. El `identity` nunca se dispone. Fuga menor de handles bajo uso intensivo.

9. **Rutas y hosts hardcodeados (Regla #7).** `\\172.16.202.4\...` por **IP** (no por nombre), `C:\inetpub\wwwroot\api\images\`, y el typo `Desarollo`. Además, el archivo convive con un **segundo** repositorio de imágenes hardcodeado (`\\MAVIWEB01\ImagenesWEBMagento\`, líneas 36 y 374) sin relación documentada entre ambos. Todo debe ir a configuración.

10. **Sin trazabilidad del camino exitoso (Regla #8).** Solo se loguea el `catch`. La operación que **escribe en disco** no deja ninguna huella: no se sabe qué archivo se copió, cuándo, ni a petición de quién. Para un endpoint con capacidad de escritura arbitraria, esto es inaceptable. Además el `type` es `"ERROR "` con espacio final (inconsistente con el resto del proyecto).

11. **`e.Message` como payload con HTTP 200.** Mismo anti-patrón que [[obtenerVentanaConfirmacion]], pero **sin la falla en cascada**: como el controller LAN aquí **no** hace `JsonConvert.DeserializeObject` (devuelve el string directo), no se produce el `JsonReaderException`. El texto de error llega íntegro al consumidor con código de éxito. Peor semántica, menos ruido.

12. **`new Connection()` innecesario.** Se instancia la clase completa —que construye siete cadenas de conexión en su constructor (`Conn/Connection.cs:26–35`)— solo para leer tres strings de credenciales. Acoplamiento absurdo entre la capa de imágenes y la de conexiones de BD. Separar en la migración.

13. **I/O síncrono de red en el hilo de IIS.** `File.Exists` y `File.Copy` sobre SMB bloquean el hilo durante toda la operación, incluyendo timeouts de red si `172.16.202.4` no responde. Migrar a `async` (Regla #12). Prohibido `.Result`/`.Wait()`.

14. **`ProductImage.Methods` — nombre de clase genérico y colisionante.** Obliga al controller a calificar con el namespace completo (`ProductsController.cs:218`). Renombrar.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN

**Regla #10 (Cero Suposiciones): no se asigna ningún servicio OData ni tabla SAP en este documento.**

### Qué dicen las fuentes maestras

| Fuente | Línea | Clasificación | Observación registrada |
|---|---|---|---|
| `MIGRATION_STATUS_MASTER_v3.csv` | **132** | **`Out of scope`** — Data Origin `INTELISIS` | New URL propuesta: `ma/imagenes/optimizadas` (GET). Nota: *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."* |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` | **108** | **`Out of scope`** — `EsNuestro = No` | INTELISIS → INTELISIS |
| `_NUESTROS_ENDPOINTS/README.md` | **160**, **176** | `getStockByStore` y `obtenerImagen` **Out of scope** | línea 176: *"Filesystem/SMB, sin BD"* |
| `_EXCLUIDOS_Intelisis.md` | **139** | **✅ NO-INTELISIS** | Destino *"Filesystem / SMB (`172.16.202.4`)"*, evidencia `ProductImage/Methods.cs:395` |
| `_INVENTARIO_NoIntelisis.csv` | **83** | **`EnAlcance = Si`** ⚠️ | `Destinos = Filesystem/SMB`, `EsIntelisis = No`, `Motivo` **vacío**, `Mapeado = No` |
| `_ANALISIS_PREVIO/Plan-migracion-18-rutas-a-ServicioSAP.md` | **134** | En plan de migración | Destino propuesto: `Methods/ImagenManagement/ImagenMethods.cs` *(ya existe)* |
| `_ANALISIS_PREVIO/BRIEFING-migracion-18-endpoints.md` | **171** | Prioridad `H2` | Origen `SMB` |
| `_ANALISIS_PREVIO/sin-intelisis.csv` | **9** | `Activo` | *"Impersonacion Windows + copia SMB"* |

### Conflicto documental abierto

**Las fuentes se contradicen en dos ejes:**

1. **Alcance.** `MIGRATION_STATUS_MASTER_v3.csv:132` y `_ENDPOINTS_NoSAP.csv:108` lo declaran **`Out of scope`**; `_INVENTARIO_NoIntelisis.csv:83` lo declara **`EnAlcance = Si`** (y con el campo `Motivo` vacío, sin justificación). Además, `Plan-migracion-18-rutas-a-ServicioSAP.md:134` y `BRIEFING-migracion-18-endpoints.md:171` **ya le asignaron un destino y una prioridad (H2)**, lo cual es incompatible con "fuera de alcance".

2. **Clasificación del origen de datos.** `MIGRATION_STATUS_MASTER_v3.csv:132` marca `Data Origin = INTELISIS`. **Eso es factualmente incorrecto:** el método no ejecuta ni una sentencia SQL (ver *Interacciones con Base de Datos*). `_EXCLUIDOS_Intelisis.md:139` y `_INVENTARIO_NoIntelisis.csv:83` lo clasifican correctamente como **Filesystem/SMB, NO-INTELISIS**. `_NUESTROS_ENDPOINTS/README.md:160` incluso explica el porqué del error: *"Los de ProductsController (LAN-only) están marcados INTELISIS en el status master porque su tabla de paso se alimenta de ahí"* — razonamiento que **no aplica a este endpoint**, que no toca tabla de paso alguna.

### Por qué este endpoint probablemente no tiene destino SAP en absoluto

No es un servicio de negocio: es una utilidad de infraestructura (copia de archivos entre un share y el disco del servidor web) dentro del proceso de importación de catálogo a Magento. **SAP no gestiona el repositorio de imágenes optimizadas de e-commerce.** Conforme a la Regla #10 esto **no se afirma como conclusión**, pero es el punto de partida que debe validar el Líder Técnico: la pregunta correcta probablemente no es *"¿a qué servicio SAP migra?"* sino *"¿este endpoint debe seguir existiendo como endpoint?"*.

### Puntos a cerrar con el Líder Técnico

1. **Corregir el `Data Origin` en `MIGRATION_STATUS_MASTER_v3.csv:132`:** de `INTELISIS` a `Filesystem/SMB`. Está mal clasificado y arrastra la fila entera a conclusiones equivocadas. Alinearlo con `_EXCLUIDOS_Intelisis.md:139`.
2. **Resolver la contradicción de alcance:** `Out of scope` (master v3 + `_ENDPOINTS_NoSAP`) vs. `EnAlcance = Si` (`_INVENTARIO_NoIntelisis.csv:83`) vs. **destino ya asignado con prioridad H2** (`Plan-migracion-18-rutas...:134`, `BRIEFING...:171`). Tres estados incompatibles para el mismo endpoint.
3. **🚨 Decisión de seguridad, con prioridad sobre todo lo anterior:** el path traversal de escritura (obs. 1) y de lectura (obs. 2) es explotable **hoy** desde cualquier cliente autenticado dentro de la LAN. Definir si (a) se sanean los parámetros con `Path.GetFileName` + validación contra whitelist de extensión + verificación de que la ruta canónica quede dentro del directorio permitido, o (b) **se retira la superficie HTTP** y `getImages` queda como método interno del proceso de importación. **La opción (b) es la recomendada por este documento**, dado que el propio código muestra que los invocadores reales son internos (`Methods.cs:105` y `:148`).
4. **Sacar las credenciales de dominio del código fuente** (`Conn/Connection.cs:33–35`) y rotarlas: están versionadas.
5. **Identificar la tarea programada / cron que invoca este endpoint** antes de tocarlo. `Plan-migracion-18-rutas-a-ServicioSAP.md:236` advierte que hay que cambiarla, pero **no está identificada** ni en el código ni en la documentación. No aparece consumidor en `MAGENTO_WEB_ADOBE/` (*sin consumidor identificado en el frontend*).
6. **Definir la estrategia de imágenes de catálogo end-to-end:** hoy conviven **dos** repositorios hardcodeados (`\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\` y `\\MAVIWEB01\ImagenesWEBMagento\`) más el buffer local `C:\inetpub\wwwroot\api\images\` y el destino final en Magento. Esa cadena debe modelarse explícitamente antes de decidir qué migra y qué no. Nota operativa: el typo `Desarollo` está en el nombre real del directorio.
7. **Evaluar `Methods/ImagenManagement/ImagenMethods.cs`** (destino propuesto en `Plan-migracion-18-rutas-a-ServicioSAP.md:134`, marcado como *"ya existe"*): confirmar si esa implementación ya resuelve el saneamiento de rutas o si hereda el mismo defecto. **No fue analizada en esta ronda** (vive en `ServicioSAP\`, fuera del alcance definido).

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, **empezando por el punto 3**. Los puntos 1, 2 y 6 son de higiene documental; el 3 y el 4 son riesgos activos en producción.

---

## Referencias cruzadas

- Capa DMZ (**no existe**, con la evidencia de búsqueda): [[01_DMZ_Controller]] · Capa LAN: [[02_LAN_Controller]]
- Endpoint hermano del mismo controlador documentado en esta ronda: [[getStockByStore]]
- Invocadores internos de `getImages` (contexto de uso real): `Methods.uploadImagesToMagento` (`ProductImage/Methods.cs:79–126`), `Methods.uploadNewImagesToMagento` (`ProductImage/Methods.cs:128–175`)
- Contraparte que sí está en la DMZ y recibe los archivos: `product/uploadImage` (`APIMagentoDMZ/.../ProductsController.cs:78–98`) y `product/uploadImagesToMagento` (`:101–123`)
- Métodos hermanos que alimentan la tabla SQLite `product_images`: `Methods.imagenesmagento` (`ProductImage/Methods.cs:206–339`), `Methods.imagenesmagentoconf` (`:341–386`) — estos **sí** tocan IntelisisTmp (`ecommerceactualizarimagenes`, `SCM_Art_imagen`, `eComerceExportaArt`) y **construyen SQL por concatenación** sobre SQLite (`:335–336`, `:382–383`): candidatos a su propia ficha de análisis.
- Clase de impersonación: `Impersonation` (`ProductImage/Methods.cs:410–446`)
- Modelo de entrada: `ImageProduct` (`Models/Product.cs:281–285`)
- Inventario y alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v3]]

---

#migracion #SAP #dotnet #ProductsController #obtenerImagen #seguridad #bloqueante
