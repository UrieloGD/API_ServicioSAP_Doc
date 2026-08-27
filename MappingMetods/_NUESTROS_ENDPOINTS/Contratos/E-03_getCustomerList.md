---
tags: [contrato, endpoint, migracion, ola-2]
partida: E-03
actualizado: 2026-08-07
---

# E-03 — customer/getCustomerList

Consulta en qué lista está un correo. Es el único de la Ola 2 que **no escribe**.

Mecánica común del módulo en [[E-02_setCustomerList]].

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `customer/getCustomerList` — ⚠️ la DMZ la expone como **GET**, ver abajo |
| Ruta en ServicioSAP | `customer/getCustomerList` (POST) |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomersController.cs::GetCustomerEmailage` |
| Método | `Methods\Customer\CustomerMethods.cs::blackwhitelist` |
| SP | `SpListaNBMagento` con `@Tipo = 'Consultar'` |
| Base | **SIGMAVI** (DEVMAVI) |
| Origen legado | `APIMagento\Controllers\CustomersController.cs:58` |

## Request body

De las 11 propiedades de `CustomerRequest`, **solo usa `email`**.

```json
{ "email": "cliente@correo.com" }
```

## Cómo resuelve

El doble llamado lo orquesta el **controlador**, no el SP:

1. Consulta lista negra. Si hay filas → `"black"` y **termina ahí**, sin consultar la blanca.
2. Si no estaba en negra, consulta lista blanca. Si hay filas → `"white"`.
3. Si no está en ninguna → `"No esta en listas"`.

El SP devuelve `Lista, NumPedido, Nombre, Correo, Direccion, IdMagento, FechaRegistro`, pero **el código solo mira si hubo filas**. Todas esas columnas se descartan: no llegan al cliente.

## Response

### 200 — tres valores posibles

```json
"black"              // el correo está en ListaNegra
"white"              // no está en negra, pero sí en ListaBlanca
"No esta en listas"  // no está en ninguna
```

### 400 — sin `email` o body nulo

```json
{ "Message": "Datos incompletos" }
```

### 401 — sin token o token inválido

## Recorrido hasta la DMZ

```
Cliente → APIMagentoDMZ  [HttpGet] customer/getCustomerList
                         valida solo que email no sea null
        → Curl.Post()  ──── hoy va a URL_INTELISIS (legado)
        → la DMZ reenvía el string recibido
```

**Discrepancia de verbo:** la DMZ declara este endpoint como `[HttpGet]` mientras que la LAN y ServicioSAP lo atienden como `POST`, y aun así manda un body. Se replicó el `POST` de la LAN, que es el que efectivamente recibe la petición. Conviene confirmarlo al hacer el cutover.

**Cutover: escrito, sin commitear ni desplegar (10 ago).** `curl.PostSAP(...)` ya figura en `APIMagentoDMZ\Controllers\CustomersController.cs`, pero el cambio sigue en el árbol de trabajo. En producción la DMZ todavía manda el tráfico al legado.

## Efectos

**Ninguno.** Es el único endpoint de solo lectura del módulo — dos `SELECT` con `NOLOCK`, sin `INSERT`, `UPDATE` ni `DELETE`.

## Diferencias contra el legado

Ninguna en el contrato: mismos tres valores de respuesta, mismo orden de consulta, mismas validaciones. Solo cambia la base de destino (SIGMAVI en vez de IntelisisTmp) y el nombre de la columna `Cliente` → `IdMagento` en el `SELECT`, que nadie lee.

## ⚠️ `"No esta en listas"` es ambiguo

Ese valor sale tanto cuando el correo realmente no está en ninguna lista **como cuando la consulta falló**: base caída, SP inexistente, permisos. Es el comportamiento del legado y se conservó.

Se comprobó en la corrida del 7-ago-2026: el endpoint devolvió `"No esta en listas"` con toda la capa de base de datos rota (el SP no existía todavía en SIGMAVI). La única forma de distinguirlo es el log `C:\inetpub\wwwroot\log\sap.log`.
