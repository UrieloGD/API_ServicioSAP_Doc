---
tags: [migracion, sap, credito, flujo, orden]
fecha: 2026-09-11
estado: vigente
---

# Flujo de Crédito en la creación de orden — LAN vs ServicioSAP

> [!abstract] Alcance
> Compara el bloque de crédito de la creación de orden en los dos proyectos, desde el punto de entrada exacto:
>
> | | Archivo | Línea | Condición |
> |---|---|---|---|
> | **LAN** | `LAN\WebApiMagento\Metodos\OrderMethods.cs` | **609** | `if (order.metodoPago == CREDIT_METHOD)` |
> | **ServicioSAP** | `ServicioSap\Methods\Order\OrderMethods.cs` | **1698** | `if (orderRequest.metodoPago == CREDIT_METHOD)` — *FASE 3: VALIDACIÓN CRÉDITO - EARLY EXIT* |
>
> La constante es la misma en los tres proyectos: `CREDIT_METHOD = "omnipro_pago_credito"`.
>
> Complementa a [[GUIA_MIGRACION_FABLE]] (reglas generales) y a los documentos de negocio en `Resources\`: [[Flujo_Orden_Credito]], [[Flujo_Cliente_Casa]], [[Flujo_Apertura_Cuenta_Mercancia]], [[Flujo_Apertura_Cuenta_Sin_Mercancia]], [[Flujo_Credilana]].

> [!warning] Base de evidencia
> 12 agentes (6 de análisis + 6 refutadores adversariales). **231 veredictos emitidos, 8 hallazgos refutados.** Cada afirmación de aquí lleva `archivo:línea`. Lo que no se pudo probar está marcado como ⚠️ pendiente, no como hecho.

---

## 1. La idea que hay que entender antes de migrar nada

> [!important] El flujo de crédito NO crea un pedido. Crea una SOLICITUD y delega.
>
> En **ambos** proyectos el bloque de crédito hace `return` antes de generar documento de venta:
> - LAN corta en `:649` `return order.infoCliente["cuenta"];` — nunca llega a `:662` `crearPedido(...)`
> - ServicioSAP corta en `:1714-1719` — nunca llega a `BuildSapOrderAsync` (FASE 6, `:1760`)
>
> El pedido real aparece **después**, cuando el liberador lo autoriza. Por eso **mapear el crédito a SD01 en este punto es un error de concepto**: en este momento no hay pedido que mandar a SAP.

Consecuencia directa: `BuildSapOrderAsync` tiene solo 2 llamadores (`:1586` devoluciones y `:1760` FASE 6) y `SetOrderAsync` solo 2 entradas (`OrderController:27` `order/new`, `:78` `order/setreturn`). **No existe un tercer camino** que convierta una solicitud aprobada en pedido SAP.

---

## 2. El ciclo completo, según los documentos de negocio

```
1. Magento checkout, metodoPago = omnipro_pago_credito
      ↓
2. POST order/setOrder   →  DMZ  →  (hoy) ServicioSAP order/new
      └─ crea SOLICITUD de crédito.  Responde: LAN "C123456" (cadena)
      ↓
3. El LIBERADOR autoriza en el ERP   →  AUTORIZADO / EN_ANALISIS / RECHAZADO
      ↓
4. Cron de Magento (PollCreditStatus.php) consulta hasta ver el pedido liberado
      ↓
5. POST order/updateCreditOrderId  {CreditIncrementId, IncrementId, EntityId}
      └─ LAN: UPDATE directo (sin SP) a Venta y eCommerceDetPedidos. Responde: 3 (entero)
