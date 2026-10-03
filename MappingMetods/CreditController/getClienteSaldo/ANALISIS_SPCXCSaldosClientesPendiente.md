# Análisis de `SPCXCSaldosClientesPendiente` para `credit/getClienteSaldo`

> **Fecha:** 2026-10-01 · **Tipo:** análisis de solo lectura, verificado de forma adversarial contra el código.
> **Alcance:** LAN, puente DMZ, SPs y funciones de `SPsOrden`, ServicioSAP. **Magento no se analiza.**
> **Decisiones del usuario aplicadas:** Magento manda cuentas numéricas de BP de SAP (nunca `C…`); los valores de entorno son de Dev; se busca paridad de valor con LAN (mismos campos, mismo significado, y la misma distinción entre `null`, `""` y `0`).
> Las correcciones sobre el borrador del mapeo están en el §7.

**Rutas abreviadas**

| Alias | Ruta |
|---|---|
| SP | `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\SPsOrden\SPCXCSaldosClientesPendiente.sql` (UTF-8 sin BOM, CRLF; **no** es UTF-16) |
| LIQ | `...\SPsOrden\FNCXCPagoLiquidaBBVA.sql` (ASCII, CRLF) |
| BON | `...\SPsOrden\FN_MAVIRM0906CalculaBonifCC.sql` (UTF-8, 325 líneas) |
| MOR | `...\SPsOrden\FN_MAVICALCULAMORATORIOS.sql` |
| PP1 | `...\SPsOrden\FnMavi1erVencimPendPagoPP.sql` |
| PDET | `...\SPsOrden\SPCXCSaldosClientesPDetalle.sql` |
| LAN | `\\172.16.214.58\sap\LAN\WebApiMagento\` |
| DMZ | `\\172.16.214.58\sap\DMZ\WebApiMagento\` |
| SSAP | `\\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap\` |
| RSG | `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\RSG\` |
| GUIA | `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\GUIA_MIGRACION_FABLE.md` |

**Fuentes que no están en el vault:** `FN_MAVIRM0906CobxPol` (SP:310) y las vistas `v_phmoratorio` y `V_FactorIMMAVI` (MOR:26, 38, 74). La primera no llega a la respuesta. Las vistas solo hacen falta si se rechaza `Zmoratorio` (ver N5).

---

## 1. Resumen y veredicto

**Veredicto: hoy no se puede, y después de construir la ruta solo se puede en parte.**

### Hoy

ServicioSAP no puede atender este endpoint, porque no tiene ninguna acción `getClienteSaldo`. No está en `SSAP Controllers\AbonosController.cs:7-113` ni en `SSAP Controllers\CreditController.cs`, que también usa el prefijo `credit`. Hoy falla cualquier llamada real de Magento:

- **Con el `Web.config` versionado del DMZ**, `URL_INTELISIS` vale `https://localhost:44399/` (DMZ `Web.config:17`), que es la URL de IIS Express de ServicioSAP (SSAP `ServicioSap.csproj:21,504`). `curl.Get` (DMZ `Helper\Curl.cs:245-265`) recibe un 404 si ServicioSAP corre en ese puerto (porque la ruta no existe) o un error de conexión si nada escucha ahí. En los dos casos devuelve el texto de la excepción, y el DMZ responde **500** (DMZ `Controllers\CreditController.cs:30-38`).
- **Si el DMZ desplegado usa la URL de LAN** que está comentada (`Web.config:16`), el regex de LAN rechaza el BP numérico. LAN responde 200 "El cliente es incorrecto" y el DMZ lo convierte en **400 "No existe el cliente"** (LAN `Controllers\CreditController.cs:22,104,120`; DMZ `CreditController.cs:27-28`).
- `marcos_result.json` dice "Still goes to LAN", pero eso solo es cierto en el segundo caso.
- **Token:** el constructor de `Curl` usa el token emitido por ServicioSAP también para las llamadas `Get` a `URL_INTELISIS` (`Token = TokenSAP`, `Curl.cs`, constructor). Comparé por hash, sin exponer los valores, los `Web.config` versionados de LAN y ServicioSAP: tienen la misma `JWT_SECRET_KEY`, el mismo issuer y la misma audience. Eso cuadra con GUIA §8.1 y §8.5.1, pero la prueba E2E de 5 minutos que pide §8.5.1 sigue pendiente.

### Con las APIs SAP que ya existen, una vez construida la ruta

| Grupo | Campos | Condición o motivo |
|---|---|---|
| **DISPONIBLE** (mismo significado) | `clienteIntelisis` (eco del BP), `facturas[].facturaId` (`Vbeln`), `facturas[].fechaCompra` (`Fkdat` en formato MM/dd/yy), `facturas[].nombreCliente` (BP05MA; hay captura real, pero no hay ficha) | Todos cuelgan de la lista de facturas, y esa lista sale de NTZ01 `zsplits` filtrado por `Partner`. El filtro está documentado (RSG `tz01_zsplits_mercaderias.md:54`), pero **nunca se ha ejecutado ni capturado**. Es el primer bloqueo (N1). |
| **PARCIAL** (provisional; requiere comparación E2E contra LAN según GUIA §2.2) | lista `facturas[]`, `importeVenta` y `totalFactura` (`Ztotal`: no se sabe si incluye IVA y enganche), `atraso` y `moratorios` (`Zmoratorio` aparece en una respuesta real, pero en el único caso observado su valor no cuadra con la regla del SP), `articulos` (el camino candidato `Vgbel` → SD36 tiene tres eslabones sin verificar) | Ver la tabla del §4. |
| **DECISION** | `saldoCapital` (para 9000006302, EX01 da 3,036.00 y NTZ01 da 172.00), y por arrastre `adeudoTotal`; validación del BP; política ante errores de SAP; documentos de Seguro Vida | N4, N7, N10, N11. |
| **NO_EXISTE** (sin fuente SAP hoy) | `liquidaConSolo` (ningún campo SAP trae el importe para liquidar; las reglas de campaña solo están expuestas en parte y el parser de SD33 las descarta) y `estatus` (no hay campo, y no se conoce la regla para derivarlo) | N6, N8. |
| Fuera de alcance mientras no se decida | documentos Seguro Vida (están en un servicio que ServicioSAP no llama), notas de cargo dentro de los saldos (NTZ01 mercaderías no las tiene), rama DIMAS `CobroCteFinal` 1/2/4 | N7, N4, N13. |

**La paridad número por número no se puede demostrar fuera de línea.** LAN identifica al cliente con códigos `C########` de Intelisis y SAP con BPs. Hay que comparar E2E sobre un cliente que exista en los dos sistemas.

---

## 2. Qué hace el SP, paso a paso

1. **Entrada.** Recibe `@Cliente varchar(10)` (SP:25). `@CteFinal` se declara `NULL` y nunca cambia (SP:75), así que el filtro por cliente final (SP:235-237) nunca se ejecuta.
2. **Universo `#MovCxcTemp`** (SP:87-116). Toma todos los `Cxc` del cliente, de cualquier empresa, en estatus `PENDIENTE` o `CONCLUIDO`, cuyo `Mov` sea de las clases `CXC.F`, `CXC.CAP`, `CXC.CA`, `CXC.C`, `CXC.AE`, `CXC.D` o `CXC.CD`. No filtra por fecha, empresa, UEN, canal ni sucursal.
3. **Hijos `#DoctosHijos`** (SP:197-233). Son los renglones del universo cuyo `PadreMAVI` es un movimiento de clase `CXC.F/CAP/CA/CD` y que están `PENDIENTE`, o `CONCLUIDO` con `CobroCteFinal` 1, 2 o 4. Para cada uno calcula `DiasVencidos` (SP:207-211).
4. **Si hay hijos** (SP:239-478):
   1. **Limpieza de CANC COBRO.** Borra de `#MovCxcTemp` los cobros que fueron cancelados con una nota de cargo `CANC COBRO` (SP:243-262). El `CAST(... AS int)` de SP:250 falla si el valor no es numérico. Como `#DoctosHijos` ya está lleno en este punto, la limpieza solo afecta a los pasos que leen `#MovCxcTemp` después (último pago y enganche). No puede quitar un padre, porque los IDs que borra son de cobros.
   2. **Moratorios** por cada hijo pendiente y vencido (SP:264-268).
   3. **Padres `#DoctosPadres`** (SP:271-295). Un renglón por cada par (`PadreMAVI`, `PadreIDMAVI`) de los hijos, siempre que el renglón del padre también esté en el universo del cliente. `ImporteVta = Importe + Impuestos`, sin `ISNULL` (SP:280).
   4. **Enriquecimientos que no llegan a la salida:** DV/DI de `CxcMavi` y `CobroXPolitica` (SP:297-313); último pago (SP:316-385); categoría, periodo, número de documentos, días inactivos y nombre/RFC del cliente final (SP:387-415); monedero (SP:417-425); enganche (SP:427-452); forma de pago e `IdVta` (SP:454-460); descripción del primer artículo (SP:462-476).
