---
tags: [migracion, sap, bp, ecommerce, checklist, campos]
fecha: 2026-09-14
estado: para trabajar — pendiente de validación campo por campo
base: "BP piso 1500004598 (ELIZABETH MEDINA) vs BP ecommerce 1500008089 (MARCOS GALINDO)"
---

# Checklist de campos — BP de ecommerce

> Todo lo de aquí sale de comparar **dos responses reales** de `ZAPI_BP05MA_SRV`. No hay deducciones del checklist de Excel.
>
> Archivo a tocar: `ServicioSap\Methods\BusinessPartner\BusinessPartnerMethods.cs` → `BuildClientFromCustomerRequest` (`:417-766`).
>
> Análisis completo en [[RESUMEN_Check_list_BPs_Deudor]] §5d.

**Cómo usar esta lista:** consulta tu BP de ecommerce, compara contra la columna *Piso*, y marca la casilla cuando el campo quede igual.

---

## A · Se puede arreglar YA — el dato ya está o es fijo

| ☐   | Campo                 | Línea  | Manda hoy                 | Piso   | Acción                                                  |
| --- | --------------------- | ------ | ------------------------- | ------ | ------------------------------------------------------- |
| ☐   | `Aland`               | `:567` | `""`                      | `MX`   | poner `"MX"`                                            |
| ☐   | `Tatyp`               | `:568` | `""`                      | `TMX1` | poner `"TMX1"`                                          |
| ☐   | `Taxkd`               | `:569` | `""`                      | `1`    | poner `"1"`                                             |
| ⏸   | `Ktokd`               | `:522` | `0110`                    | `CLIE` | poner `"CLIE"` — SAP ya lo ignora y guarda CLIE  ⏸ **EN SUSPENSO** — businesspartner-dev manda lo mismo, ver §N.2 |
| ⏸   | `Antlf`               | `:548` | `9`                       | `0`    | poner `"0"`  ⏸ **EN SUSPENSO** — businesspartner-dev manda lo mismo, ver §N.2 |
| ⏸   | `Eikto`               | `:550` | `32556690`                | `""`   | **vaciar**  ⏸ **EN SUSPENSO** — businesspartner-dev manda lo mismo, ver §N.2 |
| ⏸   | `Kdgrp`               | `:541` | `01`                      | `""`   | **vaciar**  ⏸ **EN SUSPENSO** — businesspartner-dev manda lo mismo, ver §N.2 |
| ☐   | `NameOrg1`            | `:476` | `muebles_america` / `viu` | `""`   | **vaciar** — es campo de organizaciones, no de personas |
| ☐   | `toCte.Zcompania`     | `:636` | el correo                 | `""`   | **vaciar** — nadie lo usa                               |
| ☐   | `toCte.ZmapLat`       | `:648` | `0.00`                    | `""`   | **vaciar**                                              |
| ☐   | `toCte.ZmapLong`      | `:649` | `0.00`                    | `""`   | **vaciar**                                              |
| ☐   | `toCte.Zirreg`        | `:615` | `""`                      | `0`    | poner `"0"`                                             |
| ☐   | `toCte.ZnegBc`        | `:616` | `""`                      | `0`    | poner `"0"`                                             |
| ☐   | `toCte.ZreestrucDeud` | `:620` | `""`                      | `0`    | poner `"0"`                                             |
| ☐   | `toCte.Zcreditoesp`   | `:594` | `""`                      | `0`    | poner `"0"`                                             |

---

## B · Bloqueado por el payload de Magento

No se puede llenar hasta que el body de `setCustomer` traiga el dato. El propio código lo anota en `:460`.

| ☐ | Campo | Línea | Manda hoy | Piso | Necesita |
|---|---|---|---|---|---|
| ☐ | `PostCode1` | `:503` | `""` | `44530` | **CP en el body** |
| ☐ | `City1` | `:502` | `""` | `GUADALAJARA` | municipio, o SEPOMEX con el CP |
| ☐ | `City2` | `:501` | `""` | `RINCONADA DEL BOSQUE` | **la colonia** |
| ☐ | `HouseNum1` | `:495` | `""` | `3451` | número exterior |
| ☐ | `Region` | `:505` | `JAL` fijo | `JAL` | el estado real |
| ☐ | `Stcd1` | `:519` | `XAXX010101000` | `MEHE700514CP7` | **el RFC real** |
| ☐ | `Rfc` | `:575` | `""` | — | ídem |
| ☐ | `Marst` | `:489` | `1` fijo | `""` | estado civil real |
| ☐ | `toCte.Zcurp` | `:590` | `""` | `""` | CURP — piso tampoco lo trae |
| ☐ | `toCte.ZentCalles` | `:587` | `""` | `MINA` | entre calles |

> `NameCo` (`:496`) lleva hoy la dirección. Según el checklist es el **número interior**. Va aquí porque depende de que Magento lo mande por separado.

---

## C · 🔴 El teléfono — bloquea la validación de crédito

| ☐ | Campo | Línea | Manda hoy | Piso |
|---|---|---|---|---|
| ☐ | `toCteTel.ZappOrig` | `:667` | `""` | `PUNTO_VENTA` / `CteXpressFrontSAP` |
| ☐ | `toCteTel.ZvalTel` | `:666` | `false` | `true` |
| ☐ | `toCteTel.ZidcteTel` | `:661` | `""` | `1`, `1211`, `0000001212` |
| ☐ | `toCteTel.Zfecha` | `:664` | `null` | fecha real |
| ☐ | `toCteTel.ZfechaCap` | `:668` | `""` | fecha real |

