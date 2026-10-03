# NIP SMS (credit/getSms, credit/validateSms) — port spec to ServicioSAP
> 2026-10-01: cómo funciona ServicioSAP hoy está en [[Business Rules Ecommerce]] (fuente única). Este documento queda como historia; si contradice a esa fuente, gana la fuente.

_2026-09-26 · user decision Q9: "NIP SMS needs to be the same as LAN" · produced by workflow `wf_3730cb5a-b11` (4 read-only mappers + designer, every citation re-read). Raw result: `_IMPLEMENTACION_SP_CREDITO
ip_sms_port_2026-09-26.json`. Status: **implemented 2026-09-26 (see the update note below); sections 1-8 describe the original design — where they differ, runbook §23.9/§24 win.**_

> **Update 2026-09-26 (after coding):** implemented in ServicioSAP. By the user's decision (Q4) the validated phone for getSms comes from `A_GET_TelefonoValidado` (`SolicitudCreditoWebMethods.GetTelefonoValidadoAsync`, `URL_BP_API`) — the same source as the order flow — plus LAN's 10-character check; it no longer reads CteTelSet. `GetIdRefAsync` is parameterized and `ExistingCustomerAsync` rejects non-alphanumeric accounts before calling SAP. Verified by `wf_47a27d50-9a7`. DMZ not switched yet.

## 1. LAN business logic
Path prefixes used below: LAN = \\172.16.214.58\sap\LAN\WebApiMagento, SAP = \\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap, DMZ = \\172.16.214.58\sap\DMZ\WebApiMagento, MAG = \\172.16.214.58\sap\Magento248\Magento248\app\code, SPS = \\172.16.214.58\sap\.agents\skills\lan-sap-migration\SPsOrden, RB = ...\MappingMetods\PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md. I re-read every line cited here.

A. credit/getSms (LAN)
1. The DMZ receives Magento's body {cuenta, idCarritoCliente, cliente}. It re-serializes the body with an extra nipCliente:null and forwards it with curl.Post("credit/getSms") to URL_INTELISIS (DMZ Controllers\CreditController.cs:67-76; DMZ Models\CreditRequest.cs:9-15; DMZ Helper\Curl.cs:22,93-106). Magento never sends the NIP (MAG Omnipro\MaviCredito\Model\CreditoManagement.php:355-357,410-412).
2. LAN controller: a null body returns 400. It then calls ProductosCredito_Nip(cuenta, int.Parse(idCarritoCliente), int.Parse(cliente)). Any exception, including a parse or overflow failure, returns 500. Otherwise the controller returns Ok(string) (LAN Controllers\CreditController.cs:24-44). The LAN NipRequest has no NIP field (LAN Models\CreditRequest.cs:8-13).
3. ProductosCredito_Nip calls VTASCodigoSMSEcommerce. It logs "INFO [cliente]" plus the result to credit.log and returns result.ToString(). Its outer catch returns "err" (LAN Metodos\CreditMethods.cs:21-48).
4. VTASCodigoSMSEcommerce runs everything inside one try; any exception is logged with Logger.SetOrder and returns -1 (:2102-2189). The steps:
 4.1 If idMagento > 0: UPDATE Cte SET IDMagento=@IdMagento WHERE Cliente=@Cliente (Intelisis; :2111-2114, :2191-2206).
 4.2 If Cte has no row for the customer (SELECT 1 FROM Cte WHERE Cliente=@Cliente), return 0 (:2116, :2177-2180, :2208-2222).
 4.3 idRef = GetIdRef, i.e. SELECT ISNULL(MAX(IdCodigoVerificacioneCommerce),'') ... WHERE Cliente='{0}' AND IdCarrito={1}. It gives "0" when there is no row and "" on error (:2118, :2035-2065). telefonoValidado = SELECT TOP 1 LADA+Telefono FROM CteTel WHERE Tipo='Movil' AND Telefono!='0' AND LEN(Telefono)+LEN(Lada)=10 AND Cliente=@Cliente AND ValidacionTel=1 ORDER BY Fecha DESC, or null (:2119, :2224-2243).
 4.4 If idRef=="0": idRef = InsertCodigoVerificacion, which inserts Codigo = RIGHT('000000'+CAST(ABS(CHECKSUM(NEWID()))%1000000 AS VARCHAR(6)),6), FechaRegristro=GETDATE(), FechaExpira=+2 min, Estatus=1, and returns the new MAX id, or "" on its own caught error (:2121-2123, :2067-2100). If there is a phone: InsertSendingSms, then return 3 (:2125-2129). With no phone it falls through to return 0, and the code row stays written (:2182).
 4.5 Otherwise: idRef = GetIdRef again, and estatus = SELECT TOP 1 EstatusEnvio FROM TcAAEA00030_EnvioMensajes WHERE Cliente=@Cliente AND IdMensaje=23 ORDER BY Id DESC (:2133-2134, :2264-2279).
   - "1": return 3 and write nothing (:2136-2139).
   - "2" or "3": codigo = SELECT Codigo ... WHERE Cliente AND IdCarrito, with no ORDER BY (:2143, :2281-2297). Then INSERT a new row with the SAME code, +2 min and Estatus 1 (:2147-2158), and set idRef = GetIdRef. With a phone: InsertSendingSms and return 3; otherwise 0 (:2162-2168).
   - Empty status with a phone: InsertSendingSms with the existing idRef, then return 3 (:2170-2174).
   - Anything else: return 0 (:2182).
 4.6 InsertSendingSms = INSERT TcAAEA00030_EnvioMensajes (IdRegistro=@IdRef, IdMensaje 23, Cliente, FechaEnvio GETDATE(), EstatusEnvio 1, ClienteF NULL, Tipo 0, IntentoRespuesta 0, IntentoEnvio 0, Modem NULL, Identificador 'DM0363', Telefono=@TelefonoValidado) (:2245-2262). LAN never calls an SMS provider. A dispatcher reads this table (SPS\SPVTASCodigoSeguridadeCommerce.sql:83).
