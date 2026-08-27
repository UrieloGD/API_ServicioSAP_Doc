---
tags: [contrato, endpoint, migracion, ola-4]
partida: E-07
actualizado: 2026-08-20
---

# E-07 — `credit/guardardocumento`

Guarda un documento del expediente del cliente (INE, comprobante, contrato…) en
`MAVI_DOC_CTE`, la tabla de documentos de **AdminDoc**.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `credit/guardardocumento` — **`[AllowAnonymous]`**, recibe `multipart/form-data` |
| Ruta en ServicioSAP | `credit/guardardocumento` — recibe JSON, con `[Authorize]` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CreditController.cs::GuardarDocumento` |
| Método | `Methods\Credit\DocumentMethods.cs::GuardarDocumento` |
| Origen legado | `APIMagento\Controllers\CreditController.cs:591` + `Metodos\CreditMethods.cs:2605` |
| Almacén | SQL Server, `AdminDoc.dbo.MAVI_DOC_CTE` en `MAVICBOSANDROID` |

> **La DMZ hace la traducción de multipart a JSON**, campo por campo
> (`APIMagentoDMZ\Controllers\CreditController.cs:452-482`). ServicioSAP nunca ve un
> multipart, así que no necesita `MultipartMemoryStreamProvider`.

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `Cliente` | string | sí | Cuenta. Decide en qué columna aterriza — ver abajo |
| `TipoDoc` | int | sí | Tipo de documento. **Tiene FK contra `MAVI_TIPO_DOC`** |
| `FileInputBase64` | string | sí | El documento en Base64. La DMZ lo arma desde el archivo del multipart |
| `UsuarioCarga` | string | no | Quién sube. **`varchar(10)`**: más largo y el INSERT falla |
| `idVenta` | string | no | Va a `ID_EXTERNO`. **Solo se guarda en la rama Cliente** |
| `Aval` | string | no | La columna es `bit`, pero el parámetro viaja como `VarChar` |
| `IdFoto` | int | no | El `switch` de `TipoDoc` lo sobrescribe en todas las ramas menos la `default` |
| `Formato` | string | no | Igual que `IdFoto` |
| `MovMovid` | string | no | **Campo muerto.** La DMZ lo recoge y el método nunca lo lee |

```json
{
  "Cliente": "1500007539",
  "TipoDoc": 14,
  "UsuarioCarga": "OLA4TEST",
  "idVenta": "OLA4-1",
  "FileInputBase64": "iVBORw0KGgoAAAANSUhEUg..."
}
```

### Cómo `TipoDoc` reescribe `IdFoto` y `Formato`

| `TipoDoc` | `IdFoto` | `Formato` |
|---|---|---|
| 13 | 10 | PDF |
| 14 | 1 | IMG |
| 19 | 2 | *(no lo toca)* |
| 23 | 10 | IMG |
| 80, 170 | 6 | IMG |
| 99, 100, 101, 102, 103 | 0 | PDF |
| 104 | 4 | *(no lo toca)* |
| 166 | 10 | PDF |
| cualquier otro | *(respeta el del request)* | IMG |

Los casos 19 y 104 dejan `Formato` como venga; si el request no lo manda, la columna
queda nula. Verificado en la corrida: `TipoDoc 19` sin `Formato` → `FORMATO` nulo.

### Las dos ramas: en qué columna cae la cuenta

`MAVI_DOC_CTE` tiene dos columnas para identificar al dueño del documento:

- **`CLAVE`** — la cuenta real de un cliente que ya existe.
- **`DIR`** — un identificador temporal, para un prospecto que **todavía no tiene cuenta**
  y sube documentos antes del alta.

El código decide con un "¿esto parece una cuenta de verdad?":

```csharp
var escliente = (Cliente ?? "").StartsWith("15") && Cliente?.Length <= 10;
```

| | `@Opcion` | `CLAVE` | `DIR` | Guarda `ID_EXTERNO` | Guarda `ID_FOTO` |
|---|---|---|---|---|---|
| `escliente = true` | `Cliente` | la cuenta | `''` | ✅ | ✅ |
| `escliente = false` | `Token` | `''` | la cuenta | ❌ | ❌ |

> **ADAPTACIÓN AL FORMATO SAP — decisión del 20-ago-2026.** El legado preguntaba
> `(start == "C" || start == "P") && Length <= 11`. Con la cuenta migrada a Business
> Partner (`C00000020` → `1500000020`) esa condición sería **siempre falsa**, y todo
> cliente real caería en la rama Token: `CLAVE` vacía y el BP en `DIR`.
>
> Eso los volvería invisibles: `SpMaviConsultaDoc` (repo MaviSAP) los busca con
> `WHERE C.CLAVE IN (@BF, @CUENTA)` y `C.Clave = S.BP`, con `@CUENTA` declarado
> `varchar(10)` — el ancho exacto de un BP.
>
> Se cambia la condición a `StartsWith("15") && Length <= 10`. Se usa `StartsWith` y no
> `Substring(0, 2)` porque `IsNullOrEmpty` solo garantiza longitud 1: un `Cliente` de un
> carácter haría reventar el `Substring`.

La tercera rama del SQL, `Actualizar` —que rescataría los documentos del limbo con
`SET CLAVE = @Cliente, DIR = NULL`— es **inalcanzable**: `@Opcion` solo vale `Cliente` o
`Token`, y `@GuidCliente` va fijo a `""`. Se conserva por paridad.

## Response

### 200 — documento almacenado

```json
{ "Success": true, "Message": "Información almacenada correctamente" }
```

### 200 con `Success: false` — el INSERT no devolvió filas

```json
{ "Success": false, "Message": "" }
```

Es el valor inicial de la variable. No debería ocurrir con las ramas actuales, porque las
tres hacen `SELECT 1`, pero está en el camino del código.

### 400 — body nulo

```json
{ "Message": "Invalid JSON payload" }
```

### 500 — cualquier fallo del INSERT

El controlador devuelve `InternalServerError(ex)`, que **expone el mensaje de la excepción
en el cuerpo**. Es el comportamiento del legado. Causas observadas en la corrida:

| Causa | Mensaje |
|---|---|
| `Aval` con texto no numérico | `Conversion failed when converting the varchar value 'SI' to data type bit.` |
| `TipoDoc` inexistente | `The INSERT statement conflicted with the FOREIGN KEY constraint "FK_MAVI_DOC_CTE_TIPO_DOC"` |
| Base64 inválido | `La entrada no es una cadena Base 64 válida...` — falla antes de tocar la base |
| Campo más largo que su columna | `String or binary data would be truncated.` |

### 401 — sin token

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ  credit/guardardocumento  (CreditController.cs:442)
            → [AllowAnonymous], multipart/form-data
            → si no es multipart: 400 "UnsupportedMediaType"
            → traduce campo por campo a BodyImagenBase64 y serializa a JSON
            → Curl.PostSAP("credit/guardardocumento", ...)  ← cutover 20 ago
            → ServicioSAP
            → intenta JObject.Parse(response.Trim('"'))
              ├─ si parsea  → Ok(objeto)
              └─ si no      → busca "true" o "correctamente" en el texto y fabrica
                              { Success = true, Message = "Información almacenada correctamente" }
                              o, en último caso, devuelve el string crudo

La DMZ **inventa un éxito por coincidencia de texto** cuando no puede parsear la respuesta.
Si ServicioSAP devolviera un error que contuviera la palabra "correctamente", el cliente
vería un éxito. Es comportamiento heredado.

**Cutover:** ⏳ aplicado y commiteado el 20 ago (`d933e44`, `CreditController.cs:485`).
**Sin desplegar**: en producción el tráfico sigue yendo al legado.

## Efectos

**Escribe una fila en `AdminDoc.dbo.MAVI_DOC_CTE`** (servidor `MAVICBOSANDROID`) con
`ESTATUS = 1` e `IDAPLICACION = 24`. No borra ni actualiza nada.

### Límites de columna, verificados el 20-ago

| Columna | Tipo |
|---|---|
| `ID` | `uniqueidentifier`, default `newid()` |
| `CLAVE` | `varchar(10)` — **un BP ocupa exactamente 10. Cero margen** |
| `UsuarioCarga` | `varchar(10)` |
| `ID_EXTERNO` | `varchar(30)` |
| `FORMATO` | `varchar(15)` |
| `DIR` | `varchar(255)` |
| `DOCUMENTO` | `varbinary(MAX)` |
| `AVAL` | `bit` |

## Pruebas ejecutadas — 20 ago 2026

Contra AdminDoc real (`MAVICBOSANDROID`, reloj verificado). BP de pruebas `1500007539`.
Las cinco filas creadas se borraron al terminar.

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Rama Cliente, BP, TipoDoc 14 | 200 + fila con CLAVE = BP | 200; `CLAVE=1500007539`, `DIR=''`, `ID_EXTERNO=OLA4-1`, `ID_FOTO=1`, `FORMATO=IMG` | ✅ |
| 2 | Rama Token, `C00000020`, TipoDoc 13 | 200 + fila con DIR | 200; `CLAVE=''`, `DIR=C00000020`, `ID_EXTERNO` y `ID_FOTO` **nulos**, `FORMATO=PDF` | ✅ |
| 3 | `Cliente` de un carácter | 200, rama Token, sin excepción | 200; `DIR=X`, `FORMATO` nulo | ✅ |
| 4 | `Aval` = `"SI"` | 500 conversión a bit | 500, mensaje de conversión | ✅ |
| 5 | `Aval` = `"1"`, TipoDoc 23 | 200, `AVAL=1` | 200; `AVAL=True`, `ID_FOTO=10`, `FORMATO=IMG` | ✅ |
| 6 | TipoDoc 999 | 500 por FK | 500, `FK_MAVI_DOC_CTE_TIPO_DOC` | ✅ |
| 7 | Base64 inválido | 500 antes del INSERT | 500 | ✅ |
| 8 | Body nulo | 400 | 400 `Invalid JSON payload` | ✅ |
| 9 | Sin token | 401 | 401 | ✅ |

El caso 3 es el que valida la adaptación al formato SAP: confirma que la detección de BP
no revienta con cadenas cortas y que lo que no parece BP sigue yendo a Token.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola4.http`.

