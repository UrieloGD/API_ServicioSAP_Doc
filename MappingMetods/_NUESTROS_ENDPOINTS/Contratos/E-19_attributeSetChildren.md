---
tags: [contrato, endpoint, migracion, ola-8, catalogo, sqlite]
partida: E-19
actualizado: 2026-09-08
---

# E-19 — `magento/attributeSetChildren/{id}`

Cruza los sets de atributos con las opciones de atributo y deja en SQLite una fila por
`(set, atributo)` marcando si ese atributo tiene valores de lista.

> ⚠️ **No es un endpoint que se migre: es un llamador que se reubica.** La ruta
> `magento/attributeSetChildren/{id}` se queda en la DMZ. Lo que se reconstruye es
> `Magento.sendAttributesToIntelisis()` de APIMagento, que la consume 446 veces seguidas.

> 🔴 **El nombre miente a medias.** `sendAttributesToIntelisis` sí escribe en SQLite, como
> decía el checklist — pero además vuelca a **MySQL** y ejecuta un SP en **IntelisisTmp**.
> Esos dos tramos viven en otro archivo y por eso pasaron desapercibidos.

## Identidad

| | |
|---|---|
| Verbo | **GET** |
| Ruta en la DMZ | `magento/attributeSetChildren/{id}` — `APIMagentoDMZ\Controllers\MagentoController.cs:38` |
| Destino real | Magento REST `rest/V1/products/attribute-sets/{id}/attributes` — `APIMagentoDMZ\Conn\Magento.cs:95` |
| Llamador legado | `APIMagento\Conn\Magento.cs:162` — `sendAttributesToIntelisis()` |
| Cola del llamador | `APIMagento\Metodos\AttributeMethods.cs:18` — `sendIntelisis()` |
| Llamador migrado | `Methods\Catalog\MagentoCatalogMethods.cs` — `SendAttributesToIntelisisAsync()` |
| Disparador migrado | `catalog/attributeSetChildren` (POST) y dentro de `catalog/cargaCompleta` |
| Quién lo dispara hoy | `product/updateProduct` de APIMagento, paso 8 de 17 |

## Request

**Ninguno.** Ni la ruta de la DMZ ni el disparador de ServicioSAP reciben cuerpo. El único
parámetro es el `{id}` de la URL, y lo pone el llamador en un bucle: **no lo elige un
cliente**, sale de leer `attribute_sets` en SQLite.

## Response de la DMZ — lo que hay que saber para consumirla

Llega **un string JSON que contiene un array JSON escapado**, no un array. Muestra real del
set 4 (`Default`), 89 372 caracteres:

```
"[{\"attribute_id\":291,\"attribute_code\":\"status\",\"frontend_input\":\"select\",
\"entity_type_id\":\"4\",\"is_required\":false,\"options\":[{\"label\":\"Enabled\",
\"value\":\"1\"},{\"label\":\"Disabled\",\"value\":\"2\"}],...}]"
```

Por eso el legado hace **cirugía posicional** antes de deserializar, y hay que conservarla:

| Paso | Código | Qué hace |
|---|---|---|
| 1 | `response.Remove(0, 1)` | quita la comilla inicial |
| 2 | `response.Remove(response.Length - 1)` | quita la comilla final |
| 3 | `.Replace("\\\"", "\"")` | desescapa las comillas internas |
| 4 | `.Replace("\\\\\"", "''")` | los valores que **traían comilla propia** —etiquetas tipo `72"`— pasan a `''` |
| 5 | `"{\"attributes\":" + response + "}"` | envuelve el array para poder deserializarlo en un objeto |

> ⚠️ Los pasos 1 y 2 **no comprueban nada**: recortan por posición. Si la DMZ dejara de
> envolver la respuesta en comillas —por ejemplo devolviendo el array directo— este método se
> come el primer `[` y el último `]` y revienta al deserializar. Es el punto más frágil de la
> partida.

### Response del disparador migrado

`catalog/attributeSetChildren` devuelve **`200` con `true`**. No devuelve los atributos: el
resultado del endpoint es el efecto en base, no el cuerpo.

## Qué consume, en orden

```
1. SQLite  · attribute_sets        ← lee los 446 sets (id + nombre)
2. Disco   · ignoreAttributes.txt  ← lee la lista de atributos a saltar
3. DMZ     · magento/attributeSetChildren/{id}   ← 446 llamadas, una por set
   └── Magento REST · rest/V1/products/attribute-sets/{id}/attributes
4. SQLite  · attribute_options     ← una consulta por atributo, para saber si tiene opciones
5. SQLite  · atributos_de_magento  ← borra y escribe una fila por (set, atributo)
```

**446 llamadas HTTP y ~24 000 consultas de comprobación** para producir ~24 000 filas. Es el
paso más caro de la ola con diferencia.