5. The C# path never returns 1: a missing validated phone yields 0 (:2102-2189). The "1 = sin numero" comment at :38 is stale.
6. DMZ mapping: "0" → 400 "Error de credenciales"; "1" → 400 "Error de telefono"; "3" → 200 "Correcto"; "err" or anything else → 400 with an empty body (DMZ CreditController.cs:78-95). Magento: 200 → "Correcto" and the body is ignored. "Error de credenciales" → 401 "Número de cuenta inválida". An empty or unknown body → "error de conexión" (CreditoManagement.php:304-340).

B. credit/validateSms (LAN)
7. The DMZ forwards {cuenta, claveSms, idCarritoCliente} with curl.Post (DMZ CreditController.cs:98-107). LAN controller: null body → 400. It calls ProductosCredito_Clave(cuenta, claveSms, int.Parse(idCarritoCliente)); an exception → 500 (LAN CreditController.cs:46-66).
8. ProductosCredito_Clave runs SP SPVTASCodigoSeguridadeCommerce on ServicioAndroid with @Cliente VarChar, @IdCarrito Int, @CodigoWeb=claveSms, @Op='CODIGO', CommandTimeout 60, and returns the ReturnValue as a string. On an exception it returns e.Message without logging (LAN Metodos\CreditMethods.cs:50-92).
9. SP params: @Cliente varchar(15), @IdCarrito int, @CodigoWeb varchar(35) (SPS\SPVTASCodigoSeguridadeCommerce.sql:18-22). The CODIGO branch is IF (SELECT TOP 1 IdCodigoVerificacioneCommerce FROM VTASDCodigoVerificacioneCommerce WHERE Cliente=@Cliente AND IdCarrito=@IdCarrito AND Codigo=@CodigoWeb) > 0 RETURN 5 ELSE RETURN 6 (:143-161). It does not check FechaExpira or Estatus, does not count attempts and never marks the code as used.
10. DMZ mapping: "5" → 200 "Correcto"; "6" → 400 "Error de credenciales"; anything else → 400 with an empty body (DMZ CreditController.cs:109-123).

C. Surrounding behaviour (unchanged by the port)
11. Attempts are counted only in Magento. The browser blocks at tries()>=3 (MAG Mavi\CreditoCheckout\view\frontend\web\js\credito-checkout-functions.js:213,252). The server-side limit is commented out (CreditoManagement.php:451-453). Resend is simply getSms again.
12. After a successful validation nothing happens on the server. The order later reads the SMS phone: SAP Methods\Order\OrderMethods.cs:589-613 (called with the BP at :1804) and SAP Methods\Credit\SolicitudCreditoWebMethods.cs:333-370 (the port of SPS\SP_CREDITO_WEB_DATOS.sql:204-208).

D. Where the maps disagreed, and what the code says
- Is "1" a live getSms code? No. Only 3, 0 and -1 are returned (:2102-2189), and "err" only from the outer catch (:42-46).
- Does validateSms check expiry? No (SP :143-161). The contract map's "6 = mismatch or expired" is wrong.
- Customer key, 'C...' or BP? BP. The user decided that ServicioSAP targets the final state with numeric BPs, and that rejecting 'C...' is transitional and intentional (C:\Users\claude\.claude\projects\C--x\memory\sap-migration-sp-credito-estado-implementacion.md). The ServicioSAP readers also key on the BP: cuentaBp at SAP OrderMethods.cs:669, :681 and :1804. So Cliente = BP, and a 'C...' account gets "0" from the SAP existence check. The contract map's advice to accept 'C...' is not followed; the consequence is a cutover-timing constraint (see risks).

## 2. Contract that must stay unchanged (Magento and DMZ)

Must stay unchanged: Magento (all of it) and the DMZ switch/Trim mapping, models and logs (DMZ Controllers\CreditController.cs:67-124). The only DMZ edit is at cutover: curl.Post → curl.PostSAP at DMZ CreditController.cs:76 and :107, the same pattern already used at :308 (DMZ Helper\Curl.cs:115-127). The JWT is already the ServicioSAP token: Curl logs in only at URL_SAP login/auth, and the LAN login is commented out (Curl.cs:57-90).

