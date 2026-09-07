# Comparativa de Flujos: LAN `SetPedido` vs SAP `SetOrderAsync`

## Resumen Ejecutivo

El flujo de LAN **delega absolutamente todo el control de precios, validaciones y estados al SP de Intelisis** (`SP_eCommerceNuevoPed` / `SPVTASPedidosMagento`). El C# de LAN es solo un "cartero" que empaqueta datos en un array de strings y llama SPs.

El flujo de SAP **asume control total desde C#**: valida precios, stock, condiciones de pago, y arma el JSON de OData antes de hacer POST a SAP.

---

## Comparativa Fase por Fase

### FASE 1: Transformación Inicial

| Aspecto | LAN `SetPedido` | SAP `SetOrderAsync` | Estado |
|---------|-----------------|---------------------|--------|
| Agrupación SKU | `AgruparCantidadPorSKU()` → `Dictionary<string,string>` | `AgruparCantidadPorSKU()` → `ArticuloRequest` tipado | ✅ Equivalente |
| Serialización | `ToArray()` → `string[]` de 38+ posiciones | `ToArray()` se mantiene para compatibilidad, pero se usa el modelo tipado | ✅ Equivalente |
| Precio Especial → forzarOrder | Si `precioEspecial != "0"`, fuerza `order.forzarOrder = "1"` y usa `precioEspecial` como `precio` | **NO tiene esta lógica**. El `precioEspecial` se pasa por separado en `to_conditions` (ZMON) | ⚠️ Diferencia |

> [!WARNING]
> **Hallazgo Crítico - Precio Especial:** En LAN, cuando un artículo tiene `precioEspecial != "0"`, el `ToArray()` **sustituye el precio normal por el precio especial** (líneas 368-378 y 385-396). Esto significa que el SP de Intelisis siempre recibe el precio especial como si fuera el normal. En SAP, el precio normal y el especial viajan en campos separados (`Kwert` y `Zkbetr2`). **Esto puede causar diferencias en el importe final si SAP no interpreta ZMON de la misma forma.**

---

### FASE 2: Validación de Duplicados (Idempotencia)

| Aspecto | LAN | SAP | Estado |
|---------|-----|-----|--------|
| Mecanismo | `obtenerIdVenta(idEcommerce)` → SQL `SELECT id FROM venta WHERE idecommerce = @id` | `ValidarPedidoExistenteSAPAsync(purchNoC)` → OData SD36 `$filter=PurchNoC eq 'ZSD_ZMER_xxx'` | ✅ Equivalente (diferente fuente) |
| Excepción PayPal | Si `forzarOrder = "0"` **Y** `metodoPago == PAYPAL`, permite duplicados | Se restauró la misma lógica en `SetOrderAsync`: `(forzarOrder == "0" || metodoPago == PAYPAL_METHOD)` | ✅ Equivalente |

---

### FASE 3: Openpay & Crédito (Early Exit)

| Aspecto | LAN | SAP | Estado |
|---------|-----|-----|--------|
| Openpay Cards | `OpenpayMethods.SaveToValidateOpenpay()` → return temprano si `!liberado` | `SaveToValidateOpenpay()` → return temprano siempre | ✅ Equivalente |
| Openpay Stores | `OpenpayMethods.SaveOpenpayStoresOrder()` → **continúa flujo** | `SaveOpenpayStoresOrder()` → **continúa flujo** | ✅ Equivalente |
| Crédito | `CreditMethods.ProductosCreditoWeb_SaveData()` → return `cuentaCredito` | `ProcessCreditPaymentAsync()` → return `OrderResponse` con cuenta | ✅ Equivalente |
| Crédito: Validación SMS | `IsValidated()` SQL directo a `CteTel` | `IsValidatedAsync()` → BP05 OData `ztelCte` y `zvalTel` | ✅ Migrado a SAP |
| Crédito: Artículo Seguro | Agrega `SEGU00001` si `costoEnvio > 0` | Agrega `SEGU00001` si `costoEnvio > 0` | ✅ Equivalente |

---

### FASE 4: Validaciones Pre-Inserción

