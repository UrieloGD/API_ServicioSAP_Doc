---
tags: [pruebas, avance, migracion, estado]
fuente: "CHECKLIST_MIGRACION_LAN_A_SAP.md"
actualizado: 2026-09-03
---

# Estado de pruebas y avance por endpoint

Complemento del [[CHECKLIST_MIGRACION_LAN_A_SAP]]. El checklist dice **qué falta**; este documento dice **qué tan avanzado está cada endpoint y qué hay que revisar** en los que no están cerrados.

Las fichas de contrato de los endpoints ya probados están en [[Contratos/README|Contratos]].

## Cómo se calcula el porcentaje

Para que el número signifique algo y no sea una impresión, cada partida se mide contra hitos verificables.

**Endpoints (`E-xx`, `M-xx`)**

| Hito | Peso | Se da por cumplido cuando |
|---|---|---|
| Código escrito | 20 % | Controller, método y modelos existen |
| Compila | 15 % | Declarado en el `.csproj` y build en 0 errores |
| Pruebas de API | 25 % | Códigos HTTP, forma de respuesta y todas las ramas del método verificadas |
| Validación e2e | 20 % | Efecto real confirmado (fila en base, archivo escrito, mensaje entregado) |
| Cutover DMZ | 10 % | `curl.Post` → `curl.PostSAP` aplicado |
| Ficha de contrato | 10 % | Documentado en `Contratos\` |

**Habilitadores (`H-xx`)** — no tienen ruta ni DMZ, se miden distinto: código 40 %, compila 20 %, verificación funcional 40 %.

**Qué significa `[x]` en el checklist.** Marca **desarrollo terminado**, no "en producción". Una partida puede estar al 100 % y con `[x]` y aun así tener validaciones diferidas —a QA, o a que se despliegue algo— siempre que estén anotadas en su línea. El 100 % mide lo que depende del equipo de desarrollo; lo que depende de infraestructura o de un despliegue se registra aparte.

---

## Tabla de avance

### Ola 0 — Habilitadores

| Partida | Componente                  | %             | Pruebas                                                                          | Bloqueo                  |
| ------- | --------------------------- | ------------- | -------------------------------------------------------------------------------- | ------------------------ |
| H-01    | `obtenerConexionAdminDoc()` | **100 %**     | ✅ Conecta a `AdminDoc` y `ServicioAndroid`, base confirmada                      | —                        |
| H-02    | `Impersonation` (P/Invoke)  | **100 %** ⁽²⁾ | 🔶 No verificable fuera del servidor; se valida en QA                            | Validación diferida a QA |
| H-03    | `Curl` hacia la DMZ         | **100 %**     | ✅ Autentica contra `login/authenticate` de la DMZ y obtiene un JWT válido        | —                        |
| H-04    | `SQLiteDb.DefaultPath`      | **100 %** ⁽³⁾ | 🔶 Ruta y proveedor verificados; el archivo vive en el servidor, se valida en QA | Validación diferida a QA |

### Endpoints en alcance

| Partida | Endpoint                              | Ola | %        | Pruebas                 | Bloqueo principal                 |
| ------- | ------------------------------------- | --- | -------- | ----------------------- | --------------------------------- |
| E-01    | `credit/SendSmsNewNumber`             | 1   | **100 %** ⁽¹⁾ | ✅ Contrato y ambas ramas verificados el 6 ago contra la base real | Entrega del SMS sin verificar (canal caído) + cutover |
| E-02 | `customer/setCustomerList` | 2 | **90 %** | ✅ Alta verificada end-to-end contra SIGMAVI y SAP | Cutover |
| E-03 | `customer/getCustomerList` | 2 | **90 %** | ✅ Los tres valores de respuesta verificados con datos reales | Cutover sin desplegar |
| E-04 | `customer/deleteCustomerList` | 2 | **90 %** | ✅ Borrado efectivo verificado | Cutover sin desplegar |
| E-05 | `order/getGuide` | 3 | **80 %** | ✅ Los 7 casos verificados el 19 ago sobre base simulada | e2e contra la base real del servidor |
| E-06 | `credit/GetCreditAmounts` | 3 | **80 %** | ✅ Los 9 casos y las 3 ramas de campo verificados el 19 ago sobre base simulada | e2e real: depende de que M-03 llene la tabla |
| E-07 | `credit/guardardocumento` | 4 | **100 %** | ✅ Los 9 casos verificados el 20 ago contra AdminDoc real, con las filas comprobadas por SELECT | Despliegue |
| E-08 | `credit/SaveImagesProductosMx` | 4 | **100 %** ⁽⁴⁾ | ✅ Los 3 casos verificados el 20 ago: archivos en disco y fila de la selfie en AdminDoc | Despliegue + permisos de la carpeta |
| E-09 | `customerService/obtenerQuejas` | 5 | **90 %** | ✅ Los 5 casos verificados el 23 ago contra ServicioAndroid real, contrastados con un SELECT | Despliegue |
| E-10 | `customerService/bbvaKeyAdvanced` | 5 | **90 %** | ✅ Los 5 casos verificados el 23 ago contra el SOAP real de Multipagos | Despliegue |
| 🗑️ | ~~`credit/ExistRFCAndPhoneCte`~~ | 5 | — | — | **Descartado el 11 ago**, sin ID |
| 🗑️ | ~~`status/getStatus`~~ | 5 | — | — | **Descartado el 11 ago**, sin ID |
| E-11 | `customer/getCuenta` | 6 | **90 %** | ✅ Los 4 casos verificados el 25 ago contra la cadena completa DMZ + Magento | Despliegue |
| E-12 | `customer/setCuenta` | 6 | **80 %** | 🔶 Rama de error verificada el 25 ago; la escritura real no se ejecutó | Probar la escritura + despliegue |
| E-13 | `customer/cashCustomerReport` | 6 | **80 %** | 🔶 Validación y escritura local verificadas el 25 ago. **La copia al share no es verificable desde desarrollo** | Se valida en QA |
| E-14 | `product/obtenerImagen` | 6 | **55 %** ⁽⁵⁾ | 🔶 Solo el 401. **No es verificable desde desarrollo**: la impersonación falla antes de la copia | Se valida en QA |
| E-15 | `order/GetPickUpCode` | 7 | **35 %** ⁽⁶⁾ | ⏳ Sin probar: la tabla en SIGMAVI está vacía hasta que Dev 2 mueva los escritores | Depende de Dev 2 (10-11 sep) |
| E-47    | `credit/SolicitudMercancia`           | 7   | 0 %      | —                       | Conexión a definir por equipo SAP |
| E-48    | `credit/codigoPromocion`              | 8   | 0 %      | —                       | 🟠 Origen IntelisisTmp            |
| E-49    | `credit/getPlazos`                    | 8   | 0 %      | —                       | 🟠 Origen IntelisisTmp            |
| E-50    | `customerService/obtenerTipoGarantia` | 8   | 0 %      | —                       | 🔒 Estructura de Miguel Marín     |
| ➡️ | ~~`credit/GetUnificationWalletStatus`~~ | — | — | — | **Reasignado a Dev 2** el 12 ago |
| ➡️ | ~~`credit/SetUnificationWalletData`~~ | — | — | — | **Reasignado a Dev 2** el 12 ago |

> ✅ **Paridad contra el legado verificada por ejecución simultánea (1-3 sep)** en **E-01 a
> E-14**, con los dos servicios levantados a la vez sobre la misma base. Aparecieron **dos
> divergencias**, en E-01 y E-08, corregidas el mismo día. E-15 solo pudo contrastarse en las
> rutas que no tocan base. Los porcentajes no se mueven: el barrido confirma lo que ya estaba
> medido, y lo que falta en cada partida sigue siendo lo mismo. Detalle en el
> [barrido de paridad](#barrido-de-paridad--olas-1-a-7-1-3-sep).

⁽¹⁾ **E-01 al 100 % = desarrollo terminado**, por decisión del 6 ago. El código está completo y verificado contra la base real en todo lo que depende de nosotros. Quedan dos cosas fuera de nuestro control, que no descuentan del porcentaje pero **no están hechas**:

- **La generación del SMS no funcionó.** El canal lleva caído desde el 5-ago 23:04 y falla igual para el legado. Queda como **pendiente de prueba a futuro**: cuando el módem vuelva, basta una llamada para cerrarlo.
- **El cutover en la DMZ** está **commiteado y subido, pero no desplegado**: `curl.PostSAP` figura en `CreditController.cs:308` desde el commit `c7d1d29` de la rama `dbAndroid`. Hasta que esa rama se publique, en producción la DMZ sigue llamando a `curl.Post`, o sea al legado. Además, tal como está hoy el `Curl` de la DMZ, desplegarlo no bastaría — ver el riesgo del acoplamiento con la LAN.

⁽²⁾ **H-02 al 100 % = desarrollo terminado**, por decisión del 6 ago. La clase es réplica literal de la del legado y compila. La verificación funcional **no se puede hacer fuera del servidor**, así que se difiere al ambiente de **QA**.

Con qué expectativa entrar a QA: el fallo observado en desarrollo fue `Win32 1326` porque la cuenta `GRUPOMAVI\auxsvrwea05qai` no aparece en el dominio — y AD responde igual desde cualquier máquina, así que **QA podría dar el mismo error**. El matiz que justifica intentarlo: la consulta a AD se hizo con un usuario de dominio normal, y si el objeto de esa cuenta tiene lectura restringida pudo no aparecer aunque exista. Si QA vuelve a dar 1326, el diagnóstico y los siguientes pasos están en [[H-02_IMPERSONACION_SHARES]].

⁽³⁾ **H-04 al 100 % = desarrollo terminado**, por decisión del 6 ago. La ruta configurada es la correcta y el archivo `data.db` vive en el servidor, así que la apertura real de la base **solo se puede comprobar ahí**; se difiere a **QA**.

Lo que sí quedó verificado en desarrollo, que es todo lo que podía fallar por código o por despliegue:

- `DefaultPath` lee `SQLITE_DB_PATH` del `Web.config` y cae en un fallback con el mismo valor. Del placeholder roto `C:\AntigravityRoute` solo queda la mención en el comentario que documenta el fix.
- La cadena que se construye es correcta: `Data Source=C:\inetpub\wwwroot\sap\data.db`, sin barras duplicadas pese a que la ruta configurada termina en `\`.
- Los ensamblados están desplegados en `bin`: `System.Data.SQLite.dll` **y los dos interops nativos** (`x86\SQLite.Interop.dll`, `x64\SQLite.Interop.dll`). Faltar el interop es el fallo clásico al desplegar SQLite y aquí está cubierto.
- El proveedor **carga y opera**: abrir una base temporal, crear tabla, insertar y leer de vuelta funciona (motor 3.32.1).

Es decir: si en QA falla, será porque el archivo no está en esa ruta o por permisos del app pool sobre ella — no por el código ni por el despliegue.

### Endpoints mixtos — 🟠 todos dependen de definir la equivalencia de IntelisisTmp

| Partida | Endpoint | Ola | % | Nota |
|---|---|---|---|---|
| M-11 | `credit/validateSms` | 12 | 0 % | |
| M-12 | `credit/CreditoWeb_SaveData` | 12 | 0 % | |
| M-14 | `credit/CreditoWeb_SaveFirstData` | 12 | **25 %** | Código en el stash del 29-jul, sin integrar |
| M-15 | `customerService/bitacoraAtencionClientes` | 12 | 0 % | |
| M-01 | `credit/CreditoWeb_FormDatos` | 10 | 0 % | |
| M-02 | `credit/CreditoWeb_Informacion` | 10 | 0 % | |
| M-03 | `credit/SaveCredilanaInfo` | 10 | 0 % | Bloquea E-06 |
| M-06 | `credit/getSms` | 11 | 0 % | |
| M-13 | `credit/CreditoWeb_SaveData_Articulos` | 12 | 0 % | |
| M-07 | `credit/CreditoWeb_Seguro` | 11 | 0 % | |
| ➡️ | ~~`credit/GetPhoneValidatedClientSecretName`~~ | — | — | **Reasignado a Dev 2** el 12 ago |
| M-08 | `credit/SaveHaztenTransaction` | 11 | **25 %** | Código en el stash del 29-jul, sin integrar |
| M-04 | `credit/CreditoWeb_Solicitud` | 10 | 0 % | Mismo SP que M-02 |
| M-09 | `order/ManagePaynetOrders` | 11 | 0 % | Depende de `spAfectar`, declarado muerto |
| M-10 | `order/insertPaymentData` | 11 | 0 % | `CXCCMensajeWebHookOpenPay` |
| M-05 | `credit/CreditoWeb_SolicitudPrimerGuardado` | 10 | 0 % | Hermano de M-14 |

### Resumen

| | Partidas | Avance medio |
|---|---|---|
| Habilitadores (4) | **4 al 100 %** | **100 %** |
| Endpoints en alcance (19) | 3 al 100 %, 6 al 90 %, 4 al 80 %, 1 al 55 %, 1 al 35 %, 4 sin iniciar | 65,8 % |
| Mixtos (15) | 2 al 25 %, 13 sin iniciar | 3,3 % |
| **Total (38)** | | **44,7 %** |

> 🔴 **El total baja del 49,0 % al 44,7 %, y casi todo es una corrección, no un retroceso.**
> Dos cosas a la vez, el 31 ago:
>
> 1. **El denominador de los mixtos estaba mal.** Decía 12 y la tabla de arriba lista **15**
>    filas `M-xx`, contadas una a una. Con 12 el promedio de los mixtos salía 4,2 %; con 15
>    es 3,3 %. Eso solo ya baja el total al 45,1 %.
> 2. **Entró E-15 al 35 %**, por debajo de la media, que resta las cuatro décimas restantes.
>
> El trabajo hecho no cambió: cambió sobre cuántas partidas se promedia. La cuenta es
> `(4×100 + 1 250 + 50) ÷ 38`, donde 1 250 es la suma de los 19 endpoints y 50 la de los 15
> mixtos.

> ⚠️ **El denominador cambió el 25 ago, de 37 a 34.** La tabla decía "21 endpoints en alcance"
> pero solo lista **18** filas `E-xx`, y a esas les faltaba **E-14**, que sí está en el
> checklist maestro. Se agregó la fila y se recontó sobre lo que el documento realmente
> enumera, en vez de arrastrar un número que ya no cuadraba. Los porcentajes por partida no
> cambiaron; lo que cambió es sobre cuántas se promedian.

> **Al 31 ago, todo el código migrado y todos los cutovers están commiteados y subidos** a
> `dbAndroid` en los dos repositorios, hasta la Ola 6 inclusive. **Nada desplegado.** El
> avance medio no se movió respecto al 25 ago porque la rúbrica mide código, compilación,
> pruebas, e2e, cutover y ficha — no si el trabajo está subido.

La Ola 3 dejó sus dos endpoints al 80 %: les falta la validación e2e, que exige la base real
del servidor. **La Ola 4 es la primera que llega al 100 % con el cutover incluido**, porque
AdminDoc sí responde desde desarrollo y se pudo verificar cada fila. Lo que queda de E-07 y
E-08 ya no depende del equipo de desarrollo: es despliegue, y en el caso de E-08 confirmar
que el app pool pueda escribir en su carpeta.

⁽⁶⁾ **El 35 % de E-15 cubre código y compilación, y nada más.** No hay pruebas, ni e2e, ni
cutover, ni ficha. No es un bloqueo de entorno como los de arriba: el endpoint lee una tabla
que hoy nadie llena en SIGMAVI, porque los tres flujos que la escriben siguen en el legado y
son de Dev 2. Se puede probar antes insertando una fila a mano en `BpRecogePedidos`.

⁽⁵⁾ **E-14 no tiene cutover posible**: no existe ruta suya en la DMZ, así que ese 10 % de la rúbrica nunca se puede ganar. El 55 % cubre código, compilación y ficha; todo lo demás depende de H-02.

⁽⁴⁾ El 100 % de E-08 mide el desarrollo. Su validación e2e se hizo escribiendo en una carpeta
temporal, porque `C:\inetpub\wwwroot\sap` no se puede crear en el equipo de desarrollo. Que
la ruta definitiva sea escribible por el app pool está sin comprobar, y como el endpoint
responde `true` antes de intentarlo, un fallo de permisos no daría la cara.

---

## Detalle de las pruebas ejecutadas

Ordenadas de la ola más antigua a la más reciente, para que se lean como una progresión.
Cuando una ola tiene varias corridas, van también en orden cronológico.

### Ola 0 — 5 ago

No son endpoints, así que se verificó que sus dependencias respondan desde el equipo de desarrollo.

| Partida | Prueba | Resultado |
|---|---|---|
| H-01 | Abrir ambas cadenas y confirmar la base | ✅ `AdminDoc` y `ServicioAndroid`, instancia `MAVICBOSANDROID` |
| H-02 | `LogonUser` con credenciales del `Web.config` | ❌ `Win32 1326` |
| H-02 | ¿Existe la cuenta en el dominio? | ❌ **No existe.** `net user /domain` y una consulta ADSI a `grupomavi.com` coinciden: no se encuentra |
| H-02 | Alcance de red a los shares | ✅ `172.16.200.2` y `172.16.202.4` responden en el puerto 445 |
| H-03 | Levantar APIMagentoDMZ y autenticar | ✅ `POST https://localhost:44302/login/authenticate` con el payload de `USER_DMZ` → HTTP 200 y JWT de 3 segmentos |
| H-04 | Ruta configurada y presencia del archivo | ⚠️ `SQLITE_DB_PATH` correcto; la carpeta no existe en el equipo de desarrollo porque el archivo vive en el servidor |