## Diferencias contra el legado

Una, deliberada y ya descrita: **la detección de cuenta acepta el formato BP en vez de
`C`/`P`**. Sin ella la migración rompería la consulta de documentos.

El resto es paridad literal, incluidos el `switch`, el SQL con sus tres ramas, el tipado de
los parámetros y los códigos HTTP.

## Deuda heredada

- **`AVAL` es `bit` pero el parámetro va como `VarChar`.** Cualquier valor no numérico
  —`"SI"`, `"true"`— tumba el INSERT con 500. Verificado idéntico en APIMagento.
- **La rama Token pierde `idVenta` e `IdFoto`.** El documento queda sin vínculo con la venta
  y sin tipo de foto. Verificado en la corrida: columnas nulas.
- **La rama `Actualizar` es inalcanzable**, así que un documento que caiga en el limbo de
  `DIR` no se rescata nunca por esta vía.
- **`CLAVE` es `varchar(10)` y un BP mide 10.** No hay margen: si SAP emitiera alguna vez un
  identificador más largo, el INSERT empezaría a fallar con truncamiento.
- **El 500 expone el mensaje de la excepción** al cliente, incluido el nombre de la
  restricción y de la tabla.
- **La DMZ fabrica un éxito por coincidencia de texto** cuando no puede parsear la respuesta.
