---
tags: [contrato, endpoint, migracion, ola-6]
partida: E-11
actualizado: 2026-08-25
---

# E-11 — `customer/getCuenta`

Consulta la cuenta de crédito que Magento tiene registrada para un correo.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta en ServicioSAP | `customer/getCuenta` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomersController.cs::GetCuenta` |
| Método | `Methods\Customer\MagentoAccountMethods.cs::GetCuentaAsync` |
| Origen legado | `APIMagento\Controllers\CustomersController.cs:89` + `Conn\Magento.cs:309` |
| Destino | Magento REST, vía la DMZ |

> **No toca base de datos.** Es un salto en una cadena de tres, y ServicioSAP ocupa el lugar
> que tenía la LAN:
>
>     ServicioSAP  customer/getCuenta
>        → DMZ  magento/getCuenta
>           → Magento REST  rest/V1/mavi-cuenta/getCuenta

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `correoCuenta` | string | **sí** | Correo a buscar. Es el único campo que se usa |
| `idCliente` | string | no | **Se ignora** en esta operación |
| `nuevaCuenta` | string | no | **Se ignora** en esta operación |

```json
{ "correoCuenta": "cliente@correo.com" }
```

> Los tres campos se serializan con `NullValueHandling.Ignore`, así que **un campo nulo no
> viaja en el JSON**. No es cosmético: cambia lo que Magento recibe.

## Qué hace Magento del otro lado

Verificado el 25-ago en `Mavi\CuentaMavi\Model\CuentaManagement.php::getCuenta`:

Busca el correo en **dos websites, la 1 y la 5**, y devuelve un elemento por cada
coincidencia, leyendo el atributo `customer_credit_account`:

```json
[ { "id": 1067287, "name": "Hector Jimenez", "cuenta_intelisis": "C00000020" } ]
```

Tres consecuencias que conviene tener presentes:

- **Puede devolver dos elementos** si el correo existe en las dos websites. Nadie deduplica.
- **El campo se llama `cuenta_intelisis`**, y seguirá llamándose así cuando contenga un BP.
- Si no hay coincidencias devuelve `[]`, no un error.

## Response

### 200 — con o sin coincidencias

El cuerpo es el JSON que devuelve Magento, ya desescapado. Sin coincidencias:

```
[]
```

### 200 — con error de Magento en el cuerpo

Si falta `correoCuenta`, Magento responde con su propio error… **y llega con código 200**:

```
{"message":"\"%fieldName\" is required. Enter and try again.","parameters":{"fieldName":"correoCuenta"}}
```

Quien consuma sin inspeccionar el cuerpo dará el error por éxito.

### 401 — sin token

## Recorrido hasta la DMZ

**No hay cutover.** Esta partida va **de ServicioSAP hacia la DMZ**, no al revés: ninguna
ruta de la DMZ reenvía a `customer/getCuenta`, así que no hay nada que conmutar.

Lo que sí importa para el despliegue es que **`URL_DMZ` apunte a la DMZ correcta**, porque sin
ella el endpoint no funciona.

La respuesta pasa por un doble desescapado portado literal del legado:

```csharp
response.Replace("\\\"", "\"").Replace("\\\\\"", "\"").Trim('"')
```

Hace falta porque Magento devuelve un JSON, la DMZ lo reenvía dentro de otro JSON, y sin esto
el cliente recibiría una cadena con barras invertidas.

## Efectos

Ninguno. Solo lectura.

## Pruebas ejecutadas — 25 ago 2026

Con **APIMagentoDMZ levantada en local** (`https://localhost:44302`), sin la cual el endpoint
no responde.

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Correo inexistente | 200 + arreglo vacío | 200 `[]` en 1633 ms | ✅ |
| 2 | Body vacío | 200 con el error de Magento | 200 con el mensaje de campo requerido | ✅ |
| 3 | Sin token | 401 | 401 | ✅ |

**No se probó un correo existente**, que es el caso que devolvería 1 o 2 elementos. Haría
falta un correo de pruebas acordado.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola6.http`.

## Diferencias contra el legado

Ninguna.

## Deuda heredada

- **Los errores de Magento llegan con código 200.** El cliente tiene que leer el cuerpo para
  saber si funcionó.
- **`idCliente` y `nuevaCuenta` se reciben y se descartan.** Quien los mande creerá que
  cuentan.
- **La búsqueda en dos websites puede devolver duplicados**, y el consumidor decide con cuál
  quedarse sin ningún criterio explícito.
