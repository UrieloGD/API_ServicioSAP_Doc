# Mapeo del Método: `CreditMethods.CheckAccountsPreUnification()` — Lógica de Negocio

**Endpoint:** `POST /credit/CheckAccountsPreUnification`
**Archivo:** `APIMagento/WebApiMagento/Metodos/CreditMethods.cs`
**Método:** `public bool CheckAccountsPreUnification(UnificationWalletDataRequest data)` — Líneas **1665–1671**
**Método auxiliar:** `private bool AccountType(string cuenta, int uen, string categoria)` — Líneas **1719–1743**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Precondición de elegibilidad — determina si **ambas** cuentas involucradas en una unificación de monedero pertenecen a la categoría de canal `CREDITO MENUDEO`.

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

Modelo `UnificationWalletDataRequest` — `APIMagento/WebApiMagento/Models/CreditRequest.cs` líneas **115–119**:

| Campo | Tipo | Uso dentro del método |
|---|---|---|
| `IdEcommerce` | string | Solo se lee **su primer carácter** para derivar la UEN |
| `ClienteCredito` | string | Cuenta de crédito a validar |
| `ClienteContado` | string | Cuenta de contado a validar |

---

## Flujo de Ejecución Detallado

El método es deliberadamente corto — toda la sustancia está en `AccountType()`:

```csharp
public bool CheckAccountsPreUnification(UnificationWalletDataRequest data)
{
    int uen = data.IdEcommerce[0].Equals('1') ? 2 : 1;
    var account1 = AccountType(data.ClienteContado, uen, "CREDITO MENUDEO");
    var account2 = AccountType(data.ClienteCredito, uen, "CREDITO MENUDEO");
    return account1 && account2;
}
```

1. **Derivación de la UEN:** inspecciona el **primer carácter** de `IdEcommerce`:
   - Si es `'1'` → `uen = 2`
   - En cualquier otro caso → `uen = 1`

   > La relación es **inversa** al dígito: `IdEcommerce` que arranca con `1` produce UEN `2`. Este mismo patrón se repite en `InsertUnificationWallet` (línea 1680), escrito con una variante sintáctica: `data.IdEcommerce[0].ToString().Equals("1")`.

2. **Doble validación de canal:** invoca `AccountType()` **dos veces**, ambas contra la categoría `"CREDITO MENUDEO"`:
   - `account1` ← `ClienteContado`
   - `account2` ← `ClienteCredito`

3. **Retorno:** `account1 && account2` — verdadero solo si **ambas** cuentas pertenecen a `CREDITO MENUDEO` en los canales asociados a la UEN calculada.

   > Ambas llamadas se evalúan siempre; no hay short-circuit porque los resultados se asignan a variables antes del `&&`. Esto significa **2 conexiones SQL y 2 queries en toda ejecución**, incluso si la primera ya devolvió `false`.

### Detalle de `AccountType(cuenta, uen, categoria)` — líneas 1719–1743

```csharp
using (var connection = new SqlConnection(new Connection().sCadenaConexion))
{
    string ids = uen == 1 ? "3, 76" : "7";
    string query = $@"SELECT * FROM Cte WITH(NOLOCK)
        JOIN CteEnviarA ON CteEnviarA.Cliente = cte.Cliente
        WHERE Cte.Cliente = @Account
        AND CteEnviarA.ID IN ({ids})
        AND CteEnviarA.Categoria = @Categorie;";
    ...
    return reader.HasRows;
}
```

