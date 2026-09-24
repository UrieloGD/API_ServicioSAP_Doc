# Datos reales capturados de las APIs — 2026-09-21

Todo lo de aquí sale de responses reales aportados por el usuario. **Es evidencia, no inferencia.**

---

## 1. `ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='1500004598',Client='110')`

Host: `10.30.2.135:44300`

### `to_Cte` (la entidad `BusinessCteSet`, clave `Client` + `ZclienteBp`)

Valores reales:
```
ZclienteBp "1500004598"   ZentCalles "MINA"        ZantigMeses 0 (NUMERO)   ZantigAnios 0 (NUMERO)
Zcurp ""                  Zcredito "0.1 CLIENTE (AAA)"   Zprospecto ""      Zagenteserv ""
Zcreditoesp "0"           Zcrmimporte "12345678.200"     Zcrmcantidad "12345678.20"
Zfecha4 "20260817091824"  Zusuariopos ""           ZidTipoCalles ""         ZidestatSup ""
ZrecomendPor "002"        ZimporRent "0.000"       ZviveencCal ""           ZantigNeg 0 (NUMERO)
ZpartentRec ""            ZdirRecom ""             ZserieMon ""             ZlimCred "60000.000"
ZidAval ""                Zlcaxsi "0.000"          ZidMagento 0 (NUMERO)    ZingMensCredw "0.000"
ZlimCedDimae "0.000"      ZidTipoDima ""           Zirreg "0"               ZnegBc "0"
ZserieMonViu ""           Znipventa ""             Znipcobro ""             ZreestrucDeud "0"
ZclabeCuenta ""           ZlcaxsiMay "0.000"       ZtipoCredito ""          ZcpaxaMay "0.000"
ZingresoTip ""            Zbanco ""                ZctaClabeValid ""        ZfolioPagMay ""
ZvalorPagMay "0.00"       ZapoyoVtaDima 0 (NUM)    ZidCtaClDisp 0 (NUM)     ZapoyCobr ""
ZretApoyCobr ""           ZintSolApoy 0 (NUM)      ZtotalAsign 0 (NUM)      ZnivEsp ""
Zcompania ""              ZcodSms 0 (NUMERO)       ZsmsValid ""             ZfechValid "0"
ZdoctoValid ""            ZidTipoBf ""             ZviveCon ""              ZfechCateg "0"
ZusuarioIrreg ""          ZfechaIrreg null         ZmotivoIrreg ""          ZsinBoifBf ""
ZmapLat ""                ZmapLong ""              ZreestDeuda ""           ZusValidTarj ""
ZidVivEnCalid ""          Zcita ""                 ZnumPag 0 (NUMERO)       ZfecUltPag null
ZtipoCliente "Nuevo"
```

**HECHOS CLAVE:**
- **`ZtipoCliente` ∈ {"Nuevo","Prospecto"}** — el usuario confirmó: `"Prospecto"` = sigue siendo prospecto; `"Nuevo"` = ya pasó a cliente. **ESTE es el discriminador de prospecto**, NO el prefijo `'P'` del `SP:216`, NO el consecutivo de `SP_GeneraConsecutivoCteMavi`.
- **`Zprospecto` existe y está VACÍO** — es otro campo, NO es el discriminador.
- **Las fechas de `to_Cte` NO son `/Date(ms)/`**: `Zfecha4 = "20260817091824"` es string `YYYYMMDDHHMMSS`; `ZfechValid` y `ZfechCateg` son `"0"` (string). `/Date(ms)/` sí aparece en la cabecera del BP y en `to_CteTel`.
- **Decimales como STRING con precisión variable**: `Zcrmimporte` 3 decimales, `Zcrmcantidad` 2, `ZlimCred` 3, `ZvalorPagMay` 2.
- **Enteros como NÚMERO**: `ZantigAnios`, `ZantigMeses`, `ZantigNeg`, `ZidMagento`, `ZcodSms`, `ZapoyoVtaDima`, `ZidCtaClDisp`, `ZintSolApoy`, `ZtotalAsign`, `ZnumPag`.
- 🔴 **`Zcrmcantidad` = "12345678.20" y `ZlimCred` = "60000.000"** — son números MUY distintos. El SP `GetSaldo` lee `CRMCantidad` → `Zcrmcantidad`.
- 🔴 **`ZrecomendPor` = "002", NO está vacío.** `ServicioSAP` lo manda quemado a `""` (`BusinessPartnerMethods.cs:599`, `OrderMethods.cs:2869`), igual que `ZdirRecom` (`:604`, `:2874`). Al actualizar, lo pisaría.
- **`Zcredito` NO es número**: vale `"0.1 CLIENTE (AAA)"`, que es texto y **existe como fila en el catálogo `ZCTE_CREDITO`** (ver §4).
- **Campos que siguen VACÍOS y el SP sí tenía dato**: `Zcurp`, `ZviveencCal`, `ZingMensCredw` ("0.000"), `ZantigAnios`/`ZantigMeses` (0), `Zcita`, `Znipventa`, `ZcodSms` (0), `ZsmsValid`, `ZtipoCredito`.

