---
tags: [contrato, endpoint, migracion, ola-4]
partida: E-08
actualizado: 2026-08-20
---

# E-08 — `credit/SaveImagesProductosMx`

Guarda el lote de imágenes de un expediente de crédito: las de INE en disco, y la selfie en
disco **y** en `MAVI_DOC_CTE`.

> ## ⚠️ Responde antes de trabajar
>
> Devuelve **200 con `true` en menos de 200 ms** y hace el trabajo **10 segundos después**,
> en un `Task` suelto. El `true` no dice nada sobre si las imágenes se guardaron: sale igual
> si todo funciona, si la carpeta no existe o si la base rechaza la fila.
>
> Medido en la corrida: **179 ms** de respuesta, archivos en disco ~10 s más tarde.
>
> Si el app pool recicla durante esa ventana, el lote se pierde sin rastro. Es el
> comportamiento del legado (`APIMagento\Metodos\CreditMethods.cs:973-986`) y se conserva.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `credit/SaveImagesProductosMx` |
| Ruta en ServicioSAP | `credit/SaveImagesProductosMx` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CreditController.cs::SaveImagesProductosMx` |
| Método | `Methods\Credit\DocumentMethods.cs::SaveImagesProductosMx` |
| Origen legado | `APIMagento\Controllers\CreditController.cs:271` + `Metodos\CreditMethods.cs:971` |
| Almacén | Disco (`IMAGES_CREDIT_PATH`) + `AdminDoc.dbo.MAVI_DOC_CTE` |

> **No usa impersonación.** El legado escribe en una ruta **local** del servidor, no en un
> share SMB. El comentario de `Helpers\Impersonation\Impersonation.cs` que daba a E-08 por
> dependiente de H-02 estaba equivocado y se corrigió el 20-ago.

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `Account` | string | sí | Cuenta del cliente. Va **directo a `CLAVE`**, sin la lógica de ramas de E-07 |
| `Ine` | array | sí | Imágenes del INE. Se numeran desde 1 |
| `Selfie` | objeto | sí | Se fuerza a `jpg`. Es la única que además se guarda en base |
| `PruebaDeVida` | array | no | **Se ignora por completo.** No genera archivo ni fila |

Cada imagen: `{ "Name": "...", "Data": "<base64>", "Mime": "..." }`

```json
{
  "Account": "1500007539",
  "Ine": [
    { "Name": "ola4_ine_frente",  "Data": "iVBORw0K...", "Mime": "png"  },
    { "Name": "ola4_ine_reverso", "Data": "iVBORw0K...", "Mime": "jpeg" }
  ],
  "Selfie": { "Name": "ola4_selfie", "Data": "iVBORw0K...", "Mime": "png" },
  "PruebaDeVida": [ { "Name": "ola4_vida", "Data": "iVBORw0K...", "Mime": "png" } ]
}
```

`Ine` y `Selfie` **no se validan**: si llegan nulos, el `Task` revienta por dentro y aborta
el resto del lote — pero el cliente ya recibió su `true`. Con `Ine` nulo no se guarda nada,
ni siquiera la selfie, porque el recorrido va primero.

## Response

### 200 — siempre que el request no sea nulo

```
true
```

Un booleano JSON. **No significa que las imágenes se guardaran.**

### 200 con `"false"` — excepción en el controlador

Un **string**, no un booleano: el legado hace `Ok(JsonConvert.SerializeObject(false))`
(`CreditController.cs:282`). Asimetría heredada — el caso bueno devuelve el booleano `true`
y el malo el string `"false"`. En la práctica casi inalcanzable, porque el método atrapa sus
propias excepciones.

### 400 — body nulo

```json
{ "Message": "Datos incompletos." }
```

Guardián propio: replica el 400 que la DMZ ya devuelve
(`APIMagentoDMZ\Controllers\CreditController.cs:215`). **El legado de la LAN no valida**: con
un null devolvería `200 true` y reventaría dentro del `Task`. Como la DMZ corta antes, hacia
el cliente el sistema completo ya respondía 400.

### 401 — sin token

## Qué escribe, y cómo se llaman los archivos

Los archivos van a la carpeta de `IMAGES_CREDIT_PATH`, que se crea si no existe. El nombre
es `{Name}_{index}.{Mime}`, con `index` empezando en 1 y la selfie al final.

El mime se normaliza con un parche del legado —comentado allá como *"a little shy patch for
productosMx"*—: cualquier valor que no sea exactamente `"jpeg"` pasa a `"jpg"`. La selfie se
fuerza a `jpg` siempre.

Resultado observado con el ejemplo de arriba:

| Archivo | De dónde sale |
|---|---|
| `ola4_ine_frente_1.jpg` | `Ine[0]`, mime `png` → `jpg` |
| `ola4_ine_reverso_2.jpeg` | `Ine[1]`, mime `jpeg` → se conserva |
| `ola4_selfie_3.jpg` | `Selfie`, forzada a `jpg`, índice = nº de INE + 1 |

`PruebaDeVida` no produjo ningún archivo, confirmando que se ignora.

Todas las imágenes se recomprimen antes de guardarse: JPEG bajando la calidad de 90 en
saltos de 10 hasta que el resultado pesa menos de **1 MB**, o hasta llegar a calidad 20. Si
ni con 20 baja del límite, se guarda igual.

### La fila de la selfie

Solo la selfie llega a `MAVI_DOC_CTE`, con los valores fijos del legado:

| Columna | Valor |
|---|---|
| `TIPO_DOC` | `'14'` |
| `CLAVE` | `Account` |
| `DIR` | `NULL` |
| `ESTATUS` | `1` |
| `IDAPLICACION` | **`7`** — distinto del 24 que usa E-07 |
| `FORMATO` | `'IMG'` |
| `UsuarioCarga` | no se informa |

Aquí no hay lógica de ramas: la cuenta va siempre a `CLAVE`, que es justo lo que espera
`SpMaviConsultaDoc`.

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ  credit/SaveImagesProductosMx  (CreditController.cs:211)
            → Logger.Credit vuelca el request COMPLETO al log, imágenes incluidas
            → if (request == null) → 400
            → Curl.PostSAP(...).Trim('"')   ← cutover 20 ago
            → ServicioSAP
            → Ok(response) → cliente

La DMZ aplica `.Trim('"')` y devuelve `Ok(string)`: el cliente recibe **el string `"true"`**,
no el booleano.

> ⚠️ La DMZ registra el request entero con `JsonConvert.SerializeObject(request)` **antes** de
> reenviarlo. Eso escribe las imágenes en Base64 completas en su log en cada llamada.

**Cutover:** ⏳ aplicado y commiteado el 20 ago (`d933e44`, `CreditController.cs:221`).
**Sin desplegar**: en producción el tráfico sigue yendo al legado.

## Efectos

**Escribe archivos en disco y una fila en `AdminDoc.dbo.MAVI_DOC_CTE`.** Ambos efectos
ocurren ~10 s después de responder.

**Ruta de los archivos — decisión del 20-ago-2026.** El legado usa
`C:\inetpub\wwwroot\api\images\credit`, dentro de su propio directorio. ServicioSAP usa el
suyo, `C:\inetpub\wwwroot\sap\images\credit`, configurable con la clave `IMAGES_CREDIT_PATH`
del `Web.config`. Es la misma decisión que se tomó para `data.db`.

Nada en APIMagento ni en APIMagentoDMZ vuelve a leer esa carpeta, así que si alguien consume
esos archivos lo hace desde fuera de estos dos repos. **Conviene confirmarlo antes de
desplegar**, porque un consumidor que los busque bajo `/api/...` dejaría de encontrarlos.

## Pruebas ejecutadas — 20 ago 2026

Contra AdminDoc real. La carpeta de imágenes se apuntó a un directorio temporal porque
`C:\inetpub\wwwroot\sap` no se puede crear en el equipo de desarrollo (acceso denegado); el
`Web.config` se restauró al terminar. La fila creada se borró.

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Lote completo: 2 INE + selfie + prueba de vida | 200 `true` inmediato | 200 `true` en **179 ms** | ✅ |
| 1a | └ archivos tras ~12 s | 3 archivos, sin prueba de vida | `ola4_ine_frente_1.jpg`, `ola4_ine_reverso_2.jpeg`, `ola4_selfie_3.jpg` — 975 bytes cada uno | ✅ |
| 1b | └ fila de la selfie | 1 fila, `CLAVE` = BP, `IDAPLICACION` 7 | `CLAVE=1500007539`, `IDAPLICACION=7`, `FORMATO=IMG`, `TIPO_DOC=14`, 975 bytes | ✅ |
| 2 | Body nulo | 400 | 400 `Datos incompletos.` | ✅ |
| 3 | Sin token | 401 | 401 | ✅ |

El caso 1a confirma de paso tres comportamientos que solo se ven ejecutando: la
normalización del mime, la numeración con la selfie al final, y que `PruebaDeVida` se ignora.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola4.http`.