| Aspecto | LAN | SAP | Estado |
|---------|-----|-----|--------|
| Validación de precios | **NO existe en C#.** El SP `SpVTASeCommerceDetPedidos` valida internamente y puede retornar `"PrecioIncorrecto"` | `ValidarPreciosConProperlistAsync()` → consulta OData Properlist por SKU y ajusta precio si es menor | 🆕 Nuevo en SAP |
| Validación de stock | **NO existe en C#.** Intelisis valida stock en el SP al afectar | `ValidarStockArticulos()` → OData DIM11 por material/plant. Fail-fast si no hay stock | 🆕 Nuevo en SAP |
| Validación región celulares | **Existía dentro del SP** `SP_eCommerceNuevoPed` consultando `VTASCRegionSku` | `ValidarRegionCelulares()` la extrajo a la capa de C# | ✅ Migrado a SAP |
| Resolución de Partner | Intelisis crea/busca cliente dentro del SP | `ResolvePartnerNumberForOrderAsync()` → BP01/BP05 OData | ✅ Migrado a SAP |

> [!IMPORTANT]
> **Hallazgo Clave - Precios:** En LAN, la validación de precios vivía **dentro del SP** `SpVTASeCommerceDetPedidos` (observa la línea 1053: `if (sOpcion == "PrecioIncorrecto")`). El SP comparaba el precio enviado contra su catálogo interno y retornaba `"PrecioIncorrecto"` si no coincidía. En SAP, esta lógica la absorbe `ValidarPreciosConProperlistAsync()` consultando Properlist OData. **Ambos sistemas validan precios, pero en capas diferentes.**

---

### FASE 5: Inserción del Pedido

| Aspecto | LAN | SAP | Estado |
|---------|-----|-----|--------|
| Mecanismo | `crearPedido()` → SP `SP_eCommerceNuevoPed` con 20+ parámetros SQL | `BuildSapOrderAsync()` → JSON OData → POST `ZAPI_SALESORDER_SRV` | ✅ Migrado |
| Detalle de artículos | `detallePedido("Insertar")` → SP `SpVTASeCommerceDetPedidos` | `to_items[]`, `to_conditions[]`, `to_text[]`, `to_autoincr[]`, `to_series[]` | ✅ Migrado |
| Org Ventas | SP lo asigna internamente por UEN | C# lo determina: viu→05, MA→04 | ✅ Migrado |
| Plant | SP lo asigna internamente | C# lo determina: viu contado→0041, MA contado→0090, crédito→0504/0505 | ✅ Migrado |
| Condición de pago | El SP toma la condición del artículo | `GetCondicionAsync()` → OData SD40 `$filter=Zterm eq '...'` | ✅ Migrado |

---

### FASE 6: Post-Inserción

| Aspecto | LAN | SAP | Estado |
|---------|-----|-----|--------|
| SaveGuide (SQLite) | `SaveGuide()` a `data.db` local | `SaveGuide()` idéntico a `data.db` local | ✅ Equivalente |
| Datos de entrega | `DatosEntregaInsert()` → SQL INSERT a `DM0312DatosEntrega` | `DatosEntregaInsertAsync()` → OData `A_BusinessPartnerAddress` | ✅ Migrado a SAP |
| Pickup en sucursal | `CodigoRecogerSucursal.crearPrimerCodigoRecogerSucbanktransfer()` | `RegisterPickupClientInfo()` | ✅ Migrado |
| Monedero | `GenerarMonedero()` → SPs: `xpVerificarMovMonederoMAVI` + `SP_DM0312TarjetaSerieMovMAVI` + `spGenerarMovMonederoMAVI` | `GenerarMonederoSAPAsync()` → OData `ZAPI_CONDITIONCONTRACT_SRV` | ✅ Migrado a SAP |
| Afectar pedido | `afectar()` → SP `spAfectar` (solo para Openpay/PayPal) | **NO tiene equivalente directo.** SAP afecta al crear el documento | ⚠️ Eliminado (SAP) |
| Callback BP | No existe | `CallSetCAccountCallbackAsync()` → webhook a DMZ | 🆕 Nuevo en SAP |

> [!NOTE]
> **`afectar()` ya no es necesario** porque en Intelisis el pedido se creaba en estado "SinAfectar" y necesitaba un segundo paso para cambiar el estatus. En SAP, el documento de venta se crea ya en estado válido con el POST a `ZAPI_SALESORDER_SRV`.

---

### FASE 7: Retorno

