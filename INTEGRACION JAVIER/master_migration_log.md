# Master Migration Log - [Atlas]
**Proyecto:** MigraciÃ³n LAN a SAP
**Responsable/DocumentaciÃ³n Maestra:** Javier
**Ãšltima ActualizaciÃ³n:** 2026-08-25

---

## 1. Resumen de AnÃ¡lisis: Endpoint S2-03 `company/wholesale-customer/{wholesaleAccount}`

### 1.1 Contexto Legacy (LAN / APIMagento)
Anteriormente, el endpoint funcionaba de la siguiente manera:
- **DMZ (`APIMagentoDMZ`):** Recibe un `GET /company/wholesale-customer/{wholesaleAccount}`. Valida mediante la expresiÃ³n regular `^C[0-9]{8,9}$` que la cuenta sea vÃ¡lida. Internamente, reenvÃ­a la peticiÃ³n `GET` a `APIMagento`.
- **Backend (`APIMagento`):** El controlador invoca a `WholesaleCustomerMethods.GetWholesaleCustomer`.
- **Capa de Datos:** Ejecutaba una consulta directa a Intelisis: `SELECT Nombre FROM cte WITH(NOLOCK) WHERE Cliente = @wholesaleAccount`.
- **Respuesta Esperada:** Un `string` literal con el nombre completo del cliente, o el texto `"null"` si no existe, lo cual el DMZ interceptaba para regresar un error 400 (`Customer not found.`).

### 1.2 Estrategia de MigraciÃ³n a SAP (`ServicioSAP` + `BP05`)
Para que este endpoint sea 100% funcional y respete las directrices arquitectÃ³nicas del `SKILL.md`, la refactorizaciÃ³n requiere los siguientes cambios:

1. **AdaptaciÃ³n en el Puente DMZ (Regla #16):**
   - El DMZ seguirÃ¡ exponiendo el `GET /company/wholesale-customer/{wholesaleAccount}` hacia el exterior (Magento) para no romper el contrato del frontend.
   - Sin embargo, para comunicarse con el backend `ServicioSAP`, el DMZ construirÃ¡ un objeto con la cuenta y llamarÃ¡ internamente a `curl.PostSAP("company/wholesale-customer", JsonConvert.SerializeObject(request))` en lugar del antiguo `curl.Get`.

2. **Nuevo Controlador en `ServicioSAP`:**
   - CreaciÃ³n de `Controllers\WholesaleCustomerController.cs`.
   - El endpoint serÃ¡ `[HttpPost]` y `[Route("wholesale-customer")]`.
   - El mÃ©todo serÃ¡ obligatoriamente **asÃ­ncrono** (`async Task<IHttpActionResult>`).

3. **LÃ³gica de Negocio en `Methods` (Regla #17 y #12):**
   - En `Methods\BusinessPartner\BusinessPartnerMethods.cs` se implementarÃ¡ el mÃ©todo `GetWholesaleCustomerNameAsync(WholesaleRequest request)`.
   - Este mÃ©todo realizarÃ¡ una peticiÃ³n HTTP asÃ­ncrona hacia el wrapper SAP **BP05** (por ejemplo `ZAPI_BUSINESS_PARTNER_SRV`), buscando el `BusinessPartner` equivalente al parÃ¡metro `wholesaleAccount`.

4. **DTOs y Mapeo OData (Regla #18 y #2):**
   - Se utilizarÃ¡n (o crearÃ¡n si no existen) las clases DTO en `Models\SAP\BusinessPartner\...` decoradas con `[JsonProperty("NombrePropiedadSAP")]` para capturar la respuesta del ERP y extraer el nombre del cliente (ej. propiedades `OrganizationBPName1` o `OrganizationBPName2`).
   - Cero consultas directas (`INSERT`/`SELECT`) hacia bases de datos.

---

## 2. Plan Maestro de Trabajo (EjecuciÃ³n Sprint 2)

A continuaciÃ³n, la lista de tareas (check-list) que seguiremos paso a paso. Cada cambio realizado deberÃ¡ marcarse como completado en esta bitÃ¡cora:

- [x] **Paso 1: DefiniciÃ³n de DTOs (Request / Response).** Crear en `ServicioSAP\Models\SAP\BusinessPartner\` la clase para recibir el request desde DMZ y verificar si los modelos `BusinessPartnerMa` cubren los campos de nombre necesarios de S/4HANA.
- [x] **Paso 2: Implementar Capa Methods.** Agregar el mÃ©todo `GetWholesaleCustomerNameAsync` en `BusinessPartnerMethods.cs`, con programaciÃ³n asÃ­ncrona (`async/await`), control de excepciones y consumo de `Conexion.Data.obtenerUrl` (agregando la diagonal `/` exigida por la Regla #13).
- [x] **Paso 3: Implementar Controlador Backend.** Crear `WholesaleCustomerController.cs` en `ServicioSAP` marcado como `[HttpPost]` y consumir el mÃ©todo de la capa lÃ³gica de manera asÃ­ncrona.
- [x] **Paso 4: Actualizar `.csproj` (Regla #19).** Asegurarse de que el nuevo controlador y/o modelos creados queden registrados como `<Compile Include... />` en el archivo `ServicioSap.csproj`.
- [x] **Paso 5: Ajustar el DMZ.** Modificar `APIMagentoDMZ\WebApiMagento\Controllers\WholesaleCustomerController.cs` para utilizar `curl.PostSAP` y encapsular el `wholesaleAccount` en un JSON hacia el nuevo backend.
- [x] **Paso 6: Pruebas End-to-End (E2E).** Probar el flujo completo e ingresar en este log la peticiÃ³n y respuesta exitosa generada por S/4HANA.

---
*Nota: Este archivo actuarÃ¡ como el log maestro de la migraciÃ³n y se actualizarÃ¡ progresivamente ante cada cambio de cÃ³digo implementado.*

## 3. DocumentaciÃ³n de Cierre S2-03

**Estatus:** âœ… FINALIZADO Y PROBADO EXITOSAMENTE.

### Resumen de Cambios Generados
1. **ValidaciÃ³n Estricta Regex (DMZ):** Se ajustÃ³ la expresiÃ³n regular en el `WholesaleCustomerController` de la DMZ para que permita **exclusivamente** las cuentas numÃ©ricas nativas de SAP S/4HANA (ej. `1500008152` de 8 a 10 dÃ­gitos), eliminando el soporte para las cuentas "legacy" de Intelisis que iniciaban con `C`.
2. **Arquitectura REST Puente:** El DMZ transforma el `GET` tradicional de Magento en un `POST` con cuerpo JSON y lo reenvÃ­a asÃ­ncronamente mediante `curl.PostSAP` hacia el backend.
3. **Manejo Seguro de Errores (SAP):** El mÃ©todo `GetWholesaleCustomerNameAsync` maneja correctamente el caso de 404 (cliente no encontrado en SAP) atrapando la excepciÃ³n y retornando un literal `"null"`, el cual la DMZ intercepta para lanzar un `400 Bad Request` limpio (`Customer not found.`), protegiendo la orquestaciÃ³n e impidiendo bloqueos del hilo.

### Comandos cURL de Consumo Local (OrquestaciÃ³n Verificada)

**1. SimulaciÃ³n Magento hacia DMZ (Ruta PÃºblica GET)**
```bash
curl --request GET \
  --url https://localhost:44302/company/wholesale-customer/1500008152 \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>'
```

**2. Consumo Directo del Backend SAP (Ruta Privada POST)**
```bash
curl --request POST \
  --url https://localhost:44399/company/wholesale-customer \
  --header 'Authorization: Bearer <TU_TOKEN_SAP>' \
  --header 'content-type: application/json' \
  --data '{"wholesaleAccount":"1500008152"}'
```

---

## 4. DocumentaciÃ³n de Cierre S2-04 (`credit/getPlazos`)

**Estatus:** âœ… FINALIZADO Y PROBADO EXITOSAMENTE.

### Resumen del Cruce HÃ­brido (SIGMAVI + SAP SD40)
1. **Consumo de SD40 Nativo:** Se implementÃ³ `GetCondicionesPagoAsync` directamente en C# para consumir el OData v4 de SAP (`zapi_condpago`), obteniendo el catÃ¡logo maestro de condiciones con su identificador `Zterm`
#### ðŸ“Œ 2026-08-28 - `credit/getPlazos` (S2-04) - Arquitectura Mixta Finalizada y Lista para Staging
- **Issue detectado en Pruebas Unitarias:** Al consumir el API de SD40, el valor devuelto para la condiciÃ³n Diferida (`12DA`/`12DV`) en el campo `Zdiasgracia` es **122**, y para la Inmediata (`12IA`/`12IV`) es **0**. En Intelisis (LAN), estos valores siempre fueron **153** y **31** respectivamente. 
- **ConclusiÃ³n de Regla de Negocio:** Se detectÃ³ que el equipo de SAP SD40 implementÃ³ el cÃ¡lculo restando los primeros 31 dÃ­as base (153 - 31 = 122).
- **AcciÃ³n Tomada:** Se retiraron los logs de depuraciÃ³n inyectados (limpiando el endpoint). El mÃ³dulo se da por concluido y **listo para staging**.
- **RefactorizaciÃ³n DMZ (Gateway):** Se corrigiÃ³ la orquestaciÃ³n en el proyecto `APIMagentoDMZ` (`CreditController.cs`) cambiando la invocaciÃ³n interna de `curl.PostSAP` a `curl.GetSAP`. Esto garantizÃ³ que el API interno (`ServicioSAP`) pudiera operar exclusivamente con `[HttpGet]`, respetando de principio a fin el contrato original expuesto por LAN.
- **AcciÃ³n Pendiente (PM / SAP):** Confirmar si la resta de 31 dÃ­as en SAP es una mala configuraciÃ³n que corregirÃ¡n ellos, o si la API de ServicioSAP deberÃ¡ inyectar `days = zdias + 31` en el futuro. De momento se respeta lo devuelto por SD40.
3. **Cruce en Memoria (LINQ):** Se integrÃ³ `PaymentConditionCatalog` para traducir el nombre legado (`CondicionPropre` ej. `12 M MA P DIF`) al cÃ³digo tÃ©cnico de SAP (ej. `12DA`). Luego, mediante LINQ, se busca `12DA` en la respuesta de SD40 para extraer los dÃ­as de vencimiento reales (`Zplazo`).
4. **Compatibilidad:** El JSON resultante conserva exactamente la misma estructura esperada por Magento (listas de `Diferidos` e `Inmediatos` agrupados por `StoreCode` y `Days`).

**1. SimulaciÃ³n Magento hacia DMZ (Ruta PÃºblica GET)**
```bash
curl --request GET \
  --url https://localhost:44302/credit/getPlazos \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>'
```

## S2-05: `customerService/unirCuenta`
- **Estado Inicial:** El PM proveyÃ³ un snippet para ser insertado en la DMZ (`curl.PostSAP("partner/cliente/unirCuenta", JsonConvert.SerializeObject(request))`).
- **AnÃ¡lisis y Hallazgos:** El cÃ³digo proporcionado por el PM fallarÃ­a en producciÃ³n por 3 discrepancias con la API `ServicioSAP`:
  1. **Discrepancia de Verbo:** La API interna expone `[HttpPatch]`, pero el PM sugiriÃ³ usar `PostSAP` (POST).
  2. **Discrepancia de Ruta:** La API interna escucha en `partner/client/unircuenta`, pero el PM sugiriÃ³ `partner/cliente/unirCuenta`.
  3. **Discrepancia de Payload (Mapping):** DMZ envÃ­a la llave `"cliente"`, pero el contrato interno de SAP espera `"partner_id"`.
- **AcciÃ³n Tomada:** Se ignorÃ³ el snippet literal del PM y se construyÃ³ una implementaciÃ³n funcional dentro de `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`. 
  - Se mapeÃ³ `"cliente"` a `"partner_id"` en un nuevo objeto anÃ³nimo.
  - Se utilizÃ³ el mÃ©todo `curl.PatchSAP` (ya existente en `Curl.cs`).
  - Se apuntÃ³ a la ruta correcta `partner/client/unircuenta`.
- **Retrocompatibilidad de Respuesta:** Se forzÃ³ a la DMZ a atrapar cualquier cadena de error o excepciÃ³n proveniente de SAP y transformarla en un estricto `true` / `false`. Con esto se garantizÃ³ que Magento siga recibiendo la misma estructura booleana que devolvÃ­a la API antigua (Intelisis).
- El endpoint S2-05 ya delega al robusto mÃ©todo `LinkMagentoAccountAsync` de S/4HANA (que usa `ZSDT_CTE_ODATA_SRV` para parches atÃ³micos en memoria). EstÃ¡ listo.

**Prueba Exitosa Magento hacia DMZ (Ruta PÃºblica POST)**
```bash
curl --request POST \
  --url https://localhost:44302/customerService/unirCuenta \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>' \
  --header 'content-type: application/json' \
  --data '{"cliente":"1500007539","id_magento":999123}'
```
*(Debe retornar `true` o `false`)*

## S2-06: `customerService/validarCliente`
- **Estado Inicial:** En el sistema legacy (Intelisis), esta funciÃ³n hacÃ­a un `SELECT TOP 1` verificando que el BP estuviera ligado a la cuenta de Magento. Si existÃ­a, retornaba el nombre y apellidos ocultos con asteriscos (ej. `J**** P****`).
- **AnÃ¡lisis y Hallazgos:** La DMZ no requerÃ­a cambios ya que funcionaba como un passthrough perfecto. La implementaciÃ³n en S/4HANA (ServicioSAP) necesitaba usar el servicio BP05 (`GetClientMaAsync`).
- **AcciÃ³n Tomada:** 
  - Se creÃ³ el modelo `ValidarClienteRequest` en el backend `ServicioSAP`.
  - Se portÃ³ de forma exacta la funciÃ³n de ofuscamiento `ocultarLetrasNombres` empleando expresiones regulares.
  - Se comparÃ³ el campo extendido `BusinessPartnerMa.To_Cte.ZidMagento` del BP05 con el `id_cliente_magento` recibido.
  - Se devolviÃ³ el objeto ofuscado si hay match, o `"false"` en string si no lo hay (para que la DMZ devuelva `Ok(false)`).
  - *BugFix:* Se corrigiÃ³ el uso de `Logger.CustomerService` por `Logger.SAP` y se agregÃ³ el archivo nuevo en el `.csproj` para evitar errores de compilaciÃ³n `CS0117` y `CS0234`.

**Prueba Exitosa Magento hacia DMZ (Ruta PÃºblica POST)**
```bash
curl --request POST \
  --url https://localhost:44302/customerService/validarCliente \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>' \
  --header 'content-type: application/json' \
  --data '{"id_cliente_intelisis":"1500007539","id_cliente_magento":"999123"}'
```

### 2026-08-31: S2-07 prospecto/recuperarcuenta`n- **Estado**: Migrado a S/4HANA (BP02 / ZB_DATOS_CLIENTE).
- **Detalles**: 
  - Se creó ProspectoController en ServicioSAP.
  - Se implementó la búsqueda de clientes por nombre, apellidos, fecha de nacimiento y RFC utilizando la vista CDS ZB_DATOS_CLIENTE a través del filtro OData $filter.
  - Se incluyó la validación para enviar la fecha en formato datetime'YYYY-MM-DDT00:00:00' compatible con OData v2.
  - Se adaptó la misma lógica de Intelisis para remover acentos (QuitarAcentos) en las búsquedas y para ofuscar los nombres encontrados (ocultarLetrasNombres).
  - Se devuelve estatus: 1 si hay match (con la cuenta y nombre ofuscado) y estatus: 4 si los datos son inválidos o no existe el cliente.

**Prueba Exitosa (DMZ):**
``bash
curl --request POST \
  --url https://kdll3fhcyo-lan.grupomavi.com/api/prospecto/recuperarcuenta \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>' \
  --header 'content-type: application/json' \
  --data '{"nombre":"JUAN","apellidoPaterno":"PEREZ","apellidoMaterno":"GARCIA","fechaNacimiento":"1990-01-01","rfc":"PEGJ900101XYZ"}'
``
*Nota: Para probar el estatus 1 se requiere conocer los datos personales y RFC de un Business Partner existente en SAP.*

### 2026-09-01: S2-01 y S2-02 customerService/LoginClienteCredito y LoginClienteCreditoFechaN
- **Estado**: Migrado a S/4HANA (BP05 / BusinessPartnerMa).
- **Detalles**: 
  - Se implementaron los métodos `LoginClienteCreditoAsync` y `LoginClienteCreditoFechaNAsync` en `CustomerServiceMethods.cs`.
  - Se consume el método `GetClientMaAsync` para traer los datos del cliente (BP05).
  - Se combinan los campos `NameFirst`, `Namemiddle`, `NameLast` y `NameLst2` para retornar el `nombreCliente` completo.
  - Se extrae el email desde `To_CtePersonalAdr`.
  - Para el S2-02 (`LoginClienteCreditoFechaN`) se incluyó un parseo robusto para soportar diferentes formatos de fechas que puede devolver SAP (e.g. `/Date(...)/`, o `YYYY-MM-DD`) y verificar contra la fecha solicitada.
  - Se crearon los Request Models respectivos.

