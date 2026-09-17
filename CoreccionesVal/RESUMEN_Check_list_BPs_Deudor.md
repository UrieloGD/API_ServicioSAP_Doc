---
tags: [migracion, sap, bp, deudor, checklist, correcciones]
fuente: "Check list BPs Dedudor.xlsx"
fecha_analisis: 2026-09-14
estado: borrador — pendiente de validar con Val
---

# Resumen — Check list BPs Deudor

> [!abstract] Qué es este archivo y para qué nos lo dieron
> Es la **especificación de cómo debe quedar un BP de tipo Deudor en S/4HANA**: qué campos lleva, con qué valor, dónde vive cada uno y qué tablas Z guardan los datos complementarios.
>
> **Nos lo entregaron para medir contra él lo que manda ecommerce** al crear un BP — es decir, para identificar qué datos nos faltan. Aplica al alta de ecommerce, no sólo a la carga de migración (aclarado 2026-09-14).
>
> No es un requerimiento de desarrollo redactado como tal: está escrito desde la pantalla de SAP hacia adentro. Para usarlo hay que traducirlo a contrato OData.

> [!info] Las dos vías de alta que menciona el documento
> | | Qué es |
> |---|---|
> | **Transacción BP** | El código de transacción `BP` de SAP: la pantalla donde se mantiene un Business Partner **uno por uno**. Es de donde salen las 41 capturas, y a lo que se refiere toda la columna *"UBICACIÓN PANTALLA"* |
> | **Plantilla de carga del Cockpit** | El archivo de **carga masiva**, con una hoja por bloque de datos |
>
> La plantilla se menciona **una sola vez** (fila 47, IVA Repercutido): *"en la plantilla de carga de BP del CockPit viene una hoja independiente, pero a nivel de la transacción BP se visualizan a nivel de Área de Ventas"*. Es una aclaración de **dónde encontrar el campo**, no un alcance distinto.
>
> **Dos campos que el documento dice NO mandar**, porque SAP los llena solo — *"aunque en la plantilla no se llena, al ver el registro en SAP lo llena con ese valor por default"*: **Uso Horario** (`CSTNO`, fila 19) y **Cl. interlocutor com** (`0001`, fila 34). Nuestro código manda `TimeZone = ""`: correcto.

---

## 1. Qué contiene, hoja por hoja

| Hoja | Filas útiles | Contenido |
|---|---:|---|
| `Campos Estándar BP` | 57 | Los campos del BP estándar: valor esperado, ruta en la pantalla de SAP, referencia a la captura y observaciones |
| `Tablas Z` | 8 | Índice de las 7 tablas Z con datos complementarios del Deudor |
| `ZSDT_CTE` | 74 | Diccionario de datos: columna, tipo, longitud, decimales |
| `ZSDT_CTETEL` | 14 | Teléfonos del BP (N por BP) |
| `ZSDT_CTECTO` | 29 | Datos generales de contactos y referencias |
| `ZSDT_CTECTO_DIR` | 16 | Domicilios de esos contactos |
| `ZSDT_CTECTO_EMPL` | 40 | Datos de empleo de esos contactos |
| `ZTSD_CTECTOBANCO` | 11 | Referencias bancarias — **hoy solo Mayoreo** |
| `ZTSD_CTECTOCOMER` | 8 | Referencias comerciales — **hoy solo Mayoreo** |
| `CONF0` … `CONF28` | — | **41 capturas de pantalla** de SAP, con **recuadros rojos** sobre la ruta de navegación y los campos exactos. **No son adorno: varias traen reglas que el texto no dice — ver §5b** |

Las hojas `CONF*` no tienen datos: son el soporte visual de la columna *"PESTAÑA REFERENCIA"*.

---

## 2. Lo que el documento define como obligatorio

### 2.1 Funciones del interlocutor

Todo cliente migrado lleva **las dos**:

- **FLCU00** — utilización en Finanzas (CXC)
- **FLCU01** — utilización en Ventas Logísticas (SD)

### 2.2 Valores fijos — no se derivan de nada, se mandan así

| Campo | Valor | Nota |
|---|---|---|
| Grupo de cuentas | `CLIE` | |
| **Sector** | **`00` (Común)** | Correcto **para el BP**. El pedido de mercancías va con `01` — ver §5 |
| Zona de ventas | `05` (PISO) | **solo para BP Centro** |
| Probabilidad de pedido | `100%` | |
| Moneda | `MXN` | |
| Grupo estadístico de cliente | `1` (Material A) | |
| Prioridad de entrega | `2` (Normal) | |
| Condiciones de expedición | `01` (Estándar) | |
| Programa lista de facturas | `AM` (liquidación mensual) | |
| Grupo de imputación | `01` (Clientes) | |
| IVA | `1` (sujeto a impuestos) | |
| Clase de interlocutor | `0001` | SAP lo pone solo |
| Sociedad | `5510` (Mavi de Occidente, S.A.) | |
| Cuenta asociada | `12100000` (Clientes) | |
| Idioma y correspondencia | `ES` | |
| Nacionalidad | `MX` | |
| Uso horario | `CSTNO` | SAP lo pone solo |
| NIF | Tipo `MX1` — México: RFC | |
| IVA repercutido | País MX · `TMX1` · clasificación `1` | |

