# Mapeo del Método: `CodigoRecogerSucursal.NuevoCodigoRecogerSucursal()` — Lógica de Negocio

**Endpoint:** `GET /order/generateNewStorepickupCode/{idEcommerce}`
**Archivo:** `APIMagento/WebApiMagento/Metodos/StorePickup/CodigoRecogerSucursal.cs`
**Método:** `public string NuevoCodigoRecogerSucursal(string idEcommerce)` — Líneas **255–269**
**Capa:** LAN (Nexo) — **sin capa DMZ** ([[01_DMZ_Controller]])
**Rol en el flujo:** Regenerar la **clave de recogida en sucursal** (PIN) de un pedido ya existente, invalidando la anterior, y reenviar el correo de aviso al cliente.

> Cadena de flujo completa: [[01_DMZ_Controller]] *(no existe)* → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

**No hay modelo de request**: un único parámetro de ruta.

| Parámetro | Tipo | Origen | Semántica |
|---|---|---|---|
| `idEcommerce` | string | ruta `{idEcommerce}` | `Venta.IDEcommerce` / `TrWDM0285_CteRecoge.idEcommerce` / `eCommerceDetPedidos.IdPedido` |

**Retorno:** `string` — el PIN nuevo, **o** el literal `"failure to try update ClaveVenta"`.

> Nótese la diferencia de contrato con su hermano: [[03_BusinessMethod|createStorepickupCode]] recibe **dos** parámetros (`idEcommerce` **y** `idOrder`); aquí solo se recibe `idEcommerce` y el `idOrder` se **resuelve por consulta** (paso 1). Es la primera divergencia entre los dos caminos.

---

## Flujo de Ejecución Detallado

El método completo son **15 líneas**, pero delega en cuatro helpers y termina disparando un hilo en segundo plano:

```csharp
public string NuevoCodigoRecogerSucursal(string idEcommerce) {
    var idOrder = this.OrderId(idEcommerce);
    var newPickUpCode = GenerarIdRecogerEnSucursal(idEcommerce);

    if (UpdatePickUpCode(idEcommerce, newPickUpCode)) {
        new Task(() =>
        {
            Task.Delay(2000);
            this.SendNotifyPickUpOrder(idOrder);
        }).Start();
        return newPickUpCode;
    }

    return "failure to try update ClaveVenta";
}
```

### Paso 1 — Resolver el `idOrder` de Magento (línea 256)

`OrderId(idEcommerce)` — **líneas 24–54**. Primera conexión:

```sql
SELECT idOrden FROM ecommercedetpedidos WITH(NOLOCK) WHERE IdPedido = @idEcommerce
```

- Parámetro tipado `VarChar` → parametrizado, sin inyección.
- **Sin `TOP`, sin `ORDER BY`.** `eCommerceDetPedidos` tiene **una fila por artículo** del pedido (así lo llena `SpVTASeCommerceDetPedidos`, ver [[03_BusinessMethod|getOrderId]]): un pedido de 3 SKUs produce 3 filas. `dtReader.Read()` toma la **primera del orden físico**. Funciona porque todas comparten el mismo `idOrden`, pero es una lectura no determinista por accidente, no por diseño.
- Si no hay filas devuelve `""`, y **ese valor se propaga sin comprobación** hasta el payload del correo (paso 3). Ver observación 3.
- `using` completo en los tres recursos; sin `CommandTimeout` explícito (30 s por default).

### Paso 2 — Generar el código nuevo (línea 257)

`GenerarIdRecogerEnSucursal(idEcommerce)` — **líneas 301–341**. **Es exactamente el mismo helper que usa [[03_BusinessMethod|createStorepickupCode]]** (línea 93). La lógica **no está duplicada**, pero arrastra íntegras sus debilidades:

- **CRC-32** (`CRCFactory.Instance.Create()`, línea 303) sobre `IdEcommerce + DateTime.Now.ToString("dd-MM-yyy HH:mm:ss")` — no es un generador de secretos.
- El `while` reintenta contra `GetCodigoDuplicado` (línea 343), que **abre una conexión SQL nueva por iteración** (hasta 20+).
- **Rama de rendición:** con `loop > 19` acepta el código **aunque esté duplicado** (líneas 320–323).
- Constante literal de último recurso `"F41LH4SH00"` (línea 326).
- `GetRandomString` (línea 389) usa `new Random()` sin semilla → colisiones dentro del mismo tick.

