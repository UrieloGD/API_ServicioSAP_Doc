# Flujo de `getApiKey()`: de Magento al WS de Intelisis

Recorrido completo de **una sola llamada** a
`Mavi\MultipagosAvanzado\Model\MultipagosManagement::getApiKey()`, desde el módulo de Magento
hasta el web service SOAP que custodia la llave, y de regreso.

**Archivos que intervienen**

| Capa | Archivo | Miembro |
|---|---|---|
| Magento (módulo) | `app/code/Mavi/MultipagosAvanzado/Model/MultipagosManagement.php` | `getApiKey()`, `getApiKeyUrl()`, `getPhrase()`, `getVi()`, `sendPostRequest()` |
| Magento (config) | `app/code/Omnipro/MaviCredito/Helper/Data.php` | `getConfigValue()` |
| Magento (HTTP) | `app/code/Omnipro/IntelisisIntegration/Model/Adapter.php` | `post()`, `getToken()` |
| Magento (credenciales) | `app/code/Omnipro/IntelisisIntegration/Helper/Data.php` | `getUser()`, `getPass()`, `getEndpointToken()` |
| DMZ | `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs` | `GetBBVAKeyAdvanced()` |
| DMZ | `APIMagentoDMZ/WebApiMagento/Helper/Curl.cs` | constructor, `Get()` |
| DMZ | `APIMagentoDMZ/WebApiMagento/Controllers/TokenValidationHandler.cs` | `SendAsync()` |
| LAN | `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs` | `GetBBVAKeyAdvanced()` |
| LAN | `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs` | `GetBBVAKeyAdvanced()` |

> Los valores de los ejemplos son **inventados**; la estructura y los nombres de campo salen del
> código. No hay credenciales reales en este documento.

---

## 1. Resumen en una línea

`getApiKey()` **no genera** ninguna llave: pide a Intelisis, a través de dos APIs encadenadas y un
web service SOAP, un blob cifrado, y lo descifra localmente con AES-256-CBC usando una frase y un
vector de inicialización guardados en la configuración de Magento.

---

## 2. Diagrama de la llamada

```mermaid
sequenceDiagram
    autonumber
    participant MP as MultipagosManagement<br/>(Magento)
    participant AD as Adapter<br/>(Omnipro\IntelisisIntegration)
    participant D as APIMagentoDMZ
    participant CU as Curl.cs<br/>(DMZ)
    participant L as APIMagento (LAN)
    participant W as WSeCommerceMX<br/>(SOAP)

    MP->>MP: getApiKeyUrl() / getPhrase() / getVi()<br/>(scopeConfig)
    MP->>AD: post($url, "[]")
    AD->>D: POST login/authenticate<br/>{"Username","Password"}
    D-->>AD: "<jwt>" (string JSON)
    AD->>D: POST customerService/bbvaKeyAdvanced<br/>Authorization: Bearer <jwt><br/>body: []
    Note over D: TokenValidationHandler valida el JWT
    D->>CU: new Curl()
    CU->>L: POST login/authenticate (USER_INTELISIS)
    L-->>CU: "<jwt LAN>"
    D->>L: GET customerService/bbvaKeyAdvanced<br/>Authorization: <jwt LAN>
    L->>W: POST SOAP GetMasterSeguridad<br/>(codigoent = CODIGO_ENT)
    W-->>L: <GetMasterSeguridadResult>base64</...>
    L-->>D: 200 "base64"
    D-->>AD: 200 "\"base64\""
    AD-->>MP: ["status"=>200, "body"=>"\"base64\""]
    MP->>MP: str_replace → base64_decode → openssl_decrypt
    MP-->>MP: API key en claro
```

Cuatro saltos de red por cada invocación: token DMZ, llamada DMZ, token LAN (implícito en el
constructor de `Curl`), llamada LAN, más el SOAP. **No hay caché en ningún nivel.**

---

## 3. Paso 1 — Magento lee su configuración

```php
public function getApiKey(): string
{
    try {
        $url    = $this->getApiKeyUrl();                    // multipagos_advanced/general/url_get_api_key
        $phrase = base64_decode($this->getPhrase(), true);  // multipagos_advanced/general/phrase_apikey
        $IV     = base64_decode($this->getVi(), true);      // multipagos_advanced/general/vi_apikey
        ...
```

