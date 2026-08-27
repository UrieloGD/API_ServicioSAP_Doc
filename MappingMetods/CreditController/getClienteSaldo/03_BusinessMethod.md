# Mapeo del Método: `FacturaMethods.getClienteSaldo()` — Lógica de Negocio

**Endpoint:** `GET /credit/getClienteSaldo/{cliente}`
**Archivo:** `APIMagento/WebApiMagento/Metodos/FacturaMethods.cs`
**Método:** `public ClienteSaldo getClienteSaldo(string cliente)` — Líneas **23–98**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Obtiene el saldo global de crédito del cliente y el listado de facturas pendientes por pagar, ejecutando un único Stored Procedure de Intelisis.

> Cadena de flujo completa: [[01_DMZ_Controller]] → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

| Parámetro | Tipo | Origen | Validación |
|---|---|---|---|
| `cliente` | string | Ruta (`{cliente}`) | Regex `^[C]{1}[0-9]{8}$` aplicada en el controller LAN (ej. `C00000820`) |

---

## Flujo de Ejecución Detallado

1. **Conexión:** la clase `FacturaMethods` declara a nivel de campo (línea 16):
   ```csharp
   SqlConnection conn = new SqlConnection(new Connection().sCadenaConexion);
   ```
   → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp` (base **Intelisis / IntelisisTmp**). *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)*

2. Instancia el objeto de retorno `ClienteSaldo Saldo` y un `DataTable dt` vacíos.

3. **Ejecuta el Stored Procedure** `SPCXCSaldosClientesPendiente` con `CommandType.StoredProcedure` y `CommandTimeout = 120`:
   - Parámetro único: `@Cliente` (`SqlDbType.VarChar`) ← valor recibido en la ruta.
   - El `SqlDataReader` se vuelca íntegro con `dt.Load(dr)`.
   - El `ExecuteReader()` está envuelto en `try/catch` que solo hace `Console.WriteLine(e.Message)` — **la excepción se traga**, y el flujo continúa con `dt` vacío.
   - Cierra la conexión con `conn.Close()`.

4. **Mapeo del resultado** (`if (dt.Rows.Count > 0)`):
   - Recorre las filas con un contador `cont`. **Solo en la primera fila** (`cont == 0`) llena las cabeceras globales del saldo:

     | Propiedad `ClienteSaldo` | Columna del SP |
     |---|---|
     | `clienteIntelisis` | `ClienteIntelisis` |
     | `importeVenta` | `importeVenta` |
     | `saldoCapital` | `SaldoCapital` |
     | `atraso` | `Atraso` |
     | `moratorios` | `Moratorio` |
     | `adeudoTotal` | `AdeudoTotal` |
     | `liquidaConSolo` | `LiquidaCon` |

   - **Para cada fila** (incluida la primera) construye un objeto `Factura`:

     | Propiedad `Factura` | Columna del SP |
     |---|---|
     | `facturaId` | `MovId` |
     | `estatus` | `Estatus` |
     | `totalFactura` | `ImporteTotal` |
     | `fechaCompra` | `FechaEmision` |
     | `nombreCliente` | `NombreCliente` |
     | `articulos` | `CantArticulos` |

   - Asigna la lista a `Saldo.facturas` y retorna `Saldo`.

5. **Si `dt` no tiene filas** retorna el objeto `ClienteSaldo` **vacío** (todas las propiedades en `null`). Es exactamente ese caso el que el controller LAN detecta con `string.IsNullOrEmpty(clienteSaldo.clienteIntelisis)` para responder `"No tiene facturas"`.

   > **Nota importante:** una excepción SQL (paso 3) produce el mismo objeto vacío que un cliente legítimamente sin facturas. Ambos escenarios son indistinguibles para el consumidor.

---

## Lógica del Stored Procedure `SPCXCSaldosClientesPendiente`

**Ubicación del script:** `lan-sap-migration/SPsOrden/SPCXCSaldosClientesPendiente.sql`
**Base:** `IntelisisTmp` · **Autor original:** Ana Paula Rentería Vázquez (10/11/2020) · **Desarrollo:** DM0401
**Firma:** `@Cliente varchar(10)`

El SP reconstruye el estado de cuenta de crédito del cliente en **8 tablas temporales** encadenadas:

### Fase 1 — Movimientos CXC del cliente (`#MovCxcTemp`)
Extrae de `Cxc` (JOIN `MovTipo`, módulo `CXC`, claves `CXC.F`, `CXC.CAP`, `CXC.CA`, `CXC.C`, `CXC.AE`, `CXC.D`, `CXC.CD`) todos los movimientos del `@Cliente` con `Estatus IN ('PENDIENTE','CONCLUIDO')`. Crea índices sobre `PadreMAVI` y `(Mov, MovID)`.