1) POST {URL_SAP}credit/getSms
- Where: existing CreditController, which already has [Authorize] and [RoutePrefix("credit")] (SAP Controllers\CreditController.cs:9-11). No route named getSms or validateSms exists in any ServicioSAP controller.
- Request, application/json, every value a JSON string as the DMZ re-serializes it:
  {"cuenta":"<10-digit BP, e.g. 1500007539>","nipCliente":null,"idCarritoCliente":"<Magento quote id>","cliente":"<Magento customer id, \"0\" for guests>"}
  nipCliente is ignored. cliente > 0 triggers the ZidMagento stamp.
- Response: always HTTP 200 with a JSON string body produced by Ok(string), e.g. "3".
  - "3" = SMS queued, or a previous one is still pending (EstatusEnvio 1).
  - "0" = the BP does not exist, OR it has no validated 10-digit MOVIL phone (LAN parity; "1" is never emitted).
  - "-1" = an exception in the business steps.
  - "err" = an exception outside them.
- Non-business failures, same as LAN: null body → 400 (HttpResponseException BadRequest); an int.Parse failure on idCarritoCliente or cliente → 500. The DMZ turns both into a 400 with an empty body.
- No {"result":n} wrapper; that shape belongs to SendSmsNewNumber only.

2) POST {URL_SAP}credit/validateSms
- Request: {"cuenta":"<BP>","claveSms":"<Magento input, up to 8 alphanumeric characters>","idCarritoCliente":"<quote id>"}.
- Response: HTTP 200 with a JSON string: "5" = a row matches Cliente+IdCarrito+Codigo; "6" = no match.
- "err" = exception, or a null cuenta/claveSms. LAN's SP call fails without them and returns e.Message; the DMZ maps any non-5/6 value to 400 exactly as it maps "err" (DMZ CreditController.cs:117-121).
- Null body → 400; int.Parse failure → 500.

3) What Magento ends up seeing (unchanged): 200 'Correcto'; 401 'Número de cuenta inválida' (getSms "0"); 401 'Codigo de SMS no válido' (validate "6"); 'Ha ocurrido un error de conexión' for anything else (MAG Omnipro\MaviCredito\Model\CreditoManagement.php:304-340).

4) Database write contract. The order side reads exactly these rows, so the port must write exactly this:
- VTASDCodigoVerificacioneCommerce: Cliente = the cuenta string as received (the same BP that order/new later carries in infoCliente.cuenta), IdCarrito = quote id, Codigo = the 6-digit SQL expression, FechaRegristro GETDATE(), FechaExpira +2 min, Estatus 1.
- TcAAEA00030_EnvioMensajes: IdRegistro = that row's IdCodigoVerificacioneCommerce, IdMensaje 23, Cliente = the same BP, EstatusEnvio 1, Identificador 'DM0363', Telefono = the 10-digit ZtelCte. Remaining columns as LAN: ClienteF NULL, Tipo 0, IntentoRespuesta 0, IntentoEnvio 0, Modem NULL.
- Reader A joins on IdRegistro, then VTASD.Cliente=@Cliente, TOP 1 ORDER BY Id DESC (SAP OrderMethods.cs:597-600).
- Reader B filters EnvioMensajes.Cliente=@cliente, TOP 1 ORDER BY Id DESC (SAP SolicitudCreditoWebMethods.cs:341-344).
- Neither reader filters on IdMensaje, so SendSmsNewNumber rows (SAP Methods\Credit\CreditMethods.cs:134-141) count too, as in LAN.

5) SAP calls, using existing methods only; no new Web.config key:
- GET ZB_DATOS_CLIENTE_CDS (SAP BusinessPartnerMethods.cs:27-69)
- GET ZQBP_EDITARCLIENTE_SRV/CteTelSet (SAP SolicitudCreditoWebMethods.cs:406-445)
- PATCH ZSDT_CTE_ODATA_SRV/ZSDT_CTE_ENTITYSet(ZclienteBp) {ZidMagento} with CSRF (SAP BusinessPartnerMethods.cs:833-873)
- No PUT.

## 3. LAN step → ServicioSAP equivalent

