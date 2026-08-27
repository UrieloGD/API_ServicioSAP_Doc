---
tags: [contrato, endpoint, migracion, ola-6]
partida: E-13
actualizado: 2026-08-26
---

# E-13 — `customer/cashCustomerReport`

Recibe un reporte de clientes de contado en Base64, lo escribe en disco y lo deposita en el
share desde el que lo recoge el proceso de WhatsApp.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `customer/cashCustomerReport` |
| Ruta en ServicioSAP | `customer/cashCustomerReport` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomersController.cs::CreateCashReport` |
| Método | `Methods\Customer\CashReportMethods.cs::CreateCashReportAsync` |
| Origen legado | `APIMagento\Controllers\CustomersController.cs:107` + `Metodos\CustomerMethods.cs:194` |
| Destino | Disco local + SMB, impersonando (H-02) |

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fileName` | string | sí | Nombre con el que se guarda, en local y en el share |
| `fileContent` | string | sí | El archivo completo en Base64 |

```json
{
  "fileName": "OLA6_PRUEBA.csv",
  "fileContent": "Y3VlbnRhLG5vbWJyZQoxNTAwMDA3NTM5LFBSVUVCQSBPTEE2Cg=="
}
```

## Response

> ⚠️ **Siempre responde HTTP 200.** El resultado real viaja en el campo `status` del cuerpo,
> que **no es el código HTTP**. Es el comportamiento del legado y se conservó.

### `status` 200 — reporte depositado

```json
{ "status": 200, "message": "Se ha generado la descarga del Reporte." }
```

### `status` 400 — validación de entrada

```json
{ "status": 400, "message": "Petición incorrecta, verifica los campos." }
```

Sale si falta `fileName`, falta `fileContent`, o el body es nulo. Los tres casos comparten
mensaje, así que el cliente no sabe cuál falló.

### `status` 500 — cualquier excepción

```json
{ "status": 500, "message": "Error al crear el reporte: LogonUser failed with error code: 1326" }
```

El mensaje de la excepción se concatena al texto, así que detalles internos llegan al
cliente.

### 401 — sin token

Éste sí es un código HTTP de verdad: lo emite el filtro de autorización antes de entrar al
método.

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ  customer/cashCustomerReport  (CustomersController.cs:114)
            → if (request == null) → 400
            → Curl.PostSAP(...).Trim('"')   ← cutover 25 ago
            → ServicioSAP
            → si la respuesta contiene "Internal Server Error" → 400
            → JsonConvert.DeserializeObject<ApiResponse>(response) → Ok(apiResponse)

La DMZ **deserializa a `ApiResponse` y reenvía el objeto**, así que el cliente recibe el
`{status, message}` como objeto, no como cadena.

**Cutover:** ⏳ aplicado el 25 ago, commiteado y subido el 26 ago (`e403065` en `dbAndroid`),
**sin desplegar**.

> 🔴 **Orden de despliegue: ServicioSAP primero, la DMZ después.** El constructor de `Curl`
> en la DMZ autentica contra la LAN de forma incondicional y fuera de un `try`, así que esta
> ruta sigue dependiendo de que APIMagento responda aunque ya no le manden los datos. Si la
> DMZ sale antes, la petición falla en el constructor sin llegar a ServicioSAP. Aplica a
> todas las rutas migradas, no solo a ésta.

## Efectos

**Escribe un archivo en disco y lo copia a un share.** Dos pasos, en este orden:

1. Escribe en `CASH_REPORT_LOCAL_PATH` — hoy `C:\inetpub\wwwroot\sap\files\`. La carpeta se
   crea si no existe.
2. **Impersona** la cuenta de servicio (H-02) y copia a `CASH_REPORT_SHARE_PATH`, hoy
   `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\`, sobrescribiendo si ya existe.

> La ruta del share lleva **`STAGE`** literal, heredado del legado. Conviene confirmarlo antes
> de desplegar a producción.

> **Decisión del 25-ago:** la carpeta local es la de ServicioSAP, no la del legado
> (`C:\inetpub\wwwroot\files\`), siguiendo el mismo criterio que con `data.db` y las imágenes
> de crédito. Ambas rutas son configurables.

## Pruebas ejecutadas — 25 ago 2026

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Lote válido | `status` 200 | `status` **500**, `LogonUser failed with error code: 1326` | 🔶 |
| 2 | Sin `fileName` | `status` 400 | `status` 400 | ✅ |
| 3 | Sin `fileContent` | `status` 400 | `status` 400 | ✅ |
| 4 | Body nulo | `status` 400 | `status` 400 | ✅ |
| 5 | Sin token | 401 | 401 | ✅ |

**La primera mitad del caso 1 sí funcionó:** el archivo se escribió en local con su contenido
correcto —37 bytes, verificado leyéndolo de vuelta— y el fallo ocurre exactamente al
impersonar.

> 🔴 **La copia al share no es verificable desde desarrollo.** Depende de H-02, cuya cuenta de
> servicio no existe en el dominio, y el legado falla igual con las mismas credenciales. No es
> una regresión: es que este entorno no puede ejercitar ese paso. Se valida en QA.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola6.http`.

## Diferencias contra el legado

Ninguna en el contrato. Un añadido que no cambia ninguna respuesta: el error queda registrado
en `sap.log`, donde el legado solo lo devolvía en el cuerpo.

## Deuda heredada

- **El código HTTP siempre es 200.** Un fallo total del depósito llega como respuesta
  exitosa, y hay que leer `status` para enterarse.
- **Los tres casos de validación comparten mensaje**, así que no se distingue qué campo faltó.
- **El mensaje de la excepción se expone al cliente**, incluidos detalles de infraestructura
  como el código de error de `LogonUser`.
- **El archivo local se escribe aunque la copia falle**, y nadie lo limpia: cada intento
  fallido deja un residuo.