**Sobre H-03:** en la corrida anterior quedó sin probar porque la DMZ local no estaba levantada. No era un fallo, era una precondición; con el proyecto `APIMagentoDMZ` corriendo en IIS Express, el helper autentica correctamente. Cerrado al 100 %.

**Sobre H-02 y la regla de paridad:** el `Win32 1326` no es una contraseña rota, es que **la cuenta de servicio no existe en el dominio**. Los tres valores del `Web.config` son idénticos a los que APIMagento lleva hardcodeados en `Conn\Connection.cs`, así que **el legado apunta exactamente a la misma cuenta inexistente**. Por paridad, esto no cuenta como fallo de la migración: es deuda heredada. La implicación incómoda es que la impersonación de APIMagento tampoco puede funcionar con esos valores, al menos desde una máquina del dominio `grupomavi.com`.

### Ola 0 — H-04, 6 ago

Corrida dedicada tras confirmar que `data.db` reside en el servidor y no puede abrirse desde desarrollo.

| Comprobación | Resultado |
|---|---|
| Build | ✅ 0 errores |
| `DefaultPath` lee `SQLITE_DB_PATH` con fallback | ✅ Ambos valores son `C:\inetpub\wwwroot\sap\` |
| Rastro del placeholder `C:\AntigravityRoute` | ✅ Solo queda en el comentario que documenta el fix |
| Cadena de conexión construida | ✅ `Data Source=C:\inetpub\wwwroot\sap\data.db`, sin barras duplicadas |
| Ensamblados en `bin` | ✅ `System.Data.SQLite.dll` + interops nativos `x86` y `x64` |
| El proveedor abre, escribe y lee | ✅ Base temporal: crear tabla, insertar y leer de vuelta (motor 3.32.1) |
| Abrir la base real | ⏸️ No aplicable fuera del servidor — se valida en QA |

#### Ejemplo de request y response — Ola 0

**No aplica.** Los cuatro habilitadores son infraestructura, no endpoints: no tienen ruta HTTP
ni contrato que ejercitar. Se verifican por código, cadena de conexión y ensamblados, como
muestran las dos tablas de arriba.

### Ola 1 — E-01, 5 ago (contra una copia — resultados de efecto no válidos)

Ficha completa en [[E-01_SendSmsNewNumber]]. Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola1.http`.

| Caso | Esperado | Obtenido | |
|---|---|---|---|
| Sin token | 401 | 401 | ✅ |
| Ruta inexistente | 404 | 404 | ✅ |
| Body `null` | 400 | 400 `"Datos incompletos."` | ✅ |
| Body `{}` | 400 | **200 y escribió** | ⚠️ |
| Alta — cliente nuevo | 200 `{"result":1}` | 200, creó código, fila 7973 | ✅ |
| Reutilización — cliente real | 200 sin código nuevo | 200, reutilizó `IdRef 102892`, fila 7974 | ✅ |

Cubiertas las dos ramas del método. `EsCredito` mapea correcto (`true` → `IdMensaje 23`/`DM0363`, `false` → `60`/`DM0312`). El binding de propiedades es case-insensitive.

> ⚠️ **Estos resultados se tomaron contra una copia, no contra la base real.** Ver la nota de rectificación abajo. Los códigos HTTP y la forma de las respuestas siguen siendo válidos (son comportamiento del código y se re-verificaron el 6 ago contra la base real), pero **el efecto en base y la entrega del SMS no quedaron validados**: las filas 7972, 7973 y 7974 ya no existen. No hay nada que limpiar.

### Ola 1 — E-01, 6 ago (contra la base real)

Corrida de validación después de descubrir que la del 5 ago fue contra una copia.

| Caso | Esperado | Obtenido | |
|---|---|---|---|
| `login/auth` | 200 + JWT | 200, JWT de 3 segmentos | ✅ |
| Sin token | 401 | 401 | ✅ |
| Ruta inexistente | 404 | 404 | ✅ |
| Body `null` | 400 | 400 `"Datos incompletos."` | ✅ |
| `EsCredito: true` — rama de alta | 200, crea código, `IdMensaje 23`/`DM0363` | 200, código `4318D8FC` (Id 130258), fila 7135751 | ✅ |
| `EsCredito: false` — rama de reutilización | 200, sin código nuevo, `IdMensaje 60`/`DM0312` | 200, reutilizó 130258, fila 7135752 | ✅ |