### `to_CteTel` (6 teléfonos)

| ZidcteTel | ZtipoCte | ZtelCte | Zfecha | Zvaltel |
|---|---|---|---|---|
| `"1"` | `"particular"` (minúsculas) | 7584925 | `/Date(1766966400000)/` | false |
| `"1211"` | `"FIJO"` | 3336345297 | **null** | false |
| `"0000001212"` | `"MOVIL"` | 3338007830 | **null** | false |
| `"0000000002"` | `"MOVIL"` | 7481532 | **null** | false |
| `"0"` | `"TRABAJO"` | +523333333333 | **null** | **true** |
| `"0000001213"` | `"MOVIL"` | 5522122584 | `/Date(1786579200000)/` | **true** |

- **El casing es `Zvaltel`** (t minúscula).
- **`ZidcteTel` sin padding uniforme**: convive `"1"`, `"0"`, `"1211"` con `"0000001212"`.
- **`Zfecha` null en 4 de 6.**
- **`ZtelCte` sin formato**: 7 dígitos, 10 dígitos, y con `+52`.

### Otros nodos relevantes
- `to_CteSociedad`: `Akont ""`, `Altkn "1234567890"`, `Zterm ""`.
- `to_CteDatosComerciales`: 6 filas, `Vkorg` 01/02/03 × `Vtweg` 01/02, **`Spart` = "00" en todas** (NO "01"). `Antlf "0"`, `Eikto ""`, `Waers "MXN"`, `Ktgrd "01"`, `Vsbed "01"`, `Lprio "02"`, `Awahr "100"`. **`Kvgr4` varía: "SI" en cuatro, "NO" en 02/02/00, "" en 03/02/00.**
- `to_CteImpuestos`: `Aland "MX"`, `Tatyp "TMX1"` → `Taxkd "1"`; `Tatyp "TMX2"` → `Taxkd "0"`.
- `to_CteCliente`: `Ktokd "CLIE"`, `Stcd1 "MEHE700514CP7"` (el RFC), `Stkzn "X"`.
- `to_CteContacto`: **1 fila totalmente vacía** con `ZidcteCto ""` — contacto fantasma.
- `to_CtePersonaContacto`: `results: []`.
- Cabecera: `NameLast "MEDINA"`, `NameFirst "ELIZABETH"`, `NameLst2 "HERRERA"`, `Gender "9"`, `Xsexu true`, `Birthdt "/Date(11491200000)/"`, `Natio "MX"`, `LanguCorr "ES"`, `BuGroup "CLIE"`, `Natpers "X"`.

---

## 2. `CteTel` del BP `1500008218` — tres endpoints

Host: `10.30.2.135:20400` (¡PUERTO DISTINTO al de BP05!). Servicio `ZQBP_EDITARCLIENTE_SRV`, entity set `CteTelSet`, clave `(Partner, ZidcteTel)`.

**`AI_GET_ZSDT_CTETEL?Partner=1500008218` y `AS_GET_ZQBP_EditarCliente_CteTel?Partner=1500008218` devolvieron EXACTAMENTE lo mismo, byte por byte:**

| ZidcteTel | ZtipoCte | ZtelCte | Zfecha | Zvaltel | ZappOrig |
|---|---|---|---|---|---|
| `"1"` | `"PARTICULAR"` (MAYÚSCULAS) | 3334523423 | `/Date(1788825600000)/` | **false** | `CteXpressFrontSAP` |
| `"0000000002"` | `"MOVIL"` | 3352323422 | `/Date(1788825600000)/` | **false** | `CteXpressFrontSAP` |

