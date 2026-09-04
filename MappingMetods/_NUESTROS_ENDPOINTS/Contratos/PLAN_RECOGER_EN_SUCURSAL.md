---
tags: [plan, migracion, store-pickup, ola-7]
partidas: [E-15]
actualizado: 2026-08-31
---

# Plan de implementación — Recoger en sucursal

Qué se construye para cada una de las seis ramas del flujo, con las equivalencias ya
decididas. El mapa del flujo está en [[FLUJO_RECOGER_EN_SUCURSAL]]; esto es el cómo.

## Decisiones de partida — 31-ago-2026

| Pieza del legado | Se resuelve con |
|---|---|
| `eCommerceDetPedidos` | **SD36**, `to_salesdoc_items` |
| `Venta` | **SD36** |
| `Cte` | **BP05** |
| `VentaEntrega` | **API de direcciones**, `partneraddress/salesdoc/{sdDoc}/role/{partnRole}` |
| `SpWDM0285_CteRecoge` | **no se recrea: su lógica se escribe en C#** |
| `TrWDM0285_CteRecoge` | `BpRecogePedidos` en SIGMAVI |

Con esto, **de las bases solo queda SIGMAVI**. Ninguna rama consulta Intelisis al terminar.

---

## Lo común a todas las ramas

### `StorePickupMethods` crece

Hoy tiene solo la lectura de E-15. Todo lo demás se le añade, en
`Methods\Order\StorePickupMethods.cs`:

| Método | Sustituye a | Qué hace |
|---|---|---|
| `ExisteRecogeAsync` | `ValidaDuplicidadIdEcommerce` | cuenta por `IdEcommerce` |
| `ExisteClaveAsync` | `GetCodigoDuplicado` | cuenta por `ClaveVenta` |
| `ActualizarClaveAsync` | `UpdatePickUpCode` | `UPDATE` de la clave |
| `GenerarClave` | `GenerarIdRecogerEnSucursal` | CRC + reintentos, **se porta tal cual** |

Son los que ya existen en el legado, portados. **No se añade ninguno nuevo.**

### La lógica del SP, en C#

**El `INSERT` va escrito donde hoy está la llamada al SP**, dentro de la validación de
duplicados que ya existe. No se envuelve en un método propio: la estructura del legado se
conserva tal cual, y lo único que cambia es que en vez de invocar `SpWDM0285_CteRecoge` se
ejecuta el SQL ahí mismo.

```csharp
int duplicado = await ExisteRecogeAsync(idEcommerce);

if (duplicado == 0)
{
    // aqui iba SpWDM0285_CteRecoge
    string sQuery = @"INSERT INTO BpRecogePedidos
                        (IdEcommerce, Nombre, Correo, Telefono, ClaveVenta)
                      VALUES (@IdEcommerce, @Nombre, @Correo, @Telefono, @ClaveVenta)";
    // ...parametros y ExecuteNonQueryAsync
}
else
{
    await ActualizarClaveAsync(idEcommerce, nuevoCodigo);
}
```

Queda igual que el legado: el `if/else` de duplicidad es el que decide, y la rama del
`else` ya llamaba a un `UPDATE` suelto, no al SP. Con esto las dos ramas quedan simétricas
—SQL directo las dos— en lugar de una por SP y otra por `UPDATE`.

### El SP, revisado — 31-ago-2026

Ya se tiene su definición. **No hace nada más que insertar**, así que el `INSERT` de arriba
lo reemplaza entero:

```sql
ALTER PROCEDURE [dbo].[SpWDM0285_CteRecoge] @IdEcommerce varchar(20),
@Nombre varchar(100), @Correo varchar(60), @Telefono bigint, @ClaveVenta varchar(10)
AS
BEGIN
  INSERT INTO TrWDM0285_CteRecoge (IdEcommerce, Nombre, Correo, Telefono, ClaveVenta)
    VALUES (@IdEcommerce, @Nombre, @Correo, @Telefono, @ClaveVenta)
END
```

Marco Antonio Valdovinos Barragán, 29/09/2017, desarrollo DM0285, para compras de invitado
con entrega en sucursal. Norberto Reyes le agregó `@ClaveVenta` el 27/05/2019.

Tres cosas que confirma:

- **Nunca actualiza.** La decisión insert-o-update está entera en el C#, en el
  `if (duplicado == 0)`. No había lógica escondida.
- **No normaliza el teléfono.** El `Regex.Replace(tel, @"[^0-9]", "")` del llamador es la
  única limpieza que existe, así que es obligatorio conservarlo.
- **Las columnas coinciden una a una con `BpRecogePedidos`**, incluidos los tipos.

