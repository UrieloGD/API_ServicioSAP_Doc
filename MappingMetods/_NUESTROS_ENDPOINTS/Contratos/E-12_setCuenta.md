---
tags: [contrato, endpoint, migracion, ola-6]
partida: E-12
actualizado: 2026-08-25
---

# E-12 — `customer/setCuenta`

Fija la cuenta de crédito de un cliente en Magento.

> ⚠️ **Es el punto por donde la cuenta entra a Magento.** Cuando el identificador pase de
> `C00000020` a `1500000020`, es este endpoint el que empieza a escribir BPs en un atributo
> que se sigue llamando `cuenta_intelisis`.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta en ServicioSAP | `customer/setCuenta` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomersController.cs::SetCuenta` |
| Método | `Methods\Customer\MagentoAccountMethods.cs::SetCuentaAsync` |
| Origen legado | `APIMagento\Controllers\CustomersController.cs:98` + `Conn\Magento.cs:319` |
| Destino | Magento REST, vía la DMZ |

Gemelo de [[E-11_getCuenta]]: misma cadena de tres saltos, misma serialización, mismo
desescapado. Solo cambia la ruta y los campos que usa.

    ServicioSAP  customer/setCuenta
       → DMZ  magento/setCuenta
          → Magento REST  rest/V1/mavi-cuenta/setCuenta

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `idCliente` | string | **sí** | Id del cliente en Magento |
| `nuevaCuenta` | string | **sí** | Valor que se graba en `customer_credit_account` |
| `correoCuenta` | string | no | **Se ignora** en esta operación |

```json
{ "idCliente": "1067287", "nuevaCuenta": "1500007539" }
```

> **Ojo con la asimetría respecto a E-11:** aquélla busca por correo e ignora el id; ésta
> escribe por id e ignora el correo. El modelo es el mismo para las dos, así que nada avisa
> de la diferencia.

## Qué hace Magento del otro lado

Verificado el 25-ago en `Mavi\CuentaMavi\Model\CuentaManagement.php::setCuenta`:

Carga el cliente por id. Si no existe lanza `WebApiException` con *"Customer does not
exist."*. Si existe, graba `customer_credit_account` y devuelve `true`.

**No valida el formato de `nuevaCuenta`.** Acepta lo que se le mande.

## Response

### 200 — escritura correcta

```
true
```

### 200 — con error de Magento en el cuerpo

Un id inexistente **no produce un 4xx**: llega el error de Magento con código 200.

```
{"message":"Customer does not exist."}
```

### 401 — sin token

## Recorrido hasta la DMZ

**No hay cutover**, por el mismo motivo que E-11: la partida va de ServicioSAP hacia la DMZ.
Lo relevante para el despliegue es que `URL_DMZ` apunte a la DMZ correcta.

## Efectos

**Escribe en Magento.** Modifica el atributo `customer_credit_account` del cliente indicado.
No hay confirmación más allá del `true`, ni forma de deshacerlo desde el endpoint.

## Pruebas ejecutadas — 25 ago 2026

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | `idCliente` inexistente | 200 con el error de Magento | 200 `{"message":"Customer does not exist."}` en 781 ms | ✅ |
| 2 | Sin token | 401 | 401 | ✅ |

> ⚠️ **La escritura real no se ejecutó.** Habría modificado la cuenta de un cliente de Magento
> y no había un id de prueba acordado. **El camino positivo de esta partida sigue sin
> verificar**, y es el que importa: el caso 1 confirma la cadena, no la escritura.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola6.http`, caso E-12.2 —
marcado como destructivo.

## Diferencias contra el legado

Ninguna.

## Deuda heredada

- **Un id inexistente devuelve 200.** El error viaja en el cuerpo.
- **`correoCuenta` se recibe y se descarta.**
- **No se valida el formato de la cuenta.** Magento graba lo que llegue, así que un valor mal
  formado entra sin resistencia.