- **14 campos** (no 13): `Client, Partner, ZidcteTel, ZtipoCte, ZtelCte, Zfecha, Zenvionip, Zvaltel, ZappOrig, ZfechaCap, ZtelExist, ZtraeTel, Zintentos, ZtipoValid`. `Client = "110"` va en la respuesta pero **NO en la clave**.
- `Zenvionip`, `Zvaltel`, `ZtelExist`, `ZtraeTel` son **booleanos reales** (`false`, no `"false"`).
- `Zintentos = ""` (en el otro BP había `"0"` y `""`).
- **Los dos comparten `Zfecha` y `ZfechaCap` idénticos.**

**`A_GET_TelefonoValidado?sCliente=1500008218` devolvió:**
```json
[ { "ZtelCte": "3352323422", "ZvalTel": false } ]
```
- 🔴 **Renombra el campo: `Zvaltel` → `ZvalTel`** (T mayúscula). SAP usa `Zvaltel` en los dos servicios.
- 🔴 **El SP con estos datos devolvería VACÍO** (`WHERE Tipo='Movil' AND ValidacionTel=1` — ninguno validado). La API devuelve un teléfono no validado.
- Con este BP el `max()` acierta por casualidad (mismas fechas → desempata por id, y el id alto es el MOVIL). Con el BP `1500004598` NO acierta (nulls en `Zfecha` → `str(None)="None"` gana la comparación de cadenas → devuelve `3338007830`, no validado, en vez del `5522122584` validado que daría el SP). **El defecto es intermitente según los datos.**

---

## 3. `A_GET_BPValidaTelefonoCOFETEL?telefono=3334523423`

```json
{ "existe": true, "tipoRed": "MOVIL", "razonSocial": null,
  "modalidad": null, "poblacion": null, "estado": null }
```

- 🔴 **CONTRADICCIÓN**: el mismo teléfono `3334523423` está en `CteTel` como `ZtipoCte "PARTICULAR"` y COFETEL dice `tipoRed "MOVIL"`. **El SP filtra por el primero.**
- La forma de éxito es **de la lambda `L_GET_BPValidaTelefonoCOFETEL`**, devuelta verbatim. Su código NO está en el share.
- **4 de 6 campos null.** Solo `existe` y `tipoRed` son utilizables.
- **El catálogo `1138ValAutLadaTel` NO es un catálogo de validación**: su único uso es decidir si la lada tiene 2 o 3 dígitos (`if telefono[:2] está en el catálogo → nir=[:2],serie=[2:6],numero=[6:]` else `nir=[:3],serie=[3:7],numero=[7:]`).
- **CUATRO formas de respuesta distintas, tres de ellas con HTTP 200**: `{valido,motivo}` (guardas), `{error}` (falla HANA), `{existe,tipoRed,...}` (éxito), y 500 `{detail}`.
- Fuentes: HANA Cloud (`CONFIGURACIONCATALOGOS`) + SQL Server `SIGMavi` tabla `CREDICCOFETEL` vía lambda AWS. **Ninguna está en S/4.**

---

## 4. `AS_GET_TipoCredito` sin filtros — catálogo `ZTIPO_CTE`, 21 filas

Envoltorio: **`{"statusCode": 200, "result": [...]}`** (el código devuelve `result` completo).

12 columnas: `MANDT, ZID_TIPO_CTE, ZTIPO_CREDITO, ZTEXT_MOSTRAR, ZDESCRIP, ZMOSTRAR_CTE_EXP, ZMENS_USUAR, ZREF_PERS1, ZDOM_REF1, ZREF_PERS2, ZDOM_REF2, ZSOLIC_DOM_CAMP`. `MANDT="110"` en las 21. `ZID_TIPO_CTE` es `0000000001`..`0000000021`, los 21 consecutivos sin huecos.