Análisis completo en [[03_BusinessMethod|createStorepickupCode]] observación 2.

### Paso 3 — Persistir y notificar (líneas 259–266)

`UpdatePickUpCode(idEcommerce, newPickUpCode)` — **líneas 271–299**. Segunda conexión:

```sql
UPDATE TrWDM0285_CteRecoge WITH (ROWLOCK)
SET ClaveVenta = @ClaveVenta
WHERE idEcommerce = @idEcommerce
```

- Parámetros tipados `VarChar` → parametrizado.
- `CommandTimeout = 999999` (~11 días).
- `SqlCommand` **sin `using`** (línea 286) — la conexión sí lo tiene.
- Devuelve `true` **incondicionalmente** tras `ExecuteNonQuery()`, **sin mirar el número de filas afectadas**. Ver observación 2.
- El `catch (Exception)` (línea 296) devuelve `false` **sin loguear nada**.

Si devuelve `true`, se lanza la notificación:

```csharp
new Task(() => { Task.Delay(2000); this.SendNotifyPickUpOrder(idOrder); }).Start();
```

`SendNotifyPickUpOrder` (**198–207**) → `curl.Post("order/sendStorePickupEmail", ...)` → DMZ (`APIMagentoDMZ/.../OrdersController.cs:241–250`) → `Magento.sendPickupReadyEmail` → `rest/V1/storepickupready/send-pickup-email`.

> 🚩 **`Task.Delay(2000)` sin `await` no espera nada.** `Task.Delay` devuelve un `Task` que aquí **se descarta**; la lambda es síncrona (`Action`, no `Func<Task>`), así que la línea crea una tarea de espera y la tira a la basura. El retraso de 2 segundos que el autor pretendía **no ocurre**. Ver observación 4.

**Retorno del `curl.Post` descartado por completo**, igual que en `createStorepickupCode`.

### Paso 4 — Retorno

- Éxito: el PIN nuevo (`return newPickUpCode`).
- Fallo del `UPDATE`: el literal **`"failure to try update ClaveVenta"`**, que el controller LAN devuelve con **HTTP 200** ([[02_LAN_Controller]] obs. 3).

---

## Divergencias frente a `createStorepickupCode` (misma funcionalidad, dos comportamientos)

Los dos endpoints escriben la **misma columna de la misma tabla** con el **mismo generador**, pero difieren en todo lo demás. Tabla comparativa — **este es el material que hay que llevar a la sesión de diseño**:

| Aspecto | `createStorepickupCode` (371–391) | `generateNewStorepickupCode` (393–414) |
|---|---|---|
| Verbo HTTP | `POST` | **`GET`** (muta estado) |
| Parámetros | `idEcommerce` + `idOrder` (de la ruta) | solo `idEcommerce`; el `idOrder` se **consulta** (`OrderId`, línea 24) |
| Generación del PIN | `GenerarIdRecogerEnSucursal` | **el mismo helper** ✅ |
| Persistencia | `INSERT` (SP) **o** `UPDATE`, según `ValidaDuplicidadIdEcommerce` | **siempre `UPDATE`** |
| Datos de contacto | los recalcula con `GetDatosCte` (4 tablas) | **no los toca** |
| Cambio de estado en Magento | **sí** → `order/setOrderStatus` (`status = "store_pickup"`) | **no** |
| El PIN se publica en el `comment` de Magento | **sí** (línea 176) | **no** |
| Envío del correo | síncrono, en el hilo del request | en un `Task` en segundo plano (sin `await`, sin retraso real) |
| Retorno del método | `void` | el PIN (o un literal de error) |
| Respuesta HTTP en éxito | `Ok("ok")` | `Ok("<PIN>")` |
| Respuesta HTTP en fallo silencioso | `Ok("ok")` | `Ok("failure to try update ClaveVenta")` |
| Respuesta HTTP en excepción | `BadRequest(e.Message)` | `500` opaco, con `e` descartada |
| Log de entrada | sí (`Logger.OrderStatus`) | sí (`Logger.OrderStatus`) |
| Log de resultado | no | no |
| Ruta en DMZ | **no** | **no** |

