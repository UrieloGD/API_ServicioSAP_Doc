---
proyecto: Mavi
id_requerimiento: BP01 / BP02
descripcion: Especificación Maestra Consolidada - Reglas de Negocio, Estructura BP y Diccionario de Datos.
---

# Especificación Maestra: Creación y Modificación de Business Partners (BP)

## 1. Contexto Funcional
Adaptación para creación y modificación de Clientes (BP) en SAP S/4HANA mediante servicios sincrónicos OData, asegurando la integridad de datos maestros y transaccionales desde sistemas legados.

## 2. Lógica de Negocio Obligatoria
### A. Segmentación de Persona (BUT000)
- **Persona Física (NATPERS = X)**: Mapear a `NAME_FIRST`, `NAMEMIDDLE`, `NAME_LAST`, `NAME_LST2`.
- **Persona Moral (NATPERS = Vacío)**: Mapear Razón Social a `NAME_ORG1` al `NAME_ORG4`.

### B. Comportamiento API (`BPartnerSet`)
- **Creación (POST, Partner='')**: Alta en tablas Z + Business Partner SAP.
- **Modificación (POST, Partner<>'')**: Actualización en tablas Z + maestro SAP.

## 3. Diccionario de Datos Consolidado
### Tabla Cte (Maestro)
Campos clave: `Cliente` (PK), `RFC` (sin validación), `Credito` (Obligatorio), `CRMImporte`, `CRMCantidad`, `Fecha4`, `FiscalRegimen`, `SerieMonedero`, `NIPVenta`, `NIPCobro`, `ClabeCuenta`.

### Tablas Z de Detalle (Sub-niveles)
- **CteTel**: Registro de `IdCtetel`, `Tipo` (Movil/Particular), `TraeTelefono` (Flag de optimización).
- **CteCto**: Registro de `IdCteCto`, `Parentesco`, `CteSupervisado`.
- **CteCtoDireccion**: Campos obligatorios: `Calle`, `Colonia`, `Poblacion`, `Estado`, `Pais`, `CodigoPostal`, `Numero`, `TipoCalle` (Específicos para tipo AVAL).
- **CteCtoEmpleo**: Historial laboral, `Ingresos`, `JefeInmediato`, `Direccion`, y toda la sección de `TA` (Trabajo Anterior).

### Depuración de Catálogos
Se eliminan: `BUT001-PARTNER` (como campo llave en catálogos), `ZCTE_VIVE_CALID`, `ZTIPO_CTE`, `ZCTE_CTO_TIPO`, `ZTIPO_BF`, `ZESTATUS_BF`, `ZCONFIG_BF`, `ZTIPO_CALLES`, `ZCTE_CREDITO`, `ZTIPO_DIMA`, y tabla de Códigos Postales.

## 4. Guía de Implementación para Subagentes
- **[Scout]**: Escanear LAN buscando estas tablas Z y validar si el sistema origen las llena.
- **[Oracle]**: Al analizar la lógica de crédito, verificar que `Credito` no esté vacío antes de afectar SAP.
- **[Vanguard]**: El endpoint en `ServicioSAP` debe ser capaz de procesar el JSON plano que contenga todas estas tablas Z en un solo request o bien mediante llamadas encadenadas asegurando atomicidad.
- **[Validator]**: Validar que el RFC no dispare errores de formato y que `CuentaCLABEValidada` sea un campo de solo lectura para la API.

---

# Especificación Técnica Adicional

**Proyecto:** Mavi
**ID Requerimiento:** BP01 / BP02
**Descripción:** API Clientes

## 1. Especificación Funcional

### 1.1 Dependencias
Layout o envío de información para Dato maestro de cliente, transaccionales en SAP y permisos para poder crear y modificar los Clientes (BP) en SAP.

### 1.2 Supuestos
- Definir qué datos deben estar expuestos en la API.
- Las API pueden ser servicios sincrónicos o asincrónicos. 
- Establecer una comunicación segura entre sistemas.

### 1.3 Contexto funcional
**Business partner**: Un socio comercial es una persona física, organización, grupo de personas físicas o grupo de organizaciones en las que una empresa tiene un interés comercial. Un Business Partner representa a un Socio Comercial.

