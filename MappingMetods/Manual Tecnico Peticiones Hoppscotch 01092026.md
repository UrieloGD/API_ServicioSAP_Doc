# Catálogo de Endpoints (Pruebas Hoppscotch)

> [!info] Documento Sincronizado y Unificado
> Este documento ha sido generado dinámicamente a partir de la exportación en vivo de Hoppscotch. Todos los payloads, credenciales y estructuras son los mismos utilizados en tiempo real por el equipo. Se han unificado las rutas con la variable dinámica `<<BaseUrl>>`.

## ⚙️ Variables de Entorno Globales

- **`<<SAP>>`**: `https://localhost:44399`
- **`<<DMZ>>`**: `https://localhost:44302`
- **`<<SAPDirect>>`**: `https://vhmvods4ci.sap.svrwes4h.com:44300`
- **`<<jwt_token>>`**: ``
- **`<<LogonUser>>`**: `magalindo`
- **`<<LogonPass>>`**: `********`
- **`<<csrf_token>>`**: ``

## 📁 🌐 Endpoints C# (Interno SAP)

### 📁 D-IM-11 Consulta de existencias

#### Product Stock
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/stock`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/stock" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### Product Serial Stock
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/stock/serial`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `material`: `CECE00095`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/stock/serial?material=CECE00095" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 DM01 Articulos

#### GetProducts
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/products`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/products" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetFilterProducts
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/filter/ARTICULO eq 'CECE00095'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/filter/ARTICULO eq 'CECE00095'" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 DM03 Configuracion Productos Relacionados

#### GetProductCrossSell
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/crosssell`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `articulo`: `109A00068`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/crosssell?articulo=109A00068" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetUpsell
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/upsell`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `articulo`: `109A00068`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/upsell?articulo=109A00068" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetSustituto
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/sustitutos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `articulo`: `109A00068`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/sustitutos?articulo=109A00068" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 DM04 Informacion SEO

#### GETSEO
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/seo`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/seo" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### POSTSEO
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/product/seo`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "Material": "CENSO00077",
>     "NombreLargo": "SILLA MESEDOR",
>     "MetaPalabras1e": "",
>     "MetaDesc1e": "",
>     "MetaPalabras2e": "",
>     "MetaDesc2e": "",
>     "MetaPalabras3e": "",
>     "MetaDesc3e": "",
>     "Desclviu": "",
>     "DesclMavi": "",
>     "MatautVta": "1"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/product/seo" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{     \"Material\": \"CENSO00077\",     \"NombreLargo\": \"SILLA MESEDOR\",     \"MetaPalabras1e\": \"\",     \"MetaDesc1e\": \"\",     \"MetaPalabras2e\": \"\",     \"MetaDesc2e\": \"\",     \"MetaPalabras3e\": \"\",     \"MetaDesc3e\": \"\",     \"Desclviu\": \"\",     \"DesclMavi\": \"\",     \"MatautVta\": \"1\" }"
> ```

#### DELETESEO
- **Método:** `DELETE`
- **Endpoint:** `<<SAP>>/product/seo/CENSO00077`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X DELETE "<<SAP>>/product/seo/CENSO00077" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### PATCHSEO
- **Método:** `PATCH`
- **Endpoint:** `<<SAP>>/product/seo/CENSO00076`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "Material": "CENSO00076",
>     "NombreLargo": "SILLITA DE URI",
>     "MetaPalabras1e": "",
>     "MetaDesc1e": "",
>     "MetaPalabras2e": "",
>     "MetaDesc2e": "",
>     "MetaPalabras3e": "",
>     "MetaDesc3e": "",
>     "Desclviu": "",
>     "DesclMavi": "",
>     "MatautVta": "1"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X PATCH "<<SAP>>/product/seo/CENSO00076" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{     \"Material\": \"CENSO00076\",     \"NombreLargo\": \"SILLITA DE URI\",     \"MetaPalabras1e\": \"\",     \"MetaDesc1e\": \"\",     \"MetaPalabras2e\": \"\",     \"MetaDesc2e\": \"\",     \"MetaPalabras3e\": \"\",     \"MetaDesc3e\": \"\",     \"Desclviu\": \"\",     \"DesclMavi\": \"\",     \"MatautVta\": \"1\" }"
> ```

### 📁 DM05 Informacion Etiquetas Informacion a nivel unidad de negocio

#### GETBYZIDETIQUETA
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/etiquetas`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `idEtiqueta`: `8`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/etiquetas?idEtiqueta=8" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 SD33 Consultar Bonificacion

#### PostBonus
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/account/bonus/async`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Vkorg": "",
>   "Vtweg": "01",
>   "Zcondicion": "",
>   "Zsucursal": "",
>   "Zarticulo": "",
>   "Zmovimiento": ""
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/account/bonus/async" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"Vkorg\": \"\",   \"Vtweg\": \"01\",   \"Zcondicion\": \"\",   \"Zsucursal\": \"\",   \"Zarticulo\": \"\",   \"Zmovimiento\": \"\" }"
> ```

### 📁 SD18 Consultar Contrato de Condiciones

#### WalletCustomer
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/wallet/customer`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `reference`: `13450852`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/wallet/customer?reference=13450852" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 ProcesoCompleto

#### TestGetListadoCompletoFiltrado
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/exportaart/ma`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/exportaart/ma" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetCatalogoDeConfiguracion
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/almacenes/config`

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/almacenes/config"
> ```

#### BatchDM03
- **Método:** `POST`
- **Endpoint:** `https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap/ZAPI_CROSSSELL_SRV/$batch`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `magalindo`
> - **Password:** `SNDiros260308729de380c48.`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `multipart/mixed; boundary=batch_001`
> - `X-CSRF-Token`: `znYgX3-jLKDeMuq9TM4tpA==`
> **Query Params:**
> - `sap-client`: `110`
>

> [!example]- 📦 Body (`text/plain`)
> ```text
> --batch_001
> Content-Type: application/http
> Content-Transfer-Encoding: binary
>
> GET HeaderSet(ARTICULO='162A00052',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1
>
>
> --batch_001
> Content-Type: application/http
> Content-Transfer-Encoding: binary
>
> GET HeaderSet(ARTICULO='162A00058',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1
>
>
> --batch_001
> Content-Type: application/http
> Content-Transfer-Encoding: binary
>
> GET HeaderSet(ARTICULO='162A00060',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1
>
>
> --batch_001
> Content-Type: application/http
> Content-Transfer-Encoding: binary
>
> GET HeaderSet(ARTICULO='162A00061',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1
>
>
> --batch_001
> Content-Type: application/http
> Content-Transfer-Encoding: binary
>
> GET HeaderSet(ARTICULO='162A00062',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1
>
>
> --batch_001--
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap/ZAPI_CROSSSELL_SRV/$batch?sap-client=110" \
>   -u "magalindo:SNDiros260308729de380c48." \
>   -H "Content-Type: multipart/mixed; boundary=batch_001" \
>   -H "X-CSRF-Token: znYgX3-jLKDeMuq9TM4tpA==" \
>   -d "--batch_001 Content-Type: application/http Content-Transfer-Encoding: binary  GET HeaderSet(ARTICULO='162A00052',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1   --batch_001 Content-Type: application/http Content-Transfer-Encoding: binary  GET HeaderSet(ARTICULO='162A00058',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1   --batch_001 Content-Type: application/http Content-Transfer-Encoding: binary  GET HeaderSet(ARTICULO='162A00060',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1   --batch_001 Content-Type: application/http Content-Transfer-Encoding: binary  GET HeaderSet(ARTICULO='162A00061',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1   --batch_001 Content-Type: application/http Content-Transfer-Encoding: binary  GET HeaderSet(ARTICULO='162A00062',VKORG='01')?$expand=HeaderReturn&$format=json&sap-language=ES&sap-client=110 HTTP/1.1   --batch_001--"
> ```

### 📁 InfoSQL

#### GetExclusionesFamMA
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/exclusiones/familialinea/ma`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/exclusiones/familialinea/ma" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetExclusionesMa
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/exclusiones/ma`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/exclusiones/ma" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetArticulosSipValidos
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/articulos/sip/validos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/articulos/sip/validos" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetFamValidasMa
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/familias/validas/ma`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/familias/validas/ma" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetArticulosIEMayorista
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/articulos/ie/mayorista`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/articulos/ie/mayorista" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetReglasExistencia
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/reglas/existencia`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/reglas/existencia" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetImagenes
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/ma/imagenes/optimizadas`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/ma/imagenes/optimizadas" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### GetCarruselImagenes
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/carrusel/categorias`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/carrusel/categorias" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 DM02 Jerarquia de Articulos

#### JerarquiaDArticulos
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/jerarquia/articulos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/jerarquia/articulos" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 SD01 Enviar Pedido a SAP

#### 📁 Orders MA Magento

##### Order Con Cuenta MA
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"58376","incrementId":"12100059500","storeId":"muebles_america","status":null,"subTotal":"5399","total":"5399","cuotas":"1","impuesto":"0","metodoPago":"banktransfer","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[
>     {"sku":"SONY01228","cantidad":"1","precio":"5399","precioEspecial":"0","descuento":"0","condicion":"12 M VIU P INM"}],"infoCliente":
>     {"cuenta":"1500003857","nombre":"Marcos Galindo","cliente":"9400","telefono":"8888888888","direccion":"Kiwi sin cascara ","codigoPostal":"44790","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"JARDINES DE SAN FRANCISCO","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Marcos","apellidoPaternoClienteMavi":"Galindo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"485708"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"58376\",\"incrementId\":\"12100059500\",\"storeId\":\"muebles_america\",\"status\":null,\"subTotal\":\"5399\",\"total\":\"5399\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"banktransfer\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[     {\"sku\":\"SONY01228\",\"cantidad\":\"1\",\"precio\":\"5399\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU P INM\"}],\"infoCliente\":     {\"cuenta\":\"1500003857\",\"nombre\":\"Marcos Galindo\",\"cliente\":\"9400\",\"telefono\":\"8888888888\",\"direccion\":\"Kiwi sin cascara \",\"codigoPostal\":\"44790\",\"municipio\":\"GUADALAJARA\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"JARDINES DE SAN FRANCISCO\",\"referencia\":\"\",\"numExt\":\"177\",\"numInt\":\"\",\"nombreClienteMavi\":\"Marcos\",\"apellidoPaternoClienteMavi\":\"Galindo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"8888888888\",\"entreCalles\":\"\",\"razonSocial\":\"\",\"idCarrito\":\"485708\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Sin Cuenta
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"57872","incrementId":"2000049670","storeId":"muebles_america","status":"new","subTotal":"749","total":"749","cuotas":"1","impuesto":"0","metodoPago":"openpay_stores","costoEnvio":"0","metodoEnvio":"instore_pickup","articulos":[
>     {"sku":"MISI00064","cantidad":"1","precio":"949","precioEspecial":"749","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"nombre":"12 DE OCTUBRE CELAYA Store","telefono":"3161083887","direccion":"AVENIDA 12 DE OCTUBRE ","codigoPostal":"38020","municipio":"CELAYA","estado":"Guanajuato","pais":"MX","correo":"eve.luna.godoy@gmail.com","colonia":"","referencia":"","numExt":"","numInt":"","nombreClienteMavi":"Everardo","apellidoPaternoClienteMavi":"Luna","apellidoMaternoClienteMavi":"GOdoy","telefonoClienteMavi":"3161083887","razonSocial":"","idCarrito":"483311"},"codigoRecogerSucursal":"suc_76","sucursalDestino":76,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"57872\",\"incrementId\":\"2000049670\",\"storeId\":\"muebles_america\",\"status\":\"new\",\"subTotal\":\"749\",\"total\":\"749\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"openpay_stores\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"instore_pickup\",\"articulos\":[     {\"sku\":\"MISI00064\",\"cantidad\":\"1\",\"precio\":\"949\",\"precioEspecial\":\"749\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"nombre\":\"12 DE OCTUBRE CELAYA Store\",\"telefono\":\"3161083887\",\"direccion\":\"AVENIDA 12 DE OCTUBRE \",\"codigoPostal\":\"38020\",\"municipio\":\"CELAYA\",\"estado\":\"Guanajuato\",\"pais\":\"MX\",\"correo\":\"eve.luna.godoy@gmail.com\",\"colonia\":\"\",\"referencia\":\"\",\"numExt\":\"\",\"numInt\":\"\",\"nombreClienteMavi\":\"Everardo\",\"apellidoPaternoClienteMavi\":\"Luna\",\"apellidoMaternoClienteMavi\":\"GOdoy\",\"telefonoClienteMavi\":\"3161083887\",\"razonSocial\":\"\",\"idCarrito\":\"483311\"},\"codigoRecogerSucursal\":\"suc_76\",\"sucursalDestino\":76,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden primera compra Logeado
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>    "entityId":"58433",
>    "incrementId":"2000050099",
>    "storeId":"muebles_america",
>    "status":"payment_review",
>    "subTotal":"4998",
>    "total":"4998",
>    "cuotas":"1",
>    "impuesto":"0",
>    "metodoPago":"banktransfer",
>    "costoEnvio":"0",
>    "metodoEnvio":"tablerate_bestway",
>    "articulos":[
>       {
>          "sku":"ZTE+00003",
>          "cantidad":"2",
>          "precio":"2499",
>          "precioEspecial":"0",
>          "descuento":"0",
>          "condicion":"12 M VIU PP"
>       }
>    ],
>    "infoCliente":{
>       "cuenta":null,
>       "nombre":"Marcos Elsap",
>       "cliente":"9860",
>       "telefono":"1323112312",
>       "direccion":"calle ",
>       "codigoPostal":"52100",
>       "municipio":"SAN MATEO ATENCO",
>       "estado":"Estado de México",
>       "pais":"MX",
>       "correo":"sapprueba@gmail.com",
>       "colonia":"SAN MATEO ATENCO CENTRO",
>       "referencia":"",
>       "numExt":"13",
>       "numInt":"",
>       "nombreClienteMavi":"Marcos",
>       "apellidoPaternoClienteMavi":"Elsap",
>       "apellidoMaternoClienteMavi":"awd",
>       "telefonoClienteMavi":"1323112312",
>       "entreCalles":"",
>       "razonSocial":"",
>       "idCarrito":"491063"
>    },
>    "codigoRecogerSucursal":"",
>    "sucursalDestino":0,
>    "forzarOrder":"0",
>    "state":null,
>    "RedimirMonedero":0.0,
>    "Agente":null,
>    "utmSource":"WEBSITE"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{    \"entityId\":\"58433\",    \"incrementId\":\"2000050099\",    \"storeId\":\"muebles_america\",    \"status\":\"payment_review\",    \"subTotal\":\"4998\",    \"total\":\"4998\",    \"cuotas\":\"1\",    \"impuesto\":\"0\",    \"metodoPago\":\"banktransfer\",    \"costoEnvio\":\"0\",    \"metodoEnvio\":\"tablerate_bestway\",    \"articulos\":[       {          \"sku\":\"ZTE+00003\",          \"cantidad\":\"2\",          \"precio\":\"2499\",          \"precioEspecial\":\"0\",          \"descuento\":\"0\",          \"condicion\":\"12 M VIU PP\"       }    ],    \"infoCliente\":{       \"cuenta\":null,       \"nombre\":\"Marcos Elsap\",       \"cliente\":\"9860\",       \"telefono\":\"1323112312\",       \"direccion\":\"calle \",       \"codigoPostal\":\"52100\",       \"municipio\":\"SAN MATEO ATENCO\",       \"estado\":\"Estado de México\",       \"pais\":\"MX\",       \"correo\":\"sapprueba@gmail.com\",       \"colonia\":\"SAN MATEO ATENCO CENTRO\",       \"referencia\":\"\",       \"numExt\":\"13\",       \"numInt\":\"\",       \"nombreClienteMavi\":\"Marcos\",       \"apellidoPaternoClienteMavi\":\"Elsap\",       \"apellidoMaternoClienteMavi\":\"awd\",       \"telefonoClienteMavi\":\"1323112312\",       \"entreCalles\":\"\",       \"razonSocial\":\"\",       \"idCarrito\":\"491063\"    },    \"codigoRecogerSucursal\":\"\",    \"sucursalDestino\":0,    \"forzarOrder\":\"0\",    \"state\":null,    \"RedimirMonedero\":0.0,    \"Agente\":null,    \"utmSource\":\"WEBSITE\" }"
> ```

##### Orden Openpay Pickup
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"58844","incrementId":"2000050513","storeId":"muebles_america","status":null,"subTotal":"3499","total":"3499","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"instore_pickup","articulos":[{"sku":"XIAO00052","cantidad":"1","precio":"3499","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"16 DE SEPTIEMBRE Store","cliente":"9400","telefono":"8888888888","direccion":"AV 16 DE SEPTIEMBRE ","codigoPostal":"44100","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Marcos","apellidoPaternoClienteMavi":"Galindo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","razonSocial":"","idCarrito":"497801"},"codigoRecogerSucursal":"suc_21","sucursalDestino":21,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"58844\",\"incrementId\":\"2000050513\",\"storeId\":\"muebles_america\",\"status\":null,\"subTotal\":\"3499\",\"total\":\"3499\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"openpay_cards\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"instore_pickup\",\"articulos\":[{\"sku\":\"XIAO00052\",\"cantidad\":\"1\",\"precio\":\"3499\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"C01575835\",\"nombre\":\"16 DE SEPTIEMBRE Store\",\"cliente\":\"9400\",\"telefono\":\"8888888888\",\"direccion\":\"AV 16 DE SEPTIEMBRE \",\"codigoPostal\":\"44100\",\"municipio\":\"GUADALAJARA\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"\",\"referencia\":\"\",\"numExt\":\"177\",\"numInt\":\"\",\"nombreClienteMavi\":\"Marcos\",\"apellidoPaternoClienteMavi\":\"Galindo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"8888888888\",\"razonSocial\":\"\",\"idCarrito\":\"497801\"},\"codigoRecogerSucursal\":\"suc_21\",\"sucursalDestino\":21,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"} "
> ```

##### Order BankTransfer
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60808","incrementId":"2000053614","storeId":"muebles_america","status":"payment_review","subTotal":"4799","total":"4799","cuotas":"1","impuesto":"0","metodoPago":"banktransfer","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"SONY01228","cantidad":"1","precio":"4799","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"1500003857","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515731"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60808\",\"incrementId\":\"2000053614\",\"storeId\":\"muebles_america\",\"status\":\"payment_review\",\"subTotal\":\"4799\",\"total\":\"4799\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"banktransfer\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"SONY01228\",\"cantidad\":\"1\",\"precio\":\"4799\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"1500003857\",\"nombre\":\"Sergio Checo\",\"cliente\":\"9400\",\"telefono\":\"8888888888\",\"direccion\":\"Street 2 \",\"codigoPostal\":\"45200\",\"municipio\":\"ZAPOPAN\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"177\",\"numInt\":\"\",\"nombreClienteMavi\":\"Sergio\",\"apellidoPaternoClienteMavi\":\"Checo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"8888888888\",\"entreCalles\":\"\",\"razonSocial\":\"\",\"idCarrito\":\"515731\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Openpay Tarjeta
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60811","incrementId":"2000063620","storeId":"muebles_america","status":"payment_review","subTotal":"1209","total":"1209","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"KOBL00215","cantidad":"1","precio":"1209","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"1500007539","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515752"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60811\",\"incrementId\":\"2000063620\",\"storeId\":\"muebles_america\",\"status\":\"payment_review\",\"subTotal\":\"1209\",\"total\":\"1209\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"openpay_cards\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"KOBL00215\",\"cantidad\":\"1\",\"precio\":\"1209\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"1500007539\",\"nombre\":\"Sergio Checo\",\"cliente\":\"9400\",\"telefono\":\"8888888888\",\"direccion\":\"Street 2 \",\"codigoPostal\":\"45200\",\"municipio\":\"ZAPOPAN\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"177\",\"numInt\":\"\",\"nombreClienteMavi\":\"Sergio\",\"apellidoPaternoClienteMavi\":\"Checo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"8888888888\",\"entreCalles\":\"\",\"razonSocial\":\"\",\"idCarrito\":\"515752\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Paypal Paypal
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60817","incrementId":"2000053623","storeId":"muebles_america","status":"processing","subTotal":"1599","total":"1599","cuotas":"1","impuesto":"0","metodoPago":"paypal_express","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"AMAZ00008","cantidad":"1","precio":"1599","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"2123132131","direccion":"Street 2 ","codigoPostal":"99750","municipio":"TEPECHITLAN","estado":"Zacatecas","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"EL TERRERO","referencia":"","numExt":"13","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"2123132131","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515758"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60817\",\"incrementId\":\"2000053623\",\"storeId\":\"muebles_america\",\"status\":\"processing\",\"subTotal\":\"1599\",\"total\":\"1599\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"paypal_express\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"AMAZ00008\",\"cantidad\":\"1\",\"precio\":\"1599\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"C01575835\",\"nombre\":\"Sergio Checo\",\"cliente\":\"9400\",\"telefono\":\"2123132131\",\"direccion\":\"Street 2 \",\"codigoPostal\":\"99750\",\"municipio\":\"TEPECHITLAN\",\"estado\":\"Zacatecas\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"EL TERRERO\",\"referencia\":\"\",\"numExt\":\"13\",\"numInt\":\"\",\"nombreClienteMavi\":\"Sergio\",\"apellidoPaternoClienteMavi\":\"Checo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"2123132131\",\"entreCalles\":\"Ref 2\",\"razonSocial\":\"\",\"idCarrito\":\"515758\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Credito Omnipro
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60823","incrementId":"2000053632","storeId":"muebles_america","status":"new","subTotal":"1249","total":"1249","cuotas":"1","impuesto":"0","metodoPago":"openpay_stores","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"DOSE00095","cantidad":"1","precio":"1249","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515788"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60823\",\"incrementId\":\"2000053632\",\"storeId\":\"muebles_america\",\"status\":\"new\",\"subTotal\":\"1249\",\"total\":\"1249\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"openpay_stores\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"DOSE00095\",\"cantidad\":\"1\",\"precio\":\"1249\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"C01575835\",\"nombre\":\"Sergio Checo\",\"cliente\":\"9400\",\"telefono\":\"8888888888\",\"direccion\":\"Street 2 \",\"codigoPostal\":\"45200\",\"municipio\":\"ZAPOPAN\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"177\",\"numInt\":\"\",\"nombreClienteMavi\":\"Sergio\",\"apellidoPaternoClienteMavi\":\"Checo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"8888888888\",\"entreCalles\":\"\",\"razonSocial\":\"\",\"idCarrito\":\"515788\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Efectivo
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60811","incrementId":"2000053620","storeId":"muebles_america","status":"payment_review","subTotal":"1209","total":"1209","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"KOBL00215","cantidad":"1","precio":"1209","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C01575835","nombre":"Sergio Checo","cliente":"9400","telefono":"8888888888","direccion":"Street 2 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Sergio","apellidoPaternoClienteMavi":"Checo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"515752"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60811\",\"incrementId\":\"2000053620\",\"storeId\":\"muebles_america\",\"status\":\"payment_review\",\"subTotal\":\"1209\",\"total\":\"1209\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"openpay_cards\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"KOBL00215\",\"cantidad\":\"1\",\"precio\":\"1209\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"C01575835\",\"nombre\":\"Sergio Checo\",\"cliente\":\"9400\",\"telefono\":\"8888888888\",\"direccion\":\"Street 2 \",\"codigoPostal\":\"45200\",\"municipio\":\"ZAPOPAN\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"177\",\"numInt\":\"\",\"nombreClienteMavi\":\"Sergio\",\"apellidoPaternoClienteMavi\":\"Checo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"8888888888\",\"entreCalles\":\"\",\"razonSocial\":\"\",\"idCarrito\":\"515752\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

#### 📁 Orders VIU Magento

##### Orden con Promotor
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"511270","incrementId":"CRED511270","storeId":"viu","status":"credit_payment_review","subTotal":"6194","total":"4516","cuotas":"12 M VIU P INM","impuesto":"0","metodoPago":"omnipro_pago_credito","costoEnvio":"0","metodoEnvio":"instore_pickup","articulos":[{"sku":"TOMY00009","cantidad":"2","precio":"1419.0000","precioEspecial":"0","descuento":"0","condicion":"12 M VIU P INM"},{"sku":"KLEI00007","cantidad":"4","precio":"839.0000","precioEspecial":"0","descuento":"419.5","condicion":"12 M VIU P INM"}],"infoCliente":{"nombre":" ","cliente":"2495","codigo_promotor":"E016881","cuenta":"C02288161","OrigenIdMagento":"","telefono":"3161083887","direccion":" ","codigoPostal":null,"municipio":null,"estado":"Jalisco","pais":null,"correo":"test.ecommerce.everardo@gmail.com","colonia":"BARRIO MEZQUITAN","referencia":"","numExt":"16678","numInt":"","nombreClienteMavi":null,"apellidoPaternoClienteMavi":null,"apellidoMaternoClienteMavi":"Godoy","telefonoClienteMavi":"3161083887","entreCalles":"","razonSocial":"","idCarrito":"511270"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":"E016881","utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"511270\",\"incrementId\":\"CRED511270\",\"storeId\":\"viu\",\"status\":\"credit_payment_review\",\"subTotal\":\"6194\",\"total\":\"4516\",\"cuotas\":\"12 M VIU P INM\",\"impuesto\":\"0\",\"metodoPago\":\"omnipro_pago_credito\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"instore_pickup\",\"articulos\":[{\"sku\":\"TOMY00009\",\"cantidad\":\"2\",\"precio\":\"1419.0000\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU P INM\"},{\"sku\":\"KLEI00007\",\"cantidad\":\"4\",\"precio\":\"839.0000\",\"precioEspecial\":\"0\",\"descuento\":\"419.5\",\"condicion\":\"12 M VIU P INM\"}],\"infoCliente\":{\"nombre\":\" \",\"cliente\":\"2495\",\"codigo_promotor\":\"E016881\",\"cuenta\":\"C02288161\",\"OrigenIdMagento\":\"\",\"telefono\":\"3161083887\",\"direccion\":\" \",\"codigoPostal\":null,\"municipio\":null,\"estado\":\"Jalisco\",\"pais\":null,\"correo\":\"test.ecommerce.everardo@gmail.com\",\"colonia\":\"BARRIO MEZQUITAN\",\"referencia\":\"\",\"numExt\":\"16678\",\"numInt\":\"\",\"nombreClienteMavi\":null,\"apellidoPaternoClienteMavi\":null,\"apellidoMaternoClienteMavi\":\"Godoy\",\"telefonoClienteMavi\":\"3161083887\",\"entreCalles\":\"\",\"razonSocial\":\"\",\"idCarrito\":\"511270\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":\"E016881\",\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden BankTransfer
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"61235","incrementId":"12100049500","storeId":"viu","status":"payment_review","subTotal":"0","total":"0","cuotas":"1","impuesto":"0","metodoPago":"banktransfer","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"SONY01228","cantidad":"1","precio":"4749","precioEspecial":"0","descuento":"0","condicion":"12 M VIU P INM"}],"infoCliente":{"cuenta":"1500003857","nombre":"Marcos Galindo","cliente":"9400","telefono":"8888888888","direccion":"Kiwi sin cascara ","codigoPostal":"44790","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"schecoperez11@gmail.com","colonia":"JARDINES DE SAN FRANCISCO","referencia":"","numExt":"177","numInt":"","nombreClienteMavi":"Marcos","apellidoPaternoClienteMavi":"Galindo","apellidoMaternoClienteMavi":"Galindo","telefonoClienteMavi":"8888888888","entreCalles":"","razonSocial":"","idCarrito":"485708"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"61235\",\"incrementId\":\"12100049500\",\"storeId\":\"viu\",\"status\":\"payment_review\",\"subTotal\":\"0\",\"total\":\"0\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"banktransfer\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"SONY01228\",\"cantidad\":\"1\",\"precio\":\"4749\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU P INM\"}],\"infoCliente\":{\"cuenta\":\"1500003857\",\"nombre\":\"Marcos Galindo\",\"cliente\":\"9400\",\"telefono\":\"8888888888\",\"direccion\":\"Kiwi sin cascara \",\"codigoPostal\":\"44790\",\"municipio\":\"GUADALAJARA\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"schecoperez11@gmail.com\",\"colonia\":\"JARDINES DE SAN FRANCISCO\",\"referencia\":\"\",\"numExt\":\"177\",\"numInt\":\"\",\"nombreClienteMavi\":\"Marcos\",\"apellidoPaternoClienteMavi\":\"Galindo\",\"apellidoMaternoClienteMavi\":\"Galindo\",\"telefonoClienteMavi\":\"8888888888\",\"entreCalles\":\"\",\"razonSocial\":\"\",\"idCarrito\":\"485708\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"} "
> ```