**Divergencia funcional de fondo:** al regenerar, el pedido en Magento **conserva el `comment` con el PIN viejo** (que este flujo no actualiza) mientras la BD ya tiene el nuevo. Cliente y agente de atención ven, en ese momento, **dos claves distintas**: la vieja en el historial del pedido y la nueva en el correo. Solo una funciona.

**Divergencia de robustez:** `createStorepickupCode` maneja el caso "no existe la fila" (rama `INSERT`); este método **no**. Si no hay fila, el `UPDATE` afecta 0 registros, `UpdatePickUpCode` devuelve `true` de todas formas (observación 2), y el endpoint responde **HTTP 200 con un PIN que no está guardado en ninguna parte**.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Origen en el flujo |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `eCommerceDetPedidos` | N/A (Inline SQL) | Select | `OrderId` (línea 30) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `TrWDM0285_CteRecoge` | N/A (Inline SQL) | Select (`COUNT`) | `GetCodigoDuplicado` (355) — **hasta 20+ veces por request** |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `TrWDM0285_CteRecoge` | N/A (Inline SQL) | **Update** | `UpdatePickUpCode` (276) |

**Conexión única:** `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp`. *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)*

**Sin Stored Procedures.** Todo es SQL inline. **No aplica `_SPS_FALTANTES.txt`.**

