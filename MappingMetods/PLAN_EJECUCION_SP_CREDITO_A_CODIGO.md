---
tags: [migracion, sap, credito, sp, serviciosap, implementacion, runbook]
fecha: 2026-09-18
estado: IMPLEMENTADO — 2 archivos registrados en el .csproj; el SP ya no se llama; paridad de datos con LAN en §12 · plan vigente en CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL (2026-09-30)
requiere: FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md (diseno y decisiones D1-D10)
---
# Plan de ejecucion — `SP_CREDITO_WEB_DATOS` a codigo en `ServicioSAP`
> 2026-10-01: cómo funciona ServicioSAP hoy está en [[Business Rules Ecommerce]] (fuente única). Este documento queda como plan e historia; si contradice a esa fuente, gana la fuente.

> [!abstract] Que es esto
> El runbook para implementar la migracion. Se detuvo **antes de escribir una linea** en el repo: `ServicioSAP` esta limpio en la rama `SpExportaEcommerce` (commit `b3a2965`). Todo lo de aqui esta verificado contra codigo; lo que no, dice **PENDIENTE**.
>
> Orden: §1 preparacion → §2 contrato entre archivos → §3 las 7 unidades → §4 lo que hace el orquestador despues → §5 compilar → §6 dudas para el usuario.
>
> 🔴 **Desactualizado a partir de la §3.** El plan vigente es la **§9** (el flujo sin SP) y el estado real de lo escrito, la **§10**. 🟢 **2026-09-30: el plan vigente es [[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]]** (análisis completo y plan final; ver §26). La §9 y el resto quedan como historia.

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

---

## 19. Cronograma de guardias 26 y 27 de septiembre — notas de ejecucion — 2026-09-24

> Pedido del usuario: *"generame un cronograma para esos dos dias para entregar"*; *"no necesariamente debe estar terminado todo, solamente tener una actividad real de trabajo"*. Cronograma entregable: https://claude.ai/artifact/NMtWPEtbRf3dGtMSfdYa5k. Se armo con un workflow de 9 agentes (`w5gm6gzrb`): 4 verificaron en el codigo, 3 disenaron agendas con enfoques distintos (meta primero, cobertura, a prueba de guardia), 1 eligio y sintetizo, y 1 hizo la revision adversarial. Gano la agenda "a prueba de guardia" (42 de 50 puntos).

### 19.1 Objetivo

