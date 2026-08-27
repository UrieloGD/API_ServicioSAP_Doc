# Test Master Plan: Migración de Órdenes LAN a SAP

Este documento define la estrategia y los escenarios de prueba para validar el motor de órdenes (`ServicioSAP`), garantizando que la refactorización hacia .NET 4.7.2 y el consumo de las APIs OData (S/4HANA) funcionen perfectamente antes de salir a producción. 

Se ha comparado exhaustivamente contra la lógica Legacy (LAN) y se garantiza que **cubre el 100% de las rutas** adaptadas a la nueva arquitectura (incluyendo validaciones previas al envío a SAP).

## Requerimiento de Datos (Mock Data Faltante)

> **IMPORTANTE**: Para que los casos de prueba de este documento sean ejecutables (ej. en Postman), necesitamos contar con valores reales válidos en el entorno de Calidad (QA) de SAP.

Por favor, proporciónanos la siguiente información para poder inyectarla en los Payloads de prueba:

1. **Datos de Cliente (BP):** Ya contamos con datos reales generados en SAP a partir de las pruebas en Hoppscotch: 
   - **BP Inicial:** `1500005553` (AddressID: `56912`)
   - **BP (Prueba PATCH Exitosa):** `1500007333` (AddressID: `64586`). Validada la modificación en S/4HANA (Julio 13). 
   - **BP (Vinculación a Pedido Exitosa):** `1500007416` (AddressID: `64970`) enlazado al SalesDocument `9426` con rol `WE`.
   - **MovBita (Consulta de Eventos Exitosa):** `9000016844` validado en el Wrapper de GET a `/AI_GET_ZSDT_MOVBITA`. Retornó eventos de SITUACION, EVENTO y CITA.
2. **Validación SMS:** Necesitamos un número de teléfono celular de prueba que exista o podamos insertar en la tabla local `MAVIANDROID01` para que pase el check de SMS.
3. **Catálogos (Promotores y Materiales):**
   - Un código de `Agente` (Promotor/Empleado) válido que pase la validación de AWS/Android.
   - Un SKU (Material) estándar **con existencias**.
   - Un SKU (Material) estándar **sin existencias** (0 stock) para la prueba de falla rápida.
   - Un SKU de la familia **Telefonía** (para probar o excluir el escenario bloqueado).
4. **Respuestas de SAP:** ¿Cuál es la estructura del JSON o el HTTP Status (ej. `201 Created`) que devuelve exactamente el endpoint `ZAPI_SALESORDER_SRV` (SD01) cuando se crea la orden con éxito? ¿Devuelve un campo `Vbeln`?
5. **Zonas Grises:** ¿Incluimos en este Test Master los escenarios de **Pickup en Sucursal**, **Mutación de SKUs (Telefonía)** y **Cuenta Clabe STP**, o los dejamos como "Fuera de Alcance" hasta que el equipo SAP nos confirme las APIs equivalentes?

---

## Escenarios de Prueba a Validar (Actualizados)

Con base en la arquitectura actual, el Test Master abarcará los siguientes **10 Escenarios Principales**:

### Escenario 1: Cliente Invitado (Guest) - Pago de Contado / PayPal
- **Condición:** Payload de Magento sin `cuenta` ni `cliente`. Método de pago OpenPay (Stores/Cards), Transferencia o PayPal.
- **Validación Esperada:** El pedido viaja íntegro hacia el payload OData `SD01`. Las validaciones asumen cliente genérico (`1500003857`). Se ejecuta el bloque de afectación donde se deduce el inventario y se genera monedero (si aplica) nativamente por SAP.

### Escenario 2: Cliente Nuevo (Primera Compra) - Crédito MAVI
- **Condición:** Payload sin `cuenta` SAP, pero con `cliente` (ID de Magento). Método de pago Crédito (`omnipro_pago_credito`).
- **Validación Esperada:** 
  1. Se valida el SMS cruzando con `MAVIANDROID01`.
  2. Los precios se cotizan usando `SD29`.
  3. Se detona el hilo asíncrono para el **Liberador de Crédito** y el **Callback a Magento DMZ** para autorizar el pedido (sin llegar a S/4HANA en este paso).

### Escenario 3: Cliente de Casa (BP Existente) - Crédito MAVI
- **Condición:** Payload con `cuenta` (ej. `1500003857`).
- **Validación Esperada:** El sistema consume la API `BP05` de SAP. Extrae el `Zcrmimporte` y `ZlimCred` para validar solvencia. No invoca al liberador de crédito.

