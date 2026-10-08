---
tags: [credito, apertura, handoff]
fecha: 2026-10-07
estado: vigente
---

# Handoff: credit opening process investigation ("Apertura de cuenta" / "Abre tu crédito")

> [!info] Why this file exists
> On 2026-10-07 the user asked to move the credit opening investigation to its own session, separate from the SAP migration / Fable plan work (which stays in the session "Análisis de migración SAP"). This file carries the context. Explain things to the user **in English**, as in the original session.

## 1. The request

Someone asked the user to investigate the complete **credit opening process** and produce a **template** describing it end to end: screens, endpoints, tables, stored procedures, APIs and connections. The starting point was a Gemini summary of the Magento project. It turned out to be partly wrong and to skip most of the flow (see the template's §8).

## 2. Deliverable (already written)

- **Template:** `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\PROCESO_APERTURA_CREDITO_2026-10-07.md` (v2, ~142 KB, includes the PWA front-end layer). Sections:
  1. Summary, variants, where it is born
  2. Systems map (mermaid)
  3. Step-by-step flow (sequence diagram + step table)
  4. Variants and branches (APERTURA, Credilana new client, ProductosMX, Credilana existing client, checkout credit)
  5. Inventories: endpoints, SPs, tables, databases, config keys, external services, crons
  6. After the request
  7. Migration status per step
  8. Gemini summary: right, wrong, skipped
  9. Open questions Q1-Q22 and defects D1-D32
  10. Sources
- **Data behind it:** `_PROCESO_APERTURA_CREDITO_2026-10-07.json` (back-end tracers T1-T7 + skeptic reviews) and `_PROCESO_APERTURA_CREDITO_PWA_2026-10-07.json` (front-end trace + review), same folder.
- How it was produced: 7 back-end tracers (Magento CreditMigration; other Magento modules; DMZ; LAN code; SPs/tables; post-request lifecycle + ServicioSAP coverage; vault docs), each checked by a skeptic agent, then a front-end tracer over the PWA with its own review. Code always won over documents.

## 3. The process in one screen

Chain: browser → **PWA `mavi-core`** (Vue Storefront, Vuex module `credilana`) → **`mavi-api`** (`/api/ext/mavi/*`, OAuth1 integration signature) → **Magento `Mavi_CreditMigration`** (`/V1/credito/guest/*`, via `Omnipro\IntelisisIntegration\Model\Adapter`, URLs in `core_config_data` `mavi_cliente/creditmigration/general/*`) → **DMZ** (`credit/CreditoWeb_*`, curl.Post to `URL_INTELISIS`) → **LAN** WebApiMagento → SPs in ServicioAndroid / IntelisisTmp.

- **Born at:** CMS page `/apertura-de-cuenta` (Magento CMS via Elasticsearch `cms_page`; the "Solicitar ahora" button is in that CMS HTML, not in code) → wizard `/credit/register` (5 screens: phone/state/city with "Verificar y continuar" → Hazten identity check → personal data + reference → SMS NIP + bureau consent → pre-authorized screen with prospect `P########`).
- **`tipo`:** `APERTURA` (article AMER00100, origin "APERTURA CUENTA", condition `12 M MA P INM` / `12 M VIU P INM`) or `CREDITO` (Credilana new client, `/credilana/nuevo/registro`; VIU `/prestamo-personal/nuevo/registro`).
- **Key SPs:** `SpCREDISolicitudWebPrimerGuardado` (pre-request + NIP), `SP_GeneraConsecutivoCteMavi` (prospect number), `SP_CREDITO_WEB_DATOS` 'Insert_2' (request, estatus 7) then 'Update' 10 s later (estatus 8). Images → file share + AdminDoc; Magento cron syncs biometrics to SIGMAVI; ProspectTracking cron only sends a GA4 event.
- **ProductosMX** (opening together with a purchase) is born in the native Magento checkout ("Mi Crédito" → `/productosmx`), not in the PWA. "Crédito Muebles América" is the checkout payment-method label.
- **Inventory size:** ~45 Magento endpoints, ~35 DMZ routes, ~30 LAN routes; ~20 SPs/functions (9 without source on the share); ~45 tables across ServicioAndroid, IntelisisTmp, SIGMAVI, AdminDoc, Comercializadora, Magento MySQL and SQLite.
- **Migration:** ServicioSAP only has `GetCreditAmounts` (cache never filled), `SaveImagesProductosMx` and `codigoPromocion`; the rest of the opening is missing (PARIDAD group G12, decision DEC-22 / R9-15 pending). The share's DMZ Web.config points `URL_INTELISIS` at the same host as `URL_SAP` (localhost:44399), so these calls would hit ServicioSAP routes that do not exist.

## 4. Main defects found (to confirm with owners; nothing was changed)

D1 NIP never enforced server-side · D2 anonymous `sendNip` without throttle · D3 duplicate RFC/CURP/phone check always passes · D4 two prospect numbers burned per opening · D5 failed insert reported as success · D7 ProductosMX overwrites postal code with promoter code · D17 state/city never sent · D18 APERTURA sends the NIP twice · D20 `saveAuthorization` route does not exist · D21/D22 CURP check and liveness auto-close depend on missing config keys · D23 wizard state not persisted · D27 wizard blocks at step 2 if Hazten is off · D32 Magento integration secrets committed in mavi-api configs (names only in the doc) · no code analyzes/approves the request and no decision SMS/email exists. Full list D1-D32 in the template §9.2.

## 5. Open questions (template §9.1, Q2-Q22; Q1 closed)

Most important: Q2 real `core_config_data` URLs per environment (user runs the read-only query) · Q3 production DMZ `URL_INTELISIS` · Q4 which Intelisis process analyzes the request and writes `CREDIHProspectoACliente` · Q5 export of 9 missing SP sources (`sp_helptext`, run by the user) · Q8 R9-15 vs DEC-22 · Q12 business owner of APERTURA/ProductosMX/Credilana · Q15 content of CMS page `apertura-de-cuenta` · Q20 which mavi-core/mavi-api branches are deployed (local mavi-core is on feature branch `11767-double_categories_v1`).

## 6. Pending offers to the user (not answered yet)

- Publish the template as a private web page (Artifact) with a shareable link, since it was requested by someone else.
- A Spanish version, if the requester needs it.
- Help answering the open questions (prepare the read-only queries/requests).

## 7. Working rules carried over

- Read-only investigation. **Never run SQL** against MAVI databases (give the exact query to the user to run). No HTTP calls to SAP/Magento/DMZ without the user's go-ahead.
- Never print secrets; name config keys only. Mask personal data.
- Questions to the user must be explicit: table.column / SAP field, method and file:line on each side, an example, options and a recommendation.
- Code wins over documents; the newest document wins between documents.
- Paths: share `\\172.16.214.58\sap` (Magento248, DMZ, LAN, ServicioSAP, vault `.agents\skills\lan-sap-migration`); PWA on the user's disk `C:\Users\claude\Documents\mavi-pwa` (mavi-core, mavi-api).
- The SAP migration / Fable plan (pending confirmations in `MappingMetods\CONFIRMACIONES_PENDIENTES_2026-10-06.md`) belongs to the other session: do not continue it here.
