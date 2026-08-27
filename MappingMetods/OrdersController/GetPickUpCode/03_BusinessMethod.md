# Mapeo del Método: `CodigoRecogerSucursal.GetPickUpCode()` — Lógica de Negocio

**Endpoint:** `POST /order/GetPickUpCode`
**Archivo:** `APIMagento/WebApiMagento/Metodos/StorePickup/CodigoRecogerSucursal.cs`
**Método:** `public string GetPickUpCode(string idEcommerce)` — Líneas **57–86**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Recuperar la **clave de recogida en sucursal** (PIN) de un pedido eCommerce, para inyectarla en la plantilla del correo "tu pedido está listo para recoger" de Magento.

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `StoreReadyPickupRequest` — `APIMagento/WebApiMagento/Models/OrderRequest.cs` líneas **104–107**:

| Campo | Tipo | Uso dentro del método |
|---|---|---|
| `IdEcommerce` | string | Único parámetro. Se inyecta como `@idEcommerce` contra `TrWDM0285_CteRecoge.idEcommerce` |

Modelo espejo en DMZ: `APIMagentoDMZ/WebApiMagento/Models/OrderRequest.cs` líneas **88–91** (idéntico).
Modelo de salida: `StoreReadyPickupResponse` (`Models/OrderRequest.cs:114–117`, un solo campo `PickupCode`); el espejo DMZ está en `APIMagentoDMZ/.../OrderRequest.cs:98–101` pero **no se usa** ([[01_DMZ_Controller]] obs. 1).

---

## Flujo de Ejecución Detallado

```csharp
public string GetPickUpCode(string idEcommerce)
{
    Connection clsConexion = new Connection();
    using (var vConexion = new SqlConnection(clsConexion.sCadenaConexion))
    {
        vConexion.Open();
        string sQuery = @"SELECT ClaveVenta FROM TrWDM0285_CteRecoge WITH (NOLOCK)
                                    WHERE idEcommerce = @idEcommerce";

        SqlParameter[] pars = new SqlParameter[] {
            new SqlParameter("@idEcommerce", idEcommerce) { SqlDbType = SqlDbType.VarChar }
        };

        using (var vComando = new SqlCommand(sQuery, vConexion))
        {
            vComando.Parameters.AddRange(pars);
            using (SqlDataReader dtReader = vComando.ExecuteReader())
            {
                if (dtReader.Read())
                    return dtReader["ClaveVenta"].ToString();
                else
                    return "";
            }
        }
    }
}
```

