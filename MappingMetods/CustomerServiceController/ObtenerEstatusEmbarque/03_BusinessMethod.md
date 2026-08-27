# Mapeo del Método: `CustomerServiceMethods.ObtenerEstatusEmbarque()` — Lógica de Negocio

**Endpoint:** `POST /customerService/ObtenerEstatusEmbarque`
**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string ObtenerEstatusEmbarque(EstatusEmbarqueRequest request)` — Líneas **1905–1947** (región `#region Estatus Embarque`, líneas 1903–1949)
**Capa:** LAN (Nexo)
**Rol en el flujo:** Determinar si el pedido eCommerce **ya fue embarcado** en Intelisis, para que Magento decida si el cliente puede o no cancelarlo. Es un **gate de negocio**, no una consulta informativa.

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `EstatusEmbarqueRequest` — `APIMagento/WebApiMagento/Models/CustomerServiceRequest.cs` líneas **133–136**:

| Campo | Tipo | Uso dentro del método |
|---|---|---|
| `IdEcommerce` | string | Único parámetro. Se **concatena** (no se parametriza) dentro del `WHERE V.IDEcommerce = '{0}'` de la consulta 1 |

El modelo espejo en DMZ está en `APIMagentoDMZ/WebApiMagento/Models/CustomerServiceRequest.cs` líneas **139–142** (estructura idéntica).

**Contrato de salida:** un literal JSON booleano plano (`true` / `false`). No existe DTO de respuesta.

---

## Flujo de Ejecución Detallado

```csharp
public static string ObtenerEstatusEmbarque(EstatusEmbarqueRequest request)
{
    var cnn = new Connection();
    using (var sqlConnection = new SqlConnection(cnn.sCadenaConexion))
    {
        var sQuery = string.Format(
            @"SELECT top 1 V.MovID FROM Venta V with (nolock) WHERE V.IDEcommerce = '{0}'
                            ORDER BY V.FechaEmision DESC", request.IdEcommerce);
        ...
        if (!dr.HasRows) return JsonConvert.SerializeObject(false);
        ...
        if (!drEstatus.HasRows) return JsonConvert.SerializeObject(true);
        ...
        return JsonConvert.SerializeObject(listData.Count <= 0);
    }
}
```