> [!danger] Por qué importa más que el resto
> `IsValidatedAsync` exige `Zvaltel && ZappOrig != "" && ZtipoCte == "MOVIL"`. Con `Zvaltel = false` y `ZappOrig = ""`, **un BP de ecommerce nunca puede pasar esa validación**.
>
> ⚠️ **Pero `Zvaltel` no se pone en `true` a mano.** El teléfono se valida por el ciclo de NIP/SMS. Lo que sí toca decidir: **qué valor de `ZappOrig` le corresponde a ecommerce** — piso usa `PUNTO_VENTA` y `CteXpressFrontSAP`. Hace falta el equivalente nuestro.

---

## D · Nodos que faltan del todo

| ☐ | Nodo | Estado | Qué lleva en piso |
|---|---|---|---|
| ☐ | `to_CteDatosBancarios` | **vacío** | `Banks MX` · `Bankl 002` · `Bankn 5615454` |
| ☐ | `Kvgr4` (CFDI) | **no existe en el modelo `Client`** | `SI` / `NO` |
| ☐ | `Bzirk` | `""` (`:542`) | `04` / `05` |
| ☐ | Atributos 1-6 | **no existen en el modelo** | `0`/`1` cada uno |
| ☐ | Funciones IC `FLCU00` + `FLCU01` | **no existe campo** | — |

`Kvgr4` y los atributos requieren **agregar propiedades al modelo** — no es sólo asignar un valor.

---

## E · Quitar: lo que mandamos y no debería ir

| ☐ | Qué | Línea | Por qué |
|---|---|---|---|
| ☐ | Todo el nodo `toCteCto` con `Zparentesco = "CONYUGE"` | `:674-699` | Registra al titular como su propio cónyuge. **El BP de piso tiene ese nodo con una fila toda vacía** |
| ☐ | `toCteCtoDireccion` con `Zdire`/`Zcolonia` = `TEST` | `:704-705` | Valores de prueba en producción |
| ☐ | `toCteCtoDireccion.ZcodPostal = "47504"` | `:706` | Ídem |
| ☐ | `toCteCtoDireccion.Zpobl = "001"` / `Zestado = "14"` | `:707-708` | Ídem |

---

## F · NO tocar — coincide con piso

`Type 1` · `Bpkind 0001` · `BuGroup CLIE` · `BuSort1/2 ABC` · `Natpers X` · `Natio MX` · `Stkzn X` · `TdSwitch X` · `Waers MXN` · `Ktgrd 01` · `Vsbed 01` · `Lprio 02` · `Awahr 100` · `Bukrs 5510` · `SpartKnvv/Knvp 00` · `VkorgKnvv/Knvp 04`/`05` · `TimeZone ""` y `Langu ""` (SAP los llena solo).

**`Altkn = "1234567890"`**: el BP de piso trae **el mismo valor**. No es un defecto de ecommerce; si está mal, está mal en las dos poblaciones.

---

## G · Lo llena otro proceso — NO es hueco nuestro

No confundir "el de piso lo tiene y nosotros no" con "nos falta mandarlo". Estos son resultado de una **evaluación de crédito posterior**:

`toCte.Zcredito` (`0.1 CLIENTE (AAA)`) · `toCte.ZlimCred` (`60000.000`) · `toCte.Zcrmimporte` / `Zcrmcantidad` · `toCte.ZrecomendPor` · `toCte.Zfecha4` · `toCte.ZtipoCliente` (`Nuevo`)

⚠️ `ZtipoCliente` es el más dudoso de la lista: *"Nuevo"* podría ser algo que sí se setea al alta. **Confirmar.**

---

## H · Las áreas de ventas secundarias

Nuestro BP tiene 4 filas en `to_CteDatosComerciales` (`Vkorg 04/05` × `Vtweg 01/02`), pero **sólo la primera (`04/01`) trae valores**. Las otras tres salen con `Awahr "000"`, `Lprio "00"`, `Kalks ""`.

Las crea el proceso de habilitación de combinación — y las crea **sin los valores comerciales**. El de piso tiene las 6 suyas completas.

☐ **Decidir si eso importa** antes de tocar nada: puede ser que esas áreas sólo necesiten existir.

---

## I · 🔬 La ESTRUCTURA — no sólo los valores

> [!important] Antes que nada, una distinción que hay que respetar
> **`ZAPI_BP01_PARTNER_SRV` (escritura) y `ZAPI_BP05MA_SRV` (lectura) son servicios distintos, con contratos distintos.** Que el response de lectura venga con nodos `results[]` **no prueba** que el de escritura los espere.
>
> Y la evidencia dice que nuestra forma plana **funciona**: los BP se crean. Así que **no se puede afirmar que esté mal estructurada**.
>
> Lo que sí se puede afirmar es otra cosa, y es lo que sigue.

### I.1 El modelo `Client` sólo puede expresar UNO de cada nodo

Verificado en `Models\SAP\BusinessPartner\Client.cs`: **cero `List<>` en todo el archivo**. Los cinco nodos hijos son objetos únicos:

```csharp
public Cte            toCte              { get; set; }   // :130
public CteTel         toCteTel           { get; set; }   // :131
public CteCto         toCteCto           { get; set; }   // :132
public CteCtoAddress  toCteCtoDireccion  { get; set; }   // :133
public CteCtoJob      toCteCtoEmpleo     { get; set; }   // :134
```

El resto va **plano** sobre `Client`: dirección, sociedad, impuestos, datos comerciales, funciones de interlocutor y datos bancarios son campos sueltos, no colecciones.

