# Mapeo del Método: `OrderMethods.GetPosCancellations()` — Lógica de Negocio

**Endpoint:** `POST /order/getPosCancellations`
**Archivo:** `APIMagento/WebApiMagento/Metodos/OrderMethods.cs`
**Método:** `public PosCancellationsResponse GetPosCancellations(DateTime? since, int limit)` — Líneas **223–284**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Devolver la lista de pedidos eCommerce **cancelados en Intelisis** (típicamente desde el POS de sucursal) dentro de una ventana temporal, para que el cron de Magento `Mavi_PosCancellationSync` reconcilie esas cancelaciones hacia la tienda.
**Región:** sin `#region`. Entre `InsertPaymentData` (179–221) y `GetIntelisisStatuses` (286–…).

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `PosCancellationsRequest` — `APIMagento/WebApiMagento/Models/OrderRequest.cs` líneas **129–133**:

| Campo | Tipo | Uso dentro del método | Default aplicado |
|---|---|---|---|
| `Since` | `DateTime?` | `@Since` en el filtro `COALESCE(FechaCancelacion, UltimoCambio) >= @Since` | `DateTime.Now.AddDays(-7)` si es `null` (línea 237) |
| `Limit` | `int` (no anulable) | `TOP (@Limit)` | `200` si `<= 0`; topado a `1000` si `> 1000` (líneas 234–235) |

El modelo espejo en DMZ está en `APIMagentoDMZ/WebApiMagento/Models/OrderRequest.cs` líneas **82–86** (estructura idéntica). **La DMZ no tiene el modelo de respuesta** — ver [[01_DMZ_Controller]] obs. 1.

Modelos de salida (solo LAN): `PosCancellation` (`Models/OrderRequest.cs:135–139`) y `PosCancellationsResponse` (`Models/OrderRequest.cs:141–146`).

---

## Flujo de Ejecución Detallado

```csharp
public PosCancellationsResponse GetPosCancellations(DateTime? since, int limit)
{
    var response = new PosCancellationsResponse { Success = true, Data = new List<PosCancellation>(), Message = "" };
    try
    {
        if (limit <= 0) limit = 200;
        if (limit > 1000) limit = 1000;
        DateTime sinceValue = since ?? DateTime.Now.AddDays(-7);

        Connection conn = new Connection();
        using (var sqlConnection = new SqlConnection(conn.sCadenaConexion))
        {
            sqlConnection.Open();
            string query = @"SELECT TOP (@Limit) IDEcommerce,
                                    CONVERT(varchar(19), COALESCE(FechaCancelacion, UltimoCambio), 120) AS FechaCancelacion
                             FROM Venta WITH(NOLOCK)
                             WHERE Estatus = 'CANCELADO' AND Mov = 'Pedido'
                               AND IDEcommerce IS NOT NULL AND IDEcommerce <> '' AND IDEcommerce <> '0'
                               AND COALESCE(FechaCancelacion, UltimoCambio) >= @Since
                             ORDER BY COALESCE(FechaCancelacion, UltimoCambio) ASC";
            ...
        }
    }
    catch (Exception ex)
    {
        Logger.intelisis("ERROR GetPosCancellations: ", ex.Message);
        response.Success = false;
        response.Message = ex.Message;
    }
    return response;
}
```

1. **Objeto de respuesta optimista.** Se inicializa con `Success = true` y `Data` vacía **antes** del `try` (líneas 225–230). Si todo falla, el `catch` lo degrada; si la query no devuelve filas, se retorna tal cual.

2. **Saneo de parámetros (líneas 234–237).** Único punto de validación del flujo completo — ni DMZ ni el controller LAN validan nada:
   - `limit <= 0` → `200`
   - `limit > 1000` → `1000`
   - `since == null` → `DateTime.Now.AddDays(-7)`
   > `DateTime.Now` es **hora local del servidor IIS**, no UTC. Ver observación 4.

