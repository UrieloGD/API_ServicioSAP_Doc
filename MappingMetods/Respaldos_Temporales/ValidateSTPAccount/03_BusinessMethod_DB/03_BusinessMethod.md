# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.ValidateSTPAccount()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static Dictionary<string, string> ValidateSTPAccount(string clientNumber)` — Líneas 1455–1508
**Capa:** LAN (Nexo)
**Rol en el flujo:** Consulta la Cuenta CLABE (STP) encriptada de un cliente en Intelisis y la desencripta usando una función nativa de SQL.

---

## Flujo de Ejecución Detallado

1. Prepara diccionario de respuesta por defecto: `{ "cuenta": "" }`.
2. Ejecuta query parametrizada:
   ```sql
   SELECT CuentaCLABESTP FROM Cte WITH(NOLOCK) WHERE Cliente = @ClientNumber
   ```
3. Si el resultado es `null`, retorna el diccionario vacío inmediatamente.
4. Si hay resultado, lo guarda en variable `cuentaClabeSTP`.
5. Ejecuta una segunda query parametrizada para desencriptar llamando a una Función Escalar SQL:
   ```sql
   SELECT dbo.FnVTASDesEncripta(@CuentaClabeSTP)
   ```
6. Si el resultado de la función es `null` o contiene `****` (indicativo de fallo al desencriptar o enmascaramiento), retorna el diccionario vacío.
7. Si es exitoso, actualiza el valor del diccionario a `{ "cuenta": <resultado_desencriptado> }` y lo retorna.
8. En catch general o SqlException, lanza una nueva `Exception` con el mensaje.

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Cte | Select | CuentaCLABESTP, Cliente |
| IntelisisTmp | MAVICUBOS.grupomavi.com | dbo.FnVTASDesEncripta | Función (Select) | Parámetro de entrada: CuentaClabeSTP |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
