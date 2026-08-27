# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.ApplyPaymentNeko()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static bool ApplyPaymentNeko(ApplyPaymentRequest request)` — Líneas 854–913
**Capa:** LAN (Nexo)
**Rol en el flujo:** Núcleo del proceso. Registra las deudas pagadas en la base de datos Intelisis con estatus PENDIENTE.

---

## Flujo de Ejecución Detallado

1. Loguea el request serializado con `Logger.CustomerService("ApplyPayment Request() => ", json)`.
2. Abre una conexión SQL a Intelisis mediante `new Connection()` → `sCadenaConexion`.
3. Inicializa el contador `insertedDebts = 0`.
4. Itera sobre cada elemento en `request.Debts` (lista de deudas a abonar):

   **Por cada `debt` en el arreglo:**

   a. **Genera la nueva Referencia única:** `newReference = request.Reference + (indexDelDebt + 1)`
      - Ejemplo: si `Reference = "BBVA2024ABC"` y el debt es el índice 0 → `newReference = "BBVA2024ABC1"`.

   b. **Verifica duplicados (SELECT anti-duplicado):**
      - Ejecuta `SELECT Referencia FROM CXCCFacturaMultipagoBBVA WITH(NOLOCK) WHERE Referencia = '{newReference}'`.
      - Si el `DataReader` tiene filas → **retorna `false` inmediatamente** (pago ya registrado, corta todo el ciclo).
      - Cierra y reabre la conexión SQL antes del INSERT.

   c. **Registra la deuda (INSERT):**
      - Ejecuta el INSERT en `CXCCFacturaMultipagoBBVA` con los campos:
        - `Cliente` = `request.ClientNumber.ToUpper()`
        - `ClienteEnviarA` = `int.Parse(debt["CanalVenta"])`
        - `Mov` = `debt["mov"]`
        - `MovID` = `debt["id_factura"]`
        - `Monto` = `ToDouble(debt["abono"])` ← llama helper `ToDouble()`
        - `Referencia` = `newReference.ToUpper()`
        - `EstatusPago` = `"PENDIENTE"` (hardcoded)
        - `FechaPago` = `GETDATE()` (SQL server timestamp)
      - Usa `output INSERTED.IdFacturaMultipagoBBVA` para obtener el ID generado.
      - Si el tipo del ID devuelto es `Int32`, incrementa `insertedDebts++`.

5. **Al terminar el ciclo:**
   - En `catch` → loguea error con `Logger.CustomerService` y `Logger.PaymentBBVA`, retorna `false`.
   - Si todo exitoso → loguea `Logger.PaymentBBVA("SUCCESS ", json)`.
   - **Retorna `true`** solo si `insertedDebts == request.Debts.Count` (todos los debts fueron insertados).

## Métodos Auxiliares Invocados

| Método | Clase | Descripción |
|---|---|---|
| `ToDouble(string val)` | `CustomerServiceMethods` (privado) | Convierte string a double via `double.Parse()` — ver [[04_Helper_ToDouble]] |
| `Logger.CustomerService(type, msg)` | `Helper.Logger` | Escribe en `customerservice.log` — ver [[05_Helper_Logger_CustomerService]] |
| `Logger.PaymentBBVA(type, msg)` | `Helper.Logger` | Escribe en `paymentbbva.log` — ver [[06_Helper_Logger_PaymentBBVA]] |

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales | Nombre TablaSAP | API SAP |
|---|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | CXCCFacturaMultipagoBBVA | Select | Referencia | | |
| IntelisisTmp | MAVICUBOS.grupomavi.com | CXCCFacturaMultipagoBBVA | Insert | Cliente, ClienteEnviarA, Mov, MovID, Monto, Referencia, EstatusPago, FechaPago | | |

## Lógica de Retorno

| Condición | Retorna |
|---|---|
| Referencia duplicada detectada en SELECT | `false` |
| Excepción SQL u otra excepción | `false` |
| Todos los debts insertados correctamente | `true` |
| Algunos debts fallidos (insertedDebts < Debts.Count) | `false` |

---

## Ejemplo Completo de Ejecución

### Request que recibe el método

```json
{
  "ClientNumber": "CLI001234",
  "Reference": "BBVA20240730ABC",
  "Debts": [
    {
      "CanalVenta": "41",
      "mov": "Factura",
      "id_factura": "F-000985",
      "abono": "3500.00"
    },
    {
      "CanalVenta": "41",
      "mov": "Factura",
      "id_factura": "F-000986",
      "abono": "1250.50"
    }
  ]
}
```

### Parámetros SQL generados por iteración

**Iteración 1 (debt index 0):**

```sql
-- CHECK de duplicado:
SELECT Referencia FROM CXCCFacturaMultipagoBBVA WITH(NOLOCK) WHERE Referencia = 'BBVA20240730ABC1'
-- → Sin filas → continúa

-- INSERT:
INSERT INTO CXCCFacturaMultipagoBBVA (Cliente, ClienteEnviarA, Mov, MovID, Monto, Referencia, EstatusPago, FechaPago)
OUTPUT INSERTED.IdFacturaMultipagoBBVA
VALUES ('CLI001234', 41, 'Factura', 'F-000985', 3500.00, 'BBVA20240730ABC1', 'PENDIENTE', GETDATE())
-- → Retorna: IdFacturaMultipagoBBVA = 2081  → insertedDebts = 1
```

**Iteración 2 (debt index 1):**

```sql
-- CHECK de duplicado:
SELECT Referencia FROM CXCCFacturaMultipagoBBVA WITH(NOLOCK) WHERE Referencia = 'BBVA20240730ABC2'
-- → Sin filas → continúa

-- INSERT:
INSERT INTO CXCCFacturaMultipagoBBVA (Cliente, ClienteEnviarA, Mov, MovID, Monto, Referencia, EstatusPago, FechaPago)
OUTPUT INSERTED.IdFacturaMultipagoBBVA
VALUES ('CLI001234', 41, 'Factura', 'F-000986', 1250.50, 'BBVA20240730ABC2', 'PENDIENTE', GETDATE())
-- → Retorna: IdFacturaMultipagoBBVA = 2082  → insertedDebts = 2
```

### Retorno del método

```
insertedDebts (2) == request.Debts.Count (2)
→ return true
```

El controlador LAN recibe `true` → responde `HTTP 200 OK`.

---

### Ejemplo de Fallo — Referencia Duplicada

```sql
-- CHECK de duplicado (Iteración 1):
SELECT Referencia FROM CXCCFacturaMultipagoBBVA WITH(NOLOCK) WHERE Referencia = 'BBVA20240730ABC1'
-- → 1 fila encontrada → return false  ← CORTA TODO EL CICLO
```

```
→ return false
```

El controlador LAN recibe `false` → responde `HTTP 500 InternalServerError`.


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
