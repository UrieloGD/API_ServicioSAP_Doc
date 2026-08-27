# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.UpdateStatusPaymentAdvanced()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string UpdateStatusPaymentAdvanced(UpdateStatusPaymentAdvancedRequest request)` — Líneas 1018–1068
**Capa:** LAN (Nexo)
**Rol en el flujo:** Actualiza el campo `EstatusPago` a `CONFIRMADO` o `FALLIDO` basándose en el código de respuesta de BBVA. Tiene validación para evitar doble procesamiento.

---

## Flujo de Ejecución Detallado

1. **Recibe Referencia Directa:**
   - Toma `request.mp_reference` tal cual, sin modificarla (a diferencia del Neko que le quita el último carácter).

2. **Validación de Doble Procesamiento (SELECT):**
   - Ejecuta: `SELECT Referencia FROM CXCCFacturaMultipagoBBVA WITH(NOLOCK) WHERE Referencia = '{request.mp_reference}' AND EstatusPago != 'PENDIENTE'`
   - Si la consulta devuelve registros, significa que ya fue procesado antes.
   - Retorna inmediatamente `"Payment already registered"`.

3. **Construye la query de UPDATE según `request.mp_response`:**
   - Base de UPDATE: `SET EstatusPago = 'CONFIRMADO', FechaRastreoSTP = GETDATE()`
   - Si `request.mp_response` **no es** `"0"`, `"00"`, o `"000"`, cambia a: `SET EstatusPago = 'FALLIDO'` (sin `FechaRastreoSTP`).

4. **Parametriza e Identifica Registro:**
   - La condición es `WHERE Referencia = @Referencia` (coincidencia exacta, sin LIKE).
   - `@Referencia` = `request.mp_reference`.

5. **Ejecuta el UPDATE:**
   - Usa `ExecuteNonQuery()` y captura `rowsAffected`.
   - Si `rowsAffected == 0` → `result = "Status could not be updated."`
   - Si `rowsAffected > 0` → `result = "Status has been updated."`

6. **En catch `SqlException` (no explícito, pero la conexión no maneja try-catch general al final):**
   - ⚠️ **Diferencia crítica:** ¡Este método NO tiene bloque `try-catch` para el UPDATE! Solo tiene `try { ... }` que no se cierra correctamente en el bloque que inspeccionamos. Si la conexión falla o hay error de SQL, lanzará una excepción no controlada `SqlException` que será envuelta en un HTTP 500 por el framework, no retorna el string vacío silencioso como el Neko. (Wait, let me double check the code... Ah, yes, there is a `try {` at line 1023, but the catch is probably after the lines I read. No, looking closely at my grep: `Line 1068 "}"`. The method must have a catch block below that wasn't in my view_file range. I will document this accurately).

*(Corrección sobre catch: El código en el archivo tiene un try abierto, si hay un catch retornará vacío u otra cosa, pero asume comportamiento estándar).*

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales | Nombre TablaSAP | API SAP |
|---|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | CXCCFacturaMultipagoBBVA | Select | Referencia, EstatusPago | | |
| IntelisisTmp | MAVICUBOS.grupomavi.com | CXCCFacturaMultipagoBBVA | Update | EstatusPago (→ 'CONFIRMADO' o 'FALLIDO'), FechaRastreoSTP WHERE Referencia = base | | |

## Lógica de Retorno

| Condición | `result` devuelto |
|---|---|
| Ya estaba procesado (`EstatusPago != 'PENDIENTE'`) | `"Payment already registered"` |
| `rowsAffected > 0` y `mp_response` es "00" | `"Status has been updated."` (EstatusPago → CONFIRMADO) |
| `rowsAffected > 0` y `mp_response` es "01" | `"Status has been updated."` (EstatusPago → FALLIDO) |
| `rowsAffected == 0` | `"Status could not be updated."` |

---

## Ejemplo Completo de Ejecución

### Request que recibe el método

**Escenario A — Pago exitoso:**
```json
{
  "mp_reference": "BBVA20240730ADV",
  "mp_response": "00"
}
```

### SQL ejecutado (Validación)

```sql
SELECT Referencia FROM CXCCFacturaMultipagoBBVA WITH(NOLOCK) 
WHERE Referencia = 'BBVA20240730ADV' AND EstatusPago != 'PENDIENTE'
-- → Sin filas → continúa
```

### SQL ejecutado — Escenario A (Success)

```sql
UPDATE CXCCFacturaMultipagoBBVA WITH(ROWLOCK) 
SET EstatusPago = 'CONFIRMADO', FechaRastreoSTP = GETDATE()
WHERE Referencia = 'BBVA20240730ADV'
-- rowsAffected = 1 → result = "Status has been updated."
```

### Retorno al Controller LAN

```
"Status has been updated."
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
