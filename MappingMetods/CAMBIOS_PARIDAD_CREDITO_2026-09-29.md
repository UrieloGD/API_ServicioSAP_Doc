---
tags: [migracion, sap, credito, paridad, serviciosap, decisiones]
fecha: 2026-09-29
alcance: crédito web (order/new con omnipro_pago_credito) — ProcessCreditPaymentAsync, CrearSolicitudCreditoAsync, SolicitudCreditoWebMethods y la fila de CRED_SOLICITUD_WEB_DATOS_TEMP
estado: código editado SIN commit (rama SpExportaEcommerce) · compila · sin prueba E2E · pendientes en §5
requiere: MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP.md (143 reglas, 2026-09-24) · PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md §22-§24
---
# Paridad del crédito web — decisiones y cambios del 2026-09-28/29
> 2026-10-01: cómo funciona ServicioSAP hoy está en [[Business Rules Ecommerce]] (fuente única). Este documento queda como historia; si contradice a esa fuente, gana la fuente.

**2026-09-30 — Lectura principal:** [[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]] (análisis completo y plan final; ahí D1-D10 se llaman DU1-DU10). Este registro sigue siendo la fuente de las decisiones D1-D10 (§2), de los cambios E1-E5 (§3, E5 en §3.6) y de la tabla de las 59 columnas (§4).
> [!abstract] Qué es esto
> Registro de las decisiones que tomó el usuario el 2026-09-28/29, de los cambios de código que salieron de ellas y de cómo queda, columna por columna, la fila que ServicioSAP escribe en `CRED_SOLICITUD_WEB_DATOS_TEMP` frente a lo que escribían LAN + `SP_CREDITO_WEB_DATOS`.
>
> Fuentes:
> - Re-puntaje de las 143 reglas de [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]] contra el código actual (workflow wf5, 2026-09-29).
> - Paridad de las 59 columnas, con dos verificadores (workflow wf4, 2026-09-29).
> - `git diff` del working copy de ServicioSAP, leído para este documento.
>
> Los JSON de wf4 y wf5 quedaron en el scratchpad de la sesión; no están en el vault. Cada afirmación trae `archivo:línea`. Las líneas de ServicioSAP son las del working copy **después** del cambio (2026-09-29 11:17).

> [!warning] Tres arreglos posteriores a las auditorías
> wf4 y wf5 arrancaron antes de estos tres arreglos, así que en sus JSON aparecen abiertos. Aquí ya cuentan como resueltos:
> 1. **G2-13 `estadoCivil`** = denominación SAP del `Marst` del BP, vía `EstadoCivilLegado` (SCW:594-606).
> 2. **G2-12 `sexo`**: un `Gender` vacío da `''`, como LAN (SCW:573-576).
> 3. **`uen`** = `storeId == "viu" ? 2 : 1`, comparación exacta como LAN (OM:755). Arregla también `sucursal`.
>
> Nada de esto se ha probado contra la base ni contra SAP: la prueba E2E (Regla 25 del SKILL) sigue pendiente.

Rutas relativas al share `\\172.16.214.58\sap`. Son las abreviaturas de la MATRIZ §2, más SCM, ICR, CTN, MOM y CAP:
- SS = ServicioSAP/ServicioSap/ServicioSap/
- OM = SS/Methods/Order/OrderMethods.cs (working copy 2026-09-29 11:17)
- SCW = SS/Methods/Credit/SolicitudCreditoWebMethods.cs (2026-09-29 11:02)
- SCM = SS/Models/SAP/Credit/SolicitudCreditoWebModels.cs
- ICR = SS/Models/SAP/Order/InfoClienteRequest.cs (2026-09-29 09:44)
- OC = SS/Controllers/OrderController.cs
- BPM = SS/Methods/BusinessPartner/BusinessPartnerMethods.cs
- LOM / LCM = LAN/WebApiMagento/Metodos/OrderMethods.cs / CreditMethods.cs
- SPD = .agents/skills/lan-sap-migration/SPsOrden/SP_CREDITO_WEB_DATOS.sql
- CTN = .agents/skills/lan-sap-migration/SPsOrden/SP_eCommerceCtenuevo.sql
- MOM = Magento248/Magento248/app/code/Omnipro/PlaceOrder/Model/OrderManagement.php
- CAP = .agents/skills/lan-sap-migration/MappingMetods/CAPTURAS_REALES_APIS.md
- PLAN = .agents/skills/lan-sap-migration/MappingMetods/PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md

---
## 1. Resumen

- **La cabecera ya guarda lo mismo que LAN + SP en todo lo que Magento manda hoy.** De las 59 columnas:
  - 37 son iguales (EQ);
  - 11 son iguales usando la fuente SAP que decidió el usuario (EQ-FUENTE);
  - 9 esperan una decisión abierta (PENDIENTE);
  - 2 difieren solo con un `null` explícito que Magento no manda (BORDE).

  Ninguna difiere en un caso real (§4).
- **El INSERT es textualmente el del SP** (D8). Tiene las mismas 59 columnas y los mismos 59 valores. `@fecha` sale de `GETDATE()` dentro del batch, `confirmado` es el literal 1 y se conserva `ISNULL(@RedimirMonedero, 0.00)` (SCW:38-160 contra SPD:162-344).
- **Solo se crea solicitud para un BP existente** (D6). Con la cuenta vacía o no encontrada responde `sin cuenta` y no escribe fila, como `checkCliente` de LAN (OM:646-649). Se quitó el camino de cliente nuevo y de invitado.
- **Los nulos ya no se convierten en `''`** en los 11 campos que LAN pasaba tal cual (D5; OM:779-800).
- **`origen` pasa como lo manda Magento**, o `'PRODUCTOS MX'` si no viene (D7; ICR:74, OM:798).
- **`sexo` y `estadoCivil` salen del BP** con las tablas de códigos del usuario (D10).
- **El proceso completo todavía no es el de LAN.** Todo lo pendiente está en §5:
  - lo posterior a la cabecera: liberador, aviso a Magento, creditStatus y updateCreditOrderId;
  - el cupón del promotor;
  - el costo y el precio de las líneas;
  - las compuertas "sin fila".
- **Código:** 3 archivos modificados **sin commit**, en la rama `SpExportaEcommerce` (HEAD `2cf425f`). Compila (§3.5). **Actualización 2026-09-30:** con E5 (§3.6) son 4 archivos, 126 inserciones y 44 borrados.

**Recuento de las 143 reglas.** La base es wf5, más los 3 arreglos posteriores y el ajuste que pidió su crítico:

| Grupo | Total | EQ | EQ-R | DIF | FALTA | N/A | PENDIENTE | MATRIZ 2026-09-24 (EQ/EQ-R/DIF/FALTA/N/A/DEP) |
|---|---|---|---|---|---|---|---|---|
| G1 Elegibilidad | 24 | 4 | 9 | 0 | 1 | 3 | 7 | 6/2/10/2/2/2 |
| G2 Cabecera | 39 | 20 | 14 | 0 | 0 | 1 | 4 | 22/3/11/1/2/0 |
| G3 Validación telefónica | 18 | 7 | 6 | 2 | 0 | 2 | 1 | 7/2/5/0/2/2 |
| G4 Líneas | 39 | 13 | 4 | 1 | 8 | 2 | 11 | 14/4/3/16/2/0 |
| G5 Posterior al alta | 23 | 2 | 4 | 3 | 1 | 4 | 9 | 2/2/8/7/0/4 |
| **Total** | **143** | **46** | **37** | **6** | **10** | **12** | **32** | 51/13/37/26/8/8 |

