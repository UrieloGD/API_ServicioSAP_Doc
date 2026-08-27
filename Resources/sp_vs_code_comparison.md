# Comparativa de Lógica y Origen de Datos: SP_eCommerceExportaMA vs Arquitectura C#

El siguiente documento detalla cómo se ha migrado el antiguo Stored Procedure (`SP_eCommerceExportaMA.sql`) de Intelisis a la nueva arquitectura en C# (`EcommerceMethods.cs`). 

Tras una revisión profunda de los métodos internos y cadenas de conexión, se valida que el proceso está **completamente migrado de Intelisis**. La lógica monolítica del SP fue diseccionada y enrutada correctamente hacia las dos nuevas fuentes de verdad: **APIs de SAP S/4HANA** (para el ERP/Core) y la base de datos **SIGMAVI** (como middleware para reglas específicas de catálogo web que no existen nativamente en SAP).

---

## 1. Tablas Temporales vs. Modelos de Memoria (Carga Inicial)
**Lógica en SP (`/***************CSV para MA*************************/`)**: 
Agrupaba datos en tablas masivas (`#temp_eComerceExportaArt`, `#articulos`, `art`, `ArtDisponible`).

**Implementación Actual en C# (`#region CARGA DE DATOS MAESTROS`)**:
- Las tablas base de artículos e inventarios de Intelisis desaparecen.
- `ProductMethods.GetProducts()` extrae el maestro vía **SAP API (`/ZAPI_ARTICULOS_SRV`)**.
- `ProductMethods.GetProductsStock()` extrae existencias vía **SAP API (`/ZCDS_DIM11_EXISTENCIA_CDS`)**.

## 2. Filtros Base y Familias/Líneas (Exclusiones)
**Lógica en SP**: 
Hacía JOINs contra `sip_excluir_productos`, `excluir_familia_linea` y `sip_productos`.

**Implementación Actual en C# (`#region FASE 1-2: Listado de Artículos con Filtros`)**:
- La lógica de negocio se procesa en memoria (C# LINQ), pero los datos de exclusiones web ya no apuntan a Intelisis.
- `GetExclusionesMA()` -> Migrado a **SIGMAVI** (`SIPExcluirProductos`).
- `GetExclusionesFamMA()` -> Migrado a **SIGMAVI** (`ExcluirClassN2ClassN3`).
- `GetArticulosSipValidos()` -> Migrado a **SIGMAVI** (`SIPProductos`).
- `GetFamiliasValidasMA()` -> Migrado a **SIGMAVI** (`ClassN2ValidasTdaVirtual`).

## 3. Lógica Especializada (Mayorista / Outlet / IE)
**Lógica en SP**: 
Consultaba tablas como `prop`, `items_propiedad` y `familia_propiedad`.

**Implementación Actual en C# (`#region FASE 3: Artículos IE/Mayorista/Outlet`)**:
- `GetArticulosIEMayorista()` -> Migrado a **SIGMAVI** (consulta a las nuevas tablas relacionales `articulospropiedades` y `CatalogoPropiedad` en el middleware).

## 4. Precios, Descuentos y Créditos
**Lógica en SP (`/*********Precios *****************/`)**: 
Consultaba tablas monstruosas de Intelisis como `PropreListaDFinal`, `Condicion`, `eCommercePorcSobrePrecio`.

**Implementación Actual en C# (`#region FASE 10: Precios Finales`)**:
- Toda la base transaccional de SD (Sales & Distribution) fue transferida a SAP.
- `GetFinalListProperByUen()` -> **SAP API (`/ZAPI_PROPRELIST_SRV`)**. Se aplican las condiciones `ACEF`, `12DA`, `12IA` de S/4HANA directamente.

## 5. Control de Imágenes
**Lógica en SP**: 
Validaba contra `SCM_Art_imagen` y `ecommerceactualizarimagenes` en Intelisis.

**Implementación Actual en C# (`#region FASE 7: Filtrar Artículos Sin Imagen`)**:
- `ImagenMethods.GetImagenes()` -> Migrado a **SIGMAVI** (`ecommerceactualizarimagenes`), centralizando los assets web fuera del ERP.

## 6. Propiedades de Magento (Configurables y Jerarquías)
**Lógica en SP**: 
Consultaba tablas de despiece como `ARTJUEGO` y `ARTJUEGOD` para armar padres e hijos (tallas y colores).

**Implementación Actual en C# (`#region FASE 11: Propiedades y Atributos`)**:
- `GetJerarquiaArticulos()` -> Esta lógica transaccional de jerarquía sí pertenece al ERP, por lo que fue asignada a **SAP API (`/ZAPI_JERARQUIA_ARTICULOS_SRV`)**.

## 7. Categorización Visual (Carruseles y Nodos Magento)
**Lógica en SP**: 
Dependía de `COMSDSIPCarrusel`, `eCommerceRelCatMagentoIntelisis`.

**Implementación Actual en C# (`#region FASE 9 y 12: Carrusel y Categorías`)**:
- Migrado a **SIGMAVI** (`SDSIPCarrusel` y `EcommerceRelCatMagento`).

---
### 📊 RESUMEN DE LA MIGRACIÓN
El análisis exhaustivo confirma que tu afirmación es correcta: **El proceso no depende de las tablas del viejo SP en Intelisis.**

La re-arquitectura dividió la carga monolítica de manera óptima:
1. **SAP S/4HANA (API):** Toma el control de todo lo que es "Core de Negocio" (Catálogo Base de Artículos, Control de Inventarios, Listas de Precios, y Jerarquías de Producción/Venta).
2. **SIGMAVI (Base de Datos):** Toma el control de todo lo que es "Configuración de E-Commerce" (Banners, Exclusiones de marca específicas para la web, Control SIP, y URLs de imágenes), liberando a SAP de guardar configuraciones estéticas del sitio.

Todo el procesamiento que en 2016 se hacía mediante tablas temporales en SQL Server para unificar estos dos mundos, ahora se hace eficientemente en memoria a través de las 15 fases asíncronas de `EcommerceMethods.cs`.
