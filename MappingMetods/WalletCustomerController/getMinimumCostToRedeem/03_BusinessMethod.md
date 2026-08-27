# Mapeo del Método: `WalletCustomerMethods.GetMinimumCostToRedeem()` — Lógica de Negocio

**Endpoint:** `POST /customer/wallet/getMinimumCostToRedeem`
**Archivo:** `APIMagento/WebApiMagento/Metodos/WalletCustomerMethods.cs`
**Método:** `public MinimumCostToRedeemRequest GetMinimumCostToRedeem(MinimumCostToRedeemRequest minimumCostToRedeemRequest)` — Líneas **160–403**
**Auxiliar privado:** `private MinimumCostToRedeemRequest GetMontoMinimoByCanalAndFamilia(...)` — Líneas **405–473**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Calcular **cuánto monedero electrónico puede redimir el cliente sobre el carrito actual** (`montoMaximoRedimibleGlobal`), aplicando los umbrales mínimos y las restricciones por familia de artículo configurados por canal de venta en Intelisis. Se invoca desde el checkout, antes de permitir aplicar el monedero.

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `MinimumCostToRedeemRequest` — `APIMagento/WebApiMagento/Models/WalletCustomerRequest.cs` líneas **11–26**.

**El mismo objeto es request y response** (ver [[02_LAN_Controller]]). Solo 3 de sus 12 propiedades son de entrada real:

### Campos de entrada (los únicos que envía el consumidor)

| Campo | Tipo | Uso dentro del método |
|---|---|---|
| `uen` | int | `@UEN` contra `Ventascanalmavi.UEN`. 1 = MAVI, 2 = VIU (derivado en frontend por `store_id == 5`, `MonederoManagement.php:426`). **Sin validación de rango en ninguna capa.** |
| `categoria` | string | `@Categoria` contra `Ventascanalmavi.Categoria`. El frontend siempre envía `"CONTADO"` (`MonederoVentaContado/Model/Api/WalletManagement.php:48`, `recyclable.js:82`) |
| `articulos` | `List<Dictionary<string,string>>` | Renglones del carrito. Claves enviadas por el frontend: **`sku`, `cantidad`, `precio`, `descuento`** (`MAGENTO_WEB_ADOBE\app\code\Mavi\Monedero\Helper\Items.php:108–113`) |

> **Estructura de `articulos` sin tipar.** Es un diccionario `string→string`: montos, cantidades y SKUs viajan como texto y se convierten con `float.Parse` sin cultura invariante. Ver obs. 6.
>
> El frontend **explota cada renglón a unidades sueltas**: `cantidad` siempre es `"1"` y el descuento total del renglón se reparte entre las unidades, con la última absorbiendo el redondeo (`Items.php:98–116`). Un carrito con 3 televisores llega como 3 entradas independientes.

### Campos de salida (rellenados por el método, llegan siempre vacíos/`null`)

| Campo | Tipo | Significado |
|---|---|---|
| `montoMaximoRedimibleGlobal` | float | **El único valor que el frontend consume** (`MonederoManagement.php:462`) |
| `totalAlta` / `totalBloqueado` | float | Suma neta del carrito por estatus del artículo |
| `montoMinimoAlta` / `montoMinimoBloqueado` | float | Umbral leído de configuración |
| `familiaPermitidaAlta` / `familiaPermitidaBloqueado` | string | Lista de familias separadas por coma, o `"ALL"` |
| `familiaMontoMinimoAlta` / `familiaMontoMinimoBloqueado` | `Dictionary<string,float>` | Umbral por grupo de familias |

**El modelo espejo en DMZ solo declara 3 campos** (`APIMagentoDMZ/WebApiMagento/Models/WalletCustomerRequest.cs:14–19`) y trunca el resto al re-serializar. Ver [[01_DMZ_Controller]].

---

## Flujo de Ejecución Detallado

### Paso 0 — Inicialización (líneas 162–163)

```csharp
minimumCostToRedeemRequest.familiaMontoMinimoAlta = new Dictionary<string, float>();
minimumCostToRedeemRequest.familiaMontoMinimoBloqueado = new Dictionary<string, float>();
```

**Solo se inicializan los dos diccionarios.** Los strings `familiaPermitidaAlta` y `familiaPermitidaBloqueado` **quedan en `null`** si las consultas no devuelven filas. Esto es la causa raíz de la obs. 1.

**Conexión:** `new Connection()` → `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)* Se abren **tres conexiones secuenciales distintas** por request (líneas 168, 220, 425), ninguna con `using`.

---

### Paso 1 — Umbral y familias permitidas para artículos en **ALTA** (líneas 166–216)

```sql
SELECT ISNULL(NumeroA, 0) AS Monto, ISNULL(Nombre, 'ALL') AS Familia
FROM tablarangostd WITH(NOLOCK)
WHERE TablaRangoSt = 'MINIMO PARA REDIMIR MONEDERO'
  AND NumeroD = (SELECT ID FROM Ventascanalmavi WITH(NOLOCK)
                 WHERE UEN = @UEN AND Categoria = @Categoria AND ID in (2,3,6,7))
