export const meta = {
  name: 'sp-credito-implementacion',
  description: 'Escribir en ServicioSAP la migracion de SP_CREDITO_WEB_DATOS y satelites a C#: modelos, 6 unidades de metodos, revision adversarial por archivo y correccion',
  phases: [
    { title: 'Modelos', detail: 'un agente escribe todos los DTOs para que los nombres sean consistentes' },
    { title: 'Metodos', detail: '6 unidades en paralelo, archivos disjuntos' },
    { title: 'Revision', detail: '3 lentes por archivo: paridad con el SP, arquitectura/compila, no-inventa' },
    { title: 'Correccion', detail: 'un corrector por archivo aplica los hallazgos confirmados' },
  ],
}

const PROY = '//CATECINF214034/Compartida/Migracion SAP/ServicioSAP/ServicioSap/ServicioSap'
const SPS  = '//CATECINF214034/Compartida/Migracion SAP/.agents/skills/lan-sap-migration/SPsOrden'
const DOC  = '//CATECINF214034/Compartida/Migracion SAP/.agents/skills/lan-sap-migration/MappingMetods/FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md'
const PREP = 'C:/Users/claude/AppData/Local/Temp/claude/C--x/9cb68c68-f398-4c18-9207-2b1e25fd674d/scratchpad/prep'