### La regla de negocio, que es una sola línea

Por cada atributo del set, busca su `attribute_code` en `attribute_options`:

| Encuentra opciones | Escribe |
|---|---|
| sí | `valor_de_lista = 'si'` |
| no | `valor_de_lista = 'no'` |

Medido sobre los datos del 1-sep: **4 504 filas en `si` y 19 572 en `no`**, sobre 446 sets
distintos — unos 54 atributos por set.

## Las tablas

### SQLite — `attribute_sets` (lee)

```sql
CREATE TABLE "attribute_sets" (
    "id" INTEGER, "attribute_set_id" INTEGER, "attribute_set_name" TEXT,
    PRIMARY KEY("id")
)
```

La llena **E-18**, así que E-19 depende de que E-18 haya corrido antes. En el orden del
legado, E-18 es el paso 6 y E-19 el paso 8.

### SQLite — `attribute_options` (lee)

```sql
CREATE TABLE "attribute_options" (
    "id" INTEGER, "attribute_id" INTEGER, "attribute_code" TEXT,
    "label" TEXT, "value" INTEGER,
    PRIMARY KEY("id" AUTOINCREMENT)
)
```

La llena **E-16**, paso 4. Segunda dependencia de orden.

> La consulta de comprobación usa `LIKE` sin comodines:
> `where attribute_code like '<code>'`. Con SQLite eso equivale a una igualdad
> **insensible a mayúsculas**, no a una búsqueda parcial. Se conserva.

### SQLite — `atributos_de_magento` (borra y escribe)

```sql
CREATE TABLE "atributos_de_magento" (
    "id" INTEGER, "nombre_set" TEXT, "atributo" TEXT, "valor_de_lista" TEXT,
    PRIMARY KEY("id" AUTOINCREMENT)
)
```

Ejemplo de filas reales:

| nombre_set | atributo | valor_de_lista |
|---|---|---|
| Default | alto_sin_empaque | no |
| Default | ancho_sin_empaque | no |
| Default | profundo_sin_empaque | no |

> 📌 El `CREATE TABLE` guardado en la base conserva la sangría rara del bloque comentado que
> hay en `Conn\Magento.cs:164-172`. La tabla se creó pegando ese comentario.

### 🔴 MySQL — `aplicaciones_web` en `172.16.202.29` (borra y escribe)

Segundo tramo, en `AttributeMethods.sendIntelisis()`:

| Tabla | Operación | De dónde sale |
|---|---|---|
| `atributosdemagento` | `TRUNCATE` + un `INSERT` con todas las filas | `SELECT * FROM atributos_de_magento` de SQLite |
| `atribmgtovalorlista` | `TRUNCATE` + un `INSERT` con todas las filas | `SELECT attribute_code, label FROM attribute_options` de SQLite |

Al volcar se aplica un parche de acentos: `" BANO"` → `" BAÑO"`, `" NINO"` → `" NIÑO"`,
`" NINA"` → `" NIÑA"`. **Deshace a mano lo que la normalización de E-16 y E-18 había quitado**
— aquélla convierte `\u00d1` en `N`.

> 🔴 **MySQL no está contemplado en la regla de destinos del 5-ago.** No es ninguna de las
> cuatro bases que se quedan (`ServicioAndroid`, `AdminDoc`, `SIGMAVI`, SQLite) ni figura
> entre las que necesitan equivalencia. **Decisión pendiente antes de cerrar la partida.**

### 🟠 IntelisisTmp en MAVICUBOS (ejecuta)

Tercer tramo:

```sql
exec SpWDM0285_AtributosdeMagento 'ActAtrib'
```

Sobre `sCadenaConexion` (`APIMagento\Conn\Connection.cs:26`). Prohibido escribir o probar
contra ese servidor mientras no haya equivalencia.

> ⚠️ **El SP no está en el repo `MaviSAP`.** Busqué `WDM0285` y `AtributosdeMagento` y no
> aparece, igual que pasó con `SpCodigoRecogeSucursal`. Hay que pedir su definición al DBA —
> conviene sumarlo al lote de las que ya están pendientes.

## Manejo de errores

**Ninguno propio.** El método no tiene `try/catch`: cualquier fallo sube al llamador. En el
legado eso es el `try` gigante de `product/updateProduct`, que devuelve `200` con el texto de
la excepción en el cuerpo.

Los dos tramos de la cola sí atrapan y registran con `Logger.ProductAttributes`, así que
**un fallo en MySQL o en el SP no interrumpe nada y tampoco se nota**: la ruta responde igual.

En ServicioSAP el disparador `catalog/attributeSetChildren` sí distingue: `500` con
`InternalServerError(ex)` y la causa en `sap.log`.

## Estado de la migración

