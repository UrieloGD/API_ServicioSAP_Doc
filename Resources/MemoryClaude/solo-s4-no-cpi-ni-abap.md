---
name: solo-s4-no-cpi-ni-abap
description: "Catalogo de destinos de salida: cual se resuelve por Web.config y cual por obtenerUrl; CPI y ABAP directo prohibidos"
metadata:
  type: project
---

El proyecto tiene **varios destinos legítimos**, no solo SAP. Ninguno se hardcodea.

| Constante | Destino | Se resuelve con |
|---|---|---|
| S/4HANA OData | `https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap` | `Conexion.Data.obtenerUrl(...)` |
| `URL_ANDROID_API` | `https://android-api.mavi.fun` | Web.config |
| `URL_BP_API` | `https://businesspartner-api.mavi.fun` | Web.config |
| `URL_SALES_DISTRIBUTION_API` | `https://salesanddistribution-api.mavi.fun` | Web.config |
| `VETA_URL_LIBERADOR` | `http://172.16.215.51:3026/api/venta` | Web.config |
| `AwsBaseUrl` | `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/` | Web.config |
| `SQLITE_DB_PATH` / `IMAGES_CREDIT_PATH` | `C:\inetpub\wwwroot\sap\...` | Web.config |

- **Web.config es la fuente correcta** para todo lo que **no** es S/4HANA — se lee la AppSetting según el tipo de API. Es diseño, no deuda.
- **S/4HANA es la excepción**: su base sale de `obtenerUrl` (`ConexionSap.dll`, nunca `conf.ini`), que ya trae host + `/sap/opu/odata/sap`. OData v4: `.Replace("/odata/sap", "/odata4/sap")`.
- **Prohibidos**: CPI (`*.hana.ondemand.com`) y ABAP/Gateway directo (`host:8000`) que salen en las fichas RSG — son el modelo del POS, no el nuestro. Las APIs `*.mavi.fun`, AWS y el liberador **no son CPI**.
- **Nunca justifiques un mapeo con internals de tablas SAP** (`DMBTR`, `ZUONR`, `SHKZG`, `BSEG`, `VBAK`, `KNVV`). De una ficha solo vale el nivel **contrato OData**: servicio, EntitySet, nombres de campo y payload de ejemplo. Si la equivalencia campo-OData ↔ campo-LAN no se resuelve así, **es prueba E2E, no análisis**: se consume, se compara con LAN, y si difiere se le reporta al usuario para validar el dato real.
- **AWS: `54wblyc2h6/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=` y `nibj6m7t0l/AI_GET_CCatalogo?nombre_catalogo=` son la MISMA API**, misma respuesta (confirmado 2026-09-10). La segunda solo aparece en documentación; el código resuelve siempre por `AwsBaseUrl`. No abrir hallazgo por la diferencia.
- **El destino lo determina el RESOLVEDOR, no la naturaleza del dato.** `obtenerUrl` → S4; una AppSetting → esa otra API, y es correcto. Que un dato tenga tabla Z o ficha RSG detrás **no obliga** a consumirlo directo de S4. Confirmados correctos (no volver a levantar): SEPOMEX y MovBita por `URL_SALES_DISTRIBUTION_API`; `AS_GET_ZQBP_AGENTE` y área de ventas KNVV por `URL_BP_API`; SuccessFactors por `URL_ANDROID_API`.
- **Auth por destino**: S4 = `Basic` vía `TokenGenerator.CreateClientS4()`. Un `Bearer` hacia S4 es defecto; hacia DMZ/Magento y liberador es correcto.
- Mandante = **110** (QA).

**Why:** el usuario dio el catálogo el 2026-09-09 y aclaró que la lectura de URL depende del tipo de API. Mi primera versión de esta regla decía "todo va a S4" y prohibía leer del Web.config — era incorrecta.

**How to apply:** al agregar una llamada saliente, identifica primero el tipo de destino y usa su resolvedor. Al 2026-09-09 se eliminó la única dependencia CPI viva (`FinalListProperMethods` pedía Bearer al OAuth de CPI y lo mandaba a S4) y `TokenGenerator.CreateSapToken()`. Quedan por borrar las llaves `SAP_OAUTH_*` del Web.config (incluyen un client secret en claro).

Ver [[convenciones-migracion-sap]], [[convencion-nombres-dmz-sap]].
