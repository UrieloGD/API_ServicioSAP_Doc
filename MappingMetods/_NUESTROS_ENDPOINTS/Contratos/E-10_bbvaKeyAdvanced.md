---
tags: [contrato, endpoint, migracion, ola-5]
partida: E-10
actualizado: 2026-08-23
---

# E-10 — `customerService/bbvaKeyAdvanced`

Pide la llave maestra de seguridad de BBVA al servicio SOAP de Multipagos.

> 🔑 **La respuesta es una credencial.** No pegarla en tickets, logs, capturas ni documentos.
> En la corrida de prueba solo se registró su longitud.

## Identidad

| | |
|---|---|
| Verbo | **GET** — un POST responde 405 |
| Ruta pública (DMZ) | `customerService/bbvaKeyAdvanced` — la DMZ la expone como `[HttpPost]` |
| Ruta en ServicioSAP | `customerService/bbvaKeyAdvanced` — `[HttpGet]` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomerServiceController.cs::GetBBVAKeyAdvanced` |
| Método | `Methods\CustomerService\CustomerServiceMethods.cs::GetBBVAKeyAdvancedAsync` |
| Origen legado | `APIMagento\Controllers\CustomerServiceController.cs:157` + `Metodos\CustomerServiceMethods.cs:1124` |
| Destino | SOAP `GetMasterSeguridad` en `MULTIPAGOS_APIKEY_URL` |

> **Es el único de la ola que no toca base de datos.** Arma un sobre SOAP con `CODIGO_ENT`
> en la cabecera `Acso` y lo manda con RestSharp. Las dos claves se portaron al `Web.config`
> desde `APIMagento\Web.config`.

## Request body

**Ninguno.**

## Response

### 200 — llave obtenida

Una cadena JSON con la llave. En la corrida del 23 ago midió **194 caracteres** y llegó en
**256 ms**.

### 200 con `"Ocurrio un error"` — el SOAP respondió algo que no es 200

Cadena literal, entregada con código **200**. El cliente tiene que inspeccionar el cuerpo
para enterarse de que falló.

### 400 — `BBVA key not found.`

Sale cuando la respuesta **contiene** la subcadena `null`. Ojo: es `response.Contains("null")`,
no una comparación. Si la llave llegara a contener esa secuencia, respondería 400 sin motivo.

### 405 — con verbo POST

La ruta es `[HttpGet]`, en paridad con la LAN.

### 500 — el XML no trae el nodo esperado

El método hace `.Descendants(ns + "GetMasterSeguridadResult").FirstOrDefault()?.Value`, que
devuelve `null` si el nodo falta. Entonces `response.Contains(...)` lanza
`NullReferenceException` y sale un 500. **No se añadió guarda**: es el comportamiento del
legado.

### 401 — sin token

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ  customerService/bbvaKeyAdvanced  ([HttpPost])
            → Curl.GetSAP("customerService/bbvaKeyAdvanced")   ← cutover 21 ago
            → ServicioSAP  ([HttpGet])
            → if (response.Contains("null")) → 400
              else → Ok(response) → cliente

La DMZ repite la misma comprobación de `"null"` que hace ServicioSAP, así que el filtro se
aplica **dos veces**. Devuelve la cadena tal cual, sin recortar comillas.

**Cutover:** ⏳ aplicado el 21 ago, **sin desplegar**.

> ✅ **Paridad de verbo recuperada.** Al escribirse la partida, el `Curl` de la DMZ solo tenía
> `PostSAP`, así que la llamada iba por POST y la ruta de ServicioSAP tuvo que declararse
> `[HttpPost]`, divergiendo del `[HttpGet]` del legado. **Dev 1 entregó `GetSAP` el 21 ago**
> (`4dabaa9`, `Curl.cs:210`), el gemelo de `PostSAP` con verbo GET y usando `TokenSAP`/`IpSAP`.
> Con eso la llamada pasó a `GetSAP` y la ruta volvió a `[HttpGet]`.

## Efectos

Ninguno sobre datos propios. **Sí golpea un servicio externo real** en `172.16.215.51:3024`
cada vez que se invoca; no hay caché.

## Pruebas ejecutadas — 23 ago 2026

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | GET con token | 200 + llave | 200, cadena de 194 caracteres en 256 ms | ✅ |
| 2 | └ no es el texto de error | no contiene `Ocurrio un error` | confirmado | ✅ |
| 3 | └ no dispara el filtro de `null` | no contiene `null` | confirmado | ✅ |
| 4 | POST | 405 | 405 | ✅ |
| 5 | Sin token | 401 | 401 | ✅ |

No se forzaron los casos de fallo del SOAP —caída del servicio, XML sin el nodo— porque
exigirían intervenir un servicio de terceros. Quedan documentados por lectura del código,
no verificados por ejecución.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola5.http`.

## Diferencias contra el legado

Ninguna en el contrato. Una sola diferencia interna: el legado usa `client.Execute`
(síncrono) y aquí se usa `client.ExecuteAsync`, por la regla de endpoints asíncronos. Misma
librería, mismo request, misma respuesta.

## Deuda heredada

- **Un fallo del SOAP sale con código 200** y la cadena `"Ocurrio un error"` en el cuerpo.
  Quien consuma sin inspeccionar el texto dará el error por éxito.
- **La comprobación de `null` es de subcadena**, no de valor.
- **Sin guarda contra el nodo ausente**: se convierte en un 500 por NullReferenceException.
- **El filtro de `null` está duplicado** en la DMZ y en ServicioSAP.
- **`CODIGO_ENT` viaja en claro** dentro del sobre SOAP, sobre HTTP sin TLS
  (`http://172.16.215.51:3024`). Es red interna, pero conviene tenerlo anotado.
