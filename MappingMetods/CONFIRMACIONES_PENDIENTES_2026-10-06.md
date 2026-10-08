---
tags: [migracion, sap, confirmaciones]
fecha: 2026-10-06
estado: vigente
---

# Pending confirmations - 2026-10-06

Sources: [[ESTADO_MIGRACION_TOTAL_2026-10-06]] (§2 plan, §4 risks, §5 needs, §9 sequence, §11 tests), [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] (§4 C-xx/DEC-xx/X-xx/P-xx), [[01_CustomersController]] (§1.4 board, §3.1, §5 CQ1-CQ27), [[REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05]] (§5 D-xx, §6 CX/RC-xx), [[CODIGO_BASURA_Y_DOCS_OBSOLETOS_2026-10-06]], [[PLAN_FABLE_POR_CONTROLADOR]] (rules of 2026-10-05).

## 1. How to use

- Write your answer on the empty `Answer:` line of each item (option key, "go", or the pasted result of a check). Short answers are enough.
- Each item says what it unblocks (task, Fable session or wave). Section 6 maps answers to the next Fable session.
- Section 5 collects every read-only SQL/GET in one numbered list. You run them; agents never run SQL or HTTP (memory rule). Mask names and emails when pasting.
- Already answered, not asked again: CQ1=B, CQ4=B, CQ5 idMagento, CQ6/CQ8 (d), CQ7, CQ9, CQ12=A, CQ13, CQ15, CQ20, CQ21=B (applied), TEL-1, D-14 value ("" stays), credit SP scope @Op=Insert, GetCondicionAsync, test inserts with manual delete, Gender empty -> "1", rules of 2026-10-05.
- Baseline verified 2026-10-06 (git read-only): ServicioSAP branch SpExportaEcommerce HEAD **c1cfcbc** (17:51), working tree **clean**. S1-S4, Logger.cs (CQ21 B), Partner.cs (ZfecUltPag string), SntzMethods.cs and csproj are committed. The "6214ed8 + uncommitted" premise and the "sin commit" lines of the board/ESTADO §11 are stale (see CQ26). Share `bin\ServicioSap.dll` built 16:49 (current). DMZ ConexionSAP 09cb341 has one uncommitted edit (OrdersController.cs:114, :194-198 logging commented out). DMZ Web.config:17 and :19 both point to https://localhost:44399 (local ServicioSAP). LAN share is stage-delta 68b2290; origin/Production refs exist locally in LAN (9310462) and DMZ (c352009).
- Ids with collisions were renamed: F-01 = email escape (S5); F-03 = delete test routes (GUIA:548); F-04 = literal credentials outside ServicioSAP. RC-04 = per-environment DMZ Web.config; RC-06 = blanket-redirect check before tests.
- Line numbers are from c1cfcbc and were re-read by the verifiers; Fable re-reads them before every edit.

## 2. P0 - needed now to continue the Fable plan

### 2.1 S5 (setCustomer lookup before create)

#### P-15 / T1.1-09 step 0 - BP05 (ZB_DATOS_CLIENTE) accepts `$filter` on ZidMagento and Mail (RUN_CHECK, P0)
- Question: run checks #1 and #2 against DEV ServicioSAP (DEV must run c1cfcbc or later: it carries the Partner.cs:81 ZfecUltPag fix) and paste status + body (masked). Nothing in the code filters BP05 by ZidMagento; ValidarClienteEnSapAsync already filters by Mail but was never verified; GetFilterClientsAsync does not log, so sap.log has no evidence.
- LAN: SP_eCommerceCtenuevo.sql:62-68 (Cte by Idmagento, plus eMail1 for id<=2), called from LAN Metodos/CustomerMethods.cs:16-118 via Controllers/CustomersController.cs:13-21.
- ServicioSAP: Controllers/BusinessPartnerController.cs:148-162 GetFilterClients -> Methods/BusinessPartner/BusinessPartnerMethods.cs:218-260 GetFilterClientsAsync (URL :221, deserialize :246, not-found :249 'No se encontraron clientes', wrapper :258). Partner.cs:36 `int ZidMagento`, :189 `string Mail`, :10 `BusinessPartner`. Mail already used as filter by Methods/Customer/CustomerMethods.cs:83. No BP05 capture exists in the repo (CAPTURAS:21/:41 are BP05MA to_Cte). Web.config:108 handler path="*." can 404 a route value containing a dot, so use the direct OData form for Mail.
- Example: `ZidMagento eq 999999991` -> expected 400 'Error, Ocurrio un error al intentar obtener el listado de clientes: No se encontraron clientes' (filter accepted). `ZidMagento eq 0` is unsafe without `$top`: 0 is the value of every BP never linked to Magento (BP 1500004598 in CAPTURAS:21), and GetFilterClientsAsync sends no $top.
- Failure signatures: property rejected -> 'Error SAP. StatusCode: BadRequest'; type mismatch -> 'The JSON value could not be converted to System.Int32' (ZidMagento is text in BP05: quoted form needed and Partner.cs:36 must change; ask before touching it); no match -> 'No se encontraron clientes'.
- Options: GREEN = (1) or (2) accepted and Mail as-sent returns BP 1500008276 -> S5 unblocked with the form that worked; if UPPERCASE also matches, `eq` is case-insensitive and R-14 disappears; if only as-sent matches, `eq` is case-sensitive (evidence for DEC-17). | ZID_FAILS = both forms BadRequest/type error -> T1.1-03 goes to SAP/ABAP, S5 blocked, setCustomer keeps creating one BP per call. | MAIL_FAILS = ZidMagento works, Mail fails both ways -> lookup by idMagento only, CQ3 option B impossible, and ValidarClienteEnSapAsync (setCustomerList) is broken too (evidence for T1.2-03).
- Recommendation: run #1 (1), (3), (4) and #2 today; (2) only if (1) fails. Paste into the S5 prompt placeholder (§4.5).
- How to answer: checks #1, #2. Bearer from POST <<SAP>>/login/auth; SAPDirect with your Hoppscotch SAP credentials. Before any DMZ test, do check #6.
- Unblocks: T1.1-03 / S5 (package 1, wave 4a); CQ3 feasibility; DEC-17 evidence; T1.2-03; D-15.


#### DEC-01 - setCustomer: reuse the existing BP (CQ2) and guest rule (CQ3) (DECISION, P0)
- Question: (CQ2) when a BP with that ZidMagento exists: return it, update names/email too, replicate the SP update with the address wipe, or keep creating? Tie-break when several share one ZidMagento? (CQ3) do guests (idMagento 0-2) still reach setCustomer, and do they get one BP per email (LAN) or the fixed guest BP?
- LAN: SP_eCommerceCtenuevo.sql:62-68 lookup (no ORDER BY: last row read wins; id<=2 needs Idmagento AND eMail1); :175-189 (id>2) UPDATE Nombre, Personal*, address = UPPER('') and CodigoPostal=0, eMail1=UPPER(email) for every row with that id; :190-201 (id<=2) only Nombre + address WHERE cliente=@Clave; :205-206 SELECT @Clave. LAN always sends the address empty (CustomerMethods.cs:24-33, CP 0 :86-89). The order SPs call the same SP (SP_eCommerceNuevoPed.sql:301, SPVTASPedidosMagento.sql:153, from LAN OrderMethods.cs:557/:564) with @Apaterno NULL.
- ServicioSAP: BusinessPartnerController.cs:36-66 CreateClient (Build :46, Submit :47, guard :48-59, Ok(Partner.Trim()) :60), no lookup. BusinessPartnerMethods.cs:435 `Partner = ""` (always create), :397/:484 SmtpAddr uppercase (S4), :404 int.Parse accepts 0, :579 ZidMagento. BP05 returns the number in `Partner.BusinessPartner` (Partner.cs:10). Duplicate sources: OrderMethods.cs:2827 ZidMagento = info.idMagento (0 today, G04-29); unircuenta PATCH BusinessPartnerMethods.cs:779-819 (:794) writes ZidMagento onto an existing (older store) BP. Guest BP constant OrderMethods.cs:41 "1500003857" is a test BP (CODIGO_BASURA J2-24). sap.log: 3 BPs with ZidMagento 0 (2 order auto-creations, 1 setCustomer). BP01 modify would need a partial payload whose shape is not in the repo; CQ4=B keeps Street/NameCo/phone/Birthdt/Region/contact 20, so a full re-submit or address wipe destroys them.
- Example: idMagento 10555 posts setCustomer twice (profile edit). LAN: both return C0001234, second rewrites names/email and blanks the address. ServicioSAP today: two BPs. Guest: idMagento 0 with the same email twice -> LAN one Cte; ServicioSAP two BPs; a ZidMagento-only lookup would return another customer's BP.
- Options CQ2: **a** lookup `ZidMagento eq <id>`; found -> return highest BusinessPartner (ordinal after Trim; newest, sap.log numbers ascend), no update (profile edits not propagated; DIF in 1.1-R19). | **b** a + partial BP01 update of NameFirst/NameLast/NameLst2/SmtpAddr, no address wipe (needs a DEV capture of a partial BP01 and your approval of the payload first; second SAP call). | **c** literal SP update incl. address wipe (contradicts CQ4=B; never). | **d** keep creating (duplicates grow; credit/order flows reading BP05 by ZidMagento get ambiguous rows).
- Options CQ3: **A** Magento never sends id 0-2; sub-choice **A1** apply the LAN guest rule anyway if one arrives (needs Mail GREEN + F-01) / **A2** create as today without lookup. | **B** guests reach setCustomer: id>2 -> `ZidMagento eq <id>`; id<=2 -> `ZidMagento eq <id> and Mail eq '<EMAIL_UPPER>'` (needs Mail GREEN + F-01). | **C** return the fixed guest BP for id<=2, no SAP call (guest names/email never stored; constant is a test BP until SAP gives the production value, J2-24; shared constant needs a single place, SKILL 28). Never a ZidMagento-only lookup for id<=2.
- Tie-break note: if unircuenta linked an older store BP to the same idMagento, "highest" returns the newer e-commerce BP, not the linked account. No field marks the linked one; tell me if that should win (needs another rule). BP05 exposes no creation date (Zfecha4 format YYYYMMDDHHMMSS, meaning unconfirmed; InicioValidez/FinValidez undocumented).
- Recommendation: CQ2 **a** now, highest BusinessPartner; **b** as a follow-up after a DEV capture; never c. CQ3 **B** if guests reach setCustomer, else **A1**; C only if the business accepts guests without a BP and the production guest BP exists. Same rule later for order/new (F-02).
- How to answer: a/b/c/d + tie-break; A1/A2/B/C. Ask the Magento/Omnipro owner whether the setCustomer URL (admin config, CQ10) is called at guest checkout. Optional evidence: checks #4, #5.
- Unblocks: T1.1-03 / S5. With a: SetCustomerAsync = build inputs -> GetFilterClientsAsync -> found: max(BusinessPartner).Trim() -> not found ONLY on 'No se encontraron clientes': Build + Submit -> guard SBPC:48-59 moved unchanged -> Partner.Trim(); any other lookup error throws (no BP). Controller becomes one call (D3-17). R-12, G01-01.


#### F-01 - Escape/encode the email in the BP05 `$filter` (GO_AHEAD, P1; only if CQ3 = B or A1)
- Question: S5 must not touch BusinessPartnerMethods.cs:221 and must ask before writing an escape. Which pattern may it use for the Mail value?
- LAN: SP compares eMail1 as a SQL parameter; LAN sntz CustomerMethods.cs:184-191.
- ServicioSAP: Pattern 1 CustomerMethods.cs:82-83 (`Replace("'","''")` + `Uri.EscapeDataString`, approved for setCustomerList via CQ13). Pattern 2 OrderMethods.cs:2993-2996 EscapeSapFilterValue: private, no callers (CODIGO_BASURA J2-04: DELETE). Sntz (BPM:397) already strips ' & % ( ) = ? : < > " /; what survives is '#' (truncates the URL and drops `&sap-client=110&$format=json`), '+' (read as space), spaces, ';' ','. The value searched must be the same Sntz+Trim+ToUpperInvariant string the create stores.
- Example: ANA+PROMO@X.COM unencoded -> '+' becomes a space -> 'No se encontraron clientes' -> duplicate BP. Encoded: `Mail eq 'ANA%2BPROMO%40X.COM'`.
- Options: **1** inline the CustomerMethods.cs:82-83 pattern in SetCustomerAsync, value only (two identical lines in two places, same as CQ13). | **2** one shared helper in Methods\Utils used by CustomerMethods.cs:83 and SetCustomerAsync, deleting EscapeSapFilterValue (J2-04); new member, touches two files, own commit (GUIA 1.9b).
- Recommendation: 1 for S5; 2 later as hygiene (ESTADO §9 item 9) with the J2-04 deletion.
- How to answer: '1' or '2'. Not needed if CQ3 = A2 or C.
- Unblocks: id<=2 branch of SetCustomerAsync (T1.1-03 condition b).
- Answer:

#### F-02 - Scope of the S5 lookup: setCustomer only, or also order/new (G04-07) (DECISION, P2)
- Question: LAN's order flow reused/created the customer through the same SP. ServicioSAP order/new creates a new BP whenever cliente is set and cuenta is empty. Wire the lookup into order/new now?
- LAN: SP_eCommerceNuevoPed.sql:301 and SPVTASPedidosMagento.sql:153 call SP_eCommerceCtenuevo (lookup :62-68). PARIDAD G04-07 says "SP: no evidence": wrong, doc fix.
- ServicioSAP: OrderMethods.cs:2626-2640 ResolveMAPartnerAsync (cuenta -> use; cliente -> CreatePartnerNumberFromOrderAsync :2642-2657, logged '[SAP BP AUTO-CREATION]'; else guest BP :41); ZidMagento = info.idMagento :2827 (0 today). sap.log: BPs 1500007543/1500007544 auto-created with ZidMagento 0.
- Example: logged-in customer 10555 places two orders with cuenta empty: LAN one Cte; ServicioSAP two BPs with ZidMagento 0 that S5 could never find.
- Options: **A** S5 builds the lookup for setCustomer only as a callable method; order/new adopts it in wave 4b with G04-29. | **B** S5 also changes CreatePartnerNumberFromOrderAsync (crosses packages; useless until G04-29 writes a real ZidMagento).
- Recommendation: A; correct PARIDAD G04-07 (T1.0-DOC).
- How to answer: 'A' or 'B'.
- Unblocks: S5 scope; wave 4b design of G04-07/G04-29.
- Answer:

### 2.2 Email fix (setCustomerList)

