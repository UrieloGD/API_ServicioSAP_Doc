# Mapeo del Método: `CustomerServiceMethods.ValidarCoberturaPorCP()` — Lógica de Negocio

**Endpoint:** `POST /customerService/validarCoberturaPorCP`
**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public string ValidarCoberturaPorCP(ValidarCoberturaPorCPRequest request)` — Líneas **1738–1899**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Valida, busca o enlista la cobertura de entrega (rutas Mavi) basándose en Código Postal, Estado o Delegación (Municipio), según la operación (`op`) solicitada.

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `ValidarCoberturaPorCPRequest` — `APIMagento/WebApiMagento/Models/CustomerServiceRequest.cs` líneas **119–127**:

| Campo | Tipo | Uso dentro del método |
|---|---|---|
| `op` | string | **Discriminador de operación.** Valores esperados: `states`, `delegations`, `table`, `coverage` |
| `search` | string | Se enlaza a `@Search` (Código Postal a validar) — usado solo en `op = coverage` |
| `uen` | int | **No se usa** dentro del método |
| `searchState` | string | Se enlaza a `@SearchState` — usado en `op = delegations` y `op = table` |
| `searchDelegation` | string | Se enlaza a `@SearchDelegation` — usado en `op = table` |
| `searchCologne` | string | **No se usa** dentro del método |

---

## Flujo de Ejecución Detallado

1. Instancia `Connection` (`APIMagento/WebApiMagento/Conn/Connection.cs`) y crea un `SqlConnection` con `conn.sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas de este documento intencionalmente — ver `Connection.cs` línea 26.)*

2. Arma dinámicamente **una** de cuatro consultas **SQL inline** (no existen Stored Procedures en este flujo), todas contra la tabla `CodigoPostal WITH (NOLOCK)`:

   - **`op == "states"`** → lista única de Estados con ruta habilitada:
     ```sql
     SELECT DISTINCT Estado
     FROM CodigoPostal WITH(NOLOCK)
     WHERE Colonia != 'SIN COLONIA'
       AND MaviRutaSupervision IS NOT NULL
       AND mavirutasupervision != ''
     ```

   - **`op == "delegations"`** → lista única de Delegaciones/Municipios de un Estado:
     ```sql
     SELECT DISTINCT Delegacion
     FROM CodigoPostal WITH (NOLOCK)
     WHERE Colonia != 'SIN COLONIA'
       AND MaviRutaSupervision IS NOT NULL
       AND mavirutasupervision != ''
       AND Estado = @SearchState
     ```

   - **`op == "table"`** → catálogo de CP/Colonias de una Delegación:
     ```sql
     SELECT CodigoPostal, Colonia, Delegacion, Delegacion AS Poblacion, Estado
     FROM CodigoPostal WITH (NOLOCK)
     WHERE Colonia != 'SIN COLONIA'
       AND MaviRutaSupervision IS NOT NULL
       AND mavirutasupervision != ''
       AND Estado = @SearchState
       AND Delegacion = @SearchDelegation
     ORDER BY CodigoPostal
     ```

   - **`op == "coverage"`** → **validación puntual de cobertura** de un CP:
     ```sql
     SELECT TOP 1 CodigoPostal, Colonia, Delegacion, Delegacion AS Poblacion, Estado
     FROM CodigoPostal WITH (NOLOCK)
     WHERE Colonia != 'SIN COLONIA'
       AND mavirutasupervision IS NOT NULL
       AND mavirutasupervision != ''
       AND CodigoPostal = @Search
     ORDER BY estado
     ```
     El CP se considera **con cobertura** si la consulta regresa al menos una fila.

3. Construye **siempre los tres** `SqlParameter` (`@SearchState`, `@SearchDelegation`, `@Search`, todos `SqlDbType.VarChar`) aunque la query seleccionada solo referencie un subconjunto; ADO.NET ignora los no utilizados.

4. Fija `CommandTimeout = 9999999`, abre la conexión y ejecuta `ExecuteReader()`.

5. Recorre el `SqlDataReader` fila por fila y construye objetos anónimos distintos según `op`:
   - `states` → `{ estado }`
   - `delegations` → `{ delegacion }`
   - `table` → `{ codigoPostal, colonia, delegacion, poblacion, estado }`
   - `coverage` → `{ codigoPostal, colonia, delegacion, poblacion, estado }` (máximo 1 elemento por el `TOP 1`)

6. Cierra `SqlDataReader` y conexión, serializa `listObject` con `JsonConvert.SerializeObject` y lo asigna a `respuesta`.

7. **Manejo de errores:** cualquier excepción se registra vía `Logger.CustomerService("ERROR ", e.Message)` (archivo de log local en disco, **no** es tabla de BD) y `respuesta` queda con el mensaje de la excepción en **texto plano**.