Los tres valores se resuelven por `getMultipagosConfig()` → `Omnipro\MaviCredito\Helper\Data::getConfigValue()`
→ `scopeConfig->getValue($path, ScopeInterface::SCOPE_STORE, $storeId)`. Se llaman **sin `$storeId`**,
así que aplican al store en curso; como los tres campos están declarados sólo con `showInDefault="1"`
en [`etc/adminhtml/system.xml`](../etc/adminhtml/system.xml), en la práctica son globales.

| Path | Campo en admin | Tipo | Uso |
|---|---|---|---|
| `multipagos_advanced/general/url_get_api_key` | *URL api key* | text | endpoint de la DMZ |
| `multipagos_advanced/general/phrase_apikey` | *Frase apikey* | password | llave AES-256 (32 bytes tras decodificar) |
| `multipagos_advanced/general/vi_apikey` | *Vector de inicializacion* | password | IV de CBC (16 bytes tras decodificar) |

Ambos secretos se almacenan **en base64** en `core_config_data`. Los campos son `type="password"`
pero **no tienen `<backend_model>` de `Magento\Config\Model\Config\Backend\Encrypted`**: se guardan
en texto plano, sólo enmascarados en la UI del admin.

En este punto no hay validación: si el path está vacío, `$url` es `""` y el `curl` posterior fallará.

---

## 4. Paso 2 — Magento se autentica contra la DMZ

`getApiKey()` llama a `sendPostRequest($url, [])`, que hace `json_encode([])` → `"[]"` y delega en
`Omnipro\IntelisisIntegration\Model\Adapter::post()`. Lo primero que hace `post()` es pedir token:

```php
private function getToken(bool $fromTablerate = false) {
    $body['Username'] = $this->configData->getUser();   // omnipro_intelisisintegration/general/user
    $body['Password'] = $this->configData->getPass();   // omnipro_intelisisintegration/general/pass
    $endpoint         = $this->configData->getEndpointToken(); // .../general/endpoint_token
    ...
}
```

A diferencia de los secretos de Multipagos, **estos sí van cifrados**: `getUser()` y `getPass()`
pasan por `EncryptorInterface::decrypt()`.

**Request**

```http
POST https://<dmz>/login/authenticate
Content-Type: application/json

{"Username":"magento_svc","Password":"********"}
```

**Respuesta 200** — un string JSON, es decir el JWT **entre comillas**:

```json
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6Im1hZ2VudG9fc3ZjIiwibmJmIjoxNzcwODAwMDAwLCJleHAiOjE3NzA4MDM2MDB9.FIRMA"
```

Por eso el adapter recorta el primer y último carácter:

```php
return substr($this->curl->getBody(), 1, strlen($this->curl->getBody()) - 2);
```

**Del lado DMZ** (`LoginController.Authenticate`) la validación no es contra base de datos: compara
`username` y `password` contra hashes con salt del `Web.config` (`USER_HASH`/`USER_SALT`,
`PASS_HASH`/`PASS_SALT`) vía `HashService.VerifyPassword`. Si no coinciden → `401 Unauthorized`.

El JWT lo emite `TokenGenerator.GenerateTokenJwt`: HMAC-SHA256 con `JWT_SECRET_KEY`, audiencia
`JWT_AUDIENCE_TOKEN`, emisor `JWT_ISSUER_TOKEN` y vigencia `JWT_EXPIRE_MINUTES`.

**Si el token falla**, `getToken()` devuelve `false`, `post()` devuelve `false` (no lanza), y
`sendPostRequest()` propaga ese `false` a `getApiKey()`, que revienta al evaluar
`$response["status"]` sobre un booleano. Ver §9.

---

## 5. Paso 3 — Magento llama a la DMZ

```http
POST https://<dmz>/customerService/bbvaKeyAdvanced
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Length: 2

[]
```

El body es un array JSON vacío. El endpoint lo ignora por completo: la firma del método en el
controller no recibe parámetros.

`TokenValidationHandler` (registrado como `DelegatingHandler`) valida el JWT antes de que corra el
controller, con `ValidateLifetime = true` y `ValidateIssuerSigningKey = true`:

| Situación | Respuesta |
|---|---|
| Sin header `Authorization` o con más de uno | deja pasar sin principal → el `[Authorize]` responde `401` |
| Token inválido o expirado (`SecurityTokenValidationException`) | `401` |
| Cualquier otra excepción | `500` |

**Controller de la DMZ** ([`CustomerServiceController.cs:265`]):

```csharp
[HttpPost]
[Route("bbvaKeyAdvanced")]
public IHttpActionResult GetBBVAKeyAdvanced()
{
    Curl curl = new Curl();
    string response = curl.Get("customerService/bbvaKeyAdvanced");
    if (response.Contains("null")) return BadRequest("BBVA key not found.");
    return Ok(response);
}
```

Dos detalles del contrato que conviene tener presentes:

- **La DMZ expone POST pero consume la LAN por GET.** Es el único endpoint de Multipagos con esa
  asimetría.
- El chequeo de error es `response.Contains("null")` sobre el string completo. Una llave cifrada
  que casualmente contenga la subcadena `null` en su base64 se reportaría como
  `400 "BBVA key not found."`.

---

## 6. Paso 4 — La DMZ se autentica y llama a la LAN

El **constructor** de `WebApiMagento.Helper.Curl` es quien obtiene el token de la LAN, así que
ocurre en cada `new Curl()` — una vez por request:

```csharp
public Curl()
{
    EnableTrustedHosts();                       // TLS 1.2 + certificados sólo de DOMINIO_LAN / DOMINIO_SAP
    using (var webClient = new WebClientCustom())
    {
        webClient.Headers.Add("Content-Type", "application/json");
        webClient.Timeout = 9999999;            // ~2.7 horas
        Token = webClient.UploadString(Ip + "login/authenticate", "POST", user);  // user = USER_INTELISIS
    }
    // ... acto seguido hace lo mismo contra URL_SAP con USER_SAP (TokenSAP)
}
```

Notas del comportamiento real:

- `user` (`USER_INTELISIS`) ya es el JSON completo de credenciales guardado en el `Web.config`; se
  manda tal cual como body.
- El constructor **también** se autentica contra `URL_SAP` con `USER_SAP`, y si ese login falla
  lanza excepción. Es decir: **`bbvaKeyAdvanced` puede fallar por una caída del login de SAP aunque
  no use SAP para nada.**
- `EnableTrustedHosts()` acepta certificados con errores de validación siempre que el host esté en
  `DOMINIO_LAN` o `DOMINIO_SAP`.

**Llamada a la LAN**

```http
GET https://<lan>/customerService/bbvaKeyAdvanced
Content-Type: application/json
Authorization: eyJhbGciOiJIUzI1NiIs...
```

`Curl.Get()` manda el token con `Token.Trim('"')` y **sin** el prefijo `Bearer` — el
`TokenValidationHandler` de la LAN lo acepta porque sólo recorta `"Bearer "` cuando está presente.

`Curl.Get()` atrapa cualquier excepción y **devuelve `e.ToString()` como si fuera el body**. La DMZ
entonces responde `200 OK` con el texto de la excepción .NET adentro. Ver §9.

---

## 7. Paso 5 — La LAN consulta el web service SOAP

Controller de la LAN ([`CustomerServiceController.cs:157`]), aquí sí `[HttpGet]`:

```csharp
[HttpGet]
[Route("bbvaKeyAdvanced")]
public IHttpActionResult GetBBVAKeyAdvanced()
{
    string response = CustomerServiceMethods.GetBBVAKeyAdvanced();
    if (response.Contains("null")) return BadRequest("BBVA key not found.");
    return Ok(response);
}
```

`CustomerServiceMethods.GetBBVAKeyAdvanced()` **no toca SQL Server**: es el único método de
Multipagos que va contra un web service SOAP, con RestSharp 105.2.3.

```csharp
private static readonly string APIKEY_URL = ConfigurationManager.AppSettings["MULTIPAGOS_APIKEY_URL"];
private static readonly string CODIGO_ENT = ConfigurationManager.AppSettings["CODIGO_ENT"];
```

**Sobre SOAP enviado**

```http
POST <MULTIPAGOS_APIKEY_URL>
Content-Type: text/xml; charset=utf-8
SOAPAction: "http://WSeCommerceMX.asmx/GetMasterSeguridad"
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <Acso xmlns="http://WSeCommerceMX.asmx/">
      <codigoent>MA01</codigoent>
    </Acso>
  </soap:Header>
  <soap:Body>
    <GetMasterSeguridad xmlns="http://WSeCommerceMX.asmx/" />
  </soap:Body>
</soap:Envelope>
```