| Aspecto | LAN | SAP | Estado |
|---------|-----|-----|--------|
| Respuesta exitosa | `return GetCreatedAccount(incrementId)` (string con cuenta) | `return sapResponse` (`OrderResponse` con toda la info de SAP) | ✅ Mejorado |
| Respuesta error | `return sRespuestaPedido` (string) | `throw Exception` con detalle de SAP | ✅ Mejorado |

---

## Resumen de Diferencias Críticas

| # | Diferencia | Impacto | Acción Sugerida |
|---|-----------|---------|-----------------|
| 1 | **Precio Especial en ToArray()**: LAN sustituye `precio` por `precioEspecial` cuando `!= "0"`. SAP los mantiene separados | Podría haber diferencias en el importe que recibe SAP vs lo que recibía Intelisis | Validar que `to_conditions[ZMON]` y `Zkbetr2` cumplan la misma función que el swap de LAN |
| 2 | **Validación de precios**: LAN la hacía el SP, SAP la hace el C# con Properlist | Si la Properlist no tiene precios para org 04/05, la validación falla silenciosamente | Ya detectamos este caso: artículos sin precios en org 04/05 |
| 3 | **afectar()**: LAN usaba `spAfectar` para cambiar estatus. SAP no lo necesita | Ninguno: SAP crea el doc de venta afectado directamente | ✅ OK - No requiere acción |
| 4 | **PrecioIncorrecto**: LAN podía retornar `"PrecioIncorrecto"` y enviar correo de error (`CorreoErrorPrecio`). SAP no tiene ese flujo | Si SAP recibe un precio que no cuadra, simplemente lo ajusta al mínimo | Evaluar si necesitamos notificación por correo |

---

## Conclusiones del Grill-Me (Validadas por el Líder Técnico)

| # | Decisión | Resultado |
|---|----------|-----------|
| 1 | **Precio Especial:** ¿Replicar el swap de LAN? | ❌ **NO.** SAP maneja bien ambos precios por separado con ZPCP/ZMON. Dejamos como está |
| 2 | **Correo de Error de Precio:** ¿Replicar `CorreoErrorPrecio()`? | ✅ **SÍ.** Crear `SendPriceErrorEmailAsync()`, pero **queda PENDIENTE** hasta tener config SMTP |
| 3 | **`afectar()` (spAfectar):** ¿Se necesita equivalente? | ❌ **NO.** Deprecado. SAP crea el documento ya afectado |
| 4 | **Monedero:** ¿Dónde vive? | ✅ SAP OData `ZAPI_CONDITIONCONTRACT_SRV` vía `GenerarMonederoSAPAsync()` |
| 5 | **Callback DMZ (`CallSetCAccountCallbackAsync`):** ¿Mantener? | ✅ **SÍ.** Mantener pero **pendiente de desarrollo externo** |
| 6 | **Validación de Stock:** ¿Fail-fast es correcto? | ✅ **SÍ.** Mejor validar stock vía OData cada vez que se crea una orden |
| 7 | **Mapeo Org Ventas/Plant:** ¿Es correcto? | ✅ **SÍ.** viu→05/0041, MA→04/0090, crédito→0504/0505 |
| 8 | **SMTP en ServicioSAP:** ¿Cómo implementar? | 🔜 **PENDIENTE.** No existe SMTP configurado. Se migrará después |

## Análisis de SP_eCommerceNuevoPed (Reglas Faltantes/Diferentes)

Al revisar exhaustivamente el stored procedure legacy (`SP_eCommerceNuevoPed.sql`), se identificaron 3 reglas de negocio que **no están explícitamente portadas** al flujo actual en `SetOrderAsync` de C#. Durante la época de LAN, el C# no conocía estas reglas porque simplemente enviaba el array de datos al SP y el SP tomaba las decisiones. Como ahora en SAP el C# construye el payload completo, necesitamos decidir si migrar esta lógica al código C#.

### 1. Asignación Dinámica de Planta por Agente en Store Pickup

* **¿Dónde sucedía en LAN (SP)?** 
  En `SP_eCommerceNuevoPed.sql` (Líneas 230-242):
  ```sql
  IF @tipopago = 'banktransfer' AND @Agente != '' AND @MetodoEnvio = 'instore_pickup'
  BEGIN
      SELECT @Sucursal = SucursalEmpresa FROM Agente WITH (NOLOCK) WHERE Agente = @Agente AND Estatus = 'Alta'
      SELECT @Almacen = ISNULL(AlmacenPrincipal, '') FROM Sucursal WITH (NOLOCK) WHERE Sucursal = @Sucursal
  END
  ```