const BASE = `
RUTAS (Windows; las de red tienen un espacio en "Migracion SAP": cita SIEMPRE entre comillas):
- PROYECTO DESTINO (aqui se escribe): "${PROY}"   -> .NET Framework 4.7.2, ASP.NET Web API 2, C# 7.3.
- SPs fuente de verdad: "${SPS}/SP_CREDITO_WEB_DATOS.sql" (623 lineas), "${SPS}/SpCREDISolicitudWebPrimerGuardado.sql", "${SPS}/SpVTASInsertArtSolCreditoLinea.sql", "${SPS}/SpCREDIDatosSolicitudCreditoArt.sql"
- Diseno aprobado (contexto y decisiones D1-D10; NO es fuente de verdad del codigo): "${DOC}"
- EXTRACCION VERBATIM DEL CODIGO REAL (leela antes de escribir; es lo que debes imitar):
    "${PREP}/arquitectura.md"  -> namespaces, forma de las clases Methods, SQL directo a Android (conexionSQL), OData GET/POST/PATCH, canal AWS, controller, modelos, csproj, Web.config, reglas del skill
    "${PREP}/reuso.md"         -> firmas exactas y visibilidad de lo que DEBES reutilizar, y los campos reales de Cte/CteTel/BusinessEntitiesMa
    "${PREP}/grafo.md"         -> CrearSolicitudCreditoAsync verbatim con sus 38 parametros y SqlDbType, consumidores del id, el contrato posicional data[] de LAN, rutas del DMZ
    "${PREP}/contrato.md"      -> los 66 parametros con tipo/default, las 59 columnas con su expresion, el prologo, el Update, la rama de referencias y las 11 operaciones de la pre-solicitud, VERBATIM

REGLAS DURAS (violarlas invalida el trabajo):
1. NO INVENTAR. Cada identificador, tipo, tamano, literal, default y regla debe rastrearse a: (a) el SQL del SP, (b) codigo existente de ServicioSAP, o (c) una decision D1-D10 del documento. Si algo no tiene rastro, NO lo escribas: deja un marcador explicito (ver regla 6).
2. FIDELIDAD FUNCIONAL. Se replica el comportamiento OBSERVABLE del SP, incluidos sus defectos, salvo donde una decision D1-D10 diga otra cosa. Cada defecto replicado lleva un comentario: // FIDELIDAD SP:<linea> — <que hace> — decision <letra> pendiente. Las letras estan en la seccion 8 del documento (A semantica ValidacionTelefono, B persistencia, C contrato @Op, D sobrescritura Update, E defectos del parser, F rama DIMAS MX, G fallas silenciosas linea de articulo, J OData V2/V4).
3. ARQUITECTURA: imita el codigo existente. namespace ServicioSap.Methods.Credit para Methods/Credit; ServicioSap.Models.SAP.Credit para Models/SAP/Credit. Clases 'public class XMethods' con metodos 'public static async Task<T> ...Async', ConfigureAwait(false) en cada await, errores a ServicioSap.Helpers.Logger.SAP("[TAG] ", ex.Message) como hace CreditMethods, comentarios XML /// como el proyecto. Sin Entity Framework. Sin .Result ni .Wait().
4. SQL DIRECTO A ANDROID: usa exactamente 'var conexionHelper = new conexionSQL(); using (var sqlConnection = await conexionHelper.obtenerConexionAndroidAsync().ConfigureAwait(false))' (Helpers/ConexionDB/ConexionSQL.cs). Los comandos SIEMPRE parametrizados con SqlCommand + Parameters.Add("@x", SqlDbType.X, tamano).Value = valor ?? DBNull.Value, con el SqlDbType y el tamano del tipo declarado en el SP (VARCHAR(30) -> SqlDbType.VarChar, 30; INT -> SqlDbType.Int; MONEY -> SqlDbType.Money; DATE -> SqlDbType.Date; BIT -> SqlDbType.Bit). NUNCA string.Format con datos del usuario. Este patron ya existe en OrderMethods.CrearSolicitudCreditoAsync (grafo.md).
5. REUTILIZAR (regla 12 del skill): antes de escribir una lectura, busca en reuso.md si ya existe publica. Usa: CreditMethods.IsValidatedAsync, ProductMethods.GetConfiguracionCatalogoAsync (canal 4, catalogo de configuracion = la antigua TablaStD), ProductMethods.GetStockAsync / GetFilterProductsStockAsync (DIM11 existencias), FinalListProperMethods.GetFinalListProperBySkuAsync (PropreList: precio/abono), CreditMethods.GetCondicionesPagoAsync, BusinessPartnerMethods.GetClientAsync / GetClientMaAsync / LinkMagentoAccountAsync, TokenGenerator.CreateClientS4 / GetTokenSapAsync, DocumentMethods.GuardarDocumentoAsync. ABRE el archivo y copia la firma exacta antes de llamarla. No llames metodos private.
6. FUENTE SIN EQUIVALENTE: cuando el SP lee algo que no tiene equivalente identificado (CREDICCondicionArt, VTASCRegionSku, VTASCCodigoPostalRegionCelular, VTASCCondicionesCredVtaLinea, spVerCosto, DescuentoCategoria, saldo CXC, tabla art de Intelisis, TcEACD00001_Lada, MAVIDM0138HistInsertCorreo), NO inventes una fuente. Encapsula la lectura en un metodo privado propio con este encabezado exacto en comentario: // PENDIENTE DE FUENTE — SP <archivo>:<lineas> — <objeto de Intelisis> — sin equivalente identificado; conectar aqui cuando el usuario indique catalogo/endpoint. Y el comportamiento: si el SP tiene un ELSE natural para "no encontrado" (ej. @artRegion = @Articulo; sin descuento = precio integro), usa ESE camino y registra un Logger.SAP de advertencia; si no lo tiene (ej. DIMAS MX pisa condicion/articulo; saldo CXC), lanza NotSupportedException con ese mismo mensaje. Nada silencioso, nada inventado.
7. NO TOCAR ARCHIVOS EXISTENTES. Solo creas los archivos que se te asignan. No edites OrderMethods, CreditMethods, WalletMethods, el csproj ni el controller: eso lo hace el orquestador despues. Si necesitas algo de un archivo existente que es private, NO lo modifiques: portalo desde el SP (si es logica del SP) o reportalo en tu salida.
8. TRANSACCIONES: el SP no abre ninguna. No inventes una. Anota en comentario donde el SP hace varias escrituras sueltas.
9. Todo en espanol en comentarios y nombres de negocio, como el proyecto. Escribe el archivo con el tool Write (ruta completa entre comillas). Al terminar, devuelve: ruta escrita, lista de metodos publicos con firma, lista de PENDIENTE DE FUENTE, lista de FIDELIDAD, y cualquier duda para el usuario.
`

