# Comparativa de creación de cliente: `ClientToIntelisis` (LAN) vs `partner/client` (ServicioSAP)

> Documento de análisis + plantilla de verificación de paridad funcional del flujo de Business Partner.
> Base analizada: `\\CATECINF214058D\Migracion SAP` — solo lectura, sin cambios aplicados.
> Fecha de análisis: 2026-09-07

---

## 0. Respuesta corta: ¿la ruta ya quedó conectada?

**Sí, la ruta está conectada de extremo a extremo.** El DMZ ya no llama a Intelisis:

```csharp
// DMZ/WebApiMagento/Controllers/CustomersController.cs:26-30
// PENDIENTE INTELISIS:
// string response = curl.Post("customer/setCustomer", JsonConvert.SerializeObject(customer)).Trim('"');

// NUEVO SERVICIO SAP:
string response = curl.PostSAP("partner/client", JsonConvert.SerializeObject(customer)).Trim('"');
```

Magento → DMZ `customer/setCustomer` → ServicioSAP `partner/client` → `ZAPI_BP01_PARTNER_SRV/BPartnerSet`. El contrato de entrada (`CustomerRequest`) es idéntico campo por campo en los tres proyectos, salvo que el modelo de SAP añade `cp`.

**Pero conectada no es lo mismo que equivalente.** El análisis encontró 16 diferencias, 4 de ellas de severidad alta que rompen el caso de uso aunque el HTTP responda 200. La más grave es que **Magento ya no recibe el número de cuenta**: LAN devolvía un string con la cuenta y SAP devuelve el objeto `Client` completo, que el DMZ pasa tal cual.

---

## 1. Identificación de los dos flujos

| | LAN (legado) | ServicioSAP (destino) |
|---|---|---|
| Entrada HTTP | `POST customer/setCustomer` — `LAN/WebApiMagento/Controllers/CustomersController.cs:14` | `POST partner/client` — `ServicioSAP/.../Controllers/BusinessPartnerController.cs:55` |
| Método | `ClientToIntelisis(CustomerRequest)` — `Metodos/CustomerMethods.cs:16` | `BuildClientFromCustomerRequest` + `SubmitClientInfoAsync` — `Methods/BusinessPartner/BusinessPartnerMethods.cs:417` y `:74` |
| Tamaño | 100 líneas: arma un arreglo de 19 posiciones y ejecuta un SP | 350 líneas de mapeo a un objeto `Client` con 5 subestructuras |
| Destino | SP `SP_eCommerceCtenuevo` con 18 parámetros | `POST ZAPI_BP01_PARTNER_SRV/BPartnerSet?sap-client=110` |
| Retorno | `string` — la cuenta creada, o `"Incorrecto"` | Objeto `Client` deserializado de la respuesta de SAP |
| Errores | Sin `try/catch`: una excepción sube como 500 | `try/catch` → `BadRequest("Error, " + mensaje)` |
| Log | Ninguno | `Logger.SAP` con request y response completos |
| Actualización | El mismo SP (por `idMagento`) | `PATCH partner/client` con `Partner` poblado |

**El cambio de fondo.** LAN mandaba 18 escalares planos y dejaba que el SP resolviera todo: alta o actualización, número de cuenta, valores por defecto. SAP exige el objeto BP completo — datos fiscales, sociedad, cuenta de reconciliación, área de ventas, contacto, teléfono y domicilio del contacto — y el servicio los rellena con constantes. Ahí es donde se acumulan las diferencias.

---

## 2. El flujo, paso a paso

Leyenda: ✅ paridad · ⚠️ difiere · ❌ falta o es dato falso · 🔵 rediseño intencional