Cómo leer la tabla:
- **Estados.** Son los de la MATRIZ. PENDIENTE (nuevo) quiere decir que la regla está bloqueada por una decisión abierta del usuario o de otro equipo; ocupa el lugar de DEP. EQ-R incluye "igual por decisión del usuario".
- **Ajustes sobre wf5** (en wf5: 46/39/6/10/12/30):
  - **G2-12 y G2-13** pasan de PENDIENTE a EQ-R por los arreglos 1 y 2. Solo les queda abierto el tema de las mayúsculas.
  - **G1-05, G1-19, G2-10 y G5-04** pasan de EQ-R a PENDIENTE. El crítico de wf5 señaló que son compuertas "sin fila" (guía que falla, fecha de nacimiento vacía), y el usuario las tiene en su lista abierta.
  - **Diferencia con la MATRIZ.** La MATRIZ §0.2 y el PLAN §25.4 dejan estas 4 en EQ-R: 46 EQ, 41 EQ-R y 28 PENDIENTE. El 37/32 de esta tabla lo dan como sensibilidad. Las dos cuentas salen de los mismos datos; solo cambia dónde van esas 4 reglas.
  - **Reglas nuevas.** La MATRIZ agregó 6 filas "NUEVA 2026-09-29" que no entran en las 143: G1-25, G3-19 y G5-24 a G5-27 (§5.3).
- **G2-20 y G2-21** ya eran EQ; con el arreglo 3 quedan exactos, también con `'VIU'`.
- **El detalle por regla** vive en la MATRIZ. Aquí solo van el recuento y lo que cambió.

#migracion #SAP #credito

---

## 2. Decisiones del usuario (2026-09-28/29)

> [!note] Numeración
> D1-D10 de esta sección son las decisiones del usuario del 2026-09-28/29. **No** son las decisiones de diseño D1-D10 del 2026-09-18 ([[FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO]] §1), ni las R1-R8 / Q1-Q22 del PLAN (§23.4, §23.9, §24.3). Cuando una de estas reemplaza a una anterior, se indica.

| Id | Decisión del usuario (2026-09-28/29) | Qué cambia | Reglas / preguntas |
|---|---|---|---|
| **D1** | Las cadenas de conexión del `Web.config` (`MAVICBOSANDROID`, `ADMINDOC`; login `usrintranet`) son la fuente correcta para las bases SQL. `Conexion.dll` es para S/4HANA. Los valores de ambiente (credenciales, `URL_DMZ`, `URL_INTELISIS` del DMZ) son de Dev y cambiarán en QA/Prod: **no son bloqueantes**. | Conexiones, credenciales y URLs dejan de contarse como riesgo. El punto 4.2 #4 de la MATRIZ (confirmar si la base Android es QA y si hay permiso de INSERT directo) queda como no bloqueante. Responde en parte Q2 (PLAN §24.3): los valores actuales son de Dev. **Abierto:** hoy SIGMavi también se conecta vía `Conexion.dll`; falta decidir si debe ir por `Web.config`. | G2-01, G4-07, G5-10, G5-12; Q2 |
| **D2** | Magento mandará en `infoCliente.cuenta` solo el BP numérico de SAP. Las cuentas `C…` de Intelisis nunca llegan a ServicioSAP; eso se resuelve con configuración y datos del lado de Magento. Toda regla de LAN que dependa del prefijo `'C'` se lee como "BP existente". | G1-13 y G3-18 pasan de DEP a EQ-R; G2-24 ya era EQ-R y sigue así (corr. verificador 29/09: antes decía que G2-24 también era DEP). El disparador del liberador (G1-22, G5-09) pasa a ser "BP existente que no es prospecto". Precisa R1 (`_IMPLEMENTACION_SP_CREDITO/workflow_credit_parity_2026-09-26.js:28`). wf5 vio que el Magento248 del share todavía asigna `getCuentaIntelisis()` (MOM:719); según D2, eso se corrige del lado de Magento. | G1-13, G1-22, G1-23, G2-24, G3-18, G5-09 |
| **D3** | El catálogo AWS `ORIGEN VALIDACION NUMERO CTE` ya está dado de alta con 23 valores `Valor1` (lista en `MappingMetods/CatalogoConfiguracion.csv`). **Abierto:** si se agregan orígenes de la era SAP, como `CteXpressFrontSAP`. | G3-10 pasa de DEP a EQ-R. Cierra el punto 4.2 #3 de la MATRIZ y la parte "¿está registrado?" de Q3. Falta comprobar con un BP real que los `ZappOrig` de CteTelSet se escriben igual que los 23 `Valor1`. | G3-10; Q3 |
| **D4** | `A_GET_TelefonoValidado` (API businesspartner) ya devuelve el teléfono validado más reciente: **aceptado**. | G3-04 y G3-11 pasan a EQ-R. Cierra, como decisión, el "Q4 residual" (PLAN §24.1 y §24.6: la copia del share toma `max()` sobre todos los teléfonos). Queda un punto de formato: `ZtelCte` no se reduce a dígitos (OM:626, SCW:391; PLAN:2229). | G3-04, G3-11; filas 53, 55 y 56 |
| **D5** | **Regla de paridad de valores:** en cada columna, ServicioSAP guarda exactamente lo que guardaban LAN + SP (NULL, `''`, default del SP, literal, `ISNULL` o `GETDATE`), usando como fuente el equivalente SAP. | Es el criterio de toda la §4. Con él se quitaron los `?? ""` de 11 campos (OM:779-800), y un `Gender` vacío da `''` (SCW:573-576). Obliga a decidir las compuertas "sin fila" (§5.1) y si `costo` va en 0 o NULL (G4-33). En la fila de crédito reemplaza la sub-regla "Gender vacío → Masculino" de la fila Gender de PLAN §23.9. `MapGender` (alta de BP) no cambia. | G2-12, G2-15, G2-16, G2-17, G2-22, G2-25, G2-27, G4-33 |
| **D6** | El crédito es solo para un BP existente. Con la cuenta vacía o no encontrada se responde `sin cuenta` y no se escribe fila, como `checkCliente` de LAN (LCM:124, :255-258). Se quita el camino de cliente nuevo y de invitado. | Reemplaza R2 ("cliente nuevo inserta"). G1-09, G1-10 y G2-05 pasan de DIF a EQ-R. Deja sin efecto los bugs B4 y B5 (PLAN §23.5) y sin objeto Q12 (ValidacionTelefono de un cliente nuevo). Agrega el log `[CREDITO SIN CUENTA]` (OM:648), que LAN no tenía (G5-20). | G1-09, G1-10, G1-12, G2-05, G3-15, G5-20 |
| **D7** | `origen` va exactamente como en LAN/SP: el `infoCliente.origen` de Magento si viene y, si no, `'PRODUCTOS MX'` (LOM:646). | Cierra Q15 (PLAN §23.4, §24.3). Se agregó la propiedad `origen` (ICR:68-74) y `Origen = info.origen ?? "PRODUCTOS MX"` (OM:798). G2-04 queda EQ. `'DIMAS MX'` se vuelve alcanzable, así que G2-03 pasa de N/A a PENDIENTE. | G2-03, G2-04; fila 41 |
| **D8** | `fecha`: el SP la arma adentro (`DECLARE @fecha; SELECT @fecha = GETDATE()`). El INSERT de ServicioSAP queda textualmente igual al del SP: 59 columnas y valores, literal 1 en `confirmado` e `ISNULL(@RedimirMonedero, 0.00)`. | G2-01 pasa de EQ-R a EQ; G2-34 ya era EQ y sigue EQ, ahora con la forma del SP. Supera la nota de G2-34 en la MATRIZ ("usa el reloj del servidor de aplicación") y el bug de PLAN:2233 (`DateTime.Now` del IIS). | G2-01, G2-31, G2-34; filas 42, 43 y 52 |
| **D9** | `SIGMavi.VentasCupones` es la misma tabla que `IntelisisTmp.VTASCVentaCupon`, renombrada; solo cambian las reglas. | Cierra la parte de "fuente de verdad" de Q7 (PLAN §23.4) y la duda de la MATRIZ 4.1 #4. G5-07 y G5-08 siguen en DIF por las reglas (Q8 abierta). | G5-06, G5-07, G5-08; Q7 |
| **D10** | Tabla de códigos de `Marst`, tomada del SAP GUI: 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 Pareja de hecho. `Gender` sigue a `BusinessPartnerMethods.MapGender` (1 masculino, 2 femenino). | G2-13 pasa de FALTA a EQ-R y G2-12 de DIF a EQ-R. Cierra Q14. Resuelve por decisión la duda de PLAN §23.8 sobre el orden estándar de S/4 (1 = femenino): se sigue `MapGender` (BPM:777-798). | G2-12, G2-13; filas 7 y 20 |

