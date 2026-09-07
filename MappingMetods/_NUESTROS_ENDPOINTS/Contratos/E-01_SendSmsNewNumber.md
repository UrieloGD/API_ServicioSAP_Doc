---
tags: [contrato, endpoint, migracion, ola-1]
partida: E-01
actualizado: 2026-09-03
---

# E-01 — credit/SendSmsNewNumber

Encola un SMS con código de verificación hacia un número nuevo, para validar el teléfono de un cliente durante el flujo de crédito.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta pública (DMZ) | `credit/SendSmsNewNumber` |
| Ruta en ServicioSAP | `credit/SendSmsNewNumber` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\CreditController.cs` |
| Método | `Methods\Credit\CreditMethods.cs::SendSmsNewNumber` |
| Origen legado | `APIMagento\Metodos\CreditMethods.cs:1992` |
| Base | `ServicioAndroid` (se queda; no afectada por la regla de destinos) |

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `Cliente` | string | de facto sí | Id del cliente. Se guarda tal cual en ambas tablas. **No se valida.** |
| `NumeroTelefono` | string | de facto sí | Teléfono destino. Se normaliza con `Regex.Replace(..., "[^0-9]", "")`, así que acepta guiones y espacios. **No se valida.** |
| `IdCarrito` | string | de facto sí | Id del carrito. Se usa para buscar o crear el código de verificación. **No se valida.** |
| `EsCredito` | bool | no | Selecciona la plantilla del mensaje. Ver tabla abajo. Default `false`. |

> **`Codigo`**: la DMZ declara este campo en su `SendSmsNewNumberRequest`, pero **ni el legado ni ServicioSAP lo leen**. Es un campo muerto en el contrato público.

"Obligatorio de facto" significa que el código no los valida, pero omitirlos produce basura en la base (ver Efectos).

### Efecto de `EsCredito`

| `EsCredito` | `IdMensaje` | `Identificador` |
|---|---|---|
| `true` | 23 | `DM0363` |
| `false` (o ausente) | 60 | `DM0312` |

### Ejemplo

```json
{
  "Cliente": "TEST-E01",
  "NumeroTelefono": "3324045368",
  "IdCarrito": "999999",
  "EsCredito": true
}
```

## Response

### 200 — encolado

```json
{ "result": 1 }
```

`result` es el número de filas insertadas en `TcAAEA00030_EnvioMensajes`.

### 200 con `result: -1` — fallo lógico

```json
{ "result": -1 }
```

**Un 200 no significa éxito.** El legado usa `-1` como código de fallo dentro de un 200: se devuelve si no se pudo obtener ni crear el `IdRef`, o si hubo excepción. Quien consuma este endpoint tiene que revisar `result`, no solo el status HTTP.

### 400 — request nulo

```json
{ "Message": "Datos incompletos." }
```

Solo cuando el body es literalmente `null`. Un `{}` **no** cae aquí (ver Diferencias).

### 401 — sin token o token inválido

```json
{ "Message": "Se ha denegado la autorización para esta solicitud." }
```

## Recorrido hasta la DMZ

```
Cliente → APIMagentoDMZ  POST credit/SendSmsNewNumber
                         (Controllers\CreditController.cs:303, método GetSmsNoNip)
                         valida request == null → 400
        → new Curl()   ──── autentica SIEMPRE contra la LAN primero (URL_INTELISIS)
                            ⚠️ si eso falla, la petición muere aquí con 500
        → Curl.PostSAP("credit/SendSmsNewNumber")  → URL_SAP → ServicioSAP
        → ServicioSAP devuelve {"result": n}
        → la DMZ hace  return Ok(JsonConvert.DeserializeObject(response));
        → Cliente recibe un OBJETO {"result": n}
