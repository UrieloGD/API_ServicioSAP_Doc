# Especificación Funcional DM07 - Sucursales (S4HANA)

## Descripción del requerimiento
API OData para exponer la información de los datos maestros de sucursales desde S4HANA. 

### Información Técnica S4
* **Nombre de Objeto S4**: `ZAPI_SUCURSALES_SRV`
* **URL Base S4**: `http://vhmvods4ci.sap.svrwes4h.com:8000/sap/opu/odata/sap/ZAPI_SUCURSALES_SRV/SucursalesSet?$format=json&sap-client=110`
* **Método**: GET
* **Autenticación**: OAuth 2.0 (Bearer Token estándar de CPI/SAP)

### Filtros Soportados (OData `$filter`):
Se puede filtrar utilizando la sintaxis estándar OData (ej. `$filter=Sucursal eq '0085'`). Los campos permitidos para filtro son:
- Sucursal
- Colonia
- Poblacion
- Estado
- Pais
- CodigoPostal
- Estatus
- Alta
- Categoria
- Grupo
- Tipo
- Organización de ventas

### Estructura de Datos (Campos devueltos principales):
- `Sucursal` (int 4): Codigo de la sucursal
- `Nombre` (varchar 100): Nombre de la sucursal
- `Direccion` (varchar 100): Calle
- `DireccionNumero` (varchar 20): Numero exterior
- `Colonia`, `Poblacion`, `Estado`, `Pais`, `CodigoPostal`
- `Telefonos`
- `Estatus`
- `Categoria`
- `Grupo`
- `CentroCostos`
- `Tipo`

*(Nota: Las URLs de CPI y ABAP han sido descartadas por solicitud expresa, enfocándose únicamente en la interacción con S4HANA y la misma estructura de autorización de las otras APIs).*