#decisiones #credito

---

## 3. Cambios de código (working copy, sin commit)

`git diff --stat`: 3 archivos, 69 inserciones y 41 borrados. Rama `SpExportaEcommerce`, HEAD `2cf425f`. **Actualización 2026-09-30:** con E5 (§3.6) son 4 archivos, 126 inserciones y 44 borrados; §3.1-§3.5 describen el estado de las 11:17.

### 3.1 OM `ProcessCreditPaymentAsync` (:638-730) — compuerta "sin cuenta" (D6)

| Qué | Antes | Después |
|---|---|---|
| Clasificación | `idClienteMagento`, `esClienteNuevo` (cuenta vacía con `cliente`) y `esInvitado` (los dos vacíos, que lanzaba "Los invitados no pueden pagar con crédito.") | Sin clasificación. :642 `cuentaBp = order.infoCliente?.cuenta ?? ""` |
| Existencia | `CheckClientCreditAsync` solo si no era cliente nuevo; lanzaba "El cliente BP {cuentaBp} no tiene crédito activo en SAP." | :646 si la cuenta está en blanco o `CheckClientCreditAsync` (OM:732-745) da false, :648 `Logger.SAP("[CREDITO SIN CUENTA] ", …)` con incrementId, cuenta y cliente, y :649 `throw new Exception("sin cuenta")` |
| Liberador | Bloque comentado dentro de `if (esClienteNuevo)` | :685-686 comentario `PENDIENTE (T18)`: en LAN se disparaba para clientes existentes (LCM:208). El bloque :687-721 sigue comentado |
| Retorno | `esClienteNuevo ? idClienteMagento : cuentaBp` | :723 `return cuentaBp` |

- **Respuesta con cuenta vacía o inexistente:** HTTP 200 `Error, Error en SetOrder: sin cuenta` (OM:1930, luego OC:45-46). LAN respondía la cuenta (LOM:649). Es la diferencia de contrato ya registrada en R4 / G3-16.
- **El bloque comentado no compila tal como está.** Antes de encenderlo hay que corregir:
  - `capturedCliente = idClienteMagento` (:690) usa una variable que ya no existe; debe ser `cuentaBp`;
  - `capturedUen` (:692) sigue con `ToUpper()`; hay que alinearlo con OM:755;
  - hay `await` dentro de un lambda que no es async (:700, :710).

### 3.2 OM `CrearSolicitudCreditoAsync` (:751-813) — valores (D5, D7 y `uen`)

| Línea | Antes | Después |
|---|---|---|
| :754-755 | `order.storeId?.ToUpper().Equals("VIU") == true ? 2 : 1` | `order.storeId == "viu" ? 2 : 1` (LOM:628) |
| :779-782 | `Email`, `Direccion`, `Exterior`, `Interior` = `info.… ?? ""` | `info.correo`, `info.direccion`, `info.numExt`, `info.numInt`, sin `?? ""` |
| :786-789 | `Delegacion` y `Poblacion` = `info.municipio ?? ""`; `Estado` y `Colonia` con `?? ""` | Los cuatro sin `?? ""` |
| :793 | `Condicion = order.articulos?.FirstOrDefault()?.condicion ?? ""` | Sin `?? ""` |
| :795 | `UtmSource = order.utmSource ?? ""` | `UtmSource = order.utmSource` |
| :797-798 | `Origen = "PRODUCTOS MX"` (literal) | `Origen = info.origen ?? "PRODUCTOS MX"` |
| :800 | `MetodoEnvio = order.metodoEnvio ?? ""` | `MetodoEnvio = order.metodoEnvio` |
| :776-778, :783 | — | Comentarios de paridad con LAN |

