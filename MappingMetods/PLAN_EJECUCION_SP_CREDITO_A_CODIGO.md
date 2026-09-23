---
tags: [migracion, sap, credito, sp, serviciosap, implementacion, runbook]
fecha: 2026-09-18
estado: PLAN LISTO — ejecucion detenida por el usuario antes de escribir codigo; repo limpio
requiere: FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md (diseno y decisiones D1-D10)
---

# Plan de ejecucion — `SP_CREDITO_WEB_DATOS` a codigo en `ServicioSAP`

> [!abstract] Que es esto
> El runbook para implementar la migracion. Se detuvo **antes de escribir una linea** en el repo: `ServicioSAP` esta limpio en la rama `SpExportaEcommerce` (commit `b3a2965`). Todo lo de aqui esta verificado contra codigo; lo que no, dice **PENDIENTE**.
>
> Orden: §1 preparacion → §2 contrato entre archivos → §3 las 7 unidades → §4 lo que hace el orquestador despues → §5 compilar → §6 dudas para el usuario.

---

## 0. Estado exacto al detener

| Cosa | Estado |
|---|---|
| Repo `ServicioSAP` | limpio, rama `SpExportaEcommerce`, `b3a2965`, remoto TFS `mavivstf01:8080/.../ServicioSAP` |
| Archivos escritos | **ninguno** |
| `SKILL.md` | editado en esta sesion: punto 1 de *How to use it* y Paso 1 del flujo (lectura evaluada de archivos `master`, ya no obligatoria). Sin commit |
| Extraccion verbatim del codigo real | copiada a `MappingMetods/_IMPLEMENTACION_SP_CREDITO/prep/` (arquitectura, reuso, grafo, contrato). **Leer antes de escribir.** |
| Compilacion | no ejecutada. Toolchain verificada (§5) |

---

## 1. Preparacion que ya esta hecha (no repetir)

- **Arquitectura real extraida** (`prep/arquitectura.md`): namespaces por carpeta, forma de las clases `Methods` (`public class XMethods` con `public static async Task<T> ...Async`), patron de SQL directo a Android, OData GET/POST/PATCH, canal AWS, controller completo, modelos, csproj, Web.config, reglas del skill aplicables.
- **Reutilizables con firma y visibilidad** (`prep/reuso.md`). Todo lo necesario es **publico** salvo: `ObtenerNumeroTablaSmsAsync` (privado en sus 2 copias), `WalletMethods.GetCatalogoConfiguracionAsync` (privado), `FormatDateSapOData` (privado). Sustitutos publicos: **`ProductMethods.GetConfiguracionCatalogoAsync`** (`:708-735`, canal 4, la antigua `TablaStD`); para el telefono del SMS se porta **la consulta del SP** (`SP:205-208`), que no coincide con ninguna copia privada.
- **Grafo actual** (`prep/grafo.md`): `OrderMethods.CrearSolicitudCreditoAsync` (`:862-932`, **instancia, `private`**, 38 `Parameters.Add`), unico invocador `:714` desde `ProcessCreditPaymentAsync`; consumidor vivo del id: `InsertCreditArticlesAsync` (`:954-955`). Contrato posicional `data[]` de LAN y rutas del DMZ.
- **Contrato del SP** (`prep/contrato.md`): 66 parametros, 59 columnas, prologo, Update, referencias y las 11 operaciones de la pre-solicitud, verbatim.
- **`fnSplit` NO EXISTE** en toda la compartida (ni en `.agents.zip`). Se porta con `string.Split` y se documenta como SIN EVIDENCIA el comportamiento con tokens vacios/NULL.

---

## 2. Contrato entre archivos (nombres fijos, usar tal cual)

**Modelos** — `namespace ServicioSap.Models.SAP.Credit`, carpeta `Models/SAP/Credit/`

