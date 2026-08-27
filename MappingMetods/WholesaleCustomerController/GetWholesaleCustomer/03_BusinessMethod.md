# Mapeo del Método: `WholesaleCustomerMethods.GetWholesaleCustomer()` — Lógica de Negocio

**Endpoint:** `GET /company/wholesale-customer/{wholesaleAccount}`
**Archivo:** `APIMagento/WebApiMagento/Metodos/WholesaleCustomerMethods.cs`
**Método:** `internal string GetWholesaleCustomer(String wholesaleAccount)` — Líneas **13–57**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Resolver la **razón social** asociada a una cuenta de cliente mayorista, para mostrarla en el panel de empresa de Magento B2B y en los correos de cotización negociable.
**Región:** `#region WholesaleCustomer` (líneas 12–58)

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

**No existe modelo de request.** El endpoint es `GET` y recibe un único **parámetro de ruta**:

| Campo | Tipo | Origen | Uso dentro del método |
|---|---|---|---|
| `wholesaleAccount` | `String` | Segmento de ruta `{wholesaleAccount}` | Único parámetro. Se inyecta como `@wholesaleAccount` contra `cte.Cliente` |

El archivo `APIMagento/WebApiMagento/Models/WholesaleCustomerRequest.cs` (líneas 8–20) **no participa en este flujo**: contiene únicamente la clase `NegotiableQuoteRequest`, usada por el endpoint hermano `POST /company/negotiable-quote/create`. En DMZ, el archivo espejo `APIMagentoDMZ/WebApiMagento/Models/WholesaleCustomerRequest.cs` cumple el mismo rol.

**Validación de formato:** la regex `^C[0-9]{8,9}$` vive exclusivamente en la DMZ (`APIMagentoDMZ/.../WholesaleCustomerController.cs:20`). Este método **no valida nada**.

---

## Flujo de Ejecución Detallado

```csharp
internal string GetWholesaleCustomer(String wholesaleAccount)
{
    Connection connection = new Connection();
    string response = "response";

    try
    {
        SqlConnection sqlConnection = new SqlConnection(connection.sCadenaConexion);
        string query = "SELECT Nombre FROM cte WITH(NOLOCK) WHERE Cliente = @wholesaleAccount";

        SqlParameter wholesaleParameter = new SqlParameter();
        wholesaleParameter.SqlDbType = SqlDbType.VarChar;
        wholesaleParameter.ParameterName = "@wholesaleAccount";
        wholesaleParameter.Value = wholesaleAccount;

        SqlCommand sqlCommand = new SqlCommand(query, sqlConnection);
        sqlCommand.Parameters.Add(wholesaleParameter);
        sqlCommand.CommandTimeout = 9999999;

        sqlConnection.Open();
        SqlDataReader sqlDataReader = sqlCommand.ExecuteReader();

        if (sqlDataReader.HasRows)
        {
            while (sqlDataReader.Read())
            {
                response = sqlDataReader.GetString(0);
            }
        }
        else
        {
            response = "null";
        }

        sqlDataReader.Close();
        sqlConnection.Close();
    }
    catch (Exception e)
    {
        Logger.CustomerService("ERROR ", e.Message);
        response = e.Message;
    }

    return response;
}
```