| LAN step | LAN source | ServicioSAP equivalent | Exists today | Note |
|---|---|---|---|---|
| Route POST credit/getSms + NipRequest {cuenta, idCarritoCliente, cliente} | LAN Controllers\CreditController.cs:24-44; LAN Models\CreditRequest.cs:8-13 | New action GetSms in SAP Controllers\CreditController.cs, plus a NipRequest model in a new Models\SAP\Credit\SmsNipModels.cs | no | No getSms route in any ServicioSAP controller. The DMZ still uses curl.Post (DMZ CreditController.cs:76). |
| Route POST credit/validateSms + ClaveRequest {cuenta, claveSms, idCarritoCliente} | LAN Controllers\CreditController.cs:46-66; LAN Models\CreditRequest.cs:15-20 | New action ValidateSms in SAP Controllers\CreditController.cs, plus ClaveRequest in SmsNipModels.cs | no | The DMZ still uses curl.Post (DMZ CreditController.cs:107). |
| int.Parse(idCarritoCliente) / int.Parse(cliente); a failure gives 500 | LAN Controllers\CreditController.cs:36-41,58-63 | The same int.Parse runs at the top of GetSmsAsync/ValidateSmsAsync, outside their try; the controller catch turns it into a 500 | no | Keeps LAN's int32 limit. JoinAccount synthetic cart ids can overflow it, as they do in LAN (MAG Mavi\JoinAccount\Model\Api\JoinAccountManagement.php:205). |
| UpdateMagentoId: UPDATE Intelisis Cte.IDMagento when idMagento > 0 | LAN Metodos\CreditMethods.cs:2111-2114,2191-2206 | BusinessPartnerMethods.LinkMagentoAccountAsync(new UnirCuentaRequest{partner_id=BP, id_magento}): PATCH ZSDT_CTE_ODATA_SRV/ZSDT_CTE_ENTITYSet(ZclienteBp) {ZidMagento} | partial | The method exists (SAP BusinessPartnerMethods.cs:833-873), but sap.log has no '[SAP ZidMagento PATCH' entry. In the port it runs AFTER the existence check: a SQL UPDATE on a missing row did nothing, while a PATCH on a missing BP fails. Failure handling is open question 2. |
| ExistingCustomer: SELECT 1 FROM Intelisis Cte | LAN Metodos\CreditMethods.cs:2116,2208-2222 | New private ExistingCustomerAsync(bp) wrapping BusinessPartnerMethods.GetClientAsync (ZB_DATOS_CLIENTE_CDS $filter BusinessPartner, $top=1). Zero rows (message 'No se encontraron clientes') → false → return 0. Any other exception propagates → -1. | partial | GetClientAsync throws on zero rows and wraps the message (SAP BusinessPartnerMethods.cs:56-58,65-67). The same gate is used by order/new (SAP OrderMethods.cs:768-781). Do not reuse CheckClientCreditAsync, which swallows all errors (RB §23.5 B2). |
| GetIdRef: MAX(IdCodigoVerificacioneCommerce) for Cliente+IdCarrito | LAN Metodos\CreditMethods.cs:2035-2065 | CreditMethods.GetIdRefAsync (private, same class) | yes | SAP CreditMethods.cs:158-189. Built with string.Format and IdCarrito quoted. Safe on this path because the BP is checked against SAP first and IdCarrito is an int. |
| GetValidatedPhoneNumber: CteTel Movil, Telefono!='0', LEN(Lada)+LEN(Tel)=10, ValidacionTel=1, ORDER BY Fecha DESC | LAN Metodos\CreditMethods.cs:2224-2243 | New private GetValidatedPhoneNumberAsync(bp): SolicitudCreditoWebMethods.GetCteTelAsync (CteTelSet by Partner, made internal) plus a C# filter: ZtipoCte=='MOVIL' (ignore case, trimmed), Zvaltel, ZtelCte.Trim() length 10 and not '0'. Order: parseable Zfecha first (FechaSap, made internal) by Zfecha descending, nulls last, then ZfechaCap desc, then ZidcteTel desc. Returns ZtelCte.Trim(), or null. | partial | The read exists (SAP SolicitudCreditoWebMethods.cs:406-445, 593-618). No existing lookup applies LAN's rule: IsValidatedAsync is unsorted and adds a ZappOrig check (SAP OrderMethods.cs:646-651), and A_GET_TelefonoValidado picks the newest phone of any type (RB §22.4). This is the Q4 helper that the Q9 answer asks for (RB :1867). |
| InsertCodigoVerificacion: new 6-digit code, +2 min, Estatus 1 | LAN Metodos\CreditMethods.cs:2067-2100 | CreditMethods.InsertCodigoVerificacionAsync (private, same class) | yes | SAP CreditMethods.cs:191-228. Same SQL expression; returns "" on error, as LAN does. |
| GetSmsStatus: TOP 1 EstatusEnvio WHERE Cliente AND IdMensaje=23 ORDER BY Id DESC | LAN Metodos\CreditMethods.cs:2264-2279 | New private GetSmsStatusAsync(cliente), same SQL and parameterized, on obtenerConexionAndroidAsync | no | Keyed by customer across all carts, as in LAN. |
| GetVerificationCode: SELECT Codigo WHERE Cliente AND IdCarrito (no ORDER BY) | LAN Metodos\CreditMethods.cs:2281-2297 | New private GetVerificationCodeAsync(cliente, idCarrito), same SQL | no | All rows of one cart share a single code (a new code is created only when idRef=="0"), so the missing ORDER BY does no harm. |
| Resend: INSERT VTASD with the SAME code, +2 min, Estatus 1 | LAN Metodos\CreditMethods.cs:2140-2162 | New private InsertCodigoReenvioAsync(cliente, codigo, idCarrito), same SQL; exceptions propagate to -1 | no | @IdCarrito is passed as the same string LAN passes; the column type has NO EVIDENCE. |
| InsertSendingSms: EnvioMensajes row, IdMensaje 23, 'DM0363', Telefono = validated phone | LAN Metodos\CreditMethods.cs:2245-2262 | New private InsertSendingSmsAsync(idRef, cliente, telefono), the LAN SQL verbatim and parameterized | partial | SendSmsNewNumberAsync has the same columns, but with a variable IdMensaje and string.Format (SAP CreditMethods.cs:134-147). Do not reuse it. |
| Decision tree and return codes 3/0/-1, INFO log, outer 'err' | LAN Metodos\CreditMethods.cs:21-48,2102-2189 | New public static GetSmsAsync(NipRequest) (orchestrator named after the route, per SKILL rule 28) and private VTASCodigoSMSEcommerceAsync with the same branches | no | Logging goes to Logger.SAP with the tags '[CREDIT GetSms INFO] ' (BP + result only) and '[CREDIT VTASCodigoSMSEcommerce ERROR] '. Never log the code or the phone. |
| validateSms: SP SPVTASCodigoSeguridadeCommerce @Op='CODIGO' (returns 5/6) | LAN Metodos\CreditMethods.cs:50-92; SPS\SPVTASCodigoSeguridadeCommerce.sql:18-22,143-161 | New public static ValidateSmsAsync(ClaveRequest): the CODIGO SELECT inlined on obtenerConexionAndroidAsync with @Cliente VarChar(15), @IdCarrito Int, @CodigoWeb VarChar(35), CommandTimeout 60 | no | Inlined per the project rule that SPs become C# (RB §9, :490-494). The parameter sizes copy the SP's silent truncation. Same database, so the same collation. Never call the SP's NIP branch; it touches ERPMAVI (SPS :34-61). |
| DMZ routes getSms/validateSms to LAN | DMZ Controllers\CreditController.cs:76,107 | curl.PostSAP, as SendSmsNewNumber already does (:308) | no | Flip only at cutover (see open question 1). |
| Order side reads the SMS phone (ObtenerNumeroTablaSms / @TelefonoAValidar) | LAN Metodos\OrderMethods.cs:827-829; SPS\SP_CREDITO_WEB_DATOS.sql:204-208 | OrderMethods.ObtenerNumeroTablaSmsAsync and SolicitudCreditoWebMethods.ObtenerTelefonoAValidarAsync | yes | SAP OrderMethods.cs:589-613,1804; SAP SolicitudCreditoWebMethods.cs:333-370. No change: the port writes what they read. |
| Attempt limits and resend timer | MAG Mavi\CreditoCheckout\view\frontend\web\js\credito-checkout-functions.js:213,252; CreditoManagement.php:451-453 | Stay in Magento; nothing on the server side | yes | LAN parity: no server-side counting. |
| Credit new-phone SMS (SendSmsNewNumber, IdMensaje 23/60) | LAN Metodos\CreditMethods.cs:1991-2033 | CreditMethods.SendSmsNewNumberAsync | yes | SAP CreditMethods.cs:117-156; the DMZ already uses PostSAP (:308). It writes Cliente as received, and validateSms must match that same key. |
| Checkout phone gate GetPhoneValidatedClientSecretName (adjacent, not getSms) | LAN Controllers\CreditController.cs:541-545; LAN Metodos\CreditMethods.cs:1783-1989 | None | no | The DMZ still sends it to LAN (DMZ CreditController.cs:289-299). Magento disables the checkout button unless is_client_valid && is_phone_validated (MAG ...omnipro_pago_credito-method.js:448). See open question 1. |