| id | ZTIPO_CREDITO | ZTEXT_MOSTRAR | REF_PERS1 | DOM_REF1 | REF_PERS2 | DOM_REF2 | SOLIC_DOM_CAMP | MOSTRAR_CTE_EXP |
|---|---|---|---|---|---|---|---|---|
| 01 | Credito Normal | NORMAL | 1 | 1 | 1 | 1 | 0 | 1 |
| 02 | Credito Express | E X P R E S S | 1 | 0 | 1 | 0 | **1** | 1 |
| 03 | Credito Relacionado | RELACIONADO | 1 | 0 | 1 | 0 | 0 | 1 |
| 04 | Credito Relacionado con Diferente Domicilio | DIF DOM RELACIONADO | 1 | 1 | 1 | 1 | 0 | 1 |
| 05 | Credito Agil | AGIL | **0** | 1 | 1 | 1 | 0 | 1 |
| 06 | Credito Agil Calzado | Calzado | `""` | `""` | `""` | `""` | `""` | 0 |
| 07 | Credito DIMA | DIMA | 1 | 1 | 1 | 1 | 0 | 1 |
| 08 | Credito Seguro Express | Seguro Express | `""` | `""` | `""` | `""` | `""` | 1 |
| **09** | **Credito Internet** | **I N T E R N E T** | **0** | **0** | **0** | **0** | **1** | 0 |
| 10 | Credito de Confianza | DE CONFIANZA | 1 | 1 | 1 | 1 | 0 | 1 |
| 11 | Credito Afiliador Dima | AFILIADOR DIMA | 1 | 0 | 1 | 0 | 0 | 1 |
| 12 | Credito Venta Cruzada | VTA CRUZADA | `""` | `""` | `""` | `""` | `""` | 0 |
| 13 | Credito Inmediato | CREDITO INMEDIATO | 1 | 1 | 1 | 1 | 0 | 1 |
| 14 | Credilana Empresario | CREDILANA EMPRESARIO | 1 | 1 | 1 | 1 | 0 | 0 |
| 15 | Credito Dineralia | DINERALIA | 0 | 0 | 0 | 0 | 0 | 0 |
| **16** | **Credito Internet 2** | **I N T E R N E T 2** | **0** | **0** | **0** | **0** | **1** | 0 |
| 17 | Credito Referenciado | REFERENCIADO | 1 | 1 | 1 | 1 | 0 | 0 |
| 18 | Credito Creditazzo | CREDITAZZO | 1 | 1 | 1 | 1 | 0 | 1 |
| 19 | Credito Cambaceo | CAMBACEO | `""` | 0 | 0 | 0 | 0 | 0 |
| **20** | **Credito App credilana** | **APP CREDILANA** | **0** | **0** | **0** | **0** | 0 | 0 |
| **21** | **Credito APP Viu** | **APP VIU PRESTAMOS** | **0** | **0** | **0** | **0** | 0 | 0 |

`ZDESCRIP` de `16`: *"Captura corta, solicitud sin consulta a buro"*.

**HECHOS CLAVE:**
- 🔴 **Los candidatos de ecommerce (09 Internet, 16 Internet 2) tienen las 4 banderas de referencias en `0`** → el catálogo dice que **NO se piden referencias personales**. Lo mismo `20` (App credilana) y `21` (APP Viu).
- 🔴 **Las 5 banderas tienen TRES estados: `"1"`, `"0"` y `""`.** Filas 06, 08, 12 tienen las cinco en `""`; la 19 mezcla `""` con `"0"` en la misma fila.
- 🔴 **`"0"` es centinela de "sin texto"** en `ZDESCRIP` y `ZMENS_USUAR` (filas 09, 12, 15, 19, 20, 21 lo traen en las dos; 16 y 17 solo en `ZMENS_USUAR`).
- **`ZTEXT_MOSTRAR` trae formato dentro del dato**: `"I N T E R N E T"`, `"E X P R E S S"`. Nada puede comparar por ese campo.
- **El orden de llegada no es determinista**: `20,18,17,16,15,14,13,12,11,10,9,8,7,6,4,3,5,1,21,2,19`. No hay `ORDER BY`.

---

## 5. `AS_GET_ZCTE_CREDITO` sin filtros — catálogo `ZCTE_CREDITO`, 45 filas

Envoltorio: **ARRAY PELADO** `[...]` — ¡DISTINTO del hermano! El código devuelve `result["result"]` (`AS_GET_ZCTE_CREDITO.py:59`) mientras `AS_GET_TipoCredito.py:83` devuelve `result`. **Dos rutas hermanas, dos envoltorios.**

