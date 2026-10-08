---
tags: [migracion, sap, paridad]
fecha: 2026-10-06
estado: vigente
---

# Parity LAN vs ServicioSAP - every process - 2026-10-06

Code read on 2026-10-06, read-only. No edits, SQL or HTTP calls were made. Versions:
- ServicioSAP: HEAD 6214ed8 plus the uncommitted S1-S4 edits.
- DMZ: branch ConexionSAP 09cb341 (clean).
- LAN: stage-delta (68b2290). origin/Production was used where noted.
- Magento248 app/code was used for callers.

Every group comparison was checked adversarially. This report applies that check:
- REFUTED gaps are dropped.
- CORRECTED texts and status corrections are applied.
- Missed gaps found by the verifier are added.
- The completeness critic's notes are resolved in §1.1.

Status legend:
- **EQ**: same business rules.
- **EQ_ACCEPTED**: same, except differences the user already accepted.
- **PARTIAL**: route exists with some rules missing.
- **DIF**: route exists but behaves differently in a way that matters.
- **MISSING**: no ServicioSAP equivalent and nobody outside is blocking it.
- **BLOCKED**: waiting on another team or system.
- **RETIRE_CANDIDATE**: proposed for retirement, pending the user.
- **OUT_OF_SCOPE**: Magento-direct, DMZ-local, Credilana, APP mercancías or Neko.

## 1. Answer

**161 processes** were compared: DMZ routes, LAN-only routes, LAN background jobs and the ServicioSAP routes that replace them, in 15 groups.

| Status | Count |
|---|---|
| EQ | 7 |
| EQ_ACCEPTED | 6 |
| PARTIAL | 31 |
| DIF | 11 |
| MISSING | 22 |
| BLOCKED | 22 |
| RETIRE_CANDIDATE | 19 |
| OUT_OF_SCOPE | 43 |
| **Total** | **161** |

- **13 processes are at business-rule parity** (EQ + EQ_ACCEPTED).
- 99 processes have to keep working after LAN is switched off (161 minus 43 out of scope and 19 retire candidates). Only 13 of those 99 are at parity today.
- Verified gaps: **376 confirmed** and **3 refuted**.
- By need: 182 DECISION, 96 CODE, 75 EXTERNAL, 21 DATA, 2 CONFIG.
- The counts include some deliberate duplicates where two groups saw the same defect from different routes. For example, the Openpay job appears as G04-01, G06-19 and G14-14. The pickup writers appear as G14-04..07 and G15-30..34.

**What it takes to reach LAN business-rule parity.** Four things come first:

1. **Close the order/new defects that corrupt data today.** No decision is needed for these.
   - SAP errors are treated as success (G04-27).
   - The cancel lookup builds ZSD_T_/ZSD_P_, so every Magento cancel fails (G06-01).
   - The liberador callback keys are wrong (T1a).
   - The ZidMagento PATCH has no sap-client (G10-02).
   - Customers born before 1970 cannot log in (G7-19).
   - recuperarcuenta has an injectable filter (G02-07).
   - The store_pickup status is rejected by Magento (G14-43).
2. **Take about 12 high-impact decisions that are open today.**
   - Customer create-or-reuse (D-19).
   - The setOrder response contract (R7a-1/C-11).
   - Openpay (D-38).
   - Pricing: precioEspecial and the SD29 floor (R7a-4).
   - The cash payment term (G04-28).
   - Cancel and return policy (D-35/D-36).
   - Credit gate eligibility (D-48).
   - The GetAccountDebts and getClienteFactura contracts (D-43, D-52).
   - Wallet (D-28/D-29).
   - Ownership of the catalog and import jobs (C-16).
   - The pickup routes and their caller (C-15).
3. **Get deliveries from other teams.**
   - The liberador contract (DU11, Valentín).
   - The SD annulment API ZIDSTATUS=03 and the ZIdEcommerce OData (SAP SD).
   - The payment-intent write target (R8-08/R8-09, Dev 4/ABAP).
   - The credit-balance sources (N1-N6).
   - Dev 2 Sprint 9 for the product, price and stock jobs.
4. **Load the data that ServicioSAP reads but nobody fills.**
   - servicio_guias.
   - BpRecogePedidos (open codes).
   - mavi_credilana_info.
   - The SIGMAVI coupon and condition rows.
   - The Openpay keys and the RECHAZAOPENPAY list.

Until (1) and (2) are closed, the routes already switched to ServicioSAP produce wrong data on real traffic: setCustomer, setOrder, cancelOrder, returnOrder, GetAccountDebts, getClienteFactura, wallet/details and getMinimumCostToRedeem.

### 1.1 Critic notes resolved

| Topic | Resolution |
|---|---|
| Neko trio (ApplyPaymentNeko, UpdateStatusPaymentNeko, bbvaKeyNeko) | **OUT_OF_SCOPE** in every group. The SS stubs (AbonosController.cs:51-84) must never be connected. The DMZ still forwards to LAN (DMZ CustomerServiceController.cs:164, :197, :272). |
| POST order/authorizationResult | The route is **OUT_OF_SCOPE**: a Magento pass-through (DMZ OrdersController.cs:421-458; 10-05 matrix row 118). The real gap is on the caller side and is tracked once, under the liberador row (G14, BLOCKED). It holds the CX-17/T1a key fix as CODE (OrderMethods.cs:1257-1263). G05 no longer reports a DIF. |
| POST order/validateCredit | One status: **RETIRE_CANDIDATE**. The DMZ route is inside a block comment (DMZ OrdersController.cs:366-402), so it is not a live DMZ route. The LAN route is still live (LAN OrdersController.cs:457-483) with no DMZ caller. |
| Store pickup codes | createStorepickupCode and generateNewStorepickupCode are both **DIF**. Both are implemented in StorePickupMethods. Both share the joint keep-or-retire question (C-15, REVISION 2026-10-05:902). |
| Product import | Split per store and step (G15). Store ma is PARTIAL. viu and mavi are MISSING (ProductController.cs:33-38 return "no implementado"). etiquetas is PARTIAL. The optimized-image filter is EQ. The DIM11 stock reads are EQ. ecommerce/listado is RETIRE_CANDIDATE. The LAN push jobs (product, price, stock) are BLOCKED on C-16 and Dev 2 Sprint 9. |
| Agent lookup (setOrder Agente vs GetEmpleadoByNomina) | One joint decision, **DEC-25**: is SuccessFactors (partner/successfactor/employee, BusinessPartnerController.cs:180-194) the agent source for both? The setOrder agent row stays BLOCKED, because it also needs MAVI's generic agent. GetEmpleadoByNomina stays MISSING. Both are tied to DEC-25. |
| MovBita | It is not a separate process. It is recorded as **option (E)** of the creditStatus source decision (Q-T2-1, DEC-32). It is valid only if the credit area confirms that web credit writes ZSDT_MOVBITA. |

## 2. What changed since 2026-10-05

### 2.1 S1-S4 code (uncommitted ServicioSAP working copy; nothing tested end to end yet, S6)

| Change | Where |
|---|---|
| partner/client returns the BP number as a string, `Ok(result.Partner.Trim())`, instead of the whole Client object | BusinessPartnerController.cs:60 |
| An empty Partner from BP01 returns 200 `"Error, <to_return>"` (CQ6/CQ8 option d) | BusinessPartnerController.cs:48-59 |
| Sntz on the same 7 fields as LAN (CQ7). New helper. | SntzMethods.cs:12-28; BusinessPartnerMethods.cs:394-405 |
| NameFirst, NameLast, NameLst2 and SmtpAddr are stored in UPPERCASE (CQ1=B) | BusinessPartnerMethods.cs:394-397, :484 |
| `int.Parse(Sntz(idMagento))` replaces ParseMagentoId (CQ5) | BusinessPartnerMethods.cs:401-404 |
| Dead code removed (CQ9). Lines in BusinessPartnerMethods shifted by about 56. | e.g. GetClientMaAsync :266-309, LinkMagentoAccountAsync :779-819, GetWholesaleCustomerNameAsync :856-884 |
| setCustomerList: email URL-encoded in the BP05 filter (CQ13); SQL errors rethrown (CQ12=A) | CustomerMethods.cs:83, :68 |
| ConfigureAwait(false) only, no behavior change | CashReportMethods.cs:67; MagentoAccountMethods.cs:25, :35 |

### 2.2 Side effects of S1-S4 found today

- Uppercase storage breaks lookups that match exact text:
  - setCustomerList BP05 `Mail eq` (CustomerMethods.cs:82-83, G01-07).
  - recuperarcuenta `PrimerNombre eq` (ProspectoController.cs:47, G02-06).
- The order BP builder (OrderMethods.cs:2659-2730) has neither Sntz nor uppercase. Customer masters now come out in two formats (G04-08/09).
- The anonymized real payload captured for CQ10 (idMagento "") now fails at BusinessPartnerMethods.cs:404 (G01-04, a release risk).

### 2.3 Other changes found

- **No business code changed** since 2026-10-05 in order, credit, wallet, customerService, abonos, catalog, pickup or product. The DMZ is unchanged.
- The credit rule count is now **120/160** (it was 119): TEL-1 (2026-10-02) closes G3-04.
- The 10-05 matrix is stale on several points that are already fixed in code:
  - getCustomerList and deleteCustomerList (CQ12).
  - The partner/client response.
  - The SD36 folio in the pickup writers (SalesMethods.cs:139-140, :216-224).
  - The bank-transfer pickup code (ported in 61eb2c3, OrderMethods.cs:1959-1975).
- New critical or high findings in this pass:
  - order/new treats a SAP response with `to_return` Type E and an empty `Salesdocument` as success. It then runs the address, setCAccount and pickup steps (OrderMethods.cs:1890-1975; sap.log 2026-07-17) — **G04-27**.
  - Every Magento cancel fails. Magento sends tipo T/P, so FullCancelAsync searches ZSD_T_/ZSD_P_ (OrderMethods.cs:3010-3011) — **G06-01**.
  - Every RMA fails. Magento sends no `store`, so the call throws "No lleva id de tienda" (OrderMethods.cs:366-368), the DMZ answers 200 and Magento marks the RMA synced — **G06-07**.
  - Cash orders are booked with the article's 12-month credit term (OrderMethods.cs:2255-2277) — **G04-28**.
  - The cash region rewrite reads `estado` instead of the postal code and corrupts phone SKUs, e.g. -R5 becomes -RJ (OrderMethods.cs:1828, :2116-2181) — **G04-13**.
  - The SD29 price floor takes an arbitrary row across org, condition and branch (FinalListProperMethods.cs:82-85; OrderMethods.cs:2014) — **G04-11**.
  - Magento rejects every credit order of a BP customer while the gate GetPhoneValidatedClientSecretName stays on LAN (Magento SaveOrder.php:42-49) — **G10-22**.
  - createStorepickupCode sends `products: []`, which Magento checkParams rejects. ServicioSAP still reports success (StorePickupMethods.cs:430) — **G14-43**.
  - recuperarcuenta builds an anonymous, injectable OData filter that can disclose BP numbers (ProspectoController.cs:47) — **G02-07**.
  - getClienteFactura ignores `{cliente}` and returns any invoice's installments (AbonoMethods.cs:68) — **G11-07**.
  - wallet/details serializes with System.Text.Json. Magento strips backslashes, so accented text arrives garbled (WalletCustomerController.cs:50) — **G03-07**.
  - The ZidMagento PATCH has no sap-client=110 (BusinessPartnerMethods.cs:786-787) — **G10-02**.
  - The order BP stores ZidMagento=0, because the payload sends `cliente`, not `idMagento` (OrderMethods.cs:2826) — **G04-29**.
  - DMZ GetPickUpCode still reads LAN, while order/new writes new pickup codes to SIGMAVI (DMZ OrdersController.cs:262) — **G06-13** (corrected).
  - The exportaart image filter fails open and publishes articles without images (EcommerceMethods.cs:623-627, :641-645) — **G15-01**.

## 3. Parity table per process

Rules column = rules equal / rules compared. "–" means not compared: a pass-through, or an extra route.