## 4. Files to change

- SAP Controllers\CreditController.cs: add [HttpPost][Route("getSms")] public async Task<IHttpActionResult> GetSms(NipRequest nip) and [HttpPost][Route("validateSms")] ValidateSms(ClaveRequest clave). Each does: if null → throw new HttpResponseException(HttpStatusCode.BadRequest); try { response = await CreditMethods.GetSmsAsync(nip) / ValidateSmsAsync(clave); } catch → throw new HttpResponseException(HttpStatusCode.InternalServerError); return Ok(response). This is the LAN controller shape (LAN Controllers\CreditController.cs:24-66) in the existing style of :16-24. Add using System.Net. No business logic in the controller (SKILL rule 17).
- SAP Models\SAP\Credit\SmsNipModels.cs (NEW): NipRequest {Cuenta, IdCarritoCliente, Cliente} and ClaveRequest {Cuenta, ClaveSms, IdCarritoCliente}, all strings, namespace ServicioSap.Models.SAP.Credit. No nipCliente: LAN has none, and Web API ignores unknown fields. Json.NET binds names case-insensitively (verified in E-01_SendSmsNewNumber.md:162). No name collision exists in ServicioSAP Models.
- SAP ServicioSap.csproj: add <Compile Include="Models\SAP\Credit\SmsNipModels.cs" /> next to :373-374 (SKILL rule 19). Without it the file does not compile.
- SAP Methods\Credit\CreditMethods.cs: add public static async Task<string> GetSmsAsync(NipRequest nip). It does: int idCarrito = int.Parse(nip.IdCarritoCliente); int idMagento = int.Parse(nip.Cliente); both outside any try, so a failure gives a 500. Then try { r = await VTASCodigoSMSEcommerceAsync(nip.Cuenta, idCarrito.ToString(), idMagento); Logger.SAP("[CREDIT GetSms INFO] ", cuenta + " " + r); return r.ToString(); } catch { return "err"; }.
- SAP Methods\Credit\CreditMethods.cs: add private static async Task<int> VTASCodigoSMSEcommerceAsync(cuenta, idCarrito, idMagento), a single try where any exception does Logger.SAP("[CREDIT VTASCodigoSMSEcommerce ERROR] ", cuenta + " " + e.Message) and returns -1. Steps:
(1) if (!await ExistingCustomerAsync(cuenta)) return 0;
(2) if (idMagento > 0) await new BusinessPartnerMethods().LinkMagentoAccountAsync(new UnirCuentaRequest{partner_id=cuenta, id_magento=idMagento}); on failure → -1, per open question 2;
(3) idRef = await GetIdRefAsync(cuenta, idCarrito, helper); tel = await GetValidatedPhoneNumberAsync(cuenta);
(4)-(5) then the exact LAN branches of LAN CreditMethods.cs:2121-2182: idRef=="0" → InsertCodigoVerificacionAsync, then InsertSendingSmsAsync when a phone exists → 3. Otherwise GetIdRefAsync again and GetSmsStatusAsync: "1" → 3; "2"/"3" → GetVerificationCodeAsync + InsertCodigoReenvioAsync + GetIdRefAsync + InsertSendingSmsAsync when a phone exists → 3; empty status with a phone → InsertSendingSmsAsync → 3; everything else → 0.
Keep the LAN quirk that an empty idRef (GetIdRef error) takes the else branch. Reuse GetIdRefAsync and InsertCodigoVerificacionAsync unchanged (:158-228).
- SAP Methods\Credit\CreditMethods.cs: add private helpers. Each uses its own `using (var c = await new conexionSQL().obtenerConexionAndroidAsync())`; that connection is already open, so do not call Open() (SKILL rule 4). All are parameterized, with LAN's SQL text verbatim, and every exception propagates.
- GetSmsStatusAsync: LAN :2269.
- GetVerificationCodeAsync: LAN :2286.
- InsertCodigoReenvioAsync: LAN :2147-2148.
- InsertSendingSmsAsync: LAN :2250-2251, with @IdRef as the idRef string, as LAN's AddWithValue passes it.
- SAP Methods\Credit\CreditMethods.cs: add private static async Task<bool> ExistingCustomerAsync(bp): try { var p = await new BusinessPartnerMethods().GetClientAsync(bp); return p != null && !string.IsNullOrEmpty(p.BusinessPartner); } catch (Exception e) when (e.Message.EndsWith("No se encontraron clientes")) { return false; }. Any other exception propagates, giving -1 as LAN does on a SQL error.
- SAP Methods\Credit\CreditMethods.cs: add private static async Task<string> GetValidatedPhoneNumberAsync(bp). It calls new SolicitudCreditoWebMethods().GetCteTelAsync(bp), keeps phones with Zvaltel == true, ZtipoCte trimmed equal to 'MOVIL' ignoring case, and ZtelCte trimmed of length 10 and not '0'. It orders by FechaSap(Zfecha).HasValue desc, then FechaSap(Zfecha) desc, then ZfechaCap desc, then ZidcteTel desc, and returns FirstOrDefault()?.ZtelCte.Trim(). This matches LAN CreditMethods.cs:2229-2233, with SQL Server's DESC placing NULLs last.
- SAP Methods\Credit\CreditMethods.cs: add public static async Task<string> ValidateSmsAsync(ClaveRequest c). It does: int idCarrito = int.Parse(c.IdCarritoCliente), outside the try. If c.Cuenta or c.ClaveSms is null → return "err". Otherwise try: SELECT TOP 1 IdCodigoVerificacioneCommerce FROM VTASDCodigoVerificacioneCommerce WITH (NOLOCK) WHERE Cliente = @Cliente AND IdCarrito = @IdCarrito AND Codigo = @CodigoWeb, with @Cliente SqlDbType.VarChar Size 15, @IdCarrito SqlDbType.Int, @CodigoWeb SqlDbType.VarChar Size 35 and CommandTimeout 60. A non-null result > 0 → "5", otherwise "6". catch → Logger.SAP("[CREDIT ValidateSms ERROR] ", e.Message) and return "err".
- SAP Methods\Credit\SolicitudCreditoWebMethods.cs: change visibility only, no logic change. GetCteTelAsync (:406) goes from private to internal, and FechaSap (:593) from private static to internal static, so the phone rule reuses them instead of copying them (SKILL rule 28). This file carries uncommitted work by the user, so touch only those two keywords.
- DMZ Controllers\CreditController.cs:76 and :107: curl.Post(...) → curl.PostSAP(...). Nothing else changes. Apply only at the cutover agreed in open question 1.
- No change: SAP Web.config and DMZ Web.config (no new key; the three SAP services are already built by the existing methods through obtenerUrl), BusinessPartnerMethods.cs, OrderMethods.cs, and every Magento file.