### 2.3 Particularidades del domicilio en México

Tres decisiones de diseño que hay que respetar al mapear:

- **`c/o` guarda el número interior.** No se usa `HOUSE_NUM2` porque los números interiores de MAVI no caben.
- **La colonia se parte en `Calle 4` + `Calle 5`**, porque en México los nombres de colonia pasan de 40 caracteres.
- Nombre y apellidos van separados: `Apellidos` es **solo el paterno** y `2º Apellido` **solo el materno**.

### 2.4 Los 5 atributos de libre definición

Valores posibles `0` o `1`:

| | Para indicar si el BP… |
|---|---|
| Atributo 1 | se reporta a Buró de Crédito |
| Atributo 2 | se envía a Cobranza Telefónica |
| Atributo 3 | está exento del cálculo de interés moratorio |
| Atributo 4 | tiene autorización tipificada como **Crédito Express** |
| Atributo 5 | tiene autorización tipificada como **Autorización Crédito Especial** |

### 2.5 Otros dos campos con carga semántica

- **Grupo de Clientes 04** — `NO` = no enviar CFDI · `SI` = enviar CFDI. **Por defecto `NO`.**
- **Proveedor (número de cuenta anterior)** — guarda el número de cuenta que le corresponde en **Intelisis**. Es el puente entre el ERP viejo y el BP nuevo.
- **Datos bancarios** — dos cuentas distintas: (1) donde se le deposita su préstamo, (2) la que MAVI le asigna para que deposite sus abonos.

---

## 3. Contra el código: el nodo `toCte` (ZSDT_CTE)

> [!bug] CORREGIDO 2026-09-14 — la versión anterior de esta sección estaba equivocada
> Decía *"35 de 74 campos no se mandan"*. **Falso.** Ese cruce se hizo contra una lista sacada de `OrderMethods.cs` **truncada a 45 líneas de grep**, y además del archivo equivocado: el constructor de BP de `customer/setCustomer` vive en `BusinessPartnerMethods.cs`, no en `OrderMethods.cs`.
>
> Rehecho leyendo el bloque completo `toCte = new Cte { … }` de `BusinessPartnerMethods.cs:584-657`.

### Los números reales

| | |
|---|---:|
| Columnas en `ZSDT_CTE` | **74** |
| Campos que manda `BusinessPartnerMethods.toCte` | **71** |
| **Campos que NO se mandan** | **2** |

Los dos ausentes: **`ZSECCION`** y **`ZTIPO_CREDITO`**. (La 74ª es `CLIENT`, el mandante, que lo pone SAP.)

**El problema no es que falten campos. Es otro, y es peor:**

| De los 71 que se mandan | |
|---|---:|
| Con un dato real | **2** |
| Vacíos, `"0.00"` o `0` | **69** |

Los dos únicos con contenido son:

```csharp
ZidMagento = idMagentoValue     // :611  ✅ correcto
Zcompania  = correo             // :636  ❌ el correo en un campo llamado "compañía"
```

> [!danger] Lo que esto significa
> El nodo `toCte` **existe pero va hueco**: se manda la estructura completa de 71 campos con la forma correcta y sin un solo dato de negocio. Y el único campo que lleva algo además del id de Magento **es un error de mapeo**.
>
> Esto es distinto de "faltan campos": la estructura ya está construida, así que llenar cada campo es asignar un valor, no modificar el modelo. El trabajo es de **mapeo de datos**, no de estructura.

### Qué habría que llenar, y qué no

**Fuera de alcance — no se llenan (ver §3.2):** todo lo de mayoreo y lo de cobranza telefónica / visitas domiciliarias.

**Candidatos reales para un alta de ecommerce**, sujeto a que el negocio los confirme:

| Campo | Dato |
|---|---|
| `Zcurp` | CURP del cliente |
| `ZentCalles` | Entre calles |
| `Zprospecto` | Si viene de prospecto |
| `ZtipoCliente` | Clasificación |
| `ZcodSms` · `ZsmsValid` · `ZfechValid` | El ciclo de validación por SMS |
| `ZlimCred` · `ZingMensCredw` | Los que hoy llegan en `0.000` desde BP05MA (§5c) |

### 3.3 🔴 `Zcompania` — el correo ahí era una sonda, no un mapeo

> [!note] Origen del valor actual, aclarado por negocio (2026-09-14)
> `Zcompania = correo` (`BusinessPartnerMethods.cs:636`) se puso **a propósito**: no se sabía dónde meter el correo para comprobar que el valor viajaba, y se usó ese campo como sonda. Cumplió su función. **Ahora hay que poner el valor real.**

**Qué sabemos del campo:**

| | |
|---|---|
| Tabla | `ZSDT_CTE` — datos complementarios **del cliente** |
| Tipo | `NVARCHAR(50)` |

La longitud descarta que sea un código: `Bukrs` es de 4 (`5510`). **50 caracteres es un nombre**, no una clave.

**Qué NO sabemos — y no hay que adivinarlo:**

Busqué un valor real en todo el corpus y **no existe ninguno**:

| Fuente | Valor |
|---|---|
| `Manual Tecnico Peticiones Hoppscotch` | `"Zcompania": ""` |
| `RSGp01_bp02_maestro.md` | `"Zcompania": ""` |
| `master_migration_summary_unified.md` | `"Zcompania": "string"` (plantilla) |
| **LAN** | **no llena el campo en absoluto** — cero coincidencias en todo el repo |

**Las dos lecturas posibles, y no me consta cuál es:**

1. **La empresa de MAVI** que da de alta al cliente — la Sociedad `5510` *(Mavi de Occidente, S.A.)*, escrita como nombre.
2. **La empresa donde trabaja el cliente** — lectura que gana peso porque `ZSDT_CTE` es la tabla de datos complementarios **del cliente**, y porque existe un campo hermano `ZEMPRESA NVARCHAR(100)` en `ZSDT_CTECTO_EMPL` para el empleo **del contacto**. Si el contacto tiene su empleador, es razonable que el titular tenga el suyo — y para crédito ese dato importa.

> [!tip] Cómo resolverlo sin preguntar a nadie
> El campo **ya está mapeado en el modelo de lectura**: `BusinessEntitiesMa.cs:314`. Basta consultar por BP05MA un BP **creado desde pisos** (no desde ecommerce) y ver qué trae `to_Cte.Zcompania`:
>
> ```
> GetClientMaAsync(<un BP de pisos con datos completos>)  →  to_Cte.Zcompania
> ```
>
> Un solo response real cierra la pregunta. Hasta entonces, **ninguna de las dos lecturas es evidencia** — y meter la equivocada es peor que dejar el correo, porque el correo al menos se ve mal y llama la atención.

### 3.2 Las tablas hijas

| Tabla Z | ¿La manda ServicioSAP? | |
|---|---|---|
| `ZSDT_CTE` | ✅ `toCte` — 71 de 74 campos, 69 vacíos | |
| `ZSDT_CTETEL` | ✅ `toCteTel` | |
| `ZSDT_CTECTO` | ✅ `toCteCto` | ⚠️ con datos del propio titular como "CONYUGE" (§5c.D) |
| `ZSDT_CTECTO_DIR` | ✅ `toCteCtoDireccion` | ⚠️ con valores `TEST` (§5c.D) |
| `ZSDT_CTECTO_EMPL` | ✅ `toCteCtoEmpleo` | todo vacío |
| `ZTSD_CTECTOBANCO` | ❌ no existe nodo | 🚫 **fuera de alcance** |
| `ZTSD_CTECTOCOMER` | ❌ no existe nodo | 🚫 **fuera de alcance** |

> [!success] Mayoreo queda FUERA DE ALCANCE (2026-09-14)
> **El mayoreo no existe en ecommerce.** Las dos tablas que faltan son exclusivas de BP de mayoreo según el propio checklist, así que **no hay que construir esos nodos**.
>
> Alcanza también a los campos de mayoreo dentro de `ZSDT_CTE`, que hoy se mandan vacíos y pueden quedarse así: `ZLCAXSI_MAY`, `ZCPAXA_MAY`, `ZFOLIO_PAG_MAY`, `ZVALOR_PAG_MAY`, `ZBANCO`, `ZCTA_CLABE_VALID`, `ZID_CTA_CL_DISP`.
>
> ⚠️ **Una tensión que no resuelvo yo:** existe la ruta `wholesale-customer/{wholesaleAccount}` en ServicioSAP (`WholesaleCustomerController.cs:14`), puenteada desde el DMZ, y `GetWholesaleCustomerNameAsync` en `BusinessPartnerMethods.cs:911`. Si el mayoreo no existe en ecommerce, **¿qué hace ese endpoint?** Lo más probable es que sea sólo de **consulta** —Magento mostrando el nombre de una cuenta de mayoreo— y no de alta, que es lo que este checklist cubre. Conviene confirmarlo antes de darlo por fuera de alcance.

---

## 4. Lo que hay que validar con quien entregó el archivo

Ordenado por lo que bloquea más:

1. ~~¿Este checklist aplica al alta de ecommerce o sólo a la carga masiva?~~ ✅ **RESUELTO 2026-09-14: aplica al alta de ecommerce.** La pregunta estaba mal planteada como disyuntiva — el documento describe cómo debe quedar el BP, sin importar quién lo creó. Ver el encabezado.
2. **De los 69 campos de `toCte` que van vacíos, ¿cuáles debe llenar un alta de ecommerce?** Ésta es la pregunta que dimensiona el trabajo. Ver la lista de candidatos en §3.
3. ~~¿Las referencias bancarias y comerciales quedan fuera de ecommerce?~~ ✅ **RESUELTO 2026-09-14: el mayoreo no existe en ecommerce.** Ver §3.2.
4. **Los 5 atributos de libre definición: ¿quién decide su valor en un alta de ecommerce?** Hoy no los mandamos y ninguno tiene default documentado.
5. **Grupo de Clientes 04 (CFDI):** el documento dice que por defecto es `NO`. ¿Lo mandamos explícito o dejamos que SAP aplique el default?
6. **Proveedor / número de cuenta anterior:** ¿ecommerce debe llenarlo con la cuenta de Intelisis del cliente, o solo lo llena la migración inicial?