**Consecuencia:** una llamada a `BuildClientFromCustomerRequest` sólo puede producir **un teléfono, una dirección, una fila de impuestos, un área de ventas, una función de interlocutor y una cuenta bancaria.**

### I.2 Dónde eso sí es un límite real

| Nodo | Piso | Nosotros | ¿Es límite? |
|---|---:|---:|---|
| **Impuestos** | **2** (`TMX1` clasif 1 + `TMX2` clasif 0) | 1 | 🔴 **sí** — plano sólo da una |
| **Datos bancarios** | 1 | 0 | 🔴 **sí** — el checklist pide **DOS cuentas**: donde se deposita el préstamo y donde el cliente abona |
| **Teléfonos** | 6 | 1 | 🟠 **probable** — Magento manda `telefono` **y** `telefonoClienteMavi`, y sólo mapeamos uno |
| Direcciones | 9 | 1 | ✅ **no** — hay alta aparte: `partner/{bpId}/address/{addressId}` y `DeliveryAddressMethods` |
| Áreas de ventas | 6 | 4 | ⚠️ ver I.3 |
| Funciones interlocutor | varias | — | 🔴 ver I.4 |

### I.3 ⚠️ Las 3 áreas extra aparecen y no sabemos quién las crea

Nuestro BP tiene **4 filas** en `to_CteDatosComerciales`, pero `BuildClientFromCustomerRequest` manda **una sola** (`VkorgKnvv` + `VtwegKnvv` + `SpartKnvv`).

El bloque que creaba las demás —`EnableBpCombinationAsync` vía `AC_POST_HabilitaCombinacionBP`— **está comentado** en `BusinessPartnerMethods.cs:116-146`, con la nota *"no se debe dar de alta un registro en crédito automático"*. El único llamador vivo es `BusinessPartnerController.cs:110`, un endpoint manual.

**Así que alguien más las creó.** Tres posibilidades, y no me consta cuál:
1. El BP se creó antes de que se comentara el bloque.
2. Alguien llamó al endpoint manual.
3. SAP las genera solo al recibir el alta.

Importa porque **las 3 filas extra salieron sin valores comerciales** (`Awahr "000"`, `Lprio "00"`, `Kalks ""`), y el de piso las tiene completas.

☐ **Averiguar quién las crea antes de tocar nada de áreas.**

### I.4 🔴 `Parvw = "WE"` no es lo que SAP guarda

Mandamos una sola función de interlocutor:

```csharp
Parvw = "WE",   // :573   (destinatario de mercancías)
```

Pero el response de **nuestro propio BP** trae cuatro, y ninguna es `WE`:

| `Parvw` | Qué es |
|---|---|
| `SP` | solicitante |
| `BP` | destinatario de factura |
| `PY` | responsable de pago |
| `SH` | destinatario de mercancías |

El BP de piso trae exactamente las mismas cuatro. **SAP genera el juego estándar e ignora nuestro `WE`.** No rompe nada, pero el payload está declarando algo que el sistema descarta — igual que `Ktokd`.

☐ Decidir: quitarlo, o alinearlo a lo que SAP realmente usa.

### I.5 Lo que el response trae y nuestro modelo no contempla

Nodos que existen en la lectura y que no tienen contraparte en `Client`:

| Nodo | Nuestro BP |
|---|---|
| `to_CtePersonaContacto` | `results: []` — vacío también en piso |
| `to_CteDomicilio` | lo llena el alta de direcciones aparte |
| `to_CteSociedad` · `to_CteCliente` · `to_CtePersonalAdr` | los mandamos **planos** y el sistema los acomoda |

> No son huecos: son la diferencia entre el contrato de escritura y el de lectura. **Sólo confirmarlo si en algún momento BP01 empieza a rechazar la forma plana.**

---

## J · 🔬 Contraste con `salesanddistribution-dev` — otra implementación del MISMO servicio

> Revisado el repo completo. De ~60 rutas, **una sola escribe por `ZAPI_BP01_PARTNER_SRV/BPartnerSet`**, el mismo servicio que usa `SubmitClientInfoAsync`:
> `appspi
outes\AS_POST_ActualizarTelefono.py`
>
> El resto de rutas BP (`AS_GET_BusinessPartner`, `AS_GET_Bp_Reactivado`) son **sólo lectura**. **Ese proyecto no crea BPs** — el alta es exclusivamente nuestra.
>
> *(Los documentos `MAPEO_CAMPOS_SAP.md`, `CONSISTENCIA_SAP_RESPONSE.md` e `INCONSISTENCIAS_DATOS_SAP.md` de ese repo son de **productos**, no de BP. `analisis_mapeo_campos.md` está vacío.)*

### J.1 ✅ Confirma que nuestros nombres y estructura son correctos

Su modelo `ToCteTel` declara **exactamente los mismos 13 campos** que nuestro `CteTel`, con la misma grafía:

```python
Zfecha · Partner · ZidcteTel · ZtipoCte · ZtelCte · ZenvioNip · ZvalTel
ZappOrig · ZfechaCap · ZtelExist · ZtraeTel · Zintentos · ZtipoValid
```

Y tres cosas más que coinciden:

| | Ellos | Nosotros |
|---|---|---|
| `toCteTel` | objeto **único**, no lista | objeto único ✅ |
| Nodo de retorno | `toReturn` | `[JsonPropertyName("toReturn")]` ✅ |
| Envoltura | ninguna — el payload va plano | plano ✅ |

**Esto zanja la duda del §I:** la forma plana con nodos únicos **es la correcta para BP01**. Una implementación independiente llegó a la misma. No hay que reestructurar nada.

### J.2 🔴 La diferencia real: `""` no es lo mismo que omitir

