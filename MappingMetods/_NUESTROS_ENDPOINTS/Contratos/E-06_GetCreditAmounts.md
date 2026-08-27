---
tags: [contrato, endpoint, migracion, ola-3]
partida: E-06
actualizado: 2026-08-19
---

# E-06 — `credit/GetCreditAmounts`

Devuelve los montos de crédito de Credilana cacheados para una combinación de artículo y UEN.

Es **solo lectura sobre una caché**. Quien la llena es M-03 / M-07
(`credit/SaveCredilanaInfo`), que trae los datos de Intelisis y queda fuera del alcance de
esta ola.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `credit/GetCreditAmounts` |
| Ruta en ServicioSAP | `credit/GetCreditAmounts` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CreditController.cs::GetCreditAmounts` |
| Método | `Methods\Credit\CredilanaMethods.cs::GetCredilanaInfo<T>` |
| Origen legado | `APIMagento\Controllers\CreditController.cs:314` + `Metodos\Credit\CredYPrestamo\CredyPrestamoMethods.cs:833` |
| Almacén | SQLite, tabla `mavi_credilana_info` |

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `articulo` | string | sí | Solo `"nuevo"` y `"casa"` tienen efecto. Comparación sensible a mayúsculas |
| `uen` | int | sí | Unidad estratégica de negocio. Si falta, llega como `0` |
| `tipo` | string | no | Solo se mira cuando `articulo = "nuevo"`. Distingue `"CREDITO"` de apertura |

```json
{ "articulo": "nuevo", "uen": 1, "tipo": "CREDITO" }
```

### Cómo se resuelve el campo consultado

| `articulo` | `tipo` | campo en `mavi_credilana_info` |
|---|---|---|
| `nuevo` | `CREDITO` | `montos_cte_nuevo` |
| `nuevo` | cualquier otro, incluido nulo | `montos_cte_nuevo_apertura` |
| `casa` | se ignora | `montos_cte_casa` |
| cualquier otro | — | ninguno → 400 |

La comparación de `tipo` es `req.tipo == "CREDITO"`, exacta. Un `"credito"` en minúsculas cae
en la rama de apertura y devuelve montos distintos **sin avisar**.

## Response

### 200 — hay fila para ese par (campo, uen)

El contenido de la columna `data` deserializado. Las llaves van en **snake_case**, a
diferencia de E-05.

```json
{
  "hasta_un_maximo_de_prestamo": 15000.00,
  "hasta_una_bonificacion_de": 2500,
  "articulos": [
    {
      "articulo": "nuevo",
      "monto": 15000.00,
      "total_sin_bonificacion": 21000.00,
      "total_con_bonificacion": 18500.00,
      "meses": 12,
      "semanas": 52,
      "condicion": "SEMANAL",
      "bonificacion": 2500,
      "abono_sin_bonificacion": 403.85,
      "tipo_de_abono": "SEMANAL",
      "abono_con_bonificacion": 355.77,
      "tasa_con_bonificacion": 23.33,
      "cat_con_bonificacion": 25.90,
      "interes_con_bonificacion": 3500.00,
      "tasa_sin_bonificacion": 40.00,
      "cat_sin_bonificacion": 44.20,
      "interes_sin_bonificacion": 6000.00
    }
  ]
}
```

> **Las tres ramas deserializan a `CteNuevoResponseModel`, también la de `"casa"`.** En el
> legado existe un `CteCasaResponseModel` que ningún camino de este endpoint usa. Se replicó
> el comportamiento real, no el que sugieren los nombres. La forma del JSON devuelto la
> determina lo que M-07 haya guardado en `data`, no el modelo de C#.

### 400 — `articulo` no reconocido

Cuerpo vacío. Sale cuando `articulo` tiene un valor distinto de `"nuevo"` y `"casa"`: ninguna
rama entra y el método cae en el `return BadRequest()` final.

### 500 — no hay fila, o `articulo` es nulo

Cuerpo vacío. Tres causas:

- **No existe fila para ese par (campo, uen).** El legado hace `sqReader.ToString()` sobre el
  resultado de un `ExecuteScalar` nulo → NullReferenceException → 500. ServicioSAP lanza una
  excepción explícita con el mismo resultado HTTP, y **deja el motivo en**
  `C:\inetpub\wwwroot\log\sap.log`:
  ```
  [CREDIT GetCreditAmounts ERROR] articulo=nuevo tipo=CREDITO uen=99 =>
    mavi_credilana_info no tiene fila para field='montos_cte_nuevo' uen=99.
  ```
- **`articulo` nulo** (body `{}` o `"articulo": null`). El legado hace `req.articulo.Equals(...)`
  sin comprobar nulos.
- **`data` presente pero vacío o con JSON inválido.**

Como la tabla la llena M-03/M-07, **mientras ese proceso no corra contra la base de
ServicioSAP este endpoint responde 500 a todo.**

### 401 — sin token

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ  credit/GetCreditAmounts  (CreditController.cs:346)
            → if (sf == null) → 400
            → Curl.PostSAP("credit/GetCreditAmounts", ...).Trim('"')  ← cutover 19 ago
            → ServicioSAP
            → Ok(response) → cliente

La DMZ aplica `.Trim('"')` y devuelve `Ok(string)`. **El cliente recibe un string, no un
objeto** — el patrón opuesto al de E-05, que usa `Json(...)` sin recortar. Es la divergencia
que motiva esta carpeta de contratos.

**Cutover:** ⏳ escrito el 19 ago (`CreditController.cs:352`), compila en 0 errores, **sin
commitear ni desplegar**. Hasta que se despliegue, el tráfico real sigue yendo al legado.

## Efectos

Ninguno. Solo lectura sobre `mavi_credilana_info`.

## Pruebas ejecutadas — 19 ago 2026

Base de simulación sembrada con tres filas (`montos_cte_nuevo`, `montos_cte_nuevo_apertura`,
`montos_cte_casa`), todas con `uen = 1`, porque M-07 no ha corrido contra ninguna base de
ServicioSAP.

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | `nuevo` + `CREDITO`, uen 1 | 200, `montos_cte_nuevo` | 200, máximo 15000.00 | ✅ |
| 2 | `nuevo` + `APERTURA`, uen 1 | 200, `montos_cte_nuevo_apertura` | 200, máximo 8000.00 | ✅ |
| 3 | `nuevo` sin `tipo`, uen 1 | 200, rama de apertura | 200, máximo 8000.00 | ✅ |
| 4 | `casa`, uen 1 | 200, `montos_cte_casa` | 200, máximo 50000.00 | ✅ |
| 5 | `articulo` desconocido | 400 | 400 | ✅ |
| 6 | uen sin fila (99) | 500 | 500 + entrada en `sap.log` | ✅ |
| 7 | `articulo` nulo | 500 | 500 | ✅ |
| 8 | Body vacío `{}` | 500 | 500 | ✅ |
| 9 | Sin token | 401 | 401 | ✅ |

Las tres ramas de selección de campo quedaron verificadas con datos distintos, que es lo que
demuestra que la lógica de `articulo`/`tipo` enruta bien.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola3.http`.

