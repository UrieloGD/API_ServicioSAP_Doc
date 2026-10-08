---
tags: [migracion, sap, estado]
fecha: 2026-10-06
estado: vigente
---

# Migration status LAN → ServicioSAP (all inputs combined) — 2026-10-06

> [!abstract] Scope and method
> This is a read-only consolidation. No code, SQL or HTTP calls were run. It combines four inputs:
> - the Fable plan board;
> - the full parity check, [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]];
> - the junk-code and obsolete-statement sweep, [[CODIGO_BASURA_Y_DOCS_OBSOLETOS_2026-10-06]];
> - the per-method improvement lists for areas A1 (order, credit, abonos, wallet), A2 (customers, customer service, BP, helpers, models) and A3 (catalog, export, pickup, Openpay, product).
>
> Code versions read:
> - ServicioSAP: `SpExportaEcommerce` HEAD 6214ed8 plus the uncommitted S1-S4 edits of 2026-10-05.
> - DMZ: ConexionSAP 09cb341.
> - LAN: stage-delta 68b2290. origin/Production was used where noted.
>
> Goal of the migration: ServicioSAP must match LAN's business rules (equivalent behavior, not identical code), carry no junk code, and the vault must not contain obsolete information.
>
> Working rules that apply to everything below:
> - Fable/Claude write code only on `\\172.16.214.58\sap`.
> - The user compiles in Visual Studio, commits and tests.
> - Agents never run SQL. They hand the query to the user.
> - There is no testing without SAP. The Fakes are obsolete. The only real evidence is `Logs/sap.log`.
>
> **Two id sets, kept apart in this document:**
> - **C-01..C-37** are the code items of [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §4.1 (for example C-11 = RegisterPickupClientInfo, C-15 = G15-06 prices, C-16 = the new GetIntelisisStatuses route).
> - **RC-xx** are the connection and deployment items C-xx of [[REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05]] §6, renamed here so they do not clash (RC-06 = dev DMZ blanket redirect, RC-11 = setOrder response R7a-1, RC-12 = setCustomer error mapping, RC-15 = LAN-only routes and unknown callers / 30 days of IIS logs, RC-16 = catalog and import scheduler owner). The source documents still write them as C-xx.

## 1. Answer: the status on one screen

| Dimension | Number | What the number counts |
|---|---|---|
| Fable plan: packages | **14 packages, 1 with a spec** | Package 1 (CustomersController) is the only package with a spec and sessions. Packages 2-9 are NEEDS_SPEC_FIRST (6 is OUT_OF_SCOPE per [[REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05]] §3). Package 11 is READY_AFTER_DEFINITIONS. Packages 10, 12, 13 and 14 are OUT_OF_SCOPE until the user confirms. |
| Fable plan: package 1 | **14 of 32 tasks resolved**: 10 done, 1 partial, 3 decided with no code. Also: 6 decisions open, 8 E2E tests waiting for the user, 4 blocked or waiting on a prerequisite. | Sessions S1-S4 of S1-S7 were run on 2026-10-05. They are not committed yet. Next are S5 (look up and update an existing BP), S6 (user E2E) and S7 (cutover). |
| Credit track (order/new, credit branch) | **120/160 rules equal** (119 on 2026-10-02, [[PLAN_EJECUCION_SP_CREDITO_A_CODIGO]] §27.1) | The user's own track, @Op='Insert' only. TEL-1 closed G3-04. |
| Business-rule parity | **13 of 161 processes at parity** (7 EQ + 6 EQ_ACCEPTED) | Processes include DMZ routes, LAN-only routes, LAN background jobs and the ServicioSAP routes that replace them. |
| Status of the other processes | 31 PARTIAL · 11 DIF · 22 MISSING · 22 BLOCKED · 19 RETIRE_CANDIDATE · 43 OUT_OF_SCOPE | **99 processes must keep working after LAN is switched off** (161 − 43 − 19). Only **13 of those 99** are at parity today, about 13 %. |
| Verified gaps | **376 confirmed**, 3 refuted; **29 critical** (§4.4) | Each gap is one broken rule inside a process. Two groups sometimes report the same defect on purpose (for example, Openpay appears as G04-01, G06-19 and G14-14). |
| Gaps by what unblocks them | 182 DECISION · 96 CODE · 75 EXTERNAL · 21 DATA · 2 CONFIG | Almost half wait on a user decision. Only about a quarter can be coded without one. |
| Code health | **220 junk findings**: 71 DELETE · 51 REPLACE · 85 DECIDE · 13 KEEP | 38 of them are DIVERGES_FROM_LAN, meaning the code runs but breaks a LAN rule. Project-wide: 68 hard-coded `Nodos.ENVIROMENT_DEV` and 69 `sap-client=110` literals, 102 `Console.WriteLine` and 10 `Debug.WriteLine` calls (all lost under IIS). |
| Documentation health | **215 obsolete statements in 40 vault documents**: 33 high · 100 medium · 82 low | 39 describe something as pending that is already done. 33 cite a superseded decision. 44 are wrong citations. |

**Where it really stands.** The customer package is the furthest along: S1-S4 are coded but not committed and have no E2E. Every other area has three kinds of work left: (a) defects that corrupt data today on routes the DMZ ConexionSAP branch already sends to ServicioSAP, (b) about 12 high-impact decisions, and (c) deliveries from SAP SD, ABAP, the liberador team and Dev 2.

**Routes already bridged to ServicioSAP that return wrong data today:**
- setCustomer, setOrder, cancelOrder, returnOrder;
- GetAccountDebts, getClienteFactura;
- wallet/details, getMinimumCostToRedeem;
- GetCreditAmounts (500 on every call).

**What blocks a first release:**

1. **Package 1 cutover (S7):**
   - S5 needs CQ2 and CQ3 plus the step-0 GET (D-15).
   - CQ14 is urgent. S4 now stores SmtpAddr in uppercase, and `ValidarClienteEnSapAsync` (CustomerMethods.cs:82-83) builds `Mail eq` with the email as sent. OData `eq` is likely case-sensitive, so lowercase emails would stop matching; this is unverified until P-15 / the 3 read-only GETs.
   - CQ21 (Logger), CQ24 (account errors), D-14 (Fiscalregimen) and CQ26 (doc) are open.
   - G01-03: an exception gives Magento 200 "WebException..." (BusinessPartnerController.cs:62-65), which Magento may store as the account.
   - G01-04: idMagento "" fails at BusinessPartnerMethods.cs:401-404.
   - J1-17: SntzMethods.cs must be committed together with the csproj.
   - S6 E2E by the user.
2. **Any order or credit release:**
   - Code: C-01 (SAP errors treated as success), C-02 (cancel lookup), C-03 (callback keys).
   - Code: C-04, the credit gate route, with the interim is_client_valid rule until DEC-07. It must ship **before or with** the Magento BP release.
   - Decisions: DEC-02 (response contract), DEC-03 (Openpay: do not route cards yet), DEC-04 (pricing, stock, region), DEC-05 (cash term), DEC-06 (cancel and return).
   - External: DU11 (liberador contract) and DU20 (ZIdEcommerce OData).
3. **Catalog and stock:** LAN keeps running the import, price and stock jobs until Dev 2 Sprint 9 (4-18 Dec) (RC-16).
4. **Before go-live in general:**
   - Choose one environment mechanism for the 68/69 hard-coded DEV/110 literals (J1-13, J7-11).
   - The test routes (`partner/testnew`, `order/testnew`): the user still has to answer GUIA_MIGRACION_FABLE.md:548, which asks whether to delete both. Recommendation: delete both before go-live.
   - Delete the Neko stubs (or return 501).
   - Move the secrets out of Web.config (J1-20).

## 2. Fable plan progress

### 2.1 Package 1: CustomersController (the only package with a spec)

| Board item | Count | Detail |
|---|---|---|
| Tasks | 32 | Spec [[01_CustomersController]] §1.4 |
| Done | 10 | Including T1.1-01, -01b, -04, -05, -08, -10, T1.2-02, T1.2-04, T1.L-02, T1.H-01 (S1-S4, 2026-10-05, uncommitted) |
| Partial | 1 | T1.1-07 |
| Decided, no code | 3 | T1.1-06, T1.1-11, T1.5-03 |
| **Resolved total** | **14** | done + partial + decided with no code |
| Decisions open | 6 | listed in the next table |
| E2E by the user | 8 | S6 |
| Blocked or prerequisite | 4 | T1.L-01 `SpListaNBMagento` source and list DDL (BLOQUEADO_EQUIPO, CQ16); T1.L-04 production load of the lists in SIGMavi (PRERREQUISITO, CQ17); T1.C-02 consumer of the LAN-only getCuenta/setCuenta routes and its cutover (BLOQUEADO_EQUIPO, CQ23); T1.0-DEP branch merge and deploy (BLOQUEADO_EQUIPO, CQ27) |

The CQ10 Magento payload is already captured (T1.1-04 was confirmed with it). The step-0 GET belongs to the T1.1-03 decision and the T1.1-09 verification, not to the blocked list.

| Open decision | Question | Status |
|---|---|---|
| T1.1-02 | Fiscalregimen (D-14) | owner of the fiscal value |
| T1.1-03 | Look up and update the existing BP (CQ2/CQ3) | gates S5; needs step-0 `GET partner/client/filter/ZidMagento eq <id>` |
| T1.2-03 | Email case and trailing spaces (CQ14) | **urgent**: S4 uppercases SmtpAddr (BusinessPartnerMethods.cs:484), while setCustomerList sends `Mail eq` with the email as sent; the match is likely case-sensitive, to be confirmed by P-15 |
| T1.5-04 | Logger.SAP can throw (CQ21 A/B) | recommendation: A now (the deployment creates `<site>\Logs`), B later |
| T1.C-01 | getCuenta/setCuenta errors (CQ24) | the user asked for a clearer explanation (see DEC-31) |
| T1.0-DOC | Doc scope (CQ26) | — |

Pending inputs from the user:
- The CQ21 choice.
- CQ24, re-explained.
- 3 read-only GETs on ZB_DATOS_CLIENTE (`Mail` in lowercase, in UPPERCASE, and with `tolower`) to confirm whether `ValidarClienteEnSapAsync` is case-sensitive, and then fix it.
- Confirmation to remove the read of `SAP_BP_CAMPO_EMAIL`, a key that never existed in any config (J1-18/J4-07).

Sessions: S1-S4 done (uncommitted) · S5 build lookup/update (needs CQ2, CQ3, step 0) · S6 E2E (user) · S7 cutover (release).

### 2.2 Packages 2-14 (per [[REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05]] §3 and [[PLAN_FABLE_POR_CONTROLADOR]])

| # | Controller | Readiness | What it waits on |
|---|---|---|---|
| 2 | ProspectoController | NEEDS_SPEC_FIRST | D-23 scope gate (ticket 10226 points to the Credilana app); D-24 RFC annexes; D-25 recuperarcuenta |
| 3 | WholesaleCustomerController | NEEDS_SPEC_FIRST | D-26 name and not-found rules; D-27 retire or build negotiable-quote |
| 4 | WalletCustomerController | NEEDS_SPEC_FIRST | D-28 SD18 semantics and captures; D-29 C09 algorithm; D-31 getCuentaC |
| 5 | StatusController | NEEDS_SPEC_FIRST | D-30 discard, or rebuild as a health check |
| 6 | RecommenderController | OUT_OF_SCOPE (unconfirmed) | D-31 |
| 7 | OrdersController (7a cash, 7b cancel/return, 7c credit routes, 7d pickup/Openpay, 7e queries) | NEEDS_SPEC_FIRST (the credit S1 inside order/new is READY_AFTER_DEFINITIONS) | D-34..D-38, DU11, DU20 |
| 8 | CustomerServiceController | NEEDS_SPEC_FIRST | D-40 logins, D-42 obtenerCreditos, D-43, BBVA/STP blocked on ABAP |
| 9 | CreditController | NEEDS_SPEC_FIRST | D-45..D-52; balance routes blocked by N1-N6 |
| 10 | ProductsController | OUT_OF_SCOPE (unconfirmed, D-53) | pass-through to the importer |
| 11 | MagentoController | READY_AFTER_DEFINITIONS | D-54 (E-22 vs Production), D-07 (LAN reference branch), RC-16 (scheduler owner) |
| 12-14 | Mercancia, Login, Logging | OUT_OF_SCOPE (unconfirmed, D-55) | — |

Note: the consolidation input groups package 6 with 2-9. The 10-05 revision marks it OUT_OF_SCOPE.

### 2.3 Credit track (the user's own work, §23 of [[PLAN_EJECUCION_SP_CREDITO_A_CODIGO]])

- **120/160** rules equal. Scope is `SP_CREDITO_WEB_DATOS @Op='Insert'` only, since 2026-09-24 (§17).
- Committed in 05df55a and merged in 6214ed8.
- Still open:
  - liberador trigger (DU11; DEC-08);
  - resend guard T2c (G05-02);
  - callback keys T1a (C-03);
  - creditStatus source (DEC-32);
  - updateCreditOrderId (DU20);
  - checkout gate GetPhoneValidatedClientSecretName (C-04);
  - GATE-1, LIM-1, P7/P8b, TQ-3, P16 (DEC-29).
- Files the user decides and codes: SolicitudCreditoWebMethods items J3-16, J3-17, J3-M03, G05-09, G05-10. Fable does not touch them, including the J3-17 no-op try/catch.

## 3. Parity by area

Counts are processes (rows that group several routes count once per route). Total 161. Detail per process: [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §3 and §5.

| Group | Processes | Status mix | Main gap | What unblocks it |
|---|---|---|---|---|
| G01 Customers | 7 | 3 EQ_ACC · 3 PARTIAL · 1 DIF | setCustomer always creates a new BP (Partner="" BusinessPartnerMethods.cs:435). Exception → Magento 200 "WebException" (BusinessPartnerController.cs:62-65). `Mail eq` is likely case-sensitive (CustomerMethods.cs:82-83; unverified until P-15). | DEC-01 (CQ2/CQ3 + step 0), DEC-17 (CQ14), DEC-18; S5-S7 |
| G02 Prospecto + Wholesale | 4 | 2 PARTIAL · 1 MISSING · 1 RETIRE | recuperarcuenta builds an injectable, case-sensitive filter with the wrong masking (ProspectoController.cs:47, :55). Wholesale 404 becomes 500. | C-07, C-24; DEC-13 (D-23 scope), D-27 |
| G03 Wallet, Status, Recommender | 7 | 2 DIF · 5 RETIRE | wallet/details ignores uen and garbles accents (WalletCustomerController.cs:26-34, :50). The redeem minimum has no per-family algorithm and invents a fallback channel (WalletMethods.cs:131-151, :226-231). | C-23, C-31; DEC-11 (D-28/D-29, X-09); DEC-30 retirements |
| G04 Order creation, cash | 13 | 1 EQ · 8 PARTIAL · 2 DIF · 2 BLOCKED | SAP errors treated as success (OrderMethods.cs:1890-1905). Wrong price floor and term, region rewrite (:1995-2050, :2255-2277, :2116-2181). Card orders never reach SAP (:1777-1786). Object contract (OrderController.cs:26-47). | C-01, C-11, C-19..C-22; DEC-02..05; X-03, X-04, X-14 |
| G05 Credit branch and routes | 5 | 1 PARTIAL · 2 BLOCKED · 1 OOS · 1 RETIRE | Liberador not triggered (OrderMethods.cs:673-707 commented out). Duplicate on resend. creditStatus and updateCreditOrderId missing. | X-01 DU11, X-02 DU20, X-05; DEC-08, DEC-29, DEC-32 |
| G06 Cancel, return, pickup reads, Openpay, queries | 15 | 2 EQ · 2 DIF · 3 MISSING · 2 BLOCKED · 6 OOS | Every cancel fails (ZSD_T_/ZSD_P_, OrderMethods.cs:3010-3011). Every RMA fails (store null, :2190, :366-368). No annulment API. GetIntelisisStatuses missing. | C-02, C-16 (GetIntelisisStatuses); DEC-06 (D-35/D-36); X-03, X-11, X-12; P-01, P-02 |
| G07 CustomerService accounts and logins | 10 | 1 EQ · 4 PARTIAL · 4 MISSING · 1 BLOCKED | Customers born before 1970 cannot log in (CustomerServiceMethods.cs:282). Errors read as "not found". nombreCliente, bitácora and ventana are missing. | C-06, C-17, C-18; DEC-12, DEC-23, DEC-25, DEC-28; X-21 |
| G08 Payments and debts | 10 | 1 EQ · 1 DIF · 2 MISSING · 3 BLOCKED · 3 OOS | GetAccountDebts returns the raw EX01 array instead of LAN's grouped `{data,status}` (AbonosController.cs:26). No write target for BBVA/STP intents. | DEC-09 (C now: point back to LAN); X-06, X-07; P-10 |
| G09 Credits list, coverage, shipment | 6 | 1 PARTIAL · 1 MISSING · 1 BLOCKED · 3 RETIRE | obtenerCreditos cannot see pending or rejected applications (SD36 only, CustomerServiceMethods.cs:356). It also dumps PII (SalesMethods.cs:200). | C-25, C-26; DEC-26, DEC-28; X-10, X-12 |
| G10 SMS/NIP, coupons, gate | 10 | 1 EQ_ACC · 2 PARTIAL · 2 MISSING · 5 RETIRE | The checkout gate is still on LAN, so it rejects every BP credit order (DMZ CreditController.cs:289-299). The ZidMagento PATCH has no sap-client (BusinessPartnerMethods.cs:786-787). | C-04, C-05, C-34; DEC-07 (D-48), DEC-19, DEC-20; X-15, X-16 |
| G11 Balances, invoices, amounts, terms, documents | 11 | 2 EQ_ACC · 2 PARTIAL · 1 DIF · 1 MISSING · 4 BLOCKED · 1 OOS | getClienteFactura returns an array, so the DMZ answers 500, and it ignores `cliente` (AbonoMethods.cs:68). The GetCreditAmounts cache is never filled (CredilanaMethods.cs:25-28). | C-12; DEC-10, DEC-21; X-07 (N1-N6), X-13 |
| G12 CreditoWeb, Hazten, mercancía | 10 | 5 MISSING · 5 OOS | ProductosMX and APERTURA routes are not ported. | DEC-22 (R9-10/R9-15: defer to Feb-Mar 2027, APERTURA = Credilana) |
| G13 Magento-direct, products, catalog | 32 | 4 PARTIAL · 1 RETIRE · 27 OOS | The catalog/* routes have no caller and write `sap\data.db`, which nobody reads. E-22 follows stage-delta, not Production. | DEC-14 (RC-16), DEC-15 (D-54/D-07); C-27; P-07 |
| G14 LAN processes outside the DMZ | 14 | 2 PARTIAL · 2 DIF · 1 MISSING · 7 BLOCKED · 2 RETIRE | Pickup routes: GET vs POST, and Magento rejects the empty products list. The LAN push jobs are not replaced. Inbound setOrderStatus is missing. | C-08..C-10, C-28, C-32; DEC-16, DEC-24; X-08, X-19 |
| G15 Product export, catalog sources | 7 | 2 EQ · 2 PARTIAL · 2 MISSING · 1 RETIRE | exportaart/ma fails open on images and errors (EcommerceMethods.cs:623-645, :1377-1381). No configurables, credit matrix or special prices. viu/mavi not built. | C-13..C-15, C-29; DEC-14, DEC-33; X-08 |

## 4. Production risks if released as-is

### 4.1 Routes already bridged in DMZ ConexionSAP that break today

| # | Gap | What breaks | Where | Fix |
|---|---|---|---|---|
| R-01 | G04-27 | A SAP response with `to_return` Type E and an empty Salesdocument counts as success. order/new then runs the address, setCAccount and pickup steps (sap.log 2026-07-17 17:00:43). | OrderMethods.cs:1890-1905 (deserialize at :1898-1903); skip :1913-1975 | C-01 (code now) |
| R-02 | G06-01 | Magento sends tipo T/P, so FullCancelAsync looks up ZSD_T_/ZSD_P_. **Every cancel** returns `noexiste` (DMZ 400). | OrderMethods.cs:3007-3012; also :117-123, :3180-3185 | C-02: look up ZSD_ZMER_ then ZSD_ZPRE_ (SalesMethods.cs:216-224) |
| R-03 | G06-07 | Magento sends no store, so `DeterminarPlantYOficina` throws. The DMZ answers 200 and Magento marks the RMA as synced: **every return is lost**. | OrderMethods.cs:2190, :366-368 | DEC-06(c): take org, channel and plant from the SD36 original |
| R-04 | G06-02 | Cancelling an undelivered order throws "ZIDSTATUS=03 aun no esta implementada" (DMZ 500). | OrderMethods.cs:3024-3058 (:3046, :3057) | X-03: SAP SD annulment API |
| R-05 | G04-25 / G05-03 | Magento receives `{BP, SalesDocument, Message, Resultado=null}` or 200 "Error, ...". LAN returned bare strings. | OrderController.cs:26-47; DMZ OrdersController.cs:214-227 | DEC-02 (C or A, plus D) |
| R-06 | G04-11 | The price is silently raised to an **arbitrary** SD29 row (any org, condition or branch). precioEspecial is ignored. | OrderMethods.cs:1995-2050 (:2014); FinalListProperMethods.cs:82-85 | DEC-04 price A |
| R-07 | G04-28 | Cash orders are booked with the article's 12-month credit term (`12 M VIU PP`). | OrderMethods.cs:2255-2277 | DEC-05 A |
| R-08 | G04-13 | The region rewrite reads `estado`, so phone SKUs become `-RJ`. | OrderMethods.cs:1828, :2116-2181 | DEC-04 region A (remove) |
| R-09 | G04-12 | Paid orders are rejected with 200 "Error" on low DIM11 stock **or on any exception**. | OrderMethods.cs:1835-1839, :2103-2107 | DEC-04 stock B (remove/log) |
| R-10 | G04-01 / G14-14 | Paid card orders are parked in SQLite and **never** reach SAP (example: 1000054321). | OrderMethods.cs:1777-1786 | DEC-03 (c) now: do not route openpay_cards; then (a) |
| R-11 | G04-03 | A guest Paynet order fails with "VIU contado requiere cuenta" **after** its SQLite row was written. | OrderMethods.cs:2618-2624 vs :1788-1792 | DEC-03: resolve like banktransfer |
| R-12 | G01-01 / G04-07 | A new BP is created on every setCustomer call and on every order with an empty cuenta. | BusinessPartnerMethods.cs:435; OrderMethods.cs:2603-2634, :1845 | DEC-01 (a/b); S5 |
| R-13 | G01-03 | On a BP01 exception the DMZ answers Magento 200 with the text "WebException...", which Magento may store as the account. | BusinessPartnerController.cs:62-65; DMZ Curl.cs:130-139 | DEC-18 A: return InternalServerError |
| R-14 | G01-07 | setCustomerList likely skips customers silently when the email case differs (BPs are now stored in uppercase), while the DMZ still says "Correcto". The OData `eq` case behavior is unverified until P-15. | CustomerMethods.cs:82-83 | DEC-17 A, after P-15 |
| R-15 | G08-01 | GetAccountDebts returns raw EX01 rows. ApplyPaymentAdvanced then fails on `int.Parse(debt["CanalVenta"])`. | AbonosController.cs:18-32 (:26) | DEC-09 C now (DMZ :146 back to LAN), then A |
| R-16 | G11-06 / G11-07 | getClienteFactura returns an array, so DMZ JObject.Parse gives 500. It ignores `cliente`, so any invoice number returns installments. | AbonosController.cs:34-47; AbonoMethods.cs:68; DMZ CreditController.cs:58 | C-12 now; DEC-10 (interim: DMZ :51 back to LAN) |
| R-17 | G11-21 | GetCreditAmounts reads a SQLite cache nothing fills, so **every call is 500**. | CredilanaMethods.cs:25-28; CreditController.cs:138-143 | DEC-21 A: DMZ :352 back to LAN |
| R-18 | G03-01 / G03-07 | wallet/details picks the first SD18 contract (ignores uen). Accented text arrives garbled. | WalletCustomerController.cs:26-34, :50 | C-23 now; DEC-11 |
| R-19 | G03-08 / J3-05 | getMinimumCostToRedeem uses `+=` onto the request value and has no per-family rule. Worked example: 1400 vs LAN 600. | WalletMethods.cs:226, :231, :131-151 | C-31 + J3-05 (C09 option A) |
| R-20 | G02-07 | recuperarcuenta: an injectable OData filter can disclose BP numbers. | ProspectoController.cs:47 | C-07 |
| R-21 | G06-13 | DMZ GetPickUpCode reads LAN, while order/new writes new pickup codes to SIGMAVI. | DMZ OrdersController.cs:262 | P-01: copy open codes and switch reader and writers together |

### 4.2 Latent risks that fire when the next piece is switched on

| # | Gap | Risk | Where | Fix |
|---|---|---|---|---|
| R-22 | G10-22 / G10-10 | Once Magento sends BP accounts, the LAN gate returns is_client_valid=false and Magento rejects **every** BP credit order (SaveOrder.php:42-49). | DMZ CreditController.cs:289-299 (route missing in SS) | C-04: new SS route (interim is_client_valid rule until DEC-07); switch the DMZ :296 before or with the Magento BP release |
| R-23 | G14-24 / T1a | The liberador callback sends snake_case keys. The DMZ binds only `status`, so Magento gets entityId null. | OrderMethods.cs:1257-1263 | C-03: `new { entityId, status, cuenta, idSolicitud }` |
| R-24 | G05-01 / G14-22 | The liberador trigger is commented out and does not compile. Credit applications are never analysed. | OrderMethods.cs:673-707 | X-01 DU11, then DEC-08 (Task.Run) |
| R-25 | G05-02 | A post-authorization resend writes a second credit header and lines. | OrderMethods.cs:1760-1772 | DEC-08 T2c-B |
| R-26 | G05-20 / G05-23 | creditStatus and updateCreditOrderId are missing. | — (DMZ :467 to LAN) | DEC-32 / X-05; X-02 DU20 |
| R-27 | G10-02 | The getSms PATCH has no `sap-client=110`, so it returns -1 whenever the gateway default client differs. | BusinessPartnerMethods.cs:786-787 | C-05 |
| R-28 | G7-19 | Customers born before 1970 can never log in (regex drops the minus sign). | CustomerServiceMethods.cs:282 | C-06 |
| R-29 | G14-43 | createStorepickupCode sends `products: []`. Magento rejects it, and SS still reports success. | StorePickupMethods.cs:430, :435, :446 | C-08 |
| R-30 | G04-23 | The delivery address is never linked, because PurchNoS is empty in real responses. | OrderMethods.cs:1510 | C-19 |
| R-31 | G04-19 | RegisterPickupClientInfo is a console-only stub with the wrong index. Only banktransfer orders get a BpRecogePedidos row. | OrderMethods.cs:1572-1590, :1931 | C-11 |
| R-32 | G15-01 / G15-09 | The export publishes articles without images when SIGMavi fails, and an error looks like an empty catalog. | EcommerceMethods.cs:623-627, :641-645, :1377-1381 | C-13, C-14 |
| R-33 | G15-38 | A SKU discontinued in SAP is omitted from the export, so Magento keeps selling it (LAN sends product_online=2, qty 0). | EcommerceMethods.cs (no last-export state) | DEC-14 (G15-38 option A) |
| R-34 | J6-10 | The family exclusions fail open, so excluded products get published. | ProductMethods.cs:509-512 | J6-10 rethrow |
| R-35 | G14-29 / G14-35 | The catalog, price and stock push jobs have no replacement. | — | Keep LAN until Dev 2 Sprint 9 (X-08, RC-16) |

### 4.3 Cross-cutting go-live risks

| # | Risk | Where | Fix |
|---|---|---|---|
| R-36 | Test passthroughs post raw payloads to SAP: `partner/testnew` and `order/testnew` | BusinessPartnerController.cs:131-146; OrderController.cs:50-70 | Recommendation: delete both (J1-01/J1-02). Deleting either is an open user question (GUIA_MIGRACION_FABLE.md:548 covers both routes), so neither goes into the Fable batch until the user answers |
| R-37 | Neko stubs answer Success=true and record nothing | AbonosController.cs:51-84; AbonoMethods.cs:95-108 | Delete or return 501 (J1-03); never bridge |
| R-38 | PII dump of every SD36 response to a developer path | SalesMethods.cs:200 | C-25 / J6-01 |
| R-39 | Every SAP call is hard-wired to DEV / client 110; SAP_STAGE is dead | 68 + 69 literals; Web.config:34 | J1-13/J7-11: one config-driven helper; J7-M5 deletes SAP_STAGE |
| R-40 | Certificate validation is off; TLS 1.0/1.1 enabled | Curl.cs:33-38; TokenGenerator.cs:121; OrderMethods.cs:1224-1229, :1315-1320; RequestMethods.cs:13-38 | J6-03 / J7-12 |
| R-41 | Secrets committed in Web.config and MailHelper | Web.config:13-15, 31, 36-41, 80, 85; MailHelper.cs:113-117 | J1-20 / J7-21: move out, rotate |
| R-42 | Error paths log to Console only, so nothing reaches `Logs/sap.log` | 86 Console vs 21 Logger.SAP in OrderMethods | J2-31 / J1-M06 |

### 4.4 The 29 critical gaps and where each is handled

Source: `critical_gaps` in the consolidation input (29 of the 376 verified gaps). Every one is tracked below; the seven that were only covered indirectly before (G05-32, G08-02, G08-03, G08-11, G08-14, G08-16, G11-02) now have their own row.

| Gap | Need | Process | Where it is handled |
|---|---|---|---|
| G01-01 | DECISION | setCustomer: find and reuse the existing customer | R-12; DEC-01; §6.5; Wave 4a (S5) |
| G04-01 | DECISION | setOrder openpay_cards never reach SAP | R-10; DEC-03; §6.1 |
| G04-11 | DECISION | Booked price and price validation | R-06; DEC-04; §6.1 |
| G04-25 | DECISION | setOrder response contract | R-05; DEC-02; §6.2 |
| G04-27 | CODE | Only a created order counts as success | R-01; C-01 (Wave 0) |
| G05-01 | EXTERNAL | Liberador trigger after the credit header and lines | R-24; X-01 (DU11); DEC-08 |
| G05-20 | EXTERNAL | creditStatus rules | R-26; X-05; DEC-32 |
| G05-23 | EXTERNAL | updateCreditOrderId | R-26; X-02 (DU20) |
| G05-32 | EXTERNAL | authorizationResult callback runs after the liberador | Same dependency as G05-01 (DU11, then T1b). C-03 fixes only the payload keys and does not close it |
| G06-01 | CODE | Cancel lookup ignores tipo | R-02; C-02 (Wave 0) |
| G06-02 | EXTERNAL | Cancel an undelivered order | R-04; X-03 |
| G06-07 | DECISION | Return takes org, branch and channel of the original sale | R-03; DEC-06 |
| G08-01 | DECISION | GetAccountDebts response contract | R-15; DEC-09 |
| G08-02 | DATA | Debts grouped by legacy CanalVenta (3/76/77/78/7/79) | P-10 (Vkorg/Vtweg → CanalVenta map, R8-11); then code in AbonoMethods after DEC-09 A |
| G08-03 | EXTERNAL | Per-invoice installment data (Abono, LiquidaCon, PagoPuntual, Moratorios) | X-07 (EX01↔TZ01 link and field meanings, R8-21); then code after DEC-09 A |
| G08-11 | EXTERNAL | Persist the BBVA payment intent | X-06 (write OData, or R8-08 B local table); then an SS ApplyPaymentAdvanced route |
| G08-14 | EXTERNAL | Idempotent payment confirmation | X-06 (ABAP update operation, or R8-09 B); decide with R8-08 |
| G08-16 | EXTERNAL | Persist the STP payment intent | X-06 (same write target as G08-11); then an SS GetSTPAccount route |
| G10-10 | CODE | Checkout gate route with LAN's 6 keys | R-22; C-04 (Wave 0) |
| G10-22 | CODE | Credit order only for a valid client | R-22; C-04 interim rule; DEC-07 final rule |
| G11-02 | EXTERNAL | getClienteSaldo header amounts | X-07 (N1/N2 captures; N4-N6 sources, R9-06) |
| G11-06 | DECISION | getClienteFactura response contract | R-16; DEC-10 |
| G11-21 | DECISION | GetCreditAmounts cache never filled | R-17; DEC-21 |
| G14-14 | DECISION | checkOpenpay: create paid card orders | R-10; DEC-03 |
| G14-15 | CODE | checkOpenpay job steps | §6.1 (only if DEC-03 = a) |
| G14-22 | EXTERNAL | Liberador accepts the BP, auth, idempotency | R-24; X-01 (DU11) |
| G14-24 | CODE | Callback payload keys | R-23; C-03 (Wave 0) |
| G14-29 | EXTERNAL | Catalog export and push for all three stores | R-35; X-08; RC-16 |
| G14-35 | EXTERNAL | Stock per source pushed to Magento | R-35; X-08; RC-16 |

The parity critic's items (3 missing processes: the product-export routes, generateNewStorepickupCode and MovBita; 6 inconsistencies: Neko, authorizationResult, validateCredit, pickup codes, product import and the agent lookup) are all resolved in [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §1.1.

## 5. What we need now

### 5.1 Code we can write now (no decision needed), by priority

Full table: [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §4.1. Fable/Claude write on `\\172.16.214.58\sap`; the user compiles and commits one change per commit.

| Priority | ids | Summary |
|---|---|---|
| P0 critical | C-01 (G04-27), C-02 (G06-01), C-03 (T1a), C-04 (G10-10/22) | SAP E means failure; cancel lookup; callback keys; checkout gate route (with the interim is_client_valid = existing non-prospect BP until DEC-07; DEC-07 refines the rule later, it does not block the route) |
| P1 high | C-05 (G10-02), C-06 (G7-19), C-07 (G02-06/07), C-08/C-09/C-10 (pickup status, phone, POST), C-11 (G04-19), C-12 (G11-07/26), C-13/C-14 (export fail-closed), C-15 (G15-06 prices), C-16 (GetIntelisisStatuses), C-17 (nombreCliente), C-18 (login email row) | Defects with no decision, plus two missing in-scope routes |
| P2 medium | C-19..C-30 | order/new address, BP ZidMagento and Sntz; wallet JSON; wholesale not-found; obtenerCreditos dump, sort and rethrow; catalog no-retry Curl; pickup email; etiquetas filter; liberador logging |
| P3 low | C-31..C-37 | redeem clamp and reset; pickup try split; SD48 swallow; SendSmsNewNumber `idRef=="0"`; getPlazos condition; delivery phone; OData escaping |
| Cleanup (zero behavior change) | the DELETE batch in §7.2, groups a-d, except the two test routes (user answers GUIA:548) and J3-17 (user's §23 file) | Neko stubs, Fakes, dead methods and models, commented blocks |

### 5.2 Decisions for the user (ids from [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §4.2)

| Order | DEC | Impact | Question | Recommendation |
|---|---|---|---|---|
| 1 | DEC-01 | critical | setCustomer create-or-reuse (CQ2, CQ3; step 0 D-15) | (a) return the existing BP, or (b) partial update without the address wipe; the highest Partner wins; only "No se encontraron clientes" leads to a create |
| 2 | DEC-02 | critical | setOrder response contract (R7a-1/RC-11, P12) | C (LAN bare string) or A, plus D (Magento reads Resultado); C-01 is needed in every case |
| 3 | DEC-04 | critical | Price, stock gate, region rewrite (R7a-4/6/7, D-34) | price A; stock B (remove); region A (remove) |
| 4 | DEC-05 | high | Cash payment term (G04-28) | A: always the cash term; cuotas > 1 maps to an MSI term named by SAP SD |
| 5 | DEC-03 | critical | Openpay cards and Paynet (D-38) | (c) now: do not route openpay_cards; then (a); Paynet resolves like banktransfer |
| 6 | DEC-06 | critical/high | Cancel and return policy (D-35/D-36) | Annul only for T, return flow for P; return org from SD36; keep the payment condition; per-item 'R' filter; RMA id in a Z text |
| 7 | DEC-07 | high | Credit gate eligibility (D-48a/b/c) | A, with B (existing non-Prospecto BP) as the interim; is_first_purchase=false |
| 8 | DEC-18 | high | storeCode map and exception contract (CQ5, RC-12) | Case-insensitive 3-code map; unknown non-empty value fails; exception → InternalServerError |
| 9 | DEC-17 | high | setCustomerList case (CQ14) | A: try as sent, then ToUpperInvariant, with Trim (after P-15 confirms the case behavior) |
| 10 | DEC-09 | critical | GetAccountDebts contract (D-43) | C now (back to LAN), then A (LAN shape) |
| 11 | DEC-10 | critical | getClienteFactura contract (D-52) | ServicioSAP builds LAN's object; interim back to LAN |
| 12 | DEC-11 | high | Wallet details and redeem minimum (D-28/D-29) | Filter by uen; port the per-family algorithm; fail closed on the channel |
| 13 | DEC-14 + DEC-15 | high | Catalog and job ownership (RC-16), LAN reference branch (D-54/D-07) | Keep LAN until Sprint 9, then the importer calls SS with a shared data.db; Production is the reference |
| 14 | DEC-16 + DEC-24 | high | Pickup routes, inbound setOrderStatus (RC-15, R7-1) | Decide after infra's IIS logs; LAN contract if kept; status sync as a separate package |
| 15 | DEC-08 | high | Liberador trigger and resend guard (D-37, T2c) | Success path only, cuentaBp, exclude Prospecto, Task.Run; T2c-B |
| 16 | DEC-12 | medium/high | Logins and validarCliente policies (D-40, R8-01..04) | Not-found → false, otherwise 500; Ok(false) on empty input; DU13 names; exact date |
| 17 | DEC-20 | high | getSms when the PATCH fails (D-47) | B: try/catch and continue |
| 18 | DEC-21 | critical | GetCreditAmounts scope (D-49) | A: Credilana, so revert DMZ :352 |
| 19 | DEC-22 | high | APERTURA / ProductosMX / mercancía (R9-10, R9-15) | APERTURA = Credilana; ProductosMX deferred to Feb-Mar 2027; tell Dev 3 |
| 20 | DEC-23 | high | Complaint log SP_ACTES_REGISTRO | A now, B before Intelisis is switched off |
| 21 | DEC-26 | high | Pending applications in "my credits" | A (merge CRED_SOLICITUD_WEB_DATOS_TEMP rows) |
| 22 | DEC-27 | high | Openpay installment payments | Find the consumer first, then B |
| 23 | DEC-32 | critical | creditStatus source (Q-T2-1) | E (MovBita) only if the credit area confirms; otherwise C or D after DU11 |
| 24 | DEC-13, DEC-19, DEC-25, DEC-28, DEC-29, DEC-31, DEC-33, DEC-34 | medium | Prospecto scope; coupon; agent source; customerService sources; credit details; getCuenta/setCuenta; export store scope; small customer items | As in the parity report |
| 25 | DEC-30 | low | Retirement batch | Retire after 30 days of IIS logs (RC-15) |

### 5.3 Other teams ([[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §4.3)

Teams are named by role here; the parity report has the contact names.

| Priority | ids | Who | What |
|---|---|---|---|
| critical | X-01 | Liberador team | Liberador contract DU11: 10-digit BP, auth, idempotency, idVenta, PurchNoC |
| critical | X-02, X-03 | SAP SD | ZIdEcommerce OData (DU20); annulment API ZIDSTATUS=03; paid vs unpaid state |
| critical | X-05 | Credit area + liberador team + Dev 2 | Source of the credit decision (incl. MovBita vocabulary) |
| critical | X-06, X-07 | Dev 4 + ABAP/FI + FI functional owner | BBVA/STP write and update targets; N1-N6 balance sources |
| critical | X-08 | Dev 2 Sprint 9 + importer + Dev 3 | Product, configurable, price and stock push jobs; VIU/MAVI exports |
| high | X-04, X-09..X-13, X-15, X-16, X-19, X-22 | SAP SD/FI/ABAP, Magento/Omnipro, SMS ops, Infra, SAP code-master | Freight/installments; SD18 key; Zidstatus catalog; SD09 capture; shipment status; wallet unification; idMagento capture and gate timing; SMS rows; 30 days of IIS logs; RFC annexes |
| medium/low | X-14, X-17, X-18, X-20, X-21, X-23..X-25 | MAVI, BP API owner, SIGMavi DBA, wallet team, Dev 3, business, Ventas Mayoreo | Guest BP and agent; 10-digit phone; sp_helptext; wallet API; DM0415; TELEFONIA swap; wholesale design; ZSDT_CTE rows |

### 5.4 Data and config (the user runs every query)

| Priority | ids | What |
|---|---|---|
| critical | P-15, P-10 | Read-only BP05 tests (ZidMagento filter; Mail case); the Vkorg/Vtweg → legacy CanalVenta map |
| high | P-01, P-03, P-06 | Copy open pickup codes to BpRecogePedidos; owner for mavi_credilana_info; Openpay keys and RECHAZAOPENPAY |
| medium | P-02, P-05, P-07, P-08, P-11, P-12, P-13, P-16, P-17, P-18 | servicio_guias; coupons; ignoreAttributes/SQLite schema; image paths; AWS VALOR1..4; image tables; SIGMAVI Hazten tables; sp_helptext; TelefonoValidado capture; compound-name BPs |
| low | P-04, P-09, P-14 | CondicionesCredVtaLinea rows; `<site>\Logs`; BP with no birth date |

## 6. Improvements per method to stay close to LAN

How to read the tables:
- Type: **CODE** = can be coded now; **DEC** = needs a decision; **DEL** = delete; **REPL** = replace, keeping the behavior.
- Impact: crit / high / med / low.
- Line numbers are those of the current working copy.
- Items that are identical across areas A1, A2 and A3 are merged, and their refs are combined.

### 6.1 Methods/Order/OrderMethods.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| SetOrderAsync post-SAP (1736-1993) · LAN SetPedido :533-733 | G04-27 | CODE | crit | After deserializing (~:1898-1903): empty Salesdocument or any to_return E/A → Resultado "Error" with the E messages; skip :1913-1975 |
| ″ | G05-02 | DEC | high | T2c-B: a non-CRED incrementId with an existing CRED_SOLICITUD row 'CRED'+idCarrito → PedidoExistente (after DU11) |
| ″ | J2-09 | REPL | med | Use infoCliente.codigoPostal at :1828 (not sDatosPedido[20]) and infoCliente.correo at :1931; delete the write-only [35] at :1857; drop sDatosPedido later |
| ″ | G04-22 | DEC | low | Move SaveGuideAsync (:1851) before the price, stock and partner steps (:1832) |
| ″ | J2-M01 | DEL | low | esDevolucion is always false; `docType = orderRequest.docType ?? "ZMER"` (:1760-1761) |
| ″ | J2-M02 | REPL | low | Comment at :1940 → "generar monedero (afectación SAP pendiente, D-12)" |
| ″ | J2-22 | REPL | low | Extract PostSalesOrderAsync for the copy-pasted ZAPI_SALESORDER_SRV block (:1863-1886); reuse at :1686-1709 after J2-19 |
| Openpay early exit (471-496, 1777-1786) · LAN OpenpayMethods :70-167, :271-305 | G04-01, G06-19, J2-18, G14-14 | DEC | crit | D-38: (c) now, keep openpay_cards off order/new; later (a) a liberado flag plus the ported CheckStatus |
| ″ | G14-15 | CODE | crit | If (a): POST order/checkOpenpay reading openpay_orders, per-store MID/KEY, checked > 4, incomplete callback through OrderStatusMethods, real is_in_intelisis; do not port the unreachable SetCAccount branch (LAN :277) |
| ″ | G14-18 | DEC | high | Expired Paynet references: A port CheckStoresStatus once the SAP cancel API exists; B create on payment; C merge with ManagePaynetOrders |
| ValidarPreciosConProperlistAsync (1995-2054) · LAN :368-395, SP_eCommerceNuevoPed :184-217 | G04-11, J2-11 | DEC | crit | R7a-4 A: book precioEspecial; skip when forzarOrder='1'; compare against the SD29 row for the order's SalesOrg and condition, not FirstOrDefault (:2014) |
| BuildSapOrderAsync (2211-2565) · LAN crearPedido :1132-1238 | G04-28 | DEC | high | Non-credit orders use the cash term (ACEF MA; VIU code from SAP SD); cuotas > 1 → MSI (:2255-2277) |
| ″ | J2-32 | DEC | high | SAP/ABAP: how costoEnvio and cuotas travel in ZAPI_SALESORDER_SRV; then add them |
| ″ | J2-24 | DEC | med | Replace test literals ('Tadeo' in 5 fields :2326, :2342…; Bstkd_e 'Tipo123456'; Ihrez_e 'Clave123'; Zliberado '1234') with values agreed with SAP |
| ″ | J2-27 | REPL | low | For returns, keep order.pmnttrms; pass fallbackDefault "" so the unknown-condition throw (:2272-2275) can fire |
| ″ | G04-15 | DEC | low | Ask SAP SD which field holds Venta.Referencia; maybe Zreferencia = origen (:2338) |
| ″ | J2-08 | DEL | low | Commented SD40 validation (~:2279-2315); record it in the runbook if still open |
| ProcesarDevolucionSAPAsync + BuilAdapterReturn (1623-1734, 2185-2209) · LAN ServiceOrderMethods :76-430 | G06-07 | DEC | crit | Copy SalesOrganization, DistributionChannel, Division and Plant from the SD36 original; add overrides; skip the store check (:366-368) for returns |
| ″ | G06-08 | DEC | high | Do not map motivoDevolucion into condicion (:2204); keep docOriginal.PaymentCondition (:1654); reason only in Zdescrextra/ZOBS |
| ″ | G06-09 | DEC | high | Resolution gate: B, a per-item 'R' filter (recommended); if no items remain, answer 200 "Concluido" |
| ″ | J2-M04 | REPL | med | Error when a returned SKU is not in the original (:1659-1674) instead of dropping it silently (:2453-2454) |
| ″ | G06-11 | DEC | med | Ask after-sales whether the per-unit service report is still needed in SAP |
| ″ | G06-22 | DEC | low | Carry rma_item_id in a Z field or text; check that duplicate PurchNoC values are allowed |
| ″ | J2-27 | DEL | low | Unused subTotal/total recalculation (:1676-1678) |
| FullCancelAsync (3002-3107) · LAN cancelamagento :1385-1422, :1613 | G06-01 | CODE | crit | T/P is the total/partial flag; look up ZSD_ZMER_ then ZSD_ZPRE_ (:3007-3012); same in CancelInvoiceAsync :117-123 |
| ″ | G06-03 | DEC | high | D-35 C: P never annuls (return flow); T keeps SD48+SD46 (:3060-3097) |
| ″ | G06-04 | DEC | med | Keep `noexiste` after G06-01, plus a transition rule for pre-cutover or never-in-SAP orders |
| ″ | G06-05 | CODE | low | Swallow the SD48 error only when the invoice is already cancelled (:3079-3084) |
| ResolvePartnerNumberForOrderAsync et al. (2576-2640) · LAN :429-432, :1136, :1228 | G04-03 | DEC | high | openpay_stores resolves like banktransfer instead of throwing (:2618-2624) |
| ″ | G04-07 | DEC | high | CX-07: look up an existing BP by ZidMagento/email before BP01 (:1845); Magento always sends cuenta |
| ″ | J2-M06 | DEL | low | Redundant 'cliente' branch (:2603-2605) and the unused tipo parameter |
| BuildBpClientFromOrder (2659-2981) · LAN sntz, SP_eCommerceCtenuevo :157/:186 | G04-08 | CODE | med | Apply Sntz to the 12 fields; digits only for TelNumber, TelnrLong, ZtelCte |
| ″ | G04-29 | CODE | med | ZidMagento (:2826) = idMagento > 0 ? idMagento : int.TryParse(cliente) |
| ″ | J2-24, J7-M3, J7-08 | DEC | med | Region = CatalogoEstados.ObtenerClave3(estado), fallback "JAL" (:2715; also :1481); Altkn '1234567890' (:2744) from SAP; GuestCashPartnerNumber (:41) to Web.config |
| ″ | J2-25 | DEC | low | Merge with BuildClientFromCustomerRequest into one BuildClient(ClientInput) |
| ″ | G04-09 | DEC | low | CQ1-consistent uppercase names and email (:2663-2667, :2727) |
| CallMagentoAuthorizationCallbackAsync (1183-1291) · LAN :1751-1831 | G05-30, J2-06, G14-24 | CODE | crit | Payload `{ entityId, status, cuenta, idSolicitud }` (:1257-1263), preferably through Curl.PostAsync |
| ″ | G05-31, J2-M07 | CODE | med | No accept-any-certificate handler (:1223-1231); log attempts plus a final DEFINITIVO line with Logger.SAP (:1250, :1273, :1282) |
| ″ | J7-12 | CODE | med | Remove `Tls11 \| Tls` at :1226-1229 and :1317-1320 |
| ″ | G05-31 | DEC | med | D-33: keep the empty-credentials fallback as a DU, or throw like LAN |
| ProcessCreditPaymentAsync (634-735) · LAN :612-649, CreditMethods :126-241 | G05-50 | DEC | med | LIM-1: LAN parity now (credit limit not enforced); record it in the user's words |
| ″ | G05-09 | DEC | low | TQ-3 phone format and SMS number; accept the whitespace difference (G3-08) |
| ″ | J2-07, G14-23, G14-25 | DEC→REPL | high | Replace the non-compiling block (:673-707) with Task.Run(LiberarCliente + callback, RECHAZADO on catch) using cuentaBp, after DU11/D-37 |
| CrearSolicitudCreditoAsync (737-805) | G05-04 | DEC | med | GATE-1 A: copy LAN's no-row gates (:647-650, :746-751, :766, :779) |
| InsertCreditArticlesAsync + ObtenerPreciosCreditoAsync (807-1007) · LAN SpVTASInsertArtSolCreditoLinea | G05-05 | DEC | med | P7/P8b: one line per SKU if history has no duplicates (user runs the GROUP BY) |
| ″ | J2-M03 | DEC | med | With J2-10: one shared region helper, or drop the unused codigoPostal parameter (:807) |
| ″ | G05-51 | DEC | low | Ratify the E5 SD29 selection (:914-916, :1000-1002) as a DU |
| ″ | G05-07 | DEC | low | Keep decimal for SEGU00001 (:883-887) as a DU |
| ″ | G12-13 | CODE | med | For ProductosMX: a reusable entry without OrderRequest; strip '/cliente' before int.Parse |
| DatosEntregaInsertAsync (1415-1548) · LAN :678-687, :922-933 | G04-23 | CODE | med | `to_result?.Salesdocument ?? PurchNoS` at :1510 |
| ″ | G04-24 | CODE | low | ValidateOnlyNumbers(telefono) (~:1490) |
| ″ | G04-24 | DEC | low | SAP SD names the receiver-name field (today AdditionalStreetSuffixName :1484) |
| ″ | G04-21 | DEC | low | Keep skipping instore_pickup (:1419) as a DU |
| RegisterPickupClientInfo (1572-1590) · LAN setNameToReference :657-660, :1273-1317 | G04-19, G06-23, J2-13 | CODE | high | INSERT BpRecogePedidos (Nombre, Correo, digits-only Telefono, ClaveVenta '') when missing; pass the email (J2-09) |
| CallSetCAccountCallbackAsync (1293-1364) | J2-15 | DEC | med | Should SS call setCAccount at all? LAN effectively never does. At minimum skip the guest BP 1500003857 |
| ″ | J2-14, J7-26 | REPL/DEC | low/med | Use MagentoOrderMethods.SetCAccountAsync + Curl and delete the hand-rolled login/retry; or delete MagentoOrderMethods if J2-15 drops it |
| ValidarStockArticulosAsync (2056-2114) · LAN: none | G04-12, J2-12 | DEC | high | R7a-6 B: remove the gate or log only; never reject on an infrastructure exception (:2103-2107) |
| ValidarRegionCelulares (2116-2183) · LAN SpVTASeCommerceDetPedidos :16-133 | G04-13, J2-10 | DEC | high | R7a-7 A: remove from the cash path; if kept, reimplement LAN's rule as one helper shared with credit |
| ValidarPedidoExistenteSAPAsync (453-469) | J2-33, J1-M06 | DEC/REPL | med | Logger.SAP; fail closed (rethrow or 'ValidacionNoDisponible') instead of returning false |
| GetCondicionAsync (3355-3388) | J2-M05 | DEC | med | User runs `SELECT DISTINCT Condicion`; if descriptions come back, wrap with PaymentConditionCatalog.GetSapPaymentCode and reject empty |
| HandlePromoCodeAsync + GenerarCodigoCuponAsync (1009-1181) | J2-30 | DEC | low | Point order/validatecupon at CreditMethods.CodigoPromocionAsync or drop it (D-45); then delete both |
| CancelInvoiceAsync + CancelBillingDocumentAsync (115-197) | J2-21 | DEC | low | Drop order/cancelInvoice, or extract ResolvePurchNoC including the G06-01 fix |
| GenerarMonederoSAPAsync (1396-1413) | J2-13 | DEC | med | Keep it as an explicit pending item; log with Logger.SAP |
| TestSetOrderAsync (1592-1621) | J2-19, J1-02, J7-05 | DEL | med | Delete it, together with OrderController testnew (:50-70), once the user answers GUIA:548 (recommendation: delete) |
| ReverseGoodsIssueAsync(OrderRMA) (3176-3249) | J2-20 | DEL | low | No callers |
| Dead helpers and constants | J2-01, J2-02, J2-03, J2-04, J2-26 | DEL | low | afectar (:1550-1570; record D-12 in the runbook); LogOrderCreatedInSap; ValidarOrdenCompleta + ValidateOrderRequest; TotalArticulos, ObtenerTotalDescuentos, SepararDatos, EscapeSapFilterValue; unused constants (use CREDIT_METHOD etc.; re-check PaymentTermsContado against G04-28) |
| File-wide URLs and logging | J2-23 | DEC | med | One config-driven SAP URL/client helper (9 DEV and 14 client-110 literals here, 69 solution-wide); `sap-language=ES` |
| ″ | J2-31, J1-M06 | REPL | med | Errors to Logger.SAP (:462, :490, :519, :551, :728, :974, :1541, :1982, :3083, :3094); delete trace noise (closes COMPARATIVA D-20) |

### 6.2 Controllers/OrderController.cs

| Method (lines) | Refs | Type | Imp | Change |
|---|---|---|---|---|
| SetOrder (16-48) | G04-25 | DEC | crit | R7a-1/RC-11 with the Magento owner: C or A, plus D; do not touch DMZ status codes first |
| ″ | G05-03 | DEC | high | Credit branch: return the BP string with LAN's codes (A) or C; decide with G04-25 |
| CreateStorepickupCode (244-265) | G15-30 | CODE | high | Accept POST (or both verbs) before the caller switches |
| ″ | J1-10, G14-04, G15-34 | DEC | high | LAN contract: POST, "ok", 400 on exception, NotFound on null id; log the clave instead of returning it |
| GenerateNewStorepickupCode (224-243) | J1-M07, G14-11, G15-25 | DEC | med | If kept: Ok(code), the literal on update failure, 500 on exception; if retired, delete with GenerateNewCodeAndNotifyAsync |
| TestSetOrder (50-70) | J2-19, J1-02, J7-05 | DEL | med | Delete once the user answers GUIA:548 (recommendation: delete) |
| CancelInvoice, ValidateCupon, CheckDocumentExistsSD36, GetCondicion (102-140, 176-195, 292-313) | J1-05, J1-06 | DEC | low | Diagnostic-route policy; keep cancelInvoice only if an ops tool uses it |
| MISSING order/getIntelisisStatuses · LAN :302-335 | G06-16 | CODE | high | `{Data:[IdEcommerce, Status, SucursalOrigen, Importe, ReferenciaOrdenCompra, Agente]}` from SD36, delivery and billing; CONCLUIDO/CANCELADO; the user picks the SucursalOrigen equivalent |
| MISSING order/InsertPaymentData · LAN :190-210 | G06-15 | DEC | high | R7d-3: find the consumer; A keep on LAN, B SIGMAVI staging + applier, C FI-CA OData |
| MISSING order/updateCreditOrderId · LAN :1998-2061 | G05-24, G05-25 | DEC | med/low | {success:false} 500 only if Magento handles it; target ZIdEcommerce only |
| MISSING order/validateCredit | G05-40 | DEC | low | Retire it; notify Dev 2 (Magento) (ACT-35) |
| MISSING getOrderId, getOrderInfoAndSet | G14-12, G14-13 | DEC | med | Reconfirm the retirement (Provider.cs:112-113 also reads eCommerceDetPedidos); getOrderInfoAndSet A, retire unless the setOrder response decision (RC-11) leaves failed orders with no retry |

### 6.3 Controllers/CreditController.cs, new or missing routes (logic in Methods/Credit/CreditMethods.cs)

| Route · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| GetPhoneValidatedClientSecretName · LAN CreditMethods :1783-1965 | G10-10, G10-22 | CODE | crit | {Cliente, Uen} → LAN's 6 keys; masked ZB_DATOS_CLIENTE names; masked GetTelefonoValidadoAsync phone; interim is_client_valid = existing non-prospect BP; switch DMZ :296 before or with the Magento BP release |
| ″ | G10-11, G10-12, G10-13 | DEC | high/high/low | D-48a employee source (SAP names the field); D-48b channel 3/76/7, CREDITO MENUDEO, ALTA; D-48c is_first_purchase=false. These refine the interim rule later (DEC-07) |
| MonederoSaldoCredito · LAN :1603-1633 | G11-13, G11-14 | DEC → CODE | high | SD18 filtered by the UEN's Vkorg (SAP SD confirms Zsaldo); then the route; confirm LAN's no-wallet value |
| Wallet unification (3 routes) · LAN :1654-1777 | G11-17, G11-16, G11-20 | DEC → CODE | high/med | R9-09 category rule (D: CONTADO + CREDITO MENUDEO); status literals; SetUnificationWalletData on SD18 and an open-items source |
| getCreditAccount · LAN :1552-1595 | G10-16, G12-M4 | DEC | med | Scope first (Credilana = OOS); if in scope, BP05MA prospect → client; decide with G12-10 |
| Validar_Lada, ExistRFCAndPhoneCte, codigoRecomendado(+WithUen) | G10-18..G10-21 | DEC | low | Retire with D-50 after the IIS logs |
| ProductosMX FormDatos, SaveFirstData, SaveData_Articulos | G12-09, G12-05, G12-01, G12-10, G12-M1 | DEC | high/med | Defer to Feb-Mar 2027 (tell Dev 3, M-01); the prospect is an SAP BP 'Prospecto' (keeps ValidacionTelefono parity) |
| ″ | G12-11, G12-06, G12-07, G12-02, G12-12, G12-14 | CODE (after decision) | high→low | 76-field mapper with LAN indexes; SaveFirstData ops as parameterized SQL; SD29 price when Importe=0; FormDatos ops; 3 references; burn the coupon after Insert |
| APERTURA CreditoWeb_SaveData (+GeLeyendaCatDimas) | G12-16, G12-17, G12-M3 | DEC (CODE only if B) | high/low | Recommended A: Credilana, stays on LAN |
| SaveHaztenTransaction · LAN :2299-2469 | G12-18, G12-21, G12-20, G12-M2 | DEC → CODE | med/low | Tie to G12-09/G12-16; parameterized insert; coordinates write made idempotent (user accepts the fix) |
| GetCreditAmounts (116-153) | G11-21 | DEC | crit | D-49: ask Magento about the caller; A revert DMZ :352; interim CONFIG: SQLITE_DB_PATH to LAN's data.db |

### 6.4 Methods/Abono/AbonoMethods.cs + Controllers/AbonosController.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| GetClienteFactura + GetParcialidadesAsync (C 34-51; M 54-93) · LAN FacturaMethods :106-209 | G11-06, J3-03, J1-09 | DEC | crit | Return LAN's SaldoFactura object via a mapper (needs N4/N6); until then revert DMZ :51 |
| ″ | G11-07 | CODE | high | `and Partner eq '{cliente}'` in the zsplits filter (:68) |
| ″ | G11-08 | CODE | med | Sentinels 'El cliente es incorrecto' / 'No tiene facturas' (after G11-01) |
| ″ | G11-26 | CODE | low | Validate `^[0-9]{10}$` and escape Vbeln and Partner |
| ″ | G11-11, G11-12 | DEC | med/low | Total formula and row-order quirk; N11 error mapping |
| ″ | J3-M02 | REPL | low | Comment :56 → CreditMethods.cs:524 |
| MISSING getClienteSaldo · LAN :104-121 | G11-01, G11-04, G11-05 | DEC → CODE | med/high | BP regex `^[0-9]{10}$` + sentinel; N11 outcomes; route returning a single ClienteSaldo |
| GetAccountDebts + GetDocumentosNoCompensadosAsync (C 18-32; M 19-51) · LAN :776-852, :1541-1620 | G08-01 | DEC | crit | C now (DMZ back to LAN), then A (LAN grouped shape) |
| ″ | J3-04, G7-29, G08-12 | DEC | high | UEN/sociedad filter; CanalVenta keys via the R8-11 map; mov/id_factura for ApplyPaymentAdvanced |
| ″ | G08-05 | CODE | high | Port FiltrarPorFecha (PagoPuntual, ceil payment and total, Vencido) after option A |
| ″ | G08-06, G08-08, G08-09 | DEC | med/med/low | StoreId → SalesOrg (D-42); `Contable ne '1'`; keep 500 as an accepted difference |
| ″ | G08-22 | CODE | low | Escape the client value; a blank client gives an empty result |
| Neko ApplyPaymentIntentNeko / UpdatePaymentStatusNekoAsync (M 95-108; C 51-84) | J3-02, J1-03 | DEL | med | Delete both routes and stubs (or 501); never bridge DMZ :164/:197 |
| ″ | G08-10, G08-13, G08-21 | DEC | med | D-41: retire, keep on LAN until shutdown, mark N/A |
| GetCobrosReferenciadosAsync / GetClabeSTPAsync (110-191) | J3-23, J1-06 | KEEP | — | Building blocks for STP, label "pending consumer" |
| ″ | G08-15, G08-19, G7-34 | DEC | high | R8-10: E2E, then the Zasignado='X' row; validateSTPAccount `{cuenta}` |
| ″ | G08-17 | DEC | low | Drop the SQLite factura_multipago_bbva copy if R8-08 targets SAP |
| ″ | G08-22, J3-M04 | CODE/REPL | low | Escape bp (:120, :160); `using` around CreateClientS4 (:124, :164) |

### 6.5 Methods/BusinessPartner/BusinessPartnerMethods.cs and Controllers/BusinessPartnerController.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| BuildClientFromCustomerRequest + SubmitClientInfoAsync (75-125, 384-735) · LAN SP_eCommerceCtenuevo :45-206 | G01-01, CQ2, CQ3, D-15, D-19, T1.1-03 | DEC | crit | Step 0, then CQ2 a/b, then a SetCustomerAsync orchestrator (lookup → return or update → create only on "No se encontraron clientes") |
| ″ | G01-02, CQ5, D-21 | DEC | high | Case-insensitive storeCode map; unknown non-empty fails; '' → 04 until confirmed |
| ″ | J4-11 | CODE | low | Collapse the storeCode block (407-425) to `if viu`; no behavior change |
| ″ | G01-05 / G01-06 | DEC | low | CQ11 buró flag; accept the BP01 long-name rejection |
| ″ | J4-12 | REPL | low | Comment 427-429 → "Region JAL / City2 empty = accepted DIF (CQ4=B)" |
| TestCreateClientRawAsync (127-166) | J1-01, J4-02, J7-M1 | DEC | low | In the DELETE list, but the verifier downgraded it to DECIDE (GUIA:548 asks the user about both test routes). Recommendation: delete together with partner/testnew; the outdated sync-over-async note at 144-150 goes with it (J4-02: accurate history, only noise). Coordinate with the user's uncommitted edits |
| GetClientMaAsync (266-307) | G7-09, G7-16, G02-12, R8-02 | DEC | med | Typed not-found signal (or null on 404) so callers rethrow everything else |
| ″ | J4-M6 | DEC | low | Remove the client="110" default after the environment decision |
| GetWholesaleCustomerNameAsync (856-882) · LAN :21-45 | G02-12 | CODE | med | Treat NotFound as not found and return "null" (:878) |
| ″ | G02-11 | DEC | med | NameOrg only for organization BPs (never first: NameOrg1 holds the store code) |
| LinkMagentoAccountAsync (779-819) | G10-02 | CODE | high | `?sap-client=110` on the CSRF and PATCH URLs (:786-787) |
| ″ | G7-05 | DEC | low | Keep rejecting id ≤ 0 as an accepted difference |
| EnableBpCombinationAsync (168-213) | J4-03, J1-05 | DEC | low | Delete with EnableChannelOrg and BpCombinationRequest unless an admin tool is wanted |
| GetCustomerSalesChannelsAsync / GetConsultaAnexosAsync | J4-08 | DEC | low | Keep (D-23 diagnostic; SD52 source for STP); escape valorAnexo |
| All call sites | J4-M4 / J4-13, J1-M03 | REPL/DEL | low | `using` per CreateClientS4; remove the unused Newtonsoft.Json.Linq using; the CatalogState using only if J7-08 deletes it |
| Controller CreateClient (34-66) | G01-03 | DEC | high | D-04 A: the catch returns InternalServerError |
| ″ | G01-01 | REPL | crit | Move the empty-Partner guard (48-59) into the orchestrator |
| Controller surplus routes (18-32, 68-87, 110-129, 148-225) | J4-17, J1-05, J1-06 | DEC | med | At least lock down client/filter/{sapFilter} and PATCH client; decide client/ma and successfactor together with nombreCliente and GetEmpleadoByNomina |

### 6.6 Methods/Credit/CreditMethods.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| VTASCodigoSMSEcommerceAsync (308-383) · LAN :2111-2206 | G10-01 | DEC | high | D-47 B: try/catch around LinkMagentoAccountAsync (:327-329), log, continue |
| ″ | J3-14 | REPL | low | Doc comment: A_GET_TelefonoValidado, not CteTelSet |
| SendSmsNewNumberAsync (174-213) · LAN :1999-2014 | G10-14, J3-21 | CODE | low | `if (idRef == "0")` at :183 |
| ″ | J3-21 | REPL | med | Parameterize the TcAAEA00030 INSERT (:194-198) |
| CodigoPromocionAsync (19-68) · LAN SpVTASVentaCupon | G10-05 | DEC | med | D-45: retire if DU16 covers the checkout box, else switch DMZ :135 and load the SIGMAVI coupons |
| ″ | G10-07, G10-08 | DEC | low | Accept 500 for an unknown opcion; accept Centro NULL |
| GetPlazosAsync (70-172) · LAN :2548-2612 | G11-22, J3-12 | DEC | low | LAN `{Error:true, Message}` envelope in the catch; log a null sapCondicion |
| ″ | G11-23 | CODE | low | Days by the SIGMAVI Condicion column, catalog as fallback |
| ″ | J3-11 / J3-10 | REPL/DEL | low | Extract LeerPlazosAsync for the 2 copied blocks; delete Debug.WriteLine :169 |
| GetValidatedPhoneNumberAsync (409-413) | J3-15 | DEC | low | Dedicated read filtering ZvalTel and length 10; the shared reader stays unchanged (§23) |
| GetCondicionesPagoAsync (519-573) | J3-M04 | REPL | low | `using` at :542 |

### 6.7 Methods/CustomerService/CustomerServiceMethods.cs and Controllers/CustomerServiceController.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| ObtenerCreditosAsync (327-531) · LAN :499-700 | G09-01 | DEC | high | Interim: merge CRED_SOLICITUD_WEB_DATOS_TEMP rows with mapped estatus (credit area gives the catalog) |
| ″ | G09-03, G7-27, J4-01 | DEC | med | Explicit uen→SalesOrg map (1→04, 2→05); status set from the Zidstatus catalog (LAN's "aceptado" is unreachable) |
| ″ | G09-04, G09-09, G09-05, G09-14 | CODE | med/low | Sort by date DESC; rethrow on SD36 failure; Math.Round 2; escape cliente_id and SKUs |
| ″ | G09-06, G09-07, G09-08, G09-11, G09-13 | DEC | med/low | Order date; strip `ZSD_{tipo}_`; Descuento 0; BP name; drop the fabricated quantity and price |
| ″ | J4-01(h) | REPL | low | Batch the per-SKU reads; use GetClientAsync for the name |
| LoginClienteCreditoAsync (223-253) · LAN :1225-1257 | G7-15 | CODE | high | First to_CtePersonalAdr row with a non-empty smtp_addr (:237) |
| ″ | G7-15, G7-16, G7-18 | DEC | high/med/low | Email field (E2E); not-found → false, else rethrow; accept the DU13 name |
| LoginClienteCreditoFechaNAsync (255-318) | G7-19 | CODE | high | `-?\d+`, or the shared FechaSap (:282) |
| ″ | G7-20, G7-21, G7-22, G7-24 | DEC | low/high/med/low | Exact yyyy-MM-dd; same email rule; rethrow; DU13 |
| validarClienteAsync (195-221) · LAN :262-308 | G7-07, G7-08, G7-09 | DEC | med | DU13 names; numeric id compare (ZidMagento 0 = unlinked is a new rule); rethrow except not-found |
| ocultarLetrasNombres (174-193) | J4-04, G02-08 | REPL | med | Keep for validarCliente; new EncriptarNombre for recuperarcuenta |
| Both logins | J4-06 | REPL | low | Shared BuildNombreEmail helper |
| File level | J4-15, J4-14 | CODE/REPL | low | ConfigureAwait(false) at the listed awaits; regions and doc comments |
| Controller guards (46-110) | G7-10, G7-17, G7-23, G7-37 | DEC | low | Ok(false) instead of 400; never reproduce LAN's empty-BirthDate bypass |
| Controller ObtenerCreditos (117-141) | G09-10 | CODE | low | Ok("") for an empty cliente_id |
| NEW nombreCliente · LAN :313-403 | G7-12, G7-11 | CODE + DEC | high/med | GetClientMaAsync + mask + TelefonoValidado (failure → "") + OcultarTelefono(4); DU13 names; switch DMZ :89 |
| NEW validarCoberturaPorCP · LAN :1738-1904 | G09-20, G09-21, J4-10 | DEC → CODE | high | Logistics names the coverage source; then the 4 ops; point DMZ :310 to SS |
| NEW ObtenerEstatusEmbarque · LAN :1911-1945 | G09-31 | CODE | high | Three LAN outcomes; the lookup must cover credit orders (after G09-30 and the writer) |
| NEW obtenerVentanaConfirmacion · LAN :156-203 | G7-03, G7-04 | DEC → CODE | med | SD36 billing + BP05MA + WE phone; forma_contacto "Página Web" |
| NEW obtenerTipoGarantia · LAN :55-112 | G7-02 | CODE | med | After the DM0415 table exists (G7-01) |
| NEW bitacoraAtencionClientes · LAN :416-496 | G7-13, G7-14 | DEC → CODE | high/med | Call SP_ACTES_REGISTRO now; Dev 3 removes the RM1138 insert before Intelisis is off |
| NEW GetEmpleadoByNomina · LAN :1959-1999 | G7-25, G7-26 | DEC → CODE | med | Retire first; if kept, SuccessFactors + the 'Codigo de promotor' catalog (DEC-25) |
| NEW STP routes · LAN :1305-1498 | G7-33, G7-34 | DEC | med | R8-11 channel map; R8-10 CLABE row |
| Retire: status/getStatus, recommender, tablerate | G03-17, G03-18..20, G09-40..42 | DEC | low | D-30/D-31/R8-18 |

### 6.8 Controllers/ProspectoController.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| RecuperarCuenta (18-72) · LAN :77-169 | G02-07 | CODE | high | Escape the 4 values: `Replace("'","''")` + Uri.EscapeDataString |
| ″ | G02-06 | CODE | high | Trim + ToUpperInvariant after QuitarAcentos |
| ″ | G02-04, J4-M5 | DEC | med | Require all 5 fields; LAN texts ('Request vacío', 'Datos inválidos') |
| ″ | G02-05, J4-M3 | DEC | med | Filter by RFC + birth date; compare the full names in C# |
| ″ | G02-08 | REPL | med | EncriptarNombre at :55 |
| ″ | G02-09, G02-10 | DEC | low/med | Error text; D-23 scope gate (Credilana → OOS) |
| NEW prospecto/rfc | G02-01, G02-02 | DEC → CODE | high | Confirm the caller first; port the RFC SPs only if in scope |

### 6.9 Wallet: Methods/Wallet/WalletMethods.cs, Controllers/WalletCustomerController.cs, Methods/WalletCustomer/WalletCustomerMethods.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| GetMinimumCostToRedeemAsync (69-240) · LAN :160-471 | J3-05, G03-08, G03-09 | CODE (C09 A) + DEC | high | `=` not `+=` (:226/:231); split familiaPermitida; per-family recompute; exact UEN+Categoria channel |
| ″ | G03-11 | DEC | med | Remove the 2/3/6/7 fallback (:131-151); 0 when the channel is not found |
| ″ | G03-15, G03-13 / J3-M01, G03-14 | CODE | low | `Family ?? ""`; descuento via TryGetValue and Math.Max(…,0); reset the fields at start |
| ″ | G03-21, J3-08 | DEC/REPL | low | Accept skipping an unknown SKU, with a log; Logger.SAP instead of Console :236 |
| GetCatalogoConfiguracionAsync (17-67) | J3-06, J8-M1, J7-M6 | REPL | low | Use ProductMethods.GetConfiguracionCatalogoAsync (after its fix) |
| ″ | J3-07 / J3-08 | DEL/REPL | low | AWS URL fallback (:19); Console :58 |
| WalletCustomerController.GetCustomerWallet (16-56) · LAN :25-115 | G03-07 | CODE | med | Newtonsoft serialization at :50 |
| ″ | G03-01 | DEC | high | uen → Vkorg/Vtweg filter before First() (after an SD18 capture) |
| ″ | G03-02, G03-03 | CODE | med | Exclude Deact or expired contracts, order by newest; titular from the BP05 name |
| ″ | G03-05, G03-06 | DEC | low | Accept "no wallet"; drop the SP_MAVIDM0173 side effect |
| WalletCustomerMethods.GetCustomerWallet sync (17-60) | J3-01, J8-M3 | DEL | low | Dead copy |
| Class and namespace | J3-20, J3-M04 | DEC/REPL | low | Namespace …Methods.Wallet; `using` at :69 |
| MISSING getCuentaC | G03-16, J1-M08 | DEC | low | Retire (D-31) after the IIS logs |

### 6.10 Pickup: Methods/Order/StorePickupMethods.cs, Helpers/MailHelper.cs, MagentoOrderMethods.cs, OrderStatusMethods.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| CreateCodeAndNotifyAsync (331-449) · LAN CodigoRecogerSucursal :96-195 | G14-43 | CODE | high | Omit `products` (:430); check statusResponse for "true" (:435) and return the failure estado |
| ″ | G15-31, G14-05 | CODE | high | Digits-only phone before INSERT/UPDATE (:348, :394, :409) |
| ″ | G15-41, G14-07 | CODE | low | Truncate Nombre/Correo to the column sizes; separate try blocks for status and email |
| ″ | G14-06, G15-32 | DEC | med | B: update contact fields only when non-empty |
| ″ | G14-45, G15-33 | DEC | med | Delivery phone first, BP phone as fallback |
| ″ | G14-45, G15-33, J2-28 | DEL | low | Dead GetBusinessPartnerAddressAsync call (:365-373); log the responses (:435, :438) |
| ″ | J2-29, J2-16 | DEC/REPL | low | Products from SD36 if ever needed; send through OrderStatusMethods |
| GenerateNewCodeAndNotifyAsync (172-248) · LAN :351-394 | G14-09, G15-29 | DEC | med | Retire jointly with createStorepickupCode if the IIS logs show no caller |
| ″ | G14-10, G15-24, J7-M4 | DEC | high | A: notify through DMZ order/sendStorePickupEmail (Magento template) |
| ″ | G15-26, G15-27 | CODE/DEC | med/low | Resolve the UEN before rotating the code; accept the non-pickup guard |
| CreateCodeBankTransferAsync (249-330) · LAN :582-646 | G04-20 | CODE | med | Email the BpRecogePedidos row's Correo/Nombre when the row exists |
| ″ | G14-40, G15-28, J7-22 | CODE | med | Pass idEcommerce as the order number (:313) |
| ″ | G14-44 | CODE | low | CheckDocumentExistsSD36ByEcommerceIdAsync (ZMER then ZPRE) at :257 |
| MailHelper.EnviarCorreoPickupAsync (10-121) · LAN :648-766 | J7-22, G14-41 | REPL/DEC | med | LAN 24-Aug text (bank-transfer variant), no Twitter link, no steps image |
| ″ | G14-42 | CODE | low | `DateTime.Now.Year` (:106) |
| ″ | J7-21, G15-28, J1-20, J7-14 | REPL | low | SMTP credentials to appSettings (rotate); Logger.SAP at :155 |
| MagentoOrderMethods / OrderStatusMethods (no callers) | J7-26, J2-16 | DEC | med | (a) wire them (closer to LAN), or (b) delete both and csproj:261-262 |
| ″ (inbound status) | G14-20 | DEC | high | R7-1 B: a separate SAP-to-Magento status sync |

### 6.11 Catalog and export: EcommerceMethods.cs, ProductMethods.cs, MagentoCatalogMethods.cs, CatalogController.cs, ProductController.cs, ImagenMethods.cs

| Method (lines) · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| EcommerceMethods.FiltrarArticulosConImagenAsync (614-654) · SP :1358-1368 | G15-01, J5-05 | CODE | high | Fail closed: remove the fallback (:641-645) and the empty-set shortcut (:623-627) |
| ″ | J5-04 | REPL | low | Logger.SAP at :625, :636, :643 |
| EjecutarProcesoCompletoAsync (1271-1388) · LAN exporta_art :1225-1243 | G15-09, J5-03, J6-M02 | CODE | high | Log + rethrow in the catch (:1377-1381) so the controller answers 400 |
| ″ | J5-02, J8-M4 | DEL | low | Commented orchestrator (1281, 1288, 1328-1375, 1379-1380); ResultadoProcesoEcommerce.cs:12-46 |
| ″ | G15-02, J8-06 | CODE / DEC | high/med | FASE 8/14 configurables (SP:3926-4496) if in scope; otherwise delete the 3 models |
| ″ | G15-38 | DEC | high | Last-export state (SIGMAVI) plus disable/out-of-stock rows (needs the BackOrder equivalent) |
| ″ | J8-05 | CODE | med | The superpromo set also requires an ACEF row (SP:1420-1423) |
| ConstruirResultadoFinal (1390-1528) · SP final SELECT | G15-07 | CODE | high | 18 credit-matrix fields from SD29 + CondicionesCredVtaLinea (SAP SD confirms the conditions) |
| ″ | J5-10 | DEC | high | url_key = FN_eCommerceUrlkey (get the function body), meta_title, description (an SEO impact) |
| ″ | G15-04, J5-12 | CODE / DEC | med | IncluyeVineta template; add color_filtro, R6 and out-of-stock items to the pending list |
| ″ | G15-05, J5-M2, J5-11 | DEC | med | R6 CELULAR (defer, Q17); category_control (no destination table); the AMER visibility rule has no LAN source |
| GetPreciosFinalesAsync (675-728) · LAN :669-866 | G15-06 | CODE | high | CategoryDiscount formula; branch 41; channel 6/2/0; AwayFromZero; ask SD about liquidation discounts |
| Store constants (24-27, 175, 1479) | G15-10 | CODE | high | Parameterize by store and wire 'viu' (after the user confirms VIU) |
| GetPropiedadesArticulosAsync (729-813) | G15-03 | CODE | med | Attribute and value-list validation once the tables are relocated |
| SAP relation caches (29-36, 1569-1730) | J5-09, J5-04 | REPL | med/low | Instance-scoped caches, untrimmed, no cached failures; Logger.SAP |
| GetPosicionamiento (1186-1270) · SP :4519-4697 | J5-08 | DEC | med | Accept the simplification (and delete the placeholders) or port priority, season and top-10 |
| Dead intermediate fields (356-363, 502-516, 546-552, 1799-1817) | J5-07 | DEL/DEC | low | Delete the constant fields; decide on the diagnostics and ParseSapDate |
| ProductMethods.GetExclusionesFamMAAsync / GetExclusionesMAAsync (420-516) | J6-10 | REPL | high | Rethrow (:509-512); `throw;` not `throw ex;` (:462) |
| ″ | J6-19 | REPL | med | Throw on a null SIGMavi connection (remove `return results` :428, :477) |
| GetArticulosIEMayoristaAsync / GetPropiedadesArticulosAsync (676 vs 1052) | J6-11 | DEC | med | The user confirms which table/column name exists; align both |
| GetEtiquetasAsync (1347-1373) · LAN TagsMethods :18-188 | G15-14 | CODE | med | No $filter when the id is empty; escape when present |
| ″ | G15-13 | CODE | high | Port generaEtiqueta rules onto ZMMT_ETIQUETA (after G15-08/RC-16 decide where the catalog build lives) |
| GetEtiquetas sync (1316-1345) | J1-M04, J6-07 | DEL | low | Exact copy |
| GetConfiguracionCatalogoAsync (708-735) | J8-M1 | CODE | low | Escape the name; accept `{value:[...]}` or an array |
| Stock reads (170-315) | G15-17 | CODE | low | Escape the literals; restrict product/stock/filter/{filter} |
| GetProducts*, GetCrossSellAsync | J6-16, J6-M04, J6-M01 | DEC/REPL/DEL | low | Empty OData options (after a sap.log check); escape; remove `using RestSharp` |
| MagentoCatalogMethods.GetProductWithWebsitesAsync (313-349) · Production Conn/Magento :331-397 | G13-01 | CODE | high | Null guards (products, extension_attributes, website_ids) |
| ″ | G13-01 (D-54, D-07) | DEC | high | Production page 500 + per-SKU pass (needs the shared data.db); the DMZ keeps both templates |
| SendAttributesToIntelisisAsync (164-216) | G13-13, G13-02 | DEC | med | Per-set try/catch (A); the MySQL/IntelisisTmp leg stays on LAN, then retire |
| DeletePromocionesAsync / DeleteReservationsAsync (217-240) | G13-09, G13-11 | CODE | med | Dedicated `new Curl(3600, 1)` |
| GetChildrenAsync (277-312) | G13-14 | DEC | low | Page size 500 if Production is the reference |
| All DMZ readers | G13-06 | CODE | low | Optional FormC normalization in this class |
| IgnoreAttributesPath fallback | J5-15 | DEC | low | Solution-wide fallback-constant policy |
| CatalogController CargaCompleta / DeletePromociones / DeleteReservations / Children | G13-03, G14-26, G13-05, G13-08, G13-10, G13-07 | DEC | high→low | RC-16: keep LAN's chain until Sprint 9, then the importer calls SS with a shared data.db; keep the 500 |
| ProductController.EcommerceExportaArt (21-47) | J1-08 | KEEP | — | Tracked WIP (ma = muebles_america) |
| ″ | G15-08, G15-11 | DEC | high/med | Who persists the export (C then A); keep the MAVI store or not |
| ObtenerImagen → ProductImageMethods.GetImagesAsync (34-71) | J5-13 | CODE | med | Path.GetFileName on both names (blocks overwriting credit documents) |
| ″ | G14-38, J5-13 | DEC | low | Accept overwrite as EQ-R; confirm the IMAGES_PRODUCT_PATH consumer |
| ImagenMethods (22-87) | J5-01 / J5-05 / J5-M3 | DEL/REPL/DEL | low/med | Delete the duplicate filter; OrdinalIgnoreCase plus no cache for the export; unused using and namespace typo |
| EcommerceController / ImagenController diagnostics | G15-12, J5-16, J1-07 | DEC | low | Remove, or restrict to non-production |

### 6.12 Missing LAN jobs (no ServicioSAP code yet)

| Job · LAN | Refs | Type | Imp | Change |
|---|---|---|---|---|
| product/updateStock · ProductMethods :942-991 | G15-20 | DEC | high | RC-16: keep LAN until Sprint 9, then an SS job on DIM11 + deleteReservations |
| product/existenciasAlmacenArt · ActualizacionStock :55-107 | G15-23 | CODE | high | After RC-16 and a plant → source_code map (the user runs sp_helptext) |
| product/updateStockMavi · :882-918 | G15-22 | DEC | med | Follows G15-11 |
| product/updatePrice + super_garantia | G15-39 | DEC | high | RC-16; SAP source for extended warranty |
| updateProduct steps 1, 9-16 | G14-30 | DEC | med | P10-1 A: outside the per-controller count (Dev 2) |
| getStockByStore | G14-37 | DEC | low | Retire (D-31) |

### 6.13 Other methods files

| File · Method (lines) | Refs | Type | Imp | Change |
|---|---|---|---|---|
| Customer/CustomerMethods.cs · ValidarClienteEnSapAsync (75-98) | G01-07 | DEC | high | CQ14 A after P-15 confirms the case behavior |
| ″ | J1-18, J4-07 | REPL | low | `const string campo = "Mail"` (the key never existed) |
| ″ | G01-11 | DEC | med | The CQ21 Logger risk inside the catch |
| Customer/MagentoAccountMethods.cs · Get/SetCuentaAsync (21-38) | G01-13, G01-14, G01-12, G13-12, G14-01, G14-03 | DEC | med | CQ24 A for getCuenta; `new Curl(120, 1)` for setCuenta once the caller is known (uncommitted user edits) |
| Customer/CashReportMethods.cs (16-90) | G01-11, J4-16 | DEC | low | CQ21 A; fallback-constant policy |
| SalesDistribution/SalesMethods.cs · GetCreditDocumentsAsync (178-215) | G09-12, J8-M2, J6-01 | DEL | high | Delete the dump at :200 |
| ″ | J4-M1, J8-12 | DEC | low | Drop `to_zsdt_vbap` unless VBAP becomes the status source |
| ″ · CheckDocumentExistsSD36ByEcommerceIdAsync (216-224) | G09-31 | DEC | med | Cover credit-order PurchNoC/Zidecomm |
| ″ · CheckDocumentExistsSD36Async (132-177) | J6-14 | REPL | low | Reuse GetCreditDocumentsAsync; stale comment :142 |
| ″ · InsertDocumentAsync (22-61) | J1-05, J8-09, J6-12 | DEC | low | Delete sale/transaction and its models, or add CSRF |
| ″ · GetFilterDocumentsAsync / GetDocumentByIdAsync | J6-M03, J6-M01, J6-M06 | DEC/CODE/DEL | low | Delete or escape; escape documentId (:65); unused using; stale "65 call sites" (:25) |
| SalesDistribution/MovBitaMethods.cs (13-50) | G15-35, G15-37 | DEC → CODE | high | MovBita = option E of Q-T2-1; then order/creditStatus/{idSolicitud} with the LAN contract |
| ″ | J6-13 | REPL | low | CreateClientExternal, ConfigureAwait, escape vbeln |
| SalesDistribution/FinalListProperMethods.cs | J6-08 / J6-15, J6-M04 | DEL/REPL | low | Delete ByUenAndBranch; ByUen → ConsultarPropreListAsync with a shared LiteralOData |
| MaterialManagement/AccountMethods.cs + AccountController (13-223) | J1-04, J6-09 | DEL/DEC | low | Keep GetBonusAsync and delete GetBonus and its route; CSRF URL from the AppSetting |
| ″ | J8-08, J6-M05 | DEC | med/low | Fix BonusResponseSet and use it (changes the shape; the consumer confirms), or delete BonusOK |
| ″ · GetSucursalAsync (185-223) | J6-M04, J6-M01 | REPL | low | Escape Sucursal; unused usings |
| Credit/SolicitudCreditoWebMethods.cs (user's §23) | G12-11, G12-M1, G05-10, J3-16, J3-17, J3-M03 | DEC (user) | med/low | ProductosMX entry only when ported; P16 prospect equivalence; Confirmado bind or delete; no-op try/catch (J3-17, user removes it); CreateClientExternal |
| ″ · FechaSap (604-625) | J4-06, G7-19 | REPL | med | Promote to a shared /Date( parser (CSM :280-291, :415-423, ParseSapDate) |
| Credit/CredilanaMethods.cs (14-36) | J3-13 | DEC | med | With D-49: port the writer or point SQLITE_DB_PATH; fix the message at :26-28 |
| Credit/LiberadorCreditoMethods.cs (48-109) | J3-09, G05-31 | REPL | low | Logger.SAP("[LIBERADOR] ") with the request id |
| Credit/DocumentMethods.cs (27-186) | G11-24, J3-M02, J3-18 | DEC/REPL | low | Client-key test (`^[0-9]{10}$`?); LAN line refs and the stray '¿'; images path owner |
| Order/MovBita, Sepomex, DeliveryAddress, diagnostic routes | J1-06, J1-05, J4-09, J4-10 | DEC | med/low | One policy (ENABLE_DIAGNOSTIC_ROUTES or delete); lock down raw $filter passthroughs |
| Controllers/WholesaleCustomerController.cs | G02-12 / G02-13 | CODE / DEC | med | No change after the BPM fix; D-27 C: retire negotiable-quote with a fixed DMZ 200 |

### 6.14 Helpers, config, csproj, models

| File · item | Refs | Type | Imp | Change |
|---|---|---|---|---|
| Helpers/ConexionDMZ/Curl.cs (26-160) | J7-13, J2-M07 | DEC | med | Retries only for GET and login; maxRetries=1 for POSTs; longer Magento timeout; FormC on GET |
| ″ | J7-12 / J7-14 | CODE/REPL | med/low | Tls12 only (:33-34); Logger.SAP at :144, :153 |
| Helpers/Logger.cs · SAP (8-44) | G01-11, CQ21, J7-23 | DEC | med | A: the deployment creates `<site>\Logs`; B: CreateDirectory inside the try / LOG_LOCAL_COPY |
| Helpers/TokenGenerator.cs | J7-12, J7-10, J7-11 | DEC | med/low | Drop the accept-all callback or EnableTrustedHosts; ClearAuthS4 on 401 and private field; document the per-environment Conexion.dll |
| ″ | J4-M4, J7-M6 / J7-09 | REPL/DEL | low | `using` and CreateClientExternal at the 7 raw `new HttpClient()` sites; dead GetApiService/GetCsrfToken and usings |
| Methods/Utils/RequestMethods.cs | J6-02, J7-M2 / J6-03 | DEL / DEC | med | Delete 39-110; EnableTrustedHosts compares a URL with a host; one global callback in Application_Start |
| Methods/Utils/StoreGlobalMethods.cs | J6-04, J6-05, J6-06 | DEL | low | GetSalesOff, GetRefDocCat, GetTypePosition (they contradict live rules) |
| GeneradorLog, ConexionSapConfig, ConexionSQL sync, SQLiteDb sync, CatalogoMethods unused | J1-M02/J7-06, J1-M01/J7-07, J7-15, J7-16, J7-18 | DEL | low | Dead classes and methods (remove the TokenGenerator.cs:5 using too) |
| SQLiteDb path | J7-17 | DEC | med | Provision sap\data.db with LAN's schema, or point to api\ while both run |
| CatalogState/CatalogoEstados.cs | J7-08, J1-M03 | DEC | med | Reconnect in OrderMethods (:2715, :1481), or delete the file and the using |
| HashService, TokenValidationHandler | J7-19, J7-20 | KEEP | — | Identical to LAN |
| Methods/Utils/SntzMethods.cs | J1-17, J6-18 | KEEP | — | Commit together with the csproj or the build breaks |
| Web.config | J7-M5 / J1-14 / J1-15 | DEL | low | SAP_STAGE (:34; J7-M5, and item 1 of the J1-13 correction); MVC keys (:22-25); Antlr, Optimization, WebGrease, Helpers, WebPages, Mvc bindingRedirects (keep Newtonsoft) |
| ″ | J1-13, J7-11, J4-M6 | DEC | med | One environment-promotion mechanism (SAP_ENVIRONMENT/SAP_CLIENT) |
| ″ | J1-19, J1-20, J3-M05 | DEC | med | Release/Stage transforms (DEVMAVI, customErrors, httpErrors); secrets out of git, rotate |
| ServicioSap.csproj + Fakes | J1-16, J7-01..J7-04, J8-M5 | DEL | low | csproj 52-54, 77-79, 456-457; `git rm` Fakes/*.fakes; delete FakesAssemblies/ and obj/Debug/Fakes |
| ″ MVC leftovers | J1-14, J1-15, J7-25 | DEL | low | Global.asax :6-8, :16; Mvc/Razor/WebPages/Optimization/WebGrease/Antlr refs and packages; Folder items; MvcBuildViews |
| ″ Nini.dll | J1-M05, J7-24 | DEL | low | Reference, Content item and dll; smoke-test that Conexion.dll loads |
| Models (dead or duplicate) | J8-01, J8-02, J8-03, J8-04, J8-05, J8-07, J8-10, J8-11, J8-13/J4-M2, J8-14, J8-15/J5-M1, J8-M1 | DEL | low | See §7.2 group d |
| ″ | J8-06, J8-12/J4-M1 | DEC | med/low | Configurables (FASE 14 scope); VbapResponse unless VBAP becomes the status source |
| ProductMethods.GetEtiquetas, EcommerceMethods superpromo | J1-M04, J8-05 | DEL/CODE | low/med | As in §6.11 |

### 6.15 Vault documents that the improvements touch

| Doc | Refs | Change |
|---|---|---|
| [[COMPARATIVA_SETORDER_LAN_VS_SAP]] rows 15, 25; ACTIVIDADES :124-125 | J2-M08 | LAN does have the region rule; setCAccount is unreachable in LAN; update line refs to 1183-1198, 673-707, 1200-1291 |
| Manual Técnico 26082026 / 01092026 / 31082026 | J1-21, J4-M7, J6-M06, J6-09, J1-13 | Refresh the route statuses (getMinimumCostToRedeem, wholesale, getCuenta/setCuenta, pickup, Neko stub, bonus, testnew); obtenerCreditos "implemented, not connected"; SAP_STAGE is not a stage selector |
| [[Business Rules Ecommerce]] | J8-M6, J5-M4, J5-17, J6-M06, J6-03 | RCS-41 'aceptado' unreachable in LAN; CatalogController :156-159; obtenerImagen mapping; RUTL-5; date helpers |
| MAVI - DMZ-SAP.csv :132 and copies | J5-17 | product/obtenerImagen → ProductController.cs:472 / ProductImageMethods.cs:34 |

### 6.16 Cross-cutting patterns (the three areas combined)

1. **Hard-coded environment.** There are 68 `Nodos.ENVIROMENT_DEV` and 69 `sap-client=110` literals. `sap-langu`, `sap-language` and no language parameter are mixed. LinkMagentoAccountAsync has no client at all (G10-02). SAP_STAGE is dead. Choose one helper before go-live (J2-23, J1-13, J7-11).
2. **Test literals sent to SAP:**
   - 'Tadeo' in 5 fields; 'Tipo123456', 'Clave123', '1234', '1234567890';
   - Region 'JAL'; the const guest BP 1500003857;
   - the AWS URL fallback and the images path fallback.
   They need SAP-agreed values (J2-24, J3-07, J3-18).
3. **Success detection.** HTTP 2xx is treated as success, and the wrong document field is read. Apply the user's CQ8 BP rule to orders (G04-27, G04-23).
4. **Fail-open vs LAN.** These swallow errors where LAN failed:
   - ValidarPedidoExistenteSAPAsync, the SD48 swallow;
   - GetPlazos, GetMinimumCostToRedeem;
   - the export image filter, exclusions and catch;
   - validarCliente and the logins;
   - the stock gate rejecting on exceptions.
   The common fix is a typed not-found signal plus rethrow (R8-02, N11, D-46).
5. **Console instead of Logger.SAP.** 102 Console and 10 Debug calls, none of which reach sap.log under IIS. Logger.SAP can itself throw (CQ21).
6. **Response contracts to Magento.** ServicioSAP returns objects, raw arrays or 200 "Error, …" where LAN returned bare strings or sentinels (setOrder, credit setOrder, getClienteFactura, getClienteSaldo, getPlazos, GetAccountDebts). Decide these with the Magento owner before touching DMZ status codes.
7. **Duplicated helpers:**
   - SALESORDER POST ×3, purchNoC prefix ×3, two BP builders;
   - coupons ×2, catalog-config reader ×2, GetPlazos block ×2, GetEtiquetas ×2, GetBonus ×2;
   - image filter ×2, SD36 parse ×2, name join ×4, `/Date(` parser ×4;
   - OrderStatusMethods and MagentoOrderMethods unused while inline copies exist.
8. **Certificates and TLS.** Validation is off toward S4, and TLS 1.0/1.1 are enabled. Decide once (J6-03/J7-12) and set it in Application_Start.
9. **Unescaped input.** OData filters are built in ProspectoController (exploitable), AbonoMethods, ObtenerCreditos, the stock, sale, Sucursal and etiquetas readers, and Sepomex. SQL is built with string.Format in SendSmsNewNumber. Use one shared LiteralOData + Uri.EscapeDataString helper (CQ13).
10. **Case normalization.** BPs are uppercase (CQ1=B), but lookups send raw text. If P-15 confirms that OData `eq` is case-sensitive, apply Trim + ToUpperInvariant before every BP05 lookup (G01-07, G02-06).
11. **uen/UEN is received and ignored** (wallet/details, obtenerCreditos, GetAccountDebts). Use one explicit uen → SalesOrg map (1→04, 2→05; mavi is pending CQ5).
12. **One rule on two paths.** The TELEFONIA region swap and the SD29 row selection behave differently in cash and in credit. Decide each once (R7a-7, SD29-1).
13. **Sequencing.** The credit gate route must ship before or with the Magento BP release (G10-22).
14. **RC-16 gates most of the catalog.** Keep LAN's chain until Sprint 9. LAN-only routes with an unknown caller wait on RC-15 (30 days of IIS logs).
15. **Uncommitted working tree:** BusinessPartnerMethods, CustomerMethods, MagentoAccountMethods, the csproj, and SntzMethods.cs (untracked). Coordinate with the user before editing these files.

## 7. Junk code summary

Detail and proposals: [[CODIGO_BASURA_Y_DOCS_OBSOLETOS_2026-10-06]] §1.

### 7.1 Counts

| By recommendation | Count |
|---|---|
| DELETE | 71 |
| REPLACE | 51 |
| DECIDE | 85 |
| KEEP | 13 |
| **Total** | **220** |

| By kind | Count | By kind | Count |
|---|---|---|---|
| OTHER | 43 | DEBUG_LEFTOVER | 11 |
| DIVERGES_FROM_LAN | 38 | DEAD_ROUTE | 10 |
| DUPLICATE_LOGIC | 23 | CSPROJ_MISMATCH | 6 |
| DEAD_METHOD | 22 | UNUSED_VARIABLE | 6 |
| DEAD_CLASS | 19 | STUB | 4 |
| TEST_OR_FAKE_LEFTOVER | 13 | COMMENTED_BLOCK | 4 |
| HARDCODED_ENV | 12 | DEAD_MODEL | 4 |
| CONFIG_DEFINED_NOT_READ | 3 | CONFIG_READ_NOT_DEFINED | 2 |

| Area | Scope | Findings |
|---|---|---|
| J1 | Controllers, Web.config, csproj | 29 |
| J2 | Methods\Order | 41 |
| J3 | Methods\Credit, Abono, Wallet, WalletCustomer | 28 |
| J4 | Methods\BusinessPartner, Customer, CustomerService, Sepomex | 24 |
| J5 | Methods\Ecommerce, Catalog, ImagenManagement, ProductImage | 20 |
| J6 | Methods\MaterialManagement, SalesDistribution, Utils | 25 |
| J7 | Helpers, Fakes | 32 |
| J8 | Models | 21 |

### 7.2 DELETE list (71 ids, grouped; several ids name the same item from two areas)

Not in the Fable batch: the two test routes (they wait for the user's answer to GUIA:548) and J3-17 (user-owned, §23). Everything else below can go into the Wave 0 batch.

**a. Test, fake and stub leftovers (security-relevant first):**
- `partner/testnew` + TestCreateClientRawAsync: J1-01, J4-02, J7-M1.
- `order/testnew` + TestSetOrderAsync: J1-02, J2-19, J7-05.
- Both test routes wait for the user: GUIA_MIGRACION_FABLE.md:548 asks whether to delete `order/testnew` and `partner/testnew`, and the verifier downgraded J4-02 to DECIDE for that reason. Recommendation: delete both.
- Neko stubs: J1-03.
- Fakes: J1-16, J7-01, J7-02, J7-03, J7-04, J8-M5.

**b. Debug leftovers and dead code:**
- SD36 PII dump at SalesMethods.cs:200: J6-01, J8-M2.
- Debug.WriteLine at CreditMethods.cs:169: J3-10.
- No-op try/catch in SolicitudCreditoWebMethods.cs:335-367: J3-17. **User-owned (§23 file)**: the user removes it; Fable does not.
- OrderMethods: J2-01 afectar, J2-02 LogOrderCreatedInSap, J2-03 ValidarOrdenCompleta, J2-04 four unused helpers, J2-20 ReverseGoodsIssueAsync, J2-26 unused constants, J2-M01 esDevolucion, J2-M06 redundant branch, J2-08 commented SD40 block.
- Helpers and utils: J1-M01/J7-07 ConexionSapConfig; J1-M02/J7-06 GeneradorLog; J7-09 TokenGenerator fields; J7-15 ConexionSQL sync; J7-16 SQLiteDb sync; J7-18 CatalogoMethods; J6-02/J7-M2 RequestMethods; J6-04, J6-05, J6-06 StoreGlobalMethods; J6-08 FinalListProper; J6-M01 unused `using RestSharp`; J5-M3 ImagenMethods using/namespace.

**c. Duplicates, config and csproj:**
- Duplicates: J1-04 account/bonus (keep GetBonusAsync, see J6-09); J1-M04/J6-07 GetEtiquetas; J3-01/J8-M3 GetCustomerWallet; J5-01 ImagenMethods filter.
- Config: J3-07 AWS URL fallback; J4-07 SAP_BP_CAMPO_EMAIL read; J7-M5 SAP_STAGE; J1-14 MVC keys and Global.asax.
- csproj: J1-15 MVC references and packages; J7-25 Folder items; J1-M05/J7-24 Nini.dll.

**d. Commented blocks and models:**
- Commented blocks: J5-02, J8-M4.
- Models:
  - J8-01 four Database models;
  - J8-02 EcommerceExportaArt/ProductoExport;
  - J8-03 the dead ArticuloIEMay;
  - J8-04 16 scaffold files;
  - J8-05 ArticuloPromocion/SuperPromo;
  - J8-07 CouponModels;
  - J8-10 Invoice models;
  - J8-11 the empty Equivalence.OrderRequest;
  - J8-13/J4-M2 four address classes;
  - J8-14 WalletCustomerReturn;
  - J8-15/J5-M1 OData wrappers.

### 7.3 DIVERGES_FROM_LAN (38: 1 KEEP, 7 REPLACE, 30 DECIDE)

| Id | Rec. | Where | Divergence → decision |
|---|---|---|---|
| J1-08 | KEEP | ProductController.cs:21-47 | Only 'ma' is implemented; tracked WIP |
| J1-09 | DECIDE | AbonosController.cs:34-47 | getClienteFactura shape and cliente check → DEC-10 |
| J1-10 | DECIDE | OrderController.cs:244-262 | createStorepickupCode contract → DEC-16 |
| J1-M07 | DECIDE | OrderController.cs:224-242 | generateNew error contract → DEC-16 |
| J2-06 | REPLACE | OrderMethods.cs:1257-1263 | Callback keys → C-03 |
| J2-10 | DECIDE | OrderMethods.cs:2116-2181 | Region rewrite → DEC-04 |
| J2-11 | DECIDE | OrderMethods.cs:1995-2050 | Price floor → DEC-04 |
| J2-12 | DECIDE | OrderMethods.cs:2056-2109 | Stock gate → DEC-04 |
| J2-15 | DECIDE | OrderMethods.cs:1953-1957 | setCAccount for every order, including guests → J2-15 |
| J2-18 | DECIDE | OrderMethods.cs:468-493, 1777-1786 | Openpay cards never reach SAP → DEC-03 |
| J2-29 | DECIDE | StorePickupMethods.cs:420-433 | Empty products → C-08 |
| J2-32 | DECIDE | OrderMethods.cs:2211-2565 | Shipping and installments missing → X-04 |
| J2-M03 | DECIDE | OrderMethods.cs:807 | Credit has no region rule → with J2-10 |
| J3-03 | DECIDE | AbonoMethods.cs:54-93 | Raw ZSplitDto list → DEC-10 |
| J3-04 | DECIDE | AbonoMethods.cs:19-51 | Raw EX01 rows → DEC-09 |
| J3-05 | DECIDE | WalletMethods.cs:69-240 | Redeem-minimum algorithm → DEC-11 (C09 A) |
| J3-12 | DECIDE | CreditMethods.cs:166-171 | getPlazos swallows errors → DEC-19 (D-46) |
| J3-15 | DECIDE | CreditMethods.cs:409-413 | Validated phone row selection |
| J3-M01 | REPLACE | WalletMethods.cs:163-166, 185 | Missing descuento skips the article; no clamp |
| J4-01 | DECIDE | CustomerServiceMethods.cs:327-531 | obtenerCreditos rules → DEC-28 |
| J4-04 | REPLACE | CustomerServiceMethods.cs:174-193 | Wrong masking for recuperarcuenta |
| J4-05 | DECIDE | CustomerServiceMethods.cs:195-318 | Errors read as false → DEC-12 |
| J4-M3 | DECIDE | CustomerServiceMethods.cs:208; ProspectoController.cs:47,55 | Second given name ignored |
| J4-M5 | REPLACE | ProspectoController.cs:22-72 | Response texts |
| J5-05 | REPLACE | EcommerceMethods.cs:614-646 | Image filter fails open → C-13 |
| J5-08 | DECIDE | EcommerceMethods.cs:1206-1254 | Positioning simplified |
| J5-10 | DECIDE | EcommerceMethods.cs:1481, 1495, 1508 | url_key, meta_title, description |
| J5-11 | DECIDE | EcommerceMethods.cs:1485-1487 | AMER visibility rule has no LAN source |
| J5-12 | DECIDE | EcommerceMethods.cs:1483, 1499, 1522 | Missing SP post-processing |
| J5-13 | DECIDE | ProductImageMethods.cs:38-57 | Overwrite and folder |
| J5-M2 | DECIDE | EcommerceMethods.cs:1434-1439 | category_control missing |
| J6-10 | REPLACE | ProductMethods.cs:469-516 | Exclusions fail open |
| J7-13 | DECIDE | Curl.cs:48-53, 107-160 | Retries, timeout, FormC |
| J7-17 | DECIDE | SQLiteDb.cs:11-21 | data.db location |
| J7-22 | REPLACE | MailHelper.cs:16-111 | Email text, order number, year |
| J7-M3 | DECIDE | OrderMethods.cs:2715, 1481 | Region JAL / raw estado |
| J7-M4 | DECIDE | StorePickupMethods.cs:172-244 | SMTP vs Magento notification |
| J8-06 | DECIDE | ProductoConfigurable.cs et al. | FASE 14 configurables scope |

## 8. Obsolete information in the vault

Detail with the exact fix per statement: [[CODIGO_BASURA_Y_DOCS_OBSOLETOS_2026-10-06]] §2. Doc corrections from the parity pass: [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §8.

Who fixes what: under the 2026-10-05 rules, Fable edits only [[Business Rules Ecommerce]] and its spec board. The owner of each other document applies its fixes.

### 8.1 Counts

| Severity | Count | Kind | Count |
|---|---|---|---|
| high | 33 | WRONG_CITATION | 44 |
| medium | 100 | WRONG_BEHAVIOR_DESCRIPTION | 41 |
| low | 82 | DONE_BUT_MARKED_PENDING | 39 |
| **total** | **215** | SUPERSEDED_DECISION | 33 |
| | | OTHER | 20 |
| | | WRONG_COUNT | 16 |
| | | CONTRADICTS_OTHER_DOC | 13 |
| | | REFERS_TO_REMOVED_CODE | 9 |

| Document | n | Document | n |
|---|---|---|---|
| Business Rules Ecommerce.md | 58 | CAMBIOS_PARIDAD_CREDITO_2026-09-29.md | 4 |
| COMPARATIVA_BP_LAN_VS_SAP.md | 13 | REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05.md | 3 |
| AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md | 13 | SPEC_NIP_SMS_SERVICIOSAP.md | 3 |
| PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md | 12 | MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP.md | 3 |
| 01_CustomersController.md | 12 | INVENTARIO_LOGS_SERVICIOSAP.csv | 2 |
| COMPARATIVA_SETORDER_LAN_VS_SAP.md | 11 | master_migration_log.md | 2 |
| GUIA_MIGRACION_FABLE.md | 8 | PLAN_BP05_EXPOSICION_DATOS.md | 2 |
| CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md | 7 | FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md | 2 |
| SKILL.md | 7 | REVISION_PLAN_FABLE_2026-10-02.md | 2 |
| FLUJO_CREDITO_LAN_VS_SAP.md | 5 | 14 documents with 1 each* | 14 |
| master_migration_summary_unified.md | 5 | | |
| PLAN_FABLE_POR_CONTROLADOR.md | 5 | | |
| ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md | 5 | | |
| Manual Tecnico Servicio SAP 01092026.md | 5 | | |
| CHECKLIST_CAMPOS_BP_ECOMMERCE.md | 4 | | |
| MAVI - DMZ-SAP.csv | 4 | | |
| CHECKLIST_DEV3_NOSAP_NOINTELISIS.md | 4 | | |

\*One statement each: Estado de migracion Exportacion Art, solo-s4-no-cpi-ni-abap, RESUMEN_Check_list_BPs_Deudor, guia-migracion-fable, ANALISIS_SP_CREDITO_WEB_DATOS, sp_vs_code_comparison, sap_payment_conditions, nomenclatura_campos_sap_en_sigmavi, LAN - Mapa, CAPTURAS_REALES_APIS, convenciones-migracion-sap, registro_tareas_implementadas, auditoria-paridad-setorder, and an OrderMethods.cs comment. That is 14 documents; with the 26 documents above that makes the 40 the input lists.

### 8.2 All high-severity items (33), with the fix

| Id | Doc · where | Kind | Fix |
|---|---|---|---|
| D1-01 | Business Rules · L15, 22, 26, 214, 218, 335 | WRONG_COUNT | 110 → **111** routes; POST 55 → 56; section 03 has 9 routes; add `credit/codigoPromocion` (CreditController.cs:24-41) |
| D1-02 | Business Rules · L588, L1178-1211 | CONTRADICTS | Add a `POST /credit/codigoPromocion` block (→ CreditMethods.cs:16-68, SpVentasCupones), RCR-78 onward |
| D1-04 | Business Rules · L419, 474, 490-510 | WRONG_BEHAVIOR | Step 13b + RORD-39: the bank-transfer pickup code is generated in order/new (OrderMethods.cs:1959-1975) |
| D2-01 | Business Rules · L3970-3990, L4571, RPR-123, RPR-132 | WRONG_BEHAVIOR | Curl: one static HttpClient, token cached 20 min, re-login on 401 (commit 9008609) |
| D2-02 | Business Rules · L4317, L4321 (+L732, L760) | DONE_BUT_PENDING | Remove the pending bullets: SD36 ZSD_ normalization done (SalesMethods.cs:136-140) |
| D2-03 | Business Rules · L2431, L2491, L4448 | SUPERSEDED | DMZ :118 curl.Post goes to URL_INTELISIS: LAN in production, SS IIS Express on the Dev share (RC-06, dev DMZ blanket redirect) |
| D2-16 | Business Rules · Neko L3517, 3528, 3542, 4533-4534 | SUPERSEDED | "Do NOT connect (user rule; D-41 retire/N-A)" |
| D3-01 | 01_CustomersController · §2.3 CML:143, §3.6.1, 1.6-R7…1.7-R21 | WRONG_BEHAVIOR | CML:143 is correct since 9008609 (static client + cached token); drop it from T1.0-DOC |
| D3-02 | 01_CustomersController · §3.1.1, §3.1.4 | DONE_BUT_PENDING | Flow: Build (BPM:384-735) → Submit (:75-125) → guard SBPC:48-59 → `Ok(Partner.Trim())` SBPC:60 |
| D3-03 | 01_CustomersController · §1.1 row 1.1 | WRONG_COUNT | Contract fixed (SBPC:60); route SBPC:34-66; recount EQ 4 · EQ-R 8 · DIF 8 · FALTA 2 · … |
| D3-04 | PLAN_FABLE_POR_CONTROLADOR · package 1 L98-106 | DONE_BUT_PENDING | "Corregir y construir; S1-S4 done 2026-10-05 (uncommitted, no E2E); S5 builds lookup/update" |
| D4-01 | PLAN_EJECUCION §27.3 CUP-1 L2508-2510 | WRONG_BEHAVIOR | codigoPromocion exists (CreditController.cs:25-40 → CreditMethods.cs:19-68); the DMZ still routes to LAN (:135) |
| D4-09 | ACTIVIDADES §1, §1.1, §3 | WRONG_COUNT | Use the §27.1 count (**119/160** code-verified, about 94/160 counted the strict way; 120/160 after the 2026-10-06 parity pass, where TEL-1 closed G3-04); committed 05df55a, merged 6214ed8; drop the +161/-64 risk |
| D4-10 | ACTIVIDADES ACT-02/10/22/26/27, §7 | DONE_BUT_PENDING | ACT-27 HECHO (05df55a); ACT-02 closed by D-01; build owner = user (VS) |
| D4-14 | CREDITO_WEB · L12, §1 | SUPERSEDED | P2/P3/P5/P6/P8(c) closed by DU15/16/12/13/14; liberador at OM:673-707; committed |
| D4-15 | CREDITO_WEB · §2 steps 13, 17, 18, 29, 31, 32 | WRONG_BEHAVIOR | Update to the current behavior (step 17 IGUAL DU15; step 18 log removed DU17; 29/31 DIF accepted DU14; step 32 deprecated DU16) |
| D4-16 | CREDITO_WEB · §6.0, §6.1 | DONE_BUT_PENDING | Mark DU12-DU19 closed and E1-E5 HECHO (05df55a) |
| D4-17 | CREDITO_WEB · §6.2.1 R4 | CONTRADICTS | Do not revert DU13: `string.Join(" ", NameFirst, Namemiddle)` trimmed; re-cite SCW:236-305 |
| D4-20 | MATRIZ_REGLAS · §0.1-§0.5 | SUPERSEDED | Box "Superseded by DU12-DU19 and 05df55a"; strike §0.5 items 2-5, 10, 11, 16 |
| D4-25 | CAMBIOS_PARIDAD · §4.2, §4.3, §5.2 | SUPERSEDED | Row 3 = NameFirst + Namemiddle (DU13); remove "mayúsculas pendiente" (DU12) |
| D4-28 | FLUJO_CREDITO · §4.4, §10 #8 | REFERS_TO_REMOVED | Superseded by TEL-1: OM:617-629 → SCW:478-521 (A_GET_TelefonoValidado) |
| D4-29 | FLUJO_CREDITO · §4.2, §10, §3.2 | SUPERSEDED | Coupon burn retired by DU16 (2026-09-30) |
| D4-33 | FLUJO_SP_CREDITO_WEB_DATOS · frontmatter, §1 D2/D9 | SUPERSEDED | "Superseded 2026-09-24 (§17): only @Op=Insert"; estado histórico |
| D5-01 | COMPARATIVA_BP · BP-01 | DONE_BUT_PENDING | RESOLVED 2026-10-05: returns the BP number (BusinessPartnerController.cs:60) |
| D5-02 | COMPARATIVA_BP · BP-02 | SUPERSEDED | Decided CQ1=B; Sntz + ToUpperInvariant (BPM:391-397) |
| D5-03 | COMPARATIVA_BP · BP-03 | DONE_BUT_PENDING | RESOLVED: TEST literals gone (BPM:669-686); keep only the question about BPs already created with TEST |
| D5-12 | COMPARATIVA_SETORDER · D-01 | DONE_BUT_PENDING | RESOLVED (OM:1752, :1764) |
| D5-13 | COMPARATIVA_SETORDER · D-11 | DONE_BUT_PENDING | RESOLVED (OM:1962-1975 → CreateCodeBankTransferAsync), pending E2E |
| D5-23 | AUDITORIA · C01, C02, §6, §8 | DONE_BUT_PENDING | C01 RESOLVED (OrderController.cs:167-168); C02 partial (explicit failure until ZIDSTATUS=03) |
| D5-24 | AUDITORIA · §2 R-07 | SUPERSEDED | Callout: @Op=Insert ported (SCW:18-37); Update/InsertReferencia out of scope |
| D5-40 | PLAN_BP05_EXPOSICION_DATOS · §1, §2, §4 | DONE_BUT_PENDING | CteTelSet read implemented (SCW:414), TelefonoValidado (:485-501), SMS (CreditMethods.cs:194, :419) |
| D6-01 | nomenclatura_campos_sap_en_sigmavi · L46-57 | WRONG_BEHAVIOR | SPART 01 in the order (OM:2251); 00 only in the BP master |
| D6-02 | CHECKLIST_CAMPOS_BP_ECOMMERCE · M.2, Fase 1a, E, D | DONE_BUT_PENDING | Done: toCteCto is an empty row; Kvgr4 exists (Client.cs:106) |

### 8.3 Statements about work that is already done (DONE_BUT_MARKED_PENDING, 39)

| Doc | Ids | Already done |
|---|---|---|
| Business Rules Ecommerce | D2-02, D1-05 | SD36 ZSD_ normalization; both pickup routes use the ByEcommerceId lookup |
| CREDITO_WEB_ANALISIS | D4-16 | DU12-DU19 closed; E1-E5 committed |
| COMPARATIVA_BP | D5-01, D5-03, D5-04 | partner/client returns the BP; TEST literals gone; toCteCto blank |
| 01_CustomersController | D3-02, D3-08 | S1-S4 flow; task headers still say LISTO/DECISION although §1.4 says HECHO |
| AUDITORIA_INTEGRAL | D5-23, D5-29, D5-M02, D5-21, D5-22, D5-25 | cancelOrder wired; createStorepickupCode, codigoPromocion, getSms, validateSms and obtenerCreditos exist; logins and getMinimumCostToRedeem use PostSAP; no GetAwaiter().GetResult() left |
| COMPARATIVA_SETORDER | D5-12, D5-13, D5-14 | forzarOrderOriginal; bank-transfer pickup; SaveGuideAsync position |
| ACTIVIDADES_PENDIENTES | D4-10 | commit 05df55a |
| PLAN_EJECUCION_SP_CREDITO | D4-03 | 10-01 edits committed; D-01 removed the fixed baseline |
| PLAN_FABLE_POR_CONTROLADOR | D3-04, D3-15 | Package 1 S1-S4; credit E1-E5 committed; setreturn is **not** in production; the liberador blocker is the contract, not the URL |
| CHECKLIST_CAMPOS_BP | D6-02, D6-M01 | Fake spouse removed; test values gone |
| CAMBIOS_PARIDAD | D4-26, D4-23 | DU16/12/14/13/19 + SD29 closed; committed |
| PLAN_BP05_EXPOSICION | D5-40 | CteTelSet, TelefonoValidado and SMS implemented |
| GUIA_MIGRACION_FABLE | D3-24 | Lists already in SIGMavi; wallet already SD18 |
| Manual Técnico 01092026 | D5-36 | Async audit closed |
| master_migration_summary_unified | D6-05, D6-06 | Routes exist; only 3 sync actions remain |
| MAVI - DMZ-SAP.csv | D5-32 | getSms, validateSms and codigoPromocion SAP routes exist (DMZ still LAN) |
| CHECKLIST_DEV3_NOSAP | D6-13, D6-M02 | HandlePromoCode throws for unknown ops; E-15 ported |
| REVISION_PLAN 2026-10-05 | D3-05 | Written before S1-S4: SBPC:60, SCUM:68, SCUM:83 are done |
| INVENTARIO_LOGS_SERVICIOSAP.csv | D5-44 | Several Console → Logger.SAP conversions done |
| RESUMEN_Check_list_BPs_Deudor | D6-14 | Zcompania "" |
| solo-s4-no-cpi-ni-abap | D6-11 | No SAP_OAUTH_* key left |
| auditoria-paridad-setorder | D6-03 | D-01 fixed |
| registro_tareas_implementadas | D6-09 | getSms, codigoPromocion, getPlazos, GetPickUpCode implemented |

The parity pass also found these stale points in the 10-05 connections matrix, which is not in the 215 count:
- getCustomerList and deleteCustomerList (CQ12 closed);
- the partner/client response;
- the SD36 folio in the pickup writers (SalesMethods.cs:139-140, :216-224);
- the bank-transfer pickup code (61eb2c3).

See [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]] §2.3 and §8.1.

## 9. Recommended sequence

Rules for every wave:
- Fable/Claude write code only on `\\172.16.214.58\sap`.
- The user compiles in VS, commits one change per commit (GUIA §1.8b) and tests.
- Agents never run SQL, reads included. They hand the query to the user.
- E2E evidence is `Logs/sap.log`.
- Files with uncommitted user edits are touched only after coordinating with the user.

| Wave | What | Ids | Who |
|---|---|---|---|
| **0 · Cleanup and quick wins (now)** | Zero-risk DELETE batch: Neko stubs, Fakes, dead methods and models, commented blocks, unused usings, MVC leftovers, SAP_STAGE, the SD36 dump. Not in the batch: `partner/testnew` and `order/testnew` (wait for the user's answer to GUIA:548) and J3-17 (user's §23 file) | §7.2 a-d minus those items; J2-31 and J1-M06 logging in catches | Fable codes; the user compiles and commits |
| | Code with no decision, by priority | C-01, C-02, C-03, C-04 (route with the interim is_client_valid rule; the DMZ switch is in 4d), C-05, C-06, C-07, C-08/09/10, C-12, C-13/14, C-19, C-21, C-22, C-23, C-25; then the rest of C-11..C-37 | Fable codes; the user compiles, commits and tests |
| | Interim DMZ routing safety (connection items, not parity) | GetAccountDebts :146 and getClienteFactura :51 back to LAN (check LAN accepts the SAP token); GetCreditAmounts :352 back to LAN if DEC-21=A; do not route openpay_cards; do not release the credit branch before T1b | DMZ owner |
| | Vault refresh | §8.2 high items, then §8.3 done-but-pending; Fable only edits Business Rules and the spec board | Fable + doc owners |
| **1 · Decisions session** | In order: DEC-01, 02, 04, 05, 03, 06, 07, 18, 17, 09, 10, 11; then DEC-14/15/16/24 with infra's RC-15 IIS logs; then the rest. Also the GUIA:548 answer on both test routes | §5.2 | User (with the Magento owner for DEC-02) |
| **2 · Read-only checks by the user** | P-15 (BP05 ZidMagento filter and Mail case), P-14, P-17, P-18, P-13, P-16, X-18 sp_helptext | §5.4 | User runs; Fable prepares the queries |
| **3 · External requests** | Send the explicit questions | X-01 DU11, X-02 DU20, X-03, X-05, X-06/X-07, X-19, X-16, X-15 | User sends; Fable drafts |
| **4 · Code waves** | 4a package 1: S5 (lookup/update) → S6 E2E → S7 cutover | T1.1-03, CQ14, CQ21, CQ24, D-14 | Fable codes; user E2E |
| | 4b order/new: contract, pricing, term, stock, region, Openpay, pickup | DEC-02..05, DEC-03, C-11, G04-07/29 | Fable codes |
| | 4c cancel and return, after DEC-06 and the SAP annulment API | G06-03/07/08/09 | Fable codes |
| | 4d credit: switch the DMZ to the C-04 route **before or with** the Magento BP release, and apply the final DEC-07 eligibility rule; liberador after DU11; creditStatus, updateCreditOrderId | C-04 (switch), DEC-07, DEC-08, DEC-32, G05-24 | Fable codes; DMZ owner switches; the user owns §23 |
| | 4e customer service, wallet, abonos | DEC-09..12, DEC-23, DEC-26, DEC-28; nombreCliente, GetIntelisisStatuses | Fable codes |
| | 4f catalog and jobs with Dev 2 Sprint 9 (4-18 Dec) | DEC-14/15, G15-02/06/07/10 | Dev 2 + importer; LAN keeps running until then |
| **5 · E2E** | Per process, real SAP only, evidence in sap.log; compare against LAN outputs | S6 and the equivalents for each package | User |
| **6 · Release** | Data loads before each switch (P-01, P-02, P-06, P-07, P-08, P-10); DMZ switch per route; one environment mechanism; secrets out of Web.config; test routes removed per the GUIA:548 answer; retirement batch (DEC-30) after 30 days of IIS logs (RC-15) | §5.4, J1-13, J1-20 | User + DMZ owner + infra |
| **7 · Re-check** | Re-run the parity check after waves 0, 1 and 4 and against the S6 results; update this document | — | Fable |

## 10. Sources

- [[PARIDAD_LAN_VS_SERVICIOSAP_2026-10-06]]: 161 processes; §1 answer, §1.1 critic notes resolved, §3 per-process table, §4 what we need (C-xx, DEC-xx, X-xx, P-xx), §5 gaps per group, §6 accepted differences, §7 refuted claims, §8 doc corrections, §9 sequence.
- [[CODIGO_BASURA_Y_DOCS_OBSOLETOS_2026-10-06]]: 220 junk-code findings (J1-J8) and 215 obsolete statements (by document).
- Fable plan: [[PLAN_FABLE_POR_CONTROLADOR]], [[REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05]] §3 (packages) and §6 (connection items, RC-xx here), [[01_CustomersController]] §1.4. Credit track: [[PLAN_EJECUCION_SP_CREDITO_A_CODIGO]] §23 and §27. Open user question on the test routes: GUIA_MIGRACION_FABLE.md:548.
- Consolidation input (session scratchpad, `scratchpad\parity\`):
  - `consolidation_inputs.json`: Fable plan status, parity totals, parity critic, junk totals, DELETE and DIVERGES lists, stale totals, high-severity stale items, 29 critical gaps (§4.4).
  - `procs.json`, `gaps.json`: processes and verified gaps behind the parity report.
  - `junk.json`, `stale.json`: junk-code and obsolete-statement findings behind the detail document.
  - `improve_A1.json`, `improve_A2.json`, `improve_A3.json`: per-method improvements (A1 order/credit/abonos/wallet; A2 customers/customer service/BP/helpers/models; A3 catalog/export/pickup/Openpay/product), summarized in §6.
- Code versions: ServicioSAP HEAD 6214ed8 + uncommitted S1-S4; DMZ ConexionSAP 09cb341; LAN stage-delta 68b2290 (origin/Production where noted).

## 11. Test observations (2026-10-06, credit purchase through DMZ `order/setOrder`)

> [!warning] Check where the DMZ points before every test
> The DMZ sends every `PostSAP`/`GetSAP`/`PatchSAP` to `URL_SAP` + route (DMZ `Helper/Curl.cs:23`, `:127`). The key lives in the DMZ `Web.config` (lines 16-19, commented/uncommented pairs of `URL_INTELISIS` and `URL_SAP`). During the user's test `URL_SAP` still pointed to **QA** instead of the **local** ServicioSAP, so every call went to the QA IIS (`C:\inetpub\wwwroot\sap`). That server runs a DLL built from another copy of the code (its stack trace shows `C:\Users\<dev>\dev\ServicioSAP\...`), not the share, so the share's changes were not there and it kept answering 500. **Before any E2E or diagnosis through the DMZ:** (1) confirm the host in `URL_SAP` (and `URL_INTELISIS`) of the DMZ instance being run; (2) confirm the date of `bin\ServicioSap.dll` of that ServicioSAP instance is the expected build. Switching environments by commenting lines in `Web.config` is error-prone (see RC-04 per-environment config in §5.4).

| # | Finding | Cause | Fix (2026-10-06, uncommitted; the user compiles) |
|---|---|---|---|
| T-01 | 500 `Access to the path 'C:\inetpub\wwwroot\sap\Logs' is denied` on `order/new` | `Helpers/Logger.cs` created `<site>\Logs` outside the `try`; the IIS pool has no write permission on the QA server. In the credit path the logger only runs on error branches (`OrderMethods.cs:606`, `:626`, `:667`, `OrderController.cs:45`), so the logger failure hid the real error | CQ21 option B: the whole local-log block is inside the `try` (`Logger.cs:25-45`); T1.5-04 marked done in [[01_CustomersController]] §1.4. On the server, alternatively, create `Logs` with write permission for the pool |
| T-02 | `The JSON value could not be converted to System.Nullable`1[System.Int32]. Path: $[0].ZfecUltPag` in `BusinessPartnerMethods.GetClientAsync` (`:28-70`) | `Partner.ZfecUltPag` (last payment date) was declared `int?` (`Models/SAP/BusinessPartner/Partner.cs:81`, unchanged since b908a8f, 2026-06-15); `ZB_DATOS_CLIENTE` returns it as text. BPs without a last payment (null) worked; a BP with payments fails. Not caused by S1-S4 (GetClientAsync and Partner.cs were not touched) | `Partner.cs:81` → `string` (same type as BP05MA `BusinessEntitiesMa.cs:333`). Nothing reads `Partner.ZfecUltPag`; `ZfecUltPag = null` in `BusinessPartnerMethods.cs:623` and `OrderMethods.cs:2870` are on `Cte` (already string). Affects every reader of `ZB_DATOS_CLIENTE` through `Partner`: `GetClientAsync` (OrderMethods.cs:723 credit check → it turned into `"sin cuenta"`, :1917; CreditMethods.cs:397; StorePickupMethods.cs:268, :344; BusinessPartnerController.cs:25, :155) and `GetFilterClientsAsync` (CustomerMethods.cs:89; ProspectoController.cs:49) |