## Diferencias contra el legado

Ninguna en el contrato observable. Dos añadidos que no cambian ninguna respuesta:

- **Un `try/catch` dentro del `Task`**, que el legado no tiene. Allá una excepción moría como
  *unobserved task exception* sin dejar rastro; aquí el motivo va a `sap.log`. El cliente ve
  lo mismo, porque ya recibió su `true`.
- **`Directory.CreateDirectory` si la carpeta no existe.** El legado daba por hecha la suya;
  como el fallo es silencioso, un directorio ausente equivalía a perder el lote entero sin
  aviso.

Durante la corrida se detectaron y corrigieron **dos divergencias** que sí habrían cambiado
el comportamiento — ver el detalle en [[ESTADO_PRUEBAS_Y_AVANCE]].

## Deuda heredada

- **El `true` no significa nada.** Es el problema central del endpoint: no hay forma de que
  el cliente sepa si sus imágenes se guardaron. Mitigado en parte con `sap.log`.
- **La ventana de 10 segundos.** Un reciclado del app pool en ese intervalo se lleva el lote.
- **Sin validación de `Ine` ni `Selfie`.** Un nulo aborta el lote en silencio.
- **`PruebaDeVida` se recibe y se tira.** Quien la manda cree que se guarda.
- **La DMZ vuelca las imágenes completas a su log** en cada llamada.