| # | Paso en LAN | Ref. LAN | Equivalente en SAP | Ref. SAP | Estado |
|---|---|---|---|---|---|
| 01 | Recibe `CustomerRequest` (11 campos) | `CustomersController.cs:15` | Recibe `CustomerRequest` (12 campos, añade `cp`) | `BusinessPartnerController.cs:55` | ✅ |
| 02 | Valida: ninguna. Un body nulo revienta en `int.Parse` | `CustomerMethods.cs:16` | `if (customer == null) return BadRequest(...)` | `BusinessPartnerController.cs:57` | 🔵 mejora |
| 03 | Arma `DataCustomer[19]`: `name`→apellido paterno, `lastName`→apellido materno, `lastName2`→nombre | `CustomerMethods.cs:18-38` | `name`→`NameFirst`, `lastName`→`NameLast`, `lastName2`→`NameLst2` | `BusinessPartnerMethods.cs:425-427` | ❌ BP-02 |
| 04 | Domicilio, RFC, CP, colonia, estado, país: se mandan *vacíos* al SP | `CustomerMethods.cs:22-31` | `Street` = `address`; `PostCode1`, `City1`, `City2` vacíos; `Region` fija `"JAL"` | `BusinessPartnerMethods.cs:497-503` | ⚠️ BP-09 |
| 05 | `storeCode` → UEN: `muebles_america`=1, `viu`=2, `mavi`=3 | `CustomerMethods.cs:41-49` | `viu`→Vkorg `05`; `muebles_america` y todo lo demás→`04`. **`mavi` no existe** | `BusinessPartnerMethods.cs:439-456` | ⚠️ BP-07 |
| 06 | — | — | `BuGroup="CLIE"`, `Ktokd="0110"`, `Bukrs="5510"`, `Akont="12120000"`, `Kalks="1"`, `Kdgrp="01"`, `Perrl="AM"` | `BusinessPartnerMethods.cs:476-560` | 🔵 nuevo |
| 07 | `gender` va como `@P14` tal cual | `CustomerMethods.cs:32` | `MapGender()`: H/HOMBRE/MASCULINO/1→`"1"`, M/MUJER/FEMENINO/2→`"2"`, resto→`"3"` | `BusinessPartnerMethods.cs:778` | 🔵 mejora |
| 08 | `dateBirth` **nunca se envía** al SP | — | `Birthdt` = `yyyyMMdd` y `ZfechaNac` = `/Date(epoch)/` | `BusinessPartnerMethods.cs:799`, `:814` | 🔵 nuevo |
| 09 | `phone` va como `@P17` | `CustomerMethods.cs:35` | `TelNumber` queda *vacío*; el móvil va a `TelnrLong` y a `toCteTel.ZtelCte` | `BusinessPartnerMethods.cs:432`, `:513` | ⚠️ BP-13 |
| 10 | RFC vacío | `CustomerMethods.cs:31` | `Stcd1 = "XAXX010101000"` fijo, `Rfc = ""` | `BusinessPartnerMethods.cs:524` | ⚠️ BP-10 |
| 11 | — | — | `toCte`: ~70 campos, casi todos en `""` o `"0.00"`; solo `ZidMagento` y `Zcompania` llevan dato | `BusinessPartnerMethods.cs:583-658` | ⚠️ BP-06 |
| 12 | — | — | `toCteTel`: `ZtipoCte="MOVIL"`, `ZvalTel=false`, `ZappOrig=""` | `BusinessPartnerMethods.cs:660-675` | ⚠️ BP-14 |
| 13 | — | — | `toCteCto`: contacto con `Zparentesco="CONYUGE"` y los datos *del propio titular* | `BusinessPartnerMethods.cs:676-702` | ❌ BP-05 |
| 14 | — | — | `toCteCtoDireccion`: `Zdire="TEST"`, `Zcolonia="TEST"`, `ZcodPostal="47504"`, `Zpobl="001"`, `Zestado="14"` | `BusinessPartnerMethods.cs:703-720` | ❌ BP-03 |
| 15 | `SP_eCommerceCtenuevo` recibe `idMagento` como `@P0` y resuelve alta o cliente existente | `CustomerMethods.cs:51-92` | `Partner = ""` siempre → cada POST crea un BP nuevo. Sin búsqueda previa | `BusinessPartnerMethods.cs:474` | ❌ BP-04 |
| 16 | — | — | Habilitar la combinación canal/organización (`EnableBpCombinationAsync`) está *comentada* | `BusinessPartnerMethods.cs:118-140` | ❌ BP-08 |
| 17 | Devuelve la cuenta (`dr.GetString(0)`) o `"Incorrecto"` | `CustomerMethods.cs:100-113` | Devuelve el objeto `Client` completo | `BusinessPartnerMethods.cs:146` | ❌ BP-01 |
| 18 | El DMZ pasa el string a Magento | `DMZ/CustomersController.cs:35` | El DMZ pasa el JSON a Magento sin transformar | `DMZ/CustomersController.cs:30-35` | ❌ BP-01 |

---

## 3. Hallazgos