// Contrato entre archivos: nombres que TODOS deben usar tal cual, para que compile en conjunto.
const CONTRATO_API = `
CONTRATO ENTRE ARCHIVOS (usa estos nombres EXACTOS; no los cambies ni los "mejores"):

MODELOS — namespace ServicioSap.Models.SAP.Credit
  Archivo Models/SAP/Credit/SolicitudCreditoWebModels.cs:
    public class SolicitudCreditoWebRequest   -> 66 propiedades, UNA por parametro del SP (contrato.md firma_66), en el MISMO orden.
        Nombre = el del parametro sin @ en PascalCase (ej. @apellido_p -> ApellidoP, @nombre_2 -> Nombre2, @years_old -> YearsOld, @ext_archivo_1 -> ExtArchivo1, @ClienteMagento -> ClienteMagento, @Op -> Op).
        Tipo C# nullable segun el SQL: VARCHAR->string, INT->int?, MONEY->decimal?, DATE->DateTime?, BIT->bool?.
        Default = el del SP: todos null salvo Estatus = 0 y SucursalDestino = 0 (contrato.md).
        Cada propiedad con /// <summary>SP: @nombre TIPO(tam) = default — rama(s)</summary>.
    public class SolicitudCreditoWebRecord    -> 59 propiedades, UNA por columna del INSERT (contrato.md insert_59), mismo orden, nombre = columna en PascalCase (apellidoP -> ApellidoP, extencionArchivo_1 -> ExtencionArchivo1, CURP -> Curp, ValidacionTelefono -> ValidacionTelefono), tipo del parametro que la alimenta; Fecha es DateTime, Confirmado es int (literal 1).
    public class SolicitudCreditoWebUpdateRequest -> Id (int) + las 9 columnas del Update (contrato.md update_9), mismos tipos.
    public class ContextoValidacionTelefono   -> string OrigenAutorizado; string TelefonoValidado; string TelefonoAValidar; bool EsProspecto. (SP:164-166 + SP:216)
  Archivo Models/SAP/Credit/ReferenciaSolicitudCreditoModels.cs:
    public class ReferenciaSolicitudCreditoRecord -> las 17 columnas de TrWACW00041_RefSolCredWeb (contrato.md referencias_verbatim INSERT :560-577), en orden, PascalCase: IdSolicitud, Parentesco, Nombre, ApellidoP, ApellidoM, TipoTel, LadaTel, NumeroTel, Direccion, EntreCalles, NumInt, NumExt, CodigoPostal, Municipio, Poblacion, Estado, Colonia. Tipos: los de las variables del SP (:404-412 para los Aux; los @*_ref de la firma para los demas).
    public class CampoMultiplexado -> string Campo; string TipoDato; string Valor.  (#Datos SP:431-437)
  Archivo Models/SAP/Credit/PreSolicitudCreditoModels.cs:
    public class PreSolicitudCreditoRequest -> 17 propiedades, una por parametro de SpCREDISolicitudWebPrimerGuardado (contrato.md presolicitud_firma), mismo criterio de nombres/tipos/defaults.
    public class PreSolicitudCreditoRecord  -> las columnas de CREDIDSolicitudWebDatosPrimerGuardado que el SP lee o escribe (contrato.md presolicitud_ops_verbatim), PascalCase.
    public class ReferenciaPreSolicitudRecord -> las 7 columnas de CREDIDRefPrimerGuardadoCredWeb.
    public class HistoricoNipRecord -> las columnas de CREDIHSolicitudWebHistoricoNip.
  Archivo Models/SAP/Credit/LineaArticuloCreditoModels.cs:
    public class LineaArticuloCreditoRequest -> los 7 parametros de SpVTASInsertArtSolCreditoLinea (:28-34).
    public class LineaArticuloCreditoRecord  -> las 7 columnas de VTASdArtCreditoWeb (IdArtCreditoWeb, cantidad, articulo, precio, Orden, Abono, costo) PascalCase.
  Archivo Models/SAP/Credit/DatosSolicitudCreditoArtModels.cs:
    public class DatosSolicitudCreditoArtRequest -> los parametros de SpCREDIDatosSolicitudCreditoArt (leelos del .sql).
    (mas los DTOs de resultado que necesite cada operacion; nombres en espanol, derivados de la operacion: ej. InfoClienteCreditoArt para GetInfo)

METODOS — namespace ServicioSap.Methods.Credit, todos public static
  Methods/Credit/ValidacionTelefonoMethods.cs
    public static async Task<ContextoValidacionTelefono> ObtenerContextoAsync(string cliente)
        -> las 3 lecturas del prologo (SP:186-208): OrigenAutorizado via ProductMethods.GetConfiguracionCatalogoAsync("ORIGEN VALIDACION NUMERO CTE") cruzado con el AppOrigen del telefono validado; TelefonoValidado via CreditMethods.IsValidatedAsync; TelefonoAValidar via SQL directo con LA CONSULTA DEL SP (SP:205-208) — no la de las copias privadas existentes, que filtran distinto (anotalo). EsProspecto = SUBSTRING(cliente,1,1)='P' (SP:216).
    public static int Resolver(ContextoValidacionTelefono ctx)
        -> SP:210-221 TAL CUAL (decision A pendiente: se replica el observable). Devuelve 0/1 como lo escribe el SP.
  Methods/Credit/SolicitudCreditoWebMethods.cs
    public static SolicitudCreditoWebRequest ConstruirDesdeData(string op, string[] data)
        -> el mapeo POSICIONAL data[i] -> parametro EXACTAMENTE como LAN (grafo.md rutas_credit_lan, CreditMethods.cs de LAN). Ni una posicion distinta.
    public static async Task<int> EjecutarAsync(SolicitudCreditoWebRequest req)
        -> despacho por req.Op igual que el SP: tres IF independientes ("Insert", "Update", "InsertReferencia", comparacion como la hace SQL: sin distinguir mayusculas). Op desconocido: no escribe, devuelve 0 (FIDELIDAD SP — decision C).
    public static async Task<int> InsertAsync(SolicitudCreditoWebRequest req)     -> prologo + 59 columnas + INSERT parametrizado a CRED_SOLICITUD_WEB_DATOS_TEMP + SCOPE_IDENTITY (decision B: se conserva la tabla; un solo metodo PersistirSolicitudAsync privado).
    public static async Task<int> UpdateAsync(SolicitudCreditoWebUpdateRequest req) -> SP:351-368 tal cual, incluido devolver req.Id sin comprobar filas (decision D).
    (InsertReferencia lo despacha a ReferenciaSolicitudCreditoMethods.InsertReferenciaAsync(req))
  Methods/Credit/ReferenciaSolicitudCreditoMethods.cs
    public static async Task<int> InsertReferenciaAsync(SolicitudCreditoWebRequest req)  -> SP:370-603 completo, con semantica identica.
    public static bool EsCadenaMultiplexada(string apellidoMRef)                          -> SP:372-375
    public static List<CampoMultiplexado> ParsearCadenaMultiplexada(string apellidoMRef)  -> SP:449-513, puro, sin I/O
    public static ReferenciaSolicitudCreditoRecord MapearCampos(SolicitudCreditoWebRequest req, List<CampoMultiplexado> campos) -> SP:517-558 (10 campos, centinela '{0}', truncados a los largos de :404-412)
  Methods/Credit/PreSolicitudCreditoMethods.cs
    public static PreSolicitudCreditoRequest ConstruirDesdeData(string op, string[] data)  -> mapeo posicional como LAN para CreditoWeb_SaveFirstData (grafo.md); si no esta en grafo.md, dejalo con PENDIENTE y explica.
    public static async Task<int> EjecutarAsync(PreSolicitudCreditoRequest req)          -> despacho por req.Op sobre las 11 operaciones, cada una un metodo privado con el nombre de la operacion (SaveFirstDataAsync, ...). Devuelve lo que el SP devuelve en esa rama (SCOPE_IDENTITY, 1/0, o 0 si no devuelve nada).
  Methods/Credit/LineaArticuloCreditoMethods.cs
    public static async Task<int> InsertarLineaAsync(LineaArticuloCreditoRequest req)   -> SpVTASInsertArtSolCreditoLinea completo. Devuelve filas insertadas (0 si la linea no se inserta, como el SP — decision G).
  Methods/Credit/DatosSolicitudCreditoArtMethods.cs
    public static async Task<object> EjecutarAsync(DatosSolicitudCreditoArtRequest req)  -> las 7 operaciones, cada una metodo privado con el nombre de la operacion.
`