Para el domingo, dejar el flujo de credito web de ServicioSAP compilado en una rama local, con los arreglos de paridad con LAN que no dependen de otros equipos (§18.5 #8, #10, #11, #12, #15, #16), probado en local en los casos que no escriben datos (P10, P12, P13, P19 y P22), y con el paquete de pruebas y preguntas listo para el lunes. No todo tiene que quedar terminado; lo que no entre pasa a "espera lunes".

### 19.2 Correcciones de la revision adversarial, verificadas

| # | Correccion | Evidencia |
|---|---|---|
| 1 | La meta no puede decir "responde igual que LAN". LAN descarta lo que devuelve `ProductosCreditoWeb_SaveData` y responde con la cuenta y un 200. ServicioSAP responde `"Error, ..."` para invitado, cuenta `C...` o BP inexistente. Se compara contra el esperado de §18.7 y a Magento se le pregunta si lo tolera | LAN `OrderMethods.cs:624-649` |
| 2 | `numeroValidado` ya es respaldo del SMS en LAN. Lo que se decide es la **fuente y el filtro** de `IsValidatedAsync`, no su lugar en la cadena | LAN `OrderMethods.cs:642` |
| 3 | La URL invalida de `URL_BP_API` solo corta **cuando hay cuenta**. Con el cliente vacio, `GetTelefonoValidadoAsync` regresa `null` sin llamar y el INSERT se ejecuta: **P11 no es segura** | `SolicitudCreditoWebMethods.cs:476-481` |
| 4 | La ruta publica `getCondicion` usa el default de contado `ACEF`; credito usa `""`. `CONDICION PRUEBA` regresa `ACEF` por esa ruta, y eso es lo esperado, no un fallo. Se usa el `storeId` exacto (`muebles_america` o `viu`) | `OrderController.cs:321`; `OrderMethods.cs:891` |
| 5 | Lo que deba llegar al INSERT (P2, P14 y la hoja del lunes) lleva la cuenta cambiada por un BP de QA 110. `CRED515773` tal cual es P10 y nunca llega al INSERT | `OrderMethods.cs:784-797` |
| 6 | El truncamiento puede salir como 8152 o, en SQL Server 2019 o posterior, como 2628 | — |
| 7 | Candado de P22: si no se carga `SQLITE_DB_PATH`, SQLite usa `C:\inetpub\wwwroot\sap\`. El candado pasa solo si la fila aparece en el `data.db` local **y** esa ruta de respaldo no existe en el equipo donde corre IIS Express | `SQLiteDb.cs:16-20` |
| 8 | `Web.local.config` ya esta en `.gitignore` y solo sobreescribe `appSettings`, no la cadena de conexion | `.gitignore:298` |
| 9 | Colchon: antes de las 12:30 del domingo hay 2.5 h. Si la guardia consume mas, la meta se cierra a mas tardar a las 16:00, cuando se congela el codigo | Agenda |

### 19.3 Nota de paridad encontrada al verificar

LAN manda `origen` desde `infoCliente` si viene, y si no, `"PRODUCTOS MX"` (`LAN OrderMethods.cs:646`). ServicioSAP lo fija en `"PRODUCTOS MX"`. Hay paridad mientras Magento no mande `origen`, como confirmo el usuario.

### 19.4 Reglas durante la guardia

- No se atiende un incidente con un cambio sin compilar: se compila si toma 10 minutos o menos; si no, se guarda con `git stash`.
- Al salir a un incidente se anotan el bloque, el paso y la siguiente accion. Al volver se revisan `git status`, `git log -1` y esa nota.
- Las pruebas que escriben en la base Android se corren solo si la base se confirma como QA. Los Id insertados se listan y no se borra nada.

---

## 20. Arreglos de paridad aplicados en la ruta de credito — 2026-09-24

> Pedido del usuario: *"que sigue que hagamos, hay que continuar por mientras"*; *"me refiero al analisis de la comparativa del SP legacy con el flujo actual de SAP"*. Se aplicaron los arreglos de §18.5 que tenian regla y no pedian decision. Share desde hoy: `\\172.16.214.58\sap` (misma informacion que el antiguo `Z:`). Sin commit y sin compilar: eso lo hace el usuario.

### 20.1 Cambios en `ServicioSAP\...\Methods\Order\OrderMethods.cs`

| §18.5 | Cambio | Legado |
|---|---|---|
| #8 | `ObtenerNumeroTablaSmsAsync`: `SELECT TOP 1 Telefono ... WHERE IdRegistro IN (SELECT IdCodigoVerificacioneCommerce ... WHERE CV.Cliente = @Cliente) ORDER BY Id DESC`, sin `LTRIM/RTRIM` | LAN `OrderMethods.cs:827-830`, base Android |
| #10 | Telefono de respaldo de `ProcessCreditPaymentAsync` por `ValidateOnlyNumbers` | LAN `CreditMethods.cs:113` |
| #11 | La quema del codigo promotor va dentro del `try`, despues de `InsertCreditArticlesAsync`: si falla una linea, no se quema | LAN `CreditMethods.cs:199-206`; `CreditoWeb_InsertArticulo` no tiene `try` (`:869-919`) |
| #12 | Fuera el `throw` de `insertados == 0` | El SP de lineas hace `INSERT...SELECT` y con `JOIN` vacio inserta 0 filas sin error (`SpVTASInsertArtSolCreditoLinea.sql:243-262`) |
| #15 | `costoEnvio.ToString(CultureInfo.InvariantCulture)` al armar `SEGU00001` | LAN concatenaba el texto de Magento (`OrderMethods.cs:616-617`) |
| #16 | `SaveGuideAsync` al inicio de la rama de credito; contado no cambia | LAN `OrderMethods.cs:606`, antes de `:609` |

Se quitaron tres comentarios de la ruta de credito. Su contenido queda aqui:
- **Codigo promotor**: se lee de `infoCliente.codigo_promotor` y no por indice. La version anterior usaba `datosArray[72]`, una rama inalcanzable porque `ToArray` produce 39 elementos. El 72 venia de cruzar dos convenciones de LAN: `CreditMethods.cs`, con un arreglo de 7 y el promotor en `data[6]`, y `Credit\Methods.cs`, con un arreglo de ~76. Es opcional: solo llega cuando un promotor asistio la compra.
- **Catch de las lineas**: un fallo al insertar lineas no cambia lo que recibe Magento, que sigue siendo la cuenta, como LAN. El comentario decia que propagar produciria un 400, pero es **falso**: `OrderController.cs:37-46` responde `Ok("Error, ...")`, un 200.
- **`throw` dentro del bucle de lineas**: el comentario decia que propagar evitaba un "Concluido" con la solicitud vacia. Ya no aplica: el llamador (`:707-717`) se traga la excepcion y responde "Concluido", igual que LAN.

### 20.2 Revision adversarial (`wzp66ps33`, 3 lentes)

- **Compilacion: 0 hallazgos.** El diff contiene exactamente los 6 cambios, las llaves quedan balanceadas, `costoEnvio` es `decimal` e `incrementId` es local de `SetOrderAsync` (`:1751`). No hay sintaxis posterior a C# 7.3.
- **Paridad**: los 6 arreglos igualan a LAN en los casos reales: SMS con `NULL` o sin filas, telefono con formato, 0 lineas, costo 0, 150 o 150.50.
- **Efectos**: contado, cupones (`OrderController.cs:113`) y devoluciones no cambian. La guia no se duplica, porque credito regresa antes de la llamada de contado.

### 20.3 Lo que encontro la revision y no se aplico

| Hallazgo | Por que no se aplico |
|---|---|
| **Condicion inexistente**: `InsertCreditArticlesAsync` lanza en `:883-886`, **antes** del bucle. No se inserta ninguna linea, ni `SEGU00001`, y desde el arreglo #11 tampoco se quema el promotor. LAN no valida: inserta `SEGU00001` y quema el cupon. Los revisores proponen quitar ese `throw` | **Reabre la decision 9 del usuario**: *"si no existe ... no hay un default, ahi se debe detener el resultado y notificar que no existe la condicion de pago en el flujo"*. No quemar el promotor es coherente con "se detiene". Sigue pendiente (§18.5 #7) definir si "se detiene" es antes de escribir la cabecera |
| `ConstruirNombreClienteMavi` aplica `Trim()` al total y LAN no (LAN `OrderMethods.cs:603-605`). Con un apellido vacio, LAN guarda `' LOPEZ JUAN'` y ServicioSAP `'LOPEZ JUAN'` | El helper tambien lo usa contado (`:1824`, `:1928`, `:1934`): va a la auditoria de SetOrder |
| Si falla el guardado de la guia, LAN aborta el pedido y responde `""`; ServicioSAP se traga el error (`SaveGuideAsync` y `SQLiteDb.SetAsync`) | Cambia el contrato con Magento: lo decide el usuario |
| En contado, la guia se guarda despues de validar stock y partner (`:1848`). LAN la guarda antes, para todo metodo de pago | Fuera del flujo de credito: va a la auditoria de SetOrder |
| `:688` usa `IsNullOrWhiteSpace` y LAN usa `Length > 0`. Un SMS con puros espacios se usaria en LAN | Va junto con la decision pendiente de los `"0"` de `:688-691` |
| `costoEnvio` es texto en LAN (`!= "0" && != ""`) y `decimal` en ServicioSAP (`> 0`). Con `"0.00"`, LAN agrega `SEGU00001` con precio 0 | Los payloads reales traen `"0"` o `"150"`. Igualarlo exige cambiar el tipo del modelo |
| Con un promotor de puros espacios, LAN llama al SP de cupones y ServicioSAP no | Teorico; los payloads traen `""` |

---

## 21. SP de líneas: costo y SKU por región — 2026-09-24

> **Base de esta sección.** Todo se revisó en `\\172.16.214.58\sap` el 24-sep. El acceso funciona y el contenido es el mismo que antes estaba en `Z:\`.
>
> `OrderMethods.cs` cambió dos veces mientras se hacía la revisión, a las 18:01 y a las 18:19:02. Las citas son de la versión de las 18:19:02, que tiene 3359 líneas. Las líneas que cita el PLAN 18.5 #13 (`:942`, `:947` y `:1022`) hoy son `:931`, `:1006` y `:901`.
>
> **Abreviaturas usadas en las citas:**
> - `SS\` = `ServicioSAP\ServicioSap\ServicioSap\`
> - `LS\` = `.agents\skills\lan-sap-migration\`
> - **OM** = `SS\Methods\Order\OrderMethods.cs`
> - **SPL** = `LS\SPsOrden\SpVTASInsertArtSolCreditoLinea.sql`
> - **SVC** = `LS\SPsOrden\spVerCosto.sql`

### 21.1 Veredicto

**Ya está igual, o es equivalente con otra fuente** (OM:922-1006):
- El precio y el Abono salen de SD29 por SKU, filtrados a las organizaciones 04 y 05.
- Se aplica el CEILING con `Descuentocategoria`.
- La línea SEGU00001 lleva el envío como precio, cantidad 1 y Abono 12.
- Se descartan los artículos repetidos consecutivos.
- Las líneas sin precio se omiten.

**Lo que falta:**
- **El costo.** Siempre se escribe 0 (OM:931).
- **La sustitución de SKU por región para TELEFONIA.** El código postal llega al método (OM:699, :703), pero no se usa en ninguna parte del cuerpo (OM:857-1023). El SKU de Magento se escribe tal cual (OM:926).

**¿Afecta a quien lee esos datos?** No hay ningún lector demostrado de `VTASdArtCreditoWeb`. En LAN, DMZ, ServicioSAP y `.agents` solo aparecen escrituras (OM:901, SPL:208 y :243). Los dos lectores candidatos están **por validar**: el Liberador y `SP_CREDITO_WEB_VALORES_FORM` de MAVICUBOS. De las dos piezas que faltan, el SKU por región importa más que el costo, porque cambia al mismo tiempo el artículo, el precio y el Abono.

### 21.2 Ramas del SP

**Qué recibe el SP:** 7 parámetros, sin UEN, origen ni sucursal (SPL:28-34). `@Cp` es el código postal real del cliente: `LAN\WebApiMagento\Metodos\OrderMethods.cs:639` lo envía y `LAN\WebApiMagento\Metodos\CreditMethods.cs:912` lo pasa al SP. Los payloads reales están en `LS\Resources\magento_payloads.md:26` y `:55`.

| Rama | ¿Alcanzable en crédito web? | ServicioSAP | Evidencia |
|---|---|---|---|
| R0: se lee `Art.Familia` | Sí | No se consulta | SPL:43-48 |
| R1: la familia no es TELEFONIA, se queda el SKU original | Sí. La familia de OSTE00443 y DIB+00104 está por validar | Igual en la práctica (OM:926) | SPL:164-165 |
| R2: TELEFONIA sin par de región, se queda el original | Por validar | Igual en la práctica | SPL:161-162 |
| R3: CP activo, artículo de región 5 y existencia de la región 6 > 0: cambia a región 6 | Por validar. Ningún payload real es de telefonía | **NO PORTADA** | SPL:85-116 |
| R4, R5, R8, R9: se queda el SKU original | Por validar | Igual en la práctica | SPL:118, :122-125, :155, :157-158 |
| R6: CP activo y el artículo no coincide con ninguno de los dos TOP 1: `@artRegion` queda NULL y se insertan 0 filas | Solo si el artículo está en más de un par y los dos TOP 1 sin ORDER BY devuelven filas distintas. Es un defecto, no una regla | No se debe portar | SPL:62-68, :77-83, :121-126, :262 |
| R7: CP inactivo o vacío, artículo de región 6 y existencia de la región 5 > 0: cambia a región 5 | Por validar. Un CP `""` también entra aquí (OM:699) | **NO PORTADA** | SPL:127-153 |
| R10: SEGU00001 | Sí (el pedido VIU trae envío 150) | Precio y Abono portados (OM:933-937). Costo no (OM:931) | SPL:179-217 |
| R11: resto de artículos (precio, Abono, costo) | Sí | Precio y Abono portados desde SD29 (OM:946-993). Costo no. La llave de condición es otra: `CondicionMagento` en SAP (OM:3325) contra `Condicion`→`CondicionPropre` en legacy; la equivalencia está por validar. Legacy puede insertar varias filas por el JOIN; SAP inserta como máximo una (OM:969-972) | SPL:219-263 |
| La condición no existe | Sí | Hay divergencia. SAP lanza una excepción antes de insertar (OM:877-880). El catch solo registra el error (OM:711-717) y Magento recibe "Concluido" (OM:1802-1807) con la solicitud sin líneas, SEGU incluida | OM:877-880, :711-717 |
| SD29 falla a mitad del ciclo | Sí | Se relanza la excepción y quedan líneas parciales | `SS\Methods\SalesDistribution\FinalListProperMethods.cs:97-98`; OM:1015-1019 |

### 21.3 Costo

**Cómo lo calcula legacy.** El SP de líneas llama a `spVerCosto 96,'MAVI','',@artRegion,'',Art.Unidad,Art.TipoCosteo,'PESOS',1` (SPL:221-237). Dentro de `spVerCosto`:

1. **Hook `xpVerCosto`** (SVC:69-72). Si asigna un costo, se salta todo el cálculo de SVC:71-190. Que la condición se cumpla depende de `ANSI_NULLS OFF` (SVC:4). El código de `xpVerCosto` no está en SPsOrden.
2. **Ramas que no se alcanzan.** Proveedor y SubCuenta llegan vacíos y se convierten en NULL (SVC:64-66). Por eso nunca se ejecutan las ramas de proveedor (:89-117), ArtSub (:122-133) ni ArtSubCosto (:136-148).
3. **Artículos SERVICIO o JUEGO.** Pueden cambiar de método de costeo (SVC:83-88). Esto podría aplicar a SEGU00001 (por validar).
4. **Rama que sí se ejecuta:** `Art ⟕ ArtCosto` con sucursal 96 y empresa MAVI (SVC:150-163). El método depende de `@Cual` (SVC:172-179):
   - PROMEDIO: CostoPromedio
   - ESTANDAR: `Art.CostoEstandar`
   - REPOSICION: `Art.CostoReposicion`
   - PRECIO LISTA y MARGEN: se ajustan por impuesto incluido (:165-171, no revisado)
   - ULTIMO (AUTOTRANS) y ULTIMO COSTO SGASTO: sus propias columnas
   - Cualquier otro valor: UltimoCosto
5. **Fórmula final:** `ROUND(ISNULL(C·F_moneda,0)·F_unidad, RedondeoMonetarios)` (SVC:180-191).
   - Si TipoCosteo es NULL, vacío o 'NO', o si `Art` no tiene fila, el costo sale **NULL, no 0** (SVC:120, :191).
6. **La copia está dañada.** Faltan operadores en SVC:3, :83, :104, :112, :114, :129, :169-170, :176-177, :180, :182 y :187. No se sabe si los factores de moneda y de unidad multiplican o dividen, así que la fórmula completa está **por validar**.

**Candidatos en SAP:**

| Candidato | Nivel de respaldo |
|---|---|
| DM01 `ZAPI_ARTICULOS_SRV/Articulos.COSTOPROMEDIOPCP` | Tiene ficha RSG: `LS\RSG\dm01_articulos.md:23` lo describe como "Costo del sistema PCP" y `:127` trae un ejemplo en string. Ya está mapeado en `SS\Models\SAP\MaterialManagement\Product.cs:137-138` y llega por `GetProductsBySkuAsync` (`SS\Methods\MaterialManagement\ProductMethods.cs:66`), pero nadie lo lee. Que equivalga a CostoPromedio de la sucursal 96 está **por validar**: se deduce solo del nombre, no hay response real (`LS\MappingMetods\PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md:1036`) y solo coincidiría si TipoCosteo = PROMEDIO |
| Valoración estándar de S/4 | Sin ficha, sin fila en el CSV y sin código: **no usable** |
| ZPCP de SD01 | **Refutado**: es el precio neto (`LS\RSG\sd01_enviar_pedido.md:34`) |
| SD29 | **Refutado**: ninguno de sus campos es costo (`LS\MappingMetods\CAPTURAS_REALES_APIS.md:203`) |
| DM07 CentroCostos | **Refutado**: es un centro de costos, no el costo del artículo (`LS\RSG\dm07_sucursales.md:37`) |

**Recomendación: no portar mientras nadie lo lea.** Se deja `costo = 0` como decisión documentada (PLAN:1431). Si aparece un lector, hay que esperar la fuente: el TipoCosteo real y un response de DM01. No se debe usar `COSTOPROMEDIOPCP` solo por su nombre. Además, si ese lector distingue NULL de 0, la diferencia con legacy importa.

**Falta confirmar:**
- Quién lee el costo.
- TipoCosteo y MonedaCosto reales de los artículos.
- El código de `xpVerCosto` y una copia limpia de `spVerCosto`.
- Si `ArtCosto` tiene filas de la sucursal 96.
- Moneda, unidad y nivel (artículo o centro) de `COSTOPROMEDIOPCP`.

### 21.4 SKU por región y existencia

**La regla legacy** (SPL:43-158):
- Solo aplica a artículos TELEFONIA que tienen par en `VTASCRegionSku`.
- Si el CP está activo en `VTASCCodigoPostalRegionCelular`, se quiere la región 6. En cualquier otro caso, incluido un CP vacío, se quiere la región 5.
- El SKU solo cambia si la variante de destino tiene existencia de ecommerce mayor que 0. Esa existencia es global, no por centro, y no bloquea el pedido (SPL:98-109). Sale de `TotalArticulos`, con respaldo en `eCommerceExist`. Si la columna es numérica, un 0 también cae al respaldo.
- El SKU resultante se usa en SPL:221-225, :229-237, :247 y :262.

**Contado no sirve como modelo:**
- `ValidarRegionCelulares` (OM:2086) usa una heurística: busca `-R5`/`-R6` dentro del SKU y toma la región del primer carácter del código postal (OM:2100, :2113-2115). Ninguna fuente respalda esa regla.
- Recibe el estado en lugar del CP (OM:1816 frente a :269 y :272). Es el hallazgo D-02 (`LS\MappingMetods\COMPARATIVA_SETORDER_LAN_VS_SAP.md:72`).
- La existencia se valida sobre el SKU original y un solo almacén (OM:1823, :2039-2040). El SKU reescrito (OM:2134) viaja a SD01 (OM:2419, :2435) sin volver a validarse.
- Crédito sale del flujo antes de llegar ahí (OM:1785-1808).
- La regla sí existe en el contado de LAN, pero en el SP: `LS\SPsOrden\SpVTASeCommerceDetPedidos.sql:16-136`.

**Piezas disponibles:**

| Pieza | Candidato | Nivel de respaldo |
|---|---|---|
| Familia | DM01 `FAMILIA` (Product.cs:29-30; dm01:38) | Tiene ficha y código, pero **el código de familia de TELEFONIA no tiene fuente**. `BAJA_getOrderId.md:403-406` descarta SF034L000. `dm02_jerarquia_articulos.md:60` muestra 'CELU' (por validar) |
| Pares | SIGMAVI `RegionesArticulos` o `RegionSku` | **Por validar**. Los documentos se contradicen: `LS\MappingMetods\_NUESTROS_ENDPOINTS\Contratos\BAJA_getOrderId.md:392` frente a PLAN:1011-1012 y :1429 |
| CP | SIGMAVI `CodigosPostalesRegionesCelulares` o `CodigoPostalRegionCelular` | **Por validar** (BAJA:393) |
| Existencia | DIM11 `GetStockAsync` (ProductMethods.cs:206), o la suma de ecommerce (`SS\Methods\Ecommerce\EcommerceMethods.cs:328-337`) | Tiene código y ficha. La equivalencia con `TotalArticulos` está por validar; la suma de ecommerce es la candidata más cercana |
| SKUs TELC… | — | Los 4 que se probaron no existen en DM01 DEV (BAJA:408-410) |
| Tabla Z con API CRUD en SAP | `LS\MappingExportArt\Equivalencia SPexportaArt.csv:53-55` | Descartada por la regla de solo S/4 |

**Recomendación: esperar fuente.** Antes de portar hacen falta tres cosas: el código de familia de TELEFONIA, un `SELECT TOP 1` de las tablas de SIGMAVI y un par cuyos dos SKU existan en S/4. Es más prioritario que el costo.

El código de la regla anterior se perdió. BAJA:475 cita el commit 13675c1, que no está en el repositorio del share.

Hay un segundo llamador en LAN: `CreditoWeb_SaveData_Articulos` (LAN CreditMethods.cs:466-478 → :922-970). En la fila 21 del CSV está como "To Do", con la nota "ANDROID - No requiere SAP", y no tiene port.

### 21.5 Si se porta

No se crea ninguna ruta nueva: todo cuelga de `order/new` (fila 77 del CSV), que llega a `InsertCreditArticlesAsync`.

| Paso | Método | Clase | Consume | Modelo |
|---|---|---|---|---|
| Familia y unidad | `GetProductsBySkuAsync` (ya existe) | `Methods\MaterialManagement\ProductMethods.cs:66` | DM01 `Articulos` con obtenerUrl y CreateClientS4 | `Product` tal como está (FAMILIA, UNIDAD, TIPO). Por validar: el formato de ARTICULO con ceros a la izquierda (dm01:95) frente al SKU de Magento |
| Existencia del SKU destino | `GetStockAsync` (ya existe, :206) | ProductMethods | DIM11 `ZCDS_DIM11_EXISTENCIA_CDS` | `Stock` tal como está |
| Pares | `Get` + el nombre real de la tabla, una vez confirmado | ProductMethods (ya lee SIGMAVI en :641 y :708), con `obtenerConexionSigMaviAsync` (`SS\Helpers\ConexionDB\ConexionSQL.cs:72`) | Tabla de SIGMAVI por validar | **Ninguno** hasta tener el `SELECT TOP 1`. Las columnas legacy (SkuRegion5 y SkuRegion6, SPL:62-68) solo sirven de referencia |
| CP de región | Igual que la fila anterior | ProductMethods | SIGMAVI, por validar | Ninguno. Referencia legacy: CodigoPostal y Estatus (SPL:85-89) |
| Sustitución | Paso privado que no llama a SAP directamente. Reemplaza a `ValidarRegionCelulares` para contado y crédito. Nombre por decidir | OrderMethods | Los cuatro métodos anteriores | — |
| Costo (solo si aparece un lector) | `GetProductsBySkuAsync`, leyendo `AverageCost`. No crear `VerCostoAsync` (PLAN:984): toma el nombre del SP legacy y `CostoArticuloResult` no tiene definición | — | DM01 | `Product` tal como está |

### 21.6 Preguntas para el lunes

1. **Dueño del Liberador y DBA de ServicioAndroid y MAVICUBOS.**
   - ¿Qué columnas de `VTASdArtCreditoWeb` leen el Liberador y `SP_CREDITO_WEB_VALORES_FORM`?
   - ¿Distinguen un costo NULL de un costo 0?
   - Evidencia: `LS\MappingMetods\_ANALISIS_PREVIO\BRIEFING-migracion-18-endpoints.md:422-434`; LAN `LiberadorCreditoMethods.cs:47-52` y `:78-80`.
   - Punto a revisar: el disparo del Liberador está comentado en ServicioSAP (OM:724-756). Además la condición está invertida: LAN lo dispara cuando la cuenta empieza con 'C' (LAN CreditMethods.cs:208), mientras que ServicioSAP lo pone bajo `esClienteNuevo` (OM:720).
2. **DBA de Intelisis.**
   - `SELECT DISTINCT TipoCosteo, MonedaCosto` de los SKU de ecommerce y de SEGU00001.
   - El código de `xpVerCosto` y el original de `spVerCosto`.
   - El resultado de `spVerCosto 96,...` para 2 o 3 SKU, como línea base.
   - ¿Hay filas de `ArtCosto` para la sucursal 96?
   - Evidencia: SVC:69, :150-191.
3. **Funcional SAP, dueño de DM01.**
   - ¿`COSTOPROMEDIOPCP` equivale a CostoPromedio de Intelisis? ¿En qué moneda y unidad viene, y es por artículo o por centro?
   - ¿Qué código de FAMILIA tienen los celulares? ¿Es 'CELU'?
   - Evidencia: dm01:23, :100, :127; dm02:60; BAJA:403-406.
4. **Basis o quien pueda capturar.**
   - Un response real de `Articulos?$filter=ARTICULO eq '<sku>'`, para un SKU de crédito y para uno TELC….
   - Evidencia: PLAN:1036; BAJA:408-410.
5. **DBA de SIGMAVI.**
   - Un `SELECT TOP 1` de las tablas de pares y de CP con los dos nombres candidatos.
   - ¿`EcommerceExistencias` tiene datos?
   - Evidencia: BAJA:392-399; `Equivalencia SPexportaArt.csv:17`.
6. **Negocio de ecommerce.**
   - ¿La existencia para decidir la región debe ser global (como en legacy) o del centro 0504/0505 (OM:372, :377)?
   - ¿Un CP vacío debe caer en la región 5 (SPL:129-153)?
7. **Líder técnico.**
   - D-02: corregir el índice 20 por el 17 y retirar la heurística `-R5`/`-R6` (OM:1816, :2100, :2113-2115, :2134).
   - Resolver la contradicción entre `LS\MappingMetods\GUIA_MIGRACION_FABLE.md:570`, que dice que `VTASdArtCreditoWeb` sigue en LAN, y `order/new`, que ya escribe en ella.


---

## 22. Session 2026-09-25 — access, B1, B2, and the LAN vs ServicioSAP comparison (partial, not verified)

> Written in English at the user's request. Base: `\\172.16.214.58\sap` (same content as before). Nothing was committed (user decision: work directly in the working tree, no branches, no commits — block **B0 dropped**).

### 22.1 Access

The working path is **`\\172.16.214.58\sap`** (by IP, share `sap`). Read and write verified. The hostname path `\\CATECINF214058D\Migracion SAP` fails from the Claude machines because the AD account `GRUPOMAVI\magalindo` has **`Estaciones de trabajo autorizadas: CATECINF214058D`** (verified with `net user magalindo /domain`) → error 2240.

### 22.2 B1 — build: **DONE**

MSBuild VS 18 (`...\18\Community\MSBuild\Current\Bin\MSBuild.exe`): **0 errors**, 11 warnings, all pre-existing, **none in the files changed for credit**. Built from a local copy (robocopy from PowerShell; from Bash, MSYS mangles UNC paths) mapped with `subst X:` — the scratchpad path plus the NuGet package paths exceed MAX_PATH (270 > 260) and MSBuild cannot import `Microsoft.CodeDom.Providers.DotNetCompilerPlatform.Extensions.props`.

### 22.3 B2 — DDL: **DONE** (run manually by the user, read-only)

- `CRED_SOLICITUD_WEB_DATOS_TEMP`: **90 columns**, the SP writes 59. `id` is the identity column. **No triggers** on either table.
- The §18.3 suspects against the real columns:

| Column | Real width | Real value | Result |
|---|---|---|---|
| `MetodoEnvio` | varchar(**12**) | `tablerate_bestway` (17) | **FAILS** with 8152 on every order with that shipping method |
| `sexo` | varchar(**9**) | `NO ESPECIFICADO` (15) | **FAILS** whenever the BP gender is not `"1"`/`"2"` (`SexoLegado`) |
| `cliente` | varchar(**10**) | 10-digit BP | OK |
| `direccion` | varchar(**100**) | 51 chars | OK |

- **The SP was a silent truncation layer**: each value was cut to the width of the SP *parameter*. Where the column is wider than the old parameter (`cliente` 9→10, `direccion` 30→100, `exterior`/`interior` 8→20, `codigoPostal` 6→20, `delegacion`/`poblacion`/`colonia` →100, `idMagento` 12→20), LAN truncated and ServicioSAP now stores the full value — no failure, more complete data. Where the column is exactly as wide as the parameter, LAN truncated and **ServicioSAP throws**. Only `MetodoEnvio` and `sexo` have known real values that exceed.
- `fechaNacimiento` is **varchar(10)**. ServicioSAP sends `SqlDbType.Date`; SQL Server converts it to `yyyy-mm-dd`, same as the SP (its parameter was `DATE`). The "blocking verification" of `FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md` §6 is **moot** — the SP is no longer called.
- `NOT NULL` columns covered: `estatus` (model default 0, never nulled), `confirmado` (bit, receives 1), `tipoTelefonoRef` (not in the insert list, takes default 1).
- **Pending decision (follow-up of decision 13):** truncate `MetodoEnvio` to 12 and `sexo` to 9 in C# (exact LAN parity: `tablerate_be`, `NO ESPECI`), **or** widen the two columns with `ALTER TABLE` (manual / DBA).
- Optional read-only confirmation of what LAN actually stored (user to run):

```sql
SELECT MetodoEnvio, COUNT(*) AS filas FROM CRED_SOLICITUD_WEB_DATOS_TEMP GROUP BY MetodoEnvio;
SELECT sexo, COUNT(*) AS filas FROM CRED_SOLICITUD_WEB_DATOS_TEMP GROUP BY sexo;
SELECT TOP 20 id, fecha, fechaNacimiento, LEN(cliente) AS len_cliente, LEN(direccion) AS len_direccion FROM CRED_SOLICITUD_WEB_DATOS_TEMP ORDER BY id DESC;
```

### 22.4 🔔 REMINDER (asked by the user) — is `ValidacionTel = 1` applied in the FastAPI?

**Answer from the code: no.**

The SP's rule for `@TelefonoValidado` (`SP_CREDITO_WEB_DATOS.sql:194-202`) has three conditions:

```sql
WHERE ct.Cliente = @cliente
  AND ct.Tipo = 'Movil'        -- 1. mobile only
  AND ct.ValidacionTel = 1     -- 2. validated only
ORDER BY Fecha DESC            -- 3. the most recent of those
```

ServicioSAP (`SolicitudCreditoWebMethods.GetTelefonoValidadoAsync`) delegates this to the API `A_GET_TelefonoValidado`, and keeps the number only if `ZvalTel` is true. The API (`businesspartner-dev/apps/api/routes/A_GET_TelefonoValidado.py`) does:

1. `get_cte_tel(Partner=sCliente)` → `_get_ctetelset(Partner, ZtelCte)` — **all** phones of the BP. No `ZtipoCte` filter, no `Zvaltel` filter.
2. `max(tels, key=(Zfecha, ZfechaCap, ZidcteTel))` — **the most recent phone of any type, validated or not**.
3. Returns that one phone's `ZtelCte` and `Zvaltel`.

`_get_ctetelset` **does** accept a `ZtipoCte` filter (`AS_GET_ZQBP_EditarCliente_CteTel.py:38-39`), but `A_GET_TelefonoValidado` doesn't pass it. There is **no `Zvaltel` filter anywhere** in that GET path.

**Concrete divergence:** customer with a *validated mobile* (Mar-2024) and a newer *landline, not validated* (Jun-2025). SP → `@TelefonoValidado` = the mobile → with a matching SMS, `ValidacionTelefono = 0`. ServicioSAP → the API picks the 2025 landline → not validated → `null` → `ValidacionTelefono = 1`, although the customer has a validated mobile. A smoke test would **not** catch this: the API answers 200 with valid JSON; it just applies a different rule.

**How to fix it — two options:**

- **A. In ServicioSAP (recommended — "the API brings the data, our code applies the rules"):** derive `@TelefonoValidado` from the `CteTelSet` data the method **already reads** for `@ValidacionOrigen` (`GetCteTelAsync`): filter `ZtipoCte = 'MOVIL'` (case-insensitive, the SQL collation was CI) and `Zvaltel = true`, order by `Zfecha` descending with nulls last (SQL `ORDER BY ... DESC` puts NULLs last), tiebreak `ZfechaCap`, `ZidcteTel`, take the first `ZtelCte`. Mirrors the SP, which reads `CteTel` once for both values, and removes one API call (reduces §18.5 #4).
- **B. In the FastAPI:** change `A_GET_TelefonoValidado` to filter mobile + validated before `max()`. Needs the businesspartner-api owner and a deploy.

⚠️ Option A overrides **§15.1** ("`@TelefonoValidado` is resolved by the API, not the C#"). That decision assumed the API applied the SP's rules; the reference code shows it doesn't. **Needs the user's go-ahead.** Also open: whether the *deployed* API matches the repo version (§18.8, question to the businesspartner-api owner).

### 22.5 LAN vs ServicioSAP credit flow comparison — partial, **NOT adversarially verified**

- Workflow `wf_6af6b66d-bd2`: 2 flow maps + 2 deep comparisons (SP insert, article lines) + 55 aligned steps + **44/44 step comparisons done**. Adversarial verification was at **6/88** when it was stopped to save quota.
- **All results saved:** `_IMPLEMENTACION_SP_CREDITO/credit_flow_results_2026-09-25.json` (maps, deep comparisons, aligned pairs, 44 comparisons, 6 verifications). Script: `_IMPLEMENTACION_SP_CREDITO/workflow_credit_flow_comparison.js`.
- Verdicts: **EQUAL 0 · EQUIVALENT 11 · DIFFERENT 22 · MISSING_IN_SAP 10 · ONLY_IN_SAP 1.** 305 non-intentional difference entries (16 critical, 44 high, 91 medium, 154 low) and 46 intentional — heavily duplicated across steps.
- **Root causes, critical and high, deduplicated (candidates until verified):**

| # | Root cause | Status |
|---|---|---|
| 1 | Magento sends the Intelisis account `C...`, ServicioSAP expects a BP. The captured payload CRED515773 (`C01575835`) now answers "no tiene crédito activo en SAP" and inserts nothing; in LAN it succeeded. **No real credit order succeeds today.** | **INTENTIONAL — transitional (user, 2026-09-25).** ServicioSAP already targets the final state: when Magento sends BP accounts (numeric, e.g. `1500008218`), the Intelisis `C...` format is deprecated. **Not a ServicioSAP bug.** Consequences: (a) end-to-end tests must use a BP in `cuenta`, never the captured `C...` payloads as-is; (b) ServicioSAP credit cannot go live before Magento sends BPs, or every credit order fails. **Open question:** during the transition a `C...` account gets *"no tiene crédito activo en SAP"*, which is misleading — the real problem is that it isn't a BP. Check the format first and answer *"not a BP"*? Only if it's a real rule: do all BPs start with `15`, or only the customer range? |
| 2 | New client (empty account, customer id present): LAN wrote nothing, ServicioSAP inserts an application and answers "Concluido" | **INTENTIONAL — new-client flow (user, 2026-09-25).** Empty `cuenta` = new client = a new BP is created in SAP; changing an existing BP uses another API. LAN's setOrder only handled existing `C...` accounts, so "LAN wrote nothing" is not the parity target. **Linked to #3:** the BP is not created in the credit path — `ProcessCreditPaymentAsync` (`OrderMethods.cs:665`) inserts the application with `cliente = '` (its own comment: *"Usamos ID de Magento al no tener BP aún"*) and hands off to the liberador + callback, which are commented out. Until #3 is back, a new-client order leaves an application nothing processes. **Open question:** the new client goes through phone validation as non-prospect (`EsProspecto(null) = false` → `ValidacionTelefono = 1`); the SP gave prospects `0` (`SUBSTRING(cliente,1,1)='P'`). Should a new client count as prospect? |
| 3 | Liberador + Magento callback commented out → order stays `PENDIENTE`. **New:** if uncommented it does not compile (await inside a non-async Thread lambda), its trigger condition is inverted, it sends the Magento customer id instead of the account, and its payload keys don't match the DMZ contract. `creditStatus` and `updateCreditOrderId` don't exist in ServicioSAP | **BLOCKED — waiting on another team's project (user, 2026-09-25).** The liberador service is theirs; the calling block in ServicioSAP is ours and will **not** work by just uncommenting it. **Ours, fixable anytime:** (a) does not compile — `await` inside a non-async `Thread` lambda; (b) callback payload keys do not match the DMZ contract. **Needs their contract:** (c) trigger fires only for new clients, where LAN fired for existing `C...` accounts — may be correct for the new-client flow (#2); (d) sends the Magento customer id instead of an account — for a new client no account exists yet. Proposal: leave (a) and (b) ready, still commented, so enabling it is one change |
| 4 | HTTP status contract: errors that were **500** in LAN are now **200** with an error text (backend failure, transport failure, empty account) | **INTENTIONAL (user, 2026-09-25):** answer 200 so Magento's page never breaks, and make every error visible with a log + exception. **Verified followed** at the top level: `OrderController` `order/new` catch logs the full exception (`Logger.SAP("[ORDER NEW ERROR] ", ...)`) and answers `Ok("Error, " + e.Message)`; its own comment documents it as LAN parity (LAN `OrdersController.cs:156` did `return Ok(e.ToString())`) |
| 5 | Validated phone: the API doesn't filter mobile + `ValidacionTel = 1` | **New** — see 22.4 |
| 6 | Promo code: different database (SigMavi vs Intelisis), a validation gate LAN never had, burn scope differs | 🔴 **Open (verified 2026-09-25).** Process: the promoter code attributes the order to the referring salesperson; the code is reusable. **LAN** (`SpVTASVentaCupon`, `USE [IntelisisTmp]`, SP:115-165): `Elimina` stamps **one** free row (`UPDATE TOP (1)`, `FechaUtilizacion`, `IdEcommerce`), then **always** `NUEVO` inserts a fresh free row for the same code; no validation at this step (it happens at checkout, op `ValidarCupon`). **ServicioSAP** has it: `HandlePromoCodeAsync` (`OrderMethods.cs:1028`). Differences: (a) DB SigMavi `VentasCupones` (`:1039`) vs Intelisis `VTASCVentaCupon`; (b) re-validates at order time — SigMavi free row, else SuccessFactors + AWS catalog `Código de promotor` (`:1054-1075`) — and if invalid records nothing; (c) marks **all** free rows, no `TOP` (`:1095`); (d) a SuccessFactors/catalog failure is swallowed with `Console.WriteLine` (`:1081`) → counts as invalid, nothing recorded, **nothing logged** — breaks the user's "200 + log it" rule, same as #7. Correction: "first use leaves no `IdEcommerce` row" is **not** a difference — LAN's `UPDATE TOP (1)` also matches nothing on first use. **Deciding question (§18.8 SIGMAVI):** are `VentasCupones` and `VTASCVentaCupon` the same coupons (migrated) or two live tables? |
| 7 | Guide save: LAN aborts the order on failure, ServicioSAP swallows it silently; nothing guarantees `servicio_guias` exists | ✅ **OK — works (user, 2026-09-25), parity confirmed.** `servicio_guias` is a **SQLite** table on its own connection, separate from the SQL Server operations. LAN `SaveGuide` (`OrderMethods.cs:735`) does the same `INSERT OR IGNORE INTO servicio_guias (idecommerce, fullname)` on `C:\inetpub\wwwroot\api\data.db` and **never creates the table either** — it is pre-created in the `.db` file (`LAN\data.db`). ServicioSAP declares the path in `SQLITE_DB_PATH` (`Web.config:60`). "Nothing guarantees the table exists" was a false alarm. Optional, not blocking: on a write failure LAN aborted the order (no `try`), while ServicioSAP swallows it (`SQLiteDb.cs` empty catches, `SaveGuideAsync` `Console.WriteLine`) — only matters if the write ever fails |
| 8 | Duplicate order check skipped with a special price | ✅ **FIXED 2026-09-25 (authorized by the user).** ServicioSAP now saves Magento's `forzarOrder` before `ToArray` (`OrderMethods.cs:1744`) and the duplicate check uses it (`:1756`), exactly as LAN `SetPedido` `:536-541`. MSBuild 0 errors. Full `SetOrderAsync` vs `SetPedido` comparison in §22.7 |

### 22.6 How to continue when the quota resets

- **Same Claude session:** `Workflow({scriptPath: "<session>/workflows/scripts/credit-flow-lan-vs-serviciosap-wf_6af6b66d-bd2.js", resumeFromRunId: "wf_6af6b66d-bd2"})` — the maps, the deep comparisons, the alignment and the 44 comparisons replay from cache; only the 82 remaining verifiers, the critic and the synthesis run.
- **New session** (`resumeFromRunId` is same-session only): run a verify-only workflow that reads `credit_flow_results_2026-09-25.json` and applies the two lenses (skeptic of equality, skeptic of difference) to each comparison. To save quota, verify the **critical and high** differences first (60 entries, ~8 root causes) and skip the low ones.


### 22.7 `SetOrderAsync` vs LAN `SetPedido`, block by block — 2026-09-25

> User rule: *"the logic of the business needs to be the same as LAN legacy; the flow of `SetOrderAsync` needs to be like LAN `SetPedido`."* Both methods read end to end: LAN `Metodos\OrderMethods.cs:533-733`, ServicioSAP `Methods\Order\OrderMethods.cs:1728-1959`. Line numbers are after today's `forzarOrder` change.

**✅ Change applied (authorized by the user): `forzarOrder`.** ServicioSAP now saves Magento's value before `ToArray` (`:1744`) and the duplicate check uses it (`:1756`), exactly as LAN `:536-541`. MSBuild: 0 errors, same 11 pre-existing warnings. Root cause #8 of §22.5 is **FIXED**.

| # | Block | LAN `SetPedido` | ServicioSAP `SetOrderAsync` | Verdict |
|---|---|---|---|---|
| 1 | Group quantities by SKU | `:535` | `:1740` | ✅ Same |
| 2 | Save Magento's `forzarOrder` | `:538` | `:1744` | ✅ Fixed 2026-09-25 |
| 3 | `ToArray` (flips `forzarOrder` on special price) | `:539` | `:1745` | ✅ Same |
| 4 | Duplicate check | Intelisis `Venta` by `IdEcommerce` | SAP SD36 by `PurchNoC` (`:1756`) | ✅ Same rule; source SAP (intentional) |
| 5 | Openpay → save for validation, exit | only if `!liberado` (`:545`) | always (`:1771`) | 🔴 No `liberado` — see A |
| 6 | Openpay Stores → save, continue | `:551` | `:1782` | ✅ Same |
| 7 | Pick the SP by `forzarOrder` | `:557-565` | — | ✅ Intentional — no SP in SAP |
| 8 | Stage order lines (`detallePedido`, blank agent, pickup flag) | `:568-601` | — | ✅ Intentional — staging for the Intelisis SP; SAP receives lines in the OData payload |
| 9 | Save the guide | every payment method, before creating the order (`:606`) | credit at branch start (`:1791`); cash after stock/partner checks (`:1843`) | ⚠️ Timing differs for cash — see C |
| 10 | Credit branch | `:609-650` | `:1789-1811` | See §22.5 |
| 11 | Restore agent | `:652` | `:1849` | ✅ Same |
| 12 | Pickup `setNameToReference` | before the order — patch for the SP (`:657`) | after the SAP order (`:1923`) | ✅ Intentional — SP reason gone |
| 13 | Create the order | `crearPedido` → Intelisis `Venta` (`:662`) | `BuildSapOrderAsync` → SAP OData (`:1852`) | ✅ Equivalent |
| 14 | CRED id → `UpdateIdEcommerceEnVenta` | `:666-671` | — | 🔴 Missing — liberador flow, blocked with #3 |
| 15 | Delivery data | `:686` | `:1929` | ✅ Equivalent (SAP OData) |
| 16 | Pickup code + email for bank transfer | `:689-702` | — | 🔴 Missing — see B |
| 17 | Wallet + `afectar` (Openpay/PayPal) | `:715-716` | wallet only (`:1942`) | ✅ `afectar` posts the Intelisis `Venta`; not needed for a SAP order. The ported `afectar` (`:1542`) has no caller — dead code |
| 18 | — | — | `setCAccount` webhook to DMZ (`:1948`) | New in SAP |
| 19 | Price, stock, region, partner checks | inside `SP_eCommerceNuevoPed` | explicit in code (`:1824-1837`) | ✅ SP logic moved to code |
| 20 | Error handling | log and swallow (`:728`) | rethrow → controller logs + 200 | ✅ Intentional — decision #4 |

**Possible changes — all in the cash path, awaiting the user's decision:**

- **A. Openpay orders never reach SAP (most important).** LAN job `OpenpayMethods.CheckStatus` (`:70`) checks pending Openpay payments and, when paid, calls `SetPedido(order, liberado: true)` with `forzarOrder = "1"` (`:271-276`); `liberado` skips the validation exit so the order is created. ServicioSAP has no `liberado` parameter and no job: an Openpay order is saved for validation and nothing ever creates the SAP order. Same as §7d ("biggest gap in the cash flow"). Two parts: `liberado` in `SetOrderAsync` (small), port of the job (large).
- **B. Bank-transfer pickup orders get no pickup code.** LAN generates the code and emails the customer inside `SetPedido` for `instore_pickup` + `banktransfer` + agent (`:689-702`) — bank transfer has no payment callback to trigger it later. ServicioSAP has the `createStorepickupCode` route but `SetOrderAsync` never calls it.
- **C. Guide saved later for cash.** LAN saves it for every order before creating it; ServicioSAP after the stock and partner checks. If a stock check fails, LAN has a guide row and ServicioSAP doesn't. Low impact.
- **D.** `UpdateIdEcommerceEnVenta` for CRED ids — blocked with #3, no change now.


### 22.8 Open decisions and pending items — single list (as of 2026-09-26)

**Decisions for the user:**

| # | Decision | Where | Options |
|---|---|---|---|
| 1 | Column widths `MetodoEnvio` varchar(12) and `sexo` varchar(9) | §22.3 | Truncate in C# like LAN (`tablerate_be`, `NO ESPECI`) · or `ALTER TABLE` (manual / DBA) |
| 2 | Validated phone: move the SP rule (mobile + validated + most recent) into C# | §22.4, root cause #5 | Yes — overrides §15.1 · or fix the FastAPI (businesspartner-api owner) |
| 3 | Account format during the Magento transition | root cause #1 | Check that `cuenta` is a BP and answer *"not a BP"* instead of *"no tiene crédito activo en SAP"* · or leave it (harmless once Magento switches). If yes, which rule: all BPs start with `15`, or only the customer range? |
| 4 | Brand-new client in phone validation | root cause #2 | Treat as prospect (`ValidacionTelefono = 0`, as the SP did for prospects) · or keep non-prospect (`1`) |
| 5 | A — Openpay orders never reach SAP (cash) | §22.7 | Add `liberado` to `SetOrderAsync` (small) · port the `CheckStatus` job (large) · leave out of scope |
| 6 | B — bank-transfer pickup code (cash) | §22.7 | Add it · leave out of scope |
| 7 | C — cash guide saved after the stock/partner checks | §22.7 | Move it before, like LAN · leave it |
| 8 | Guide save failure swallowed (optional) | root cause #7 | Log + throw (in `SQLiteDb` shared, or only the guide) · leave it — it works |

**Waiting on others:**

| Item | Who | Where |
|---|---|---|
| Are SigMavi `VentasCupones` and Intelisis `VTASCVentaCupon` the same coupons? | SIGMAVI (§18.8) | root cause #6 |
| Liberador + Magento callback | other team's project | root cause #3 |
| Magento sending BP accounts instead of `C...` | Magento | root cause #1 |

**Pending work on our side:**

- Finish the adversarial verification of the comparison (§22.6) — only root causes #5 and #6 still need it; the rest were resolved with the user.
- B3 smoke test of the 4 APIs (only `GET`, no database).
- B6–B9 of §18.6 once the decisions above are made.


## 23. Session 2026-09-26 (weekend shift, day 1) — `SAP_BASE_URL`, credit parity re-verification, testability

### 23.1 `Web.config`: `SAP_BASE_URL` removed (asked by the user)

- `SAP_BASE_URL` (`https://10.30.2.135:44300/sap/opu/odata/sap/`) and `obtenerUrl(ENVIROMENT_DEV, SERVICE_URL)` (`https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap`) are the same server: the hostname resolves to `10.30.2.135`, same port and path.
- The line was deleted from `Web.config` (uncommitted, 1 line; BOM/CRLF kept; XML valid). Every SAP URL is now built only from `obtenerUrl`; the `ZAPI_*` keys hold only relative service paths.
- History: the last real use was the DM07 branch lookup in `OrderMethods.cs` (`AppSettings["SAP_BASE_URL"] + "/sap/opu/odata/sap/ZAPI_SUCURSALES_SRV/..." sap-client=050`), replaced by commit `70b254c` (2026-08-27) — today `AccountMethods.cs:190`, `obtenerUrl` + `sap-client=110`. Unused field declarations in `FinalListProperMethods`, `SalesMethods`, `WalletCustomerMethods` were removed by `ac9449b` (2026-09-10).
- Current branch: 0 references in `.cs`, 0 in the 45 compiled DLLs (incl. `Conexion.dll`), 0 in DMZ and LAN. Only leftover: `bin/ServicioSap.dll.config` (stale build copy, not read by the web app).
- Other branches: `origin/stage` (07-15), `migracionSAP-SD46` (07-17) and local `stage-sap` (08-20) still read it for the old branch lookup (would throw `NullReferenceException` without the key). `origin/stage-sap`, `origin/SAP_INTEGRATION_JAVI`, `origin/dbAndroid` (09-08) only have unused fields. The current branch contains all of `origin/stage-sap` + 31 commits.

### 23.2 Environment facts checked from Claude's machine (CATECINF214119D)

- IIS Express installed (x64/x86). TCP reachable: SAP `10.30.2.135:44300`, SQL `mavicbosandroid.grupomavi.com:1433`, `businesspartner-api`/`android-api`/`salesanddistribution-api`/`configuraciones-api` `.mavi.fun:443`, AWS `54wblyc2h6...:443`, `kdll3fhcyo-lan.grupomavi.com:443`, liberador `172.16.215.51:3026`. (Connection test only, no data sent.)
- `bin\ServicioSap.dll` and `obj\Debug\ServicioSap.dll` on the share were rebuilt at 2026-09-26 08:21:56. **Not** by Claude: the workflow transcripts contain no build command (only a read of the `.sln`/`.csproj`). Probably the user's VS or the other Claude session — confirm before testing that the binary matches the working tree.

### 23.3 Credit parity re-verification — verdict

Workflow `wf_1057942c-a8b` (6 area verifiers + testability analyst + synthesizer, read-only). Full result: `_IMPLEMENTACION_SP_CREDITO\credit_parity_2026-09-26.json`.

- **Structure matches LAN:** group by SKU, `cantidad,sku` list + `SEGU00001`, SMS lookup, validated-phone lookup, existence-only credit gate (no balance check in either — §16 confirmed, LAN `checkSaldo` always 0), 59-column header INSERT + `SCOPE_IDENTITY`, faithful three-valued port of the `ValidacionTelefono` IF (SP `:210-221` ↔ `SolicitudCreditoWebMethods.cs:312-328`), line pricing with `DescuentoCategoria` CEILING, `Orden` numbering, duplicate-SKU skip, promo burn after lines, same partial-failure outcome.
- **Business behavior not yet equivalent:** one hard blocker (Q1) + data divergences (Q4-Q19) + 8 bugs (§23.5).
- **Testability: YES after prerequisites.** Only entry point `POST order/new`. `order/testnew` is NOT a credit harness (posts a raw SAP sales order, skips `SetOrderAsync` — do not use). No test project; Fakes not wired. The credit path makes no SAP writes and calls no webhooks; it writes 1 header + N lines to `ServicioAndroid` and 1 SQLite guide row. `sap.log` has 12 lines (July cash orders + one BP creation on 09-17), no credit entries.

### 23.4 What must be defined — consolidated list (supersedes the decision part of §22.8)

| Q | Rel. | Blocks test | Decision | Recommendation |
|---|---|---|---|---|
| Q1 | D1 | **yes** | Widths: `MetodoEnvio` varchar(12) (`tablerate_bestway` 17, `instore_pickup` 14) and `sexo` varchar(9) (`NO ESPECIFICADO` 15) raise 8152. Size every VarChar parameter to the real column width (LAN cut at the SP parameter) or `ALTER`? Sub-choice: `sexo` for empty Gender | Size every parameter to the DDL width; `sexo` = `''` for empty Gender, `NO ESPECI` for other codes (LAN values). Needs the full DDL widths of `CRED_SOLICITUD_WEB_DATOS_TEMP` and `VTASdArtCreditoWeb` |
| Q2 | NEW | **yes** | Is `mavicbosandroid/ServicioAndroid` production? Non-prod copy (local switch of `Web.config:13`) or written acceptance of test rows + who deletes them | DBA answer before any positive run |
| Q3 | NEW | yes (phone cases) | AWS catalog `ORIGEN VALIDACION NUMERO CTE` registered? Which `ZappOrig` does e-commerce write? `GetConfiguracionCatalogoAsync` throws on non-2xx/empty body | First runs with a BP without validated phone (skips the catalog) |
| Q4 | D2 | no (blocks expected value P4/P5) | One C# helper with LAN's rule (MOVIL + Zvaltel + newest Zfecha, nulls last) for BOTH `@TelefonoValidado` and `IsValidatedAsync`; cut `ZtelCte` to 10 digits? | Yes, both lookups; `ZappOrig` check only in `@ValidacionOrigen` |
| Q5 | NEW | no (P14) | Payment condition not resolved: today header written, no lines, `Concluido`. Resolve before the header and answer `Error, ...`? | Resolve first |
| Q6 | NEW | no | Does SIGMAVI `CondicionesCredVtaLinea` have `CondicionMagento`, and does `Condicion` hold SD29 codes (12IA/12IV)? | User runs `SELECT TOP 20 *` on SIGMAVI |
| Q7 | W1 | no (promo tests) | Coupon source of truth: `VentaCupon` / `VentasCupones` / `IntelisisTmp.VTASCVentaCupon`; DDL, migration, Centro numbering, promoter code format | Ask SIGMAVI + Magento/HR; `codigo_promotor` empty in tests |
| Q8 | W1 | no | Burn rules: LAN (no gate at order time, stamp only newest free row, always regenerate) vs ServicioSAP (gate, stamp all free rows) | LAN parity after W1 |
| Q9 | NEW | no | NIP SMS (`credit/getSms`, `validateSms`): move to ServicioSAP or stay in LAN with BP→Intelisis mapping? | Port with the Q4 helper before Magento sends BPs |
| Q10 | NEW | no | Short/invalid phone: LAN wrote no row; ServicioSAP inserts placeholders (lada 0, `''`, `'0'`) | Throw with a clear message |
| Q11 | NEW | no | No `Birthdt`: NULL today; LAN web customers carried `1900-01-02` | `1900-01-02` unless Credit accepts NULL |
| Q12 | D4 | no (P11) | Brand-new client / `ZtipoCliente ''` → `ValidacionTelefono` 1 or 0? | Keep 1 unless Credit says prospect |
| Q13 | R2 | no | New-client row: set `ClienteMagento` = Magento customer id? | Set it |
| Q14 | NEW | no | `estadoCivil` `''` (only store-registered customers lose it) or map `Marst` | Accept `''`; ask Credit |
| Q15 | NEW | no | `origen`: Magento248 does send `infoCliente.origen` (corrects §19.3). Keep `PRODUCTOS MX` fixed or pass through? | Ask Magento/app owners |
| Q16 | NEW | no | SD29: several rows for SKU+OrgVtas+condition — which one prices the line? | Decide after a real SD29 capture |
| Q17 | NEW | no | TELEFONIA region SKU substitution (Region5/6): port or drop formally? | Record as explicitly deferred |
| Q18 | NEW | no | `VTASdArtCreditoWeb.costo` always 0; port `spVerCosto`? (`spVerCosto.sql` damaged) | Open; ask the liberador owner |
| Q19 | NEW | no | `nombre` = `NameFirst + ' ' + Namemiddle` (like `CTE.PersonalNombres`)? | Concatenate |
| Q20 | D3 | no | Account-format check + stop reporting SAP/transport failures as "no tiene crédito activo" | Yes (see bug B2) |
| Q21 | NEW | no | Confirm §16.5 option A (no balance validation) as final | Record as decided |
| Q22 | NEW | no | `costoEnvio` 0 or negative → no `SEGU00001` line | Accept as intentional |

### 23.5 Bugs on the credit path (independent of decisions)

| # | Sev. | Where | Bug | Conf. |
|---|---|---|---|---|
| B1 | high | `FinalListProperMethods.cs:85` | SKU interpolated raw into the SD29 `$filter` (no escaping); `DIB+00104` may be read as a space → line silently missing. `WalletMethods.cs:173` escapes | plausible |
| B2 | medium | `OrderMethods.cs:776` | `CheckClientCreditAsync` swallows every exception (Console only) → SAP/transport failures reported as "no tiene crédito activo" | confirmed |
| B3 | medium | `OrderMethods.cs:1109` | `HandlePromoCodeAsync` commits the burn UPDATE, then an unguarded agent lookup; on failure the regeneration INSERT never runs and the error goes to Console | confirmed |
| B4 | medium | `OrderMethods.cs:1801` | New-client flow runs the SMS lookup with `@Cliente=''` and the value reaches `LadaValidar/TelefonoValidar` | plausible |
| B5 | medium | `OrderMethods.cs:672` | Guest detection tests blank `cliente`; Magento248 sends `(int)customerId` = `0` for guests → guest treated as new client | plausible |
| B6 | low | `OrderMethods.cs:708` | Promo result (`OK`/`NO_VALIDO`/`err`) discarded; failures only to Console (LAN logged to file) | confirmed |
| B7 | low | `OrderMethods.cs:655`, `:608` | `IsValidatedAsync` / `ObtenerNumeroTablaSmsAsync` swallow errors (Console only); LAN logged them | confirmed |
| B8 | low | `Helpers/Logger.cs:28` | `Directory.CreateDirectory` outside try; called from catch blocks | plausible |

Out of scope, flagged: cash path reads `sDatosPedido[20]` as postal code at `OrderMethods.cs:1820` while `ToArray` puts `estado` there — not verified.

### 23.6 Corrections to earlier notes

- §22.5 #6 ("first use leaves no IdEcommerce row in LAN either") is **wrong**: LAN `SpVTASVentaCupon` `ValidarCupon` (`:60-106`) inserts the first free row via `NUEVO`, and `Elimina` stamps it.
- §19.3 ("Magento does not send `origen`") is **wrong**: `OrderManagement.php:705-708` sets it when the payment additional data carries it.
- §16 confirmed: no balance check in LAN either.
- `A_GET_TelefonoValidado` null dates: replaced by `'00000000'` (`AS_GET_ZQBP_EditarCliente_CteTel.py:60-62`), not `str(None)`; undated phones still win the ordering.
- Magento ignores the `setOrder` body for any HTTP 200 (`CreditoOrderManagement.php:53`); credit errors are visible only in `sap.log`.

### 23.7 Test plan (ordered; the user runs every SQL and approves every write)

Read-only, can start now: (1) confirm the binary matches the working tree (08:21 rebuild); (2) paste full DDL widths; (3) §22.3 `MetodoEnvio`/`sexo` GROUP BY; (4) SIGMAVI `CondicionesCredVtaLinea`; (5) GET `A_GET_TelefonoValidado` + AWS catalog; (6) SAP smoke GETs through ServicioSAP (`partner/client/{BP}`, `partner/client/ma/{BP}`, `order/checkDocument/...`, `product/catalogo/{nombre}`) with IIS Express + JWT; (7) SD29 with raw `+` vs `%2B` for `DIB+00104`; (8) SMS SELECTs for the QA BP.
After decisions: (9) apply Q1, rebuild; (10) non-prod DB (Q2).
Writes, with go-ahead: (11) negative tests (`C...` account, unknown BP, empty cuenta+cliente); (12) optional 8152 proof; (13) positive P2 MA (costoEnvio 0, no promo, BP Gender 1/2 without validated phone, SKU with 12IA); (14) P3 VIU (costoEnvio 150, `+` SKU, 12IV); (15) phone cases P4/P5 (needs Q3, Q4); (16) P14 condition not found (Q5); (17) P11 new client (Q12, Q13); (18) promo (Q7, Q8); (19) cleanup by `idMagento`; (20) E2E with Magento — not possible until R1/R3.

### 23.8 Q1 applied — "do it the same way as LAN" (user, 2026-09-26)

Uncommitted, MSBuild VS18: 0 errors, same 11 pre-existing warnings. Verified by 3 adversarial agents (`wf_e45d1280-76d`): all 57 parameters match the SP in name, type and width; the 3 low findings they raised are fixed below.

- **`SolicitudCreditoWebMethods.InsertarSolicitudAsync`**: every VarChar parameter has `Size` = the `VARCHAR(n)` of the `SP_CREDITO_WEB_DATOS` parameter (`:94-159`). `SqlParameter.Size` cuts silently on the client, as the SP cut on assignment. Examples: `MetodoEnvio` `tablerate_bestway` → `tablerate_be` (12), `sexo` `NO ESPECIFICADO` → `NO ESPECI` (9), `nombre` 25, `direccion` 30 (column holds 100, LAN cut to 30), `email` 50, `idMagento` 12.
- **Exception `@cliente` = 10** (SP `VARCHAR(9)` fitted the Intelisis account `C...`; a BP has 10 digits and the column is varchar(10); cutting to 9 would store `150000821`).
- **`SexoLegado`**: empty/null `Gender` → `''` (LAN: `CTE.Sexo` NULL arrived as `''`, `CreditMethods.cs:837`). `1` Masculino, `2` Femenino, other codes → `NO ESPECI`.
- **Phone comparison**: `TelefonoValidado` and `TelefonoAValidar` are cut to 10 before `DistintoSql`, like the SP's `VARCHAR(10)` locals (`:165-166`). New helper `Recortar`.
- **Credit lines (`OrderMethods.InsertCreditArticlesAsync`)**: `@Articulo` `Size` 20 and the SD29 price lookup uses the SKU cut to 20 (`SpVTASInsertArtSolCreditoLinea @Articulo VARCHAR(20)`); the duplicate-SKU skip and the `SEGU00001` check stay on the full SKU, as LAN did them in C#.
- Still unknown: widths of the columns not in §22.3 and all `VTASdArtCreditoWeb` widths. A column narrower than its SP parameter would fail in LAN too (same behavior).

**Raised, not changed (user to decide):**
- SAP `Gender` domain: ServicioSAP assumes `1` = male, `2` = female (`MapGender`, `SexoLegado`). Standard S/4HANA is `1` = female, `2` = male (`0` unknown, `9` non-binary). Confirm with one BP of known sex.
- BPs auto-created from an order without `sexo` get `Gender "1"` (`OrderMethods.cs:2670`), so their credit applications store `Masculino` where LAN stored `''` (pending item §17.4).
- `SexoLegado` writes mixed case (`Masculino`); LAN web customers had `UPPER` (`SP_eCommerceCtenuevo.sql:132`). Matters only to a case-sensitive reader (none found).

### 23.9 Decisions log — 2026-09-26 (updated as the user answers)

| Q | User's answer | Status |
|---|---|---|
| Q1 | "Do it the same way as LAN; we can change it later" | ✅ Applied (§23.8) |
| Q4 | "The phone validation is NOT in the BP; it is the other API (A_GET_TelefonoValidado). IsValidatedAsync via BP05 is wrong" + "COFETEL validates that the number is REAL; ZvalTel is the internal system validation — two different validations" | ✅ Applied: single source `SolicitudCreditoWebMethods.GetTelefonoValidadoAsync` (A_GET_TelefonoValidado, `URL_BP_API`; returns `ZtelCte` only if `ZvalTel` true) for all three lookups: (1) `@TelefonoValidado` → ValidacionTelefono (already), (2) `OrderMethods.IsValidatedAsync` → LadaValidar/TelefonoValidar (was BP05MA `to_CteTel` + MOVIL + ZappOrig, first in list; errors now to sap.log instead of Console), (3) credit/getSms (was CteTelSet + LAN rule; keeps LAN's 10-character check). Helper `TelefonoValidadoLan` removed; `GetCteTelAsync`/`FechaSap` back to private. Compiles. MOVIL filter lives in the API (user: the deployed API filters MOVIL; the share copy `A_GET_TelefonoValidado.py:19-30` does not) |
| Q5 | "No payment condition → stop at the start of the order, before consuming APIs; the value must always be in the body" | Proposal sent (validate + translate at the start of the credit branch); awaiting go-ahead |
| Q8 | "Promo coupons are deprecated — side effects if removed?" | ℹ️ Answered (`_IMPLEMENTACION_SP_CREDITO\promo_removal_2026-09-26.json`). **A — remove only the burn** (`OrderMethods.cs:705-709`): no change to flow, response or logging (result was discarded; errors swallowed); fewer external calls; closes Q8, B6, B3 on credit. Only data effect: SigMavi `VentasCupones` no longer stamped/regenerated = promoter attribution of credit web orders lost (no reader found in any repo; commissions/reports outside repos unknown). **B — also delete `HandlePromoCodeAsync` + `GET order/validatecupon`**: breaks no live caller (DMZ/Magento never call it). `CouponModels.cs` is already dead. **Must keep**: SigMavi connection (payment condition), `URL_BP_API`, `GetConfiguracionCatalogoAsync`, `OrderRequest.Agente` (cash). **Outside ServicioSAP**: Magento checkout still requires an exact "OK" from DMZ `credit/codigoPromocion` when the promoter box is ticked; the working-copy DMZ points `URL_INTELISIS` to ServicioSAP `localhost:44399`, which has no such route → those customers would be blocked. Recommendation: A now, B after Magento removes the promoter box. Awaiting go-ahead |
| Q9 | "NIP SMS must be the same as LAN" / "if it is Android DB, make the same flow" | ✅ Coded 2026-09-26, compiles (0 errors, 11 old warnings); verified by 3 agents (`wf_47a27d50-9a7`): every branch of the decision tree matches LAN in return value and rows written; contract (routes, auth, binding, JSON-string answer, 400/500) OK. Fixed after the check: `GetIdRefAsync` parameterized (was `string.Format`; also used by SendSmsNewNumber), `ExistingCustomerAsync` returns false for a non-alphanumeric account before calling SAP (the `$filter` of `GetClientAsync` is not escaped), phone tie-break by numeric `ZidcteTel`. Open: PATCH ZidMagento failure on an existing BP gives -1 (no SMS) where LAN's UPDATE could not fail — user decision. 7 of 10 LAN steps are Android DB (`sCadenaConexionAndriod`) → same SQL; the 3 Intelisis steps → SAP: `Cte` exists → `GetClientAsync`, `Cte.IDMagento` → `LinkMagentoAccountAsync` (PATCH ZidMagento, after the existence check), `CteTel` → A_GET_TelefonoValidado (`GetTelefonoValidadoAsync`, same source as the order; + LAN's 10-char check) — changed from CteTelSet by the user's Q4 answer. Routes `credit/getSms`, `credit/validateSms` in `CreditController`; `SmsNipModels.cs` (+csproj). DMZ NOT switched (still LAN) — switch with the Magento BP release. Tests that send a real SMS need go-ahead. Spec: `SPEC_NIP_SMS_SERVICIOSAP.md` |
| Q11 | "Do it like LAN if they have a fallback" | ✅ Applied: LAN always saved `1900-01-02` for e-commerce customers (`SP_eCommerceCtenuevo.sql:140`, 12/12/2018). `ArmarFila`: `FechaSap(Birthdt) ?? req.FechaNacimiento ?? 1900-01-02` (`FechaNacimientoPorDefecto`). Compiles (0 errors, 11 old warnings). LAN's crash for store customers with NULL birth date is not copied |
| Q13 | "No — the BP already gets ZidMagento at creation; we don't need ClienteMagento" | ✅ Closed, no change: `ClienteMagento` is only a column of `CRED_SOLICITUD_WEB_DATOS_TEMP`; LAN never passed `@ClienteMagento` (NULL) and ServicioSAP sends NULL too. `ZidMagento` is set on the BP at `BusinessPartnerMethods.cs:609` |
| Q14 | "Where do you see estadoCivil? The BP already has a value" | ℹ️ `estadoCivil` = credit-row column (`VARCHAR(11)`); LAN filled it from Intelisis `CTE.EstadoCivil` text (`CreditMethods.cs:847`); ServicioSAP writes `""` (`OrderMethods.cs:821`). SAP has it as BP05MA `Marst` (code) and ZB_DATOS_CLIENTE `EstadoCivil` (`Partner.cs:259`, format unknown — no capture with a value). BP creation hardcodes `Marst` = "2" from orders (`OrderMethods.cs:2677`) and "1" from setCustomer (`BusinessPartnerMethods.cs:486`). Proposal pending: fill from the BP like LAN once one real response shows the format |
| Q17 | "It is something to do, but not defined yet" | ⏸️ Deferred: TELEFONIA region SKU swap (Region5/Region6) not ported until the business defines it |
| Q20 | "If LAN does it as a business rule, replicate it" | ℹ️ LAN has **no** account-format check in the credit order: the regex `^[C]{1}[0-9]{8}$` (LAN `CreditController.cs:22`) is only used by `getClienteFactura`/`getClienteSaldo` (`:75`, `:104`). → No format check added. Customer check: LAN `checkCliente` (`CreditMethods.cs:725`, SP `SpCREDIDatosSolicitudCreditoArt` 'CheckCliente') swallows every error (empty catch `:758`) and returns false → `ProductosCreditoWeb_SaveData` returns "sin cuenta" (`:257`) with no log, and `SetPedido` ignores it and answers the account (`:648`). ServicioSAP `CheckClientCreditAsync` (`OrderMethods.cs:768-781`) also turns SAP errors into false, then throws "no tiene crédito activo" (`:681-682`), which the controller logs. Business behavior already equivalent (stop, write nothing). Offered: log-only fix (R4) so sap.log tells a SAP error from a missing BP — awaiting yes/no |
| Gender | "1 male, 2 female; it always comes with the order — if empty, 1 by default (can change later); use MapGender's final value" | ✅ Applied: `BusinessPartnerMethods.MapGender` empty → "1" (was ""; affects BP creation from setCustomer `:482`; the order path `OrderMethods.cs:2673` already defaulted to "1"). `SolicitudCreditoWebMethods.SexoLegado` uses the same codes: "" or "1" → Masculino, "2" → Femenino, other (MapGender "3", store codes like "9") → NO ESPECIFICADO → cut to NO ESPECI. Supersedes the §23.8 sub-choice (sexo '' for empty) and closes §17.4. Compiles (0 errors, 11 old warnings) |

## 24. Session 2026-09-27 — re-analysis with the user's decisions of 2026-09-26, testability, information needed

_Workflow `wf_9e64e941-f15` (8 read-only agents + synthesizer; ground truth = R1–R8 + §23.9). Full result: `_IMPLEMENTACION_SP_CREDITO\credit_recheck_2026-09-27.json`. Code state: uncommitted, last edit 2026-09-26 17:43; the share `bin\ServicioSap.dll` (09-26 08:21) is OLDER than the code — the current build is `X:\ServicioSAP\...in\ServicioSap.dll` (17:43:38)._

### 24.1 Parity by area

| Area | Status | Detail |
|---|---|---|
| Entry point, HTTP answer, error contract (OrderController.SetOrder :16-48 vs LAN OrdersController.Set :137-161) | EQUAL_EXCEPT_DECIDED | Both answer HTTP 200. ServicioSAP logs [ORDER NEW ERROR] and answers "Error, ..." (R4). Magento reads only === false and the HTTP status, so it reacts the same way to both. What is missing is LAN's INFO log of the request and response: a successful credit order writes nothing to sap.log (see the logging question). |
| Group by SKU, forzarOrder saved before ToArray, duplicate check | EQUAL_EXCEPT_DECIDED | R6 is fixed (OrderMethods.cs:1716-1722). The duplicate check is SD36 by PurchNoC (:1732, R7). For credit it can never match, because credit never creates a SAP document; in LAN, the SP Insert branch also had no idMagento guard. The only real protection against a resend is Magento's quote is_active check (409). |
| Shipping guide save (SQLite) | EQUAL_EXCEPT_DECIDED | R5. It is the first statement of the credit branch (:1767), before any credit work, as in LAN (:603-606). Errors are swallowed in both. |
| Article list 'cantidad,sku' plus SEGU00001 | EQUAL_TO_LAN | LAN uses a text rule (!= "0" && != ""), ServicioSAP uses decimal > 0 (:1774-1775). Magento sends (float)number_format (OrderManagement.php:700, :1002-1005). The captured payloads carry "costoEnvio":"0" and "150" (magento_payloads.md:26, :55). The two rules would only differ for "0.00" or a negative value, and neither has been observed. Q22 can be closed. |
| SMS phone lookup numeroDelSms (ObtenerNumeroTablaSmsAsync :589-613) | GAPS_BUGS | Same SQL on the same Android DB, now parameterized. Two bugs: errors go only to Console (:610) and never reach sap.log, and the new-client path runs the lookup with Cliente = '' (:1777). Unlike LAN, ServicioSAP writes that result into the row. |
| Validated phone source (Q4): numeroValidado, @TelefonoValidado, getSms phone | GAPS_PENDING_DECISION | Applied as decided: all three read GetTelefonoValidadoAsync (A_GET_TelefonoValidado), at SolicitudCreditoWebMethods.cs:389, OrderMethods.cs:625 and CreditMethods.cs:357. One issue remains, and it lives in the API. The share copy picks max() over ALL phones and returns that phone's Zvaltel. Undated phones become '00000000' (AS_GET_ZQBP_EditarCliente_CteTel.py:60-62), which sorts above '/Date(..)/', so an undated phone wins. LAN picks the newest VALIDATED Movil, with NULL dates last. Whether the deployed API behaves like the share copy is NO EVIDENCE, and it decides the expected test values. Since Q4 the same GET also runs twice per order. |
| Customer classification and existence (guest / new client / existing BP) | GAPS_BUGS | R1, R2 and R4 are applied (:642-657, CheckClientCreditAsync :741-754). Bug: Magento sends cliente = (int)customerId, so a guest arrives as "0", not blank, and is classified as a new client (:645). Q20, the log text that would separate 'BP not found' from 'SAP failed', is still pending. |
| Credit balance check | EQUAL_TO_LAN | LAN's checkSaldo always returns 0 and SetPedido discards the result; ServicioSAP has no check. FLUJO §5.1 records the opposite decision, which is stale (see doc corrections). |
| Request row CRED_SOLICITUD_WEB_DATOS_TEMP (59 columns) | GAPS_PENDING_DECISION | Same 59 columns, same order, SCOPE_IDENTITY. Q1 widths are applied: all 38 VarChar sizes equal the SP widths, with @cliente at 10. Q11 (1900-01-02), the Gender rule on the BP path, R1, Q13 and R7 (BP05MA master) are applied. Open: nombre = NameFirst only (Q19); estadoCivil is always '' (Q14); origen is fixed to 'PRODUCTOS MX' while Magento can send it (Q15); a short phone inserts placeholders where LAN wrote no row (Q10); new-client rows store sexo '' (low bug, from yesterday); mixed-case sexo. |
| ValidacionTelefono logic (SP prologue ported to C#) | GAPS_PENDING_DECISION | The three-valued IF, @ValidacionOrigen (CteTelSet x AWS catalog, R7), @TelefonoAValidar and the 10-character cut are equivalent. Open: Q4 residual (the API's selection rule), Q3 (an unregistered AWS catalog makes the order fail, where LAN inserted with 1), Q12 (a new client gets 1). |
| Payment condition (Q5/Q6) | GAPS_PENDING_DECISION | Q5 is decided but NOT applied. The condition is translated only inside InsertCreditArticlesAsync (:848), after SD36, the guide, both phone lookups, the BP reads and the header INSERT. The throw at :850-853 is swallowed at :684-690, so the result is an orphan header, 0 lines and 'Concluido'. Q6: GetCondicionAsync (:3313-3315) selects Condicion WHERE CondicionMagento, while GetPlazosAsync reads the same SIGMAVI table through the legacy columns CondicionPropre/TiendaVirtual/Mensualidades (CreditMethods.cs:28-31, :70-73). LAN's legacy Condicion held the Magento text. |
| Article lines VTASdArtCreditoWeb (pricing, Orden, SKU cut, CEILING) | GAPS_BUGS | Same structure: consecutive-duplicate skip, Orden gaps, CEILING discount, SEGU00001 at shipping price with Abono 12, SKU cut to 20 (Q1, verified at :883 and :919). Bug B1 (high, verified): the raw SKU goes into the SD29 $filter (FinalListProperMethods.cs:85). Open: Q16 (first SD29 row vs LAN's fan-out), Q18 (costo always 0), '05 M P DIF' missing from the fallback catalog. A skipped SKU is logged only to Console. |
| Promoter coupon burn (Q8) | GAPS_PENDING_DECISION | Still active at ProcessCreditPaymentAsync :678-682 (HandlePromoCodeAsync). The rules differ from LAN: it stamps every free row, and if the agent lookup fails it can burn without regenerating (low bug). Option A (delete :678-682) is recommended and not applied. |
| Liberador thread, Magento callback, validateCredit/creditStatus/updateCreditOrderId routes | BLOCKED_OTHER_TEAM | R3. The block is commented out at :692-730. As written it targets the opposite population to LAN: it runs for new clients only, sends the Magento id, sits after the catch that swallows line failures, and its await inside a non-async Thread lambda would not compile. |
| Success response | EQUAL_EXCEPT_DECIDED | LAN returns the cuenta string. ServicioSAP returns {BP, SalesDocument:null, Message:"", Resultado:"Concluido"} (:1782-1787). Magento ignores the body of any 200. |
| Error visibility on the credit path (R4) | GAPS_BUGS | Console-only in ObtenerNumeroTablaSmsAsync (:610), CheckClientCreditAsync (:751), the line-loop skips and counts (:939, :976, :998) and HandlePromoCodeAsync (:1057, :1143). LAN logged all of these to file, except checkCliente. |
| NIP SMS credit/getSms (Q9) | GAPS_BUGS | The decision tree, SQL, tables and return codes 3/0/-1/'err' match LAN (CreditMethods.cs:236-327). Open: when the ZidMagento PATCH fails, getSms returns -1 and sends no SMS (pending user decision). Bug: LinkMagentoAccountAsync sends no sap-client=110 (BusinessPartnerMethods.cs:842-843), unlike every other SAP call in the project. The API selection rule (Q4 residual) decides which phone is texted. |
| NIP SMS credit/validateSms | EQUAL_TO_LAN | Inline copy of the SP's CODIGO branch with the same types and sizes (15/Int/35), returning 5/6 or e.Message (CreditMethods.cs:435-463). No expiry check in either system. |
| credit/SendSmsNewNumber (NIP-adjacent) | GAPS_BUGS | The INSERT is still built with string.Format on request.Cliente and NumeroTelefono (CreditMethods.cs:140-144). This SQL injection is inherited from LAN and was present at HEAD. |
| DMZ routing and Magento BP release | BLOCKED_OTHER_TEAM | R1 and Q9: the code switch happens at the Magento BP release. In the share's DMZ working copy, URL_INTELISIS points to https://localhost:44399/ (a local ServicioSAP) and URL_SAP to the deployed kdll3fhcyo-lan/SAP. order/new already goes to ServicioSAP (PostSAP). The production DMZ config is NO EVIDENCE. |

### 24.2 Testability: **PARTIAL**

The credit method can be tested in part, and only after a few prerequisites. Nothing can run on the share build: bin\ServicioSap.dll is dated 2026-09-26 08:21, older than yesterday's Q1, Q4, Q9, Q11 and Gender edits (13:38-17:43). The current build is X:\...\bin\ServicioSap.dll (17:43:38). Once that build is running and you paste a JWT, the following run with no SQL Server writes: contract checks (401/400/500), SAP read smoke GETs, getSms negatives (one SAP GET, zero SQL) and validateSms (read-only). Credit-order negatives also run a SELECT on ServicioAndroid, plus the local SQLite guide write, before the guest/BP gates, so they need your go-ahead. A negative 'unknown BP' result proves nothing until a SAP smoke GET passes, because a SAP failure produces the same message. Positive orders and positive getSms write to the shared ServicioAndroid database, and getSms sends a real SMS. They need the Q2 answer, a test BP, a priced SKU and your go-ahead. Their expected values depend on Q4-residual (the API selection rule), Q3 (the AWS catalog) and Q6 (the SIGMAVI schema). getSms with cliente > 0 PATCHes SAP and waits on the Q9 decision and Basis. Magento end-to-end is not possible (R1: Magento still sends C... accounts; R3: liberador and callback belong to another team). Claude will not start the service, run SQL or call endpoints; each stage below says who runs it.

| # | Step | Proves | Writes | Now | Needs |
|---|---|---|---|---|---|
| 0 | 0. You start the CURRENT build: iisexpress /path:X:\ServicioSAP\ServicioSap\ServicioSap /port:62337 (or rebuild in VS and press F5 on https://localhost:44399). Then POST login/auth and paste only the token. | That tests exercise the Q1/Q4/Q9/Q11/Gender code, not the stale 08:21 share binary. | no | no | Your go-ahead and your credentials (only the token is shared). |
| 1 | 1. Read-only external GETs, no service needed: GET https://businesspartner-api.mavi.fun/A_GET_TelefonoValidado?sCliente=<BP> for the captured BP (CAPTURAS §to_CteTel), 1500007539 and 1500008218. GET {AwsBaseUrl}AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=ORIGEN%20VALIDACION%20NUMERO%20CTE. | Q4-residual (which phone the API picks, its format and ZvalTel type) and Q3 (whether the catalog exists). Together they fix the expected ValidacionTelefono, LadaValidar and getSms phone. | no | yes | You run them (curl/Postman) and paste the JSON. |
| 2 | 2. Read-only SQL that you run: the DDL of the 4 ServicioAndroid tables; the empty-Cliente count in the SMS tables; the baseline MAX(id) and TST% count; reader A/B for the test BP; SIGMAVI CondicionesCredVtaLinea schema and TOP 20; LAN history (origen/sexo GROUP BY, costo, SEGU00001 <= 0, duplicate Orden). | Column widths for a 10-digit BP, the severity of bug 2, the expected condition translation (Q6), and the baselines that the positive runs are compared against. | no | yes | You run the queries in the information list and paste the output. |
| 3 | 3. Contract checks against the local service: no token gives 401; a null body gives 400; idCarritoCliente 'abc' on getSms/validateSms gives 500 plus [CREDIT GetSms ERROR]; getSms with cuenta '1500-008218' gives '0' with no SAP call. | Auth, binding and error contract are equivalent to LAN (R4 logging). | no | no | Step 0. |
| 4 | 4. SAP read smoke through ServicioSAP: GET partner/client/{BP}, partner/client/ma/{BP}, product/catalogo/ORIGEN VALIDACION NUMERO CTE. | That Conexion.dll resolves SAP on the test machine and the technical user can read. It also captures Gender, Birthdt, Marst, Namemiddle and ZtipoCliente for the expected row values. | no | no | Step 0 and the test BP numbers. |
| 5 | 5. getSms negatives: {cuenta:'C01575835', idCarritoCliente:'990927001', cliente:'0'} and an unknown BP '0000000000'. | The existence check against ZB_DATOS_CLIENTE answers '0' (R1). If SAP is unreachable the answer is '-1', so this also proves connectivity. One SAP GET, zero SQL. | no | no | Steps 0 and 4. |
| 6 | 6. Credit-order negatives with forzarOrder '1': unknown BP '0000000000', 'C01575835', and a guest (cuenta '' and cliente ''). | 200 'Error, Error en SetOrder: El cliente BP ... no tiene crédito activo en SAP.' / 'Los invitados no pueden pagar con crédito.', each with an [ORDER NEW ERROR] line. No SQL Server INSERT. | yes | no | Steps 0 and 4, plus your go-ahead for the reader-A SELECT on ServicioAndroid and the local SQLite guide write (a no-op on Claude's machine). |
| 7 | 7. validateSms, read-only: an existing BP-keyed row (Cliente, IdCarrito, Codigo) gives '5'; a wrong claveSms gives '6'. | The inlined CODIGO branch is equivalent to the SP. | no | no | Step 0, one row you read from VTASDCodigoVerificacioneCommerce, and a go-ahead for the service SELECT. |
| 8 | 8. Positive credit order, MA: BP WITHOUT a validated phone, SKU OSTE00443, '12 M MA P INM', costoEnvio 0, codigo_promotor '', forzarOrder '1', incrementId TSTP0927001 (12 characters or fewer). Afterwards you SELECT the header by idMagento and the lines by IdArtCreditoWeb. | The 59-column row matches the expected values: uen 1, sucursal 504, origen PRODUCTOS MX, MetodoEnvio 'tablerate_be', sexo from Gender, 1900-01-02 when there is no Birthdt, ValidacionTelefono 1. It also shows 1 line priced from SD29 04/12IA, and the 'Concluido' answer. | yes | no | The Q2 answer, your go-ahead, the test BP, an SD29 capture for OSTE00443, and the Q6 SELECT. |
| 9 | 9. Positive credit order, VIU: storeId 'viu', costoEnvio 150, '12 M VIU P INM', a SKU without '+'. | uen 2, sucursal 505, SalesOrg 05/12IV, and the SEGU00001 line (precio 150, cantidad 1, Abono 12). | yes | no | Step 8 passed, and a VIU SKU priced in SD29. |
| 10 | 10. Positive order for a BP WITH a validated phone (and an SMS row). | The CteTelSet x AWS catalog x SMS path of ValidacionTelefono (P4/P5), and LadaValidar/TelefonoValidar from the SMS phone. | yes | no | Q3 (catalog registered), the Q4-residual answer, Basis read access to CteTelSet, and step 8 passed. |
| 11 | 11. getSms positive with cliente '0' and a fresh idCarritoCliente (990927002); then an immediate repeat; then validateSms with the code you read from the table. | Branch idRef=='0' gives '3' with 1 VTASD row, 1 EnvioMensajes row (EstatusEnvio 1) and a REAL SMS. The repeat gives '3' with no new rows. validateSms gives '5'. | yes | no | Your go-ahead; a BP whose A_GET phone belongs to the team; Q2; confirmation that the dispatcher SpAAea00030_ArmadoSMS sends BP-keyed rows. |
| 12 | 12. getSms with cliente > 0 (SAP PATCH of ZidMagento) on the test BP, reading [SAP ZidMagento PATCH RESPONSE] in sap.log. | The PATCH works in client 110 with the technical user's rights. | yes | no | The Q9-PATCH decision, the sap-client fix, Basis confirmation, and a separate go-ahead. |
| 13 | 13. After Q5 is applied: an order with an unknown condition, and one with no condicion. | Nothing is written (no guide, no header), [ORDER NEW ERROR] is logged, and the answer is 200 'Error, ...' before any API call. | no | no | Your Q5 go-ahead and the code change. |
| 14 | 14. Optional: a local DMZ pointed at the local ServicioSAP (URL_SAP = https://localhost:44399/ in the local copy only), then setOrder/getSms through the DMZ. | The DMZ mapping of the codes (3 gives 200 'Correcto', 0/-1 give 400) and the re-serialization of the order/new response. | yes | no | Confirmation of the deployed DMZ config, and steps 8 and 11 passed. |
| 15 | 15. Magento end-to-end. | The full flow including the liberador and the callback. | yes | no | R1 (Magento sends BPs) and R3 (liberador and callback), both from other teams. Not possible yet. |

### 24.3 Open questions (explicit format)

**Q2** 🔴 blocks testing
- What: connectionStrings MAVICBOSANDROID (Web.config:13), i.e. ServicioAndroid tables CRED_SOLICITUD_WEB_DATOS_TEMP, VTASdArtCreditoWeb, VTASDCodigoVerificacioneCommerce, TcAAEA00030_EnvioMensajes
- LAN: LAN writes to the same database: SP_CREDITO_WEB_DATOS and SpVTASInsertArtSolCreditoLinea from ProductosCreditoWeb_SaveData (LAN CreditMethods.cs:94-260), and the NIP helpers on sCadenaConexionAndriod (:2035-2297).
- ServicioSAP: ConexionSQL.obtenerConexionAndroidAsync reads Web.config:13 (mavicbosandroid.grupomavi.com / ServicioAndroid). Writes happen at SolicitudCreditoWebMethods.cs:226 (header), OrderMethods.cs:984 (lines) and CreditMethods.cs:217, :374, :426 (NIP). Web.local.config can override only appSettings, not connectionStrings.
- Example: Positive order TSTP0927001 for BP 1500008218 writes 1 header and 1 line into the same database the Credit area and the liberador read. LAN would have written the same rows there.
- Options: A: the DBA provides a non-production copy, and the connection string is changed only in the local X: copy, never on the share · B: accept test rows in the shared database, with a named person who deletes them by idMagento / IdArtCreditoWeb / Cliente+IdCarrito · C: until this is answered, run only the stages that write nothing to SQL Server
- Recommendation: C now. Then A if a copy exists, otherwise B with written acceptance from the ServicioAndroid owner. Claude deletes nothing.

**NEW (build to test)** 🔴 blocks testing
- What: The binary IIS Express serves: share bin\ServicioSap.dll vs X:\ServicioSAP\ServicioSap\ServicioSap\bin\ServicioSap.dll
- LAN: No LAN equivalent (LAN is deployed on IIS).
- ServicioSAP: The share's bin\ServicioSap.dll is dated 2026-09-26 08:21:56, older than every source edit that day: CreditController.cs 13:38, SolicitudCreditoWebMethods.cs 17:43:05, OrderMethods.cs 17:43:19, CreditMethods.cs 17:43:35, BusinessPartnerMethods.cs 17:39. The X: build is dated 2026-09-26 17:43:38 (verified).
- Example: Served from the share bin: credit/getSms most likely answers 404, and sexo 'NO ESPECIFICADO' / metodoEnvio 'tablerate_bestway' raise error 8152 (pre-Q1). Served from X:, the Q1/Q4/Q9/Q11/Gender code runs.
- Options: A: you run "C:\Program Files\IIS Express\iisexpress.exe" /path:X:\ServicioSAP\ServicioSap\ServicioSap /port:62337 (or approve that Claude runs it) · B: you rebuild in VS on your machine and press F5 (https://localhost:44399) · C: copy the X: bin over the share bin (touches the share; needs an explicit OK)
- Recommendation: A for the read-only and negative stages. B for the positive run if the SQLite guide row (R5) must also be seen, because C:\inetpub\wwwroot\sap does not exist on Claude's machine.

**NEW (JWT)** 🔴 blocks testing
- What: Request body Login.Username / Login.Password of POST login/auth, checked against the hashes USER_HASH/USER_SALT/PASS_HASH/PASS_SALT (Web.config:36-39)
- LAN: LAN POST login/authenticate (LAN LoginController.cs:13-17). The DMZ used USER_INTELISIS.
- ServicioSAP: LoginController.Authenticate (:19-42) verifies with PBKDF2 and issues an HS256 token valid for 180 min. Every credit route is [Authorize] (CreditController.cs:9, OrderController.cs:12). ServicioSAP stores only hashes.
- Example: POST {base}/login/auth returns 200 "eyJ...". Every later call sends 'Authorization: Bearer eyJ...'. Without it the answer is 401.
- Options: A: you call login/auth and paste only the token · B: you type test credentials in chat for the local instance · C: a local-only Web.local.config on X: with the hash/salt of throwaway credentials
- Recommendation: A, so that Claude never handles the password. Repeat every 3 hours.

**NEW (test data)** 🔴 blocks testing
- What: Request fields infoCliente.cuenta / cliente / telefono and articulos[].sku / condicion, which feed CRED_SOLICITUD_WEB_DATOS_TEMP.cliente, VTASdArtCreditoWeb.articulo/precio and TcAAEA00030_EnvioMensajes.Telefono
- LAN: LAN SetPedido uses infoCliente['cuenta'] (a C... account) for the lookups and SaveData (LAN OrderMethods.cs:619-649). getSms checks Intelisis Cte and CteTel (CreditMethods.cs:2208-2243).
- ServicioSAP: CheckClientCreditAsync (ZB_DATOS_CLIENTE) at OrderMethods.cs:741-754. BP05MA at SolicitudCreditoWebMethods.cs:372-382. A_GET_TelefonoValidado at :480-523. SD29 by SKU filtered on SalesOrg 04/05 (OrderMethods.cs:922-948). getSms at CreditMethods.cs:331-359.
- Example: SPEC §7 agreed on BP 1500007539; the task uses 1500008218; LAN tests used C01575835, which ServicioSAP rejects by design (R1). The captured MA SKU OSTE00443 with '12 M MA P INM' is the safe choice. The VIU SKU DIB+00104 contains a '+' (bug B1).
- Options: A: for order stages, a BP whose A_GET_TelefonoValidado returns no validated phone (this skips CteTelSet, the AWS catalog and reader B); for SMS stages, a BP whose validated MOVIL belongs to the team; SKU OSTE00443 / 12 M MA P INM; incrementId of 12 characters or fewer · B: BP 1500008218 for everything · C: other BPs you choose
- Recommendation: A. Do not use '+' SKUs until B1 is checked. Keep codigo_promotor '' and send cliente '0' on getSms until Q9-PATCH is decided.

**Q4 (residual: A_GET_TelefonoValidado selection rule)** 🔴 blocks testing
- What: @TelefonoValidado, which sets CRED_SOLICITUD_WEB_DATOS_TEMP.ValidacionTelefono; the LadaValidar/TelefonoValidar fallback; and the getSms target TcAAEA00030_EnvioMensajes.Telefono
- LAN: SP_CREDITO_WEB_DATOS.sql:194-202, LAN OrderMethods.IsValidated :794-795 and CreditMethods.GetValidatedPhoneNumber :2229-2233 all read Intelisis CteTel. They filter Tipo='Movil' AND ValidacionTel=1 (getSms also LEN=10) BEFORE TOP 1, ORDER BY Fecha DESC with NULL dates last. Result: the newest VALIDATED mobile.
- ServicioSAP: SolicitudCreditoWebMethods.GetTelefonoValidadoAsync :480-523 keeps ZtelCte only if ZvalTel is true (:519). Callers: :389, OrderMethods.cs:625, CreditMethods.cs:357. The share copy of the API (businesspartner-dev A_GET_TelefonoValidado.py:17-36) takes max() over ALL phones by (Zfecha, ZfechaCap, ZidcteTel) and returns that phone's Zvaltel. A null Zfecha becomes '00000000' (AS_GET_ZQBP_EditarCliente_CteTel.py:60-62), which sorts above '/Date(ms)/' strings, so undated phones win.
- Example: Real capture of the BP05MA to_CteTel (CAPTURAS_REALES_APIS.md:49-56): the only validated MOVIL is 5522122584 (dated); the undated phones include MOVIL 0000001212 = 3338007830 (not validated) and TRABAJO +523333333333 (validated). LAN: TelefonoValidado 5522122584, and getSms texts 5522122584 and answers '3'. ServicioSAP with the share-copy API: the undated phone with the highest ZidcteTel wins (3338007830, if ZfechaCap is also null, NO EVIDENCE), ZvalTel is false, so the value is null. ValidacionTelefono becomes 1, and getSms answers '0' ('Número de cuenta inválida') with no SMS.
- Options: A: the deployed API already filters MOVIL and Zvaltel=true before max() and puts null dates last; nothing to change · B: ask the businesspartner-api owner to add ZtipoCte eq 'MOVIL' and Zvaltel eq true before max(), and to put null dates last (keeps your single-source decision) · C: build the value in ServicioSAP from CteTelSet with LAN's rule (overrides Q4) · D: accept the difference
- Recommendation: First get the deployed source, or one GET for the captured BP and one QA BP. If it behaves like the share copy, choose B: it keeps Q4 and restores LAN's rule for all three consumers with no C# change. This blocks the expected values of the positive order and getSms tests.

**Q3** 🔴 blocks testing
- What: AWS AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=ORIGEN VALIDACION NUMERO CTE (Valor1), matched against CteTelSet.ZappOrig; it sets @ValidacionOrigen and therefore CRED_SOLICITUD_WEB_DATOS_TEMP.ValidacionTelefono
- LAN: SP_CREDITO_WEB_DATOS.sql:186-191: TablaStD.Nombre WHERE TablaSt='ORIGEN VALIDACION NUMERO CTE', joined to CteTel.AppOrigen with ValidacionTel=1. With no rows the value is NULL, ValidacionTelefono is 1, and the row IS inserted.
- ServicioSAP: ConstruirContextoAsync (SolicitudCreditoWebMethods.cs:396-400), GetCatalogoConfiguracionAsync :525-534, ProductMethods.GetConfiguracionCatalogoAsync :708-735. A non-2xx or empty body throws, so no row is written and the answer is 200 'Error, ...'. A 200 '[]' gives 1 with no log. The catalog is read only when a validated phone exists.
- Example: A BP with a validated mobile while the catalog is not registered. LAN: a row with ValidacionTelefono 1. ServicioSAP: 'Error, Error en SetOrder: Error catálogo ORIGEN VALIDACION NUMERO CTE...' and no row (or, if AWS answers [], a row with 1 and no trace).
- Options: A: register the catalog before go-live with the ZappOrig values e-commerce writes, keep the throw, and add a Logger.SAP warning when it returns 0 rows · B: treat 'catalog not found' as an empty list (SP parity) and log a warning · C: keep it as it is
- Recommendation: A. Decide B only after seeing what AWS answers for an unknown catalog name. Until then, test with BPs that have no validated phone.

**Q6** 🔴 blocks testing
- What: SIGMAVI CondicionesCredVtaLinea columns (CondicionMagento? Condicion = SD29 code or Magento text? TiendaVirtual values and collation), which decide the SD29 row that prices VTASdArtCreditoWeb.precio/Abono
- LAN: SpVTASInsertArtSolCreditoLinea.sql:258-261: WHERE c.Condicion = @Condicion (the Magento text), JOIN c.CondicionPropre = PropreListaDFinal.Condicion. LAN ProductMethods.cs:756-791 confirms legacy Condicion = '12 M {MA|VIU} P INM|DIF'.
- ServicioSAP: GetCondicionAsync (OrderMethods.cs:3305-3337): SELECT TOP 1 Condicion WHERE CondicionMagento=@c AND REPLACE(TiendaVirtual,' ','_')=@storeId. A SQL error falls back to PaymentConditionCatalog. The same repo reads the same table through the legacy columns CondicionPropre/TiendaVirtual/Mensualidades (CreditMethods.cs:28-31, :70-73). The result must equal the 04/05 SD29 Condition code (OrderMethods.cs:945-948).
- Example: CRED515773 (muebles_america, '12 M MA P INM', OSTE00443). (i) If there is no CondicionMagento column: a SqlException is logged on every order, the catalog gives '12IA', and the line is priced. (ii) If the column exists but Condicion keeps the legacy meaning: the query returns '12 M MA P INM', no 04 row matches, the SKU is silently skipped, and the answer is 'Concluido' with 0 product lines. (iii) If Condicion holds '12IA': OK.
- Options: A: keep the query, if the SELECT shows CondicionMagento and SD29 codes · B: LAN semantics: SELECT CondicionPropre WHERE Condicion=@magento (+TiendaVirtual), then map CondicionPropre to the SD29 code · C: use only PaymentConditionCatalog for credit lines
- Recommendation: Decide after you run the SIGMAVI SELECT (information item). If SIGMAVI has the legacy schema, choose C (deterministic, no per-order SqlException). This blocks judging the expected lines of the positive test.

**Q9 (pending part: ZidMagento PATCH failure)** 🔴 blocks testing
- What: SAP ZSDT_CTE_ODATA_SRV/ZSDT_CTE_ENTITYSet(ZclienteBp).ZidMagento (the equivalent of Intelisis Cte.IDMagento), filled from the getSms request field cliente when it is > 0
- LAN: VTASCodigoSMSEcommerce, LAN CreditMethods.cs:2111-2114 calls UpdateMagentoId (:2191-2206): UPDATE IntelisisTmp.Cte SET IDMagento WHERE Cliente, BEFORE the existence check. It updates 0 rows on a missing customer; only a SQL exception returns -1.
- ServicioSAP: VTASCodigoSMSEcommerceAsync, CreditMethods.cs:271-276 calls BusinessPartnerMethods.LinkMagentoAccountAsync (:835-875): a CSRF GET, then PATCH, with no sap-client (:842-843). A non-2xx answer throws, and the catch (:322-326) returns -1 before any VTASD or EnvioMensajes row is written.
- Example: BP 1500007539, cliente '12345', and the PATCH answers 403 (no authorization) or 404 (no ZSDT_CTE row, or the wrong default client). LAN: SMS queued, '3', DMZ 200 'Correcto'. ServicioSAP: '-1', the DMZ answers 400 with an empty body, Magento shows 'error de conexión', and every retry fails the same way.
- Options: A: keep -1 (as coded) · B: wrap only the PATCH in its own try/catch, log '[CREDIT GetSms ZidMagento PATCH ERROR]' to sap.log and continue with the SMS · C: B, plus skip the PATCH when ZB_DATOS_CLIENTE already shows the same ZidMagento (whether that field is filled is NO EVIDENCE)
- Recommendation: B. In any case add sap-client=110 to both URLs (bug). Prove the PATCH once on the test BP with cliente > 0 after Basis confirms the authorization. Until then, tests send cliente '0'. This blocks only the cliente > 0 step.

**Q5** 
- What: Request field articulos[0].condicion: where to put the decided early stop, and how the translated code reaches the lines
- LAN: LAN OrderMethods.cs:632 passes it raw to SaveData data[5] (CreditMethods.cs:111), then header @condicion (:172) and each line @Condicion (:910). No validation. An unknown condition gives 0 product rows, while SEGU00001, the promo burn and the liberador still happen.
- ServicioSAP: Raw value in the header at CrearSolicitudCreditoAsync :797. Translated only in InsertCreditArticlesAsync :848, which throws at :850-853; ProcessCreditPaymentAsync swallows it at :684-690. By then SD36 (:1732), SaveGuideAsync (:1767), the SMS lookup (:1777), A_GET_TelefonoValidado (:1778), ZB_DATOS_CLIENTE (:654) and the header INSERT with BP05MA/A_GET/CteTelSet/AWS have all run.
- Example: Condition 'XX M VIU P INM' that is in neither SIGMAVI nor the catalog. LAN: header plus the SEGU00001 line, promo burned, cuenta returned. ServicioSAP today: header only, 0 lines, [CREDITO ARTICULOS ERROR], 'Concluido'. After Q5: nothing written, [ORDER NEW ERROR], 200 "Error, ... La condicion de pago 'XX M VIU P INM' no existe ...".
- Options: A: new block in SetOrderAsync right after ToArray (:1722) and before SD36 (:1732), guarded by metodoPago == CREDIT_METHOD. Throw on a blank condition; otherwise GetCondicionAsync(cond, storeId, "") and throw if the result is blank · B: the same block as the first statement of the credit branch (:1766), after SD36 has already run · C: after SaveGuideAsync (:1767), before the SMS lookup · In every option: add a condicionSap parameter to ProcessCreditPaymentAsync (:638) and InsertCreditArticlesAsync (:830), drop the lookup at :848, and keep the raw Magento text in the header (:797) as LAN did
- Recommendation: A: it is the only placement before every external call, and SD36 can never match a credit order anyway. Side effect: if SIGMAVI is down and a condition exists only in SIGMAVI, the order stops, logged as [ORDER GetCondicion ERROR]. Waiting for your go-ahead. It does not block the current tests, which use a valid condition.

**Q8** 
- What: Request field infoCliente.codigo_promotor, which affects SIGMAVI VentasCupones.FechaUtilizacion/IdEcommerce (UPDATE) and inserts a new free VentasCupones row
- LAN: LAN OrderMethods.cs:633, then SaveData data[6], then CreditMethods.cs:203-206 CodigoPromocion(data[6],'Elimina') (:392-463), then SpVTASVentaCupon on Intelisis. It stamps only the newest free row, regenerates in the same SP, and logs failures.
- ServicioSAP: ProcessCreditPaymentAsync :678-682 calls HandlePromoCodeAsync(codigoPromotor, incrementId, 'Elimina') (:1004-1146). It UPDATEs all free rows (:1070-1077), calls AS_GET_ZQBP_AGENTE without a guard (:1087), then INSERTs. The result is discarded and errors go to Console (:1143).
- Example: A code with 2 free rows. LAN: stamps 1 row and inserts 1. ServicioSAP: stamps both rows; if URL_BP_API fails after the UPDATE, no new row is inserted and nothing reaches sap.log. With option A: VentasCupones is untouched.
- Options: A: delete only :678-682 and keep the try/catch :674-690 for the lines · B: A, plus delete HandlePromoCodeAsync and GET order/validatecupon (once Magento removes the promoter box) · C: port 'Elimina' literally
- Recommendation: A now; it also closes the burn-without-regeneration bug. Confirm first that no commission or report process reads VentasCupones.IdEcommerce.

**Q20** 
- What: sap.log text when the BP check fails: 'El cliente BP {cuenta} no tiene crédito activo en SAP.'
- LAN: checkCliente, LAN CreditMethods.cs:725-763. The empty catch at :757-760 returns false, and SaveData answers 'sin cuenta' (:257) with no log.
- ServicioSAP: CheckClientCreditAsync, OrderMethods.cs:741-754. The catch at :749-753 writes only to Console and returns false; :654-655 throws; the controller logs [ORDER NEW ERROR].
- Example: BP 1500008218 during an SAP 401/timeout, a truly missing BP, and C01575835 all produce the same line.
- Options: Log-only fix: Logger.SAP the exception at :749-753 and word the message as 'BP no encontrado' vs 'error consultando SAP'; business behavior unchanged · Leave it
- Recommendation: Apply the log-only fix (R4). Until then, a negative 'unknown BP' test proves nothing unless a SAP smoke GET passed first.

**NEW (R4 logging package, log-only)** 
- What: sap.log entries for: the credit success (incrementId, cuenta, CRED_SOLICITUD_WEB_DATOS_TEMP.id, lines inserted), the line-loop result (skipped SKUs, zero-price lines, inserted count), and the getSms reason for '0'
- LAN: LAN OrdersController.cs:144, :152 logs request and response at INFO. ProductosCredito_Nip logs 'INFO [cliente]' with the result (CreditMethods.cs:34). The line loop was silent in LAN too.
- ServicioSAP: Success paths use only Console: OrderMethods.cs:1781, and :939, :976, :998 in the line loop. The id returned at SolicitudCreditoWebMethods.cs:226-228 stays in a local variable (OrderMethods.cs:667). The getSms log (CreditMethods.cs:242) does not tell 'BP not found' (:266-269) from 'no validated phone' (:320).
- Example: A positive run answers {"BP":"1500008218",...,"Resultado":"Concluido"} and writes nothing to sap.log. VTASdArtCreditoWeb holding only SEGU00001 (SD29 found no row) looks the same as a full success. Both getSms '0' cases log '[CREDIT GetSms INFO] <bp> 0'.
- Options: A: add Logger.SAP INFO/WARN lines only; the response stays the same · B: leave it and verify only with SQL
- Recommendation: A. It is the only way to see a positive result without querying the database, and it fits the 'visible' part of R4. It needs your go-ahead because it is a code change.

**NEW-B** 
- What: Outcome when a line insert fails after the header (SD29 HTTP error or SQL error inside InsertCreditArticlesAsync)
- LAN: CreditMethods.cs:869-919 has no try. The catch at :246-252 logs and returns 'err', SetPedido ignores it and returns the cuenta.
- ServicioSAP: OrderMethods.cs:991-995 rethrows; :684-690 logs [CREDITO ARTICULOS ERROR] and swallows; the answer is 'Concluido'.
- Example: SKUs A and B; SD29 answers 500 for B. Both systems keep line A and lose B, SEGU00001 and the promo. ServicioSAP answers 'Concluido' and writes a sap.log line.
- Options: A: keep the swallow (same outcome as LAN), plus the logging package · B: rethrow so the answer is 'Error, ...' (header and partial lines stay written)
- Recommendation: A. After Q5 is applied, the main cause (an unresolved condition) never reaches this catch.

**Q10** 
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.lada_particular/telefono_particular/lada_celular/telefono_celular/LadaValidar/TelefonoValidar when the phone (infoCliente.telefono, or the SMS/validated number) is shorter than the lada
- LAN: ProductosCreditoWeb_SaveData, LAN CreditMethods.cs:139-148, has no guard. Substring throws, the catch at :246-252 returns 'err', and no row is written. Magento still gets the cuenta.
- ServicioSAP: ProcessCreditPaymentAsync :660-664 gives LadaValidar '0' / TelefonoValidar '0'; CrearSolicitudCreditoAsync :768-774 gives lada 0 and number ''. The row is inserted and the answer is 'Concluido'.
- Example: telefono '5', no SMS row, no validated phone. LAN: no row. ServicioSAP: a row with ladaParticular 0, telefonoParticular '', LadaValidar 0, TelefonoValidar '0'.
- Options: A: throw 'teléfono inválido' before the header: logged, 200 'Error, ...', no row · B: keep the placeholders
- Recommendation: A (LAN outcome, made visible per R4). Whether Magento enforces 10 digits is NO EVIDENCE; it only strips non-digits (OrderManagement.php:731-733).

**Q15** 
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.origen VARCHAR(20), from request field infoCliente.origen
- LAN: LAN SetPedido OrderMethods.cs:646 uses infoCliente['origen'] when present, else 'PRODUCTOS MX', then CreditMethods.cs:176. The SP's 'DIMAS MX' branch (SP:174-183) was removed as deprecated (§17).
- ServicioSAP: CrearSolicitudCreditoAsync OrderMethods.cs:801 fixes Origen = 'PRODUCTOS MX'. InfoClienteRequest has no origen property (verified), so the value is dropped when the body is bound.
- Example: Magento copies payment additional_information 'origen' into infoCliente.origen (OrderManagement.php:452-454 and :705-708). If the app sends 'X', LAN stores 'X' and ServicioSAP stores 'PRODUCTOS MX'. The captured payloads carry no origen. The actual values are NO EVIDENCE.
- Options: A: keep it fixed (your 09-23 decision, which assumed Magento never sends it; §23.6 corrected that premise) · B: add origen to InfoClienteRequest and pass it through with the 'PRODUCTOS MX' default, cut to 20; throw on 'DIMAS MX' · C: pass it through only for an agreed list
- Recommendation: Decide from data: run SELECT origen, COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP GROUP BY origen and ask the app owners. If LAN rows only show PRODUCTOS MX, choose A; otherwise B.

**Q19** 
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.nombre VARCHAR(25)
- LAN: CreditMethods.cs:154 @nombre = getClientInfo :834 dr['PersonalNombres'], i.e. Intelisis CTE.PersonalNombres (all given names).
- ServicioSAP: ArmarFila, SolicitudCreditoWebMethods.cs:238: maestro.NameFirst only; Namemiddle (BusinessPartnerMa.cs:51) is never read. With no BP: info.nombreClienteMavi (OrderMethods.cs:780).
- Example: CTE.PersonalNombres 'MARIA GUADALUPE' gives 'MARIA GUADALUPE' in LAN. A migrated BP with NameFirst 'MARIA' and Namemiddle 'GUADALUPE' gives 'MARIA' in ServicioSAP. BPs created by ServicioSAP put the whole first name in NameFirst, so they show no difference.
- Options: A: NameFirst + ' ' + Namemiddle, trimmed, cut to 25 · B: NameFirst only · C: ZB_DATOS_CLIENTE PrimerNombre + SegundoNombre (one more call)
- Recommendation: A, after one BP05MA capture of a migrated customer with two given names.

**Q14** 
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.estadoCivil VARCHAR(11)
- LAN: CreditMethods.cs:169, from getClientInfo :847 CTE.EstadoCivil. Web customers created by SP_eCommerceCtenuevo never set it, so they got ''.
- ServicioSAP: CrearSolicitudCreditoAsync OrderMethods.cs:794 sets ""; ArmarFila copies it (SolicitudCreditoWebMethods.cs:257) and ignores BP05MA Marst. Separately, BP creation hard-codes Marst '2' from an order (OrderMethods.cs:2650) and '1' from setCustomer (BusinessPartnerMethods.cs:486).
- Example: Web customer: '' in both. Store customer with an EstadoCivil text: that text in LAN, '' in ServicioSAP.
- Options: A: keep '' as a known gap · B: map the Marst code to the Intelisis text through the SAP code table; '' when unknown · C: map from ZB_DATOS_CLIENTE.EstadoCivil if it is already text
- Recommendation: A for now; B once one real BP05MA shows Marst and the code table is known. Decide separately whether the hard-coded Marst at BP creation should stay.

**Q12** 
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.ValidacionTelefono for a brand-new client (empty cuenta) or a BP with a blank To_Cte.ZtipoCliente
- LAN: SP:216 IIF(SUBSTRING(@cliente,1,1) != 'P', 1, 0). LAN never inserted new clients (checkCliente('') is false).
- ServicioSAP: EsProspecto (SolicitudCreditoWebMethods.cs:536-546) is false with no BP or a blank type, so the result is 1 (:327). BPs created by ServicioSAP get ZtipoCliente "" (BusinessPartnerMethods.cs:654, OrderMethods.cs:2821).
- Example: cuenta '', cliente '9400'. LAN: no row. ServicioSAP: a row with cliente '' and ValidacionTelefono 1. Evaluating the SP literally for '' also gives 1.
- Options: A: keep 1 · B: treat a new client, or a blank ZtipoCliente, as a prospect (0)
- Recommendation: A, unless the Credit area says new web clients are exempt.

**NEW (sexo, new client)** 
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.sexo on rows without a BP (R2 new-client flow)
- LAN: No row for an empty cuenta ('sin cuenta', CreditMethods.cs:255-258). For existing customers sexo = CTE.Sexo (:837).
- ServicioSAP: CrearSolicitudCreditoAsync OrderMethods.cs:783 sets Sexo = "" and ignores info.sexo. ArmarFila (SolicitudCreditoWebMethods.cs:242) uses it raw when maestro == null and skips SexoLegado.
- Example: New-client order: sexo ''. The same customer with a BP whose Gender is '' gets 'Masculino', and the BP created from the order gets Gender '1' (OrderMethods.cs:2646).
- Options: A: when there is no BP, use SexoLegado(BusinessPartnerMethods.MapGender(info.sexo)), which gives Masculino when empty · B: keep ''
- Recommendation: A: one rule for every row, following your Gender decision. Low priority.

**NEW (sexo letter case)** 
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.sexo letter case
- LAN: CTE.Sexo. Web customers were created with UPPER(@SexoCte) (SP_eCommerceCtenuevo.sql:132): MASCULINO/FEMENINO.
- ServicioSAP: SexoLegado returns 'Masculino'/'Femenino' (SolicitudCreditoWebMethods.cs:571-579). 'NO ESPECI' is already upper case.
- Example: BP Gender '2': LAN stored 'FEMENINO', ServicioSAP stores 'Femenino'.
- Options: A: return MASCULINO/FEMENINO in upper case · B: accept mixed case (§23.8 :1925 notes it; no case-sensitive reader found)
- Recommendation: A: the exact LAN value at no cost. Confirm with SELECT sexo, COUNT(*) ... GROUP BY sexo.

**NEW (letter codes for Gender)** 
- What: Request field infoCliente.sexo, which becomes SAP BP01 Gender when a BP is created from an order
- LAN: No equivalent: LAN created the Cte with @SexoCte NULL (SP_eCommerceNuevoPed.sql:315).
- ServicioSAP: BuildBpClientFromOrder, OrderMethods.cs:2646, now calls BusinessPartnerMethods.MapGender (:777-798): H/HOMBRE/MASCULINO/1 give 1, M/MUJER/FEMENINO/2 give 2, anything else gives '3'. The deleted OrderMethods.MapGender (HEAD) mapped M/MASCULINO to 1, F/FEMENINO to 2, and anything else to ''.
- Example: sexo 'M': HEAD Gender '1', now '2'. sexo 'F': HEAD '2', now '3'. Empty: '1' in both. Magento248 PlaceOrder does not send sexo today (NO EVIDENCE of any sender); MaviCredito CreditoManagement.php:531 sends 'MASCULINO'/'FEMENINO' in another payload, and those map correctly.
- Options: A: keep the single BP mapping (M = Mujer) · B: accept only unambiguous words (HOMBRE/MASCULINO = 1, MUJER/FEMENINO/F = 2) and treat a bare 'M' as unknown · C: map unknown to '1' (same as empty) instead of '3'
- Recommendation: Low priority. Confirm with SAP that '3' is a valid Gender value; if it is not, use C. Record in §23.9 that the letter convention changed.

**NEW (liberador trigger)** 
- What: Which orders call LiberadorCreditoMethods.LiberarCliente + CallMagentoAuthorizationCallbackAsync once R3 is unblocked, and which cliente value is sent
- LAN: CreditMethods.cs:208-241: inside IdSolicitud != '', after the lines (:201) and the promo burn (:203-206), only when data[0] (infoCliente.cuenta) starts with 'C'. It sends the Intelisis account and does not run when the lines throw.
- ServicioSAP: ProcessCreditPaymentAsync :692-730, commented out. It runs only for esClienteNuevo (:693), after the catch that swallows line failures, sends idClienteMagento (:699), and its await inside a non-async Thread lambda (:709, :719) does not compile.
- Example: Existing BP 1500008218 with its lines OK: LAN-style, the liberador fires; uncommented as written, ServicioSAP never fires it and the quote stays PENDIENTE. New client (cuenta '', cliente '9400'): LAN did nothing; ServicioSAP would call LiberarCliente('9400', id, 1).
- Options: A: existing accounts only, success path only (LAN parity) · B: existing and new clients · C: new clients only (as written) · D: wait for the liberador owner's contract
- Recommendation: D. Default to A unless the owner says the new-client flow needs it. Meanwhile, move the block inside the success path with the lambda fixed, still commented out.

**Q16** 
- What: SD29 PropreListSet rows (OrgVtas, Condicion, CDistr, Sucursal, Lista, Vigente): which row prices a line when several match
- LAN: SpVTASInsertArtSolCreditoLinea.sql:243-262 INSERT...SELECT writes one line per matching row, all with the same Orden.
- ServicioSAP: OrderMethods.cs:933-948 filters OrgVtas, then FirstOrDefault in response order. FinalListProperMethods.cs:85 has no $orderby and no CDistr/Sucursal/Vigente criteria.
- Example: SKU X, OrgVtas 05, two 12IV rows (CDistr 01 at 1,146 and 02 at 1,200). LAN-style: 2 lines with Orden 1. ServicioSAP: 1 line at whichever row SD29 lists first.
- Options: A: deterministic filter (e.g. CDistr '02' = credit, Vigente) plus a sap.log warning when several remain · B: copy the fan-out · C: keep the first row
- Recommendation: A, with the filter chosen from a real SD29 capture and the LAN history query.

**Q18** 
- What: VTASdArtCreditoWeb.costo
- LAN: SpVTASInsertArtSolCreditoLinea.sql:229-241 (articles) and :194-206 (SEGU00001) call spVerCosto; the result can be NULL.
- ServicioSAP: OrderMethods.cs:905 costoArticulo = 0m, written at :982 for every line.
- Example: OSTE00443: LAN had the Intelisis cost or NULL (value NO EVIDENCE); ServicioSAP writes 0.
- Options: A: accept 0 if nobody reads costo · B: port a cost from SAP (equivalence unverified)
- Recommendation: A, once the liberador owner confirms nobody reads it.

**Q22** 
- What: Request field costoEnvio, which decides the SEGU00001 line
- LAN: LAN OrderMethods.cs:616-617: added when the text is not "0" and not "" (LAN OrderRequest.costoEnvio is a string).
- ServicioSAP: OrderMethods.cs:1774-1775: added when the decimal is > 0 (OrderRequest.cs:21).
- Example: Captured payloads: "0" gives no line in both; "150" gives a line at 150 in both (magento_payloads.md:26, :55). The rules differ only for "0.00" or a negative value, and Magento's (float)number_format has not produced either in any capture.
- Options: A: accept as equivalent and close · B: copy the text rule
- Recommendation: A: close. Optionally confirm with the SEGU00001 precio <= 0 count on the LAN history.

**NEW-A** 
- What: articulos[0].condicion = '05 M MA P DIF' / '05 M VIU P DIF', which has no entry in the fallback PaymentConditionCatalog
- LAN: LAN ProductMethods.cs:758-767 publishes credit_price_5_dif, so Magento can offer it. The SP prices any text present in VTASCCondicionesCredVtaLinea.
- ServicioSAP: PaymentConditionCatalog.cs:40-43 has only the '05 ... P INM' entries. Unless SIGMAVI resolves the value (Q6), GetCondicionAsync returns "" (OrderMethods.cs:3336).
- Example: '05 M VIU P DIF'. LAN: the line is priced if a row exists. ServicioSAP today: orphan header and 'Concluido'. After Q5: 'Error, ...'.
- Options: A: add the SD29 code (NO EVIDENCE of the code; take it from an SD29 capture) · B: the business confirms it is not sold on credit web · C: rely on SIGMAVI (Q6)
- Recommendation: Ask the Magento/business owners. If the plan is sold, choose A with the real code.

**Q21** 
- What: Available-credit check (BP05MA to_Cte.ZlimCred) before inserting the request
- LAN: checkSaldo (LAN CreditMethods.cs:766-802) always returns 0, and the result is discarded (:126-133).
- ServicioSAP: None: ProcessCreditPaymentAsync checks existence only (OrderMethods.cs:652-657).
- Example: Total 15000 with ZlimCred 0: both insert.
- Options: A: parity, no check; mark FLUJO §5.1 as superseded · B: a new feature (needs ZlimCred, debts and pending orders)
- Recommendation: A. Record it in §23.9 to end the contradiction with FLUJO §5.1.

### 24.4 Bugs

| Sev. | Where | Bug | Since 09-26 |
|---|---|---|---|
| high | `FinalListProperMethods.cs:85` | Verified in the code. GetFinalListProperBySkuAsync puts the raw SKU into the SD29 URL ($filter=Articulo%20eq%20'{sku}'): no Uri.EscapeDataString and no doubling of apostrophes. It is used by the credit lines (OrderMethods.cs:922) and the cash path. The file dates from 2026-09-09. |  |
| medium | `OrderMethods.cs:1777` | Verified. On the new-client path (R2) the SMS phone lookup runs with cuenta '' (sDatosPedido[36]). ObtenerNumeroTablaSmsAsync (:589-613) has no blank guard, and its result is written into LadaValidar/TelefonoValidar (:661-664, :811-812). |  |
| medium | `BusinessPartnerMethods.cs:842` | Verified. LinkMagentoAccountAsync builds the CSRF-fetch URL and the PATCH URL with no sap-client=110, while every other SAP call in the file pins client 110 (:30, :76-77, :252, :302, :386, :882). The method is older, but yesterday's NIP port (credit/getSms, CreditMethods.cs:271-276) made it run for every logged-in customer. | yes |
| medium | `CreditMethods.cs:140` | Verified, and present at HEAD. SendSmsNewNumberAsync builds the INSERT into TcAAEA00030_EnvioMensajes with string.Format on request.Cliente, which is not escaped (:140-144). The route is credit/SendSmsNewNumber, [Authorize]. It is a copy of LAN CreditMethods.cs:2010-2014. |  |
| medium | `OrderMethods.cs:1796` | Verified. This is outside the credit branch (cash path). codigoPostal is read from sDatosPedido[20], which ToArray fills with estado (codigoPostal is index 17). ValidarRegionCelulares (:2066-2120) then rewrites '-R5'/'-R6' SKUs using the first character of the state name. |  |
| low | `OrderMethods.cs:610` | ObtenerNumeroTablaSmsAsync writes errors only to Console. LAN logged them to file (LAN OrderMethods.cs:849). Its sibling IsValidatedAsync was moved to Logger.SAP on 09-26 (:630); this one was not (R4). |  |
| low | `OrderMethods.cs:645` | Verified. The guest guard requires a blank cliente, but Magento sends cliente = (int)customerId (OrderManagement.php:703), so a guest arrives as "0" and is classified as a new client. |  |
| low | `OrderMethods.cs:1087` | Verified. HandlePromoCodeAsync commits the burn UPDATE (:1070-1077) and then calls AS_GET_ZQBP_AGENTE with no guard (:1087). If the call throws, the regeneration INSERT never runs; the error goes to Console (:1143) and the caller discards the result (:681). Q8 option A removes this from the credit path. |  |
| low | `SolicitudCreditoWebMethods.cs:242` | Verified. Rows without a BP use req.Sexo raw, and CrearSolicitudCreditoAsync hard-codes Sexo = "" (OrderMethods.cs:783). Since yesterday's SexoLegado change, BP rows turn '' into 'Masculino', but new-client rows still store ''. | yes |
| low | `OrderMethods.cs:2646` | Verified in the uncommitted diff. The deleted OrderMethods.MapGender (M=1, F=2, unknown '') was replaced by BusinessPartnerMethods.MapGender (H=1, M=2, unknown '3'). For BPs created from an order, 'M' flips from male to female and 'F' becomes '3'. §23.9 does not record this. | yes |
| low | `SolicitudCreditoWebMethods.cs:389` | Verified. Since Q4, one credit order calls A_GET_TelefonoValidado twice (OrderMethods.cs:1778, then here), each with a new HttpClient. The two calls handle errors differently: IsValidatedAsync swallows and returns '', while ConstruirContextoAsync propagates. | yes |
| low | `CreditMethods.cs:174` | Verified. The newly parameterized GetIdRefAsync uses AddWithValue, which sends @Cliente and @IdCarrito as nvarchar. If the columns are varchar or int, SQL Server converts implicitly, which can turn an index seek into a scan. Results are unchanged. | yes |
| low | `OrderMethods.cs:626` | The validated phone (ZtelCte) is never reduced to digits before it is split into LadaValidar/TelefonoValidar or cut to 10 for the comparison. A '+52' value exists in a real to_CteTel capture (CAPTURAS_REALES_APIS.md:55, a validated TRABAJO phone). |  |
| low | `OrderMethods.cs:939` | sap.log never records what the line loop did. Skipped SKUs (:939, :950-954), zero-price lines (:976) and the inserted count (:998) go only to Console. The failure line (:686-688) has no inserted count. |  |
| low | `OrderMethods.cs:3319` | GetCondicionAsync assigns a possibly null condicionMagento to SqlParameter.Value. SqlClient reports 'parameter not supplied', and the log says '[ORDER GetCondicion ERROR]', which reads like a SIGMAVI failure. |  |
| low | `Logger.cs:28` | Verified. Directory.CreateDirectory for bin\Logs runs outside any try (:26-31), and Logger.SAP is called from catch blocks. |  |
| low | `SolicitudCreditoWebMethods.cs:283` | CRED_SOLICITUD_WEB_DATOS_TEMP.fecha comes from DateTime.Now on the IIS host. The SP used SQL Server GETDATE() (SP_CREDITO_WEB_DATOS.sql:170). |  |

### 24.5 Information needed

| # | From | Item | Why | How to get it | Unblocks |
|---|---|---|---|---|---|
| 1 | user | How the current build will be served, and a JWT: you start X:\ServicioSAP (17:43:38 build) under IIS Express, or rebuild the share and press F5, then paste only the token from login/auth. | The share's bin\ServicioSap.dll (2026-09-26 08:21) has none of yesterday's code, and every route is [Authorize]. | "C:\Program Files\IIS Express\iisexpress.exe" /path:X:\ServicioSAP\ServicioSap\ServicioSap /port:62337, then POST http://localhost:62337/login/auth {Username, Password} and paste the returned token. | Test steps 0 and 3-14 |
| 2 | user | Test BPs and test data: (a) a BP with NO validated phone, for order tests; (b) a BP whose validated MOVIL belongs to the team, for SMS tests (1500007539 per SPEC §7, or 1500008218); (c) its Magento customer id; (d) a 10-digit team phone; (e) confirmation of SKU OSTE00443 / '12 M MA P INM' and a VIU SKU without '+'. | Positive tests need a BP that exists in SAP client 110 and a SKU priced for SalesOrg 04/05. A real SMS must reach a team phone. | You choose them. Check each with the step 1 GET (A_GET_TelefonoValidado) and the step 4 GET (partner/client/{BP}). | Test steps 4-12 |
| 3 | DBA | Q2: is mavicbosandroid.grupomavi.com/ServicioAndroid production? Is there a non-production copy? Who deletes test rows (CRED_SOLICITUD_WEB_DATOS_TEMP by idMagento, VTASdArtCreditoWeb by IdArtCreditoWeb, VTASDCodigoVerificacioneCommerce/TcAAEA00030_EnvioMensajes by Cliente+IdCarrito)? | Every write test lands in the same database LAN, the Credit area and the liberador use. | Ask the ServicioAndroid DBA or owner. If there is a copy, change the connection string only in the local X: Web.config. | Test steps 8-12 |
| 4 | businesspartner-api owner | The deployed A_GET_TelefonoValidado: its source or commit, and real responses. Does it filter ZtipoCte='MOVIL'? Does it filter Zvaltel=true BEFORE max()? Where do null Zfecha/ZfechaCap sort (the share copy turns them into '00000000', which wins)? What is the exact ZtelCte format (10 digits, or '+52'/spaces)? Is ZvalTel a JSON boolean or number (a string 'X' reads as false in EsVerdadero)? Does it need auth? What is URL_BP_API in production? | It is the single source for @TelefonoValidado, LadaValidar/TelefonoValidar and the getSms phone (Q4). With the share copy, the captured BP's validated MOVIL 5522122584 loses to an undated unvalidated phone, so getSms answers '0' and ValidacionTelefono is 1. | The businesspartner-api owner shares the deployed code. You run GET https://businesspartner-api.mavi.fun/A_GET_TelefonoValidado?sCliente=<the captured BP (CAPTURAS_REALES_APIS.md:49-56)> and for 1500007539 / 1500008218, and paste the JSON. | Q4-residual; expected values of test steps 8, 10 and 11 |
| 5 | other (AWS configurables owner / BP phone-validation owner) | AWS catalog 'ORIGEN VALIDACION NUMERO CTE': is it registered? Does Valor1 hold the origin names? What does AI_GET_CatalogoConfiguracion answer for an unregistered name (200 [] or 404/empty)? Which ZappOrig value does web phone validation write to CteTelSet? | Q3. An error answer makes every order for a BP with a validated phone fail with 'Error, ...', where LAN inserted with ValidacionTelefono 1. A ZappOrig missing from Valor1 always gives 1. | Ask the AWS configurables owner and the BP / e-commerce phone-validation owner. Or you run GET {AwsBaseUrl}AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=ORIGEN%20VALIDACION%20NUMERO%20CTE and GET {AwsBaseUrl}AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=NO%20EXISTE%20TEST. | Q3; test step 10 |
| 6 | user | DDL of the ServicioAndroid tables. You run: SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, IS_NULLABLE, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('CRED_SOLICITUD_WEB_DATOS_TEMP','VTASdArtCreditoWeb','VTASDCodigoVerificacioneCommerce','TcAAEA00030_EnvioMensajes') ORDER BY TABLE_NAME, ORDINAL_POSITION; | To confirm a 10-digit BP fits in every Cliente column (only a document claims varchar(10)), that articulo is at least 20 characters, the types of precio/Abono/costo, and whether the nvarchar AddWithValue in GetIdRefAsync forces conversions. | You run the query on ServicioAndroid (mavicbosandroid) and paste the output. | Test steps 8 and 11; the AddWithValue finding |
| 7 | user | Empty-Cliente rows in the SMS tables. You run: SELECT COUNT(*) FROM VTASDCodigoVerificacioneCommerce WITH (NOLOCK) WHERE ISNULL(Cliente,'') = ''; SELECT COUNT(*) FROM TcAAEA00030_EnvioMensajes WITH (NOLOCK) WHERE ISNULL(Cliente,'') = ''; | Bug 2: on the new-client path the SMS lookup runs with Cliente = '', and a match puts another person's phone on the row. | You run it on ServicioAndroid. | Severity and priority of bug 2 |
| 8 | user | Baselines before the positive runs. You run on ServicioAndroid: SELECT MAX(id) FROM CRED_SOLICITUD_WEB_DATOS_TEMP; SELECT COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP WHERE idMagento LIKE 'TST%'; reader A: SELECT TOP 1 Telefono FROM TcAAEA00030_EnvioMensajes WITH(NOLOCK) WHERE IdRegistro IN (SELECT IdCodigoVerificacioneCommerce FROM VTASDCodigoVerificacioneCommerce CV WITH(NOLOCK) WHERE CV.Cliente = '<BP>') ORDER BY Id DESC; reader B: SELECT TOP 1 Telefono FROM TcAAEA00030_EnvioMensajes WITH (NOLOCK) WHERE Cliente = '<BP>' ORDER BY Id DESC; | These give the expected LadaValidar/TelefonoValidar and @TelefonoAValidar for the test BP, and ids to compare against afterwards. | You run them and paste the output. | Expected values of test steps 8-11 |
| 9 | SIGMAVI | SIGMAVI CondicionesCredVtaLinea. You run: SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CondicionesCredVtaLinea' ORDER BY ORDINAL_POSITION; SELECT TOP 20 * FROM CondicionesCredVtaLinea WITH (NOLOCK);. Also, which host is behind the Settings.Server alias 'DEVMAVI'. | Q6. GetCondicionAsync expects CondicionMagento and SD29 codes, while GetPlazosAsync and LAN use the legacy columns (Condicion = Magento text). Depending on which is true, product lines are priced through the catalog fallback, or silently skipped. It also decides where Q5 goes. | You run it on SIGMAVI; the SIGMAVI owner confirms the DEVMAVI host. | Q6, Q5; expected lines of test steps 8-9 |
| 10 | user | SD29 capture: GET /ZAPI_PROPRELIST_SRV/PropreListSet?sap-client=110&$format=json&$filter=Articulo eq 'OSTE00443'. Also for DIB+00104, twice: once with a raw '+' and once with %2B. Per row: OrgVtas, Sucursal, CDistr, Lista, Condicion, Vigente, Precio, Abono, Descuentocategoria (exact JSON name). | Confirms or refutes B1 ('+' read as a space), counts the 04/05 rows per condition (Q16), gives the code for '05 M P DIF' (NEW-A), and checks that the discount field name matches the model. If it does not, the CEILING discount is never applied. | You or Basis run it through Hoppscotch (Claude does not call SAP). | Bug B1 severity, Q16, NEW-A; expected prices of test steps 8-9 |
| 11 | user | LAN history on ServicioAndroid. You run: SELECT origen, COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP GROUP BY origen; SELECT sexo, COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP GROUP BY sexo; SELECT TOP 50 nombre FROM CRED_SOLICITUD_WEB_DATOS_TEMP WHERE nombre LIKE '% %' ORDER BY id DESC; SELECT TOP 50 IdArtCreditoWeb, Orden, COUNT(*) n FROM VTASdArtCreditoWeb WITH (NOLOCK) GROUP BY IdArtCreditoWeb, Orden HAVING COUNT(*) > 1 ORDER BY IdArtCreditoWeb DESC; SELECT SUM(CASE WHEN costo IS NULL THEN 1 ELSE 0 END) nulos, SUM(CASE WHEN costo = 0 THEN 1 ELSE 0 END) ceros, SUM(CASE WHEN costo > 0 THEN 1 ELSE 0 END) positivos FROM VTASdArtCreditoWeb WITH (NOLOCK); SELECT COUNT(*) total, SUM(CASE WHEN precio <= 0 THEN 1 ELSE 0 END) cero_o_neg FROM VTASdArtCreditoWeb WITH (NOLOCK) WHERE articulo = 'SEGU00001'; | Decides with data: Q15 (did any origen other than PRODUCTOS MX ever arrive?), the sexo case and domain question, Q19 (how often nombre has two names), Q16 (did LAN's fan-out really happen?), Q18 (what LAN wrote in costo), Q22 (zero/negative shipping lines). | You run the queries and paste the output. | Q15, Q19, Q16, Q18, Q22, sexo-case question |
| 12 | user | Intelisis marital-status domain. You run: SELECT EstadoCivil, COUNT(*) FROM Cte WITH (NOLOCK) GROUP BY EstadoCivil; and the SAP functional team provides the Marst code list with texts. | Q14: to map BP05MA Marst to LAN's estadoCivil text. | You run it on Intelisis; the SAP functional / master-data team sends the code table. | Q14 |
| 13 | user | BP05MA captures: GET partner/client/ma/{BP} for (a) a BP without a birth date, (b) a migrated customer with two given names, (c) a customer with a known marital status. Also GET partner/client/{BP} to see whether ZB_DATOS_CLIENTE returns ZidMagento filled. | The empty Birthdt wire format (/Date(-62135596800000)/ would be stored as 0001-01-01 instead of 1900-01-02, Q11); Namemiddle (Q19); Marst (Q14); ZidMagento (Q9 option C). | You run the GETs through the local ServicioSAP (test step 4) and paste the fields. | Q11 edge case, Q19, Q14, Q9 option C |
| 14 | Basis | SAP Basis: (a) the default logon client of the gateway when no sap-client is sent; (b) whether the ServicioSAP technical user may PATCH ZSDT_CTE_ODATA_SRV/ZSDT_CTE_ENTITYSet; (c) whether every BP in ZB_DATOS_CLIENTE has a ZSDT_CTE row; (d) read access to ZQBP_EDITARCLIENTE_SRV/CteTelSet; (e) whether the Gateway decodes '+' in a query string as a space; (f) whether Gender '3' is valid in BP01. | (a)-(c) are the ways getSms turns into '-1' (Q9 and the sap-client bug). (d) is needed for test step 10. (e) is the actual impact of B1. (f) is the MapGender question. | Ask SAP Basis/ABAP. Or, with approval, run test step 12 on the test BP and read '[SAP ZidMagento PATCH RESPONSE]'. | Q9-PATCH, test steps 10 and 12, B1 severity, MapGender question |
| 15 | DBA | The SMS dispatcher SpAAea00030_ArmadoSMS: its source, or whether it joins Cliente to Intelisis Cte/CteTel. | If it does, BP-keyed rows are never sent, EstatusEnvio stays 1, and every later getSms answers '3' without a real SMS (LAN branch :2136-2139). | The ServicioAndroid DBA or SMS team sends it; you can run sp_helptext 'SpAAea00030_ArmadoSMS' (only named at SPVTASCodigoSeguridadeCommerce.sql:83, not on the share). | Test step 11 |
| 16 | other (liberador owner) | The liberador contract (R3): which orders trigger it (existing BP, new client, or both); which cliente value it expects (BP, Magento id, or nothing); whether it still writes Intelisis Venta; the exact callback payload the DMZ expects; which columns of CRED_SOLICITUD_WEB_DATOS_TEMP / VTASdArtCreditoWeb it reads (nombre, sexo and its case, estadoCivil, rfc, origen, costo); and whether costo NULL and 0 are treated differently. | The commented block (OrderMethods.cs:692-730) targets the opposite population to LAN and sends the Magento id. The column readers set the priority of Q14, Q15, Q18, Q19 and the sexo case. | Ask the liberador service owner (service on 172.16.215.51:3026; Valentin per FLUJO_CREDITO_LAN_VS_SAP.md §10). | Liberador-trigger question, Q18, and the priority of Q14/Q15/Q19/sexo case |
| 17 | Magento | Magento / app answers: (a) which client sets payment additional_data 'origen', with which values, and whether 'DIMAS MX' is still possible; (b) the full list of credit conditions per store, including whether '05 M MA/VIU P DIF' is sold; (c) whether a guest (customer id 0) can reach credit checkout; (d) whether the credit checkout enforces a 10-digit phone; (e) whether order/new ever carries infoCliente.sexo (Magento248 PlaceOrder does not set it; MaviCredito CreditoManagement.php:531 sends MASCULINO/FEMENINO in another payload); (f) at the BP release, confirmation that getSms 'cuenta' and order/new 'infoCliente.cuenta' carry the identical BP string. | Q15, NEW-A, the guest bug, Q10, the MapGender question, and the key the order uses to find the texted phone. | Ask the Magento / Mavi_CreditoCheckout / app team; or check Magento logs for '[CreditQuote] Sync Body' entries that contain "origen". | Q15, NEW-A, guest bug severity, Q10, MapGender question |
| 18 | other (DMZ owner) | The deployed DMZ: its production Web.config values for URL_INTELISIS and URL_SAP, and which build is deployed. The share working copy has URL_INTELISIS = https://localhost:44399/ and URL_SAP = the deployed kdll3fhcyo-lan/SAP. | It decides when real credit orders with C... accounts reach ServicioSAP (R1). If production looks like the share copy, getSms/validateSms/credit/codigoPromocion would go to ServicioSAP, which has no codigoPromocion route, so the promoter checkout box would break. | Ask the DMZ owner. | Test step 14; timing of the Q9 switch |
| 19 | SIGMAVI | Whether any commission or report process reads SIGMAVI VentasCupones.IdEcommerce / FechaUtilizacion for credit web orders. | It is the only data effect of Q8 option A. | Ask the SIGMAVI and commissions owners. | Q8 option A |
| 20 | Credit area | Credit-area rulings: Q12 (a brand-new web client or a blank ZtipoCliente: ValidacionTelefono 1 or 0? should BPs created by ServicioSAP get ZtipoCliente 'Nuevo'?) and Q10 (is 'no row, visible error' acceptable for a short phone?). | Business rules that LAN never exercised, because it wrote no row for new clients or short phones. | Ask the Credit area. | Q12, Q10 |
| 21 | other (Conexion.dll owner) | Whether Conexion.dll resolves SAP and SigMavi on machines other than magalindo's (CATECINF214119D). | All SAP URLs and credentials come from Conexion.dll. If it does not resolve on Claude's machine, the local run in step 0 fails every SAP call. | Ask the Conexion.dll owners (Marcos/Diego, AUDITORIA R-12), or it shows up at test step 4. | Test steps 4-12 on Claude's machine |
| 22 | user | The runtime sap.log of the instance under test, after each step: C:\inetpub\wwwroot\log\sap.log or <baseDir>\Logs\sap.log. | It is the only runtime evidence. The share's Logs\sap.log was last written 2026-09-17 and shows no getSms or PATCH run. | You copy it after each test step. | Verification of every test step |
| 23 | user | Your decisions on the pending items: Q5 go-ahead and error texts; Q8 option A; Q9-PATCH (A/B/C); Q20 log fix; the R4 logging package; NEW-B; Q10; Q15; Q19; Q14; Q12; new-client sexo; sexo case; MapGender letter codes; liberador trigger; Q16; Q18; Q22 close; NEW-A; Q21 record; and a fix go-ahead for bugs B1, 2, 3 (sap-client) and SendSmsNewNumber. | Each one is a code change or a documented acceptance of a difference from LAN. | Answer in chat. Each question above has options and a recommendation. | Code changes, and test step 13 |
| 24 | user | Optional: the clock and time zone of the IIS host vs the ServicioAndroid SQL host (run SELECT GETDATE(), SYSDATETIMEOFFSET() and compare with the IIS server time), plus a data.db with table servicio_guias and a local-only Web.local.config SQLITE_DB_PATH on X:. | The fecha = DateTime.Now finding, and seeing the R5 guide row on Claude's machine. | You run the SELECT and copy a data.db. | Low-priority fecha bug; R5 visibility in local tests |

### 24.6 Documentation corrections (these supersede the older statements; the older sections are kept as history)

- PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md:1934 (§23.9 Q8) says 'remove only the burn (OrderMethods.cs:705-709)'. The burn is now at ProcessCreditPaymentAsync :678-682 (HandlePromoCodeAsync call at :681); the try/catch is :674-690 and the liberador block :692-730. promo_removal_2026-09-26.json cites the same stale lines (:705-709, :701-717, :719-757). Anyone applying option A must grep for the lines first.
- PLAN :1887-1893 (§23.5 bugs), current lines: B2 is :749-753 (throw :654-655); B3 is UPDATE :1070-1077 plus the agent GET at :1087; B4 is :1777; B5 is :645-646; B6 is :681. B7 is half fixed: IsValidatedAsync now logs to sap.log (:630), only ObtenerNumeroTablaSmsAsync (:610) is still Console-only. :1895 'sDatosPedido[20] ... not verified' is now verified (ToArray index 20 = estado, 17 = codigoPostal; used at :1796; SKU rewrite at ValidarRegionCelulares :2066-2120).
- PLAN :1940 (§23.9 Q20): CheckClientCreditAsync is now :741-754 and the throw :654-655. :1938 (Q14): EstadoCivil "" is now :794 and Marst "2" is :2650. :1941 (Gender) and §23.8 :1924: OrderMethods.cs:2673/:2670 is now :2646.
- PLAN :1941 (§23.9 Gender row) says the order path 'already defaulted to "1"'. It does not record that OrderMethods' own MapGender (M/MASCULINO=1, F/FEMENINO=2, unknown '') was deleted and replaced by BusinessPartnerMethods.MapGender (H=1, M=2, unknown '3'), which flips the meaning of 'M'. The claim that it 'closes §17.4' is too strong: the Console-only line-loop logs (:939, :976, :998) are still open, and :1297 ('MapGender empty returns ""') is stale; it now returns "1".
- PLAN :1917 (§23.8 SexoLegado) and :1859 (§23.4 Q1 recommendation) still say sexo = '' for an empty Gender, and :1869 (Q11) says 'No Birthdt: NULL'. The code maps ''/'1' to Masculino and a missing Birthdt to 1900-01-02 (SolicitudCreditoWebMethods.cs:240, :553, :571-574). The §23.9 Gender row supersedes them, but these sections are not marked.
- PLAN :1702 and :1808 (§22.3, §22.8 #1) still list 'truncate MetodoEnvio/sexo or ALTER' as pending. Q1 resolved it: Sizes at SolicitudCreditoWebMethods.cs:166-224, @sexo 9, @MetodoEnvio 12.
- PLAN :1736-1739, :1754, :1809, :1862, :1867 (§22.4 option A, §22.5 #5, §22.8 #2, §23.4 Q4/Q9) still recommend a CteTelSet C# helper with LAN's rule. It was superseded by the Q4 answer: no helper exists (TelefonoValidadoLan removed), and all three consumers call GetTelefonoValidadoAsync.
- PLAN :1124 (§15.1) says A_GET_TelefonoValidado already applies Tipo='Movil' AND ValidacionTel=1. The share copy (businesspartner-dev A_GET_TelefonoValidado.py:17-36) applies neither: it takes max() over all phones, and null dates become '00000000' (AS_GET_ZQBP_EditarCliente_CteTel.py:60-62), so undated phones win. Only the MOVIL filter of the deployed API has been asserted, by the user.
- PLAN :1935 (§23.9 Q9) lists 'phone tie-break by numeric ZidcteTel' as a ServicioSAP fix. That helper was removed by Q4; the only tie-break now lives in the API (A_GET_TelefonoValidado.py:5-15). The same row says 'DMZ NOT switched (still LAN)'. That is true for the code (curl.Post on URL_INTELISIS), but the share's DMZ working copy has URL_INTELISIS = https://localhost:44399/ (DMZ WebApiMagento\Web.config:17), so in that copy getSms/validateSms already reach a local ServicioSAP. The production config is unknown.
- PLAN :1907 (§23.7 step 1) and :1845 treat the 08:21:56 bin as current. The share bin\ServicioSap.dll (2026-09-26 08:21:56) is older than every §23.8/§23.9 change (sources 13:38-17:43). The only current build is X:\ServicioSAP\...\bin\ServicioSap.dll (17:43:38). Step 1 should say a rebuild is required.
- PLAN :1751 (§22.5 #2) cites ProcessCreditPaymentAsync at :665; it is at :638, with the CrearSolicitudCreditoAsync call at :667. :868, :1354, :1378, :1647 cite the liberador at :755-787/:740-772/:724-756 and esClienteNuevo at :720; now it is :692-730 (if at :693) and :645. §22.7 (:1767-1792): all ServicioSAP lines have shifted by about -24 (SetOrderAsync :1704, credit branch :1765-1788, SD36 :1732, cash guide :1819, BuildSapOrderAsync :1828).
- PLAN §23.9 is missing these open items: Q2, Q3, Q6, Q7, Q10, Q12, Q15, Q16, Q18, Q19, Q21 (no balance check = parity), Q22 (can be closed, see evidence); the R7 decision that the cash gaps are out of scope (§22.7 A-C, §22.8 #5-#7); the Q4 residual (the API selection rule); and the new-client sexo/case items.
- SPEC_NIP_SMS_SERVICIOSAP.md:3-4 says 'design only, no code written yet'; the code exists (CreditController.cs:29-71, CreditMethods.cs:236-463). The body describes the pre-Q4 design: :56, :79, :93, :125, :127, :167 (CteTelSet + C# MOVIL/Zvaltel filter; GetCteTelAsync/FechaSap internal). The code calls A_GET_TelefonoValidado plus a trim and a 10-character check (CreditMethods.cs:355-359); GetCteTelAsync and FechaSap are private; GetTelefonoValidadoAsync is internal.
- SPEC :65 and :126 say validateSms returns 'err' on an exception or a null input. The code returns e.Message (CreditMethods.cs:458-462), as LAN does. :92 and :154 say GetIdRefAsync is built with string.Format; it is parameterized (:168-175). The remaining string.Format INSERT is SendSmsNewNumberAsync :140-144. :112 and :124: int.Parse is in the controller (CreditController.cs:39), and ExistingCustomerAsync uses a regex, Contains and partner != null (:331-350). :80 and :166 say the PATCH goes to client 110; it sends no sap-client (BusinessPartnerMethods.cs:842-843). :143 (order side inconsistent) was resolved by Q4. :38, :43, :73, :102: OrderMethods.cs:1804 is now :1777. :173: the test prep should read A_GET_TelefonoValidado, not to_CteTel.
- SPEC :134 treats 'no [SAP ZidMagento PATCH] line in Logs\sap.log' as evidence. The share's Logs\sap.log was last written 2026-09-17, and Logger.SAP also writes C:\inetpub\wwwroot\log\sap.log (Helpers\Logger.cs:11), so the share file says nothing about the running build.
- FLUJO_CREDITO_LAN_VS_SAP.md:1-5 is marked 'vigente, 2026-09-11'; most of it is superseded by runbook §9, §17, §22-§23 and it should be marked historical. Specifically: :105-113 and :341-349 (SP called by position/name; now a direct INSERT, SolicitudCreditoWebMethods.cs:35-230); :111 (HandlePromoCodeAsync unreachable; it is at :681); :115, :325, :441 (guide never saved for credit; it is at :1767); :136 (throws on zero lines; false: no throw, and :684-690 swallows and answers 'Concluido'); :204-209 (SD29 '?? FirstOrDefault' fallback; now OrgVtas filter + condition match + skip, :933-954); :216-227, :432, :448 (IsValidatedAsync via BP05MA, HasValidPhoneOriginSAPAsync; now A_GET_TelefonoValidado, and the helper was deleted).
- FLUJO :268-271 (§5.1 'DECISIÓN TOMADA: stop the order on balance') contradicts runbook §16.5/§23.3 and the code, which has no balance check (LAN parity: checkSaldo was dead). :300 (logic still reads IntelisisTmp over a linked server) is now C# (SolicitudCreditoWebMethods.cs:315-331, :384-404). :314-325 (§6: rfc/sexo/fecha empty, sucursal 0, sucursalDestino 0, lada 0): now rfc = Stcd1, sexo = SexoLegado, fecha = Birthdt or 1900-01-02, sucursal 504/505 (:800), sucursalDestino and RedimirMonedero from the order (:808-809), lada split 2/3 (:768-774); only estadoCivil is still ''. :328 and :434 ('Magento does not send origen') are false: OrderManagement.php:452-454 and :705-708. :359 ('400 with the message') contradicts :436 and the code, which answers 200 'Error, ...' (OrderController.cs:45-46). :392-393 (the SPs are kept) is superseded. :175-177: codigo_promotor and OrigenIdMagento now exist in InfoClienteRequest (:56, :67), and origen is hard-coded as 'PRODUCTOS MX', not 'ServicioSAP'. :231, :236, :245, :400, :402: the liberador is now :692-730, Web.config:40 and :42 hold liberador URLs (host 172.16.215.51:3026), esClienteNuevo is :645/:693, the return is :1782-1787, BuildSapOrderAsync is :1828.
- _IMPLEMENTACION_SP_CREDITO/credit_parity_2026-09-26.json describes the pre-Q1/Q4 state: orchestration step 3 and the phone steps (numeroValidado via BP05MA to_CteTel), row steps 5, 7, 19, 24, 30 (no Size, NULL birth date, 8152), testability :2777, :2801, :2913, :2919 (D1 blocking with 8152, incrementId <= 20 characters; @idMagento is now Size 12, so a longer incrementId is cut), :2789 (the binary is 'already done'; it is stale), and the lines step 16 (unsized @Articulo; now Size 20). Web.config citations are off by one after the removal of SAP_BASE_URL (URL_BP_API is :29, AwsBaseUrl :27, SQLITE_DB_PATH :59, URL_DMZ :56, JWT/hash keys :31-39).
- Code comments: ServicioSap Methods\Credit\CreditMethods.cs:256 says 'CteTel -> CteTelSet'; the source is A_GET_TelefonoValidado (:355-359). Models\SAP\Order\InfoClienteRequest.cs:58-66 says OrigenIdMagento is 'PENDIENTE DE ACLARAR'; Magento fills it from mavi_monedero_data.original_order_id (OrderManagement.php:722-726), i.e. the original order behind a wallet redemption.

### 24.7 Contradictions resolved

- §23.9 and the Gender row. The request-row and testability agents said §23.9 has no Gender row; the docs agent cited it at :1941. I read the file: the Gender row exists and is the last line (1941; wc -l gives 1940 because there is no trailing newline). The correction that remains valid is that the row does not record the MapGender letter-code flip.
- Q22. Orchestration said EQUIVALENT (Magento sends a float); lines-condition said DIFFERENT. Decided EQUAL_TO_LAN in practice. getDecimalFormat returns (float)number_format (OrderManagement.php:1002-1005), and the captured payloads show "costoEnvio":"0"/"150" (magento_payloads.md:26, :55). The rules differ only for "0.00" or a negative value, and neither has been observed. Recommended: close.
- Guest bug severity. Orchestration said low, docs said medium. Kept low: verified at :645-646 with Magento sending (int)customerId (OrderManagement.php:703), but whether a guest can reach credit checkout is NO EVIDENCE, and the effect is an orphan request row, not money.
- HandlePromoCodeAsync line and severity. The agents cited 1082 and 1087, and low vs medium. Both describe the same code: UPDATE at :1070-1077, unguarded AS_GET_ZQBP_AGENTE GetAsync at :1087. Kept low: coupons are deprecated, and Q8 option A removes the call from the credit path.
- LinkMagentoAccountAsync missing sap-client. diff-review marked it not introduced on 09-26. Verified at BusinessPartnerMethods.cs:842-843. The method is older, but yesterday's NIP port (CreditMethods.cs:271-276) made it run on every logged-in getSms, so the failure scenario comes from yesterday's change. Marked introduced = true, with that explanation.
- Q5 blocks testing. Lines-condition said true; orchestration and request-row said false. Decided false for the current plan, because positive tests use a valid condition. Test step 13 is added for after the change is applied.
- Q9-PATCH blocks testing. nip-sms said true; diff-review and testability said false. It blocks only the cliente > 0 step; every other getSms test sends cliente '0'. Marked true, scoped to test step 12.
- Q6 blocks testing. Lines-condition said false but also said the expected product line of P2/P3 is NO EVIDENCE until the schema is known. Marked true, because a pass/fail judgment of the positive line test depends on it.
- DMZ switch. PLAN §23.9 Q9 says 'DMZ NOT switched (still LAN)'; the Q8 row and the share DMZ Web.config say otherwise. Verified: DMZ CreditController.cs:76, :107 still use curl.Post (URL_INTELISIS), but the working copy's URL_INTELISIS is https://localhost:44399/ and URL_SAP is https://kdll3fhcyo-lan.grupomavi.com/SAP/ (Web.config:16-19); order/new already uses PostSAP. Both statements hold, one for the code and one for the working-copy config. The production config is NO EVIDENCE.
- A_GET_TelefonoValidado filtering. PLAN §15.1 says it filters Movil and ValidacionTel; the user says the deployed version filters MOVIL; the share copy filters neither. Verified in the share copy (A_GET_TelefonoValidado.py:17-36, AS_GET_ZQBP_EditarCliente_CteTel.py:60-62): max() over all phones, with undated phones sorting first. Kept open as the Q4 residual, with the deployed source requested.
- Balance check. FLUJO §5.1 says it must stop the order; runbook §16.5/§23.3 and the code say there is no check. Decided: parity with LAN (checkSaldo was dead), recorded as Q21 with a doc correction.
- Error answer. FLUJO §7 says HTTP 400; FLUJO §10 and the code say 200 'Error, ...' (OrderController.cs:45-46). Decided 200, per R4.
- Orchestration step 13 (the phone split is DIFFERENT) vs the phone agent step 5 (SAME). Both are right in scope: the source chain SMS, then validated, then order phone is the same; the handling of short phones differs (Q10).

## 25. 2026-09-28/29: decisiones y cambios de paridad

_Fuentes: re-evaluación de las 143 reglas de [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]] contra el código actual (workflow wf5) y paridad columna por columna de las 59 columnas de `CRED_SOLICITUD_WEB_DATOS_TEMP`, defaults del SP vs ServicioSAP (workflow wf4), ambos del 2026-09-29 (JSON de sesión, no copiados al vault). El detalle de cada cambio está en [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]]. Código: working copy **sin commit** de `ServicioSAP`, rama `SpExportaEcommerce`, 3 archivos (`Methods\Credit\SolicitudCreditoWebMethods.cs`, `Methods\Order\OrderMethods.cs`, `Models\SAP\Order\InfoClienteRequest.cs`; +69/−41 según `git diff --stat`). Compila (Roslyn, 221 archivos, exit 0). Las secciones anteriores se conservan como historia; donde esta sección las contradice, manda esta._

> [!note] Numeración
> D1-D10 de esta sección son las decisiones del usuario del 2026-09-28/29. No son las D1-D10 de diseño de [[FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO]] ni la columna "Rel." de la §23.4.

> [!warning] wf4 y wf5 son anteriores a tres arreglos
> Se aplicaron después de lanzar esos workflows y se dan por resueltos aunque los JSON digan otra cosa: (1) G2-13 `estadoCivil` desde `Marst`; (2) G2-12 `sexo` con `Gender` vacío → `''`; (3) `uen`/`sucursal` con comparación exacta de `storeId`. Ver §25.2.

### 25.1 Decisiones del usuario (2026-09-28/29)

| # | Decisión del usuario | Qué implica |
|---|---|---|
| D1 | Las cadenas de conexión del `Web.config` (`MAVICBOSANDROID` `:13`, `ADMINDOC` `:15`, login `usrintranet`) son la fuente correcta de las BD SQL; `Conexion.dll` es para S4. Los valores de ambiente (credenciales, `URL_DMZ` `:56`, `URL_INTELISIS` del DMZ) son de Dev y cambiarán en QA/Prod: **no son stoppers**. | `ConexionSQL.cs:47`, `:106`, `:140`, `:171` se quedan como están. **Abierto:** SIGMavi hoy también sale de `Conexion.dll` (`Conexion.Data.getconexion(settings.Server, "SIGMavi")`, `ConexionSQL.cs:19`, `:79`): ¿se queda así o pasa al `Web.config`? |
| D2 | Magento mandará en `infoCliente.cuenta` **solo el BP numérico de SAP**; las cuentas Intelisis `C…` nunca llegan a ServicioSAP (configuración y datos del lado de Magento). Toda regla de LAN que dependía del prefijo `C` se lee como "BP existente". | Mientras Magento248 siga mandando `getCuentaIntelisis()` (`Omnipro\PlaceOrder\Model\OrderManagement.php:719`, wf5 G1-13), toda orden real de crédito termina en `sin cuenta`: es tema de Magento, no de ServicioSAP. |
| D3 | El catálogo AWS `ORIGEN VALIDACION NUMERO CTE` ya está dado de alta con 23 valores `Valor1` (lista en `MappingMetods\CatalogoConfiguracion.csv`). | `@ValidacionOrigen` ya no cae en el `throw` de catálogo inexistente (`ProductMethods.cs:708-735`). **Abierto:** si se agregan orígenes de la era SAP como `CteXpressFrontSAP`. |
| D4 | `A_GET_TelefonoValidado` (businesspartner-api) ya devuelve el teléfono validado más reciente: aceptado. | Cierra el residual de Q4 (§24.3). El análisis de la copia del share (`A_GET_TelefonoValidado.py:17-36`) queda como historia. |
| D5 | Regla de paridad de valores: ServicioSAP debe guardar **exactamente** lo que guardaban LAN + SP en cada columna (NULL vs `''` vs default del SP, literal, `ISNULL` o `GETDATE`), tomando como fuente el equivalente SAP. | Origen de los cambios de `?? ""`, `@fecha`, `confirmado` y `RedimirMonedero` (§25.2). Es el criterio para todo lo pendiente de §25.5. |
| D6 | Crédito solo para un BP existente: cuenta vacía o no encontrada → `sin cuenta`, sin fila. Se quitó el camino de "cliente nuevo" e invitado, igual que `checkCliente` de LAN (`CreditMethods.cs:124`, `:257`, `:725`). | Gate en `ProcessCreditPaymentAsync` (`OrderMethods.cs:642-650`). |
| D7 | `origen` exactamente como LAN/SP: el `infoCliente.origen` de Magento si viene; si no, `PRODUCTOS MX` (LAN `OrderMethods.cs:646`). | `InfoClienteRequest.origen` (`:74`) y `Origen = info.origen ?? "PRODUCTOS MX"` (`OrderMethods.cs:798`). |
| D8 | `fecha` la arma el SP internamente (`DECLARE @fecha` / `SELECT @fecha = GETDATE()`, SP `:162`, `:170`). El INSERT de ServicioSAP es ahora textualmente el del SP: 59 columnas y valores, literal `1` en `confirmado`, `ISNULL(@RedimirMonedero, 0.00)` (SP `:223-344`, `:336`). | `SolicitudCreditoWebMethods.cs:38-39`, `:143`, `:152`, `:212`. Cierra el bug de `fecha = DateTime.Now` (§24.4). |
| D9 | `SIGMavi.VentasCupones` es la misma tabla que `IntelisisTmp.VTASCVentaCupon` (renombrada); solo difieren las reglas. | Cierra la parte "¿qué tabla?" de Q7. Las reglas (TOP 1, validar antes, regenerar siempre: MATRIZ G5-07/G5-08) siguen en Q8. |
| D10 | Tabla de códigos `Marst` tomada del SAP GUI: 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 Pareja de hecho. Los códigos de `Gender` siguen `BusinessPartnerMethods.MapGender` (`:777`). | `EstadoCivilLegado` (`SolicitudCreditoWebMethods.cs:594-606`) y `SexoLegado` (`:567-589`). |

### 25.2 Cambios de código (working copy, sin commit; verificar con `git diff`)

- **`OrderMethods.ProcessCreditPaymentAsync`** (`:638`): gate `sin cuenta` en `:642-650`. Si la `cuenta` está vacía o `CheckClientCreditAsync` no encuentra el BP, escribe `[CREDITO SIN CUENTA]` en sap.log (`:648`) y lanza `sin cuenta` antes del único INSERT (`:660`). Se quitaron `esClienteNuevo`/`esInvitado` y los mensajes "Los invitados no pueden pagar con crédito" y "no tiene crédito activo en SAP". Devuelve siempre `cuentaBp` (`:723`). El bloque del liberador sigue comentado, ya sin el `if (esClienteNuevo)` y con la nota `PENDIENTE (T18)` (`:685-686`).
- **`OrderMethods.CrearSolicitudCreditoAsync`** (`:751`): `uen = order.storeId == "viu" ? 2 : 1` (`:755`), comparación exacta como LAN `OrderMethods.cs:628`; arregla también `sucursal` 504/505. Sin `?? ""` en `Email`, `Direccion`, `Exterior`, `Interior`, `Delegacion`, `Poblacion`, `Estado`, `Colonia`, `Condicion`, `UtmSource` y `MetodoEnvio` (`:779-800`). `Origen = info.origen ?? "PRODUCTOS MX"` (`:798`).
- **`InfoClienteRequest`**: nueva propiedad opcional `origen` (`:74`).
- **`SolicitudCreditoWebMethods`**: `QueryInsert` empieza con `DECLARE @fecha DATETIME; SELECT @fecha = GETDATE();` (`:38-39`), `confirmado` es el literal `1` (`:143`) y `ISNULL(@RedimirMonedero, 0.00)` (`:152`). Se quitaron los parámetros `@fecha`/`@confirmado` (`:212`) y `fila.Fecha = DateTime.Now`. En `ArmarFila`, `EstadoCivil = EstadoCivilLegado(maestro.Marst)` (`:261`); `@estado_civil` Size 11 (`:190`) recorta `Pareja de hecho` → `Pareja de h`, como el SP (`:113`); otro código o vacío → `''`. `SexoLegado`: `Gender` vacío → `''` (paridad LAN, `CreditMethods.cs:837`), `1` Masculino, `2` Femenino, otro → `NO ESPECIFICADO`, que `@sexo` Size 9 (`:177`) deja en `NO ESPECI`.

### 25.3 Qué cierran o cambian respecto de lo anterior

| Punto anterior | Estado anterior | Ahora |
|---|---|---|
| Q1 anchos (§23.8) | Aplicado | **Sigue vigente**: `Size` = ancho del SP, `@cliente` 10. Cubre también `estadoCivil` (11) y `sexo` (9). |
| Q2 ambiente / BD de pruebas (§24.3) | 🔴 bloqueaba pruebas | **No es stopper** por D1: los valores del `Web.config` son de Dev. Toda escritura de prueba sigue necesitando el visto bueno del usuario (§24.2). |
| R1 cuentas `C…` (§24.1; pasos 5, 6 y 15 de §24.2) | Magento todavía manda `C…` | D2: solo llega el BP numérico; `C…` equivale a "BP existente". `C01575835` solo sirve como caso negativo (`sin cuenta`). |
| Q3 catálogo AWS | 🔴 sin dar de alta | Cerrado por D3 (23 valores). Abierto: orígenes de la era SAP (`CteXpressFrontSAP`). |
| Q4 residual (regla de selección de la API) | 🔴 | Cerrado por D4. Sigue abierto el bug bajo de §24.4: `ZtelCte` no se reduce a dígitos (`+52…`, `OrderMethods.cs:626`). |
| Q5 corte temprano por condición | Decidido el 09-26, no aplicado | ⚠️ **Choca con D5.** Con una condición desconocida LAN igual escribe `SEGU00001`, quema el cupón y dispara el liberador (MATRIZ G4-24). Hoy ServicioSAP lanza en `InsertCreditArticlesAsync` (`OrderMethods.cs:847-850`) antes de cualquier línea, y el `catch` (`:677-683`) deja la cabecera sin líneas y responde `Concluido`. El arreglo de paridad es **seguir escribiendo `SEGU00001`** (con 0 líneas de artículo) y continuar, no cortar antes. El usuario tiene que elegir entre Q5 y D5. |
| Q10 teléfono corto | Pendiente | Pasa a los no-row gates (§25.5). |
| Q11 `1900-01-02` | Aplicado | Con D5 es candidato a no-row gate: en LAN un CTE sin fecha de nacimiento no escribía fila (`CreditMethods.cs:835`, `:860-865`); ServicioSAP escribe la fila con `1900-01-02`. |
| Q12 `ValidacionTelefono` de cliente nuevo; Q13 `ClienteMagento`; "sexo de cliente nuevo" (§24.3) | Pendiente / cerrado | **Ya no aplican** por D6: no hay fila sin BP. |
| Bugs de §24.4: invitado `"0"` (antes `:645`) y lookup SMS con cuenta `''` (antes `:1777`) | Abiertos | El invitado termina en `sin cuenta`. Los lookups SMS/validado siguen corriendo con `''` (`OrderMethods.cs:1774-1775`), pero su valor ya no llega a ninguna fila. |
| Bug de §24.4: `sexo` `''` en filas sin BP (antes `SolicitudCreditoWebMethods.cs:242`, hoy `:246`) | Abierto | Ya no aplica (D6). |
| Q14 `estadoCivil` | `''` fijo | Cerrado por D10 (`EstadoCivilLegado`). Queda el tema de mayúsculas. |
| Q15 `origen` | Fijo `PRODUCTOS MX` | Cerrado por D7. Borde inalcanzable: con `origen` explícito `null` LAN guardaba NULL y ServicioSAP guarda `PRODUCTOS MX` (Magento solo lo agrega si no está vacío, `OrderManagement.php:705-708`). |
| `Gender` / `SexoLegado` (§23.9 fila Gender; §24.3 códigos de letra) | Vacío → `Masculino` | D10 + decisión `MapGender`: vacío → `''`; `1`/`2` según `MapGender`. Supera la fila Gender de §23.9 solo en lo que toca a `SexoLegado`, no a la creación del BP. |
| Q20 texto del log | Pendiente | La respuesta es ahora `sin cuenta`, como LAN. Un error de SAP dentro de `CheckClientCreditAsync` sigue viéndose igual que un BP inexistente (como el `catch` vacío de LAN). El log `[CREDITO SIN CUENTA]` entra en "logs más allá de LAN" (G5-20). |
| Q7/Q8 cupones | Pendiente | D9 cierra la pregunta de la tabla; el alcance sigue abierto (§25.5). |
| Bug `fecha = DateTime.Now` (§24.4, antes `SolicitudCreditoWebMethods.cs:283`; la línea ya no existe) | Abierto | Cerrado por D8. |
| Disparo del liberador (§24.3) | Pendiente | Con D6, las filas que llegan al punto del liberador son la misma población que en LAN (BP existente = `C…`). Sigue bloqueado por el dueño del liberador. |

### 25.4 Recuento de paridad

- **MATRIZ (143 reglas), wf5:** 46 EQ, 39 EQ-R, 12 N/A, 10 FALTA, 6 DIF, 30 PENDIENTE; 67 reglas cambiaron de estado respecto de la matriz del 2026-09-24 (corr. verificador 2026-09-29: decía 60, pero 60 es el conteo de `changed_today` de wf5, que además incluye 6 reglas sin cambio de estado) (51 EQ, 13 EQ-R, 8 N/A, 26 FALTA, 37 DIF, 8 DEP). Con los tres arreglos posteriores, G2-12 y G2-13 pasan de PENDIENTE a EQ-R (solo queda el tema de mayúsculas): **46 EQ, 41 EQ-R, 12 N/A, 10 FALTA, 6 DIF, 28 PENDIENTE**. Es un ajuste manual, no re-verificado por workflow.
- **Columnas de `CRED_SOLICITUD_WEB_DATOS_TEMP` (59), wf4:** 35 iguales, 9 con cambio de fuente aceptado, 11 pendientes conocidos, 4 distintas. Ajustado: `uen` y `sucursal` pasan a iguales, y `sexo` y `estadoCivil` a cambio de fuente aceptado, lo que da **37 / 11 / 9 / 2**. Las 2 distintas son `fechaNacimiento` (no-row gate, Q11) y `origen` con `null` explícito (inalcanzable). Los 20 defaults NULL del SP, `estatus` 0, `fecha` = `GETDATE()`, `confirmado` 1 y `ValidacionTelefono` ya salen igual.
  - *Nota del verificador (2026-09-29):* [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] §4 y la MATRIZ §0.1 agrupan distinto el mismo 37/11/9/2. `fechaNacimiento` va con los 9 PENDIENTE, porque es una compuerta sin fila. `OrigenIdMagento` sale de los pendientes y queda con `origen` en los 2 BORDE, los dos por un `null` explícito que Magento no manda. Así ninguna columna es distinta en un caso real.
- **Veredicto de wf5:** la cabecera ya es igual; el proceso completo todavía no (líneas, cupón, todo lo posterior al alta, respuestas y no-row gates). El crítico encontró 5 reglas sin id en la matriz: el reenvío de la orden autorizada (`PedidoExistente`), el contrato HTTP del DMZ de la era LAN, los nulos que abortan LAN, `codigo_promotor` null, y los anchos y el paso único del cupón. También propuso 2 re-scores a PENDIENTE (no-row gates): G2-10/G1-19 y G5-04/G1-05.
  - *Nota del verificador (2026-09-29):* la MATRIZ ya les dio id, con la marca "NUEVA 2026-09-29", fuera de las 143: reenvío = G5-24, contrato HTTP del DMZ = G5-25, nulos que abortan = G1-25, `codigo_promotor` null = G5-26, anchos y paso único del cupón = G5-27. De la revisión por columna salió una más, G3-19 (errores de los lookups de teléfono). La MATRIZ deja los 2 re-scores como sensibilidad (EQ-R 41 → 37, PENDIENTE 28 → 32, MATRIZ §0.2). [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] §1 sí los aplica.

### 25.5 Lo que sigue abierto

**Decisiones del usuario:**

1. **Q5 vs D5** (§25.3): cortar antes o seguir escribiendo `SEGU00001` como LAN.
2. **No-row gates:** LAN no escribía fila cuando venían null los nombres, `codigoPostal`, `incrementId`, `storeId`, `telefono`, `cantidad`, `entityId` o `telefonoClienteMavi`, cuando faltaba la fecha de nacimiento, cuando fallaba el guardado de la guía o cuando `articulos` venía vacío. ServicioSAP escribe la fila; quedan `?? ""`/`?? "0"` en `EntreCalles`, `CodigoPostal`, `IdMagento` y `OrigenIdMagento` (`OrderMethods.cs:784-785`, `:799`, `:807`) y los defaults de teléfono (`:654-657`). MATRIZ G1-07, G1-08, G1-18, G1-20, G1-25, G2-23, G2-29, G3-09 y G5-17.
3. **Cupones (Q8):** alcance: solo la quema en crédito (`OrderMethods.cs:671-675`) o toda la funcionalidad. ¿Algún proceso de comisiones lee `VentasCupones`?
4. **DIMAS MX:** ¿deprecado? PLAN `:943` y `:2111` dicen que sí (MATRIZ G2-03). Con D7 el valor ya es alcanzable y el override de `CREDICCondicionArt` del SP (`:174-183`) no está portado.
5. **Mayúsculas:** LAN guardaba nombres, `sexo` y `estadoCivil` en MAYÚSCULAS (`SP_eCommerceCtenuevo.sql:116-132`); ServicioSAP guarda la capitalización del BP o de SAP.
6. **Precio de las líneas:** fuente SD29 vs `PropreListaDFinal` (G4-21, Q6); varias filas de precio por SKU (Q16, G4-25); `costo` por `spVerCosto` (Q18, G4-29..G4-37); precisión float de `SEGU00001` (G4-09).
7. **Staging `eCommerceDetPedidos`** (G4-02) y **swap TELEFONIA** (Q17, diferido por el negocio; G4-03, G4-12, G4-15..G4-19).
8. **Herramienta de reproceso** (G1-04/G5-03).
9. **Contrato de respuesta HTTP de crédito** (G3-16 y la regla del DMZ que encontró el crítico de wf5, MATRIZ G5-25).
10. **Logs más allá de LAN** (G5-20), incluido el nuevo `[CREDITO SIN CUENTA]` (`OrderMethods.cs:648`).
11. **Limpieza de `ArmarFila`:** los fallbacks a datos de Magento quedaron muertos, porque `maestro` ya no llega null (wf5). También `nombre = NameFirst + Namemiddle` (Q19).
12. **Errores de los lookups de teléfono:** el SP insertaba igual; deberían contar como "no encontrado" en lugar de cortar la fila (MATRIZ G3-16, G3-19).
13. **Lookups con el número de BP:** hoy se consulta con la `cuenta` cruda (`SolicitudCreditoWebMethods.cs:25`, `:27`) y se guarda `maestro.Partner` (`:281`).
14. **Abiertos de D1 y D3:** SIGMavi vía `Conexion.dll`; orígenes de la era SAP en el catálogo.
15. **Sin cambio desde §24:** Q9 (falla del PATCH `ZidMagento`) y los bugs de §24.4 que no se mencionan arriba (B1: SKU sin escapar en SD29; `sap-client` en `LinkMagentoAccountAsync`; `SendSmsNewNumber`).

**Otros equipos:** liberador + callback (dueño del liberador); `creditStatus`/`updateCreditOrderId` (dónde vive la decisión de crédito).

Detalle y evidencia por cambio: [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] · Matriz: [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]] · Flujo: [[FLUJO_CREDITO_LAN_VS_SAP]]

---

## 26. Plan vigente (2026-09-30)

> [!important] El plan vigente del crédito web está en [[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]]
> Ahí están el análisis completo (los 38 pasos de LAN contra ServicioSAP, todas las reglas G1-G5 más las nuevas del 2026-09-30 y las decisiones DU1-DU10) y el **plan de implementación final**: tablero, specs de las tareas LISTO, decisiones con la opción recomendada, tareas de otros equipos, kit V1-V4, sesiones S1-S4 y el tutorial de Fable 5.1.
> Sustituye a la §9 como plan de ejecución y al borrador de §26 del 2026-09-29, que nunca se publicó aquí (no correr `apply_s26.py`).
> Las §0-§25 quedan como historia y evidencia. Sus líneas no se movieron, así que las citas `PLAN:NNNN` siguen valiendo.

#migracion #SAP #dotnet #analisis_bd


## 27. 2026-10-02 — vault vs code: credit parity re-verified, readiness to test

_Workflow `wf_d4c2961d-4e5` (5 rule-group verifiers + testability + decision consistency + synthesizer, read-only). Full result: `_IMPLEMENTACION_SP_CREDITO\credit_vault_parity_2026-10-02.json`. Code: HEAD 2cf425f + uncommitted 2026-10-01 12:12 edits (+109/-64). Share `bin\ServicioSap.dll` 2026-10-02 10:15:08 contains the current code._

**Answer:** Partly. You can start component tests of the credit-request logic now, by POSTing order/new directly. End-to-end testing through Magento is not possible yet. I applied every user decision up to DU20 and re-checked the code (branch SpExportaEcommerce, HEAD 2cf425f plus the uncommitted 2026-10-01 edits, +109/-64). On that basis 119 of the vault's 160 LAN rules behave like LAN or differ only by a user decision (74 %). By group: eligibility 18/25, header 36/40, phone validation 17/23, lines 31/40, after the request 17/32. The vault says 86/160 (54 %) because it counts about 25 rules as open while they wait for a confirmation (P12, P16, P17, P9, Q22, P1 G-d), and its rule tables never absorbed DU14-DU17. On that stricter basis the code reaches about 94/160 (59 %). The 41 open rules are 19 decisions (mostly the P1 'no row' gates), 5 differences (the reprocess tool, the R1 Trim, callback keys and transport) and 17 waiting on other teams (liberador DU11, TELEFONIA Q17, SAP OData DU20). The share build bin\ServicioSap.dll (2026-10-02 10:15) contains the current code. Before a positive test, you need to confirm the served instance, pick a test BP, check SIGMavi CondicionesCredVtaLinea.Condicion (Q6), and check the Android login's INSERT permission. If Q6 or the permission fails, ServicioSAP writes a header with no product lines and still answers 'Concluido'. Phone-validation and getSms tests also need TEL-1 settled: the share copy of A_GET_TelefonoValidado returns the newest phone of any type, with undated phones first, not LAN's newest validated mobile. Business Rules Ecommerce matches the code; MATRIZ, CREDITO_WEB_ANALISIS and ACTIVIDADES are stale in the places listed below.

### 27.1 Parity by group (verified on code, user decisions up to DU20 as ground truth)

| Group | Total | Closed | Pending decision | Different/missing | Other team | Vault said | Key gaps |
|---|---|---|---|---|---|---|---|
| G1 Eligibility (who gets a credit request) | 25 | 18 | 5 | 1 | 1 | ACTIVIDADES 2026-10-01: 9/25 closed (36 %), 13 waiting for a decision, 3 other team. MATRIZ 09-29: mostly EQ/EQ-R after D6. | P1 no-row gates: G1-07 missing keys, G1-08 empty articulos, G1-18 total, G1-20 short phone, G1-25 null keys. G1-04 reprocess tool getOrderInfoAndSet is missing (P11, recommended retire). G1-22 liberador blocked by DU11. 8 of the 18 closed rules only wait for a confirmation: P9, P12, P16, P17, P1 G-d. Business rows match LAN: only an existing BP gets a row, and 'sin cuenta' is thrown before the only INSERT (OM:644-647). |
| G2 Header (CRED_SOLICITUD_WEB_DATOS_TEMP, 59 columns) | 40 | 36 | 4 | 0 | 0 | ACTIVIDADES: 30/40 (75 %). MATRIZ/CAMBIOS 09-29 column table: 37 equal, 11 equal with SAP source, 9 pending, 2 edge cases. | G2-16 codigoPostal null is stored as '' (OM:770). G2-23 empty articulos still writes a header. G2-29 short phone stores lada 0 and number '' (OM:749-755). G2-40 a Birthdt sentinel would store 0001-01-01 (SCW:604-629). The INSERT text equals SP_CREDITO_WEB_DATOS (59/59). DU12, DU13, DU18 are applied. 5 closed rules wait for confirmations (P4, P12 x2, Q11/G-d, DU13 Trim). |
| G3 Phone validation (ValidacionTelefono, LadaValidar/TelefonoValidar) | 23 | 17 | 3 | 2 | 1 | ACTIVIDADES: 12/23 (52 %). | G3-04 and G3-08 differ by the R1 fix (OM:626 Trim, OM:651 IsNullOrWhiteSpace), which only matters for values with spaces. Pending: G3-09 short phone (P1), G3-20 the early return in ConstruirContextoAsync, which only matters on error paths (R2-b), and G3-23 ZtelCte with '+52'. Blocked: G3-02, because the DMZ still sends getSms to LAN. I scored G3-15 and G3-21 as closed (ZtipoCliente 'Prospecto', user statement of 2026-09-21; the P16 confirmation is pending), so they match G1-21. Risk TEL-1: the A_GET_TelefonoValidado selection rule (G3-11, G3-22). |
| G4 Lines (VTASdArtCreditoWeb) | 40 | 31 | 3 | 0 | 6 | ACTIVIDADES: 26/40 (65 %). MATRIZ 09-29: 'lines not yet' (Q5 not applied, costo open, price source open). | TELEFONIA region swap G4-12, G4-15..19 waits for the business (Q17). P7/P8b: which SD29 row is used, and fan-out (G4-25). P8d: SEGU00001 float precision (G4-09). P18: '05 M ... P DIF' (G4-40). G4-21 depends on Q6, which is unverified: whether SIGMavi Condicion holds SD29 codes. The costo rules (DU14 NULL), condition without equivalent (DU15) and staging (R7) are closed in code but still open in the MATRIZ. |
| G5 After the request (coupon, liberador, callback, status, rename, duplicates, response, logs) | 32 | 17 | 4 | 2 | 9 | ACTIVIDADES: 9/32 (28 %); the per-rule mapping is not reproducible. | G5-11 and G5-12: the callback payload is snake_case (OM:1234-1240) and it accepts any certificate (OM:1200-1201); fix T1a is ready. Blocked by DU11/DU20: liberador, creditStatus, updateCreditOrderId, duplicate resend (G5-02, G5-24), id types. Pending: reprocess and request log (P11/P13), forzarOrder null (P1), DMZ HTTP codes (P12). Coupon (DU16) and logs (DU17) are closed in code; the vault tables still show them open. |
| NIP SMS routes credit/getSms, credit/validateSms (outside the 160; Business Rules RCR-7..22) | 8 | 5 | 1 | 1 | 1 | PLAN 23.9 Q9: coded 2026-09-26 and verified; SPEC_NIP_SMS. Not part of the 160-rule count. | NIP-02: when the ZidMagento PATCH fails, getSms returns -1 before the SMS (Q9-PATCH unanswered), and the PATCH URL has no sap-client=110 (BPM:842-843). NIP-07: the DMZ still routes both calls to LAN (DMZ CreditController.cs:76, :107). NIP-08: the checkout gate credit/GetPhoneValidatedClientSecretName is not ported and not tracked in any vault rule. |
| TOTAL (160 vault rules G1-G5) | 160 | 119 | 19 | 5 | 17 | ACTIVIDADES 2026-10-01: 86/160 (54 %); 46 decision, 8 development, 6 test, 14 other team. MATRIZ 09-29 (143 rules): EQ 46 + EQ-R 41 + N/A 12 = 99 (69 %), DIF 6, FALTA 10, PENDIENTE 28. | Why 119 here and 86 in the vault: (1) about 25 rules that already behave like LAN, or are covered by R4/R5/R7/Q11/D2, wait only for a confirmation (P12, P16, P17, P9, Q22, P1 G-d), and the vault counts them open; (2) the vault rule tables never applied DU14 (costo, 8 rules), DU15 (G4-24, G1-14), DU16 (coupon, 4 rules) or DU17 (G5-20); (3) it counts the R3/R4 cleanups, which change no stored value, as development. Counted the vault's strict way, the code gives about 94/160 (59 %). |

### 27.2 Readiness: PARTIAL. Component tests of request creation (header and lines via a direct POST order/new) can start after user-run prerequisites. Phone-branch and getSms tests also need TEL-1 and NIP-1. Liberador, callback, status, rename and Magento end-to-end are not testable. There is no runtime evidence yet: Logs/sap.log was last written 2026-09-17 and has no credit entries.

**Ready now:**
- L0 Build: the current source compiles. Share bin\ServicioSap.dll (2026-10-02 10:15:08) contains the 10-01 literals ('sin condicion de pago', '[CREDITO SD29 FILTRO]', '[ORDER ObtenerNumeroSms ERROR]', ObtenerPreciosCreditoAsync) and none of the removed ones ('Los invitados no pueden', '[CREDITO SIN CUENTA]'). Do not use the X: build of 09-26.
- L1 Serve that build (you, VS or IIS Express https://localhost:44399/) and get a JWT. Confirm with a fresh line in Logs\sap.log.
- L2 Read-only captures and SELECTs (you run them): BP05/BP05MA of the test BP, SD29 by Articulo+OrgVtas+Condicion, A_GET_TelefonoValidado, the Q6 SIGMavi SELECT, the ServicioAndroid permission and column-type queries.
- L3 Contract checks: no token gives 401 ([Authorize] OC:12); a null body gives 400 (OC:20-23, same as LAN); getCondicion/{store}/{cond}.

**Ready after prerequisites:**
- L4 Negatives N1-N3 (cuenta '', '0000000000', 'C00000000') expect 200 'Error, Error en SetOrder: sin cuenta', 0 rows, and only [ORDER NEW ERROR] in sap.log. Run them only after one SAP smoke GET passes, because a SAP outage also gives 'sin cuenta' (OM:730-734).
- L4 Negatives N4-N6 need your go-ahead to write to ServicioAndroid and corrected expected values (ACT-04). N4, an unknown condition with costoEnvio 150, gives header + SEGU00001 only (Orden 2, qty 1, price 150, Abono 12, costo NULL) and 'Concluido'. N6, a null condition, gives a header with condicion NULL, 0 lines and [CREDITO ARTICULOS ERROR].
- L5 Positives V2 (MA), V2b (VIU with shipping), V2c (SKU with '+') need: a test BP (exists in client 110, not Prospecto, no validated phone, Gender and Birthdt filled); the Q6 SELECT; an SD29 capture for the SKUs; the MAVICBOSANDROID INSERT permission on VTASdArtCreditoWeb; a write go-ahead with a DBA cleanup owner (it is the same DB LAN uses); expected values with nombre = NameFirst+Namemiddle, costo NULL and the R4/P12-A body. Avoid TELEFONIA SKUs and '05 ... P DIF'.
- L6 The validated-phone branch needs TEL-1 resolved (paste a real A_GET_TelefonoValidado response), the R2-V captures, and a BP whose newest dated phone is a validated 10-digit mobile with a ZappOrig in the 23-value catalog, plus an SMS row.
- L7 NIP SMS: validateSms, and getSms with an unknown BP and cliente '0', can run after L1. Positive getSms sends a real SMS, so it needs your go-ahead, the widths of the Cliente column in both SMS tables, and confirmation that the dispatcher accepts BP-keyed rows. Use cliente '0' until NIP-1 is decided.
- L8 Cash regression (E5 escaping, Marst '1') needs your go-ahead to create a BP and an order in SAP DEV.

**Not possible yet:**
- L9 Liberador and Magento callback. The liberador is under construction by the other team (DU11). The callback sends {entity_id, customer_account, credit_request_id}, while the DMZ expects {entityId, cuenta, idSolicitud} (DMZ CreditRequest.cs:212-218). The commented block OM:677-711 does not compile (it uses idClienteMagento and await inside a non-async lambda).
- L10 creditStatus, updateCreditOrderId, the post-authorization resend without a duplicate, and Magento end-to-end (V4). No routes exist in ServicioSAP; the DMZ calls URL_INTELISIS; the SAP OData for ZIdEcommerce is pending (DU20). Magento still sends getCuentaIntelisis() (OrderManagement.php:719), so real orders end in 'sin cuenta' while Magento shows PROCESANDO. The checkout gate GetPhoneValidatedClientSecretName is not ported, and the DMZ still routes getSms/validateSms to LAN.

### 27.3 Decision conflicts (explicit format)

**GEN-1**
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.sexo (VARCHAR 9) when BP05MA Gender is empty. On 2026-09-26 you said empty means 1 by default (PLAN 23.9 'Gender' row). D5 (value parity, 09-28/29) leads to '' instead, but no quote from you reverses the 09-26 row.
- LAN: CreditMethods.getClientInfo LCM:837 dr['Sexo'].ToString() (Intelisis CTE.Sexo; NULL gives '') -> @sexo LCM:158 -> SPD:100 VARCHAR(9)
- ServicioSAP: SolicitudCreditoWebMethods.ArmarFila SCW:244 -> SexoLegado SCW:563-583: '' stays '', '1' Masculino, '2' Femenino, anything else 'NO ESPECIFICADO' (cut to 'NO ESPECI'). BP creation still uses empty -> '1' (OM:2655, BPM MapGender).
- Example: Migrated BP with Gender '': LAN stored '', ServicioSAP today stores '', the 09-26 rule would store 'Masculino'.
- Options: A: keep '' (D5) and record that D5 supersedes the 09-26 Gender row for the credit row only · B: restore the 09-26 rule: SexoLegado(MapGender(Gender)), so empty gives 'Masculino' · C: empty gives 'NO ESPECI'
- Recommendation: A, but record your explicit confirmation as a DU. Fix Business Rules RCRE-25, which says 'same codes as MapGender'.

**LIM-1**
- What: Order total against BP05MA to_Cte.ZlimCred before inserting the request. Your 2026-09-11 decision says 'sí debe frenar' (FLUJO_CREDITO 5.1, still marked vigente). PLAN 24.1/24.7 later called that stale and recorded parity, without an answer from you (P17 open).
- LAN: ProductosCreditoWeb_SaveData LCM:126-133: checkSaldo (LCM:766-802) sets res 'insuficiente' or 'OK'. SetPedido discards it (LOM:649), so the row is always written.
- ServicioSAP: ProcessCreditPaymentAsync OM:638-720 has no balance or limit check; it only checks that the BP exists (OM:644-647).
- Example: Total 15000 with ZlimCred 0.000: LAN inserts and ServicioSAP inserts. Under the 09-11 rule every order would stop while ZlimCred is 0.
- Options: A: parity now (no stop) and defer the 09-11 decision until ZlimCred has data · B: stop on ZlimCred now (rejects every order today) · C: revoke the 09-11 decision
- Recommendation: A. Record it in your words (P17) and mark FLUJO_CREDITO 5.1 as deferred.

**TEL-1** 🔴 blocks testing
- What: The validated phone behind ValidacionTelefono, LadaValidar/TelefonoValidar and the getSms target. Q4/D4 assume A_GET_TelefonoValidado returns the newest validated MOVIL. The share copy takes max() over all phones by (Zfecha, ZfechaCap, ZidcteTel) and does not filter by type or validation. Undated phones become '00000000' and sort first.
- LAN: SP_CREDITO_WEB_DATOS.sql:193-202 and LAN OrderMethods.IsValidated LOM:786-817: CteTel Tipo='Movil' AND ValidacionTel=1 ORDER BY Fecha DESC. getSms GetValidatedPhoneNumber LCM:2224-2243 also requires LEN=10.
- ServicioSAP: SolicitudCreditoWebMethods.GetTelefonoValidadoAsync SCW:478-521 keeps the first row only if ZvalTel is true (:517-519). Callers: SCW:387, OM:625, CreditMethods.cs:357. API: businesspartner-dev/apps/api/routes/A_GET_TelefonoValidado.py:5-35; dates defaulted in AS_GET_ZQBP_EditarCliente_CteTel.py:61-62.
- Example: Captured BP: the validated MOVIL is 5522122584 (dated), plus undated unvalidated phones. LAN: TelefonoValidado 5522122584, and getSms texts it and answers 3. ServicioSAP with the share API: null, so ValidacionTelefono is 1 and getSms answers 0 with no SMS.
- Options: A: the deployed API already filters MOVIL and Zvaltel and sorts null dates last; no change · B: the businesspartner-api owner adds those filters (keeps Q4/D4) · C: compute the value in ServicioSAP from CteTelSet with LAN's rule (overrides Q4) · D: accept the difference
- Recommendation: First paste one real response for the captured BP and one for the test BP. If the API behaves like the share copy, choose B. Until then, test only with BPs that have no validated phone.

**NIP-1** 🔴 blocks testing
- What: SAP ZSDT_CTE_ENTITYSet(ZclienteBp).ZidMagento, set by getSms when the request field cliente > 0. Q9 says 'same as LAN', but a PATCH failure returns -1 and no SMS is sent. The 'Q9-PATCH' choice has never been answered.
- LAN: VTASCodigoSMSEcommerce LCM:2102-2120 -> UpdateMagentoId LCM:2191-2206, an UPDATE that runs before the existence check. A 0-row UPDATE does not fail, so the SMS flow continues.
- ServicioSAP: CreditMethods.VTASCodigoSMSEcommerceAsync CreditMethods.cs:266-276 -> BusinessPartnerMethods.LinkMagentoAccountAsync BPM:835-875. Its URLs have no sap-client=110 (:842-843). Any exception returns -1 (CreditMethods.cs:322-326) before an SMS row is written.
- Example: BP 1500007539, cliente '12345', PATCH answers 403/404. LAN queues the SMS and answers '3'. ServicioSAP answers '-1'; the DMZ answers 400 and Magento shows a connection error.
- Options: A: keep -1 · B: try/catch around the PATCH only, log it, and continue the SMS flow (the LAN outcome) · C: B, plus skip the PATCH when ZB_DATOS_CLIENTE already holds that ZidMagento
- Recommendation: B, plus add sap-client=110 to both URLs. Until then, test getSms with cliente '0'.

**GATE-1**
- What: Whether a CRED_SOLICITUD_WEB_DATOS_TEMP row is written when the birth date is missing, the phone is too short, codigoPostal/names/incrementId/forzarOrder are null, or articulos is empty. Q11/R5 (09-26) accepted placeholders; D5 (09-28/29) asks for exactly what LAN stored, and LAN stored no row. P1 is unanswered.
- LAN: getClientInfo LCM:835 (NULL date -> 'err', no row); SaveData LCM:139-148 (Substring on a short phone -> 'err'); SetPedido LOM:599, :603-605 (.Trim() on null codigoPostal or names -> ''); LOM:588 (empty articulos -> float.Parse('') -> ''); LOM:562 (forzarOrder null, outside the try).
- ServicioSAP: SCW:242/:551 (1900-01-02); OM:651-654 ('0'/'0'); OM:749-755 (lada 0, number ''); OM:770 CodigoPostal ?? ''; OM:783 IdMagento ?? '0'; OM:1776-1784 (guide plus header with condicion NULL for an empty list).
- Example: telefono '5' with no SMS and no validated phone. LAN: 0 rows. ServicioSAP: 1 row with lada_particular 0, telefono_particular '', LadaValidar 0, TelefonoValidar '0'.
- Options: A: copy the gates per P1 (A1+A3+A4+A5), keep Q11 1900-01-02 (A-d1), no guide gate (R5) · B: accept the rows as decided differences · C: copy only the gates Magento can reach (empty articulos, null codigoPostal, null names, short phone)
- Recommendation: A (the plan's recommendation), with C as the minimum. Capture one BP05MA without Birthdt first (G2-40).

**LOG-1**
- What: The sap.log entry when CheckClientCreditAsync (BP05 ZB_DATOS_CLIENTE) fails. R4 says 'every error visible'; DU17 says 'no logs LAN did not have'. The Q20 log-only fix was offered and never answered.
- LAN: checkCliente LCM:724-763: empty catch, returns false, then 'sin cuenta' (LCM:257) with no log.
- ServicioSAP: OrderMethods.CheckClientCreditAsync OM:722-735 writes to Console only; OM:646 throws 'sin cuenta'; OC:45 logs '[ORDER NEW ERROR] ... sin cuenta'. Logs LAN lacked are still present at OM:1004 [CREDITO SD29 FILTRO] and OM:3342 [ORDER GetCondicion ERROR].
- Example: An SAP 401/timeout for an existing BP, a missing BP '0000000000' and 'C01575835' all produce the same sap.log line.
- Options: A: keep as is · B: Logger.SAP the exception in CheckClientCreditAsync (no business change) and keep the two traces · C: strict DU17: also remove [CREDITO SD29 FILTRO] and [ORDER GetCondicion ERROR]
- Recommendation: B. It satisfies both R4 and DU17, and it makes negative tests meaningful.

**SD29-1**
- What: The SD29 PropreListSet row that sets VTASdArtCreditoWeb.precio and Abono. E5 (09-29) added a server-side $filter on Articulo+OrgVtas+Condicion, a retry with the Magento text and a SKU-only fallback, with 4 new methods. GUIA 1.9b says no new methods without asking. Ratification P20 is pending.
- LAN: SpVTASInsertArtSolCreditoLinea.sql:243-262: INSERT...SELECT from PropreListaDFinal JOIN VTASCCondicionesCredVtaLinea WHERE c.Condicion=@Condicion, with no org filter.
- ServicioSAP: InsertCreditArticlesAsync OM:906-933 + ObtenerPreciosCreditoAsync OM:986-1008; FinalListProperMethods FLP:87-104 (escaped).
- Example: SKU 'DIB+00104', VIU, '12IV'. Before E5, an unescaped '+' could become a space and the line was skipped. With E5 it is filtered correctly. A row whose Condicion differs only in case was found before E5 and not with OData eq (not tested).
- Options: A: ratify E5 (P20) · B: revert to SKU-only and keep only the escaping
- Recommendation: A. Validate it in the same V2 run, together with the SD29 capture.

**COND-1**
- What: Credit product lines when GetCondicionAsync cannot translate articulos[0].condicion because SIGMavi fails (or the CondicionMagento column is missing). Q5 (09-26, 'stop at the start') was replaced by DU15 (09-30, 'continue like LAN'); the error-path residual (ACT-16) is open.
- LAN: LAN never translated the condition (LCM:110 commented). SPL:258-262 joined on the Magento text, so a known condition was always priced.
- ServicioSAP: GetCondicionAsync OM:3314-3346: the catch at :3340-3343 logs and falls back to PaymentConditionCatalog; '' gives condicionSinEquivalente (OM:832-835); products are skipped (OM:895-899).
- Example: '05 M VIU P DIF' with SIGMavi down (not in PaymentConditionCatalog.cs:40-43). LAN: priced lines + SEGU00001. ServicioSAP: header + SEGU00001 only, 'Concluido'.
- Options: A: accept as an error-path difference · B: fail the credit order before the header when the SIGMavi read throws
- Recommendation: Decide after the Q6 SELECT. If CondicionMagento does not exist in SIGMavi, choose B.

**CUP-1**
- What: infoCliente.codigo_promotor and the DMZ route credit/codigoPromocion. DU16 removed the burn from credit, but the Magento promoter checkbox and the route are still live.
- LAN: SaveData LCM:203-206 CodigoPromocion(code,'Elimina') -> SpVTASVentaCupon.sql:115-165 (burn the newest free coupon and regenerate one).
- ServicioSAP: ProcessCreditPaymentAsync OM:638-720 has no HandlePromoCodeAsync call (removed in the uncommitted diff). HandlePromoCodeAsync still serves order/validatecupon. There is no credit/codigoPromocion route in CreditController.
- Example: Code 'AG123'. LAN stamps the coupon with IdEcommerce CRED... and inserts a new one. ServicioSAP leaves VentasCupones untouched.
- Options: A: keep DU16 and ask Magento to remove the box before the DMZ switch · B: A, plus delete HandlePromoCodeAsync and validatecupon later · C: revert DU16 if a commission process reads VentasCupones
- Recommendation: A. Confirm that no commission or report process reads VentasCupones.IdEcommerce.

**ORI-1**
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.condicion and articulo when infoCliente.origen = 'DIMAS MX'. D7 passes origen through, while on 2026-09-22 you deprecated CREDICCondicionArt. P4 is still listed open, and Business Rules RCRE-32 already says it is deprecated.
- LAN: SP_CREDITO_WEB_DATOS.sql:174-183 overrides @Condicion and @Articulo from CREDICCondicionArt; origen comes from LOM:646.
- ServicioSAP: CrearSolicitudCreditoAsync OM:776 Articulo '', OM:778 raw condicion, OM:782 Origen = info.origen ?? 'PRODUCTOS MX'.
- Example: origen 'DIMAS MX', '12 M MA P INM'. LAN takes condicion and articulo from CREDICCondicionArt. ServicioSAP stores '12 M MA P INM' and ''.
- Options: A: confirm deprecated, no code (P4-A) · B: reject 'DIMAS MX' · C: port the override
- Recommendation: A, recorded as a DU.

**NOM-1**
- What: CRED_SOLICITUD_WEB_DATOS_TEMP.nombre VARCHAR(25). DU13 (09-30) joins NameFirst and Namemiddle. The 'LISTO' task R4 text would revert that.
- LAN: getClientInfo LCM:834 CTE.PersonalNombres (all given names, untrimmed) -> @nombre LCM:154
- ServicioSAP: ArmarFila SCW:238-240 joins the trimmed NameFirst and Namemiddle. The R4 text is at CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:562: 'fila.Nombre = maestro.NameFirst ?? "";'
- Example: NameFirst 'MARIA', Namemiddle 'GUADALUPE'. LAN and the code today give 'MARIA GUADALUPE'. R4 as written gives 'MARIA'.
- Options: A: fix the R4 text to keep the DU13 join · B: apply R4 as written
- Recommendation: A, and confirm the per-part Trim (ACT-13).

**LIB-1**
- What: Which orders will call LiberarCliente plus the Magento callback when T1b is enabled. The commented block still has the R2 (new-client) shape, which D6 replaced.
- LAN: SaveData LCM:208-241: runs only after the lines succeed (LCM:201; a failure goes to the catch at :246), only for accounts starting with 'C', and sends the account.
- ServicioSAP: OM:677-711 (commented): sends idClienteMagento, which no longer exists; sits after the lines try/catch (OM:664-675), so it would fire even when the lines failed; uen uses ToUpper()=='VIU' (OM:682) while the header uses 'viu' (OM:744).
- Example: An order for existing BP 1500008218 whose line INSERT fails. LAN does not call the liberador. The block as written would call it and notify Magento.
- Options: A: existing BP, success path only, send cuentaBp, uen = storeId == 'viu' · B: A, plus excluding prospects (P16) · C: wait for the liberador contract (DU11)
- Recommendation: C before enabling it. Meanwhile rewrite the commented block to shape A (or B) so it no longer carries R2 logic.

**TQ-1 (Q6, G4-21)** 🔴 blocks testing
- What: SIGMavi CondicionesCredVtaLinea.Condicion, the value GetCondicionAsync returns and the code then uses as SD29 PropreListSet.Condicion to price VTASdArtCreditoWeb.precio and Abono.
- LAN: SpVTASInsertArtSolCreditoLinea.sql:258-262: JOIN VTASCCondicionesCredVtaLinea c ON c.CondicionPropre = p.Condicion WHERE c.Condicion = @Condicion. @Condicion is the Magento text from LOM:632 articulos[0].condicion via LCM:111/:910; there is no C# translation (LCM:110 commented).
- ServicioSAP: OrderMethods.GetCondicionAsync OM:3314-3346 (SELECT TOP 1 Condicion WHERE CondicionMagento=@ AND REPLACE(TiendaVirtual,' ','_')=@StoreId; a non-empty value skips PaymentConditionCatalog), called at OM:832, then the SD29 filter (OM:986-1008, FLP:87-92) and the match (OM:930-933). Hint: GetPlazosAsync reads CondicionPropre from the same table and still translates it through PaymentConditionCatalog (CreditMethods.cs:28-45).
- Example: '12 M MA P INM', muebles_america. LAN: a priced product line. ServicioSAP: priced if SIGMavi returns '12IA'. If it returns '12 M MA P INM' or 'Credito MA ...', every product line is skipped, only SEGU00001 is written, the answer is 'Concluido', and the only trace is Console output (OM:924, :961).
- Options: A: you run (read-only, SIGMavi): SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CondicionesCredVtaLinea'; SELECT TOP 20 CondicionMagento, Condicion, CondicionPropre, TiendaVirtual FROM CondicionesCredVtaLinea WITH (NOLOCK) · B: if Condicion is not the SD29 code, pass the SIGMavi value through PaymentConditionCatalog as GetPlazosAsync does (code change, needs approval) · C: use only PaymentConditionCatalog for credit lines (code change)
- Recommendation: A before any positive line test; B only if the codes are not in Condicion.

**TQ-2 (TEL-1, G3-11, G3-22, NIP-03)** 🔴 blocks testing
- What: How A_GET_TelefonoValidado picks the validated phone, which feeds CRED_SOLICITUD_WEB_DATOS_TEMP.ValidacionTelefono, LadaValidar, TelefonoValidar and the getSms target TcAAEA00030_EnvioMensajes.Telefono.
- LAN: SPD:193-202 and LOM IsValidated :786-817: CteTel Tipo='Movil' AND ValidacionTel=1 ORDER BY Fecha DESC (Intelisis).
- ServicioSAP: SCW GetTelefonoValidadoAsync :478-521 (first row with ZvalTel true). Share API A_GET_TelefonoValidado.py:5-35 takes max() over all phones with no type or validation filter; null dates become '00000000' (AS_GET_ZQBP_EditarCliente_CteTel.py:61-62) and sort first.
- Example: Captured BP: LAN gives TelefonoValidado 5522122584 and getSms '3'. ServicioSAP gives null, ValidacionTelefono 1, and getSms '0' with no SMS.
- Options: A: the deployed API already filters; no change · B: the API owner adds the MOVIL + Zvaltel filter and puts null dates last · C: compute it in ServicioSAP from CteTelSet · D: accept the difference
- Recommendation: Paste one real response first. If it behaves like the share copy, choose B.

**TQ-3 (G3-23)**
- What: Format of the validated phone ZtelCte used for ValidacionTelefono, LadaValidar/TelefonoValidar and getSms.
- LAN: SPD:193-202 and LOM:786-817 use CONCAT(Lada,Telefono) from IntelisisTmp.CteTel (digits only); getSms LCM:2224-2243 requires LEN=10.
- ServicioSAP: SCW:387 Recortar(ZtelCte,10); OM:626 Trim only; CreditMethods.cs:357-358 requires Length == 10. A captured validated phone is '+523333333333' (CAPTURAS_REALES_APIS.md).
- Example: ZtelCte '+523333333333' with SMS row '3333333333'. LAN digits are equal, so 0. ServicioSAP compares '+523333333' with '3333333333', so 1, and stores LadaValidar 52. getSms sees length 13 and answers '0'.
- Options: A: keep the raw value · B: keep digits and the last 10 in GetTelefonoValidadoAsync (new rule, needs your OK) · C: the API returns the 10-digit national number
- Recommendation: Capture e-commerce mobiles (ACT-18) first. If they carry '+52', choose C (B as an interim). For V2, use a BP with a 10-digit ZtelCte.

**TQ-4 (P1 no-row gates: G1-07/08/18/20/25, G2-16/23/29, G3-09, G5-17)**
- What: Whether CRED_SOLICITUD_WEB_DATOS_TEMP (and VTASdArtCreditoWeb) get a row when articulos is empty, or codigoPostal/names/incrementId/forzarOrder are null, or infoCliente.telefono (or the number to validate) is shorter than its lada.
- LAN: SetPedido LOM:588 (float.Parse('') on empty articulos), LOM:599/:603-605 (.Trim() on nulls), LOM:562 (forzarOrder.ToString()); SaveData LCM:139-148 (Substring on a short phone gives 'err'). LAN writes no row in each case.
- ServicioSAP: OM:1776-1784 (guide plus list); OM:651-654 ('0'/'0'); CrearSolicitudCreditoAsync OM:749-755, :770 CodigoPostal ?? '', :783 IdMagento ?? '0'; InsertCreditArticlesAsync OM:813-817, :829-830. A row is written and the answer is 'Concluido'.
- Example: articulos []: LAN 0 rows; ServicioSAP 1 header with condicion NULL and 0 lines. telefono '5': LAN 0 rows; ServicioSAP a row with LadaValidar 0, TelefonoValidar '0', telefono_particular ''.
- Options: A: A1 (gate before SaveGuideAsync) + A3 (phone gate after R1) + A4 + A5, keep Q11 (A-d1), no guide gate · B: accept the rows as decided differences · C: copy only the gates Magento can reach
- Recommendation: A, with C as the minimum. These decide the expected results of the V3 P1 cases.

**TQ-5 (P7 / P8b, G4-25)**
- What: Which SD29 row prices VTASdArtCreditoWeb.precio and Abono, and how many lines are written, when Articulo+OrgVtas+Condicion returns several rows (CDistr, Sucursal, Vigente).
- LAN: SPL:243-262: INSERT...SELECT without TOP writes one line per matching row, all with the same Orden.
- ServicioSAP: InsertCreditArticlesAsync OM:918-933 takes the OrgVtas filter and then FirstOrDefault, so one line; GetCondicionAsync is TOP 1 without ORDER BY (OM:3322).
- Example: Two SD29 rows for OrgVtas 05 / 12IV, at 1146.00 and 1199.00. LAN (by analogy) writes 2 lines with Orden 1. ServicioSAP writes 1 line with whichever row SAP returns first.
- Options: P7 A: no extra filter · P7 C: Sucursal + Vigente filters · P7 D: CDistr confirmed by SAP SD · P8 b1: fan-out like LAN · P8 b2: one line
- Recommendation: Capture SD29 for 2-3 credit SKUs. You run SELECT TOP 50 IdArtCreditoWeb, Orden, COUNT(*) FROM VTASdArtCreditoWeb WITH (NOLOCK) GROUP BY IdArtCreditoWeb, Orden HAVING COUNT(*) > 1. If history has no duplicates, choose b2.

**TQ-6 (NIP-1, NIP-02)** 🔴 blocks testing
- What: SAP ZSDT_CTE_ENTITYSet.ZidMagento PATCH failure during credit/getSms when cliente > 0.
- LAN: LCM:2111-2114 -> UpdateMagentoId LCM:2191-2206: an UPDATE before the existence check, which never blocks the SMS.
- ServicioSAP: CreditMethods.cs:271-276 -> BPM LinkMagentoAccountAsync :835-875 (no sap-client at :842-843); any error returns -1 (CreditMethods.cs:322-326) and no SMS row is written.
- Example: PATCH 403 for BP 1500007539, cliente '12345': LAN answers '3' with the SMS queued; ServicioSAP answers '-1' and the DMZ answers 400.
- Options: A: keep -1 · B: catch only the PATCH, log it and continue · C: B, plus skip the PATCH when ZidMagento already matches
- Recommendation: B, plus sap-client=110. Until then, test with cliente '0'.

**TQ-7 (T2c, G5-02, G5-24)**
- What: Duplicate guard for credit resends: CRED_SOLICITUD_WEB_DATOS_TEMP.idMagento against the request incrementId / infoCliente.idCarrito.
- LAN: SetPedido LOM:538-542 obtenerIdVenta(IdEcommerce) on IntelisisTmp.Venta answers 'PedidoExistente' once the liberador has created the Venta and UpdateCreditOrderId (LOM:2007-2016) has renamed it.
- ServicioSAP: SetOrderAsync OM:1737-1749 checks SD36 PurchNoC ZSD_ZMER_{incrementId}, which never matches a credit request; the credit branch OM:1774-1797 inserts every time (idMagento = incrementId, OM:783).
- Example: After authorization Magento resends 000123456 (idCarrito 9909291, forzarOrder '0'). LAN answers 'PedidoExistente' with 0 rows. ServicioSAP writes a second header and lines. A direct resend of the same CRED order today also writes a second row.
- Options: T2c-A: look up idMagento = incrementId (only works if the rename also covers idMagento) · T2c-B: if incrementId does not start with 'CRED' and a row exists with idMagento 'CRED'+idCarrito, answer 'PedidoExistente' · C: rely on a SAP sales document created at authorization (DU20)
- Recommendation: T2c-B (the plan's choice). Record the decision now; implement it after DU11.

**TQ-8 (NIP-08, not in the vault rules)** 🔴 blocks testing
- What: Response is_client_valid / is_phone_validated of credit/GetPhoneValidatedClientSecretName, the Magento checkout gate that runs before getSms and order/new.
- LAN: LAN CreditController.cs:541-545 -> CreditMethods.GetPhoneValidatedClientSecretName LCM:1783-1806 (+ IsInTableStd LCM:1967-1989, Intelisis CteTel/TablaStD).
- ServicioSAP: No route in ServicioSAP (grep = 0). DMZ CreditController.cs:290-298 sends it to LAN with curl.Post.
- Example: Magento sends BP 1500008218. LAN does not find it in Intelisis, returns is_client_valid false, and the credit checkout stays disabled, so getSms and order/new are never reached from Magento.
- Options: A: port it with A_GET_TelefonoValidado + the AWS catalog and switch it in the DMZ together with ACT-34 · B: keep it in LAN with a BP-to-Intelisis mapping (contradicts D2)
- Recommendation: A. Add it as a G3 rule and an ACT item; it blocks V4 end-to-end.

### 27.4 Bugs

| Sev. | Where | Bug |
|---|---|---|
| high (latent, no caller yet) | `OrderMethods.cs:1234` | CallMagentoAuthorizationCallbackAsync sends {entity_id, status, customer_account, credit_request_id}. The DMZ CreditAuthorizationRequest (DMZ Models/CreditRequest.cs:212-218) and Magento expect {entityId, status, cuenta, idSolicitud}, so with T1b on and no T1a, Magento gets quote 0, the DMZ answers 500 and the row stays PENDIENTE forever. Spot-checked in both files. |
| high if confirmed (depends on Q6 data) | `OrderMethods.cs:3322` | GetCondicionAsync returns SIGMavi CondicionesCredVtaLinea.Condicion as the SD29 code with no check. If that column holds the Magento text or a Propre description, every credit product line is silently skipped (OM:930-937), only SEGU00001 is written, and the answer is still 'Concluido'. Supporting hint: GetPlazosAsync translates CondicionPropre from the same table through PaymentConditionCatalog (Methods/Credit/CreditMethods.cs:28-45). |
| high for parity (external dependency, share copy; the deployed version is NO EVIDENCE) | `A_GET_TelefonoValidado.py:29` | max() over all CteTelSet phones by (Zfecha, ZfechaCap, ZidcteTel), with no MOVIL or Zvaltel filter. Null dates are defaulted to '00000000' (AS_GET_ZQBP_EditarCliente_CteTel.py:61-62), which sorts above '/Date(...)/', so an undated unvalidated phone wins. ServicioSAP then sees no validated phone (SCW:517-519), which changes ValidacionTelefono and LadaValidar/TelefonoValidar, and getSms answers 0 with no SMS (TEL-1). |
| medium | `Logger.cs:28` | Directory.CreateDirectory for {BaseDir}\Logs runs outside any try (Logger.cs:28-31). On an IIS site where Logs is missing and the app pool cannot create it, every Logger.SAP call throws, including the one inside the OrderController catch (OC:45), so the decided 200 'Error, ...' (R4) becomes a 500. The same throw from the OM:610 or OM:671 catches turns an order whose header is already written into an error. |
| medium | `BusinessPartnerMethods.cs:842` | LinkMagentoAccountAsync builds the CSRF and PATCH URLs without sap-client=110 (:842-843). Every other call in the file sends it (e.g. :30, :76). If the gateway's default client is not 110, getSms with cliente > 0 returns -1 and no SMS is queued (CreditMethods.cs:322-326). |
| medium (latent) | `OrderMethods.cs:1200` | The callback HttpClient uses a handler that accepts any TLS certificate (OM:1200-1201, passed at :1208). LAN created the same handler but never passed it to HttpClient, so LAN validated certificates. With T1b on, the DMZ credentials would go to an endpoint with an invalid certificate. |
| medium (security, inherited from LAN LCM:2007-2010) | `CreditMethods.cs:140` | SendSmsNewNumberAsync builds the INSERT into TcAAEA00030_EnvioMensajes with string.Format and request.Cliente unescaped. This is SQL injection on ServicioAndroid for any authenticated caller. It does not affect business parity. |
| low (latent, unconfirmed) | `SolicitudCreditoWebMethods.cs:613` | FechaSap turns '/Date(-62135596800000)/' into 0001-01-01 instead of treating it as empty, which bypasses the Q11 default of 1900-01-02 (G2-40). The BP05MA format for an empty Birthdt has not been captured. |
| low | `OrderMethods.cs:677` | The commented liberador block is not a usable template. It uses idClienteMagento, which was removed (:680), has await inside non-async lambdas (:690, :700), compares uen with ToUpper()=='VIU' (:682) while the header uses 'viu' (:744), and sits after the lines try/catch, so it would fire even when the lines failed. LAN does not. |
| low | `BusinessPartnerMethods.cs:30` | The credit gate puts the raw infoCliente.cuenta into the ZB_DATOS_CLIENTE $filter (:30) and the BP05MA key (:302) without escaping or URL encoding. getSms has a regex guard (CreditMethods.cs:338); order/new does not. No row impact today, since BP05MA would fail; it is an injection hygiene issue. |
| low | `OrderMethods.cs:347` | The SD29 sales organization matches 'viu' case-insensitively with contains (OM:347), while the header uen and sucursal use an exact 'viu' (OM:744). With storeId 'VIU', the header gets MA (uen 1, sucursal 504) while the lines are priced for VIU (05). |
| low (comment only) | `OrderMethods.cs:803` | The XML remarks of InsertCreditArticlesAsync (OM:803-810) still describe the old SKU-only SD29 lookup; since E5 the code uses Articulo+OrgVtas+Condicion (OM:986-1008). |

### 27.5 Vault corrections (code wins — not applied; proposed)

- MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP.md §0.1 (:20), G4-24 (:299), G1-14 (:191), G2-22 (:229); CREDITO_WEB_ANALISIS §1 (:60), §2 step 17 (:100), §3 G4-24/G4-40; PLAN §24.2 step 13 (:1991): they say a condition without an equivalent throws before the loop, writes no SEGU00001, and Q5 is pending. The code follows DU15: product lines are skipped and SEGU00001 is written ('Concluido') (OM:829-835, :895-899) (code wins).
- MATRIZ G1-10 (:187), G5-20 (:339), §0.5 #10 (:92); CREDITO_WEB §2 step 18 (:101), §5.1 E1 (:417), §3 G1-10/G5-20; CAMBIOS §3.1 (:123); PLAN §25.2 (:2329): they say a [CREDITO SIN CUENTA] log exists at OM:648. The code throws 'sin cuenta' with no log (OM:644-647; DU17); only OC:45 [ORDER NEW ERROR] is written (code wins).
- MATRIZ G3-12, CREDITO_WEB §3.3 G3-12 and §6.3.1 R2-V: they say there is a log [CREDIT ObtenerTelefonoAValidar ERROR] at SCW:368. The code is catch(Exception){throw;} (SCW:364-367) (code wins).
- MATRIZ G3-03: says the ObtenerNumeroTablaSms error goes only to Console. The code writes Logger.SAP '[ORDER ObtenerNumeroSms ERROR]' (OM:610) (code wins).
- MATRIZ §0.1 (:21), G5-02, G5-06..08, G5-27 (:326); CREDITO_WEB §1 (:61), §2 step 32 (:115), §3 G5-06..08/G5-27, §6.4.1 T1b (c), §6.5.4 V4 step 7: they describe the promoter coupon burn as active or P3 as open. The credit path has no HandlePromoCodeAsync call (ProcessCreditPaymentAsync OM:638-720; DU16) (code wins).
- MATRIZ G4-29..G4-37, §0.5 #5; CREDITO_WEB §2 steps 29/31 (:112, :114), §3, §6.3.9 and §6.5.2: they say costo = 0 (OM:902). The code writes DBNull on every line (OM:967; DU14) (code wins).
- MATRIZ G4-21, §0.5 #5; CAMBIOS §5 (:324, :349): they say the price source (SD29 or PropreListaDFinal) is open and the SKU goes unescaped (FLP:85). SD29 was decided on 2026-09-11, and the filter is escaped (FLP:87-104) (code wins).
- MATRIZ G4-02/G4-03: they score the eCommerceDetPedidos staging as FALTA. R7/09-26 removed it (OM:527-528), so it is decided-different, pending only the P9 confirmation (code wins).
- MATRIZ G2-08, CREDITO_WEB §3.2 ('solo NameFirst') and §6.1 (P6), CAMBIOS §4.2 row 3: they say nombre = NameFirst only. The code joins NameFirst and Namemiddle (SCW:238-240; DU13), so the V2 expected nombre derived from CAMBIOS §4.2 is wrong (code wins).
- CREDITO_WEB_ANALISIS §6.2.1 R4 step 2 (:562): 'fila.Nombre = maestro.NameFirst ?? "";' would undo DU13 (SCW:238-240). Fix the task text before Fable S1.
- MATRIZ G2-13 (:220), CREDITO_WEB §6.3.15 P14 (:887): they say a BP created from an order gets Marst '2' (OM:2647). The code sets Marst '1' (OM:2659; DU18) (code wins).
- MATRIZ §0.5 #4 and the G2-06/07/08/11/12/13/18 notes, CAMBIOS §4.2 rows 1/2/3/7/12/20 and §5.1 #5, CREDITO_WEB §6.0 (:464, P5=C) and §6.1: they say uppercase is pending. DU12 closed it: the BP text is stored as-is (SCW:236-259) (code wins).
- MATRIZ G3-02 note: says SendSmsNewNumber uses A_GET_TelefonoValidado. It texts request.NumeroTelefono (CreditMethods.cs:122, :140-144) (code wins).
- CREDITO_WEB §3.3 G3-22: says all three sort keys are compared as strings. ZidcteTel is compared as int (A_GET_TelefonoValidado.py:5-15).
- Business Rules Ecommerce RCR-67 and RCRE-38: they say A_GET_TelefonoValidado returns the newest validated phone. The share API returns the newest phone of any type with its own Zvaltel, and undated phones win (A_GET_TelefonoValidado.py:17-35; AS_GET_ZQBP_EditarCliente_CteTel.py:61-62). The ServicioSAP side (SCW:517-519) is described correctly.
- Business Rules Ecommerce RCRE-25 (:933): says sexo uses 'the same codes as MapGender'. For empty, MapGender gives '1' (BPM:781-784) while SexoLegado gives '' (SCW:563-570) (code wins; see GEN-1).
- Business Rules Ecommerce RCRE-21: says order fields are passed with no null-to-'' conversion. OM:769 EntreCalles, :770 CodigoPostal, :782 Origen, :783 IdMagento and :791 OrigenIdMagento do convert (code wins).
- Business Rules Ecommerce RCOM-5 (:1170): says no logs LAN lacked are added. [ORDER GetCondicion ERROR] (OM:3342) and [CREDITO SD29 FILTRO] (OM:1004) remain (code wins).
- Business Rules Ecommerce 'POST order/getGuide' says 'Pendientes: ninguno'. ServicioSAP reads a different data.db (SQLiteDb.cs:16-21, SQLITE_DB_PATH) from LAN's (LAN OrderMethods.cs:737/:758), so guides saved by LAN are not found. RGUI-3 cites OrderController.cs:201-210; the crash line is :222.
- Business Rules Ecommerce credit 'Pendientes conocidos' (~:1087): omits the empty-articulos gate (G2-23). RCRE-46/RCRE-64 assume SIGMavi Condicion holds the SD29 code, which is unverified (Q6); add the caveat.
- Business Rules Ecommerce, credit 'Quién la llama': presents DMZ validateCredit as planned toward order/new. It is N/A and deprecated (DMZ OrdersController.cs:365-370 commented; no ServicioSAP route).
- Business Rules Ecommerce glossary / RCOM-3: says Magento sends the BP in infoCliente.cuenta (DU2). Magento248 OrderManagement.php:719 still sends getCuentaIntelisis().
- ACTIVIDADES §1 (:22) risk 3, ACT-22 (:170), CREDITO_WEB §5: they say bin\ServicioSap.dll is from 2026-09-29 16:14, older than the code. It is 2026-10-02 10:15:08 and contains the 10-01 literals; which instance runs it is NO EVIDENCE.
- ACTIVIDADES §1/§3/ACT-02 (+161/-64) and CREDITO_WEB §5/§6.6/§8 (+126/-44): the diff baseline. git diff --stat today is 4 files, +109/-64, so Fable's baseline check would stop.
- ACTIVIDADES §3/§5 line citations predate the 10-01 edit: gate :647/:650 is now OM:644-647; return :722 is :713; branch :1802 is :1774; guide :1804 is :1776; liberador :684-720 is :677-711; callback :1205-1293 (payload :1262-1268) is :1177-1265 (:1234-1240); SD36 :1764-1776 is :1737-1749. Business Rules Ecommerce already uses the current lines.
- ACTIVIDADES §1: says the liberador is the only blocker. Q6, the Android INSERT permission, TEL-1, NIP-1 and the unported checkout gate GetPhoneValidatedClientSecretName also gate the tests.
- CREDITO_WEB §6.5.3 (V3) and PLAN §24.2 step 6 (:1984): the expected texts are '[CREDITO SIN CUENTA]', the pre-DU15 N4 result, and 'no tiene crédito activo' / 'Los invitados no pueden pagar con crédito'. Today the body is 200 'Error, Error en SetOrder: sin cuenta', and N4 gives header + SEGU00001; N6 (null condition) is missing.
- CAMBIOS §3.1 (:124), PLAN §25.2, CREDITO_WEB §5.1 E1, ACT-17(a/b): they describe rule comments and a 'PENDIENTE (T18)' note in the code. Both are gone; only the 'Paridad LAN' comment at OM:1728 remains.
- FLUJO_CREDITO_LAN_VS_SAP.md §5.1 (estado vigente): says 'DECISIÓN TOMADA 2026-09-11: sí debe frenar'. The code has no limit check (OM:638-720), and PLAN §24.1/§24.7 record parity; mark it deferred (LIM-1).
- MATRIZ G5-25: cites DMZ HEAD eb28c7c. The DMZ checkout is at 09cb341.
- MATRIZ §0.5 #3, CAMBIOS §5.1 #4, CREDITO_WEB §6.1: they list P4 (DIMAS MX) as open, while Business Rules RCRE-32 says deprecated and the code has no override (OM:776-782). Record it as a DU.

### 27.6 Information needed

| From | Item | How | Unblocks |
|---|---|---|---|
| User | Which ServicioSap.dll the test instance serves, its URL, and who built the 2026-10-02 10:15 share build | Run the share project (VS F5 or IIS Express https://localhost:44399/), make one deliberate 400 or getCondicion call, and check that a fresh line appears in ServicioSap\Logs\sap.log | Every runtime level (L3-L8). It proves the tests run the 10-01 code (E1-E5, DU13-DU18) and not the 09-26 X: build. |
| User | Test BP for V2/V3: infoCliente.cuenta, which becomes CRED_SOLICITUD_WEB_DATOS_TEMP.cliente | GET partner/client/<BP> (BP05) and partner/client/ma/<BP> (BP05MA). It must exist in client 110, have ZtipoCliente not 'Prospecto', have no validated phone, and have Gender, Birthdt and two given names if possible | V2/V2b/V2c and N4-N6; it fixes the expected 59-column header. |
| User | Q6: the contents of SIGMavi CondicionesCredVtaLinea (Condicion vs CondicionMagento vs CondicionPropre), including '05 M ... P DIF' | SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='CondicionesCredVtaLinea'; SELECT TOP 20 CondicionMagento, Condicion, CondicionPropre, TiendaVirtual FROM CondicionesCredVtaLinea WITH (NOLOCK) (you run it; read-only) | Pass/fail of every credit product line (G4-21); P18 and COND-1. |
| User + ServicioAndroid DBA | MAVICBOSANDROID login permissions, and column types and widths (VTASdArtCreditoWeb.precio for P8d; Cliente in VTASDCodigoVerificacioneCommerce and TcAAEA00030_EnvioMensajes for 10-digit BPs) | As that login on ServicioAndroid: SELECT HAS_PERMS_BY_NAME('dbo.CRED_SOLICITUD_WEB_DATOS_TEMP','OBJECT','INSERT'), HAS_PERMS_BY_NAME('dbo.VTASdArtCreditoWeb','OBJECT','INSERT'); plus SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('VTASdArtCreditoWeb','VTASDCodigoVerificacioneCommerce','TcAAEA00030_EnvioMensajes') | V2 step 0 (without the permission, lines fail silently and the answer is still 'Concluido'), P8d, and positive getSms. |
| User + ServicioAndroid DBA + credit area | Go-ahead to write test rows to ServicioAndroid (the same DB LAN uses), a cleanup owner, and the credit-area readers to warn (e.g. the 'TSTF' idMagento prefix) | Name the DBA who deletes the lines and then the header the same day; tell the credit area the test prefix | N4-N6, V2, L6 and positive getSms. |
| User | SD29 PropreListSet rows for 2-3 credit SKUs (MA 04/12IA, VIU 05/12IV, one SKU with '+') | GET ZAPI_PROPRELIST_SRV/PropreListSet?sap-client=110&$format=json&$filter=Articulo eq '<SKU>' and OrgVtas eq '04' and Condicion eq '12IA' (Hoppscotch). Also run the LAN Orden-duplicates SELECT for P8b | Expected precio and Abono for V2 and the P7/P8b decision. |
| User | Real A_GET_TelefonoValidado responses (the captured BP and the test BP), CteTelSet through obtenerUrl, and the 23-value catalog read (R2-V) | GET <URL_BP_API>/A_GET_TelefonoValidado?sCliente=<BP>, and the CteTelSet and catalog GETs used by SCW:404-443 and :523-532 | TEL-1, G3-19, G3-23, and the validated-phone branch (L6). |
| User | BP05MA capture for a BP without Birthdt | GET partner/client/ma/<BP without birth date>; look at the Birthdt value | G2-40 (whether FechaSap stores 0001-01-01) and P1 G-d. |
| User | Confirmation of what the 2026-10-01 12:12 edit removed (the earlier version is not in git), so ACT-02 can reset the baseline to +109/-64 | You confirm it was only comment removal; Fable re-verifies the diff in ACT-26 | Fable S1 (R1, R3, R4, T1a), which otherwise stops at its baseline check. |
| ServicioAndroid DBA / SMS team | SMS dispatcher behaviour with BP-keyed rows | sp_helptext 'SpAAea00030_ArmadoSMS' (read-only) | Positive getSms (L7). |
| Valentín (liberador team) | Liberador contract: does it accept the BP as Cliente, what idVenta it returns, and whether it reads eCommerceDetPedidos, VentasCupones or costo (Q-T1-1..8, ACT-11) | Send the ACT-11 questions | T1b, P9, DU14 confirmation, G5-28, L9. |
| Credit area + Valentín + SAP SD team (Alan) | Source of creditStatus and the id type of idSolicitud (Q-T2-1..3), and the SAP OData for ZSDT_VBAK.ZIdEcommerce with its ETA and the SD29 CDistr code (DU20, Q-T2-4/5) | Ask the credit area and SAP SD | T2a, T2b, T2c, L10. |
| Magento team (Javier/Dev2) + DMZ owner | Magento release that sends the BP in infoCliente.cuenta, removes the promoter box, and updates the credit JS account regex; the DMZ switch of getSms, validateSms and GetPhoneValidatedClientSecretName to PostSAP | Coordination items ACT-34 and ACT-35 | V4 end-to-end through Magento. |

### 27.7 Evidence 2026-10-02 — real A_GET_TelefonoValidado response (pasted by the user)

`[{"ZtelCte": "3352323422", "ZvalTel": false}]` for the test BP (BP number not stated yet). User: `ZvalTel` false = the phone is not validated yet (internal validation; COFETEL "real number" is a different check).
- Confirms the deployed response shape matches `TelefonoValidadoResponse` (ZtelCte string, ZvalTel boolean) and `EsVerdadero` → false.
- Expected with this BP: `@TelefonoValidado` null (ConstruirContextoAsync returns early, no CteTelSet/AWS read) → `ValidacionTelefono` 1 (0 only if Prospecto); `IsValidatedAsync` "" → LadaValidar/TelefonoValidar from the SMS row or the order phone (3352323422 → 33 / 52323422); `credit/getSms` → code row inserted, no SMS, answer `0` (same as LAN).
- Suitable for V2 (positive order without a validated phone). Not suitable for the validated-phone case or a positive getSms.
- TEL-1 NOT closed: one row cannot show whether the API skips an older validated MOVIL. Needed: the BP number and its full CteTelSet / BP05MA `to_CteTel` (ZtipoCte, ZtelCte, Zvaltel, Zfecha, ZidcteTel).
### 27.8 Decision 2026-10-02 — test writes and rollback (user)

"The rows get inserted, don't worry about that; the delete can be manual; don't do a rollback if LAN doesn't do it."
- **Test writes approved:** credit-flow tests (order/new credit, getSms) may insert rows in ServicioAndroid through the service. Cleanup is manual, by the user. Claude still runs no SQL.
- **No rollback where LAN has none:** if the lines (or anything after the header) fail, the header stays written, as in LAN (`ProductosCreditoWeb_SaveData` has no transaction; its catch returns "err"). This closes NEW-B (§24.3) as "keep LAN behavior"; no TransactionScope / BEGIN TRAN is to be added to `CrearSolicitudCreditoAsync` / `InsertCreditArticlesAsync`.
### 27.9 Decision 2026-10-02 — TEL-1 closed (user)

The response in §27.7 is for **BP 1500008218** (`A_GET_TelefonoValidado?sCliente=1500008218` → `ZtelCte 3352323422`, `ZvalTel false` = not validated). User: "the value of the Client MA BP is not the value you need to take for validate phone; use this API with the BP, like the code, to get the validated phone."
- **Rule:** the validated phone is exactly what `A_GET_TelefonoValidado` returns for the BP (kept only when `ZvalTel` is true). It is NOT derived from or cross-checked against BP05MA `to_CteTel` or `CteTelSet`. This confirms D4 and Q4; TEL-1 (§27.3) is closed; the "newest validated MOVIL" comparison with LAN's CteTel query is no longer a test prerequisite.
- The code already follows it: `SolicitudCreditoWebMethods.GetTelefonoValidadoAsync` feeds `@TelefonoValidado`, `OrderMethods.IsValidatedAsync` and `credit/getSms` (`CreditMethods.GetValidatedPhoneNumberAsync`). No change.
- Drop the §27.5 correction about Business Rules RCR-67/RCRE-38 ("the API returns the newest phone of any type"): the API's selection is the accepted rule.
- BP05MA remains the source of the request's master data (R7: names, gender, birth date, RFC) — only the phone is excluded.
- Test BP 1500008218: expected ValidacionTelefono 1 (0 if Prospecto), LadaValidar/TelefonoValidar from the SMS row or the order phone, getSms → code row, no SMS, `0`. A BP whose API answer has `ZvalTel true` is still needed for the validated-phone case and a positive getSms.
### 27.10 SD29 real row 1026233 (PRIN00043) — line pricing vs LAN (workflow `wf_5f6050e8-5fb`, `_IMPLEMENTACION_SP_CREDITO\sd29_row_check_2026-10-02.json`)

Row pasted by the user: OrgVtas 04, Sucursal 0504, Condicion `Credito Viu 12M P INM`, Descripcion `Credito MA 12M P INM`, Precio 1146.00, Abono 0.00, DescuentoCategoria 0.00, Formato `INST Test Mayoreo 1/16`.
- **Two different conversions exist and only one is implemented.** (1) Magento text → SAP payment-term code (`12IA`/`12IV`): `GetCondicionAsync` (SIGMavi `Condicion WHERE CondicionMagento`, fallback `PaymentConditionCatalog`). It is needed by SD01 `PaymentTerms` (`BuildSapOrderAsync`) and `order/getCondicion` — keep it. (2) Magento text → **CondicionPropre** text (`Credito Viu 12M P INM`): what LAN used for the lines (`SpVTASInsertArtSolCreditoLinea.sql:258-262`: `JOIN VTASCCondicionesCredVtaLinea c ON c.CondicionPropre = p.Condicion WHERE c.Condicion = @Condicion(Magento text) AND p.articulo = @artRegion`, no UEN/Sucursal/Vigente filter, no TOP). SD29 `Condicion` = PropreListaDFinal `Condicion` (same Propre-text style). ServicioSAP does not do conversion (2) for the lines.
- **Today:** the credit line matches SD29 `Condicion` against `{12IA|12IV, raw Magento text}`. A Propre-text row is never matched → product line skipped silently, only SEGU00001, "Concluido". MA with this row: no line (LAN: no line either, because the row's text is Viu). VIU: no line (OrgVtas 04 ≠ 05 and the key misses); LAN would write 1146 / Abono 0.
- **Proposed fix (not applied, needs user approval + the SIGMavi query to choose the column):** in `InsertCreditArticlesAsync` only — primary key = all `CondicionPropre` values from SIGMavi `CondicionesCredVtaLinea` for the Magento text (no TOP, no TiendaVirtual filter, like the SP); secondary key = today's code `condicionSap` (also via `PaymentConditionCatalog.GetSapPaymentCode(row.Condicion)`); read SD29 by SKU only (`GetFinalListProperBySkuAsync`) and match in memory ignoring case; keep the OrgVtas 04/05 filter (user decision 2026-09-11, FLUJO:347); drop the raw-Magento-text comparison; do not use Descripcion. `GetCondicionAsync`, `BuildSapOrderAsync`, `order/getCondicion` untouched.
- **Row 1026233 looks like inconsistent DEV test data** (OrgVtas/Sucursal/Descripcion = MA, Condicion = Viu, Abono 0). Ask the SD29/PCP owner which store it is for.
- Still needed: SIGMavi `SELECT * FROM CondicionesCredVtaLinea WHERE Mensualidades = 12` (+ column list); SKU-only SD29 responses for 2-3 credit SKUs (MA and VIU); optionally the LAN IntelisisTmp join for the same SKUs.- **2026-10-02, user:** row 1026233 was only an example; SD29 will contain the proper rows for each condition when the query runs. → Q2 (store of row 1026233) closed, no data action. The match-key gap remains: if real rows store the Propre text, today's code skips the line; the proposed fix (CondicionPropre primary key + code secondary key, SKU-only read, OrgVtas filter kept) prices both formats. Offered: A = implement now using the same SIGMavi column as `GetCondicionAsync` (`CondicionMagento`), confirm with the SIGMavi query later; B = wait for the query. Awaiting the user's choice.
### 27.11 Task list to the first functional credit test (2026-10-02)

| # | Phase | Task | Owner | Depends on | Done when |
|---|---|---|---|---|---|
| T1 | 0 Inputs | Choose SD29 fix A (implement now, Diego's column `CondicionMagento`) or B (wait for the query) | User | — | Answered |
| T2 | 0 Inputs | SIGMavi `SELECT * FROM CondicionesCredVtaLinea WITH (NOLOCK) WHERE Mensualidades = 12;` | User | — | Magento-text column and CondicionPropre for `12 M MA P INM` known |
| T3 | 0 Inputs | Real credit SKU for MA (+ VIU) and its SKU-only SD29 response | User | — | All 04/05 rows of the SKU seen |
| T4 | 0 Inputs | `HAS_PERMS_BY_NAME` INSERT on CRED_SOLICITUD_WEB_DATOS_TEMP and VTASdArtCreditoWeb for the MAVICBOSANDROID login | User | — | Both 1 |
| T5 | 0 Inputs | Who rebuilds/serves, URL, who gets the login/auth token | User | — | Test host known |
| T6 | 1 Code | Fix in `InsertCreditArticlesAsync` (CondicionPropre primary key, code secondary key, SKU-only read, OrgVtas kept, no raw Magento text; `GetCondicionAsync` untouched) | Claude | T1 (T2 if B) | Written |
| T7 | 1 Code | MSBuild VS18 (output off the share) + adversarial check vs LAN | Claude | T6 | 0 errors, check OK |
| T8 | 1 Code | Update Business Rules Ecommerce (credit lines) + runbook in the same change | Claude | T6 | Docs = code |
| T9 | 2 Prep | Rebuild/serve the binary with the fix | User | T7 | Fresh line in Logs\sap.log |
| T10 | 2 Prep | Captures: GET partner/client/ma/1500008218; the 2 SMS-table SELECTs for the BP | User (Claude gives the text) | T9 | Pasted |
| T11 | 2 Prep | Request JSON (MA, costoEnvio 150, forzarOrder "1", new incrementId ≤ 12) + expected 59 columns, lines, response + verification SELECTs | Claude | T3, T10 | Delivered |
| T12 | 3 Run | Smoke: GET partner/client/1500008218; no token → 401; empty body → 400 | User | T9 | As expected |
| T13 | 3 Run | Negatives: cuenta '' / 0000000000 / C00000000 → 200 "Error, … sin cuenta", 0 rows | User | T12 | As expected |
| T14 | 3 Run | Positive MA order (V2) → Concluido, 1 header + product line + SEGU00001 | User | T11, T12, T4 | Rows written |
| T15 | 3 Run | Paste response, sap.log and the 2 SELECTs; field-by-field comparison vs LAN | User + Claude | T14 | Match or list of differences |
| T16 | 3 Run | Optional VIU order | User | T14 | As expected |
| T17 | 3 Run | Manual cleanup of test rows | User | T15 | Clean |
| T18 | 4 Close | Record results; apply vault corrections of §27.5 | Claude (with go-ahead) | T15 | Done |
| T19 | 4 Close | Commit | User | T18 | Committed |

Later (not needed for the first test): GEN-1, LIM-1, P1, NIP-1 (+ sap-client=110), Q20; bugs Logger.CreateDirectory, callback keys T1a, SendSmsNewNumber injection; NIP SMS test (BP with ZvalTel true + team phone + dispatcher); other teams (Magento BP + promoter box, DMZ switch, liberador, creditStatus/updateCreditOrderId, TELEFONIA); Fable plan fixes (`REVISION_PLAN_FABLE_2026-10-02.md`).- **2026-10-02, user (SIGMavi semantics):** in `CondicionesCredVtaLinea`, `CondicionMagento` = the value Magento sends and `Condicion` = the value converted for SAP; `GetCondicionAsync` reads by `CondicionMagento` and returns `Condicion` for use inside the SAP process (including the SD29 match at OM:908/:931). → Q6 answered for the columns. If SIGMavi `Condicion` equals the SD29 `Condicion` text of the price rows, today's code prices the line and **fix A / T6 is not needed** (T1 closes as "no fix"). Remaining check (T2 reduced): `SELECT CondicionMagento, Condicion, TiendaVirtual FROM CondicionesCredVtaLinea WITH (NOLOCK) WHERE CondicionMagento IN ('12 M MA P INM','12 M VIU P INM');` or, without SQL, `GET order/getCondicion/muebles_america/12 M MA P INM` and `/viu/12 M VIU P INM` on the running service (a `12IA` answer may be the catalog fallback — look for `[ORDER GetCondicion ERROR]` in sap.log). Residual risk, noted only: when SIGMavi fails, the `PaymentConditionCatalog` fallback returns a code that will not match text rows → line skipped (logged).
### 27.12 2026-10-02 — Fable root path corrected (user: "yes change the root path")

`\\CATECINF214058D\Migracion SAP` → `\\172.16.214.58\sap` in `SKILL.md` (9 mentions), `GUIA_MIGRACION_FABLE.md:94`, `Resources\MemoryClaude\convenciones-migracion-sap.md:13`, `LAN - Mapa.md:13`. Historical/explanatory mentions kept. Remaining fixes before Fable S1 (package 1, T1.1-01): build without `Z:` (GUIA §9b → 01 §0.5 V1), X-1 (who updates Business Rules), X-2 (HTTP status policy), remove T1.1-02. See `REVISION_PLAN_FABLE_2026-10-02.md` §4 and §8.
- **X-1 answered 2026-10-02:** Fable updates Business Rules Ecommerce in the same change when the change rests on rules already defined; asks otherwise. Applied in 01_CustomersController.md (§0.6 exception, S1 prompt) and PLAN_FABLE_POR_CONTROLADOR.md (mandatory reading 4, closure criterion).