Ellos declaran **todos los campos opcionales** y limpian el payload antes de mandarlo:

```python
class ToCteTel(BaseModel):
    Zfecha: str = None
    ZtipoCte: str = None
    ...

data = cliente.dict(exclude_none=True)   # <- los None NO viajan
```

Resultado: para actualizar un teléfono mandan **sólo `Partner` + los campos que cambian**. Nada más.

Nosotros hacemos lo contrario: `BuildClientFromCustomerRequest` asigna **los ~190 campos explícitamente**, y los vacíos van como `""`. Nuestro `JsonIgnoreCondition.WhenWritingNull` sólo omite los `null` — y casi todos nuestros vacíos son `""`, no `null`.

> [!warning] Por qué esto importa, y no es cosmético
> `SubmitClientInfoAsync` está documentado (`:72`) como: *"if partner is empty, it will create a new record, if not, it will **update an existing one**"*.
>
> En un **alta** mandar `""` es inocuo. En una **actualización** no: `""` es un valor, y **sobrescribe con blanco** lo que hubiera. Omitir el campo lo deja intacto.
>
> Hoy no estalla porque los tres llamadores mandan `Partner = ""` — verificado en `BusinessPartnerController.cs:47` y `:68`, y `OrderMethods.cs:2705`, cuyo constructor pone `Partner = ""` (`:2746`). **Siempre creamos, nunca actualizamos.**
>
> ☐ **Pero el método promete que actualiza.** El día que alguien lo llame con un Partner real, borra 69 campos del BP. Hay que decidir: o se documenta que sólo sirve para alta, o se adopta el patrón de ellos (omitir en vez de vaciar).

### J.3 Diferencia de autenticación — no aplicable

Ellos usan `get_token_RSG()` → `Authorization: Bearer`. Nosotros usamos Basic vía `CreateClientS4()` con las credenciales de `ConexionSap.dll`.

Es la vía RSG/CPI, que **está descartada para nosotros** ([[GUIA_MIGRACION_FABLE]] §1.1-1.2). Se anota sólo para que nadie la copie de ahí.

### J.4 Lo que NO encontramos ahí

Buscado y sin resultado: ningún alta de BP, ninguna estructura `Client` completa, ningún mapeo de `to_Cte`, ni valores de referencia para `ZappOrig`, `Kvgr4`, `Bzirk` o los atributos.

**Ese repo no ayuda a llenar los huecos de las secciones A-D.** Sirve para dos cosas concretas: confirmar la estructura (J.1) y revelar el patrón de payload parcial (J.2).

---

## K · 🔴 SON DOS CONSTRUCTORES, y divergen

> Hasta aquí el checklist hablaba de uno solo. **Hay dos**, y no producen el mismo BP.

| | Método | Archivo | Fuente |
|---|---|---|---|
| **BP-1 · directo** | `BuildClientFromCustomerRequest` | `BusinessPartnerMethods.cs:417` | `CustomerRequest` — el body de `customer/setCustomer` |
| **BP-2 · desde la orden** | `BuildBpClientFromOrder` | `OrderMethods.cs:2717` | `OrderRequest.infoCliente` — el body del pedido |

Los dos llaman al mismo `SubmitClientInfoAsync`. **Nacen con datos distintos porque los bodies son distintos**, y eso es legítimo. Lo que no es legítimo es que **el mismo campo lleve valores distintos sin razón**.

### K.1 Donde BP-2 está MEJOR que BP-1

BP-2 aprovecha que `infoCliente` trae mucho más. Estos son huecos de BP-1 que **ya están resueltos** en el otro:

| Campo | BP-1 (directo) | BP-2 (orden) |
|---|---|---|
| `HouseNum1` | `""` | `info.numExt` |
| `StrSuppl1` | `""` | `info.numInt` |
| `StrSuppl2` | `""` | `info.entreCalles` |
| `StrSuppl3` | `""` | **`info.colonia`** |
| `City1` | `""` | `info.municipio` |
| `PostCode1` | `""` | **`info.codigoPostal`** |
| `NameCo` | la dirección (duplicada) | `info.referencia` |
| `Stcd1` | `XAXX010101000` fijo | **el RFC real** si viene |
| `Rfc` | `""` | `info.rfc` |
| `Natio` | `MX` fijo | `info.pais` o `MX` |
| `Aland` | `""` | `pais` |
| `Fiscalregimen` · `Usocfdi` | `""` | del payload |
| `toCte.Zusuariopos` | `""` | `orderRequest.Agente` |
| `toCte.Zcompania` | **el correo** | `""` |
| Teléfono | sólo `customer.phone` | `GetPreferredPhone` — prefiere `telefonoClienteMavi` |

> [!important] Esto cambia el plan del bloque B
> El §B decía *"bloqueado por el payload de Magento"*. **Cierto sólo para BP-1.** El body del pedido **sí trae** CP, colonia, municipio, número exterior e interior. BP-2 ya los usa.
>
> Así que el trabajo no es esperar a Magento: es **portar de BP-2 a BP-1** lo que ya está resuelto, y ver qué campos le faltan de verdad al body de `setCustomer`.

### K.2 Donde los dos difieren SIN razón aparente

Mismo campo, valor distinto, sin que el body lo justifique:

| Campo | BP-1 | BP-2 | Piso |
|---|---|---|---|
| `Marst` | `1` | **`2`** | `""` |
| `Langu` | `""` | **`S`** | `""` (SAP llena `LanguCorr ES`) |
| `PersAddr` | `false` | **`true`** | `false` |
| `Gender` sin dato | `""` | **`1`** | `9` |
| `Birthdt` | `nacimiento` | **no se manda** | fecha real |

