---
proyecto: Mavi
id_requerimiento: BP05
descripcion: Especificación Maestra - Exposición de información de BP a POS (Visualización).
---

# Especificación Maestra: Visualización de Business Partners (BP05)

## 1. Contexto Funcional
Adaptación para la exposición y visualización de Clientes (BP) en SAP S/4HANA hacia el POS y sistemas integrados mediante servicios OData (Vista de CDS). El objetivo es extraer los datos maestros de cliente y exponerlos mediante una API RESTful.

El desarrollo está planteado en dos fases:
1. **Fase 1 (Actual):** Consulta directa de información por ID de BP. Se indica el número de cliente, se extraen todos sus datos y se exponen en la API.
2. **Fase 2 (Futura):** Búsquedas dinámicas. Búsqueda por múltiples criterios que pueda retornar más de un registro o cliente.

## 2. Lógica de Negocio y Estructura de Tablas
Para la visualización, la API consolida información de las siguientes tablas Z (datos adicionales para clientes):
- `Clientes` (`ZSDT_CTE`)
- `Cliente Teléfono` (`ZSDT_CTETEL`)
- `Cliente Contacto` (`ZSDT_CTECTO`)
- `Cliente Contacto Datos de Dirección` (`ZSDT_CTECTO_DIR`)
- `Cliente Contado Datos de Empleo` (`ZSDT_CTECTO_EMPL`)

### A. Depuración y Catálogos Omitidos
- Se **elimina** la tabla de Códigos Postales considerada en versiones anteriores (se usarán campos estándar).
- En las tablas de catálogos se **elimina** el campo `BUT001-PARTNER` como campo llave.
- **NO se va a enviar la información** de las siguientes tablas que son netamente catálogos:
  `ZCTE_VIVE_CALID`, `ZTIPO_CTE`, `ZCTE_CTO_TIPO`, `ZTIPO_BF`, `ZESTATUS_BF`, `ZCONFIG_BF`, `ZTIPO_CALLES`, `ZCTE_CREDITO`, `ZTIPO_DIMA`.

## 3. Información Técnica (Servicio S4)
- **Tipo de servicio**: Sincrónico (OData / GET)
- **Nombre de Objeto S4**: `ZV_DATOS_CLIENTE` (Vista de CDS)
- **Nombre de Artefacto**: `ZB_DATOS_CLIENTE_CDS`

### Entidades y Métodos OData Habilitados
La API soporta potentes capacidades de query OData (`$filter`, `$orderby`, `$top`, `$skip`, `$select`).

| Entidad | Método | Descripción |
| :--- | :--- | :--- |
| `/A_BusinessPartner` | GET | Información general de uno o todos los socios de negocio (proveedor o cliente). |
| `/A_BusinessPartner ('{BusinessPartner}')` | GET | Información general de un socio de negocio específico. |
| `/A_Customer` | GET | Información general de todos los clientes. |
| `/A_Customer ('{Customer}')` | GET | Información general de un cliente específico. |

## 4. Diccionario de Datos (Resumen de Exposición)
*(Nota: El diccionario de datos base para las tablas ZSDT_CTE, ZSDT_CTETEL, ZSDT_CTECTO, ZSDT_CTECTO_DIR y ZSDT_CTECTO_EMPL comparte la misma estructura transaccional definida en la especificación de creación BP01/BP02)*. 

Al consultar el CDS, se proyectarán los campos clave integrados como:
- **Maestro (Cte):** Cliente, RFC/CURP, Nombre Completo, Direcciones, Credito, CRMCantidad, FiscalRegimen, SerieMonedero, ClabeCuenta, NIPVenta, etc.
- **Teléfonos (CteTel):** Lista de teléfonos ligados al BP con su Tipo y estado de Validación.
- **Contactos (CteCto):** Lista de contactos, parentescos y estatus de supervisión.
- **Direcciones y Empleos (CteCtoDireccion / CteCtoEmpleo):** Historial y direcciones relacionadas.