Las dos llamadas usaron el mismo `Cliente C00000020` / `IdCarrito 86789`, así que la primera ejercitó el alta y la segunda la reutilización. Comparten código de verificación y difieren solo en la plantilla — comportamiento idéntico al legado.

**Entrega del SMS: bloqueada por entorno.** El módem levantó ambas filas y fue acumulando reintentos sin marcarlas enviadas. No es nuestro: **el canal de SMS lleva caído desde el 5-ago 23:04**, y el tráfico de la LAN de esta misma mañana falla igual. Ver el incidente en el informe.

#### Ejemplo de request y response — Ola 1

**`POST credit/SendSmsNewNumber`** · `Authorization: Bearer <jwt>`

```json
{
  "Cliente": "C00000020",
  "NumeroTelefono": "3324045368",
  "IdCarrito": "86789",
  "EsCredito": true
}
```

**200 — la inserción ocurrió**

```json
{ "result": 1 }
```

El número es el conteo de filas afectadas por el `INSERT`, no un código de estado.

**200 — fallo**

```json
{ "result": -1 }
```

> ⚠️ **Un fallo también sale con código 200.** El `-1` es el único aviso, y llega en el
> cuerpo. Quien no lo inspeccione dará por enviado un SMS que nunca se encoló.

**400 — body nulo**

```json
{ "Message": "Datos incompletos." }
```

### Ola 2 — E-02, E-03, E-04, 7 ago

Primera corrida tras escribir los tres endpoints en ServicioSAP y los scripts de base en el repo MaviSAP.

| Caso | Esperado | Obtenido | |
|---|---|---|---|
| Las tres rutas sin token | 401 | 401 en las tres | ✅ |
| Ruta inexistente bajo `customer/` | 404 | 404 | ✅ |
| `set` con body `{}` | 400 "Datos incompletos" | 400 "Datos incompletos" | ✅ |
| `set` con `list = "morada"` | 400 "Lista invalida" | 400 "Lista invalida" | ✅ |
| `get` sin email | 400 | 400 "Datos incompletos" | ✅ |
| `delete` sin email | 400 | 400 "Datos incompletos" | ✅ |
| `get` con correo conocido | `"black"` | `"No esta en listas"` con **la base rota** | ⛔ |

**Hallazgo principal — el fallo silencioso demostrado.** El último caso devolvió `200 "No esta en listas"`, una respuesta perfectamente plausible. El log revela lo que de verdad pasó:

```
[CUSTOMER blackwhitelist ERROR] tipo=Consultar lista=Negra  => Could not find stored procedure 'SpListaNBMagento'.
[CUSTOMER blackwhitelist ERROR] tipo=Consultar lista=Blanca => Could not find stored procedure 'SpListaNBMagento'.
```

Sin mirar el log, esa prueba habría pasado por buena. Es la consecuencia directa de la decisión de conservar la opacidad del legado, y la razón de que estos endpoints **no puedan validarse solo por su respuesta HTTP**.

**Hallazgo positivo:** ServicioSAP **sí conecta a SIGMAVI**. El error es "no existe el SP", no un fallo de login — llegó al servidor y ejecutó. Es la primera confirmación de que `obtenerConexionSigMavi` funciona, y contrasta con que mi usuario de dominio no puede conectarse directo a DEVMAVI.

**No se ejecutaron E-02 ni E-04.** Ambos escriben, y sin el SP desplegado habrían fallado igual sin probar nada. Se corren cuando la base esté lista.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola2.http`.

### Ola 2 — segunda corrida, 10 ago

Los scripts ya se ejecutaron en DEVMAVI, así que esta vez la capa de base sí respondió.

| Caso | Esperado | Obtenido | |
|---|---|---|---|
| Build | 0 errores | 1 error `CS0103` por un residuo de renombre (`executa` → `execute`); corregido | ✅ |
| Las tres rutas sin token | 401 | 401 | ✅ |
| `set` con body `{}` | 400 "Datos incompletos" | igual | ✅ |
| `set` con `list = "morada"` | 400 "Lista invalida" | igual | ✅ |
| `get` con correo conocido | respuesta real | `"No esta en listas"` **sin errores en el log** | ✅ |

**El SP está desplegado.** A diferencia de la corrida del 7 ago, no apareció ninguna línea en `sap.log`, lo que confirma que las dos consultas se ejecutaron sin excepción. Las tablas están vacías —no se migraron datos—, así que `"No esta en listas"` es la respuesta correcta.

**No se ejecutaron E-02 ni E-04**: ambos escriben y, además, E-02 está bloqueado por el hallazgo de abajo.

### Ola 2 — tercera corrida, 10 ago: PASA

Con el campo de correo corregido a `Mail` y el SP ya desplegado, la ola se validó completa.
La secuencia se diseñó para que cada paso verificara al anterior a través de `getCustomerList`.

| # | Acción | Respuesta | Verificación posterior | |
|---|---|---|---|---|
| 1 | Alta en **negra** de `urielVal69@gmail.com` | `""` (200) | `get` → `"black"` | ✅ |
| 2 | Alta en **blanca** del mismo correo | `""` (200) | `get` → sigue `"black"` | ✅ |
| 3 | **Borrado** | `""` (200) | `get` → sigue `"black"` | ✅ |

Lo que demuestra cada paso:

1. **El alta funciona de verdad.** Que `get` devuelva `"black"` prueba tres cosas a la vez: la validación contra SAP con `Mail` encuentra al cliente, el SP inserta, y E-03 lee correctamente. Con `zEmail` esto habría devuelto `"No esta en listas"` y no se habría insertado nada.
2. **Las validaciones cruzadas del SP funcionan.** El alta en blanca se rechazó en silencio porque el correo ya estaba en negra, que es la regla del legado.
3. **`deleteCustomerList` no toca la lista negra**, confirmando el comportamiento documentado.

Sin una sola línea de error en `sap.log` durante toda la secuencia.

**Fila de prueba en DEVMAVI:** `urielVal69@gmail.com` quedó en `ListaNegra`, con `IdMagento = 1067287`. Es la única fila de las dos tablas.

**Lo que no se pudo verificar:** el borrado efectivo de un correo que sí esté en la lista blanca. Para llegar a esa situación hace falta un correo que no esté en negra, y el único BP de pruebas con correo es `urielVal69@gmail.com`, que se usó para el alta en negra. E-04 queda con su rama positiva sin probar.

### Ola 2 — cuarta corrida, 10 ago: cobertura completa

Cerrada la única rama que quedaba sin probar, la del borrado efectivo. Hizo falta un BP con correo distinto al usado en el alta en negra; se localizó `1500007540` (`za210111533@zapopan.tecmm.edu.mx`) probando la ruta `partner/client/{id}`.

| # | Acción | Respuesta | Verificación | |
|---|---|---|---|---|
| 0 | Estado inicial | — | `get` → `"No esta en listas"` | ✅ |
| 1 | Alta en **blanca** | `""` (200) | `get` → **`"white"`** | ✅ |
| 2 | **Borrado** | `""` (200) | `get` → `"No esta en listas"` | ✅ |

Con esto quedan cubiertas **todas** las ramas del módulo:

| Rama | Cómo se probó |
|---|---|
| Alta en negra | corrida 3 — `get` devolvió `"black"` |
| Alta en blanca | corrida 4 — `get` devolvió `"white"` |
| Rechazo por duplicado en negra | corrida 3 — el alta en blanca no cambió el `"black"` |
| Borrado efectivo | corrida 4 — el correo desapareció de la lista |
| El borrado no toca la negra | corrida 3 — tras borrar seguía en `"black"` |
| Los tres valores de E-03 | `"black"`, `"white"` y `"No esta en listas"`, todos observados |

Sin errores en `sap.log` en ninguna de las dos corridas.

**Estado de las tablas en DEVMAVI:** queda una sola fila, `urielVal69@gmail.com` en `ListaNegra` con `IdMagento 1067287`. El correo de esta corrida se borró como parte de la propia prueba.

**Regresión:** antes de escribir se comprobó que la fila de la corrida anterior seguía devolviendo `"black"`.

#### Ejemplo de request y response — Ola 2

**E-02 · `POST customer/setCustomerList`** — de las 11 propiedades del modelo usa 5

```json
{
  "name": "Hector Jimenez",
  "email": "cliente@correo.com",
  "idMagento": "1067287",
  "list": "black",
  "address": "Av. Vallarta 1234, Guadalajara"
}
```

**200 — se haya insertado o no**

```json
""
```

> ⚠️ **Cadena vacía siempre.** La rama `Insertar` del SP no devuelve resultset, así que desde
> la respuesta es imposible saber si el alta ocurrió, si la bloqueó una validación o si falló
> la base. Es el comportamiento del legado y se conservó a propósito.

**400**

```json
{ "Message": "Datos incompletos" }   // falta alguno de los 5 campos, o body nulo
{ "Message": "Lista invalida" }      // list no es "white" ni "black"
```

**E-03 · `POST customer/getCustomerList`** — de las 11 propiedades usa solo `email`

```json
{ "email": "cliente@correo.com" }
```

**200 — tres valores posibles**

```json
"black"              // está en ListaNegra
"white"              // no está en negra, pero sí en ListaBlanca
"No esta en listas"  // no está en ninguna
```

Los tres se observaron en las corridas. El SP devuelve siete columnas —`Lista`, `NumPedido`,
`Nombre`, `Correo`, `Direccion`, `IdMagento`, `FechaRegistro`— pero **el código solo mira si
hubo filas**: todas se descartan y no llegan al cliente.

**E-04 · `POST customer/deleteCustomerList`**

```json
{ "email": "cliente@correo.com" }
```

**200 — siempre**

```json
""
```

Cadena vacía tanto si borró como si no había nada que borrar: el código usa `ExecuteReader`
en vez de `ExecuteNonQuery`, así que nunca consulta las filas afectadas.

### Ola 3 — E-05 y E-06, 19 ago (sobre base simulada)

**Por qué simulada.** `C:\inetpub\wwwroot\sap\data.db` vive en el servidor, y en el equipo de
desarrollo no se pudo crear esa carpeta (acceso denegado). Se levantó una base SQLite
equivalente, se ejecutó el script `01_CrearTablas_Ola3.sql` tal como está en el repo, se
añadió `servicio_guias` a mano —el script la trae comentada, igual que el legado— y se sembró:
2 guías y 3 filas de `mavi_credilana_info` con `uen = 1`. El `Web.config` se apuntó ahí
temporalmente y **se restauró al terminar**.

Esto valida contrato y lógica, **no** el acceso a la base real. Es el único hito que les falta:
por eso ambos quedan al **80 %** y no al 100 %.

#### E-05 `order/getGuide` — PASA

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | `IdEcommerce` = 86789 | 200 + objeto | 200 `{"IdEcommerce":"86789","FullName":"JUAN PEREZ LOPEZ"}` | ✅ |
| 2 | `IdEcommerce` = 86790 | 200 + objeto | 200 `{"IdEcommerce":"86790","FullName":"MARIA GONZALEZ RUIZ"}` | ✅ |
| 3 | `IdEcommerce` inexistente | 500 | 500 | ✅ |
| 4 | `IdEcommerce` vacío | 404 | 404 | ✅ |
| 5 | `IdEcommerce` nulo | 500 | 500 | ✅ |
| 6 | Body vacío `{}` | 500 | 500 | ✅ |
| 7 | Sin token | 401 | 401 | ✅ |

#### E-06 `credit/GetCreditAmounts` — PASA

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | `nuevo` + `CREDITO` | 200, `montos_cte_nuevo` | 200, máximo 15000.00 | ✅ |
| 2 | `nuevo` + `APERTURA` | 200, `montos_cte_nuevo_apertura` | 200, máximo 8000.00 | ✅ |
| 3 | `nuevo` sin `tipo` | 200, rama de apertura | 200, máximo 8000.00 | ✅ |
| 4 | `casa` | 200, `montos_cte_casa` | 200, máximo 50000.00 | ✅ |
| 5 | `articulo` desconocido | 400 | 400 | ✅ |
| 6 | uen sin fila (99) | 500 | 500 + motivo en `sap.log` | ✅ |
| 7 | `articulo` nulo | 500 | 500 | ✅ |
| 8 | Body vacío `{}` | 500 | 500 | ✅ |
| 9 | Sin token | 401 | 401 | ✅ |

Las tres ramas de selección de campo se sembraron con montos distintos, que es lo que
demuestra que el enrutado por `articulo`/`tipo` funciona y no que "responde algo".

#### 🔴 Cinco divergencias contra el legado, detectadas y corregidas en la misma corrida

La primera pasada dio verde en los caminos felices y **rojo en los de error**. Ninguna se
habría visto probando solo el caso bueno:

| Endpoint | Caso | Legado | ServicioSAP (1ª corrida) | Corregido a |
|---|---|---|---|---|
| E-06 | uen sin fila | 500 | **200 con cuerpo `null`** | 500 |
| E-06 | `articulo` nulo | 500 | 400 | 500 |
| E-06 | body `{}` | 500 | 400 | 500 |
| E-05 | `IdEcommerce` nulo | 500 | 404 | 500 |
| E-05 | body `{}` | 500 | 404 | 500 |

**La más peligrosa era la primera.** `GetCredilanaInfo` devolvía `default(T)` cuando no había
fila, y el controlador lo entregaba como `Ok(null)`: un 200 con cuerpo `null`. Un consumidor
que no comprueba nulos lo lee como *"este cliente no tiene monto disponible"* en lugar de como
un fallo de lectura. La versión anterior del código afirmaba en un comentario que "el código
HTTP resultante es el mismo" — la ejecución demostró que no.

Las otras cuatro venían de validaciones defensivas propias (`!= null`) que devolvían 400 o 404
donde el legado revienta con NullReferenceException y responde 500.

**Cómo se corrigió.** `GetCredilanaInfo` lanza ahora una excepción explícita en vez de devolver
`default(T)`, y se retiraron las comprobaciones de nulo de `articulo` e `IdEcommerce`. Se
conserva el guardián de `req == null`, que replica el 400 que la DMZ ya devuelve antes de
reenviar. Rebuild en 0 errores y las 16 pruebas se volvieron a ejecutar: todas alineadas.

**Ganancia sobre el legado, sin cambiar el contrato:** donde APIMagento deja un 500 mudo,
ServicioSAP escribe el motivo en `C:\inetpub\wwwroot\log\sap.log` con el par (campo, uen).

#### Ejemplo de request y response — Ola 3

**E-05 · `POST order/getGuide`**

```json
{ "IdEcommerce": "86789" }
```

**200 — guía encontrada.** Llaves en `PascalCase`, y se emite con `Json(...)`, no con `Ok(...)`

```json
{ "IdEcommerce": "86789", "FullName": "JUAN PEREZ LOPEZ" }
```

**500 — guía inexistente**, con cuerpo vacío. El `throw` de NotFound cae dentro del `try` y el
`catch` lo reconvierte, así que **"no encontrada" y "falló la consulta" son indistinguibles**.
El 404 solo sale con `IdEcommerce` como cadena vacía.

**E-06 · `POST credit/GetCreditAmounts`**

```json
{ "articulo": "nuevo", "uen": 1, "tipo": "CREDITO" }
```

**200.** Llaves en `snake_case`, al revés que E-05

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

**400** con `articulo` distinto de `"nuevo"` y `"casa"`. **500** cuando no hay fila para ese
par `(campo, uen)` — con el motivo en `sap.log`, que es lo único añadido sobre el legado.

> Los datos del ejemplo son los que se sembraron en la base simulada; con `mavi_credilana_info`
> vacía en el servidor, hoy este endpoint responde **500 a todo**.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola3.http`.
Fichas: [[E-05_getGuide]], [[E-06_GetCreditAmounts]].