☐ **Hay que unificarlos.** Dos BP del mismo cliente creados por caminos distintos quedan con estado civil, idioma y tipo de dirección diferentes.

`Birthdt` es el más serio: **BP-2 no manda fecha de nacimiento**, y el flujo de crédito la necesita.

### K.3 🔴 Errores propios de BP-2

| | Dónde | Problema |
|---|---|---|
| **`toCte.Zcurp = info.rfc`** | `OrderMethods.cs` ~`:2865` | **El RFC metido en el campo CURP.** Son documentos distintos: RFC 13 caracteres, CURP 18 |
| **`Altkn = idMagento` o `cuenta`** | ~`:2810` | Mete el id de Magento —o la **cuenta `C` legada**— en el "número de cuenta anterior". Con la regla de que la cuenta `C` desaparece, esto queda sin sentido |
| `toCteCtoDireccion` | ~`:2985` | `Zdire = "Domicilio Conocido"`, `Zcolonia = "Centro"`, `ZcodPostal = "47504"` — placeholders, distintos de los `TEST` de BP-1 |

### K.4 Lo que los dos comparten — arreglar en ambos

`Ktokd 0110` · `Akont 12120000` · `Kalks 1` · `Kdgrp 01` · `Antlf 9` · `Eikto 32556690` · `Parnr 000000100` · `Parvw WE` · `Sort1/2 ABC` · `Bzirk ""` · `Tatyp ""` · `Taxkd ""` · `Banks/Bankl/Bankn ""` · `toCte.ZmapLat/Long "0.00"` · el contacto **CONYUGE** · `VtwegKnvv/Knvp "01"` fijo.

---

## M · 🔬 Dinámico vs quemado — de dónde sale cada valor

> Clasificación derivada del código, no a ojo: se leyeron los dos bloques `new Client { … }` y se separó cada asignación entre **literal** (valor escrito en el código) y **expresión** (dato del request).

### M.0 El conteo

| | BP-1 · directo | BP-2 · orden |
|---|---:|---:|
| **Quemados** con valor real | **39** | **41** |
| **Dinámicos** (del request) | **25** | **33** |
| Vacíos / `0` / `false` | 211 | 204 |

BP-2 toma 8 datos más del request — es el que mejor aprovecha su body. Pero también tiene **2 literales más**, y entre ellos están los peores.

---

### M.1 🔴 Quemado y NO debería estarlo — hay que hacerlo dinámico

| Campo | Valor quemado | En | De dónde debe salir |
|---|---|---|---|
| **`Znombre`** | **`"Maria"`** | BP-2 `:2961` | — **ver M.2** |
| **`Zapellidop`** | **`"Perez"`** | BP-2 `:2962` | — |
| **`Zapellidom`** | **`"Gomez"`** | BP-2 `:2963` | — |
| **`Zsexo`** | `"2"` | BP-2 `:2964` | — |
| `Stcd1` | `XAXX010101000` | BP-1 `:519` | `info.rfc` — **BP-2 ya lo hace** |
| `Altkn` | `1234567890` | BP-1 `:534` | nada: **debe ir vacío** (§5b.4) |
| `Marst` | `1` / `2` | los dos | el estado civil real |
| `Region` | `JAL` | los dos | el estado del domicilio |
| `Zdire` · `Zcolonia` · `ZcodPostal` · `Zpobl` · `Zestado` | `TEST` / `Domicilio Conocido` / `47504` / `001` / `14` | los dos | el domicilio del contacto, si el contacto existe |
| `Zparentesco` | `CONYUGE` | los dos | el parentesco real |

---

### M.2 🔴🔴 Lo más grave del análisis: una persona inventada

```csharp
// OrderMethods.cs:2955-2964 — BuildBpClientFromOrder
toCteCto = new CteCto
{
    ZidcteCto     = "1",
    ZidcteCtoTipo = "20",
    Zparentesco   = "CONYUGE",
    Znombre       = "Maria",     // ← quemado
    Zapellidop    = "Perez",     // ← quemado
    Zapellidom    = "Gomez",     // ← quemado
    Zsexo         = "2",         // ← quemado
```

**Cada BP creado desde una orden queda con una cónyuge llamada "María Pérez Gómez".** La misma persona ficticia, en todos.

Es peor que BP-1, que al menos usa el nombre del titular —también incorrecto, pero al menos es un dato real del cliente—. Aquí es un nombre inventado, idéntico para todos los clientes, marcado como su cónyuge.

> [!danger] Por qué esto no puede esperar a una fase posterior
> - Son **datos personales falsos** en el maestro de clientes.
> - Están en la tabla de **contactos y referencias**, que el flujo de crédito usa para avales y referencias.
> - El BP de piso `1500004598` tiene `to_CteContacto` con **una fila enteramente vacía**. Ése es el estado correcto.
>
> Cualquier proceso que lea contactos —cobranza, verificación de referencias, buró— va a encontrar a María Pérez Gómez.

---

### M.3 ✅ Quemado y CORRECTO — así se queda

Son constantes de configuración de SAP, confirmadas contra el BP de piso:

| Campo | Valor | Por qué es fijo |
|---|---|---|
| `BuGroup` | `CLIE` | grupo de BP para clientes |
| `Natpers` | `X` | persona física |
| `Stkzn` | `X` | idem, lado fiscal |
| `Country` | `MX` | MAVI sólo opera en México |
| `Bukrs` | `5510` | Mavi de Occidente, S.A. |
| `SpartKnvv` / `SpartKnvp` | `00` | sector común **para el BP** (el pedido usa `01`) |
| `Awahr` | `100` | probabilidad de pedido |
| `Lprio` | `02` | prioridad de entrega normal |
| `Vsbed` | `01` | condiciones de expedición estándar |
| `Waers` | `MXN` | |
| `Ktgrd` | `01` | grupo de imputación |
| `Perrl` | `AM` | liquidación mensual |
| `Sort1` / `Sort2` | `ABC` | coincide con piso |

