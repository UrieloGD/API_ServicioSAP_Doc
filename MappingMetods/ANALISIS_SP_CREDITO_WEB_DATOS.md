---
tags: [migracion, sap, credito, sp, intelisis, analisis]
fecha: 2026-09-14
estado: analisis completo · verificacion adversarial NO concluida
---

# SP_CREDITO_WEB_DATOS y sus satélites — mapa de la lógica

> [!abstract] Qué es esto y por qué hacía falta
> El SP existe en `SPsOrden\` desde el 2026-09-08, pero **nunca se había abierto**. Todo lo publicado sobre su interior venía de `_EXCLUIDOS_Intelisis.md` — una fuente que [[GUIA_MIGRACION_FABLE]] §9 declara **retirada** — y se propagó sin re-verificar a seis documentos.
>
> Esto es el primer mapa hecho leyendo el SQL: **622 líneas**, con `archivo:línea` en cada afirmación.

> [!warning] Nivel de confianza — leer antes de usar esto
> Los **7 frentes de análisis están completos** y cada afirmación trae su `archivo:línea`.
>
> La ronda de **refutación adversarial se detuvo antes de concluir** (decisión del 2026-09-14: el reporte ya era utilizable y no se justificaba seguir gastando en verificarlo). Es decir: **esto es análisis de una sola pasada, sin contraste independiente.**
>
> Qué significa en la práctica:
> - Lo marcado **CONFIRMADO** (§3 `@ValidacionTelefono`, §6 `GetSaldo`) se sostiene solo: son afirmaciones sobre código citado literalmente y comprobables abriendo esas líneas.
> - Lo demás **vale como mapa, no como verdad verificada**. Antes de tomar una decisión de diseño sobre cualquier punto de aquí, abre la línea citada.
> - Las correcciones del §9 a nuestros propios documentos **sí se aplicaron** al resto del corpus, porque son de hecho verificable (un archivo existe o no, un `EXEC` está o no está).
>
> Si en algún momento hace falta el contraste, el workflow se puede relanzar con `resumeFromRunId` y los 7 análisis vuelven desde caché.

---

## 1. Qué es el SP, en una línea

**Un despachador por `@Op` con tres ramas** que escribe la solicitud de crédito web en `CRED_SOLICITUD_WEB_DATOS_TEMP` y sus referencias en `TrWACW00041_RefSolCredWeb`.

Vive en la base **`ServicioAndroid`** (`SP_CREDITO_WEB_DATOS.sql:1` → `USE [ServicioAndroid]`).

| `@Op` | Línea | Qué hace |
|---|---|---|
| `Insert` | 172-349 | Alta de la solicitud. 59 columnas |
| `Update` | 351-368 | Pisa 9 columnas por `id = @Id` |
| `InsertReferencia` | 370-603 | Referencias personales, con dos caminos |
| **cualquier otro (incluido `NULL`, su default)** | — | **No escribe, no falla, no devuelve nada** |

Los tres `IF` son **independientes**, no `IF/ELSE IF`.

---

## 2. Lo que devuelve — y por qué importa

**No hay `RETURN` con valor ni parámetros `OUTPUT` en las 622 líneas.** Tampoco `SET NOCOUNT ON`, ni `BEGIN TRAN`, ni `TRY/CATCH`, ni `RAISERROR`.

Devuelve **un result set de 1 fila × 1 columna sin nombre**, distinto por rama:

| Rama | Línea | Qué devuelve realmente |
|---|---|---|
| `Insert` | 348 | `SCOPE_IDENTITY()` — el **Id real** de la solicitud ✅ |
| `Update` | 367 | **El eco de `@Id`** — devuelve lo mismo aunque el `WHERE` no haya tocado ninguna fila |
| `InsertReferencia` (corto) | 400 | El Id del **renglón de referencia**, NO el IdSolicitud |
| `InsertReferencia` (largo) | 601 | Ídem |
| `@Op` desconocido | — | **Nada. Cero filas, sin error** |

> [!danger] Consecuencia directa en ServicioSAP
> `CrearSolicitudCreditoAsync` lee `ds.Tables[0].Rows[0][0]` y **devuelve `0` si no hay filas** (`OrderMethods.cs:898-910`). Un `@Op` mal escrito produciría una solicitud fantasma con id `0` sin ningún error. Hoy no pasa porque `@Op` va fijo en `"Insert"`.

---

## 3. 🔴 `@ValidacionTelefono` — CONFIRMADO: el cálculo del legado es código muerto

La sospecha que arrastrábamos queda probada leyendo el SQL.

```
L210-217  IF @TelefonoValidado IS NULL OR @ValidacionOrigen IS NULL
             OR @TelefonoValidado != @TelefonoAValidar
          → @ValidacionTelefono = IIF(SUBSTRING(@cliente,1,1) != 'P', 1, 0)
