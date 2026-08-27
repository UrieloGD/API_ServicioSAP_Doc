# Mapeo del Metodo: `GET /credit/getCreditAccount/{pAccount}` - Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CreditController.cs`
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecucion

1. Recibe peticion GET en la ruta /credit/getCreditAccount/{pAccount}.
2. Se encontro controlador en LAN. Su rol es recibir la peticion de DMZ y ejecutar el metodo de negocio.
3. Invoca la logica de negocio en ``.

## Interacciones con Base de Datos

**Ninguna directa.**
