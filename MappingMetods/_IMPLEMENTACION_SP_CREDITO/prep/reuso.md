

## metodos

[
 {
  "nombre": "CreditMethods.IsValidatedAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\CreditMethods.cs:230-260",
  "firma_verbatim": "public static async Task<bool> IsValidatedAsync(string cliente)",
  "que_hace": "1) new BusinessPartnerMethods().GetClientAsync(cliente) (ZB_DATOS_CLIENTE_CDS). 2) telefonoSap = partner.TelefonoMovil ?? partner.ztelCte ?? partner.Telefono ?? \"\" y Regex.Replace(\"[^0-9]\",\"\"). Si vacio -> false. 3) telefonoSms = await ObtenerNumeroTablaSmsAsync(cliente) (copia privada de CreditMethods). 4) return !string.IsNullOrEmpty(telefonoSms) && telefonoSap == telefonoSms. catch -> Logger.SAP(\"[CREDIT IsValidated ERROR] \", ex.Message); return false.",
  "notas": "Clase CreditMethods es `public class CreditMethods` con TODOS los metodos static (namespace ServicioSap.Methods.Credit). NO tiene llamadores en el proyecto (grep: solo la definicion). Se contradice con el comentario de OrderMethods.cs:609-616 que dice que ZB_DATOS_CLIENTE_CDS NO trae zvalTel y ztelCte llega vacio; por eso OrderMethods usa BP05MA (GetClientMaAsync). Dos implementaciones con el mismo nombre y distinto tipo de retorno (bool vs string) y distinta fuente SAP.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "OrderMethods.IsValidatedAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:621-650",
  "firma_verbatim": "private async Task<string> IsValidatedAsync(string cliente)",
  "que_hace": "new BusinessPartnerMethods().GetClientMaAsync(cliente) (ZAPI_BP05MA_SRV con $expand). Toma partnerMa?.To_CteTel?.Results y devuelve el ZtelCte del primer BusinessPhone con: t.Zvaltel && !IsNullOrWhiteSpace(t.ZappOrig) && !IsNullOrWhiteSpace(t.ZtelCte) && string.Equals(t.ZtipoCte, \"MOVIL\", OrdinalIgnoreCase). Si no hay -> \"\". catch -> Console.WriteLine(\"Error IsValidated() => \"...); return \"\".",
  "notas": "Es la replica del WHERE legado `Tipo='Movil' AND ValidacionTel=1 AND AppOrigen registrado` (SP_CREDITO_WEB_DATOS.sql:186-202). Llamada en OrderMethods.cs:1880 con sDatosPedido[36] (= infoCliente.cuenta segun ToArray :288). Privada de instancia: la clase nueva NO puede llamarla; debe copiar la logica (usa GetClientMaAsync que SI es publico).",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "CreditMethods.ObtenerNumeroTablaSmsAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\CreditMethods.cs:262-295",
  "firma_verbatim": "private static async Task<string> ObtenerNumeroTablaSmsAsync(string cliente)",
  "que_hace": "conexionSQL.obtenerConexionAndroidAsync(); SQL por string.Format: SELECT TOP 1 Telefono FROM TcAAEA00030_EnvioMensajes WITH(NOLOCK) WHERE IdRegistro IN (SELECT IdCodigoVerificacioneCommerce FROM VTASDCodigoVerificacioneCommerce CV WITH(NOLOCK) WHERE CV.Cliente = '{0}') ORDER BY Id DESC. CommandTimeout=99999. ExecuteReaderAsync; si !HasRows -> \"\". catch -> Logger.SAP(\"[CREDIT ObtenerNumeroTablaSms ERROR] \"); return telefono.",
  "notas": "Privado. Ver seccion duplicados: la copia de OrderMethods usa OTRO join. El SP original (SP_CREDITO_WEB_DATOS.sql:205-208) usa `WHERE Cliente = @cliente ORDER BY Id DESC`, sin join a VTASDCodigoVerificacioneCommerce: NINGUNA de las dos copias replica el SP tal cual.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.ObtenerNumeroTablaSmsAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:579-603",
  "firma_verbatim": "private async Task<string> ObtenerNumeroTablaSmsAsync(string cliente)",
  "que_hace": "conexionSQL.obtenerConexionAndroidAsync(); sqlConnection.CreateCommand(); CommandText = \"SELECT TOP 1 LTRIM(RTRIM(T.Telefono)) FROM TcAAEA00030_EnvioMensajes T WITH(NOLOCK) INNER JOIN VTASDCodigoVerificacioneCommerce V WITH(NOLOCK) ON V.Telefono = T.Telefono WHERE V.Cliente = @Cliente ORDER BY T.Id DESC\"; CommandTimeout=99999; Parameters.Add(\"@Cliente\", SqlDbType.VarChar).Value = cliente ?? string.Empty; ExecuteScalarAsync; return result?.ToString() ?? \"\". catch -> Console.WriteLine; return \"\".",
  "notas": "Privado de instancia. Parametrizado (mejor que la copia de CreditMethods). Llamado en OrderMethods.cs:1879 con sDatosPedido[36]. Join por V.Telefono: el INSERT de VTASDCodigoVerificacioneCommerce en CreditMethods.cs:201-204 NO escribe columna Telefono (solo Cliente, Codigo, IdCarrito, FechaRegristro, FechaExpira, Estatus); no esta verificado en este repo que la tabla tenga columna Telefono.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.HasValidPhoneOriginSAPAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:658-677",
  "firma_verbatim": "private async Task<bool> HasValidPhoneOriginSAPAsync(string cliente)",
  "que_hace": "new BusinessPartnerMethods().GetClientAsync(cliente); if partner==null -> false; return partner.zvalTel && !string.IsNullOrWhiteSpace(partner.zappOrig). catch -> Console.WriteLine; false.",
  "notas": "CODIGO MUERTO: sin llamadores (grep solo encuentra la definicion). Ademas, por el propio comentario de OrderMethods.cs:609-614, ZB_DATOS_CLIENTE_CDS no expone zvalTel -> Partner.zvalTel siempre false -> este metodo siempre devuelve false. Equivale al bloque SP_CREDITO_WEB_DATOS.sql:186-191 (@ValidacionOrigen). Si se necesita, la fuente correcta es BP05MA to_CteTel (BusinessPhone.Zvaltel/ZappOrig).",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.ProcessCreditPaymentAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:682-802",
  "firma_verbatim": "private async Task<string> ProcessCreditPaymentAsync(OrderRequest order, string[] datosArray, List<string> articulos, string numeroValidado, string numeroDelSms, bool isValidated)",
  "que_hace": "cuentaBp = order.infoCliente?.cuenta; idClienteMagento = order.infoCliente?.cliente; esClienteNuevo = cuenta vacia && cliente no vacio; esInvitado = ambos vacios -> throw \"Los invitados no pueden pagar con crédito.\". Si !esClienteNuevo: CheckClientCreditAsync(cuentaBp) o throw (CheckClientBalanceAsync comentado :701-703). Lada: ladaDeDos = {\"33\",\"55\",\"81\"}; telAux = numeroDelSms ?: numeroValidado ?: infoCliente.telefono ?: \"0\"; ladaLength = 2 o 3; ladaValidar/telefonoValidar por Substring. idSolicitud = CrearSolicitudCreditoAsync(order, datosArray, ladaValidar, telefonoValidar); <=0 -> throw. InsertCreditArticlesAsync(order, articulos.ToArray(), idSolicitud.ToString(), condicion, codigoPostal) en try/catch que solo loguea (Logger.SAP \"[CREDITO ARTICULOS ERROR] \"). codigo_promotor -> HandlePromoCodeAsync(codigoPromotor, order.incrementId, \"Elimina\"). Bloque liberador comentado (:760-792). return esClienteNuevo ? idClienteMagento : cuentaBp.",
  "notas": "Parametro isValidated NO se usa dentro del metodo. Llamado en OrderMethods.cs:1883 dentro del bloque metodoPago == CREDIT_METHOD (\"omnipro_pago_credito\") :1869-1891, que devuelve OrderResponse{Resultado=\"Concluido\", Zctefinal=cuentaCredito, Zidecomm=incrementId}. Formato de `articulos`: \"cantidad,sku\" y \"costoEnvio,SEGU00001\" (:1871-1877).",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.CrearSolicitudCreditoAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:862-932",
  "firma_verbatim": "private async Task<int> CrearSolicitudCreditoAsync(OrderRequest order, string[] datosArray, string ladaValidar, string telefonoValidar)",
  "que_hace": "HOY es la llamada al SP: new SqlCommand(\"SP_CREDITO_WEB_DATOS\", cnn) { CommandType = CommandType.StoredProcedure } sobre obtenerConexionAndroidAsync(). 38 Parameters.Add (:873-910): @Id=0, @Op=\"Insert\", @apellido_p/@apellido_m/@nombre (info.*ClienteMavi), @fecha_nacimiento=\"\", @rfc=\"\", @sexo=\"\", @email=info.correo, @direccion, @exterior=numExt, @interior=numInt, @entre_calles=\"\", @codigo_postal, @delegacion=municipio, @poblacion=municipio, @estado, @colonia, @estado_civil=\"\", @articulo=\"\", @uen (VIU=2 else 1), @condicion=articulos.First().condicion, @cliente=info.cuenta, @utmSource, @sucursal (uen==2?505:504), @origen=\"PRODUCTOS MX\", @idMagento=incrementId??\"0\", @MetodoEnvio, @lada_particular=\"0\", @telefono_particular=\"0\", @lada_celular=\"0\", @telefono_celular=ValidateOnlyNumbers(info.telefono), @sucursalDestino, @RedimirMonedero (Money), @ValidacionTelefono=DBNull.Value, @OrigenIdMagento, @LadaValidar, @TelefonoValidar. SqlDataAdapter.Fill (sincrono); devuelve int.TryParse(ds.Tables[0].Rows[0][0]). catch -> Console.WriteLine; return 0.",
  "notas": "datosArray se recibe pero NO se usa en el cuerpo. Este es el metodo que la migracion sustituye. El SP declara 68 parametros (SP_CREDITO_WEB_DATOS.sql:92-159); los no enviados quedan NULL/default. @ValidacionTelefono lo pisa el SP en :210-221.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.CheckClientCreditAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:804-817",
  "firma_verbatim": "private async Task<bool> CheckClientCreditAsync(string cliente)",
  "que_hace": "new BusinessPartnerMethods().GetClientAsync(cliente); return partner != null && !string.IsNullOrEmpty(partner.BusinessPartner). catch -> Console.WriteLine(\"Error CheckClientCredit: \"); false.",
  "notas": "Solo valida EXISTENCIA del BP en ZB_DATOS_CLIENTE_CDS, no que tenga credito activo (a pesar del mensaje de :699). GetClientAsync lanza excepcion si no hay resultados -> cae al catch -> false.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.CheckClientBalanceAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:819-840",
  "firma_verbatim": "private async Task<decimal> CheckClientBalanceAsync(string cliente)",
  "que_hace": "new BusinessPartnerMethods().GetClientAsync(cliente); decimal.TryParse(partner.Zcrmimporte?.ToString(), out balance) -> balance; si no 0m. catch -> 0m.",
  "notas": "Su unica llamada esta COMENTADA (OrderMethods.cs:701-703). Zcrmimporte es string en Partner.cs:20. No hay evidencia en el repo de que Zcrmimporte sea el saldo disponible.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.InsertCreditArticlesAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:946-1107",
  "firma_verbatim": "private async Task InsertCreditArticlesAsync(OrderRequest order, string[] articulos, string idSolicitud, string condicion, string codigoPostal)",
  "que_hace": "Valida articulos e idSolicitud (int > 0). orgVentas = DeterminarSalesOrg(order) (\"04\" MA / \"05\" VIU). condicionSap = await GetCondicionAsync(condicion, order.storeId) (CondicionesCredVtaLinea en SigMavi) con fallback a la original. Conexion obtenerConexionAndroidAsync (ya abierta). INSERT parametrizado: INSERT INTO MAVIANDROID01.ServicioAndroid.dbo.VTASdArtCreditoWeb (IdArtCreditoWeb, cantidad, articulo, precio, Orden, Abono, costo) VALUES (@IdCredito, @Cantidad, @Articulo, @Precio, @Orden, @Abono, @Costo). Por cada \"cantidad,sku\": si sku == \"SEGU00001\" -> precio = articulosTemp[0], cantidad 1, abono 12.0f; si no -> precio/abono desde _preciosMethods.GetFinalListProperBySkuAsync(sku) (cache por SKU) filtrando pr.SalesOrg == orgVentas y pr.Condition == condicionSap (fallback condicion, fallback FirstOrDefault); Price -> precio, Installment -> abono. costo siempre 0. Salta SKUs repetidos consecutivos (prevArt). Propaga excepcion; si insertados==0 -> throw.",
  "notas": "codigoPostal se recibe y NO se usa. Depende de campo de instancia _preciosMethods (FinalListProperMethods, creado en el ctor :82) y de los privados DeterminarSalesOrg (:330) y ValidateOnlyNumbers; GetCondicionAsync SI es public static (:3423). Inserta directo en tabla, NO ejecuta SpVTASInsertArtSolCreditoLinea (doc XML :936 lo cita como equivalente legado).",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.GetCondicionAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:3423-3455",
  "firma_verbatim": "public static async Task<string> GetCondicionAsync(string condicionMagento, string storeId)",
  "que_hace": "obtenerConexionSigMaviAsync(); SELECT TOP 1 Condicion FROM CondicionesCredVtaLinea WITH (NOLOCK) WHERE CondicionMagento = @CondicionMagento AND REPLACE(TiendaVirtual, ' ', '_') = @StoreId (parametrizado). Si vacio o error -> PaymentConditionCatalog.GetSapPaymentCode(condicionMagento). Error -> Logger.SAP(\"[ORDER GetCondicion ERROR] \").",
  "notas": "Traduce condicion Magento (\"12 M VIU P INM\") a condicion interna. Public static: llamable como ServicioSap.Methods.Order.OrderMethods.GetCondicionAsync(...).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "OrderMethods.HandlePromoCodeAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:1112",
  "firma_verbatim": "public async Task<string> HandlePromoCodeAsync(string codigo, string idMagento = null, string operacion = \"ValidarCupon\")",
  "que_hace": "Valida/quema cupon en VentasCupones (SigMavi). Si codigo vacio -> \"OK\". Usado desde ProcessCreditPaymentAsync :752 con operacion \"Elimina\" cuando infoCliente.codigo_promotor no es vacio.",
  "notas": "Publico de instancia; OrderMethods() tiene ctor sin parametros que solo crea ProductMethods y FinalListProperMethods (:79-83), sin estado externo: `new OrderMethods().HandlePromoCodeAsync(...)` compila. D8 del diseno marca codigo recomendador como DEPRECADO; ojo que esto es cupon/promotor, no CodigoRecomendador.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "OrderMethods.ValidateOnlyNumbers",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:308-312",
  "firma_verbatim": "private string ValidateOnlyNumbers(string input)",
  "que_hace": "if IsNullOrWhiteSpace -> string.Empty; return Regex.Replace(input, \"[^0-9]\", \"\").",
  "notas": "Privado. CreditMethods usa inline Regex.Replace(x, \"[^0-9]\", \"\") (CreditMethods.cs:119, 241, 250). La clase nueva debe hacer lo mismo inline o declarar su propio helper.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.DeterminarSalesOrg",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:330-341",
  "firma_verbatim": "private string DeterminarSalesOrg(OrderRequest order)",
  "que_hace": "Si order.salesOrg no vacio -> lo devuelve; si storeId contiene \"viu\" (OrdinalIgnoreCase) -> \"05\"; else \"04\".",
  "notas": "Privado. Comentario :328: 'Unico punto de verdad: no duplicar este calculo en otros metodos', pero al ser private la clase nueva no puede llamarlo. Mismo mapeo en BusinessPartnerMethods.BuildClientFromCustomerRequest :436-455.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "OrderMethods.ToArray",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Order\\OrderMethods.cs:198-292",
  "firma_verbatim": "private string[] ToArray(OrderRequest order)",
  "que_hace": "Aplana OrderRequest en string[] de 38 elementos. Indices relevantes: [1]=infoCliente.cliente o \"0\", [17]=codigoPostal, [20]=estado, [21]=telefono solo digitos, [26..28]=nombre/apellidos ClienteMavi, [29]=correo, [36]=infoCliente.cuenta, [37]=RedimirMonedero.",
  "notas": "Privado. DEFECTO: OrderMethods.cs:1899 `string codigoPostal = sDatosPedido[20]; // Índice DirCP` pero [20] es estado; codigoPostal es [17]. Comentario :741 dice 'ToArray produce 39 elementos' pero produce 38 (indices 0-37). La clase nueva debe leer del modelo OrderRequest/InfoClienteRequest, no de indices.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "BusinessPartnerMethods.GetClientAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:27-69",
  "firma_verbatim": "public async Task<Partner> GetClientAsync(string clientId)",
  "que_hace": "GET Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL) + $\"/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter=BusinessPartner eq '{clientId}'&$top=1&sap-client=110&$format=json\" con TokenGenerator.CreateClientS4(); deserializa SapResponse -> root.d.results -> List<Partner>; si Count<=0 throw \"No se encontraron clientes\"; return partner[0]. catch -> throw new Exception($\"Ocurrio un error al intentar obtener el listado de clientes: {e.Message}\").",
  "notas": "Clase `public class BusinessPartnerMethods` SIN campos ni ctor: instancia sin estado, se usa `new BusinessPartnerMethods()` en controllers y en OrderMethods/CreditMethods. Patron base de GET OData del proyecto (HttpRequestMessage + Accept + SendAsync + ConfigureAwait(false) + check <html).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "BusinessPartnerMethods.GetClientMaAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:297-340",
  "firma_verbatim": "public async Task<BusinessPartnerMa> GetClientMaAsync(string partnerId, string client = \"110\")",
  "que_hace": "GET .../ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='{partnerId}',Client='{client}')?$expand=to_CteTel,to_CteDomicilio,to_CteSociedad,to_CtePersonalAdr,to_CteContacto,to_CteCliente,to_CteDatosComerciales,to_Cte,to_CtePersonaContacto,to_CteDatosBancarios,to_CteFuncInterlocutor,to_CteImpuestos&sap-client={client}&$format=json. Deserializa BusinessPartnerMaResponse (System.Text.Json) y devuelve root.Data; si null throw \"No se encontro informacion del cliente en BP05MA\".",
  "notas": "Fuente correcta de telefonos validados (To_CteTel.Results -> BusinessPhone.Zvaltel/ZappOrig/ZtelCte/ZtipoCte) y de datos Cte (To_Cte -> BusinessCte). Usado por OrderMethods.IsValidatedAsync :626 y GetWholesaleCustomerNameAsync :914.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "BusinessPartnerMethods.SubmitClientInfoAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:74-156",
  "firma_verbatim": "public async Task<Client> SubmitClientInfoAsync(Client newClient)",
  "que_hace": "url = obtenerUrl(...) + \"/ZAPI_BP01_PARTNER_SRV/BPartnerSet?sap-client=110\"; serviceUrl = ... + \"/ZAPI_BP01_PARTNER_SRV/?sap-client=110&sap-language=ES\". apiService = TokenGenerator.CreateClientS4(); csrfToken = await TokenGenerator.GetTokenSapAsync(apiService, serviceUrl). JsonSerializer.Serialize(newClient, DefaultIgnoreCondition = WhenWritingNull). Logger.SAP(\"[SAP BP REQUEST] \"). POST con StringContent UTF8 application/json, headers Accept y X-CSRF-Token. Logger.SAP(\"[SAP BP RESPONSE] \"). Deserializa SapSingleResponse -> root.d -> Client. Comentado el EnableBpCombinationAsync (:116-146). catch -> throw \"Ocurrio un error al intentar enviar la informacion del cliente: ...\".",
  "notas": "Crea (Partner=\"\") o actualiza (Partner con valor) via POST al mismo endpoint. Usado en BusinessPartnerController.cs:47,68 y OrderMethods.cs:2701 (CreatePartnerNumberFromOrderAsync valida created.Partner). Patron de escritura OData del proyecto (CSRF fetch + POST).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "BusinessPartnerMethods.BuildClientFromCustomerRequest",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:415-765",
  "firma_verbatim": "public Client BuildClientFromCustomerRequest(CustomerRequest customer)",
  "que_hace": "Arma el payload Client completo para BP01 con defaults fijos: BuGroup=\"CLIE\", Sort1/Sort2=\"ABC\", Natpers=\"X\", NameOrg1 = \"viu\"|\"muebles_america\" segun storeCode, Gender=MapGender, Marst=\"1\", Natio=\"MX\", Birthdt=FormatDateSap (yyyyMMdd), Street/NameCo=address, City2=\"\", Region=\"JAL\", Country=\"MX\", Langu=\"S\", TelNumber/TelnrLong=phone, SmtpAddr=email, Stkzn=\"X\", Stcd1=\"XAXX010101000\", Ktokd=\"0110\", Bukrs=\"5510\", Altkn=\"1234567890\", VkorgKnvv/VkorgKnvp=\"04\"|\"05\", VtwegKnvv/VtwegKnvp=\"01\", SpartKnvv/SpartKnvp=\"00\", Kalks=\"1\", Awahr=\"100\", Antlf=\"0\", Lprio=\"02\", Vsbed=\"01\", Waers=\"MXN\", Ktgrd=\"01\", Kvgr4=\"SI\", Parnr=\"000000100\", Aland=\"MX\", Tatyp=\"TMX1\", Taxkd=\"1\", Parvw=\"WE\", Perrl=\"AM\"; toCte (todos los 72 campos inicializados, ZidMagento=ParseMagentoId), toCteTel {ZtipoCte=\"MOVIL\", ZtelCte=movil, ZvalTel=false, ZappOrig=\"\"}, toCteCto {ZidcteCto=\"1\", ZidcteCtoTipo=\"20\"}, toCteCtoDireccion {ZidcteCto=\"1\", Zpais=\"MX\"}, toCteCtoEmpleo, to_return = new ToReturnResults{results = new List<ToReturnResponse>()}.",
  "notas": "Publico de instancia. Calcula nacimientoOdata con FormatDateSapOData (:429) pero NO lo usa en el objeto (variable muerta). No usa customer.cp (comentario :457-459). Es la unica plantilla existente de como se llena Client/Cte/CteTel: la clase nueva debe imitar estos valores fijos, no inventar otros.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "BusinessPartnerMethods.FormatDateSapOData",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:813-827",
  "firma_verbatim": "private static string FormatDateSapOData(string dateValue)",
  "que_hace": "if IsNullOrWhiteSpace -> null; DateTime.TryParse -> epochMs = new DateTimeOffset(DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc)).ToUnixTimeMilliseconds(); return $\"/Date({epochMs})/\"; else null.",
  "notas": "Privado. Hermanos privados en la misma clase: `private static string FormatDateSap(string dateValue)` :798 (devuelve yyyyMMdd), `private static string MapGender(string gender)` :777 (H/HOMBRE/MASCULINO/1 -> \"1\"; M/MUJER/FEMENINO/2 -> \"2\"; otro -> \"3\"), `private static int ParseMagentoId(string idMagento)` :767. La clase nueva debe copiarlos o pedir que se hagan internal/public.",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "BusinessPartnerMethods.LinkMagentoAccountAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:833-873",
  "firma_verbatim": "public async Task<string> LinkMagentoAccountAsync(UnirCuentaRequest request)",
  "que_hace": "Valida partner_id e id_magento>0 (ArgumentException). serviceUrl = obtenerUrl(...) + \"/ZSDT_CTE_ODATA_SRV/\"; patchUrl = serviceUrl + $\"ZSDT_CTE_ENTITYSet(ZclienteBp='{request.partner_id}')\". CreateClientS4 + GetTokenSapAsync(apiService, serviceUrl). payload anonimo { ZidMagento = request.id_magento }. HttpRequestMessage(new HttpMethod(\"PATCH\"), patchUrl) con Accept y X-CSRF-Token. Logger.SAP request/response. !IsSuccess -> throw. return \"Cuenta vinculada exitosamente en SAP\".",
  "notas": "UNICO ejemplo de PATCH en el proyecto (D10 del diseno: todo parcial va por PATCH). Usa entidad ZSDT_CTE_ENTITYSet con clave ZclienteBp. Usado en BusinessPartnerController.cs:89.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "BusinessPartnerMethods.GetConsultaAnexosAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:875-905",
  "firma_verbatim": "public async Task<List<AnexosResult>> GetConsultaAnexosAsync(string valorAnexo)",
  "que_hace": "GET $\"{baseUrl}/ZQBC_CODEMSTRD_SRV/WACODEMSTRDSet?$filter=ZcodeProgram eq '{valorAnexo}'&$format=json&sap-client=110\" con CreateClientS4().GetAsync; deserializa con Newtonsoft AnexosResponse -> jsonResponse?.D?.Results ?? new List<AnexosResult>(). catch -> Logger.SAP(\"[BusinessPartnerMethods GetConsultaAnexosAsync ERROR] \") y rethrow.",
  "notas": "Es el acceso al 'code master' (WACODEMSTRDSet filtrado por ZcodeProgram). El MD del diseno menciona un `GetCodeMasterAsync`: NO EXISTE en el codigo; el equivalente real es este metodo. Usado en BusinessPartnerController.cs:206.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "BusinessPartnerMethods.GetFilterClientsAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\BusinessPartner\\BusinessPartnerMethods.cs:249-291",
  "firma_verbatim": "public async Task<List<Partner>> GetFilterClientsAsync(string sapFilter)",
  "que_hace": "Igual que GetClientAsync pero con $filter libre: .../ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter={sapFilter}&sap-client=110&$format=json; devuelve la lista; si vacia throw \"No se encontraron clientes\".",
  "notas": "Util para buscar BP por ZidMagento u otro campo del CDS. Otros publicos de la clase: EnableBpCombinationAsync(BpCombinationRequest) :202 (POST a URL_BP_API/AC_POST_HabilitaCombinacionBP), GetSuccessFactorEmployeeAsync :342, GetCustomerSalesChannelsAsync :377 (SD52), GetWholesaleCustomerNameAsync :910, TestCreateClientRawAsync :158.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "WalletMethods.GetCatalogoConfiguracionAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Wallet\\WalletMethods.cs:28-61",
  "firma_verbatim": "private async Task<List<CatalogoConfiguracion>> GetCatalogoConfiguracionAsync(string nombreCatalogo)",
  "que_hace": "using (new HttpClient()) GET $\"{awsBaseUrl.TrimEnd('/')}/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO={Uri.EscapeDataString(nombreCatalogo)}\"; si OK parsea JsonDocument: si objeto con propiedad \"value\" -> deserializa valueElement; si array -> deserializa root; devuelve List<CatalogoConfiguracion> (namespace ServicioSap.Models.SAP, archivo Models\\SAP\\WalletCustomer\\CatalogoConfiguracion.cs). Error -> Console.WriteLine y lista vacia.",
  "notas": "PRIVADO: la clase nueva NO puede llamarlo. awsBaseUrl viene del ctor: ConfigurationManager.AppSettings[\"AwsBaseUrl\"] ?? \"https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/\" (WalletMethods.cs:19). Alternativa publica: ProductMethods.GetConfiguracionCatalogoAsync (abajo).",
  "reutilizable_desde_clase_nueva": "no-es-private"
 },
 {
  "nombre": "ProductMethods.GetConfiguracionCatalogoAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\MaterialManagement\\ProductMethods.cs:708-735 (url en :711)",
  "firma_verbatim": "public async Task<List<ConfiguracionCatalogo>> GetConfiguracionCatalogoAsync(string nombreCatalogo)",
  "que_hace": "var url = AWS_BASE_URL + $\"AI_GET_CatalogoConfiguracion?NOMBRECATALOGO={nombreCatalogo}\"; apiService = TokenGenerator.CreateClientExternal() (sin Basic de S4); GET con Accept json; si !IsSuccess o vacio throw; resultado = JsonSerializer.Deserialize<List<ConfiguracionCatalogo>>(responseContent); return resultado ?? new List. catch -> throw new Exception($\"Error catálogo {nombreCatalogo}. URL: {url}. Detalle: {e.Message}\").",
  "notas": "AWS_BASE_URL = `private static readonly string AWS_BASE_URL = ConfigurationManager.AppSettings[\"AwsBaseUrl\"];` (:28) SIN fallback y SIN TrimEnd: depende de que Web.config traiga la barra final (Web.config:28 la trae). No escapa nombreCatalogo (los nombres traen espacios). Deserializa SOLO el formato array; la version de WalletMethods tolera tambien {\"value\":[...]}. Modelo ConfiguracionCatalogo (Models\\Ecommerce\\AlmacenesConfig.cs:65, namespace ServicioSap.Models.Ecommerce) es copia campo a campo de CatalogoConfiguracion. Clase ProductMethods: instancia sin ctor explicito, `new ProductMethods()`.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "ProductMethods.GetProductsStockAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\MaterialManagement\\ProductMethods.cs:100-128",
  "firma_verbatim": "public async Task<List<Stock>> GetProductsStockAsync()",
  "que_hace": "GET obtenerUrl(...) + \"/ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia?sap-client=110&$format=json&sap-language=ES&$expand=to_lotes,to_series&$inlinecount=allpages&$top=&$skip=&$filter=&$select=&$orderby=\" -> SapResponse -> List<Stock>. Sin filtro: trae TODO el stock.",
  "notas": "Usado en EcommerceMethods.cs:52 para carga masiva. Para credito (por SKU/planta) usar las variantes con filtro.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "ProductMethods.GetFilterProductsStockAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\MaterialManagement\\ProductMethods.cs:170-200",
  "firma_verbatim": "public async Task<List<Stock>> GetFilterProductsStockAsync(string filter)",
  "que_hace": "DIM11 con $filter libre: .../ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia?sap-client=110&$format=json&sap-language=ES&$filter={filter} -> List<Stock>.",
  "notas": "filter se concatena sin escapar.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "ProductMethods.GetStockAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\MaterialManagement\\ProductMethods.cs:206-244",
  "firma_verbatim": "public async Task<List<Stock>> GetStockAsync(string material = null, string plant = null, string storageLoc = null)",
  "que_hace": "Construye filtros `Material eq '{material}'`, `Plant eq '{plant}'`, `StorageLoc eq '{storageLoc}'` unidos con \" and \" y llama DIM11 (.../zcds_dim11_existencia?sap-client=110&$format=json&sap-language=ES{filterQuery}). Devuelve List<Stock> (Stock.UnrestrictedUseStock es string).",
  "notas": "Es la variante que usa OrderMethods.ValidarStockArticulos (:2122: GetStockAsync(material: articulo.sku, plant: plant)). Tambien existe GetSerialStockAsync(string material=null, string plant=null, string storageLoc=null, string serialNumber=null) :250 con $expand=to_series.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "FinalListProperMethods.GetFinalListProperBySkuAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\SalesDistribution\\FinalListProperMethods.cs:82-110",
  "firma_verbatim": "public async Task<List<FinalListProper>> GetFinalListProperBySkuAsync(string sku)",
  "que_hace": "GET obtenerUrl(...) + $\"/ZAPI_PROPRELIST_SRV/PropreListSet?sap-language=ES&sap-client=110&$format=json&$filter=Articulo%20eq%20'{sku}'\" con CreateClientS4 -> SapResponse -> List<FinalListProper> (SD29). catch -> throw \"Ocurrio un error al intentar obtener el listado de precios por SKU: ...\".",
  "notas": "Clase `public class FinalListProperMethods` sin estado (`new FinalListProperMethods()`). Hermanos: `public async Task<List<FinalListProper>> GetFinalListProperByUenAndBranchAsync(string uen, string Branch)` :19 ($filter=CDistr eq '0{uen}' and Sucursal eq '00{Branch}') y `public async Task<List<FinalListProper>> GetFinalListProperByUenAsync(string uen)` :52 ($filter=CDistr eq '{uen}'). Modelo FinalListProper (Models\\SAP\\SalesDistribution\\FinalListProper.cs, SIN namespace, global): Item(Articulo), Condition(Condicion), Branch(Sucursal), Offer(Oferta), Price(Precio), Installment(Abono), DitributionChannel(CDistr), SalesOrg(OrgVtas), List(Lista), RefPrice(Precioref), SuperPromo(Superpromo).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "CreditMethods.GetCondicionesPagoAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\CreditMethods.cs:297-349",
  "firma_verbatim": "public static async Task<List<CondicionPagoResult>> GetCondicionesPagoAsync(string filter = null)",
  "que_hace": "baseUrl = obtenerUrl(ENVIROMENT_DEV, SERVICE_URL).Replace(\"/odata/sap\", \"/odata4/sap\"); zapiCondpago = AppSettings[\"ZAPI_CONDPAGO\"] (throw si falta; se le antepone \"/\" si no lo trae); s4Url = $\"{baseUrl.TrimEnd('/')}{zapiCondpago}?sap-client=110&sap-language=ES\" + opcional $\"&$filter={filter}\". GET con CreateClientS4; Newtonsoft CondicionPagoResponse -> Value ?? lista vacia. catch -> throw \"Error intentando obtener las condiciones de pago (SD40): ...\".",
  "notas": "OData V4 (SD40). Usado en GetPlazosAsync :18, CreditController.cs:138 y en OrderMethods.cs:2344 (bloque comentado). Web.config:89 ZAPI_CONDPAGO=/zsb_sd40_condpago/srvd_a2x/sap/zsd_sd40_condpago/0001/zapi_... (Zestatus == \"A\" = activa, Zdiasgracia, Zterm).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "DocumentMethods.GuardarDocumentoAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\DocumentMethods.cs:58-~215",
  "firma_verbatim": "public async Task<object> GuardarDocumentoAsync(BodyImagenBase64 bodyMultipart)",
  "que_hace": "switch(TipoDoc) fija IdFoto/Formato (13->10/PDF, 14->1/IMG, 19->2, 23->10/IMG, 104->4, 80/170->6/IMG, 99-103->0/PDF, 166->10/PDF, default Formato=IMG). bdoc = Convert.FromBase64String. escliente = Cliente.StartsWith(\"15\") && Length <= 10 (adaptado a BP). conexionSQL.obtenerConexionAdminDocAsync(); SQL IF @Opcion='Cliente' INSERT MAVI_DOC_CTE(TIPO_DOC, CLAVE, DIR, AVAL, FECHA, DOCUMENTO, ESTATUS, ID_EXTERNO, IDAPLICACION, FORMATO, ID_FOTO, UsuarioCarga) ... IDAPLICACION=24 / 'Token' / 'Actualizar' (inalcanzable). Parametros @Opcion,@Documento(VarBinary),@Tipo,@Cliente,@IdExterno=idVenta,@Formato,@Aval,@IdFoto,@GuidCliente=\"\",@Usuario. Devuelve anonimo { Success, Message }.",
  "notas": "Clase `public class DocumentMethods` de instancia sin estado (`new DocumentMethods()` en CreditController.cs:101). Tambien SaveImagesProductosMxAsync(SaveImagesRequest). Escribe en ADMINDOC (Web.config connectionString), no en Android.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "CreditMethods.SendSmsNewNumberAsync (unico INSERT en TcAAEA00030_EnvioMensajes)",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\CreditMethods.cs:117-156 (INSERT en :137-141)",
  "firma_verbatim": "public static async Task<Dictionary<string, int>> SendSmsNewNumberAsync(SendSmsNewNumberRequest request)",
  "que_hace": "request.NumeroTelefono = Regex.Replace(..., \"[^0-9]\", \"\"). obtenerConexionAndroidAsync(). idRef = GetIdRefAsync(Cliente, IdCarrito) (SELECT ISNULL(MAX(IdCodigoVerificacioneCommerce),'') FROM VTASDCodigoVerificacioneCommerce WHERE Cliente AND IdCarrito); si \"0\" o vacio -> InsertCodigoVerificacionAsync (INSERT VTASDCodigoVerificacioneCommerce (Cliente, Codigo, IdCarrito, FechaRegristro, FechaExpira, Estatus) VALUES (@Cliente, RIGHT('000000' + CAST(ABS(CHECKSUM(NEWID())) % 1000000 AS VARCHAR(6)), 6), @IdCarrito, GETDATE(), DATEADD(MINUTE, 2, GETDATE()), 1)). Si idRef vacio -> {\"result\",-1}. idMensaje = !EsCredito ? 60 : 23; identificador = !EsCredito ? \"DM0312\" : \"DM0363\". INSERT verbatim: string.Format(@\"INSERT INTO TcAAEA00030_EnvioMensajes (IdRegistro, IdMensaje, Cliente, FechaEnvio, EstatusEnvio, ClienteF, Tipo, IntentoRespuesta, IntentoEnvio, Modem, Identificador, Telefono) VALUES ({0}, {1}, '{2}', GETDATE(), 1, NULL, 0, 0, 0, NULL, '{3}', '{4}')\", idRef, idMensaje, request.Cliente, identificador, request.NumeroTelefono); CommandTimeout=9999999; return {\"result\", recordsAffected}. catch -> Logger.SAP(\"[CREDIT SendSmsNewNumber ERROR] \"); {\"result\",-1}.",
  "notas": "UNICO punto del proyecto que inserta en TcAAEA00030_EnvioMensajes (grep). Helpers privados: `private static async Task<string> GetIdRefAsync(string cliente, string idCarrito, conexionSQL conexionHelper)` :158 y `private static async Task<string> InsertCodigoVerificacionAsync(string cliente, string idCarrito, conexionSQL conexionHelper)` :191 (no reutilizables por private). El INSERT principal va por string.Format sin parametros (patron heredado). Expuesto en CreditController POST credit/SendSmsNewNumber. Modelo SendSmsNewNumberRequest {Cliente, NumeroTelefono, IdCarrito, EsCredito}.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "CreditMethods.GetPlazosAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\CreditMethods.cs:13-115",
  "firma_verbatim": "public static async Task<PlazosResponse> GetPlazosAsync()",
  "que_hace": "GetCondicionesPagoAsync() + consultas a CondicionesCredVtaLinea (SigMavi) con Mensualidades = 12 y CondicionPropre LIKE '%DIF%' / '%INM%'; mapea via PaymentConditionCatalog.GetSapPaymentCode(condicionPropre, \"\") a Zterm y toma Zdiasgracia.",
  "notas": "Ejemplo del patron SQL SigMavi + SD40 en la misma clase Credit.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "TokenGenerator.CreateClientS4",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Helpers\\TokenGenerator.cs:113-133",
  "firma_verbatim": "public static HttpClient CreateClientS4()",
  "que_hace": "RequestMethods.EnableTrustedHosts(); new HttpClientHandler { UseCookies = true, CookieContainer = new CookieContainer(), ServerCertificateCustomValidationCallback = (m,c,ch,e) => true }; s4Token = GetAuthS4() (Basic base64 de Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.usuarioServicio/contrasenaServicio), cacheado en static _s4AuthToken con lock); new HttpClient(handler) { Timeout 60s, Authorization Basic, Accept application/json }.",
  "notas": "Crea un HttpClient NUEVO por llamada (los llamadores normalmente no lo disponen). Clase `public class TokenGenerator` estatica-de-facto (namespace ServicioSap.Helpers). Tambien `public static HttpClient CreateClientExternal()` :108 (singleton sin Authorization, para AWS/*.mavi.fun), `public static string GetAuthS4()` :60, `public static void ClearAuthS4()` :84, `public static string GenerateTokenJwt(string username)` :31. GetApiService()/GetCsrfToken() :173/:178 devuelven estaticos que NADIE asigna (siempre null).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "TokenGenerator.GetTokenSapAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Helpers\\TokenGenerator.cs:135-171",
  "firma_verbatim": "public static async Task<string> GetTokenSapAsync(HttpClient apiService, string serviceUrl)",
  "que_hace": "GET serviceUrl con header X-CSRF-Token: fetch; si !IsSuccess throw \"Fetch CSRF falló...\"; lee header X-CSRF-Token (o x-csrf-token); si vacio o \"Required\" throw; return token. catch -> throw \"Error obteniendo CSRF Token SAP (Async): ...\".",
  "notas": "Debe usarse con el MISMO HttpClient (cookies de sesion en el handler) que luego hace el POST/PATCH. serviceUrl tipico: obtenerUrl(...) + \"/ZAPI_XXX_SRV/?sap-client=110&sap-language=ES\" (BusinessPartnerMethods.cs:77) o \"/ZSDT_CTE_ODATA_SRV/\" (:840).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "conexionSQL.obtenerConexionAndroidAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Helpers\\ConexionDB\\ConexionSQL.cs:100-129",
  "firma_verbatim": "public async Task<SqlConnection> obtenerConexionAndroidAsync()",
  "que_hace": "connectionString = ConfigurationManager.ConnectionStrings[\"MAVICBOSANDROID\"]?.ConnectionString (throw si falta); new SqlConnection; ApplicationName = Assembly.GetCallingAssembly().GetName().Name; si no abierta await con.OpenAsync(); return con (YA ABIERTA). catch -> throw \"Error en obtenerConexionAndroidAsync: ...\".",
  "notas": "Clase `public class conexionSQL` (minuscula inicial) namespace ServicioSap.Helpers.ConexionDB, instancia sin estado: `var db = new conexionSQL();`. Devuelve la conexion abierta: NO llamar Open() de nuevo (OrderMethods.cs:985-989 documenta el bug que causaba). Base ServicioAndroid = destino de SP_CREDITO_WEB_DATOS, VTASdArtCreditoWeb, TcAAEA00030_EnvioMensajes, VTASDCodigoVerificacioneCommerce.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "conexionSQL.obtenerConexionSigMaviAsync",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Helpers\\ConexionDB\\ConexionSQL.cs:72-98",
  "firma_verbatim": "public async Task<SqlConnection> obtenerConexionSigMaviAsync()",
  "que_hace": "Properties.Settings settings = new Properties.Settings(); con = Conexion.Data.getconexion(settings.Server, \"SIGMavi\") (Conexion.dll); ApplicationName; OpenAsync si no abierta; return con.",
  "notas": "Base SigMavi: CondicionesCredVtaLinea, VentasCupones, articulospropiedades, etc. Versiones sincronas: `public SqlConnection obtenerConexionSigMavi()` :11 y `public SqlConnection obtenerConexionAndroid()` :40. Para AdminDoc: `public SqlConnection obtenerConexionAdminDoc()` :134 y `public async Task<SqlConnection> obtenerConexionAdminDocAsync()` :165 (connectionString \"ADMINDOC\").",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "Logger.SAP",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Helpers\\Logger.cs:8-45",
  "firma_verbatim": "public static void SAP(string type, string message)",
  "que_hace": "Append a C:\\inetpub\\wwwroot\\log\\sap.log (si existe el dir) y a {BaseDirectory}\\Logs\\sap.log con formato \"[yyyy-MM-dd HH:mm:ss] \" + type + message; Debug.WriteLine. Nunca lanza.",
  "notas": "Convencion de uso: ServicioSap.Helpers.Logger.SAP(\"[CREDIT Xxx ERROR] \", ex.Message) (type con corchetes y espacio final).",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "PaymentConditionCatalog.GetSapPaymentCode",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Helpers\\PaymentConditionCatalog.cs:122",
  "firma_verbatim": "public static string GetSapPaymentCode(string magentoCondition, string fallbackDefault = \"ACEF\")",
  "que_hace": "Mapa estatico condicion Magento/Propre -> Zterm SAP (ej. \"12 M VIU P INM\" -> \"12IV\").",
  "notas": "`public static class PaymentConditionCatalog` :6. Fallback de GetCondicionAsync.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "LiberadorCreditoMethods.LiberarCliente",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\LiberadorCreditoMethods.cs:48",
  "firma_verbatim": "public LiberadorResult LiberarCliente(string cliente, int id, int uen)",
  "que_hace": "Llama al liberador de credito (AppSettings AUTENTICACION_URL_LIBERADOR / VETA_URL_LIBERADOR). Devuelve struct LiberadorResult { public string Status; // \"AUTORIZADO\" | \"EN_ANALISIS\" | \"RECHAZADO\"  public int IdVenta; } (:9-13).",
  "notas": "Sincrono. Su unica invocacion esta comentada en OrderMethods.cs:760-792 (\"PENDIENTE: Servicio de Liberador y Callback a Magento están incompletos en DMZ\"). Ctor `public LiberadorCreditoMethods()` :41.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "CredilanaMethods.GetCredilanaInfoAsync<T>",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Credit\\CredilanaMethods.cs:14",
  "firma_verbatim": "public async Task<T> GetCredilanaInfoAsync<T>(string field, int uen)",
  "que_hace": "Montos de credito cacheados (montos_cte_nuevo / montos_cte_nuevo_apertura / montos_cte_casa) por UEN. Usado en CreditController.GetCreditAmounts.",
  "notas": "Instancia `new CredilanaMethods()`. Tercera clase de Methods\\Credit; muestra la convencion: clases de instancia sin estado o clases con metodos static, ambas aceptadas.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "RequestMethods.EnableTrustedHosts",
  "archivo_linea": "\\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap\\Methods\\Utils\\RequestMethods.cs:18",
  "firma_verbatim": "public static void EnableTrustedHosts()",
  "que_hace": "Habilita hosts/TLS confiables; lo invoca CreateClientS4 en cada llamada.",
  "notas": "No hace falta llamarlo directamente si se usa CreateClientS4.",
  "reutilizable_desde_clase_nueva": "si"
 },
 {
  "nombre": "GetCodeMasterAsync (citado en el MD de diseno)",
  "archivo_linea": "NO EXISTE en \\\\CATECINF214034\\Compartida\\Migracion SAP\\ServicioSAP\\ServicioSap\\ServicioSap (grep -rn en *.cs: 0 resultados)",
  "firma_verbatim": "NO EXISTE",
  "que_hace": "El equivalente real es BusinessPartnerMethods.GetConsultaAnexosAsync (WACODEMSTRDSet por ZcodeProgram).",
  "notas": "El MD FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md tambien cita ResolverCondicionArticuloDimaAsync y ObtenerContextoValidacionTelefonoAsync: TAMPOCO EXISTEN (0 resultados); son nombres propuestos para codigo nuevo, no reutilizacion.",
  "reutilizable_desde_clase_nueva": "no-existe"
 },
 {
  "nombre": "Wrapper publico de GetCatalogoConfiguracionAsync en WalletMethods / ObtenerNumeroTablaSmsAsync publico / HasValidPhoneOriginSAPAsync publico",
  "archivo_linea": "NO EXISTE",
  "firma_verbatim": "NO EXISTE",
  "que_hace": "No hay version public/internal de ObtenerNumeroTablaSmsAsync (ambas copias private), ni de HasValidPhoneOriginSAPAsync (private), ni de WalletMethods.GetCatalogoConfiguracionAsync (private). Tampoco existe ningun metodo que ejecute SpVTASInsertArtSolCreditoLinea ni SpCREDISolicitudWebPrimerGuardado ni SpCREDIDatosSolicitudCreditoArt (grep de esos nombres en *.cs: solo aparece SpVTASInsertArtSolCreditoLinea en un comentario XML de OrderMethods.cs:936).",
  "notas": "Para reutilizar habria que (a) copiar el cuerpo a la clase nueva, o (b) cambiar visibilidad en la clase origen (fuera del alcance SOLO LECTURA de este inventario; decision del usuario).",
  "reutilizable_desde_clase_nueva": "no-existe"
 }
]

