---
proyecto: Mavi
id_requerimiento: SD01
descripcion: Especificación Funcional - Enviar Pedido a SAP (Creación de Órdenes de Venta)
---

# Especificación Maestra: Enviar Pedido a SAP (SD01)

## 1. Contexto Funcional
Esta es la interfaz core **Inbound** mediante la cual los sistemas legados (POS, eCommerce, Liberador) **crean los Pedidos de Venta en SAP S/4HANA**.
En lugar de capturar manualmente en la transacción VA01, el POS envía una petición estructurada a CPI, el cual invoca la BAPI de ventas en S4 (`BAPI_SALESORDER_CREATEFROMDAT2` con múltiples ampliaciones Z) para generar el pedido y poblar tablas extendidas propias de Mavi.

---

## 2. Diccionarios de Negocio (Equivalencias S4)

Para que el pedido se genere exitosamente, el POS debe mapear sus transacciones a la nomenclatura de S4:

### A. Clases de Documento SAP (`DOC_TYPE`)
| Clase | Descripción |
| :--- | :--- |
| `ZADJ` | Pedido Adjudicaciones |
| `ZANC` | Análisis de Crédito |
| `ZMER` | Pedido Mercancía |
| `ZMAY` | Pedido Mayoreo |
| `ZSOC` | Solicitud de Crédito |
| `ZPRE` | Pedido Préstamo Personal |
| `ZMN+` / `ZMN-` | Generación / Redención Monedero |
| `ZMT+` / `ZMT-` | Aumento / Disminución Tarj. Monedero |

### B. Clases de Condición (`COND_TYPE`)
| Clase | Descripción |
| :--- | :--- |
| `ZPCP` | Precio Neto (IVA Incluido) |
| `ZPC2` | Precio Anterior |
| `ZD01` / `ZD02` / `ZD03` | Descuento Promoción / Autorizado / ZZ |

### C. Tipos de Posición (`ITEM_CATEG`)
| Tipo | Descripción |
| :--- | :--- |
| `ZMRM` | Pos. Mercancía |
| `ZMRE` | Pos. Mercancía sin Entrega |
| `ZPRP` | Pos. Préstamo Personal |
| `ZTAN` | Posición estándar facturable |

### D. Interlocutores (`PARTN_ROLE`)
- `AG`: Cliente (Solicitante)
- `Z1`: Agente
- `Z2`: Agente de Servicio
- `Z3`: Agente de Comisión
- `Z4`: Agente de Venta Cruzada

---

## 3. Lógica de Petición (Request Payload)

> [!IMPORTANT]
> **REGLA DE ORO DE INTEGRACIÓN:** El código C# (.NET) **NUNCA** interactuará, consultará ni hará `INSERT` directo en tablas SAP (ni estándar ni Z). Las "Tablas Z" descritas abajo son meramente informativas para saber cómo se guarda el dato en S/4HANA. El Servicio C# se limitará exclusivamente a mapear sus variables internas para construir y enviar este `body` JSON hacia el OData de SAP, y a procesar el `response`.

La API requiere un JSON con la estructura OData jerárquica de la orden. A continuación el detalle exacto de mapeo (Nodos, Parámetros, Campos POS y Reglas de Negocio):

### 3.1 Nodos Estándar BAPI

