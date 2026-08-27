# Mapeo del Método: `POST /customerService/GetSTPAccount` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `GetSTPAccount(GetSTPAccountRequest request)` — Líneas 217–225
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con cuerpo deserializado.
2. Valida nulos, lanza BadRequest si es `null`.
3. Llama a LAN vía `curl.Post("customerService/GetSTPAccount", json)`.
4. Deserializa la respuesta y la retorna.

## Interacciones con Base de Datos

**Ninguna.**
