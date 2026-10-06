---
tags: [migracion, sap, fable, plan, CustomersController]
fecha: 2026-09-30
estado: vigente
alcance: paquete 1 de PLAN_FABLE_POR_CONTROLADOR. CustomersController del DMZ (5 rutas) y las 2 rutas LAN-only del mismo controlador de LAN
fuente_del_tablero: MappingMetods/MAVI - DMZ-SAP.csv filas 32-36 y 116-117, contrastadas contra el código del share el 2026-09-30
---
# Paquete 1 · `CustomersController`: tablero verificado y plan para Fable
> 2026-10-01: cómo funciona ServicioSAP hoy está en [[Business Rules Ecommerce]] (fuente única). Este documento queda como plan; si contradice a esa fuente, gana la fuente.

> [!abstract] En una línea
> Las 5 rutas del DMZ ya van a ServicioSAP y las 2 LAN-only ya tienen su ruta en ServicioSAP. Ninguna necesita solo conectar el DMZ. La deuda está en **`customer/setCustomer`**: devuelve el objeto `Client` en lugar de la cuenta, crea un BP nuevo en cada llamada y guarda valores distintos a los de LAN. Además quedan tres diferencias en la rama de error (listas y cuentas), un riesgo en `Logger` y las E2E por el DMZ. Este documento trae la regla, la evidencia, la tarea y el prompt de Fable de cada cosa. Se puede leer solo.

---

## 0. Cómo usar este paquete con Fable

### 0.1 Lectura obligatoria (en este orden)

1. `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\SKILL.md`: las 32 reglas de construcción. Las que más pesan aquí: 6, 12, 17, 18, 19, 23, 25, 27, 28.
2. `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\GUIA_MIGRACION_FABLE.md` §0-§2 completas. Además §1.9 "Replicar, no mejorar", §2 (evidencia válida), §3.1 (contratos rotos), §8.6-§8.7 (prerrequisitos y hallazgos retirados) y §9b (compilar).
3. Este documento: §0, §1 y la sección de §3 que toque la sesión. Cada sesión de §4 dice qué secciones leer.

Si este documento contradice al código del share, **manda el código** y se reporta. Si contradice a otro documento del vault, manda este y el otro va en la lista de §2.3.

### 0.2 Rutas y abreviaturas

Todas las rutas son relativas a `\\172.16.214.58\sap`.

- **DMZ** = `DMZ/WebApiMagento/` (rama `ConexionSAP`, HEAD `09cb341`, working tree limpio el 2026-09-30). **DCC** = Controllers/CustomersController.cs · **DCURL** = Helper/Curl.cs · **DMC** = Controllers/MagentoController.cs · **DMAG** = Conn/Magento.cs · **DREQ** = Models/CustomerRequest.cs · **DTVH** = Controllers/TokenValidationHandler.cs.
- **LAN** = `LAN/WebApiMagento/`. **LCC** = Controllers/CustomersController.cs · **LCUM** = Metodos/CustomerMethods.cs · **LOM** = Metodos/OrderMethods.cs · **LCURL** = Helper/Curl.cs · **LMAG** = Conn/Magento.cs · **LCONN** = Conn/Connection.cs · **LPIM** = Metodos/ProductImage/Methods.cs · **LTVH** = Controllers/TokenValidationHandler.cs · **LLOGIN** = Controllers/LoginController.cs.
- **SS** = `ServicioSAP/ServicioSap/ServicioSap/` (rama `SpExportaEcommerce`, HEAD `2cf425f`). El working copy tiene 4 archivos modificados del crédito (OM, SolicitudCreditoWebMethods, FinalListProperMethods, InfoClienteRequest) y ninguno de este paquete. **SBPC** = Controllers/BusinessPartnerController.cs · **BPM** = Methods/BusinessPartner/BusinessPartnerMethods.cs · **SCC** = Controllers/CustomersController.cs · **SCUM** = Methods/Customer/CustomerMethods.cs · **CRM** = Methods/Customer/CashReportMethods.cs · **MAM** = Methods/Customer/MagentoAccountMethods.cs · **SCURL** = Helpers/ConexionDMZ/Curl.cs · **SLOG** = Helpers/Logger.cs · **SQLH** = Helpers/ConexionDB/ConexionSQL.cs · **IMP** = Helpers/Impersonation/Impersonation.cs · **OM** = Methods/Order/OrderMethods.cs (working copy; las líneas citadas se volvieron a comprobar el 2026-09-30) · **STVH** = Helpers/TokenValidationHandler.cs · **SLOGIN** = Controllers/LoginController.cs · **CSPROJ** = ServicioSap.csproj · **SWC** = Web.config. Del Web.config solo se citan **nombres de llave**, nunca valores.
- **SP** (`.agents/skills/lan-sap-migration/SPsOrden/`). **CTN** = SP_eCommerceCtenuevo.sql · **LNB** = SpVTASListaNBMagento.sql.
- **Magento** (`Magento248/Magento248/app/code/`). **EML** = Omnipro/EmailageLists/Helper/Data.php · **CMA** = Mavi/CuentaMavi/Model/CuentaManagement.php · **CMI** = Mavi/CuentaMavi/Api/CuentaManagementInterface.php · **CMX** = Mavi/CuentaMavi/etc/webapi.xml · **RDP** = Mavi/CustomCashCustomerReport/Model/ReportDataProcessor.php · **ADP** = Omnipro/IntelisisIntegration/Model/Adapter.php.
- **Documentos** (`.agents/skills/lan-sap-migration/MappingMetods/` salvo que se diga otra cosa). **GUIA** = GUIA_MIGRACION_FABLE.md · **PLAN_FABLE** = PLAN_FABLE_POR_CONTROLADOR.md · **CREDITO** = CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md · **CSV** = `MAVI - DMZ-SAP.csv` · **EP** = _NUESTROS_ENDPOINTS/ESTADO_PRUEBAS_Y_AVANCE.md · **E-02 … E-13** = _NUESTROS_ENDPOINTS/Contratos/E-xx_*.md · **ODS** = _NUESTROS_ENDPOINTS/_DECISIONES_ODS.md · **CML** = _NUESTROS_ENDPOINTS/CHECKLIST_MIGRACION_LAN_A_SAP.md · **DEV3** = `.agents/skills/lan-sap-migration/Checklists/CHECKLIST_DEV3_NOSAP_NOINTELISIS.md` · **CHK_BP** = `.agents/skills/lan-sap-migration/CoreccionesVal/CHECKLIST_CAMPOS_BP_ECOMMERCE.md` · **RSG_BP01** = `.agents/skills/lan-sap-migration/RSG/bp01_bp02_maestro.md` · **AUD** = AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md · **MATRIZ** = MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP.md · **COMP_BP** = COMPARATIVA_BP_LAN_VS_SAP.md.

**Ids.** Las reglas se llaman `1.N-Rk`: 1.1 setCustomer, 1.2 setCustomerList, 1.3 getCustomerList, 1.4 deleteCustomerList, 1.5 cashCustomerReport, 1.6 getCuenta y 1.7 setCuenta. La sección §3.N corresponde a la ruta 1.N. Las tareas se llaman `T1.N-xx`. Las tareas compartidas son `T1.L-xx` (las tres listas), `T1.C-xx` (las dos cuentas), `T1.H-01` (higiene), `T1.0-DOC` (documentos) y `T1.0-DEP` (ramas y despliegue). Las preguntas al usuario son `CQ1 … CQ27` (§5). Llevan la C para no confundirlas con las Q1-Q22 del crédito.

### 0.3 Estados

- **Reglas:** **EQ** = igual · **EQ-R** = igual por una decisión o con la fuente SAP equivalente · **DIF** = distinto · **FALTA** = no existe en ServicioSAP · **PENDIENTE** = falta evidencia (prueba o fuente) · **N/A** = no aplica o es un prerrequisito de pase (GUIA §8.6).
- **Tareas:** **HECHO** (en el working copy, sin commit) · **LISTO** (se aplica sin preguntar) · **DECISION** (espera la respuesta del usuario, §5) · **BLOQUEADO_EQUIPO** (espera a otro equipo) · **VERIFICACION** (prueba o lectura: no edita código) · **PRERREQUISITO** (lo hace otro equipo el día del pase; no es defecto, GUIA §8.6).
- **Trabajo requerido** (definiciones del usuario): **SOLO_CONECTAR_DMZ** si Generado=Si y Conectado=No · **CONSTRUIR** si Generado=No · **VERIFICAR_PARIDAD** si los dos están en Si · **CORREGIR_PARIDAD** si los dos están en Si pero hay una DIF o FALTA probada en código.

### 0.4 Reglas duras (no se reabren)

- **DU1.** Las conexiones SQL del `Web.config` (usrintranet) son correctas y `Conexion.dll` es para S4. Las credenciales y URLs (localhost, rutas de share, `STAGE`) son de Dev: **nunca** son bloqueo ni hallazgo, y **nunca** se imprimen sus valores.
- **DU2.** Magento manda como cuenta solo el BP numérico de SAP. **No se planea ningún mapeo de cuentas `C…`.** En `setCustomer` la cuenta de LAN (`C…`) se sustituye por el número de BP, sin traducción.
- **DU5.** ServicioSAP guarda y devuelve exactamente lo que guardaban y devolvían LAN + SP, incluidas las diferencias entre `null`, `''` y el default, con las fuentes SAP equivalentes.
- **DU9.** Una tabla o SP de SIGMavi renombrado (`SpListaNBMagento` = `SpVTASListaNBMagento`, `ListaNegra`/`ListaBlanca` = `VTASCListaNegra`/`VTASCListaBlanca`) **no** es diferencia.
- **Gender** = `BusinessPartnerMethods.MapGender`, y la tabla `Marst` 1 Soltero … 6 Pareja de hecho: no se vuelven a preguntar. El `Marst` fijo del alta de BP se decide **una sola vez** en CREDITO §6.3.15 (P14), no aquí.
- **GUIA §1.9 Replicar, no mejorar.** Todo es uno a uno con LAN. **Prohibido** crear variables, parámetros, constantes o métodos que la tarea no nombre (§1.9b). Si replicar exige algo que no existe, se para y se pregunta. Si ya existe una función, se usa (§1.9c).
- **GUIA §1.8b-c.** Un cambio de valor que viaja a SAP va en su propio commit. Los vacíos y los `0` que el legado define se respetan: solo se corrige la **regresión**, es decir, donde LAN manda un valor real que ServicioSAP perdió.
- **GUIA §1.5 y §8.7 R-03.** El DMZ es solo un puente: en este paquete **no se toca el DMZ**. Que el puente no propague el status HTTP no es hallazgo.
- **GUIA §2.** Un resumen `.md` no es evidencia primaria. La evidencia es el código, la ficha RSG o un response real. Una equivalencia de campo que no se contesta con nombres de campo se decide con una E2E.
- **Fuera de alcance:** Credilana y la APP mercancías (GUIA §1.6b). Ninguna ruta de este controlador es de ellas.

### 0.5 Git, CRLF, BOM y compilación (V1)

Los archivos de ServicioSAP están en `i/lf w/crlf`. La herramienta Edit escribe LF, así que **después de cada Edit** hay que restaurar CRLF conservando el BOM de cada archivo. Estado de BOM comprobado el 2026-09-30: **BPM con BOM**; SBPC, SCC, SCUM, CRM, MAM, SCURL, SLOG y `Models/SAP/BusinessPartner/Client.cs` **sin BOM**. Los `.md` del vault van sin BOM y con CRLF.

**Paso 0, después de cada Edit** (PowerShell, conserva el BOM):
```powershell
$p='<ruta>'; $b=[IO.File]::ReadAllBytes($p); $bom=($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF); $t=([IO.File]::ReadAllText($p) -replace "`r`n","`n") -replace "`n","`r`n"; [IO.File]::WriteAllText($p,$t,(New-Object System.Text.UTF8Encoding($bom)))
```
Comprobar con `git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP" ls-files --eol -- <ruta relativa>`. Tiene que salir `w/crlf`, nunca `w/lf` ni `w/mixed`. Si `git diff --stat` muestra un archivo cambiado entero, se dañó el EOL.

**Paso 1, chequeo rápido:** el de GUIA §9b ("El chequeo rápido"), corrido desde `SS` con el Roslyn de `packages\`. Si ya existe el `build.rsp` de CREDITO §6.5.1 paso 1, sirve igual: se copia al scratchpad propio y se cambia `/out:`. Si una tarea crea un `.cs`, se registra en CSPROJ (regla 19) y en el `.rsp`.

**Paso 2, cierre con MSBuild** (sin escribir en `bin\` ni `obj\` del share):
```powershell
$roslyn = "\\172.16.214.58\sap\ServicioSAP\ServicioSap\packages\Microsoft.CodeDom.Providers.DotNetCompilerPlatform.2.0.1\tools\RoslynLatest"
$o = "<SCRATCHPAD>\msbuild"
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe" \\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap\ServicioSap.csproj /t:Build /p:Configuration=Debug /p:VSToolsPath= /p:CscToolPath=$roslyn /p:CscToolExe=csc.exe /p:OutDir=$o\bin\ /p:IntermediateOutputPath=$o\obj\ /nologo /verbosity:minimal /m
```
**Criterios de V1:** (1) el paso 1 sin `: error `; (2) el paso 2 con `$LASTEXITCODE = 0` y la línea `ServicioSap -> …\ServicioSap.dll` (avisos aceptados: `ToolsVersion 15.0` y `MSB3644`); (3) `w/crlf` en cada archivo tocado y el BOM como estaba; (4) `bin\ServicioSap.dll` y `obj\` del share sin cambio de fecha; (5) `git status` solo con lo esperado.

**Git:** siempre con `-c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP"` (en el DMZ, `…/SAP/DMZ`). **Sin commit** salvo que el usuario lo pida. Si lo pide, un commit por tarea, y los cambios de valor hacia SAP (T1.1-02, T1.1-06, T1.1-11) van cada uno en su commit (GUIA §1.8b).

### 0.6 Lo que Fable no hace en este paquete

- No toca el DMZ ni Magento.
- No ejecuta SQL, no llama endpoints y no arranca el servicio. Prepara el request, el SELECT y el valor esperado; el usuario ejecuta, pega el resultado y Fable compara.
- No crea BP, no escribe en SIGMavi ni en el share sin el visto bueno del usuario para esa prueba concreta.
- No implementa una DECISION sin la respuesta escrita del usuario en §5, ni una tarea BLOQUEADO_EQUIPO en parcial.
- No edita otros documentos del vault sin aprobación (SKILL regla 23). Las correcciones están listadas en T1.0-DOC. **Excepción (decisión del usuario 2026-10-02, X-1):** [[Business Rules Ecommerce]] sí se actualiza en el mismo cambio —el bloque de cada ruta afectada y sus citas `archivo:línea`, según su sección "Cómo mantener este documento" (SKILL.md, "Fuente única de cómo funciona ServicioSAP")— siempre que el cambio se base en reglas ya definidas (decisiones del usuario o reglas de negocio documentadas). Si el cambio necesita una regla que no está definida, no se inventa: Fable se detiene y pregunta.
- No imprime secretos (valores del `Web.config`, `USER_DMZ`, tokens) ni datos personales reales. En el vault solo se escriben marcadores `<<…>>` y correos `@example.invalid`.

---

## 1. Tablero verificado del controlador

### 1.1 Una fila por endpoint

| Ruta | Ruta DMZ | Ruta ServicioSAP | Programador | Conectado CSV → verificado | Generado CSV → verificado | Trabajo requerido | Reglas | Estado del paquete |
|---|---|---|---|---|---|---|---|---|
| 1.1 | `customer/setCustomer` POST (DCC:18-38) | `partner/client` POST (SBPC:34-54) | Marcos | Si → **Si** (DCC:30) | Si → **Parcial**: contrato roto, sin búsqueda ni actualización (SBPC:48, BPM:465) | **CORREGIR_PARIDAD** + **CONSTRUIR** (T1.1-03) | EQ 1 · EQ-R 5 · DIF 14 · FALTA 2 · PEND 1 · N/A 3 (26) | 2 LISTO (S1) · 9 DECISION (S4-S5) · E2E (S6) |
| 1.2 | `customer/setCustomerList` POST (DCC:40-75) | `customer/setCustomerList` POST (SCC:15-55) | Diego | SI → **Si** (DCC:70) | Si → **Si** (SCC:15-55, SCUM:16-97, CSPROJ:224, :264) | **CORREGIR_PARIDAD** → corregido en S3 (T1.2-02, 2026-10-05, sin E2E: el valor del filtro BP05 va codificado). Pasa a VERIFICAR_PARIDAD cuando la E2E de S6 lo confirme | EQ 8 · EQ-R 6 · DIF 0 · FALTA 0 · PEND 8 · N/A 1 (23) | E2E (S6) · S3 hecha el 2026-10-05 (T1.2-02 código, T1.2-04 doc) · fuente del SP bloqueada (S7) |
| 1.3 | `customer/getCustomerList` GET con body (DCC:77-93) | `customer/getCustomerList` POST (SCC:57-77) | Diego | SI → **Si** (DCC:88) | Si → **Si** | **CORREGIR_PARIDAD** → corregido en S3 (T1.L-02 = A, 2026-10-05, sin E2E). Pasa a VERIFICAR_PARIDAD con la E2E de S6 | EQ 8 · EQ-R 6 · DIF 0 · FALTA 0 · PEND 2 · N/A 2 (18) | T1.L-02 HECHO (S3, 2026-10-05, sin E2E) · E2E (S6) |
| 1.4 | `customer/deleteCustomerList` POST (DCC:95-111) | `customer/deleteCustomerList` POST (SCC:79-88) | Diego | SI → **Si** (DCC:106) | Si → **Si** | **CORREGIR_PARIDAD** → corregido en S3 (T1.L-02 = A, 2026-10-05, sin E2E). Pasa a VERIFICAR_PARIDAD con la E2E de S6 | EQ 11 · EQ-R 2 · DIF 0 · FALTA 0 · PEND 3 · N/A 2 (18) | T1.L-02 HECHO (S3, 2026-10-05, sin E2E) · E2E (S6) |
| 1.5 | `customer/cashCustomerReport` POST (DCC:113-125) | CSV `To Do` → **`customer/cashCustomerReport`** POST (SCC:112-118) | Diego | Si → **Si** (DCC:120) | Si → **Si** (CRM:47-87, CSPROJ:245, :263, :369) | **VERIFICAR_PARIDAD** (+ riesgo de `Logger`, T1.5-04) | EQ 7 · EQ-R 8 · DIF 0 · FALTA 0 · PEND 0 · N/A 1 (16) | T1.H-01 HECHO (S2) · T1.5-03 cerrada sin código (CQ20, 2026-10-05) · T1.5-04 pendiente de confirmar A (CQ21) · E2E en QA (S6) |
| 1.6 | **sin ruta DMZ** (LAN-only: LCC:89-96) | CSV `N/A (MAGENTO)` → **`customer/getCuenta`** POST (SCC:90-98) | Diego | Si → **N/A**: no hay ruta DMZ que conectar | Si → **Si** (MAM:21-28, CSPROJ:224, :265, :369) | **VERIFICAR_PARIDAD** + T1.C-01 (rama de error) + corte del consumidor (T1.C-02) | EQ 19 · EQ-R 4 · DIF 4 · FALTA 0 · PEND 0 · N/A 1 (28) | DECISION T1.C-01 (CQ24 sin respuesta el 2026-10-05) · E2E (S6) · consumidor bloqueado (S7) |
| 1.7 | **sin ruta DMZ** (LAN-only: LCC:98-105) | CSV `N/A (MAGENTO)` → **`customer/setCuenta`** POST (SCC:100-108) | Diego | Si → **N/A** | Si → **Si** (MAM:30-38) | **VERIFICAR_PARIDAD** + T1.C-01 + corte del consumidor (T1.C-02) | EQ 13 · EQ-R 4 · DIF 3 · FALTA 0 · PEND 2 · N/A 1 (23) | DECISION T1.C-01 (CQ24 sin respuesta el 2026-10-05) · E2E de escritura (S6) · consumidor bloqueado (S7) |

**Sobre "Trabajo requerido" en 1.6 y 1.7.** No hay nada que construir ni que conectar (el DMZ no tiene la ruta, DCC:19, :41, :78, :96, :114). Lo abierto es una E2E y la decisión de la rama de error. Si el usuario elige replicar LAN en T1.C-01 (opción B), la clase pasa a CORREGIR_PARIDAD. Se les aplica el mismo criterio a las dos, que son gemelas (MAM:21-38).

**Sobre "Conectado".** Está verificado sobre la rama `ConexionSAP` del DMZ. Las ramas `master` y `Stage` siguen mandando las 5 rutas a LAN (§2.2). Eso no cambia el valor según la definición del usuario (el código del puente existe), pero bloquea el pase (T1.0-DEP).

### 1.2 Filas deprecadas y fuera de alcance

- **Filas `DEPRECADO` de este controlador:** ninguna. El CSV tiene 18 filas con `DEPRECADO`, ninguna entre las filas 32-36 ni 116-117.
- **Credilana / APP mercancías:** ninguna ruta de este controlador (GUIA §1.6b).
- **Cupones, DIMAS MX y CodigoRecomendador** (deprecados en el vault): no aparecen en este controlador.
- **Filas vecinas que no son de este paquete:** `magento/getCuenta` y `magento/setCuenta` (CSV:75-76, DMC:111-127) son el salto DMZ → Magento que usan LAN y ServicioSAP en 1.6 y 1.7. No cambian y pertenecen al paquete 11 (PLAN_FABLE:186-190). Las rutas `customer/wallet/*` son el paquete 4.

### 1.3 Lo que hay en el código contra lo que dice el CSV

El usuario pidió revisar si el proyecto tiene más o menos endpoints que el documento. Se contaron los atributos `[Route]` el 2026-09-30:

| Proyecto | Rutas de `customer` en el controlador | Contra el CSV |
|---|---|---|
| DMZ `ConexionSAP` | 5: `setCustomer` DCC:19, `setCustomerList` :41, `getCustomerList` :78, `deleteCustomerList` :96, `cashCustomerReport` :114. Las 5 con `PostSAP` (DCC:30, :70, :88, :106, :120) | = filas 32-36. **Ni más ni menos** |
| DMZ `origin/master` | 4 (no existe `cashCustomerReport`), todas con `curl.Post` a LAN (`git show origin/master:WebApiMagento/Controllers/CustomersController.cs`: :26, :63, :81, :99) | La rama de producción no tiene la fila 36 |
| DMZ `origin/Stage` | 5, todas con `curl.Post` a LAN (:26, :63, :81, :99, :113) | Nada conectado en Stage |
| LAN | 7: `setCustomer` LCC:14, `setCustomerList` :24, `getCustomerList` :54, `deleteCustomerList` :80, `getCuenta` :90, `setCuenta` :99, `cashCustomerReport` :108 | = filas 32-36 + 116-117. **Ni más ni menos** |
| ServicioSAP | `CustomersController`: 6 (`setCustomerList` SCC:16, `getCustomerList` :58, `deleteCustomerList` :80, `getCuenta` :93, `setCuenta` :103, `cashCustomerReport` :113). `setCustomer` lo atiende `partner/client` POST (SBPC:35) | Cubre las 7 filas. No hay ruta de cara al DMZ sin fila |

**Conclusión:** el CSV no omite ni sobra ningún endpoint de este controlador. Lo que falla son celdas: tres rutas de ServicioSAP mal escritas (filas 36, 116 y 117), un `Generado` exagerado (fila 32) y el `Conectado` de las filas LAN-only (§2.1).

### 1.4 Tablero de tareas

| Id | Ruta | Título | Estado | Clase | Dev | Sesión | Depende de |
|---|---|---|---|---|---|---|---|
| T1.1-01 | 1.1 | Devolver el número de BP en lugar del `Client` | **HECHO** (2026-10-05, sin E2E) | CORREGIR | Marcos | S1 | — |
| T1.1-02 | 1.1 | `FiscalRegimen = "605"` como LAN | **DECISION** (aplicado y revertido el 2026-10-05: se mantiene `""` hasta que confirme el dueño fiscal de SAP; D-14 reabierta) | CORREGIR | Marcos | — | — |
| T1.1-01b | 1.1 | Dónde vive la guarda de `Partner` vacío | **HECHO** (2026-10-05, S4, sin E2E: CQ8 se resolvió con la opción (d) de T1.1-08 en el controlador, SBPC:48-59, sin orquestador ni miembros nuevos; el orquestador `SetCustomerAsync` queda para S5 con T1.1-03 y la guarda se mueve ahí) | CORREGIR | Marcos | S4 | T1.1-01 |
| T1.1-03 | 1.1 | Buscar el BP existente antes de crear, y actualizarlo | DECISION (CQ2, CQ3) | **CONSTRUIR** | Marcos | S5 | Orquestador `SetCustomerAsync` (la guarda de T1.1-01b ya está en SBPC:48-59 y se mueve ahí), T1.1-09 paso 0; T1.1-04 y T1.1-05 ya hechas (S4) |
| T1.1-04 | 1.1 | Orden de los nombres y mayúsculas | **HECHO** (2026-10-05, S4, sin E2E: CQ1 = B; `ToUpperInvariant()` sobre nombre, apellidos y correo en BPM:394-397; orden conservado, confirmado por el payload de CQ10) | CORREGIR | Marcos | S4 | — |
| T1.1-05 | 1.1 | Helper `Sntz` heredado de LAN | **HECHO** (2026-10-05, S4, sin E2E: `Methods\Utils\SntzMethods.cs` nuevo, con BOM y CRLF, registrado en CSPROJ:279; aplicado a los 7 campos de LAN en BPM:394-405) | CORREGIR | Marcos | S4 | — |
| T1.1-06 | 1.1 | Valores que LAN nunca guardó (dirección, teléfono, nacimiento, Region) | **DECISION cerrada sin código** (2026-10-05, S4: CQ4 = B, se conservan los valores actuales; R11, R14, R15 quedan como DIF aceptada) | CORREGIR | Marcos | S4 | `Marst` en CREDITO P14 |
| T1.1-07 | 1.1 | `idMagento`/`storeCode` inválidos y resolvedor único de organización | **HECHO en parte** (2026-10-05, S4, sin E2E: solo `idMagento`, `int.Parse` en BPM:404 y `ParseMagentoId` borrado; `storeCode`, `mavi` y el resolvedor único siguen **sin cambio** porque CQ5 no los contestó, R4 sigue DIF) | CORREGIR | Marcos | S4 | T1.1-08 |
| T1.1-08 | 1.1 | Cuerpo y status de la falla | **HECHO** (2026-10-05, S4, sin E2E: opción (d), 200 `"Error, <Message de toReturn>"` cuando BP01 responde sin `Partner`, SBPC:48-59; las excepciones siguen por el catch SBPC:62-65) | CORREGIR | Marcos | S4 | — |
| T1.1-09 | 1.1 | E2E de paridad (paso 0: filtrabilidad de BP05) | VERIFICACION | — | Marcos + usuario | paso 0 antes de S5; resto en S6 | T1.1-01 … -11 |
| T1.1-10 | 1.1 | Código muerto del builder | **HECHO** (2026-10-05, S4: borrados `nombreCompleto`, `nacimientoOdata` + `FormatDateSapOData`, `mappedVkorgKnvp`, el bloque comentado de `EnableBpCombination` en `SubmitClientInfoAsync` y, por T1.1-07, `ParseMagentoId`; cada pieza buscada antes en todos los `.cs` de la solución: ningún otro uso. `EnableBpCombinationAsync` y `BpCombinationRequest` se conservan: los usa `partner/enablechanelorg`) | CORREGIR | Marcos | S4 | — |
| T1.1-11 | 1.1 | Contacto tipo 20 que LAN no creaba | **DECISION cerrada sin código** (2026-10-05, S4: CQ4 = B, se conserva el contacto tipo 20; R25 queda como DIF aceptada) | CORREGIR | Marcos | S4 | — |
| T1.2-01 | 1.2 | E2E por el DMZ con conteo de filas y fila guardada completa | VERIFICACION | — | Diego + usuario | S6 | T1.L-01 ayuda |
| T1.2-02 | 1.2 | Correos con `+ & # %` en la validación contra BP05 | **HECHO** (2026-10-05, S3; sin la E2E previa por decisión del usuario, CQ13; E2E en S6; compila el usuario) | CORREGIR | Diego | S3 | — |
| T1.2-03 | 1.2 | Mayúsculas y espacios finales en el correo | VERIFICACION → DECISION (CQ14) | — | Diego | S6 | — |
| T1.2-04 | 1.2 | Correo vacío | **HECHO** (2026-10-05, S3: CQ15 aceptada, 1.2-R11 → EQ-R; solo documento) | doc | Diego | S3 | — |
| T1.3-01 | 1.3 | E2E por el DMZ | VERIFICACION | — | Diego + usuario | S6 | T1.L-02 para el caso de falla |
| T1.4-01 | 1.4 | E2E por el DMZ | VERIFICACION | — | Diego + usuario | S6 | T1.L-02 para el caso de falla |
| T1.L-01 | 1.2-1.4 | Fuente de `SpListaNBMagento` y DDL de las listas | BLOQUEADO_EQUIPO (CQ16) | VERIFICACION | Diego + DBA SIGMavi | S7 | — |
| T1.L-02 | 1.3, 1.4 | Rama de error de `blackwhitelistAsync` | **HECHO** (2026-10-05, S3: opción A, `throw;` en SCUM:68; sin E2E; compila el usuario) | CORREGIR | Diego | S3 | — |
| T1.L-04 | 1.2-1.4 | Carga de producción de las listas en SIGMavi | PRERREQUISITO (CQ17) | — | DBA / Diego | pase | T1.L-01 (tamaños) |
| T1.5-01 | 1.5 | E2E en QA con copia al share | VERIFICACION (CQ22) | — | Diego + usuario | S6 | T1.5-04 (a/b) |
| T1.5-02 | 1.5 | LAN contra ServicioSAP, mismo payload | VERIFICACION | — | Diego + usuario | S6 | — |
| T1.5-03 | 1.5 | Path traversal heredado | **DECISION cerrada sin código** (CQ20, 2026-10-05: no se sanea; sigue como deuda en GUIA §8.1) | CORREGIR | Diego | S3 | — |
| T1.5-04 | 1.5 (transversal) | `Logger.SAP` puede romper la rama de error | DECISION (CQ21 contestada el 2026-10-05 sin elegir A ni B; sin código en S3; pendiente confirmar A) | CORREGIR | Diego (+ dueño de `74d7c2f`) | S3 | — |
| T1.6-01 | 1.6 | E2E lado a lado LAN y ServicioSAP (8 casos) | VERIFICACION (CQ25) | — | Diego + usuario | S6 | — |
| T1.7-01 | 1.7 | E2E de escritura positiva | VERIFICACION (CQ25) | — | Diego + usuario | S6 | — |
| T1.C-01 | 1.6, 1.7 | Rama de error de las cuentas | DECISION (CQ24 sin respuesta el 2026-10-05: el usuario pidió más explicación; no se aplicó en S3) | CORREGIR | Diego | S3 | — |
| T1.C-02 | 1.6, 1.7 | Consumidor de las rutas LAN-only y su corte | BLOQUEADO_EQUIPO (CQ23) | — | Diego + infraestructura | S7 | — |
| T1.H-01 | 1.2-1.7 | `ConfigureAwait(false)` en SCUM, CRM y MAM | **HECHO** (2026-10-05, S2; sin commit, compila el usuario) | higiene | Diego | S2 | — |
| T1.0-DOC | todas | Correcciones del CSV y de documentos del vault | DECISION (CQ26) | doc | quien apruebe | cualquiera | — |
| T1.0-DEP | todas | Fusión y despliegue de las ramas | BLOQUEADO_EQUIPO (CQ27) | — | Marcos, Diego e infraestructura | pase | — |