| Archivo | Clases |
|---|---|
| `SolicitudCreditoWebModels.cs` | `SolicitudCreditoWebRequest` (66 props, una por parametro del SP, PascalCase sin `@`: `@apellido_p`→`ApellidoP`, `@nombre_2`→`Nombre2`, `@years_old`→`YearsOld`, `@ext_archivo_1`→`ExtArchivo1`; tipos nullable: VARCHAR→`string`, INT→`int?`, MONEY→`decimal?`, DATE→`DateTime?`, BIT→`bool?`; defaults del SP: todo `null` salvo `Estatus = 0`, `SucursalDestino = 0`) · `SolicitudCreditoWebRecord` (59 props = columnas del INSERT, PascalCase; `Fecha` DateTime, `Confirmado` int) · `SolicitudCreditoWebUpdateRequest` (`Id` + 9) · `ContextoValidacionTelefono { OrigenAutorizado, TelefonoValidado, TelefonoAValidar, EsProspecto }` |
| `ReferenciaSolicitudCreditoModels.cs` | `ReferenciaSolicitudCreditoRecord` (17: IdSolicitud, Parentesco, Nombre, ApellidoP, ApellidoM, TipoTel, LadaTel, NumeroTel, Direccion, EntreCalles, NumInt, NumExt, CodigoPostal, Municipio, Poblacion, Estado, Colonia) · `CampoMultiplexado { Campo, TipoDato, Valor }` |
| `PreSolicitudCreditoModels.cs` | `PreSolicitudCreditoRequest` (17 params) · `PreSolicitudCreditoRecord` · `ReferenciaPreSolicitudRecord` (7) · `HistoricoNipRecord` |
| `LineaArticuloCreditoModels.cs` | `LineaArticuloCreditoRequest` (7 params de `SpVTASInsertArtSolCreditoLinea:28-34`) · `LineaArticuloCreditoRecord` (7 cols de `VTASdArtCreditoWeb`) |
| `DatosSolicitudCreditoArtModels.cs` | `DatosSolicitudCreditoArtRequest` + DTOs de resultado por operacion |
| `CreditoWebRequests.cs` | Los request de las rutas, **con los mismos nombres de campo del DMZ/LAN** para compatibilidad de wire con Magento: `CreditoWebSaveDataRequest { string op; string[] data; }` · `DataArticulos { string op; string[] data; string[] articulos; string prospecto; }` · `SaveFirstData { string op; string[] data; }` |

**Metodos** — `namespace ServicioSap.Methods.Credit`, `public static`

| Archivo | API publica |
|---|---|
| `ValidacionTelefonoMethods.cs` | `Task<ContextoValidacionTelefono> ObtenerContextoAsync(string cliente)` · `int Resolver(ContextoValidacionTelefono ctx)` (SP:210-221 tal cual; decision A) |
| `SolicitudCreditoWebMethods.cs` | `SolicitudCreditoWebRequest ConstruirDesdeData(string op, string[] data)` (mapeo posicional de LAN) · `Task<int> EjecutarAsync(req)` (3 IF independientes por `Op`; desconocido → 0, decision C) · `Task<int> InsertAsync(req)` · `Task<int> UpdateAsync(SolicitudCreditoWebUpdateRequest)` · `ConstruirDesdeParametrosActuales(...)` con los 38 valores de hoy, para la delegacion de §4.3 |
| `ReferenciaSolicitudCreditoMethods.cs` | `Task<int> InsertReferenciaAsync(req)` · `bool EsCadenaMultiplexada(string)` · `List<CampoMultiplexado> ParsearCadenaMultiplexada(string)` · `ReferenciaSolicitudCreditoRecord MapearCampos(req, campos)` |
| `PreSolicitudCreditoMethods.cs` | `PreSolicitudCreditoRequest ConstruirDesdeData(op, data)` · `Task<int> EjecutarAsync(req)` (11 operaciones, un privado por operacion) |
| `LineaArticuloCreditoMethods.cs` | `Task<int> InsertarLineaAsync(LineaArticuloCreditoRequest)` |
| `DatosSolicitudCreditoArtMethods.cs` | `Task<object> EjecutarAsync(DatosSolicitudCreditoArtRequest)` (7 operaciones) |
| **`CreditoWebMethods.cs`** (7ª unidad, §3.7) | `Task<string> CreditoWeb_SaveData_ArticulosAsync(string op, string[] data, string[] articulos, string prospecto)` · `Task<string> CreditoWeb_SaveDataAsync(string op, string[] data)` · `Task<int> CreditoWeb_SaveFirstDataAsync(string op, string[] data)` — nombres = rutas del DMZ (regla 28) |

