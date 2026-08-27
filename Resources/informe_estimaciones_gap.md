# Informe de Estimación de Tiempos y Asignación (GAP Crítico - Fase 1)

Este informe detalla el esfuerzo y cronograma proyectado para el desarrollo completo de los endpoints faltantes de la DMZ, contemplando un equipo de **3 Desarrolladores** trabajando en paralelo.

> [!NOTE]
> **Parámetros del Cálculo:**
> *   **Fecha de Inicio:** 29 de Julio de 2026
> *   **Esfuerzo base:** Ajustado con incrementos específicos por revisión del equipo.
> *   **Reglas de Asignación:**
>     *   **Dev 1 (Rápidos):** Asignado a tareas puntuales (originalmente estimadas en 1 día).
>     *   **Dev 2 (Integraciones Locales):** Tareas pesadas (> 1 día) que incluyan bases locales (Android/Sigmavi/SQLite) + balanceo de otras tareas largas.
>     *   **Dev 3 (Core OData):** Resto de tareas pesadas orientadas a SAP.
> *   *Nota: Las proyecciones asumen 1 día laboral = 8 horas. El tiempo total del proyecto está dictado por la **Ruta Crítica** (el desarrollador con mayor carga).*

---

## 📊 1. Desglose y Asignación de Tareas

| Módulo | Endpoint / Desarrollo | Base de Datos (OData/Local) | Asignado a | Optimista | Promedio | Pesimista |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Crédito** | `credit/getSms` | BD Local (Android/Sigmavi) | **Dev 1** | 1 día | 2 días | 3 días |
| **Crédito** | `credit/codigoRecomendado` | BD Local (Sigmavi) | **Dev 1** | 1 día | 2 días | 3 días |
| **Crédito** | `credit/ExistRFCAndPhoneCte` | SAP (BP05) | **Dev 1** | 1 día | 2 días | 3 días |
| **Customer Service** | `bitacoraAtencionClientes` | BD Local (Android/Sigmavi) | **Dev 1** | 1 día | 2 días | 3 días |
| **Customer Service** | `obtenerTipoGarantia` | SAP (SD08) + Android | **Dev 2** | 9 días | 17 días | 30 días |
| **Crédito** | `credit/codigoPromocion` | API Externa (SuccessFactors) | **Dev 2** | 9 días | 17 días | 30 días |
| **Crédito** | `credit/MonederoSaldoCredito` | SAP (SD18) | **Dev 2** | 9 días | 17 días | 30 días |
| **Crédito** | `credit/getPlazos` | SAP (SD40 - Nuevo) | **Dev 3** | 9 días | 17 días | 30 días |
| **Customer Service** | `ApplyPaymentAdvanced` (y Neko) | SAP (ZFICRUD_COBREF_SRV) | **Dev 3** | 9 días | 17 días | 30 días |
| **Customer Service** | `unirCuenta` | SAP (BP05 / ZSDT_CTE) | **Dev 3** | 1 día | 3 días | 6 días |
| **Órdenes** | `order/getPosCancellations` | SAP (SD48) | **Dev 3** | 5 horas | 8 horas | 2 días |
| **Órdenes** | `order/GetPickUpCode` | BD Local (Sigmavi) | **N/A** | Sin Estimar | Sin Estimar | Sin Estimar |

---

## 📈 2. Resumen Total y Ruta Crítica

Al paralelizar el trabajo entre 3 desarrolladores, el tiempo de entrega del proyecto se define por el tiempo del desarrollador con la carga más pesada (**Ruta Crítica**).

### Carga por Desarrollador
*   **Dev 1:** 12 días pesimista *(Finalizará sus tareas durante la tercera semana)*.
*   **Dev 2:** 90 días pesimista *(Determina la Ruta Crítica del proyecto)*.
*   **Dev 3:** ~68 días pesimista.