5. **Tablas muertas.** `#PadreMAVIPagoLiquidaTemp` y `#LiquidaCon` se crean y se llenan, pero nadie las usa (SP:480-506).
6. **Agregados de cabecera** (SP:508-528): `@ImporteDeVenta`, `@LiquidaCon` (una llamada a `FNCXCPagoLiquidaBBVA` por padre), `@Atraso`, `@moratorio` y `@SaldoCapital`.
7. **`#Preliminar`** (SP:538-579). Un renglón por padre, con join a `Cte` (nombre) y a `Cxc` por `Mov`/`MovID` (estatus). Los agregados de cabecera se repiten en cada renglón.
8. **`#ArticulosDetalle`** (SP:589-602). Suma `VentaD.Cantidad` por (`MovID`, `Mov`) de `Venta`.
9. **SELECT final** (SP:605-626). Devuelve 18 columnas, sin `ORDER BY`. LAN solo lee 13: las 7 de cabecera, tomadas del primer renglón, y 6 por factura (LAN `Metodos\FacturaMethods.cs:56-91`).
10. **Capas que lo llaman.** LAN valida el regex, ejecuta el SP y responde con el objeto o con una cadena centinela (LAN `CreditController.cs:97-122`). El DMZ expone un GET, llama a `curl.Get` y traduce las cadenas centinela (DMZ `CreditController.cs:18-41`).

---

## 3. Reglas de negocio

1. **Entrada y alcance.** La única entrada es el código de cliente (SP:25). El SP lee **toda** la historia del cliente en todas las empresas, sin filtros de fecha, empresa, UEN, canal ni sucursal (SP:110-116).
2. **Universo de cuentas por cobrar.** Movimientos `Cxc` del cliente en `PENDIENTE` o `CONCLUIDO` de siete clases: `CXC.F`, `CAP`, `CA`, `C`, `AE`, `D` y `CD` (SP:111-116). El significado de cada clase es inferido, porque el vault no tiene el catálogo `MovTipo`.
3. **Qué renglones forman el saldo (los "hijos").** Un renglón se queda si su **padre** es de clase `CXC.F/CAP/CA/CD` y el renglón está `PENDIENTE`, o `CONCLUIDO` con `CobroCteFinal` 1, 2 o 4 (SP:226-233). Esa segunda rama es probablemente la cobranza DIMAS a cliente final, y DIMAS MX está deprecado.
   - **Entran:** los documentos (`Documento`); las notas de cargo que tienen ese padre (LIQ:314 suma `Mov IN ('Documento','Nota Cargo')` por `PadreMAVI`, y BON:53,189-192 distingue notas de cargo entre los renglones del padre); y el renglón de la propia factura cuando está pendiente.
   - **La factura se apunta a sí misma.** SP:284-285 copia el `PadreMAVI` del propio padre y SP:566-568 lo usa para encontrarlo; BON:217-226 lee el renglón de la factura dentro del conjunto filtrado por `PadreMAVI`; y BON:132,282 lo excluyen explícitamente con `movid != padreidmavi`.
   - **No está demostrado** que las notas `MORATORIOS MENUDEO` sean hijos. SP:347-373 las liga a la factura por `MovCampoExtra` (`NC_FACTURA`/`NCV_FACTURA`), lo que sugiere que pueden no traer `PadreMAVI`.
4. **Días vencidos.** Para cada hijo pendiente, son los días de calendario entre su vencimiento y hoy, según el reloj del servidor. Un documento que vence hoy cuenta 0; uno sin vencimiento nunca está vencido; un renglón concluido siempre cuenta 0 (SP:207-211).
5. **Moratorio por hijo.** Solo lo reciben los hijos `PENDIENTE` con `DiasVencidos > 0`, y vale `ROUND(Fn_MaviCalculaMoratorios(ID), 2)` (SP:264-268). Dentro de la función (MOR:24-95):
   - exige `v_phmoratorio.H_Saldo > 0`;
   - además exige que se cumplan tres cosas: la bandera `CalculoMoratorioMavi = 1` (columna sin calificar, así que no se sabe de qué tabla viene); que (`Mov`, `Concepto`) no esté en `CalculoMoratoriosExMAVI`; y que haya `GeneraCargoxMoratorio = 1`, o bien canal `INSTITUCIONES` con la misma categoría en `CteEnviarA` y sección `CREDITO MENUDEO` (MOR:52-60);
   - el valor es `FactorIM` × `EmpresaCfg.CxcMoratoriosTasa` × `H_Saldo` + `H_InteresesMoratorioMavi` (MOR:67-76);
   - vale 0 si el resultado es menor o igual a `MontoMinMoratorioMAVI` (MOR:79-80);
   - se redondea hacia arriba (`CEILING`) **solo** cuando `Cxc.ClienteEnviarA = 77` (MOR:88-93). Por eso, en general, el moratorio **no** es un número entero de pesos.
6. **Lista de facturas.** Hay un renglón por cada padre que tenga al menos un hijo retenido, siempre que el renglón del padre esté en el universo del cliente (SP:271-295) y que el cliente exista en `Cte` (SP:564-565). Los padres Seguro Vida también aparecen. Nada fija el orden (SP:605-626).
   - Los joins a `Cxc C` (SP:566-568) y a `Venta` (SP:593-601) no filtran por empresa ni por cliente. Si el mismo `Mov`/`MovID` existe en otra empresa o en otro cliente, `#Preliminar` solo gana un renglón cuando ese otro registro tiene un estatus distinto: el `GROUP BY` (SP:572-579) junta los que tienen el mismo estatus, y entonces duplica las sumas por factura, que LAN no lee.
   - En el caso de artículos se **suman** las cantidades del otro registro; no se duplican renglones.
7. **Importe de la factura** = `Importe + Impuestos` del padre (SP:280). En la lista, una factura Seguro Vida muestra 0 (SP:546-549).
8. **`importeVenta`** = suma de los importes de las facturas, excluyendo Seguro Vida (SP:508-511).
9. **`saldoCapital`** = suma de los saldos de todos los hijos retenidos, excluyendo Seguro Vida. Incluye las notas de cargo con padre y los renglones concluidos de la rama DIMAS (SP:525-528).
10. **`atraso`** = saldo vencido de **todos** los hijos (Seguro Vida incluido) + moratorios totales (SP:517-521, 558). `AdeudoVencido` tiene el mismo valor, pero Magento nunca lo recibe (SP:560).
11. **`moratorios`** = suma del moratorio de todos los hijos, Seguro Vida incluido (SP:522, 559).
12. **`adeudoTotal`** = `saldoCapital` + `moratorios` (SP:561). Los alcances se mezclan a propósito: Seguro Vida queda fuera del capital, pero su moratorio sí cuenta.
13. **`liquidaConSolo`** = suma del importe para liquidar de cada factura (Seguro Vida incluido) + moratorios totales (SP:513-515, 562). El importe de cada factura lo calcula `FNCXCPagoLiquidaBBVA` en cuatro pasos:
    1. **Base** (LIQ:166-186). Toma cada renglón `PENDIENTE` de `Cxc` con ese padre: de cualquier `Mov`, incluidos el renglón de la factura y las notas de cargo; no se limita a `#DoctosHijos` y no filtra por cliente. A cada uno le aplica pago puntual (BON:75-103):
       - si `dvn <= 0` (no vencido, **incluido el que vence hoy**): Saldo − `BonifPP`;
       - si `0 < dvn <= MaxDV` (el `MaxDV` de `MaviBonificacionConVencimiento` ligada por el `IDBonifPP` del propio documento): Saldo − `BonifPPExt`;
       - en otro caso, o si no tiene vencimiento: Saldo.

       Si el resultado da 0, se usa el Saldo (LIQ:171-175). Si no hay renglones pendientes, la base vale 0.
    2. **Contado comercial** (LIQ:190-223; BON:141-317). Solo se evalúa si hay una campaña "Contado comercial" vigente que coincida con `Mov`, condición, UEN, canal y fecha (LIQ:98-162). La fecha es la de la solicitud de crédito, obtenida por la cadena `Venta` factura → pedido → análisis → solicitud, o la de la factura si esa cadena no existe (LIQ:55-95).
       - Esa coincidencia solo abre la puerta. **Las reglas se leen de la campaña guardada en los documentos** (`Cxc.IDBonifCC`, BON:253, 286-287).
       - **No aplica** si se da cualquiera de estos casos (BON:231-246):
         - el atraso histórico máximo de la factura (`CxcMavi.MaxDiasVencidosMAVI`, BON:212) supera `DiasAtrazo`;
         - la posición del último `Documento` cuyo vencimiento ya pasó (pagado o no) llega a `VencimientoAntes` (BON:256-258, 272-279);
         - la antigüedad de la factura supera `DiasMenoresA`;
         - los días entre la factura y el primer vencimiento no superan `DiasMayoresA`.
       - **Si aplica:** saldo pendiente de todos los renglones de la factura − (MAX(`BonifCC`) × `DANumeroDocumentos` − notas de crédito ya aplicadas a renglones concluidos) (BON:255, 299-315).
       - El valor se toma del renglón `R = 2` del join (LIQ:198-218). Por eso hacen falta al menos dos renglones en ese join, contando renglones pendientes × campañas CC que coinciden; el renglón de la propia factura cuenta.
       - Solo reemplaza a la base si es mayor que 0 (LIQ:222).
    3. **Adelanto** (LIQ:227-323). Se calcula si hay una campaña "Adelanto" que coincida y al menos un `Documento` pendiente que venza hoy o después. Entonces el importe es el saldo pendiente de `Documento` + `Nota Cargo` − MR × n × (`Linea`/100) × n, donde:
       - MR = (`Importe` + `Impuestos` de la factura − `AuxiliarP.Abono`) / `DANumeroDocumentos`;
       - n = documentos pendientes que aún no vencen (sin contar los que vencen hoy) + documentos concluidos cuyo vencimiento es futuro.

       Cuando se calcula, **reemplaza** a los pasos 1 y 2. Si `DANumeroDocumentos` vale 0 o NULL, se produce una división entre cero (LIQ:283).
    4. **Redondeo** hacia arriba, al centavo siguiente (LIQ:325-330). La función nunca devuelve NULL.

    La restricción por sucursal de la campaña nunca se aplica, porque el join a `Sucursal` es LEFT y no tiene filtro (LIQ:146-148).