1. **Conexión:** instancia `new Connection()` y usa `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)* **Sí usa `using`** sobre el `SqlConnection` — a diferencia de [[obtenerVentanaConfirmacion]]. Es el único acierto de gestión de recursos del método.

2. **Consulta 1 — resolver el folio de venta** (SQL inline, sin SP), líneas **1910–1916**:
   ```sql
   SELECT top 1 V.MovID FROM Venta V with (nolock)
   WHERE V.IDEcommerce = '{request.IdEcommerce}'
   ORDER BY V.FechaEmision DESC
   ```
   | Aspecto | Detalle |
   |---|---|
   | Parametrización | **NINGUNA.** `string.Format` concatena el valor del request directamente → **inyección SQL** |
   | Aislamiento | `with (nolock)` → lectura sucia |
   | Desempate | `ORDER BY V.FechaEmision DESC` (sí hay `ORDER BY`, a diferencia de otros métodos del archivo) |
   | Filtros ausentes | **No filtra por `Mov` ni por `Estatus`.** Cuenta cualquier movimiento de venta, incluidos `CANCELADO` |

   **Corte temprano:** `if (!dr.HasRows) return JsonConvert.SerializeObject(false);` (línea **1917**) → responde `false` cuando **no existe ninguna venta** con ese `IDEcommerce`.

3. **Lectura del folio:** `while (dr.Read()) { movId = dr["MovID"].ToString(); }` (líneas 1919–1922) sobre un `SELECT top 1` — **loop muerto** que sobrescribe `movId` en cada iteración. Usa el indexador por nombre + `.ToString()`, lo que evita el `SqlNullValueException` típico de `GetString(i)` (un `NULL` produce `""`), pero **enmascara** el caso `MovID IS NULL` convirtiéndolo silenciosamente en cadena vacía que luego se inyecta en la consulta 2.

4. **`dr.Close()`** (línea 1924). La conexión permanece abierta y se reutiliza para la segunda consulta — correcto.

5. **Consulta 2 — ¿ese folio tiene embarque asignado?** (SQL inline, sin SP), líneas **1926–1933**:
   ```sql
   SELECT v.IDEcommerce FROM Embarque e WITH(NOLOCK)
     INNER JOIN EmbarqueMov em WITH(NOLOCK) ON e.ID = em.AsignadoID
     INNER JOIN Venta v WITH(NOLOCK) ON v.MovID = em.MovID AND v.Mov = em.Mov
   WHERE v.MovID = '{movId}'
   ```
   | Tabla | Rol en el JOIN | Campos usados |
   |---|---|---|
   | `Embarque` (`e`) | Tabla base del embarque | `ID` (llave del JOIN) |
   | `EmbarqueMov` (`em`) | `e.ID = em.AsignadoID` — la **asignación** del movimiento al embarque | `AsignadoID`, `MovID`, `Mov` |
   | `Venta` (`v`) | `v.MovID = em.MovID AND v.Mov = em.Mov` | `MovID` (filtro), `Mov` (JOIN), `IDEcommerce` (proyectado) |

   `movId` también se **concatena** sin parametrizar (segundo vector de inyección, encadenado al primero).

   **Corte temprano:** `if (!drEstatus.HasRows) return JsonConvert.SerializeObject(true);` (línea **1934**) → responde `true` cuando la venta existe pero **no tiene embarque asignado**.

   > **Contexto de la llave `AsignadoID`:** en `SPsOrden/spEmbarque.sql` línea **184**, al cancelar un embarque sin afectar se ejecuta `UPDATE EmbarqueMov SET AsignadoID = NULL WHERE AsignadoID = @ID`. Es decir, un embarque cancelado **desvincula** la fila y esta consulta deja de encontrarlo — el pedido vuelve a ser "no embarcado". Este comportamiento es correcto **por accidente**: nadie lo declaró en el C#, depende enteramente de la lógica del ERP. Ver [[spEmbarque]].

6. **Acumulación de resultados y retorno final** (líneas 1935–1945):
   ```csharp
   var listData = new List<Dictionary<string, object>>();
   while (drEstatus.Read())
   {
       var newDict = new Dictionary<string, object>
       {
           {"IDEcommerce", drEstatus["IDEcommerce"].ToString()}
       };
       listData.Add(newDict);
   }
   return JsonConvert.SerializeObject(listData.Count <= 0);
   ```
   **Todo este bloque es código muerto.** Se llega aquí únicamente cuando `drEstatus.HasRows == true`, por lo que `listData` siempre tendrá ≥ 1 elemento y `listData.Count <= 0` es **siempre `false`**. La lista de diccionarios se construye, se llena con `IDEcommerce` y **se descarta**: nunca se serializa ni se cuenta para otra cosa. Equivale literalmente a `return "false";`.

7. **Sin cierre de `drEstatus` ni `Dispose()` de los `SqlCommand`.** Solo el `using` del `SqlConnection` los libera indirectamente al salir del método por cualquiera de los tres `return`.

8. **`CommandTimeout = 99999`** en ambos comandos (líneas 1914 y 1932) — ~27 horas. Sin timeout efectivo.

9. **`Logger`: ninguna llamada.** Ni `INFO` ni `ERROR`. Es el único método relevante de este archivo sin ninguna instrumentación (`Helper/Logger.cs` línea **134** define `CustomerService`, usado por casi todos sus vecinos).

10. **Manejo de error: NO EXISTE.** El método **no tiene `try/catch`**. Cualquier `SqlException`, timeout o fallo de red se propaga sin manejar hasta el pipeline de Web API.

**No hay Stored Procedures, ni servicios externos, ni escrituras** en este flujo: son dos `SELECT` de lectura sobre la misma conexión.

### Semántica observable del booleano

| Escenario en datos | Retorno | Significado para Magento |
|---|---|---|
| No existe `Venta` con ese `IDEcommerce` | `false` | **NO cancelable** |
| Existe `Venta`, sin fila en `Embarque`/`EmbarqueMov` | `true` | **Cancelable** |
| Existe `Venta` con al menos un embarque asignado | `false` | **NO cancelable** |

> El primer y el tercer caso son **indistinguibles** para el consumidor, pese a tener causas raíz opuestas ("el pedido no llegó al ERP" vs. "el pedido ya salió del almacén").

### Uso real del booleano en el frontend

`MAGENTO_WEB_ADOBE/app/code/Omnipro/OrderCancel/Plugin/OrderRepositoryPlugin.php` líneas **122–146**:

```php
if ($order->getStatus() != null && $order->getStatus() == 'processing') {
    $embarcado = $this->_shipmentStatusManagement->ObtenerEstatusEmbarque($order->getIncrementId());
    if (!$embarcado) return false;
}
if ($order->getStatus() != null && $order->getStatus() === 'ship') {
    return $this->_shipmentStatusManagement->ObtenerEstatusEmbarque($order->getIncrementId());
}
```

La variable se llama `$embarcado` pero **contiene lo contrario**: `true` significa *no embarcado*. El resultado alimenta el atributo de extensión `statusCancelable` del pedido.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Venta` | N/A (Inline SQL) | Select | `IDEcommerce` (filtro **concatenado**), `MovID` (proyectado y reinyectado), `FechaEmision` (`ORDER BY`), `Mov` (JOIN con `EmbarqueMov`) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Embarque` | N/A (Inline SQL) | Select | `ID` (JOIN `e.ID = em.AsignadoID`) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `EmbarqueMov` | N/A (Inline SQL) | Select | `AsignadoID`, `MovID`, `Mov` (JOIN) |

Una sola conexión, **dos** consultas secuenciales por request. Sin escrituras.

---

## Ejemplo de Respuesta (Response)

**Caso exitoso — pedido existe y aún NO está embarcado (cancelable):** HTTP **200**
```json
true
```

**Caso "sin datos" — no hay `Venta` con ese `IDEcommerce`:** HTTP **200**
```json
false
```
Mismo cuerpo que el caso "ya embarcado". **El consumidor no puede distinguirlos.**

**Caso de error** (BD caída, timeout, `IdEcommerce` con comilla simple que rompe el SQL): HTTP **500**

Desde la LAN, la excepción se propaga sin manejar (no hay `try/catch` en negocio ni en [[02_LAN_Controller]]). Desde la DMZ, `Curl.Post` la captura y devuelve `e.ToString()` como cuerpo, que revienta en el `JsonConvert.DeserializeObject(...)` de la línea 319 → **HTTP 500 con stack trace** (ver [[01_DMZ_Controller]] obs. 2).

En Magento, `ShipmentStatusManagement.php:73–74` hace `$this->sendPostRequest(...)["body"]` y luego `json_decode($data)` con firma de retorno `: bool`. Ante un cuerpo no-JSON, `json_decode` devuelve `null` y el `return` de un `null` sobre un tipo declarado `bool` produce un **`TypeError`**, que **no es capturable** por el `catch (Exception $e)` de la línea 75 (deriva de `Error`, no de `Exception`) → error fatal en el frontend en vez del mensaje "Ha ocurrido un error de conexión".

> **Tres desenlaces, dos cuerpos posibles, y el camino de error revienta en las tres capas.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **INYECCIÓN SQL EN UN ENDPOINT ALCANZABLE SIN AUTENTICAR — el hallazgo más grave del endpoint.**
   `CustomerServiceMethods.cs:1910–1912` concatena `request.IdEcommerce` con `string.Format` dentro de un `WHERE ... = '{0}'`, sin `SqlParameter`. `CustomerServiceMethods.cs:1926–1930` repite el patrón con `movId`.
   El valor viaja desde `MAGENTO_WEB_ADOBE/app/code/Mavi/ShipmentStatus/etc/webapi.xml` líneas **4–9**, una ruta declarada `<resource ref="anonymous"/>`, hasta el SQL sin validación ni escape en ninguno de los tres saltos (Magento → DMZ → LAN). El usuario de conexión es `usrintranet` sobre `IntelisisTmp` — la base transaccional del ERP.
   **Es un blocker de seguridad, no deuda técnica.** Debe parametrizarse ya, con independencia del calendario de migración a SAP.

2. **Ausencia total de `try/catch` — único caso en `CustomerServiceMethods.cs`.** Sus vecinos (`obtenerVentanaConfirmacion:1892`, `GetEmpleadoByNomina:1995`) capturan y loguean. Aquí una `SqlException` se propaga a Web API y **no queda registro en `customerService.log`**. Ver también obs. 8.

3. **El bloque de acumulación (líneas 1935–1945) es código muerto: `listData.Count <= 0` es siempre `false`.** El `List<Dictionary<string,object>>` se construye y se descarta. Equivale a `return "false";`. Debe eliminarse — o, mejor, **rescatarse**: alguien quiso devolver los `IDEcommerce` embarcados y nunca terminó el trabajo. **Requiere definición de negocio:** ¿el contrato nuevo debe devolver el detalle del embarque o basta el booleano? (Regla #10).

4. **`false` ambiguo: "pedido inexistente" y "pedido ya embarcado" devuelven lo mismo (obs. §Semántica).** Consecuencia operativa concreta: **un pedido recién creado en Magento que todavía no se sincronizó a `Venta` se reporta como NO cancelable.** El cliente ve bloqueada la cancelación por un desfase de sincronización, no por un embarque real. El contrato nuevo debe separar `notFound` de `alreadyShipped` (404/204 vs. `false`).

5. **La consulta 2 pierde la correlación con el pedido original.** El `WHERE` final filtra solo por `v.MovID = '{movId}'`, **descartando el `IDEcommerce`** que originó la búsqueda. Si dos filas de `Venta` comparten `MovID` con distinto `Mov` (refacturación, series de folio solapadas), el resultado puede provenir de un movimiento que **no corresponde al pedido consultado**. *No se ha verificado la unicidad de `MovID` en `Venta`: es un supuesto del código que debe confirmarse con el DBA de Intelisis antes de replicar la lógica.*

6. **La consulta 1 no filtra por `Mov` ni por `Estatus`.** Un `IDEcommerce` con varios movimientos (`Pedido VIU` → `Factura VIU`, o un movimiento **cancelado**) resuelve al más reciente por `FechaEmision`. Si el embarque quedó vinculado al folio del pedido y la consulta devuelve el folio de la factura (o de una venta cancelada), la consulta 2 no encuentra nada → responde `true` → **se habilita la cancelación de un pedido que sí está embarcado**. Es el falso positivo espejo del punto 4, y el de mayor impacto económico.

7. **Problema N+1 contra el ERP desde el listado de pedidos.** `OrderRepositoryPlugin.php` invoca `getStatusCancelable` por cada pedido del `searchResult` (líneas 110–116). Cada invocación con estatus `processing`/`ship` dispara **una llamada HTTP DMZ→LAN y dos consultas SQL a `IntelisisTmp`**. Un cliente con 20 pedidos genera 20 round-trips y 40 queries con `CommandTimeout = 99999`. Debe resolverse con una consulta por lote en el diseño nuevo.

8. **Cero trazabilidad (Regla #8).** No hay `Logger.CustomerService` de `INFO` ni de `ERROR`. Como el retorno **autoriza o deniega una cancelación de pedido**, la falta de auditoría impide reconstruir decisiones ante una queja de cliente. Debe loguearse `IdEcommerce`, `MovID` resuelto y resultado.

9. **`CommandTimeout = 99999`** en ambos comandos (~27 h). Sin corte real; encadenado con `webClient.Timeout = 9999999` de la DMZ, una query bloqueada retiene hilos de IIS en dos capas. Fijar 30–60 s.

10. **`WITH(NOLOCK)` en las cuatro referencias de tabla.** Lecturas sucias sobre `Venta`, `Embarque` y `EmbarqueMov`, tablas transaccionales activas. Puede leerse un embarque en proceso de rollback y bloquear una cancelación legítima. Se hereda del estilo Intelisis; documentar que **el comportamiento actual tolera lecturas inconsistentes**.

11. **`while (dr.Read())` sobre un `SELECT top 1`** (líneas 1919–1922) — loop muerto, mismo patrón copiado por todo el proyecto.

12. **`drEstatus` nunca se cierra y los `SqlCommand` no se liberan.** Solo el `using` del `SqlConnection` los recoge. Envolver ambos readers y comandos en `using` al migrar.

13. **`dr["MovID"].ToString()` sobre un `NULL` produce `""`, no una excepción.** El `""` se inyecta en la consulta 2 (`WHERE v.MovID = ''`), que no encontrará filas → `true` → **cancelable**. Un dato sucio se traduce en una autorización. Debe validarse explícitamente.

14. **Método síncrono:** migrar a `async/await` con `ExecuteReaderAsync` (Regla #12). Prohibido `.Result` / `.Wait()`.

15. **Doble serialización.** Negocio serializa un `bool` a `string` → controller deserializa a `object` → Web API re-serializa. Para un primitivo el round-trip es puro desperdicio.

16. **La documentación maestra describe mal este método.** `Resources/implementation_plan_master.md` línea **81** afirma que el endpoint *"Ejecuta SP `SpVTASEcommerceConsultaEmbarque` (O equivalente de Embarques)"*. **Es falso:** el método no invoca ningún Stored Procedure, son dos consultas inline. Cualquier estimación de esfuerzo basada en esa línea está mal fundada. (`SpVTASEcommerceConsultaEmbarque` sí aparece asociado a `validarCoberturaPorCP` en `Resources/correo_dudas_sap.md:51` — parece un cruce de filas.)

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

**Las fuentes maestras del share se contradicen sobre este endpoint. Debe resolverse antes de programar:**

| Fuente | Línea | Clasificación asignada |
|---|---|---|
| `_EXCLUIDOS_Intelisis.md` | 102 | 🔒 **FUERA DE ALCANCE** — `IntelisisTmp`, evidencia `CustomerServiceMethods.cs:1908` |
| `_INVENTARIO_NoIntelisis.csv` | 54 | `EsIntelisis=Si`, `EnAlcance=No`, motivo *"100% Intelisis (sCadenaConexion)"* |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` | 39 | `INTELISIS` → `INTELISIS`, `Not Migrated`, `TotalTablasODS=3`, `EsNuestro=Mixto` |
| `MIGRATION_STATUS_MASTER_v2.csv` | 51 | `Not Migrated`, 0.00% en las tres tareas, nota: **"Consulta de SD08"** |
| `Resources/implementation_plan_master.md` | 81 | Destino **"Por definir / SAP Entregas"**, con descripción **incorrecta** del método (ver obs. 16) |

