---
proyecto: Mavi
id_requerimiento: SD09
descripcion: Especificación Funcional - Enviar Pedido de Devolución a SAP
---

# Especificación Maestra: Enviar Pedido de Devolución (SD09)

## 1. Contexto Funcional
Esta API "Inbound" permite al sistema POS crear un documento de **Pedido de Devolución** de mercancía en SAP S/4HANA (`ZDME`). Las devoluciones siempre deben hacerse con referencia a una factura existente de SD.

---

## 2. Lógica de Petición (Request Payload)

> [!IMPORTANT]
> **REGLA DE ORO DE INTEGRACIÓN:** El código C# (.NET) **NUNCA** interactuará, consultará ni hará `INSERT` directo en tablas SAP (ni estándar ni Z). Las "Tablas Z" descritas abajo son meramente informativas para saber cómo se guarda el dato en S/4HANA. El Servicio C# se limitará exclusivamente a mapear sus variables internas para construir y enviar este `body` JSON hacia el OData de SAP, y a procesar el `response`.

El endpoint procesa la información invocando a la función ABAP `BAPI_CUSTOMERRETURN_CREATE`.

### 2.1 Nodos Estándar BAPI

| Nodos | Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- | :--- |
| **RETURN_HEADER_IN** | `DOC_TYPE` | Mov | `ZDME` (Pedido Dev. Mercancía) | CHAR4 |
| | `PURCH_NO_C` | FolioPOS | | CHAR35 |
| | `PURCH_DATE` | FechaEmision | | DATS8 |
| | `PRICE_DATE` | UltimoCambio | | DATS8 |
| | `SALES_ORG` | UEN | MAVI enviará conversión. DIVISION siempre es "00" | CHAR4 |
| | `DISTR_CHAN` | UEN | | CHAR2 |
| | `DIVISION` | UEN | | CHAR2 |
| | `NAME` | Usuario Pos | | CHAR10 |
| | `SALES_OFF` | SucursalVenta | | CHAR4 |
| | `PMNTTRMS` | Condicion | Código SAP de 4 dígitos | CHAR4 |
| | `DOC_DATE` | FechaRegistro | | DATS8 |
| | `REF_DOC` | Documento Referencia | **Obligatorio**. Indicar Factura SD. | CHAR10 |
| | `REF_DOC_CA` | Tipo Doc Referencia | Valor fijo "M" o "F" según Dispatcher. | CHAR1 |
| | `CUST_GRP2` | TipoVenta | | CHAR2 |
| **RETURN_PARTNERS** | `PARTN_ROLE` | (interno SAP) | `AG`=Cliente, `Z1`=Agente, `Z2`=Ag.Serv., `Z3`=Ag.Com., `Z4`=Ag.VtaCruz. | CHAR2 |
| | `PARTN_NUMB` | Cliente/Agentes | | CHAR10 |
| **RETURN_ITEMS_IN** | `PO_ITM_NO` | Renglón | | NUMC6 |
| | `MATERIAL` | Articulo | | CHAR18 |
| | `TARGET_QTY` | Cantidad | | QUAN13 |
| | `TARGET_QU` | Unidad | | UNIT3 |
| | `ITEM_CATEG` | RenglonTipo | Ver tabla de equivalencias S4 | CHAR4 |
| | `BATCH` | LoteMAVI | | CHAR10 |
| | `PLANT` | Sucursal | | CHAR4 |
| | `STORE_LOC` | Almacen | | CHAR4 |
| **RETURN_CONDITIONS_IN**| `COND_TYPE` | - | Precio = `ZPMN` | CHAR4 |
| | `COND_VALUE` | Precio | | DEC28 |
| **RETURN_TEXT** | `TEXT_LINE` | DescripcionExtra | `ITM_NUMBER=POSNR`, `TEXT_ID="Z001"`, `LANGU="S"` | CHAR132 |

*(También se inyectan las tablas de repartos `RETURN_SCHEDULES_IN` donde `SCHED_LINE = "0001"` y `REQ_QTY = TARGET_QTY`).*

### 2.2 Nodos Z de la Petición (Tablas Extendidas MAVI)
La creación de la Devolución inserta registros en las tablas Z habituales (identica estructura a SD01/SD03/SD04):

**A. ZSDT_VBAK (Cabecera)**: Registra datos de situación, fechas, orígenes, montos y estatus.
**B. ZSDT_VBAP (Posiciones)**: Registra datos de precios, descuentos, padre y promociones.
**C. ZSDT_MOVBITA (MovBitacora)** y **D. ZSDT_MOVTPO (MovTiempo)**: Bitácora de eventos y tiempos.
**E. ZSDT_AUTOINCR (AutorizaIncremento)**: Registra precios.
**F. ZSDT_SERIES**:
| Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- |
| `VBELN` | Documento de ventas | Campo clave | CHAR10 |
| `POSNR` | Posición | Campo clave | NUMC6 |
| `SERNR` | Número de serie | Campo clave | CHAR18 |

---

## 3. Orquestación y Lógica ABAP (Extensiones)

El proceso general de Inserción sigue el Dispatcher documentado en SD01, pero cuando la clase de documento `DOC_TYPE` es **`ZDME`**:
1. **Validación de Factura**: SAP validará que `RETURN_HEADER_IN-REF_DOC` tenga valor (Error `ZSD001`). Luego consultará la tabla SAP `VBRK` para asegurar que dicha factura existe (Error `ZSD002`).
2. **Validación de Series**: SAP cruzará las series enviadas en el payload (`to_series`) contra las series originalmente facturadas (tablas `VBRP` y `ZSDT_SERIES` padre). Si no coinciden, arroja error `ZSD003`.
3. **Ejecución BAPI**: Si todo es correcto, se invoca `BAPI_CUSTOMERRETURN_CREATE`.
4. **User Exit**: Se implementa la ampliación `USEREXIT_SAVE_DOCUMENT_PREPARE` para ingresar el contenido de la serie a la estructura `VBSN` usando `SERNR_ADD_TO_AU`, y se recalculan los totales `NETWR` y `MWSBP`.

---

## 4. Detalles Técnicos
- **Entidad OData**: `/A_SALES_ORDERSet`
- **Método**: `POST`
- **Seguridad**: Autenticación Bearer Token y CSRF Token provistos por C#. Mismo tenant y cliente CPI de toda la suite SD.