phase('Modelos')
log('Escribiendo los 5 archivos de modelos con una sola mano')

const modelos = await agent(
  `${BASE}${CONTRATO_API}

TU TAREA: escribir los CINCO archivos de modelos del CONTRATO, en "${PROY}/Models/SAP/Credit/". Lee primero contrato.md (firma_66, insert_59, update_9, referencias_verbatim, presolicitud_firma, presolicitud_ops_verbatim) y los .sql de SpVTASInsertArtSolCreditoLinea y SpCREDIDatosSolicitudCreditoArt para sus parametros. Imita el estilo de Models/SAP/Credit/CreditAmountModels.cs y SendSmsNewNumberRequest.cs (arquitectura.md modelos_patron): usings, atributos JSON si los usan, comentarios XML.

Cuenta y reporta: 66 propiedades en SolicitudCreditoWebRequest, 59 en SolicitudCreditoWebRecord, 9+Id en el Update, 17 en ReferenciaSolicitudCreditoRecord, 17 en PreSolicitudCreditoRequest. Si tu conteo no cuadra con el SP, para y reporta la diferencia en vez de ajustar.

Devuelve el listado exacto de clases y propiedades por archivo (nombre y tipo), porque los escritores de metodos van a compilar contra eso.`,
  { label: 'modelos', phase: 'Modelos' }
)

phase('Metodos')

