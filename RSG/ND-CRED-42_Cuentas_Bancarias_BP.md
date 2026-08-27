# Especificación: ND-CRED-42
**Proyecto:** Mavi
**Descripción:** Crear o consultar las cuentas bancarias asociadas a un Business Partner (BP)

## Contexto Funcional
Publicación de la API estándar para crear, modificar, consultar o eliminar cuentas de banco de un BP en S4.
Esta API es la encargada de manejar lo referente a "Cuenta Clabe STP" en los pagos en línea (Abonos).

## Entidades y Métodos del Servicio Expuesto (S4)
**Entidad Principal:** `API_BUSINESS_PARTNER`
**Navegación / Sub-entidad:** `to_BusinessPartnerBank` (Ej. `A_BusinessPartnerBank`)

| Método | Descripción |
|---|---|
| GET | Consulta de las cuentas de banco de un BP |
| POST | Creación de cuentas de banco de un BP |
| PATCH | Modificación de cuentas de banco de un BP |
| DEL | Eliminar cuentas de banco de un BP |

### Method POST – REQUEST (Crear Cuenta / Datos Bancarios)
**Nodos y Parámetros:**
* `BusinessPartner` (CHAR10): Número de BP (Campo clave)
* `BankIdentification` (CHAR4): ID datos bancarios
* `BankCountryKey` (CHAR3): País/Región de banco
* `BankNumber` (CHAR15): Clave de banco
* `BankControlKey` (CHAR2): Clave control bancos
* `BankAccount` (CHAR18): Nº cuenta bancaria

**Ejemplo de Petición (API Clabe STP Estándar):**
Endpoint AWS referenciado: `https://nibj6m7t0l.execute-api.us-east-1.amazonaws.com/AS_POST_DatosBancarios`
```json
{
    "BusinessPartner": "1500005050",
    "BankIdentification": "0014",
    "BankCountryKey": "MX",
    "BankNumber": "014",
    "BankControlKey": "",
    "BankAccount": "980"
}
```

### Method GET – RESPONSE (Consultar Cuenta)
Este método retorna la consulta de los bancos de un BP almacenados en S4. Puede recibir opciones como `$filter`, `$top`, `$skip`.

**Ejemplo de Response OData de S/4HANA mapeado:**
```json
{
    "d": {
        "results": [
            {
                "__metadata": {
                    "id": "https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartnerBank(BusinessPartner='1500002401',BankIdentification='0001')",
                    "uri": "https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartnerBank(BusinessPartner='1500002401',BankIdentification='0001')",
                    "type": "API_BUSINESS_PARTNER.A_BusinessPartnerBankType"
                },
                "BusinessPartner": "1500002401",
                "BankIdentification": "0001",
                "BankCountryKey": "MX",
                "BankName": "BBVA Bancomer, S.A., Institución de Banca Múltiple, (BBVA)",
                "BankNumber": "012",
                "SWIFTCode": "",
                "BankControlKey": "",
                "BankAccountHolderName": "",
                "BankAccountName": "",
                "ValidityStartDate": "/Date(1760313600000+0000)/",
                "ValidityEndDate": "/Date(253402300799000+0000)/",
                "IBAN": "",
                "IBANValidityStartDate": null,
                "BankAccount": "5614547",
                "BankAccountReferenceText": "",
                "CollectionAuthInd": false,
                "CityName": "",
                "AuthorizationGroup": ""
            }
        ]
    }
}
```

### Estructura General de Respuesta (Return Messages)
Cuando se ejecuta una acción de modificación, creación o borrado, SAP retorna o complementa con un nodo `RETURN` que detalla el resultado de la operación:
* `TYPE`: `S` (Success), `E` (Error), `W` (Warning), `I` (Information)
* `ID`: ID del mensaje en SAP
* `NUMBER`: Número del mensaje
* `MESSAGE`: Texto descriptivo del mensaje de retorno