## duplicados

RUTA BASE (B) = \\CATECINF214034\Compartida\Migracion SAP\ServicioSAP\ServicioSap\ServicioSap

=== 1) ObtenerNumeroTablaSmsAsync — DOS copias privadas con SQL DISTINTO ===

--- Copia A: B\Methods\Credit\CreditMethods.cs:262-295 (verbatim) ---
        private static async Task<string> ObtenerNumeroTablaSmsAsync(string cliente)
        {
            var telefono = "";
            try
            {
                var conexionHelper = new conexionSQL();
                using (var sqlConnection = await conexionHelper.obtenerConexionAndroidAsync().ConfigureAwait(false))
                {
                    var strQuery = string.Format(@"SELECT TOP 1 Telefono FROM TcAAEA00030_EnvioMensajes WITH(NOLOCK) 
                      WHERE IdRegistro IN (
                      SELECT IdCodigoVerificacioneCommerce FROM VTASDCodigoVerificacioneCommerce CV WITH(NOLOCK) 
                      WHERE CV.Cliente = '{0}') ORDER BY Id DESC", cliente);
                    
                    using (var sqlCommand = new SqlCommand(strQuery, sqlConnection))
                    {
                        sqlCommand.CommandTimeout = 99999;
                        using (var dr = await sqlCommand.ExecuteReaderAsync().ConfigureAwait(false))
                        {
                            if (!dr.HasRows) return "";
                            while (await dr.ReadAsync().ConfigureAwait(false))
                            {
                                telefono = dr["Telefono"].ToString();
                            }
                        }
                        return telefono;
                    }
                }
            }
            catch (Exception ex)
            {
                ServicioSap.Helpers.Logger.SAP("[CREDIT ObtenerNumeroTablaSms ERROR] ", ex.Message);
                return telefono;
            }
        }

--- Copia B: B\Methods\Order\OrderMethods.cs:579-603 (verbatim) ---
        private async Task<string> ObtenerNumeroTablaSmsAsync(string cliente)
        {
            try
            {
                var db = new conexionSQL();
                using (var sqlConnection = await db.obtenerConexionAndroidAsync().ConfigureAwait(false))
                using (var sqlCommand = sqlConnection.CreateCommand())
                {
                    sqlCommand.CommandText =
                        "SELECT TOP 1 LTRIM(RTRIM(T.Telefono)) FROM TcAAEA00030_EnvioMensajes T WITH(NOLOCK) " +
                        "INNER JOIN VTASDCodigoVerificacioneCommerce V WITH(NOLOCK) ON V.Telefono = T.Telefono " +
                        "WHERE V.Cliente = @Cliente ORDER BY T.Id DESC";
                    sqlCommand.CommandTimeout = 99999;
                    sqlCommand.Parameters.Add("@Cliente", SqlDbType.VarChar).Value = cliente ?? string.Empty;

                    object result = await sqlCommand.ExecuteScalarAsync().ConfigureAwait(false);
                    return result?.ToString() ?? "";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error ObtenerNumeroTablaSms() => " + ex.Message);
                return "";
            }
        }

Diferencias: (1) A es static, B es de instancia; ambas private. (2) A relaciona por IdRegistro IN (IdCodigoVerificacioneCommerce ... WHERE CV.Cliente) — coincide con lo que inserta SendSmsNewNumberAsync (IdRegistro = idRef = IdCodigoVerificacioneCommerce, CreditMethods.cs:137-141); B relaciona por V.Telefono = T.Telefono, columna que el INSERT de VTASDCodigoVerificacioneCommerce (CreditMethods.cs:201-204) NO escribe (no verificado en repo que exista). (3) A concatena el cliente con string.Format (inyeccion), B usa parametro @Cliente. (4) A devuelve Telefono crudo, B aplica LTRIM(RTRIM()). (5) Logging: A -> Logger.SAP (persistente), B -> Console.WriteLine. (6) NINGUNA replica el SP: SP_CREDITO_WEB_DATOS.sql:205-208 hace `SELECT TOP 1 @TelefonoAValidar = Telefono FROM TcAAEA00030_EnvioMensajes WITH (NOLOCK) WHERE Cliente = @cliente ORDER BY Id DESC` (por columna Cliente de la propia tabla, sin join).

=== 2) IsValidatedAsync — DOS metodos con el mismo nombre, distinto retorno y distinta fuente SAP ===

--- CreditMethods.cs:230-260: `public static async Task<bool> IsValidatedAsync(string cliente)` ---
Fuente: GetClientAsync (ZB_DATOS_CLIENTE_CDS). telefonoSap = partner.TelefonoMovil ?? partner.ztelCte ?? partner.Telefono; compara con la Copia A de ObtenerNumeroTablaSmsAsync; devuelve bool (telefonos iguales). No valida Zvaltel ni ZappOrig ni tipo MOVIL. Sin llamadores.

--- OrderMethods.cs:621-650: `private async Task<string> IsValidatedAsync(string cliente)` ---
Fuente: GetClientMaAsync (ZAPI_BP05MA_SRV, To_CteTel). Devuelve el ZtelCte del primer BusinessPhone con Zvaltel && ZappOrig no vacio && ZtelCte no vacio && ZtipoCte == "MOVIL"; "" si no hay. El comentario :609-619 explica que ZB_DATOS_CLIENTE_CDS NO expone zvalTel (campos reales: zidcteTel, ztipoCte, ztelCte, zfecha, zenvioNip, zappOrig, zfechaCap, zelExist, ztraeTel, zintentos, ztipoValid) y ztelCte llega vacio. La comparacion con el SMS la hace el llamador (:1881 `isValidated = numeroValidado == numeroDelSms`), y ese bool despues NO se usa (parametro muerto en ProcessCreditPaymentAsync).
Conclusion: la version de OrderMethods es la que replica el WHERE del SP (:194-202 Tipo='Movil' AND ValidacionTel=1 + :186-191 AppOrigen), pero es private. La de CreditMethods es publica pero usa la fuente que el propio proyecto documenta como no confiable.

=== 3) GetCatalogoConfiguracionAsync (WalletMethods) vs GetConfiguracionCatalogoAsync (ProductMethods) — mismo endpoint AWS ===
- B\Methods\Wallet\WalletMethods.cs:28 `private async Task<List<CatalogoConfiguracion>> GetCatalogoConfiguracionAsync(string nombreCatalogo)`: new HttpClient() por llamada; URL $"{awsBaseUrl.TrimEnd('/')}/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO={Uri.EscapeDataString(nombreCatalogo)}"; tolera respuesta {"value":[...]} o [...]; errores -> lista vacia; awsBaseUrl con fallback hardcodeado (:19).
- B\Methods\MaterialManagement\ProductMethods.cs:708 `public async Task<List<ConfiguracionCatalogo>> GetConfiguracionCatalogoAsync(string nombreCatalogo)`: TokenGenerator.CreateClientExternal() (singleton); URL AWS_BASE_URL + $"AI_GET_CatalogoConfiguracion?NOMBRECATALOGO={nombreCatalogo}" (:711) sin escapar y sin TrimEnd; solo formato [...]; errores -> throw.
- Modelos duplicados campo a campo: CatalogoConfiguracion (B\Models\SAP\WalletCustomer\CatalogoConfiguracion.cs, namespace ServicioSap.Models.SAP) y ConfiguracionCatalogo (B\Models\Ecommerce\AlmacenesConfig.cs:65-87, namespace ServicioSap.Models.Ecommerce): IdConfiguracionCatalogos [IDCONFIGURACIONCATALOGOS] int, NombreCatalogo [NOMBRECATALOGO], Uso [USO], Valor1..Valor4 [VALOR1..VALOR4] (JsonPropertyName de System.Text.Json).
- Reutilizable tal cual desde clase nueva: SOLO la de ProductMethods (`new ProductMethods().GetConfiguracionCatalogoAsync("...")`).

