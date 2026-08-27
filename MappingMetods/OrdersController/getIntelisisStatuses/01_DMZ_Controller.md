# Mapeo del Metodo: `POST /order/getIntelisisStatuses` - Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs`
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecucion

1. Recibe peticion POST en la ruta /order/getIntelisisStatuses.
2. Se encontro controlador en DMZ. Su rol es recibir la peticion POST y llamar a LAN.

## Interacciones con Base de Datos

**Ninguna directa.**