14. **"Hoy" en las funciones de bonificación** se escribe `CONVERT(datetime, CONVERT(varchar(10), GETDATE(), 10))` (BON:96, 125, 183; LIQ:244, 257, 261). Es hoy a las 00:00, pero el texto intermedio `mm-dd-yy` se vuelve a interpretar según el `DATEFORMAT` de la sesión. En C# hay que usar la fecha de hoy en hora local de México.
15. **Nombre del cliente** = `Cte.Nombre`, igual en todos los renglones. Para los clientes de ecommerce es `LTRIM(UPPER(paterno) + ' ' + LTRIM(UPPER(materno) + ' ' + UPPER(nombres)))` (`SP_eCommerceCtenuevo.sql:115, 177`). El orden es "PATERNO MATERNO NOMBRES". No hay `RTRIM`, así que si `nombres` está vacío queda un espacio al final.
16. **Artículos** = cantidad total de todos los renglones de la `Venta` con el mismo `Mov` y `MovID`, incluidos servicios y el renglón de envío `SEGU00001`. No filtra cliente, empresa ni estatus, y queda vacío si no encuentra la venta (SP:589-602, 625-626). El tipo de `VentaD.Cantidad` no está en el vault.
17. **Fecha y estatus.** La fecha de compra es la fecha de emisión de la factura en formato `mm/dd/yy` (estilo 1, SP:545). El estatus es el `Cxc.Estatus` del renglón con ese `Mov`/`MovID` (SP:542, 566-568). Normalmente es el renglón del propio padre, que ya pasó el filtro de `PENDIENTE`/`CONCLUIDO` (SP:116, 293-295); pero como el join no filtra empresa ni cliente, otro registro con el mismo `Mov`/`MovID` podría aportar otro literal.
18. **Formato de salida en LAN.** Cada valor se construye con `.ToString()`, todo como cadena. Los montos `money` se esperan con 4 decimales (`9250.0000`), lo que falta confirmar con una captura (N2). NULL se convierte en `""`, nunca en JSON `null`. La cabecera se toma del primer renglón (`FacturaMethods.cs:56-91`; `Models\ClienteRequest.cs:21-44`). `importeVenta`, `saldoCapital` y `adeudoTotal` solo salen `""` cuando todos los documentos son Seguro Vida (o, en el caso de `importeVenta`, también cuando todos los `Impuestos` vienen NULL).
19. **Contrato de respuesta en LAN:**
    - código inválido: 200 "El cliente es incorrecto", que el DMZ convierte en 400 "No existe el cliente";
    - ningún renglón, cualquier error SQL o el tiempo de espera de 120 s (`FacturaMethods.cs:38`): 200 "No tiene facturas", porque la excepción se traga (`FacturaMethods.cs:41-51`). Ejemplos de error SQL son el `CAST` de SP:250 y la división entre cero de LIQ:283;
    - sin token: 401;
    - falla al abrir la conexión: 500, porque `conn.Open()` está fuera del `try` (`FacturaMethods.cs:39`);
    - en otro caso: 200 con el objeto `ClienteSaldo` (`CreditController.cs:97-121`).
20. **Lógica que no llega a la respuesta, y que por tanto SAP no necesita:**
    - `CobroXPolitica` y `FN_MAVIRM0906CobxPol`;
    - DV/DI de `CxcMavi`;
    - último pago, días inactivos y `BonifSIMavi`;
    - categoría, monedero, enganche, forma de pago y descripción del artículo;
    - nombre y RFC del cliente final;
    - la limpieza de CANC COBRO (salvo que su `CAST` falle);
    - `PagoPuntual` (`FnMavi1erVencimPendPagoPP`, que devuelve el **importe** del primer documento pendiente no vencido con descuento por pago puntual, redondeado a pesos, PP1:34-44), `idCanalVenta` y `Moratorios` por factura, que solo existen en `#Preliminar`;
    - `#PadreMAVIPagoLiquidaTemp` y `#LiquidaCon`.

    El SP devuelve además `ID`, `Mov`, `EnviarA`, `Abono` y `AdeudoVencido`, que LAN nunca lee (SP:605-623).

---

## 4. Tabla campo por campo

