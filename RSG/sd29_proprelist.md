---
proyecto: Mavi
id_requerimiento: SD29
descripcion: Especificación Funcional - Envío de precios finales a tabla Z (ProperListafinal)
---

# Especificación Maestra: Envío de precios finales (SD29)

## 1. Contexto Funcional
Esta API "Inbound" permite al sistema legado PCP actualizar el maestro de precios finales en S/4HANA. SAP recibe esta información y actualiza una tabla Z nativa. Posteriormente, SAP replicará (vía SLT) esta tabla hacia el POS, quien la utilizará para calcular los precios de venta a los clientes finales.

---

## 2. Lógica de Petición (Request Payload & Endpoints)

> [!IMPORTANT]
> **REGLA DE ORO DE INTEGRACIÓN:** El código C# (.NET) o legados **NUNCA** interactuarán con las tablas Z de SAP por SQL directo. C# se limitará exclusivamente a mapear sus variables internas para construir peticiones HTTP RESTful (OData) hacia CPI/S4 y procesar el Response.

La API permite operaciones CRUD completas a través de dos entidades OData principales:

### 2.1 Entidad `/PropreListSet`
Permite operaciones directas sobre los registros de precios.
- **GET**: Consulta de precios. Admite filtros estándar de OData.
  - *Ejemplo*: `$filter=substringof('8',Articulo)` o consulta por llaves directas.
- **POST**: Inserción de un nuevo precio.
- **PUT**: Actualización de un precio existente.
- **DELETE**: Eliminación de un precio existente.

#### Campos Llave (Key Properties):
Según las pruebas unitarias, los campos que conforman la llave compuesta son:
1. `Idproprelistadfinal` (ID de la lista final)
2. `Lista`
3. `Sucursal`
4. `OrgVtas` (Organización de Ventas)
5. `CDistr` (Canal de Distribución)
6. `Sector`
7. `Articulo` (Material SAP)

*Ejemplo de URL para PUT/GET único:*
`/PropreListSet(Idproprelistadfinal='4',Lista='1',Sucursal='96',OrgVtas='0001',CDistr='01',Sector='04',Articulo='8')`

### 2.2 Entidad `/TaskSet`
Permite enviar operaciones en bloque (Batch o Wrapping de tareas CRUD). Soporta el método `POST`.

---

## 3. Lógica de Respuesta (Response Payload)
Dependiendo del método HTTP:
- **GET**: Retorna un JSON con las propiedades del registro `PropreListSet`.
- **POST/PUT**: Retorna un status HTTP (ej. `201 Created` o `204 No Content`) y, en caso de envío hacia `TaskSet`, posibles mensajes de error en formato JSON OData.

---

## 4. Detalles Técnicos
- **Objeto S4**: `ZAPI_PROPRELIST_SRV`
- **Artefacto CPI**: `RSG_SD29_ZAPI_PROPRELIST_SRV`
- **Entidades OData**: `/TaskSet`, `/PropreListSet`
- **Métodos**: `GET`, `POST`, `PUT`, `DELETE`
- **Seguridad**: Autenticación Bearer Token (OAuth 2.0 Client Credentials). Para los métodos mutacionales (`POST`, `PUT`, `DELETE`) es estrictamente necesario obtener y enviar el `X-CSRF-TOKEN` y las Cookies asociadas.
