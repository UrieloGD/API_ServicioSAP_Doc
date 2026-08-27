---
tags: [contrato, endpoint, migracion, ola-2]
partida: E-04
actualizado: 2026-08-07
---

# E-04 — customer/deleteCustomerList

Da de baja un correo. **Solo de la lista blanca**, pese al nombre genérico.

Mecánica común del módulo en [[E-02_setCustomerList]].

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `customer/deleteCustomerList` |
| Ruta en ServicioSAP | `customer/deleteCustomerList` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomersController.cs::DeleteCustomerEmailage` |
| Método | `Methods\Customer\CustomerMethods.cs::blackwhitelist` |
| SP | `SpListaNBMagento` con `@Tipo = 'Eliminar'` |
| Base | **SIGMAVI** (DEVMAVI) |
| Origen legado | `APIMagento\Controllers\CustomersController.cs:84` |

## Request body

De las 11 propiedades de `CustomerRequest`, **solo usa `email`**.

```json
{ "email": "cliente@correo.com" }
```

El controlador llama `blackwhitelist("Eliminar", email)` — solo 2 de los 6 parámetros. Los demás, incluido `lista`, quedan en cadena vacía.

## Response

### 200 — siempre

```json
""
```

**Cadena vacía tanto si borró como si no había nada que borrar.** La rama `Eliminar` del SP no devuelve resultset y el código usa `ExecuteReader` en vez de `ExecuteNonQuery`, así que nunca consulta las filas afectadas.

### 400 — sin `email` o body nulo

```json
{ "Message": "Datos incompletos" }
```

### 401 — sin token o token inválido

## Recorrido hasta la DMZ

```
Cliente → APIMagentoDMZ  POST customer/deleteCustomerList
        → Curl.Post()  ──── hoy va a URL_INTELISIS (legado)
        → la DMZ reenvía el string recibido
```

**Cutover: escrito, sin commitear ni desplegar (10 ago).** `curl.PostSAP(...)` ya figura en `APIMagentoDMZ\Controllers\CustomersController.cs`, pero el cambio sigue en el árbol de trabajo. En producción la DMZ todavía manda el tráfico al legado.

## Efectos

| Tabla | Acción | Campo |
|---|---|---|
| `ListaBlanca` | Delete | `Correo` |

**Nunca toca `ListaNegra`.** Aunque el método de negocio se llame `blackwhitelist`, la rama `Eliminar` del SP borra únicamente de la lista blanca. No hay forma de sacar un correo de la lista negra por esta vía.

Además, `@Lista` llega vacío y **el SP ni lo evalúa**: el `DELETE` se ejecuta para cualquier valor mientras `@Tipo = 'Eliminar'`.

## Diferencias contra el legado

Ninguna en el contrato. Solo cambia la base de destino, y que el SP nuevo referencia la columna `IdMagento` en vez de `Cliente` — irrelevante para esta operación, que filtra por `Correo`.

Se conservaron a propósito los dos comportamientos que parecen defectos: que solo borre de la lista blanca, y que ignore `@Lista`. Son el comportamiento actual en producción.

## ⚠️ Sin confirmación de efecto

Igual que E-02, la respuesta no distingue entre "se borró", "no había nada" y "falló la base". Ver la nota de [[E-02_setCustomerList]] sobre el fallo silencioso y el log.