### Ola 4 — E-07 y E-08, 20 ago (contra AdminDoc real)

Primera ola que se valida **end-to-end de verdad**: AdminDoc responde desde el equipo de
desarrollo, así que se pudo escribir en `MAVI_DOC_CTE` y comprobar cada fila con un SELECT.
Antes de empezar se verificó que la conexión no fuera una copia: servidor `MAVICBOSANDROID`,
base `AdminDoc`, reloj correcto.

BP de pruebas `1500007539`. Las **cinco filas creadas se borraron al terminar**, con residuo
comprobado en cero.

Solo la carpeta de imágenes de E-08 tuvo que simularse: `C:\inetpub\wwwroot\sap` no se puede
crear en el equipo de desarrollo (acceso denegado), así que `IMAGES_CREDIT_PATH` se apuntó a
un directorio temporal y el `Web.config` se restauró después.

#### E-07 `credit/guardardocumento` — PASA

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Rama Cliente, BP, TipoDoc 14 | 200 + fila con CLAVE = BP | 200; `CLAVE=1500007539`, `DIR=''`, `ID_EXTERNO=OLA4-1`, `ID_FOTO=1`, `FORMATO=IMG` | ✅ |
| 2 | Rama Token, `C00000020`, TipoDoc 13 | 200 + fila con DIR | 200; `CLAVE=''`, `DIR=C00000020`, `ID_EXTERNO` e `ID_FOTO` **nulos**, `FORMATO=PDF` | ✅ |
| 3 | `Cliente` de un solo carácter | 200, rama Token, sin excepción | 200; `DIR=X`, `FORMATO` nulo | ✅ |
| 4 | `Aval` = `"SI"` | 500 por conversión a bit | 500, conversión fallida | ✅ |
| 5 | `Aval` = `"1"`, TipoDoc 23 | 200, `AVAL = 1` | 200; `AVAL=True`, `ID_FOTO=10` | ✅ |
| 6 | TipoDoc 999 | 500 por FK | 500, `FK_MAVI_DOC_CTE_TIPO_DOC` | ✅ |
| 7 | Base64 inválido | 500 antes del INSERT | 500 | ✅ |
| 8 | Body nulo | 400 | 400 `Invalid JSON payload` | ✅ |
| 9 | Sin token | 401 | 401 | ✅ |

#### E-08 `credit/SaveImagesProductosMx` — PASA

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Lote completo: 2 INE + selfie + prueba de vida | 200 `true` inmediato | 200 `true` en **179 ms** | ✅ |
| 1a | └ archivos, tras ~12 s | 3 archivos, sin prueba de vida | `ola4_ine_frente_1.jpg`, `ola4_ine_reverso_2.jpeg`, `ola4_selfie_3.jpg` | ✅ |
| 1b | └ fila de la selfie | `CLAVE` = BP, `IDAPLICACION` 7 | `CLAVE=1500007539`, `IDAPLICACION=7`, `FORMATO=IMG`, 975 bytes | ✅ |
| 2 | Body nulo | 400 | 400 `Datos incompletos.` | ✅ |
| 3 | Sin token | 401 | 401 | ✅ |

Los 179 ms miden la parte importante: el endpoint **respondió `true` antes de haber hecho
nada**. Los archivos aparecieron diez segundos más tarde.

#### La adaptación al formato de cuenta

Es el cambio de fondo de esta ola, y no es paridad literal. El legado decide en qué columna
guarda el documento preguntando `(start == "C" || start == "P") && Length <= 11`. Con la
cuenta migrada a Business Partner esa condición es **siempre falsa**, así que todo cliente
real habría caído en la rama Token: `CLAVE` vacía y el BP en `DIR`.

Eso los volvería invisibles. `SpMaviConsultaDoc`, el SP que el propio equipo escribió **para
la era SAP** en el repo MaviSAP, los busca con `WHERE C.CLAVE IN (@BF, @CUENTA)` y
`C.Clave = S.BP`, con `@CUENTA` declarado `varchar(10)` — el ancho exacto de un BP.

Se cambió a `StartsWith("15") && Length <= 10`, propuesto por el usuario. El caso 3 de la
tabla es el que lo valida: una cadena de un carácter no revienta y sigue yendo a Token.

#### 🔴 Dos divergencias contra el legado, detectadas y corregidas antes de probar

Ambas eran guardas defensivas propias, del mismo tipo que las cinco de la Ola 3:

| Endpoint | Caso | Legado | Primera versión | Corregido a |
|---|---|---|---|---|
| E-08 | `Ine` nulo con `Selfie` presente | no guarda nada | guardaba la selfie | no guarda nada |
| E-08 | excepción en el controlador | 200 con el **string** `"false"` | 400 con el mensaje | 200 `"false"` |

La primera es la que importaba: el legado revienta al recorrer `request.Ine` y aborta el lote
completo, así que la selfie tampoco se guarda. Con la guarda puesta sí se guardaba — una
diferencia observable en disco y en base.

#### Hallazgos sobre la tabla, que no estaban documentados

- **`ID` es `uniqueidentifier` con `newid()`**, no un entero. No hay `MAX(ID)` que sirva para
  localizar una fila recién insertada.
- **`CLAVE` es `varchar(10)` y un BP mide exactamente 10.** Cero margen.
- **`UsuarioCarga` es `varchar(10)`.** La primera corrida falló entera con *"String or binary
  data would be truncated"* porque la marca de prueba tenía 11 caracteres.
- **`AVAL` es `bit`**, pero el parámetro viaja como `VarChar`: cualquier valor no numérico
  tumba el INSERT.
- **`TIPO_DOC` tiene FK contra `MAVI_TIPO_DOC`.** Un tipo inexistente da 500.

#### Corrección: E-08 no necesita impersonación

El comentario de `Helpers\Impersonation\Impersonation.cs` daba a E-08 por dependiente de
H-02. Es falso: el legado escribe en una ruta **local** del servidor
(`APIMagento\Metodos\CreditMethods.cs:1024-1029`), no en un share SMB. Se corrigió el
comentario. **E-08 nunca estuvo bloqueado por H-02.**