#### DEC-17 (CQ14) - How ValidarClienteEnSapAsync must match the email after S4 (DECISION, P0)
- Question: S4 stores SmtpAddr = Sntz(email).Trim().ToUpperInvariant(); setCustomerList looks up `Mail eq '<as sent>'`. LAN compared under SQL collation. Which fix goes into CustomerMethods.cs:75-98? Trim is needed in every option.
- LAN: SpVTASListaNBMagento.sql:74-78, :103-107 (`eMail1 = @Correo`; eMail1 stored UPPER by SP_eCommerceCtenuevo.sql:133/:188; collation assumed CI, check #3); LAN CustomerMethods.cs:120-183 passes the email raw.
- ServicioSAP: CustomerMethods.cs:77 (IsNullOrWhiteSpace), :82 quote doubling, :83 `Mail eq` + Uri.EscapeDataString, :89 GetFilterClientsAsync, :92-97 any error -> false (and the DMZ still answers 'Correcto', DCC:74). Stored value BPM:397/:484. GetFilterClientsAsync throws 'No se encontraron clientes' on 0 rows (:247-250), so a retry must key on that message. sap.log: 6 lowercase + 2 mixed-case SmtpAddr values pre-S4, 0 uppercase; post-S4 BPs are uppercase. An email with & or ' was stored without that character, so a raw lookup misses it.
- Example: Magento sends 'Ana.Lopez@mail.com ' for a BP stored ANA.LOPEZ@MAIL.COM -> 0 rows -> no insert, DMZ 'Correcto'. LAN would insert.
- Options: **A** Trim; GET 1 `Mail eq <as sent>`; only on 'No se encontraron clientes' GET 2 `Mail eq <Sntz(email).Trim().ToUpperInvariant()>` reusing SntzMethods.Sntz (max 2 calls; covers pre-S4 raw and post-S4 normalized; migrated mixed-case still misses). | **B** accept exact match (every lowercase email stops matching S4 BPs; silent skips). | **C** Trim + single `tolower(Mail) eq '<lower>'` (only if check #2 (3) works; still needs GET 2 for Sntz-stripped characters). | **D** Trim + upper only (breaks pre-S4/migrated BPs).
- Recommendation: A, or C + GET 2 if tolower works. Own commit, separate from DEL-c (J4-07).
- How to answer: pick A/B/C/D after pasting check #2 (and #3).
- Unblocks: T1.2-03, 1.2-R10 -> EQ-R, S6 setCustomerList E2E, G01-07, R-14.


### 2.3 setCustomer exception path

#### RC-12 - What Magento receives when setCustomer throws (DECISION, P0)
- Question: CQ6 (d) covers only "BP01 answered 2xx without Partner". On an exception (idMagento invalid, BP01 HTTP error, timeout) ServicioSAP returns 400 `{"Message":"Error, ..."}`; the DMZ turns it into 200 'WebException: ... (400) Bad Request. Body: ...', so Magento may store that text as the account. LAN gave 500 -> DMZ 400 empty.
- LAN: Controllers/CustomersController.cs:13-21 (no try -> 500) -> DMZ CustomersController.cs:34-35 `BadRequest()`.
- ServicioSAP: BusinessPartnerController.cs:62-65 `BadRequest("Error, " + e.Message)` -> DMZ Helper/Curl.cs:130-139 WebException text -> DMZ CustomersController.cs:34-37 (`Contains("Internal Server Error")` -> BadRequest(), else Ok(text)).
- Example: BP01 times out -> Magento 200 'WebException: The remote server returned an error: (400) Bad Request. Body: {"Message":"Error, ..."}'.
- Options: **A** catch returns InternalServerError (+ Logger.SAP of e, safe since CQ21 B): DMZ :34 fires, Magento gets 400 empty exactly like LAN; also makes CQ5 "fail like LAN" true end to end. | **A'** catch returns `Ok("Error, " + e.Message)`, the same form as (d) and order/new: Magento gets one failure prefix, nothing starts with WebException (the B4 verifier notes CQ6 (b) "LAN-like 400" was passed over by you when you chose (d), so A' is the (d)-consistent choice). | **B** DMZ maps any 'WebException' text to 400 (DMZ owner). | **C** leave it (release risk: text stored as account).
- Recommendation: A' if you want one contract for every failure; A if you want strict LAN parity for exceptions. Never C.
- How to answer: A / A' / B / C.
- Unblocks: G01-03 / R-13; T1.1-09 test step (3); package 1 cutover (S7).


### 2.4 Before any test

#### RC-06 / RC-08 - DMZ target, binary and database sanity before every E2E (RUN_CHECK, P0)
- Question: DMZ Web.config:17 URL_INTELISIS and :19 URL_SAP both point to https://localhost:44399 (ServicioSAP IISUrl, csproj:506; LAN local is 44303, WebApiMagento.csproj:256). Intended for package-1 tests? Every DMZ route still on curl.Post (e.g. credit/GetPhoneValidatedClientSecretName, DMZ CreditController.cs:296) gets a 404 text from ServicioSAP. For each E2E: name the IIS instance, confirm `bin\ServicioSap.dll` date = expected build, a fresh sap.log line, and the real ServicioAndroid/SIGMAVI server + clock (25-day skew seen 2026-09-28). Also: the DMZ share edit commenting out setOrder logging (OrdersController.cs:114, :194-198) - intentional or a test workaround to keep?
- LAN: LAN local IIS Express 44303; LAN Web.config:20-23 toggles URL_DMZ/DOMINIO_DMZ by commented pairs.
- ServicioSAP/DMZ: DMZ Curl.cs:22-23 (Ip/IpSAP), :84 `Token = TokenSAP` (one login to ServicioSAP reused for LAN calls, so pointing URL_INTELISIS at LAN also needs LAN to accept that JWT, RC-03), :107 Post, :127 PostSAP. ESTADO §11: the 2026-10-06 credit test hit the QA IIS built from another copy and answered 500.
- Example: after S1 you call setCustomer but IIS serves the 2026-10-02 DLL and returns the whole Client JSON.
- Options: **A** intended for package 1 (customer/* fine; LAN-routed DMZ routes out of scope in this setup); you name instance/DLL date/log line per session. | **B** point URL_INTELISIS to LAN (needs the RC-03 token question and the DMZ owner).
- Recommendation: A; restore the DMZ logging lines unless the DMZ log folder has the T-01 permission problem (then fix the folder, not the code).
- How to answer: checks #6, #7. Paste hosts only (USER_* keys hold credentials).
- Unblocks: all S6 E2E, wave 5, the 2026-10-06 credit test re-run; RC-08.


### 2.5 Tests of what is written (c1cfcbc)

#### T1.1-09 - Test S1+S4: setCustomer through the DMZ (TEST_CONFIRMATION, P1)
- Question: (0) P-15 checks first. (1) POST DMZ customer/setCustomer with a new MA payload (real storeCode/idMagento) -> 200 body "15000XXXXX"; read back GET https://localhost:44399/partner/client/<<BP>>: PrimerNombre/PrimerApellido/SegundoApellido and Mail UPPERCASE without & ' : < > " / % ( ) = ?, Region JAL, FiscalRegimen "", EstadoCivil, ZidMagento; GET partner/client/ma/<<BP>> only for the contact BusinessContact.ZidcteCtoTipo = "20". (2) name "Ana (Lupe)", idMagento "1'2" -> names without ( ), ZidMagento 12. (3) idMagento "" -> ServicioSAP 400 {"Message":"Error, Input string was not in a correct format."} (Spanish text on a Spanish OS); DMZ today 200 'WebException: ...'; if RC-12 = A: DMZ 400 empty. (4) forced BP01 2xx without Partner (DEV) -> 200 "Error, <to_return Message Type E>". Record BPs in master_test_plan.md.
- LAN: SP_eCommerceCtenuevo.sql:115-118, :133 (UPPER); CustomerMethods.cs:74, :184-192; CustomersController.cs:15-21.
- ServicioSAP: BusinessPartnerController.cs:36-66 (:48-59 option d, :60); BusinessPartnerMethods.cs:394-405, :456 Marst, :484, :647 contact 20; SntzMethods.cs:14-27. Read-back model: Partner.cs:167-170, :182, :189, :259, :262, :36 (BP05MA has no SmtpAddr/NameFirst).
- Options: OK -> T1.1-01/-04/-05/-07/-08 tested. | FAIL -> paste request, response and sap.log [SAP BP REQUEST]/[SAP BP RESPONSE].
- Recommendation: (1)-(3) first; (4) only with an agreed forced error in DEV.
- How to answer: DMZ token from DMZ login/authenticate; ServicioSAP bearer from login/auth. Check #6 first.
- Unblocks: S6 setCustomer part; S5 design (same value the lookup will search).
- Answer:

#### T1.2-01 - Test S3: setCustomerList with special characters and the CQ12 branch (TEST_CONFIRMATION, P1)
- Question: (1) for a BP created BEFORE S4, send the email exactly as stored (with + or &) in POST DMZ customer/setCustomerList {list:'white'} -> DMZ 200 'Correcto' and one row in the SIGMavi white list; no [CUSTOMER ValidarClienteEnSap] line (logged only on failure, SCUM:94-95; it would show %2B/%26/%40). (2) a normal existing-BP email still inserts. (3) SIGMavi unreachable: GET getCustomerList and POST deleteCustomerList -> ServicioSAP 500 -> DMZ 400 empty; setCustomerList -> ServicioSAP 200 empty -> DMZ 'Correcto' (LAN behaviour). (4) same email in another case for the same BP: today expected NOT to insert (DEC-17 evidence).
- LAN: SpVTASListaNBMagento.sql:71-122; LAN CustomersController.cs:46-50 (set swallows), get/delete no try (500).
- ServicioSAP: CustomerMethods.cs:83, :64-69; CustomersController.cs:50-54, :57-88; DMZ CustomersController.cs:71-74, :77-79 (getCustomerList is [HttpGet] with JSON body), :89-90, :107-108. Since S4, Sntz removes & from stored emails, so an & email matches only a pre-S4 BP.
- Options: OK -> T1.2-02, T1.L-02 tested; 1.2-R9/R19 close. | FAIL -> paste DMZ response + [CUSTOMER ...] lines.
- Recommendation: a DBA counts rows in SIGMavi after each call (table names from CQ16/P-16); otherwise record responses only.
- How to answer: POST /customer/setCustomerList and /deleteCustomerList, GET /customer/getCustomerList with {name,email,idMagento,list,address}; row count `SELECT COUNT(*) FROM <lista table> WHERE Correo = '<<EMAIL>>'` on SIGMavi.
- Unblocks: S6 lists part; DEC-17 evidence.
- Answer:

#### T1.5-04 - Test CQ21 B: Logger no longer turns an error branch into 500 (TEST_CONFIRMATION, P1)
- Question: on the QA server (pool cannot create <site>\Logs): (1) POST order/new with a non-null but incomplete body (null body gives 400 before the try, OrderController.cs:20-23) -> 200 'Error, <message>' (:45-46), not 500 'Access to the path ... Logs is denied'. (2) if C:\inetpub\wwwroot\log exists, sap.log there gets the line. (3) locally <site>\Logs\sap.log still written.
- LAN: LAN CustomerMethods.cs:219-222 (error branch cannot throw).
- ServicioSAP: Helpers/Logger.cs:11-23 (server path inside try), :28-43 (local block inside try). ~102 Logger.SAP call sites. Committed in c1cfcbc.
- Options: OK -> T-01, G01-11 closed; P-09 becomes optional. | FAIL -> check the DLL date on that server first (check #6).
- Recommendation: deploy the c1cfcbc build to QA first (the earlier QA DLL came from another copy).
- How to answer: POST https://<QA ServicioSAP>/order/new; check IIS response and both log files.
- Unblocks: every error-branch E2E (order/new credit path, setCustomer failures).
- Answer:

#### T-02 - Test Partner.ZfecUltPag int? -> string (TEST_CONFIRMATION, P1)
- Question: pick a BP with a last payment date. (1) GET partner/client/{bp} -> 200 with ZfecUltPag as text (before: 400 '... could not be converted to System.Nullable`1[System.Int32]. Path: $[0].ZfecUltPag'). (2) order/new credit path with that BP no longer reports 'sin cuenta' at GetClientAsync (OrderMethods.cs:723).
- LAN: N/A (read Cte directly).
- ServicioSAP: Partner.cs:81 (string); readers GetClientAsync :28-70 via OrderMethods.cs:723/:1918, CreditMethods.cs:397, StorePickupMethods.cs:268/:344, BusinessPartnerController.cs:25 and :155 (client/filter), CustomerMethods.cs:89, ProspectoController.cs:49. Partner.cs still has 12 non-nullable int fields (lines 13, 14, 29, 36, 55, 56, 59, 60, 63, 80, 138, 139: ZantigMeses, ZantigAnios, ZantigNeg, ZidMagento, ZapoyoVtaDima, ZidCtaClDisp, ZintSolApoy, ZtotalAsign, ZcodSms, ZnumPag, ZantigMes, ZantigAnio).
- Options: OK -> T-02 closed. | FAIL -> paste `$[0].<field>`; Fable checks the remaining int fields against a raw BP05 row.
- Recommendation: keep one raw ZB_DATOS_CLIENTE JSON of a paying BP in the test plan to compare the 12 int fields.
- How to answer: check #28.
- Unblocks: order/new credit E2E; S6; CreditMethods and pickup readers.
- Answer:

#### T1.H-01 - Smoke after S2 (ConfigureAwait only) (TEST_CONFIRMATION, P2)
- Question: (1) POST DMZ customer/cashCustomerReport valid request -> same ApiResponse as before (locally the share copy CashReportMethods.cs:70-75 may fail without QA access; compare ApiResponse only, CQ22 covers QA). (2) POST ServicioSAP customer/getCuenta {"correoCuenta":"<<EMAIL_INEXISTENTE>>"} -> 200 "[]".
- LAN: CustomersController.cs:89-96, :107+.
- ServicioSAP: CashReportMethods.cs:67, MagentoAccountMethods.cs:25/:35, CustomerMethods.cs:21/:33/:52/:56/:89 (`.ConfigureAwait(false)` only, c1cfcbc diff); CuentaModels.cs:17 correoCuenta.
- Options: OK -> closed. | FAIL -> HttpContext dependency; paste the response.
- Recommendation: run with the other S6 calls.
- Unblocks: T1.H-01; T1.5-01 still needs CQ22.
- Answer:

### 2.6 Wave 0 go-ahead (code with no open decision)

#### C-01 - setOrder: SAP response without Salesdocument must be an error (GO_AHEAD, P0)
- Question: after the SAP POST, stop when to_result.Salesdocument is empty, returning Resultado="Error" with the E/A messages, instead of running the post-SAP steps.
- LAN: Controllers/OrdersController.cs:149-160 returns what the SP produced; never ran address/pickup steps for an order the SP did not create.
- ServicioSAP: OrderMethods.cs:1900-1904 (deserialize, null check only), :1906 Console 'Orden creada', :1911-1976 run GetClientAsync, RegisterPickupClientInfo, DatosEntregaInsertAsync, GenerarMonederoSAPAsync, CallSetCAccountCallbackAsync ('[SAP WEBHOOK DMZ]' :1342 reaches sap.log), CreateCodeBankTransferAsync regardless; :1979 returns with Resultado unset. OrderController.cs:28-35 maps Resultado=="Error" -> Message=Zobservaciones. Models Response.cs:67-68, ToReturnResponse.cs:7/:10/:13. SD36 duplicate guard :1763 runs only for forzarOrder=="0" or PayPal, so failing a created order would let a Magento retry duplicate it.
- Example: sap.log 2026-07-17 17:00:43 (R-01): to_return Type E and Salesdocument "" -> today SS updates the delivery address, calls the setCAccount webhook and Magento gets 200 with Resultado null (order treated as placed).
- Options: **A** after :1904, if Salesdocument empty -> Logger.SAP, Resultado="Error", Zobservaciones = joined E/A messages (or 'SAP no devolvio documento'), return, skip :1911-1976. | **A2** A plus: Salesdocument present AND an E/A row -> log with Logger.SAP and continue (order exists). | **B** throw so OrderController.cs:46 answers 200 "Error, <msg>" (loses BP/SalesDocument; pre-empts DEC-02).
- Recommendation: A (decide on Salesdocument only; LAN never reported an SP-created order as failed). Final shape stays subject to DEC-02.
- How to answer: 'C-01 A' / 'C-01 A2' / 'C-01 B'. Evidence: check #13.
- Unblocks: R-01, G04-27; prerequisite for DEC-02 and the order/new bridge.
- Answer:

#### C-02 - cancelOrder: look up ZSD_ZMER_/ZSD_ZPRE_ instead of ZSD_{tipo}_ (GO_AHEAD, P0)
- Question: replace the `ZSD_{order.tipo}_` build with SalesMethods.CheckDocumentExistsSD36ByEcommerceIdAsync (ZMER then ZPRE) in FullCancelAsync and CancelInvoiceAsync; tipo stays on the model.
- LAN: OrdersController.cs:184-250 never reads tipo; finds the order by idecommerce (OrderMethods.cs:1613); non-invoiced -> cancelamagento; invoiced -> service report (+ return only if producto[0].resolucion=="R"); always Ok("Ok") (:249).
- ServicioSAP: OrderMethods.cs:3008-3013 and :118-123 build `ZSD_{tipo}_{incrementId}`; :3016-3022 'noexiste'; :3180-3186 same in ReverseGoodsIssueAsync (no callers, DEL-b). Helper SalesMethods.cs:216-224. DMZ OrdersController.cs:282-294 posts cancelOrder, 'noexiste' -> 400; OrderRequest.cs:110 carries tipo. From this change on, tipo P and invoiced orders would be FULLY annulled (SD48 + SD46 at :3061-3101), which LAN never does.
- Example: {incrementId:"2000012345", tipo:"T"} -> SS searches ZSD_T_2000012345 -> 'noexiste' -> DMZ 400 for every cancel (D-35).
- Options: **A** use the helper when incrementId does not start with ZSD_; ignore tipo for the lookup. | **A2** A plus a temporary guard: tipo=="P" or an invoice found (GetBillingDocumentByDeliveryAsync) -> throw 'cancelacion parcial/facturada pendiente de DEC-06', annul nothing (DMZ answers 500 as today for undelivered orders). | **B** map T->ZMER, P->ZPRE (wrong: T/P mean total/partial). | **C** wait for DEC-06 (every cancel keeps failing, R-02).
- Recommendation: A2 until DEC-06(a) decides; remove the guard after.
- How to answer: 'C-02 A2' or 'C-02 A'. Check #10.
- Unblocks: R-02 / G06-01; cancelOrder bridge; wave 4c.
- Answer:

#### C-03 - Liberador callback keys must match the DMZ model (GO_AHEAD, P0)
- Question: rename the payload at OrderMethods.cs:1258-1263 to `new { entityId, status, cuenta, idSolicitud }`.
- LAN: Metodos/OrderMethods.cs:1803 same keys.
- ServicioSAP: :1258-1263 sends entity_id/status/customer_account/credit_request_id to URL_DMZ+'order/authorizationResult' (:1203-1205); DMZ OrdersController.cs:421-445 binds CreditAuthorizationRequest (CreditRequest.cs:212-218). Only callers (:686, :696) sit inside the commented liberador block :673-707.
- Example: SS posts {"entity_id":"812","status":"RECHAZADO",...}; DMZ binds only status; Magento gets entityId null.
- Options: **A** rename (zero risk). | **B** leave (every future callback lost, R-23).
- Recommendation: A.
- How to answer: 'C-03 go'.
- Unblocks: T1a / CX-17 / R-23; credit callback E2E once DU11 exists.
- Answer:

#### C-04 - New route credit/GetPhoneValidatedClientSecretName with the interim rule (GO_AHEAD, P0)
- Question: add POST credit/GetPhoneValidatedClientSecretName {Cliente, Uen} returning LAN's 6 keys: is_client_valid = BP exists and To_Cte.ZtipoCliente != "Prospecto" (interim, DEC-07 B), secret_name = HideNames over PrimerNombre+SegundoNombre, PrimerApellido, SegundoApellido (LAN uses PersonalNombres = all given names), current_validated_phone unmasked, is_phone_validated = phone non-empty (D-48 C), phone_validated masked like HidePhoneNumber (phones shorter than 4 returned as-is, no throw), is_first_purchase = false. A BP lookup error -> is_client_valid=false and empty strings; a GetTelefonoValidadoAsync error -> phone "" (LAN :1870-1873, :1908-1912): always 200 with the 6 keys. DMZ switch (CreditController.cs:296) stays in wave 4d.
- LAN: CreditMethods.cs:1783-1806 keys; NombreCliente :1808-1878 (FNVTASValidarEmpleado :1817; CteEnviarA ID in (3,76)/(7), 'CREDITO MENUDEO', 'ALTA'); IsPhoneValidatedSecretPhone :1880-1913; HidePhoneNumber :1915-1920; HideNames :1922-1939; route CreditController.cs:541-545.
- ServicioSAP: CreditController.cs has 9 routes (:15-:194), none is this. Sources: GetClientMaAsync :266 -> ZtipoCliente (EsProspecto SolicitudCreditoWebMethods.cs:534-548, const :548); Partner.cs:167-170 names via GetClientAsync :28; GetTelefonoValidadoAsync :478-520 (throws on missing URL_BP_API :487-490 or HTTP error :499-503). DMZ CreditController.cs:289-299 still curl.Post to LAN.
- Example: non-prospect BP with validated phone 33XXXX1234 -> {"is_client_valid":true,"secret_name":"J*** P**** G*****","current_validated_phone":"33XXXX1234","is_phone_validated":true,"phone_validated":"******1234","is_first_purchase":false}.
- Options: **A** code now with the interim rule; DEC-07 refines later. | **B** wait for DEC-07 (R-22: once Magento sends BPs the LAN gate rejects every BP credit order).
- Recommendation: A (ESTADO §5.1).
- How to answer: 'C-04 go' (and whether a Prospecto BP with a validated phone must still fail - interim says yes).
- Unblocks: R-22 / G10-10 / G10-22; wave 4d DMZ switch; credit E2E with BP accounts.
- Answer:

#### C-05 - ZidMagento PATCH URLs lack sap-client=110 (GO_AHEAD, P1)
- Question: in LinkMagentoAccountAsync keep `root = SERVICE_URL + "/ZSDT_CTE_ODATA_SRV/"`; CSRF from `root + "?sap-client=110"`; patchUrl = `root + $"ZSDT_CTE_ENTITYSet(ZclienteBp='{partner_id}')?sap-client=110"` (never append the entity to a URL that already has a query).
- LAN: CreditController.cs:25-44 getSms -> CreditMethods.cs:21-31 writes @IdMagento via VTASCodigoSMSEcommerce (no client concept).
- ServicioSAP: BusinessPartnerMethods.cs:786-787 (no sap-client; CSRF fetch :790); every other call carries it (:77-78, :221, :271, :355). Callers: CreditMethods.cs:328 in GetSmsAsync (:290, route credit/getSms CreditController.cs:46-64) and PATCH partner/client/unircuenta (BusinessPartnerController.cs:89-108).
- Example: getSms {Cuenta:"0001234567", IdCarritoCliente:"4521", Cliente:"318"} -> PATCH without sap-client; if the gateway default is not 110 the Magento id is never linked (R-27, NIP-1).
- Options: **A** add sap-client as above. | **B** leave (works only while the default client is 110).
- Recommendation: A.
- How to answer: 'C-05 go'. Check #11.
- Unblocks: R-27 / G10-02 / NIP-1; unircuenta; getSms E2E.
- Answer:

#### C-06 - LoginClienteCreditoFechaN regex drops the minus sign of pre-1970 dates (GO_AHEAD, P1)
- Question: change CustomerServiceMethods.cs:282 regex `\d+` to `-?\d+` (pattern already in SolicitudCreditoWebMethods.FechaSap :611).
- LAN: CustomerServiceMethods.cs:1260-1293 compares CONVERT(varchar, FechaNacimiento, 23); any year works.
- ServicioSAP: CustomerServiceMethods.cs:280-292 (:282 regex, :285-286 epoch + ms); route CustomerServiceController.cs:89.
- Example: born 1965-03-10 -> Birthdt "/Date(-151891200000)/" -> sign dropped -> 1974-10-25 -> login false for everyone born before 1970 (R-28).
- Options: **A** one-token regex change. | **B** make FechaSap internal and reuse (touches two files).
- Recommendation: A.
- How to answer: 'C-06 go'; after compile, test with one BP born before 1970 (DEC-12 policy separate).
- Unblocks: R-28 / G7-19; G07 logins.
- Answer:

#### C-07 - recuperarcuenta: injectable, case-sensitive OData filter (GO_AHEAD, P1)
- Question: (1) escape the 3 names and the RFC (Replace("'","''") + Uri.EscapeDataString as CustomerMethods.cs:82-83); (2) `.Trim().ToUpperInvariant()` after QuitarAcentos on the 3 names AND rfc; (3) any empty nombre/apellidoPaterno/apellidoMaterno/fechaNacimiento/rfc -> RecuperarCuentaResult("", "Datos inválidos", 4) like LAN :92-98 (replacing "Request vacío o incompleto").
- LAN: ProspectoController.cs:92-98 empty check; :107-127 parameterized SQL (CI collation, incl. RFC); :135 EncriptarNombre.
- ServicioSAP: ProspectoController.cs:22 checks only rfc+fecha; :34-36 QuitarAcentos only; :47 raw interpolation into the ZB_DATOS_CLIENTE $filter (GetFilterClientsAsync :221); :50 FirstOrDefault; :55 masking. BP names stored UPPERCASE (CQ1=B).
- Example: nombre = "X' or RFC ne '" breaks the filter or returns the first BP (R-20); "jose" vs "JOSE" no match (G02-06).
- Options: **A** escape + normalize + empty check. | **B** escape only.
- Recommendation: A. Masking (:55) and scope stay in DEC-13/D-23.
- How to answer: 'C-07 A'. Check #12.
- Unblocks: R-20 / G02-06 / G02-07; wave 0 security item.
- Answer:

#### F-B3-05 - P1 batch C-08..C-18 (GO_AHEAD, P1)
- Question: code C-08..C-18 from PARIDAD §4.1 (one commit each; you compile), leaving the parts tied to DEC-12/DEC-16/DU20 untouched.
- LAN: each row traces to PARIDAD §4.1 (pickup status without products C-08; createStorepickupCode POST C-10; getClienteFactura filtered by cliente C-12; nombreCliente route C-17).
- ServicioSAP (spot-checked): C-08 StorePickupMethods.cs:430 `products = new object[]{}`; C-10 OrderController.cs:244-245 [HttpGet] only; C-11 OrderMethods.cs:1572-1586 RegisterPickupClientInfo console-only TODO (called :1931); C-12 AbonoMethods.cs:68 `Vbeln eq` without Partner or escaping; C-13 EcommerceMethods.cs:623-627 fail-open on missing image data; C-14 EcommerceMethods.cs:1377-1381 swallows the exception; C-18 CustomerServiceMethods.cs:237/:301 FirstOrDefault()?.smtp_addr even when empty. C-09/C-15/C-16/C-17 per PARIDAD :294-302.
- Example: getClienteFactura with cliente=0001234567 and another customer's invoice returns that customer's installments (R-16).
- Options: **A** whole batch. | **B** per id.
- Recommendation: A (defects with no open decision; C-16/C-17 are additive routes).
- How to answer: 'P1 batch go' or list ids.
- Unblocks: R-16, G14-43, G15-30/31, G04-19, G11-07/26, G15-01/06/09, G06-16, G7-12, G7-15; then C-19..C-37.
- Answer:

#### DEL-a - Neko stubs and Microsoft Fakes leftovers (GO_AHEAD, P1)
- Question: delete the credit/ApplyPaymentNeko and credit/UpdateStatusPaymentNeko stubs and the Fakes references/files.
- LAN: LAN has REAL Neko routes (customerService/ApplyPaymentNeko CustomerServiceController.cs:106, UpdateStatusPaymentNeko :128, writing CXCCFacturaMultipagoBBVA) still called by the DMZ (:164, :197). Neko is out of scope (D-41, never connect); the SS stubs under credit/ are not a port of them. Fakes have no LAN counterpart (memory: generated by accident, obsolete).
- ServicioSAP: AbonosController.cs:51-84 + AbonoMethods.cs:95-108 (return Success=true); csproj:52-54, :77-79, :456-457; folders Fakes/ and FakesAssemblies/ (+ obj/Debug/Fakes untracked). No .cs references Fakes/Shim types.
- Example: a build without VS Enterprise fails to resolve Microsoft.QualityTools.Testing.Fakes.
- Options: **A** delete all in one commit. | **B** keep until DEC-30. | **C** keep the routes returning 501 NotImplemented (J1-03).
- Recommendation: A.
- How to answer: 'DEL-a go'.
- Unblocks: wave 0 cleanup; Fakes build dependency gone.
- Answer:

#### DEL-b - Debug leftovers and dead code, incl. the PII dump C-25 (GO_AHEAD, P1)
- Question: delete the items below (zero behaviour change; lines re-read before each edit).
- LAN: no counterparts (CODIGO_BASURA J2/J3/J5/J6/J7 DELETE rows). LAN afectar (OrderMethods.cs:1540) has no SAP equivalent (COMPARATIVA D-12).
- ServicioSAP: SalesMethods.cs:200 File.WriteAllText of the SD36 response to a developer path on every obtenerCreditos (C-25); CreditMethods.cs:169 Debug.WriteLine; OrderMethods.cs:388-406 + :2568-2574 (J2-03), :1366-1379 (J2-02), :1546-1566 afectar stub (J2-01), :299-303/:419-441/:2992-2995 unused helpers (J2-04), :3177-3249 ReverseGoodsIssueAsync + comment OrderController.cs:161-165 (J2-20), :1760-1761 esDevolucion (J2-M01), :2603-2605 + tipo param (J2-M06), :2279-2316 commented SD40 block (J2-08), unused constants (J2-26); ConexionSapConfig.cs + csproj:244; GeneradorLog.cs + csproj:246 + `using ServicioSap.Helper;` TokenGenerator.cs:5; TokenGenerator.cs:29-30,173-181; ConexionSQL.cs:40-70,134-163; SQLiteDb.cs sync overloads; CatalogoMethods.cs 5 unused methods; RequestMethods.cs:39-110 incl. the process-wide accept-all certificate callback :58-59 (EnableTrustedHosts :18-38 is used and stays); StoreGlobalMethods.cs:9-46,70-83,86-112; FinalListProperMethods.cs:19-50; unused `using RestSharp;` (8 files have it; which are unused is checked at edit time); ImagenMethods.cs:7.
- Example: every customerService/obtenerCreditos call tries to write a customer's credit documents to a developer path on the server.
- Options: **A** all, one commit per file group. | **B** only the two debug lines now.
- Recommendation: A; if short of time, B first.
- How to answer: 'DEL-b go' or 'DEL-b only debug lines'.
- Unblocks: wave 0 cleanup; C-25; removes the TLS accept-all helper.
- Answer:

#### DEL-c - Duplicates, dead config keys and csproj/MVC leftovers, incl. J4-07 SAP_BP_CAMPO_EMAIL (GO_AHEAD, P2)
- Question: remove duplicate methods, dead config keys and csproj/MVC leftovers. J1-14/J1-15/J7-24 touch Global.asax, packages and references (one compile + a smoke start).
- LAN: one implementation of each; no Fakes/MVC-SPA packages; Nini only at Conn\Connection.cs:2. J1-04: neither LAN nor the DMZ has an account/bonus route (no consumer, J1-21).
- ServicioSAP: AccountController.cs:13-43 account/bonus vs bonus/async + AccountMethods.cs:40-89 vs 91-144 (keep GetBonusAsync); ProductMethods.cs:1316-1345; WalletCustomerMethods.cs:17-60; ImagenMethods.cs:69-83; WalletMethods.cs:19 AWS fallback (AwsBaseUrl defined at Web.config:27); **J4-07** CustomerMethods.cs:79-80 AppSettings["SAP_BP_CAMPO_EMAIL"] (0 hits in every *.config; `using System.Configuration` :2 used only there) -> `const string campo = "Mail"` (Partner.cs:189); Web.config:34 SAP_STAGE never read; Web.config:22-25 + Global.asax.cs:6-7,16 MVC; csproj :165-205,:485 + packages.config MVC/SPA; :469-474 Folder items; :80-83 + :450 Nini + Helpers/ConexionDB/Nini.dll.
- Options: **A** everything, compile and start once. | **B** duplicates + config keys now (incl. J4-07); csproj/MVC/Nini in a later commit.
- Recommendation: B. J4-07 may go alone in its own commit before or with DEC-17 (same file, separate commits).
- How to answer: 'DEL-c A' or 'DEL-c B'; for J1-04 'keep bonus/async, delete bonus' unless you know a consumer of account/bonus.
- Unblocks: wave 0 cleanup; J1-18/J4-07; doc fixes D1-23, D3-28.
- Answer:

#### DEL-d - Commented blocks and dead models (GO_AHEAD, P2)
- Question: delete the commented pipeline remains and dead model files with their csproj Compile lines (csproj lines re-read: it gained a line in c1cfcbc).
- LAN: scaffold mirrors of SP_eCommerceexportaMA temp tables; nothing maps to them (J5-02, J8-M4, J8-01..05, J8-07, J8-10, J8-11, J8-13, J8-14, J8-15).
- ServicioSAP: EcommerceMethods.cs:1281, :1288, :1328-1375, :1379-1380 (the swallowed exception :1377-1381 is C-14, untouched); ResultadoProcesoEcommerce.cs:12-33, 37-46; Models/Database ExistenciaAlmacen, PrecioArticulo, TempEcommerceItemExport, TempItemList (+csproj 284/287/289/290); Models/Ecommerce/EcommerceExportaArt.cs + Models/Database/ProductoExport.cs (310/288); Models/Ecommerce/ArticuloIEMay.cs (294) and wrap Models/Database/ArticuloIEMay.cs in namespace ServicioSap.Models.Database (callers in EcommerceMethods need the using); 16 scaffold files in Models/Ecommerce; ArticuloPromocion.cs, SuperPromo.cs (298/333); CouponModels.cs (396); Models/SAP/Invoice 3 files (384-386); Models/Equivalence/OrderRequest.cs (334); AddressModels.cs:15-29, 41-47, 85-88; WalletCustomer.cs:57-73; OData wrappers lines 6-21 in ArticuloCrossSell/ArticuloUpsell/ArticuloSustitutos.
- Example: two classes named ArticuloIEMay (live one in the global namespace).
- Options: **A** delete all, compile once. | **B** defer to DEC-30.
- Recommendation: A.
- How to answer: 'DEL-d go'.
- Unblocks: wave 0 cleanup; clean FASE 14 (configurables) port.
- Answer:

#### F-03 - Delete partner/testnew and order/testnew (GUIA:548) (DECISION, P1)
- Question: partner/testnew posts the raw request body to BP01; order/testnew posts an unvalidated Order model to ZAPI_SALESORDER_SRV (its own comment OrderController.cs:52-53 says DEBE SER ELIMINADO). Both need only a valid token. Delete both now in one cleanup commit?
- LAN: no equivalent routes.
- ServicioSAP: BusinessPartnerController.cs:131-146 (:135 ReadAsStringAsync) + BusinessPartnerMethods.cs:127-166 (sap-client=110 :129); OrderController.cs:50-70 + OrderMethods.cs:1592-1621. Referenced by the Hoppscotch collections, PLAN_BP05_EXPOSICION_DATOS.md:91/:99 and both Manual Tecnico files.
- Example: any token holder can POST an arbitrary BPartnerSet payload to BP01.
- Options: **A** delete both now; update Hoppscotch, both manuals and PLAN_BP05 (closes J1-01, J1-02, J2-19, J4-02, J7-05, J7-M1; raw tests move to Hoppscotch against SAP directly). | **B** keep until go-live. | **C** keep partner/testnew with an environment guard.
- Recommendation: A.
- How to answer: A / B / C.
- Unblocks: wave 0 cleanup; release checklist (ESTADO §1); D5-M06.
- Answer:

## 3. P1 - decision session

#### DEC-02 - setOrder response contract (DECISION, P0 for wave 4b)
- Question: Production chain was LAN bare string -> Production DMZ mapped it: 200 '<C account>' only on success, 400 'Incorrecto' (PrecioIncorrecto), 409 (PedidoExistente), 422 (sin cuenta), 500 (empty, exception text, anything else). Today ServicioSAP returns {BP, SalesDocument, Message, Resultado} (Resultado null on success and on SAP 2xx with Type E; 'Error' only on the stock gate; 'PedidoExistente'; 200 'Error, ...' on exception) and the ConexionSAP DMZ returns everything as 200. Which contract is final?
- LAN: OrdersController.cs:149-160; OrderMethods.cs:649, :732; DMZ origin/Production OrdersController.cs setOrder mapping block (StartsWith("C") check).
- ServicioSAP: OrderController.cs:26-47; OrderMethods.cs:1769, :1783, :1977-1980 (success returns Resultado unset); DMZ ConexionSAP OrdersController.cs:131-178 (mapping commented), :196, :214-227.
- Example: SAP 2xx with a Type E message: SS 200 {BP, SalesDocument:<PurchNoS>, Message:<E text>, Resultado:null}; DMZ 200; Magento marks it synced. Production DMZ would have answered 500 and Magento retried. Price below the floor: LAN 'PrecioIncorrecto' -> 400; SS raises the price and books it.
- Options: **A** keep the object (Magento must read BP/Resultado; failures stay 200). | **B** DMZ restores the Production mapping driven by Resultado + numeric BP (what Magento already handles; zero Magento change). | **C** SS returns LAN's bare string with the BP (still needs B). | **D** Magento reads Resultado (Magento owner).
- Recommendation: B + C-01, and set Resultado='Concluido' on success. Confirm with the Magento owner only whether 409/422 are still handled.
- How to answer: A/B/C(+D). Check #17.
- Unblocks: wave 4b (order/new contract); §6.2; cash E2E of wave 5.
- Answer:

#### DEC-03 - Openpay cards parked in SQLite; Paynet without cuenta (DECISION, P0 for wave 4b)
- Question: (1) openpay_cards orders are saved to SQLite and nothing reads them: port LAN's CheckStatus job with a `liberado` flag (a), Openpay webhook (b), or keep openpay_cards on LAN (c)? (2) openpay_stores guest orders throw 'VIU contado requiere cuenta' after the SQLite write; LAN accepted empty cuenta. Resolve like banktransfer?
- LAN: OpenpayMethods.cs:70-82 CheckStatus, :169-206 CheckStoresStatus (also cancels unpaid Paynet: cancelamagento + setOrderStatus canceled_intelisis); OrderMethods.cs:429-432, :533 SetPedido(order, liberado=false), :545-556.
- ServicioSAP: OrderMethods.cs:1777-1786 (early exit 'ABORTANDO FLUJO SAP'), :1788-1792, :2619-2624 ResolveVIUPartner throws; DMZ ConexionSAP OrdersController.cs:196 sends every method to order/new (so (c) is a DMZ code change).
- Example: card order 1000054321 paid in Openpay stays 'processing' forever. An unpaid Paynet order stays open in SAP; LAN cancelled it.
- Options: **a** port the job incl. the Paynet expiry/cancel leg (needs P-06 keys + scheduler). | **b** webhook (Openpay/Magento owner). | **c** DMZ sends openpay_cards to LAN order/setOrder, everything else to order/new. | **paynet** guest BP / create from cliente like banktransfer.
- Recommendation: (c) now, then (a). Paynet: yes.
- How to answer: c/a/b + yes/no. Then ask Infra/Javier for RECHAZAOPENPAY and per-store keys (P-06) before (a).
- Unblocks: wave 4b Openpay part; routing safety item.
- Answer:

#### DEC-04 - Booked price vs SD29 floor, stock gate, region rewrite (DECISION, P0 for wave 4b)
- Question: three ServicioSAP-only rules on cash orders: (1) price raised to the first SD29 properlist row for the SKU (any org/condition), precioEspecial ignored; (2) DIM11 stock gate (or any exception in it) answers 200 'Error'; (3) phone SKUs -R5/-R6 rewritten with the FIRST LETTER OF THE STATE NAME (sDatosPedido[20] is estado per ToArray :265-272; the 'DirCP' comment is wrong), producing SKUs such as -RJ. Keep, remove or change each?
- LAN: OrderMethods.cs:362-400 books precioEspecial when != '0' and forces the order; :557-565; no stock check; no region rewrite.
- ServicioSAP: :1833 ValidarPreciosConProperlistAsync, :1996-2050 (FirstOrDefault :2015, compare :2033-2041), FinalListProperMethods.cs:82-85 (`Articulo eq` only; org+condition overload :87 unused); :1836-1840 + :2057-2110 stock gate (catch :2104-2109); :1829 estado, :1843 + :2117-2181 region; :2451/:2458 book art.precio; precioEspecial only at :2523 (ZMN+) and :2554 (Zkbetr2).
- Example: payload 12000048887: precio 9299, precioEspecial 6990. LAN books 6990; SS books 9299. XXX-R5 shipped to Jalisco becomes XXX-RJ.
- Options: price **A** LAN parity (book precioEspecial, no floor) / **B** keep floor, fix row selection / **C** reject below floor ('PrecioIncorrecto'); stock **A** keep / **B** remove, log only; region **A** remove / **B** derive from postal code (index 17) with the TELEFONIA rule (X-23) / **C** defer.
- Recommendation: price A, stock B, region A.
- How to answer: one key per rule. Check #15.
- Unblocks: wave 4b; R-06, R-08, R-09.
- Answer:

#### DEC-05 - Payment term for cash orders (DECISION, P1)
- Question: SS takes `articulos[].condicion` for every method; an unknown condicion silently becomes ACEF and with no condicion Pmnttrms goes empty. LAN read condicion only in the credit branch and sent @Pagos = cuotas for cash. Cash orders always on the cash term, and how do cuotas > 1 (MSI) map? (GetCondicionAsync itself is accepted; only the cash scope is asked.)
- LAN: OrderMethods.cs:632 (credit branch only), :1220-1223.
- ServicioSAP: OrderMethods.cs:2253 (paymentTerms = order.pmnttrms ?? ""), :2256-2277, :3356-3389 + Helpers/PaymentConditionCatalog.cs:122-138 ('ACEF' fallback, no exception); :39 PaymentTermsContado unused, :40 "12IA".
- Example: banktransfer, article condicion '12 M VIU PP', cuotas 1 -> SS sends the 12-month credit term; LAN sent @Pagos=1.
- Options: **A** cash methods always use the cash ZTERM; cuotas > 1 -> MSI term named by SAP SD (X-04). | **B** keep. | **C** condicion only when cash-type (needs a flag per condition).
- Recommendation: A, cash code confirmed by SAP SD.
- How to answer: A/B/C. Check #14.
- Unblocks: wave 4b; R-07.
- Answer:

#### DEC-06 - Cancel and return policy (DECISION, P0 for wave 4c)
- Question: (a) invoiced cancel: LAN cancelled non-invoiced orders (cancelamagento) and never annulled invoiced ones; SS annuls SD48 + SD46. Never / always / only tipo T? (b) 'noexiste' stays DMZ 400 after C-02, with a rule for pre-cutover orders? (c) return org/channel/plant from the SD36 original (Magento sends no store)? (d) keep original Pmnttrms, reason as text? (e) per-item 'R' filter vs LAN first-item gate? (f) RMA id in a Z text? (g) does SAP still need the per-unit service report?
- LAN: OrdersController.cs:200-241 (:200-203 cancelamagento; 'R' gate :215), :252-310 (store defaults '1' :256-258); ServiceOrderMethods.cs:76-96, :362-417.
- ServicioSAP: OrderMethods.cs:3008-3012, :3047/:3058 (ZIDSTATUS=03 missing), :3061-3101 (SD48+SD46), :2191 storeId null, :2205 condicion = motivoDevolucion, :2236 -> :366-369 'No lleva id de tienda'; DMZ OrdersController.cs:282, :291-292, :317 (setreturn returns Ok even on 'WebException').
- Example: RMA with a sofa (R) and a chair (C): LAN returns both; SS throws, DMZ 200 'WebException', Magento marks the RMA synced.
- Options: a1 never / a2 always / a3 only tipo T, return flow for P (needs X-03); b keep 400 + transition rule; c yes/no; d yes/no; e per-item / first-item; f yes/no; g ask after-sales.
- Recommendation: a3; b keep; c yes; d yes; e per-item; f yes; g ask.
- How to answer: a key per letter; ask after-sales (g) and SAP SD (X-03).
- Unblocks: wave 4c; R-02, R-03, R-04.
- Answer:

#### DEC-07 - Credit checkout gate eligibility, final rule (DECISION, P1)
- Question: which SAP fields carry LAN's rules (employee exclusion, CteEnviarA 'CREDITO MENUDEO', Estatus 'ALTA', first purchase)? Interim rule = C-04.
- LAN: CreditMethods.cs:1783-1807, :1812-1828, :1831-1838, :1941-1965; DMZ CreditController.cs:296 to LAN.
- ServicioSAP: no route; candidates Partner.cs:82 ZtipoCliente, :233 GrupoClientes, :253 CanalDistribucion_P, :264 BloqueoCentral.
- Example: an employee BP opens credit checkout: LAN false; interim B true.
- Options: **A** SAP/credit area confirm the fields, full port. | **B** interim is_client_valid = BP exists and not Prospecto. | **C** drop the rule (needs credit-area sign-off). | **first** is_first_purchase=false always.
- Recommendation: A with B interim; first=false; never drop the employee exclusion without sign-off.
- How to answer: confirm B now; for A ask SAP/ABAP + credit area. Check #16.
- Unblocks: C-04 final rule; wave 4d switch; R-22.
- Answer:

#### DEC-09 - GetAccountDebts contract, already bridged (DECISION, P0 for wave 0 routing safety)
- Question: the DMZ already sends GetAccountDebts to SS, which returns raw EX01 rows. Magento passes the debts back to ApplyPaymentAdvanced, still routed to LAN (DMZ CustomerServiceController.cs:181), where `int.Parse(debt["CanalVenta"])` (CustomerServiceMethods.cs:935) fails on an EX01 row. Rebuild LAN's shape (A), change Magento (B), or point the DMZ back to LAN now (C)?
- LAN: CustomerServiceController.cs:98-103 (route customerService/GetAccountDebts); CustomerServiceMethods.cs:776-791, :785-790 (exception -> 200 with the unformatted list), :793-852, :915-964.
- ServicioSAP: AbonosController.cs:18-32; AbonoMethods.cs:19-51 (EX01 `Kunnr eq`, no UEN, no Contable='1' exclusion); DMZ :146 PostSAP('credit/GetAccountDebts').
- Options: **A** SS builds LAN's shape (UEN via Vkorg/Vtweg -> CanalVenta map P-10, exclude Contable='1'; needs X-06/X-07). | **B** Magento adapts. | **C** DMZ :146 back to `curl.Post("customerService/GetAccountDebts", ...)` exactly as origin/Production CustomerServiceController.cs:124-132.
- Recommendation: C now, then A.
- How to answer: C-now yes/no + A/B.
- Unblocks: wave 0 routing safety; wave 4e; R-15.
- Answer:

#### DEC-10 - getClienteFactura contract (every call ends in DMZ 500) (DECISION, P0 for wave 0 routing safety)
- Question: SS returns a list of TZ01 zsplits and ignores cliente; DMZ JObject.Parse on the array -> 500. LAN returned one SaldoFactura or 'No tiene facturas' / 'El cliente es incorrecto'. SS builds LAN's object (needs N4-N6) or the DMZ adapts; and revert DMZ :51 meanwhile?
- LAN: CreditController.cs:22 regex `^C[0-9]{8}$` (rejects BPs: cannot be copied), :68-95 ([HttpGet]); FacturaMethods.cs:106-217.
- ServicioSAP: AbonosController.cs:34-47; AbonoMethods.cs:54-93; DMZ CreditController.cs:51 PostSAP, :58 JObject.Parse.
- Options: **A** SS builds the object; validates the SAP BP format; SP-level failures -> 'No tiene facturas', connection errors -> 500 (needs X-07 and C-12). | **B** DMZ adapts. | **interim** revert DMZ :51 to `curl.Get("credit/getClienteFactura/" + cliente + "/" + factura)` (Production code).
- Recommendation: A with the interim revert now.
- How to answer: A/B + yes/no interim.
- Unblocks: wave 0 routing safety; wave 4e; R-16.
- Answer:

#### DEC-11 / D-28 - Wallet details by uen, redeem minimum, and the capture kit (DECISION + EXTERNAL_REQUEST, P1)
- Question: wallet/details ignores uen, takes the first SD18 contract and returns CustOwner as titular; getMinimumCostToRedeem uses a first-matching-row fallback, `+=` onto the request value, and swallows AWS errors (minimum 0). Decide: filter SD18 by Vkorg mapped from uen (1->04, 2->05); titular from BP05 names; 'no wallet' message instead of 'None'; no SP_MAVIDM0173 generate side effect; port the per-family algorithm; fail closed. Will you run the capture kit (SD18 set for a BP with MA and VIU wallets, BP05 ZserieMon/ZserieMonViu, DM01 04/05/81, the 3 AWS catalogs) and ask SAP SD for X-09 and the AWS owner for P-11?
- LAN: WalletCustomerMethods.cs:18-58, :61-120 (GetSerieMonedero by uen :61-65; SP :101), :305-325, :460-471; :160-472 tablarangostd.
- ServicioSAP: WalletCustomerController.cs:33-35 (`wallets.First()`, CustOwner); WalletCustomerMethods.cs:28/:65 `Reference eq`; WalletMethods.cs:77-79 catalogs, :131-151 fallback, :193-231 `+=`, :234-237 catch console only; DMZ WalletCustomerController.cs:38, :81 PostSAP.
- Example: shoes 600 + sofa 800: LAN minimum 600, SS 1400; AWS down: everything redeemable.
- Options: details as listed (yes/no per line); redeem **A** per-family, fail closed / **B** keep; interim **B'** revert both DMZ bridges to LAN until captured.
- Recommendation: details yes; redeem A; B' as interim.
- How to answer: confirm each line; check #18; Fable prepares the GET list for the kit.
- Unblocks: wave 4e; package 4 spec; R-18, R-19; C-23/C-31.
- Answer:

#### DEC-12 - Login and validarCliente policies (DECISION, P1)
- Question: (a) which BP05MA field equals Cte.eMail1 (today first to_CtePersonalAdr smtp_addr); (b) false only on not-found, 500 otherwise (GetClientMaAsync has no not-found signal); (c) empty input -> Ok(false) instead of 400; (d) DU13 name join; (e) numeric id compare, ZidMagento 0 = unlinked; (f) exact date compare after C-06.
- LAN: CustomerServiceMethods.cs:255-311, :1214-1255, :1257-1293.
- ServicioSAP: CustomerServiceMethods.cs:195-220 (:204 compare, :215 catch), :223-250 (:237), :255-318 (:282); CustomerServiceController.cs:51, :72, :93; BPM:266-307; DMZ :77, :218, :229.
- Example: SAP times out during LoginClienteCredito: LAN 500 ('error de conexión'); SS 200 false ('account does not exist').
- Options: a after E2E capture; b yes/no; c yes/no; d yes/no; e yes/no; f yes/no.
- Recommendation: a after E2E; b-f yes.
- How to answer: confirm each letter; check #19.
- Unblocks: wave 4e; R-28.
- Answer:

#### DEC-13 / D-23 - recuperarcuenta and prospecto/rfc: scope and rules (DECISION, P1)
- Question: are /V1/prospecto/rfc and /V1/prospecto/recuperarcuenta Credilana-app routes (ticket 10226; out of scope under SKILL rule 15) or used by the web store? If kept: 5 required fields, filter by RFC + birth date with names compared in C#, LAN masking (first and last letter kept) instead of ocultarLetrasNombres, RFC annexes I-III from the SAP code-master (X-22).
- LAN: ProspectoController.cs:19 rfc, :78 recuperarcuenta, :86-98, :103-146, :154-169 EncriptarNombre.
- ServicioSAP: ProspectoController.cs:19 recuperarcuenta only; :22-25; :47 (C-07); :55 ocultarLetrasNombres (CustomerServiceMethods.cs:174-193); partner/ConsultaAnexos returned only Anexo IV. DMZ ProspectoController.cs:23 rfc -> LAN, :42 PostSAP.
- Example: 'JUAN DE LA CRUZ' -> LAN 'J**N DE LA C**Z', SS 'J*** D* L* C***'. D-25: crash on empty second surname.
- Options: **A** out of scope: stay on LAN, DMZ :42 back to curl.Post. | **B** in scope: spec 02 with D-24/D-25/X-22 and the four rules. | **C** keep recuperarcuenta, rfc on LAN.
- Recommendation: ask the ticket 10226 owner first; C-07 is coded regardless.
- How to answer: A/B/C (+ confirm the four rules if B/C); X-19 logs confirm callers.
- Unblocks: package 2; D-24, D-25, X-22; recuperarcuenta release.
- Answer:

#### DEC-14 - Owner of the catalog import, price and stock jobs (DECISION, P1)
- Question: LAN ProductsController.updateProduct runs one chained import against api\data.db; SS has catalog/cargaCompleta etc. with no caller writing sap\data.db; exportaart returns JSON only (no last-export state: discontinued SKUs omitted instead of product_online=2/qty 0). Who owns the jobs?
- LAN: ProductsController.cs:17-60+; DB.cs:17.
- ServicioSAP: CatalogController.cs:12-33; SQLiteDb; EcommerceMethods.cs (G15-38).
- Example: SKU discontinued in SAP: LAN sends product_online=2; SS omits it and Magento keeps selling.
- Options: **A** import tool calls SS routes, shared data.db, one owner (X-08, P-07/P-12). | **B** separate schedulers. | **C** keep LAN until Sprint 9 (4-18 Dec), then A.
- Recommendation: C then A; also decide exportaart delta persistence (G15-38), the MySQL/IntelisisTmp attribute leg, price/warranty push.
- How to answer: A/B/C with Dev 2 and the importer team (X-08).
- Unblocks: wave 4f; R-33, R-35; packages 10/11.
- Answer:

#### DEC-15 - LAN reference branch for the catalog port (DECISION, P1)
- Question: origin/Production (local ref 9310462) pages productWithWebsites /{page}/500/0 (Conn/Magento.cs:341), children /500/ (:270) and a per-SKU pass /0/0/{sku} (:379); SS copies stage-delta /1000 (MagentoCatalogMethods.cs:325, :286). Production DMZ exposes only productWithWebsites/{page}/{size}/{sku} (MagentoController.cs:69); ConexionSAP only {page}/{size} (:70). Take Production as the reference?
- LAN: share stage-delta Conn/Magento.cs:329-353 ('/1000', no null guard).
- ServicioSAP: MagentoCatalogMethods.cs:325, :286, :177-203 (no per-set try).
- Example: against the Production DMZ, cargaCompleta calls productWithWebsites/1/1000 -> 404 -> product_in_stores empty.
- Options: **A** Production is the reference; null guards + per-set try now; per-SKU pass after DEC-14; DMZ release keeps both templates. | **B** DMZ exposes both templates only. | **C** keep stage-delta.
- Recommendation: A + B, own commit.
- How to answer: A/B/C with Diego (E-22). Optional refresh: check #20.
- Unblocks: package 11; DMZ release; parity claims for 10/11.
- Answer:

#### DEC-16 - Pickup code routes: keep/retire, contract, contact data, notification (DECISION, P1)
- Question: createStorepickupCode / generateNewStorepickupCode are not bridged in the DMZ (caller unknown). If kept: LAN contract (POST create -> 'ok'; GET regenerate -> bare code) vs SS JSON {estado, clave}; SS regenerate sends its own SMTP mail; create overwrites Nombre/Correo/Telefono and posts setOrderStatus with products [] (C-08). Decide: retire after IIS logs; LAN contract; update only ClaveVenta; notify via Magento sendStorePickupEmail; delivery phone with BP fallback; accept the 'not store pickup' guard.
- LAN: OrdersController.cs:371-373 [HttpPost] create -> Ok("ok"), :393-395 [HttpGet] regenerate -> code; CodigoRecogerSucursal.cs:87-110, :349-364, :521-533.
- ServicioSAP: OrderController.cs:224-262 (both GET, JSON); StorePickupMethods.cs:172-245 (SMTP :241), :331-447 (UPDATE :401-402; products [] :430; sendStorePickupEmail :438); CreateCodeBankTransferAsync :249-330 SMTP at :313; DMZ GetPickUpCode :253 (curl.Post :262).
- Example: regenerate for order 38515: LAN updates ClaveVenta and Magento sends its template; SS sends its own SMTP mail (or nothing if SD36 has no org); create overwrites the phone with ''.
- Options: **retire** after X-19 / **keep-LAN** contract + ClaveVenta-only + Magento notification + phone fallback / **keep-SS**.
- Recommendation: decide after X-19; if kept, keep-LAN.
- How to answer: pick one + confirm the four sub-rules.
- Unblocks: package 7d; DEC-30; order of C-08/C-09/C-10.
- Answer:

#### DEC-18 - storeCode map and the 'mavi' store (CQ5 remainder) (DECISION, P1)
- Question: LAN fails on anything not exactly muebles_america/viu/mavi (case-sensitive, '' included). SS: substring test `IndexOf("viu", OrdinalIgnoreCase)` or "2" -> 05 (so viu, VIU, viuu, VIUX, tienda_viu -> 05); "muebles_america", "1" or "" -> 04; anything else incl. mavi -> 04 (else :421-425). Which rule, is 'mavi' (UEN 3) alive, and which SAP org? Was storeCode "" in the CQ10 payload real or anonymized (idMagento was also "" there and now fails by CQ5)?
- LAN: CustomerMethods.cs:41-50 (exact -> uen 1/2/3), :93 int.Parse(uen) -> 500 -> DMZ 400 empty.
- ServicioSAP: BusinessPartnerMethods.cs:407-425.
- Example: storeCode "mavi" -> MA (04) BP; "viuu" fails in LAN, 05 in SS.
- Options: **A** case-insensitive map of the 3 codes; unknown non-empty fails through the catch (Magento then gets whatever RC-12 decides); '' -> 04 until Magento confirms. | **B** keep (accepted DIF). | **C** strict LAN ('' fails too).
- Recommendation: A; retire 'mavi' from the map if the store is gone, else name its Vkorg (no org for UEN 3 today). Ask Magento (X-15) what storeCode values it sends.
- How to answer: A/B/C + mavi status/org.
- Unblocks: T1.1-07 remainder, 1.1-R4, G01-02, single org resolver.
- Answer:

#### DEC-24 - LAN inbound setOrderStatus after cutover (DECISION, P1)
- Question: LAN order/setOrderStatus relays every status (ship, ship_carrier, store_pickup_complete, canceled_intelisis) to Magento and creates the wholesale purchase. SS has only OrderStatusMethods.SetOrderStatusAsync with no caller. Who sends statuses after cutover?
- LAN: OrdersController.cs:310-344 (:311 route, :338 relay); Provider.cs:25-256 (:112-113 reads eCommerceDetPedidos).
- ServicioSAP: OrderStatusMethods.cs:16-45 (no callers); DMZ OrdersController.cs:325-332 (setOrderStatus straight to Magento).
- Example: a credit order is delivered: Intelisis -> LAN -> Magento 'ship'. After cutover nothing fires; order stays 'processing'.
- Options: **A** SS route fired by SAP (needs a trigger + owner). | **B** separate SAP-to-Magento status sync package. | **C** deprecate.
- Recommendation: B after X-19; reconfirm the eCommerceDetPedidos retirement.
- How to answer: A/B/C; X-19 logs filtered on 'order/setOrderStatus'.
- Unblocks: package 7d; DEC-30; LAN switch-off plan.
- Answer:

#### CQ24 - getCuenta/setCuenta when the DMZ hop fails (DECISION, P1)
- Question (plain): LAN Curl.Post wraps the HTTP call in try/catch and returns e.Message as a string on ANY failure, so the caller gets HTTP 200 with text (only a failed login in the constructor gives 500). SS Curl.PostAsync retries 3 times (30 s each, 2 s + 4 s waits; token cached 20 min, Curl.cs:17-20; each attempt resends once on 401, :133-140) then throws; the controller has no try/catch -> 500 after ~96 s or more, and setCuenta may be sent up to 6 times. Which behaviour?
- LAN: Helper/Curl.cs:25-39, :79-110; Conn/Magento.cs:309-327; CustomersController.cs:89-105.
- ServicioSAP: Helpers/ConexionDMZ/Curl.cs:48, :95, :118-159 (throw :159); MagentoAccountMethods.cs:21-38; CustomersController.cs:92-108 (no try; no global exception filter).
- Example: Magento takes 40 s: LAN 200 with data; SS 3 timeouts -> 500; setCuenta writes customer_credit_account repeatedly and still answers 500.
- Options: **A** accept 500 after retries (document E-11/E-12). | **B1** `new Curl(maxRetries: 1)` + try/catch returning ex.Message (200). | **B2** change shared Curl to separate login failure from POST failure (touches 3 other Methods; approval). | **A+** A for getCuenta; setCuenta `new Curl(120, 1)` (one attempt, 120 s).
- Recommendation: A+ (no known consumer, CQ23/X-19; the triple write is the only real risk).
- How to answer: A/B1/B2/A+.
- Unblocks: T1.C-01; T1.6-01 case 8; T1.7-01; E-11/E-12 notes.
- Answer:

#### CQ26 - CSV convention for LAN-only rows and the doc correction list (DECISION, P2)
- Question: (1) MAVI - DMZ-SAP.csv rows 116/117 (getCuenta/setCuenta: 'N/A (MAGENTO)', Conectado=Si) and 119/132: 'N/A' (your definition: no DMZ route) or 'Si'? (2) approve the correction list of 01 §2.1 (rows 32-36, 116, 117; row 36 still 'To Do' although DMZ CustomersController.cs:120 calls cashCustomerReport) and §2.3/§3.10 (E-02/E-03/E-04/E-11/E-12/E-13, AUD C24 refuted, EP:364/:395, CML:143, manual :3473-3478, Hoppscotch setCuenta URL), plus: 01 §1.4 and ESTADO §11 "sin commit/uncommitted" -> "committed in c1cfcbc (2026-10-06)", old text struck through; PARIDAD G04-07 LAN column (F-02).
- Options: **A** N/A for every LAN-only row + full list. | **B** 'Si' + only 116/117 route column.
- Recommendation: A (previous text struck through per SKILL 23, no BOM, CRLF).
- How to answer: A/B + 'approve list' or lines to exclude.
- Unblocks: T1.0-DOC; D1-23, D3-28, D2-20, D5-M06.
- Answer:

#### CQ17 - Production data of the black/white lists in SIGMavi (DECISION, P1)
- Question: (1) do the DBAs load VTASCListaNegra/Blanca production rows into SIGMavi in the same window as the SS -> DMZ deploy? (2) the Intelisis report that reads the lists (ODS:71): re-pointed, replaced or synced? (3) close GUIA_MIGRACION_FABLE.md:547 with SIGMavi?
- LAN: lists in IntelisisTmp (SpVTASListaNBMagento.sql:81-120). ServicioSAP: CustomerMethods.cs:33 writes SIGMavi; DEVMAVI tables intentionally empty (DEV3:495).
- Example: deploy without the load: a blacklisted email passes as 'No esta en listas'.
- Options: **A** load in the same window; report re-pointed; close GUIA:547. | **B** deploy first, load later (window with empty lists).
- Recommendation: A (release prerequisite T1.L-04).
- How to answer: (1) yes/no + owner, (2) re-point/replace/sync, (3) yes/no.
- Unblocks: T1.L-04; GUIA:547; S7 checklist.
- Answer:

#### CQ19 - Accept blackwhitelistAsync(tipo) as a literal LAN port (GO_AHEAD, P2)
- LAN: CustomerMethods.cs:120-183. ServicioSAP: CustomerMethods.cs:16-72, called from CustomersController.cs:46, :64, :72, :86.
- Options: **A** accept (note in the guide). | **B** split into 3 methods (no parity gain, 4 call sites).
- Recommendation: A.
- How to answer: 'accept' or 'split'. Unblocks: closes the CQ19 note in 01 §5.
- Answer:

#### D-08 - Route ownership table: Fable vs Dev 2/3/4 (DECISION, P1)
- Question: approve one table per route: Fable = parity fixes on routes already in SS + C-04; Dev 2 keeps its Gantt routes (prospecto, wholesale, getMinimumCostToRedeem, negotiable-quote, getRecommender) unless reassigned; Dev 3's M-xx/E-xx in packages 1, 7, 8, 9 reconciled (M-06/M-11 at 0% although coded); Dev 4 owns payments.
- Risk of double edits: ProspectoController.cs, WalletMethods.cs (C09), CreditController.cs (E-45), the credit gate.
- Options: **A** one table; Fable = parity + C-04. | **B** developers keep everything; Fable only package 1. | **C** Fable takes over (conflicts with Gantts).
- Recommendation: A; tell Dev 3 now about D-50 and E-44.
- How to answer: yes/no + exceptions; Fable writes the table into PLAN_FABLE_POR_CONTROLADOR.
- Unblocks: sessions for packages 2-4, 7-9; C-04 owner.
- Answer:

#### RC-01 / CQ27 - DMZ release branch, first-release scope, who edits the DMZ, who deploys (DECISION, P1)
- Question: with the DMZ owner: (1) release branch: merge origin/Production into one integration branch, keep both productWithWebsites templates, gate on a route-set diff (share clone ConexionSAP 09cb341, last fetched 2026-09-17, 97d6aea absent, Production not an ancestor: 89 commits); (2) first-release scope: per-route LAN/SAP switch in Web.config, or only parity-verified bridges; never the credit branch before T1b; (3) Fable writes DMZ switch diffs for the owner (A) or edits the integration branch on the share without committing (B). (CQ27) who merges and deploys each repo and when: ServicioSAP (c1cfcbc) first, then the DMZ; the uncommitted DMZ OrdersController.cs edit must not ride along unreviewed.
- Facts: DMZ origin/Production c352009 sends every route to LAN and has routes ConexionSAP lacks (credit/GetPlazosCteC, order/getIntelisisStatusesCredit, productWithWebsites/{page}/{size}/{sku}). ConexionSAP holds 26 bridges; 8 do not match LAN (cancelOrder, getClienteFactura, setCustomer, GetAccountDebts, wallet/details, getMinimumCostToRedeem, recuperarcuenta, GetCreditAmounts) and setOrder differs.
- Example: releasing ConexionSAP as is: every cancel answers 400, credit orders sit pending, LAN Production's productWithWebsites calls get 404.
- Options: **A** integration branch + per-route switch + Fable writes diffs, owner applies. | **B** ship only parity-verified bridges, revert the rest to curl.Post. | **C** release as is.
- Recommendation: A; ServicioSAP first, then DMZ, one window.
- How to answer: decide with the DMZ owner (they run `git fetch` on the share clone and report where 97d6aea lives); name who deploys + target window.
- Unblocks: every DMZ switch reaching Stage/PROD; wave 6; T1.0-DEP; S7.
- Answer:

#### RC-03 - JWT key, issuer and audience equal in LAN, ServicioSAP and DMZ per environment (DECISION, P1)
- Question: the DMZ logs in only to ServicioSAP (Curl.cs: LAN login commented, `Token = TokenSAP`, constructor rethrows) and reuses that token for LAN calls. Confirm the three keys are identical per environment and that nobody splits them before option B exists.
- LAN: TokenValidationHandler.cs:46 (Web.config:15-18). ServicioSAP: TokenValidationHandler.cs:47-49, TokenGenerator.cs:34-36 (Web.config:31-33).
- Example: Stage gets a new SS key: ~63 LAN-routed DMZ routes answer 401. SS down: mercancias/* answers 500.
- Options: **A** one key per environment until LAN is off; you verify equality. | **B** lazy separate logins before any split (DMZ owner). | **C** split now (immediate 401s).
- Recommendation: A now, B before any split, never C.
- How to answer: check #31 (you compare; never paste values).
- Unblocks: DMZ release availability; APP mercancías.
- Answer:

#### P-02 - SQLite data.db per environment (DECISION, P1)
- Question: point SQLITE_DB_PATH at LAN's api\data.db while both run on the same host, or give SS its own sap\data.db provisioned with LAN's schema and the pre-cutover rows (servicio_guias, openpay_orders/stores, product_in_stores, attributes, attribute_sets, attribute_options, categories, children, atributos_de_magento, mavi_credilana_info)?
- LAN: Conn/DB.cs:17, OrderMethods.cs:737/:758 (api\data.db); commented DDL of servicio_guias at Metodos/OrderMethods.cs:17-23 (reusable); Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs:780/:835 mavi_credilana_info.
- ServicioSAP: SQLiteDb.cs:16-21 (SQLITE_DB_PATH, Web.config:59, fallback sap\); OrderMethods.cs:482, :543/:562; CredilanaMethods.cs:17 (nothing fills it, R-17); no CREATE for servicio_guias (G06-12).
- Example: guide created by LAN on 2026-12-01 for idecommerce 38515: after cutover order/getGuide answers 500.
- Options: **A** own sap\data.db + schema script + copy at cutover. | **C** point at api\ while both run on one host (SQLite locking acceptable).
- Recommendation: C while co-hosted, A at switch-off. GetCreditAmounts stays on LAN (DEC-21 A) unless someone owns mavi_credilana_info (P-03).
- How to answer: check #22 + say whether LAN and SS share the host.
- Unblocks: G06-12, G13-15/P-07, DEC-03, wave 6 data loads.
- Answer:

## 4. P2 - other teams, data/config, packages 2-14 scope

#### X-01 - Liberador contract DU11 (EXTERNAL_REQUEST, P0)
- Question: send the liberador team DU11 (Q-T1-1..8): does it accept a 10-digit BP as `cliente` (not a C account; or is it the Magento customer id?), auth, idempotent resend, which idVenta it returns, which tables it reads, PurchNoC of the credit document.
- LAN: LiberadorCreditoMethods.cs:17-18; Web.config:37-40. ServicioSAP: LiberadorCreditoMethods.cs:43-45 (Web.config:40-42); trigger OrderMethods.cs:674-706 commented, `await` inside a Thread lambda and passes `idClienteMagento` (:676), a variable that no longer exists (cuentaBp at :638 is what DEC-08 recommends); callback :1258-1263 snake_case (C-03).
- Example: credit order for BP 1500007539 creates solicitud 12345 but nothing calls the liberador; Magento never gets authorizationResult.
- Options: **A** send now (Fable drafts; you send); credit branch stays on LAN meanwhile (RC-02 C). | **B** wait.
- Recommendation: A.
- Unblocks: wave 4d (DEC-08, C-03 integration, G05-01/G05-21); package 7c.
- Answer:

#### X-02 - ZIdEcommerce OData DU20 (SAP SD) (EXTERNAL_REQUEST, P0)
- Question: status of the OData that updates ZSDT_VBAK.ZIdEcommerce (requested 2026-09-18): service, entity, keys, and whether PurchNoC/Zidecomm can be rewritten from one value to another (LAN replaces the credit increment id with the final one), not only filled when empty.
- LAN: OrdersController.cs:507 -> OrderMethods.cs:1998-2047 (UPDATE Venta.IdEcommerce old -> new, eCommerceDetPedidos.IdPedido). ServicioSAP: no route; DMZ OrdersController.cs:405-411 curl.Post to LAN.
- Options: **A** SAP SD delivers; Fable builds order/updateCreditOrderId. | **B** write at creation only (unlinked credit orders).
- Recommendation: A; ask for an RSG fiche or a sample PATCH.
- Unblocks: package 7c (T2b/T2c-A/T2d); G05-23.
- Answer:

#### X-03 - SAP SD annulment API and paid/unpaid state (EXTERNAL_REQUEST, P0)
- Question: (1) annulment API for orders not yet affected (ZIDSTATUS=03) and its definition; (2) delete delivery / reject order on full cancel; (3) read paid vs unpaid for Paynet expiry and PayPal posting.
- LAN: OrdersController.cs:186 cancelOrder, :22 ManagePaynetOrders. ServicioSAP: OrderMethods.cs:3038-3058 throws 'ZIDSTATUS=03 aun no esta implementada' (DMZ 500); no ManagePaynetOrders route (DMZ :27 to LAN).
- Options: **A** request now with an RSG fiche each. | **B** keep cancel/return on LAN until the API exists (DMZ curl.Post interim).
- Recommendation: A plus B interim; do not ship the cancel bridge before the API exists.
- Unblocks: wave 4c (DEC-06, G06-02/03/07/08/09), Paynet R7d-2/4, G04-04/05/26.
- Answer:

#### X-05 - Source of the credit decision for creditStatus (EXTERNAL_REQUEST, P0)
- Question: where does a web credit application's result live once Intelisis is off: CRED_SOLICITUD_WEB_DATOS_TEMP.estatus, SD36 by PurchNoC, the liberador API, or ZSDT_MOVBITA (then Ztiporespuesta vocabulary and Bstkd filter)?
- LAN: OrdersController.cs:485 creditStatus -> OrderMethods.cs:1867-1996. ServicioSAP: no route; MovBitaMethods.cs:23 reads AI_GET_ZSDT_MOVBITA?Vbeln; DMZ :461-467 to LAN.
- Options: **E** MovBita with written confirmation of the vocabulary (DEC-32 E). | **C/D** SD36 or liberador after DU11.
- Recommendation: ask first; if MovBita, request one real row (Vbeln, Ztiporespuesta).
- Unblocks: DEC-32; package 7c; G05-20, G15-36.
- Answer:

#### X-06 (+X-07, P-10) - Dev 4 + ABAP/FI: BBVA/STP intents, balances, CanalVenta map (EXTERNAL_REQUEST, P0)
- Question: (1) SAP write target for BBVA/STP payment intents and the confirmation update (ZAPI_REFERENCIAS_BANCARIAS / ZFICRUD_COBREF_SRV), CLABE format; (1b) are ZAPI_CTACLBSTP_SRV and ZFICRUD_COBREF_SRV the right sources for GetSTPAccount/ValidateSTPAccount and does ZFICRUD_COBREF_SRV accept create/update? (2) N1-N6 balance sources (EX01<->TZ01 link, Zsaldo/Zmoratorio/ZcobroPp, late-interest, installment source per channel); (3) Vkorg/Vtweg -> legacy CanalVenta 3/76/77/78/7/79 (P-10).
- LAN: CustomerServiceController.cs:117-202; CustomerServiceMethods.cs:1181 switch on CanalVenta. ServicioSAP: Neko stubs (AbonosController.cs:52-82); read-only credit/GetCobrosReferenciados/{bp} (:86, AbonoMethods.cs:110-120) and credit/GetClabeSTP/{bp} (:100, :150-160) with no DMZ caller; no write, no Advanced/STP routes (DMZ :175-262 to LAN); GetAccountDebts :146 PostSAP raw EX01 (R-15).
- Options: **A** send now and point DMZ GetAccountDebts back to LAN meanwhile (DEC-09 C). | **B** wait for Dev 4's schedule.
- Recommendation: A.
- Unblocks: packages 8b and 9 (DEC-09, DEC-10, N1-N6); G08-02/11/14/16/20, G11-02/03/09/10/27.
- Answer:

#### X-08 - Dev 2 Sprint 9 / importer: catalog, price and stock jobs (EXTERNAL_REQUEST, P1)
- Question: confirm the product, configurable, price, stock, availability jobs and VIU/MAVI exports are replaced in Sprint 9 (4-18 Dec) and who triggers SS catalog/* once LAN is off.
- LAN: ProductsController.cs:18-215; DB.cs:17. ServicioSAP: CatalogController.cs:13-187 (no caller); ProductController.cs:22; MagentoCatalogMethods.cs:325. E-19/E-21/E-22 failed 2026-09-15, not re-tested.
- Options: **C** LAN until Sprint 9, then the import tool calls cargaCompleta (A). | **B** separate scheduled job on the SS host.
- Recommendation: C then A, one named owner; re-test E-19/E-21/E-22 first.
- Unblocks: DEC-14/15; packages 10/11; G14-27/29..36, G15-10.
- Answer:

#### X-19 (+CQ23, CQ18) - Infra: 30 days of IIS logs and Task Scheduler list (EXTERNAL_REQUEST, P1)
- Question: ask infra for 30 days of LAN IIS logs (with client IP and user-agent) and `schtasks /query /fo LIST /v` on the LAN host, filtered on: order/createStorepickupCode, generateNewStorepickupCode, getOrderInfoAndSet, checkOpenpay, order/setOrderStatus, customer/getCuenta, customer/setCuenta (CQ23), login/authenticate, product/obtenerImagen, status/getStatus, prospecto/*; and on the DMZ host GET /customer/getCustomerList, POST /customer/deleteCustomerList (CQ18).
- LAN: OrdersController.cs:372, :394, :437, :446; CustomersController.cs:90, :99; ProductsController.cs:215; StatusController.cs:11. ServicioSAP: pickup writers OrderController.cs:225/:245 (GET); no checkOpenpay/getOrderInfoAndSet/status; getCuenta/setCuenta CustomersController.cs:92-108 need login/auth instead of login/authenticate.
- Example: a scheduler calls checkOpenpay every 10 minutes; after shutdown parked card orders are never reprocessed; a backoffice job calling setCuenta on LAN breaks silently.
- Options: **A** pull now. | **B** assume unused.
- Recommendation: A; Fable drafts the route list.
- Unblocks: DEC-16, DEC-24, DEC-30/D-31, P-01/C-13, D-31, T1.C-02, DEC-31, T1.3-01/T1.4-01 priority; LAN switch-off.
- Answer:

#### X-16 - SMS operations: dispatcher accepts BP-keyed rows (EXTERNAL_REQUEST, P1)
- Question: does SpAAea00030_ArmadoSMS send rows of TcAAEA00030_EnvioMensajes whose Cliente is a 10-digit BP; column widths of Cliente/Telefono/Identificador; may Clave be NULL after the hash change?
- LAN: CreditMethods.cs:1991-2033 inserts with the C account; SPVTASCodigoSeguridadeCommerce.sql:83. ServicioSAP: CreditMethods.cs:174-212 SendSmsNewNumberAsync (insert :194-198, IdMensaje 60/23 :191); DMZ CreditController.cs:308 PostSAP; getSms/validateSms (:76/:107) still LAN.
- Example: Cliente='1500007539' truncated by a char(9) column or skipped by a join on Cte: no SMS, route answers result=1.
- Options: **A** ask now + one controlled test with the agreed test BP. | **B** switch and find out in production.
- Recommendation: A. Check #21.
- Unblocks: RC-14 (getSms/validateSms switch), SendSmsNewNumber release; CX-11, G10-03, G10-15, G12-08.
- Answer:

#### X-15 - Magento team: storeCode values, calling module, BP release date, config URL export (EXTERNAL_REQUEST, P1)
- Question: (1) storeCode values setCustomer sends per website (CQ10 sample had ""), whether the 'mavi' store (UEN 3) is live, and which module calls customer/setCustomer and reads the account (open part of CQ10). Do not re-ask idMagento (CQ5 answered). (2) release date when infoCliente.cuenta / wholesale_account / customer_credit_account carry BPs and stored C accounts are remapped. (3) export of core_config_data URLs pointing to DMZ vs LAN per environment (url_pickup_code, url_customer_wallet, url_wholesale_customer, url_recuperar_cuenta, paynet_automation_url, insert_data_url, url_estimated_delivery, cupon_promotion).
- ServicioSAP: BusinessPartnerMethods.cs:579; DMZ CustomersController.cs:30; credit gate DMZ CreditController.cs:289-299 still LAN (must switch with the BP release, C-04).
- Example: Magento releases BPs before the DMZ switches the gate: every credit checkout rejected.
- Options: **A** request now; plan the C-04 switch with the BP release. | **B** infer from IIS logs (config URLs are not in logs).
- Recommendation: A; capture masked. Check #32 (they run it).
- Unblocks: DEC-18, CQ10 module, C-04 timing, P-01, RC-09/RC-10.
- Answer:

#### X-04 (+X-09..X-13) - SAP SD/FI/ABAP grouped request (EXTERNAL_REQUEST, P1)
- Question: one request: shipping/freight condition, installments, wallet redemption and item-discount conditions plus placeholder header values for setOrder (X-04); SD18 key Reference vs CustOwner and Deact/DateTo (X-09); Zidstatus catalog, one SD36 capture with to_zsdt_vbak, DM01 04/05 codes, PurchDate format (X-10); one real SD09 return response (X-11); Zembarqueestado, carrier/guide per delivery, cancelled-orders-by-date OData (X-12); wallet-unification storage and the CONTADO/CREDITO MENUDEO BP field (X-13).
- ServicioSAP: OrderMethods.cs setOrder amounts (G04-14/16/18); WalletCustomerController.cs:17-58, WalletCustomerMethods.cs:28/:65; no ObtenerEstatusEmbarque, getPosCancellations or unification routes (DMZ CustomerServiceController.cs:326, OrdersController.cs:98, CreditController.cs:243-259 to LAN).
- Options: **A** one written request with a target date (Fable drafts). | **B** item by item.
- Recommendation: A.
- Unblocks: packages 4, 7a/7b/7e, 8c; DEC-11, DEC-28; G04-14/16/18, G03-04/12, G09-02/15/30, G06-10/17/18, G11-15/18/19.
- Answer:

#### X-14 (+X-17, X-20, X-21, X-23, X-24, X-25) - Medium/low external items (EXTERNAL_REQUEST, P2)
- Question: confirm you will request: official guest BP per sales org and the generic e-commerce agent format (X-14; GuestCashPartnerNumber OrderMethods.cs:41 is a literal test BP); A_GET_TelefonoValidado returns the 10-digit national number (X-17; SolicitudCreditoWebMethods.cs:478-501, `?sCliente=<BP>` :492, truncate :387); wallet generation API (X-20); DM0415 warranty DDL (X-21); TELEFONIA region swap rule (X-23); wholesale values only if D-27 = build (X-24); migrated BPs have a ZSDT_CTE row so PATCH unircuenta works (X-25; DMZ CustomerServiceController.cs:60).
- LAN: OrderMethods.cs:1224 agent; WholesaleCustomerController.cs:31-34 (P000098, canal 11, V00096, 98).
- Example: a VIU guest cash order is posted on the MA guest BP because one literal serves both orgs.
- Options: **A** X-14, X-17, X-25 now with the SAP SD batch; the rest when their package opens. | **B** defer all.
- Recommendation: A.
- Unblocks: 7a sign-off, nombreCliente, unirCuenta, E-45/E-47.
- Answer:

#### D-14 - Fiscalregimen for web BPs: name the SAP fiscal owner (EXTERNAL_REQUEST, P2)
- Question: Fiscalregimen stays "" (decided). Only: who is the SAP FI/SD fiscal owner, and may Fable draft: "Web BPs from BP01 carry generic RFC XAXX010101000 (Stcd1). LAN wrote FiscalRegimen 605. Should Fiscalregimen be 605, 616, empty or other?"
- LAN: SP_eCommerceCtenuevo.sql:109, :114 ('605'), :129. ServicioSAP: BusinessPartnerMethods.cs:548 `Fiscalregimen = ""`, :486 Stcd1.
- Options: **A** name the owner (role); Fable drafts now. | **B** not now; "" stays an accepted DIF until go-live review.
- Recommendation: A.
- Unblocks: T1.1-02, 1.1-R8.
- Answer:

#### CQ11 - Buró flag: SeEnviaBuroCreditoMavi for the CONTADO channel (RUN_CHECK, P2)
- LAN: SP_eCommerceCtenuevo.sql:88-97, :111/:138, :156-157. ServicioSAP: CteCto.cs:31 ZenviaBuroCred never assigned in the contact builder (BPM:643-668) so sent false; no Katr1 in Models.
- Options: **0** for UEN 1 and 2 -> close 1.1-R17 as EQ (DEC-34). | **1** -> EXTERNAL_REQUEST to the SAP BP owner (Katr1 vs ZenviaBuroCred).
- How to answer: check #9. Unblocks: 1.1-R17, G01-05, DEC-34.
- Answer:

#### CQ16 / P-16 (+X-18, P-13) - Missing SP sources and SIGMAVI tables (RUN_CHECK + EXTERNAL_REQUEST, P1)
- Question: SPsOrden has no text for SpListaNBMagento (SIGMavi), SpVentasCupones, SpVTASEcommerceExistencia, SpVTASECommerceDisponibilidadArt, SP_CREDITO_WEB_VALORES_FORM (it does hold SpVTASEcommerceStoreStock.sql: check overlap first). Also the DDL of the list tables (types, widths, collation), their triggers, and whether the Hazten tables exist in SIGMAVI (2027). Who delivers: you (read-only) or Diego/DBA from repo MaviSAP?
- LAN: SpVTASListaNBMagento.sql:23-30 (8 params + @Tipo), :71-122; ProductMethods.cs:934/:2890; ActualizacionStock.cs:55; CreditMethods.cs:683; :2313-2508 Hazten. ServicioSAP: CustomerMethods.cs:26-28 positional EXEC (8 args, IdMagento position 7 = LAN @NumCuenta, same value LAN passed), :33 SIGMavi; DMZ CreditController.cs:268 SaveHaztenTransaction to LAN.
- Example: if SIGMavi's parameter order differs, Nombre and DireccionEntrega swap silently on every insert.
- Options: **A** you run checks #8 and #30 now (sys.parameters works even if the body is encrypted). | **B** Diego/DBA deliver the script.
- Recommendation: A now; B only for an encrypted body.
- Unblocks: T1.L-01; 1.2-R4, R13-R17, R23; T1.2-01 criteria; G15-21/23, G12-04, G12-19.
- Answer:

#### CQ22 - Who runs the cashCustomerReport E2E on QA with the share copy (EXTERNAL_REQUEST, P2)
- LAN: CustomerMethods.cs:194-223 (File.Copy under Impersonation :212-215). ServicioSAP: CustomersController.cs:112-118; CashReportMethods.cs:67, :70-75.
- Options: **A** Diego + someone with IIS and share access on QA, after the c1cfcbc deploy (same as T1.5-04). | **B** leave untested.
- Recommendation: A. Unblocks: T1.5-01.
- Answer:

#### CQ25 - Test data for getCuenta/setCuenta (DATA_CONFIG, P2)
- Question: (a) a Magento email existing in websites 1 and 5 (getCuenta returns 2 elements); (b) a test customer entity_id and a test BP for setCuenta (written then restored).
- ServicioSAP: MagentoAccountMethods.cs:21-38; CuentaModels.cs:14-18 (nuevaCuenta, correoCuenta, idCliente). E-11 tested only a non-existent email.
- Options: **A** give <<EMAIL_PRUEBA_W1_W5>>, <<ID_CLIENTE_MAGENTO_PRUEBA>>, <<BP_PRUEBA>>. | **B** skip positive cases (R12, R17 untested).
- Recommendation: A. Unblocks: T1.6-01, T1.7-01 (S6).
- Answer:

#### RC-04 - One DMZ Web.config per environment (DATA_CONFIG, P1)
- Question: environments are switched by commenting lines (DMZ Web.config:16-19), which sent the 2026-10-06 test to QA. Will the DMZ owner and infra keep one file per environment, checked against the 18-key list?
- Facts: the file is untracked and holds credentials (literal USER_INTELISIS at :20); Web.Release.config has no appSettings transforms (REVISION :791-799).
- Options: **A** one file per environment kept by infra; URL_INTELISIS always the real LAN host. | **B** transforms for hosts + server-only secrets file.
- Recommendation: A for the first release, then B. Pair with RC-06 route by route.
- How to answer: name the DMZ owner and infra contact; Fable drafts the request.
- Unblocks: package-1 release checklist (S7); RC-06.
- Answer:

#### RC-05 - ServicioSAP per-environment deploy checklist (DATA_CONFIG, P1)
- Question: confirm: (1) the right Conexion.dll (SAP node selected by that DLL: Nodos.ENVIROMENT_DEV not defined in the repo, 68 uses + 69 literal `sap-client=110`; SAP_STAGE Web.config:34 read nowhere); (2) URL_DMZ/USER_DMZ (OrderMethods.cs:1203-1208, :1295-1299; Curl.cs:28/:50); (3) liberador keys (LiberadorCreditoMethods.cs:43-45); (4) URL_BP_API, URL_ANDROID_API, URL_CONFIGURACIONES_API, AwsBaseUrl, URL_SALES_DISTRIBUTION_API, ZAPI_*; (5) IGNORE_ATTRIBUTES_PATH + ignoreAttributes.txt (MagentoCatalogMethods.cs:48), IMAGES_CREDIT_PATH (DocumentMethods.cs:34), IMAGES_PRODUCT_PATH/SHARE (ProductImageMethods.cs:20-29), CASH_REPORT_LOCAL/SHARE_PATH (CashReportMethods.cs:28-37) writable; (6) SMB_IMPERSONATION_* (CashReportMethods.cs:71, ProductImageMethods.cs:42; Win32 1326 in dev).
- Options: **A** one documented checklist + a single SAP_ENVIRONMENT/SAP_CLIENT key replacing the literals (J1-13/J7-11; Fable codes the helper). | **B** edit literals on deploy day.
- Recommendation: A; move secrets out of Web.config and rotate (J1-20).
- How to answer: confirm the list; name who fills each environment.
- Unblocks: any deploy beyond DEV; wave 6; P-07, P-08.
- Answer:

#### P-09 - Log folders per environment after CQ21 B (DATA_CONFIG, P1)
- Question: confirm `C:\inetpub\wwwroot\log` exists and is writable by the app pool on every SS host (STAGE/PROD sap.log); `<site>\Logs` is now optional.
- ServicioSAP: Logger.cs:11-23 (server path only if the folder exists; silent otherwise), :28-43. Logger.SAP is the only E2E evidence.
- Options: **A** create the folder with modify rights on QA/Stage/PROD. | **B** rely on <site>\Logs (not on QA per T-01).
- Recommendation: A, part of RC-05; delete the duplicate local block later (J7-23).
- How to answer: check #27. Unblocks: S6 evidence; T-01; G01-11.
- Answer:

#### P-01 - Pickup codes: copy open rows to SIGMAVI BpRecogePedidos and switch reader + writers together (DATA_CONFIG, P1)
- LAN: OrdersController.cs:347 GetPickUpCode -> CodigoRecogerSucursal.cs:62 reads TrWDM0285_CteRecoge on IntelisisTmp (IdEcommerce, Nombre, Correo, Telefono, ClaveVenta); writers :372/:394. ServicioSAP: StorePickupMethods.cs:24-92 reads/updates BpRecogePedidos (inserts :292/:387); order/new writes bank-transfer codes there (OrderMethods.cs:1960-1975); DMZ :262 still reads LAN.
- Example: a bank-transfer pickup gets its code in SIGMAVI, but url_pickup_code (DMZ :262) reads IntelisisTmp: 'code not found'.
- Options: **A** one deployment: copy rows, switch :262, repoint the writers' trigger (after X-19 and C-08/C-10). | **B** switch the reader alone.
- Recommendation: A. How to answer: check #23. Unblocks: RC-13; G06-13, G14-08; DEC-16.
- Answer:

#### P-06 - Openpay keys and RECHAZAOPENPAY (DATA_CONFIG, P2; only after DEC-03 = a)
- LAN: OpenpayMethods.cs:39-43, :294; Web.config:28-32. ServicioSAP: no Openpay key; OrderMethods.cs:46-48, :482 parks orders only; no checkOpenpay (R-10).
- Options: **A** keep DEC-03 (c), provision later. | **B** provision now (useless until checkOpenpay is ported).
- Recommendation: A. Name the credentials owner; agents never see values. Unblocks: DEC-03 (a); G14-16; package 7d.
- Answer:

#### P-14 (+P-17, P-18) - Three read-only SAP captures (RUN_CHECK, P2)
- Question: (1) BP05MA of a BP with no birth date (sentinel?); (2) one A_GET_TelefonoValidado response (10 digits?); (3) BP05 of 2-3 migrated BPs with compound given names.
- LAN: CreditMethods.cs:835 Convert.ToDateTime(FechaNacimiento) (Intelisis default 1900-01-02, SP_eCommerceCtenuevo.sql:140); OrderMethods.cs:794-816; ProspectoController.cs:107-117 (all given names). ServicioSAP: SolicitudCreditoWebMethods.cs:242 BP05MA Birthdt, fallback 1900-01-02 (:551) only if FechaSap (:604-627) returns null; a /Date(-62135596800000)/ sentinel becomes 0001-01-01 and is inserted (:172); :478-501 (:492, :387); ProspectoController.cs:47 PrimerNombre only.
- Example: BP without birth date -> SS writes 0001-01-01 into CRED_SOLICITUD_WEB_DATOS_TEMP instead of 1900-01-02.
- Options: **A** run now (checks #19, #24, #25). | **B** defer.
- Recommendation: A. Unblocks: G05-11, G7-12 (C-17), D-25/DEC-13.
- Answer:

#### P-04 (+P-05, P-11, P-12) - Data loads before the switch (DATA_CONFIG, P2)
- Question: owners and timing of: SIGMAVI CondicionesCredVtaLinea rows for '05 M MA/VIU P DIF' per TiendaVirtual (P-04); real coupons into SIGMAVI VentasCupones only if codigoPromocion is kept (P-05, D-45); AWS VALOR1..4 meaning/owner for the 3 wallet catalogs (P-11); SIGMAVI image tables, DIM11 decimal format, Sucs_local_1/2/3, Class/Matkl -> route map, BackOrder equivalent (P-12).
- ServicioSAP: CreditMethods.cs:82-85 (`CondicionPropre LIKE '%DIF%'`), :125; CreditController.cs:26; WalletMethods.cs:77-99.
- Options: **A** an owner per load now, executed in wave 6 before each switch. | **B** everything at go-live.
- Recommendation: A. How to answer: owners + check #26. Unblocks: G05-08, G10-09/D-45, G03-10/DEC-11, G15-15/16/19/38/40.
- Answer:

#### D-27 - Package 3: negotiable-quote retire or build; wholesale captures (DECISION, P2)
- LAN: WholesaleCustomerController.cs:31-34; WholesaleCustomerMethods.cs:186-195, :21/:39, :42-45 'null'. ServicioSAP: no negotiable-quote; BusinessPartnerMethods.cs:856-883 GetWholesaleCustomerNameAsync (person name :863, NameOrg1-4 :866, Name1Text :871); since c1cfcbc an empty result returns "null" (:876-882) but an SAP HTTP 404 ('StatusCode: NotFound', :287) still ends as 500 (WholesaleCustomerController.cs:29-31) -> DMZ 200 'WebException'. DMZ :27 PostSAP, :53 to LAN.
- Options: **C** retire (DEC-30). | **A** build on SD01 ZMAY with Ventas Mayoreo values (X-24). | **D** stay on LAN.
- Recommendation: C unless Ventas Mayoreo needs the ERP order; capture 2-3 wholesale BPs now (check #29) for D-26.
- Unblocks: package 3; D-26, X-24; DEC-30.
- Answer:

#### D-30 - Package 5: status/getStatus discard or health check (DECISION, P2)
- LAN: StatusController.cs:11-20 pings 172.16.202.2. ServicioSAP: no route; DMZ StatusController.cs:16 curl.Get to LAN (fails whenever SS login is down, RC-03).
- Options: **A** discard and repoint the monitor (DEC-30). | **B** SS health check (token + one cheap OData read). | **C** DMZ-only liveness.
- Recommendation: B if Atentus still uses it, else A. Ask the Atentus owner; X-19 shows hits.
- Answer:

#### D-31 / DEC-30 - Retirement batch after 30 days of IIS logs (GO_AHEAD, P2)
- Question: retire, after X-19 and with the Magento team: recommender x3, Tablerate x3, order/getprueba, wallet/getCuentaC, ExistRFCAndPhoneCte, Validar_Lada, codigoRecomendado x2, product/getStockByStore, getOrderId, getOrderInfoAndSet/jsonOrders, negotiable-quote (if D-27=C), status/getStatus (if D-30=A), dead DMZ magento routes noImagenProduct/getOrderId. Keep product/updateConfigurableProductLink (LAN Production calls it, ProductMethods.cs:1784). NOT in this batch: getCreditAccount (D-51: Magento ProspectTracking cron calls it, AccountTracking.php:46) and ecommerce/listado (SS debug route, wave-0 DELETE J1-07).
- LAN: origin/Production has no recommender controller; stage-delta has RecomenderController.cs (2022, never merged); no Tablerate; OrdersController.cs:417, :437; ProductsController.cs:193. DMZ: RecommenderController.cs:21-80, OrdersController.cs:38/:344, WalletCustomerController.cs:51-63, CreditController.cs:185-206/:370-388, ProductsController.cs:62 (:44 keep), MagentoController.cs:62/:78.
- Options: **A** all after the logs, one DMZ change, Gantt and counts updated. | **B** one by one.
- Recommendation: A. How to answer: yes/no per group.
- Unblocks: packages 5/6/8/9/10 closure; LAN switch-off.
- Answer:

#### D-53 - Package 10: product/* out of Fable's count (GO_AHEAD, P2)
- Facts: DMZ ProductsController.cs:26-123 (5 routes to Magento, 1 stub, 1 local disk, 1 SFTP); SS has no product/* equivalent; LAN origin/Production ProductMethods.cs:1784 calls updateConfigurableProductLink.
- Options: **A** out of count; import tool stays the caller; retire getStockByStore only after logs. | **B** redefine package 10 as replacing the LAN jobs (conflicts with X-08/DEC-14).
- Recommendation: A; name the import-tool owner. Unblocks: package 10; DEC-14 scope; D-08.
- Answer:

#### D-55 - Packages 12-14 out of scope: Mercancia, Login, Logging (GO_AHEAD, P2)
- Facts: DMZ MercanciaController.cs:16-88 (5 routes, curl.Post to LAN), LoginController.cs:17; no LoggingController file on the share; SS LoginController.cs:14 is the only anonymous route. `new Curl()` logs in to SS first (RC-03): an SS outage breaks mercancias/*.
- Options: **A** out of scope; the APP mercancías owner accepts the coupling until RC-03 B; correct PLAN:45/:198-209 and CSV:63. | **B** bridge them.
- Recommendation: A; name the owner. Unblocks: closure 12-14; release sign-off.
- Answer:

#### D-50 - Credilana boundary: message to Dev 3 (DECISION, P1)
- Question: confirm: all Credilana routes out (APERTURA, the 5 CreditoWeb_* on SPCREDICredilana); ProductosMX deferred to Feb-Mar 2027; SolicitudMercancia (E-44) out; GetCreditAmounts treated as Credilana (DEC-21 A: DMZ :352 back to LAN; nobody owns mavi_credilana_info); D-45: does DU16 cover the checkout promoter box (retire codigoPromocion or keep with a data owner)? getCreditAccount is decided separately in D-51.
- LAN: CreditController.cs:144-559; Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs:29-226, :675-776; CreditController.cs:124-141. ServicioSAP: CreditController.cs:115 GetCreditAmounts reads mavi_credilana_info that nothing fills (CredilanaMethods.cs:25-28 'La llena M-07') -> every call 500 (R-17); :26 codigoPromocion (seed only). Dev 3 has M-01..M-05, M-03 (15-19 Oct) scheduled.
- Options: **A** all out; 2027; E-44 out; DEC-21 A; D-45 per DU16. | **B** only SPCREDICredilana routes out; GetCreditAmounts gets an owner (P-03).
- Recommendation: A after the Magento owner confirms which page calls getCreditAmounts (D-49 C). Fable drafts the Dev 3 message.
- Unblocks: package 9 counts; DEC-21/22; P-03; D-45; Dev 3's October plan.
- Answer:

#### RC-17 - credit/guardardocumento anonymous on the DMZ (DECISION, P2)
- Facts: DMZ CreditController.cs:448-450 [AllowAnonymous], :493 PostSAP; DMZ origin/Production has the same (:452) forwarding to LAN with its own token; LAN CreditController.cs:16 class-level [Authorize]; SS CreditController.cs:154 requires a token. Option B keeps today's DMZ exposure; it is not a LAN parity requirement.
- Example: anyone reaching the DMZ can upload a file into MAVI_DOC_CTE for any BP.
- Options: **A** [Authorize]; Magento sends the DMZ token (coordinated). | **B** keep anonymous (security owner accepts).
- Recommendation: A. Unblocks: guardardocumento go-live.
- Answer:

#### F-04 - Literal credentials outside ServicioSAP Web.config (DATA_CONFIG, P2)
- Facts: DMZ share Web.config (untracked) holds a literal USER_INTELISIS credential at :20 next to the lines RC-06 asks you to inspect; LAN Conn/Connection.cs:26 hard-codes the IntelisisTmp connection string with a SQL login. J1-20 covers only SS (Web.config:13-15, :31, :36-41). Values were not read or reproduced.
- Options: **A** infra moves DMZ and LAN secrets to a server-only file/secret store and rotates them, with J1-20. | **B** leave (readable on the share until LAN is off).
- Recommendation: A at least for the DMZ (ships in the first release); RC-06 pastes host names only.
- How to answer: name the owner (DMZ owner + infra). Unblocks: wave 6 sign-off; RC-04 B; J1-20.
- Answer:

## 5. Checks the user runs (all read-only)

Agents never run these. `<<SAP>>` = DEV ServicioSAP base (bearer from POST <<SAP>>/login/auth); `<<SAPDirect>>`/`{SERVICE_URL}` = SAP gateway base used at BusinessPartnerMethods.cs:221 (Hoppscotch SAP credentials). Before any DMZ call do #6. Mask names and emails when pasting.

1. **P-15 ZidMagento (D-15)** - (1) `GET <<SAP>>/partner/client/filter/ZidMagento eq 999999991` (expected 'No se encontraron clientes' = accepted). (2) only if (1) is BadRequest: `GET <<SAP>>/partner/client/filter/ZidMagento eq '999999991'`. (3) `GET <<SAPDirect>>/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter=ZidMagento eq 0&$top=5&sap-client=110&$format=json`; if you know a real DEV Magento id: `GET <<SAP>>/partner/client/filter/ZidMagento eq <ID_MAGENTO_PRUEBA>` and count rows (several = duplicates, feeds DEC-01 tie-break). Also unquoted vs quoted with that id directly on OData.
2. **P-15 Mail case (DEC-17, T1.2-03)** - for BP 1500008276 (pre-S4, stored as sent, lowercase): `GET <<SAPDirect>>/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter=Mail eq '<EMAIL>'&sap-client=110&$format=json`; same with `'<EMAIL_UPPER>'`; (3) `$filter=tolower(Mail) eq '<email lower>'`; (4) `Mail eq '<email>%20'`. Paste status + d.results.length each. (The route form `<<SAP>>/partner/client/filter/Mail eq '...'` may 404, Web.config:108.)
3. **DEC-17 LAN collation** - Intelisis DB: `SELECT c.collation_name FROM sys.columns c WHERE c.object_id = OBJECT_ID('dbo.Cte') AND c.name = 'eMail1';` ('_CI_' = LAN ignores case).
4. **DEC-01/CQ2 duplicates** - IntelisisTmp: `SELECT TOP 50 IdMagento, COUNT(*) AS n FROM Cte WITH (NOLOCK) WHERE IdMagento > 2 GROUP BY IdMagento HAVING COUNT(*) > 1 ORDER BY n DESC;`
5. **DEC-01/CQ3 guests via setCustomer** - IntelisisTmp: `SELECT IdMagento, COUNT(*) AS n, MAX(Alta) AS ultimaAlta FROM Cte WITH (NOLOCK) WHERE IdMagento BETWEEN 0 AND 2 AND FechaNacimiento = '1900-01-02' AND ISNULL(PersonalApellidoPaterno,'') <> '' GROUP BY IdMagento;` (non-empty PersonalApellidoPaterno = setCustomer path; the order SPs pass @Apaterno NULL).
6. **RC-06 DMZ target + DLL** - open DMZ Web.config lines 16-19 and paste hosts only of URL_INTELISIS/URL_SAP (never USER_* values); on the target host `dir C:\inetpub\wwwroot\sap\bin\ServicioSap.dll` (share build 2026-10-06 16:49 is current).
7. **RC-08 Android DB sanity** - ServicioAndroid: `SELECT @@SERVERNAME AS srv, GETDATE() AS now, (SELECT MAX(FechaEnvio) FROM TcAAEA00030_EnvioMensajes) AS last_sms;` compare with the wall clock.
8. **CQ16 SIGMavi SP and tables** - DEVMAVI: `SELECT p.parameter_id, p.name, TYPE_NAME(p.user_type_id) AS tipo, p.max_length FROM sys.parameters p WHERE p.object_id = OBJECT_ID('dbo.SpListaNBMagento') ORDER BY p.parameter_id;` then `EXEC sp_helptext 'SpListaNBMagento'; EXEC sp_helptext 'SpVentasCupones'; SELECT name FROM sys.tables WHERE name LIKE '%Lista%'; SELECT o.name AS tabla, c.name, t.name AS tipo, c.max_length, c.collation_name FROM sys.columns c JOIN sys.objects o ON o.object_id=c.object_id JOIN sys.types t ON t.user_type_id=c.user_type_id WHERE o.name LIKE '%Lista%' ORDER BY o.name, c.column_id; SELECT name, OBJECT_NAME(parent_id) FROM sys.triggers WHERE OBJECT_NAME(parent_id) LIKE '%Lista%'; SELECT DATABASEPROPERTYEX(DB_NAME(),'Collation');`
9. **CQ11 buró flag** - Intelisis DB LAN uses: `SELECT UEN, ID, Clave, Categoria, Cadena, SeEnviaBuroCreditoMavi FROM VentasCanalMAVI WITH (NOLOCK) WHERE Categoria = 'CONTADO' AND Clave LIKE 'CO%' ORDER BY UEN;`
10. **C-02 PurchNoC format** - `GET <<SAP>>/order/checkDocument/ZSD_ZMER_<incrementId>` (OrderController.cs:123) vs `ZSD_T_<incrementId>`.
11. **C-05 sap-client** - browser: `GET {SERVICE_URL}/ZSDT_CTE_ODATA_SRV/ZSDT_CTE_ENTITYSet(ZclienteBp='<bp>')?$format=json` with and without `&sap-client=110`; compare ZidMagento.
12. **C-07 name case** - `GET <<SAP>>/partner/client/filter/PrimerNombre%20eq%20'jose'` vs `'JOSE'`.
13. **C-01 evidence** - `<site>\Logs\sap.log`: a `[SAP ORDER RESPONSE]` entry with `"Type":"E"` and `"Salesdocument":""` followed by `[SAP WEBHOOK DMZ]` for the same incrementId.
14. **DEC-05 terms** - SIGMAVI: `SELECT CondicionMagento, TiendaVirtual, Condicion FROM CondicionesCredVtaLinea WITH (NOLOCK) ORDER BY TiendaVirtual, CondicionMagento;` (if a column name differs, run `SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('CondicionesCredVtaLinea')` first).
15. **DEC-04 SD29 rows** - the properlist OData filter used at FinalListProperMethods.cs:84 (`Articulo eq '<promo sku>'`): count rows / OrgVtas returned.
16. **DEC-07 LAN reference** - `SELECT TOP 5 c.Cliente, e.ID, e.Categoria, c.Estatus FROM Cte c WITH(NOLOCK) JOIN CteEnviarA e ON e.Cliente=c.Cliente WHERE e.Categoria='CREDITO MENUDEO';`
17. **DEC-02 Production DMZ mapping** - in the DMZ share repo: `git -c safe.directory=* show origin/Production:./Controllers/OrdersController.cs` and read the setOrder block.
18. **DEC-11 SD18** - `GET {SERVICE_URL}/ZAPI_CONDITIONCONTRACT_SRV/ConditionContractSet?$filter=Reference eq '<BP de prueba>'&sap-client=110&$format=json`; paste contract count and Vkorg.
19. **DEC-12 (a) / P-14 (1) BP05MA** - `GET {SERVICE_URL}/ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='<BP>',Client='110')?$expand=to_CtePersonalAdr&sap-client=110&$format=json`; paste which smtp_addr rows come back and Birthdt for a BP without birth date.
20. **DEC-15 (optional)** - LAN share repo: `git -c safe.directory=* fetch origin Production` then `git -c safe.directory=* show origin/Production:./Conn/Magento.cs | sed -n 265,400p`.
21. **X-16 SMS table** - ServicioAndroid: `SELECT c.name, t.name, c.max_length, c.is_nullable FROM sys.columns c JOIN sys.types t ON t.user_type_id=c.user_type_id WHERE c.object_id=OBJECT_ID('TcAAEA00030_EnvioMensajes');`
22. **P-02 SQLite tables** - `sqlite3 C:\inetpub\wwwroot\sap\data.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;"` and the same on `...\api\data.db` (or copy both files and list tables in any SQLite viewer).
23. **P-01 pickup rows** - IntelisisTmp: `SELECT COUNT(*) AS filas FROM TrWDM0285_CteRecoge WITH (NOLOCK); SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('TrWDM0285_CteRecoge');` SIGMAVI: `SELECT COUNT(*) FROM BpRecogePedidos WITH (NOLOCK);`
24. **P-14 (2) validated phone** - `GET {URL_BP_API}/A_GET_TelefonoValidado?sCliente=<BP>` (SolicitudCreditoWebMethods.cs:492); paste the length of the phone value.
25. **P-14 (3) compound names** - `GET {SERVICE_URL}/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter=BusinessPartner eq '<BP>'&$top=1&sap-client=110&$format=json` for 2-3 BPs; paste PrimerNombre/SegundoNombre masked.
26. **P-04 DIF conditions** - SIGMAVI: `SELECT CondicionPropre, TiendaVirtual, Mensualidades FROM CondicionesCredVtaLinea WITH (NOLOCK) WHERE CondicionPropre LIKE '05 M%DIF%' ORDER BY TiendaVirtual;`
27. **P-09 log folder** - each host: `icacls C:\inetpub\wwwroot\log` (app-pool identity has (M)); one request, then `Get-Content C:\inetpub\wwwroot\log\sap.log -Tail 3`.
28. **T-02 paying BP** - `GET https://localhost:44399/partner/client/<<BP_CON_PAGOS>>`; to find one: `GET {SERVICE_URL}/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter=ZfecUltPag ne ''&$top=1&sap-client=110&$format=json`.
29. **D-27 wholesale BPs** - `GET {SERVICE_URL}/ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='<BP>',Client='110')?$expand=...&sap-client=110&$format=json` (BusinessPartnerMethods.cs:271) for 2-3 wholesale BPs; paste NameOrg1-4 / Name1Text masked.
30. **P-16 SP texts + SIGMAVI tables** - on the hosting DB: `EXEC sp_helptext 'SpVTASEcommerceExistencia'; EXEC sp_helptext 'SpVTASECommerceDisponibilidadArt'; EXEC sp_helptext 'SP_CREDITO_WEB_VALORES_FORM';` SIGMAVI: `SELECT name FROM sys.tables WHERE name IN ('CREDIHBiometrico','CREDIDEtapaProcesamiento','CREDIDTransaccionMetaDato','VentasCupones','BpRecogePedidos');`
31. **RC-03 JWT** - compare JWT_SECRET_KEY / JWT_ISSUER_TOKEN / JWT_AUDIENCE_TOKEN of LAN and SS Web.config per environment yourself (never paste). Optional: token from SS login/auth used on a LAN GET -> 200 means equal.
32. **X-15 (Magento team runs)** - `SELECT path, scope, scope_id, value FROM core_config_data WHERE path LIKE '%url%' OR path LIKE '%cupon%';` (hostnames, not secrets).

## 6. What happens after each answer

- **P-15 GREEN + DEC-01 (+F-01/F-02)** -> Fable **S5** (package 1, wave 4a): SetCustomerAsync orchestrator (lookup -> reuse/create -> guard moved), controller becomes one call; you compile and commit. ZID_FAILS -> S5 on hold, external request to SAP/ABAP, Fable continues with DEC-17 and wave 0.
- **DEC-17 (+J4-07)** -> Fable **T1.2-03** fix in CustomerMethods.cs (own commit), then the S6 lists E2E.
- **RC-12** -> one-line change in BusinessPartnerController.cs catch (own commit) and the expected result of T1.1-09 step (3) is fixed.
- **RC-06/RC-08 confirmed + T1.1-09, T1.2-01, T1.5-04, T-02, T1.H-01 run** -> Fable **S6** closes the package-1 E2E board; failures come back as fixes before S7.
- **C-01..C-07, F-B3-05, DEL-a..d, F-03 'go'** -> Fable **Wave 0** sessions: one commit per item/batch in this order: C-01, C-02, C-03, C-04, C-05, C-06, C-07, P1 batch C-08..C-18, DEL-a, DEL-b, DEL-c, DEL-d, F-03; you compile after each. Then C-19..C-37 are offered.
- **Section 3 decisions** -> a single decision session; outputs: DEC-02/03/04/05 -> wave 4b (order/new) spec; DEC-06 (+X-03) -> wave 4c (cancel/return); DEC-07 (+C-04) -> wave 4d (credit gate, DMZ :296 switch); DEC-09/10/11/12 (+X-06) -> wave 4e (abonos, wallet, customer service) with the interim DMZ reverts first; DEC-14/15 (+X-08) -> wave 4f (catalog); DEC-16/24 (+X-19) -> package 7d; DEC-18 -> S5/S6 remainder; CQ24/CQ26/CQ17/CQ19 -> T1.0-DOC and S7 checklist; RC-01/CQ27, RC-03, RC-04, RC-05, P-02, P-09 -> wave 6 release checklist (S7 for package 1).
- **Section 4 external requests** -> Fable drafts each message (X-01, X-02, X-03, X-05, X-06, X-08, X-19, X-16, X-15, X-04, X-14, D-14, D-50) the moment you name the recipient; answers reopen the mapped wave. Data/config items (RC-05, P-09, P-01, P-04, P-06, F-04) go into the wave 6 checklist. Scope items (D-23/DEC-13, D-27, D-30, D-31, D-53, D-55, D-08) close packages 2-14 in PLAN_FABLE_POR_CONTROLADOR.
- Package 1 cutover (**S7**) needs: S5 done, DEC-17 done, RC-12 done, S6 green, CQ17 load, RC-01/CQ27 owner and window, RC-06/RC-04 confirmed.