1. Abre una `SqlConnection` **nueva y en `using`** con `new Connection().sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)*
2. Resuelve la lista de canales según la UEN — **valores hardcodeados**:

   | `uen` | `CteEnviarA.ID IN (...)` |
   |---|---|
   | `1` | `3, 76` |
   | `2` (cualquier otro) | `7` |

3. Ejecuta la consulta con `Cte` JOIN `CteEnviarA` por `Cliente`, filtrando por cuenta, canal y categoría.
4. `@Account` y `@Categorie` se pasan como `SqlParameter` (`AddWithValue`); **`ids` se concatena por interpolación de string** en el texto SQL.
5. Retorna `reader.HasRows` — es decir, **existencia**, no contenido. El `SELECT *` se descarta por completo.
6. La conexión se libera por el `using` sin `Close()` explícito.

**No hay Stored Procedures, ni servicios externos, ni escrituras** en este flujo: son dos `SELECT` de existencia.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Campos Principales |
|---|---|---|---|---|---|
| Intelisis | MAVICUBOS.grupomavi.com | `Cte` | N/A (Inline SQL) | Select | `Cliente` (`WHERE Cte.Cliente = @Account`) |
| Intelisis | MAVICUBOS.grupomavi.com | `CteEnviarA` | N/A (Inline SQL) | Select | `Cliente` (JOIN), `ID` (`IN (3,76)` o `IN (7)`), `Categoria = @Categorie` |

Ambas tablas se consultan **dos veces por request** (una por cada cuenta evaluada), en conexiones independientes.

---

## Ejemplo de Respuesta (Response)

La capa de negocio devuelve un `bool`. El controller LAN lo serializa con `Json(...)` y la DMZ le aplica `.Trim('"')`, de modo que el consumidor final recibe **texto**:

Caso elegible (ambas cuentas en `CREDITO MENUDEO`):
```
true
```

Caso no elegible (alguna cuenta fuera del canal/categoría):
```
false
```

Caso de error (excepción capturada en el controller LAN — ver [[02_LAN_Controller]]):
```
false
```

> Los tres casos responden **HTTP 200**. No existe forma de distinguir "no elegible" de "falló la consulta".

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **`ClienteContado` se valida contra `"CREDITO MENUDEO"`.** Ambas llamadas usan la misma categoría, incluido el parámetro llamado *Contado*. Contrasta directamente con `InsertUnificationWallet()` (líneas 1686–1687), que en el mismo archivo valida:
   ```csharp
   var cuentaPerteneceCanal0206 = AccountType(data.ClienteContado, uen, "CONTADO");
   var cuentaPerteneceCanal0307 = AccountType(data.ClienteCredito, uen, "CREDITO MENUDEO");
   ```
   **La precondición (`CheckAccountsPreUnification`) y la operación real (`InsertUnificationWallet`) aplican criterios distintos sobre `ClienteContado`.** Requiere confirmación de negocio: ¿es intencional (el nombre del campo es engañoso y ambas cuentas deben ser de crédito) o es un bug heredado? **No se asume nada** (Regla #10).

2. **`IdEcommerce[0]` sin validación.** Si `IdEcommerce` es `null` → `NullReferenceException`; si es cadena vacía → `IndexOutOfRangeException`. Ambas caen en el `catch` del controller y se convierten en `false` silencioso. No hay guarda previa.

3. **`SELECT *` para una prueba de existencia.** Se traen todas las columnas de `Cte` y `CteEnviarA` para luego solo evaluar `reader.HasRows`. Debe ser `SELECT TOP 1 1` o `EXISTS`.

4. **IDs de canal hardcodeados (`3, 76`, `7`).** Violan la Regla #7 en espíritu: son catálogo de negocio embebido en el código. Al migrar deben resolverse desde configuración o desde el propio catálogo SAP.

5. **`ids` concatenado por interpolación.** Hoy no es explotable porque `uen` es un `int` derivado internamente (nunca viene del request), pero es un patrón de construcción de SQL que debe eliminarse en la migración.

6. **Dos conexiones por request sin short-circuit.** `account1` y `account2` se evalúan siempre. Consolidable en una sola consulta que resuelva ambas cuentas.

7. **Método síncrono:** migrar a `async/await` (`ExecuteReaderAsync`), Regla #12.

8. **Nomenclatura mixta:** `uen` se deriva con `.Equals('1')` (char) aquí y con `.ToString().Equals("1")` en `InsertUnificationWallet`. Unificar en un helper compartido al migrar.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN

**No se asigna API SAP en este documento.** El archivo `_GLOBAL_CreditController_DB.csv` del share tiene `Nombre TablaSAP` / `API SAP` **vacías para todos los endpoints de `CreditController`**, y no existe fila para `CheckAccountsPreUnification` en `_GLOBAL_MASTER_DB_v2`. Conforme a la **Regla #10 (Cero Suposiciones)**, no se infiere ningún servicio OData.

Puntos que requieren definición del Líder Técnico antes de programar:

1. **Discrepancia de categoría (punto 1 de Observaciones).** Debe resolverse **antes** de escribir el equivalente en SAP; determina la regla de elegibilidad completa.
2. **`Cte` / `CteEnviarA` → Business Partner.** La validación es "¿el BP pertenece a este canal de ventas con esta categoría?". Corresponde al dominio de `A_BusinessPartner` / datos de área de ventas, pero **el mapeo exacto debe tomarse de los payloads reales en `Resources/`** (`bp_agente.md`, `bp_address.md`) conforme a la **Regla #11** — esos archivos están actualmente vacíos en la carpeta del skill.
3. **Catálogo de canales (`CteEnviarA.ID` 3, 76, 7 y `Categoria`).** Aplica la **Regla #1**: confirmar si el catálogo de canales de venta migra a `SigMavi` como persistencia local, si existe equivalente nativo en SAP (organización de ventas / canal de distribución), o si permanece en Intelisis durante la convivencia.
4. **Alcance del flujo de unificación de monedero.** `CheckAccountsPreUnification`, `SetUnificationWalletData` y `GetUnificationWalletStatus` forman una sola funcionalidad sobre `CREDIHUnificacionMonedero`. Debe decidirse si el trío completo migra a SAP o si la tabla `CREDIHUnificacionMonedero` es persistencia local que permanece en `SigMavi` (**Regla #1**), lo que dejaría este endpoint fuera del alcance SAP.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por la discrepancia de categoría.

---

## Referencias cruzadas

- Endpoint hermano que ejecuta el `INSERT` real: [[SetUnificationWalletData]]
- Endpoint hermano de consulta de estatus: [[GetUnificationWalletStatus]]

---

#migracion #SAP #analisis_bd #dotnet #CreditController #CheckAccountsPreUnification #unificacion_monedero
