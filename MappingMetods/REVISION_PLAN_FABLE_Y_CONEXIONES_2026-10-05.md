---
tags: [migracion, sap, fable, conexiones, revision]
fecha: 2026-10-05
estado: analisis
---

# Revisión del plan Fable por controlador y de las conexiones — 2026-10-05

> [!abstract] Qué es esto
> Re-análisis de [[PLAN_FABLE_POR_CONTROLADOR]], [[PLAN_FABLE_CONTROLADORES/01_CustomersController]], [[GUIA_MIGRACION_FABLE]], `SKILL.md`, las tareas Fable del crédito y las **conexiones DMZ → ServicioSAP**, contra ServicioSAP `6214ed8` (limpio), DMZ `ConexionSAP 09cb341` y LAN `stage-delta 68b2290`. Workflow `wf_f1ee71ad-54e` (7 agentes + sintetizador, solo lectura). Base de comparación: [[REVISION_PLAN_FABLE_2026-10-02]]. Es **análisis**: no cambia el plan. Resultado crudo: `_REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05.json`.

## 1. Respuesta

No. The per-controller Fable plan is not ready to hand over as it stands. Only one detailed spec exists (PLAN_FABLE_CONTROLADORES/01_CustomersController.md). Its S1 and S2 prompts now stop at step 1: they expect ServicioSAP HEAD 2cf425f with 4 uncommitted credit files (01:32, :1105, :1136), but the branch is at 6214ed8 with a clean tree (verified 2026-10-05). The code those two sessions edit has not changed: BusinessPartnerController.cs:48 still reads 'return Ok(result);'. So S1 (T1.1-01 only) and S2 (ConfigureAwait plus test kits) can start once six things are fixed: the baseline check, the build step (there is no Z: drive), T1.1-02 taken out of S1, the ZidMagento filter unquoted, the Business Rules update scope for S1, and the CURL-1 kit scope. The credit tasks R1 and R3 have no open business decision and can follow once the baseline and line citations are fixed. With your approval, doc-only sessions can start now: resync Business Rules, correct PLAN counts and stale statements, and draft small specs. Packages 2-9 need specs and business decisions first. Packages 10, 12, 13 and 14 are out of scope and only need your confirmation. Package 11 needs the E-22 productWithWebsites contract fixed. No DMZ route can be switched today without a decision. The 26 bridges exist only on DMZ branch ConexionSAP, which is not built on origin/Production (89 commits missing). 8 of those bridges would ship broken. The switches also depend on a Magento BP release, on per-environment config, and on the shared JWT key between LAN and ServicioSAP.

## 2. Qué cambió desde el 2026-10-02