* **¿Por qué no lo tenemos en SAP (C#)?**
  En el flujo actual de `ServicioSap` (Líneas 2093-2110 de `OrderMethods.cs`), la asignación de la planta (`sapPlant`) y la oficina de ventas (`sapSalesOffice`) está *hardcodeada* dependiendo **únicamente** del `storeId` (ej. si es "viu" -> 0041, si es "muebles_america" -> 0090). El C# actual nunca evalúa si el pedido trae un Agente para "robarse" la venta hacia la planta de ese Agente.
* **¿De qué manera debería implementarse?**
  Antes de armar el JSON para SAP, si detectamos `instore_pickup` + transferencia + agente, debemos invocar el endpoint de SuccessFactors/BP (`/AS_GET_ZQBP_AGENTE?Zagente=...`) para obtener el campo `Werks` (planta) de ese agente, y sobreescribir las variables `sapPlant` y `sapSalesOffice` con ese valor. (Similar a lo que ya hace `HandlePromoCodeAsync` para validar el cupón).

### 2. Agente Dummy por Defecto (Fallback)

* **¿Dónde sucedía en LAN (SP)?**
  Al insertar el encabezado de la venta (Líneas 386-394):
  ```sql
  ,CASE -- Agente
      WHEN @UEN = 1 AND @Agente = '' THEN 'P000090'
      WHEN @UEN = 2 AND @Agente = '' THEN 'P000041'
      ELSE @Agente
  END
  ```
* **¿Por qué no lo tenemos en SAP (C#)?**
  En el nuevo flujo (Líneas 2672), simplemente mapeamos el Agente tal como viene del request. Si viene vacío o nulo, le mandamos a SAP una cadena vacía: `Zusuariopos = orderRequest.Agente?.Trim() ?? string.Empty`. No tenemos la lógica de fallback al agente comodín.
* **¿De qué manera debería implementarse?**
  Si las reglas de SAP obligan a que todo pedido web tenga un agente asociado para temas de comisiones/reportes, deberíamos agregar un `if (string.IsNullOrEmpty(orderRequest.Agente))` y asignarle `P000090` (MA) o `P000041` (VIU) según la tienda antes de mandarlo en `Zusuariopos`.

### 3. Registro de Cupones Genéricos ("Contado")

* **¿Dónde sucedía en LAN (SP)?**
  Líneas 631-656:
  ```sql
  IF ISNULL(@Agente, '') != ''
  BEGIN
      ... -- Obtiene sucursal
      INSERT INTO VTASCVentaCupon (Codigo, Agente, FechaEnvio, FechaUtilizacion, IDEcommerce, Cliente, Sucursal)
      VALUES ('Contado', @Agente, GETDATE(), GETDATE(), @IdMag, @Cliente, @Sucursal)
  END
  ```
* **¿Por qué no lo tenemos en SAP (C#)?**
  En el C# de SAP, tenemos un método `HandlePromoCodeAsync` que efectivamente gestiona cupones (inserta/quema en la tabla `VentasCupones`), pero **sólo se dispara si el cliente realmente ingresó un código promocional** (`datosArray[72]`). En LAN, el SP insertaba un registro falso/genérico de cupón ("Contado") **siempre** que la venta la hiciera un Agente, posiblemente para que Intelisis le pagara comisión al asesor por ventas de contado.
* **¿De qué manera debería implementarse?**
  Si el área contable/comercial aún usa esta tabla para calcular comisiones de agentes, tendríamos que replicar el `INSERT INTO VTASCVentaCupon` con el código "Contado" dentro de C#, o verificar si SAP ya cubre las comisiones de contado nativamente por el simple hecho de mandar el `Zusuariopos` en el payload.

### Acciones Pendientes

- [ ] **`SendPriceErrorEmailAsync()`**: Crear método para notificar discrepancias de precios. Requiere previamente migrar el helper SMTP de LAN (`CodigoRecogerSucursal.EnviarCorreo()`) al proyecto ServicioSAP.
- [ ] **Callback DMZ**: `CallSetCAccountCallbackAsync()` está en el código pero pendiente de desarrollo externo.