8. Retorna `respuesta` (string). El controlador LAN lo re-deserializa con `JsonConvert.DeserializeObject(...)` y lo envuelve en `Ok(...)`.

### Observaciones técnicas detectadas (deuda para la migración)

- **`op` desconocido:** si `request.op` no coincide con ninguno de los cuatro valores, `querySql` queda **vacío**; `ExecuteReader()` sobre comando vacío lanza excepción SQL que cae al `catch`. No hay validación previa del discriminador.
- **Error no tipado:** en el `catch`, `respuesta` regresa `e.Message` en texto plano. El controlador intenta `JsonConvert.DeserializeObject(...)` sobre ese texto, lo que puede provocar una excepción de deserialización **no capturada** en la capa controller.
- **Campos muertos:** `uen` y `searchCologne` viajan en el request pero nunca se usan (candidatos a eliminación según Regla #12).
- **Código síncrono:** el método es totalmente síncrono (`ExecuteReader()`); la migración debe reescribirse bajo `async/await` (`ExecuteReaderAsync`), conforme a la Regla #12 del skill.
- **`CommandTimeout = 9999999`** es un valor arbitrario heredado; revisar al migrar.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales | API SAP |
|---|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `CodigoPostal` | N/A (Inline SQL) | Select | `Estado` (DISTINCT) — caso `op=states` | `ZAPI_ZDMT_SEPOMEX` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `CodigoPostal` | N/A (Inline SQL) | Select | `Delegacion` (DISTINCT, por `@SearchState`) — caso `op=delegations` | `ZAPI_ZDMT_SEPOMEX` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `CodigoPostal` | N/A (Inline SQL) | Select | `CodigoPostal, Colonia, Delegacion, Poblacion, Estado` (por `@SearchState` + `@SearchDelegation`) — caso `op=table` | `ZAPI_ZDMT_SEPOMEX` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `CodigoPostal` | N/A (Inline SQL) | Select | `TOP 1 CodigoPostal, Colonia, Delegacion, Poblacion, Estado` (por `@Search`) — caso `op=coverage` | `ZAPI_ZDMT_SEPOMEX` |

**Sin Stored Procedures. Sin servicios externos** (no hay `Curl`, Magento, SAP ni LAN dentro de la lógica de negocio): el flujo es 100 % SQL inline contra `CodigoPostal` en Intelisis/IntelisisTmp.

*Nota: no se genera fila para `Logger.CustomerService`, ya que escribe en archivo de log local en disco, no en base de datos.*

---

## Ejemplo de Respuesta (Response)

El cuerpo HTTP siempre es un **arreglo JSON** (200 OK); su forma depende de `op`.

Caso `op = "states"`:
```json
[
  { "estado": "CIUDAD DE MEXICO" },
  { "estado": "ESTADO DE MEXICO" }
]
```

Caso `op = "delegations"`:
```json
[
  { "delegacion": "COYOACAN" },
  { "delegacion": "BENITO JUAREZ" }
]
```

Caso `op = "table"`:
```json
[
  {
    "codigoPostal": "04100",
    "colonia": "COPILCO UNIVERSIDAD",
    "delegacion": "COYOACAN",
    "poblacion": "COYOACAN",
    "estado": "CIUDAD DE MEXICO"
  }
]
```

Caso `op = "coverage"` (arreglo vacío `[]` si el CP **no** tiene cobertura):
```json
[
  {
    "codigoPostal": "04100",
    "colonia": "COPILCO UNIVERSIDAD",
    "delegacion": "COYOACAN",
    "poblacion": "COYOACAN",
    "estado": "CIUDAD DE MEXICO"
  }
]
```

Caso de error interno: se regresa `e.Message` en texto plano (ver Observaciones técnicas).

---

## Destino SAP

La tabla `CodigoPostal` de Intelisis se reemplaza por el catálogo SEPOMEX expuesto en S/4HANA vía **`ZAPI_ZDMT_SEPOMEX`** (Regla #2: cero consultas directas a SAP DB; todo por OData). Al construir la URL recordar anteponer diagonal: `Conexion.Data.obtenerUrl(...) + "/ZAPI_ZDMT_SEPOMEX"` (Regla #13).

> **Pendiente de definición:** el campo `MaviRutaSupervision` (filtro que determina si un CP tiene ruta de entrega habilitada) es propio de Intelisis. Debe confirmarse con el Líder Técnico si migra como atributo dentro de `ZAPI_ZDMT_SEPOMEX`, si persiste localmente en `SigMavi`, o si se resuelve por otro servicio de cobertura (Regla #1 y #10).

---

#migracion #SAP #analisis_bd #dotnet #CustomerServiceController #validarCoberturaPorCP