13 columnas: `MANDT, ZCREDITO, ZCON_CREDITO, ZCON_LIMITE_CRED, ZLIMITE_CREDITO, ZCON_LIMITE_PEDID, ZLIMITE_PEDIDOS, ZMONEDA_CRED, ZCON_DIAS, ZDIAS, ZCON_CONDICIONES, ZCONDICIONES, ZCALIDAD_EN_QUE_VIVE`.

**Constantes en las 45 filas:** `MANDT "110"`, `ZCON_CREDITO "1"`, `ZCON_LIMITE_CRED "0"`, **`ZLIMITE_CREDITO 0` (NÚMERO)**, **`ZLIMITE_PEDIDOS 0` (NÚMERO)**, `ZMONEDA_CRED "Pesos"`, `ZCON_DIAS "0"`, **`ZDIAS ""`**, `ZCON_CONDICIONES "0"`, **`ZCONDICIONES ""`**.

**Lo único que varía:** `ZCREDITO` (la llave, texto libre), `ZCALIDAD_EN_QUE_VIVE`, y `ZCON_LIMITE_PEDID` (`"0"` en la mayoría, `""` en 5 filas: DINERALIA, CREDILANA EMPRESARIO, CLIENTE HUESPED SIN BURO, AFILIADOR DIMA, 0.1 CLIENTE (AAA)).

**Estructura: 19 políticas numeradas × 2 variantes (con y sin sufijo `(COLOCACION)`) = 38, más 7 sueltas = 45.**

Las 19 numeradas: `1.1 PROP COMPRUEBA`, `1.1.1 AVAL PROP COMPRUEBA`, `1.2 PROP ESPECIAL`, `1.2.1 AVAL POLITICA ESPECIAL`, `1.3 PROP NO COMPRUEBA C/BURO`, `1.3.1 AVAL CON BURO`, `1.4 PRP NO COMPUEBA DE RIESGO`, `1.4.1 AVAL DE RIESGO`, `2.2 CLIENTE POLITICA ESPECIAL`, `2.2.1 AVAL NP/INTS SI COMPROBO`, `2.3 CLIENTE NP/INTS NO COMP C/BURO`, `2.3.1 AVAL NP/INTS SI COMP C/BURO`, `2.4 CLIENTE NP/INTS NO COMP DE RIESGO`, `2.4.1 AVAL NO COMPRUEBA DE RIESGO`, `3.3 CLIENTE RENTA C/BURO`, `3.3.1 AVAL RENTA CON BURO`, `3.4. CLIENTA RENTA DE RIESGO`, `3.4.1 AVAL RENTA DE RIESGO`, `4.1 CLIENTE HUESPED CON BURO`.

Las 7 sueltas: `DINERALIA`, `CREDILANA EMPRESARIO`, `CLIENTE HUESPED SIN BURO`, `CLIENTE EXPRESS R/P`, `AFILIADOR DIMA`, **`0.1 CLIENTE (AAA)`**, `0.0 CLIENTE EXPRESS`.

Valores de `ZCALIDAD_EN_QUE_VIVE` observados: `NO APLICA`, `HUESPED SIN BURO`, `EXPRESS`, `HUESPED CON BURO`, `AVAL RENTA`, `RENTA`, `AVAL RENTA CON BURO`, `RENTA CON BURO`, `AVAL RIESGO`, `NO PAGA - INTESTADO NO COMPRUEBA`, `AVAL NO PAGA - INTESTADO CON BURO`, `NO PAGA - INTESTADO NC CON BURO`, `AVAL NO PAGA - INTESTADO`, `NO PAGA - INTESTADO`, `PROP NO COMPRUEBA`, `AVAL CON BURO`, `PROP NC CON BURO`, `AVAL PROPIETARIO`, `PROPIETARIO`, `PROPIETARIO, NO PAGA E INTESTADO`. **Es many-to-one: varias políticas comparten la misma calidad**, así que NO se puede derivar la política desde la calidad.