| Campo de respuesta | Cálculo LAN | Fuente SAP | Estado | Brecha |
|---|---|---|---|---|
| `clienteIntelisis` | Eco de la entrada, `@Cliente AS ClienteIntelisis` (SP:615). Solo se lee del primer renglón (`FacturaMethods.cs:64-66`). El controlador lo usa además como bandera de "hay datos": si viene vacío, responde "No tiene facturas" (`CreditController.cs:109-113`). | Ninguna llamada a SAP: eco del BP de la ruta. Es el mismo valor que el filtro `Partner` de `zsplits`. | DISPONIBLE | Sin brecha de lógica. El valor cambia por diseño de `C########` al BP de 10 dígitos. Solo debe llenarse cuando `facturas[]` no está vacío, para conservar la rama "No tiene facturas". |
| `importeVenta` | SUM(`ImporteVta`) de los padres, excluyendo Seguro Vida (SP:508-511). `ImporteVta` = `Importe` + `Impuestos`, sin `ISNULL` (SP:280). Es `money`, así que sale como texto con 4 decimales. | `zsplits.Ztotal`, "Importe total de la venta" (RSG `ntz01_zsplits_mercaderias.md:71`), tomado una vez por `Vbeln`. Llave `ZAPI_TZ01_ZSPLIT_MERC` (SSAP `Web.config:52`); DTO `ZSplitDto.cs:41-42`. | PARCIAL | (1) El filtro `Partner` está documentado (RSG `tz01_zsplits_mercaderias.md:54`), pero ServicioSAP solo filtra por `Vbeln` (`AbonoMethods.cs:68`) y no hay captura por `Partner`. (2) No está demostrado que `Ztotal` = `Importe` + `Impuestos`, es decir, que incluya IVA y enganche. La única observación es `Ztotal` 6000 = SUM(`ZmontoSplit`) = 12 × 500 (GUIA:466-467), lo que sugiere que es el importe financiado; hace falta E2E. (3) Seguro Vida queda excluido sin hacer nada, porque está en otro servicio. |
| `saldoCapital` | SUM(ISNULL(`Saldo`,0)) de los hijos, excluyendo Seguro Vida (SP:525-528). Incluye documentos, notas de cargo con padre, la propia factura si está pendiente y los renglones DIMAS concluidos. Es `""` si solo hay Seguro Vida. | **Opción A:** `zsplits` SUM(`Zsaldo`) con `Partner eq '{bp}'`, sin `Zanula = 'X'`. **Opción B:** `ZAPI_EX01_NOCOMP_SRV.DocNoCompSet` SUM(`Saldo`) con `Kunnr eq '{bp}'`, excluyendo `Contable = 1` (RSG `ex01_documentos_no_compensados.md:56`); ya se llama en `AbonoMethods.cs:19-51`. | DECISION | Decisión de negocio abierta (GUIA §6.3, líneas 472-481, y §8.2, línea 533). Para 9000006302, EX01 da 3,036.00 y NTZ01 da 172.00 (GUIA:478-479). NTZ01 mercaderías solo tiene parcialidades, así que le faltan las notas de cargo que LAN cuenta. EX01 mezcla facturas, notas de cargo y de crédito, cobros, anticipos, Credilana y seguros (RSG ex01:74-81); si se elige EX01 hace falta una regla para excluir Credilana (fuera de alcance, GUIA §1.6b) y seguros. La rama DIMAS no tiene equivalente. Los valores de 9000006302 solo constan en GUIA: no hay respuesta cruda en `CAPTURAS_REALES_APIS.md` (GUIA §2.5; N3). |
| `atraso` | `@Atraso` + `@moratorio` (SP:558). `@Atraso` = SUM(`Saldo`) de los hijos con `DiasVencidos > 0`, Seguro Vida **incluido** (SP:517-521). `DiasVencidos` = DATEDIFF(DAY, `Vencimiento`, GETDATE()) solo para pendientes (SP:207-211). | SUM(`Zsaldo`) de las parcialidades pendientes con días vencidos > 0, contando los días como hoy − `ZvencSplit` (DATS, ntz01:74), contrastado con `ZdiasVenc` de la respuesta real (GUIA §2.3:306); más los moratorios. | PARCIAL | El capital vencido sí se calcula desde NTZ01. Brechas: (1) hereda la duda sobre `Zmoratorio`; (2) el saldo vencido de Seguro Vida está en `z_srvb_tz01_zsplit_seguros`, que no tiene llave ni se llama; (3) las notas de cargo vencidas no están en NTZ01; (4) no se sabe cada cuánto se refresca `ZdiasVenc`, así que conviene calcular desde `ZvencSplit`, igual que DATEDIFF. Para 9000006302: `atraso` 354.32 = 0 de capital vencido + 354.32 de moratorio (GUIA:465). |
| `moratorios` | `@moratorio` = SUM(ISNULL(`Moratorios`,0)) de todos los hijos, Seguro Vida incluido (SP:522, 559). Por hijo, solo si está pendiente y vencido: `ROUND(Fn_MaviCalculaMoratorios(ID), 2)` (SP:264-268), con las condiciones de la regla 5. `CEILING` solo para el canal 77 (MOR:88-93). | `zsplits.Zmoratorio` (`ZSplitDto.cs:137-138`). Respuesta real: SUM = 354.32 para 9000006302 (GUIA:463). | PARCIAL | El campo existe en una respuesta real, pero su significado no está confirmado: la ficha TZ01 lo llama "Interés Diario" (`tz01_zsplits_mercaderias.md:45`), y en la muestra vale 354.32 con saldo vencido 0, caso en el que LAN reportaría 0. Hay otra hipótesis: que sea el equivalente de las notas de cargo de moratorios, que LAN cuenta en `saldoCapital` y no en `moratorios` (N5). Los zsplits de seguros no tienen `Zmoratorio` (`ntz01_zsplits_seguros.md:57-87`). La fórmula de LAN no se puede reconstruir, porque las vistas no están en el vault (GUIA §2.4: no hacen falta si se acepta `Zmoratorio`). **No se debe fijar un filtro de parcialidades sin aprobación** (GUIA §1.9b). |
| `adeudoTotal` | `@SaldoCapital` + `@moratorio` (SP:561). Es `""` si `SaldoCapital` es NULL. | Se calcula en C#: `saldoCapital` + `moratorios`. | DECISION | La fórmula es trivial, pero depende de N4 y N5. Para mantener la paridad hay que conservar el alcance mixto: Seguro Vida fuera del capital y dentro del moratorio. |
| `liquidaConSolo` | SUM de `FNCXCPagoLiquidaBBVA(Mov, MovID)` sobre todos los padres, Seguro Vida incluido, + `@moratorio` (SP:513-515, 562). Nunca es NULL. La regla completa está en el punto 13 del §3. | Ningún campo SAP trae el importe para liquidar. Candidatos solo **por nombre**: `ZcobroPp` y `ZcobroExt` (¿Saldo − BonifPP y Saldo − BonifPPExt?); `ZbonPp`, `ZbonExt`, `ZbonExtDgracia`, `ZidbonPp`; `ZidbonCc` ("Id Campaña Bonificación Contado Comercial", ntz01:78, equivalente de `Cxc.IDBonifCC`); `ZbonCc`; `ZmaxDv` (en la ficha hermana de seguros, "Máximo Histórico de Días Vencidos", `ntz01_zsplits_seguros.md:84`, equivalente de `CxcMavi.MaxDiasVencidosMAVI`); `ZbonAut` y `ZbonMan` (¿notas de crédito ya aplicadas?); `ZmontoSplit` (¿= MR?); COUNT(parcialidades) (¿= `DANumeroDocumentos`?); `Zmonedero` (¿= `AuxiliarP.Abono`?) (`ZSplitDto.cs:44-138`). SD33 RESPONSESet: `Zdiasatrazo`, `Zvencantes`, `Zdiasmenores`, `Zdiasmayores`, `line_Zlinea` (sd33:47-55); `Zmaxdiasvenc` solo aparece en el código (`BonusResponseSet.cs:43`, `BonusOK.cs:118`), no en la ficha. SD40 `ZAPI_CONDPAGO`: `Zplazo`, `Zdiasgracia` (`CondicionPagoResponse.cs`; sin ficha). | NO_EXISTE | Hay que reconstruirlo en C# o que ABAP lo entregue (N6). Lo que bloquea la reconstrucción en C#: (1) ninguno de esos candidatos está confirmado; (2) el parser de SD33 deserializa RESPONSESet como `List<Bonus>` (`AccountMethods.cs:168`) y pierde todos los campos de regla; `BonusResponseSet` solo está referenciado como `Bonus.RESPONSESet` (`Bonus.cs:20`), y sus nombres `Zporcbon1n`/`excl_Znombont` no coinciden con la ficha (`Zporcbon1`/`excl_Znombon`); el parser también lo usan `GetBonus` y `GetBonusAsync` (`AccountMethods.cs:83,136`), así que no se puede cambiar sin afectar `AccountController`; (3) no hay fuente identificada para la fecha de la solicitud de crédito que decide la vigencia de la campaña; (4) SD40 no tiene ficha. `getClienteFactura` necesita la misma pieza (PDET:200). |
| `facturas[].facturaId` | `#Preliminar.Movid` = `DP.PadreIDMAVI`, el `MovID` de la factura (SP:541, 608). LAN lee `row["MovId"]` sin distinguir mayúsculas (`FacturaMethods.cs:78`). El `Mov` padre (por ejemplo "Seguro Vida") se descarta. | `zsplits.Vbeln` (documento de facturación), agrupado a partir del resultado con `Partner eq '{bp}'`. | DISPONIBLE | Por diseño, el valor cambia del `MovID` de Intelisis al `Vbeln` de SAP. Es el mismo identificador que acepta `credit/getClienteFactura` de ServicioSAP, que filtra por `Vbeln` (`AbonoMethods.cs:68`). Depende de la consulta por `Partner`, que todavía no se ha capturado (N1). |
| `facturas[].estatus` | `C.Estatus` por join a `Cxc` solo por `Mov`/`MovID` (SP:542, 566-568). Normalmente es `PENDIENTE` o `CONCLUIDO` (regla 17). | `zsplits` no tiene campo de estatus (ntz01:57-85). Se podría derivar: `PENDIENTE` si alguna parcialidad tiene `Zsaldo > 0` (o `ZconcSplit` vacío), si no `CONCLUIDO`, sin contar `Zanula = 'X'`. | NO_EXISTE | Hay que acordar la regla. **Con la regla propuesta el valor sería siempre `PENDIENTE`**, porque solo se listan facturas con parcialidades pendientes. Si en LAN la factura a crédito pasa a `CONCLUIDO` cuando se generan los documentos, la paridad se rompería. Hace falta una captura LAN con los literales reales (N2, N8). |
| `facturas[].totalFactura` | CASE WHEN `PadreMAVI` = 'Seguro Vida' THEN 0 ELSE `ImporteVta` END (SP:546-549). Es `""` si `Impuestos` es NULL y `0.0000` para Seguro Vida. | `zsplits.Ztotal` de ese `Vbeln`. | PARCIAL | La misma duda que en `importeVenta` (si incluye IVA y enganche). Las facturas Seguro Vida solo aparecerían si se agrega el servicio de seguros, y saldrían con `0.0000`. |
| `facturas[].fechaCompra` | `CONVERT(varchar, FechaEmision del padre, 1)`, que da `mm/dd/yy` (SP:545). `03_BusinessMethod.md:215` dice `dd/mm/aa`, y eso está mal. | `zsplits.Fkdat`, "Fecha factura", DATS (ntz01:63). Formatear como `MM/dd/yy` con `InvariantCulture`. | DISPONIBLE | Solo hace falta convertir el formato. No se ha capturado el formato crudo de `Fkdat` en un GET; el ejemplo de la ficha (ISO, ntz01:108) es el cuerpo de un POST. |
| `facturas[].nombreCliente` | `Cte.Nombre` por INNER JOIN a `Cte` (SP:555, 564-565); el mismo valor en todos los renglones. Formato en la regla 15. Un cliente sin renglón en `Cte` da 0 renglones, es decir, "No tiene facturas". | `ZAPI_BP05MA_SRV.BusinessPartnerSet(Partner, Client)`, cabecera `NameLast`, `NameLst2`, `NameFirst` (también existe `Namemiddle`). Hay captura real en mayúsculas (`CAPTURAS_REALES_APIS.md:70`). Ya lo llama `GetClientMaAsync` (`BusinessPartnerMethods.cs:297-310`). | DISPONIBLE | Construir `NameLast NameLst2 NameFirst[ Namemiddle]` en mayúsculas. No reutilizar `CustomerServiceMethods.cs:347`, que arma el nombre en el orden contrario. BP05MA no tiene ficha (GUIA §5, §8.4). `GetClientMaAsync` lanza una `Exception` genérica tanto si el BP no existe como si SAP falla (`BusinessPartnerMethods.cs:316-338`), así que no distingue "no encontrado" (en LAN, "No tiene facturas") de "error". La alternativa `ZB_DATOS_CLIENTE_CDS` no sirve para paridad: en la ficha los nombres vienen en mayúsculas y minúsculas, y los dos apellidos van en `PrimerApellido` (bp05:166-169). Falta confirmar que los clientes creados fuera de ecommerce siguen el mismo orden (N15). |
| `facturas[].articulos` | SUM(`VentaD.Cantidad`) de la `Venta` con el mismo `MovID` y `Mov` (SP:589-602, 625-626). Sin filtro de cliente, empresa ni estatus; cuenta todos los renglones con `Art`, incluido el envío `SEGU00001`. Es `""` si no hay `Venta` (por ejemplo, Seguro Vida). No se sabe el formato (`3` o `3.0000`). | Candidato: `ZAPI_DOCVTAS_CHECK_CDS.ZAPI_DOCVTAS_CHECK` con `$expand=to_salesdoc_items`, campo `Cantidad` (DTO `SaleDocumentItem.cs:31-32`; no está en la ficha sd36:44-45), filtro `DocNumber eq '{pedido}'` (`SalesMethods.cs:65`). El enlace factura → pedido sería `zsplits.Vgbel`, "documento modelo" (ntz01:67). | PARCIAL | Tres eslabones sin verificar: que `Vgbel` sea el `DocNumber` de SD36 (podría ser la entrega); que SD36 acepte el filtro `DocNumber`, cuando la ficha exige `PurchNoC` "o un campo equivalente" (sd36:25); y que exista `Cantidad`, que solo consta en el código. Sería una llamada a SD36 por factura (N9). |
| `facturas[]` (qué facturas salen y en qué orden) | Un renglón por cada (`PadreMAVI`, `PadreIDMAVI`) distinto con al menos un hijo retenido, siempre que el padre esté en el universo del cliente (SP:271-295), más INNER JOIN a `Cte` y a `Cxc` (SP:563-579). Incluye Seguro Vida. Sin `ORDER BY` (SP:605-626). Los matices de empresa/cliente están en la regla 6. | `zsplits?$filter=Partner eq '{bp}'` (opcionalmente `and Zsaldo gt 0`), paginado con `$top`/`$skip` (tz01:27, 54), agrupado por `Vbeln`, sin `Zanula = 'X'`. | PARCIAL | El filtro `Partner` nunca se ha llamado ni capturado. NTZ01 mercaderías no tiene facturas de seguros ni de Credilana (son servicios aparte; Credilana está fuera de alcance, GUIA §1.6b). La rama DIMAS no tiene equivalente. El orden debe volverse determinista, por ejemplo por `Fkdat`; hay que preguntar si Magento depende del orden (N14). |
| Documentos Seguro Vida (afectan a `atraso`, `moratorios`, `liquidaConSolo`, `facturas[]` y `totalFactura`) | Se excluyen de `importeVenta` y `saldoCapital` (SP:508-511, 525-528) y se muestran con `totalFactura` 0 (SP:546-549). **Sí** cuentan en `atraso`, `moratorios` y `liquidaConSolo` (SP:513-523), y aparecen en `facturas[]`. | `z_srvb_tz01_zsplit_seguros.zsplits` (RSG `ntz01_zsplits_seguros.md:42-44`; clases ZPI1/ZPRE, :34), que tiene `Zsaldo`, `ZdiasVenc` y `ZmaxDv` pero no `Zmoratorio`. ServicioSAP no lo llama y no tiene su ruta configurada. | DECISION | Decisión de alcance (N7). Si entra, hay que dar de alta la ruta del servicio, sea con una llave en `Web.config` (GUIA §1.3) o con una constante; las dos opciones necesitan aprobación (GUIA §1.9b). También hace falta una regla para su moratorio. Si no entra, `atraso`, `moratorios` y `liquidaConSolo` saldrán menores que en LAN para los clientes con seguro. |
| Centinela "No tiene facturas" | HTTP 200 con esa cadena JSON cuando el SP devuelve 0 renglones, y también ante cualquier excepción de `ExecuteReader` (incluido el timeout de 120 s), porque se traga (`FacturaMethods.cs:38-51`; `CreditController.cs:109-113`). El DMZ la pasa como 200 (DMZ `CreditController.cs:25-26`). | No es un dato SAP. ServicioSAP devuelve `Ok("No tiene facturas")` cuando la consulta por `Partner` no encuentra facturas pendientes, o cuando el BP no existe. | DECISION | El caso sin datos es fácil. Queda abierto (N11) si las fallas de SAP o HTTP deben responder también "No tiene facturas", como en LAN, o un 500, como hacen hoy las rutas de ServicioSAP (`AbonosController.cs:28-31`). GUIA §1.5 dice que el resultado de negocio va en el cuerpo con 200. `marcos_result.json` lo marca como un cambio de comportamiento que hay que acordar. |
| Centinela "El cliente es incorrecto" (validación de la entrada) | Regex `^[C]{1}[0-9]{8}$` (LAN `CreditController.cs:22, 104, 120`). Si falla: 200 "El cliente es incorrecto", que el DMZ convierte en 400 `{Message: "No existe el cliente"}` (DMZ `CreditController.cs:27-28`). | No es un dato SAP. Lo valida ServicioSAP. El BP es CHAR(10) (ntz01:69). | DECISION | No copiar el regex `C`. La propuesta `^[0-9]{10}$` necesita aprobación (GUIA §1.9b; N10). Una validación estricta también evita la inyección en el `$filter` de OData, porque el valor se inserta tal cual (el mismo patrón que `AbonoMethods.cs:26,68`). |