### 1.4 Descripción del requerimiento
Adaptar y publicar una API para Crear y Modificar los datos de BP (Cliente).
Se requiere crear tablas Z para guardar la siguiente información:
- Información de Cliente
- Tabla Z para Cliente Teléfono
- Tabla Z para Cliente Contacto
- Tabla Z para Cliente Contacto Datos de Dirección
- Tabla Z para Cliente Contacto Datos de Empleo
- Tabla Z para datos Vive en Calidad de 
- Tabla Z para datos Tipo de Cliente
- Tabla Z para Cliente Contacto Tipo
- Tabla Z para Tipo BF
- Tabla Z para Estatus de supervisión
- Tabla Z para Configuración BF
- Tabla Z para Tipo Calles
- Tabla Z para Cliente Crédito
- Tabla Z para Tipo DIMA

Se requiere eliminar la tabla Tabla Z para datos de Código Postal, esta tabla se consideraba en las versiones anteriores.

Para las tablas que son catálogos, se elimina el campo número de cliente (BUT001 – PARTNER) debido a que su campo llave es diferente.
Las siguientes tablas son catálogos y no deberán considerarse para crear o modificar campos, de la Api BP01 y BP02:
`ZCTE_VIVE_CALID`, `ZTIPO_CTE`, `ZCTE_CTO_TIPO`, `ZTIPO_BF`, `ZESTATUS_BF`, `ZCONFIG_BF`, `ZTIPO_CALLES`, `ZCTE_CREDITO`, `ZTIPO_DIMA`

Para la Api BP01, se requiere validar el campo `BUT000 – NATPERS` está marcado (que tenga valor), si tiene valor, entonces es Persona física, y se debe grabar el Nombre y Apellidos del siguiente modo:
- Nombre1 -> NAME_FIRST (BUT000)
- Nombre2 -> NAMEMIDDLE (BUT000)
- Apellido1 -> NAME_LAST (BUT000)
- Apellido2 -> NAME_LST2 (BUT000)

En el caso donde no se marque este flag, el cliente a crear es Persona Moral (Organización):
- Nombre 1 -> NAME_ORG1 (BUT000)
- Nombre 2 -> NAME_ORG2 (BUT000)
- Nombre 3 -> NAME_ORG3 (BUT000)
- Nombre 4 -> NAME_ORG4 (BUT000)

## 2. Información Técnica
**Tipo de servicio**: Sincrónico
**Nombre de Objeto S4**: `ZAPI_BP01_PARTNER_SRV`
**Métodos**:
- `BPartnerSet` (POST): Parámetro Partner = ‘ ’, crear BP
- `BPartnerSet` (POST): Parámetro Partner <> ‘ ’, modificar BP

*(Los parámetros de autenticación, URLs, tokens de CPI y S4 han sido omitidos por seguridad según las instrucciones, y el diccionario de datos detallado de tablas como Cte, CteTel, CteCto, CteCtoDireccion y CteCtoEmpleo se encuentra en la versión Excel original, referenciando mapeos de campos base como Cliente, Nombre, ApellidoPaterno, RFC, etc.)*

## 3. Estructura de Petición y Respuesta (Payloads de Integración)

A continuación se detalla la estructura exacta del cuerpo JSON requerido para hacer el `POST` de Creación/Modificación hacia `ZAPI_BP01_PARTNER_SRV`, así como la estructura del XML de respuesta devuelta por SAP.

