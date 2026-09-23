---
tags: [referencia, sigmavi, sap, nomenclatura, tablas]
fuente: Miguel A. Aguilar Marín
actualizado: 2026-09-23
---

# Nomenclatura de campos SAP en las tablas de SIGMAVI

Cómo se llaman las columnas cuando una tabla de SIGMAVI guarda un dato que en SAP tiene
nombre propio. Lo dictó **Miguel A. Aguilar Marín**, que es quien crea las tablas, y aplica
a todo objeto nuevo del repositorio **MaviSAP**.

La regla de fondo: **la columna toma el nombre técnico de SAP, no el de Intelisis**. Una
tabla que antes decía `Familia` ahora dice `ClassN2`, aunque el dato sea el mismo.

## Clasificación del artículo

| Concepto en Intelisis | Columna en SIGMAVI | Tipo |
|---|---|---|
| Categoría | `ClassN1` | `VARCHAR(18)` |
| Familia | `ClassN2` | `VARCHAR(18)` |
| Línea | `ClassN3` | `VARCHAR(18)` |
| Artículo | `MATNR` | `VARCHAR(40)` |

`MATNR` es el número de material de SAP. Ojo con el ancho: **40 caracteres**, no los 15 o 20
que usaban las tablas de Intelisis.

## Área de ventas

| Concepto | Columna en SIGMAVI | Tipo |
|---|---|---|
| Organización de ventas — MA, VIU, MAVI | `VKORG` | `VARCHAR(4)` |
| Canal de distribución | `VTWEG` | `VARCHAR(2)` |
| Sector | `SPART` | `VARCHAR(2)` |

Las tres salen de lo que en Intelisis era **la UEN**, que en SAP se descompone en esos tres
campos. `VKORG` es el que se usa siempre; `VTWEG` y `SPART` no se habían usado hasta ahora.

> ⚠️ **Contradicción en el mensaje de origen.** Dice literalmente *"Campo para guardar
> DIVISION es VTWEG VARCHAR(2)"* y *"Campo para guardar DISTR_CHAN es VTWEG VARCHAR(2)"* —
> las dos líneas nombran `VTWEG`. En SAP estándar `VTWEG` es el canal de distribución
> (`DISTR_CHAN`) y `SPART` es el sector (`DIVISION`), que es como están declaradas arriba y
> como las usa `EcommerceDetPedidos`. **Confirmarlo antes de crear una tabla que dependa de
> esa distinción.**

## Cómo se llenan hoy en el alta de pedido

`OrderMethods.SetOrderAsync` deriva los tres de la tienda y el método de pago:

| | Valor |
|---|---|
| `VKORG` | `04` Muebles América · `05` VIU |
| `VTWEG` | `01` contado · `02` crédito |
| `SPART` | `00` siempre |

El sector es constante: las fichas sd01 y sd09 dicen que `DIVISION` es siempre `"00"`, y el
alta de BP usa `SpartKnvv = "00"`.

## Dónde se aplica ya

| Tabla | Columnas |
|---|---|
| `EcommerceDetPedidos` | `VKORG`, `VTWEG`, `SPART` |
| `ProveedorActivoGarantia` | `ClassN2`, `ClassN3` |
| `eCommerceSetPropiedades` | `VKORG` |

## Qué vigilar al portar una consulta

**El nombre cambia, pero también puede cambiar el valor.** `ClassN2` guarda el **código** de
la clasificación, no su descripción: la familia de telefonía es `SF034L000`, no `TELEFONIA`.
Una consulta portada literalmente desde Intelisis compilará y no encontrará nada.

Es el mismo tropiezo que ya costó una tarde con `FAMILIA` de DM01, así que al cruzar una
tabla de SIGMAVI contra el maestro de artículos conviene comprobar con un dato real que los
dos lados hablan en códigos.