=== 4) Modelos Cte (3 copias del mismo Z-set) ===
- Cte (B\Models\SAP\BusinessPartner\Cte.cs, 72 props, payload BP01 dentro de Client.toCte).
- BusinessCte (B\Models\SAP\BusinessPartner\BP05MA\BusinessEntitiesMa.cs:260-335, 73 props = Cte + `Client`, con ZtipoCredito colocado tras ZlcaxsiMay; respuesta BP05MA To_Cte).
- Partner (B\Models\SAP\BusinessPartner\Partner.cs, 263 props): trae los mismos Z-campos de Cte (ZclienteBp..ZtipoCliente, con `int? ZfecUltPag` en vez de string) MAS telefono en minuscula (zidcteTel, ztipoCte, ztelCte, zfecha, zenvioNip, zvalTel, zappOrig, zfechaCap, zelExist, ztraeTel, zintentos, ztipoValid) MAS contacto/empleo/direccion/generales (Telefono, TelefonoMovil, Mail, RFC, FechaNacimiento, EstadoCivil, CP, Colonia1, Municipio, Poblacion, Region, Calle, NumExt, CompNumInt, OrgVentas, CondicionPago, etc.). Es el modelo plano de ZB_DATOS_CLIENTE_CDS.

=== 5) Telefono: CteTel vs BusinessPhone ===
- CteTel (Cte payload BP01): Partner, ZidcteTel, ZtipoCte, ZtelCte, Zfecha, ZenvioNip, ZvalTel, ZappOrig, ZfechaCap, ZtelExist, ZtraeTel, Zintentos, ZtipoValid (13).
- BusinessPhone (BP05MA to_CteTel): Partner, Client, ZidcteTel, ZtipoCte, ZtelCte, Zfecha, Zenvionip, Zvaltel, ZappOrig, ZfechaCap, ZtelExist, ZtraeTel, Zintentos, ZtipoValid (14).
- Diferencias de casing que IMPORTAN porque ambos se (de)serializan con System.Text.Json (case-sensitive por defecto, sin PropertyNameCaseInsensitive en el proyecto): ZenvioNip vs Zenvionip, ZvalTel vs Zvaltel; BusinessPhone agrega Client. No mezclar nombres entre ambos.