1. **Conexión:** instancia `new Connection()` (línea 15) y usa `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)* **No se usa `using`**: la conexión se abre manualmente (línea 32) y se cierra al final del `try` (línea 48).

2. **Valor inicial `"response"` — literal centinela inalcanzable.** `string response = "response";` (línea 16). Las tres ramas del método sobrescriben la variable (nombre encontrado / `"null"` / `e.Message`), por lo que el literal `"response"` **nunca puede salir**. Es ruido copiado del estilo del proyecto; si alguna vez se alcanzara, el consumidor recibiría la palabra `response` como si fuera la razón social.

3. **Consulta única (inline SQL, sin SP):** un `SELECT` de una sola columna sobre una sola tabla, con `WITH(NOLOCK)`:

   | Tabla | Rol | Campo proyectado | Filtro |
   |---|---|---|---|
   | `cte` | Tabla única (maestro de clientes Intelisis) | `Nombre` | `Cliente = @wholesaleAccount` |

   > **No hay `JOIN` a `CteEnviarA`, ni filtro por `Categoria`, `Canal`, `UEN`, `Estatus` ni grupo de cuenta.** Ver observación 1 — es el hallazgo funcional más importante del endpoint.

4. **Parametrización:** `SqlParameter` construido por propiedades (`SqlDbType = VarChar`, `ParameterName = "@wholesaleAccount"`, `Value = wholesaleAccount`) — **correctamente parametrizado, sin riesgo de inyección**. Se omite `Size`, por lo que ADO.NET infiere la longitud del valor; con `VarChar` sin tamaño explícito puede provocar recompilaciones del plan de ejecución por cada longitud distinta de cuenta (8 vs 9 dígitos → dos planes).

5. **`CommandTimeout = 9999999`** (línea 30, ~115 días). Sin timeout efectivo.

6. **Lectura del resultado:** `if (sqlDataReader.HasRows) { while (sqlDataReader.Read()) { response = sqlDataReader.GetString(0); } }`. La consulta **no tiene `TOP 1` ni `ORDER BY`**, así que si `Cte.Cliente` no fuera clave única el loop **sobrescribiría `response` en cada iteración y devolvería el último registro leído**, de forma no determinista. En Intelisis `Cte.Cliente` es la PK, por lo que hoy retorna una sola fila; el código no lo garantiza.

7. **`GetString(0)` sin `IsDBNull`.** Si `cte.Nombre` es `NULL`, `GetString` lanza `SqlNullValueException` → cae al `catch` → el mensaje de la excepción se devuelve como si fuera la razón social. Ver observación 3.

8. **Centinela de "no encontrado":** la rama `else` asigna el **string literal** `"null"` (línea 44), **no** `null` ni cadena vacía. Ese literal es lo que la DMZ intenta detectar con `response.Contains("null")` ([[01_DMZ_Controller]] obs. 1). Es un contrato implícito, frágil y no documentado entre las dos capas.

9. **Cierre:** `sqlDataReader.Close()` y `sqlConnection.Close()` (líneas 47–48) **dentro del `try`**, después del bloque de lectura. Si `GetString(0)` falla, ni el reader ni la conexión se cierran explícitamente.

10. **Manejo de error:** el `catch (Exception e)` (líneas 50–54) registra con `Logger.CustomerService("ERROR ", e.Message)` — que escribe en `C:\inetpub\wwwroot\log\customerService.log` (ver `Helper/Logger.cs` líneas **134–142**) — y **asigna `e.Message` a `response`**, que se retorna como si fuera el payload.

**No hay Stored Procedures, ni servicios externos, ni escrituras** en este flujo: es un único `SELECT` de lectura sobre una tabla.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `cte` | N/A (Inline SQL) | Select | `Cliente` (`= @wholesaleAccount`), `Nombre` (proyectado, sin validación de NULL) — `WITH(NOLOCK)` |

Una sola conexión y una sola query por request. **Sin SPs faltantes**: no se invoca ningún procedimiento almacenado, por lo que **no se genera `_SPS_FALTANTES.txt`** para este endpoint.

> **`SPsOrden/SpVTASListaNBMagento.sql` — revisado y descartado.** Se verificó su contenido: gestiona listas negra/blanca de clientes (`VTASCListaNegra` / `VTASCListaBlanca`) con parámetros `@Tipo`, `@Correo`, `@Lista`, `@NumPedido`… **No es un SP de listas de precio mayorista** y **no tiene relación con este endpoint**. **No existe lógica de precios especiales ni de lista de precio mayorista en este flujo** — el único punto del controlador donde aparece un precio es el endpoint hermano `POST /company/negotiable-quote/create`, y ahí el precio **llega desde Magento** (`item["precio"]` → `VENTAD.Precio` y `VENTAD.PrecioSugerido`, `WholesaleCustomerMethods.cs:105–106`), sin consultar ninguna lista de precios en Intelisis.

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** (cuenta existente en `cte`) — **HTTP 200**:

Lo que devuelve la LAN (Web API serializa el `string` como literal JSON):
```json
"COMERCIALIZADORA DEL BAJIO SA DE CV"
```
Lo que devuelve la **DMZ** (segunda serialización sobre el texto ya encomillado, ver [[01_DMZ_Controller]] obs. 2):
```json
"\"COMERCIALIZADORA DEL BAJIO SA DE CV\""
```
Por eso el frontend ejecuta `str_replace("\"", "", ...)` y `str_replace("\\", "", ...)` en `WholesaleAccountManagement.php:154–155`.

**Caso sin coincidencias** (cuenta con formato válido pero inexistente en `cte`) — **HTTP 400** desde la DMZ:
```json
{ "Message": "Customer not found." }
```
La LAN devolvió `"null"` (HTTP 200); la DMZ lo detecta con `Contains("null")` y lo convierte en `BadRequest`. **Semánticamente debería ser 404.**

**Caso de formato inválido** (no cumple `^C[0-9]{8,9}$`) — **HTTP 400**:
```json
{ "Message": "12345 is not a valid wholesale account." }
```

**Caso de error real** (BD caída, timeout, `Nombre` NULL) — **HTTP 200 o HTTP 400, según el texto de la excepción**:
```json
"Login failed for user 'usrintranet'."
```
La LAN retorna `e.Message` con **HTTP 200**. La DMZ evalúa `Contains("null")`:
- Si el mensaje **no** contiene `null` → **HTTP 200 con el texto de la excepción presentado como razón social del cliente**. El frontend lo pinta tal cual en el correo de cotización (`NegotiableQuoteManagementPlugin.php:153`, variable `wholesaleCustomer`).
- Si el mensaje **sí** contiene `null` (p. ej. `Data is Null. This method or property cannot be called on Null values.` por `GetString` sobre `Nombre` NULL) → **HTTP 400 "Customer not found."**, ocultando el fallo real.

> **Cuatro desenlaces, y el código de estado depende de si la palabra `null` aparece o no en el texto de una excepción.** No hay ninguna ruta por la que el consumidor pueda distinguir "no existe" de "la base falló".

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **El endpoint "mayorista" no filtra por nada mayorista — hallazgo funcional principal.** La query es `SELECT Nombre FROM cte WHERE Cliente = @wholesaleAccount`. **Cualquier cliente de menudeo** cuya clave case con `^C[0-9]{8,9}$` devuelve su razón social por este endpoint. La única "mayoreidad" del flujo es el formato de la clave, impuesto por una regex en la DMZ.
   - Contraste directo dentro del mismo proyecto: `CreditMethods.AccountType()` (`APIMagento/WebApiMagento/Metodos/CreditMethods.cs:1719–1743`) sí discrimina canal y categoría:
     ```csharp
     string ids = uen == 1 ? "3, 76" : "7";
     string query = $@"SELECT * FROM Cte WITH(NOLOCK)
         JOIN CteEnviarA ON CteEnviarA.Cliente = cte.Cliente
         WHERE Cte.Cliente = @Account
         AND CteEnviarA.ID IN ({ids})
         AND CteEnviarA.Categoria = @Categorie;";
     ```
     Mismo patrón de **IDs de canal y categorías hardcodeadas** señalado en [[CheckAccountsPreUnification]] obs. 4 (`3, 76`, `7`, `"CREDITO MENUDEO"`), y repetido en `CreditMethods.cs:1533`, `1835–1838` y `CustomerServiceMethods.cs:1421`.
   - **Decisión requerida (Regla #10):** ¿el endpoint *debe* validar pertenencia al canal de mayoreo? Si sí, hoy hay un **hueco de autorización de datos**: se expone la razón social de clientes fuera del segmento B2B. Si no, el nombre del endpoint miente y debe renombrarse. **No se asume ninguna de las dos.**

2. **`e.Message` retornado como payload.** El `catch` asigna el mensaje de excepción a la variable de respuesta (línea 53). Consecuencias:
   - **Fuga de información:** un `SqlException` expone nombre de servidor, base, usuario y estructura de tablas hacia el consumidor — y aquí **sí llega al cliente**, porque la DMZ retorna `Ok(response)` sin filtrar cuando el texto no contiene `null`.
   - **Corrupción de datos aguas abajo:** el frontend inserta el valor como `wholesaleCustomer` en la plantilla de correo enviada al departamento de ventas (`NegotiableQuoteManagementPlugin.php:141, 153`). Un fallo de BD se convierte en un correo con un stack trace en el campo de razón social.

3. **`GetString(0)` sin verificación de `NULL`.** `cte.Nombre` sin valor lanza `SqlNullValueException`. Debe usarse `IsDBNull` / `SafeGetString` en la migración.

4. **`Contains("null")` como protocolo entre capas.** El acoplamiento LAN↔DMZ se sostiene sobre un literal de texto (`"null"`, línea 44) detectado por subcadena en la DMZ. Cualquier cambio de mensaje rompe la semántica. Detalle completo en [[01_DMZ_Controller]] obs. 1.

5. **Sin `using` en `SqlConnection` ni `SqlDataReader`.** Si `GetString(0)` lanza, ni el reader ni la conexión se cierran (los `Close()` están dentro del `try`, después del punto de falla). La liberación queda a merced del pool/GC. **Patrón inconsistente dentro del propio archivo:** `getUnidadArt` (líneas 137–174) **sí** usa `using` anidado correctamente en conexión, comando y reader.

6. **Log escrito en el archivo equivocado.** `Logger.CustomerService("ERROR ", ...)` (línea 52) manda los errores de este módulo a `customerService.log`. **No existe `Logger.Wholesale`** — se verificó la lista completa de `Logger.cs` (16 métodos, ninguno de mayoreo). Los errores de mayoreo quedan mezclados con los de atención a clientes, y el `type` `"ERROR "` lleva un espacio final inconsistente con el resto del proyecto (Regla #8).

7. **Sin log de `INFO`.** No se registra la cuenta consultada ni el resultado, en ninguna de las tres capas. Regla #8 incumplida de punta a punta.

8. **`CommandTimeout = 9999999`.** Sin timeout real: una query bloqueada retiene el hilo de IIS indefinidamente. Fijar 30–60 s al migrar.

9. **Variable inicial `"response"` inalcanzable** (línea 16) — código muerto que además sería un valor absurdo si alguna refactorización lo hiciera alcanzable.

10. **`while (dr.Read())` sin `TOP 1` ni `ORDER BY`.** Hoy inocuo por la PK de `Cte`, pero el código devuelve "la última fila leída" sin criterio de desempate declarado.

11. **`WITH(NOLOCK)` sobre el maestro de clientes.** Lectura sucia; puede devolver una razón social a medio actualizar. Al migrar a OData deja de aplicar, pero debe documentarse que **el comportamiento actual tolera lecturas inconsistentes**.

12. **`SqlParameter` sin `Size`.** `VarChar` sin longitud declarada → posible proliferación de planes de ejecución. Menor, pero trivial de corregir.

13. **Método síncrono:** migrar a `async/await` con `ExecuteReaderAsync` (Regla #12). Prohibido `.Result` / `.Wait()`.

14. **Contrato de respuesta no tipado.** El método devuelve `string` crudo, se serializa dos veces y el frontend deshace el daño con `str_replace`. En ServicioSAP debe exponerse un DTO tipado (p. ej. `WholesaleCustomerResponse { cuenta, nombre }`) y eliminarse el parche de `WholesaleAccountManagement.php:154–155`.

15. **Sin `GetSAP` en el helper `Curl` — bloqueante de migración.** Ver [[01_DMZ_Controller]] obs. 5: `Helper/Curl.cs` no expone ningún verbo GET hacia SAP.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

**Las fuentes maestras del share se contradicen sobre este endpoint y ninguna lo asigna a un servicio OData concreto:**

| Fuente | Qué dice sobre `GET company/wholesale-customer/{wholesaleAccount}` |
|---|---|
| `MIGRATION_STATUS_MASTER_v2.csv` (línea **114**) | `(candidate) product/articulos/ie/mayorista` — `GET` — `SAP (ZAPI_ARTICULOS_SRV)` — estado **In Progress** — nota: *"Wholesale article endpoint exists on SAP; customer-side not repointed."* |
| `_EXCLUIDOS_Intelisis.md` (línea **239**) | `WholesaleCustomerController (2)` clasificado **100% Intelisis por clasificación previa, "sin evidencia verificada en este barrido"** |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` (línea **91**) | **Solo aparece el endpoint POST** (`company/negotiable-quote/create`). **El GET de este documento NO está inventariado en absoluto.** |
| `_ANALISIS_PREVIO/DMZ-Backlog-Migracion-SAP.md` (línea **225**) | `GET wholesale-customer/{acct}` → origen `Intelisis: Cte mayorista` → estado **⚠️ PARCIAL** → *"Base: `GET partner/client/{clientId}` + filtrar por rol/grupo de cuenta mayorista"* |
| `_INVENTARIO_NoIntelisis.csv` | **Sin coincidencias** para `wholesale`. |
| `MIGRATION_STATUS_MASTER_v3.csv` | **El archivo no existe en el share.** La versión vigente es `MIGRATION_STATUS_MASTER_v2.csv`. |