- ServicioSAP SpExportaEcommerce moved from 2cf425f (with 4 uncommitted credit files) to 6214ed8, merged 2026-10-02 18:36, with a clean tree. 05df55a committed the credit work (+109/-64). The 10-02 blocker 'shared uncommitted working copy' (ACT-27) is RESOLVED, but every prompt that checks the old baseline now fails (verified).
- The merge brought in code that the plan and Business Rules do not describe: the cached-token DMZ Curl (9008609: static HttpClient, 20-minute token, re-login on 401), credit/codigoPromocion (E-45, CreditController.cs:23-39), the bank-transfer pickup-code writer inside order/new (61eb2c3, OrderMethods.cs:1958-1975), SD36 ZSD_ZMER_/ZSD_ZPRE_ normalization, and the 300 s catalog timeout. ServicioSAP now has 111 routes; Business Rules (last modified 2026-10-01 13:38) says 110.
- OrderMethods line numbers moved again (for example the empty-Partner guard is now :2649-2654 and FullCancelAsync is :3002-3110). Applied literally, CREDITO T1a step 2 would delete the closing brace of the USER_DMZ fallback (OM:1217).
- DMZ is unchanged (ConexionSAP 09cb341), but the local clone was last fetched 2026-09-17. Commit 97d6aea (the E-45 cutover) is not present (verified), so codigoPromocion, getSms and validateSms still use curl.Post to LAN (DMZ CreditController.cs:76, :107, :135).
- New connection finding: DMZ origin/Production (c352009) is not an ancestor of ConexionSAP (89 commits missing, verified). It has routes ConexionSAP lacks (credit/GetPlazosCteC, order/getIntelisisStatusesCredit, magento/productWithWebsites/{page}/{size}/{sku}). It reads URL_LAN where ConexionSAP reads URL_INTELISIS, and it keeps literal secrets. The 10-02 review compared against master/Stage, which are irrelevant for release.
- ConexionSAP is a content superset of origin/dbAndroid: the 2 dbAndroid-only commits are merges, and the content diff is only ConexionSAP's extra Login and getMinimumCostToRedeem switches (verified). Dev 3's 'pushed to dbAndroid' therefore equals ConexionSAP minus those, except 97d6aea, whose location is unknown.
- Package 11 (Magento) was marked done on 10-02 and is not done: ServicioSAP E-22 calls magento/productWithWebsites/{page}/1000, while origin/Production only exposes the 3-segment template (verified). It also does not match LAN Production's algorithm.
- P10-2 correction: LAN origin/Production does call DMZ product/updateConfigurableProductLink (WebApiMagento/Metodos/ProductMethods.cs:1784, verified). The connections matrix entry 'no code caller' is wrong; do not deprecate this route.
- E-45 correction: the 'Elimina returns empty string' divergence is parity. The legacy SpVTASVentaCupon chains NUEVO and ends in SELECT @Agente (SPsOrden/SpVTASVentaCupon.sql:115-164, @Nuevo default 0), so LAN CreditMethods.cs:454-459 also returns an empty string (verified). Only the Centro NULL difference remains.
- Decisions found in vault documents but not in the plan: getOrderInfoAndSet is not migrated, so jsonOrders is retired (commit f66148a); the 8 product/* routes pass through unchanged (Dev 3, 12 Aug); there is a destination-database rule (ServicioAndroid, AdminDoc, SIGMAVI and SQLite stay; IntelisisTmp does not) plus SIGMAVI naming rules; and a 25-day clock skew or stale copy was seen on mavicbosandroid (2026-09-28).
- New conflicts: coupons are 'deprecated' (DU16/ACT-35), yet the E-45 route is built and tested and Magento still calls it. GetCreditAmounts reads like Credilana (LAN FnVTASListaCredilanas), against GUIA §1.6b. GetPhoneValidatedClientSecretName (the credit checkout gate) has no owner. Dev 3 has Credilana work (M-01..M-05) scheduled in October against SKILL rule 15. TEL-1 was closed on 2026-10-02.
- Resolved per your earlier instructions and not re-asked: X-1 (Fable updates Business Rules in the same change) and the root path. Still open from 10-02: X-2 (HTTP status policy), the build step without Z: (now three conflicting recipes), T1.1-02 inside S1, the quoted ZidMagento filter, and all 17 package-1 CQs (the §5 answer column is empty).

## 3. Estado por paquete

| Paquete | Estado | ¿Arranca hoy? | Definiciones | Por qué |
|---|---|---|---|---|
| 1 · CustomersController: S1 (T1.1-01) + S2 (ConfigureAwait + test kits) | READY_AFTER_DEFINITIONS | no | 6 | The target lines were verified unchanged at 6214ed8. Both sessions need D-01 (baseline), D-03 (build), D-14 (T1.1-02 out of S1), D-15 (step-0 filter), D-16 (Business Rules scope) and D-17 (CURL-1 for S2). After that they are mechanical: change SBPC:48 to 'return Ok(result.Partner.Trim());' and add ConfigureAwait(false) to 8 awaits. |
| 1 · CustomersController: S3-S7 (decision tasks, lookup/update, E2E, cutover) | READY_AFTER_DEFINITIONS | no | 11 | These wait on X-2, CQ1-CQ15, CQ20, CQ24, a captured real Magento payload, the result of step 0, and the release, config and owner items C-01..C-08. S6 (E2E) and S7 (cutover) are blocked by other teams: they need a deployed binary and the release branches. |
| 2 · ProspectoController | NEEDS_SPEC_FIRST | no | 4 | There is a scope gate first: ticket 10226 says the Credilana app is the consumer (D-23). Then the RFC annex source (D-24) and the recuperarcuenta parity rules (D-25), plus ownership against the Dev 2 Gantt (D-08). No 02 spec exists. |
| 3 · WholesaleCustomerController | NEEDS_SPEC_FIRST | no | 3 | The wholesale GET bridge needs the returned-name and not-found rules (D-26) and the Magento re-keying of wholesale accounts (C-09). For negotiable-quote you must choose retire or build (D-27); if build, it has no SAP design. |
| 4 · WalletCustomerController | NEEDS_SPEC_FIRST | no | 3 | wallet/details needs SD18 semantics and captures (D-28), and getMinimumCostToRedeem needs the C09 algorithm (D-29). getCuentaC should be retired (D-31). No capture exists yet. |
| 5 · StatusController | NEEDS_SPEC_FIRST | no | 1 | This is a scope decision (D-30): discard it, or rebuild it as a ServicioSAP health check. The documents disagree. |
| 6 · RecommenderController | OUT_OF_SCOPE | no | 1 | Every source points to deprecated, but you have not confirmed it (D-31). The controller is absent from DMZ origin/Production, while the Dev 2 Gantt still schedules getRecommender. |
| 7 · CREDITO S1 (R1, R3, then R4, then T1a) inside order/new | READY_AFTER_DEFINITIONS | no | 6 | R1 and R3 have no open decision; they only need D-01 (baseline), D-02 (re-citing lines) and D-03 (build). R4 needs D-32 (it would revert DU13), and T1a needs D-33. D-06 (commit policy) applies to all of them. You carry this work yourself on the shared route, so decide whether Fable runs it. |
| 7 · OrdersController (7a contado, 7b cancel/return, 7c credit routes, 7d pickup/Openpay, 7e queries) | NEEDS_SPEC_FIRST | no | 10 | There is no 07 spec, and PLAN §7 is stale. 7a and 7b are ready after definitions (D-34..D-36, X-2). 7c is blocked by DU11 and DU20. The pickup code is done, so only the connection is missing (C-13). Openpay/Paynet and the 7e queries need SAP sources. |
| 8 · CustomerServiceController | NEEDS_SPEC_FIRST | no | 5 | There is no 08 spec, and the plan's count is wrong: 7 routes go to ServicioSAP, 19 to LAN, 0 are delegated. The 8a-1 Logins (D-40) and obtenerCreditos (D-42) can move after definitions. BBVA/STP is blocked on ABAP via Dev 4, and the Neko stubs must not be connected (D-41). |
| 9 · CreditController | NEEDS_SPEC_FIRST | no | 8 | There is no 09 spec. 9a getSms/validateSms is coded (D-47, D-48, C-14). E-45 needs a keep-or-retire decision (D-45, D-46). 11 routes are scope candidates (D-50), the 5 balance routes are blocked by other teams, and Business Rules is stale for this controller. |
| 10 · ProductsController | OUT_OF_SCOPE | no | 1 | These routes push data into Magento and are called by the import tool. Dev 3 decided on 12 Aug that they pass through unchanged; you need to confirm (D-53). updateConfigurableProductLink has a LAN Production caller, so keep it. |
| 11 · MagentoController | READY_AFTER_DEFINITIONS | no | 2 | It was marked done on 10-02 and is not. The E-22 contract is wrong against Production (D-54), the LAN reference branch is undecided (D-07), and the catalog scheduler has no owner (C-16). |
| 12 · MercanciaController / 13 · LoginController / 14 · LoggingController | OUT_OF_SCOPE | no | 1 | 12 is the APP mercancías project (another project). 13 is the DMZ's own token issuer. 14 is a local log sink. They only need your confirmation (D-55). Their real impact is on connections: Curl/JWT coupling (C-03) and the Web.config keys (C-04). |

## 4. Conexiones DMZ → ServicioSAP

**Conteo:** DMZ ConexionSAP 09cb341 has 120 [Route] attributes: 119 live plus validateCredit, which is commented out. Today 26 go to ServicioSAP, 63 to LAN, 25 directly to Magento and 5 are DMZ-local or stubs. The 26 bridges exist only on ConexionSAP; origin/Production has 0 and origin/Stage only shadow-writes setOrder, so none is deployed. Against LAN, 7 bridges match, 11 match partly and 8 do not. Readiness: 0 can switch now without a decision, 29 can switch after definitions, 12 need building in ServicioSAP, 16 are blocked by other teams and 37 are out of scope. 56 of the 63 LAN-routed routes have no ServicioSAP equivalent.

**Listas para cambiar hoy:**
- None. Every route needs at least one decision or prerequisite.
- Closest, code already in ServicioSAP: credit/getSms and credit/validateSms (need NIP-1, the checkout-gate port, the Magento BP release and an SMS dispatcher check); order/GetPickUpCode (needs the external writer trigger and Magento url_pickup_code repointed); customerService/obtenerCreditos (needs R8-12..R8-14); credit/codigoPromocion (needs the keep-or-retire decision and the location of 97d6aea).
- Already bridged with verified LAN parity, waiting only on the release: customer/setCustomerList, order/getGuide (servicio_guias must exist in the server data.db), customerService/obtenerQuejas, customerService/bbvaKeyAdvanced, credit/SaveImagesProductosMx (folder permissions). Also credit/getPlazos, once its error-shape difference is accepted.
- Bridged but not safe to ship: cancelOrder (every cancel answers 400), getClienteFactura (always 500), setCustomer (returns the whole Client), GetCreditAmounts (500 while its cache is empty), GetAccountDebts, wallet/details, getMinimumCostToRedeem, recuperarcuenta, and setOrder (response shape; the credit branch gets stuck). Also SendSmsNewNumber (dispatcher handling of BP rows is unverified) and guardardocumento (anonymous on the DMZ).

**Orden de despliegue recomendado:**
- 1. Decide the release branch per repo. Fetch the DMZ clone (you run it), locate 97d6aea, and merge origin/Production into one integration branch. Gate the release on a route-set diff.
- 2. Choose the first-release scope: either ship only parity-verified bridges, or add a per-route LAN/SAP switch in Web.config.
- 3. Per environment: ServicioSAP config (SAP node and sap-client, URL_DMZ/USER_DMZ, SQLite data.db and tables, file paths, the Logs folder, the impersonation account). DMZ Web.config (the 18 keys ConexionSAP reads). Equal JWT key, issuer and audience in LAN and ServicioSAP.
- 4. Deploy ServicioSAP (6214ed8 or later) first, and confirm a fresh sap.log line from the served binary.
- 5. Deploy the DMZ release. Flip routes in waves, each wave only after its E2E passes (you run the E2E; Fable prepares it).
- 6. Release Magento with or before the BP-keyed routes: the BP goes in infoCliente.cuenta, stored C accounts are remapped, and the regexes accept BPs. Point the admin-config URLs to the DMZ.
- 7. Switch credit routes (creditStatus, updateCreditOrderId, the credit branch of setOrder) last, after DU11 and DU20.
- 8. Switch LAN off only after tracing callers (IIS logs and Task Scheduler), relocating the catalog and import scheduler, and loading the SIGMavi list data.

**Prerrequisitos:**
- The DMZ clone is refreshed and the release branch is reconciled with origin/Production. Releasing ConexionSAP unchanged drops GetPlazosCteC, getIntelisisStatusesCredit and the 3-segment productWithWebsites template.
- Accept or fix the Curl coupling. Every new Curl() logs in to ServicioSAP and rethrows on failure (DMZ Helper/Curl.cs:73-90, verified), so a ServicioSAP outage takes down LAN-routed and APP mercancías routes too. Do not split the JWT keys before this is fixed.
- Keep the per-environment DMZ Web.config outside git (it is untracked). Without PASS_HASH/PASS_SALT, login/authenticate answers 500.
- Centralize Nodos.ENVIROMENT_DEV (68 call sites) and the literal sap-client=110 (69 sites) before Stage/PROD.
- Server files: data.db with servicio_guias and mavi_credilana_info, ignoreAttributes.txt, IMAGES_CREDIT_PATH writable, a Logs folder the app pool can write, and the SMB impersonation account (fails with Win32 error 1326 in dev).
- Decide whether ServicioSAP points SQLITE_DB_PATH at LAN's data.db (C:\inetpub\wwwroot\api\) or copies it at cutover, so guides created before the cutover are not lost.
- The Magento BP release and stored-account remap, the regexes, and an export of the admin-config URLs per environment.
- Name which IIS instance and binary each E2E runs against, and check that the mavicbosandroid clock and copy are correct before any credit or SMS E2E.
- Fix the authorizationResult callback keys before the liberador is enabled: ServicioSAP sends snake_case (OrderMethods.cs:1257-1263), while the DMZ model expects camelCase (Models/CreditRequest.cs:212-218). Verified.

### 4.1 Matriz por ruta del DMZ

| Ruta DMZ | Controlador | Hoy va a | Equivalente ServicioSAP | Contrato = LAN | ¿Lista? | Qué falta | Evidencia |
|---|---|---|---|---|---|---|---|
| POST customer/setCustomer | CustomersController | ServicioSAP | POST partner/client (SS Controllers/BusinessPartnerController.cs:35) | no | already_switched | T1.1-01 return the BP string (CX-15); error path / status policy (CX-03); Magento stores the BP (CX-07); DMZ release (CX-01, CX-06) | DMZ CustomersController.cs:30 PostSAP + Trim; SS BusinessPartnerController.cs:48 still 'return Ok(result);' (full Client) at HEAD 6214ed8; LAN CustomersController.cs:14 returned the C account; origin/Production: curl.Post to LAN |
| POST customer/setCustomerList | CustomersController | ServicioSAP | POST customer/setCustomerList (SS Controllers/CustomersController.cs:16) | yes | already_switched | DMZ release; SIGMavi list data/DDL (CQ13-CQ15) | DMZ CustomersController.cs:70; E-02 verified end-to-end 2026-08-10 (ESTADO_PRUEBAS:50); cutover 740669e |
| GET customer/getCustomerList | CustomersController | ServicioSAP | POST customer/getCustomerList (SS Controllers/CustomersController.cs:58) | partial | already_switched | CQ12 error branches; DMZ release | DMZ CustomersController.cs:88 PostSAP from a GET route; E-03 three values verified; error branch differs (10-02 review) |
| POST customer/deleteCustomerList | CustomersController | ServicioSAP | POST customer/deleteCustomerList (SS Controllers/CustomersController.cs:80) | partial | already_switched | CQ12; DMZ release | DMZ CustomersController.cs:106; E-04 delete verified 2026-08-10 |
| POST customer/cashCustomerReport | CustomersController | ServicioSAP | POST customer/cashCustomerReport (SS Controllers/CustomersController.cs:113) | partial | already_switched | SMB impersonation check in QA (Win32 1326 in dev); CQ20/CQ21 | DMZ CustomersController.cs:120 + DeserializeObject<ApiResponse>; E-13 share copy not verifiable from dev (ESTADO_PRUEBAS:63) |
| POST prospecto/rfc | ProspectoController | LAN | MISSING | n/a | needs_build | P2-Q1 source of RFCAnexoI-IV once Intelisis is off | DMZ ProspectoController.cs:23 curl.Post; LAN ProspectoController.cs:19; no rfc route in SS Controllers |
| POST prospecto/recuperarcuenta | ProspectoController | ServicioSAP | POST prospecto/recuperarcuenta (SS Controllers/ProspectoController.cs:19) | no | already_switched | P2-Q2..P2-Q5 (required fields, name matching, masking C17, filter escaping C12) | DMZ ProspectoController.cs:42 PostSAP; listed among the broken bridges in the 10-02 review |
| GET company/wholesale-customer/{wholesaleAccount} | WholesaleCustomerController | ServicioSAP | POST company/wholesale-customer (SS Controllers/WholesaleCustomerController.cs:14) | partial | already_switched | Account format sent by Magento (CX-24); P3-Q2 returned name | DMZ WholesaleCustomerController.cs:21 regex accepts only 8-10 digits (C accounts rejected), :27 PostSAP; LAN WholesaleCustomerController.cs:15 |
| POST company/negotiable-quote/create | WholesaleCustomerController | LAN | MISSING | n/a | blocked | P3-Q3 SAP document and wholesale org/channel/plant/agent/payment-term values (Ventas Mayoreo + SAP SD) | DMZ WholesaleCustomerController.cs:53 curl.Post; LAN WholesaleCustomerController.cs:26 |
| POST customer/wallet/details | WalletCustomerController | ServicioSAP | POST customer/wallet/details (SS Controllers/WalletCustomerController.cs:17) | no | already_switched | P4-Q1..P4-Q5 (destination, C10 uen, titular, key, side effect); BP as cliente (CX-07) | DMZ WalletCustomerController.cs:38 PostSAP; SS :17-56 ignores uen and returns a serialized string, errors 400 |
| GET customer/wallet/getCuentaC/{ordenCompra} | WalletCustomerController | LAN | MISSING | n/a | after_definitions | P4-Q7 retire or migrate (CX-26) | DMZ WalletCustomerController.cs:63 curl.Get('customer/getCuentaC/..'); LAN route is POST customer/wallet/getCuentaC/{idEcommerce} (LAN WalletCustomerController.cs:39-40): wrong path and verb today (C16) |
| POST customer/wallet/getMinimumCostToRedeem | WalletCustomerController | ServicioSAP | POST customer/wallet/getMinimumCostToRedeem (SS Controllers/WalletCustomerController.cs:58) | no | already_switched | P4-Q6 replicate C09 (AWS catalog VALOR1..4, DM01) | DMZ WalletCustomerController.cs:81 PostSAP (0230bca); C09 at GUIA_MIGRACION_FABLE.md:615 |
| POST status/getStatus | StatusController | LAN | MISSING | n/a | after_definitions | P5-Q1 scope and meaning of healthy (CX-26) | DMZ StatusController.cs:16 curl.Get to LAN [HttpGet] status/getStatus (LAN StatusController.cs:11, ICMP ping); discarded by Dev 3 2026-08-11 (_PLAN_MIGRACION_FECHAS.md:16, :139) |
| POST recommender/setRecommenderList | RecommenderController | LAN | MISSING | n/a | after_definitions | P6-Q1 confirm deprecated (CX-26) | DMZ RecommenderController.cs:39 curl.Post; LAN RecomenderController.cs:15; controller absent on origin/Production; 0 hits in Magento app/code |
| POST recommender/getRecommender | RecommenderController | LAN | MISSING | n/a | after_definitions | P6-Q1 (CX-26) | DMZ RecommenderController.cs:56; LAN RecomenderController.cs:31; absent on origin/Production |
| POST recommender/setCodes | RecommenderController | LAN | MISSING | n/a | after_definitions | P6-Q1 (CX-26) | DMZ RecommenderController.cs:80; LAN RecomenderController.cs:41; absent on origin/Production |
| POST order/ManagePaynetOrders | OrdersController | LAN | MISSING | n/a | blocked | R7d-4 AFECTAR/CANCELAR of a Paynet order in SAP (annulment API ZIDSTATUS=03) | DMZ OrdersController.cs:27 curl.Post; LAN OrdersController.cs:22; M-09 depends on spAfectar |
| GET order/getprueba | OrdersController | none/stub | n/a | n/a | out_of_scope | Remove (E-43 baja), coordinated with Magento | DMZ OrdersController.cs:43 returns a literal; not present on origin/Production |
| POST order/InsertPaymentData | OrdersController | LAN | MISSING | n/a | needs_build | R7d-3 where the Openpay installment payment is written (M-10, CXCCMensajeWebHookOpenPay) | DMZ OrdersController.cs:58 curl.Post('order/insertPaymentData'); LAN OrdersController.cs:55; caller Magento WebhookAbonosOpenpay/Helper/Data.php |
| POST order/GetIntelisisStatuses | OrdersController | LAN | MISSING | n/a | needs_build | R7e-2 invoice status per order in Magento vocabulary | DMZ OrdersController.cs:79; LAN OrdersController.cs:93 |
| POST order/getPosCancellations | OrdersController | LAN | MISSING | n/a | blocked | R7e-1 SAP source of POS cancellations by date (SD36 cannot list by date; tracker maps it to cancelInvoice, the inverse operation) | DMZ OrdersController.cs:98; LAN OrdersController.cs:113; caller Magento PosCancellationSync (admin-config URL) |
| POST order/setOrder | OrdersController | ServicioSAP | POST order/new (SS Controllers/OrderController.cs:17) | no | already_switched | Response contract (CX-14); BP in infoCliente.cuenta (CX-07); guest BP and Z1 agent per env (CX-36); status policy (CX-03) | DMZ OrdersController.cs:196 PostSAP, returns the deserialized object :214-227; SS OrderController.cs:26-34 returns {BP, SalesDocument, Message, Resultado}, errors 200 'Error, ...' :36-45; origin/Production: LAN only with 409/422/500 mapping; origin/Stage: LAN plus shadow order/new for non-credit (OrdersController.cs:180) |
| POST order/getGuide | OrdersController | ServicioSAP | POST order/getGuide (SS Controllers/OrderController.cs:200) | yes | already_switched | Confirm servicio_guias exists in the server data.db; DMZ release | DMZ OrdersController.cs:238 Json(PostSAP); E-05 seven cases on a simulated base (ESTADO_PRUEBAS:53) |
| POST order/sendStorePickupEmail | OrdersController | Magento | n/a | n/a | out_of_scope | None; stays in the DMZ (E-38) | DMZ OrdersController.cs:248 Magento helper sendPickupReadyEmail |
| POST order/GetPickUpCode | OrdersController | LAN | POST order/GetPickUpCode (SS Controllers/OrderController.cs:267) | yes | after_definitions | Switch with the writers' trigger relocated and Magento url_pickup_code pointed to the DMZ (CX-12, CX-13); DMZ setOrder deployed | DMZ OrdersController.cs:262 curl.Post; E-15 tested 2026-09-14 (200/404/400 parity); third writer ported in 61eb2c3 (SS OrderMethods.cs:1962-1969) |
| POST order/cancelOrder | OrdersController | ServicioSAP | POST order/cancelOrder (SS Controllers/OrderController.cs:144) | no | already_switched | R7b-1 tipo T/P, R7b-2 cancel without delivery, R7b-3 invoiced policy (CX-16) | DMZ OrdersController.cs:282 PostSAP, 'noexiste' becomes 400 at :291-292; SS OrderMethods.cs:3008-3011 builds ZSD_{tipo}_ from Magento's T/P |
| POST order/returnOrder | OrdersController | ServicioSAP | POST order/setreturn (SS Controllers/OrderController.cs:73) | partial | already_switched | R7b-5..R7b-8 (org/plant/channel, REF_DOC, motivo field, resolutions) | DMZ OrdersController.cs:317 PostSAP; Magento return body has no store |
| POST order/setOrderStatus | OrdersController | Magento | n/a | n/a | out_of_scope | Relocate the 5 LAN callers to the SS helper (R7-1, CX-19) | DMZ OrdersController.cs:331 mag.setOrderStatus; SS callers OrderStatusMethods.cs:21 and StorePickupMethods.cs:435 |
| GET order/getOrderInfo/{incrementId} | OrdersController | Magento | n/a | n/a | out_of_scope | None (E-39, no caller found) | DMZ OrdersController.cs:340 |
| GET order/jsonOrders/{incrementId} | OrdersController | Magento | n/a | n/a | out_of_scope | Retire with getOrderInfoAndSet (R7e-5) | DMZ OrdersController.cs:354; only caller LAN getOrderInfoAndSet; SS side retired (d6403ca) |
| POST order/setCAccount | OrdersController | Magento | n/a | n/a | out_of_scope | Magento endpoint must accept a BP; caller already relocated | DMZ OrdersController.cs:362; SS caller OrderMethods.cs:1953-1956 via URL_DMZ (:1295-1299); LAN Openpay caller only fires for C accounts (CHECKLIST_DEV3 E-28) |
| POST order/validateCredit | OrdersController | commented | n/a | n/a | out_of_scope | None (N/A); note it is live on origin/Production | DMZ OrdersController.cs:366-402 inside a comment; Magento 0 callers |
| POST order/updateCreditOrderId | OrdersController | LAN | MISSING | n/a | blocked | DU11 liberador + DU20 SAP OData for ZIdEcommerce (CX-18) | DMZ OrdersController.cs:411 curl.Post; LAN OrdersController.cs:507; caller Magento CreditoCheckout/Cron/PollCreditStatus.php |
| POST order/authorizationResult | OrdersController | Magento | n/a | n/a | out_of_scope | Fix callback keys (T1a) before the liberador is enabled (CX-17) | DMZ OrdersController.cs:421-458 HttpClient to URL_MAGENTO; model {entityId, status, cuenta, idSolicitud} (Models/CreditRequest.cs:212-218) vs SS payload {entity_id, status, customer_account, credit_request_id} (OrderMethods.cs:1257-1263) |
| GET order/creditStatus/{idSolicitud} | OrdersController | LAN | MISSING | n/a | blocked | DU11/T2a decision source of the status (CX-18) | DMZ OrdersController.cs:467 curl.Get; LAN OrdersController.cs:485; caller PollCreditStatus cron |
| GET order/estimated-delivery/{ecommerceId} | OrdersController | LAN | MISSING | n/a | blocked | R7e-3 carrier/guide/tracking source (ABAP + Logistics) | DMZ OrdersController.cs:494 curl.Get; LAN OrdersController.cs:536 |
| POST customerService/obtenerTipoGarantia | CustomerServiceController | LAN | MISSING | n/a | blocked | E-47 table structure (CX-35) | DMZ CustomerServiceController.cs:23; LAN CustomerServiceController.cs:15; ESTADO_PRUEBAS:69 at 0 % |
| POST customerService/obtenerVentanaConfirmacion | CustomerServiceController | LAN | MISSING | n/a | needs_build | R8-17 | DMZ CustomerServiceController.cs:35; LAN :24 |
| POST customerService/unirCuenta | CustomerServiceController | ServicioSAP | PATCH partner/client/unircuenta (SS Controllers/BusinessPartnerController.cs:78) | partial | already_switched | Magento sends the BP in cliente (CX-07); id_magento must be > 0 | DMZ CustomerServiceController.cs:52-67 maps cliente to partner_id and returns Ok(true/false); LAN :37 returned a bool from UPDATE Cte.IDMagento (LAN CustomerServiceMethods.cs:212-237); origin/Production: curl.Post to LAN |
| POST customerService/validarCliente | CustomerServiceController | ServicioSAP | POST customerService/validarCliente (SS Controllers/CustomerServiceController.cs:47) | partial | already_switched | R8-22 (two regressions) | DMZ CustomerServiceController.cs:77 PostSAP |
| POST customerService/nombreCliente | CustomerServiceController | LAN | MISSING | n/a | needs_build | R8-15 | DMZ CustomerServiceController.cs:89; LAN :55 |
| POST customerService/bitacoraAtencionClientes | CustomerServiceController | LAN | MISSING | n/a | needs_build | R8-20 (M-15, SP_ACTES_REGISTRO crosses ERPMAVI) | DMZ CustomerServiceController.cs:105; LAN :68 |
| POST customerService/obtenerCreditos | CustomerServiceController | LAN | POST customerService/obtenerCreditos (SS Controllers/CustomerServiceController.cs:118) | partial | after_definitions | R8-12..R8-14 (estatus, uen filter, fields and order) | DMZ CustomerServiceController.cs:118 curl.Post; SS built in 74d7c2f |
| POST customerService/obtenerQuejas | CustomerServiceController | ServicioSAP | POST customerService/obtenerQuejas (SS Controllers/CustomerServiceController.cs:20) | yes | already_switched | DMZ release | DMZ CustomerServiceController.cs:128 PostSAP; E-09 catalog byte-equal to LAN on 2026-09-03 |
| POST customerService/GetAccountDebts | CustomerServiceController | ServicioSAP | POST credit/GetAccountDebts (SS Controllers/AbonosController.cs:19) | no | already_switched | R8-21 / C08 collection rules and shape | DMZ CustomerServiceController.cs:146 PostSAP; LAN groups by CanalVenta (GUIA:621) |
| POST customerService/ApplyPaymentNeko | CustomerServiceController | LAN | credit/ApplyPaymentNeko (SS Controllers/AbonosController.cs:52) - stub that returns success | no | after_definitions | R8-07 is Neko alive; never bridge to the stub (CX-25) | DMZ CustomerServiceController.cs:164 PostWithoutThrowingError to LAN; C19 |
| POST customerService/ApplyPaymentAdvanced | CustomerServiceController | LAN | MISSING | n/a | blocked | R8-08 SAP write target for the payment intent (ABAP via Dev 4) | DMZ CustomerServiceController.cs:181; LAN :117 |
| POST customerService/UpdateStatusPaymentNeko | CustomerServiceController | LAN | credit/UpdateStatusPaymentNeko (SS Controllers/AbonosController.cs:72) - stub | no | after_definitions | R8-07 (CX-25) | DMZ CustomerServiceController.cs:197; LAN :128 |
| POST customerService/UpdateStatusPaymentAdvanced | CustomerServiceController | LAN | MISSING | n/a | blocked | R8-09 (ABAP via Dev 4) | DMZ CustomerServiceController.cs:207; LAN :135 |
| POST customerService/LoginClienteCredito | CustomerServiceController | ServicioSAP | POST customerService/LoginClienteCredito (SS Controllers/CustomerServiceController.cs:68) | partial | already_switched | R8-01..R8-05; BP as ClientNumber (CX-07) | DMZ CustomerServiceController.cs:218 PostSAP (212b04e); still curl.Post on origin/dbAndroid and origin/Production |
| POST customerService/LoginClienteCreditoFechaN | CustomerServiceController | ServicioSAP | POST customerService/LoginClienteCreditoFechaN (SS Controllers/CustomerServiceController.cs:89) | partial | already_switched | R8-01..R8-05; BP as ClientNumber (CX-07) | DMZ CustomerServiceController.cs:229 PostSAP (212b04e) |
| POST customerService/GetSTPAccount | CustomerServiceController | LAN | MISSING (internal reader GET credit/GetClabeSTP/{bp}, SS AbonosController.cs:100) | n/a | blocked | R8-08 write target (Dev 4 + ABAP) | DMZ CustomerServiceController.cs:240; LAN :188 |
| POST customerService/GetSalesChannelsSTP | CustomerServiceController | LAN | MISSING | n/a | needs_build | R8-11 canales_de_venta vs legacy CanalVenta ids | DMZ CustomerServiceController.cs:251; LAN :195 |
| GET customerService/ValidateSTPAccount | CustomerServiceController | LAN | MISSING (internal GetClabeSTP) | n/a | needs_build | R8-10 'cuenta' (CLABE) | DMZ CustomerServiceController.cs:262 curl.Get; LAN :202 |
| POST customerService/bbvaKeyNeko | CustomerServiceController | LAN | MISSING | n/a | after_definitions | R8-07 (CX-25) | DMZ CustomerServiceController.cs:272 curl.Get; LAN :142 |
| POST customerService/bbvaKeyAdvanced | CustomerServiceController | ServicioSAP | GET customerService/bbvaKeyAdvanced (SS Controllers/CustomerServiceController.cs:31) | yes | already_switched | DMZ release; MULTIPAGOS_APIKEY_URL/CODIGO_ENT per env | DMZ CustomerServiceController.cs:289 GetSAP; E-10 bodies SHA-256 equal to LAN |
| POST customerService/validarCoberturaPorCP | CustomerServiceController | LAN | MISSING (internal sepomex/validarcp) | n/a | needs_build | R8-16 what counts as coverage | DMZ CustomerServiceController.cs:310; LAN :213 |
| POST customerService/ObtenerEstatusEmbarque | CustomerServiceController | LAN | MISSING | n/a | blocked | ABAP equivalents of Embarque/EmbarquesMov | DMZ CustomerServiceController.cs:326; LAN :226 |
| POST customerService/ActualizarCamposConfigurables | CustomerServiceController | LAN | MISSING | n/a | after_definitions | R8-18 retire (E-40) (CX-26) | DMZ CustomerServiceController.cs:342; no LAN route (dangling proxy); absent on origin/Production; Magento TablerateMavi has admin-config URLs (system.xml:58-67) |
| POST customerService/InsertarDesdeTablerateNativo | CustomerServiceController | LAN | MISSING | n/a | after_definitions | R8-18 retire (E-41) (CX-26) | DMZ CustomerServiceController.cs:354; no LAN route; absent on origin/Production |
| POST customerService/InsertarDesdeTablerateCustom | CustomerServiceController | LAN | MISSING | n/a | after_definitions | R8-18 retire (E-42) (CX-26) | DMZ CustomerServiceController.cs:366; no LAN route; absent on origin/Production |
| POST customerService/GetEmpleadoByNomina | CustomerServiceController | LAN | MISSING (internal GET partner/successfactor/employee/{userId}, SS BusinessPartnerController.cs:169) | n/a | needs_build | R8-06 {Nomina, Nombre} wrapper (Dev 2 S7-01) | DMZ CustomerServiceController.cs:382; LAN :236 |
| GET credit/getClienteSaldo/{cliente} | CreditController | LAN | MISSING | n/a | blocked | R9-06/R9-07 (N1/N2 captures, N4-N16) | DMZ CreditController.cs:23 curl.Get; LAN CreditController.cs:98 |
| GET credit/getClienteFactura/{cliente}/{factura} | CreditController | ServicioSAP | POST credit/getClienteFactura/{cliente}/{factura} (SS Controllers/AbonosController.cs:35) | no | already_switched | R9-03 response contract (CX-23) | DMZ CreditController.cs:51 PostSAP then JObject.Parse :58; SS returns a list of parcialidades, so the DMZ answers 500 |
| POST credit/getSms | CreditController | LAN | POST credit/getSms (SS Controllers/CreditController.cs:46) | partial | after_definitions | CX-10 (NIP-1, gate port), CX-11 dispatcher, CX-07 BP | DMZ CreditController.cs:76 curl.Post; SS codes 3/0/-1/err mapped by DMZ :78-95 |
| POST credit/validateSms | CreditController | LAN | POST credit/validateSms (SS Controllers/CreditController.cs:69) | partial | after_definitions | CX-10 | DMZ CreditController.cs:107 curl.Post; SS codes 5/6/exception |
| POST credit/codigoPromocion | CreditController | LAN | POST credit/codigoPromocion (SS Controllers/CreditController.cs:26) - NEW since 10-02 | partial | after_definitions | CX-09 switch (E-45) or retire (DU16) | DMZ CreditController.cs:135 curl.Post; SS added in 7b7ca34 (merged in 6214ed8); E-45 tested 2026-09-24; Elimina returns '' vs LAN 'Eliminado'; cutover commit 97d6aea not in any fetched DMZ ref |
| POST credit/CreditoWeb_FormDatos | CreditController | LAN | MISSING | n/a | after_definitions | R9-10 Credilana boundary (CX-27) | DMZ CreditController.cs:149; LAN :144; callers Magento CreditMigration and ProductosMX |
| POST credit/CreditoWeb_SaveFirstData | CreditController | LAN | MISSING | n/a | after_definitions | R9-15 ProductosMX scope and timing (CX-27) | DMZ CreditController.cs:164; LAN :186 |
| POST credit/CreditoWeb_SaveData_Articulos | CreditController | LAN | MISSING | n/a | after_definitions | R9-15 (CX-27) | DMZ CreditController.cs:178; LAN :208 |
| POST credit/codigoRecomendado | CreditController | LAN | MISSING | n/a | after_definitions | R9-11 deprecation (CX-26) | DMZ CreditController.cs:193; LAN :237 |
| POST credit/codigoRecomendadoWithUen | CreditController | LAN | MISSING | n/a | after_definitions | R9-11 (CX-26) | DMZ CreditController.cs:206; LAN :256; Dev 3: not in gap scope |
| POST credit/SaveImagesProductosMx | CreditController | ServicioSAP | POST credit/SaveImagesProductosMx (SS Controllers/CreditController.cs:179) | yes | already_switched | IMAGES_CREDIT_PATH writable by the app pool; consumer of the old folder | DMZ CreditController.cs:221 PostSAP; E-08 parity 2026-09-03 |
| POST credit/MonederoSaldoCredito | CreditController | LAN | MISSING | n/a | blocked | R9-08 wallet balance source | DMZ CreditController.cs:235; LAN :468 |
| POST credit/GetUnificationWalletStatus | CreditController | LAN | MISSING | n/a | blocked | R9-09 CREDIHUnificacionMonedero (ABAP, Dev 2) | DMZ CreditController.cs:243; LAN :489 |
| POST credit/CheckAccountsPreUnification | CreditController | LAN | MISSING | n/a | blocked | R9-09 | DMZ CreditController.cs:251; LAN :506 |
| POST credit/SetUnificationWalletData | CreditController | LAN | MISSING | n/a | blocked | R9-09 | DMZ CreditController.cs:259; LAN :524 |
| POST credit/SaveHaztenTransaction | CreditController | LAN | MISSING | n/a | after_definitions | R9-15 (M-08, 25 % in a stash) (CX-27) | DMZ CreditController.cs:268; LAN :424; caller Magento Hazten/Cron/SyncTransaction.php |
| GET credit/getCreditAccount/{pAccount} | CreditController | LAN | MISSING | n/a | needs_build | R9-13 resolve a prospect to its client | DMZ CreditController.cs:279 curl.Get; LAN :438; caller Magento ProspectTracking cron |
| POST credit/GetPhoneValidatedClientSecretName | CreditController | LAN | MISSING | n/a | needs_build | R9-14/TQ-8; gates the getSms switch (CX-10) | DMZ CreditController.cs:296; LAN :541 |
| POST credit/SendSmsNewNumber | CreditController | ServicioSAP | POST credit/SendSmsNewNumber (SS Controllers/CreditController.cs:15) | yes | already_switched | Dispatcher sends BP-keyed rows (CX-11); SMS channel | DMZ CreditController.cs:308 PostSAP (c7d1d29); E-01 contract verified 2026-08-06, SMS delivery unverified |
| POST credit/SolicitudMercancia | CreditController | LAN | MISSING | n/a | after_definitions | R9-12 APP mercancías or not (CX-27) | DMZ CreditController.cs:325; LAN :559; E-44 at 65 % with no SS route |
| POST credit/CreditoWeb_Informacion | CreditController | LAN | MISSING | n/a | after_definitions | R9-10 (CX-27) | DMZ CreditController.cs:340; LAN :288 |
| POST credit/GetCreditAmounts | CreditController | ServicioSAP | POST credit/GetCreditAmounts (SS Controllers/CreditController.cs:115) | partial | already_switched | R9-04 owner who fills mavi_credilana_info (CX-22) | DMZ CreditController.cs:352 PostSAP; answers 500 to everything while the table is empty (ESTADO_PRUEBAS:599) |
| POST credit/CreditoWeb_Solicitud | CreditController | LAN | MISSING | n/a | after_definitions | R9-10 (CX-27) | DMZ CreditController.cs:364; LAN :339 |
| POST credit/Validar_Lada | CreditController | LAN | MISSING | n/a | after_definitions | R9-11 (CX-26) | DMZ CreditController.cs:376; LAN :364 |
| POST credit/ExistRFCAndPhoneCte | CreditController | LAN | MISSING | n/a | after_definitions | R9-11 confirm retirement (CX-26) | DMZ CreditController.cs:388; LAN :375 returns a constant; discarded by Dev 3 2026-08-11 |
| POST credit/CreditoWeb_SolicitudPrimerGuardado | CreditController | LAN | MISSING | n/a | after_definitions | R9-10 (CX-27) | DMZ CreditController.cs:399; LAN :352 |
| POST credit/CreditoWeb_Seguro | CreditController | LAN | MISSING | n/a | out_of_scope | Credilana (confirmed, SKILL rule 15) | DMZ CreditController.cs:411; LAN :386 |
| POST credit/CreditoWeb_SaveData | CreditController | LAN | MISSING (only the @Op='Insert' logic is ported, inside the credit branch of order/new) | n/a | after_definitions | R9-10 who still calls the route (CX-27) | DMZ CreditController.cs:423; LAN :404 |
| GET credit/getPlazos | CreditController | ServicioSAP | GET credit/getPlazos (SS Controllers/CreditController.cs:90) | partial | already_switched | Accept the error-shape difference (200 empty lists vs LAN 200 {Error:true}) | DMZ CreditController.cs:439 GetSAP; E-46 tested 2026-09-23 |
| POST credit/guardardocumento | CreditController | ServicioSAP | POST credit/guardardocumento (SS Controllers/CreditController.cs:154) | yes | already_switched | R9-05 [AllowAnonymous] on the DMZ (CX-21); Cliente must be a BP starting with 15 (CX-07) | DMZ CreditController.cs:448-511 PostSAP; E-07 nine cases against AdminDoc |
| POST product/updateProduct/{store} | ProductsController | Magento | n/a | n/a | out_of_scope | P10-1; caller is the LAN ImportApp (Ola 8.4) (CX-19) | DMZ ProductsController.cs:31 mag.updateProduct |
| POST product/updateConfigurableProduct/{store} | ProductsController | Magento | n/a | n/a | out_of_scope | P10-1 (CX-19) | DMZ ProductsController.cs:40 |
| POST product/updateConfigurableProductLink/{sku} | ProductsController | Magento | n/a | n/a | out_of_scope | P10-2 no code caller | DMZ ProductsController.cs:49 |
| POST product/updateStock | ProductsController | Magento | n/a | n/a | out_of_scope | P10-1; E-24 deleteReservations chain (CX-19) | DMZ ProductsController.cs:58 |
| POST product/getStockByStore | ProductsController | none/stub | n/a | n/a | out_of_scope | P10-2 | DMZ ProductsController.cs:65 returns the literal 'stores' |
| POST product/updatePrice | ProductsController | Magento | n/a | n/a | out_of_scope | P10-1 | DMZ ProductsController.cs:74 |
| POST product/uploadImage | ProductsController | none/stub | n/a | n/a | out_of_scope | P10-1 | DMZ ProductsController.cs:79-98 DMZ-local: writes files to C:/inetpub/wwwroot/api/images/, no backend call |
| POST product/uploadImagesToMagento | ProductsController | Magento | n/a | n/a | out_of_scope | P10-1; HOST/USER/PASS_MAGENTO per env | DMZ ProductsController.cs:102-123 SFTP via Metodos/ProductMethods.cs |
| GET magento/attributes | MagentoController | Magento | n/a (SS caller catalog/attributes E-16) | n/a | out_of_scope | P11-1; scheduler (CX-19) | DMZ MagentoController.cs:14 |
| GET magento/general/attributes | MagentoController | Magento | n/a (SS caller E-17) | n/a | out_of_scope | P11-1 | DMZ MagentoController.cs:22 |
| GET magento/attributeSets | MagentoController | Magento | n/a (SS caller E-18) | n/a | out_of_scope | P11-1 | DMZ MagentoController.cs:30 |
| GET magento/attributeSetChildren/{id} | MagentoController | Magento | n/a (SS caller E-19) | n/a | out_of_scope | P11-1; E-19 MySQL/Intelisis legs pending; re-test after 9008609 | DMZ MagentoController.cs:38; E-19 failed with JsonReaderException on 2026-09-15 |
| GET magento/categories | MagentoController | Magento | n/a (SS caller E-20) | n/a | out_of_scope | P11-1 | DMZ MagentoController.cs:46 |
| GET magento/children/{page}/{size}/{store} | MagentoController | Magento | n/a (SS caller E-21) | n/a | out_of_scope | P11-1; re-test after 9008609 | DMZ MagentoController.cs:54 |
| GET magento/noImagenProduct/{store} | MagentoController | Magento | n/a | n/a | out_of_scope | Retired 2026-09-08 (no caller) | DMZ MagentoController.cs:62 |
| GET magento/productWithWebsites/{page}/{size} | MagentoController | Magento | n/a (SS caller E-22, MagentoCatalogMethods.cs:325) | n/a | out_of_scope | Keep this template when merging with Production (CX-01) | DMZ MagentoController.cs:70; origin/Production exposes only productWithWebsites/{page}/{size}/{sku} |
| GET magento/getOrderId/{incrementId} | MagentoController | Magento | n/a | n/a | out_of_scope | Retired 2026-09-21 (BAJA_getOrderId.md) | DMZ MagentoController.cs:78 |
| GET magento/deletePromociones | MagentoController | Magento | n/a (SS caller E-23) | n/a | out_of_scope | Scheduler owner; writes to Magento | DMZ MagentoController.cs:90 |
| GET magento/deleteReservations | MagentoController | Magento | n/a (SS caller E-24) | n/a | out_of_scope | Scheduler owner; writes to Magento | DMZ MagentoController.cs:103 |
| POST magento/getCuenta | MagentoController | Magento | n/a (SS caller E-11, MagentoAccountMethods.cs:24) | n/a | out_of_scope | None | DMZ MagentoController.cs:112 |
| POST magento/setCuenta | MagentoController | Magento | n/a (SS caller E-12, MagentoAccountMethods.cs:34) | n/a | out_of_scope | None | DMZ MagentoController.cs:121 |
| POST login/authenticate | LoginController | none/stub | n/a | n/a | out_of_scope | P13-1 stays DMZ-local; USER/PASS hash keys per env (CX-04) | DMZ LoginController.cs:17 DMZ-local JWT issuer; reads salts from Web.config on ConexionSAP, literals on origin/Production |
| POST logging | LoggingController | none/stub | n/a | n/a | out_of_scope | None; DMZ-local sink | DMZ LogService/LoggingController.cs:40; API key hard-coded in LogService/Filters.cs; absent on origin/Production |
| POST mercancias/getAbonos | MercanciaController | LAN | MISSING | n/a | out_of_scope | APP mercancías owner (P12-1); on ConexionSAP depends on ServicioSAP login (CX-02) | DMZ MercanciaController.cs:26 new Curl().Post; LAN MercanciaController.cs:17 |
| POST mercancias/getProximosPagos | MercanciaController | LAN | MISSING | n/a | out_of_scope | P12-1 (CX-02) | DMZ MercanciaController.cs:41; LAN :26 |
| POST mercancias/getSaldoVencido | MercanciaController | LAN | MISSING | n/a | out_of_scope | P12-1 (CX-02) | DMZ MercanciaController.cs:69; LAN :35 |
| POST mercancias/getLimiteMercancia | MercanciaController | LAN | MISSING | n/a | out_of_scope | P12-1 (CX-02) | DMZ MercanciaController.cs:83; LAN :44 |
| POST mercancias/ValidarTelefono | MercanciaController | LAN | MISSING | n/a | out_of_scope | P12-1 (CX-02) | DMZ MercanciaController.cs:95; LAN :53 |

## 5. Definiciones para empezar los cambios (formato explícito)

**D-01** · plan-wide · Fable prompts (baseline) · `plan_or_doc_fix` · CHANGED
- Qué: The pre-flight check expects 'HEAD 2cf425f with only the 4 credit files modified'.
- LAN: N/A (repository state).
- ServicioSAP/DMZ: 01_CustomersController.md:32, :1105, :1136, :1284; CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:1135, :1279; ACTIVIDADES:150. Actual state: HEAD 6214ed8 with a clean tree; the credit work is commit 05df55a (verified).
- Ejemplo: Fable runs git status, sees a clean tree at 6214ed8 and stops, following 'si algo no cuadra, detente'.
- Opciones: A: 'HEAD 6214ed8 or a descendant; this session's files unmodified; report any other modified file and leave it alone' · B: Pin exactly 6214ed8 with a clean tree · C: Check only the content of the cited lines
- Recomendación: A plus C as a standing rule. Take the base diff at session start.
- Decide: User
- Bloquea: S1, S2, CREDITO S1 (every Fable session)

**D-02** · plan-wide · line citations (CREDITO §6.2/§6.4, 01 spec) · `plan_or_doc_fix` · CHANGED
- Qué: The file:line citations in the credit plan and the 01 spec have moved since the merge.
- LAN: N/A (LAN citations are still valid).
- ServicioSAP/DMZ: Examples: T1a OM:1194-1282 is now :1200-1288; R1 OM:626/:654 is now :622/:647; the empty-Partner guard is now OM:2649-2654; DeterminarSalesOrg is now :341-352; EscapeSapFilterValue is now :2992-2995.
- Ejemplo: T1a step 2 'borrar OM:1217-1218' would now delete the closing brace of the USER_DMZ fallback.
- Opciones: A: Re-cite every line at 6214ed8 · B: Anchor each edit on the quoted 'Antes' code and treat line numbers as informative · C: Both
- Recomendación: C. Fable can draft the re-citation in a doc-only session for you to approve.
- Decide: User
- Bloquea: CREDITO S1/S3, package 1 S4/S5

**D-03** · plan-wide · build step (V1) · `plan_or_doc_fix` · CHANGED
- Qué: One build command and one accepted-warnings list for every session.
- LAN: N/A
- ServicioSAP/DMZ: GUIA_MIGRACION_FABLE.md:671 uses Z:\ (no Z: drive exists, verified), and PLAN:69 and 01:68/:1098/:1130 point there. 01 §0.5 uses Framework64 MSBuild on the UNC path. CREDITO :144-149 says Framework64 cannot resolve ToolsVersion 15.0 and that the path hits MAX_PATH. VS18 MSBuild and quick_build.ps1 both exist (verified). 01:76 accepts 2 warnings; the 2026-10-01 build also showed MSB3245, MSB3247 and MSB3270 (BR:4226).
- Ejemplo: Fable runs §9b, cannot find Z:\, and stops. Or it sees MSB3245 and reports V1 as failed.
- Opciones: A: VS18 MSBuild on the UNC csproj, with a short local OutDir and BaseIntermediateOutputPath · B: robocopy to a short local path, then VS18 MSBuild · C: Framework64 MSBuild with the Roslyn flags (01 §0.5)
- Recomendación: You or Marcos run A once (B if MAX_PATH fails). Write the winner, with quick_build.ps1 as the syntax pre-check and the BR:4226 warning list, into GUIA §9b, PLAN:69 and 01 §0.5. Never build into the share's bin.
- Decide: User + Marcos
- Bloquea: The MSBuild closure criterion of every code session

**D-04** · plan-wide · X-2 HTTP status policy · `business_rule` · STILL_OPEN
- Qué: Status and body that each route returns on failure.
- LAN: Varies by route. LAN CustomersController.cs:15-21 has no try, so it returns 500 and the DMZ answers 400. LAN OrdersController.cs:139-161 always returns 200. LAN Helper/Curl.cs:105-108 returns 200 with e.Message.
- ServicioSAP/DMZ: PLAN:66 and GUIA:166-170 say 'always 200'. The code returns 400/500 in BusinessPartnerController.cs:50-53, OrderController setreturn and CreditController.cs:36-39. DMZ Curl.cs:130-141 turns any 4xx/5xx into a 200 'WebException' text.
- Ejemplo: setCustomer with a BP01 error: through LAN, Magento got 400 with an empty body; through ServicioSAP it gets 200 'WebException ... (400)'.
- Opciones: A: Match LAN per route · B: Always 200 · C: Decide route by route, defaulting to A
- Recomendación: C, defaulting to A. Fable never changes an existing status code without a rule for that route. Correct PLAN:66 and GUIA §1.5.
- Decide: User + Magento owner
- Bloquea: Package 1 S3/S4, 7a/7b, 8a-1, E-45/E-46 closure, every closure criterion

**D-05** · plan-wide · Business Rules Ecommerce resync · `plan_or_doc_fix` · NEW
- Qué: Business Rules, the single source of truth, is behind HEAD 6214ed8, and X-1 only covers Fable's own changes.
- LAN: N/A
- ServicioSAP/DMZ: BR (2026-10-01 13:38, verified) has no block for credit/codigoPromocion and says at :588 that the route does not exist. It says 110 routes (now 111). RORD-34 (:474) predates the bank-transfer pickup writer. RCLI-14/16, RCOM-6 and RPR-123 describe a login on every attempt. The catalog citations point to removed lines, and the CreditController citations are off by about 16 lines.
- Ejemplo: A package 9 session reads BR, concludes codigoPromocion must be built, and duplicates E-45.
- Opciones: A: One doc-only resync of the blocks touched by 2cf425f..6214ed8, done by Fable with your approval · B: The commit authors update BR · C: Each session fixes only its own routes
- Recomendación: A now (it unlocks packages 1, 7, 9 and 11), then C as a standing rule. Add a 'code baseline' hash at the top of BR.
- Decide: User (+ Diego and dsvalle for their commits)
- Bloquea: Accuracy of the S2 kits; package 7, 9 and 11 sessions

**D-06** · plan-wide · commit and branch policy · `plan_or_doc_fix` · NEW
- Qué: Whether Fable output is committed, and by whom, now that the credit work has been committed and pushed.
- LAN: N/A
- ServicioSAP/DMZ: CREDITO §4.2 (2026-09-25) and every prompt say 'sin commit'. 05df55a mixed E5 and DU18 into the credit commit. GUIA §1.8b requires any value that travels to SAP to be in its own commit. The share working copy is shared with other developers' merges.
- Ejemplo: R1 and R3 are left uncommitted, a later merge on the share mixes them in, and reverting R1 alone is no longer one revert.
- Opciones: A: Fable never commits; you commit each task separately after review · B: Fable works on its own branch or worktree and you merge · C: Leave changes uncommitted
- Recomendación: A. Record it in CREDITO §6.6 and in the 01 prompts.
- Decide: User
- Bloquea: Closure of CREDITO S1 and package 1 S1/S2

**D-07** · plan-wide · LAN reference branch for parity · `scope` · NEW
- Qué: Which LAN branch 'LAN' means. PLAN:60 says only 'El controlador de LAN homólogo'.
- LAN: Local stage-delta 68b2290 vs origin/Production 9310462: 367 commits and 37 files differ. Production calls product/updateConfigurableProductLink (Metodos/ProductMethods.cs:1784, verified) and runs deletePromociones after generaEtiqueta (ProductsController.cs:91, :95).
- ServicioSAP/DMZ: The ServicioSAP ports follow stage-delta (e.g. E-22 at MagentoCatalogMethods.cs:325).
- Ejemplo: E-22 was ported from stage-delta and gets 404 against the production DMZ template.
- Opciones: A: origin/Production, fetched first, is the reference; stage-delta only for features not yet in production · B: stage-delta · C: Decide per route in each spec
- Recomendación: A. Put the branch and fetch date in PLAN mandatory reading item 3 and in every spec.
- Decide: User + LAN owner (Uriel Valencia)
- Bloquea: Every parity claim; packages 10/11

**D-08** · plan-wide · route ownership (Fable vs Dev 2/3/4) · `scope` · CHANGED
- Qué: Who owns each route that the Fable packages share with developer roadmaps.
- LAN: N/A
- ServicioSAP/DMZ: The Dev 2 Gantt assigns prospecto/rfc, recuperarcuenta, wholesale-customer, getMinimumCostToRedeem, negotiable-quote and getRecommender. Dev 3 has E-xx/M-xx in packages 1, 7, 8 and 9: M-06/M-11 sit at 0% although they are coded, and M-01..M-05 are Credilana work scheduled in October. GetPhoneValidatedClientSecretName has no owner.
- Ejemplo: Fable fixes recuperarcuenta parity while Dev 2 starts the same route in its November slot, and two divergent edits land on ProspectoController.cs.
- Opciones: A: One ownership table per route; Fable only does parity fixes on routes already in ServicioSAP · B: Developers keep everything and Fable is limited to package 1 · C: Fable takes over
- Recomendación: A. Tell Dev 3 now about Credilana (D-50), M-03 (D-49) and E-44.
- Decide: User
- Bloquea: Sessions for packages 2-4 and 7-9

**D-09** · plan-wide · SKILL.md vs spec session rules + E2E · `plan_or_doc_fix` · NEW
- Qué: SKILL.md tells Fable to write vault documents and read files that do not exist, and says Fable runs the E2E. The specs forbid both.
- LAN: N/A
- ServicioSAP/DMZ: SKILL.md:22 and :27 (feed the docs; Resources/master_migration_log.md is missing), :51 rule 11 (bp_agente.md and bp_address.md are missing), :24 rule 5 (stop when a file is missing), :65 rule 25 (Fable runs the E2E). Against them: PLAN:71 and 01:82-86 (no endpoint calls; only Business Rules may be edited).
- Ejemplo: A BP mapping task looks for bp_agente.md, cannot find it, and stops.
- Opciones: A: Add a 'Fable session overrides' block to PLAN: no vault writes except BR (X-1); a list of missing-file replacements; E2E = Fable prepares the request and expected result, you run it, Fable compares · B: Fix SKILL.md (needs your approval under rule 23) · C: Both
- Recomendación: C: A now, B later.
- Decide: User
- Bloquea: Every session (risk of an unexpected stop or an unauthorized doc write)

**D-10** · plan-wide · inline OData paths (X-3) · `plan_or_doc_fix` · STILL_OPEN
- Qué: SKILL rule 20 (paths go in Web.config) conflicts with GUIA §1.9b (no new keys without asking) and with the code, which has 48 inline service paths.
- LAN: N/A
- ServicioSAP/DMZ: SKILL.md:60; GUIA:143, :275. The inline paths are in 10 Methods files.
- Ejemplo: While building prospecto/rfc on ZQBC_CODEMSTRD_SRV, Fable must either break rule 20 or invent a key.
- Opciones: A: Amend rule 20 to 'follow the existing pattern of the file; no new key without approval' · B: Pre-approve one key per new service · C: Centralize together with C-05
- Recomendación: A now, C later.
- Decide: User + Marcos/Diego
- Bloquea: Any new S/4 service call (packages 2-9)

**D-11** · plan-wide · destination-database and SIGMAVI naming rules · `plan_or_doc_fix` · NEW
- Qué: Add the vault's destination rule and the SIGMAVI naming rule to PLAN 'Lo que se aplica a TODOS', and settle VTWEG vs SPART.
- LAN: LAN Conn/Connection.cs:26 (IntelisisTmp on MAVICUBOS), :28 (ServicioAndroid).
- ServicioSAP/DMZ: CHECKLIST_MIGRACION:25-34 (ServicioAndroid, AdminDoc, SIGMAVI and SQLite stay; IntelisisTmp does not; never test against it). CHECKLIST_DEV3:317-319 and nomenclatura:13-44 (SAP technical column names; the source names VTWEG for both division and channel). GUIA has 0 hits for IntelisisTmp.
- Ejemplo: For the package 2 RFC annex tables, Fable creates 'VTASCRFCAnexoI' with a 'Familia' column, or tests against IntelisisTmp.
- Opciones: A: Add both rules to PLAN and GUIA §1; Miguel A. Aguilar Marín confirms VTWEG/SPART · B: Leave them in the Dev 3 checklists only
- Recomendación: A.
- Decide: User + Miguel A. Aguilar Marín
- Bloquea: Any new SIGMAVI table (packages 2, 3, 8)

**D-12** · plan-wide · DMZ response body shape (GUIA R-04) · `plan_or_doc_fix` · NEW
- Qué: Unify the DMZ response wrappers, or preserve each route's body as it is.
- LAN: Each LAN contract has its own shape (getGuide returns Json(...); GetCreditAmounts returns Ok(string)).
- ServicioSAP/DMZ: DMZ OrdersController.cs:238 Json(PostSAP(...)) returns a double-encoded string; CreditController.cs:352 Ok(...Trim('"')). Contratos/README.md:67-80 says preserve; GUIA §8.5 R-04 says unify now.
- Ejemplo: Fable changes getGuide to Ok(object), and Magento's parser for the double-encoded string breaks.
- Opciones: A: Preserve per route; do R-04 after the cutover, together with Magento · B: Unify now, with Magento changes
- Recomendación: A. Amend R-04 so Fable does not apply it.
- Decide: User + Magento owner
- Bloquea: Every bridge change

**D-13** · plan-wide · missing specs 02-14 and stale PLAN text · `plan_or_doc_fix` · CHANGED
- Qué: Only spec 01 exists. PLAN counts and the package text are wrong.
- LAN: N/A
- ServicioSAP/DMZ: PLAN:20-48 says 120 routes, 22 SAP / 60 LAN / 38 delegated. Actual: 119 live, 26 SAP / 63 LAN / 25 Magento / 5 local. PLAN §7 says 'setreturn ya está en producción' (false: origin/Production sends returnOrder to LAN) and 'falta URL del liberador' (the keys exist). PLAN:118, :156 and :198 are wrong. PLAN:88-96 says 'verificar, no construir', but the specs include build tasks.
- Ejemplo: Fable sizes package 4 as 2 pending routes; only 1 still goes to LAN.
- Opciones: A: One doc-only session that corrects PLAN with the merged findings, then small specs per sub-package · B: Full specs 02-09 now · C: Defer until package 1 has calibrated the method
- Recomendación: A. Draft the specs in this order: 8a-1 Logins, 9a getSms/validateSms, E-45, 7b, then 02/04 once their scope gates are answered.
- Decide: User
- Bloquea: Every session for packages 2-14

**D-14** · 1 · customer/setCustomer → partner/client (T1.1-02, N1) · `business_rule` · STILL_OPEN
- Qué: The BP Fiscalregimen value: '605', as LAN writes, or empty, as today.
- LAN: SPsOrden/SP_eCommerceCtenuevo.sql:109, :114 write '605'; Cte.RFC stays empty (:129).
- ServicioSAP/DMZ: BusinessPartnerMethods.cs:578 sends Fiscalregimen = "" (verified), and :516 sends the generic RFC XAXX010101000. The spec still lists T1.1-02 as LISTO in the S1 prompt (01:1091, :1102, :1115).
- Ejemplo: A new web BP would carry 605 together with XAXX010101000, a pairing LAN never produced.
- Opciones: A: '605' in its own commit · B: Keep empty as an accepted difference · C: Whatever value SAP FI/SD gives
- Recomendación: Take T1.1-02 out of S1 now and apply the answer later in its own commit.
- Decide: User + SAP FI/SD fiscal owner
- Bloquea: S1 as written

**D-15** · 1 · partner/client/filter (BP05) step 0 for T1.1-03 · `data_or_capture` · STILL_OPEN
- Qué: The form of the ZidMagento filter that S1 prepares and you run.
- LAN: SP_eCommerceCtenuevo.sql:62-68 searches by IdMagento, plus eMail1 when the id is 2 or less.
- ServicioSAP/DMZ: The spec builds the filter with quotes (01:323, :370) and also asks for a Mail GET (:1117). ZidMagento is an int (Partner.cs:36). Web.config:108 path='*.' means an email in the route segment can return 404.
- Ejemplo: GET partner/client/filter/ZidMagento eq <ID_PRUEBA> should return d.results.
- Opciones: A: Unquoted first, quoted only if that fails; drop the Mail GET · B: Keep it as written
- Recomendación: A. If both forms fail, T1.1-03 goes to SAP/ABAP.
- Decide: User
- Bloquea: S1 deliverable 2; S5

**D-16** · 1 · Business Rules scope for S1 (X-1 applied) · `plan_or_doc_fix` · NEW
- Qué: Exactly which Business Rules text S1 updates.
- LAN: N/A
- ServicioSAP/DMZ: BR :1685 (the route returns the Client), :1690 and its repeat at 'Pendientes globales' :4387 (rule 6 says to change both). The block cites OrderMethods.cs:2655/:2659/:2688, now :2696/:2700/:2729. The S1 prompt (01:1116) names only the block.
- Ejemplo: Fable changes :1685 but leaves :4387, so BR contradicts itself.
- Opciones: A: Update :1652-1690 and :4387, and fix moved citations inside that block only · B: Only :1685/:1690 · C: You do it
- Recomendación: A. Add one line to 01:1116.
- Decide: User
- Bloquea: S1 closure

**D-17** · 1 · customer/getCuenta, setCuenta (S2 kits, S3 T1.C-01) · `plan_or_doc_fix` · NEW
- Qué: The test kits and rules were written for the old DMZ Curl in ServicioSAP.
- LAN: LAN Helper/Curl.cs:21-39 logs in once per instance; :105-108 returns 200 with e.Message.
- ServicioSAP/DMZ: Curl.cs now has a static HttpClient (:15), a 20-minute token (:55-91), one re-login on 401 (:133-140), retries (:118-157) and a final throw (:159). Stale text: 01:227, :829, :836-840, :894-895, :1018-1022 and BR RCLI-14/16.
- Ejemplo: S2 writes the 1.7-R13 latency as '≈186 s, login every attempt', but no per-attempt login exists any more.
- Opciones: A: Refresh §2.3/§3.6/§3.7/§3.9 before S3 · B: S2 prepares only happy-path and validation cases (T1.6-01 cases 1-7, T1.7-01) · C: S2 re-derives the failure cases from the code
- Recomendación: B now, then A before S3 (CQ24 depends on it).
- Decide: User
- Bloquea: S2 kits; S3

**D-18** · 1 · setCustomer names and case (CQ1 + CQ10) · `business_rule` · STILL_OPEN
- Qué: Which request field fills NameFirst, NameLast and NameLst2; whether names and email are uppercased; what Magento really sends.
- LAN: LAN CustomerMethods.cs:21-23 (name = apellido paterno, lastName2 = nombres). SP_eCommerceCtenuevo.sql:115-118, :133 apply UPPER().
- ServicioSAP/DMZ: BusinessPartnerMethods.cs:422-424 and :477-479 trim only; :427/:514 send the email raw; MapGender maps 'M' to 2. Magento app/code has no caller (the URL comes from admin config). DU12 says uppercase like LAN; DU13 fixes the field order for credit.
- Ejemplo: {name:'Ana', lastName:'Lopez', lastName2:'Ruiz'}: LAN stores PersonalNombres=RUIZ; SAP stores NameFirst=Ana.
- Opciones: A: Swap fields and uppercase · B: Uppercase only · C: No change
- Recomendación: Capture one real anonymized payload first. Then B if name is the first name. Check gender in the same capture.
- Decide: User + Magento/Omnipro team
- Bloquea: S4 (T1.1-04)

**D-19** · 1 · setCustomer existing BP and guests (CQ2 + CQ3) · `business_rule` · STILL_OPEN
- Qué: When a BP already has this idMagento: return it, update it, or create another? Which BP wins on duplicates? What about guests (ids 0-2)?
- LAN: SP_eCommerceCtenuevo.sql:62-68 looks up (no ORDER BY), :172-201 updates (blanking the address), :205 returns the same account. Guests get one account per email.
- ServicioSAP/DMZ: BusinessPartnerMethods.cs:465 always sends Partner='' (a new BP every time); guests get ZidMagento 0. The order flow uses the fixed guest BP (OrderMethods.cs:41).
- Ejemplo: idMagento 10555 posted twice: LAN returns the same C account; ServicioSAP creates 2 BPs.
- Opciones: a: Look up and return the existing BP · b: Look up and update through a partial DTO · c: Replicate the SP update, including the address wipe · d: Keep creating and record the difference
- Recomendación: a, with a written tie-break (highest Partner), after step 0 succeeds. For guests, answer with the D-18 capture. Never c.
- Decide: User (+ SAP/ABAP if BP05 cannot filter)
- Bloquea: S5 (T1.1-03)

**D-20** · 1 · setCustomer values LAN never stored + dead code (CQ4 + CQ9) · `business_rule` · STILL_OPEN
- Qué: Street/NameCo, phone (3 places), Birthdt, Region 'JAL' and the type-20 contact; deleting dead code in the BP builder.
- LAN: LAN CustomerMethods.cs:24-33 sends an empty address; the phone is never written (SP :48); FechaNacimiento is always 1900-01-02 (:140); no contact is created.
- ServicioSAP/DMZ: BusinessPartnerMethods.cs:491/:493, :506/:513/:657-672, :488/:800-813, :461/:502, :673-716. Dead code: :425-426, :429, :455, :815-829, :116-146. Marst is already decided by DU18, but the spec still calls it open.
- Ejemplo: With a birth date, phone and address: LAN stores 1900-01-02 and no phone; SAP stores 19900515, the phone 3 times and JAL.
- Opciones: A: Strict parity per field · B: Keep the values as accepted differences · Dead code: delete in its own commit, or keep
- Recomendación: Decide per field with A as the default, after confirming credit/ACT-36 do not need the phone or address. Delete the dead code in its own commit.
- Decide: User
- Bloquea: S4

**D-21** · 1 · setCustomer validation, sanitizer, empty-Partner guard (CQ5, CQ7, CQ8) · `business_rule` · STILL_OPEN
- Qué: Invalid idMagento or storeCode (and whether 'mavi' is still a store); a shared Sntz helper; where the guard against an empty Partner lives.
- LAN: LAN CustomerMethods.cs:42-50 maps the store exactly; int.Parse throws (:74, :93); sntz is at :184-192; the SP always returns an account (:205-206).
- ServicioSAP/DMZ: BusinessPartnerMethods.cs:436-455 is tolerant (anything not 'viu' becomes 04); ParseMagentoId turns bad ids into 0; there is no sanitizer; :112-114/:148 return a Client with an empty Partner. A new file must go into the csproj, which now has a UTF-8 BOM.
- Ejemplo: Store 'abc': LAN fails; SAP creates a BP with ZidMagento 0. O'Brien: LAN stores OBRIEN, SAP stores O'Brien.
- Opciones: CQ5: fail like LAN / stay tolerant / map 'mavi' · CQ7: create Sntz / do not replicate · CQ8: A throw in the controller / B new SetCustomerAsync orchestrator
- Recomendación: Fail like LAN on an invalid id or unknown store. Create Sntz (SKILL rule 28). Choose CQ8 = B, because T1.1-03 needs an orchestrator anyway.
- Decide: User (+ owner of the store list)
- Bloquea: S4, S5

**D-22** · 1 · lists, cash report and accounts (CQ12, CQ13-15, CQ20, CQ24) · `business_rule` · CHANGED
- Qué: Silent SIGMavi failure on the lists; email encoding, case and empty email in setCustomerList; fileName sanitizing; answer when getCuenta/setCuenta fail.
- LAN: LAN CustomerMethods.cs:160-164 returns 500, so the DMZ answers 400. SpVTASListaNBMagento.sql:77 uses a parameter and a case-insensitive collation. :208/:214 use the raw fileName. LAN Curl returns 200 with e.Message.
- ServicioSAP/DMZ: CustomerMethods.cs:64-68 swallows the error, so getCustomerList answers 'No esta en listas'. :81-82 doubles quotes only, so '+' is lost. :76 rejects an empty email. CashReportMethods.cs:61/:75 use the raw fileName. CustomersController.cs:92-108 returns 500 after retries.
- Ejemplo: SIGMavi down and the email is black-listed: LAN gives 400; SAP gives 200 'No esta en listas', so the email passes as clean.
- Opciones: CQ12: rethrow / accept · CQ13: encode the value (after an E2E with '+') / leave · CQ14/15: accept / normalize · CQ20: Path.GetFileName / exact replica · CQ24: accept / local try / change the shared Curl
- Recomendación: Rethrow; encode after the E2E; accept CQ14/CQ15; sanitize; for CQ24 accept until the consumer is known (re-analyze after D-17).
- Decide: User
- Bloquea: S3

**D-23** · 2 · prospecto/rfc, prospecto/recuperarcuenta (scope) · `scope` · NEW
- Qué: Are these Credilana-app routes (out of scope under SKILL rule 15) or a generic service that must leave LAN?
- LAN: LAN ProspectoController.cs:18-148 was added by ticket 10226 'SERVICIO DE BUSCAR CUENTA EN APP CREDILANA' (5f69aa2, 2efaf85).
- ServicioSAP/DMZ: Magento exposes them as anonymous REST endpoints (/V1/prospecto/*) with no caller in app/code. recuperarcuenta is already bridged on ConexionSAP (DMZ ProspectoController.cs:42).
- Ejemplo: If only the Credilana app calls them, the bridge and any rfc build are out-of-scope work.
- Opciones: A: Out of scope; stay on LAN and hold the bridge · B: In scope · C: Keep recuperarcuenta and leave rfc on LAN
- Recomendación: Ask the owner of ticket 10226 who calls /V1/prospecto/*, and decide this before any other package 2 question.
- Decide: User + ticket 10226 owner
- Bloquea: All of package 2 and the recuperarcuenta release

**D-24** · 2 · prospecto/rfc (annex source) · `data_or_capture` · CHANGED
- Qué: Where RFCAnexoI-IV and the helper SPs come from once Intelisis is off.
- LAN: spRegistroSugerir.sql:45-47, :105-110; spRFCClaveHomonima.sql:21, :30-31; spRFCDigitoVerificador.sql:23.
- ServicioSAP/DMZ: There is no rfc route. GET partner/ConsultaAnexos (ZQBC_CODEMSTRD) has returned 'RFCAnexoVI' (that spelling) with the Anexo IV word list. Annexes I-III: NO EVIDENCE.
- Ejemplo: Without annexes I-III, ServicioSAP can produce the first 10 RFC characters but not the 3-character homoclave and check digit.
- Opciones: A: Port to C# and read the annexes from ZQBC_CODEMSTRD · B: Embed the annexes as data (needs approval) · C: MAVI API AI_GET_RFC · D: Stay on LAN
- Recomendación: Only if D-23 = in scope. You run the 4 ConsultaAnexos GETs that Fable prepares, then A or B.
- Decide: User + Javier; Alfredo García / SAP code-master team
- Bloquea: Building prospecto/rfc

**D-25** · 2 · prospecto/recuperarcuenta parity (P2-Q2..Q5) · `business_rule` · STILL_OPEN
- Qué: Required fields, name matching, name masking (C17), and escaping single quotes in the filter (C12).
- LAN: LAN ProspectoController.cs:82-98 requires 5 fields; :107-117 matches PersonalNombres plus both surnames through SqlParameter; :152-169 masks keeping the first and last letter.
- ServicioSAP/DMZ: ServicioSAP ProspectoController.cs:22-25 requires 2 fields; :47 matches PrimerNombre unescaped; CustomerServiceMethods.cs:174-193 masks only the first letter and crashes on an empty word (BR :2103). Escaping precedent: CustomerMethods.cs:81.
- Ejemplo: A customer with no second surname: LAN answers 'Datos inválidos'; SAP crashes and answers 'Error interno'.
- Opciones: Q2: LAN's 5 required fields / relaxed + crash fix · Q3: filter by RFC + birth date and compare the full name in C# / split the name · Q4: dedicated LAN-style masking helper / change the shared helper · Q5: escape ' / leave
- Recomendación: 5 fields; filter by RFC + birth date and compare the name in C#; dedicated helper; escape.
- Decide: User + Javier
- Bloquea: Shipping the recuperarcuenta bridge

**D-26** · 3 · company/wholesale-customer (returned name, not found) · `business_rule` · CHANGED
- Qué: Person name vs company name, and turning a not-found BP into 'null' instead of a 500.
- LAN: LAN WholesaleCustomerMethods.cs:21, :39 return Cte.Nombre; not found gives 'null' (:42-45), which the DMZ answers as 400.
- ServicioSAP/DMZ: BusinessPartnerMethods.cs:919-928 tries the person's name first. :318/:934 rethrow NotFound as 500, which DMZ Curl turns into 200 'WebException', and Magento shows that text as the company name.
- Ejemplo: GET .../1599999999: expected 400 'Customer not found.'; possible 200 'WebException...'.
- Opciones: Name: NameOrg1-4 first / keep / Name1Text · Not found: treat NotFound as 'null' / leave
- Recomendación: You capture BP05MA for 2-3 real wholesale BPs (Fable prepares it), then NameOrg first if it is filled; treat NotFound as 'null'.
- Decide: User + Javier/Marcos
- Bloquea: Shipping the wholesale GET bridge

**D-27** · 3 · company/negotiable-quote/create · `scope` · STILL_OPEN
- Qué: Retire the route or build it in SAP.
- LAN: LAN WholesaleCustomerController.cs:31-34 hard-codes the agent, channel, warehouse and branch; WholesaleCustomerMethods.cs:186-195 creates a 'Pedido Mayoreo'.
- ServicioSAP/DMZ: No ServicioSAP route and no design. Magento ignores the response and emails sales anyway (NegotiableQuoteManagementPlugin.php:114-122).
- Ejemplo: If retired, sales still get Magento's email, but no ERP order is created.
- Opciones: A: SD01 ZMAY with values from the business · B: SAP quotation · C: Retire · D: Stay on LAN
- Recomendación: C, unless Ventas Mayoreo needs the ERP order.
- Decide: User + Ventas Mayoreo + SAP SD
- Bloquea: Package 3 spec

**D-28** · 4 · customer/wallet/details (P4-Q1..Q5 + captures) · `business_rule` · CHANGED
- Qué: SD18 as the wallet; uen/serie selection (C10); holder name; lookup key and the 'None' sentinel; the generate-wallet side effect.
- LAN: LAN WalletCustomerMethods.cs:18-123 picks the serie by uen and returns the holder's names from Cte; :89-115 calls SP_MAVIDM0173 with @ID=0 (probably a no-op).
- ServicioSAP/DMZ: WalletCustomerController.cs:26-36 ignores uen, takes the first contract and returns CustOwner (a BP code). WalletCustomerMethods.cs:65 filters by Reference. The ServicioSAP BP create sends ZserieMon/ZserieMonViu empty. No SD18 capture exists. PLAN:122 still says 'Wallet'.
- Ejemplo: A customer with MA and VIU wallets in the VIU store: LAN returns the VIU serie and balance; SAP returns whichever contract comes first, with the holder '1500004598'.
- Opciones: Q2: filter by Vkorg / BP05 serie / first · Q3: build the name from BP05 / CustOwner · Q4: CustOwner / Reference / serie then Num · Q5: drop as a no-op / design generation
- Recomendación: You run the capture kit Fable prepares (SD18, BP05 series, DM01, AWS). Then Vkorg filter, BP05 name, CustOwner key (with the Magento re-keying), and drop Q5.
- Decide: User + Marcos + SAP SD
- Bloquea: Spec 04; shipping the wallet/details bridge

**D-29** · 4 · customer/wallet/getMinimumCostToRedeem (C09) · `business_rule` · STILL_OPEN
- Qué: Whether to replicate LAN's per-family algorithm, and the failure policy when a catalog cannot be read.
- LAN: LAN WalletCustomerMethods.cs:160-472 (tablarangostd per family; errors swallowed).
- ServicioSAP/DMZ: WalletMethods.cs:76-232 reads 3 AWS catalogs without auth, compares against the last row's minimum and uses '+='; :56-60 and :234-239 swallow errors and return 200.
- Ejemplo: Shoes 600 and a sofa 800: LAN gives 600, SAP gives 1400. AWS down: the minimums are 0, so any total qualifies (money at checkout).
- Opciones: A: Replicate once VALOR1..4, DM01 04/05/81 and the channel source are confirmed · B: Keep the simplified version · Failure: return 0 redeemable / swallow
- Recomendación: A, and return 0 redeemable when a catalog cannot be read.
- Decide: User + Javier + AWS catalog owner
- Bloquea: Shipping that bridge

**D-30** · 5 · status/getStatus · `scope` · STILL_OPEN
- Qué: Discard the route, or rebuild it as a health check for the Atentus monitor.
- LAN: LAN StatusController.cs:10-37 pings host 172.16.202.2 over ICMP.
- ServicioSAP/DMZ: No ServicioSAP route. The DMZ route is POST and calls LAN; after the release it also fails whenever ServicioSAP login is down.
- Ejemplo: After LAN is off, the ping fails and the monitor raises a false alarm.
- Opciones: A: Discard and repoint the monitor · B: ServicioSAP health check · C: DMZ-only liveness
- Recomendación: Ask the Atentus owner what the check asserts. B if it is still used, otherwise A.
- Decide: User + Diego + Atentus owner
- Bloquea: Package 5

**D-31** · 5/6/8/9/10/4 · retiring dead DMZ routes · `scope` · CHANGED
- Qué: Retire recommender x3, Tablerate x3, order/getprueba, wallet/getCuentaC, ExistRFCAndPhoneCte, Validar_Lada, codigoRecomendado x2 and product/getStockByStore.
- LAN: The Tablerate targets were removed from LAN in 2022. ExistRFCAndPhoneCte returns a constant. getCuentaC has a different path and verb in LAN.
- ServicioSAP/DMZ: Recommender, Tablerate and getprueba exist only on ConexionSAP. Tracker rows say Deprecado. Dev 3 discarded some on 11-12 Aug. The Dev 2 Gantt still lists getRecommender and getCuentaC.
- Ejemplo: After LAN is off, recommender/getRecommender answers 500 instead of not existing.
- Opciones: A: Retire all of them after checking the IIS logs, coordinated with Magento · B: One by one
- Recomendación: A. Keep updateConfigurableProductLink (LAN Production calls it). Remove the retired routes from the Gantt and the counts.
- Decide: User + Magento owner + DMZ owner
- Bloquea: Package counts and closure; LAN switch-off

**D-32** · 7 · CREDITO S1 R4 (CRED_SOLICITUD_WEB_DATOS_TEMP.nombre) · `plan_or_doc_fix` · STILL_OPEN
- Qué: R4 step 2 would revert DU13.
- LAN: LAN CreditMethods getClientInfo :834 reads PersonalNombres (all given names).
- ServicioSAP/DMZ: CREDITO :564 says 'fila.Nombre = maestro.NameFirst ?? ""' (ACT-01 still pending). SolicitudCreditoWebMethods.cs:238-240 joins NameFirst + Namemiddle (DU13, committed).
- Ejemplo: MARIA GUADALUPE would become MARIA.
- Opciones: A: Keep the DU13 join and drop only the dead branch · B: Leave the Nombre line out of R4 · C: Apply as written
- Recomendación: A, and confirm the per-part Trim at the same time.
- Decide: User
- Bloquea: R4

**D-33** · 7 · CREDITO S1 T1a (USER_DMZ fallback, liberador log) · `business_rule` · STILL_OPEN
- Qué: Behavior when USER_DMZ is missing (CR-3), and whether the 'missing liberador settings' message goes to sap.log (CR-4).
- LAN: LAN OrderMethods.cs:1757-1760 throws when the key is missing. LAN LiberadorCreditoMethods.cs never checks its settings.
- ServicioSAP/DMZ: OrderMethods.cs:1208-1217 falls back to empty credentials (the same fallback runs on every contado order at :1299-1308). LiberadorCreditoMethods.cs:54 uses Console.WriteLine.
- Ejemplo: With USER_DMZ missing in QA: 3 login attempts with empty credentials, and Magento is never notified.
- Opciones: CR-3: keep the fallback as a DU / throw like LAN · CR-4: log to file as a DU17 exception / Console / remove
- Recomendación: Keep the fallback as a DU; log to file as a DU17 exception.
- Decide: User
- Bloquea: T1a steps 3 and 5

**D-34** · 7a · order/new contado parity (R7a-4, R7a-6, R7a-7) · `business_rule` · STILL_OPEN
- Qué: precioEspecial vs precio and the SD29 floor; the DIM11 stock gate; the -R5/-R6 region rewrite fed with estado.
- LAN: LAN OrderMethods.cs:363-399 books precioEspecial and forces the order; LAN has no stock check and no contado region rule.
- ServicioSAP/DMZ: OrderMethods.cs:2450/:2491-2498 book precio and raise prices to the floor; :1835-1839 gate stock and return 200 'Error'; :1828/:1842 pass sDatosPedido[20] (estado) to the region rule.
- Ejemplo: precio 10,999 and precioEspecial 8,999: LAN books 8,999, SAP books 10,999. No stock: Magento marks the order synced and never retries.
- Opciones: Price: LAN parity / keep / reject below the floor · Stock: remove / keep / keep with a retry · Region: remove / postal code / defer
- Recomendación: Price parity (pricing decides the floor), remove the stock gate unless combined with a Magento retry, remove or defer the region rule.
- Decide: Business (pricing) + Marcos
- Bloquea: 7a spec

**D-35** · 7b · order/cancelOrder (R7b-1, R7b-3, R7b-4) · `business_rule` · STILL_OPEN
- Qué: Magento sends tipo 'T'/'P' (total/partial), but ServicioSAP uses it as a document class; the policy for invoiced and partial cancels; the 'noexiste' answer.
- LAN: LAN OrdersController.cs:186-250 ignores tipo and always answers Ok('Ok'). An invoiced order gets a service report, plus a return only when resolucion='R'.
- ServicioSAP/DMZ: OrderMethods.cs:3005-3012 builds ZSD_{tipo}_ (verified); SD36 finds nothing, so 'noexiste' and DMZ 400. :3060-3100 annul the invoice and the goods issue.
- Ejemplo: tipo 'T' for 2000012345 searches ZSD_T_2000012345; the real document is ZSD_ZMER_2000012345.
- Opciones: Tipo: always ZMER and use T/P only as the total/partial flag / map T/P · Invoiced: LAN policy / annul / mixed · noexiste: keep 400 / 'ok'
- Recomendación: ZMER plus the flag (a confirmed defect); after-sales decides the invoiced policy; keep 400 once tipo is fixed.
- Decide: User + Javier + after-sales
- Bloquea: 7b; shipping the cancelOrder bridge

**D-36** · 7b · order/setreturn (R7b-5, R7b-7, R7b-8; R7b-6 capture) · `business_rule` · STILL_OPEN
- Qué: Org, plant and channel of the return when Magento sends no store; motivoDevolucion becoming the payment term; which resolutions create a ZDME; the REF_DOC.
- LAN: LAN OrdersController.cs:256-259 defaults store to '1'; only resolucion 'R' creates a return (:278).
- ServicioSAP/DMZ: OrderMethods.cs:2190 store is null at runtime, so 'No lleva id de tienda'. :2204 condicion = motivo, which falls back to ACEF. Any resolution creates a ZDME. :1652-1653 references the order, while the RSG fiche asks for the invoice.
- Ejemplo: A return for 2000012345: no ZDME in SAP, the DMZ answers 200 'WebException' and Magento marks it synced.
- Opciones: Store: take it from the SD36 original order / default '1' / Magento sends it · Motivo: keep the original Pmnttrms and carry the reason in text / keep · Resolutions: only R / all · REF_DOC: capture one SD09 response first
- Recomendación: Original-order org data, keep Pmnttrms, only R, capture first.
- Decide: User + Marcos (+ SAP SD for REF_DOC)
- Bloquea: 7b; shipping the returnOrder bridge

**D-37** · 7c · CREDITO S3 shape decided now (T1B-2, T2C-1) · `business_rule` · STILL_OPEN
- Qué: Liberador trigger (switch U1, success path only, cuentaBp, exclude Prospecto, Task.Run) and the duplicate guard for credit resends.
- LAN: LAN CreditMethods.cs:199-241 (only after the lines succeed, only 'C' accounts, background thread). LAN OrderMethods.cs:533-542 returns PedidoExistente after the rename.
- ServicioSAP/DMZ: The commented block OrderMethods.cs:673-707 uses idClienteMagento and an await in a non-async lambda; the credit branch :1797-1820 inserts on every call.
- Ejemplo: A resend of 000123456 after authorization: LAN answers PedidoExistente; SAP writes a second header.
- Opciones: Trigger: A as described / A plus excluding Prospecto / wait · Guard: T2c-A after the rename / T2c-B 'CRED'+idCarrito / SAP document
- Recomendación: Record the trigger with Prospecto excluded and guard T2c-B now as DUs; implement after DU11.
- Decide: User
- Bloquea: T1b, T2c (implementation waits on DU11)

**D-38** · 7d · Openpay cards and Paynet references (R7d-1, R7d-2, V-10) · `business_rule` · STILL_OPEN
- Qué: Reprocessing openpay_cards orders; expiry of openpay_stores references; LAN's ^C\d+$ guard before SetCAccount.
- LAN: LAN OpenpayMethods.cs:70-150, :271-288 (with the regex at :283) and :169-206.
- ServicioSAP/DMZ: OrderMethods.cs:1777-1786 saves card orders to SQLite and never creates an SAP order; nothing reads the table. :1788-1792 creates the SAP order for store payments.
- Ejemplo: A paid card order stays in 'processing' forever.
- Opciones: Cards: port with approval / webhook / do not enable openpay_cards through ServicioSAP yet · Stores: port after the cancel API / create the order only when paid · Regex: BP check / drop / keep
- Recomendación: Do not enable openpay_cards through ServicioSAP until a port exists. For store references, decide with SAP SD. Replace the regex with a BP check.
- Decide: User + Javier + Dev 4 + SAP SD
- Bloquea: 7d spec; the setOrder release for openpay_cards

**D-39** · 7a/7d · ServicioSAP to DMZ calls · `plan_or_doc_fix` · NEW
- Qué: ServicioSAP uses 3 different ways to call the DMZ; the E-27/E-28 shared helpers have no caller.
- LAN: LAN has 5 setOrderStatus callers and SetCAccount at Conn/Magento.cs:413.
- ServicioSAP/DMZ: Helpers/ConexionDMZ/Curl.cs (token cache); StorePickupMethods.cs:435 builds its own body; OrderMethods.cs:1199-1205 and :1293-1351 use a hand-built HttpClient that does not renew on 401. PLAN:67 only covers DMZ-to-ServicioSAP calls.
- Ejemplo: The DMZ token rotates: Curl renews, the order/new callback does not, and setCAccount fails silently.
- Opciones: A: Consolidate as a separate task · B: Document the 3 paths · C: PLAN rule: new calls must use Curl
- Recomendación: C now; A as its own task, because it touches OrderMethods, which the credit work shares.
- Decide: Marcos/Diego/Javier + user
- Bloquea: 7a/7d hygiene

**D-40** · 8a-1 · LoginClienteCredito / LoginClienteCreditoFechaN (R8-01..R8-05) · `business_rule` · STILL_OPEN
- Qué: The email field, backend failure vs not-found, empty input, the BirthDate comparison, and the nombreCliente join.
- LAN: LAN CustomerServiceMethods.cs:1226-1291 returns Cte.eMail1, rethrows (500), exact 'yyyy-MM-dd' match, joins 3 parts with ' '.
- ServicioSAP/DMZ: CustomerServiceMethods.cs:232-292 uses the first smtp_addr; any failure returns 200 false; the regex '\d+' at :282 drops the minus sign for pre-1970 dates. The controller (:71-72, :92-93) answers 400 on empty input.
- Ejemplo: A BP born 1965-03-10: LAN true, SAP false.
- Opciones: Email: first smtp_addr / named field · Failure: false only when the BP is not found, otherwise 500 · Empty input: Ok(false) · Date: fix the regex and compare exactly · Name: accept SAP's join (DU13)
- Recomendación: Decide email after an E2E; false only for not-found; Ok(false); fix the regex and compare exactly; accept the name join.
- Decide: User
- Bloquea: 8a-1

**D-41** · 8b · Neko trio (ApplyPaymentNeko, UpdateStatusPaymentNeko, bbvaKeyNeko) · `scope` · CHANGED
- Qué: Is Multipagos Neko still alive?
- LAN: LAN CustomerServiceController.cs:105-155.
- ServicioSAP/DMZ: AbonosController.cs:51-84 has stubs under the credit/ prefix that return success without recording anything. Magento picks the version with multipagos/config/is_advanced_enabled.
- Ejemplo: Bridging to the stub reports success without recording the payment.
- Opciones: A: Retire (N/A; stay on LAN until shutdown) · B: Build (Dev 4)
- Recomendación: A, once the production value of is_advanced_enabled is confirmed. Mark the stubs 'do not connect'.
- Decide: User + Magento/payments owner
- Bloquea: 8b

**D-42** · 8c · customerService/obtenerCreditos (R8-12..R8-14) · `business_rule` · STILL_OPEN
- Qué: estatus values, the uen filter, ids, discount and points, sort order and rounding.
- LAN: LAN CustomerServiceMethods.cs:504-633 (5 states, v.UEN filter, ORDER BY DESC, rounding).
- ServicioSAP/DMZ: CustomerServiceMethods.cs:445-519 maps 3 states, ignores uen, and does not sort or round. The DMZ (:118) still calls LAN.
- Ejemplo: uen=1 returns both MA and VIU credits.
- Opciones: Status: get the Zidstatus catalog / accept 3 · uen: filter by SalesOrg 04/05 · Order: replicate the sort and rounding, accept id/discount/points
- Recomendación: Get the catalog plus one SD36 capture; filter by uen; replicate sort and rounding. Then switch DMZ :118.
- Decide: User + credit area + SAP SD
- Bloquea: obtenerCreditos switch

**D-43** · 8 · validarCliente (R8-22) and GetAccountDebts (R8-21) · `business_rule` · STILL_OPEN
- Qué: An id '0' matches any BP and nombres holds only NameFirst; GetAccountDebts returns the wrong shape.
- LAN: LAN CustomerServiceMethods.cs:255-311 (Cliente AND IDMagento; PersonalNombres) and :776-852 (debts grouped by CanalVenta).
- ServicioSAP/DMZ: CustomerServiceMethods.cs:204-210; AbonoMethods.cs:19-51 returns the raw EX01 list without excluding Contable=1. Both are already bridged.
- Ejemplo: id_cliente_magento '0' returns the masked name of any BP without a Magento account.
- Opciones: validarCliente: DU13 name and treat 0 as no account / keep · Debts: rebuild LAN's shape (needs R8-11) / change Magento
- Recomendación: DU13 plus the 0 check (needs approval); rebuild the shape after R8-11.
- Decide: User (+ Marcos and Dev 4 for debts)
- Bloquea: Shipping these bridges

**D-44** · 8 · routes needing new ServicioSAP routes (R8-06, R8-15, R8-16, R8-17) · `data_or_capture` · STILL_OPEN
- Qué: Sources for GetEmpleadoByNomina, nombreCliente, validarCoberturaPorCP and obtenerVentanaConfirmacion.
- LAN: LAN CustomerServiceMethods.cs:1952-2000, :313-407, :1738-1904, :149-211.
- ServicioSAP/DMZ: Missing in ServicioSAP. Candidates: SuccessFactors plus the AWS catalog; TEL-1 phone plus BP05 names; sepomex (no coverage field); SD36 billing plus the BP05MA name.
- Ejemplo: After shutdown, seller registration and JoinAccount have no backend.
- Opciones: Per route: build with the named sources / deprecate
- Recomendación: nombreCliente: DU13 name plus the TEL-1 phone. GetEmpleadoByNomina: ask whether seller registration is retired. Coverage: the business names the source. Confirmation window: SD36 plus BP05MA.
- Decide: User + Dev 2 + logistics
- Bloquea: 8a-2, 8c

**D-45** · 9 · credit/codigoPromocion (E-45 vs DU16) · `scope` · CHANGED
- Qué: Keep the promoter-coupon route and switch the DMZ, or retire the route and Magento's promoter box.
- LAN: LAN CreditController.cs:124-141 to SpVTASVentaCupon. Magento calls ValidarCupon from the checkout JS (omnipro_pago_credito-method.js:788) and Elimina from CreditMigration.
- ServicioSAP/DMZ: ServicioSAP CreditController.cs:23-39 to SIGMAVI SpVentasCupones (verified, tested 2026-09-24). The DMZ still uses curl.Post (:135, verified). DU16/ACT-35 say deprecated; BR has no block for it.
- Ejemplo: A promoter code that exists only in Intelisis answers 'Erroneo' after the switch.
- Opciones: A: Retire: Magento removes the box first · B: Switch and load the real codes into SIGMAVI · C: Stay on LAN until A or B
- Recomendación: Confirm whether DU16 covers the checkout promoter box. If it does, A; if not, B with a named data owner.
- Decide: User + Magento owner + Dev 3
- Bloquea: The codigoPromocion switch; the Magento credit release

**D-46** · 9 · E-45 / E-46 contract details · `business_rule` · NEW
- Qué: Unsupported opcion returns 500; renewed coupon row has Centro NULL; getPlazos error body.
- LAN: LAN passes any opcion and answers 200 ''. Legacy NUEVO derives Sucursal from Agente (SpVTASVentaCupon.sql:137-158). getPlazos errors return 200 {Error:true,Message} (CreditMethods.cs:2554-2557).
- ServicioSAP/DMZ: CreditMethods.cs:21-22 throws (500). Centro is NULL because no @Sucursal is passed. getPlazos returns empty lists (:166-171). Elimina '' is parity (verified), so it is closed.
- Ejemplo: SIGMavi down: LAN returns the Error object; SAP returns empty lists.
- Opciones: opcion: accept 500 / 200 '' · Centro: accept NULL / pass @Sucursal · getPlazos: replicate the Error object / accept
- Recomendación: Accept the 500 as an X-2 exception (no caller sends another opcion); accept NULL unless a consumer is found; replicate the Error object (one catch).
- Decide: User + Diego + Javier
- Bloquea: E-45/E-46 closure

**D-47** · 9a · credit/getSms (NIP-1 + SMS operations) · `business_rule` · STILL_OPEN
- Qué: Whether a failed ZidMagento PATCH blocks the SMS; whether the dispatcher accepts 10-digit BP rows.
- LAN: LAN CreditMethods.cs:2111-2114: the UPDATE never stops the SMS. LAN writes C-account rows.
- ServicioSAP/DMZ: BusinessPartnerMethods.cs:842-843 has no sap-client=110; any exception returns -1 before the SMS is queued (CreditMethods.cs:376-380). BP-keyed rows are written to TcAAEA00030_EnvioMensajes. Whether the dispatcher sends them: NO EVIDENCE.
- Ejemplo: PATCH 403: LAN answers '3'; SAP answers '-1' and the DMZ returns 400.
- Opciones: A: LAN parity · B: Log and continue, plus sap-client=110 · Dispatcher: you run sp_helptext and the column-width queries Fable gives you
- Recomendación: B; check the dispatcher before any positive test; test with cliente '0' until then.
- Decide: User + SMS operations / ServicioAndroid DBA
- Bloquea: 9a positive tests and switch

**D-48** · 9a · credit/GetPhoneValidatedClientSecretName (checkout gate) · `business_rule` · CHANGED
- Qué: Owner and sources for the 6 gate fields: employee check, CREDITO MENUDEO category, first purchase.
- LAN: LAN CreditMethods.cs:1783-1990.
- ServicioSAP/DMZ: No ServicioSAP route. Magento MonederoManagement.php:356-392 reads 6 fields and recomputes is_phone_validated itself. No owner (the Dev 2 roadmap has no row).
- Ejemplo: Magento sends a BP, LAN finds no Cte and returns is_client_valid=false, so credit checkout stays disabled.
- Opciones: A: Port with named sources · B: Keep on LAN with a BP-to-C map · C: A without the TablaStD check Magento ignores
- Recomendación: C. Name the owner first, and switch it together with 9a.
- Decide: User + Dev 2 + credit area
- Bloquea: The 9a switch; credit E2E

**D-49** · 9 · credit/GetCreditAmounts (scope and cache owner) · `scope` · CHANGED
- Qué: Is this Credilana? Who fills SQLite mavi_credilana_info?
- LAN: LAN CredyPrestamoMethods.cs:303, :643-658 (FnVTASListaCredilanas, hasta_un_maximo_de_prestamo); LoadCredilanaInfo :675-776.
- ServicioSAP/DMZ: Already bridged (DMZ :352); ServicioSAP reads an empty table and answers 500. Dev 3 schedules M-03 (15-19 Oct), while GUIA §1.6b excludes it.
- Ejemplo: After deployment, every call answers 500.
- Opciones: A: Credilana: revert the bridge to LAN · B: Normal credit: name a source · C: First ask Magento which page calls /V1/credito/getCreditAmounts
- Recomendación: C, then A or B. Pause M-03 until then.
- Decide: User + Magento owner
- Bloquea: Shipping that bridge; M-03

**D-50** · 9 · Credilana / ProductosMX / SolicitudMercancia scope · `scope` · CHANGED
- Qué: Where the Credilana boundary falls for 5 CreditoWeb_* routes; ProductosMX timing; whether SolicitudMercancia (E-44) is APP mercancías.
- LAN: LAN CreditController.cs:144, :186, :208, :288, :339, :352, :404, :424, :559.
- ServicioSAP/DMZ: No ServicioSAP routes. E-44 is reported as written, but its code is in no ServicioSAP ref (NO EVIDENCE). Dev 3 has M-01..M-05 scheduled in October.
- Ejemplo: Dev 3 ports SPCREDICredilana while SKILL rule 15 excludes it.
- Opciones: A: All Credilana routes out of scope · B: Only the routes that run SPCREDICredilana are out · SolicitudMercancia: out / E-44 in
- Recomendación: A (or B), with ProductosMX deferred to Feb-Mar 2027. SolicitudMercancia defaults to out. Tell Dev 3 now.
- Decide: User
- Bloquea: Package 9 counts; Dev 3's October plan

**D-51** · 9 · credit/getCreditAccount · `business_rule` · CHANGED
- Qué: Resolving a prospect to its client.
- LAN: LAN CreditMethods.cs:1552-1595 (CREDIHProspectoACliente).
- ServicioSAP/DMZ: No ServicioSAP route. Magento's ProspectTracking cron calls it (AccountTracking.php:46).
- Ejemplo: Prospect P00001234 became C00005678; in SAP both may be one BP.
- Opciones: A: Check ZtipoCliente and return the same BP · B: Mapping table · C: Deprecate (the cron would fail)
- Recomendación: A.
- Decide: User + Dev 2
- Bloquea: 9-remaining

**D-52** · 9 · getClienteFactura contract and getClienteSaldo rules (R9-03, R9-07) · `business_rule` · STILL_OPEN
- Qué: getClienteFactura always answers 500; input validation and failure answer for getClienteSaldo.
- LAN: LAN CreditController.cs:69-96 returns an object or sentinel texts; :22 accepts only a C account; errors answer 'No tiene facturas'.
- ServicioSAP/DMZ: AbonoMethods.cs:54-93 returns a list, and DMZ :58 runs JObject.Parse on it, so 500. getClienteSaldo is missing (it needs the N1-N16 sources).
- Ejemplo: Every getClienteFactura call answers 500 today.
- Opciones: Factura: ServicioSAP returns LAN's object / the DMZ adapts · Saldo: 10-digit BP regex plus 'No tiene facturas' / 500
- Recomendación: LAN's object after N4/N6; BP regex plus the LAN sentinel.
- Decide: User + Uriel + ABAP
- Bloquea: Shipping the getClienteFactura bridge; 9-balances

**D-53** · 10 · product/* (P10-1, P10-2) · `scope` · CHANGED
- Qué: Confirm package 10 is outside Fable's count (pass-through routes); keep updateConfigurableProductLink.
- LAN: LAN jobs call the DMZ (stage-delta ProductMethods.cs:653-2493). LAN origin/Production ProductMethods.cs:1784 calls updateConfigurableProductLink (verified).
- ServicioSAP/DMZ: DMZ ProductsController.cs:26-123: 5 routes call Magento, 1 is a stub, 1 writes to local disk, 1 uses SFTP. Dev 3 decided pass-through on 12 Aug (CHECKLIST_DEV3:258).
- Ejemplo: Deprecating updateConfigurableProductLink breaks LAN Production's configurable-related job.
- Opciones: A: Out of count; the import tool stays the caller · B: Redefine package 10 as replacing the LAN jobs
- Recomendación: A. Retire getStockByStore only, after checking the IIS logs.
- Decide: User + Dev 2 / import-tool team
- Bloquea: Package 10 closure

**D-54** · 11 · magento/productWithWebsites (E-22) · `business_rule` · NEW
- Qué: URL shape, page size, null handling and the per-SKU second pass of the ServicioSAP caller.
- LAN: LAN origin/Production Conn/Magento.cs:331-397 (pages of 500 using '/{page}/500/0', a null guard, and a second pass per SKU).
- ServicioSAP/DMZ: MagentoCatalogMethods.cs:325 calls '/{page}/1000' (verified). origin/Production's DMZ only has '{page}/{size}/{sku}' (verified).
- Ejemplo: Against the production DMZ, catalog/cargaCompleta gets 404 and leaves product_in_stores empty.
- Opciones: A: Match LAN Production · B: The DMZ release exposes both templates · C: Keep stage-delta
- Recomendación: A plus B, in its own commit, with the BR :3254-3268 update.
- Decide: User + Diego (E-22 owner) + DMZ owner
- Bloquea: Package 11 closure; the DMZ release

**D-55** · 12/13/14 · Mercancia, Login, Logging · `scope` · CHANGED
- Qué: Confirm all three are out of scope, and name the APP mercancías owner.
- LAN: LAN MercanciaController.cs:16-57; LAN calls DMZ login/authenticate (Helper/Curl.cs:21-37).
- ServicioSAP/DMZ: The 5 mercancias routes use new Curl().Post to LAN. Login is the DMZ's own JWT issuer (its key differs). Logging is a local sink. CSV:63 wrongly maps login/authenticate to ServicioSAP login/auth.
- Ejemplo: With ServicioSAP down, mercancias/getSaldoVencido answers 500 even though it only reads LAN.
- Opciones: A: Out of scope, with owners accepting the coupling (C-03) · B: Bridge them
- Recomendación: A. Correct PLAN:45/:198-209 and CSV:63.
- Decide: User + APP mercancías owner (candidates: Uriel Valencia, Diego Valle)
- Bloquea: Package closure; release sign-off


## 6. Definiciones para las conexiones y los despliegues

**C-01** · connections · DMZ release branch · `connection_or_deploy` · CHANGED
- Qué: Which DMZ branch is released, and how it is reconciled with origin/Production.
- LAN: origin/Production c352009 sends every bridged route to LAN (via URL_LAN), keeps literal secrets, and has 3 routes ConexionSAP lacks.
- ServicioSAP/DMZ: ConexionSAP 09cb341 holds the 26 bridges; Production is not its ancestor (89 commits missing, verified). The clone was fetched 2026-09-17; 97d6aea is absent (verified). ConexionSAP's content is a superset of dbAndroid.
- Ejemplo: Releasing ConexionSAP as it is drops GetPlazosCteC and getIntelisisStatusesCredit, and LAN Production's productWithWebsites calls get 404.
- Opciones: A: Fetch, merge Production into one integration branch, keep both productWithWebsites templates, and gate the release on a route-set diff · B: Cherry-pick bridges onto Production · C: Release ConexionSAP as it is
- Recomendación: A. Deploy ServicioSAP first, then the DMZ.
- Decide: DMZ owner (Uriel/Marcos/Diego/Javier) + user
- Bloquea: Every DMZ switch reaching Stage/PROD

**C-02** · connections · first-release scope (and credit coupling) · `scope` · NEW
- Qué: Which of the 26 bridges ship. Whether to add a per-route LAN/SAP switch. Credit orders through setOrder.
- LAN: origin/Production sends all 26 to LAN. LAN credit SetPedido runs the liberador and the Magento callback.
- ServicioSAP/DMZ: 8 bridges do not match LAN (cancelOrder, getClienteFactura, setCustomer, GetAccountDebts, wallet/details, getMinimumCostToRedeem, recuperarcuenta, GetCreditAmounts) and setOrder differs. ConexionSAP sends credit orders to order/new while the liberador is commented out (OM:673-707), so Magento never gets an id_solicitud.
- Ejemplo: After the release, every Magento cancel answers 400 and every credit order sits pending forever.
- Opciones: A: Ship all 26 · B: Ship only the parity-verified ones and revert the rest to curl.Post · C: Per-route switch in Web.config; keep credit on LAN until DU11
- Recomendación: C, or B if no DMZ code change is wanted. Never ship the credit branch before T1b.
- Decide: User + DMZ owner + Magento owner
- Bloquea: The first DMZ release

**C-03** · connections · DMZ Curl authentication and JWT · `connection_or_deploy` · CHANGED
- Qué: The DMZ Curl constructor logs in only to ServicioSAP and rethrows; that token is reused for LAN calls.
- LAN: LAN validates the JWT signature (TokenValidationHandler.cs:64-69). The committed LAN and ServicioSAP keys are equal (hash compared).
- ServicioSAP/DMZ: DMZ Helper/Curl.cs:57-91 (verified): the LAN login is commented out and Token = TokenSAP. Four vault documents still describe the old LAN-first login.
- Ejemplo: ServicioSAP down: mercancias and every LAN-routed route answer 500. JWT keys split: about 63 routes get 401.
- Opciones: A: Keep it; keys equal per environment until LAN is off · B: Lazy, separate logins (LAN for Post/Get, SAP for *SAP) · C: Split the keys now
- Recomendación: A for the first release plus a per-environment equality check you run. B before any key split. Never C. Correct the 4 vault lines.
- Decide: DMZ owner + Marcos/Diego + user
- Bloquea: DMZ release availability; the JWT split; APP mercancías

**C-04** · connections · DMZ Web.config per environment · `connection_or_deploy` · CHANGED
- Qué: The 18 keys ConexionSAP reads (URL_INTELISIS, USER_INTELISIS, URL_SAP, USER_SAP, DOMINIO_*, URL_MAGENTO, TOKEN_MAGENTO, HOST/USER/PASS_MAGENTO, USER/PASS_HASH/SALT, JWT_*).
- LAN: Production reads URL_LAN and keeps literals in code.
- ServicioSAP/DMZ: Web.config is untracked; Web.Release.config has no appSettings transforms. The share copy holds dev values (URL_INTELISIS=localhost:44399).
- Ejemplo: Production without PASS_SALT: login/authenticate answers 500 and Magento checkout fails.
- Opciones: A: Infra keeps one file per environment, checked against the key list · B: Transforms for hosts plus a server-only secrets file
- Recomendación: A for the first release, then B. Check that DOMINIO_* matches the URL hosts.
- Decide: DMZ owner + infra
- Bloquea: The DMZ release

**C-05** · connections · ServicioSAP config and server prerequisites per environment · `connection_or_deploy` · STILL_OPEN
- Qué: SAP node and sap-client, URL_DMZ/USER_DMZ, SQLite data.db and tables, file paths, the Logs folder, impersonation, liberador keys, guest BP.
- LAN: LAN uses C:\inetpub\wwwroot\api\data.db and its own folders.
- ServicioSAP/DMZ: 68 calls to Nodos.ENVIROMENT_DEV and 69 literal sap-client=110. SQLITE_DB_PATH points to ...\sap\. servicio_guias has no script. Logger.cs:26-31 throws when Logs is missing. Guest BP literal at OrderMethods.cs:41.
- Ejemplo: QA with ENVIROMENT_DEV hard-coded writes orders to SAP DEV client 110; getGuide answers 500 for guides created before the cutover.
- Opciones: A: Centralize the node and client in one key, plus a deploy checklist · B: Edit the 68 sites on the day · C: Point SQLITE_DB_PATH at LAN's file / copy data.db at cutover
- Recomendación: A plus a checklist (data.db, tables, ignoreAttributes.txt, writable folders, Logs, SMB account). C depends on whether both run on the same host.
- Decide: Marcos/Diego + infra + user
- Bloquea: Any ServicioSAP deploy beyond DEV

**C-06** · connections · dev DMZ blanket redirect · `connection_or_deploy` · NEW
- Qué: The share's DMZ Web.config points URL_INTELISIS at a local ServicioSAP.
- LAN: The real LAN host is commented out in the share copy.
- ServicioSAP/DMZ: Web.config:17 URL_INTELISIS=localhost:44399 (ServicioSAP IIS Express). Dev 2 validated obtenerCreditos through it.
- Ejemplo: In dev, GetPhoneValidatedClientSecretName hits ServicioSAP, which has no such route, and the DMZ answers 500, so dev tests look broken or misleadingly green.
- Opciones: A: Switch route by route; URL_INTELISIS points at real LAN · B: Redirect only after every route exists
- Recomendación: A in every environment that runs E2E.
- Decide: DMZ owner (Diego)
- Bloquea: Meaningful DMZ tests

**C-07** · connections · who edits the DMZ · `plan_or_doc_fix` · NEW
- Qué: Whether Fable edits the DMZ in its sessions, and on which branch.
- LAN: N/A
- ServicioSAP/DMZ: PLAN:67 requires the DMZ bridge to use PostSAP/GetSAP/PatchSAP; 01:82 says the session does not touch the DMZ. Dev 3 cuts over on dbAndroid. The clone is stale.
- Ejemplo: Fable edits ConexionSAP at 09cb341 while the real cutover branch has moved on, producing duplicates or conflicts.
- Opciones: A: Fable writes the switch diff into the spec and the DMZ owner applies it · B: Fable edits the integration branch after a fetch, without committing
- Recomendación: A until C-01 is settled, then B. Amend PLAN:67.
- Decide: User + DMZ owner
- Bloquea: Every DMZ switch task

**C-08** · connections · E2E host, binary and data sanity · `data_or_capture` · CHANGED
- Qué: Which IIS instance and binary each E2E runs against, and whether the target database is real and current.
- LAN: LAN writes the same ServicioAndroid tables.
- ServicioSAP/DMZ: The share DLL is from 2026-10-02 18:37; sap.log was last written 2026-09-17 (verified). Which instance is served: NO EVIDENCE. mavicbosandroid showed a 25-day clock skew or stale copy on 2026-09-28.
- Ejemplo: After S1 you call setCustomer, but IIS still serves the old DLL and returns the Client JSON. Or the credit row lands in a restored copy.
- Opciones: A: You name the instance per session, confirm a fresh sap.log line, and run the @@SERVERNAME/GETDATE() check Fable gives you · B: IIS Express locally
- Recomendación: A. The DBA explains the future-dated rows.
- Decide: User + infra + mavicbosandroid DBA
- Bloquea: Every E2E and package closure

**C-09** · connections · Magento BP keying (DU2 extended) · `other_team` · STILL_OPEN
- Qué: Magento sends the BP in infoCliente.cuenta, wholesale_account and customer_credit_account; stored C accounts are remapped; the regexes accept BPs.
- LAN: LAN works with C accounts everywhere.
- ServicioSAP/DMZ: Magento OrderManagement.php:719 sends getCuentaIntelisis(); omnipro_pago_credito-method.js:404/:579 and ClientCreditManagement.php:61/:165 accept C plus digits only. DMZ wholesale accepts 8-10 digits only. ServicioSAP uses cuenta as the SAP partner as-is.
- Ejemplo: Customer C00000020 pays by banktransfer: no SAP order is created; on credit the answer is 'sin cuenta'.
- Opciones: A: Magento release plus a one-time remap before or with the DMZ release · B: Convert C accounts in the DMZ or ServicioSAP (against GUIA §1.8d) · C: Keep those routes on LAN
- Recomendación: A, accepting both formats during the transition. Name the source and owner of the remap.
- Decide: Magento team (Javier/Dev 2) + SAP BP migration owner + user
- Bloquea: setOrder, getSms/validateSms, Logins, unirCuenta, wallet, wholesale, guardardocumento

**C-10** · connections · Magento admin-config URLs · `data_or_capture` · NEW
- Qué: Per environment: which core_config_data URLs point to the DMZ and which point straight to LAN.
- LAN: N/A (Magento configuration).
- ServicioSAP/DMZ: For example url_pickup_code, url_customer_wallet, url_wholesale_customer, url_recuperar_cuenta, paynet_automation_url, insert_data_url, url_estimated_delivery and cupon_promotion. Values: NO EVIDENCE.
- Ejemplo: If url_pickup_code points at LAN, the DMZ switch changes nothing.
- Opciones: A: The Magento team exports the values (Fable gives the read-only query; you or they run it) · B: Infer them from IIS logs
- Recomendación: A, before any switch with a config-driven caller.
- Decide: Magento team / Magento DBA
- Bloquea: Verifying that switches take traffic; LAN switch-off

**C-11** · connections · order/setOrder response (R7a-1) · `business_rule` · STILL_OPEN
- Qué: What setOrder returns to Magento through the DMZ for success, PedidoExistente and errors.
- LAN: LAN returns the C account or a literal; the Production DMZ maps them to 409/422/400/500.
- ServicioSAP/DMZ: OrderController.cs:26-45 returns 200 with {BP, SalesDocument, Message, Resultado} or 'Error, ...'. ServicioSAP calls setCAccount itself (OM:1953-1956). Magento sets synced=1 on 200.
- Ejemplo: No stock or a duplicate: Magento marks the paid order synced and never retries.
- Opciones: A: The DMZ returns the BP string plus LAN's codes · B: Keep the object and change Magento · C: Magento reads Resultado and keeps synced=0 on error
- Recomendación: A for parity, or C if the Magento team prefers. Fable does not touch DMZ status codes without a decision.
- Decide: User + Magento owner + Marcos
- Bloquea: The setOrder release

**C-12** · connections · customer/setCustomer error mapping · `business_rule` · STILL_OPEN
- Qué: What Magento receives when BP01 fails (CQ6), after T1.1-01 fixes the success body.
- LAN: LAN has no try: 500, which the DMZ answers as 400 with an empty body.
- ServicioSAP/DMZ: BusinessPartnerController.cs:50-53 returns 400; DMZ CustomersController.cs:30-37 only checks 'Internal Server Error' (verified), so a 'WebException' text goes out as 200.
- Ejemplo: Magento could store 'WebException...' as the account.
- Opciones: A: ServicioSAP returns 500 so the DMZ answers 400 · B: Map any WebException to 400 in the DMZ · C: Leave it
- Recomendación: A, as an X-2 route rule.
- Decide: User
- Bloquea: The setCustomer release

**C-13** · connections · order/GetPickUpCode and its writers · `connection_or_deploy` · CHANGED
- Qué: Switch GetPickUpCode together with repointing the external trigger of createStorepickupCode and generateNewStorepickupCode.
- LAN: LAN OrdersController.cs:347 reads IntelisisTmp. The writers' caller: NO EVIDENCE.
- ServicioSAP/DMZ: ServicioSAP reads SIGMavi (E-15 tested). All 3 writers are ported (61eb2c3), but create/generate are GET in ServicioSAP and POST in LAN. DMZ :262 still calls LAN.
- Ejemplo: The switch goes alone: codes created by LAN return 404.
- Opciones: A: Switch together, after the setOrder bridge is deployed · B: Stay on LAN until the trigger is found
- Recomendación: A, once the IIS logs identify the trigger (C-15).
- Decide: Javier/Diego + trigger owner + Magento team
- Bloquea: The GetPickUpCode switch

**C-14** · connections · credit/getSms and credit/validateSms switch · `connection_or_deploy` · STILL_OPEN
- Qué: When to flip DMZ :76 and :107 to PostSAP.
- LAN: LAN keys on the C account.
- ServicioSAP/DMZ: ServicioSAP keys on the BP; a C account gets '0' and the DMZ answers 400.
- Ejemplo: Magento still sends C00000020, so the SMS is never sent.
- Opciones: A: Now, testing with cliente '0' · B: In the Magento BP release, together with the gate (D-48), NIP-1 and the dispatcher check · C: On a test branch only
- Recomendación: B for production, C for testing.
- Decide: User + DMZ owner + Magento owner
- Bloquea: Credit checkout E2E

**C-15** · connections · LAN-only routes and unknown callers · `data_or_capture` · STILL_OPEN
- Qué: Who calls checkOpenpay, createStorepickupCode, generateNewStorepickupCode, getOrderInfoAndSet, customer/getCuenta, customer/setCuenta, product/obtenerImagen and status.
- LAN: LAN OrdersController.cs:372, :394, :437, :446; CustomersController.cs:90, :99; ProductsController.cs:215; StatusController.cs:11.
- ServicioSAP/DMZ: No DMZ route and no Magento app/code caller: NO EVIDENCE.
- Ejemplo: A scheduler calls checkOpenpay; after shutdown, paid card orders are never reprocessed.
- Opciones: A: Infra pulls 30 days of IIS logs plus the Task Scheduler list · B: Assume they are unused
- Recomendación: A.
- Decide: User + infra
- Bloquea: C-13; 7d/7e; LAN switch-off

**C-16** · connections · catalog and import scheduler · `connection_or_deploy` · STILL_OPEN
- Qué: Who triggers ServicioSAP catalog/*, and in what order relative to the import tool, once LAN is off.
- LAN: LAN product/updateProduct and updateConfigurableProduct chain the loads; their external trigger is in no repo.
- ServicioSAP/DMZ: CatalogController.cs chains E-16..E-22 and has no caller. E-19/E-21/E-22 failed on 2026-09-15 and the timeout and token change has not been re-tested. The E-19 MySQL and Intelisis legs wait for Sprint 9.
- Ejemplo: After LAN is off, SQLite goes stale and the importer pushes old data.
- Opciones: A: The import tool calls catalog/cargaCompleta first · B: A separate scheduled job · C: Keep LAN's trigger until Sprint 9
- Recomendación: C until the import tool moves, then A, with one owner for the whole cycle. Re-test E-19/E-21/E-22 first.
- Decide: User + Dev 2 + Dev 3 + importer team
- Bloquea: LAN switch-off; package 10/11 closure

**C-17** · connections · credit/guardardocumento access · `business_rule` · STILL_OPEN
- Qué: [AllowAnonymous] on the DMZ route that writes to AdminDoc.
- LAN: origin/Production has the same attribute.
- ServicioSAP/DMZ: DMZ CreditController.cs:448 is anonymous and calls PostSAP; ServicioSAP requires a token.
- Ejemplo: Anyone who can reach the DMZ can upload into MAVI_DOC_CTE.
- Opciones: A: [Authorize], with Magento sending the token · B: Keep it anonymous
- Recomendación: A, coordinated with Magento before go-live.
- Decide: User + security owner
- Bloquea: guardardocumento go-live


## 7. De otros equipos

| Qué | Equipo | Bloquea |
|---|---|---|
| Liberador contract (DU11, Q-T1-1..8): does it accept a 10-digit BP, auth, idempotency | Valentín (liberador team) | T1b, T2a, 7c, the credit branch of setOrder (C-02) |
| OData for ZSDT_VBAK.ZIdEcommerce (DU20), requested 2026-09-18 | SAP SD (Alan) | T2b updateCreditOrderId, T2c-A, T2d |
| Source of the credit decision (Q-T2-1..3) | Credit area + Valentín + Dev 2 | order/creditStatus |
| Annulment API for cancels without delivery (ZIDSTATUS=03), with an RSG fiche | SAP SD | R7b-2 core cancel, Paynet R7d-2/R7d-4 |
| FiscalRegimen value for web BPs with the generic RFC | SAP FI/SD fiscal owner | T1.1-02 |
| BP05 query by ZidMagento, if step 0 fails | SAP/ABAP | T1.1-03 (S5) |
| Guest BP and generic Z1 agent per environment; placeholders Zliberado/Region/Altkn; contado freight item | MAVI business + SAP/ABAP + SD/finance | 7a parity sign-off |
| SAP write targets for BBVA/STP payments (ZAPI_REFERENCIAS_BANCARIAS, ZFICRUD_COBREF_SRV) and the canales_de_venta mapping | Dev 4 + ABAP + SAP FI/SD | 8b, GetAccountDebts shape |
| Shipment status and carrier tracking (Embarque, estimated-delivery); POS cancellations; invoice status vocabulary | ABAP + logistics + Javier + Magento owner | ObtenerEstatusEmbarque, 7e |
| Openpay installment payments (CXCCMensajeWebHookOpenPay) and Paynet AFECTAR/CANCELAR | Diego + Collections/Credit + SAP SD | InsertPaymentData, ManagePaynetOrders |
| Balance sources N1-N16; wallet balance (SD18 vs SD33); CREDIHUnificacionMonedero | Uriel + ABAP + Dev 2 | getClienteSaldo, MonederoSaldoCredito, the 3 unification routes |
| SIGMavi lists SP and DDL (sp_helptext), plus loading production ListaNegra/ListaBlanca data at cutover | Diego + SIGMavi DBA | Lists cutover (package 1 S7) |
| Guarantee table structure (DM0415 / ProveedorActivoGarantia); the vault names both Valentín/Humberto and Miguel Marín | Valentín/Humberto (confirm owner) + Dev 3 | obtenerTipoGarantia (E-47) |
| SMS dispatcher accepts BP-keyed rows; channel status (the vault contradicts itself) | SMS operations / ServicioAndroid DBA | SendSmsNewNumber release, 9a positive tests |
| mavicbosandroid clock skew or stale copy; future-dated rows | mavicbosandroid DBA / infra | Credit, E-44 and SMS E2E |
| RFC annex codes and content in ZQBC_CODEMSTRD (RFCAnexoI-IV) | Alfredo García / SAP code-master | prospecto/rfc |
| Wholesale order values (SalesOrg, channel, plant, agent, payment term, review block) | Ventas Mayoreo + SAP SD | negotiable-quote, if built |
| SD18 To-Be wallet document; AWS catalog meaning (VALOR1..4) and its owner | SAP SD + AWS catalog owner (not named) | Package 4 |
| Who calls /V1/prospecto/* (ticket 10226); what the Atentus monitor asserts | Ticket 10226 owner; Atentus owner (not identified) | Package 2 scope; package 5 |
| BP release: cuenta/wholesale_account/customer_credit_account as BPs, stored-account remap, regexes, promoter-box removal, admin-config URL export | Magento team (Javier/Dev 2, Omnipro) | Most switches (C-09, C-10, D-45) |
| Per-environment Web.config for DMZ and ServicioSAP, which binary IIS serves, IIS logs and Task Scheduler on the LAN host | Infra + DMZ owner | C-01, C-04, C-05, C-08, C-15 |
| Catalog and import scheduling after LAN (SPexportaArt, Sprint 9, 4-18 Dec) | Dev 2 + importer team + Dev 3 | LAN switch-off for catalog/product |
| Centro value on renewed coupons (SpVentasCupones in SIGMAVI) | Author of the SpVentasCupones migration (not named) | E-45 closure only |

## 8. Correcciones al plan

- 01_CustomersController.md:32, :1105, :1136, :1284: replace the 2cf425f baseline with 'HEAD 6214ed8 or a descendant; session files unmodified' plus a check of the cited lines' content (D-01). Do the same in CREDITO :1135/:1279 and ACTIVIDADES :22/:66/:150.
- Remove T1.1-02 from the S1 prompt (01:1091, :1102, :1115) and mark it DECISION (D-14).
- 01:323, :370, :1117: unquoted ZidMagento filter first; drop the Mail GET (D-15). 01:1116: name BR :1652-1690 and :4387 as the S1 update scope (D-16).
- GUIA §9b (:662-710), PLAN:69, 01:68/:76/:1098/:1130: one build recipe, no Z: drive, no build into the share bin, accepted warnings = the BR:4226 list (D-03).
- PLAN:66 and GUIA §1.5 (:166-170): replace 'always HTTP 200' with 'per-route contract; never change an existing status code without a route rule' (D-04).
- PLAN:20-48 counts: 119 live routes (26 SAP / 63 LAN / 25 Magento / 5 local). Package 8 is 7/19/0, Wallet is 2 SAP / 1 LAN, Mercancia is 0 SAP / 5 LAN (D-13).
- PLAN §7: remove 'setreturn ya está en producción', 'falta la URL del liberador', 'sin commit', 'price/cost/coupon open' and the Division blocker. Add ManagePaynetOrders, InsertPaymentData, GetPickUpCode, getGuide and authorizationResult. Mark getOrderId and getOrderInfoAndSet/jsonOrders as retired (LT decision, f66148a).
- PLAN:88-96 'verificar, no construir' conflicts with the spec's CONSTRUIR tasks. PLAN:71 and SKILL rule 25: E2E means Fable prepares, you run, Fable compares (D-09).
- CREDITO §6.2.1 R4 step 2 (:564): keep the DU13 join (D-32). Re-cite §6.2/§6.4 lines at 6214ed8 or anchor edits on quoted code (D-02). Replace §4.2 'sin commit' with the D-06 commit policy.
- 01 spec: Marst is decided by DU18 and P5 by DU12 (01:51, :141, :287, :336, :350, :1183, :1315). CSPROJ:369 is now :370 and the csproj has a BOM (01:60). 01:123/:193-199/:1338 must name origin/Production, not master, as production. 01:1078: S1 and S2 cannot run in parallel because both edit §1.4.
- 01 §2.3 and §3.6/§3.7/§3.9 plus BR RCLI-14/16, RCOM-6 and RPR-123: rewrite for the cached-token Curl (9008609) before S3 (D-17).
- Business Rules: add a POST /credit/codigoPromocion block; route count 111; RORD-34 (bank-transfer pickup writer); catalog citations; CreditController citations +16; RCLI-19 'always 200'; :4387 Marst; Spart wording (:141 vs :457) (D-05).
- PLAN_EJECUCION §27.3 CUP-1 and BR :588 say codigoPromocion has no route; it exists (verified). E-45 contract: drop the 'Elimina returns empty string' divergence (it is parity, verified).
- Vault: CHECKLIST_MIGRACION:288/:357, ESTADO:1290-1297, CHECKLIST_DEV3:489 and _PLAN_MIGRACION_FECHAS:203 describe the old LAN-first DMZ Curl; correct them to the real ServicioSAP-only coupling (C-03). Also correct README:41 and CHECKLIST_MIGRACION:122 (the third pickup writer is ported) and CHECKLIST_DEV3:508/:331 (sap-client 050 and HandlePromoCode are already fixed).
- GUIA:78-83 (§0.2 product/updateStock example has the call direction reversed); GUIA:547 and PLAN:122 ('Wallet' should be SD18); GUIA:617 (C12 is now at ProspectoController.cs:47); GUIA:631 and PLAN:209 (64 should be 68 ENVIROMENT_DEV sites).
- PLAN blocker table (:224-239): add ticket 10226 scope, RFC annexes, wholesale values, SD18/AWS owners, Atentus owner, the DU2 Magento remap, route ownership against the Gantts, and the release branch (C-01). Move the JWT split and ENVIROMENT_DEV from packages 13/14 to plan-wide.
- Add to PLAN 'Lo que se aplica a TODOS': the destination-database rule, SIGMAVI naming (D-11), 'new ServicioSAP to DMZ calls use Helpers/ConexionDMZ/Curl' (D-39), and 'preserve each route's body shape' (D-12).
- MAVI - DMZ-SAP.csv: row 63 (login is not an equivalence), row 114 (wholesale is POST with a body), row 36 (cashCustomerReport exists), and N/A for LAN-only rows.

## 9. Secuencia recomendada

- 1. Today, answers only you can give (about 30 minutes): D-01 baseline rule, D-06 commit policy, D-14 (T1.1-02 out of S1), D-15 unquoted filter, D-16 BR scope, D-17 = option B, D-09 overrides. X-1 and the root path are already decided.
- 2. You or Marcos run the build once (D-03 option A) and write the winning command into GUIA §9b, PLAN:69 and 01 §0.5.
- 3. Approve a doc-only Fable session to apply the plan_fixes for package 1 and the credit plan, resync Business Rules against 6214ed8 (D-05) and re-cite lines (D-02).
- 4. Run Fable S1 (T1.1-01, one line), then S2 (ConfigureAwait plus happy-path kits), one after the other. In parallel, if you want Fable on the credit work, run CREDITO R1 and R3 (no open decision). Each session ends with you building and deploying to DEV and running the prepared request against a named binary (C-08).
- 5. Decide the plan-wide items that unblock the next wave: X-2 (D-04), the LAN reference branch (D-07), route ownership (D-08), and the scope gates (D-23, D-30, D-31, D-45, D-49, D-50, D-53, D-55). Tell Dev 3 about Credilana and M-03 before October work continues.
- 6. Answer the package 1 CQs (D-18..D-22) after capturing a real Magento payload and running step 0. Then run S3/S4/S5. Draft small specs 8a-1, 9a and E-45, then 7b, then 02/04 (D-13).
- 7. Connections track, run in parallel by the DMZ owner and infra: fetch and locate 97d6aea, reconcile ConexionSAP with origin/Production (C-01), choose the first-release scope or a per-route switch (C-02), prepare the per-environment configs (C-03..C-05), and trace LAN-only callers (C-15). The Magento team prepares the BP release and the config export (C-09, C-10).
- 8. Release order: ServicioSAP, then the DMZ with parity-verified bridges only, then flip routes in waves after each E2E. Magento's BP release goes with the BP-keyed routes. Credit routes go last (after DU11/DU20). LAN is switched off only after the scheduler is relocated (C-16) and the list data is loaded.

## 10. Sin verificar

- Which DMZ and ServicioSAP branch and binary each IIS environment serves, and whether the share DLL (2026-10-02 18:37) was built from 6214ed8: NO EVIDENCE.
- Where DMZ commit 97d6aea (E-45 cutover, 2026-09-28) lives: it is not in the local clone, which was fetched 2026-09-17. origin/* facts are as of the last fetch (DMZ 2026-09-17, LAN 2026-08-27).
- Stage/PROD values of the JWT keys, URL_* keys and Magento admin-config URLs: NO EVIDENCE. Only the committed LAN and ServicioSAP Web.configs were compared by hash.
- Runtime behavior since 2026-09-17 (sap.log has nothing newer). The cached-token Curl, the 300 s catalog timeout and the bank-transfer pickup writer have no E2E.
- Whether BP05 can filter by ZidMagento (with or without quotes); whether the SMS dispatcher accepts BP rows; whether Magento's Neko module is enabled in production.
- Whether the SPsOrden copy of SpVTASVentaCupon matches production (the Elimina parity conclusion rests on it). SolicitudMercancia (E-44) code was not found in any ServicioSAP ref.
- Agent-reported counts (120 routes and the 26/63/25/5 split, 68 ENVIROMENT_DEV sites, 367 LAN commits) were not recounted. Spot-checked and confirmed: HEAD 6214ed8 clean; 01:1105/:1136 baseline; SBPC:48; BPM:578; no Z: drive; VS18 and Framework64 MSBuild present; quick_build.ps1 present; DMZ Curl constructor uses SAP-only login with rethrow; 97d6aea absent; getSms/validateSms/codigoPromocion on curl.Post; Production not an ancestor of ConexionSAP (89 commits); GetPlazosCteC and the 3-segment productWithWebsites only on Production; E-22 '/1000'; authorizationResult snake_case vs camelCase; ZSD_{tipo} in cancel; DMZ setCustomer PostSAP; LAN Production calls updateConfigurableProductLink.
- Everything was read-only: no edits, builds, fetches, SQL or endpoint calls, and no secret values were read or reported.
