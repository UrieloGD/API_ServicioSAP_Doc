---
tags: [migracion, sap, credito, sp, serviciosap, implementacion, runbook]
fecha: 2026-09-18
estado: IMPLEMENTADO — 2 archivos registrados en el .csproj; el SP ya no se llama; paridad de datos con LAN en §12
requiere: FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md (diseno y decisiones D1-D10)
---

# Plan de ejecucion — `SP_CREDITO_WEB_DATOS` a codigo en `ServicioSAP`

> [!abstract] Que es esto
> El runbook para implementar la migracion. Se detuvo **antes de escribir una linea** en el repo: `ServicioSAP` esta limpio en la rama `SpExportaEcommerce` (commit `b3a2965`). Todo lo de aqui esta verificado contra codigo; lo que no, dice **PENDIENTE**.
>
> Orden: §1 preparacion → §2 contrato entre archivos → §3 las 7 unidades → §4 lo que hace el orquestador despues → §5 compilar → §6 dudas para el usuario.
>
> 🔴 **Desactualizado a partir de la §3.** El plan vigente es la **§9** (el flujo sin SP) y el estado real de lo escrito, la **§10**.

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

> [!warning] 🔴 **SECCION SUSTITUIDA — no seguir.** Se escribio asumiendo que se seguiria llamando al SP. **El SP desaparece**: lo vigente es la **§9**. Esta seccion queda solo como historial.

Las specs 3.1–3.6 estan integras en el script del workflow que se detuvo:
`C:\Users\claude\.claude\projects\C--x\9cb68c68-f398-4c18-9207-2b1e25fd674d\workflows\scripts\sp-credito-implementacion-wf_eec0e691-3e6.js` (secciones `BASE`, `CONTRATO_API`, `UNIDADES`). Resumen:

| # | Unidad | Fuente | Puntos criticos |
|---|---|---|---|
| 3.1 | `ValidacionTelefonoMethods` | SP:160-221 | Reusar `CreditMethods.IsValidatedAsync` (`:230-260`). 🔴 **Corregido el 2026-09-21: el defecto `FirstOrDefault` sin `OrderBy` NO esta en ese metodo** — `FirstOrDefault` da **0 resultados** en `CreditMethods.cs`. El defecto real vive en `OrderMethods.cs:637`, dentro de un metodo **privado, de instancia y que devuelve `string`**, asi que no es reutilizable tal cual. El SP ordena por `Fecha DESC` en `:202` — documentar. Ojo tambien: `IsValidatedAsync` devuelve `bool`, asi que **no puede poblar `ContextoValidacionTelefono`** por si solo, y hay una **segunda definicion homonima** en `OrderMethods.cs:621` (`private async Task<string>`) con visibilidad y retorno distintos. Catalogo `ORIGEN VALIDACION NUMERO CTE` via `ProductMethods.GetConfiguracionCatalogoAsync`. `Resolver`: replicar que en SQL `NULL != x` es UNKNOWN y cae al ELSE (en C# es `true`) |
| 3.2 | `SolicitudCreditoWebMethods` | SP:172-368 | DIMAS MX → `NotSupportedException` (F). Contexto → `ValidacionTelefono` pisa el recibido. 59 columnas exactas (`Fecha = DateTime.Now`, `Confirmado = 1`, `RedimirMonedero ?? 0.00m`). `PersistirSolicitudAsync` unico (B). Update: 9 SET incondicionales, devuelve `Id` sin mirar filas (D). `ROWLOCK` no se replica |
| 3.3 | `ReferenciaSolicitudCreditoMethods` | SP:370-603 | 17 columnas, misma tabla (D6). Discriminador `Split('~').Length == 1`. Lista plana acumulada que **nunca se vacia**; indices `(i*3)-2/-1/0` base 1 → base 0. Centinela `'{0}'`. 5 defectos replicados y marcados (E): `int.Parse` del CP, truncados 50/7, aritmetica de indices, `TipoDato` sin uso, `ApellidoM` conserva la cadena completa si no viene el segmento. Id de entrada ≠ identity de salida |
| 3.4 | `PreSolicitudCreditoMethods` | `SpCREDISolicitudWebPrimerGuardado.sql:48-482` | 3 tablas locales, SQL directo. Precio PRODUCTOS MX via `FinalListProperMethods.GetFinalListProperBySkuAsync` + crosswalk PENDIENTE; tabla `art` PENDIENTE. NIP `FLOOR(RAND()*(999999-100000)+100000)`. INSERT a `TcAAEA00030_EnvioMensajes` con **las columnas del SP** (`IdMensaje=14`, `Cliente='CW00001'`, `Clave`), una sola vez. Defectos: `:52` NULL cae al ELSE; `:205` NULL se salta todo; `FechaValidacion` contradictoria; `SaveCelNip` asimetrico |
| 3.5 | `LineaArticuloCreditoMethods` | `SpVTASInsertArtSolCreditoLinea.sql` | Familia via lo que ya usa `ServicioSAP`; region PENDIENTE (×2) con ELSE natural `artRegion = Articulo`; existencia via DIM11 (`ProductMethods.GetStockAsync`/`GetFilterProductsStockAsync`; el `COALESCE` de 2 fuentes queda por confirmar); `SEGU00001`: `Abono = 12`, precio = `SeguCost`, siempre inserta; general: PropreList + crosswalk PENDIENTE + `DescuentoCategoria` PENDIENTE (ELSE = precio integro), `Math.Ceiling`; INSERT 7 columnas; fallas silenciosas con `Logger.SAP` (G) |
| 3.6 | `DatosSolicitudCreditoArtMethods` | `SpCREDIDatosSolicitudCreditoArt.sql` | `CheckCliente`/`GetInfo` via `GetClientAsync`/`GetClientMaAsync`; `GetSaldo`: limite = `Zcrmcantidad`, saldo CXC PENDIENTE (lanza); `GetCuenta`: 🔴 **BLOQUEANTE — la OData citada aqui era un GET.** `BusinessPartnerMethods.cs:386` pertenece a `GetCustomerSalesChannelsAsync` (`:377-413`), que es una **consulta**: su propio comentario lo dice (`:379` *"CONSULTA de canal de venta = SD52"*) y la entidad que deserializa, `CanalVentaDist.cs:5-30`, tiene **8 campos**, **ninguno** de las 21 columnas no-clave del `INSERT` a `CteEnviarA` (`SpCREDIDatosSolicitudCreditoArt.sql:169-205`). El endpoint de **escritura** lo nombra el mismo comentario (`:380-383`: *"Antes apuntaba a `URL_ANDROID_API/AS_GET_ZQSD_EditarCliente_CanalVenta`, que es el endpoint de EDICION (POST)"*) y tiene **0 resultados en codigo ejecutable** de `ServicioSAP`, `LAN` y `DMZ`. Y el escape de D4/D6 **no aplica**: `CteEnviarA` es tabla de **Intelisis** (`USE [IntelisisTmp]`), no de `ServicioAndroid`. **Falta nombrar el endpoint de escritura real.** La mitad de LECTURA si se puede escribir: los 23 valores estan cerrados (6 literales + 3 `CASE` sobre `@uen` constantes, el resto del mismo BP que ya lee `GetInfo`) y el SP tiene ELSE natural — si `COUNT(*) != 0` se salta el `INSERT` y devuelve el cliente igual (`:157-166` vs `:210-211`). Con ese camino 3.6 se escribe, **pero un cliente que hoy recibe canal de credito dejaria de recibirlo**, y eso hay que decirlo antes de declarar paridad. + `LinkMagentoAccountAsync`; `UpdateInfo`: PATCH por clave (`:840-858`), lada/historico/CteTel PENDIENTE, `UPDATE ValidacionTel=0` masivo como decision; `getClienteMagento` PENDIENTE; `GetInfoCredito` literales `'1'..'7'` |

### 3.7 · `CreditoWebMethods` — la orquestacion que hoy vive en LAN (NO estaba asignada)

Verificado en LAN esta sesion. Es la pieza que une las anteriores y la que el DMZ llama.

**`CreditoWeb_SaveData_ArticulosAsync(op, data, articulos, prospecto)`** — port de `LAN/Metodos/CreditMethods.cs:466-504` + `LAN/Metodos/Credit/Methods.cs:12-256` + `:922-965`:
1. `data[33] = ""` (`:470`, *"para diferenciarla de credilanas"*).
2. Cliente: `if (prospecto.Length == 0) cliente = cte_prospecto(); else cliente = prospecto;` (`Methods.cs:35-38`). **`cte_prospecto()` ejecuta `EXEC SP_GeneraConsecutivoCteMavi 'MAVI'` contra Intelisis** (`Methods.cs:258-287`, `CredyPrestamoMethods.cs:212-227`). ⚠️ Esto **contradice** el Anexo del documento de diseno, que lo daba por huerfano: esta **vivo en LAN**. Equivalente en `ServicioSAP`: **PENDIENTE** — el alta de prospecto en SAP hoy la hace `ProcessCreditPaymentAsync` via BP; hay que decidir si `cliente` prospecto = numero de BP o se conserva el consecutivo `'P...'` (afecta `SP:216`, que decide prospecto por el prefijo `'P'`).
3. `SolicitudCreditoWebMethods.EjecutarAsync(ConstruirDesdeData(op, data))` → `IdSolicitud`. `ConstruirDesdeData` con el mapeo de `Methods.cs:69-147` (variante A: **`data[0..75]`, no `data[0..69]`** — corregido el 2026-09-21: `Methods.cs:137-139` lee `data[73]`→`@LadaValidar`, `data[74]`→`@TelefonoValidar`, `data[75]`→`@Curp`. Se usan los 76 indices 0..75 sin huecos. **`@Agente` NO se manda en esta variante**: la posicion 58 del EXEC es el literal `''`; `@Agente = data[70]` es de la variante Credilana. ⚠️ **`data[70]` y `data[71]` significan parametros DISTINTOS en cada variante** — en A son `@SucursalDestino`/`@OrigenIdMagento`; en Credilana, `@Agente`/`@Curp`. De los 76 indices, **43 no estan documentados en ningun documento**: 0-13, 15-32, 34, 36-39, 64, 65, 68, 73, 74, 75. Hace falta la tabla de mapeo posicional completa de las DOS variantes antes de escribir esta unidad).
4. Referencias, **hasta 3**, solo si el flag es `1`: `data[40]==1 → data[41..47]`, `data[48]==1 → data[49..55]`, `data[56]==1 → data[57..63]` (`Methods.cs:171-247`), cada una un `InsertReferenciaAsync` con `Id = IdSolicitud` y los `*_ref` de ese bloque. Detalles observables de LAN: `RemoveTildes` sobre Nombre/ApellidoP/ApellidoM (`CredyPrestamoMethods.RemoveTildes`, `:18`); `LadaTel` `int.Parse` con `0` si vacio; `NumeroTel` `long.Parse` (BigInt en LAN, `VARCHAR(10)` en el SP — anotar); `TipoTel` `long.Parse` con `0`. **Bug de LAN a decidir:** `:241` valida `data[61]` pero parsea `data[62]` para `LadaTel` de la 3ª referencia.
5. Si `op == "Insert" || "Insert_2"` y resultado `!= "0"`: lineas de articulo — por cada `articulos[i] = "cantidad,articulo"` (`:944-960`): `IdCredito = idSolicitud.Split('/')[0]`; si `articulo == "SEGU00001"` → `SeguCost = float(cantidad)`, `cantidad = 1`; si no → `SeguCost = 0`, `cantidad = int(cantidad)`; `Condicion = data[35]`, `Orden` incremental desde 1, `Cp = data[14].Trim()` → `LineaArticuloCreditoMethods.InsertarLineaAsync`.
6. Cupon: `if (data.Length > 72 && data[72] != "")` → LAN `CodigoPromocion(data[72], "Elimina", data[66])` (`:480-483`). Equivalente en `ServicioSAP`: `OrderMethods.HandlePromoCodeAsync(codigo, idMagento, "Elimina")` (`:1112`, instancia, publico) — **verificar semantica identica antes de usar** (LAN consulta `VentasCupones` en Intelisis; el C# en `SigMavi`).
7. `Insert_2`: LAN devuelve `res + "/" + cliente` (`Methods.cs:251-253`). 🔴 **CORREGIDO el 2026-09-21 — la frase anterior era falsa.** LAN **normaliza la op antes de llamar**: `Methods.cs:79` y `CredyPrestamoMethods.cs:47` hacen `@Op = (op == "Insert_2") ? "Insert" : op`. Luego el SP recibe `"Insert"`, entra por `SP:172` y **SI escribe**. La op `Insert_2` solo sobrevive en la variable local que decide el sufijo del retorno (`:251-253` / `:206-208`). Dos consecuencias: **(a)** la decision C (`@Op` desconocido → 0) **no se dispara** aqui, y **(b)** el rango que este plan manda portar (`Methods.cs:69-147`) **contiene la linea 79**, asi que un port fiel normaliza la op solo. La duda §6-7 queda RESPONDIDA.
8. Retorno: `resultado` o `"0"`.

**`CreditoWeb_SaveDataAsync(op, data)`** — port de **`CredyPrestamoMethods.cs:29-210`** (variante Credilana) — 🔴 **rango corregido el 2026-09-21: antes decia `:29-130`, que cortaba justo antes de las referencias**: `cliente = cte_prospecto()` siempre; EXEC posicional con `data[0..71]`; diferencias vs variante A: `@SucursalDestino = 0` fijo (`:103`), `@Agente = data[70]`, `@Curp = data[71]`, `@estatus = data[67] o "0"`, `@CodigoRecomendador = data[69]` (**D8.1: la columna se queda, pero NO se le manda valor** — se omite del request, igual que ya hace `OrderMethods.cs:873-910`, y el SP la escribe vacia por su DEFAULT. No se elimina del destino: otro servicio puede consumirla); 🔴 **SI inserta referencias — corregido el 2026-09-21.** La afirmacion anterior (*"no inserta referencias"*) era **falsa**, y estaba propagada en tres sitios (aqui, `prep/grafo.md:1055` y `:1422`). `CredyPrestamoMethods.cs:131-204` tiene **los 3 bloques** con el mismo `INSERT` de 8 columnas a `TrWACW00041_RefSolCredWeb` (`:133`, `:158`, `:183`) y los mismos flags `Convert.ToInt32(data[40|48|56]) == 1` (`:131`, `:156`, `:181`). **Un port del rango viejo produce cero referencias de Credilana, sin excepcion y sin log.** Y hay una asimetria real que hay que decidir (clase E): el **bloque 1** lleva ademas `&& op == "Insert_2"` (`:132`), condicion que los bloques 2 y 3 no piden — asi que con `op == "Insert"` y los 3 flags en 1, Credilana guarda las referencias **2 y 3 pero no la 1**. Ojo tambien con el tipo: `NumeroTel` va `SqlDbType.VarChar` en las referencias 1 y 2 (`:147`, `:172`) y `SqlDbType.BigInt` en la 3 (`:197`), sobre la misma columna; DIMAS MX email comentado.

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

> [!warning] Ruta y toolchain revisadas el 2026-09-21. La compartida ahora es **`Z:\` = `\\CATECINF214058D\Migracion SAP`** (antes `\\CATECINF214034\Compartida`), y el comando de abajo ya apunta ahi. **En esta maquina no esta el MSBuild de VS 18**: solo el de `Framework64\v4.0.30319`, que funciona pasando `/p:VSToolsPath=` y `/p:CscToolPath=<RoslynLatest>`. Y **no se compila sin autorizacion explicita por instancia**: nunca se escribe en `bin\` ni `obj\` de la compartida.

Toolchain verificada: **`C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe`** (18.10.1) — **no** el de `Framework64\v4.0.30319`, que no resuelve `ToolsVersion=15.0`. `Microsoft.WebApplication.targets` existe en `...\v18.0\WebApplications\`. Roslyn `csc.exe` en `packages\Microsoft.CodeDom.Providers.DotNetCompilerPlatform.2.0.1\tools\RoslynLatest\`. 48 paquetes restaurados.

```bash
"C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/MSBuild.exe" "Z:/ServicioSAP/ServicioSap/ServicioSap/ServicioSap.csproj" /t:Build /p:Configuration=Debug /p:VisualStudioVersion=18.0 "/p:OutDir=C:/temp/serviciosap-build/bin/" "/p:BaseIntermediateOutputPath=C:/temp/serviciosap-build/obj/" /v:m
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

---

## 7. Lista de arranque — lo que hace falta para empezar, por tipo de operacion

> Levantada el 2026-09-21 leyendo el contrato real de los 26 endpoints en `businesspartner-dev`. **El verbo esta leido del decorador y del metodo de `session` que usa la ruta, no deducido del nombre** — y en tres casos el nombre miente.

### 7.0 Dato transversal: `ServicioSAP` no usa ni uno de estos endpoints

**0 resultados de `ZQBP_EDITARCLIENTE_SRV` en todo el C#.** Los dos unicos servicios de BP que `ServicioSAP` toca hoy son `ZAPI_BP01_PARTNER_SRV` (`BusinessPartnerMethods.cs:76-77, 160-161`) y `ZAPI_BP05MA_SRV` (`BusinessPartnerMethods.cs:302`, `OrderMethods.cs:618`). Todo el grupo `CteTel`, `CteCredito`, `CteLimiteCred` y `CteCtoEmpleo` es superficie **nueva** para el C#.

### 7.0b 🔴 Seis endpoints de estas tablas NO vienen del listado del usuario

Detectado el 2026-09-21 a peticion del usuario. **Regla vigente: lo que no esta en su listado se marca aparte y no entra al alcance sin que el lo incorpore.** Estos seis se colaron en las tablas de arriba como si vinieran de su lista:

| Endpoint | De donde salio realmente | Riesgo de haberlo mezclado |
|---|---|---|
| 🔴 **`AS_PATCH_ZSDT_CTE`** | Hallazgo de un agente en `AS_ZQBP_CTE.py:173-217` | **El mas delicado.** Esta en el cajon "se puede escribir hoy" de §7.1 **y** sostiene la conclusion de que los campos en blanco de §5 se pueden llenar. Si el usuario no lo valida, **esa conclusion se cae con el** |
| `A_GET_CXCValidaTelefono` | La pidio Claude expresamente en la busqueda, por compartir el catalogo `1138ValAutLadaTel` | Menor: solo aporta el dato de la triplicacion del validador |
| `AS_GET_EncontrarCteCodigoMenudeo` | Analisis del codigo recomendador | Sostiene el veredicto de que la `@opcion = 9` ya tiene equivalente SAP (D8.3) |
| `AS_GET_ZQBP_AGENTE` y su familia (7 rutas) | Busqueda del consumidor de la opcion 17 | Es la "zona de aterrizaje" propuesta para la mitad `Agente` de la opcion 17 (decision R) |
| `AI_GET_InformacionUsuario` | Misma busqueda | Ninguno: es un stub (`return True`) |
| `AI_GET_CatalogoConfiguracion` | Nombre que un agente le dio al catalogo generico | Confuso: **el usuario aporto `AI_GET_CCatalogo`**, con su URL, al resolver la `TablaStD`. Los dos nombres pueden ser la misma ruta o no |

**El unico que si rastrea al usuario** es `AI_GET_CCatalogo`: aporto su URL (`.../AI_GET_CCatalogo?nombre_catalogo=FORMAPAGO`) aunque no aparezca en el JSON exportado de la coleccion.

**Que hacer con ellos:** quedan anotados como hallazgos del codigo, **no** como endpoints del alcance. Cada uno necesita que el usuario lo incorpore explicitamente antes de que se escriba un cliente C# contra el. Y donde una conclusion de este plan dependa de uno de ellos — sobre todo `AS_PATCH_ZSDT_CTE` — **esa conclusion es provisional**.

### 7.1 Se puede escribir hoy — no hace falta nada (6)

| Endpoint | Por que |
|---|---|
| `AS_GET_BP_MA` | 🔴 **No existe en `businesspartner-dev` y no hay que buscarlo ahi: ya esta migrado.** `GetClientMaAsync` (`BusinessPartnerMethods.cs:297`), 6 usos, S/4 directo por `obtenerUrl`. Clave compuesta `Partner` + `Client` (default `"110"`) |
| `AS_GET_ZB_DATOS_CLIENTE` | 🔴 **FILA CORREGIDA el 2026-09-21 — la version anterior tenia dos errores.** Decia *"va por S/4 directo"*: **es falso**, la ruta va por **CPI con Bearer** (`settings.urlSAP` → `urlCPIDEV` → `hostCPI`, `config.py:63-64` y `:58-59`; token por `get_token_RSG()`), lo que **contradice la regla de solo S/4HANA**. Y presentaba el metodo C# como equivalente de la ruta, cuando **no consultan igual**: la ruta pide la **entidad por clave** (`ZB_DATOS_CLIENTE(BusinessPartner='X')`, un objeto en `d`) y el C# pide la **coleccion con filtro** (`?$filter=BusinessPartner eq 'X'&$top=1&sap-client=110&$format=json`, y toma `d.results[0]`). **Eso importa:** el `$top=1` del C# existe porque la vista devuelve varias filas por BP — y si las devuelve, **la forma de entidad por clave de la ruta no puede funcionar** (error, o una fila arbitraria). **Lo que si es cierto y se mantiene:** el cliente C# `GetClientAsync` (`BusinessPartnerMethods.cs:27-60`) **ya existe, va por S/4 directo** (`Conexion.Data.obtenerUrl(...SERVICE_URL)` + `TokenGenerator.CreateClientS4()`) y **se usa tal cual: no se migra la ruta Python**. Dos avisos que siguen en pie: no sirve para el telefono validado (no trae `Zvaltel`), y hay que decidir el criterio de desempate entre las filas duplicadas en vez de confiar en `$top=1` sin `$orderby`. **Defecto extra de la ruta, no reportado antes:** no añade `$format=json` ni `sap-client` — solo reenvia los query params crudos del llamador, asi que sin `$format=json` SAP responde XML, `response.json()` revienta y devuelve `{"error": "SAP no devolvio JSON"}` |
| `AS_POST_BusinessPartner` | El alta ya funciona: `SubmitClientInfoAsync`, mismo servicio y mismo entity set |
| `AS_PATCH_ZSDT_CTE` | Se escribe generalizando `BusinessPartnerMethods.cs:831-873`: cambiar el payload anonimo de una propiedad por un diccionario con `JsonIgnoreCondition.WhenWritingNull`, que replica el `exclude_none` del Python |
| `AI_GET_ZSDT_CTETEL` y `AS_GET_ZQBP_EditarCliente_CteTel` | GET con `$filter`, sin CSRF. El segundo es el mas completo del grupo (9 query params) |
| `AS_DELETE_ZQBP_EditarCliente_CteTel` | El de menor riesgo. **Pero el flujo de credito no borra telefonos**: probablemente fuera de alcance |

### 7.2 Capturas que hacen falta — PATCH

**La prueba de mayor rendimiento de toda la lista**, porque una sola respuesta desbloquea cuatro endpoints:

```
PATCH {SERVICE_URL}/ZQBP_EDITARCLIENTE_SRV/CteTelSet(Partner='1500008277',ZidcteTel='0000000001')
Body: {"Zvaltel": false}
```

- **200 / 204** → se cierra el conflicto de D10 en `AS_PUT_ZQBP_EditarCliente_CteTel`, `AS_PUT_ZQBP_EditarCliente_CteLimiteCred`, el `AS_UPSERT_..._CteCto_Empleo` y `A_POST_BPValidarTelefonoCOFETEL`. Los cuatro se reescriben como PATCH.
- **405 Method Not Allowed** → hay que decidir: PUT contra la regla, o rehacer el flujo.

Hace falta la misma prueba, por separado, contra:

| Entity set | Por que importa |
|---|---|
| `CteLimiteCredSet(ZclienteBp='…')` | Su codigo **ya manda body parcial** (`exclude_none`), que es semantica de PATCH mandada por PUT. Es el caso mas claro de conversion |
| `CteCtoEmpleoSet(Partner='…',ZidcteCto='…')` | El UPSERT existente usa PUT |
| `BPartnerSet(Partner='0001234567')` | Para saber si la actualizacion de BP se hace por PATCH o por POST con `Partner` lleno. **Hoy nadie lo ha probado** |

**Y el atajo:** el **`$metadata` de `ZQBP_EDITARCLIENTE_SRV` y de `ZAPI_BP01_PARTNER_SRV`** responde las cuatro preguntas de golpe, y ademas cierra el casing de `ZvalTel` contra `Zvaltel`. Si se puede conseguir, sustituye a las cuatro capturas.

### 7.3 Capturas que hacen falta — INSERT / POST

**1 · ¿Quien genera `ZidcteTel`?** La ruta Python lo genera **en cliente**: `obtener_ultimo_zidctetel` hace un GET de todos los telefonos del BP, toma el `max()+1` y lo formatea a 10 digitos (`AS_POST_ZQBP_EditarCliente_CteTel.py:39-62`), **pisando lo que mande el llamador** (`:71`). Eso tiene race condition: dos altas simultaneas del mismo cliente colisionan.

> **Captura que hace falta:** un `POST` a `CteTelSet` **sin `ZidcteTel`** (o con `""`). Si SAP lo asigna, se tira todo ese bloque. Si no, hay que serializar la generacion en C# (lock, o reintento ante duplicado).

**2 · El deep insert de `toCteTel`** — `A_POST_GuardarTelefonoCte` es **el endpoint mas bloqueado del grupo**. No hace PATCH pese al nombre: hace POST, y **cambia de servicio y de host** respecto al resto (`ZAPI_BP01_PARTNER_SRV` sobre `S4_ODATA_DEV_BASE_URL`, no `ZQBP_EDITARCLIENTE_SRV` sobre `SERVICE_URL`). La llave no va en la URL: viaja dentro del `toCteTel`.

> **Captura que hace falta:** el deep insert de `BPartnerSet` con `toCteTel` poblado, **en los dos casos** — con `ZidcteTel` (actualizar) y sin el (crear) — para confirmar que SAP genera la llave y que **no crea un BP fantasma**.

**3 · `A_POST_ValidarTelefono` hace N+1 deep inserts**, uno por telefono, cada uno un POST completo del BP. Hace falta la captura de un deep insert **parcial** (`toCteTel={Partner, ZidcteTel, ZvalTel:false}`) para confirmar que actualiza el telefono y **no pisa el resto del BP**.

### 7.4 Capturas que hacen falta — GET

| Endpoint | Que falta y por que bloquea |
|---|---|
🔴 `AS_GET_ZQBP_EditarCliente_CteCredito` | `GET …/CteCreditoSet?$format=json`. **El codigo no nombra ni un campo de la respuesta mas alla de `Zcredito`.** Sin esta captura no hay DTO. **Nota del 2026-09-21:** el usuario decidio que `tarjeta`, `tarjetaDigitos` y `creditoHipoteca` **se quedan como estan** — no se persiguen. Por tanto los huecos duros de §7.3 **siguen declarados como huecos**, y esta captura se necesita para el DTO de `CteCreditoSet`, no para cerrarlos. Se escriben en la tabla de Android por D4+D6 |
| `AS_GET_TipoCredito` | `SELECT * FROM ZTIPO_CTE` con al menos 5 filas. El codigo solo prueba que existen 12 columnas por los filtros: **no sus tipos ni los valores validos** de `ZTIPO_CREDITO`. 0 valores cableados en el repo |
| `AS_GET_ZCTE_CREDITO` | Filas reales para saber tipos: las 13 columnas estan nombradas pero **todos los parametros son `str`** y no se sabe si `ZLIMITE_CREDITO` es numerico |

**Aviso de arquitectura sobre estos tres:** `AS_GET_TipoCredito` y `AS_GET_ZCTE_CREDITO` **no son OData**. Van por SQL directo a **HANA** via `hdbcli`, y el wrapper `ConexionHANA` **no esta en el repo**. Hasta que no se decida el transporte no se puede escribir "HttpClient + OData v2" para ellos.

### 7.5 SMS — aqui no hay nada que leer en el repo

Los dos endpoints **no van a SAP**, y ninguno de los dos tiene contrato legible:

| Endpoint | Destino real | Por que esta bloqueado |
|---|---|---|
| `A_POST_EnviarSMS` | WS .NET legado `WsMensajeria` (`requests.post`) | El body es un **`dict` libre**: el repo no declara **ni un nombre de campo**. Con lo que hay es imposible escribir el `HttpClient` |
| `A_POST_SMSEnviar` | Lambda AWS `L_POST_EnvioMensaje-dev` por SDK boto3 | **El codigo del lambda no esta en el share** (0 resultados en `apps\lambdas\`). No se puede saber a que tabla escribe ni si acepta la columna `Clave` |

> **Hace falta:** una captura real de uno de los dos, o el Swagger de `WsMensajeria`. **Y una decision previa:** ¿el canal es uno de estos dos, o la cola de Android que `ServicioSAP` ya escribe en `CreditMethods.cs:137`? Recordatorio: ese `INSERT` existente usa `string.Format` con datos del usuario (inyeccion) y **le falta la columna `Clave`** que el SP de pre-solicitud si escribe.

### 7.6 Decisiones — no son capturas, son llamadas del usuario (7)

| # | Decision | Contexto verificado |
|---|---|---|
| **1** | **¿`CteTel` se lee por `ZQBP_EDITARCLIENTE_SRV/CteTelSet` o por `ZAPI_BP05MA_SRV/$expand=to_CteTel`?** | `ServicioSAP` **ya usa la segunda** (`BusinessPartnerMethods.cs:297-303`); la primera **no la usa nadie**. Elegir dos caminos para el mismo dato es el defecto que la regla 28 prohibe |
| **2** | **El prospecto `'P'`** | El mapeo lo asigna a `AS_POST_ClienteContado`, pero ese endpoint es de **contado, no de credito**, y recibe un **`dict` libre sin modelo Pydantic** — no se puede tipar un cliente C# contra eso. ¿Es realmente el camino del prospecto? Importa porque `SP:216` decide "es prospecto" por el prefijo `'P'` |
| **3** | **`sueldo`: ¿nodo anidado o POST independiente?** | Los dos contratos coexisten hoy: `toCteCtoEmpleo` del deep insert BP01 (que `ServicioSAP` **ya manda, vacio**) o `POST` a `CteCtoEmpleoSet` |
| **4** | **Actualizacion de BP: ¿POST con `Partner` lleno o PATCH real?** | `SubmitClientInfoAsync` ya hace la primera. Depende de la captura de 7.2 |
| **5** | **Dos endpoints van por CPI, contra "solo S/4"** | `AI_POST_UpdateBPartner` y `AS_GET_ZB_DATOS_CLIENTE` usan `settings.urlSAP = urlCPIDEV`. **Recomendacion:** descartar el primero (`SubmitClientInfoAsync` ya cumple S/4 + Basic + CSRF) y quedarse **solo con su lista de campos**, que si es valiosa porque documenta que subconjunto se considera actualizable. El segundo ya se consume bien desde C# por S/4 directo |
| **6** | **COFETEL: ninguna de sus dos fuentes esta en S/4** | El catalogo de ladas vive en **HANA Cloud** (`CONFIGURACIONCATALOGOS`, `NOMBRECATALOGO='1138ValAutLadaTel'`) y el de COFETEL en **SQL Server `SIGMavi`** por lambda. Opciones: `HttpClient` contra `configventas`, consulta directa a HANA, o migrar el catalogo a S/4. **Y de paso:** la validacion de formato esta **triplicada** en tres archivos y la lectura del catalogo tambien — en C# debe ser **un solo validador** |
| **7** | **`A_GET_TelefonoValidado` no se porta: se reimplementa** | Si no hay telefono validado, ¿se devuelve **vacio** (como el SP) o **el mas reciente sin validar** (como hoy la ruta)? Son comportamientos distintos. Y los 4 criterios del SP deben ir en el **`$filter` del servidor** (`ZtipoCte eq 'MOVIL' and Zvaltel eq true`), no en memoria |

### 7.7 Cinco defectos de los endpoints, para no heredarlos

1. 🔴 **Bug de round-trip entre dos endpoints del propio grupo.** El GET de `CteTel` reescribe `Zfecha`/`ZfechaCap` vacios a la cadena **`"00000000"`** (`AS_GET_ZQBP_EditarCliente_CteTel.py:60-62`), y el `limpiar_payload` de la escritura **borra exactamente el valor `"00000000"`** (`AS_POST_BusinessPartner.py:89`). **Leer y volver a escribir pierde las fechas.** En C#: devolver `null`/`DateTime?`, **no replicar el relleno**.
2. **`AS_PATCH_BusinessPartner` no hace PATCH.** Se llama y se declara PATCH pero contra SAP hace **POST a la coleccion** `BPartnerSet/` (`:132`). Y va por **otro host** que su hermano POST. No usarlo como esta.
3. **`$filter` crudo aceptado del cliente** en `AS_GET_ZQBP_EditarCliente_CteTel` (`:17-18, 25-28`): inyeccion OData directa, y **pisa el escapado** de las lineas 32-47. **No portar ese passthrough.**
4. **`except Exception` ciego y `verify=False`** en practicamente todo el grupo: colapsan el status real de SAP a un 500 y pierden el cuerpo del error. En C# hay que propagar el `StatusCode` y el `Content`.
5. **Ningun GET del grupo usa `$orderby` ni `$top`.** Para el caso del SP ("el mas reciente") eso obliga a traer todos los telefonos y ordenar en memoria. **Confirmar con una captura si `ZQBP_EDITARCLIENTE_SRV` soporta `$orderby=Zfecha desc&$top=1`** — si lo soporta, el criterio 3 del SP se resuelve en el servidor y no hay que portar el `max()` fragil.

### 7.8 Y una ruta que no esta en el share

El catalogo generico por `nombre_catalogo` **no se llama `AI_GET_CCatalogo`**: el cliente lo invoca como `AI_GET_CatalogoConfiguracion` contra el microservicio **`configventas`**, cuyo repo **no esta en `Z:`**. Hace falta ese repo o su OpenAPI, mas el valor de `URL_CONFIGVENTAS` por ambiente. **Y una pregunta concreta:** ¿escapa el nombre del catalogo en la URL? Importa porque el catalogo que el SP necesita, **`ORIGEN VALIDACION NUMERO CTE`, lleva espacios**.

---

## 8. El mapeo posicional de `data[]` — la tabla completa

> Levantada el 2026-09-22 por extraccion paralela de las tres fuentes: las dos variantes de LAN y los dos constructores de Magento. **312 filas, ninguna marcada como dudosa.** Cada celda sale de abrir el archivo; el `archivo:linea` de cada una esta en el anexo de esta seccion.

### 8.0 Lo que hay que saber antes de leer la tabla

**No hay UN contrato: hay DOS, y divergen en la cola.**

| | Constructor en Magento | Longitud | Consumidor en LAN |
|---|---|---|---|
| **Credilana** | `CreditMigration\Model\CredilanaManagement.php:439` (y su gemelo byte a byte en `:645`) | **72** posiciones (0..71) | `Credit\CredYPrestamo\CredyPrestamoMethods.cs` |
| **Checkout ProductosMX** | `ProductosMX\Model\CreditMxManagement.php:409-462` | **76** posiciones (0..75) | `Credit\Methods.cs` |

**Coinciden en 0-70. Divergen a partir de ahi**, y el mismo indice significa cosas distintas:

| Indice | En Credilana | En ProductosMX |
|---|---|---|
| **70** | `@Agente` | `@SucursalDestino` |
| **71** | `@Curp` | `@OrigenIdMagento` (y **nunca se asigna** en origen) |
| **75** | *no existe* | `@Curp` |

**Eso es lo mas importante de toda la tabla:** un port que trate `data[]` como un contrato unico **corrompe datos en silencio**.

### 8.1 La tabla, indice por indice

| # | Variante A — checkout (`Credit\Methods.cs`) | Credilana (`CredyPrestamoMethods.cs`) | Origen en Magento |
|---:|---|---|---|
| **0** | @apellido_p · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | @apellido_p · `RemoveTildes (NFD + quita diacriticos + NFC + ToUpper)` · **sin guarda** | apellido paterno del cliente · `ninguna (valor de la entidad Credit)`<br>[VARIANTE B] apellido paterno del cliente · `_removeAscentsAndNumbers (:419) y luego _removeAscents (:451): pierde digitos y acentos, queda en mayusculas` |
| **1** | @apellido_m · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | @apellido_m · `RemoveTildes` · **sin guarda** | apellido materno del cliente<br>[VARIANTE B] apellido materno del cliente · `_removeAscentsAndNumbers + _removeAscents` |
| **2** | @nombre · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | @nombre · `RemoveTildes` · **sin guarda** | primer nombre del cliente<br>[VARIANTE B] primer nombre del cliente · `_removeAscentsAndNumbers + _removeAscents` |
| **3** | @nombre_2 · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | @nombre_2 · `RemoveTildes` · **sin guarda** | segundo nombre del cliente<br>[VARIANTE B] segundo nombre del cliente · `_removeAscentsAndNumbers + _removeAscents` |
| **4** | @fecha_nacimiento (SqlDbType.VarChar en C#, pero el SP lo declara DATE en :98) · **sin guarda** | @fecha_nacimiento · `ninguna (string crudo a un parametro SqlDbType.VarChar que el SP declara DATE)` · **sin guarda** | fecha de nacimiento del cliente (formato Y-m-d, se parte con explode('-') en :600)<br>[VARIANTE B] fecha de nacimiento del cliente · `ninguna — se asigna DESPUES del array_map de :451 precisamente para no perder los guiones` |
| **5** | @rfc · **sin guarda** | @rfc · **sin guarda** | RFC del cliente — CALCULADO, no capturado: rfc->obtenerRFC(nombre, nombre2, apPaterno, apMaterno, dia, mes, anio) · `strtoupper en los argumentos; '' si primer_nombre esta vacio`<br>[VARIANTE B] RFC del cliente (del DTO, no calculado aqui) · `_removeAscents (:451) — sobrevive por ser alfanumerico` |
| **6** | @sexo · **sin guarda** | @sexo · **sin guarda** | genero del cliente<br>[VARIANTE B] genero del cliente · `_removeAscents` |
| **7** | @email · **sin guarda** | @email · **sin guarda** | correo electronico del cliente<br>[VARIANTE B] correo electronico del cliente · `ninguna — asignado despues del array_map de :451 para conservar '@' y '.'` |
| **8** | @direccion · **sin guarda** | @direccion · **sin guarda** | direccion / calle del domicilio<br>[VARIANTE B] calle del domicilio de envio · `_removeAscentsAndNumbers (:419) — PIERDE los digitos — y luego _removeAscents` |
| **9** | @exterior · **sin guarda** | @exterior · **sin guarda** | numero exterior del domicilio<br>[VARIANTE B] numero exterior · `_removeAscents (:451); is_numeric lo deja intacto si es numero` |
| **10** | @interior · **sin guarda** | @interior · **sin guarda** | numero interior del domicilio<br>[VARIANTE B] numero interior · `_removeAscents` |
| **11** | @entre_calles · **sin guarda** | @entre_calles · **sin guarda** | entre que calles esta el domicilio (cruce de calles)<br>[VARIANTE B] entre calles (getBwet) · `_removeAscentsAndNumbers (pierde digitos) + _removeAscents` |
| **12** | @years_old · `int.Parse` | @years_old · `int.Parse` | antiguedad en el domicilio, ANIOS · `$years = (TipoAntiguedad === 'A') ? Antiguedad : 0`<br>[VARIANTE B] antiguedad en el domicilio, ANIOS · `explode('-', getAntique()); $years = ($antique[0] === 'A') ? $antique[1] : 0` |
| **13** | @months_old · `int.Parse` | @months_old · `int.Parse` | antiguedad en el domicilio, MESES · `$months = (TipoAntiguedad === 'A') ? 0 : Antiguedad`<br>[VARIANTE B] antiguedad en el domicilio, MESES · `$months = ($antique[0] === 'A') ? 0 : $antique[1]` |
| **14** | @codigo_postal · **sin guarda** | @codigo_postal · **sin guarda** | codigo postal del domicilio<br>[VARIANTE B] codigo postal del domicilio — PERO SE PIERDE: sobrescrito 27 lineas mas abajo · `_removeAscents`<br>[VARIANTE B] codigo promotor (valor FINAL que viaja en la posicion 14; el SP lo recibe como @codigo_postal) · `ninguna — asignado despues del array_map de :451` |
| **15** | @delegacion · **sin guarda** | @delegacion · **sin guarda** | delegacion / municipio<br>[VARIANTE B] ciudad / delegacion · `_removeAscents` |
| **16** | @poblacion · **sin guarda** | @poblacion · **sin guarda** | delegacion / municipio OTRA VEZ (mismo getter que el 15; el SP lo llama @poblacion)<br>[VARIANTE B] ciudad / delegacion OTRA VEZ (mismo getCity que el 15) · `_removeAscents` |
| **17** | @estado · **sin guarda** | @estado · **sin guarda** | estado del domicilio<br>[VARIANTE B] estado · `_removeAscents` |
| **18** | @colonia · **sin guarda** | @colonia · **sin guarda** | colonia del domicilio<br>[VARIANTE B] colonia (getSuburb) · `_removeAscents` |
| **19** | @estado_civil | @estado_civil | estado civil — LITERAL '' (comentado //Estado civil en el fuente) |
| **20** | @vive_en_calidad | @vive_en_calidad | vive en calidad de — LITERAL '' (comentado //[20] Vive en calidad) |
| **21** | @sueldo (SqlDbType.Money) · `double.Parse` · **sin guarda** | @sueldo · `double.Parse (a un parametro SqlDbType.Money; parsea con la cultura del hilo, no invariante)` · **sin guarda** | sueldo — LITERAL 0 (comentado //[21] Sueldo) · `entero 0`<br>[VARIANTE B] sueldo — LITERAL 0 (comentario del fuente: //Sueldo) · `entero 0` |
| **22** | @tarjeta · **sin guarda** | @tarjeta · **sin guarda** | tiene tarjeta de credito — LITERAL '' en el Insert (comentado //[22] tarjeta)<br>[VARIANTE A, op=Update] tiene tarjeta de credito (del DTO de la solicitud)<br>[VARIANTE B, op=Update] tiene tarjeta de credito — 'V' o 'F' · `$auth_data->getCreditCard() ? 'V' : 'F'` |
| **23** | @tarjeta_digitos · `int.Parse` | @tarjeta_digitos · `int.Parse` | digitos de la tarjeta — LITERAL "" en el Insert<br>[VARIANTE A, op=Update] ultimos digitos de la tarjeta<br>[VARIANTE B, op=Update] digitos de la tarjeta |
| **24** | @credito_hipoteca · **sin guarda** | @credito_hipoteca · **sin guarda** | tiene credito hipotecario — LITERAL "" en el Insert<br>[VARIANTE A, op=Update] tiene credito hipotecario<br>[VARIANTE B, op=Update] tiene credito hipotecario — 'V' o 'F' · `$auth_data->getCreditHipo() ? 'V' : 'F'` |
| **25** | @credito_automotriz · **sin guarda** | @credito_automotriz · **sin guarda** | tiene credito automotriz — LITERAL "" en el Insert<br>[VARIANTE A, op=Update] tiene credito automotriz<br>[VARIANTE B, op=Update] tiene credito automotriz — 'V' o 'F' · `$auth_data->getCreditAuto() ? 'V' : 'F'` |
| **26** | @lada_particular · `int.Parse`<br>segundo uso: sirve de GUARDA (cruzada) para @telefono_particular | @lada_particular · `int.Parse`<br>SEGUNDO USO: no es destino, es la guarda de @telefono_particular (el valor que se manda es data[27]) · `ninguna (solo comparacion != "")` | lada del telefono fijo — LITERAL '' |
| **27** | @telefono_particular · `.ToString()` | @telefono_particular · `.ToString()` | numero del telefono fijo — LITERAL '' |
| **28** | @lada_celular · `int.Parse` · **sin guarda** | @lada_celular · `int.Parse` · **sin guarda** | lada del celular del cliente (derivada de partir getTelefono con calculatePhoneNumber) · `(int)$clientPhoneData['lada']`<br>[VARIANTE B] lada del celular del cliente · `ninguna (is_numeric lo exime de _removeAscents)` |
| **29** | @telefono_celular · `.ToString()` · **sin guarda** | @telefono_celular · `.ToString()` · **sin guarda** | numero del celular del cliente (sin lada) · `(int)$clientPhoneData['nume']`<br>[VARIANTE B] numero del celular del cliente |
| **30** | @ext_archivo_1 · `.ToString().ToLower()` · **sin guarda** | @ext_archivo_1 · `.ToString().ToLower()` · **sin guarda** | extension del archivo 1 (INE frente) — LITERAL '' en el Insert<br>[VARIANTE A, op=Update] extension del archivo 1 — LITERAL 'jpg' · `literal`<br>[VARIANTE B, op=Update] MIME del INE frente (comentario del fuente: 'Only format from form') |
| **31** | @ext_archivo_2 · `.ToString().ToLower()` · **sin guarda** | @ext_archivo_2 · `.ToString().ToLower()` · **sin guarda** | extension del archivo 2 (INE reverso) — LITERAL '' en el Insert<br>[VARIANTE A, op=Update] extension del archivo 2 — LITERAL 'jpg' · `literal`<br>[VARIANTE B, op=Update] MIME del INE reverso |
| **32** | @ext_archivo_3 · `.ToString().ToLower()` · **sin guarda** | @ext_archivo_3 · `.ToString().ToLower()` · **sin guarda** | extension del archivo 3 — LITERAL '' siempre (ni en el Update se toca) |
| **33** | ESCRITURA, no lectura: `data[33] = ""` — el articulo que manda Magento se DESCARTA antes de llamar al SP · `ninguna (asignacion de literal vacio)` · **sin guarda**<br>@articulo — pero en la variante A SIEMPRE llega "" porque CreditMethods.cs:470 lo sobrescribe antes de la llamada · **sin guarda** | @articulo · **sin guarda** | articulo / SKU sobre el que se solicita el credito |
| **34** | @uen · `int.Parse` · **sin guarda** | @uen · `int.Parse` · **sin guarda** | UEN (unidad de negocio: 1 = Muebles America, 2 = Viuda, segun el uso en :433 y :435) · `ninguna (viaja como int de la entidad)`<br>[VARIANTE B] UEN derivada de la tienda: 1 si storeId === 5, si no 2 · `entero literal` |
| **35** | @condicion · **sin guarda** | @condicion · **sin guarda** | condicion de credito (plazo). Si origen es 'CREDILANA MX' viene del DTO; si no, literal '12 M VIU P INM' (uen 2) o '12 M MA P INM'<br>[VARIANTE B] condicion de credito — '12 M MA P INM' o '12 M VIU P INM' segun el store code · `str_replace('STORE', 'MA'\|'VIU', '12 M STORE P INM')` |
| **36** | @utmSource · **sin guarda** | @utmSource · **sin guarda** | utm_source de la campana de marketing<br>[VARIANTE B] utm_source tomado del quote · `ninguna — asignado despues del array_map de :451` |
| **37** | @die (SqlDbType.Int en C#; el SP lo declara BIT en :132) · `int.Parse` | @die · `int.Parse (parametro SqlDbType.Int; el SP lo declara BIT)` | bandera DIE — LITERAL ''<br>[VARIANTE B] bandera DIE — LITERAL '0' · `literal` |
| **38** | @sucursal · `int.Parse` | @sucursal · `int.Parse` | sucursal de origen — DERIVADA de la UEN: 504 si uen==1, 505 si no · `entero literal`<br>[VARIANTE B] sucursal de origen — 504 si storeId === 5, si no 505 · `entero literal` |
| **39** | @origen · **sin guarda**<br>segundo uso: comparacion `== "DIMAS MX"` que abre un bloque de envio de correo cuyo cuerpo esta COMENTADO (linea 156) · `.ToString()` · **sin guarda** | @origen · **sin guarda**<br>SEGUNDO USO: no va al SP — se compara con "DIMAS MX" para decidir si se envia un correo de revision (el envio esta comentado) · `.ToString()` · **sin guarda** | origen de la solicitud (p.ej. 'CREDILANA MX', 'DIMAS MX')<br>[VARIANTE B] origen de la solicitud; por defecto 'PRODUCTOS MX' · `_removeAscents` |
| **40** | FLAG bloque referencia 1: `referencia = Convert.ToInt32(data[40]); if (referencia == 1)` · `Convert.ToInt32` · **sin guarda** | bloque referencia 1 — FLAG que activa el INSERT en TrWACW00041_RefSolCredWeb · `Convert.ToInt32` · **sin guarda** | bandera/contador de la referencia 1 — LITERAL '1' (bloque comentado //Primer Referencia)<br>[VARIANTE B] bandera/contador referencia 1 — LITERAL '1' · `literal` |
| **41** | bloque referencia 1 → @Parentesco (INSERT en TrWACW00041_RefSolCredWeb, NO va al SP) · **sin guarda** | bloque referencia 1 — @Parentesco (VarChar) · **sin guarda** | parentesco de la referencia 1<br>[VARIANTE B] parentesco de la referencia 1 · `_removeAscents` |
| **42** | bloque referencia 1 → @Nombre · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 1 — @Nombre (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | nombre(s) de la referencia 1 — CONCATENACION de primer nombre + ' ' + segundo nombre · `concatenacion con espacio; el '?? ""' aplica solo al segundo operando`<br>[VARIANTE B] nombre(s) de la referencia 1 — campo unico del DTO, NO concatenado (a diferencia de la variante A) · `_removeAscentsAndNumbers + _removeAscents` |
| **43** | bloque referencia 1 → @ApellidoP · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 1 — @ApellidoP (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | apellido paterno de la referencia 1<br>[VARIANTE B] apellido paterno de la referencia 1 · `_removeAscentsAndNumbers + _removeAscents` |
| **44** | bloque referencia 1 → @ApellidoM · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 1 — @ApellidoM (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | apellido materno de la referencia 1<br>[VARIANTE B] apellido materno de la referencia 1 · `_removeAscentsAndNumbers + _removeAscents` |
| **45** | bloque referencia 1 → @LadaTel · `int.Parse` | bloque referencia 1 — @LadaTel (Int) · `int.Parse` | lada del telefono de la referencia 1 · `(int)$referencePhoneData['lada']`<br>[VARIANTE B] lada del telefono de la referencia 1 |
| **46** | bloque referencia 1 → @NumeroTel (SqlDbType.BigInt) · `long.Parse` | bloque referencia 1 — @NumeroTel (SqlDbType.VarChar) · `.ToString()` | numero de telefono de la referencia 1 · `(int)$referencePhoneData['nume']`<br>[VARIANTE B] numero de telefono de la referencia 1 |
| **47** | bloque referencia 1 → @TipoTel (parametro declarado SqlDbType.Int pero se le asigna un long) · `long.Parse` | bloque referencia 1 — @TipoTel (parametro SqlDbType.Int) · `long.Parse (long a un parametro Int)` | tipo de telefono de la referencia 1 — LITERAL '2'<br>[VARIANTE B] tipo de telefono de la referencia 1 — DATO REAL del DTO (en la variante A es el literal '2') |
| **48** | FLAG bloque referencia 2: `referencia = Convert.ToInt32(data[48]); if (referencia == 1)` · `Convert.ToInt32` · **sin guarda** | bloque referencia 2 — FLAG que activa el INSERT en TrWACW00041_RefSolCredWeb · `Convert.ToInt32` · **sin guarda** | bandera/contador de la referencia 2 — LITERAL '0' (no hay segunda referencia)<br>[VARIANTE B] bandera/contador referencia 2 — LITERAL '0' · `literal` |
| **49** | bloque referencia 2 → @Parentesco · **sin guarda** | bloque referencia 2 — @Parentesco (VarChar) · **sin guarda** | parentesco referencia 2 — LITERAL '' |
| **50** | bloque referencia 2 → @Nombre · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 2 — @Nombre (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | nombre referencia 2 — LITERAL '' |
| **51** | bloque referencia 2 → @ApellidoP · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 2 — @ApellidoP (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | apellido paterno referencia 2 — LITERAL '' |
| **52** | bloque referencia 2 → @ApellidoM · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 2 — @ApellidoM (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | apellido materno referencia 2 — LITERAL '' |
| **53** | bloque referencia 2 → @LadaTel · `int.Parse`<br>GUARDA CRUZADA: decide si nombre_completo lleva segundo nombre. data[53] es la LADA de la referencia 2, no tiene nada que ver con el nombre. (segundo uso de data[53]) | bloque referencia 2 — @LadaTel (Int) · `int.Parse` | lada referencia 2 — LITERAL '' |
| **54** | bloque referencia 2 → @NumeroTel (SqlDbType.BigInt) · `long.Parse` | bloque referencia 2 — @NumeroTel (SqlDbType.VarChar) · `.ToString()` | telefono referencia 2 — LITERAL '' |
| **55** | bloque referencia 2 → @TipoTel (parametro SqlDbType.Int con valor long) · `long.Parse` | bloque referencia 2 — @TipoTel (parametro SqlDbType.Int) · `long.Parse (long a un parametro Int)` | tipo de telefono referencia 2 — LITERAL '' |
| **56** | FLAG bloque referencia 3: `referencia = Convert.ToInt32(data[56]); if (referencia == 1)` · `Convert.ToInt32` · **sin guarda** | bloque referencia 3 — FLAG que activa el INSERT en TrWACW00041_RefSolCredWeb · `Convert.ToInt32` · **sin guarda** | bandera/contador de la referencia 3 — LITERAL '0'<br>[VARIANTE B] bandera/contador referencia 3 — LITERAL '0' · `literal` |
| **57** | bloque referencia 3 → @Parentesco · **sin guarda** | bloque referencia 3 — @Parentesco (VarChar) · **sin guarda** | parentesco referencia 3 — LITERAL '' |
| **58** | bloque referencia 3 → @Nombre · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 3 — @Nombre (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | nombre referencia 3 — LITERAL '' |
| **59** | bloque referencia 3 → @ApellidoP · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 3 — @ApellidoP (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | apellido paterno referencia 3 — LITERAL '' |
| **60** | bloque referencia 3 → @ApellidoM · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | bloque referencia 3 — @ApellidoM (VarChar) · `CredyPrestamoMethods.RemoveTildes` · **sin guarda** | apellido materno referencia 3 — LITERAL '' |
| **61** | NINGUNO. Se lee SOLO como guarda de @LadaTel del bloque 3; su valor nunca se parsea ni llega a la base. Es el unico indice 0..75 cuyo contenido se pierde entero. | bloque referencia 3 — NINGUNO. Se lee SOLO como guarda de @LadaTel; su valor no se envia a ninguna columna · `ninguna (solo comparacion != "")` | lada referencia 3 — LITERAL '' |
| **62** | bloque referencia 3 → @LadaTel  (BUG: la lada del bloque 3 recibe data[62], que es el numero de telefono, no data[61]) · `int.Parse`<br>bloque referencia 3 → @NumeroTel (SqlDbType.BigInt) — segundo uso de data[62] en el mismo bloque · `long.Parse` | bloque referencia 3 — @LadaTel (Int). Valor efectivo: int.Parse(data[62]) · `int.Parse`<br>bloque referencia 3 — SEGUNDO USO: @NumeroTel (SqlDbType.BigInt, distinto de las referencias 1 y 2) · `long.Parse` | telefono referencia 3 — LITERAL '' |
| **63** | bloque referencia 3 → @TipoTel (parametro SqlDbType.Int con valor long) · `long.Parse` | bloque referencia 3 — @TipoTel (parametro SqlDbType.Int) · `long.Parse (long a un parametro Int)` | tipo de telefono referencia 3 — LITERAL '' |
| **64** | @codigo (comentario en el codigo: "codigo que generan las fotografias para shm") · **sin guarda** | @codigo · **sin guarda** | codigo que identifica las imagenes enviadas a buro de credito — LITERAL '' en el Insert (comentario del fuente: '--codigo para las imagenes que se envian a buro de credito')<br>[VARIANTE A, op=Update] uid de las imagenes = sha1(rfc + nombreRef + apPaternoRef + apMaternoRef) · `sha1()`<br>[VARIANTE B, op=Update] uid de las imagenes = md5(rfc + nombreRef + apPaternoRef + apMaternoRef). OJO: la variante A usa sha1 para lo mismo · `md5()` |
| **65** | @ClienteMagento (SqlDbType.Int en C#; el SP lo declara VARCHAR(12) en :145) · `int.Parse` | @ClienteMagento · `int.Parse (parametro SqlDbType.Int; el SP lo declara VARCHAR(12))` | ClienteMagento — LITERAL '' (comentario del fuente: '--ClienteMagento') |
| **66** | @idMagento<br>3er argumento de CodigoPromocion (idMagento) — segundo uso de data[66], que ademas es @idMagento · **sin guarda** | @idMagento | idMagento — LITERAL '' (comentario del fuente: '--idMagento')<br>[VARIANTE B] increment_id del pedido de Magento reservado para esta solicitud · `_removeAscents (:451)` |
| **67** | @estatus (SqlDbType.VarChar en C#; el SP lo declara INT en :148) | @estatus · `ninguna (parametro SqlDbType.VarChar; el SP lo declara INT)` | estatus de la solicitud — LITERAL '7' en el Insert (comentario del fuente: '[67] Estatus')<br>[VARIANTE A, op=Update] estatus — LITERAL '8' · `literal`<br>[VARIANTE B] estatus de la solicitud — LITERAL '7' en el Insert · `literal`<br>[VARIANTE B, op=Update] estatus — LITERAL '8' · `literal` |
| **68** | @Id · `int.Parse` | @Id · `int.Parse` | Id de la solicitud ya creada — LITERAL '' en el Insert (LAN lo usa como @Id)<br>[VARIANTE A, op=Update] Id de solicitud devuelto por el Insert ($result[0], primer token de explode('/')) · `explode('/', $result)[0]`<br>[VARIANTE B, op=Update] webId (Id de solicitud) devuelto por el Insert: explode('/', $response)[0] · `explode('/')[0], guardado en sesion` |
| **69** | @CodigoRecomendador | @CodigoRecomendador | codigo del recomendador (validado antes contra codigoRecomendadoRequest; solo se guarda si el servicio no responde 'VACIO')<br>[VARIANTE B] codigo del recomendador (de la sesion) |
| **70** | @SucursalDestino · `int.Parse` | @Agente | LITERAL '' — en esta ruta LAN lo lee como @Agente<br>[VARIANTE B] sucursal DESTINO de recoleccion — derivada del pickup_location_code quitando los 4 primeros caracteres · `intval(substr($pickup_location_code, 4))` |
| **71** | @OrigenIdMagento | @Curp | CURP del cliente |
| **72** | guarda del bloque de codigo promotor<br>1er argumento de CodigoPromocion(codigo, "Elimina", idMagento) | — | [VARIANTE B] codigo promotor (DUPLICADO del indice 14; ningun metodo de LAN lo lee) |
| **73** | @LadaValidar (SqlDbType.VarChar en C# con valor int; el SP lo declara INT en :155) · `int.Parse` | — | [VARIANTE B] lada del cliente para validacion telefonica (mismo getter que el indice 28) |
| **74** | @TelefonoValidar (SqlDbType.VarChar en C# con valor long; el SP lo declara VARCHAR(10) en :156) · `long.Parse` | — | [VARIANTE B] telefono del cliente para validacion telefonica (mismo getter que el indice 29) |
| **75** | @Curp | — | [VARIANTE B] CURP del cliente — ES LA ASIGNACION QUE EXTIENDE EL ARRAY DE 75 A 76 ELEMENTOS |

### 8.2 Los defectos del contrato posicional — 43 hallados, estos son los que corrompen en silencio

#### 🔴 Lo primero, porque reencuadra todo: **la llamada es POSICIONAL, no por nombre**

El texto del comando parece nombrado:

```csharp
SqlCommand command = new SqlCommand(@"SP_CREDITO_WEB_DATOS @Id, @Op, @apellido_p, ...")
```

Pero **no usa sintaxis de asignacion** (`@param = valor`). Para T-SQL eso es una llamada **posicional**: los `@Id`, `@Op`… son variables de `sp_executesql` cuyo nombre **coincide por casualidad** con el del parametro del SP.

**Consecuencia para el port:** lo que manda es **el orden del texto**, no el nombre del `SqlParameter`. Si al portar se reordena, los datos se cruzan sin que nada falle.

Y de ahi sale otro dato: **el EXEC pasa 64 posiciones de los 66 parametros del SP**. De esas 64, **61 vienen de `SqlParameter` y 3 son literales incrustados en el texto** — las posiciones 58, 59 y 60:

| Posicion | Parametro | Que lleva |
|---|---|---|
| 58 | `@Agente` | `''` literal |
| 59 | `@RedimirMonedero` | `0` literal |
| 60 | `@ValidacionTelefono` | `NULL` literal |

**`@FechaCita` y `@HoraCita` (65 y 66) no se pasan en absoluto.**

> Corrige un matiz de lo que se venia diciendo: no es que `@Agente` "no se mande" en la variante A — **se manda**, como literal vacio. Lo que no hace es alimentarse de `data[]`.

#### 🔴 Guardas cruzadas: la condicion mira un indice y el valor sale de otro

| Donde | La guarda mira | Pero el valor sale de | Consecuencia |
|---|---|---|---|
| `Credit\Methods.cs:107` y `CredyPrestamoMethods.cs:75` | `data[26]` (la **lada**) | `data[27]` (el **numero**) | Si la lada viene vacia, el telefono particular se pierde aunque venga |
| `Credit\Methods.cs:241` y `CredyPrestamoMethods.cs:196` | `data[61]` (la **lada** de la referencia 3) | `int.Parse(data[62])` (el **numero**) | 🔴 **La lada de la referencia 3 recibe el numero de telefono.** Y `data[61]` nunca llega a la base: su valor se pierde siempre |
| `CreditMethods.cs:487` | `data[53]` (la **lada** de la referencia 2) | decide el **formato del nombre completo** | Un dato de telefono gobierna como se arma un nombre |

#### 🔴 Off-by-one en la comprobacion de longitud

`Credit\Methods.cs:130` y `CredyPrestamoMethods.cs:98`:

```csharp
(data.Length > 65 && data[66] != "") ? ... 
```

Se valida `> 65` y se indexa `[66]`. **Un array de exactamente 66 elementos pasa la guarda y lanza `IndexOutOfRangeException`.** Esta en las **dos** variantes.

#### 🔴 En el origen: ProductosMX sobrescribe el codigo postal

`ProductosMX\Model\CreditMxManagement.php`:

- `:427` → `$data[14] = ` el **codigo postal**
- `:454` → `$data[14] = ` el **codigo promotor**

Veintisiete lineas despues, el mismo indice. **`@codigo_postal VARCHAR(6)` recibe en el checkout algo que no es un codigo postal.**

#### Literales quemados donde el SP espera dato

- **Los 7 parametros de referencia del SP** (`@parentesco_ref`, `@nombre_ref`, …) **nunca reciben nada de `data[]`** en ninguna de las dos variantes: van a `""`. Las referencias reales viajan por **otra tabla**, con `INSERT` directo. Eso explica por que `@Op = 'InsertReferencia'` no tiene invocador.
- **`data[33] = ""`** — `CreditMethods.cs:470` **sobrescribe** el articulo que manda Magento antes de llamar al SP, con el comentario *"para diferenciarla de credilanas"*.
- **`@MetodoEnvio`** quemado a `""`; **`@cliente`** no viene de `data[]` sino del prospecto.

#### Indices que no llevan dato util en ninguno de los dos flujos

`data[26]` y `data[27]` — **la lada y el telefono particular llegan siempre vacios** desde los dos constructores de Magento. Y son justo los que el SP escribe en las columnas `ladaParticular` y `telefonoParticular`.

**`data[72]` se escribe en Magento** (`CreditMxManagement.php:459`) **y ningun consumidor de LAN lo lee.** Indice muerto.

#### Conversiones sin red

**~30 accesos sin ninguna guarda** en la variante A: `data[0..11]`, `[14..18]`, `[22]`, `[24]`, `[25]`, `[29..36]`, `[39]`. Varios con parse directo:

- `double.Parse(data[21])` → `@sueldo` — **y depende de la cultura del hilo**
- `int.Parse` en los flags de referencia (`Convert.ToInt32` sobre `data[40]`, `[48]`, `[56]`)
- `int.Parse(IdSolicitud)` en los tres bloques, **sin comprobar que el SP devolviera fila**

Y una inconsistencia: las guardas de `data[19]` y `data[20]` **solo cubren `null`, no cadena vacia** — al reves que todas las demas del mismo metodo.

#### Desajustes de tipo entre el C# y el SP

| Parametro | C# | SP |
|---|---|---|
| `@die` | `SqlDbType.Int` | `BIT` (`SP:132`) |
| `@fecha_nacimiento` | `SqlDbType.VarChar` | `DATE` (`SP:98`) |
| `NumeroTel` (referencias) | `VarChar` en las refs 1 y 2, **`BigInt` en la 3** | misma columna |

**Ningun `SqlParameter` declara `Size`**, asi que el recorte lo decide el SP, con anchos muy ajustados: `@nombre VARCHAR(25)`, `@apellido_p`/`@apellido_m VARCHAR(30)`, `@direccion VARCHAR(30)`, `@codigo_postal VARCHAR(6)`.

#### Y dos del lado de Magento

- **`array_map` sobre todo el array** destruye digitos y puntuacion, y **el efecto depende de en que momento se asigno cada campo**: los asignados antes del `array_map` se limpian, los de despues no. El correo (`data[7]`) se asigna **despues** justo por eso.
- **Credilana manda la delegacion dos veces**, en los indices 15 y 16 (`CredilanaManagement.php`).

#### Lo que esto significa para el port

**No se puede portar `data[]` como un contrato unico.** Hacen falta **dos** mapeos, y el discriminador es la ruta: checkout de ProductosMX contra Credilana. Cada uno con su longitud (76 y 72) y su cola distinta.

Y los defectos de arriba son **clase E**: hay que decidir uno por uno si se replican o se corrigen. Corregir la guarda cruzada de la referencia 3, por ejemplo, **hace que empiece a guardarse una lada que hoy se pierde** — eso es cambio de comportamiento observable, no un arreglo neutro.

---

## 9. 🔴 EL PLAN VIGENTE — el flujo sin SP. **Sustituye a la §3**

> [!important] **La §3 de este documento ("Las 7 unidades") esta DESFASADA y no debe seguirse.**
> Se escribio asumiendo que se seguiria llamando al stored procedure. El usuario lo corrigio el 2026-09-22: **el SP desaparece**. No se le añaden parametros, no se invoca. Su logica pasa a C#.
> **La §3 se conserva solo como historial.** Lo vigente es esta seccion. Las **§7** (lista de arranque) y **§8** (mapeo posicional de `data[]`) **siguen vigentes** y se usan tal cual.

### 9.0 El cambio de encuadre, en una linea

| | Antes (§3) | Ahora |
|---|---|---|
| El SP es… | el **destino**: se le construye un request de 66 parametros | la **especificacion**: cada regla suya se traduce |
| La cadena | `data[] → parametro del SP → columna` | `data[] → modelo tipado → regla en C# → destino` |
| `@Op` | un parametro con tres `IF` | **el nombre del metodo** |
| Los defaults | los ponia el SP | **hay que declararlos**: 21 columnas dependian de ellos |

### 9.1 🔴 Tres hechos que reducen el alcance

**1 · No hay NI UNA escritura a SAP en este flujo.** Verificado recorriendo el SP entero: las tres escrituras persistentes (`SP:223`, `:353`, `:377`/`:560`) van a tablas **sin prefijo de base**, o sea `ServicioAndroid` (`SP:1` es `USE [ServicioAndroid]`). Las cinco referencias a `ERPMAVI.IntelisisTMP` (`:178`, `:181`, `:187`, `:188`, `:198`) son **todas `SELECT`**.

**Consecuencia: salen del alcance el ciclo CSRF, el POST/PATCH a SAP y la decision D10 entera.** Este flujo solo **lee** de SAP.

**2 · El discriminador de variante ya existe: es la ruta.** El DMZ tiene dos, con dos modelos distintos:

| Ruta del DMZ | Modelo | Donde |
|---|---|---|
| `credit/CreditoWeb_SaveData_Articulos` | `DataArticulos` | `DMZ\...\CreditController.cs:169-181` |
| `credit/CreditoWeb_SaveData` | `CreditoWebSaveDataRequest` | `:332-428`, en `#region CREDILANA` |

**La regla 28 obliga a dos orquestadores separados**, cada uno nombrado como su ruta, y **prohibe** unirlos con un flag de modo.

**3 · La entrada son 56 props, no 66.** Aritmetica verificada contra el `VALUES`:

```
66 parametros
 − 2  control (@Id SP:92, @Op SP:93 — no aparecen en el VALUES)
 − 7  referencia (@parentesco_ref..@tipo_tel_ref SP:137-143 — van a otra tabla, y hoy llegan siempre vacios)
 − 1  calculado (@ValidacionTelefono SP:153 — el SP lo PISA siempre, es salida)
 = 56 de dato
```

Y `56 + ValidacionTelefono + fecha + confirmado = 59` columnas. Cuadra.

### 9.2 El alta (`Insert`) — once pasos

| # | Tipo | Que hacia el SP | Como queda | ¿Existe ya? |
|---:|---|---|---|---|
| 1 | CONTROL | `IF (@Op='Insert')` (`:172`). **`@Id` es parametro muerto** en esta rama | Desaparece: `Op` es el nombre del metodo | El contenedor si (`OrderMethods.cs:862`); se le vacia el cuerpo |
| 2 | RELLENO | `@fecha = GETDATE()` (`:170` → columna `:326`) | Se pone al armar la fila | ✏️ escribir |
| 3 | REGLA | Rama `DIMAS MX` (`:174-183`) | **Inalcanzable**: `@origen` va quemado a `"PRODUCTOS MX"` (`OrderMethods.cs:898`) | Decision **F** |
| 4 | LECTURA SAP | `@ValidacionOrigen`: `TablaStD ⋈ CteTel` (`:186-191`) | **Dos fuentes cruzadas en memoria**: `to_CteTel.ZappOrig` de BP05 + el catalogo | Las dos mitades existen |
| 5 | LECTURA SAP | `@TelefonoValidado` (`:194-202`) | **`IsValidatedAsync` ya acierta.** Le falta el `ORDER BY Fecha DESC` | `OrderMethods.cs:621-650` |
| 6 | SQL ANDROID | `@TelefonoAValidar` de la cola de SMS (`:205-208`) | Consulta directa parametrizada | ✏️ escribir — **las dos copias que hay filtran mal** |
| 7 | REGLA | El calculo de `@ValidacionTelefono` (`:210-221`) | **Funcion pura, sin I/O** | ✏️ escribir |
| 8 | RELLENO | `fecha`, `confirmado=1`, `ValidacionTelefono` | Se ponen al armar la fila | ✏️ escribir |
| 9 | RELLENO | 🔴 **21 columnas las llenaba el DEFAULT del SP** | Hay que declararlas: 20 `NULL` + `estatus = 0` | ✏️ **decision pendiente** |
| 10 | SQL ANDROID | El `INSERT` de 59 columnas (`:223-344`) | `INSERT` parametrizado con `SqlDbType` + `Size` | El **patron** si: `OrderMethods.cs:994-1006` |
| 11 | CONTROL | `SCOPE_IDENTITY()` (`:346-348`) | `; SELECT CAST(SCOPE_IDENTITY() AS INT)` en el **mismo** `SqlCommand` y la **misma** conexion, con `ExecuteScalarAsync` | La lectura cambia; el contrato de salida (`0` en fallo) se conserva |

**Una sola llamada a `GetClientMaAsync` sirve para los pasos 4, 5 y 7** — y de paso trae `Stcd1`, `Birthdt` y `ZentCalles`, que hoy van vacios.

### 9.3 Las dos trampas de traduccion

**🔴 La semantica de `NULL` en SQL contra C#.** `SP:213`:

```sql
IF (@TelefonoValidado IS NULL OR @ValidacionOrigen IS NULL OR @TelefonoValidado != @TelefonoAValidar)
```

Si `@TelefonoAValidar` es `NULL` —el cliente no tiene fila en la cola de SMS— entonces `@TelefonoValidado != NULL` es **UNKNOWN**, el `OR` entero es UNKNOWN, y **cae al `ELSE`** → `0`.

En C#, `x != null` da **`true`** y caeria a la rama contraria. **La condicion se invierte si se traduce literal.**

**🔴 El discriminador de prospecto ya no es el prefijo.** `SP:216` usa `SUBSTRING(@cliente,1,1) != 'P'`. Con numeros de BP de SAP (`1500004598`) eso **siempre da verdadero**. Se reemplaza por `to_Cte.ZtipoCliente == "Prospecto"`.

### 9.4 Los valores fijos — se mantienen igual, pero se implementan distinto

| Clase | Que es | Como queda en C# |
|---|---|---|
| **A · Literal del llamador** | `@origen = "PRODUCTOS MX"`, `@MetodoEnvio = ""` | Literal en el codigo que arma la fila |
| **B · `DEFAULT` del SP** | **64 son `= NULL`**; solo dos no lo son: `@estatus INT = 0` (`:148`) y `@SucursalDestino INT = 0` (`:150`) | **Hay que declararlos explicitamente**: sin SP no hay defaults que heredar |
| **C · Relleno del SP** | `fecha = GETDATE()`, `confirmado = 1`, `RedimirMonedero = ISNULL(...,0.00)` | Se ponen al armar la fila |
| **D · Fijos por falta de fuente** | `@rfc`, `@sexo`, `@fecha_nacimiento` van `""` **y no deberian** | **Dinamicos con fuente pendiente** — el maestro ya se consulta |
| **Dinamicos** | El resto | Salen de `data[N]` segun la tabla de **§8**, distinta por variante |

> Los 7 `*_ref` desaparecen del alta: pertenecen a la otra tabla, y hoy llegan siempre vacios en las dos variantes.

### 9.5 Los modelos, con su fuente

| Modelo | Campos | Fuente de la definicion |
|---|---|---|
| `SolicitudCreditoInsertRequest` | **56** | `SP:94-159` cruzado con `SP:285-343` (el `VALUES` prueba cuales llegan a columna) |
| `SolicitudCreditoWebRow` | **59** | `SP:224-282` (nombres) y `SP:285-343` (expresiones) |
| `ContextoValidacionTelefono` | **4**: `ValidacionOrigen`, `TelefonoValidado`, `TelefonoAValidar`, `EsProspecto` | `SP:164-166` (los tres `DECLARE`) + `SP:216`, este ultimo sustituido por `ZtipoCliente` |

**Los tres primeros campos del contexto tienen que poder valer `null` de verdad**: el calculo de `SP:210-214` distingue `NULL` de vacio y de "no coincide".

**Los anchos y tipos SQL de `SolicitudCreditoWebRow` NO tienen fuente**: no hay DDL en el share. Va como **pregunta**, no como invento.

### 9.6 Lo que sobra de la §3 — no se construye

| Lo que pedia la §3 | Por que sobra |
|---|---|
| `SolicitudCreditoWebRequest` con 66 props | Es la **firma del SP**, no el dato. Son 56 |
| `EjecutarAsync` con tres `IF` por `Op` | Sin SP, `Insert` **es** un metodo. Reconstruir el despacho es reintroducir el acoplamiento que se quita |
| La decision **C** (`@Op` desconocido → `0`) | Desaparece sola: no se puede mandar un `Op` desconocido a un metodo que no existe |
| `ConstruirDesdeParametrosActuales` con "los mismos 38 valores" | El corte 38-de-66 existia por los defaults del SP. Sin ellos, **21 columnas se quedarian sin escribir** |
| Conservar `datosArray` en la firma "por paridad" | Es **parametro muerto**: esta en la firma (`:862`) y **cero veces** en el cuerpo |
| `HasValidPhoneOriginSAPAsync` como equivalente de `@ValidacionOrigen` | **0 invocadores**, lee la vista que no trae el campo, y degrada la regla. **No se reusa: se reemplaza** |
| Consolidar las dos copias de `ObtenerNumeroTablaSmsAsync` | **Ninguna de las dos replica `SP:205-208`**: una hace `INNER JOIN` y filtra por `V.Cliente`, la otra usa `string.Format`. Consolidar dos consultas equivocadas da una equivocada |
| `EsProspecto` desde `to_Cte.Zprospecto` | Se contradice con §3.0b: `Zprospecto` llega **vacio**. El discriminador es `ZtipoCliente` |

### 9.7 El patron de escritura — cual copiar y cual no

✅ **`OrderMethods.cs:994-1006`** (`InsertCreditArticlesAsync`): parametros tipados, reutilizados en el bucle, sobre la conexion **ya abierta** que devuelve `obtenerConexionAndroidAsync()`.

❌ **`CreditMethods.cs:137`**: `string.Format` con `request.Cliente` y `request.NumeroTelefono` interpolados. **Es inyeccion SQL y no se replica.**

> ⚠️ `obtenerConexionAndroidAsync()` **devuelve la conexion YA ABIERTA** (`ConexionSQL.cs:117-120`). Un `Open()` extra revienta.

### 9.8 Lo que hace falta para empezar

**Bloquean — y son dos consultas a `ServicioAndroid` (`mavicbosandroid.grupomavi.com`):**

```sql
USE [ServicioAndroid];
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('CRED_SOLICITUD_WEB_DATOS_TEMP','TrWACW00041_RefSolCredWeb')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

EXEC sp_helptext 'dbo.fnSplit';
EXEC sp_helptext 'dbo.fnSplitV2';
```

**Decisiones, en paralelo:**

1. Las **21 columnas** del `DEFAULT`: ¿`NULL` explicito u omitir del `INSERT`?
2. **`@rfc`, `@sexo`, `@fecha_nacimiento`**: ¿se conectan al maestro que ya se consulta? (`@sexo` tiene limite: la captura trae `Xsexu = true`, desconocido)
3. **`GETDATE()` o `DateTime.Now`**: son relojes de **maquinas distintas** — el del SQL Server contra el del servidor de aplicacion
4. **La regla buena de `@TelefonoAValidar`**: la del SP (`WHERE Cliente` directo) o la de las copias del C# (solo el SMS con fila en `VTASDCodigoVerificacioneCommerce`). **Devuelven conjuntos distintos**
5. **Los nulls en `ORDER BY Fecha DESC`**: con datos reales `Zfecha` llega `null` en 4 de 6 telefonos
6. **Los defectos clase E** de §8.2: replicar o corregir, uno por uno
7. **La transaccionalidad**: el SP no abria ninguna. Sin el, son tres escrituras sueltas — solicitud, referencias, lineas. ¿Que pasa si falla la segunda?
8. El catalogo **`ORIGEN VALIDACION NUMERO CTE`** en MAVIPOS, y **que columna** suya (`VALOR1`/`VALOR2`/`USO`) lleva el nombre que se compara contra `ZappOrig`

---

## 10. Estado de la implementacion — 2026-09-22

> **Dos archivos, cero comentarios.** La primera tanda dejo 9 clases sueltas con un 50% de comentario; el usuario lo corrigio: el codigo va limpio y las reglas viven **aqui**, en los documentos. Todo lo que antes estaba anotado al lado de cada linea esta recogido en la §10.4.

### 10.1 Los archivos

| Archivo | Lineas | Que es |
|---|---:|---|
| `Methods\Credit\SolicitudCreditoWebMethods.cs` | 1236 | **Una** clase, tres metodos publicos |
| `Models\SAP\Credit\SolicitudCreditoWebModels.cs` | 352 | Los 9 tipos del flujo |

Los tres metodos publicos son las tres ramas de `@Op` del SP. En C# la rama la elige **a que metodo llamas**, no un `if` sobre una cadena:

| SP | Metodo | Escribe en |
|---|---|---|
| `@Op = 'Insert'` (SP:172-349) | `InsertAsync(SolicitudCreditoInsertRequest)` | `CRED_SOLICITUD_WEB_DATOS_TEMP` |
| `@Op = 'Update'` (SP:351-368) | `UpdateAsync(SolicitudCreditoUpdateRequest)` | la misma tabla, por `id` |
| `@Op = 'InsertReferencia'` (SP:370+) | `InsertReferenciaAsync(...)` | `TrWACW00041_RefSolCredWeb` |

Todo lo demas —`ArmarFila`, el `INSERT` de 59 columnas, la validacion de telefono, la rama DIMAS MX, el equivalente de `fnSplit`, los dos caminos de referencias— es **privado** dentro de esa clase.

Los 9 tipos de modelo: `SolicitudCreditoInsertRequest` (56), `SolicitudCreditoWebRow` (59), `SolicitudCreditoUpdateRequest` (10), `ResultadoActualizacionSolicitud` (3), `ReferenciaSolicitudCreditoRow` (17), `CampoMultiplexado` (3), `ContextoValidacionTelefono` (4), `CondicionArticuloDima` (3) y el enum `CaminoReferencia`.

### 10.2 El SP ya no se llama

`Methods\Order\OrderMethods.cs` → `CrearSolicitudCreditoAsync` **deja de invocar `SP_CREDITO_WEB_DATOS`**. Donde habia un `SqlCommand` con `CommandType.StoredProcedure` y 38 parametros, ahora hay un `SolicitudCreditoInsertRequest` con las **mismas 38 fuentes** y una llamada a `InsertAsync`. La firma del metodo no cambia, asi que el llamador (`OrderMethods.cs:714`) no se entera.

El `.sql` **no se toca nunca**: es la especificacion de la que se lee la regla, no un destino.

Dos parametros dejan de existir por construccion y uno cambia de valor:

| Parametro viejo | Que pasa ahora |
|---|---|
| `@Id = 0` | no aplica: el identity lo genera el `INSERT` |
| `@Op = 'Insert'` | no aplica: es el metodo al que se llama |
| `@ValidacionTelefono = DBNull` | lo **calcula** `InsertAsync`; el SP lo pisaba igual en SP:215-221 |
| `@fecha_nacimiento = ""` | ahora va `null`. **Ver 10.3.** |

### 10.3 Divergencia de valor: `@fecha_nacimiento` (hay mas, ver §10.7)

El codigo viejo mandaba `""` a un parametro declarado `DATE` (SP:98). SQL Server **no sabe convertir cadena vacia a `DATE`** (si a `DATETIME`, que daria 1900-01-01), asi que esa llamada terminaba en error 241 de conversion. Ahora va `null` y la columna queda `NULL`.

No es un cambio cosmetico y **necesita decision**: si lo que se quiere es lo que hacia el legado de LAN —que toma la fecha del maestro de cliente via `getClientInfo`— hay que conectarla a `Birthdt` de BP05, que ya se decodifica en `CustomerServiceMethods.cs:280-286`.

### 10.4 Las reglas que antes estaban como comentario en el codigo

Aqui es donde viven ahora. Ninguna esta en el `.cs`.

1. **`ValidacionTelefono` es logica ternaria de SQL, no booleana de C#** (SP:210-221). `@TelefonoValidado != @TelefonoAValidar` vale UNKNOWN si cualquiera de los dos es NULL; el `IF` solo entra con TRUE, asi que UNKNOWN cae al `ELSE` y da 0. Por eso `ResolverValidacionTelefono` trabaja con `bool?` y tiene `DistintoSql` / `OrSql` / `EsVerdaderoEnIf` en vez de `!=` y `||`.

2. **`""` no es `null`.** SP:164-166 declara las tres variables del contexto en NULL y SP:210-214 distingue NULL de cadena vacia. Los metodos de SAP que ya existian devuelven `""` cuando no encuentran nada, asi que `ConstruirContextoAsync` normaliza con `NuloSiVacio`. Sin eso la decision **se invierte**: con `""` el primer termino es falso, el tercero UNKNOWN, y una solicitud que debia salir con 1 sale con 0.

3. **El prospecto ya no se reconoce por el prefijo.** SP:216 usa `SUBSTRING(@cliente, 1, 1) != 'P'`. En SAP el prefijo no existe: el discriminador es `to_Cte.ZtipoCliente == "Prospecto"` (los unicos dos valores son `Nuevo` y `Prospecto`).

4. **`ORDER BY Fecha DESC` con nulos.** `Zfecha` llega `null` en 4 de cada 6 filas de `to_CteTel`. En SQL Server NULL es el valor mas bajo, asi que en `DESC` van al final; se replica ordenando primero por "tiene fecha". Entre empates el SP no tiene desempate: el `OrderBy` de LINQ es estable y conserva el orden de SAP.

5. **Un error de red no es un dato de negocio.** Las lecturas relanzan la excepcion en vez de devolver `null` o lista vacia. Si `ObtenerTelefonoAValidarAsync` se tragara un timeout, el `null` resultante daria `ValidacionTelefono = 0` por la regla 1 — una solicitud marcada como "telefono no validado" sin que nadie se entere. En el SP la excepcion aborta el procedimiento.
   **La excepcion a la excepcion:** un catalogo que responde 200 con 0 filas **si** devuelve lista vacia, porque eso tiene equivalente exacto en el legado (`TablaStD` sin filas para ese `TablaSt`) y deja `@ValidacionOrigen` en NULL.

6. **`fnSplit` no es `string.Split`.** Con cadena vacia `fnSplit` devuelve **0 filas** y `string.Split` devuelve **1**. Como SP:373 discrimina por `COUNT(item) = 1`, usar `string.Split` **invierte la rama**: el camino corto se ejecutaria donde el legado ejecuta el largo. Por eso `FnSplit` replica el `WHILE CHARINDEX` del `.sql`, incluido el descarte de los tokens vacios.

7. **DIMAS MX lanza en vez de continuar.** SP:174-183 pisa `@condicion` y `@articulo` con la fila de `MAX(IdCondicionArt)` de `CREDICCondicionArt` antes de insertar. Esa tabla es Intelisis por linked server y **no tiene fuente identificada**. Continuar con los valores del request escribiria datos distintos de los del legado, en silencio; por eso `ObtenerUltimaCondicionArticuloAsync` lanza `NotSupportedException`. El ecommerce no manda ese origen, asi que no bloquea el checkout.

8. **El request no se muta.** En T-SQL `@condicion` y `@articulo` son copias locales: SP:176-177 las pisa para el `INSERT` y el llamador no se entera. En C# el request es un objeto por referencia, asi que `InsertAsync` sustituye solo durante `ArmarFila` y restaura en un `finally`.

9. **`MAX(IdCondicionArt)` no lleva filtro** (SP:178-182): ni por articulo, ni por cliente, ni por vigencia. Coge "la ultima configuracion dada de alta", sea cual sea. Cualquier alta en esa tabla cambia en caliente el articulo y la condicion de **todas** las solicitudes DIMAS MX posteriores.

10. **`SqlParameter` sin `Size`, a proposito.** Los anchos de SP:94-159 son los del **parametro**, no los de la columna, y no tienen por que coincidir (`@apellido_m` es `VARCHAR(4000)` en la rama de referencias, SP:140). Declarar un `Size` adivinado haria que ADO.NET **truncara en silencio**; sin el, el servidor responde error 8152. **Es un cambio observable:** el legado recorta, esto revienta la llamada. Ver 10.5.

11. **Sin transaccion**, igual que el legado — decision del usuario: el proceso siempre ha funcionado asi en LAN y en Intelisis, y si falla a mitad se queda a mitad.

12. **La fecha la pone el servidor de aplicacion.** SP:170 usa `GETDATE()` (reloj del SQL Server); aqui es `DateTime.Now` — decision del usuario, porque la fecha se escribe en el momento en que la fila llega a la base.

13. **`ObtenerUltimaCondicionArticuloAsync` con catalogo vacio.** Si la tabla no tiene filas, `MAX` devuelve NULL, el `WHERE = NULL` no casa, y en T-SQL un `SELECT @var = col` **sin filas deja la variable como estaba**. La implementacion futura debe devolver los valores del request, nunca `null` ni `""`. Si la fila existe pero las columnas vienen NULL, ahi si va `null`.

### 10.5 Lo que necesita al usuario

1. 🔴 **Registrar los 2 archivos en `ServicioSap.csproj`.** Formato no-SDK, `<Compile Include>` explicito, sin glob: mientras no esten, no entran al ensamblado. `SolicitudCreditoWebMethods.cs` junto a csproj:258 y `SolicitudCreditoWebModels.cs` junto a csproj:365. **No se toca sin autorizacion.**
2. **`@fecha_nacimiento`** (10.3): ¿`null`, o se conecta a `Birthdt` de BP05?
3. **El `Size` de los `SqlParameter`** (regla 10): ¿se replica el truncado del legado o se deja reventar?
4. **Que columna del catalogo `ORIGEN VALIDACION NUMERO CTE`** lleva el nombre que se compara contra `ZappOrig`. Hoy se lee **`VALOR1`**; si en MAVIPOS queda en `VALOR2` o en `USO`, es una linea.
5. **Los 5 defectos del legado** de la §8.2: replicar o corregir, uno por uno.

### 10.6 Lo que necesita una fuente, no una decision

**`CREDICCondicionArt`** (`ERPMAVI.IntelisisTMP`, SP:178-181) sigue siendo lo unico del flujo sin origen identificado ni en SAP ni en ServicioAndroid.

### 10.7 Revision adversarial de la fusion — 48 agentes, 22 hallazgos, 14 confirmados

Cuatro angulos en paralelo (fidelidad al SP, perdidas del merge, el corte del SP parametro por parametro, y compilabilidad), cada hallazgo sometido a **dos escepticos independientes**: uno intentando refutarlo sobre el codigo y otro construyendo la entrada concreta que lo dispara. Ocho cayeron. Estos catorce no.

#### Arreglado (5)

| # | Que era | Arreglo |
|---|---|---|
| A | 🔴 **El archivo de modelos se quedo sin `using System;`**. Al fusionar se tomo la cabecera del archivo que no tenia directivas (`ReferenciaSolicitudCreditoModels.cs` solo declaraba `int?`/`string`), y los 5 `DateTime?` del resultado no resolvian: **CS0246, no compilaba** | `using System;` restituido |
| B | El mensaje de `NotSupportedException` de DIMAS MX perdio el nombre de la tabla al acortarlo. Un mensaje de excepcion es diagnostico de ejecucion, no un comentario | vuelve a citar `ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt` y sus tres columnas |
| C | `DistintoSql` comparaba con `StringComparison.Ordinal`; el `!=` de T-SQL sobre VARCHAR **ignora los espacios finales y las mayusculas**. Un telefono con relleno a la derecha daba 1 donde el SP daba 0 | `TrimEnd(' ')` + `OrdinalIgnoreCase` |
| D | El discriminador de referencias evaluaba `fnSplit` sobre el payload completo; en el SP `@apellido_m_ref` es `VARCHAR(4000)` (SP:140) y llega **ya recortado** a toda la rama, no solo al `fnSplit` de SP:374. Con un unico `~` mas alla del caracter 4000 se tomaba el camino contrario | se recorta una vez a la entrada de `InsertReferenciaAsync` |
| E | Sobrecarga `InsertarReferenciaAsync(fila)` sin ningun llamador, superviviente de la fusion | eliminada |

#### El hallazgo que cambia la conversacion sobre el `Size`

La regla 10 decia que los `SqlParameter` sin `Size` eran una decision pendiente. La revision la convierte en **algo que pasa todos los dias**, no en un caso raro:

- `@MetodoEnvio` esta declarado `VARCHAR(12)` (SP:147). La constante `METODO_ENVIO_PICKUP = "instore_pickup"` (`OrderMethods.cs:58`) son **14 caracteres**. En el legado, SQL Server los recortaba a 12 al hacer el bind del parametro y la columna guardaba `"instore_pick"`. Ahora el valor va **directo a la columna**, sin pasar por la declaracion del parametro. **Toda orden de credito con recoleccion en tienda** cae en este caso.
- `@delegacion VARCHAR(25)` y `@poblacion VARCHAR(30)` (SP:109-110) reciben **el mismo** `info.municipio` y en el legado se guardaban con **dos recortes distintos**. Cualquier municipio de mas de 25 caracteres lo dispara.
- `@tarjeta` es `VARCHAR(1)` (SP:116): un `"SI"` que el SP guardaba como `"S"` ahora viaja de 2 caracteres.

Lo que importa entender: **el truncado no lo hacia el cliente, lo hacia la declaracion del parametro del procedimiento.** Al quitar el SP de en medio esa red desaparece por completo, y el resultado depende del ancho real de la columna: si es mas estrecha, error 8152 y la solicitud se pierde; si es mas ancha, se guardan mas caracteres de los que se guardaban antes, en silencio. **Sin el DDL de `CRED_SOLICITUD_WEB_DATOS_TEMP` no se puede saber cual de los dos.**

> Matiz que la revision tambien verifico: la omision **no la introdujo la fusion** — los archivos originales ya la traian. Y en las referencias, los 8 parametros `*Aux` si estan protegidos: `ArmarFilaCaminoLargo` ya los recorta con `Truncar` y las constantes de SP:404-412. Los desprotegidos de esa rama son `@parentesco_ref`, `@nombre_ref`, `@apellido_p_ref` y `@telefono_particular_ref`.

#### Pendiente de decision (lo nuevo)

1. **Errores de infraestructura: ¿abortan o degradan?** `ObtenerOrigenesValidosAsync` lanza si `AwsBaseUrl` no esta en el `Web.config` o si el endpoint responde 500, y eso tumba el alta entera. En el legado no existia esa dependencia: el `SELECT` de SP:186 no encontraba fila, `@ValidacionOrigen` se quedaba en NULL y **la solicitud se creaba igual**, con `ValidacionTelefono = 1`. El codigo actual distingue bien los dos casos (200 con 0 filas → lista vacia → NULL; 500 → excepcion), pero el hecho es que **se introduce un punto de fallo HTTP nuevo dentro del alta de credito**.
2. **Los tres `INSERT`/`UPDATE` se tragan cualquier excepcion y devuelven 0.** El SP no tiene `TRY/CATCH`: un deadlock o un timeout suben al llamador. Aqui el 0 es indistinguible del contrato de salida de SP:168, asi que el llamador no puede saber si no se inserto o si fallo.
3. **`@LadaValidar` ya no revienta ante un valor no numerico.** Antes, `'(33'` contra el parametro `INT` de SP:155 hacia fallar el `EXEC` entero y no se insertaba nada. Ahora `int.TryParse` no comprueba el `bool` y **entra un 0**. Se da cuando `info.telefono` trae formato (`"(33) 1234-5678"`): ese camino de `OrderMethods.cs:707-711` no pasa por `ValidateOnlyNumbers`.

#### Refutados (8)

Cayeron en la refutacion, entre ellos: que `ArmarFila` perdiera columnas, que `FnSplit` divergiera de `fnSplit.sql`, que algun rename dejara llamadas huerfanas, y varias sobre visibilidad de miembros. Ninguno resistio a que un segundo agente construyera la entrada concreta.

---

## 11. Retro de la migracion con la regla de enrutamiento de fuentes — 2026-09-22

> **La regla que manda** (usuario): tabla de **ServicioAndroid** → sigue en SQL Android · tabla de **Intelisis** → su equivalente en **SIGMAVI** · tabla que **corresponde a un OData** → OData · los literales del legado se respetan (`""` sigue `""`, `null` sigue `null`) · la logica interna de **todos** los SP del flujo de credito web pasa a C#.
>
> Levantado con 24 agentes en cuatro angulos, cada afirmacion contrastada contra el codigo. 20 fichas, 4 corregidas en el contraste.

### 11.1 Veredicto en una linea

**La logica INTERNA del SP esta portada con fidelidad alta. Lo que falta es de donde salen los datos que el SP recibia**: el paso previo que LAN ejecuta antes de llamarlo.

### 11.2 Las 9 fuentes del SP y su ruta

`SP_CREDITO_WEB_DATOS.sql:1` declara `USE [ServicioAndroid]`, asi que todo objeto sin prefijo de cuatro partes es de Android. El barrido completo da **9 objetos y ningun `EXEC` a otro SP** (el unico que hubo, `SP_GeneraConsecutivoCteMavi`, se quito en 2017 segun el encabezado SP:16).

| Objeto | SP | Origen | Ruta que le toca | Estado |
|---|---|---|---|---|
| `CteTel` | :188, :198 | Intelisis | **OData** `ZAPI_BP05MA_SRV` `to_CteTel` | ✅ portado |
| `TcAAEA00030_EnvioMensajes` | :206 | Android | SQL Android | ✅ portado |
| `CRED_SOLICITUD_WEB_DATOS_TEMP` | :223, :353 | Android | SQL Android | ✅ portado |
| `TrWACW00041_RefSolCredWeb` | :377, :560 | Android | SQL Android | ✅ portado |
| `fnSplit` | :374, :453, :482 | Android (`fnSplit.sql:1`) | C# | ✅ portado |
| `#Datos`, `#DatosCampoValor`, `TEMPDB.SYS.SYSOBJECTS` | :416-:618 | tempdb | colecciones de C# | ✅ portado |
| `TablaStD` | :187 | **Intelisis** | **SIGMAVI** | ⚠️ desviado a `AI_GET_CatalogoConfiguracion` |
| `CREDICCondicionArt` | :178, :181 | **Intelisis** | **SIGMAVI** | ❌ lanza `NotSupportedException` |

**Sobre `TablaStD`:** el `JOIN` de SP:186-191 tiene dos mitades. La de `CteTel` va bien a OData; la del catalogo se mando a `AI_GET_CatalogoConfiguracion`, que lee `CONFIGURACIONCATALOGOS` — **otra tabla**, no el equivalente de `TablaStD`. Con la regla nueva le toca SIGMAVI, con la misma consulta que hace LAN en `CreditMethods.cs:1967` (`IsInTableStd`).

**Sobre `CREDICCondicionArt`:** con la regla le toca SIGMAVI, pero **nadie ha confirmado que la tabla este ahi**. El barrido de todo el share no encuentra una sola consulta a esa tabla, y no figura en el inventario de objetos a crear en SIGMAVI (`CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:519`, que lista cinco y no la incluye). Por la convencion de nombres documentada en `CHECKLIST_DEV3:317` —en SIGMAVI se conserva el nombre sin el prefijo de Intelisis, como `VTASCCondicionesCredVtaLinea` → `CondicionesCredVtaLinea`, ya consumida asi en `Methods\Credit\CreditMethods.cs:22-28`— el nombre esperado seria **`CondicionArt`**. Eso es inferencia, no cita: **hay que confirmarlo.**

### 11.3 `CrearSolicitudCreditoAsync`, bloque por bloque

#### Bloque 0 · Entrada (`OrderMethods.cs:682-714`, `ProcessCreditPaymentAsync`)

Clasifica al cliente en de-casa / nuevo / invitado (:686-690), valida existencia con `CheckClientCreditAsync` (:698) que consulta el CDS `ZB_DATOS_CLIENTE`, parte el telefono en lada+numero (:707-711) y llama al alta (:714).

**Contra LAN:** LAN hace `checkCliente` **siempre** (`CreditMethods.cs:124`); el C# se la salta cuando el cliente es nuevo, y en ese caso acaba insertando con `cliente = ""`. El partido de lada si coincide, lista `{"33","55","81"}` incluida.

**El bloque de saldo esta comentado** (:701-703). En LAN si se calcula (`:126-133`) pero **no bloquea nada**: pone `res = "insuficiente"` y sigue insertando igual, y ademas el llamador de produccion descarta el retorno (`LAN\Metodos\OrderMethods.cs:624`, `:647`). O sea que nunca tuvo efecto observable. **Ojo con "arreglarlo":** hacer que bloquee seria una regresion, no una mejora.

#### Bloque 1 · Armado del DTO (`OrderMethods.cs:850-893`) — **aqui esta el hueco**

Toma `order.infoCliente` y arma el request. **No consulta nada.** Por eso no se ven llamadas OData: este metodo es puro mapeo del payload de Magento.

LAN, antes de armar los parametros, ejecuta `getClientInfo(data[0])` (`CreditMethods.cs:137`) → `SpCREDIDatosSolicitudCreditoArt @Op='GetInfo'` contra `IntelisisTmp` (`Connection.cs:26`), un `SELECT TOP 1` de **19 columnas de `CTE`** (`SpCREDIDatosSolicitudCreditoArt.sql:53-78`). De ahi alimenta **nueve** parametros.

Lo que si coincide: `@direccion/@exterior/@interior/@codigo_postal/@delegacion/@poblacion/@estado/@colonia`. Verificado indice por indice: el `ToArray` de LAN (`OrderMethods.cs:407-414`) y el de ServicioSAP (`OrderMethods.cs:265-273`) construyen **el mismo arreglo**. Incluso esta replicado que `@delegacion` y `@poblacion` salgan los dos de `municipio`.

Lo que tambien esta bien: los 18 parametros que LAN **no** manda (`@nombre_2`, `@years_old`, `@sueldo`, `@tarjeta`, `@die`, `@Curp`, `@FechaCita`…) quedan NULL en los dos lados. **La regla de "si en legacy va null, va null" se respeta.**

#### Bloque 2 · Rama DIMAS MX (`SolicitudCreditoWebMethods.cs:27` → `:1113-1133`)

Debe traer `Condicion` y `Codigo` de la ultima fila de `CREDICCondicionArt` (SP:174-183). Hoy lanza.

**Y ademas no se puede alcanzar, y eso es correcto.** El C# fija `Origen = "PRODUCTOS MX"` en duro. LAN lo escribe con un default —`order.infoCliente.ContainsKey("origen") ? order.infoCliente["origen"] : "PRODUCTOS MX"` (`LAN\Metodos\OrderMethods.cs:646`)— pero **Magento nunca manda esa clave**: la cadena `"origen"` no aparece en ningun payload real (`Resources\magento_payloads.md`, 0 coincidencias).

> **Cerrado por el usuario el 2026-09-23:** *"magento no manda origen, ese valor viene fijo al momento en que se ejecutaba el SP, entonces seria tomar el mismo valor que legacy... debemos replicar esos valores fijos que ya tenian legacy"*. Es uno de los literales del legado que se conservan, como `@articulo = ""`. **No se añade la propiedad al modelo y no se cambia nada.** Consecuencia directa: la rama DIMAS MX es inalcanzable desde este flujo por diseño, no por accidente.

#### Bloque 3 · Recalculo de `@ValidacionTelefono` — el mejor portado, y donde **si** hay OData

`ConstruirContextoAsync` (`:906`) llama `GetClientMaAsync` → `ZAPI_BP05MA_SRV/BusinessPartnerSet` con `$expand` (`BusinessPartnerMethods.cs:301-302`), y de ahi:

| Variable del SP | Legado | Nuevo |
|---|---|---|
| `@ValidacionOrigen` (SP:186-191) | `TablaStD` ⋈ `CteTel` | `to_CteTel` (`Zvaltel`, `ZappOrig`) × catalogo |
| `@TelefonoValidado` (SP:194-202) | `CteTel`, `Tipo='Movil'`, `ORDER BY Fecha DESC` | `to_CteTel`, `ZtipoCte='MOVIL'`, `Zfecha desc` |
| `@TelefonoAValidar` (SP:205-208) | `TcAAEA00030_EnvioMensajes` | igual, SQL Android |

El `IF` de SP:210-215 esta replicado con semantica de tres valores. La unica desviacion deliberada: el SP decide prospecto con `SUBSTRING(@cliente,1,1) != 'P'` y el C# con `to_Cte.ZtipoCliente == 'Prospecto'` — decision del usuario.

> Dato util: el `@ValidacionTelefono` que LAN calcula antes de llamar (`CreditMethods.cs:185`, con `isValidated` e `IsInTableStd`) es **irrelevante**, porque el SP lo pisa incondicionalmente. Por eso `HasValidPhoneOriginSAPAsync` (`OrderMethods.cs:658`) no tenga llamadores **es correcto**, no un olvido.

#### Bloque 4 · El INSERT (`SolicitudCreditoWebMethods.cs:51-354`)

Replica columna por columna el `INSERT` de SP:223-345 contra Android y devuelve el `SCOPE_IDENTITY`. Las 59 columnas en el mismo orden, los literales del SP respetados: `confirmado = 1`, `ISNULL(@RedimirMonedero, 0.00)`, `@estatus` y `@SucursalDestino` por defecto 0. `Nulo()` manda `DBNull` cuando el valor es null. **Esta parte esta bien.**

### 11.4 Las 12 columnas que hoy entran vacias

| Parametro | LAN | ServicioSAP hoy | Equivalente SAP (con captura real) |
|---|---|---|---|
| `@apellido_p` | `datosCliente[1]` maestro | `info.apellidoPaternoClienteMavi` pedido | cabecera `NameLast` — "MEDINA" |
| `@apellido_m` | `datosCliente[2]` maestro | `info.apellidoMaternoClienteMavi` pedido | cabecera `NameLst2` — "HERRERA" |
| `@nombre` | `datosCliente[3]` maestro | `info.nombreClienteMavi` pedido | cabecera `NameFirst` — "ELIZABETH" |
| `@fecha_nacimiento` | `datosCliente[4]`, `yyyy-MM-dd` | **`null`** | cabecera `Birthdt` — `/Date(11491200000)/` |
| `@rfc` | `datosCliente[5]` | **`""`** | `to_CteCliente.Stcd1` — "MEHE700514CP7" |
| `@sexo` | `datosCliente[6]` | **`""`** | cabecera `Gender` / `Xsexm`-`Xsexf`-`Xsexu` |
| `@estado_civil` | `datosCliente[16]` | **`""`** | ⚠️ sin captura: candidato `Marst` |
| `@entre_calles` | payload, si no `datosCliente[10]` | **`""`** | `to_Cte.ZentCalles` — "MINA" |
| `@cliente` | `datosCliente[0]` maestro | `info.cuenta` | `Partner` / `to_Cte.ZclienteBp` |
| `@lada_particular` | lada partida | **`0`** | calculo en C# |
| `@telefono_particular` | numero partido | **`"0"`** | calculo en C# |
| `@lada_celular` | lada partida | **`0`** | calculo en C# |

> **Estos `""` no son literales del legado.** LAN no manda vacio en ninguno de los nueve: el unico `""` literal de esa lista es `@articulo` (`CreditMethods.cs:170`). Bajo la regla "si en legacy va `''` dejalo asi" **no califican**: son perdida de dato.

**Y la llamada OData ya esta dentro del flujo, desaprovechada.** `SolicitudCreditoWebMethods.cs:910` hace `GetClientMaAsync(cliente)` con `$expand` de **todas** las colecciones, y del objeto completo solo consume `To_CteTel` y `To_Cte.ZtipoCliente`. `NameLast`, `NameFirst`, `NameLst2`, `Birthdt`, `Gender`, `to_CteCliente.Stcd1` y `to_Cte.ZentCalles` **llegan en esa misma respuesta y se tiran**. No hace falta una llamada nueva: hace falta propagar el `BusinessPartnerMa`.

### 11.5 Los SP hermanos del flujo

| SP / helper | Estado |
|---|---|
| `SpCREDIDatosSolicitudCreditoArt @Op='GetInfo'` | ❌ **sin portar** — el hueco central |
| `SpCREDIDatosSolicitudCreditoArt @Op='GetSaldo'` | ❌ sin portar; `CheckClientBalanceAsync` solo lee `Zcrmimporte` sin restar. Falta el tramo Venta/VentaD; el CXC ya tiene fuente lista sin usar (`GetDocumentosNoCompensadosAsync`, EX01) |
| `SpCREDIDatosSolicitudCreditoArt @Op='CheckCliente'` | ⚠️ portado a `CheckClientCreditAsync`, **cambiando el contrato**: LAN devolvia "sin cuenta" con 200, el port lanza |
| `IsInTableStd` | ✅ portado (`HasValidPhoneOriginSAPAsync`) y sin llamadores — correcto, es codigo muerto tambien en LAN |
| `SpVTASInsertArtSolCreditoLinea` | ⚠️ a medias: falta la sustitucion de SKU por region para familia TELEFONIA (el `codigoPostal` llega y no se usa), falta `spVerCosto` (se escribe `costo = 0`) y falta el `DescuentoCategoria` con `CEILING` |
| `SpVTASVentaCupon` | ⚠️ portado a SIGMAVI contra `VentasCupones` en vez de `VTASCVentaCupon`, equivalencia sin confirmar |
| Liberador de credito (HTTP, no SP) | ❌ comentado entero (`OrderMethods.cs:755-787`) y con la condicion de disparo invertida |

Fuera de alcance de este flujo: `SpCREDISolicitudWebPrimerGuardado`, `SPVTASCodigoSeguridadeCommerce` y `SpCREDICodigoRecomendador` pertenecen a otros metodos de LAN.

### 11.6 Dos defectos que salen del mismo hilo

1. **`@cliente` esta declarado `VarChar(9)`** (`SolicitudCreditoWebMethods.cs:884`), heredado de SP:130 — pero el `Partner` de SAP tiene **10 digitos**. Trunca, y el `WHERE` contra `TcAAEA00030_EnvioMensajes` **nunca casa**.
2. **Cliente nuevo → `GetClientMaAsync("")`**. En la rama de `OrderMethods.cs:689` (`info.cuenta` vacia) se llega a la llamada sin guarda, SAP lanza, lo traga el `catch` y la primera compra muere con "No se pudo generar la solicitud de credito".

### 11.7 Orden de trabajo propuesto

1. Propagar el `BusinessPartnerMa` que ya se trae y llenar los 9 campos de maestro; partir lada/numero para las 4 columnas de telefono.
2. Quitar el hardcode de `Origen` y añadir `origen` a `InfoClienteRequest`, con default `"PRODUCTOS MX"`.
3. `TablaStD` → SIGMAVI, con la consulta de `IsInTableStd`.
4. `CREDICCondicionArt` → SIGMAVI **en cuanto se confirme el nombre de la tabla**.
5. Los dos defectos de 11.6.
6. `@Op='GetSaldo'` y los huecos de `SpVTASInsertArtSolCreditoLinea`, que son otro frente.

---

## 12. Paridad de datos con LAN — 2026-09-22

### 12.1 El `.csproj` (autorizado por el usuario)

Dos lineas, y con eso el proyecto vuelve a compilar:

```
csproj:259  <Compile Include="Methods\Credit\SolicitudCreditoWebMethods.cs" />
csproj:374  <Compile Include="Models\SAP\Credit\SolicitudCreditoWebModels.cs" />
```

> El build estaba **roto** desde el corte del SP: `OrderMethods.cs` si esta registrado (csproj:271) y referenciaba dos tipos que no entraban al ensamblado. Eran dos `CS0246`.

### 12.2 Que llegaba y que no

Contrastado contra los payloads reales de credito `CRED515773` y `CRED515848` (`Resources\magento_payloads.md`). `infoCliente` trae: `nombre, cliente, codigo_promotor, cuenta, OrigenIdMagento, telefono, direccion, codigoPostal, municipio, estado, pais, correo, colonia, referencia, numExt, numInt, nombreClienteMavi, apellidoPaternoClienteMavi, apellidoMaternoClienteMavi, telefonoClienteMavi, entreCalles, razonSocial, idCarrito`.

**No trae `rfc`, `sexo`, fecha de nacimiento, estado civil ni `origen`.** `InfoClienteRequest` declara `rfc` (:71) y `sexo` (:73) porque es el mismo modelo del alta de BP, pero en el payload de credito llegan nulos. Por eso LAN iba al maestro: **la orden nunca los tuvo.**

### 12.3 Lo que se cablea

| Columna | De donde sale ahora | Regla de LAN replicada |
|---|---|---|
| `@entre_calles` | `info.entreCalles`, y si viene vacia `to_Cte.ZentCalles` | `entreCalles.Length > 0 ? entreCalles : datosCliente[10]` |
| `@lada_particular`, `@telefono_particular`, `@lada_celular`, `@telefono_celular` | `info.telefono` partido con la regla `{33,55,81}` | los cuatro reciben lada y numero, como en `CreditMethods.cs:179-182` |
| `@apellido_p` | `NameLast` del BP | LAN usa el maestro, no lo que tecleo el comprador |
| `@apellido_m` | `NameLst2` del BP | idem |
| `@nombre` | `NameFirst` del BP | idem |
| `@fecha_nacimiento` | `Birthdt` del BP, decodificado de `/Date(ms)/` | `datosCliente[4]` |
| `@rfc` | `to_CteCliente.Stcd1` | `datosCliente[5]` |
| `@cliente` | `Partner` del BP | `datosCliente[0]`, no el parametro de entrada |

Los del maestro caen al valor del pedido si el BP no trae nada (`PreferirMaestro`), porque en la rama de cliente nuevo no hay BP que leer.

**Sin tocar, por falta de fuente confirmada:**

- `@sexo` — BP05 trae `Gender` (`"9"`) y `Xsexm`/`Xsexf`/`Xsexu`, pero **no se conoce el dominio** de la columna destino. `MapGender` (`OrderMethods.cs:3015`) solo cubre Magento → SAP; el inverso no esta definido. Escribir un valor adivinado seria peor que dejarlo vacio.
- `@estado_civil` — el candidato es `Marst`, que **no aparece en ninguna captura real**; `to_CteContacto.ZedoCivil` es del contacto y llega vacio.

### 12.4 Una sola lectura del maestro

`InsertAsync` llama a `ObtenerMaestroAsync` una vez y el mismo `BusinessPartnerMa` alimenta el contexto de validacion telefonica **y** la fila. No hay peticion nueva: antes se pedia el BP con `$expand` de todas las colecciones y se tiraba todo salvo los telefonos.

De paso desaparece el truco de guardar y restaurar `req.Condicion`/`req.Articulo`: `ArmarFila` recibe el `CondicionArticuloDima` y lee de ahi, asi que el request del llamador ya no se toca en ningun momento.

### 12.5 Los dos defectos

1. **`@cliente` ya no lleva `Size` 9.** El `VARCHAR(9)` venia de SP:130, pero el `Partner` de SAP tiene 10 digitos: truncaba y el `WHERE` contra `TcAAEA00030_EnvioMensajes` no casaba nunca.
2. **`ObtenerMaestroAsync` devuelve `null` si el cliente viene vacio**, sin llamar a SAP. Antes se llegaba a `GetClientMaAsync("")` en la rama de cliente nuevo, SAP lanzaba, el `catch` lo tragaba y la primera compra moria con "No se pudo generar la solicitud de credito".

### 12.6 Lo que sigue abierto

| Tema | Estado |
|---|---|
| `@sexo` y `@estado_civil` | falta dominio y captura |
| `CREDICCondicionArt` | **deprecada** (dato del usuario: un solo registro). No va a SIGMAVI. Falta saber que valores tiene ese registro en `Condicion` y `Codigo` para quitar el `throw` |
| Catalogo `ORIGEN VALIDACION NUMERO CTE` | sin dar de alta; y con la regla nueva le toca **SIGMAVI**, no `AI_GET_CatalogoConfiguracion` |
| `SqlParameter` sin `Size` | decision pendiente (§10.7): el legado truncaba en el bind del SP |
| `@Op='GetSaldo'` | sin portar; en LAN tampoco bloqueaba |
| `SpVTASInsertArtSolCreditoLinea` | `costo = 0`, sin SKU por region para TELEFONIA, sin `DescuentoCategoria` |
| Liberador de credito | comentado y con la condicion invertida |

---

## 13. Diseño de los SP internos — un metodo por rama — 2026-09-22

> 14 piezas diseñadas en paralelo, cada una con un esceptico que intento tumbarla abriendo los archivos. **Ninguna sobrevivio como "lista para implementar" tal cual se diseño.** Una queda lista con una correccion de una linea; el resto espera datos.

### 13.1 El hallazgo estructural: 4 de las 7 ramas no las llama nadie

`SpCREDIDatosSolicitudCreditoArt` tiene 7 ramas `@Op`. Busqueda en los tres arboles de codigo (LAN, DMZ, ServicioSAP):

| Rama | SP | Invocadores | Que hacer |
|---|---|---|---|
| `CheckCliente` | :37-51 | `CreditMethods.cs:725` | **portar** |
| `GetInfo` | :53-78 | `CreditMethods.cs:804` | **portar** |
| `GetSaldo` | :80-124 | `CreditMethods.cs:766` | **portar** |
| `GetCuenta` | :125-225 | **cero** | decision del usuario |
| `UpdateInfo` | :226-298 | **cero** | decision del usuario |
| `getClienteMagento` | :299-311 | **cero** | decision del usuario |
| `GetInfoCredito` | :312-326 | **cero** | decision del usuario |

La rama mas larga del SP (`GetCuenta`, 100 lineas) y la que mas fuentes nuevas necesitaria (`UpdateInfo`, 6 bloqueantes) son **las dos que nadie ejecuta**.

### 13.2 Estado pieza por pieza

| Pieza | Metodo propuesto | Fuente | Estado |
|---|---|---|---|
| `CheckCliente` | `Task<bool> CheckClienteAsync(string)` | OData BP | ✅ **lista con 1 correccion** |
| `GetInfo` | enriquecimiento desde BP05 | OData BP05 | 🟡 7 de 9 campos ya resueltos; faltan `Sexo` y `EstadoCivil` |
| `GetSaldo` | `Task<decimal> ObtenerSaldoDisponibleAsync(string)` | mixta | 🔴 sin fuente para media formula |
| `GetCuenta` | — | mixta | 🔴 5 bloqueantes · rama muerta |
| `UpdateInfo` | — | mixta | 🔴 6 bloqueantes · rama muerta |
| `getClienteMagento` | — | OData | 🔴 3 bloqueantes · rama muerta |
| `GetInfoCredito` | — | — | 🔴 columnas sin alias · rama muerta |
| SKU por region | sustitucion TELEFONIA | SIGMAVI + OData | 🔴 3 bloqueantes |
| `spVerCosto` | `Task<CostoArticuloResult> VerCostoAsync(...)` | OData articulos | 🔴 5 bloqueantes |
| `DescuentoCategoria` | calculo con `CEILING` | OData SD29 | 🔴 1 campo sin localizar |
| Catalogo origen → SIGMAVI | `Task<string> ObtenerValidacionOrigenAsync(string)` | SIGMAVI | 🔴 ¿existe `tablastd` en SIGMAVI? |
| DIMAS MX | quitar el `throw` | — | 🔴 faltan 2 valores |
| `@sexo` / `@estado_civil` | `ResolverDemograficosLegado(...)` | BP05 | 🔴 sin dominio |
| Liberador de credito | HTTP | — | 🔴 4 bloqueantes externos |

### 13.3 Los tres fallos de diseño que el esceptico si tumbo

**1 · `CheckCliente` devolveria `false` SIEMPRE.** El diseño proponia `return partner != null && !string.IsNullOrEmpty(partner.BusinessPartner);`. `System.Text.Json` es **case-sensitive** por defecto, `GetClientAsync` deserializa **sin** `JsonSerializerOptions` (`BusinessPartnerMethods.cs:53,55`) y `Partner.cs` no tiene **ni un solo** `JsonPropertyName` en sus 274 lineas. Si el campo no liga, el metodo responde "no existe" para todo el mundo.

> **Este bug ya ocurrio en esta misma vista**: `OrderMethods.cs:609-616` documenta, contra respuesta real, que `Partner.zvalTel` se quedaba en el default de C# y que `IsValidatedAsync` devolvia `""` pasara lo que pasara.

Correccion: `GetClientAsync` ya lanza cuando no hay filas (`BusinessPartnerMethods.cs:56-59`), asi que **la llegada de una fila ES el `COUNT(...) > 0`**. Basta `return partner != null;` dentro del `try`.

**2 · `to_CteContacto` no es el cliente: son TERCEROS.** El diseño de demograficos daba prioridad a `to_CteContacto.ZedoCivil` sobre la cabecera `Marst`. Pero esa coleccion tiene `Zparentesco` (`BusinessEntitiesMa.cs:192`), `ZviveCon` (:194) y `ZcteSupervisado` (:197): es el aval o la referencia, con su propio nombre y su propia fecha de nacimiento. **Escribiria el estado civil de un familiar en la solicitud de credito del titular.** En el legado, `CTE.EstadoCivil` es del cliente (`SpCREDIDatosSolicitudCreditoArt.sql:72-76`). Unica fuente defendible: `Marst`, la cabecera del BP — y no hay ninguna captura que la muestre con valor.

**3 · Citas de evidencia que no existian.** El diseño del catalogo sostenia que `AI_GET_CatalogoConfiguracion` lee `CONFIGURACIONCATALOGOS` citando `CAPTURAS_REALES_APIS.md:112`; esa cadena **no aparece ni una vez** en ese archivo. La conclusion sigue en pie por otra via, pero la cita era falsa.

### 13.4 Lo que hace falta, agrupado por quien lo contesta

#### A · Cinco consultas a SIGMAVI (desbloquean 3 piezas)

```sql
SELECT TOP 1 * FROM tablastd;
SELECT TOP 1 * FROM ctetel;
SELECT TOP 1 * FROM CondicionArt;
SELECT TOP 1 * FROM RegionSku;
SELECT TOP 1 * FROM CodigoPostalRegionCelular;
```

Solo hace falta saber **si existen y con que nombre**. La convencion documentada (`CHECKLIST_DEV3:317`) dice que en SIGMAVI se conserva el nombre sin el prefijo de Intelisis.

#### B · Un `SELECT` a la tabla deprecada (desbloquea DIMAS MX)

```sql
SELECT Condicion, Codigo FROM ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt;
```

Con esos dos valores se quita el `throw`. El SP los escribe **tal cual** en las columnas `condicion` y `articulo`.

#### C · Dos dominios del legado (desbloquean `@sexo` y `@estado_civil`)

```sql
SELECT DISTINCT Sexo FROM CTE;
SELECT DISTINCT EstadoCivil FROM CTE;
```

Son los literales que hay que poder escribir desde SAP. Sin ellos no se puede construir el inverso: `MapGender` (`OrderMethods.cs:3015`) solo va de Magento a SAP.

#### D · Tres capturas reales de OData

1. `GET .../ZAPI_ARTICULOS_SRV/Articulos?$filter=ARTICULO eq '<sku de credito>'` — para confirmar `COSTOPROMEDIOPCP`, su formato y su moneda. Hoy se escribe `costo = 0`.
2. `GET .../ZAPI_PROPRELIST_SRV/PropreListSet?$filter=Articulo eq '<sku>'` — para localizar `DescuentoCategoria`. Si aparece, el calculo se cierra sin tocar SIGMAVI.
3. Una cabecera BP05 de un cliente **con estado civil conocido**, para ver `Marst` con valor.

#### E · Cuatro decisiones

1. Las **4 ramas muertas**: ¿se portan por completitud o se cierran como deprecadas?
2. **`GetSaldo`**: la formula tiene dos patas. La de CXC ya tiene fuente (EX01, `GetDocumentosNoCompensadosAsync`). La de **pedidos pendientes** (`Mov = 'Analisis Credito'` o `'Pedido'`, aun sin facturar, SP:86-99) **no tiene servicio OData en todo el proyecto**. ¿De donde sale, o ya esta incluida en EX01?
3. **`ZlimCred` contra `Zcrmcantidad`**: quedo fijado `ZlimCred`, pero `CAPTURAS:42` apunta a `Zcrmcantidad` como equivalente de `CRMCantidad` (SP:110) y en el mismo cliente real valen cosas muy distintas. ¿Se ratifica `ZlimCred`?
4. **Liberador de credito**: el `Web.config:41-43` apunta a `http://172.16.215.51:3026`, el host de LAN, y ese servicio escribe en la tabla `Venta` de Intelisis. ¿Sobrevive a la salida de Intelisis?

### 13.5 Que se puede escribir ya

- **`CheckClienteAsync`**, con `return partner != null;`.
- **El enriquecimiento de `GetInfo`**, que ya esta hecho para 7 de sus 9 posiciones (§12.3); quedan `Sexo` y `EstadoCivil` esperando el punto C.

Todo lo demas espera un dato.

---

## 14. El listado BP05-01..25 del usuario contra lo que necesita el SP — 2026-09-23

> Fuente: `MappingMetods\Servicios SAP y Middleware (Unificado).json`, carpeta **`🌟 SAP Directo (OData S4) / BP05 Exposicion de datos`**. 25 peticiones nombradas `BP05-01`..`BP05-25`, **cada una etiquetada por el usuario con la parte del SP a la que corresponde**, mas 3 marcadas `[FUERA DE TU LISTA - hallado en el codigo]`. Host declarado: `https://businesspartner-api.mavi.fun/`. Los responses reales estan en `CAPTURAS_REALES_APIS.md`.

### 14.1 El mapeo

| Necesidad del SP | Endpoint del listado | ¿Response real? | Que hace el C# hoy |
|---|---|---|---|
| `CteTel WHERE Cliente` (SP:188, :198) | **BP05-01** `AI_GET_ZSDT_CTETEL?Partner=`<br>**BP05-02** `AS_GET_ZQBP_EditarCliente_CteTel` | ✅ los dos, **identicos byte a byte**, 14 campos con `ZappOrig` | ✅ **cambiado a `CteTelSet`** |
| `@TelefonoValidado` (SP:194-202) | **BP05-06** `A_GET_TelefonoValidado?sCliente=` | ✅ y **lo desmiente** | reimplementado en C# |
| `@ValidacionTelefono` (SP:210-221) | **BP05-07** `A_POST_ValidarTelefono` | — | calculado en C#, como el SP |
| `TcAAEA00030_EnvioMensajes` (SP:206) | **BP05-09** `A_POST_EnviarSMS`<br>**BP05-10** `A_POST_SMSEnviar` | — | SQL Android directo |
| Datos personales del cliente | **BP05-13/14/15/16** | — | lectura por BP05MA |
| `die` / `condicion` / `codigo` | **BP05-24** `AS_GET_ZB_DATOS_CLIENTE`<br>**BP05-25** `AS_GET_TipoCredito` | ✅ 21 filas de `ZTIPO_CTE` | `CheckClientCreditAsync` usa BP05-24 |
| Tarjeta y creditos | **BP05-21/22/23** | ✅ 45 filas de `ZCTE_CREDITO` | no se usa (decision del usuario) |
| Sueldo | **BP05-19** | — | no se usa |
| **`TablaStD`** (SP:187) | 🔴 **NO HAY** | — | `AI_GET_CatalogoConfiguracion` |
| **`CREDICCondicionArt`** (SP:178) | 🔴 **NO HAY** | — | lanza |

### 14.2 Los tres hallazgos del listado

**1 · Dos de las nueve fuentes del SP no tienen endpoint en tu lista.** Los 25 cubren `CteTel`, validacion telefonica, SMS, datos personales, catalogos de credito y sueldo. **No cubren los dos catalogos de Intelisis** que el SP lee: `TablaStD` (SP:187) y `CREDICCondicionArt` (SP:178). Por eso siguen sin fuente confirmada: no es que se me pasaran, es que **no estan**.

**2 · `BP05-06` queda desmentido por su propia captura.** `A_GET_TelefonoValidado?sCliente=1500008218` devolvio:

```json
[ { "ZtelCte": "3352323422", "ZvalTel": false } ]
```

Tres problemas: devuelve un telefono **no validado** (`false`); renombra el campo `Zvaltel` → `ZvalTel` (SAP usa `Zvaltel` en los dos servicios); y con esos mismos datos **el SP devolveria vacio**, porque su `WHERE` exige `Tipo='Movil' AND ValidacionTel=1` y ninguna de las dos filas lo cumple. No sirve como equivalencia de `@TelefonoValidado`: se reimplementa en C#, que es lo que ya se hizo.

**3 · `BP05-01` y `BP05-02` son la equivalencia buena de `CteTel`, y su descripcion lo dice.** La del `BP05-02`: *"Es la implementacion real del `SELECT ... FROM CteTel WHERE Cliente = @cliente`: el `@cliente` es el parametro `Partner` traducido a `Partner eq '...'` sobre `CteTelSet`"*. Sus propios parametros traen el filtro pensado: `$filter=Partner eq '1500008218' and Zvaltel eq true`, y su captura trae `ZappOrig` poblado, que es el campo del cruce con `TablaStD`. **El VALOR de esa captura, `CteXpressFrontSAP`, es de un registro de PISO y no sirve como referencia para ecommerce** (ver la nota de abajo).

### 14.3 El cambio hecho

Los telefonos se leen ahora por **`ZQBP_EDITARCLIENTE_SRV/CteTelSet`** con `$filter=Partner eq '...'`, el contrato de `BP05-02`, en vez de por la coleccion `to_CteTel` del BP05MA.

- **Transporte S/4 directo**, no el middleware: la URL sale de `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` y el cliente de `TokenGenerator.CreateClientS4()`, igual que el resto del servicio. De `businesspartner-api` se toma **el contrato**, no la implementacion.
- **Sin modelo nuevo de fila**: `BusinessPhone` (`BusinessEntitiesMa.cs:5`) ya declara exactamente los 14 campos de la captura. Solo se añadio el envoltorio `CteTelSetResponse` para el `{"d":{"results":[...]}}` de OData v2.
- **El `$filter` va escapado** (`'` → `''`): el endpoint original acepta `$filter` crudo del cliente, que es inyeccion OData (§7.7 defecto 3). Eso no se porta.
- **Guarda de transicion**: si `CteTelSet` responde 200 con 0 filas y el BP05MA si trae telefonos, se usan los del BP05MA. Un error HTTP **si** se relanza. Esta guarda debe quitarse en cuanto el entorno confirme `CteTelSet`.

### 14.4 Sobre los puertos de las capturas: no hay riesgo

Las capturas registran BP05MA en `10.30.2.135:44300` y `ZQBP_EDITARCLIENTE_SRV` en `10.30.2.135:20400`. **Eso NO significa que sean dos endpoints de SAP en puertos distintos.**

> **Aclarado por el usuario el 2026-09-23:** *"el puerto cambia por que son proyectos distintos... ese de 20400 es del proyecto de PY, y recuerda que es meramente informativo"*.

El 20400 es desde donde apuntaba **businesspartner-dev** (Python), que es material de referencia y nada mas. `ZQBP_EDITARCLIENTE_SRV` es un servicio OData de S/4 como cualquier otro y lo sirve lo que devuelva `Conexion.Data.obtenerUrl(...)`. **No hace falta ninguna llamada de comprobacion y no hay que tocar nada.**

Corolario para no repetirlo: **un puerto que aparece en una captura o en el repo de PY nunca es un dato de arquitectura de ServicioSAP.** Lo unico que manda es `obtenerUrl`.

Por lo mismo se retiro la guarda de transicion que caia al `to_CteTel` del BP05MA cuando `CteTelSet` devolvia 0 filas: existia solo por este miedo infundado, y sin el solo aportaba una via silenciosa de tomar los telefonos de otra fuente.

### 14.5 Dos datos de tus capturas que contradicen decisiones ya tomadas

**`ZlimCred` contra `Zcrmcantidad`.** `CAPTURAS_REALES_APIS.md:42` es explicito: *"El SP `GetSaldo` lee `CRMCantidad` → `Zcrmcantidad`"*, y en el mismo cliente real `Zcrmcantidad = "12345678.20"` y `ZlimCred = "60000.000"`. La decision vigente fijo `ZlimCred`. **Uno de los dos esta mal** y afecta al calculo del saldo.

**Las referencias personales.** `AS_GET_TipoCredito` (BP05-25) devuelve 21 filas, y los candidatos de ecommerce —**09 Credito Internet** y **16 Credito Internet 2**— traen las **cuatro banderas de referencias en `0`** (`ZREF_PERS1`, `ZDOM_REF1`, `ZREF_PERS2`, `ZDOM_REF2`). El catalogo dice que a ese tipo de credito **no se le piden referencias personales**. Si eso es asi, toda la rama `@Op = 'InsertReferencia'` —las 844 lineas que se portaron, los dos caminos, el `fnSplit`— **no se ejecuta para ecommerce**. Vale la pena confirmarlo antes de invertir mas ahi.

---

## 15. El bloque de validacion telefonica, resuelto — 2026-09-23

> Decisiones del usuario. **Corrigen y sustituyen** lo que decian la §11.2, la §13.4-A y la §14.1 sobre `TablaStD`.

### 15.1 `@TelefonoValidado` lo resuelve la API, no el C#

`A_GET_TelefonoValidado?sCliente=<cliente>` (BP05-06) **ya hace por dentro** el `Tipo = 'Movil'` y el `ValidacionTel = 1` del SP. Devuelve el movil del cliente y si esta validado:

```json
[ { "ZtelCte": "3352323422", "ZvalTel": false } ]
```

Con los dos telefonos de ese BP —uno `PARTICULAR` y otro `MOVIL`— **devolvio el MOVIL**. No estaba roto: su contrato es otro.

La regla queda: `@TelefonoValidado = ZvalTel ? ZtelCte : null`.

Desaparecen del C# el filtro por tipo, el `ValidacionTel = 1` y el `ORDER BY Fecha DESC` con su problema de nulos (`Zfecha` llega null en 4 de 6 filas). Se borraron `ResolverTelefonoValidado` y la constante `TipoTelefonoMovil`.

> **Detalle que no es cosmetico:** este endpoint **renombra** `Zvaltel` → `ZvalTel`. El DTO lleva `[JsonPropertyName]` explicito en los dos campos, porque `System.Text.Json` es case-sensitive y sin el atributo el `bool` se quedaria en `false` siempre — el mismo defecto que la revision encontro en `Partner.zvalTel`.

### 15.2 `TablaStD` es el catalogo configurable de AWS

Queda cerrado por el usuario. **No va a SIGMAVI**: es el configurable de AWS, que es justo lo que el codigo ya consulta (`ObtenerOrigenesValidosAsync` contra `AwsBaseUrl` + `AI_GET_CatalogoConfiguracion`).

Lo que sigue pendiente de ese catalogo son tres cosas, y una de ellas es anterior a las otras:

1. 🔴 **Definir que valor de `ZappOrig` escribira ecommerce.** Sigue **sin definir**.
2. Dar de alta el catalogo con el nombre `ORIGEN VALIDACION NUMERO CTE` y ese valor dentro.
3. Confirmar en que columna del catalogo va (hoy se lee `VALOR1`).

> 🔴 **`CteXpressFrontSAP` NO es ese valor.** Aclarado por el usuario el 2026-09-23: *"ese valor comprende que viene desde un registro de piso, eso no es lo que vendra en SAP, ese valor todavia esta pendiente de definir"*. Las capturas de BP que hay en el share son de **clientes dados de alta en piso**; sus valores —el `ZappOrig`, el `Vkorg`, los nombres de los registros— **no son los que producira ecommerce**. Sirven para conocer la FORMA de la respuesta (que campos existen, de que tipo, con que casing), nunca para tomar el DATO.

**Para el codigo no cambia nada:** `ResolverValidacionOrigen` compara `ZappOrig` contra lo que traiga el catalogo, sea cual sea. Lo que esta bloqueado es el CONTENIDO del catalogo, no la logica.

**Confirmado con el JSON actualizado del 2026-09-23.** Su carpeta **`Consulta STD AWS`** trae las dos rutas del mismo catalogo, una al lado de la otra:

| Ruta | Host | Parametro |
|---|---|---|
| `AI_GET_CatalogoConfiguracion` | `54wblyc2h6...` = **`AwsBaseUrl` del `Web.config`** | `NOMBRECATALOGO` |
| `AI_GET_CCatalogo` | `nibj6m7t0l...` — **no esta en el proyecto** | `nombre_catalogo` |

En la carpeta `D-IM-11` las dos piden **el mismo catalogo** (`DM0285ALMACENPRINCIPAL`), asi que son equivalentes. La que usa el codigo es la que ya esta configurada y la que `WalletMethods` usa en produccion: **no hay que cambiar nada.** Queda retirada la duda de la §7.8 sobre si `AI_GET_CCatalogo` y `AI_GET_CatalogoConfiguracion` eran la misma ruta: son dos rutas al mismo catalogo.

Y de paso se responde lo de los espacios en el nombre: la coleccion trae `NOMBRECATALOGO=Código de promotor`, con espacio **y acento**. El codigo ya lo manda con `Uri.EscapeDataString`.

### 15.3 De donde nace `ZappOrig`

Es una columna de la entidad **`CteTel`**. Lo exponen tres sitios, y solo uno esta confirmado con captura real:

| Fuente | Campo | Confirmado |
|---|---|---|
| **`ZQBP_EDITARCLIENTE_SRV` / `CteTelSet`** (BP05-01, BP05-02) | `ZappOrig` | ✅ captura real: `"CteXpressFrontSAP"` |
| `ZAPI_BP05MA_SRV` / `to_CteTel` | `ZappOrig` (`BusinessEntitiesMa.cs:15`) | declarado en el modelo; la captura de BP05 no lo muestra |
| `ZB_DATOS_CLIENTE` | `zappOrig`, **z minuscula** (`Partner.cs:89`) | `OrderMethods.cs:609-616` documenta el casing contra respuesta real, y avisa de que esa vista **no trae `zvalTel`** |

El codigo usa la primera, que es la del listado y la unica con response real.

### 15.4 El orden nuevo del bloque

Antes se resolvian las cuatro entradas del contexto siempre. Ahora:

1. `EsProspecto` desde el BP ya leido.
2. `@TelefonoValidado` por `A_GET_TelefonoValidado`.
3. **Si no hay telefono validado, se corta ahi.**
4. Si lo hay: `CteTelSet` para el `ZappOrig`, el catalogo para `@ValidacionOrigen`, y la tabla de SMS para `@TelefonoAValidar`.

**Por que el corte es fiel y no un atajo:** SP:210-215 es
`IF (@TelefonoValidado IS NULL OR @ValidacionOrigen IS NULL OR @TelefonoValidado != @TelefonoAValidar)`.
Con `@TelefonoValidado` en NULL el primer termino ya es TRUE y el `OR` completo vale TRUE **sean cuales sean los otros dos**. Calcularlos no cambia el resultado.

Efecto practico: cuando el cliente no tiene movil validado —el caso comun en una primera compra— el bloque hace **una** llamada en vez de cuatro.

---

## 16. El saldo de credito: no hay nada que replicar — 2026-09-23

### 16.1 `ZlimCred`, ratificado

Decision del usuario el 2026-09-23: **`to_Cte.ZlimCred` es la linea de credito total autorizada del cliente.** Queda cerrada la duda que abria `CAPTURAS_REALES_APIS.md:42`.

Ese apunte —*"el SP `GetSaldo` lee `CRMCantidad` → `Zcrmcantidad`"*— sigue siendo cierto como **observacion del legado**, pero no manda: la equivalencia literal del nombre del campo no decide donde vive hoy el limite autorizado. Eso lo decide el negocio, y el negocio dice `ZlimCred`.

### 16.2 La rama `GetSaldo` nunca devolvio nada

Verificado abriendo `SpCREDIDatosSolicitudCreditoArt.sql:80-121`. La rama:

1. Calcula `@Saldo` (SP:84-100) — pedidos pendientes `UNION ALL` CXC.
2. Calcula `@Credito` (SP:107-110) — `ISNULL(CRMCantidad, 0)` de `cte`.
3. Calcula `@CreditoDisponible` (SP:113-119) — `CASE WHEN (@Credito - @Saldo) < 0 THEN 0 ELSE @Credito - @Saldo END`.
4. **`RETURN`** (SP:120) — **sin valor, y sin un solo `SELECT` de salida.**

Los tres valores se quedan en variables locales y mueren con el procedimiento. No hay resultset, y un `RETURN` pelado devuelve **0**, el codigo de exito de T-SQL.

### 16.3 Y el envoltorio de LAN lo remata

`CreditMethods.cs:766-802` (`checkSaldo`):

```csharp
new SqlParameter("@retValue", SqlDbType.Decimal){ Direction = ParameterDirection.ReturnValue }
...
cmd.ExecuteScalar();
return decimal.Parse(cmd.ExecuteScalar().ToString());
```

Tres defectos encadenados:

1. Declara `@retValue` como `ReturnValue` y **nunca lo lee**.
2. Llama a `ExecuteScalar()` **dos veces** — ejecuta el SP dos veces.
3. Parsea el resultado de la segunda. Como el SP no emite resultset, `ExecuteScalar()` devuelve **`null`**, el `.ToString()` lanza `NullReferenceException`, y el `catch (Exception ex) { }` vacio de `:796` la traga.

**`checkSaldo` devuelve `0` siempre.** No hay camino por el que devuelva otra cosa.

### 16.4 La consecuencia

`CreditMethods.cs:126-133`:

```csharp
if (decimal.Parse(data[4]) > checkSaldo(data[0])) { res = "insuficiente"; } else { res = "OK"; }
```

Con `checkSaldo` en 0, la condicion es `total > 0` → **siempre `"insuficiente"`**. Y ese `res` lo descarta el llamador de produccion (`LAN\Metodos\OrderMethods.cs:624` y `:647`), asi que nunca tuvo efecto observable.

**La validacion de credito disponible lleva muerta desde que existe este codigo.** Tres fallos independientes —el SP sin salida, el doble `ExecuteScalar`, el `catch` vacio— y ninguno se noto porque el resultado se tiraba.

### 16.5 Que significa para la migracion

**No hay comportamiento que replicar.** La pregunta deja de ser *"¿como porto `GetSaldo`?"* y pasa a ser una decision de negocio:

| Opcion | Que implica |
|---|---|
| **A · Paridad literal** | no se porta nada. El flujo no valida credito disponible, igual que hoy. Cero riesgo, cero trabajo. |
| **B · Hacerlo funcionar** | es **funcionalidad nueva**, no migracion. Y entonces si hacen falta las piezas: `ZlimCred` (ya ratificado), las deudas de **EX01** (`GetDocumentosNoCompensadosAsync`, ya existe), y los pedidos pendientes, que **no tienen fuente identificada** en ninguna OData del proyecto. |

Si se elige B, hay que decidir ademas que pasa cuando el credito no alcanza: el legado **no bloqueaba** (seguia insertando y solo marcaba `res`), asi que bloquear seria un cambio de comportamiento, no una correccion.

---

## 17. Recorte al flujo que se ejecuta: solo `@Op='Insert'` — 2026-09-24

> Decision del usuario: *"quita esos bloques que no influye en la ejecucion del SP... refactoriza esa parte a aquello que unicamente nosotros utilizamos ya con todas las reglas que hemos validado"*. **Sustituye a la decision de §5 de portar todas las ramas.** El credito web solo ejecuta el Insert: `InsertReferencia` y `Update` no tienen llamador en `Z:\LAN`, y DIMAS MX es inalcanzable con el `Origen` fijo.

### 17.1 La clase queda en 21 miembros

`Methods\Credit\SolicitudCreditoWebMethods.cs`: de 72 miembros y 1234 lineas a **21 miembros y ~615 lineas**. El recorte se hizo por **alcanzabilidad desde `InsertAsync`** (BFS sobre el grafo de llamadas), no a mano: 48 miembros no los alcanzaba nadie.

| Retirado | Por que |
|---|---|
| Rama `Update` (`UpdateAsync`, `ActualizarSolicitudConFilasAsync`, `QueryUpdate`) | sin llamador en LAN |
| Rama `InsertReferencia` (los dos caminos, `DesmultiplexarCampos`, `FnSplit` y sus helpers `Sql*`, `Truncar`, 23 constantes) | sin llamador en LAN; los 7 `*_ref` van a `""` fijo |
| Rama DIMAS MX (`ResolverCondicionArticuloDimaAsync`, `ObtenerUltimaCondicionArticuloAsync`, `EsOrigenDimaMx`) | `Origen` fijo `"PRODUCTOS MX"`; `ArmarFila` toma `Condicion` y `Articulo` del request |
| Modelos `SolicitudCreditoUpdateRequest`, `ResultadoActualizacionSolicitud`, `ReferenciaSolicitudCreditoRow`, `CampoMultiplexado`, `CaminoReferencia`, `CondicionArticuloDima` | sin uso |

Ninguna referencia fuera de los dos archivos (verificado en todo `Z:\ServicioSAP`, sin `bin\` ni `obj\`). El `.csproj` no cambia.

### 17.2 Lo que se corrigio en lo que queda

| Cambio | Regla |
|---|---|
| `InsertarSolicitudAsync` sin `try/catch`, sin guardas inalcanzables y sin los tres `Logger.SAP` | errores se propagan · no hay logs que LAN no tenga |
| El maestro manda **si existe**, como `datosCliente` en LAN; el pedido solo si no hay BP. Sin `Trim`, y `?? ""` como el `.ToString()` de LAN sobre `DBNull` | literales del legado |
| `EntreCalles` con la condicion exacta de LAN: `Length > 0` → `IsNullOrEmpty` | literales del legado |
| Fuera `NuloSiVacio`: un `''` de la tabla SMS se queda en `''` como en el SP. Con `null` cambiaba la decision de SP:210-214 | literales del legado |
| `GetTelefonoValidadoAsync`: `ZvalTel ? ZtelCte : null`, sin filtro de vacios ni `Trim` | decision del usuario |
| 🔴 **`ZvalTel` acepta `bool` o numero.** Sin telefonos, `A_GET_TelefonoValidado` responde `[{"ZtelCte": null, "ZvalTel": 0}]` (`A_GET_TelefonoValidado.py:22-28`) y el DTO `bool` hacia **fallar el alta de todo cliente sin telefonos** | contrato del endpoint |
| El catalogo por `ProductMethods.GetConfiguracionCatalogoAsync`, que ya existia, ya estaba en produccion y **propaga** el error. Fuera la tercera copia del lector | no duplicar helpers |
| Regla 28: `GetTelefonoValidadoAsync`, `GetCteTelAsync`, `GetCatalogoConfiguracionAsync` | nombre por la operacion SAP |

### 17.3 Fuera de la clase

| Archivo | Cambio |
|---|---|
| `OrderMethods.cs` | `CrearSolicitudCreditoAsync` ya no se traga el error: la causa real llega a `ProcessCreditPaymentAsync` |
| `OrderMethods.cs` | fuera `HasValidPhoneOriginSAPAsync` y `CheckClientBalanceAsync` (cero llamadores) y la llamada comentada al saldo |
| `OrderMethods.cs` | fuera los parametros que llegaban y nadie leia: `isValidated` y `datosArray` |
| `Methods\Credit\CreditMethods.cs` | fuera `IsValidatedAsync` y `ObtenerNumeroTablaSmsAsync`: copia muerta, sin llamadores |
| **`MapGender`** | **uno solo**, el de `BusinessPartnerMethods` (ahora `internal`), por decision del usuario. El de `OrderMethods` interpretaba `"M"` como **hombre** y el de BP como **mujer**, y devolvian `""` y `"3"` al no reconocer el valor |

### 17.4 Pendiente de decision, no aplicado

- **`Gender = string.IsNullOrWhiteSpace(info.sexo) ? "1" : ...`** (`OrderMethods.cs:2686`). Si Magento no manda sexo, el BP se da de alta como **hombre**. Y los payloads reales de credito **no traen `sexo`**. El `MapGender` de BP, con valor vacio, devuelve `""`. Es un default del llamador, no del metodo, y cambiarlo cambia el dato de todo BP creado desde una orden.
- **`OrderMethods.IsValidatedAsync`** sigue vivo: alimenta `numeroValidado` → `LadaValidar`/`TelefonoValidar`. Duplica lo que ahora hace `A_GET_TelefonoValidado` dentro de la clase, con otra fuente. Unificarlo cambia datos en el caso limite.
- Los tres `Console.WriteLine` del bucle de lineas de articulo, que LAN no tiene.
- `ObtenerMaestroAsync` no sigue la regla 28 (envuelve `GetClientMaAsync` con la guarda de cliente vacio).


---

## 18. Paridad final y plan de guardias del fin de semana — 2026-09-24

> Pregunta del usuario: *"¿ya hace exactamente lo mismo con sus equivalencias? ... ¿ya es posible usarlo como prototipo para ir haciendo pruebas de aquí al lunes?"*. Auditoria de 15 agentes (`wbugp39t6`) mas verificacion directa de las citas que sostienen el veredicto.

### 18.1 Veredicto

**La rama Insert del SP esta bien portada; lo que la rodea todavia no es igual a LAN.** Coinciden las 59 columnas, el 1/0 de `ValidacionTelefono` con logica de tres valores, el maestro BP05MA, el CEILING y el numerado de lineas.

**Sirve como prototipo del alta de la solicitud** (lo que hacia el SP), con tres condiciones: que compile, que la base de pruebas este confirmada como no productiva, y que el payload traiga un BP en lugar de la cuenta `C...` de Intelisis. **No sirve como flujo de credito de punta a punta**: el liberador y el callback estan apagados y la orden se queda en PENDIENTE en Magento.

### 18.2 Correcciones a lo dicho en esta sesion

| Punto | Correccion |
|---|---|
| `datosped[31]` | **No manda el telefono.** El conteo que lo afirmaba estaba mal: en `ToArray` de LAN (`OrderMethods.cs:340`), las lineas 7-10 son un `if/else` sobre `cliente` y se contaron las dos ramas. Indices correctos: `[14]` direccion, `[21]` telefono, **`[31]` metodoEnvio** (`LAN Enums.cs:43`). No hay desfase en el legado y ServicioSAP ya manda `order.metodoEnvio`: hay paridad. Queda anulada la pregunta "replicar el desfase o corregirlo". |
| `SexoLegado` "sin fuente" (hallazgo del workflow) | **Tiene fuente**: el dominio de `CTE.Sexo` que dio el gestor del usuario (`Femenino`, `Masculino`, `NO ESPECIFICADO`), aplicado sobre el `Gender` del maestro. El workflow no tenia esa informacion. |

### 18.3 Anchos: evidencia nueva sobre la decision 13

La decision del usuario sigue en pie: *"lo vas a insertar a como llegaba al SP, ya si truena por el tamaño nos daremos cuenta despues"*. Se registra la evidencia porque cambia la premisa ("el valor llega a la tabla con los mismos caracteres"):

- La bitacora del SP (`SP_CREDITO_WEB_DATOS.sql:51`) dice *"27/02/2020 Norberto Reyes - Se agrega **campo** MetodoEnvio tipo varchar(12)"*. Es la columna, no solo el parametro.
- La firma del SP recortaba en silencio al asignar el parametro; el `INSERT` directo no recorta y lanza el error 8152.

| Parametro del SP | Ancho | Valor real | Resultado probable sin el SP |
|---|---|---|---|
| `@MetodoEnvio` (`:147`) | 12 | `tablerate_bestway` (17) | 8152 en **toda** orden con envio |
| `@direccion` (`:102`) | 30 | 51 caracteres (CRED515848) | 8152 si la columna mide 30 |
| `@cliente` (`:130`) | 9 | Partner de 10 digitos | 8152 si la columna mide 9 |
| `@sexo` (`:100`) | 9 | `NO ESPECIFICADO` (15) | 8152 si la columna mide 9. En LAN, ese valor se guardaba como `NO ESPECI` |

Se confirma sin insertar nada con el DDL (B2):

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('CRED_SOLICITUD_WEB_DATOS_TEMP','VTASdArtCreditoWeb')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

### 18.4 La base de pruebas es la de LAN

`ConexionSQL.obtenerConexionAndroidAsync` (`Helpers\ConexionDB\ConexionSQL.cs:106`) lee `MAVICBOSANDROID` del `Web.config:13`: `mavicbosandroid.grupomavi.com / ServicioAndroid`, **el mismo servidor y la misma base que LAN** (`Conn\Connection.cs:28`). `Web.local.config` solo sobreescribe `appSettings`. Si esa base es productiva, cada prueba escribe una solicitud real en la tabla que lee Credito. **Las pruebas de punta a punta (B8) esperan hasta confirmarlo.**

### 18.5 Lo que todavia no es igual a LAN

| # | Gravedad | Diferencia | Evidencia | Cierre |
|---|---|---|---|---|
| 1 | Critica | Sin el recorte del SP, los anchos pueden tumbar el alta | 18.3 | B2 → decision del usuario |
| 2 | Critica (funcional) | Liberador y callback a Magento apagados | `OrderMethods.cs:740-772` comentado | Lunes, otros equipos |
| 3 | Critica | Magento manda la cuenta `C...` de Intelisis y ServicioSAP exige un BP | `magento_payloads.md:26, :55`; `OrderMethods.cs:784-797` | Lunes, Magento |
| 4 | Alta | Tres lecturas HTTP nuevas y un catalogo sin alta pueden tumbar el alta | `SolicitudCreditoWebMethods.cs:483-508`; `ProductMethods.cs:724-725` | B3 |
| 5 | Alta | SKU sin escapar en el `$filter` de SD29; `DIB+00104` puede no encontrar precio | `FinalListProperMethods.cs:85` | B3 |
| 6 | Alta | Cliente nuevo con cuenta vacia: se inserta una solicitud que LAN no creaba ("sin cuenta") | LAN `CreditMethods.cs:124, :255-258`; SAP `OrderMethods.cs:672-684` | Decision del usuario |
| 7 | Media | La cabecera se escribe **antes** de validar la condicion; el error se registra y la orden responde Concluido | `OrderMethods.cs:694` antes de `:891`; catch `:711-717` | Decision 9: que significa "se detiene" |
| 8 | Media | `numeroDelSms` sale de otra consulta (`JOIN` por telefono en lugar de `IdRegistro IN (...)`) | SAP `OrderMethods.cs:597-600` vs LAN `OrderMethods.cs:827-830` | B5.1 |
| 9 | Media | `IsValidatedAsync` filtra por `ZappOrig` y vuelve a leer BP05MA | `OrderMethods.cs:636, :646-651` | Decision del usuario (§17.4) |
| 10 | Media | El telefono de respaldo no pasa por `ValidateOnlyNumbers` | SAP `:688` vs LAN `CreditMethods.cs:113` | B5.2 |
| 11 | Media | El codigo promotor se quema aunque fallen las lineas | SAP `:729-733` fuera del try; LAN `CreditMethods.cs:201-206` dentro | B5.5 |
| 12 | Media | `throw` cuando no se inserta ninguna linea, y su log; LAN inserta 0 lineas sin error | `OrderMethods.cs:1043-1044` | B5.4 |
| 13 | Media | Costo de linea 0 y sin SKU por region (TELEFONIA) | `OrderMethods.cs:942, :947, :1022` | Fuera del fin de semana |
| 14 | Media | `Logger.SAP` puede lanzar dentro de un catch si no puede crear la carpeta | `Logger.cs:28-31` | B7: crear carpetas |
| 15 | Baja | Costo de envio convertido con la cultura del servidor | `OrderMethods.cs:1815` | B5.3 |
| 16 | Baja | Las ordenes de credito no guardan la guia | SAP `:1859` despues del return; LAN `:606` antes | B5.7 |
| 17 | Baja | Un reintento del mismo CRED crea otra solicitud | SAP `:1771-1774` | Fuera del fin de semana |

Sigue pendiente de §17.4: el default `Gender = ... ? "1"` (`OrderMethods.cs:2686`), `Marst` fijo (`"1"` en BP, `"2"` en Order) sin tabla de codigos de estado civil, y el log de `ObtenerTelefonoAValidarAsync` (`SolicitudCreditoWebMethods.cs:361-365`), que LAN no tiene y que el catch de la orden ya registra.

### 18.6 Bloques del fin de semana

| Bloque | Horas | Depende de | Terminado cuando |
|---|---|---|---|
| B0 Foto del punto de partida: commit local sin push en una rama de trabajo | 0.5 | — | Hay un commit con el estado actual |
| B1 Compilar sin cambiar logica | 1 | B0 | 0 errores; advertencias anotadas. No descomentar el liberador (`:740-772`, CS4034) |
| B2 Consultas de solo lectura: DDL, permisos de `usrintranet`, `CondicionesCredVtaLinea` | 1.5 | — | Tabla columna / ancho real / parametro del SP / valor real |
| B3 Humo de APIs una por una: `A_GET_TelefonoValidado`, catalogo, `CteTelSet`, SD29 con `+` y con `%2B` | 2 | B1 para lo local | Tabla endpoint / caso / HTTP / forma |
| B4 Decisiones con la evidencia de B2 y B3 | 1 | B2, B3 | Cada punto decidido o marcado "espera lunes" |
| B5 Arreglos de paridad sin decision nueva (18.5 #8, #10, #11, #12, #15, #16; #5 si B3 lo pide) | 2.5 | B1 | Un commit por cambio; compila despues de cada uno |
| B6 Arreglos que salgan de B4 (#1, #6, #7, #9) | 3 | B4 | Idem |
| B7 Ambiente: carpetas de log, IIS Express, token, payloads con BP del 110 e incrementId nuevo de 12 o menos, `codigo_promotor` vacio | 1.5 | B1, B3 | Base confirmada como no productiva, o B8 se aplaza |
| B8 Pruebas de punta a punta (P2 a P22) | 3 | B5, B6, B7 | Tabla caso / resultado / diferencia; Id insertados listados, **sin borrar** |
| B9 Paquete para el lunes: commit final, este documento al dia, preguntas con evidencia | 1 | — | Nada desplegado |
| B10 (opcional) Comentarios y logs de la ruta de credito | 2 | B8 | P2 da el mismo resultado |

**Orden recomendado:** B0 → B1 y B2 en paralelo → B3 → B4 → B5/B6 → B7 → B8 → B9. **Si solo hay tiempo para una cosa, B2**: el DDL dice si la primera prueba real va a tronar antes de correrla.

### 18.7 Pruebas

| Caso | Entrada | Esperado |
|---|---|---|
| P1 | Compilacion en Debug | 0 errores |
| P2 | CRED515773 (MA, sin envio, OSTE00443) con BP sin movil validado | Una fila con los datos del maestro, `uen` 1, sucursal 504, `ValidacionTelefono` 1 (0 si es prospecto); una linea OSTE00443 con precio y Abono de 04/12IA |
| P3 | CRED515848 (VIU, envio 150, `DIB+00104`, direccion de 51) | `uen` 2, sucursal 505, linea `DIB+00104` y SEGU00001 con Orden 2. Si la columna `direccion` mide 30: 8152 y se anota |
| P4 | BP con MOVIL validado y `ZappOrig` vacio | `ValidacionTelefono` 1 |
| P5 | BP con MOVIL validado, `ZappOrig` en el catalogo y ultimo SMS igual | `ValidacionTelefono` 0. Solo despues del alta del catalogo |
| P6 | BP sin telefonos | No se llaman `CteTelSet` ni el catalogo; `ValidacionTelefono` 1 |
| P7 | Prospecto | `ValidacionTelefono` 0 |
| P8 | BP con SMS registrado | Despues de B5.1, `LadaValidar`/`TelefonoValidar` igual a la consulta de LAN corrida a mano |
| P9 | Telefono `(33) 1234-5678` | Despues de B5.2, lada 33 y telefono 12345678 |
| P10 | CRED515773 sin cambiar (cuenta `C01575835`) | "no tiene credito activo en SAP" y ninguna fila |
| P11 | Cuenta vacia y cliente `9400` | Segun B4: ninguna fila (paridad) o una fila con cliente vacio (comportamiento conocido) |
| P12 | Invitado | "Los invitados no pueden pagar con credito" y ninguna fila |
| P13 | BP inexistente | "no tiene credito activo en SAP" y ninguna fila |
| P14 | Condicion inexistente | Hoy: cabecera escrita, 0 lineas, Concluido. Tras B6: sin cabecera y "Error, ..." |
| P15 | Un SKU sin precio junto a otro con precio | El sin precio no se escribe y el numerado salta uno |
| P16 | Solo SKU sin precio y sin envio | Tras B5.4: cabecera sin lineas y sin log extra, como LAN |
| P17 | SKU repetido | Una sola linea con la cantidad total |
| P18 | `Descuentocategoria` > 0 | `CEILING(precio - precio*desc/100)`, igual para Abono |
| P19 | `URL_BP_API` invalida en `Web.local.config` | "Error, ..." (no 500) y ninguna fila |
| P20 | Repetir P2 con el mismo incrementId | Segunda fila (comportamiento conocido) |
| P21 | Contado con SKU normal y con `+` | Solo si se toco `FinalListProperMethods.cs:85` |
| P22 | `getGuide` con el incrementId de P2 | Tras B5.7, devuelve la fila |

### 18.8 Preguntas del lunes

| A quien | Pregunta | Desbloquea |
|---|---|---|
| DBA de ServicioAndroid | ¿`mavicbosandroid / ServicioAndroid` es productiva? ¿Hay copia de QA? ¿Quien lee y quien borra las filas de prueba? Si B2 no se pudo correr: DDL de las dos tablas y permisos de INSERT de `usrintranet` | B8 y los anchos |
| Magento / Omnipro | ¿Que manda `infoCliente.cuenta` tras la migracion, el BP o la cuenta `C...`? ¿Y en una primera compra? ¿`requestCreditOrder` solo reacciona a `false`? ¿Que vocabulario usan en `infoCliente.sexo`? | #3, #6 y el contrato de respuesta |
| Dueño de businesspartner-api | ¿El desplegado filtra MOVIL y `Zvaltel = true`? ¿Como ordena si `Zfecha` es null? ¿Que responde para un BP inexistente o sin telefonos? | #4 |
| Configurable AWS | Alta de `ORIGEN VALIDACION NUMERO CTE` con las 23 filas de `CatalogoConfiguracion.csv` en `VALOR1`. Mientras no exista, ¿responde `200 []` o error? | P5 |
| Basis | Autorizacion del usuario tecnico sobre `ZQBP_EDITARCLIENTE_SRV`, `ZAPI_BP05MA_SRV`, `ZAPI_PROPRELIST_SRV`, `ZB_DATOS_CLIENTE_CDS`. ¿Como lee el Gateway un `+` sin escapar en `$filter`? | #4, #5 |
| Liberador / Credito | ¿El liberador sigue vivo con SAP? ¿Cual es el disparador equivalente a `StartsWith("C")` con BP numericos? ¿Quien crea el pedido de credito? | #2 |
| DMZ | URL real de `order/authorizationResult` (hoy `URL_DMZ` apunta a localhost) y timeout de `order/new` | #2 |
| SIGMAVI | ¿`CondicionesCredVtaLinea` tiene `CondicionMagento`? ¿`VentasCupones` equivale a `VTASCVentaCupon`? ¿Existen `RegionSku` y `CodigoPostalRegionCelular`? | #7, #11, #13 |
| Datos maestros | Tabla de codigos `Marst` de MAVI para el estado civil | Estado civil |
| Negocio | ¿Alguien lee `VTASdArtCreditoWeb.costo`? | #13 |

### 18.9 Fuera del fin de semana

Liberador y callback · `creditStatus`, `updateCreditOrderId` y el pedido SAP de credito (ya calendarizados en `PLAN_MAESTRO_GANTT_POR_DEV.md`) · SKU por region · costo de linea (`spVerCosto`) · estado civil · equivalencia del codigo promotor · deduplicacion · despliegue a stage o produccion · **borrar filas de prueba** (lo decide el dueño de la base).