L218-221  ELSE
          → @ValidacionTelefono = 0
```

**Las dos ramas asignan.** No hay camino en el que el valor del parámetro sobreviva: se usa ya pisado en el `INSERT` de `L337`.

Confirma §5.3 de [[FLUJO_CREDITO_LAN_VS_SAP]] y valida que ServicioSAP mande `DBNull`.

**Y aparecen tres cosas que nadie había visto:**

**a) La semántica parece invertida.** Cuando *todo checa* —hay teléfono validado en `CteTel`, hay origen autorizado en `TablaStD` y coincide con el del SMS— el SP escribe **`0`** (`L220`). Cuando **no** checa, escribe `1`. Leído como *"¿requiere validación?"* tiene sentido; leído como *"¿está validado?"* está al revés. El nombre de la columna sugiere lo segundo.

**b) `@TelefonoAValidar` no está protegido contra `NULL`.** El `IF` de `L210-214` cubre con `IS NULL` a `@TelefonoValidado` y a `@ValidacionOrigen`, pero **no** al tercero. Si el cliente no tiene renglón en `TcAAEA00030_EnvioMensajes`, la comparación `!=` evalúa a `UNKNOWN` y cae al `ELSE`.

**c) Se comparan dos formatos distintos.** `@TelefonoValidado` se arma como `CONCAT(ct.Lada, ct.Telefono)` — **con lada** (`L194-197`) — y `@TelefonoAValidar` es el `Telefono` pelón de la tabla de SMS (`L205`). Se comparan en `L213` asumiendo el mismo formato. ⚠️ **SIN EVIDENCIA** de cómo se guarda ahí: si va sin lada, la comparación **nunca empata** y el SP siempre toma la primera rama.

---

## 4. Los cruces a Intelisis — el inventario real

El SP hace **3 lecturas** por linked server `ERPMAVI`, y una cuarta que **no** es externa:

| Objeto | Línea | Para qué |
|---|---|---|
| `ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt` | 176-182 | Sólo en la rama `@origen = 'DIMAS MX'` |
| `ERPMAVI.IntelisisTmp.dbo.TablaStD` ⋈ `CteTel` | 186-191 | `@ValidacionOrigen` |
| `ERPMAVI.IntelisisTmp.dbo.CteTel` | 194-202 | `@TelefonoValidado` |
| `TcAAEA00030_EnvioMensajes` | 205-208 | **LOCAL de ServicioAndroid**, no es cruce |

> [!note] Corrección a nuestros documentos
> Se venía diciendo *"cruza a Intelisis en 3 puntos y toca `CREDICCondicionArt`, `TablaStD` y `CteTel`"*. Es correcto en los objetos, **pero `TcAAEA00030_EnvioMensajes` se contaba mal como cruce**: es local.
>
> Y hay un matiz que cambia el trabajo: **ServicioSAP manda `@origen = "PRODUCTOS MX"` fijo** (`OrderMethods.cs:884`), así que **la rama `DIMAS MX` nunca se dispara desde el servicio nuevo**. De los 3 cruces, sólo 2 están vivos en nuestro flujo.

### El panorama completo del flujo de crédito

| | Cantidad |
|---|---:|
| Referencias de 4 partes **hacia** Intelisis (`ERPMAVI.*`) | **11** (10 lecturas + 1 `UPDATE` sobre `Cte`) |
| Referencias de 4 partes **de regreso** a `MAVIANDROID01.ServicioAndroid` | **5** |
| SPs cuyo **cuerpo entero** vive en `IntelisisTmp` y desaparecen con la base | **3** |

Los tres que desaparecen: `SpVTASInsertArtSolCreditoLinea`, `SpCREDICodigoRecomendador`, `SpCREDIDatosSolicitudCreditoArt`.

---

## 5. 🔴 `SpVTASInsertArtSolCreditoLinea` — la dirección del cruce era al revés

Dábamos por hecho que este SP vive en Android. **No: vive en Intelisis** (`SpVTASInsertArtSolCreditoLinea.sql:1` → `USE [IntelisisTmp]`) y **escribe de regreso** a `MAVIANDROID01.ServicioAndroid.dbo.VTASdArtCreditoWeb` por linked server (`:208`, `:243`).

Eso cambia el encuadre: no es "un SP de Android que consulta Intelisis", es **un SP de Intelisis que alimenta a Android**. Cuando Intelisis se apague, **se va completo**.

**Dos ramas de negocio:**

- `@Articulo = 'SEGU00001'` (`:179-217`) — el costo de envío. `@Abono = 12` **hardcodeado** (`:185`), precio = `@SeguCost`. **Ignora `@Condicion`** y no consulta `PropreListaDFinal`.
- Cualquier otro (`:218-263`) — precio y abono desde `PropreListaDFinal ⋈ VTASCCondicionesCredVtaLinea`, con `CEILING` si hay `DescuentoCategoria`.

**Y una capa previa de sustitución de SKU por región** que sólo se activa si `Art.Familia = 'TELEFONIA'` (`:43-46`), usando `@Cp` para elegir entre Region5 y Region6.

> [!danger] Dos fallas silenciosas
> **1.** Si el artículo es de TELEFONIA, está en `VTASCRegionSku`, el CP es de región celular, y **no coincide ni con Region5 ni con Region6** → no hay `ELSE`, `@artRegion` queda `NULL`, el `INSERT` filtra por él y **no inserta nada** (`:121-126`, `:262`).
> **2.** Si el `JOIN` de condición/artículo no devuelve fila → `INSERT ... SELECT` de **0 filas**, sin error (`:243-262`).
>
> En ambos casos la línea de artículo simplemente no existe y nadie se entera.

---

## 6. 🔴 `SpCREDIDatosSolicitudCreditoArt` — el defecto de `GetSaldo`, CONFIRMADO

Lo teníamos reportado en [[FLUJO_CREDITO_LAN_VS_SAP]] §5.1. **Queda confirmado contra el SQL.**

Los tres `SELECT` de la rama (`:84-85`, `:109-110`, `:115-116`) son de la forma `SELECT @variable = expresión`, que en T-SQL **asigna y no produce result set**. La rama termina con un `RETURN` desnudo.

**La cadena completa del fallo:**

```
GetSaldo no emite result set
  → CreditMethods.cs:790  decimal.Parse(cmd.ExecuteScalar().ToString())  sobre null
  → NullReferenceException
  → catch VACÍO de CreditMethods.cs:796-799
  → return 0 de CreditMethods.cs:801
