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
1. **Doble validación Regex (DMZ):** Se ajustó la expresión regular en el `WholesaleCustomerController` de la DMZ para que permita tanto las cuentas "legacy" de Intelisis que inician con `C` (`CXXXXXXXX`), como las cuentas numéricas nativas de SAP S/4HANA (ej. `1500008152`).
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
