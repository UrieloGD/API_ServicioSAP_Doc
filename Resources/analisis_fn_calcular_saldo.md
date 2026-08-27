# Análisis Función: `FnVTASCalcularSaldo` y C# `MonederoSaldoCredito`

> **Fuente SQL:** [FnVTASCalcularSaldo.sql](file:///C:/Users/magalindo/Documents/Migracion SAP/.agents/skills/lan-sap-migration/SPsOrden/FnVTASCalcularSaldo.sql)
> **Consumido por:** [CreditMethods.cs:L1523-L1562](file:///c:/Users/magalindo/Documents/Migracion SAP/LAN/WebApiMagento/Metodos/CreditMethods.cs#L1523-L1562)
> **Endpoint DMZ:** `credit/MonederoSaldoCredito` (POST)
> **Base de datos:** `IntelisisTmp`

---

## 1. Entrada y Lógica Previa en C# (`MonederoSaldoCredito`)

Antes de llamar a la función SQL, el método C# recibe dos parámetros:
*   `uen`: string (Unidad Estratégica de Negocio, usualmente "1" para Muebles América, "2" para VIU).
*   `client`: string (Código de cliente Intelisis).

**Lógica Previa:**
Ejecuta una consulta directa a la tabla `Cte` (Maestro de clientes) para obtener la **Serie de Monedero** del cliente dependiendo de la UEN:
```sql
SELECT ISNULL(
  CASE
    WHEN 'uen' = 1 THEN c.SerieMonedero
    ELSE c.SerieMonederoVIU
  END, '')
FROM Cte c WITH (NOLOCK) 
WHERE c.Cliente = 'client'
```
*Si la UEN es 1, toma `SerieMonedero`. De lo contrario, toma `SerieMonederoVIU`.*

Una vez obtenida la Serie (ej: "M12345"), llama a la función escalar `FnVTASCalcularSaldo(Serie, uen)`.

---

## 2. Lógica Interna de la Función `FnVTASCalcularSaldo`

La función recibe la `@Serie` (calculada en el paso anterior) y la `@UEN`.

### Tablas Utilizadas:
1.  **`TarjetaSeriemovMavi`**: Guarda los movimientos del monedero.
2.  **`SaldoP`**: Guarda los saldos por cuenta (serie) y UEN.

### Flujo de Cálculo:
1.  **Cálculo de Importe Pendiente (`@Importe`)**
    Suma el `Importe` de la tabla `TarjetaSeriemovMavi` donde la `Serie` coincida y el `Estatus = 'PENDIENTE'`. Esto representa **el saldo retenido o comprometido** en pedidos que aún no se facturan.
2.  **Cálculo de Saldo Actual (`@SaldoP`)**
    Suma el `Saldo` de la tabla `SaldoP` para esa `Cuenta` (Serie) y esa `UEN`. Este es **el saldo real disponible en la cuenta del cliente**.
3.  **Operación Final**
    Resta el saldo retenido al saldo actual:
    `@Saldo = @SaldoP - @Importe`
    *(Si el saldo retenido es nulo o cero, el saldo final es igual al `@SaldoP`)*.
4.  **Validación de Negativos**
    Si el resultado es menor a 0, devuelve `0.0`.

---

## 3. Salida Final

| Retorno | Tipo | Descripción |
|---|---|---|
| `resultSaldo` | `decimal` | El saldo en dinero disponible en el monedero electrónico para que el cliente pueda redimirlo. |

### Ejemplo de Estructura de Respuesta en DMZ (Inferida)
El endpoint `credit/MonederoSaldoCredito` típicamente responde con un JSON simple o un objeto que contiene este decimal:
```json
{
  "saldo": 1500.50
}
```

---

## 4. Equivalencia SAP Potencial

Este flujo trata exclusivamente sobre la **consulta del Monedero Electrónico** del cliente, diferenciado por Unidad de Negocio (MA o VIU).

### Mapeo de Tablas y APIs:

| Concepto Intelisis | API SAP Candidata | Campo / Mecanismo SAP | Disponible |
|---|---|---|---|
| Tabla `Cte` (SerieMonedero / VIU) | **BP05** (`ZAPI_BP05MA_SRV`) | `Partner` (ID del cliente). SAP maneja el monedero ligado al BP, no necesariamente a una "Serie" expuesta, sino al contrato de condiciones. | ✅ Parcial |
| Tabla `SaldoP` / `TarjetaSeriemovMavi` | **SD18** (`ZAPI_CONDITIONCONTRACT_SRV`) | Esta es la API core de Monedero en SAP. Calcula el acumulado y redimido (CC_AMOUNT). | ✅ Ya existe |

> [!TIP]
> **Plan de Migración (ServicioSAP):**
> Ya tenemos el endpoint `customer/wallet/details` (POST) que consume el servicio **SD18** de SAP (`WalletCustomerController.cs`). Ese endpoint ya devuelve el balance real del monedero del cliente.
> 
> Para migrar este método, en lugar de replicar la lógica de restar `SaldoP - TarjetaSeriemovMavi` en SQL, **simplemente debemos apuntar el endpoint DMZ (`credit/MonederoSaldoCredito`) hacia el endpoint existente de Monedero en SAP (`customer/wallet/details`)**, el cual ya realiza el cálculo interno de saldos y retenciones en SAP a través del contrato de condiciones (Condition Contract).