**Contradicciones a resolver, en orden de gravedad:**

- **`ZAPI_ARTICULOS_SRV` es un servicio de artículos, no de clientes.** La fila 114 del master v2 propone como candidato `product/articulos/ie/mayorista`, que resuelve **precios/artículos de mayoreo**, mientras que este endpoint devuelve **la razón social de un Business Partner**. La asignación parece un error de captura en el master: el candidato correcto pertenece al dominio BP, no al de artículos.
- **El backlog DMZ (`GET partner/client/{clientId}`) es el candidato coherente**, y coincide con la línea 5 del mismo documento (línea **69**), que agrupa `company/wholesale-customer/{acct}` junto a `customerService/validarCliente`, `nombreCliente` y `credit/getCreditAccount` bajo el mismo destino `GET partner/client/{clientId}` con la nota *"Requiere adaptadores de contrato"*.
- **El endpoint no está en el inventario de alcance** (`_ENDPOINTS_NoSAP.csv`), mientras su hermano POST sí. Es un **hueco de inventario**, no una exclusión declarada.

Conforme a la **Regla #10 (Cero Suposiciones)**, **no se asigna ningún servicio OData ni tabla SAP en este documento**. Análisis de viabilidad de los candidatos citados por las fuentes:

### 1. `cte.Nombre` → módulo BP / BP05 — viable, con un gap de filtrado
La evidencia disponible en `Resources/` es consistente en que los `SELECT` sobre `Cte` se reemplazan por el maestro de Business Partner:
- `Resources/dmz_orders_sap_mapping.md` línea **93**: *"Se consumirá el OData **BP05** (Business Partner). En lugar de cruzar la tabla local `Cte`, se consultarán los datos maestros de SAP filtrando por el ID…"*.
- `Resources/lan_tables_to_sap_master.md` línea **116**: *"Tablas `Cte`, `TrWDM0285_CteRecoge`, `DM0312DatosEntrega` → **Módulo BP (Business Partner)**"*.
- `Resources/implementation_plan_master.md` líneas **40, 46, 49, 71, 72**: cinco endpoints que hoy leen `Cte` (`codigoRecomendado`, `getCreditAccount`, `ExistRFCAndPhoneCte`, `validarCliente`, `nombreCliente`) están todos marcados *"Por definir / SAP BP05"*.