## 5. Open questions for the user

1. Scope and cutover date. With a BP account, LAN's GetPhoneValidatedClientSecretName (DMZ still routes it to LAN, DMZ CreditController.cs:289-299) cannot find the customer in Intelisis. Magento then keeps the checkout button disabled (MAG ...omnipro_pago_credito-method.js:448), and the Magento JS still accepts only /C\d{8}/ (:292, :404). So the ported getSms/validateSms cannot be reached from Magento until (a) Magento sends BPs and (b) that gate is ported. Recommendation: port GetPhoneValidatedClientSecretName next, as a separate spec using the same phone helper. Flip DMZ :76, :107 and that route to PostSAP in the same release that switches Magento to BPs. Until then leave the DMZ on curl.Post, because flipping earlier makes every 'C...' customer get 'Número de cuenta inválida'.
2. What to do when the ZidMagento PATCH fails (the Cte.IDMagento equivalent). LAN parity: any failure returns -1, so logged-in customers get 'error de conexión' and no SMS (LAN CreditMethods.cs:2111-2114, 2184-2188). LinkMagentoAccountAsync has never been seen to run (no '[SAP ZidMagento PATCH' tag in SAP Logs\sap.log), and whether the technical user is authorized on ZSDT_CTE_ODATA_SRV is unknown. Recommendation: keep LAN parity, but prove the PATCH once on test BP 1500007539 before the DMZ switch. If you prefer resilience, the alternative is log-and-continue: a small deviation that matters only on failure.
3. Go-ahead for the tests that write. A positive getSms queues a row that the dispatcher sends as a REAL SMS to the BP's validated mobile, and it adds 2 rows to ServicioAndroid, which LAN shares (SAP Web.config:13; RB §18.4). With cliente > 0 it also PATCHes the SAP BP. Recommendation: approve only for the agreed test BP 1500007539 (E-01_SendSmsNewNumber.md:204), and only after you confirm its validated MOVIL phone belongs to the team and paste the column widths from the DDL query in the testing section.