1. **Conexión (líneas 59–61):** `new Connection()` → `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)* **Usa `using` en los tres recursos** (conexión, comando, reader).

2. **Consulta única (inline SQL, sin SP)** sobre una sola tabla:

   | Tabla | Rol | Campo proyectado | Campo de filtro |
   |---|---|---|---|
   | `TrWDM0285_CteRecoge` | única | `ClaveVenta` | `idEcommerce = @idEcommerce` |

   - `@idEcommerce` es `SqlParameter` tipado `VarChar` → **parametrizado, sin riesgo de inyección**.
   - `WITH(NOLOCK)` → lectura sucia. Relevante: `createStorepickupCode` y `generateNewStorepickupCode` **escriben** en esta misma tabla (`INSERT` vía SP y `UPDATE ... WITH(ROWLOCK)` respectivamente). Una lectura concurrente puede devolver un código a medio actualizar o uno que después se revierta.
   - **Sin `TOP`, sin `ORDER BY`.** Si un `idEcommerce` tuviera varias filas, `dtReader.Read()` devuelve la **primera del orden físico** — no determinista. La tabla **no tiene garantía de unicidad visible en el código**: `ValidaDuplicidadIdEcommerce` (líneas 209–253) existe precisamente porque el duplicado es posible, y hace `SELECT COUNT(Nombre) ... WHERE IdEcommerce = @IdEcommerce` — es decir, el propio código contempla `COUNT > 1`.

3. **Sin `CommandTimeout` explícito** → se aplica el default de ADO.NET (**30 s**). Es de los pocos métodos del proyecto que no fija `9999999`; compárese con `UpdatePickUpCode` (línea 289, `999999`) y `crearPrimerCodigoRecogerSuc` (línea 133, `60000`) **en este mismo archivo**.

4. **Lectura del resultado (líneas 77–82):** `if (dtReader.Read())` — sin loop, correcto para una fila. Usa `dtReader["ClaveVenta"].ToString()`, que **tolera `NULL`** (devuelve `""`) en vez de `GetString(i)`. No hay bloque de código muerto `Object[] values / fieldCount`.

5. **Sin `try/catch`.** Es el único de los tres métodos de *storepickup* que **no** captura excepciones (compárese con `ValidaDuplicidadIdEcommerce` línea 247 y `GetCodigoDuplicado` línea 381, que hacen `Console.WriteLine`). La excepción sube hasta el `catch` del controller LAN → **HTTP 400**. Paradójicamente esto es *mejor* que sus hermanos: al menos el error no se traga en silencio.

6. **Valor de retorno tri-estado colapsado a dos:**

   | Situación en BD | Retorno |
   |---|---|
   | Fila con `ClaveVenta = 'A1B2C3D4'` | `"A1B2C3D4"` |
   | **No hay fila** para ese `idEcommerce` | `""` |
   | **Hay fila** con `ClaveVenta = ''` o `NULL` | `""` |

   Los dos últimos son escenarios de negocio distintos y devuelven lo mismo. Ver observación 2.

**No hay Stored Procedures, ni servicios externos, ni escrituras** en este flujo: es un único `SELECT` de lectura.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `TrWDM0285_CteRecoge` | N/A (Inline SQL) | Select | `idEcommerce` (`= @idEcommerce`), `ClaveVenta` (proyectado) |

Una sola conexión y una sola query por request.

### Mapa de escritores de `TrWDM0285_CteRecoge` (contexto imprescindible para la migración)

Esta tabla es el estado compartido de toda la funcionalidad de *storepickup*. **Tres rutas de código distintas la escriben:**

| Escritor | Archivo:línea | Mecanismo | `ClaveVenta` resultante |
|---|---|---|---|
| `OrderMethods.setNameToReference` | `OrderMethods.cs:1253–1296` | SP `SpWDM0285_CteRecoge` | **`""` (vacío)** |
| `CodigoRecogerSucursal.crearPrimerCodigoRecogerSuc` | `CodigoRecogerSucursal.cs:88–196` | SP `SpWDM0285_CteRecoge` **o** `UPDATE` | código CRC generado |
| `CodigoRecogerSucursal.UpdatePickUpCode` | `CodigoRecogerSucursal.cs:271–299` | `UPDATE ... WITH(ROWLOCK)` | código CRC regenerado |

Ver [[03_BusinessMethod|createStorepickupCode]] y [[03_BusinessMethod|generateNewStorepickupCode]].

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** — LAN responde **HTTP 200** con el DTO:
```json
{ "PickupCode": "A1B2C3D4" }
```
La DMZ lo re-serializa como cadena (`"{\"PickupCode\":\"A1B2C3D4\"}"`) y el plugin de Magento lo repara con `stripslashes` antes de leer `$response->PickupCode` (`StorePickupReadyTemplate/Helper/Data.php:52` → `Plugin/TransportBuilderPlugin.php:56`).

**Caso sin datos** (pedido sin fila, o fila con `ClaveVenta` vacía) — LAN responde **HTTP 404** sin cuerpo. En la DMZ se degrada a **HTTP 200 con texto de excepción** (`"The remote server returned an error: (404) Not Found."`), y en Magento termina como `WebapiException` "No se pudo obtener el código para recoger en sucursal." Ver [[01_DMZ_Controller]] obs. 2 — **el correo de "listo para recoger" no se envía.**

**Caso de error** (BD caída, timeout de 30 s, `request == null`) — LAN responde **HTTP 400** con el texto de la excepción:
```
"Timeout expired. The timeout period elapsed prior to completion of the operation..."
```
La DMZ lo replica como 400 o, si el fallo ocurre en la propia llamada `Curl`, como 200 con el mensaje.

> **Tres desenlaces; el 404 legítimo y el error de red terminan produciendo el mismo síntoma visible: el cliente no recibe su clave.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **`SELECT` sin `TOP` ni `ORDER BY` sobre una tabla donde el duplicado está contemplado por diseño.** El propio archivo implementa `ValidaDuplicidadIdEcommerce` (línea 209) con un `COUNT`, lo que prueba que más de una fila por `idEcommerce` es posible. Si ocurre, este método devuelve una fila **arbitraria** — es decir, potencialmente **un PIN caducado**. **Requiere definición de negocio** (Regla #10): ¿la tabla debe tener índice único por `idEcommerce`? ¿Cuál código gana si hay varios?

2. **"Sin fila" y "fila con clave vacía" son indistinguibles — y el segundo caso lo produce el propio sistema.** `SetPedido` llama a `setNameToReference` cuando el método de envío es `instore_pickup` (`OrderMethods.cs:653–656`), y ese método inserta en `TrWDM0285_CteRecoge` con `@ClaveVenta = ""` (`OrderMethods.cs:1276`, comentado en el código como *"Parche para que funcione validación en SP_eCommerceNuevoPed"*). **Resultado: todo pedido de recogida en sucursal nace con una fila de clave vacía**, y este endpoint devuelve 404 hasta que `createStorepickupCode` la actualice. El 404 es entonces un **estado transitorio normal**, no un error — y nadie lo documenta.

3. **Efecto colateral grave del punto anterior sobre `createStorepickupCode`.** Como ya existe una fila, `ValidaDuplicidadIdEcommerce` devuelve `1` y `crearPrimerCodigoRecogerSuc` **nunca ejecuta el `INSERT`**: siempre cae en la rama `UpdatePickUpCode` (`CodigoRecogerSucursal.cs:141–145`). El SP `SpWDM0285_CteRecoge` queda de facto muerto para ese camino. Ver [[03_BusinessMethod|createStorepickupCode]] obs. 1.

4. **`WITH(NOLOCK)` sobre una tabla activamente escrita.** Hay `UPDATE ... WITH(ROWLOCK)` concurrente (`UpdatePickUpCode`, línea 276). Una lectura sucia puede entregar al cliente un PIN que después se revierte. Para un dato que **autoriza la entrega física de mercancía**, la lectura sucia no es aceptable.

5. **El PIN no tiene vigencia, ni contador de usos, ni estado.** `TrWDM0285_CteRecoge` solo guarda `IdEcommerce, Nombre, Correo, Telefono, ClaveVenta` (ver el SP `SpWDM0285_CteRecoge` en `SPsOrden/SpWDM0285_CteRecoge.sql`). No hay fecha de emisión, ni expiración, ni marca de "ya se usó". Cualquiera que conozca el `IdEcommerce` puede pedir el PIN por este endpoint las veces que quiera. **Es un control de seguridad físico modelado como una columna `varchar`** — debe replantearse en SAP, no traducirse.

6. **El endpoint devuelve un secreto sin más autorización que el `[Authorize]` de servicio.** No valida que quien pregunta sea el dueño del pedido: basta el token de servicio + el `IdEcommerce`. Sumado al punto 5, cualquier consumidor interno puede enumerar PINs.

7. **Sin `Logger` en ninguna capa del flujo** (DMZ, LAN y negocio). Cero trazabilidad de quién consultó qué PIN y cuándo (Regla #8). Para un dato de este tipo la auditoría debería ser obligatoria.

8. **Sin `CommandTimeout` explícito** → 30 s por default. No es un defecto (es mejor que el `9999999` habitual), pero conviene fijarlo explícitamente al migrar para que no dependa del framework.

9. **Método síncrono:** migrar a `async/await` con `ExecuteReaderAsync` (Regla #12). Prohibido `.Result` / `.Wait()`.

10. **Nombre de tabla acoplado al catálogo de desarrollos Intelisis.** `TrWDM0285_CteRecoge` codifica el número de desarrollo (`DM0285`) en el nombre. Al migrar, **la tabla no tiene equivalente SAP** y debe decidirse si va a `SigMavi` como persistencia local (Regla #1) — ver § Destino SAP.

11. **Puntos positivos a conservar:** parámetro tipado, `using` completo en los tres recursos, `dtReader["col"].ToString()` en vez de `GetString(i)`, y DTO de salida tipado en el controller LAN.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

**Las fuentes maestras discrepan en la clasificación, aunque coinciden en que no hay destino definido:**

| Fuente | Clasificación asignada |
|---|---|
| `_EXCLUIDOS_Intelisis.md` (línea 126) | 🔒 **FUERA DE ALCANCE** — `IntelisisTmp`, `CodigoRecogerSucursal.cs:60` |
| `_INVENTARIO_NoIntelisis.csv` (línea 65) | `IntelisisTmp` — "100% Intelisis (sCadenaConexion)", sin componente externo |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` (línea 67) | `INTELISIS (TrWDM0285_CteRecoge)` — **`Not Migrated`**, columna de alcance: **`Mixto`** |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 85) | **`Not Migrated`** — destino `Unknown`/`Unknown`. Nota: *"Blocked, unassigned. Business has not defined the clave venta PIN process. informe_estimaciones_gap.md §4."* |