> 🟡 **Los dos llamadores le pasan el teléfono con tipos distintos.** El parámetro es
> `bigint`, pero `crearPrimerCodigoRecogerSuc` lo manda como `SqlDbType.VarChar` y
> `setNameToReference` como `BigInt`. SQL Server convierte solo y por eso nunca ha fallado;
> con un teléfono con guiones o espacios, revienta. De ahí que el `Regex` no sea opcional.

> ⚠️ **`Telefono` es `BIGINT`.** Conservar el `Regex.Replace(tel, @"[^0-9]", "")` del legado
> antes de convertir, o el insert revienta con un teléfono con guiones.

### La clave se sigue calculando igual

`GenerarIdRecogerEnSucursal` es CRC sobre `IdEcommerce` + la fecha al segundo, con
reintentos. No toca ninguna base salvo para comprobar duplicados. Se porta literal,
**incluidas sus tres salidas raras**: a partir del intento 3 recorta dos caracteres y pega
aleatorios, pasado el 19 acepta la clave aunque esté duplicada, y tras 20 vueltas en vacío
devuelve la constante `F41LH4SH00`.

---

## Rama por rama

### 1 · Siembra al crear la orden — Dev 2

Hoy: `OrderMethods.cs:659` llama a `setNameToReference` cuando
`order.metodoEnvio == "instore_pickup"`, con la clave vacía.

Después: la misma rama, dentro de `setOrder` ya migrado, con el `INSERT` escrito ahí y
`ClaveVenta = ""`. Los datos del cliente ya los tiene el propio `setOrder` en memoria — no
hace falta consultar nada.

**Es la rama más barata de las cuatro** y la que desbloquea a E-15, porque es la que hace
que la tabla tenga filas.

### 2 · Primer código — Dev 2

Hoy: `order/createStorepickupCode/{idEcommerce}/{idOrder}` → `crearPrimerCodigoRecogerSuc`.

Después, cuatro llamadas en vez de un `JOIN`:

| Dato | De dónde |
|---|---|
| documento de ventas y **UEN** | **SD36** por `PurchNoC = idEcommerce` |
| nombre y correo | **BP05** con el BP del documento |
| teléfono | **API de direcciones**, `GetSalesDocumentAddressAsync(sdDoc, partnRole)` |
| artículos del correo | **SD36**, `to_salesdoc_items` — ya vienen en la misma respuesta |

Luego `GenerarClave`, la validación de duplicados con su `INSERT`/`UPDATE`, y el correo.
**Un solo viaje a SD36 sirve para el
documento, el UEN y los artículos**, porque el wrapper ya pide el `$expand`.

> 🟡 **Confirmar el rol del interlocutor** (`partnRole`) que corresponde a la entrega, y
> **qué campo de la respuesta trae el teléfono**. No se puede saber leyendo el wrapper: hay
> que llamarlo una vez y mirar.

### 3 · Transferencia bancaria — Dev 2

Hoy: `OrderMethods.cs:695`, con tres condiciones y un método propio copiado del anterior.

Después: **se unifica con la rama 2**. Es la misma operación; lo único distinto es quién la
dispara. Un método con el método de pago como parámetro, o directamente el mismo. Dos
copias que ya divergieron no deberían migrarse como dos.

### 4 · Regenerar — Dev 2

Hoy: `order/generateNewStorepickupCode/{idEcommerce}` → `NuevoCodigoRecogerSucursal`.

Después: `GenerarClave` + `ActualizarClaveAsync`. **No consulta SAP**: solo genera y
actualiza. Es la rama más simple del conjunto.

### 5 · Consultar — Dev 3, hecho

`order/GetPickUpCode`, partida **E-15**, commit `8cf2c52`. Sin cutover a propósito.

### 6 · Correo — Dev 2

Hoy: `GetDatosCteCorreo` + `RecogerEnSucursalCorreo`.

Después: **`SpCodigoRecogeSucursal`** — ver el análisis de abajo, que no cubre todo.

---

## Análisis de `SpCodigoRecogeSucursal`

`MaviSAP: StoreProcedure\SpCodigoRecogeSucursal.sql`, Miguel Marín, 16/05/2025.

### Qué hace

Recibe cuatro parámetros: `@ClienteJson`, `@VentaJson`, `@VentaCteJson` y `@IdEcomm`. Los
tres JSON los produce el C# a partir de las APIs de SAP; el SP los abre con `OPENJSON` en
tres tablas temporales y las cruza contra `EcommerceDetPedidos` y `BpRecogePedidos` de
SIGMAVI.

| Parámetro | Campos que lee | Origen |
|---|---|---|
| `@ClienteJson` | `BusinessPartner`, `Mail` | BP05 |
| `@VentaJson` | `Zctefinal`, `Zidecomm` | documento de ventas |
| `@VentaCteJson` | `DocType`, `Customer`, `PurchNoC` | documento de ventas |

