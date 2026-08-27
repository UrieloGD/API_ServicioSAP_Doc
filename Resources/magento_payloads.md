# Payloads de Magento para Pruebas E2E (Ordenes)

Este documento unifica y cataloga los payloads exactos enviados por el frontend de Magento hacia `ServicioSAP`. Sirven como base para realizar pruebas locales (Mock) de la asignación dinámica de `storeId` (Muebles América = 0090/0504, VIU = 0041/0505) y de los métodos de pago (Crédito vs Contado).

---

## 🏬 MUEBLES AMÉRICA (`storeId: "muebles_america"`)

### Transferencia Bancaria (`banktransfer`)
```json
{"entityId":"60808","incrementId":"2000053614","storeId":"muebles_america","status":"payment_review","subTotal":"4799","total":"4799","cuotas":"1","impuesto":"0","metodoPago":"banktransfer","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"TCL+00045","cantidad":"1","precio":"4799","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515731"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

### Tarjeta / OpenPay Cards (`openpay_cards`)
```json
{"entityId":"60811","incrementId":"2000053620","storeId":"muebles_america","status":"payment_review","subTotal":"1209","total":"1209","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"KOBL00215","cantidad":"1","precio":"1209","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515752"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

### PayPal (`paypal_express`)
```json
{"entityId":"60817","incrementId":"2000053623","storeId":"muebles_america","status":"processing","subTotal":"1599","total":"1599","cuotas":"1","impuesto":"0","metodoPago":"paypal_express","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"AMAZ00008","cantidad":"1","precio":"1599","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"2123132131","direccion":"Street 2 ","codigoPostal":"99750","municipio":"TEPECHITLAN","estado":"Zacatecas","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"EL TERRERO","referencia":"","numExt":"13","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"2123132131","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515758"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

### Crédito MAVI (`omnipro_pago_credito`)
```json
{"entityId":"515773","incrementId":"CRED515773","storeId":"muebles_america","status":"credit_payment_review","subTotal":"8198","total":"8198","cuotas":"12 M MA P INM","impuesto":"0","metodoPago":"omnipro_pago_credito","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"OSTE00443","cantidad":"1","precio":"8198.0000","precioEspecial":"0","descuento":"0","condicion":"12 M MA P INM"}],"infoCliente":{"nombre":"Sergio Checo","cliente":"9400","codigo_promotor":"","cuenta":"C01575835","OrigenIdMagento":"","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515773"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":"","utmSource":"WEBSITE"}
```

### Efectivo / OpenPay Stores (`openpay_stores`)
```json
{"entityId":"60823","incrementId":"2000053632","storeId":"muebles_america","status":"new","subTotal":"1249","total":"1249","cuotas":"1","impuesto":"0","metodoPago":"openpay_stores","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"DOSE00095","cantidad":"1","precio":"1249","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515788"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

---

## 🏬 VIU (`storeId: "viu"`)

### Transferencia Bancaria (`banktransfer`)
```json
{"entityId":"60826","incrementId":"12000048884","storeId":"viu","status":"payment_review","subTotal":"8898","total":"8898","cuotas":"1","impuesto":"0","metodoPago":"banktransfer","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"ZTE+00003","cantidad":"1","precio":"2499","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"},{"sku":"HYUN00081","cantidad":"1","precio":"6399","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"509851"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

### Tarjeta / OpenPay Cards (`openpay_cards`)
```json
{"entityId":"60829","incrementId":"12000048887","storeId":"viu","status":"payment_review","subTotal":"6990","total":"6990","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"WHIR00791","cantidad":"1","precio":"9299","precioEspecial":"6990","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515830"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

### PayPal (`paypal_express`)
```json
{"entityId":"60832","incrementId":"12000048890","storeId":"viu","status":"processing","subTotal":"6999","total":"6999","cuotas":"1","impuesto":"0","metodoPago":"paypal_express","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"NINT00027","cantidad":"1","precio":"6999","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515839"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```

### Crédito MAVI (`omnipro_pago_credito`)
```json
{"entityId":"515848","incrementId":"CRED515848","storeId":"viu","status":"credit_payment_review","subTotal":"444","total":"594","cuotas":"12 M VIU P INM","impuesto":"0","metodoPago":"omnipro_pago_credito","costoEnvio":"150","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"DIB+00104","cantidad":"1","precio":"444.0000","precioEspecial":"0","descuento":"0","condicion":"12 M VIU P INM"}],"infoCliente":{"nombre":"Uva iyguiygiiyy","cliente":"8812","codigo_promotor":"","cuenta":"C00000020","OrigenIdMagento":"","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515848"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":"","utmSource":"WEBSITE"}
```

### Efectivo / OpenPay Stores (`openpay_stores`)
```json
{"entityId":"60835","incrementId":"12000048896","storeId":"viu","status":"new","subTotal":"0","total":"0","cuotas":"1","impuesto":"0","metodoPago":"openpay_stores","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"SPRI01073","cantidad":"1","precio":"1269","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515860"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
```