**El conflicto es de alcance, no de destino:** `_EXCLUIDOS` lo cierra (`FUERA DE ALCANCE`), mientras `_ENDPOINTS_NoSAP` y el master lo mantienen abierto como `Not Migrated` / bloqueado. Coherentemente con la **Regla #10**, no se asigna ningún servicio OData.

### Por qué está bloqueado (y no es un bloqueo técnico)

La nota del master lo dice literalmente: *"Business has not defined the clave venta PIN process"*. El análisis del código lo confirma y lo agrava:

- **No hay proceso, hay un `varchar`.** El PIN se genera con `CRC` sobre `IdEcommerce + timestamp` (`CodigoRecogerSucursal.cs:310`) y se guarda en una columna sin vigencia, sin estado de consumo y sin bitácora (observación 5).
- **Existen dos generadores del mismo código** conviviendo, y las tres rutas de escritura descritas arriba producen estados distintos.
- **No es un dato de ERP.** Un PIN de retiro en tienda es un artefacto de *fulfillment*, no un campo de documento de ventas. Forzarlo dentro de SAP probablemente sea la decisión equivocada.

### Elementos sin equivalente identificado

- **`TrWDM0285_CteRecoge`** (`IdEcommerce, Nombre, Correo, Telefono, ClaveVenta`) — tabla propia de MAVI, con nombre acoplado al desarrollo `DM0285`. **Candidata natural a `SigMavi`** como persistencia local (Regla #1), pero la decisión no está tomada en ninguna fuente.
- **`ClaveVenta`** — no existe concepto equivalente en el maestro de documentos de ventas. Si el proceso se rediseña, probablemente deba vivir en Magento o en un servicio de *fulfillment*, no en SAP.
- **`IdEcommerce`** — mismo gap de mapeo que el resto de `OrdersController` (¿`PurchNoC`? ¿`PurchNoS`?), sin confirmar.

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción de alcance:** `_EXCLUIDOS_Intelisis.md` dice FUERA DE ALCANCE; `_ENDPOINTS_NoSAP.csv` y `MIGRATION_STATUS_MASTER_v2.csv` dicen `Not Migrated` (abierto, bloqueado). Es la primera decisión.
2. **Definir el proceso de negocio del PIN** — es el bloqueo declarado en el master. Mínimo a decidir: vigencia, si es de un solo uso, quién puede consultarlo, y si se registra el retiro. Hoy no existe **ninguna** de esas propiedades.
3. **Decidir el domicilio de `TrWDM0285_CteRecoge`:** ¿`SigMavi`? ¿Magento? ¿Un servicio de fulfillment nuevo? **No parece corresponder a SAP.**
4. **Unificar los tres escritores de la tabla** (observaciones 2 y 3) antes o durante la migración: hoy `setNameToReference` crea filas con clave vacía y deja muerto el `INSERT` de `crearPrimerCodigoRecogerSuc`. Migrar el bug tal cual sería un error.
5. **Añadir unicidad por `idEcommerce`** o definir el criterio de desempate (observación 1).
6. **Definir el contrato del 404:** hoy "no hay clave todavía" (estado transitorio normal) y "pedido inexistente" comparten respuesta, y ambos rompen el envío del correo en Magento ([[01_DMZ_Controller]] obs. 2). Debe distinguirse `204/404` de `409/425`.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el proceso del PIN (punto 2) — sin esa definición de negocio no hay diseño técnico posible.

---

## Referencias cruzadas

- **Hermanos de la misma funcionalidad (documentar en conjunto):**
  - [[03_BusinessMethod|createStorepickupCode]] → `CodigoRecogerSucursal.crearPrimerCodigoRecogerSuc` (`CodigoRecogerSucursal.cs:88`) — **crea** el código que este endpoint lee. Sin par en DMZ.
  - [[03_BusinessMethod|generateNewStorepickupCode]] → `CodigoRecogerSucursal.NuevoCodigoRecogerSucursal` (`CodigoRecogerSucursal.cs:255`) — **regenera** el código. Sin par en DMZ.
- **Escritor oculto de la misma tabla:** `OrderMethods.setNameToReference` (`OrderMethods.cs:1253`), invocado desde `SetPedido` (`OrderMethods.cs:655`) — inserta con `ClaveVenta = ""`. Es la causa de las observaciones 2 y 3.
- **Generador del código:** `CodigoRecogerSucursal.GenerarIdRecogerEnSucursal` (`CodigoRecogerSucursal.cs:301–341`) + `GetCodigoDuplicado` (343–387) + `GetRandomString` (389–402).
- **SP de la tabla (fuente disponible):** `SPsOrden/SpWDM0285_CteRecoge.sql` — `INSERT` puro de 5 columnas. **No lo usa este endpoint**, pero define el esquema de la tabla.
- **Consumidor en el frontend:** `MAGENTO_WEB_ADOBE/app/code/Mavi/StorePickupReadyTemplate/Helper/Data.php:31` (`getPickupCode`), invocado desde `Plugin/TransportBuilderPlugin.php:52` en `aroundSetTemplateVars`, solo cuando `$vars['order']['status'] === 'store_pickup'` y la plantilla es la de "listo para recoger". URL configurable en `sales_email/order_ready_for_pickup/url_pickup_code`. **Único consumidor identificado.**
- Tablas: [[TrWDM0285_CteRecoge]]
- Inventario de alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v2]]

---

#migracion #SAP #analisis_bd #dotnet #OrdersController #GetPickUpCode #storepickup #bloqueante