---

## 5. ✅ El Sector (División) — RESUELTO, tampoco era contradicción

> [!success] Aclarado por negocio (2026-09-14)
> El Sector **no es un valor fijo**: es un catálogo, y cada tipo de documento va en el suyo.

| Sector | Descripción |
|---|---|
| `00` | Común |
| **`01`** | **Mercancías** |
| `02` | Préstamos |
| `03` | Seguros |
| `04` | Servicios |

**MAVI no usa todos.** Por ahora sólo `01`, y **ecommerce usa únicamente `01`** — que es justamente por lo que las órdenes funcionan con ese valor.

### Por qué el pedido fallaba con `00`

El checklist dice `Sector = 00` porque **describe el alta del BP**, y el maestro del cliente se registra en el sector **común**. Ese valor es correcto **para el BP**.

Pero un **pedido de mercancías** pertenece al sector **mercancías**, no al común. Por eso SAP rechazó:

```
Type=E  Id=CZ  Number=115
"No existe el área de ventas 04 01 00"
Parameter=SALES_HEADER_IN
```

El área `04 / 01 / 00` no existe porque el área de ecommerce para mercancías es **`04 / 01 / 01`**. El error era exacto y el sistema tenía razón.

### Lo que queda, entonces

| Dónde | Valor | Estado |
|---|---|---|
| Alta de BP — `SpartKnvv` / `SpartKnvp` | **`00`** (común) | ✅ correcto, no se toca |
| Pedido — `Division` | **`01`** (mercancías) | ✅ correcto, no se toca |

**Los dos valores conviven porque describen cosas distintas.** No hay nada que preguntarle a SAP.

> [!warning] El error de razonamiento, y dónde quedó escrito
> Durante dos días esto figuró como *"contradicción entre la ficha y la estructura organizativa de S/4HANA, pendiente de aclarar con SAP"*. **No lo era.** Vi el mismo nombre de campo con dos valores y asumí conflicto, sin preguntar si el campo significaba lo mismo en los dos contextos. Es un catálogo, y cada documento usa su entrada.
>
> Esa conclusión equivocada está escrita en **tres lugares más** que hay que corregir:
> - `GUIA_MIGRACION_FABLE.md` §1.7 — la registra como contradicción pendiente
> - `COMPARATIVA_SETORDER_LAN_VS_SAP.md` §6.1 — ídem
> - `ServicioSap\Methods\Order\OrderMethods.cs` — el comentario sobre `string division = "01"` dice que es una contradicción pendiente de aclarar
>
> El comentario del código es el más urgente de los tres: le dice al siguiente que hay algo sin resolver donde ya no lo hay.

---

## 5b. Lo que sólo está en las capturas — los recuadros rojos

> Las 41 imágenes **no son adorno**. Cada una marca en rojo la ruta de navegación y los campos exactos, sobre un BP real del sistema. Varias contienen reglas que el texto de las hojas no dice.

### 5b.1 ✅ La organización de las capturas — RESUELTO, no era contradicción

> [!success] Aclarado por negocio (2026-09-14)
> Las capturas muestran BP de **PISOS** (las sucursales físicas), y por eso traen la organización de esa unidad de negocio. **Para ecommerce la organización se resuelve dinámicamente y son las nuestras.** No hay contradicción: son poblaciones distintas del mismo maestro.

| | Muebles América | VIU |
|---|---|---|
| Capturas de este checklist (**pisos**) | `01` | `02` |
| **Ecommerce** — `DeterminarSalesOrg` | **`04`** | **`05`** |

El **canal** sí es el mismo en las dos poblaciones: `01` = Contado, `02` = Crédito.

**Qué significa para el código:** `VkorgKnvv` y `VkorgKnvp` en `BuildClientFromCustomerRequest` están **bien** con `04`/`05`. No se toca nada. Al leer este checklist hay que traducir mentalmente la organización de los ejemplos a la nuestra; todo lo demás del documento aplica igual.

> [!note] Corrección de método
> Antes esta sección afirmaba que las capturas *"contradicen nuestro código"*. Era una lectura mía equivocada: vi dos valores distintos para el mismo concepto y asumí conflicto, sin preguntarme **de qué población era cada ejemplo**. Dos valores distintos no son una contradicción si describen cosas distintas.
>
> Esto también obliga a retirar otra conclusión: la guía descartó los `SalesOrg: 01` de los payloads de ejemplo como *"datos de QA, no especificación"*. El descarte llegaba a la conclusión correcta —no son nuestra organización— pero **por la razón equivocada**: no es que sean datos sucios de QA, es que son de pisos.

### 5b.2 La colonia se parte por CARACTERES, no por sentido

`CONF_AC`, BP `1200000160`:

```
Calle 4:  VILLA DE NUESTRA SEÑORA DE LA ASUNCION S
Calle 5:  ECTOR SAN MARCOS
```

La colonia real es *"VILLA DE NUESTRA SEÑORA DE LA ASUNCIÓN SECTOR SAN MARCOS"*, y **el corte parte la palabra "SECTOR" a la mitad**. Es un split crudo a 40 caracteres, sin buscar un espacio.