### Request Body (JSON)
```json
{
    "Partner": "",
    "Type": "",
    "BuGroup": "DDIV",
    "Sort1": "Empresa",
    "Sort2": "Regional",
    "Title": "001",
    "TitleLet": "001",
    "Natpers": "",
    "NameOrg1": "Empresa Regional",
    "NameOrg2": "Mexicana",
    "NameOrg3": "de Ampliación",
    "NameOrg4": "",
    "NameLast": "",
    "NameFirst": "",
    "NameLst2": "",
    "NameLast2": "",
    "Namemiddle": "",
    "Gender": "2",
    "Xsexm": false,
    "Crdat": "",
    "Crtim": "",
    "Marst": "1",
    "Natio": "MX",
    "Xblck": false,
    "NotReleased": false,
    "Street": "Veracruz",
    "HouseNum1": "39",
    "NameCo": "23, 89, 23",
    "StrSuppl1": "",
    "StrSuppl2": "",
    "StrSuppl3": "Santa Catarina",
    "Location": "",
    "City2": "",
    "City1": "Chicontla",
    "PostCode1": "73180",
    "Country": "MX",
    "Region": "HGO",
    "TimeZone": "",
    "Langu": "S",
    "Transpzone": "",
    "TelNumber": "5576389213",
    "TelExtens": "",
    "DateFrom": "20240318",
    "DateTo": "",
    "AddrGroup": "",
    "PersAddr": true,
    "Remark": "",
    "TelnrLong": "",
    "SmtpAddr": "",
    "Stkzn": "X",
    "Stcd1": "VIMR421210IS0",
    "Stkzu": true,
    "Brsch": "",
    "Ktokd": "0110",
    "AufsdKna1": "",
    "LifsdKna1": "",
    "FaksdKna1": "",
    "Bukrs": "5510",
    "Akont": "12120000",
    "Zwels": "T",
    "Xverr": false,
    "ZtermKnb1": "0001",
    "Fdgrv": "A1",
    "Xzver": false,
    "Togru": "",
    "Altkn": "1234567890",
    "VkorgKnvv": "01",
    "VtwegKnvv": "01",
    "SpartKnvv": "00",
    "Ernam": "",
    "Erdat": "20240318",
    "Kalks": "1",
    "Kdgrp": "01",
    "Bzirk": "000001",
    "Konda": "",
    "Pltyp": "",
    "Awahr": "100",
    "Inco1": "CFR",
    "Inco2": "CFR",
    "Antlf": "9",
    "Lprio": "02",
    "Eikto": "32556690",
    "Vsbed": "",
    "Waers": "MXN",
    "Ktgrd": "",
    "ZtermKnvv": "",
    "Vwerk": "",
    "Vkgrp": "",
    "Vkbur": "",
    "Kvgr1": "",
    "AufsdKnvv": "",
    "LifsdKnvv": "",
    "FaksdKnvv": "",
    "Loevm": false,
    "Parnr": "000000100",
    "Namev": "",
    "Name1F": "",
    "Sortl": "",
    "Aland": "MX",
    "Tatyp": "TMX1",
    "Taxkd": "1",
    "VkorgKnvp": "01",
    "VtwegKnvp": "01",
    "SpartKnvp": "00",
    "Parvw": "WE",
    "Kunn2": "",
    "Rfc": "VIMR421210IS0",
    "Banks": "MX",
    "Bankl": "021",
    "Bankn": "1234567890",
    "Bvtyp": "001",
    "Fiscalregimen": "601",
    "Usocfdi": "G01",
    "Anred": "0",
    "Katr1": "1",
    "Katr2": "0",
    "Katr3": "1",
    "Katr4": "1",
    "Katr5": "1",
    "Katr6": "1",
    "Katr7": "1",
    "Katr8": "1",
    "Katr9": "1",
    "Kvgr4": "SI",
    "MoNetInc": "92352.50",
    "IncomeCur": "MXN",
    "toCte": {
        "ZclienteBp": "",
        "ZentCalles": "",
        "ZantigMeses": 0,
        "ZantigAnios": 0,
        "Zcurp": "VIMR421210IS0",
        "Zcredito": "234",
        "Zprospecto": "Empresa2",
        "Zagenteserv": "Agente1",
        "Zcreditoesp": "SI",
        "Zcrmimporte": "130980.00",
        "Zcrmcantidad": "130.00",
        "Zfecha4": "",
        "Zusuariopos": "Usuario1",
        "ZidTipoCalles": "Residencial",
        "ZidestatSup": "",
        "ZrecomendPor": "",
        "ZimporRent": "8000.00",
        "ZviveencCal": "SI",
        "ZantigNeg": 0,
        "ZpartentRec": "",
        "ZdirRecom": "",
        "ZserieMon": "",
        "ZlimCred": "13000.000",
        "ZidAval": "",
        "Zlcaxsi": "0.000",
        "ZidMagento": 0,
        "ZingMensCredw": "0.000",
        "ZlimCedDimae": "0.000",
        "ZidTipoDima": "",
        "Zirreg": "",
        "ZnegBc": "",
        "ZserieMonViu": "",
        "Znipventa": "",
        "Znipcobro": "8634",
        "ZreestrucDeud": "SI",
        "ZclabeCuenta": "09347898721",
        "ZlcaxsiMay": "130000.000",
        "ZcpaxaMay": "130000.000",
        "ZingresoTip": "",
        "Zbanco": "",
        "ZctaClabeValid": "",
        "ZfolioPagMay": "",
        "ZvalorPagMay": "0.00",
        "ZapoyoVtaDima": 0,
        "ZidCtaClDisp": 0,
        "ZapoyCobr": "",
        "ZretApoyCobr": "",
        "ZintSolApoy": 0,
        "ZtotalAsign": 0,
        "ZnivEsp": "",
        "Zcompania": "",
        "ZcodSms": 0,
        "ZsmsValid": "",
        "ZfechValid": "0",
        "ZdoctoValid": "",
        "ZidTipoBf": "",
        "ZviveCon": "",
        "ZfechCateg": "0",
        "ZusuarioIrreg": "",
        "ZfechaIrreg": null,
        "ZmotivoIrreg": "",
        "ZsinBoifBf": "",
        "ZmapLat": "0.00",
        "ZmapLong": "0.00",
        "ZreestDeuda": "",
        "ZusValidTarj": "",
        "ZidVivEnCalid": "",
        "Zcita": "",
        "ZnumPag": "1234546789",
        "ZfecUltPag": null,
        "ZtipoCliente": ""
    },
    "toCteTel": {
        "Partner": "",
        "ZidcteTel": "",
        "ZtipoCte": "",
        "ZtelCte": "5520726371",
        "Zfecha": null,
        "ZenvioNip": false,
        "ZvalTel": false,
        "ZappOrig": "",
        "ZfechaCap": "0000-00-00",
        "ZtelExist": false,
        "ZtraeTel": false,
        "Zintentos": "",
        "ZtipoValid": ""
    },
    "toCteCto": {
        "Partner": "",
        "ZidcteCto": "",
        "ZidcteCtoTipo": "",
        "Znombre": "",
        "Zapellidop": "",
        "Zapellidom": "",
        "ZfechaNac": null,
        "Ztel": "",
        "Zemail": "",
        "Ztratam": "",
        "Zsexo": "",
        "Zparentesco": "",
        "ZestatusSup": "",
        "ZviveCon": "",
        "ZidVivEnCalid": "",
        "ZedoCivil": "",
        "ZcteSupervisado": false,
        "ZtipoInter": "",
        "ZesCasa": false,
        "ZnumCuenta": "",
        "Zconyuge": "",
        "ZenviaBuroCred": false,
        "Zrfc": "",
        "Znacionalidad": "",
        "ZnivelcobrEspContd": "",
        "ZcontactSelVal": false,
        "ZretiroFirmAval": false,
        "Zbenef": ""
    },
    "toCteCtoDireccion": {
        "Partner": "",
        "ZidcteCto": "",
        "ZidcteCtoTipo": "",
        "Zdire": "",
        "Zcolonia": "",
        "Zpobl": "",
        "Zestado": "",
        "Zpais": "",
        "ZcodPostal": "",
        "Znumero": "",
        "ZnumInterno": "",
        "ZtipoCalle": "",
        "ZantigMes": "0000",
        "ZantigAnio": "0000",
        "Zcruces": ""
    },
    "toCteCtoEmpleo": {
        "Partner": "",
        "ZidcteCto": "",
        "Zempresa": "",
        "Zfunciones": "",
        "Zdepto": "",
        "Zantiguedad": null,
        "ZjefeInmed": "",
        "ZpuestoJefInm": "",
        "Zingresos": "0.00",
        "ZperiodIng": "",
        "Zcomprobabl": false,
        "Zdire": "",
        "Zcolonia": "",
        "ZcodPostal": "",
        "Zestado": "",
        "Zcruces": "",
        "Ztel": "",
        "Zextens": "",
        "ZtrabAnt": "",
        "ZtaCp": "",
        "ZtaColonia": "",
        "ZantigMes": "0000",
        "ZantigAnio": "0000",
        "ZnumExt": "",
        "ZnumInt": "",
        "Zpobl": "",
        "Zpais": "",
        "ZtaDire": "",
        "ZtaNumExt": "",
        "ZtaNumInt": "",
        "ZtaEntreCalles": "",
        "ZtaPobl": "",
        "ZtaEdo": "",
        "ZtaPais": "",
        "ZtaTel": "",
        "ZtaExt": "",
        "ZtipoCalle": "",
        "ZtaTipoCalle": "",
        "ZtipoEmpleo": ""
    },
    "toReturn": []
}
```