## Diferencias contra el legado

Ninguna en el resultado HTTP. Hay una diferencia **interna deliberada**: donde el legado
revienta con `NullReferenceException`, `GetCredilanaInfo` lanza una `InvalidOperationException`
con el par (campo, uen) en el mensaje, que el controlador registra antes de devolver el 500.
Mismo código, misma respuesta, pero con rastro en el log.

Los casos 6, 7 y 8 **sí divergían** en la primera corrida: `GetCredilanaInfo` devolvía
`default(T)`, lo que producía **200 con cuerpo `null`** en vez de 500, y una validación propia
de `articulo == null` devolvía 400. Ambas se corrigieron y se volvió a probar.

> El 200 con `null` era el más peligroso de los dos: un consumidor que no comprueba nulos lo
> lee como "sin monto disponible" en lugar de como un fallo.

## Deuda heredada

- **Depende de M-03 / M-07.** Sin ese proceso poblando `mavi_credilana_info`, el endpoint
  responde 500 a todo, aunque esté correctamente migrado.
- **`tipo` se compara con `==` exacto.** Cualquier variante de mayúsculas cae en la rama de
  apertura y devuelve montos menores sin error.
- **La forma real del 200 la decide M-07**, no el modelo de C#. Si M-07 guarda un JSON con
  otra estructura, la deserialización llena lo que puede y omite el resto en silencio.
