# Especificación: ND-CRED-42 (Catálogo de Bancos)
**Proyecto:** MAVI
**Descripción:** Consulta del Maestro de Bancos (Tabla BNKA)

## Contexto Funcional
El negocio requiere obtener la información de las claves de bancos y su denominación, dato que sirve como insumo para la actualización de Datos Maestros de Clientes – Cuentas Bancarias.
Se construyó una API para poder leer la información del catálogo de Bancos proveniente de S4HANA.

POS utilizará la API expuesta para realizar operaciones de lectura de registros.

## Descripción de Objetos (S4)
* **Nombre de Objeto S4:** `ZCDS_ND_CRED_42_BANCOS_CDS`
* **URL S4 (Ejemplo):** `https://10.30.2.135:44300/sap/opu/odata/sap/ZCDS_ND_CRED_42_BANCOS_CDS/ZCDS_ND_CRED_42_BANCOS?sap-client=110&sap-language=ES`

## Entidades y Métodos del Servicio Expuesto
**Entidad:** `BANCOS` (Vía `ZCDS_ND_CRED_42_BANCOS_CDS`)

| Método | Descripción |
|---|---|
| GET | Consultar registros del catálogo de bancos |

### Method GET – REQUEST
Los campos que serán expuestos en la API para poder realizar la operación de consulta (GET) y filtrado son:

| Campo S4H | Descripción | Tipo Dato S4H | Longitud | Obligatorio | Filtro |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `BANKS` | PAIS | CHAR | 3 | SI | Libre |
| `BANKL` | CLAVE BANCO | CHAR | 15 | SI | Libre |
| `BANKA` | DESCRIPCION | CHAR | 60 | SI | Libre |

*Nota: La petición admite parámetros OData estándar como `$filter`, `$top`, `$skip`, `$select` y formato `$format=json`.*