---

## 5. Qué necesitamos y de quién

| # | Qué | De quién | Por qué |
|---|---|---|---|
| N1 | Una respuesta real de `zsb_ntz01_zsplit_merc/zsplits?sap-client=110&$format=json&$filter=Partner eq '<BP Dev>'` (por ejemplo 1500005115, el BP que usa la colección Hoppscotch), con paginación `$top`/`$skip`, y aclarar si llega `@odata.nextLink`. Preguntas: ¿funciona el filtro `Partner`? ¿`Zanula`, `ZconcSplit`, `ZdiasVenc` y `Zmoratorio` vienen llenos en todas las facturas? ¿algún campo int/decimal llega como `null`? | El equipo de desarrollo con acceso a Hoppscotch/S4 Dev (dueño de la ruta en `MAVI - DMZ-SAP.csv:3`) | Es la base de la lista de facturas y de todos los saldos. El filtro está documentado (tz01:54), pero no hay llamada ni captura, y GUIA §2.3 dice que la respuesta real manda sobre la ficha. `ZSplitDto.cs` declara los números como no anulables, así que un `null` rompería la deserialización. |
| N2 | Una respuesta real de LAN `GET credit/getClienteSaldo/<C-code>` (o `EXEC SPCXCSaldosClientesPendiente '<C-code>'`) para un cliente Dev con facturas pendientes; idealmente con una factura Seguro Vida, un documento vencido y una campaña de bonificación. | El equipo LAN/Intelisis | Confirma las cadenas exactas que SAP debe copiar: montos con 4 decimales, fechas `mm/dd/yy`, el formato de `articulos` y los literales reales de `estatus`. Nada de esto está en `CAPTURAS_REALES_APIS.md`, y los ejemplos de `03_BusinessMethod.md` son inventados (`FAC-000123`, montos con 2 decimales). |
| N3 | Guardar en `CAPTURAS_REALES_APIS.md` las respuestas crudas de `zsplits` y EX01 para 9000006302 que respaldan GUIA §6.2-6.3 (GUIA:458-480). | Quien hizo esa captura | GUIA §2.5: un resumen no es evidencia primaria. Hoy `CAPTURAS_REALES_APIS.md` no tiene ninguna captura de `zsplits` ni de EX01. |
| N4 | Decidir si `saldoCapital` sale de EX01 `DocNoCompSet` (`Kunnr`) o de NTZ01 `zsplits` (`Partner`), y si las notas de cargo cuentan en `saldoCapital` y `atraso` como en el SP. Si se elige EX01, definir con qué campos se excluyen Credilana y Seguros, además de `Contable = 1`. Para decidir, capturar EX01 completo para el mismo BP, con todos los campos y no solo los 15 que mapea `DocNoCompResponse`. | El dueño funcional (Uriel según `marcos_result.json`, que cita `implementation_plan_master.md:36`; GUIA §8.2), más un dev para la captura | Las dos fuentes dan 3,036.00 y 172.00 para el mismo documento (GUIA §6.3). La elección cambia `saldoCapital`, `adeudoTotal` y `atraso`. |
| N5 | ¿Qué es `Zmoratorio` en NTZ01? Opciones: (i) interés moratorio devengado y no pagado por parcialidad; (ii) una tasa diaria ("Interés Diario", tz01:45); (iii) un total histórico; (iv) el equivalente de las notas de cargo por moratorios, que LAN suma en `saldoCapital` y no en `moratorios`. ¿Qué parcialidades se suman? | El equipo funcional/ABAP dueño de `ZME_SPLITS` | El SP solo da moratorio a renglones pendientes y vencidos (SP:264-268), y la muestra trae 354.32 sin saldo vencido (GUIA:463, 465). Si se rechaza `Zmoratorio`, habría que agregar a `SPsOrden` las vistas `v_phmoratorio` y `V_FactorIMMAVI`. |
| N6 | ¿Cómo se produce `liquidaConSolo`: se reconstruye en C# (NTZ01 + SD33 + SD40) o ABAP entrega un campo o API con el importe para liquidar? Si es en C#, hay que confirmar los candidatos del §4: `ZcobroPp`/`ZcobroExt`; `ZbonPp`/`ZbonExt`/`ZbonExtDgracia` (¿días de gracia?); `ZidbonCc`/`ZidbonPp`/`ZbonCc`; `ZmaxDv` (¿máximo histórico de días vencidos?); `ZbonAut`/`ZbonMan` (¿notas de crédito ya aplicadas?); `ZmontoSplit` (¿MR?); el conteo de parcialidades (¿`DANumeroDocumentos`?); `Zmonedero` (¿`AuxiliarP.Abono`, que el SP llama Monedero en SP:417-425?). Además: una respuesta real de SD33 RESPONSESet para un `ZidbonCc`/`ZidbonPp`; la ficha y una captura de SD40; y la fuente de la fecha de la solicitud de crédito que decide la vigencia, o la confirmación de que `ZidbonCc > 0` ya significa que la campaña está asignada. | El dueño funcional (decisión) y el equipo SAP/ABAP (campos, fichas, capturas) | Ningún campo SAP trae el importe para liquidar. `FNCXCPagoLiquidaBBVA` y `FN_MAVIRM0906CalculaBonifCC` usan reglas de campaña que ServicioSAP hoy descarta (`AccountMethods.cs:168`). `getClienteFactura` necesita la misma pieza (PDET:200). |
| N7 | ¿Los documentos Seguro Vida deben aparecer en `getClienteSaldo`? Si sí: la ruta del servicio `z_srvb_tz01_zsplit_seguros` y la regla de moratorio, porque el servicio no tiene `Zmoratorio`. | El dueño funcional; después, el equipo SAP para la URL | LAN los lista con `totalFactura` 0 y los cuenta en `atraso`, `moratorios` y `liquidaConSolo` (SP:508-528, 546-549). Agregar configuración necesita aprobación (GUIA §1.9b). |
| N8 | ¿Cómo se deriva `estatus` desde `zsplits`? Y en LAN, ¿una factura a crédito con documentos abiertos sale `PENDIENTE` o `CONCLUIDO`? | El dueño funcional, después de N2 | SAP no tiene campo de estatus, y con la derivación propuesta el valor sería siempre `PENDIENTE` (§4). |
| N9 | ¿`zsplits.Vgbel` ("documento modelo") es el pedido que SD36 `ZAPI_DOCVTAS_CHECK` acepta como `DocNumber`? ¿SD36 acepta ese filtro sin `PurchNoC` (sd36:25)? Pedir una respuesta real de SD36 con `to_salesdoc_items.Cantidad` para una factura. | El equipo SAP SD o un dev con acceso a S4 | Es el único camino de la factura a la cantidad de artículos. `Cantidad` está en el DTO (`SaleDocumentItem.cs:31`), pero no en la ficha. |
| N10 | ¿Qué validación sustituye al regex `C` para los BP numéricos? (Propuesta: `^[0-9]{10}$`.) ¿Qué entradas deben seguir respondiendo "El cliente es incorrecto"? Si el BP existe pero no tiene facturas abiertas, ¿la respuesta debe ser "No tiene facturas"? | El usuario o el dueño funcional | El `^[C]{1}[0-9]{8}$` de LAN rechaza todas las llamadas reales de Magento, y GUIA §1.9b prohíbe crear reglas o constantes sin aprobación. |
| N11 | Cuando SAP falla (error HTTP o timeout), ¿ServicioSAP responde "No tiene facturas", como hace LAN al tragarse la excepción, o un 500? Esto incluye el caso en que BP05MA no encuentra el BP. | El usuario o el dueño funcional | LAN oculta los errores SQL detrás de "No tiene facturas" (`FacturaMethods.cs:48-51`), y las rutas de ServicioSAP devuelven 500 (`AbonosController.cs:28-31`). `marcos_result.json` lo marca como un cambio de comportamiento. |
| N12 | ¿Qué `URL_INTELISIS` usa el DMZ desplegado: ServicioSAP (`localhost:44399`, como está versionado en `Web.config:17`) o LAN (la línea comentada :16)? ¿Qué verbo se usa hacia ServicioSAP? `MAVI - DMZ-SAP.csv:3` dice GET, la ruta hermana usa POST (`curl.PostSAP`) y también existe `Curl.GetSAP` (`Curl.cs:210-243`). | El dueño de despliegue/infraestructura del DMZ | Determina si hoy la ruta termina en 500 o en 400, y define el cambio en DMZ `CreditController.cs:23`. |
| N13 | ¿Qué significan los valores 1, 2 y 4 de `Cxc.CobroCteFinal`? Como DIMAS MX está deprecado, ¿se puede descartar la rama "CONCLUIDO + CobroCteFinal 1/2/4"? | El dueño de Intelisis / funcional | Esos renglones concluidos se quedan en `saldoCapital` y mantienen su factura en la lista (SP:231-233). SAP no tiene equivalente. |
| N14 | ¿Magento depende del orden de `facturas[]`? ¿Se puede ordenar por fecha de factura? | El usuario (el lado Magento está fuera de este análisis) | El SP no tiene `ORDER BY` (SP:605-626), así que el orden de LAN no está definido, y SAP necesita uno determinista. |
| N15 | ¿El nombre debe ser "APELLIDO PATERNO APELLIDO MATERNO NOMBRES" en mayúsculas para todos los clientes (con BP05MA: `NameLast NameLst2 NameFirst [Namemiddle]`), y no solo para los creados por ecommerce? | El dueño funcional | `Cte.Nombre` tiene ese formato para los clientes de ecommerce (`SP_eCommerceCtenuevo.sql:115`). El helper de ServicioSAP arma el nombre en el orden contrario (`CustomerServiceMethods.cs:347`). |
| N16 | Las fichas RSG de `ZAPI_BP05MA_SRV` y de `ZAPI_CONDPAGO` (SD40, `zsb_sd40_condpago`). | El equipo SAP / RSG | Las dos se usarían (para el nombre y, en `liquidaConSolo`, para el número de documentos), y ninguna tiene ficha (GUIA §8.4). BP05MA al menos tiene una captura real. |

