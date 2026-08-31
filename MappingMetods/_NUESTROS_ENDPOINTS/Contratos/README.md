---
tags: [contratos, endpoints, migracion, indice]
actualizado: 2026-08-31
---

# Contratos de endpoints — Migración LAN → SAP

Una ficha por partida migrada: qué recibe en el body, qué responde en cada código HTTP, y
cómo viaja esa respuesta de vuelta al cliente a través de la DMZ.

Las fichas se generan al **probar** una partida, no al escribirla — documentan lo que el
endpoint hace de verdad, no lo que el código promete. Las produce la skill
`probar-ola-e2e`; ver [[CHECKLIST_MIGRACION_LAN_A_SAP]] para el estado de cada partida.

## Por qué existe esta carpeta

El consumidor real de estos endpoints no habla con ServicioSAP directamente: habla con
`APIMagentoDMZ`, que reenvía y **transforma** la respuesta. Hoy conviven dos patrones en
la DMZ — uno devuelve el objeto deserializado, el otro devuelve un string recortado — y no
son intercambiables. Sin esto escrito por endpoint, quien integra descubre la diferencia
en producción.

## Índice

| Partida | Endpoint | Ola | Cutover DMZ | Ficha |
|---|---|---|---|---|
| E-01 | `credit/SendSmsNewNumber` | 1 | ✅ subido (`c7d1d29`), sin desplegar | [[E-01_SendSmsNewNumber]] |
| E-02 | `customer/setCustomerList` | 2 | ✅ subido (`740669e`), sin desplegar | [[E-02_setCustomerList]] |
| E-03 | `customer/getCustomerList` | 2 | ✅ subido (`740669e`), sin desplegar | [[E-03_getCustomerList]] |
| E-04 | `customer/deleteCustomerList` | 2 | ✅ subido (`740669e`), sin desplegar | [[E-04_deleteCustomerList]] |
| E-05 | `order/getGuide` | 3 | ✅ subido (`fa4034e`), sin desplegar | [[E-05_getGuide]] |
| E-06 | `credit/GetCreditAmounts` | 3 | ✅ subido (`fa4034e`), sin desplegar | [[E-06_GetCreditAmounts]] |
| E-07 | `credit/guardardocumento` | 4 | ✅ subido (`d933e44`), sin desplegar | [[E-07_guardardocumento]] |
| E-08 | `credit/SaveImagesProductosMx` | 4 | ✅ subido (`d933e44`), sin desplegar | [[E-08_SaveImagesProductosMx]] |
| E-09 | `customerService/obtenerQuejas` | 5 | ✅ subido (`c695b2e`), sin desplegar | [[E-09_obtenerQuejas]] |
| E-10 | `customerService/bbvaKeyAdvanced` | 5 | ✅ subido (`c695b2e`), sin desplegar | [[E-10_bbvaKeyAdvanced]] |
| E-11 | `customer/getCuenta` | 6 | — sin cutover, va hacia la DMZ | [[E-11_getCuenta]] |
| E-12 | `customer/setCuenta` | 6 | — sin cutover, va hacia la DMZ | [[E-12_setCuenta]] |
| E-13 | `customer/cashCustomerReport` | 6 | ✅ subido (`e403065`), sin desplegar | [[E-13_cashCustomerReport]] |
| E-14 | `product/obtenerImagen` | 6 | — sin cutover, no existe en la DMZ | [[E-14_obtenerImagen]] |
| E-15 | `order/GetPickUpCode` | 7 | 🔴 **no aplicar todavía** — dejaría sin clave a todos los pedidos | sin ficha; ver [[FLUJO_RECOGER_EN_SUCURSAL]] |

> Todos los cutovers están subidos a `dbAndroid` desde el 31 ago. **Ninguno desplegado**, y
> el orden cuando toque es **ServicioSAP primero, la DMZ después**.

## Flujos completos

Cuando una partida es una pieza de algo más grande, el flujo entero va aparte:

| Flujo | Cubre | Partidas |
|---|---|---|
| [[FLUJO_RECOGER_EN_SUCURSAL]] | los seis procesos del código de recogida, sus tablas y equivalencias en SIGMAVI y SAP | E-15 y cinco partidas de Dev 2 |
| [[FLUJO_GETAPIKEY]] | obtención de la llave de Multipagos | E-10 |

## Los dos patrones de la DMZ, uno al lado del otro

La Ola 3 dejó el ejemplo más nítido de por qué esta carpeta existe. Dos endpoints hermanos,
probados el mismo día, entregan cosas distintas al cliente:

| | E-05 `order/getGuide` | E-06 `credit/GetCreditAmounts` |
|---|---|---|
| Código en la DMZ | `Json(curl.Post(...))` | `Ok(curl.Post(...).Trim('"'))` |
| Lo que recibe el cliente | JSON **escapado dentro de un string** | un **string** con el JSON ya sin comillas |
| Hay que deserializar | dos veces | una vez |
| Convención de llaves | `PascalCase` | `snake_case` |

Ninguna de las dos es la correcta: son dos costumbres que convivieron en el legado. La
migración las conserva tal cual.

## Convenciones

- Nombre de archivo: `<partida>_<metodo>.md` — ej. `E-01_SendSmsNewNumber.md`.
- Los ejemplos de request/response llevan datos reales de la prueba, con lo sensible
  sustituido. **Nunca credenciales, tokens ni teléfonos de clientes.**
- "Cutover DMZ" indica si la DMZ ya apunta a ServicioSAP (`PostSAP`) o sigue yendo al
  legado (`Post`). Una partida puede estar probada y aún no conmutada.