### Fase 2 — Documentos hijos (`#DoctosHijos`)
Filtra los movimientos cuyo `PadreMAVI` sea de tipo `CXC.F`, `CXC.CAP`, `CXC.CA` o `CXC.CD`, quedándose con los `PENDIENTE` o los `CONCLUIDO` con `CobroCteFinal IN (1,2,4)`. Calcula:
- `ImporteTotal = Importe + Impuestos`
- `DiasVencidos = DATEDIFF(DAY, Vencimiento, GETDATE())` (solo si `PENDIENTE`)
- **Depuración de cancelaciones:** si existen movimientos `Nota Cargo%` con `Concepto LIKE 'CANC COBRO%'`, elimina de `#MovCxcTemp` los cobros referenciados vía `MovCampoExtra` (`NC_COBRO`, `NCV_COBRO`, `NCM_COBRO`).
- **Moratorios:** `Moratorios = ROUND(dbo.Fn_MaviCalculaMoratorios(ID), 2)` para los vencidos.

### Fase 3 — Documentos padres (`#DoctosPadres`)
Agrupa por `PadreMAVI`/`PadreIDMAVI` y enriquece con múltiples `UPDATE`:
- `CxcMavi` → `DiasVencActMAVI`, `DiasInacActMAVI`.
- `TcIRM0906_ConfigDivisionYParam` → umbrales `@DVConf`, `@DIConf`; si se exceden, aplica `dbo.FN_MAVIRM0906CobxPol(ID)` → `CobroXPolitica`.
- **Último pago** (`#MaviUltimoPagoTemp`): unión de tres orígenes — cobros `CXC.C` aplicados vía `CxcD`; notas de cargo por `MORATORIOS MENUDEO` resueltas a través de `MovCampoExtra` (`NC_FACTURA`, `NCV_FACTURA`); y `BonifSIMavi`.
- `Condicion` → `DAPeriodo`, `DANumeroDocumentos`; `VentasCanalMAVI` → `Categoria`; `Cte_Final` → nombre y RFC del cliente final; cálculo de `DiasInactivos`.
- `AuxiliarP` (módulo `VTAS`, no cancelados) → `Monedero`.
- **Enganche:** suma de `CxcD.Importe` de movimientos `Aplicacion Saldo` concluidos aplicados a facturas `VTAS.F`.
- `Venta` → `FormaPagoTipo`, `IdVta`; `VentaD` + `Art` → `DescripcionArt` (primer renglón).

### Fase 4 — Agregados globales (variables escalares)
- `@ImporteDeVenta = SUM(ImporteVta)` de `#DoctosPadres`, **excluyendo `PadreMAVI = 'Seguro Vida'`**.
- `@LiquidaCon = SUM(dbo.FNCXCPagoLiquidaBBVA(PadreMAVI, PadreIDMAVI))`.
- `@Atraso = SUM(Saldo)` de los hijos con `DiasVencidos`; `@moratorio = SUM(Moratorios)`.
- `@SaldoCapital = SUM(Saldo)` de los hijos, **excluyendo `'Seguro Vida'`**.
- `#PadreMAVIPagoLiquidaTemp` se puebla desde `Cxc` + `MaviBonificacionMoV`, y `#LiquidaCon` se crea, pero **ninguna de las dos se consume** en el resultado final (código muerto).

### Fase 5 — Resultado (`#Preliminar` + `#ArticulosDetalle`)
`#Preliminar` cruza `#DoctosPadres` con `Cte` (nombre) y `Cxc` (estatus), agregando moratorios por padre y las variables globales. `#ArticulosDetalle` suma `VentaD.Cantidad` por `Venta`. El `SELECT` final entrega **una fila por documento padre** con las columnas:

`ID, Mov, Movid, FechaEmision, CantArticulos, EnviarA, Estatus, ImporteTotal, Abono, ClienteIntelisis, NombreCliente, importeVenta, SaldoCapital, Atraso, Moratorio, AdeudoVencido, AdeudoTotal, LiquidaCon`

