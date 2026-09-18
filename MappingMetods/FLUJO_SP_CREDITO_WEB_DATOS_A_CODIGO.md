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
| **D8** | **Codigo recomendador: DEPRECADO. Se quita.** Toda la logica de `SpCREDICodigoRecomendador` y la columna `CodigoRecomendador` del SP salen del alcance y **no se portan**. Si en el codigo existe logica de eso, se retira. Lo unico que entra es su **pata de SMS** (§4.9). |
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

### 4.9 · La pata de SMS de `SpCREDICodigoRecomendador` (D8)

**La logica de codigo recomendador queda deprecada. Solo entra su pata de SMS.**

El SP son 455 lineas con 17 operaciones (`@opcion` 1 a 17: `:52, 91, 131, 164, 171, 179, 198, 215, 222, 234, 244, 331, 351, 372, 377, 402, 427`). De todo eso, lo que se toma es el encolado de mensajes: `INSERT` a `MAVIANDROID01.ServicioAndroid.DBO.TcAAea00030_EnvioMensajes` (`:119-120`, con lecturas de `TcAAEA00030_Mensajes` en `:115` y `:135`, e insercion en `:149`), con **`Cliente='CW00001'` cableado**.

**Equivalente:** ninguno en OData, ni hace falta — es el canal de SMS, no SAP. Y `ServicioSAP` **ya escribe esa tabla exacta**, asi que la fila de `PLAN_BP05:131` que la marca como `NUEVO` es pesimista.

**Consecuencia de D8, ya decidida:** `@CodigoRecomendador` (`SP:149`) y la columna `CodigoRecomendador` (`SP:272`/`:333`) **no se portan**. No se busca equivalente ni se llena el campo `Cte.ZrecomendPor`. Si al implementar aparece logica de recomendador en el codigo existente, **se retira**, no se migra.

**Defectos del SP, por si algo de el se rescata:** la cadena `ELSE IF` **se rompe en 6 puntos** (`:222, 234, 372, 377, 402, 427` son `IF` independientes); `:67` hace `UPDATE TOP (@Cantidad)` **sin `ORDER BY`** → que codigos se reclaman es no determinista, y `@Cantidad` tiene default `NULL` sin guarda; y la opcion 11 con `@TipoCodigo` fuera de `{0,1,2}` **no devuelve nada, sin error** — el mismo patron del `@Op` desconocido del SP padre.

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

Ninguna se resuelve leyendo mas codigo.

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