---

## 6. Plan de implementación

Sigue GUIA §1.4-1.9:
- el orquestador se nombra como la ruta del DMZ;
- los pasos internos se nombran por la operación SAP;
- en `Methods/` se usa `async` con `ConfigureAwait(false)`; los métodos existentes de `AbonoMethods.cs` (:31, 35, 73, 77) no lo usan, y no hay que copiar esa omisión;
- se crea un `HttpClient` por petición con `TokenGenerator.CreateClientS4()`;
- no se agregan constantes, parámetros ni llaves de configuración sin aprobación.

### Ya (con lo que existe; lo provisional queda marcado)

1. **Ruta en ServicioSAP.** En `SSAP Controllers\AbonosController.cs` (`RoutePrefix "credit"`, `[Authorize]` en :7) agregar `[HttpPost] [Route("getClienteSaldo/{cliente}")] public async Task<IHttpActionResult> GetClienteSaldo(string cliente)`, que llame a `_abonoMethods.GetClienteSaldoAsync(cliente)`, igual que la hermana `getClienteFactura` (:34-47). En el controlador no se usa `ConfigureAwait` (GUIA §1.6). El verbo queda sujeto a N12.
2. **Contrato idéntico a LAN.** Un modelo espejo de LAN `Models\ClienteRequest.cs:21-44`: todas las propiedades `string`, en este orden: `clienteIntelisis`, `importeVenta`, `saldoCapital`, `atraso`, `moratorios`, `adeudoTotal`, `liquidaConSolo`, `facturas[ {facturaId, estatus, totalFactura, fechaCompra, nombreCliente, articulos} ]`.
   - Devolver `Ok(obj)`; nunca un arreglo ni una cadena ya serializada.
   - Nunca `null`: usar `""` donde LAN emitiría `DBNull`.
   - Montos: `decimal.ToString("0.0000", CultureInfo.InvariantCulture)`, para imitar `money` (confirmar con N2).
   - Fechas: `MM/dd/yy`.