Se dejaron **sin cambio a propósito**, cada uno con su pendiente:
- :784 `EntreCalles ?? ""`: el respaldo al BP (SCW:252) reproduce LCM:163.
- :785 `CodigoPostal ?? ""` y :799 `IdMagento ?? "0"`: compuertas "sin fila" (§5.1 #1).
- :807 `OrigenIdMagento ?? ""`: borde del `null` explícito (§5.3).
- :790 `EstadoCivil = ""` y :773-775 (`FechaNacimiento`, `Rfc`, `Sexo`): ya no aportan, porque `ArmarFila` los reemplaza con el BP y, tras D6, `maestro` nunca es null (§5.1 #12).

### 3.3 ICR — propiedad `origen` (:68-74)

Nueva `public string origen { get; set; }`, con doc XML: Magento solo la agrega cuando el pago trae `additional_information 'origen'` (MOM:705-708); si no llega, se guarda `'PRODUCTOS MX'` (LOM:646).

### 3.4 SCW — INSERT, `ArmarFila`, `SexoLegado`, `EstadoCivilLegado`

| Método | Antes | Después |
|---|---|---|
| `QueryInsert` (:35-160) | `INSERT … VALUES (…, @fecha, @confirmado, …, @RedimirMonedero, …)` | :38-39 `DECLARE @fecha DATETIME; SELECT @fecha = GETDATE();` · :142 `@fecha` · :143 literal `1` · :152 `ISNULL(@RedimirMonedero, 0.00)`. Es igual a SPD:162, :170 y :223-344 |
| `InsertarSolicitudAsync` (:162-234) | 59 parámetros, entre ellos `@fecha` (DateTime, `fila.Fecha`) y `@confirmado` (Int) | 57 parámetros (:171-228) y un comentario en :212. `@fecha` ya no es parámetro, así que el `DECLARE` no choca |
| `ArmarFila` (:236-310) | `fila.Fecha = DateTime.Now;` · `fila.EstadoCivil = req.EstadoCivil` (siempre `""`) | Sin `fila.Fecha` · :261 `fila.EstadoCivil = maestro != null ? EstadoCivilLegado(maestro.Marst) : req.EstadoCivil` |
| `SexoLegado` (:567-589) | `""` o `"1"` daban `Masculino` | :573-576 `""` da `""` · :578-581 `"1"` da `Masculino` · :583-586 `"2"` da `Femenino` · :588 cualquier otro da `NO ESPECIFICADO`, que el Size 9 de :177 deja en `NO ESPECI` |
| `EstadoCivilLegado` (:591-606) | No existía | Nuevo. `Marst` 1 a 6 da Soltero, Casado, Viudo, Divorciado, Separado o Pareja de hecho; cualquier otro valor o vacío da `""`. El Size 11 (:190) deja `Pareja de h` |

### 3.5 Verificación

- **Compila.** Roslyn (`csc` con un archivo de respuesta de 221 `.cs`) termina con exit 0. La DLL de verificación se generó fuera del repo el 2026-09-29 11:17:48, después de la última edición (OM 11:17:42, SCW 11:02:08, ICR 09:44:05). No se tocó `bin\`.
- **Sin commit.** `git status` muestra 3 archivos `M`, los de §3.1 a §3.4. Rama `SpExportaEcommerce`, HEAD `2cf425f`.
- **Revisado:**
  - wf5 y wf4 verificaron en el código la compuerta, los `?? ""`, `origen` y el INSERT. El verificador de la documentación (2026-09-29) lo repitió: SCW:40-160 contra SPD:223-344, sin espacios ni mayúsculas, es el mismo texto. Solo sobra el `; SELECT CAST(SCOPE_IDENTITY() AS INT)` de SCW:160.
  - Los 57 parámetros tienen el tipo y el ancho del SP, salvo `@cliente` 10 (SCW:170; PLAN:1696).
  - Los 3 arreglos posteriores se verificaron en el `git diff` para este documento.
- **No probado:** ni contra ServicioAndroid ni contra SAP. Falta la E2E (Regla 25 del SKILL; plan de pruebas en PLAN §24.2).

### 3.6 FLP y OM — precio SD29 del crédito filtrado en el servicio (E5, 2026-09-29 12:44; registrado aquí el 2026-09-30)

_Cambio hecho después de §3.1-§3.5 (OM y FLP 12:44:05). FLP = SS/Methods/SalesDistribution/FinalListProperMethods.cs, UTF-8 con BOM. Líneas del working copy de las 12:44, vueltas a comprobar el 2026-09-30. Resumen y plan: [[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]] §5.1._

| Qué | Antes | Después |
|---|---|---|
| FLP `GetFinalListProperBySkuAsync` (:82-85) | Armaba la URL con `$filter=Articulo%20eq%20'{sku}'` y el SKU sin escapar: un SKU con `+` no devolvía filas (bug B1, wf2 C2) | Delega en `ConsultarPropreListAsync($"Articulo eq '{LiteralOData(sku)}'")` |
| FLP `GetFinalListProperBySkuOrgCondicionAsync` (:91-96) | No existía | Nuevo, público: `$filter` = `Articulo eq '…' and OrgVtas eq '…' and Condicion eq '…'` |
| FLP `LiteralOData` (:100-103) | No existía | Nuevo, privado: duplica el apóstrofo, `(valor ?? "").Replace("'", "''")` |
| FLP `ConsultarPropreListAsync` (:105-135) | El cuerpo vivía en `GetFinalListProperBySkuAsync` | URL = `obtenerUrl(ENVIROMENT_DEV, SERVICE_URL) + "/ZAPI_PROPRELIST_SRV/PropreListSet?sap-language=ES&sap-client=110&$format=json&$filter=" + Uri.EscapeDataString(filtro)` (:108-110). Petición, deserialización y errores, sin cambio |
| OM `InsertCreditArticlesAsync` (:919) | `preciosSku = await _preciosMethods.GetFinalListProperBySkuAsync(articuloSp).ConfigureAwait(false) ?? new List<FinalListProper>();` | `preciosSku = await ObtenerPreciosCreditoAsync(articuloSp, orgVentas, condicionSap, condicion).ConfigureAwait(false);` |
| OM `ObtenerPreciosCreditoAsync` (:997-1025) | No existía | Nuevo, privado. (1) Filtra con `condicionSap`. (2) Si da 0 filas y la condición de Magento es distinta, filtra con ella. (3) Si algo lanza, escribe `[CREDITO SD29 FILTRO]` (:1021) y consulta solo por SKU (:1022-1023) |

- **Red de seguridad:** se conservan los filtros en memoria de OM:929-944 (`OrgVtas` y match por condición con `FirstOrDefault`).
- **Alcance fuera del crédito:** la consulta solo por SKU también la usa contado (`ValidarPreciosConProperlistAsync`, OM:1982), así que ahí los SKU con `+` ahora también encuentran precio. Si el usuario pide commit, E5 va en un commit propio (GUIA §1.8b).
- **Regla LAN de referencia:** SPL:243-262 hace `INSERT…SELECT` desde `PropreListaDFinal ⋈ VTASCCondicionesCredVtaLinea` (`c.CondicionPropre = p.Condicion`) con `WHERE c.Condicion = @Condicion AND p.articulo = @artRegion`, sin filtro de organización. La fuente SD29 por SKU la decidió el usuario el 2026-09-11 (FLUJO_CREDITO:215; GUIA:281). Siguen abiertos varias filas por SKU, `costo` y precisión de SEGU00001 (P8) y los filtros Sucursal/CDistr/Vigente (P7), en [[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]] §6.3.
- **Log nuevo:** `[CREDITO SD29 FILTRO]` no existe en LAN (G5-20; P13).
- **Autorización pendiente:** E5 creó 4 métodos (`GetFinalListProperBySkuOrgCondicionAsync`, `LiteralOData`, `ConsultarPropreListAsync`, `ObtenerPreciosCreditoAsync`) y un log. GUIA §1.9b pide consultarlo antes y §1.9e dice que el precio se consulta con `GetFinalListProperBySkuAsync`. La autorización del usuario no quedó registrada: se pide ratificarla en P20.
- **Verificación:** hunks FLP `@@ -80,9 +80,34 @@` y OM `@@ -919,8 +916,7 @@` y `@@ -998,6 +994,36 @@`. `GetFinalListProperBySkuOrgCondicionAsync` aparece solo en FLP:91 y OM:1007/:1013; `ObtenerPreciosCreditoAsync`, solo en OM:919 y :1003. Compila con Roslyn (221 `.cs`, exit 0; DLL de verificación de las 12:44:11). En Windows PowerShell 5.1, `Uri.EscapeDataString` pasa `+` a `%2B` y el espacio a `%20` y deja el apóstrofo sin escapar; `'` y `%27` son válidos para el `$filter`. **No probado contra SAP** (prueba V2c del plan final).
- **Reglas:** G4-21 y G4-25 siguen PENDIENTE (P7/P8); G4-22, G4-23. wf2 C2 (B1) queda resuelto en código, y con él la nota de G4-21 de la MATRIZ y el bug B1 de §5.3 y de PLAN §24.4. wf2 C3 sigue abierto (P7).
- **Citas corridas:** desde OM:997, las líneas de OM que citan §1-§5 de este documento y la MATRIZ quedaron 29-30 líneas atrás. Por ejemplo, `SaveGuideAsync` pasó de :1764 a :1793, `Error en SetOrder` de :1930 a :1959 y `[ORDER GetCondicion ERROR]` de :3329 a :3359. Si una cita no cuadra, manda el código.

#dotnet #migracion

---

## 4. Paridad por columna de `CRED_SOLICITUD_WEB_DATOS_TEMP`

### 4.1 Cómo producía el SP sus valores por defecto

1. **Llamada por nombre.** LAN llamaba al SP por nombre desde `ProductosCreditoWeb_SaveData` (LCM:150-188). Un parámetro que LAN no agregaba, o cuyo valor en C# era `null`, tomaba el **DEFAULT** de la firma (SPD:92-159). ADO.NET no envía un `SqlParameter` con `Value = null`.
2. **Los DEFAULT son `NULL`**, salvo dos: `@estatus INT = 0` (SPD:148) y `@SucursalDestino INT = 0` (SPD:150).
3. **Lo que armaba el SP por dentro:**
   - `DECLARE @fecha DATETIME` y `SELECT @fecha = GETDATE()` (SPD:162, :170);
   - `confirmado` es el literal `1` (SPD:327);
   - `ISNULL(@RedimirMonedero, 0.00)` (SPD:336);
   - `@ValidacionTelefono` se recalcula siempre, sin importar lo que mande el llamador (SPD:210-221);
   - con `@origen = 'DIMAS MX'`, `@Condicion` y `@Articulo` salen de `CREDICCondicionArt` (SPD:174-183).
4. **Recorte.** Se hacía al ancho del **parámetro** (`VARCHAR(n)` de SPD:94-159), no de la columna. ServicioSAP pone el mismo `Size` (SCW:168-228), salvo `@cliente` = 10 (SCW:170, D2).
5. **Maestro.** Lo que venía del maestro CTE nunca era NULL, porque `DBNull.ToString()` da `''` (LCM:831-849).
6. **Cómo lo reproduce ServicioSAP:**
   - `Nulo()` manda `DBNull` para un `null` de C# (SCW:312-315), que da el mismo NULL que el DEFAULT;
   - `estatus` y `SucursalDestino` se mandan explícitos en 0 (inicializadores SCM:113, :117);
   - `fecha`, `confirmado` e `ISNULL` quedan en el SQL (D8).
7. **Columnas fuera del INSERT.** La tabla tiene 90 columnas y el INSERT escribe 59. Las otras 31 toman el default de la tabla en los dos sistemas (PLAN:1689, :1701).

### 4.2 Tabla de las 59 columnas

Leyenda:
- **EQ**: mismo valor con null, con `''` y con valor.
- **EQ-FUENTE**: mismo valor, tomado del equivalente SAP que decidió el usuario (BP05MA en vez de CTE, BP numérico, A_GET_TelefonoValidado, catálogo AWS).
- **PENDIENTE**: difiere en un caso que depende de una decisión abierta (§5).
- **BORDE**: difiere solo con un `null` explícito que Magento no manda hoy.
- **SIN FILA**: LAN no escribía la fila (excepción atrapada que daba `'err'` o `''`).
- **(corr. 29/09)**: fila que wf4 marcó abierta y que resolvió uno de los arreglos posteriores.

| n | Columna | LAN + SP: null · `''` · con valor | ServicioSAP (2026-09-29) | Estado |
|---|---|---|---|---|
| 1 | `apellidoP` | null → `''` (DBNull.ToString(), LCM:832) · `''` → `''` · valor → LEFT(CTE.PersonalApellidoPaterno, 30), en MAYÚSCULAS (CTN:117, :179) | BP05MA `NameLast ?? ""`, Size 30 (SCW:171, :240). Mismo null, `''` y ancho; conserva la capitalización del BP | EQ-FUENTE · mayúsculas pendiente |
| 2 | `apellidoM` | Igual que `apellidoP`, con CTE.PersonalApellidoMaterno (LCM:153, :833) | `NameLst2 ?? ""`, Size 30 (SCW:172, :241) | EQ-FUENTE · mayúsculas pendiente |
| 3 | `nombre` | null → `''` · `''` → `''` · valor → LEFT(CTE.PersonalNombres, 25): todos los nombres de pila, en MAYÚSCULAS (LCM:154, :834) | `NameFirst ?? ""`, Size 25 (SCW:173, :242). No lee `Namemiddle` | EQ-FUENTE · mayúsculas y Namemiddle (Q19) pendientes |
| 4 | `nombre2` | NULL siempre: el parámetro está comentado (LCM:155), así que aplica el DEFAULT NULL (SPD:97) | NULL siempre: `req.Nombre2` nunca se asigna y va DBNull (SCW:174, :243) | EQ |
| 5 | `fechaNacimiento` | null → SIN FILA (Convert.ToDateTime(DBNull) en LCM:835, lista de 4 en LCM:860-867, falla LCM:156 y responde `'err'` en LCM:246-251) · `''` no aplica · valor → `'yyyy-mm-dd'` en varchar(10) (PLAN:1700). Los CTE creados por la web ya traían `'1900-01-02'` (CTN:140) | `FechaSap(Birthdt) ?? 1900-01-02` (SCW:244, :555, :613-638). Sin Birthdt escribe `'1900-01-02'`; con valor, el mismo `'yyyy-mm-dd'` (SqlDbType.Date, SCW:175) | PENDIENTE (compuerta sin fila; Q11) |
| 6 | `rfc` | null → `''` · `''` → `''` · valor → LEFT(CTE.RFC, 13) (LCM:157, :836) | `To_CteCliente?.Stcd1 ?? ""`, Size 13 (SCW:176, :245). La captura real ya viene en mayúsculas (CAP:67) | EQ-FUENTE |
| 7 | `sexo` (corr. 29/09) | null → `''` (LCM:837) · `''` → `''` · valor → LEFT(CTE.Sexo, 9), en MAYÚSCULAS desde el alta, p. ej. `'MASCULINO'` (CTN:132) | `SexoLegado(Gender)` (SCW:246, :567-589): vacío o null → `''` · `'1'` → `'Masculino'` · `'2'` → `'Femenino'` · otro → `'NO ESPECIFICADO'`, que el Size 9 (SCW:177) deja en `'NO ESPECI'`. Códigos de `MapGender` (BPM:777-798) | EQ-FUENTE (D5, D10) · mayúsculas pendiente |
| 8 | `email` | null → NULL (el null de C# no se envía y aplica el DEFAULT, SPD:101) · `''` → `''` · valor → LEFT 50 (LOM:630, LCM:159) | `info.correo` sin `?? ""` (OM:779): DBNull, `''` o Size 50 (SCW:178, :248) | EQ |
| 9 | `direccion` | NULL · `''` · LEFT 30 (LOM:407, LCM:160, SPD:102) | Sin `?? ""` (OM:780), Size 30 (SCW:179) | EQ |
| 10 | `exterior` | NULL · `''` · LEFT 8 (LOM:408, LCM:161) | OM:781, Size 8 (SCW:180) | EQ |
| 11 | `interior` | NULL · `''` · LEFT 8 (LOM:409, LCM:162) | OM:782, Size 8 (SCW:181) | EQ |
| 12 | `entreCalles` | Clave ausente o `''` → LEFT(CTE.EntreCalles, 80), `''` si es NULL y en MAYÚSCULAS desde el alta · null explícito → SIN FILA (NullReferenceException en LCM:163) · valor → LEFT 80 (LOM:641, LCM:163, :841) | Ausente, null o `''` → BP `ZentCalles ?? ""` · valor → LEFT 80 (OM:784; SCW:182, :252) | EQ-FUENTE (el null explícito no llega: Magento manda `?? ''`, MOM:748) · mayúsculas pendiente |
| 13 | `antiguedadAnios` | NULL siempre (no se envía; DEFAULT, SPD:106) | NULL siempre (SCW:183, :253) | EQ |
| 14 | `antiguedadMeses` | NULL siempre (SPD:107) | NULL siempre (SCW:184, :254) | EQ |
| 15 | `codigoPostal` | null → SIN FILA (compuerta conocida, LOM:599) · `''` → `''` · valor → LEFT 6 (LCM:164, SPD:108) | null → `''` (`?? ""`, OM:785) · `''` → `''` · LEFT 6 (SCW:185) | PENDIENTE (compuerta sin fila) |
| 16 | `delegacion` | NULL · `''` · LEFT(municipio, 25) (LOM:411, LCM:165, SPD:109) | `info.municipio` sin `?? ""` (OM:786), Size 25 (SCW:186) | EQ |
| 17 | `poblacion` | NULL · `''` · LEFT(municipio, 30) (LCM:166, SPD:110) | OM:787, Size 30 (SCW:187) | EQ |
| 18 | `estado` | NULL · `''` · LEFT 30 (LOM:413, LCM:167) | OM:788, Size 30 (SCW:188) | EQ |
| 19 | `colonia` | NULL · `''` · LEFT 30 (LOM:412, LCM:168) | OM:789, Size 30 (SCW:189) | EQ |
| 20 | `estadoCivil` (corr. 29/09) | null → `''` · `''` → `''` · valor → LEFT(CTE.EstadoCivil, 11) (LCM:169, :847; SPD:113) | `EstadoCivilLegado(Marst)` (SCW:261, :594-606): 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 `'Pareja de hecho'`, que el Size 11 (SCW:190) deja en `'Pareja de h'`; otro o vacío → `''` | EQ-FUENTE (D5, D10) · mayúsculas pendiente |
| 21 | `viveEnCalidad` | NULL siempre: se lee (LCM:849) pero no se envía (SPD:114) | NULL siempre (SCW:191, :262) | EQ |
| 22 | `sueldo` | NULL siempre (SPD:115) | NULL (Money, DBNull; SCW:192) | EQ |
| 23 | `tarjeta` | NULL siempre (SPD:116) | NULL (SCW:193) | EQ |
| 24 | `tarjetaDigitos` | NULL siempre (SPD:117) | NULL (SCW:194) | EQ |
| 25 | `creditoHipoteca` | NULL siempre (SPD:118) | NULL (SCW:195) | EQ |
| 26 | `creditoAutomotriz` | NULL siempre (SPD:119) | NULL (SCW:196) | EQ |
| 27 | `ladaParticular` | null → SIN FILA (ValidateOnlyNumbers(null), LOM:414, :445) · `''` → SIN FILA (Substring, LCM:141) · valor → INT de la lada: 2 dígitos para 33/55/81, si no 3 (LCM:139-142, :179). Un número de 1 dígito, o de 2 que no sean 33/55/81 → SIN FILA | null, `''` o corto → 0 · valor → el mismo INT (OM:761-766, :801; SCW:197) | PENDIENTE (compuerta de teléfono; Q10) |
| 28 | `telefonoParticular` | null, `''` o corto → SIN FILA · valor → LEFT(dígitos después de la lada, 10); `'33'` → `''` (LCM:143, :180) | null, `''` o corto → `''` · valor → lo mismo, Size 10 (OM:764, :802; SCW:198) | PENDIENTE (Q10) |
| 29 | `ladaCelular` | Igual que `ladaParticular` (LCM:181) | Igual que `ladaParticular` (OM:803; SCW:199) | PENDIENTE (Q10) |
| 30 | `telefonoCelular` | Igual que `telefonoParticular` (LCM:182) | Igual que `telefonoParticular` (OM:804; SCW:200) | PENDIENTE (Q10) |
| 31 | `extencionArchivo_1` | NULL siempre (SPD:124) | NULL (SCW:201) | EQ |
| 32 | `extencionArchivo_2` | NULL siempre (SPD:125) | NULL (SCW:202) | EQ |
| 33 | `extencionArchivo_3` | NULL siempre (SPD:126) | NULL (SCW:203) | EQ |
| 34 | `articulo` | `''` siempre (literal de C#, LCM:170). Con origen `'DIMAS MX'` → LEFT(CREDICCondicionArt.Codigo, 20) de la fila MAX(IdCondicionArt) (SPD:174-183) | `''` siempre (OM:791; SCW:204, :278). No hay override de DIMAS MX | PENDIENTE (DIMAS MX, G2-03) |
| 35 | `uen` (corr. 29/09) | null o `''` → 1 · `'viu'` exacto → 2 · cualquier otro, incluido `'VIU'` → 1 (LOM:628; `==` distingue mayúsculas) | `order.storeId == "viu" ? 2 : 1` (OM:755; SCW:205) | EQ |
| 36 | `condicion` | NULL · `''` · LEFT(condicion del primer artículo del primer SKU agrupado, 20) (LOM:632, LCM:172). Con DIMAS MX → CREDICCondicionArt.Condicion (SPD:176) | NULL · `''` · lo mismo: GroupBy en orden de aparición y `FirstOrDefault()?.condicion` sin `?? ""` (OM:87-107, :793; SCW:206). No hay override de DIMAS MX | PENDIENTE (DIMAS MX) |
| 37 | `cliente` | Cuenta vacía o inexistente → SIN FILA (`'sin cuenta'`, LCM:124, :257) · valor → LEFT(CTE.Cliente, 9) (LCM:173, :831) | Cuenta vacía o inexistente → SIN FILA (`sin cuenta`, OM:646-649) · valor → BP `Partner`, 10 dígitos, VarChar 10 (SCW:207, :281) | EQ-FUENTE (D2, D6; el ancho 10 es deliberado, PLAN:1696) |
| 38 | `utmSource` | NULL · `''` · LEFT 100 (LOM:637, LCM:174) | Sin `?? ""` (OM:795), Size 100 (SCW:208) | EQ |
| 39 | `die` | NULL siempre (SPD:132) | NULL (Bit, SCW:209) | EQ |
| 40 | `sucursal` (corr. 29/09) | 505 solo con storeId == `'viu'`, si no 504; nunca NULL (LCM:175) | `uen == 2 ? 505 : 504` (OM:796), con el `uen` exacto de OM:755 | EQ |
| 41 | `origen` | Clave ausente → `'PRODUCTOS MX'` · null explícito → NULL (no se envía; DEFAULT, SPD:134) · `''` → `''` · valor → LEFT 20 (LOM:646, LCM:176) | Ausente o null → `'PRODUCTOS MX'` · `''` → `''` · valor → LEFT 20 (ICR:74; OM:798; SCW:211) | BORDE (solo con null explícito; Magento no lo manda, MOM:705-708) · D7 |
| 42 | `fecha` | GETDATE() del servidor ServicioAndroid, DATETIME (SPD:162, :170, :326) | GETDATE() en el mismo batch: `DECLARE @fecha DATETIME; SELECT @fecha = GETDATE();` (SCW:38-39, :142). No hay parámetro `@fecha` | EQ (D8) |
| 43 | `confirmado` | 1 siempre (literal del SP, SPD:327) | 1 siempre (literal en `QueryInsert`, SCW:143) | EQ (D8) |
| 44 | `codigo` | NULL siempre; DIMAS asigna `@Articulo`, no `@codigo` (SPD:144, :177) | NULL (SCW:213) | EQ |
| 45 | `idMagento` | null → SIN FILA (compuerta conocida) · `''` → `''` · valor → LEFT 12 (LOM:629, LCM:177) | null → `'0'` (`?? "0"`, OM:799) · `''` → `''` · LEFT 12 (SCW:214) | PENDIENTE (compuerta; sin ella, LAN habría guardado NULL y no `'0'`) |
| 46 | `ClienteMagento` | NULL siempre; LAN no lo envía (SPD:145) | NULL (SCW:215) | EQ (Q13) |
| 47 | `MetodoEnvio` | NULL · `''` · LEFT 12, p. ej. `'tablerate_bestway'` → `'tablerate_be'` (LOM:424, LCM:178, SPD:147) | Sin `?? ""` (OM:800), Size 12 (SCW:216) | EQ |
| 48 | `estatus` | 0 siempre (no se envía; DEFAULT `@estatus INT = 0`, SPD:148) | 0 siempre: inicializador del modelo (SCM:113), enviado explícito (SCW:217) | EQ |
| 49 | `CodigoRecomendador` | NULL siempre; `codigo_promotor` se usa después del alta (LCM:203-206) | NULL (SCW:218) | EQ |
| 50 | `Agente` | NULL siempre (SPD:151) | NULL (SCW:219) | EQ |
| 51 | `SucursalDestino` | Ausente → 0 (int de C# enviado explícito, LCM:183; el DEFAULT también es 0, SPD:150) · valor → int | Igual (OM:805; SCM:117; SCW:220) | EQ |
| 52 | `RedimirMonedero` | Ausente → 0.00 · valor → MONEY(Convert.ToDecimal(float)) (LCM:184). `ISNULL(@RedimirMonedero, 0.00)` nunca se activa (SPD:336) | Igual: `(decimal)float` (OM:806), mismo redondeo; se conserva el ISNULL (SCW:152, :221, :298) | EQ (D8) |
| 53 | `ValidacionTelefono` | Se descarta el valor del llamador (LCM:185) y el SP lo recalcula. Si no hay Movil validado, no hay origen validado o el último SMS difiere del validado → 1 si `cliente` no empieza con `'P'`, 0 si empieza. En otro caso 0, también cuando no hay fila de SMS (ANSI_NULLS; SPD:4, :186-221) | La misma regla de tres valores en C# (SCW:27-28, :317-333, :640-668). Fuentes: A_GET_TelefonoValidado (SCW:482-525), CteTelSet más catálogo AWS (SCW:408-480) y TcAAEA00030 por `req.Cliente` (SCW:335-372). Prospecto = `ZtipoCliente` `'Prospecto'` (SCW:538-552) | EQ-FUENTE (D3, D4) · formato de ZtelCte pendiente |
| 54 | `OrigenIdMagento` | Clave ausente → `''` · null explícito → NULL · `''` → `''` · valor → LEFT 20 (LOM:644, LCM:186) | Ausente o null → `''` (`?? ""`, OM:807) · `''` → `''` · LEFT 20 (SCW:223) | BORDE (Magento siempre manda `?? ''`, MOM:726) |
| 55 | `LadaValidar` | Número elegido: el del SMS si Length > 0; si no, el CteTel validado, CONCAT(Lada,Telefono); si no, los dígitos del teléfono de envío (LOM:642, LCM:145-147). Valor = INT de su lada de 2 o 3 dígitos. SIN FILA si el número es corto o la lada no es numérica | El del SMS si no es espacio en blanco; si no, `ZtelCte` con Trim; si no, `ValidateOnlyNumbers(telefono ?? "0")` (OM:626, :654-656). Si falla, `int.TryParse` deja 0 (OM:758; SCW:224) | EQ-FUENTE (D4) · compuerta Q10 y G3-08 pendientes |
| 56 | `TelefonoValidar` | LEFT(resto del mismo número después de la lada, 10); SIN FILA si es corto (LCM:148, :188) | LEFT(resto después de la lada, 10); corto → `'0'` (OM:657, :809; SCW:225) | EQ-FUENTE (D4) · compuerta Q10 pendiente |
| 57 | `CURP` | NULL siempre (SPD:157) | NULL (SCW:226) | EQ |
| 58 | `FechaCita` | NULL siempre (SPD:158) | NULL (Date, SCW:227) | EQ |
| 59 | `HoraCita` | NULL siempre (SPD:159) | NULL (SCW:228) | EQ |

### 4.3 Recuento y notas

- **Recuento:** 37 EQ · 11 EQ-FUENTE · 9 PENDIENTE (filas 5, 15, 27, 28, 29, 30, 34, 36, 45) · 2 BORDE (41, 54) · 0 DIF.
- **Frente a wf4** (35 SAME, 9 ACCEPTED_SOURCE_CHANGE, 11 PENDING_KNOWN, 4 DIFFERENT):
  - `uen` y `sucursal` pasan a EQ (arreglo 3).
  - `sexo` y `estadoCivil` pasan a EQ-FUENTE (arreglos 1 y 2).
  - `fechaNacimiento` pasa de DIFFERENT a PENDIENTE: es una compuerta "sin fila" de la lista abierta.
  - `origen` pasa de DIFFERENT a BORDE. Es la misma clase de diferencia que `OrigenIdMagento`, que wf4 tenía como PENDING_KNOWN.
- **Los 20 defaults NULL del SP** coinciden: filas 4, 13, 14, 21-26, 31-33, 39, 44, 46, 49, 50 y 57-59.
- **Diferencias de formato dentro de EQ-FUENTE.** No cambian el NULL, el `''` ni el ancho, pero sí el texto:
  - **Mayúsculas.** LAN guardaba en MAYÚSCULAS nombres, entreCalles, RFC y sexo, porque así los daba de alta (CTN:116-132, :177-180). ServicioSAP guarda el texto como está en el BP (filas 1, 2, 3, 7, 12 y 20). Espera decisión (§5.1 #5).
  - **`ZtelCte` sin reducir a dígitos** (OM:626, SCW:391; PLAN:2229). Un `'+52…'` movería LadaValidar, TelefonoValidar y ValidacionTelefono (filas 53, 55 y 56). El ejemplo capturado es de tipo TRABAJO (CAP:55) y, según el usuario, la API desplegada filtra MOVIL.
  - **`Namemiddle`** no se lee (fila 3; Q19).
- **Fuera de estas 59 columnas.** El camino de contado lee `sDatosPedido[20]` como código postal, pero ahí va `estado` (PLAN:2221). No es del crédito.

#analisis_bd #credito

---

## 5. Pendientes

### 5.1 Decisiones del usuario

| # | Tema | Qué hay que decidir | Ids MATRIZ / PLAN |
|---|---|---|---|
| 1 | Compuertas "sin fila" | LAN no escribía fila en estos casos: nombres (`apellidoPaterno`, `apellidoMaterno`, `nombreClienteMavi`), `codigoPostal`, `incrementId`, `storeId`, `telefono`, `cantidad`, `entityId` o `telefonoClienteMavi` en null; sin fecha de nacimiento; si fallaba el guardado de la guía; con `articulos` vacío. También con un total no numérico o `forzarOrder` null. ServicioSAP escribe la fila con `''`, `'0'`, 0 o `1900-01-02`. ¿Se copian las compuertas (lanzar antes de OM:660) o se aceptan las filas? | G1-05, G1-07, G1-08, G1-18, G1-19, G1-20, G1-25, G2-10, G2-23, G2-29, G3-09, G5-04, G5-17; filas 5, 15, 27-30, 45, 55 y 56; Q10, Q11 |
| 2 | Error al buscar el teléfono | El SP insertaba aunque sus lecturas dieran NULL (SPD:186-208). ServicioSAP no escribe fila si fallan A_GET_TelefonoValidado (SCW:489-507), CteTelSet (SCW:431-440) o la lectura de SMS (SCW:366-371). Propuesta abierta: tratar el error como "no encontrado" e insertar, como el SP | G3-16, G3-19, G2-39 |
| 3 | Cupones (Q8) | ¿Se quita solo la quema en crédito (opción A) o toda la funcionalidad (opción B)? ¿Alguna comisión o reporte lee `VentasCupones` (D9)? Si se conserva, la paridad pide: TOP 1, sin validación previa, regenerar siempre, anchos 10/20, y quema y regeneración en un solo paso | G5-06, G5-07, G5-08, G5-27; PLAN §23.9 Q8; B3, B6 |
| 4 | DIMAS MX | ¿Está deprecado (PLAN:943, :2111)? Si sí, hay que rechazarlo o ignorarlo explícitamente; si no, portar el override de `CREDICCondicionArt` (SPD:174-183). Con D7 ya es alcanzable | G2-03; filas 34 y 36; Q15 opción B |
| 5 | Mayúsculas | ¿Se aplica `UPPER` a nombres, sexo, estadoCivil (y al entreCalles del BP) para igualar el texto de LAN? | G2-06, G2-07, G2-08, G2-12, G2-13, G2-18; filas 1-3, 7, 12 y 20 |
| 6 | Precio de las líneas | Fuente: SD29 o `PropreListaDFinal`. Con varias filas de precio por SKU, LAN insertaba una línea por coincidencia. `costo`: `spVerCosto`, 0 o NULL. Precisión float de SEGU00001 | G4-09, G4-21, G4-25, G4-29 a G4-37; Q16, Q18 |
| 7 | Staging `eCommerceDetPedidos` | Portar Limpiar+Insertar para crédito, o confirmar que nadie lo lee. La MATRIZ se contradice: G4-02 dice FALTA y G5-21, G5-22 y G5-23 dicen N/A (R7) | G4-02, G5-21, G5-22, G5-23 |
| 8 | Sustitución TELEFONIA | Cambio Region5/Region6: el negocio lo difirió (Q17) | G4-03, G4-12, G4-15 a G4-19 |
| 9 | Reproceso | ¿Se conserva o se retira `getOrderInfoAndSet` / `ReSetPedido` (GANTT:262)? | G1-04, G5-03 |
| 10 | Contrato HTTP del crédito | LAN respondía la cuenta y el DMZ de la era LAN la traducía a 400, 409, 422 o 500. ServicioSAP responde un objeto o 200 `Error, …`. Hay que acordarlo, o documentar que Magento ignora el cuerpo | G3-16, G5-25, G1-24, G5-14, G5-16 |
| 11 | Logs de más | ¿Se quitan los logs que LAN no tenía? `[CREDITO SIN CUENTA]` (OM:648, nuevo con D6), `[CREDIT ObtenerTelefonoAValidar ERROR]`, `[ORDER GetCondicion ERROR]` y la copia local del log | G5-20; Q20 |
| 12 | Limpieza de `ArmarFila` y `nombre` | Código que ya no se usa: ramas `maestro == null` (SCW:240-246, :252, :261, :281), `fila.Confirmado` (SCW:287), `Row.Fecha` y `Row.Confirmado` (SCM:220, :222) y los valores del request que se pisan (OM:773-775, :790). ¿`nombre = NameFirst + ' ' + Namemiddle` (Q19)? | G2-08, G2-14 |
| 13 | Clave de las búsquedas | ¿Se busca con el BP (`maestro.Partner`) en vez de la cuenta cruda (SCW:25, :27)? Así SMS y teléfonos usarían la misma clave que la fila (SCW:281) | G2-24, G3-18 |
| 14 | Abiertos de D1 y D3 | ¿SIGMavi por `Web.config` en vez de `Conexion.dll`? ¿Se agregan orígenes de la era SAP (p. ej. `CteXpressFrontSAP`) al catálogo? | D1, D3; G3-10 |

### 5.2 Otros equipos

| Tema | Dueño | Qué falta | Ids |
|---|---|---|---|
| Liberador y callback | Dueño del liberador | El contrato: endpoint, autenticación, payload con BP y qué significa `IdVenta` en SAP, más la URL de `authorizationResult`. Antes de encender el bloque, ServicioSAP debe corregir: cliente = `cuentaBp` (OM:690); ubicarlo dentro del try de líneas; async real (:700, :710); llaves `entityId`, `status`, `cuenta`, `idSolicitud` (hoy OM:1224-1227); no aceptar cualquier certificado (OM:1189); omitir prospectos; no dispararlo con `codigo_promotor` null | G1-22, G1-23, G5-09, G5-10, G5-11, G5-12, G5-26 |
| creditStatus y updateCreditOrderId | Quien defina dónde vive la decisión de crédito (Venta de Intelisis o SAP) | Portar las rutas y repuntear el DMZ. Hace falta un control de duplicados propio del crédito: SD36 nunca ve el crédito, así que el reenvío de la orden autorizada crearía otra solicitud y quemaría otro cupón | G5-02, G5-18, G5-19, G5-24 |
| Cuenta BP | Magento | Mandar el BP en `cuenta` (D2), y la misma cadena de BP en getSms y en order/new | G1-13, G3-18 |
| Ruteo de getSms y validateSms | DMZ | Siguen por `curl.Post` a `URL_INTELISIS` (DMZ CreditController.cs:76, :107) | G3-02 |
| `ZappOrig` del BP | Datos SAP BP / dueño del catálogo | Comprobar que coincide con los 23 `Valor1` (D3) | G3-10 |

### 5.3 Pendientes técnicos de ServicioSAP (no requieren una decisión nueva)

- **G4-24 / Q5.** La decisión existe, pero falta el visto bueno para aplicar la propuesta: validar y traducir la condición al inicio de la rama de crédito, antes de `SaveGuideAsync` (OM:1764) y del INSERT. Hoy se valida en OM:845-849, después de la cabecera.
- **G3-08.** Usar `!string.IsNullOrEmpty` en vez de `IsNullOrWhiteSpace` (OM:654) y quitar el `Trim` (OM:626), como el Length > 0 de LAN.
- **Bordes de `null` explícito:** filas 41 (`origen`) y 54 (`OrigenIdMagento`). Para igualarlos, el modelo tiene que distinguir "clave ausente" de "null".
- **B1.** Escapar el SKU en el `$filter` de SD29 (SS/Methods/SalesDistribution/FinalListProperMethods.cs:85).
- **B8.** `Directory.CreateDirectory` está fuera del try (SS/Helpers/Logger.cs:30), y Logger se llama desde bloques catch.
- **Reglas sin id** que propuso el crítico de wf5. No se les asigna id aquí; se agregan a la MATRIZ si el usuario las acepta:
  - a) el reenvío de la orden autorizada (§5.2, creditStatus);
  - b) el contrato HTTP del DMZ de la era LAN (§5.1 #10);
  - c) los null que abortaban LAN (§5.1 #1);
  - d) con `codigo_promotor` null, LAN no lanzaba el liberador (§5.2, liberador);
  - e) los anchos y el paso único del cupón (§5.1 #3).

  > **Corrección del verificador (2026-09-29).** La MATRIZ ya agregó estas reglas, con id y la marca "NUEVA 2026-09-29" en la columna Estado: a) = **G5-24** (PENDIENTE), b) = **G5-25** (DIF), c) = **G1-25** (PENDIENTE), d) = **G5-26** (EQ-R) y e) = **G5-27** (DIF). Suma una sexta que salió de la revisión por columna y no del crítico: **G3-19** (PENDIENTE), el error al buscar el teléfono (§5.1 #2). Siguen fuera de las 143 del recuento de §1 y conviene que el usuario las confirme.
- **G4-24 / Q5 frente a D5.** El PLAN §25.3 advierte que cortar al inicio (Q5) va contra la paridad de valores (D5). Con una condición desconocida, LAN igual escribía `SEGU00001`, quemaba el cupón y lanzaba el liberador (MATRIZ G4-24, fila del 2026-09-24). Si el usuario lo confirma, este punto sale de §5.3 y pasa a §5.1 (PLAN §25.5 #1).

#migracion #SAP #credito

---

## 6. Enlaces

- [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]]: las 143 reglas G1-G5, con su estado al 2026-09-24.
- [[PLAN_EJECUCION_SP_CREDITO_A_CODIGO]]: §22 a §24, con R1-R8, Q1-Q22, los bugs B1-B8, las correcciones de documentación y el plan de pruebas.
- [[FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO]]: diseño del SP pasado a código y decisiones de diseño D1-D10 del 2026-09-18.
- Relacionados: [[FLUJO_CREDITO_LAN_VS_SAP]], [[ANALISIS_SP_CREDITO_WEB_DATOS]], [[CAPTURAS_REALES_APIS]].

#migracion #SAP #credito #dotnet #analisis_bd