```

`checkSaldo()` **nunca devuelve otra cosa que `0`**. Y en `CreditMethods.cs:126`, `if (total > checkSaldo(...))` compara contra ese `0` fijo: **cualquier pedido con total > 0 queda marcado `"insuficiente"`** — y el flujo continúa igual.

Dos hallazgos extra:

- **`@CreditoDisponible` es código 100% muerto** (`:115-120`): se calcula el `CASE` que es el propósito declarado del SP y a la línea siguiente se hace `RETURN` sin emitirlo.
- **`checkSaldo` llama a `ExecuteScalar()` dos veces** sobre el mismo comando (`:788` y `:790`): el SP se ejecuta **dos veces** por consulta. El mismo patrón está en `getClienteMagento` (`:324` y `:326`).

---

## 7. 🔴 `SP_GeneraConsecutivoCteMavi` — está huérfano

Le habíamos pedido este SP como dependencia. **No lo es.**

`SP_CREDITO_WEB_DATOS.sql:16` registra textualmente: *"09/06/2017 Armando Morelos — Se quitó la ejecución del SP de `ERPMAVI.IntelisisTMP.dbo.SP_GeneraConsecutivoCteMavi` y se quitó el link server"*. Un `grep` de `GeneraConsecutivoCteMavi` sobre toda la carpeta **no encuentra ningún `EXEC` vivo**, sólo ese comentario.

Y si alguna vez se vuelve a usar, hay que saber lo que tiene dentro:

- **Cero control de concurrencia.** Sin transacción, sin `applock`, sin `SERIALIZABLE`. Las dos lecturas usan `WITH(NOLOCK)`. Es un *check-then-act* clásico entre `L74` y `L76`: dos sesiones simultáneas calculan el mismo consecutivo y ambas insertan.
- **Bucle infinito posible** (`L50`): si el valor calculado ya existe y nada cambia en la tabla, recalcula exactamente el mismo y gira indefinidamente.
- **Desborde silencioso a los 100 millones** (`L72`): `RIGHT(..., 8)` trunca por la izquierda y da la vuelta al contador.
- `@Empresa` es **parámetro muerto** — el prefijo `'P'` está hardcodeado.

---

## 8. `SpCREDISolicitudWebPrimerGuardado` — es otra cosa, no un satélite

Vive también en `ServicioAndroid`. Es un **multiplexor de 11 operaciones** que gestiona el **alta progresiva** de la solicitud.

**La diferencia de fondo:**

| | `SpCREDISolicitudWebPrimerGuardado` | `SP_CREDITO_WEB_DATOS` |
|---|---|---|
| Qué es | La **pre-solicitud** | La solicitud **formal** |
| Tabla | `CREDIDSolicitudWebDatosPrimerGuardado` | `CRED_SOLICITUD_WEB_DATOS_TEMP` (59 col.) |
| Parámetros | 17 | 66 |
| Ciclo de NIP por SMS | **sí, completo** (6 ramas) | no |
| Cruza a Intelisis para | **precio** (`art`, `PropreListaDFinal`) | **validación de teléfono** (`CteTel`, `TablaStD`) |

**No se solapan en ningún objeto de Intelisis.** Se enlazan por la operación `SaveIdDatosTemp` (`:308-315`), que guarda el Id devuelto por `SP_CREDITO_WEB_DATOS`.

---

## 9. Lo que hay que corregir en nuestros propios documentos

| Afirmación publicada | Realidad |
|---|---|
| *"Faltan `SpCREDISolicitudWebPrimerGuardado` y `SP_GeneraConsecutivoCteMavi`"* | **Los dos están** en `SPsOrden\` |
| *"`SP_CREDITO_WEB_DATOS` llama a `SP_GeneraConsecutivoCteMavi`"* | **No lo llama desde 2017** |
| *"Cruza a Intelisis en 3 puntos"* | Correcto, pero **sólo 2 están vivos** en nuestro flujo (`DIMAS MX` nunca se dispara) |
| *"`TcAAEA00030_EnvioMensajes` es lectura de Intelisis"* | Es **local** de ServicioAndroid |
| *"`SpVTASInsertArtSolCreditoLinea` vive en Android"* | Vive en **IntelisisTmp** y escribe de vuelta a Android |
| *"Fuente NO disponible / caja negra / Regla #5"* — en **10 sitios** | **Caducado** desde el 2026-09-08 |
| El conteo de parámetros: circulan **36, 38, 60, 61 y 64** | La firma real tiene **66** |

---

## 10. Lo que sigue sin respuesta

1. **¿Cómo se guarda el teléfono en `TcAAEA00030_EnvioMensajes`, con lada o sin ella?** De eso depende si la comparación del `L213` funciona alguna vez. **SIN EVIDENCIA** en los archivos.
2. **¿La semántica de `ValidacionTelefono` es "requiere validación" o "está validado"?** El SQL escribe `0` cuando todo checa.
3. **¿`TempCteDOS` tiene índice único sobre `Cte`?** Decide si la carrera de `SP_GeneraConsecutivoCteMavi` produce duplicados o un error. No está el DDL.
4. **¿`SpCREDIDatosSolicitudCreditoArt` está desplegado?** Tener el `.sql` no prueba que el objeto exista en la base. `LAN - Mapa.md` afirma que **no existe** en `MAVICBOSANDROID`, y de eso depende el diagnóstico de §6.
5. **¿Se migran las ramas `Update` e `InsertReferencia`?** Todos los consumidores conocidos mandan `@Op = 'Insert'` constante.
6. **El changelog interno menciona cambios de Valentín (2022) y David Chávez (2023).** Conviene llevarle a Valentín el encabezado textual del `.sql`.