- **A confirmar:** si `Cte.Cliente` (formato `C` + 8/9 dígitos) mapea directo al `BusinessPartner` de SAP o requiere tabla de equivalencias. Los otros endpoints de `Cte` enfrentan exactamente la misma pregunta y **ninguno la tiene cerrada**.
- **A confirmar:** qué campo de BP05 corresponde a `Cte.Nombre` (razón social completa) frente a la descomposición en nombre/apellidos que usa `customerService/nombreCliente`.

### 2. Discriminación "mayorista" → **SIN DEFINICIÓN (bloqueante funcional)**
El backlog DMZ exige *"filtrar por rol/grupo de cuenta mayorista"*, pero:
- **El código actual no filtra por nada** (observación 1). No existe un criterio implementado que copiar.
- El criterio análogo más cercano del proyecto es el `JOIN CteEnviarA ... Categoria` de `CreditMethods.AccountType`, con IDs de canal hardcodeados — y **no hay catálogo de equivalencias `CteEnviarA.Categoria` / canal Intelisis → rol o grupo de cuentas SAP** en `Resources/`.
- **Decisión requerida:** ¿se implementa en SAP el filtro que hoy no existe (cambio de comportamiento, potencialmente rompe consumidores) o se replica la conducta actual "cualquier BP con esa clave"?