| ID | Sev. | Hallazgo | Evidencia |
|---|---|---|---|
| **BP-01** | 🔴 Alta | **Magento ya no recibe el número de cuenta.** LAN devolvía un string con la cuenta creada; SAP devuelve el objeto `Client` completo y el DMZ hace `.Trim('"')` y lo reenvía tal cual. Cualquier código de Magento que espere la cuenta recibe ahora un JSON. | `CustomerMethods.cs:100-113` vs `BusinessPartnerMethods.cs:146` · `DMZ/CustomersController.cs:30-35` |
| **BP-02** | 🔴 Alta | **Los tres campos de nombre quedan cruzados.** LAN mapea `name`→apellido paterno, `lastName`→apellido materno, `lastName2`→nombre(s). SAP mapea `name`→`NameFirst`, `lastName`→`NameLast`, `lastName2`→`NameLst2`. Con el mismo payload de Magento, los clientes quedan con nombre y apellidos en posiciones distintas según el sistema. | `CustomerMethods.cs:20-22` vs `BusinessPartnerMethods.cs:425-427` |
| **BP-03** | 🔴 Alta | **Datos de prueba escritos en el BP.** El domicilio del contacto se manda con literales: `Zdire="TEST"`, `Zcolonia="TEST"`, `ZcodPostal="47504"`, `Zpobl="001"`, `Zestado="14"`. Todo cliente creado por esta ruta queda con esa dirección en SAP. | `BusinessPartnerMethods.cs:703-720` |
| **BP-04** | 🔴 Alta | **Sin idempotencia: cada POST crea un BP nuevo.** `Partner = ""` es incondicional y no hay consulta previa por `ZidMagento` ni por correo, aunque `GetFilterClientsAsync` ya existe. Un reintento de Magento genera un cliente duplicado en SAP. | `BusinessPartnerMethods.cs:474` · `BusinessPartnerController.cs:55-70` · `GetFilterClientsAsync` en `:252` |
| **BP-05** | 🟠 Media | **El cliente queda registrado como su propio cónyuge.** `toCteCto` crea un contacto con `Zparentesco="CONYUGE"` y `Znombre`/`Zapellidop`/`Zapellidom` del titular. | `BusinessPartnerMethods.cs:676-702` |
| **BP-06** | 🟠 Media | **El correo va en un campo de compañía.** `toCte.Zcompania = correo`. | `BusinessPartnerMethods.cs:641` |
| **BP-07** | 🟠 Media | **La UEN `mavi` no está contemplada.** LAN mapea `mavi`→3. SAP solo distingue `viu` (Vkorg 05) y `muebles_america` (04); cualquier otro valor, `mavi` incluido, cae al fallback de Muebles América. | `CustomerMethods.cs:41-49` vs `BusinessPartnerMethods.cs:439-456` |
| **BP-08** | 🟠 Media | **El BP nace solo en el canal de contado.** `VtwegKnvv` y `VtwegKnvp` son fijos `"01"`, y la llamada a `EnableBpCombinationAsync` que habilitaría el canal 02 (crédito) está comentada, con la nota de que debe pasar por un proceso interno. Hasta que ese proceso exista, el cliente no puede comprar a crédito. | `BusinessPartnerMethods.cs:118-140`, `:544` |
| **BP-09** | 🟠 Media | **El domicilio del BP queda incompleto.** `PostCode1`, `City1` y `City2` van vacíos y `Region` es fija `"JAL"`. El código lo documenta: Magento no manda el CP en este body. Sin embargo el modelo `CustomerRequest` de SAP **ya tiene el campo `cp`** y no se usa. | `BusinessPartnerMethods.cs:460-463`, `:497-503` · modelo en `Models/SAP/BusinessPartner/CustomerRequest.cs` |
| **BP-10** | 🟡 Baja | **Constantes sin origen documentado.** `Sort1`/`Sort2="ABC"`, `Marst="1"`, `Natio="MX"`, `Altkn="1234567890"`, `Stcd1="XAXX010101000"`, `Eikto="32556690"`, `Parnr="000000100"`, `Bukrs="5510"`, `Akont="12120000"`, `Ktokd="0110"`, `Awahr="100"`, `Antlf="9"`, `Lprio="02"`. Hay que confirmar cuáles son acuerdo con SAP y cuáles quedaron de pruebas. | `BusinessPartnerMethods.cs:476-560` |
| **BP-11** | 🟠 Media | **Un 400 de SAP le llega a Magento como 200 OK.** `Curl.PostSAP` atrapa la `WebException` y devuelve el texto `"WebException: … Body: …"`; el DMZ solo corta si el texto contiene `"Internal Server Error"`, y un `BadRequest` dice `"Bad Request"`. El error se entrega como respuesta exitosa. | `DMZ/Helper/Curl.cs:130-142` · `DMZ/CustomersController.cs:32-35` |
| **BP-12** | 🟠 Media | **Hay dos constructores de BP en paralelo y no coinciden.** `BuildClientFromCustomerRequest` (alta de cliente) y `BuildBpClientFromOrder` (alta implícita al crear una orden). Difieren en el mapeo de nombres, en el domicilio (`"TEST"` vs `"Domicilio Conocido"`), en `Altkn` y en `Stcd1`. El mismo cliente queda distinto según por dónde entre. | `BusinessPartnerMethods.cs:417` vs `Methods/Order/OrderMethods.cs:2514` |
| **BP-13** | 🟡 Baja | **`TelNumber` siempre vacío.** La variable `telefono` se inicializa en `""` y nunca se asigna; el teléfono solo llega por `TelnrLong` y `toCteTel.ZtelCte`. También deja vacío `toCteCto.Ztel`. | `BusinessPartnerMethods.cs:431`, `:511`, `:687` |
| **BP-14** | 🟡 Baja | **El BP nace con el teléfono sin validar.** `toCteTel.ZvalTel=false` y `ZappOrig=""`. El flujo de orden (`IsValidatedAsync`) decide la validación de crédito leyendo justamente esos dos campos, así que el cliente recién creado nunca aparece como validado. | `BusinessPartnerMethods.cs:660-675` · `Methods/Order/OrderMethods.cs:558-587` |
| **BP-15** | 🟡 Baja | **`storeCode` numérico se interpreta distinto.** SAP acepta `"1"`/`"2"` además de los nombres; LAN solo compara contra los nombres de tienda. Si Magento manda el número, LAN lo deja con UEN vacía y revienta en `int.Parse(uen)`. | `CustomerMethods.cs:41-49` vs `BusinessPartnerMethods.cs:443-451` |
| **BP-16** | 🟡 Baja | **`list` y `address` viajan pero no se usan igual.** `list` solo aplica a las listas negra/blanca y `address` alimenta a la vez `Street` y `NameCo` en SAP. Confirmar que duplicar la dirección en `NameCo` es intencional. | `BusinessPartnerMethods.cs:497`, `:499` |

