---
tags: [contrato, endpoint, migracion, ola-9]
partida: E-46
actualizado: 2026-09-23
---

# E-46 — `credit/getPlazos`

Devuelve los días de gracia de las condiciones a 12 meses, separados en diferidos e
inmediatos, y por tienda.

## Identidad

| | |
|---|---|
| Verbo | GET |
| Ruta pública (DMZ) | `credit/getPlazos` |
| Ruta en ServicioSAP | `credit/getPlazos` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CreditController.cs` |
| Método | `Methods\Credit\CreditMethods.cs::GetPlazosAsync` |
| Origen legado | `APIMagento\Metodos\CreditMethods.cs:2541` (`GetPlazos`) |
| Quién lo escribió | Dev 2 |

## Request

Sin cuerpo y sin parámetros.

## Response · 200

```json
{
  "Diferidos":  [ { "Days": 122, "StoreCode": "VIU" },
                  { "Days": 122, "StoreCode": "MUEBLES_AMERICA" } ],
  "Inmediatos": [ { "Days": 0,   "StoreCode": "VIU" },
                  { "Days": 0,   "StoreCode": "MUEBLES_AMERICA" } ]
}
```

`StoreCode` va en mayúsculas y con el espacio sustituido por guion bajo, igual que el legado
(`reader.GetString(1).ToUpper().Replace(' ', '_')`). Una entrada por tienda y como mucho dos
por lista: el código corta en cuanto tiene Muebles América y VIU.

## De dónde sale cada número

| | |
|---|---|
| Qué condiciones | `CondicionesCredVtaLinea` en **SIGMAVI**, `Mensualidades = 12`, filtrando `CondicionPropre LIKE '%DIF%'` o `'%INM%'` |
| Cuántos días | **SAP**, condiciones de pago; se cruza por `Zterm` y se lee `Zdiasgracia` |
| Traducción entre los dos | `Helpers\PaymentConditionCatalog.GetSapPaymentCode` |

El legado leía las dos cosas de `VTASCCondicionesCredVtaLinea` en IntelisisTmp. Aquí la tabla
se queda en SIGMAVI y los días los pone SAP.

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ credit/getPlazos  ([HttpGet])
            → curl.GetSAP("credit/getPlazos").Trim('"')
            → ServicioSAP credit/getPlazos    ([HttpGet])
            → Ok(JsonConvert.DeserializeObject(response)) → cliente

El cliente recibe el **objeto deserializado**, no una cadena.

> 🔴 **El cutover llegó a estar roto.** La DMZ usaba `PostSAP` contra una ruta `[HttpGet]`, lo
> que devuelve 405. Corregido a `GetSAP` el 21 sep (`42d208b`, sin subir). La ruta de la LAN
> también es `[HttpGet]`, así que la paridad manda `GetSAP`.

## Efectos

Ninguno. Solo lee.

## Prueba · 23 sep

| Caso | Resultado |
|---|---|
| `GET credit/getPlazos` | **200** en 9,0 s, con las cuatro entradas de arriba |
| Forma de la respuesta | idéntica al legado: `{Diferidos, Inmediatos}` de `{Days, StoreCode}` |

**Los ceros de `Inmediatos` son reales, no un valor por defecto.** El código inicializa
`days = 0` y solo lo sobrescribe si encuentra la condición en SAP, así que un cero podía
significar *"inmediato"* o *"no encontré la condición"*. Se comprobó contra
`credit/condicionespago`:

```
12DA  Zdiasgracia = 122      12IA  Zdiasgracia = 0
12DV  Zdiasgracia = 122      12IV  Zdiasgracia = 0
```

Los diferidos traen 122 y los inmediatos 0 en el propio SAP. La respuesta refleja el dato.

## Diferencias contra el legado

**El error deja de distinguirse.** Ante un fallo, el legado responde **200 con
`{"Error": true, "Message": "..."}`** (`CreditMethods.cs:2556`). Aquí la excepción se atrapa
dentro de `GetPlazosAsync`, se registra con `Logger.SAP` y se devuelve **200 con las dos
listas vacías**.

Ninguno de los dos da 500, así que no rompe al consumidor, pero quien hoy distinga el error
por el cuerpo deja de poder hacerlo. No se pudo provocar en la prueba sin tumbar SIGMAVI.

## Lo que falta

Solo **subir y desplegar el cutover**, que va en el mismo commit que el de E-45
`codigoPromocion` — y ése espera a probarse.