```

**➡️ RESPUESTA A LA PREGUNTA DE ORIGEN DEL UMBRAL: el mínimo NO está hardcodeado en C# ni sale de un SP — sale de la tabla de configuración `tablarangostd` de Intelisis (tabla de rangos estándar), parametrizada por canal de venta.** Pero:

| Elemento | ¿De dónde sale? |
|---|---|
| El **valor** del umbral (`NumeroA`) | ✅ Configuración: `tablarangostd` |
| Las **familias permitidas** (`Nombre`) | ✅ Configuración: `tablarangostd` |
| La **clave de catálogo** `'MINIMO PARA REDIMIR MONEDERO'` | 🔴 **Hardcodeada** en `WalletCustomerMethods.cs:172` |
| La **clave de catálogo** `'FAMILIAS ESTATUS BLOQUEADO REDIMEN MONEDERO'` | 🔴 **Hardcodeada** en `WalletCustomerMethods.cs:224` |
| El **filtro de canales** `ID in (2,3,6,7)` | 🔴 **Hardcodeado** en `WalletCustomerMethods.cs:176` y `:228` |
| El **centinela** `'ALL'` (familia comodín) | 🔴 **Hardcodeado**, tanto en el `ISNULL` SQL como en las comparaciones C# (líneas 271, 284, 312, 352, 358, 398) |
| Los **estatus** `'ALTA'` / `'BLOQUEADO'` | 🔴 **Hardcodeados** (líneas 276, 291, 319, 345, 365, 391, 462, 464) — son valores de `Art.Estatus` de Intelisis |

**Conclusión para la migración (Regla #7): el umbral es configurable, pero está anclado a cuatro literales de negocio embebidos en el código C#.** Cualquier renombre en el catálogo de Intelisis o alta de un canal nuevo fuera de `(2,3,6,7)` rompe el cálculo **en silencio** (sin filas → umbral 0 → ver obs. 1).

**Parámetros:** `@Categoria` (`VarChar`) y `@UEN` (`Int`), **correctamente parametrizados** (líneas 178–187). Sin riesgo de inyección aquí.

**Lectura (líneas 195–206):**
```csharp
while (sqlDataReader.Read())
{
    minimumCostToRedeemRequest.familiaMontoMinimoAlta.Add(
        sqlDataReader["Familia"].ToString().Replace(", ", ","),
        float.Parse(sqlDataReader["monto"].ToString()));
    minimumCostToRedeemRequest.montoMinimoAlta = float.Parse(sqlDataReader["monto"].ToString());
    minimumCostToRedeemRequest.familiaPermitidaAlta =
        sqlDataReader["Familia"].ToString().Replace(", ", ",").Replace("\r\n", "");
}
```
- El diccionario acumula **una entrada por fila**: `clave = lista de familias`, `valor = umbral`.
- `montoMinimoAlta` y `familiaPermitidaAlta` se **sobrescriben en cada iteración** → **gana la última fila**, en orden no determinista (sin `ORDER BY`). Si hay más de una fila configurada, cuál se usa como "umbral global" es aleatorio.
- **🔴 Normalización inconsistente:** la **clave del diccionario** aplica `.Replace(", ", ",")` pero **NO** `.Replace("\r\n", "")`; `familiaPermitidaAlta` aplica **ambos**. Si el campo `Nombre` de `tablarangostd` contiene saltos de línea (habitual al capturarlo desde la UI de Intelisis), las dos rutas del algoritmo ven **strings distintos** y producen resultados distintos. Ver obs. 5.
- `Dictionary.Add` (no indexador): **dos filas con el mismo `Nombre` normalizado lanzan `ArgumentException`** → capturada por el `catch` → se pierde el resto de la configuración.
- `CommandTimeout = 9999999` (~115 días). Sin timeout efectivo.
- Sin `using`; el reader nunca se cierra; el `Close()` de la conexión (líneas 208–211) queda **después** del punto de falla.

**`catch` (líneas 213–216):** `Logger.CustomerService("ERROR ", JsonConvert.SerializeObject(e))` — serializa la **excepción completa** al log de otro módulo (`C:\inetpub\wwwroot\log\customerService.log`, `Helper/Logger.cs:134–136`). **Y el flujo continúa como si nada**, con el diccionario vacío y `familiaPermitidaAlta == null`.

---

### Paso 2 — Umbral y familias para artículos **BLOQUEADO** (líneas 218–268)

Bloque **idéntico** al Paso 1, copy-paste, cambiando únicamente:
- `TablaRangoSt = 'FAMILIAS ESTATUS BLOQUEADO REDIMEN MONEDERO'`
- destino: `familiaMontoMinimoBloqueado`, `montoMinimoBloqueado`, `familiaPermitidaBloqueado`

Diferencia menor pero reveladora: la línea 255 lee `sqlDataReader["Monto"]` (mayúscula) mientras la 252 lee `sqlDataReader["monto"]` (minúscula). Funciona por casualidad — el indexador de `SqlDataReader` es case-insensitive.

> **`BLOQUEADO` es el estatus de Intelisis para artículos descontinuados / sin reposición.** Que exista una configuración *separada* para ellos implica una regla de negocio explícita: se permite redimir monedero sobre descontinuados, pero con umbral y catálogo de familias propios. Esta regla debe preservarse en SAP.

---

### Paso 3 — Enriquecimiento del carrito desde `Art` (línea 269 → método 405–473)

`GetMontoMinimoByCanalAndFamilia(...)`:

1. **Construye la lista de SKUs por concatenación** (líneas 410–420):
   ```csharp
   skus += "'" + articulo["sku"] + "'";   // o ",'" + ... + "'"
   ```
2. **🔴 Consulta con `string.Format` — INYECCIÓN SQL** (línea 426):
   ```csharp
   string query = string.Format(
       @"SELECT Articulo,Familia,Estatus FROM Art WITH(NOLOCK) WHERE Articulo in ({0}) ORDER BY Estatus ASC", skus);
   ```
   Los SKUs vienen del body del request, **sin sanitizar**. Un SKU como `x') OR 1=1--` altera la consulta. Misma vulnerabilidad que en [[getCuentaC]], en el mismo archivo.
   > Si `articulos` viene vacío, `skus` queda `""` → `WHERE Articulo in ()` → error de sintaxis SQL → capturado y logueado → se continúa con totales en 0.

