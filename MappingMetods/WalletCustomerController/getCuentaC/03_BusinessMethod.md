# Mapeo del Método: `WalletCustomerMethods.GetCuentaCByIdEcommerce()` — Lógica de Negocio

**Endpoint:** `POST /customer/wallet/getCuentaC/{idEcommerce}` (LAN) — invocado por la DMZ como `GET /customer/getCuentaC/{ordenCompra}` (**ruta rota, ver [[01_DMZ_Controller]]**)
**Archivo:** `APIMagento/WebApiMagento/Metodos/WalletCustomerMethods.cs`
**Método:** `public string GetCuentaCByIdEcommerce(string idEcommerce)` — Líneas **125–158**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Resolver la **cuenta de cliente Intelisis** (`Venta.Cliente`, la "cuenta C") a partir de la referencia de orden de compra de un pedido eCommerce. Es el paso previo necesario para operar el monedero electrónico de ese cliente (consulta de saldo, generación de serie, redención).

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

| Parámetro | Tipo | Origen | Validación |
|---|---|---|---|
| `idEcommerce` | string | Segmento de ruta `{idEcommerce}` (LAN) / `{ordenCompra}` (DMZ) | **Ninguna en LAN.** Solo `null` / `Length == 0` en DMZ (`APIMagentoDMZ/…/WalletCustomerController.cs:55–58`) |

**No hay modelo request.** Es el único método del controlador que no recibe un DTO: `GetWalletCustomerDetails` usa `WalletCustomerRequest` y `GetMinimumCostToRedeem` usa `MinimumCostToRedeemRequest` (ambos en `Models/WalletCustomerRequest.cs` líneas **5–9** y **11–26**).

> **El nombre del parámetro miente.** El valor se compara contra `Venta.ReferenciaOrdenCompra`, no contra `Venta.IDEcommerce`. Análisis completo en [[02_LAN_Controller]] §"Desajuste de nombre del parámetro". El nombre de la DMZ (`ordenCompra`) es el semánticamente correcto.

---

## Flujo de Ejecución Detallado

```csharp
public string GetCuentaCByIdEcommerce(string idEcommerce)
{
    Connection connection = new Connection();
    string cuentaC = "None";
    try
    {
        SqlConnection sqlConnection = new SqlConnection(connection.sCadenaConexion);
        string query = string.Format(@"SELECT ISNULL(Cliente, '')
            from Venta WITH (NOLOCK) WHERE ReferenciaOrdenCompra = '{0}'", idEcommerce);

        SqlCommand command = new SqlCommand(query, sqlConnection);
        sqlConnection.Open();
        SqlDataReader sqlDataReader = command.ExecuteReader();

        if (sqlDataReader.HasRows)
        {
            while (sqlDataReader.Read())
            {
                cuentaC = sqlDataReader.GetString(0);
            }
        }

        if (sqlConnection.State == ConnectionState.Open)
        {
            sqlConnection.Close();
        }
    }
    catch (Exception e)
    {
        // Logger.CustomerService("ERROR ", e.Message);
        cuentaC = e.Message;
    }
    return cuentaC;
}
```