| Nodos | Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- | :--- |
| **ORDER_HEADER_IN** | `DOC_TYPE` | Mov | Ver Catálogo de Clases de Pedido S4 | CHAR4 |
| | `PURCH_NO_C` | FolioPOS | | CHAR35 |
| | `PURCH_DATE` | FechaEmision | | DATS8 |
| | `PRICE_DATE` | UltimoCambio | | DATS8 |
| | `SALES_ORG` | UEN | MAVI enviará conversión a campos de estructura SAP. DIVISION es "00" | CHAR4 |
| | `DISTR_CHAN` | UEN | | CHAR2 |
| | `DIVISION` | UEN | | CHAR2 |
| | `NAME` | Usuario Pos | | CHAR10 |
| | `SALES_OFF` | SucursalVenta | | CHAR4 |
| | `PMNTTRMS` | Condicion | Código SAP de 4 dígitos de Condiciones de Pago | CHAR4 |
| | `DOC_DATE` | FechaRegistro | | DATS8 |
| | `REF_DOC` | Documento Referencia | Opcional, si no viene valor es sin Referencia a Oferta | CHAR10 |
| | `REF_DOC_CA` | Tipo Doc Referencia | Si viene REF_DOC, indicar "B" (Oferta) | CHAR1 |
| | `CUST_GRP2` | TipoVenta | | CHAR2 |
| **ORDER_PARTNERS** | `PARTN_ROLE` | (interno SAP) | `AG`=Cliente, `Z1`=Agente, `Z2`=Ag.Servicio, `Z3`=Ag.Comision, `Z4`=Ag.VtaCruzada | CHAR2 |
| | `PARTN_NUMB` | Cliente/Agentes | Mapear en campos respectivos de la tabla ZSDT_VBAK | CHAR10 |
| **ORDER_ITEMS_IN** | `PO_ITM_NO` | Renglón | | NUMC6 |
| | `MATERIAL` | Articulo | | CHAR18 |
| | `TARGET_QTY` | Cantidad | | QUAN13 |
| | `TARGET_QU` | Unidad | | UNIT3 |
| | `ITEM_CATEG` | RenglonTipo | Ver tabla de equivalencias S4 | CHAR4 |
| | `BATCH` | LoteMAVI | | CHAR10 |
| | `PLANT` | Sucursal | | CHAR4 |
| | `STORE_LOC` | Almacen | | CHAR4 |
| **ORDER_CONDITIONS_IN**| `COND_TYPE` | - | Precio=`ZPCP`, PrecioAnterior=`ZPC2`, Desc1=`ZD01`, Desc2=`ZD02`, Desc3=`ZD03` | CHAR4 |
| | `COND_VALUE` | Precio/Desc | | DEC28 |
| **ORDER_TEXT** | `TEXT_LINE` | DescripcionExtra | `ITM_NO = POSNR`, `TEXT_ID = "Z001"`, `LANGU = "S"` | CHAR132 |

### 3.2 Nodos Z de la Petición (Tablas Extendidas MAVI)