**Nota de inventario:** la especificación pedía consultar `MIGRATION_STATUS_MASTER_v3.csv`; **ese archivo no existe en el share**. El master vigente es `MIGRATION_STATUS_MASTER_v2.csv` (+ su `.xlsx`). La discrepancia debe reportarse.

Conforme a la **Regla #10 (Cero Suposiciones)**, no se asigna servicio OData en este documento. Análisis de los candidatos citados:

### 1. `Venta` → SD36 — único mapeo con respaldo documental
`Resources/lan_tables_to_sap_master.md` línea **16** establece explícitamente: *"`Venta` — **Sustituida**. Para consultar estatus de pedidos, se consume el OData **SD36**"*. Cubre la **consulta 1** (resolver el documento de ventas a partir del `IDEcommerce`).
- **A confirmar:** si `Venta.IDEcommerce` mapea a `PurchNoC` o `PurchNoS` en SD36, igual que en [[obtenerVentanaConfirmacion]].
- **A confirmar:** qué reemplaza al `ORDER BY FechaEmision DESC` cuando hay varios documentos para el mismo pedido (obs. 6).

### 2. La nota "Consulta de SD08" del master **no tiene respaldo**
`SD08` aparece en el share únicamente asociado a **`obtenerTipoGarantia`** (`Resources/informe_estimaciones_gap.md:25`, `Resources/registro_tareas_implementadas.md:61`, `Resources/resumen_dudas.md:36`). **No existe ninguna especificación de SD08 en `Resources/`** ni referencia que lo vincule a embarques o entregas. Todo indica un **arrastre de fila** al construir el master. No debe usarse como insumo de diseño hasta confirmarlo.