1. **Conexión:** instancia `new Connection()` y usa `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)* **No se usa `using`**: la conexión se abre a mano y se cierra dentro del `try`.

2. **Valor centinela inicial:** `cuentaC = "None"` (línea 128). Es un **string mágico**, no `null` ni cadena vacía. El consumidor tendría que compararlo literalmente contra `"None"` para saber que no hubo resultado — nadie lo hace.

3. **🔴 Consulta única, construida con `string.Format` — INYECCIÓN SQL.** Líneas **132–133**:
   ```csharp
   string query = string.Format(@"SELECT ISNULL(Cliente, '')
       from Venta WITH (NOLOCK) WHERE ReferenciaOrdenCompra = '{0}'", idEcommerce);
   ```
   `idEcommerce` viene **directo de la URL, sin sanitizar y sin `SqlParameter`**. Un valor como `x' OR '1'='1` devuelve la cuenta de un pedido arbitrario; `x'; DROP TABLE …--` es ejecutable si el usuario `usrintranet` tiene permisos DDL. Es el hallazgo de **seguridad** más grave del endpoint.

   > Contraste dentro del **mismo archivo**: `GetWalletCustomerDetails` (líneas 29–35) y `GetMinimumCostToRedeem` (líneas 178–190) **sí** usan `SqlParameter` correctamente. La inyección es un descuido puntual, no el estilo general de la clase — lo que la hace más fácil de corregir y más difícil de justificar.

4. **Tabla y filtro:**

   | Tabla | Filtro | Campo proyectado |
   |---|---|---|
   | `Venta` | `ReferenciaOrdenCompra = '{idEcommerce}'` | `ISNULL(Cliente, '')` |

   - `WITH (NOLOCK)` → lectura sucia sobre datos transaccionales de ventas.
   - **Sin `TOP 1` y sin `ORDER BY`.** Un mismo folio de orden de compra genera típicamente **varias filas** en `Venta` (Pedido → Factura → Nota de Crédito, además de la separación por UEN MAVI/VIU).
   - **Sin filtro por `Mov` ni por `Estatus`.** Compárese con [[obtenerVentanaConfirmacion]], que sí acota con `Mov IN ('Factura VIU','Factura')`, y con `OrderMethods.cs:302`, que usa `Mov LIKE 'Factura%' ORDER BY Estatus ASC`. Aquí no se acota nada: entran pedidos cancelados, presupuestos y devoluciones por igual.

5. **Lectura del resultado:** `if (HasRows) { while (Read()) { cuentaC = GetString(0); } }` — el loop **sobrescribe** `cuentaC` en cada iteración, así que **gana la última fila que devuelva SQL Server**, en un orden no determinista. Si las filas pertenecen a clientes distintos (posible: un mismo folio de OC reusado, o refacturación a otra cuenta), el resultado es **aleatorio entre ejecuciones**.

6. **`GetString(0)` está protegido** por el `ISNULL(Cliente, '')` de la propia consulta, que garantiza un `varchar` no nulo. Es el único de los tres métodos de la clase donde la lectura es segura. (En `GetWalletCustomerDetails` líneas 44 los tres `GetString` también están cubiertos por `ISNULL`.)

7. **Cierre parcial de recursos:** solo se cierra `sqlConnection` (líneas 147–150), y **solo si sigue abierta**. El `SqlDataReader` **nunca se cierra ni se libera** — a diferencia de `GetWalletCustomerDetails`, que sí hace `dataReader.Close()` (línea 49). Si la excepción ocurre durante `Read()`, ni el reader ni la conexión se cierran (el `Close()` está dentro del `try`, después del punto de falla).

8. **Sin `CommandTimeout`.** Se hereda el default de ADO.NET (30 s). Es, paradójicamente, el comportamiento **correcto** — el resto del proyecto usa `CommandTimeout = 9999999` (~115 días); ver `WalletCustomerMethods.cs:36` y `:191`.

9. **🔴 Manejo de error: `e.Message` se retorna como si fuera la cuenta.** Líneas 152–156:
   ```csharp
   catch (Exception e)
   {
       // Logger.CustomerService("ERROR ", e.Message);   ← COMENTADO
       cuentaC = e.Message;
   }
   ```
   - El **log está comentado** (línea 154). El error no queda registrado en ningún lado: ni en `customerService.log` ni en ninguna otra bitácora. Violación total de la Regla #8.
   - El mensaje de la excepción se devuelve al consumidor con **HTTP 200**, en el mismo campo donde debería ir una cuenta de cliente. Un `SqlException` filtra nombre de servidor, base y estructura de tablas.
   - El mismo patrón comentado se repite en `GetSerieMonedero` (línea 119) y `GetWalletCustomerDetails` (línea 54): **es sistemático en toda la clase.**

10. **No hay Stored Procedures, ni servicios externos, ni escrituras** en este flujo: es un único `SELECT` de lectura.

### Lógica duplicada dentro de la propia LAN

`OrderMethods.GenerarMonedero` (`OrderMethods.cs:1406–1514`) resuelve **el mismo dato** con una consulta casi idéntica, pero por otra llave (líneas **1414–1435**):

```csharp
string query = string.Format(@"SELECT ISNULL(cliente, '')
from venta WITH (NOLOCK) WHERE id = '{0}'", idVenta);
```

Misma tabla, mismo campo, mismo `ISNULL`, misma inyección por `string.Format`, mismo `while` sobrescribiente — solo cambia el filtro (`Venta.ID` en vez de `Venta.ReferenciaOrdenCompra`). Es **copy-paste**, y es el consumidor real de la "cuenta C" en producción: alimenta el flujo de generación de monedero al afectar un pedido (`OrderMethods.cs:693–695`). Ver §Referencias cruzadas.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Venta` | N/A (Inline SQL) | Select | `ReferenciaOrdenCompra` (filtro, **concatenado — inyección SQL**), `Cliente` (proyectado vía `ISNULL(...,'')`) — `WITH (NOLOCK)`, sin `TOP`, sin `ORDER BY`, sin filtro por `Mov`/`Estatus` |

Una sola conexión y una sola query por request. **Sin Stored Procedures. Sin servicios externos.**

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** (existe al menos una `Venta` con esa `ReferenciaOrdenCompra`) — **HTTP 200**:
```json
"C00012345"
```
La DMZ le aplica `.Trim('"')` y devuelve el texto plano `C00012345`.

**Caso sin coincidencias** (folio inexistente, o pedido B2C cuyo `ReferenciaOrdenCompra` está vacío) — **HTTP 200**:
```json
"None"
```
Centinela mágico. Indistinguible de una cuenta real para un consumidor que no conozca la convención.

**Caso "encontrado pero vacío"** (fila existe con `Cliente` NULL) — **HTTP 200**:
```json
""
```
Tercer desenlace no documentado: el `ISNULL(Cliente,'')` convierte el nulo en cadena vacía, que **no** es `"None"`.

**Caso de error** (BD caída, timeout, inyección malformada) — **HTTP 200**:
```json
"Incorrect syntax near 'x'."
```
El `e.Message` viaja como payload. **Sin log** (comentado en línea 154).

**Caso real hoy en producción vía DMZ** (defecto G-06) — **HTTP 200**:
```
System.Net.WebException: The remote server returned an error: (404) Not Found.
   at System.Net.WebClient.DownloadString(Uri address)
   at WebApiMagento.Helper.Curl.Get(String url) ...
```
La LAN **nunca llega a ejecutarse**. Ver [[01_DMZ_Controller]].

> **Cinco desenlaces distintos, todos con HTTP 200 y todos en el mismo campo `string`. El consumidor no puede distinguir éxito de fallo por ningún medio.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **🔴 Inyección SQL directa desde un parámetro de ruta (`WalletCustomerMethods.cs:132–133`).** `string.Format` con el valor de URL embebido entre comillas simples. Vulnerabilidad de seguridad explotable por cualquier cliente autenticado (`[Authorize]` es la única barrera). **Prioridad 1, independientemente de la migración a SAP.** El mismo archivo demuestra que el equipo sabe usar `SqlParameter` (líneas 29–35, 178–190) — es un descuido, no un patrón.

2. **🔴 Endpoint roto extremo a extremo (G-06).** Prefijo y verbo desalineados entre DMZ y LAN. Ver [[01_DMZ_Controller]]. Migrarlo "tal cual" replicaría un endpoint que nunca ha funcionado.

3. **🔴 `ReferenciaOrdenCompra` ≠ `IDEcommerce` — el nombre del parámetro contradice la semántica.** El método se llama `GetCuentaCByIdEcommerce` y su parámetro `idEcommerce`, pero filtra `Venta.ReferenciaOrdenCompra`. Que son campos distintos lo prueba `OrderMethods.cs:302` (`idEcommerce IN (…) OR ReferenciaOrdenCompra IN (…)`) y `WholesaleCustomerMethods.cs:207` (donde `ReferenciaOrdenCompra` se puebla desde el folio de una **cotización negociable B2B**). **Requiere definición de negocio:** ¿el consumidor debe enviar el `increment_id` de Magento (→ hay que cambiar la columna filtrada) o el folio de OC B2B (→ hay que renombrar el método y el parámetro)? No se asume (Regla #10).

4. **Resultado no determinista: sin `TOP`, sin `ORDER BY`, sin filtro por `Mov`/`Estatus`, y el `while` sobrescribe.** Un folio con varias filas en `Venta` (pedido + factura + NC, o MAVI + VIU) devuelve **cualquiera** de ellas. **Requiere definición de negocio:** ¿qué documento es el canónico?

5. **El `catch` devuelve `e.Message` como payload y el log está comentado** (líneas 152–156). Fuga de información + pérdida total de trazabilidad. El mismo patrón está comentado en `GetSerieMonedero:119` y `GetWalletCustomerDetails:54` — **hay que descomentarlo o sustituirlo por un logger real en los tres**.

6. **Centinela `"None"` en vez de `null` / 404.** Un string mágico que ningún consumidor valida. En la migración debe traducirse a **HTTP 404** (no encontrado) vs **HTTP 200 + DTO** (encontrado).

7. **Sin `using` y el `SqlDataReader` nunca se cierra.** El `Close()` de la conexión está dentro del `try`, después del punto de falla. Fuga de conexiones del pool bajo error sostenido.

8. **`WITH (NOLOCK)`** sobre `Venta`. Lectura sucia de datos transaccionales. Al migrar a OData deja de aplicar, pero debe documentarse que el comportamiento actual **tolera lecturas inconsistentes**.

9. **Trazabilidad cero (Regla #8).** Ni `INFO` del request ni `ERROR` del fallo, en ninguna de las tres capas (DMZ, LAN controller, negocio). Es el único flujo del módulo sin una sola línea de log activa.

10. **Método síncrono:** migrar a `async/await` con `ExecuteScalarAsync` (Regla #12). Prohibido `.Result` / `.Wait()`.

11. **Retorno `string` + `.Trim('"')` en DMZ.** Doble serialización parcheada a mano. Debe exponerse un DTO tipado.

12. **Lógica duplicada en `OrderMethods.GenerarMonedero` (`OrderMethods.cs:1414–1435`).** Misma consulta, misma inyección, distinta llave. Al migrar debe consolidarse en **un solo** resolvedor de cuenta de cliente.

13. **`ExecuteReader` para obtener un escalar.** Un `ExecuteScalar` con `TOP 1` sería suficiente y más barato.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN

**Regla #10 (Cero Suposiciones): no se asigna ningún servicio OData ni tabla SAP en este documento.**

Lo que dicen las fuentes maestras del share sobre este endpoint:

| Fuente | Clasificación asignada |
|---|---|
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` (línea 90) | `INTELISIS` → `INTELISIS`, **Not Migrated**, `TotalTablasODS = 0`, `EsNuestro = Mixto` |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 112) | `INTELISIS`, sin destino, sin %, **Not Migrated**, commit `b416730`, nota: *"Two defects… See G-06"* |
| `_ANALISIS_PREVIO/sin-intelisis.csv` (línea 213) | *"Sin destino - prefijo y verbo no coinciden con LAN"* — Destino `Ninguno`, estado **`Roto`** |
| `_ANALISIS_PREVIO/DMZ-Backlog-Migracion-SAP.md` (línea 216) | **❌ FALTA + 🔴 ROTO** — propone endpoint nuevo `GET customer/wallet/bp/{incrementId}` |
| `_ANALISIS_PREVIO/APIMagento-conteo-rutas.md` (línea 69) | Ruta LAN marcada **⚠️ Huérfana** |
| `_EXCLUIDOS_Intelisis.md` | **Sin fila.** No aparece (sí aparecen sus vecinos de monedero de `CreditController`: líneas 68, 69, 71) |
| `_INVENTARIO_NoIntelisis.csv` | **Sin fila** (mismos vecinos presentes en líneas 24, 25, 27) |
| `_GLOBAL_MASTER_DB.csv` | **Sin fila** para `WalletCustomerController` |
| `MIGRATION_STATUS_MASTER_v3.csv` | **No existe en el share** (`MappingMetods/` solo tiene `_v2`). La copia local del repo sí lo tiene, con contenido idéntico a `_v2` para esta línea |