**A. ZSDT_VBAK (Cabecera del pedido)**
| Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- |
| `VBELN` | Documento de ventas | Campo clave | CHAR10 |
| `ZAUART` | Clase de documento | Campo clave | CHAR4 |
| `ZCONCEPTO` | Concepto | | CHAR50 |
| `ZKUNNR1` | Agente | ORDER_PARTNERS-PART_NUMB cuando PARTN_ROLE = "Z1" | CHAR10 |
| `ZKUNNR2` | AgenteServicio | ORDER_PARTNERS-PART_NUMB cuando PARTN_ROLE = "Z2" | CHAR10 |
| `ZKUNNR3` | AgenteComision | ORDER_PARTNERS-PART_NUMB cuando PARTN_ROLE = "Z3" | CHAR10 |
| `ZKUNNR4` | AgenteVtaCruzada | ORDER_PARTNERS-PART_NUMB cuando PARTN_ROLE = "Z4" | CHAR10 |
| `ZREFERENCIA` | Referencia | | CHAR50 |
| `ZOBSERVACIONES` | Observaciones | | CHAR255 |
| `ZSITUACION` | Situacion | | CHAR50 |
| `ZSITUACIONFECHA` | SituacionFecha | | TIMESTAMP |
| `ZSITUACIONUSUARIO` | SituacionUsuario | | CHAR10 |
| `ZFORMAENVIO` | FormaEnvio | | CHAR50 |
| `ZSERVTIPOOP` | ServicioTipoOperacion | | CHAR50 |
| `ZCAUSA` | Causa | | CHAR50 |
| `ZORIGEN` | Origen | | CHAR20 |
| `ZORIGENID` | OrigenID | | CHAR20 |
| `ZAUDAT` | FechaRegistro | | TIMESTAMP |
| `ZFECHACONCL` | FechaConclusion | | TIMESTAMP |
| `ZFECHACANCEL` | FechaCancelacion | | TIMESTAMP |
| `ZFECHAENTREG` | FechaEntrega | | TIMESTAMP |
| `ZEMBARQUEESTADO` | EmbarqueEstado | | CHAR50 |
| `ZFORMAPAGOTP` | FormaPagoTipo | | CHAR9 |
| `ZAFECTACOMISION` | AfectaComision | | CHAR1 |
| `ZIDSTATUS` | Estatus | | CHAR2 |
| `ZCONTIMPSIMP` | ContImpSimp | | INT4 |
| `ZCONTIMPCIEGO` | ContImpCiego | | INT4 |
| `ZCONTIMPCFD` | ContImpCFD | | INT4 |
| `ZFORMACOBRO` | FormaCobro | Validar contra CAR TWPPF-PVORG | CHAR4 |
| `ZREDIMEPOS` | RedimePtos | | CHAR1 |
| `ZCOMLIBERA` | ComLibera | | CHAR100 |
| `ZBAND402` | Band402 | | CHAR1 |
| `ZFECHAENVCRED` | FechaEnvioCredito | | TIMESTAMP |
| `ZLIBERADO` | Liberado | | INT4 |
| `ZAUTORIZA` | Autoriza | | CHAR12 |
| `ZARTQ` | ArtQ | | CHAR1 |
| `ZIDECOMM` | IDEcommerce | | CHAR20 |
| `ZPAGODIE` | PagoDie | | CHAR1 |
| `ZREPDESCTO` | ReporteDescuento | | INT4 |
| `ZVTADIMANUEVO` | VtaDIMANuevo | | CHAR1 |
| `ZREDIMEPUNTOS` | RedimePuntos | | CURR(10.2) |
| `ZPRERASTREO` | Prerastreo | | CHAR1 |
| `ZTRANSFERENSTP` | TransferenciaSTP | | CHAR1 |
| `ZCTEFINAL` | CteFinal | | CHAR10 |

**B. ZSDT_MOVBITA (MovBitacora)**
| Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- |
| `VBELN` | Documento de ventas | Campo clave | CHAR10 |
| `BSTDK` | Fecha | Campo clave | TIMESTAMP |
| `WERKS` | Sucursal | | CHAR4 |
| `BSTKD_E` | Tipo | | CHAR35 |
| `BNAME` | Usuario POS | | CHAR35 |
| `IHREZ_E` | Clave | | CHAR12 |
| `ZMODULO` | Modulo | | CHAR5 |
| `ZEVENTOS` | Evento | | CHAR255 |
| `ZOBSREANALISIS` | ObsReanalisis | | CHAR250 |
| `ZTIPORESPUESTA` | TipoRespuesta | | CHAR12 |
| `ZCITACLIENTE` | CitaCliente | | CHAR1 |
| `ZCITAAVAL` | CitaAval | | CHAR1 |
| `ZHORACITA` | HoraCita | | CHAR30 |
| `ZFECHACITA` | FechaCita | | DATS8 |

**C. ZSDT_VBAP (Posiciones del pedido)**
| Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- |
| `VBELN` | Documento de ventas | Campo clave | CHAR10 |
| `POSNR` | Posición | Campo clave | NUMC6 |
| `KWERT` | Precio Anterior | ORDER_CONDITIONS_IN-COND_VALUE (ZPC2) | CURR(13.2) |
| `ZDESCREXTRA` | Descripción Extra | ORDER_TEXT-TEXT_LINE | CHAR132 |
| `ZPUNTOS` | Puntos | | CURR(10.2) |
| `ZIDCOPIA` | IDCopia | | INT4 |
| `ZUSUDESCTO` | UsuarioDescuento | | CHAR30 |
| `ZIDCAMPAPROMO` | IdCampanaPromocion | | INT4 |
| `ZPADRE` | Padre | | CHAR250 |
| `ZTPPROMO` | TipoPromocion | | CHAR4 |
| `ZKWERT3` | Descuento 1 | ORDER_CONDITIONS_IN-COND_VALUE (ZD01) | CURR(13.2) |
| `ZKWERT4` | Descuento 2 | ORDER_CONDITIONS_IN-COND_VALUE (ZD02) | CURR(13.2) |
| `ZKWERT5` | Descuento 3 | ORDER_CONDITIONS_IN-COND_VALUE (ZD03) | CURR(13.2) |

