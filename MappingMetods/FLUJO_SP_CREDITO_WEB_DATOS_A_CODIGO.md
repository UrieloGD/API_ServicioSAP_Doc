---
tags: [migracion, sap, credito, sp, serviciosap, diseno]
fecha: 2026-09-18
alcance: SP_CREDITO_WEB_DATOS (3 ramas) + pre-solicitud + satelites, migrado a codigo de ServicioSAP
estado: diseno verificado contra codigo · 3 decisiones abiertas · 1 verificacion bloqueante
---

# `SP_CREDITO_WEB_DATOS` migrado a codigo — el flujo completo

> [!abstract] Que es este documento
> El SP y sus satelites, convertidos en un plan de codigo para **`ServicioSAP` (C#)**. Una sola pieza por unidad de logica: que hace el SQL, cual es su equivalente, que estado sale de tabla y pasa a codigo, y donde va en el proyecto.
>
> Se levanto abriendo el SQL y los `.cs`, no resumenes. Cada afirmacion trae `archivo:linea`. Lo que no se pudo verificar dice **SIN EVIDENCIA** y no esta rellenado.

> [!warning] Nivel de confianza — leer antes de usar esto
> Este documento paso por **refutacion adversarial**: 6 afirmaciones en disputa entre analisis previos se sometieron a 3 refutadores de lente distinta cada una. **Las 6 quedaron refutadas, 18/18 votos.** Las correcciones ya estan aplicadas aqui.
>
> Despues, un critico de completitud encontro **errores en el propio diseno**, y tambien estan corregidos aqui (§7). Lo que queda pendiente esta en §8 y §9, nombrado.
>
> Lo que este documento **no** tiene: una sola ejecucion real. Nada de aqui se probo contra la base ni contra SAP. Antes de escribir codigo hay que cerrar la verificacion de §6, porque puede invalidar la linea base.

---

## 1. Las decisiones que rigen este diseno

Tomadas por el usuario el 2026-09-18. No son supuestos: son el marco. Donde el corpus las contradiga, ganan estas.

| # | Decision |
|---|---|
| **D1** | **El unico proyecto destino es `ServicioSAP` (C#).** `businesspartner-dev`, `salesanddistribution-dev`, `DMZ`, `LAN` y `Magento248` son apoyo y referencia. |
| **D2** | **Alcance = todo el SP + la pre-solicitud.** Las 3 ramas (`Insert`, `Update`, `InsertReferencia`) mas `SpCREDISolicitudWebPrimerGuardado` (11 operaciones). |
| **D3** | **`@ValidacionTelefono` se redisena**, no se replica. El calculo legado es codigo muerto. |
| **D4** | **El estado temporal pasa a codigo**, conservando la misma informacion. Las tablas temporales no se recrean. |
| **D5** | **La base de equivalencias son las OData de `ServicioSAP`.** `businesspartner-dev` se usa para validar que una OData existe, que hace, y **comparar como la usan**. Las fichas de `RSG/` no se usan como base. Si falta una OData, se reporta como *"falta en `ServicioSAP`"* y se planea aparte. |
| **D6** | **`TrWACW00041_RefSolCredWeb` conserva destino y estructura**: escritura directa a `ServicioAndroid`, mismas columnas, misma relacion 1:N contra `IDSolicitud`, misma cardinalidad. **Las 17 columnas**, no las 8. La informacion se manipula igual para que el flujo de negocio sea el mismo. |
| **D7** | **Se autoriza el canal de APIs intermedias** (`URL_BP_API` / `URL_ANDROID_API`, `*.mavi.fun`) para lo nuevo, como ya lo usa el proyecto. |
| **D8** | 🔴 **CORREGIDA el 2026-09-21 — ver §4.9, que es la version vigente.** La redaccion original decia *"se quita todo, lo unico que entra es su pata de SMS"*: **las dos mitades eran falsas**. Lo vigente son cuatro piezas: **D8.1** la columna `CodigoRecomendador` **se queda** en el destino sin recibir valor (ya es el comportamiento del codigo: `OrderMethods.cs:868` liga por nombre y no la manda); **D8.2** la **opcion 17** (login de empleados) **se mantiene**, y abre las decisiones Q/R/S; **D8.3** los 5 mapeos de `RecomenderController/` son insumo, y la opcion 9 **ya tiene equivalente SAP vivo** (`AS_GET_EncontrarCteCodigoMenudeo`); **D8.4** `setRecommenderList` / `@opcion = 2` deprecada, y con ella **la pata de SMS tampoco se porta** — `ServicioSAP` ya tiene productor propio en `CreditMethods.cs:137`. Neto: **del SP no se porta nada al flujo de credito**, y lo unico vivo es la opcion 17, que sigue en Intelisis |
| **D9** | **Todas las ramas se consideran.** Ninguna rama de ningun SP del alcance se descarta por no tener invocador identificado. Incluye las **6 ramas restantes de `SpCREDIDatosSolicitudCreditoArt`** (§4.10) y el camino largo de `InsertReferencia`, que no tiene productor identificado en ningun repo. Donde una rama parezca muerta, se porta igual y se anota que no se hallo consumidor — no se omite. |
| **D10** | **`PUT` no esta habilitado.** Toda actualizacion parcial va por `PATCH`, para no borrar datos al actualizar unicamente los campos solicitados. Donde la implementacion de referencia en Python manda `PUT` (`CteTel`, `CteLimiteCred`), aqui va `PATCH`: **el Python es referencia del contrato y del destino, no del verbo.** Ver §3 para las dos consecuencias a resolver al implementar. |

### Criterio metodologico

**Se busca equivalencia funcional, no identidad.** Los metodos cambiaron de nombre y ahora consultan OData en vez de BD, asi que la estructura no tiene por que coincidir. Un `grep` en cero **no** prueba falta de cobertura: el campo puede llamarse `Z...`, viajar en una entidad generica, o resolverse en codigo.

Este criterio no es teorico. Corrigio **6 veredictos falsos** de "sin equivalente" en este mismo analisis (§7.2), todos producto de buscar por palabra española en vez de leer los modelos.

---

## 2. Estado de partida verificado — que hace `ServicioSAP` hoy

Esto es la linea base. Sin ella no hay contra que comparar.

**`ServicioSAP` crea la solicitud de credito HOY llamando al SP.** No hay intermediacion, no hay OData: es un `SqlCommand` contra `ServicioAndroid`.

```
Methods/Order/OrderMethods.cs:862   CrearSolicitudCreditoAsync(...)
                              :868   CommandType.StoredProcedure  -> binding POR NOMBRE
                              :873-910  38 Parameters.Add
                              :874   @Op = "Insert"  (literal)
                              :898   @origen = "PRODUCTOS MX"  (literal)
                              :919   ds.Tables[0].Rows[0][0]
                              :923   return 0        (si no hay filas)
                              :930   return 0        (en el catch)
```

Cuatro hechos que se derivan de ahi y que hay que tener presentes:

1. **Son 38 parametros de 66.** Los otros 28 viajan con su default. El corpus decia 36, 61 y 64 en distintos sitios; los tres son falsos (§10).
2. **`@Op` es literal `"Insert"` en `ServicioSAP`** — una sola llamada al SP en los 210 `.cs`. Pero eso **no** significa que la rama `Update` este muerta: ver §4.2.
3. **El id de la solicitud sale de `SCOPE_IDENTITY()`** y su unico consumidor vivo es `InsertCreditArticlesAsync` (`:954-955`). `LiberateClientCredit` (`:1259`) tiene **0 invocadores**.
4. **El `catch` convierte cualquier fallo en `return 0`**, y `:715-716` lo traduce a *"No se pudo generar la solicitud de credito"*. Un fallo de tipos es indistinguible de un fallo de negocio.

### La solicitud NO es un documento SAP hoy, ni hay nada que lo cree

Quedo refutado 3/3. En los cinco repos **no existe un solo POST que cree un documento `ZSOC`**: aparece en 4 rutas lectoras de Python y 2 diccionarios de consulta en C#. La lectura como `DocType eq 'ZSOC'` contra `ZAPI_DOCVTAS_CHECK_CDS` es solo lectura.

Que la solicitud pase a ser documento de ventas SAP es una **opcion de diseño**, no el estado actual. Y arrastra una consecuencia que decide §8-B: un documento de ventas SAP no admite estado incompleto/progresivo, y la pre-solicitud es exactamente eso.

---

## 3. La base de equivalencias — el inventario real de OData

D5 dice que la base son las OData de `ServicioSAP`. Levantarlas requiere saber que **hay tres resolvedores de URL distintos**, no uno. Los analisis previos solo contemplaron dos, y por eso el inventario circulaba mal (25, 27, 28 segun el documento).

| Resolvedor | Forma | Evidencia |
|---|---|---|
| **1. Directo** | `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` + `/SERVICIO/EntitySet` | `BusinessPartnerMethods.cs:840-841`, `:386` |
| **2. Path externalizado** | `ConfigurationManager.AppSettings["ZAPI_*"]` | `CreditMethods.cs:304`; `Web.config:46, 49, 52, 53, 89` |
| **3. API intermedia** | `AppSettings["URL_BP_API"\|"URL_ANDROID_API"]` + ruta `AS_`/`AC_`/`AI_` | `OrderMethods.cs:1190-1192`, `BusinessPartnerMethods.cs:204-210`, `:344-350`, `MovBitaMethods.cs:17-23`, `SepomexMethods.cs:16`, `WalletMethods.cs:35`, `ProductMethods.cs:29, 365-368` |
| **4. AWS API Gateway** | `AppSettings["AwsBaseUrl"]` + ruta. `Web.config:28` = `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/` | `ProductMethods.cs:711`, `WalletMethods.cs:19, 35`. **Helper ya escrito:** `WalletMethods.GetCatalogoConfiguracionAsync(nombreCatalogo)` (`:28-51`), modelo `Models/SAP/WalletCustomer/CatalogoConfiguracion.cs` |

**El tercero es el que cambia el encuadre.** `Web.config:30` define `URL_BP_API = https://businesspartner-api.mavi.fun`, y `OrderMethods.cs:1192` llama:

```csharp
string urlAgente = $"{baseBp.TrimEnd('/')}/AS_GET_ZQBP_AGENTE?Zagente={codigo}";
```

parseando el envoltorio OData `d.results` en `:1200`. Hay tambien una **escritura** por ese canal: `AC_POST_HabilitaCombinacionBP` (`BusinessPartnerMethods.cs:210`, `PostAsync` en `:226`), y un comentario que documenta el patron: *"ese POST si va por URL_ANDROID_API"* (`:383`).

> [!important] Consecuencia de D7
> **`ZQBP_EDITARCLIENTE_SRV` no es un hueco.** El canal y el cliente HTTP ya existen y estan en produccion; falta la llamada a la ruta concreta. La conclusion que circulaba —*"falta un cliente completo para ese servicio, y de ahi cuelgan 12 endpoints"*— medía el resolvedor 1 e ignoraba el 3.
>
> Y `businesspartner-dev` no es solo documentacion: **es dependencia de runtime de `ServicioSAP` hoy**. Eso no contradice D1 (el destino sigue siendo `ServicioSAP`) pero si cambia que cuenta como "equivalente existente".

**Conteo:** 31 identificadores distintos de servicio en los `.cs` + 7 rutas por API intermedia. El numero "22 servicios OData" que circulaba coincide exactamente con las 22 rutas del DMZ puenteadas con `PostSAP`/`GetSAP`/`PatchSAP`: son dos cosas distintas conflacionadas.

### 3.0 · El mapeo SP → API que dio el usuario (2026-09-21) — ESTA ES LA BASE

> [!important] Este mapeo lo dio el usuario directamente. **Manda sobre cualquier equivalencia inferida** en el resto de este documento o en el corpus. Lo que sigue esta transcrito literal; la columna de verificacion la rellena quien lea el contrato real de cada ruta en `businesspartner-dev`.

#### Bloque de telefonos

| Logica del SP | Endpoint que la cubre | Verificacion del contrato |
|---|---|---|
| `SELECT … FROM CteTel WHERE Cliente = @cliente` | `AI_GET_ZSDT_CTETEL` | pendiente |
| `@TelefonoValidado` (ultimo movil con `ValidacionTel=1`) | `A_GET_TelefonoValidado` | 🔴 **no replica los 4 criterios del SP** — ver §4.6 |
| **Calculo de `@ValidacionTelefono`** | `A_POST_ValidarTelefono` | pendiente |
| `TcAAEA00030_EnvioMensajes` (SMS) | `A_POST_EnviarSMS` / `A_POST_SMSEnviar` | pendiente |
| **Alta/actualizacion del movil** | `A_POST_GuardarTelefonoCte` | pendiente |
| **CRUD completo de `CteTel`** | `AS_POST_` / `AS_PUT_` / `AS_DELETE_` / `AS_GET_ZQBP_EditarCliente_CteTel` | pendiente |
| — *(nuevo, no existia en el SP)* | `A_POST_BPValidarTelefonoCOFETEL`, `A_GET_BPValidaTelefonoCOFETEL` | catalogo `1138ValAutLadaTel` confirmado |

#### Bloque de cliente y credito

| Columnas del SP | Endpoint que las cubre | Verificacion del contrato |
|---|---|---|
| `apellidoP`, `apellidoM`, `nombre`, `nombre2`, `rfc`, `sexo`, `fechaNacimiento`, `email`, `domicilio`, `estadoCivil`, `viveEnCalidad` | `AS_POST_BusinessPartner` | pendiente |
| **Cliente prospecto (`'P'`)** | `AS_POST_ClienteContado` | pendiente |
| Actualizacion posterior | `AS_PATCH_BusinessPartner` / `AI_POST_UpdateBPartner` | pendiente |
| `sueldo` | `AS_POST_ZQBP_EditarCliente_CteCto_Empleo` | pendiente |
| `tarjeta`, `tarjetaDigitos`, `creditoHipoteca`, `creditoAutomotriz` | `AS_GET_ZCTE_CREDITO`, `AS_GET_ZQBP_EditarCliente_CteCredito`, `AS_PUT_ZQBP_EditarCliente_CteLimiteCred` | pendiente |
| `die`, `condicion`, `codigo` | `AS_GET_ZB_DATOS_CLIENTE`, `AS_GET_TipoCredito` | pendiente |

#### Tres lineas de este mapeo cierran huecos que el corpus daba por abiertos

Si los contratos lo confirman, hay que retirar tres afirmaciones vigentes del corpus:

1. 🔴 **§7.3 dice que quedan exactamente 3 huecos reales sin equivalente SAP: `tarjetaDigitos`, `creditoHipoteca`, `creditoAutomotriz`.** El usuario asigna esas tres columnas —mas `tarjeta`— a `AS_GET_ZCTE_CREDITO` / `AS_GET_ZQBP_EditarCliente_CteCredito` / `AS_PUT_ZQBP_EditarCliente_CteLimiteCred`. **Si los payloads las llevan, §7.3 pasa a cero huecos duros** y `TransactionExtSet` deja de ser necesario como portador generico.
2. 🔴 **La decision §6-2 del plan de ejecucion pregunta si el cliente prospecto es un numero de BP o el consecutivo `'P…'`** de `cte_prospecto()` / `SP_GeneraConsecutivoCteMavi`. El usuario lo asigna a **`AS_POST_ClienteContado`**. Eso apunta a que el prospecto se crea por API, no por consecutivo de Intelisis — **cerraria la duda §6-2**, que era una de las tres que bloqueaban. Queda por confirmar que devuelve, y si el prefijo `'P'` sobrevive (importa: `SP:216` decide "es prospecto" por ese prefijo).
3. **`sueldo` → `AS_POST_ZQBP_EditarCliente_CteCto_Empleo`.** §5 lista `sueldo` como "cubierto pero estampado en blanco" (`Cte.ZingMensCredw`, hoy `"0.00"` fijo). El usuario le da un endpoint **de escritura** propio. Hay que decidir si el sueldo se escribe por ahi o por el PATCH de `ZSDT_CTE`, porque los dos caminos existen.

#### Y una linea que ya sabemos que NO cumple

**`A_GET_TelefonoValidado` no replica `@TelefonoValidado`.** El usuario lo asigna a esa logica y el endpoint existe, pero su implementacion no hace lo que el SP: el SP filtra `Tipo='Movil'` **y** `ValidacionTel=1`, ordena por `Fecha DESC` y devuelve `CONCAT(Lada, Telefono)`; la ruta hace `max(tels, key=(Zfecha, ZfechaCap, ZidcteTel))` **sin filtro de tipo, sin filtro de validacion y sin lada**. O sea: puede devolver un fijo, puede devolver un telefono no validado, y devuelve el numero sin lada. **El endpoint es el sitio correcto; la implementacion hay que corregirla.** Es reimplementacion, no mapeo.

#### Lo que este mapeo NO cubre, y sigue abierto

El mapeo del usuario cubre el bloque de telefonos y el de cliente/credito. **No asigna endpoint a:**

- Las dos tablas destino del SP (`CRED_SOLICITUD_WEB_DATOS_TEMP` y `TrWACW00041_RefSolCredWeb`) — y no hace falta: por **D4 + D6** se quedan en `ServicioAndroid` con escritura directa por ADO.NET.
- La pre-solicitud completa (`SpCREDISolicitudWebPrimerGuardado`, 11 operaciones, 4 tablas locales) — tambien Android.
- El satelite de linea de articulo (`VTASdArtCreditoWeb`) — Android, y **ya lo escribe `ServicioSAP`**.
- `GetCuenta` del satelite de datos: el `INSERT` de 23 columnas a `CteEnviarA`, que **es tabla de Intelisis** y por tanto si necesita endpoint. Sigue sin uno nombrado.
- Los catalogos de region/SKU, `spVerCosto`, la tabla `art` y `MAVIDM0138HistInsertCorreo`.

### 3.0b · Captura real de BP05 (`Partner='1500004598'`, `Client='110'`) — lo que fija y lo que rompe

> Response completo aportado por el usuario el 2026-09-21 desde `ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='1500004598',Client='110')`. **Es la primera captura con `to_Cte` poblado de verdad**, asi que sustituye a varias suposiciones del corpus. Todo lo de abajo esta leido de ese JSON.

#### 1. RESUELTA la decision del prospecto (§6-2 del plan de ejecucion)

**El discriminador es `to_Cte.ZtipoCliente`**, y el usuario fija su semantica: `"Prospecto"` = sigue siendo prospecto; `"Nuevo"` = ya paso de prospecto a cliente. En esta captura vale `"Nuevo"`.

Eso **cierra la duda §6-2** y descarta las dos hipotesis que estaban sobre la mesa:

| Hipotesis anterior | Veredicto |
|---|---|
| El prospecto es el consecutivo `'P…'` de `SP_GeneraConsecutivoCteMavi` en Intelisis | ❌ **No.** El id del cliente es el numero de BP (`1500004598`), sin prefijo |
| Se distingue por el prefijo `'P'`, como hace `SP:216` | ❌ **No.** Se distingue por un campo propio |

**Consecuencia para `SP:216`:** la condicion del legado (*"es prospecto si el cliente empieza con `'P'`"*) **no se porta**. Se reemplaza por `to_Cte.ZtipoCliente == "Prospecto"`. Eso hay que reflejarlo en `ContextoValidacionTelefono.EsProspecto`, cuya fuente estaba marcada como pendiente.

> [!warning] Ojo: hay **dos** campos y solo uno manda.
> `to_Cte` trae **`Zprospecto: ""`** *y* **`ZtipoCliente: "Nuevo"`**. El que decide es `ZtipoCliente`. `Zprospecto` esta vacio en esta captura y **no** se debe usar como discriminador ni escribir sin decision.

#### 2. Los tipos de `to_Cte` no son los que el corpus asumia

Esto cambia el DTO. En `to_Cte` **las fechas NO viajan como `/Date(epoch_ms)/`**:

| Campo | Valor real | Tipo efectivo |
|---|---|---|
| `Zfecha4` | `"20260817091824"` | **string `YYYYMMDDHHMMSS`** |
| `ZfechValid` | `"0"` | **string**, no fecha |
| `ZfechCateg` | `"0"` | **string** |
| `ZfechaIrreg`, `ZfecUltPag` | `null` | nullable de verdad |

El formato `/Date(ms)/` **si** aparece, pero solo en la cabecera (`Birthdt`, `Crdat`, `Chdat`, `ValidFrom`, `ValidTo`) y en `to_CteTel.Zfecha`/`ZfechaCap`. **Dentro de `to_Cte` es string numerico.** Escribir `/Date(...)/` ahi seria un error.

**Numeros contra strings, tambien mezclado:**

| Llegan como NUMERO | Llegan como STRING |
|---|---|
| `ZantigAnios: 0`, `ZantigMeses: 0`, `ZantigNeg: 0`, `ZidMagento: 0`, `ZcodSms: 0`, `ZapoyoVtaDima: 0`, `ZidCtaClDisp: 0`, `ZintSolApoy: 0`, `ZtotalAsign: 0`, `ZnumPag: 0` | `ZingMensCredw: "0.000"`, `Zcrmimporte: "12345678.200"`, `Zcrmcantidad: "12345678.20"`, `ZlimCred: "60000.000"`, `ZimporRent: "0.000"`, `Zlcaxsi: "0.000"`, `ZvalorPagMay: "0.00"` |

Y **la precision de los decimales no es uniforme**: `Zcrmimporte` trae 3, `Zcrmcantidad` 2, `ZlimCred` 3, `ZvalorPagMay` 2. Un DTO con un solo formato los deforma.

#### 3. 🔴 `Zcrmcantidad` y `ZlimCred` son numeros MUY distintos

| Campo | Valor en esta captura |
|---|---|
| `Zcrmcantidad` | **`"12345678.20"`** |
| `ZlimCred` | **`"60000.000"`** |

Una revision previa concluyo que *"no hay dos campos rivales para el limite de credito"*. **Con datos reales si los hay, y difieren en tres ordenes de magnitud.** Lo que fija la captura: `GetSaldo` del SP lee `CRMCantidad`, cuya imagen 1:1 es **`Zcrmcantidad`** — ese es el que se usa. Pero **elegir mal no da un error, da un limite absurdo**, y eso no lo atrapa ninguna prueba de compilacion.

Y **`Zcredito` no es un numero**: vale `"0.1 CLIENTE (AAA)"`. Es el codigo/descripcion de la politica de credito — coherente con que `AS_GET_ZQBP_EditarCliente_CteCredito` filtre justamente por `Zcredito`.

#### 4. 🔴 `ZrecomendPor` NO esta vacio en datos reales — y el C# lo borraria

`to_Cte.ZrecomendPor` vale **`"002"`** en esta captura.

`ServicioSAP` lo manda **quemado a `""`** en los dos constructores de BP (`BusinessPartnerMethods.cs:599` y `OrderMethods.cs:2869`), igual que `ZdirRecom` (`:604`, `:2874`). Si esos constructores se usan para **actualizar** un BP existente, **pisan el `"002"` con vacio**.

**Es exactamente el razonamiento de D8.1 aplicado a otro campo:** el usuario decidio conservar la columna `CodigoRecomendador` porque *"el que no se llene o se use en este flujo no significa que otro servicio no la consuma"*. `ZrecomendPor` esta en la misma situacion, **pero aqui no se deja vacio: se sobreescribe con vacio**, que no es lo mismo. Hay que decidir si esos dos campos se omiten del payload (y no se tocan) en vez de mandarse `""`.

#### 5. El casing de `CteTel`: en BP05 es `Zvaltel`

`to_CteTel` trae **`Zvaltel`** (t minuscula), junto con `ZidcteTel`, `ZtipoCte`, `ZtelCte`, `Zfecha`, `Zenvionip`, `ZappOrig`, `ZfechaCap`, `ZtelExist`, `ZtraeTel`, `Zintentos`, `ZtipoValid`. **Queda cerrada la mitad de lectura del casing.** Falta confirmar el de escritura en `ZAPI_BP01_PARTNER_SRV`, donde el C# hoy escribe `ZvalTel`.

#### 6. 🔴 Los datos reales de `CteTel` rompen el filtro del SP

Los 6 telefonos de este BP demuestran tres problemas que **no se ven leyendo codigo**:

| `ZidcteTel` | `ZtipoCte` | `ZtelCte` | `Zfecha` | `Zvaltel` |
|---|---|---|---|---|
| `"1"` | `"particular"` | `7584925` | `/Date(1766966400000)/` | false |
| `"1211"` | `"FIJO"` | `3336345297` | **null** | false |
| `"0000001212"` | `"MOVIL"` | `3338007830` | **null** | false |
| `"0000000002"` | `"MOVIL"` | `7481532` | **null** | false |
| `"0"` | `"TRABAJO"` | `+523333333333` | **null** | **true** |
| `"0000001213"` | `"MOVIL"` | `5522122584` | `/Date(1786579200000)/` | **true** |

1. **`ZtipoCte` no esta normalizado:** `"particular"` en minusculas contra `"FIJO"`, `"MOVIL"`, `"TRABAJO"` en mayusculas. Un `$filter=ZtipoCte eq 'MOVIL'` es **sensible a mayusculas** y se saltaria cualquier fila mal capitalizada. El `Tipo='Movil'` del SP corria en SQL Server con collation case-insensitive; **en OData no**.
2. **`ZidcteTel` no tiene padding uniforme:** convive `"1"`, `"1211"`, `"0"` con `"0000001212"`, `"0000000002"`, `"0000001213"`. La generacion en cliente formatea a 10 digitos, pero **las llaves existentes no lo estan**, asi que un lookup por entidad tiene que usar el valor **tal cual viene**, no el rellenado.
3. **`Zfecha` es null en 4 de 6.** El `ORDER BY Fecha DESC` del SP se apoya en una columna mayormente vacia, y **el tratamiento de nulls en `$orderby` de OData no es el mismo que en SQL Server**.

Y **`ZtelCte` tampoco tiene formato**: `7584925` (7 digitos), `3336345297` (10), `+523333333333` (con lada de pais). El `CONCAT(Lada, Telefono)` del SP no tiene equivalente directo.

#### 7. 🔴 Demostracion con datos reales: `A_GET_TelefonoValidado` devuelve el telefono EQUIVOCADO

Esta captura permite ejecutar los dos algoritmos a mano y compararlos.

**Lo que devuelve el SP** (`SP:194-202`): filtra `Tipo='Movil'` **y** `ValidacionTel=1`, ordena `Fecha DESC`. Solo una fila cumple las dos: `ZidcteTel='0000001213'`.
→ **`5522122584`** (movil, validado).

**Lo que devuelve la ruta Python**: `max(tels, key=(str(Zfecha), str(ZfechaCap), int(ZidcteTel)))`, **sin filtrar tipo ni validacion**. Y ahi esta la trampa: `str(None)` da la cadena `"None"`, y `"None" > "/Date(…)"` porque `'N'` (0x4E) es mayor que `'/'` (0x2F). **Las 4 filas con `Zfecha` null ganan la comparacion.** Entre ellas desempata `int(ZidcteTel)`, cuyo maximo es `1212`.
→ **`3338007830`** (movil, **NO validado**).

**Son telefonos distintos, y el de la API no esta validado.** No es una diferencia teorica de criterios: con los datos de este BP la ruta entrega un numero que el SP habria rechazado. Confirma que §4.6 debe **reimplementarse**, y ademas explica por que: el bug no es solo el filtro ausente, es que **ordenar fechas como cadenas invierte el resultado cuando hay nulls**.

#### 8. Dos cosas que confirman los cambios de BP ya aplicados

`to_CteSociedad` trae `Akont: ""`, `Eikto: ""` (en `to_CteDatosComerciales`), `Antlf: "0"` y **`Altkn: "1234567890"`** — los cuatro coinciden con los valores que se fijaron en los dos constructores. Y `to_CteImpuestos` trae `Aland: "MX"`, `Tatyp: "TMX1"`, `Taxkd: "1"`, tambien como se fijo.

**Pero `Kvgr4` no es uniforme:** vale `"SI"` en cuatro areas de ventas, `"NO"` en `02/02/00` y `""` en `03/02/00`. Se fijo a `"SI"` en el codigo; **al actualizar un BP existente eso cambiaria el valor de las areas que hoy tienen otro**.

> [!note] Y un dato que contradice un supuesto de escritura
> Las 6 filas de `to_CteDatosComerciales` y las 25 de `to_CteFuncInterlocutor` traen **`Spart: "00"`**, no `"01"`. La migracion congelo `Division` en `"01"` porque SAP devolvia el error `CZ 115` con `"00"`. Las dos cosas pueden ser ciertas —`"01"` para **escribir** y `"00"` en lo ya existente— pero **el codigo de lectura no debe asumir `"01"`** al buscar el area de ventas de un cliente, o no encontrara nada.

### 3.0c · Las tres capturas de `CteTel` (`Partner='1500008218'`) — el caso limpio

> Aportadas por el usuario el 2026-09-21: `AI_GET_ZSDT_CTETEL`, `AS_GET_ZQBP_EditarCliente_CteTel` y `A_GET_TelefonoValidado`, las tres contra el mismo BP. Sirven para tres cosas que una sola no daba: fijar la forma de la respuesta, **probar que dos de los endpoints son redundantes**, y **cazar un renombrado de campo** que rompe la deserializacion.

#### Los datos

| `ZidcteTel` | `ZtipoCte` | `ZtelCte` | `Zfecha` | `Zvaltel` | `ZappOrig` |
|---|---|---|---|---|---|
| `"1"` | `"PARTICULAR"` | `3334523423` | `/Date(1788825600000)/` | **false** | `CteXpressFrontSAP` |
| `"0000000002"` | `"MOVIL"` | `3352323422` | `/Date(1788825600000)/` | **false** | `CteXpressFrontSAP` |

**Ninguno de los dos esta validado.** Ese es el valor de esta captura.

#### 1. `AI_GET_ZSDT_CTETEL` y `AS_GET_ZQBP_EditarCliente_CteTel` devuelven lo MISMO

Los dos responses son **identicos campo por campo y valor por valor**. Confirma lo que se leyo del codigo: `AI_GET_ZSDT_CTETEL` es un **wrapper puro** de la misma funcion interna `_get_ctetelset`.

**Consecuencia para el C#: solo se implementa uno de los dos.** El util es `AS_GET_ZQBP_EditarCliente_CteTel`, que acepta **9 query params** contra los 2 de su gemelo (`Partner`, `ZtelCte`). Implementar los dos seria exactamente el defecto que la **regla 28** prohibe: dos caminos con nombre distinto para el mismo dato.

#### 2. La forma de la respuesta: son **14** campos, no 13

`Client, Partner, ZidcteTel, ZtipoCte, ZtelCte, Zfecha, Zenvionip, Zvaltel, ZappOrig, ZfechaCap, ZtelExist, ZtraeTel, Zintentos, ZtipoValid`.

**`Client` (`"110"`) no estaba en el inventario previo**, que listaba 13. Va en la respuesta pero **no** en la clave de la entidad: el `__metadata.id` es `CteTelSet(Partner='1500008218',ZidcteTel='1')` — clave de **dos** campos, sin `Client`. Conviene tenerlo en el DTO y no en la clave.

Tipos observados: `Zenvionip`, `Zvaltel`, `ZtelExist`, `ZtraeTel` son **booleanos** de verdad (`false`, no `"false"`). `Zfecha`/`ZfechaCap` **si** vienen como `/Date(epoch_ms)/` aqui — al contrario de las fechas de `to_Cte`, que son string numerico (§3.0b). Y `Zintentos` vale `""`, no `"0"`, mientras en el BP `1500004598` habia filas con `"0"` y con `""`. **Sin normalizar.**

#### 3. 🔴 El casing esta confirmado en los dos servicios… y la ruta lo renombra

| Origen | Como llega el campo |
|---|---|
| `ZQBP_EDITARCLIENTE_SRV/CteTelSet` (esta captura) | **`Zvaltel`** |
| `ZAPI_BP05MA_SRV` → `to_CteTel` (§3.0b) | **`Zvaltel`** |
| **`A_GET_TelefonoValidado`** (su salida) | 🔴 **`ZvalTel`** |

**Los dos servicios de SAP coinciden en `Zvaltel` con t minuscula.** Y `A_GET_TelefonoValidado` **cambia el nombre del campo en su salida** a `ZvalTel`.

Eso cierra la duda del casing y explica un sintoma que ya estaba en el corpus: **el C# tiene el campo escrito de las dos formas en sitios distintos**. La forma de SAP es `Zvaltel`; `ZvalTel` es una invencion de esa ruta. Si el C# deserializa la salida de la ruta con un modelo que espera `Zvaltel`, **el booleano llega siempre `false` por defecto** — que es justo el valor que enmascara el bug.

**Decision que esto fuerza:** el C# consume `CteTelSet` **directo** y usa `Zvaltel`. No se porta el renombrado.

#### 4. 🔴 El caso limpio: el SP devolveria VACIO y la API devuelve un telefono

Con estos datos:

| | Resultado |
|---|---|
| **El SP** (`SP:194-202`): `WHERE Tipo='Movil' AND ValidacionTel=1` | **vacio** — ninguno de los dos esta validado |
| **`A_GET_TelefonoValidado`** | **`3352323422`** con `ZvalTel: false` |

**Esto es la decision pendiente reducida a su forma mas simple:** el SP dice *"este cliente no tiene telefono validado"*; la API dice *"toma este, que no esta validado"*. No son dos implementaciones del mismo criterio: son **dos respuestas incompatibles a la misma pregunta**. Y el consumidor no puede distinguirlas sin mirar el `ZvalTel` que, por el punto 3, probablemente le llegue mal deserializado.

**Hay que elegir, y es decision de negocio:** ¿el contrato del metodo C# es *"devuelve el movil validado, o vacio"* (fidelidad al SP) o *"devuelve el mas reciente, con su bandera"* (lo que hace la ruta hoy)? Lo segundo obliga a que **todos** los llamadores revisen la bandera, y hoy ninguno lo hace.

#### 5. Por que este BP no delata el bug del `max()` y el otro si

En esta captura los dos telefonos tienen **exactamente el mismo `Zfecha` y el mismo `ZfechaCap`**, asi que el `max()` desempata por `int(ZidcteTel)`: `2 > 1` → gana `3352323422`, que **resulta ser** el movil. **Coincide con lo que el SP habria elegido si hubiera alguno validado.** Acierta por casualidad.

En el BP `1500004598` (§3.0b) **no coincide**: ahi hay nulls en `Zfecha`, `str(None) = "None"` gana la comparacion de cadenas, y la ruta devuelve un telefono distinto del que da el SP.

> [!warning] **El defecto es intermitente segun los datos**, y eso es lo peor para detectarlo. Con `Zfecha` poblado en todas las filas el algoritmo parece correcto; con un solo null se invierte. Una prueba contra este BP pasaria y contra el otro fallaria. **No basta con un caso de prueba.**

#### 6. `ZtipoCte` sin normalizar: confirmado con dos BPs

| BP | Valor |
|---|---|
| `1500008218` (esta captura) | **`"PARTICULAR"`** |
| `1500004598` (§3.0b) | **`"particular"`** |

**El mismo valor logico con dos capitalizaciones, en el mismo entity set.** Un `$filter=ZtipoCte eq 'MOVIL'` en OData es sensible a mayusculas: el `Tipo='Movil'` del SP funcionaba por la collation case-insensitive de SQL Server y **no es portable tal cual**. Hay que normalizar en el cliente (`ToUpperInvariant`) y aceptar que el `$filter` del servidor no puede ser la unica defensa — o traer las filas del cliente y filtrar en memoria, que es lo contrario de lo que conviene por rendimiento. **Es una decision, no un detalle.**

#### 7. `ZappOrig = "CteXpressFrontSAP"` — y lo que eso significa para `@ValidacionOrigen`

Los dos telefonos traen ese origen. El SP cruza `TablaStD` con `CteTel` por el origen (`SP:186-191`) para resolver `@ValidacionOrigen`, y el catalogo es `ORIGEN VALIDACION NUMERO CTE`.

**Esta captura no prueba que el catalogo contenga `CteXpressFrontSAP`** — solo que el origen no esta vacio. Importa porque el codigo actual **degrado la regla** a *"`ZappOrig` no vacio"* (`OrderMethods.cs:639`) en vez de comparar contra el catalogo. Con estos datos los dos caminos dan el mismo resultado, asi que **la captura no distingue entre el codigo correcto y el degradado**. Para eso hace falta el contenido del catalogo.

#### 8. Dato de infraestructura: son dos puertos distintos

| Servicio | Host:puerto del `__metadata.id` |
|---|---|
| `ZQBP_EDITARCLIENTE_SRV` | `10.30.2.135:20400` |
| `ZAPI_BP05MA_SRV` (§3.0b) | `10.30.2.135:44300` |

**Mismo host, puertos distintos.** Coincide con que el repo tenga dos bases separadas (`SERVICE_URL` sobre `hostS4IP` y `S4_ODATA_DEV_BASE_URL` sobre `hostS4`). Para el C#: **son dos destinos de configuracion, no uno**, y el `Web.config` de `ServicioSAP` hoy no tiene ninguna clave `ZQBP_` (0 resultados). Hay que añadirla.

### 3.0d · `A_GET_BPValidaTelefonoCOFETEL` (`telefono=3334523423`) — y la contradiccion con `CteTel`

> Captura aportada por el usuario el 2026-09-21, mas lectura del codigo completo de la ruta.

```json
{ "existe": true, "tipoRed": "MOVIL", "razonSocial": null,
  "modalidad": null, "poblacion": null, "estado": null }
```

#### 1. 🔴 El hallazgo: COFETEL y `CteTel` NO coinciden sobre el mismo telefono

Es **el mismo numero** que la captura de `CteTel` del BP `1500008218` (§3.0c):

| Fuente | Que dice de `3334523423` |
|---|---|
| `CteTel` (`ZidcteTel='1'`) | **`ZtipoCte: "PARTICULAR"`** |
| COFETEL (`tipoRed`) | **`"MOVIL"`** |

**Y el SP filtra por el primero.** `SP:194-202` hace `WHERE Tipo='Movil'`, que lee `CteTel`. Con estos datos el SP **descarta** ese telefono; COFETEL afirma que **si es un movil**.

**Para que sirve este endpoint, entonces:** es la **fuente autorizada del tipo de red**, mientras `ZtipoCte` es lo que capturo la aplicacion que dio de alta el telefono. Encaja con que el usuario lo marcara como *"nuevo, no existia en el SP"*: no reemplaza ninguna logica del SP, **la corrige**. Y resuelve el problema de normalizacion de §3.0c desde la raiz, porque no depende de como haya escrito el tipo quien capturo el dato.

> [!important] **Decision de negocio que esto abre, y no es menor:** ¿quien decide si un telefono es movil — **`ZtipoCte`** (lo que capturo la app, y lo que replicaria la fidelidad al SP) o **`tipoRed`** de COFETEL (lo que dice el operador)? Replicar el SP es usar `ZtipoCte` y aceptar que el dato puede estar mal. Usar COFETEL es mas correcto **pero cambia el comportamiento observable**: telefonos que hoy el SP descarta pasarian a contar. Es la decision **G** (replicar contra corregir) aplicada a este punto.

#### 2. El catalogo `1138ValAutLadaTel` NO es un catalogo de validacion: es una tabla de longitud de lada

El codigo lo deja claro (`A_GET_BPValidaTelefonoCOFETEL.py:23-38`). Su unico uso es **decidir si la lada tiene 2 o 3 digitos**:

```python
result_lada2 = conn.procedure(sql_lada, ["1138ValAutLadaTel", telefono[:2]])
if result_lada2["result"]:                    # los 2 primeros digitos estan en el catalogo
    nir, serie, numero = telefono[:2], telefono[2:6], telefono[6:]
else:                                          # si no, la lada es de 3
    nir, serie, numero = telefono[:3], telefono[3:7], telefono[7:]
```

Eso corrige como lo clasificaba el plan, que lo metia en el mismo saco que los demas catalogos pendientes. **No sustituye a ninguna tabla del SP**: es infraestructura para partir el numero antes de consultar a COFETEL. Los tres trozos (`nir`, `serie`, `numero`) van como `int` a la lambda.

**Y la respuesta no dice que rama tomo.** No devuelve `nir`/`serie`/`numero`, asi que ante un resultado raro no se puede saber si partio el numero como 2+4+4 o como 3+4+3. Para el port conviene **exponer los tres valores** o al menos registrarlos, porque una lada mal partida da un `existe: false` silencioso.

#### 3. 🔴 Un endpoint, CUATRO formas de respuesta distintas — todas con HTTP 200 salvo la ultima

Esto impide escribir un DTO unico en C#:

| Cuando | Forma |
|---|---|
| El telefono no tiene 10 digitos, o no es numerico | `{"valido": false, "motivo": "..."}` (`:12-15`) |
| El telefono empieza con `0` | `{"valido": false, "motivo": "..."}` (`:18`) |
| Falla la consulta a HANA | `{"error": "..."}` (`:31`) |
| Todo bien | **lo que devuelva la lambda, verbatim** (`:40-43`) → `{existe, tipoRed, razonSocial, modalidad, poblacion, estado}` |
| Cualquier excepcion | HTTP **500** con `{"detail": "..."}` (`:46-47`) |

**Las tres primeras devuelven 200.** Un cliente C# que deserialice a la forma de exito recibe todos los campos en `null`/`false` y **no puede distinguir "el telefono es invalido" de "COFETEL no lo encontro"**. Para el port hacen falta dos cosas: (a) validar los 10 digitos y el `0` inicial **antes** de llamar, en el propio C#, y (b) un modelo que contemple las tres formas, o un `JsonDocument` y ramificar.

#### 4. La forma de exito es de la LAMBDA, no de la ruta

`:40-43` hace `return invoke_lambda_function("L_GET_BPValidaTelefonoCOFETEL", {...})` **sin tocar el resultado**. Asi que los 6 campos —`existe`, `tipoRed`, `razonSocial`, `modalidad`, `poblacion`, `estado`— son el contrato de **`L_GET_BPValidaTelefonoCOFETEL`**, cuyo codigo **no esta en el share**.

Consecuencia practica: **4 de los 6 campos volvieron `null`** en esta captura, con `existe: true`. O sea que la lambda encontro el numero y su tipo de red pero no la razon social, modalidad, poblacion ni estado. No se puede saber desde aqui si es que esas columnas estan vacias en `CREDICCOFETEL` para ese rango o si la lambda solo las llena en algunos casos.

**Para el DTO: los cuatro van nullable, y ninguna logica puede depender de ellos.** Los dos unicos campos sobre los que se puede construir una regla son `existe` y `tipoRed`.

#### 5. Lo que sigue sin resolverse

**Ninguna de las dos fuentes de este endpoint esta en S/4HANA**, y eso no lo cambia la captura: el catalogo vive en **HANA Cloud** (`CONFIGURACIONCATALOGOS` via `ConexionHANA`) y COFETEL en **SQL Server `SIGMavi`** (tabla `CREDICCOFETEL`, alcanzada por **lambda AWS**). Sigue en pie la decision de arquitectura: o el C# consume esta ruta por HTTP, o se replica el acceso a HANA, o el catalogo se migra a S/4.

Y ojo con la duplicacion que ya estaba anotada: **la particion 2-vs-3 digitos y la validacion de formato estan repetidas** en `A_GET_BPValidaTelefonoCOFETEL.py:11-18` y `:23-38` y en `A_POST_BPValidarTelefonoCOFETEL.py:27-34`, que son las dos de tu lista. En C# **debe ser un solo validador** — es el caso de manual de la regla 28.

> [!note] Hay una tercera copia en `A_GET_CXCValidaTelefono.py:9-13` y `:22`, que usa el mismo catalogo `1138ValAutLadaTel`. **`A_GET_CXCValidaTelefono` NO viene en el listado del usuario [FUERA DE TU LISTA - la introdujo Claude]**: salio de un analisis previo y se pidio expresamente en la busqueda. Se deja anotada como dato de la triplicacion, **no** como endpoint del alcance, y no se migra sin que el usuario la incorpore.

### 3.0e · `AS_GET_TipoCredito` sin filtros — el catalogo `ZTIPO_CTE` completo (21 tipos)

> Captura aportada por el usuario el 2026-09-21. Es la tabla entera: `ZID_TIPO_CTE` de `0000000001` a `0000000021`, **los 21 consecutivos, sin huecos**.

#### 1. La forma: NO es OData, es un envoltorio propio

```json
{ "statusCode": 200, "result": [ { …12 columnas… } ] }
```

Coherente con que la ruta sea **SQL directo a HANA** (`hdbcli`), no OData. Pero hay un detalle que el C# tiene que respetar: **el status viaja DOS veces** — en el HTTP y en `statusCode` del cuerpo. El codigo de la ruta devuelve `{"error": ...}` cuando `statusCode != 200`, asi que **un cliente que solo mire el HTTP puede tomar un error por exito**. Hay que leer el del cuerpo.

Las 12 columnas: `MANDT`, `ZID_TIPO_CTE`, `ZTIPO_CREDITO`, `ZTEXT_MOSTRAR`, `ZDESCRIP`, `ZMOSTRAR_CTE_EXP`, `ZMENS_USUAR`, `ZREF_PERS1`, `ZDOM_REF1`, `ZREF_PERS2`, `ZDOM_REF2`, `ZSOLIC_DOM_CAMP`. Coinciden con los 12 query params. `MANDT` vale `"110"` en las 21.

#### 2. 🔴 El orden no es determinista — hay que indexar por id

El orden de llegada es `20, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 4, 3, 5, 1, 21, 2, 19`. Casi descendente, **pero con la cola desordenada**. Confirma que la consulta **no lleva `ORDER BY`**: el orden es el que devuelva HANA y puede cambiar.

**Para el C#: nunca por posicion. Se indexa por `ZID_TIPO_CTE`** (un `Dictionary<string, TipoCredito>`), y si hace falta mostrarlos ordenados, se ordena en el cliente.

#### 3. 🔴 Los cinco campos "booleanos" tienen TRES estados, no dos

`ZREF_PERS1`, `ZDOM_REF1`, `ZREF_PERS2`, `ZDOM_REF2`, `ZSOLIC_DOM_CAMP` llegan como `"1"`, `"0"` **y `""`**:

| `ZID_TIPO_CTE` | Tipo | Los cinco campos |
|---|---|---|
| `0000000012` | Credito Venta Cruzada | **los 5 en `""`** |
| `0000000008` | Credito Seguro Express | **los 5 en `""`** |
| `0000000006` | Credito Agil Calzado | **los 5 en `""`** |
| `0000000019` | Credito Cambaceo | **`ZREF_PERS1: ""`** y los otros cuatro en `"0"` — mezclado dentro de la misma fila |

**Un `bool.Parse` reventaria y un `== "1"` trata `""` igual que `"0"` sin decirlo.** Para el DTO van como `string` o como tri-estado, nunca `bool`. Y queda una pregunta de negocio: **`""` significa `0`, o significa "no configurado"?** Con 3 tipos enteros en ese estado no es un dato sucio aislado.

#### 4. 🔴 `"0"` es el centinela de "sin texto" en dos columnas de texto libre

`ZDESCRIP` y `ZMENS_USUAR` traen **el literal `"0"`** cuando no hay texto, en vez de `""` o `null`:

| Tipo | `ZDESCRIP` | `ZMENS_USUAR` |
|---|---|---|
| `0000000020` App credilana | `"0"` | `"0"` |
| `0000000015` Dineralia | `"0"` | `"0"` |
| `0000000012` Vta Cruzada | `"0"` | `"0"` |
| `0000000009` Internet | `"0"` | `"0"` |
| `0000000019` Cambaceo | `"0"` | `"0"` |
| `0000000021` APP Viu | `"0"` | `"0"` |
| `0000000017` Referenciado | texto real | **`"0"`** |
| `0000000016` Internet 2 | texto real | **`"0"`** |

**Si el C# pinta `ZMENS_USUAR` en pantalla, le muestra un `0` al usuario.** Hay que tratar `"0"` como vacio en esas dos columnas — y **solo en esas dos**, porque en las cinco banderas `"0"` si significa cero.

#### 5. `ZTEXT_MOSTRAR` trae formato de presentacion dentro del dato

`"I N T E R N E T"`, `"I N T E R N E T 2"`, `"E X P R E S S"` — espacios intercalados como decoracion. **Nada puede comparar por ese campo**: un `== "INTERNET"` falla. Es etiqueta para pintar, y la llave es `ZID_TIPO_CTE`.

(De paso: `ZDESCRIP` tiene faltas de tipeo repetidas — *"tal como secede"* en cuatro filas, *"Referecias"* en varias. Confirma que es texto capturado a mano: **no se puede parsear**, solo mostrar.)

#### 6. 🔴 El hallazgo de fondo: el tipo de credito de ecommerce NO pide referencias, y el flujo las captura

Los candidatos para el credito web de ecommerce son dos, y los dos llevan `ZSOLIC_DOM_CAMP: "1"`:

| id | `ZTIPO_CREDITO` | `ZDESCRIP` | `ZREF_PERS1` | `ZDOM_REF1` | `ZREF_PERS2` | `ZDOM_REF2` |
|---|---|---|---|---|---|---|
| `0000000009` | **Credito Internet** | `"0"` | **0** | **0** | **0** | **0** |
| `0000000016` | **Credito Internet 2** | *"Captura corta, solicitud sin consulta a buro"* | **0** | **0** | **0** | **0** |

**Los dos declaran que no se piden referencias personales ni sus domicilios.**

Y el SP hace lo contrario: tiene la rama **`InsertReferencia`** completa (`SP:370-603`, 17 columnas, el parser multiplexado) y `CreditoWeb_SaveData_Articulos` inserta **hasta 3 referencias** segun los flags `data[40]`, `data[48]`, `data[56]`.

> [!important] **Pregunta de negocio, y es de primer orden:** si el tipo de credito del flujo web es *Internet* o *Internet 2*, **¿por que el flujo captura referencias que el catalogo dice que no se piden?** Hay tres respuestas posibles y cambian el alcance:
> 1. El tipo del flujo web **no es** ninguno de esos dos — entonces hace falta saber cual es.
> 2. El catalogo **no se consulta** en el flujo web: las referencias se capturan siempre, y estas banderas gobiernan otra aplicacion (el punto de venta). Entonces `InsertReferencia` se porta tal cual y este catalogo **no entra** en el alcance del SP.
> 3. Las banderas **si** gobiernan, y el flujo actual esta capturando datos que no deberia. Entonces la rama de referencias es la que hay que revisar.
> **Hasta que esto se responda, la rama `InsertReferencia` no se puede declarar migrada con criterio**, aunque el codigo se escriba.

#### 7. Y la misma contradiccion, por duplicado, en Credilana

| id | `ZTIPO_CREDITO` | `ZTEXT_MOSTRAR` | Las 5 banderas |
|---|---|---|---|
| `0000000020` | Credito App credilana | `APP CREDILANA` | **todas `"0"`** |
| `0000000021` | Credito APP Viu | `APP VIU PRESTAMOS` | **todas `"0"`** |

Esos dos son la variante **Credilana** del codigo (`CredyPrestamoMethods`) y la de **VIU**. El catalogo dice que **ninguna pide referencias**… y el hallazgo bloqueante de §7 del plan de ejecucion es justamente que **`CredyPrestamoMethods.cs:131-204` inserta hasta 3 referencias**.

**Las dos variantes del flujo insertan referencias que el catalogo declara innecesarias.** Eso refuerza la hipotesis 2 de arriba (el catalogo gobierna otra aplicacion), pero **no la prueba**, y la diferencia importa: si gobierna, el bloqueante deja de ser "hay que portar las 3 referencias de Credilana" y pasa a ser "hay que decidir si se portan".

#### 8. Lo que este catalogo SI resuelve

**`Cte.ZtipoCredito` tiene ahora dominio conocido.** El campo existe en el modelo C# (`Cte.cs:80`, añadido en esta migracion) y hoy **se manda vacio**. Los valores validos son los 21 `ZID_TIPO_CTE`, o los 21 `ZTIPO_CREDITO` si lo que se guarda es el texto — **eso hay que confirmarlo**, porque el campo del BP es `ZtipoCredito` (texto) y la llave del catalogo es `ZID_TIPO_CTE` (numerico de 10 posiciones). En la captura de BP05 del §3.0b ese campo venia `""`, asi que no hay ejemplo de cual de los dos formatos espera.

**Y `ZtipoCliente` no se confunde con esto:** son dos cosas distintas. `ZtipoCliente` ∈ {`Nuevo`, `Prospecto`} decide si es prospecto (§3.0b); `ZtipoCredito` es uno de estos 21 y decide la modalidad del credito.

### 3.0f · `AS_GET_ZCTE_CREDITO` sin filtros — el catalogo `ZCTE_CREDITO`, 45 politicas

> Captura aportada por el usuario el 2026-09-21, mas lectura del codigo de las dos rutas de catalogo.

#### 1. ✅ Cierra el enlace de `to_Cte.Zcredito`

En la captura de BP05 (§3.0b) `to_Cte.Zcredito` vale **`"0.1 CLIENTE (AAA)"`**. Y en este catalogo **existe exactamente esa fila**, con `ZCALIDAD_EN_QUE_VIVE: "PROPIETARIO, NO PAGA E INTESTADO"`.

**Enlace confirmado: `to_Cte.Zcredito` → `ZCTE_CREDITO.ZCREDITO`.** Y con eso queda claro por que `Zcredito` no es un numero: **la llave de este catalogo es texto libre**, la descripcion completa de la politica.

Coherente con que `AS_GET_ZQBP_EditarCliente_CteCredito` filtre por `Zcredito` y no por cliente: **es la llave del catalogo, no del BP**.

#### 2. 🔴 El catalogo NO lleva limites de credito, y eso cierra una pregunta

`ZLIMITE_CREDITO` vale **`0` en las 45 filas**. Igual `ZLIMITE_PEDIDOS`. Y son los unicos dos campos numericos; los otros 11 son string.

**Consecuencias:**
- **El limite es por cliente, no por politica.** Confirma que `GetSaldo` tiene que leer `Zcrmcantidad` del BP (que en la captura vale `"12345678.20"`) y que **este catalogo no aporta nada al limite**.
- **Ninguna columna trae SALDO** (lo dispuesto o adeudado). La pregunta de si alguno de los endpoints de credito cerraba el hueco del **saldo CXC** queda respondida: **no**. Sigue sin equivalente.

De hecho **casi todo el catalogo es constante**. Solo varian tres columnas:

| Columna | Valor |
|---|---|
| `ZCREDITO` | la llave, 45 valores distintos |
| `ZCALIDAD_EN_QUE_VIVE` | 20 valores distintos |
| `ZCON_LIMITE_PEDID` | `"0"` en 40 filas, **`""` en 5** (DINERALIA, CREDILANA EMPRESARIO, CLIENTE HUESPED SIN BURO, AFILIADOR DIMA, 0.1 CLIENTE (AAA)) |

Las otras diez son iguales en las 45: `MANDT "110"`, `ZCON_CREDITO "1"`, `ZCON_LIMITE_CRED "0"`, `ZLIMITE_CREDITO 0`, `ZLIMITE_PEDIDOS 0`, `ZMONEDA_CRED "Pesos"`, `ZCON_DIAS "0"`, **`ZDIAS ""`**, `ZCON_CONDICIONES "0"`, **`ZCONDICIONES ""`**.

**`ZDIAS` y `ZCONDICIONES` estan vacias en las 45**: columnas que existen y no se usan. Nada que migrar de ahi.

#### 3. La estructura: 19 politicas × 2 variantes + 7 sueltas

**19 politicas numeradas**, cada una en dos versiones — con y sin el sufijo `(COLOCACION)` — y con **todos los demas campos identicos**:

`1.1 PROP COMPRUEBA` · `1.1.1 AVAL PROP COMPRUEBA` · `1.2 PROP ESPECIAL` · `1.2.1 AVAL POLITICA ESPECIAL` · `1.3 PROP NO COMPRUEBA C/BURO` · `1.3.1 AVAL CON BURO` · `1.4 PRP NO COMPUEBA DE RIESGO` · `1.4.1 AVAL DE RIESGO` · `2.2 CLIENTE POLITICA ESPECIAL` · `2.2.1 AVAL NP/INTS SI COMPROBO` · `2.3 CLIENTE NP/INTS NO COMP C/BURO` · `2.3.1 AVAL NP/INTS SI COMP C/BURO` · `2.4 CLIENTE NP/INTS NO COMP DE RIESGO` · `2.4.1 AVAL NO COMPRUEBA DE RIESGO` · `3.3 CLIENTE RENTA C/BURO` · `3.3.1 AVAL RENTA CON BURO` · `3.4. CLIENTA RENTA DE RIESGO` · `3.4.1 AVAL RENTA DE RIESGO` · `4.1 CLIENTE HUESPED CON BURO`

**7 sueltas, sin par:** `DINERALIA`, `CREDILANA EMPRESARIO`, `CLIENTE HUESPED SIN BURO`, `CLIENTE EXPRESS R/P`, `AFILIADOR DIMA`, `0.1 CLIENTE (AAA)`, `0.0 CLIENTE EXPRESS`.

**El problema:** la unica diferencia entre las dos variantes de una politica **esta en el texto de la llave**. No hay columna que marque cual es "de colocacion". Si el codigo busca por `ZCREDITO` con el texto normalizado o recortado, **coge la equivocada sin avisar**.

#### 4. 🔴 Una llave esta TRUNCADA a 50 caracteres exactos

```
"2.4 CLIENTE NP/INTS NO COMP DE RIESGO  (COLOCACION"
```

**Le falta el `)` de cierre.** Son exactamente 50 caracteres, y su pareja sin sufijo cabe de sobra — asi que no es un typo: es **truncamiento de columna**, probablemente `VARCHAR(50)`.

Y `ZCREDITO` **es la llave**. Consecuencias directas:
- Una busqueda por el nombre completo *"…DE RIESGO  (COLOCACION)"* **no la encuentra**.
- Si algun cliente tiene esa politica en su `to_Cte.Zcredito`, el valor que trae el BP puede estar truncado igual, o no — y entonces **no casaria con el catalogo**.
- Cualquier validacion del tipo *"el `Zcredito` del cliente existe en el catalogo"* puede dar falso negativo por esa fila.

**Es un dato sucio en produccion, no un defecto del codigo.** Hay que decidir si el C# normaliza (recorte a 50 y comparacion por prefijo) o si se corrige el dato en origen.

#### 5. `ZCALIDAD_EN_QUE_VIVE`: es un atributo, NO una tabla de derivacion

Los 20 valores observados: `NO APLICA`, `HUESPED SIN BURO`, `EXPRESS`, `HUESPED CON BURO`, `AVAL RENTA`, `RENTA`, `AVAL RENTA CON BURO`, `RENTA CON BURO`, `AVAL RIESGO`, `NO PAGA - INTESTADO NO COMPRUEBA`, `AVAL NO PAGA - INTESTADO CON BURO`, `NO PAGA - INTESTADO NC CON BURO`, `AVAL NO PAGA - INTESTADO`, `NO PAGA - INTESTADO`, `PROP NO COMPRUEBA`, `AVAL CON BURO`, `PROP NC CON BURO`, `AVAL PROPIETARIO`, `PROPIETARIO`, `PROPIETARIO, NO PAGA E INTESTADO`.

Tentador leerlo como *"la tabla que deriva la politica de credito desde la calidad en que vive"* — el SP tiene la columna `viveEnCalidad` y el BP tiene `ZviveencCal` (vacio en la captura) y `ZidVivEnCalid` (tambien vacio).

**Pero no lo es: la relacion es many-to-one.** `AVAL RIESGO` aparece en `2.4.1` y en `1.4.1`; `NO PAGA - INTESTADO` en `2.2` y `1.2`; `AVAL NO PAGA - INTESTADO` en `2.2.1` y `1.2.1`. **Desde la calidad en que vive no se puede derivar la politica**, porque varias politicas comparten la misma calidad. Es un **atributo descriptivo** de la politica, no una llave de busqueda.

Lo que si aporta: **el dominio de valores** que puede tomar la calidad en que vive, util para validar `ZviveencCal` — pero no como fuente de la politica.

#### 6. 🔴 Dos rutas hermanas, dos envoltorios distintos

Verificado en codigo, y es una trampa para el cliente C#:

| Ruta | Que devuelve | Forma |
|---|---|---|
| `AS_GET_TipoCredito` | `return result` (`AS_GET_TipoCredito.py:83`) | **`{"statusCode": 200, "result": [...]}`** |
| `AS_GET_ZCTE_CREDITO` | `return result["result"]` (`AS_GET_ZCTE_CREDITO.py:59`) | **`[...]` array pelado** |

Las dos leen HANA con el mismo `conn.procedure` y las dos devuelven `{"error": ...}` si el `statusCode` interno no es 200 (`:81` y `:57`) — **con HTTP 200**.

**Para el C#: hacen falta dos deserializadores distintos para dos catalogos hermanos**, y en los dos casos hay que mirar el status del CUERPO, no el del HTTP. Es exactamente el tipo de inconsistencia que conviene normalizar en el cliente con un envoltorio propio.

### Dos cosas del inventario que hay que fijar antes de escribir

**Version de protocolo.** `CreditMethods.cs:302` fuerza **OData V4** (`baseUrl.Replace("/odata/sap","/odata4/sap")`) mientras el PATCH de BP es **V2** (`BusinessPartnerMethods.cs:840`). Cambia formato de fecha, envoltorio y CSRF. Y `zsb_sd40_condpago` —el V4— es justo la dependencia de precio del credito.

**Formato de fecha.** `FormatDateSapOData` produce `/Date(ms)/`, que es V2 (`BusinessPartnerMethods.cs:812-825`). Es **`private static`**, inalcanzable desde una clase nueva, y ya esta **reimplementado inline** en `OrderMethods.cs:1545-1547`. Una tercera copia viola la regla 12; promoverlo a helper compartido es tocar codigo existente, que `GUIA:275` obliga a consultar primero.

### Piezas de infraestructura que ya existen y sirven

| Pieza | Donde | Para que |
|---|---|---|
| Handshake CSRF generico, parametrizado por URL | `Helpers/TokenGenerator.cs:135` (`GetTokenSapAsync`), fabrica en `:113` (`CreateClientS4`) | Toda escritura OData. Ya en uso contra BP01 (`BusinessPartnerMethods.cs:77-81`) |
| PATCH por clave de negocio | `BusinessPartnerMethods.cs:840-858` → `ZSDT_CTE_ENTITYSet(ZclienteBp='…')` | Actualizacion parcial. **Hoy solo manda un campo** (`ZidMagento`, `:848`) |
| Clave doble en URL | `BusinessPartnerMethods.cs:302` → `BusinessPartnerSet(Partner='..',Client='..')` | Precedente probado |
| Persistencia local | `Helpers/ConexionDB/SQLiteDb.cs` (`SetAsync:158`, `GetAsync:240`), ruta en `Web.config:60` | Estado inter-peticion. En uso en `OrderMethods.cs:553-568` y `CredilanaMethods.cs:16-17` |
| Guardado de expediente | `Methods/Credit/DocumentMethods.cs:33-58`, ruta en `Web.config:63` | Las imagenes ya se guardan en disco |
| Encolado de SMS | `INSERT INTO TcAAEA00030_EnvioMensajes` ya escrito desde `ServicioSAP` | La pata de SMS ya existe |
| Capturas reales de SAP | `Logs/sap.log` — **4 pares request/response** (2 order, 2 BP), escritos por `Helpers.Logger.SAP` (`OrderMethods.cs:733`, `BusinessPartnerMethods.cs:852, 863`) | El gate E2E de la regla 25 |

> [!note] Dos cosas declaradas imposibles que si existen
> El corpus afirma que *"no hay ni una captura de respuesta exitosa de SAP"*: **`Logs/sap.log` tiene 4 pares reales.** Contiene datos de cliente — tratarlo como PII, no pegarlo en un `.md`.
> Tambien existe **`ServicioSAP/.git`**, que nadie uso y que resuelve la deriva de citas de todo el corpus.
> **Aviso en contra, confirmado por el usuario: NO se puede probar sin SAP.** Los `Fakes/Conexion.fakes`, `Fakes/ConexionSap.fakes` y `FakesAssemblies/` que estan en el proyecto **se generaron sin querer** y son codigo obsoleto: no son infraestructura de prueba utilizable. No construir ningun plan de verificacion sobre ellos.

### Sobre los verbos HTTP: `POST` + `GET` + `PATCH` alcanzan

`PUT` no existe en el proyecto (`HttpMethod.Put` y `new HttpMethod("PUT")` → **0 coincidencias** en los 210 `.cs`), y **para este SP no hace falta.** Lo que hay cubre las tres operaciones que el SP necesita:

| Operacion del SP | Verbo | Evidencia en `ServicioSAP` |
|---|---|---|
| Alta de la entidad completa | **POST** | `SubmitClientInfoAsync` → `BPartnerSet` (`BusinessPartnerMethods.cs:74-157`) |
| Lectura | **GET** | Toda la superficie de consulta |
| Actualizacion **parcial** por clave | **PATCH** | `new HttpMethod("PATCH")` ×4: `BusinessPartnerMethods.cs:854`, `DeliveryAddressMethods.cs:124` y `:165`, `ProductMethods.cs:1264` |

> [!important] Para la rama `Update`, un `PUT` seria incorrecto
> La rama `Update` pisa **9 columnas de 59** (`SP:356-364`). Eso es una actualizacion **parcial** por definicion, y su verbo es `PATCH`.
>
> En OData V2 `PUT` **reemplaza la entidad completa**: usarlo ahi borraria los otros 50 campos. No es que falte una capacidad — es que el verbo correcto ya esta implementado.

**De donde salio el requisito de `PUT`, y como se resuelve (D10).** De las Fases 2 y 3 del `PLAN_BP05`, que consisten en portar `AS_PUT_ZQBP_EditarCliente_CteTel` y `AS_PUT_ZQBP_EditarCliente_CteLimiteCred`. Verificado: esas rutas de `businesspartner-dev` **si declaran `@app.put`** y **si mandan `session.put()` hacia SAP** (`AS_PUT_ZQBP_EditarCliente_CteTel.py:91`, `AS_PUT_ZQBP_EditarCliente_CteLimiteCred.py:59`).

> [!important] D10 · `PUT` no esta habilitado — esas dos operaciones se implementan como `PATCH`
> Decision del usuario: **no se habilita `PUT` en `ServicioSAP`**, precisamente para **no borrar datos al actualizar unicamente los campos solicitados**. Toda actualizacion parcial va por `PATCH`.
>
> Aplica a las dos operaciones de arriba (`CteTel` y `CteLimiteCred`) y a cualquier otra que se porte: **el Python es la referencia del contrato y del destino, no del verbo.** Donde la implementacion de referencia manda `PUT`, aqui va `PATCH` con solo los campos que cambian.

Dos consecuencias de D10 que hay que resolver al implementar, no al planear:

1. **Verificar que el servicio acepte `PATCH`.** Los 4 `PATCH` que ya existen en el proyecto van contra **otros** servicios (`ZSDT_CTE_ENTITYSet`, `API_BUSINESS_PARTNER`, el de producto). Que `ZQBP_EDITARCLIENTE_SRV` acepte `PATCH` esta **SIN EVIDENCIA**: el Python usa `PUT` contra el, y en OData V2 el verbo de actualizacion parcial puede ser `MERGE` en lugar de `PATCH` segun la version del gateway. Si el servicio rechaza `PATCH`, la salida correcta **no** es volver a `PUT`: es usar `MERGE`, o el tunel `X-HTTP-Method: MERGE` sobre un `POST` — que hoy no existe en el proyecto (0 coincidencias de `X-HTTP-Method` y de `"MERGE"`).
2. **El canal de API intermedia no honra D10 por si solo.** Por **D7** la llamada puede ir a `businesspartner-api.mavi.fun`, pero esas rutas declaran `@app.put` y adentro hacen `session.put()` hacia SAP. Es decir: **pasar por la API intermedia reintroduce el `PUT` que D10 prohibe.** Para respetar la decision hay dos caminos, y es eleccion de implementacion: pedir una variante `PATCH` en la API intermedia, o que `ServicioSAP` arme el `PATCH` directo contra el servicio para estas dos operaciones.

**`DELETE`** aparece una sola vez (`ProductMethods.cs:1296`). Ninguna unidad de este SP borra nada, asi que no aplica.

### Lo que si falta de verdad: el upsert de `CteTel`

**No hay lectura previa para decidir entre actualizar e insertar.** `toCteTel` solo se arma dentro del alta de BP (`BusinessPartnerMethods.cs:656-671`, `OrderMethods.cs:2935-2950`), y **siempre con `ZidcteTel = ""`**. No existe en ningun lado un "leer `CteTelSet`, decidir, escribir".

Aplica a este SP **solo si** se escriben telefonos sobre un BP que ya existe — que es el caso del cliente recurrente. En el alta de un cliente nuevo no se necesita: el `POST` del BP los lleva anidados.

Riesgo al implementarlo: `CteTel.cs:15-20` declara `ZenvioNip`, `ZvalTel`, `ZtelExist` y `ZtraeTel` como `bool` **no anulables**, asi que un upsert ingenuo estampa `ZvalTel=false` y **corrompe** el estado de validacion telefonica en SAP.

---

## 4. El flujo, unidad por unidad

### 4.1 · Rama `Insert` — el alta de la solicitud (`SP:172-349`)

**Que hace.** Antes de escribir resuelve condicion y articulo si el origen es `DIMAS MX` (`SP:174-183`), arma un contexto de validacion telefonica con 3 lecturas (`SP:186-208`), calcula `@ValidacionTelefono` **pisando siempre el parametro de entrada** (`SP:210-221`), inserta 59 columnas y devuelve `SCOPE_IDENTITY()` (`SP:346-348`).

**Las 4 lecturas previas y su equivalente:**

| Lectura | SP | Equivalente | Estado |
|---|---|---|---|
| `CREDICCondicionArt` (solo `DIMAS MX`) | `:176-182` | Condicion → `zsb_sd40_condpago` con `$filter` sobre `Zdima`, ya consumido por `CreditMethods.GetCondicionesPagoAsync` (`:297-318`). **Articulo → sin equivalente**: el SP toma `MAX(IdCondicionArt)` sin filtro, semantica que no existe en ninguna OData | PARCIAL |
| `TablaStD ⋈ CteTel` → `@ValidacionOrigen` | `:186-191` | **`TablaStD` se convirtio en `CatalogoConfiguracion`**: `AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=<nombre>` por el **canal 4**. Ya invocado (`ProductMethods.cs:711`, `WalletMethods.cs:35`) y con helper listo: `GetCatalogoConfiguracionAsync("ORIGEN VALIDACION NUMERO CTE")` | **SI** |
| `CteTel` → `@TelefonoValidado` | `:194-202` | `ZAPI_BP05MA_SRV/BusinessPartnerSet(...)?$expand=to_CteTel`, filtrando en codigo `ZtipoCte=='MOVIL' && Zvaltel`. Ya implementado en `IsValidatedAsync` (`OrderMethods.cs:605-649`) | SI |
| `TcAAEA00030_EnvioMensajes` → `@TelefonoAValidar` | `:205-208` | **No va a OData**: es tabla local de `ServicioAndroid`, no cruce a Intelisis. Se queda como lectura SQL directa, ya escrita **dos veces** (`OrderMethods.cs:573-604` y `CreditMethods.cs:262-295`) | SI |

> [!danger] Falso positivo corregido — no volver a mapear `TablaStD` a `CODEMSTRD`
> Una version previa de este documento mapeaba `TablaStD` a `ZQBC_CODEMSTRD_SRV/WACODEMSTRDSet` diciendo que `ZcodeProgram` hacia de `TablaSt`. **Es falso.** `GetConsultaAnexosAsync` (`BusinessPartnerMethods.cs:875-898`) consulta ese servicio con `$filter=ZcodeProgram eq '...'` y devuelve `AnexosResult`: es el catalogo de **anexos** (generacion de RFC y similares), no el de configuracion. Se parecen en que los dos son clave-valor, y nada mas.
>
> El equivalente correcto es **`CatalogoConfiguracion`** por el canal 4, confirmado por el usuario.
>
> Y hay un dato que el propio codigo documenta: `OrderMethods.cs:654-655` describe el SQL legado de esta lectura, y `:669` dice literalmente *"antes se validaba contra catalogo tablastd"*. Es decir, **el codigo actual descarto a sabiendas la validacion contra catalogo** y la degrado a *"`ZappOrig` no vacio"* (`:639`). Con el canal 4 disponible, restituirla es posible; hacerlo o no es decision del usuario, porque hoy la regla esta mas ancha que en el legado.

**Defecto a corregir al portar:** `IsValidatedAsync` hace `FirstOrDefault` **desnudo, sin `OrderBy`** (`OrderMethods.cs:636-641`). El `ORDER BY Fecha DESC` del SP (`:202`) **no esta replicado**: con dos moviles validados, el SP toma el mas reciente y el C# toma el que SAP devuelva primero.

**Las 59 columnas, por bloque:**

| Bloque | Columnas | Equivalente |
|---|---|---|
| Datos personales y domicilio | 19 | `ZAPI_BP01_PARTNER_SRV/BPartnerSet` + `toCte`. Mapeo verificado: `apellidoP→NameLast`, `nombre→NameFirst` |
| Antiguedad y vivienda | 3 | `Cte.ZantigAnios:11`, `ZantigMeses:12`, `ZviveencCal:26` / `ZidVivEnCalid:75` |
| Ingreso | `sueldo` | `Cte.ZingMensCredw:35` y/o `CteCtoJob.Zingresos` |
| Telefonos | 6 | `toCteTel`: un renglon por telefono, `ZtelCte` = numero completo |
| Archivos | 4 | **No va a OData.** Las imagenes ya se guardan en disco (`DocumentMethods.cs:33-58`); falta donde vive el metadato |
| Articulo y condicion | 3 | `condicion → Pmnttrms/ZtermKnvv` de la cabecera (`OrderMethods.cs:2381`) |
| Identidad del cliente | 4 | `cliente → BusinessPartner`; `idMagento → Cte.ZidMagento` via `LinkMagentoAccountAsync` (`:829-873`) |
| Procedencia y marketing | 3 | `origen → Zorigen` (`:2422`); `utmSource → Zobservaciones` (`:2390`) |
| Sucursal y agente | 3 | `SalesOff`/`Vwerk`, validables contra `ZAPI_SUCURSALES_SRV` (`AccountMethods.cs:185-190`) |
| Monedero | `RedimirMonedero` | `Zredimepos` (`:2415`) + `Zredimepuntos` (`:2427`) |
| Estado y seguimiento | 3 | `Zsituacion` + `Zsituacionfecha` + `Zsituacionusuario` (`:2392-2394`) |
| Cita | `FechaCita`, `HoraCita` | `Cte.Zcita:76` — **un solo campo para dos columnas**, ver §8 |
| Capacidad crediticia | `tarjeta`, `tarjetaDigitos`, `creditoHipoteca`, `creditoAutomotriz` | **3 sin equivalente** (§7.3) |

**Estado que pasa a codigo:** el contexto de validacion telefonica (hoy 3 variables locales, `SP:164-166`) → clase inmutable `PhoneValidationContext { OrigenAutorizado, TelefonoValidado, TelefonoDelSms, TieneOrigenEnCatalogo }`, vida = la peticion, 100% derivable, no persiste nada. Los `TOP 1` (`SP:186, 194, 205`) y el `ORDER BY` (`:202`) pasan a `OrderByDescending().FirstOrDefault()` en memoria.

**Ubicacion:** archivo nuevo en `Methods/Credit/`, junto a `CreditMethods.cs` y `CredilanaMethods.cs`. Patron del proyecto: clase publica, metodos `async` con sufijo `Async`, URL con `obtenerUrl`, cliente por `TokenGenerator.CreateClientS4()`, CSRF por `GetTokenSapAsync` para escrituras, errores a `Helpers/Logger.SAP`, modelos en `Models/SAP/Credit/`.

**Orden:** (1) cerrar las decisiones de §8; (2) modelos sin logica; (3) generalizar `GetConsultaAnexosAsync` a `GetCodeMasterAsync(zcodeProgram)` — refactor puro sobre codigo probado; (4) consolidar las **dos** copias de `ObtenerNumeroTablaSmsAsync` en una; (5) `ObtenerContextoValidacionTelefonoAsync` (solo GET, validable sin escribir); (6) `ResolverValidacionTelefono` con la semantica de §4.6; (7) `ResolverCondicionArticuloDimaAsync`; (8) `ArmarRecord` — sin I/O, puramente funcional, aqui van los tests de paridad campo por campo; (9) persistencia e identidad; (10) orquestacion **en el orden del SP** (la sub-rama DIMA pisa condicion y articulo, asi que va antes del armado); (11) endpoint y redireccion de `CrearSolicitudCreditoAsync`; (12) verificacion contra el consumidor vivo del id.

---

### 4.2 · Rama `Update` — 9 columnas (`SP:351-368`)

**Que hace.** Segunda escritura parcial sobre la **misma fila** que creo el `Insert`: pisa 9 columnas (`estatus`, `codigo`, `extencionArchivo_1/2/3`, `tarjeta`, `tarjetaDigitos`, `creditoHipoteca`, `creditoAutomotriz`) por `id = @Id` y devuelve `@Id` tal cual, **sin comprobar `@@ROWCOUNT`**. Responde lo mismo si actualizo 1 fila o ninguna. Son ~18 lineas: el paquete es contrato y alcance, no implementacion.

> [!danger] La rama `Update` esta VIVA — la premisa que circulaba es falsa
> `PLAN_BP05:124` afirma *"todos los consumidores conocidos mandan `@Op = 'Insert'` fijo"*. **Refutado 3/3.**
>
> De los 3 puntos de llamada al SP en LAN, **solo uno** manda `Insert` fijo (`CreditMethods.cs:151`). Los otros dos reciben `@Op` **como variable desde el body HTTP, sin validacion** (`CreditController.cs:217` y `:409`).
>
> Y el productor esta identificado: **Magento 2.4.8, modulo `Mavi_CreditMigration`, flujo Credilana**, que manda `'op' => 'Update'` en dos flujos distintos.

**Tres cosas que hay que decidir aqui, no implementar:**

1. **Sobrescritura incondicional.** Las 9 asignaciones no llevan `COALESCE`/`ISNULL` (`SP:356-364`). Replicarlo es fidelidad; convertirlo en "patch solo lo presente" es **cambio de semantica**.
2. **Contrato de `@Op`.** Hoy es string libre sin whitelist ni en DMZ ni en LAN. Un `@Op` desconocido **no escribe, no falla y devuelve 0 filas**, y `OrderMethods.cs:919` lee `Rows[0][0]` → solicitud fantasma con id `0`. ¿Se valida el conjunto de operaciones o se replica el pass-through?
3. **`WITH (ROWLOCK)`** (`:354`) no tiene equivalente ni en codigo ni en OData. Se descarta y se documenta.

`estatus` es un marcador de flujo **sin equivalente OData identificado**; en codigo es una propiedad del estado. Y traducirlo a `Zsituacion` (texto, `OrderMethods.cs:2392`) requiere una tabla de correspondencia que no existe.

---

### 4.3 · `InsertReferencia`, camino corto — 8 columnas (`SP:376-401`)

Por **D6**: escritura directa a `ServicioAndroid`, misma tabla, mismas columnas.

**Discriminador** (`SP:372-375`): `IF (SELECT COUNT(item) FROM fnSplit(@apellido_m_ref,'~')) = 1` → camino corto. En codigo: predicado sobre la cadena, contando separadores `~`.

**`@apellido_m_ref` no es un apellido.** Es `VARCHAR(4000)` y funciona como canal multiplexado. El changelog lo documenta (`SP:39-44`): el camino largo es el flujo de **afiliaciones y credito hechos por agentes**.

**Estado a codigo:** un DTO `ReferenciaSolicitudCredito` con **las 17 propiedades** (D6); el camino corto llena las 8 primeras y deja las 9 de domicilio en `null`, que es exactamente lo que produce hoy el `INSERT` de `SP:377-396` al no nombrarlas. Un DTO unico para los dos caminos conserva la forma de la tabla y permite un solo escritor.

**El identity de salida** (`SP:398-400`) **pisa el parametro de entrada `@Id`**. En C# son dos variables distintas: `idSolicitud` (entrada) e `idReferencia` (retorno). No reutilizar la de correlacion.

> [!note] Quien escribe esa tabla hoy no es el SP
> `grep -rni 'InsertReferencia'` en LAN, DMZ y ServicioSAP → **0 coincidencias**. En produccion la escribe **SQL inline**: `LAN/WebApiMagento/Metodos/Credit/Methods.cs:175-176` (tres `INSERT` con el mismo `@IDSolicitud` en `:183, :210, :236` → hasta 3 referencias por solicitud) y su gemelo `CredYPrestamo/CredyPrestamoMethods.cs:131-182`, con **8 columnas**.
>
> Por D6 se respetan las **17**. El SQL inline es la fuente del comportamiento observable; la rama del SP es la especificacion mas completa.

**Refutacion que hay que dejar por escrito:** la fila de `TrWACW00041_RefSolCredWeb` **no se mapea** a `toCteCto` de BP01. Refutado 3/3: `CteCtoSet` cuelga de `(Partner, ZidcteCto)`, `ZidcteCto` es un ordinal **acumulativo por Partner** sin particion por solicitud, **no tiene ni un campo de telefono**, y `Client.cs:132-133` declara `toCteCto` y `toCteCtoDireccion` como propiedades **singulares**, no colecciones — 1 contacto por BP frente a hasta 3 referencias por solicitud. Ademas la solicitud admite prospecto (`SP:216`, cliente `'P...'`), que no tiene Partner SAP, asi que habria referencias sin donde colgarse.

---

### 4.4 · `InsertReferencia`, camino largo — el parser y las 17 columnas (`SP:402-602`)

Por **D6**: se porta conservando la semantica observable. Nada de esto necesita tabla.

| Pieza del SQL | SP | En codigo |
|---|---|---|
| `#Datos` (ID IDENTITY, Datos, Campo, TipoDato, Valor) | `:431-437` | `List<CampoMultiplexado> { Campo, TipoDato, Valor }`. El IDENTITY pasa a ser el indice |
| `#DatosCampoValor` (ID IDENTITY, Dato) | `:440-443` | `List<string> piezas` — acumulador plano de **todas** las piezas de **todos** los segmentos, en orden, **sin limpiarse nunca entre iteraciones** |
| `INSERT ... fnSplit(@apellido_m_ref,'|')` | `:451-453` | `apellidoMRef.Split('|')`; `numeroRegistro = segmentos.Length` |
| Primer `WHILE`: parte cada segmento por `~` | `:472-513` | `piezas.AddRange(segmento.Split('~'))` por cada segmento |
| Recuperacion por aritmetica de indices | `:488, 494, 500` | `piezas[(i*3)-3]`, `[(i*3)-2]`, `[(i*3)-1]` (1-based → 0-based) |
| Segundo `WHILE`: cadena `IF/ELSE IF` de 10 campos | `:517-558` | Metodo puro `ParseCadenaMultiplexada(string) : ReferenciaCampos`, sin I/O, probable en mesa |
| Los 9 escalares `@...Aux` | `:404-412` | Propiedades del DTO con **el mismo largo maximo aplicado explicitamente** |
| Centinela `'{0}'` = "no vino" | `:525-556` | `null` |
| `DROP` previo y final | `:414-428`, `:605-622` | Desaparecen: los sustituye el scope del metodo |

> [!warning] El acumulador NO se vacia, y eso no es un detalle
> `#DatosCampoValor` acumula todas las piezas de todos los segmentos sin limpiarse. **Eso es lo que hace que la aritmetica `(@Contador*3)-2/-1/-0` apunte al triple correcto.** Si al portar se vacia por iteracion, el comportamiento cambia.

**Los 5 defectos del original — decision de si se conservan o se corrigen (§8-E):**

| Defecto | SP | Efecto |
|---|---|---|
| `CAST(@Valor AS INT)` sin `TRY` sobre `@CodigoPostalAux` | `:540-544` (decl. `:408`) | Revienta el batch si el CP trae texto. Port fiel = `int.Parse`; corregido = `int.TryParse` con `null` |
| Truncamiento silencioso | `:404-407` | `VARCHAR(50)` en `Direccion`/`EntreCalles` y `VARCHAR(7)` en `NumInt`/`NumExt`, recibiendo de `VARCHAR(max)` |
| Aritmetica de indices | `:488` | Asume **exactamente** 3 piezas por segmento. Un `~` dentro de un valor desalinea todo lo que sigue, sin error |
| `TipoDato` se parsea y nunca se usa | `:507` vs `:525-556` | El unico casteo se decide por **nombre de campo**, no por tipo declarado. Codigo muerto dentro de la rama |
| **Si falta el segmento `ApellidoM`** (o su valor es `'{0}'`) | `:527` | **`@apellido_m_ref` conserva la cadena multiplexada COMPLETA** y se escribe asi en la columna `ApellidoM`. Este no estaba en la lista original |

> [!danger] Bloqueo duro: falta la fuente de `fnSplit`
> `SP:374`, `:453` y `:482` dependen de `fnSplit`, y **su fuente no esta en el corpus**. Sin ella no se sabe si devuelve filas para tokens vacios, si recorta espacios, ni si el orden de ID esta garantizado — y de eso depende la aritmetica de indices y el comportamiento con `@apellido_m_ref = NULL` (su default).
>
> `GUIA_MIGRACION_FABLE.md:571` la lista entre las que *"no se piden"*, con la razon *"exportacion de catalogo, no puenteada"*. Esa razon es **falsa para esta migracion**.

---

### 4.5 · Pre-solicitud completa — `SpCREDISolicitudWebPrimerGuardado` (11 operaciones)

483 lineas, 17 parametros, 11 operaciones **independientes** (los 11 `IF` sin `ELSE`, igual que el SP padre): `SaveFirstData:48`, `UpdateFirstData:113`, `UpdateFirstDom:129`, `SaveRef:140`, `SaveNip:189`, `ValNip:268`, `ValidaNip:288`, `SaveIdDatosTemp:308`, `UpdateNumberCel:317`, `SaveCelNip:372`, `UpdateValNip:460`. El ciclo de NIP son 6 de ellas.

**Estado a codigo** — las 3 tablas propias pasan a un agregado en memoria mas su persistencia:

1. `CREDIDSolicitudWebDatosPrimerGuardado` → clase `PreSolicitudCredito` con propiedades 1:1 de las columnas que el SP toca. **Es el objeto que atraviesa las 11 operaciones**; cada rama se vuelve un metodo que lee y muta este objeto.
2. `CREDIDRefPrimerGuardadoCredWeb` → `List<ReferenciaPreSolicitud>` colgada del agregado, con sus 7 columnas y la misma clave logica `(IdSolicitud, NumReferencia)`. Por el mismo criterio de D6: escritura directa a Android.
3. `CREDIHSolicitudWebHistoricoNip` → bitacora append-only de intentos, escrita por **el mismo helper** que encola el SMS (una sola implementacion, no tres como hoy).

**Candidatos de NIP que nadie habia visto, y estan en `Cte`:** `ZcodSms:60`, `ZsmsValid:61`, `ZfechValid:62`, `ZdoctoValid:63`, `Znipventa:41`, `Znipcobro:42`. Cubren `Nip`, `Validacion` y `FechaValidacion` de la pre-solicitud (`:196-202`, `:276-278`) y son alcanzables por el PATCH que ya existe.

**Ojo:** `A_GET_NIPCompra` expone `Znipventa`, que es el **NIP de compra**, no el de la solicitud. Son dos NIP distintos.

**Defectos del original a decidir:**

- **`:52`** `IF (@origen <> 'PRODUCTOS MX')` — con `@origen IS NULL` (su default) la comparacion es `UNKNOWN` y cae al `ELSE`, o sea **toma la rama `PRODUCTOS MX`**. Lo contrario de la lectura literal.
- **`:205`** `IF (@validacion != 1)` — con `@validacion IS NULL` (default) es `UNKNOWN` → **se salta por completo** la generacion de NIP, el SMS y el historico, sin error.
- **`:214-216, :319-321, :374-376`** `FLOOR(RAND()*(999999-100000)+100000)` — rango real 100000–999998: **`999999` es inalcanzable**.
- **`:462-467` vs `:196-202`** — `FechaValidacion` se trata de dos formas contradictorias entre `UpdateValNip` y `SaveNip`.
- **Cero transaccionalidad.** `SaveNip` hace 2 `UPDATE` + 2 `INSERT` sueltos; `SaveCelNip` un `INSERT` mas 2. No existe hoy ningun uso de transacciones en `ServicioSAP` para este tipo de escritura.
- **`SaveCelNip` es asimetrico con `SaveFirstData`**: resuelve el precio **solo** desde `art`, ignorando `@origen` y `PropreListaDFinal`.

**Consumidor identificado:** Magento `CredilanaManagement.php:370` manda `op 'SaveRef'`.

---

### 4.6 · Rediseño de `@ValidacionTelefono` (D3)

**El calculo legado es codigo muerto, CONFIRMADO contra el SQL.** `SP:210-217` y `:218-221`: **las dos ramas del `IF/ELSE` asignan**, asi que el valor del parametro nunca sobrevive; se usa ya pisado en el `INSERT` de `:337`.

Tres cosas que nadie habia visto:

1. **La semantica parece invertida.** Cuando *todo checa* el SP escribe **`0`** (`:220`); cuando **no** checa, `1`. Leido como *"¿requiere validacion?"* tiene sentido; leido como *"¿esta validado?"* esta al reves. El nombre de la columna sugiere lo segundo.
2. **`@TelefonoAValidar` no esta protegido contra `NULL`.** El `IF` cubre con `IS NULL` a los otros dos pero **no** al tercero: si no hay renglon en la tabla de SMS, el `!=` evalua a `UNKNOWN` y cae al `ELSE`.
3. **Se comparan dos formatos distintos.** `@TelefonoValidado` se arma como `CONCAT(ct.Lada, ct.Telefono)` — **con lada** (`:194-197`) — y `@TelefonoAValidar` es el `Telefono` pelon (`:205`). **SIN EVIDENCIA** de como se guarda ahi; si va sin lada, la comparacion **nunca empata** y el SP siempre toma la primera rama.

**Estado a codigo:** los 3 locales pasan a un objeto de resultado, alimentado desde `BusinessPhone` de BP05MA (`ZappOrig`, `ZtelCte` — que ya viene completo y elimina el `CONCAT` y la truncacion a 10) mas la consulta a la tabla de SMS que ya existe. Se agregan los datos que hacen **auditable** la decision: `EsProspecto` (desde `to_Cte.Zprospecto`, en vez de `SUBSTRING(cliente,1,1)`), `CoincideConSms`, `TipoValidacion` (`ZtipoValid`), `FechaValidacion` y `ZidcteTel`.

**Ubicacion:** archivo nuevo `Methods/Credit/PhoneValidationMethods.cs`.

> [!danger] La semantica nueva ya existe en el codigo, esta invertida, y es codigo muerto
> `OrderMethods.cs:1881`: `var isValidated = numeroValidado == numeroDelSms;`
>
> `ObtenerNumeroTablaSmsAsync` devuelve `""` si no hay fila (`:595`, `:601`) e `IsValidatedAsync` devuelve `""` si no hay telefono validado (`:630`, `:643`). Entonces **cliente sin telefono validado y sin SMS → `"" == ""` → `isValidated = true`**, que es lo contrario del SP (`:211-213` → requiere validacion).
>
> Y peor: `isValidated` se pasa en `:1883` y **no se usa nunca** dentro de `ProcessCreditPaymentAsync` (unica aparicion: el parametro en `:682`). Lo muerto no es solo el parametro del SP: **el calculo nuevo tambien esta muerto.**
>
> Riesgo adicional si esta unidad se amplia a **escribir** `CteTel`: `CteTel.cs:15-20` declara `ZenvioNip`, `ZvalTel`, `ZtelExist` y `ZtraeTel` como `bool` **no anulables**, asi que un port ingenuo estampa `ZvalTel=false` y **corrompe** el estado de validacion en SAP.

**`@ValidacionOrigen` no tiene campo en `ServicioSAP`.** `ZB_DATOS_CLIENTE_CDS` no lo trae — el propio `OrderMethods.cs:610-614` lo documenta contra response real. Pero `businesspartner-dev` **si prueba que existe en SAP** como `ZappOrig`, y por D7 es alcanzable.

---

### 4.7 · El estado temporal a codigo (D4)

Tres estados, tres formas distintas.

**(1) Scratch puro → variables y colecciones locales, sin persistencia.** `#Datos`, `#DatosCampoValor` y las 10 variables auxiliares del parser. Los `DROP` desaparecen: los sustituye el scope del metodo.

**(2) Cabecera de la solicitud → `SolicitudCreditoWeb`**, DTO con las 59 propiedades de `SP:224-282` (misma informacion, D4), mas `SolicitudCreditoWebUpdate` con las 9 de `SP:356-364` para que la actualizacion parcial sea explicita y no un `UPDATE` de columnas sueltas.

**(3) Correlacion → un solo objeto compartido.** El enganche con la pre-solicitud (`op SaveIdDatosTemp`, que hoy copia un id de una tabla a otra) pasa a ser un unico objeto de correlacion compartido por las dos unidades.

> [!danger] El limite de D4, y es la decision mas consecuente del documento
> **El record de 59 campos tiene que sobrevivir a la peticion.** La rama `Update` llega en **otra llamada** (por `@Id`), `InsertReferencia` tambien, y el liberador corre asincrono. "Pasa a codigo" no puede significar "vive solo en memoria durante la peticion".
>
> Y hay **consumidores aguas abajo de la fila** que existen y **no tienen dueño identificado**: `LAN/WebApiMagento/Metodos/CreditMethods.cs:2441` hace `SELECT cliente` sobre la tabla. Si dejar de persistirla es la lectura correcta de D4, eso los rompe.
>
> **Cuarta opcion que nadie considero:** `ServicioSAP` **ya tiene** persistencia local — `Helpers/ConexionDB/SQLiteDb.cs`, async y parametrizada, en uso real. Es la alternativa mas barata. Aviso al decidir: `SQLiteDb.Set` **se traga toda excepcion** (`:53-56`), asi que como sink de una solicitud de credito perderia datos en silencio.

---

### 4.8 · Satelites de linea de articulo y saldo

**`SpVTASInsertArtSolCreditoLinea`** — vive en `IntelisisTmp` (`:1`) y escribe **de regreso** a `MAVIANDROID01.ServicioAndroid.dbo.VTASdArtCreditoWeb` (`:208`, `:243`). No es "un SP de Android que consulta Intelisis": es **un SP de Intelisis que alimenta a Android**. Cuando Intelisis se apague, se va completo.

Dos ramas: `SEGU00001` (costo de envio, `@Abono = 12` **hardcodeado** en `:184-185`, ignora `@Condicion`, **siempre inserta 1 fila**) y cualquier otro (precio y abono desde `PropreListaDFinal ⋈ VTASCCondicionesCredVtaLinea`, con `CEILING` si hay `DescuentoCategoria`).

Mas una capa previa de **sustitucion de SKU por region** que solo se activa si `Art.Familia = 'TELEFONIA'` (`:48`).

| Pieza | Equivalente |
|---|---|
| Precio y abono ← `PropreListaDFinal` | **SI** — `ZAPI_PROPRELIST_SRV`, ya consumido por `FinalListProperMethods.cs:22` |
| Existencia previa al cambio de SKU (`:96-120`) | **SI — DIM11**, indicado por el usuario. `ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia`, **ya consumido** en `ProductMethods.cs:103, 173, 219, 263` y con filtro por material y planta en `OrderMethods.cs:2121`. **Pendiente de confirmar:** el SP hace `COALESCE` entre **dos** fuentes (`eCommerceExist.existencia` y `VTASDEcommerceExportaArtExistencia.TotalArticulos`, prefiriendo la segunda); falta saber si DIM11 consolida las dos o corresponde solo a una |
| `VTASCRegionSku` + `VTASCCodigoPostalRegionCelular` | **Sin equivalente identificado.** Son catalogos, asi que el canal 4 (`AI_GET_CatalogoConfiguracion`) es el candidato natural — pero **no se verifico**: pendiente de que el usuario indique el nombre de catalogo, como hizo con `TablaStD` |
| `VTASCCondicionesCredVtaLinea` (crosswalk de condicion) | **Sin equivalente** |
| `spVerCosto` | **Sin equivalente** |
| `DescuentoCategoria` | **Sin equivalente** — ninguna de las 11 propiedades de `FinalListProper` corresponde |
| `VTASdArtCreditoWeb` (destino) | **Ya lo escribe `ServicioSAP`** con `INSERT` directo (`OrderMethods.cs:994-996`) |

> [!danger] Dos fallas silenciosas que hay que decidir si se replican
> **1.** Si el articulo es de TELEFONIA, esta en `VTASCRegionSku`, el CP es de region celular y **no coincide ni con Region5 ni con Region6** → no hay `ELSE` (`:122-126`), `@artRegion` queda `NULL`, el `INSERT` filtra por el y **no inserta nada**.
> **2.** Si el `JOIN` de condicion/articulo no devuelve fila → `INSERT ... SELECT` de **0 filas**, sin error (`:243-262`).
>
> En ambos casos **la linea de articulo simplemente no existe y nadie se entera**. Si se replica tal cual, el defecto se muda a SAP.
>
> Defecto extra no reportado antes: `:62-68` llena `#RegionSKUSolCreditoLinea` y `:77-83` **inserta exactamente los mismos renglones otra vez**. Los `SELECT TOP 1` leen **sin `ORDER BY`** sobre un conjunto duplicado → no determinista. En codigo el par queda fijado, lo cual **si cambia algo observable**.

**`SpCREDIDatosSolicitudCreditoArt` — `GetSaldo`.** Los tres `SELECT` de la rama (`:84-85`, `:109-110`, `:115-116`) son `SELECT @variable = expresion`, que en T-SQL **asigna y no produce result set**, y la rama termina con `RETURN` desnudo. La cadena completa del fallo en el legado:

```
GetSaldo no emite result set
  → LAN/.../CreditMethods.cs:790  decimal.Parse(cmd.ExecuteScalar().ToString())  sobre null
  → NullReferenceException
  → catch VACIO de :796-799
  → return 0 de :801
```

`checkSaldo()` **nunca devuelve otra cosa que `0`**, y `:126` compara contra ese `0` fijo: **cualquier pedido con total > 0 queda marcado insuficiente** — y el flujo continua igual. Ademas `checkSaldo` llama `ExecuteScalar()` **dos veces** sobre el mismo comando (`:788` y `:790`): el SP se ejecuta dos veces por consulta.

**Aviso de atribucion:** ese defecto esta en **LAN**, no en `ServicioSAP`. `checkSaldo` tiene 0 coincidencias en los 210 `.cs` del destino, y `Methods/Credit/CreditMethods.cs` tiene 351 lineas, asi que la cita `:788-801` que circula en el corpus **no puede existir** ahi.

**El limite de credito si esta** (`Cte.Zcrmcantidad`, escribible). **El saldo pendiente no lo cubre nadie**: `grep -i saldo` en `businesspartner-dev/apps` → 0 archivos, y las 20 filas del mapeo de `SPCXCSaldosClientesPendiente` tienen `API SAP` vacia. Falta un modulo de cuentas por cobrar, no un endpoint. Existe un esqueleto muerto: `OrderMethods.CheckClientBalanceAsync` devuelve `Partner.Zcrmimporte` crudo, **sin restar saldo**.

---

### 4.9 · `SpCREDICodigoRecomendador` — D8 CORREGIDA: no es "todo deprecado"

> [!important] Correccion del 2026-09-21. La version anterior de esta seccion decia que del SP "solo entra su pata de SMS" y que la columna `CodigoRecomendador` "no se porta". **Las dos afirmaciones eran incorrectas.** Se corrigen abajo con las tres decisiones del usuario. Tambien se retira la descripcion previa del SP como satelite menor: son **455 lineas con 17 operaciones**, no un apendice.

**D8 queda en tres piezas, no en una.**

| # | Decision del usuario (2026-09-21) | Consecuencia de diseno |
|---|---|---|
| **D8.1** | **La columna `CodigoRecomendador` se queda en el destino, y no se le manda valor.** Literal: *"no se le va a enviar valor para que el funcionamiento sea el mismo; el que no se llene o se use en este flujo no significa que otro servicio no la consuma y utilice ese valor"* | Se conserva la **estructura**; lo que no se porta es la **logica que la calculaba**. La columna queda en el `INSERT` recibiendo su DEFAULT, igual que hoy cuando el SP se invoca sin `@CodigoRecomendador`. **No se elimina del modelo ni del INSERT de 59 columnas** |
| **D8.2** | **La opcion 17 (login de empleados) se mantiene** | Deja de ser codigo a retirar y pasa a ser **superficie viva**. Trae consigo un cruce a Intelisis que no estaba en el inventario de la §4 — ver abajo |
| **D8.3** | **Los 5 mapeos de `MappingMetods\RecomenderController\` se leen como contexto**, y si sirven se determina **al iniciar esa investigacion**, contra el flujo vigente y bajo las reglas del corpus | No se archivan. No se dan por vigentes tampoco: son insumo, no conclusion |
| **D8.4** | **`setRecommenderList` / `@opcion = 2` queda deprecada** | Se lleva consigo el `INSERT` a la cola de SMS (`:119-120`, dentro de `:91-130`). **No se pierde nada**: `ServicioSAP` ya tiene productor propio en `CreditMethods.cs:137`. Resultado: del SP **no se porta nada** al flujo de credito — ver D8.4 abajo |

**Lo que esto cambia respecto a la version anterior:** antes se decia *"si al implementar aparece logica de recomendador en el codigo existente, se retira"*. **Eso ya no aplica.** La instruccion de retirar se limita a la logica de *calculo* del codigo; ni la columna ni la opcion 17 se tocan.

#### La opcion 17, leida (`SP:427-448`)

```sql
IF (@opcion = 17) --Verifica el Logeo para empleados de Recomienda y gana
  IF ((SELECT COUNT(*) FROM MAVIANDROID01.ServicioAndroid.DBO.PA_USUARIOS_ANDROID WITH (NOLOCK)
       WHERE Nomina = @Nomina AND PASSWORD = @search) > 0)
    SELECT A.Agente AS NOMINA, A.Nombre AS NOMBRE, S.wUEN AS UEN
    FROM Agente A WITH (NOLOCK)
    INNER JOIN Sucursal S WITH (NOLOCK) ON A.SucursalEmpresa = S.Sucursal
    WHERE A.Tipo IN ('VENDEDOR','GERENTE') AND A.Estatus = 'ALTA' AND A.Agente = @NOMINA
```

Son **dos mitades con clasificacion distinta**, y por eso importa que se mantenga:

| Mitad | Objeto | Base | Clasificacion |
|---|---|---|---|
| Verificacion de credenciales | `PA_USUARIOS_ANDROID` | `MAVIANDROID01.ServicioAndroid` | **Android — ya migrado.** No es hueco |
| Datos del empleado que devuelve | `Agente` ⋈ `Sucursal` (`wUEN`) | Intelisis (`USE [IntelisisTmp]`, tablas sin prefijo) | 🔴 **Cruce a Intelisis NUEVO.** No estaba en el inventario de 7 cruces de la §4 |

**Consecuencia para el inventario:** mantener la opcion 17 **abre un cruce que estaba contado como cerrado**. `Agente` y `Sucursal.wUEN` necesitan equivalente; sin el, la opcion 17 no puede salir de Intelisis. Es el unico hueco que aparece *por* esta decision, y hay que resolverlo antes de que la opcion 17 se considere migrable.

**Dos defectos objetivos de la opcion 17** (se reportan, no se corrigen sin decision):

1. **La contrasena se compara en claro**: `PASSWORD = @search`, sin hash ni salt, y viaja en el parametro generico `@search VARCHAR`. Si la opcion 17 se porta tal cual, el defecto se muda al stack nuevo. **Decision N** (datos personales) ya cubre el criterio; esto le anade la autenticacion.
2. **Falla silenciosa**: si las credenciales no coinciden, el `IF` no tiene `ELSE` — no devuelve nada, ni error ni marca. El llamador no puede distinguir *"credenciales malas"* de *"empleado sin sucursal ALTA"* ni de *"el SP no entro a la rama"*. Es el mismo patron del `@Op` desconocido del SP padre y de la opcion 11 con `@TipoCodigo` fuera de `{0,1,2}`.

#### La superficie que LAN expone del SP: 3 de 17 operaciones

De los 5 mapeos de `MappingMetods\RecomenderController\`, leidos completos:

| Ruta LAN | `@opcion` quemada | Metodo de negocio | Que hace la rama |
|---|---|---|---|
| `POST /recommender/setCodes` | `"1"` | `RecommenderMethods.TraerCodigosRecomendadoscliente` | Genera N codigos para un cliente (`SP:52-89`) |
| `POST /recommender/setRecommenderList` | `"2"` | `RecommenderMethods.CodigoRecomendador` | Asigna codigo + encola SMS (`SP:91-129`) — 🔴 **DEPRECADA (D8.4)** |
| `POST /recommender/getRecommender` | `"9"` | `RecommenderMethods.GetRecommender` | Info del cliente autentificado (`SP:222-233`) |

Las tres van contra `IntelisisTmp` en `MAVICUBOS.grupomavi.com` via `Connection.sCadenaConexion`, con el SP ejecutado **como texto SQL**, no con `CommandType.StoredProcedure`.

**Dato que decide D8.3: la opcion 17 no tiene endpoint en este controlador.** Las 14 operaciones restantes —incluida la 17— no son alcanzables desde el API de ecommerce. Si la opcion 17 sigue viva, **su consumidor esta fuera de este controlador** (lo esperable: la app de Recomienda y gana). Eso hay que confirmarlo antes de disenar su migracion: determina si el endpoint nuevo lo expone `ServicioSAP` o no le corresponde.

**Defectos de los 3 endpoints, documentados por dos analisis independientes:**

- 🔴 **Parametros cruzados en `setCodes`**: el controlador llama `("1", customerAccount, requestedCodes, "WEB", uen)` contra la firma `(string op, string search, int uen, string aplicacion, int cantidad)`. Por posicion, **`requestedCodes` cae en `uen` y `uen` cae en `cantidad`**. El SP recibe `@Uen = requestedCodes` y `@Cantidad = uen`. Hay que decidir si se replica el cruce o se corrige: corregirlo **cambia el comportamiento observable** (cuantos codigos se generan y para que UEN).
- `@Nombre`, `@Telefono` y `@Parentesco` van como **literales fijos en el texto SQL**, no parametrizados, en la llamada de `setCodes`.
- `getRecommender` y `setRecommenderList` devuelven **JSON doble-escapado**: el metodo de negocio serializa a `string` y el controlador lo envuelve en `Ok(...)`, que lo vuelve a serializar.
- `getRecommender` **no tiene manejo de excepciones** en la accion; cualquier error fuera del `catch (SqlException)` interno sale como HTTP 500 de Web API.
- `CodigoRecomendador` devuelve, si `ds.Tables.Count <= 0`, un `List<List<string>>` degenerado que **parte el literal "vacio" caracter por caracter**.

#### D8.2 caracterizada: la opcion 17 se queda, pero hoy no puede salir de Intelisis

Se mantiene por decision del usuario. Lo que la busqueda dirigida sobre las 8 carpetas del share (`LAN`, `DMZ`, `ServicioSAP`, `businesspartner-dev`, `salesanddistribution-dev`, `Magento248`) establece es **donde puede vivir y donde no**:

**1. No tiene consumidor en este share. Cero.**

| Busqueda | Ambito | Resultado |
|---|---|---|
| Llamador con `@opcion = 17` | todo `Z:\` | **0** |
| `SpCREDICodigoRecomendador` en codigo | `DMZ`, `ServicioSAP`, los dos repos `-dev`, `Magento248` | **0** (solo LAN) |
| `PA_USUARIOS_ANDROID` en codigo | todo `Z:\` | **0** (solo el `.sql` y un doc) |
| Codigo que pase `@Nomina` al SP | todo `Z:\` | **0** |
| Login de empleado **con validacion de password** | todo `Z:\` | **0** |

Y hay una razon estructural, no solo de ausencia de llamadas: **`@Nomina` es el parametro posicional 11** (`SP:39`), y la invocacion mas larga del arbol pasa **8 posicionales** (`RecommenderMethods.cs:141`). Ninguna usa parametros nombrados mas alla de los primeros. Por tanto `@Nomina` **siempre llega `NULL`**, y el `COUNT(*)` de `SP:429-434` no puede dar `> 0` con datos reales **ni aunque alguien forzara `@opcion = 17`**.

**Conclusion:** el cliente de la opcion 17 es **externo al share** — lo coherente es la app movil de Recomienda y gana pegando directo a `IntelisisTmp`, lo que encaja con que valide contra `MAVIANDROID01.ServicioAndroid`. **Quien la consume es un dato que hay que traer de fuera**, y sin el no se puede decidir quien debe exponerla.

**2. Lo que existe y NO la reemplaza** (los tres candidatos por nombre, verificados abriendo el codigo):

| Candidato | Donde | Por que no sirve |
|---|---|---|
| `POST customerService/GetEmpleadoByNomina` | `LAN/…/CustomerServiceController.cs:236-239`, logica en `CustomerServiceMethods.cs:1952-2000` (SQL inline, **no** el SP), proxy DMZ en `CustomerServiceController.cs:375-385` | **No valida password.** Filtra por `Comercializadora.dbo.Personal` ⋈ `TablaStD` (`TablaSt = 'Codigo de promotor'`), no por `Tipo IN ('VENDEDOR','GERENTE')`. Y **devuelve `Agente` + `Nombre` sin UEN**: no hay JOIN a `Sucursal` |
| Magento `Mavi\RegisterSeller` — `POST /V1/mavi-registerseller/loginemployee` | `Magento248/…/RegisterSeller/etc/webapi.xml:3`, impl. `Model/RegisterSellerManagement.php:92-113` | **El nombre engana: no valida contrasena.** Recibe `cartId` + `payroll` y escribe `employee_id` en el quote. Su hermano `getemployee` (`:142-171`) reenvia el body si trae `Nomina` y lee `{Nombre, Nomina}` — o sea consume `GetEmpleadoByNomina`, no la opcion 17 |
| `GET partner/successfactor/employee/{userId}` | `ServicioSAP/…/BusinessPartnerController.cs:169-170` | SuccessFactors. **Sin password y sin UEN** |

**3. El hueco real: `Sucursal.wUEN` no tiene equivalente en ninguna parte.**

Las dos mitades de la opcion 17 estan en situaciones opuestas:

| Mitad | Estado |
|---|---|
| Credenciales (`PA_USUARIOS_ANDROID`) | **Android — ya migrado.** No es hueco |
| `Agente` (maestro de agente) | 🟡 **Hay zona de aterrizaje**: `businesspartner-dev/apps/api/routes/AS_ZQBP_AGENTE.py` expone 7 endpoints sobre `ZQBP_AGENTE_SRV` (`GET/POST/PATCH/DELETE /AS_*_ZQBP_AGENTE`, `+exist`, `UPDATEAGENTE`, `CREATEAGENTE`), con `Partner`, `Zagente`, `Werks`, `Zcategoria`, `Zestatus`. **Sin password** |
| `Sucursal.wUEN` | 🔴 **Sin equivalente. 0 resultados en todo el arbol** |

`wUEN` aparece **solo 3 veces en todo `Z:\`**, y las tres son en este mismo documento declarando el hueco (`:434`, `:445`, `:447`). En codigo: **0 en `LAN`, 0 en `ServicioSAP`, 0 en los dos repos `-dev`**. En el corpus de equivalencias, todo esta sin resolver:

- `Resources/lan_tables_to_sap_master.md:39` — `SpCREDICodigoRecomendador` → **"En Evaluacion (SAP)"**; `:65` lista `Agente` y `Sucursal` sin destino OData asignado.
- `_GLOBAL_MASTER_DB.csv:9-11` — `Agente`, `Sucursal`, `VTASCVentaCupon` → **"Por Definir, SAP Promotions"**.
- `_GLOBAL_MASTER_DB.csv:95-102` — las 8 filas del SP → **"Pendiente SAP, Pendiente SAP"**, y **cubren solo las opciones 1, 2 y 9: no hay ni una fila para la opcion 17**.
- `_GLOBAL_MASTER_DB.csv:105` — `VENTAD` con columnas `Agente, Sucursal, SucursalOrigen, UEN` → **"Pendiente SAP"**.

**Cuidado con el falso amigo:** `master_test_plan.md:232` mapea `Sucursal`/`SucursalEmpresa` → **`Werks`**, y `COMPARATIVA_BP_LAN_VS_SAP.md:55, 82, 168` mapea `storeCode` → UEN (1/2/3) → `Vkorg` (04/05). **Ninguno de los dos es `wUEN`**: el primero es el centro, el segundo es la UEN *del cliente* derivada del storeCode de Magento. La opcion 17 necesita la UEN **de la sucursal del empleado**, que es un tercer concepto sin mapeo.

**4. Lo unico parecido a autenticacion en el stack nuevo es un stub.**

`businesspartner-dev/apps/api/routes/AI_GET_InformacionUsuario.py:7` — `GET /AI_GET_InformacionUsuario`, cuyo docstring dice *"Autorizar NIP de Usuario"* pero **el cuerpo hace `return True` sin llamar a nada** (`:18`). Es la forma de un endpoint de autorizacion, vacio. Y `apps/api/TokenMavi.py:84-85` (`getNomina()`) **lee la nomina de un JWT ya emitido**: no autentica, asume que alguien mas lo hizo.

**Consecuencia de diseno de D8.2, explicita:** mantener la opcion 17 **no la hace migrable hoy**. Le faltan tres cosas, y ninguna se resuelve leyendo mas codigo: **(a)** quien la consume, **(b)** el equivalente de `Sucursal.wUEN`, **(c)** decidir donde vive la autenticacion de empleado en el stack nuevo, que hoy no existe en ningun sitio. Hasta entonces la opcion 17 **sigue viviendo en Intelisis**, y eso es lo que hay que decir en el plan: se queda, y se queda donde esta.

#### D8.1 ya esta satisfecha por el codigo — no hay nada que cambiar

`CrearSolicitudCreditoAsync` (`OrderMethods.cs:862`) invoca el SP como **`CommandType.StoredProcedure`** (`:868`), es decir **binding por nombre, no por posicion**, y agrega **38 parametros** (`:873-910`, contados: 38). La lista exacta es:

```
@Id @Op @apellido_p @apellido_m @nombre @fecha_nacimiento @rfc @sexo @email @direccion
@exterior @interior @entre_calles @codigo_postal @delegacion @poblacion @estado @colonia
@estado_civil @articulo @uen @condicion @cliente @utmSource @sucursal @origen @idMagento
@MetodoEnvio @lada_particular @telefono_particular @lada_celular @telefono_celular
@sucursalDestino @RedimirMonedero @ValidacionTelefono @OrigenIdMagento @LadaValidar @TelefonoValidar
```

**`@CodigoRecomendador` no esta en la lista** (verificado: 0 coincidencias de `recomend` en `:840-915`). Y como los 66 parametros del SP tienen DEFAULT, omitirlo por nombre es seguro: el SP entra con `@CodigoRecomendador = NULL` (`SP_CREDITO:149`) y **escribe la columna vacia** en `:272`/`:333`.

**Eso es exactamente D8.1.** La columna sigue en el `INSERT` de 59, el otro consumidor puede seguir leyendola, y este flujo no le manda valor. **No hay cambio que aplicar**: el comportamiento pedido ya es el actual. Lo unico que habia que corregir era el documento, que decia que la columna "no se porta".

> [!note] El comentario del metodo (`:845-852`) dice "los mismos 38 parametros… los demas parametros del SP tienen default y se omiten, igual que en LAN". La cuenta **si cuadra** (38 agregados, 38 documentados). Queda pendiente de otra revision si los 28 omitidos coinciden uno a uno con los que LAN omite; este documento solo verifica el de recomendador.

#### D8.3 RESUELTA: de los 3 mapeos, uno tiene equivalente SAP vivo y otro no sirve

Determinacion hecha contra el flujo vigente, como se pidio:

| Mapeo | `@opcion` | Equivalente SAP hallado | Veredicto |
|---|---|---|---|
| `Post_GetRecommender_Mapping.md` | `9` | ✅ **`GET /AS_GET_EncontrarCteCodigoMenudeo`** (`businesspartner-dev/apps/api/routes/AS_GET_EncontrarCteCodigoMenudeo.py:6`) | **Sirve como insumo.** Es la misma intencion, ya resuelta por SAP |
| `Post_SetRecommenderList_Mapping.md` | `2` | ❌ ninguno | Insumo valido, pero la operacion no tiene destino todavia |
| `Post_SetCodes_Mapping.md` / `Post_setCodes_Mapping2.md` | `1` | ❌ ninguno | 🔴 **No sirve tal cual**: documenta el cruce de parametros como comportamiento. Ver defecto abajo |

**El hallazgo que justifica leer los mapeos:** la opcion 9 **ya esta cubierta por SAP**, y de una forma mas completa que el legado. `AS_GET_EncontrarCteCodigoMenudeo` recibe `bp` ("BP asociado al codigo recomendado") mas `cliente`, lee el CDS `ZB_DATOS_ALL_CLIENT_CDS/ZB_DATOS_ALL_CLIENT` filtrando por `BusinessPartner` (`:22-23`), y devuelve `nombre` y `domicilio` armados desde `PrimerNombre`/`PrimerApellido` y `Calle`/`NumExt` (`:41-42`). **Incluye ademas la regla de negocio que el legado no tenia explicita**: rechaza si `Cliente == cliente` con *"El cliente no puede canjear su propio codigo"* (`:38-39`).

**Tres defectos de esa ruta, que hay que arreglar antes de apoyarse en ella:**

1. 🔴 **La regla de negocio devuelve 500, no 400.** Los dos `raise HTTPException(400, ...)` (`:34`, `:39`) estan **dentro del `try`**, y el `except Exception as e` de `:47-48` los captura y los reemplaza por `HTTPException(500, detail=str(e))`. O sea: *"El cliente no puede canjear su propio codigo"* sale como **HTTP 500**. Es el mismo patron de `except` ciego que ya se documento en otras 11 rutas del repo.
2. 🔴 **`IndexError` antes del 400.** `...get('results', [{}])[0]` (`:30`): el default `[{}]` solo aplica si falta la clave `results`. Si SAP devuelve `results: []` —el caso normal de "no existe ese BP"— el `[0]` revienta con `IndexError`, y el `if not cliente_data` de `:33` **es inalcanzable para ese caso**. Otro 500 donde deberia haber 400.
3. **Interpolacion sin escapar en el `$filter`**: `f"...BusinessPartner eq '{bp}'..."` (`:22`). Un `'` en `bp` rompe o altera el filtro OData. Mas `verify=False` en `:27`.

**Y el defecto que invalida el mapeo de `setCodes`:** los argumentos van cruzados contra la firma. `RecomenderController.cs:45` llama `("1", customerAccount, requestedCodes, "WEB", uen)` contra `TraerCodigosRecomendadoscliente(string op, string search, int uen, string aplicacion, int cantidad)` (`RecommenderMethods.cs:132`). **`requestedCodes` entra como `@Uen` y `uen` entra como `@Cantidad`.** El SP recibe los dos invertidos. Replicarlo es replicar el bug; corregirlo **cambia cuantos codigos se generan y para que UEN**. Decision de negocio, no tecnica.

#### La segunda puerta: el recomendador tambien entra por `CreditController`, sin pasar por el SP

Esto no estaba en ningun documento y cambia el alcance de "deprecar el recomendador": **el DMZ expone hoy 5 rutas de recomendador, no 3.**

| Ruta DMZ | Reenvia a | Fuente de datos |
|---|---|---|
| `POST recommender/setRecommenderList` (`DMZ/…/RecommenderController.cs:21`) | LAN mismo nombre (`:39`) | SP `@opcion=2` |
| `POST recommender/getRecommender` (`:51`) | LAN (`:56`) | SP `@opcion=9` |
| `POST recommender/setCodes` (`:62`) | LAN (`:80`) | SP `@opcion=1` |
| **`POST credit/codigoRecomendado`** (`DMZ/…/CreditController.cs:185`) | LAN (`:193`) | 🔴 **SQL inline** a `CREDIDCodigoRecomendador` ⋈ `Cte` (`LAN/…/CreditMethods.cs:1118`) |
| **`POST credit/codigoRecomendadoWithUen`** (`DMZ/…/CreditController.cs:199`) | LAN (`:206`) | 🔴 **SQL inline** (`LAN/…/CreditMethods.cs:1153`) |

Las dos ultimas **no tocan el SP ni `RecommenderMethods`**: son SQL escrito a mano contra la tabla de catalogo `CREDIDCodigoRecomendador`. Consecuencias:

- **Retirar el SP no retira el recomendador.** Quedan dos rutas vivas por otra puerta, y son las que validan el codigo en el flujo de credito.
- 🔴 **Inyeccion SQL en `codigoRecomendado`**: `CreditMethods.cs:1117-1119` concatena el codigo con `string.Format`, **sin parametrizar**. La variante `WithUen` (`:1153`) si usa `SqlParameter`. Misma funcionalidad, dos niveles de seguridad.
- El DMZ sigue proxeando las 5. **Que la logica este "deprecada" no esta reflejado en el DMZ**: hay que decidir si se apagan las rutas o se dejan apuntando a LAN.

#### Lo que ya existe en `ServicioSAP`: dos campos vacios y ninguna logica

| Que | Donde | Estado |
|---|---|---|
| `ZrecomendPor` (declaracion) | `Models/SAP/BusinessPartner/Cte.cs:24`, `Partner.cs:26`, `BP05MA/BusinessEntitiesMa.cs:278` | Campo de modelo |
| `ZdirRecom` (declaracion) | `Cte.cs:29`, `Partner.cs:31`, `BusinessEntitiesMa.cs:283` | Campo de modelo |
| `ZrecomendPor = ""` / `ZdirRecom = ""` | `BusinessPartnerMethods.cs:599, 604` (BP-1) y `OrderMethods.cs:2869, 2874` (BP-2) | Literal quemado, **cero logica** |
| `CodigoRecomendador` | — | **0 coincidencias en todo `ServicioSAP`** |

Los dos constructores de BP estan vivos (`BusinessPartnerController.cs:46` → `POST partner/client`; y `OrderController.cs:27`/`:85` → `SetOrderAsync`). **No hay logica de recomendador que retirar en `ServicioSAP`**: solo dos campos que ya se mandan vacios. Consistente con D8.1.

> [!warning] Dos falsos positivos mas, que se suman a los dos de abajo
> **`L_GET_BPCodigoRecomendador`** no tiene bloque `Events` en `businesspartner-dev/apps/lambdas/template.yml:49-61` — **sin trigger de API Gateway** — y sus unicas 3 referencias en el repo son esas mismas lineas del YAML: **0 invocadores**.
> **`A_GET_CodigoRecomendado` fue eliminada**: `businesspartner-dev/apps/api/routes/__init__.py:49` lo dice literal — `# A_GET_CodigoRecomendado ELIMINADO - Lambda AWS no existe`. No hay ningun archivo con `Recom` en el nombre dentro de `apps/api/routes/`.

#### D8.4: `setRecommenderList` deprecada — y con ella se cae la ultima razon para tocar este SP

**Decision del usuario (2026-09-21): la opcion 2 / `POST recommender/setRecommenderList` queda deprecada.**

Eso tiene una consecuencia que **contradice lo que decia la version anterior de esta seccion**, y hay que dejarla escrita:

**La version anterior decia que del SP "solo entra su pata de SMS". Ya no entra nada.**

El `INSERT` a la cola de SMS **vive dentro de la opcion 2**: `:119-120`, y la opcion 2 abarca `:91` a `:130` (la 3 empieza en `:131`). El otro `INSERT`, `:149`, esta dentro de la **opcion 3** (*"Reenviar SMS"*, `:131`+), que es la otra mitad del mismo mecanismo de recomendador. **Deprecar la opcion 2 se lleva el encolado con ella.**

**Y no se pierde nada, porque `ServicioSAP` ya tiene su propio productor.** Verificado:

| Quien | Donde | Operacion |
|---|---|---|
| `ServicioSAP` — `SendSmsNewNumber` | `Methods/Credit/CreditMethods.cs:137` | **`INSERT INTO TcAAEA00030_EnvioMensajes`** |
| `ServicioSAP` | `Methods/Credit/CreditMethods.cs:270` | `SELECT TOP 1 Telefono` de la cola |
| `ServicioSAP` | `Methods/Order/OrderMethods.cs:588` | `SELECT TOP 1 LTRIM(RTRIM(T.Telefono))` de la cola |
| `SP_CREDITO_WEB_DATOS` | `SP_CREDITO:205-208` | `SELECT TOP 1 @TelefonoAValidar` de la cola |

La cola tiene **dos productores independientes** en el legado: el del recomendador (opciones 2 y 3 del SP) y el de validacion de telefono del flujo de credito. **El que le importa al credito es el segundo, y ese ya esta migrado** — `SendSmsNewNumber` distingue incluso el tipo de mensaje (`idMensaje = 60` contado / `23` credito, `identificador = "DM0312"` / `"DM0363"`, `CreditMethods.cs:134-135`).

**Conclusion neta de D8.4:** del SP `SpCREDICodigoRecomendador` **no se porta nada** hacia el flujo de credito. Ni la columna (D8.1: ya se manda vacia), ni la logica de codigos (deprecada), ni el SMS (ya existe productor propio). Lo unico que sigue vivo del SP es la **opcion 17** (D8.2), y vive en Intelisis hasta que se resuelvan **Q**, **R** y **S**.

> [!warning] 🔴 Defecto en el productor propio, que ahora es el unico que importa
> `CreditMethods.cs:137-141` arma el `INSERT` con **`string.Format`, interpolando `request.Cliente` y `request.NumeroTelefono` directo en el SQL** — sin `SqlParameter`. Es **inyeccion SQL en `ServicioSAP`**, no en el legado, y sobre la tabla de la que el flujo de credito lee el telefono a validar. Se suma a las dos de `LAN/…/CreditMethods.cs:1117-1119` (decision **U**): el patron se esta replicando en el codigo nuevo.
> De paso, en el mismo bloque: `CommandTimeout = 9999999` (`:144`) y un `catch` que devuelve `result = -1` y solo escribe al log (`:151-154`), asi que **un fallo al encolar el SMS es indistinguible de "no habia nada que encolar"** para el llamador.

#### Que relacion tiene con el SP padre: mas debil de lo que parecia

**`SP_CREDITO_WEB_DATOS` no lo invoca.** Solo declara `@CodigoRecomendador VARCHAR(15) = NULL` (`SP_CREDITO:149`) y escribe la columna en `:272` y `:333`. El valor le llega ya resuelto desde fuera. **Por eso D8.1 no bloquea nada**: el SP de credito funciona igual con la columna vacia, que es exactamente lo que el usuario pidio.

**Defectos del SP, por si algo de el se rescata:** la cadena `ELSE IF` **se rompe en 6 puntos** (`:222, 234, 372, 377, 402, 427` son `IF` independientes — la opcion 17 es uno de ellos); `:67` hace `UPDATE TOP (@Cantidad)` **sin `ORDER BY`** → que codigos se reclaman es no determinista, y `@Cantidad` tiene default `NULL` sin guarda; y la opcion 11 con `@TipoCodigo` fuera de `{0,1,2}` **no devuelve nada, sin error**.

> [!note] Dos falsos positivos de nombre que pueden hacer creer que esto ya esta cubierto
> **`L_GET_BPCodigoRecomendador`** existe (`businesspartner-dev/apps/lambdas/template.yml:49-53`), pero su handler consulta `DocCancelaSeg` (cancelaciones de seguro) contra SQL Server `SIGMAVI` — **es copy-paste de la lambda de cancelacion de seguro**, nada que ver con `CREDIDCodigoRecomendador`. De paso, interpola `BP = {BP}` sin parametrizar.
> **`L_GET_CodigoRecomendador`** se invoca con `st.url5` (`salesanddistribution-dev/.../AI_GET_MonRecom.py:57, :92`), y **`url5` no existe** en `config.py`: la ruta revienta con `AttributeError` antes de llamar a nada.

---

### 4.10 · Las 6 ramas restantes de `SpCREDIDatosSolicitudCreditoArt` (D9)

Vive en `IntelisisTmp` (`:1`), asi que **desaparece completo al apagar Intelisis**. Son 7 operaciones; §4.8 cubrio `GetSaldo`. Por D9 entran las 6 restantes.

| `@Op` | SP | Que hace | Equivalente |
|---|---|---|---|
| `CheckCliente` | `:37-51` | `RETURN 1/0` — codigo de retorno, **sin result set** | **SI** — lectura de BP. En `ServicioSAP` el patron ya existe (`BusinessPartnerMethods.cs:30`, `ZB_DATOS_CLIENTE_CDS`). Ojo: al portar, `RETURN` no es lo mismo que un valor de retorno de metodo; hay que decidir que se devuelve cuando el cliente no existe |
| `GetInfo` | `:53-78` | 19 columnas de `Cte` | **SI** — `ZAPI_BP05MA_SRV` / `ZB_DATOS_CLIENTE_CDS`, ya consumidos |
| `GetCuenta` | `:125-224` | Busca `Cte` por RFC con `CteEnviarA.ID` = 7 (uen=2) o 3; si no, por `IDMagento`; **`INSERT CteEnviarA` de 23 columnas** con literales cableados (`'Mexico'`, `'OCCIDENTE'`, `'ALTA'`, `'CREDITO MENUDEO'`, clave `CR VIU`/`CR MA`); si ya existia, **`UPDATE Cte.IDMagento`** | **PARCIAL** — la escritura tiene equivalente real: `ZAPI_SD52_PARTNER_SRV` con `Vkorg/Vtweg/Spart/Ktgrd/Kvgr4`, **ya invocado** desde `BusinessPartnerMethods.cs:386`. La pata de `IDMagento` tambien: `LinkMagentoAccountAsync` (`:829-873`). Los 23 literales hay que mapearlos uno por uno |
| **`UpdateInfo`** | `:226-296` | **Escribe.** `Cte.eMail1` (`:240-242`), `MAVIDM0138HistInsertCorreo` (`:244-246`), parte la lada contra `TcEACD00001_Lada` a 3 o 2 digitos (`:258-279`), `INSERT CteTel` (`:282-283`), y luego **`UPDATE CteTel SET ValidacionTel=0` para TODOS los moviles del cliente** (`:286-289`), no solo el nuevo | **PARCIAL** — correo y telefono tienen destino (`toCteTel`, y el PATCH de `Cte`). La particion de lada arrastra el catalogo COFETEL (HANA `1138ValAutLadaTel` + lambda). **`MAVIDM0138HistInsertCorreo`: sin equivalente.** Y el `UPDATE` masivo de `ValidacionTel=0` es un efecto colateral que hay que decidir si se replica: hoy **invalida todos los moviles** al agregar uno |
| `getClienteMagento` | `:299-309` | `Cte` por `IDMagento` con `NIPVenta IS NOT NULL`, `ORDER BY UltimoCambio DESC` | **SIN EVIDENCIA** — `ZidMagento` existe como campo (`Cte.cs`) y se **escribe** por `LinkMagentoAccountAsync`, pero no se localizo ninguna ruta que **filtre** por el. `A_GET_NIPCompra` expone `Znipventa` pero **por `BusinessPartner`, no por `IDMagento`**: clave distinta, no equivale |
| `GetInfoCredito` | `:312-324` | Devuelve los literales `'1'`…`'7'` | **Stub. Nada que migrar** — pero por D9 se documenta que es stub, no se omite |

> [!warning] Defecto a arrastrar con cuidado
> `getClienteMagento` tiene el **mismo patron de doble `ExecuteScalar()`** que `checkSaldo`: el SP se ejecuta **dos veces** por consulta (`:324` y `:326` del lado del llamador en LAN). Al portar, una sola ejecucion — y anotarlo, porque si algo dependia del efecto de la segunda, cambia.

**Nota de alcance (D9):** el camino largo de `InsertReferencia` (§4.4) tampoco tiene productor identificado — 0 coincidencias del literal en LAN, DMZ y `ServicioSAP`. Por D9 se porta igual, con esa ausencia anotada, no omitida.

---

### 4.11 · `UpdateInfo` — ⚠️ POSIBLE DEPRECADO, pero entra por D9

> [!warning] **Marca de alcance: DUDOSO.**
> Esta unidad **no tiene quien la ejecute**. Se documenta y se porta por **D9** (*"ninguna rama se descarta por no tener invocador identificado; se porta igual y se anota que no se hallo consumidor"*), pero **quien la implemente debe saber que probablemente es codigo que quedo vivo sin uso**.
>
> **Nadie la declaro obsoleta**: no hay comentario, marca ni documento que lo diga. Lo que si es verificable es que **no tiene invocadores**.

#### La evidencia, reproducible

| Busqueda | Resultado |
|---|---|
| `ProductosCredito_UpdateInfo` en `Z:\LAN` | **1** — solo su propia declaracion (`Metodos\CreditMethods.cs:264`) |
| `UpdateInfo` en `Z:\DMZ` | **0** |
| `UpdateInfo` en `Z:\Magento248\...\app\code\Mavi` | **0** |

```bash
grep -rn "ProductosCredito_UpdateInfo" "Z:/LAN"
```

Devuelve una sola linea. **Ningun controlador lo invoca**, asi que no existe ruta HTTP que llegue a el ni desde el DMZ ni desde Magento. La cadena `Magento → DMZ → LAN → SP` esta rota en el primer eslabon.

#### Donde vive hoy

| Pieza | Ubicacion |
|---|---|
| La rama del SP | `SpCREDIDatosSolicitudCreditoArt.sql:226-296`, `@Op = 'UpdateInfo'` |
| El metodo que la invoca | `LAN\WebApiMagento\Metodos\CreditMethods.cs:264` — `ProductosCredito_UpdateInfo(string idMagento, string email, string phone)` |
| Su ejecucion | `cmd.ExecuteScalar()` con `@Op`, `@Val`, `@Email`, `@Telefono`. Devuelve el literal `"actualizado"`, o `"err"` en el `catch` |

**Los 4 parametros que recibe el SP son `@Op`, `@Val` (= idMagento), `@Email` y `@Telefono`.** `@RFC` y `@Uen` no se mandan y toman su default.

#### El flujo, paso a paso

```
1. Resolver el cliente:  SELECT @Cliente = Cliente FROM cte WHERE idMagento = @Val
2. Si @Cliente vacio o NULL  ->  RETURN sin hacer nada (salida silenciosa)
3. Si @Email no vacio:
      UPDATE cte SET eMail1 = @Email WHERE cliente = @Cliente
      UPDATE MAVIDM0138HistInsertCorreo SET Correo = @Email WHERE cliente = @Cliente
4. Si @Telefono no vacio:
      4a. Partir la lada:
          @lada1 = SUBSTRING(@telefono,1,3)   -- 3 digitos
          @lada2 = SUBSTRING(@telefono,1,2)   -- 2 digitos
          si @lada1 esta en TcEACD00001_Lada  -> @insert = 1
          si no, si @lada2 esta               -> @insert = 2
          si ninguna                          -> @insert = 0
      4b. INSERT INTO CteTel (Cliente, Telefono, Tipo, Lada, Fecha) VALUES (
              @Cliente,
              @insert=1 ? SUBSTRING(@telefono,4,LEN) : @insert=2 ? SUBSTRING(@telefono,3,LEN) : @Telefono,
              'Movil',
              @insert=1 ? @lada1 : @insert=2 ? @lada2 : NULL,
              GETDATE())
      4c. UPDATE CteTel SET ValidacionTel = 0
          WHERE Cliente = @Cliente AND Tipo = 'Movil'      <-- TODOS los moviles, no solo el nuevo
```

**Todo lo que escribe vive en Intelisis.** El SP es `USE [IntelisisTmp]` y las cuatro tablas —`cte`, `MAVIDM0138HistInsertCorreo`, `TcEACD00001_Lada`, `CteTel`— van **sin calificar**. O sea: **la unidad entera desaparece al apagar Intelisis** y cada paso necesita destino SAP.

#### Equivalencias OData, paso por paso

| Paso | Equivalente | Estado |
|---|---|---|
| **1 · Resolver cliente por `idMagento`** | Busqueda inversa por `ZidMagento`. El campo existe (`Cte.cs:34`) y **se escribe** por `LinkMagentoAccountAsync` (`BusinessPartnerMethods.cs:829-873`) | 🔴 **SIN RUTA QUE FILTRE POR EL.** Mismo hueco que `getClienteMagento` (§4.10). En la captura de BP05 `ZidMagento` llega como **numero** (`0`), asi que habria que confirmar que es filtrable y con que tipo |
| **2 · Salida silenciosa si no hay cliente** | Es codigo, no OData | ✅ Se replica con un `return` temprano. **Anotar**: hoy no distingue "no existe" de "no se hizo nada" |
| **3a · `UPDATE cte SET eMail1`** | En SAP el correo **no esta en `Cte`**: vive en `to_CtePersonalAdr.smtp_addr` (`BusinessAdrSet`, clave `Mandt` + `Partner`) | 🟡 **Nodo distinto.** No lo cubre el PATCH de `ZSDT_CTE_ENTITYSet`. Hay que localizar la ruta de escritura de ese nodo |
| **3b · `UPDATE MAVIDM0138HistInsertCorreo`** | Bitacora de correos, **Intelisis** | 🔴 **SIN EQUIVALENTE.** Por D4/D6 no aplica el escape de Android: esta tabla es de Intelisis, no de `ServicioAndroid` |
| **4a · Partir la lada (`TcEACD00001_Lada`)** | El catalogo **`1138ValAutLadaTel`** hace **exactamente** la misma particion 2-vs-3 digitos (`A_GET_BPValidaTelefonoCOFETEL.py:23-38`) | 🟡 **La logica ya existe y no hay que inventarla.** Falta el catalogo como fuente. Ojo: vive en HANA Cloud, no en S/4 |
| **4b · `INSERT INTO CteTel`** | **`POST CteTelSet`** (`ZQBP_EDITARCLIENTE_SRV`), clave `(Partner, ZidcteTel)` | 🟡 El endpoint existe. **Pendiente: quien genera `ZidcteTel`** — ver §7.3 del plan |
| **4c · `UPDATE CteTel SET ValidacionTel=0` masivo** | **N llamadas**, una por movil del cliente. No hay operacion de conjunto en OData v2 | 🔴 **Requiere saber si `CteTelSet` acepta `PATCH`.** Es el unico punto del flujo de credito que necesita esa respuesta |

#### 🔴 La regla de negocio que hay que decidir, independientemente de si la unidad entra

El paso **4c** no es un detalle tecnico: es una regla.

> **Dar de alta un movil nuevo invalida la validacion de TODOS los moviles anteriores del cliente.**

Y esa regla **importa aunque `UpdateInfo` no entre**, porque `@TelefonoValidado` (`SP_CREDITO:194-202`) depende de `ValidacionTel = 1`. Si el flujo nuevo permite registrar un telefono en cualquier punto y **no** se replica el reset, un movil viejo validado seguiria ganando sobre el recien capturado.

**Hay que decidirlo por separado de esta unidad.**

#### Defectos a decidir (clase E — replicar o corregir)

1. **Sin `@Telefono` no valida formato.** No comprueba longitud ni que sean digitos antes de partir la lada. Un telefono de 5 caracteres produce `SUBSTRING(1,3)` y `SUBSTRING(1,2)` sin sentido, y si ninguna lada casa, **inserta el numero completo con `Lada = NULL`**.
2. **Siempre inserta `Tipo = 'Movil'`**, aunque el numero sea un fijo. Conecta con la contradiccion COFETEL / `ZtipoCte` de §3.0d.
3. **No comprueba si el telefono ya existe.** Dos llamadas con el mismo numero crean dos filas.
4. **El `UPDATE` masivo corre despues del `INSERT`**, asi que **tambien invalida el recien insertado** — que entra con `ValidacionTel` por default y sale en `0`. Hay que confirmar si eso es deliberado.
5. **`ExecuteScalar()` sobre un SP que no devuelve nada**, y el llamador devuelve el literal `"actualizado"` pase lo que pase (`CreditMethods.cs:292`). **Un fallo de negocio es indistinguible del exito**: solo un `catch` devuelve `"err"`.

#### Donde va en el contrato

Metodo privado dentro de **`DatosSolicitudCreditoArtMethods`** (§2 del plan de ejecucion), junto a las otras 6 operaciones del satelite. No lleva ruta propia en el controller **porque hoy no la tiene en LAN**.

Encabezado obligatorio al escribirlo:

```csharp
// POSIBLE DEPRECADO — SpCREDIDatosSolicitudCreditoArt.sql:226-296 (@Op='UpdateInfo')
// Portado por D9. Su unico llamador, LAN/Metodos/CreditMethods.cs:264
// (ProductosCredito_UpdateInfo), tiene 0 invocadores: 0 en DMZ y 0 en Magento.
// Nadie lo declaro obsoleto; lo verificable es que nada lo ejecuta.
```

---

## 5. La categoria que ningun analisis tenia: "cubierto pero estampado en blanco"

No es "sin equivalente" ni "ya esta". **El campo SAP existe, `ServicioSAP` ya lo envia, y lo envia vacio.** Son al menos 5 columnas, y explican por que el flujo "funciona" perdiendo datos:

| Columna del SP | Campo SAP | Que manda hoy |
|---|---|---|
| `sueldo` (`SP:245`) | `Cte.ZingMensCredw:35` | `"0.00"` fijo (`BusinessPartnerMethods.cs:727`, `OrderMethods.cs:2997`) |
| `antiguedadAnios/Meses` (`:236-237`) | `Cte.ZantigAnios/ZantigMeses:11-12` | `0` fijos (`:586-587`, `:2851-2852`) |
| `CURP` (`:280`) | `Cte.Zcurp:13` | `""` fijo (`:588`, `:2853`) |
| `estadoCivil` (`:243`) | `ZedoCivil` (`CteCto.cs:25`) | `""` fijo (`:691`, `:2961`) |
| `FechaCita`/`HoraCita` (`:281-282`) | `Cte.Zcita:76` | vacio (`:2921`) |
| `rfc`, `sexo`, `fechaNacimiento` (`:229-230, :228`) | varios | `""` (`:878-880, :891`), con un comentario en `:854-855` que dice que **LAN los tomaba del maestro** |

Esa ultima fila es perdida de dato **reconocida en el codigo y nunca escalada a decision**.

**El vehiculo de escritura tambien existe:** `ZSDT_CTE_ENTITYSet(ZclienteBp='…')` es PATCH-eable por clave de negocio (`BusinessPartnerMethods.cs:840-858`) y hoy solo se le manda `ZidMagento` (`:848`). **Nadie ha preguntado si ese PATCH acepta el resto de los campos de `Cte`.** Es la verificacion mas barata y mas decisoria que queda pendiente.

---

## 6. 🔴 Verificacion bloqueante — puede que la rama `Insert` no funcione hoy

**Hay que resolver esto antes de escribir una linea.**

`@fecha_nacimiento` esta declarado **`DATE`** (`SP:98`) y `ServicioSAP` le manda **`SqlDbType.VarChar` con valor `""`** (`OrderMethods.cs:878`). En SQL Server la cadena vacia convierte a `DATETIME` pero **no a `DATE`**.

Si eso lanza: `da.Fill` falla → el `catch` se lo traga → `return 0` (`:926-931`) → `:715-716` devuelve *"No se pudo generar la solicitud de credito"*. Indistinguible de un fallo de negocio.

**Consecuencias si se confirma:** no hay "comportamiento actual" contra el que comparar, el orden de implementacion de §4.1 esta mal especificado, y el requisito *"paridad de firma cumplida"* pasa de verde a rojo.

**Mismo patron a revisar:** `@LadaValidar INT` (`SP:155`) ← `SqlDbType.VarChar` (`:909`).

**Como resolverlo, en orden de costo:** (1) abrir `Logs/sap.log` y `git log` sobre `OrderMethods.cs`; (2) auditar los 38 `SqlDbType` contra los tipos declarados del SP; (3) ejecutar el SP con los 38 parametros tal como los manda el codigo.

---

## 7. Correcciones aplicadas — lo que este documento arregla

### 7.1 Las 6 afirmaciones refutadas (18/18 votos)

| Afirmacion que circulaba | Realidad |
|---|---|
| `CteCtoSet` + `CteCtoDireccionSet` son el equivalente de `TrWACW00041_RefSolCredWeb` | **Refutada.** Otro objeto de negocio: clave `(Partner, ZidcteCto)`, sin campos de telefono, propiedades singulares. 5 de las 17 columnas sin destino |
| La conclusion del `PLAN_BP05` esta mal porque el cliente de `ZQBP` ya existe | **Refutada.** Confundia dos stacks: el plan habla de C#. (Pero el canal de API intermedia **si** lo hace alcanzable — §3) |
| La solicitud en el stack nuevo es un documento `ZSOC` | **Refutada.** Ningun POST lo crea en los 5 repos. `ServicioSAP` crea la solicitud llamando al SP |
| 44 de 59 columnas (75%) ya tienen endpoint | **Refutada.** Ninguna de las 59 es escribible por `businesspartner-dev`: el destino del SP es la tabla TEMP, no el maestro de BP. 3 de 4 casos criticos son homonimos |
| Todos los consumidores mandan `@Op = 'Insert'` fijo | **Refutada.** 2 de 3 call sites de LAN lo reciben del body sin validar; Magento `Mavi_CreditMigration` manda `Update` |
| 5 huecos duros con 0 coincidencias de grep | **Refutada.** 119 coincidencias con variantes. 4 de los 5 **ya estan cableados** en `OrderMethods.cs:896-908` |

### 7.2 Los 6 "sin equivalente" que eran falsos

Salieron al leer los modelos campo por campo en vez de hacer `grep` por palabra española: `viveEnCalidad`→`ZviveencCal`, `sueldo`→`ZingMensCredw`, `CURP`→`Zcurp`, `estadoCivil`→`ZedoCivil`, `antiguedadAnios/Meses`→`ZantigAnios/ZantigMeses`. Candidato por confirmar: `tarjeta`→`ZusValidTarj:74`.

**Leccion metodologica:** `"DIMAS"` da 0 coincidencias y `"Dima"` da 4 (`ZidTipoDima:37`, `ZlimCedDimae:36`, `ZapoyoVtaDima:52`, `Zdima`); Varias conclusiones de "0 coincidencias" eran artefacto del termino elegido.

### 7.3 Los huecos reales que quedan

Solo **3**, confirmados con grep propio: **`tarjetaDigitos`, `creditoHipoteca`, `creditoAutomotriz`**. Lo unico cercano es `Zcomprobabl` (`CteCtoJob.cs:20`), que es otra cosa. Unico portador generico hallado: `TransactionExtSet` (`Fieldgroup`/`Fieldname`/`Fieldvalue`).

**Ninguno de los 3 bloquea.** Por D4 + D6 las dos tablas del SP se quedan en `ServicioAndroid`, asi que un campo sin OData no impide escribir codigo.

### 7.4 Lo que si bloquea: 4 catalogos que mueren con Intelisis, mas una funcion

1. **`fnSplit`** — sin fuente (§4.4). Bloqueo duro del camino largo.
2. ~~`TablaStD`~~ — **RESUELTO.** Se convirtio en `CatalogoConfiguracion`, alcanzable por el canal 4 con el helper que ya existe (§4.1). Lo que queda no es un hueco sino una decision: hoy el codigo degrada la regla a *"`ZappOrig` no vacio"* (`OrderMethods.cs:639`) y ya no compara contra catalogo; restituir la comparacion es posible y es llamada del usuario.
3. **`VTASCRegionSku` + `VTASCCodigoPostalRegionCelular`** — bloquean el SKU efectivo que se escribe en la linea.
4. **`CREDICCondicionArt`** (`SP:178-182`) — para `@Articulo` el SP toma `MAX(IdCondicionArt)` **sin filtro**: "la ultima config dada de alta". Esa semantica no existe en ninguna OData.

---

## 8. Decisiones pendientes

Ninguna de las que quedan abiertas se resuelve leyendo mas codigo. La **V** si se resolvio asi (y se deja tachada, con sus dos hallazgos enrutados abajo); la **Q**, **R** y **S** nacieron de la revision del 2026-09-21 y son las que abre D8.2.

| # | Decision | Por que importa |
|---|---|---|
| **A** | **Semantica de `@ValidacionTelefono`**: ¿*"requiere validacion"* o *"esta validado"*? | D3 dice rediseñar; falta el significado. El legado escribe `0` cuando todo checa, lo que solo tiene sentido como *"requiere validacion"*. Y `OrderMethods.cs:1881` ya implementa la polaridad **contraria** |
| **B** | **Donde vive la cabecera de la solicitud entre peticiones**, y de que tipo es el id | El record debe sobrevivir a la peticion (§4.7). 4 opciones: seguir en la tabla, documento SAP, SQLite local, o un sink nuevo. Hay consumidores sin dueño (`LAN/.../CreditMethods.cs:2441`) |
| **C** | **Contrato de `@Op`**: ¿whitelist o pass-through? | Hoy un `@Op` desconocido produce una solicitud fantasma con id `0`, sin error |
| **D** | **Sobrescritura incondicional de la rama `Update`** | Replicar es fidelidad; "patch solo lo presente" es cambio de semantica |
| **E** | **Los 5 defectos del parser**, uno por uno (§4.4) | Corregirlos cambia el comportamiento observable |
| **F** | **Rama `DIMAS MX`** (`SP:174-183`) | `ServicioSAP` manda `@origen = "PRODUCTOS MX"` fijo (`:898`), asi que nunca se dispara desde el stack nuevo. ¿Se porta, y desde donde llegaria el origen? |
| **G** | **Las dos fallas silenciosas de la linea de articulo** (§4.8) | Si se replican, el defecto se muda a SAP. Si se corrigen, aparecen lineas que hoy no aparecen |
| **I** | ~~Las 6 ramas restantes de `SpCREDIDatosSolicitudCreditoArt`~~ | **RESUELTA por D9: todas las ramas se consideran.** Diseño en §4.10. Lo que si queda por decidir de ahi: el `UPDATE CteTel SET ValidacionTel=0` masivo de `UpdateInfo:286-289`, y que devuelve `CheckCliente` cuando el cliente no existe |
| **J** | **OData V2 o V4 para lo nuevo** | `CreditMethods.cs:302` ya usa V4; el resto es V2. Determina formato de fecha y handshake |
| **K** | **Criterio de aceptacion, y es mas duro de lo que parecia** | La regla 25 exige E2E con request y response exactos, y **no se puede probar sin SAP** (los `Fakes/` son codigo obsoleto generado sin querer, no sirven). Lo unico disponible hoy son los **4 pares reales de `Logs/sap.log`**, que no cubren la superficie de este SP. Hay que decidir: o se consigue acceso a un SAP de pruebas para las escrituras, o se cierra contra la BD de `ServicioAndroid` con diff de comportamiento y se aplaza el gate de SAP. **Esto condiciona el orden de todas las unidades: lo que solo lee se puede validar antes que lo que escribe** |
| **L** | **Que se hace con el codigo muerto que se va a tocar** | `isValidated` (`:682`), `datosArray` (`:862`), `HasValidPhoneOriginSAPAsync` (`:658`, 0 invocadores), `LiberateClientCredit` (`:1259`, 0 invocadores), el bloque comentado `:758-792`. La regla 12 obliga, pero borrar cambia firmas publicas |
| **M** | **Semantica de `CheckClientCreditAsync`** (`:804-817`) | Hoy devuelve `true` si el `BusinessPartner` no esta vacio: es prueba de **existencia** con mensaje de error que dice *"no tiene credito activo en SAP"*. Existen `Zcredito:14`, `ZlimCred:31`, `ZtipoCredito:80` sin usar. Cambiarlo empieza a rechazar pedidos que hoy pasan |
| **N** | **Datos personales.** El SP mueve CURP, RFC, fecha de nacimiento, sueldo y telefonos | Sin dueño ni criterio de retencion para sacarlos de `ServicioAndroid` hacia SAP. Y hay credenciales en claro en `Web.config` (`:32, 37-40, 42, 56, 86`): hay que decidir como se configura lo nuevo **antes** de añadir claves ahi |
| **O** | **Autorizar la creacion de estructuras** | `GUIA:275` prohibe crear variables, parametros o constantes sin consultar, y **D4 exige exactamente eso**. Hace falta autorizacion explicita, y fijar nomenclatura |
| **P** | **Un archivo (D4) contra la regla 18** | `SKILL.md:58` obliga a poner los DTOs OData en `Models\SAP\[Modulo]\` con `[JsonProperty]` de Newtonsoft. Dato para decidir: los modelos que se reusarian **ya no cumplen la regla** — usan `[JsonPropertyName]` de `System.Text.Json` (24 archivos vs 10) |
| **Q** | **Quien consume la opcion 17 de `SpCREDICodigoRecomendador`** (login de empleados) | El usuario decidio mantenerla (D8.2), pero **no tiene ni un consumidor en el share**: 0 llamadores con `@opcion=17`, y `@Nomina` es el posicional 11 mientras la llamada mas larga pasa 8 → siempre `NULL`. Su cliente es externo (probablemente la app movil). **Sin saber quien la llama no se puede decidir quien debe exponerla** |
| **R** | **Equivalente de `Sucursal.wUEN`** | Abierta **por** D8.2. `wUEN` tiene **0 resultados en codigo** en las 4 carpetas de aplicacion, y el corpus lo deja en "Por Definir"/"Pendiente SAP" (`_GLOBAL_MASTER_DB.csv:9-11, 105`). `Werks` y `Vkorg` **no** son equivalentes: son el centro y la UEN del cliente. Sin esto la opcion 17 no sale de Intelisis |
| **S** | **Donde vive la autenticacion de empleado en el stack nuevo** | Hoy **no existe en ningun sitio**: 0 rutas con validacion de password en todo el arbol. Lo unico con esa forma es un stub (`AI_GET_InformacionUsuario.py:18` → `return True`), y `TokenMavi.getNomina()` asume un JWT ya emitido. La opcion 17 compara la contrasena **en claro** (`PASSWORD = @search`): portarla tal cual muda el defecto. Se cruza con la decision **N** |
| **T** | **`setCodes`: se replica el cruce de parametros o se corrige** | `RecomenderController.cs:45` manda `requestedCodes` al parametro `uen` y `uen` al parametro `cantidad` (firma en `RecommenderMethods.cs:132`). Corregirlo **cambia cuantos codigos se generan y para que UEN**. Es decision de negocio. Mientras no se resuelva, `Post_SetCodes_Mapping.md` documenta el bug como si fuera el contrato |
| **U** | **Las 2 rutas `credit/codigoRecomendado*` del DMZ** | No pasan por el SP: son SQL inline a `CREDIDCodigoRecomendador` (`CreditMethods.cs:1118`, `:1153`). **Deprecar el SP no las apaga.** Y `codigoRecomendado` **concatena el codigo sin parametrizar** (`CreditMethods.cs:1117-1119`) mientras su gemela `WithUen` si usa `SqlParameter`: misma funcion, dos niveles de seguridad. Hay que decidir si se apagan, se migran o se dejan apuntando a LAN |
| **V** | ~~Garantias de ecommerce / `SP_ACTES_REGISTRO`~~ | **RESUELTA: fuera del alcance de este SP.** `SP_CREDITO_WEB_DATOS` **no tiene ni un `EXEC`** (0 coincidencias; el unico que tenia se quito en 2017, documentado en su cabecera `:16`) y **cero solapamiento de tablas** con la cadena de garantias. Es un frente separado (RMA/devoluciones), no credito. **Pero deja dos hallazgos que hay que enrutar aparte** — ver la nota debajo de esta tabla |

> [!warning] Los dos hallazgos que deja la decision **V**, y que NO son de este documento
> Se levantan aqui porque salieron de esta revision, pero pertenecen al frente de **devoluciones/atencion a clientes**, no al de credito. Hay que enrutarlos, no resolverlos aqui.
>
> **1. 🔴 Regresion de paridad en `order/setreturn`: se perdio el registro del caso.** El DMZ dejo **comentada** la llamada a Intelisis y rutea a SAP: `DMZ/…/OrdersController.cs:313-314` (`// PENDIENTE INTELISIS:` sobre `curl.Post("order/returnOrder", …)`) y `:317` (`curl.PostSAP("order/setreturn", …)`). En LAN esa ruta encadenaba `returnOrder` → `sendReporte` (`ServiceOrderMethods.cs:70`, que pone `bitacora = true` en `:320`) → `guardarSoporte` (`CustomerServiceMethods.cs:117`) → `SpVTASEcommerceSolicitudGarantias` (`:125`, `ExecuteNonQuery` en `:139`) → `SP_ACTES_REGISTRO`, que **daba de alta el caso de atencion a clientes con su folio**. El handler SAP (`ServicioSAP/…/Controllers/OrderController.cs:74-94`) solo hace `BuilAdapterReturn` + `SetOrderAsync(newRequest, "return")` y **no escribe bitacora ni caso en ninguna parte**. O sea: la devolucion se registra en SAP pero **el caso de atencion a clientes ya no se crea**, sin reemplazo y sin que nadie lo note — `guardarSoporte` es `void` y su `catch` solo escribe al log (`CustomerServiceMethods.cs:143-146`), asi que el flujo reportaba exito incluso antes de la migracion.
> **Salvedad:** la ruta `returnOrder` **sigue publicada en LAN** (`LAN/…/OrdersController.cs:253-254`). Si algun consumidor apunta a LAN directo en vez de al DMZ, el flujo viejo sigue vivo. Eso no se puede saber desde el codigo del share.
> **Dato de paso:** ese `SetOrderAsync(newRequest, "return")` es exactamente lo que la **regla 28** prohibe — reutilizar un orquestador para dos rutas distintas mediante un flag de modo.
>
> **2. `SP_ACTES_REGISTRO` no es codigo muerto, y "esta en Android" no significa "ya migrado".** Su otro invocador esta vivo en el DMZ: `DMZ/…/CustomerServiceController.cs:99-105` rutea `customerService/bitacoraAtencionClientes` → `LAN/…/CustomerServiceMethods.cs:444` (`bitacoraAtencionClientes`, decl. `:409`), con los 31 parametros nombrados. **Y aunque el SP vive en `ServicioAndroid`, inserta en Intelisis por linked server**: `SP_ACTES_REGISTRO.sql:106` hace `INSERT` en `ERPMAVI.IntelisisTMP.dbo.RM1138PendientesxValidar` (la cola de validacion telefonica) y lee `ERPMAVI.IntelisisTMP.dbo.Personal` en `:104`.
> **Esto es un aviso metodologico que aplica a todo el corpus:** la regla *"lo que apunta a Android ya esta migrado"* es correcta para las tablas, **pero no se puede aplicar a un SP por su base**. Un SP alojado en `ServicioAndroid` puede cruzar a Intelisis desde dentro. Clasificar `SP_ACTES_REGISTRO` como cerrado por vivir en Android habria sido un **falso negativo**. Hay que revisar si esa inferencia se uso en otras filas del inventario.

---

## 9. Reconciliacion del corpus — obligatoria antes de la primera sesion

Las reglas del `SKILL.md` y de la `GUIA_MIGRACION_FABLE` **si aplican** a este trabajo. Lo que se corrige abajo son afirmaciones caducas o falsas del corpus que una sesion tomaria como vigentes.

> [!note] Los archivos `master` de `Resources/` quedan fuera de este analisis
> Por decision del usuario, `implementation_plan_master.md`, `lan_tables_to_sap_master.md` y `master_migration_summary_unified.md` **no se consideran** para la migracion de este SP: no corresponden a su alcance.
>
> El `SKILL.md` exigia leerlos **siempre y obligatoriamente** al inicio de cualquier sesion (punto 1 de *"How to use it"*, y el Paso 1 del flujo interactivo). **Esa regla ya se cambio** por lectura evaluada: se lista que archivos `master` existen y se identifica, segun la ruta y lo solicitado, si alguno aplica; si no aplica al alcance, no se lee ni se toma como contexto, y ante la duda se pregunta al usuario.
>
> El motivo del cambio: esos archivos clasificaban las rutas de este SP como fuera de alcance, asi que la regla obligatoria hacia que una sesion **descartara la tarea antes de abrir el `.sql`**. Un archivo `master` ajeno a la ruta en curso no debe poder bloquear un trabajo que si se pidio.

| Prioridad | Archivo:linea | Accion |
|---|---|---|
| **1** | `GUIA_MIGRACION_FABLE.md:571` | Quitar `fnSplit` de *"no se piden"*: `SP:374, 453, 482` dependen de ella, y su ausencia es el **bloqueo duro** del camino largo (§4.4). La razon publicada (*"exportacion de catalogo, no puenteada"*) es falsa para esta migracion |
| **2** | `PLAN_BP05_EXPOSICION_DATOS.md:124` | *"Todos los consumidores mandan `@Op = Insert` fijo"* es falso (§4.2). Es la premisa que descartaba el 38% del SP |
| **3** | `ANALISIS_SP_CREDITO_WEB_DATOS.md:22` | Dice que las correcciones de su §9 **se aplicaron**; **no se propago ninguna de las 7**. Es la linea que desarma al lector y le dice que deje de verificar |
| 4 | `GUIA_MIGRACION_FABLE.md:570` | La razon para no pedir `VTASdArtCreditoWeb` esta caduca: `ServicioSAP` **ya escribe** esa tabla (`OrderMethods.cs:994-996`) |
| 5 | `FLUJO_CREDITO_LAN_VS_SAP.md:109` | *"por POSICION, 64 argumentos"* es falso y lo contradice `:341-346` del mismo archivo. Hoy es **binding por nombre con 38 parametros** |
| 6 | `FLUJO_CREDITO_LAN_VS_SAP.md:347` | *"Los 61 `Parameters.Add`"* y su lista de 5 no enviados: son **38**, y dos de esos 5 **si** se envian (`@RedimirMonedero:906`, `@ValidacionTelefono:907`) |
| 7 | `PLAN_BP05_EXPOSICION_DATOS.md:131` | La fila de SMS marcada `NUEVO` es pesimista: `ServicioSAP` **ya escribe** `TcAAEA00030_EnvioMensajes` |
| 8 | `PLAN_BP05_EXPOSICION_DATOS.md:160` | *"Clave doble en la URL"* no es incognita: el patron existe (`BusinessPartnerMethods.cs:840-858`) |
| 9 | `ANALISIS_SP_CREDITO_WEB_DATOS.md:12, 104` | 622 → **623** lineas; `OrderMethods.cs:884` → **`:898`** |
| 10 | `_EXCLUIDOS_Intelisis.md` y `MIGRATION_STATUS_MASTER_v2.csv` | Estan declarados retirados en `GUIA:653-654`, pero **no llevan marca de retiro dentro del propio archivo** y siguen citados como autoridad en ~15-20 archivos. Y `LAN - Mapa.md:40` enlaza el primero desde el indice raiz |
| 11 | `_GLOBAL_MASTER_DB.csv` | **Inutilizable**: el par `SpVTASVentaCupon; SpCREDIDatosSolicitudCreditoArt` se repite identico en 25 filas sin relacion, y `SP_CREDITO_WEB_DATOS` aparece **0 veces**. No esta declarado retirado, lo que lo hace mas peligroso |

> [!info] Sobre las rutas declaradas en el `SKILL.md`
> El `SKILL.md` y la `GUIA_MIGRACION_FABLE:94` declaran la raiz `\\CATECINF214058D\Migracion SAP\...`. **Eso no es un error que haya que corregir:** es la ruta de la maquina del usuario.
>
> Este analisis se levanto contra `\\CATECINF214034\Compartida\Migracion SAP\...`, que es donde esta la copia de referencia usada aqui. Las dos son validas; al trabajar, usar la que corresponda a la maquina desde la que se trabaja.

**Sobre los CSV en general:** estan fechados entre 2026-07-30 y 2026-09-10; el codigo se movio hasta el 2026-09-15. En `MAVIDMZSAPConexiones.csv` (161 filas), **21 rutas del DMZ que lista ya no existen** en el codigo, y de las 84 filas con destino SAP declarado, **41 apuntan a una ruta inexistente** en `ServicioSAP`. Verificar siempre contra el codigo.

---

## 10. Lo que este documento NO verifico

Marcado asi deliberadamente, no rellenado.

1. **Ninguna ejecucion.** Nada se probo contra la base ni contra SAP. Todo es lectura de codigo.
2. **El conteo de propiedades de `Cte.cs`** difiere entre pasadas: 71, 73 y 76. **Hay que fijarlo** antes de usarlo como base de un mapeo.
3. **Si el PATCH a `ZSDT_CTE_ENTITYSet` acepta mas que `ZidMagento`.** Es la verificacion mas decisoria pendiente (§5).
4. **El `NOMBRECATALOGO` exacto** con el que hay que llamar a `AI_GET_CatalogoConfiguracion` para el catalogo de origen de validacion. Por el legado deberia ser `'ORIGEN VALIDACION NUMERO CTE'` (`SP:190`), pero no se verifico contra la respuesta real del endpoint.
5. **El formato del telefono en `TcAAEA00030_EnvioMensajes`** — con o sin lada. De eso depende si la comparacion de `SP:213` funciona alguna vez. Un `SELECT TOP 100` lo resuelve.
6. **El `WHERE` correcto de la lectura de SMS.** Tres variantes conviven: el SP filtra solo por `Cliente` (`:207`); `OrderMethods.cs:552-561` hace `INNER JOIN` con `VTASDCodigoVerificacioneCommerce` por telefono; `CreditMethods.cs:271-274` hace un `IN`. No son equivalentes.
7. **Si `SpCREDIDatosSolicitudCreditoArt` esta desplegado.** Tener el `.sql` no prueba que el objeto exista. Vive en `IntelisisTmp` (`:1`), asi que *"no existe en `MAVICBOSANDROID`"* es esperable y **no** es prueba de que falte.
8. **Si el DDL de las tablas destino coincide con los tipos de los parametros.** Los tipos de este documento son los del **parametro**, no los de la columna: pueden diferir y truncar.
9. **La semantica de `ZusValidTarj`** como candidato para `tarjeta` — hay que confirmarla con SAP.
10. **Si MSBuild compila.** Señal fuerte de que si (210 `.cs` en disco == 210 `<Compile Include>`; 42 `<HintPath>` resuelven; `bin/ServicioSap.dll` del 2026-09-15 10:51 es posterior al `.cs` mas reciente), pero **no se ejecuto ningun build**.
11. **Los artefactos no leidos** de la compartida: los PDF y PPTX de `RSG/`, y los XLSX/ODS de `CoreccionesVal/` y `MappingExportArt/`. Por D5 no son base de equivalencias, pero podrian cambiar una conclusion de negocio.

---

## Anexo · Anatomia verificada del SP

Conteos hechos abriendo el archivo, no copiados.

| | Valor | Evidencia |
|---|---:|---|
| Lineas | **623** | `wc -l` da 622 porque la ultima no lleva salto final |
| Parametros | **66** | `SP:92-134` (43) + `SP:137-159` (23) |
| Enviados hoy por `ServicioSAP` | **38** | `OrderMethods.cs:873-910` |
| En default | **28** | |
| Columnas rama `Insert` | **59** | lista `SP:224-282`, `VALUES` `SP:285-343` (cuadran) |
| Columnas rama `Update` | **9** | `SP:356-364` |
| `InsertReferencia` | **234 lineas = 37.6%** | `SP:370-603` |
| Camino corto | **8 columnas** | `SP:378-385` / `:388-395` |
| Camino largo | **17 columnas** | `SP:561-577` / `:580-596` |
| **Superficie de escritura total** | **76 columnas distintas** | 59 + 17 |
| Ramas `@Op` | **3, independientes** | `SP:172`, `:351`, `:370` — sin `ELSE IF` |
| `RETURN` con valor, `OUTPUT`, `SET NOCOUNT ON`, `BEGIN TRAN`, `TRY/CATCH`, `RAISERROR`, `@@ROWCOUNT` | **ninguno** | en las 623 lineas |

**No existen campos de aval.** `grep -niE 'aval'` da una sola mencion real y es un comentario de changelog de 2018 (`SP:34`). En los 66 parametros y las 76 columnas **no hay ni un campo de aval**. Cualquier documento que los liste describe una version que ya no existe.

**`SP_GeneraConsecutivoCteMavi` NO esta huerfano — correccion del 2026-09-18.** Es cierto que `SP_CREDITO_WEB_DATOS` ya no lo llama (`SP:16`, quitado en 2017, y 0 `EXEC` en `SPsOrden/`). Pero **LAN si lo ejecuta**, desde `cte_prospecto()` en `LAN/WebApiMagento/Metodos/Credit/Methods.cs:258-287` y `Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs:212-227` (`EXEC SP_GeneraConsecutivoCteMavi 'MAVI'`), para generar el cliente prospecto antes de llamar al SP. Es dependencia del flujo `CreditoWeb_SaveData(_Articulos)`. Ver `PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md` §3.7 y §6-2.

**Lo que el changelog anuncia y ya no existe:** `SP:30` anuncia las operaciones `SaveFirstData` y `UpdateFirstData`, que **no estan** en este SP — solo hay 3 ramas `@Op`. Viven en `SpCREDISolicitudWebPrimerGuardado`.