**Sin contradicción documental de fondo:** las cinco fuentes que sí lo mencionan coinciden en `INTELISIS` / `Not Migrated` / roto. La única propuesta de destino (`GET customer/wallet/bp/{incrementId}`, backlog línea 216) es una **sugerencia de diseño del análisis previo, no un compromiso de arquitectura** — no está respaldada por ninguna especificación en `Resources/` y por Regla #10 **no se adopta aquí**.

Sí hay un **conflicto de existencia**: el endpoint está inventariado como pendiente de migrar, pero está **roto desde su nacimiento y sin consumidor conocido**. Migrar código muerto es la peor opción de las tres disponibles.

### Puntos a cerrar con el Líder Técnico

1. **¿Se migra, se corrige o se retira?** Está roto desde el commit `b416730`, no tiene consumidor identificado en `MAGENTO_WEB_ADOBE\` y su lógica está duplicada internamente en `OrderMethods.GenerarMonedero`. Decisión de **alcance**, previa a todo lo demás.
2. **Si se conserva: ¿cuál es la llave real?** `Venta.ReferenciaOrdenCompra` (comportamiento actual, folio de OC B2B) o `Venta.IDEcommerce` (lo que el nombre del método promete). En SAP esto determina si el `$filter` va contra `PurchNoC` o `PurchNoS` en el documento de ventas — y la spec de SD36 exige al menos uno de los dos o arroja el error lógico `ZSD 001`.
3. **Criterio de desempate cuando el folio devuelve varias `Venta`.** ¿La factura vigente? ¿La no cancelada? ¿La más reciente? Hoy es aleatorio (obs. 4). Sin esta regla no se puede escribir el `$filter` ni el `$orderby` destino.
4. **¿La "cuenta C" sigue existiendo como concepto en SAP?** El valor devuelto es `Venta.Cliente` (código de cliente Intelisis, formato `C########`). Hay que confirmar si el destino es el `BusinessPartner` de `ZB_DATOS_CLIENTE_CDS` (BP05) y **si el código conserva el formato** o requiere tabla de equivalencias Intelisis↔SAP. Aplica Regla #1.
5. **Corrección de seguridad inmediata (obs. 1), sin esperar a la migración.** La inyección SQL de `WalletCustomerMethods.cs:132` es explotable hoy desde la LAN aunque la ruta DMZ esté rota. Debe parchearse con `SqlParameter` en la rama actual.
6. **Alinear verbo y prefijo** en la corrección: ¿`GET customer/wallet/getCuentaC/{folio}` en ambas capas, o `POST` con body? Determina si el puente DMZ usa `PostSAP` o requiere un `GetSAP` **que hoy no existe en `Helper/Curl.cs`**.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el 1 (alcance) y el 5 (seguridad, que no depende de ninguno de los otros).