| Group | Process | DMZ today | ServicioSAP equivalent | Status | Rules | Main gap |
|---|---|---|---|---|---|---|
| G01 | POST customer/setCustomer | SS | POST partner/client | **DIF** | 17/23 | Always creates a new BP (Partner="" BusinessPartnerMethods.cs:435). No lookup by idMagento (G01-01). Exception gives Magento 200 "WebException" (G01-03). |
| G01 | POST customer/setCustomerList | SS | CustomersController.cs:15-55 | PARTIAL | 14/22 | BP05 `Mail eq` is case-sensitive (G01-07). SIGMavi SP cannot be read (G01-08). |
| G01 | customer/getCustomerList | SS | CustomersController.cs:57-77 | EQ_ACCEPTED | 14/16 | SpListaNBMagento collation not verifiable (G01-09) |
| G01 | POST customer/deleteCustomerList | SS | CustomersController.cs:79-88 | EQ_ACCEPTED | 13/16 | White-list-only delete not verifiable (G01-10) |
| G01 | POST customer/cashCustomerReport | SS | CashReportMethods.cs:47-87 | EQ_ACCEPTED | 15/15 | Logger can throw inside catch (G01-11/CQ21) |
| G01 | POST customer/getCuenta (LAN-only) | none | MagentoAccountMethods.cs:21-28 | PARTIAL | 5/6 | 500 after 3 retries vs LAN 200 e.Message (CQ24) |
| G01 | POST customer/setCuenta (LAN-only) | none | MagentoAccountMethods.cs:31-38 | PARTIAL | 5/7 | Up to 3 writes, 30 s timeout (G01-13/14) |
| G02 | POST prospecto/rfc | LAN | none | MISSING | 0/11 | Scope D-23. Annexes I-III (D-24) |
| G02 | POST prospecto/recuperarcuenta | SS | ProspectoController.cs:18-73 | PARTIAL | 6/15 | Filter injection; case mismatch; masking (G02-06/07/08) |
| G02 | GET company/wholesale-customer | SS | BusinessPartnerMethods.cs:856-884 | PARTIAL | 6/8 | SAP 404 becomes 500, then DMZ 200 "WebException" (G02-12) |
| G02 | POST company/negotiable-quote/create | LAN | none | RETIRE_CANDIDATE | 0/8 | D-27 |
| G03 | POST customer/wallet/details | SS | WalletCustomerController.cs:16-56 | **DIF** | 4/11 | Ignores uen; titular is a BP code; ó escaping (G03-01/03/07) |
| G03 | POST customer/wallet/getMinimumCostToRedeem | SS | WalletMethods.cs:28-240 | **DIF** | 4/12 | No per-family algorithm; invented fallback channel (G03-08/09/11) |
| G03 | customer/wallet/getCuentaC | LAN (broken path) | none | RETIRE_CANDIDATE | 0/3 | D-31 |
| G03 | status/getStatus | LAN | none | RETIRE_CANDIDATE | 0/2 | D-30 |
| G03 | recommender/* (3 routes) | LAN | none | RETIRE_CANDIDATE | 0/8 | D-31 |
| G04 | setOrder: intake, SKU grouping, PedidoExistente | SS | OrderMethods.cs:88-108, :1748-1772 | EQ | 5/5 | – |
| G04 | setOrder: openpay_cards | SS | OrderMethods.cs:1777-1786 | PARTIAL | 2/6 | Paid card orders never reach SAP (G04-01, D-38) |
| G04 | setOrder: openpay_stores (Paynet) | SS | OrderMethods.cs:1788-1792 | PARTIAL | 2/4 | Rejected without cuenta; no expiry job (G04-03/04) |
| G04 | setOrder: paypal (paid at checkout) | SS | OrderMethods.cs:1941-1951 | PARTIAL | 1/3 | No posting, no wallet (G04-05/06) |
| G04 | setOrder: BP resolution / auto-creation | SS | OrderMethods.cs:2576-2981 | PARTIAL | 2/7 | New BP on every order; ZidMagento=0 (G04-07/29) |
| G04 | setOrder: lines, prices, SD29, stock, region, totals | SS | OrderMethods.cs:1995-2565 | **DIF** | 4/13 | precio instead of precioEspecial; floor; region rewrite; cash term (G04-11/13/28) |
| G04 | setOrder: agent (Agente) | SS | OrderMethods.cs:2385-2394 | BLOCKED | 2/3 | Generic agent from MAVI; DEC-25 (G04-17) |
| G04 | setOrder: coupon/line discounts | SS | OrderMethods.cs:2491-2533 | PARTIAL | 1/2 | descuento never booked (G04-18) |
| G04 | setOrder: instore_pickup | SS | OrderMethods.cs:1926-1975 | PARTIAL | 2/5 | RegisterPickupClientInfo is a stub with the wrong index (G04-19) |
| G04 | setOrder: servicio_guias | SS | OrderMethods.cs:1851 | PARTIAL | 2/3 | Saved after the checks (G04-22) |
| G04 | setOrder: delivery data | SS | OrderMethods.cs:1415-1544 | PARTIAL | 3/6 | PurchNoS is empty, so the address is never linked (G04-23) |
| G04 | setOrder: response contract / setCAccount | SS | OrderController.cs:26-47 | **DIF** | 1/6 | Object instead of a bare string; SAP E treated as success (G04-25/27) |
| G04 | POST order/ManagePaynetOrders | LAN | none | BLOCKED | 0/3 | SAP release/cancel API (G04-26) |
| G05 | setOrder credit branch | SS | OrderMethods.cs:1797-1820 | PARTIAL | 117/150 | Liberador not triggered (DU11); duplicate on resend; contract (G05-01/02/03) |
| G05 | GET order/creditStatus/{id} | LAN | none (MovBita = option E) | BLOCKED | 0/12 | Source of the credit decision (Q-T2-1) |
| G05 | POST order/updateCreditOrderId | LAN | none | BLOCKED | 0/9 | ZIdEcommerce OData (DU20) |
| G05 | POST order/authorizationResult (DMZ route) | Magento | – | OUT_OF_SCOPE | – | Caller gap is in the liberador row |
| G05 | POST order/validateCredit | commented | none | RETIRE_CANDIDATE | 0/2 | G05-40 |
| G06 | POST order/cancelOrder | SS | OrderMethods.cs:3002-3107 | **DIF** | 3/9 | tipo T/P breaks every cancel; no annulment (G06-01/02) |
| G06 | POST order/returnOrder → setreturn | SS | OrderMethods.cs:1623-1734 | **DIF** | 5/11 | store null breaks every RMA; condition overwritten (G06-07/08) |
| G06 | POST order/getGuide | SS | OrderMethods.cs:559-575 | EQ | 5/5 | Pre-cutover rows must be copied (G06-12) |
| G06 | POST order/GetPickUpCode | LAN | StorePickupMethods.cs:18-40 | EQ | 5/5 | Reader on LAN, writer on SS (G06-13) |
| G06 | POST order/InsertPaymentData | LAN | none | MISSING | 0/4 | Destination of Openpay installment payments (G06-15) |
| G06 | POST order/GetIntelisisStatuses | LAN | none | MISSING | 0/5 | Build on SD36 + billing (G06-16) |
| G06 | POST order/getPosCancellations | LAN | none | BLOCKED | 0/6 | List OData (G06-17) |
| G06 | GET order/estimated-delivery | LAN | none | BLOCKED | 0/5 | Carrier tracking source (G06-18) |
| G06 | order/checkOpenpay job (cards + stores) | none | none | MISSING | 2/14 | D-38 (G06-19/20, G14-14..19) |
| G06 | order/sendStorePickupEmail, setOrderStatus (DMZ), getOrderInfo, jsonOrders, setCAccount, getprueba (6 routes) | Magento / DMZ-local | – | OUT_OF_SCOPE | – | – |
| G07 | customerService/obtenerTipoGarantia | LAN | none | BLOCKED | 0/7 | DM0415 table (G7-01) |
| G07 | customerService/obtenerVentanaConfirmacion | LAN | none | MISSING | 0/7 | Source decision (G7-03) |
| G07 | customerService/unirCuenta | SS | BusinessPartnerController.cs:89-108 | PARTIAL | 7/8 | id ≤0 rejected (G7-05) |
| G07 | customerService/validarCliente | SS | CustomerServiceMethods.cs:195-221 | PARTIAL | 5/9 | NameFirst only; errors read as "not found" (G7-07/09) |
| G07 | customerService/nombreCliente | LAN | none | MISSING | 0/8 | Build on BP05MA + TelefonoValidado (G7-12) |
| G07 | customerService/bitacoraAtencionClientes | LAN | none | MISSING | 0/9 | SP writes Intelisis RM1138 (G7-13) |
| G07 | customerService/obtenerQuejas | SS | CustomerServiceMethods.cs:39-87 | EQ | 6/6 | – |
| G07 | customerService/LoginClienteCredito | SS | CustomerServiceMethods.cs:223-253 | PARTIAL | 3/7 | Email field; error→false (G7-15/16) |
| G07 | customerService/LoginClienteCreditoFechaN | SS | CustomerServiceMethods.cs:255-318 | PARTIAL | 5/11 | Pre-1970 births cannot log in (G7-19) |
| G07 | customerService/GetEmpleadoByNomina | LAN | none | MISSING | 0/6 | Retire or build; DEC-25 (G7-25) |
| G08 | customerService/GetAccountDebts | SS | AbonoMethods.cs:19-51 | **DIF** | 1/14 | Raw EX01 array instead of grouped LAN shape (G08-01) |
| G08 | ApplyPaymentNeko, UpdateStatusPaymentNeko, bbvaKeyNeko (3) | LAN | stubs (do not connect) | OUT_OF_SCOPE | – | D-41 |
| G08 | customerService/ApplyPaymentAdvanced | LAN | none | BLOCKED | 0/6 | Write target R8-08 |
| G08 | customerService/UpdateStatusPaymentAdvanced | LAN | none | BLOCKED | 0/6 | Update op R8-09 |
| G08 | customerService/GetSTPAccount | LAN | GetClabeSTP (read only) | BLOCKED | 0/8 | R8-08, R8-10 |
| G08 | customerService/GetSalesChannelsSTP | LAN | SD52 (building block) | MISSING | 0/4 | Legacy channel map R8-11 |
| G08 | customerService/ValidateSTPAccount | LAN | GetClabeSTP (building block) | MISSING | 1/6 | Row selection R8-10 |
| G08 | customerService/bbvaKeyAdvanced | SS | CustomerServiceMethods.cs:91-153 | EQ | 7/7 | – |
| G09 | customerService/obtenerCreditos | LAN | CustomerServiceMethods.cs:327-531 | PARTIAL | 9/20 | Pending/rejected applications invisible; status (G09-01/02) |
| G09 | customerService/validarCoberturaPorCP | LAN | none | MISSING | 0/7 | Coverage source (G09-20) |
| G09 | customerService/ObtenerEstatusEmbarque | LAN | none | BLOCKED | 0/5 | Shipment status (G09-30) |
| G09 | Tablerate trio (3 routes) | LAN (404) | none | RETIRE_CANDIDATE | 0/0 | R8-18 |
| G10 | credit/getSms | LAN | CreditMethods.cs:290-381 | PARTIAL | 12/13 | PATCH failure stops the SMS; no sap-client (G10-01/02) |
| G10 | credit/validateSms | LAN | CreditMethods.cs:489-517 | EQ_ACCEPTED | 6/6 | – |
| G10 | credit/codigoPromocion | LAN | CreditMethods.cs:16-68 | RETIRE_CANDIDATE | 6/10 | D-45 (keep: G10-06..09) |
| G10 | credit/GetPhoneValidatedClientSecretName | LAN | none | MISSING | 0/10 | Gate blocks every BP credit order (G10-10/22) |
| G10 | credit/SendSmsNewNumber | SS | CreditMethods.cs:174-287 | PARTIAL | 9/10 | Empty idRef (G10-14); dispatcher (G10-15) |
| G10 | credit/getCreditAccount | LAN | none | MISSING | 0/3 | Scope D-51 |
| G10 | credit/Validar_Lada, ExistRFCAndPhoneCte, codigoRecomendado, codigoRecomendadoWithUen (4) | LAN | none | RETIRE_CANDIDATE | 0/15 | D-31 |
| G11 | credit/getClienteSaldo | LAN | none | BLOCKED | 0/7 | N1-N6 sources |
| G11 | credit/getClienteFactura | SS | AbonoMethods.cs:54-93 | **DIF** | 0/9 | Array gives DMZ 500; ignores cliente (G11-06/07) |
| G11 | credit/MonederoSaldoCredito | LAN | SD18 (building block) | MISSING | 0/5 | R9-08 |
| G11 | Wallet unification (3 routes) | LAN | none | BLOCKED | 0/15 | Storage + process (R9-09) |
| G11 | credit/GetCreditAmounts | SS | CredilanaMethods.cs:14-36 | PARTIAL | 7/8 | Nobody fills the cache; scope D-49 |
| G11 | credit/getPlazos | SS | CreditMethods.cs:70-172 | PARTIAL | 4/6 | Error shape D-46 |
| G11 | credit/guardardocumento | SS | DocumentMethods.cs:42-180 | EQ_ACCEPTED | 8/9 | Client-key test (CX-07) |
| G11 | credit/SaveImagesProductosMx | SS | DocumentMethods.cs:188-347 | EQ_ACCEPTED | 7/8 | Folder config |
| G11 | credit/SaveCredilanaInfo (LAN-only) | none | none | OUT_OF_SCOPE | – | Credilana |
| G12 | credit/CreditoWeb_FormDatos | LAN | none | MISSING | 0/6 | Scope R9-10/R9-15 |
| G12 | credit/CreditoWeb_SaveFirstData | LAN | none | MISSING | 0/11 | ProductosMX timing |
| G12 | credit/CreditoWeb_SaveData_Articulos | LAN | none | MISSING | 0/9 | ProductosMX timing |
| G12 | credit/CreditoWeb_SaveData | LAN | none (order/new is a different flow) | MISSING | 0/8 | APERTURA CUENTA scope (G12-16) |
| G12 | credit/SaveHaztenTransaction | LAN | none | MISSING | 0/6 | Follows the APERTURA/ProductosMX decision |
| G12 | CreditoWeb_Informacion, _Solicitud, _SolicitudPrimerGuardado, _Seguro, SolicitudMercancia (5) | LAN | – | OUT_OF_SCOPE | – | Credilana / APP mercancías |
| G13 | product/* pass-through (7 routes) | Magento / DMZ-local | – | OUT_OF_SCOPE | – | D-53 |
| G13 | product/getStockByStore (DMZ stub + LAN route) | DMZ-local | none | RETIRE_CANDIDATE | – | D-31 |
| G13 | magento/* (13 routes) | Magento | – | OUT_OF_SCOPE | – | – |
| G13 | mercancias/* (5 routes) | LAN | – | OUT_OF_SCOPE | – | D-55 |
| G13 | login/authenticate, logging (2) | DMZ-local | – | OUT_OF_SCOPE | – | – |
| G13 | SS catalog/cargaCompleta (E-16..E-22) | none | CatalogController.cs:12-33 | PARTIAL | 8/14 | E-22 branch; no caller; wrong data.db (G13-01/03) |
| G13 | SS catalog/children (E-21) | none | CatalogController.cs:147-184 | PARTIAL | 5/6 | No caller; data.db (G13-07) |
| G13 | SS catalog/deletePromociones (E-23) | none | CatalogController.cs:35-49 | PARTIAL | 2/4 | No caller; 3 retries (G13-08/09) |
| G13 | SS catalog/deleteReservations (E-24) | none | CatalogController.cs:51-65 | PARTIAL | 1/3 | No caller (G13-10) |
| G14 | order/createStorepickupCode (LAN-only) | none | OrderController.cs:244-262 | **DIF** | 8/13 | GET vs POST; products [] rejected by Magento (G14-43) |
| G14 | order/generateNewStorepickupCode (LAN-only) | none | OrderController.cs:224-242 | **DIF** | 6/12 | SMTP instead of Magento email; retire? (G15-24, C-15) |
| G14 | order/getOrderId (LAN-only) | none | none | RETIRE_CANDIDATE | – | Retirement premise wrong (G14-12) |
| G14 | order/getOrderInfoAndSet (LAN-only) | none | none | RETIRE_CANDIDATE | – | R7e-5 |
| G14 | LAN order/setOrderStatus (inbound) | none | none | MISSING | 0/6 | R7-1 (G14-20) |
| G14 | Liberador trigger + authorizationResult callback | none | LiberadorCreditoMethods.cs:48-107; OrderMethods.cs:673-707 (commented) | BLOCKED | 4/9 | DU11; keys T1a (G14-22..25) |
| G14 | LAN product/updateConfigurableProduct push | none | none | BLOCKED | 2/3 | Dev 2 Sprint 9 (G14-31) |
| G14 | LAN product/updateProductJsonOnly | none | none | BLOCKED | 0/2 | Dev 2 Sprint 9 |
| G14 | LAN product/updatePrice job | none | none | BLOCKED | 0/7 | Dev 2 Sprint 9; warranty source (G15-39) |
| G14 | LAN product/updateStockMavi | none | none | BLOCKED | 0/3 | MAVI store keep? (G15-11/22) |
| G14 | LAN product/updateStock (delta) | none | DIM11 read + E-24 | BLOCKED | 1/6 | C-16 (G15-20) |
| G14 | LAN product/existenciasAlmacenArt | none | DIM11 read | BLOCKED | 0/4 | C-16 (G15-23) |
| G14 | product/obtenerImagen (E-14) | none | ProductImageMethods.cs:34-69 | PARTIAL | 6/8 | Overwrite; folder (G14-38/39) |
| G14 | Outbound emails (pickup, bank transfer, purchase) | none | MailHelper.cs; StorePickupMethods.cs | PARTIAL | 4/9 | Order number, text, year (G14-40..42) |
| G15 | product/exportaart/ma | none | EcommerceMethods.cs:1271-1527 | PARTIAL | 6/15 | No configurables, credit matrix, special prices or persistence (G15-01..09) |
| G15 | product/exportaart/viu | none | BadRequest | MISSING | 0/3 | G15-10 |
| G15 | product/exportaart/mavi | none | BadRequest | MISSING | 0/3 | Keep MAVI store? (G15-11) |
| G15 | ecommerce/listado | none | EcommerceController.cs:12-26 | RETIRE_CANDIDATE | – | Diagnostic dump |
| G15 | etiquetas | none | ProductMethods.cs:1347-1373 | PARTIAL | 1/11 | No tag build rules (G15-13) |
| G15 | ma/imagenes/optimizadas (+refresh, cache/clear) | none | ImagenMethods.cs:22-92 | EQ | 4/4 | Table feed (G15-16) |
| G15 | product/stock, stock/serial, stock/filter (DIM11 reads) | none | ProductMethods.cs:170-300 | EQ | 2/2 | Escaping (G15-17) |

Row counts: grouped rows count as their number of routes. Total 161.

## 4. What we need now

### 4.1 Code we can write now in ServicioSAP (no decision needed)

Ordered by impact. Every item is in ServicioSAP unless noted. Rule from memory: the current SpExportaEcommerce code governs; no commits and no tests; the user compiles.

| id | Process | Impact | What to change | known_ref |
|---|---|---|---|---|
| C-01 (G04-27) | setOrder | critical | After deserializing (OrderMethods.cs:1900-1903): if `to_result.Salesdocument` is empty or `to_return` has Type E/A, return Resultado "Error" with the E messages, and skip :1913-1975 (address, setCAccount, pickup). | CQ8 (analogous), R7a-1 |
| C-02 (G06-01) | cancelOrder | critical | In FullCancelAsync (OrderMethods.cs:3007-3012), and also :3180-3185 and :119-122, treat T/P as the total/partial flag and look up ZSD_ZMER_ then ZSD_ZPRE_ (reuse SalesMethods.cs:216-224). The user only confirms D-35. | R7b-1, D-35 |
| C-03 (G05-30/G14-24) | liberador callback | critical (latent) | Payload `new { entityId, status, cuenta, idSolicitud }` at OrderMethods.cs:1257-1263. | T1a, CX-17 |
| C-04 (G10-10/G10-22) | credit gate | critical | New POST credit/GetPhoneValidatedClientSecretName {Cliente, Uen}, returning LAN's 6 keys. Use the names from ZB_DATOS_CLIENTE (Partner.cs:167-170) masked like HideNames, the phone from GetTelefonoValidadoAsync masked like HidePhoneNumber, and is_phone_validated = phone non-empty (D-48 option C). Interim is_client_valid = existing non-prospect BP until DEC-07. The DMZ switch must come before or with the Magento BP release. | R9-14, D-48, TQ-8 |
| C-05 (G10-02) | getSms | high | Add `?sap-client=110` to the CSRF and PATCH URLs in LinkMagentoAccountAsync (BusinessPartnerMethods.cs:786-787). | NIP-1 |
| C-06 (G7-19) | LoginClienteCreditoFechaN | high | Regex `-?\d+` at CustomerServiceMethods.cs:282, or reuse SolicitudCreditoWebMethods.FechaSap (:604-625). | R8-04 |
| C-07 (G02-07, G02-06) | recuperarcuenta | high (security) | Escape the 3 names and rfc (`Replace("'","''")` + `Uri.EscapeDataString`, as CustomerMethods.cs:82-83). Also apply `.Trim().ToUpperInvariant()` after QuitarAcentos (ProspectoController.cs:34-36, :47). | D-25 P2-Q5, GUIA C12 |
| C-08 (G14-43) | createStorepickupCode | high | Remove `products` from the status payload (StorePickupMethods.cs:430). Check statusResponse for "true" and return the failure estado. | R7d-5, RRSC-4 |
| C-09 (G15-31, G14-05) | createStorepickupCode | high | `Regex.Replace(telefono,"[^0-9]","")` before INSERT/UPDATE (StorePickupMethods.cs:348, :394, :409). Truncate Nombre/Correo to the column sizes (G15-41). | – |
| C-10 (G15-30) | createStorepickupCode | high | Accept POST as well as GET (OrderController.cs:244). The response contract waits for DEC-16. | C-13 |
| C-11 (G04-19) | setOrder pickup | high | Implement RegisterPickupClientInfo as an INSERT into BpRecogePedidos when the row is absent, with the email index fixed (OrderMethods.cs:1572-1586, :1931). | COMPARATIVA D-03/D-11 |
| C-12 (G11-07, G11-26) | getClienteFactura | high | Add `and Partner eq '<cliente>'` to the zsplits filter. Validate and escape `factura` (AbonoMethods.cs:68). | – |
| C-13 (G15-01) | exportaart/ma | high | Make FiltrarArticulosConImagenAsync fail closed (EcommerceMethods.cs:623-627, :641-645). | – |
| C-14 (G15-09) | exportaart/ma | high | Rethrow, or set Exitoso/MensajeError (EcommerceMethods.cs:1377-1381), so ProductController.cs:43-46 answers 400. | – |
| C-15 (G15-06) | exportaart/ma | high | Use FinalListProper.CategoryDiscount with the LAN formula; channel 6/2/0 and branch 90/41/0 priority; MidpointRounding.AwayFromZero (EcommerceMethods.cs:692-709). Ask SAP SD about the liquidation discount. | – |
| C-16 (G06-16) | GetIntelisisStatuses | high | New route returning {Data:[IdEcommerce, Status, SucursalOrigen, Importe, ReferenciaOrdenCompra, Agente]} via SD36, delivery and billing. Status: CONCLUIDO when billed, CANCELADO when annulled; other rows omitted. Credit orders wait on DU20. | R7e-2 |
| C-17 (G7-12) | nombreCliente | high | New route: GetClientMaAsync + ocultarLetrasNombres + GetTelefonoValidadoAsync (failure gives "") + OcultarTelefono(4), guarded against phones shorter than 4. | R8-15 |
| C-18 (G7-15 code part) | Logins | high | Take the first to_CtePersonalAdr row with a non-empty smtp_addr (CustomerServiceMethods.cs:237, :301). The field choice itself is DEC-12. | R8-01 |
| C-19 (G04-23) | setOrder delivery | medium | Use `to_result?.Salesdocument ?? PurchNoS` for SalesDocAddressRequest (OrderMethods.cs:1510). | Business Rules "Pendientes" |
| C-20 (G04-20) | setOrder bank-transfer pickup | medium | When the BpRecogePedidos row exists, email that row's Correo/Nombre (StorePickupMethods.cs:255-313). | runbook §22.7-B |
| C-21 (G04-29) | setOrder BP | medium | ZidMagento = idMagento > 0 ? idMagento : int.TryParse(cliente) (OrderMethods.cs:2826). | CX-07 |
| C-22 (G04-08) | setOrder BP | medium | Apply Sntz to the BP fields from the order, and ValidateOnlyNumbers to TelNumber/TelnrLong/ZtelCte (OrderMethods.cs:2663-2727). | CQ7 |
| C-23 (G03-07) | wallet/details | medium | Newtonsoft JsonConvert, or UnsafeRelaxedJsonEscaping (WalletCustomerController.cs:50). | – |
| C-24 (G02-12) | wholesale-customer | medium | Treat NotFound (or HttpStatusCode.NotFound) as not found and return "null" (BusinessPartnerMethods.cs:878, :285-288). | D-26 |
| C-25 (G09-12) | obtenerCreditos | medium | Delete the File.WriteAllText debug dump at SalesMethods.cs:200. | – |
| C-26 (G09-09, G09-04, G09-05) | obtenerCreditos | medium | Rethrow on an SD36 failure; sort by date DESC; Math.Round(...,2). | RCS-47/48/49 |
| C-27 (G13-09, G13-11) | catalog deletePromociones/deleteReservations | medium | Dedicated `new Curl(timeoutSeconds: 3600, maxRetries: 1)` in MagentoCatalogMethods. | RPR-132 |
| C-28 (G14-40, G14-42, G15-28) | bank-transfer pickup email | medium | Pass idEcommerce as the order number (StorePickupMethods.cs:313); `DateTime.Now.Year` (MailHelper.cs:106); LAN 24-Aug template text. | R7d-6 |
| C-29 (G15-14) | etiquetas | medium | Omit the $filter when idEtiqueta is empty; escape it when present (ProductMethods.cs:1349). | – |
| C-30 (G05-31 code part) | liberador callback/liberador | medium | Plain `new HttpClient()` with no permissive handler; Logger.SAP file logs including the final "DEFINITIVO" line, also in LiberadorCreditoMethods. | T1a, D-33 |
| C-31 (G03-13, G03-14, G03-15) | getMinimumCostToRedeem | low | Math.Max(subtotal,0) (:185); reset montoMaximoRedimibleGlobal at the start (:226, :231); `product.Family ?? ""` (:180). | RMON-15/17 |
| C-32 (G14-07) | createStorepickupCode | low | Separate try blocks so sendStorePickupEmail runs even when setOrderStatus fails (StorePickupMethods.cs:416-444). | – |
| C-33 (G06-05) | cancelOrder | low | Swallow the SD48 error only when SAP says the invoice is already cancelled (OrderMethods.cs:3079-3084). | RCAN-6 |
| C-34 (G10-14) | SendSmsNewNumber | low | `if (idRef == "0")` at CreditMethods.cs:183. | – |
| C-35 (G11-23) | getPlazos | low | Use the SIGMAVI Condicion column with the catalog as fallback, and log when Zterm is missing (CreditMethods.cs:98-108, :140-150). | AUDITORIA:570 |
| C-36 (G04-24) | setOrder delivery | low | ValidateOnlyNumbers(info.telefono) (OrderMethods.cs:1490). | – |
| C-37 (G08-22, G15-17, G09-14) | GetAccountDebts, product/stock, obtenerCreditos | low | Escape the OData literals (AbonoMethods.cs:26, :120, :160; ProductMethods.cs:212-216, :256-260; CustomerServiceMethods.cs:356). | CQ13 |

### 4.2 Decisions for the user

Ordered by impact. Each one names LAN file:line, ServicioSAP file:line, options, recommendation and an example.

**DEC-01 — setCustomer create-or-reuse (critical) — G01-01; also G04-07 for order/new.**
- LAN: SP_eCommerceCtenuevo.sql:62-68 looks up Cte.IdMagento (plus eMail1 when the id is ≤2), :172-206 updates the row, and the same @Clave is returned.
- ServicioSAP: BusinessPartnerMethods.cs:435 sends Partner=""; BusinessPartnerController.cs:46-60 has no lookup. OrderMethods.cs:2603-2634 calls BP01 every time cuenta is empty.
- Options: (a) return the existing BP; (b) also update names and email with a partial BP01; (c) replicate the SP update, including the address wipe; (d) keep creating.
- Recommendation: (a) or (b) without the address wipe, with the tie-break on the highest Partner. Only a "No se encontraron clientes" result may lead to a create.
- First run step 0 (D-15): `GET partner/client/filter/ZidMagento eq <id>`. CQ3: do guests (id 0-2) get one BP per email?
- Example: a customer edits their profile twice. LAN keeps C0001234. ServicioSAP creates three BPs.

**DEC-02 — setOrder response contract, cash and credit (critical) — G04-25, G05-03.**
- LAN: OrdersController.cs:149-160 returns `Ok(string)`; OrderMethods.cs:649, :732 return the account or a literal.
- ServicioSAP: OrderController.cs:26-47 returns {BP, SalesDocument, Message, Resultado}. "Error, ..." comes back with 200. DMZ OrdersController.cs:214-227 passes it through.
- Options: (A) keep the object and rely on the setCAccount callback; (B) the DMZ restores the 409/422/400/500 mapping; (C) return LAN's bare string; (D) Magento reads Resultado.
- Recommendation: C (or A) plus D for retries, agreed with the Magento owner. C-01 is needed in every case.
- Example: price below the floor. LAN gave "PrecioIncorrecto". ServicioSAP gives 200 with Resultado null.

**DEC-03 — Openpay cards and Paynet (critical) — G04-01, G04-03, G06-19, G06-20, G14-14, G14-18.**
- LAN: OpenpayMethods.cs:70-206 (CheckStatus, CheckStoresStatus); OrderMethods.cs:429-432 (cuenta optional).
- ServicioSAP: OrderMethods.cs:1777-1792 saves to SQLite and nothing reads it; :2618-2624 rejects Paynet without cuenta.
- Options (D-38): (a) port the job with a `liberado` flag; (b) Openpay webhook; (c) do not route openpay_cards to order/new yet. For Paynet without cuenta: resolve like banktransfer.
- Recommendation: (c) now, then (a). For Paynet: resolve like banktransfer.
- Example: paid card order 1000054321 never reaches SAP. A guest Paynet order gets "Error, VIU contado requiere cuenta".

**DEC-04 — Pricing, stock gate and region rewrite (critical) — G04-11, G04-12, G04-13.**
- LAN: OrderMethods.cs:368-396 books precioEspecial and forces forzarOrder; :557-565 validates the price. No stock check, no region rewrite.
- ServicioSAP:
  - OrderMethods.cs:2450, :2491-2533 book precio.
  - :1995-2050 raise prices to the SD29 floor taken from an arbitrary row (FinalListProperMethods.cs:82-85).
  - :1835-1839 apply the stock gate.
  - :1828, :2116-2181 rewrite the region from estado.
- Options: price A = LAN parity, B = keep, C = reject below the floor. Stock A = keep, B = remove. Region A = remove, B = postal code, C = defer.
- Recommendation: price A (pricing decides B vs C below the floor); stock B; region A.
- Example: payload 12000048887 (precio 9299, precioEspecial 6990) is booked at 9299. The SKU "-R5" becomes "-RJ".

**DEC-05 — Cash payment term (high) — G04-28.**
- LAN: OrderMethods.cs:632 reads condicion only for credit; :1220-1223 sends @Pagos = cuotas.
- ServicioSAP: OrderMethods.cs:2255-2277 takes articulos[].condicion for every method. ACEF (:39) is never used.
- Options: (A) cash orders always use the cash term, and cuotas>1 maps to an MSI term; (B) keep; (C) use condicion only when it is cash-type.
- Recommendation: A, with the VIU cash code from SAP SD.
- Example: a banktransfer order with condicion "12 M VIU PP" and cuotas 1 is booked as a 12-month credit.

**DEC-06 — Cancel and return policy (critical/high) — G06-03, G06-04, G06-07, G06-08, G06-09, G06-22 (D-35/D-36).**
- LAN: OrdersController.cs:200-241, :252-308; ServiceOrderMethods.cs:76-96, :362-417.
- ServicioSAP: OrderMethods.cs:3060-3100 (SD48+SD46), :2190, :2204, :2229-2235, :2320.
- Questions:
  - (a) For invoiced cancels: never annul (LAN) / annul / annul only for T. Recommendation: annul only for T, return flow for P.
  - (b) "noexiste": keep 400 after C-02, plus a transition rule for pre-cutover orders.
  - (c) Return org, channel and plant: take them from the original SD36 order. Recommendation: yes.
  - (d) Keep the original payment condition; the reason goes only as text. Recommendation: yes.
  - (e) Which resolution creates the ZDME: LAN gates on producto[0]='R'. Recommendation: per-item 'R' filter, which improves on LAN.
  - (f) RMA id: carry it in a Z text field.
  - (g) LAN's per-unit service report (G06-11): ask after-sales whether SAP still needs it.
- Example: an RMA with 1 sofa (R) and 1 chair (C). LAN returns both (gate on the first item). ServicioSAP fails today (store null).

**DEC-07 — Credit gate eligibility (high) — G10-11, G10-12, G10-13 (D-48).**
- LAN: CreditMethods.cs:1817-1828 (FNVTASValidarEmpleado), :1831-1838 (CteEnviarA 3/76/7, CREDITO MENUDEO, ALTA), :1941-1965 (first purchase).
- ServicioSAP: nothing. The candidate fields are ZB_DATOS_CLIENTE CanalDistribucion_P, GrupoClientes, BloqueoCentral and ZtipoCliente (Partner.cs:233, :253, :264, :82).
- Options: (A) SAP confirms the existing fields; (B) interim: existing BP that is not a Prospecto; (C) drop the rule. is_first_purchase: return false, because Magento never reads it.
- Recommendation: A, with B as the interim. Employee exclusion: SAP names the field. Do not drop it without credit-area sign-off.
- Example: an employee BP opens the credit checkout. LAN blocks it; ServicioSAP has no check.

**DEC-08 — Liberador trigger and resend guard (high) — G05-02, G14-23 (D-37, T2c).**
- LAN: CreditMethods.cs:199-241; OrderMethods.cs:538-542.
- ServicioSAP: OrderMethods.cs:673-707 (commented out, does not compile), :1764, :1797.
- Recommendation: switch U1, success path only, cuentaBp, exclude Prospecto, Task.Run. Guard T2c-B: if incrementId does not start with "CRED" and a row with idMagento "CRED"+idCarrito exists, answer PedidoExistente.
- Example: Magento resends 000123456 after authorization. LAN answers PedidoExistente. ServicioSAP writes a second request.

**DEC-09 — GetAccountDebts contract (critical) — G08-01, G08-06, G08-08, G08-09, G08-12.**
- LAN: CustomerServiceMethods.cs:776-852, :1169-1212, :1510-1707.
- ServicioSAP: AbonosController.cs:18-32 returns the raw EX01 rows.
- Options: (A) rebuild LAN's {data, status} shape; (B) Magento adapts; (C) point DMZ :146 back to LAN now. Also: filter by UEN (via the D-42 map), exclude Contable='1', and keep the 500 on error.
- Recommendation: C now (check that LAN accepts the SAP token, DMZ Curl.cs:84), then A.
- Example: Magento builds the ApplyPaymentAdvanced debts from this response. `int.Parse(debt["CanalVenta"])` fails, so the payment intent gives 500.

**DEC-10 — getClienteFactura contract (critical) — G11-06, G11-04, G11-12.**
- LAN: CreditController.cs:68-95; FacturaMethods.cs:106-217 (one object, "No tiene facturas").
- ServicioSAP: AbonosController.cs:34-47 returns a list. DMZ CreditController.cs:58 JObject.Parse then gives 500.
- Options: ServicioSAP builds LAN's object (needs N4-N6), or the DMZ adapts. Interim: revert DMZ :51 to LAN.
- Recommendation: ServicioSAP builds the object. Failures: SP-level errors give "No tiene facturas", connection errors give 500 (as LAN).
- Example: any getClienteFactura call today ends in a DMZ 500.

**DEC-11 — Wallet details and redeem minimum (high) — G03-01, G03-05, G03-06, G03-08, G03-11, G03-21 (D-28/D-29).**
- LAN: WalletCustomerMethods.cs:65, :89-115, :307-400, :462-471.
- ServicioSAP: WalletCustomerController.cs:26-34; WalletMethods.cs:131-151, :174-177, :223-232.
- Recommendations:
  - Filter SD18 by the Vkorg/Vtweg mapped from uen.
  - Accept "no wallet" instead of the "None" sentinel.
  - Drop the generate-wallet side effect.
  - Replicate the per-family algorithm.
  - Remove the invented fallback channel (fail closed).
  - Accept skipping unknown SKUs.
- Example: a customer with MA and VIU wallets shops in VIU. ServicioSAP returns whichever contract SAP lists first.

**DEC-12 — Logins and validarCliente policies (medium/high) — G7-07..10, G7-15..18, G7-20, G7-22..24, G7-37, G7-28.**
- LAN: CustomerServiceMethods.cs:255-311, :1214-1293.
- ServicioSAP: CustomerServiceMethods.cs:195-318; CustomerServiceController.cs:50-51, :71-72, :92-93.
- Questions:
  - (a) Which BP05MA field equals Cte.eMail1. Recommendation: E2E capture, then decide.
  - (b) Return false only on not-found, 500 otherwise. Needs a not-found signal in GetClientMaAsync (BusinessPartnerMethods.cs:285-307). Recommendation: yes.
  - (c) Empty input gives Ok(false) instead of 400. Recommendation: yes. Never reproduce LAN's empty-BirthDate second-factor bypass.
  - (d) DU13 names (NameFirst+Namemiddle). Recommendation: yes.
  - (e) Numeric comparison of the Magento id, and treat ZidMagento 0 as unlinked. Recommendation: yes, as a new safety rule.
  - (f) Exact yyyy-MM-dd comparison. Recommendation: yes.
- Example: SAP times out. LAN shows "error de conexión"; ServicioSAP says "account does not exist".

**DEC-13 — recuperarcuenta and prospecto scope (medium) — G02-01, G02-04, G02-05, G02-08, G02-09, G02-10 (D-23, D-25).**
- LAN: ProspectoController.cs:86-169.
- ServicioSAP: ProspectoController.cs:22-71; CustomerServiceMethods.cs:174-193.
- Recommendations:
  - Confirm the caller of ticket 10226; if it is only the Credilana app, the routes are OUT_OF_SCOPE.
  - Require all 5 fields.
  - Filter by RFC + birth date and compare the full names in C#.
  - Use a dedicated LAN masking helper.
  - Accept the descriptive error texts.
- Example: "JUAN DE LA CRUZ" is masked "J**N DE LA C**Z" by LAN and "J*** D* L* C***" by ServicioSAP.

**DEC-14 — Catalog, import, price and stock job ownership (high) — G13-03, G13-07, G13-08, G13-10, G13-05, G13-02, G14-26, G14-30, G15-08, G15-20, G15-38, G15-39 (C-16, D-53, P10-1).**
- LAN: ProductsController.cs:17-212 (one chained request; DB.cs:17 api\data.db).
- ServicioSAP: CatalogController.cs (no caller; SQLiteDb.cs writes sap\data.db). exportaart returns JSON only.
- Options: (A) the import tool calls the ServicioSAP routes and reads the shared data.db; (B) separate schedulers; (C) keep LAN until Dev 2 Sprint 9.
- Recommendation: C, then A with one owner. Also decide:
  - Persistence and the delta/disable rows of exportaart (G15-38: SIGMAVI table).
  - The MySQL/IntelisisTmp attribute leg (keep on LAN, then retire if the SAP article master owns it).
  - The price and warranty push.
- Example: a SKU is discontinued in SAP. LAN sends product_online=2 and qty 0. ServicioSAP omits it and Magento keeps selling it.

**DEC-15 — LAN reference branch for the catalog (high) — G13-01, G13-13, G13-14 (D-54, D-07).**
- LAN Production: Conn/Magento.cs:331-397 (page 500/0, guards, per-SKU pass), :185-214 (try per set), :270 (500).
- ServicioSAP: MagentoCatalogMethods.cs:325, :177-203, :286 (stage-delta).
- Recommendation: Production as the reference. Add the null guards and the per-set try now. The per-SKU pass only after DEC-14 points to the importer's data.db. The DMZ release keeps both productWithWebsites templates.
- Example: against the Production DMZ, the 2-segment call returns 404 and cargaCompleta gives 500.

**DEC-16 — Pickup routes: contract, contact data, notification, retire (high) — G14-04, G14-06, G14-09, G14-10, G14-11, G15-24..27, G15-29, G15-32..34, G14-45 (C-15, R7d-5, R7d-6).**
- LAN: OrdersController.cs:371-414; CodigoRecogerSucursal.cs:87-197, :349-400, :521-533.
- ServicioSAP: OrderController.cs:224-262; StorePickupMethods.cs:172-245, :331-447.
- Questions:
  - Keep or retire both routes after the IIS logs (C-15). Recommendation: decide jointly.
  - If kept: LAN contract (POST "ok"; bare code).
  - Update only ClaveVenta, or the contact fields only when non-empty.
  - Notify through Magento sendStorePickupEmail.
  - Use the delivery phone with the BP phone as fallback.
  - Accept the "not store pickup" guard.
- Example: regenerating the code for order 38515. LAN uses Magento's template; ServicioSAP sends its own SMTP mail, or nothing.

**DEC-17 — setCustomerList case-insensitive match (high) — G01-07 (CQ14).**
- LAN: SpVTASListaNBMagento.sql:74-78, :103-107 (CI collation; eMail1 stored uppercase).
- ServicioSAP: CustomerMethods.cs:82-83 (exact `Mail eq`).
- First run a read-only BP05 test, lowercase vs uppercase.
- Options: A try the email as sent, then ToUpperInvariant, with Trim; B accept.
- Recommendation: A.
- Example: Magento sends ana@x.com for a BP stored as ANA@X.COM. The insert is skipped and the DMZ still says "Correcto".

**DEC-18 — storeCode map and exception contract (high) — G01-02, G01-03 (CQ5-storeCode, C-12).**
- LAN: CustomerMethods.cs:42-50, :93; CustomersController.cs:15-21.
- ServicioSAP: BusinessPartnerMethods.cs:407-425; BusinessPartnerController.cs:62-65.
- Recommendations: case-insensitive map of the 3 known codes, fail on unknown non-empty values, '' → 04 until Magento confirms (G01-04). For the exception: return InternalServerError so the DMZ answers 400 as with LAN (option A).
- Example: a BP01 timeout. Magento stores "WebException: ..." as the account.

**DEC-19 — Promoter coupon (medium) — G10-05, G10-06..09, G10-07/08, G11-22 (D-45, D-46).**
- LAN: SpVTASVentaCupon.sql:60-165.
- ServicioSAP: CreditMethods.cs:16-68.
- Retire-or-keep question (DU16 vs the checkout box, including theme checkout-data-resolver.js:257).
- If kept: the employee-payroll fallback (reuse OrderMethods.cs:1037-1067), the SIGMAVI coupon load, Centro NULL accepted, 500 for an unknown opcion accepted.
- getPlazos error shape: replicate LAN's {Error, Message}.
- Recommendation: retire if DU16 covers the box.

**DEC-20 — getSms when the ZidMagento PATCH fails (high) — G10-01 (D-47, NIP-1).**
- LAN: CreditMethods.cs:2111-2114, :2191-2206 (a 0-row UPDATE is silent).
- ServicioSAP: CreditMethods.cs:325-330 (throws, returns -1, no SMS).
- Options: A keep -1; B try/catch, log, and continue; C B plus skip the PATCH when already linked.
- Recommendation: B, after C-05.
- Example: the PATCH returns 404 for a migrated BP. LAN still sends the SMS; ServicioSAP answers -1.

**DEC-21 — GetCreditAmounts scope (critical) — G11-21 (D-49, R9-04).**
- LAN: CredyPrestamoMethods.cs:675-850.
- ServicioSAP: CredilanaMethods.cs:14-36 (the cache is never filled, so every call gives 500).
- The only Magento caller is CredilanaManagement.php:67-69, with tipo CREDITO.
- Options: A Credilana: revert DMZ :352 to LAN; B port the loader; C point SQLITE_DB_PATH at LAN's data.db while LAN runs.
- Recommendation: A, confirmed by the Magento owner.

**DEC-22 — APERTURA CUENTA, ProductosMX, mercancía (high) — G12-01, G12-05, G12-09, G12-10, G12-16, G12-18, G12-20, G12-M1..M4 (R9-10, R9-12, R9-15, R9-13).**
- LAN: CredyPrestamoMethods.cs:29-226; CreditMethods.cs:466-603; Magento CredilanaManagement.php:84-86, :510.
- ServicioSAP: none.
- Recommendation:
  - APERTURA belongs to the Credilana exclusion (A).
  - ProductosMX is deferred to Feb-Mar 2027, together with SaveHaztenTransaction.
  - Close R9-12 as A and tell Dev 3 to stop E-44.
  - If ProductosMX is ported later: create a SAP prospect BP (fits getCreditAccount R9-13 option A).
- Example: the APERTURA flow today is fully LAN. Its GetCreditAmounts "apertura" branch in ServicioSAP is never reached.

**DEC-23 — Complaint log (high) — G7-13.**
- LAN: CustomerServiceMethods.cs:442-486; SP_ACTES_REGISTRO.sql:100-109 (inserts into ERPMAVI.IntelisisTMP RM1138PendientesxValidar).
- ServicioSAP: none; obtenerConexionAndroidAsync exists.
- Options: A call the SP unchanged; B Dev 3 removes the RM1138 insert; C retire the form.
- Recommendation: A now, B before Intelisis is switched off.

**DEC-24 — LAN inbound setOrderStatus (high) — G14-20 (R7-1), G14-12.**
- LAN: OrdersController.cs:310-344 relays every status (ship, ship_carrier, store_pickup_complete, canceled_intelisis) to Magento and creates the wholesale purchase (Provider.cs:25-256).
- ServicioSAP: OrderStatusMethods.cs:16-45, a helper with no caller.
- Options: A ServicioSAP route with a SAP trigger; B a separate SAP-to-Magento status sync package; C deprecate.
- Recommendation: B, after C-15 identifies the caller. Reconfirm the eCommerceDetPedidos retirement, because Provider.cs:112-113 also reads it.

**DEC-25 — Agent source for setOrder and GetEmpleadoByNomina (medium) — G04-17, G7-25, G7-26.**
- LAN: OrderMethods.cs:1224; CustomerServiceMethods.cs:1952-1999 (Agente.Estatus ALTA + Personal + TablaStD 'Código de promotor').
- ServicioSAP: OrderMethods.cs:2385-2394; BusinessPartnerController.cs:180-194; OrderMethods.cs:1040-1055.
- Question: is SuccessFactors plus the AWS catalog the agent source for both? Is seller registration retired?
- Recommendation: answer the retire question first. If kept, SuccessFactors for both, with MAVI's generic agent for empty orders.

**DEC-26 — Pending and rejected credit applications in "my credits" (high) — G09-01.**
- LAN: CustomerServiceMethods.cs:558-563 (Venta "solicitud credito" from checkout).
- ServicioSAP: CustomerServiceMethods.cs:356 (SD36 only); OrderMethods.cs:1819 (no SAP document).
- Options: A merge CRED_SOLICITUD_WEB_DATOS_TEMP rows (MAVICBOSANDROID) with their estatus mapped; B accept.
- Recommendation: A as a workaround until the liberador writer exists.
- Example: checkout on credit today. LAN shows "pendiente"; ServicioSAP shows nothing.

**DEC-27 — Openpay installment payments (high) — G06-15 (R7d-3).**
- LAN: OrderMethods.cs:190-210 (CXCCMensajeWebHookOpenPay).
- ServicioSAP: none. The Neko stubs must not be used.
- Options: A keep on LAN; B a SIGMAVI staging table with a named applier; C SAP FI-CA OData.
- Recommendation: find the consumer first, then B.

**DEC-28 — customerService sources (medium/high) — G7-03, G09-20, G08-15, G08-19, G09-03, G09-06..08, G09-11, G09-13.**
- Confirmation window: SD36 billing + BP05MA name + WE phone (LAN CustomerServiceMethods.cs:156-159). Keep forma_contacto "Página Web" with the accent.
- Coverage source for validarCoberturaPorCP: logistics names it (LAN :1751-1795). Do not add a uen filter.
- STP CLABE row: E2E first, then the Zasignado='X' row (AbonoMethods.cs:160).
- obtenerCreditos:
  - Filter by an explicit uen→SalesOrg map (1→04, 2→05).
  - Accept the order date.
  - Strip "ZSD_{tipo}_" from the id.
  - Accept Descuento 0 and the BP name.
  - The fabricated qty/price fallbacks: show the real values.

**DEC-29 — Credit branch details (medium) — G05-04, G05-05, G05-07, G05-09, G05-10, G05-24, G05-25, G05-40, G05-50, G05-51.**
- GATE-1: copy LAN's no-row gates (OrderMethods.cs:588; CreditMethods.cs:139-148) vs SS OrderMethods.cs:647-650, :746-766. Recommendation: A, with C as the minimum.
- P7/P8b fan-out: one line if the history has no duplicates.
- SEGU float: keep decimal.
- TQ-3 '+52' phone: the API should return 10 digits.
- P16: ZtipoCliente "Prospecto" = the 'P' prefix.
- Failed rename: {success:false} only if Magento handles it.
- Rename target: ZIdEcommerce only.
- Retire validateCredit.
- LIM-1: LAN parity now (no stop), record it in the user's words.
- SD29-1: ratify the E5 selection.

**DEC-30 — Retirement batch (low) — D-31, D-30, D-27, R7e-5, R9-11, R8-18, D-51, R7-E.**
- getCuentaC, status/getStatus (unless Atentus still uses it), recommender x3, tablerate x3, Validar_Lada, ExistRFCAndPhoneCte, codigoRecomendado, codigoRecomendadoWithUen, negotiable-quote/create, getOrderId, getOrderInfoAndSet, getStockByStore, ecommerce/listado, getCreditAccount (Credilana funnel), and the dead DMZ magento routes noImagenProduct and getOrderId.
- Recommendation: retire after 30 days of IIS logs (C-15).

**DEC-31 — getCuenta/setCuenta failure (medium) — G01-12, G01-13, G01-14, G13-12, G14-01, G14-03 (CQ24).**
- LAN: Helper/Curl.cs:79-110.
- ServicioSAP: Curl.cs:48, :118-159.
- Recommendation: accept the 500 for getCuenta. For setCuenta, use `new Curl(120, 1)` at MagentoAccountMethods.cs:33 once the caller is known.

**DEC-32 — creditStatus source (critical, with EXTERNAL) — G05-20, G05-21, G15-35, G15-37.**
- LAN: OrderMethods.cs:1867-1996.
- ServicioSAP: none. MovBitaMethods.cs:23 can read ZSDT_MOVBITA by Vbeln.
- Options for Q-T2-1: A Intelisis; B CRED_SOLICITUD_WEB_DATOS_TEMP.estatus; C SD36 by PurchNoC; D liberador API; **E ZSDT_MOVBITA**.
- Recommendation: E only if the credit area confirms that web credit writes ZSDT_MOVBITA and gives the Ztiporespuesta vocabulary. Otherwise C or D after DU11.
- Make the callback id and the creditStatus key the same type (G05-21).

**DEC-33 — Store scope of the exports (medium) — G15-05, G15-11, G15-22.**
- Region R6 CELULAR hidden (SP_eCommerceexportaMA.sql:4772-4801) vs ServicioSAP EcommerceMethods.cs:1483, which publishes them all.
- Keep the MAVI web store (exportaart/mavi plus updateStockMavi)?
- Recommendation: port R6 once the region property is in SAP. Ask Ventas Mayoreo about MAVI.

**DEC-34 — Small customer items (low) — G01-05, G01-06, G01-11, G02-11, G06-21 (pickup ship-to G04-21), G04-15, G04-22, G04-09, G14-38, G15-12.**
- Buró flag: close it if the CONTADO value is 0.
- Accept BP01 rejecting long names.
- CQ21: deployment creates <site>\Logs (option A).
- Wholesale name: NameOrg only for organization BPs.
- Pickup ship-to: skip it.
- Origin field: ask SAP SD.
- Guide saved first: move it.
- Order BP uppercase: yes, one master format.
- obtenerImagen overwrite: accept.
- listado: remove.

### 4.3 Other teams

| id | Who | What | Process | Impact | known_ref |
|---|---|---|---|---|---|
| X-01 | Valentín (liberador team) | Liberador contract: accepts a 10-digit BP, auth, idempotency, which idVenta it returns, tables it reads; PurchNoC of credit sales documents | credit branch, callback, creditStatus, cancel of credit orders | critical | DU11, Q-T1-1..8, G05-01, G05-21, G14-22, G06-06 |
| X-02 | SAP SD (Alan) | OData to update ZSDT_VBAK.ZIdEcommerce | updateCreditOrderId | critical | DU20, G05-23 |
| X-03 | SAP SD | Annulment API ZIDSTATUS=03; definition of "not yet affected"; delete delivery/reject order for full cancel; paid vs unpaid order state | cancelOrder, ManagePaynetOrders, Paynet expiry, paypal posting | critical | R7b-2, R7d-2, R7d-4, G06-02, G06-21, G04-04, G04-05, G04-26, G06-14, G14-19 |
| X-04 | SAP SD + finance | Shipping item / freight condition, installments, wallet redemption, item discount condition, placeholder header values | setOrder amounts | high | R7a-5, R7a-9, G04-14, G04-16, G04-18 |
| X-05 | Credit area + Valentín + Dev 2 | Source of the credit decision (incl. MovBita vocabulary and Bstkd filter) | creditStatus | critical | Q-T2-1..3, G05-20, G15-36 |
| X-06 | Dev 4 + ABAP/SAP FI | Write target for BBVA/STP payment intents; update operation for confirmations; CLABE storage format | ApplyPaymentAdvanced, UpdateStatusPaymentAdvanced, GetSTPAccount, ValidateSTPAccount | critical | R8-08, R8-09, R8-10, G08-11, G08-14, G08-16, G08-20, G7-30..32 |
| X-07 | SAP FI/ABAP + functional owner (Uriel) | N1/N2 captures; EX01↔TZ01 link; meaning of Zsaldo/Zmoratorio/ZcobroPp; late-interest policy service; installment source per channel; string formats | GetAccountDebts, getClienteSaldo, getClienteFactura | critical | R9-06, N1-N9, G08-03, G08-04, G11-02, G11-03, G11-09, G11-10, G11-27 |
| X-08 | Dev 2 Sprint 9 + importer team (+ Dev 3) | Replacement of the product, configurable, price, stock and availability push jobs; VIU/MAVI exports; SPexportaArt attribute validation | product import and stock | critical | P10-1, C-16, G14-27, G14-29..36, G15-10 |
| X-09 | SAP SD | SD18 lookup key (Reference vs CustOwner); Deact/DateTo meaning | wallet/details | high | D-28, G03-04 |
| X-10 | SAP SD / SAP MM | Zidstatus catalog + SD36 capture with to_zsdt_vbak; DM01 status codes 04/05; PurchDate format | obtenerCreditos, wallet min cost | high | R8-12, G09-02, G09-15, G03-12 |
| X-11 | SAP SD | Capture one real SD09 return response (invoice category M?) | returnOrder | high | R7b-6, G06-10 |
| X-12 | SAP SD/ABAP + logistics | Shipment assignment status (is ZSDT_VBAK.Zembarqueestado updated?); carrier/guide/tracking per delivery; list OData of cancelled orders by date | ObtenerEstatusEmbarque, estimated-delivery, getPosCancellations | high | R8-EMB, R7e-1, R7e-3, G09-30, G06-17, G06-18 |
| X-13 | Valentín + Dev 2 + ABAP | Storage of wallet-unification requests and the process that completes them; BP field for CONTADO/CREDITO MENUDEO category | wallet unification | high | R9-09, G11-15, G11-18, G11-19 |
| X-14 | MAVI | Official guest BP per sales org; generic e-commerce agent and agent number format | setOrder | medium | R7a-2, R7a-3, G04-10, G04-17 |
| X-15 | Magento/Omnipro | Fresh capture confirming numeric idMagento and storeCode on setCustomer; release timing of the BP account vs the credit gate | setCustomer, credit gate | high | CQ5, CQ10, G01-04, G10-22 |
| X-16 | SMS operations / ServicioAndroid DBA | Does SpAAea00030_ArmadoSMS send BP-keyed rows; column widths; NULL Clave after the hash change | getSms, SendSmsNewNumber, PrimerGuardado | high | CX-11, G10-03, G10-15, G12-08 |
| X-17 | businesspartner-api owner | A_GET_TelefonoValidado returns the 10-digit national number | getSms, credit header, nombreCliente | medium | TQ-3, G10-04 |
| X-18 | Diego + SIGMavi DBA | sp_helptext of SpListaNBMagento, SpVentasCupones, plus table DDL | customer lists, coupon | medium | CQ16, G01-08..10, G10-06 |
| X-19 | Infra | 30 days of IIS logs on the LAN host + Task Scheduler list | all LAN-only routes and jobs | high | C-15, G14-02, G14-08, G14-17 |
| X-20 | Wallet team | Wallet generation API | setOrder paypal | medium | R7a-8, G04-06 |
| X-21 | Dev 3 + Valentín/Humberto | DM0415 warranty table and DDL | obtenerTipoGarantia | medium | R8-19, G7-01 |
| X-22 | Alfredo García (code master) | Publish RFC annexes I-III | prospecto/rfc | high (if in scope) | D-24, G02-03 |
| X-23 | Business (TELEFONIA) | Region SKU swap for credit lines | credit branch | medium | Q17, G05-06 |
| X-24 | Ventas Mayoreo + SAP SD | Wholesale order design (only if D-27 = build) | negotiable-quote | medium | P3-Q3, G02-14 |
| X-25 | SAP/ABAP (Dev 4) | Migrated BPs have a ZSDT_CTE row (PATCH unircuenta works) | unirCuenta, getSms | low | G7-06 |

### 4.4 Data and config prerequisites

| id | Process | Impact | What | Owner | known_ref |
|---|---|---|---|---|---|
| P-01 | GetPickUpCode | high | Copy the open TrWDM0285_CteRecoge rows to SIGMAVI BpRecogePedidos, and switch DMZ GetPickUpCode (:262) and the writers together | User + DMZ owner | C-13, G06-13 |
| P-02 | getGuide | medium | Create servicio_guias in ServicioSAP's data.db and copy the LAN rows | Infra | G06-12 |
| P-03 | GetCreditAmounts, FormDatos | high | Name an owner and a non-Intelisis source for mavi_credilana_info (or revert per DEC-21) | User | R9-04, PW-OWN, G12-03, G12-M5 |
| P-04 | credit branch | low | SIGMAVI CondicionesCredVtaLinea rows for '05 M MA/VIU P DIF' per TiendaVirtual | SIGMavi data owner | P18, G05-08 |
| P-05 | codigoPromocion | medium | Load the real Intelisis coupons into SIGMAVI VentasCupones (only if kept) | Data owner | D-45, G10-09 |
| P-06 | checkOpenpay | high | RECHAZAOPENPAY list and per-store Openpay keys for each environment | Infra + Javier | G14-16 |
| P-07 | catalog | medium | ignoreAttributes.txt at IGNORE_ATTRIBUTES_PATH in every environment; the catalog SQLite schema in whatever data.db SQLITE_DB_PATH points to | Deployment | G13-04, G13-15 |
| P-08 | obtenerImagen, SaveImagesProductosMx | medium | IMAGES_PRODUCT_PATH / IMAGES_CREDIT_PATH pointing at the folders their readers use | Infra + Dev 3 | G14-39, G11-25 |
| P-09 | cashCustomerReport, setCustomer | low | <site>\Logs exists with write access for the app pool (CQ21 option A) | Deployment | G01-11 |
| P-10 | GetAccountDebts, GetSalesChannelsSTP | critical | SAP Vkorg/Vtweg → legacy CanalVenta 3/76/77/78/7/79 map | User + Dev 2 + SAP SD | R8-11, G08-02, G08-18 |
| P-11 | getMinimumCostToRedeem | medium | Meaning of AWS catalog VALOR1..4 for the 3 catalogs | AWS catalog owner | G03-10 |
| P-12 | exportaart | medium | Who feeds the SIGMAVI image tables; DIM11 decimal format; membership of Sucs_local_1/2/3; tag Class/Matkl → Magento route map; BackOrder equivalent | Dev 3, Dev 2 | G15-16, G15-19, G15-40, G15-15, G15-38 |
| P-13 | SaveHaztenTransaction | medium | Check that CREDIHBiometrico, CREDIDEtapaProcesamiento and CREDIDTransaccionMetaDato exist in SIGMAVI (the user runs it) | User | G12-19 |
| P-14 | credit branch | low | BP05MA capture of a BP without a birth date (0001-01-01 sentinel?) | User | G05-11 |
| P-15 | setCustomer, setCustomerList | critical/high | Read-only BP05 tests: filter on ZidMagento (D-15 step 0) and Mail case (CQ14) | User + Diego | G01-01, G01-07 |
| P-16 | stock jobs, FormDatos | medium | sp_helptext of SpVTASEcommerceExistencia, SpVTASECommerceDisponibilidadArt and SP_CREDITO_WEB_VALORES_FORM into SPsOrden | User | G15-21, G15-23, G12-04 |
| P-17 | nombreCliente | medium | One A_GET_TelefonoValidado capture to confirm ZtelCte = lada + number | User | G7-12 |
| P-18 | recuperarcuenta | medium | BP05 capture of 2-3 migrated BPs with compound given names | User | G02-05 |

## 5. Gap detail per group

Notes:
- Need: DEC = decision, CODE, EXT = external, DATA, CONFIG.
- "(corr.)" means the verifier corrected the text; the corrected text is shown.
- "(added)" means a gap the verifier found.
- LAN paths are in the LAN repo and SS paths in ServicioSAP unless noted.

### G01 Customers

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G01-01 | Find existing customer by idMagento (+email when ≤2), update it, return the same account | SP_eCommerceCtenuevo.sql:62-68, :172-206 | BusinessPartnerMethods.cs:435 Partner=""; no lookup in BusinessPartnerController.cs:46-60 | DEC | critical |
| G01-02 | storeCode exact match 1/2/3, otherwise fail | CustomerMethods.cs:42-50, :93 | BusinessPartnerMethods.cs:407-425 maps 'mavi', unknown and '' to 04 | DEC | high |
| G01-03 | Exception → Magento 400 with empty body | CustomersController.cs:15-21 + DMZ :34-35 | BusinessPartnerController.cs:62-65 → DMZ Curl.cs:130-139 → DMZ :37 200 "WebException" | DEC | high |
| G01-04 (corr.) | Required idMagento: SS equals LAN under CQ5. Only a release risk: the CQ10 payload has "" | CustomerMethods.cs:74, :93 | BusinessPartnerMethods.cs:401-404 | EXT | medium |
| G01-05 (corr.) | Copy the CONTADO buró flag | SP :88-97, :138, :157 | ZenviaBuroCred=false always on the contact (CteCto.cs:31; BusinessPartnerMethods.cs:643-668) | DEC | low |
| G01-06 | Silent truncation to SP widths | SP :45-48 | Full length (BusinessPartnerMethods.cs:394-399) | DEC | low |
| G01-07 (corr.) | Email-is-a-customer check ignores case and spaces | SpVTASListaNBMagento.sql:74-78, :103-107 | Exact `Mail eq` (CustomerMethods.cs:82-83); hits Intelisis-migrated and setCustomer BPs | DEC | high |
| G01-08 | List effects (black/white rules, widths) | SpVTASListaNBMagento.sql:23-30, :79-121 | SpListaNBMagento body unreadable (CustomerMethods.cs:28, :36-48) | EXT | medium |
| G01-09 | varchar(50) + collation in Consultar | :24, :47, :63 | Same | EXT | low |
| G01-10 | Eliminar touches the white list only | :66-70 | Same | EXT | low |
| G01-11 (corr.) | The error branch cannot throw | CustomerMethods.cs:219-222 | Logger.cs:26-31 unguarded; also BusinessPartnerMethods.cs:89, :100, CustomerMethods.cs:94 | DEC | low (medium for setCustomer) |
| G01-12 (corr.) | POST failure → 200 e.Message (login failure is 500 in both) | Helper/Curl.cs:105-107 | Curl.cs:122-159 3×30 s, then throw → 500 | DEC | medium |
| G01-13 | One write attempt | Helper/Curl.cs:94-103 | Curl.cs:122-159 up to 3 POSTs | DEC | medium |
| G01-14 (added) | No practical timeout, one attempt | Helper/Curl.cs:99 | Curl.cs:48, :100 (30 s) | DEC | low |

### G02 Prospecto + Wholesale

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G02-01 | Scope gate (Credilana app vs storefront) | ProspectoController.cs:18-148 (ticket 10226) | Missing; Magento GenerarRFC webapi.xml:3 | DEC | high |
| G02-02 | RFC algorithm | ProspectoController.cs:46-67; spRegistroSugerir.sql:31-126; spRFCClaveHomonima.sql; spRFCDigitoVerificador.sql | Missing | CODE | high |
| G02-03 | RFC annexes I-III | spRFCClaveHomonima.sql:21, :30-31; spRFCDigitoVerificador.sql:23 | No evidence | EXT | high |
| G02-04 | All 5 inputs required | ProspectoController.cs:86-98 | ProspectoController.cs:22-25 (2 fields); crash in CustomerServiceMethods.cs:185 | DEC | medium |
| G02-05 | Match on all given names | ProspectoController.cs:107-117 | PrimerNombre only (:47) | DEC | medium |
| G02-06 (corr.) | Case and space insensitive | :113-127 | No Trim/ToUpper (:34-36, :47); uppercase storage since S1-S4 | CODE | high |
| G02-07 (corr.) | Input never alters the query | :123-127 parameters | Raw interpolation (:47; BusinessPartnerMethods.cs:221) on an anonymous Magento endpoint, so it can disclose BPs | CODE | high |
| G02-08 (corr.) | LAN masking (first + last letter; words ≤2 kept) | :152-169 | CustomerServiceMethods.cs:174-193 masks 2-letter words and the last letter | DEC | medium |
| G02-09 | Not-found/error bodies with nombre '' | :80, :142-145 | :61, :67, :71 descriptive text | DEC | low |
| G02-10 | Scope gate for recuperarcuenta | ticket 10226 | DMZ already PostSAP | DEC | medium |
| G02-11 (corr.) | Name = Cte.Nombre; NameOrg only for organization BPs | WholesaleCustomerMethods.cs:21, :39 | BusinessPartnerMethods.cs:863-872 person name first | DEC | medium |
| G02-12 | Unknown account → "null" → DMZ 400 | WholesaleCustomerMethods.cs:35-45 | NotFound enum text not matched (:285-288, :878) → 500 → DMZ 200 "WebException" | CODE | medium |
| G02-13 | Wholesale ERP order per quote | WholesaleCustomerMethods.cs:61-237 | Missing | DEC (D-27) | medium |
| G02-14 | Wholesale master values in SAP | WholesaleCustomerController.cs:31-34 | Missing | EXT | medium |

### G03 Wallet, Status, Recommender

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G03-01 | Wallet chosen by uen | WalletCustomerMethods.cs:65; CreditMethods.cs:1603-1621 | WalletCustomerController.cs:26, :34 First() | DEC | high |
| G03-02 | Only the current wallet | WalletCustomerMethods.cs:69-70 | No Deact/DateTo filter (:34) | CODE | medium |
| G03-03 | titular = full name | :25-27, :44-45 | CustOwner (BP code) (:36) | CODE | medium |
| G03-04 | Lookup key = customer | :69-70 | `Reference eq` (WalletCustomerMethods.cs:65) | EXT | high |
| G03-05 | Unknown → "None" | :64, :89-115 | Default message (WalletCustomerMethods.cs:83-86) | DEC | low |
| G03-06 (corr.) | Generate-wallet side effect | :89-115 | Missing; stub OrderMethods.cs:1396-1409 (called at :1950) | DEC | low |
| G03-07 | Non-ASCII stays literal | WalletCustomerController.cs:36 Newtonsoft | System.Text.Json (:50); Magento strips "\" | CODE | medium |
| G03-08 | Multi-family recompute | WalletCustomerMethods.cs:307-400 | WalletMethods.cs:223-232 single minimum | DEC | high |
| G03-09 | Comma family list, normalized | :200-296 | Exact ContainsKey (WalletMethods.cs:104, :190-201) | CODE | high |
| G03-10 | Channel from Ventascanalmavi ID 2/3/6/7 | :170-176, :222-228 | WalletMethods.cs:79-96 loose match | DATA | medium |
| G03-11 (corr.) | No fallback channel; missing channel → 0 | :271-286 NullReference → 0 | Fallback WalletMethods.cs:131-151 (empty or failed catalogs already give 0) | DEC | medium |
| G03-12 | ALTA/BLOQUEADO status | :426, :441, :462-465 | DM01 04/05/81 hard-coded | EXT | medium |
| G03-13 | Line net ≥0 | :455-460 | No clamp (:185) | CODE | low |
| G03-14 | Assign, do not accumulate | :305, :309 | `+=` (:226, :231) | CODE | low |
| G03-15 (corr.) | NULL family still processed | :440 | ContainsKey(null) zeroes the whole cart (:180, :190-201) | CODE | low |
| G03-16 | Order reference → account | :125-158 | Missing (DMZ path already broken) | DEC | low |
| G03-17 | Health probe | StatusController.cs:14-36 | Missing | DEC | low |
| G03-18..20 | Recommender set/get/codes | RecommenderMethods.cs:18-200 | Missing | DEC | low |
| G03-21 (added) | Unknown SKU: LAN gives 0 for the whole cart | WalletCustomerMethods.cs:426-471 | Skips that SKU only (WalletMethods.cs:174-177) | DEC | low |

### G04 Order creation, cash

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G04-01 | Paid card order created after the charge completes | OrderMethods.cs:545; OpenpayMethods.cs:70-101, :271-276 | OrderMethods.cs:1777-1786 always exits | DEC | critical |
| G04-03 | Paynet accepted without cuenta | OrderMethods.cs:429-432, :1228 | :2591-2592, :2618-2624 throw | DEC | high |
| G04-04 | Expired Paynet → cancel | OpenpayMethods.cs:169-206 | Missing | EXT | high |
| G04-05 | Paid orders posted at creation | OrderMethods.cs:674-676, :716 | afectar stub :1550-1566; Zidstatus "Pendiente" (:2404) | EXT | medium |
| G04-06 | Wallet generation | :715, :1426-1534 | Stub :1396-1409 | EXT | medium |
| G04-07 | Do not create a customer on every order | :1136, :1228 (SP: no evidence) | :2603-2634 BP01 every time, before the POST (:1845, :1885) | DEC | high |
| G04-08 (corr.) | Sntz + digits-only phones on customer data | :1132-1238, :414, :423 | :2663-2727 raw | CODE | medium |
| G04-09 (corr.) | Consistency: uppercase order-created BPs like setCustomer (not LAN parity) | (LAN keeps Magento case, :1125-1172) | :2663-2667, :2727 | DEC | low |
| G04-10 | Guest customer | SP (no evidence) | Fixed BP 1500003857 (:41, :2636-2639) also gets setCAccount and an address | EXT | medium |
| G04-11 (corr.) | Book precioEspecial; reject a wrong price unless forced | :368-396, :557-565 | precio booked (:2450, :2491); floor from an arbitrary SD29 row (:1995-2050; FinalListProperMethods.cs:82-85) | DEC | critical |
| G04-12 | No stock gate | :533-733 | :1835-1839, :2056-2109 | DEC | high |
| G04-13 (corr.) | No region rewrite | – | :1828, :2116-2181 use estado; corrupts -R5/-R6 | DEC | high |
| G04-14 | Shipping, totals, installments, wallet in amounts | :1144-1232 | Not read in BuildSapOrderAsync | EXT | high |
| G04-15 | Origin stored | :434-437, :1236 | Zreferencia = incrementId (:2338) | DEC | low |
| G04-16 | No placeholders | – | :2326, :2342, :2367, :2407, :2417-2419, :2744 | EXT | medium |
| G04-17 | Agent default and format | :652, :1224 | :2390-2393 | EXT | medium |
| G04-18 | Line discounts reduce the amount | :586-599, :1156 | Never read (:2491-2533) | EXT | high |
| G04-19 | Register the pickup person | :657-660, :1273-1317 | Stub :1572-1586; wrong index :1931 | CODE | high |
| G04-20 | Bank-transfer key email to the pickup person | CodigoRecogerSucursal.cs:209-289, :582-604 | StorePickupMethods.cs:255-313 uses the BP | CODE | medium |
| G04-21 | Delivery data for pickup | :678-687 | Returns at :1419 | DEC | low |
| G04-22 | Guide saved before creation | :606 | :1851 after the checks | DEC | low |
| G04-23 | Address linked to the order | :686 | PurchNoS empty (:1510; sap.log 2026-07-17) | CODE | medium |
| G04-24 | Digits-only phone; receiver name | :922, :933 | :1484, :1490 | CODE | low |
| G04-25 | Response body and retries | OrdersController.cs:149-160; OrderMethods.cs:732 | OrderController.cs:28-47 | DEC | critical |
| G04-26 | Paynet affect/cancel while unaffected | OrderMethods.cs:83-114 | Missing | EXT | high |
| G04-27 (added) | Only a created order counts as success | :678, :705, :732 | :1890-1905 ignore to_return E / empty Salesdocument | CODE | critical |
| G04-28 (added) | Cash payment term from cuotas | :632, :1220-1223 | :2255-2277 article credit condition | DEC | high |
| G04-29 (added) | Keep the Magento id link | :346-349, :1136 | ZidMagento = idMagento (0) (:2826) | CODE | medium |

### G05 Credit branch and credit routes

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G05-01 | Liberador after header + lines, C/BP accounts, background, then callback | CreditMethods.cs:199-241; LiberadorCreditoMethods.cs:40-101 | Commented out at OrderMethods.cs:673-707 | EXT (DU11) | critical |
| G05-02 | Resend guard after authorization | OrderMethods.cs:538-542, :1998-2061 | :1760-1772, :1797 insert every time | DEC | high |
| G05-03 | Response for credit orders | :649, :728-732 | OrderController.cs:27-35 | DEC | high |
| G05-04 | No-row gates | OrderMethods.cs:562, :588, :599-605; CreditMethods.cs:126, :139-148 | Row written (:647-650, :746-779) | DEC | medium |
| G05-05 | Fan-out of price rows | SpVTASInsertArtSolCreditoLinea.sql:243-262 | FirstOrDefault (:914-929) | DEC | medium |
| G05-06 | TELEFONIA region swap | SPL (artRegion) | Not done (reverted 00b0462) | EXT | medium |
| G05-07 | SEGU00001 float precision | CreditMethods.cs:899-903 | decimal (:883-887) | DEC | low |
| G05-08 | '05 ... P DIF' conditions priced | SPL :258-262 | Fallback catalog lacks DIF (:3355; PaymentConditionCatalog.cs:40-42) | DATA | low |
| G05-09 | Phone format / '+52' | SP_CREDITO_WEB_DATOS.sql:193-202 | :622, :647; SCW:387 | DEC | low |
| G05-10 (corr.) | Prospect = 'P' prefix (P16); lookup non-2xx for a client without data | SPD:216 | SCW:534-544; SCW:364-367 (errors at parity) | DEC | low |
| G05-11 | Null birth date / sentinel | CreditMethods.cs:835 | SCW:242, :604-629 | DATA | low |
| G05-20 | creditStatus rules | OrdersController.cs:488-503; OrderMethods.cs:1876-1995 | Missing | EXT | critical |
| G05-21 | Same id type stored and queried | CreditMethods.cs:225 vs OrderMethods.cs:1876-1880 | OrderMethods.cs:690 | EXT | high |
| G05-23 | Rename CRED id to increment | OrdersController.cs:510-526; OrderMethods.cs:2007-2017 | Missing (DU20) | EXT | critical |
| G05-24 | Failed rename → success with -1 | OrderMethods.cs:2056-2060 | Missing | DEC | medium |
| G05-25 | Rename coverage | :1998-2061 | idMagento, guide | DEC | low |
| G05-30 | Callback keys (moved to the liberador row) | OrderMethods.cs:1803 | :1257-1263 snake_case | CODE | high |
| G05-31 (corr.) | Validated certificates; file logs incl. DEFINITIVO, also in the ported liberador | :1757-1831 | :1208-1282 permissive handler, Console only; LiberadorCreditoMethods.cs:54-104 | CODE (+DEC D-33) | medium |
| G05-32 | Callback runs automatically | CreditMethods.cs:221-236 | No caller | EXT | critical |
| G05-40 | validateCredit | OrdersController.cs:458-481 | Commented out in DMZ | DEC | low |
| G05-50 (added) | Credit limit (LIM-1/P17; the 09-11 rule says it "must stop") | CreditMethods.cs:126-133, OrderMethods.cs:649 | Not computed (:640) | DEC | medium |
| G05-51 (added) | Price row selection SD29 (E5 unratified) | SPL :243-262 | :914-929, :982-1003 | DEC | low |

### G06 Cancel, return, pickup reads, Openpay/Paynet, queries

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G06-01 | Find the order whatever tipo is | OrderMethods.cs:1613 | OrderMethods.cs:3010-3011 ZSD_T_/P_ | CODE | critical |
| G06-02 | Cancel an undelivered order | OrdersController.cs:200-204; OrderMethods.cs:1388-1416 | Throws (:3042-3057) | EXT | critical |
| G06-03 | Invoiced/partial cancel policy | OrdersController.cs:205-241 | :3060-3097 annul | DEC | high |
| G06-04 | "noexiste" response | :202, :249 | DMZ 400 | DEC | medium |
| G06-05 | Report ok only if all succeeded | :1418-1422, :249 | :3079-3084 swallows SD48 | CODE | low |
| G06-06 | Credit and card orders can be cancelled | :1613 | No SAP document | EXT | medium |
| G06-07 | Return gets the original org/branch/channel | OrdersController.cs:256-259; ServiceOrderMethods.cs:236, :362-417 | :2190, :366-368 throws | DEC | critical |
| G06-08 | Keep the original condition | ServiceOrderMethods.cs:417 | :2204 → ACEF (:3386) | DEC | high |
| G06-09 (corr.) | LAN gates on producto[0]='R', then returns all items | OrdersController.cs:278, :291-294 | ZDME always | DEC | high |
| G06-10 | Reference the invoice | ServiceOrderMethods.cs:362, :410-411 | Order ref 'C', new item numbers (:1652-1653, :2475) | EXT | high |
| G06-11 | Service report per unit | ServiceOrderMethods.cs:76-96, :240-335 | Missing | DEC | medium |
| G06-12 (corr.) | Pre-cutover guides (both answer 500 when not found) | OrderMethods.cs:758 | Own SQLite (:561-565) | DATA | medium |
| G06-13 (corr.) | Pickup codes readable; reader and writer on the same store | CodigoRecogerSucursal.cs:56-85 | Writer already SIGMAVI (OrderMethods.cs:1962-1969); DMZ reader on LAN (:262) | DATA | high |
| G06-14 | Paynet affect/cancel | OrderMethods.cs:83-114 | Missing | EXT | high |
| G06-15 | Record Openpay installment payments | :190-210 | Missing | DEC | high |
| G06-16 | Invoice status vocabulary | :287-336 | Missing | CODE | high |
| G06-17 | List POS cancellations | :224-285 | Missing | EXT | medium |
| G06-18 | Carrier tracking | EstimatedDeliveryMethods.cs:11-128 | Missing | EXT | medium |
| G06-19 | Card order becomes real when paid | OpenpayMethods.cs:70-167 | Missing | DEC | high |
| G06-20 | Expired Paynet cancels | :169-206 | Missing | EXT | medium |
| G06-21 (added) | "ok" must leave the order cancelled | OrderMethods.cs:1388-1416 | :3060-3100 only reverses the GI | EXT | high |
| G06-22 (added) | RMA traceable | ServiceOrderMethods.cs:304-305 | PurchNoC ZSD_ZDME_{id} reused (:2320) | DEC | low |
| G06-23 (added) | Pickup contact registered at creation | OrderMethods.cs:657-660 | Stub :1572-1586 | CODE | low |

### G07 CustomerService accounts, logins, queries

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G7-01 | Warranty source | CustomerServiceMethods.cs:45-55 | Missing | EXT | medium |
| G7-02 | Warranty response rules | :55, :73-112 | Missing | CODE | medium |
| G7-03 | Invoiced-order confirmation sources | :156-159, :184-191 | Missing | DEC | medium |
| G7-04 (corr.) | Literals incl. forma_contacto "Página Web" | :169-170 | Missing | CODE | medium |
| G7-05 | id_magento ≤0 | :227-232 | Rejected (BusinessPartnerController.cs:93-96) | DEC | low |
| G7-06 (corr.) | Migrated BP has a ZSDT_CTE row (verify) | :227 | PATCH (BusinessPartnerMethods.cs:786-787) | EXT | low |
| G7-07 | All given names | :263, :293 | NameFirst (:208) | DEC | medium |
| G7-08 (corr.) | Numeric comparison; '0' rule is a new safety rule | :262-276 | String compare (:204) | DEC | medium |
| G7-09 (corr.) | Error → 500 (needs a not-found signal) | :304-308 | Swallowed → false (:215-220) | DEC | medium |
| G7-10 | Empty input → 200 false | Controller :47-52 | 400 → DMZ 500 | DEC | low |
| G7-11 | Masked names | :320-352 | Missing | DEC | medium |
| G7-12 (corr.) | Validated phone + mask; never fail the route | OrderMethods.cs:794-816; :393-403 | Missing | CODE | high |
| G7-13 | SP also writes Intelisis RM1138 | SP_ACTES_REGISTRO.sql:100-109 | Missing | DEC | high |
| G7-14 | Complaint mapping and constants | :416-496 | Missing | CODE | medium |
| G7-15 (corr.) | Email = eMail1; take the first non-empty smtp_addr | :1226-1245 | FirstOrDefault (:237) | DEC | high |
| G7-16 (corr.) | Error → 500 | :1251-1255 | false (:247-252) | DEC | medium |
| G7-17 | Empty → false | Controller :175-178 | 400 → DMZ 500 | DEC | low |
| G7-18 | Name join | :1242 | Non-empty join | DEC | low |
| G7-19 | Pre-1970 dates | :1268, :1277 | Regex `\d+` (:282) | CODE | high |
| G7-20 (corr.) | Exact yyyy-MM-dd | :1277 | Lenient parse (:265-279) | DEC | low |
| G7-21 | Email (FechaN) | :1282 | :301 | DEC | high |
| G7-22 | Error → 500 (FechaN) | :1288-1292 | :312-317 | DEC | medium |
| G7-23 (corr.) | Empty input (LAN bypass for no birth date) | Controller :182-185 | 400 | DEC | low |
| G7-24 | Name join (FechaN) | :1242 | :296-299 | DEC | low |
| G7-25 | Seller registration after LAN | :1959-1992 | Missing | DEC | medium |
| G7-26 | Agent + promoter rules | :1960-1999 | Missing | CODE | medium |
| G7-27 | obtenerCreditos rules (route-level check) | :520-633 | :356-519 | DEC | medium |
| G7-28 | Error → 500 | :693-697 | Empty → 200 "" | DEC | low |
| G7-29 | Debts grouped by channel | :1205-1211 | Ungrouped | DEC | high |
| G7-30..32 | Payment intent / status / STP writes | :915-1411 | Missing | EXT | high/medium |
| G7-33, G7-34, G7-35 | STP channels, CLABE validation, coverage | :1413-1904 | Missing | DEC | medium |
| G7-36 | Shipment status | :1905-1950 | Missing | EXT | medium |
| G7-37 (added) | No second-factor bypass for a missing birth date | :1268, :1277 | Rejects empty (400) | DEC | low |

(G7-27..36 are the route-level view; the full detail is in G08/G09.)

### G08 Payments and debts

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G08-01 | Grouped {data, status} contract | CustomerServiceMethods.cs:1599-1620 | AbonosController.cs:26 raw array | DEC | critical |
| G08-02 | Legacy CanalVenta buckets | :1179-1209, :831 | No channel in EX01 | DATA | critical |
| G08-03 (corr.) | Installment data per invoice (source per channel) | :821-836, :1515-1530 | TZ01 merc reachable via getClienteFactura, not used | EXT | critical |
| G08-04 | Late-interest collection policy | :1558-1571, :1631-1675 | Missing | EXT | high |
| G08-05 | Amount math (DIMAS, ceil, equalization, Vencido) | :1541-1587 | Missing | CODE | high |
| G08-06 | UEN filter | :781, :810 | ClientNumber only (:24) | DEC | medium |
| G08-07 | PENDIENTE status | :1677-1707 | Missing | EXT | high |
| G08-08 (corr.) | Exclude Contable=1 (assumed from the RSG; SP not available) | SP | AbonoMethods.cs:26 | DEC | medium |
| G08-09 | Error → 200 partial data | :785-790 | 500 | DEC | low |
| G08-10 | Neko apply (scope) | :869-912 | Stub | DEC | medium |
| G08-11 | Persist the BBVA intent | :926-952 | Missing | EXT | critical |
| G08-12 | Debt keys come from GetAccountDebts | :935-939 | Missing in the current shape | DEC | high |
| G08-13 | Neko confirmation | :969-1015 | Stub | DEC | medium |
| G08-14 | Idempotent BBVA confirmation | :1026-1080 | Missing | EXT | critical |
| G08-15 | Single CLABE | :1305-1309 | List (:160) | DEC | high |
| G08-16 | Persist the STP intent | :1311-1358 | Missing | EXT | critical |
| G08-17 | SQLite copy | :1359-1387 | Missing | DEC | low |
| G08-18 | Legacy channel ids per UEN | :1419-1451 | SD52 without ids | DATA | high |
| G08-19 | CLABE route {cuenta} | :1459-1498 | Missing | DEC | high |
| G08-20 | Decrypt/mask CLABE | :1487-1495 | Unknown format | EXT | medium |
| G08-21 | Neko key | :1092-1121 | Missing | DEC | low |
| G08-22 (added) | Client filter passed safely | :807-811 | Raw $filter (AbonoMethods.cs:26) | CODE | low |

### G09 Credits list, coverage, shipment, tablerate

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G09-01 (corr.) | Show applications from checkout (no SAP writer exists until the liberador) | CustomerServiceMethods.cs:558-563; CreditMethods.cs:208-240 | SD36 only (:356); OrderMethods.cs:1819 | DEC (+EXT) | high |
| G09-02 | Status set | :599-617 | 3 Zidstatus (:457-470) | EXT | high |
| G09-03 (corr.) | UEN filter via an explicit uen→SalesOrg map | :560 | Ignored | DEC | medium |
| G09-04 | Newest first | :564 | No sort | CODE | medium |
| G09-05 | Round to 2 | :633 | Not rounded | CODE | low |
| G09-06 | Latest chain date | :619-630 | Order date | DEC | medium |
| G09-07 | id = MovId | :655 | PurchNoC | DEC | medium |
| G09-08 | Descuento | :520-524 | 0 | DEC | low |
| G09-09 | Failure ≠ "no credits" | :693-697 | 200 "" | CODE | medium |
| G09-10 | Empty cliente | – | 400 | CODE | low |
| G09-11 | Cte.Nombre | :515 | BP name join | DEC | low |
| G09-12 | No side effects | – | SalesMethods.cs:200 dumps data to disk | CODE | medium |
| G09-13 (corr.) | Real qty/price (culture handling is only hardening) | :632-648 | :484-498 fabricated fallbacks | CODE | low |
| G09-14 (added) | Key passed safely | :561-571 | :356 raw | CODE | low |
| G09-15 (added) | All dates accepted | :562 | Non-/Date( dates skipped (:414-425) | EXT | low |
| G09-20 | Coverage = supervision route | :1751-1795 | sepomex has no coverage | DEC | high |
| G09-21 | 4 ops and shapes | :1746-1896 | Missing | CODE | high |
| G09-30 (corr.) | Shipment assignment (ask about Zembarqueestado) | :1926-1945 | Placeholder (OrderMethods.cs:2356) | EXT | high |
| G09-31 (corr.) | Tri-state boolean; lookup must cover credit PurchNoC | :1910-1945 | SalesMethods.cs:216-224 ZMER/ZPRE only | CODE | high |
| G09-40..42 | Tablerate proxies (DMZ ConexionSAP only) | removed 2022 (47c183e/b2664ce) | – | DEC | low |

### G10 SMS/NIP, coupons, gate, referral codes

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G10-01 (corr.) | A business-level no-match on the Magento-id stamp does not stop the SMS | CreditMethods.cs:2111-2114, :2191-2206 | :325-330 → -1 | DEC | high |
| G10-02 | sap-client=110 on the PATCH | :2196 | BusinessPartnerMethods.cs:786-787 | CODE | high |
| G10-03 | Queued SMS is sent | :2245-2262 | BP-keyed rows (:415-431) | EXT | high |
| G10-04 | 10-digit phone | :2229-2231 | :411-412 | EXT | medium |
| G10-05 (corr.) | Keep or retire the coupon (3 front-end callers) | CreditController.cs:124-141 | CreditController.cs:24-40 | DEC | medium |
| G10-06 | Employee payroll fallback | SpVTASVentaCupon.sql:74-110 | No evidence | DATA | high |
| G10-07 | Unknown opcion → '' | :392-463 | 500 | DEC | low |
| G10-08 | Coupon keeps the branch | SP :139-158 | Centro NULL | DEC | low |
| G10-09 | Real coupons found | VTASCVentaCupon | SIGMAVI seed only | DATA | medium |
| G10-10 (corr.) | Gate route with 6 keys; also enforced in Magento SaveOrder | :1783-1806 | Missing | CODE | critical |
| G10-11 | Employees excluded | :1817-1828 | Missing | DEC | high |
| G10-12 (corr.) | Channel/category/ALTA (use existing ZB_DATOS_CLIENTE fields) | :1831-1838 | Missing | DEC | high |
| G10-13 (corr.) | is_first_purchase (unused by Magento) | :1941-1965 | Missing | DEC | low |
| G10-14 | No code id → -1 | :1999-2007 | :183 | CODE | low |
| G10-15 | BP rows are sent | :2010-2014 | :194-198 | EXT | high |
| G10-16 | Prospect → client (scope) | :1560-1583 | Missing | DEC | medium |
| G10-17 | Conversion date | :1580 | No field | EXT | low |
| G10-18..21 | Lada, constant RFC check, recommender codes | :1110-1550 | Missing | DEC | low |
| G10-22 (added) | Credit order saved only for a valid client | Magento SaveOrder.php:31-49 | Gate on LAN rejects BP orders | CODE | critical |

### G11 Balances, invoices, wallet, amounts, terms, documents

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G11-01 | Input validation | CreditController.cs:22, :104 | Missing | DEC | medium |
| G11-02 | Header amounts | FacturaMethods.cs:64-75 | Missing | EXT | critical |
| G11-03 | Invoice list | :77-89 | Missing | EXT | high |
| G11-04 (corr.) | SP error → "No tiene facturas"; connection error → 500 | :39-51 | Missing | DEC | medium |
| G11-05 | Route and object shape | CreditController.cs:115 | Missing | CODE | high |
| G11-06 | One SaldoFactura object | :80-88; FacturaMethods.cs:162-194 | List → DMZ 500 | DEC | critical |
| G11-07 | Invoice for that customer only | :112-118 | Vbeln only (AbonoMethods.cs:68) | CODE | high |
| G11-08 | Sentinels | CreditController.cs:75-93 | Missing | CODE | medium |
| G11-09 | Article lines / SEGU00001 | :151-161 | Missing | EXT | high |
| G11-10 (corr.) | Balance amounts (candidate TZ01 fields exist, unmapped) | :164-174 | ZSplitDto.cs:71-138 | EXT | high |
| G11-11 (corr.) | total from the first row (shipping row-order quirk) | :162-209 | Missing | CODE | medium |
| G11-12 (corr.) | Error policy (SP only) | :125-135 | 500 | DEC | low |
| G11-13 (corr.) | Wallet balance source (needs SAP SD confirmation) | CreditMethods.cs:1603-1633 | SD18 wrapper | DEC | high |
| G11-14 (corr.) | Contract decimal / "false" | CreditController.cs:474-480 | Missing | CODE | high |
| G11-15 | Unification log + process | CreditMethods.cs:1647-1658 | Missing | EXT | high |
| G11-16 | Four-state answer | :1654-1661 | Missing | CODE | medium |
| G11-17 | Contradictory category rule | :1667-1668 vs :1685-1691 | Missing | DEC | high |
| G11-18 | Channel category per UEN | :1722-1727 | Missing | EXT | high |
| G11-19 | Persist the unification | :1693-1707 | Missing | EXT | high |
| G11-20 | Wallet existence + balance check | :1680-1691 | Missing | CODE | medium |
| G11-21 (corr.) | Amounts cache filled | CredyPrestamoMethods.cs:675-831 | Nobody fills it | DEC | critical |
| G11-22 | Error object | CreditMethods.cs:2554-2558 | Empty lists | DEC | low |
| G11-23 | Day lookup key | :2597-2599 | Static catalog | CODE | low |
| G11-24 | Customer key test | :2672-2673 | DocumentMethods.cs:102-103 | DEC | low |
| G11-25 | Image folder | :1023-1028 | Configurable | CONFIG | low |
| G11-26 (added) | Invoice key passed safely | FacturaMethods.cs:112-118 | AbonoMethods.cs:68 | CODE | low |
| G11-27 (added) | Exact string formats | FacturaMethods.cs:66-83, :164-205 | No builder | EXT | medium |

### G12 CreditoWeb, Hazten, mercancía

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G12-01 | Who needs FormDatos | CreditController.cs:143-183 | Missing | DEC | medium |
| G12-02 | GET_CP/CheckMail shapes | CreditMethods.cs:683-721 | Missing | CODE | medium |
| G12-03 (corr.) | SQLite ops: the cache is a snapshot of an Intelisis SP | CredyPrestamoMethods.cs:701-753 | Read-only | DATA | medium |
| G12-04 | SP source not in SPsOrden | :683 | – | DATA | low |
| G12-05 | SaveFirstData scope and timing | CreditController.cs:185-205 | Missing | DEC | high |
| G12-06 | PrimerGuardado ops | SpCREDISolicitudWebPrimerGuardado.sql | Missing | CODE | high |
| G12-07 (corr.) | Importe source (incl. AMER00100 for APERTURA) | SP :50-76, :378-385 | Missing | CODE | medium |
| G12-08 | NIP SMS with NULL Clave | SP :189-458 | Missing | EXT | medium |
| G12-09 | SaveData_Articulos timing | CreditController.cs:207-234 | Missing | DEC | high |
| G12-10 | Prospect account | Credit/Methods.cs:35-38 | Missing | DEC | high |
| G12-11 (corr.) | Insert mapping (confirmado=1 is equal) | Credit/Methods.cs:69-139 | SCW InsertAsync | CODE | high |
| G12-12 | 3 references | :171-249 | Missing | CODE | medium |
| G12-13 (corr.) | MX article lines (split '/', no duplicate skip) | CreditMethods.cs:922-967 | OrderMethods.cs:807-950 | CODE | medium |
| G12-14 | Coupon redeem | :480-483 | Not called | CODE | low |
| G12-16 (corr.) | APERTURA scope (its amounts do not come from SAP) | CredilanaManagement.php:84-86 | Missing | DEC | high |
| G12-17 (corr.) | APERTURA SaveData rules | CredyPrestamoMethods.cs:29-210 | Missing | CODE | high |
| G12-18 | Hazten scope | SyncTransaction.php | Missing | DEC | medium |
| G12-19 | SIGMAVI biometric tables | CreditMethods.cs:2308-2536 | Missing | DATA | medium |
| G12-20 (corr.) | Coordinates (LAN swaps lat/lon; duplicates on retry) | :2302-2469 | Missing | DEC | low |
| G12-21 | Biometric insert mapping | :2336-2428 | Missing | CODE | medium |
| G12-M1..M4 (added) | Prospect phone flag, retry idempotency, Dimas legend, prospect key for getCreditAccount | various | Missing | DEC | low/medium |
| G12-M5 (added) | FormDatos catalogs need a non-Intelisis source | CredyPrestamoMethods.cs:701-753 | Read-only | DATA | medium |

### G13 Magento-direct, products, mercancías, login (SS callers)

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G13-01 (corr.) | E-22 algorithm (Production branch) | Production Conn/Magento.cs:331-397 | MagentoCatalogMethods.cs:325 | DEC | high |
| G13-02 | Attribute map to MySQL/Intelisis | AttributeMethods.cs:18-68 | Not ported | DEC | medium |
| G13-03 | Preload lands in the importer's data.db, right before the import | DB.cs:17; ProductsController.cs:17-116 | SQLiteDb.cs:11-27; no caller | DEC | high |
| G13-04 (corr.) | ignoreAttributes.txt deployed (delete order is LAN-equal) | Conn/Magento.cs:174-177 | :167-170 | DATA | medium |
| G13-05 | Failure behavior | ProductsController.cs:111-115 | 500 | DEC | low |
| G13-06 (corr.) | FormC normalization (probably no effect) | Helper/Curl.cs:125-127 | Not applied | CODE | low |
| G13-07 | Children preload timing | ProductsController.cs:147-157 | No caller | DEC | medium |
| G13-08 | deletePromociones inside the import | ProductsController.cs:33 / Prod :95 | Standalone | DEC | high |
| G13-09 | One call, no retry | Helper/Curl.cs:112-134 | 3 retries, 300 s | CODE | medium |
| G13-10 | deleteReservations after each push | ProductsController.cs:184-187 | Standalone | DEC | medium |
| G13-11 | No retry | same | same | CODE | low |
| G13-12 (corr.) | getCuenta/setCuenta errors (also 30 s timeout) | Helper/Curl.cs:79-110 | Curl.cs:159 | DEC | low |
| G13-13 (added) | Per-set error isolation (Production) | Prod Conn/Magento.cs:185-214 | :177-203 | DEC | medium |
| G13-14 (added) | Children page size 500 (Production) | Prod :270 | :286 | DEC | low |
| G13-15 (added) | Catalog schema exists in the target file | DB.cs:17 | SetAsync swallows errors | DATA | medium |

### G14 LAN processes outside the DMZ

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G14-01 | getCuenta failure → 200 text | Helper/Curl.cs:105-108 | 500 | DEC | medium |
| G14-02 | Caller repointed | – | – | EXT | medium |
| G14-03 | setCuenta failure | Curl.cs:94-108 | 3 attempts | DEC | low |
| G14-04 | createStorepickupCode POST/"ok" | OrdersController.cs:371-390 | GET + JSON | DEC | high |
| G14-05 | Phone digits only | CodigoRecogerSucursal.cs:96 | :348 | CODE | low |
| G14-06 | Update only ClaveVenta | :141-145, :375-377 | :399-413 | DEC | medium |
| G14-07 | Email even if the status update fails | :191-195 | :416-444 | CODE | low |
| G14-08 | Trigger and reader move together | – | DMZ :262 on LAN | EXT | high |
| G14-09 | Keep generateNew? | OrdersController.cs:393-414 | exists | DEC | medium |
| G14-10 | Notification via Magento | :351-361 | SMTP (:208-242) | DEC | medium |
| G14-11 | generateNew response | :406-413 | JSON estados | DEC | low |
| G14-12 (corr.) | Retirement premise wrong (Provider.cs:112-113 also reads the table) | Provider.cs:108-133 | – | DEC | medium |
| G14-13 | Support reprocess (forced only on the log branch) | Conn/Magento.cs:361-411 | Missing | DEC | medium |
| G14-14 | Card orders created when paid | OpenpayMethods.cs:77-82, :271-276 | Missing | DEC | critical |
| G14-15 (corr.) | Job steps (:277 is always true; set is_in_intelisis from the real result) | OpenpayMethods.cs:70-167 | Missing | CODE | critical |
| G14-16 | Openpay config | :39-43, :290-305 | Missing | DATA | high |
| G14-17 | Scheduler | – | – | EXT | high |
| G14-18 | Expired Paynet cancel | :177-204 | Missing | DEC | high |
| G14-19 | Unaffected state + cancel op | OrderMethods.cs:1388-1406, :1712-1737 | No SAP field | EXT | high |
| G14-20 (corr.) | Inbound status relay (may drive invoicing/shipment in Magento) + virtual purchase | OrdersController.cs:310-344; Magento OrderManagement.php:182-205 | Missing | DEC | high (critical if POS uses it) |
| G14-21 | Virtual purchase + purchasing email | Provider.cs:135-256 | Missing | EXT | high |
| G14-22 | Liberador accepts a BP | CreditMethods.cs:208, :220 | cuentaBp | EXT | critical |
| G14-23 | When the liberador runs | :199-241 | Commented out | DEC | high |
| G14-24 | Callback keys | OrderMethods.cs:1803 | :1257-1263 | CODE | critical |
| G14-25 | Async trigger that compiles | :215-240 | :680-705 | CODE | high |
| G14-26 | One catalog cycle | ProductsController.cs:31-57 | cargaCompleta lacks deletePromociones | DEC | high |
| G14-27 (corr.) | Attribute leg (decision of 7 Sep in CHECKLIST_MIGRACION_LAN_A_SAP.md:151) | AttributeMethods.cs:18-36 | Not ported | EXT | medium |
| G14-29..36 | Product/price/stock pushes (3 stores, configurable, JSON-only, price, MAVI stock, delta stock, availability) | ProductsController.cs:59-212; ProductMethods.cs | Missing | EXT | critical/high |
| G14-37 | getStockByStore retired | ProductsController.cs:192-200 | – | DEC | low |
| G14-38 | No overwrite, error | ProductImage/Methods.cs:397 | Overwrites (ProductImageMethods.cs:48, :52) | DEC | low |
| G14-39 | Image folder | :397 | sap\images | CONFIG | medium |
| G14-40 | Order number = increment | CodigoRecogerSucursal.cs:714 | entityId (StorePickupMethods.cs:313) | CODE | medium |
| G14-41 | Bank-transfer text | :718-720 | MailHelper.cs:77-83 | DEC | medium |
| G14-42 | Current year | :657, :746 | 2021 | CODE | low |
| G14-43 (added) | store_pickup accepted by Magento | :147-192 | `products: []` rejected (StorePickupMethods.cs:430) | CODE | high |
| G14-44 (added) | Bank-transfer email finds ZPRE orders | :582-646 | CheckDocumentExistsSD36Async ZMER only (:257) | CODE | low |
| G14-45 (added) | Contact phone = delivery phone; dead fallback | :521-533 | :348, :365-373 | DEC | low |

### G15 Product export, catalog sources, pickup detail, MovBita

| id | Rule | LAN | ServicioSAP | Need | Impact |
|---|---|---|---|---|---|
| G15-01 | Image filter fail-closed | SP_eCommerceexportaMA.sql:1358-1368 | EcommerceMethods.cs:623-627, :641-645 | CODE | high |
| G15-02 | Configurables | SP :3926-4499 | FASE 14 commented (:1349-1350) | CODE | high |
| G15-03 | Attribute validation | SP :2041-2052 | Missing | CODE | medium |
| G15-04 | Viñeta description | SP :4814-4818, :4906-4917 | :1481, :1522 | CODE | medium |
| G15-05 (corr.) | Hide CELULAR with region R6 (Intelisis prop) | SP :4772-4801 | :1483 product_online=1 | DEC | medium |
| G15-06 | Special price rules | ProductMethods.cs:669-752, :860-866, :1264-1271 | :692-709 | CODE | high |
| G15-07 | Credit price matrix | :754-858, :1343-1402 | Missing | CODE | high |
| G15-08 | Persist the export | :1245-1341; SP :2959, :4383 | Returns JSON only | DEC | high |
| G15-09 | Failure behavior | :1233-1243 | Empty catch (:1377-1381) | CODE | high |
| G15-10 | VIU export | :1208-1212 | BadRequest | CODE | high |
| G15-11 | MAVI export | :1218-1220, :1255-1261, :1361-1365 | BadRequest | DEC | medium |
| G15-12 | listado (diagnostic) | – | EcommerceController.cs:12-26 | DEC | low |
| G15-13 | Tag build rules | TagsMethods.cs:16-188 | Raw rows | CODE | high |
| G15-14 | Load all tags | TagsMethods.cs:32-126 | eq '' (:1349) | CODE | medium |
| G15-15 | Tag category routes | :83-85 | Missing | DATA | medium |
| G15-16 | Image tables fed | SP :1363-1364 | SIGMAVI (ImagenMethods.cs:32-40) | DATA | medium |
| G15-17 | Escape filters | – | ProductMethods.cs:173, :212-260 | CODE | low |
| G15-19 | Decimal stock | SP | int.TryParse (:335) | DATA | medium |
| G15-20 | Delta stock push | ProductMethods.cs:942-991 | Missing | DEC | high |
| G15-21 | Delta source SP | :934 | Missing | DATA | medium |
| G15-22 | MAVI 10000 stock | :882-918 | Missing | DEC | medium |
| G15-23 | Per-store availability | ActualizacionStock.cs:36-108 | Missing | CODE | high |
| G15-24 | Notify via Magento sendStorePickupEmail | CodigoRecogerSucursal.cs:351-361 | SMTP (StorePickupMethods.cs:208-242) | DEC | high |
| G15-25 | Bare code response | OrdersController.cs:406-413 | JSON string | CODE | medium |
| G15-26 | Notify after rotation | :354-361 | Can fail after saving (:180-238) | CODE | medium |
| G15-27 | No pickup check in LAN | :367-394 | Guard (:174-178) | DEC | low |
| G15-28 (corr.) | Bank-transfer email template (belongs to CreateCodeBankTransferAsync) | :648-760 | MailHelper.cs:77-106 | CODE | medium |
| G15-29 | Somebody calls the pickup routes | – | – | DEC | medium |
| G15-30 | POST verb | OrdersController.cs:371 | GET (:244) | CODE | high |
| G15-31 | Digits-only phone | :96 | :348 | CODE | high |
| G15-32 | Only ClaveVenta on update | :141-145 | :399-412 | CODE | medium |
| G15-33 | Delivery phone | :521-533 | BP phone; dead call | DEC | medium |
| G15-34 | Response contract | OrdersController.cs:376-390 | :248-261 | CODE | medium |
| G15-35 | creditStatus source incl. option E | OrderMethods.cs:1876-1987 | MovBitaMethods.cs:23 | DEC | high |
| G15-36 | MovBita key and vocabulary | – | Vbeln only | EXT | high |
| G15-37 | creditStatus contract | OrdersController.cs:486-503 | Missing | CODE | high |
| G15-38 (added) | Disable/out-of-stock rows + delta | SP :2660-2907, :4912-4915 | Current set only | DEC | high |
| G15-39 (added) | Price + warranty push | ProductMethods.cs:481-667; WarrantyMethods.cs:16-50 | Missing | DEC | high |
| G15-40 (added) | Store-group stock thresholds | SP :2713-2804 | EcommerceMethods.cs:579-605 | DATA | medium |
| G15-41 (added) | Typed SP widths | SpWDM0285_CteRecoge.sql | Unsized (:387-411) | CODE | low |

## 6. Accepted differences (not gaps)

- **Data sources:**
  - SAP BP number instead of the Intelisis C account, in the same shapes (DU2).
  - BP05/BP05MA instead of Cte.
  - SD29 instead of PropreListaDFinal.
  - SD18 instead of FnVTASCalcularSaldo.
  - DIM11 instead of the existence tables.
  - SIGMAVI instead of IntelisisTmp: list tables (DU9), BpRecogePedidos, VentasCupones, CondicionesCredVtaLinea.
  - A_GET_TelefonoValidado with ZvalTel true replaces CteTel (TEL-1).
- **Transitional:** Magento may still send the Intelisis "C..." account (CX-07, C-09).
- **Customer builder:** the decided CQ answers.
  - CQ1=B uppercase names.
  - CQ4=B address and phone fields.
  - CQ5 int.Parse idMagento.
  - CQ6/CQ8 option d.
  - CQ7 Sntz.
  - CQ9 dead code removed.
  - CQ12=A rethrow.
  - CQ13 URL-encode.
  - CQ15 empty email.
  - CQ20 fileName unchanged.
  - Fiscalregimen "" (D-14).
  - Marst "1" (DU18).
  - MapGender empty → "1".
  - Generic RFC XAXX010101000.
  - SAP master constants.
- **Credit branch:**
  - D2, D4/TEL-1, D5/GEN-1, D6, D7, D8/§17 (Insert only).
  - DU12-DU17.
  - R4 (200 "Error, ...").
  - §27.8 no rollback.
  - uen/sucursal by storeId.
  - The eCommerceDetPedidos staging is not ported (R7/09-26).
- **Order creation:**
  - Duplicate check via SD36 PurchNoC.
  - Condition conversion via GetCondicionAsync.
  - Division "01" (R7a-10).
  - Org/plant mapping.
  - to_items instead of staging.
  - Agent as partner role Z1.
  - 200 on any exception (decision #4).
  - Pickup person registered after the SAP order.
- **Wallet:**
  - SS requires categoria.
  - Same response model.
  - Threshold rule equal.
  - Balance source equivalence.
- **getPlazos:** SD40 Zdiasgracia days. Values verified (E-46).
- **Documents:**
  - guardardocumento C-account fallback to the Token branch (CX-07).
  - The images folder is configurable.
- **Pickup:**
  - `products []` is not read by Magento for store_pickup. Magento's checkParams still rejects an empty array (G14-43): the key must be omitted.
  - SD36 + BP05 as the contact source.
- **Catalog:**
  - The E-16..E-21 SQLite steps are faithful ports of stage-delta.
  - deletePromociones is excluded from cargaCompleta (RPR-92).
  - The export half of the import belongs to the importer (D-53).
- **Out of scope:** Credilana (CreditoWeb_Informacion/_Solicitud/_SolicitudPrimerGuardado/_Seguro, SaveCredilanaInfo), APP mercancías (mercancias/*, SolicitudMercancia), Neko, Magento-direct and DMZ-local routes.
- **Parity, even where both sides are imperfect:**
  - Generic errors give 200 text in both (wholesale).
  - validateSms has no expiry or attempt count.
  - codigoPromocion Elimina returns '' (matrix row 151 is wrong).
  - bbvaKeyAdvanced.
  - obtenerQuejas.
  - mp_signature is not validated in either.
  - Credit limit computed but not enforced in LAN. This one waits for LIM-1 before it can be counted as accepted.

## 7. Refuted claims and first-pass errors

| Claim | Why it was wrong |
|---|---|
| G04-02: LAN sets the Magento account after a released card order (regex ^C\d+$) | LAN OpenpayMethods.cs:277 is always true, so SetCAccount never runs. Not a rule to port; it is a note under D-38. |
| G05-12: ServicioSAP needs a reprocess route and setOrder logging | The reprocess tool is retired (REVISION 2026-10-05:27, :968; ServicioSAP d6403ca). The DMZ already logs the request and response (DMZ OrdersController.cs:114, :197). |
| G05-13: The SMS table chain is a credit-branch gap | ServicioSAP reads the same tables with the same queries (OrderMethods.cs:585-609; SCW:333-368). Only the DMZ switch differs (C-14, a connection item). |
| G01-04 as a parity gap | Equal to LAN under CQ5. It is only a release risk. |
| G03-11: ServicioSAP is fail-open on an empty catalog | Empty or failed catalogs already give 0. Only the invented fallback channel is fail-open. |
| G06-12: a pre-cutover guide gives 404 | Both systems answer 500, because the HttpResponseException is caught by the generic catch. |
| G07-08: '0' matching is a regression | LAN also matched '0' when IDMagento was 0. The proven differences are numeric vs text comparison and 500 vs false. |
| G09-30: SAP has no shipment field | ZSDT_VBAK.Zembarqueestado exists, and order/new writes a placeholder into it (OrderMethods.cs:2356). |
| G10-13: is_first_purchase matters | Magento stores it but never reads it from this route. |
| G11-04 / G11-12: every failure gives "No tiene facturas" | Only SP execution errors do. Connection, Venta and parse errors give 500 in LAN too. |
| G12-16: APERTURA amounts already come from SAP | ServicioSAP serves them from the unfilled SQLite cache, and Magento always sends tipo CREDITO. |
| G13-04: the DELETE-before-read order is a difference | LAN does the same (Conn/Magento.cs:174-177). |
| G14-15: OpenpayMethods.cs:277 is always false | It is always true. Consequence: is_in_intelisis is never set and a failed creation is never retried. |
| G05-10: LAN treats lookup errors as "not found" | Both abort. Only P16 and the non-2xx-for-no-data case remain open. |
| G02-11 recommendation "NameOrg first" | Unsafe. ServicioSAP person BPs carry the store code in NameOrg1 (BusinessPartnerMethods.cs:443). |
| G09-01 root cause | LAN creates the Venta through the external liberador, not itself. ServicioSAP writes MAVICBOSANDROID, not SIGMAVI. |
| G09-03 reuse DeterminarSalesOrg | It takes an OrderRequest. An explicit uen map is needed. |
| G08-03 "TZ01 not called" | It is reachable through credit/getClienteFactura. Only GetAccountDebts does not use it. |
| G15-05 rule source | Intelisis prop R6 + LineaE CELULAR, not VTASCRegionSku. |
| G15-28 owner route | The email template belongs to the bank-transfer writer, not generateNew. |
| G04-09 LAN uppercased order customers | No evidence. It is a consistency question only. |
| Status: setCustomer PARTIAL | Corrected to DIF: it returns a new BP for known customers, and its exception contract is wrong. |
| Status: codigoPromocion PARTIAL | Corrected to RETIRE_CANDIDATE pending D-45. |
| Status: createStorepickupCode PARTIAL | Corrected to DIF: 405 for POST callers, and Magento rejects the status update. |
| Status: updateConfigurableProduct job PARTIAL | Corrected to BLOCKED: the push is the business outcome, and it waits on Dev 2 Sprint 9. |
| Summary "34 G12 rules compared" | It is 40. |
| G09 summary: nothing relevant changed in SalesMethods/BusinessPartnerMethods | Both changed (260ea1c; S1-S4). Behavior for G09 is unchanged. |

## 8. Doc corrections for the vault

1. **REVISION_PLAN_FABLE_Y_CONEXIONES_2026-10-05.md**
   - §4.1:85 → partner/client returns the BP string (BusinessPartnerController.cs:60), with the guard at :48-59.
   - §4.1:87-88 → CQ12 closed (CustomerMethods.cs:68).
   - §4.1:111 returnOrder → parity "no".
   - §4.1:106 setOrder → add the C-02 credit warning and the order BP builder divergence.
   - §4.1:112 → add the LAN inbound setOrderStatus (R7-1).
   - §4.1:151 → Elimina returns '' in both systems (parity).
   - §4.1:158 MonederoSaldoCredito → waits on a decision plus SAP SD confirmation.
   - §4.1:174 CreditoWeb_SaveData → order/new is a different flow.
   - §4.1:175 getPlazos → align with D-46.
   - §4.1:179 updateConfigurableProductLink → it has a LAN Production caller.
   - Rows 123/146 → BusinessPartnerController.cs:89-108, :180-194.
   - :43 → the pickup code is not "done" (G15-24..34).
   - C-13 :884 → generateNew is GET in LAN.
   - D-26, D-25, D-27, D-47, D-48, D-51 → line refs and precisions as listed in groups G02, G10 and G11.
   - D-28 → add the System.Text.Json defect.
   - D-29 → LAN returns 0 when there is no catalog.
2. **REVISION_PLAN_FABLE_2026-10-02.md**
   - R7d-1 → lines :471-492, :1777-1786.
   - R7d-6 → bank transfer already ported (61eb2c3).
   - R7d-5 → SD36 folio fixed.
   - R8-11 → SD52 at BusinessPartnerMethods.cs:346-382.
   - R9-04/R9-05 → line refs (CreditController.cs:114-146, :153-170).
   - R9-15 → CreditMethods.cs:466-504 handles Insert and Update.
   - R8-20 → name the RM1138 insert.
   - R8-12 → LAN "aceptado" is likely unreachable (trailing space at :612) and estatus is never reset.
3. **01_CustomersController.md**
   - :302, :312 (T1.1-02 status), :540, :625 → stale.
   - CQ10 → note the "" payload.
   - T1.2-03/CQ14 → add the uppercase interaction.
   - 1.1-R18 vs RBP-10 → Marst decided by DU18.
   - 1.6-R7, 1.7-R8, 1.7-R13 → the token is cached for 20 min (D-17).
4. **Business Rules Ecommerce.md**
   - Refresh the line refs: CatalogController, MagentoCatalogMethods, order/new (about 20-25 lines), CreditController, getPlazos, wholesale, SalesMethods :200/:182.
   - E-23/E-24 labels.
   - RCAN-1/RCAN-2 → tipo T/P, and 'noexiste' gives 400.
   - RDEV-7 → store absent for returns.
   - RCRE-25 → wording.
   - RABO GetAccountDebts → add UEN, policy, rounding, status.
   - RMON → Magento strips "\".
   - recuperarcuenta → uppercase vs case-sensitive eq.
   - exportaart pending list → add special/credit prices, image fail-open, Viñeta, R6, tags.
   - :588 → codigoPromocion exists in ServicioSAP.
   - validarCliente '0' → note.
   - RORD-34 and "Pendientes" PurchNoS → always fails.
   - :394, :872 → validateCredit is commented out in the DMZ.
5. **COMPARATIVA_SETORDER_LAN_VS_SAP.md**
   - D-01 fixed.
   - D-09 wrong (agent goes as Z1).
   - D-11 ported.
   - "BadRequest" → 200 "Error, ...".
   - The catch returns '' before crearPedido.
   - SS line refs are stale.
6. **PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md**
   - §27.1/.2/.4 → line refs (OM:1257-1263, :1223-1231, :673-707).
   - §27.1 G3 → TEL-1 closed, count 120/160.
   - §22.7 rows 16/B → pickup ported, writer source differs.
   - §27.5 corrections still pending in MATRIZ, CREDITO_WEB, ACTIVIDADES, CAMBIOS.
7. **CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md**
   - :62, :116-117 → line refs.
   - :937 Q-T2-1 → add option (E) MovBita.
8. **AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md**
   - C23/L113 → getMinimumCostToRedeem uses PostSAP on ConexionSAP.
   - C16 → DMZ :63.
   - R-07/C04 → superseded (validateCredit).
   - :95, :891 → GetEmpleadoByNomina has no destination.
   - :799-800 → Logins already use PostSAP.
   - :866 → CreditController lines.
9. **PLAN_FABLE_POR_CONTROLADOR.md**
   - :128 (PostSAP).
   - :157-160 (setreturn is not in production; missing routes).
   - :168 (Logins already switched; GetEmpleadoByNomina has no SS route).
10. **BAJA_getOrderId.md**
    - §6 → Provider.cs:108-133 is another reader.
    - §7 → Magento ignores products for store_pickup but rejects an empty array.
11. **FLUJO_RECOGER_EN_SUCURSAL.md**
    - :25, :33 → line refs.
    - :128/:163 → the phone comes from the BP and the address call is dead code.
12. **Flujo_Apertura_Cuenta_Sin_Mercancia.md:6** → PrimerGuardado is Credilana.
13. **FLUJO_CREDITO_LAN_VS_SAP.md:69-70** → add CreditoWeb_SaveData, FormDatos and SaveHaztenTransaction.
14. **master_migration_summary_unified.md:150-151** → FormDatos and SaveFirstData also serve ProductosMX.
15. **LAN - Mapa.md:159** → mark "to verify".
16. **_EXCLUIDOS_Intelisis.md:90** → GetAccountDebts is already switched.
17. **_DECISIONES_ODS.md:165** → obtenerCreditos is in package 8c. Cite :138-140 (point_redeemed) as decided.
18. **Resources/flujo_abonos_credito.md**
    - :96, :148 → the CLABE source is Cte.CuentaCLABESTP.
    - :78 → both outcomes update.
    - The methods are LAN methods, not DMZ.
19. **implementation_plan_master.md:76 / _GLOBAL_MASTER_DB.csv** → the SPs belong to GetAccountDebts, not to ApplyPayment.
20. **E-45_codigoPromocion.md** → line refs; Elimina is parity; add the employee fallback.
21. **E-14_obtenerImagen.md** → the overwrite difference is confirmed in code.
22. **SPEC_NIP_SMS_SERVICIOSAP.md** → §4 null handling; §3 GetIdRef is parameterized; line refs.
23. **Manual Tecnico Servicio SAP 01092026.md:369** → EjecutarProcesoCompletoAsync.
24. **ProspectoController/rfc/03_BusinessMethod.md** → the contract is {"RFC","status"}.

## 9. Recommended sequence

1. **This week, code that needs no decision:**
   - C-01 (SAP errors as success), C-02 (cancel lookup), C-03 (callback keys), C-05 (sap-client), C-06 (pre-1970 login).
   - C-07 (recuperarcuenta escape and case), C-08/C-09/C-10 (pickup status, phone, verb).
   - C-12 (invoice owner), C-13/C-14 (exportaart fail-closed and errors), C-19/C-21/C-22 (order BP and address), C-23 (wallet JSON), C-25 (debug dump).
   - The user compiles; one change per commit, following GUIA §1.8b.
2. **Interim routing safety, connection items for the DMZ owner (not code parity):**
   - Point DMZ GetAccountDebts (:146) and getClienteFactura (:51) back to LAN until DEC-09/DEC-10 ship. Check LAN token acceptance first.
   - Point GetCreditAmounts (:352) back to LAN if DEC-21 = A.
   - Do not release the DMZ credit branch before T1b (C-02).
   - Do not route openpay_cards to order/new (DEC-03 c).
3. **Decision session with the user**, in this order:
   - DEC-01, DEC-02, DEC-04, DEC-05, DEC-03, DEC-06, DEC-07, DEC-18, DEC-17, DEC-09, DEC-10, DEC-11.
   - Then DEC-14, DEC-15, DEC-16 and DEC-24 together with infra's C-15 log pull.
4. **Read-only checks by the user** (Fable runs no SQL): P-15 (BP05 filter and case), P-14, P-17, P-18, P-13, P-16, and the SIGMavi sp_helptext requests (X-18).
5. **External requests, sent with the explicit questions in §4.3:**
   - Valentín: DU11.
   - SAP SD: annulment, DU20, conditions, SD09/SD36 captures.
   - Dev 4/ABAP: R8-08/R8-09, N1-N6.
   - Infra: C-15.
   - SMS ops: CX-11.
   - Magento: idMagento capture, gate timing.
6. **Build the missing in-scope routes once their decisions land:**
   - GetPhoneValidatedClientSecretName (C-04, before the Magento BP release).
   - nombreCliente, GetIntelisisStatuses, the obtenerCreditos fixes, the wallet fixes after DEC-11, the setOrder pricing and terms after DEC-04/05.
   - Cancel and return after DEC-06 and the SAP annulment API.
7. **Data loads before each switch:** P-01, P-02 (pickup, guides), P-06 (Openpay), P-07/P-08 (catalog, images), P-10 (channel map).
8. **Catalog and import jobs** with Dev 2 Sprint 9 (4-18 Dec), per DEC-14/DEC-15. Keep LAN running them until then.
9. **Retirement batch** (DEC-30) after 30 days of IIS logs.
10. **Re-run this parity check** after steps 1, 3 and 6, against the S6 end-to-end results, and update the vault docs in §8.