Devuelve **una fila**: `Nombre`, `Mov`, `Estatus`, `Mail`, `idOrden`, `ClaveVenta`,
ordenando por `RefPedidoIntelisis DESC` y quedándose con la más reciente.

### Es el patrón a copiar

No consulta Intelisis: el dato de SAP entra como JSON y el cruce ocurre contra SIGMAVI. Es
la regla de reparto de los mixtos ya escrita en SQL, y conviene que las ramas 1 a 4 la
imiten en vez de inventar otra forma.

### 🔴 No cubre el correo entero: falta el UEN

`RecogerEnSucursalCorreo(int uen, ...)` usa el UEN para elegir **toda la identidad de la
marca**: `uen == 1` es Muebles América y `uen == 2` es VIU, cada una con su logo, sus URLs,
su asunto y su pie. El SP **no devuelve UEN**, y `GetDatosCteCorreo`, al que sustituye, sí
lo devolvía.

Sin resolverlo, el correo sale sin marca o con la equivocada. Dos salidas:

1. **Añadir `UEN` al SELECT del SP**, si viene en alguno de los tres JSON. Es un campo del
   documento de ventas, así que lo natural es que entre por `@VentaJson`.
2. **Sacarlo aparte en C#** desde SD36, que ya lo trae, y pasárselo al método del correo sin
   tocar el SP.

La 2 no requiere coordinar con quien mantiene el SP y encaja con que el C# ya va a llamar a
SD36 de todos modos.

### 🟡 Tres defectos del SP, para quien lo toque

**El bloque de limpieza inicial tiene un copiar-pegar.** Comprueba si existe `#VentaApi`
pero borra `#VentaApiCte`:

```sql
IF EXISTS (... OBJECT_ID('Tempdb.dbo.#VentaApi') ...)
  DROP TABLE #VentaApiCte;
```

Así que `#VentaApi` nunca se borra al entrar. Si la misma sesión llama al SP dos veces sin
cerrar, el `CREATE TABLE #VentaApi` falla. Al final del SP sí se borran las tres bien, así
que hoy no se nota — pero es frágil.

**Un mapeo de `OPENJSON` apunta mal.** En `@VentaJson`:

```sql
Mov VARCHAR(80) '$.Zidecomm'
```

`Mov` sale del mismo campo que `IdEcommerce`. No se usa —el `Mov` que devuelve el SELECT
viene de `#VentaApiCte`— así que no hace daño, pero es una línea que confunde al leerla.

**`Estatus` va fijo.** `Estatus = 'PEDIDO'` está escrito en el SELECT, no viene de ningún
dato. Si algún día hay que distinguir estados, no sale de ahí.

### 🟡 El cruce puede traer filas de más

`#VentaApi`, `#VentaApiCte` y `#ClienteBp` se unen **por `Cliente`**, sin restringir por
documento. Si un mismo BP tiene varios pedidos, la unión los multiplica; lo salva el
`WHERE v.IdEcommerce = @IdEcomm` y el `TOP 1`. Funciona, pero el `TOP 1` está tapando una
unión incompleta, no eligiendo entre alternativas legítimas.

---

## Orden de ejecución

| Paso | Qué | Quién | Bloquea |
|---|---|---|---|
| ~~1~~ | ~~Conseguir la definición de `SpWDM0285_CteRecoge`~~ | — | ✅ **resuelto el 31 ago**: es un `INSERT` pelado |
| 2 | Portar las cuatro auxiliares a `StorePickupMethods` | Dev 3 | las ramas 1-4 |
| 3 | Confirmar `partnRole` y el campo del teléfono en la API de direcciones | Dev 3 | la rama 2 |
| 4 | Resolver el UEN del correo — opción 1 o 2 | Dev 2 | la rama 6 |
| 5 | Rama 1, la siembra | Dev 2 | **E-15** |
| 6 | Ramas 2 y 3, unificadas | Dev 2 | — |
| 7 | Rama 4, regenerar | Dev 2 | — |
| 8 | Probar E-15 con datos reales | Dev 3 | el cutover |
| 9 | Cutover de E-15 y despliegue | Dev 3 | — |
| 10 | Rama 6, el correo | Dev 2 | — |

**Ya no hay bloqueo técnico para empezar.** Con el SP a la vista, los pasos 2 y 3 son de
Dev 3 y se pueden hacer desde ya. Lo que sigue condicionando el resultado es la secuencia:
E-15 no se puede probar hasta el paso 5, que es de Dev 2.

Se puede adelantar el paso 8 insertando una fila a mano en `BpRecogePedidos`, que es lo
único que permite validar E-15 antes de que Dev 2 llegue al paso 5.