**Para el código:** `Calle 4` = primeros 40 caracteres, `Calle 5` = el resto. Nada de partir por palabra.

### 5b.3 Hay un **Atributo 6** que las hojas no documentan

`CONF28`, BP `1500883547` — el recuadro rojo encierra sólo los 5 primeros, pero la pantalla muestra seis:

| | Valor | Etiqueta en pantalla |
|---|---|---|
| Atributo 1 | `0` | No se envía *(Buró)* |
| Atributo 2 | `1` | Se envía *(Cobranza Telefónica)* |
| Atributo 3 | `0` | No se calcula *(moratorio)* |
| Atributo 4 | `0` | No *(Crédito Express)* |
| Atributo 5 | `0` | No *(Crédito Especial)* |
| **Atributo 6** | `0` | **No** — ⚠️ **sin documentar en la hoja** |

Preguntar qué representa el 6 y si ecommerce debe llenarlo.

### 5b.4 El "número de cuenta anterior" — y por qué NO aplica a ecommerce

`CONF27`, BP `1500883547` → campo **Proveedor** = `C02009012`.

Es la cuenta de Intelisis **con su prefijo `C`**, guardada en el maestro del BP. Sirve como puente entre el ERP viejo y el nuevo **para los clientes migrados**.

> [!important] Aclarado por negocio (2026-09-14) — el escenario de "cuenta C" se ignora
> Las cuentas con prefijo `C` son **legado**. De aquí en adelante **Magento debe mandar el BP en el body**, no una cuenta de Intelisis. Que hoy lleguen cuentas `C` es un artefacto de que el ambiente aún no está del todo montado sobre BP.
>
> **Consecuencia directa:** un BP que ecommerce **crea desde cero no tiene cuenta anterior**. El campo `Altkn` no es "algo que hay que llenar con la cuenta de Intelisis" — es un campo de la **carga de migración**, y para un alta nueva de ecommerce **no aplica**.
>
> Todo análisis que dependa del prefijo `C` —detectar cliente existente, decidir una rama, parsear la cuenta— **hay que descartarlo**, no migrarlo: esa cuenta no debería llegar.

> [!success] En ServicioSAP esto YA está hecho — verificado 2026-09-14
> **No queda ninguna validación por prefijo `C`** en el proyecto nuevo. La resolución del interlocutor es enteramente *"¿trae cuenta o no?"*:
>
> | Flujo | `OrderMethods.cs` | Regla |
> |---|---|---|
> | Crédito MA (`omnipro_pago_credito`) | `ResolveCreditMAPartner` :2668 | Exige cuenta; si no viene, lanza |
> | VIU contado (`openpay_stores`) | `ResolveVIUPartner` :2676 | Exige cuenta; si no viene, lanza |
> | MA contado (`banktransfer`) | `ResolveMAPartnerAsync` :2684 | Cuenta → si no, `cliente` → crear BP → si no, BP de invitado |
>
> Lo único que hace falta es que Magento mande el BP en lugar de la cuenta `C`, que es el tránsito que ya está en curso.

> [!danger] El BP de invitado que hay en código es DE PRUEBA — sigue bloqueado
> `OrderMethods.cs:41` → `private const string GuestCashPartnerNumber = "1500003857"`, usado en `ResolveMAPartnerAsync:2696` cuando la orden de contado no trae ni cuenta ni cliente.
>
> **Confirmado por negocio (2026-09-14): ese valor es de prueba. El BP real para compras de invitado todavía no se tiene.** El mecanismo está construido; el dato no existe.
>
> ⚠️ **Y no se puede tratar como el `Z1`.** Ahí se dejó vacío con una nota de pendiente, porque el pedido sigue armándose sin agente. Aquí **no**: `ResolveMAPartnerAsync:2693` lanza excepción si el valor está en blanco, así que vaciarlo **rompe toda orden de contado de invitado**. El placeholder es estructural, no decorativo.
>
> Tres salidas, y es decisión de negocio:
> 1. **Dejarlo como está** hasta que llegue el real — con el riesgo de que se creen pedidos productivos contra un BP de pruebas.
> 2. **Fallar explícito**: vaciarlo y que la orden de invitado devuelva un error claro en vez de crear un pedido mal atribuido.
> 3. **Bloquear el flujo de invitado** hasta tener el dato.
>
> Lo que **no** debe pasar es que se quede así sin que nadie sepa que es de prueba — que era exactamente el estado hasta hoy.

### 5b.5 Estructura real de los datos bancarios

`CONF25`, BP `1500008176` → pestaña **Pagos**:

| ID | P/R | Clave de banco | Cuenta bancaria | Clave de control |
|---|---|---|---|---|
| `0012` | `MX` | `012` | `1237012570112347` | `2` |

Cuatro campos, no una CLABE monolítica.

### 5b.6 NIF — cómo se ve capturado

`CONF23`, BP `1500006499`: check **Persona física** activado, y una línea en la tabla de NIF:

| Tipo | Denominación | N.I.F. largo |
|---|---|---|
| `MX1` | México: RFC | `JIGA000219H20` |

El RFC va en **N.I.F. largo**, no en un campo RFC suelto.

### 5b.7 Dos "grupos de clientes" distintos que se confunden