Fórmulas de las cabeceras: `Atraso = @Atraso + @Moratorio`, `AdeudoVencido = @Atraso + @Moratorio`, `AdeudoTotal = @SaldoCapital + @Moratorio`, `LiquidaCon = @LiquidaCon + @Moratorio`.

Finalmente hace `DROP` de todas las tablas temporales.

> **Columnas devueltas pero NO consumidas por C#:** `ID`, `Mov`, `EnviarA`, `Abono`, `AdeudoVencido`, `PagoPuntual`, `idCanalVenta`. Candidatas a descartarse en el contrato SAP.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

**Stored Procedure:** `SPCXCSaldosClientesPendiente` (único punto de acceso a datos del flujo).
**Conexión:** `Intelisis` / `IntelisisTmp` @ `MAVICUBOS.grupomavi.com`.
**Acciones:** todas de **lectura**. El SP no hace `INSERT`/`UPDATE`/`DELETE` sobre tablas persistentes — solo sobre tablas temporales de `tempdb`.

### Tablas persistentes leídas

| NombreTabla | Acción | Campos Principales |
|---|---|---|
| `Cxc` | Select | Cliente, ID, Mov, MovID, Vencimiento, Importe, Impuestos, Saldo, Estatus, PadreMAVI, PadreIDMAVI, ImpApoyoDima, SaldoApoyoDima, CobroCteFinal, ClienteEnviarA, SucursalOrigen, Concepto, Empresa, FechaEmision, Condicion, CteFinal, BonifCC |
| `MovTipo` | Select | Mov, Modulo, Clave |
| `MovCampoExtra` | Select | ID, Modulo, CampoExtra, Valor |
| `CxcMavi` | Select | ID, DiasVencActMAVI, DiasInacActMAVI |
| `TcIRM0906_ConfigDivisionYParam` | Select | DV, DI |
| `CxcD` | Select | ID, Aplica, AplicaID, Importe |
| `BonifSIMavi` | Select | IDCxc, MaviUltimoPago |
| `Condicion` | Select | Condicion, DAPeriodo, DANumeroDocumentos |
| `VentasCanalMAVI` | Select | ID, Categoria |
| `Cte_Final` | Select | ClienteF, ApellidoPaterno, ApellidoMaterno, Nombre, RFC |
| `AuxiliarP` | Select | Mov, MovID, Modulo, Abono, EsCancelacion |
| `Venta` | Select | ID, Mov, MovID, FormaPagoTipo |
| `VentaD` | Select | ID, Renglon, Articulo, Cantidad |
| `Art` | Select | Articulo, Descripcion1 |
| `MaviBonificacionMoV` | Select | Movimiento |
| `Cte` | Select | Cliente, Nombre |

### Funciones escalares SQL invocadas

| Función | Entrada | Salida |
|---|---|---|
| `dbo.Fn_MaviCalculaMoratorios` | `@ID` | Moratorios por documento hijo |
| `dbo.FN_MAVIRM0906CobxPol` | `@ID` | Marca `CobroXPolitica` |
| `dbo.FNCXCPagoLiquidaBBVA` | `@PadreMAVI, @PadreIDMAVI` | Monto de pago para liquidar |
| `dbo.FnMavi1erVencimPendPagoPP` | `@PadreMAVI, @PadreIDMAVI` | Índice de pago puntual |

### Tablas temporales (tempdb, no persistentes)

`#MovCxcTemp`, `#DoctosHijos`, `#DoctosPadres`, `#MaviUltimoPagoTemp`, `#PadreMAVIPagoLiquidaTemp`, `#LiquidaCon`, `#Preliminar`, `#ArticulosDetalle`.

**Sin servicios externos:** no hay `Curl`, Magento, SMS ni SAP dentro de la lógica de negocio.

---

## Ejemplo de Respuesta (Response)

Caso exitoso (objeto `ClienteSaldo` serializado, HTTP 200):
```json
{
  "clienteIntelisis": "C00000820",
  "importeVenta": "18500.00",
  "saldoCapital": "9250.00",
  "atraso": "1430.50",
  "moratorios": "230.50",
  "adeudoTotal": "9480.50",
  "liquidaConSolo": "8900.00",
  "facturas": [
    {
      "facturaId": "FAC-000123",
      "estatus": "PENDIENTE",
      "totalFactura": "12500.00",
      "fechaCompra": "12/03/25",
      "nombreCliente": "JUAN PEREZ LOPEZ",
      "articulos": "3"
    },
    {
      "facturaId": "FAC-000456",
      "estatus": "PENDIENTE",
      "totalFactura": "6000.00",
      "fechaCompra": "28/05/25",
      "nombreCliente": "JUAN PEREZ LOPEZ",
      "articulos": "1"
    }
  ]
}
```