**Choques entre tareas:**
- T1.1-01b (B) y T1.1-03 van juntas: crean y usan el mismo orquestador.
- T1.1-07 y T1.1-08: el fallo por entrada inválida sale por la rama de falla que se elija en T1.1-08.
- T1.1-05 va antes de T1.1-03, porque el valor que se busca debe ser el mismo que se guarda.
- T1.1-04 va antes de T1.1-03, porque la búsqueda de invitados compara el correo con la misma forma de mayúsculas que el alta.
- T1.L-02 y T1.H-01 tocan SCUM en líneas distintas: aplicar una, restaurar CRLF, y luego la otra.
- T1.5-04 (B) toca SLOG, que tiene unos 95 llamadores: va sola y con el visto bueno del dueño.

**Desplazamiento de líneas tras S4 (2026-10-05).** Las citas `BPM:` y `SBPC:` escritas antes de S4 (en §3.1.1, §3.1.2, §3.1.5 y los prompts de §4.5) se leen así sobre el código actual. **SBPC:** sin cambio hasta la 47; de la 48 en adelante, **+12** (`PATCH partner/client` SBPC:68-87; `GetFilterClients` :148-162). **BPM:** de la 5 a la 115, **+1** (`using ServicioSap.Methods.Utils` nuevo en la 5); de la 148 a la 421, **−31** (bloque comentado `EnableBpCombination` borrado: `SubmitClientInfoAsync` :75-125, `GetFilterClientsAsync` :218-260 y su URL en **:221**, `BuildClientFromCustomerRequest` :384-735); la 422-434 se reescribió como :391-405; de la 436 a la 454, **−29** (resolvedor de `storeCode` :407-425); de la 456 a la 766, **−30** (`Partner = ""` :435, `Marst` :456, `Fiscalregimen` :548, `ZidMagento` :579, `toCteCto` :643-668); de la 777 a la 813, **−40** (`MapGender` :737-758, `FormatDateSap` :760-773); de la 831 en adelante, **−56** (`LinkMagentoAccountAsync` :779-819).

---

## 2. Diferencias con `MAVI - DMZ-SAP.csv`

### 2.1 Por fila

| Fila CSV | Lo que dice el CSV | Lo que dice el código | Corrección propuesta (la aplica el dueño del CSV, T1.0-DOC) |
|---|---|---|---|
| 32 `customer/setCustomer` | `partner/client` POST · Marcos · Si · Si · "BP01 - Migrado" | Ruta y verbo correctos (SBPC:34-36) y conectado (DCC:30). Pero devuelve el `Client` completo donde LAN devolvía la cuenta (SBPC:48 frente a CTN:205-206), crea un BP en cada llamada (BPM:465) y guarda valores distintos (§3.1.3). Es uno de los 8 contratos rotos (GUIA:363) | Generado **Parcial**. Notas: "BP01 - contrato roto (devuelve Client); sin búsqueda/actualización; ver PLAN_FABLE_CONTROLADORES/01 §3.1" |
| 33 `customer/setCustomerList` | … · SI · Si · "SIGMAVI + SAP - Endpoint SAP existe" | Coincide: DCC:70 y SCC:15-55. "SAP" es correcto: la validación del BP en BP05 va antes del SP (SCUM:21-24) | Solo estética: `SI` → `Si` |
| 34 `customer/getCustomerList` | GET → POST · SI · Si · "SIGMAVI + SAP" | Coincide (DCC:77-78, :88; SCC:57-58). Esta ruta **no** toca SAP: la validación del BP es solo para `Insertar` (SCUM:21) | `SI` → `Si`. Notas: "SIGMAVI (sin SAP)" |
| 35 `customer/deleteCustomerList` | … · SI · Si · "SIGMAVI + SAP" | Coincide (DCC:106; SCC:79-88). Tampoco toca SAP (SCUM:21) | `SI` → `Si`. Notas: "SIGMAVI (sin SAP)" |
| 36 `customer/cashCustomerReport` | Ruta ServicioSAP **`To Do`** · POST · Si · Si · "OTRO - Archivo en red" | La ruta existe: `customer/cashCustomerReport` [HttpPost] (SCC:12, :112-113), y el DMZ ya la llama con ese nombre (DCC:120) | Ruta ServicioSAP = `customer/cashCustomerReport` |
| 116 `customer/getCuenta` | Ruta ServicioSAP **`N/A (MAGENTO)`** · POST · **Si** · Si · "LAN-only" | La ruta existe: `customer/getCuenta` (SCC:90-98), con destino final Magento vía `magento/getCuenta` (MAM:24). No hay ruta DMZ (DCC:19-124) | Ruta ServicioSAP = `customer/getCuenta`. Conectado = **N/A** (o `Si` por convención: CQ26) |
| 117 `customer/setCuenta` | igual que 116 | La ruta existe: `customer/setCuenta` (SCC:100-108) | Ruta ServicioSAP = `customer/setCuenta`. Conectado = **N/A** (o `Si`: CQ26) |

**Convención de las filas LAN-only (CQ26).** Otras filas LAN-only ya terminadas ponen `Conectado = Si` y su ruta real de ServicioSAP (CSV:119 `order/createStorepickupCode`, CSV:132 `product/obtenerImagen`). Si solo se cambian las filas 116 y 117 a N/A, el CSV queda inconsistente. El usuario elige una sola convención para todas.

### 2.2 Ramas: "Conectado" solo existe en las ramas de migración

Comprobado con `git branch -a --contains` y `git show` (solo lectura) el 2026-09-30:

- **DMZ.** El paso de las listas a `PostSAP` (`740669e`, 2026-08-10) está en `ConexionSAP`, `SAP-DMZ`, `origin/ConexionSAP`, `origin/SAP-DMZ`, `origin/SAP_DMZ_JAVI` y `origin/dbAndroid`. El de `cashCustomerReport` (`e403065`) está en las mismas menos la rama local `SAP-DMZ`. **`origin/master` y `origin/Stage` siguen con `curl.Post` a LAN en todas las rutas**, y `master` no tiene `cashCustomerReport` (§1.3). El login a LAN del constructor de `Curl` se comentó después, en `4dabaa9` (2026-08-24), y hoy está en DCURL:61-71 con `Token = TokenSAP` en DCURL:84. Un pase que lleve `740669e` sin `4dabaa9` conserva la dependencia de LAN en el constructor.
- **ServicioSAP.** `a0f1017` (listas) está en `SpExportaEcommerce`, `stage-sap`, `origin/SpExportaEcommerce`, `origin/stage-sap`, `origin/dbAndroid` y `origin/SAP_INTEGRATION_JAVI`. `4315c50` (cash y cuentas) está en las mismas menos la rama local `stage-sap`.
- **Orden del pase:** primero ServicioSAP y después el DMZ. Con el DMZ nuevo y la ruta ausente en ServicioSAP, `PostSAP` devuelve el texto de un 404. En `cashCustomerReport`, `DeserializeObject<ApiResponse>` lanza y el DMZ da 500 (DCC:121-123). Si falla el login contra ServicioSAP, el constructor relanza y el DMZ da 500 (DCURL:86-89). Todo esto va en T1.0-DEP.

### 2.3 Documentos del vault desactualizados o equivocados (no usar para estas rutas)

No se editan sin aprobación (SKILL 23). La lista completa de ediciones está en T1.0-DOC (§3.10).

| Documento:línea | Qué dice | Qué vale (código) |
|---|---|---|
| `_EXCLUIDOS_Intelisis.md`:156-157, `MIGRATION_STATUS_MASTER_v2.csv`, `ENDPOINTS_DMZ_VS_SAP.csv` | setCustomer/listas "fuera de alcance", "Not Migrated", etc. | **Fuentes retiradas** (GUIA §9): ni se citan ni se editan |
| `MAVIDMZSAPConexiones.csv`:36, :116, :117 | No/No | Informativo, no se modifica (GUIA §3 "Sobre MAVIDMZSAPConexiones.csv") |
| COMP_BP (2026-09-07) y CHK_BP (2026-09-14) | Contacto TEST/47504, contacto CONYUGE, `Zcompania = email`, `Akont 12120000`, `TelNumber` vacío, `Kvgr4` fuera del modelo | Hoy: BPM:673-716 (ver 1.1-R25), `Zcompania ""` (BPM:634), `Akont ""` (BPM:524), `TelNumber = phone` (BPM:506), `Kvgr4 "SI"` (BPM:556) |
| COMP_BP BP-11 y BP-08 | "El error llega a Magento como 200"; "solo se habilita contado" | BP-11 queda retirado por R-03 (GUIA §8.7). BP-08 es paridad LAN: el SP solo inserta el canal CONTADO (CTN:94-97) |
| AUD:579-590 (C24) | La llamada de listas falla porque el SP de SIGMavi no tiene `@IdMagento` | **Refutado.** El EXEC es posicional (LCUM:126; SCUM:28) y la E2E del 10 de agosto insertó (EP:361-399) |
| E-02:87 | `740669e` no está subido | Ya está en `origin/dbAndroid` y otras (§2.2) |
| E-02:89 | El constructor de `Curl` se autentica contra LAN | Cierto en `740669e`, en `master` y en `Stage`; desactualizado solo en la HEAD de `ConexionSAP` (DCURL:61-71) |
| E-03:68, :74, :86 | Va a `URL_INTELISIS`; "sin commitear"; tragar la falla de BD "es LAN" | DCC:88 `PostSAP`; commit `740669e`; LAN da 500 (LCUM:162-164 sin try), ver 1.3-R12 |
| E-04:59-63, :83 | `Curl.Post` va a `URL_INTELISIS`; la respuesta no distingue "falló la base" | DCC:106 `PostSAP`; eso solo es cierto en ServicioSAP (1.4-R12) |
| EP:364, :395 | "Alta en blanca rechazada porque ya está en negra: probado" | No concluyente: `getCustomerList` lee Negra primero (SCC:64-69) y el borrado del paso 3 quitaría la fila blanca |
| GUIA:547 (§8.2) | Destino de `VTASCListaNegra`/`Blanca` pendiente, "probablemente SigMavi" | Resuelto: SIGMavi (ODS:74; SCUM:33) |
| `CustomersController/Post_SetCustomerList_Mapping.md`:35, :70 | En excepción, 200 con body `null` | 200 **sin contenido** (LCC:48-50) |
| `CustomersController/Post_DeleteCustomerList_Mapping.md`:43 | "Siempre 200, sin ramas de error" | Un error de BD es 500 (LCC:81-87 sin try) |
| `_NUESTROS_ENDPOINTS/_ESTADO_REAL_EN_SERVICIOSAP.md`:126, :128, :129 | deleteCustomerList, getCuenta y setCuenta "No existe" | Existen (SCC:79-108) |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv`:30 | INTELISIS / Not Migrated | Migrado (SCC:79-88) |
| `_ANALISIS_PREVIO/DMZ-Backlog-Migracion-SAP.md`:205 | getCustomerList "FALTA" | Existe y está conectado |
| `_ANALISIS_PREVIO/MAPEO-endpoints-flujo-y-responses.md`:597-599 | getCuenta responde `"C00123456"` | Responde el arreglo JSON de Magento como cadena (CMA:31-48) |
| E-11:77, :119, :121-123 | Ejemplo de error de Magento; artefacto `Tests\ServicioSap.Ola6.http`; "Diferencias: ninguna" | El cuerpo de error queda como JSON inválido tras el desescapado (1.6-R13); el `.http` no está en el share ni en git (`.gitignore`:293); hay DIF en la rama de error (1.6-R14, R16, R17) |
| E-12:79, :98, :101-103 | "No hay cutover"; artefacto `.http`; "Diferencias: ninguna" | Hay que cortar o deprecar al consumidor de LAN (T1.C-02); el `.http` no existe; hay DIF (1.7-R11, R13) |
| E-13:88-92 | El constructor de `Curl` se loguea primero en LAN | La razón está desactualizada (DCURL:61-71), pero la regla "primero ServicioSAP, después DMZ" sigue vigente por otra razón (§2.2) |
| CML:143 | `Curl` (H-03) cambió a un `HttpClient` por proceso con token cacheado | No está en el código: SCURL:79-82 crea el cliente y se autentica en cada intento. Último commit de SCURL `ac9449b` (2026-09-10) |
| `Manual tecnico Servicio SAP/Manual TecnicoServicio SAP 31082026.md`:3473, :3475-3478 | setCuenta `GET`; body `"numeric"` | `[HttpPost]` (SCC:102-104); body `CustomerIntelisis {nuevaCuenta, correoCuenta, idCliente}` |
| `collectionhoppscotch 15092026.json`:~123 | setCuenta en `<<DMZLocal>>/customer/setCuenta` | Esa ruta no existe en el DMZ. En esa colección (de LAN) va `<<LANLocal>>`, y las colecciones de ServicioSAP no tienen la petición (T1.0-DOC) |
| `_ANALISIS_PREVIO/BRIEFING-migracion-18-endpoints.md`:892 | getCuenta/setCuenta "internas/cron" | Sin evidencia en código de ningún cron |

---

## 3. Por endpoint

### 3.1 `customer/setCustomer` → `partner/client` · Marcos

#### 3.1.1 Estado verificado

- **DMZ.** DCC:18-38, `[HttpPost][Route("setCustomer")]` bajo el `[Authorize]` de la clase (DCC:14). Body null → `HttpResponseException` 400 (DCC:22-23). La llamada a LAN está comentada (DCC:27). La viva es `curl.PostSAP("partner/client", JsonConvert.SerializeObject(customer)).Trim('"')` (DCC:30), y registra `BP_CREATE` (DCC:32). Si la respuesta contiene `Internal Server Error` → `BadRequest()` (DCC:34-35); si no, `Ok(response)` (DCC:37). `PostSAP` no lanza en un WebException: devuelve el texto `WebException: <msg> Body: <body>` (DCURL:115-148, :130-141). Manda los 11 campos de DREQ:8-21 (sin `cp`). Ningún otro punto del DMZ llama `partner/client` ni `customer/setCustomer`.
- **ServicioSAP.** SBPC:34-54 `CreateClient`. Null → `BadRequest("Uno o mas campos estan mal formulados")` (SBPC:38-41). Llama a `BuildClientFromCustomerRequest` (BPM:415-765) y luego a `SubmitClientInfoAsync` (BPM:74-156), que hace POST a `obtenerUrl + /ZAPI_BP01_PARTNER_SRV/BPartnerSet?sap-client=110` con CSRF sobre `CreateClientS4` (BPM:76-96) y deserializa `d` a `Client` (BPM:112-114). Devuelve `Ok(result)` (SBPC:48); en excepción, `BadRequest("Error, " + e.Message)` (SBPC:50-53). Está en CSPROJ:219, :252, :353. **Solo crea:** `Partner = ""` (BPM:465), así que cada llamada, reintento o cambio de perfil crea un BP nuevo.
- **Código muerto** (SKILL 12, solo se señala): `nombreCompleto` (BPM:425-426), `nacimientoOdata` (BPM:429) con `FormatDateSapOData` sin llamador (BPM:815-829), `mappedVkorgKnvp` (BPM:455) y el bloque comentado `EnableBpCombination` (BPM:116-146).
- **Veredicto:** Conectado **Si** · Generado **Parcial** · Trabajo **CORREGIR_PARIDAD** + **CONSTRUIR** (T1.1-03).

> [!note] Correcciones de la verificación ya aplicadas
> Los nodos de contacto no están en blanco (nueva 1.1-R25, DIF). `Sntz` existe dos veces en LAN, así que se hereda con ese nombre en `Methods\Utils\` (T1.1-05). La actualización del SP también borra la dirección (T1.1-03, CQ2). La búsqueda tiene 4 riesgos de diseño (T1.1-03). La guarda en el controlador choca con SKILL 17/28 (T1.1-01b). El `Birthdt` estricto es `19000102` y ya hay evidencia de `Marst` vacío (T1.1-06). En 1.1-R4 faltaban el caso null y la distinción de mayúsculas. Hay reglas nuevas R25 y R26 y agregados a R3, R11, R19, R20 y R22.

#### 3.1.2 Proceso LAN paso a paso

1. **DMZ antes del cambio:** `curl.Post("customer/setCustomer")` (DCC:27, hoy comentado). `Curl.Post` devuelve `e.ToString()` ante cualquier excepción (DCURL:93-113).
2. **LAN controlador:** `new CustomerMethods().ClientToIntelisis(customer)` y luego `Ok(string)`, sin try/catch (LCC:13-21).
3. **Arreglo de 19 posiciones** (LCUM:18-39): [0]=idMagento, [1]=name (comentario "apellido paterno"), [2]=lastName ("apellido materno"), [3]=lastName2 ("nombre(s)"), [4..13]='' (dirección, número, interior, referencia, delegación, colonia, estado, país, CP, RFC), [14]=gender, [15]=email, [16]=storeCode, [17]=phone. `customer.address` y `customer.dateBirth` no se usan.
4. **UEN** por igualdad exacta, quitando apóstrofos: `muebles_america`=1, `viu`=2, `mavi`=3; cualquier otro valor deja `uen=''` (LCUM:42-50). Si storeCode es null, `.Replace` lanza NRE (LCUM:43).
5. **18 parámetros**, cada valor pasado por `sntz`, que quita `& ' : < > " / % ( ) = ?` (LCUM:52-94, :184-192). `P0=int.Parse(idMagento)` (LCUM:74) y `P16=int.Parse(uen)` (LCUM:93) lanzan con vacío o no numérico → 500. `P12 CP = 0` (LCUM:86-89).
6. `exec SP_eCommerceCtenuevo` sobre `Connection.sCadenaConexion` (IntelisisTmp; LCUM:96-102; LCONN:26).
7. **Firma del SP** (CTN:45-48): `@Apaterno = name`, `@Amaterno = lastName`, `@Nombres = lastName2`, 8 de dirección, `@CodigoPostalD`, `@RFCCte`, `@SexoCte`, `@CorreoElectronico`, `@UEN`, `@TelefonoCTe`. `@TelefonoCTe` no se usa en el cuerpo. Los anchos truncan en silencio (varchar 100/100/50/20).
8. **Búsqueda** (CTN:62-68): `Cte WHERE (IdMagento=@Id AND eMail1=@email) OR (IdMagento=@Id AND @Id>2)`. Con id > 2 basta el idMagento; con id ≤ 2 (invitado) se exige además el correo.
9. **No existe** (CTN:70-104): cuenta nueva = `MAX(Cliente) LIKE 'C%'` (sin C99999994..C99999999) + 1, con ceros, en un ciclo hasta que el INSERT entra.
10. **Canal CONTADO** de la UEN en `VentasCanalMAVI` (`Categoria='CONTADO'`, `Clave LIKE 'CO%'`): ID, SeEnviaBuroCreditoMavi, Categoria, Cadena, Clave (CTN:88-97).
11. **INSERT Cte** (CTN:109-144): FiscalRegimen `605`; Nombre = UPPER(Apaterno Amaterno Nombres); Personal* en UPPER; dirección ''; Poblacion = Delegacion; CP 0; RFC ''; Tipo `Cliente`; Estatus `ALTA`; Sexo = UPPER(gender); eMail1 = UPPER(email); monedas `Pesos`; ZonaImpuesto `OCCIDENTE`; Alta GETDATE(); SeEnviaBuroCreditoMavi del canal; IdMagento; FechaNacimiento `1900-01-02`. **EstadoCivil no se escribe.**
12. **INSERT CteEnviarA** (CTN:147-160) con el ID del canal, Estatus `Alta`, nombre sin UPPER, Clave, dirección vacía, Categoria, Cadena, `UenMavi = @UEN`, `OCCIDENTE` y buró.
13. **Existe** (CTN:172-201): si Id > 2, `UPDATE Cte SET Nombre, Personal*, dirección ('' / 0), eMail1 = UPPER(email) WHERE idmagento=@Id` (todas las filas con ese idmagento, CTN:189). Si Id ≤ 2, solo Nombre y dirección `WHERE cliente=@Clave AND idmagento=@Id` (CTN:191-201). Nunca toca EntreCalles, Poblacion ni Pais al actualizar.
14. **Salida:** `SELECT @Clave AS cliente` (CTN:205-206) → `GetString(0)` (LCUM:104-117). `Incorrecto` si no hay filas, lo que no puede pasar.
15. **DMZ:** `Trim('"')`. Una excepción (500) trae `Internal Server Error` → `BadRequest()`; si no, `Ok(cuenta)` a Magento (DCC:34-37).

#### 3.1.3 Matriz de reglas