#### Ejemplo de request y response — Ola 4

**E-07 · `POST credit/guardardocumento`** — la DMZ recibe `multipart/form-data` y lo traduce a
este JSON antes de reenviar, así que ServicioSAP siempre ve JSON

```json
{
  "Cliente": "1500007539",
  "TipoDoc": 14,
  "UsuarioCarga": "OLA4TEST",
  "idVenta": "OLA4-1",
  "FileInputBase64": "iVBORw0KGgoAAAANSUhEUg..."
}
```

**200**

```json
{ "Success": true, "Message": "Información almacenada correctamente" }
```

Fila resultante en `MAVI_DOC_CTE`, rama **Cliente** porque la cuenta empieza por `15` y mide 10:

| CLAVE | DIR | ID_EXTERNO | ID_FOTO | FORMATO | IDAPLICACION |
|---|---|---|---|---|---|
| `1500007539` | `''` | `OLA4-1` | `1` | `IMG` | `24` |

Con `"Cliente": "C00000020"` entra por la rama **Token** y la fila sale distinta: `CLAVE` vacía,
`DIR = C00000020`, y **`ID_EXTERNO` e `ID_FOTO` nulos** — esa rama los pierde.

**500** con el mensaje de la excepción en el cuerpo. Causas observadas: `Aval` con texto no
numérico —la columna es `bit`—, `TipoDoc` inexistente —hay FK contra `MAVI_TIPO_DOC`—, Base64
inválido, o un campo más largo que su columna.

**E-08 · `POST credit/SaveImagesProductosMx`**

```json
{
  "Account": "1500007539",
  "Ine": [
    { "Name": "ola4_ine_frente",  "Data": "iVBORw0K...", "Mime": "png"  },
    { "Name": "ola4_ine_reverso", "Data": "iVBORw0K...", "Mime": "jpeg" }
  ],
  "Selfie": { "Name": "ola4_selfie", "Data": "iVBORw0K...", "Mime": "png" },
  "PruebaDeVida": [ { "Name": "ola4_vida", "Data": "iVBORw0K...", "Mime": "png" } ]
}
```

**200 en 179 ms**

```
true
```

> ⚠️ **Ese `true` no significa nada.** Sale antes de intentar guardar: el trabajo ocurre 10
> segundos después, en un `Task` suelto. Los archivos aparecieron en disco pasado ese tiempo:
> `ola4_ine_frente_1.jpg`, `ola4_ine_reverso_2.jpeg`, `ola4_selfie_3.jpg`.

Se ve ahí el parche de mime heredado —lo que no es exactamente `"jpeg"` pasa a `"jpg"`—, la
numeración con la selfie al final, y que **`PruebaDeVida` se ignora**: no generó archivo ni
fila. Solo la selfie llega a `MAVI_DOC_CTE`, con `IDAPLICACION 7` en vez del 24 de E-07.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola4.http`.
Fichas: [[E-07_guardardocumento]], [[E-08_SaveImagesProductosMx]].

### Ola 5 — E-09 y E-10, 23 ago (contra servicios reales)

Los dos son de solo lectura, así que no hubo nada que limpiar. Antes de empezar se verificó
que la conexión a `MAVICBOSANDROID.ServicioAndroid` no fuera una copia: reloj correcto y
92 filas en `actes_catalogo_queja`, de las cuales **10** pasan el filtro del endpoint.

#### E-09 `customerService/obtenerQuejas` — PASA

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | POST con token | 200 + arreglo de 10 | 200, **10 elementos**, uno a uno contra el SELECT | ✅ |
| 2 | └ forma | llaves `id` e `intencion` | `id`, `intencion` | ✅ |
| 3 | └ orden | por `AliasQueja` | correcto | ✅ |
| 4 | GET | 405 | 405 | ✅ |
| 5 | Sin token | 401 | 401 | ✅ |

Se contrastó contra un `SELECT` **antes** de llamar al endpoint, en vez de dar por buena una
respuesta que simplemente trae algo. Confirma también el renombrado heredado: la columna
`AliasQueja` viaja al cliente como **`intencion`**.

#### E-10 `customerService/bbvaKeyAdvanced` — PASA

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | GET con token | 200 + llave | 200, cadena de 194 caracteres en 256 ms | ✅ |
| 2 | └ no es el texto de error | sin `Ocurrio un error` | confirmado | ✅ |
| 3 | └ no dispara el filtro | sin `null` | confirmado | ✅ |
| 4 | POST | 405 | 405 | ✅ |
| 5 | Sin token | 401 | 401 | ✅ |

**La respuesta es una credencial**, así que solo se registró su longitud; no se volcó a
ningún log ni documento.

No se forzaron los casos de fallo del SOAP —caída del servicio, XML sin el nodo— porque
exigirían intervenir un servicio de terceros. Quedan documentados por lectura de código, no
verificados por ejecución.

#### Los dos 405 son el resultado que más dice

Confirman que la paridad de verbo quedó bien: cada ruta acepta **solo** el verbo que declara
la LAN, y rechaza el otro.

| | Verbo en la LAN | Llamada de la DMZ | Ruta en ServicioSAP | El otro verbo |
|---|---|---|---|---|
| **E-09** | `[HttpPost]` | `curl.PostSAP(...)` | `[HttpPost]` | GET → 405 |
| **E-10** | `[HttpGet]` | `curl.GetSAP(...)` | `[HttpGet]` | POST → 405 |

Ninguna divergencia contra el legado. `sap.log` quedó sin entradas nuevas, que es lo
esperado cuando no hay errores.

#### Ejemplo de request y response — Ola 5

Ninguno de los dos recibe body. Lo que distingue a cada uno es el **verbo**.

**E-09 · `POST customerService/obtenerQuejas`** — sin cuerpo

**200**, 10 elementos, coincidiendo uno a uno con el `SELECT` previo

```json
[
  { "id": 57, "intencion": "COTIZAR ARTICULOS" },
  { "id": 60, "intencion": "ENTREGA EN DISTINTO DOMICILIO" },
  { "id": 18, "intencion": "ENTREGA TARDIA DE SUCURSAL" }
]
```

> La columna de la base se llama **`AliasQueja`** y viaja al cliente como **`intencion`**. Es
> el legado quien hace ese renombrado; conservarlo es obligatorio.

Un **GET** contra esta ruta da **405**: es `[HttpPost]`, igual que en la LAN.

Sin filas devolvería `200` con cuerpo `null` —no `[]`—, porque el método entrega cadena vacía
y deserializarla da null. No se pudo provocar: habría hecho falta vaciar el catálogo real.

**E-10 · `GET customerService/bbvaKeyAdvanced`** — sin cuerpo

**200 en 256 ms**, con la llave como cadena JSON de 194 caracteres.

```json
"<llave maestra — no se transcribe>"
```

> 🔑 **La respuesta es una credencial.** En la corrida solo se registró su longitud y se
> comprobó que no contuviera `Ocurrio un error` ni `null`. No se volcó a ningún log ni
> documento, y no debe pegarse en tickets.

Un **POST** contra esta ruta da **405**: es `[HttpGet]`, igual que en la LAN.

Los dos casos de fallo heredados no se pudieron ejercitar, porque dependen de un servicio de
terceros: si el SOAP responde algo distinto de 200 el cuerpo trae la cadena literal
`"Ocurrio un error"` **con código 200**, y si el XML no trae el nodo esperado sale un 500 por
`NullReferenceException`.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola5.http`.
Fichas: [[E-09_obtenerQuejas]], [[E-10_bbvaKeyAdvanced]].

### Ola 6 — E-11, E-12, E-13 y E-14, 25 ago

Primera ola que atraviesa **la cadena de tres saltos**: para E-11 y E-12 hubo que levantar
también APIMagentoDMZ en local (`https://localhost:44302`), porque no van contra una base
sino contra Magento pasando por la DMZ.

    ServicioSAP → DMZ  magento/getCuenta → Magento REST  rest/V1/mavi-cuenta/getCuenta

#### E-11 `customer/getCuenta` — PASA

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Correo inexistente | 200 + arreglo vacío | 200 `"[]"` en 1633 ms | ✅ |
| 2 | Sin token | 401 | 401 | ✅ |
| 3 | Body vacío | 200 con el error de Magento | 200 `'"%fieldName" is required. Enter and try again.'` | ✅ |

El caso 3 es el interesante: **el error de Magento llega con código 200**, dentro del cuerpo.
Es el comportamiento de la cadena, no algo que introduzcamos.

#### E-12 `customer/setCuenta` — PASA (rama de error)

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | `idCliente` inexistente | 200 con el error de Magento | 200 `{"message":"Customer does not exist."}` en 781 ms | ✅ |
| 2 | Sin token | 401 | 401 | ✅ |

**La escritura real no se ejecutó.** `setCuenta` graba `customer_credit_account` en un cliente
de Magento, y no había un id de prueba acordado. Hacerlo habría modificado una cuenta real.

#### E-13 `customer/cashCustomerReport` — NO VERIFICABLE DESDE DESARROLLO

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Lote válido | `status` 200 | `status` **500**, `LogonUser failed with error code: 1326` | 🔶 |
| 2 | Sin `fileName` | `status` 400 | `status` 400 | ✅ |
| 3 | Sin `fileContent` | `status` 400 | `status` 400 | ✅ |
| 4 | Body nulo | `status` 400 | `status` 400 | ✅ |
| 5 | Sin token | 401 | 401 | ✅ |

**La primera mitad sí funcionó:** el archivo se escribió en local con su contenido correcto
—37 bytes, verificado— y el fallo ocurre exactamente al impersonar. Es **H-02**, la cuenta de
servicio que no existe en el dominio, y el legado falla igual con las mismas credenciales.

Nótese que los cuatro primeros casos responden **HTTP 200**: el resultado real viaja en el
campo `status` del cuerpo.

#### E-14 `product/obtenerImagen` — NO VERIFICABLE DESDE DESARROLLO

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Copia de imagen | `"Ok"` | 200 `"LogonUser failed with error code: 1326"` | 🔶 |
| 2 | Sin token | 401 | 401 | ✅ |

#### 🔴 La corrección de E-14 no se pudo verificar ejecutando

Es el hallazgo más importante de la corrida. La impersonación envuelve **toda** la operación,
así que falla antes de llegar al `File.Copy`. Se intentó también con un share simulado en
disco local, y da igual: el `LogonUser` revienta primero.

Es decir: **la corrección de la diagonal está verificada por inspección, no por ejecución.**
Hasta que H-02 funcione, no hay forma de comprobar desde desarrollo que E-14 copie de verdad.
Conviene tenerlo presente al validarlo en QA, porque es justo el punto que se arregló.

#### Sobre los verbos y el cutover

Solo **E-13 lleva cutover**, aplicado el 25 ago, commiteado el 26 y subido el 31 (`e403065` en
APIMagentoDMZ). E-11 y E-12 van en sentido contrario —de ServicioSAP hacia la DMZ— y E-14 no
existe en la DMZ, así que ninguna de esas tres tiene una ruta que conmutar.