3. **Bucle O(n·m)** (líneas 434–445): por cada fila devuelta recorre **toda** la lista de artículos buscando el SKU. Con 3 renglones son 9 comparaciones; con un carrito de 40 unidades, 1 600.
4. Inyecta en cada artículo las claves **`familia`**, **`estatus`** y **`procesado` = `"FALSE"`** (líneas 440–442).
   **🔴 Solo si el SKU existe en `Art`.** Un SKU del carrito que no esté en el maestro de Intelisis se queda **sin esas tres claves** → todos los accesos posteriores `articulo["estatus"]`, `["familia"]`, `["procesado"]` lanzan `KeyNotFoundException`. Ver obs. 2.
5. **Suma los totales netos por estatus** (líneas 453–466):
   ```csharp
   float totalNeto = Math.Max((precio * cantidad) - descuento, 0);
   if (articulo["estatus"] == "ALTA")            totalAlta      += totalNeto;
   else if (articulo["estatus"] == "BLOQUEADO")  totalBloqueado += totalNeto;
   ```
   Aquí `descuento` **sí** está protegido con `ContainsKey` (líneas 457–459) — **la única de las nueve lecturas de `descuento` en todo el flujo que lo está**. Las otras ocho (líneas 279, 293, 323, 326, 331, 347, 369, 377, 393) usan el indexador directo.
   Artículos con cualquier otro `Estatus` (p. ej. `BAJA`) **no suman a ningún total**: quedan fuera del cálculo sin aviso.

---

### Paso 4 — Filtro por familia permitida (líneas 271–296)

```csharp
if (minimumCostToRedeemRequest.familiaPermitidaAlta != "ALL")
{
    string[] familiaPermitidaAlta = minimumCostToRedeemRequest.familiaPermitidaAlta.Split(',');
    foreach (Dictionary<string, string> articulo in minimumCostToRedeemRequest.articulos)
    {
        if (articulo["estatus"].Equals("ALTA"))
        {
            if (!familiaPermitidaAlta.Contains(articulo["familia"]))
                minimumCostToRedeemRequest.totalAlta -=
                    (float.Parse(articulo["precio"]) * float.Parse(articulo["cantidad"])) - float.Parse(articulo["descuento"]);
        }
    }
}
```

Descuenta del total los artículos cuya familia **no** está en la lista permitida. Bloque replicado tal cual para `BLOQUEADO` (líneas 284–296).

**🔴 Cuando `familiaPermitidaAlta` es `null` (configuración ausente), `null != "ALL"` es `true` y la línea 273 ejecuta `null.Split(',')` → `NullReferenceException` sin `try/catch`.** Ver obs. 1.

Nota de precisión: aquí se usa `Array.Contains` (igualdad exacta), mientras que el Paso 6 usa `string.Contains` (subcadena). **Dos criterios de pertenencia distintos para el mismo concepto** dentro del mismo método.

---

### Paso 5 — Cálculo simple (líneas 298–305)

```csharp
float totalAlta = minimumCostToRedeemRequest.totalAlta;
float totalBloqueado = minimumCostToRedeemRequest.totalBloqueado;
if (montoMinimoAlta > 0 && totalAlta < montoMinimoAlta)             totalAlta = 0;
if (montoMinimoBloqueado > 0 && totalBloqueado < montoMinimoBloqueado) totalBloqueado = 0;
minimumCostToRedeemRequest.montoMaximoRedimibleGlobal = totalBloqueado + totalAlta;
```

**Regla de negocio:** si el subtotal elegible no alcanza el umbral, **no se puede redimir nada** de ese grupo (todo o nada, no proporcional). Si `montoMinimo == 0` (o no se configuró), **no hay umbral** y todo el subtotal es redimible.

---

### Paso 6 — Recálculo por familia (líneas 307–400) — solo si hay **más de un** grupo configurado

```csharp
if (familiaMontoMinimoAlta.Count > 1 || familiaMontoMinimoBloqueado.Count > 1)
{
    minimumCostToRedeemRequest.montoMaximoRedimibleGlobal = 0;   // ← descarta el Paso 5
    ...
}
```

**El resultado del Paso 5 se tira a la basura** y se recalcula desde cero. Por cada grupo de familias del diccionario (saltando la clave `"ALL"`):

1. Acumula `totalPorFamilia` con los artículos cuya familia "pertenece" al grupo, marcándolos `procesado = "TRUE1"`.
2. Si `totalPorFamilia >= umbral del grupo`, lo suma a `montoMaximoRedimibleGlobal` (líneas 336–339). **Este es el único camino por el que realmente se acumula.**
3. Al final, los artículos que quedaron con `procesado == "FALSE"` (ninguna familia los reclamó) se suman en `totalGeneral` y solo entran si existe la clave `"ALL"` y `totalGeneral` alcanza su umbral (líneas 342–353).

Bloque duplicado íntegro para `BLOQUEADO` (líneas 356–399).

