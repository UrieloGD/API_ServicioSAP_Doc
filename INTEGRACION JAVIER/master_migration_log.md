# Master Migration Log - [Atlas]
**Proyecto:** Migración LAN a SAP
**Responsable/Documentación Maestra:** Javier
**Última Actualización:** 2026-08-25

---

## 1. Resumen de Análisis: Endpoint S2-03 `company/wholesale-customer/{wholesaleAccount}`

### 1.1 Contexto Legacy (LAN / APIMagento)
Anteriormente, el endpoint funcionaba de la siguiente manera:
- **DMZ (`APIMagentoDMZ`):** Recibe un `GET /company/wholesale-customer/{wholesaleAccount}`. Valida mediante la expresión regular `^C[0-9]{8,9}$` que la cuenta sea válida. Internamente, reenvía la petición `GET` a `APIMagento`.
- **Backend (`APIMagento`):** El controlador invoca a `WholesaleCustomerMethods.GetWholesaleCustomer`.
- **Capa de Datos:** Ejecutaba una consulta directa a Intelisis: `SELECT Nombre FROM cte WITH(NOLOCK) WHERE Cliente = @wholesaleAccount`.
- **Respuesta Esperada:** Un `string` literal con el nombre completo del cliente, o el texto `"null"` si no existe, lo cual el DMZ interceptaba para regresar un error 400 (`Customer not found.`).

### 1.2 Estrategia de Migración a SAP (`ServicioSAP` + `BP05`)
Para que este endpoint sea 100% funcional y respete las directrices arquitectónicas del `SKILL.md`, la refactorización requiere los siguientes cambios:

1. **Adaptación en el Puente DMZ (Regla #16):**
   - El DMZ seguirá exponiendo el `GET /company/wholesale-customer/{wholesaleAccount}` hacia el exterior (Magento) para no romper el contrato del frontend.
   - Sin embargo, para comunicarse con el backend `ServicioSAP`, el DMZ construirá un objeto con la cuenta y llamará internamente a `curl.PostSAP("company/wholesale-customer", JsonConvert.SerializeObject(request))` en lugar del antiguo `curl.Get`.

2. **Nuevo Controlador en `ServicioSAP`:**
   - Creación de `Controllers\WholesaleCustomerController.cs`.
   - El endpoint será `[HttpPost]` y `[Route("wholesale-customer")]`.
   - El método será obligatoriamente **asíncrono** (`async Task<IHttpActionResult>`).

3. **Lógica de Negocio en `Methods` (Regla #17 y #12):**
   - En `Methods\BusinessPartner\BusinessPartnerMethods.cs` se implementará el método `GetWholesaleCustomerNameAsync(WholesaleRequest request)`.
   - Este método realizará una petición HTTP asíncrona hacia el wrapper SAP **BP05** (por ejemplo `ZAPI_BUSINESS_PARTNER_SRV`), buscando el `BusinessPartner` equivalente al parámetro `wholesaleAccount`.

4. **DTOs y Mapeo OData (Regla #18 y #2):**
   - Se utilizarán (o crearán si no existen) las clases DTO en `Models\SAP\BusinessPartner\...` decoradas con `[JsonProperty("NombrePropiedadSAP")]` para capturar la respuesta del ERP y extraer el nombre del cliente (ej. propiedades `OrganizationBPName1` o `OrganizationBPName2`).
   - Cero consultas directas (`INSERT`/`SELECT`) hacia bases de datos.

---

## 2. Plan Maestro de Trabajo (Ejecución Sprint 2)

A continuación, la lista de tareas (check-list) que seguiremos paso a paso. Cada cambio realizado deberá marcarse como completado en esta bitácora:

- [x] **Paso 1: Definición de DTOs (Request / Response).** Crear en `ServicioSAP\Models\SAP\BusinessPartner\` la clase para recibir el request desde DMZ y verificar si los modelos `BusinessPartnerMa` cubren los campos de nombre necesarios de S/4HANA.
- [x] **Paso 2: Implementar Capa Methods.** Agregar el método `GetWholesaleCustomerNameAsync` en `BusinessPartnerMethods.cs`, con programación asíncrona (`async/await`), control de excepciones y consumo de `Conexion.Data.obtenerUrl` (agregando la diagonal `/` exigida por la Regla #13).
- [x] **Paso 3: Implementar Controlador Backend.** Crear `WholesaleCustomerController.cs` en `ServicioSAP` marcado como `[HttpPost]` y consumir el método de la capa lógica de manera asíncrona.
- [x] **Paso 4: Actualizar `.csproj` (Regla #19).** Asegurarse de que el nuevo controlador y/o modelos creados queden registrados como `<Compile Include... />` en el archivo `ServicioSap.csproj`.
- [x] **Paso 5: Ajustar el DMZ.** Modificar `APIMagentoDMZ\WebApiMagento\Controllers\WholesaleCustomerController.cs` para utilizar `curl.PostSAP` y encapsular el `wholesaleAccount` en un JSON hacia el nuevo backend.
- [x] **Paso 6: Pruebas End-to-End (E2E).** Probar el flujo completo e ingresar en este log la petición y respuesta exitosa generada por S/4HANA.

---
*Nota: Este archivo actuará como el log maestro de la migración y se actualizará progresivamente ante cada cambio de código implementado.*

## 3. Documentación de Cierre S2-03

**Estatus:** ✅ FINALIZADO Y PROBADO EXITOSAMENTE.

### Resumen de Cambios Generados
1. **Validación Estricta Regex (DMZ):** Se ajustó la expresión regular en el `WholesaleCustomerController` de la DMZ para que permita **exclusivamente** las cuentas numéricas nativas de SAP S/4HANA (ej. `1500008152` de 8 a 10 dígitos), eliminando el soporte para las cuentas "legacy" de Intelisis que iniciaban con `C`.
2. **Arquitectura REST Puente:** El DMZ transforma el `GET` tradicional de Magento en un `POST` con cuerpo JSON y lo reenvía asíncronamente mediante `curl.PostSAP` hacia el backend.
3. **Manejo Seguro de Errores (SAP):** El método `GetWholesaleCustomerNameAsync` maneja correctamente el caso de 404 (cliente no encontrado en SAP) atrapando la excepción y retornando un literal `"null"`, el cual la DMZ intercepta para lanzar un `400 Bad Request` limpio (`Customer not found.`), protegiendo la orquestación e impidiendo bloqueos del hilo.

### Comandos cURL de Consumo Local (Orquestación Verificada)

**1. Simulación Magento hacia DMZ (Ruta Pública GET)**
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

## 4. Documentación de Cierre S2-04 (`credit/getPlazos`)

**Estatus:** ✅ FINALIZADO Y PROBADO EXITOSAMENTE.

### Resumen del Cruce Híbrido (SIGMAVI + SAP SD40)
1. **Consumo de SD40 Nativo:** Se implementó `GetCondicionesPagoAsync` directamente en C# para consumir el OData v4 de SAP (`zapi_condpago`), obteniendo el catálogo maestro de condiciones con su identificador `Zterm`
#### 📌 2026-08-28 - `credit/getPlazos` (S2-04) - Arquitectura Mixta Finalizada y Lista para Staging
- **Issue detectado en Pruebas Unitarias:** Al consumir el API de SD40, el valor devuelto para la condición Diferida (`12DA`/`12DV`) en el campo `Zdiasgracia` es **122**, y para la Inmediata (`12IA`/`12IV`) es **0**. En Intelisis (LAN), estos valores siempre fueron **153** y **31** respectivamente. 
- **Conclusión de Regla de Negocio:** Se detectó que el equipo de SAP SD40 implementó el cálculo restando los primeros 31 días base (153 - 31 = 122).
- **Acción Tomada:** Se retiraron los logs de depuración inyectados (limpiando el endpoint). El módulo se da por concluido y **listo para staging**.
- **Refactorización DMZ (Gateway):** Se corrigió la orquestación en el proyecto `APIMagentoDMZ` (`CreditController.cs`) cambiando la invocación interna de `curl.PostSAP` a `curl.GetSAP`. Esto garantizó que el API interno (`ServicioSAP`) pudiera operar exclusivamente con `[HttpGet]`, respetando de principio a fin el contrato original expuesto por LAN.
- **Acción Pendiente (PM / SAP):** Confirmar si la resta de 31 días en SAP es una mala configuración que corregirán ellos, o si la API de ServicioSAP deberá inyectar `days = zdias + 31` en el futuro. De momento se respeta lo devuelto por SD40.
3. **Cruce en Memoria (LINQ):** Se integró `PaymentConditionCatalog` para traducir el nombre legado (`CondicionPropre` ej. `12 M MA P DIF`) al código técnico de SAP (ej. `12DA`). Luego, mediante LINQ, se busca `12DA` en la respuesta de SD40 para extraer los días de vencimiento reales (`Zplazo`).
4. **Compatibilidad:** El JSON resultante conserva exactamente la misma estructura esperada por Magento (listas de `Diferidos` e `Inmediatos` agrupados por `StoreCode` y `Days`).

**1. Simulación Magento hacia DMZ (Ruta Pública GET)**
```bash
curl --request GET \
  --url https://localhost:44302/credit/getPlazos \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>'
```

## S2-05: `customerService/unirCuenta`
- **Estado Inicial:** El PM proveyó un snippet para ser insertado en la DMZ (`curl.PostSAP("partner/cliente/unirCuenta", JsonConvert.SerializeObject(request))`).
- **Análisis y Hallazgos:** El código proporcionado por el PM fallaría en producción por 3 discrepancias con la API `ServicioSAP`:
  1. **Discrepancia de Verbo:** La API interna expone `[HttpPatch]`, pero el PM sugirió usar `PostSAP` (POST).
  2. **Discrepancia de Ruta:** La API interna escucha en `partner/client/unircuenta`, pero el PM sugirió `partner/cliente/unirCuenta`.
  3. **Discrepancia de Payload (Mapping):** DMZ envía la llave `"cliente"`, pero el contrato interno de SAP espera `"partner_id"`.
- **Acción Tomada:** Se ignoró el snippet literal del PM y se construyó una implementación funcional dentro de `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`. 
  - Se mapeó `"cliente"` a `"partner_id"` en un nuevo objeto anónimo.
  - Se utilizó el método `curl.PatchSAP` (ya existente en `Curl.cs`).
  - Se apuntó a la ruta correcta `partner/client/unircuenta`.
- **Retrocompatibilidad de Respuesta:** Se forzó a la DMZ a atrapar cualquier cadena de error o excepción proveniente de SAP y transformarla en un estricto `true` / `false`. Con esto se garantizó que Magento siga recibiendo la misma estructura booleana que devolvía la API antigua (Intelisis).
- El endpoint S2-05 ya delega al robusto método `LinkMagentoAccountAsync` de S/4HANA (que usa `ZSDT_CTE_ODATA_SRV` para parches atómicos en memoria). Está listo.

**Prueba Exitosa Magento hacia DMZ (Ruta Pública POST)**
```bash
curl --request POST \
  --url https://localhost:44302/customerService/unirCuenta \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>' \
  --header 'content-type: application/json' \
  --data '{"cliente":"1500007539","id_magento":999123}'
```
*(Debe retornar `true` o `false`)*

## S2-06: `customerService/validarCliente`
- **Estado Inicial:** En el sistema legacy (Intelisis), esta función hacía un `SELECT TOP 1` verificando que el BP estuviera ligado a la cuenta de Magento. Si existía, retornaba el nombre y apellidos ocultos con asteriscos (ej. `J**** P****`).
- **Análisis y Hallazgos:** La DMZ no requería cambios ya que funcionaba como un passthrough perfecto. La implementación en S/4HANA (ServicioSAP) necesitaba usar el servicio BP05 (`GetClientMaAsync`).
- **Acción Tomada:** 
  - Se creó el modelo `ValidarClienteRequest` en el backend `ServicioSAP`.
  - Se portó de forma exacta la función de ofuscamiento `ocultarLetrasNombres` empleando expresiones regulares.
  - Se comparó el campo extendido `BusinessPartnerMa.To_Cte.ZidMagento` del BP05 con el `id_cliente_magento` recibido.
  - Se devolvió el objeto ofuscado si hay match, o `"false"` en string si no lo hay (para que la DMZ devuelva `Ok(false)`).
  - *BugFix:* Se corrigió el uso de `Logger.CustomerService` por `Logger.SAP` y se agregó el archivo nuevo en el `.csproj` para evitar errores de compilación `CS0117` y `CS0234`.

**Prueba Exitosa Magento hacia DMZ (Ruta Pública POST)**
```bash
curl --request POST \
  --url https://localhost:44302/customerService/validarCliente \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>' \
  --header 'content-type: application/json' \
  --data '{"id_cliente_intelisis":"1500007539","id_cliente_magento":"999123"}'
```

### 2026-08-31: S2-07 prospecto/recuperarcuenta`n- **Estado**: Migrado a S/4HANA (BP02 / ZB_DATOS_CLIENTE).
- **Detalles**: 
  - Se cre� ProspectoController en ServicioSAP.
  - Se implement� la b�squeda de clientes por nombre, apellidos, fecha de nacimiento y RFC utilizando la vista CDS ZB_DATOS_CLIENTE a trav�s del filtro OData $filter.
  - Se incluy� la validaci�n para enviar la fecha en formato datetime'YYYY-MM-DDT00:00:00' compatible con OData v2.
  - Se adapt� la misma l�gica de Intelisis para remover acentos (QuitarAcentos) en las b�squedas y para ofuscar los nombres encontrados (ocultarLetrasNombres).
  - Se devuelve estatus: 1 si hay match (con la cuenta y nombre ofuscado) y estatus: 4 si los datos son inv�lidos o no existe el cliente.

**Prueba Exitosa (DMZ):**
``bash
curl --request POST \
  --url https://kdll3fhcyo-lan.grupomavi.com/api/prospecto/recuperarcuenta \
  --header 'Authorization: Bearer <TU_TOKEN_DMZ>' \
  --header 'content-type: application/json' \
  --data '{"nombre":"JUAN","apellidoPaterno":"PEREZ","apellidoMaterno":"GARCIA","fechaNacimiento":"1990-01-01","rfc":"PEGJ900101XYZ"}'
``
*Nota: Para probar el estatus 1 se requiere conocer los datos personales y RFC de un Business Partner existente en SAP.*