---

### M.4 ⚠️ Quemado, valor DUDOSO — no es que deba ser dinámico, es que el literal está mal

Siguen siendo fijos, pero con **otro** valor. Son los del bloque A:

| Campo | Manda | Debería | Evidencia |
|---|---|---|---|
| `Ktokd` | `0110` | `CLIE` | piso y **nuestro propio BP** devuelven `CLIE` |
| `Akont` | `12120000` | `12100000` | el checklist |
| `Antlf` | `9` | `0` | piso |
| `Eikto` | `32556690` | `""` | piso |
| `Kdgrp` | `01` | `""` | piso |
| `Kalks` | `1` | `1` en unas áreas, `""` en otras | piso — **confirmar** |
| `Parnr` | `000000100` | ⚠️ sin evidencia | no aparece en el response |
| `Parvw` | `WE` | SAP genera `SP`/`BP`/`PY`/`SH` | §I.4 |
| `ZidcteCtoTipo` | `20` | ⚠️ sin evidencia | |

---

### M.5 ⚠️ Semi-dinámico — expresión con literal de respaldo

Ni una cosa ni la otra: toman el dato si viene y si no caen a un fijo.

| Campo | En | Expresión | Comentario |
|---|---|---|---|
| `Stcd1` | BP-2 | `rfc` o `XAXX010101000` | ✅ patrón correcto — el genérico es el RFC público real |
| `Natio` | BP-2 | `pais` o `MX` | ✅ |
| `Gender` | BP-2 | `sexo` o **`"1"`** | ⚠️ **inventa "hombre" si no viene**. BP-1 deja `""` |
| `Altkn` | BP-2 | `idMagento` o `cuenta` o `1234567890` | 🔴 los tres valores son incorrectos para ese campo |
| `nombre` | BP-2 | `nombreClienteMavi` o `info.nombre` | ✅ |
| `phone` | BP-2 | `telefonoClienteMavi` o `telefono` | ✅ |

> `Gender` merece una decisión: **asumir un sexo cuando el dato no viene** produce un maestro con datos inventados, igual que María Pérez. BP-1 deja `""` y eso es más honesto.

---

### M.6 ✅ Dinámico y correcto

**BP-1 (25):** nombre, apellidos, `Gender`, `Birthdt`, `Street`, `SmtpAddr`, `TelnrLong`, `VkorgKnvv/Knvp` derivados del `storeCode`, `ZidMagento`.

**BP-2 (33):** todo lo anterior salvo `Birthdt`, **más** el bloque de domicilio completo (`HouseNum1`, `StrSuppl1/2/3`, `City1`, `PostCode1`, `NameCo`), `Rfc`, `Fiscalregimen`, `Usocfdi`, `Aland`, `Zusuariopos`.

🔴 **Dos dinámicos que van al campo equivocado:**
- `toCte.Zcurp = info.rfc` — el RFC en el campo de la CURP (BP-2)
- `toCte.Zcompania = correo` — el correo en el campo de la compañía (BP-1)

**El dato es dinámico y correcto; el destino está mal.** Es distinto de un literal equivocado y se arregla distinto.

---

### M.7 Resumen de la clasificación

| Categoría | Cuántos | Qué hacer |
|---|---:|---|
| ✅ Quemado y correcto | ~13 | nada |
| ⚠️ Quemado con valor equivocado | 9 | cambiar el literal — **bloque A** |
| 🔴 Quemado y debería ser dinámico | 10 | conectar al dato — incluye **los 4 de María Pérez** |
| ⚠️ Semi-dinámico con respaldo dudoso | 2 | decidir el fallback (`Gender`, `Altkn`) |
| 🔴 Dinámico al campo equivocado | 2 | mover el destino |
| ✅ Dinámico y correcto | ~50 | nada |

---

## N · 🔬 `businesspartner-dev` — la referencia que faltaba

> **Éste sí es el proyecto que estructura BPs.** 133 rutas, seis de ellas escriben por `ZAPI_BP01_PARTNER_SRV/BPartnerSet`:
> `AS_POST_BusinessPartner` · `AS_POST_ClienteContado` · `AS_POST_ClienteAsociado` · `AI_POST_UpdateBPartner` · `AS_POST_AgregaContacto` · `AS_PATCH_DireccionBP`
>
> El modelo de referencia es `apps\api\models\Partner.py` (304 líneas).

### N.1 ✅ Confirma nuestro flujo técnico completo

| | Ellos | Nosotros |
|---|---|---|
| Servicio | `ZAPI_BP01_PARTNER_SRV/BPartnerSet` | igual |
| Autenticación | `get_autorizacion_basic()` — **Basic** | `CreateClientS4()` — Basic ✅ |
| CSRF | `GET` con `X-CSRF-Token: Fetch` sobre sesión, luego `POST` con el token | idéntico ✅ |
| Estructura | plana + 5 nodos hijos **únicos** | idéntica ✅ |
| Nombres de campo | los mismos | ✅ |

**No es la vía RSG/Bearer** que usa `salesanddistribution-dev`. Usan Basic, como nosotros. Queda cerrado que nuestro camino técnico es el correcto.

### N.2 🔴 Retiro cuatro recomendaciones del bloque A