**HECHOS CLAVE:**
- ✅ **ENLACE CONFIRMADO**: `to_Cte.Zcredito` del BP05 vale `"0.1 CLIENTE (AAA)"` y **esa fila existe en este catálogo**. La llave es **texto libre**, no un código.
- 🔴 **`ZLIMITE_CREDITO` = 0 en las 45 filas.** Este catálogo **NO lleva límites de crédito**. El límite es por cliente (`Zcrmcantidad`), no por política. **Y ninguna columna trae SALDO** → el saldo CXC sigue sin equivalente.
- 🔴 **Una llave está TRUNCADA a exactamente 50 caracteres**: `"2.4 CLIENTE NP/INTS NO COMP DE RIESGO  (COLOCACION"` — le falta el `)` de cierre. Es la columna llave, así que una búsqueda por el nombre completo NO la encuentra. Sugiere `VARCHAR(50)`.
- `ZDIAS` y `ZCONDICIONES` vacíos en las 45: columnas existentes, sin uso.
- **Tipos mezclados**: `ZLIMITE_CREDITO` y `ZLIMITE_PEDIDOS` son NÚMERO; las otras 11 son string.

---

## 6. Recordatorios de contrato ya verificados (de lectura de código, no de captura)

- **`AS_PATCH_ZSDT_CTE`** (`AS_ZQBP_CTE.py:173-217`): `session.patch` a `ZSDT_CTE_ODATA_SRV/ZSDT_CTE_ENTITYSet(ZclienteBp='…')`, payload que cubre **todo el `Cte`** con todos los campos `Optional` y `exclude_none=True`. **NO viene en el listado del usuario — lo introdujo Claude.**
- **`AS_POST_ZQBP_EditarCliente_CteTel`**: la ruta **genera `ZidcteTel` en cliente** con `max()+1` formateado a 10 dígitos, pisando lo que mande el llamador. Race condition.
- **`AS_PUT_ZQBP_EditarCliente_CteTel`** y **`AS_PUT_ZQBP_EditarCliente_CteLimiteCred`** usan **PUT**, que la decisión **D10** prohíbe. Sin confirmar si el servicio acepta PATCH.
- **`A_POST_GuardarTelefonoCte`**: 9 campos obligatorios, **usa solo 3** (`Cliente`, `TelefonoMovil`, `IngresadoEn`); los otros 6, **incluida `Lada`**, se exigen y se tiran.
- **`AS_PATCH_BusinessPartner` está ROTO**: el parámetro no lleva anotación de tipo, FastAPI lo trata como query param string, y `cliente.dict()` revienta → **500 siempre**.
- **`A_POST_EnviarSMS`** (WS `WsMensajeria`) y **`A_POST_SMSEnviar`** (lambda `L_POST_EnvioMensaje-dev`) **no van a SAP** y ninguno tiene contrato legible.
- **`ServicioSAP` no usa NINGUNO de estos endpoints hoy**: 0 resultados de `ZQBP_EDITARCLIENTE_SRV` en todo el C#. Solo toca `ZAPI_BP01_PARTNER_SRV` y `ZAPI_BP05MA_SRV`.

---

## 7. `ZAPI_PROPRELIST_SRV/PropreListSet?$filter=Articulo eq 'PRIN00043'` — 2026-09-23

Host: `vhmvods4ci.sap.svrwes4h.com:44300`. Tipo: `ZAPI_PROPRELIST_SRV.PropreList`.
Clave compuesta: `Idproprelistadfinal, Lista, Sucursal, OrgVtas, CDistr, Sector, Articulo`.

### Los 45 campos

`Idproprelistadfinal, Lista, Sucursal, OrgVtas, CDistr, Sector, Articulo, Precio, Condicion, Vigente, Anexo, Anexoanterior, Fechamodificacion, Factor01, Descripcion, Abono, Preciopp, Abonopp, Tipoplazo, Oferta, Diseno, Formato, DisenoFormato, Amazon, Linio, Contcomeexpo, Contcomeexpopagodife, Modi, MotivoCambio, Preciosiniva, Envio, Superpromo, Precioref, Precioppcn, Abonoppcn, Gara01, Gara02, Precgara01, Precgara02, Nombre, Accionaplicada, Descuentoliquidacion, Descripcionarticulo, Descuentocategoria, Fechadescuentocategoria, Fechapromocion, Precioreactivado, Abonoreactivado`

**HECHOS CLAVE:**