### Lo que mejoró con la migración

- Validación de body nulo y manejo de excepciones en el controller, que LAN no tenía.
- `Logger.SAP` deja el request y el response completos; `ClientToIntelisis` no registraba nada.
- Normalización de género (`MapGender`) y de fecha de nacimiento, que antes se pasaban crudos o no se pasaban.
- `PATCH partner/client` y `PATCH partner/client/unircuenta` dan operaciones de actualización que en LAN no existían de forma separada.

---

## 4. PLANTILLA DE VERIFICACIÓN DE PARIDAD — FLUJO BP

> Una copia por release candidate. Cada fila se cierra con evidencia reproducible: el BP creado en SAP, el JSON de request y response del log, o la consulta OData. Una fila sin evidencia cuenta como no verificada.

### Sección A — Escenarios obligatorios

| Esc. | Escenario | Datos de entrada | Resultado esperado | LAN | SAP | Riesgo |
|---|---|---|---|---|---|---|
| B-01 | Alta de cliente Muebles América | `storeCode = muebles_america` | BP creado con Vkorg 04 | ☐ | ☐ | |
| B-02 | Alta de cliente VIU | `storeCode = viu` | BP creado con Vkorg 05 | ☐ | ☐ | |
| B-03 | Alta de cliente Mavi | `storeCode = mavi` | Definir el esperado | ☐ | ☐ | BP-07 |
| B-04 | `storeCode` numérico | `storeCode = "1"` / `"2"` | Mismo BP que con el nombre de tienda | ☐ | ☐ | BP-15 |
| B-05 | Nombre completo con tres partes | name, lastName y lastName2 poblados | Nombre y apellidos en el campo correcto | ☐ | ☐ | BP-02 |
| B-06 | Cliente sin apellido materno | `lastName2` vacío | BP válido, sin basura | ☐ | ☐ | BP-02 |
| B-07 | Reenvío del mismo cliente | Mismo `idMagento` dos veces | Un solo BP, no dos | ☐ | ☐ | BP-04 |
| B-08 | Cliente ya existente en SAP | `idMagento` ya registrado | Devuelve el BP existente | ☐ | ☐ | BP-04 |
| B-09 | Retorno a Magento | Alta exitosa | Magento recibe lo que espera guardar | ☐ | ☐ | BP-01 |
| B-10 | Error de SAP | Payload inválido | Magento recibe un error, no un 200 | ☐ | ☐ | BP-11 |
| B-11 | Con `dateBirth` | Fecha válida | `Birthdt` correcto en el BP | ☐ | ☐ | |
| B-12 | Sin `dateBirth` | Campo ausente | BP creado sin fallar | ☐ | ☐ | |
| B-13 | Género en cada formato | H, M, HOMBRE, MUJER, 1, 2, vacío | Mapeo correcto o vacío | ☐ | ☐ | |
| B-14 | Con `address` poblado | Dirección real | Domicilio real en el BP, no `"TEST"` | ☐ | ☐ | BP-03 |
| B-15 | Con `cp` poblado | CP real | CP y colonia resueltos por SEPOMEX | ☐ | ☐ | BP-09 |
| B-16 | Teléfono | Móvil de 10 dígitos | Teléfono consultable desde el flujo de orden | ☐ | ☐ | BP-13 · BP-14 |
| B-17 | Alta por orden vs alta por cliente | Mismo cliente por las dos rutas | El mismo BP, con los mismos datos | ☐ | ☐ | BP-12 |
| B-18 | Cliente para crédito | Alta y luego compra a crédito | El canal 02 queda habilitado | ☐ | ☐ | BP-08 |
| B-19 | Actualización | `PATCH partner/client` con Partner | Actualiza sin duplicar | ☐ | ☐ | |
| B-20 | Unir cuenta | `PATCH partner/client/unircuenta` | `ZidMagento` actualizado en el BP | ☐ | ☐ | |