Su modelo manda **exactamente los mismos valores** que yo había marcado como defectos nuestros:

| Campo | Nosotros | `businesspartner-dev` | Yo había dicho |
|---|---|---|---|
| `Ktokd` | `0110` | **`0110`** | ❌ "cambiar a `CLIE`" |
| `Akont` | `12120000` | **`12120000`** | ❌ "cambiar a `12100000`" |
| `Antlf` | `9` | **`9`** | ❌ "poner `0`" |
| `Eikto` | `32556690` | **`32556690`** | ❌ "vaciar" |
| `Kdgrp` | `01` | **`01`** | ❌ "vaciar" |

**Los cinco están mal en mi checklist.** Los saqué de comparar contra el *response* del BP de piso `1500004598`, y ahí es donde estaba mi error de método:

> [!warning] Lo que el BP devuelve ≠ lo que se le mandó
> `1500004598` lo creó el usuario **`CPI_SD`** — otra vía de alta. Que su response traiga `Antlf: "0"` y `Eikto: ""` **no prueba que el alta los mandara así**: pudo mandarlos y SAP normalizarlos, o pudo venir de un camino distinto.
>
> Comparar contra un response es válido para saber **cómo queda** un BP. No para saber **qué hay que enviar**. Para eso hace falta un *payload de entrada*, que es justo lo que este proyecto sí nos da.

☐ **Los cinco quedan en suspenso** hasta contrastar contra un payload real de alta, no contra un BP ya creado.

### N.3 ✅ Confirma lo que sí estaba bien

| | |
|---|---|
| **`Altkn`** | su default es **`""`** — confirma que va vacío, y que el `1234567890` nuestro sobra |
| **`Zcompania`** | `""` — confirma §3.3 |
| **`ZmapLat` / `ZmapLong`** | `""`, no `"0.00"` — confirma el bloque A |
| `Sort1` / `Sort2` | `ABC` — igual |
| `Bukrs` | `5510` — igual |
| `Kalks` | `1` — igual |
| `PersAddr` | `True` — coincide con **BP-2**, no con BP-1 |

### N.4 🎯 Los atributos: tenemos los nombres

```python
# Partner.py:296-298
Katr1: str = ""   # Envia a buro
Katr2: str = ""   # Envia Cobranza Telefonica
Katr5: str = ""   # Autorizacion Especial
```

**`KATR1`, `KATR2`, `KATR5`** — y las etiquetas coinciden exactamente con las del checklist de Excel (atributo 1 = buró, 2 = cobranza telefónica, 5 = autorización especial).

Esto resuelve la mitad del bloque D: ya sabemos **cómo se llaman las propiedades** que hay que agregar al modelo `Client`.

⚠️ **Sólo declaran 3 de los 6.** No hay `Katr3` (moratorio), `Katr4` (Crédito Express) ni `Katr6`. Y las tres van **vacías por defecto**, así que tampoco nos dan el valor — sólo el nombre.

### N.5 Diferencias que hay que preguntar

| Campo | Nosotros | Ellos | |
|---|---|---|---|
| `Parnr` | `000000100` | **`000001000`** | los ceros están en otro lugar — uno de los dos está mal |
| `Bzirk` | `""` | **`000001`** | ellos sí mandan zona de ventas |
| `Zcrmimporte` · `ZlimCred` · `Zlcaxsi` | `"0.00"` | **`"0"`** | formato distinto para el mismo decimal |
| `toCte.ZnumPag` | `0` | **`1234546789`** | ⚠️ eso parece basura de pruebas **en su código** |

### N.6 🔴 El patrón de payload — confirmado dos veces

`AS_POST_BusinessPartner` usa `exclude_none=True`. Pero el **PATCH** va más lejos:

```python
def limpiar_payload(data):
    return {k: limpiar_payload(v) for k, v in data.items()
            if v not in [None, "", "00000000"]}
```

**Quitan explícitamente los `""`** —y hasta los `"00000000"`— antes de actualizar.

Es la segunda implementación independiente que hace lo mismo. Confirma el §J.2: **para actualizar hay que omitir, no vaciar.** Nuestro `SubmitClientInfoAsync` no tiene nada equivalente.

### N.7 Lo que sigue sin aparecer

Ni aquí: `ZappOrig` para ecommerce, el valor de `Kvgr4`, ni los valores de los atributos. Los defaults del modelo están vacíos.

**`Kvgr4` ni siquiera existe en su modelo `Partner`** — sólo `Kvgr1`, igual que nosotros.

---

## L · Plan de implementación

> Ordenado para que cada fase deje el sistema utilizable y verificable. **Nada de esto se ejecuta sin autorización.**

### Fase 0 · Unificar antes de corregir ⚠️ decisión previa

Corregir 2 constructores por separado duplica el trabajo y garantiza que vuelvan a divergir.

**Propuesta:** un solo constructor con una entrada normalizada.

```
              BuildBpClient(datos) → Client
                 ↑              ↑
        CustomerRequest    OrderRequest.infoCliente
```

Cada llamador arma el objeto intermedio con lo que tenga; los campos que su body no traiga van vacíos. **La estructura del BP se define en un solo lugar.**

☐ **Decisión tuya:** ¿unificamos, o se corrigen los dos por separado? Unificar es más trabajo ahora y mucho menos después. *(Ojo: crear ese tipo intermedio es crear una clase nueva — requiere tu visto bueno explícito.)*

---

### Fase 1a · 🔴 URGENTE — la persona inventada

Antes que todo lo demás: ** mete a "Maria Perez Gomez" como cónyuge en cada BP creado desde una orden.** Ver §M.2.