3. **Validación.** Si `cliente` no cumple la regla aprobada (N10), responder `Ok("El cliente es incorrecto")`. Esto también protege el `$filter` de OData.
4. **NTZ01 por Partner.** Agregar un paso interno nuevo, por ejemplo `GetZsplitsByPartnerAsync(bp)`, en `SSAP Methods\Abono\AbonoMethods.cs`. **No** se trata de agregar un parámetro a `GetParcialidadesAsync`, porque GUIA §1.9b lo prohíbe sin aprobación. Debe:
   - tomar la base de `obtenerUrl(...).Replace("/odata/sap","/odata4/sap")`;
   - usar la llave `ZAPI_TZ01_ZSPLIT_MERC` (`Web.config:52`), normalizando la barra inicial;
   - hacer `GET zsplits?sap-client=110&$format=json&$filter=Partner eq '{bp}'`, paginando con `$top`/`$skip` o siguiendo `@odata.nextLink` si existe;
   - deserializar `value[]` como `List<ZSplitDto>`, y volver anulable cualquier campo que N1 muestre como `null`.
5. **Agrupación.** Descartar las parcialidades con `Zanula = 'X'`. Una parcialidad está pendiente si `Zsaldo > 0` (contrastar con `ZconcSplit`). Agrupar por `Vbeln` (y `Fkart`). Las facturas con al menos una parcialidad pendiente forman `facturas[]`. Si no hay ninguna, `Ok("No tiene facturas")`.
6. **Nombre.** Llamar al `GetClientMaAsync(bp)` existente (`BusinessPartnerMethods.cs:297`) y armar `nombreCliente` en mayúsculas, con un solo espacio: `NameLast NameLst2 NameFirst [Namemiddle]`. El método lanza una `Exception` genérica tanto si no encuentra el BP como si SAP falla (:316-338), así que la respuesta ante esa excepción sigue N11. No modificar el método sin aprobación.
7. **Días vencidos por parcialidad**, en C# con `decimal`: `(fecha de hoy en México − ZvencSplit.Date).Days`, contrastado con `ZdiasVenc`. Una parcialidad está vencida si está pendiente y los días son mayores que 0.
8. **Cabecera provisional:**
   - `saldoCapital` = SUM(`Zsaldo`) de las pendientes, **provisional hasta N4**. Con EX01 sería SUM(`Saldo`) de `DocNoCompSet` con `Kunnr eq bp` y `Contable` distinto de 1, usando el `GetDocumentosNoCompensadosAsync` existente (:19-51) y la regla de exclusión que salga de N4.
   - `atrasoCapital` = SUM(`Zsaldo`) de las vencidas.
   - `moratorios` = **provisional hasta N5**. No fijar un filtro de parcialidades por deducción: usar el que se apruebe, dejar documentado cuál se usó y reportar la diferencia contra LAN (GUIA §2.2, §4 paso 6).
   - `atraso` = `atrasoCapital` + `moratorios`.
   - `adeudoTotal` = `saldoCapital` + `moratorios`.
   - `importeVenta` = SUM(`Ztotal`), tomado una vez por `Vbeln`.
   - `clienteIntelisis` = `bp`.
9. **Por factura:** `facturaId` = `Vbeln`; `fechaCompra` = `Fkdat` en `MM/dd/yy`; `totalFactura` = `Ztotal`; `nombreCliente` = el del paso 6. Usar un orden determinista provisional (`Fkdat`, luego `Vbeln`) hasta N14.
10. **Puente DMZ.** En DMZ `Controllers\CreditController.cs:23`, cambiar `curl.Get("credit/getClienteSaldo/"+cliente)` por `curl.PostSAP("credit/getClienteSaldo/"+cliente, "{}")`, igual que `getClienteFactura` en :51. Mantener tal cual las comprobaciones de centinelas (:25-28) y el `JObject.Parse` (:30-40). Hacer este cambio solo cuando exista la ruta de ServicioSAP y se haya acordado el valor interino de `liquidaConSolo`, `estatus` y `articulos` (por ejemplo `""`). Hoy todas las llamadas ya fallan, así que el cambio no puede empeorar la ruta, pero sí puede publicar valores incompletos.
11. **Errores.** Aplicar la regla que salga de N11: `Ok("No tiene facturas")` para paridad con LAN, o `InternalServerError`.

### Después (cada paso espera la respuesta indicada)

12. **`liquidaConSolo` (N6).** Crear un paso reutilizable, por ejemplo `CalcularLiquidaConAsync(vbeln, splits)`, que también use `getClienteFactura` (PDET:200).
    - **Base:** a cada parcialidad pendiente aplicarle el pago puntual con los campos que se confirmen (`ZcobroPp`/`ZcobroExt`, o bien `Zsaldo` − `ZbonPp`/`ZbonExt` con los días de gracia que se confirmen). `ZmaxDv` **no** es candidato a días de gracia, porque es el máximo histórico de días vencidos. Si el resultado es 0, usar `Zsaldo`.
    - **Contado comercial y Adelanto:** leer las reglas de SD33 por `ZidbonCc`/`ZidbonPp`, con un parser **nuevo** que deserialice `BonusResponseSet` con los nombres de la ficha. No cambiar `ParseSapResponseBonus` (`AccountMethods.cs:153-180`), porque alimenta las rutas de `AccountController` (`AccountController.cs:15-36`). Tomar el número de documentos del conteo de parcialidades o de SD40 `Zplazo`, MR de `ZmontoSplit`, las notas de crédito ya aplicadas del campo que se confirme, y el atraso histórico de `ZmaxDv`.
    - Redondear hacia arriba al centavo siguiente.
    - **Cabecera:** SUM de todas las facturas + `moratorios`.

    Si ABAP entrega un campo con el importe para liquidar, mapear ese campo. Mientras tanto, no inventar un valor.
