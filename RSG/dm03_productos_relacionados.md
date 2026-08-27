---
proyecto: MAVI
id_requerimiento: DM03
descripcion: Especificación Funcional - Configuración de Productos Relacionados (CrossSell, UpSell y Sustitutos)
---

# Especificación Maestra: Productos Relacionados DM03

## 1. Contexto Funcional
Se requiere la exposición de 3 APIs de consulta (`GET`) para consumir la configuración de artículos relacionados previamente cargada en SAP (Módulo D-Ret-01).
Estas APIs permiten al eCommerce o POS sugerir artículos adicionales (Cross-Sell), artículos de mayor gama (Up-Sell) o artículos alternativos en caso de falta de stock (Sustitutos).

---

## 2. Definición de APIs y Funciones ABAP

Todas las APIs comparten la misma estructura de entrada y salida, variando únicamente la función y servicio al que se invoca.

### Parámetros de Entrada (Filtros en URL)
1. **ARTICULO** (Obligatorio): Código del artículo semilla.
2. **VKORG** (Obligatorio): Organización de ventas (ej. `01`, `02`, `03`).

### Estructura de Respuesta
La respuesta se entrega expandiendo la entidad (`$expand=HeaderReturn`), la cual expone el contenido de la tabla de salida de la función ABAP (`OUT_DATOS - MATNR_JER`).

| Módulo | Función ABAP | Transacción de Configuración SAP (Validación) |
| :--- | :--- | :--- |
| **CrossSell** | `ZMF_CROSS_SELL` | `ZDM_CROSS_SELL` |
| **UpSell** | `ZMF_US_SELL` | `ZDM_UP_SELL` |
| **Sustitutos** | `ZMF_AS_SELL` | `ZDM_AS_SELL` |

---

## 3. Información Técnica (Servicios S4 y CPI)

- **Tipo de servicio**: Sincrónico (RESTful / OData GET)
- **Operación**: `HeaderSet` (Por Llave) + `$expand=HeaderReturn`

### A. API CrossSell
- **Nombre de Objeto S4**: `ZAPI_CROSSSELL_SRV`
- **Artefacto CPI**: `RSG_MD03_ZAPI_CROSSSELL_SRV`
- **Ejemplo de Consumo**:
  `GET https://[URL_CPI]/.../ZAPI_CROSSSELL_SRV/HeaderSet(ARTICULO='109A00068',VKORG='01')?$expand=HeaderReturn&$format=json`

### B. API UpSell
- **Nombre de Objeto S4**: `ZAPI_UPSELL_SRV`
- **Artefacto CPI**: `RSG_MD03_ZAPI_UPSELL_SRV`
- **Ejemplo de Consumo**:
  `GET https://[URL_CPI]/.../ZAPI_UPSELL_SRV/HeaderSet(ARTICULO='109A00068',VKORG='02')?$expand=HeaderReturn&$format=json`

### C. API Sustitutos
- **Nombre de Objeto S4**: `ZAPI_SUSTITUTOS_SRV`
- **Artefacto CPI**: `RSG_DM03_ZAPI_SUSTITUTOS_SRV`
- **Ejemplo de Consumo**:
  `GET https://[URL_CPI]/.../ZAPI_SUSTITUTOS_SRV/HeaderSet(ARTICULO='109A00068',VKORG='03')?$expand=HeaderReturn&$format=json`

---

> [!NOTE]
> **Gestión de URLs en el Código (Para Subagentes):**
> Las URLs base de S4 y CPI mostradas aquí han sido ofuscadas (`[URL_CPI]`). El código C# en `.NET 4.7.2` ya cuenta con clases base o métodos factoría que inyectan el dominio correcto según el ambiente (DEV, QAS, PRD). Al refactorizar, solo preocúpate por armar los `paths` correctos (`/ZAPI_CROSSSELL_SRV/HeaderSet...`) y procesar la estructura de respuesta de `HeaderReturn`.
