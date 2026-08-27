# Mapeo del Método: `Logger.CustomerService()` — Helper de Logs

**Archivo:** `APIMagento/WebApiMagento/Logger.cs`
**Método:** `CustomerService(string title, string message)`
**Capa:** LAN (Nexo)

---

## Flujo de Ejecución
Registra en un archivo físico `.txt` los errores o eventos ocurridos en el flujo del Customer Service.

## Interacciones con Base de Datos
**Ninguna.**

## Puntos de Invocación en el Flujo LoginClienteCreditoFechaN
| Capa | Momento | Parámetros | Efecto |
|---|---|---|---|
| Business Method | En caso de excepción (`catch`) | `"Exception: "`, `e.Message` | Escribe el mensaje de error en el log físico. |
