# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.ApplyPaymentAdvanced()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static bool ApplyPaymentAdvanced(ApplyPaymentRequest request)` — Líneas 915–964
**Capa:** LAN (Nexo)
**Rol en el flujo:** Registra deudas pagadas de BBVA en Intelisis. A diferencia del método `Neko`, no verifica duplicados y asigna el origen 'BBVA'.

---

## Flujo de Ejecución Detallado

1. Loguea el request serializado con `Logger.CustomerService("ApplyPayment Request() => ", json)`.
2. Abre una conexión SQL a Intelisis mediante `new Connection()` → `sCadenaConexion`.
3. Inicializa el contador `insertedDebts = 0`.
4. Itera sobre cada elemento en `request.Debts`:

   **Por cada `debt` en el arreglo:**

   a. **No hay validación de duplicados ni modificación de referencia.**
      - Usa `request.Reference.ToUpper()` directamente, sin concatenar el índice del ciclo. 

   b. **Registra la deuda (INSERT directo):**
      - Ejecuta el INSERT en `CXCCFacturaMultipagoBBVA` con los campos:
        - `Cliente` = `request.ClientNumber.ToUpper()`
        - `ClienteEnviarA` = `int.Parse(debt["CanalVenta"])`
        - `Mov` = `debt["mov"]`
        - `MovID` = `debt["id_factura"]`
        - `Monto` = `ToDouble(debt["abono"])`
        - `Referencia` = `request.Reference.ToUpper()`
        - `EstatusPago` = `"PENDIENTE"`
        - `FechaPago` = `GETDATE()`
        - `Origen` = `"BBVA"`
      - Usa `output INSERTED.IdFacturaMultipagoBBVA` para obtener el ID generado.
      - Si el ID retornado es de tipo `Int32`, incrementa `insertedDebts++`.

5. **Al terminar el ciclo:**
   - En `catch` → loguea error con `Logger.CustomerService` y `Logger.PaymentBBVA`, retorna `false`.
   - Si todo exitoso → loguea `Logger.PaymentBBVA("SUCCESS ", json)`.
   - **Retorna `true`** solo si `insertedDebts == request.Debts.Count`.

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
| IntelisisTmp | MAVICUBOS.grupomavi.com | CXCCFacturaMultipagoBBVA | Insert | Cliente, ClienteEnviarA, Mov, MovID, Monto, Referencia, EstatusPago, FechaPago, Origen | | |

## Lógica de Retorno

| Condición | Retorna |
|---|---|
| Excepción SQL (ej. violación de constraint por duplicado) | `false` |
| Todos los debts insertados correctamente | `true` |
| Algunos debts fallidos (insertedDebts < Debts.Count) | `false` |

---

## Ejemplo Completo de Ejecución

### Request que recibe el método

```json
{
  "ClientNumber": "CLI001234",
  "Reference": "BBVA20240730ADV",
  "Debts": [
    {
      "CanalVenta": "41",
      "mov": "Factura",
      "id_factura": "F-000985",
      "abono": "3500.00"
    }
  ]
}
```

### Parámetros SQL generados por iteración

**Iteración 1:**

```sql
-- INSERT (SIN CHECK PREVIO):
INSERT INTO CXCCFacturaMultipagoBBVA (Cliente, ClienteEnviarA, Mov, MovID, Monto, Referencia, EstatusPago, FechaPago, Origen)
OUTPUT INSERTED.IdFacturaMultipagoBBVA
VALUES ('CLI001234', 41, 'Factura', 'F-000985', 3500.00, 'BBVA20240730ADV', 'PENDIENTE', GETDATE(), 'BBVA')
-- → Retorna ID generado
```

### Retorno del método

```
insertedDebts == request.Debts.Count
→ return true
```

---

## Notas de Deuda Técnica

> ⚠️ **Manejo de duplicados defectuoso (Missing SELECT CHECK):** A diferencia de `ApplyPaymentNeko`, este método NO valida si la referencia ya existe antes de insertar. Esto significa que enviará el `INSERT` y dependerá exclusivamente de la base de datos (constraints de llave única) para rechazar duplicados. Si la BD rechaza el duplicado, lanzará un `SqlException`, que será capturado en el `catch` y provocará que el método retorne `false` silenciosamente.
> 
> ⚠️ **Múltiples deudas con la misma referencia:** Como el método no concatena el índice del debt a la referencia (a diferencia de Neko), si `request.Debts` trae más de un elemento, intentará insertar múltiples registros con la **misma Referencia exacta**. Si la base de datos exige referencias únicas, la segunda iteración lanzará una excepción y abortará la operación dejando el `insertedDebts` menor que el total esperado.


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