- ✅ **`Descuentocategoria` EXISTE.** Es el campo que bloqueaba el calculo de `SpVTASInsertArtSolCreditoLinea` (SP:249, SP:255). **Casing exacto: `Descuentocategoria`**, con `c` minuscula en "categoria" — el SP lo escribe `DescuentoCategoria`. `System.Text.Json` es case-sensitive: sin `[JsonPropertyName]` exacto no liga.
- 🔴 **El modelo `FinalListProper` mapeaba 11 de 45 campos.** Los otros 34 llegaban y se descartaban en silencio. Es el mismo patron que ya habia pasado con `Abono`. Añadido `Descuentocategoria` el 2026-09-23.
- **`Descuentocategoria` vale `"0.00"` en las 40+ filas de esta captura**, asi que el `CASE WHEN > 0` del SP cae siempre al `ELSE` con este articulo. No prueba que sea siempre 0: prueba que el campo existe y su formato.
- 🔴 **Dos familias de filas para el mismo SKU**, y no se parecen:

| | `OrgVtas` | `Sucursal` | `Condicion` | `Abono` |
|---|---|---|---|---|
| **Ecommerce** | `04` (MA), `05` (VIU) | `0504`, `0505` | **codigo**: `ACEF`, `12IV`, `18IV`, `24IV`, `12DV`, `18DV`, `24DV`, `VCEF` | **`0.00` en TODAS** |
| Legacy | `1`, `2`, `3` y `01`, `02`, `03` | `0`, `0000` | **descripcion**: `"Credito Viu 12M P INM"`, `"Mayoreo Local"` | valores reales (`48.00`, `56.00`…) |

- **El `Abono` de las filas de ecommerce llega `0.00` en ESTA captura, pero es dato de prueba.** Resuelto por el usuario el 2026-09-23: *"sí deberían tener el valor configurado, eso es un configurable del producto, debería traer valores independiente de la organizacion"*. O sea que en produccion las filas `04`/`05` traen su `Abono` como cualquier otra. Pistas de que la captura es de pruebas: esas filas traen `"Formato": "INST Test Mayoreo 1/16"`.
  **Consecuencia para el codigo: ninguna.** `InsertCreditArticlesAsync` (`OrderMethods.cs:1049`) ya lee `proper.Installment`, que mapea a `Abono`. No hay que cambiar de campo: `Abonoreactivado`, `Abonopp` y `Abonoppcn` **no** son la parcialidad.
  **Y no se añade ninguna guarda.** Decision del usuario el 2026-09-23: un articulo que llegue mal configurado **no es un error de codigo, es un error operativo de configuracion**, y el flujo lo procesa tal como venga. LAN tampoco lo valida.

  > Correccion de un razonamiento equivocado que quedo escrito antes: se llego a plantear que la parcialidad pudiera salir de `Abonoreactivado`, `Abonopp` o `Abonoppcn`. **Eso fue confundir dos cosas distintas.** El `Abono` de la linea de articulo es el configurable del producto en el catalogo de precios (`PropreListaDFinal`, SD29), y el SP lo dice sin ambiguedad: `p.Abono` (SpVTASInsertArtSolCreditoLinea.sql:255). Las **parcialidades** son otra cosa: son los plazos de un documento YA existente y salen de **TZ01** (`ZAPI_TZ01_ZSPLIT_MERC`, `AbonoMethods.cs:64`), igual que las **deudas** salen de **EX01** (`ZAPI_EX01_NOCOMP_SRV`, `AbonoMethods.cs:22`) y el documento de **SD36** (`ZAPI_DOCVTAS_CHECK_CDS`, `SalesMethods.cs:65`). Esas tres pertenecen al calculo del SALDO del cliente, no a las lineas de una solicitud que todavia no tiene documento.
- En las filas de ecommerce la descripcion de la condicion va en **`Descripcion`** (`"Credito MA 12M P INM"`), no en `Condicion`. Eso confirma el aviso de `OrderMethods.cs:920`: SD29 devuelve unas veces codigos y otras descripciones.
- **Todos los importes son STRING** (`"1146.00"`), con 2 decimales salvo `Envio` que trae 3 (`"0.000"`). `Vigente`, `Factor01` y `Modi` son **booleanos reales**.
- **Las fechas son string `YYYYMMDDHHMMSS` con un espacio al final** (`"20250722031847 "`), y el centinela de "sin fecha" es **`"0 "`** — cero y espacio. Hay una con formato imposible: `"20250722566144 "` (566144 no es una hora valida).
- Hay filas con `CDistr` **vacio** (`""`) y otras con `CDistr` `"01"`, `"02"`, `"04"` para el mismo `OrgVtas`. El `$filter=CDistr eq '3'` del metodo por UEN no casa con ninguna de las de ecommerce.