### 3. Contrato de salida → requiere rediseño obligatorio
El contrato actual (`string` crudo, doble encomillado, `"null"` como centinela, `e.Message` como payload) **no es portable**. La migración obliga a definir un DTO y códigos HTTP correctos (200 / 404 / 500), lo que **rompe al consumidor de Magento** (`WholesaleAccountManagement.php:129–156`), que hoy depende del `str_replace` y de que "no encontrado" llegue como 400.

### Puntos a cerrar con el Líder Técnico

1. **Corregir el master v2 línea 114:** `ZAPI_ARTICULOS_SRV` / `product/articulos/ie/mayorista` no puede ser el destino de un endpoint que devuelve razón social de cliente. Confirmar si el candidato correcto es `GET partner/client/{clientId}` (BP05) como indica el backlog DMZ línea 225.
2. **Dar de alta el endpoint en `_ENDPOINTS_NoSAP.csv`**, donde hoy solo está el POST hermano. Sin eso, el GET no tiene dueño ni fecha en el plan.
3. **Definir el criterio de "cuenta mayorista"** (punto 2 arriba): ¿rol de BP, grupo de cuentas, categoría de `CteEnviarA`? Es un cambio de comportamiento respecto al código actual, no una traducción — requiere aprobación de negocio.
4. **Aprobar el rediseño del contrato de respuesta** (DTO tipado + 404 real) y coordinar con el equipo de Magento la eliminación del `str_replace` de `WholesaleAccountManagement.php:154–155` y del manejo de 400 como "no encontrado".
5. **Implementar `Curl.GetSAP(...)` en la DMZ** (`Helper/Curl.cs`) o decidir explícitamente exponer el recurso como `[HttpPost]` en ServicioSAP. Hoy la Regla #16 **no se puede cumplir** para ningún endpoint GET de la DMZ.
6. **Resolver el acoplamiento del constructor de `Curl` al login SAP** (`Curl.cs:73–90`): endpoints legacy que no tocan SAP hoy caen con 500 si el login de ServicioSAP falla. Aplica a todo el proyecto, no solo a este endpoint.
7. **Confirmar si el mapeo `Cte.Cliente` → `BusinessPartner` es 1:1** o requiere tabla de equivalencias — decisión compartida con `validarCliente`, `nombreCliente`, `getCreditAccount`, `ExistRFCAndPhoneCte` y `codigoRecomendado`.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el criterio de "cuenta mayorista" (punto 3) y la corrección del master (punto 1).

