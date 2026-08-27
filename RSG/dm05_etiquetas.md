---
proyecto: MAVI
id_requerimiento: DM05
descripcion: Especificación Funcional - Información de Etiquetas (Campaña/Unidad de Negocio)
---

# Especificación Maestra: Etiquetas (DM05)

## 1. Contexto Funcional
Se requiere exponer una API orientada a operaciones transaccionales completas (**CRUD**) para gestionar las "Etiquetas" de los artículos (promociones, campañas, insignias visuales). Los sistemas externos (como eCommerce o sistemas legados) podrán **Crear, Leer, Modificar y Eliminar** etiquetas.
Esta información vive en dos tablas Z en SAP S/4HANA: la cabecera de la etiqueta y el detalle de los artículos amarrados a la misma.

---

## 2. Diccionario de Datos (Tablas Z)

### A. Cabecera de Etiqueta (`ZMMT_ETIQUETAS`)
Tabla principal que define la regla visual y vigencia de la etiqueta.
- `ZID_ETIQUETA` (PK): ID auto-generado que identifica la etiqueta.
- `VKORG`: Organización de ventas (Equivalente a UEN).
- `ZCAMPANA`: Indicador de campaña.
- `CLASS`: Clave de la familia.
- `MATKL`: Línea (Grupo de artículos).
- `ZFECHAINICIO` / `ZFECHAFIN`: Rango de vigencia.
- `ZTEXTOETIQUETA`: Texto a mostrar (ej. "Hot Sale", "Meses sin Intereses").
- `ZCOLORTEXTOD`, `ZCOLORFONDOD`, `ZCOLORTEXTOH`, `ZCOLORFONDOH`: Códigos de color.
- `ZCRITERIOS`: Criterios aplicables.
- `ZCANTIDAD` / `ZPESOVOLUMETRICO`: Variables numéricas.
- `ZAGREGAREMOJI` / `ZEMOJI`: Indicador y clave de Emoji promocional.

### B. Detalle de Artículos (`ZMMT_ETIQUETAS_ART`)
Tabla de asignación de SKUs específicos a una etiqueta.
- `ZIDETIQUETA` (PK): Relación con la cabecera.
- `MATNR` (PK): Clave de artículo (SKU).

---

## 3. Información Técnica (Servicio S4 y CPI)

- **Nombre de Objeto S4**: `ZAPI_ZMMT_ETIQUETA_SRV`
- **Artefacto CPI**: `RSG_DM05_ZAPI_ZMMT_ETIQUETA_SRV`
- **Entidad OData**: `HEADERSet` (Cabecera) con `$expand=itemSet` (Detalle artículos)

### Operaciones CRUD Soportadas

| Operación | Método OData | Funcionalidad y Reglas |
| :--- | :--- | :--- |
| **READ** | `GET` | Consulta general. Soporta filtros (`$filter`) por ID, Fechas, Organización, etc. Se debe enviar `$expand=itemSet` para traer los artículos de la etiqueta. |
| **CREATE** | `POST` | Alta de etiqueta. El `ZID_ETIQUETA` se debe enviar en blanco (SAP genera el consecutivo). Valida que la `VKORG` exista en `TVKO`, la `CLASS`/`MATKL` en `KLAH` y el `MATNR` en `MARA`. |
| **UPDATE** | `POST` / `PATCH` | Modificación de etiqueta. Se envía el `ZID_ETIQUETA` a modificar. Pasa por las mismas validaciones de existencia (Organización, Artículos) que la creación. |
| **DELETE** | `DELETE` | Eliminación por llave. Ej. `HEADERSet('9')`. Solo valida que el ID exista previamente en `ZMMT_ETIQUETAS`. |

> [!WARNING]
> **Seguridad en Escritura (POST, PATCH, DELETE)**: Para ejecutar cualquier operación de mutación de datos desde C#, es OBLIGATORIO solicitar primero el `x-csrf-token` a SAP mediante un `GET` previo (Fetch) y enviarlo en los Headers de la petición de escritura.

---

## 4. Ejemplos de Consumo OData (Filtros y Expansión)
*(URLs base enmascaradas como `[URL_CPI]` por seguridad)*

1. **Lectura por ID específico con Expansión:**
   `GET https://[URL_CPI]/.../HEADERSet?$expand=itemSet&$filter=ZIDETIQUETA eq '1000006'&$format=json`

2. **Lectura por Vigencia (Mayor o igual a 1 de Junio 2024):**
   `GET https://[URL_CPI]/.../HEADERSet?$expand=itemSet&$filter=ZFECHAINICIO ge '20240601'&$format=json`

3. **Lectura Combinada (Organización + Vigencia):**
   `GET https://[URL_CPI]/.../HEADERSet?$expand=itemSet&$filter=VKORG eq '01' and ZFECHAINICIO ge '20240601'&$format=json`

4. **Eliminación de Registro:**
   `DELETE https://[URL_CPI]/.../HEADERSet('9')`

---

> [!TIP]
> **Para los Subagentes ([Oracle] / [Vanguard]):** 
> Si el flujo de órdenes, el liberador, o la tienda en línea necesitan extraer los atributos gráficos de una campaña (Colores, Textos, Emojis) basándose en una familia o en un artículo puntual, **ya no deben usar consultas a tablas legadas locales**. Todo el ecosistema de "Etiquetas Visuales" se administra ahora mediante transacciones de SAP (como `ZMM_ETIQUETAS`) y debe consumirse exclusivamente a través de `ZAPI_ZMMT_ETIQUETA_SRV`.
