---
tags: [contrato, endpoint, migracion, ola-2]
partida: E-02
actualizado: 2026-08-11
---

# E-02 — customer/setCustomerList

Da de alta un correo en la lista blanca o negra de eCommerce.

Los tres endpoints de la Ola 2 comparten método, SP y tablas; la mecánica común está detallada aquí y las fichas de [[E-03_getCustomerList]] y [[E-04_deleteCustomerList]] remiten a esta.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `customer/setCustomerList` |
| Ruta en ServicioSAP | `customer/setCustomerList` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomersController.cs::SetCustomerEmailage` |
| Método | `Methods\Customer\CustomerMethods.cs::blackwhitelist` |
| SP | `SpListaNBMagento` con `@Tipo = 'Insertar'` |
| Base | **SIGMAVI** (DEVMAVI) — migrada desde `IntelisisTmp` en `MAVICUBOS` |
| Origen legado | `APIMagento\Controllers\CustomersController.cs:43` y `Metodos\CustomerMethods.cs:120` |

## Request body

Se deserializa a `CustomerRequest`, que declara 11 propiedades. **Este endpoint solo usa cinco**; `lastName`, `lastName2`, `dateBirth`, `gender`, `phone` y `storeCode` se ignoran por completo.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `name` | string | sí | Va a la columna `Nombre` |
| `email` | string | sí | Va a `Correo`. Es la clave de todo el módulo |
| `idMagento` | string | sí | Va a la columna `IdMagento` (era `Cliente` en el origen) |
| `list` | string | sí | `"white"` → Blanca, `"black"` → Negra. Cualquier otro valor → 400 |
| `address` | string | sí | Va a `Direccion` |

```json
{
  "name": "Hector Jimenez",
  "email": "cliente@correo.com",
  "idMagento": "1067287",
  "list": "black",
  "address": "Av. Vallarta 1234, Guadalajara"
}
```

`NumPedido` no se recibe: el código lo manda siempre en `"0"`, hardcodeado. `FechaRegistro` es `DateTime.Now` del servidor.

## Response

### 200 — siempre en el camino normal

```json
""
```

**Cadena vacía, se haya insertado o no.** La rama `Insertar` del SP no devuelve resultset, así que no hay forma de distinguir desde la respuesta si el alta ocurrió, si la bloqueó una validación, o si falló la base. Es el comportamiento del legado y se conservó a propósito.

### 400 — validación de entrada

```json
{ "Message": "Datos incompletos" }   // falta alguno de los 5 campos, o body nulo
{ "Message": "Lista invalida" }      // list no es "white" ni "black"
```

### 401 — sin token o token inválido

## Recorrido hasta la DMZ

```
Cliente → APIMagentoDMZ  POST customer/setCustomerList
                         (WebApiMagento\Controllers\CustomersController.cs:34)
                         valida los 5 campos y que list ∈ {white, black}
        → Curl.PostSAP()  ── en el código ya apunta a ServicioSAP (línea 63)
                             en producción todavía corre la versión con Post → legado
        → respuesta recibida
        → la DMZ IGNORA esa respuesta:
              if (response.Contains("Internal Server Error")) return BadRequest();
              return Ok("Correcto");
        → Cliente recibe siempre "Correcto"
```

**Patrón de la DMZ: descarta el cuerpo.** A diferencia de otros endpoints, aquí no reenvía lo que devolvió la capa de negocio — responde el literal `"Correcto"` salvo que detecte el texto `"Internal Server Error"`. Así que el cliente final **nunca** ve el `""`.

**Cutover: commiteado, sin push ni despliegue (11 ago).** `curl.PostSAP(...)` está en `WebApiMagento\Controllers\CustomersController.cs:63`, commiteado en `740669e` de la rama `dbAndroid` junto con las rutas de E-03 y E-04. El commit **no está subido**: `origin/dbAndroid` sigue en `6a55c6a`. En producción la DMZ todavía manda el tráfico al legado.

> ⚠️ **Desplegar este cutover tal cual no basta.** `Curl..ctor()` autentica contra la LAN incondicionalmente y fuera de un `try`, así que esta ruta seguirá muriendo con 500 si APIMagento no responde, aunque los datos ya no vayan ahí. Corregirlo **antes** de conmutar en producción. Orden de despliegue: ServicioSAP primero, la DMZ después.

## Efectos

Escribe en dos tablas de SIGMAVI:

| Tabla | Acción | Cuándo |
|---|---|---|
| `ListaNegra` | Insert | `list="black"`, si el correo no está ya en Negra |
| `ListaBlanca` | Insert | `list="white"`, si el correo no está ni en Negra ni en Blanca |
| `ListaBlanca` | Delete | Efecto colateral: al dar de alta en Negra, se saca de Blanca |

## Diferencias contra el legado

| | Legado | ServicioSAP |
|---|---|---|
| Base | `IntelisisTmp` en `MAVICUBOS` | `SIGMAVI` en `DEVMAVI` |
| Validación "el correo es de un cliente" | `COUNT` sobre la tabla `cte` **dentro del SP** | Consulta al Business Partner de SAP **en C#**, antes de invocar el SP |
| Columna del identificador | `Cliente` | `IdMagento` — nunca almacenó una cuenta de cliente, guarda el id de Magento |
| Parámetro del SP | `@NumCuenta` | `@IdMagento`, para que coincida con la columna |

La validación se movió porque `cte` es el maestro de clientes de Intelisis y no existe en SIGMAVI. Decisión de arquitectura del 7-ago-2026: opción A, validar contra SAP.

Se conserva a propósito: el `NumPedido` en `"0"`, la respuesta vacía sin confirmación, y que un correo que no pertenece a un cliente no se inserte **en silencio**.

## ⚠️ El fallo silencioso, y por qué importa más que antes

Por decisión explícita (7-ago-2026) se mantuvo la opacidad del legado: el cliente recibe la misma respuesta tanto si el alta se hizo como si no.

Pero ahora hay una causa nueva de fallo silencioso que el legado no tenía: **el filtro contra SAP**. `ValidarClienteEnSap` atrapa cualquier excepción de `GetFilterClientsAsync` y devuelve `false`, sin distinguir entre "el correo no existe", "SAP no responde" y "el nombre del campo es incorrecto". Los tres casos se tratan como "no es cliente", así que:

> Si el campo de correo de la vista CDS fuera distinto al configurado, **ninguna alta se insertaría jamás y nadie se enteraría**.

**El campo es `Mail`** (corregido y verificado end-to-end el 10 ago). `zEmail`, que era el valor inicial, está vacío en la vista y por eso ninguna alta insertaba.

Cómo se resuelve hoy, en `Methods\Customer\CustomerMethods.cs:84`: se lee la clave `SAP_BP_CAMPO_EMAIL` de `AppSettings` y, si viene vacía, se cae al literal `"Mail"`. **Esa clave no está declarada en el `Web.config`**, así que en la práctica siempre gana el fallback. La vía de corregirlo sin recompilar sigue disponible, pero exige **agregar** la clave, no editarla.

Mitigación: todos los fallos quedan en `C:\inetpub\wwwroot\log\sap.log` con el prefijo `[CUSTOMER ...]`, aunque no viajen en la respuesta.
