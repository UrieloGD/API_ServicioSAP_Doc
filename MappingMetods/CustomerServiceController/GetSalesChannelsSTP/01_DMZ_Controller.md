# Mapeo del Método: `POST /customerService/GetSalesChannelsSTP` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `GetSalesChannelsSTP(GetSalesChannelsSTPRequest request)` — Líneas 228–236
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con cuerpo deserializado a `GetSalesChannelsSTPRequest`.
2. Valida nulos, lanza BadRequest si es `null`.
3. Llama a LAN vía `curl.Post("customerService/GetSalesChannelsSTP", json)`.
4. Deserializa la respuesta de LAN y la envuelve en `Ok(response)`.

## Interacciones con Base de Datos

**Ninguna.**

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]