### Sección B — Checklist de paridad por paso

| ID | Paso | Criterio de aceptación | Diagnóstico | Verif. | Evidencia | Responsable |
|---|---|---|---|---|---|---|
| Q-01 | Ruta conectada | El DMZ apunta a `partner/client` y responde | ✅ | ☐ | | |
| Q-02 | Contrato de entrada | Los 11 campos de Magento llegan completos a SAP | ✅ | ☐ | | |
| Q-03 | Contrato de salida | Magento recibe y guarda la cuenta o BP correctamente | ❌ BP-01 | ☐ | | |
| Q-04 | Mapeo de nombres | Nombre y apellidos en el campo que les corresponde | ❌ BP-02 | ☐ | | |
| Q-05 | Domicilio del contacto | Sin literales `"TEST"` en ningún BP productivo | ❌ BP-03 | ☐ | | |
| Q-06 | Idempotencia | Reenviar el mismo `idMagento` no duplica el BP | ❌ BP-04 | ☐ | | |
| Q-07 | Contacto y parentesco | El contacto refleja una relación real, no al titular | ⚠️ BP-05 | ☐ | | |
| Q-08 | Campo `Zcompania` | Contiene lo que SAP espera en ese campo | ⚠️ BP-06 | ☐ | | |
| Q-09 | Mapeo de UEN | Las tres tiendas de LAN resuelven a la organización correcta | ⚠️ BP-07 | ☐ | | |
| Q-10 | Canal de distribución | El BP queda habilitado en los canales que el negocio necesita | ❌ BP-08 | ☐ | | |
| Q-11 | Domicilio del BP | CP, colonia, municipio y estado reales | ⚠️ BP-09 | ☐ | | |
| Q-12 | Constantes de configuración | Cada valor fijo está confirmado con el equipo funcional | ⚠️ BP-10 | ☐ | | |
| Q-13 | Propagación de errores | Un fallo de SAP llega a Magento como fallo | ⚠️ BP-11 | ☐ | | |
| Q-14 | Un solo constructor de BP | Alta por cliente y alta por orden producen el mismo BP | ⚠️ BP-12 | ☐ | | |
| Q-15 | Teléfono | Consultable desde `GetClient` y desde el flujo de orden | ⚠️ BP-13 | ☐ | | |
| Q-16 | Validación telefónica | El estado inicial de `ZvalTel` es el que espera el flujo de crédito | ⚠️ BP-14 | ☐ | | |
| Q-17 | Género y fecha | Normalizados y aceptados por SAP en todos los formatos | ✅ | ☐ | | |
| Q-18 | Trazabilidad | `Logger.SAP` deja request y response de cada alta | ✅ | ☐ | | |
| Q-19 | Concurrencia | Dos altas simultáneas del mismo cliente producen un solo BP | ❌ BP-04 | ☐ | | |
| Q-20 | Rendimiento | El alta responde dentro del timeout que Magento tolera | ⚠️ | ☐ | | |