**Servicios externos (Regla #3 y #4):**

| Destino | Ruta | Vía | Retorno |
|---|---|---|---|
| Magento (correo de recogida) | `order/sendStorePickupEmail` → `rest/V1/storepickupready/send-pickup-email` | LAN → DMZ → Magento REST, **en un `Task` de fondo** | **descartado** |

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** — **HTTP 200**, texto plano (no JSON):
```
"A1B2C3D4"
```

**Caso "sin datos"** — la fila no existe para ese `idEcommerce`. El `UPDATE` afecta **0 filas**, `UpdatePickUpCode` devuelve `true` igualmente, y la respuesta es **indistinguible del éxito**:
```
"A1B2C3D4"
```
> **El endpoint devuelve un PIN que no está persistido en ninguna parte.** El cliente recibe un correo con una clave que la sucursal no podrá validar. Es el peor desenlace del flujo y **hoy se presenta como éxito**.

**Caso de fallo del `UPDATE`** (excepción SQL capturada dentro de `UpdatePickUpCode`) — **HTTP 200** con un literal de error:
```
"failure to try update ClaveVenta"
```

**Caso de error no capturado** (excepción en `OrderId` o en `GenerarIdRecogerEnSucursal`) — **HTTP 500 sin cuerpo y sin log** ([[02_LAN_Controller]] obs. 2).

> **Cuatro desenlaces, tres de ellos con HTTP 200, y el más peligroso — "PIN no persistido" — es literalmente idéntico al éxito.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **`[HttpGet]` sobre una operación destructiva.** Ver [[02_LAN_Controller]] obs. 1. Un `GET` invocado por prefetch, crawler o recarga de navegador **invalida el PIN vigente del pedido**. Debe ser `POST` al migrar.

2. **`UpdatePickUpCode` devuelve `true` sin verificar filas afectadas — hallazgo crítico.** Líneas 291–294:
   ```csharp
   executa.ExecuteNonQuery();   // ← el int de retorno se descarta
   cnn.Close();
   return true;                 // ← incondicional
   ```
   `ExecuteNonQuery()` devuelve el número de filas afectadas y **se ignora**. Un `UPDATE` que no encuentra la fila es un no-op perfectamente válido para SQL Server: no lanza, no avisa. Consecuencia directa: **"pedido inexistente" es indistinguible de "PIN regenerado con éxito"**, y el cliente recibe una clave fantasma. Corrección de una línea (`return executa.ExecuteNonQuery() > 0;`) que además haría útil la rama `"failure to try update ClaveVenta"`.

3. **`idOrder` sin validar se propaga al correo.** Si `OrderId` devuelve `""` (pedido sin filas en `eCommerceDetPedidos`), el flujo continúa: se genera el PIN, se ejecuta el `UPDATE` y se dispara `SendNotifyPickUpOrder("")` → `POST` a Magento con `{"OrderId":""}`. Nadie comprueba, y el retorno se descarta.

4. **`Task.Delay(2000)` sin `await` — no retrasa nada** (línea 262). El `Task` devuelto se descarta y la lambda es síncrona. Si la espera de 2 s existía para dar tiempo a que el `UPDATE` se propagara antes de que Magento consultara el PIN vía [[03_BusinessMethod|GetPickUpCode]], **esa protección no existe** y hay una condición de carrera real: el correo puede pedir el código antes de que la escritura sea visible (agravado por el `WITH(NOLOCK)` del lector).

5. **`new Task(...).Start()` es un antipatrón en ASP.NET.** Se lanza trabajo en un hilo del pool sin registrarlo en el runtime de IIS: si el `AppDomain` se recicla, la notificación se pierde en silencio. Sin `try/catch` dentro de la lambda, **cualquier excepción dentro del `Task` es una excepción no observada** que en .NET Framework puede tumbar el proceso según la configuración de `ThrowUnobservedTaskExceptions`. Debe migrar a `async/await` con manejo explícito, o a una cola de trabajo real (Regla #12).

6. **No actualiza el `comment` del pedido en Magento.** El PIN viejo queda visible en el historial del pedido mientras la BD ya tiene el nuevo (ver tabla de divergencias). **Dos claves visibles, una válida.**

7. **No cambia el estado del pedido.** A diferencia de su hermano, no llama a `order/setOrderStatus`. Correcto si el pedido ya estaba en `store_pickup`; incorrecto si se invoca sobre un pedido en otro estado — y nada lo impide.

8. **Hereda todas las debilidades del generador de PIN**: CRC-32 predecible, `Random` sin semilla, rendición ante duplicados, constante literal `"F41LH4SH00"`. Ver [[03_BusinessMethod|createStorepickupCode]] obs. 2.

9. **20+ conexiones SQL por request** en el peor caso (`GetCodigoDuplicado` en el loop), más 2 del flujo principal, para escribir **una columna**.

10. **`WITH(NOLOCK)` en el control de unicidad del PIN.** Dos regeneraciones concurrentes pueden ver ambas `duplicado = 0` para el mismo código.

11. **Sin log del resultado ni del código emitido.** El endpoint reemite un secreto y no deja rastro de cuál ni para quién. En un flujo de reemisión de credencial, la bitácora debería ser obligatoria (Regla #8).

12. **`SqlCommand` sin `using` en `UpdatePickUpCode`** (línea 286). La conexión sí lo tiene; el comando no.

13. **`CommandTimeout` inconsistente:** `999999` en el `UPDATE`, sin fijar (30 s) en las lecturas — dentro del mismo flujo.

14. **`catch (Exception)` sin log** en `UpdatePickUpCode` (línea 296) y `Console.WriteLine` en `GetCodigoDuplicado` (línea 383) — que en IIS no va a ningún lado.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

| Fuente | Clasificación asignada |
|---|---|
| `_EXCLUIDOS_Intelisis.md` (línea 118) | 🟡 **MIXTO** — `IntelisisTmp + Magento (vía DMZ)`, "en radar", `CodigoRecogerSucursal.cs:274` |
| `_EXCLUIDOS_Intelisis.md` (línea 213) | listado entre los **26 🟡 MIXTO** de `OrdersController` |
| `_INVENTARIO_NoIntelisis.csv` (línea 67) | `Mixto` — "Curl a DMZ para notificar" |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` (línea 96) | `OrdersController (LAN-only)` — **`Out of scope`**, alcance `No` |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 120) | **`Out of scope`** — destino `Unknown`/`Unknown`, DMZ = `No DMZ route - LAN-only endpoint`. Nota: *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."* |

**Conflicto documental abierto**, idéntico al de [[03_BusinessMethod|createStorepickupCode]]: `_EXCLUIDOS_Intelisis.md` lo mantiene 🟡 **MIXTO / en radar**, mientras el master y `_ENDPOINTS_NoSAP` lo cierran como **`Out of scope`**. La clasificación **MIXTO es la técnicamente correcta**: el método lee y escribe `IntelisisTmp` (2 tablas) **y** llama a Magento a través de la DMZ. Regla #10: no se asigna servicio OData.

### Elementos sin equivalente identificado

- **`TrWDM0285_CteRecoge`** — tabla propia MAVI (desarrollo `DM0285`), sin equivalente SAP. Candidata a `SigMavi` (Regla #1); decisión pendiente.
- **`eCommerceDetPedidos`** — tabla puente Magento↔Intelisis. Aquí se usa solo para resolver `idOrden`. Mismo gap de domicilio.
- **El proceso del PIN** — bloqueo de negocio declarado en el master para [[03_BusinessMethod|GetPickUpCode]] (*"Business has not defined the clave venta PIN process"*). La **reemisión** es una parte del proceso que ni siquiera se ha planteado: no hay reglas sobre cuántas veces puede regenerarse, quién puede pedirlo, ni qué pasa con el PIN anterior.

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción de alcance:** 🟡 MIXTO (`_EXCLUIDOS`) vs `Out of scope` (master + `_ENDPOINTS_NoSAP`).
2. **Identificar el consumidor real** ([[01_DMZ_Controller]]). Sin ruta DMZ y sin llamador conocido, es un servicio huérfano; si atención a clientes depende de él, al migrar se queda sin mecanismo de reemisión de clave. Dato **obtenible de `orderStatus.log`**.
3. **Definir las reglas de reemisión del PIN:** ¿límite de regeneraciones? ¿quién puede pedirlo? ¿el anterior queda revocado o conviven? ¿se audita? Hoy no hay **ninguna** regla.
4. **Corregir `UpdatePickUpCode` para verificar filas afectadas** (observación 2) — es un bug en producción hoy, no deuda de migración: el sistema entrega PINs no persistidos.
5. **Cambiar el verbo a `POST`** (observación 1) y coordinarlo con el consumidor desconocido.
6. **Resolver la desincronización del `comment` de Magento** (observación 6): al regenerar, el pedido conserva el PIN viejo visible.
7. **Sustituir el `Task` de fondo** por un mecanismo confiable de notificación (observaciones 4 y 5).
8. **Unificar los dos caminos de escritura del PIN** con `createStorepickupCode`: hoy son dos comportamientos distintos sobre la misma columna (ver tabla de divergencias).

> Sugerencia: agendar sesión `/grill-me` conjunta para los **tres** endpoints de *storepickup* — no tiene sentido decidirlos por separado. Empezar por el punto 4 (bug activo) y el punto 3 (reglas de negocio inexistentes).

---

## Referencias cruzadas

- **Hermanos de la misma funcionalidad (los tres forman una sola pieza):**
  - [[03_BusinessMethod|GetPickUpCode]] → `CodigoRecogerSucursal.GetPickUpCode` (`CodigoRecogerSucursal.cs:57`) — **lee** el código. Único con proxy DMZ.
  - [[03_BusinessMethod|createStorepickupCode]] → `CodigoRecogerSucursal.crearPrimerCodigoRecogerSuc` (`CodigoRecogerSucursal.cs:88`) — **crea** el código. Ver tabla de divergencias arriba.
- **Helpers compartidos con `createStorepickupCode`:** `GenerarIdRecogerEnSucursal` (301), `GetCodigoDuplicado` (343), `GetRandomString` (389), `UpdatePickUpCode` (271), `SendNotifyPickUpOrder` (198).
- **Helper exclusivo de este método:** `OrderId` (24–54).
- **Escritor oculto de la misma tabla:** `OrderMethods.setNameToReference` (`OrderMethods.cs:1253`) — inserta con `ClaveVenta = ""` desde `SetPedido`.
- **Endpoint DMZ invocado de salida:** `order/sendStorePickupEmail` (`APIMagentoDMZ/.../OrdersController.cs:241–250`) → `Magento.sendPickupReadyEmail` (`APIMagentoDMZ/.../Conn/Magento.cs:131`).
- **Divergencia de modelos LAN/DMZ:** `OrderIdsRequest.OrderId` (LAN, `Models/OrderRequest.cs:111`) vs `OrderIdsRequest.orderId` (DMZ, `APIMagentoDMZ/.../OrderRequest.cs:95`).
- **Frontend:** **sin consumidor identificado.** El módulo `Mavi/StorePickupReadyTemplate` consume `GetPickUpCode`, no este endpoint. El master lo confirma: *"no lo consulta magento"*.
- Tablas: [[TrWDM0285_CteRecoge]], [[eCommerceDetPedidos]]
- Inventario de alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v2]]

---

#migracion #SAP #analisis_bd #dotnet #OrdersController #generateNewStorepickupCode #storepickup #bloqueante