**🔴 Rama muerta dentro del bucle** (líneas 326–333):
```csharp
if (familia.Key.Contains(producto["familia"]))
{
    totalPorFamilia += ...;
    producto["procesado"] = "TRUE1";        // ← siempre se ejecuta primero
}
if (familia.Key.Contains(producto["familia"]) && (...) >= familia.Value)
{
    if (producto["procesado"] == "TRUE1")
        totalPorFamiliaGlobal = minimumCostToRedeemRequest.montoMaximoRedimibleGlobal;  // variable local nunca leída
    else
        minimumCostToRedeemRequest.montoMaximoRedimibleGlobal += ...;                   // INALCANZABLE
    producto["procesado"] = "TRUE";
}
```
La segunda condición **implica** la primera, que ya puso `procesado = "TRUE1"`. Por tanto la rama `else` **nunca se ejecuta** y `totalPorFamiliaGlobal` es una variable **asignada y jamás leída** (declarada en 316 y 362). El bloque completo se reduce, funcionalmente, a `producto["procesado"] = "TRUE"`. **Alguien intentó implementar una regla "por artículo individual" y quedó inerte.**

**🔴 `familia.Key.Contains(producto["familia"])` es una comparación de subcadena, no de pertenencia a lista.** Si el grupo configurado es `"SALAS,COMEDORES"` y un artículo es de familia `"SALA"`, `Contains("SALA")` devuelve **`true`** — el artículo se cuela en un grupo al que no pertenece. Debería ser `familia.Key.Split(',').Contains(producto["familia"])`, como sí se hace en el Paso 4.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `tablarangostd` | N/A (Inline SQL) | Select | `TablaRangoSt` (= `'MINIMO PARA REDIMIR MONEDERO'`), `NumeroD` (subconsulta), `NumeroA` → `Monto`, `Nombre` → `Familia` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `tablarangostd` | N/A (Inline SQL) | Select | `TablaRangoSt` (= `'FAMILIAS ESTATUS BLOQUEADO REDIMEN MONEDERO'`), `NumeroD`, `NumeroA`, `Nombre` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Ventascanalmavi` | N/A (Inline SQL) | Select | `ID` (proyectado; `IN (2,3,6,7)` hardcodeado), `UEN` (= `@UEN`), `Categoria` (= `@Categoria`) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Art` | N/A (Inline SQL) | Select | `Articulo` (filtro `IN` **concatenado — inyección SQL**), `Familia`, `Estatus` |

**Tres conexiones y tres queries por request.** Todas de **lectura**. **Sin Stored Procedures. Sin servicios externos.** Todas con `WITH(NOLOCK)`.

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** — **HTTP 200**. El objeto completo, con los `articulos` enriquecidos:
```json
{
  "uen": 1,
  "categoria": "CONTADO",
  "montoMaximoRedimibleGlobal": 12499.0,
  "totalAlta": 12499.0,
  "totalBloqueado": 0.0,
  "montoMinimoAlta": 4999.0,
  "montoMinimoBloqueado": 0.0,
  "familiaPermitidaAlta": "SALAS,COMEDORES,RECAMARAS",
  "familiaPermitidaBloqueado": null,
  "familiaMontoMinimoAlta": { "SALAS,COMEDORES,RECAMARAS": 4999.0 },
  "familiaMontoMinimoBloqueado": {},
  "articulos": [
    { "sku": "1234567", "cantidad": "1", "precio": "12499.0000", "descuento": "0.0000",
      "familia": "SALAS", "estatus": "ALTA", "procesado": "FALSE" }
  ]
}
```
El frontend **solo lee `montoMaximoRedimibleGlobal`** (`MonederoManagement.php:462`) y descarta el resto. Los campos `familia`, `estatus` y `procesado` son estado interno filtrado al exterior.

**Caso "no alcanza el umbral"** — **HTTP 200**, idéntico salvo:
```json
{ "montoMaximoRedimibleGlobal": 0.0, "totalAlta": 1899.0, "montoMinimoAlta": 4999.0 }
```
Correcto funcionalmente, pero **indistinguible** del caso de error silencioso siguiente.

**Caso configuración ausente para `(uen, categoria)`** — **HTTP 500** en LAN → **HTTP 400** en DMZ:
```json
"Error al obtener el monto mínimo para redimir."
```
`familiaPermitidaAlta == null` → `NullReferenceException` en la línea 273, **sin `try/catch` en ninguna capa** ([[02_LAN_Controller]] obs. 1). El `catch` de la DMZ lo convierte en un 400 genérico. Magento lo traduce a `{ "message": "Ha ocurrido un error de conexion…", "value": 0, "status": "500" }` (`MonederoManagement.php:478–483`) y **el checkout deshabilita el monedero**.

**Caso SKU inexistente en `Art`** — **HTTP 500** en LAN → **HTTP 400** en DMZ:
`KeyNotFoundException` al leer `articulo["estatus"]` (línea 276) o `producto["procesado"]` (línea 345).

**Caso fallo de BD en las consultas de configuración** — **HTTP 200 con un valor incorrecto**:
```json
{ "montoMaximoRedimibleGlobal": 12499.0, "montoMinimoAlta": 0.0, "familiaPermitidaAlta": null }
```
⚠️ **Peor desenlace de todos.** Si la excepción ocurre **antes** de asignar `familiaPermitidaAlta` pero el objeto sobrevive… en realidad `familiaPermitidaAlta` sigue `null` y el flujo revienta en el Paso 4. Pero si `familiaPermitidaAlta` **sí** alcanzó a asignarse en una iteración previa al fallo, el método continúa con `montoMinimoAlta = 0` → **sin umbral** → **devuelve el carrito completo como redimible**. Error de configuración → cliente redime más monedero del permitido, con HTTP 200 y sin alerta. **Impacto monetario directo.**