- **`Grupo de clientes: 04`** (campo `Kdgrp`, pestaña Órdenes) — visto con valor `04` en `CONF4`.
- **`Grupo de clientes 4`** (campo `KVGR4`, pestaña Datos adicionales) — es el del **CFDI**, con dominio de sólo dos valores: `NO` = Enviar CFDI-No, `SI` = Enviar CFDI-Si.

Son campos diferentes. La hoja los nombra igual y es fácil mapear uno por el otro.

### 5b.8 `Zona de ventas 05 (PISO)` aparece en una persona, no sólo en BP Centro

La hoja dice que ese campo *"solo aplica para los BP Centro"*. Pero `CONF4` lo muestra con `05 PISO` en un BP **Persona / Cliente (SD)**. La observación de la hoja y la captura no coinciden.

---

## 5c. Cruce contra `BuildClientFromCustomerRequest` — qué pide el checklist que NO mandamos

Analizado sobre `Methods\BusinessPartner\BusinessPartnerMethods.cs:417-766`.

> **Confirmado por negocio (2026-09-14):** para ecommerce las organizaciones son **`04` (MA)** y **`05` (VIU)**. El `01`/`02` de las capturas corresponde a BP cargados con otras organizaciones. `VkorgKnvv` y `VkorgKnvp` están **bien**.

### A. Campos que el modelo `Client` NO tiene — hay que agregarlos

| Lo que pide el checklist | Campo SAP | Estado |
|---|---|---|
| **Funciones IC: FLCU00 + FLCU01** — *"todos los clientes migrados tendrán ambas"* | — | ❌ **no hay campo en el modelo** |
| **Grupo de Clientes 4** (CFDI: `NO` / `SI`) | `KVGR4` | ❌ el modelo sólo tiene `Kvgr1` |
| **Atributos de libre definición 1 a 5** (Buró, Cobranza, Moratorio, Crédito Express, Crédito Especial) | `KATR1`–`KATR5` | ❌ **ninguno existe** |
| **Atributo 6** — visto en la captura `CONF28`, sin documentar | `KATR6` | ❌ no existe, y no se sabe qué significa |

### B. Campos que existen pero van VACÍOS, y el checklist pide valor

| Campo | Línea | Valor actual | Lo que pide el checklist |
|---|---|---|---|
| `PostCode1` | `:503` | `""` | Código Postal del domicilio |
| `City1` / `City2` | `:501-502` | `""` | Población |
| `StrSuppl1` / `StrSuppl2` | `:497-498` | `""` | **La colonia, partida en Calle 4 + Calle 5** |
| `HouseNum1` | `:495` | `""` | Número exterior |
| `Langu` | `:507` | `""` | `ES` — y el checklist lo pide **dos veces**: Idioma e Idi.correspondencia |
| `Taxkd` | `:569` | `""` | `1` (sujeto a impuestos) |
| `Aland` / `Tatyp` | `:567-568` | `""` | IVA repercutido: País `MX`, `TMX1` |
| `Banks` `Bankl` `Bankn` `Bvtyp` | `:576-579` | `""` | Datos bancarios — P/R, Clave de banco, Cuenta, Clave de control |
| `Rfc` | `:575` | `""` | El RFC real |

> El código tiene un comentario en `:460` que lo explica en parte: *"como no nos envían el CP desde Magento en este body, no podemos usar SEPOMEX todavía"*. Es decir, **el hueco de dirección es conocido y su causa es que el payload de `setCustomer` no trae CP.**

### C. 🔴 Campos con un valor DISTINTO al que pide el checklist

Estos son los peligrosos, porque **sí se mandan** y por eso nadie los nota.

| Campo | Línea | Manda | Checklist pide |
|---|---|---|---|
| **`Akont`** | `:527` | **`12120000`** | **`12100000`** (Clientes) — ⚠️ difiere en un dígito |
| `Stcd1` | `:519` | `XAXX010101000` — RFC genérico | El RFC real del cliente, NIF tipo `MX1` |
| `Altkn` | `:534` | `1234567890` | **Vacío.** Es el "número de cuenta anterior" de la carga de migración; un BP nuevo de ecommerce no tiene una. Ver §5b.4 |
| `Ktokd` | `:522` | `0110` | Grupo de cuentas `CLIE` *(el `BuGroup` sí dice CLIE — confirmar cuál aplica)* |
| `Kdgrp` | `:541` | `01` | La captura `CONF4` muestra `04` |
| `VtwegKnvv` / `VtwegKnvp` | `:536, :571` | `01` fijo | *"La que corresponda"* — siempre se crea como contado |
| `Marst` | `:489` | `1` fijo | *"Según corresponda"* (estado civil) |
| `Region` | `:464` | `JAL` fijo | El estado del domicilio |
| `NameOrg1` | `:476` | `muebles_america` / `viu` | Es campo **de organizaciones y BP Centro**, no de personas. Hoy lleva el nombre de la tienda en un BP Persona |

### D. ⚠️ Valores de prueba que hoy viajan a SAP

Aparte del checklist, salieron del mismo análisis:

| Campo | Línea | Valor |
|---|---|---|
| `Sort1` / `Sort2` | `:471-472` | `ABC` |
| `Eikto` | `:550` | `32556690` |
| `Parnr` | `:563` | `000000100` |
| `toCteCtoDireccion.Zdire` | `:704` | **`TEST`** |
| `toCteCtoDireccion.Zcolonia` | `:705` | **`TEST`** |
| `toCteCtoDireccion.ZcodPostal` | `:706` | `47504` |
| `toCteCtoDireccion.Zpobl` / `Zestado` | `:707-708` | `001` / `14` |

Y dos que parecen errores de mapeo, no valores de prueba:

- **`toCte.Zcompania = correo`** (`:636`) — el **correo electrónico** en un campo llamado *compañía*.
- **`toCteCto`** (`:674-699`) crea un contacto con `Zparentesco = "CONYUGE"` usando **el nombre, sexo, fecha de nacimiento y correo del propio cliente**. Se está dando de alta al titular como si fuera su propio cónyuge.

### E. Lo que sí está bien

Para no reabrirlo: `BuGroup=CLIE` · `SpartKnvv/SpartKnvp=00` · `Awahr=100` · `Waers=MXN` · `Kalks=1` · `Lprio=02` · `Vsbed=01` · `Perrl=AM` · `Ktgrd=01` · `Bukrs=5510` · `Natio=MX` · `Natpers=X` · `Stkzn=X` · `Gender` mapeado · `Birthdt` · `SmtpAddr` · nombre y apellidos separados correctamente · `VkorgKnvv`/`VkorgKnvp` = `04`/`05`.

---

## 5d. 🔬 BP de piso vs BP de ecommerce — comparación de responses reales

> [!success] Esta es la evidencia más fuerte que tenemos
> Dos responses **reales** de `ZAPI_BP05MA_SRV`, mismo servicio, mismo mandante:
>
> | | BP | Creado por |
> |---|---|---|
> | **Piso** | `1500004598` — ELIZABETH MEDINA | `CPI_SD` |
> | **Ecommerce** | `1500008089` — MARCOS GALINDO | `USR_MAVI` |
>
> Ya no hace falta deducir del checklist: se ve qué trae uno y qué le falta al otro.

### 5d.1 🔴 Lo que a ecommerce le falta por completo

| Nodo | Piso | Ecommerce |
|---|---|---|
| **`to_CteImpuestos`** | **2 filas**: `MX/TMX1/Taxkd 1` y `MX/TMX2/Taxkd 0` | **1 fila con TODO vacío** |
| **`to_CteDatosBancarios`** | 1 fila: `Banks MX`, `Bankl 002`, `Bankn 5615454` | **array vacío** |
| **`Kvgr4`** (CFDI) | `"SI"` / `"NO"` según el área | **`""` en las 4 áreas** |
| **`Bzirk`** (zona de ventas) | `"04"` / `"05"` | **`""`** |

El de impuestos es el más grave: mandamos `Aland`, `Tatyp` y `Taxkd` vacíos y **SAP creó una fila de impuestos en blanco**. No es que falte el nodo — es que existe y está vacío.

### 5d.2 🔴 El teléfono: nuestro BP NO PUEDE pasar la validación

| Campo | Piso | Ecommerce |
|---|---|---|
| `ZidcteTel` | `1`, `1211`, `0000001212`… | **`""`** |
| `ZappOrig` | `CteXpressFrontSAP`, `PUNTO_VENTA` | **`""`** |
| `Zvaltel` | **`true`** en 2 de 6 | **`false`** |
| `ZtipoCte` | `particular`, `FIJO`, `MOVIL`, `TRABAJO` | `MOVIL` |

> [!danger] Consecuencia directa y comprobable
> `IsValidatedAsync` (en `OrderMethods.cs`) exige las tres cosas a la vez:
> ```csharp
> t.Zvaltel && !string.IsNullOrWhiteSpace(t.ZappOrig) && t.ZtipoCte == "MOVIL"
> ```
> Un BP creado por ecommerce tiene `Zvaltel = false` y `ZappOrig = ""`. **Nunca puede pasar esa validación**, por construcción. El teléfono jamás quedará validado para un cliente nacido en ecommerce mientras no se llenen esos dos campos.

### 5d.3 🔴 El domicilio

| Campo | Piso | Ecommerce |
|---|---|---|
| `City1` / `City2` | `GUADALAJARA` / `RINCONADA DEL BOSQUE` | `""` / `""` |
| `PostCode1` | `44530` | `""` |
| `HouseNum1` | `3451` | `""` |
| `Street` | `CALLE 14` | `Tesistan` |
| Direcciones | **9** | **1** |

Confirma el hueco de §5c.B con datos reales. Nótese que **`City2` es la colonia**.

### 5d.4 ⚠️ Valores que mandamos y el de piso NO tiene

| Campo | Piso | Ecommerce | Lectura |
|---|---|---|---|
| **`Zcompania`** | **`""`** | `ma.galindo@gmail.com` | **Nadie lo llena. La respuesta a §3.3: va VACÍO** |
| `Antlf` | `0` | **`9`** | mandamos 9 sin respaldo |
| `Eikto` | `""` | **`32556690`** | valor nuestro, piso no lo usa |
| `Kdgrp` | `""` | **`01`** | piso lo deja vacío |
| `ZmapLat` / `ZmapLong` | `""` | **`0.00`** | mandamos cero donde va vacío |
| `to_CteContacto` | **1 fila TODA vacía** | fila con el titular como `CONYUGE` | **confirmado: nuestro contacto es un invento** |