13. **`estatus` (N8):** aplicar la derivación acordada en cuanto N2 muestre los literales reales.
14. **`articulos` (N9):** cuando se confirme que `Vgbel` es el pedido, llamar a SD36 por `DocNumber` (`SalesMethods.cs:65`) y devolver SUM(`to_salesdoc_items.Cantidad`) de **todos** los renglones, incluidos servicios y envío. Devolver `""` si no hay documento.
15. **Seguro Vida (N7), si entra en alcance:** dar de alta la ruta del servicio de seguros (con aprobación), listar esas facturas con `totalFactura` `0.0000`, excluirlas de `importeVenta` y `saldoCapital`, e incluirlas en `atraso`, `moratorios` y `liquidaConSolo`, como hace SP:508-562.
16. **Notas de cargo y rama DIMAS (N4, N13):** implementar solo si la decisión sobre `saldoCapital` las incluye, probablemente desde EX01.

### Verificación

17. Compilar con MSBuild según GUIA §9b. Después comparar E2E, campo por campo, contra la captura LAN (N2) para un cliente que exista en los dos sistemas. Reportar al usuario cualquier diferencia, en vez de ajustar valores (GUIA §2.2, §4 paso 6).

---

## 7. Correcciones sobre el borrador del mapeo (verificación adversarial)

1. **El DMZ hoy:** `curl.Get` no recibe necesariamente un 404. Recibe un 404 si ServicioSAP corre en `localhost:44399`, o un error de conexión si nada escucha. El resultado es 500 en los dos casos.
2. **Token:** "respondido por GUIA §8.1/§8.5.1" era demasiado fuerte. Ahora está confirmado en los `Web.config` versionados (mismos valores, comparados por hash), pero la prueba E2E de §8.5.1 sigue pendiente.
3. **Notas de cargo `MORATORIOS MENUDEO`:** citar SP:363 no demuestra que sean hijos. SP:347-373 las liga por `MovCampoExtra`. La evidencia de que hay notas de cargo con padre está en LIQ:314 y BON:53, 189-192.
4. **Regla 5:** faltaban condiciones de `Fn_MaviCalculaMoratorios`: `CalculoMoratorioMavi = 1`, y `GeneraCargoxMoratorio = 1` o la combinación `INSTITUCIONES` / `CREDITO MENUDEO` (MOR:52-60).
5. **Regla 13a:** "no vencido" incluye el documento que vence hoy (`dvn <= 0`). Un vencimiento NULL da el Saldo completo. La base toma todos los renglones pendientes con ese padre en `Cxc` (de cualquier `Mov` y sin filtro de cliente), no solo `#DoctosHijos`.
6. **Regla 13b:**
   - las reglas de Contado comercial se leen de la campaña guardada en los documentos (`IDBonifCC`, BON:286-287), y la campaña que coincide solo abre la puerta;
   - "días máximos de atraso" sale de `CxcMavi.MaxDiasVencidosMAVI` (BON:212), una fuente que el borrador no mencionaba;
   - "cuántos documentos ya vencieron" es en realidad la posición del último `Documento` cuyo vencimiento pasó, esté pagado o no;
   - R = 2 requiere dos renglones del join (renglones pendientes × campañas CC que coinciden), no estrictamente dos renglones pendientes.
7. **Regla 13c:** Adelanto necesita al menos un `Documento` pendiente que venza hoy o después, y cuando calcula reemplaza a la base y a Contado comercial.
8. **`AuxiliarP.Abono`** no es "lo pagado de la factura". El SP lo llama Monedero (SP:417-425). Su candidato SAP es `Zmonedero` (ntz01:82), aunque MR podría tomarse directo de `ZmontoSplit` (ntz01:73).
9. **`ZmaxDv`** no es candidato a días de gracia. La ficha hermana de seguros lo define como "Máximo Histórico de Días Vencidos" (`ntz01_zsplits_seguros.md:84`), es decir, el equivalente de `CxcMavi.MaxDiasVencidosMAVI`. Se agregan como candidatos `ZcobroPp`, `ZcobroExt`, `ZbonAut`, `ZbonMan`, `Zmonedero`, `ZmontoSplit` y el conteo de parcialidades, y se anota que `ZidbonCc` sí está descrito en la ficha (ntz01:78).
10. **`Zmaxdiasvenc`** no está en la ficha SD33 (sd33:47-55). Solo consta en el código (`BonusResponseSet.cs:43`, `BonusOK.cs:118`).
11. **`BonusResponseSet`** no está del todo "sin usar": es el tipo de `Bonus.RESPONSESet` (`Bonus.cs:20`), pero el parser nunca lo llena. "Primero corregir `ParseSapResponseBonus`" rompería las rutas de `AccountController` (`AccountMethods.cs:83,136`). Hace falta un parser nuevo o aprobación.
12. **Duplicados:** `#ArticulosDetalle` (SP:593-601) **suma** cantidades de otras ventas con el mismo `Mov`/`MovID`; no duplica renglones. El join a `Cxc` (SP:566-568) solo agrega un renglón si el estatus difiere, porque el `GROUP BY` junta los demás. Por esa misma razón, `estatus` podría traer un literal distinto de `PENDIENTE`/`CONCLUIDO`.
13. **`estatus`:** con la derivación propuesta el valor sería siempre `PENDIENTE`. Hay un riesgo explícito de romper la paridad si LAN muestra `CONCLUIDO`.
14. **`articulos`:** el veredicto lo ponía como "no reproducible" mientras la tabla decía PARCIAL. Queda como PARCIAL con tres eslabones sin verificar, y se agrega que la ficha sd36:25 exige `PurchNoC` o un campo equivalente.
15. **`nombreCliente`:** `GetClientMaAsync` no distingue "no encontrado" de "error" (`BusinessPartnerMethods.cs:316-338`). BP05MA no tiene ficha (GUIA §5). `ZB_DATOS_CLIENTE` no sirve para paridad de formato (bp05:166-169). `Cte.Nombre` no hace `RTRIM`.
16. **Citas de GUIA corregidas:** `Ztotal` = SUM(`ZmontoSplit`) está en GUIA:467 (no en :465) y `atraso` 354.32 está en GUIA:465 (no en :466). Las cifras de 9000006302 solo constan en GUIA: no hay respuesta cruda en `CAPTURAS_REALES_APIS.md` (GUIA §2.5; se agrega N3).
17. **`saldoCapital` con EX01:** hace falta una regla para excluir Credilana (fuera de alcance) y seguros, además de `Contable = 1` (ex01:56). Se agrega a N4.
18. **Plan:** `moratorios` ya no fija el filtro "solo pendientes y vencidas", porque sería una regla inventada (GUIA §1.9b); queda provisional hasta N5. El paso NTZ01 debe considerar `@odata.nextLink` y `ConfigureAwait(false)`. La ruta del servicio de seguros puede ser una llave de `Web.config` (§1.3) o una constante, y las dos necesitan aprobación.
19. **"WALLET" en `MAVI - DMZ-SAP.csv:3`:** SD18 no se necesita, pero sí intervienen datos de monedero (`AuxiliarP.Abono`, en la rama Adelanto). SD33 **sí** es relevante, para `liquidaConSolo`; contra lo que dice `marcos_result.json`, no es ajeno a este endpoint.
20. **`03_BusinessMethod.md`**, además de los errores ya listados (`PagoPuntual` e `idCanalVenta` como columnas devueltas, `dd/mm/aa`, la conexión "compartida"): en la línea 153 describe `FnMavi1erVencimPendPagoPP` como "índice de pago puntual", pero devuelve un **importe** redondeado a pesos (PP1:34-44).
21. **Centinela "No tiene facturas":** también lo provoca el timeout de 120 s (`FacturaMethods.cs:38`). En cambio, una falla al abrir la conexión da 500, porque `conn.Open()` está fuera del `try` (`FacturaMethods.cs:39`).

---

## 8. Enlaces

- [[Business Rules Ecommerce]] — sección `POST /credit/getClienteFactura/{cliente}/{factura}` (reglas RABO-4 a RABO-6), que es la pieza hermana.
- [[GUIA_MIGRACION_FABLE]] — §1.4-1.9 (reglas no negociables), §2 (evidencia válida), §6 (caso trabajado `getClienteFactura`: EX01 vs NTZ01), §8.2 (decisiones abiertas), §8.4 (fichas faltantes), §8.5.1 (acoplamiento JWT).
- [[01_DMZ_Controller]] · [[02_LAN_Controller]] · [[03_BusinessMethod]] — análisis previo de este endpoint, en esta misma carpeta.
- Verificación del día: `marcos_result.json` (scratchpad de la sesión, resultados `credit/getClienteSaldo` y `credit/getClienteFactura`).

#migracion #SAP #CreditController #getClienteSaldo #SPCXCSaldosClientesPendiente