---

## Referencias cruzadas

- **Capas de este mismo flujo:** [[01_DMZ_Controller]] · [[02_LAN_Controller]] · [[03_BusinessMethod_DB.csv]]
- **Endpoints hermanos del controlador:**
  - [[details]] — `POST customer/wallet/details` (`WalletCustomerController.cs:15–37` LAN / `14–49` DMZ). **Único ya migrado a SAP** (`curl.PostSAP`, DMZ línea 39). Es el patrón de puente a replicar.
  - [[getMinimumCostToRedeem]] — `POST customer/wallet/getMinimumCostToRedeem` (`WalletCustomerController.cs:48–54` LAN).
- **Métodos hermanos en `WalletCustomerMethods.cs`:**
  - `GetWalletCustomerDetails` (líneas **18–59**) — mismo patrón de `e.Message` como payload y log comentado.
  - `GetSerieMonedero` (líneas **61–123**) — invoca el SP `[[SP_MAVIDM0173RedimeOGeneraMONE]]` (línea 101), **fuente no disponible** (listado como faltante en la espec §5). También tiene inyección por `string.Format` (líneas 69–70) y una **recursión sin condición de corte visible** en la línea 114.
- **Consumidor real de la "cuenta C" en producción (flujo de monedero al afectar pedido):**
  - `OrderMethods.GenerarMonedero` (`OrderMethods.cs:1406–1514`), invocado desde `OrderMethods.cs:695`. Resuelve la cuenta con una **consulta duplicada** (`OrderMethods.cs:1414–1435`) filtrando por `Venta.ID`.
  - SPs de monedero que ese flujo encadena: [[xpVerificarMovMonederoMAVI]] (`OrderMethods.cs:1440`) → `SP_DM0312TarjetaSerieMovMAVI` (`OrderMethods.cs:1464`) → [[spGenerarMovMonederoMAVI]] (`OrderMethods.cs:1494`).
    > **Los fuentes `spGenerarMovMonederoMAVI.sql` y `xpVerificarMovMonederoMAVI.sql` SÍ existen en `SPsOrden/`, pero este endpoint NO los invoca.** Pertenecen al flujo de `OrdersController`. No se disecciona su lógica aquí para no atribuirla al endpoint equivocado (Regla #5); corresponde documentarla en el mapeo de `setOrder`.
- **Método que usa la misma llave `ReferenciaOrdenCompra`:**
  - `WholesaleCustomerMethods` (`WholesaleCustomerMethods.cs:187, 192, 207`) — **la puebla** con `negotiableQuoteRequest.folioIdEcommerce` al insertar una cotización negociable B2B. Es el origen real de los valores que este endpoint busca.
  - `OrderMethods.cs:302` — consulta `idEcommerce` y `ReferenciaOrdenCompra` como **alternativas**, prueba de que son campos distintos.
- **Flujo de unificación de monedero (`CreditController`) — solapamiento por llave `IdEcommerce`:**
  - [[GetUnificationWalletStatus]] (`CreditController.cs:489–496` → `CreditMethods.SelectUnificationWalletStatus`, `CreditMethods.cs:1644–1663`) — consulta [[CREDIHUnificacionMonedero]] por `IdEcommerce`.
  - [[CheckAccountsPreUnification]] (`CreditController.cs:506–516` → `CreditMethods.cs:1665–1671`) — deriva la **UEN** del primer carácter del `IdEcommerce` (`data.IdEcommerce[0].Equals('1') ? 2 : 1`), regla de negocio embebida.
  - [[SetUnificationWalletData]] (`CreditController.cs:524–534` → `CreditMethods.InsertUnificationWallet`, `CreditMethods.cs:1678–1709`) — inserta en `CREDIHUnificacionMonedero`.
  - **Solapamiento concreto:** ambos flujos resuelven "de qué cuenta de cliente es este pedido eCommerce" para operar su monedero, pero por **llaves distintas y sin compartir código**: `getCuentaC` filtra `Venta.ReferenciaOrdenCompra`; la unificación usa `CREDIHUnificacionMonedero.IdEcommerce` y `Cte.SerieMonedero` / `SerieMonederoVIU`. Además, la unificación **sí** tiene logging (`Logger.Credit` INFO+ERROR) y `try/catch`, mientras que `getCuentaC` no tiene ninguno de los dos. **Al migrar deben unificarse bajo un mismo resolvedor de cuenta y una misma convención de llave.**
- **Método análogo en otro controlador (mismo problema de llave):** [[obtenerVentanaConfirmacion]] (`CustomerServiceMethods.cs:149–206`) — resuelve datos de cliente por pedido eCommerce, pero filtra `Venta.IDEcommerce` **y** acota con `Mov IN ('Factura VIU','Factura')`. Es la implementación más correcta del mismo concepto.
- **Inventario de alcance:** [[_ENDPOINTS_NoSAP]] · [[MIGRATION_STATUS_MASTER_v2]] · [[DMZ-Backlog-Migracion-SAP]] · [[sin-intelisis]] · [[APIMagento-conteo-rutas]]
- **Frontend:** **sin consumidor identificado en `MAGENTO_WEB_ADOBE\`.** Búsqueda de `getCuentaC` / `cuentaC` sobre `.php`, `.js` y `.xml` del proyecto Adobe Commerce: **0 coincidencias**. Consistente con que la ruta esté rota extremo a extremo.

---

#migracion #SAP #analisis_bd #dotnet #WalletCustomerController #getCuentaC #monedero #bloqueante