Caso sin resultados (o excepción SQL silenciada) — LAN responde texto plano con **200**, DMZ lo replica como `Ok`:
```
"No tiene facturas"
```

Caso cliente con formato inválido — LAN responde **200** con texto plano; DMZ lo traduce a **400**:
```
"No existe el cliente"
```

Caso respuesta no parseable en DMZ → **500** sin cuerpo (`InternalServerError()`, sin log).

---

## Observaciones técnicas detectadas (deuda para la migración)

- **Excepción silenciada:** el `catch` del `ExecuteReader()` solo hace `Console.WriteLine(e.Message)`. No usa `Logger`, viola la Regla #8 (trazabilidad nivel producción) y hace que un fallo de BD sea indistinguible de "cliente sin facturas".
- **`SqlConnection` a nivel de campo de clase:** `FacturaMethods` mantiene un único `SqlConnection` compartido, y el controller LAN conserva una instancia de `FacturaMethods` como campo. Bajo carga concurrente esto puede producir `InvalidOperationException` ("The connection was not closed"). Debe migrar a `using (var conn = ...)` por invocación.
- **`conn.Close()` fuera de `finally`:** si `dt.Load(dr)` lanza una excepción no capturada por el `catch` interno, la conexión podría no cerrarse.
- **Todo como `string`:** montos y fechas se mapean con `.ToString()` a propiedades `string`, perdiendo tipado y dependiendo de la cultura del servidor para el formato (`FechaEmision` viene ya convertida a `varchar` estilo 1 desde el SP: `dd/mm/aa`).
- **Repetición de cabeceras:** el SP repite las columnas globales de saldo en cada fila; C# las descarta con el contador `cont`. En SAP conviene separar cabecera y detalle.
- **Código muerto en el SP:** `#PadreMAVIPagoLiquidaTemp` y `#LiquidaCon` se construyen y nunca se consumen.
- **Método síncrono:** migrar a `async/await` (`ExecuteReaderAsync`), Regla #12.
- **`'Seguro Vida'` hardcodeado:** el SP excluye por literal el `PadreMAVI = 'Seguro Vida'` de `@ImporteDeVenta` y `@SaldoCapital`. Esa regla de negocio debe modelarse explícitamente en SAP, no por nombre de movimiento.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN

**No se asigna API SAP en este documento.** El archivo `_GLOBAL_CreditController_DB.csv` del share tiene las columnas `Nombre TablaSAP` / `API SAP` **vacías para todos los endpoints de `CreditController`**, y no existe fila para `getClienteSaldo` en `_GLOBAL_MASTER_DB_v2`. Conforme a la **Regla #10 (Cero Suposiciones)**, no se infiere ningún servicio OData.

Puntos que requieren definición del Líder Técnico antes de programar:

1. **Servicio destino para partidas abiertas de cliente.** Este flujo es un estado de cuenta de CXC (FI-AR). ¿Se resuelve con un servicio OData estándar de partidas abiertas, con un `ZAPI_*` a la medida, o permanece en Intelisis durante la convivencia?
2. **Moratorios y "liquida con".** `Fn_MaviCalculaMoratorios`, `FNCXCPagoLiquidaBBVA` y `FnMavi1erVencimPendPagoPP` encapsulan reglas financieras propias de MAVI. ¿Se replican en ABAP dentro de S/4HANA, se reimplementan en C#, o persisten en `SigMavi`?
3. **Estructura padre/hijo `PadreMAVI`/`PadreIDMAVI`.** Es un modelo de agrupación propio de Intelisis sin equivalente directo. Requiere definición de cómo se representa la relación factura-madre ↔ parcialidades en SAP.
4. **Catálogos MAVI sin equivalente conocido:** `CxcMavi`, `TcIRM0906_ConfigDivisionYParam`, `VentasCanalMAVI`, `BonifSIMavi`, `MaviBonificacionMoV`, `Cte_Final`. Aplica la **Regla #1**: confirmar si migran a `SigMavi` como persistencia local o se reemplazan por SAP.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos cuatro puntos antes de diseñar el DTO destino.

---

#migracion #SAP #analisis_bd #dotnet #CreditController #getClienteSaldo #SPCXCSaldosClientesPendiente
