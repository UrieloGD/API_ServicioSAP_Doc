---
tags: [contrato, endpoint, migracion, ola-6]
partida: E-14
actualizado: 2026-09-03
---

# E-14 — `product/obtenerImagen`

Copia una imagen desde el share de imágenes optimizadas a la carpeta local desde la que
después se suben a Magento, renombrándola por el camino.

> Antes del renumerado del 25-ago esta partida era **E-18**. Los commits y comentarios
> anteriores a esa fecha la nombran así.

## Identidad

| | |
|---|---|
| Verbo | POST |
| Ruta en ServicioSAP | `product/obtenerImagen` |
| Auth | Bearer JWT de `login/auth` |
| Controller | `Controllers\ProductController.cs::ObtenerImagen` |
| Método | `Methods\ProductImage\ProductImageMethods.cs::GetImagesAsync` |
| Origen legado | `APIMagento\Controllers\ProductsController.cs:214` + `Metodos\ProductImage\Methods.cs:388` |
| Destino | SMB de lectura + disco local, impersonando (H-02) |

> **No existe en la DMZ.** Es un endpoint solo de la LAN, así que esta partida **no lleva
> cutover**. Su llamador es el flujo de importación de productos.

## Request body

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `originalName` | string | sí | Nombre del archivo **en el share** |
| `magentoName` | string | sí | Nombre con el que se guarda **en local** |

```json
{ "magentoName": "OLA6_TEST.jpg", "originalName": "ORIGINAL_SKU123.jpg" }
```

El renombrado es el propósito del endpoint: en el share la imagen tiene su nombre original y
en local queda con el que Magento espera.

## Response

> ⚠️ **Siempre responde HTTP 200**, funcione o no.

### 200 — `"Ok"`

```
"Ok"
```

> ⚠️ **`"Ok"` no garantiza que se copiara.** Si el archivo de origen no existe, el método se
> salta la copia y devuelve `"Ok"` igualmente. Es comportamiento heredado.

### 200 — con el mensaje de la excepción

```
"LogonUser failed with error code: 1326"
```

### 401 — sin token

## Recorrido hasta la DMZ

**No aplica.** Sin ruta en la DMZ, sin cutover.

## Efectos

**Lee de un share y escribe un archivo local.** Todo dentro de un bloque de impersonación,
porque al salir se revierte la identidad:

- Origen: `IMAGES_PRODUCT_SHARE_PATH`, hoy `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\`
- Destino: `IMAGES_PRODUCT_PATH`, hoy `C:\inetpub\wwwroot\sap\images\`. Se crea si no existe.

> **`Desarollo` va con una sola erre a propósito.** Está mal escrito en el legado, pero es el
> nombre real del recurso compartido.

> **Decisión del 25-ago:** el destino es la carpeta de ServicioSAP, no la del legado
> (`C:\inetpub\wwwroot\api\images\`), igual que se hizo con `data.db` y con las imágenes de
> crédito. Ambas rutas son configurables.

## 🔴 Corrección de un defecto del legado

Es la única desviación deliberada de la regla de paridad en esta ola, **autorizada
expresamente el 24-ago**.

APIMagento comprueba la existencia con la UNC correcta pero copia con **una sola barra
invertida** (`Metodos\ProductImage\Methods.cs:395-397`):

```csharp
if (File.Exists(@"\\172.16.202.4\ecom\...\" + original))
    File.Copy(@"\172.16.202.4\ecom\...\" + original, ...);   // ← una sola barra
```

Con una sola barra no es una ruta de red, sino una ruta absoluta en la raíz del disco actual.
El resultado queda invertido:

| Situación | Qué pasa en el legado | Qué devuelve |
|---|---|---|
| La imagen **sí** existe | `File.Copy` lanza excepción | el mensaje de error |
| La imagen **no** existe | se salta la copia | **`"Ok"`** |

Es decir: **el legado nunca copia una imagen**, y devuelve `"Ok"` precisamente cuando no hizo
nada. En ServicioSAP ambas rutas salen de la misma clave de configuración.

## Pruebas ejecutadas — 25 ago 2026

| # | Caso | Esperado | Obtenido | |
|---|---|---|---|---|
| 1 | Copia de imagen | `"Ok"` + archivo en destino | 200 `"LogonUser failed with error code: 1326"` | 🔶 |
| 2 | Sin token | 401 | 401 | 🔶 ✅ |

> 🔴 **La corrección de la diagonal NO está verificada por ejecución.** La impersonación
> envuelve toda la operación, así que falla **antes** de llegar al `File.Copy`. Se intentó
> también con un share simulado en disco local y da igual: el `LogonUser` revienta primero.
>
> **Queda verificada por inspección del código, no por ejecución.** Es justo el punto que se
> arregló, así que conviene comprobarlo explícitamente en QA: que un `originalName` existente
> produzca un archivo en la carpeta de destino.

Artefacto reproducible: `ServicioSap\ServicioSap\Tests\ServicioSap.Ola6.http`.

## Comparación contra el legado — 3 sep 2026

Tres casos, todos iguales, con los dos servicios levantados a la vez:

| # | Caso | Legado | ServicioSAP | |
|---|---|---|---|---|
| 1 | `magentoName` y `originalName` válidos | `200 "LogonUser failed with error code: 1326"` | idéntico | ✅ |
| 2 | Campos nulos | `200 "LogonUser failed with error code: 1326"` | idéntico | ✅ |
| 3 | Body nulo | `500 NullReferenceException` | `500 NullReferenceException` | ✅ |

Los dos fallan en el mismo punto y con el mismo texto: **es H-02, no una diferencia entre
versiones**. Sigue sin poder ejercitarse la copia real.

## Diferencias contra el legado

**Una, deliberada:** la ruta de origen del `File.Copy` usa la UNC correcta. Sin ella el
endpoint no copia nada.

> 🟡 **Una segunda, detectada el 3-sep por lectura y todavía sin verificar: el destino que ya
> existe.** El legado usa `File.Copy(origen, destino)` con la sobrecarga de dos argumentos,
> que **lanza `IOException` si el archivo de destino ya está**; el método lo atrapa y devuelve
> el mensaje de error. ServicioSAP abre el destino con `FileMode.Create`, que **sobrescribe** y
> devuelve `"Ok"`.
>
> No se pudo comprobar por ejecución porque H-02 revienta antes de llegar ahí. Como el endpoint
> se usa para refrescar imágenes de producto, sobrescribir es casi seguro lo que se quiere —
> pero es un cambio de respuesta observable y hay que decidirlo, no heredarlo por accidente.
> **Comprobarlo en QA junto con la corrección de la diagonal.**

## Deuda heredada

- **`"Ok"` no distingue "copiada" de "no existía".** Sigue sin distinguirlo tras la
  corrección: si el archivo de origen falta, la respuesta es la misma que si se copió.
- **El código HTTP siempre es 200**, incluso con el mensaje de una excepción en el cuerpo.
- **El nombre del share está mal escrito** (`Desarollo`) y hay que conservarlo así.