> **Cinco desenlaces. Solo dos códigos HTTP distintos (200 y 400). El más peligroso es un 200.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **🔴 `NullReferenceException` garantizada cuando falta configuración (`WalletCustomerMethods.cs:271–273`).** `familiaPermitidaAlta` **nunca se inicializa** (el Paso 0 solo inicializa los diccionarios) y el modelo DMZ **no puede** enviarla porque no la declara ([[01_DMZ_Controller]]). Si la consulta del Paso 1 no devuelve filas — porque no existe fila en `tablarangostd` para esa combinación `(UEN, Categoria)`, o porque la subconsulta a `Ventascanalmavi` no resuelve — se ejecuta `null.Split(',')`. Sin `try/catch` en negocio (el bloque 271–402 está fuera de todo `try`) ni en el controller LAN → **HTTP 500**. **Es el defecto más probable de encontrar en producción**, y basta con dar de alta un canal de venta nuevo fuera de `ID IN (2,3,6,7)` para provocarlo. Mismo defecto en la línea 286 para `familiaPermitidaBloqueado`.

2. **🔴 `KeyNotFoundException` si un SKU del carrito no existe en `Art`.** `GetMontoMinimoByCanalAndFamilia` solo inyecta `familia` / `estatus` / `procesado` para los SKUs que la consulta a `Art` devuelve (líneas 438–443). Cualquier SKU ausente del maestro (producto virtual, garantía extendida mal filtrada, artículo de otra empresa) hace estallar las líneas 276, 278, 319, 321, 345, 365, 367 o 391 → **HTTP 500**. Debe usarse `TryGetValue` con defaults explícitos.

3. **🔴 Inyección SQL en la consulta a `Art` (`WalletCustomerMethods.cs:410–426`).** Los SKUs del body se concatenan sin sanitizar dentro de un `IN (...)`. Mismo antipatrón que [[getCuentaC]] (`:132`) y `GetSerieMonedero` (`:69–70`) — **tres inyecciones en un archivo de 477 líneas**, conviviendo con consultas correctamente parametrizadas (`:178–187`, `:230–239`). Corrección obligatoria e independiente de la migración.

4. **🔴 Un fallo de BD produce HTTP 200 con un umbral incorrecto.** Los dos `catch` de configuración (líneas 213–216 y 265–268) **solo loguean y continúan**. Con `montoMinimoAlta = 0`, el Paso 5 no aplica ningún umbral y devuelve el carrito completo como redimible. **El error de infraestructura se convierte en una pérdida monetaria silenciosa.** Debe fallar cerrado (devolver 0 o un error explícito), no abierto.

5. **🔴 Normalización inconsistente de las familias (`:200` vs `:204`, `:252` vs `:256`).** La clave del diccionario aplica `.Replace(", ", ",")`; `familiaPermitida*` aplica además `.Replace("\r\n", "")`. Con datos que contengan saltos de línea (frecuentes al capturar desde la UI de Intelisis), el Paso 4 y el Paso 6 operan sobre strings distintos y producen resultados divergentes para la **misma** configuración.

6. **`float.Parse` sin `CultureInfo.InvariantCulture`** en 15 lugares (líneas 201, 203, 253, 255, 279, 293, 323, 326, 331, 347, 369, 372, 377, 393, 455–458). El resultado depende de la cultura del hilo de IIS: en `es-MX` la coma es separador decimal y `"12499.5000"` se interpretaría como `124995`. Es una **bomba de tiempo de configuración de servidor**. Además, `float` (32 bits, ~7 dígitos significativos) es inadecuado para importes monetarios — debe ser `decimal`.

7. **`familia.Key.Contains(...)` es coincidencia de subcadena, no de pertenencia (líneas 321, 326, 367, 372).** `"SALAS,COMEDORES".Contains("SALA")` → `true`. Un artículo puede acreditarse a un grupo al que no pertenece e inflar `montoMaximoRedimibleGlobal`. **Bug de negocio con impacto monetario.** El Paso 4 (línea 278) hace lo correcto (`Array.Contains` sobre el `Split`) — dos criterios distintos en el mismo método.

