# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.UpdateStatusPaymentNeko()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string UpdateStatusPaymentNeko(UpdateStatusPaymentNekoRequest request)` — Líneas 966–1016
**Capa:** LAN (Nexo)
**Rol en el flujo:** Actualiza el campo `EstatusPago` de todos los registros de un grupo de pago en `CXCCFacturaMultipagoBBVA` a `CONFIRMADO` o `FALLIDO` según el resultado del cobro BBVA.

---

## Flujo de Ejecución Detallado

1. **Prepara la referencia base:**
   - Toma `request.Reference` y le quita el último carácter: `reference = request.Reference.Substring(0, request.Reference.Length - 1)`.
   - Ejemplo: `"BBVA20240730ABC1"` → `"BBVA20240730ABC"`.
   - ⚠️ Asume que el último carácter siempre es el índice numérico.

2. **Construye la query de UPDATE según `request.Success`:**
   - Si `Success == true` → `SET EstatusPago = 'CONFIRMADO'`
   - Si `Success == false` → `SET EstatusPago = 'FALLIDO'`

3. **Parametriza el LIKE:**
   - `@Referencia = reference + '%'` → ej. `"BBVA20240730ABC%"`
   - Actualiza **todos** los registros cuya `Referencia` empiece con la base (todos los debts del mismo pago grupal).

4. **Ejecuta el UPDATE:**
   - Usa `ExecuteNonQuery()` y captura `rowsAffected`.
   - Si `rowsAffected == 0` → `result = "Status could not be updated."`
   - Si `rowsAffected > 0` → `result = "Status has been updated."`

5. **Cierra la conexión** si sigue abierta.

6. **En catch `SqlException`:**
   - Loguea con `Logger.CustomerService("ERROR ", e.Message)`.
   - El `result` queda como `""` (vacío). **Solo captura `SqlException`**, no `Exception` general.

7. **Retorna** el string `result`.

## Métodos Auxiliares Invocados

| Método | Clase | Descripción |
|---|---|---|
| `Logger.CustomerService(type, msg)` | `Helper.Logger` | Escribe en `customerservice.log` (solo en SqlException) — ver [[04_Helper_Logger_CustomerService]] |

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales | Nombre TablaSAP | API SAP |
|---|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | CXCCFacturaMultipagoBBVA | Update | EstatusPago (→ 'CONFIRMADO' o 'FALLIDO') WHERE Referencia LIKE base% | | |

## Lógica de Retorno

| Condición | `result` devuelto |
|---|---|
| `rowsAffected > 0` y `Success == true` | `"Status has been updated."` (EstatusPago → CONFIRMADO) |
| `rowsAffected > 0` y `Success == false` | `"Status has been updated."` (EstatusPago → FALLIDO) |
| `rowsAffected == 0` | `"Status could not be updated."` |
| `SqlException` | `""` (cadena vacía) |

---

## Ejemplo Completo de Ejecución

### Request que recibe el método

**Escenario A — Pago exitoso:**
```json
{
  "Reference": "BBVA20240730ABC1",
  "Success": true
}
```

**Escenario B — Pago fallido:**
```json
{
  "Reference": "BBVA20240730ABC1",
  "Success": false
}
```

### Transformación interna de la referencia

```
request.Reference        = "BBVA20240730ABC1"
reference (sin último c) = "BBVA20240730ABC"
@Referencia (LIKE)       = "BBVA20240730ABC%"
```

Matchea: `BBVA20240730ABC1`, `BBVA20240730ABC2` ... (todos los debts del mismo pago grupal).

### SQL ejecutado — Escenario A (Success = true)

```sql
UPDATE CXCCFacturaMultipagoBBVA WITH(ROWLOCK)
SET EstatusPago = 'CONFIRMADO'
WHERE Referencia LIKE 'BBVA20240730ABC%'
-- rowsAffected = 2 → result = "Status has been updated."
```

### SQL ejecutado — Escenario B (Success = false)

```sql
UPDATE CXCCFacturaMultipagoBBVA WITH(ROWLOCK)
SET EstatusPago = 'FALLIDO'
WHERE Referencia LIKE 'BBVA20240730ABC%'
-- rowsAffected = 2 → result = "Status has been updated."
```

### Retorno al Controller LAN

```
"Status has been updated."
```

→ DMZ recibe `HTTP 200 OK` con body `"Status has been updated."`.

---

## Notas de Deuda Técnica

> ⚠️ **Comportamiento silencioso en `SqlException`:** El catch solo loguea pero retorna `""`. DMZ responde `HTTP 200 OK` de todas formas, imposibilitando que el cliente detecte el error por HTTP status.
>
> ⚠️ **Asunción del último carácter:** El `Substring(0, length - 1)` asume que el último carácter es siempre el índice numérico. Si el formato de la referencia cambia, puede corromper el LIKE.


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