### 3. `Embarque` / `EmbarqueMov` → **SIN EQUIVALENTE IDENTIFICADO (bloqueante)**
Es el gap central de este endpoint.
- **Ninguna de las dos tablas aparece en `Resources/lan_tables_to_sap_master.md`.** La única mención de embarques en todo ese documento es `spEmbarque` como parte del motor `spAfectar` (línea 87), declarado *"Reemplazado 100% por SAP S/4HANA"* — sin decir **por qué objeto**.
- No hay servicio OData documentado en `Resources/` que exponga entregas/embarques (los candidatos naturales serían un `A_OutboundDelivery` o equivalente Z, pero **no está declarado en ninguna fuente del proyecto y no se asume**, Regla #10).
- Ese mismo vacío ya está señalado para logística en `Resources/correo_dudas_sap.md:19–20` y `:51–52` (fecha de entrega de paquetería, cobertura por CP): **el dominio de entregas es el hueco no resuelto de la migración**, y este endpoint depende enteramente de él.
- **Decisión requerida (Regla #1):** ¿se solicita la API de entregas a SAP, se conserva una consulta local, o se sustituye el gate de cancelación por el estatus del documento de ventas en SD36 (aceptando cambio de semántica)?

### 4. La regla de negocio real a preservar no está en ninguna tabla
El comportamiento correcto de hoy depende de que **`spEmbarque` ponga `EmbarqueMov.AsignadoID = NULL` al cancelar un embarque** (`SPsOrden/spEmbarque.sql:184`). En SAP esa "desasignación" tendrá otra representación (estatus del documento de entrega). **Migrar la consulta sin migrar esta regla rompe el caso "embarque cancelado → pedido vuelve a ser cancelable".**

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción de alcance**: `_EXCLUIDOS_Intelisis.md:102` dice FUERA DE ALCANCE, pero `implementation_plan_master.md:81` le asigna destino "SAP Entregas". Es la primera decisión; todo lo demás depende de ella.
2. **Corregir el master**: eliminar o justificar la nota "Consulta de SD08" (`MIGRATION_STATUS_MASTER_v2.csv:51`) y la afirmación de que el método ejecuta `SpVTASEcommerceConsultaEmbarque` (`implementation_plan_master.md:81`) — ambas son incorrectas según el código verificado.
3. **Definir el origen SAP del estatus de embarque/entrega** (punto 3 arriba) — bloqueante técnico real, compartido con `order/estimated-delivery` y `validarCoberturaPorCP`.
4. **Parametrizar la consulta YA** (obs. 1). Es un fix de seguridad independiente de la migración: la ruta Magento es anónima y el valor llega crudo al SQL de `IntelisisTmp`.
5. **Definir el contrato nuevo de respuesta**: ¿se conserva el booleano plano, o se separa `notFound` / `alreadyShipped` / `cancelable` (obs. 4)? ¿Se devuelve el detalle del embarque que el código muerto insinúa (obs. 3)?
6. **Confirmar con el DBA la unicidad de `Venta.MovID`** y el criterio correcto de selección de movimiento cuando un `IDEcommerce` tiene pedido + factura o movimientos cancelados (obs. 5 y 6).
7. **Diseñar la consulta por lote** para eliminar el N+1 desde el listado de pedidos de Magento (obs. 7).

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el alcance y el origen SAP del estatus de entrega. El punto 4 no debe esperar a esa sesión.

---

## Referencias cruzadas

- Documento previo del mismo endpoint (insumo histórico, no entregable): `Post_ObtenerEstatusEmbarque_Mapping.md`
- Endpoint hermano que también consulta `Venta` por `IDEcommerce`: [[obtenerVentanaConfirmacion]] (comparte el destino SD36 y el patrón de `TOP 1`)
- Endpoint del mismo dominio logístico, mismo gap SAP: [[validarCoberturaPorCP]]
- SP del ERP que gobierna `EmbarqueMov.AsignadoID`: [[spEmbarque]] (`SPsOrden/spEmbarque.sql:184`) — **no invocado por este endpoint**, pero indispensable para entender la semántica
- Consumidores en frontend: `MAGENTO_WEB_ADOBE/app/code/Omnipro/OrderCancel/Plugin/OrderRepositoryPlugin.php:122–146`, `MAGENTO_WEB_ADOBE/app/code/Mavi/ShipmentStatus/Model/ShipmentStatusManagement.php:66–79`, `MAGENTO_WEB_ADOBE/app/code/Mavi/ShipmentStatus/etc/webapi.xml:4–15`
- Fuentes maestras: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[lan_tables_to_sap_master]], [[implementation_plan_master]]

**Stored Procedures faltantes:** ninguno. Este endpoint **no invoca ningún SP** — por eso no se genera `_SPS_FALTANTES.txt`.

---

#migracion #SAP #analisis_bd #dotnet #CustomerServiceController #ObtenerEstatusEmbarque #embarques #seguridad #bloqueante