##### Orden Tarjeta Openpay
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60829","incrementId":"12000048887","storeId":"viu","status":"payment_review","subTotal":"6990","total":"6990","cuotas":"1","impuesto":"0","metodoPago":"openpay_cards","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"WHIR00791","cantidad":"1","precio":"9299","precioEspecial":"6990","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515830"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60829\",\"incrementId\":\"12000048887\",\"storeId\":\"viu\",\"status\":\"payment_review\",\"subTotal\":\"6990\",\"total\":\"6990\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"openpay_cards\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"WHIR00791\",\"cantidad\":\"1\",\"precio\":\"9299\",\"precioEspecial\":\"6990\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"C00000001\",\"nombre\":\"Uva iyguiygiiyy\",\"cliente\":\"8812\",\"telefono\":\"3123213213\",\"direccion\":\"Av. Américas 770 a 2 cuadras de la glorieta Colón. \",\"codigoPostal\":\"44500\",\"municipio\":\"GUADALAJARA\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"uva1@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"12\",\"numInt\":\"\",\"nombreClienteMavi\":\"Uva\",\"apellidoPaternoClienteMavi\":\"iyguiygiiyy\",\"apellidoMaternoClienteMavi\":\"awddwaadw\",\"telefonoClienteMavi\":\"3123213213\",\"entreCalles\":\"Ref 2\",\"razonSocial\":\"\",\"idCarrito\":\"515830\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Paypal Express
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60832","incrementId":"12000048890","storeId":"viu","status":"processing","subTotal":"6999","total":"6999","cuotas":"1","impuesto":"0","metodoPago":"paypal_express","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"NINT00027","cantidad":"1","precio":"6999","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515839"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60832\",\"incrementId\":\"12000048890\",\"storeId\":\"viu\",\"status\":\"processing\",\"subTotal\":\"6999\",\"total\":\"6999\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"paypal_express\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"NINT00027\",\"cantidad\":\"1\",\"precio\":\"6999\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"C00000001\",\"nombre\":\"Uva iyguiygiiyy\",\"cliente\":\"8812\",\"telefono\":\"3123213213\",\"direccion\":\"Av. Américas 770 a 2 cuadras de la glorieta Colón. \",\"codigoPostal\":\"44500\",\"municipio\":\"GUADALAJARA\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"uva1@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"12\",\"numInt\":\"\",\"nombreClienteMavi\":\"Uva\",\"apellidoPaternoClienteMavi\":\"iyguiygiiyy\",\"apellidoMaternoClienteMavi\":\"awddwaadw\",\"telefonoClienteMavi\":\"3123213213\",\"entreCalles\":\"Ref 2\",\"razonSocial\":\"\",\"idCarrito\":\"515839\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Credito Omnipro
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"515848","incrementId":"CRED515848","storeId":"viu","status":"credit_payment_review","subTotal":"444","total":"594","cuotas":"12 M VIU P INM","impuesto":"0","metodoPago":"omnipro_pago_credito","costoEnvio":"150","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"DIB+00104","cantidad":"1","precio":"444.0000","precioEspecial":"0","descuento":"0","condicion":"12 M VIU P INM"}],"infoCliente":{"nombre":"Uva iyguiygiiyy","cliente":"8812","codigo_promotor":"","cuenta":"C00000020","OrigenIdMagento":"","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515848"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":"","utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"515848\",\"incrementId\":\"CRED515848\",\"storeId\":\"viu\",\"status\":\"credit_payment_review\",\"subTotal\":\"444\",\"total\":\"594\",\"cuotas\":\"12 M VIU P INM\",\"impuesto\":\"0\",\"metodoPago\":\"omnipro_pago_credito\",\"costoEnvio\":\"150\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"DIB+00104\",\"cantidad\":\"1\",\"precio\":\"444.0000\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU P INM\"}],\"infoCliente\":{\"nombre\":\"Uva iyguiygiiyy\",\"cliente\":\"8812\",\"codigo_promotor\":\"\",\"cuenta\":\"C00000020\",\"OrigenIdMagento\":\"\",\"telefono\":\"3123213213\",\"direccion\":\"Av. Américas 770 a 2 cuadras de la glorieta Colón. \",\"codigoPostal\":\"44500\",\"municipio\":\"GUADALAJARA\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"uva1@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"12\",\"numInt\":\"\",\"nombreClienteMavi\":\"Uva\",\"apellidoPaternoClienteMavi\":\"iyguiygiiyy\",\"apellidoMaternoClienteMavi\":\"awddwaadw\",\"telefonoClienteMavi\":\"3123213213\",\"entreCalles\":\"Ref 2\",\"razonSocial\":\"\",\"idCarrito\":\"515848\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":\"\",\"utmSource\":\"WEBSITE\"}"
> ```

##### Orden Efectivo Openpay
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/new`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {"entityId":"60835","incrementId":"12000048896","storeId":"viu","status":"new","subTotal":"0","total":"0","cuotas":"1","impuesto":"0","metodoPago":"openpay_stores","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"SPRI01073","cantidad":"1","precio":"1269","precioEspecial":"0","descuento":"0","condicion":"12 M VIU PP"}],"infoCliente":{"cuenta":"C00000001","nombre":"Uva iyguiygiiyy","cliente":"8812","telefono":"3123213213","direccion":"Av. Américas 770 a 2 cuadras de la glorieta Colón. ","codigoPostal":"44500","municipio":"GUADALAJARA","estado":"Jalisco","pais":"MX","correo":"uva1@gmail.com","colonia":"FRACC LA CUSPIDE","referencia":"","numExt":"12","numInt":"","nombreClienteMavi":"Uva","apellidoPaternoClienteMavi":"iyguiygiiyy","apellidoMaternoClienteMavi":"awddwaadw","telefonoClienteMavi":"3123213213","entreCalles":"Ref 2","razonSocial":"","idCarrito":"515860"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":null,"utmSource":"WEBSITE"}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/new" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{\"entityId\":\"60835\",\"incrementId\":\"12000048896\",\"storeId\":\"viu\",\"status\":\"new\",\"subTotal\":\"0\",\"total\":\"0\",\"cuotas\":\"1\",\"impuesto\":\"0\",\"metodoPago\":\"openpay_stores\",\"costoEnvio\":\"0\",\"metodoEnvio\":\"tablerate_bestway\",\"articulos\":[{\"sku\":\"SPRI01073\",\"cantidad\":\"1\",\"precio\":\"1269\",\"precioEspecial\":\"0\",\"descuento\":\"0\",\"condicion\":\"12 M VIU PP\"}],\"infoCliente\":{\"cuenta\":\"C00000001\",\"nombre\":\"Uva iyguiygiiyy\",\"cliente\":\"8812\",\"telefono\":\"3123213213\",\"direccion\":\"Av. Américas 770 a 2 cuadras de la glorieta Colón. \",\"codigoPostal\":\"44500\",\"municipio\":\"GUADALAJARA\",\"estado\":\"Jalisco\",\"pais\":\"MX\",\"correo\":\"uva1@gmail.com\",\"colonia\":\"FRACC LA CUSPIDE\",\"referencia\":\"\",\"numExt\":\"12\",\"numInt\":\"\",\"nombreClienteMavi\":\"Uva\",\"apellidoPaternoClienteMavi\":\"iyguiygiiyy\",\"apellidoMaternoClienteMavi\":\"awddwaadw\",\"telefonoClienteMavi\":\"3123213213\",\"entreCalles\":\"Ref 2\",\"razonSocial\":\"\",\"idCarrito\":\"515860\"},\"codigoRecogerSucursal\":\"\",\"sucursalDestino\":0,\"forzarOrder\":\"0\",\"state\":null,\"RedimirMonedero\":0.0,\"Agente\":null,\"utmSource\":\"WEBSITE\"}"
> ```

#### 📁 Orders Direct SAP

##### OrderTest Diana
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/testnew`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "Auart": "ZMER",
>     "CustGrp2": "",
>     "DistrChan": "02",
>     "Division": "01",
>     "DocDate": "2025-12-26T19:22:41",
>     "DocType": "ZMER",
>     "Name": "E003079",
>     "OrdReason": "",
>     "Pmnttrms": "12IA",
>     "PriceDate": "2025-12-26T19:22:41",
>     "PurchDate": "2025-12-26T19:22:41",
>     "PurchNoC": "ZSD_ZMER_14308",
>     "Ref1": "",
>     "RefDoc": "0020001719",
>     "RefdocCat": "B",
>     "SalesOff": "0002",
>     "SalesOrg": "01",
>     "to_autoincr": [
>         {
>             "Auart": "ZANC",
>             "Bname": "E003079",
>             "Bstdk": "20251226132241",
>             "Kbetr": "1580",
>             "Matnr": "111A00137",
>             "Posnr": "000001",
>             "Vbeln": "0020001719",
>             "Werks": "0002",
>             "Zkbetr2": "0"
>         }
>     ],
>     "to_conditions": [
>         {
>             "CondType": "ZPCP",
>             "CondValue": "4740",
>             "ItmNumber": "000001"
>         }
>     ],
>     "to_items": [
>         {
>             "Batch": "",
>             "BomexplNo": "",
>             "ItemCateg": "",
>             "ItmNumber": "000001",
>             "Kwert": "0",
>             "Material": "111A00137",
>             "Plant": "0002",
>             "PoItmNo": "000001",
>             "RefDoc": "0020001719",
>             "RefDocCa": "B",
>             "RefDocIt": "000001",
>             "StoreLoc": "001V",
>             "TargetQty": "3",
>             "TargetQu": "PI",
>             "Zdescrextra": "",
>             "Zidcampapromo": "",
>             "Zidcopia": "",
>             "Zkwert3": "0",
>             "Zkwert4": "0",
>             "Zkwert5": "0",
>             "Zpadre": "",
>             "Zpuntos": "0.000",
>             "Ztppromo": "",
>             "Zusudescto": ""
>         }
>     ],
>     "to_movtpo": [
>         {
>             "Bname": "E003079",
>             "Vbeln": "0020001719",
>             "Werks": "0002",
>             "Zfechacom": "20251226132241",
>             "Zfechafin": "20251226132241",
>             "Zidstatus": "",
>             "Zmodulo": "VENTA",
>             "Zsituacion": ""
>         }
>     ],
>     "to_partners": [
>         {
>             "Address": "",
>             "PartnNumb": "1500003857",
>             "PartnRole": "AG"
>         },
>         {
>             "PartnNumb": "0023000125",
>             "PartnRole": "Z1"
>         }
>     ],
>     "to_result": {},
>     "to_return": [],
>     "to_series": [],
>     "to_text": [
>         {
>             "ItmNumber": "000001",
>             "Langu": "S",
>             "TextId": "ZOBS",
>             "TextLine": ""
>         }
>     ],
>     "Zafectacomision": "0",
>     "Zartq": "1",
>     "Zaudat": "20251226132241",
>     "Zautoriza": "",
>     "Zband402": "0",
>     "Zcausa": "",
>     "Zcomlibera": "",
>     "Zconcepto": "",
>     "Zcontimpcfd": "",
>     "Zcontimpciego": "",
>     "Zcontimpsimp": "",
>     "Zctefinal": "",
>     "Zembarqueestado": "",
>     "Zfechacancel": "20251226132241",
>     "Zfechaconcl": "20251226132241",
>     "Zfechaentreg": "20251226132241",
>     "Zfechaenvcred": "20251226132241",
>     "Zformacobro": "",
>     "Zformaenvio": "",
>     "Zformapagotp": "",
>     "Zidecomm": "",
>     "Zliberado": "1234",
>     "Zobservaciones": "Linea de texto para un pedido de pruebas POS",
>     "Zorigen": "ZANC",
>     "Zorigenid": "0020001719",
>     "Zpagodie": "0",
>     "Zprerastreo": "0",
>     "Zredimepos": "0",
>     "Zredimepuntos": "0.00",
>     "Zreferencia": "0020001719",
>     "Zrepdescto": "0",
>     "Zservtipoop": "",
>     "Zsituacion": "",
>     "Zsituacionfecha": "20251226132241",
>     "Zsituacionusuario": "E003079",
>     "Ztransferenstp": "0",
>     "Zvtadimanuevo": "0"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/testnew" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{     \"Auart\": \"ZMER\",     \"CustGrp2\": \"\",     \"DistrChan\": \"02\",     \"Division\": \"01\",     \"DocDate\": \"2025-12-26T19:22:41\",     \"DocType\": \"ZMER\",     \"Name\": \"E003079\",     \"OrdReason\": \"\",     \"Pmnttrms\": \"12IA\",     \"PriceDate\": \"2025-12-26T19:22:41\",     \"PurchDate\": \"2025-12-26T19:22:41\",     \"PurchNoC\": \"ZSD_ZMER_14308\",     \"Ref1\": \"\",     \"RefDoc\": \"0020001719\",     \"RefdocCat\": \"B\",     \"SalesOff\": \"0002\",     \"SalesOrg\": \"01\",     \"to_autoincr\": [         {             \"Auart\": \"ZANC\",             \"Bname\": \"E003079\",             \"Bstdk\": \"20251226132241\",             \"Kbetr\": \"1580\",             \"Matnr\": \"111A00137\",             \"Posnr\": \"000001\",             \"Vbeln\": \"0020001719\",             \"Werks\": \"0002\",             \"Zkbetr2\": \"0\"         }     ],     \"to_conditions\": [         {             \"CondType\": \"ZPCP\",             \"CondValue\": \"4740\",             \"ItmNumber\": \"000001\"         }     ],     \"to_items\": [         {             \"Batch\": \"\",             \"BomexplNo\": \"\",             \"ItemCateg\": \"\",             \"ItmNumber\": \"000001\",             \"Kwert\": \"0\",             \"Material\": \"111A00137\",             \"Plant\": \"0002\",             \"PoItmNo\": \"000001\",             \"RefDoc\": \"0020001719\",             \"RefDocCa\": \"B\",             \"RefDocIt\": \"000001\",             \"StoreLoc\": \"001V\",             \"TargetQty\": \"3\",             \"TargetQu\": \"PI\",             \"Zdescrextra\": \"\",             \"Zidcampapromo\": \"\",             \"Zidcopia\": \"\",             \"Zkwert3\": \"0\",             \"Zkwert4\": \"0\",             \"Zkwert5\": \"0\",             \"Zpadre\": \"\",             \"Zpuntos\": \"0.000\",             \"Ztppromo\": \"\",             \"Zusudescto\": \"\"         }     ],     \"to_movtpo\": [         {             \"Bname\": \"E003079\",             \"Vbeln\": \"0020001719\",             \"Werks\": \"0002\",             \"Zfechacom\": \"20251226132241\",             \"Zfechafin\": \"20251226132241\",             \"Zidstatus\": \"\",             \"Zmodulo\": \"VENTA\",             \"Zsituacion\": \"\"         }     ],     \"to_partners\": [         {             \"Address\": \"\",             \"PartnNumb\": \"1500003857\",             \"PartnRole\": \"AG\"         },         {             \"PartnNumb\": \"0023000125\",             \"PartnRole\": \"Z1\"         }     ],     \"to_result\": {},     \"to_return\": [],     \"to_series\": [],     \"to_text\": [         {             \"ItmNumber\": \"000001\",             \"Langu\": \"S\",             \"TextId\": \"ZOBS\",             \"TextLine\": \"\"         }     ],     \"Zafectacomision\": \"0\",     \"Zartq\": \"1\",     \"Zaudat\": \"20251226132241\",     \"Zautoriza\": \"\",     \"Zband402\": \"0\",     \"Zcausa\": \"\",     \"Zcomlibera\": \"\",     \"Zconcepto\": \"\",     \"Zcontimpcfd\": \"\",     \"Zcontimpciego\": \"\",     \"Zcontimpsimp\": \"\",     \"Zctefinal\": \"\",     \"Zembarqueestado\": \"\",     \"Zfechacancel\": \"20251226132241\",     \"Zfechaconcl\": \"20251226132241\",     \"Zfechaentreg\": \"20251226132241\",     \"Zfechaenvcred\": \"20251226132241\",     \"Zformacobro\": \"\",     \"Zformaenvio\": \"\",     \"Zformapagotp\": \"\",     \"Zidecomm\": \"\",     \"Zliberado\": \"1234\",     \"Zobservaciones\": \"Linea de texto para un pedido de pruebas POS\",     \"Zorigen\": \"ZANC\",     \"Zorigenid\": \"0020001719\",     \"Zpagodie\": \"0\",     \"Zprerastreo\": \"0\",     \"Zredimepos\": \"0\",     \"Zredimepuntos\": \"0.00\",     \"Zreferencia\": \"0020001719\",     \"Zrepdescto\": \"0\",     \"Zservtipoop\": \"\",     \"Zsituacion\": \"\",     \"Zsituacionfecha\": \"20251226132241\",     \"Zsituacionusuario\": \"E003079\",     \"Ztransferenstp\": \"0\",     \"Zvtadimanuevo\": \"0\" }"
> ```

##### Orden canal Ecommerce
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/testnew`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Auart": "ZMER",
>   "CustGrp2": "C02",
>   "DistrChan": "02",
>   "Division": "01",
>   "DocDate": "2026-07-10T12:00:00",
>   "DocType": "ZMER",
>   "Name": "Tadeo",
>   "OrdReason": "",
>   "Pmnttrms": "12IA", 
>   "PriceDate": "2026-07-10T12:00:00",
>   "PurchDate": "2026-07-10T12:00:00",
>   "PurchNoC": "ZSD_ZMER_9999",
>   "Ref1S": "",
>   "RefDoc": "",
>   "RefdocCat": "",
>   "SalesOff": "0090",
>   "SalesOrg": "04",
>   "Zconcepto": "Pedido de mercancias",
>   "Zreferencia": "9999",
>   "Zobservaciones": "Pedido generado desde web",
>   "Zsituacion": "Creacion",
>   "Zsituacionfecha": "20260710120000",
>   "Zsituacionusuario": "Tadeo",
>   "Zformaenvio": "",
>   "Zservtipoop": "",
>   "Zcausa": "",
>   "Zorigen": "ZMER",
>   "Zorigenid": "9999",
>   "Zaudat": "20260710120000",
>   "Zfechaconcl": "20260710120000",
>   "Zfechacancel": "20260710120000",
>   "Zfechaentreg": "20260710120000",
>   "Zembarqueestado": "EmbarqueEstado",
>   "Zformapagotp": "",
>   "Zafectacomision": "0",
>   "Zcontimpsimp": "",
>   "Zcontimpciego": "",
>   "Zcontimpcfd": "",
>   "Zformacobro": "",
>   "Zredimepos": "0",
>   "Zcomlibera": "",
>   "Zband402": "0",
>   "Zfechaenvcred": "20260710120000",
>   "Zliberado": "1234",
>   "Zautoriza": "",
>   "Zartq": "1",
>   "Zidecomm": "",
>   "Zpagodie": "0",
>   "Zrepdescto": "0",
>   "Zvtadimanuevo": "0",
>   "Zredimepuntos": "0",
>   "Zprerastreo": "0",
>   "Ztransferenstp": "0",
>   "Zctefinal": "1500007410",
>   "to_partners": [
>     {
>       "PartnNumb": "1500007416",
>       "PartnRole": "AG"
>     },
>     {
>       "PartnNumb": "0023000125",
>       "PartnRole": "Z1"
>     }
>   ],
>   "to_movtpo": [
>     {
>       "Vbeln": "",
>       "Zmodulo": "VENTA",
>       "Zfechacom": "20260710120000",
>       "Zfechafin": "20260710120000",
>       "Zidstatus": "",
>       "Zsituacion": "Pedido de mercancias",
>       "Werks": "0090",
>       "Bname": "Tadeo"
>     }
>   ],
>   "to_movbita": [
>     {
>       "Vbeln": "",
>       "Bstkd": "2026-07-10T12:00:00",
>       "Werks": "0090",
>       "Bstkd_e": "Tipo123456",
>       "Bname": "Tadeo",
>       "Ihrez_e": "Clave123",
>       "Zmodulo": "VENTA",
>       "Zeventos": "Pedido de mercancias",
>       "Zobsreanalisis": "",
>       "Ztiporespuesta": "",
>       "Zcitacliente": "1",
>       "Zcitaaval": "1",
>       "Zhoracita": "120000",
>       "Zfechacita": "2026-07-10T12:00:00"
>     }
>   ],
>   "to_items": [
>     {
>       "ItmNumber": "000001",
>       "PoItmNo": "000001",
>       "Material": "111A00137",
>       "TargetQty": "3",
>       "TargetQu": "PI",
>       "ItemCateg": "ZMRM",
>       "Batch": "",
>       "Plant": "0002",
>       "Kwert": "4740",
>       "StoreLoc": "001V",
>       "RefDoc": "",
>       "RefDocIt": "",
>       "RefDocCa": "",
>       "Zdescrextra": "",
>       "Zpuntos": "0",
>       "Zidcopia": "0",
>       "Zusudescto": "",
>       "Zidcampapromo": "",
>       "Zpadre": "",
>       "Ztppromo": "",
>       "Zkwert3": "0",
>       "Zkwert4": "0",
>       "Zkwert5": "0"
>     }
>   ],
>   "to_conditions": [
>     {
>       "ItmNumber": "000001",
>       "CondType": "ZPCP",
>       "CondValue": "4740"
>     }
>   ],
>   "to_text": [
>     {
>       "ItmNumber": "000001",
>       "TextId": "ZOBS",
>       "Langu": "S",
>       "TextLine": "12IA"
>     }
>   ],
>   "to_autoincr": [
>     {
>       "Vbeln": "",
>       "Posnr": "000001",
>       "Bstdk": "20260710120000",
>       "Werks": "0090",
>       "Bname": "Tadeo",
>       "Auart": "ZMER",
>       "Matnr": "111A00137",
>       "Kbetr": "1580",
>       "Zkbetr2": "0"
>     }
>   ],
>   "to_series": [
>     {
>       "Zvbeln": "",
>       "Zposnr": "000001",
>       "Zsernr": ""
>     }
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/testnew" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"Auart\": \"ZMER\",   \"CustGrp2\": \"C02\",   \"DistrChan\": \"02\",   \"Division\": \"01\",   \"DocDate\": \"2026-07-10T12:00:00\",   \"DocType\": \"ZMER\",   \"Name\": \"Tadeo\",   \"OrdReason\": \"\",   \"Pmnttrms\": \"12IA\",    \"PriceDate\": \"2026-07-10T12:00:00\",   \"PurchDate\": \"2026-07-10T12:00:00\",   \"PurchNoC\": \"ZSD_ZMER_9999\",   \"Ref1S\": \"\",   \"RefDoc\": \"\",   \"RefdocCat\": \"\",   \"SalesOff\": \"0090\",   \"SalesOrg\": \"04\",   \"Zconcepto\": \"Pedido de mercancias\",   \"Zreferencia\": \"9999\",   \"Zobservaciones\": \"Pedido generado desde web\",   \"Zsituacion\": \"Creacion\",   \"Zsituacionfecha\": \"20260710120000\",   \"Zsituacionusuario\": \"Tadeo\",   \"Zformaenvio\": \"\",   \"Zservtipoop\": \"\",   \"Zcausa\": \"\",   \"Zorigen\": \"ZMER\",   \"Zorigenid\": \"9999\",   \"Zaudat\": \"20260710120000\",   \"Zfechaconcl\": \"20260710120000\",   \"Zfechacancel\": \"20260710120000\",   \"Zfechaentreg\": \"20260710120000\",   \"Zembarqueestado\": \"EmbarqueEstado\",   \"Zformapagotp\": \"\",   \"Zafectacomision\": \"0\",   \"Zcontimpsimp\": \"\",   \"Zcontimpciego\": \"\",   \"Zcontimpcfd\": \"\",   \"Zformacobro\": \"\",   \"Zredimepos\": \"0\",   \"Zcomlibera\": \"\",   \"Zband402\": \"0\",   \"Zfechaenvcred\": \"20260710120000\",   \"Zliberado\": \"1234\",   \"Zautoriza\": \"\",   \"Zartq\": \"1\",   \"Zidecomm\": \"\",   \"Zpagodie\": \"0\",   \"Zrepdescto\": \"0\",   \"Zvtadimanuevo\": \"0\",   \"Zredimepuntos\": \"0\",   \"Zprerastreo\": \"0\",   \"Ztransferenstp\": \"0\",   \"Zctefinal\": \"1500007410\",   \"to_partners\": [     {       \"PartnNumb\": \"1500007416\",       \"PartnRole\": \"AG\"     },     {       \"PartnNumb\": \"0023000125\",       \"PartnRole\": \"Z1\"     }   ],   \"to_movtpo\": [     {       \"Vbeln\": \"\",       \"Zmodulo\": \"VENTA\",       \"Zfechacom\": \"20260710120000\",       \"Zfechafin\": \"20260710120000\",       \"Zidstatus\": \"\",       \"Zsituacion\": \"Pedido de mercancias\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\"     }   ],   \"to_movbita\": [     {       \"Vbeln\": \"\",       \"Bstkd\": \"2026-07-10T12:00:00\",       \"Werks\": \"0090\",       \"Bstkd_e\": \"Tipo123456\",       \"Bname\": \"Tadeo\",       \"Ihrez_e\": \"Clave123\",       \"Zmodulo\": \"VENTA\",       \"Zeventos\": \"Pedido de mercancias\",       \"Zobsreanalisis\": \"\",       \"Ztiporespuesta\": \"\",       \"Zcitacliente\": \"1\",       \"Zcitaaval\": \"1\",       \"Zhoracita\": \"120000\",       \"Zfechacita\": \"2026-07-10T12:00:00\"     }   ],   \"to_items\": [     {       \"ItmNumber\": \"000001\",       \"PoItmNo\": \"000001\",       \"Material\": \"111A00137\",       \"TargetQty\": \"3\",       \"TargetQu\": \"PI\",       \"ItemCateg\": \"ZMRM\",       \"Batch\": \"\",       \"Plant\": \"0002\",       \"Kwert\": \"4740\",       \"StoreLoc\": \"001V\",       \"RefDoc\": \"\",       \"RefDocIt\": \"\",       \"RefDocCa\": \"\",       \"Zdescrextra\": \"\",       \"Zpuntos\": \"0\",       \"Zidcopia\": \"0\",       \"Zusudescto\": \"\",       \"Zidcampapromo\": \"\",       \"Zpadre\": \"\",       \"Ztppromo\": \"\",       \"Zkwert3\": \"0\",       \"Zkwert4\": \"0\",       \"Zkwert5\": \"0\"     }   ],   \"to_conditions\": [     {       \"ItmNumber\": \"000001\",       \"CondType\": \"ZPCP\",       \"CondValue\": \"4740\"     }   ],   \"to_text\": [     {       \"ItmNumber\": \"000001\",       \"TextId\": \"ZOBS\",       \"Langu\": \"S\",       \"TextLine\": \"12IA\"     }   ],   \"to_autoincr\": [     {       \"Vbeln\": \"\",       \"Posnr\": \"000001\",       \"Bstdk\": \"20260710120000\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\",       \"Auart\": \"ZMER\",       \"Matnr\": \"111A00137\",       \"Kbetr\": \"1580\",       \"Zkbetr2\": \"0\"     }   ],   \"to_series\": [     {       \"Zvbeln\": \"\",       \"Zposnr\": \"000001\",       \"Zsernr\": \"\"     }   ] } "
> ```

##### Orden VIU Ecommerce
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/testnew`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Auart": "ZMER",
>   "CustGrp2": "C02",
>   "DistrChan": "02",
>   "Division": "01",
>   "DocDate": "2026-07-10T12:00:00",
>   "DocType": "ZMER",
>   "Name": "Tadeo",
>   "OrdReason": "",
>   "Pmnttrms": "12IA", 
>   "PriceDate": "2026-07-10T12:00:00",
>   "PurchDate": "2026-07-10T12:00:00",
>   "PurchNoC": "ZSD_ZMER_9999",
>   "Ref1S": "",
>   "RefDoc": "",
>   "RefdocCat": "",
>   "SalesOff": "0090",
>   "SalesOrg": "04",
>   "Zconcepto": "Pedido de mercancias",
>   "Zreferencia": "9999",
>   "Zobservaciones": "Pedido generado desde web",
>   "Zsituacion": "Creacion",
>   "Zsituacionfecha": "20260710120000",
>   "Zsituacionusuario": "Tadeo",
>   "Zformaenvio": "",
>   "Zservtipoop": "",
>   "Zcausa": "",
>   "Zorigen": "ZMER",
>   "Zorigenid": "9999",
>   "Zaudat": "20260710120000",
>   "Zfechaconcl": "20260710120000",
>   "Zfechacancel": "20260710120000",
>   "Zfechaentreg": "20260710120000",
>   "Zembarqueestado": "EmbarqueEstado",
>   "Zformapagotp": "",
>   "Zafectacomision": "0",
>   "Zcontimpsimp": "",
>   "Zcontimpciego": "",
>   "Zcontimpcfd": "",
>   "Zformacobro": "",
>   "Zredimepos": "0",
>   "Zcomlibera": "",
>   "Zband402": "0",
>   "Zfechaenvcred": "20260710120000",
>   "Zliberado": "1234",
>   "Zautoriza": "",
>   "Zartq": "1",
>   "Zidecomm": "",
>   "Zpagodie": "0",
>   "Zrepdescto": "0",
>   "Zvtadimanuevo": "0",
>   "Zredimepuntos": "0",
>   "Zprerastreo": "0",
>   "Ztransferenstp": "0",
>   "Zctefinal": "1500007410",
>   "to_partners": [
>     {
>       "PartnNumb": "1500007416",
>       "PartnRole": "AG"
>     },
>     {
>       "PartnNumb": "0023000125",
>       "PartnRole": "Z1"
>     }
>   ],
>   "to_movtpo": [
>     {
>       "Vbeln": "",
>       "Zmodulo": "VENTA",
>       "Zfechacom": "20260710120000",
>       "Zfechafin": "20260710120000",
>       "Zidstatus": "",
>       "Zsituacion": "Pedido de mercancias",
>       "Werks": "0090",
>       "Bname": "Tadeo"
>     }
>   ],
>   "to_movbita": [
>     {
>       "Vbeln": "",
>       "Bstkd": "2026-07-10T12:00:00",
>       "Werks": "0090",
>       "Bstkd_e": "Tipo123456",
>       "Bname": "Tadeo",
>       "Ihrez_e": "Clave123",
>       "Zmodulo": "VENTA",
>       "Zeventos": "Pedido de mercancias",
>       "Zobsreanalisis": "",
>       "Ztiporespuesta": "",
>       "Zcitacliente": "1",
>       "Zcitaaval": "1",
>       "Zhoracita": "120000",
>       "Zfechacita": "2026-07-10T12:00:00"
>     }
>   ],
>   "to_items": [
>     {
>       "ItmNumber": "000001",
>       "PoItmNo": "000001",
>       "Material": "111A00137",
>       "TargetQty": "3",
>       "TargetQu": "PI",
>       "ItemCateg": "ZMRM",
>       "Batch": "",
>       "Plant": "0002",
>       "Kwert": "4740",
>       "StoreLoc": "001V",
>       "RefDoc": "",
>       "RefDocIt": "",
>       "RefDocCa": "",
>       "Zdescrextra": "",
>       "Zpuntos": "0",
>       "Zidcopia": "0",
>       "Zusudescto": "",
>       "Zidcampapromo": "",
>       "Zpadre": "",
>       "Ztppromo": "",
>       "Zkwert3": "0",
>       "Zkwert4": "0",
>       "Zkwert5": "0"
>     }
>   ],
>   "to_conditions": [
>     {
>       "ItmNumber": "000001",
>       "CondType": "ZPCP",
>       "CondValue": "4740"
>     }
>   ],
>   "to_text": [
>     {
>       "ItmNumber": "000001",
>       "TextId": "ZOBS",
>       "Langu": "S",
>       "TextLine": "12IA"
>     }
>   ],
>   "to_autoincr": [
>     {
>       "Vbeln": "",
>       "Posnr": "000001",
>       "Bstdk": "20260710120000",
>       "Werks": "0090",
>       "Bname": "Tadeo",
>       "Auart": "ZMER",
>       "Matnr": "111A00137",
>       "Kbetr": "1580",
>       "Zkbetr2": "0"
>     }
>   ],
>   "to_series": [
>     {
>       "Zvbeln": "",
>       "Zposnr": "000001",
>       "Zsernr": ""
>     }
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/testnew" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"Auart\": \"ZMER\",   \"CustGrp2\": \"C02\",   \"DistrChan\": \"02\",   \"Division\": \"01\",   \"DocDate\": \"2026-07-10T12:00:00\",   \"DocType\": \"ZMER\",   \"Name\": \"Tadeo\",   \"OrdReason\": \"\",   \"Pmnttrms\": \"12IA\",    \"PriceDate\": \"2026-07-10T12:00:00\",   \"PurchDate\": \"2026-07-10T12:00:00\",   \"PurchNoC\": \"ZSD_ZMER_9999\",   \"Ref1S\": \"\",   \"RefDoc\": \"\",   \"RefdocCat\": \"\",   \"SalesOff\": \"0090\",   \"SalesOrg\": \"04\",   \"Zconcepto\": \"Pedido de mercancias\",   \"Zreferencia\": \"9999\",   \"Zobservaciones\": \"Pedido generado desde web\",   \"Zsituacion\": \"Creacion\",   \"Zsituacionfecha\": \"20260710120000\",   \"Zsituacionusuario\": \"Tadeo\",   \"Zformaenvio\": \"\",   \"Zservtipoop\": \"\",   \"Zcausa\": \"\",   \"Zorigen\": \"ZMER\",   \"Zorigenid\": \"9999\",   \"Zaudat\": \"20260710120000\",   \"Zfechaconcl\": \"20260710120000\",   \"Zfechacancel\": \"20260710120000\",   \"Zfechaentreg\": \"20260710120000\",   \"Zembarqueestado\": \"EmbarqueEstado\",   \"Zformapagotp\": \"\",   \"Zafectacomision\": \"0\",   \"Zcontimpsimp\": \"\",   \"Zcontimpciego\": \"\",   \"Zcontimpcfd\": \"\",   \"Zformacobro\": \"\",   \"Zredimepos\": \"0\",   \"Zcomlibera\": \"\",   \"Zband402\": \"0\",   \"Zfechaenvcred\": \"20260710120000\",   \"Zliberado\": \"1234\",   \"Zautoriza\": \"\",   \"Zartq\": \"1\",   \"Zidecomm\": \"\",   \"Zpagodie\": \"0\",   \"Zrepdescto\": \"0\",   \"Zvtadimanuevo\": \"0\",   \"Zredimepuntos\": \"0\",   \"Zprerastreo\": \"0\",   \"Ztransferenstp\": \"0\",   \"Zctefinal\": \"1500007410\",   \"to_partners\": [     {       \"PartnNumb\": \"1500007416\",       \"PartnRole\": \"AG\"     },     {       \"PartnNumb\": \"0023000125\",       \"PartnRole\": \"Z1\"     }   ],   \"to_movtpo\": [     {       \"Vbeln\": \"\",       \"Zmodulo\": \"VENTA\",       \"Zfechacom\": \"20260710120000\",       \"Zfechafin\": \"20260710120000\",       \"Zidstatus\": \"\",       \"Zsituacion\": \"Pedido de mercancias\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\"     }   ],   \"to_movbita\": [     {       \"Vbeln\": \"\",       \"Bstkd\": \"2026-07-10T12:00:00\",       \"Werks\": \"0090\",       \"Bstkd_e\": \"Tipo123456\",       \"Bname\": \"Tadeo\",       \"Ihrez_e\": \"Clave123\",       \"Zmodulo\": \"VENTA\",       \"Zeventos\": \"Pedido de mercancias\",       \"Zobsreanalisis\": \"\",       \"Ztiporespuesta\": \"\",       \"Zcitacliente\": \"1\",       \"Zcitaaval\": \"1\",       \"Zhoracita\": \"120000\",       \"Zfechacita\": \"2026-07-10T12:00:00\"     }   ],   \"to_items\": [     {       \"ItmNumber\": \"000001\",       \"PoItmNo\": \"000001\",       \"Material\": \"111A00137\",       \"TargetQty\": \"3\",       \"TargetQu\": \"PI\",       \"ItemCateg\": \"ZMRM\",       \"Batch\": \"\",       \"Plant\": \"0002\",       \"Kwert\": \"4740\",       \"StoreLoc\": \"001V\",       \"RefDoc\": \"\",       \"RefDocIt\": \"\",       \"RefDocCa\": \"\",       \"Zdescrextra\": \"\",       \"Zpuntos\": \"0\",       \"Zidcopia\": \"0\",       \"Zusudescto\": \"\",       \"Zidcampapromo\": \"\",       \"Zpadre\": \"\",       \"Ztppromo\": \"\",       \"Zkwert3\": \"0\",       \"Zkwert4\": \"0\",       \"Zkwert5\": \"0\"     }   ],   \"to_conditions\": [     {       \"ItmNumber\": \"000001\",       \"CondType\": \"ZPCP\",       \"CondValue\": \"4740\"     }   ],   \"to_text\": [     {       \"ItmNumber\": \"000001\",       \"TextId\": \"ZOBS\",       \"Langu\": \"S\",       \"TextLine\": \"12IA\"     }   ],   \"to_autoincr\": [     {       \"Vbeln\": \"\",       \"Posnr\": \"000001\",       \"Bstdk\": \"20260710120000\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\",       \"Auart\": \"ZMER\",       \"Matnr\": \"111A00137\",       \"Kbetr\": \"1580\",       \"Zkbetr2\": \"0\"     }   ],   \"to_series\": [     {       \"Zvbeln\": \"\",       \"Zposnr\": \"000001\",       \"Zsernr\": \"\"     }   ] } "
> ```

##### Orden MA Ecommerce Credit
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/testnew`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Auart": "ZMER",
>   "CustGrp2": "C02",
>   "DistrChan": "02",
>   "Division": "01",
>   "DocDate": "2026-07-10T12:00:00",
>   "DocType": "ZMER",
>   "Name": "Tadeo",
>   "OrdReason": "",
>   "Pmnttrms": "12IA", 
>   "PriceDate": "2026-07-10T12:00:00",
>   "PurchDate": "2026-07-10T12:00:00",
>   "PurchNoC": "ZSD_ZMER_9999",
>   "Ref1S": "",
>   "RefDoc": "",
>   "RefdocCat": "",
>   "SalesOff": "0090",
>   "SalesOrg": "04",
>   "Zconcepto": "Pedido de mercancias",
>   "Zreferencia": "9999",
>   "Zobservaciones": "Pedido generado desde web",
>   "Zsituacion": "Creacion",
>   "Zsituacionfecha": "20260710120000",
>   "Zsituacionusuario": "Tadeo",
>   "Zformaenvio": "",
>   "Zservtipoop": "",
>   "Zcausa": "",
>   "Zorigen": "ZMER",
>   "Zorigenid": "9999",
>   "Zaudat": "20260710120000",
>   "Zfechaconcl": "20260710120000",
>   "Zfechacancel": "20260710120000",
>   "Zfechaentreg": "20260710120000",
>   "Zembarqueestado": "EmbarqueEstado",
>   "Zformapagotp": "",
>   "Zafectacomision": "0",
>   "Zcontimpsimp": "",
>   "Zcontimpciego": "",
>   "Zcontimpcfd": "",
>   "Zformacobro": "",
>   "Zredimepos": "0",
>   "Zcomlibera": "",
>   "Zband402": "0",
>   "Zfechaenvcred": "20260710120000",
>   "Zliberado": "1234",
>   "Zautoriza": "",
>   "Zartq": "1",
>   "Zidecomm": "",
>   "Zpagodie": "0",
>   "Zrepdescto": "0",
>   "Zvtadimanuevo": "0",
>   "Zredimepuntos": "0",
>   "Zprerastreo": "0",
>   "Ztransferenstp": "0",
>   "Zctefinal": "1500007410",
>   "to_partners": [
>     {
>       "PartnNumb": "1500007416",
>       "PartnRole": "AG"
>     },
>     {
>       "PartnNumb": "0023000125",
>       "PartnRole": "Z1"
>     }
>   ],
>   "to_movtpo": [
>     {
>       "Vbeln": "",
>       "Zmodulo": "VENTA",
>       "Zfechacom": "20260710120000",
>       "Zfechafin": "20260710120000",
>       "Zidstatus": "",
>       "Zsituacion": "Pedido de mercancias",
>       "Werks": "0090",
>       "Bname": "Tadeo"
>     }
>   ],
>   "to_movbita": [
>     {
>       "Vbeln": "",
>       "Bstkd": "2026-07-10T12:00:00",
>       "Werks": "0090",
>       "Bstkd_e": "Tipo123456",
>       "Bname": "Tadeo",
>       "Ihrez_e": "Clave123",
>       "Zmodulo": "VENTA",
>       "Zeventos": "Pedido de mercancias",
>       "Zobsreanalisis": "",
>       "Ztiporespuesta": "",
>       "Zcitacliente": "1",
>       "Zcitaaval": "1",
>       "Zhoracita": "120000",
>       "Zfechacita": "2026-07-10T12:00:00"
>     }
>   ],
>   "to_items": [
>     {
>       "ItmNumber": "000001",
>       "PoItmNo": "000001",
>       "Material": "111A00137",
>       "TargetQty": "3",
>       "TargetQu": "PI",
>       "ItemCateg": "ZMRM",
>       "Batch": "",
>       "Plant": "0002",
>       "Kwert": "4740",
>       "StoreLoc": "001V",
>       "RefDoc": "",
>       "RefDocIt": "",
>       "RefDocCa": "",
>       "Zdescrextra": "",
>       "Zpuntos": "0",
>       "Zidcopia": "0",
>       "Zusudescto": "",
>       "Zidcampapromo": "",
>       "Zpadre": "",
>       "Ztppromo": "",
>       "Zkwert3": "0",
>       "Zkwert4": "0",
>       "Zkwert5": "0"
>     }
>   ],
>   "to_conditions": [
>     {
>       "ItmNumber": "000001",
>       "CondType": "ZPCP",
>       "CondValue": "4740"
>     }
>   ],
>   "to_text": [
>     {
>       "ItmNumber": "000001",
>       "TextId": "ZOBS",
>       "Langu": "S",
>       "TextLine": "12IA"
>     }
>   ],
>   "to_autoincr": [
>     {
>       "Vbeln": "",
>       "Posnr": "000001",
>       "Bstdk": "20260710120000",
>       "Werks": "0090",
>       "Bname": "Tadeo",
>       "Auart": "ZMER",
>       "Matnr": "111A00137",
>       "Kbetr": "1580",
>       "Zkbetr2": "0"
>     }
>   ],
>   "to_series": [
>     {
>       "Zvbeln": "",
>       "Zposnr": "000001",
>       "Zsernr": ""
>     }
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/testnew" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"Auart\": \"ZMER\",   \"CustGrp2\": \"C02\",   \"DistrChan\": \"02\",   \"Division\": \"01\",   \"DocDate\": \"2026-07-10T12:00:00\",   \"DocType\": \"ZMER\",   \"Name\": \"Tadeo\",   \"OrdReason\": \"\",   \"Pmnttrms\": \"12IA\",    \"PriceDate\": \"2026-07-10T12:00:00\",   \"PurchDate\": \"2026-07-10T12:00:00\",   \"PurchNoC\": \"ZSD_ZMER_9999\",   \"Ref1S\": \"\",   \"RefDoc\": \"\",   \"RefdocCat\": \"\",   \"SalesOff\": \"0090\",   \"SalesOrg\": \"04\",   \"Zconcepto\": \"Pedido de mercancias\",   \"Zreferencia\": \"9999\",   \"Zobservaciones\": \"Pedido generado desde web\",   \"Zsituacion\": \"Creacion\",   \"Zsituacionfecha\": \"20260710120000\",   \"Zsituacionusuario\": \"Tadeo\",   \"Zformaenvio\": \"\",   \"Zservtipoop\": \"\",   \"Zcausa\": \"\",   \"Zorigen\": \"ZMER\",   \"Zorigenid\": \"9999\",   \"Zaudat\": \"20260710120000\",   \"Zfechaconcl\": \"20260710120000\",   \"Zfechacancel\": \"20260710120000\",   \"Zfechaentreg\": \"20260710120000\",   \"Zembarqueestado\": \"EmbarqueEstado\",   \"Zformapagotp\": \"\",   \"Zafectacomision\": \"0\",   \"Zcontimpsimp\": \"\",   \"Zcontimpciego\": \"\",   \"Zcontimpcfd\": \"\",   \"Zformacobro\": \"\",   \"Zredimepos\": \"0\",   \"Zcomlibera\": \"\",   \"Zband402\": \"0\",   \"Zfechaenvcred\": \"20260710120000\",   \"Zliberado\": \"1234\",   \"Zautoriza\": \"\",   \"Zartq\": \"1\",   \"Zidecomm\": \"\",   \"Zpagodie\": \"0\",   \"Zrepdescto\": \"0\",   \"Zvtadimanuevo\": \"0\",   \"Zredimepuntos\": \"0\",   \"Zprerastreo\": \"0\",   \"Ztransferenstp\": \"0\",   \"Zctefinal\": \"1500007410\",   \"to_partners\": [     {       \"PartnNumb\": \"1500007416\",       \"PartnRole\": \"AG\"     },     {       \"PartnNumb\": \"0023000125\",       \"PartnRole\": \"Z1\"     }   ],   \"to_movtpo\": [     {       \"Vbeln\": \"\",       \"Zmodulo\": \"VENTA\",       \"Zfechacom\": \"20260710120000\",       \"Zfechafin\": \"20260710120000\",       \"Zidstatus\": \"\",       \"Zsituacion\": \"Pedido de mercancias\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\"     }   ],   \"to_movbita\": [     {       \"Vbeln\": \"\",       \"Bstkd\": \"2026-07-10T12:00:00\",       \"Werks\": \"0090\",       \"Bstkd_e\": \"Tipo123456\",       \"Bname\": \"Tadeo\",       \"Ihrez_e\": \"Clave123\",       \"Zmodulo\": \"VENTA\",       \"Zeventos\": \"Pedido de mercancias\",       \"Zobsreanalisis\": \"\",       \"Ztiporespuesta\": \"\",       \"Zcitacliente\": \"1\",       \"Zcitaaval\": \"1\",       \"Zhoracita\": \"120000\",       \"Zfechacita\": \"2026-07-10T12:00:00\"     }   ],   \"to_items\": [     {       \"ItmNumber\": \"000001\",       \"PoItmNo\": \"000001\",       \"Material\": \"111A00137\",       \"TargetQty\": \"3\",       \"TargetQu\": \"PI\",       \"ItemCateg\": \"ZMRM\",       \"Batch\": \"\",       \"Plant\": \"0002\",       \"Kwert\": \"4740\",       \"StoreLoc\": \"001V\",       \"RefDoc\": \"\",       \"RefDocIt\": \"\",       \"RefDocCa\": \"\",       \"Zdescrextra\": \"\",       \"Zpuntos\": \"0\",       \"Zidcopia\": \"0\",       \"Zusudescto\": \"\",       \"Zidcampapromo\": \"\",       \"Zpadre\": \"\",       \"Ztppromo\": \"\",       \"Zkwert3\": \"0\",       \"Zkwert4\": \"0\",       \"Zkwert5\": \"0\"     }   ],   \"to_conditions\": [     {       \"ItmNumber\": \"000001\",       \"CondType\": \"ZPCP\",       \"CondValue\": \"4740\"     }   ],   \"to_text\": [     {       \"ItmNumber\": \"000001\",       \"TextId\": \"ZOBS\",       \"Langu\": \"S\",       \"TextLine\": \"12IA\"     }   ],   \"to_autoincr\": [     {       \"Vbeln\": \"\",       \"Posnr\": \"000001\",       \"Bstdk\": \"20260710120000\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\",       \"Auart\": \"ZMER\",       \"Matnr\": \"111A00137\",       \"Kbetr\": \"1580\",       \"Zkbetr2\": \"0\"     }   ],   \"to_series\": [     {       \"Zvbeln\": \"\",       \"Zposnr\": \"000001\",       \"Zsernr\": \"\"     }   ] } "
> ```

##### Orden MA Ecommerce Contado
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/testnew`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Auart": "ZMER",
>   "CustGrp2": "C02",
>   "DistrChan": "01",
>   "Division": "01",
>   "DocDate": "2026-07-10T12:00:00",
>   "DocType": "ZMER",
>   "Name": "Tadeo",
>   "OrdReason": "",
>   "Pmnttrms": "ACEF", 
>   "PriceDate": "2026-07-10T12:00:00",
>   "PurchDate": "2026-07-10T12:00:00",
>   "PurchNoC": "ZSD_ZMER_8422",
>   "Ref1S": "",
>   "RefDoc": "",
>   "RefdocCat": "",
>   "SalesOff": "0090",
>   "SalesOrg": "04",
>   "Zconcepto": "Pedido de mercancias",
>   "Zreferencia": "8422",
>   "Zobservaciones": "Pedido generado desde web",
>   "Zsituacion": "Creacion",
>   "Zsituacionfecha": "20260710120000",
>   "Zsituacionusuario": "Tadeo",
>   "Zformaenvio": "",
>   "Zservtipoop": "",
>   "Zcausa": "",
>   "Zorigen": "ZMER",
>   "Zorigenid": "8422",
>   "Zaudat": "20260710120000",
>   "Zfechaconcl": "20260710120000",
>   "Zfechacancel": "20260710120000",
>   "Zfechaentreg": "20260710120000",
>   "Zembarqueestado": "EmbarqueEstado",
>   "Zformapagotp": "",
>   "Zafectacomision": "0",
>   "Zcontimpsimp": "",
>   "Zcontimpciego": "",
>   "Zcontimpcfd": "",
>   "Zformacobro": "",
>   "Zredimepos": "0",
>   "Zcomlibera": "",
>   "Zband402": "0",
>   "Zfechaenvcred": "20260710120000",
>   "Zliberado": "1234",
>   "Zautoriza": "",
>   "Zartq": "1",
>   "Zidecomm": "",
>   "Zpagodie": "0",
>   "Zrepdescto": "0",
>   "Zvtadimanuevo": "0",
>   "Zredimepuntos": "0",
>   "Zprerastreo": "0",
>   "Ztransferenstp": "0",
>   "Zctefinal": "1500007416",
>   "to_partners": [
>     {
>       "PartnNumb": "1500007416",
>       "PartnRole": "AG"
>     },
>     {
>       "PartnNumb": "0023000125",
>       "PartnRole": "Z1"
>     }
>   ],
>   "to_movtpo": [
>     {
>       "Vbeln": "",
>       "Zmodulo": "VENTA",
>       "Zfechacom": "20260710120000",
>       "Zfechafin": "20260710120000",
>       "Zidstatus": "",
>       "Zsituacion": "Pedido de mercancias",
>       "Werks": "0090",
>       "Bname": "Tadeo"
>     }
>   ],
>   "to_movbita": [
>     {
>       "Vbeln": "",
>       "Bstkd": "2026-07-10T12:00:00",
>       "Werks": "0090",
>       "Bstkd_e": "Tipo123456",
>       "Bname": "Tadeo",
>       "Ihrez_e": "Clave123",
>       "Zmodulo": "VENTA",
>       "Zeventos": "Pedido de mercancias",
>       "Zobsreanalisis": "",
>       "Ztiporespuesta": "",
>       "Zcitacliente": "1",
>       "Zcitaaval": "1",
>       "Zhoracita": "120000",
>       "Zfechacita": "2026-07-10T12:00:00"
>     }
>   ],
>   "to_items": [
>     {
>       "ItmNumber": "000001",
>       "PoItmNo": "000001",
>       "Material": "111A00137",
>       "TargetQty": "3",
>       "TargetQu": "PI",
>       "ItemCateg": "ZMRM",
>       "Batch": "",
>       "Plant": "0002",
>       "Kwert": "4740",
>       "StoreLoc": "001V",
>       "RefDoc": "",
>       "RefDocIt": "",
>       "RefDocCa": "",
>       "Zdescrextra": "",
>       "Zpuntos": "0",
>       "Zidcopia": "0",
>       "Zusudescto": "",
>       "Zidcampapromo": "",
>       "Zpadre": "",
>       "Ztppromo": "",
>       "Zkwert3": "0",
>       "Zkwert4": "0",
>       "Zkwert5": "0"
>     }
>   ],
>   "to_conditions": [
>     {
>       "ItmNumber": "000001",
>       "CondType": "ZPCP",
>       "CondValue": "4740"
>     }
>   ],
>   "to_text": [
>     {
>       "ItmNumber": "000001",
>       "TextId": "ZOBS",
>       "Langu": "S",
>       "TextLine": "ACEF"
>     }
>   ],
>   "to_autoincr": [
>     {
>       "Vbeln": "",
>       "Posnr": "000001",
>       "Bstdk": "20260710120000",
>       "Werks": "0090",
>       "Bname": "Tadeo",
>       "Auart": "ZMER",
>       "Matnr": "111A00137",
>       "Kbetr": "1580",
>       "Zkbetr2": "0"
>     }
>   ],
>   "to_series": [
>     {
>       "Zvbeln": "",
>       "Zposnr": "000001",
>       "Zsernr": ""
>     }
>   ],
>   "to_return": []
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/testnew" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"Auart\": \"ZMER\",   \"CustGrp2\": \"C02\",   \"DistrChan\": \"01\",   \"Division\": \"01\",   \"DocDate\": \"2026-07-10T12:00:00\",   \"DocType\": \"ZMER\",   \"Name\": \"Tadeo\",   \"OrdReason\": \"\",   \"Pmnttrms\": \"ACEF\",    \"PriceDate\": \"2026-07-10T12:00:00\",   \"PurchDate\": \"2026-07-10T12:00:00\",   \"PurchNoC\": \"ZSD_ZMER_8422\",   \"Ref1S\": \"\",   \"RefDoc\": \"\",   \"RefdocCat\": \"\",   \"SalesOff\": \"0090\",   \"SalesOrg\": \"04\",   \"Zconcepto\": \"Pedido de mercancias\",   \"Zreferencia\": \"8422\",   \"Zobservaciones\": \"Pedido generado desde web\",   \"Zsituacion\": \"Creacion\",   \"Zsituacionfecha\": \"20260710120000\",   \"Zsituacionusuario\": \"Tadeo\",   \"Zformaenvio\": \"\",   \"Zservtipoop\": \"\",   \"Zcausa\": \"\",   \"Zorigen\": \"ZMER\",   \"Zorigenid\": \"8422\",   \"Zaudat\": \"20260710120000\",   \"Zfechaconcl\": \"20260710120000\",   \"Zfechacancel\": \"20260710120000\",   \"Zfechaentreg\": \"20260710120000\",   \"Zembarqueestado\": \"EmbarqueEstado\",   \"Zformapagotp\": \"\",   \"Zafectacomision\": \"0\",   \"Zcontimpsimp\": \"\",   \"Zcontimpciego\": \"\",   \"Zcontimpcfd\": \"\",   \"Zformacobro\": \"\",   \"Zredimepos\": \"0\",   \"Zcomlibera\": \"\",   \"Zband402\": \"0\",   \"Zfechaenvcred\": \"20260710120000\",   \"Zliberado\": \"1234\",   \"Zautoriza\": \"\",   \"Zartq\": \"1\",   \"Zidecomm\": \"\",   \"Zpagodie\": \"0\",   \"Zrepdescto\": \"0\",   \"Zvtadimanuevo\": \"0\",   \"Zredimepuntos\": \"0\",   \"Zprerastreo\": \"0\",   \"Ztransferenstp\": \"0\",   \"Zctefinal\": \"1500007416\",   \"to_partners\": [     {       \"PartnNumb\": \"1500007416\",       \"PartnRole\": \"AG\"     },     {       \"PartnNumb\": \"0023000125\",       \"PartnRole\": \"Z1\"     }   ],   \"to_movtpo\": [     {       \"Vbeln\": \"\",       \"Zmodulo\": \"VENTA\",       \"Zfechacom\": \"20260710120000\",       \"Zfechafin\": \"20260710120000\",       \"Zidstatus\": \"\",       \"Zsituacion\": \"Pedido de mercancias\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\"     }   ],   \"to_movbita\": [     {       \"Vbeln\": \"\",       \"Bstkd\": \"2026-07-10T12:00:00\",       \"Werks\": \"0090\",       \"Bstkd_e\": \"Tipo123456\",       \"Bname\": \"Tadeo\",       \"Ihrez_e\": \"Clave123\",       \"Zmodulo\": \"VENTA\",       \"Zeventos\": \"Pedido de mercancias\",       \"Zobsreanalisis\": \"\",       \"Ztiporespuesta\": \"\",       \"Zcitacliente\": \"1\",       \"Zcitaaval\": \"1\",       \"Zhoracita\": \"120000\",       \"Zfechacita\": \"2026-07-10T12:00:00\"     }   ],   \"to_items\": [     {       \"ItmNumber\": \"000001\",       \"PoItmNo\": \"000001\",       \"Material\": \"111A00137\",       \"TargetQty\": \"3\",       \"TargetQu\": \"PI\",       \"ItemCateg\": \"ZMRM\",       \"Batch\": \"\",       \"Plant\": \"0002\",       \"Kwert\": \"4740\",       \"StoreLoc\": \"001V\",       \"RefDoc\": \"\",       \"RefDocIt\": \"\",       \"RefDocCa\": \"\",       \"Zdescrextra\": \"\",       \"Zpuntos\": \"0\",       \"Zidcopia\": \"0\",       \"Zusudescto\": \"\",       \"Zidcampapromo\": \"\",       \"Zpadre\": \"\",       \"Ztppromo\": \"\",       \"Zkwert3\": \"0\",       \"Zkwert4\": \"0\",       \"Zkwert5\": \"0\"     }   ],   \"to_conditions\": [     {       \"ItmNumber\": \"000001\",       \"CondType\": \"ZPCP\",       \"CondValue\": \"4740\"     }   ],   \"to_text\": [     {       \"ItmNumber\": \"000001\",       \"TextId\": \"ZOBS\",       \"Langu\": \"S\",       \"TextLine\": \"ACEF\"     }   ],   \"to_autoincr\": [     {       \"Vbeln\": \"\",       \"Posnr\": \"000001\",       \"Bstdk\": \"20260710120000\",       \"Werks\": \"0090\",       \"Bname\": \"Tadeo\",       \"Auart\": \"ZMER\",       \"Matnr\": \"111A00137\",       \"Kbetr\": \"1580\",       \"Zkbetr2\": \"0\"     }   ],   \"to_series\": [     {       \"Zvbeln\": \"\",       \"Zposnr\": \"000001\",       \"Zsernr\": \"\"     }   ],   \"to_return\": [] } "
> ```

### 📁 Auth

#### Auth
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/login/auth`

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "Username": "User-ILXTAL",
>     "Password": "D95;.XW8!k_55y)u"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/login/auth" \
>   -H "Content-Type: application/json" \
>   -d "{     \"Username\": \"User-ILXTAL\",     \"Password\": \"D95;.XW8!k_55y)u\" }"
> ```

### 📁 Pruebas

#### BaseDirectory
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/debug/verificar-confini`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/debug/verificar-confini" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### Test
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/test/test1`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/test/test1" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 AWS Local

#### 📁 GetFamiliaLinea

##### GetFamiliaLinea
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_Familia_Linea`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** oauth-2
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_Familia_Linea"
> ```

#### 📁 GetFormasPago

##### GetFormasPago
- **Método:** `GET`
- **Endpoint:** `https://hfvu11zfh1.execute-api.us-east-1.amazonaws.com/AS_GET_FormasPago`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** oauth-2
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://hfvu11zfh1.execute-api.us-east-1.amazonaws.com/AS_GET_FormasPago"
> ```

#### 📁 GetCatalogoArticulos

##### CatalogoArticulos
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoArticulos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** oauth-2
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoArticulos"
> ```

#### 📁 GetCatalogoSucursales

##### GetCatalogoSucursales
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoSucursales`

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoSucursales"
> ```

#### 📁 GetCatalogoAlmacenes

##### GetAlmacenPrincipales
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/catalogo/DM0285ALMACENPRINCIPAL`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/catalogo/DM0285ALMACENPRINCIPAL" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

##### GetAlmacenSecundario
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/catalogo/DM0285ALMACENESSECUNDARIOS`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/catalogo/DM0285ALMACENESSECUNDARIOS" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

##### GetAlmacenRespaldo
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/catalogo/DM0285ALMACENRESPALDO`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/catalogo/DM0285ALMACENRESPALDO" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### 📁 GetCatalogoMotos

##### GetCatalogoMotos
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/product/catalogo/DM0285ALMACENPRINCIPAL`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `NOMBRECATALOGO`: `LINEAMOTOS`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/product/catalogo/DM0285ALMACENPRINCIPAL" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "NOMBRECATALOGO: LINEAMOTOS"
> ```

#### 📁 GetCupones

##### GetCupones
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/order/validatecupon/30018096`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/order/validatecupon/30018096" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 BP01-BP02 Creacion y Actualización

#### GetBP
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partner/client/23000172`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partner/client/23000172" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### Test Create Client
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/partner/testnew`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Partner": "",
>   "Type": "",
>   "BuGroup": "CLIE",
>   "Sort1": "ABC",
>   "Sort2": "ABC",
>   "Title": "",
>   "TitleLet": "",
>   "Natpers": "X",
>   "NameOrg1": "muebles_america",
>   "NameOrg2": "",
>   "NameOrg3": "",
>   "NameOrg4": "",
>   "Kdgrp": "01",
>   "NameLast": "URIELO",
>   "NameFirst": "URIELO",
>   "Birthdt": "19640406",
>   "NameLst2": "SALDANA",
>   "NameLast2": "",
>   "Namemiddle": "",
>   "Gender": "",
>   "Xsexm": false,
>   "Crdat": "",
>   "Crtim": "",
>   "Marst": "1",
>   "Natio": "MX",
>   "Xblck": false,
>   "NotReleased": false,
>   "Street": "HRTHRTH",
>   "HouseNum1": "1",
>   "NameCo": "",
>   "StrSuppl1": "",
>   "StrSuppl2": "",
>   "StrSuppl3": "CHAYOTILLO",
>   "Location": "",
>   "City2": "",
>   "City1": "LAGOS DE MORENO",
>   "PostCode1": "47504",
>   "Country": "MX",
>   "Region": "JAL",
>   "TimeZone": "",
>   "Langu": "S",
>   "Transpzone": "",
>   "TelNumber": "3365894964",
>   "TelExtens": "",
>   "DateFrom": "20260709",
>   "DateTo": "",
>   "AddrGroup": "",
>   "PersAddr": true,
>   "Remark": "",
>   "TelnrLong": "3365814658",
>   "SmtpAddr": "SINCORREO@SINCORREO.COM",
>   "Stkzn": "X",
>   "Stcd1": "GXTG640406D91",
>   "Stkzu": true,
>   "Brsch": "",
>   "Ktokd": "CLIE",
>   "AufsdKna1": "",
>   "LifsdKna1": "",
>   "FaksdKna1": "",
>   "Bukrs": "5510",
>   "Akont": "12100000",
>   "Zwels": "",
>   "Xverr": false,
>   "ZtermKnb1": "",
>   "Fdgrv": "",
>   "Xzver": false,
>   "Togru": "",
>   "Altkn": "",
>   "VkorgKnvv": "04",
>   "VtwegKnvv": "01",
>   "SpartKnvv": "01",
>   "Ernam": "",
>   "Erdat": "",
>   "Kalks": "1",
>   "Bzirk": "",
>   "Konda": "",
>   "Pltyp": "",
>   "Awahr": "100",
>   "Inco1": "",
>   "Inco2": "",
>   "Antlf": "",
>   "Lprio": "02",
>   "Eikto": "",
>   "Waers": "MXN",
>   "Ktgrd": "01",
>   "Vsbed": "01",
>   "ZtermKnvv": "",
>   "Vwerk": "",
>   "Vkgrp": "",
>   "Vkbur": "",
>   "Kvgr1": "",
>   "Kvgr4": "",
>   "AufsdKnvv": "",
>   "LifsdKnvv": "",
>   "FaksdKnvv": "",
>   "Parnr": "000000100",
>   "Namev": "",
>   "Name1F": "",
>   "Sortl": "",
>   "Aland": "MX",
>   "Taxkd": "1",
>   "Tatyp": "TMX1",
>   "VkorgKnvp": "04",
>   "VtwegKnvp": "01",
>   "SpartKnvp": "01",
>   "Parvw": "SH",
>   "Kunn2": "",
>   "Rfc": "GXTG640406D91",
>   "Bvtyp": "",
>   "Fiscalregimen": "605",
>   "Usocfdi": "",
>   "Perrl": "AM",
>   "toCte": {
>     "ZclienteBp": "",
>     "ZentCalles": "HRTHRTHRH",
>     "ZantigMeses": 0,
>     "ZantigAnios": 0,
>     "Zcurp": "",
>     "Zcredito": "",
>     "Zprospecto": "",
>     "Zagenteserv": "",
>     "Zcreditoesp": "",
>     "Zcrmimporte": "0.00",
>     "Zcrmcantidad": "0.00",
>     "Zfecha4": null,
>     "Zusuariopos": "VENTP00744",
>     "ZidTipoCalles": "",
>     "ZidestatSup": "1",
>     "ZrecomendPor": "",
>     "ZimporRent": "0.00",
>     "ZviveencCal": "",
>     "ZantigNeg": 0,
>     "ZpartentRec": "",
>     "ZdirRecom": "",
>     "ZserieMon": "",
>     "ZlimCred": "0.00",
>     "ZidAval": "",
>     "Zlcaxsi": "0.00",
>     "ZidMagento": 12345,
>     "ZingMensCredw": "0.00",
>     "ZlimCedDimae": "0.00",
>     "ZidTipoDima": "",
>     "Zirreg": "",
>     "ZnegBc": "",
>     "ZserieMonViu": "",
>     "Znipventa": "",
>     "Znipcobro": "",
>     "ZreestrucDeud": "",
>     "ZclabeCuenta": "",
>     "ZlcaxsiMay": "0.00",
>     "ZcpaxaMay": "0.00",
>     "ZingresoTip": "",
>     "Zbanco": "",
>     "ZctaClabeValid": "",
>     "ZfolioPagMay": "",
>     "ZvalorPagMay": "0.00",
>     "ZapoyoVtaDima": 0,
>     "ZidCtaClDisp": 0,
>     "ZapoyCobr": "",
>     "ZretApoyCobr": "",
>     "ZintSolApoy": 0,
>     "ZtotalAsign": 0,
>     "ZnivEsp": "",
>     "Zcompania": "",
>     "ZcodSms": 0,
>     "ZsmsValid": "",
>     "ZfechValid": "0",
>     "ZdoctoValid": "",
>     "ZidTipoBf": "",
>     "ZviveCon": "",
>     "ZfechCateg": "0",
>     "ZusuarioIrreg": "",
>     "ZfechaIrreg": null,
>     "ZmotivoIrreg": "",
>     "ZsinBoifBf": "",
>     "ZmapLat": "0.00",
>     "ZmapLong": "0.00",
>     "ZreestDeuda": "",
>     "ZusValidTarj": "",
>     "ZidVivEnCalid": "",
>     "Zcita": "",
>     "ZnumPag": 0,
>     "ZfecUltPag": null,
>     "ZtipoCliente": "Nuevo"
>   },
>   "toCteTel": {
>     "Partner": "",
>     "ZidcteTel": "1",
>     "ZtipoCte": "particular",
>     "ZtelCte": "3365894964",
>     "Zfecha": "2026-07-09T18:28:28",
>     "ZenvioNip": false,
>     "ZvalTel": false,
>     "ZappOrig": "CteXpressFrontSAP",
>     "ZfechaCap": "2026-07-09",
>     "ZtelExist": false,
>     "ZtraeTel": false,
>     "Zintentos": "",
>     "ZtipoValid": ""
>   },
>   "toReturn": []
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/partner/testnew" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"Partner\": \"\",   \"Type\": \"\",   \"BuGroup\": \"CLIE\",   \"Sort1\": \"ABC\",   \"Sort2\": \"ABC\",   \"Title\": \"\",   \"TitleLet\": \"\",   \"Natpers\": \"X\",   \"NameOrg1\": \"muebles_america\",   \"NameOrg2\": \"\",   \"NameOrg3\": \"\",   \"NameOrg4\": \"\",   \"Kdgrp\": \"01\",   \"NameLast\": \"URIELO\",   \"NameFirst\": \"URIELO\",   \"Birthdt\": \"19640406\",   \"NameLst2\": \"SALDANA\",   \"NameLast2\": \"\",   \"Namemiddle\": \"\",   \"Gender\": \"\",   \"Xsexm\": false,   \"Crdat\": \"\",   \"Crtim\": \"\",   \"Marst\": \"1\",   \"Natio\": \"MX\",   \"Xblck\": false,   \"NotReleased\": false,   \"Street\": \"HRTHRTH\",   \"HouseNum1\": \"1\",   \"NameCo\": \"\",   \"StrSuppl1\": \"\",   \"StrSuppl2\": \"\",   \"StrSuppl3\": \"CHAYOTILLO\",   \"Location\": \"\",   \"City2\": \"\",   \"City1\": \"LAGOS DE MORENO\",   \"PostCode1\": \"47504\",   \"Country\": \"MX\",   \"Region\": \"JAL\",   \"TimeZone\": \"\",   \"Langu\": \"S\",   \"Transpzone\": \"\",   \"TelNumber\": \"3365894964\",   \"TelExtens\": \"\",   \"DateFrom\": \"20260709\",   \"DateTo\": \"\",   \"AddrGroup\": \"\",   \"PersAddr\": true,   \"Remark\": \"\",   \"TelnrLong\": \"3365814658\",   \"SmtpAddr\": \"SINCORREO@SINCORREO.COM\",   \"Stkzn\": \"X\",   \"Stcd1\": \"GXTG640406D91\",   \"Stkzu\": true,   \"Brsch\": \"\",   \"Ktokd\": \"CLIE\",   \"AufsdKna1\": \"\",   \"LifsdKna1\": \"\",   \"FaksdKna1\": \"\",   \"Bukrs\": \"5510\",   \"Akont\": \"12100000\",   \"Zwels\": \"\",   \"Xverr\": false,   \"ZtermKnb1\": \"\",   \"Fdgrv\": \"\",   \"Xzver\": false,   \"Togru\": \"\",   \"Altkn\": \"\",   \"VkorgKnvv\": \"04\",   \"VtwegKnvv\": \"01\",   \"SpartKnvv\": \"01\",   \"Ernam\": \"\",   \"Erdat\": \"\",   \"Kalks\": \"1\",   \"Bzirk\": \"\",   \"Konda\": \"\",   \"Pltyp\": \"\",   \"Awahr\": \"100\",   \"Inco1\": \"\",   \"Inco2\": \"\",   \"Antlf\": \"\",   \"Lprio\": \"02\",   \"Eikto\": \"\",   \"Waers\": \"MXN\",   \"Ktgrd\": \"01\",   \"Vsbed\": \"01\",   \"ZtermKnvv\": \"\",   \"Vwerk\": \"\",   \"Vkgrp\": \"\",   \"Vkbur\": \"\",   \"Kvgr1\": \"\",   \"Kvgr4\": \"\",   \"AufsdKnvv\": \"\",   \"LifsdKnvv\": \"\",   \"FaksdKnvv\": \"\",   \"Parnr\": \"000000100\",   \"Namev\": \"\",   \"Name1F\": \"\",   \"Sortl\": \"\",   \"Aland\": \"MX\",   \"Taxkd\": \"1\",   \"Tatyp\": \"TMX1\",   \"VkorgKnvp\": \"04\",   \"VtwegKnvp\": \"01\",   \"SpartKnvp\": \"01\",   \"Parvw\": \"SH\",   \"Kunn2\": \"\",   \"Rfc\": \"GXTG640406D91\",   \"Bvtyp\": \"\",   \"Fiscalregimen\": \"605\",   \"Usocfdi\": \"\",   \"Perrl\": \"AM\",   \"toCte\": {     \"ZclienteBp\": \"\",     \"ZentCalles\": \"HRTHRTHRH\",     \"ZantigMeses\": 0,     \"ZantigAnios\": 0,     \"Zcurp\": \"\",     \"Zcredito\": \"\",     \"Zprospecto\": \"\",     \"Zagenteserv\": \"\",     \"Zcreditoesp\": \"\",     \"Zcrmimporte\": \"0.00\",     \"Zcrmcantidad\": \"0.00\",     \"Zfecha4\": null,     \"Zusuariopos\": \"VENTP00744\",     \"ZidTipoCalles\": \"\",     \"ZidestatSup\": \"1\",     \"ZrecomendPor\": \"\",     \"ZimporRent\": \"0.00\",     \"ZviveencCal\": \"\",     \"ZantigNeg\": 0,     \"ZpartentRec\": \"\",     \"ZdirRecom\": \"\",     \"ZserieMon\": \"\",     \"ZlimCred\": \"0.00\",     \"ZidAval\": \"\",     \"Zlcaxsi\": \"0.00\",     \"ZidMagento\": 12345,     \"ZingMensCredw\": \"0.00\",     \"ZlimCedDimae\": \"0.00\",     \"ZidTipoDima\": \"\",     \"Zirreg\": \"\",     \"ZnegBc\": \"\",     \"ZserieMonViu\": \"\",     \"Znipventa\": \"\",     \"Znipcobro\": \"\",     \"ZreestrucDeud\": \"\",     \"ZclabeCuenta\": \"\",     \"ZlcaxsiMay\": \"0.00\",     \"ZcpaxaMay\": \"0.00\",     \"ZingresoTip\": \"\",     \"Zbanco\": \"\",     \"ZctaClabeValid\": \"\",     \"ZfolioPagMay\": \"\",     \"ZvalorPagMay\": \"0.00\",     \"ZapoyoVtaDima\": 0,     \"ZidCtaClDisp\": 0,     \"ZapoyCobr\": \"\",     \"ZretApoyCobr\": \"\",     \"ZintSolApoy\": 0,     \"ZtotalAsign\": 0,     \"ZnivEsp\": \"\",     \"Zcompania\": \"\",     \"ZcodSms\": 0,     \"ZsmsValid\": \"\",     \"ZfechValid\": \"0\",     \"ZdoctoValid\": \"\",     \"ZidTipoBf\": \"\",     \"ZviveCon\": \"\",     \"ZfechCateg\": \"0\",     \"ZusuarioIrreg\": \"\",     \"ZfechaIrreg\": null,     \"ZmotivoIrreg\": \"\",     \"ZsinBoifBf\": \"\",     \"ZmapLat\": \"0.00\",     \"ZmapLong\": \"0.00\",     \"ZreestDeuda\": \"\",     \"ZusValidTarj\": \"\",     \"ZidVivEnCalid\": \"\",     \"Zcita\": \"\",     \"ZnumPag\": 0,     \"ZfecUltPag\": null,     \"ZtipoCliente\": \"Nuevo\"   },   \"toCteTel\": {     \"Partner\": \"\",     \"ZidcteTel\": \"1\",     \"ZtipoCte\": \"particular\",     \"ZtelCte\": \"3365894964\",     \"Zfecha\": \"2026-07-09T18:28:28\",     \"ZenvioNip\": false,     \"ZvalTel\": false,     \"ZappOrig\": \"CteXpressFrontSAP\",     \"ZfechaCap\": \"2026-07-09\",     \"ZtelExist\": false,     \"ZtraeTel\": false,     \"Zintentos\": \"\",     \"ZtipoValid\": \"\"   },   \"toReturn\": [] } "
> ```

#### Create BP
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/partner/client`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "name": "EL Padrino",
>     "lastName": "GOD",
>     "lastName2": "",
>     "dateBirth": "1998-02-25",
>     "email":"urielVal69@gmail.com",
>     "gender":"H",
>     "phone":"987654321",
>     "idMagento":"",
>     "storeCode":"",
>     "list":"",
>     "address":"AVJV2543"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/partner/client" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{     \"name\": \"EL Padrino\",     \"lastName\": \"GOD\",     \"lastName2\": \"\",     \"dateBirth\": \"1998-02-25\",     \"email\":\"urielVal69@gmail.com\",     \"gender\":\"H\",     \"phone\":\"987654321\",     \"idMagento\":\"\",     \"storeCode\":\"\",     \"list\":\"\",     \"address\":\"AVJV2543\" }"
> ```

#### Actualiza BP Direct
- **Método:** `PATCH`
- **Endpoint:** `<<SAP>>/partner/client`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Partner": "1500007294",
>   "Searchterm1": "999123"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X PATCH "<<SAP>>/partner/client" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"Partner\": \"1500007294\",   \"Searchterm1\": \"999123\" } "
> ```

#### Actualiza BP UnirCuenta
- **Método:** `PATCH`
- **Endpoint:** `<<SAP>>/partner/client/unircuenta`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "partner_id": "1500007539",
>   "id_magento": 999123
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X PATCH "<<SAP>>/partner/client/unircuenta" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"partner_id\": \"1500007539\",   \"id_magento\": 999123 } "
> ```

### 📁 BP04 Actualizacion BP Acreedor POS

### 📁 BP05 Exposición de datos BP a POS

#### BP05 Client
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partner/client/filter/SalesOrg eq '04'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partner/client/filter/SalesOrg eq '04'" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### BP05 Client Filter
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partner/client/filter/SalesOrg eq '04'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partner/client/filter/SalesOrg eq '04'" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### BP05MA Mendiola
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partner/client/ma/1500007539`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partner/client/ma/1500007539" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 SD36 Consulta de documento

#### SD36 Consulta de documento
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/order/checkDocument/ZSD_ZMER_38515`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/order/checkDocument/ZSD_ZMER_38515" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 GET Agente

#### Get Agente
- **Método:** `GET`
- **Endpoint:** `https://businesspartner-api.mavi.fun/AS_GET_ZQBP_AGENTE?Zagente=30018095`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `magalindo`
> - **Password:** `SNDiros260308729de380c48..`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://businesspartner-api.mavi.fun/AS_GET_ZQBP_AGENTE?Zagente=30018095" \
>   -u "magalindo:SNDiros260308729de380c48.."
> ```

### 📁 SD46 Anula Salida de Mercancias ligada a Entrega

#### SD46 Anula Salida de Mercancias ligada a Entrega
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/cancelOrder`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "store": "01",
>   "incrementId": "12345",
>   "dateTime": "2025-04-15T00:00:00",
>   "motivoCancelacion": "Prueba de anulacion",
>   "tipo": "ZMER",
>   "producto": [
>     {
>       "sku": "111A00137",
>       "qty": 1,
>       "resolucion": "R",
>       "motivoDevolucion": "Prueba",
>       "rma_item_id": 1
>     }
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/cancelOrder" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"store\": \"01\",   \"incrementId\": \"12345\",   \"dateTime\": \"2025-04-15T00:00:00\",   \"motivoCancelacion\": \"Prueba de anulacion\",   \"tipo\": \"ZMER\",   \"producto\": [     {       \"sku\": \"111A00137\",       \"qty\": 1,       \"resolucion\": \"R\",       \"motivoDevolucion\": \"Prueba\",       \"rma_item_id\": 1     }   ] }"
> ```

### 📁 SD48 Anula Factura de Clientes

#### SD48 Anula Factura de Clientes
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/order/cancelInvoice`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "store": "01",
>   "incrementId": "12345",
>   "dateTime": "2025-04-15T00:00:00",
>   "motivoCancelacion": "Prueba de anulacion",
>   "tipo": "ZMER",
>   "producto": [
>     {
>       "sku": "111A00137",
>       "qty": 1,
>       "resolucion": "R",
>       "motivoDevolucion": "Prueba",
>       "rma_item_id": 1
>     }
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/order/cancelInvoice" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"store\": \"01\",   \"incrementId\": \"12345\",   \"dateTime\": \"2025-04-15T00:00:00\",   \"motivoCancelacion\": \"Prueba de anulacion\",   \"tipo\": \"ZMER\",   \"producto\": [     {       \"sku\": \"111A00137\",       \"qty\": 1,       \"resolucion\": \"R\",       \"motivoDevolucion\": \"Prueba\",       \"rma_item_id\": 1     }   ] }"
> ```

### 📁 DATOS DE ENTREGA

#### 📁 Patch UpdatePhoneOrder

##### PATCH PhoneNumber
- **Método:** `PATCH`
- **Endpoint:** `<<SAP>>/partneraddress/partner/phone?addressId=56912&person=56911&ordinalNumber=001`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "PhoneNumber": "3388776655",
>   "DestinationLocationCountry": "MX",
>   "IsDefaultPhoneNumber": true,
>   "PhoneNumberType": "1"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X PATCH "<<SAP>>/partneraddress/partner/phone?addressId=56912&person=56911&ordinalNumber=001" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"PhoneNumber\": \"3388776655\",   \"DestinationLocationCountry\": \"MX\",   \"IsDefaultPhoneNumber\": true,   \"PhoneNumberType\": \"1\" }"
> ```

#### 📁 Patch PartnerAddress

##### PATCH PartnerAddress
- **Método:** `PATCH`
- **Endpoint:** `<<SAP>>/partneraddress/partner/1500007333/address/64586`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "StreetName": "JOYAS DE EGIPTO MODIFICADA",
>   "HouseNumber": "896-B",
>   "District": "GUADALAJARA CENTRO",
>   "CityName": "GUADALAJARA",
>   "PostalCode": "44400",
>   "Region": "JAL",
>   "Country": "MX"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X PATCH "<<SAP>>/partneraddress/partner/1500007333/address/64586" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"StreetName\": \"JOYAS DE EGIPTO MODIFICADA\",   \"HouseNumber\": \"896-B\",   \"District\": \"GUADALAJARA CENTRO\",   \"CityName\": \"GUADALAJARA\",   \"PostalCode\": \"44400\",   \"Region\": \"JAL\",   \"Country\": \"MX\" }"
> ```

#### 📁 Post AddressPartner

##### POST PartnerAddress
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/partneraddress/partner/1500007416`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Country": "MX",
>   "Region": "JAL",
>   "CityName": "Guadalajara",
>   "District": "Centro",
>   "PostalCode": "44100",
>   "StreetName": "hidalgo",
>   "HouseNumber": "1234",
>   "HouseNumberSupplementText": "Int 4B",
>   "StreetPrefixName": "Calle Tesistan",
>   "StreetSuffixName": "Periferico Norte",
>   "AdditionalStreetSuffixName": "Entre Calle magdalena y Calle rotoplaz",
>   "ValidityStartDate": "2026-08-31T00:00:00"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/partneraddress/partner/1500007416" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"Country\": \"MX\",   \"Region\": \"JAL\",   \"CityName\": \"Guadalajara\",   \"District\": \"Centro\",   \"PostalCode\": \"44100\",   \"StreetName\": \"hidalgo\",   \"HouseNumber\": \"1234\",   \"HouseNumberSupplementText\": \"Int 4B\",   \"StreetPrefixName\": \"Calle Tesistan\",   \"StreetSuffixName\": \"Periferico Norte\",   \"AdditionalStreetSuffixName\": \"Entre Calle magdalena y Calle rotoplaz\",   \"ValidityStartDate\": \"2026-08-31T00:00:00\" } "
> ```

#### 📁 GET PartnerAddress

##### GET Partner Address
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partneraddress/partner/1500007416`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partneraddress/partner/1500007416" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

#### 📁 POST Delivery address salesdoc

##### POST DeliveryDocument
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/partneraddress/salesdoc`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "SalesDocument": "9426", 
>   "PartnerNumber": "1500007416",
>   "AddressNumber": "64970",
>   "PartnerRole": "WE" 
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/partneraddress/salesdoc" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"SalesDocument\": \"9426\",    \"PartnerNumber\": \"1500007416\",   \"AddressNumber\": \"64970\",   \"PartnerRole\": \"WE\"  } "
> ```

#### 📁 GetSalesDocumentAddress

##### GET ZSRV_SALESDOC_ADDRCHANGE_SRV
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partneraddress/salesdoc/8794/role/WE`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partneraddress/salesdoc/8794/role/WE" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 EX01 Documentos no Compensados

#### GET ClienteSaldo
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/credit/GetAccountDebts`

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>    "ClientNumber": "1500005115" 
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/credit/GetAccountDebts" \
>   -d "{    \"ClientNumber\": \"1500005115\"  }"
> ```

### 📁 TZ01 Splits

#### GET Cliente Parcialidades
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/credit/getClienteFactura/1500005115/9000006302`

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/credit/getClienteFactura/1500005115/9000006302"
> ```

### 📁 SuccesFactor

#### GetSuccesFactor
- **Método:** `GET`
- **Endpoint:** `https://android-api.mavi.fun/employees/get_personalById?user_id=30001558&status=0&centro=`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://android-api.mavi.fun/employees/get_personalById?user_id=30001558&status=0&centro=" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 Codigos Postales Sepomex

#### Codigos Postales
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/sepomex/validarcp?$filter=post_code eq '22790'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/sepomex/validarcp?$filter=post_code eq '22790'" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 SD05 Get MovBita

#### SD05 Get MovBita
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/movbita/events/9000016844`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/movbita/events/9000016844" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 GET AnexoVI ZTBC_Code_MSTR 

#### GET AnexoVI ZTBC_Code_MSTR 
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partner/ConsultaAnexos/RFCAnexoVI`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partner/ConsultaAnexos/RFCAnexoVI" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 IntegracionJavier

#### 📁 Sprint 2

##### S2-03->company/wholesale-customer/{wholesaleAccount}
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/company/wholesale-customer`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "wholesaleAccount": "1500008152"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/company/wholesale-customer" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"wholesaleAccount\": \"1500008152\" }"
> ```

##### S2-04->credit/getPlazos
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/credit/getPlazos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Accept`: `application/json`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/credit/getPlazos" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Accept: application/json"
> ```

### 📁 DM07 Sucursales

#### DM07 Sucursales
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/account/sucursal/0041`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/account/sucursal/0041" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 SD40 Condiciones de pago

#### SD40 Condiciones de pago
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/credit/condicionespago`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/credit/condicionespago" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 SD52 Canal Venta Cliente

#### GET Canal Distribucion Cliente
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/partner/ventadist/client/1500003857`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/partner/ventadist/client/1500003857" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

### 📁 Post Enable Chanel Org Client

#### Enable Chanel Org Client
- **Método:** `POST`
- **Endpoint:** `<<SAP>>/partner/enablechanelorg`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Bp": "1500003857",
>   "Vkorg": "05",
>   "Vtweg": "01",
>   "Spart": "00",
>   "Waers": "MXN",
>   "Versg": "1",
>   "Vsbed": "01",
>   "Zterm": "",
>   "Ktgrd": "01",
>   "Kvgr4": "",
>   "Perrl": "AM",
>   "ReturnSet": [
>     {}
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAP>>/partner/enablechanelorg" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"Bp\": \"1500003857\",   \"Vkorg\": \"05\",   \"Vtweg\": \"01\",   \"Spart\": \"00\",   \"Waers\": \"MXN\",   \"Versg\": \"1\",   \"Vsbed\": \"01\",   \"Zterm\": \"\",   \"Ktgrd\": \"01\",   \"Kvgr4\": \"\",   \"Perrl\": \"AM\",   \"ReturnSet\": [     {}   ] } "
> ```

### 📁 GET Cobros Referenciados

#### Get ZFICRUD_COBREF_SRV/WACOBREFSet
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/credit/GetCobrosReferenciados/1500004810`

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/credit/GetCobrosReferenciados/1500004810"
> ```

### 📁 Get Clabe STP Referencia Bancaria

#### GET Clabe STP
- **Método:** `GET`
- **Endpoint:** `<<SAP>>/credit/GetClabeSTP/1500000003`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAP>>/credit/GetClabeSTP/1500000003" \
>   -H "Authorization: Bearer <<jwt_token>>"
> ```

## 📁 🛡️ Endpoints C# (Público)

### 📁 BP01-BP02 Creacion y Actualización

#### POST SetCustomer
- **Método:** `POST`
- **Endpoint:** `<<DMZ>>/customer/setCustomer`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQxNDE1MTIsImV4cCI6MTc4NDE0ODcxMiwiaWF0IjoxNzg0MTQxNTEyLCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.qbY1BwIsv7i2XrWDrRXeULm5fsyovnZY8sNmDJcYZe4`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "name": "Pedro",
>   "lastName": "Ramírez",
>   "lastName2": "Sánchez",
>   "email": "pedro.ramirez99@test.com",
>   "gender": "M",
>   "phone": "3388776655",
>   "idMagento": "10555",
>   "storeCode": "muebles_america",
>   "dateBirth": "1990-05-15"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZ>>/customer/setCustomer" \
>   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQxNDE1MTIsImV4cCI6MTc4NDE0ODcxMiwiaWF0IjoxNzg0MTQxNTEyLCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.qbY1BwIsv7i2XrWDrRXeULm5fsyovnZY8sNmDJcYZe4" \
>   -d "{   \"name\": \"Pedro\",   \"lastName\": \"Ramírez\",   \"lastName2\": \"Sánchez\",   \"email\": \"pedro.ramirez99@test.com\",   \"gender\": \"M\",   \"phone\": \"3388776655\",   \"idMagento\": \"10555\",   \"storeCode\": \"muebles_america\",   \"dateBirth\": \"1990-05-15\" } "
> ```

### 📁 Auth

#### Auth
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>login/authenticate`

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
> - ``: ``
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "Username": "User-ILXTAL",
>     "Password": "D95;.XW8!k_55y)u"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>login/authenticate" \
>   -H "Content-Type: application/json" \
>   -H ": " \
>   -d "{     \"Username\": \"User-ILXTAL\",     \"Password\": \"D95;.XW8!k_55y)u\" }"
> ```

### 📁 SD01 Enviar Pedido a SAP

#### SD01 Enviar Pedido a SAP
- **Método:** `POST`
- **Endpoint:** `<<DMZ>>/order/setOrder`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "entityId": "5000",
>   "incrementId": "12100049500",
>   "storeId": "viu",
>   "status": "pending",
>   "subTotal": "5500.00",
>   "total": "6380.00",
>   "cuotas": "1",
>   "impuesto": "880.00",
>   "metodoPago": "banktransfer",
>   "costoEnvio": "0.00",
>   "metodoEnvio": "flatrate_flatrate",
>   "articulos": [
>     {
>       "sku": "SONY01228",
>       "precio": "5500.00",
>       "precioEspecial": "0.00",
>       "cantidad": "1",
>       "nombre": "Pantalla Samsung 55 Smart TV"
>     }
>   ],
>   "infoCliente": {
>     "cuenta": "1500007466",
>     "nombre": "Pedro",
>     "apellidoPaterno": "Ramírez",
>     "apellidoMaterno": "Sánchez",
>     "sexo": "1",
>     "pais": "MX",
>     "direccion": "Av. Vallarta",
>     "numExt": "123",
>     "referencia": "Portón Negro",
>     "numInt": "",
>     "entreCalles": "Chapultepec y Progreso",
>     "colonia": "Centro",
>     "municipio": "Guadalajara",
>     "codigoPostal": "44100",
>     "correo": "pedro.ramirez99@test.com",
>     "telefono": "3388776655",
>     "rfc": "XAXX010101000",
>     "idMagento": "10555"
>   },
>   "codigoRecogerSucursal": "",
>   "sucursalDestino": 0,
>   "forzarOrder": "",
>   "state": "new",
>   "RedimirMonedero": 0.00,
>   "Agente": "VENTAS_WEB",
>   "utmSource": "google_ads"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZ>>/order/setOrder" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Content-Type: application/json" \
>   -d "{   \"entityId\": \"5000\",   \"incrementId\": \"12100049500\",   \"storeId\": \"viu\",   \"status\": \"pending\",   \"subTotal\": \"5500.00\",   \"total\": \"6380.00\",   \"cuotas\": \"1\",   \"impuesto\": \"880.00\",   \"metodoPago\": \"banktransfer\",   \"costoEnvio\": \"0.00\",   \"metodoEnvio\": \"flatrate_flatrate\",   \"articulos\": [     {       \"sku\": \"SONY01228\",       \"precio\": \"5500.00\",       \"precioEspecial\": \"0.00\",       \"cantidad\": \"1\",       \"nombre\": \"Pantalla Samsung 55 Smart TV\"     }   ],   \"infoCliente\": {     \"cuenta\": \"1500007466\",     \"nombre\": \"Pedro\",     \"apellidoPaterno\": \"Ramírez\",     \"apellidoMaterno\": \"Sánchez\",     \"sexo\": \"1\",     \"pais\": \"MX\",     \"direccion\": \"Av. Vallarta\",     \"numExt\": \"123\",     \"referencia\": \"Portón Negro\",     \"numInt\": \"\",     \"entreCalles\": \"Chapultepec y Progreso\",     \"colonia\": \"Centro\",     \"municipio\": \"Guadalajara\",     \"codigoPostal\": \"44100\",     \"correo\": \"pedro.ramirez99@test.com\",     \"telefono\": \"3388776655\",     \"rfc\": \"XAXX010101000\",     \"idMagento\": \"10555\"   },   \"codigoRecogerSucursal\": \"\",   \"sucursalDestino\": 0,   \"forzarOrder\": \"\",   \"state\": \"new\",   \"RedimirMonedero\": 0.00,   \"Agente\": \"VENTAS_WEB\",   \"utmSource\": \"google_ads\" } "
> ```

### 📁 Cartera y Wallet

#### GET WALLET
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>customer/wallet/details`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQxNTMzNzQsImV4cCI6MTc4NDE2MDU3NCwiaWF0IjoxNzg0MTUzMzc0LCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.bS-DifAsyO9G3mkww7li6pOoOoJp9OCX-xA7gGGf3J8`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "cliente": "1500006777",
>   "uen": 1
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>customer/wallet/details" \
>   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQxNTMzNzQsImV4cCI6MTc4NDE2MDU3NCwiaWF0IjoxNzg0MTUzMzc0LCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.bS-DifAsyO9G3mkww7li6pOoOoJp9OCX-xA7gGGf3J8" \
>   -H "Content-Type: application/json" \
>   -d "{   \"cliente\": \"1500006777\",   \"uen\": 1 } "
> ```

### 📁 TZ01 Splits

#### GET Cliente Parcialidades
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>customerService/GetAccountDebts`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQ5MTIwNjIsImV4cCI6MTc4NDkxOTI2MiwiaWF0IjoxNzg0OTEyMDYyLCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.VbcYvUkkW1k_GsicYNohBssUS0CcqsIIPEAmimHkB44`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>    "ClientNumber": "1500005115" 
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>customerService/GetAccountDebts" \
>   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQ5MTIwNjIsImV4cCI6MTc4NDkxOTI2MiwiaWF0IjoxNzg0OTEyMDYyLCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.VbcYvUkkW1k_GsicYNohBssUS0CcqsIIPEAmimHkB44" \
>   -d "{    \"ClientNumber\": \"1500005115\"  }"
> ```

### 📁 EX01 Documentos no Compensados

#### GET ClienteSaldo
- **Método:** `POST`
- **Endpoint:** `<<SAPLocal>>credit/getClienteSaldo`

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPLocal>>credit/getClienteSaldo"
> ```

### 📁 SD46 Anula Salida de Mercancias

#### SD46 Anula Salida de Mercancias ligada a Entrega
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>order/cancelOrder`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQ5MzM0ODgsImV4cCI6MTc4NDk0MDY4OCwiaWF0IjoxNzg0OTMzNDg4LCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.Whq73b8_-lDRHC196EJbXfKiwnrYjfbHTsv9SI4xnTI`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "store": "01",
>   "incrementId": "38515",
>   "dateTime": "2025-04-15T00:00:00",
>   "motivoCancelacion": "Prueba de anulacion",
>   "tipo": "ZMER",
>   "producto": [
>     {
>       "sku": "111A00137",
>       "qty": 1,
>       "resolucion": "R",
>       "motivoDevolucion": "Prueba",
>       "rma_item_id": 1
>     }
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>order/cancelOrder" \
>   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXNlci1JTFhUQUwiLCJuYmYiOjE3ODQ5MzM0ODgsImV4cCI6MTc4NDk0MDY4OCwiaWF0IjoxNzg0OTMzNDg4LCJpc3MiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8iLCJhdWQiOiJodHRwczovL2tkbGwzZmhjeW8ubWF2aS5teC8ifQ.Whq73b8_-lDRHC196EJbXfKiwnrYjfbHTsv9SI4xnTI" \
>   -d "{   \"store\": \"01\",   \"incrementId\": \"38515\",   \"dateTime\": \"2025-04-15T00:00:00\",   \"motivoCancelacion\": \"Prueba de anulacion\",   \"tipo\": \"ZMER\",   \"producto\": [     {       \"sku\": \"111A00137\",       \"qty\": 1,       \"resolucion\": \"R\",       \"motivoDevolucion\": \"Prueba\",       \"rma_item_id\": 1     }   ] }"
> ```

### 📁 SD48 Anula Factura de Clientes

#### SD48 Anula Factura de Clientes
- **Método:** `POST`
- **Endpoint:** `<<SAPLocal>>order/cancelOrder`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Authorization`: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6IlVzZXItSUxYVEFMIiwibmJmIjoxNzgzNjI1OTk0LCJleHAiOjE3ODM2MzY3OTQsImlhdCI6MTc4MzYyNTk5NCwiaXNzIjoiaHR0cHM6Ly9rZGxsM2ZoY3lvLWxhbi5ncnVwb21hdmkuY29tLyIsImF1ZCI6Imh0dHBzOi8va2RsbDNmaGN5by1sYW4uZ3J1cG9tYXZpLmNvbS8ifQ.Qsj95uh1cxHjDqsjHCmexVFC1I6dnJWxorwu8TTk2_8`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "store": "01",
>   "incrementId": "38515",
>   "dateTime": "2025-04-15T00:00:00",
>   "motivoCancelacion": "Prueba de anulacion",
>   "tipo": "ZMER",
>   "producto": [
>     {
>       "sku": "111A00137",
>       "qty": 1,
>       "resolucion": "R",
>       "motivoDevolucion": "Prueba",
>       "rma_item_id": 1
>     }
>   ]
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPLocal>>order/cancelOrder" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6IlVzZXItSUxYVEFMIiwibmJmIjoxNzgzNjI1OTk0LCJleHAiOjE3ODM2MzY3OTQsImlhdCI6MTc4MzYyNTk5NCwiaXNzIjoiaHR0cHM6Ly9rZGxsM2ZoY3lvLWxhbi5ncnVwb21hdmkuY29tLyIsImF1ZCI6Imh0dHBzOi8va2RsbDNmaGN5by1sYW4uZ3J1cG9tYXZpLmNvbS8ifQ.Qsj95uh1cxHjDqsjHCmexVFC1I6dnJWxorwu8TTk2_8" \
>   -d "{   \"store\": \"01\",   \"incrementId\": \"38515\",   \"dateTime\": \"2025-04-15T00:00:00\",   \"motivoCancelacion\": \"Prueba de anulacion\",   \"tipo\": \"ZMER\",   \"producto\": [     {       \"sku\": \"111A00137\",       \"qty\": 1,       \"resolucion\": \"R\",       \"motivoDevolucion\": \"Prueba\",       \"rma_item_id\": 1     }   ] }"
> ```

### 📁 Pruebas

#### GET
- **Método:** `GET`
- **Endpoint:** `https://echo.hoppscotch.io`

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://echo.hoppscotch.io"
> ```

### 📁 IntegracionJavier

#### 📁 Sprint 2

##### S2-01-> customerService/LoginClienteCredito
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>customerService/LoginClienteCredito`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "ClientNumber": "1500008089"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>customerService/LoginClienteCredito" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"ClientNumber\": \"1500008089\" }"
> ```

##### S2-02-> customerService/LoginClienteCreditoFechaN
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>customerService/LoginClienteCreditoFechaN`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "ClientNumber": "1500003857",
>   "BirthDate": "2000-12-08",
>   "StoreId": 1
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>customerService/LoginClienteCreditoFechaN" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"ClientNumber\": \"1500003857\",   \"BirthDate\": \"2000-12-08\",   \"StoreId\": 1 }"
> ```

##### S2-03->company/wholesale-customer/{wholesaleAccount}
- **Método:** `GET`
- **Endpoint:** `<<DMZLocal>>company/wholesale-customer/1500007539`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Accept`: `application/json`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<DMZLocal>>company/wholesale-customer/1500007539" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Accept: application/json"
> ```

##### S2-04->credit/getPlazos
- **Método:** `GET`
- **Endpoint:** `<<DMZLocal>>credit/getPlazos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Accept`: `application/json`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<DMZLocal>>credit/getPlazos" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -H "Accept: application/json"
> ```

##### S2-05->customerService/unirCuenta
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>customerService/unirCuenta`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "cliente": "1500007539",
>   "id_magento": 999123
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>customerService/unirCuenta" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"cliente\": \"1500007539\",   \"id_magento\": 999123 }  "
> ```

##### S2-06->customerService/validarCliente
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>customerService/validarCliente`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "id_cliente_intelisis": "1500007539",
>   "id_cliente_magento": "999123"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>customerService/validarCliente" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"id_cliente_intelisis\": \"1500007539\",   \"id_cliente_magento\": \"999123\" }"
> ```

##### S2-07 ->prospecto/recuperarcuenta
- **Método:** `POST`
- **Endpoint:** `<<DMZLocal>>prospecto/recuperarcuenta`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** bearer
> - **Token:** `<<jwt_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "nombre": "JUAN",
>   "apellidoPaterno": "PEREZ",
>   "apellidoMaterno": "GARCIA",
>   "fechaNacimiento": "1990-01-01",
>   "rfc": "PEGJ900101XYZ"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<DMZLocal>>prospecto/recuperarcuenta" \
>   -H "Authorization: Bearer <<jwt_token>>" \
>   -d "{   \"nombre\": \"JUAN\",   \"apellidoPaterno\": \"PEREZ\",   \"apellidoMaterno\": \"GARCIA\",   \"fechaNacimiento\": \"1990-01-01\",   \"rfc\": \"PEGJ900101XYZ\" }"
> ```

## 📁 🌟 SAP Directo (OData S4)

### 📁 AWS

#### 📁 GetCatalogoArticulos

##### CatalogoArticulos
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoArticulos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoArticulos" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### 📁 GetFamiliaLinea

##### GetFamiliaLinea
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_Familia_Linea`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_Familia_Linea" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### 📁 GetFormasPago

##### GetFormasPago
- **Método:** `GET`
- **Endpoint:** `https://hfvu11zfh1.execute-api.us-east-1.amazonaws.com/AS_GET_FormasPago`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://hfvu11zfh1.execute-api.us-east-1.amazonaws.com/AS_GET_FormasPago" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### 📁 GetCatalogoSucursales

##### GetCatalogoSucursales
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoSucursales`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AS_GET_CatalogoSucursales" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### 📁 GetCatalogoAlmacenes

##### GetAlmacenPrincipales
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `NOMBRECATALOGO`: `MINIMO PARA REDIMIR MONEDERO`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=MINIMO+PARA+REDIMIR+MONEDERO" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

##### GetAlmacenSecundario
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `NOMBRECATALOGO`: `DM0285ALMACENESSECUNDARIOS`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=DM0285ALMACENESSECUNDARIOS" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

##### GetAlmacenRespaldo
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion
`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `NOMBRECATALOGO`: `DM0285ALMACENRESPALDO
`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion
> ?NOMBRECATALOGO=DM0285ALMACENRESPALDO%0A" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### 📁 GetCatalogoMotos

##### GetCatalogoMotos
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `NOMBRECATALOGO`: `LINEAMOTOS`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "NOMBRECATALOGO: LINEAMOTOS"
> ```

#### 📁 GetCupones

##### GetCupones
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=Código de promotor`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=Código de promotor" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 DM05 Informacion Etiquetas Informacion a nivel unidad de negocio

#### POSTEtiquetas
- **Método:** `POST`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_ZMMT_ETIQUETA_SRV/HEADERSet/`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Accept`: `application/json`
> - `Content-Type`: `application/json`
> - `x-csrf-token`: `<<csrf_token>>`
> **Query Params:**
> - `sap-client`: `110`
> - `sap-language`: `ES`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "ZIDETIQUETA": "",
>     "VKORG": "01",
>     "ZCAMPANA": "X",
>     "CLASS": "VF029L000",
>     "MATKL": "VF029L016",
>     "ZFECHAINICIO": "2026-06-01",
>     "ZFECHAFIN": "2026-06-30",
>     "ZTEXTOETIQUETA": "Dia del padre VIU",
>     "ZCOLORTEXTOD": "2345544",
>     "ZCOLORFONDOD": "999999",
>     "ZCOLORTEXTOH": "#FF0000",
>     "ZCOLORFONDOH": "#0000FF",
>     "ZCRITERIOS": "Comedores con descuento",
>     "ZCANTIDAD": "1",
>     "ZPESOVOLUMETRICO": "1",
>     "ZAGREGAREMOJI": "X",
>     "ZEMOJI": ":)"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_ZMMT_ETIQUETA_SRV/HEADERSet/?sap-client=110&sap-language=ES" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "Accept: application/json" \
>   -H "Content-Type: application/json" \
>   -H "x-csrf-token: <<csrf_token>>" \
>   -d "{     \"ZIDETIQUETA\": \"\",     \"VKORG\": \"01\",     \"ZCAMPANA\": \"X\",     \"CLASS\": \"VF029L000\",     \"MATKL\": \"VF029L016\",     \"ZFECHAINICIO\": \"2026-06-01\",     \"ZFECHAFIN\": \"2026-06-30\",     \"ZTEXTOETIQUETA\": \"Dia del padre VIU\",     \"ZCOLORTEXTOD\": \"2345544\",     \"ZCOLORFONDOD\": \"999999\",     \"ZCOLORTEXTOH\": \"#FF0000\",     \"ZCOLORFONDOH\": \"#0000FF\",     \"ZCRITERIOS\": \"Comedores con descuento\",     \"ZCANTIDAD\": \"1\",     \"ZPESOVOLUMETRICO\": \"1\",     \"ZAGREGAREMOJI\": \"X\",     \"ZEMOJI\": \":)\" }"
> ```

#### DELETEEtiquetas
- **Método:** `DELETE`
- **Endpoint:** ``

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `x-csrf-token`: `<<csrf_token>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X DELETE "" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "x-csrf-token: <<csrf_token>>"
> ```

### 📁 DM03 Configuracion Productos Relacionados

#### GetProductCrossSell
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CROSSSELL_SRV/HeaderSet(ARTICULO='CECE00095',VKORG='01')`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$expand`: `HeaderReturn`
> - `$format`: `json`
> - `sap-language`: `ES`
> - `sap-client`: `110`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CROSSSELL_SRV/HeaderSet(ARTICULO='CECE00095',VKORG='01')?%24expand=HeaderReturn&%24format=json&sap-language=ES&sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GetUpsell
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='CECE00095',VKORG='02')`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$expand`: `HeaderReturn`
> - `$format`: `json`
> - `sap-language`: `ES`
> - `sap-client`: `110`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='CECE00095',VKORG='02')?%24expand=HeaderReturn&%24format=json&sap-language=ES&sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GetSustituto
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='03')`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$expand`: `HeaderReturn`
> - `$format`: `json`
> - `sap-language`: `ES`
> - `sap-client`: `110`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='03')?%24expand=HeaderReturn&%24format=json&sap-language=ES&sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 DM03 Configuracion Productos Relacionados

#### GetProductCrossSell
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CROSSSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='01')`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$expand`: `HeaderReturn`
> - `$format`: `json`
> - `sap-language`: `ES`
> - `sap-client`: `110`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CROSSSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='01')?%24expand=HeaderReturn&%24format=json&sap-language=ES&sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GetUpsell
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='02')`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$expand`: `HeaderReturn`
> - `$format`: `json`
> - `sap-language`: `ES`
> - `sap-client`: `110`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='02')?%24expand=HeaderReturn&%24format=json&sap-language=ES&sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GetSustituto
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='03')`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$expand`: `HeaderReturn`
> - `$format`: `json`
> - `sap-language`: `ES`
> - `sap-client`: `110`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='MN0000001',VKORG='03')?%24expand=HeaderReturn&%24format=json&sap-language=ES&sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 DM02 Jerarquia de Articulos

#### GetJerarquiaArticulos
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_JERARQUIA_ARTICULOS_SRV/GET_ARTICULOSSet`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$format`: `xml`
> - `sap-client`: `110`
> - `sap-language`: `ES`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_JERARQUIA_ARTICULOS_SRV/GET_ARTICULOSSet?%24format=xml&sap-client=110&sap-language=ES" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 DM01 Articulos

#### GetProducts
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_ARTICULOS_SRV/Articulos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$format`: `json`
> - `sap-client`: `110`
> - `$top`: ``
> - `$skip`: ``
> - `$filter`: ``
> - `$select`: ``
> - `$orderBy`: ``
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_ARTICULOS_SRV/Articulos?%24format=json&sap-client=110&%24top=&%24skip=&%24filter=&%24select=&%24orderBy=" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GetFilterProducts
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_ARTICULOS_SRV/Articulos`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$format`: `json`
> - `sap-client`: `110`
> - `$filter`: `ARTICULO eq 'CHAR00008'`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_ARTICULOS_SRV/Articulos?%24format=json&sap-client=110&%24filter=ARTICULO+eq+%27CHAR00008%27" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD18 Consultar Contrato de Condiciones

#### GetCustomerWallet
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CONDITIONCONTRACT_SRV/ConditionContractSet`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `sap-language`: `ES`
> - `sap-client`: `110`
> - `$inlinecount`: `allpages`
> - `$filter`: `Reference eq '13450852'`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CONDITIONCONTRACT_SRV/ConditionContractSet?sap-language=ES&sap-client=110&%24inlinecount=allpages&%24filter=Reference+eq+%2713450852%27" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 D-IM-11 Consulta de existencias

#### GetStock
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `sap-client`: `110`
> - `$format`: `json`
> - `sap-language`: `ES`
> - `$expand`: `to_lotes,to_series`
> - `$inlinecount`: `allpages`
> - `$top`: ``
> - `$skip`: ``
> - `$filter`: ``
> - `$select`: ``
> - `$orderby`: ``
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia?sap-client=110&%24format=json&sap-language=ES&%24expand=to_lotes%2Cto_series&%24inlinecount=allpages&%24top=&%24skip=&%24filter=&%24select=&%24orderby=" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GetCatalogoConfiguracion
- **Método:** `GET`
- **Endpoint:** `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `NOMBRECATALOGO`: `DM0285ALMACENESSECUNDARIOS`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=DM0285ALMACENESSECUNDARIOS" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### New Request
- **Método:** `GET`
- **Endpoint:** `https://nibj6m7t0l.execute-api.us-east-1.amazonaws.com/AI_GET_CCatalogo`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `nombre_catalogo`: `DM0285ALMACENPRINCIPAL`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://nibj6m7t0l.execute-api.us-east-1.amazonaws.com/AI_GET_CCatalogo?nombre_catalogo=DM0285ALMACENPRINCIPAL" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD29 Envío de precios finales a SAP ProperListafinal

#### GetFinalListProperByUen
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_PROPRELIST_SRV/PropreListSet?sap-language=ES&sap-client=110&$filter=Articulo eq 'CENSO00075'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `sap-language`: `ES`
> - `sap-client`: `110`
> - `$format`: `json`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_PROPRELIST_SRV/PropreListSet?sap-language=ES&sap-client=110&$filter=Articulo eq 'CENSO00075'&sap-language=ES&sap-client=110&%24format=json" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD01 Enviar Pedido a SAP

#### GetSendPedidoSAP
- **Método:** `POST`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SALESORDER_SRV/A_SALES_ORDERSet`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
> - `X-CSRF-Token`: `<<csrf_token>>`
> **Query Params:**
> - `sap-client`: `110`
> - `sap-language`: `ES`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>     "DocType": "ZMER",
>     "PurchNoC": "ZSD_ZMER_001",
>     "PurchDate": "2024-11-13T15:35:00",
>     "PriceDate": "2024-11-13T15:35:00",
>     "SalesOrg": "01",
>     "DistrChan": "01",
>     "Division": "01",
>     "Name": "Tadeo",
>     "SalesOff": "0002",
>     "Pmnttrms": "12IA",
>     "DocDate": "2025-12-17T15:35:00",
>     "PurchNoS": "",
>     "Ref1S": "",
>     "Cstcndgrp1": "",
>     "RefDoc": "20001665",
>     "RefdocCat": "B",    
>     "CustGrp2": "C02",
>     "Auart": "ZMER",
>     "Zconcepto": "Pedido de mercancias",
>     "Zreferencia": "12345678",
>     "Zobservaciones": "Linea de texto para un pedido de pruebas 1",
>     "Zsituacion": "Creación",
>     "Zsituacionfecha": "20240226235959",
>     "Zsituacionusuario": "Tadeo",
>     "Zformaenvio": "Manual",
>     "Zservtipoop": "ServicioTipoOperacion",
>     "Zcausa": "Causa",
>     "Zorigen": "Origen",
>     "Zorigenid": "OrigenID",
>     "Zaudat": "20240226103000",
>     "Zfechaconcl": "20240226103000",
>     "Zfechacancel": "20240227103000",
>     "Zfechaentreg": "20240228103000",
>     "Zembarqueestado": "EmbarqueEstado",
>     "Zformapagotp": "Pagado",
>     "Zafectacomision": "0",
>     "Zcontimpsimp": "1234",
>     "Zcontimpciego": "1234",
>     "Zcontimpcfd": "1234",
>     "Zformacobro": "ZVPE",
>     "Zredimepos": "1",
>     "Zcomlibera": "ComLibera",
>     "Zband402": "0",
>     "Zfechaenvcred": "20240226103000",
>     "Zliberado": "1234",
>     "Zautoriza": "Autorizado",
>     "Zartq": "1",
>     "Zidecomm": "",
>     "Zpagodie": "1",
>     "Zrepdescto": "12345",
>     "Zvtadimanuevo": "1",
>     "Zredimepuntos": "1",
>     "Zprerastreo": "0",
>     "Ztransferenstp": "1",
>     "Zctefinal": "1000000",    
>     "to_items": [
>         {
>             "ItmNumber": "000001",
>             "PoItmNo": "10",
>             "Material": "CECE00095",
>             "TargetQty": "3",
>             "TargetQu": "PI",
>             "ItemCateg": "ZMRM",
>             "Plant": "0002",                        
>             "Kwert":"14500",
>             "Zdescrextra":"Linea de texto para un pedido de pruebas 1",
>             "Zpuntos": "12345678",
>             "Zidcopia": "12345",
>             "Zusudescto": "Tadeo",
>             "Zidcampapromo": "1029384756",
>             "Zpadre": "",
>             "Ztppromo": "TIP1",
>             "Zkwert3":"-2000",
>             "Zkwert4":"-1000",
>             "Zkwert5":"-1300",
>             "Batch":"0000000549",
>             "RefDoc": "20001665",
>             "RefDocIt": "10",
>             "RefDocCa": "B"            
>         }
>     ],
>     "to_conditions":[
>         {        
>             "ItmNumber": "000001",
>             "CondType":"ZPCP",
>             "CondValue":"12000"
>         },{        
>             "ItmNumber": "000001",
>             "CondType":"ZD03",
>             "CondValue":"-500"
>         }
>     ],
>     "to_partners": [
>         {
>             "PartnRole": "AG",
>             "PartnNumb": "1500006609"
>         },
>         {
>             "PartnRole": "Z1",
>             "PartnNumb": "23000125"
>         },
>         {
>             "PartnRole": "Z2",
>             "PartnNumb": "110095"
>         },
>         {
>             "PartnRole": "Z3",
>             "PartnNumb": "110099"
>         },
>         {
>             "PartnRole": "Z4",
>             "PartnNumb": "110098"
>         }
>     ],
>     "to_text": [
>         {  
>             "ItmNumber": "000001",  
>             "TextLine": "Linea de texto para un pedido de pruebas 1"
>         }
>     ],
>     "to_movbita": [
>         {
>             "Vbeln": "",
>             "Bstkd": "2025-12-17T23:59:59",
>             "Werks": "0002",
>             "Bstkd_e": "Tipo123456",
>             "Bname": "Tadeo",
>             "Ihrez_e": "Clave123",
>             "Zmodulo": "Mod12",
>             "Zeventos": "Pedido de mercancias",
>             "Zobsreanalisis": "",
>             "Ztiporespuesta": "",
>             "Zcitacliente": "1",
>             "Zcitaaval": "1",
>             "Zhoracita": "10:30:00",
>             "Zfechacita": "2024-11-13T23:59:59"
>         }
>     ],
>     "to_autoincr": [
>         {
>             "Vbeln": "",
>             "Posnr": "000001",
>             "Bstdk": "20240224235959",
>             "Werks": "0002",
>             "Bname": "Tadeo",
>             "Auart": "ZSOC",
>             "Matnr": "8",
>             "Kbetr": "15000",
>             "Zkbetr2": "14500"
>
>         }
>     ],
>     "to_movtpo": [
>         {
>             "Vbeln": "",
>             "Zmodulo": "VENTA",
>             "Zfechacom": "20240224235959",
>             "Zfechafin": "20240310235959",
>             "Zidstatus": "",
>             "Zsituacion": "Pedido de mercancias",
>             "Werks": "0002",
>             "Bname": "Tadeo"
>
>         }
>     ],
>     "to_series": [{
>         "Zvbeln": "",
>         "Zposnr": "000001",
>         "Zsernr": "1921"
>     },
>     {
>         "Zvbeln": "",
>         "Zposnr": "000001",
>         "Zsernr": "1922"
>     },
>     {
>         "Zvbeln": "",
>         "Zposnr": "000001",
>         "Zsernr": "1923"
>     }],
>     "to_result": {},
>     "to_return": []
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SALESORDER_SRV/A_SALES_ORDERSet?sap-client=110&sap-language=ES" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "Content-Type: application/json" \
>   -H "X-CSRF-Token: <<csrf_token>>" \
>   -d "{     \"DocType\": \"ZMER\",     \"PurchNoC\": \"ZSD_ZMER_001\",     \"PurchDate\": \"2024-11-13T15:35:00\",     \"PriceDate\": \"2024-11-13T15:35:00\",     \"SalesOrg\": \"01\",     \"DistrChan\": \"01\",     \"Division\": \"01\",     \"Name\": \"Tadeo\",     \"SalesOff\": \"0002\",     \"Pmnttrms\": \"12IA\",     \"DocDate\": \"2025-12-17T15:35:00\",     \"PurchNoS\": \"\",     \"Ref1S\": \"\",     \"Cstcndgrp1\": \"\",     \"RefDoc\": \"20001665\",     \"RefdocCat\": \"B\",         \"CustGrp2\": \"C02\",     \"Auart\": \"ZMER\",     \"Zconcepto\": \"Pedido de mercancias\",     \"Zreferencia\": \"12345678\",     \"Zobservaciones\": \"Linea de texto para un pedido de pruebas 1\",     \"Zsituacion\": \"Creación\",     \"Zsituacionfecha\": \"20240226235959\",     \"Zsituacionusuario\": \"Tadeo\",     \"Zformaenvio\": \"Manual\",     \"Zservtipoop\": \"ServicioTipoOperacion\",     \"Zcausa\": \"Causa\",     \"Zorigen\": \"Origen\",     \"Zorigenid\": \"OrigenID\",     \"Zaudat\": \"20240226103000\",     \"Zfechaconcl\": \"20240226103000\",     \"Zfechacancel\": \"20240227103000\",     \"Zfechaentreg\": \"20240228103000\",     \"Zembarqueestado\": \"EmbarqueEstado\",     \"Zformapagotp\": \"Pagado\",     \"Zafectacomision\": \"0\",     \"Zcontimpsimp\": \"1234\",     \"Zcontimpciego\": \"1234\",     \"Zcontimpcfd\": \"1234\",     \"Zformacobro\": \"ZVPE\",     \"Zredimepos\": \"1\",     \"Zcomlibera\": \"ComLibera\",     \"Zband402\": \"0\",     \"Zfechaenvcred\": \"20240226103000\",     \"Zliberado\": \"1234\",     \"Zautoriza\": \"Autorizado\",     \"Zartq\": \"1\",     \"Zidecomm\": \"\",     \"Zpagodie\": \"1\",     \"Zrepdescto\": \"12345\",     \"Zvtadimanuevo\": \"1\",     \"Zredimepuntos\": \"1\",     \"Zprerastreo\": \"0\",     \"Ztransferenstp\": \"1\",     \"Zctefinal\": \"1000000\",         \"to_items\": [         {             \"ItmNumber\": \"000001\",             \"PoItmNo\": \"10\",             \"Material\": \"CECE00095\",             \"TargetQty\": \"3\",             \"TargetQu\": \"PI\",             \"ItemCateg\": \"ZMRM\",             \"Plant\": \"0002\",                                     \"Kwert\":\"14500\",             \"Zdescrextra\":\"Linea de texto para un pedido de pruebas 1\",             \"Zpuntos\": \"12345678\",             \"Zidcopia\": \"12345\",             \"Zusudescto\": \"Tadeo\",             \"Zidcampapromo\": \"1029384756\",             \"Zpadre\": \"\",             \"Ztppromo\": \"TIP1\",             \"Zkwert3\":\"-2000\",             \"Zkwert4\":\"-1000\",             \"Zkwert5\":\"-1300\",             \"Batch\":\"0000000549\",             \"RefDoc\": \"20001665\",             \"RefDocIt\": \"10\",             \"RefDocCa\": \"B\"                     }     ],     \"to_conditions\":[         {                     \"ItmNumber\": \"000001\",             \"CondType\":\"ZPCP\",             \"CondValue\":\"12000\"         },{                     \"ItmNumber\": \"000001\",             \"CondType\":\"ZD03\",             \"CondValue\":\"-500\"         }     ],     \"to_partners\": [         {             \"PartnRole\": \"AG\",             \"PartnNumb\": \"1500006609\"         },         {             \"PartnRole\": \"Z1\",             \"PartnNumb\": \"23000125\"         },         {             \"PartnRole\": \"Z2\",             \"PartnNumb\": \"110095\"         },         {             \"PartnRole\": \"Z3\",             \"PartnNumb\": \"110099\"         },         {             \"PartnRole\": \"Z4\",             \"PartnNumb\": \"110098\"         }     ],     \"to_text\": [         {               \"ItmNumber\": \"000001\",               \"TextLine\": \"Linea de texto para un pedido de pruebas 1\"         }     ],     \"to_movbita\": [         {             \"Vbeln\": \"\",             \"Bstkd\": \"2025-12-17T23:59:59\",             \"Werks\": \"0002\",             \"Bstkd_e\": \"Tipo123456\",             \"Bname\": \"Tadeo\",             \"Ihrez_e\": \"Clave123\",             \"Zmodulo\": \"Mod12\",             \"Zeventos\": \"Pedido de mercancias\",             \"Zobsreanalisis\": \"\",             \"Ztiporespuesta\": \"\",             \"Zcitacliente\": \"1\",             \"Zcitaaval\": \"1\",             \"Zhoracita\": \"10:30:00\",             \"Zfechacita\": \"2024-11-13T23:59:59\"         }     ],     \"to_autoincr\": [         {             \"Vbeln\": \"\",             \"Posnr\": \"000001\",             \"Bstdk\": \"20240224235959\",             \"Werks\": \"0002\",             \"Bname\": \"Tadeo\",             \"Auart\": \"ZSOC\",             \"Matnr\": \"8\",             \"Kbetr\": \"15000\",             \"Zkbetr2\": \"14500\"          }     ],     \"to_movtpo\": [         {             \"Vbeln\": \"\",             \"Zmodulo\": \"VENTA\",             \"Zfechacom\": \"20240224235959\",             \"Zfechafin\": \"20240310235959\",             \"Zidstatus\": \"\",             \"Zsituacion\": \"Pedido de mercancias\",             \"Werks\": \"0002\",             \"Bname\": \"Tadeo\"          }     ],     \"to_series\": [{         \"Zvbeln\": \"\",         \"Zposnr\": \"000001\",         \"Zsernr\": \"1921\"     },     {         \"Zvbeln\": \"\",         \"Zposnr\": \"000001\",         \"Zsernr\": \"1922\"     },     {         \"Zvbeln\": \"\",         \"Zposnr\": \"000001\",         \"Zsernr\": \"1923\"     }],     \"to_result\": {},     \"to_return\": [] }"
> ```

#### gettokenCSRF
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SALESORDER_SRV/A_SALES_ORDERSet`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
> - `X-CSRF-Token`: `Fetch`
> **Query Params:**
> - `sap-client`: `110`
> - `sap-language`: `ES`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SALESORDER_SRV/A_SALES_ORDERSet?sap-client=110&sap-language=ES" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "Content-Type: application/json" \
>   -H "X-CSRF-Token: Fetch"
> ```

### 📁 BP01-BP02 creacion y actualizacion de cliente

#### BP01 nuevo cliente
- **Método:** `POST`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/BPartnerSet`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
> - `X-CSRF-Token`: `<<csrf_token>>`
> **Query Params:**
> - `sap-client`: `110`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Partner": "",
>   "Type": "",
>   "BuGroup": "CLIE",
>   "Sort1": "ABC",
>   "Sort2": "ABC",
>   "Title": "",
>   "TitleLet": "",
>   "Natpers": "X",
>   "NameOrg1": "Muebles_america",
>   "NameOrg2": "",
>   "NameOrg3": "",
>   "NameOrg4": "",
>   "NameLast": "Padrino",
>   "NameFirst": "El",
>   "NameLst2": "",
>   "NameLast2": "",
>   "Namemiddle": "",
>   "Gender": "1",
>   "Xsexm": false,
>   "Crdat": "",
>   "Crtim": "",
>   "Marst": "",
>   "Natio": "",
>   "Xblck": false,
>   "NotReleased": false,
>   "Street": "Padrinito 666",
>   "HouseNum1": "33",
>   "NameCo": "",
>   "StrSuppl1": "",
>   "StrSuppl2": "",
>   "StrSuppl3": "",
>   "Location": "",
>   "City2": "",
>   "City1": "Guadalajara",
>   "PostCode1": "44790",
>   "Country": "MX",
>   "Region": "JAL",
>   "TimeZone": "",
>   "Langu": "S",
>   "Transpzone": "",
>   "TelNumber": "6554535453",
>   "TelExtens": "",
>   "DateFrom": "20040529",
>   "DateTo": "",
>   "AddrGroup": "",
>   "PersAddr": true,
>   "Remark": "",
>   "TelnrLong": "",
>   "SmtpAddr": "",
>   "Stkzn": "X",
>   "Stcd1": "XAXX010101000",
>   "Stkzu": false,
>   "Brsch": "",
>   "Ktokd": "0110",
>   "AufsdKna1": "",
>   "LifsdKna1": "",
>   "FaksdKna1": "",
>   "Bukrs": "5510",
>   "Akont": "12120000",
>   "Zwels": "",
>   "Xverr": false,
>   "ZtermKnb1": "",
>   "Fdgrv": "",
>   "Xzver": false,
>   "Togru": "",
>   "Altkn": "1234567890",
>   "VkorgKnvv": "04",
>   "VtwegKnvv": "01",
>   "SpartKnvv": "00",
>   "Ernam": "",
>   "Erdat": "20240229",
>   "Kalks": "1",
>   "Kdgrp": "01",
>   "Bzirk": "000001",
>   "Konda": "",
>   "Pltyp": "",
>   "Awahr": "100",
>   "Inco1": "CFR",
>   "Inco2": "CFR",
>   "Antlf": "9",
>   "Lprio": "02",
>   "Eikto": "32556690",
>   "Vsbed": "",
>   "Waers": "MXN",
>   "Ktgrd": "",
>   "ZtermKnvv": "",
>   "Vwerk": "",
>   "Vkgrp": "",
>   "Vkbur": "",
>   "Kvgr1": "",
>   "AufsdKnvv": "",
>   "LifsdKnvv": "",
>   "FaksdKnvv": "",
>   "Loevm": false,
>   "Parnr": "000000100",
>   "Namev": "",
>   "Name1F": "",
>   "Sortl": "",
>   "Aland": "",
>   "Tatyp": "",
>   "Taxkd": "",
>   "VkorgKnvp": "01",
>   "VtwegKnvp": "01",
>   "SpartKnvp": "00",
>   "Parvw": "WE",
>   "Kunn2": "",
>   "Rfc": "",
>   "Banks": "",
>   "Bankl": "",
>   "Bankn": "",
>   "Bvtyp": "",
>   "Fiscalregimen": "",
>   "Usocfdi": "",
>   "Perrl": "AM",
>   "toCte": {
>     "ZclienteBp": "",
>     "ZentCalles":"",
>     "ZantigMeses": 0,
>     "ZantigAnios": 0,
>     "Zcurp": "XAXX010101000",
>     "Zcredito": "",
>     "Zprospecto": "",
>     "Zagenteserv": "",
>     "Zcreditoesp": "",
>     "Zcrmimporte": "0.00",
>     "Zcrmcantidad": "0.00",
>     "Zfecha4": "",
>     "Zusuariopos": "",
>     "ZidTipoCalles": "",
>     "ZidestatSup": "",
>     "ZrecomendPor": "",
>     "ZimporRent": "0.00",
>     "ZviveencCal": "",
>     "ZantigNeg": 0,
>     "ZpartentRec": "",
>     "ZdirRecom": "",
>     "ZserieMon": "",
>     "ZlimCred": "0.000",
>     "ZidAval": "",
>     "Zlcaxsi": "0.000",
>     "ZidMagento": 0,
>     "ZingMensCredw": "0.000",
>     "ZlimCedDimae": "0.000",
>     "ZidTipoDima": "",
>     "Zirreg": "",
>     "ZnegBc": "",
>     "ZserieMonViu": "",
>     "Znipventa": "",
>     "Znipcobro": "",
>     "ZreestrucDeud": "",
>     "ZclabeCuenta": "",
>     "ZlcaxsiMay": "0.000",
>     "ZcpaxaMay": "0.000",
>     "ZingresoTip": "",
>     "Zbanco": "",
>     "ZctaClabeValid": "",
>     "ZfolioPagMay": "",
>     "ZvalorPagMay": "0.00",
>     "ZapoyoVtaDima": 0,
>     "ZidCtaClDisp": 0,
>     "ZapoyCobr": "",
>     "ZretApoyCobr": "",
>     "ZintSolApoy": 0,
>     "ZtotalAsign": 0,
>     "ZnivEsp": "",
>     "Zcompania": "",
>     "ZcodSms": 0,
>     "ZsmsValid": "",
>     "ZfechValid": "0",
>     "ZdoctoValid": "",
>     "ZidTipoBf": "",
>     "ZviveCon": "",
>     "ZfechCateg": "0",
>     "ZusuarioIrreg": "",
>     "ZfechaIrreg": null,
>     "ZmotivoIrreg": "",
>     "ZsinBoifBf": "",
>     "ZmapLat": "0.00",
>     "ZmapLong": "0.00",
>     "ZreestDeuda": "",
>     "ZusValidTarj": "",
>     "ZidVivEnCalid": "",
>     "Zcita": "",
>     "ZnumPag": 0,
>     "ZfecUltPag": null,
>     "ZtipoCliente": ""
>   },
>   "toCteTel": {
>     "Partner": "",
>     "ZidcteTel": "",
>     "ZtipoCte": "",
>     "ZtelCte": "5520726371",
>     "Zfecha": null,
>     "ZenvioNip": false,
>     "ZvalTel": false,
>     "ZappOrig": "",
>     "ZfechaCap": "0000-00-00",
>     "ZtelExist": false,
>     "ZtraeTel": false,
>     "Zintentos": "",
>     "ZtipoValid": ""
>   },
>   "toCteCto": {
>     "Partner": "",
>     "ZidcteCto": "",
>     "ZidcteCtoTipo": "",
>     "Znombre": "",
>     "Zapellidop": "",
>     "Zapellidom": "",
>     "ZfechaNac": null,
>     "Ztel": "",
>     "Zemail": "urielValencia69@gmail.com",
>     "Ztratam": "",
>     "Zsexo": "",
>     "Zparentesco": "",
>     "ZestatusSup": "",
>     "ZviveCon": "",
>     "ZidVivEnCalid": "",
>     "ZedoCivil": "",
>     "ZcteSupervisado": false,
>     "ZtipoInter": "",
>     "ZesCasa": false,
>     "ZnumCuenta": "",
>     "Zconyuge": "",
>     "ZenviaBuroCred": false,
>     "Zrfc": "",
>     "Znacionalidad": "",
>     "ZnivelcobrEspContd": "",
>     "ZcontactSelVal": false,
>     "ZretiroFirmAval": false,
>     "Zbenef": ""
>   },
>   "toCteCtoDireccion": {
>     "Partner": "",
>     "ZidcteCto": "",
>     "ZidcteCtoTipo": "",
>     "Zdire": "",
>     "Zcolonia": "",
>     "Zpobl": "",
>     "Zestado": "",
>     "Zpais": "",
>     "ZcodPostal": "",
>     "Znumero": "",
>     "ZnumInterno": "",
>     "ZtipoCalle": "",
>     "ZantigMes": "0000",
>     "ZantigAnio": "0000",
>     "Zcruces": ""
>   },
>   "toCteCtoEmpleo": {
>     "Partner": "",
>     "ZidcteCto": "",
>     "Zempresa": "",
>     "Zfunciones": "",
>     "Zdepto": "",
>     "Zantiguedad": null,
>     "ZjefeInmed": "",
>     "ZpuestoJefInm": "",
>     "Zingresos": "0.00",
>     "ZperiodIng": "",
>     "Zcomprobabl": false,
>     "Zdire": "",
>     "Zcolonia": "",
>     "ZcodPostal": "",
>     "Zestado": "",
>     "Zcruces": "",
>     "Ztel": "",
>     "Zextens": "",
>     "ZtrabAnt": "",
>     "ZtaCp": "",
>     "ZtaColonia": "",
>     "ZantigMes": "0000",
>     "ZantigAnio": "0000",
>     "ZnumExt": "",
>     "ZnumInt": "",
>     "Zpobl": "",
>     "Zpais": "",
>     "ZtaDire": "",
>     "ZtaNumExt": "",
>     "ZtaNumInt": "",
>     "ZtaEntreCalles": "",
>     "ZtaPobl": "",
>     "ZtaEdo": "",
>     "ZtaPais": "",
>     "ZtaTel": "",
>     "ZtaExt": "",
>     "ZtipoCalle": "",
>     "ZtaTipoCalle": "",
>     "ZtipoEmpleo": ""
>   },
>   "toReturn": []
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/BPartnerSet?sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "Content-Type: application/json" \
>   -H "X-CSRF-Token: <<csrf_token>>" \
>   -d "{   \"Partner\": \"\",   \"Type\": \"\",   \"BuGroup\": \"CLIE\",   \"Sort1\": \"ABC\",   \"Sort2\": \"ABC\",   \"Title\": \"\",   \"TitleLet\": \"\",   \"Natpers\": \"X\",   \"NameOrg1\": \"Muebles_america\",   \"NameOrg2\": \"\",   \"NameOrg3\": \"\",   \"NameOrg4\": \"\",   \"NameLast\": \"Padrino\",   \"NameFirst\": \"El\",   \"NameLst2\": \"\",   \"NameLast2\": \"\",   \"Namemiddle\": \"\",   \"Gender\": \"1\",   \"Xsexm\": false,   \"Crdat\": \"\",   \"Crtim\": \"\",   \"Marst\": \"\",   \"Natio\": \"\",   \"Xblck\": false,   \"NotReleased\": false,   \"Street\": \"Padrinito 666\",   \"HouseNum1\": \"33\",   \"NameCo\": \"\",   \"StrSuppl1\": \"\",   \"StrSuppl2\": \"\",   \"StrSuppl3\": \"\",   \"Location\": \"\",   \"City2\": \"\",   \"City1\": \"Guadalajara\",   \"PostCode1\": \"44790\",   \"Country\": \"MX\",   \"Region\": \"JAL\",   \"TimeZone\": \"\",   \"Langu\": \"S\",   \"Transpzone\": \"\",   \"TelNumber\": \"6554535453\",   \"TelExtens\": \"\",   \"DateFrom\": \"20040529\",   \"DateTo\": \"\",   \"AddrGroup\": \"\",   \"PersAddr\": true,   \"Remark\": \"\",   \"TelnrLong\": \"\",   \"SmtpAddr\": \"\",   \"Stkzn\": \"X\",   \"Stcd1\": \"XAXX010101000\",   \"Stkzu\": false,   \"Brsch\": \"\",   \"Ktokd\": \"0110\",   \"AufsdKna1\": \"\",   \"LifsdKna1\": \"\",   \"FaksdKna1\": \"\",   \"Bukrs\": \"5510\",   \"Akont\": \"12120000\",   \"Zwels\": \"\",   \"Xverr\": false,   \"ZtermKnb1\": \"\",   \"Fdgrv\": \"\",   \"Xzver\": false,   \"Togru\": \"\",   \"Altkn\": \"1234567890\",   \"VkorgKnvv\": \"04\",   \"VtwegKnvv\": \"01\",   \"SpartKnvv\": \"00\",   \"Ernam\": \"\",   \"Erdat\": \"20240229\",   \"Kalks\": \"1\",   \"Kdgrp\": \"01\",   \"Bzirk\": \"000001\",   \"Konda\": \"\",   \"Pltyp\": \"\",   \"Awahr\": \"100\",   \"Inco1\": \"CFR\",   \"Inco2\": \"CFR\",   \"Antlf\": \"9\",   \"Lprio\": \"02\",   \"Eikto\": \"32556690\",   \"Vsbed\": \"\",   \"Waers\": \"MXN\",   \"Ktgrd\": \"\",   \"ZtermKnvv\": \"\",   \"Vwerk\": \"\",   \"Vkgrp\": \"\",   \"Vkbur\": \"\",   \"Kvgr1\": \"\",   \"AufsdKnvv\": \"\",   \"LifsdKnvv\": \"\",   \"FaksdKnvv\": \"\",   \"Loevm\": false,   \"Parnr\": \"000000100\",   \"Namev\": \"\",   \"Name1F\": \"\",   \"Sortl\": \"\",   \"Aland\": \"\",   \"Tatyp\": \"\",   \"Taxkd\": \"\",   \"VkorgKnvp\": \"01\",   \"VtwegKnvp\": \"01\",   \"SpartKnvp\": \"00\",   \"Parvw\": \"WE\",   \"Kunn2\": \"\",   \"Rfc\": \"\",   \"Banks\": \"\",   \"Bankl\": \"\",   \"Bankn\": \"\",   \"Bvtyp\": \"\",   \"Fiscalregimen\": \"\",   \"Usocfdi\": \"\",   \"Perrl\": \"AM\",   \"toCte\": {     \"ZclienteBp\": \"\",     \"ZentCalles\":\"\",     \"ZantigMeses\": 0,     \"ZantigAnios\": 0,     \"Zcurp\": \"XAXX010101000\",     \"Zcredito\": \"\",     \"Zprospecto\": \"\",     \"Zagenteserv\": \"\",     \"Zcreditoesp\": \"\",     \"Zcrmimporte\": \"0.00\",     \"Zcrmcantidad\": \"0.00\",     \"Zfecha4\": \"\",     \"Zusuariopos\": \"\",     \"ZidTipoCalles\": \"\",     \"ZidestatSup\": \"\",     \"ZrecomendPor\": \"\",     \"ZimporRent\": \"0.00\",     \"ZviveencCal\": \"\",     \"ZantigNeg\": 0,     \"ZpartentRec\": \"\",     \"ZdirRecom\": \"\",     \"ZserieMon\": \"\",     \"ZlimCred\": \"0.000\",     \"ZidAval\": \"\",     \"Zlcaxsi\": \"0.000\",     \"ZidMagento\": 0,     \"ZingMensCredw\": \"0.000\",     \"ZlimCedDimae\": \"0.000\",     \"ZidTipoDima\": \"\",     \"Zirreg\": \"\",     \"ZnegBc\": \"\",     \"ZserieMonViu\": \"\",     \"Znipventa\": \"\",     \"Znipcobro\": \"\",     \"ZreestrucDeud\": \"\",     \"ZclabeCuenta\": \"\",     \"ZlcaxsiMay\": \"0.000\",     \"ZcpaxaMay\": \"0.000\",     \"ZingresoTip\": \"\",     \"Zbanco\": \"\",     \"ZctaClabeValid\": \"\",     \"ZfolioPagMay\": \"\",     \"ZvalorPagMay\": \"0.00\",     \"ZapoyoVtaDima\": 0,     \"ZidCtaClDisp\": 0,     \"ZapoyCobr\": \"\",     \"ZretApoyCobr\": \"\",     \"ZintSolApoy\": 0,     \"ZtotalAsign\": 0,     \"ZnivEsp\": \"\",     \"Zcompania\": \"\",     \"ZcodSms\": 0,     \"ZsmsValid\": \"\",     \"ZfechValid\": \"0\",     \"ZdoctoValid\": \"\",     \"ZidTipoBf\": \"\",     \"ZviveCon\": \"\",     \"ZfechCateg\": \"0\",     \"ZusuarioIrreg\": \"\",     \"ZfechaIrreg\": null,     \"ZmotivoIrreg\": \"\",     \"ZsinBoifBf\": \"\",     \"ZmapLat\": \"0.00\",     \"ZmapLong\": \"0.00\",     \"ZreestDeuda\": \"\",     \"ZusValidTarj\": \"\",     \"ZidVivEnCalid\": \"\",     \"Zcita\": \"\",     \"ZnumPag\": 0,     \"ZfecUltPag\": null,     \"ZtipoCliente\": \"\"   },   \"toCteTel\": {     \"Partner\": \"\",     \"ZidcteTel\": \"\",     \"ZtipoCte\": \"\",     \"ZtelCte\": \"5520726371\",     \"Zfecha\": null,     \"ZenvioNip\": false,     \"ZvalTel\": false,     \"ZappOrig\": \"\",     \"ZfechaCap\": \"0000-00-00\",     \"ZtelExist\": false,     \"ZtraeTel\": false,     \"Zintentos\": \"\",     \"ZtipoValid\": \"\"   },   \"toCteCto\": {     \"Partner\": \"\",     \"ZidcteCto\": \"\",     \"ZidcteCtoTipo\": \"\",     \"Znombre\": \"\",     \"Zapellidop\": \"\",     \"Zapellidom\": \"\",     \"ZfechaNac\": null,     \"Ztel\": \"\",     \"Zemail\": \"urielValencia69@gmail.com\",     \"Ztratam\": \"\",     \"Zsexo\": \"\",     \"Zparentesco\": \"\",     \"ZestatusSup\": \"\",     \"ZviveCon\": \"\",     \"ZidVivEnCalid\": \"\",     \"ZedoCivil\": \"\",     \"ZcteSupervisado\": false,     \"ZtipoInter\": \"\",     \"ZesCasa\": false,     \"ZnumCuenta\": \"\",     \"Zconyuge\": \"\",     \"ZenviaBuroCred\": false,     \"Zrfc\": \"\",     \"Znacionalidad\": \"\",     \"ZnivelcobrEspContd\": \"\",     \"ZcontactSelVal\": false,     \"ZretiroFirmAval\": false,     \"Zbenef\": \"\"   },   \"toCteCtoDireccion\": {     \"Partner\": \"\",     \"ZidcteCto\": \"\",     \"ZidcteCtoTipo\": \"\",     \"Zdire\": \"\",     \"Zcolonia\": \"\",     \"Zpobl\": \"\",     \"Zestado\": \"\",     \"Zpais\": \"\",     \"ZcodPostal\": \"\",     \"Znumero\": \"\",     \"ZnumInterno\": \"\",     \"ZtipoCalle\": \"\",     \"ZantigMes\": \"0000\",     \"ZantigAnio\": \"0000\",     \"Zcruces\": \"\"   },   \"toCteCtoEmpleo\": {     \"Partner\": \"\",     \"ZidcteCto\": \"\",     \"Zempresa\": \"\",     \"Zfunciones\": \"\",     \"Zdepto\": \"\",     \"Zantiguedad\": null,     \"ZjefeInmed\": \"\",     \"ZpuestoJefInm\": \"\",     \"Zingresos\": \"0.00\",     \"ZperiodIng\": \"\",     \"Zcomprobabl\": false,     \"Zdire\": \"\",     \"Zcolonia\": \"\",     \"ZcodPostal\": \"\",     \"Zestado\": \"\",     \"Zcruces\": \"\",     \"Ztel\": \"\",     \"Zextens\": \"\",     \"ZtrabAnt\": \"\",     \"ZtaCp\": \"\",     \"ZtaColonia\": \"\",     \"ZantigMes\": \"0000\",     \"ZantigAnio\": \"0000\",     \"ZnumExt\": \"\",     \"ZnumInt\": \"\",     \"Zpobl\": \"\",     \"Zpais\": \"\",     \"ZtaDire\": \"\",     \"ZtaNumExt\": \"\",     \"ZtaNumInt\": \"\",     \"ZtaEntreCalles\": \"\",     \"ZtaPobl\": \"\",     \"ZtaEdo\": \"\",     \"ZtaPais\": \"\",     \"ZtaTel\": \"\",     \"ZtaExt\": \"\",     \"ZtipoCalle\": \"\",     \"ZtaTipoCalle\": \"\",     \"ZtipoEmpleo\": \"\"   },   \"toReturn\": [] }"
> ```

### 📁 BP05 Exposicion de datos

#### BP05 Exposicion de datos de cliente
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$filter`: `BusinessPartner  eq '1500003857'`
> - `sap-client`: `110`
> - `$format`: `json`
> - `Content-Type`: `application/json`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?%24filter=BusinessPartner++eq+%271500003857%27&sap-client=110&%24format=json&Content-Type=application%2Fjson" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### BP05 Exposicion de datos de cliente
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$filter`: `Zcompania eq 'urielVal69@gmail.com'`
> - `$top`: `1`
> - `sap-client`: `110`
> - `$format`: `json`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?%24filter=Zcompania+eq+%27urielVal69%40gmail.com%27&%24top=1&sap-client=110&%24format=json" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### BP AdressId
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('1500005553')/to_BusinessPartnerAddress`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('1500005553')/to_BusinessPartnerAddress" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### BP05 AWS Mendiola
- **Método:** `GET`
- **Endpoint:** `https://android-api.mavi.fun/AS_GET_BP_MA?Partner=1500003857`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `sap-client`: `110`
> - `$format`: `json`
> - `Content-Type`: `application/json`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://android-api.mavi.fun/AS_GET_BP_MA?Partner=1500003857&sap-client=110&%24format=json&Content-Type=application%2Fjson" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### BP05 ZAPISRV Mendiola
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='1500007539',Client='110')`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `sap-client`: `110`
> - `$format`: `json`
> - `Content-Type`: `application/json`
> - `$expand`: `to_CteTel,to_CteDomicilio,to_CteSociedad,to_CtePersonalAdr,to_CteContacto,to_CteCliente,to_CteDatosComerciales,to_Cte,to_CtePersonaContacto,to_CteDatosBancarios,to_CteFuncInterlocutor,to_CteImpuestos`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='1500007539',Client='110')?sap-client=110&%24format=json&Content-Type=application%2Fjson&%24expand=to_CteTel%2Cto_CteDomicilio%2Cto_CteSociedad%2Cto_CtePersonalAdr%2Cto_CteContacto%2Cto_CteCliente%2Cto_CteDatosComerciales%2Cto_Cte%2Cto_CtePersonaContacto%2Cto_CteDatosBancarios%2Cto_CteFuncInterlocutor%2Cto_CteImpuestos" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD36 Consulta de documentos de venta

#### SD36 Consulta de documento de venta
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_DOCVTAS_CHECK_CDS/ZAPI_DOCVTAS_CHECK?$expand=to_salesdoc_items,to_zsdt_vbak,to_zsdt_vbap&sap-client=110&$filter=PurchNoC eq 'ZSD_ZMER_38515'&$format=json`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Query Params:**
> - `$format`: `json`
> - `sap-client`: `110`
> - `$top`: ``
> - `$skip`: ``
> - `$filter`: ``
> - `$select`: ``
> - `$orderBy`: ``
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_DOCVTAS_CHECK_CDS/ZAPI_DOCVTAS_CHECK?$expand=to_salesdoc_items,to_zsdt_vbak,to_zsdt_vbap&sap-client=110&$filter=PurchNoC eq 'ZSD_ZMER_38515'&$format=json&%24format=json&sap-client=110&%24top=&%24skip=&%24filter=&%24select=&%24orderBy=" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 Codigos Postales Sepomex

#### Codigos Postales
- **Método:** `GET`
- **Endpoint:** `https://salesanddistribution-api.mavi.fun/AI_zdmt_sepomex?$filter=post_code eq '22790'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://salesanddistribution-api.mavi.fun/AI_zdmt_sepomex?$filter=post_code eq '22790'" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 Consulta STD AWS

#### STD AWS
- **Método:** `GET`
- **Endpoint:** `https://nibj6m7t0l.execute-api.us-east-1.amazonaws.com/AI_GET_CCatalogo?nombre_catalogo=FORMAPAGO`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://nibj6m7t0l.execute-api.us-east-1.amazonaws.com/AI_GET_CCatalogo?nombre_catalogo=FORMAPAGO" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD46 Anula Salida de Mercancias ligada a Entrega

#### SD46 Anula Salida de Mercancias ligada a Entrega
- **Método:** `POST`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=2/ReverseGoodsIssue`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `X-CSRF-Token`: `<<csrf_token>>`
> **Query Params:**
> - `DeliveryDocument`: `'80000581'`
> - `ActualGoodsMovementDate`: `datetime'2025-04-15T00:00:00'`
> - `sap-client`: `110`
> - `sap-langu`: `ES`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {}
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPDirect>>/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV;v=2/ReverseGoodsIssue?DeliveryDocument=%2780000581%27&ActualGoodsMovementDate=datetime%272025-04-15T00%3A00%3A00%27&sap-client=110&sap-langu=ES" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "X-CSRF-Token: <<csrf_token>>" \
>   -d "{}"
> ```

### 📁 TZ01 Splits

#### GET Cliente Parcialidades
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata4/sap/zsb_ntz01_zsplit_merc/srvd_a2x/sap/zsd_ntz01_zsplit_merc/0001/zsplits?sap-client=110&$format=json&$filter=Vbeln eq '9000006302'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata4/sap/zsb_ntz01_zsplit_merc/srvd_a2x/sap/zsd_ntz01_zsplit_merc/0001/zsplits?sap-client=110&$format=json&$filter=Vbeln eq '9000006302'" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 DATOS DE ENTREGA - Duplicate

#### 📁 GET PartnerAddress

##### GET Partner Address
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/partneraddress/partner/1500005553`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/partneraddress/partner/1500005553" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### 📁 POST Delivery address salesdoc

##### POST DeliveryDocument
- **Método:** `POST`
- **Endpoint:** `<<SAPDirect>>/partneraddress/salesdoc`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `Content-Type`: `application/json`
> - `x-csrf-token`: `<<csrf_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "SalesDocument": "9426", 
>   "PartnerNumber": "1500007416",
>   "AddressNumber": "64970",
>   "PartnerRole": "WE" 
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPDirect>>/partneraddress/salesdoc" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "Content-Type: application/json" \
>   -H "x-csrf-token: <<csrf_token>>" \
>   -d "{   \"SalesDocument\": \"9426\",    \"PartnerNumber\": \"1500007416\",   \"AddressNumber\": \"64970\",   \"PartnerRole\": \"WE\"  } "
> ```

#### 📁 GetSalesDocumentAddress

##### GET ZSRV_SALESDOC_ADDRCHANGE_SRV
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/partneraddress/salesdoc/8794/role/WE`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/partneraddress/salesdoc/8794/role/WE" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### 📁 Patch UpdatePhoneOrder

##### PATCH PhoneNumber
- **Método:** `PATCH`
- **Endpoint:** `<<SAPDirect>>/partneraddress/partner/phone?addressId=56912&person=56911&ordinalNumber=001`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `x-csrf-token`: `<<csrf_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "PhoneNumber": "3388776655",
>   "DestinationLocationCountry": "MX",
>   "IsDefaultPhoneNumber": true,
>   "PhoneNumberType": "1"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X PATCH "<<SAPDirect>>/partneraddress/partner/phone?addressId=56912&person=56911&ordinalNumber=001" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "x-csrf-token: <<csrf_token>>" \
>   -d "{   \"PhoneNumber\": \"3388776655\",   \"DestinationLocationCountry\": \"MX\",   \"IsDefaultPhoneNumber\": true,   \"PhoneNumberType\": \"1\" }"
> ```

#### 📁 Patch PartnerAddress

##### PATCH PartnerAddress
- **Método:** `PATCH`
- **Endpoint:** `<<SAPDirect>>/partneraddress/partner/1500007333/address/64586`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `x-csrf-token`: `<<csrf_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "StreetName": "JOYAS DE EGIPTO MODIFICADA",
>   "HouseNumber": "896-B",
>   "District": "GUADALAJARA CENTRO",
>   "CityName": "GUADALAJARA",
>   "PostalCode": "44400",
>   "Region": "JAL",
>   "Country": "MX"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X PATCH "<<SAPDirect>>/partneraddress/partner/1500007333/address/64586" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "x-csrf-token: <<csrf_token>>" \
>   -d "{   \"StreetName\": \"JOYAS DE EGIPTO MODIFICADA\",   \"HouseNumber\": \"896-B\",   \"District\": \"GUADALAJARA CENTRO\",   \"CityName\": \"GUADALAJARA\",   \"PostalCode\": \"44400\",   \"Region\": \"JAL\",   \"Country\": \"MX\" }"
> ```

#### 📁 Post AddressPartner

##### POST PartnerAddress
- **Método:** `POST`
- **Endpoint:** `<<SAPDirect>>/partneraddress/partner/1500007416`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!abstract]- 🛠️ Headers y Parámetros
> **Headers:**
> - `x-csrf-token`: `<<csrf_token>>`
>

> [!example]- 📦 Body (`application/json`)
> ```json
> {
>   "Country": "MX",
>   "Region": "JAL",
>   "CityName": "Guadalajara",
>   "District": "Centro",
>   "PostalCode": "44100",
>   "StreetName": "Avenida Juarez",
>   "HouseNumber": "1234",
>   "HouseNumberSupplementText": "Int 4B",
>   "StreetPrefixName": "Calle",
>   "StreetSuffixName": "Norte",
>   "AdditionalStreetSuffixName": "Entre Calle 8 y Calle 10",
>   "ValidityStartDate": "2026-07-06T00:00:00"
> }
> ```

> [!example]- 💻 cURL Generado
> ```bash
> curl -X POST "<<SAPDirect>>/partneraddress/partner/1500007416" \
>   -u "<<LogonUser>>:<<LogonPass>>" \
>   -H "x-csrf-token: <<csrf_token>>" \
>   -d "{   \"Country\": \"MX\",   \"Region\": \"JAL\",   \"CityName\": \"Guadalajara\",   \"District\": \"Centro\",   \"PostalCode\": \"44100\",   \"StreetName\": \"Avenida Juarez\",   \"HouseNumber\": \"1234\",   \"HouseNumberSupplementText\": \"Int 4B\",   \"StreetPrefixName\": \"Calle\",   \"StreetSuffixName\": \"Norte\",   \"AdditionalStreetSuffixName\": \"Entre Calle 8 y Calle 10\",   \"ValidityStartDate\": \"2026-07-06T00:00:00\" } "
> ```

#### 📁 GET METADATA

##### GET Partner Address - Duplicar
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/SAP/ZSRV_SALESDOC_ADDRCHANGE_SRV/ChangeDeliveryAddressSet('9911')?$expand=NP_SDAddressParners,NP_SDDocFlow/NP_SDBilling/NP_SdDocToLEntrega`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/SAP/ZSRV_SALESDOC_ADDRCHANGE_SRV/ChangeDeliveryAddressSet('9911')?$expand=NP_SDAddressParners,NP_SDDocFlow/NP_SDBilling/NP_SdDocToLEntrega" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

##### GET Partner Address - Duplicar - Duplicar
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/SAP/ZSRV_SALESDOC_ADDRCHANGE_SRV/SdDocLEntregaSet('9911')?$format=json`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/SAP/ZSRV_SALESDOC_ADDRCHANGE_SRV/SdDocLEntregaSet('9911')?$format=json" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SuccesFactor

#### GetSuccesFactor
- **Método:** `GET`
- **Endpoint:** `https://android-api.mavi.fun/employees/get_personalById?user_id=30001558&status=0&centro=`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://android-api.mavi.fun/employees/get_personalById?user_id=30001558&status=0&centro=" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GetSuccesFactor 2
- **Método:** `GET`
- **Endpoint:** `https://android-api.mavi.fun/employees/get_personalById?user_id=30001558&status=0&centro=`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://android-api.mavi.fun/employees/get_personalById?user_id=30001558&status=0&centro=" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD05 Get MovBita

#### SD05 Get MovBita
- **Método:** `GET`
- **Endpoint:** `https://salesanddistribution-api.mavi.fun/AI_GET_ZSDT_MOVBITA?Vbeln=9000016844`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://salesanddistribution-api.mavi.fun/AI_GET_ZSDT_MOVBITA?Vbeln=9000016844" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 GET AnexoVI ZTBC_Code_MSTR 

#### Get AnexoIV
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZQBC_CODEMSTRD_SRV/WACODEMSTRDSet?$filter=ZcodeProgram eq 'RFCAnexo2'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZQBC_CODEMSTRD_SRV/WACODEMSTRDSet?$filter=ZcodeProgram eq 'RFCAnexo2'" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 DM07 Sucursales

#### DM07 Sucursales
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SUCURSALES_SRV/SucursalesSet?$format=json&sap-client=110&$filter=Sucursal eq '0090'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SUCURSALES_SRV/SucursalesSet?$format=json&sap-client=110&$filter=Sucursal eq '0090'" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD40 Condiciones de pago

#### SD40 Condiciones de pago
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata4/sap/zsb_sd40_condpago/srvd_a2x/sap/zsd_sd40_condpago/0001/zapi_condpago?sap-client=110&sap-language=ES&$filter=Zterm eq '12IA'`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata4/sap/zsb_sd40_condpago/srvd_a2x/sap/zsd_sd40_condpago/0001/zapi_condpago?sap-client=110&sap-language=ES&$filter=Zterm eq '12IA'" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 SD52 Canal Ventas Cliente

#### GET Canal Venta Cliente  MaviFun
- **Método:** `GET`
- **Endpoint:** `https://android-api.mavi.fun/AS_GET_ZQSD_EditarCliente_CanalVenta?Cliente=1500003857`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "https://android-api.mavi.fun/AS_GET_ZQSD_EditarCliente_CanalVenta?Cliente=1500003857" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

#### GET Canal Venta cliente SAP
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SD52_PARTNER_SRV/ZSD52_PARTNER_SRVSet?$format=json&$filter=Bp eq '1200000187' &sap-client=110`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_SD52_PARTNER_SRV/ZSD52_PARTNER_SRVSet?$format=json&$filter=Bp eq '1200000187' &sap-client=110" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 Get Cobro referenciado Apiponce

#### Get ZFICRUD_COBREF_SRV/WACOBREFSet
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZFICRUD_COBREF_SRV/WACOBREFSet?$filter=Bp%20eq%20%271500004810%27`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZFICRUD_COBREF_SRV/WACOBREFSet?$filter=Bp%20eq%20%271500004810%27" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```

### 📁 Get Clabe STP Referencia Bancaria

#### GET Clabe STP
- **Método:** `GET`
- **Endpoint:** `<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CTACLBSTP_SRV/WACTACLBSTPSet?sap-client=110&$filter=Bp%20eq%20'1500000003'&$format=json`

> [!abstract]- 🔐 Autenticación
> - **Tipo:** basic
> - **Usuario:** `<<LogonUser>>`
> - **Password:** `<<LogonPass>>`
>

> [!example]- 💻 cURL Generado
> ```bash
> curl -X GET "<<SAPDirect>>/sap/opu/odata/sap/ZAPI_CTACLBSTP_SRV/WACTACLBSTPSet?sap-client=110&$filter=Bp%20eq%20'1500000003'&$format=json" \
>   -u "<<LogonUser>>:<<LogonPass>>"
> ```