**Reglas para quien escriba** (las mismas que se dieron a los agentes):
1. No inventar: cada identificador/literal/default rastreable a SP:linea, archivo:linea existente, o decision D1-D10.
2. Fidelidad observable, defectos incluidos, cada uno con `// FIDELIDAD SP:<linea> — <que> — decision <letra> pendiente`.
3. SQL a Android: `var conexionHelper = new conexionSQL(); using (var sqlConnection = await conexionHelper.obtenerConexionAndroidAsync().ConfigureAwait(false))`, **siempre parametrizado** con `SqlDbType` y tamano del tipo del SP. Nunca `string.Format` con datos del usuario.
4. Fuente sin equivalente → metodo privado con encabezado `// PENDIENTE DE FUENTE — SP <archivo>:<lineas> — <objeto> — sin equivalente identificado`; si el SP tiene ELSE natural (artRegion = Articulo; sin descuento = precio integro) se usa ese camino con `Logger.SAP` de advertencia; si no (DIMAS MX; saldo CXC) → `NotSupportedException`.
5. Sin transacciones (el SP no abre ninguna). C# 7.3 maximo. `ConfigureAwait(false)`. Errores a `ServicioSap.Helpers.Logger.SAP("[TAG] ", ex.Message)`.
6. No tocar archivos existentes; los toca el orquestador en §4.

---

## 3. Las 7 unidades

Las specs 3.1–3.6 estan integras en el script del workflow que se detuvo:
`C:\Users\claude\.claude\projects\C--x\9cb68c68-f398-4c18-9207-2b1e25fd674d\workflows\scripts\sp-credito-implementacion-wf_eec0e691-3e6.js` (secciones `BASE`, `CONTRATO_API`, `UNIDADES`). Resumen:

| # | Unidad | Fuente | Puntos criticos |
|---|---|---|---|
| 3.1 | `ValidacionTelefonoMethods` | SP:160-221 | Reusar `CreditMethods.IsValidatedAsync` (`:230-260`; hoy `FirstOrDefault` sin `OrderBy`, el SP ordena por `Fecha DESC` en `:202` — documentar). Catalogo `ORIGEN VALIDACION NUMERO CTE` via `ProductMethods.GetConfiguracionCatalogoAsync`. `Resolver`: replicar que en SQL `NULL != x` es UNKNOWN y cae al ELSE (en C# es `true`) |
| 3.2 | `SolicitudCreditoWebMethods` | SP:172-368 | DIMAS MX → `NotSupportedException` (F). Contexto → `ValidacionTelefono` pisa el recibido. 59 columnas exactas (`Fecha = DateTime.Now`, `Confirmado = 1`, `RedimirMonedero ?? 0.00m`). `PersistirSolicitudAsync` unico (B). Update: 9 SET incondicionales, devuelve `Id` sin mirar filas (D). `ROWLOCK` no se replica |
| 3.3 | `ReferenciaSolicitudCreditoMethods` | SP:370-603 | 17 columnas, misma tabla (D6). Discriminador `Split('~').Length == 1`. Lista plana acumulada que **nunca se vacia**; indices `(i*3)-2/-1/0` base 1 → base 0. Centinela `'{0}'`. 5 defectos replicados y marcados (E): `int.Parse` del CP, truncados 50/7, aritmetica de indices, `TipoDato` sin uso, `ApellidoM` conserva la cadena completa si no viene el segmento. Id de entrada ≠ identity de salida |
| 3.4 | `PreSolicitudCreditoMethods` | `SpCREDISolicitudWebPrimerGuardado.sql:48-482` | 3 tablas locales, SQL directo. Precio PRODUCTOS MX via `FinalListProperMethods.GetFinalListProperBySkuAsync` + crosswalk PENDIENTE; tabla `art` PENDIENTE. NIP `FLOOR(RAND()*(999999-100000)+100000)`. INSERT a `TcAAEA00030_EnvioMensajes` con **las columnas del SP** (`IdMensaje=14`, `Cliente='CW00001'`, `Clave`), una sola vez. Defectos: `:52` NULL cae al ELSE; `:205` NULL se salta todo; `FechaValidacion` contradictoria; `SaveCelNip` asimetrico |
| 3.5 | `LineaArticuloCreditoMethods` | `SpVTASInsertArtSolCreditoLinea.sql` | Familia via lo que ya usa `ServicioSAP`; region PENDIENTE (×2) con ELSE natural `artRegion = Articulo`; existencia via DIM11 (`ProductMethods.GetStockAsync`/`GetFilterProductsStockAsync`; el `COALESCE` de 2 fuentes queda por confirmar); `SEGU00001`: `Abono = 12`, precio = `SeguCost`, siempre inserta; general: PropreList + crosswalk PENDIENTE + `DescuentoCategoria` PENDIENTE (ELSE = precio integro), `Math.Ceiling`; INSERT 7 columnas; fallas silenciosas con `Logger.SAP` (G) |
| 3.6 | `DatosSolicitudCreditoArtMethods` | `SpCREDIDatosSolicitudCreditoArt.sql` | `CheckCliente`/`GetInfo` via `GetClientAsync`/`GetClientMaAsync`; `GetSaldo`: limite = `Zcrmcantidad`, saldo CXC PENDIENTE (lanza); `GetCuenta`: `ZAPI_SD52_PARTNER_SRV` (`BusinessPartnerMethods.cs:386`) + `LinkMagentoAccountAsync`; `UpdateInfo`: PATCH por clave (`:840-858`), lada/historico/CteTel PENDIENTE, `UPDATE ValidacionTel=0` masivo como decision; `getClienteMagento` PENDIENTE; `GetInfoCredito` literales `'1'..'7'` |

### 3.7 · `CreditoWebMethods` — la orquestacion que hoy vive en LAN (NO estaba asignada)

Verificado en LAN esta sesion. Es la pieza que une las anteriores y la que el DMZ llama.

**`CreditoWeb_SaveData_ArticulosAsync(op, data, articulos, prospecto)`** — port de `LAN/Metodos/CreditMethods.cs:466-504` + `LAN/Metodos/Credit/Methods.cs:12-256` + `:922-965`:
1. `data[33] = ""` (`:470`, *"para diferenciarla de credilanas"*).
2. Cliente: `if (prospecto.Length == 0) cliente = cte_prospecto(); else cliente = prospecto;` (`Methods.cs:35-38`). **`cte_prospecto()` ejecuta `EXEC SP_GeneraConsecutivoCteMavi 'MAVI'` contra Intelisis** (`Methods.cs:258-287`, `CredyPrestamoMethods.cs:212-227`). ⚠️ Esto **contradice** el Anexo del documento de diseno, que lo daba por huerfano: esta **vivo en LAN**. Equivalente en `ServicioSAP`: **PENDIENTE** — el alta de prospecto en SAP hoy la hace `ProcessCreditPaymentAsync` via BP; hay que decidir si `cliente` prospecto = numero de BP o se conserva el consecutivo `'P...'` (afecta `SP:216`, que decide prospecto por el prefijo `'P'`).
3. `SolicitudCreditoWebMethods.EjecutarAsync(ConstruirDesdeData(op, data))` → `IdSolicitud`. `ConstruirDesdeData` con el mapeo de `Methods.cs:69-147` (variante A: `data[0..69]`, `@Agente`, `@Curp`, `@OrigenIdMagento/@LadaValidar/@TelefonoValidar` segun esa lista).
4. Referencias, **hasta 3**, solo si el flag es `1`: `data[40]==1 → data[41..47]`, `data[48]==1 → data[49..55]`, `data[56]==1 → data[57..63]` (`Methods.cs:171-247`), cada una un `InsertReferenciaAsync` con `Id = IdSolicitud` y los `*_ref` de ese bloque. Detalles observables de LAN: `RemoveTildes` sobre Nombre/ApellidoP/ApellidoM (`CredyPrestamoMethods.RemoveTildes`, `:18`); `LadaTel` `int.Parse` con `0` si vacio; `NumeroTel` `long.Parse` (BigInt en LAN, `VARCHAR(10)` en el SP — anotar); `TipoTel` `long.Parse` con `0`. **Bug de LAN a decidir:** `:241` valida `data[61]` pero parsea `data[62]` para `LadaTel` de la 3ª referencia.
5. Si `op == "Insert" || "Insert_2"` y resultado `!= "0"`: lineas de articulo — por cada `articulos[i] = "cantidad,articulo"` (`:944-960`): `IdCredito = idSolicitud.Split('/')[0]`; si `articulo == "SEGU00001"` → `SeguCost = float(cantidad)`, `cantidad = 1`; si no → `SeguCost = 0`, `cantidad = int(cantidad)`; `Condicion = data[35]`, `Orden` incremental desde 1, `Cp = data[14].Trim()` → `LineaArticuloCreditoMethods.InsertarLineaAsync`.
6. Cupon: `if (data.Length > 72 && data[72] != "")` → LAN `CodigoPromocion(data[72], "Elimina", data[66])` (`:480-483`). Equivalente en `ServicioSAP`: `OrderMethods.HandlePromoCodeAsync(codigo, idMagento, "Elimina")` (`:1112`, instancia, publico) — **verificar semantica identica antes de usar** (LAN consulta `VentasCupones` en Intelisis; el C# en `SigMavi`).
7. `Insert_2`: LAN devuelve `res + "/" + cliente` (`Methods.cs:251-253`). Op que el SP no conoce: LAN la manda al SP tal cual y el SP **no escribe** (cae fuera de los 3 IF) — verificar contra `Methods.cs:69-147` que op realmente llega al `@Op`.
8. Retorno: `resultado` o `"0"`.

**`CreditoWeb_SaveDataAsync(op, data)`** — port de `CredyPrestamoMethods.cs:29-130` (variante Credilana): `cliente = cte_prospecto()` siempre; EXEC posicional con `data[0..71]`; diferencias vs variante A: `@SucursalDestino = 0` fijo (`:103`), `@Agente = data[70]`, `@Curp = data[71]`, `@estatus = data[67] o "0"`, `@CodigoRecomendador = data[69]` (**D8: se retira**); **no inserta referencias**; DIMAS MX email comentado.

**`CreditoWeb_SaveFirstDataAsync(op, data)`** — `LAN/Metodos/CreditMethods.cs:506-526`: EXEC `SpCREDISolicitudWebPrimerGuardado` con 16 valores posicionales (`@op, @idSolicitud, @nombre, @nombre_2, @apellido_p, @apellido_m, @telefono_celular, @uen, @nip, @validacion, @origen, @IdWEB_DATOS_TEMP, @Articulo, @Importe, @Correo, @Telefono`) — el SP tiene 17: falta `@ClaveMensaje`; verificar cual queda en default → `PreSolicitudCreditoMethods.EjecutarAsync(ConstruirDesdeData(op, data))`.

**Comportamiento del controller de LAN a replicar** (`CreditController.cs:207-234`, `:403-421`): si `op == "Update"`, responde `""` **de inmediato** y ejecuta en `Task.Run` con `Task.Delay(10000)`. El proyecto ya conserva ese patron en `SaveImagesProductosMx` con comentario; replicar igual y marcar FIDELIDAD.

---

## 4. Lo que hace el orquestador despues de las 7 unidades

### 4.1 Revision adversarial por archivo (antes de conectar nada)
Tres lentes por archivo, como estaba en el workflow: **paridad con el SP** linea por linea (conteo de columnas, NULLs, retornos), **compila/arquitectura** (cada firma externa existe con esa visibilidad; C# 7.3; SQL parametrizado), **no inventa** (rastro de cada identificador). Luego un corrector aplica solo lo confirmado.

### 4.2 Controller — `Controllers/CreditController.cs` (archivo existente; edicion minima)
Tres acciones nuevas, mismo patron del archivo (`[HttpPost]`, `[Route]`, `if (request == null) return BadRequest("Datos incompletos.")`, `try/catch` → `Logger.SAP` + `InternalServerError`):
- `[Route("CreditoWeb_SaveData")]` `(CreditoWebSaveDataRequest req)` → `CreditoWebMethods.CreditoWeb_SaveDataAsync(req.op, req.data)`
- `[Route("CreditoWeb_SaveData_Articulos")]` `(DataArticulos da)` → `CreditoWebMethods.CreditoWeb_SaveData_ArticulosAsync(da.op, da.data, da.articulos, da.prospecto)`
- `[Route("CreditoWeb_SaveFirstData")]` `(SaveFirstData sf)` → `CreditoWebMethods.CreditoWeb_SaveFirstDataAsync(sf.op, sf.data)`

No se agregan `CreditoWeb_FormDatos`, `_Solicitud`, `_SolicitudPrimerGuardado`, `_Informacion` (no tocan estos SPs) ni `_Seguro` (fuera de alcance, GUIA §1.6b).

### 4.3 Delegacion en `OrderMethods.CrearSolicitudCreditoAsync` (`:862-932`)
Conservar la firma `private async Task<int> CrearSolicitudCreditoAsync(OrderRequest order, string[] datosArray, string ladaValidar, string telefonoValidar)` y su unico invocador (`:714`). Sustituir el cuerpo: construir el request con `SolicitudCreditoWebMethods.ConstruirDesdeParametrosActuales(...)` pasando **los mismos 38 valores** de `:873-910` (tabla en `prep/grafo.md`), y `return await SolicitudCreditoWebMethods.InsertAsync(req)`. Conservar el `catch` → `return 0` (`:926-931`) para no cambiar el contrato del llamador. **Antes de esto, resolver §6-1** (`@fecha_nacimiento DATE ← VarChar ""`).

### 4.4 Registro en `ServicioSap.csproj` (regla 19; sin esto no compila y no avisa)
Unico `<ItemGroup>` de `Compile` (lineas 212-442), 4 espacios, backslash:
- Despues de `:258` (`Methods\Credit\LiberadorCreditoMethods.cs`): las 7 de `Methods\Credit\*.cs`.
- Despues de `:372` (`Models\SAP\Credit\SendSmsNewNumberRequest.cs`): las 6 de `Models\SAP\Credit\*.cs`.

### 4.5 Documento de diseno — correcciones pendientes de aplicar
- **Anexo:** *"`SP_GeneraConsecutivoCteMavi` esta huerfano"* es **falso**: LAN lo ejecuta desde `cte_prospecto()` en dos sitios (`Credit/Methods.cs:258-287`, `CredyPrestamoMethods.cs:212-227`). Lo que si es cierto es que el SP `SP_CREDITO_WEB_DATOS` ya no lo llama (`SP:16`).
- §4.3: la orquestacion de referencias en LAN (hasta 3, flags `data[40/48/56]`, `RemoveTildes`, tipos) y el bug de `:241`.
- Nueva op `Insert_2` (retorna `id/cliente`).

---

## 5. Compilar (criterio de cierre del skill, GUIA §9b) — sin tocar `bin/` ni `obj/` de la compartida

Toolchain verificada: **`C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe`** (18.10.1) — **no** el de `Framework64\v4.0.30319`, que no resuelve `ToolsVersion=15.0`. `Microsoft.WebApplication.targets` existe en `...\v18.0\WebApplications\`. Roslyn `csc.exe` en `packages\Microsoft.CodeDom.Providers.DotNetCompilerPlatform.2.0.1\tools\RoslynLatest\`. 48 paquetes restaurados.

```bash
"C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/MSBuild.exe" "//CATECINF214034/Compartida/Migracion SAP/ServicioSAP/ServicioSap/ServicioSap/ServicioSap.csproj" /t:Build /p:Configuration=Debug /p:VisualStudioVersion=18.0 "/p:OutDir=C:/temp/serviciosap-build/bin/" "/p:BaseIntermediateOutputPath=C:/temp/serviciosap-build/obj/" /v:m
```

Si `OutDir`/`BaseIntermediateOutputPath` no se respetan por el import de `Microsoft.Common.props` (linea 4 del csproj), copiar el proyecto a local para compilar; **nunca** compilar sobre la copia de la compartida sin redirigir.

---

## 6. Dudas para el usuario (no se resuelven leyendo codigo)

1. **Verificacion bloqueante** (FLUJO §6): `@fecha_nacimiento DATE` recibe `SqlDbType.VarChar` con `""` (`OrderMethods.cs:878`). Si truena, hoy no hay linea base. Resolver con `Logs/sap.log` + `git log` antes de §4.3.
2. **Prospecto** (§3.7 paso 2): `cte_prospecto()` / `SP_GeneraConsecutivoCteMavi` → ¿numero de BP o consecutivo `'P...'`? Afecta `SP:216`.
3. **Semantica de `ValidacionTelefono`** (A): *requiere validacion* vs *esta validado*. Mientras, se replica el observable.
4. **Bug de LAN `Methods.cs:241`** (3ª referencia: valida `data[61]`, parsea `data[62]`): ¿se replica o se corrige?
5. **`Update` fire-and-forget** de 10 s: ¿se conserva?
6. **`HandlePromoCodeAsync`** como equivalente de `CodigoPromocion(..., "Elimina", ...)`: confirmar semantica (LAN va a Intelisis, C# a SigMavi).
7. **Insert_2**: confirmar que llega al `@Op` tal cual y que el SP no escribe (LAN devuelve `id/cliente`).
8. **DIM11 y el `COALESCE`** de dos fuentes de existencia (FLUJO §4.8).
9. Los `PENDIENTE DE FUENTE`: `VTASCRegionSku`, `VTASCCodigoPostalRegionCelular`, `VTASCCondicionesCredVtaLinea`, `spVerCosto`, `DescuentoCategoria`, `CREDICCondicionArt`, saldo CXC, tabla `art`, `TcEACD00001_Lada`, `MAVIDM0138HistInsertCorreo` — si alguno se convirtio en `CatalogoConfiguracion` (canal 4), indicar el `NOMBRECATALOGO` como se hizo con `TablaStD`.
10. Las 3 columnas sin equivalente en SAP: `tarjetaDigitos`, `creditoHipoteca`, `creditoAutomotriz` (no bloquean: se escriben en la tabla de Android).