### Sección C — Paridad campo a campo

| Campo de Magento | LAN · parámetro del SP | SAP · campo del BP | ¿Coincide? | Nota |
|---|---|---|---|---|
| `idMagento` | `@P0` (int) | `toCte.ZidMagento` (int) | ☐ | |
| `name` | `@P1` — apellido paterno | `NameFirst` — nombre | ☐ | BP-02 |
| `lastName` | `@P2` — apellido materno | `NameLast` — apellido paterno | ☐ | BP-02 |
| `lastName2` | `@P3` — nombre(s) | `NameLst2` — apellido materno | ☐ | BP-02 |
| `address` | `@P4` — se manda vacío | `Street` y `NameCo` | ☐ | BP-16 |
| `email` | `@P15` | `SmtpAddr` y `toCte.Zcompania` | ☐ | BP-06 |
| `gender` | `@P14` crudo | `Gender` vía `MapGender` | ☐ | |
| `phone` | `@P17` | `TelnrLong` y `toCteTel.ZtelCte` | ☐ | BP-13 |
| `storeCode` | `@P16` — UEN 1/2/3 | `VkorgKnvv` 04/05 y `NameOrg1` | ☐ | BP-07 |
| `dateBirth` | no se envía | `Birthdt` y `toCteCto.ZfechaNac` | ☐ | |
| `cp` | no existe | no se usa | ☐ | BP-09 |
| RFC | `@P13` vacío | `Stcd1` fijo genérico | ☐ | BP-10 |
| — | — | `toCteCtoDireccion` con literales `"TEST"` | ☐ | BP-03 |

### Sección D — Criterios de cierre

- [ ] Los 20 escenarios de la sección A ejecutados, con el BP resultante consultado en SAP.
- [ ] Ningún hallazgo de severidad alta abierto: BP-01, BP-02, BP-03, BP-04.
- [ ] Confirmado con Magento qué espera recibir de `customer/setCustomer` y ajustado el DMZ o el servicio.
- [ ] Confirmado con el negocio el orden real de `name` / `lastName` / `lastName2` que envía Magento.
- [ ] Ningún BP productivo con dirección `"TEST"`; los ya creados, identificados y corregidos.
- [ ] `BuildClientFromCustomerRequest` y `BuildBpClientFromOrder` unificados, o documentada la razón de mantenerlos separados.
- [ ] Cada constante del payload BP validada con el equipo funcional de SAP.
- [ ] Un fallo de SAP produce un fallo visible en Magento.

### Sección E — Registro de decisiones

| # | Punto en duda | Decisión | Quién | Fecha |
|---|---|---|---|---|
| 1 | ¿Qué espera Magento como respuesta de `setCustomer`: la cuenta, el BP, o el objeto completo? | | | |
| 2 | ¿Cuál es el orden real de `name` / `lastName` / `lastName2` en el payload de Magento? | | | |
| 3 | ¿`SP_eCommerceCtenuevo` resolvía el cliente existente por `idMagento`, o también daba de alta duplicados? | | | |
| 4 | ¿La habilitación del canal 02 se automatiza, o queda como proceso manual interno? | | | |
| 5 | ¿`mavi` sigue vivo como tienda, o se puede descartar? | | | |
| 6 | ¿Qué valor corresponde a `Zcompania` y a `toCteCto.Zparentesco` en un alta de ecommerce? | | | |
| 7 | ¿Se integra `cp` al body de Magento para poder resolver colonia y municipio con SEPOMEX? | | | |
| 8 | ¿Cuáles de las constantes del payload BP son acuerdo con SAP y cuáles quedaron de pruebas? | | | |

---

## 5. Preguntas abiertas

1. **`"TEST"` en el domicilio del contacto** — ¿ya se crearon BPs productivos con esa dirección? Si es así, conviene identificarlos antes de que se acumulen.
2. **El retorno a Magento** — es lo primero que hay que cerrar: si Magento guardaba la cuenta y ahora recibe un JSON, el vínculo cliente-cuenta se rompe en silencio.
3. **El cruce de nombres** — necesito el payload real de Magento para saber cuál de los dos mapeos es el correcto; el código de LAN y el de SAP se contradicen.
4. **Los dos constructores de BP** — ¿se unifican, o el alta por orden y el alta por cliente son casos de negocio distintos a propósito?