## 6. Risks

- The dispatcher SpAAea00030_ArmadoSMS is not on the share; it is only named at SPS\SPVTASCodigoSeguridadeCommerce.sql:83. No BP-keyed row has ever gone through it: on 6 Aug all EnvioMensajes rows were 'C' accounts (E-01_SendSmsNewNumber.md:202). If it joins Cliente to Intelisis Cte or CteTel, a BP row is never sent and EstatusEnvio stays 1. Every later getSms would then return 3 without queuing anything (the LAN :2136-2139 branch), and the customer never receives a code. The first positive test is the proof.
- Widths of Cliente/Telefono/IdCarrito in the two SMS tables: NO EVIDENCE from DDL. The only source is a document claim that Cliente is varchar(10) (E-01_SendSmsNewNumber.md:200), which leaves zero margin for a 10-digit BP. The SP parameter is varchar(15) (SPS :18). The RB §22.3 DDL covered only CRED_SOLICITUD_WEB_DATOS_TEMP.
- ExistingCustomerAsync relies on the message text 'No se encontraron clientes' (SAP BusinessPartnerMethods.cs:58,67). If someone changes that text, an unknown BP becomes -1 ('error de conexión') instead of 0. Whether SAP answers a 'C...' value with 0 rows or an error is an E2E item.
- ZtelCte as equivalent of LAN's Lada+Telefono, and the wire format of Zfecha from CteTelSet (FechaSap handles /Date(ms)/ and parseable strings; anything else sorts last), are E2E items per SKILL rule 29. They are not established by reading. The same goes for System.Text.Json binding of Zvaltel if SAP returns null.
- The order side is still inconsistent with the phone that getSms texts (pending Q4, RB :1862 and :1932). @TelefonoValidado comes from A_GET_TelefonoValidado, which picks the newest phone of any type (RB §22.4). IsValidatedAsync is unsorted and adds a ZappOrig check (SAP OrderMethods.cs:646-651). So ValidacionTelefono can come out as 1 even when the SMS went to the validated mobile.
- LAN defects kept on purpose because the user asked for 'same as LAN':
- no expiry check (FechaExpira is never read);
- no server-side attempt limit;
- the code is reusable after success;
- 6-digit codes come from CHECKSUM(NEWID()), which is not cryptographic;
- the Magento REST routes are anonymous (MAG Omnipro\MaviCredito\etc\webapi.xml) and the 3-try limit is client-side only;
- 'no validated phone' returns 0 and shows 'Número de cuenta inválida';
- Magento's non-throwing default case (CreditoManagement.php:330) turns unknown DMZ messages into success.
- Carts in flight at the switch have codes keyed by 'C...'. They will not match the BP key, so those customers must press resend. No data migration is proposed.
- Validation through JoinAccount: IdCarrito = customer_id + the last 4 digits of the timestamp (MAG Mavi\JoinAccount\Model\Api\JoinAccountManagement.php:205). This overflows int.Parse for customer_id >= 214749 and returns 500, which JoinAccount reads as false. It behaves the same as LAN and is kept.
- Reused GetIdRefAsync builds its SQL with string.Format (SAP CreditMethods.cs:165-167). It is safe in getSms only because the BP is checked against SAP first and IdCarrito is an int, so do not call it from validateSms. SendSmsNewNumberAsync's INSERT is still built with string.Format (:137-141), which is out of scope.
- The DMZ logs the whole validateSms request, SMS code included, in clear (DMZ CreditController.cs:102). This is existing behaviour and unchanged.
- BusinessPartnerMethods.cs and SolicitudCreditoWebMethods.cs have uncommitted work by others (memory note of 2026-09-25). The spec limits edits there to two visibility keywords.
- Local DMZ → ServicioSAP tests may fail on certificates. TrustedHosts compares the bare host with DOMINIO_LAN/DOMINIO_SAP values that hold full URLs (DMZ Helper\Curl.cs:29-33,50; E-01_SendSmsNewNumber.md:234-242).