| Id | Regla LAN | ServicioSAP hoy | Estado | Evidencia |
|---|---|---|---|---|
| 1.1-R1 | Body null: LAN no valida; el DMZ lo rechaza con 400 antes de llamar | También `BadRequest`; inalcanzable desde el DMZ | EQ | DCC:22-23; LCC:15-18; SBPC:38-41 |
| 1.1-R2 | `sntz` quita `& ' : < > " / % ( ) = ?` de cada campo | `SntzMethods.Sntz` (`Methods\Utils\SntzMethods.cs:14, :19-27`: misma regex, `Regex` estático compilado, null o vacío → `""`; CSPROJ:279) sobre los mismos 7 campos que LAN (`idMagento`, `name`, `lastName`, `lastName2`, `gender`, `email`, `phone`) y antes de `Trim` (BPM:391-405). `storeCode`, `address` y `dateBirth` sin sanear, como LAN | **EQ (HECHO sin E2E, S4 2026-10-05; CQ7)** | LCUM:74-94, :184-192; LOM:1367-1375; SntzMethods.cs:14, :19-27; BPM:394-405; CSPROJ:279 |
| 1.1-R3 | `int.Parse(sntz(idMagento))`: vacío o texto → 500 → DMZ 400; mayor que int.MaxValue → OverflowException → 500; `1'2` se vuelve `12` | `int.Parse(idMagento)` sobre el valor ya pasado por `Sntz` (BPM:401, :404): vacío o texto → `FormatException`, desbordado → `OverflowException`; la excepción sale por el catch del controlador (SBPC:62-65) y no se crea el BP. `1'2` → 12 como LAN. `ParseMagentoId` se borró (T1.1-10). Lo que ve Magento en la falla es R22 | **EQ-R (HECHO sin E2E, S4 2026-10-05; CQ5)** | LCUM:74; DCURL:108-111; DCC:34-35; BPM:401, :404, :579; SBPC:62-65 |
| 1.1-R4 | storeCode → UEN por igualdad **exacta y sensible a mayúsculas**: `muebles_america`=1, `viu`=2, `mavi`=3. Otro valor o vacío → `int.Parse('')` → 500. Null → NRE → 500. `VIU` o `Viu` fallan | Busca subcadenas con `IndexOf` sin distinguir mayúsculas: `viu` o `2` → 05; `muebles_america`, `1` o `''` → 04; cualquier otro → 04; `mavi` → 04. Es un tercer resolvedor de organización (SKILL 28). **Sin cambio en S4:** CQ5 (2026-10-05) solo contestó `idMagento`; `storeCode`, `mavi` y el resolvedor único siguen abiertos | DIF | LCUM:42-50, :43, :93; BPM:407-425, :411, :416, :502, :538; OM:340-351; GUIA §1.7 |
| 1.1-R5 | Busca primero: `IdMagento=@Id AND eMail1=@email`, o `IdMagento=@Id` si `@Id>2` | Sin búsqueda (`Partner = ""`). BP05 expone `ZidMagento` y `Mail`, y `GetFilterClientsAsync` puede consultarlos, pero no está probado que el `$filter` los acepte | FALTA | CTN:62-68; BPM:465, :249-291; SS Models/SAP/BusinessPartner/Partner.cs:36, :189 |
| 1.1-R6 | Cuenta `C…` nueva por MAX + 1, con reintento | BP01 asigna el número (`Partner`). DU2: sin mapeo de cuentas C | EQ-R | CTN:73-104; RSG_BP01:686-691; BPM:112-114 |
| 1.1-R7 | Solo el canal CONTADO de la UEN en CteEnviarA | Un área de ventas: Vkorg 04/05, Vtweg 01, Spart 00 y KNVP `Parvw WE`. El canal de crédito (`EnableBpCombination`) está comentado, igual que LAN | EQ-R | CTN:88-97, :155-157; BPM:532-534, :568-571, :116-146 |
| 1.1-R8 | `Cte.FiscalRegimen = '605'` | `Fiscalregimen = ""` (el campo existe en el modelo; `"605"` se aplicó y se revirtió el 2026-10-05) | DIF (pendiente del dueño fiscal) | CTN:109, :114; BPM:578 |
| 1.1-R9 | Nombres en MAYÚSCULAS: PersonalApellidoPaterno=name, PersonalApellidoMaterno=lastName, PersonalNombres=lastName2, Nombre=UPPER(name lastName lastName2) | `NameFirst = UPPER(name)`, `NameLast = UPPER(lastName)`, `NameLst2 = UPPER(lastName2)` con `ToUpperInvariant()` tras `Sntz` y `Trim` (BPM:394-396, :447-449). El orden se conserva por decisión (CQ1 = B): el payload real de CQ10 trae `name` = nombre y `lastName` = apellido paterno, así que el mapeo de ServicioSAP es el correcto para la ficha BP01 (Nombre1→NAME_FIRST, Apellido1→NAME_LAST, Apellido2→NAME_LST2) y el comentario de LAN (LCUM:21-23) no describe lo que Magento manda | **EQ-R (HECHO sin E2E, S4 2026-10-05)** | LCUM:21-23, :75-77; CTN:45, :115-118; BPM:394-396, :447-449; RSG_BP01:85-89 |
| 1.1-R10 | `eMail1 = UPPER(email)` | `SmtpAddr = UPPER(email)` con `ToUpperInvariant()` tras `Sntz` y `Trim` (BPM:397, :484) | **EQ (HECHO sin E2E, S4 2026-10-05; CQ1)** | CTN:133; BPM:397, :484 |
| 1.1-R11 | La dirección nunca sale del request: todo `''`, Poblacion = Delegacion = `''`, CP 0 | `Street` y `NameCo` = address; HouseNum1…StrSuppl3, City1, City2 y PostCode1 `''`; Country MX; Region `JAL` fija. **Sin cambio:** diferencia aceptada por el usuario (CQ4 = B, 2026-10-05; SAP DEV ya aceptó estos valores) | DIF aceptada (CQ4 = B) | LCUM:24-33, :86-89; CTN:119-128, :125; BPM:400, :430-431, :461-472 |
| 1.1-R12 | RFC `''` | `Stcd1` = RFC genérico del SAT, `Rfc = ''`, `Stkzn X` | EQ-R | LCUM:33, :90; CTN:129; BPM:515-516, :573 |
| 1.1-R13 | `Sexo = UPPER(gender)`, crudo | `Gender = MapGender` (1 masculino, 2 femenino, otro 3, vacío 1). Decisión del usuario; el `1` por defecto es del 2026-09-26 (CREDITO §6.3.15) | EQ-R | CTN:132; BPM:482, :777-798 |
| 1.1-R14 | `dateBirth` se ignora y se fija `FechaNacimiento = '1900-01-02'` | `Birthdt = dateBirth` en yyyyMMdd, o null (se omite). **Sin cambio:** diferencia aceptada (CQ4 = B, 2026-10-05) | DIF aceptada (CQ4 = B) | LCUM:18-39; CTN:140; BPM:398, :458, :760-773, :84-87 |
| 1.1-R15 | `phone` llega como `@TelefonoCTe` pero el SP no lo escribe | `TelNumber` y `TelnrLong` = phone; `toCteTel` con `ZtipoCte MOVIL`, `ZtelCte = phone`, `ZvalTel false`. Desde S4 `phone` pasa por `Sntz` (R2). **Sin cambio en los campos:** diferencia aceptada (CQ4 = B, 2026-10-05) | DIF aceptada (CQ4 = B) | LCUM:37, :94; CTN:48; BPM:399, :476, :483, :627-642 |
| 1.1-R16 | Tipo `Cliente`, Estatus `ALTA`, monedas `Pesos`, `OCCIDENTE`, Alta GETDATE() | BuGroup CLIE, Ktokd 0110, Bukrs 5510, Waers MXN, Aland MX / Tatyp TMX1 / Taxkd 1; la fecha la pone SAP | EQ-R | CTN:130-137; BPM:467, :519, :523, :549, :565-567 |
| 1.1-R17 | `SeEnviaBuroCreditoMavi` (Cte y CteEnviarA) de la fila CONTADO | No se manda: `Katr1` no está en el modelo `Client` y el valor de la fila CONTADO se desconoce | PENDIENTE | CTN:90, :138, :157; CHK_BP:553-566; SS Models/SAP/BusinessPartner/Client.cs |
| 1.1-R18 | EstadoCivil fuera del INSERT → default de la columna | `Marst = "1"` fijo. **Se decide en CREDITO P14 (§6.3.15)**, no aquí | DIF | CTN:109-111; BPM:486; MATRIZ:220 |
| 1.1-R19 | El cliente existente se actualiza (paso 13), incluida la dirección a `''` / 0. Con Id ≤ 2 solo Nombre y dirección. Nunca EntreCalles, Poblacion ni Pais | Sin actualización. BP01 modifica cuando `Partner <> ''`, pero el builder manda ~190 campos `''` que vaciarían el BP: haría falta un payload parcial | FALTA | CTN:172-201, :181-187, :189, :193-199; RSG_BP01:18-19, :101-102; CHK_BP:248-272 |
| 1.1-R20 | Éxito: `SELECT @Clave` → `Ok(string)`: cadena JSON `"C0XXXXXXX"`. Siempre hay cuenta | `Ok(result.Partner.Trim())` desde el 2026-10-05 (T1.1-01): cadena JSON con el número de BP (`Client.Partner`), la misma forma que LAN; el DMZ no cambia. Antes `Ok(Client)`, el objeto completo. Si BP01 responde 2xx sin `Partner`, desde S4 sale `"Error, <motivo>"` (R22, T1.1-08 d), nunca `""` | **HECHO sin E2E** | CTN:205-206; LCUM:104-117; LCC:20; SBPC:46-60; BPM:113-115, :117; DCC:30, :37; GUIA:363 |
| 1.1-R21 | `Incorrecto` si el SP no devuelve filas | Sin equivalente; en LAN es inalcanzable | N/A | LCUM:105-113; CTN:205-206 |
| 1.1-R22 | Falla: excepción → 500 → DMZ `BadRequest()` 400 con cuerpo vacío | Dos ramas (CQ6 = d, 2026-10-05): **(1)** BP01 responde 2xx sin `Partner` (el BP no se creó) → 200 con la cadena `"Error, <Message>"`: el `Message` del primer `toReturn.results` con `Type == "E"`; si no hay, el del primero; si la lista es nula o vacía (o `result` nulo), el literal `BP01 no devolvio un Partner valido` (SBPC:48-59; convención de `order/new`, OrderController.cs:46); el DMZ lo reenvía con 200, sin romper el flujo. **(2)** Excepción (HTTP no exitoso de SAP, token, `idMagento` inválido) → 400 `{"Message":"Error, …"}` → PostSAP `WebException: … (400) Bad Request. Body: …` → DMZ 200 con ese texto; si el cuerpo contiene `Internal Server Error`, DMZ 400. La rama (2) no cambió. El status está retirado (R-03) | **EQ-R (HECHO sin E2E, S4 2026-10-05)** | LCC:15-21; DCURL:108-111, :130-141; DCC:34-37; SBPC:48-65; BPM:105, :123; OrderController.cs:46; GUIA:166-170, :642 |
| 1.1-R23 | LAN no registra nada | `Logger.SAP` de request, respuesta y error; el DMZ registra `BP_CREATE` | N/A | BPM:88, :99, :103; DCC:32 |
| 1.1-R24 | Sin fuente LAN para campos solo SAP | Constantes de maestro: NameOrg1 = store code, Sort1/2, Altkn, Kvgr4 SI, Parnr, Perrl AM, Langu S; nodos `toCte` y `Empleo` en blanco. Son decisiones de maestro de CHK_BP, no paridad. Los nodos de contacto van en R25 | N/A | BPM:463-762 (p. ej. :473, :531, :556, :561, :581, :719-745) |
| 1.1-R25 | **LAN no crea contacto**: solo Cte (CTN:109) y CteEnviarA (CTN:155) | `toCteCto` con `ZidcteCto "1"` y `ZidcteCtoTipo "20"`; `toCteCtoDireccion` con `ZidcteCto "1"` y `Zpais "MX"`. Puede crear un contacto tipo 20 por BP. CHK_BP:453 marca el tipo 20 "sin evidencia". **Sin cambio:** diferencia aceptada (CQ4 = B, 2026-10-05; BP01 lo aceptó en los BP de DEV) | DIF aceptada (CQ4 = B) | BPM:646-647, :672, :678; CHK_BP:453 |
| 1.1-R26 | Los parámetros del SP truncan en silencio: nombres a 100, correo a 100, sexo a 50 y teléfono a 20. LAN nunca falla por largo | Manda las cadenas completas con solo `Trim()`; BP01 puede rechazar lo que LAN aceptaba | DIF | CTN:45-48; BPM:422-434 |

#### 3.1.4 Contrato de respuesta

- **LAN (lo que Magento veía):** HTTP 200 con una cadena JSON que es la cuenta de Intelisis, p. ej. `"C0XXXXXXX"` (CTN:205-206 → LCUM:117 → LCC:20; el DMZ la re-emite, DCC:37). Cualquier falla: LAN 500 → DMZ 400 con cuerpo vacío.
- **ServicioSAP hoy:** 200 con el objeto `Client` completo (SBPC:48). Por el DMZ, 200 con una cadena JSON que contiene ese objeto serializado. En falla, 400 `{"Message":"Error, …"}`, que a Magento le llega como 200 con `WebException: … (400) Bad Request. Body: …`.
- **Objetivo (GUIA §3.2, DU2, DU5):** HTTP 200 con una **cadena JSON que es el número de BP** (`Client.Partner`, p. ej. `"15000XXXXX"`): la misma forma que LAN, con el valor SAP en lugar de `Cte.Cliente`. El DMZ no cambia. El cuerpo de la falla se decide en T1.1-08. El status de la falla no se mide (GUIA §8.7 R-03), salvo que el usuario elija la opción (b) de T1.1-08.

#### 3.1.5 Tareas Fable

**T1.1-01 · LISTO · Devolver el número de BP en lugar del `Client` (R20)**
- **Cambio.** SBPC:48 `return Ok(result);` → `return Ok(result.Partner.Trim());`. Nada más: ningún miembro nuevo, sin tocar `PATCH partner/client` (SBPC:56-75) ni el DMZ (DCC:30-37). Si `result` o `Partner` son null, la NRE cae en el catch que ya existe (SBPC:50-53) y sale por la misma rama de falla que hoy. El caso `Partner = ""` lo cubre T1.1-01b.
- **Por qué es LISTO.** Es el contrato roto que el paquete 1 debe cerrar (PLAN_FABLE:92; GUIA:363), y LAN devolvía la cuenta como cadena (R20). Es la forma de la respuesta, no lógica de negocio; la guarda sí es lógica y queda en T1.1-01b (SKILL 17).
- **Criterio.** V1 (SBPC en `w/crlf`, sin BOM). E2E en S6: DMZ `POST customer/setCustomer` → 200 con cuerpo `"15000XXXXX"`, cadena JSON con la misma forma que el `"C0XXXXXXX"` de LAN. `Logger.SAP` muestra en la respuesta de BP01 un `Partner` igual al devuelto. Request y response documentados (SKILL 25).

**T1.1-02 · LISTO · `FiscalRegimen = "605"` como LAN (R8)**
- **Cambio.** BPM:578 `Fiscalregimen = "",` → `Fiscalregimen = "605",`. BPM **tiene BOM**: conservarlo. Si el usuario pide commit, va en uno propio (GUIA §1.8b).
- **Por qué es LISTO.** LAN escribe un valor real (CTN:114) que ServicioSAP perdió: es una regresión (GUIA §1.8c).
- **Criterio.** V1. E2E en S6: BP01 acepta el payload y el valor 605 se ve en la respuesta de BP01, o en BP05MA (`partner/client/ma/{id}`) si lo expone. Si BP01 lo rechaza: revertir, reportar con el response (GUIA §2.3) y dejar R8 como DIF documentada.