> [!important] `Zcompania` queda resuelto
> El BP de piso, que está bien configurado, lo tiene **vacío**. Ninguna de mis dos hipótesis (la sociedad / el empleador) era correcta: **simplemente no se usa**. El correo que mandamos es el único dato que existe en ese campo en todo el sistema. **Acción: dejarlo vacío.**

> [!warning] Retiro una conclusión anterior sobre `Altkn`
> Dije que `Altkn = "1234567890"` era un valor de prueba nuestro. **El BP de piso trae exactamente el mismo valor.** No es nuestro: o es un default del sistema, o el campo está igual de mal en las dos poblaciones. **No es un hallazgo de ecommerce** — corrijo lo dicho en §5c.C.

### 5d.5 ✅ Lo que coincide y no hay que tocar

`Type 1` · `Bpkind 0001` · `BuGroup CLIE` · `BuSort1/2 ABC` · `Natpers X` · `Natio MX` · `LanguCorr ES` · `Stkzn X` · `TdSwitch X` · `Waers MXN` · `Ktgrd 01` · `Vsbed 01` · `Lprio 02` · `Awahr 100` (en el área principal).

> [!note] `Ktokd` — se resuelve solo
> Mandamos `"0110"`, pero **el response de nuestro propio BP devuelve `Ktokd: "CLIE"`**, igual que el de piso. SAP no toma nuestro valor. No hay defecto en el resultado, pero **estamos mandando un valor que el sistema ignora** — conviene alinearlo a `CLIE` para que el payload diga la verdad.

### 5d.6 Lo que el de piso tiene en `to_Cte` y nosotros no

| Campo | Piso |
|---|---|
| `ZentCalles` | `MINA` |
| `Zcredito` | `0.1 CLIENTE (AAA)` |
| `ZlimCred` | `60000.000` |
| `ZtipoCliente` | `Nuevo` |
| `ZrecomendPor` | `002` |
| `Zfecha4` | `20260817091824` |
| `Zcrmimporte` / `Zcrmcantidad` | `12345678.200` / `12345678.20` |
| `Zirreg` · `ZnegBc` · `ZreestrucDeud` · `Zcreditoesp` | `0` (no `""`) |

⚠️ **Ojo:** `Zcredito`, `ZlimCred` y `Zcrmimporte` son **datos de crédito que se otorgan tras una evaluación**, no algo que ecommerce capture en el alta. Aquí hay que distinguir *"lo llena otro proceso después"* de *"nos falta mandarlo"*. **Los cuatro flags de `0` sí parecen inicialización que nos toca.**

### 5d.7 Las áreas de ventas — diferencia estructural

| | Piso | Ecommerce |
|---|---|---|
| Filas en `to_CteDatosComerciales` | **6** — `Vkorg 01/02/03` × `Vtweg 01/02` | **4** — `Vkorg 04/05` × `Vtweg 01/02` |
| `Spart` | `00` en todas | `00` en todas |

Las organizaciones son las correctas en cada población (§5b.1). Pero **nuestras 3 filas secundarias están casi vacías**: `Awahr "000"`, `Lprio "00"`, `Kalks ""`, `Ktgrd "01"`. Sólo la primera (`04/01`) trae los valores que arma `BuildClientFromCustomerRequest`.

Eso es coherente con que las otras tres las crea el proceso de habilitación de combinación — **pero las crea sin los valores comerciales**. Hay que decidir si eso importa.

---

## 6. Qué NO resuelve este documento

Para evitar buscar aquí lo que no está:

- **No trae mapeo a OData.** Da nombres de campo de pantalla y de tabla Z, no los nombres del servicio OData. La equivalencia hay que sacarla de las fichas y de un response real.
- **No dice qué es obligatorio y qué es opcional.** Todas las columnas del diccionario vienen con `PERMITE_NULL = FALSE`, lo cual es la definición física de la tabla, **no** una regla de negocio sobre qué debe capturarse.
- **No distingue alta de ecommerce de alta de sucursal.** Varias observaciones dicen *"para personas"*, *"para organizaciones y BP Centros"*, *"solo aplica para BP Centro"* — hay al menos tres tipos de BP mezclados en el mismo checklist.
- **No cubre el BP genérico de invitado** que está pendiente de que MAVI entregue.

---

## 7. Siguiente paso sugerido

1. Llevar las 6 preguntas del §4 y la contradicción del §5 a quien entregó el archivo.
2. Con esas respuestas, convertir este resumen en una **tabla de mapeo campo → OData** para el alta de BP, al estilo de [[COMPARATIVA_BP_LAN_VS_SAP]] §C.
3. Recién entonces tocar código.

**No agregar campos al modelo antes del paso 1.** El documento define una tabla de 74 columnas; cuántas de ellas viajan en un alta de ecommerce es una pregunta abierta, y llenarlas "porque existen" es justo lo que la guía prohíbe.