## 7. Testing

Constraints. The project has no usable fakes; the Fakes folders are stale (memory note). Agents do not build, run SQL or call endpoints. The user builds with the VS18 MSBuild, with OutDir redirected off the share. Magento cannot be used end to end until it sends BPs, because its JS regex only accepts C accounts (MAG ...omnipro_pago_credito-method.js:292,404). Testing is therefore done directly against ServicioSAP with a JWT from login/auth, then through a local DMZ switched to PostSAP.

What writes where:
- getSms may INSERT one VTASDCodigoVerificacioneCommerce row, for a new code or a resend copy.
- getSms may INSERT one TcAAEA00030_EnvioMensajes row with EstatusEnvio 1. The dispatcher then sends a REAL SMS to that phone.
- When cliente > 0, getSms PATCHes ZidMagento on the SAP BP (mandante 110).
- getSms reads SAP with a GET on ZB_DATOS_CLIENTE_CDS and a GET on CteTelSet.
- validateSms only runs a SELECT.
ServicioAndroid is the same database LAN uses (SAP Web.config:13; LAN Conn\Connection.cs:28), so a written row is live.

How to avoid texting customers:
- Use only the agreed test BP 1500007539 (E-01_SendSmsNewNumber.md:204).
- Before any write, read its phones through ServicioSAP GET partner/client/ma/{BP} (to_CteTel) and confirm with the user that the phone the LAN rule would pick belongs to the team.
- Run the no-write cases first.

Order of tests:
(0) Read-only; the user runs these and pastes the output.
 - SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME IN ('VTASDCodigoVerificacioneCommerce','TcAAEA00030_EnvioMensajes') ORDER BY TABLE_NAME, ORDINAL_POSITION;
 - SELECT GETDATE(), (SELECT MAX(Id) FROM TcAAEA00030_EnvioMensajes); this is the E-01 check against a stale copy of the database (E-01_SendSmsNewNumber.md:187-193).
(1) validateSms with no writes, against an existing row (e.g. one left by the E-01 tests; the user reads its Cliente, IdCarrito and Codigo with a SELECT). Right code → "5", wrong code → "6", a non-numeric idCarritoCliente → 500, null body → 400.
(2) getSms with no writes. An unknown BP (e.g. 0000000000) and a 'C...' account → "0", with no rows and no PATCH (existence is checked first). Send cliente "0" in all first runs so the PATCH is skipped.
(3) With the user's go-ahead: getSms with BP 1500007539, cliente "0" and a fresh idCarritoCliente. Expect "3", one VTASD row and one EnvioMensajes row (Cliente = BP, IdRegistro = the new Id, IdMensaje 23, DM0363, a 10-digit Telefono), and one SMS on the team phone. That SMS proves the dispatcher accepts BP keys.
 - Call again at once → "3" and no new rows (status 1).
 - Once the user sees EstatusEnvio 2 or 3 → a new VTASD row with the SAME Codigo and a new queue row.
 - validateSms with that code → "5".
 - The user then runs the two reader queries for the BP, with the same text as SAP OrderMethods.cs:597-600 and SolicitudCreditoWebMethods.cs:341-344, and confirms the phone.
(4) With a separate go-ahead: cliente > 0 for the PATCH. Check '[SAP ZidMagento PATCH RESPONSE]' in Logs\sap.log.
(5) Local DMZ with PostSAP: check the mapping to 200 "Correcto" / 400 "Error de credenciales" / 400 empty.
Cleanup of test rows is the user's call; agents delete nothing. Record the request and exact response of every run (SKILL rule 25).

## 8. Effort

Small to medium. ServicioSAP needs about 200-250 lines: 2 controller actions, 1 new model file plus 1 csproj line, 8 private or public methods in CreditMethods, and 2 visibility keywords in SolicitudCreditoWebMethods. The DMZ needs 2 lines at cutover. That is about 1 developer day including review. Tests need the user at each step (DDL widths, confirming the test phone, go-ahead for writes). The DMZ switch and a Magento end-to-end run wait for Magento to send BPs and for GetPhoneValidatedClientSecretName to be ported.
