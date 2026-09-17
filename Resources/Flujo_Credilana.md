# Flujo de Credilana (Préstamo)

Este flujo atiende solicitudes de préstamo en efectivo "Credilana", las cuales conllevan la adhesión de seguros de vida e información de beneficiarios, manejado mediante controladores específicos.

## 1. Endpoints Involucrados
*   **DMZ:** `POST https://[url-dmz]/credit/CreditoWeb_Seguro` (y otros endpoints internos consumiendo operaciones de `SPCREDICredilana`)
*   **LAN:** `POST http://[url-lan]/credit/CreditoWeb_Seguro`

## 2. Request Body (Payload de Ejemplo)

### Endpoint de Seguro de Vida (`CreditoWeb_Seguro`)
Magento envía la información del cliente, monto, y el parentesco del asegurado o beneficiario.

```json
{
  "op": "InsertarSeguro",
  "data": [
    "1",              // [0] (Reservado/No usado)
    "998877",         // [1] IdSolicitud
    "C000123",        // [2] Cliente
    "Gomez",          // [3] Apellido Paterno Beneficiario
    "Perez",          // [4] Apellido Materno Beneficiario
    "Arturo",         // [5] Nombre Beneficiario
    "3312345678",     // [6] Teléfono
    "50",             // [7] Porcentaje (ej. 50%)
    "62800",          // [8] IdMagento
    "SEGU001",        // [9] Articulo (SKU de Seguro)
    "Contado",        // [10] Condición
    "Hijo",           // [11] Parentesco
    "WEB"             // [12] UTMSource
  ]
}
```

## 3. Stored Procedures (SPs) y Parámetros

### `SpCREDICredilanaSeguroDeVida`
Registra la información del beneficiario y el porcentaje asignado para la póliza atada al préstamo.
**Parámetros:**
*   `@Op`: "InsertarSeguro"
*   `@IdSolicitud`: "998877"
*   `@Cliente`: "C000123"
*   `@Paterno`: "Gomez"
*   `@Materno`: "Perez"
*   `@Nombre`: "Arturo"
*   `@Telefono`: "3312345678"
*   `@Procentaje`: 50
*   `@IdMagento`: 62800
*   `@Articulo`: "SEGU001"
*   `@Condicion`: "Contado"
*   `@Parentesco`: "Hijo"
*   `@UTMSource`: "WEB"

### `SPCREDICredilana`
Es el SP multi-propósito central. Dependiendo del `@Op` que se le pase, puede insertar el préstamo, revisar saldos y consultar estatus.
**Parámetros (Varían según la operación, ej. para crear):**
*   `@Op`: (ej. "Insert", "GetAnioMes", etc.)
*   `@Cliente`: Número de cliente
*   `@Nombre`, `@ApellidoPaterno`, `@ApellidoMaterno`
*   `@Val`: (Validación / Importe)
*   `@Uen`: (Unidad de negocio)

## 4. Tablas Afectadas
*   Tablas transaccionales exclusivas de `Credilana` (Préstamos Personales).
*   Tablas de pólizas/seguros atadas a un préstamo de Intelisis.

---

## 5. Resumen Técnico del Flujo

| Elemento | Nombre en el Sistema |
| :--- | :--- |
| **SP Principal (Préstamo General)** | `SPCREDICredilana` |
| **SP Secundario (Seguro de Vida)** | `SpCREDICredilanaSeguroDeVida` |
| **Tablas Afectadas** | Tablas de Préstamos Personales (`Credilana`) y Registro de Pólizas/Seguros |