```

**Los cuatro sub-flujos** del documento de negocio, y por dónde entra cada uno:

| Flujo | Entrada | ¿Puenteado a SAP hoy? |
|---|---|---|
| **Cliente Casa** (principal de e-commerce) | `order/setOrder` | ✅ sí → `order/new` |
| Apertura de cuenta **con** mercancía | `credit/CreditoWeb_SaveFirstData` + `_SaveData_Articulos` | ❌ sigue en LAN |
| Apertura de cuenta **sin** mercancía | `credit/CreditoWeb_SaveFirstData` | ❌ sigue en LAN |
| **Credilana** (préstamo + seguros) | `credit/CreditoWeb_Seguro` | 🚫 **fuera de alcance** — se queda en LAN |

Solo **Cliente Casa** pasa por el bloque que analiza este documento.

### Equivalencia SAP de las tablas del paso 5 ✅

| Tabla Intelisis | Equivalente SAP | Respaldo |
|---|---|---|
| `Venta` | Cabecera del pedido **SD01** | `ZAPI_SALESORDER_SRV/A_SALES_ORDERSet` |
| `Venta.IdEcommerce` | **`ZIDECOMM`** | `sd01:135` — literal *"IDEcommerce"*, CHAR20 |
| `eCommerceDetPedidos` | Sección de detalle del mismo SD01 | `to_items` |

---

## 3. El flujo paso a paso

### 3.1 LAN — `OrderMethods.cs:609`

```
:582  detallePedido("Limpiar", ...)          ← limpia detalle previo
:599  detallePedido("Insertar", partidas)    ← escribe eCommerceDetPedidos
:606  SaveGuide(IdEcommerce, NombreCliente)  ← guía de envío (SQLite)
:609  if (order.metodoPago == CREDIT_METHOD) ←── ENTRADA
:611-618   arma articulos[] "cantidad,sku"  (+ costoEnvio,SEGU00001 si aplica)
:620-622   ObtenerNumeroTablaSms + IsValidated  → isValidated
:624       cm.ProductosCreditoWeb_SaveData(...)   ← SIN asignar el retorno
             ├─ SP_CREDITO_WEB_DATOS  (Op="Insert")
             ├─ CreditoWeb_InsertArticulo → SpVTASInsertArtSolCreditoLinea
             ├─ CodigoPromocion(..., "Elimina", ...)   si hay codigo_promotor
             └─ LiberadorCreditoMethods.LiberarCliente()  si cuenta empieza con "C"
:649       return order.infoCliente["cuenta"];   ←── SALIDA (CADENA)
```

El controlador (`LAN\Controllers\OrdersController.cs:475`) responde:
```csharp
return Ok(new { status = "PROCESANDO", cuenta = resultado });
```

### 3.2 ServicioSAP — `OrderMethods.cs:1698`

```
FASE 1-2   (idempotencia SD36, ToArray de 39 elementos)
:1698  if (orderRequest.metodoPago == CREDIT_METHOD) ←── ENTRADA
:1700-1706   arma articulos[] (+ costoEnvio,SEGU00001 si > 0)
:1708-1710   ObtenerNumeroTablaSmsAsync + IsValidatedAsync → isValidated
:1712        ProcessCreditPaymentAsync(...)
               ├─ SP_CREDITO_WEB_DATOS  (por POSICIÓN, 64 argumentos)
               ├─ InsertCreditArticlesAsync → INSERT directo a VTASdArtCreditoWeb
               ├─ HandlePromoCodeAsync      ← inalcanzable, ver §4.2
               └─ liberador + callback      ← COMENTADOS, ver §4.5