---

## Referencias cruzadas

### Consumidor identificado en el frontend

**Sí hay consumidor verificado** en `MAGENTO_WEB_ADOBE`, módulo `Mavi_WholesaleAccount` (habilitado en `app/etc/config.php:841`):

| Archivo:línea | Rol |
|---|---|
| `app/code/Mavi/WholesaleAccount/Model/Api/WholesaleAccountManagement.php:142–156` | `getWholesaleCustomerIntelisis()` — arma la URL como `<url_wholesale_customer>/<cuenta>` y hace **GET** vía `Omnipro\IntelisisIntegration\Model\Adapter::get()`. Limpia comillas y backslashes con `str_replace` (líneas 154–155). |
| `.../WholesaleAccountManagement.php:176–189` | La URL base **no está hardcodeada**: se lee de la config `mavi_cliente/wholesale_customer/general/url_wholesale_customer` (declarada en `etc/adminhtml/system.xml:11`). |
| `.../WholesaleAccountManagement.php:100–122` | `getWholesaleAccount(int $customerId)` — obtiene la cuenta desde `Magento\Company` y llama al endpoint. Expuesto como `POST /V1/company/wholesale-account` (`etc/webapi.xml:3–8`). |
| `app/code/Mavi/WholesaleAccount/Plugin/Model/NegotiableQuoteManagementPlugin.php:141, 153` | Segundo consumidor: inyecta la razón social como variable `wholesaleCustomer` en las plantillas de correo de cotización negociable (cliente y departamento de ventas). |

> **Dato relevante para la migración:** el consumidor invoca el endpoint **una vez por cotización creada** dentro del envío de correos, en línea con el flujo síncrono de Magento.

### Métodos hermanos en `WholesaleCustomerMethods.cs` — backlog de documentación

Recorrido completo de la clase (239 líneas, 5 métodos). **Solo 1 de 5 queda documentado con este entregable:**