const UNIDADES = [
  {
    k: 'validacion-telefono', archivo: 'Methods/Credit/ValidacionTelefonoMethods.cs',
    t: `Escribe "${PROY}/Methods/Credit/ValidacionTelefonoMethods.cs" segun el CONTRATO.
Fuente: SP_CREDITO_WEB_DATOS.sql:160-221 (contrato.md prologo_insert_verbatim). Reutiliza CreditMethods.IsValidatedAsync (abre CreditMethods.cs:230-260 y copia la firma; nota que hoy hace FirstOrDefault sin OrderBy mientras el SP hace ORDER BY Fecha DESC en :202 — no modifiques CreditMethods; documenta la diferencia en comentario FIDELIDAD y en tu salida). El catalogo ORIGEN VALIDACION NUMERO CTE va por ProductMethods.GetConfiguracionCatalogoAsync (abre ProductMethods.cs:708-735, copia la firma y el modelo que devuelve). La lectura de TcAAEA00030_EnvioMensajes es la del SP (:205-208), parametrizada. Resolver(): SP:210-221 literal, con la observacion de que @TelefonoAValidar no esta protegido contra NULL (en C#: null != x es true, en SQL es UNKNOWN y cae al ELSE — replica el resultado SQL, no el de C#, y comentalo). Decision A pendiente.`
  },
  {
    k: 'solicitud-web', archivo: 'Methods/Credit/SolicitudCreditoWebMethods.cs',
    t: `Escribe "${PROY}/Methods/Credit/SolicitudCreditoWebMethods.cs" segun el CONTRATO.
Fuentes: contrato.md (firma_66, insert_59, prologo_insert_verbatim, update_9) y grafo.md (crear_solicitud_verbatim para el patron de SqlCommand y los SqlDbType que ya usa el proyecto; rutas_credit_lan para el mapeo posicional data[] de LAN; tabla_38_parametros). InsertAsync: (1) si req.Origen == "DIMAS MX" -> metodo privado PENDIENTE DE FUENTE que lanza NotSupportedException (SP:174-183, decision F); (2) contexto via ValidacionTelefonoMethods.ObtenerContextoAsync(req.Cliente) y ValidacionTelefono = ValidacionTelefonoMethods.Resolver(ctx) — pisando el valor recibido, como el SP; (3) armar SolicitudCreditoWebRecord con las 59 columnas EXACTAS de insert_59 (Fecha = DateTime.Now como GETDATE de SP:170, Confirmado = 1 literal de SP:327, RedimirMonedero = req.RedimirMonedero ?? 0.00m de SP:336); (4) PersistirSolicitudAsync privado: INSERT parametrizado con las 59 columnas en el orden de la tabla y SELECT SCOPE_IDENTITY(); devolver el int. UpdateAsync: SP:351-368 tal cual (9 SET incondicionales, WHERE id=@Id, WITH(ROWLOCK) no se replica — comentalo; devuelve req.Id sin mirar filas afectadas, decision D). EjecutarAsync: tres IF independientes por Op; desconocido -> 0 (decision C). ConstruirDesdeData: el mapeo posicional de LAN, posicion por posicion, citando la linea de LAN de cada una; si LAN no manda alguno de los 66, la propiedad queda en su default. Ademas escribe un metodo estatico publico ConstruirDesdeParametrosActuales(...) que reciba los MISMOS 38 valores que hoy manda OrderMethods.CrearSolicitudCreditoAsync (grafo.md tabla_38_parametros) para que el orquestador pueda hacer que ese metodo delegue aqui sin cambiar su firma.`
  },
  {
    k: 'referencias', archivo: 'Methods/Credit/ReferenciaSolicitudCreditoMethods.cs',
    t: `Escribe "${PROY}/Methods/Credit/ReferenciaSolicitudCreditoMethods.cs" segun el CONTRATO.
Fuente: contrato.md referencias_verbatim (SP:370-603) COMPLETO, y decision D6 (17 columnas, misma tabla TrWACW00041_RefSolCredWeb en Android, misma manipulacion) y decision E (defectos del parser: se replican y se marcan). Semantica a conservar EXACTA: (a) discriminador COUNT(fnSplit(@apellido_m_ref,'~')) = 1 -> camino corto; fnSplit NO EXISTE en el corpus, asi que usa string.Split('~') y documenta que el comportamiento con tokens vacios/NULL es SIN EVIDENCIA; (b) camino corto: INSERT 8 columnas (:377-396), SCOPE_IDENTITY, devolverlo; (c) camino largo: Split('|') -> por cada segmento Split('~') acumulando en UNA lista plana que NUNCA se vacia (#DatosCampoValor), indices (i*3)-2/-1/0 en base 1 (SP:488,494,500) traducidos a base 0; cadena IF de 10 campos (:525-556) con centinela '{0}' = no vino; ApellidoM: si no viene el segmento, @apellido_m_ref conserva la cadena completa (defecto E5, replicar); CodigoPostal: CAST a INT sin TRY (:543) -> int.Parse que lanza, replicar; truncamientos VARCHAR(50)/(7) de :404-412 -> Substring explicito, replicar; TipoDato se parsea y no se usa (:507 vs :525-556), replicar y comentar; (d) INSERT 17 columnas (:560-597) parametrizado, SCOPE_IDENTITY, devolverlo. Las variables de correlacion: NO reutilices el Id de entrada para el identity de salida (en el SP se pisa; en C# son dos variables, y lo documentas). Metodos publicos puros (EsCadenaMultiplexada, ParsearCadenaMultiplexada, MapearCampos) sin I/O, para poder probarlos en mesa.`
  },
  {
    k: 'presolicitud', archivo: 'Methods/Credit/PreSolicitudCreditoMethods.cs',
    t: `Escribe "${PROY}/Methods/Credit/PreSolicitudCreditoMethods.cs" segun el CONTRATO.
Fuente: contrato.md presolicitud_firma y presolicitud_ops_verbatim (las 11 operaciones de SpCREDISolicitudWebPrimerGuardado.sql:48-482, verbatim) y la seccion 4.5 del documento. Las 3 tablas (CREDIDSolicitudWebDatosPrimerGuardado, CREDIDRefPrimerGuardadoCredWeb, CREDIHSolicitudWebHistoricoNip) son locales de ServicioAndroid: SQL directo parametrizado, misma tabla y columnas (mismo criterio que D6). Lecturas de Intelisis: el precio de PRODUCTOS MX (PropreListaDFinal JOIN VTASCCondicionesCredVtaLinea, :63-76) -> FinalListProperMethods.GetFinalListProperBySkuAsync para el precio (abre la firma) y PENDIENTE DE FUENTE para el crosswalk de condicion; el precio desde la tabla art (:60 y :378-385) -> PENDIENTE DE FUENTE. NIP: FLOOR(RAND()*(999999-100000)+100000) replicado con la misma formula (rango 100000-999998, comentalo). El INSERT a TcAAEA00030_EnvioMensajes usa LAS COLUMNAS DEL SP (:226-251: IdRegistro, IdMensaje=14, Cliente='CW00001', Clave=@ClaveMensaje...), NO las de CreditMethods.SendSmsNewNumberAsync (que es otro mensaje); escribelo UNA vez en un metodo privado y llamalo desde SaveNip, UpdateNumberCel y SaveCelNip. Defectos a replicar y marcar: :52 IF (@origen <> 'PRODUCTOS MX') con NULL cae al ELSE; :205 IF (@validacion != 1) con NULL se salta todo; :462-467 vs :196-202 FechaValidacion contradictoria; SaveCelNip asimetrico; sin transacciones. ConstruirDesdeData: el mapeo posicional de CreditoWeb_SaveFirstData desde LAN si esta en grafo.md; si no, PENDIENTE.`
  },
  {
    k: 'linea-articulo', archivo: 'Methods/Credit/LineaArticuloCreditoMethods.cs',
    t: `Escribe "${PROY}/Methods/Credit/LineaArticuloCreditoMethods.cs" segun el CONTRATO.
Fuente: "${SPS}/SpVTASInsertArtSolCreditoLinea.sql" completo (leelo entero) y la seccion 4.8 del documento, mas grafo.md lineas_articulo_actual (como escribe hoy ServicioSAP en VTASdArtCreditoWeb y de donde saca precio/abono/costo: REUTILIZA esa misma fuente de costo si existe; si no, PENDIENTE DE FUENTE para spVerCosto). Estructura a portar: (1) familia del articulo — busca como obtiene hoy ServicioSAP la familia (ProductMethods, ZAPI_ARTICULOS_SRV) y usala; (2) si TELEFONIA: pares Region5/Region6 -> PENDIENTE DE FUENTE (VTASCRegionSku) y CP de region celular -> PENDIENTE DE FUENTE (VTASCCodigoPostalRegionCelular); comportamiento cuando no hay fuente: el ELSE natural del SP (:161-165) artRegion = Articulo, con Logger.SAP de advertencia; (3) existencia previa al cambio de SKU (:96-120): DIM11 via ProductMethods.GetStockAsync/GetFilterProductsStockAsync (abre las firmas; el SP hace COALESCE de dos fuentes — usa DIM11 y documenta que la consolidacion esta pendiente de confirmar); (4) rama SEGU00001 (:179-217): Abono = 12 literal, precio = SeguCost, siempre inserta; (5) rama general (:218-263): precio/abono de FinalListProperMethods.GetFinalListProperBySkuAsync, crosswalk de condicion PENDIENTE DE FUENTE, DescuentoCategoria PENDIENTE DE FUENTE con ELSE natural = precio integro; CEILING replicado con Math.Ceiling; (6) INSERT a VTASdArtCreditoWeb con las 7 columnas del SP, parametrizado. Fallas silenciosas de decision G: artRegion NULL -> no inserta (replicar, pero con Logger.SAP), JOIN sin fila -> 0 filas (replicar, con Logger.SAP). El doble INSERT a #RegionSKUSolCreditoLinea (:62-68 y :77-83) colapsa en una resolucion; anota que el TOP 1 sin ORDER BY del SP era no determinista.`
  },
  {
    k: 'datos-solicitud-art', archivo: 'Methods/Credit/DatosSolicitudCreditoArtMethods.cs',
    t: `Escribe "${PROY}/Methods/Credit/DatosSolicitudCreditoArtMethods.cs" segun el CONTRATO.
Fuente: "${SPS}/SpCREDIDatosSolicitudCreditoArt.sql" completo (leelo entero; vive en IntelisisTmp, 7 operaciones) y las secciones 4.8 y 4.10 del documento (D9: todas las ramas). Por operacion: CheckCliente (:37-51) -> existencia del BP via BusinessPartnerMethods.GetClientAsync (abre la firma); devuelve 1/0. GetInfo (:53-78) -> los 19 campos de Cte via GetClientAsync/GetClientMaAsync mapeando cada columna del SP a su campo real de Cte.cs/BusinessEntitiesMa.cs (reuso.md modelos_existentes; si una columna no tiene campo, dejala null y anotalo, no inventes). GetSaldo (:80-122) -> Credito = Zcrmcantidad del BP; Saldo (Venta pendiente UNION CXC pendiente) -> PENDIENTE DE FUENTE que lanza (no hay ELSE natural); CreditoDisponible = CASE del SP :115-120 cuando haya saldo. GetCuenta (:125-224) -> lectura por RFC y por IDMagento: busca en reuso.md/grafo.md si existe lectura de BP por RFC (GetFilterClientsAsync) y por IDMagento (si no, PENDIENTE); el INSERT CteEnviarA de 23 columnas con literales -> el equivalente es ZAPI_SD52_PARTNER_SRV que ya se invoca en BusinessPartnerMethods.cs:386 (abre ese bloque, copia el patron y mapea los literales del SP a los campos de esa entidad: Vkorg/Vtweg/Spart/Ktgrd/Kvgr4; lo que no tenga campo, anotalo); el UPDATE Cte.IDMagento -> BusinessPartnerMethods.LinkMagentoAccountAsync. UpdateInfo (:226-296) -> correo: PATCH a Cte por clave (copia el patron de BusinessPartnerMethods.cs:840-858, campo de email real de Cte.cs); MAVIDM0138HistInsertCorreo -> PENDIENTE DE FUENTE; particion de lada TcEACD00001_Lada -> PENDIENTE DE FUENTE; INSERT CteTel -> anota que requiere el upsert de CteTel que no existe (seccion 3 del documento) y deja PENDIENTE; el UPDATE masivo ValidacionTel=0 (:286-289) -> replicar la INTENCION con PENDIENTE y marcar como decision. getClienteMagento (:299-309) -> PENDIENTE DE FUENTE (no hay lectura por IDMagento). GetInfoCredito (:312-324) -> devuelve los literales '1'..'7' tal cual (es stub en el SP; replicar y comentar). Replica tambien que las ramas usan RETURN sin result set donde aplique (documenta que se devuelve en C#).`
  },
]