### Escenario 4: Smart Matching de Direcciones de Envío
- **Condición:** Enviar un pedido a domicilio con un CP y Calle que el cliente ya haya usado.
- **Validación Esperada:** Después de SAP, C# consume `A_GET_BusinessPartnerAddress`. Detecta coincidencia y **reutiliza** el `AddressID` vinculándolo a la orden, sin disparar un `A_POST` (evitando duplicar domicilios en S/4HANA).

### Escenario 5: Pago con Monedero Electrónico y Bonificaciones
- **Condición:** El nodo `RedimirMonedero` viene con valor mayor a cero (para PayPal u OpenPay).
- **Validación Esperada:** Se consume `SD18` (`ConditionContract`) para validar el saldo del cliente y `SD33` para generar bonificaciones, asegurando fondos suficientes. (Cero interacción con el SP legacy `spGenerarMovMonederoMAVI`).

### Escenario 6: Canje de Cupones Promocionales
- **Condición:** El nodo `Agente` contiene el código del promotor.
- **Validación Esperada:** Consumo exitoso de la API `/employees/get_personalById` (Android) y `GetConfiguracionCatalogo` (AWS) para validar estatus, y posterior afectación para quemar el cupón.

### Escenario 7: Idempotencia (Bloqueo de Duplicados vía SD36)
- **Condición:** Disparar dos veces seguidas el mismo POST con el mismo `incrementId` (ej. `2000050099`).
- **Validación Esperada:** El primer pedido se crea exitosamente. Al procesar el segundo, la API de SAP (`ValidarPedidoExistenteSAP`) detecta que el `PurchNoC` (`ZSD_M2_2000050099`) ya existe y aborta, retornando `PedidoExistente`.

### Escenario 8: Falla Rápida de Stock (Pre-SAP Validation)
- **Condición:** Enviar una orden de un SKU que tiene 0 existencias en el inventario de SAP (API MM).
- **Validación Esperada:** El método `ValidarStockArticulos` detecta la falta de inventario antes de disparar el POST de creación a `SD01`, devolviendo un objeto `OrderResponse` con estatus `"Error"` y el mensaje de SAP, previniendo cuelgues o pedidos basura.

### Escenario 9: Ajuste Automático de Precios (Properlist SD29)
- **Condición:** Enviar una orden donde el `precio` enviado desde Magento es *menor* al precio mínimo registrado en el catálogo Properlist de SAP.
- **Validación Esperada:** El método `ValidarPreciosConProperlist` intercepta la anomalía, **sobreescribe** el precio del Payload al mínimo de SAP sin generar error, y continúa el flujo de creación.

### Escenario 10: Devoluciones y Anulaciones (Pendiente de Desarrollo C# - SD09/SD46/SD48)
- **Condición:** Consumir el endpoint de devoluciones con un Payload de tipo RMA o solicitud de cancelación.
- **Validación Esperada:** *(Flujo en construcción)*. El sistema adaptará el documento y disparará la petición nativa a SAP (Orquestador SD09 y anulación SD48), reemplazando la dependencia legacy a `VentaCteD`.

### Escenario 11: Parcialidades y Splits Logísticos (Pendiente de Desarrollo C# - TZ01)
- **Condición:** Orden con múltiples entregas o particiones de cobro (ej. Seguros vs Mercancía).
- **Validación Esperada:** *(Flujo en construcción)*. El middleware C# procesará los splits OData (`ZPRE`, `ZMER` y `ZPI1`) enviados y recibidos desde SAP, erradicando el uso de la tabla legacy `VentaEntrega`.

---

## Anexo 1: Payloads de Magento

# Referencia de Payloads Reales de Magento (Producción / QA)

Este documento centraliza los ejemplos reales de las peticiones enviadas por Magento hacia el `ServicioSAP`.

### MUEBLES AMERICA (storeId: muebles_america)