### Response (XML)
```xml
<?xml version="1.0" encoding="utf-8"?>
<entry xml:base="https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/" xmlns="http://www.w3.org/2005/Atom" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">
    <id>https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/BPartnerSet('110249')</id>
    <title type="text">BPartnerSet('110249')</title>
    <updated>2024-03-18T17:15:50Z</updated>
    <category term="ZAPI_BP01_PARTNER_SRV.BPartner" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>
    <link href="BPartnerSet('110249')" rel="self" title="BPartner"/>
    <link href="BPartnerSet('110249')/toReturn" rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/toReturn" type="application/atom+xml;type=feed" title="toReturn">
        <m:inline>
            <feed xml:base="https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/">
                <id>https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/BPartnerSet('110249')/toReturn</id>
                <title type="text">ReturnSet</title>
                <updated>2024-03-18T17:15:50Z</updated>
                <author>
                    <name/>
                </author>
                <link href="BPartnerSet('110249')/toReturn" rel="self" title="ReturnSet"/>
            </feed>
        </m:inline>
    </link>
    <link href="BPartnerSet('110249')/toCteCtoEmpleo" rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/toCteCtoEmpleo" type="application/atom+xml;type=entry" title="toCteCtoEmpleo">
        <m:inline>
            <entry xml:base="https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/">
                <id>https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/CteCtoEmpleoSet('110249')</id>
                <title type="text">CteCtoEmpleoSet('110249')</title>
                <updated>2024-03-18T17:15:50Z</updated>
                <category term="ZAPI_BP01_PARTNER_SRV.CteCtoEmpleo" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>
                <link href="CteCtoEmpleoSet('110249')" rel="self" title="CteCtoEmpleo"/>
                <content type="application/xml">
                    <m:properties>
                        <d:Partner>110249</d:Partner>
                        <d:ZidcteCto/>
                        <d:Zempresa/>
                        <d:Zfunciones/>
                        <d:Zdepto/>
                        <d:Zantiguedad m:null="true"/>
                        <d:ZjefeInmed/>
                        <d:ZpuestoJefInm/>
                        <d:Zingresos>0.00</d:Zingresos>
                        <d:ZperiodIng/>
                        <d:Zcomprobabl>false</d:Zcomprobabl>
                        <d:Zdire/>
                        <d:Zcolonia/>
                        <d:ZcodPostal/>
                        <d:Zestado/>
                        <d:Zcruces/>
                        <d:Ztel/>
                        <d:Zextens/>
                        <d:ZtrabAnt/>
                        <d:ZtaCp/>
                        <d:ZtaColonia/>
                        <d:ZantigMes>0</d:ZantigMes>
                        <d:ZantigAnio>0</d:ZantigAnio>
                        <d:ZnumExt/>
                        <d:ZnumInt/>
                        <d:Zpobl/>
                        <d:Zpais/>
                        <d:ZtaDire/>
                        <d:ZtaNumExt/>
                        <d:ZtaNumInt/>
                        <d:ZtaEntreCalles/>
                        <d:ZtaPobl/>
                        <d:ZtaEdo/>
                        <d:ZtaPais/>
                        <d:ZtaTel/>
                        <d:ZtaExt/>
                        <d:ZtipoCalle/>
                        <d:ZtaTipoCalle/>
                        <d:ZtipoEmpleo/>
                    </m:properties>
                </content>
            </entry>
        </m:inline>
    </link>
    <link href="BPartnerSet('110249')/toCteCtoDireccion" rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/toCteCtoDireccion" type="application/atom+xml;type=entry" title="toCteCtoDireccion">
        <m:inline>
            <entry xml:base="https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/">
                <id>https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/CteCtoDireccionSet('110249')</id>
                <title type="text">CteCtoDireccionSet('110249')</title>
                <updated>2024-03-18T17:15:50Z</updated>
                <category term="ZAPI_BP01_PARTNER_SRV.CteCtoDireccion" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>
                <link href="CteCtoDireccionSet('110249')" rel="self" title="CteCtoDireccion"/>
                <content type="application/xml">
                    <m:properties>
                        <d:Partner>110249</d:Partner>
                        <d:ZidcteCto/>
                        <d:ZidcteCtoTipo/>
                        <d:Zdire/>
                        <d:Zcolonia/>
                        <d:Zpobl/>
                        <d:Zestado/>
                        <d:Zpais/>
                        <d:ZcodPostal/>
                        <d:Znumero/>
                        <d:ZnumInterno/>
                        <d:ZtipoCalle/>
                        <d:ZantigMes>0000</d:ZantigMes>
                        <d:ZantigAnio>0000</d:ZantigAnio>
                        <d:Zcruces/>
                    </m:properties>
                </content>
            </entry>
        </m:inline>
    </link>
    <link href="BPartnerSet('110249')/toCteCto" rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/toCteCto" type="application/atom+xml;type=entry" title="toCteCto">
        <m:inline>
            <entry xml:base="https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/">
                <id>https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/CteCtoSet('110249')</id>
                <title type="text">CteCtoSet('110249')</title>
                <updated>2024-03-18T17:15:50Z</updated>
                <category term="ZAPI_BP01_PARTNER_SRV.CteCto" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>
                <link href="CteCtoSet('110249')" rel="self" title="CteCto"/>
                <content type="application/xml">
                    <m:properties>
                        <d:Partner>110249</d:Partner>
                        <d:ZidcteCto/>
                        <d:ZidcteCtoTipo/>
                        <d:Znombre/>
                        <d:Zapellidop/>
                        <d:Zapellidom/>
                        <d:ZfechaNac m:null="true"/>
                        <d:Ztel/>
                        <d:Zemail/>
                        <d:Ztratam/>
                        <d:Zsexo/>
                        <d:Zparentesco/>
                        <d:ZestatusSup/>
                        <d:ZviveCon/>
                        <d:ZidVivEnCalid/>
                        <d:ZedoCivil/>
                        <d:ZcteSupervisado>false</d:ZcteSupervisado>
                        <d:ZtipoInter/>
                        <d:ZesCasa>false</d:ZesCasa>
                        <d:ZnumCuenta/>
                        <d:Zconyuge/>
                        <d:ZenviaBuroCred>false</d:ZenviaBuroCred>
                        <d:Zrfc/>
                        <d:Znacionalidad/>
                        <d:ZnivelcobrEspContd/>
                        <d:ZcontactSelVal>false</d:ZcontactSelVal>
                        <d:ZretiroFirmAval>false</d:ZretiroFirmAval>
                        <d:Zbenef/>
                    </m:properties>
                </content>
            </entry>
        </m:inline>
    </link>
    <link href="BPartnerSet('110249')/toCte" rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/toCte" type="application/atom+xml;type=entry" title="toCte">
        <m:inline>
            <entry xml:base="https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/">
                <id>https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/CteSet('110249')</id>
                <title type="text">CteSet('110249')</title>
                <updated>2024-03-18T17:15:50Z</updated>
                <category term="ZAPI_BP01_PARTNER_SRV.Cte" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>
                <link href="CteSet('110249')" rel="self" title="Cte"/>
                <content type="application/xml">
                    <m:properties>
                        <d:ZclienteBp>110249</d:ZclienteBp>
                        <d:ZentCalles/>
                        <d:ZantigMeses>0</d:ZantigMeses>
                        <d:ZantigAnios>0</d:ZantigAnios>
                        <d:Zcurp>ROCA800718S16</d:Zcurp>
                        <d:Zcredito/>
                        <d:Zprospecto/>
                        <d:Zagenteserv/>
                        <d:Zcreditoesp/>
                        <d:Zcrmimporte>0.00</d:Zcrmimporte>
                        <d:Zcrmcantidad>0.00</d:Zcrmcantidad>
                        <d:Zfecha4>0</d:Zfecha4>
                        <d:Zusuariopos/>
                        <d:ZidTipoCalles/>
                        <d:ZidestatSup/>
                        <d:ZrecomendPor/>
                        <d:ZimporRent>0.00</d:ZimporRent>
                        <d:ZviveencCal/>
                        <d:ZantigNeg>0</d:ZantigNeg>
                        <d:ZpartentRec/>
                        <d:ZdirRecom/>
                        <d:ZserieMon/>
                        <d:ZlimCred>0.00</d:ZlimCred>
                        <d:ZidAval/>
                        <d:Zlcaxsi>0.00</d:Zlcaxsi>
                        <d:ZtipoCredito/>
                        <d:ZidMagento>0</d:ZidMagento>
                        <d:ZingMensCredw>0.00</d:ZingMensCredw>
                        <d:ZlimCedDimae>0.00</d:ZlimCedDimae>
                        <d:ZidTipoDima/>
                        <d:Zirreg/>
                        <d:ZnegBc/>
                        <d:ZserieMonViu/>
                        <d:Znipventa/>
                        <d:Znipcobro/>
                        <d:ZreestrucDeud/>
                        <d:ZclabeCuenta/>
                        <d:ZlcaxsiMay>0.00</d:ZlcaxsiMay>
                        <d:ZcpaxaMay>0.00</d:ZcpaxaMay>
                        <d:ZingresoTip/>
                        <d:Zbanco/>
                        <d:ZctaClabeValid/>
                        <d:ZfolioPagMay/>
                        <d:ZvalorPagMay>0.00</d:ZvalorPagMay>
                        <d:ZapoyoVtaDima>0</d:ZapoyoVtaDima>
                        <d:ZidCtaClDisp>0</d:ZidCtaClDisp>
                        <d:ZapoyCobr/>
                        <d:ZretApoyCobr/>
                        <d:ZintSolApoy>0</d:ZintSolApoy>
                        <d:ZtotalAsign>0</d:ZtotalAsign>
                        <d:ZnivEsp/>
                        <d:Zcompania/>
                        <d:ZcodSms>0</d:ZcodSms>
                        <d:ZsmsValid/>
                        <d:ZfechValid>0</d:ZfechValid>
                        <d:ZdoctoValid/>
                        <d:ZidTipoBf/>
                        <d:ZviveCon/>
                        <d:ZfechCateg>0</d:ZfechCateg>
                        <d:ZusuarioIrreg/>
                        <d:ZfechaIrreg m:null="true"/>
                        <d:ZmotivoIrreg/>
                        <d:ZsinBoifBf/>
                        <d:ZmapLat>0.00</d:ZmapLat>
                        <d:ZmapLong>0.00</d:ZmapLong>
                        <d:ZreestDeuda/>
                        <d:ZusValidTarj/>
                        <d:ZidVivEnCalid/>
                        <d:Zcita/>
                        <d:ZnumPag>1234546789</d:ZnumPag>
                        <d:ZfecUltPag m:null="true"/>
                        <d:ZtipoCliente/>
                    </m:properties>
                </content>
            </entry>
        </m:inline>
    </link>
    <link href="BPartnerSet('110249')/toCteTel" rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/toCteTel" type="application/atom+xml;type=entry" title="toCteTel">
        <m:inline>
            <entry xml:base="https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/">
                <id>https://[URL_S4]/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/CteTelSet('110249')</id>
                <title type="text">CteTelSet('110249')</title>
                <updated>2024-03-18T17:15:50Z</updated>
                <category term="ZAPI_BP01_PARTNER_SRV.CteTel" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>
                <link href="CteTelSet('110249')" rel="self" title="CteTel"/>
                <content type="application/xml">
                    <m:properties>
                        <d:Partner>110249</d:Partner>
                        <d:ZidcteTel/>
                        <d:ZtipoCte/>
                        <d:ZtelCte>5520726371</d:ZtelCte>
                        <d:Zfecha m:null="true"/>
                        <d:ZenvioNip>false</d:ZenvioNip>
                        <d:ZvalTel>false</d:ZvalTel>
                        <d:ZappOrig/>
                        <d:ZfechaCap>0000-00-00</d:ZfechaCap>
                        <d:ZtelExist>false</d:ZtelExist>
                        <d:ZtraeTel>false</d:ZtraeTel>
                        <d:Zintentos/>
                        <d:ZtipoValid/>
                    </m:properties>
                </content>
            </entry>
        </m:inline>
    </link>
</entry>
```