El código de la ola se commiteó el 26 ago en `4315c50` de ServicioSAP y se subió el 31. Los porcentajes de la
tabla no cambian por eso: commitear no es una casilla de la rúbrica.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola6.http`.

### Ola 7 — E-15, 31 ago (escrito, sin probar)

`order/GetPickUpCode` quedó escrito y compilando, y ahí se detuvo. **No se ejecutó ninguna
prueba**, porque no habría medido nada: la tabla que lee está vacía.

Qué se construyó:

| Archivo | Contenido |
|---|---|
| `Methods\Order\StorePickupMethods.cs` | `GetPickUpCodeAsync`, la lectura |
| `Models\SAP\Order\StorePickupModels.cs` | `StoreReadyPickupRequest` y `StoreReadyPickupResponse` |
| `Controllers\OrderController.cs` | la ruta `order/GetPickUpCode` |

El contrato se conserva entero: `NotFound` si falta `IdEcommerce` o si no hay fila,
`Json(StoreReadyPickupResponse)` si la hay, `BadRequest(e.Message)` en la excepción.
Asíncrono, con `obtenerConexionSigMaviAsync`.

> 📌 **La tabla destino ya existía y se llama distinto.** El legado lee
> `TrWDM0285_CteRecoge` en IntelisisTmp; el equivalente en SIGMAVI es **`BpRecogePedidos`**
> —mismas columnas, `MaviSAP: Tables\BpRecogePedidos.sql`, creada en abril de 2025—. Los
> checklists decían que Dev 3 tenía que crearla: no hace falta. Conviene avisar a Dev 2, que
> programa contra el nombre viejo.

> ⏳ **Por qué no se probó.** Los tres flujos que escriben la tabla siguen en el legado y
> escriben en Intelisis: `crearPrimerCodigoRecogerSuc`, `NuevoCodigoRecogerSucursal` y
> `crearPrimerCodigoRecogerSucbanktransfer`. Los dos primeros son `createStorepickupCode` y
> `generateNewStorepickupCode`, partidas de Dev 2 con fecha 10-11 sep y feb 2027. Hasta
> entonces el endpoint responde 404 siempre, y ese 404 no distingue "no existe" de "aún no
> migraron los escritores".

> ⚠️ **`crearPrimerCodigoRecogerSucbanktransfer` no está en ningún checklist.** Apareció el
> 20 ago en el work item 8600 y lo llama `OrderMethods.cs:695`. Escribe la misma tabla por el
> procedimiento `SpWDM0285_CteRecoge`, que tampoco está en `MaviSAP\StoreProcedure`.

**Sólo se migró la lectura**, por decisión del 31 ago. Los escritores se quedan donde están.

### Barrido de paridad — olas 1 a 7, 1-3 sep

Hasta aquí cada ola se había probado **contra su servicio real**, comprobando que ServicioSAP
respondiera lo que la ficha decía. Este barrido es otra cosa: **los dos servicios levantados
al mismo tiempo**, el legado en el puerto 8098 y ServicioSAP en el 8099, apuntando a la misma
base y al mismo destino, mandando el mismo cuerpo a los dos y comparando código HTTP y
respuesta carácter por carácter.

Es la comprobación que faltaba. Una ficha puede describir bien lo que hace el endpoint
migrado y aun así no notar que el legado hace otra cosa.

| Ola | Partidas | Casos | Resultado |
|---|---|---|---|
| 1 | E-01 | 4 | 🔴 **1 divergencia**, corregida (`6669ba9`) |
| 2 | E-02, E-03, E-04 | — | ✅ idénticas |
| 3 | E-05, E-06 | 10 | ✅ idénticas |
| 4 | E-07, E-08 | 12 | 🟠 **1 divergencia**, corregida (`2828618`) + 1 desviación aprobada |
| 5 | E-09, E-10 | 3 | ✅ idénticas |
| 6 | E-11, E-12, E-13, E-14 | 14 | ✅ idénticas |
| 7 | E-15 | 2 | ⏳ solo las rutas que no tocan base |

#### Ola 1 — E-01

Cuatro casos con el número de prueba `3321332415`. **Divergencia encontrada:** ServicioSAP
normalizaba el teléfono con `Regex.Replace(request.NumeroTelefono ?? "", ...)`. Con el campo
nulo el legado devuelve 500, y ServicioSAP devolvía **200 tras encolar un SMS a un número
vacío**. Se retiró el `?? ""`; las dos vuelven a dar 500. Detalle en [[E-01_SendSmsNewNumber]].

#### Ola 2 — E-02, E-03, E-04

Las tres rutas de listas blanca/negra contra SIGMAVI, con las mismas respuestas en los dos
servicios.

#### Ola 3 — E-05 y E-06

Diez casos, todos idénticos. Como el `data.db` de ServicioSAP no existe en el equipo de
desarrollo, se apuntó `SQLITE_DB_PATH` temporalmente a una copia de la base del legado para
que los dos leyeran exactamente los mismos datos; el `Web.config` se restauró al terminar.

| Endpoint | Caso | Los dos |
|---|---|---|
| E-05 | Guía existente | `200 {"IdEcommerce":"2000045299","FullName":"DÍAZ MEZA ABEL"}` |
| E-05 | Guía inexistente | `500` |
| E-05 | `IdEcommerce` vacío | `404` |
| E-05 | Body vacío | `500` |
| E-06 | `nuevo`+`CREDITO`, `nuevo`+otro, `casa` | `200` con los mismos montos |
| E-06 | Artículo desconocido | `400` |
| E-06 | UEN inexistente | `500` |
| E-06 | Body vacío | `500` |

Confirma de paso el **404 inalcanzable** de `order/getGuide`: solo sale con cadena vacía, y
una guía que no existe da 500 en las dos versiones.

#### Ola 4 — E-07 y E-08

**E-07** — siete de ocho casos idénticos, incluidos los `500` (mismo `Message`,
`ExceptionType` y `ExceptionMessage`; solo difiere el `StackTrace`, que lleva los nombres de
cada ensamblado). Se comprobaron además las filas en AdminDoc, no solo el HTTP: la rama que
elige cada servicio es la esperada y espejo exacto.

| Cuenta | Legado | ServicioSAP |
|---|---|---|
| `C099999999` | `CLAVE` | `DIR` |
| `1599999999` | `DIR` | **`CLAVE`** |

Es la adaptación al formato BP del 20-ago funcionando en las dos direcciones. El octavo caso
—una cuenta de **11 caracteres**— es consecuencia de esa misma adaptación: el legado devuelve
`500` por truncamiento y ServicioSAP `200`. No es un fallo de la migración sino un bug del
legado que sale a la luz: `CLAVE` es `varchar(10)` pero su condición acepta `Length <= 11`,
así que **cualquier cuenta `C`/`P` de 11 caracteres está garantizada a fallar**. La condición
migrada usa `<= 10`, el ancho real de la columna. Con formato BP el caso no existe.

**E-08** — **divergencia encontrada:** con el body nulo el legado devolvía `200 true` y
ServicioSAP `400 Datos incompletos.`. Se retiró el guardián (`2828618`); los cuatro casos
quedan idénticos. Hacia el cliente final no cambia nada, porque la DMZ valida antes y sigue
cortando con su propio 400. Los archivos en disco salieron con **hash SHA-256 idéntico** en
los dos servicios y las filas de selfie coinciden en todas sus columnas.

Las 12 filas de prueba en `MAVI_DOC_CTE` se borraron al terminar.

#### Ola 5 — E-09 y E-10

**E-09** — el catálogo completo salió **byte por byte igual** (510 bytes, mismo orden de
filas), pese a que el legado arma una `List<Object>` de objetos anónimos y ServicioSAP una
`List<QuejaResponse>` tipada.

Para el camino de error se apuntaron las dos cadenas a un servidor inexistente: las dos
devolvieron `500` con el mismo `ExceptionType` (`JsonReaderException`) y hasta el mismo
`ExceptionMessage`. Confirma la cadena de comportamientos heredados: con error el método
devuelve **el texto de la excepción**, no un JSON, y el `DeserializeObject` del controlador
revienta.

**E-10** — primera vez que se contrasta ejecutando los dos. El SOAP de Multipagos responde
desde el equipo de desarrollo, así que la prueba fue contra el servicio real: `200` y 194
bytes en ambos, con **SHA-256 coincidente**. No se reprodujo el valor: es una credencial.

#### Ola 6 — E-11, E-12, E-13 y E-14

Catorce casos, todos idénticos. Para E-11 y E-12 se levantó además **APIMagentoDMZ en local**
(puerto 44302), que es a donde apuntan los dos servicios: la cadena completa
`legado / ServicioSAP → DMZ → Magento` se ejerció de verdad.

| Endpoint | Casos | Los dos |
|---|---|---|
| E-11 | correo inexistente, correo vacío | `200 "[]"` |
| E-11 | body nulo | `200` con el error de Magento pidiendo `correoCuenta` |
| E-12 | `idCliente` inexistente | `200 {"message":"Customer does not exist."}` |
| E-12 | sin `idCliente`, body nulo | `200` con los errores de validación de Magento |
| E-13 | body nulo, sin `fileName`, sin `fileContent` | `200` con `status:400` dentro del cuerpo |
| E-13 | Base64 inválido | `200` con `status:500` y el mismo texto |
| E-13 | archivo válido | `200` con `status:500` — **`LogonUser failed with error code: 1326`** |
| E-14 | nombres válidos, campos nulos | `200 "LogonUser failed with error code: 1326"` |
| E-14 | body nulo | `500 NullReferenceException` |

**E-12 no se probó escribiendo.** Solo se ejercitaron sus rutas de error, que no modifican
nada; sigue faltando un id de cliente de Magento acordado para la escritura real.

El archivo local que E-13 escribe **antes** del paso SMB sí se comparó: mismo nombre, mismo
tamaño y mismo SHA-256 en los dos. Lo que falla en los dos por igual es la copia al share, y
falla con el mismo mensaje — que es exactamente H-02, no una diferencia entre versiones.

#### Ola 7 — E-15

**Solo se probaron las dos rutas que no tocan base**, y las dos salieron iguales:
`IdEcommerce` nulo → `404` sin cuerpo; body nulo → `400` con el mensaje del
`NullReferenceException`.

> ⛔ **La comparación real no se puede hacer, por dos motivos a la vez.** Del lado migrado, la
> tabla `BpRecogePedidos` está vacía hasta que Dev 2 mueva los escritores. Del lado del
> legado, `GetPickUpCode` lee `TrWDM0285_CteRecoge` con `sCadenaConexion`, que es
> **IntelisisTmp en MAVICUBOS**: la regla de destinos del 5-ago prohíbe consultarlo. Cualquier
> caso con un `IdEcommerce` real habría golpeado ese servidor, así que no se ejecutó.

#### Qué deja el barrido

**Dos divergencias reales en 45 casos**, las dos en el manejo de un campo nulo y las dos
corregidas el mismo día. Ninguna estaba en el camino feliz, que es justo donde las pruebas
por ola ya habían mirado.

El patrón se repite: **el hueco está en lo que pasa cuando falta un dato**. E-01 convertía un
500 en un 200 con efecto externo; E-08 convertía un 200 en un 400. Conviene mirar con esa
lente las olas que aún no se han barrido.

Queda pendiente de comparar **E-12 escribiendo** —falta el id de cliente— y **E-15 completo**,
que depende de Dev 2 y de resolver la equivalencia de IntelisisTmp.

### Refactor transversal — endpoints a asíncrono, 20 ago

Criterio nuevo del equipo: **todos los endpoints migrados se escriben asíncronos**, aunque el
legado sea síncrono, y así se hará de aquí en adelante. Es la única desviación de la regla de
paridad aprobada de antemano, porque cambia cómo espera el hilo, no qué responde el endpoint.

Se aplicó de forma retroactiva a las ocho partidas de las olas 0 a 4 (commit `e20033b` de
ServicioSAP). Los controladores pasan a `async Task<IHttpActionResult>`, los métodos toman
sufijo `Async`, y las conexiones y consultas usan sus variantes asíncronas.

**Dos bloqueos reales de hilo desaparecieron:**

- `CustomerMethods.ValidarClienteEnSap` hacía `GetFilterClientsAsync(...).GetAwaiter().GetResult()`
  — una llamada HTTP a SAP bloqueando un hilo de IIS en cada alta de lista.
- E-01 encadenaba tres conexiones síncronas a ServicioAndroid.

**El contrato no se movió.** Se repitieron las pruebas de las olas 3 y 4 y los códigos HTTP
salieron idénticos a las corridas previas. Los casos que escriben en `MAVI_DOC_CTE` **no** se
repitieron, para no volver a insertar filas de prueba; queda pendiente una corrida de
confirmación de E-07 y E-08.

Tres cosas se dejaron síncronas a propósito: el fire-and-forget de `SaveImagesProductosMx`
(no hay nada que esperar), la compresión de imágenes (es CPU) y `CreditMethods.IsValidated`
(es código muerto, no lo llama nadie).

---

# Informe — puntos a revisar en lo no completado

## 1. Bloqueos de entorno, no de código

Ninguno de estos se arregla programando. Son los que más impacto tienen porque frenan la validación de varias partidas a la vez.

### 🔴 REAL (6 ago) — el canal de SMS está caído desde el 5-ago 23:04

Este sí está medido sobre la base productiva, y **no tiene relación con el falso positivo del 5 ago** que se rectifica más abajo.

**Evidencia:**

- El último envío exitoso de **cualquier** tipo de mensaje es `Id 7134748`, del `2026-08-05T23:04:57`. Desde entonces, nada ha salido.
- El tráfico de la LAN de esta mañana —`Id 7135743` a `7135750`, entre las 10:26 y las 10:48, todo generado por el legado, ninguna fila nuestra— terminó **completo en `EstatusEnvio 3` con `IntentoEnvio 4`**: cuatro intentos y abandono.
- Nuestras dos filas de prueba (`7135751`, `7135752`, de las 10:50) siguen exactamente el mismo patrón, acumulando reintentos.

**Por la regla de paridad, E-01 no cuenta como fallo:** el legado falla igual, en el mismo minuto y contra la misma cola. La partida queda **bloqueada por entorno**, no fallada.

Una pista para quien lo diagnostique: en las filas que sí salieron, el módem deja `UsuarioSalida = 1` y `EstatusEnvio = 2` al primer intento, sin reintentos. Ni el legado ni ServicioSAP escriben esa columna al insertar — la pone el proceso de envío —, así que un `UsuarioSalida` nulo indica que el envío nunca llegó a completarse.

- **Impacta:** cerrar E-01, y cualquier partida que dependa de SMS (M-11, M-06)
- **Acción:** escalar a quien opere el servicio de módem con el dato de que no sale nada desde las 23:04 del 5 ago. Revisar su log; desde la base no se ve más

### ✅ RECTIFICADO (6 ago) — el 5 ago apuntábamos a una copia de la base, no había incidencia entonces

**Lo que se reportó el 5 ago:** que el reloj de `mavicbosandroid` estaba 9 meses atrasado (`2025-11-10`), que el envío de SMS estaba caído y que **afectaba a producción**, porque filas generadas por la LAN fallaban igual que las nuestras.

**Lo que resultó ser.** El 6 ago, con la **misma cadena de conexión**, el mismo `@@SERVERNAME` (`MAVICBOSANDROID`) y la misma base (`ServicioAndroid`), los números no se parecen en nada:

| | 5 ago | 6 ago |
|---|---|---|
| `GETDATE()` | `2025-11-10` | `2026-08-06` ✅ |
| `MAX(Id)` de `TcAAEA00030_EnvioMensajes` | 7 973 | **7 135 742** |
| Fila más reciente | `2025-11-10` | `2026-08-05T23:52` |
| Filas de prueba 7972–7974 | recién escritas | **no existen** |

No fue un reloj que retrocedió: el 5 de agosto la conexión estaba resolviendo a **una copia restaurada o un nodo obsoleto**, no a la base productiva. Todo lo observado allí —el "salto de fecha", los fallos con 4 intentos, el supuesto impacto en producción— pertenece a ese entorno fantasma.

**Estado real del canal de SMS**, medido el 6 ago sobre la base productiva: los últimos `IdMensaje 23` están todos en `EstatusEnvio 2` con `IntentoEnvio 0`, y de las últimas 200 filas 144 salieron, 55 están en cola y 1 falló. **El canal funciona con normalidad.**

- **Consecuencia para E-01:** los resultados de contrato (códigos HTTP y forma de la respuesta) siguen siendo válidos y se re-verificaron el 6 ago. Lo que **no** quedó validado es el efecto en base ni la entrega del SMS, porque esas escrituras se fueron con la copia.
- **Riesgo que sí queda abierto:** que una cadena de conexión hacia `mavicbosandroid.grupomavi.com` pueda resolver a una copia obsoleta sin ningún aviso. Cualquier prueba contra ese host debería empezar comprobando `GETDATE()` y `MAX(Id)` antes de dar por buenos los resultados.

### 🟡 H-02 — la cuenta de servicio de impersonación no existe

`LogonUser` falla con `Win32 1326`. La causa no es una contraseña rotada: **la cuenta no existe en el dominio `grupomavi.com`**. Lo confirman dos consultas independientes de solo lectura, `net user /domain` y una búsqueda ADSI; ninguna la encuentra.

Lo verificado alrededor, para descartar que sea nuestro:

- Los tres valores del `Web.config` son **idénticos** a los que APIMagento lleva hardcodeados en `Conn\Connection.cs`.
- El orden de argumentos del P/Invoke es correcto.

> **Nota (6 ago):** la clase se reescribió como **réplica literal** de la de APIMagento (`Metodos\ProductImage\Methods.cs:410`), cuerpo idéntico línea por línea. Consecuencia práctica: ya **no** existe el constructor sin parámetros que leía el `Web.config`. Igual que en el legado, **el llamador provee las credenciales**, así que quien implemente E-13 y E-08 tendrá que leer `SMB_IMPERSONATION_USER` / `_DOMAIN` / `_PASSWORD` y pasarlas — respetando el orden del legado: `(usuario, dominio, password)`.

Es decir: **el legado apunta a la misma cuenta inexistente.** Por la regla de paridad no cuenta como fallo de la migración. Pero deja una pregunta abierta que conviene resolver: si esos valores son los que corren en producción, la impersonación de APIMagento tampoco puede estar funcionando — lo que significaría que la escritura de imágenes y el reporte de efectivo llevan tiempo rotos sin que nadie lo haya notado. La alternativa es que el APIMagento desplegado use valores distintos a los del repositorio.

- **Impacta:** H-02, E-13, y todo lo que escriba en shares
- **Acción:** pedir la cuenta de servicio correcta a quien administre AD, y comprobar qué credenciales usa realmente el APIMagento desplegado. No reintentar logons a ciegas

> ✅ **Cerrado (6 ago) — H-04.** No faltaba nada: la ruta configurada es la correcta y `data.db` reside en el servidor, por eso no aparece en el equipo de desarrollo. Código, cadena de conexión, ensamblados y proveedor verificados; la apertura de la base real se valida en QA. Ya **no bloquea** la Ola 3 como trabajo de desarrollo: E-05 y E-06 se pueden escribir.

### 🔴 El cutover no desacopla la DMZ del legado — `Curl..ctor()`

Descubierto el 6 ago al intentar la cadena DMZ → ServicioSAP en local. El constructor de `Helper\Curl.cs` en la DMZ autentica contra la LAN **incondicionalmente y fuera de cualquier `try`**, antes de decidir si la llamada va por `Post` o por `PostSAP`. Si la LAN no responde, `new Curl()` lanza y la petición muere con 500 aunque el endpoint no fuera a tocar la LAN.

**Consecuencia:** después del cutover, lo ya migrado **sigue cayéndose si se cae APIMagento**. El cutover conmuta el destino de los datos, pero no elimina la dependencia.

- **Impacta:** todo endpoint que se conmute a `PostSAP`, empezando por E-01
- **Acción:** mover la autenticación LAN dentro de un `try`, o hacerla perezosa, **antes** de conmutar en producción

### 🟡 El whitelist de certificados de la DMZ es código muerto

`EnableTrustedHosts()` compara `request.RequestUri.Host` —un host pelado— contra `DOMINIO_LAN` y `DOMINIO_SAP`, que en el `Web.config` guardan **URLs completas**. La comparación no puede dar verdadero nunca, así que solo pasan los certificados que ya validan por sí solos.

No se nota mientras los certificados de producción sean válidos, pero cualquier host con certificado autofirmado o cadena incompleta falla con "no se puede establecer una relación de confianza". Fue lo que impidió completar la prueba local.

- **Acción:** poner hosts pelados en `DOMINIO_LAN` y `DOMINIO_SAP`. El valor comentado de `DOMINIO_LAN` ya lo es, así que es una regresión de configuración

> ✅ **Cerrado (10 ago).** Los scripts de `ListaNegra`, `ListaBlanca` y `SpListaNBMagento` ya se ejecutaron en DEVMAVI. La capa de base responde; las tablas están vacías porque no se migraron datos.

> ✅ **Cerrado (10 ago).** El campo correcto es `Mail`, ya configurado. Verificado end-to-end: el alta inserta y `getCustomerList` la lee de vuelta.

### ⚠️ El BP de pruebas del cliente C00000020 no tiene correo

`1500000020` tiene `Mail` vacío. Aunque se corrija el campo, ese cliente **no puede darse de alta** en ninguna lista: la validación lo rechazaría. Para probar E-02 hay que usar un BP con correo, como `1500007539`.

## 2. Deuda funcional heredada del legado

Existen igual en APIMagento. **No son regresiones**, pero son huecos reales y corregirlos exige tocar los dos lados a la vez para no divergir.

### Sin validación de campos en `SendSmsNewNumber`

Un body `{}` devuelve `200 {"result":1}` y escribe dos filas con `Cliente` y `Teléfono` vacíos. Ni ServicioSAP ni la DMZ validan más allá de `request == null`.

- **Decisión pendiente:** ¿se corrige, o se mantiene paridad? Si se corrige, hay que hacerlo también en la DMZ

### La reutilización de `IdRef` no mira la expiración

`GetIdRef` toma el `MAX` del par `Cliente`+`IdCarrito` sin comparar contra `FechaExpira`, y el código vive 2 minutos. Cualquier segundo intento pasados esos 2 minutos manda un SMS con un código ya vencido.

- **Candidato a explicar** reportes de "llegó el SMS pero el código no sirve"
- **Decisión pendiente:** igual que el anterior

### El 404 de `order/getGuide` es inalcanzable

El código promete un 404 cuando la guía no existe, pero ese `throw` está **dentro** del `try`
y el `catch (Exception)` lo convierte en 500. El 404 solo sale cuando `IdEcommerce` llega como
cadena vacía.

Consecuencia: el cliente no puede distinguir *"esa orden no tiene guía"* de *"la consulta
falló"* — ni de *"la tabla no existe"*. Verificado el 19 ago en APIMagento
(`OrdersController.cs:171-182`): idéntico.

- **Decisión pendiente:** corregirlo exige sacar el `throw` del `try` en los dos repos

### ✅ RESUELTO (21 ago) — el verbo de `obtenerQuejas` estaba desalineado entre los dos legados

**Cómo se cerró.** El cutover del 21 ago alinea la DMZ con el verbo del legado de la LAN: la
ruta pública **conserva su `[HttpPost]`** —eso es lo que ven los clientes y no cambia— y la
llamada interna pasa de `curl.Get(...)` a **`curl.PostSAP(...)`**. Las dos rutas de ServicioSAP
quedan solo como `[HttpPost]`, en vez de aceptar ambos verbos como estaban al escribirse.

**Cerrado del todo el 21 ago:** Dev 1 entrego `GetSAP` (`4dabaa9`, `Curl.cs:210`), el gemelo de `PostSAP` con verbo GET. Las dos partidas quedan en paridad de verbo con el legado.

| | Verbo en la LAN | Llamada de la DMZ | Ruta en ServicioSAP |
|---|---|---|---|
| **E-09** | `[HttpPost]` | `curl.PostSAP(...)` | `[HttpPost]` ✅ |
| **E-10** | `[HttpGet]` | `curl.GetSAP(...)` | `[HttpGet]` ✅ |

**La que realmente lo necesita es E-10**; E-09 se anota solo para el seguimiento. Ninguna está
rota mientras tanto, porque las rutas públicas de la DMZ ya eran `[HttpPost]` en ambas y el
contrato hacia el cliente final no cambia. Lo que se pospone es la paridad interna de E-10.

Al entregarse hay que tocar **dos sitios**: la llamada en
`APIMagentoDMZ\Controllers\CustomerServiceController.cs` y la ruta de `bbvaKeyAdvanced` en
ServicioSAP, que vuelve de `[HttpPost]` a `[HttpGet]`.

Sigue abierto, aunque ya no nos bloquea: **confirmar qué rama de la DMZ está desplegada**. Si
es `dbAndroid`, `obtenerQuejas` llevaba caído desde julio por una causa ajena a la migración.

Lo que había antes:

### 🔴 Los dos legados no coincidían en el verbo de `obtenerQuejas`

Detectado el 21 ago al escribir E-09, y **verificado contra `origin/Production`** de
APIMagento, no solo contra la copia local:

| | Verbo |
|---|---|
| APIMagento — ruta de la LAN | **`[HttpPost]`** |
| APIMagentoDMZ — llamada a la LAN | **`curl.Get(...)`** desde el 28-jul (commit `6a55c6a`) |

Ese commit cambió dos cosas a la vez: la ruta pública de la DMZ pasó de GET a POST, y la
llamada interna pasó de POST a GET. La LAN nunca se ajustó.

Si la rama `dbAndroid` de la DMZ es la que está desplegada, la DMZ manda GET a una ruta que
solo acepta POST. `Curl.Get` atrapa la excepción y devuelve el texto del error, que después
revienta al deserializarse: un 500. **No está confirmado que esté roto en producción** —
depende de qué rama corra allá—, pero las dos ramas disponibles no concuerdan.

- **Mitigado en ServicioSAP:** las dos rutas nuevas aceptan `[HttpGet]` y `[HttpPost]`. Los
  métodos no reciben parámetros, así que ambos verbos son idénticos y el cutover funciona se
  resuelva como se resuelva la discrepancia
- **Pendiente:** confirmar qué rama de la DMZ está desplegada. Si es `dbAndroid`, hay un
  endpoint caído desde julio que no tiene relación con la migración

### `SaveImagesProductosMx` responde antes de trabajar, y su `true` no significa nada

Devuelve `200 true` en menos de 200 ms y hace el trabajo **10 segundos después**, en un
`Task` suelto. Verificado el 20 ago: respondió en 179 ms y los archivos aparecieron diez
segundos más tarde. El `true` sale igual si la carpeta no existe o si la base rechaza la fila.

- **Riesgo real:** un reciclado del app pool en esa ventana se lleva el lote sin rastro
- **Mitigado en parte:** se añadió un `try/catch` dentro del `Task` para que el motivo quede
  en `sap.log`; el legado lo perdía como *unobserved task exception*
- **Decisión pendiente:** corregirlo de verdad exige cambiar el contrato hacia el cliente

### `AVAL` es `bit` pero el parámetro va como `VarChar`

En `guardardocumento`, cualquier `Aval` no numérico —`"SI"`, `"true"`— tumba el INSERT con
500. Solo `"0"` y `"1"` convierten. Verificado idéntico en APIMagento.

### La rama Token de `guardardocumento` pierde `idVenta` e `IdFoto`

Su INSERT no incluye `ID_EXTERNO` ni `ID_FOTO`, así que un documento que caiga ahí queda sin
vínculo con la venta. Y la rama `Actualizar`, que rescataría esos documentos del limbo, es
**inalcanzable**: `@Opcion` solo vale `Cliente` o `Token`. Confirmado por SELECT el 20 ago:
ambas columnas nulas.

### `PruebaDeVida` se recibe y se tira

`SaveImagesProductosMx` declara el campo y nunca lo usa. Quien lo manda cree que se guarda.
Confirmado en la corrida: no generó archivo ni fila.

### La DMZ vuelca las imágenes completas a su log

`APIMagentoDMZ\Controllers\CreditController.cs:214` hace
`Logger.Credit("INFO: ", JsonConvert.SerializeObject(request))` **antes** de reenviar, así que
escribe los Base64 enteros en cada llamada a `SaveImagesProductosMx`.

### La DMZ de `guardardocumento` fabrica un éxito por coincidencia de texto

Si no puede parsear la respuesta como JSON, busca las palabras "true" o "correctamente" en el
texto y devuelve un `{ Success = true }` inventado. Un error que contuviera esa palabra se
vería como éxito.

### `tipo` se compara con `==` exacto en `GetCreditAmounts`

`req.tipo == "CREDITO"`. Un `"credito"` en minúsculas cae en la rama de apertura y devuelve
montos de préstamo **menores**, sin error ni aviso. Verificado en APIMagento
(`CreditController.cs:322`): idéntico.

- **Riesgo real:** el cliente recibe un 200 con datos plausibles pero equivocados

## 3. Decisiones de arquitectura que bloquean trabajo

| Tema | Bloquea | Quién decide |
|---|---|---|
| Equivalencia de `IntelisisTmp` | E-48, E-49 y los 12 mixtos | Arquitectura |
| Convención de conexiones: fábricas estáticas del stash vs métodos de instancia de la Ola 0 | Integrar el stash del 29-jul (M-14, M-08) | Líder técnico |
| Estructura de garantías | E-50 | Miguel Marín (PCP) |
| ~~Definición de monedero~~ | ➡️ Dev 2 desde el 12 ago | — |
| ~~¿Se elimina `ExistRFCAndPhoneCte`?~~ | — | ✅ Descartado el 11 ago |

## 4. Pendientes operativos

- **Desplegar los cutovers.** Los de las olas 1 a 4 están **commiteados y subidos** a `dbAndroid` de APIMagentoDMZ (`c7d1d29`, `740669e`, `fa4034e`, `d933e44`), pero **sin desplegar**: mientras esa rama no se publique, la DMZ manda todo el tráfico al legado aunque ServicioSAP ya responda. Antes de desplegar hay que corregir el acoplamiento con la LAN en `Curl..ctor()`, y el orden es **ServicioSAP primero, DMZ después**
- **Limpiar las filas de prueba** 7972, 7973 y 7974 de `TcAAEA00030_EnvioMensajes`
- **Medir el uso real de los `op` sin caché** en producción — determina el tamaño de la Ola 10
- **Comprobar en el servidor si `servicio_guias` existe** en `C:\inetpub\wwwroot\sap\data.db`. Es lo más urgente de la Ola 3: el script la trae comentada por decisión del 19 ago, así que ejecutarlo **no** la crea. Ver el riesgo de `SaveGuide` más abajo
- **Ejecutar `01_CrearTablas_Ola3.sql`** contra esa base para crear `mavi_credilana_info`. Es idempotente y ya está probado
- **Decidir si se migran las guías históricas** desde `C:\inetpub\wwwroot\api\data.db`, que es donde el legado las tiene
- **Cutover en la DMZ para E-05 y E-06** — `curl.Post` → `curl.PostSAP` escrito el 19 ago en `APIMagentoDMZ\Controllers\OrdersController.cs:206` y `CreditController.cs:352`, commiteado en `fa4034e` y **subido**. Falta desplegarlo. Aplica la misma advertencia que E-01: corregir antes el acoplamiento de `Curl..ctor()` con la LAN
- **Cutover en la DMZ para E-07 y E-08** — aplicado y commiteado el 20 ago (`d933e44`) en `APIMagentoDMZ\Controllers\CreditController.cs:485` y `:221`. Compila en 0 errores. Falta **push y despliegue**
- **Confirmar quién consume `...\api\images\credit`** antes de desplegar E-08. ServicioSAP escribe ahora en su propia carpeta (`IMAGES_CREDIT_PATH`), y nada en APIMagento ni en APIMagentoDMZ vuelve a leer la del legado — así que si alguien los lee, lo hace desde fuera de estos dos repos y dejaría de encontrarlos
- **Verificar que la carpeta de imágenes exista y sea escribible en el servidor.** En desarrollo no se pudo crear `C:\inetpub\wwwroot\sap`; el código la crea si falta, pero si el app pool no tiene permiso, E-08 perderá los archivos en silencio