log(`Escribiendo ${UNIDADES.length} unidades de metodos en paralelo, archivos disjuntos`)

const REVISION = {
  type: 'object',
  properties: {
    hallazgos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severidad: { type: 'string', enum: ['bloqueante', 'alta', 'media', 'baja'] },
          tipo: { type: 'string', enum: ['paridad-sp', 'no-compila', 'arquitectura', 'inventado', 'reutilizacion', 'seguridad-sql', 'otro'] },
          donde: { type: 'string', description: 'archivo:linea del .cs nuevo' },
          que: { type: 'string' },
          evidencia_sp_o_codigo: { type: 'string', description: 'SP:linea o archivo:linea existente que prueba el hallazgo' },
          correccion: { type: 'string', description: 'que cambio exacto lo arregla' },
        },
        required: ['severidad', 'tipo', 'donde', 'que', 'evidencia_sp_o_codigo', 'correccion'],
      },
    },
    resumen: { type: 'string' },
  },
  required: ['hallazgos', 'resumen'],
}

const LENTES = [
  { n: 'paridad-sp', p: 'PARIDAD CON EL SP: compara el .cs contra el SQL LINEA POR LINEA. Cada parametro, columna, literal, default, orden de columnas en el INSERT, condicion de cada IF, comportamiento con NULL (recuerda: en SQL, NULL != x es UNKNOWN y cae al ELSE; en C# null != x es true), valor de retorno de cada rama. Cualquier desviacion no amparada por una decision D1-D10 es hallazgo. Cuenta las columnas del INSERT y comparalas con las del SP.' },
  { n: 'compila-arquitectura', p: 'COMPILA Y ARQUITECTURA: verifica que CADA metodo/clase/propiedad externa que el .cs invoca EXISTE con ese nombre, esa firma, esa visibilidad y ese namespace (abre el archivo real y compara: reuso.md, los modelos recien escritos en Models/SAP/Credit, conexionSQL, Logger.SAP, TokenGenerator). Verifica usings, namespace, async/await con ConfigureAwait(false), tipos nullable vs no nullable en asignaciones, SqlDbType y tamanos vs el tipo del SP, que no use .Result/.Wait(), que no use C# 8+ (no switch expressions, no using declarations sin llaves, no ??=, no ranges, no default interface methods; C# 7.3 maximo), que las cadenas SQL sean parametrizadas.' },
  { n: 'no-inventa', p: 'NO INVENTA: por cada identificador de negocio, literal, tabla, columna, nombre de catalogo, URL, regla o default del .cs, exige el rastro: SP:linea, archivo:linea existente, o decision D1-D10. Lo que no tenga rastro es hallazgo "inventado". Verifica tambien que todo PENDIENTE DE FUENTE tenga el encabezado exacto y el comportamiento correcto (ELSE natural del SP con Logger, o NotSupportedException), y que ningun defecto replicado quede sin su comentario FIDELIDAD con letra de decision.' },
]

