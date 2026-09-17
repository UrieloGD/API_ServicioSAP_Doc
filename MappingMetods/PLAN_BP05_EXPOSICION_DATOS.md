---
fecha: 2026-09-15
alcance: los 25 endpoints BP que cubren la lógica de SP_CREDITO_WEB_DATOS
fuera_de_alcance: Credilana
---

# Plan BP05 — Exposición de datos y equivalencia con `SP_CREDITO_WEB_DATOS`

> [!info] Cómo se levantó esto
> 67 agentes en dos barridos: uno inventarió el contrato real de cada endpoint en
> `businesspartner-dev` (método, parámetros, modelo, servicio OData, defectos), y otro
> midió si `ServicioSAP` (C#) ya lo tiene implementado. Cada ficha pasó por un verificador
> adversarial con instrucción de refutar. **Toda afirmación de aquí está citada a
> `archivo:línea`.** Lo que no se pudo verificar está marcado como tal, no rellenado.

---

## 1. La conclusión que manda

**De los 25 endpoints, 1 ya está implementado en ServicioSAP. 5 están a medias. 19 no existen.**

Y la razón es de una sola pieza:

```
grep -rn "ZQBP_EDITARCLIENTE" --include=*.cs  ServicioSAP/  ->  0 coincidencias
grep -rn "CteTelSet"          --include=*.cs  ServicioSAP/  ->  0 coincidencias
grep -rn "CteCtoEmpleoSet"    --include=*.cs  ServicioSAP/  ->  0 coincidencias
grep -rn "CteLimiteCredSet"   --include=*.cs  ServicioSAP/  ->  0 coincidencias
```

**ServicioSAP no toca el servicio `ZQBP_EDITARCLIENTE_SRV` en ninguna línea.** Ese servicio
es el que está detrás de **12 de los 25** endpoints. Hoy el C# habla con 22 servicios OData
—`ZAPI_BP01_PARTNER_SRV`, `ZAPI_SALESORDER_SRV`, `ZAPI_BP05MA_SRV` y demás— pero el de
edición de cliente no está entre ellos.

No es que falten métodos sueltos: **falta un cliente completo para ese servicio.** Esa es la
partida de trabajo más grande del plan y de ella cuelga todo el bloque de teléfonos, empleo
y límite de crédito.

---

## 2. Matriz de cobertura

`YA ESTA` = existe un método C# que golpea el mismo servicio y entidad con la misma lógica ·
`PARCIAL` = existe la plomería pero no el contrato o le faltan campos ·
`NUEVO` = hay que escribirlo · `NUEVO*` = descubierto en el barrido, no venía en la lista original

| # | Endpoint | Mét | Servicio SAP detrás | En ServicioSAP (C#) | Esf |
|---|---|---|---|---|---|
| 1 | `AI_GET_ZSDT_CTETEL` | GET | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | bajo |
| 2 | `AI_POST_UpdateBPartner` | POST | ZAPI_BP01_PARTNER_SRV | **PARCIAL** | bajo |
| 3 | `AS_DELETE_ZQBP_EditarCliente_CteTel` | DELETE | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | bajo |
| 4 | `AS_GET_TipoCredito` | GET | **no va a SAP** | **NUEVO** | medio |
| 5 | `AS_GET_ZB_DATOS_CLIENTE` | GET | ZB_DATOS_CLIENTE_CDS | **PARCIAL** | bajo |
| 6 | `AS_GET_ZCTE_CREDITO` | GET | **no va a SAP** | **NUEVO** | alto |
| 7 | `AS_GET_ZQBP_EditarCliente_CteCredito` | GET | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | bajo |
| 8 | `AS_GET_ZQBP_EditarCliente_CteTel` | GET | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | bajo |
| 9 | `AS_PATCH_BusinessPartner` | PATCH | ZAPI_BP01_PARTNER_SRV | **PARCIAL** | bajo |
| 10 | `AS_POST_BusinessPartner` | POST | ZAPI_BP01_PARTNER_SRV | **YA ESTA** | bajo |
| 11 | `AS_POST_ClienteContado` | POST | ZAPI_BP01_PARTNER_SRV | **PARCIAL** | bajo |
| 12 | `AS_POST_ZQBP_EditarCliente_CteCto_Empleo` | POST | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | medio |
| 13 | `AS_POST_ZQBP_EditarCliente_CteTel` | POST | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | medio |
| 14 | `AS_PUT_ZQBP_EditarCliente_CteLimiteCred` | PUT | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | bajo |
| 15 | `AS_PUT_ZQBP_EditarCliente_CteTel` | PUT | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | medio |
| 16 | `AS_UPSERT_ZQBP_EditarCliente_CteCto_Empleo` | POST | ZQBP_EDITARCLIENTE_SRV | **NUEVO\*** | - |
| 17 | `A_GET_BPValidaTelefonoCOFETEL` | GET | **no va a SAP** | **NUEVO** | bajo |
| 18 | `A_GET_TelefonoValidado` | GET | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | bajo |
| 19 | `A_POST_BPValidarTelefonoCOFETEL` | POST | ZQBP_EDITARCLIENTE_SRV | **NUEVO** | alto |
| 20 | `A_POST_EnviarSMS` | POST | **no va a SAP** | **NUEVO** | bajo |
| 21 | `A_POST_GuardarTelefonoCte` | POST | dos servicios, dos hosts | **PARCIAL** | medio |
| 22 | `A_POST_SMSEnviar` | POST | **no va a SAP** | **NUEVO** | medio |
| 23 | `A_POST_ValidarTelefono` | POST | dos servicios distintos | **NUEVO** | alto |
| 24 | `bp/birthdate` | PATCH | API_BUSINESS_PARTNER | **NUEVO\*** | - |
| 25 | `bp/email` | PATCH | API_BUSINESS_PARTNER | **NUEVO\*** | - |

### Lo único que ya está

`AS_POST_BusinessPartner` → **`SubmitClientInfoAsync`** en
`Methods\BusinessPartner\BusinessPartnerMethods.cs:74`. Mismo servicio, misma entidad, mismo
handshake CSRF de tres pasos que el Python. El armador es `BuildClientFromCustomerRequest`
(`:415`), expuesto por `Controllers\BusinessPartnerController.cs:36`.

Los 5 modelos anidados coinciden 1:1 con los de Python: `Cte.cs` (70/70 campos),
`CteTel.cs` (13/13), `CteCto.cs` (27/27), `CteCtoAddress.cs` y `CteCtoJob.cs` (+2 campos extra
cada uno). **No hay que rehacerlo.**

Le faltan tres cosas, ninguna estructural: `Client.cs` no declara `Katr1`, `Katr2` ni `Katr5`
(buró, cobranza telefónica, autorización especial) —aunque en Python los tres van con default
`""` y el `exclude_none` los quita del payload real—; y la ruta `POST partner/client` recibe
`CustomerRequest` (forma Magento) en vez del `Partner` en forma SAP, así que el passthrough
sólo existe hoy en `PATCH partner/client` y en la ruta de diagnóstico `partner/testnew`.

### Los 5 parciales — qué les falta exactamente

| Endpoint | Lo que existe | Lo que falta |
|---|---|---|
| `AS_PATCH_BusinessPartner` | `SubmitClientInfoAsync` reusado por el PATCH | **`limpiar_payload`**. En `AS_POST_BusinessPartner.py:84-97` recorre el payload recursivamente y borra toda clave con valor `None`, `""` **o el centinela `"00000000"`**. El C# sólo omite nulos (`BusinessPartnerMethods.cs:83-86`, `DefaultIgnoreCondition`). Eso es justo lo que distingue al PATCH del POST |
| `AI_POST_UpdateBPartner` | El mismo orquestador | `Katr2` no existe en `Client.cs` (grep = 0) y `ZtipoCredito` no existe en `Cte.cs` — sólo aparece en `Partner.cs:48` y `BusinessEntitiesMa.cs:300`, que son modelos de lectura |
| `AS_POST_ClienteContado` | La plomería SAP completa | El método público con el nombre de la ruta. Hoy el único passthrough vive en una ruta de diagnóstico llamada `testnew`, que recibe string crudo sin modelo |
| `A_POST_GuardarTelefonoCte` | Se arma `toCteTel`, pero sólo dentro del alta completa de BP (`BusinessPartnerMethods.cs:656-671` y `OrderMethods.cs:2935-2950`) | El **upsert** sobre un BP existente: leer `CteTelSet`, decidir si actualiza o inserta, y escribir. No hay lectura previa en ningún lado |
| `AS_GET_ZB_DATOS_CLIENTE` | Mismo servicio, entidad y mapeo | Python entra por clave `ZB_DATOS_CLIENTE(BusinessPartner='x')`; el C# usa `$filter=... &$top=1`. Equivalente en resultado, distinto en forma de URL |

---

## 3. Cinco endpoints no hablan con SAP

Esto cambia dónde va el trabajo, así que conviene tenerlo claro antes de estimar:

- **`A_POST_EnviarSMS` y `A_POST_SMSEnviar`** — no son OData. Tu sospecha era correcta.
- **`AS_GET_ZCTE_CREDITO`** (13 parámetros) y **`AS_GET_TipoCredito`** (12) — no van a SAP.
- **`A_GET_BPValidaTelefonoCOFETEL`** — no construye ninguna llamada OData.

Y **`A_POST_BPValidarTelefonoCOFETEL` depende de dos sistemas fuera de SAP**: una consulta a
HANA (`CONFIGURACIONCATALOGOS`, catálogo `1138ValAutLadaTel`, para partir la lada) y una
lambda de AWS (`L_GET_BPValidaTelefonoCOFETEL`). Portarlo al C# arrastra esas dos
dependencias; por eso está estimado en **alto**.

---

## 4. Equivalencia con `SP_CREDITO_WEB_DATOS`

El SP vive en `ServicioAndroid` y es **un despachador por `@Op` con tres ramas
independientes** (no `IF/ELSE`): `Insert` (59 columnas), `Update` (9 columnas) e
`InsertReferencia`. Todos los consumidores conocidos mandan `@Op = 'Insert'` fijo.

| Lógica del SP | Endpoint que la cubre | Estado C# |
|---|---|---|
| `SELECT ... FROM CteTel WHERE Cliente = @cliente` | `AI_GET_ZSDT_CTETEL` | NUEVO |
| `@TelefonoValidado` (último móvil con `ValidacionTel=1`) | `A_GET_TelefonoValidado` | NUEVO |
| `@ValidacionTelefono` | `A_POST_ValidarTelefono` | NUEVO |
| `TcAAEA00030_EnvioMensajes` | `A_POST_EnviarSMS`, `A_POST_SMSEnviar` | NUEVO |
| Alta/actualización del móvil | `A_POST_GuardarTelefonoCte` | PARCIAL |
| CRUD completo de `CteTel` | `AS_*_ZQBP_EditarCliente_CteTel` (4) | NUEVO |
| Datos personales (apellidoP/M, nombre, rfc, sexo, fechaNac, email, domicilio, estadoCivil, viveEnCalidad) | `AS_POST_BusinessPartner` | **YA ESTA** |
| Cliente prospecto (`'P'`) | `AS_POST_ClienteContado` | PARCIAL |
| Actualización posterior | `AS_PATCH_BusinessPartner`, `AI_POST_UpdateBPartner` | PARCIAL |
| `sueldo` | `AS_POST_ZQBP_EditarCliente_CteCto_Empleo` | NUEVO |
| `tarjeta`, `tarjetaDigitos`, `creditoHipoteca`, `creditoAutomotriz` | `AS_GET_ZCTE_CREDITO`, `AS_GET_ZQBP_EditarCliente_CteCredito`, `AS_PUT_ZQBP_EditarCliente_CteLimiteCred` | NUEVO |
| `die`, `condicion`, `codigo` | `AS_GET_ZB_DATOS_CLIENTE`, `AS_GET_TipoCredito` | PARCIAL / NUEVO |
| — (sin equivalente en el SP) | COFETEL (2 endpoints) | NUEVO |

> [!warning] `@ValidacionTelefono` es código muerto en LAN
> Ya estaba confirmado: **las dos ramas del `IF/ELSE` sobreescriben el valor** (`L210-221`).
> El cálculo del legado no decide nada. Antes de portar `A_POST_ValidarTelefono` —el endpoint
> con más defectos del lote, 19— hay que decidir si se replica el comportamiento observable o
> el que el código aparenta. **No lo puedo decidir yo.**

---

## 5. Plan por fases

Las fases están ordenadas por dependencia, no por tamaño. La 0 desbloquea 12 endpoints.

### Fase 0 — Cliente de `ZQBP_EDITARCLIENTE_SRV` *(desbloquea 12)*

Hoy no existe una sola línea. Antes de cualquier endpoint hay que resolver, una vez:

1. **Handshake CSRF** contra la raíz del servicio, reutilizando `TokenGenerator.GetTokenSapAsync`
   que ya funciona para `ZAPI_BP01_PARTNER_SRV`.
2. **Clave doble en la URL**: `CteTelSet(Partner='...',ZidcteTel='...')`.
3. **Formato de fecha `/Date(epoch_ms)/`** — ver §6, es un riesgo abierto.
4. **Filtro obligatorio**: una consulta a la colección sin `$filter` responde **400**.

Sin esto, las fases 1 a 3 no pueden arrancar.

### Fase 1 — Lectura de `CteTel` *(4 endpoints, esfuerzo bajo)*
`AI_GET_ZSDT_CTETEL`, `AS_GET_ZQBP_EditarCliente_CteTel`, `A_GET_TelefonoValidado`,
`AS_GET_ZQBP_EditarCliente_CteCredito`. Son sólo GET: se validan contra Hoppscotch sin
escribir nada en SAP. **Es la fase con la que conviene empezar a probar de verdad.**

### Fase 2 — Escritura de `CteTel` *(3 endpoints, medio)*
`AS_POST_`, `AS_PUT_`, `AS_DELETE_ZQBP_EditarCliente_CteTel`. Aquí se resuelve el formato de
fecha y la generación de `ZidcteTel`.

### Fase 3 — Empleo y límite de crédito *(3, bajo-medio)*
`AS_POST_` y `AS_UPSERT_ZQBP_EditarCliente_CteCto_Empleo`, `AS_PUT_ZQBP_EditarCliente_CteLimiteCred`.

### Fase 4 — Cerrar los parciales de BP *(4, bajo)*
Portar `limpiar_payload`, agregar `Katr1/Katr2/Katr5` a `Client.cs` y `ZtipoCredito` a
`Cte.cs`, y exponer `AS_POST_ClienteContado` con nombre propio. **No se toca
`SubmitClientInfoAsync`**: ya funciona y los cuatro cuelgan de él.

### Fase 5 — Teléfono: upsert y validación *(3, medio-alto)*
`A_POST_GuardarTelefonoCte`, `A_POST_ValidarTelefono`. Depende de la decisión sobre
`@ValidacionTelefono`.

### Fase 6 — Fuera de SAP *(5, variable)*
SMS, COFETEL, `AS_GET_ZCTE_CREDITO`, `AS_GET_TipoCredito`. Arrastran HANA y AWS Lambda.
Conviene decidir si se portan al C# o se dejan donde están.

---

## 6. Riesgos abiertos

**El formato de fecha está en desacuerdo consigo mismo.** SAP devuelve
`"Zfecha": "/Date(1788825600000)/"` —verificado con `Partner=1500008218`— pero el modelo del
POST declara `Zfecha: str  # formato: '2025-10-13T00:00:00'`
(`AS_POST_ZQBP_EditarCliente_CteTel.py:14`). **No hay ninguna captura de un POST exitoso a
`CteTelSet` que diga cuál de los dos acepta al escribir.** Hay que conseguirla antes de la
Fase 2, o se implementa a ciegas.

**`ZidcteTel` no está normalizado en los datos.** El BP `1500008218` tiene `"1"` y
`"0000000002"` conviviendo. `obtener_ultimo_zidctetel` hace `max(...)+1` con formato de 10
dígitos, así que funciona, pero la tabla trae basura previa y conviene saber si eso es
esperado.

**`S4Session` no está en el repo.** `models/mytoke.py:4` hace `from S4Session import S4Session`
y ese archivo no existe en la copia. Por eso **no se pudo verificar si `sap-client` viaja en
los headers**. Cualquier afirmación sobre autenticación en estos endpoints es inferencia, no
evidencia.

**268 defectos detectados** en los 25 endpoints, concentrados en
`A_POST_ValidarTelefono` (19), `AS_POST_BusinessPartner` (17) y
`A_POST_BPValidarTelefonoCOFETEL` (16). Están en las fichas de cada agente; **no se corrigió
ninguno**, esto fue sólo lectura.

---

## 7. El defecto que provocó el 500 de hoy

Queda documentado porque afecta a 11 rutas más:

```python
# AS_GET_ZQBP_EditarCliente_CteTel.py:23
params = {"$format": "json"}      # SIEMPRE
# ...
if filtros:                        # :49 — solo si algo vino con valor
    params["$filter"] = " and ".join(filtros)
```

`AI_GET_ZSDT_CTETEL` declara `Partner` y `ZtelCte` como `Optional = None` (`:8-9`). Llamado
sin parámetros, sale `CteTelSet?$format=json` sin filtro y SAP responde **400**.

Y el `except Exception as e: HTTPException(500, detail=str(e))` de `:66-67` convierte ese 400
en un **500** y **tira el body donde SAP explica el motivo** — `str(e)` de un `HTTPError` de
`requests` da sólo la línea de estado. El POST hermano sí lo hace bien
(`AS_POST_ZQBP_EditarCliente_CteTel.py:90-93`, usa `e.response.text`). **11 rutas** tienen el
patrón defectuoso.

Corrección pendiente de autorización: volver `Partner` obligatorio, propagar el error real de
SAP, y decidir si `_get_ctetelset` corta antes de salir cuando no hay filtro (eso afecta
también a `AS_GET_ZQBP_EditarCliente_CteTel`, que expone 7 filtros opcionales).

---

## 8. Colección Hoppscotch

Los 25 quedaron en `🌟 SAP Directo (OData S4)` → `BP05 Exposicion de datos`, nombrados
`BP05-NN [cabecera del SP] ENDPOINT` para darles seguimiento.

```
requests totales   166 -> 190
BP05                 6 -> 30
folders raíz         3 -> 3     (sin cambios)
requests perdidos    0
```

Respaldo previo: `Servicios SAP y Middleware (Unificado).ANTES-BP05.bak.json`.

**Se corrigió un request roto que ya estaba**: `BP05 AI_GET_ZSDT_CTETEL` apuntaba a
`https://android-api.mavi.fun/AS_GET_BP_MA?Partner=1500008089` —quedó de una duplicación— y
ahora apunta a `https://businesspartner-api.mavi.fun/AI_GET_ZSDT_CTETEL?Partner=1500008218`.

Los requests usan el host literal `https://businesspartner-api.mavi.fun` porque el entorno
`Servicio SAP (Desarrollo)` no tiene variable para él (sólo `SAP`, `DMZ`, `SAPDirect`). Si
quieres, se puede agregar una variable `BPApi` y cambiarlos todos de una vez.
