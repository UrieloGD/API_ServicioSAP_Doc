---
tags: [contrato, endpoint, migracion, ola-9]
partida: E-45
actualizado: 2026-09-24
---

# E-45 — `credit/codigoPromocion`

Valida un cupón de promotor y lo marca como usado. Dos operaciones, `ValidarCupon` y
`Elimina`, sobre la tabla `VentasCupones` de SIGMAVI.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `credit/codigoPromocion` |
| Ruta en ServicioSAP | `credit/codigoPromocion` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CreditController.cs:46` |
| Método | `Methods\Credit\CreditMethods.cs:113::CodigoPromocionAsync` |
| Origen legado | `APIMagento\Metodos\CreditMethods.cs:392` |
| SP en SIGMAVI | `SpVentasCupones` (`DEVMAVI` / `SIGMavi`) |
| SP en el legado | `SpVTASVentaCupon` (Intelisis) |

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `codigo` | string(30) | sí | El cupón. Se compara tal cual contra `VentasCupones.Codigo`. |
| `opcion` | string | sí | `ValidarCupon` o `Elimina`. Cualquier otro valor da 500. |
| `idMagento` | string(20) | solo en `Elimina` | Se graba en `IdEcommerce` de la fila consumida. En `ValidarCupon` se manda al SP y se ignora. |

```json
{ "codigo": "99000001", "opcion": "ValidarCupon", "idMagento": "MAG-E45-TEST" }
```

El cuerpo se recibe como `CodigoPromocionRequest`, con las tres propiedades en minúscula
inicial. Un `null` no llega al método: el controller corta antes.

## Response

Siempre un string JSON, nunca un objeto.

### 200 — `"OK"`

`ValidarCupon` y el cupón existe en la tabla. **No se verifica que esté sin usar**: el SP
hace `WHERE Codigo = @Codigo` a secas, así que un cupón ya consumido también responde `OK`.

### 200 — `"Erroneo"`

`ValidarCupon` y el código no existe.

### 200 — `""` (cadena vacía)

`Elimina`. El legado devuelve `"Eliminado"` cuando el SP no regresa filas, pero
`SpVentasCupones` sí regresa una: encadena un `NUEVO` que termina en
`SELECT @Agente AS cupon`. Ver "Diferencias contra el legado".

### 200 — `"err"`

Excepción de SQL atrapada dentro del método. Se registra en el log de SAP con el código.

### 400 — `{"Message":"Datos incompletos."}`

Cuerpo nulo.

### 500 — `NotImplementedException`

`opcion` distinta de las dos soportadas. Es una divergencia deliberada; ver abajo.

### `"Utilizado"` — inalcanzable

El C# mapea `Conteo = 2` a `"Utilizado"`, pero el SP actual solo asigna 1 o 0. El legado
tiene el mismo `else if` muerto. Deuda heredada, sin acción.

## Recorrido hasta la DMZ

```
Cliente → APIMagentoDMZ credit/codigoPromocion (CreditController.cs:127)
        → curl.PostSAP("credit/codigoPromocion", json).Trim('"')
        → ServicioSAP credit/codigoPromocion
        → respuesta → Ok(string) → cliente
```

Patrón de string recortado: el cliente recibe `OK`, no `"OK"`. El cutover a `PostSAP` está
escrito en `42d208b`, **sin subir**.

## Efectos

`ValidarCupon` es de solo lectura. `Elimina` escribe en `VentasCupones`:

1. Marca `FechaUtilizacion = GETDATE()` e `IdEcommerce` en la fila libre más reciente con
   ese código.
2. Encadena `NUEVO`, que **inserta otra fila con el mismo código**, libre.

El cupón se renueva solo. Corrida del 24-sep: `99000001` quedó consumido en
`IdVentaCupon = 5` y renovado en el `6`, y un `ValidarCupon` posterior siguió dando `OK`.

## Diferencias contra el legado

**`Elimina` responde `""` en vez de `"Eliminado"`.** Ambos lados preguntan lo mismo
—¿el SP devolvió filas?— pero contra SPs distintos. El de SIGMAVI encadena un `NUEVO` que
hace `SELECT @Agente AS cupon` cuando `@Nuevo = 0`, y `Elimina` lo llama sin ese
parámetro. No se pudo comprobar qué devolvía `SpVTASVentaCupon` en Intelisis, así que
**queda por confirmar con el autor de la migración del SP** si el `SELECT` final era
intencional. Si no lo era, la corrección va del lado del SP, no del C#.

**`opcion` no soportada da 500 en vez de 200 vacío.** El legado pasa cualquier `opcion` al
SP; si no coincide con ninguna rama, no hay filas y responde `""` con 200. Aquí se lanza
`NotImplementedException` a propósito, para que una opción mal escrita falle a la vista en
vez de confundirse con un `Elimina` correcto. Es la única divergencia introducida por
nosotros.

**La fila renovada pierde el centro.** El `NUEVO` encadenado recibe `@Sucursal = NULL`
porque el método solo manda tres parámetros —los mismos tres que manda el legado—, así que
la fila nueva queda con `Centro` nulo. Se observó en `IdVentaCupon = 6`. Del lado del SP.

**El nombre de la tabla ya estaba alineado.** El checklist pedía renombrar `VentasCupones`
a `VentaCupon`; `VentasCupones` es el nombre real en SIGMAVI y no hay nada que cambiar.

## Datos de prueba

`99000001` en `DEVMAVI` / `SIGMavi`, `Centro = 501`. Sembrado con
`SpVentasCupones @opcion = 'NUEVO', @Agente = '99000001', @Nuevo = 1`. Se puede reutilizar
indefinidamente porque `Elimina` lo regenera.