const unidades = await pipeline(
  UNIDADES,
  // 1) escribir
  (u) => agent(
    `${BASE}${CONTRATO_API}

MODELOS YA ESCRITOS (compila contra esto; abre los archivos en "${PROY}/Models/SAP/Credit/" para ver nombres y tipos exactos):
${typeof modelos === 'string' ? modelos.slice(0, 12000) : JSON.stringify(modelos).slice(0, 12000)}

TU TAREA:
${u.t}`,
    { label: `escribir:${u.k}`, phase: 'Metodos' }
  ).then((salida) => ({ u, salida })),
  // 2) tres revisores en paralelo sobre el archivo escrito
  ({ u, salida }) => parallel(LENTES.map((l) => () =>
    agent(
      `${BASE}${CONTRATO_API}

Eres REVISOR ADVERSARIAL del archivo recien escrito "${PROY}/${u.archivo}". Leelo completo. Tu lente unica:
${l.p}

Lo que el escritor dijo haber hecho (no lo tomes como verdad, verificalo):
${(salida || '').slice(0, 6000)}

Reporta SOLO hallazgos verificados con evidencia. Nada de estilo. Si el archivo esta bien en tu lente, hallazgos = [].`,
      { label: `revisar:${u.k}/${l.n}`, phase: 'Revision', schema: REVISION }
    )
  )).then((revs) => ({ u, salida, hallazgos: revs.filter(Boolean).flatMap((r) => r.hallazgos || []) })),
  // 3) corrector aplica hallazgos
  ({ u, salida, hallazgos }) => {
    const graves = hallazgos.filter((h) => h.severidad === 'bloqueante' || h.severidad === 'alta' || h.severidad === 'media')
    if (graves.length === 0) return { unidad: u.k, archivo: u.archivo, salida, hallazgos, corregido: 'sin cambios' }
    return agent(
      `${BASE}${CONTRATO_API}

Eres el CORRECTOR del archivo "${PROY}/${u.archivo}". Tres revisores encontraron estos hallazgos. Aplica SOLO los que verifiques como ciertos abriendo el SP o el codigo (si uno es falso, dilo y no lo apliques). Edita el archivo con Edit (no lo reescribas entero salvo que sea inevitable). No introduzcas nada nuevo que no este amparado por SP/codigo/decision.

HALLAZGOS:
${JSON.stringify(graves, null, 1)}

Al terminar devuelve: por hallazgo -> aplicado / rechazado (con motivo), y la lista final de PENDIENTE DE FUENTE y de dudas para el usuario.`,
      { label: `corregir:${u.k}`, phase: 'Correccion' }
    ).then((c) => ({ unidad: u.k, archivo: u.archivo, salida, hallazgos, corregido: c }))
  }
)

const ok = unidades.filter(Boolean)
log(`Unidades terminadas: ${ok.length}/${UNIDADES.length} · hallazgos totales: ${ok.reduce((a, x) => a + (x.hallazgos || []).length, 0)}`)

return { modelos, unidades: ok }
