# Guía Rápida: Nueva Estructura Hoppscotch 🚀

¡Hola equipo! Hemos optimizado nuestra Colección de Hoppscotch para ServicioSAP y DMZ.
El objetivo es **eliminar el desorden de cientos de carpetas duplicadas** y hacer que las pruebas sean instantáneas sin importar si apuntan a su máquina Local, a la DMZ o a Stage.

## ¿Qué cambió?
Ya **no existen** las carpetas raíz separadas por servidor (`LocalHost SAP`, `LocalHost DMZ`, `StageSAP`). 

Todo se unificó en un solo súper-árbol de carpetas llamado:
👉 **`🌟 Endpoints ServicioSAP / DMZ (Unified)`**

Aquí adentro encontrarán todas nuestras peticiones intactas (`SD01`, `DM01`, `TZ01`, etc.), con los payloads que ya conocen para **VIU** y **MA**.

## ¿Cómo cambio de Servidor ahora?

En lugar de buscar la carpeta "Stage" o "Local", ahora usamos la funcionalidad nativa de **Entornos (Environments)** de Hoppscotch. Todas las peticiones usan la variable dinámica `<<SAPLocal>>`.

Para cambiar de servidor, solo sigan 2 pasos:

1. **Importen los Entornos:** Asegúrense de tener creados los siguientes entornos globales (o impórtenlos desde el workspace compartido):
   - 🟢 `SAP Local` (SAPLocal: `https://localhost:44399/`)
   - 🔵 `SAP DMZ` (SAPLocal: `https://localhost:44302/`)
   - 🟡 `SAP Stage` (SAPLocal: `https://kdll3fhcyo-lan.grupomavi.com/SAP/`)
   - 🟣 `SAP Directo (CPI)` (SAPLocal: `https://sap-cpi-qa...`)

2. **Seleccionen el Entorno en la UI:**
   - En la esquina superior derecha de Hoppscotch, hagan clic en el menú desplegable que dice "No Environment" (o el entorno actual).
   - Elijan a qué servidor le quieren pegar (Ej. `SAP DMZ`).
   - ¡Listo! Al dar *Send* a cualquier petición, Hoppscotch inyectará mágicamente la URL de DMZ.

---
> [!tip] Ventaja Principal
> Si mañana desarrollamos un endpoint nuevo, ya no tendrán que crearlo 3 veces. Solo lo agregan al súper-árbol unificado y automáticamente estará listo para probarse en todos los entornos.