**D. ZSDT_MOVTPO (MovTiempo)**
| Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- |
| `VBELN` | Documento de Ventas | Campo clave | CHAR10 |
| `ZMODULO` | Modulo | | CHAR5 |
| `ZFECHACOM` | FechaComenzo | Campo clave | TIMESTAMP |
| `ZFECHAFIN` | FechaTermino | | TIMESTAMP |
| `ZIDSTATUS` | Estatus | | CHAR16 |
| `ZSITUACION` | Situacion | | CHAR50 |
| `WERKS` | Sucursal | | CHAR4 |
| `BNAME` | Usuario | | CHAR35 |

**E. ZSDT_AUTOINCR (AutorizaIncremento)**
| Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- |
| `VBELN` | IdVenta | Campo clave | CHAR10 |
| `ZBSTDK` | Fecha | Campo clave | TIMESTAMP |
| `POSNR` | Posicion | Campo clave | NUMC6 |
| `WERKS` | Sucursal | | CHAR4 |
| `BNAME` | Usuario Pos | | CHAR35 |
| `AUART` | Mov | | CHAR4 |
| `MATNR` | Material | | CHAR18 |
| `KBETR` | precio | ORDER_CONDITIONS_IN-COND_VALUE (ZPCP) | CURR(10.2) |
| `ZKBETR2` | precioanterior | ORDER_CONDITIONS_IN-COND_VALUE (ZPC2) | CURR(10.2) |

**F. ZSDT_SERIES**
| Parámetro | Campo POS | Comentarios/Reglas de Negocio | Long. |
| :--- | :--- | :--- | :--- |
| `VBELN` | Documento de ventas | Campo clave | CHAR10 |
| `POSNR` | Posición | Campo clave | NUMC6 |
| `SERNR` | Número de serie | Campo clave | CHAR18 |

---

## 4. Reglas Especiales de Negocio (`ZIDSTATUS`)

La tabla `ZSDT_VBAK` (y otras secundarias) posee un campo crítico llamado `ZIDSTATUS`. 
- **`01` (Pendiente)**: Estatus inicial al nacer el documento.
- **`02` (Concluido)**: Cambia automáticamente cuando nace el documento subsecuente (Ej. De Solicitud -> Oferta, o de Oferta -> Pedido).
- **`03` (Anulado)**: Se asigna si se cancela.
*Nota: El pedido de venta se mantiene en `01` mientras no sea facturado en su totalidad.*

---

## 5. Información Técnica (Servicio S4 y CPI)

- **Nombre de Objeto S4**: `ZAPI_SALESORDER_SRV`
- **Artefacto CPI**: `RSG_SD01_ZAPI_SALESORDER_SRV`
- **Entidad OData**: `A_SALES_ORDERSet`
- **Método**: `POST`

### Estructura de Respuesta
En caso de éxito o fallo, SAP retornará un Payload donde lo más importante viene en la cabecera del response y en la entidad de retorno:
- **`Salesdocument`**: Número de Pedido creado en S/4HANA (Ej. `123456789`).
- **`to_return`**: Arreglo de mensajes de SAP (Tipo `S`uccess, `E`rror, `W`arning) con la justificación del rechazo o éxito.

---

> [!CAUTION]
> **Orquestador (Vanguard):** 
> La creación de órdenes es el flujo más denso. Cientos de propiedades del JSON deben mapearse con precisión a las tablas `ZSDT_VBAK` (Cabecera extendida) y `ZSDT_VBAP` (Posiciones extendidas). Asegúrate de respetar el tipo de dato que demanda SAP, especialmente en fechas (enviar `yyyy-MM-ddTHH:mm:ss`) y evitar caracteres especiales en los códigos de condición. Este endpoint es la cúspide de la migración de legados a SAP.