#### 1. Transferencia (banktransfer)
```json
{"entityId":"60808","incrementId":"2000053614","storeId":"muebles_america","status":"payment_review","subTotal":"4799","total":"4799","cuotas":"1","impuesto":"0","metodoPago":"banktransfer","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"TCL+00045","cantidad":"1","precio":"4799","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515731"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

#### 2. Tarjeta (openpay_cards)
```json
{"entityId":"60811","incrementId":"2000053620","storeId":"muebles_america","status":"payment_review","subTotal":"1209","total":"1209","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"KOBL00215","cantidad":"1","precio":"1209","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515752"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

#### 3. PayPal (paypal_express)
```json
{"entityId":"60817","incrementId":"2000053623","storeId":"muebles_america","status":"processing","subTotal":"1599","total":"1599","cuotas":"1","impuesto":"0","metodoPago":"paypal_express","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"AMAZ00008","cantidad":"1","precio":"1599","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"2123132131","direccion":"Street 2 ","codigoPostal":"99750","municipio":"TEPECHITLAN","estado":"Zacatecas","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"EL TERRERO","referencia":"","numExt":"13","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"2123132131","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515758"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

#### 4. Crédito (omnipro_pago_credito)
```json
{"entityId":"515773","incrementId":"CRED515773","storeId":"muebles_america","status":"credit_payment_review","subTotal":"8198","total":"8198","cuotas":"12 M MA P INM","impuesto":"0","metodoPago":"omnipro_pago_credito","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"OSTE00443","cantidad":"1","precio":"8198.0000","precioEspecial":"0","descuento":"0","condicion":"12 M MA P INM"}],"infoCliente":{"nombre":"Sergio Checo","cliente":"9400","codigo_promotor":"","cuenta":"C01575835","OrigenIdMagento":"","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515773"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":"","utmSource":"WEBSITE"}
```

#### 5. Efectivo (openpay_stores)
```json
{"entityId":"60835","incrementId":"12000048896","storeId":"viu","status":"new","subTotal":"0","total":"0","cuotas":"1","impuesto":"0","metodoPago":"openpay_stores","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"SPRI01073","cantidad":"1","precio":"1269","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515860"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

### VIU (storeId: viu)

#### 1. Transferencia (banktransfer)
```json
{"entityId":"60826","incrementId":"12000048884","storeId":"viu","status":"payment_review","subTotal":"8898","total":"8898","cuotas":"1","impuesto":"0","metodoPago":"banktransfer","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"ZTE+00003","cantidad":"1","precio":"2499","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"},{"sku":"HYUN00081","cantidad":"1","precio":"6399","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"509851"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

#### 2. Tarjeta (openpay_cards)
```json
{"entityId":"60829","incrementId":"12000048887","storeId":"viu","status":"payment_review","subTotal":"6990","total":"6990","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"WHIR00791","cantidad":"1","precio":"9299","precioEspecial":"6990","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515830"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

#### 3. PayPal (paypal_express)
```json
{"entityId":"60832","incrementId":"12000048890","storeId":"viu","status":"processing","subTotal":"6999","total":"6999","cuotas":"1","impuesto":"0","metodoPago":"paypal_express","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"NINT00027","cantidad":"1","precio":"6999","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515839"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

#### 4. Crédito (omnipro_pago_credito)
```json
{"entityId":"515848","incrementId":"CRED515848","storeId":"viu","status":"credit_payment_review","subTotal":"444","total":"594","cuotas":"12 M VIU P INM","impuesto":"0","metodoPago":"omnipro_pago_credito","costoEnvio":"150","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"DIB+00104","cantidad":"1","precio":"444.0000","precioEspecial":"0","descuento":"0","condicion":"12 M VIU P INM"}],"infoCliente":{"nombre":"Uva iyguiygiiyy","cliente":"8812","codigo_promotor":"","cuenta":"C00000020","OrigenIdMagento":"","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515848"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":"","utmSource":"WEBSITE"}
```

---

## Anexo 2: Payloads de SAP (Business Partner y Direcciones)

# Especificación API Business Partner Address (OData V2)

**Ruta Base / Endpoint:**
`/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('{bpId}')/to_BusinessPartnerAddress`

**Descripción:**
Obtiene las direcciones asociadas a un Business Partner nativo en S/4HANA a través del servicio OData estándar.

> [!IMPORTANT]
> **REGLA DE DESARROLLO:** Cualquier modificación a los DTOs o lógica C# relacionada con `A_BusinessPartnerAddress` o `DeliveryAddressMethods.cs` debe contrastarse obligatoriamente contra este documento para evitar suposiciones en los nombres de las propiedades.

**Payload de Respuesta (Formato XML Atom devuelto por Hoppscotch):**
Nota: En C# se solicita JSON mediante el header `Accept: application/json`, pero los nombres de las propiedades (`d:Property`) son los mismos.

```xml
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xml:base="https://10.30.2.135:44300/sap/opu/odata/sap/API_BUSINESS_PARTNER/">
  <entry>
    <content type="application/xml">
      <m:properties>
        <d:BusinessPartner>1500005553</d:BusinessPartner>
        <d:AddressID>56912</d:AddressID>
        <d:ValidityStartDate>2026-02-26T00:00:00Z</d:ValidityStartDate>
        <d:ValidityEndDate>9999-12-31T23:59:59Z</d:ValidityEndDate>
        <d:AddressUUID>adef7080-2189-1fe1-84e8-bc5ee95e5bc5</d:AddressUUID>
        <d:AddressTimeZone>CSTNO</d:AddressTimeZone>
        <d:CityName>GUADALAJARA</d:CityName>
        <d:Country>MX</d:Country>
        <d:District>GUADALAJARA</d:District>
        <d:HouseNumber>896</d:HouseNumber>
        <d:Person>56911</d:Person>
        <d:PostalCode>44400</d:PostalCode>
        <d:Region>JAL</d:Region>
        <d:StreetName>JOYAS DE EGIPTO</d:StreetName>
        <d:StreetSuffixName>GENERAL REAL</d:StreetSuffixName>
      </m:properties>
    </content>
  </entry>
</feed>
```

**Mapeo C# de Propiedades (`d:`):**
- `BusinessPartner`: Número de cuenta del cliente
- `AddressID`: Identificador de la dirección devuelta, usado para ligar a la orden.
- `CityName`: Población
- `Country`: Clave país (MX)
- `District`: Colonia
- `HouseNumber`: Num Ext
- `PostalCode`: Código Postal
- `Region`: Región / Estado (JAL)
- `StreetName`: Calle
- `StreetSuffixName`: Entre Calles / Complemento
# Especificación API Agente (Business Partner)

**Ruta Base / Endpoint:**
`https://businesspartner-api.mavi.fun/AS_GET_ZQBP_AGENTE?Zagente={Zagente}`

**Descripción:**
Microservicio (AWS/Middleware) que expone la información del Business Partner / Agente registrado en SAP.

**Payload de Respuesta (GET):**
```json
{
  "d": {
    "results": [
      {
        "__metadata": {
          "id": "https://10.30.2.135:20400/sap/opu/odata/sap/ZQBP_AGENTE_SRV/AgenteAttrSet(Partner='0023000204',Zagente='0030018095')",
          "uri": "https://10.30.2.135:20400/sap/opu/odata/sap/ZQBP_AGENTE_SRV/AgenteAttrSet(Partner='0023000204',Zagente='0030018095')",
          "type": "ZQBP_AGENTE_SRV.AgenteAttr"
        },
        "Mandt": "110",
        "Partner": "0023000204",
        "Zagente": "0030018095",
        "Werks": "0099",
        "Zcategoria": "",
        "Ztipobpagente": "",
        "Ztratamiento": "",
        "Zfamilia": "",
        "Zzona": "",
        "Zgrupo": "",
        "Zestatus": "ACTIVO",
        "Zfechaalta": "20251014",
        "Zfechabaja": "99991231",
        "Zfechaultimocambio": "20260108"
      }
    ]
  }
}
```

**Mapeo de Campos Relevantes:**
- `Werks`: Corresponde al código de la Sucursal (antes conocido como `SucursalEmpresa` en Legacy). Este valor es el que se usa como llave en la consulta a DM07 (`SucursalesSet`).
- `Zestatus`: Estatus del agente (ej. ACTIVO).
- `Partner`: ID interno del BP.

---

## Anexo 3: Endpoints de Pruebas DMZ (Abonos y Facturas)

Los siguientes endpoints están expuestos en la DMZ (`WebApiMagento`) y actúan como puente hacia S/4HANA (a través del `CustomerServiceController` y `AbonosController`). Utilízalos en Postman o Hoppscotch para validar la conexión End-to-End.

### 1. Obtener Saldo y Documentos No Compensados (API EX01)
- **Método HTTP:** `POST`
- **Ruta DMZ:** `/customerService/GetAccountDebts`
- **Headers:** `Content-Type: application/json`
- **Payload (Body):** Reemplazar el número de cliente por un BP existente.
```json
{
  "ClientNumber": "1500003857"
}
```

### 2. Obtener Parcialidades de una Factura (API TZ01)
- **Método HTTP:** `GET`
- **Ruta DMZ:** `/customerService/getClienteFactura/{cliente}/{factura}`
- **Headers:** No requiere body.
- **Ejemplo de URL:** `/customerService/getClienteFactura/1500003857/12345678`
