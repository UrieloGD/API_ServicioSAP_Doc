---
tags: [contrato, endpoint, migracion, ola-5]
partida: E-09
actualizado: 2026-08-23
---

# E-09 — `customerService/obtenerQuejas`

Devuelve el catálogo de quejas que puede levantar un cliente, para poblar el selector de
atención a clientes.

## Identidad

| | |
|---|---|
| Verbo | **POST** — un GET responde 405 |
| Ruta pública (DMZ) | `customerService/obtenerQuejas` |
| Ruta en ServicioSAP | `customerService/obtenerQuejas` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CustomerServiceController.cs::obtenerQuejas` |
| Método | `Methods\CustomerService\CustomerServiceMethods.cs::obtenerQuejasAsync` |
| Origen legado | `APIMagento\Controllers\CustomerServiceController.cs:86` + `Metodos\CustomerServiceMethods.cs:714` |
| Almacén | SQL Server, `ServicioAndroid.dbo.actes_catalogo_queja` en `MAVICBOSANDROID` |

> **El nombre de la conexión engaña.** El legado llama `intelisisConn` a su variable, pero la
> cadena que usa es `sCadenaConexionAndriod` → **ServicioAndroid**, que se queda
> (APIMagento: `Conn\Connection.cs:28`). No es IntelisisTmp; esta partida **no necesita
> equivalencia**. En ServicioSAP la variable ya no se llama así.

## Request body

**Ninguno.** El método no recibe parámetros.

## Response

### 200 — con filas

```json
[
  { "id": 57, "intencion": "COTIZAR ARTICULOS" },
  { "id": 60, "intencion": "ENTREGA EN DISTINTO DOMICILIO" },
  { "id": 18, "intencion": "ENTREGA TARDIA DE SUCURSAL" }
]
```

> ⚠️ **La columna de la base se llama `AliasQueja`, pero viaja como `intencion`.** Es el
> legado quien hace ese renombrado; conservarlo es obligatorio o se rompe al consumidor.

El filtro y el orden son del SQL, portado literal:

```sql
SELECT id, AliasQueja FROM actes_catalogo_queja WITH (NOLOCK)
WHERE queja != '' AND Estatus = 1 AND ISNULL(AliasQueja, '') <> ''
ORDER BY AliasQueja
```

### 200 con `null` — sin filas

Si ninguna fila pasa el filtro, el método devuelve **cadena vacía** —no `"[]"`— y
deserializarla da `null`. El cliente recibe `200` con cuerpo `null`.

### 405 — con verbo GET

La ruta es `[HttpPost]`, en paridad con la LAN.

### 500 — error de base

El método devuelve **el mensaje de la excepción** como si fuera la respuesta. No es JSON
válido, así que el `DeserializeObject` del controlador lanza `JsonReaderException` y sale un
500. El motivo queda en `C:\inetpub\wwwroot\log\sap.log`, que es lo único que se añadió
sobre el legado.

### 401 — sin token

## Recorrido hasta la DMZ

    Cliente → APIMagentoDMZ  customerService/obtenerQuejas  ([HttpPost])
            → Curl.PostSAP("customerService/obtenerQuejas")   ← cutover 21 ago
            → ServicioSAP
            → Ok(JsonConvert.DeserializeObject(response)) → cliente

La DMZ **deserializa y reenvía el objeto**, así que el cliente recibe un arreglo JSON de
verdad, no un string. Es el patrón bueno de los dos que conviven en la DMZ.

**Cutover:** ⏳ aplicado el 21 ago, **sin desplegar**.

> ✅ **Desalineo de verbo resuelto en ese cutover.** Desde el 28-jul (`6a55c6a`) la DMZ
> llamaba con `curl.Get(...)` a una ruta que en la LAN es `[HttpPost]`. Ahora usa
> `curl.PostSAP(...)`. La ruta pública de la DMZ sigue siendo `[HttpPost]`, así que el
> cliente final nunca notó nada.

## Efectos

Ninguno. Solo lectura.

## Pruebas ejecutadas — 23 ago 2026

Contra `MAVICBOSANDROID.ServicioAndroid`, con reloj verificado. La tabla tenía **92 filas**,
de las cuales **10** pasan el filtro.

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | POST con token | 200 + arreglo de 10 | 200, **10 elementos**, coincidiendo uno a uno con el SELECT | ✅ |
| 2 | └ forma de cada elemento | llaves `id` e `intencion` | `id`, `intencion` | ✅ |
| 3 | └ orden | por `AliasQueja` | `COTIZAR ARTICULOS`, `ENTREGA EN DISTINTO DOMICILIO`, `ENTREGA TARDIA DE SUCURSAL`… | ✅ |
| 4 | GET | 405 | 405 | ✅ |
| 5 | Sin token | 401 | 401 | ✅ |

Se contrastó el resultado contra un `SELECT` directo antes de llamar al endpoint, para no
dar por buena una respuesta que simplemente "trae algo".

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola5.http`.

## Diferencias contra el legado

Ninguna en el contrato. Un solo añadido que no cambia ninguna respuesta: el error de base
queda registrado en `sap.log`, donde el legado lo escribía en su propio log de
`CustomerService`.

## Deuda heredada

- **El error de base sale como 500 por accidente**, no por diseño: el método devuelve el
  texto de la excepción y es el deserializador quien revienta. Un cliente no puede
  distinguir "la base falló" de "la respuesta venía mal formada".
- **Sin filas devuelve `null`, no un arreglo vacío.** Un consumidor que itere sin comprobar
  nulos revienta el día que el catálogo quede vacío.
