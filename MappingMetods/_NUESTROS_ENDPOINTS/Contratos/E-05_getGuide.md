---
tags: [contrato, endpoint, migracion, ola-3]
partida: E-05
actualizado: 2026-08-19
---

# E-05 — `order/getGuide`

Devuelve el **nombre del cliente** asociado a un `increment_id` de Magento.

> A pesar del nombre, la tabla `servicio_guias` **no guarda números de guía de paquetería**.
> Guarda el par `increment_id` → nombre del cliente, escrito durante la Fase 5 de `SetOrder`
> (`OrderMethods.cs:1551`, `SaveGuide(incrementId, NombreClienteMavi)`). Quien espere un
> tracking de mensajería no lo va a encontrar aquí.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `order/getGuide` |
| Ruta en ServicioSAP | `order/getGuide` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\OrderController.cs::GetGuideWithName` |
| Método | `Methods\Order\OrderMethods.cs::GetGuide` |
| Origen legado | `APIMagento\Controllers\OrdersController.cs:165` + `Metodos\OrderMethods.cs` |
| Almacén | SQLite, tabla `servicio_guias` |

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `IdEcommerce` | string | sí | `increment_id` de la orden de Magento. Se compara con `=`, sin comodines |

```json
{ "IdEcommerce": "86789" }
```

## Response

### 200 — guía encontrada

```json
{ "IdEcommerce": "86789", "FullName": "JUAN PEREZ LOPEZ" }
```

Las llaves van en **PascalCase**, a diferencia de E-06. Se emite con `Json(...)`, no con
`Ok(...)` — heredado del legado.

### 404 — solo cuando `IdEcommerce` es cadena vacía

Cuerpo vacío. Es el **único** caso que produce 404.

### 500 — guía inexistente, o `IdEcommerce` nulo

Cuerpo vacío. Dos causas distintas que el cliente no puede separar:

- **Guía no encontrada.** El `throw new HttpResponseException(NotFound)` está *dentro* del
  `try`, y el `catch (Exception)` de abajo lo captura y lo reemplaza por 500. El 404 que el
  código parece prometer nunca sale por esta vía.
- **`IdEcommerce` nulo** (body `{}` o `"IdEcommerce": null`). El legado hace
  `data.IdEcommerce.Equals("")` sin comprobar nulos: revienta con NullReferenceException
  *fuera* del try, y ASP.NET responde 500.

### 400 — body nulo

Guardián propio, no del legado: replica el 400 que la DMZ ya devuelve antes de reenviar
(`APIMagentoDMZ\Controllers\OrdersController.cs:202`). En la práctica el cliente nunca llega
a ServicioSAP con un body nulo.

### 401 — sin token

```json
{ "Message": "Se ha denegado la autorización para esta solicitud." }
```

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ  order/getGuide  (OrdersController.cs:199)
            → if (data == null) → 400
            → Curl.PostSAP("order/getGuide", ...)   ← cutover aplicado el 19 ago
            → ServicioSAP
            → Json(response) → cliente

La DMZ hace `return Json(curl.Post(...))` **sin `.Trim('"')`**. `curl.Post` devuelve un
`string`, así que la DMZ serializa un string y el cliente recibe **JSON escapado dentro de
una cadena**, no un objeto:

```
"{\"IdEcommerce\":\"86789\",\"FullName\":\"JUAN PEREZ LOPEZ\"}"
```

Quien integre tiene que deserializar dos veces. Es el comportamiento actual del legado y no
cambia con la migración.

**Cutover:** ⏳ escrito el 19 ago (`OrdersController.cs:206`), compila en 0 errores, **sin
commitear ni desplegar**. Hasta que se despliegue, el tráfico real sigue yendo al legado.

## Efectos

Ninguno. Solo lectura sobre `servicio_guias`.

## Pruebas ejecutadas — 19 ago 2026

Base de simulación sembrada con dos guías, porque `C:\inetpub\wwwroot\sap\data.db` vive en el
servidor y la carpeta no se pudo crear en el equipo de desarrollo (acceso denegado).

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | `IdEcommerce` existente (86789) | 200 + objeto | 200 `{"IdEcommerce":"86789","FullName":"JUAN PEREZ LOPEZ"}` | ✅ |
| 2 | Segunda guía (86790) | 200 + objeto | 200 `{"IdEcommerce":"86790","FullName":"MARIA GONZALEZ RUIZ"}` | ✅ |
| 3 | `IdEcommerce` inexistente | 500 | 500 | ✅ |
| 4 | `IdEcommerce` vacío | 404 | 404 | ✅ |
| 5 | `IdEcommerce` nulo | 500 | 500 | ✅ |
| 6 | Body vacío `{}` | 500 | 500 | ✅ |
| 7 | Sin token | 401 | 401 | ✅ |

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola3.http`.

## Diferencias contra el legado

Ninguna. Los casos 5 y 6 **sí divergían** en la primera corrida: una validación propia de
`IdEcommerce == null` devolvía 404 donde el legado da 500. Se retiró para restaurar la
paridad y se volvió a probar.

## Deuda heredada

- **El 404 documentado es inalcanzable** para el caso que importa. Una guía que no existe
  responde 500, igual que una consulta rota. Corregirlo exige sacar el `throw` del `try`
  —tocando también APIMagento— o aceptar la divergencia.
- **`GetGuide` no distingue "tabla ausente" de "sin resultados".** Si `servicio_guias` no
  existe en la base, cada llamada responde 500 sin decir por qué. Ver el riesgo de
  `SaveGuide` en [[ESTADO_PRUEBAS_Y_AVANCE]].
