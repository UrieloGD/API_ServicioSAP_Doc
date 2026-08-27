# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /credit/SetUnificationWalletData`

**Controlador/Clase:** `CreditController`
**Método Principal:** `SetUnificationWalletData(UnificationWalletDataRequest data)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe vía POST un objeto `UnificationWalletDataRequest` (que contiene las propiedades `IdEcommerce`, `ClienteCredito` y `ClienteContado`).
2. **Llamada a la lógica de negocio:** 
   - El controlador llama al método `InsertUnificationWallet(data)` de la clase `CreditMethods`.
3. **Validaciones Previas (Ejecución en Base de Datos):**
   - **`ClienteTieneSerieMonedero`**: Valida si el cliente de crédito tiene una serie asignada realizando un `SELECT` a la tabla `Cte`.
   - **`AccountType` (Contado)**: Verifica que la cuenta de contado pertenezca a la categoría `"CONTADO"` mediante un `SELECT` cruzando `Cte` y `CteEnviarA`.
   - **`AccountType` (Crédito)**: Verifica que la cuenta de crédito pertenezca a la categoría `"CREDITO MENUDEO"` con el mismo cruce de tablas.
   - **`checkSaldo`**: Llama al SP `SpCREDIDatosSolicitudCreditoArt` pasando `@Op = 'GetSaldo'` sobre la cuenta de contado. Este SP suma saldos de la tabla `Venta`, cruzando con `VentaD`, y saldos pendientes de `CXC`, además de consultar el límite de crédito en `cte`.
   - **Validación final de saldos**: Si la cuenta no pertenece al canal de contado, pero tiene saldo, y tampoco pertenece al canal de crédito, se rechaza la unificación (`return false`).
4. **Inserción de Datos:**
   - Si todas las validaciones pasan, se ejecuta un `INSERT` directo en la tabla `CREDIHUnificacionMonedero` grabando el `IdEcommerce`, `ClienteCredito`, `ClienteContado`, y la fecha actual.
5. **Respuesta Final:**
   - Retorna un valor booleano (`true` o `false`) envuelto en JSON a través de `Json()`.

## Interacciones con Base de Datos (Tablas y SPs)

**Stored Procedure Ejecutado:** `SpCREDIDatosSolicitudCreditoArt` (Sólo lectura con `@Op = 'GetSaldo'`)
**Consultas Directas:** Lectura en `Cte`, `CteEnviarA` e Inserción en `CREDIHUnificacionMonedero`.

A continuación, el desglose total de tablas afectadas por todo el flujo:

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Cte, Select, "SerieMonedero, SerieMonederoVIU, Cliente", , 
CteEnviarA, Select, "Cliente, ID, Categoria", , 
Venta, Select, "Saldo, Mov, MovID, Estatus, Situacion", , 
VentaD, Select, "ID", , 
CXC, Select, "saldo, estatus, Mov, cliente", , 
cte, Select, "CRMCantidad, cliente", , 
CREDIHUnificacionMonedero, Insert, "IdEcommerce, ClienteCredito, ClienteContado, FechaRegistro", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Post_SetUnificationWalletData_Tablas.csv`)*

## Ejemplo de Petición (Request)

```json
{
  "IdEcommerce": "1WEB-123",
  "ClienteCredito": "C00012345",
  "ClienteContado": "C00054321"
}
```

## Ejemplo de Respuesta (Response)

El endpoint retorna si la inserción fue exitosa o rechazada por validaciones:

```json
true
```


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