`codigoent` es la entidad/empresa de Intelisis y viene de `CODIGO_ENT`. Es el único dato de entrada
de todo el flujo: **la llave no depende del cliente, del monto ni de la tienda**.

**Respuesta SOAP esperada**

```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetMasterSeguridadResponse xmlns="http://WSeCommerceMX.asmx/">
      <GetMasterSeguridadResult>k3JmQnR5c2VjcmV0b2NpZnJhZG9lamVtcGxvMTIzNA==</GetMasterSeguridadResult>
    </GetMasterSeguridadResponse>
  </soap:Body>
</soap:Envelope>
```

El método parsea con `XDocument` y extrae el primer `GetMasterSeguridadResult` del namespace
`http://WSeCommerceMX.asmx/`.

**Salidas del método**

| Situación | Devuelve |
|---|---|
| SOAP responde 200 con resultado | el base64 de la llave cifrada |
| SOAP responde ≠ 200 | el literal `"Ocurrio un error"` — con HTTP **200** hacia la DMZ |
| Elemento ausente en el XML | `null` → el controller responde `400 "BBVA key not found."` |
| Excepción (red, parseo) | loguea en `C:\inetpub\wwwroot\log\customerService.log` y relanza → `500` |

---

## 8. Paso 6 — Vuelta y descifrado en Magento

Cada capa serializa el string una vez más, así que lo que llega a PHP viene con comillas escapadas:

| Capa | Valor |
|---|---|
| LAN devuelve | `k3JmQnR5c2VjcmV0b2NpZnJhZG9lamVtcGxvMTIzNA==` |
| DMZ (`Ok(response)`, Web API lo serializa como JSON) | `"k3JmQnR5..."` |
| Body que ve Magento | `"\"k3JmQnR5...\""` (según cómo lo re-serialice cada salto) |

Por eso el método limpia a mano antes de decodificar:

```php
$result = str_replace('"\"', '', $response["body"]);
$result = str_replace('\""', '', $result);
$apikey = base64_decode($result, true);
return openssl_decrypt($apikey, 'AES-256-CBC', $phrase, OPENSSL_RAW_DATA, $IV);
```

`$response` es lo que devuelve `Adapter::post()`:

```php
['status' => 200, 'body' => '"\"k3JmQnR5c2VjcmV0b2NpZnJhZG9lamVtcGxvMTIzNA==\""']
```

Si `status != 200`, lanza `Exception("Ocurrio un error al obtener el API Key")` antes de intentar
nada más.

**Parámetros del descifrado**

| Parámetro | Origen | Restricción |
|---|---|---|
| algoritmo | fijo | `AES-256-CBC` |
| llave | `base64_decode(phrase_apikey)` | debe dar exactamente **32 bytes** |
| IV | `base64_decode(vi_apikey)` | debe dar exactamente **16 bytes** |
| flags | fijo | `OPENSSL_RAW_DATA` (el ciphertext ya viene crudo tras el `base64_decode`) |

El resultado es la API key en claro, un string que nunca se persiste en Magento.

Ejemplo de valor devuelto (inventado):

```
7f3c9b1a5d2e48f6a0c7b4e19d83f5620ab7cd41
```

---

## 9. Modos de falla, capa por capa

| # | Dónde | Qué pasa | Cómo se manifiesta |
|---|---|---|---|
| 1 | Magento config | `url_get_api_key` vacío | cURL falla, `post()` lanza → `sendPostRequest` devuelve `["status"=>400,"body"=>msg]` → `Exception("Ocurrio un error al obtener el API Key")` |
| 2 | Magento → DMZ | credenciales malas / `endpoint_token` vacío | `getToken()` = `false`, `post()` = `false`; `getApiKey()` hace `$response["status"]` sobre un `false` → error PHP, no el mensaje de negocio |
| 3 | DMZ | JWT expirado o inválido | `401`; Magento lanza `Exception("Ocurrio un error al obtener el API Key")` |
| 4 | DMZ → LAN | login SAP del constructor de `Curl` caído | excepción en `new Curl()` → `500`, aunque el flujo no use SAP |
| 5 | DMZ → LAN | red caída | `Curl.Get()` devuelve el texto de la excepción **con HTTP 200**; el `Contains("null")` no lo detecta y Magento intenta descifrarlo → `openssl_decrypt` = `false` → `""` |
| 6 | LAN → SOAP | WS responde ≠ 200 | la LAN devuelve `"Ocurrio un error"` con HTTP 200 → mismo camino que el punto 5: llave vacía |
| 7 | LAN → SOAP | excepción de red o parseo | `500` → Magento lanza la excepción de negocio |
| 8 | Magento | `phrase_apikey` o `vi_apikey` mal configurados (tamaño incorrecto) | `openssl_decrypt` devuelve `false`, que sin `strict_types` se convierte en `""` |