:1714-1719   return new OrderResponse { Resultado="Concluido", Zctefinal, Zidecomm }  ←── SALIDA (OBJETO)
──────────  lo que queda DESPUÉS del early-exit y el crédito NUNCA ejecuta:
FASE 4     ValidarPreciosConProperlist · ValidarStockArticulos · ValidarRegionCelulares · ResolvePartner
FASE 5     SaveGuideAsync
FASE 6     BuildSapOrderAsync  →  SD01
```

---

## 4. 🔴 Defectos que impiden que el flujo funcione HOY

> Estos no son diferencias de diseño. Son bugs verificados con `archivo:línea` y refutación adversarial.

### 4.1 ✅ CORREGIDO (2026-09-11) — Ningún artículo se insertaba nunca en la solicitud

`OrderMethods.cs:861-867` — `InsertCreditArticlesAsync` hace `await cnn.OpenAsync()` sobre una conexión que **`obtenerConexionAndroidAsync()` ya devuelve abierta**. Lanza `InvalidOperationException`, el `catch` de `:932` solo hace `Console.WriteLine`, y el método sale.

**El propio código lo documenta en un comentario** (`:863-867`), así que alguien lo vio y lo dejó.

**Impacto:** la solicitud de crédito se creaba con `idSolicitud` válido pero `VTASdArtCreditoWeb` quedaba **vacía**. Como el `catch` no propagaba, `ProcessCreditPaymentAsync` continuaba y devolvía `"Concluido"`. El cliente creía que su crédito estaba en trámite y la solicitud no tenía artículos.

> [!success] Corregido
> - Eliminado el `OpenAsync()` duplicado; queda solo una guarda `if (cnn.State != ConnectionState.Open)`. Confirmado en el origen: `ConexionSQL.cs:117-120` abre la conexión antes de devolverla.
> - El `catch` **ahora propaga** en vez de tragarse la excepción, y el método lanza si terminó con **cero** líneas insertadas: un crédito sin artículos deja de parecer exitoso.
> - Se añadió traza: `"Solicitud {id}: {n} de {total} lineas insertadas, {m} sin precio de SD29."`

### 4.2 ✅ CORREGIDO (2026-09-11) — El cupón del promotor nunca se quemaba

`if (datosArray.Length > 72 && ...)`. Pero `ToArray` (`:186-280`) agrega exactamente **39** elementos (índices 0–38). `39 > 72` es **siempre falso**.

`HandlePromoCodeAsync` es código inalcanzable, aunque la fontanería completa ya está escrita y apunta a un destino válido (`UPDATE VentasCupones SET FechaUtilizacion = GETDATE()...`).

**Impacto:** es un **agujero de negocio**, no solo un bug. El promotor puede reusar el mismo código indefinidamente y no se le acredita la venta.

#### Por qué no replica a LAN: son DOS problemas apilados

**(a) LAN usa dos arreglos; ServicioSAP los confundió.** LAN construye un arreglo chico hecho a propósito para el crédito, y pasa el grande **aparte**:

```csharp
cm.ProductosCreditoWeb_SaveData(
    new string[] {
        order.infoCliente["cuenta"],          // [0]
        order.storeId == "viu" ? "2" : "1",   // [1]
        order.incrementId,                    // [2]
        order.infoCliente["correo"],          // [3]
        order.total,                          // [4]
        order.articulos[0]["condicion"],      // [5]
        order.infoCliente["codigo_promotor"]  // [6]  <-- de aqui lo lee
    },
    articulos.ToArray(),
    sDatosPedido,                             // <-- el grande, aparte
    ...
```
y lo consume en `CreditMethods.cs:203-206` con **`data[6]`**. ServicioSAP lee `datosArray[72]` del arreglo **grande**: el índice 72 no corresponde a nada en ninguno de los dos.

**(b) El dato ni siquiera llega.** Aunque se corrija el índice, no funcionaría:

| | Tipo de `infoCliente` | Consecuencia |
|---|---|---|
| **LAN** | `Dictionary<string, string>` (`Models\OrderRequest.cs:20`) | **cualquier** clave que mande Magento llega |
| **ServicioSAP** | `InfoClienteRequest` **tipado**, 28 campos | lo no declarado se **descarta en silencio** |

`InfoClienteRequest` **no tiene `codigo_promotor`**, ni `origen`, ni `OrigenIdMagento`.

> **La causa raíz no es el índice: es que el cambio de `Dictionary` a modelo tipado tiró campos sin que nadie se enterara.** Es el mismo mecanismo que explica por qué `origen` quedó hardcodeado en `"ServicioSAP"` (§6).

> [!success] Corregido — se lee del modelo, no por índice
> Se eliminó la rama del índice y se lee directo del request, igual que el `if (data[6].Length > 0)` de LAN pero sin depender de posiciones:
> ```csharp
> string codigoPromotor = order.infoCliente?.codigo_promotor ?? "";
> if (!string.IsNullOrWhiteSpace(codigoPromotor))
>     await HandlePromoCodeAsync(codigoPromotor, order.incrementId, "Elimina").ConfigureAwait(false);
> ```
> `codigo_promotor` se agregó a `InfoClienteRequest` **justificado por el contrato, no por el legacy**: llega en los payloads reales `CRED515773` y `CRED515848` de `Resources/magento_payloads.md`, **solo** en crédito. Es **opcional** — únicamente cuando un promotor asistió la compra — así que el flujo tolera vacío y ausente.
>
> **Decisión (2026-09-11):** la quema del cupón **se queda en el flujo de la orden**. No se mueve a un controlador propio: solo se está usando el método que lo valida/consulta.

### 4.3 ✅ CORREGIDO (2026-09-11) — El precio del artículo a crédito salía en 0

`OrderMethods.cs:854-858`:
```csharp
// Asumimos UEN 3 o extraemos de donde corresponda
string uen = "3";
var preciosList = await _preciosMethods.GetFinalListProperByUenAsync(uen)...
```
Eso construye `$filter=CDistr eq '3'`. **Viola la regla del proyecto**: los canales válidos son `01` = Contado y `02` = Crédito. La lista llega vacía y el precio queda en 0.

Además **LAN no consultaba lista de precios**: pasaba `@Condicion` y `@Cp` al SP `SpVTASInsertArtSolCreditoLinea` y **el SP resolvía el precio**. El concepto de "uen 3" no existe en el camino de LAN.

> [!success] Corregido — se cotiza por SKU, no por UEN
> Decisión del usuario (2026-09-11): el precio se resuelve con **SD29 por SKU**, que es la fuente correcta ahora que el SP desaparece.
> ```csharp
> preciosSku = await _preciosMethods.GetFinalListProperBySkuAsync(articuloActual)   // $filter=Articulo eq '{sku}'
> var proper = preciosSku.FirstOrDefault(pr =>
>                  string.Equals(pr.Condition, condicion, StringComparison.OrdinalIgnoreCase))
>              ?? preciosSku.FirstOrDefault();
> ```
> Con **caché por SKU** dentro de la llamada (no repite el GET si el artículo se repite) y aviso por consola cuando SD29 no devuelve precio para un SKU.

### 4.4 ✅ CORREGIDO (2026-09-11) — La validación de SMS siempre daba falso

La causa real resultó distinta a la que reportó el análisis, y se probó contra responses reales:

**`IsValidatedAsync` consumía la variante equivocada de BP05.** Llamaba a `GetClientAsync` → `ZB_DATOS_CLIENTE_CDS`, **que no expone el campo de validación**. Sus campos de teléfono son `zidcteTel, ztipoCte, ztelCte, zfecha, zenvioNip, zappOrig, zfechaCap, zelExist, ztraeTel, zintentos, ztipoValid` — **no trae `zvalTel`**. Al deserializar, `partner.zvalTel` se quedaba en el default de C# (`false`), la condición `!partner.zvalTel` era **siempre verdadera**, y el método devolvía `""` pase lo que pase. Encima `ztelCte` llegaba vacío y la vista repite el mismo BP en **7 filas** (producto cartesiano de teléfonos × direcciones), así que tomar la primera era arbitrario.

> [!success] Corregido — ahora usa BP05MA
> `ZAPI_BP05MA_SRV` (el servicio que expone `AS_GET_BP_MA`) **sí trae el dato**, en la colección `to_CteTel`: `ZtelCte`, `Zvaltel`, `ZappOrig`, `ZtipoCte`. Se reutilizó `GetClientMaAsync`, que ya existía y hace el `$expand`, y se replicó el `WHERE` del legacy sobre la colección:
> ```csharp
> var validado = telefonos.FirstOrDefault(t =>
>     t.Zvaltel                                    // ValidacionTel = 1
>     && !string.IsNullOrWhiteSpace(t.ZappOrig)    // IsInTableStd
>     && !string.IsNullOrWhiteSpace(t.ZtelCte)
>     && string.Equals(t.ZtipoCte, "MOVIL", StringComparison.OrdinalIgnoreCase));
> ```
> ⚠️ `HasValidPhoneOriginSAPAsync` tiene el **mismo defecto** y sigue sin corregir — hoy no hace daño porque **no tiene llamadores**.

### 4.5 El liberador y el callback están comentados

`OrderMethods.cs:665-697` — todo el bloque entre `/*` y `*/`, con la nota `:663` `// PENDIENTE: Servicio de Liberador`.

**Impacto:** ningún pedido a crédito se autoriza ni se rechaza. El ciclo no arranca.

> [!note] Motivo del pendiente (2026-09-11)
> Están comentados **porque todavía no se ha entregado la URL del liberador ni a dónde apunta**. Queda **pendiente de validar con Valentín**. No es deuda técnica ni un olvido: es una dependencia externa sin resolver.
>
> Cuando llegue la URL, además de descomentar hay que **corregir la condición invertida de §4.6** — si no, se disparará sobre la población equivocada.

### 4.6 La condición que dispara el liberador está INVERTIDA

| | Condición | Población |
|---|---|---|
| **LAN** | `CreditMethods.cs:208` `if (data[0].ToUpper().StartsWith("C"))` | clientes que **YA TIENEN** cuenta |
| **SAP** | `OrderMethods.cs:620,661` `esClienteNuevo = string.IsNullOrWhiteSpace(cuentaBp) && ...` | clientes que **NO TIENEN** cuenta |

Son **poblaciones disjuntas**. Aun descomentando el bloque, se dispararía en el caso contrario al legacy.

⚠️ Nota: el prefijo `"C"` es formato **Intelisis** (`C00000020`). Los BP de SAP son numéricos (`1500003857`) — el propio DMZ lo documenta. Así que la condición de LAN **no es portable tal cual**; hay que reexpresarla como "tiene cuenta" vs "no tiene cuenta", no por el prefijo.

---

## 5. ⚠️ Reglas que ya estaban ROTAS en LAN — no replicarlas

> Migrar estas "tal cual" significaría copiar un bug. Arreglarlas significa **endurecer una regla que hoy no existe en producción**. Las dos cosas son decisiones, no obviedades.

### 5.1 El límite de crédito nunca frena nada

`CreditMethods.cs:788-790`:
```csharp
cmd.ExecuteScalar();                                    // ← primera ejecución, descartada
return decimal.Parse(cmd.ExecuteScalar().ToString());   // ← segunda
```
Y el SP `SpCREDIDatosSolicitudCreditoArt.sql:115-121` en `@Op='GetSaldo'` calcula hacia una **variable** y hace `RETURN` — **no emite result set**. `ExecuteScalar()` devuelve `null`, `.ToString()` lanza `NullReferenceException`, el `catch` vacío de `:796-799` se lo traga, y `:801` hace `return 0;`.

Resultado: `CreditMethods.cs:126-128` marca `res = "insuficiente"` **siempre**… y el flujo continúa igual e inserta la solicitud.

> [!note] DECISIÓN TOMADA (2026-09-11) — **sí debe frenar**, pero está **bloqueado por falta de fuente**
> El crédito disponible **sí debe frenar el pedido**: hay que validar que el cliente tenga saldo suficiente.
>
> **Bloqueante:** hoy **no hay una fuente real** de cuánto crédito disponible tiene el cliente. Hasta que exista, la validación se queda comentada (`:632-634`) y el comportamiento sigue siendo el de LAN (no frena nada).
>
> **Dónde vivirá el dato cuando exista** — BP05MA (`ZAPI_BP05MA_SRV`, nodo `to_Cte`) ya expone los campos candidatos, y el modelo `BusinessEntitiesMa.cs` ya los mapea:
>
> | Campo | Línea del modelo | En el response de QA |
> |---|---|---|
> | `ZlimCred` (límite de crédito) | `:285` | `"0.000"` |
> | `Zcrmimporte` | `:272` | `"0.000"` |
> | `Zlcaxsi` | `:287` | `"0.000"` |
> | `ZlimCedDimae` | `:290` | `"0.000"` |
> | `ZingMensCredw` | `:289` | `"0.000"` |
> | `Zcredito` | `:268` | `""` |
>
> **El campo existe y ya está mapeado; lo que falta es que el dato venga poblado.** Cuando SAP lo llene, activar la validación es leer `to_Cte` y comparar contra `order.total` — no hay que construir infraestructura.
>
> ⚠️ Y ojo con el efecto: como LAN **hoy no frena** (§5.1), activarla rechazará pedidos que actualmente pasan. Es un cambio de comportamiento observable, no solo una migración.

### 5.2 Los errores del guardado nunca llegan a Magento

`OrderMethods.cs:624` llama a `ProductosCreditoWeb_SaveData(` **sin asignar el retorno**, y `:649` devuelve la cuenta pase lo que pase. Los `return "err"` (`CreditMethods.cs:251`) y `return "sin cuenta"` (`:257`) mueren ahí.

LAN responde `PROCESANDO` aunque el cliente no exista o el insert haya reventado. **Magento espera un callback que nunca llegará.**

ServicioSAP **sí propaga** la excepción (`:705` `throw;`). Es mejor, pero es un **cambio de contrato observable por Magento** que hay que confirmar con ese equipo.

### 5.3 El cálculo de `@ValidacionTelefono` en C# es parámetro muerto

`CreditMethods.cs:185` lo calcula con `ObtenerNumeroTablaSms` + `IsValidated` + `IsInTableStd`… y el SP lo **pisa**: `SP_CREDITO_WEB_DATOS.sql:210-221` lo recalcula por su cuenta.

Quien decide si se pide validación telefónica es **el SP**, no el C#. ServicioSAP hace bien en no calcularlo — pero la lógica real sigue leyendo `IntelisisTmp.dbo.CteTel` y `TablaStD` **por linked server**, y eso muere con Intelisis.

### 5.4 El liberador nunca devuelve AUTORIZADO

`LiberadorCreditoMethods.cs:85,93,99` mapea todo a `EN_ANALISIS` o `RECHAZADO`. La autorización llega **solo por el polling** de `creditStatus` (`OrderMethods.cs:1986` `return "AUTORIZADO";`).

**Y un timeout de red se convierte en `RECHAZADO` definitivo** para Magento, aunque el crédito estuviera bien. ServicioSAP replicó el mismo comportamiento.

---

## 6. Datos que se pierden en ServicioSAP

| Dato | LAN | ServicioSAP | Equivalencia |
|---|---|---|---|
| `rfc`, `sexo`, `fecha_nacimiento`, `estado_civil` | los trae del **maestro de cliente** | van **vacíos**; salen del payload de Magento | 📄 **BP05** `ZB_DATOS_CLIENTE_CDS` |
| `@fecha_nacimiento` | fecha válida | **cadena vacía contra un parámetro `DATE`** | — |
| `@sucursal` | `505`/`504` derivado de la UEN | **`0`** | cálculo en C# |
| `@sucursalDestino` | `order.sucursalDestino` | **`0`** hardcodeado | el dato ya llega en el request |
| `@origen` | `infoCliente["origen"]` (default `"PRODUCTOS MX"`) | ✅ **`"PRODUCTOS MX"`** | resuelto 2026-09-11 |
| `@OrigenIdMagento` | opcional, lo manda Magento | ✅ **se propaga**; antes estaba **fijo en `""`** | campo agregado al modelo |
| `@RedimirMonedero` | se envía | literal `0` | — |
| **Abono** (parcialidad por artículo) | lo traía de `PropreListaDFinal` (cálculo interno) | ✅ **de SD29 por condición** | 📄 SD29 campo `Abono` — ver nota abajo |
| `Condicion` y `Código Postal` del renglón | se guardan | **no se guardan** (el CP llega al método y no se usa) | — |
| Teléfono | separa lada + número | lada en `0`, los 10 dígitos en la columna de celular | — |
| Sustitución de SKU por región (telefonía/CP) | sí | **desaparece** | — |
| **Guía de envío** (SQLite) | `SaveGuide` corre **antes** del `if` | **no se ejecuta** (early-exit anterior) | SQLite **se conserva** — basta mover la llamada |
| `eCommerceDetPedidos` | se escribe antes del `if` | eliminado | tabla de Intelisis, **muere**: no requiere equivalencia |
| `codigo_promotor`, `OrigenIdMagento` | llegan **solo en el payload de crédito**, opcionales | ✅ **agregados a `InfoClienteRequest`** | verificado contra `magento_payloads.md` |
| `origen` | llega | **no existe en `InfoClienteRequest`** | ✅ resuelto: Magento no lo manda, LAN siempre cae a su default, así que se replica el literal sin tocar el modelo |

> [!note] Sobre el `Abono` en 0.00 — resuelto, NO es defecto de código (2026-09-11)
> SD29 **sí devuelve** el campo `Abono` por renglón; lo que faltaba era mapearlo en `FinalListProper`. Ya está.
>
> En el response real de `PRIN00043`, las filas de `OrgVtas` **04**/**05** traen `Abono: "0.00"` mientras que las legacy (`1`/`2`), con el **mismo precio**, traen abonos reales (`22.00`, `26.00`, `56.00`). Eso **no es un bug**: el abono es **un configurable del artículo al darlo de alta**, y esos artículos están mal configurados en las organizaciones nuevas.
>
> El filtro por `OrgVtas` **es correcto y necesario**: garantiza tomar la organización correcta y con ella su abono. Sin él, el respaldo podía caer en `Mayoreo Local` a **549** cuando el precio de crédito correcto era **1,146**.
>
> **Acción: ninguna del lado del código.** Cuando el artículo se configure bien, el valor fluye solo.
>
> Único hardcode restante: `abonoArticulo = 12.0f` para `SEGU00001` (renglón de costo de envío), SKU sintético que no está en SD29.

**Invocación del SP — ✅ CORREGIDO (2026-09-11).** ServicioSAP lo llamaba con un texto `EXEC` de 11 líneas (`SP_CREDITO_WEB_DATOS @Id, @Op, @apellido_p, ...`), que es invocación **posicional** de T-SQL: los `@nombres` eran variables de C# y **SQL Server las amarraba por posición**. Funcionaba solo mientras el orden coincidiera; insertar un parámetro a media firma del SP corría todo lo posterior, **en silencio**.

Ahora se invoca como stored procedure, con binding **por nombre**:
```csharp
new SqlCommand("SP_CREDITO_WEB_DATOS", cnn) { CommandType = CommandType.StoredProcedure }
```
Los 61 `Parameters.Add` ya estaban por nombre. Se verificó antes que los 5 no enviados (`@Agente`, `@RedimirMonedero`, `@ValidacionTelefono`, `@FechaCita`, `@HoraCita`) **tienen default**.

> Esto **explica el origen de dos hallazgos** del análisis: *"`@RedimirMonedero` se manda 0 literal"* y *"`@ValidacionTelefono` no se envía"*. No eran decisiones de negocio — eran **literales tapando huecos de posición** (`'', 0, NULL`). Ahora son parámetros explícitos, con el mismo valor.

---

## 7. Contrato de salida

| | LAN | ServicioSAP |
|---|---|---|
| Tipo | **cadena** — `order.infoCliente["cuenta"]` | **objeto** — `OrderResponse{Resultado,Zctefinal,Zidecomm}` |
| Controlador | `Ok(new { status="PROCESANDO", cuenta })` | `Ok(objeto aplanado)` — **pierde `Zidecomm`** |
| Error | siempre `PROCESANDO` | `400` con el mensaje |

Y hay un problema aparte: **`Resultado="Concluido"` para crédito es indistinguible de un pedido realmente creado en SAP.** Magento no puede saber si tiene un pedido o una solicitud.

Además se perdieron los códigos HTTP del DMZ (`409 PedidoExistente`, `422 sin cuenta`, `400 Incorrecto`) y **la idempotencia ya no cubre crédito**: se pueden crear solicitudes duplicadas, porque la comprobación pregunta a SAP (SD36) por un documento que el crédito nunca crea.

---

## 8. El ciclo no cierra

| Endpoint | DMZ apunta a | ¿Existe en ServicioSAP? |
|---|---|---|
| `order/setOrder` → `order/new` | **ServicioSAP** ✅ | sí |
| `order/validateCredit` | **eliminado del DMZ** | — |
| `order/creditStatus/{id}` | **LAN** (`curl.Post`) | ❌ **no existe** |
| `order/updateCreditOrderId` | **LAN** (`curl.Post`) | ❌ **no existe** |
| `order/authorizationResult` | existe en el DMZ | ServicioSAP **ya no lo dispara** |

**Nadie convierte una solicitud de crédito aprobada en un pedido SAP.**

### ✅ DECISIÓN TOMADA (2026-09-11)

> [!success] La solicitud nace al enviar la orden. El liberador sólo notifica.
>
> Palabras del negocio:
> *"El pedido SAP / la solicitud nace cuando se hace el envío de la orden, con su respectiva información de crédito, y el liberador es el que se encargaba de notificar, mientras siguiéramos el flujo del SP de Android que hace inserciones."*
>
> Esto **descarta** la opción A que se había planteado (diferir la creación hasta la liberación). No hay un paso posterior que "convierta" la solicitud: el registro se crea en el momento del envío, con su información de crédito, y el liberador es un **notificador**, no un creador.

**Qué se conserva, entonces:**

| Pieza | Decisión |
|---|---|
| `SP_CREDITO_WEB_DATOS` (BD Android) | **se conserva** — es el que hace las inserciones, y el flujo se sigue apoyando en él |
| `SpVTASInsertArtSolCreditoLinea` | **se conserva** — líneas de artículo de la solicitud |
| El liberador | **notifica** el resultado; no crea el documento |
| `updateCreditOrderId` | sigue teniendo sentido: actualiza el identificador cuando el crédito se libera |

> [!question] Lo único que queda por precisar de esta decisión
> Si además de la solicitud en la BD de Android debe crearse **un documento de venta en SAP** (`ZAPI_SALESORDER_SRV`) en ese mismo momento.
>
> Hoy **no se crea ninguno**: el bloque de crédito hace `return` en `:1898`, antes de `BuildSapOrderAsync` (`:1930`). Si la respuesta es que sí debe crearse, el cambio es mover el `return` después de la construcción del pedido; si es que no, el flujo actual ya es el correcto y sólo falta el aviso del liberador.

**Pendiente adicional:** el **liberador no tiene URL asignada todavía** — bloquea implementar el aviso, no la decisión.

---

## 9. Fuentes que faltan en el repositorio

Trazadas hasta un consumidor real (§ regla 31 del skill):

| Fuente | Cadena | Estado |
|---|---|---|
| `SpCREDISolicitudWebPrimerGuardado` | SP principal de **ambos flujos de apertura** de cuenta | ❌ falta |
| `SP_GeneraConsecutivoCteMavi` | consecutivo de cliente nuevo | ❌ falta |
| ~~`SPCREDICredilana`~~ | flujo Credilana | 🚫 **FUERA DE ALCANCE** (2026-09-11) |
| ~~`SpCREDICredilanaSeguroDeVida`~~ | seguro de vida Credilana | 🚫 **FUERA DE ALCANCE** (2026-09-11) |

Sí están: `SP_CREDITO_WEB_DATOS`, `SpVTASInsertArtSolCreditoLinea`, `SpCREDIDatosSolicitudCreditoArt`.

> ⚠️ `SP_CREDITO_WEB_DATOS` vive en **ServicioAndroid** (que se conserva) pero **cruza a `ERPMAVI.IntelisisTmp` por linked server en 3 puntos**. Eso hay que resolverlo antes del apagado de Intelisis, independientemente del resto.

---

## 10. Estado y orden de trabajo — actualizado 2026-09-11

### ✅ Cerrado y verificado en código

| | Dónde |
|---|---|
| Los artículos se insertan en la solicitud | §4.1 · `InsertCreditArticlesAsync` |
| El cupón del promotor se quema | §4.2 · por `codigo_promotor` |
| El precio sale de SD29 por SKU, y con él el `Abono` | §4.3 · `GetFinalListProperBySkuAsync` |
| La validación de SMS funciona | §4.4 · BP05MA con `Zvaltel` |
| El SP se invoca por nombre, no por posición | §6 |
| `@origen` → `"PRODUCTOS MX"` | §6 |
| `@OrigenIdMagento` se propaga | §6 |
| El contrato de error vuelve a ser el de LAN (200, no 400) | §5.2 · el DMZ es sólo el puente |
| La solicitud nace al enviar la orden; el liberador notifica | §8 |

### 🔵 Deuda de código — no depende de nadie externo

1. **`SaveGuideAsync` no corre para crédito.** Está en `:1937`, después del early-exit de `:1898`. En LAN corría antes del `if`. La guía de envío no se guarda.
2. **Parámetros del SP que LAN manda con valor y aquí van en 0 o vacío:** `@Agente`, `@SucursalDestino`, `@RedimirMonedero`, `@sucursal`. Los cuatro ya llegan en el request.
3. **`rfc`, `sexo`, `fecha_nacimiento`, `estado_civil`** van vacíos; LAN los toma del maestro de cliente y el equivalente aquí es BP05.
4. **`@fecha_nacimiento` manda cadena vacía contra un parámetro `DATE`.**
5. La **condición y el CP del renglón** no se guardan — el CP llega al método y se ignora.
6. El **teléfono** pierde la lada (va en `0`).
7. La **sustitución de SKU por región** desaparece en el camino de crédito.
8. `HasValidPhoneOriginSAPAsync` arrastra el mismo defecto de §4.4 — hoy inocuo porque no tiene llamadores.

> Los puntos 1 y 2 son los de mejor relación esfuerzo/valor: pocas líneas sobre datos que ya están en la mano.

### 🔴 Bloqueado por terceros

| | Con quién |
|---|---|
| URL del liberador y su aviso | Valentín |
| Condición invertida del liberador (§4.6) | depende de lo anterior |
| Saldo disponible que frene el pedido (§5.1) | el campo existe en BP05MA `to_Cte`, llega en `0.000` |
| Agente genérico de ecommerce (Z1) | MAVI |
| BP genérico para invitado | MAVI |
| `SpCREDISolicitudWebPrimerGuardado`, `SP_GeneraConsecutivoCteMavi` | §9 — faltan los SPs (los dos de Credilana quedaron fuera de alcance) |
| `SP_CREDITO_WEB_DATOS` cruza a `ERPMAVI.IntelisisTmp` por linked server en 3 puntos | hay que resolverlo antes del apagado de Intelisis |

### ⚠️ Sin cerrar, y sin dueño asignado

- **`Resultado="Concluido"` es indistinguible** entre "te creé un pedido" y "te registré una solicitud". Magento no puede diferenciarlos.
- **La idempotencia ya no cubre crédito:** la comprobación de duplicados pregunta a SD36 por un documento que el crédito no crea, así que se pueden generar solicitudes repetidas.
- Los dos flujos de **apertura** que siguen en LAN son un frente aparte: [[Flujo_Apertura_Cuenta_Mercancia]], [[Flujo_Apertura_Cuenta_Sin_Mercancia]].
- 🚫 **Credilana queda FUERA DE ALCANCE** (decisión del 2026-09-11, `SKILL.md` regla 15). [[Flujo_Credilana]] se conserva como documentación del legado, no como trabajo pendiente.