3. **Conexión (línea 240):** `new Connection()` → `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)* **Sí usa `using`** en `SqlConnection`, `SqlCommand` y `SqlDataReader` (líneas 240, 256, 262) — a diferencia del resto de `OrderMethods.cs`.

4. **Consulta única (inline SQL, sin SP)** sobre una sola tabla:

   | Tabla | Rol | Campos proyectados | Campos de filtro |
   |---|---|---|---|
   | `Venta` | única | `IDEcommerce`, `COALESCE(FechaCancelacion, UltimoCambio)` | `Estatus`, `Mov`, `IDEcommerce`, `FechaCancelacion`, `UltimoCambio` |

   **Filtros aplicados:**

   | Filtro | Naturaleza | Nota |
   |---|---|---|
   | `Estatus = 'CANCELADO'` | catálogo hardcodeado | valor de negocio Intelisis embebido en el código |
   | `Mov = 'Pedido'` | catálogo hardcodeado | **excluye `'Pedido VIU'`** — ver observación 1 |
   | `IDEcommerce IS NOT NULL AND <> '' AND <> '0'` | saneo defensivo | reconoce que la columna se usa como texto libre y contiene basura |
   | `COALESCE(FechaCancelacion, UltimoCambio) >= @Since` | ventana temporal | fallback silencioso: ver observación 2 |

   - `@Limit` y `@Since` son `SqlParameter` vía `AddWithValue` (líneas 258–259) → **parametrizado, sin riesgo de inyección**. Es la excepción dentro de `OrderMethods.cs`, donde `InsertDetPedido` (línea 460), `GetCreatedAccount` (876), `IsValidated` (774) y `DatosEntregaInsert` (907) **sí concatenan**.
   - `WITH(NOLOCK)` → lectura sucia sobre datos transaccionales de ventas.
   - `TOP (@Limit)` **sí** tiene `ORDER BY` (ascendente por fecha) → resultado determinista y compatible con paginación por cursor de fecha.
   - `CONVERT(varchar(19), ..., 120)` fija el formato ISO `YYYY-MM-DD HH:MI:SS` **en SQL Server**, evitando la dependencia de la cultura del servidor .NET. Buena práctica, poco común en el proyecto.

5. **`CommandTimeout = 60`** (línea 260). Valor razonable — contrasta con el `9999999` (~115 días) omnipresente en el resto del proyecto (`InsertPaymentData` línea 202, `InsertDetPedido` línea 461, `Conn/Connection.cs:49`).

6. **Lectura del resultado (líneas 262–272):** `while (reader.Read())` sobre un conjunto multi-fila (correcto aquí). Se mapea con `reader["col"].ToString()`, que **no lanza en `NULL`** (devuelve `""`), a diferencia de `GetString(i)`. No hay bloque de código muerto `Object[] values / fieldCount`.

7. **Manejo de error (líneas 276–281):** el `catch` loguea en `Logger.intelisis("ERROR GetPosCancellations: ", ex.Message)` → `C:\inetpub\wwwroot\log\intelisis.log` (`Helper/Logger.cs:9–11`) y degrada el objeto a `Success = false` + `Message = ex.Message`. **No relanza.** El controller LAN traduce ese flag a HTTP 500 ([[02_LAN_Controller]] paso 4).

**No hay Stored Procedures, ni servicios externos, ni escrituras** en este flujo: es un único `SELECT` de lectura.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Venta` | N/A (Inline SQL) | Select | `IDEcommerce` (proyectado + filtro de saneo), `Estatus` (`= 'CANCELADO'`), `Mov` (`= 'Pedido'`), `FechaCancelacion`, `UltimoCambio` |

Una sola conexión y una sola query por request.

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** (hay cancelaciones en la ventana) — **HTTP 200**. Cuerpo real tal como sale de LAN:
```json
{
  "Success": true,
  "Message": "",
  "Data": [
    { "IdEcommerce": "3000012345", "FechaCancelacion": "2026-07-30 11:42:07" },
    { "IdEcommerce": "3000012388", "FechaCancelacion": "2026-08-01 09:15:33" }
  ]
}
```
> Recordatorio: el consumidor **no recibe esto** tal cual. La DMZ lo re-serializa como cadena escapada ([[01_DMZ_Controller]] obs. 1) y el módulo de Magento lo repara con `stripslashes` (`PosCancellationSync/Helper/Data.php:118`).