### Respuesta Exitosa Comprobada (JSON)
Tras la inyección del parámetro `Perrl = "AM"`, S/4HANA devuelve exitosamente la estructura del socio de negocio recién creado, con su ID asignado en el campo `Partner` y dentro del `toCte.ZclienteBp`.

```json
{
  "Partner": "1500007333",
  "Type": "",
  "BuGroup": "CLIE",
  "Sort1": "",
  "Sort2": "",
  "Title": "",
  "TitleLet": "",
  "Natpers": "X",
  "NameOrg1": "muebles_america",
  "NameOrg2": "",
  "NameOrg3": "",
  "NameOrg4": "",
  "NameLast": "Israel",
  "NameFirst": "Uriel",
  "NameLst2": "",
  "NameLast2": "",
  "Namemiddle": "",
  "Gender": "",
  "Xsexm": false,
  "Crdat": "",
  "Crtim": "",
  "Marst": "",
  "Natio": "",
  "Birthdt": "1998-02-25",
  "Xblck": false,
  "NotReleased": false,
  "Street": "HRTHRTH",
  "HouseNum1": "",
  "NameCo": "",
  "StrSuppl1": "",
  "StrSuppl2": "",
  "StrSuppl3": "",
  "Location": "",
  "City2": "",
  "City1": "",
  "PostCode1": "",
  "Country": "MX",
  "Region": "JAL",
  "TimeZone": "",
  "Langu": "",
  "Transpzone": "",
  "TelNumber": "987654321",
  "TelExtens": "",
  "DateFrom": "",
  "DateTo": "",
  "AddrGroup": "",
  "PersAddr": false,
  "Remark": "",
  "TelnrLong": "987654321",
  "SmtpAddr": "urielVal69@gmail.com",
  "Stkzn": "",
  "Stcd1": "",
  "Stkzu": false,
  "Brsch": "",
  "Ktokd": "",
  "AufsdKna1": "",
  "LifsdKna1": "",
  "FaksdKna1": "",
  "Bukrs": "",
  "Akont": "",
  "Zwels": "",
  "Xverr": false,
  "ZtermKnb1": "",
  "Fdgrv": "",
  "Xzver": false,
  "Togru": "",
  "Altkn": "",
  "VkorgKnvv": "",
  "VtwegKnvv": "",
  "SpartKnvv": "",
  "Ernam": "",
  "Erdat": "",
  "Kalks": "",
  "Kdgrp": "",
  "Bzirk": "",
  "Konda": "",
  "Pltyp": "",
  "Awahr": "000",
  "Inco1": "",
  "Inco2": "",
  "Antlf": "",
  "Lprio": "00",
  "Eikto": "",
  "Vsbed": "",
  "Waers": "",
  "Ktgrd": "",
  "ZtermKnvv": "",
  "Vwerk": "",
  "Vkgrp": "",
  "Vkbur": "",
  "Kvgr1": "",
  "AufsdKnvv": "",
  "LifsdKnvv": "",
  "FaksdKnvv": "",
  "Loevm": false,
  "Parnr": "0000000000",
  "Namev": "",
  "Name1F": "",
  "Sortl": "",
  "Aland": "",
  "Tatyp": "",
  "Taxkd": "",
  "VkorgKnvp": "",
  "VtwegKnvp": "",
  "SpartKnvp": "",
  "Parvw": "",
  "Kunn2": "",
  "Rfc": "",
  "Banks": "",
  "Bankl": "",
  "Bankn": "",
  "Bvtyp": "",
  "Fiscalregimen": "",
  "Usocfdi": "",
  "Perrl": "AM",
  "toCte": {
    "ZclienteBp": "1500007333"
  },
  "to_return": {
    "results": []
  }
}
```