> [!IMPORTANT]
> **Duración del Proyecto (Basada en la Ruta Crítica del Dev 2):**
> *   **Tiempo Optimista Paralelizado:** 27 días laborales.
> *   **Tiempo Promedio Paralelizado:** 51 días laborales.
> *   **Tiempo Pesimista Paralelizado:** 90 días laborales.
>
> *(Si no hubiera paralelización, la suma secuencial de todas las tareas sería de 170 días pesimista).*

### Proyección de Fechas (A partir del 29 de Julio de 2026)

*Calculado considerando semanas de 5 días laborales.*

| Escenario | Días Laborales | Fecha Estimada de Finalización |
| :--- | :---: | :--- |
| 🟢 **Escenario Optimista** | 27 días | ~ 04 de Septiembre de 2026 |
| 🟡 **Escenario Promedio** | 51 días | ~ 09 de Octubre de 2026 |
| 🔴 **Escenario Pesimista** | 90 días | ~ 02 de Diciembre de 2026 |

---

## 🗺️ 3. Diagramas de Esfuerzo Paralelizado (Gantt)

*Los siguientes diagramas ilustran la ejecución simultánea de los 3 desarrolladores bajo cada escenario. Las tareas de gran magnitud (asignadas al Dev 2 y Dev 3) han sido seccionadas en sus fases constructivas (1. Controladores, 2. DTOs y Mapeos, 3. Wrappers OData).*

### 🟢 Escenario Optimista (27 Días Laborables)

```mermaid
gantt
    title Cronograma de Ejecución - Optimista
    dateFormat  YYYY-MM-DD
    
    section Dev 1 (Rápidos)
    getSms                  : active, d1_1, 2026-07-29, 1d
    codigoRecomendado       : d1_2, after d1_1, 1d
    ExistRFCAndPhoneCte     : d1_3, after d1_2, 1d
    bitacoraAtencion        : d1_4, after d1_3, 1d
    
    section Dev 2 (Locales/Android)
    Garantia (1. Controladores) : active, d2_g1, 2026-07-29, 1d
    Garantia (2. DTOs)          : d2_g2, after d2_g1, 3d
    Garantia (3. Wrappers)      : d2_g3, after d2_g2, 5d
    CodPromo (1. Controladores) : d2_p1, after d2_g3, 1d
    CodPromo (2. DTOs)          : d2_p2, after d2_p1, 3d
    CodPromo (3. Wrappers)      : d2_p3, after d2_p2, 5d
    Monedero (1. Controladores) : d2_m1, after d2_p3, 1d
    Monedero (2. DTOs)          : d2_m2, after d2_m1, 3d
    Monedero (3. Wrappers)      : d2_m3, after d2_m2, 5d
    
    section Dev 3 (Core OData)
    getPlazos (1. Controladores): active, d3_pl1, 2026-07-29, 1d
    getPlazos (2. DTOs)         : d3_pl2, after d3_pl1, 3d
    getPlazos (3. Wrappers)     : d3_pl3, after d3_pl2, 5d
    PayAdv (1. Controladores)   : d3_pa1, after d3_pl3, 1d
    PayAdv (2. DTOs)            : d3_pa2, after d3_pa1, 3d
    PayAdv (3. Wrappers)        : d3_pa3, after d3_pa2, 5d
    unirCuenta                  : d3_u, after d3_pa3, 1d
    getPosCancellations         : d3_c, after d3_u, 5h
```

### 🟡 Escenario Promedio (51 Días Laborables)

