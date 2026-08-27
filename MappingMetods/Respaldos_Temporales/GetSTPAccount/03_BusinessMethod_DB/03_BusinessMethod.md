# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.GetSTPAccount()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static Dictionary<string, string> GetSTPAccount(GetSTPAccountRequest request)` — Líneas 1295–1408
**Capa:** LAN (Nexo)
**Rol en el flujo:** Valida que el cliente tenga una cuenta STP válida y encriptada; de ser así, inserta un registro por cada deuda del cliente marcándolo como origen 'STP'.

---

## Flujo de Ejecución Detallado

1. Llama al método/helper local `ValidateSTPAccount(request.ClientNumber)`.
2. Verifica la respuesta. Si el campo `"cuenta"` está vacío (porque el cliente no fue encontrado o fallo al desencriptar), lanza una excepción `"El cliente no fue encontrado."` que cortará la ejecución.
3. Inicia iteración sobre `request.Debts`. Por cada `debt`:
   - Prepara variables para insertar. 
   - Define `Origen = "STP"`.
   - Ejecuta `INSERT INTO CXCCFacturaMultipagoBBVA (...) OUTPUT SCOPE_IDENTITY()`.
   - (Nota: Reusa la misma tabla multipago BBVA pero etiquetándola como STP).
   - Usa parámetros fuertemente tipados a diferencia de otros métodos.
4. Finaliza devolviendo el mismo diccionario devuelto por `ValidateSTPAccount` con la cuenta desencriptada.
5. En catch `SqlException`, envuelve el error y lo relanza. 

## Métodos Auxiliares Invocados

| Método | Clase | Descripción |
|---|---|---|
| `ValidateSTPAccount(clientNumber)` | `CustomerServiceMethods` | Valida y desencripta la cuenta STP del cliente — ver [[../ValidateSTPAccount/03_BusinessMethod]] |

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | CXCCFacturaMultipagoBBVA | Insert | Cliente, Mov, MovID, Monto, Referencia, Origen (="STP") |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