| # | Método | Líneas | Visibilidad | Estado documental |
|---|---|---|---|---|
| 1 | `GetWholesaleCustomer(String)` | **13–57** | `internal` | ✅ **Documentado — este documento** |
| 2 | `CrateNegotiableQuote(NegotiableQuoteRequest)` | **61–65** | `internal` | ⚠️ Formato antiguo: [[Post_NegotiableQuoteCreate_Mapping]] — **falta reescribir al esquema de 4 archivos** |
| 3 | `InsertTableVentaD(NegotiableQuoteRequest, int)` | **69–134** | `private` | ⚠️ Cubierto parcialmente dentro del doc antiguo — **sin documento propio** |
| 4 | `getUnidadArt(string)` | **137–174** | `public` | ❌ **Sin documentar.** Único método `public` de la clase y el único que usa `using` correctamente. Consulta `SELECT unidad FROM art WITH(NOLOCK) WHERE Articulo = @Articulo`. **Se ejecuta una conexión nueva por cada artículo del carrito** (N+1) desde el loop de `InsertTableVentaD:91`. |
| 5 | `InsertTableVenta(NegotiableQuoteRequest)` | **177–236** | `private` | ⚠️ Cubierto parcialmente dentro del doc antiguo — **sin documento propio** |

**Deuda del módulo mayorista detectada al recorrer la clase completa** (no forma parte de este endpoint, se deja registrada como backlog):

- **Hardcodeo masivo de catálogo de negocio en `InsertTableVenta` (líneas 186–195):** `Empresa='MAVI'`, `Mov='Pedido Mayoreo'`, `UEN=3`, `Estatus='SINAFECTAR'`, `Situacion='En Revision Ventas Mayoreo'`, `SituacionUsuario='VENTM00094'`, `Condicion='CONTADO MAY FORANEO'`, `ZonaImpuesto='OCCIDENTE'`, `FormaPagoTipo='Mayoreo'`, `SucursalVenta/Origen/Destino=98`, `Impuesto1=16` (`InsertTableVentaD:82`) y un texto legal fijo en `Observaciones` (línea 208).
- **IDs de canal / almacén / agente hardcodeados en el controlador LAN** (`WholesaleCustomerController.cs:31–34`): `agente="P000098"`, `canal=11`, `almacen="V00096"`, `sucursal=98`. **El `canal` se escribe en la columna `VENTA.EnviarA` y `VENTAD.EnviarA`** (`WholesaleCustomerMethods.cs:202, 97`), es decir, el mismo dominio de datos que `CteEnviarA` explotado por `CreditMethods.AccountType`. **Mismo patrón de canal hardcodeado señalado en [[CheckAccountsPreUnification]]** (`3, 76` / `7`), aquí con el valor `11` y sin ninguna validación de que la cuenta tenga ese `EnviarA` dado de alta.
- **Sin transacción** en el par `VENTA` + `VENTAD`: un fallo a mitad del loop deja el encabezado y las partidas previas persistidos, sin rollback (`InsertTableVentaD:128–132`).
- **Parámetro muerto `@Cliente`** en `InsertTableVentaD:96`, declarado pero ausente del texto del `INSERT`.
- **Precio tomado tal cual desde Magento** sin validación contra ninguna lista de precios de Intelisis (`InsertTableVentaD:105–106`).

### Documentos y catálogos relacionados

- Endpoint hermano del mismo controlador: [[Post_NegotiableQuoteCreate_Mapping]] (`POST /company/negotiable-quote/create`)
- Patrón de canal/categoría hardcodeada en `Cte` / `CteEnviarA`: [[CheckAccountsPreUnification]] (`CreditMethods.cs:1719–1743`)
- Endpoints hermanos que leen `Cte` y comparten el destino BP05 sin cerrar: [[validarCliente]], [[nombreCliente]], [[getClienteSaldo]], [[ExistRFCAndPhoneCte]]
- Inventario y alcance: [[_EXCLUIDOS_Intelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v2]], [[DMZ-Backlog-Migracion-SAP]]
- SPs: **ninguno invocado.** `[[SpVTASListaNBMagento]]` revisado y descartado por no aplicar (listas negra/blanca, no listas de precio).

---

#migracion #SAP #analisis_bd #dotnet #WholesaleCustomerController #GetWholesaleCustomer #mayoreo #bloqueante