```mermaid
gantt
    title Cronograma de Ejecución - Promedio
    dateFormat  YYYY-MM-DD
    
    section Dev 1 (Rápidos)
    getSms                  : active, d1_1, 2026-07-29, 2d
    codigoRecomendado       : d1_2, after d1_1, 2d
    ExistRFCAndPhoneCte     : d1_3, after d1_2, 2d
    bitacoraAtencion        : d1_4, after d1_3, 2d
    
    section Dev 2 (Locales/Android)
    Garantia (1. Controladores) : active, d2_g1, 2026-07-29, 3d
    Garantia (2. DTOs)          : d2_g2, after d2_g1, 6d
    Garantia (3. Wrappers)      : d2_g3, after d2_g2, 8d
    CodPromo (1. Controladores) : d2_p1, after d2_g3, 3d
    CodPromo (2. DTOs)          : d2_p2, after d2_p1, 6d
    CodPromo (3. Wrappers)      : d2_p3, after d2_p2, 8d
    Monedero (1. Controladores) : d2_m1, after d2_p3, 3d
    Monedero (2. DTOs)          : d2_m2, after d2_m1, 6d
    Monedero (3. Wrappers)      : d2_m3, after d2_m2, 8d
    
    section Dev 3 (Core OData)
    getPlazos (1. Controladores): active, d3_pl1, 2026-07-29, 3d
    getPlazos (2. DTOs)         : d3_pl2, after d3_pl1, 6d
    getPlazos (3. Wrappers)     : d3_pl3, after d3_pl2, 8d
    PayAdv (1. Controladores)   : d3_pa1, after d3_pl3, 3d
    PayAdv (2. DTOs)            : d3_pa2, after d3_pa1, 6d
    PayAdv (3. Wrappers)        : d3_pa3, after d3_pa2, 8d
    unirCuenta                  : d3_u, after d3_pa3, 3d
    getPosCancellations         : d3_c, after d3_u, 1d
```

### 🔴 Escenario Pesimista (90 Días Laborables)

```mermaid
gantt
    title Cronograma de Ejecución - Pesimista
    dateFormat  YYYY-MM-DD
    
    section Dev 1 (Rápidos)
    getSms                  : active, d1_1, 2026-07-29, 3d
    codigoRecomendado       : d1_2, after d1_1, 3d
    ExistRFCAndPhoneCte     : d1_3, after d1_2, 3d
    bitacoraAtencion        : d1_4, after d1_3, 3d
    
    section Dev 2 (Locales/Android)
    Garantia (1. Controladores) : active, d2_g1, 2026-07-29, 6d
    Garantia (2. DTOs)          : d2_g2, after d2_g1, 12d
    Garantia (3. Wrappers)      : d2_g3, after d2_g2, 12d
    CodPromo (1. Controladores) : d2_p1, after d2_g3, 6d
    CodPromo (2. DTOs)          : d2_p2, after d2_p1, 12d
    CodPromo (3. Wrappers)      : d2_p3, after d2_p2, 12d
    Monedero (1. Controladores) : d2_m1, after d2_p3, 6d
    Monedero (2. DTOs)          : d2_m2, after d2_m1, 12d
    Monedero (3. Wrappers)      : d2_m3, after d2_m2, 12d
    
    section Dev 3 (Core OData)
    getPlazos (1. Controladores): active, d3_pl1, 2026-07-29, 6d
    getPlazos (2. DTOs)         : d3_pl2, after d3_pl1, 12d
    getPlazos (3. Wrappers)     : d3_pl3, after d3_pl2, 12d
    PayAdv (1. Controladores)   : d3_pa1, after d3_pl3, 6d
    PayAdv (2. DTOs)            : d3_pa2, after d3_pa1, 12d
    PayAdv (3. Wrappers)        : d3_pa3, after d3_pa2, 12d
    unirCuenta                  : d3_u, after d3_pa3, 6d
    getPosCancellations         : d3_c, after d3_u, 2d
```

---

## 📝 4. Notas y Bloqueos (Zonas Grises)

*   **`order/GetPickUpCode` (Recoger en Tienda):** Esta tarea se mantiene marcada como **Sin Estimar** y no ha sido asignada a ningún desarrollador. Actualmente, el área de procesos no nos ha proporcionado la definición del proceso, API o flujo final para la generación de la **clave venta** (el código o PIN de seguridad utilizado por el cliente para recoger mercancía en tienda). Hasta no contar con la definición funcional o la interfaz a consumir, esta tarea se mantendrá en pausa.