```

**Patrón de la DMZ para este endpoint: `Ok(JsonConvert.DeserializeObject(response))`** — reenvía el objeto tal cual, sin recortar. No usa el `.Trim('"')` que sí aplican otros endpoints del mismo controller y que convierte la respuesta en string. Es decir: el cliente recibe un objeto JSON, no una cadena.

### Estado del cutover (6 ago)

| Dónde | Qué hay |
|---|---|
| Árbol de trabajo de `APIMagentoDMZ` | ✅ **`curl.PostSAP(...)`** en `Controllers\CreditController.cs:308` |
| Commiteado | ❌ No. El cambio está sin commitear en la rama `dbAndroid` |
| Desplegado | ❌ No. **En producción la DMZ sigue llamando `curl.Post(...)`**, o sea al legado |

Es decir: la conmutación está escrita pero no está en vigor. Y aun cuando se despliegue, **no basta**: la petición sigue muriendo con 500 si la LAN no autentica, porque el constructor de `Curl` la contacta antes de bifurcar. Ver los hallazgos del intento de cutover más abajo.

## Efectos

**⚠️ Efecto externo visible: encola un SMS real.** Un proceso de módem levanta las filas de `TcAAEA00030_EnvioMensajes` con `EstatusEnvio = 1` y las envía. Nunca ejecutar con un número que no sea de prueba.

Escribe en dos tablas de `ServicioAndroid`:

1. **`VTASDCodigoVerificacioneCommerce`** — solo si no existe ya un `IdRef` para ese par `Cliente`/`IdCarrito`. Inserta `FechaExpira = GETDATE() + 2 minutos`, `Estatus = 1` y el `Codigo`, que lo genera SQL Server:

   ```sql
   RIGHT('000000' + CAST(ABS(CHECKSUM(NEWID())) % 1000000 AS VARCHAR(6)), 6)
   ```

   **Seis dígitos numéricos** con ceros a la izquierda.

> 🔴 **Corregido el 31-ago: el formato del código había divergido.** ServicioSAP insertaba `LEFT(NEWID(), 8)` —ocho caracteres alfanuméricos— porque así estaba el legado cuando se migró E-01. La LAN lo cambió a seis dígitos numéricos el 24 ago (`970d5b1`, *"SmsNewNumber Alfanumerico a Numerico 6 digitos"*), después de nuestra migración. Se alinea antes de desplegar; de haber salido así, el cliente habría recibido un código con letras donde la pantalla espera números.
>
> Conviene revisar si hay más partidas ya migradas donde el legado se movió después.

> 🔴 **Corregido el 3-sep: un `?? ""` convertía un 500 del legado en un 200.** ServicioSAP
> normalizaba el teléfono con `Regex.Replace(request.NumeroTelefono ?? "", "[^0-9]", "")`.
> Con `NumeroTelefono` nulo, el legado revienta y devuelve 500; ServicioSAP respondía **200 y
> encolaba un SMS a un número vacío**. Se retiró el `?? ""` (`6669ba9`, `Refs: 12552`) y las
> dos versiones vuelven a dar 500.
2. **`TcAAEA00030_EnvioMensajes`** — la fila que el módem consume: `IdRegistro` = el `IdRef` anterior, `EstatusEnvio = 1`, `Telefono` ya normalizado.

## Las dos ramas del método

El comportamiento cambia según exista o no un código de verificación previo para el par `Cliente` + `IdCarrito`:

| Rama | Condición | Qué hace |
|---|---|---|
| **Alta** | `GetIdRef` devuelve `0` o vacío | Inserta en `VTASDCodigoVerificacioneCommerce` y luego encola el SMS |
| **Reutilización** | Ya existe un `IdRef` | **No crea código nuevo.** Encola el SMS apuntando al `IdRef` existente |

Ambas verificadas el **6-ago-2026 contra la base real**, con dos llamadas seguidas al mismo `Cliente C00000020` / `IdCarrito 86789`:

- **Alta** (`EsCredito: true`) → no existía código para ese par, así que creó el `4318D8FC` (Id 130258) y encoló `EnvioMensajes.Id 7135751` con `IdMensaje 23` / `DM0363`.
- **Reutilización** (`EsCredito: false`) → encontró el código recién creado, **no** generó otro, y encoló `EnvioMensajes.Id 7135752` con `IdMensaje 60` / `DM0312`, apuntando al mismo `IdRegistro 130258`.

Las dos filas comparten código de verificación y difieren solo en la plantilla del mensaje, que es exactamente el comportamiento del legado.

### ⚠️ La reutilización no mira la expiración

`GetIdRef` toma el `MAX(IdCodigoVerificacioneCommerce)` del par sin comparar contra `FechaExpira`. Como el código se crea con una ventana de **2 minutos** (`DATEADD(MINUTE, 2, GETDATE())`), cualquier segundo intento para el mismo `Cliente` + `IdCarrito` pasados esos 2 minutos **manda un SMS con un código ya vencido**, que el cliente no va a poder validar.

El legado se comporta igual — la condición es `if (idRef == "0")`, sin chequeo de vigencia —, así que es paridad, no una regresión. Pero es una trampa funcional real: quien reporte "me llegó el SMS pero el código no sirve" probablemente esté cayendo aquí.

### El binding de campos es case-insensitive

El payload de la prueba T4 mandó `idCarrito` en minúscula y ligó correctamente a `IdCarrito`. Web API deserializa con Json.NET, que ignora mayúsculas/minúsculas en los nombres de propiedad. No hay que preocuparse por el casing del cliente que consuma.

## Diferencias contra el legado

**Ninguna en el contrato.** Verbo, ruta, modelo, forma de la respuesta y códigos coinciden con `APIMagento`.

Diferencias de implementación, todas verificadas como equivalentes:

| | Legado | ServicioSAP |
|---|---|---|
| Inserción | `ExecuteReader()` + `RecordsAffected` | `ExecuteNonQuery()` — equivalente para un INSERT, y más correcto |
| `IdCarrito` en el `WHERE` | sin comillas | con comillas — SQL Server hace conversión implícita |
| Logging de errores | `Logger.SetOrder` / `Logger.CustomerService` | `Logger.SAP` — el `Console.WriteLine` original se perdía bajo IIS |

### Hueco de validación (heredado, no introducido)

Ni ServicioSAP ni la DMZ validan campos, solo `request == null`. Un body al que le falte `Cliente` o `IdCarrito` escribe filas basura y devuelve **200 `{"result":1}`**. Comprobado el 5-ago-2026: generó `TcAAEA00030_EnvioMensajes.Id = 7972` / `VTASDCodigoVerificacioneCommerce.Id = 103369`.

El legado tiene el mismo hueco en producción. Se documenta como está por paridad; corregirlo es una decisión aparte, y habría que hacerlo en los dos lados para no divergir.

> 🔴 **Corregido el 31-ago: `NumeroTelefono` era la excepción, y ahí sí divergíamos.** Esta ficha afirmaba que el hueco era idéntico en los dos lados, y no lo era. El legado hace `Regex.Replace(request.NumeroTelefono, ...)` **fuera del `try`**, así que un teléfono nulo lanza `ArgumentNullException`, nadie la atrapa y sale un **500**. ServicioSAP tenía un `?? ""` que lo evitaba: seguía adelante, encolaba un SMS con el teléfono vacío y respondía 200.
>
> Se quita el `?? ""`. Ahora un body sin `NumeroTelefono` —incluido `{}`— responde **500** en los dos lados, y ya no se encola nada. El hueco sigue abierto para `Cliente` e `IdCarrito`, que son cadenas y no revientan.

## Rectificación: la corrida del 5 ago fue contra una copia de la base

Lo que el 5 de agosto se documentó aquí como una incidencia de producción —el reloj del servidor 9 meses atrasado y el envío de SMS caído— **no era tal**. Ese día la cadena de conexión estaba resolviendo a una copia obsoleta: mismo `@@SERVERNAME` y misma base, pero `GETDATE()` en `2025-11-10` y `MAX(Id)` en 7 973, contra `2026-08-06` y 7 135 742 al día siguiente. Las filas de prueba de ese día ya no existen.

El canal de SMS funciona con normalidad en la base real. Los resultados de contrato del 5 ago siguen siendo válidos porque son comportamiento del código, y se re-verificaron el 6 ago; lo que no valía era el efecto en base.

**Lección operativa:** antes de dar por buena cualquier prueba contra `mavicbosandroid.grupomavi.com`, comprobar `GETDATE()` y `MAX(Id)` de la tabla que se vaya a tocar.

## Cuenta C y cuenta BP

El campo `Cliente` lleva hoy la **cuenta C** del legado (`C00000020`). En ServicioSAP el mismo cliente es la **cuenta BP**, que sustituye la `C` inicial por `15`: `C00000020` → `1500000020`.

Este endpoint **no traduce**: escribe en `ServicioAndroid` el valor que reciba, tal cual. Dos consecuencias a tener presentes antes de que algún consumidor empiece a mandar cuentas BP:

- `Cliente` es `varchar(10)` en las dos tablas. `C00000020` ocupa 9 caracteres; `1500000020`, exactamente 10. Sin margen: una cuenta con más dígitos se truncaría.
- `GetIdRef` busca por igualdad exacta de `Cliente`. Si un cliente que tenía códigos bajo `C00000020` empieza a llegar como `1500000020`, no casará con su histórico y se generará un código nuevo en vez de reutilizar el suyo.
- Al 6-ago-2026, en las últimas 5000 filas de `TcAAEA00030_EnvioMensajes` no hay ninguna cuenta en formato BP: todas son cuenta C.

**Decisión pendiente:** si el contrato público pasa a recibir cuenta BP, hay que decidir si este endpoint traduce a cuenta C antes de escribir en `ServicioAndroid`, o si esas tablas migran también.

**Cuenta BP acordada para pruebas:** `1500007539`. Cualquier prueba que necesite una cuenta BP usa ésa; no inventar otras.

## Hallazgos del intento de cutover (6 ago)

Se intentó ejercitar la cadena completa **DMZ → ServicioSAP** en local, con `curl.PostSAP` ya aplicado en `APIMagentoDMZ\Controllers\CreditController.cs:308` (cambio presente en el árbol de trabajo, **sin commitear**). La llamada devolvió `500` sin llegar nunca a ServicioSAP. Dos causas, las dos en `Helper\Curl.cs` de la DMZ:

### 1. El cutover no desacopla la DMZ del legado

El constructor de `Curl` autentica contra la LAN **incondicionalmente**, antes de cualquier bifurcación:

```csharp
public Curl()
{
    EnableTrustedHosts();
    using (var webClient = new WebClientCustom())
    {
        ...
        Token = webClient.UploadString(Ip + "login/authenticate", "POST", user);  // línea 68
    }
    try { TokenSAP = webClient.UploadString(IpSAP + "login/auth", "POST", userSAP); } ...
}
```

Ese primer bloque **no está dentro de un `try`**. Si la LAN no responde o no autentica, `new Curl()` lanza y la petición muere con 500 — aunque el endpoint fuera a usar `PostSAP` y no tocara la LAN para nada.

**Consecuencia en producción:** después del cutover, los endpoints servidos por ServicioSAP **siguen dependiendo de que la LAN esté arriba**. Una caída de APIMagento se llevaría también lo ya migrado. Conviene mover la autenticación LAN dentro de un `try`, o hacerla perezosa, antes de conmutar en serio.

### 2. La lista de hosts de confianza no puede casar nunca

`EnableTrustedHosts()` compara así:

```csharp
return TrustedHosts.Contains(request.RequestUri.Host);   // p. ej. "kdll3fhcyo-lan.grupomavi.com"
```

`RequestUri.Host` es el host pelado, pero `TrustedHosts` se llena con `DOMINIO_LAN` y `DOMINIO_SAP`, que en el `Web.config` guardan **URLs completas** (`https://kdll3fhcyo-lan.grupomavi.com/SAP/`). Ninguna comparación puede dar verdadero.