=== 6) Otros pares a no confundir ===
- SapResponse (B\Models\SapResponse.cs: `public D d` con `public JsonElement results`) para colecciones OData V2, vs SapSingleResponse (B\Models\SapSingleResponse.cs: `public JsonElement d`) para entidad unica; CondicionPagoResponse (Newtonsoft, [JsonProperty("value")]) para OData V4 SD40; BusinessPartnerMaResponse ([JsonPropertyName("d")] Data) para BP05MA.
- OrderMethods.CheckClientCreditAsync/CheckClientBalanceAsync/HasValidPhoneOriginSAPAsync: los tres llaman GetClientAsync y los tres son private; HasValidPhoneOriginSAPAsync sin llamadores y CheckClientBalanceAsync con llamada comentada.

## modelos_existentes

RUTA BASE (B) = \\CATECINF214034\Compartida\Migracion SAP\ServicioSAP\ServicioSap\ServicioSap

=== B\Models\SAP\BusinessPartner\Cte.cs — namespace ServicioSap.Models.SAP.BusinessPartner — `public class Cte` — 72 propiedades EXACTAS (lineas 9-80, verbatim, en orden) ===
public string ZclienteBp { get; set; }
public string ZentCalles { get; set; }
public int ZantigMeses { get; set; }
public int ZantigAnios { get; set; }
public string Zcurp { get; set; }
public string Zcredito { get; set; }
public string Zprospecto { get; set; }
public string Zagenteserv { get; set; }
public string Zcreditoesp { get; set; }
public string Zcrmimporte { get; set; }
public string Zcrmcantidad { get; set; }
public string Zfecha4 { get; set; }
public string Zusuariopos { get; set; }
public string ZidTipoCalles { get; set; }
public string ZidestatSup { get; set; }
public string ZrecomendPor { get; set; }
public string ZimporRent { get; set; }
public string ZviveencCal { get; set; }
public int ZantigNeg { get; set; }
public string ZpartentRec { get; set; }
public string ZdirRecom { get; set; }
public string ZserieMon { get; set; }
public string ZlimCred { get; set; }
public string ZidAval { get; set; }
public string Zlcaxsi { get; set; }
public int ZidMagento { get; set; }
public string ZingMensCredw { get; set; }
public string ZlimCedDimae { get; set; }
public string ZidTipoDima { get; set; }
public string Zirreg { get; set; }
public string ZnegBc { get; set; }
public string ZserieMonViu { get; set; }
public string Znipventa { get; set; }
public string Znipcobro { get; set; }
public string ZreestrucDeud { get; set; }
public string ZclabeCuenta { get; set; }
public string ZlcaxsiMay { get; set; }
public string ZcpaxaMay { get; set; }
public string ZingresoTip { get; set; }
public string Zbanco { get; set; }
public string ZctaClabeValid { get; set; }
public string ZfolioPagMay { get; set; }
public string ZvalorPagMay { get; set; }
public int ZapoyoVtaDima { get; set; }
public int ZidCtaClDisp { get; set; }
public string ZapoyCobr { get; set; }
public string ZretApoyCobr { get; set; }
public int ZintSolApoy { get; set; }
public int ZtotalAsign { get; set; }
public string ZnivEsp { get; set; }
public string Zcompania { get; set; }
public int ZcodSms { get; set; }
public string ZsmsValid { get; set; }
public string ZfechValid { get; set; }
public string ZdoctoValid { get; set; }
public string ZidTipoBf { get; set; }
public string ZviveCon { get; set; }
public string ZfechCateg { get; set; }
public string ZusuarioIrreg { get; set; }
public string ZfechaIrreg { get; set; }
public string ZmotivoIrreg { get; set; }
public string ZsinBoifBf { get; set; }
public string ZmapLat { get; set; }
public string ZmapLong { get; set; }
public string ZreestDeuda { get; set; }
public string ZusValidTarj { get; set; }
public string ZidVivEnCalid { get; set; }
public string Zcita { get; set; }
public int ZnumPag { get; set; }
public string ZfecUltPag { get; set; }
public string ZtipoCliente { get; set; }
public string ZtipoCredito { get; set; }
(Sin atributos JSON; se serializa con System.Text.Json usando el nombre C# tal cual. Valores por defecto que usa el proyecto al crear: strings "" , montos "0.00", ints 0, ZfechaIrreg = null, ZfecUltPag = null — BusinessPartnerMethods.cs:582-656.)

=== B\Models\SAP\BusinessPartner\CteTel.cs — `public class CteTel` — 13 propiedades (lineas 10-22, verbatim) ===
public string Partner { get; set; }
public string ZidcteTel { get; set; }
public string ZtipoCte { get; set; }
public string ZtelCte { get; set; }
public string Zfecha { get; set; }
public bool ZenvioNip { get; set; }
public bool ZvalTel { get; set; }
public string ZappOrig { get; set; }
public string ZfechaCap { get; set; }
public bool ZtelExist { get; set; }
public bool ZtraeTel { get; set; }
public string Zintentos { get; set; }
public string ZtipoValid { get; set; }
(Uso en BP01: ZtipoCte = "MOVIL", ZtelCte = movil, Zfecha = null, ZvalTel = false, ZappOrig = "" — BusinessPartnerMethods.cs:657-672.)

=== B\Models\SAP\BusinessPartner\Client.cs — `public class Client` — 122 propiedades (solo nombres, lineas 15-137) ===
Partner, Type, BuGroup, Sort1, Sort2, Title, TitleLet, Natpers, NameOrg1, NameOrg2, NameOrg3, NameOrg4, NameLast, NameFirst, NameLst2, NameLast2, Namemiddle, Gender, Xsexm(bool), Crdat, Crtim, Marst, Natio, Birthdt, Xblck(bool), NotReleased(bool), Street, HouseNum1, NameCo, StrSuppl1, StrSuppl2, StrSuppl3, Location, City2, City1, PostCode1, Country, Region, TimeZone, Langu, Transpzone, TelNumber, TelExtens, DateFrom, DateTo, AddrGroup, PersAddr(bool), Remark, TelnrLong, SmtpAddr, Stkzn, Stcd1, Stkzu(bool), Brsch, Ktokd, AufsdKna1, LifsdKna1, FaksdKna1, Bukrs, Akont, Zwels, Xverr(bool), ZtermKnb1, Fdgrv, Xzver(bool), Togru, Altkn, VkorgKnvv, VtwegKnvv, SpartKnvv, Ernam, Erdat, Kalks, Kdgrp, Bzirk, Konda, Pltyp, Awahr, Inco1, Inco2, Antlf, Lprio, Eikto, Vsbed, Waers, Ktgrd, ZtermKnvv, Vwerk, Vkgrp, Vkbur, Kvgr1, Kvgr4, AufsdKnvv, LifsdKnvv, FaksdKnvv, Loevm(bool), Parnr, Namev, Name1F, Sortl, Aland, Tatyp, Taxkd, VkorgKnvp, VtwegKnvp, SpartKnvp, Parvw, Kunn2, Rfc, Banks, Bankl, Bankn, Bvtyp, Fiscalregimen, Usocfdi, Perrl, toCte (Cte), toCteTel (CteTel), toCteCto (CteCto), toCteCtoDireccion (CteCtoAddress), toCteCtoEmpleo (CteCtoJob), to_return (ToReturnResults, de ServicioSap.Models.SAP.Order). Todos string salvo los marcados bool y los de navegacion. Usings: System.Text.Json.Serialization y ServicioSap.Models.SAP.Order.

=== B\Models\SAP\BusinessPartner\BP05MA\BusinessEntitiesMa.cs — namespace ServicioSap.Models.SAP.BusinessPartner.BP05MA ===
Clases del archivo (336 lineas): BusinessPhone :5, BusinessAddr :23, BusinessKnb1 :134, BusinessAdr :149, BusinesKnvp :158, BusinesKnvi :169, BusinessContact :178, BusinessKna1 :211, BusinessKnvv :225, BusinessCte :260.
--- `public class BusinessPhone` (lineas 7-20, verbatim, 14 props) — es el elemento de To_CteTel (JSON "to_CteTel") ---
public string Partner { get; set; }
public string Client { get; set; }
public string ZidcteTel { get; set; }
public string ZtipoCte { get; set; }
public string ZtelCte { get; set; }
public string Zfecha { get; set; }
public bool Zenvionip { get; set; }
public bool Zvaltel { get; set; }
public string ZappOrig { get; set; }
public string ZfechaCap { get; set; }
public bool ZtelExist { get; set; }
public bool ZtraeTel { get; set; }
public string Zintentos { get; set; }
public string ZtipoValid { get; set; }
--- `public class BusinessCte` (lineas 262-334, 73 props) — es To_Cte (JSON "to_Cte") ---
Client, ZclienteBp, ZentCalles, ZantigMeses(int), ZantigAnios(int), Zcurp, Zcredito, Zprospecto, Zagenteserv, Zcreditoesp, Zcrmimporte, Zcrmcantidad, Zfecha4, Zusuariopos, ZidTipoCalles, ZidestatSup, ZrecomendPor, ZimporRent, ZviveencCal, ZantigNeg(int), ZpartentRec, ZdirRecom, ZserieMon, ZlimCred, ZidAval, Zlcaxsi, ZidMagento(int), ZingMensCredw, ZlimCedDimae, ZidTipoDima, Zirreg, ZnegBc, ZserieMonViu, Znipventa, Znipcobro, ZreestrucDeud, ZclabeCuenta, ZlcaxsiMay, ZtipoCredito, ZcpaxaMay, ZingresoTip, Zbanco, ZctaClabeValid, ZfolioPagMay, ZvalorPagMay, ZapoyoVtaDima(int), ZidCtaClDisp(int), ZapoyCobr, ZretApoyCobr, ZintSolApoy(int), ZtotalAsign(int), ZnivEsp, Zcompania, ZcodSms(int), ZsmsValid, ZfechValid, ZdoctoValid, ZidTipoBf, ZviveCon, ZfechCateg, ZusuarioIrreg, ZfechaIrreg, ZmotivoIrreg, ZsinBoifBf, ZmapLat, ZmapLong, ZreestDeuda, ZusValidTarj, ZidVivEnCalid, Zcita, ZnumPag(int), ZfecUltPag(string), ZtipoCliente. (Todos string salvo los int marcados.)
--- Contenedor B\Models\SAP\BusinessPartner\BP05MA\BusinessPartnerMa.cs ---
`public class BusinessPartnerMaResponse { [JsonPropertyName("d")] public BusinessPartnerMa Data { get; set; } }`; `public class BusinessPartnerMa` con datos generales (Partner, Client, Type, Bpkind, BuGroup, ..., NameLast, NameFirst, NameLst2, NameLast2, Namemiddle, Name1Text, Gender, Birthdt, Marst, Natio, Natpers, ...) y navegaciones: [JsonPropertyName("to_CteTel")] NavigationCollection<BusinessPhone> To_CteTel; [to_CteDomicilio] NavigationCollection<BusinessAddr> To_CteDomicilio; [to_CteSociedad] BusinessKnb1 To_CteSociedad; [to_CtePersonalAdr] NavigationCollection<BusinessAdr> To_CtePersonalAdr; [to_CteFuncInterlocutor] NavigationCollection<BusinesKnvp> To_CteFuncInterlocutor; [to_CteImpuestos] NavigationCollection<BusinesKnvi> To_CteImpuestos; [to_CteContacto] NavigationCollection<BusinessContact> To_CteContacto; [to_CteCliente] BusinessKna1 To_CteCliente; [to_CteDatosComerciales] NavigationCollection<BusinessKnvv> To_CteDatosComerciales; [to_Cte] BusinessCte To_Cte; [to_CtePersonaContacto] NavigationCollection<object>; [to_CteDatosBancarios] NavigationCollection<object>. `public class NavigationCollection<T> { [JsonPropertyName("results")] public List<T> Results { get; set; } }` (NavigationCollection.cs).

=== B\Models\SAP\Credit\*.cs — namespace ServicioSap.Models.SAP.Credit (4 archivos, registrados en csproj :342, :364, :365, :372) ===
--- CondicionPagoResponse.cs (Newtonsoft) ---
public class CondicionPagoResponse { [JsonProperty("value")] public List<CondicionPagoResult> Value { get; set; } }
public class CondicionPagoResult { [JsonProperty] Bukrs, Zterm, Zgrupogral, Zgrupopropre, Ztipoventa, Ztipocondicion (string); Zproductounico, Zdima, Zplazoeje (bool?); Zplazo, Zdiasgracia, Zperiodicidad, Zestatus (string); Zdiferido (bool?); Vkorg, Vtweg, Zfechadif (string) }
--- CreditAmountModels.cs ---
public class ArticuloUenRequest { public string articulo; public int uen; public string tipo }
public class InfoPagoPuntualModel { articulo (string), monto, total_sin_bonificacion, total_con_bonificacion (decimal), meses, semanas (int), condicion (string), bonificacion (int), abono_sin_bonificacion (decimal), tipo_de_abono (string), abono_con_bonificacion, tasa_con_bonificacion, cat_con_bonificacion, interes_con_bonificacion, tasa_sin_bonificacion, cat_sin_bonificacion, interes_sin_bonificacion (decimal) }
public class CteNuevoResponseModel { public decimal hasta_un_maximo_de_prestamo; public int hasta_una_bonificacion_de; public IEnumerable<InfoPagoPuntualModel> articulos }
public class PlazosResponse { public List<PlazoDetail> Diferidos; public List<PlazoDetail> Inmediatos; ctor inicializa ambas }
public class PlazoDetail { public int Days; public string StoreCode }
--- DocumentModels.cs ---
public class BodyImagenBase64 { public string Cliente; public int TipoDoc; public int IdFoto; public string Formato; public string UsuarioCarga; public string idVenta; public string Aval; public string MovMovid; public string FileInputBase64 }
public class SaveImagesRequest { public string Account; public ImagenBase64[] Ine; public ImagenBase64 Selfie; public ImagenBase64[] PruebaDeVida }
public class ImagenBase64 { public string Name; public string Data; public string Mime }
--- SendSmsNewNumberRequest.cs ---
public class SendSmsNewNumberRequest { public string Cliente { get; set; } public string NumeroTelefono { get; set; } public string IdCarrito { get; set; } public bool EsCredito { get; set; } }

=== Otros modelos que el flujo de credito ya usa (para no re-declararlos) ===
- B\Models\SAP\Order\OrderRequest.cs `public class OrderRequest`: entityId, incrementId, storeId, status, subTotal(decimal), total(decimal), cuotas, impuesto(decimal), metodoPago, costoEnvio(decimal), metodoEnvio, docType, salesOrg, distrChan, division, salesOff, pmnttrms, usuarioPos, refDoc, refDocCat, articulos (List<ArticuloRequest>), infoCliente (InfoClienteRequest), codigoRecogerSucursal, sucursalDestino(int), forzarOrder, state, RedimirMonedero(float), Agente, utmSource.
- B\Models\SAP\Order\InfoClienteRequest.cs `public class InfoClienteRequest`: nombre, cliente, cuenta, telefono, direccion, numExt, numInt, codigoPostal, municipio, colonia, estado, referencia, entreCalles, pais, razonSocial, correo, nombreClienteMavi, apellidoPaternoClienteMavi, apellidoMaternoClienteMavi, telefonoClienteMavi, idMagento(int), idCarrito, codigo_promotor, OrigenIdMagento, uen(int), rfc, sexo, bpGroup, fiscalRegimen, usoCfdi.
- B\Models\SAP\Order\ArticuloRequest.cs: sku, cantidad, precio, precioEspecial, descuento, condicion (usados en OrderMethods.cs:92-101).
- B\Models\SAP\BusinessPartner\CustomerRequest.cs: name, lastName, lastName2, dateBirth, email, gender, phone, idMagento, storeCode, list, address, cp (todos string).
- B\Models\SAP\BusinessPartner\UnirCuentaRequest.cs: partner_id (string), id_magento (int).
- B\Models\SAP\BusinessPartner\AnexosResponse.cs (Newtonsoft): AnexosResponse { [d] AnexosData D }, AnexosData { [results] List<AnexosResult> Results }, AnexosResult { Mandt, ZcodeId, ZcodeProgram, ZcodeValue, ZcodeData, ZcodeCmnt, ZcodeFlag, ZcodeUser, ZcodeDateCreated, ZcodeHourCreated, ZcodeDateUpdated, ZcodeHourUpdated }.
- B\Models\SAP\BusinessPartner\Partner.cs (ZB_DATOS_CLIENTE_CDS, 263 props): incluye BusinessPartner, los 72 Z de Cte (ZfecUltPag como int?), telefono en minuscula (zidcteTel, ztipoCte, ztelCte, zfecha, zenvioNip, zvalTel, zappOrig, zfechaCap, zelExist, ztraeTel, zintentos, ztipoValid), contacto (zidcteCto, zidcteCtoTipo, znombre, zapellidop, zfechaNac, ztel, zemail, ztratam, zsexo, zparentesco, zestatus_sup, zvive_con, zedo_civil, zcte_supervisado, ztipo_inter, zes_casa, znum_cuenta, zconyuge, zenvia_buro_cred, zrfc, znacionalidad, znivelcobr_esp_contd, zcontact_sel_val, zretiro_firm_aval, zbenef), empleo (Zempresa..ZtipoEmpleo), generales (TipoSocioComercial, Agrupacion, Nombre, PrimerNombre, SegundoNombre, PrimerApellido, SegundoApellido, Calle, NumExt, CompNumInt, Colonia1, Municipio, Poblacion, CP, Pais, Region, Telefono, TelefonoMovil, Mail, Sexo, RFC, FechaNacimiento, EstadoCivil, Nacionalidad, Ingresos, OrgVentas, CondicionPago, CondPago, Cliente, Sociedad, ...).
- B\Models\SAP\MaterialManagement\Stock.cs (namespace ServicioSap.Models.SAP): Material, Plant, StorageLoc, UnrestrictedUseStock(string), BlockedStock, BaseUnit, ProductName, ProductGroup, CrossPlantStatus, to_series (StockSerieResult { List<StockSerie> results }).
- B\Models\SAP\SalesDistribution\FinalListProper.cs (sin namespace): ver ficha de FinalListProperMethods.
- B\Models\SapResponse.cs / SapSingleResponse.cs (namespace ServicioSap.Models): envoltorios OData V2.

=== Configuracion/arquitectura a respetar por la clase nueva (verificado) ===
- Web.config appSettings relevantes (B\Web.config): AwsBaseUrl (:28, con barra final), URL_ANDROID_API (:29), URL_BP_API (:30), URL_CONFIGURACIONES_API (:31), URL_DMZ (:57), USER_DMZ (:56), IMAGES_CREDIT_PATH (:63), ZAPI_CONDPAGO (:89). connectionStrings: MAVICBOSANDROID (:13, base ServicioAndroid), ADMINDOC (:15). SigMavi via Conexion.Data.getconexion(settings.Server, "SIGMavi"). URL base S/4 via Conexion.Data.obtenerUrl(Conexion.Nodos.ENVIROMENT_DEV, Conexion.Nodos.SERVICE_URL) (Conexion.dll en B\Helpers\ConexionSAP, binario).
- Registro obligatorio de archivos nuevos en B\ServicioSap.csproj como <Compile Include="Methods\Credit\NombreClase.cs" /> (patron :255-258) y <Compile Include="Models\SAP\Credit\NombreModelo.cs" /> (patron :342, :364, :365, :372). El proyecto NO usa globbing.
- Controller: B\Controllers\CreditController.cs `[Authorize] [RoutePrefix("credit")] public class CreditController : ApiController`, acciones `public async Task<IHttpActionResult>` que devuelven Ok(...)/BadRequest/InternalServerError; instancian `new DocumentMethods()` o llaman estaticos `CreditMethods.X`.
- Convenciones: `.ConfigureAwait(false)` en todo await; SQL con SqlCommand parametrizado sobre conexion ya abierta; logging con ServicioSap.Helpers.Logger.SAP("[TAG] ", msg); OData GET con TokenGenerator.CreateClientS4() + HttpRequestMessage + Accept + JsonSerializer.Deserialize<SapResponse>(...).d.results; OData POST/PATCH con GetTokenSapAsync + header X-CSRF-Token; System.Text.Json para SAP (case-sensitive) y Newtonsoft solo en SD40/Anexos.