---
tags: [migracion, sap, fable, revision]
fecha: 2026-10-02
estado: analisis
---

# Revisión del plan Fable por controlador — 2026-10-02

> [!abstract] Qué es esto
> Revisión de [[PLAN_FABLE_POR_CONTROLADOR]], [[PLAN_FABLE_CONTROLADORES/01_CustomersController]], [[GUIA_MIGRACION_FABLE]], `SKILL.md` y las tareas Fable del crédito ([[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]] §6) contra el código actual (ServicioSAP HEAD 2cf425f + 4 archivos sin commit, +109/-64; DMZ HEAD 09cb341). Workflow `wf_0e34822f-15e` (5 revisores + sintetizador, solo lectura). Es **análisis**: no cambia el plan; [[Business Rules Ecommerce]] sigue siendo la fuente única. Resultado crudo: `_REVISION_PLAN_FABLE_2026-10-02.json`.

## 1. Respuesta

No. The per-controller plan is not ready to hand to Fable as a whole: business rules must be confirmed and the plan corrected first. Only package 1 (CustomersController) has a detailed spec, and right now Fable can only do two pieces of it without guessing. The first is a cut-down S1: task T1.1-01, which makes partner/client return the BP number instead of the whole Client. The second is S2: adding ConfigureAwait and preparing test kits. I re-checked their preconditions on 2026-10-02. ServicioSAP is at HEAD 2cf425f with only the 4 credit files modified (+109/-64), BusinessPartnerController.cs:48 still reads 'return Ok(result);' and BusinessPartnerMethods.cs:578 still has Fiscalregimen "". Even that first session needs these prompt fixes:
- The root path in SKILL.md (CATECINF214058D) cannot be reached from this machine, and the rules tell Fable to stop on a bad path.
- GUIA §9b builds from a Z: drive that does not exist.
- You need to decide whether Fable updates Business Rules Ecommerce.md: SKILL.md:29 requires it, while 01_CustomersController.md:86 forbids it.
- T1.1-02 (FiscalRegimen 605) should wait for an answer from the SAP fiscal owner.

For the other packages:
- Packages 2-9 have open business decisions and no detailed spec. I list 116 rules to confirm, in your WHAT / LAN WHERE / SAP WHERE / EXAMPLE / OPTIONS / RECOMMENDATION format.
- Packages 10-14 have no code work for Fable; they only need scope confirmations.
- The credit tasks R1/R3/R4/T1a are settled as business rules, but the diff baseline they check is stale: CREDITO says +126/-44, ACTIVIDADES says +161/-64, and the code is +109/-64. Every line they cite has moved, and R4 step 2 as written would undo DU13 (first name plus middle name), so Fable would stop at step 1.

I did not edit, build, run SQL or call any endpoint.

## 2. Estado por paquete