**T1.1-01b · DECISION (CQ8) · Dónde vive la guarda de `Partner` vacío (R20)**
- **Elegida por el usuario (2026-10-05, CQ8):** se resuelve con la opción (d) de T1.1-08, en el controlador (el lugar de la opción A), sin miembros nuevos. El usuario: "si retorna el número vacío es porque no se creó; en la sección to_return del mensaje suele venir el motivo".
- **Regla.** LAN siempre devolvía una cuenta (CTN:205-206). Si BP01 responde 2xx sin `Partner`, hoy sale un Client con Partner vacío (BPM:112-114, :148) y, tras T1.1-01, saldría `""`.
- **Opción A.** En el controlador, dentro del try: `if (result == null || string.IsNullOrWhiteSpace(result.Partner)) throw new Exception(<mensaje>);`, con el patrón de OM:2623-2629, como excepción explícita a SKILL 17. El texto del mensaje lo aprueba el usuario o se copia el de OM:2628.
- **Opción B (recomendada).** Crear un orquestador `SetCustomerAsync` en `Methods\BusinessPartner\` con el nombre de la ruta del DMZ (SKILL 28). Hace Build → Submit → guarda → devuelve `Partner.Trim()`, y el controlador solo lo llama. Es un miembro nuevo, así que necesita aprobación (GUIA §1.9b). T1.1-03 lo necesita de todos modos.
- **Criterio.** Con BP01 simulado sin Partner (prueba en DEV con visto bueno), la respuesta es la rama de falla que se elija en T1.1-08, nunca `""`. V1.

**T1.1-03 · DECISION (CQ2, CQ3) + CONSTRUIR · Buscar el BP existente antes de crear (R5, R19)**
- **Depende de.** T1.1-01b = B (el orquestador), T1.1-05 y T1.1-04 (el valor buscado debe ser el mismo que se guarda) y el paso 0 de T1.1-09 (probar que el `$filter` de BP05 acepta `ZidMagento` y `Mail`).
- **Cambio (tras la respuesta del usuario).** En `SetCustomerAsync`, antes del Build, llamar a `GetFilterClientsAsync` (BPM:249-291) con `ZidMagento eq <id>` si idMagento > 2, y con `ZidMagento eq <id> and Mail eq '<correo>'` si idMagento ≤ 2 (CTN:62-68). Si hay BP, devolver su `Partner` (forma de T1.1-01). Si el usuario lo aprueba, actualizar con un payload BP01 **parcial** (con `Partner` y solo los campos que cambian) para no vaciar el BP (CHK_BP:248-272). Si no hay BP, crear como hoy.
- **Condiciones obligatorias del diseño:**
  - (a) **Mayúsculas del correo.** LAN guarda UPPER(email) (CTN:133) y compara en SQL (CTN:65-66). SAP guarda `SmtpAddr` tal como llega (BPM:514). La búsqueda del invitado tiene que normalizar igual que el alta (depende de T1.1-04).
  - (b) **Escapar y codificar.** `GetFilterClientsAsync` mete el `$filter` en la URL sin codificar (BPM:252). Un correo con `+` o `&` cambia el filtro. El valor se escapa (comilla doble, como `EscapeSapFilterValue`, OM:2968-2971; es `private` en OM, así que reutilizarlo desde BPM requiere aprobación, §1.9b-c) y se codifica. No se toca el wrapper compartido.
  - (c) **"No encontrado" contra "error".** `GetFilterClientsAsync` envuelve el no encontrado (BPM:278-281) y los errores de transporte o de SAP (BPM:287-290) en la misma excepción: `Ocurrio un error al intentar obtener el listado de clientes: <mensaje>`. Solo el mensaje interno `No se encontraron clientes` autoriza crear. Cualquier otro error aborta; si no, un reintento crea BP duplicados.
  - (d) **Varios BP con el mismo `ZidMagento`.** El alta desde la orden lo escribe (OM:2802) y `unircuenta` lo pone con PATCH sobre BP existentes (BPM:835-850). LAN se queda con la fila que lea al final (`SELECT @Clave = Cliente`, CTN:62-68). Hace falta una regla determinista (CQ2).
  - (e) **La actualización del SP también borra la dirección.** Pone Direccion, DireccionNumero, DireccionNumeroInt, Delegacion, Colonia y Estado a `''` y CP a 0 (CTN:181-187 con Id > 2; CTN:193-199 con Id ≤ 2). Con Id ≤ 2 no actualiza Personal* ni eMail1 (CTN:191-201). Con Id > 2 actualiza todas las filas de ese idmagento (CTN:189). Replicarlo en el BP borraría la dirección que usan los pedidos: lo decide el usuario (CQ2).
- **Criterio.** El mismo idMagento enviado dos veces da un solo BP con el mismo número. Un invitado (id 0) con el mismo correo recibe el mismo BP. Un cambio de perfil actualiza lo aprobado sin vaciar otros campos (se comprueba en BP05MA). Un error de SAP en la búsqueda no crea BP. V1 + E2E documentada.

**T1.1-04 · DECISION (CQ1, CQ10) · Orden de los nombres y mayúsculas (R9, R10)**
- **Elegida por el usuario (2026-10-05, CQ1):** opción B. Se conserva `NameFirst = name`, `NameLast = lastName`, `NameLst2 = lastName2` (el payload real lo confirma: `name` trae el nombre y `lastName` el apellido; creó el BP 1500008276, sap.log) y se pasan a MAYÚSCULAS como LAN, **incluido el correo** (`SmtpAddr = UPPER(email)`): "si LAN lo pone en mayúsculas, hazlo igual en SAP". Con `ToUpperInvariant()` (el idioma de `MapGender`, BPM:786) sobre `nombre`, `apellidoPaterno`, `apellidoMaterno` y `correo` ya saneados y recortados (BPM:422-427), para que todos los usos de esas variables salgan en mayúsculas. Teléfono, dirección y demás campos sin cambio.
- **Opción A (paridad estricta):** `NameLast = UPPER(name)`, `NameLst2 = UPPER(lastName)`, `NameFirst = UPPER(lastName2)` y `SmtpAddr = UPPER(email)` en BPM:422-427, :477-479 y :514.
- **Opción B:** conservar `NameFirst = name`, `NameLast = lastName`, `NameLst2 = lastName2` y solo pasar a MAYÚSCULAS.
- **Opción C:** sin cambio.
- Depende de lo que Magento mande de verdad en `name`, `lastName` y `lastName2`, así que **primero se captura un payload real** (CQ10). Choca con CREDITO P5 (mayúsculas del maestro): la fila de crédito lee los nombres del BP.
- **Criterio.** Un BP creado desde un payload real de Magento tiene los mismos nombres y apellidos que tendría en `Cte.Personal*` de LAN. E2E documentada.

**T1.1-05 · DECISION (CQ7) · Helper `Sntz` heredado de LAN (R2, agregado a R3)**
- **Elegida por el usuario (2026-10-05, CQ7):** sí, "como LAN pero de una mejor manera que haga lo mismo": clase `public static class SntzMethods` en `Methods\Utils\SntzMethods.cs` (namespace `ServicioSap.Methods.Utils`, con BOM y CRLF como RequestMethods.cs y StoreGlobalMethods.cs; registrada en `ServicioSap.csproj` después de `Methods\Utils\RequestMethods.cs`, regla 19) con el método `public static string Sntz(string a)` (el nombre de LAN va en el método: C# no permite un miembro con el nombre de su clase; la carpeta usa la convención `XxxMethods`), con un `Regex` estático creado una sola vez (compilado) con el mismo patrón `[&':<>\"/%()=?]`; null o vacío → `""`. Se aplica una sola vez, en BPM:422-434 y antes de `Trim`, a los mismos 7 campos que LAN sanea (LCUM:74-94): `idMagento`, `name`, `lastName`, `lastName2`, `gender`, `email` y `phone`. **No** se aplica a `storeCode` (LAN solo le quita apóstrofos para comparar, LCUM:43-49, y T1.1-07 lo deja sin cambio), ni a `address` ni a `dateBirth` (LAN no los usa; sanear `/` rompería la fecha).
- **Cambio.** LAN tiene `sntz` dos veces, con la misma regex, en dos dominios: LCUM:184-192 y LOM:1367-1375. Por SKILL 28 se crea **una vez**, con el nombre de LAN (`Sntz`), en `Methods\Utils\` (la carpeta existe: RequestMethods.cs, StoreGlobalMethods.cs). Hace `Regex.Replace(a, "[&':<>\"/%()=?]", "")` y convierte null o vacío en `""`. Se aplica a cada campo de `CustomerRequest` que usa BPM:422-434, **antes** de `ParseMagentoId` (así `1'2` da 12, como en LAN). No va en `Methods\BusinessPartner` ni con otro nombre. Hay que registrarlo en CSPROJ (regla 19). El flujo de orden de ServicioSAP tampoco tiene hoy equivalente (no hay sanitizador en SS): el helper se diseña para servir a los dos, pero aquí solo se aplica a setCustomer.
- **Criterio.** Una entrada con esos caracteres da nombres, correo y teléfono sin ellos, como LAN. V1 (con el `.cs` en CSPROJ) + E2E.

**T1.1-06 · DECISION (CQ4) · Valores que LAN nunca guardó (R11, R14, R15 y Region)**
- **Elegida por el usuario (2026-10-05, CQ4):** opción B. Se conservan los valores actuales: SAP DEV ya aceptó `Street`, `NameCo`, teléfono, `Birthdt` y `Region = JAL` en los BP 1500007543, 1500007544 y 1500008276 (sap.log); el usuario: "a veces SAP necesita valores por default para funcionar... deja los valores así en este momento". Diferencias aceptadas, sin cambio de código.
- **Opción A (DU5 estricta):**
  - `Street` y `NameCo` = `""` en lugar de address (BPM:491, :493).
  - Sin teléfono en `TelNumber`, `TelnrLong` ni `toCteTel` (BPM:506, :513, :662).
  - `Birthdt = "19000102"` explícito (CTN:140), no omitido: ServicioSAP ya trata esa fecha como el "sin fecha" de LAN (SS Methods/Credit/SolicitudCreditoWebMethods.cs:554-555).
  - `Region = ""` en lugar de `JAL` (BPM:461, :502), si BP01 lo acepta.
- **Opción B:** conservar los valores actuales y registrarlos como diferencias aceptadas.
- **`Marst` no se decide aquí:** va en CREDITO P14 (BPM:486). Evidencia para P14: la respuesta de éxito de BP01 en RSG_BP01 (~:712) trae `Marst ""`, o sea que BP01 acepta el vacío.
- Cada cambio de valor hacia SAP va en su commit (GUIA §1.8b).
- **Criterio.** Cada campo coincide con la decisión en un BP leído por BP05MA, y BP01 acepta el payload. E2E.

**T1.1-07 · DECISION (CQ5) · `idMagento`/`storeCode` inválidos y un solo resolvedor (R3, R4)**
- **Elegida por el usuario (2026-10-05, CQ5):** solo `idMagento`: "no puede venir vacío; si por alguna razón viene nulo o vacío, falla como LAN porque es un campo obligatorio". Se hace como LAN: `int.Parse(Sntz(idMagento))` en lugar de `ParseMagentoId` (que convierte lo inválido en 0); vacío, no numérico o desbordado lanza la misma excepción que en LAN y sale por el catch actual del controlador (SBPC:50-53). Si `ParseMagentoId` tiene otros llamadores, no se toca. `storeCode` y el resolvedor de organización quedan **sin cambio** (el usuario no lo decidió; regla "si funciona, no lo muevas"); `mavi` sigue abierto.
- LAN falla (500 → 400 del DMZ) en estos casos:
  - idMagento vacío, no numérico o mayor que int.MaxValue;
  - storeCode null;
  - storeCode distinto, sin distinguir la escritura, de `muebles_america`, `viu` o `mavi`.
- ServicioSAP crea el BP con `ZidMagento 0` y org 04 (BPM:433, :436-455).
- **Decidir:** (1) si se falla igual, por la rama de falla de T1.1-08; (2) qué hacer con `mavi` (UEN 3 en LAN, sin org SAP); (3) cómo sustituir el resolvedor local por un helper compartido (SKILL 28) **sin importar la semántica de `DeterminarSalesOrg`**. Ese helper tiene override por `salesOrg` y default 04 (OM:340-351), mientras que setCustomer en LAN falla ante un valor desconocido. Se unifica la tabla de correspondencia, no los defaults: cada flujo conserva su comportamiento LAN. Un helper nuevo necesita aprobación (§1.9b).
- **Criterio.** Cada clase de entrada da el resultado acordado: `muebles_america`, `viu`, `mavi`, `VIU`, `''`, `'1'`, `'2'`, basura, null, idMagento vacío o `1'2`. Queda un solo resolvedor de organización.

**T1.1-08 · DECISION (CQ6) · Cuerpo y status de la falla (R22)**
- **Elegida por el usuario (2026-10-05, CQ6):** opción nueva **(d)**. Cuando BP01 no crea el BP, `Partner` viene vacío y `toReturn` trae el motivo (ej. sap.log: "Cuenta asociada (KNB1-AKONT) es un campo de entrada obligatoria"). En ese caso el controlador responde `Ok("Error, " + <Message del primer `result.to_return.results` con `Type == "E"`; si no hay, el `Message` del primero; si la lista es null o vacía, el literal `BP01 no devolvio un Partner valido` (prefijo del mensaje de OM:2652)>)`, también cuando `result` es null, sin romper el flujo y con la misma convención que `order/new` (OrderController.cs:32). Las excepciones (HTTP no exitoso de SAP, idMagento inválido) siguen por el catch actual, sin cambio.
- **(a)** `Ok("Incorrecto")`, la única palabra de falla de LAN, en el catch de SBPC:50-53.
- **(b) (recomendada, coherente con T1.L-02)** ServicioSAP responde `InternalServerError`. El chequeo que ya existe en el DMZ (DCC:34-35) contesta 400 vacío, que es exactamente lo que Magento veía con LAN, sin tocar el DMZ. Choca con el corolario de GUIA §1.5 (resultado de negocio con 200): una falla de SAP no es un resultado de negocio. Se reporta el choque y decide el usuario.
- **(c)** Dejarlo como está.
- **Criterio.** Un error forzado de BP01 (un campo inválido, en DEV y con visto bueno) da a Magento la respuesta acordada. Documentado.

**T1.1-09 · VERIFICACION · E2E de paridad (SKILL 25)**
- **Paso 0** (solo lectura; antes de S5). `GET <<SAP>>/partner/client/filter/{sapFilter}` (SBPC:137) con `ZidMagento eq <<ID_MAGENTO_PRUEBA>>` (sin comillas: `ZidMagento` es numérico, Partner.cs:36; ningún código actual filtra por él; D-15 del 2026-10-05) y con `Mail eq '<<CORREO_PRUEBA>>'`. Si alguno falla, T1.1-03 queda bloqueado: SAP/ABAP tiene que exponer esa consulta.
- **Casos por el DMZ** (crean BP: visto bueno por caso): nuevo MA; nuevo VIU; el mismo idMagento dos veces; invitado id 0 con correo repetido; nombre con caracteres especiales; nombre de más de 100 caracteres (R26); sin `dateBirth`; error forzado de SAP.
- **En cada BP creado,** leer por BP05MA: nombres, correo, FiscalRegimen, `Birthdt`, Region, dirección, teléfono, `Marst` y el nodo de contacto (R25).
- **Resultado esperado por caso tras S4 (2026-10-05; sin kit, D-17: lo ejecuta el usuario).** *Nuevo MA / nuevo VIU:* DMZ 200 con `"15000XXXXX"`; en BP05MA `NameFirst`, `NameLast`, `NameLst2` y `SmtpAddr` en MAYÚSCULAS y sin `& ' : < > " / % ( ) = ?`; `Birthdt`, teléfono (`TelNumber`, `TelnrLong`, `toCteTel`), `Street`/`NameCo`, `Region JAL` y el contacto tipo 20 conservados (CQ4 = B); `Fiscalregimen ""`; `Marst "1"` (P14). *Mismo idMagento dos veces / invitado id 0 con correo repetido:* todavía dos BP distintos (la búsqueda es S5, T1.1-03). *Nombre con caracteres especiales:* los caracteres de `Sntz` desaparecen y el resto queda en MAYÚSCULAS; `idMagento` `1'2` → `ZidMagento 12`. *Nombre de más de 100 caracteres:* sin cambio (R26 DIF; lo que diga BP01). *Sin `dateBirth`:* `Birthdt` omitido (CQ4 = B). *idMagento vacío o no numérico:* ServicioSAP 400 `{"Message":"Error, <texto de FormatException u OverflowException>"}` → DMZ 200 con `WebException: … (400) Bad Request. Body: …`; no se crea BP. *storeCode desconocido o `mavi`:* BP con org 04 (sin cambio, R4). *Error forzado de SAP:* si BP01 responde HTTP no exitoso, ServicioSAP 400 `{"Message":"Error, Ocurrio un error al intentar enviar la informacion del cliente: …"}` → DMZ 200 con el texto `WebException…`; si BP01 responde 2xx sin `Partner`, ServicioSAP 200 `"Error, <Message del toReturn con Type E>"` → DMZ 200 con esa cadena (R22). En `sap.log` no hay hoy ninguna respuesta 2xx con `Partner` vacío: la rama (1) de R22 solo se prueba con un error forzado.
- **Criterio.** Cada regla EQ o EQ-R se cumple con IDs reales anotados en `Resources/master_test_plan.md`, sin datos personales.

**T1.1-10 · DECISION (CQ9) · Código muerto del builder (SKILL 12)**
- **Elegida por el usuario (2026-10-05, CQ9):** sí, borrarlo, comprobando antes que no se usa en absolutamente ningún otro lugar de la solución ("si después se necesita, lo volvemos a poner").
- Borrar, solo si el usuario lo aprueba: BPM:425-426, :429, :815-829, :455 y el bloque comentado :116-146. En commit propio.
- **Criterio.** Aprobado o rechazado por el usuario; si se aprueba, V1 en verde.

**T1.1-11 · DECISION (CQ4) · Contacto tipo 20 que LAN no creaba (R25)**
- **Elegida por el usuario (2026-10-05, CQ4):** opción B. Se conserva el contacto tipo 20 (BP01 lo aceptó en los mismos 3 BP); diferencia aceptada, sin cambio de código.
- **Opción A (DU5, recomendada si BP01 lo acepta):** `toCteCto` y `toCteCtoDireccion` en blanco como los demás nodos, con `ZidcteCto`, `ZidcteCtoTipo` y `Zpais` a `""` (BPM:676-677, :702, :708).
- **Opción B:** conservar y registrar la diferencia.
- **Criterio.** El BP nuevo no tiene contacto tipo 20 (se ve en BP05MA) y BP01 acepta el payload.

#### 3.1.6 Preguntas

CQ1, CQ2, CQ3, CQ4, CQ5, CQ6, CQ7, CQ8, CQ9, CQ10 y CQ11 (§5).

#### 3.1.7 Bloqueos

| Bloqueo | Dueño | Frena |
|---|---|---|
| No está probado que BP05 (`ZB_DATOS_CLIENTE`) acepte `$filter` por `ZidMagento`/`Mail`. Si no lo acepta, SAP/ABAP tiene que exponer esa consulta | Marcos (paso 0 de T1.1-09); si falla, SAP/ABAP | T1.1-03 |
| Decisiones CQ1-CQ9 | Usuario | T1.1-01b, T1.1-03 … -08, -10, -11 |
| El consumidor de la respuesta en Magento no está en el repo: no hay llamador en Magento248 app/code | Equipo Magento / Omnipro (CQ10). No frena T1.1-01 | Confirmación |
| Paridad del buró (R17): atributo `Katr1` en `Client` y valor de SeEnviaBuroCreditoMavi de la fila CONTADO | Usuario / funcional SAP (CQ11) | R17 |
| La conexión del DMZ solo existe en `ConexionSAP` (§2.2) | Marcos y dueño del DMZ (CQ27) | Pase |

---

### 3.2 `customer/setCustomerList` · Diego

#### 3.2.1 Estado verificado

- **DMZ.** DCC:40-75, `SetCustomerEmailage(CustomerRequest)`.
  - Validaciones previas: body null → 400 (DCC:44-45); si name, email, idMagento, list o address son null → 400 `Datos incompletos` (DCC:47-56). `''` pasa, y Magento manda `''` para invitados (EML:480-484). `list` distinto de `white`/`black` → 400 `Lista invalida` (DCC:58-67).
  - Llama `curl.PostSAP("customer/setCustomerList", …).Trim('"')` (DCC:70).
  - Respuesta: con `Internal Server Error` → `BadRequest()` (DCC:71-72); si no, **siempre** `Ok("Correcto")`, descartando el cuerpo de ServicioSAP (DCC:74).
- **ServicioSAP.** SCC:11-17 (`[Authorize]`, prefijo `customer`).
  - Null o campo null → 400 `Datos incompletos` (SCC:19-29).
  - `white` → `Blanca`, `black` → `Negra`, otro → 400 `Lista invalida` (SCC:31-42).
  - `blackwhitelistAsync("Insertar", …)` → `Ok(result)` (SCC:44-48). El catch → `Ok()` (SCC:50-54) es prácticamente inalcanzable.
  - En SCUM:16-71, Insertar valida primero con `ValidarClienteEnSapAsync` (SCUM:21-24, :74-97). Filtro `Mail eq '<correo con ' duplicada>'` (SCUM:78-82; sin la llave `SAP_BP_CAMPO_EMAIL` se usa `Mail`), pasado a `GetFilterClientsAsync` (BPM:249-291, con el `$filter` sin codificar en BPM:252). Cero resultados o cualquier error → `false` → `""` sin llamar al SP.
  - Si el BP existe: `exec SpListaNBMagento` posicional de 8 argumentos (SCUM:26-28, :36-48) en SIGMavi (SQLH:72-98). `result = "true"` solo si hay filas (SCUM:19, :52-61). En excepción: log y `""` (SCUM:64-70).
  - CSPROJ:224, :264.
- **Evidencia de prueba.** La E2E del 2026-08-10 fue directa contra ServicioSAP, nunca por el DMZ, y solo miró `IdMagento` de la fila guardada (EP:356-404, :375).
- **Veredicto:** Conectado **Si** · Generado **Si** · Trabajo **CORREGIR_PARIDAD** (acotado a R9).

> [!note] Correcciones de la verificación ya aplicadas
> R4 y R16 pasan a PENDIENTE: el EXEC posicional hace que el **orden** decida dónde queda cada valor, y solo se observó `IdMagento`. R22 (la carga de datos) es un prerrequisito de pase, no una regla de paridad. T1.2-02 necesita aprobación. Hay regla nueva R23 (valores del invitado) y R10 se extiende a espacios finales. Se quitaron de las correcciones las fuentes retiradas (`MIGRATION_STATUS_MASTER_v2`, `_EXCLUIDOS`). La cita de Magento para `black` queda en EML:260-262 y :445-465.
>
> **2026-10-05 (S3):** T1.2-02 aplicada (SCUM:83, `Uri.EscapeDataString(valor)`; CQ13) y T1.2-04 cerrada (CQ15 aceptada). Con T1.L-02 = A, `blackwhitelistAsync` relanza el error SQL (SCUM:68): en set lo atrapa SCC:50-54 → 200 sin contenido, como LAN (R19 pasa a EQ). Las citas SCUM a partir de :69 de este documento quedan corridas una línea (+1); las filas tocadas en S3 ya traen la numeración nueva.

#### 3.2.2 Proceso LAN paso a paso

1. **Magento (consumidor).** `setEmailtoListInIntelisis` postea `{name, email, idMagento = entity_id, list, address}`, con `''` por defecto para invitados. Solo registra la respuesta en el log y nunca actúa según ella (EML:476-497). `black` viene de un riesgo Emailage alto (EML:260-262, :445-465); `white`, de un riesgo bajo o medio con resetEmail (EML:287-294, :414-433).
2. **DMZ:** las mismas validaciones de DCC:44-67. Antes del 2026-08-10 llamaba `curl.Post` a LAN (diff de `740669e`).
3. **LAN controlador** (`[Authorize]`, LCC:9): white → `Blanca`, black → `Negra`, otro → `BadRequest()` sin cuerpo (LCC:29-41).
4. `blackwhitelist("Insertar", email, lista, name, address, idMagento)` → `Ok(result)` (LCC:42-44).
5. `exec SpVTASListaNBMagento @Tipo, @Correo, @Lista, @NumPedido, @Nombre, @DireccionEntrega, @NumCuenta, @FechaRegistro` posicional, sobre IntelisisTmp (LCUM:124-128; LCONN:26).
6. **Valores**, VarChar y sin `sntz` (existe en LCUM:184-192, pero no se usa aquí): `Tipo='Insertar'`, Correo, Lista, `NumPedido='0'` fijo (LCUM:147), Nombre, DireccionEntrega, `NumCuenta = idMagento`, `FechaRegistro = DateTime.Now` en `yyyy-MM-dd HH:mm:ss` como DateTime (LCUM:141-151). Timeout 999999 (LCUM:160).
7. **Firma del SP:** Correo varchar(50), Lista 15, NumPedido 20, Nombre 100, DireccionEntrega 100, NumCuenta 10, FechaRegistro datetime. Los valores más largos se truncan en silencio (LNB:23-30).
8. **Insertar + Negra** (LNB:71-98): si el correo está en `cte` y no está en `VTASCListaNegra`, inserta `(NumPedido, Nombre, Correo, Direccion, Cliente = idMagento, FechaRegistro)`; luego, si el correo estaba en `VTASCListaBlanca`, lo borra de ahí.
9. **Insertar + Blanca** (LNB:99-122): si el correo está en `cte` y no está en Negra ni en Blanca, inserta. Si no, no hace nada y no avisa.
10. Los ramos Insertar no tienen SELECT, así que `result` queda en `''` (LCUM:123, :164-182).
11. **Respuesta:** 200 con `""`. Una excepción cae en el catch sin `return`, que construye `Ok(e.ToString())` y lo descarta, y el flujo sigue hasta `return Ok()`: 200 sin contenido (LCC:46-50). Lista inválida → 400 sin cuerpo (LCC:39).
12. **DMZ:** con `Internal Server Error` → 400; si no → `Ok("Correcto")` (DCC:71-74).

#### 3.2.3 Matriz de reglas

| Id | Regla LAN | ServicioSAP hoy | Estado | Evidencia |
|---|---|---|---|---|
| 1.2-R1 | Un body null nunca llega al SP: el DMZ da 400. LAN solo daría NRE → catch → 200 vacío | 400 `Datos incompletos` | EQ-R | DCC:44-45; LCC:30, :46-50; SCC:19-20 |
| 1.2-R2 | Los 5 campos no pueden ser null: lo impone el DMZ con 400. `''` pasa | El mismo chequeo | EQ | DCC:47-56; SCC:22-29; EML:480-484 |
| 1.2-R3 | white → Blanca, black → Negra, otro → 400 | Igual (400 con texto; el DMZ rechaza primero) | EQ | LCC:30-40; SCC:31-42; DCC:58-67 |
| 1.2-R4 | EXEC **posicional** de 8 argumentos en el orden Tipo, Correo, Lista, NumPedido, Nombre, DireccionEntrega, NumCuenta, FechaRegistro | El mismo orden sobre `SpListaNBMagento` (SIGMavi). **No está verificado** que las posiciones 4-6 y 8 caigan en los parámetros correctos del SP de SIGMavi: solo se vio la posición 7 (`IdMagento`) en la fila guardada. Si el orden difiere, Nombre y Direccion se cruzarían sin error | PENDIENTE | LCUM:124-128, :153; SCUM:26-28, :36-48; EP:375; T1.L-01 |
| 1.2-R5 | `NumPedido = '0'` fijo | `'0'` | EQ | LCUM:147; SCUM:42 |
| 1.2-R6 | `FechaRegistro = DateTime.Now` formateada, como DateTime | Igual | EQ | LCUM:145, :151; SCUM:46-47 |
| 1.2-R7 | Nombre, DireccionEntrega y NumCuenta = idMagento (entity_id de Magento, no BP ni cuenta C), crudos, VarChar | Igual. DU2 no aplica: no hay mapeo de cuenta | EQ | LCUM:148-150; SCUM:43-45; EML:451, :482 |
| 1.2-R8 | Precondición: el correo existe en `cte` (COUNT > 0 dentro del SP) | Se valida en C# con BP05 `Mail eq`: con 0 resultados no se llama el SP | EQ-R | LNB:74-78, :103-107; SCUM:21-24, :74-97; `.agents/skills/lan-sap-migration/RSG/bp05_maestro.md`:188; E-02:106, :110; EP:363, :386 |
| 1.2-R9 | El correo se compara con un SqlParameter: cualquier carácter vale | **Corregido el 2026-10-05 (T1.2-02, S3, sin E2E):** el valor (con `'` duplicada) se codifica con `Uri.EscapeDataString` antes de armar el filtro (SCUM:82-83), así que `+ & # %` viajan como `%2B %26 %23 %25` y el `$filter` llega entero a BP05; el wrapper BPM:252 no cambió. Antes se concatenaba sin codificar: `#` cortaba la query, `&` la partía y `%XX` se decodificaba → excepción → `false` → no insertaba | EQ-R (HECHO sin E2E) | LNB:77; LCUM:136; SCUM:82-83, :92-97; BPM:252, :257; CQ13 |
| 1.2-R10 | `eMail1 = @Correo` bajo la collation de IntelisisTmp: sin distinguir mayúsculas y **sin contar espacios finales** (ANSI padding) | OData `Mail eq`, probablemente coincidencia exacta | PENDIENTE | LNB:77, :106; SCUM:83; EP:363 (la E2E usó la misma escritura) |
| 1.2-R11 | Con correo `''`, si alguna fila de `cte` tiene `eMail1 = ''`, LAN inserta una fila con Correo `''` | `IsNullOrWhiteSpace` → `false` → no llama el SP. **Aceptado el 2026-10-05 (CQ15):** Magento siempre manda el correo que acaba de validar con Emailage, así que un correo vacío no llega a ServicioSAP | EQ-R (aceptada) | SCUM:77; LNB:74-88; EML:481; CQ15 |
| 1.2-R12 | La validación del cliente no puede fallar aparte del insert: es una sola llamada | Un error o timeout de BP05 → `false` → no inserta; solo queda en sap.log. En los dos casos el DMZ dice `Correcto` | EQ-R | SCUM:92-97; BPM:278-281, :287-290; DCC:74; E-02:114-126 |
| 1.2-R13 | Negra: no inserta si el correo ya está en Negra | Lo delega a `SpListaNBMagento`, cuyo cuerpo no es legible | PENDIENTE | LNB:79-83; T1.L-01 |
| 1.2-R14 | Al insertar en Negra también borra el correo de Blanca | Delegado; cuerpo no legible | PENDIENTE | LNB:89-96; T1.L-01 |
| 1.2-R15 | Blanca: solo inserta si el correo no está ni en Negra ni en Blanca | Delegado. EP:364/:395 no lo prueban | PENDIENTE | LNB:108-117; SCC:64-69; T1.L-01 |
| 1.2-R16 | Columnas NumPedido, Nombre, Correo, Direccion, Cliente (= idMagento) y FechaRegistro | En SIGMavi, `IdMagento` en lugar de `Cliente` según el vault, sin DDL legible. El vault se contradice en el nombre de tabla (ODS:80 `VTASCLista*` contra el mensaje de `740669e`, `Lista*`) | PENDIENTE | LNB:87-88, :119-120; E-02:107; DEV3:317; T1.L-01 |
| 1.2-R17 | Anchos del SP: Correo 50, Nombre 100, Direccion 100, NumCuenta 10 | Anchos de SIGMavi desconocidos | PENDIENTE | LNB:24-29; T1.L-01 |
| 1.2-R18 | `result` es `''` y solo pasa a `'true'` si hay filas. Insertar no devuelve filas, así que el éxito es `''` | Igual | EQ | LCUM:123, :166-182; SCUM:19, :52-61, :70; EP:363, :386 |
| 1.2-R19 | Excepción SQL → 200 sin contenido | **Desde el 2026-10-05 (T1.L-02 = A):** el método registra y relanza (SCUM:64-69); el catch del controlador responde `Ok()` → 200 sin contenido, como LAN. Por el DMZ es `Correcto` en los dos casos. Antes el método la atrapaba → `Ok("")` 200 con `""` | EQ (HECHO sin E2E) | LCC:46-50; SCUM:64-69; SCC:50-54; DCC:70-74; EML:494-497 |
| 1.2-R20 | Contrato a Magento: 200 `Correcto`, salvo upstream 500 → 400 | El mismo envoltorio del DMZ | EQ | DCC:47-74; GUIA:369 |
| 1.2-R21 | `[Authorize]`; el DMZ se autenticaba contra LAN | `[Authorize]`; el token sale de `login/auth` de SS. Un fallo de login se relanza → 500 | EQ-R | LCC:9; SCC:11; DCURL:61-90 |
| 1.2-R22 | Las reglas R13-R15 actúan sobre las filas que ya existen en IntelisisTmp | Las tablas de SIGMavi están vacías en DEVMAVI a propósito; la carga de producción la hacen los DBA | N/A (prerrequisito, T1.L-04) | DEV3:495; GUIA §8.6 |
| 1.2-R23 | Invitado: Magento manda idMagento, name y address `''`, y LAN guarda `''` en Cliente, Nombre y Direccion (varchar) | Manda `''` como VarChar. Si la columna o el parámetro `IdMagento` de SIGMavi es numérico, `''` quedaría como 0 | PENDIENTE | EML:480-484; LNB:26-29, :87-88, :119-120; SCUM:43-45; T1.L-01 |

**Notas que no son reglas de paridad:**
- `blackwhitelistAsync(tipo)` atiende 3 rutas con un flag de modo (SCC:46, :64, :86), algo que GUIA §1.4 y SKILL 28 prohíben. Pero es un port literal de LAN (LCUM:120), y ODS:87 migra las tres rutas en bloque. No se refactoriza sin aprobación (CQ19).
- Código muerto que solo se reporta: `break;` después de un `return` (DCC:66; LCC:40), `Ok(e.ToString())` sin return (LCC:48) y el catch de SCC:50-54, que hasta el 2026-10-05 era prácticamente inalcanzable (solo `ConfigurationManager`, SCUM:79) y desde T1.L-02 = A es la rama normal del error SQL (1.2-R19).

#### 3.2.4 Contrato de respuesta

- **LAN:** 200 `""` en el camino normal, se haya insertado o no; 200 sin contenido en excepción; 400 sin cuerpo con lista inválida (LCC:23-51).
- **ServicioSAP:** 200 `""` en el camino normal y también cuando el BP no existe o BP05 falla (SCUM:21-24); desde el 2026-10-05 (T1.L-02 = A) un error de SQL sube del método (SCUM:64-69) y el controlador responde 200 sin contenido (SCC:50-54), como LAN; 400 `Datos incompletos` / `Lista invalida`.
- **Magento, por el DMZ, igual con los dos orígenes:** 200 `Correcto`; 400 por las validaciones del DMZ; 400 sin cuerpo si el upstream da 500; 500 si falla el login de `Curl` (DCURL:86-90). Magento solo lo registra en el log (EML:487-497).
- **Veredicto:** el contrato está en paridad (confirma GUIA:369). Las diferencias están en los **efectos** (R13-R17, R23; R9 y R11 se cerraron el 2026-10-05), no en la respuesta.

#### 3.2.5 Tareas Fable

**T1.2-01 · VERIFICACION · E2E por el DMZ con conteo de filas y fila completa**
- Sin cambio de código. Por el **DMZ**, con un BP de prueba que tenga correo, y con un DBA que cuente filas en SIGMavi:
  - (a) white → black con el mismo correo: 1 fila en ListaNegra y 0 en ListaBlanca (R14);
  - (b) black dos veces: 1 fila (R13);
  - (c) white dos veces: 1 fila (R15);
  - (d) correo en Negra → white: 0 filas en Blanca (R15);
  - (e) invitado con idMagento, name y address `''`: la fila guardada tiene `''`, no `0` ni NULL (R23).
- En cada alta se lee la fila **completa** (Nombre, Correo, Direccion, IdMagento, NumPedido `'0'`, FechaRegistro) para cerrar R4 y R16.
- **Criterio.** Request, respuesta exacta (`Correcto`, 200) y conteos anotados; los conteos coinciden con lo que haría LNB con la misma secuencia.

**T1.2-02 · VERIFICACION → DECISION (CQ13) · Correos con `+ & # %` en BP05 (R9)**
- **Primero la E2E:** un BP cuyo `Mail` lleve `+` (y `&` si existe) confirma que no se inserta.
- **Luego, con aprobación,** codificar solo el valor en SCUM:81-82: `Uri.EscapeDataString` sobre el literal que ya tiene la comilla duplicada, antes de `GetFilterClientsAsync`. **No** se toca el wrapper compartido BPM:252, que también usan `ProspectoController.cs:49` y SBPC:143. Sin variables, parámetros ni llaves nuevas (§1.9b). Si el usuario pide commit, va separado de T1.H-01 (§1.8b).
- **Criterio.** Antes del cambio, la E2E con `+`/`&` no inserta; después, inserta. Un correo normal sigue insertando. V1. Request y response documentados.
- **Aplicado el 2026-10-05 (S3), por decisión del usuario sin la E2E previa (CQ13: "yes do it for the Special caracters + &# %"):** SCUM:83 `string filtro = $"{campo} eq '{Uri.EscapeDataString(valor)}'";`. Una línea; sin variables ni llaves nuevas; BPM:252 intacto. Para S6 ya no hay "antes/después": solo se comprueba que un correo con `+`, `&`, `#` o `%` inserta y que un correo normal sigue insertando. El log `[CUSTOMER ValidarClienteEnSap]` (SCUM:94-95) muestra el correo codificado dentro del filtro.

**T1.2-03 · VERIFICACION → DECISION (CQ14) · Mayúsculas y espacios finales (R10)**
- Sin código por ahora. Mandar un correo con otra escritura (MAYÚSCULAS) y otro con un espacio al final, y comparar con lo que haría LAN (collation de IntelisisTmp).
- Si ServicioSAP no inserta y LAN sí, se lleva al usuario. Normalizar necesita aprobación (§1.9b).
- **Criterio.** El resultado de los dos orígenes queda documentado, y R10 pasa a EQ, o a DIF con decisión.

**T1.2-04 · DECISION (CQ15) · Correo vacío (R11)**
- Recomendación: aceptar la desviación y documentarla, porque Magento siempre manda el correo que acaba de validar con Emailage (EML:481).
- **Criterio.** Respuesta registrada en §5; R11 pasa a EQ-R (aceptada) o se reabre.
- **Decidido el 2026-10-05 (CQ15):** aceptada ("Magento wont get to ServicioSAP if they dont have an email"). R11 → EQ-R. Sin código.

Tareas compartidas de esta ruta: T1.L-01, T1.L-02 (en set no cambia lo que ve Magento), T1.L-04 y T1.H-01 (§3.8, §3.10).

#### 3.2.6 Preguntas

CQ13, CQ14, CQ15, CQ16, CQ17 y CQ19 (§5).

#### 3.2.7 Bloqueos

| Bloqueo | Dueño | Frena |
|---|---|---|
| El cuerpo de `SpListaNBMagento` y el DDL de ListaNegra/ListaBlanca no están en ningún repo legible (repo MaviSAP, rama `SpVTASListaNBMagento`) | Diego (autor de `740669e`) con el DBA de SIGMavi (CQ16) | R4, R13-R17, R23 |
| Carga de producción de las listas | DBA (DEV3:495); prerrequisito, no defecto | Pase (T1.L-04) |
| Fusión y despliegue: DMZ `740669e` y `4dabaa9`; ServicioSAP `a0f1017` o posterior | Diego / infraestructura (CQ27) | Pase (T1.0-DEP) |

---

### 3.3 `customer/getCustomerList` · Diego

#### 3.3.1 Estado verificado

- **DMZ.** DCC:77-93: `[HttpGet]` con body `CustomerRequest`. Body null → 400 (DCC:81-82). Email null → `BadRequest("Datos incompletos")` (DCC:84-85). `curl.PostSAP("customer/getCustomerList", …).Trim('"')` (DCC:88). Con `Internal Server Error` → `BadRequest()` (DCC:89-90); si no, `Ok(response)` (DCC:92).
- **ServicioSAP.** SCC:57-77, `[HttpPost]` bajo el `[Authorize]` de la clase (SCC:11).
  - Null o email null → 400 (SCC:61-62).
  - `blackwhitelistAsync("Consultar", email, "Negra")` (SCC:64): `"true"` → `black` (SCC:66-68). Si no, consulta Blanca (SCC:72) → `white` o `No esta en listas` (SCC:73). Siempre `Ok(string)` (SCC:76).
  - SCUM: 3 parámetros VarChar (SCUM:26, :36-38), timeout (SCUM:50), `HasRows` → `"true"` (SCUM:52-61). En excepción: log y `""` (SCUM:64-70).
  - **No llama a S/4**: la validación del BP es solo para Insertar (SCUM:21).
- **Veredicto:** Conectado **Si** · Generado **Si** · Trabajo **CORREGIR_PARIDAD** según T1.L-02.

> [!note] Correcciones de la verificación ya aplicadas
> F1.3-T1 (el `throw;`) deja de ser LISTO: es DECISION (T1.L-02) por el choque DU5/§1.9 contra §1.5 y por la decisión de opacidad del 2026-08-07. Su efecto real en set y delete está en T1.L-02. La evidencia de R11 se corrigió, y R11 pasa a prerrequisito de pase, como R22 de 1.2. C24 también está refutado en ejecución. Hay reglas nuevas R16-R18.
>
> **2026-10-05 (S3):** T1.L-02 = A aplicada (CQ12 "Option A"): `throw;` en SCUM:68. R12 pasa a EQ-R sin E2E: un error de BD ya da 500 en ServicioSAP y 400 en el DMZ, como LAN.

#### 3.3.2 Proceso LAN paso a paso

1. **DMZ antes del cambio:** `curl.Post("customer/getCustomerList")` a LAN (la línea que reemplazó `740669e`, hoy DCC:88).
2. **LAN:** `[Authorize]` de clase + `[HttpPost][Route("getCustomerList")]`, sin guarda de null ni try/catch (LCC:9-11, :53-55).
3. `blackwhitelist("Consultar", email, "Negra")`: del modelo solo se usa `email` (LCC:57-58).
4. `exec SpVTASListaNBMagento @Tipo, @Correo, @Lista`, solo 3 parámetros (LCUM:120-124, :131-137, :157), en IntelisisTmp (LCUM:122, :128; LCONN:26).
5. Timeout 999999. `cnn.Open()` y `ExecuteReader()` están **fuera de todo try**, así que una excepción se propaga (LCUM:160-164).
6. **SP Consultar + Negra:** `SELECT 'Negra' AS Lista, … FROM VTASCListaNegra WITH (NOLOCK) WHERE Correo = @Correo`, con `@Correo varchar(50)` (LNB:23-25, :34-49).
7. `result = "true"` si hay filas; si no, `""` (LCUM:123, :166-177, :182).
8. `"true"` → `black`, y no consulta Blanca (LCC:59, :71-74).
9. Si no, consulta Blanca con el mismo SELECT sobre `VTASCListaBlanca` (LCC:61; LNB:50-65).
10. `"true"` → `white`; si no, `No esta en listas` (LCC:62-69).
11. `Ok(responseProcess)`: 200 con una cadena JSON (LCC:76).
12. **Error:** no hay filtro de excepciones (LAN App_Start/WebApiConfig.cs:18). Un body null, un email null o una falla de BD dan 500. El `Curl.Post` del DMZ devolvía `e.ToString()` con `(500) Internal Server Error` (DCURL:108-111), y el DMZ respondía `BadRequest()` (DCC:89-90).
13. **Sin efectos:** solo SELECT.

#### 3.3.3 Matriz de reglas

| Id | Regla LAN | ServicioSAP hoy | Estado | Evidencia |
|---|---|---|---|---|
| 1.3-R1 | Ruta POST en LAN; el DMZ la expone como GET con body | POST; el DMZ usa `PostSAP` | EQ | LCC:53-54; SCC:57-58; DCC:77-78, :88; AUD:646 |
| 1.3-R2 | `[Authorize]` + TokenValidationHandler | Igual; el DMZ manda TokenSAP | EQ | LCC:9; SCC:11; DCURL:123 |
| 1.3-R3 | De los 11 campos solo se usa `email` | Igual | EQ | LCC:58, :61; SCC:64, :72; DREQ:14 |
| 1.3-R4 | Sin guarda: null da 500 | 400 `Datos incompletos`; el DMZ rechaza antes | EQ-R | LCC:55-58; SCC:61-62; DCC:81-85 |
| 1.3-R5 | Primero Negra; si está, `black` sin consultar Blanca | El mismo orden y el mismo corte | EQ | LCC:58-74; SCC:64-74 |
| 1.3-R6 | Literales `black`, `white`, `No esta en listas` (sin acento), comparando con `"true"` | Iguales | EQ | LCC:59-73; SCC:66-73 |
| 1.3-R7 | Existe = `HasRows`; las columnas se descartan | Igual | EQ | LCUM:123, :166-177; SCUM:19, :54-61 |
| 1.3-R8 | EXEC de 3 VarChar, Consultar, timeout 999999 | Igual sobre `SpListaNBMagento` (DU9). C24 no aplica aquí y además quedó refutado en ejecución (EP:361-399) | EQ-R | LCUM:124, :131-137, :160; SCUM:26, :36-38, :50; AUD:576-590 |
| 1.3-R9 | Tablas `VTASCListaNegra`/`Blanca` en IntelisisTmp | ListaNegra/ListaBlanca en SIGMavi (DU9) | EQ-R | LCONN:26; LNB:46, :62; SCUM:32-33; SQLH:72-91 |
| 1.3-R10 | `WHERE Correo = @Correo` con NOLOCK, `varchar(50)` y la collation de IntelisisTmp | El cuerpo de `SpListaNBMagento` no está en el vault | PENDIENTE | LNB:23-25, :34-65; CML:61; T1.L-01 |
| 1.3-R11 | La respuesta depende de los datos de producción | SIGMavi está vacío en DEVMAVI a propósito; la carga la hacen los DBA. El commit `a0f1017` todavía decía "decidir si se migran las listas"; DEV3:495 lo cerró el 12 de agosto | N/A (prerrequisito, T1.L-04) | EP:352, :375, :402, :1307; DEV3:495 |
| 1.3-R12 | Un error de BD **no** se atrapa → 500 → DMZ 400 | **Corregido el 2026-10-05 (T1.L-02 = A, S3, sin E2E):** se registra y se relanza (SCUM:64-69); SCC:59-77 no tiene try → 500 → DMZ 400, como LAN. Antes se atrapaba y devolvía `""` → 200 `No esta en listas` (o `white` si solo falló la consulta de Negra) → DMZ `Ok`, y un correo en lista negra pasaba como limpio mientras SIGMavi estaba caído | EQ-R (HECHO sin E2E) | LCUM:162-164 (el único try está en :170-175); LCC:55-77; SCUM:64-69; SCC:59-77; DCURL:108-111; DCC:89-90; EP:323-330; `CustomersController/Post_GetCustomerList_Mapping.md`:37; CQ12 |
| 1.3-R13 | 200 con una cadena JSON; el DMZ quita las comillas y la vuelve a envolver | Igual | EQ | LCC:76; SCC:76; DCC:88, :92 |
| 1.3-R14 | Sin efectos | Igual; Consultar no pasa por la validación del BP | EQ | LNB:34-65; SCUM:21 |
| 1.3-R15 | Sin log | Registra solo errores (`[CUSTOMER blackwhitelist ERROR]`) | N/A | SCUM:66-67 |
| 1.3-R16 | Errores de upstream que no son 500 (401, 404, timeout): `Curl.Post` devolvía el texto y el DMZ respondía 200 | `PostSAP` devuelve `WebException: …` y el DMZ responde 200 con ese texto. Mismo status, otro texto; es transversal | EQ-R | DCURL:108-111, :130-146; DCC:92 |
| 1.3-R17 | Si falla el login en el constructor de `Curl` → 500 sin llegar a la ruta | Igual (antes también había un login a LAN fuera de try) | EQ-R | DCURL:73-90; `git show 740669e:WebApiMagento/Helper/Curl.cs` |
| 1.3-R18 | `@Correo varchar(50)` trunca al insertar y al consultar: los correos guardados tienen 50 caracteres como máximo y una consulta más larga coincide con su truncado | Si el parámetro o la columna de SIGMavi son más anchos, las filas migradas (ya truncadas) no coincidirán con consultas completas | PENDIENTE | LNB:24; T1.L-01, T1.L-04 |

#### 3.3.4 Contrato de respuesta

- **LAN:** 200 con `"black"`, `"white"` o `"No esta en listas"`; cualquier excepción da 500. Por el DMZ: esas tres cadenas con 200, y una falla de BD como 400 vacío (DCC:89-90).
- **ServicioSAP:** 200 con las mismas tres cadenas (SCC:68, :73, :76); 400 `{"Message":"Datos incompletos"}`, inalcanzable desde el DMZ; una falla de BD da 500 desde el 2026-10-05 (T1.L-02 = A; antes daba 200 `No esta en listas`).
- **Sin diferencia de contrato desde el 2026-10-05:** 1.3-R12 corregida, pendiente de la E2E de S6. El camino feliz es idéntico (EP:360-399).

#### 3.3.5 Tareas Fable

**T1.3-01 · VERIFICACION · E2E por el DMZ**
- Sin código. GET con body `{"email":…}` por el **DMZ** (las corridas del 10 de agosto fueron directas a ServicioSAP, EP:360-399).
- Casos: los tres valores de respuesta, email null (el DMZ da 400 `Datos incompletos`) y una falla de BD (T1.L-02 = A ya aplicada el 2026-10-05).
- **Criterio.** Request y response exactos anotados. Status y cuerpo iguales a LAN por el DMZ: 200 con las tres cadenas, 400 con email null y, con falla de BD, 500 en ServicioSAP (con `[CUSTOMER blackwhitelist ERROR]` en sap.log) y 400 vacío en el DMZ (T1.L-02 = A aplicada el 2026-10-05).

Tareas compartidas: **T1.L-02** (la que cierra R12), T1.L-01 (R10, R18), T1.L-04 (R11, R18) y T1.H-01.

#### 3.3.6 Preguntas

CQ12, CQ16, CQ17 y CQ18 (§5).

#### 3.3.7 Bloqueos

| Bloqueo | Dueño | Frena |
|---|---|---|
| Fuente de `SpListaNBMagento` (el usuario de dominio del analista no entra a DEVMAVI, EP:334) | Diego o alguien con acceso a DEVMAVI (CQ16) | R10, R18 |
| Carga de producción | DBA (DEV3:495) | Pase |
| Decisión T1.L-02 | Usuario (CQ12) | R12 |

---

### 3.4 `customer/deleteCustomerList` · Diego

#### 3.4.1 Estado verificado

- **DMZ.** DCC:95-111. Body null → 400 (DCC:99-100). Email null → `BadRequest("Datos incompletos")` (DCC:102-103). `curl.PostSAP("customer/deleteCustomerList", …)` (DCC:106). Con `Internal Server Error` → `BadRequest()` (DCC:107-108); si no, siempre `Ok("Correcto")` (DCC:110). El diff de `740669e` solo cambió el helper del verbo.
- **ServicioSAP.** SCC:79-88 (`[Authorize]` SCC:11, prefijo SCC:12).
  - `customer == null || email == null` → 400 (SCC:83-84).
  - `blackwhitelistAsync("Eliminar", email)` (SCC:86) → `Ok(responseProcess)` (SCC:87).
  - SCUM: `exec SpListaNBMagento @Tipo, @Correo, @Lista` (SCUM:26, :36-38), con la conexión SIGMavi ya abierta (SQLH:72-97, abre en :88). Timeout (SCUM:50). En excepción: log y `""` (SCUM:30, :64-68).
  - Historia: `a0f1017` (2026-08-11), `e20033b` (2026-08-21, de sync a async, sin cambio de lógica), `3d2bcf2` (solo comentarios) y `4315c50` (agrega E-11..E-13; no toca esta acción).
- **Veredicto:** Conectado **Si** · Generado **Si** · Trabajo **CORREGIR_PARIDAD** según T1.L-02. Si el usuario confirma que la decisión de opacidad del 2026-08-07 (E-02:116) también cubre delete, pasa a VERIFICAR_PARIDAD y se cierra con T1.4-01 y T1.L-01.

> [!note] Correcciones de la verificación ya aplicadas
> El DIF de R12 solo lo comparten get y delete. **set ya está en paridad** en la rama de error, porque en LAN el catch del controlador descarta el `Ok(e.ToString())` y devuelve `Ok()`. La corrida del 7 de agosto solo probó get: la DIF de delete descansa en el código. Logger puede lanzar desde el catch (SLOG:26-31). R4 es EQ solo en C#; su efecto en BD queda PENDIENTE. Se agregan R17 y R18 (EQ) y el caso de conexión null queda dentro de R12.
>
> **2026-10-05 (S3):** T1.L-02 = A aplicada (SCUM:68). R12 → EQ-R sin E2E: un error de BD da 500 → DMZ 400, como LAN.

#### 3.4.2 Proceso LAN paso a paso

1. **Antes del cambio,** el DMZ, con las mismas guardas, llamaba `curl.Post` a LAN (DCC:99-103; diff de `740669e`).
2. **LAN:** `[Authorize]` + `[RoutePrefix("customer")]` (LCC:9-10), `[HttpPost][Route("deleteCustomerList")]` (LCC:79-81). Sin guarda de null.
3. `blackwhitelist("Eliminar", email)`: los demás argumentos quedan en `""` (LCC:83-84; LCUM:120).
4. `exec SpVTASListaNBMagento @Tipo, @Correo, @Lista` sobre IntelisisTmp (LCUM:122-129, :124).
5. `@Tipo = 'Eliminar'`, `@Correo = email`, `@Lista = ''` (LCUM:131-137, :157).
6. `cnn.Open()` y `ExecuteReader()` sin try (LCUM:160-164). No hay filtro global, así que cualquier error da 500.
7. **SP:** `IF @Tipo = 'Eliminar' DELETE VTASCListaBlanca WHERE Correo = @Correo`. Sin SELECT, no toca Negra ni mira `@Lista`. `varchar(50)` trunca (LNB:23-30, :66-70).
8. `HasRows` es false, así que devuelve `""` (LCUM:166-182). Las filas afectadas nunca se leen.
9. `Ok("")` → 200 `""`, se haya borrado algo o no (LCC:86). Error de BD, body null o email null → 500.
10. **DMZ:** `Trim`; un 500 → `BadRequest()` (DCC:107-108); si no, `Correcto` (DCC:110).

#### 3.4.3 Matriz de reglas

| Id | Regla LAN | ServicioSAP hoy | Estado | Evidencia |
|---|---|---|---|---|
| 1.4-R1 | POST `customer/deleteCustomerList`, `[Authorize]` | Igual | EQ | LCC:9-10, :79-81; SCC:11-12, :79-81 |
| 1.4-R2 | Solo lee `email` | Igual | EQ | LCC:84; SCC:86; SS Models/SAP/BusinessPartner/CustomerRequest.cs:9; DREQ:14 |
| 1.4-R3 | Sin guarda: null → 500 | 400 `Datos incompletos`; el DMZ rechaza antes | EQ-R | LCC:84; LCUM:136; SCC:83-84; DCC:99-103 |
| 1.4-R4 | `""` no se rechaza y el SP hace `DELETE … WHERE Correo=''`, que borra toda fila con Correo vacío o solo espacios | En C# es igual (`""` pasa). El efecto en BD depende del cuerpo del SP de SIGMavi | PENDIENTE (EQ en C#) | DCC:102; SCC:83; SCUM:37; LNB:68-69; T1.L-01 |
| 1.4-R5 | EXEC de 3 parámetros, timeout 999999, ExecuteReader | Igual (DU9). C24 no aplica: Eliminar no usa la forma de 8 | EQ | LCUM:124, :131-137, :160, :164; SCUM:26, :36-38, :50, :52 |
| 1.4-R6 | Sin validación del cliente | La validación BP05 es solo para Insertar | EQ | LNB:66-70; SCUM:21 |
| 1.4-R7 | Datos en IntelisisTmp `VTASCListaBlanca` | SIGMavi `ListaBlanca` (ODS:72; DU9; DU1) | EQ | LCONN:26; SCUM:32-33; SQLH:72-97 |
| 1.4-R8 | Solo `DELETE` de Blanca: no toca Negra ni devuelve filas | Delegado; cuerpo no legible. Dos corridas coinciden con LAN (EP:356-387, anteriores a `e20033b`) | PENDIENTE | LNB:66-70; EP:379-387; T1.L-01 |
| 1.4-R9 | Coincidencia por `varchar(50)` y la collation de IntelisisTmp | Anchos y collation de SIGMavi desconocidos | PENDIENTE | LNB:24, :69; LCUM:132; SCUM:37; T1.L-01 |
| 1.4-R10 | `result` = `""` (sin filas) | Igual | EQ | LCUM:123, :166-177; SCUM:19, :54-60; EP:387, :461-465 |
| 1.4-R11 | Éxito: 200 `""`, haya borrado o no | Igual | EQ | LCC:86; SCC:87; GUIA:369 |
| 1.4-R12 | Error de BD, de conexión o SP inexistente → 500 → DMZ 400 | **Corregido el 2026-10-05 (T1.L-02 = A, S3, sin E2E):** el catch registra y relanza (SCUM:64-69); SCC:81-88 no tiene try → 500 → DMZ 400, como LAN. También si `Conexion.Data.getconexion` devuelve null (SQLH:79-91) y `ExecuteReaderAsync` lanza. Si `Logger.SAP` lanza desde el catch (SLOG:26-31), el resultado es el mismo 500 → 400 (T1.5-04 ya no cambia el status aquí). Antes todo se atrapaba → 200 `""` → DMZ `Correcto` | EQ-R (HECHO sin E2E) | LCUM:128, :162-164; LCC:81-87; SCUM:30-33, :64-69; SCC:81-88; SQLH:79-97; SLOG:26-31; DCC:107-110; CQ12 |
| 1.4-R13 | El DMZ siempre responde `Correcto`, salvo un 500 | El mismo DMZ con `PostSAP`. Un 401 o 404 también terminan en `Correcto`: ya pasaba antes | EQ | DCC:106-110 |
| 1.4-R14 | No informa las filas afectadas | Igual | EQ | LCUM:164; SCUM:52; E-04:45 |
| 1.4-R15 | Sin log | Registra errores | N/A | SCUM:66-67 |
| 1.4-R16 | Se pueden borrar las filas que ya existen en IntelisisTmp | Blanca de SIGMavi vacía en DEVMAVI; la carga la hacen los DBA | N/A (prerrequisito, T1.L-04) | DEV3:495 |
| 1.4-R17 | Falla de autenticación del DMZ: el constructor lanzaba → 500 | El constructor relanza el fallo del login SAP → 500. Cambió la dependencia, no el status | EQ | DCURL:73-90, :89; DCC:105 |
| 1.4-R18 | Timeout de transporte → texto → `Correcto` | Igual con `PostSAP` | EQ | DCURL:108-110, :124, :141 |

#### 3.4.4 Contrato de respuesta

- **Magento, por el DMZ, igual con los dos orígenes:** éxito → 200 `Correcto`, exista la fila o no (DCC:110). Sin email → 400 `Datos incompletos` (DCC:102-103). Body null → 400 vacío (DCC:99-100). Upstream con `Internal Server Error` → 400 vacío (DCC:107-108).
- **Los orígenes ya no difieren en el error (desde el 2026-10-05, T1.L-02 = A):**
  - LAN: 200 `""` en el éxito (LCC:86) y 500 en error.
  - ServicioSAP: 200 `""` en el éxito y 500 en error de BD (SCUM:64-69 relanza; SCC:81-88 sin try). Antes del cambio era 200 `""` también en error.
- Por lo tanto, una falla de BD le llega a Magento como 400, igual que con LAN (1.4-R12; pendiente la E2E de T1.4-01 f).

#### 3.4.5 Tareas Fable

**T1.4-01 · VERIFICACION · E2E por el DMZ después del cambio a async**
- Sin código, con la colección de Hoppscotch del DMZ:
  - (a) correo en white → DMZ 200 `Correcto` y SS 200 `""`; luego `getCustomerList` da `No esta en listas`;
  - (b) correo en black → después del borrado, `getCustomerList` sigue dando `black`;
  - (c) correo en ninguna lista → `Correcto`;
  - (d) body sin email → 400 `Datos incompletos`;
  - (e) email `""` → `Correcto` (se cuentan antes y después las filas con Correo vacío);
  - (f) T1.L-02 = A aplicada el 2026-10-05: una falla de BD forzada da 500 en ServicioSAP (con `[CUSTOMER blackwhitelist ERROR]` en sap.log) y 400 vacío en el DMZ.
- **Criterio.** Cada caso con su request y response, sobre código igual o posterior a `e20033b`. En los casos a-e, sap.log sin errores `[CUSTOMER …]`.

Tareas compartidas: **T1.L-02**, T1.L-01 (R4, R8, R9 y triggers), T1.L-04 (R16) y T1.H-01.

#### 3.4.6 Preguntas

CQ12, CQ16, CQ17 y CQ18 (§5).

#### 3.4.7 Bloqueos

- La fuente del SP y el DDL con triggers (CQ16; Diego y DBA).
- La carga de producción (DBA).
- La decisión T1.L-02 (usuario).
- Si un reporte de Intelisis sigue leyendo las listas después del corte (ODS:71): usuario, con Valentín (CQ17).

---

### 3.5 `customer/cashCustomerReport` · Diego

#### 3.5.1 Estado verificado

- **DMZ.** DCC:113-125 (`CreateCashReport`). Body null → 400 (DCC:117-118). `curl.PostSAP("customer/cashCustomerReport", …).Trim('"')` (DCC:120). Con `Internal Server Error` → `BadRequest()` (DCC:121-122); si no, `DeserializeObject<ApiResponse>` y `Ok(obj)` (DCC:123-124). Modelos en DREQ:36-45. El cambio (`e403065`, 2026-08-26) fue de una sola línea: `Post` → `PostSAP`.
- **ServicioSAP.**
  - Ruta: SCC:112-118, `Json(await new CashReportMethods().CreateCashReportAsync(req))` (SCC:117).
  - Lógica: CRM:47-87, port línea a línea de LCUM:194-223.
  - Modelos: SS Models/SAP/Customer/CuentaModels.cs:22-37.
  - Impersonación: IMP:11-47, copia literal de LPIM:410-446.
  - Llaves (solo nombres): `CASH_REPORT_LOCAL_PATH`, `CASH_REPORT_SHARE_PATH` (SWC:69-70) y `SMB_IMPERSONATION_DOMAIN/USER/PASSWORD` (SWC:83-85). Las credenciales coinciden con las de LAN por longitud y hash, sin imprimir valores.
  - Compilación: CSPROJ:245, :263, :369. `bin\ServicioSap.dll` (2026-09-29) tiene la ruta y los literales.
  - Historia: `4315c50` y luego `3d2bcf2` (comentarios). Su dependencia **SLOG cambió en `74d7c2f` (2026-09-15)**.
- **Veredicto:** Conectado **Si** · Generado **Si** · Trabajo **VERIFICAR_PARIDAD**. El caso válido con copia al share nunca pasó en dev (Win32 1326, entorno, DU1: EP ~:881-883; E-13:111-117).

> [!note] Correcciones de la verificación ya aplicadas
> "Trabajo NINGUNO" pasa a VERIFICAR_PARIDAD. `Logger.SAP` en el catch puede lanzar y cambiar el status HTTP (R9, R10; T1.5-04). R7 está sobreafirmado. La E2E suma 4 comprobaciones. La regla de orden de despliegue de E-13 sigue vigente por otra razón. Los ids de reglas y tareas se renumeraron a 1.5 / T1.5 (el primer análisis usaba 1.1 y CUS-CCR).

#### 3.5.2 Proceso LAN paso a paso

1. **Magento admin** (Mavi_CustomCashCustomerReport) arma un CSV y manda `{fileName: 'CashCustomerReport_<Y-m-d-H-i-s>.csv', fileContent: <base64>}` (RDP:70-78) por `Adapter::post` con Bearer (ADP:32-39).
2. **DMZ:** DCC:113-120. Antes de `e403065` iba a LAN con `curl.Post`; el envoltorio no cambió.
3. **LAN:** LCC:107-113 (`[Authorize]` LCC:9). `CreateCashReport(req)` → `Json(response)`, siempre HTTP 200 (LCC:113).
4. Si `req` es null o `fileContent`/`fileName` están vacíos → `{status: 400, message: 'Petición incorrecta, verifica los campos.'}` (LCUM:196-201).
5. Carpeta local fija y `CreateDirectory` (LCUM:205-206). Es un valor de entorno (DU1).
6. `Convert.FromBase64String`: Base64 inválido → FormatException → paso 10 (LCUM:207).
7. `Path.Combine(folder, fileName)`, **sin sanear el nombre** (GUIA:526), y `File.WriteAllBytes`, que sobrescribe (LCUM:208-209).
8. Impersonación con `LogonUser(…, 2 INTERACTIVE, 0)` y la cuenta de LCONN:33-35. Si falla: `UnauthorizedAccessException('LogonUser failed with error code: N')` → paso 10 (LCUM:211-212; LPIM:421-435).
9. Bajo la impersonación: `File.Copy(filePath, <share> + fileName, true)` (LCUM:214) y `{200, 'Se ha generado la descarga del Reporte.'}` (LCUM:217).
10. Cualquier excepción → `{500, 'Error al crear el reporte: ' + ex.Message}`. Sin log, y sin limpiar el archivo local (LCUM:219-222).
11. Sin SP, tablas ni SAP. Límite de request por defecto, 4 MB (LAN Web.config:54).

#### 3.5.3 Matriz de reglas

| Id | Regla LAN | ServicioSAP hoy | Estado | Evidencia |
|---|---|---|---|---|
| 1.5-R1 | Validación → `{400, 'Petición incorrecta, verifica los campos.'}` | La misma condición y el mismo literal | EQ | LCUM:196-201; CRM:49-54; EP:880-888 |
| 1.5-R2 | Carpeta local fija, se crea si falta | Sale de `CASH_REPORT_LOCAL_PATH`, con respaldo constante; `CreateDirectory` | EQ-R | LCUM:205-206; CRM:19, :24-31, :58; SWC:69; E-13:106-108 |
| 1.5-R3 | `FromBase64String` | Igual | EQ | LCUM:207; CRM:60 |
| 1.5-R4 | `Path.Combine` sin sanear | Igual (heredado, §1.9). **Decisión del 2026-10-05 (CQ20: "if this works, dont move"):** no se sanea; T1.5-03 cerrada sin código y el riesgo sigue como deuda en GUIA §8.1 | EQ | LCUM:208; CRM:61; GUIA:526; CQ20 |
| 1.5-R5 | `File.WriteAllBytes`, que sobrescribe | `FileStream(FileMode.Create)` + `WriteAsync` | EQ-R | LCUM:209; CRM:64-68 |
| 1.5-R6 | `LogonUser` tipo 2 / proveedor 0 con la cuenta de LAN | Copia literal, con llaves del Web.config (credenciales iguales por hash) | EQ | LCUM:211-212; LPIM:421-435; IMP:22-36; CRM:70-73; SWC:83-85 |
| 1.5-R7 | `File.Copy(…, <share> + fileName, true)` por concatenación | `File.Copy(…, Path.Combine(SharePath, fileName), true)` con el mismo destino. Solo difieren con un `fileName` con raíz (`\\x.csv`, `/x.csv`): LAN puede copiar a `STAGE\x.csv` y ServicioSAP intentaría copiar el archivo sobre sí mismo. Sin impacto práctico: Magento siempre manda `CashCustomerReport_<timestamp>.csv` | EQ-R | LCUM:208-214; CRM:33-40, :61, :75; SWC:70; RDP:71 |
| 1.5-R8 | Éxito `{200, 'Se ha generado la descarga del Reporte.'}` | El mismo literal (la DLL lo tiene con acentos correctos) | EQ | LCUM:217; CRM:78 |
| 1.5-R9 | Excepción → `{500, 'Error al crear el reporte: ' + ex.Message}`, sin log, y el catch **no puede lanzar** | La misma respuesta más `Logger.SAP` **dentro del catch**. SLOG hace `Directory.CreateDirectory(<BaseDirectory>\Logs)` fuera de try (agregado en `74d7c2f`). Si la carpeta no existe y el app pool no puede crearla, la excepción sale del catch → HTTP 500 real → DMZ 400 sin cuerpo, en lugar de 200 `{status:500}`. La carpeta `Logs` no está en git ni en CSPROJ, así que una publicación limpia no la trae. **CQ21 (2026-10-05):** la respuesta del usuario describe las dos rutas de SLOG (servidor SLOG:11, local SLOG:26-27) sin elegir A ni B; sin código en S3; pendiente confirmar A | EQ-R (con riesgo, T1.5-04; CQ21 pendiente de confirmar) | LCUM:219-222; CRM:80-85, :82-83; SLOG:26-31; DCURL:130-138; DCC:121-122; `.gitignore`:68 |
| 1.5-R10 | `Json(ApiResponse)`: siempre HTTP 200 | `Json(await …)`: HTTP 200 **mientras `Logger.SAP` no lance** (el controlador no tiene try, SCC:114-118). Sin cambio en S3: CQ21 pendiente de confirmar | EQ-R | LCC:113; SCC:117; SLOG:28-31 |
| 1.5-R11 | `[Authorize]`: sin token → 401 | Igual | EQ | LCC:9; SCC:11; EP:888 |
| 1.5-R12 | Límite de 4 MB | 50 MB: acepta todo lo que LAN aceptaba. El DMZ sigue con el límite por defecto | EQ-R | LAN Web.config:54; SWC:93, :101; DMZ Web.config:43 |
| 1.5-R13 | El archivo local se queda aunque falle la copia | El mismo orden, sin limpieza | EQ | LCUM:209, :214; CRM:64-76; E-13:142-143 |
| 1.5-R14 | DMZ: null → 400; `Internal Server Error` → 400; si no, deserializa y `Ok` | `PostSAP` devuelve `WebException: …`. Con un 500 los dos van a 400, y un error que no es JSON hace lanzar al deserializar en los dos → 500 | EQ-R | DCC:117-124; DCURL:108-111, :130-141; ADP:39 |
| 1.5-R15 | La copia lee el origen bajo la identidad impersonada | Igual, pero con otra carpeta local: su ACL se comprueba en QA (DU1, entorno) | EQ-R | LCUM:212-214; CRM:70-76; SWC:69 |
| 1.5-R16 | — | Orden de despliegue: primero ServicioSAP, después el DMZ con `e403065`. Con la ruta ausente, el 404 no contiene `Internal Server Error` y el deserializar lanza → 500 | N/A (prerrequisito, T1.0-DEP) | DCURL:86-89; DCC:121-123; E-13:85-86 |

#### 3.5.4 Contrato de respuesta

- **Iguales:** HTTP 200 siempre, con cuerpo `{"status": <int>, "message": <string>}` y los mismos tres literales (LCUM:200, :217, :221; CRM:53, :78, :85). Sin token → 401.
- **Magento recibe** HTTP 200 con el mismo objeto (DMZ `ApiResponse`, DREQ:41-45). Si ServicioSAP da 500, el DMZ da 400.
- **Contexto que la migración no cambia:** el admin de Magento juzga el éxito por el **status HTTP** del DMZ (ADP:39; `index.phtml`:147-154), así que un cuerpo con `status` 400/500 aparece como éxito.
- **Por eso el riesgo de R9 sí se vería:** si `Logger` lanza, el mensaje de la pantalla pasa de "éxito" a "error".

#### 3.5.5 Tareas Fable

**T1.5-01 · VERIFICACION (CQ22) · E2E en QA de la cadena completa, con la copia SMB**
- Sin código. Desde QA (servidor de ServicioSAP), por el DMZ, casos:
  - válido `{fileName: 'CashCustomerReport_<ts>.csv', fileContent: <base64 de un CSV ficticio>}`;
  - sin fileName; sin fileContent; body null (el DMZ da 400);
  - Base64 inválido;
  - sin token.
- Hay que rehacer la evidencia: `Tests\ServicioSap.Ola6.http` está en el `.gitignore` y no existe.
- **Comprobaciones agregadas:**
  - (a) el Base64 inválido por el DMZ da HTTP 200 con `{status: 500, 'Error al crear el reporte: …'}`, no HTTP 400: así se detecta el riesgo de SLOG (valor esperado sin cambio tras S3: T1.5-04 sin código, CQ21 pendiente de confirmar A);
  - (b) `<sitio>\Logs` existe en el sitio de ServicioSAP de QA/PROD o el app pool puede crearlo;
  - (c) la cuenta impersonada puede leer `CASH_REPORT_LOCAL_PATH` (entorno, DU1);
  - (d) el DMZ desplegado incluye `e403065` (E-13:85-86 lo daba "sin desplegar" al 31 de agosto).
- **Criterio.**
  - Caso válido: HTTP 200 `{status: 200, message: 'Se ha generado la descarga del Reporte.'}` y el archivo idéntico, byte a byte, en la carpeta local y en el share.
  - 400, Base64 y 401: como R1, R9 y R11.
  - Un `LogonUser` 1326 en dev es de entorno, no un defecto.

**T1.5-02 · VERIFICACION · LAN contra ServicioSAP con el mismo payload**
- Mandar los mismos payloads (válido, campo faltante, Base64 inválido) a LAN y a ServicioSAP y comparar el cuerpo crudo.
- **Criterio.** Cuerpos iguales byte a byte: orden `status`, `message`, acentos y el texto de la excepción. Cualquier diferencia se reporta, no se interpreta (GUIA §2.2).

**T1.5-03 · DECISION (CQ20) · Path traversal heredado (R4, GUIA §8.1:526)**
- Solo con aprobación: `Path.GetFileName(request.fileName)` antes de los dos `Path.Combine` (CRM:61, :75) y, si se aprueba también, el mismo `status 400` cuando el nombre saneado difiera o quede vacío. Es un desvío de LAN (LCUM:208, :214), así que §1.9 exige aprobación explícita.
- **Recomendación: sanear.** No cambia el tráfico legítimo (RDP:71) y cierra un riesgo que la GUIA ya tiene registrado.
- **Criterio.** Con aprobación: los nombres legítimos se comportan igual y los que llevan `..\` o raíz ya no escriben fuera. Sin aprobación: sin cambio, y sigue como deuda en GUIA §8.1.
- **Decidido el 2026-10-05 (CQ20):** "why you need to change this? if this works, dont move". Sin aprobación → sin cambio: CRM:61 y :75 quedan como LAN (LCUM:208, :214); el riesgo sigue como deuda en GUIA §8.1. Tarea cerrada por decisión.

**T1.5-04 · DECISION (CQ21) · `Logger.SAP` puede romper el contrato de error (R9, R10). Transversal: es el B8 de CREDITO §6.7**
- **Opción A (sin código, recomendada ahora):** el despliegue crea `<sitio>\Logs` con permiso de escritura para el app pool de ServicioSAP. Se comprueba en T1.5-01 (a) y (b).
- **Opción B (código):** mover SLOG:26-32 dentro del try/catch existente de SLOG:34-41, como pide el comentario "Silencioso" de SLOG:23. Toca un helper compartido (~95 llamadores de `Logger.SAP`), así que necesita la aprobación del usuario o del dueño de `74d7c2f`, y va sola.
- También afecta la rama de error de las listas (1.4-R12).
- **Criterio.** Tras el cambio o el despliegue, el Base64 inválido da HTTP 200 `{status: 500}` por el DMZ.
- **CQ21 (2026-10-05):** "this is because the route its for localhost and the other its for the server,". La respuesta describe las dos rutas de SLOG (`C:\inetpub\wwwroot\log\sap.log` para el servidor, SLOG:11, dentro de try; `<sitio>\Logs\sap.log` para pruebas locales, SLOG:26-32, con `CreateDirectory` fuera de try) sin elegir A ni B. Sin código en S3: B toca el helper compartido y exige aprobación explícita. **Pendiente:** confirmar A (sin código: el despliegue crea `<sitio>\Logs` con permiso de escritura para el app pool).

Higiene de esta ruta: CRM:67 en T1.H-01. Corrección del CSV fila 36: T1.0-DOC.

#### 3.5.6 Preguntas

CQ20, CQ21 y CQ22 (§5).

#### 3.5.7 Bloqueos

- **Código:** ninguno.
- **Verificación pendiente, no bloqueo (DU1):** la copia SMB del caso válido. En dev, `LogonUser` da 1326 con las mismas credenciales que LAN. Hay que correrlo desde QA. Dueño: Diego (CSV:36), con quien tenga acceso al IIS de ServicioSAP y al share.

---

### 3.6 `customer/getCuenta` (LAN-only) · Diego

#### 3.6.1 Estado verificado

- **DMZ.** **No hay ruta** `customer/getCuenta`: DCC solo expone las rutas de DCC:19, :41, :78, :96 y :114. Lo que existe es `magento/getCuenta` (DMC:111-118, `[Authorize]` DMC:9), que postea a `rest/V1/mavi-cuenta/getCuenta` con `NullValueHandling.Ignore` (DMAG:194-198) mediante un `Post` que devuelve `response.Content` cualquiera que sea el status de Magento (DMAG:26-46). Es el salto de bajada que usan LAN y ServicioSAP (CSV:75). Nada que conectar.
- **ServicioSAP.** SCC:90-98 → `MagentoAccountMethods.GetCuentaAsync` (MAM:21-28) → `new Curl().PostAsync("magento/getCuenta", …)` (MAM:23-25, con `SinNulos` en MAM:17-18) → `Desescapar` (MAM:40-45), idéntico a LAN.
  - Transporte SCURL:71-105: se autentica en `login/authenticate` del DMZ **en cada intento** (SCURL:48-65, :81), manda Bearer (SCURL:82), timeout de 30 s por petición (SCURL:19, :43), 3 intentos con 2 y 4 s de espera (SCURL:75, :99-100) y al final lanza (SCURL:104).
  - Modelo: SS Models/SAP/Customer/CuentaModels.cs:14-19. CSPROJ:224, :265, :369.
- **Consumidor:** no hay ninguno en el DMZ, ServicioSAP, LAN ni Magento. `Mavi/CreditMigration/Model/ClientCreditManagement.php`:70 está comentado. La decisión del 11 de agosto fue migrarlas igual (`_NUESTROS_ENDPOINTS/_PLAN_MIGRACION_FECHAS.md`:160).
- **Veredicto:** Conectado **N/A** · Generado **Si** · Trabajo **VERIFICAR_PARIDAD** + T1.C-01 + T1.C-02.

> [!note] Correcciones de la verificación ya aplicadas
> La opción B de T1.C-01 tal como estaba no daba paridad: también se tragaría el fallo del login. El 500 de ServicioSAP trae detalle y el de LAN no (entorno, DU1). Un token malformado da 500 en los dos. El cuerpo de error de Magento sale como JSON inválido en los dos. En el contrato, `cuenta_intelisis` puede ser null, el orden es website 1 y luego 5, y los caracteres no ASCII vuelven escapados. R16 se vuelve funcional si Magento tarda más de 30 s. CML:143 está desactualizado. "Mantener o deprecar" ya está decidido. Hay reglas nuevas R22-R28.

#### 3.6.2 Proceso LAN paso a paso

1. Un llamador desconocido obtiene su JWT en LAN `login/authenticate` y llama POST `customer/getCuenta` (LCC:9-10, :89-91; LLOGIN:13, :17).
2. El body se enlaza a `CustomerIntelisis {nuevaCuenta, correoCuenta, idCliente}` sin validar (LAN Models/CustomerRequest.cs:23-28; LCC:91-95).
3. `new Magento()` crea `new Curl()`, cuyo constructor postea `USER_DMZ` a `login/authenticate` del DMZ **sin try**: si falla, 500 (LMAG:17-20; LCURL:21-22, :25-39).
4. Serializa con `NullValueHandling.Ignore` y llama `curl.Post("magento/getCuenta")` (LMAG:309-312).
5. `Curl.Post` manda el token crudo, sin `Bearer`, con timeout 9999999. **Ante cualquier excepción devuelve `e.Message`** (LCURL:79-110, :98, :105-108).
6. **Salto del DMZ** (compartido, sin cambio): `MagentoController.GetCuenta` → Magento, y devuelve el contenido con 200 aunque Magento dé error. Acepta el token crudo o con Bearer (DMC:111-118; DMAG:26-46, :194-198; DTVH:28).
7. **Magento** `getCuenta($correoCuenta)` usa solo el correo: `loadByEmail` en los websites 1 y 5, y por cada coincidencia agrega `{id, name = firstname + ' ' + lastname, cuenta_intelisis}`, sin quitar duplicados. Devuelve `json_encode(array)` o `[]` (CMX:4-9; CMI:11; CMA:31-48).
8. **Desescapado** `.Replace("\\\"","\"").Replace("\\\\\"","\"").Trim('"')` → `Ok(string)` (LMAG:314-316; LCC:95).
9. Sin SQL, SP ni SAP (LMAG:309-317).

#### 3.6.3 Matriz de reglas

| Id | Regla LAN | ServicioSAP hoy | Estado | Evidencia |
|---|---|---|---|---|
| 1.6-R1 | POST `customer/getCuenta`, `[Authorize]`, sin entrada DMZ | Igual | EQ | LCC:89-91; SCC:92-94 |
| 1.6-R2 | El JWT sale de LAN `login/authenticate` | Sale de `login/auth`: el llamador cambia de host y de ruta de login al cortarse | DIF | LLOGIN:13, :17-37; SLOGIN:15, :20-42 |
| 1.6-R3 | Modelo `CustomerIntelisis` de 3 strings | Igual | EQ | LAN Models/CustomerRequest.cs:25-27; SS CuentaModels.cs:16-18 |
| 1.6-R4 | Sin validación | Igual | EQ | LCC:91-95; SCC:94-97; CMI:11 |
| 1.6-R5 | Newtonsoft `Formatting.None` + `NullValueHandling.Ignore` | Igual (`SinNulos`) | EQ | LMAG:311-312; MAM:17-18, :24-25 |
| 1.6-R6 | Destino DMZ `magento/getCuenta` | Igual | EQ | LMAG:311; MAM:24; DMC:111-118 |
| 1.6-R7 | Login al DMZ una vez, en el constructor | El mismo endpoint y las mismas llaves, pero un login por intento | EQ-R | LCURL:21-22, :37; SCURL:21-22, :48-65, :81 |
| 1.6-R8 | Token crudo | `Bearer`; el DMZ acepta los dos | EQ-R | LCURL:98; SCURL:82; DTVH:28; EP:859-866 |
| 1.6-R9 | El DMZ devuelve el cuerpo de Magento aunque sea error | El mismo salto | EQ | DMAG:26-46, :194-198 |
| 1.6-R10 | Magento busca el correo en los websites 1 y 5 y devuelve 0-2 elementos o `[]`; ignora idCliente y nuevaCuenta | El mismo método | EQ | CMA:31-48 (DU2: el valor pasa sin tocarse) |
| 1.6-R11 | Desescapado Replace/Replace/Trim | Idéntico en `Desescapar`, más una guarda de null inalcanzable | EQ | LMAG:314; MAM:40-45 |
| 1.6-R12 | Éxito: 200 con una cadena JSON que contiene el arreglo, p. ej. `"[]"` | Igual. El caso de correo existente nunca se probó | EQ | LCC:95; SCC:97; EP:863; E-11:116-117 |
| 1.6-R13 | Error de validación de Magento: 200 con el JSON de error. El desescapado convierte `\"%fieldName\"` en comillas dobles, así que el cuerpo **queda como JSON inválido** | La misma cadena de desescapado | EQ | DMAG:40-45; DMC:117; LMAG:314; MAM:44; EP:865 |
| 1.6-R14 | Falla la llamada al DMZ tras el login (no 2xx, red, timeout): 200 con `e.Message` | Lanza, reintenta 3 veces y lanza `DMZ falló tras 3 intentos…`; sin try en el controlador → **500** | DIF (CQ24 sin respuesta el 2026-10-05: sin cambio en S3) | LCURL:105-108; LMAG:314; LCC:95; SCURL:90-92, :95-104; SCC:94-98 |
| 1.6-R15 | Falla el login al DMZ: constructor sin guarda → 500 inmediato con el mensaje genérico | 3 intentos (con 2+4 s de espera) → 500. Con `customErrors Off` y `httpErrors Detailed` el 500 trae el detalle de la excepción y el stack; LAN, sin `customErrors`, trae el genérico. Es configuración de Dev (DU1) | EQ-R | LCURL:30-38; SCURL:57-61, :75, :81, :99-104; SWC:94, :97 |
| 1.6-R16 | Timeout de 9999999 ms | 30 s por petición. Si Magento tarda más de 30 s (el DMZ no tiene timeout hacia Magento, DMAG:33), LAN devuelve 200 con datos y ServicioSAP 500 tras unos 96 s. Solo hay una muestra de 1.6 s | DIF | LCURL:35, :99; SCURL:19, :43, :75, :99-100, :104; E-11:112 |
| 1.6-R17 | Sin reintentos | 3 intentos (§1.9a) | DIF | SCURL:19, :75, :99-100 |
| 1.6-R18 | Solo TLS 1.2 | TLS 1.2/1.1/1.0 | EQ-R | LCURL:28; SCURL:37-38 |
| 1.6-R19 | Sin BD, SP ni SAP | Igual | EQ | LMAG:309-317; MAM:21-28 |
| 1.6-R20 | — | Los `.cs` están en CSPROJ (regla 19) | EQ | CSPROJ:224, :265, :369 |
| 1.6-R21 | Ninguna ruta del DMZ reenvía a LAN `customer/getCuenta` | No hace falta puente | N/A | DCC:19, :41, :78, :96, :114 |
| 1.6-R22 | Magento inalcanzable: RestSharp no lanza y el DMZ devuelve 200 con contenido vacío | 200 con cadena vacía en los dos | EQ | DMAG:32-45; LCURL:102; LMAG:314; SCURL:90; MAM:44 |
| 1.6-R23 | Token: sin header o duplicado → 401 (`[Authorize]`); vencido o firma mala → 401; **malformado (no JWT) → 500** | El mismo handler | EQ | LTVH:23-26, :38-42, :69-76; STVH:24-27, :39-43, :70-77 |
| 1.6-R24 | Body null: se serializa como `"null"` y Magento responde "is required" con 200 | Igual | EQ | LMAG:311; MAM:24-25; DMAG:196 |
| 1.6-R25 | `cuenta_intelisis` es JSON null cuando no hay `customer_credit_account` | Pasa igual | EQ | CMA:38, :42 |
| 1.6-R26 | El orden es website 1 y luego 5; `[0]` es el del website 1 | Igual | EQ | CMA:33-35 |
| 1.6-R27 | Los nombres no ASCII vuelven escapados (triple codificación), p. ej. `José` llega como el texto literal `Jos\u00e9` (derivado del código, sin probar) | Igual: se replica, no se arregla (§1.9) | EQ | CMA:47; LMAG:314; MAM:44 |
| 1.6-R28 | El DMZ reescribe el JSON de salida (`$$6` → apóstrofo; quita fragmentos fijos) | El mismo salto | EQ | DMAG:28-31 |

#### 3.6.4 Contrato de respuesta

- **Iguales:** HTTP 200 con una cadena JSON cuyo contenido es el payload de Magento desescapado: `"[{\"id\":…,\"name\":\"<nombre apellido>\",\"cuenta_intelisis\":\"…\"|null}]"`. Tiene 0, 1 o 2 elementos (website 1 y luego 5), o `"[]"`. Los no ASCII vuelven escapados.
- **Error de validación de Magento:** 200 con un `{"message":…}` que queda como JSON inválido tras el desescapado, en los dos.
- **Token:** sin header o inválido → 401; malformado → 500, en los dos.
- **Única divergencia:** si falla la llamada al DMZ **después** del login, LAN da 200 con el mensaje de la excepción (LCURL:105-108) y ServicioSAP da 500 tras 3 intentos (SCURL:104). Si falla el login, los dos dan 500, con otro detalle y otra latencia.

#### 3.6.5 Tareas Fable

**T1.6-01 · VERIFICACION (CQ25) · E2E lado a lado de LAN y ServicioSAP**
- Sin código. Llamar LAN y ServicioSAP `customer/getCuenta` contra el mismo DMZ desplegado, con 8 casos:
  - (1) correo en 1 website;
  - (2) correo en los websites 1 y 5;
  - (3) correo inexistente;
  - (4) body vacío;
  - (5) sin token;
  - (6) token malformado (500 en los dos);
  - (7) cliente con acentos en el nombre;
  - (8) falla del DMZ después del login, por ejemplo deteniendo la app del DMZ tras autenticar. Es la rama de R14: LAN 200 con mensaje y ServicioSAP 500. Valor esperado sin cambio tras S3 (T1.C-01 no aplicada; CQ24 pendiente).
- **Criterio.** Status y cuerpo idénticos en todos los casos menos el 8, que registra la diferencia. Evidencia escrita: el `.http` de la Ola 6 no existe. Solo lectura contra Magento, con visto bueno.

Tareas compartidas: **T1.C-01** (la decisión de R14, R16 y R17), **T1.C-02** (consumidor; cierra R2) y T1.H-01 (MAM:24).

#### 3.6.6 Preguntas

CQ23, CQ24 y CQ25 (§5).

#### 3.6.7 Bloqueos

| Bloqueo | Dueño | Frena |
|---|---|---|
| Consumidor desconocido (logs IIS de LAN) | Usuario / infraestructura (CQ23) | Apagar LAN para esta ruta |
| No hay correo de prueba acordado en los websites 1 y 5 (E-11:116-117) | Usuario / equipo Magento (CQ25) | T1.6-01 casos 1-2 |
| Decisión T1.C-01 | Usuario (CQ24) | R14, R16, R17 |

---

### 3.7 `customer/setCuenta` (LAN-only) · Diego

#### 3.7.1 Estado verificado

- **DMZ.** No hay ruta (DCC:15-124). Solo existe `magento/setCuenta` (DMC:120-127 → DMAG:200-204 → `rest/V1/mavi-cuenta/setCuenta`; CSV:76), que es el salto de bajada. El flujo va al revés que en una ruta normal: llamador → LAN o ServicioSAP → DMZ → Magento.
- **ServicioSAP.** SCC:100-108 → `SetCuentaAsync` (MAM:30-38) → `Curl.PostAsync("magento/setCuenta")` (SCURL:71-105) → `Desescapar` (MAM:40-45). CSPROJ:224, :243 (SCURL), :265, :369. Sin SAP ni SQL.
- **Evidencia de prueba.** Solo se probaron dos ramas: idCliente inexistente (200 con el error de Magento) y sin token (401) (E-12:87-92; EP:870-878; CML:118). Las ramas donde falla el DMZ (R11-R13) y la escritura positiva **nunca se corrieron** (E-12:94). El único cambio posterior en SCURL (`ac9449b`) solo quitó wrappers síncronos.
- **Consumidor:** ninguno en LAN (solo LCC:104), en el DMZ, en Magento (`Mavi/CreditMigration/Model/ClientCreditManagement.php`:70 está comentado), en businesspartner-dev, en salesanddistribution-dev ni en el SQL del vault.
- **Veredicto:** Conectado **N/A** · Generado **Si** · Trabajo **VERIFICAR_PARIDAD** + T1.C-01. El corte del consumidor está BLOQUEADO (T1.C-02) y la E2E positiva también (CQ25).

> [!note] Correcciones de la verificación ya aplicadas
> El trabajo pasa de BLOQUEADO a VERIFICAR_PARIDAD: los bloqueos son de las tareas, no de la clase. La cita de CSPROJ del controlador es :224. Las pruebas del vault solo cubren las ramas con el DMZ arriba. Un token malformado da 500. En R12, LAN no es "inmediato" y el 500 de ServicioSAP trae detalle. El timeout de R13 es por petición (peor caso ≈186 s). Se corrigió el arreglo de Hoppscotch. Hay reglas nuevas R19-R23.

#### 3.7.2 Proceso LAN paso a paso

1. Un llamador desconocido obtiene su JWT en LAN `login/authenticate` (LLOGIN:12-37).
2. POST `customer/setCuenta` bajo `[Authorize]` + handler (LCC:9-10, :98-105). El body es `CustomerIntelisis`, sin validar.
3. `new Magento()` → `new Curl()`, con TLS 1.2 y cualquier certificado, y login al DMZ fuera de try (LMAG:16-20; LCURL:21-22, :27-38).
4. `Magento.setCuenta` serializa sin nulos → `curl.Post("magento/setCuenta")` con token crudo y timeout 9999999. Una excepción devuelve `e.Message` (LMAG:319-322; LCURL:98-108).
5. **DMZ** `magento/setCuenta`: vuelve a serializar sin nulos, manda Bearer `TOKEN_MAGENTO` sin timeout y devuelve el contenido con 200 aunque Magento falle (DMC:120-127; DMAG:26-46, :200-204).
6. **Magento** `setCuenta(idCliente, nuevaCuenta)`: carga el cliente; si no existe, `Customer does not exist.`; si existe, `customer_credit_account = nuevaCuenta` sin validar formato, `save` y `true`. `correoCuenta` se ignora (CMX:10-15; CMA:56-66; CMI:13-18).
7. Desescapado → `Ok(string)`: `"true"` o el error de Magento como cadena (LMAG:324; LCC:104).
8. Sin SQL, SP ni tablas (LCC:98-105; LMAG:319-326; LCURL:19-110).

#### 3.7.3 Matriz de reglas

| Id | Regla LAN | ServicioSAP hoy | Estado | Evidencia |
|---|---|---|---|---|
| 1.7-R1 | POST `customer/setCuenta`, `[Authorize]` | Igual | EQ | LCC:9-10, :98-100; SCC:11-12, :102-104 |
| 1.7-R2 | JWT de LAN `login/authenticate` | `login/auth`: el llamador cambia de login al cortarse | DIF | LLOGIN:13, :17-37; SLOGIN:15, :20-42 |
| 1.7-R3 | Token crudo o con Bearer | El mismo parseo | EQ | LTVH:28; STVH:29 |
| 1.7-R4 | Modelo `CustomerIntelisis` | Igual | EQ | LAN Models/CustomerRequest.cs:23-28; SS CuentaModels.cs:14-19 |
| 1.7-R5 | Sin validación | Sin validación (§1.9) | EQ | LCC:100-105; SCC:104-108; MAM:31-38 |
| 1.7-R6 | Serialización sin nulos | Igual | EQ | LMAG:321-322; MAM:17-18, :34-35 |
| 1.7-R7 | Destino DMZ `magento/setCuenta` → Magento | Igual | EQ | LMAG:321; MAM:34; DMC:120-127; CMX:10-15 |
| 1.7-R8 | Un login por request, `USER_DMZ` crudo, token sin Bearer | Un login por intento, `USER_DMZ` re-serializado, Bearer. El DMZ acepta las dos formas | EQ-R | LCURL:21-22, :30-38, :98; SCURL:48-65, :81-82; DTVH:28 |
| 1.7-R9 | Desescapado | Idéntico | EQ | LMAG:324; MAM:40-45 |
| 1.7-R10 | 200 `"true"`; idCliente inexistente → 200 con `{"message":"Customer does not exist."}` como cadena | Igual | EQ | LCC:104; SCC:107; CMA:58-65; E-12:87-92; CML:118 |
| 1.7-R11 | Falla la llamada al DMZ después del login → 200 con el texto de la WebException | 3 intentos → 500 (sin filtro de excepciones). Solo aparece cuando falla el propio DMZ (401, 500 al escribir su log, caído o timeout), porque el DMZ da 200 ante cualquier respuesta de Magento. También choca con GUIA §1.5 | DIF (CQ24 sin respuesta el 2026-10-05: sin cambio en S3) | LCURL:105-108; LMAG:324; LCC:104; SCURL:75-104; SS App_Start/WebApiConfig.cs:11-23; DMAG:38-45; DMZ Helper/Logger.cs:24-25 |
| 1.7-R12 | Login al DMZ falla o el DMZ no responde → 500. No es inmediato: espera el timeout de TCP, o hasta 9999999 ms si el DMZ se cuelga | 3 intentos → 500, con `ExceptionMessage` y `StackTrace` (customErrors Off, DU1) | EQ-R | LCURL:30-38; SCURL:57-61, :81, :104; SWC:94 |
| 1.7-R13 | Timeout de 9999999 ms, un intento | 30 s por petición (login y POST), hasta 3 intentos: peor caso ≈ 3 × (30 + 30) + 2 + 4 ≈ 186 s. Si Magento tarda más de 30 s en guardar, ServicioSAP reenvía la escritura (es idempotente) y responde 500 aunque Magento haya guardado | DIF | LCURL:35, :99; SCURL:19, :43, :55, :75-101, :85; DMAG:33; CMA:61-65 |
| 1.7-R14 | Sin log en LAN; el DMZ registra los no-OK de Magento | Solo `Console.WriteLine` | EQ-R | LMAG:319-326; SCURL:88, :98; DMAG:40-43 |
| 1.7-R15 | `nuevaCuenta` pasa sin tocar | Sin tocar; sin mapeo C → BP (DU2) | EQ | LMAG:321; MAM:34-35; CMA:61 |
| 1.7-R16 | `correoCuenta` se manda y Magento lo ignora | Igual | EQ | CMI:13-18 |
| 1.7-R17 | Escritura positiva (el cliente existe, `"true"`) | El camino es igual, pero nunca se probó | PENDIENTE | E-12:94; CML:110, :118 |
| 1.7-R18 | Consumidor de LAN desconocido | Nadie llama la ruta de ServicioSAP | PENDIENTE | LCC:99-104; LMAG:319; T1.C-02 |
| 1.7-R19 | El DMZ reescribe `$$6` → apóstrofo: una `nuevaCuenta` con `$$6` se guarda alterada | Igual | EQ | DMAG:28-31 |
| 1.7-R20 | Si falta idCliente o nuevaCuenta, se omite en los tres saltos y Magento rechaza el parámetro requerido con 200 | Igual | EQ | LMAG:321-322; MAM:17-18, :34-35; DMAG:202-203; CMA:56 |
| 1.7-R21 | UTF-8 `application/json`; solo TLS 1.2 | `application/json; charset=utf-8`; TLS 1.2/1.1/1.0 | EQ-R | LCURL:27-28, :97, :100; SCURL:34, :37-38, :84 |
| 1.7-R22 | — | El consumidor necesita un JWT de ServicioSAP. Hoy las llaves JWT coinciden entre LAN y ServicioSAP (GUIA §8.1, §8.5.1), así que un token de LAN valida; si se separan, hay que cambiar el login | N/A (prerrequisito del corte, T1.C-02) | SLOGIN:20-37; STVH:47-62; GUIA:525, :588-595 |
| 1.7-R23 | Token malformado → 500; firma mala o vencido → 401 | El mismo handler (bibliotecas JWT 6.9 contra 8.14) | EQ | LTVH:38-42, :69-78; STVH:39-43, :70-79; LAN y SS `packages.config` |

#### 3.7.4 Contrato de respuesta

- **Iguales:** HTTP 200 con una cadena JSON (LCC:104; SCC:107). Éxito `"true"`. idCliente inexistente: `"{\"message\":\"Customer does not exist.\"}"`. Sin token o token inválido → 401; malformado → 500.
- **Falla el DMZ después del login:** LAN da 200 con el texto de .NET y ServicioSAP 500 tras 3 intentos (**DIF**).
- **Falla el login o el DMZ está caído:** 500 en los dos, con otra latencia y otro detalle.
- El camino de éxito nunca se corrió de punta a punta.

#### 3.7.5 Tareas Fable

**T1.7-01 · VERIFICACION (CQ25) · E2E de escritura positiva**
- Sin código. Con un cliente de prueba de Magento `<<ID_CLIENTE_MAGENTO_PRUEBA>>` y un `nuevaCuenta` de prueba (un BP numérico, DU2):
  - anotar el valor del atributo antes;
  - llamar LAN y luego ServicioSAP (token de `login/auth`);
  - anotar el valor después y **restaurarlo** al final.
- Es una escritura sobre un cliente real, así que necesita el visto bueno del usuario.
- **Criterio.** Los dos responden 200 `"true"`, `customer_credit_account` queda con el valor enviado y el request y response quedan anotados.

Tareas compartidas: **T1.C-01** (R11, R13), **T1.C-02** (R2, R18, R22) y T1.H-01 (MAM:34). Manual y Hoppscotch: T1.0-DOC.

#### 3.7.6 Preguntas

CQ23, CQ24, CQ25 y CQ26 (§5).

#### 3.7.7 Bloqueos

| Bloqueo | Dueño | Frena |
|---|---|---|
| B1: consumidor desconocido; no se puede cortar ni deprecar | Diego (CSV) con el administrador del IIS de LAN (CQ23) | Apagar LAN para esta ruta |
| B2: no hay cliente de prueba acordado para la escritura positiva | Usuario / equipo Magento (CQ25); Diego la corre | T1.7-01 |

---

### 3.8 Tareas compartidas de las listas (1.2, 1.3, 1.4)

**T1.L-01 · BLOQUEADO_EQUIPO (CQ16) · Fuente de `SpListaNBMagento` y DDL de las listas**
- Sin código. Conseguir `sp_helptext SpListaNBMagento` de DEVMAVI (SIGMavi), o el script del repo MaviSAP, rama `SpVTASListaNBMagento`. Además: `CREATE TABLE` de ListaNegra y ListaBlanca (tipos y anchos de `Correo`, `Nombre`, `Direccion`, `IdMagento`), la collation de la BD y de la columna, y **los triggers** de las dos tablas (en SIGMavi y en IntelisisTmp).
- Guardarlo en `SPsOrden\` junto a LNB y comparar rama por rama con LNB:23-30 y :34-122:
  - la **firma y el orden** de los 8 parámetros (R4 de 1.2);
  - dedup de Negra (R13); Negra borra de Blanca (R14); Blanca exige no estar en ninguna (R15);
  - que no quede el chequeo contra `cte`;
  - anchos (R17, R18) y el mapeo `Cliente` → `IdMagento` (R16);
  - el tipo de `IdMagento` (R23);
  - que Consultar use `WHERE Correo=@Correo` con NOLOCK (1.3-R10);
  - que Eliminar sea exactamente `DELETE ListaBlanca WHERE Correo=@Correo`, sin SELECT ni Negra (1.4-R8, R9, R4).
- **Criterio.** El texto del SP y el DDL están en el vault con su fuente. Cada regla citada pasa a EQ, o a DIF con archivo:línea del script nuevo. Las diferencias de ancho o collation se reportan al usuario.

**T1.L-02 · DECISION (CQ12) · Rama de error de `blackwhitelistAsync` (1.3-R12, 1.4-R12)**
- **Opción A (replicar LAN, recomendada):** en SCUM:64-68, conservar la línea de `Logger.SAP` (SCUM:66-67) y agregar `throw;` después. Sin parámetros ni variables nuevas (§1.9).
- **Efecto medido contra LAN:**
  - **get:** SCC:59-77 no tiene try → 500 → DMZ 400, como LAN (LCUM:162-164; LCC:55-77).
  - **delete:** SCC:81-88 no tiene try → 500 → DMZ 400, como LAN (LCC:81-87). También cierra una diferencia de la rama de error que GUIA §3.1 no cubre: su refutación solo habla del valor de éxito (GUIA:369).
  - **set:** el catch de su acción (SCC:50-54 → `Ok()`) pasa a comportarse igual que LAN (LCC:46-50 → `Ok()`): de 200 `""` a 200 sin contenido. Magento sigue viendo `Correcto` (DCC:70-74). `ValidarClienteEnSapAsync` no cambia: tiene su propio try (SCUM:84-96).
- **Opción B:** mantener el silencio como desviación aprobada y cerrar sin código.
- **Lo que el usuario tiene que ver para decidir:**
  - La decisión de opacidad del 2026-08-07 (E-02:116), extendida a delete por referencia (E-04:83; EP:332), supone que LAN es opaco. Eso es cierto para set y **falso para get y delete**, donde LAN daba 500 y el DMZ 400.
  - DU5 y GUIA §1.9 dicen replicar.
  - GUIA §1.5 (GUIA:168-170) y PLAN_FABLE:65 dicen que ServicioSAP responde 200 con el resultado de negocio. Una falla de BD no es un resultado de negocio, y la única señal de error del DMZ es el texto `Internal Server Error` (DCC:89, :107), que solo produce un 500.
  - A es la única forma de conservar la señal "BD caída → 400" sin inventar un literal nuevo, que §1.9b prohibiría.
  - En get, B deja pasar como limpio un correo en lista negra mientras SIGMavi está caído.
- **Criterio (A).**
  - V1 en verde; el camino feliz sin cambio (`black`, `white`, `No esta en listas`; `""` en set y delete).
  - Con SIGMavi inalcanzable o el SP renombrado en una copia de dev: get y delete dan 500 en ServicioSAP y 400 en el DMZ, y el error sigue en sap.log.
  - set da 200 sin contenido en ServicioSAP y `Correcto` en el DMZ.
  - Commit propio si se pide.
- **Aplicado el 2026-10-05 (S3), opción A (CQ12 "Option A"):** SCUM:68 `throw;` después de `Logger.SAP` (SCUM:66-67). Una línea; sin E2E (la hace el usuario en S6); compila el usuario. Efecto: 1.3-R12 y 1.4-R12 → EQ-R, 1.2-R19 → EQ. Las citas SCUM a partir de :69 de este documento quedan corridas +1 (`ValidarClienteEnSapAsync` SCUM:75-98; filtro SCUM:82-83; su catch SCUM:92-97).

**T1.L-04 · PRERREQUISITO (CQ17) · Carga de producción de las listas en SIGMavi**
- Sin código y sin bloquear el cierre del paquete (DEV3:495; GUIA §8.6).
- Los DBA copian `VTASCListaNegra`/`VTASCListaBlanca` de IntelisisTmp a ListaNegra/ListaBlanca de SIGMavi (`Cliente` → `IdMagento`) **en la misma ventana** en que se despliega ServicioSAP y luego el DMZ, para que no quede ninguna fila en IntelisisTmp después de la copia.
- Antes de cargar, comparar los anchos de `Correo` (1.3-R18), no solo los conteos.
- **Criterio.** Los conteos y el conjunto de correos coinciden al cortar. Un `getCustomerList` posterior sobre un correo que estaba en la lista negra de Intelisis devuelve `black`.

---

### 3.9 Tareas compartidas de las cuentas (1.6, 1.7)

**T1.C-01 · DECISION (CQ24) · Rama de error de `getCuenta` y `setCuenta` (1.6-R14, R16, R17; 1.7-R11, R13)**
- **Opción A (recomendada hasta conocer al consumidor):** aceptar la diferencia y anotarla en E-11 y E-12 (con T1.0-DOC). ServicioSAP da 500 después de los reintentos donde LAN daba 200 con `e.Message`.
- **Opción B1:** en MAM, construir `new Curl(maxRetries: 1)` con los parámetros que ya existen (SCURL:19) y envolver `PostAsync` (MAM:24-25, :34-35) en un try/catch que devuelva `ex.Message` para responder 200.
  - **No es paridad exacta.** ServicioSAP se autentica dentro de `PostAsync` (SCURL:81), así que ese catch también se traga el fallo del login y da 200 donde LAN da 500 (LCURL:25-39 contra :82-108). Rompería 1.6-R15 / 1.7-R12.
  - El texto tampoco coincide con la WebException de LAN.
- **Opción B2:** distinguir el fallo del login del fallo de datos cambiando el `Curl` compartido (H-03, que también usan MagentoCatalogMethods, MagentoOrderMethods y OrderStatusMethods). Es un miembro nuevo: aprobación del usuario (§1.9b).
- **Rechazada:** comparar por el prefijo `DMZ token HTTP` (SCURL:60). Es frágil y no ve los errores de red del login.
- **Criterio.** La decisión queda registrada en §5. Con B1 o B2, una E2E con el DMZ inalcanzable da el resultado acordado, el camino feliz no cambia y V1 queda en verde.
- **2026-10-05 (S3):** CQ24 sin respuesta (el usuario pidió más explicación). No se aplicó ninguna opción; MAM y SCURL sin cambio por esta tarea; sigue DECISION.

**T1.C-02 · BLOQUEADO_EQUIPO (CQ23) · Consumidor de las rutas LAN-only y su corte**
- Revisar los logs IIS de LAN buscando `POST /customer/getCuenta`, `/customer/setCuenta` y `/login/authenticate` (IP, user-agent y fechas).
- **Si hay consumidor,** repuntarlo al host de ServicioSAP, con `login/auth` en lugar de `login/authenticate` y las credenciales de ServicioSAP (1.6-R2, 1.7-R2, 1.7-R22). No hay cambio en el DMZ.
- **Si no hay llamadas** en la ventana acordada, se deja como está: las rutas se mantienen por la decisión del 11 de agosto (`_PLAN_MIGRACION_FECHAS.md`:160). Mantener o deprecar ya no se pregunta, salvo que el usuario lo reabra.
- **Criterio.** El consumidor tiene nombre y ya pasó a ServicioSAP, con los logs IIS de LAN en 0 para esas rutas. O la ventana sin llamadas queda documentada.

---

### 3.10 Tareas transversales

**T1.H-01 · LISTO (opcional, higiene; GUIA §8.1:521) · `ConfigureAwait(false)` en `Methods/` (GUIA §1.6)**
- **Cambio.** Agregar `.ConfigureAwait(false)` a los `await` de:
  - SCUM:21, :33, :52, :56, :88;
  - CRM:67;
  - MAM:24 y :34 (hoy `await curl.PostAsync(…)` sin él).
- Sin cambio de lógica ni de contrato. Es seguro: el código de `Helpers` solo usa `HttpContext` en `TokenValidationHandler.cs:66`, y `Logger` no lo usa.
- No bloquea el cierre ("verificar, no construir", PLAN_FABLE:88-90). Va en un commit propio, separado de T1.2-02 y T1.L-02.
- **Criterio.** V1 en verde, los tres archivos en `w/crlf` y sin BOM, y las E2E de S6 sin cambio.

**T1.0-DOC · DECISION (CQ26) · Correcciones del CSV y de los documentos (SKILL 23; se aplica solo lo aprobado)**
- **CSV:** las correcciones de §2.1.
- **Contratos:**
  - E-02:87, :89 y E-03:68, :74, :86: estado real, citando DCC:88 y DCURL:61-90, y el matiz de ramas de §2.2.
  - E-04:59-63, :83 y E-11:77, :119, :121-123.
  - E-12:79, :98, :101-103 y E-13:88-92: cambiar la razón, no la regla.
- **Auditoría:** marcar AUD C24 como refutado (AUD:579-590).
- **Pruebas:** anotar en EP:364/:395 que no prueban R15.
- **GUIA:547 (§8.2):** cerrar con SIGMavi (ODS:74), si el usuario lo confirma (CQ17).
- **Análisis por endpoint:** `Post_SetCustomerList_Mapping.md`:35, :70 y `Post_DeleteCustomerList_Mapping.md`:43.
- **Estado y análisis previos:** `_ESTADO_REAL_EN_SERVICIOSAP.md`:126, :128, :129; `_ENDPOINTS_NoSAP.csv`:30; `DMZ-Backlog-Migracion-SAP.md`:205; `MAPEO-endpoints-flujo-y-responses.md`:597-599; `BRIEFING-migracion-18-endpoints.md`:892.
- **CML:143:** anotar que no está en el código.
- **Manual y Hoppscotch:**
  - `Manual TecnicoServicio SAP 31082026.md`:3473 (GET → POST) y :3475-3478 (body `CustomerIntelisis`).
  - `collectionhoppscotch 15092026.json`: la petición de setCuenta pasa a `<<LANLocal>>customer/setCuenta`, porque es la colección de LAN (sus variables están cerca de :2570-2600).
  - Agregar un POST `customer/setCuenta` (y `getCuenta` si falta) a `ServicioSapHoppscotch_Mejorado.json` y a `Servicios SAP y Middleware (Unificado).json` con `<<SAP>>` (`ServicioSapHoppscotch_Entorno.json`:6).
  - Anotar que `Tests\ServicioSap.Ola6.http` no existe (`.gitignore`:293).
- **No se editan:** las fuentes retiradas (GUIA §9) ni `MAVIDMZSAPConexiones.csv` (informativo).
- **Criterio.** Cada edición tiene aprobación, conserva el texto anterior tachado o con nota de corrección (SKILL 23) y deja los `.md` sin BOM y con CRLF.

**T1.0-DEP · BLOQUEADO_EQUIPO (CQ27) · Fusión y despliegue**
- Fusionar a las ramas de pase:
  - en ServicioSAP, `a0f1017`, `4315c50` y las tareas de este paquete;
  - en el DMZ, `740669e`, `4dabaa9` y `e403065`.
- Desplegar **primero ServicioSAP y después el DMZ** (§2.2), en la misma ventana que T1.L-04.
- **Criterio.** `git show <rama de pase>:WebApiMagento/Controllers/CustomersController.cs` muestra las 5 líneas con `PostSAP`. El DMZ desplegado incluye `4dabaa9`. Hay una E2E de humo por ruta en el ambiente.

---

## 4. Sesiones Fable para este controlador

### 4.0 Orden

1. **SOLO_CONECTAR_DMZ (victorias rápidas): no hay en este controlador.** Las 5 rutas del DMZ ya usan `PostSAP` y las 2 LAN-only no tienen ruta DMZ (§1.3). Por eso se empieza directamente por CORREGIR.
2. **CORREGIR con tareas LISTO:** S1 (Marcos) y S2 (Diego). Pueden correr en paralelo porque tocan archivos distintos (S1: SBPC y BPM; S2: SCUM, CRM y MAM).
3. **El usuario contesta §5** y corre las lecturas previas (paso 0 de T1.1-09, E2E previa de T1.2-02, captura del payload de Magento de CQ10).
4. **CORREGIR por decisión:** S3 (Diego) y S4 (Marcos).
5. **CONSTRUIR:** S5 (Marcos), la búsqueda y actualización del BP.
6. **E2E:** S6 (el usuario ejecuta y Fable prepara y compara). Las E2E de listas, cash y cuentas que no dependen de T1.L-02, T1.5-04 o T1.C-01 pueden correr en cuanto termine S2.
7. **Cuando respondan los equipos:** S7.

**Reglas de sesión.** Una sesión = una S; nunca el paquete entero (PLAN_FABLE, "Para qué existe este documento"). Cada sesión termina actualizando §1.4 (estado y fecha), las filas de §3 que cambian y la columna "Respuesta" de §5. Si se alarga, termina la tarea en curso, actualiza el tablero, reporta y sigue en una sesión nueva con el mismo prompt.

**Abrir la sesión.** En la app de escritorio de Claude, abrir **Claude Code**, crear una sesión nueva con carpeta de trabajo `C:\BackEndEcommerce` (una carpeta local: la app no acepta `\\172.16.214.58\sap` como carpeta de trabajo, pero la sesión lee y escribe el share con rutas completas. Las reglas no vienen de memoria: están en PLAN_FABLE_POR_CONTROLADOR.md, "Reglas vigentes de las sesiones Fable — 2026-10-05"), elegir **Fable 5.1** con esfuerzo **xhigh** (o High si se prefieren turnos cortos) y dejar el modo de permisos que pide confirmación antes de editar y ejecutar.

> [!important] **Reglas vigentes 2026-10-05** (PLAN_FABLE_POR_CONTROLADOR.md, "Reglas vigentes de las sesiones Fable"): prevalecen sobre los prompts de abajo. Código actual de `SpExportaEcommerce` sin commit fijo; Fable no compila (lo hace el usuario), no hace commit y no prepara ni corre pruebas; solo edita Business Rules Ecommerce y el tablero de esta spec; T1.1-02 quedó en DECISION: `Fiscalregimen` sigue vacío hasta que confirme el dueño fiscal (D-14 reabierta); el filtro `ZidMagento` va sin comillas (D-15).

### 4.1 S1 · Marcos · CORREGIR (LISTO) `setCustomer`

Tareas: T1.1-01 y T1.1-02 (FiscalRegimen `605` como LAN, decisión D-14 del 2026-10-05). Sin compilación ni pruebas de Fable (reglas vigentes 2 y 6).

```text
Esta sesión es S1 del paquete 1 (CustomersController), desarrollador Marcos, y solo S1.
Antes de todo: aplica las "Reglas vigentes de las sesiones Fable (2026-10-05)" de PLAN_FABLE_POR_CONTROLADOR.md; prevalecen sobre este prompt.

Lee completos, en este orden:
1. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\SKILL.md
2. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\GUIA_MIGRACION_FABLE.md §0-§2, §1.8, §1.9, §3.1 y §9b
3. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\PLAN_FABLE_CONTROLADORES\01_CustomersController.md §0, §1.4, §3.1 completo y §4.1
4. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\Business Rules Ecommerce.md: la sección "Cómo mantener este documento" y el bloque "POST /partner/client"

Objetivo: aplicar T1.1-01 y T1.1-02 exactamente como están en §3.1.5, con el código sin errores de compilación (lo compila el usuario).

Reglas:
- Primero verifica el estado: el código actual de la rama SpExportaEcommerce, sin buscar un commit fijo (si SBPC o BPM tienen cambios sin commit, detente y repórtalo), y que SBPC:48 dice "return Ok(result);" y BPM:578 dice "Fiscalregimen = \"\",". Si algo no cuadra, detente y repórtame.
- Replicar, no mejorar (GUIA §1.9): ningún miembro, variable, parámetro ni constante que la tarea no nombre. La guarda de Partner vacío NO va en esta sesión (es T1.1-01b, DECISION).
- DU2: no mapees cuentas C…. DU1: no marques credenciales ni URLs de Dev y nunca imprimas valores del Web.config.
- No toques el DMZ, ni PATCH partner/client, ni ninguna tarea DECISION.
- Después de cada Edit: restaura CRLF conservando el BOM (BPM tiene BOM, SBPC no) y comprueba git ls-files --eol = w/crlf. git siempre con -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP".
- No compiles ni copies el proyecto: deja el código sin errores; lo compila el usuario en Visual Studio.
- No hagas commit. No ejecutes SQL, no llames endpoints, no crees BP. No prepares pruebas ni requests de prueba: las hace el usuario.
- El código del share manda sobre los documentos.

Al terminar:
1. Actualiza en 01_CustomersController.md el tablero §1.4 (T1.1-01 y T1.1-02 → HECHO con fecha) y las filas 1.1-R8 y 1.1-R20 de §3.1.3 (estado "HECHO sin E2E"). El .md queda sin BOM y con CRLF.
1b. Actualiza en Business Rules Ecommerce.md el bloque "POST /partner/client" y su repetición en "Pendientes globales" (D-16 del 2026-10-05) (respuesta: el número de BP en lugar del Client completo) y sus citas archivo:línea, según "Cómo mantener este documento" (decisión X-1 del 2026-10-02). Sin BOM y con CRLF.
2. Dime qué cambiaste (archivo:línea) y qué queda pendiente.
3. Repórtame git status, git diff --stat, el git diff de SBPC y BPM y git ls-files --eol.
```

### 4.2 S2 · Diego · CORREGIR (LISTO) higiene + kits de prueba

Tareas: T1.H-01 (solo .ConfigureAwait(false)). Sin kits de prueba: las pruebas las hace el usuario (D-17 del 2026-10-05).

```text
Esta sesión es S2 del paquete 1 (CustomersController), desarrollador Diego, y solo S2.
Antes de todo: aplica las "Reglas vigentes de las sesiones Fable (2026-10-05)" de PLAN_FABLE_POR_CONTROLADOR.md; prevalecen sobre este prompt.

Lee completos, en este orden:
1. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\SKILL.md
2. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\GUIA_MIGRACION_FABLE.md §0-§2, §1.6, §1.9 y §9b
3. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\PLAN_FABLE_CONTROLADORES\01_CustomersController.md §0, §1.4, §3.2 a §3.10 y §4.2

Objetivo: aplicar T1.H-01 (§3.10) exactamente, con el código sin errores de compilación (lo compila el usuario).

Reglas:
- Verifica primero: en el código actual de la rama SpExportaEcommerce, sin buscar un commit fijo, que las líneas citadas en T1.H-01 (SCUM:21, :33, :52, :56, :88; CRM:67; MAM:24, :34) siguen siendo esos await. Si no cuadra, detente.
- Solo .ConfigureAwait(false). Nada de throw;, codificación de URL, Path.GetFileName ni cambios en Logger o Curl: son DECISION (T1.L-02, T1.2-02, T1.5-03, T1.5-04, T1.C-01).
- Después de cada Edit: CRLF conservando el BOM (SCUM, CRM y MAM no tienen BOM) y git ls-files --eol = w/crlf; git con -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP".
- No compiles (lo hace el usuario en Visual Studio). Sin commit.
- No ejecutes SQL ni endpoints, ni escribas en SIGMavi, Magento o el share. Solo preparas.
- En los kits, solo marcadores (<<SAP>>, <<DMZ>>, <<LAN>>, <<jwt_…>>, <<CORREO_PRUEBA>>@example.invalid, <<BP_PRUEBA>>, <<ID_CLIENTE_MAGENTO_PRUEBA>>). Nada de datos personales ni secretos.

Al terminar:
1. Actualiza §1.4 (T1.H-01 → HECHO con fecha). El .md sin BOM y con CRLF.
2. Dime qué cambiaste (archivo:línea).
3. Dame redactadas, para mandarlas, las preguntas de §5 que son de Diego o de otros equipos (CQ12-CQ27).
4. Repórtame git status, git diff --stat, el git diff de SCUM, CRM y MAM y git ls-files --eol.
```

### 4.3 S3 · Diego · CORREGIR por decisión (listas, cash y cuentas)

Tareas, solo las que el usuario haya contestado en §5: T1.L-02 (CQ12), T1.2-02 (CQ13, después de su E2E), T1.2-04 (CQ15, solo documento), T1.5-03 (CQ20), T1.5-04 (CQ21) y T1.C-01 (CQ24).

```text
Esta sesión es S3 del paquete 1 (CustomersController), desarrollador Diego, y solo S3.
Antes de todo: aplica las "Reglas vigentes de las sesiones Fable (2026-10-05)" de PLAN_FABLE_POR_CONTROLADOR.md; prevalecen sobre este prompt.

Lee SKILL.md, GUIA_MIGRACION_FABLE.md §0-§2, §1.5, §1.8b, §1.9 y §9b, y de PLAN_FABLE_CONTROLADORES\01_CustomersController.md: §0, §1.4, §3.2.5, §3.3, §3.4, §3.5.5, §3.8, §3.9, §5 y §4.3.

Mis respuestas (textuales):
<pega aquí: "CQ12 = A", "CQ13 = sí (E2E del <fecha>: con '+' no insertó)", "CQ15 = aceptar", "CQ20 = …", "CQ21 = …", "CQ24 = …">

Objetivo: registrar cada respuesta y aplicar solo las opciones elegidas, tal como están escritas en §3, en este orden: T1.L-02 → T1.2-02 → T1.5-03 → T1.5-04 → T1.C-01. T1.2-04 solo toca documentación.

Reglas:
- Antes de tocar código, escribe cada respuesta en la columna "Respuesta del usuario" de §5 con mis palabras y la fecha.
- Si una respuesta no coincide con una opción escrita, o la opción necesita algo que no está escrito (un miembro, una variable, un literal), detente y pregúntame.
- Replicar, no mejorar (GUIA §1.9). T1.5-04 opción B y T1.C-01 opción B2 tocan helpers compartidos (Logger, Curl): solo si lo aprobé explícitamente, y cada uno solo.
- No toques el DMZ ni el wrapper compartido GetFilterClientsAsync (BPM:252).
- CRLF + BOM después de cada Edit; chequeo rápido tras cada tarea; MSBuild al final; sin commit (si lo pido, un commit por tarea).
- No ejecutes SQL ni endpoints. Nada de secretos.

Al terminar:
1. Actualiza §1.4, las reglas afectadas de §3 (1.2-R9, 1.2-R11, 1.3-R12, 1.4-R12, 1.5-R4, 1.5-R9, 1.5-R10, 1.6-R14, 1.7-R11…) y §1.1 si cambia el "Trabajo requerido".
2. Ajusta los valores esperados de los kits de S6 (casos de falla de T1.3-01 y T1.4-01, (a) de T1.5-01, caso 8 de T1.6-01) a lo decidido.
3. Repórtame git status, git diff --stat, el git diff, V1 y git ls-files --eol.
```

### 4.4 S4 · Marcos · CORREGIR por decisión `setCustomer`

Tareas, solo las contestadas: T1.1-01b opción A (CQ8 = A; con B va en S5), T1.1-04 (CQ1 y el payload de CQ10), T1.1-05 (CQ7), T1.1-06 (CQ4), T1.1-07 y T1.1-08 (CQ5, CQ6; juntas), T1.1-10 (CQ9) y T1.1-11 (CQ4).

```text
Esta sesión es S4 del paquete 1 (CustomersController), desarrollador Marcos, y solo S4.
Antes de todo: aplica las "Reglas vigentes de las sesiones Fable (2026-10-05)" de PLAN_FABLE_POR_CONTROLADOR.md; prevalecen sobre este prompt.

Lee SKILL.md (reglas 12, 17, 19, 28), GUIA_MIGRACION_FABLE.md §0-§2, §1.5, §1.7, §1.8, §1.9 y §9b, y de PLAN_FABLE_CONTROLADORES\01_CustomersController.md: §0, §1.4 (choques), §3.1 completo, §5 y §4.4. Lee también CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md §6.3.6 (P5) y §6.3.15 (P14): Marst NO se decide aquí.

Mis respuestas (textuales):
<pega aquí: "CQ1 = …", "CQ4 = …", "CQ5 = …", "CQ6 = …", "CQ7 = …", "CQ8 = …", "CQ9 = …", y el payload real de Magento de CQ10 con datos anonimizados>

Objetivo: registrar las respuestas y aplicar solo lo elegido, en este orden: T1.1-05 → T1.1-04 → T1.1-06 → T1.1-11 → T1.1-07 + T1.1-08 → T1.1-01b (solo si CQ8 = A) → T1.1-10.

Reglas:
- Antes de tocar código, escribe cada respuesta en §5 con mis palabras y la fecha.
- Si una opción necesita algo no escrito (un literal, un miembro, una llave), detente y pregúntame. Sntz va en Methods\Utils\ con el nombre de LAN y se registra en ServicioSap.csproj (regla 19).
- DU5: cada campo con el valor que guardaban LAN + SP, según la opción elegida. Cada cambio de valor hacia SAP en su propio commit si pido commit (GUIA §1.8b).
- No importes la semántica de DeterminarSalesOrg (override y default 04) al flujo de setCustomer (T1.1-07).
- No toques el DMZ, PATCH partner/client ni la búsqueda o actualización (eso es S5).
- BPM tiene BOM: consérvalo. CRLF después de cada Edit; chequeo rápido tras cada tarea; MSBuild al final; sin commit; no crees BP ni llames endpoints.

Al terminar:
1. Actualiza §1.4 y §3.1.3 (reglas R2, R3, R4, R9-R11, R14, R15, R22, R25 según lo aplicado).
2. Actualiza el kit de T1.1-09 con los valores esperados nuevos por caso.
3. Repórtame git status, git diff --stat, el git diff, V1 y git ls-files --eol.
```

### 4.5 S5 · Marcos · CONSTRUIR la búsqueda y actualización del BP

Tareas: T1.1-01b opción B (el orquestador `SetCustomerAsync`) + T1.1-03. Requisitos: el paso 0 de T1.1-09 en verde (BP05 filtra por `ZidMagento` y `Mail`), CQ2, CQ3 y CQ8 = B contestadas, y T1.1-04 y T1.1-05 decididas.

```text
Esta sesión es S5 del paquete 1 (CustomersController), desarrollador Marcos, y solo S5: construir la búsqueda del BP existente que LAN hacía en SP_eCommerceCtenuevo.
Antes de todo: aplica las "Reglas vigentes de las sesiones Fable (2026-10-05)" de PLAN_FABLE_POR_CONTROLADOR.md; prevalecen sobre este prompt.

Lee SKILL.md (reglas 6, 12, 13, 17, 19, 20, 28, 32), GUIA_MIGRACION_FABLE.md §0-§2, §1.4, §1.8, §1.9 y §9b, y de PLAN_FABLE_CONTROLADORES\01_CustomersController.md: §0, §3.1.2 pasos 8 y 13, §3.1.3 (R5, R19, R20), §3.1.5 T1.1-01b y T1.1-03 (condiciones a-e), §5 y §4.5.

Resultado del paso 0 de T1.1-09 (lo corrí yo): <pega los dos responses, anonimizados>
Mis respuestas: <pega "CQ2 = …", "CQ3 = …", "CQ8 = B">

Objetivo: crear SetCustomerAsync en Methods\BusinessPartner (nombre de la ruta del DMZ), que busca → devuelve el existente o crea → aplica la guarda de Partner vacío → devuelve Partner.Trim(). Que el controlador SBPC solo lo llame. Aplicar la actualización parcial solo si CQ2 la aprobó, y solo con los campos aprobados.

Reglas:
- Las condiciones (a)-(e) de T1.1-03 son obligatorias: normalización del correo igual que el alta; escapar y codificar solo el valor (no toques BPM:252); crear solo si el mensaje interno es "No se encontraron clientes" y abortar ante cualquier otro error; la regla de CQ2 para varios BP; y nada de borrar dirección salvo que CQ2 lo pida.
- Reutilizar EscapeSapFilterValue (privado en OrderMethods) solo con mi aprobación; si no, pregúntame antes de escribir un escape.
- Ningún miembro fuera de SetCustomerAsync y lo que T1.1-03 nombra. El payload parcial de actualización: pregúntame el shape exacto antes de escribirlo si no está en RSG/bp01_bp02_maestro.md.
- async/await con ConfigureAwait(false) en Methods/, nunca en Controllers/. Un HttpClient por petición a S4 (regla 32).
- BPM con BOM. CRLF después de cada Edit; chequeo rápido; MSBuild; sin commit; no crees BP ni llames endpoints.

Al terminar:
1. Actualiza §1.4 (T1.1-01b, T1.1-03 → HECHO sin E2E), §3.1.3 (R5, R19, R20) y §1.1 (Generado 1.1 → "Si (pendiente E2E)").
2. Prepárame los casos de T1.1-09 de idempotencia, invitado, cambio de perfil y error en la búsqueda, con los valores esperados.
3. Repórtame git status, git diff --stat, el git diff, V1 y git ls-files --eol.
```

### 4.6 S6 · Marcos y Diego · E2E (el usuario ejecuta)

Tareas: T1.1-09, T1.2-01, T1.2-02 (después del cambio), T1.2-03, T1.3-01, T1.4-01, T1.5-01, T1.5-02, T1.6-01 y T1.7-01. Se puede partir en S6-M (setCustomer) y S6-D (el resto).

```text
Esta sesión es S6 del paquete 1 (CustomersController): E2E de <Marcos: T1.1-09 | Diego: T1.2-01, T1.2-02, T1.2-03, T1.3-01, T1.4-01, T1.5-01, T1.5-02, T1.6-01, T1.7-01>.
Antes de todo: aplica las "Reglas vigentes de las sesiones Fable (2026-10-05)" de PLAN_FABLE_POR_CONTROLADOR.md; prevalecen sobre este prompt.

Lee SKILL.md (reglas 14 y 25) y de PLAN_FABLE_CONTROLADORES\01_CustomersController.md: §0.6, §1.4, la sección §3 de cada tarea (proceso LAN, contrato de respuesta y criterio) y §4.6.

Objetivo: guiarme paso por paso. Tú preparas cada request, SELECT y valor esperado; yo ejecuto y te pego el resultado; tú comparas y documentas.

Reglas:
- No ejecutes nada contra servidores: ni SQL, ni endpoints, ni el share. Cada escritura (alta de BP, inserción en SIGMavi, setCuenta en Magento, archivo en el share) la apruebo yo antes, caso por caso.
- En el vault, solo marcadores (<<BP_PRUEBA>>, <<CORREO_PRUEBA>>@example.invalid…). Nada de datos personales ni secretos.
- Si un valor no coincide con lo esperado, repórtamelo con la evidencia; no lo ajustes por deducción (GUIA §2.2).
- Documenta cada par request/response y cada ID en Resources/master_test_plan.md, sin datos personales.

Al terminar: marca cada tarea en §1.4 (HECHO, o el caso que falló), pasa a EQ o DIF las reglas PENDIENTE que la prueba cierre y revisa el criterio de cierre de §4.9.
```

### 4.7 S7 · Cuando respondan los equipos

Tareas: T1.L-01 (llegó el SP o el DDL), T1.C-02 (llegaron los logs IIS), T1.0-DEP (fusión y despliegue) y T1.0-DOC (ediciones aprobadas).

```text
Esta sesión es S7 del paquete 1 (CustomersController), desarrollador <Diego|Marcos>: incorporar lo que entregaron otros equipos.
Antes de todo: aplica las "Reglas vigentes de las sesiones Fable (2026-10-05)" de PLAN_FABLE_POR_CONTROLADOR.md; prevalecen sobre este prompt.

Lee SKILL.md (regla 23), GUIA_MIGRACION_FABLE.md §2 y §8.6, y de PLAN_FABLE_CONTROLADORES\01_CustomersController.md: §0, §1.4, §2, §3.8, §3.9, §3.10 y §4.7.

Entregas (textuales, con quién y fecha):
<pega: sp_helptext de SpListaNBMagento / DDL y triggers / resumen de los logs IIS de LAN / ramas fusionadas / ediciones aprobadas de T1.0-DOC>

Objetivo: comparar el SP y el DDL regla por regla (T1.L-01), registrar el consumidor y su corte (T1.C-02), verificar las ramas de pase (T1.0-DEP, solo lectura con git show) y aplicar solo las ediciones de documentos que aprobé (T1.0-DOC).

Reglas:
- Guarda el SP y el DDL en SPsOrden\ con su fuente citada. Cada regla (1.2-R4, R13-R17, R23; 1.3-R10, R18; 1.4-R4, R8, R9) pasa a EQ, o a DIF con archivo:línea.
- En documentos ajenos: sin borrar texto; corrección con nota y fecha (SKILL 23). .md sin BOM y con CRLF.
- git solo lectura con -c safe.directory. Sin commit. No ejecutes SQL.

Al terminar: actualiza §1.1, §1.4, §3 y §5, y repórtame qué quedó cerrado y qué sigue abierto, con su dueño.
```

### 4.8 Cómo revisar el trabajo de una sesión

1. **Ver qué cambió:**
   ```powershell
   $g = 'git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP"'
   Invoke-Expression "$g status --short"
   Invoke-Expression "$g diff --stat"
   Invoke-Expression "$g ls-files --eol -- ServicioSap/ServicioSap/Controllers/BusinessPartnerController.cs ServicioSap/ServicioSap/Methods/BusinessPartner/BusinessPartnerMethods.cs ServicioSap/ServicioSap/Methods/Customer/CustomerMethods.cs ServicioSap/ServicioSap/Methods/Customer/CashReportMethods.cs ServicioSap/ServicioSap/Methods/Customer/MagentoAccountMethods.cs"
   ```
   Antes de S1, guardar el diff base (`git diff > C:\temp\customers_base_2026-09-30.diff`). Los 4 archivos del crédito ya están modificados y no son de este paquete.
2. **Contra LAN:** por cada hunk, abrir la línea de LAN o del SP que cita la tarea y confirmar que hace lo mismo. Comprobar que el diff tiene solo las líneas de la tarea (T1.1-01 = 1 línea, T1.1-02 = 1 línea, T1.L-02 = 1 línea), que no apareció ningún miembro, parámetro, variable o log no pedido, que `w/crlf` y el BOM quedaron como estaban, que MSBuild está en verde y que no hubo commit.
3. **Sesión revisora** (otro modelo o sesión, solo lectura):
   ```text
   Revisa el trabajo de la sesión S<n> del paquete 1 (CustomersController). Lee PLAN_FABLE_CONTROLADORES\01_CustomersController.md §3 (las tareas de S<n>) y GUIA_MIGRACION_FABLE.md §1.9.
   Compara C:\temp\customers_base_2026-09-30.diff contra el git diff actual de \\172.16.214.58\sap\ServicioSAP (usa -c safe.directory).
   Para cada tarea dime: si el cambio es exactamente el de la spec, si coincide con la línea de LAN/SP citada, si se agregó algo no pedido y si el EOL quedó w/crlf con el BOM intacto. Solo lectura: no edites nada.
   ```
4. **Si Fable propone una "mejora":** se rechaza con GUIA §1.9. Respuesta sugerida: "No. Por GUIA §1.9 esto se replica igual que LAN + SP. Si crees que es un defecto real, anótalo en §5 como pregunta nueva con archivo:línea y sigue."

### 4.9 Criterio de cierre del paquete

- [ ] Cada tarea de §1.4 está en HECHO, cerrada por una decisión documentada en §5, o anotada como BLOQUEADO_EQUIPO/PRERREQUISITO con su dueño.
- [ ] `setCustomer` devuelve el número de BP como cadena JSON (T1.1-01) y no crea duplicados (T1.1-03, o la decisión contraria registrada).
- [ ] Cada ruta: el contrato de salida es el de LAN (GUIA §3.2), el puente del DMZ usa `PostSAP` (ya se cumple) y los `.cs` nuevos están en CSPROJ.
- [ ] MSBuild en verde; `w/crlf` y BOM intactos en todo archivo tocado; sin commit salvo pedido.
- [ ] E2E por ruta con request y response exactos en `Resources/master_test_plan.md`, sin datos personales (SKILL 25): T1.1-09, T1.2-01, T1.3-01, T1.4-01, T1.5-01, T1.6-01 y T1.7-01.
- [ ] §1.1 al día: Conectado/Generado verificados, conteos de reglas y "Trabajo requerido" final.
- [ ] Lo que queda afuera tiene dueño: T1.L-01, T1.L-04, T1.C-02 y T1.0-DEP.

---

## 5. Preguntas para el usuario (consolidadas)

Una sola lista para todo el paquete. La recomendación es la del plan; **no se implementa nada hasta que el usuario conteste aquí o en el chat**. Fable copia la respuesta con las palabras del usuario y la fecha antes de tocar código.

| Id | Pregunta | Tareas | Recomendación | Respuesta del usuario (fecha) |
|---|---|---|---|---|
| CQ1 | setCustomer: LAN guardaba `name` como apellido paterno, `lastName` como materno y `lastName2` como nombre(s), todo en MAYÚSCULAS, y el correo en MAYÚSCULAS (LCUM:21-23; CTN:115-118, :133). ¿ServicioSAP copia eso (A), conserva `NameFirst=name` / `NameLast=lastName` / `NameLst2=lastName2` y solo pasa a MAYÚSCULAS (B), o lo deja igual (C)? | T1.1-04 | Decidir después de ver un payload real (CQ10) | "ok but, is theres is a differently names uses, wich do you recomend? i mean because the values in SAP maybe are different" y después "if LAN put in Uppercase, do it the same in SAP to be equal" (2026-10-05). Elegida: **B** de T1.1-04 (se conserva `NameFirst=name` / `NameLast=lastName` / `NameLst2=lastName2`, confirmado por el payload de CQ10, y se pasan a MAYÚSCULAS nombres y correo). Aplicada en S4, sin E2E |
| CQ2 | setCustomer: si ya existe un BP con ese idMagento (o con el correo del invitado): ¿solo se devuelve, o también se actualizan nombres y correo como el SP (con payload parcial)? ¿Se replica el borrado de dirección del SP (CTN:181-187, :193-199), que borraría la dirección del BP? Si hay varios BP con el mismo `ZidMagento` (OM:2802; BPM:835-850), ¿cuál se toma? | T1.1-03 | Devolver el existente y actualizar solo nombres y correo; **no** borrar la dirección; con varios, el `Partner` más reciente | |
| CQ3 | ¿Magento sigue llamando setCustomer para invitados (idMagento 0-2)? Si sí, ¿cada correo de invitado tiene su BP (LAN) o se usa el BP fijo de invitado del flujo de orden (OM:41)? | T1.1-03 | — | |
| CQ4 | setCustomer: LAN no guardaba dirección, teléfono ni fecha (`1900-01-02`) y no creaba contacto. ServicioSAP manda `Street`/`NameCo`, teléfono, `Birthdt`, Region `JAL` y un contacto tipo 20. ¿Se vacían como LAN (A, con `Birthdt = 19000102`) o se conservan (B)? `Marst` se decide en CREDITO P14 | T1.1-06, T1.1-11 | A (DU5), campo por campo si BP01 lo acepta | "sometimes in some api rest SAP need some values bby default to work, but if LAN dosnt put it, if LAN already have let the values like that in this moment, but tell me more about this to define the process" (2026-10-05). Elegida: **B** de T1.1-06 y de T1.1-11: se conservan `Street`/`NameCo`, teléfono, `Birthdt`, `Region = JAL` y el contacto tipo 20; diferencias aceptadas, sin cambio de código (S4). `Marst` sigue en CREDITO P14 |
| CQ5 | ¿Un idMagento vacío, no numérico o desbordado, o un storeCode desconocido o en otra escritura, debe fallar como en LAN en lugar de crear un BP con `ZidMagento 0` y org 04? ¿La tienda `mavi` (UEN 3) sigue en uso y a qué org SAP va? | T1.1-07 | Fallar como LAN, por la rama de T1.1-08 | "idmagento cannot be empty at this point, that is validated before sending the information to the Service, so if for some reason is null, or empty, fail like lan because its arequired field" (2026-10-05). Elegida: solo `idMagento` falla como LAN (`int.Parse`, por el catch actual del controlador). `storeCode`, el resolvedor de organización y `mavi`: sin respuesta, quedan sin cambio. Aplicada en S4, sin E2E |
| CQ6 | Falla de setCustomer: ¿Magento recibe `Incorrecto` (a), 400 vacío como con LAN porque ServicioSAP da 500 (b), o el 200 con el texto `WebException` de hoy (c)? | T1.1-08 | (b); choca con GUIA §1.5, que se reporta | "when some API of sap dosnt finish correctly in the end of the Response there is a field named to_return, as you can see in other services, inside of them we have a message where the responses respond with the message of error, but without broke the flow of the proceess" (2026-10-05). Elegida: opción nueva **(d)**: 200 `"Error, <Message de toReturn>"` cuando BP01 responde sin `Partner`, con la convención de `order/new`; las excepciones siguen por el catch actual. Aplicada en S4, sin E2E |
| CQ7 | ¿Apruebas crear el helper `Sntz` (nombre de LAN) en `Methods\Utils\` para copiar la limpieza de caracteres de LAN? | T1.1-05 | Sí | "and wich is SntZ? i dont remember any field named like that"; tras explicárselo: "if LAN doit replicate in SErvicio SAP but in a better way that do the same thing, theres any possibilitie to do that?" (2026-10-05). Elegida: el diseño de T1.1-05 (`SntzMethods.Sntz` en `Methods\Utils\`, `Regex` estático compilado con el patrón de LAN, 7 campos). Aplicada en S4, sin E2E |
| CQ8 | Guarda de `Partner` vacío: ¿en el controlador como excepción a SKILL 17 (A) o en un orquestador nuevo `SetCustomerAsync` (B)? | T1.1-01b | B | "pero como que tiene que ver que retorne empty? de que estas hablando? si retorna el numero vacio es por que no se creo com ote mencione en la seccion to_return del mensaje suele venir el motivo de por que no se creo, y esa seria la unica manera de que al momento deneviar un BP y no se cree venga vacio ese campo" (2026-10-05). Elegida: se resuelve con la opción (d) de T1.1-08, en el controlador (el lugar de A), sin orquestador ni miembros nuevos; el orquestador `SetCustomerAsync` queda para S5 con T1.1-03. Aplicada en S4, sin E2E |
| CQ9 | ¿Se borra el código muerto del builder (BPM:425-426, :429, :815-829, :455 y el bloque :116-146)? | T1.1-10 | Sí, en commit propio | "el codigo muerto, si eliminalo ya si despues se necesita lo volvemos a poner, solo procura que no se este utilizando en absolutamente ningun lado adicional" (2026-10-05). Aplicada en S4: cada pieza se buscó en todos los `.cs` de la solución antes de borrarla (resultado en T1.1-10) |
| CQ10 | ¿Qué módulo de Magento llama `customer/setCustomer` y lee la cuenta? (en Magento248 app/code no hay llamador). ¿Puedes pasar un payload real anonimizado? | T1.1-04; confirma T1.1-01 | — | Payload real anonimizado (2026-10-05): `{"name": "<<NOMBRE>>", "lastName": "<<APELLIDO_PATERNO>>", "lastName2": "", "dateBirth": "1998-02-25", "email": "<<CORREO_PRUEBA>>@example.invalid", "gender": "H", "phone": "<<TELEFONO_9_DIGITOS>>", "idMagento": "", "storeCode": "", "list": "", "address": "<<DIRECCION>>"}`; el usuario agregó: "but inside the API we have a buildSAP, there is the conversion of the Magento Body to convert for SAP". Confirma que `name` trae el nombre y `lastName` el apellido paterno (por eso CQ1 = B). El módulo de Magento que llama y lee la cuenta sigue sin identificarse |
| CQ11 | Buró (1.1-R17): ¿qué valor de `SeEnviaBuroCreditoMavi` tiene la fila CONTADO de `VentasCanalMAVI`, y se agrega `Katr1` al modelo `Client`? | R17 | — | |
| CQ12 | Listas, rama de error de get/delete: ¿se replica LAN (`throw;`: 500 → DMZ 400) o se mantiene el silencio? La decisión de opacidad del 2026-08-07 (E-02:116) supone que LAN es opaco, y solo lo es en set. En get, el silencio deja pasar como limpio un correo en lista negra cuando SIGMavi está caído. DU5/§1.9 contra §1.5 | T1.L-02 | A (replicar) | "Option A" (2026-10-05). Aplicada en S3: `throw;` en SCUM:68, sin E2E |
| CQ13 | ¿Se codifica el correo en la URL solo dentro de `ValidarClienteEnSapAsync` (SCUM:81-82), sin tocar el wrapper compartido? | T1.2-02 | Sí, después de la E2E con `+` | "yes do it for the Special caracters + &# %" (2026-10-05). Sin la E2E previa: el usuario pidió aplicarlo ya. Aplicada en S3: `Uri.EscapeDataString(valor)` en SCUM:83, sin E2E |
| CQ14 | Si la E2E muestra que BP05 `Mail eq` distingue mayúsculas o espacios finales y LAN no: ¿se normaliza (aprobación) o se acepta? | T1.2-03 | Decidir con la E2E | |
| CQ15 | ¿Aceptas que un correo vacío nunca llegue al SP en ServicioSAP (LAN insertaría si algún `cte` tuviera `eMail1` vacío)? | T1.2-04 | Aceptar | "Magento wont get to ServicioSAP if they dont have an email, ints imposible to get to the service" (2026-10-05). Aceptada: 1.2-R11 pasa a EQ-R; sin código |
| CQ16 | ¿Quién entrega `sp_helptext SpListaNBMagento`, el DDL de ListaNegra/ListaBlanca (tipos, anchos, collation, triggers) o el acceso al repo MaviSAP, rama `SpVTASListaNBMagento`? | T1.L-01 | Diego con el DBA de SIGMavi | |
| CQ17 | ¿Los DBA cargan las listas de producción en la misma ventana que el despliegue ServicioSAP → DMZ? ¿El reporte de Intelisis que lee las listas (ODS:71) se repunta a SIGMavi, se reemplaza o se sincroniza? ¿Se cierra GUIA §8.2 (:547) con SIGMavi como destino final? | T1.L-04, T1.0-DOC | — | |
| CQ18 | ¿Quién consume `getCustomerList` y `deleteCustomerList`? Magento248 no las llama: solo configura setCustomerList (EML:478), y el chequeo del checkout lee las tablas propias de Magento (`Omnipro/EmailageLists/Controller/Lists/Checkemail.php`:138) | T1.3-01, T1.4-01 (prioridad) | — | |
| CQ19 | `blackwhitelistAsync(tipo)` atiende tres rutas con un flag, lo que choca con GUIA §1.4 y SKILL 28. Es port literal de LAN y ODS:87 las migra en bloque. ¿Se acepta como está? | nota | Aceptar como port literal | |
| CQ20 | cashCustomerReport: ¿se sanea `fileName` con `Path.GetFileName` (desvío aprobado de §1.9) o se deja la réplica exacta? | T1.5-03 | Sanear | "why you need to change this? if this works, dont move" (2026-10-05). No se sanea: T1.5-03 cerrada sin código; 1.5-R4 sigue EQ (heredado) y el riesgo queda como deuda en GUIA §8.1:526 |
| CQ21 | `Logger.SAP` puede lanzar desde un catch (SLOG:26-31) y cambiar un 200 por 500/400: ¿A (el despliegue crea `<sitio>\Logs` con permiso) o B (mover `CreateDirectory` dentro del try; helper compartido, dueño de `74d7c2f`)? Es el B8 de CREDITO §6.7 | T1.5-04 | A ahora; B como tarea aparte | "this is because the route its for localhost and the other its for the server," (2026-10-05). No elige A ni B: describe las dos rutas de SLOG (`C:\inetpub\wwwroot\log\sap.log` para el servidor, SLOG:11, dentro de try; `<sitio>\Logs\sap.log` para local, SLOG:26-32, con `CreateDirectory` fuera de try). Sin código en S3 (B exige aprobación explícita). **Pendiente:** confirmar si se toma A (sin código: el despliegue crea `<sitio>\Logs`) |
| CQ22 | ¿Quién corre en QA (servidor de ServicioSAP) la E2E del caso válido con copia al share? | T1.5-01 | Diego con quien tenga acceso al IIS y al share | |
| CQ23 | ¿Quién llama LAN `customer/getCuenta` y `customer/setCuenta` (Intelisis, backoffice, CRM, tarea programada)? ¿Alguien puede revisar los logs IIS de LAN (IP, user-agent, fechas)? Las rutas se mantienen por la decisión del 11 de agosto | T1.C-02 | — | |
| CQ24 | Rama de error de getCuenta/setCuenta: ¿aceptar el 500 tras reintentos (A) o replicar el 200 con mensaje de LAN (B1 local, que no es exacto porque también se traga el fallo del login, o B2 cambiando el `Curl` compartido)? | T1.C-01 | A hasta conocer al consumidor | Sin respuesta (2026-10-05): el usuario pidió más explicación. T1.C-01 no se aplicó en S3; sigue DECISION |
| CQ25 | Datos de prueba: un correo de Magento que exista en los websites 1 y 5 (getCuenta, solo lectura), y un id de cliente de prueba con un BP de prueba para setCuenta (se escribe y se restaura) | T1.6-01, T1.7-01 | — | |
| CQ26 | CSV: para las filas LAN-only, ¿`Conectado = N/A` o `Si` (como las filas 119 y 132)? ¿Apruebas las correcciones del CSV y de los documentos de §2 (T1.0-DOC)? | T1.0-DOC | N/A en todas las LAN-only, por consistencia con la definición del usuario | |
| CQ27 | Las 5 rutas están conectadas solo en `ConexionSAP` (y `SAP-DMZ`, `dbAndroid`, `SAP_DMZ_JAVI`). `master` y `Stage` siguen con `curl.Post` a LAN, y `master` ni siquiera tiene `cashCustomerReport`. ¿Quién fusiona y despliega, y cuándo (primero ServicioSAP, después el DMZ con `4dabaa9`)? | T1.0-DEP | — | |

---

## 6. Enlaces

- Reglas (obligatorias): `SKILL.md` · [[GUIA_MIGRACION_FABLE]] (§0-§2, §1.5, §1.7-§1.9, §3.1, §8.1, §8.2, §8.6, §8.7, §9, §9b)
- Paquetes: [[PLAN_FABLE_POR_CONTROLADOR]] (paquete 1, :86-94; paquete 11 para `magento/getCuenta`/`setCuenta`; paquete 4 para `customer/wallet/*`)
- Crédito (decisiones que tocan este paquete: P5 mayúsculas, P14 `Marst`, B8 Logger): [[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]] · [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] · [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]]
- Análisis por endpoint (`MappingMetods/CustomersController/`): [[Post_SetCustomerList_Mapping]] · [[Post_GetCustomerList_Mapping]] · [[Post_DeleteCustomerList_Mapping]] (con las correcciones de §2.3)
- Contratos (`_NUESTROS_ENDPOINTS/Contratos/`): [[E-02_setCustomerList]] · [[E-03_getCustomerList]] · [[E-04_deleteCustomerList]] · [[E-11_getCuenta]] · [[E-12_setCuenta]] · [[E-13_cashCustomerReport]]
- Estado y decisiones: [[ESTADO_PRUEBAS_Y_AVANCE]] · [[_DECISIONES_ODS]] · [[CHECKLIST_MIGRACION_LAN_A_SAP]] · [[_PLAN_MIGRACION_FECHAS]] · `Checklists/CHECKLIST_DEV3_NOSAP_NOINTELISIS.md`
- BP: [[COMPARATIVA_BP_LAN_VS_SAP]] (parcialmente desactualizado, §2.3) · `CoreccionesVal/CHECKLIST_CAMPOS_BP_ECOMMERCE.md` · `RSG/bp01_bp02_maestro.md` · `RSG/bp05_maestro.md`
- Auditoría y capturas: [[AUDITORIA_INTEGRAL_LAN_DMZ_SAP]] (C24 refutado) · [[CAPTURAS_REALES_APIS]] · `Resources/master_test_plan.md` (evidencia E2E)
- SP: `SPsOrden/SP_eCommerceCtenuevo.sql` · `SPsOrden/SpVTASListaNBMagento.sql` (el de SIGMavi falta: T1.L-01)
- Seguimiento: `MappingMetods/MAVI - DMZ-SAP.csv` filas 32-36, 75-76, 116-117 (§2.1)
- Código: `DMZ/WebApiMagento` (rama `ConexionSAP`) · `LAN/WebApiMagento` · `ServicioSAP/ServicioSap/ServicioSap` (rama `SpExportaEcommerce`) · `Magento248/Magento248/app/code`

#migracion #SAP #fable #plan #CustomersController