El patrón importante: **los puntos 5 y 6 no producen error, producen una API key vacía.** El
manejo está delegado a los llamadores, que sí lo verifican:

```php
// sendPaymentRequest()
if (empty($apiKey)) throw new \Exception("Decrypt error");

// updateStatusPayment()
if (empty($apiKey)) throw new WebapiException(__("Decrypt error"), httpCode: 403);
```

**Rastros para diagnosticar**

| Log | Ruta |
|---|---|
| Magento (módulo) | `var/log/paymentbbva.log` (`Mavi\MultipagosAvanzado\Logger\Handler`) |
| DMZ | log de `PaymentBBVA` (sólo en los endpoints de ApplyPayment, **no** en `bbvaKeyAdvanced`) |
| LAN | `C:\inetpub\wwwroot\log\customerService.log` |

`getApiKey()` no escribe ninguna línea de log propia: si falla, el único rastro en Magento es la
excepción que propague el llamador.

---

## 10. Quién dispara este flujo

`getApiKey()` se invoca desde dos lugares, ambos en `MultipagosManagement`, y **en cada operación**
(no hay memoización ni caché de Magento):

| Llamador | Línea | Qué hace con la llave |
|---|---|---|
| `sendPaymentRequest()` (dentro de `applyPayment`) | [`:236`](../Model/MultipagosManagement.php#L236) | `hash_hmac('sha256', $reference . $reference . $formatedAmount, $apiKey)` → `mp_signature` que se manda a BBVA (en mayúsculas). Además la devuelve al front dentro de `BodyInterface::getApiKey()` |
| `updateStatusPayment()` (callback de BBVA) | [`:709`](../Model/MultipagosManagement.php#L709) | recalcula `hash_hmac('sha256', $mp_order . $mp_reference . $formatedAmount . $mp_authorization, $apiKey)` y lo compara contra `mp_signature`; si difiere → `403 Signature error` |

Nótese que **la cadena firmada es distinta en cada caso**: al crear el pago se firma
`referencia + referencia + monto`; al confirmarlo, `order + referencia + monto + autorización`.

También conviene tener presente que la llave descifrada **sale hacia el front**: `applyPayment`
devuelve `{"url_api", "api_key", "body":{...}}` y `api_key` es la llave en claro.

---

## 11. Observaciones para la migración

Cosas que este flujo hace hoy y que hay que replicar o decidir explícitamente al portarlo:

1. **Cinco llamadas de red para obtener un valor que casi nunca cambia.** Es el candidato más
   evidente a caché (con TTL o invalidación manual desde el admin).
2. **`phrase_apikey` y `vi_apikey` sin `backend_model` Encrypted** — quedan en claro en
   `core_config_data`. Cambiarlo obliga a re-capturar los valores en el admin.
3. **El constructor de `Curl` de la DMZ acopla este flujo al login de SAP.** Al migrar, ese
   acoplamiento no debería heredarse.
4. **Errores que viajan como HTTP 200 con texto** (`"Ocurrio un error"`, `e.ToString()`). Cualquier
   reimplementación debería distinguir "llave" de "mensaje de error"; hoy sólo se distingue por
   accidente, al fallar el descifrado.
5. **`Contains("null")` como detector de error** en ambos controllers: es una comprobación por
   subcadena sobre el payload completo.
6. **La entrada del SOAP es sólo `codigoent`.** Si el equivalente en SAP requiere más contexto
   (tienda, entidad, ambiente), es un cambio de contrato, no una traducción directa.