8. **Código muerto: la rama por artículo individual nunca se ejecuta (líneas 326–333 y 372–379).** La condición `producto["procesado"] == "TRUE1"` es siempre verdadera en ese punto, por lo que el `else` que suma al total es **inalcanzable** y `totalPorFamiliaGlobal` (líneas 316, 362) se asigna y **nunca se lee**. Hay una regla de negocio que alguien quiso implementar y que **hoy no hace nada**. **Requiere definición: ¿debía existir esa regla?** (Regla #10 — no se asume.)

9. **El Paso 6 descarta el resultado del Paso 5** (línea 309: `montoMaximoRedimibleGlobal = 0`). Dos algoritmos completos y mutuamente excluyentes, seleccionados por `Count > 1` en un diccionario poblado desde BD. La lógica efectiva del endpoint **cambia según cuántas filas tenga `tablarangostd`** — un cambio de configuración altera el algoritmo, no solo sus parámetros. **Debe unificarse en un único algoritmo antes de migrar.**

10. **Duplicación masiva por copy-paste.** Paso 1 ≡ Paso 2 (50 líneas), y el bloque ALTA ≡ bloque BLOQUEADO del Paso 6 (45 líneas). ~95 de las 244 líneas del método son duplicado literal con dos identificadores cambiados. La divergencia `["monto"]` / `["Monto"]` (líneas 201 vs 255) evidencia que ya empezaron a desincronizarse.

11. **`Dictionary.Add` en vez del indexador (líneas 199, 251).** Dos filas de configuración con el mismo `Nombre` normalizado lanzan `ArgumentException`, capturada por el `catch`, que **descarta silenciosamente el resto de la configuración**.

12. **Subconsulta escalar sin garantía de unicidad (líneas 173–176, 225–228).** `NumeroD = (SELECT ID FROM Ventascanalmavi WHERE UEN=@UEN AND Categoria=@Categoria AND ID IN (2,3,6,7))`. Si la combinación `(UEN, Categoria)` matchea más de uno de esos cuatro IDs, SQL Server lanza *"Subquery returned more than 1 value"* → `catch` → configuración vacía → obs. 1. **No hay `TOP 1` ni `IN` en lugar de `=`.** El filtro `ID IN (2,3,6,7)` es un catálogo de canales hardcodeado que hoy garantiza la unicidad por convención, no por diseño.

13. **`CommandTimeout = 9999999`** (~115 días) en las dos consultas de configuración (líneas 191, 243). Sin timeout efectivo. La tercera consulta (a `Art`, línea 428) no fija ninguno y usa el default de 30 s — inconsistencia dentro del mismo flujo.

14. **Sin `using` en ninguna de las tres conexiones** (líneas 168, 220, 425). Ningún `SqlDataReader` se cierra. Los `Close()` (208–211, 260–263, 448–451) están dentro del `try`, después del punto de falla.

15. **`WITH(NOLOCK)` en las cuatro consultas.** Lectura sucia sobre catálogos de configuración y sobre el maestro de artículos. En catálogos el riesgo es bajo, pero debe documentarse.

16. **El DTO de entrada es el DTO de salida** (ver [[02_LAN_Controller]]). Filtra `familia`, `estatus` y `procesado` — estado interno del algoritmo — al consumidor. Deben separarse request y response tipados.

17. **Rendimiento: bucle O(n·m) sobre el carrito** (líneas 434–445), tres round-trips SQL secuenciales, y todo **síncrono**, en el camino crítico del checkout. El frontend además lo llama con un `setTimeout` de 1 000 ms (`recyclable.js:75`) — un retardo empírico para evitar una condición de carrera, síntoma de latencia real. Migrar a `async/await` (Regla #12) y consolidar las tres consultas.

18. **Trazabilidad parcial y mal ubicada (Regla #8).** Solo hay logs en los `catch`, escritos a `customerService.log` (`Logger.CustomerService`) — el log de **otro módulo**. No existe `Logger.Wallet`. No se registra el request ni el `montoMaximoRedimibleGlobal` calculado, **el dato con impacto monetario**. Además, `JsonConvert.SerializeObject(e)` (líneas 215, 267) vuelca el objeto excepción completo, incluidos posibles fragmentos de la consulta.

19. **Artículos con `Art.Estatus` distinto de `ALTA`/`BLOQUEADO` se ignoran** (líneas 462–465) sin sumar a ningún total ni generar aviso. Si Intelisis introduce un estatus nuevo, esos renglones dejan de ser redimibles en silencio.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

**Regla #10 (Cero Suposiciones): no se asigna ningún servicio OData ni tabla SAP en este documento.**

**Las fuentes maestras se contradicen sobre el estado y el destino de este endpoint:**

| Fuente | Clasificación asignada |
|---|---|
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 113) | Destino: **`(covered by) customer/wallet/details`** · `POST` · `SAP (SD18)` · **`In Progress`** · commit `b416730` · nota: *"Wallet data available from SAP; threshold logic not yet exposed as its own route."* |
| `_ANALISIS_PREVIO/DMZ-Backlog-Migracion-SAP.md` (línea 217) | **❌ FALTA** — origen `Intelisis (por canal y familia)`; propone endpoint nuevo **`POST customer/wallet/minimum-redeem`** |
| `_ANALISIS_PREVIO/DMZ-Backlog-Migracion-SAP.md` (línea 324) | Listado en el backlog de trabajo pendiente, ítem 15, junto a `getCuentaC` |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` | **Sin fila.** (Su hermano `getCuentaC` sí está, línea 90) |
| `_EXCLUIDOS_Intelisis.md` | **Sin fila.** No está marcado fuera de alcance |
| `_INVENTARIO_NoIntelisis.csv` | **Sin fila** |
| `_GLOBAL_MASTER_DB.csv` | **Sin fila** para `WalletCustomerController` |
| `MIGRATION_STATUS_MASTER_v3.csv` | **No existe en el share** (`MappingMetods/` solo tiene `_v2`). La copia local del repo lo tiene con el mismo contenido para esta línea |

**El conflicto documental es sustantivo, no de forma:**

- El **master v2 lo da por cubierto** por `customer/wallet/details` (ya migrado a SD18 `ZAPI_CONDITIONCONTRACT_SRV`, `MIGRATION_STATUS_MASTER_v2.csv:111`) y lo marca `In Progress`.
- El **backlog de análisis previo lo declara faltante** y propone una ruta propia.
- **Ninguna de las dos posturas es sostenible con el código a la vista:** `customer/wallet/details` devuelve `{ monedero, titular, saldo }` (`WalletCustomerController.cs:30–36` LAN) — el **saldo** del monedero. Este endpoint no consulta saldo alguno: calcula un **umbral de elegibilidad sobre el carrito** a partir de `tablarangostd`, `Ventascanalmavi` y `Art`. **Son datos disjuntos.** La propia nota del master lo admite: *"threshold logic not yet exposed as its own route"*.
- Es decir: el master está marcando como "cubierto" algo que él mismo describe como no expuesto. **Conflicto documental abierto que debe cerrarse antes de programar.**

Adicionalmente, el destino real de este endpoint **no es un problema de "qué API SAP consumir"**: el 100 % de sus datos vive en **catálogos de configuración propios de MAVI** (`tablarangostd`, `Ventascanalmavi`) más el maestro de artículos (`Art`). Aplica la **Regla #1**: hay que decidir si esos catálogos migran a `SigMavi` como persistencia local, si se modelan como condiciones en SAP, o si permanecen en Intelisis durante la convivencia. **Ninguna de las tres opciones está documentada.**

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción documental:** ¿este endpoint está *cubierto por* `customer/wallet/details` (master v2 línea 113) o requiere ruta propia `POST customer/wallet/minimum-redeem` (backlog línea 217)? El código demuestra que los datos son disjuntos; la clasificación del master parece incorrecta y debe corregirse formalmente. **Es la primera decisión; todo lo demás depende de ella.**
2. **Destino de los catálogos de configuración `tablarangostd` (claves `MINIMO PARA REDIMIR MONEDERO` y `FAMILIAS ESTATUS BLOQUEADO REDIMEN MONEDERO`) y `Ventascanalmavi`.** ¿Migran a `SigMavi`, se modelan como registros de condición en SAP, o se quedan en Intelisis? **Sin esta respuesta el endpoint no se puede migrar**, porque toda su lógica es una lectura de esos catálogos. (Regla #1)
3. **¿Dónde vive el algoritmo de cálculo?** Las 244 líneas del método son **regla de negocio pura de MAVI** (umbral todo-o-nada, agrupación por familia, distinción ALTA/BLOQUEADO), no una consulta. ¿Se reimplementa en C# en ServicioSAP, se traslada a ABAP, o se resuelve con condiciones estándar de SD?
4. **Unificar los dos algoritmos (obs. 9).** Antes de reimplementar hay que decidir cuál es el correcto: el del Paso 5 (simple) o el del Paso 6 (por familia). Hoy se elige por el número de filas en `tablarangostd`, lo cual no es un criterio de negocio defendible.
5. **¿La regla "por artículo individual" del código muerto (obs. 8) debía existir?** Está escrita pero inalcanzable. Si era intencional, hay una regla de negocio **que nunca se ha aplicado en producción** y cuya activación cambiaría los montos redimibles. Confirmar con el área usuaria antes de replicar o descartar.
6. **Criterio de desempate cuando `tablarangostd` devuelve varias filas** (obs. 5 del Paso 1): hoy `montoMinimoAlta` es la última fila leída, en orden no determinista. ¿Cuál es el umbral global correcto — el mayor, el menor, el de la familia `ALL`?
7. **Semántica de `Art.Estatus` en SAP.** `ALTA` / `BLOQUEADO` son estatus de artículo de Intelisis con tratamiento de monedero diferenciado. ¿Cuál es el equivalente en el maestro de materiales de SAP y se preserva la distinción de umbrales? El catálogo de equivalencias **no está definido** en `Resources/`.
8. **Correcciones inmediatas, sin esperar a la migración:** el `NullReferenceException` (obs. 1), la `KeyNotFoundException` (obs. 2), la inyección SQL (obs. 3) y el fallo-abierto ante error de BD (obs. 4) son defectos **vivos hoy en producción**, con impacto monetario directo. Deben parchearse en la rama actual.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el 1 (conflicto de clasificación) y el 2 (destino de los catálogos), que bloquean todo lo demás. El punto 8 es independiente y debe atenderse en paralelo.

---

## Referencias cruzadas

- **Capas de este mismo flujo:** [[01_DMZ_Controller]] · [[02_LAN_Controller]] · [[03_BusinessMethod_DB.csv]]
- **Método auxiliar privado:** `GetMontoMinimoByCanalAndFamilia` (`WalletCustomerMethods.cs:405–473`) — enriquece el carrito desde `Art` y calcula `totalAlta` / `totalBloqueado`. Contiene la inyección SQL de la obs. 3.
- **Endpoints hermanos del controlador:**
  - [[details]] — `POST customer/wallet/details` (`WalletCustomerController.cs:15–37` LAN / `14–49` DMZ). **Único ya migrado a SAP** (SD18, `curl.PostSAP` en DMZ línea 39). El master v2 pretende que este endpoint queda "cubierto" por él — ver §Destino SAP.
  - [[getCuentaC]] — `POST customer/wallet/getCuentaC/{idEcommerce}` (`WalletCustomerController.cs:39–46` LAN). **Roto extremo a extremo (G-06)** y con la misma inyección SQL por `string.Format`.
- **Métodos hermanos en `WalletCustomerMethods.cs`:**
  - `GetWalletCustomerDetails` (líneas **18–59**) — devuelve el nombre del titular; `e.Message` como payload y `Logger` comentado (línea 54).
  - `GetSerieMonedero` (líneas **61–123**) — resuelve la serie del monedero desde `Cte.SerieMonedero` / `Cte.SerieMonederoVIU`; si no existe invoca el SP [[SP_MAVIDM0173RedimeOGeneraMONE]] (línea 101). **El fuente de ese SP no está disponible en `SPsOrden/`** (listado como faltante en la espec §5) y **no se analiza su lógica** (Regla #5). Tiene además inyección SQL (líneas 69–70) y una **llamada recursiva sin condición de corte visible** (línea 114).
- **SPs de monedero existentes en `SPsOrden/` — NO invocados por este endpoint:**
  - [[xpVerificarMovMonederoMAVI]] (`SPsOrden/xpVerificarMovMonederoMAVI.sql`) — invocado desde `OrderMethods.cs:1440`.
  - [[spGenerarMovMonederoMAVI]] (`SPsOrden/spGenerarMovMonederoMAVI.sql`) — invocado desde `OrderMethods.cs:1494`.
  > **Este endpoint no ejecuta ningún Stored Procedure.** Ambos SPs pertenecen a `OrderMethods.GenerarMonedero` (`OrderMethods.cs:1406–1514`), del flujo de `OrdersController`. **Su lógica no se disecciona aquí para no atribuirla al endpoint equivocado** (Regla #5); corresponde documentarla en el mapeo de `setOrder`. La relación es de **secuencia de negocio**, no de invocación: `getMinimumCostToRedeem` decide *cuánto puede redimirse* **antes** de la compra; `xpVerificarMovMonederoMAVI` → `SP_DM0312TarjetaSerieMovMAVI` (`OrderMethods.cs:1464`) → `spGenerarMovMonederoMAVI` generan y afectan el movimiento de monedero **después**, al confirmarse el pedido. **Migrar uno sin el otro deja el ciclo del monedero partido a la mitad.**
- **Solapamiento con el flujo de unificación de monedero (`CreditController`):**
  - [[CheckAccountsPreUnification]] (`CreditController.cs:506–516` → `CreditMethods.cs:1665–1671`) — valida que ambas cuentas pertenezcan a la categoría `"CREDITO MENUDEO"` vía `AccountType` (`CreditMethods.cs:1719–1729`).
  - [[SetUnificationWalletData]] (`CreditController.cs:524–534` → `CreditMethods.InsertUnificationWallet`, `CreditMethods.cs:1678–1709`) — inserta en [[CREDIHUnificacionMonedero]]; valida serie de monedero con `ClienteTieneSerieMonedero`.
  - [[GetUnificationWalletStatus]] (`CreditController.cs:489–496` → `CreditMethods.cs:1644–1663`) — consulta el estatus de unificación por `IdEcommerce`.
  - **Solapamiento concreto y accionable:** ambos flujos dependen del **mismo catálogo de canal de venta**. Este endpoint filtra `Ventascanalmavi WHERE UEN=@UEN AND Categoria=@Categoria AND ID IN (2,3,6,7)` (`WalletCustomerMethods.cs:173–176`); la unificación filtra `CteEnviarA.ID IN (3, 76)` para UEN 1 e `IN (7)` para UEN 2, con `Categoria` en `{"CONTADO", "CREDITO MENUDEO"}` (`CreditMethods.cs:1723–1728`). **Son dos listas de IDs de canal hardcodeadas, distintas y sin fuente común**, gobernando el mismo dominio (monedero por canal/UEN). Además, ambos derivan la UEN por reglas distintas: aquí llega en el request desde `store_id == 5`; allá se deriva del **primer carácter del `IdEcommerce`** (`CreditMethods.cs:1667`, `:1680`). **En la migración deben consolidarse en un único catálogo de canal y una única regla de derivación de UEN** — es probablemente el hallazgo transversal más importante del módulo de monedero.
  - Nota de alcance: los tres endpoints de unificación están marcados **🔒 FUERA DE ALCANCE** en `_EXCLUIDOS_Intelisis.md` (líneas 68, 69, 71), pero **sí** tienen destino asignado en `_GLOBAL_MASTER_DB.csv` (líneas 18–25: `Por Definir` / `OData Monedero` / `SAP BP`). **Es el mismo tipo de conflicto documental que afecta a este endpoint** y conviene resolverlos en la misma sesión.
- **Otros consumidores de `Ventascanalmavi`:** el SP `SPCXCSaldosClientesPendiente` (Fase 3) lo usa para resolver `Categoria` — ver [[getClienteSaldo]].
- **Inventario de alcance:** [[MIGRATION_STATUS_MASTER_v2]] · [[DMZ-Backlog-Migracion-SAP]] · [[_EXCLUIDOS_Intelisis]] · [[_GLOBAL_MASTER_DB]]
- **Frontend (consumidor identificado — cadena completa):**
  - `MAGENTO_WEB_ADOBE\app\code\Mavi\Monedero\etc\webapi.xml:64–65` y `:70–71` — expone `POST /V1/mavi-monedero/customer/getMinimumCostToRedeem` (y variante guest `:cartId`).
  - `…\Monedero\Model\MonederoManagement.php:422–487` (`getMinimumCostToRedeem`) y `:494–559` (`getMinimumCostToRedeemByCart`) — arman el body `{ uen, categoria, articulos }` (líneas 429–433 / 501–505) y **solo leen `montoMaximoRedimibleGlobal`** de la respuesta (líneas 462 / 534).
  - `…\Monedero\Helper\Items.php:37–120` (`getItemsWithoutWarranty`) — construye `articulos` con las claves `sku`, `cantidad` (siempre `"1"`), `precio` y `descuento` (líneas 108–113), explotando cada renglón a unidades sueltas.
  - `…\Monedero\Model\MonederoManagement.php:565–571` — la URL destino es configuración de Magento (`url_get_minimum_cost_to_redeem`), no un literal.
  - `…\MonederoVentaContado\Model\Api\WalletManagement.php:48–64` — consumidor de negocio: si `status != '200'` o `value == 0.0`, **deshabilita el monedero en el checkout**; en caso contrario lo usa como `maxToRedeem`.
  - `…\MonederoVentaContado\view\frontend\web\js\recyclable.js:72–95` (`validateMinimumCostToRedeem`) — llamada AJAX desde el checkout, envuelta en un `setTimeout` de 1 000 ms (línea 75).

---

#migracion #SAP #analisis_bd #dotnet #WalletCustomerController #getMinimumCostToRedeem #monedero #bloqueante
