---
tags: [gantt, migracion, plan, sigmavi, mixtos]
generado: 2026-08-03
fuente: "[[_PLAN_MIGRACION_FECHAS]]"
agente: Nexo
---

# Diagrama de Gantt — Migración LAN → SAP

Orden solicitado: primero lo que conecta directo a **ServicioAndroid / SQLite / SIGMAVI** (no-Intelisis), después lo que **migra de Intelisis a SIGMAVI**, y al final lo **mixto** (Intelisis + otros). Se agregan dos secciones adicionales para que el alcance quede explícito:

- **Habilitadores (Ola 0)**: van primero porque bloquean todo lo demás, sin ser parte de ninguno de los tres grupos.
- **SAP — conexión preparada**: aquí solo aislamos E-50 (el único endpoint que ya apunta a un servicio SAP). Nuestro alcance es dejar el puente listo; la conexión final a los servicios SAP la decide y ejecuta el equipo de SAP, no nosotros.

`crit` (rojo) = bloqueado o en riesgo · `active` = pieza de preparación para SAP.

```mermaid
gantt
    title Plan de Migración LAN → SAP (04 ago – 03 nov 2026)
    dateFormat YYYY-MM-DD
    axisFormat %d %b
    excludes weekends

    section Habilitadores (bloqueantes)
    H-01 conexionSQL AdminDoc        :h01, 2026-08-04, 1d
    H-02 Clase Impersonation         :h02, 2026-08-05, 1d
    H-03 Helper HTTP hacia DMZ       :h03, 2026-08-06, 1d
    H-04 Fix SQLiteDb.DefaultPath    :h04, 2026-08-07, 1d

    section 1. ServicioAndroid / SQLite / SIGMAVI
    E-01 Piloto SendSmsNewNumber     :e01, 2026-08-10, 1d
    E-05 order/getGuide (SQLite)     :e05, 2026-08-14, 1d
    E-06 GetCreditAmounts (SQLite)   :crit, e06, 2026-08-17, 1d
    E-07 guardardocumento (AdminDoc) :e07, 2026-08-18, 1d
    E-08 SaveImagesProductosMx       :e08, 2026-08-19, 1d
    E-09 obtenerQuejas (Android)     :e09, 2026-08-20, 1d
    E-10 bbvaKeyAdvanced (SOAP)      :e10, 2026-08-21, 1d
    E-11 ExistRFCAndPhoneCte         :crit, e11, 2026-08-24, 1d
    E-12 status/getStatus            :e12, 2026-08-25, 1d
    E-13 getCuenta (DMZ→Magento)     :e13, 2026-08-26, 1d
    E-48 setCuenta (DMZ→Magento)     :e14, 2026-08-27, 1d
    E-49 cashCustomerReport (SMB)    :crit, e15, 2026-08-28, 1d
    E-16 GetUnificationWalletStatus  :crit, e20, 2026-09-09, 2026-09-10
    E-21 SetUnificationWalletData    :crit, e21, 2026-09-11, 2026-09-14

    section SAP — conexión preparada
    E-50 SolicitudMercancia → SAP    :active, e16, 2026-08-31, 1d

    section 2. Migración Intelisis → SIGMAVI
    E-02 setCustomerList             :e02, 2026-08-11, 1d
    E-03 getCustomerList             :e03, 2026-08-12, 1d
    E-04 deleteCustomerList          :e04, 2026-08-13, 1d
    E-51 codigoPromocion             :e17, 2026-09-01, 2026-09-02
    E-14 getPlazos (+SAP SD40)       :e18, 2026-09-03, 2026-09-04
    E-15 obtenerTipoGarantia         :crit, e19, 2026-09-07, 2026-09-08

    section 3. Mixtos (Intelisis + otros)
    M-01 validateSms                 :crit, m01, 2026-09-15, 2026-09-18
    M-02 CreditoWeb_SaveData         :crit, m02, 2026-09-21, 2026-09-23
    M-03 CreditoWeb_SaveFirstData    :crit, m03, 2026-09-24, 2026-09-28
    M-04 bitacoraAtencionClientes    :crit, m04, 2026-09-29, 2026-09-30
    M-05 CreditoWeb_FormDatos        :m05, 2026-10-01, 2026-10-07
    M-06 CreditoWeb_Informacion      :m06, 2026-10-08, 2026-10-14
    M-07 SaveCredilanaInfo           :m07, 2026-10-15, 2026-10-19
    M-08 getSms                      :m08, 2026-10-20, 2026-10-21
    M-09 SaveData_Articulos          :m09, 2026-10-22, 2026-10-23
    M-10 CreditoWeb_Seguro           :m10, 2026-10-26, 2026-10-28
    M-11 GetPhoneValidatedClient     :m11, 2026-10-29, 2026-10-30
    M-12 SaveHaztenTransaction       :m12, 2026-11-02, 2026-11-03
```

## Notas de clasificación

- **E-06** depende de M-07 (su tabla SQLite la alimenta un proceso que lee Intelisis) — queda en el grupo 1 porque el endpoint en sí solo toca SQLite, pero el caché se congela si M-07 no se resuelve.
- **E-14** migra a SIGMAVI pero también toca SAP SD40 — se dejó en el grupo 2 porque su tabla de origen/destino es la misma lógica que el resto de la ola SIGMAVI.
- **E-16 / E-21 (Monedero)**: el SP `SpVTASUnificacionMonedero` sigue el patrón de nombres de Intelisis visto en los mixtos, pero el documento no confirma su origen. Los dejé en el grupo 1 de forma provisional — hay que validar con Valentin si en realidad son mixtos y moverlos al grupo 3.
- **Ola 7 (E-50)** es la única pieza que toca SAP directamente hoy. Por el alcance que definiste ("nosotros migramos todo lo no-Intelisis, pero dejamos la conexión lista para SAP"), la aislé como su propia sección — es el entregable que el equipo de SAP debería tomar para conectar sus servicios.
- Los bloqueos reales (🔒) son solo tres: estructura de garantías (E-15, Miguel Marín), definición de monedero (E-16/E-21, Valentin) y el riesgo de alcance de red SMB (E-49) — todos marcados `crit`.

## Pendiente

Faltan por incorporar al Gantt (no traían fecha en el documento fuente, o su fecha es un marcador de posición a definir): ninguno de los 33 endpoints quedó fuera; las fechas de las olas 10–12 están marcadas como "marcador de posición" en el documento origen, sujetas a la decisión de arquitectura sobre los mixtos del grupo A.