| Tramo | Estado |
|---|---|
| 1 · SQLite `atributos_de_magento` | ✅ Portado y verificado contra el legado el 7-sep |
| 2 · MySQL `aplicaciones_web` | ⏸️ **Aparcado** hasta que termine la exportación de artículos |
| 3 · SP en IntelisisTmp | ⏸️ **Aparcado**, misma dependencia |

La ruta migrada deja la tabla de SQLite correcta; **lo que no hace es propagarla**.

> 📌 **Decisión del 7-sep (magalindo).** La migración de `SPexportaArt` **está incompleta**:
> la validación contra `TcWDM0285_AtributosdeMagento` y `TcWDM0285_AtribMgtoValorLista`
> todavía no está en `EcommerceMethods.cs`, no se quitó a propósito. Por eso **los tramos 2 y
> 3 no se dan de baja**: siguen haciendo falta y quedan pendientes hasta que se cierre el
> proceso de exportación de artículos, que es partida de Dev 2 (Sprint 9, 4-18 dic).
>
> Es decir: la pregunta sobre el destino de MySQL **no se responde todavía, se pospone**.
> Cuando la exportación esté completa habrá que decidir si esas dos tablas se quedan en
> Intelisis —imposible— o se reubican, con SIGMAVI como candidato natural por el precedente
> de `ListaNegra` y `CondicionesCredVtaLinea`.

## Verificación contra el legado — 7 sep 2026

Tres corridas, cada una con una lista de ignorados distinta, sobre el `data.db` del servidor
(referencia del 1-sep: **24 076 filas**).

| Corrida | `ignoreAttributes.txt` | Filas | Diferencia |
|---|---|---|---|
| 1 | vacío, 0 bytes | **72 706** | +48 630 |
| 2 | reconstruido, 110 atributos | **24 091** | +15 |
| 3 | **real del servidor, 114 atributos** | **24 092** | **+16** |

La corrida 3 es la que vale. Las 16 filas de diferencia son **un set completo** —
`BATERIAS PARA AUTO`, con sus 16 atributos — creado en Magento después del 1-sep, y **no se
perdió ninguna fila**. Es deriva de catálogo, no divergencia: **el tramo de SQLite está en
paridad**.

Las corridas 1 y 2 no son fallos del código migrado sino del archivo de filtro; se conservan
porque explican de dónde salió el problema.

> 🔴 **El filtro es todo.** Sin la lista, E-19 escribe **tres veces** las filas que debe: 163
> atributos por set en vez de 54. Los 114 que se filtran son atributos de sistema de Magento
> —`status`, `sku`, `name`, `image`, `price`, `meta_title`…— que no describen el producto.
> **El archivo tiene que viajar con el despliegue**, y si falta, `File.ReadAllText` lanza y la
> carga muere al arrancar.

## Hallazgos

✅ **`ignoreAttributes.txt` — resuelto el 7-sep.** El archivo de 0 bytes era la copia del
equipo de desarrollo, no la del servidor. El real tiene **114 atributos, 2 000 bytes**. En
ServicioSAP la ruta es configurable con `IGNORE_ATTRIBUTES_PATH`; **el archivo tiene que
viajar con el despliegue**.

> Se reconstruyó la lista restando los atributos de la corrida sin filtro contra los del
> `data.db` del servidor: **109 de 114 correctos**. Los 5 que faltaron
> —`credit_condition`, `credit_type_fee`, `credit_days_to_pay`, `sp_credit_price_pp`,
> `descuento`— están en la lista pero ya no existen en Magento, así que la resta no podía
> verlos. Y sobró uno, `capacidad_arranque_frio`, que es un atributo legítimo de un set
> creado después del 1-sep. El método sirve para diagnosticar, **no para reponer el archivo**.

🟡 **Dos dependencias de orden no declaradas.** E-19 lee lo que dejan E-16 y E-18. Si se
dispara suelto sobre una base vacía no falla: produce una tabla vacía o con todo en `no`, en
silencio. Al reubicar el llamador hay que **preservar el orden**, que hoy lo garantiza que
sea una sola llamada secuencial.

🟡 **El parche de acentos va y viene.** E-16 y E-18 convierten `Ñ` en `N` al normalizar, y el
tramo de MySQL lo revierte con tres `Replace` sobre cadenas concretas — `BANO`, `NINO`,
`NINA`. Cualquier otra palabra con eñe queda mal para siempre.

🟡 **La cirugía posicional del JSON** (pasos 1 y 2) depende de que la DMZ siga devolviendo el
array envuelto en comillas. No hay guarda.

🟡 **Un `INSERT` por fila, cada uno abriendo su propia conexión SQLite**, más una consulta de
comprobación por atributo. Con ~24 000 filas es el paso más lento de la ola.