No es un valor de configuración mal puesto: son **datos personales falsos** en la tabla que el flujo de crédito usa para referencias y avales. El BP de piso tiene ese nodo con una fila vacía.

☐ Decidir el estado correcto (fila vacía, como piso) y aplicarlo en los dos constructores.

---

### Fase 1 · Los 19 sin dependencias — en los DOS constructores

Bloques **A** y **E**. No dependen de ningún dato externo ni de ninguna decisión.

| | Cambios | Riesgo |
|---|---|---|
| Valores fijos mal: `Ktokd`, `Antlf`, `Eikto`, `Kdgrp`, `NameOrg1` | 5 × 2 | bajo |
| Impuestos: `Aland`, `Tatyp`, `Taxkd` | 3 × 2 | bajo — hoy crea una fila vacía |
| Flags de `toCte` a `0` | 4 × 2 | bajo |
| `Zcompania` y `ZmapLat/Long` | 3 | bajo |
| Quitar placeholders y el contacto CONYUGE | 4 | **medio — ver abajo** |

⚠️ **El contacto CONYUGE hay que decidirlo, no borrarlo sin más.** El BP de piso trae `to_CteContacto` con **una fila vacía**, no ausente. Hay que replicar eso, no eliminar el nodo — y confirmarlo con una prueba antes de generalizar.

**Verificación:** crear un BP, consultarlo por BP05MA, comparar contra `1500004598`.

---

### Fase 2 · Portar de BP-2 a BP-1 lo que ya está resuelto

Bloque **K.1**. **Cero datos nuevos**: sólo usar en BP-1 lo que BP-2 ya extrae.

Queda pendiente confirmar qué trae de verdad el body de `setCustomer`, porque BP-1 lee de `CustomerRequest`, no de `infoCliente`. **Ése es el único bloqueo real del bloque B.**

☐ Conseguir un payload real de `customer/setCustomer`.

---

### Fase 3 · Unificar las divergencias

Bloque **K.2**. Decidir un valor por campo y aplicarlo a los dos:

- `Marst` — ¿`1`, `2`, o vacío como piso?
- `Langu` — piso lo tiene vacío y SAP llena `LanguCorr ES`. Probablemente **vaciar los dos**.
- `PersAddr` — `false` como piso.
- `Gender` sin dato — ¿`""` o `1`?
- **`Birthdt`** — agregarlo a BP-2.

---

### Fase 4 · Los errores de mapeo de BP-2

Bloque **K.3**: `Zcurp` con el RFC, y `Altkn` con el idMagento o la cuenta `C`.

Van aparte porque **no son valores fijos: son datos del cliente en el campo equivocado.** Si alguien ya está leyendo `Zcurp` esperando un RFC, corregirlo lo rompe.

☐ Verificar consumidores antes de tocar.

---

### Fase 5 · Bloqueado por terceros

| | Falta |
|---|---|
| `ZappOrig` del teléfono | **el valor que le corresponde a ecommerce** (piso usa `PUNTO_VENTA` / `CteXpressFrontSAP`) |
| `Kvgr4` (CFDI) | agregar la propiedad al modelo + saber el default |
| Atributos 1-6 | agregar 6 propiedades + saber quién decide su valor |
| `Bzirk` | qué zona le toca a ecommerce |
| Datos bancarios | de dónde salen, y si caben dos cuentas |
| BP genérico de invitado | el valor real |

---

### Fase 6 · La decisión de `""` vs omitir

Bloque **J.2**. Hoy es inocuo porque siempre creamos. **Antes de que alguien use `SubmitClientInfoAsync` para actualizar**, hay que decidir: o se documenta que sólo sirve para alta, o se adopta el patrón de `salesanddistribution-dev` (campos opcionales + omitir los nulos).

---

### Resumen del plan

| Fase | Qué | ¿Bloqueado? |
|---|---|---|
| **0** | Unificar los dos constructores | ☐ decisión tuya |
| **1a** | 🔴 Quitar la persona inventada | ✅ se puede ya |
| **1** | 19 correcciones sin dependencias × 2 | ✅ se puede ya |
| **2** | Portar de BP-2 a BP-1 | ⚠️ falta el payload de `setCustomer` |
| **3** | Unificar divergencias | ☐ 5 decisiones |
| **4** | Errores de mapeo de BP-2 | ⚠️ verificar consumidores |
| **5** | Campos y nodos faltantes | 🔴 terceros |
| **6** | `""` vs omitir | ☐ decisión |

**La Fase 1 es la única ejecutable hoy de punta a punta.** Y la Fase 0 conviene resolverla antes, porque cambia cómo se hace todo lo demás.

---

## Resumen para dimensionar

| Bloque | Cantidad | ¿Se puede hoy? |
|---|---:|---|
| **A** · arreglo directo | 15 | ✅ sí |
| **B** · bloqueado por Magento | 10 | ❌ falta el dato de entrada |
| **C** · teléfono | 5 | ⚠️ falta definir `ZappOrig` |
| **D** · nodos y campos faltantes | 5 | ⚠️ 2 requieren tocar el modelo |
| **E** · quitar | 4 | ✅ sí |
| **F** · no tocar | — | — |
| **G** · otro proceso | 7 | — |
| **I** · estructura | 4 | ⚠️ 2 son límites reales del modelo |
| **K** · divergencia entre los 2 constructores | 20+ | ⚠️ ver el plan del §L |
| **J** · contraste con salesanddistribution | 1 | ⚠️ decisión sobre `""` vs omitir |

**19 cambios se pueden hacer sin depender de nadie** (A + E). Ésos son los que valen para arrancar.