En la práctica el whitelist es código muerto: solo pasan los certificados que ya validan limpiamente por sí solos. Mientras los certificados de producción sean válidos no se nota, pero cualquier host con certificado autofirmado —o una cadena incompleta— fallará con "no se puede establecer una relación de confianza". Es lo que impidió la prueba local.

> Un detalle que confirma que es una regresión de configuración y no del código: el valor **comentado** de `DOMINIO_LAN` sí es un host pelado (`kdll3fhcyo-lan.grupomavi.com`). El activo es una URL.

### Qué falta para validar la cadena

Con el `Curl` tal como está, probar DMZ → ServicioSAP en local exige que la LAN real esté disponible y autenticando, más ajustar `DOMINIO_LAN`/`DOMINIO_SAP` a hosts pelados. Arreglar el punto 1 haría la prueba local posible sin depender del legado.

## Estado de la partida (6 ago)

**Desarrollo al 100 %.** El código está completo y verificado contra la base real: contrato, códigos HTTP, ambas ramas del método y ambos valores de `EsCredito`.

**⚠️ La generación del SMS no funcionó y queda pendiente de prueba a futuro.** El canal de envío lleva caído desde el `2026-08-05T23:04`, y falla igual para el tráfico del legado, así que no es atribuible a este endpoint. Cuando el módem vuelva a operar, basta una llamada al happy path para cerrar la validación.

**Falta también el cutover en la DMZ** (`curl.Post` → `curl.PostSAP`), sin el cual el tráfico real sigue yendo al legado.
