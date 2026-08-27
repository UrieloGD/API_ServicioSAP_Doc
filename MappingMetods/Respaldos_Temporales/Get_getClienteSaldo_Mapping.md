# Mapeo del Endpoint: `GET /credit/getClienteSaldo/{cliente}`

**Controlador/Clase:** `CreditController`
**Método Principal:** `GetClienteSaldo(string cliente)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe un parámetro `cliente` por URL (`/credit/getClienteSaldo/{cliente}`).
2. **Validación inicial (Regex):** 
   - Se valida el parámetro `cliente` contra la expresión regular `^[C]{1}[0-9]{8}$`.
   - Si no cumple, el método retorna inmediatamente `Ok("El cliente es incorrecto")`.
3. **Llamada a lógica de negocio:** 
   - Si el formato es válido, se invoca a `cs.getClienteSaldo(cliente)` correspondiente a la clase `FacturaMethods`.
4. **Ejecución en Base de Datos:**
   - En `FacturaMethods.getClienteSaldo(cliente)`, se ejecuta el Stored Procedure `SPCXCSaldosClientesPendiente` pasándole el parámetro `@Cliente = cliente`.
   - El resultado llena un `DataTable` mediante un `SqlDataReader`.
5. **Mapeo del Modelo:**
   - Si el `DataTable` tiene registros, se instancia un objeto `ClienteSaldo` y se mapea la primera fila a sus propiedades globales (`clienteIntelisis`, `importeVenta`, `saldoCapital`, `atraso`, `moratorios`, `adeudoTotal`, `liquidaConSolo`).
   - Posteriormente se itera sobre todas las filas devueltas para mapear una lista de objetos `Factura` (`facturaId`, `estatus`, `totalFactura`, `fechaCompra`, `nombreCliente`, `articulos`).
   - Se asigna esta lista a la propiedad `facturas` del objeto `ClienteSaldo`.
   - Si el `DataTable` no tiene información, retorna un objeto `ClienteSaldo` vacío.
6. **Validación Final en el Controlador:**
   - De vuelta en `CreditController`, se evalúa si `clienteSaldo.clienteIntelisis` es nulo o vacío (`string.IsNullOrEmpty`).
   - Si es vacío, retorna `Ok("No tiene facturas")`.
   - Si contiene datos, retorna el objeto `clienteSaldo` mapeado en formato JSON con un código 200 (Ok).

## Interacciones con Base de Datos (Tablas y SPs)

**Stored Procedure Ejecutado:** `SPCXCSaldosClientesPendiente`

A continuación el desglose de tablas involucradas durante el SP:

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Cxc, Select, "Cliente, ID, Mov, MovID, Vencimiento, Importe, Saldo, Estatus, PadreMAVI", , 
MovTipo, Select, "Mov, Modulo, Clave", , 
CxcMavi, Select, "ID, DiasVencActMAVI, DiasInacActMAVI", , 
TcIRM0906_ConfigDivisionYParam, Select, "DV, DI", , 
CxcD, Select, "ID, Aplica, AplicaID, Importe", , 
MovCampoExtra, Select, "Modulo, ID, CampoExtra, Valor", , 
BonifSIMavi, Select, "IDCxc, MaviUltimoPago", , 
Condicion, Select, "Condicion, DAPeriodo, DANumeroDocumentos", , 
VentasCanalMAVI, Select, "ID, Categoria", , 
Cte_Final, Select, "ClienteF, ApellidoPaterno, Nombre, RFC", , 
AuxiliarP, Select, "Mov, MovID, Modulo, Abono", , 
Venta, Select, "Mov, MovID, ID, FormaPagoTipo", , 
VentaD, Select, "ID, Articulo, Cantidad, Descripcion1", , 
Art, Select, "Articulo, Descripcion1", , 
MaviBonificacionMoV, Select, "Movimiento", , 
Cte, Select, "Cliente, Nombre", , 
```

## Ejemplo de Respuesta (Response)

```json
{
  "clienteIntelisis": "C00000820",
  "importeVenta": "1500.00",
  "saldoCapital": "1000.00",
  "atraso": "0.00",
  "moratorios": "0.00",
  "adeudoTotal": "1000.00",
  "liquidaConSolo": "950.00",
  "facturas": [
    {
      "facturaId": "12345",
      "estatus": "PENDIENTE",
      "totalFactura": "500.00",
      "fechaCompra": "2023-01-15T00:00:00",
      "nombreCliente": "JUAN PEREZ",
      "articulos": "2"
    },
    {
      "facturaId": "12346",
      "estatus": "PENDIENTE",
      "totalFactura": "500.00",
      "fechaCompra": "2023-02-15T00:00:00",
      "nombreCliente": "JUAN PEREZ",
      "articulos": "1"
    }
  ]
}
```