---

> [!TIP]
> **Para los Subagentes ([Oracle] / [Vanguard]):** 
> Al refactorizar el código de consultas en `.NET 4.7.2` (donde anteriormente se hacían `SELECT` a las tablas `Cte` y `CteTel`), ahora deberán ensamblar peticiones `GET` hacia la entidad `/A_BusinessPartner('{id}')` o utilizar la vista CDS `ZB_DATOS_CLIENTE_CDS` mediante el cliente HTTP de CPI, aplicando los filtros `$filter` correspondientes (ej. si se busca por teléfono o correo).

## 5. Estructura de Respuesta (Ejemplo Payload OData/XML)
A continuación se detalla la estructura exacta de la respuesta que arrojará el servicio al consultar la vista CDS `ZB_DATOS_CLIENTE_CDS` para un BP específico.

```xml
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xml:base="https://[URL_S4]/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/">
    <id>https://[URL_S4]/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE(p_num_cliente='0000110276')/Set</id>
    <title type="text">ZB_DATOS_CLIENTESet</title>
    <updated>2024-04-17T19:13:09Z</updated>
    <author>
        <name/>
    </author>
    <link href="ZB_DATOS_CLIENTE(p_num_cliente='0000110276')/Set" rel="self" title="ZB_DATOS_CLIENTESet"/>
    <entry>
        <id>https://[URL_S4]/sap/opu/odata/sap/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTESet(p_num_cliente='110276',BusinessPartner='110276')</id>
        <title type="text">ZB_DATOS_CLIENTESet(p_num_cliente='110276',BusinessPartner='110276')</title>
        <updated>2024-04-17T19:13:09Z</updated>
        <category term="ZB_DATOS_CLIENTE_CDS.ZB_DATOS_CLIENTEType" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"/>
        <link href="ZB_DATOS_CLIENTESet(p_num_cliente='110276',BusinessPartner='110276')" rel="self" title="ZB_DATOS_CLIENTEType"/>
        <link href="ZB_DATOS_CLIENTESet(p_num_cliente='110276',BusinessPartner='110276')/Parameters" rel="http://schemas.microsoft.com/ado/2007/08/dataservices/related/Parameters" type="application/atom+xml;type=entry" title="Parameters"/>
        <content type="application/xml">
            <m:properties xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">
                <d:p_num_cliente>110276</d:p_num_cliente>
                <d:BusinessPartner>110276</d:BusinessPartner>
                <d:ZclienteBp>0000110276</d:ZclienteBp>
                <d:ZentCalles></d:ZentCalles>
                <d:ZantigMeses>0</d:ZantigMeses>
                <d:ZantigAnios>0</d:ZantigAnios>
                <d:Zcurp>XAXX010101000</d:Zcurp>
                <d:Zcredito></d:Zcredito>
                <d:Zprospecto></d:Zprospecto>
                <d:Zagenteserv></d:Zagenteserv>
                <d:Zcreditoesp></d:Zcreditoesp>
                <d:Zcrmimporte>12345678.20</d:Zcrmimporte>
                <d:Zcrmcantidad>12345678.20</d:Zcrmcantidad>
                <d:Zfecha4>0</d:Zfecha4>
                <d:Zusuariopos></d:Zusuariopos>
                <d:ZidTipoCalles></d:ZidTipoCalles>
                <d:ZidestatSup></d:ZidestatSup>
                <d:ZrecomendPor></d:ZrecomendPor>
                <d:ZimporRent>12345678.20</d:ZimporRent>
                <d:ZviveencCal></d:ZviveencCal>
                <d:ZantigNeg>0</d:ZantigNeg>
                <d:ZpartentRec></d:ZpartentRec>
                <d:ZdirRecom></d:ZdirRecom>
                <d:ZserieMon></d:ZserieMon>
                <d:ZlimCred>12345678.20</d:ZlimCred>
                <d:ZidAval></d:ZidAval>
                <d:Zlcaxsi>12345678.20</d:Zlcaxsi>
                <d:ZidMagento>1234567890</d:ZidMagento>
                <d:ZingMensCredw>12345678.20</d:ZingMensCredw>
                <d:ZlimCedDimae>12345678.20</d:ZlimCedDimae>
                <d:ZidTipoDima></d:ZidTipoDima>
                <d:Zirreg></d:Zirreg>
                <d:ZnegBc></d:ZnegBc>
                <d:ZserieMonViu></d:ZserieMonViu>
                <d:Znipventa></d:Znipventa>
                <d:Znipcobro></d:Znipcobro>
                <d:ZreestrucDeud></d:ZreestrucDeud>
                <d:ZclabeCuenta></d:ZclabeCuenta>
                <d:ZlcaxsiMay>12345678.20</d:ZlcaxsiMay>
                <d:ZtipoCredito></d:ZtipoCredito>
                <d:ZcpaxaMay>12345678.20</d:ZcpaxaMay>
                <d:ZingresoTip></d:ZingresoTip>
                <d:Zbanco></d:Zbanco>
                <d:ZctaClabeValid></d:ZctaClabeValid>
                <d:ZfolioPagMay></d:ZfolioPagMay>
                <d:ZvalorPagMay>12345678.20</d:ZvalorPagMay>
                <d:ZapoyoVtaDima>0</d:ZapoyoVtaDima>
                <d:ZidCtaClDisp>1234567890</d:ZidCtaClDisp>
                <d:ZapoyCobr></d:ZapoyCobr>
                <d:ZretApoyCobr></d:ZretApoyCobr>
                <d:ZintSolApoy>0</d:ZintSolApoy>
                <d:ZtotalAsign>0</d:ZtotalAsign>
                <d:ZnivEsp></d:ZnivEsp>
                <d:Zcompania></d:Zcompania>
                <d:ZcodSms>1234567890</d:ZcodSms>
                <d:ZsmsValid></d:ZsmsValid>
                <d:ZfechValid>0</d:ZfechValid>
                <d:ZdoctoValid></d:ZdoctoValid>
                <d:ZidTipoBf></d:ZidTipoBf>
                <d:ZviveCon></d:ZviveCon>
                <d:ZfechCateg>0</d:ZfechCateg>
                <d:ZusuarioIrreg></d:ZusuarioIrreg>
                <d:ZfechaIrreg m:null="true"/>
                <d:ZmotivoIrreg></d:ZmotivoIrreg>
                <d:ZsinBoifBf></d:ZsinBoifBf>
                <d:ZmapLat>12345678901234567890123456789012345678901234567890</d:ZmapLat>
                <d:ZmapLong>12345678901234567890123456789012345678901234567890</d:ZmapLong>
                <d:ZreestDeuda></d:ZreestDeuda>
                <d:ZusValidTarj></d:ZusValidTarj>
                <d:ZidVivEnCalid></d:ZidVivEnCalid>
                <d:Zcita></d:Zcita>
                <d:ZnumPag>1234546789</d:ZnumPag>
                <d:ZfecUltPag m:null="true"/>
                <d:ZtipoCliente></d:ZtipoCliente>
                <d:TipoSocioComercial>1</d:TipoSocioComercial>
                <d:Agrupacion>DDIV</d:Agrupacion>
                <d:ConceptoBusqueda1>ABC</d:ConceptoBusqueda1>
                <d:ConceptoBusqueda2>ABC</d:ConceptoBusqueda2>
                <d:Titulo></d:Titulo>
                <d:Tratamiento></d:Tratamiento>
                <d:PersonaFisica>X</d:PersonaFisica>
                <d:Nombre></d:Nombre>
                <d:Nombre2></d:Nombre2>
                <d:Nombre3></d:Nombre3>
                <d:Nombre4></d:Nombre4>
                <d:PrimerNombre>Antonio</d:PrimerNombre>
                <d:SegundoNombre></d:SegundoNombre>
                <d:PrimerApellido>Romero Aguilar</d:PrimerApellido>
                <d:SegundoApellido></d:SegundoApellido>
                <d:Calle>Calle 5</d:Calle>
                <d:NumExt>39</d:NumExt>
                <d:CompNumInt></d:CompNumInt>
                <d:Calle2></d:Calle2>
                <d:Calle3></d:Calle3>
                <d:Colonia1></d:Colonia1>
                <d:Colonia2></d:Colonia2>
                <d:Municipio></d:Municipio>
                <d:Poblacion>Prueba</d:Poblacion>
                <d:CP>73180</d:CP>
                <d:Pais>MX</d:Pais>
                <d:Region>PUE</d:Region>
                <d:Horario>CSTNO</d:Horario>
                <d:Idioma>ES</d:Idioma>
                <d:ZonaTransporte></d:ZonaTransporte>
                <d:Telefono>5576389213</d:Telefono>
                <d:Exten></d:Exten>
                <d:TelefonoMovil>+525576389213</d:TelefonoMovil>
                <d:Mail></d:Mail>
                <d:InicioValidez>0001-01-01T00:00:00</d:InicioValidez>
                <d:FinValidez>9999-12-31T00:00:00</d:FinValidez>
                <d:GrupoDirecciones>BP</d:GrupoDirecciones>
                <d:DireccionPersonal></d:DireccionPersonal>
                <d:Comentarios></d:Comentarios>
                <d:Sexo></d:Sexo>
                <d:TipoSocioCom></d:TipoSocioCom>
                <d:Masculino>PT13H58M41S</d:Masculino>
                <d:CreadoPor>EXMJARILLO</d:CreadoPor>
                <d:ModificadoPor>EXMJARILLO</d:ModificadoPor>
                <d:ModificadoEl>2024-04-16T00:00:00</d:ModificadoEl>
                <d:ModificadoALas>PT16H59M37S</d:ModificadoALas>
                <d:PersonaFisica2>X</d:PersonaFisica2>
                <d:NumIDFiscal>RAGA840721N28</d:NumIDFiscal>
                <d:SujetoIVA></d:SujetoIVA>
                <d:IDPagos></d:IDPagos>
                <d:Pais2></d:Pais2>
                <d:ClaveBanco></d:ClaveBanco>
                <d:CuentaBancaria></d:CuentaBancaria>
                <d:Ramo></d:Ramo>
                <d:GrupoCuentas>DDIV</d:GrupoCuentas>
                <d:Cliente>0000110276</d:Cliente>
                <d:Sociedad>5510</d:Sociedad>
                <d:CuentaAsociada>0012120000</d:CuentaAsociada>
                <d:ViaPago></d:ViaPago>
                <d:Compensar></d:Compensar>
                <d:CondicionPago></d:CondicionPago>
                <d:GrupoTesoreria></d:GrupoTesoreria>
                <d:AnotarHistorial></d:AnotarHistorial>
                <d:GrupoTolerancia></d:GrupoTolerancia>
                <d:NumCuentaAnt>1234567890</d:NumCuentaAnt>
                <d:PersonaContacto>0000000000</d:PersonaContacto>
                <d:Cliente_f></d:Cliente_f>
                <d:NombrePila></d:NombrePila>
                <d:Nombre_f></d:Nombre_f>
                <d:ConceptoBusqueda></d:ConceptoBusqueda>
                <d:PaisSuministrador></d:PaisSuministrador>
                <d:TipoImpuesto></d:TipoImpuesto>
                <d:ClasFiscalDeudor></d:ClasFiscalDeudor>
                <d:OrgVentas>01</d:OrgVentas>
                <d:CanalDist>01</d:CanalDist>
                <d:Sector>00</d:Sector>
                <d:CreadoPor2>EXMJARILLO</d:CreadoPor2>
                <d:CreadoEl2>2024-04-16T00:00:00</d:CreadoEl2>
                <d:EsquemaClientes>1</d:EsquemaClientes>
                <d:GrupoClientes>01</d:GrupoClientes>
                <d:ZonaVentas>000001</d:ZonaVentas>
                <d:GrupoPrecioCliente></d:GrupoPrecioCliente>
                <d:ListaPrecios></d:ListaPrecios>
                <d:ProbabilidadPedido>100</d:ProbabilidadPedido>
                <d:Incoterms1>CFR</d:Incoterms1>
                <d:Incoterms2>CFR</d:Incoterms2>
                <d:MaxEntregasParc>9</d:MaxEntregasParc>
                <d:PrioridadEntrega>02</d:PrioridadEntrega>
                <d:CuentaDeudor>32556690</d:CuentaDeudor>
                <d:CondicionExpedicion></d:CondicionExpedicion>
                <d:Moneda>MXN</d:Moneda>
                <d:GrupoImpCliente></d:GrupoImpCliente>
                <d:CondPago></d:CondPago>
                <d:CentroSuministrador></d:CentroSuministrador>
                <d:GrupoVendedores></d:GrupoVendedores>
                <d:OficinaVentas></d:OficinaVentas>
                <d:GrupoClientes1></d:GrupoClientes1>
                <d:Cliente_P>0000110276</d:Cliente_P>
                <d:OrgVentas_P>01</d:OrgVentas_P>
                <d:CanalDistribucion_P>01</d:CanalDistribucion_P>
                <d:Sector_P>00</d:Sector_P>
                <d:FuncionSocio>AG</d:FuncionSocio>
                <d:Cliente2>0000110276</d:Cliente2>
                <d:RFC></d:RFC>
                <d:FechaNacimiento m:null="true"/>
                <d:EstadoCivil></d:EstadoCivil>
                <d:Nacionalidad></d:Nacionalidad>
                <d:Ingresos>0.000</d:Ingresos>
                <d:FiscalRegimen></d:FiscalRegimen>
                <d:UsoCFDI></d:UsoCFDI>
                <d:BloqueoCentral></d:BloqueoCentral>
                <d:Indicador></d:Indicador>
                <d:BloqueoPedidoVentas></d:BloqueoPedidoVentas>
                <d:BloqueoPedidoVentasSel></d:BloqueoPedidoVentasSel>
                <d:BloqueoEntregaVentas></d:BloqueoEntregaVentas>
                <d:BloqueoEntregaCliente></d:BloqueoEntregaCliente>
                <d:BloqueoFacturaCliente></d:BloqueoFacturaCliente>
                <d:BloqueoFacturaClienteNC></d:BloqueoFacturaClienteNC>
                <d:PeticionBorradoClienteNC></d:PeticionBorradoClienteNC>
            </m:properties>
        </content>
    </entry>
</feed>
```

## 6. Registro de Errores Nativos SAP (Bloqueos)
### Error TFACD (Falta Calendario de Fábrica)
Al intentar crear un nuevo Business Partner (`POST /partner/client` apuntando a `ZAPI_BP01_PARTNER_SRV`), SAP devuelve el siguiente payload de error nativo, evidenciando una falta de configuración (Calendario de Fábrica) en el ambiente de desarrollo S/4HANA. Este payload es la evidencia técnica entregada a SAP Basis para su resolución:

```json
{
  "to_return": {
    "results": [
      {
        "__metadata": {
          "id": "https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/ReturnSet('')",
          "uri": "https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap/ZAPI_BP01_PARTNER_SRV/ReturnSet('')",
          "type": "ZAPI_BP01_PARTNER_SRV.Return"
        },
        "Salesdocument": null,
        "Type": "E",
        "Id": "00",
        "Number": "058",
        "Message": "Entrada    no existe en TFACD (Verifique la entrada)",
        "LogNo": "",
        "LogMsgNo": "000000",
        "MessageV1": "",
        "MessageV2": "",
        "MessageV3": "",
        "MessageV4": "TFACD",
        "Parameter": "",
        "Row": 0,
        "Field": "",
        "System": ""
      }
    ]
  }
}
```