| Paquete | Estado | ¿Arranca hoy? | Confirmaciones | Por qué |
|---|---|---|---|---|
| 1 · CustomersController (customer/*), spec PLAN_FABLE_CONTROLADORES/01_CustomersController.md | READY_AFTER_CONFIRMATIONS (partially ready: S1 limited to T1.1-01, and S2, can start now) | sí | 17 | Spot-checked 2026-10-02: - The preconditions S1 checks still hold: SpExportaEcommerce at HEAD 2cf425f with only the 4 credit files modified; BusinessPartnerController.cs:48 reads 'return Ok(result);'; BusinessPartnerMethods.cs:578 has Fiscalregimen "". - The DMZ customer/setCustomer applies Trim('"') to the PostSAP body (DMZ CustomersController.cs:30), so T1.1-01 restores LAN's bare-account string shape without guessing anything.  Still open: - About 20 tasks are DECISION (CQ1-CQ8, CQ11-CQ15, CQ20, CQ21, CQ24). - T1.1-02 needs the fiscal answer (N1). - T1.1-03 (CONSTRUIR) needs proof that BP05 can filter by ZidMagento. ZidMagento is an int (Partner.cs:36), but the spec at 01:323/:370 builds the filter with a quoted value. - Out of date in the spec: the OM line references (the guard is now OM:2607-2613, not :2623-2629), and P5/P14, which DU12/DU18 already settled. - PLAN:88-94 still says 'verificar, no construir'. |
| 2 · ProspectoController (prospecto/rfc, prospecto/recuperarcuenta) | NEEDS_SPEC_FIRST | no | 5 | There is no 02 spec. - rfc depends on the Intelisis tables RFCAnexoI-IV, which have no destination. - recuperarcuenta is bridged but is one of the 8 broken routes: required fields, name matching, masking (C17) and filter escaping (C12) are all open. - PLAN:100-102 wrongly says the package is 'contenido y sin dependencias'. |
| 3 · WholesaleCustomerController (company/*) | NEEDS_SPEC_FIRST | no | 3 | - The GET has been bridged since 2026-08-26; PLAN:108 still says the route does not exist. - The DMZ regex now rejects C-accounts. - negotiable-quote has no SAP design: no SAP org, channel or agent values for wholesale (mayoreo). |
| 4 · WalletCustomerController (customer/wallet/*) | NEEDS_SPEC_FIRST | no | 7 | - The destination ('Wallet' vs SD18) is unconfirmed. - C10 (UEN), the titular, the lookup key and the C09 algorithm are open. - No SD18, DM01 or AWS-catalog response has been captured. - The plan's count is stale: it is 2 SAP / 1 LAN (DMZ WalletCustomerController.cs:81 PostSAP, verified). |
| 5 · StatusController (status/getStatus) | NEEDS_SPEC_FIRST (scope decision) | no | 1 | Dev-1 discarded it on 2026-08-11, while _ALCANCE says to rebuild it as a health check. It is an ICMP ping, not a database check. The external monitor (Atentus) and its owner are unknown. |
| 6 · RecommenderController (recommender/*) | OUT_OF_SCOPE (pending user confirmation) | no | 1 | - The tracker marks all 3 routes Deprecado, and Magento has 0 callers. - The plan still lists the package, and PLAN:132 wrongly says there is no prior analysis. |
| 7 · OrdersController (whole package) | NEEDS_SPEC_FIRST | no | 2 | - There is no 07 spec. - The count is 19 live routes: 4 SAP, 8 LAN and 7 Magento, plus validateCredit, which is commented out at DMZ OrdersController.cs:370 (verified). The plan says 20 · 3 · 9 · 8. - The sub-package table lists LAN-only routes and leaves out DMZ routes. - The callers of the LAN-only routes are unknown. |
| 7a · order/new, contado branch | READY_AFTER_CONFIRMATIONS (spec still to write) | no | 10 | The flow is well documented (BR RORD-1..38). What is open: - The response and retry contract to Magento. - Precio especial (special price) and the SD29 floor. - The shipping cost. - The DIM11 stock gate and the cellphone region rewrite, neither of which LAN had. - Placeholder values. - The guest BP and the Z1 agent, which MAVI has to supply. |
| 7b · cancelOrder / returnOrder (order/setreturn) | READY_AFTER_CONFIRMATIONS (core cancel blocked by SAP) | no | 8 | Verified: cancel builds ZSD_{tipo}_ from Magento's tipo 'T'/'P' (ServicioSAP OrderMethods.cs:2966-2971; Magento CustomerCancelOrderObserver.php:78), so every Magento cancellation answers 'noexiste'. The return body sent by Magento has no store field. Cancelling an order with no delivery waits on the SAP ZIDSTATUS=03 API. The policy for invoiced orders is a business decision. |
| 7c · credit routes (creditStatus, updateCreditOrderId, validateCredit) | BLOCKED_OTHER_TEAM | no | 0 | Waits on the liberador (DU11, Valentín), on T2a/T2b (credit area, Alan, Dev 2) and on a new SAP OData for ZIdEcommerce (DU20). validateCredit is N/A because it is commented out. |
| CREDITO plan S1 (R4 → R3 → R1 → T1a; feeds 7a/7c) | READY_AFTER_CONFIRMATIONS (doc fixes first) | no | 4 | The business rules are decided (DU1-DU19). As written, though, the session stops at step 1: - The baseline check expects +126/-44 (CREDITO:1135); the real diff is +109/-64 (verified). - '[CREDITO SIN CUENTA]' no longer exists (verified 0 hits). - R4 step 2 (CREDITO:564) would undo DU13; the code at SolicitudCreditoWebMethods.cs:238-240 keeps the join (verified). - The questionnaire re-asks P2/P3/P5/P6/P8/P13-P15, which are already closed. - T1a carries two differences from LAN that no recorded decision covers. |
| 7d · Openpay and store pickup (checkOpenpay, ManagePaynetOrders, InsertPaymentData, pickup codes) | NEEDS_SPEC_FIRST | no | 6 | - There is no SAP design for Openpay reprocessing or for Paynet AFECTAR/CANCELAR. - InsertPaymentData has no destination. - The callers are unknown. - The pickup routes already in ServicioSAP have a different contract from LAN. - The 'liberado' bypass would be a new parameter, which needs approval. |
| 7e · order queries (getIntelisisStatuses, getPosCancellations, estimated-delivery, getOrderInfoAndSet, getOrderId) | NEEDS_SPEC_FIRST | no | 5 | - SD36 cannot list by date. - The tracker maps getPosCancellations to cancelInvoice, which is the opposite operation. - There is no tracking source. - There is no status vocabulary mapping. - getOrderId was retired on 2026-09-21 (BAJA_getOrderId.md, verified), but the plan and CREDITO P9 do not say so. |
| 8a-1 · customerService LoginClienteCredito / LoginClienteCreditoFechaN | ALREADY_DONE_OUTSIDE_PLAN (switch done; parity open) | no | 5 | - The DMZ already calls PostSAP (DMZ CustomerServiceController.cs:218, :229, verified; commit 212b04e). - 5 contract differences with LAN are open: the email source, the error-to-false conversion, the 400 on empty input, birth dates before 1970, and how the name is built. - There is no E2E. |
| 8a-2 · customerService/GetEmpleadoByNomina | NEEDS_SPEC_FIRST | no | 1 | There is no ServicioSAP destination. The candidate is an internal SuccessFactors wrapper with a different response shape. Magento's RegisterSeller reads {Nombre, Nomina}. The route is in Dev 2's backlog (S7-01). |
| 8b · BBVA/STP payments + Neko trio | BLOCKED_OTHER_TEAM | no | 5 | - There is no SAP write target for CXCCFacturaMultipagoBBVA: the ABAP logic is missing and there is no RSG fiche. - The work belongs to Dev 4. - The Neko stubs are CustomerService routes, not package 9. - Magento still has the Neko module enabled. |
| 8c · customerService queries (obtenerCreditos, nombreCliente, validarCoberturaPorCP, obtenerVentanaConfirmacion, ObtenerEstatusEmbarque) | NEEDS_SPEC_FIRST | no | 6 | - obtenerCreditos was already built by Dev 2 and has differences from LAN. - 3 routes need undocumented equivalences. - ObtenerEstatusEmbarque is blocked by ABAP. |
| 8 · other customerService routes (validarCliente, GetAccountDebts, Tablerate x3, obtenerTipoGarantia, bitacoraAtencionClientes) | NEEDS_SPEC_FIRST | no | 5 | - These are not in 8a/8b/8c. - GetAccountDebts is bridged but broken (C08). - validarCliente has 2 regressions. - The 3 Tablerate routes target LAN routes that were removed in 2022. - The other 2 are planned by Dev 3. |
| 9a · credit/getSms + credit/validateSms DMZ switch (ACT-34) | READY_AFTER_CONFIRMATIONS | no | 2 | - ServicioSAP has both routes and their codes match LAN. - The DMZ still calls curl.Post to LAN (DMZ CreditController.cs:76, :107, verified). - The timing must line up with Magento sending BPs and with porting GetPhoneValidatedClientSecretName. - No one has confirmed the SMS dispatcher handles BP-keyed rows. - The owner is the DMZ owner, not Fable. |
| 9 · credit routes already bridged (getClienteFactura, SendSmsNewNumber, SaveImagesProductosMx, GetCreditAmounts, getPlazos, guardardocumento) | ALREADY_DONE_OUTSIDE_PLAN | no | 3 | - Three routes have E2E. - getClienteFactura always returns 500 (array vs JObject). - GetCreditAmounts returns 500 until mavi_credilana_info has an owner who fills it. - guardardocumento is [AllowAnonymous] on the DMZ. |
| 9 · balances and wallet unification (getClienteSaldo, MonederoSaldoCredito, unification x3) | BLOCKED_OTHER_TEAM | no | 4 | - getClienteSaldo needs N1/N2 captures and N4-N16 decisions. - CREDIHUnificacionMonedero has no SAP table. - The documents name 3 different sources for the wallet balance. |
| 9 · scope exclusions (Credilana, deprecated routes, SolicitudMercancia) | OUT_OF_SCOPE (pending user confirmation) | no | 3 | Only CreditoWeb_Seguro has a written confirmation. 11 more are candidates for exclusion: they use SPCREDICredilana, the CSV marks them Deprecado, or they belong to APP mercancías. |
| 9 · remaining credit routes (getCreditAccount, GetPhoneValidatedClientSecretName, SaveHaztenTransaction, SaveFirstData, SaveData_Articulos) | NEEDS_SPEC_FIRST | no | 3 | None of them has ServicioSAP code. The ProductosMX routes are deferred to the Feb-Mar 2027 GANTT window (CREDITO:1170). |
| 10 · ProductsController (DMZ product/*) | NEEDS_SPEC_FIRST (scope decision; likely out of count) | no | 2 | - These routes push data to Magento and are called by LAN batch jobs, so switching the bridge does not apply. - Replacing the jobs belongs to Dev 2 Sprint 9. - 2 routes have no caller in the code. |
| 11 · MagentoController (DMZ magento/*) | ALREADY_DONE_OUTSIDE_PLAN | no | 1 | The DMZ routes pass calls straight to Magento. ServicioSAP already calls 11 of the 13; the other 2 are deprecated. Only the scheduler for catalog/* still needs an owner. |
| 12 · MercanciaController (APP mercancías) | OUT_OF_SCOPE | no | 1 | The routes belong to the APP mercancías project (SKILL rule 30). The plan says these routes have no calls, but all 5 call LAN via 'new Curl().Post' (DMZ MercanciaController.cs:26, :41, :69, verified). |
| 13 · LoginController (DMZ login/authenticate) | OUT_OF_SCOPE | no | 2 | This is the DMZ's own token issuer and has no equivalent. The 'separate the JWT keys' item in the plan would break the DMZ routes that still call LAN, unless it is coordinated. |
| 14 · LoggingController (DMZ /logging) | OUT_OF_SCOPE | no | 1 | This is a local log sink. The ENVIROMENT_DEV item belongs to ServicioSAP: there are now 68 sites, not 64, and GUIA §8.6 treats it as a prerequisite for the move to Stage/PROD. |

## 3. Primera sesión recomendada

Package 1, S1, limited to T1.1-01 (developer Marcos). This calibration case has no business guessing in it:
- Change ServicioSAP Controllers/BusinessPartnerController.cs:48 from 'return Ok(result);' to 'return Ok(result.Partner.Trim());'.
- The DMZ customer/setCustomer already strips the quotes (DMZ CustomersController.cs:30), so Magento gets the bare BP string, the same shape as LAN's C account.
- sap.log of 2026-09-17 shows BP01 returns a Partner for this payload.
- The edit only touches BusinessPartnerController.cs, not the 4 uncommitted credit files.
- Its preconditions hold today: HEAD 2cf425f on SpExportaEcommerce, only the 4 credit files modified (+109/-64); :48 and BusinessPartnerMethods.cs:578 as the prompt expects.

Patch the S1 prompt (01_CustomersController.md §4.1, about lines 1095-1117) before launching:
1. Give the root as //172.16.214.58/sap, overriding the paths in SKILL.md:18-27.
2. Build with 01 §0.5 V1 (the UNC MSBuild), not GUIA §9b (Z: drive).
3. Remove T1.1-02 until N1 is answered.
4. Step 0: use 'ZidMagento eq <id>' without quotes (keep the quoted form only for comparison) and drop the Mail GET.
5. Add the Business Rules update for POST /partner/client (Business Rules Ecommerce.md:1652-1690, :4387) if you choose X-1 A; otherwise say it is excluded.
6. Ignore the C:/BackEndEcommerce memory claim.
7. Fable prepares the E2E request and expected value (DMZ POST customer/setCustomer → 200 "15000XXXXX"); you run it on a binary that includes the change.
8. No commit.

Success means:
- git diff touches only BusinessPartnerController.cs, with one line changed.
- The file stays w/crlf with no BOM.
- MSBuild succeeds with its output outside the share.
- Fable stops and reports, instead of improvising, on anything that does not match.

S2 (Diego: ConfigureAwait at CustomerMethods.cs:21, :33, :52, :56, :88; CashReportMethods.cs:67; MagentoAccountMethods.cs:24, :34, all verified, plus the test kits) can be the second calibration session.

Do not start the CREDITO S1 (R4→R3→R1→T1a) until CR-1 and CR-2 are answered and the ACT-01/02 doc fixes land. As written, Fable stops at the baseline check.

## 4. Correcciones al plan antes de dárselo a Fable

- Plan-wide: SKILL.md:18-27 and :61, and GUIA_MIGRACION_FABLE.md:94 (§0.3), use the root \CATECINF214058D\Migracion SAP. From this host it fails (checked 2026-10-02, rc=2), and SKILL rule 5 / GUIA §0.3 tell Fable to stop on an unresolved path. Change it to //172.16.214.58/sap, or override it in every session prompt.
- Plan-wide: GUIA_MIGRACION_FABLE.md:671 (§9b) builds from Z:\ServicioSAP, and there is no Z: drive. PLAN_FABLE_POR_CONTROLADOR.md:68 and the S1/S2 prompts (01_CustomersController.md:1101, :1133) send Fable to §9b. Point them to 01 §0.5 V1 instead (UNC MSBuild at 01:70-74), or fix §9b.
- Plan-wide: PLAN_FABLE_POR_CONTROLADOR.md:56-70 (mandatory reading and closure criteria) does not mention Business Rules Ecommerce.md, which SKILL.md:29 requires updating in the same change. Add it once X-1 is answered. Also reconcile 01_CustomersController.md:86 and add the update step to 01:1114, :1142, :1171, :1199, :1226.
- Plan-wide: PLAN_FABLE_POR_CONTROLADOR.md:66 ('con HTTP 200') and GUIA_MIGRACION_FABLE.md:166-170 (§1.5) contradict existing ServicioSAP routes that answer 400/404/500 (Business Rules :703, :781, :1298, :3340) and contradict the CQ6 recommendation. Add the X-2 ruling: never normalize an existing status code without a route decision.
- Plan-wide: PLAN_FABLE_POR_CONTROLADOR.md:20-45 counts (derived 2026-09-14) are wrong:
- 119 live routes, not 120: the validateCredit [Route] sits inside a comment (DMZ OrdersController.cs:370).
- Wallet is 2 SAP / 1 LAN (DMZ WalletCustomerController.cs:81).
- CustomerService is 7 SAP / 19 LAN / 0 delegate (DMZ :218, :229 PostSAP since 212b04e).
- Orders is 4 SAP / 8 LAN / 7 Magento.
- Mercancia is 0 SAP / 5 LAN (new Curl().Post).
Also, the counting grep in GUIA_MIGRACION_FABLE.md:343 misses 'new Curl().Post'.
- Plan-wide: PLAN_FABLE_POR_CONTROLADOR.md:62-70 should state that Fable prepares the E2E requests and the user runs them. Fable has no SAP harness, the Fakes are obsolete, and Logs/sap.log is the only real evidence. Otherwise Fable either stops or improvises tests.
- Package 1: PLAN_FABLE_POR_CONTROLADOR.md:88-94 says 'verificar, no construir... Fable no construye nada'. The detailed spec has CORREGIR, CONSTRUIR (T1.1-03) and about 20 DECISION tasks. Defer to the spec, and either drop the 'vocabulario de respuesta (GUIA §3.2)' product or add a task for it.
- Package 1: 01_CustomersController.md:323 and :370 build the BP05 filter as ZidMagento eq '<id>' with quotes, but ZidMagento is an int (ServicioSAP Models/SAP/BusinessPartner/Partner.cs:36, verified). Add the unquoted form to step 0, and drop the Mail GET (already proven in the 2026-08-10 E2E; an email in the route segment can be rejected by ExtensionlessUrlHandler at Web.config:108). The S1 prompt (01:1141-1142, 'Al terminar' step 2) asks for both GETs.
- Package 1: OrderMethods line references in 01_CustomersController.md are stale. The guard at :317 is now OM:2607-2613 (verified). EscapeSapFilterValue at :326 is now about OM:2951-2954. The ZidMagento write at :328 and :1311 is now about OM:2785. Only S4/S5 tasks cite them.
- Package 1: P14/Marst is decided by DU18 (CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:403), so update 01:51, :141, :287 (1.1-R18 becomes an accepted difference), :350, :1183, :1313. P5 is decided by DU12 (CREDITO:397), so update 01:336 and :1183. Add DU13 (CREDITO:398), because it binds the T1.1-04 field order to the credit rows.
- Package 1: 01_CustomersController.md:1087 (§4.0) claims that opening Fable in C:/BackEndEcommerce loads memory rules DU1/DU2/Gender. That folder has no CLAUDE.md or memory. Remove the claim and rely on §0.4.
- Package 1: 01_CustomersController.md:697 (§3.5.1) gives bin/ServicioSap.dll as 2026-09-29; it is now 2026-10-02 10:15 (verified). Record the date at the start of each session, and confirm which binary IIS actually serves (ACT-22).
- Package 1: replace the §5 questions (01_CustomersController.md:1308-1336) with the rewritten rules_to_confirm. The current ones mostly lack the ServicioSAP file:line, an example and options, which your question format requires.
- Package 1: move T1.1-02 (01:135, :310-313) from LISTO to DECISION (N1) until the SAP fiscal owner answers, and run S1 with T1.1-01 only.
- Package 1: do NOT apply the pkg1 review's 'the spec is LF, so skip the CRLF step' fix. 01_CustomersController.md has CRLF on 1354/1354 lines and Business Rules Ecommerce.md on 4580/4580 (verified byte-level 2026-10-02), so the prompts' CRLF rule is correct.
- Business Rules Ecommerce.md (code wins):
- :2071 RCLI-19 'always 200' is false (Logger.cs:26-31 can throw).
- :1989 and :4400 still say the SIGMavi destination is pending (DU19 settles it).
- :4387 'Marst 1 untested' (sap.log of 2026-09-17 shows it accepted).
- :643 RCAN-1 treats tipo as a document class (Magento sends T/P).
- :576 says setreturn receives store, but Magento's return body has none.
- Package 2: PLAN_FABLE_POR_CONTROLADOR.md:98-102 says 'contenido y sin dependencias externas', which is wrong (RFCAnexoI-IV and helper SPs). GUIA_MIGRACION_FABLE.md:617 cites the C12 filter at ProspectoController.cs:46, :48-49; it is now :47. MappingMetods/ProspectoController/rfc/03_BusinessMethod.md gives the response as {rfc, estado}; LAN returns {RFC, status}.
- Package 3: PLAN_FABLE_POR_CONTROLADOR.md:108 (also AUDITORIA:129, :817, D-04 :1101) says company/wholesale-customer does not exist. It is bridged (DMZ WholesaleCustomerController.cs:26-27; ServicioSAP WholesaleCustomerController.cs:10-15). The DMZ regex change at :21 (C-account to BP) is not mentioned.
- Package 4: PLAN_FABLE_POR_CONTROLADOR.md:37 and :116 say getMinimumCostToRedeem is not connected; it has been since 0230bca (verified). PLAN:118 says 'tres defectos verificados' but names only C10. PLAN:120 and GUIA:547 call it 'Wallet', but the code uses SD18. GUIA:547 says VentasCanalMAVI comes from SD52, but WalletMethods.cs:79 reads the AWS catalog.
- Packages 5/6: PLAN_FABLE_POR_CONTROLADOR.md:124-132 keeps Status and Recommender in scope, although Dev-1 discarded them (_PLAN_MIGRACION_FECHAS.md:16, :135, :180) and the tracker marks Recommender Deprecado. PLAN:126 says 'ping a la BD'; it is an ICMP ping. PLAN:132 says 'sin análisis previo', but 5 mapping docs exist.
- Package 7:
- PLAN_FABLE_POR_CONTROLADOR.md:136-148 has wrong counts.
- The sub-package table lists the LAN-only checkOpenpay, createStorepickupCode, getOrderId and getOrderInfoAndSet, and leaves out ManagePaynetOrders, GetPickUpCode, getGuide and authorizationResult.
- PLAN:144 still lists credit price, cost and coupon as open (closed by DU14/DU16).
- PLAN:146 and :228 say the liberador URL is the blocker; the real blocker is the contract, plus DU20.
- PLAN:233 lists Division as a Fable blocker; it is not.
- getOrderId was retired on 2026-09-21 (BAJA_getOrderId.md), but CREDITO P9 still treats it as open.
- AUDITORIA C01/C02 are superseded.
- Packages 8/9:
- PLAN_FABLE_POR_CONTROLADOR.md:156 and :216 say the Logins are not connected and GetEmpleadoByNomina is a clean switch. Both are wrong: the Logins have used PostSAP since 212b04e, and the GetEmpleadoByNomina target is an internal wrapper.
- PLAN:158 does not know obtenerCreditos is already built (74d7c2f).
- PLAN:172 puts the Neko stubs in package 9; they are CustomerService routes.
- PLAN:162-172 does not mention that getSms/validateSms exist, that getClienteFactura always answers 500, or the Credilana/deprecated exclusions.
- Resources/flujo_abonos_credito.md (cited at PLAN:157) contradicts LAN GetSTPAccount.
- GUIA §6.4 and §8.3 list FN_MAVIRM0906CalculaBonifCC and SP_ACTES_REGISTRO as missing; both are in SPsOrden.
- Packages 10-14:
- PLAN_FABLE_POR_CONTROLADOR.md:178 says all 8 product routes call the Magento helper; only 5 do.
- PLAN:182 and :236 say 'sin dueño'; owners exist (Diego, Javier/Dev 2 S9-01..07).
- PLAN:198, :29-30 and :45 say mercancias makes no calls; they call LAN.
- PLAN:206 lists the JWT split with no coupling warning (GUIA §8.1/§8.5.1).
- PLAN:207 says 64 ENVIROMENT_DEV sites; there are 68, and it is a prerequisite for the move to Stage/PROD (GUIA §8.6).
- GUIA_MIGRACION_FABLE.md:78-83 (§0.2) has the product/updateStock example backwards.
- Blocker table PLAN_FABLE_POR_CONTROLADOR.md:224-236:
- The liberador row (:228) no longer affects package 9.
- 'Fuente del saldo | SAP' (:229) is now N1-N16 with owners.
- Missing rows: the payment-reference ABAP write logic (8b), the Zidstatus catalog, the coverage source, CREDIHUnificacionMonedero, the mavi_credilana_info owner, the SAP annulment API, the callers of the LAN-only routes, and the ownership overlap with the Dev 2/3/4 roadmaps.
- CREDITO plan:
- The baseline at CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:411, :427, :1135, :1243 and :1279 says +126/-44; the real diff is +109/-64 (verified).
- §5.1:417 expects '[CREDITO SIN CUENTA]' at OM:648; it no longer exists (verified).
- R4 step 2 at :564 undoes DU13 (verified against SolicitudCreditoWebMethods.cs:238-240).
- Line references are stale at :550, :562-573 (R4), :582, :587 (R3: now SCW:387, :394, :399), :593-599 (R1: OM:654 is now :651, verified) and :604-626 (T1a, -17 lines).
- §6.0 :464-465, §6.1 :500-513 and §6.3 :632-658 still list P2/P3/P5/P6/P8/P13/P14/P15 as open, although DU12-DU19 closed them.
- ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md:
- :22 and :66 say +161/-64; the real diff is +109/-64.
- :22 says the share DLL predates the 09-30 changes; it was rebuilt 2026-10-02 10:15 (verified), from a source no one has confirmed.
- :150 (ACT-02), :156 (ACT-08) and :157 (ACT-09) propose corrected lines that are themselves stale. The current lines are OM:626/:651, SCW:387/:394/:399 and OM:1177-1265, and Business Rules :1088-1090 already cites them.

## 5. Bloqueos con dueño

| Bloqueo | Dueño | Paquetes |
|---|---|---|
| The root path in SKILL.md/GUIA (CATECINF214058D) cannot be reached from this machine, and the GUIA §9b build uses a Z: drive that does not exist. The rules tell Fable to stop on an unresolved path. | User (doc fix or prompt override) | All sessions |
| Undecided whether Fable updates Business Rules Ecommerce.md (SKILL.md:29 vs 01_CustomersController.md:86) | User (X-1) | All sessions |
| Every E2E needs SAP DEV access, a deployed binary that includes the change (the share DLL was rebuilt 2026-10-02 10:15 from an unknown source; which binary IIS serves is unknown), and per-case approval to create BPs or write to SIGMavi, Magento or the share. Fable cannot run them. | User + infrastructure | All |
| Shared uncommitted working copy: the credit edits in OrderMethods, SolicitudCreditoWebMethods, FinalListProperMethods and InfoClienteRequest (+109/-64). The commit/stash order (ACT-27) must be agreed before any task touches OrderMethods. | User / Marcos | 1 (T1.1-03, T1.1-07), 7a, 7b, CREDITO |
| BP05 filtering by ZidMagento not yet proven (run step 0 with an unquoted int). If it fails, SAP/ABAP must expose the query. | Marcos prepares, user runs; SAP/ABAP | 1 (T1.1-03) |
| Real Magento setCustomer payload, gender encoding and the consumer of the returned account (no caller in Magento248/app/code) | Magento/Omnipro team | 1 (CQ1, CQ3, CQ10) |
| Fiscal regime for a BP with the generic RFC XAXX010101000 | SAP FI/SD fiscal owner | 1 (T1.1-02) |
| Source of SpListaNBMagento and the ListaNegra/ListaBlanca DDL and collation | Diego + SIGMavi DBA | 1 (lists) |
| QA run of cashCustomerReport with the SMB copy (LogonUser 1326) | Diego + IIS/share admin | 1 |
| Callers of the LAN-only routes are unknown: checkOpenpay, createStorepickupCode, generateNewStorepickupCode, getOrderInfoAndSet, the setOrderStatus logic, customer/getCuenta/setCuenta, and the Atentus status monitor | User / Infra (IIS logs, Task Scheduler) | 1, 5, 7, 10 |
| DMZ release: the bridges exist only on DMZ ConexionSAP (HEAD 09cb341); origin/master and Stage still send everything to LAN. Deployment order: ServicioSAP first, then the DMZ. | DMZ owner (Marcos/Diego/Uriel/Javier) + infra | 1, 8a, 9a |
| SAP API to annul an order (ZIDSTATUS=03), with an RSG fiche | SAP SD team | 7b, 7d, 7e |
| Liberador contract and callback (DU11), creditStatus/updateCreditOrderId decisions, and the new SAP OData for ZIdEcommerce (DU20) | Valentín, credit area, Alan, Dev 2, SAP | 7c, CREDITO T1b/T2 |
| Generic guest BP per sales org and the generic Z1 agent | MAVI | 7a |
| Shipping-cost item or condition for contado orders | SAP SD team | 7a |
| Wallet contract, the To-Be SD_Monedero doc, SD18 semantics and the meaning of the AWS catalog VALOR1..4 | Wallet team + SAP SD + owner of the AWS catalogs (not named) | 4, 7a, 9 |
| Source of the RFC annex tables (ZQBC_CODEMSTRD content, no RSG fiche) | Javier + SAP BP/code-master team | 2 |
| Wholesale (mayoreo) SAP org, channel, plant, agent, payment term and review-block values; re-keying Magento wholesale_account to BPs | Ventas Mayoreo + SAP SD; Magento team | 3 |
| SAP write logic for payment references (ZAPI_REFERENCIAS_BANCARIAS / ZFICRUD_COBREF_SRV) plus fiches; production value of Magento is_advanced_enabled | ABAP/SAP FI via Dev 4; Magento owner | 8b, 8 (GetAccountDebts) |
| Equivalents of Embarque/EmbarquesMov and of carrier/guide/tracking data | ABAP + Logistics | 8c, 7e |
| getClienteSaldo N1 (zsplits capture) and N2 (LAN capture), and decisions N4-N16 | Dev with S/4 access (Marcos), LAN team, Uriel, ABAP | 9 (balances, getClienteFactura) |
| Destination of CREDIHUnificacionMonedero | ABAP (Dev 2 S4-15) | 9 |
| No owner for filling mavi_credilana_info | User must assign one | 9 (GetCreditAmounts) |
| Confirmation that the SMS dispatcher processes BP-keyed rows; porting GetPhoneValidatedClientSecretName | User / SMS operations; Dev 2 | 9a |
| Route ownership overlaps with the Dev 2, Dev 3 and Dev 4 roadmaps (Logins, obtenerCreditos, BBVA/STP, obtenerTipoGarantia, product jobs) | User (assign per route) | 8, 9, 10, 11 |
| Scheduler for the replacement LAN ImportApp jobs and for ServicioSAP catalog/* | User + Dev 2 / Dev 3 | 10, 11 |
| JWT key separation is coupled to the DMZ routes that still call LAN | Marcos/Diego | 13 (affects all LAN-routed DMZ routes) |
| Openpay SDK and key approval for ServicioSAP | Infra/security + user | 7d |
| APP mercancías has no named owner for after the LAN switch-off | User must name one | 12 |

## 6. Reglas de negocio por confirmar (formato explícito)


### 0 · plan-wide (answer before S1)

**X-1 (was N2)** — Who updates 'Business Rules Ecommerce.md' after each Fable code change in ServicioSAP.
- LAN: N/A: this is a process rule. The conflict is between documents. SKILL.md:29 (2026-10-01) requires the update. 01_CustomersController.md:86 forbids editing other vault docs without approval. PLAN_FABLE_POR_CONTROLADOR.md:56-70 (mandatory reading and closure criteria) never mentions Business Rules.
- ServicioSAP: SKILL.md:29: the route block and its file:line citations are updated in the same change, and 'un cambio de código sin esa actualización no está terminado'. The S1-S5 'Al terminar' steps (01:1114, :1142, :1171, :1199, :1226) leave it out. The block S1 affects is Business Rules Ecommerce.md:1652-1690 (POST /partner/client; its 'Salida y errores' section says 200 with the full Client), plus the pending items at :4387.
- Ejemplo: After T1.1-01, Business Rules still says partner/client returns the Client. Under SKILL.md:29 the session is not finished, but under 01:86 Fable may not correct the document.
- Opciones: A: Authorize Fable to update only the affected route blocks and their citations, never reusing rule ids, and add this as an 'Al terminar' step in every session prompt · B: The user updates Business Rules after each session · C: Leave it out (SKILL.md:29 is then not met)
- Recomendación: A. Add it to PLAN_FABLE:56-70 and to every spec prompt.
- Decide: User


### 0 · plan-wide

**X-2** — HTTP status and body policy for failure branches: 'always 200 with the business result in the body' versus each route's LAN contract.
- LAN: It differs by route. LAN Controllers/CustomersController.cs:15-21 has no try, so failures become 500 and the DMZ answers BadRequest (DMZ CustomersController.cs:34-35). LAN OrdersController.cs:139-161 always answers 200 with a literal. LAN Metodos/CustomerServiceMethods.cs:1250-1254 rethrows, giving 500.
- ServicioSAP: GUIA_MIGRACION_FABLE.md:166-170 (§1.5, marked verified) says ServicioSAP always answers HTTP 200. PLAN_FABLE_POR_CONTROLADOR.md:66 adds 'con HTTP 200' as a closure criterion. Business Rules Ecommerce.md documents routes that answer 400/404/500 today (e.g. :703, :781, :1298, :3340). DMZ Helper/Curl.cs:130-146 turns a ServicioSAP 4xx/5xx into a 200 text body. Magento decides retries from the status code (Omnipro/PlaceOrder/Model/OrderManagement.php:596-610; Omnipro/RmaIntegration/Model/RmaManagement.php:174-176).
- Ejemplo: setCustomer with a BP01 error: on the LAN path Magento got 400 with an empty body; on the ServicioSAP path it gets 200 'WebException ... Body: ...'. setOrder with no stock: 200, Magento marks the order synced and never retries it.
- Opciones: A: Per route, match LAN's status and body, overriding GUIA §1.5 where LAN differed · B: Keep GUIA §1.5 (always 200) and accept that Magento loses its retry signals · C: Decide route by route (CQ6, R7a-1, R7b-4, R8-02, R8-03, R9-07), with A as the default
- Recomendación: C, defaulting to A. Fable must never change an existing ServicioSAP or DMZ status code unless that route's rule says to. Correct GUIA §1.5 and PLAN:66 to match.
- Decide: User + Magento owner

**X-3** — Hard-coded OData service paths versus SKILL rule 20 ('never hard-coded, they go in Web.config') for new ServicioSAP code.
- LAN: N/A: this is a ServicioSAP construction rule.
- ServicioSAP: SKILL.md:60 (rule 20) forbids inline service paths. The reviews counted about 29 inline paths in Methods (e.g. FinalListProperMethods.cs:22, :55, :103; BusinessPartnerMethods.cs:30) against 8 ZAPI_* AppSettings reads. GUIA §1.9b forbids adding Web.config keys without asking.
- Ejemplo: Building prospecto/rfc on ZQBC_CODEMSTRD_SRV: Fable either writes the path inline, breaking rule 20, or adds a key, which needs approval. Either way it has to guess.
- Opciones: A: Amend rule 20: follow the existing pattern of the file being edited, and add no new keys without approval · B: Pre-approve one Web.config key per new service, under a naming convention · C: Centralize together with P14-1
- Recomendación: A now, then C when P14-1 is decided.
- Decide: User + Marcos/Diego


### 1 · CustomersController (S1)

**N1 (T1.1-02)** — customer/setCustomer → BP field Fiscalregimen = '605', as LAN did.
- LAN: SPsOrden/SP_eCommerceCtenuevo.sql:109 and :114 write FiscalRegimen '605' (changed in 2022, per :42-43). Cte.RFC was '' (:129; LAN Metodos/CustomerMethods.cs:33).
- ServicioSAP: ServicioSAP Methods/BusinessPartner/BusinessPartnerMethods.cs:578 sends Fiscalregimen = "" (verified 2026-10-02). The generic RFC Stcd1 'XAXX010101000' is at :516 (RBP-16). sap.log of 2026-09-17 shows BP01 accepts ''. How SAP invoicing uses the field: NO EVIDENCE.
- Ejemplo: A new web BP would get Fiscalregimen 605 with Stcd1 XAXX010101000, a pairing LAN never had (LAN's RFC was empty). Outside the repo and not verified: under SAT CFDI 4.0 the generic public RFC is normally paired with regime 616.
- Opciones: A: Apply 605 as the spec says (DU5 parity), with an E2E · B: Keep '' and record it as an accepted difference · C: Use whatever value SAP FI/SD says goes with the generic RFC
- Recomendación: Get a one-line answer from the SAP FI/SD fiscal owner. Until then, run S1 with T1.1-01 only. Whatever the value, the change goes in its own commit (GUIA §1.8b).
- Decide: User + SAP FI/SD fiscal owner


### 1 · CustomersController

**CQ1+CQ10** — customer/setCustomer → partner/client: which request field fills BP NameFirst, NameLast and NameLst2, and whether names and SmtpAddr are uppercased. Also: what Magento really sends in name/lastName/lastName2/gender/storeCode/idMagento, and who reads the returned account.
- LAN: LAN Metodos/CustomerMethods.cs:21-23 (the comments say name = apellido paterno, lastName = apellido materno, lastName2 = nombre(s)) and :75-77. SP_eCommerceCtenuevo.sql:45 and :115-118 write Cte.Nombre = UPPER(Apaterno Amaterno Nombres), with PersonalApellidoPaterno = UPPER(name), PersonalApellidoMaterno = UPPER(lastName) and PersonalNombres = UPPER(lastName2). Line :133 sets eMail1 = UPPER(email). Sexo = UPPER(gender) (:132).
- ServicioSAP: ServicioSAP BusinessPartnerMethods.cs:422-424 and :477-479 set NameFirst = name, NameLast = lastName and NameLst2 = lastName2, trimmed only. SmtpAddr = email unchanged (:427, :514). Gender = MapGender (:482, :777-798; empty becomes '1' since 2026-09-26). Business Rules RBP-5, RBP-9, RBP-14 (:1666, :1670, :1675). No caller exists in Magento248/app/code.
- Ejemplo: Payload {name:'Ana', lastName:'Lopez', lastName2:'Ruiz', email:'ana@example.invalid', gender:'M'}.
- LAN: PersonalApellidoPaterno=ANA, PersonalNombres=RUIZ, eMail1=ANA@EXAMPLE.INVALID.
- ServicioSAP: NameFirst=Ana, NameLst2=Ruiz, SmtpAddr unchanged, Gender=2 (female).
- Credit later builds 'nombre' from NameFirst (DU13): 'Ana' in SAP against 'RUIZ' in LAN.
- Opciones: A: Strict parity: NameLast=UPPER(name), NameLst2=UPPER(lastName), NameFirst=UPPER(lastName2), SmtpAddr=UPPER(email) · B: Keep the current field mapping and only uppercase the names and email · C: No change; record it as an accepted difference
- Recomendación: First capture one real, anonymized Magento payload. If name is the first name, as every vault test assumes, choose B: uppercasing follows the DU12 principle ('si LAN usa mayúsculas se replica'), and the field swap is recorded as an accepted difference. Choose A only if Magento really sends the paternal surname in name. Use the same capture to check gender: 'M' currently maps to female.
- Decide: User, with the Magento/Omnipro team (payload and response consumer)

**CQ2** — customer/setCustomer: when a BP already exists for this idMagento, return it, update it or create a new one? And which one to use when several BPs share a ZidMagento?
- LAN: SP_eCommerceCtenuevo.sql:62-68 searches Cte by (IdMagento AND eMail1) OR (IdMagento AND Id>2). With no ORDER BY, the last row read wins. Lines :172-201 update the existing row, and also blank the address with CP 0 (:181-187). Line :205 returns the same account.
- ServicioSAP: Missing. ServicioSAP BusinessPartnerMethods.cs:465 always sends Partner = '', so BP01 creates a new BP on every call (RBP-21, Business Rules :1682). A lookup is possible with GetFilterClientsAsync (:249-291). A partial update through the Client model would send the non-nullable bools and ints as false/0, including Xblck, Loevm and ZidMagento (RBP-24, :1704).
- Ejemplo: setCustomer posted twice with idMagento 10555: LAN returns the same C account both times, while ServicioSAP creates 2 BPs. Orders and credit later find 2 BPs with ZidMagento 10555.
- Opciones: a: Look up and return the existing Partner, with no update · b: Look up and update names and email through a new partial-update DTO (new member, needs approval) · c: Replicate the SP update, including the address wipe · d: Keep creating a new BP each time and record the difference
- Recomendación: a, with a deterministic tie-break such as the highest Partner, written down. b only once a partial DTO built from RSG/bp01_bp02_maestro.md is approved. Never c. This depends on step 0 proving that BP05 filters by an unquoted ZidMagento.
- Decide: User; SAP/ABAP if BP05 cannot filter by ZidMagento

**CQ3** — customer/setCustomer for guests (idMagento 0-2): one BP per guest email, the fixed guest BP, or not applicable?
- LAN: SP_eCommerceCtenuevo.sql:62-68: when Id <= 2 the email must also match, so each guest email gets its own C account (:70-160). Updates follow :191-201.
- ServicioSAP: Missing. A guest becomes a new BP with ZidMagento 0 (ServicioSAP BusinessPartnerMethods.cs:432-433, :767-775). The order flow uses the fixed guest BP OrderMethods.cs:41 (GuestCashPartnerNumber).
- Ejemplo: Guest '0' with email g1@example.invalid posted twice: LAN returns the same C account; ServicioSAP creates 2 BPs, both with ZidMagento 0.
- Opciones: Replicate LAN: look up by ZidMagento 0-2 plus email · Return the fixed guest BP from OrderMethods.cs:41 · Not applicable, if Magento never sends guests
- Recomendación: Answer with the CQ10 capture. If Magento does send guests, replicate LAN using the same email normalization as CQ1.
- Decide: User + Magento team

**CQ4** — customer/setCustomer: values LAN never stored. These are Street/NameCo (address), the phone (TelNumber/TelnrLong/toCteTel), Birthdt, Region 'JAL' and the type-20 contact node toCteCto.
- LAN: LAN Metodos/CustomerMethods.cs:24-33 sends '' for address, number, colony, state, CP and RFC. The phone goes to @TelefonoCTe (:37, :94), but the SP never writes it (SP_eCommerceCtenuevo.sql:48). FechaNacimiento is always '1900-01-02' (:140). No contact row is created (only Cte :109 and CteEnviarA :155).
- ServicioSAP: ServicioSAP BusinessPartnerMethods.cs: Street/NameCo at :491, :493; phone at :506, :513, :657-672; Birthdt from dateBirth or omitted (:488, :800-813); Region JAL at :461, :502; contact type 20 at :673-716. sap.log of 2026-09-17 shows BP01 accepts all of these.
- Ejemplo: dateBirth '1990-05-15', a phone, address 'Calle X 123'. LAN Cte stores 1900-01-02, no phone and an empty address. The ServicioSAP BP stores 19900515, the phone in 3 places, the street, JAL and a type-20 contact.
- Opciones: A: Strict DU5 parity: blank address and phone, Birthdt 19000102, Region '' (if BP01 accepts it), blank contact · B: Keep the current values and record them as accepted differences · Per field: decide each one separately
- Recomendación: Decide per field, defaulting to A, with each value change in its own commit. First confirm that credit (BP05MA reads) and ACT-36 do not need the phone or address. Use Region '' or a blank contact only if a DEV E2E shows BP01 accepts them.
- Decide: User

**CQ5** — customer/setCustomer with an invalid idMagento or storeCode, and the 'mavi' store.
- LAN: LAN Metodos/CustomerMethods.cs:42-50 matches storeCode exactly and case-sensitively (muebles_america=1, viu=2, mavi=3). Any other value makes int.Parse throw (:93), and a null storeCode throws NullReferenceException (:43). int.Parse(idMagento) throws on bad input (:74). Either way LAN answers 500 and the DMZ answers 400 (DMZ CustomersController.cs:34-35).
- ServicioSAP: ServicioSAP BusinessPartnerMethods.cs:436-455 uses a case-insensitive IndexOf: 'viu' or '2' map to 05, everything else to 04 (a third org resolver, SKILL 28). ParseMagentoId turns invalid ids into 0 (:767-775) and the BP is still created.
- Ejemplo: 'mavi': LAN uses UEN 3; ServicioSAP uses Vkorg 04. 'VIU': LAN fails; ServicioSAP uses 05. idMagento 'abc': LAN fails; ServicioSAP creates a BP with ZidMagento 0.
- Opciones: Fail like LAN, through the branch chosen in CQ6 · Keep the tolerant behavior · Fail on an invalid idMagento only, and map 'mavi' to a SAP org the business names
- Recomendación: Fail like LAN for an invalid idMagento and for an unknown or null storeCode. Ask whether 'mavi' is still a live store: GUIA §1.7 defines only 04 (MA) and 05 (VIU).
- Decide: User + business owner of the store list

**CQ6** — What Magento receives when customer/setCustomer fails (a BP01 error). This is the route-level case of X-2.
- LAN: LAN Controllers/CustomersController.cs:15-21 has no try, so a failure is a 500. The DMZ sees 'Internal Server Error' and returns BadRequest() with an empty body (DMZ CustomersController.cs:34-35).
- ServicioSAP: ServicioSAP BusinessPartnerController.cs:50-53 returns 400 'Error, ...'. DMZ Helper/Curl.cs:130-141 turns that into 'WebException ... Body: ...', and DMZ CustomersController.cs:37 returns it with 200.
- Ejemplo: BP01 rejects a field. LAN: Magento gets 400 with an empty body. ServicioSAP: Magento gets 200 with the WebException text where it expects an account.
- Opciones: a: Ok('Incorrecto') · b: ServicioSAP returns 500, so the existing DMZ check answers 400, as LAN did · c: Leave it as is
- Recomendación: b. It reproduces LAN without touching the DMZ, but it conflicts with GUIA §1.5 and PLAN:66, so the user has to accept that exception explicitly.
- Decide: User

**CQ7** — customer/setCustomer: strip & ' : < > " / % ( ) = ? from every field, as LAN's sntz does.
- LAN: LAN Metodos/CustomerMethods.cs:184-192 (sntz) runs on every parameter at :74-94. An identical copy exists at LAN OrderMethods.cs:1367-1375.
- ServicioSAP: Missing. ServicioSAP BusinessPartnerMethods.cs:422-434 only trims, and ServicioSAP has no sanitizer anywhere.
- Ejemplo: "O'Brien" is stored as OBRIEN in LAN and O'Brien in SAP. idMagento "1'2" becomes 12 in LAN and 0 in SAP.
- Opciones: Create Sntz in Methods/Utils, register it in the csproj and run it before ParseMagentoId · Do not replicate
- Recomendación: Create it (SKILL 28: a LAN helper with 2+ callers). It is a new member, so it needs explicit approval.
- Decide: User

**CQ8** — Where the guard against an empty Partner from BP01 lives (T1.1-01b).
- LAN: SP_eCommerceCtenuevo.sql:205-206 always returns an account (LAN CustomerMethods.cs:104-117).
- ServicioSAP: ServicioSAP BusinessPartnerMethods.cs:112-114 and :148 return a Client even when Partner is empty. The same guard already exists for orders at OrderMethods.cs:2607-2613 (verified 2026-10-02; the spec cites :2623-2629, which is stale).
- Ejemplo: BP01 answers 2xx with no Partner. After T1.1-01 Magento would get '' as the account.
- Opciones: A: Throw inside the controller's try (an exception to SKILL 17) · B: A new SetCustomerAsync orchestrator in Methods/BusinessPartner (new member, needs approval)
- Recomendación: B. SKILL 17/28 point there, and T1.1-03 needs the orchestrator anyway.
- Decide: User

**CQ11** — customer/setCustomer: the credit-bureau flag SeEnviaBuroCreditoMavi (SAP candidate: Katr1).
- LAN: SP_eCommerceCtenuevo.sql:90, :138 and :157 copy it from the VentasCanalMAVI CONTADO row into Cte and CteEnviarA.
- ServicioSAP: Missing. Katr1 is not in Models/SAP/BusinessPartner/Client.cs. The field name comes from RSG/bp01_bp02_maestro.md:227; its value: NO EVIDENCE.
- Ejemplo: The UEN 1 CONTADO row has a value (unknown). LAN copies it to the customer; ServicioSAP sends nothing.
- Opciones: Add Katr1 with the value SAP functional gives (model change, needs approval) · Accept as not applicable for cash BPs
- Recomendación: Treat it as not applicable until SAP functional confirms the field and its value (GUIA 1.8e: no model field without a captured payload).
- Decide: User + SAP functional

**CQ12 (T1.L-02)** — customer/getCustomerList and customer/deleteCustomerList when SIGMavi or the SP fails.
- LAN: LAN Metodos/CustomerMethods.cs:162-164 opens and executes outside any try, so the call answers 500 and the DMZ answers 400 (DMZ CustomersController.cs:89-90, :107-108).
- ServicioSAP: ServicioSAP Methods/Customer/CustomerMethods.cs:64-70 logs and returns ''. getCustomerList then answers 'No esta en listas' (Controllers/CustomersController.cs:73) and delete answers 'Correcto' (RCLI-10/12, Business Rules :2003).
- Ejemplo: SIGMavi is down and the email is on the black list. LAN made the DMZ answer 400; ServicioSAP answers 200 'No esta en listas', so the email passes as clean.
- Opciones: A: Add throw; after the Logger line (CustomerMethods.cs:66-67) · B: Keep the silence as an approved deviation
- Recomendación: A. This reopens the GUIA:369 / Business Rules 'no volver a reportarlo' note, for the error branch only.
- Decide: User

**CQ13 (T1.2-02)** — customer/setCustomerList: URL-encode the email in the BP05 filter.
- LAN: SPsOrden/SpVTASListaNBMagento.sql:77 compares through a SqlParameter, so any character works (LAN CustomerMethods.cs:136).
- ServicioSAP: ServicioSAP CustomerMethods.cs:81-82 only doubles quotes. BusinessPartnerMethods.cs:252 concatenates the filter into the URL without encoding.
- Ejemplo: LAN inserts 'ana+promo@example.invalid'; ServicioSAP silently skips it. The DMZ answers 'Correcto' in both cases.
- Opciones: Encode only the value (Uri.EscapeDataString at CustomerMethods.cs:81-82) · Leave it
- Recomendación: Encode, after an E2E with '+' confirms the miss.
- Decide: User

**CQ14 (T1.2-03)** — customer/setCustomerList: letter case and trailing spaces of the email when matching the BP.
- LAN: SpVTASListaNBMagento.sql:77 and :106 compare under the IntelisisTmp collation (case-insensitive, trailing spaces ignored).
- ServicioSAP: ServicioSAP CustomerMethods.cs:82 sends Mail eq '<email>'. Whether OData matches exactly: NO EVIDENCE.
- Ejemplo: The BP has ana@example.invalid and Magento sends ANA@EXAMPLE.INVALID: LAN inserts, ServicioSAP may not.
- Opciones: Normalize (needs approval) · Accept the difference
- Recomendación: Let the E2E decide; normalize only if it shows a miss.
- Decide: User

**CQ15 (T1.2-04)** — customer/setCustomerList with an empty email.
- LAN: SpVTASListaNBMagento.sql:74-88 inserts when some Cte row has eMail1 ''.
- ServicioSAP: ServicioSAP CustomerMethods.cs:76: an empty email returns false and the SP is never called.
- Ejemplo: Email '': LAN inserts a row with Correo ''; ServicioSAP does not.
- Opciones: Accept the difference · Replicate
- Recomendación: Accept. Magento sends the email it has just validated with Emailage (Omnipro/EmailageLists/Helper/Data.php:481).
- Decide: User

**CQ20 (T1.5-03)** — customer/cashCustomerReport: sanitize fileName before building the path.
- LAN: LAN Metodos/CustomerMethods.cs:208 and :214 combine the raw fileName (Path.Combine and concatenation).
- ServicioSAP: ServicioSAP Methods/Customer/CashReportMethods.cs:61 and :75 do the same (a literal port).
- Ejemplo: fileName '../../x.csv' writes outside the folder, in both systems.
- Opciones: Path.GetFileName before both combines (an approved deviation from GUIA 1.9) · Exact replica
- Recomendación: Sanitize. Magento always sends CashCustomerReport_<timestamp>.csv (Mavi/CustomCashCustomerReport/Model/ReportDataProcessor.php:71).
- Decide: User

**CQ21 (T1.5-04)** — Logger.SAP can throw from inside a catch and turn a 200 into a 500 (cashCustomerReport and the lists).
- LAN: LAN Metodos/CustomerMethods.cs:219-222: the catch logs nothing and always ends in 200.
- ServicioSAP: ServicioSAP Helpers/Logger.cs:26-31 runs CreateDirectory outside any try (commit 74d7c2f). It is called from CashReportMethods.cs:82-83 and CustomerMethods.cs:66-67. Business Rules RCLI-19 (:2071) wrongly says 'always 200'.
- Ejemplo: On a clean deployment with no write permission on Logs, invalid Base64 should answer 200 {status:500}; instead it answers a real 500, and the DMZ answers 400.
- Opciones: A: The deployment creates <site>/Logs with write access for the app pool · B: Move Logger.cs:26-32 inside the try (shared helper with about 95 callers)
- Recomendación: A now. B as a separate task with the 74d7c2f owner's approval. Correct RCLI-19.
- Decide: User + 74d7c2f owner + infrastructure

**CQ24 (T1.C-01)** — customer/getCuenta and customer/setCuenta (LAN-only routes) when the DMZ call fails after login.
- LAN: LAN Helper/Curl.cs:105-108 returns e.Message, so the route answers 200 with that text (LAN Controllers/CustomersController.cs:95, :104).
- ServicioSAP: ServicioSAP Helpers/ConexionDMZ/Curl.cs:75-104 tries 3 times and then throws. The controller has no try (Controllers/CustomersController.cs:94-108), so the answer is 500.
- Ejemplo: The DMZ stops answering: LAN gives 200 with the exception text; ServicioSAP gives 500 after 6 to 96 seconds.
- Opciones: A: Accept and document it · B1: A local try/catch with maxRetries 1 · B2: Change the shared Curl (needs approval)
- Recomendación: A, until the consumer of these routes is known (IIS logs, CQ23).
- Decide: User


### 2 · ProspectoController

**P2-Q1** — prospecto/rfc → RFCResult.RFC: where the data in RFCAnexoI-IV comes from once Intelisis is switched off.
- LAN: LAN Controllers/ProspectoController.cs:46-63 runs spRegistroSugerir @Cual='RFC', which calls spRFCClaveHomonima.sql:21, :30-31 and spRFCDigitoVerificador.sql:23. It returns {RFC, status:1}, or {'Datos inválidos', 4} when fields are blank (:36).
- ServicioSAP: Missing; there is no rfc route. Both candidates are unverified (⚠️). One is BusinessPartnerMethods.GetConsultaAnexosAsync (:877-907, ZQBC_CODEMSTRD_SRV, no RSG fiche). The other is the MAVI API AI_GET_RFC (businesspartner-dev AI_GET_RFC.py:166-181), which needs sexo and estado and uses a different algorithm.
- Ejemplo: {nombre:'Juan', paterno:'Pérez', materno:'Gómez', nacimiento:'1990-01-01'}: LAN returns PEGJ900101 plus a homoclave from Anexo I/II and a check digit from Anexo III.
- Opciones: A: Port the SP chain to C# and read Anexo I-IV from ZQBC_CODEMSTRD (SAP confirms the ZcodeProgram codes) · B: Port to C# with the annexes embedded as data (needs approval, GUIA §1.9b) · C: Call AI_GET_RFC (changes the contract and the algorithm) · D: Leave it on LAN until Intelisis is switched off
- Recomendación: A if SAP confirms the annexes exist there; otherwise B with explicit approval. Not C.
- Decide: User + Javier; SAP BP/code-master team confirms the content

**P2-Q2** — prospecto/recuperarcuenta: which fields are required, and which status/message pairs come back.
- LAN: LAN Controllers/ProspectoController.cs:82-84 (null body → 'Request vacío', 4). :92-98 (any of the 5 fields blank → 'Datos inválidos', 4, no query). :80/:147 (not found → '', 4). :142-145 (exception → '', 0).
- ServicioSAP: ServicioSAP Controllers/ProspectoController.cs:22-25 requires only rfc and fechaNacimiento ('Request vacío o incompleto', 4). :61 not found → 'Datos inválidos', 4. :71 exception → 'Error interno', 0. An empty second surname can crash ocultarLetrasNombres, giving estatus 0 (Business Rules :2103).
- Ejemplo: Body with apellidoMaterno '': LAN answers 'Datos inválidos' with 4 and runs no query. ServicioSAP queries, and can answer estatus 0 'Error interno'.
- Opciones: A: Replicate LAN exactly (5 required fields, same texts) · B: Keep the relaxed validation as a deliberate change and fix the crash
- Recomendación: A, unless the business wants customers with no second surname to be able to recover their account.
- Decide: User + Javier

**P2-Q3** — prospecto/recuperarcuenta: name matching (all given names vs PrimerNombre) and letter case.
- LAN: LAN Controllers/ProspectoController.cs:107-117 matches PersonalNombres=@nombre plus surnames, birth date and RFC in SQL. Whether the collation is case-insensitive: NO EVIDENCE. DU13 (CREDITO:398) established that PersonalNombres holds all given names.
- ServicioSAP: ServicioSAP Controllers/ProspectoController.cs:47 filters PrimerNombre eq '{nombre}' exactly (RPRO-1, Business Rules :2092). BP05 also has SegundoNombre (RSG/bp05_maestro.md:166-167).
- Ejemplo: Customer JUAN CARLOS PEREZ GOMEZ types 'Juan Carlos'. LAN matches. SAP compares PrimerNombre eq 'Juan Carlos' against 'JUAN' and finds no match.
- Opciones: A: Split the input on the first space into PrimerNombre and SegundoNombre · B: Filter by RFC and birth date only, then compare the full name, uppercased and without accents, in C# · C: Keep the current behavior
- Recomendación: B. It reproduces LAN's five-field match and also shrinks the C12 surface. Validate with an E2E on a BP that has SegundoNombre.
- Decide: User + Javier

**P2-Q4** — prospecto/recuperarcuenta → nombre: the masking rule (C17).
- LAN: LAN Controllers/ProspectoController.cs:152-169 (EncriptarNombre) keeps the first and last letters and leaves words of 2 or fewer letters intact.
- ServicioSAP: ServicioSAP Methods/CustomerService/CustomerServiceMethods.cs:174-193 (ocultarLetrasNombres) keeps only the first letter and does not mask accented letters or Ñ. It is shared with validarCliente (:208-210, package 8).
- Ejemplo: 'JUAN DE LA ROSA': LAN 'J**N DE LA R**A'; SAP 'J*** D* L* R***'. Magento shows this value to the customer.
- Opciones: A: A helper only for recuperarcuenta that replicates LAN · B: Change the shared helper (this also changes validarCliente) · C: Keep SAP's masking
- Recomendación: A
- Decide: User + Javier

**P2-Q5** — prospecto/recuperarcuenta: approve escaping single quotes in the OData $filter (C12). This deviates from 'replicate'.
- LAN: LAN Controllers/ProspectoController.cs:123-127 uses SqlParameter, so it cannot be injected.
- ServicioSAP: ServicioSAP Controllers/ProspectoController.cs:47 inserts nombre, both surnames and rfc unescaped.
- Ejemplo: rfc = XAXX010101000' or RFC ne 'ZZZ changes the filter and returns the first BP that matches.
- Opciones: A: Approve escaping ' as '' · B: Keep as is
- Recomendación: A
- Decide: User + Javier


### 3 · WholesaleCustomerController

**P3-Q1** — GET company/wholesale-customer/{wholesaleAccount}: which account format Magento sends and which the DMZ accepts. This is the package-3 case of the global C-account vs BP rule (DU2).
- LAN: LAN Metodos/WholesaleCustomerMethods.cs:21: SELECT Nombre FROM cte WHERE Cliente=@wholesaleAccount (a C-account). The DMZ regex used to be ^C[0-9]{8,9}$ (before commit 22cefb3).
- ServicioSAP: DMZ Controllers/WholesaleCustomerController.cs:21 now accepts only ^[0-9]{8,10}$ and returns 400 otherwise (:40). ServicioSAP BusinessPartnerMethods.cs:912-916 reads BP05MA by BP number.
- Ejemplo: A Magento company with wholesale_account 'C00012345' (WholesaleAccountManagement.php:106) used to get its name from LAN; today the DMZ answers 400.
- Opciones: A: Magento re-keys wholesale_account to BP numbers; keep the regex · B: Accept both formats and resolve C-account to BP (GUIA §1.8d forbids converting) · C: Revert the regex
- Recomendación: A. Confirm who re-keys the Magento data and when; until then the route is broken for C-accounts.
- Decide: User + Magento team + Javier

**P3-Q2** — GET company/wholesale-customer → returned name: person name vs company name.
- LAN: LAN Metodos/WholesaleCustomerMethods.cs:21, :39 return Cte.Nombre.
- ServicioSAP: ServicioSAP BusinessPartnerMethods.cs:919-930 tries the person's name first, then NameOrg1-4, then Name1Text (AUDITORIA:647).
- Ejemplo: A company BP with NameOrg1 'MUEBLERIA LOPEZ SA DE CV' and a contact person in NameFirst: LAN shows the company name, SAP shows the person's name.
- Opciones: A: NameOrg1-4 first · B: Keep the current order · C: Name1Text first
- Recomendación: Capture BP05MA for 2-3 real wholesale BPs; if NameOrg is filled, choose A.
- Decide: User + Javier; SAP BP team

**P3-Q3** — POST company/negotiable-quote/create: which SAP document to create, and the value of every Intelisis field that is hard-coded today.
- LAN: LAN Controllers/WholesaleCustomerController.cs:31-34 hard-code agente 'P000098', canal 11, almacen 'V00096' and sucursal 98. LAN WholesaleCustomerMethods.cs:186-195 sets Mov 'Pedido Mayoreo', SINAFECTAR, 'En Revision Ventas Mayoreo', UEN 3 and Condicion 'CONTADO MAY FORANEO'. :78-82 handles the VENTAD lines.
- ServicioSAP: Missing. The only vocabulary is RSG/sd01_enviar_pedido.md:25 (DocType ZMAY) and StoreGlobalMethods.cs:105 (ZMAY → ZMYM). GUIA §1.7 has no SalesOrg, channel or plant for wholesale.
- Ejemplo: NegotiableQuoteManagementPlugin.php:231-260 sends cuenta, importe and articulos. LAN creates a 'Pedido Mayoreo' under review and returns '1'. Magento discards the response.
- Opciones: A: SD01 ZMAY order, with every value supplied by the business · B: A SAP quotation document (no RSG fiche) · C: Retire the route and keep Magento's email to sales · D: Keep it on LAN
- Recomendación: Decide A or C with Ventas Mayoreo. Fable cannot start without every value in A.
- Decide: User + Ventas Mayoreo + SAP SD


### 4 · WalletCustomerController

**P4-Q1** — Destination system of the wallet (monedero) for customer/wallet/*: what PLAN:120 and GUIA:547 call 'Wallet'.
- LAN: LAN Metodos/WalletCustomerMethods.cs:65-70 (Cte.SerieMonedero/SerieMonederoVIU) and LAN CreditMethods.cs:1621 (FnVTASCalcularSaldo).
- ServicioSAP: ServicioSAP Methods/WalletCustomer/WalletCustomerMethods.cs:62-65 uses ZAPI_CONDITIONCONTRACT_SRV (SD18). There is no 'Wallet' key in Web.config. 'Procesos To-Be SD_Monedero' is missing from RSG.
- Ejemplo: For wallet/details, Fable cannot tell whether to keep SD18 or call an external 'Wallet' API.
- Opciones: A: SD18 is the wallet; add the To-Be SD_Monedero doc · B: A separate Wallet API (supply its key and contract)
- Recomendación: A
- Decide: User + SAP SD

**P4-Q2** — customer/wallet/details: UEN handling (C10), i.e. which serie and balance to return for uen 1 and uen 2.
- LAN: LAN WalletCustomerMethods.cs:65 uses SerieMonedero if uen==1, otherwise SerieMonederoVIU; the balance comes from LAN CreditMethods.cs:1597-1636. Magento sends uen = storeId==5 ? 1 : 2 (CustomerWalletManagement.php:128).
- ServicioSAP: ServicioSAP Controllers/WalletCustomerController.cs:26 ignores uen and :34 takes the first contract (RMON-4). SD18 has Vkorg; BP05 has ZserieMon/ZserieMonViu (Partner.cs:32, :42).
- Ejemplo: A customer with both MA and VIU wallets uses the VIU store: LAN returns the VIU serie and balance; SAP returns whichever contract comes first.
- Opciones: A: Filter by Vkorg (1 → 04, 2 → 05) · B: Read the serie from BP05 ZserieMon/ZserieMonViu, then take the SD18 contract where Num = serie · C: Keep the first contract
- Recomendación: B if ZserieMon* are filled in, otherwise A. Also confirm that uen 1 = MA = 04.
- Decide: User + Marcos + SAP

**P4-Q3** — customer/wallet/details → titular (the name shown to the customer).
- LAN: LAN WalletCustomerMethods.cs:25-45 returns PersonalNombres + both surnames.
- ServicioSAP: ServicioSAP Controllers/WalletCustomerController.cs:36 returns CustOwner, which is a BP code (RSG/sd18_consultar_contrato.md:44; RMON-6).
- Ejemplo: LAN 'JUAN CARLOS PEREZ GOMEZ'; SAP '1500004598'.
- Opciones: A: Build the name from BP05 (NameFirst+Namemiddle, then the surnames), consistent with DU13 · B: Keep CustOwner
- Recomendación: A
- Decide: User + Marcos

**P4-Q4** — customer/wallet/details: the key used to find the wallet, and the 'None' sentinel.
- LAN: LAN WalletCustomerMethods.cs:69-70 filters Cte.Cliente and returns 'None' when there is no customer (:64, :89). Magento sends customer_credit_account (CustomerWalletManagement.php:122) and throws on 'None' (:135).
- ServicioSAP: ServicioSAP WalletCustomerMethods.cs:65 filters Reference eq '{cliente}' (Reference = 'ID Monedero POS', RSG sd18:27). It never returns 'None'; it returns a default text instead (WalletCustomerController.cs:28).
- Ejemplo: cliente 'C00012345': SD18 finds nothing and answers 'no cuentas con monedero', balance 0.
- Opciones: A: Search by CustOwner (BP) · B: Keep Reference, once SAP confirms what it holds · C: Resolve the serie first (P4-Q2 B), then search by Num
- Recomendación: C, decided together with the global C-account vs BP rule (DU2) and confirmed with one SD18 capture.
- Decide: User + Marcos + SAP

**P4-Q5** — customer/wallet/details: keep or drop LAN's 'generate wallet' side effect.
- LAN: LAN WalletCustomerMethods.cs:89-115 calls SP_MAVIDM0173RedimeOGeneraMONE with @ID=0 and then recurses. The SP only processes Venta WHERE ID=@ID (SP_MAVIDM0173RedimeOGeneraMONE.sql:32, :135-170).
- ServicioSAP: Missing.
- Ejemplo: A customer with no Cte row: LAN calls the SP with @ID=0, which most likely generates nothing (not verified at runtime).
- Opciones: A: Drop it as a no-op and remove the 3 related source requests from GUIA §8.3 · B: Design wallet generation in SAP (ZMN+)
- Recomendación: A
- Decide: User

**P4-Q6** — customer/wallet/getMinimumCostToRedeem: replicate LAN's algorithm (C09), which needs the meaning of the AWS catalogs' VALOR1..4, the DM01 ESTATUS/FAMILIA values and the channel source.
- LAN: LAN WalletCustomerMethods.cs:170-176 and :222-228 read tablarangostd and Ventascanalmavi. :271-305 excludes families and applies thresholds. :307-400 handles multiple families. :426 and :457-465 handle article status and discount.
- ServicioSAP: ServicioSAP Methods/Wallet/WalletMethods.cs:76-96 reads 3 AWS catalogs; :131-151 has the channel fallback; :187-214 maps 04/05/81 (undocumented); :220-232 has no family exclusion and no multi-family logic; :226 uses +=.
- Ejemplo: Illustrative: cart with shoes 600 and a sofa 800, rows CALZADO=500 and ALL=1000. LAN gives 600; SAP gives 1400.
- Opciones: A: Replicate LAN once (i) VALOR1..4, (ii) 04/05/81, (iii) FAMILIA names and (iv) the channel source (AWS vs SD52, GUIA:547) are confirmed · B: Keep the simplified version as a deliberate change
- Recomendación: A. Magento reads montoMaximoRedimibleGlobal at checkout.
- Decide: User + Javier + owner of the AWS catalogs (not named)

**P4-Q7** — customer/wallet/getCuentaC/{ordenCompra}: retire or migrate.
- LAN: LAN Controllers/WalletCustomerController.cs:39-46 → LAN WalletCustomerMethods.cs:125-158: SELECT Cliente FROM Venta WHERE ReferenciaOrdenCompra, no TOP, 'None' when not found.
- ServicioSAP: Missing. DMZ WalletCustomerController.cs:63 calls the wrong path with the wrong verb (C16). Magento has 0 references.
- Ejemplo: DMZ GET getCuentaC/1234 → LAN 404 → DMZ 200 with the exception text.
- Opciones: A: Retire (N/A) · B: Migrate via SD36 by PurchNoC
- Recomendación: A
- Decide: User + Javier


### 5 · StatusController

**P5-Q1** — status/getStatus: in scope or not, what 'healthy' means, and the response contract.
- LAN: LAN Controllers/StatusController.cs:14-36 pings host 172.16.202.2 and returns true or 'No se tiene conexion con la base de datos'. The DMZ uses POST (DMZ StatusController.cs:10-19) while LAN uses GET. The consumer is the external Atentus monitor (DMZ commit 88aef2e).
- ServicioSAP: Missing (_ESTADO_REAL_EN_SERVICIOSAP.md:143).
- Ejemplo: After Intelisis is switched off, the probe always fails even though S/4 and ServicioSAP are healthy, so the monitor raises a false alarm.
- Opciones: A: Discard it and retire or repoint the monitor · B: A ServicioSAP status/getStatus that checks S/4 plus its databases, with the same literal and 200 · C: A DMZ-only liveness check that returns true
- Recomendación: B if someone still monitors it, otherwise A. Ask the Atentus owner what the check asserts.
- Decide: User + Diego + Atentus owner


### 6 · RecommenderController

**P6-Q1** — recommender/setRecommenderList, getRecommender and setCodes: confirm deprecated, or migrate.
- LAN: LAN Controllers/RecomenderController.cs:14-48 → LAN Metodos/RecommenderMethods.cs:18-200 (SpCREDICodigoRecomendador ops 2/9/1). LAN bug: setCodes passes its parameters in the wrong order (RecomenderController.cs:45 vs RecommenderMethods.cs:132).
- ServicioSAP: Missing. The CREDI* tables have no destination. Tracker rows 107-109 say Deprecado, and Magento has 0 callers.
- Ejemplo: setCodes {requestedCodes:3, uen:1} assigns 1 code instead of 3 because of the parameter swap.
- Opciones: A: Out of scope; mark the 3 DMZ routes N/A · B: Migrate (needs a destination for the tables)
- Recomendación: A. Note that CREDIDCodigoRecomendador is also read by credit/codigoRecomendado (package 9).
- Decide: User


### 7 · OrdersController

**R7-1** — Who pushes order status changes from S/4HANA to Magento, and what replaces the virtual-article purchase in LAN setOrderStatus.
- LAN: LAN Controllers/OrdersController.cs:310-344: on 'processing' it calls Provider.CompraArtVirtual (LAN Metodos/Order/Provider.cs:25, SP SPCOMSCompraArtVirtual :141), then forwards to DMZ order/setOrderStatus. The caller is external (no evidence of who).
- ServicioSAP: Missing as a route. OrderStatusMethods.SetOrderStatusAsync exists with no caller (Business Rules :823).
- Ejemplo: Intelisis moves 2000012345 to 'processing': LAN creates the virtual-article purchase and Magento shows processing. In the SAP world, neither happens.
- Opciones: A: Bring it into package 7 with a defined SAP trigger · B: A separate package for the SAP→Magento status sync · C: Deprecate
- Recomendación: B; Fable must not invent the trigger.
- Decide: User + SAP SD + Magento owner

**R7-2** — Whether the 5 LAN-only order routes belong to package 7, and who calls them.
- LAN: LAN Controllers/OrdersController.cs:372 createStorepickupCode, :394 generateNewStorepickupCode, :417 getOrderId, :437 getOrderInfoAndSet, :446 checkOpenpay. No reference in the DMZ, LAN or Magento.
- ServicioSAP: ServicioSAP Controllers/OrderController.cs:240-278 has the 2 pickup routes (GET). getOrderInfoAndSet and checkOpenpay are missing. getOrderId was retired on 2026-09-21 (_NUESTROS_ENDPOINTS/Contratos/BAJA_getOrderId.md).
- Ejemplo: A Windows task calling LAN checkOpenpay stops when LAN is switched off, and Openpay card orders are never created.
- Opciones: A: In package 7 · B: Out (GUIA §0 counts only DMZ routes) · C: Decide per route (R7d-1, R7d-5, R7e-5)
- Recomendación: A, after the user provides the caller inventory (IIS logs or Task Scheduler on the LAN server).
- Decide: User + Infra


### 7a · order/new contado

**R7a-1** — setOrder response to Magento (status and body) for success, PedidoExistente and errors. This is the order-flow case of X-2.
- LAN: LAN Controllers/OrdersController.cs:139-161 always answers 200 with the account or a literal (LAN OrderMethods.cs:732). The pre-migration DMZ (commit c63c0ab) mapped PedidoExistente→409, PrecioIncorrecto→400, ''→500. Magento's OrderManagement.php:596-610 stores the account only when the body is a 10-character BP, and sets synced on 200/100.
- ServicioSAP: ServicioSAP Controllers/OrderController.cs:16-48 answers 200 with {BP, SalesDocument, Message, Resultado} or 200 'Error, ...'. Duplicates are handled at OrderMethods.cs:1741-1749. DMZ OrdersController.cs:214-227 passes the result through; DMZ Helper/Curl.cs:130-146 turns errors into text.
- Ejemplo: No stock, ServicioSAP down, or a duplicate: all three arrive as 200, so Magento marks the paid order synced and never retries it. Magento never runs its local setCAccount because the body is JSON.
- Opciones: A: Keep 200 plus the object; rely on ServicioSAP's setCAccount callback (OrderMethods.cs:1930-1934) · B: Restore the legacy DMZ status mapping (against GUIA §1.5) · C: ServicioSAP returns LAN's body (a bare BP or a literal) · D: Change Magento to read Resultado and keep synced=0 on error
- Recomendación: A for PedidoExistente. Decide with the Magento owner how failed orders get retried; D is the lowest-risk option. Fable must not touch DMZ status codes.
- Decide: User + Magento owner + Marcos

**R7a-2** — The generic guest BP for banktransfer orders with no account, and whether other payment methods should use it.
- LAN: Delegated to the SP chosen at LAN OrderMethods.cs:556-564. The SP's guest rule: NO EVIDENCE (source not reviewed).
- ServicioSAP: ServicioSAP OrderMethods.cs:41 GuestCashPartnerNumber '1500003857'. :2585-2599 (banktransfer) and :2558-2566 (other methods always create a BP).
- Ejemplo: A VIU guest order goes out with AG=1500003857; whether that BP has sales area 05/01 is unknown.
- Opciones: A: 1500003857 is the official guest BP for MA and VIU · B: MAVI supplies one guest BP per sales org · C: Always create a BP
- Recomendación: MAVI confirms A or supplies B. Until then Fable keeps the current value.
- Decide: MAVI

**R7a-3** — The generic e-commerce agent for partner role Z1 when the order has no Agente.
- LAN: LAN OrderMethods.cs:650 passes order.Agente to the SP. The SP's default when it is null: NO EVIDENCE.
- ServicioSAP: ServicioSAP OrderMethods.cs:62-72 AGENTE_Z1_SIN_ASIGNAR = ''; :2336-2354 (RORD-24).
- Ejemplo: A web order with no agent: Z1 goes out empty.
- Opciones: A: Keep it empty · B: MAVI supplies the agent number · C: Leave out the Z1 partner entirely
- Recomendación: Wait for MAVI (B); Fable makes no change.
- Decide: MAVI

**R7a-4** — articulos[].precioEspecial vs precio, and the SD29 price floor.
- LAN: LAN OrderMethods.cs:363-399: when precioEspecial is not '0', that price is used and forzarOrder becomes '1', which skips price validation (:556-564). Otherwise the SP can answer PrecioIncorrecto.
- ServicioSAP: ServicioSAP OrderMethods.cs:2409 uses precio; precioEspecial only goes into Zkbetr2 (:2512). :1954-2008 raise any price below SD29 to the floor and never reject (RORD-9).
- Ejemplo: precio 10,999 and precioEspecial 8,999: LAN books 8,999, ServicioSAP books 10,999. precio 7,500 with an SD29 floor of 8,200: LAN rejects, ServicioSAP books 8,200 although the customer paid 7,500.
- Opciones: A: LAN parity (precioEspecial, no floor when forced) · B: Keep ServicioSAP's behavior · C: Reject below the floor
- Recomendación: A per GUIA §1.9. Pricing decides between B and C for below-floor prices (Business Rules :520).
- Decide: Business (pricing) + Marcos

**R7a-5** — Shipping cost (costoEnvio) and the contado totals, discount and installments sent to SAP.
- LAN: LAN OrderMethods.cs:661 passes @costoenvio, subtotal, total, tax, discount and installments to the SP.
- ServicioSAP: ServicioSAP BuildSapOrderAsync (OrderMethods.cs:2170-2524) ignores them (RORD-32). Only the credit branch adds SEGU00001 (:1783-1784).
- Ejemplo: An order of 12,499 including 499 shipping: the 499 is never invoiced in SAP.
- Opciones: A: Add a SEGU00001 item for contado · B: A header freight condition (SD names it) · C: Leave it out
- Recomendación: A only if SD/finance confirm it; otherwise SD names the condition. Fable cannot invent it.
- Decide: SAP SD + Business

**R7a-6** — The DIM11 stock gate before creating the order, which LAN never had.
- LAN: No stock check in LAN SetPedido (COMPARATIVA row 14).
- ServicioSAP: ServicioSAP OrderMethods.cs:1812-1816 and :2015-2067 (ValidarStockArticulosAsync) stop the order with 'Error', answered as HTTP 200 (RORD-10).
- Ejemplo: A SKU with 0 stock in plant 0090: no SAP order is created, and Magento marks the paid order synced.
- Opciones: A: Keep the gate · B: Remove it (LAN parity) · C: Keep it but make the failure retryable (depends on R7a-1)
- Recomendación: B ('replicar, no mejorar'). If the business wants A, combine it with R7a-1 D.
- Decide: Business + Marcos

**R7a-7** — The cellphone SKU region rewrite (-R5/-R6) on contado orders.
- LAN: No contado equivalent (COMPARATIVA row 15). The credit-side rule is deferred (CREDITO P10/Q17).
- ServicioSAP: ServicioSAP OrderMethods.cs:1805 passes sDatosPedido[20] (the state, not the postal code) to ValidarRegionCelulares (:1819, :2085-2139).
- Ejemplo: 'CEL123-R5' with estado 'Jalisco' is rewritten to 'CEL123-RJ'.
- Opciones: A: Remove it from contado · B: Keep it, using the postal code · C: Defer until Q17
- Recomendación: A or C. Fable must not 'fix the index'.
- Decide: Business + Marcos

**R7a-8** — Wallet (monedero) generation and 'afectar' for PayPal/Openpay orders.
- LAN: LAN OrderMethods.cs:702-720: GenerarMonedero plus spAfectar.
- ServicioSAP: ServicioSAP OrderMethods.cs:1918-1928 and :1373-1386 are a TODO stub; afectar (:1527-1543) is never called. SKILL decision tree 1 drops spAfectar.
- Ejemplo: A 5,000 PayPal order generates wallet points in LAN and nothing in ServicioSAP.
- Opciones: A: Call the Wallet API (needs a contract) · B: Deprecate · C: Defer
- Recomendación: C, until the Wallet contract exists (see P4-Q1).
- Decide: Wallet team / MAVI

**R7a-9** — Placeholder values sent to SAP on every order and on auto-created BPs.
- LAN: N/A (LAN used real data through its SPs).
- ServicioSAP: ServicioSAP OrderMethods.cs:2285, :2301, :2366, :2377, :2508 (literal user name), :2326 Zliberado '1234', BP Region 'JAL' (in BuildBpClientFromOrder, about :2674) and Altkn '1234567890' (about :2703).
- Ejemplo: An auto-created BP for a Mexico City customer gets region JAL, and every order carries the same test user name.
- Opciones: A: The values were agreed with ABAP; keep them · B: Replace them with real sources (which?) · C: Send them empty
- Recomendación: Ask ABAP/SAP (COMPARATIVA §5.4). Each change goes in its own commit.
- Decide: SAP/ABAP + Marcos

**R7a-10** — Division (Spart) on the order: the fiche says '00', but the system only accepts '01'.
- LAN: N/A
- ServicioSAP: ServicioSAP OrderMethods.cs:2199-2210 sets Division '01'. Logs/sap.log of 2026-07-17 shows Salesdocument 0000009846 created with '01'.
- Ejemplo: With '00', SAP rejected the order with 'No existe el área de ventas 04 01 00'.
- Opciones: A: Keep '01' fixed; SAP explains the fiche · B: Switch to '00' after SAP fixes its configuration
- Recomendación: A. Remove it as a Fable blocker from PLAN:233.
- Decide: SAP


### 7b · cancel/return

**R7b-1** — The meaning of OrderRMA.tipo in cancelOrder: Magento sends 'T'/'P' (total or partial), not a document class.
- LAN: LAN Controllers/OrdersController.cs:186-250 ignores tipo (ServiceOrderMethods.cs:23-48; LAN OrderMethods.cs:1378-1416). Magento CustomerCancelOrderObserver.php:78 sends T/P (verified).
- ServicioSAP: ServicioSAP OrderMethods.cs:2966-2971 builds ZSD_{tipo}_{incrementId} (verified), so SD36 answers 'noexiste' (:2974-2980) and the DMZ answers 400 (DMZ OrdersController.cs:291-292).
- Ejemplo: A full cancel of 2000012345 searches ZSD_T_2000012345; the real document is ZSD_ZMER_2000012345.
- Opciones: A: Always use ZMER, as setreturn does (OrderMethods.cs:1605) · B: Map T/P to a document class · C: Use tipo only as the total/partial flag (R7b-3)
- Recomendación: A + C; this is a confirmed defect. Correct Business Rules RCAN-1 (:643).
- Decide: User + Javier

**R7b-2** — Cancelling an order that has no delivery yet (LAN's main case).
- LAN: LAN OrderMethods.cs:1378-1416: spAfectar VTAS 'CANCELAR', Base 'Todo'.
- ServicioSAP: ServicioSAP OrderMethods.cs:2984-3017 throws: the ZIDSTATUS=03 API is not implemented (RCAN-3). RSG/sd01_enviar_pedido.md:213-218 only defines 03 = Anulado.
- Ejemplo: A customer cancels before shipping: 400, and the order stays alive in SAP.
- Opciones: A: SAP provides an OData with a fiche that sets ZIDSTATUS=03 · B: Standard A_SalesOrder rejection (no fiche, so not allowed by GUIA §2.1) · C: Keep the explicit failure
- Recomendación: A; Fable keeps C until the fiche exists.
- Decide: SAP SD

**R7b-3** — Cancellation policy for an order that is already invoiced, and for a partial cancel.
- LAN: LAN Controllers/OrdersController.cs:205-241: if invoiced, a service report (sendReporte), and a return only when resolucion == 'R'. A partial cancel of an order not yet invoiced cancels the whole order (LAN OrderMethods.cs:1403).
- ServicioSAP: ServicioSAP OrderMethods.cs:3020-3059 annuls the invoice (SD48) and reverses the goods issue (SD46) whenever a delivery exists; producto is ignored.
- Ejemplo: An invoiced order with 2 items, 1 cancelled: LAN creates a report plus a return; ServicioSAP annuls the whole invoice.
- Opciones: A: LAN policy: never annul, route to returns · B: Current ToBe annulment · C: A for partial, B for total
- Recomendación: A business decision (GUIA §8.2:532); Fable cannot choose.
- Decide: Business (after-sales) + Javier

**R7b-4** — Response when the order to cancel does not exist in the backend.
- LAN: LAN Controllers/OrdersController.cs:202 and :249 always answer Ok('Ok'), so the DMZ said 'Concluido'.
- ServicioSAP: ServicioSAP OrderMethods.cs:2976-2980 'noexiste' → DMZ 400.
- Ejemplo: For a partial cancel, Magento sets synced=0 and re-sends setOrder.
- Opciones: A: Keep 'noexiste' → 400 · B: LAN parity: 'ok'
- Recomendación: A, but only after R7b-1 is fixed.
- Decide: User

**R7b-5** — Sales org, plant and distribution channel of the ZDME return order. Magento's return body has no store.
- LAN: LAN Controllers/OrdersController.cs:256-259 default store to '1'. Magento RmaManagement.php:119-150 sends no store.
- ServicioSAP: ServicioSAP OrderMethods.cs:2149 sets storeId = null, and DeterminarPlantYOficina (:363-368) throws 'No lleva id de tienda'. The DMZ answers 200 with the text and Magento marks the return synced (RmaManagement.php:174-176). The channel is always '01' (:2187-2189).
- Ejemplo: A return for 2000012345: no ZDME is created in SAP, yet Magento shows it synced.
- Opciones: A: Take SalesOrg, DistrChan and Plant from the original order already read in SD36 (OrderMethods.cs:1605-1631) · B: Default '1' like LAN and map it · C: Magento starts sending store
- Recomendación: A (adds logic, so it needs approval). This is the highest priority because setreturn is reported to be in production.
- Decide: User + Marcos

**R7b-6** — REF_DOC of the return: the original order or the invoice.
- LAN: The LAN return flow works on the invoiced Venta (LAN Controllers/OrdersController.cs:278-303). The exact LAN field: NO EVIDENCE.
- ServicioSAP: ServicioSAP OrderMethods.cs:1616-1631 sends the order number with category 'C'. RSG/sd09_devolucion.md:36-37 and :74 require the invoice with category M/F (otherwise error ZSD002).
- Ejemplo: A return for order 0000009846 with invoice 90001234: per the fiche, SAP would reject it with ZSD002.
- Opciones: A: Look up the invoice through the delivery (OrderMethods.cs:3268-3305) and send category M · B: Keep the order reference if a real SD09 response shows SAP accepts it
- Recomendación: Get a real SD09 response first.
- Decide: SAP SD + user (runs the E2E)

**R7b-7** — motivoDevolucion is placed in the field that is later read as the payment condition.
- LAN: LAN sends the reason to the service report; it is not used as a payment term.
- ServicioSAP: ServicioSAP OrderMethods.cs:2163 sets condicion = motivoDevolucion. GetCondicionAsync (:2214-2236) finds nothing and falls back to 'ACEF'.
- Ejemplo: Reason 'QUEBRADO O MALTRATADO' on a 12-month sale ends up as Pmnttrms ACEF.
- Opciones: A: Keep the original Pmnttrms and carry the reason in Zdescrextra/ZOBS · B: Keep as is
- Recomendación: A
- Decide: User + Marcos

**R7b-8** — Which item resolutions (C/R/O) create a return order in SAP.
- LAN: LAN Controllers/OrdersController.cs:278 creates a return only when resolucion == 'R'. Magento RmaManagement.php:133-146.
- ServicioSAP: ServicioSAP creates a ZDME for any resolution (OrderMethods.cs:2155-2166 does not copy resolucion).
- Ejemplo: An exchange RMA (C) creates a credit in SAP; LAN did not.
- Opciones: A: Only R creates a ZDME · B: All resolutions do
- Recomendación: A
- Decide: Business (after-sales) + Marcos


### 7c · CREDITO plan S1 (precondition)

**CR-1** — The working-copy baseline that S1 checks. CREDITO expects +126/-44 and ACTIVIDADES says +161/-64; today's git diff --numstat is +109/-64 (verified 2026-10-02). On 2026-10-01 at 12:12 the 4 files were rewritten with fewer comment lines.
- LAN: N/A (not a LAN rule). The relevant user rule is 'code without rule comments' (CREDITO §4.2:345). ACT-17(a) (ACTIVIDADES:165) still lists removing the comments as open.
- ServicioSAP: Diff by file: SolicitudCreditoWebMethods.cs 30/15, OrderMethods.cs 57/48, FinalListProperMethods.cs 20/1, InfoClienteRequest.cs 2/0. '[CREDITO SIN CUENTA]', which CREDITO §5.1:417 expects at OM:648, no longer exists (0 grep hits, verified).
- Ejemplo: S1 step 1 (CREDITO:1135) says 'git diff --stat (+126/−44) ... si algo no cuadra, parar', so Fable stops before R4.
- Opciones: A: Accept the current tree as the baseline; update CREDITO §5, §5.1, §6.2, §6.6 and §8, and ACTIVIDADES §1, §3 and ACT-02, to +109/-64 and the current lines · B: Restore the removed comments · C: Tell Fable to ignore the baseline (removes the guard)
- Recomendación: A
- Decide: User (owner of the working copy)


### 7c · CREDITO plan R4

**CR-2** — CRED_SOLICITUD_WEB_DATOS_TEMP.nombre in R4 step 2 (CREDITO:564: 'fila.Nombre = maestro.NameFirst ?? "";').
- LAN: LAN stored CTE.PersonalNombres (all given names) via SpCREDIDatosSolicitudCreditoArt GetInfo (SPsOrden/SpCREDIDatosSolicitudCreditoArt.sql:55-76) and LAN CreditMethods.cs:804-868. DU13 (CREDITO:398) chose NameFirst + Namemiddle.
- ServicioSAP: ServicioSAP Methods/Credit/SolicitudCreditoWebMethods.cs:238-240 joins NameFirst and Namemiddle when there is a master record (verified; Business Rules RCRE-23 :931).
- Ejemplo: A BP with NameFirst <<NOMBRE1>> and Namemiddle <<NOMBRE2>>: today nombre is '<<NOMBRE1>> <<NOMBRE2>>'. R4 applied literally gives '<<NOMBRE1>>', which reverts DU13.
- Opciones: A: Rewrite step 2 to keep the join and drop only the dead ternary · B: Leave the Nombre line out of R4 · C: Apply R4 literally (reverts DU13)
- Recomendación: A (ACT-01), and move the other R4 references to the current lines (SCW:236-244, :250, :259, :279, :285; OM:759-764, :775).
- Decide: User


### 7c · CREDITO plan T1a

**CR-3** — T1a step 3: when the USER_DMZ appSetting is missing, the Magento callback still tries to log in with empty credentials.
- LAN: LAN OrderMethods.cs:1757-1760 deserializes USER_DMZ, and a missing key throws.
- ServicioSAP: ServicioSAP OrderMethods.cs:1185-1194 falls back to empty Username and Password (:1193), followed by 3 login attempts (:1196-1262).
- Ejemplo: With USER_DMZ missing, ServicioSAP tries DMZ login/authenticate 3 times with empty credentials and never sends authorizationResult. LAN failed immediately.
- Opciones: A: Keep the fallback as an accepted difference (new DU entry) · B: Replicate LAN: throw
- Recomendación: A, recorded as a DU entry. It only matters when the config is missing (DU1), and T1a has no caller until T1b.
- Decide: User

**CR-4** — T1a step 5 turns the 'missing liberador appSettings' message (LiberadorCreditoMethods.cs:54) into a sap.log line LAN never had, which goes against DU17.
- LAN: LAN Metodos/LiberadorCreditoMethods.cs:17-18 and :44 read the settings without checking them; it logs to file only at :81, :89 and :98.
- ServicioSAP: ServicioSAP LiberadorCreditoMethods.cs:50-55 performs the check, writes Console.WriteLine (:54) and returns RECHAZADO (:55).
- Ejemplo: With VETA_URL_LIBERADOR missing, the console message is lost under IIS; after T1a, sap.log gets a line LAN never wrote.
- Opciones: A: Write it to the file log as an exception to DU17 (like [CREDITO SD29 FILTRO]) · B: Keep Console.WriteLine · C: Remove the message
- Recomendación: A, recorded as a DU17 exception.
- Decide: User


### 7d · Openpay/pickup

**R7d-1** — checkOpenpay, card part: reprocessing openpay_cards orders after Openpay confirms the charge.
- LAN: LAN Controllers/OrdersController.cs:445-453 → LAN Metodos/OpenpayMethods.cs:70-150: reads SQLite openpay_orders, checks the charge in Openpay with the VIU or MA key, loads rejection statuses from Intelisis RECHAZAOPENPAY (:290-305), and on 'completed' calls SetPedido with liberado:true (:271-288).
- ServicioSAP: Missing. ServicioSAP writes openpay_orders (OrderMethods.cs:470-492, :1754-1763) and nothing reads it. There is no liberado bypass and no Openpay SDK in the csproj.
- Ejemplo: Card order 1000054321 is paid but stays 'processing' in SQLite forever; no SAP order is created.
- Opciones: A: Port it (a new liberado parameter, the SDK, the keys and a RECHAZAOPENPAY source), all with approval · B: Create the SAP order from a payment webhook · C: Do not enable openpay_cards on ServicioSAP until A or B exists
- Recomendación: C now (otherwise orders are lost), then A.
- Decide: User + Javier + Infra

**R7d-2** — checkOpenpay, store part: expiry of openpay_stores (Paynet) references, and LAN bug C18.
- LAN: LAN OpenpayMethods.cs:169-206 cancels the order (cancelamagento) when the charge is not paid and the Venta is 'sinafectar'. :277 (C18) has an always-true condition.
- ServicioSAP: ServicioSAP OrderMethods.cs:497-521 and :1765-1769 write openpay_stores and still create the SAP order; nothing reads the table. The cancel needs R7b-2.
- Ejemplo: An unpaid Paynet reference expires: LAN cancels it, ServicioSAP leaves a live SAP order.
- Opciones: A: Port it after R7b-2, defining 'not affected' (e.g. no billing document) · B: Do not create the SAP order until it is paid · C: Merge it with ManagePaynetOrders
- Recomendación: Decide A or B with SD. Fix C18 only with approval.
- Decide: Javier + SAP SD + user

**R7d-3** — InsertPaymentData (Openpay webhook for credit installments): where the payment record is written.
- LAN: LAN Controllers/OrdersController.cs:54-89 → LAN OrderMethods.cs:180-222 inserts into CXCCMensajeWebHookOpenPay (Intelisis). Caller: Magento Mavi/WebhookAbonosOpenpay/Model/Openpay.php:86.
- ServicioSAP: Missing. DMZ OrdersController.cs:51-65 still sends it to LAN.
- Ejemplo: A payment of 850.00: LAN inserts a row that Intelisis collections later applies. Once Intelisis is off, nobody applies it.
- Opciones: A: Keep it on LAN until the switch-off · B: Copy the table to SIGMavi and name who applies it · C: Apply the payment in SAP
- Recomendación: Ask who consumes the table first; otherwise B or C is an invented equivalence.
- Decide: Diego + Collections/Credit

**R7d-4** — ManagePaynetOrders: AFECTAR or CANCELAR an unpaid Paynet order.
- LAN: LAN Controllers/OrdersController.cs:21-52 → LAN OrderMethods.cs:44-127 runs spAfectar AFECTAR/CANCELAR only for SINAFECTAR orders. Caller: Magento Mavi/PaynetOrderAutomation/Cron/StatusManager.php.
- ServicioSAP: Missing. The SAP order is already active from order/new (ServicioSAP OrderMethods.cs:1765-1769).
- Ejemplo: Paid: LAN affects the order. Expired: LAN cancels it.
- Opciones: A: AFECTAR becomes a no-op; CANCELAR uses the ZIDSTATUS API · B: Create with a delivery block and release it on AFECTAR (needs an SD design) · C: Deprecate in favor of R7d-2
- Recomendación: SD first defines the 'unpaid order' state.
- Decide: Diego + SAP SD

**R7d-5** — Store-pickup code: who triggers it, verb and response, the product list, and switching GetPickUpCode at the same time.
- LAN: LAN Controllers/OrdersController.cs:371-391 (POST) → LAN StorePickup/CodigoRecogerSucursal.cs:87-197 (TrWDM0285_CteRecoge, products from eCommerceDetPedidos :151, returns 'ok'). GetPickUpCode LAN :346-368 reads TrWDM0285.
- ServicioSAP: ServicioSAP Controllers/OrderController.cs:260-278 (GET) → StorePickupMethods.cs:256-358 (SIGMavi BpRecogePedidos, products [], SD36 without the ZSD_ZMER_ prefix at :264, returns a JSON string). GetPickUpCode at :282-306 reads SIGMavi, but the DMZ still sends it to LAN (DMZ OrdersController.cs:252-269).
- Ejemplo: If only GetPickUpCode is switched while the trigger still calls LAN, codes are written to Intelisis and ServicioSAP answers 404.
- Opciones: A: Switch the trigger and GetPickUpCode together, with the LAN contract · B: Keep the ServicioSAP contract and change the caller · C: Decide products [] vs the item list
- Recomendación: Identify the caller first, then A, plus the ZSD_ZMER_ fix.
- Decide: Javier/Diego + owner of the trigger

**R7d-6** — The bank-transfer pickup code generated when the order is created, and the fate of generateNewStorepickupCode.
- LAN: LAN OrderMethods.cs:686-700 → LAN CodigoRecogerSucursal.cs:198-289 (crearPrimerCodigoRecogerSucbanktransfer: code, TrWDM0285 row and email).
- ServicioSAP: ServicioSAP OrderMethods.cs:1903-1911 and :1549-1563 only write to the console (RORD-34). The tracker (CSV:120) marks generateNewStorepickupCode deprecated, but it exists (Controllers/OrderController.cs:240-258).
- Ejemplo: A banktransfer pickup order with an agent: LAN emails the code when the order is created; ServicioSAP sends nothing.
- Opciones: A: Replicate it in order/new with a new method (needs approval) and define 'Agente != null' · B: Rely on createStorepickupCode later · C: Retire generateNewStorepickupCode if A is chosen
- Recomendación: A + C, if the business confirms the LAN behavior.
- Decide: Business + Javier


### 7e · order queries

**R7e-1** — Source of POS cancellations for Magento's sync cron (getPosCancellations).
- LAN: LAN Controllers/OrdersController.cs:112-132 → LAN OrderMethods.cs:224-285: TOP(limit) from Venta with Estatus 'CANCELADO' since a date. Consumer: Magento Mavi/PosCancellationSync/Helper/Data.php:84.
- ServicioSAP: Missing. The tracker maps it to order/cancelInvoice (ServicioSAP OrderMethods.cs:114-189), which annuls invoices. SD36 requires PurchNoC (RSG/sd36_consultar_documentos.md:25).
- Ejemplo: Wiring it to cancelInvoice would annul invoices instead of listing cancellations.
- Opciones: A: SAP list OData with a fiche · B: SAP pushes cancellations through DMZ setOrderStatus · C: Deprecate and switch off the cron
- Recomendación: Never wire it to cancelInvoice; decide A, B or C.
- Decide: Javier + SAP SD + Magento owner

**R7e-2** — getIntelisisStatuses: invoice status per order, in the vocabulary Magento expects (CONCLUIDO/CANCELADO).
- LAN: LAN Controllers/OrdersController.cs:92-107 → LAN OrderMethods.cs:287-336. Consumer: Magento Mavi/InvoiceDataAnalysis/Cron/CheckForInvoices.php:118-200 (feeds GA4).
- ServicioSAP: Missing. The tracker says sale/filter, an internal wrapper (invalid per GUIA §0.2b).
- Ejemplo: ['2000012345'] → {Status:'CONCLUIDO', SucursalOrigen, Importe, ReferenciaOrdenCompra, Agente}.
- Opciones: A: One SD36 call per id plus billing status, mapped to Magento's values · B: A new SAP list OData · C: Magento adopts SAP's vocabulary
- Recomendación: The business supplies the mapping table and the SAP fields for OrigenSucursal and Agente; then A.
- Decide: Javier + GA4/Marketing + SAP

**R7e-3** — estimated-delivery: carrier, guide number, tracking code and link per order.
- LAN: LAN Controllers/OrdersController.cs:534-541 → LAN Metodos/EstimatedDeliveryMethods.cs:11-107 (INVDPaqueteriaGuia, EMBCConfiguracionPaqueteria).
- ServicioSAP: Missing. No RSG fiche covers it.
- Ejemplo: A shipped order: LAN returns {paqueteria, NoGuia, NoCodigoRastreo, url}. ServicioSAP has no source.
- Opciones: A: SAP/ABAP exposes the data per delivery · B: A SIGMavi table fed by carriers · C: Magento queries the carriers directly
- Recomendación: Ask who generates shipping guides after Intelisis is switched off.
- Decide: Javier + Logistics/ABAP

**R7e-4** — getOrderId and the eCommerceDetPedidos staging table (CREDITO P9).
- LAN: LAN Controllers/OrdersController.cs:416-434 → LAN OrderMethods.cs:454 (InsertDetPedido).
- ServicioSAP: Missing by design. Already retired on 2026-09-21 in _NUESTROS_ENDPOINTS/Contratos/BAJA_getOrderId.md (verified). CREDITO P9 and PLAN still treat it as open.
- Ejemplo: With no staging table, the pickup flow sends products [] (RRSC-4).
- Opciones: A: Confirm the retirement in PLAN and CREDITO P9 · B: Keep a staging table in SIGMavi
- Recomendación: A, after Valentín confirms the liberador does not read eCommerceDetPedidos.
- Decide: User + Valentín

**R7e-5** — getOrderInfoAndSet, the support tool to reprocess an order (CREDITO P11).
- LAN: LAN Controllers/OrdersController.cs:436-443 → LAN Conn/Magento.cs:361-411 → LAN OrderMethods.cs:1688-1710 (ReSetPedido).
- ServicioSAP: Missing. ServicioSAP does not log the request (G5-32).
- Ejemplo: Support reprocesses a failed order: there is no equivalent today.
- Opciones: A: Retire · B: A new route that takes the JSON from DMZ order/jsonOrders
- Recomendación: A, unless R7a-1 leaves failed orders with no retry at all; then B.
- Decide: User + Support


### 8a-1 · Logins

**R8-01** — LoginClienteCredito/FechaN → the 'email' field (Magento uses it as the BBVA payer email, Mavi/MultipagosAvanzado/Model/MultipagosManagement.php:486).
- LAN: LAN Metodos/CustomerServiceMethods.cs:1226, :1239, :1245 return Cte.eMail1.
- ServicioSAP: ServicioSAP Methods/CustomerService/CustomerServiceMethods.cs:237, :301 return the first to_CtePersonalAdr.smtp_addr, or '' (RCS-19).
- Ejemplo: A BP with two emails, the old one listed first: the BBVA receipt goes to the old mailbox.
- Opciones: A: Accept the first smtp_addr · B: The user names the equivalent field · C: Decide after an E2E
- Recomendación: C, then A or B.
- Decide: User + BP functional owner

**R8-02** — LoginClienteCredito/FechaN when the backend fails (not when the client is missing).
- LAN: LAN CustomerServiceMethods.cs:1250-1254 and :1288-1291 rethrow, so the call is a 500 and Magento shows 'error de conexion' (MultipagosManagement.php:471-473).
- ServicioSAP: ServicioSAP CustomerServiceMethods.cs:247-252 and :312-317 catch everything and return false (200).
- Ejemplo: S/4 is down: on the LAN path the customer sees a connection error; on the SAP path the login is refused as if the account did not exist.
- Opciones: A: Keep false for every failure · B: Return false only for 'BP not found'; anything else becomes 500 · C: Rethrow everything
- Recomendación: B (parity; needs approval).
- Decide: User

**R8-03** — LoginClienteCredito/FechaN when ClientNumber or BirthDate is empty.
- LAN: LAN Controllers/CustomerServiceController.cs:173-185 does not validate; the result is 200 false.
- ServicioSAP: ServicioSAP Controllers/CustomerServiceController.cs:71-72 and :92-93 answer 400; the DMZ deserialization then fails and the DMZ answers 500 (DMZ CustomerServiceController.cs:218-231).
- Ejemplo: {'ClientNumber':''}: LAN 200 false; SAP path 500.
- Opciones: A: Keep the 400 · B: Ok(false), as LAN
- Recomendación: B
- Decide: User

**R8-04** — LoginClienteCreditoFechaN: how BirthDate is compared.
- LAN: LAN CustomerServiceMethods.cs:1268, :1277 compare the 'yyyy-MM-dd' text exactly.
- ServicioSAP: ServicioSAP CustomerServiceMethods.cs:265-292 parse leniently. The regex at :282 drops the minus sign of '/Date(-ms)/', so births before 1970 fail (RCS-59).
- Ejemplo: A BP born 1965-03-10: LAN true, ServicioSAP false.
- Opciones: A: Fix the regex to '-?\d+' and keep the lenient parsing · B: Fix the regex and compare 'yyyy-MM-dd' exactly · C: Leave it
- Recomendación: B
- Decide: User

**R8-05** — LoginClienteCredito/FechaN → 'nombreCliente' (how the full name is built).
- LAN: LAN CustomerServiceMethods.cs:1226, :1242 string.Join(' ', all 3 Cte parts), keeping empty parts.
- ServicioSAP: ServicioSAP CustomerServiceMethods.cs:232-235 and :296-299 join only the non-empty NameFirst, Namemiddle, NameLast and NameLst2 (RCS-18).
- Ejemplo: With no second surname: LAN 'JUAN CARLOS PEREZ ' (trailing space); SAP 'JUAN CARLOS PEREZ'.
- Opciones: A: Accept SAP's composition (extend DU13 to this route) · B: Reproduce LAN's join
- Recomendación: A, with explicit approval.
- Decide: User


### 8a-2 · GetEmpleadoByNomina

**R8-06** — customerService/GetEmpleadoByNomina, request {Nomina}, response {Nomina, Nombre} or null. Consumer: Mavi/RegisterSeller/Model/RegisterSellerManagement.php:146-166.
- LAN: LAN CustomerServiceMethods.cs:1952-2000: the agent must be in ALTA, with a matching Personal row whose department appears in the 'Código de promotor' TablaStD row and whose Puesto is in that row's comma list.
- ServicioSAP: Missing. The candidate partner/successfactor/employee/{userId} (BusinessPartnerController.cs:168-182 → BusinessPartnerMethods.cs:342-374) returns raw SuccessFactors rows. A promoter check exists at OrderMethods.cs:1038-1063 (AWS catalog, exact match).
- Ejemplo: For '12345', LAN returns {Nomina, Nombre}; the wrapper returns [{personIdExternal, firstName}], which RegisterSeller cannot read.
- Opciones: A: Deprecate, if seller registration was retired along with DU16 · B: A new route reusing the SuccessFactors call and the catalog; the user defines the Nombre format and the match rule · C: B plus an agent-status check in SAP
- Recomendación: Ask about A first; otherwise B, coordinated with Dev 2 (S7-01).
- Decide: User + Magento owner + Dev 2


### 8b · BBVA/STP

**R8-07** — Is the Multipagos Neko flow still alive? (ApplyPaymentNeko, UpdateStatusPaymentNeko, bbvaKeyNeko)
- LAN: LAN Controllers/CustomerServiceController.cs:105-155 → LAN CustomerServiceMethods.cs:854-1083 (insert into and update CXCCFacturaMultipagoBBVA, GetBBVAKeyNeko).
- ServicioSAP: Stubs at ServicioSAP Controllers/AbonosController.cs:51-84 → Methods/Abono/AbonoMethods.cs:95-108 ('TODO … return true'). Magento enables both modules (app/etc/config.php:831-832) and picks one with multipagos/config/is_advanced_enabled (MultipagosVersionManagement.php:27-45).
- Ejemplo: If is_advanced_enabled=0 in production, connecting the stubs would answer success without saving the payment.
- Opciones: A: Neko is retired; the routes are N/A · B: Migrate it (blocked by R8-08/R8-09)
- Recomendación: A, after the production flag value is confirmed.
- Decide: User + Magento/payments owner

**R8-08** — Where ApplyPaymentAdvanced and GetSTPAccount write the payment intent (Intelisis CXCCFacturaMultipagoBBVA, plus a SQLite replica for STP).
- LAN: LAN CustomerServiceMethods.cs:915-964 (BBVA) and :1295-1411 (STP).
- ServicioSAP: Missing. ZAPI_REFERENCIAS_BANCARIAS has 'falta lógica ABAP' and no fiche.
- Ejemplo: Paying 2 invoices with reference MP123: LAN inserts 2 PENDIENTE rows; ServicioSAP has nowhere to write them.
- Opciones: A: Wait for the SAP write OData and its fiche · B: Keep the table in a database that survives (SIGMavi) · C: Leave the routes on LAN until A or B exists
- Recomendación: C now; then decide A or B and whether the SQLite replica survives (SKILL rule 3).
- Decide: User + Dev 4 + ABAP/SAP FI

**R8-09** — UpdateStatusPaymentAdvanced: where the confirmation is written.
- LAN: LAN CustomerServiceMethods.cs:1018-1080: idempotent; mp_response 0/00/000 sets CONFIRMADO, anything else FALLIDO.
- ServicioSAP: Missing. Only a read wrapper exists (Controllers/AbonosController.cs:85-98, ZFICRUD_COBREF_SRV, no fiche).
- Ejemplo: BBVA calls back with '00' for MP123: LAN confirms; ServicioSAP has nothing to update.
- Opciones: A: ABAP adds an update operation · B: Local table (as in R8-08) · C: Stay on LAN
- Recomendación: Decide together with R8-08.
- Decide: User + Dev 4 + ABAP

**R8-10** — ValidateSTPAccount → 'cuenta' (the CLABE).
- LAN: LAN CustomerServiceMethods.cs:1455-1500: Cte.CuentaCLABESTP decrypted with FnVTASDesEncripta; '' when there is no row or the value is masked.
- ServicioSAP: There is no customerService route. GET credit/GetClabeSTP/{bp} (Controllers/AbonosController.cs:99-112; ZAPI_CTACLBSTP_SRV) returns all rows.
- Ejemplo: A BP with an assigned row and an old row: LAN returns one CLABE, SAP returns a list.
- Opciones: A: Take the row with Zasignado='X' · B: Take the newest row · C: Decide after an E2E (which also shows whether the value is plain text)
- Recomendación: C, then A.
- Decide: User + Dev 4

**R8-11** — GetSalesChannelsSTP 'canales_de_venta' and the legacy CanalVenta ids (shared with GetAccountDebts and ApplyPayment).
- LAN: LAN CustomerServiceMethods.cs:1413-1454 (CteEnviarA ids by UEN). The id map is at :1169-1212 (3, 76, 77, 78, 7, 79).
- ServicioSAP: Missing. The candidates disagree: SD52 (BusinessPartnerMethods.cs:377), AS_GET_PartnerAddress (CSV row 55), BP05_MA (Dev 2 S6-02).
- Ejemplo: LAN [3,76]; SD52 returns Vkorg/Vtweg pairs with no legacy id.
- Opciones: A: SD52 plus a user-supplied id mapping · B: BP05MA to_CteDatosComerciales · C: AS_GET_PartnerAddress
- Recomendación: The user picks the source and supplies the mapping once, for reuse in R8-21.
- Decide: User + Dev 2 + SAP SD


### 8c · customerService queries

**R8-12** — obtenerCreditos → 'estatus'.
- LAN: LAN CustomerServiceMethods.cs:604-619: 5 values derived from the 4-document chain.
- ServicioSAP: ServicioSAP CustomerServiceMethods.cs:457-470 map Zidstatus to 3 values (RCS-40); the to_zsdt_vbak shape has not been seen in a real response.
- Ejemplo: An approved credit not yet delivered: LAN 'aceptado'; SAP 'pendiente'.
- Opciones: A: Accept the 3 values · B: Map more Zidstatus values (needs the catalog) · C: Use another source
- Recomendación: B, once SAP SD supplies the catalog and one real SD36 response.
- Decide: User + credit area + SAP SD

**R8-13** — obtenerCreditos: the request field 'uen' used as a filter.
- LAN: LAN CustomerServiceMethods.cs:560 filters v.UEN = @Uen (plus the 2-year limit at :561-562).
- ServicioSAP: ServicioSAP Models/CustomerService/ObtenerCreditosModels.cs:9 receives it but nothing reads it (RCS-29).
- Ejemplo: uen=1 returns both MA and VIU credits in SAP.
- Opciones: A: Filter by SalesOrg 04/05 · B: No filter
- Recomendación: A (a regression otherwise, GUIA §1.8c).
- Decide: User

**R8-14** — obtenerCreditos: id, fecha, subtotal, Descuento, point_redeemed, and the list order.
- LAN: LAN CustomerServiceMethods.cs:508 (MovId), :620-632 (newest date), :564 (ORDER BY DESC), :633 (rounding).
- ServicioSAP: ServicioSAP CustomerServiceMethods.cs:445-449 (id = PurchNoC), :414 (date), no sort or rounding (:515-519), Descuento 0 (:508), point_redeemed 0 (:452).
- Ejemplo: id 'ZSD_ZMER_12345', subtotal 10775.862.
- Opciones: A: Accept everything · B: Replicate sort and rounding; accept the id, discount and points differences · C: Also find sources for discount and points
- Recomendación: B, with explicit acceptance of the id format and Descuento=0.
- Decide: User

**R8-15** — nombreCliente: names, telefono and telefono_oculto.
- LAN: LAN CustomerServiceMethods.cs:313-407 (masked Cte names, the validated phone in clear text, plus a masked phone).
- ServicioSAP: Missing. CSV row 45 points at the internal partner/client/ma wrapper. Helpers exist (CustomerServiceMethods.cs:174-193; SolicitudCreditoWebMethods.GetTelefonoValidadoAsync).
- Ejemplo: Validated phone 3312345678: telefono_oculto shows only '5678'.
- Opciones: Name: A NameFirst+Namemiddle (DU13), or B NameFirst only · Phone: C A_GET_TelefonoValidado, or D IsValidatedAsync
- Recomendación: A + C (DU13, DU4).
- Decide: User + Dev 2

**R8-16** — validarCoberturaPorCP: what counts as coverage.
- LAN: LAN CustomerServiceMethods.cs:1738-1904: Intelisis CodigoPostal with MaviRutaSupervision not empty.
- ServicioSAP: Missing. The candidate sepomex/validarcp (Controllers/SepomexController.cs:12-27) has no coverage field.
- Ejemplo: A postal code with no supervision route: LAN says no coverage, while SEPOMEX would make it look covered.
- Opciones: A: A SAP/AWS field equivalent to MaviRutaSupervision · B: A coverage table in SIGMavi · C: DM07 branches
- Recomendación: The business names the source first.
- Decide: User + logistics + Dev 2

**R8-17** — obtenerVentanaConfirmacion: cuenta, cliente, movimiento, telefono, forma_contacto.
- LAN: LAN CustomerServiceMethods.cs:149-211 (Venta Factura plus Cte.Nombre plus VentaEntrega.Telefono; literals 'FACTURA' and 'Página Web').
- ServicioSAP: Missing (Dev 2 S7-04 'wrapper sin identificar').
- Ejemplo: An invoiced order returns {cuenta, cliente, 'FACTURA', phone, 'Página Web'}.
- Opciones: A: SD36 billing documents plus the BP05MA name plus the WE address phone · B: Another source
- Recomendación: A, with the user defining which document type is 'Factura' and the name format.
- Decide: User + Dev 2


### 8 · other customerService

**R8-18** — ActualizarCamposConfigurables, InsertarDesdeTablerateNativo, InsertarDesdeTablerateCustom.
- LAN: Not in LAN: added in 31548f7 (2022-05-31) and removed in b2664ce (2022-11-04).
- ServicioSAP: Missing. DMZ CustomerServiceController.cs:335-369 still calls LAN, which answers 404, so the DMZ answers 500.
- Ejemplo: Any call today ends in a DMZ 500.
- Opciones: A: N/A (dead routes) · B: Find the 2022 'nueva API' and migrate
- Recomendación: A
- Decide: User

**R8-19** — obtenerTipoGarantia: TipoGarantia, Marca and Telefono for a product_id.
- LAN: LAN CustomerServiceMethods.cs:37-148 (VTASCProveedorActivoGarantia joined with Art).
- ServicioSAP: Missing. Dev 3 E-48 plans a SIGMavi DM0415 table plus DM01; which DM01 fields replace Proveedor, MarcaE and Linea: NO EVIDENCE.
- Ejemplo: For SKU X, LAN returns the active warranty of the provider.
- Opciones: A: SIGMavi DM0415 plus DM01 fields the user names · B: Another source
- Recomendación: Confirm the table's DDL and the field equivalents; this is Dev 3 work.
- Decide: User + Dev 3 + Valentín/Humberto

**R8-20** — bitacoraAtencionClientes (customer-service log record).
- LAN: LAN CustomerServiceMethods.cs:409-498 runs SP_ACTES_REGISTRO on ServicioAndroid; it reads Personal and inserts across ERPMAVI.
- ServicioSAP: Missing.
- Ejemplo: A complaint form submission: LAN answers 'ok'.
- Opciones: A: Port it as an Android call and replace only the Intelisis reads · B: Keep calling the SP as it is
- Recomendación: Analyze SP_ACTES_REGISTRO.sql first. The user says whether 'el SP desaparece' (CREDITO §4.2) applies outside credit.
- Decide: User + Dev 3

**R8-21** — GetAccountDebts response shape (bridged but broken, C08).
- LAN: LAN CustomerServiceMethods.cs:776-852 and :1169-1212 group the debts by CanalVenta ({'CREDITO MA':[...], ...}).
- ServicioSAP: ServicioSAP Controllers/AbonosController.cs:18-32 → AbonoMethods.cs:19-51 return the raw EX01 list, without excluding Contable=1.
- Ejemplo: Magento expects grouped debts, which it later sends back to ApplyPayment; it gets [{Belnr, Kunnr}].
- Opciones: A: Rebuild the LAN shape with the R8-11 mapping and a field map · B: Change Magento
- Recomendación: A. Confirm the field map by E2E, and decide on the DIMAS group and the Contable=1 exclusion.
- Decide: User + Marcos + Dev 4

**R8-22** — validarCliente (bridged): the account-link check and the 'nombres' field.
- LAN: LAN CustomerServiceMethods.cs:255-311: Cte WHERE Cliente AND IDMagento; nombres = PersonalNombres.
- ServicioSAP: ServicioSAP CustomerServiceMethods.cs:204-210 match ZidMagento.ToString() == id, so 0 matches '0'; nombres = NameFirst only.
- Ejemplo: A request with id_cliente_magento '0' returns the masked name of any BP that has no Magento account.
- Opciones: A: DU13 for the name, and treat 0 as 'no account' · B: Keep as is
- Recomendación: A (the 0 check is a new condition, so it needs approval).
- Decide: User


### 9a · getSms/validateSms

**R9-01 (= CR-5, ACT-34)** — When to switch DMZ credit/getSms and credit/validateSms from LAN to PostSAP, given the C-account vs BP key.
- LAN: LAN Controllers/CreditController.cs:24-66 and LAN Metodos/CreditMethods.cs:2102-2243 key on the C account (CteTel).
- ServicioSAP: ServicioSAP Controllers/CreditController.cs:29-71 key on the BP, and a C account gets '0'. The DMZ still calls curl.Post (DMZ CreditController.cs:76, :107, verified). GetPhoneValidatedClientSecretName still goes to LAN (DMZ :296). That the SMS dispatcher processes BP-keyed rows: NO EVIDENCE (Business Rules :1302).
- Ejemplo: If Magento still sends 'C00000020', getSms answers '0' and the DMZ answers 400. A BP customer is not found by the LAN gate, so the checkout button stays disabled.
- Opciones: A: Switch now · B: Switch in the release where Magento sends BPs and the gate route is ported · C: Switch only on a test DMZ branch now
- Recomendación: B for production, C for testing. The user confirms that the Magento build under test sends BPs (DU2) and that the SMS dispatcher accepts BP rows.
- Decide: User + DMZ owner + Magento owner

**R9-02** — credit/getSms when the ZidMagento PATCH fails (the equivalent of LAN's UPDATE Cte.IDMagento).
- LAN: LAN CreditMethods.cs:2111-2114: the UPDATE runs inside the try, and a failure returns -1.
- ServicioSAP: ServicioSAP BusinessPartnerMethods.cs:842-870 PATCHes ZSDT_CTE_ODATA_SRV (no sap-client=110 in the URL); a failure returns '-1' (RCR-10). The PATCH has never been seen running.
- Ejemplo: Without authorization on that service, every logged-in customer gets '-1' and no SMS.
- Opciones: A: LAN parity (current behavior) · B: Log and continue
- Recomendación: A, but prove the PATCH once on the test BP first.
- Decide: User


### 9 · bridged credit

**R9-03** — credit/getClienteFactura/{cliente}/{factura} response contract.
- LAN: LAN Controllers/CreditController.cs:69-96: one object with 16 scalars plus articulos[], and sentinel texts.
- ServicioSAP: ServicioSAP Controllers/AbonosController.cs:34-47 → AbonoMethods.cs:54-93 return List<ZSplitDto>. DMZ CreditController.cs:51-59 calls JObject.Parse on it, so the result is always 500 (C06/C07).
- Ejemplo: Every call today ends in a DMZ 500.
- Opciones: A: Build the LAN object in ServicioSAP (needs N4/N6) · B: Make the DMZ accept arrays (against GUIA §1.5)
- Recomendación: A, after N4/N6.
- Decide: User + Uriel + ABAP

**R9-04** — credit/GetCreditAmounts: who fills SQLite mavi_credilana_info, and from what source.
- LAN: LAN Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs:675-800 (LoadCredilanaInfo, from FnVTASListaCredilanas), triggered by LAN credit/SaveCredilanaInfo (Controllers/CreditController.cs:453-463).
- ServicioSAP: ServicioSAP Controllers/CreditController.cs:98-130 reads SQLITE_DB_PATH. Nothing fills it, so every call answers 500.
- Ejemplo: An empty data.db means a 500 on every call.
- Opciones: A: Port the loader with a SAP source (none identified) · B: Keep LAN writing to the file · C: Use SD29/SD40 and drop the cache
- Recomendación: The user names an owner and a source; until then: NO EVIDENCE.
- Decide: User

**R9-05** — credit/guardardocumento: anonymous access on the DMZ route.
- LAN: LAN Controllers/CreditController.cs:589-612 inherits authorization.
- ServicioSAP: ServicioSAP Controllers/CreditController.cs:137-140 requires a token; the DMZ route is [AllowAnonymous] (DMZ CreditController.cs:448).
- Ejemplo: Anyone who can reach the DMZ can upload into MAVI_DOC_CTE.
- Opciones: A: Keep it anonymous · B: [Authorize] on the DMZ, with Magento sending a token
- Recomendación: Decide before go-live; this is not a Fable task.
- Decide: User + security owner


### 9 · balances

**R9-06** — credit/getClienteSaldo: the source of saldoCapital (N4) and N5/N6/N8/N9.
- LAN: LAN Controllers/CreditController.cs:97-122 → FacturaMethods.cs:56-91 → SPCXCSaldosClientesPendiente (:508-528).
- ServicioSAP: Missing; the DMZ still calls LAN (DMZ CreditController.cs:23). Candidates: EX01 DocNoCompSet, or NTZ01 zsplits (the Partner filter has never been run).
- Ejemplo: For document 9000006302, EX01 says 3,036.00 and NTZ01 says 172.00 (GUIA §6.3).
- Opciones: A: NTZ01 SUM(Zsaldo) · B: EX01 SUM(Saldo) without Contable=1 and without Credilana/Seguros
- Recomendación: Get the N1 and N2 captures first.
- Decide: Uriel + dev with S/4 access + LAN team + ABAP

**R9-07** — credit/getClienteSaldo: input validation (N10) and the response on a SAP failure (N11).
- LAN: LAN Controllers/CreditController.cs:22 regex ^[C]{1}[0-9]{8}$; FacturaMethods.cs:48-51 swallow errors and answer 'No tiene facturas'.
- ServicioSAP: Missing; sibling routes answer 500 (Controllers/AbonosController.cs:28-31).
- Ejemplo: A BP 1500005115 fails the LAN regex.
- Opciones: N10: A ^[0-9]{10}$; B any BP that exists · N11: A 'No tiene facturas'; B 500
- Recomendación: N10-A (DU2) and N11-A (parity), both with approval.
- Decide: User

**R9-08** — credit/MonederoSaldoCredito: source of the wallet balance.
- LAN: LAN Controllers/CreditController.cs:468-487 → LAN CreditMethods.cs:1597-1640 (serie by uen, FnVTASCalcularSaldo).
- ServicioSAP: Missing. The documents disagree: SD33 (CSV row 4), SD18 (Dev 2 S4-01), 'Wallet' (GUIA §8.2).
- Ejemplo: MA client: the balance of that serie.
- Opciones: A: The same SD18 path as wallet/details · B: SD33 · C: A Wallet API
- Recomendación: A, if the user confirms it is the same balance (see P4-Q1).
- Decide: User + Dev 2

**R9-09** — Account unification: where CREDIHUnificacionMonedero lives, and which category rule applies.
- LAN: LAN CreditMethods.cs:1647 (read). :1664-1675: the pre-check requires both accounts to be CREDITO MENUDEO. :1677-1700: the insert requires CONTADO plus CREDITO MENUDEO.
- ServicioSAP: Missing (Dev 2 S4-09/S4-10/S4-15 blocked).
- Ejemplo: A CONTADO account plus a credit account: the pre-check says false, but the insert would accept them.
- Opciones: Location: A SAP Z table plus API; B SIGMavi · Rule: C the pre-check rule; D the insert rule
- Recomendación: The owner picks the location and the business resolves the contradiction.
- Decide: User + Dev 2 + ABAP


### 9 · scope

**R9-10** — Where the Credilana boundary falls for CreditoWeb_Informacion, CreditoWeb_Solicitud, CreditoWeb_SolicitudPrimerGuardado, CreditoWeb_FormDatos and CreditoWeb_SaveData.
- LAN: LAN CreditMethods.cs:1206, :1294, :1347 run SPCREDICredilana. :683 runs SP_CREDITO_WEB_VALORES_FORM. SaveData is CredyPrestamoMethods.cs:29. FormDatos reads mavi_credilana_info (Controllers/CreditController.cs:150-172).
- ServicioSAP: All missing. GUIA §1.6b names SPCREDICredilana as Credilana-only.
- Ejemplo: CreditoWeb_Solicitud runs SPCREDICredilana yet is still in package 9.
- Opciones: A: All 5 out of scope · B: Only the 3 that run SPCREDICredilana are out · C: Decide per route
- Recomendación: B as the starting point.
- Decide: User

**R9-11** — Deprecation of codigoRecomendado, codigoRecomendadoWithUen, Validar_Lada, codigoPromocion and ExistRFCAndPhoneCte.
- LAN: LAN CreditMethods.cs:1110, :1150, :1390-1410, :392, :1413-1495 (ExistRFCAndPhoneCte always returns the same constant).
- ServicioSAP: No routes. DU16 says coupons are deprecated; CSV rows 8, 27 and 28 say Deprecado.
- Ejemplo: Porting ExistRFCAndPhoneCte would just return a constant.
- Opciones: A: All N/A · B: Migrate some of them
- Recomendación: A, route by route (ACT-35 for codigoPromocion).
- Decide: User + Magento owner

**R9-12** — Is credit/SolicitudMercancia part of APP mercancías (out of scope)?
- LAN: LAN CreditMethods.cs:609-670 inserts with origen 'APP MERCANCIAS'.
- ServicioSAP: Missing; a similar insert exists (SolicitudCreditoWebMethods.InsertAsync).
- Ejemplo: The merchandise app opens a credit request.
- Opciones: A: Out of scope (SKILL rule 30) · B: In scope (Dev 3 E-45)
- Recomendación: A, unless the user says otherwise.
- Decide: User


### 9 · remaining

**R9-13** — credit/getCreditAccount/{pAccount}: resolving a prospect to its client.
- LAN: LAN Controllers/CreditController.cs:438-451 → LAN CreditMethods.cs:1552-1595 (CREDIHProspectoACliente).
- ServicioSAP: Missing. Dev 2 S4-05 says to check ZSDT_CTE ZtipoCliente.
- Ejemplo: Prospect P00001234 became C00005678; in SAP the prospect and the client may be the same BP.
- Opciones: A: Check ZtipoCliente and return the same BP · B: A new mapping table · C: Deprecate (DU2)
- Recomendación: Ask about C first, otherwise A.
- Decide: User + Dev 2

**R9-14** — credit/GetPhoneValidatedClientSecretName: the employee check, the masked name and the validated phone (it gates R9-01).
- LAN: LAN CreditMethods.cs:1783-1860 (FNVTASValidarEmpleado :1817, CREDITO MENUDEO :1837).
- ServicioSAP: Missing.
- Ejemplo: A BP customer is not found, so the checkout button stays disabled.
- Opciones: A: Port with the BP05MA name, A_GET_TelefonoValidado and SuccessFactors · B: Treat it as Credilana
- Recomendación: A, in one spec with R9-01. The user names the replacements for FNVTASValidarEmpleado and the category check.
- Decide: User + Dev 2

**R9-15** — Scope and timing of SaveHaztenTransaction and the ProductosMX account-opening routes (SaveFirstData, SaveData_Articulos).
- LAN: LAN CreditMethods.cs:2299-2340 (SIGMavi CREDIHBiometrico), :506-526 (SpCREDISolicitudWebPrimerGuardado), :466-505 (SP_CREDITO_WEB_DATOS Update branch).
- ServicioSAP: Missing. CREDITO:1170 defers the ProductosMX routes to Feb-Mar 2027.
- Ejemplo: A ProductosMX account opening still goes to LAN.
- Opciones: A: Take them into package 9 now · B: Defer ProductosMX and port SaveHaztenTransaction now
- Recomendación: B
- Decide: User


### 10 · ProductsController

**P10-1** — Scope of the 8 DMZ product/* routes. They push to Magento and are called by the LAN ImportApp jobs, not by Magento. Is package 10 out of the per-controller count?
- LAN: LAN is the caller: LAN Helper/Curl.cs:21 (URL_DMZ). LAN Metodos/ProductMethods.cs:653-2493, ProductStock/ActualizacionStock.cs:95, :106, ProductImage/Methods.cs:35-195, all inside the jobs in LAN Controllers/ProductsController.cs:17-212. External scheduler: NO EVIDENCE.
- ServicioSAP: Missing: nothing in ServicioSAP calls DMZ product/*. product/exportaart supports 'ma' only (Controllers/ProductController.cs:33-38). product/stock and jerarquia have no caller (Business Rules :2602, :2732, :2788).
- Ejemplo: The LAN job product/updateStock computes the stock delta and POSTs it to DMZ product/updateStock, which forwards to Magento inventory-update.
- Opciones: A: Out of count; the job replacement stays with Dev 2 Sprint 9 · B: Redefine package 10 as job replacement, with a spec per job · C: Fable documents the job → DMZ call map, read-only
- Recomendación: A (optionally C), and correct GUIA §0.2 (:78-83).
- Decide: User + Dev 2 / Javier

**P10-2** — DMZ product/getStockByStore (a stub) and product/updateConfigurableProductLink: deprecate them?
- LAN: DMZ ProductsController.cs:61-66 returns "stores". No caller in LAN or ServicioSAP.
- ServicioSAP: Missing; CSV:101 marks getStockByStore Deprecado.
- Ejemplo: A POST to getStockByStore returns 200 "stores".
- Opciones: A: Deprecate both · B: Check the DMZ IIS logs first · C: Implement real stock (new behavior)
- Recomendación: A, after the DMZ owner checks the IIS logs.
- Decide: User + Diego


### 11 · MagentoController

**P11-1** — Close package 11: the 13 magento/* routes need no equivalent; ServicioSAP already calls 11, and 2 are deprecated.
- LAN: LAN Conn/Magento.cs:24-358 is the caller; getOrderId was retired on 2026-09-21 (BAJA_getOrderId.md, verified).
- ServicioSAP: ServicioSAP Methods/Catalog/MagentoCatalogMethods.cs:53-329 and Methods/Customer/MagentoAccountMethods.cs:24, :34. Nothing schedules catalog/* (Business Rules :3096).
- Ejemplo: The LAN job calls magento/attributes and so does ServicioSAP catalog/attributes.
- Opciones: A: Close it and open a separate item for the catalog/* scheduler · B: Keep it as a read-only parity check
- Recomendación: A, and assign a scheduler owner.
- Decide: User + Dev 3


### 12 · MercanciaController

**P12-1** — mercancias/* (APP mercancías): confirm they stay on LAN, and name who keeps them working when LAN is switched off or the JWT keys are separated.
- LAN: DMZ MercanciaController.cs:26, :41, :69, :83, :95 call new Curl().Post to LAN (verified) → LAN Controllers/MercanciaController.cs:16-57.
- ServicioSAP: Missing; CSV:133-137 targets are all Deprecado.
- Ejemplo: mercancias/getSaldoVencido is named 'No migrar' in SKILL rule 30.
- Opciones: A: Out of scope; warn the APP mercancías owner · B: Bridge to the CSV targets (violates rule 30) · C: Remove the routes if unused
- Recomendación: A, and correct PLAN:29-30, :45, :198.
- Decide: User + APP mercancías owner (not named)


### 13 · LoginController

**P13-1** — DMZ login/authenticate stays DMZ-local and is never bridged to ServicioSAP login/auth.
- LAN: LAN is a caller (LAN Helper/Curl.cs:21-37).
- ServicioSAP: ServicioSAP is also a caller (Helpers/ConexionDMZ/Curl.cs:55; OrderMethods.cs:1181, :1273). Its own login/auth (Controllers/LoginController.cs:14-20) is a different token issuer. CSV:63 maps them anyway.
- Ejemplo: Bridging it would make every caller receive a token signed with a different key.
- Opciones: A: Out of count, keep as is · B: Bridge as CSV:63 suggests
- Recomendación: A
- Decide: User + DMZ owner

**P13-2** — When and how to separate the shared JWT keys (key, issuer, audience) of LAN and ServicioSAP (PLAN:206).
- LAN: LAN Controllers/TokenValidationHandler.cs:46 and TokenGenerator.cs:17. DMZ Helper/Curl.cs:61-71 has the LAN login commented out, and :80/:84 send the ServicioSAP token to LAN (:106, :257).
- ServicioSAP: ServicioSAP Helpers/TokenGenerator.cs:34-40 and TokenValidationHandler.cs:47-49. The reviewers compared hashes: identical values in LAN and ServicioSAP.
- Ejemplo: DMZ credit/getSms sends a ServicioSAP token to LAN; separating the keys would break the 63 live DMZ routes that still call LAN, if LAN validates the header.
- Opciones: A: Wait until no DMZ route calls LAN · B: Separate in the same change that restores the LAN login in DMZ Curl · C: Separate now, on its own
- Recomendación: A or B, never C. First run the header check from GUIA:595.
- Decide: Marcos/Diego + user


### 14 · LoggingController / ServicioSAP infrastructure

**P14-1** — Nodos.ENVIROMENT_DEV hard-coded in 68 ServicioSAP call sites (the plan says 64), plus sap-client=110 in the URLs: centralize now or at the move to Stage/PROD? Every new route Fable writes under SKILL rule 29 adds another site.
- LAN: N/A
- ServicioSAP: 68 lines in 12 files, e.g. Helpers/TokenGenerator.cs:70-71, Methods/MaterialManagement/ProductMethods.cs (20 sites), BusinessPartnerMethods.cs (10), OrderMethods.cs (9), FinalListProperMethods.cs:22, :55, :103. Nodos comes from Conexion.dll (ServicioSap.csproj:48-50).
- Ejemplo: Moving to QA means editing every obtenerUrl(Nodos.ENVIROMENT_DEV, ...) line.
- Opciones: A: Keep until the move (GUIA §8.6) · B: Centralize now in one approved helper, and amend SKILL 29 / GUIA §1.1 · C: A Web.config appSetting
- Recomendación: B before Fable starts packages 7, 8 and 9; otherwise A, and update PLAN:207 to 68.
- Decide: Marcos/Diego + user


## 7. Sin verificar

- Not verified line by line: most citations for packages 2-14 come from the reviews. I spot-checked these against the code on 2026-10-02:
- ServicioSAP HEAD and diff
- BusinessPartnerController.cs:48 and BusinessPartnerMethods.cs:578
- the OrderMethods.cs:2607-2613 guard and :626/:651
- SolicitudCreditoWebMethods.cs:27 and :238-240
- the ZSD_{tipo} construction at OrderMethods.cs:2966-2971 and the Magento tipo T/P observer
- Partner.cs:36 (int ZidMagento)
- DMZ PostSAP at WalletCustomerController.cs:81 and CustomerServiceController.cs:218/:229
- DMZ curl.Post at CreditController.cs:76/:107 and the mercancias new Curl().Post
- the commented validateCredit route
- the bin DLL timestamp
- SKILL.md:29
- PLAN:56-70, :88-94 and :20-45
- CREDITO:411, :564, :1135 and ACTIVIDADES:22/:66
- BAJA_getOrderId.md
- Contradicted review claim: the pkg1 review said 01_CustomersController.md and Business Rules Ecommerce.md use LF. Both are CRLF (1354/1354 and 4580/4580 lines, checked byte-level), so that 'prompt fix' was dropped.
- Corrected review claim: R7e-4 treated the getOrderId retirement as unconfirmed. _NUESTROS_ENDPOINTS/Contratos/BAJA_getOrderId.md records it as confirmed on 2026-09-21. Only the liberador's use of eCommerceDetPedidos remains to check.
- Which binary IIS actually serves, and which source built the share's bin/ServicioSap.dll (2026-10-02 10:15): NO EVIDENCE.
- Whether BP05 accepts $filter on ZidMagento, and its EDM type ($metadata is not in the vault): NO EVIDENCE.
- The real Magento setCustomer payload, the gender encoding ('M' maps to female in MapGender) and who reads the returned account: NO EVIDENCE.
- How SAP invoicing uses Fiscalregimen, and whether 605 or 616 goes with the generic RFC: NO EVIDENCE. The 616 point is general CFDI 4.0 knowledge, not verified here.
- Callers of the LAN-only routes and of DMZ product/getStockByStore and updateConfigurableProductLink, and the owner of the Atentus monitor: NO EVIDENCE. Magento reads some DMZ URLs from admin config, so a code grep cannot settle it.
- Contents of SD18, DM01 ESTATUS/FAMILIA, the AWS catalogs, ZQBC_CODEMSTRD, to_zsdt_vbak and the Zidstatus catalog: no captured response exists.
- Whether LAN actually validates the JWT header (GUIA:595), and the reviewers' SHA-256 key comparison: not re-run here.
- Whether the SMS dispatcher processes BP-keyed rows, and whether the ZidMagento PATCH on ZSDT_CTE_ODATA_SRV is authorized: NO EVIDENCE.
- Production value of the Magento flag multipagos/config/is_advanced_enabled: NO EVIDENCE.
- The SP source behind LAN's guest and agent defaults in order/new (SP_eCommerceNuevoPed / SPVTASPedidosMagento): not reviewed.
- Reviewer counts I did not recount: 68 ENVIROMENT_DEV sites, about 29 inline OData paths, 63 DMZ routes still on LAN, and 26 bridged. A raw grep found 28 PostSAP/GetSAP/PatchSAP lines across the DMZ controllers, comments included.

## 8. Correcciones aplicadas

- **2026-10-02 — Ruta raíz (corrección 1 de §4), aprobada por el usuario:** \\CATECINF214058D\Migracion SAP → \\172.16.214.58\sap en SKILL.md (9 menciones, líneas 18-61), GUIA_MIGRACION_FABLE.md:94, Resources\MemoryClaude\convenciones-migracion-sap.md:13 y LAN - Mapa.md:13 (bóveda). Se conservaron sin cambio las menciones históricas o que explican por qué la ruta vieja falla (GUIA-ACCESO-MAVI-PWA.md, PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md:144/:1681, COMPARATIVA_BP_LAN_VS_SAP.md:5, FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md:1377). Codificación y fin de línea de cada archivo sin cambio. Pendientes de §4 para la sesión S1: corrección 2 (compilar sin Z:), X-1, X-2 y quitar T1.1-02.

- **2026-10-02 — X-1 (quién actualiza Business Rules), respuesta del usuario:** sí, Fable actualiza [[Business Rules Ecommerce]] en el mismo cambio cuando el cambio se basa en reglas ya definidas (decisiones del usuario o reglas de negocio documentadas); si falta una regla, pregunta. Aplicado en  1_CustomersController.md §0.6 (excepción a la regla 23) y en el prompt de S1 §4.1 (leer el bloque POST /partner/client y actualizarlo al terminar), y en PLAN_FABLE_POR_CONTROLADOR.md (entrada obligatoria 4 y criterio de cierre). Prevalece SKILL.md («Fuente única de cómo funciona ServicioSAP»). Pendientes para S1: compilar sin Z:, X-2, quitar T1.1-02.