**Caso sin datos** (ventana sin cancelaciones, o `Since` en el futuro) — **HTTP 200**:
```json
{ "Success": true, "Message": "", "Data": [] }
```
Semánticamente correcto y distinguible del error. El helper de Magento lo trata explícitamente (`Data.php:120–122`: `if (!isset($bodyDecoded['Data'])) return [];`).

**Caso de error** (BD caída, timeout de 60 s, credenciales inválidas) — **HTTP 500**:
```json
{
  "Success": false,
  "Message": "Timeout expired. The timeout period elapsed prior to completion of the operation...",
  "Data": []
}
```
El cron de Magento lo detecta por status y devuelve `null` (`Data.php:126–128`), registrando `[PosCancellationSync] fetchPosCancellations error: ...`.

> **Tres desenlaces, tres semánticas distintas, y aquí sí tres respuestas distinguibles.** Es la excepción positiva del controlador.

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **`Mov = 'Pedido'` excluye `'Pedido VIU'` — riesgo funcional silencioso.** El resto del proyecto trata explícitamente ambos movimientos como equivalentes: `CustomerServiceMethods.obtenerVentanaConfirmacion` filtra `Mov IN ('Factura VIU','Factura')`, y `Metodos/StorePickup/CodigoRecogerSucursal.cs:432` usa `Mov = 'Pedido'` a secas. **Si la UEN VIU emite sus pedidos como `Pedido VIU`, sus cancelaciones POS nunca llegan a Magento.** No hay evidencia en el código de cuál es el valor real por UEN → **requiere confirmación de negocio antes de migrar** (Regla #10, no se asume).

2. **`COALESCE(FechaCancelacion, UltimoCambio)` es un fallback semánticamente incorrecto.** `UltimoCambio` es la fecha de *cualquier* modificación del registro, no la de la cancelación. Consecuencias:
   - Un pedido cancelado hace meses cuya fila se toca hoy (reafectación, corrección de agente) **reaparece** dentro de la ventana como si se acabara de cancelar → reprocesamiento en Magento.
   - Inversamente, si `FechaCancelacion` es siempre `NULL` en producción, el endpoint está paginando por "última modificación" sin que nadie lo sepa.
   - **Bloqueante para la migración:** hay que determinar si `Venta.FechaCancelacion` se puebla realmente. Si sí, el `COALESCE` sobra; si no, el contrato entero está construido sobre la columna equivocada.

3. **`Limit` + `ORDER BY ASC` sin cursor = riesgo de pérdida de cancelaciones.** Si en una ventana caen más de `Limit` filas, se devuelven las **más antiguas** y las restantes se pierden hasta que el cron vuelva a correr con un `Since` posterior — que ya las habrá dejado atrás. El cron (`Mavi_PosCancellationSync`) es responsable de avanzar `Since`; si lo avanza al máximo devuelto, **las filas truncadas nunca se recuperan**. Debe migrar a paginación por `(fecha, IDEcommerce)` como token continuo.

4. **`DateTime.Now` en lugar de `DateTime.UtcNow` (línea 237).** El default de 7 días se calcula en hora local del servidor IIS. Si LAN y el servidor de Magento están en zonas distintas — o al cruzar el cambio de horario — la ventana se desplaza. En SAP/OData los timestamps son UTC; hay que fijar la zona explícitamente.

5. **Catálogos de negocio embebidos en el `WHERE`.** `'CANCELADO'` y `'Pedido'` son valores del catálogo de Intelisis escritos a mano en el string SQL. Al migrar hay que traducirlos al catálogo SAP (`DocType` / estado de documento) y el **mapa de equivalencias Intelisis→SAP no existe** en `Resources/` (Regla #10).

6. **`IDEcommerce <> '' AND <> '0'` documenta un problema de calidad de datos.** El filtro reconoce que la columna llave del puente Intelisis↔Magento contiene cadenas vacías y ceros. Nótese además `OrdersController.cs:19` (`public const int GenericOrderId = 11111;`), usado en `updateStatus` (línea 322) para descartar un pedido "genérico". **Hay al menos tres valores centinela conviviendo en el mismo campo.** En SAP esto debe resolverse con una llave real (`PurchNoC` / referencia de cliente) y no con exclusiones por literal.

7. **`WITH(NOLOCK)` sobre `Venta`.** Lectura sucia: puede leerse un pedido marcado `CANCELADO` dentro de una transacción que después haga rollback → Magento cancela un pedido que en Intelisis sigue vivo. En un flujo de **reconciliación de cancelaciones** el riesgo no es teórico.

8. **Fuga de `ex.Message` como payload.** `response.Message = ex.Message` (línea 280) llega íntegro al cuerpo del 500 ([[02_LAN_Controller]] obs. 3). Un `SqlException` expone servidor, base y objeto. Debe reemplazarse por un código de error + correlación por log.

9. **Sin trazabilidad de `INFO`.** No se registra la ventana consultada ni el conteo devuelto (Regla #8). Para un proceso de reconciliación que corre por cron, la ausencia de un log de "pedí desde X, devolví N filas" hace imposible auditar una cancelación perdida. Es la traza que más falta va a hacer durante la convivencia Intelisis↔SAP.

10. **Método síncrono:** migrar a `async/await` con `ExecuteReaderAsync` (Regla #12). Prohibido `.Result` / `.Wait()`.

11. **Puntos positivos que deben conservarse en la migración** (poco frecuentes en este código base): parámetros tipados, `using` completo en los tres recursos, `CommandTimeout = 60` realista, `TOP` con `ORDER BY`, formato de fecha fijado en SQL, y separación real entre "sin datos" (200) y "error" (500).

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

**Las fuentes maestras del share se contradicen sobre este endpoint:**

| Fuente | Clasificación asignada |
|---|---|
| `_EXCLUIDOS_Intelisis.md` (línea 125) | 🔒 **FUERA DE ALCANCE** — `IntelisisTmp`, `OrderMethods.cs:240` |
| `_INVENTARIO_NoIntelisis.csv` (línea 59) | `IntelisisTmp` — "100% Intelisis (sCadenaConexion)", **sin componente no-Intelisis** |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 81) | **`In Progress`** — destino `order/cancelInvoice` (POST), **SAP SD48 (invoice cancellation)**; "SAP side complete (5ef8d25, 2026-07-16). Estimated 5h/8h/2d, Dev 3. LAN counterpart exists on stage-delta but not on origin/Production — see G-18." |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` | **sin fila** para este endpoint |

Es la contradicción más fuerte de las siete asignadas: una fuente lo declara fuera de alcance y otra reporta trabajo SAP **ya terminado**. Conforme a la **Regla #10 (Cero Suposiciones)** no se asigna servicio OData aquí; se deja el análisis de viabilidad:

### Objeción de fondo: `getPosCancellations` **no es** `cancelInvoice`

El destino propuesto (SD48, *invoice cancellation*) es una operación de **escritura** que cancela un documento. Este endpoint es una **lectura de delta**: "dame los pedidos que se cancelaron desde la fecha X". La dirección del flujo también es opuesta:

| | Endpoint actual | `order/cancelInvoice` (SD48) |
|---|---|---|
| Verbo semántico | consulta (pull) | comando (push) |
| Iniciador | cron de Magento | ¿SAP? ¿Magento? |
| Efecto | ninguno | cancela documento |
| Cardinalidad | N pedidos por llamada | 1 documento |

**No son el mismo requerimiento.** O el master mapeó mal la fila, o existe un rediseño (SAP notifica cancelaciones en vez de que Magento las consulte) que **no está documentado en ninguna de las fuentes revisadas**. Debe cerrarse antes de tocar código.

### Elementos sin equivalente identificado

- **`Venta.IDEcommerce`** — llave del puente Magento↔ERP. En SD36 (`ZAPI_DOCVTAS_CHECK`) los candidatos son `PurchNoC` / `PurchNoS`, pero **no está confirmado cuál** (mismo gap señalado en [[03_BusinessMethod|obtenerVentanaConfirmacion]]).
- **`Venta.FechaCancelacion` / `Venta.UltimoCambio`** — no hay evidencia en la documentación disponible de qué campo SAP expone la marca temporal de cancelación de un documento de ventas, ni de si es consultable por rango (`$filter ... ge`). **Sin eso, no hay endpoint delta posible.**
- **`Estatus = 'CANCELADO'`** — en SAP la cancelación de un documento de ventas se representa por estatus de rechazo / documento de anulación, no por una columna `Estatus`. Requiere el catálogo de equivalencias, inexistente.

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción de alcance:** `_EXCLUIDOS_Intelisis.md` dice FUERA DE ALCANCE; `MIGRATION_STATUS_MASTER_v2.csv` dice `In Progress` con la parte SAP terminada. ¿Cuál gobierna? Es la primera decisión; todo lo demás depende de ella.
2. **Validar (o desmentir) el mapeo a `order/cancelInvoice` / SD48.** Si el rediseño es "SAP empuja las cancelaciones a Magento", hay que definir el contrato del webhook y **quién retira el cron `Mavi_PosCancellationSync`**, porque hoy es el único consumidor (`MAGENTO_WEB_ADOBE/app/code/Mavi/PosCancellationSync/Helper/Data.php:93`).
3. **Confirmar si `Venta.FechaCancelacion` se puebla en producción** (observación 2). Si es siempre `NULL`, el contrato actual está paginando por `UltimoCambio` y el delta es incorrecto **hoy**, antes de migrar.
4. **Cerrar el catálogo `Mov`:** ¿existe `'Pedido VIU'`? Si sí, el endpoint actual pierde las cancelaciones de esa UEN (observación 1) y es un bug en producción, no solo deuda de migración.
5. **Definir la estrategia de paginación** del delta en SAP (observación 3): token continuo `(fecha, id)` vs. `TOP` + fecha, y quién guarda el cursor.
6. **Zona horaria del contrato** (observación 4): UTC en el nuevo servicio, y qué hace el cron de Magento con las fechas históricas.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el conflicto de alcance y por si `FechaCancelacion` existe realmente.

---

## Referencias cruzadas

- Endpoint hermano en el mismo controlador y misma tabla `Venta`: [[getIntelisisStatuses]] (`OrderMethods.cs:286`) — consulta el estatus de N pedidos por `IDEcommerce`; es el complemento *pull* de este delta.
- Endpoint que **escribe** la cancelación en el sentido contrario (Magento→Intelisis): `order/cancelOrder` → `OrderMethods.cancelamagento` (`OrderMethods.cs:1358`) y `ServiceOrderMethods.sendReporte`. **Los dos flujos tocan `Venta.Estatus` en direcciones opuestas** — hay riesgo de bucle de reconciliación que debe evaluarse al migrar.
- Endpoint hermano que usa `spAfectar` con acción `"CANCELAR"` sobre `Venta`: `order/ManagePaynetOrders` → `OrderMethods.ExecuteSP` (`OrderMethods.cs:161–177`). Es quien **produce** parte de las filas que este endpoint después lee.
- Consumidor en el frontend: `MAGENTO_WEB_ADOBE/app/code/Mavi/PosCancellationSync/Helper/Data.php:93` (`fetchPosCancellations`), configurado desde `PosCancellationSync/etc/adminhtml/system.xml:39` ("URL del endpoint getPosCancellations"). **Único consumidor identificado.**
- Tabla compartida: [[Venta]]
- Inventario de alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[MIGRATION_STATUS_MASTER_v2]]

---

#migracion #SAP #analisis_bd #dotnet #OrdersController #getPosCancellations #bloqueante
