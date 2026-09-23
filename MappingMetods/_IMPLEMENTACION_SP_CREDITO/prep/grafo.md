

## crear_solicitud_verbatim

ARCHIVO: //CATECINF214034/Compartida/Migracion SAP/ServicioSAP/ServicioSap/ServicioSap/Methods/Order/OrderMethods.cs
RANGO: 843-932 (doc-comment 843-861, metodo 862-932). Convencion: "NNN|" = numero de linea; lo que sigue al "|" es literal.
Contexto de clase: namespace ServicioSap.Methods.Order (:29), class OrderMethods (:32), usings relevantes :1-27 (Conexion; ServicioSap.Helpers; ServicioSap.Helpers.ConexionDB; ServicioSap.Methods.BusinessPartner; ServicioSap.Methods.Credit; ServicioSap.Methods.SalesDistribution; ServicioSap.Models.SAP.Order; System.Data; System.Data.SqlClient; System.Linq; System.Threading.Tasks; using OrderResponse = ServicioSap.Models.SAP.Order.Response;). Region: "#region FASE 5 - CRÉDITO & VALIDACIÓN PHONE" (:573).

843|        /// <summary>
844|        /// Inserta la solicitud de credito llamando a SP_CREDITO_WEB_DATOS en la BD de Android.
845|        /// </summary>
846|        /// <remarks>
847|        /// Replica 1 a 1 la llamada de LAN (WebApiMagento\Metodos\CreditMethods.cs:121-190):
848|        /// los mismos 38 parametros, con las mismas fuentes. No se agrega ninguno; los demas
849|        /// parametros del SP tienen default y se omiten, igual que en LAN. Se invoca como
850|        /// StoredProcedure (binding por nombre), tambien igual que LAN: el texto EXEC anterior
851|        /// amarraba por POSICION y obligaba a intercalar literales para tapar huecos.
852|        ///
853|        /// Tres valores no se pueden replicar hoy y van vacios:
854|        ///  - @rfc, @sexo, @fecha_nacimiento, @estado_civil: LAN los toma del maestro de cliente
855|        ///    (getClientInfo). El equivalente en SAP es BP05; falta conectarlo.
856|        ///  - @entre_calles: LAN cae al maestro de cliente cuando el pedido no lo trae.
857|        ///  - @lada_particular / @lada_celular: LAN parte el telefono en lada + numero. Aqui el
858|        ///    telefono va completo en la columna de celular y la lada en 0.
859|        /// @ValidacionTelefono lo manda LAN calculado, pero el SP lo PISA siempre
860|        /// (SP_CREDITO_WEB_DATOS.sql:215-221, las dos ramas del IF/ELSE lo reasignan).
861|        /// </remarks>
862|        private async Task<int> CrearSolicitudCreditoAsync(OrderRequest order, string[] datosArray, string ladaValidar, string telefonoValidar)
863|        {
864|            try
865|            {
866|                var db = new conexionSQL();
867|                using (var cnn = await db.obtenerConexionAndroidAsync().ConfigureAwait(false))
868|                using (var command = new SqlCommand("SP_CREDITO_WEB_DATOS", cnn) { CommandType = CommandType.StoredProcedure })
869|                {
870|                    var info = order.infoCliente ?? new InfoClienteRequest();
871|                    int uen = order.storeId?.ToUpper().Equals("VIU") == true ? 2 : 1;
872|
873|                    command.Parameters.Add("@Id", SqlDbType.Int).Value = 0;
874|                    command.Parameters.Add("@Op", SqlDbType.VarChar).Value = "Insert";
875|                    command.Parameters.Add("@apellido_p", SqlDbType.VarChar).Value = info.apellidoPaternoClienteMavi ?? "";
876|                    command.Parameters.Add("@apellido_m", SqlDbType.VarChar).Value = info.apellidoMaternoClienteMavi ?? "";
877|                    command.Parameters.Add("@nombre", SqlDbType.VarChar).Value = info.nombreClienteMavi ?? "";
878|                    command.Parameters.Add("@fecha_nacimiento", SqlDbType.VarChar).Value = "";
879|                    command.Parameters.Add("@rfc", SqlDbType.VarChar).Value = "";
880|                    command.Parameters.Add("@sexo", SqlDbType.VarChar).Value = "";
881|                    command.Parameters.Add("@email", SqlDbType.VarChar).Value = info.correo ?? "";
882|                    command.Parameters.Add("@direccion", SqlDbType.VarChar).Value = info.direccion ?? "";
883|                    command.Parameters.Add("@exterior", SqlDbType.VarChar).Value = info.numExt ?? "";
884|                    command.Parameters.Add("@interior", SqlDbType.VarChar).Value = info.numInt ?? "";
885|                    command.Parameters.Add("@entre_calles", SqlDbType.VarChar).Value = "";
886|                    command.Parameters.Add("@codigo_postal", SqlDbType.VarChar).Value = info.codigoPostal ?? "";
887|                    command.Parameters.Add("@delegacion", SqlDbType.VarChar).Value = info.municipio ?? "";
888|                    command.Parameters.Add("@poblacion", SqlDbType.VarChar).Value = info.municipio ?? "";
889|                    command.Parameters.Add("@estado", SqlDbType.VarChar).Value = info.estado ?? "";
890|                    command.Parameters.Add("@colonia", SqlDbType.VarChar).Value = info.colonia ?? "";
891|                    command.Parameters.Add("@estado_civil", SqlDbType.VarChar).Value = "";
892|                    command.Parameters.Add("@articulo", SqlDbType.VarChar).Value = "";
893|                    command.Parameters.Add("@uen", SqlDbType.Int).Value = uen;
894|                    command.Parameters.Add("@condicion", SqlDbType.VarChar).Value = order.articulos?.FirstOrDefault()?.condicion ?? "";
895|                    command.Parameters.Add("@cliente", SqlDbType.VarChar).Value = info.cuenta ?? "";
896|                    command.Parameters.Add("@utmSource", SqlDbType.VarChar).Value = order.utmSource ?? "";
897|                    command.Parameters.Add("@sucursal", SqlDbType.Int).Value = uen.Equals(2) ? 505 : 504;
898|                    command.Parameters.Add("@origen", SqlDbType.VarChar).Value = "PRODUCTOS MX";
899|                    command.Parameters.Add("@idMagento", SqlDbType.VarChar).Value = order.incrementId ?? "0";
900|                    command.Parameters.Add("@MetodoEnvio", SqlDbType.VarChar).Value = order.metodoEnvio ?? "";
901|                    command.Parameters.Add("@lada_particular", SqlDbType.VarChar).Value = "0";
902|                    command.Parameters.Add("@telefono_particular", SqlDbType.VarChar).Value = "0";
903|                    command.Parameters.Add("@lada_celular", SqlDbType.VarChar).Value = "0";
904|                    command.Parameters.Add("@telefono_celular", SqlDbType.VarChar).Value = ValidateOnlyNumbers(info.telefono ?? "0");
905|                    command.Parameters.Add("@sucursalDestino", SqlDbType.Int).Value = order.sucursalDestino;
906|                    command.Parameters.Add("@RedimirMonedero", SqlDbType.Money).Value = (decimal)order.RedimirMonedero;
907|                    command.Parameters.Add("@ValidacionTelefono", SqlDbType.Bit).Value = DBNull.Value;
908|                    command.Parameters.Add("@OrigenIdMagento", SqlDbType.VarChar).Value = info.OrigenIdMagento ?? "";
909|                    command.Parameters.Add("@LadaValidar", SqlDbType.VarChar).Value = ladaValidar;
910|                    command.Parameters.Add("@TelefonoValidar", SqlDbType.VarChar).Value = telefonoValidar;
911|
912|                    //cnn.Open();
913|                    var ds = new DataSet();
914|                    var da = new SqlDataAdapter(command);
915|                    da.Fill(ds);
916|
917|                    if (ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0)
918|                    {
919|                        string res = ds.Tables[0].Rows[0][0].ToString();
920|                        int.TryParse(res, out int idSolicitudGenerada);
921|                        return idSolicitudGenerada;
922|                    }
923|                    return 0;
924|                }
925|            }
926|            catch (Exception ex)
927|            {
928|                // El mensaje de log se conserva sin el sufijo Async a proposito (Regla 5).
929|                Console.WriteLine("Error CrearSolicitudCredito: " + ex.Message);
930|                return 0;
931|            }
932|        }

NOTAS DE HECHO (no interpretacion):
- El parametro `datosArray` (string[]) se recibe pero NO se usa dentro del metodo (ninguna referencia entre 863-931).
- `ValidateOnlyNumbers` esta en OrderMethods.cs:308-312: `private string ValidateOnlyNumbers(string input) { if (string.IsNullOrWhiteSpace(input)) return string.Empty; return System.Text.RegularExpressions.Regex.Replace(input, "[^0-9]", ""); }`
- `conexionSQL.obtenerConexionAndroidAsync()` (Helpers/ConexionDB/ConexionSQL.cs:100-129) lee ConnectionStrings["MAVICBOSANDROID"] (Web.config:13 -> server=mavicbosandroid.grupomavi.com; database=ServicioAndroid) y devuelve la conexion YA ABIERTA (:117-120 `if (con.State != ConnectionState.Open) await con.OpenAsync();`).
- `InfoClienteRequest` esta en Models/SAP/Order/InfoClienteRequest.cs:1-81 (campos: nombre, cliente, cuenta, telefono, direccion, numExt, numInt, codigoPostal, municipio, colonia, estado, referencia, entreCalles, pais, razonSocial, correo, nombreClienteMavi, apellidoPaternoClienteMavi, apellidoMaternoClienteMavi, telefonoClienteMavi, idMagento(int), idCarrito, codigo_promotor, OrigenIdMagento, uen(int), rfc, sexo, bpGroup, fiscalRegimen, usoCfdi). OJO: `entreCalles` (:29), `rfc` (:71) y `sexo` (:73) EXISTEN en el modelo pero CrearSolicitudCreditoAsync manda "" en @entre_calles/@rfc/@sexo (:885, :879, :880).
- `OrderRequest` esta en Models/SAP/Order/OrderRequest.cs:5-54 (entityId, incrementId, storeId, status, subTotal, total, cuotas, impuesto, metodoPago, costoEnvio, metodoEnvio, docType, salesOrg, distrChan, division, salesOff, pmnttrms, usuarioPos, refDoc, refDocCat, articulos List<ArticuloRequest>, infoCliente, codigoRecogerSucursal, sucursalDestino(int), forzarOrder, state, RedimirMonedero(float), Agente, utmSource). ArticuloRequest (Models/SAP/Order/ArticuloRequest.cs:3-16): sku, precio, precioEspecial, cantidad(int), descuento, condicion.
- El SP devuelve el id con `SET @IdSolicitud = SCOPE_IDENTITY(); SELECT @IdSolicitud` (SPsOrden/SP_CREDITO_WEB_DATOS.sql:346-348) en la rama @Op='Insert' (:172).

## tabla_38_parametros

ARCHIVO: Methods/Order/OrderMethods.cs (CrearSolicitudCreditoAsync). Columna "tipo SP" tomada de SPsOrden/SP_CREDITO_WEB_DATOS.sql:92-159 (firma ALTER PROCEDURE).

#  | parametro            | SqlDbType C# | valor/origen en C#                                                        | linea C# | tipo SP (SP_CREDITO_WEB_DATOS.sql)
1  | @Id                  | Int          | 0                                                                         | 873      | INT (:92)
2  | @Op                  | VarChar      | "Insert"                                                                  | 874      | VARCHAR(20) (:93)
3  | @apellido_p          | VarChar      | info.apellidoPaternoClienteMavi ?? ""                                     | 875      | VARCHAR(30) (:94)
4  | @apellido_m          | VarChar      | info.apellidoMaternoClienteMavi ?? ""                                     | 876      | VARCHAR(30) (:95)
5  | @nombre              | VarChar      | info.nombreClienteMavi ?? ""                                              | 877      | VARCHAR(25) (:96)
6  | @fecha_nacimiento    | VarChar      | ""  (literal vacio)                                                       | 878      | DATE (:98)
7  | @rfc                 | VarChar      | ""  (literal vacio)                                                       | 879      | VARCHAR(13) (:99)
8  | @sexo                | VarChar      | ""  (literal vacio)                                                       | 880      | VARCHAR(9) (:100)
9  | @email               | VarChar      | info.correo ?? ""                                                         | 881      | VARCHAR(50) (:101)
10 | @direccion           | VarChar      | info.direccion ?? ""                                                      | 882      | VARCHAR(30) (:102)
11 | @exterior            | VarChar      | info.numExt ?? ""                                                         | 883      | VARCHAR(8) (:103)
12 | @interior            | VarChar      | info.numInt ?? ""                                                         | 884      | VARCHAR(8) (:104)
13 | @entre_calles        | VarChar      | ""  (literal vacio; info.entreCalles existe en el modelo :29 y NO se usa) | 885      | VARCHAR(80) (:105)
14 | @codigo_postal       | VarChar      | info.codigoPostal ?? ""                                                   | 886      | VARCHAR(6) (:108)
15 | @delegacion          | VarChar      | info.municipio ?? ""                                                      | 887      | VARCHAR(25) (:109)
16 | @poblacion           | VarChar      | info.municipio ?? ""                                                      | 888      | VARCHAR(30) (:110)
17 | @estado              | VarChar      | info.estado ?? ""                                                         | 889      | VARCHAR(30) (:111)
18 | @colonia             | VarChar      | info.colonia ?? ""                                                        | 890      | VARCHAR(30) (:112)
19 | @estado_civil        | VarChar      | ""  (literal vacio)                                                       | 891      | VARCHAR(11) (:113)
20 | @articulo            | VarChar      | ""  (literal vacio)                                                       | 892      | VARCHAR(20) (:127)
21 | @uen                 | Int          | uen  (int uen = order.storeId?.ToUpper().Equals("VIU") == true ? 2 : 1; :871) | 893  | INT (:128)
22 | @condicion           | VarChar      | order.articulos?.FirstOrDefault()?.condicion ?? ""                        | 894      | VARCHAR(20) (:129)
23 | @cliente             | VarChar      | info.cuenta ?? ""                                                         | 895      | VARCHAR(9) (:130)
24 | @utmSource           | VarChar      | order.utmSource ?? ""                                                     | 896      | VARCHAR(100) (:131)
25 | @sucursal            | Int          | uen.Equals(2) ? 505 : 504                                                 | 897      | INT (:133)
26 | @origen              | VarChar      | "PRODUCTOS MX"  (literal)                                                 | 898      | VARCHAR(20) (:134)
27 | @idMagento           | VarChar      | order.incrementId ?? "0"                                                  | 899      | VARCHAR(12) (:146)
28 | @MetodoEnvio         | VarChar      | order.metodoEnvio ?? ""                                                   | 900      | VARCHAR(12) (:147)
29 | @lada_particular     | VarChar      | "0"  (literal)                                                            | 901      | INT (:120)
30 | @telefono_particular | VarChar      | "0"  (literal)                                                            | 902      | VARCHAR(10) (:121)
31 | @lada_celular        | VarChar      | "0"  (literal)                                                            | 903      | INT (:122)
32 | @telefono_celular    | VarChar      | ValidateOnlyNumbers(info.telefono ?? "0")                                 | 904      | VARCHAR(10) (:123)
33 | @sucursalDestino     | Int          | order.sucursalDestino                                                     | 905      | INT = 0 (:150, declarado @SucursalDestino)
34 | @RedimirMonedero     | Money        | (decimal)order.RedimirMonedero                                            | 906      | MONEY (:152)
35 | @ValidacionTelefono  | Bit          | DBNull.Value                                                              | 907      | BIT (:153)
36 | @OrigenIdMagento     | VarChar      | info.OrigenIdMagento ?? ""                                                | 908      | VARCHAR(20) (:154)
37 | @LadaValidar         | VarChar      | ladaValidar  (parametro del metodo; calculado en ProcessCreditPaymentAsync :710) | 909 | INT (:155)
38 | @TelefonoValidar     | VarChar      | telefonoValidar (parametro del metodo; calculado en ProcessCreditPaymentAsync :711) | 910 | VARCHAR(10) (:156)

Parametros del SP que NO se mandan (usan default NULL/0 del SP, :92-159): @nombre_2, @years_old, @months_old, @vive_en_calidad, @sueldo, @tarjeta, @tarjeta_digitos, @credito_hipoteca, @credito_automotriz, @ext_archivo_1/2/3, @die, @parentesco_ref, @nombre_ref, @apellido_p_ref, @apellido_m_ref, @lada_particular_ref, @telefono_particular_ref, @tipo_tel_ref, @codigo, @ClienteMagento, @estatus (=0), @CodigoRecomendador, @Agente, @Curp, @FechaCita, @HoraCita.

Origen de ladaValidar/telefonoValidar (OrderMethods.cs:706-711, dentro de ProcessCreditPaymentAsync):
707|                var ladaDeDos = new string[] { "33", "55", "81" };
708|                var telAux = !string.IsNullOrWhiteSpace(numeroDelSms) ? numeroDelSms : (!string.IsNullOrWhiteSpace(numeroValidado) ? numeroValidado : (order.infoCliente?.telefono ?? "0"));
709|                var ladaLength = (telAux.Length >= 2 && ladaDeDos.Contains(telAux.Substring(0, 2))) ? 2 : 3;
710|                var ladaValidar = telAux.Length >= ladaLength ? telAux.Substring(0, ladaLength) : "0";
711|                var telefonoValidar = telAux.Length >= ladaLength ? telAux.Substring(ladaLength) : "0";

Comparativa con LAN (WebApiMagento/Metodos/CreditMethods.cs:150-188, mismos 38 nombres, mismo orden): en LAN @apellido_p/@apellido_m/@nombre/@fecha_nacimiento/@rfc/@sexo/@estado_civil salen de getClientInfo(data[0]) (datosCliente[1..6],[16]); @entre_calles = entreCalles.Length > 0 ? entreCalles : datosCliente[10]; @lada_particular=@lada_celular=ladaTel y @telefono_particular=@telefono_celular=telNum (telefono partido en lada+numero, :139-143); @origen = parametro origen (LAN OrderMethods.cs:646 lo manda como infoCliente["origen"] o "PRODUCTOS MX"); @ValidacionTelefono = (!isValidated) || !IsInTableStd(datosCliente[0]) ? 1 : 0 (:185); @cliente = datosCliente[0]. Los 38 SqlDbType de LAN son identicos a los de ServicioSAP (Int/VarChar/Money/Bit en las mismas posiciones).

## llamadores

GRAFO (de afuera hacia adentro). Unico invocador de CrearSolicitudCreditoAsync en todo ServicioSAP: OrderMethods.cs:714 (grep en Methods/, Controllers/, Models/, Helpers/: solo definicion :862 y llamada :714).

=== NIVEL 0: Magento -> DMZ ===
ARCHIVO: //CATECINF214034/Compartida/Migracion SAP/DMZ/WebApiMagento/Controllers/OrdersController.cs
15|    [RoutePrefix("order")]
107|        [HttpPost]
108|        [Route("setOrder")]
109|        public IHttpActionResult Set(OrderRequest order)
110|        {
111|            if (order == null)
112|                throw new HttpResponseException(HttpStatusCode.BadRequest);
113|
114|            Logger.SetOrder("INFO [" + order.incrementId + "] ", JsonConvert.SerializeObject(order));
...(116-127: if (order.metodoPago == CREDIT_METHOD) { /* legacy comentado */ })
...(132-183: POST doble a LAN "order/setOrder" COMENTADO)
191|                try
192|                {
193|                    Curl curl = new Curl();
194|                    Logger.SAP("ORDER_BODY_MAGENTO [" + order.incrementId + "] ", JsonConvert.SerializeObject(order));
195|
196|                    responseSAP = curl.PostSAP("order/new", JsonConvert.SerializeObject(order)).Trim('"');
197|                    Logger.SetOrder("SAP RESPONSE [" + order.incrementId + "] ", responseSAP);
198|                    Logger.SAP("ORDER_NEW [" + order.incrementId + "] ", responseSAP);
199|                }
200|                catch (Exception e)
201|                {
202|                    Logger.SetOrder("SAP ERROR [" + order.incrementId + "] ", e.Message);
203|                    Logger.SAP("ORDER_NEW_ERROR [" + order.incrementId + "] ", e.Message);
204|                    return InternalServerError();
205|                }
(Curl.PostSAP: DMZ Helper/Curl.cs:115-148, IpSAP = AppSettings["URL_SAP"] = "https://kdll3fhcyo-lan.grupomavi.com/SAP/" (DMZ Web.config:18); token de IpSAP + "login/auth" (Curl.cs:80).)

=== NIVEL 1: DMZ -> ServicioSAP Controller ===
ARCHIVO: //CATECINF214034/Compartida/Migracion SAP/ServicioSAP/ServicioSap/ServicioSap/Controllers/OrderController.cs
1|using ServicioSap.Methods.Order;
2|using ServicioSap.Methods.SalesDistribution;
3|using ServicioSap.Models.SAP.Order;
4|using System;
5|using System.Linq;
6|using System.Net;
7|using System.Threading.Tasks;
8|using System.Web.Http;
9|
10|namespace ServicioSap.Controllers
11|{
12|    [Authorize]
13|    [RoutePrefix("order")]
14|    public class OrderController : ApiController
15|    {
16|        [HttpPost]
17|        [Route("new")]
18|        public async Task<IHttpActionResult> SetOrder(OrderRequest order)
19|        {
20|            if (order == null)
21|            {
22|                throw new HttpResponseException(HttpStatusCode.BadRequest);
23|            }
24|            var orderMethods = new OrderMethods();
25|            try
26|            {
27|                var newOrder = await orderMethods.SetOrderAsync(order, "Insert");
28|                var simplifiedResponse = new
29|                {
30|                    BP = newOrder.Zctefinal,
31|                    SalesDocument = newOrder.to_result?.Salesdocument?.TrimStart('0') ?? newOrder.PurchNoS,
32|                    Message = newOrder.Resultado == "Error" ? newOrder.Zobservaciones : (newOrder.to_return?.results?.FirstOrDefault()?.Message ?? ""),
33|                    Resultado = newOrder.Resultado
34|                };
35|                return Ok(simplifiedResponse);
36|            }
37|            catch (Exception e)
38|            {
39|                // PARIDAD CON LAN: setOrder NUNCA devolvia un status de error.
40|                // LAN Controllers/OrdersController.cs:156 hace `return Ok(e.ToString())`, es decir
41|                // HTTP 200 incluso al reventar, y el DMZ es un puente que reenvia tal cual.
42|                // Devolver 400 aqui cambia lo que recibe Magento y romperia su flujo (dejaria de
43|                // hacer el polling del credito). Se conserva el 200; el detalle viaja en el cuerpo.
44|                // Se usa e.Message y no e.ToString() para no exponer el stack trace a Magento.
45|                ServicioSap.Helpers.Logger.SAP("[ORDER NEW ERROR] ", $"incrementId={order?.incrementId} :: {e}");
46|                return Ok("Error, " + e.Message);
47|            }
48|        }
(Otro llamador de SetOrderAsync: OrderController.cs:72-100 [Route("setreturn")] SetReturn -> orderMethods.SetOrderAsync(newRequest, "return") (:85); esa rama sale en SetOrderAsync:1816-1819 hacia ProcesarDevolucionSAPAsync y NUNCA llega al credito.)

=== NIVEL 2: SetOrderAsync -> ProcessCreditPaymentAsync ===
ARCHIVO: Methods/Order/OrderMethods.cs
1812|        public async Task<OrderResponse> SetOrderAsync(OrderRequest orderRequest, string tipo = "")
1813|        {
1814|            try
1815|            {
1816|                if (string.Equals(tipo, "return", StringComparison.OrdinalIgnoreCase))
1817|                {
1818|                    return await ProcesarDevolucionSAPAsync(orderRequest).ConfigureAwait(false);
1819|                }
...
1824|                orderRequest = AgruparCantidadPorSKU(orderRequest);
1825|                string[] sDatosPedido = ToArray(orderRequest);
1826|                string incrementId = sDatosPedido[0];
...(1832-1844 idempotencia SD36: solo si forzarOrder == "0" || metodoPago == PAYPAL_METHOD)
...(1849-1864 OPENPAY_METHOD early exit / OPENPAY_STORES_METHOD)
1866|                // ========================================================================
1867|                // FASE 3: VALIDACIÓN CRÉDITO - EARLY EXIT
1868|                // ========================================================================
1869|                if (orderRequest.metodoPago == CREDIT_METHOD)
1870|                {
1871|                    List<string> articulos = new List<string>();
1872|                    foreach (var articulo in orderRequest.articulos)
1873|                    {
1874|                        articulos.Add(articulo.cantidad + "," + articulo.sku);
1875|                    }
1876|                    if (orderRequest.costoEnvio > 0)
1877|                        articulos.Add(orderRequest.costoEnvio + ",SEGU00001");
1878|
1879|                    var numeroDelSms = await ObtenerNumeroTablaSmsAsync(sDatosPedido[36]).ConfigureAwait(false);
1880|                    var numeroValidado = await IsValidatedAsync(sDatosPedido[36]).ConfigureAwait(false);
1881|                    var isValidated = numeroValidado == numeroDelSms;
1882|
1883|                    string cuentaCredito = await ProcessCreditPaymentAsync(orderRequest, sDatosPedido, articulos, numeroValidado, numeroDelSms, isValidated).ConfigureAwait(false);
1884|                    Console.WriteLine($"[SetOrder] Crédito: Solicitud creada para cuenta {cuentaCredito}");
1885|                    return new OrderResponse
1886|                    {
1887|                        Resultado = "Concluido",
1888|                        Zctefinal = cuentaCredito,
1889|                        Zidecomm = incrementId
1890|                    }; // Crédito no va a SAP aquí
1891|                }
(CREDIT_METHOD = "omnipro_pago_credito", OrderMethods.cs:44. sDatosPedido[36] = order.infoCliente?.cuenta ?? "" segun ToArray, OrderMethods.cs:198-292: indices 0 incrementId, 1 cliente|"0", 2 storeId, 3 subTotal, 4 total, 5 impuesto, 6 metodoPago, 7 costoEnvio, 8 sku(csv), 9 precio(csv), 10 precioEspecial(csv), 11 cantidad(csv), 12 descuento(csv), 13 nombre, 14 direccion, 15 numExt, 16 numInt, 17 codigoPostal, 18 municipio, 19 colonia, 20 estado, 21 telefono(solo digitos), 22 referencia, 23 pais, 24 razonSocial, 25 "impuesto extra", 26 nombreClienteMavi, 27 apellidoPaternoClienteMavi, 28 apellidoMaternoClienteMavi, 29 correo, 30 telefonoClienteMavi(solo digitos), 31 metodoEnvio, 32 cuotas, 33 codigoRecogerSucursal, 34 entityId, 35 Agente, 36 cuenta, 37 RedimirMonedero => 38 elementos.)

=== NIVEL 3: ProcessCreditPaymentAsync -> CrearSolicitudCreditoAsync (bloque llamador verbatim 682-738) ===
682|        private async Task<string> ProcessCreditPaymentAsync(OrderRequest order, string[] datosArray, List<string> articulos, string numeroValidado, string numeroDelSms, bool isValidated)
683|        {
684|            try
685|            {
686|                string cuentaBp = order.infoCliente?.cuenta ?? "";
687|                string idClienteMagento = order.infoCliente?.cliente ?? "";
688|
689|                bool esClienteNuevo = string.IsNullOrWhiteSpace(cuentaBp) && !string.IsNullOrWhiteSpace(idClienteMagento);
690|                bool esInvitado = string.IsNullOrWhiteSpace(cuentaBp) && string.IsNullOrWhiteSpace(idClienteMagento);
691|
692|                if (esInvitado)
693|                    throw new Exception("Los invitados no pueden pagar con crédito.");
694|
695|                // Si no es nuevo (cliente de casa), validamos existencia y saldo en SAP
696|                if (!esClienteNuevo)
697|                {
698|                    if (!await CheckClientCreditAsync(cuentaBp).ConfigureAwait(false))
699|                        throw new Exception($"El cliente BP {cuentaBp} no tiene crédito activo en SAP.");
700|
701|                    //decimal saldoDisponible = await CheckClientBalanceAsync(cuentaBp);
702|                    //if (saldoDisponible < order.total)
703|                    //    throw new Exception($"Saldo insuficiente. Disponible: {saldoDisponible}");
704|                }
705|
706|                // Parsear teléfono validado
707|                var ladaDeDos = new string[] { "33", "55", "81" };
708|                var telAux = !string.IsNullOrWhiteSpace(numeroDelSms) ? numeroDelSms : (!string.IsNullOrWhiteSpace(numeroValidado) ? numeroValidado : (order.infoCliente?.telefono ?? "0"));
709|                var ladaLength = (telAux.Length >= 2 && ladaDeDos.Contains(telAux.Substring(0, 2))) ? 2 : 3;
710|                var ladaValidar = telAux.Length >= ladaLength ? telAux.Substring(0, ladaLength) : "0";
711|                var telefonoValidar = telAux.Length >= ladaLength ? telAux.Substring(ladaLength) : "0";
712|
713|                // Crear solicitud en Android
714|                int idSolicitud = await CrearSolicitudCreditoAsync(order, datosArray, ladaValidar, telefonoValidar).ConfigureAwait(false);
715|                if (idSolicitud <= 0)
716|                    throw new Exception("No se pudo generar la solicitud de crédito.");
717|
718|                // Insertar artículos
719|                string codigoPostal = order.infoCliente?.codigoPostal ?? "";
720|                string condicion = order.articulos?.FirstOrDefault()?.condicion ?? "";
721|                // PARIDAD DE CONTRATO: un fallo al insertar las lineas NO debe cambiar lo que
722|                // recibe Magento. LAN nunca devolvia error desde setOrder (OrdersController.cs:156
723|                // hace `return Ok(e.ToString())`, HTTP 200 incluso al reventar), y el DMZ es un
724|                // puente: si aqui propagaramos, Magento recibiria un 400 donde antes recibia la
725|                // cuenta, y dejaria de hacer el polling del credito.
726|                // El fallo SI se registra de forma persistente (Logger.SAP), no solo en consola.
727|                try
728|                {
729|                    await InsertCreditArticlesAsync(order, articulos.ToArray(), idSolicitud.ToString(), condicion, codigoPostal).ConfigureAwait(false);
730|                }
731|                catch (Exception exArt)
732|                {
733|                    ServicioSap.Helpers.Logger.SAP(
734|                        "[CREDITO ARTICULOS ERROR] ",
735|                        $"solicitud={idSolicitud} incrementId={order.incrementId} cuenta={order.infoCliente?.cuenta} :: {exArt.Message}");
736|                    Console.WriteLine($"[ProcessCreditPayment] La solicitud {idSolicitud} quedo SIN LINEAS DE ARTICULO: {exArt.Message}");
737|                }
738|
(continua: 748-753 codigo_promotor -> HandlePromoCodeAsync(codigoPromotor, order.incrementId, "Elimina"); 756-793 bloque liberador COMENTADO; 795 `return esClienteNuevo ? idClienteMagento : cuentaBp;`; 797-801 catch relanza `throw;`. Cierra en 802.)
CheckClientCreditAsync: OrderMethods.cs:804-817 -> BusinessPartnerMethods.GetClientAsync(cliente); true si partner != null && !string.IsNullOrEmpty(partner.BusinessPartner).

Referencia LAN del mismo punto de enganche: LAN/WebApiMagento/Metodos/OrderMethods.cs:609-650 (if (order.metodoPago == CREDIT_METHOD) { ... cm.ProductosCreditoWeb_SaveData(new string[]{ cuenta, uen "2"|"1", incrementId, correo, total, articulos[0]["condicion"], codigo_promotor }, articulos.ToArray(), sDatosPedido, utmSource, sucursalDestino, codigoPostal, RedimirMonedero, entreCalles, (numeroDelSms.Length > 0) ? numeroDelSms : numeroValidado, isValidated, OrigenIdMagento, entityId, origen|"PRODUCTOS MX"); return order.infoCliente["cuenta"]; }).

## consumidores_id

TODO lo que toca el id devuelto por CrearSolicitudCreditoAsync (int idSolicitud, OrderMethods.cs:714):

1) Guarda de validez — OrderMethods.cs:715-716: `if (idSolicitud <= 0) throw new Exception("No se pudo generar la solicitud de crédito.");` (CrearSolicitudCreditoAsync devuelve 0 si no hay filas :923 o si hay excepcion :930).

2) InsertCreditArticlesAsync — llamada OrderMethods.cs:729: `await InsertCreditArticlesAsync(order, articulos.ToArray(), idSolicitud.ToString(), condicion, codigoPostal)`; recibe `string idSolicitud` (firma :946). Uso interno verbatim:
946|        private async Task InsertCreditArticlesAsync(OrderRequest order, string[] articulos, string idSolicitud, string condicion, string codigoPostal)
947|        {
948|            if (articulos == null || articulos.Length == 0)
949|            {
950|                Console.WriteLine("[InsertCreditArticles] Sin articulos que insertar para la solicitud " + idSolicitud);
951|                return;
952|            }
953|
954|            if (!int.TryParse(idSolicitud, out int idSolicitudInt) || idSolicitudInt <= 0)
955|                throw new Exception($"[InsertCreditArticles] idSolicitud invalido: '{idSolicitud}'.");
...
1000|                        var pId = cmd.Parameters.Add("@IdCredito", SqlDbType.Int);
...
1018|                                pId.Value = int.Parse(idSolicitud);
...
1098|                    Console.WriteLine($"Error InsertCreditArticles (solicitud {idSolicitud}, insertados {insertados}): {ex.Message}");
...
1103|            Console.WriteLine($"[InsertCreditArticles] Solicitud {idSolicitud}: {insertados} de {articulos.Length} lineas insertadas, {sinPrecio} sin precio de SD29.");
1104|
1105|            if (insertados == 0)
1106|                throw new Exception($"[InsertCreditArticles] No se inserto ninguna linea para la solicitud {idSolicitud}.");
(La columna destino es VTASdArtCreditoWeb.IdArtCreditoWeb, :994-996. El `codigoPostal` recibido NO se usa dentro del metodo; `idSolicitudInt` de :954 tampoco se reutiliza, se vuelve a parsear en :1018.)

3) Log de error de lineas — OrderMethods.cs:733-736 (Logger.SAP "[CREDITO ARTICULOS ERROR] " con `solicitud={idSolicitud}` y Console.WriteLine).

4) Bloque liberador + callback a Magento — OrderMethods.cs:756-793: EXISTE pero esta COMENTADO (/* ... */ :760-792), es decir INACTIVO hoy:
756|                if (esClienteNuevo)
757|                {
758|                    // PENDIENTE: Servicio de Liberador y Callback a Magento están incompletos en DMZ.
759|                    // Se comenta para no bloquear el flujo funcional.
760|                    /*
761|                    string capturedEntityId = order.entityId ?? "";
762|                    string capturedCliente = idClienteMagento; // Usamos ID de Magento al no tener BP aún
763|                    int capturedIdSol = idSolicitud;
764|                    int capturedUen = order.storeId?.ToUpper().Equals("VIU") == true ? 2 : 1;
765|
766|                    var liberadorThread = new System.Threading.Thread(() =>
767|                    {
768|                        try
769|                        {
770|                            var liberador = new ServicioSap.Methods.Credit.LiberadorCreditoMethods();
771|                            var resultado = liberador.LiberarCliente(capturedCliente, capturedIdSol, capturedUen);
772|                            await CallMagentoAuthorizationCallbackAsync(
773|                                capturedEntityId,
774|                                resultado.Status,
775|                                capturedCliente,
776|                                resultado.IdVenta > 0 ? resultado.IdVenta : capturedIdSol
777|                            );
778|                        }
779|                        catch (Exception ex)
780|                        {
781|                            Console.WriteLine($"ERROR LiberadorThread: entityId={capturedEntityId} {ex.Message}");
782|                            await CallMagentoAuthorizationCallbackAsync(
783|                                capturedEntityId,
784|                                "RECHAZADO",
785|                                capturedCliente,
786|                                capturedIdSol
787|                            );
788|                        }
789|                    });
790|                    liberadorThread.IsBackground = true;
791|                    liberadorThread.Start();
792|                    */
793|                }

5) LiberateClientCredit — OrderMethods.cs:1259-1271. INVOCADORES: NINGUNO (grep en todo ServicioSAP: solo la definicion :1259 y su propio log :1268; el bloque comentado :770-771 usa LiberadorCreditoMethods directo, no este wrapper).
1256|        /// <summary>
1257|        /// Libera un cliente en el servicio externo de Liberador de Crédito.
1258|        /// </summary>
1259|        private LiberadorResult LiberateClientCredit(string cliente, int idSolicitud, int uen)
1260|        {
1261|            try
1262|            {
1263|                var liberador = new LiberadorCreditoMethods();
1264|                return liberador.LiberarCliente(cliente, idSolicitud, uen);
1265|            }
1266|            catch (Exception ex)
1267|            {
1268|                Console.WriteLine("Error LiberateClientCredit: " + ex.Message);
1269|                return new LiberadorResult { Status = "RECHAZADO", IdVenta = 0 };
1270|            }
1271|        }
   Delegado real: Methods/Credit/LiberadorCreditoMethods.cs:48-107 `public LiberadorResult LiberarCliente(string cliente, int id, int uen)`: struct LiberadorResult { string Status; int IdVenta; } (:9-13); lee AppSettings AUTENTICACION_URL_LIBERADOR / VETA_URL_LIBERADOR / PASSWORD_AUTENTICACION_LIBERADOR (:43-45; Web.config:41-43); POST login {Password} (:77-80), luego POST a _ventaUrl con {Cliente, Id, UEN} (:63-68, :85-88) via WebClient sincrono; deserializa ResponseData {id, cliente, uen, idVenta} (:33-39, :90); devuelve EN_ANALISIS con IdVenta (:92-99) o RECHAZADO en error/config faltante (:55, :105). El id de solicitud viaja en el campo `Id` del payload al liberador.

6) CallMagentoAuthorizationCallbackAsync — OrderMethods.cs:1276-1364. INVOCADORES ACTIVOS: NINGUNO (solo dentro del bloque comentado :772 y :782). Firma :1276 `private async Task CallMagentoAuthorizationCallbackAsync(string entityId, string status, string cuenta, int idSolicitud = 0)`. Usa AppSettings URL_DMZ (:1279; Web.config:57 = "https://localhost:44302/") + "login/authenticate" (:1280) y + "order/authorizationResult" (:1281); USER_DMZ (:1284; Web.config:56). Hasta 3 intentos (:1295), HttpClient con cert callback true (:1299-1300), token = Trim('"') del POST de auth (:1325), Bearer (:1329-1330). Payload verbatim :1333-1339:
1333|                        var payload = new
1334|                        {
1335|                            entity_id = entityId,
1336|                            status = status,
1337|                            customer_account = cuenta,
1338|                            credit_request_id = idSolicitud
1339|                        };
   Receptor DMZ: DMZ/WebApiMagento/Controllers/OrdersController.cs:422-427 `[Route("authorizationResult")] public async Task<IHttpActionResult> AuthorizationResult([FromBody] CreditAuthorizationRequest request)` -> AppSettings["URL_MAGENTO"] + "rest/V1/omnipro-credito/authorizationResult" (:427). Modelo DMZ Models/CreditRequest.cs:212+ CreditAuthorizationRequest { entityId, status, ... }.

7) Valor de retorno hacia Magento — el id NO sale en la respuesta: ProcessCreditPaymentAsync devuelve `esClienteNuevo ? idClienteMagento : cuentaBp` (:795); SetOrderAsync responde OrderResponse { Resultado="Concluido", Zctefinal=cuentaCredito, Zidecomm=incrementId } (:1885-1890); OrderController.cs:28-35 lo aplana a { BP = Zctefinal, SalesDocument, Message, Resultado }.

8) Otros lectores del id en ServicioSAP: NO EXISTE ninguno (grep de CRED_SOLICITUD_WEB_DATOS, VTASdArtCreditoWeb, "idSolicitud" fuera de OrderMethods.cs: sin resultados en Methods/, Controllers/, Models/).

Referencia LAN de consumidores (LAN/WebApiMagento/Metodos/CreditMethods.cs:199-241): tras leer IdSolicitud del reader (:190-197), `CreditoWeb_InsertArticulo(articulos, IdSolicitud, condicion, cp)` (:201), `CodigoPromocion(data[6], "Elimina", data[2])` si data[6].Length > 0 (:203-206), y si data[0].ToUpper().StartsWith("C") lanza el hilo liberador con `liberador.LiberarCliente(capturedCliente, capturedIdSol, capturedUen)` y `OrderMethods.CallMagentoAuthorizationCallback(entityId, status, cuenta, idSolicitud: resultado.IdVenta > 0 ? resultado.IdVenta : capturedIdSol)` (:208-241).

## telefono_actual

ARCHIVO: Methods/Order/OrderMethods.cs (todos privados de instancia).

=== ObtenerNumeroTablaSmsAsync (575-603) ===
575|        /// <summary>
576|        /// Obtiene número de teléfono SMS del cliente desde tabla de envío de mensajes.
577|        /// Busca el número más reciente registrado.
578|        /// </summary>
579|        private async Task<string> ObtenerNumeroTablaSmsAsync(string cliente)
580|        {
581|            try
582|            {
583|                var db = new conexionSQL();
584|                using (var sqlConnection = await db.obtenerConexionAndroidAsync().ConfigureAwait(false))
585|                using (var sqlCommand = sqlConnection.CreateCommand())
586|                {
587|                    sqlCommand.CommandText =
588|                        "SELECT TOP 1 LTRIM(RTRIM(T.Telefono)) FROM TcAAEA00030_EnvioMensajes T WITH(NOLOCK) " +
589|                        "INNER JOIN VTASDCodigoVerificacioneCommerce V WITH(NOLOCK) ON V.Telefono = T.Telefono " +
590|                        "WHERE V.Cliente = @Cliente ORDER BY T.Id DESC";
591|                    sqlCommand.CommandTimeout = 99999;
592|                    sqlCommand.Parameters.Add("@Cliente", SqlDbType.VarChar).Value = cliente ?? string.Empty;
593|
594|                    object result = await sqlCommand.ExecuteScalarAsync().ConfigureAwait(false);
595|                    return result?.ToString() ?? "";
596|                }
597|            }
598|            catch (Exception ex)
599|            {
600|                Console.WriteLine("Error ObtenerNumeroTablaSms() => " + ex.Message);
601|                return "";
602|            }
603|        }
(OJO: hace JOIN por V.Telefono = T.Telefono. La version estatica de Methods/Credit/CreditMethods.cs:262-295 y la de LAN OrderMethods.cs:819-850 y el propio SP (SP_CREDITO_WEB_DATOS.sql:204-208) usan otro criterio: CreditMethods/LAN -> `WHERE IdRegistro IN (SELECT IdCodigoVerificacioneCommerce FROM VTASDCodigoVerificacioneCommerce CV WHERE CV.Cliente = '{0}') ORDER BY Id DESC`; SP -> `WHERE Cliente = @cliente ORDER BY Id DESC`.)

=== IsValidatedAsync (605-650) — devuelve string (telefono), no bool ===
605|        /// <summary>
606|        /// Obtiene teléfono validado del cliente desde SAP BP05.
607|        /// Equivalente legacy: SELECT TOP 1 CONCAT(Lada, Telefono) FROM CteTel WHERE Cliente=@Cliente AND Tipo='Movil' AND ValidacionTel=1
608|        ///
609|        /// IMPORTANTE — por que NO se usa GetClientAsync (ZB_DATOS_CLIENTE_CDS):
610|        /// esa vista NO expone el campo de validacion. Verificado contra response real: sus campos
611|        /// de telefono son zidcteTel, ztipoCte, ztelCte, zfecha, zenvioNip, zappOrig, zfechaCap,
612|        /// zelExist, ztraeTel, zintentos y ztipoValid — NO trae zvalTel. Al deserializar,
613|        /// Partner.zvalTel se quedaba en el default de C# (false), asi que la condicion
614|        /// !partner.zvalTel era SIEMPRE verdadera y este metodo devolvia "" pase lo que pase.
615|        /// Ademas ztelCte llegaba vacio y la vista repite el mismo BP en N filas (producto
616|        /// cartesiano de telefonos x direcciones), asi que tomar la primera era arbitrario.
617|        ///
618|        /// BP05MA (ZAPI_BP05MA_SRV, el servicio que expone AS_GET_BP_MA) si trae el dato, en la
619|        /// coleccion to_CteTel: ZtelCte, Zvaltel, ZappOrig, ZtipoCte.
620|        /// </summary>
621|        private async Task<string> IsValidatedAsync(string cliente)
622|        {
623|            try
624|            {
625|                var bpMethods = new BusinessPartnerMethods();
626|                var partnerMa = await bpMethods.GetClientMaAsync(cliente).ConfigureAwait(false);
627|
628|                var telefonos = partnerMa?.To_CteTel?.Results;
629|                if (telefonos == null || telefonos.Count == 0)
630|                    return "";
631|
632|                // Replica el WHERE del legacy sobre la coleccion:
633|                //   Tipo = 'Movil'  ->  ZtipoCte (en SAP llega como "MOVIL")
634|                //   ValidacionTel=1 ->  Zvaltel
635|                //   IsInTableStd    ->  ZappOrig con origen registrado
636|                var validado = telefonos.FirstOrDefault(t =>
637|                    t != null
638|                    && t.Zvaltel
639|                    && !string.IsNullOrWhiteSpace(t.ZappOrig)
640|                    && !string.IsNullOrWhiteSpace(t.ZtelCte)
641|                    && string.Equals(t.ZtipoCte, "MOVIL", StringComparison.OrdinalIgnoreCase));
642|
643|                return validado?.ZtelCte ?? "";
644|            }
645|            catch (Exception ex)
646|            {
647|                Console.WriteLine("Error IsValidated() => " + ex.Message);
648|                return "";
649|            }
650|        }
(GetClientMaAsync: Methods/BusinessPartner/BusinessPartnerMethods.cs:297-340, GET a /ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='{partnerId}',Client='{client}')?$expand=to_CteTel,... ; devuelve BusinessPartnerMa (Models/SAP/BusinessPartner/BP05MA/BusinessPartnerMa.cs:11, `NavigationCollection<BusinessPhone> To_CteTel` en :129). BusinessPhone: Models/SAP/BusinessPartner/BP05MA/BusinessEntitiesMa.cs:5-21 { Partner, Client, ZidcteTel, ZtipoCte, ZtelCte, Zfecha, bool Zenvionip, bool Zvaltel, ZappOrig, ZfechaCap, bool ZtelExist, bool ZtraeTel, Zintentos, ZtipoValid }. Lanza excepcion si SAP falla (:318, :338) -> el catch de :645 la convierte en "".)

=== HasValidPhoneOriginSAPAsync (652-677) — SIN INVOCADORES ===
652|        /// <summary>
653|        /// Verifica si el cliente tiene un teléfono validado con origen de validación registrado.
654|        /// Equivalente legacy: SELECT FROM tablastd tsdt JOIN ctetel ct ON ct.AppOrigen = tsdt.Nombre 
655|        ///   WHERE ct.Cliente=@Cliente AND tsdt.TablaSt='ORIGEN VALIDACION NUMERO CTE' AND ct.ValidacionTel=1
656|        /// Ahora consume Partner.zvalTel y Partner.zappOrig desde la respuesta de BP05.
657|        /// </summary>
658|        private async Task<bool> HasValidPhoneOriginSAPAsync(string cliente)
659|        {
660|            try
661|            {
662|                var bpMethods = new BusinessPartnerMethods();
663|                var partner = await bpMethods.GetClientAsync(cliente).ConfigureAwait(false);
664|
665|                if (partner == null)
666|                    return false;
667|
668|                // zvalTel = ValidacionTel (teléfono validado)
669|                // zappOrig = AppOrigen (origen de la validación, antes se validaba contra catálogo tablastd)
670|                return partner.zvalTel && !string.IsNullOrWhiteSpace(partner.zappOrig);
671|            }
672|            catch (Exception ex)
673|            {
674|                Console.WriteLine("Error HasValidPhoneOriginSAP() => " + ex.Message);
675|                return false;
676|            }
677|        }
INVOCADORES de HasValidPhoneOriginSAPAsync: NINGUNO (grep en Methods/, Controllers/: unica aparicion es la definicion :658). Es codigo muerto. Ademas el propio doc-comment de IsValidatedAsync (:609-614) explica que GetClientAsync (ZB_DATOS_CLIENTE_CDS) NO trae zvalTel, por lo que este metodo devolveria siempre false.

=== Calculo isValidated y su (no) uso ===
OrderMethods.cs:1879-1883:
1879|                    var numeroDelSms = await ObtenerNumeroTablaSmsAsync(sDatosPedido[36]).ConfigureAwait(false);
1880|                    var numeroValidado = await IsValidatedAsync(sDatosPedido[36]).ConfigureAwait(false);
1881|                    var isValidated = numeroValidado == numeroDelSms;
1882|
1883|                    string cuentaCredito = await ProcessCreditPaymentAsync(orderRequest, sDatosPedido, articulos, numeroValidado, numeroDelSms, isValidated).ConfigureAwait(false);
- sDatosPedido[36] = order.infoCliente?.cuenta ?? "" (ToArray, OrderMethods.cs:288). Para cliente nuevo (cuenta vacia) ambas consultas se hacen con "" .
- `isValidated` entra a ProcessCreditPaymentAsync como parametro `bool isValidated` (:682) y NO SE USA en ninguna linea del cuerpo (683-802). No se pasa a CrearSolicitudCreditoAsync (:714 solo recibe order, datosArray, ladaValidar, telefonoValidar).
- `numeroValidado` y `numeroDelSms` SI se usan: solo para armar telAux -> ladaValidar/telefonoValidar (:708-711).
- @ValidacionTelefono se manda DBNull.Value (:907). El SP lo recalcula siempre (SP_CREDITO_WEB_DATOS.sql:185-221: @ValidacionOrigen desde ERPMAVI.IntelisisTmp.dbo.TablaStD JOIN CteTel, @TelefonoValidado desde CteTel Tipo='Movil' ValidacionTel=1, @TelefonoAValidar desde TcAAEA00030_EnvioMensajes WHERE Cliente=@cliente; `IF (@TelefonoValidado IS NULL OR @ValidacionOrigen IS NULL OR @TelefonoValidado != @TelefonoAValidar) SELECT @ValidacionTelefono = IIF(SUBSTRING(@cliente, 1, 1) != 'P', 1, 0); ELSE SELECT @ValidacionTelefono = 0;`).

=== Metodo paralelo (estatico) en Methods/Credit/CreditMethods.cs — SIN INVOCADORES ===
CreditMethods.cs:230-260 `public static async Task<bool> IsValidatedAsync(string cliente)`: usa bpMethods.GetClientAsync(cliente) (:237), `string telefonoSap = partner.TelefonoMovil ?? partner.ztelCte ?? partner.Telefono ?? "";` (:240) solo digitos (:241), compara contra `ObtenerNumeroTablaSmsAsync(cliente)` privado estatico (:262-295, query por IdRegistro IN subselect) y devuelve `!string.IsNullOrEmpty(telefonoSms) && telefonoSap == telefonoSms` (:253). INVOCADORES: NINGUNO (grep: solo definicion :230). OrderMethods NO lo usa (usa su propio IsValidatedAsync de instancia :621).

LAN de referencia: LAN/WebApiMagento/Metodos/OrderMethods.cs:786-817 IsValidated (SELECT TOP 1 CONCAT(ct.Lada, ct.Telefono) FROM CteTel ... Tipo='Movil' AND ValidacionTel=1 ORDER BY Fecha DESC) y :819-850 ObtenerNumeroTablaSms; LAN CreditMethods.cs:1967-1989 IsInTableStd (tablastd JOIN ctetel ... TablaSt='ORIGEN VALIDACION NUMERO CTE' AND validacionTel=1), usado en :185 para @ValidacionTelefono.

## sms_insert_actual

UNICO lugar en ServicioSAP que inserta en TcAAEA00030_EnvioMensajes (grep "EnvioMensajes|Sms|SMS|Mensajes" en Methods/, Controllers/, Helpers/: inserta solo CreditMethods.cs:137; el resto son SELECT en CreditMethods.cs:270 y OrderMethods.cs:588, y `ZcodSms = 0` en payloads BP de BusinessPartnerMethods.cs:635 y OrderMethods.cs:2905).

ARCHIVO: Methods/Credit/CreditMethods.cs (class CreditMethods, namespace ServicioSap.Methods.Credit, todo estatico; usings :1-7: System; System.Collections.Generic; System.Data.SqlClient; System.Text.RegularExpressions; System.Threading.Tasks; ServicioSap.Helpers.ConexionDB; ServicioSap.Models.SAP.Credit).

117|        public static async Task<Dictionary<string, int>> SendSmsNewNumberAsync(SendSmsNewNumberRequest request)
118|        {
119|            request.NumeroTelefono = Regex.Replace(request.NumeroTelefono, "[^0-9]", "");
120|            try
121|            {
122|                var conexionHelper = new conexionSQL();
123|                using (var sqlConnection = await conexionHelper.obtenerConexionAndroidAsync().ConfigureAwait(false))
124|                {
125|                    var idRef = await GetIdRefAsync(request.Cliente, request.IdCarrito, conexionHelper).ConfigureAwait(false);
126|                    if (idRef == "0" || string.IsNullOrEmpty(idRef))
127|                    {
128|                        idRef = await InsertCodigoVerificacionAsync(request.Cliente, request.IdCarrito, conexionHelper).ConfigureAwait(false);
129|                    }
130|
131|                    // Si sigue vacio no avanzamos
132|                    if (string.IsNullOrEmpty(idRef)) return new Dictionary<string, int> { { "result", -1 } };
133|
134|                    int idMensaje = !request.EsCredito ? 60 : 23;
135|                    string identificador = !request.EsCredito ? "DM0312" : "DM0363";
136|                    
137|                    var strQuery = string.Format(@"INSERT INTO TcAAEA00030_EnvioMensajes 
138|                    (IdRegistro, IdMensaje, Cliente, FechaEnvio, EstatusEnvio, ClienteF, Tipo, IntentoRespuesta, 
139|                     IntentoEnvio, Modem, Identificador, Telefono)
140|                    VALUES ({0}, {1}, '{2}', GETDATE(), 1, NULL, 0, 0, 0, NULL, '{3}', '{4}')",
141|                        idRef, idMensaje, request.Cliente, identificador, request.NumeroTelefono);
142|                    
143|                    using (var sqlCommand = new SqlCommand(strQuery, sqlConnection))
144|                    {
145|                        sqlCommand.CommandTimeout = 9999999;
146|                        var recordsAffected = await sqlCommand.ExecuteNonQueryAsync().ConfigureAwait(false);
147|                        return new Dictionary<string, int> { { "result", recordsAffected } };
148|                    }
149|                }
150|            }
151|            catch (Exception ex)
152|            {
153|                ServicioSap.Helpers.Logger.SAP("[CREDIT SendSmsNewNumber ERROR] ", ex.Message);
154|                return new Dictionary<string, int> { { "result", -1 } };
155|            }
156|        }

Columnas insertadas (:138-139) y valores (:140-141): IdRegistro={idRef} | IdMensaje={60 si !EsCredito, 23 si EsCredito} | Cliente='{request.Cliente}' | FechaEnvio=GETDATE() | EstatusEnvio=1 | ClienteF=NULL | Tipo=0 | IntentoRespuesta=0 | IntentoEnvio=0 | Modem=NULL | Identificador='{DM0312 si !EsCredito, DM0363 si EsCredito}' | Telefono='{request.NumeroTelefono solo digitos}'.

Dependencias del mismo archivo:
158|        private static async Task<string> GetIdRefAsync(string cliente, string idCarrito, conexionSQL conexionHelper)
...
165|                    var sQuery = string.Format(@"SELECT ISNULL(MAX(IdCodigoVerificacioneCommerce), '') as IdRef
166|                    FROM VTASDCodigoVerificacioneCommerce WITH(NOLOCK) 
167|                    WHERE Cliente = '{0}' AND IdCarrito = '{1}'", cliente, idCarrito);
(158-189; devuelve "" en error)
191|        private static async Task<string> InsertCodigoVerificacionAsync(string cliente, string idCarrito, conexionSQL conexionHelper)
...
197|                    // El codigo lo genera SQL Server, no C#. Son 6 digitos numericos con
198|                    // ceros a la izquierda, igual que el legado desde el 24 ago (970d5b1).
199|                    string codigoExpr = "RIGHT('000000' + CAST(ABS(CHECKSUM(NEWID())) % 1000000 AS VARCHAR(6)), 6)";
200|
201|                    var strQuery =
202|                        "INSERT INTO VTASDCodigoVerificacioneCommerce " +
203|                        "(Cliente, Codigo, IdCarrito, FechaRegristro, FechaExpira, Estatus) " +
204|                        "VALUES (@Cliente, " + codigoExpr + ", @IdCarrito, GETDATE(), DATEADD(MINUTE, 2, GETDATE()), 1);";
205|
206|                    using (var sqlCommand = new SqlCommand(strQuery, sqlConnection))
207|                    {
208|                        sqlCommand.CommandTimeout = 9999999;
209|                        sqlCommand.Parameters.AddWithValue("@Cliente", cliente);
210|                        sqlCommand.Parameters.AddWithValue("@IdCarrito", idCarrito);
211|
212|                        var recordsAffected = await sqlCommand.ExecuteNonQueryAsync().ConfigureAwait(false);
213|
214|                        // Si insertó correctamente, buscamos el IdRef generado
215|                        if (recordsAffected > 0)
216|                        {
217|                            return await GetIdRefAsync(cliente, idCarrito, conexionHelper).ConfigureAwait(false);
218|                        }
219|                        return "";
(191-228)

Modelo: Models/SAP/Credit/SendSmsNewNumberRequest.cs { string Cliente; string NumeroTelefono; string IdCarrito; bool EsCredito; }.
Ruta que lo expone: Controllers/CreditController.cs:9-24 `[Authorize] [RoutePrefix("credit")] ... [HttpPost] [Route("SendSmsNewNumber")] public async Task<IHttpActionResult> SendSmsNewNumber(SendSmsNewNumberRequest request) { if (request == null) return BadRequest("Datos incompletos."); return Ok(await CreditMethods.SendSmsNewNumberAsync(request)); }`. En DMZ: Controllers/CreditController.cs:301-311 `[Route("SendSmsNewNumber")] GetSmsNoNip(SendSmsNewNumberRequest request)` -> `curl.PostSAP("credit/SendSmsNewNumber", ...)` (ya apunta a ServicioSAP).

Lo que el SP hace con esa tabla: SOLO LEE (SP_CREDITO_WEB_DATOS.sql:204-208 `SELECT TOP 1 @TelefonoAValidar = Telefono FROM TcAAEA00030_EnvioMensajes WITH (NOLOCK) WHERE Cliente = @cliente ORDER BY Id DESC`). El SP NO inserta en EnvioMensajes (grep del SP: unica aparicion :206). En ServicioSAP el flujo de solicitud de credito (OrderMethods) tampoco inserta SMS; solo lee (:588).

## lineas_articulo_actual

ARCHIVO: Methods/Order/OrderMethods.cs:934-1107 (InsertCreditArticlesAsync, privado de instancia). Campos de clase usados: `_preciosMethods` (FinalListProperMethods, :36, ctor :82).

934|        /// <summary>
935|        /// Inserta las lineas de articulo de una solicitud de credito.
936|        /// Equivalente legacy: CreditMethods.CreditoWeb_InsertArticulo -> SpVTASInsertArtSolCreditoLinea.
937|        /// </summary>
938|        /// <remarks>
939|        /// El precio se cotiza en SD29 **por SKU** (<c>GetFinalListProperBySkuAsync</c>,
940|        /// <c>$filter=Articulo eq '{sku}'</c>), no por UEN. La variante por UEN estaba fija en "3",
941|        /// que no es un canal valido (01=Contado, 02=Credito): el <c>$filter=CDistr eq '3'</c>
942|        /// devolvia lista vacia y todos los precios salian en 0.
943|        /// Se cachea por SKU dentro de la llamada para no repetir la consulta si el mismo articulo
944|        /// aparece mas de una vez.
945|        /// </remarks>
946|        private async Task InsertCreditArticlesAsync(OrderRequest order, string[] articulos, string idSolicitud, string condicion, string codigoPostal)
947|        {
948|            if (articulos == null || articulos.Length == 0)
949|            {
950|                Console.WriteLine("[InsertCreditArticles] Sin articulos que insertar para la solicitud " + idSolicitud);
951|                return;
952|            }
953|
954|            if (!int.TryParse(idSolicitud, out int idSolicitudInt) || idSolicitudInt <= 0)
955|                throw new Exception($"[InsertCreditArticles] idSolicitud invalido: '{idSolicitud}'.");
956|
957|            // Organizacion de ventas: la trae el request o se deriva. Las filas de SD29 con
958|            // OrgVtas '1','2','3' son legacy (mayoreo/pisos) y NUNCA aplican a e-commerce.
959|            string orgVentas = DeterminarSalesOrg(order);
960|
961|            // La condicion que manda Magento ("12 M VIU P INM") NO es la que usa SD29.
962|            // SD29 devuelve codigos ("12IV", "ACEF") o descripciones ("Credito Viu 12M P INM").
963|            // GetCondicionAsync traduce Magento -> condicion interna via CondicionesCredVtaLinea.
964|            string condicionSap = condicion;
965|            try
966|            {
967|                var traducida = await GetCondicionAsync(condicion, order.storeId).ConfigureAwait(false);
968|                if (!string.IsNullOrWhiteSpace(traducida)) condicionSap = traducida;
969|            }
970|            catch (Exception exCond)
971|            {
972|                Console.WriteLine($"[InsertCreditArticles] No se pudo traducir la condicion '{condicion}': {exCond.Message}. Se usara tal cual.");
973|            }
974|
975|            // Cache de precios por SKU: evita repetir el GET a SD29 para el mismo articulo.
976|            var preciosPorSku = new Dictionary<string, List<FinalListProper>>(StringComparer.OrdinalIgnoreCase);
977|            int insertados = 0;
978|            int sinPrecio = 0;
979|
980|            var db = new conexionSQL();
981|            using (var cnn = await db.obtenerConexionAndroidAsync().ConfigureAwait(false))
982|            {
983|                try
984|                {
985|                    // obtenerConexionAndroidAsync YA devuelve la conexion abierta (ConexionSQL.cs:117-120).
986|                    // El Open() que habia aqui lanzaba InvalidOperationException y el catch lo silenciaba,
987|                    // por lo que NUNCA se insertaba una sola linea. Se deja solo una guarda defensiva.
988|                    if (cnn.State != System.Data.ConnectionState.Open)
989|                        await cnn.OpenAsync().ConfigureAwait(false);
990|
991|                    int orden = 1;
992|                    string prevArt = "";
993|
994|                    string query = @"INSERT INTO MAVIANDROID01.ServicioAndroid.dbo.VTASdArtCreditoWeb 
995|                                     (IdArtCreditoWeb, cantidad, articulo, precio, Orden, Abono, costo) 
996|                                     VALUES (@IdCredito, @Cantidad, @Articulo, @Precio, @Orden, @Abono, @Costo)";
997|
998|                    using (var cmd = new SqlCommand(query, cnn))
999|                    {
1000|                        var pId = cmd.Parameters.Add("@IdCredito", SqlDbType.Int);
1001|                        var pCantidad = cmd.Parameters.Add("@Cantidad", SqlDbType.Int);
1002|                        var pArticulo = cmd.Parameters.Add("@Articulo", SqlDbType.VarChar);
1003|                        var pPrecio = cmd.Parameters.Add("@Precio", SqlDbType.Float);
1004|                        var pOrden = cmd.Parameters.Add("@Orden", SqlDbType.Int);
1005|                        var pAbono = cmd.Parameters.Add("@Abono", SqlDbType.Float);
1006|                        var pCosto = cmd.Parameters.Add("@Costo", SqlDbType.Float);
1007|
1008|                        foreach (var dataArt in articulos)
1009|                        {
1010|                            var articulosTemp = dataArt.Split(',');
1011|                            if (articulosTemp.Length < 2) continue;
1012|
1013|                            string articuloActual = articulosTemp[1];
1014|
1015|                            if (prevArt != articuloActual)
1016|                            {
1017|                                prevArt = articuloActual;
1018|                                pId.Value = int.Parse(idSolicitud);
1019|                                pArticulo.Value = articuloActual;
1020|                                pOrden.Value = orden;
1021|
1022|                                float precioArticulo = 0.0f;
1023|                                float abonoArticulo = 0.0f;
1024|                                float costoArticulo = 0.0f; // Costo directo ya no se extrae de Intelisis
1025|
1026|                                if (articuloActual == "SEGU00001")
1027|                                {
1028|                                    precioArticulo = float.Parse(articulosTemp[0]);
1029|                                    pCantidad.Value = 1;
1030|                                    abonoArticulo = 12.0f; // Regla legada
1031|                                }
1032|                                else
1033|                                {
1034|                                    pCantidad.Value = int.Parse(articulosTemp[0]);
1035|
1036|                                    // Precio desde SD29 por SKU. Se consulta una sola vez por articulo.
1037|                                    if (!preciosPorSku.TryGetValue(articuloActual, out var preciosSku))
1038|                                    {
1039|                                        preciosSku = await _preciosMethods.GetFinalListProperBySkuAsync(articuloActual).ConfigureAwait(false)
1040|                                                     ?? new List<FinalListProper>();
1041|                                        preciosPorSku[articuloActual] = preciosSku;
1042|                                    }
1043|
1044|                                    // SOLO aplican las organizaciones de e-commerce: 04 = MA y 05 = VIU.
1045|                                    // SD29 tambien devuelve filas legacy con OrgVtas '1','2','3'
1046|                                    // (mayoreo/pisos) que NUNCA corresponden a este flujo: la
1047|                                    // conversion a la organizacion correcta la hace este servicio
1048|                                    // antes de llegar a SAP. Si no se filtran, un FirstOrDefault
1049|                                    // puede tomar el precio de una organizacion que no es la nuestra.
1050|                                    var candidatos = preciosSku
1051|                                        .Where(pr => string.Equals(pr.SalesOrg, orgVentas, StringComparison.Ordinal))
1052|                                        .ToList();
1053|
1054|                                    if (candidatos.Count == 0)
1055|                                    {
1056|                                        Console.WriteLine($"[InsertCreditArticles] SD29 no devolvio renglones de OrgVtas '{orgVentas}' para SKU '{articuloActual}'.");
1057|                                    }
1058|
1059|                                    // Se busca por la condicion traducida y, como respaldo, por la
1060|                                    // que mando Magento. SD29 mezcla codigos ("12IV") y descripciones
1061|                                    // ("Credito MA Pisos 12M P DIF") segun el origen de la fila.
1062|                                    var proper = candidatos.FirstOrDefault(pr =>
1063|                                                     string.Equals(pr.Condition, condicionSap, StringComparison.OrdinalIgnoreCase))
1064|                                                 ?? candidatos.FirstOrDefault(pr =>
1065|                                                     string.Equals(pr.Condition, condicion, StringComparison.OrdinalIgnoreCase))
1066|                                                 ?? candidatos.FirstOrDefault();
1067|
1068|                                    if (proper != null)
1069|                                    {
1070|                                        float.TryParse(proper.Price, out precioArticulo);
1071|                                        // Abono REAL de SD29 por condicion, ya no hardcodeado.
1072|                                        float.TryParse(proper.Installment, out abonoArticulo);
1073|                                    }
1074|
1075|                                    if (precioArticulo <= 0f)
1076|                                    {
1077|                                        sinPrecio++;
1078|                                        Console.WriteLine($"[InsertCreditArticles] ADVERTENCIA: SD29 no devolvio precio para SKU '{articuloActual}' con condicion '{condicion}'.");
1079|                                    }
1080|                                }
1081|
1082|                                pPrecio.Value = precioArticulo;
1083|                                pAbono.Value = abonoArticulo;
1084|                                pCosto.Value = costoArticulo;
1085|
1086|                                await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
1087|                                insertados++;
1088|                                orden++;
1089|                            }
1090|                        }
1091|                    }
1092|                }
1093|                catch (Exception ex)
1094|                {
1095|                    // Se PROPAGA a proposito. Antes se tragaba la excepcion y el flujo seguia
1096|                    // devolviendo "Concluido" con la solicitud VACIA: el cliente creia que su
1097|                    // credito estaba en tramite y no tenia articulos. Fallar aqui es preferible.
1098|                    Console.WriteLine($"Error InsertCreditArticles (solicitud {idSolicitud}, insertados {insertados}): {ex.Message}");
1099|                    throw;
1100|                }
1101|            }
1102|
1103|            Console.WriteLine($"[InsertCreditArticles] Solicitud {idSolicitud}: {insertados} de {articulos.Length} lineas insertadas, {sinPrecio} sin precio de SD29.");
1104|
1105|            if (insertados == 0)
1106|                throw new Exception($"[InsertCreditArticles] No se inserto ninguna linea para la solicitud {idSolicitud}.");
1107|        }

DE DONDE SALE HOY precio / abono / costo:
- precio: `proper.Price` (:1070) de SD29 via `_preciosMethods.GetFinalListProperBySkuAsync(articuloActual)` (Methods/SalesDistribution/FinalListProperMethods.cs:82-110: GET `{obtenerUrl}/ZAPI_PROPRELIST_SRV/PropreListSet?sap-language=ES&sap-client=110&$format=json&$filter=Articulo%20eq%20'{sku}'`, deserializa root.d.results a List<FinalListProper>; lanza Exception si falla). Filtrado por `pr.SalesOrg == DeterminarSalesOrg(order)` (:1050-1052; DeterminarSalesOrg :330-341 -> order.salesOrg si viene, si no "05" cuando storeId contiene "viu", si no "04") y luego por `pr.Condition == condicionSap` (traducida con GetCondicionAsync :3423-3455: `SELECT TOP 1 Condicion FROM CondicionesCredVtaLinea WITH (NOLOCK) WHERE CondicionMagento = @CondicionMagento AND REPLACE(TiendaVirtual, ' ', '_') = @StoreId` sobre obtenerConexionSigMaviAsync; fallback PaymentConditionCatalog.GetSapPaymentCode(condicionMagento)), luego por `condicion` original, luego FirstOrDefault (:1062-1066). Para SEGU00001: precio = float.Parse(articulosTemp[0]) = costoEnvio (:1028; el elemento viene de SetOrderAsync:1876-1877 `articulos.Add(orderRequest.costoEnvio + ",SEGU00001")`).
- abono: `proper.Installment` (:1072) = JSON "Abono" de SD29; para SEGU00001 = 12.0f fijo (:1030).
- costo: SIEMPRE 0.0f (:1024, :1084). Comentario: "Costo directo ya no se extrae de Intelisis".
- cantidad: int.Parse(articulosTemp[0]) (:1034); SEGU00001 = 1 (:1029). Elementos vienen de SetOrderAsync:1871-1875 `articulos.Add(articulo.cantidad + "," + articulo.sku)`.
- `condicion` = order.articulos?.FirstOrDefault()?.condicion ?? "" (ProcessCreditPaymentAsync:720); `codigoPostal` = order.infoCliente?.codigoPostal ?? "" (:719) y NO se usa dentro de InsertCreditArticlesAsync.
- Modelo FinalListProper (Models/SAP/SalesDistribution/FinalListProper.cs:3-45, sin namespace, System.Text.Json): [JsonPropertyName("Articulo")] Item; ("Condicion") Condition; ("Sucursal") Branch; ("Oferta") Offer; ("Precio") Price; ("Abono") Installment; ("CDistr") DitributionChannel; ("OrgVtas") SalesOrg; ("Lista") List; ("Precioref") RefPrice; ("Superpromo") SuperPromo. Todos string.

LEGADO que reemplaza: LAN/WebApiMagento/Metodos/CreditMethods.cs:869-919 CreditoWeb_InsertArticulo(string[] data, string idSolicitud, string condicion, string cp = null): `SqlCommand cmd = new SqlCommand(@"SpVTASInsertArtSolCreditoLinea @IdCredito, @Cantidad, @Articulo, @Condicion, @Orden, @SeguCost, @Cp", cnn);` (:878) sobre sCadenaConexion (:872, NO Android); SEGU00001 -> @SeguCost=float.Parse(articulosTemp[0]), @Cantidad=1 (:899-903); otros -> @SeguCost=0.00, @Cantidad=Int32.Parse(articulosTemp[0]) (:906-907); @Condicion=condicion, @Orden=orden++, @Cp=cp; mismo salto de duplicados `if (prevArt != articulosTemp[1])` (:895). SP SpVTASInsertArtSolCreditoLinea (SPsOrden/SpVTASInsertArtSolCreditoLinea.sql:28-34 firma @IdCredito INT, @Cantidad INT, @Articulo VARCHAR(20), @Condicion VARCHAR(50), @Orden INT, @SeguCost FLOAT, @Cp VARCHAR(5)=NULL) es quien hace `INSERT INTO MAVIANDROID01.ServicioAndroid.dbo.VTASdArtCreditoWeb (IdArtCreditoWeb, cantidad, articulo, precio, Orden, Abono, costo)` (:208 y :243), con @Abono = 12 en :185 y @Costo desde #Resultado (:193-205, :228-240).

## rutas_credit_dmz

ARCHIVO: //CATECINF214034/Compartida/Migracion SAP/DMZ/WebApiMagento/Controllers/CreditController.cs (515 lineas). Cabecera:
14|    [Authorize]
15|    [RoutePrefix("credit")]
16|    public class CreditController : ApiController
Helper: DMZ/WebApiMagento/Helper/Curl.cs — `Post(url, json)` (:93-113) hace `webClient.UploadString(Ip+url, "POST", json)` con Ip = AppSettings["URL_INTELISIS"] (:22) = LAN; `PostSAP(url, json)` (:115-148) hace `UploadString(IpSAP + url, "POST", json)` con IpSAP = AppSettings["URL_SAP"] (:23) = ServicioSAP. DMZ Web.config:17 URL_INTELISIS="https://localhost:44399/" (linea 16 comentada: https://kdll3fhcyo-lan.grupomavi.com/api/); :18 URL_SAP="https://kdll3fhcyo-lan.grupomavi.com/SAP/". Token: constructor Curl (:57-91) autentica SOLO contra IpSAP + "login/auth" (:80) y `Token = TokenSAP` (:84); el login LAN esta comentado (:61-71).

RUTAS CreditoWeb* y afines (todas [HttpPost]; todas apuntan HOY a LAN via curl.Post, salvo donde se indica PostSAP):

140|        [HttpPost]
141|        [Route("CreditoWeb_FormDatos")]
142|        public IHttpActionResult CreditoWeb_FormDatos(FormDatos fd)
143|        {
144|            Logger.Credit("INFO ", JsonConvert.SerializeObject(fd));
145|            if (fd == null)
146|                throw new HttpResponseException(HttpStatusCode.BadRequest);
147|
148|            Curl curl = new Curl();
149|            string response = curl.Post("credit/CreditoWeb_FormDatos", JsonConvert.SerializeObject(fd)).Trim('"');
150|
151|            return Ok(response);
152|        }
-> LAN. Modelo FormDatos (DMZ Models/CreditRequest.cs:90-95): { string op; string search; int uen; }

155|        [HttpPost]
156|        [Route("CreditoWeb_SaveFirstData")]
157|        public IHttpActionResult CreditoWeb_SaveFirstData(SaveFirstData sf)
158|        {
159|            Logger.Credit("INFO ", JsonConvert.SerializeObject(sf));
160|            if (sf == null)
161|                throw new HttpResponseException(HttpStatusCode.BadRequest);
162|
163|            Curl curl = new Curl();
164|            string response = curl.Post("credit/CreditoWeb_SaveFirstData", JsonConvert.SerializeObject(sf)).Trim('"');
165|
166|            return Ok(response);
167|        }
-> LAN. Modelo SaveFirstData (:97-101): { string op; string[] data; }

169|        [HttpPost]
170|        [Route("CreditoWeb_SaveData_Articulos")]
171|        public IHttpActionResult CreditoWeb_SaveData_Articulos(DataArticulos da)
172|        {
173|            Logger.Credit("INFO ", JsonConvert.SerializeObject(da));
174|            if (da == null)
175|                throw new HttpResponseException(HttpStatusCode.BadRequest);
176|
177|            Curl curl = new Curl();
178|            string response = curl.Post("credit/CreditoWeb_SaveData_Articulos", JsonConvert.SerializeObject(da)).Trim('"');
179|
180|            return Ok(response);
181|        }
-> LAN. Modelo DataArticulos (:114-120): { string op; string[] data; string[] articulos; string prospecto; }

333|        [HttpPost]
334|        [Route("CreditoWeb_Informacion")]
335|        public IHttpActionResult CreditoWeb_Informacion(FormDatos sf) {
336|            if (sf == null)
337|                throw new HttpResponseException(HttpStatusCode.BadRequest);
338|
339|            Curl curl = new Curl();
340|            string response = curl.Post("credit/CreditoWeb_Informacion", JsonConvert.SerializeObject(sf)).Trim('"');
341|
342|            return Ok(response);
343|        }
-> LAN. (region "#region CREDILANA" :332)

357|        [HttpPost]
358|        [Route("CreditoWeb_Solicitud")]
359|        public IHttpActionResult CreditoWeb_Solicitud(CreditoWebRequest sf) {
360|            if (sf == null)
361|                throw new HttpResponseException(HttpStatusCode.BadRequest);
362|
363|            Curl curl = new Curl();
364|            string response = curl.Post("credit/CreditoWeb_Solicitud", JsonConvert.SerializeObject(sf)).Trim('"');
365|
366|            return Ok(response);
367|        }
-> LAN. Modelo CreditoWebRequest (:195-200): { string op; string[] data; int uen; }

392|        [HttpPost]
393|        [Route("CreditoWeb_SolicitudPrimerGuardado")]
394|        public IHttpActionResult CreditoWeb_SolicitudPrimerGuardado(CreditoWebRequest sf) {
395|            if (sf == null)
396|                throw new HttpResponseException(HttpStatusCode.BadRequest);
397|
398|            Curl curl = new Curl();
399|            string response = curl.Post("credit/CreditoWeb_SolicitudPrimerGuardado", JsonConvert.SerializeObject(sf)).Trim('"');
400|
401|            return Ok(response);
402|        }
-> LAN.

404|        [HttpPost]
405|        [Route("CreditoWeb_Seguro")]
406|        public IHttpActionResult CreditoWeb_Seguro(CreditoWebRequest sf) {
407|            if (sf == null)
408|                throw new HttpResponseException(HttpStatusCode.BadRequest);
409|
410|            Curl curl = new Curl();
411|            string response = curl.Post("credit/CreditoWeb_Seguro", JsonConvert.SerializeObject(sf)).Trim('"');
412|
413|            return Ok(response);
414|        }
-> LAN.

416|        [HttpPost]
417|        [Route("CreditoWeb_SaveData")]
418|        public IHttpActionResult CreditoWeb_SaveData(CreditoWebSaveDataRequest sf) {
419|            if (sf == null)
420|                throw new HttpResponseException(HttpStatusCode.BadRequest);
421|
422|            Curl curl = new Curl();
423|            string response = curl.Post("credit/CreditoWeb_SaveData", JsonConvert.SerializeObject(sf)).Trim('"');
424|
425|            return Ok(response);
426|        }
-> LAN. Modelo CreditoWebSaveDataRequest (:201-205): { string op; string[] data; }

Rutas del mismo controller que YA apuntan a ServicioSAP (curl.PostSAP): getClienteFactura/{cliente}/{factura} (:43-51, GET), SaveImagesProductosMx (:210-221), SendSmsNewNumber (:301-311, accion GetSmsNoNip), GetCreditAmounts (:345-355), getPlazos (:431-438, GET), guardardocumento (:449-493). Las demas (getSms :67-76, validateSms :98-107, codigoPromocion :126-135, codigoRecomendado :184-193, codigoRecomendadoWithUen :198-206, MonederoSaldoCredito :225-235, GetUnificationWalletStatus :239-243, CheckAccountsPreUnification :247-251, SetUnificationWalletData :255-259, SaveHaztenTransaction :263-268, GetPhoneValidatedClientSecretName :289-296, SolicitudMercancia :317-325, Validar_Lada :369-379, ExistRFCAndPhoneCte :381-390) usan curl.Post (LAN).

Contrapartes que HOY EXISTEN en ServicioSAP Controllers/CreditController.cs ([Authorize][RoutePrefix("credit")], :9-10): SendSmsNewNumber (:16-24), getPlazos (:26-39, GET), GetCreditAmounts (:51-83), guardardocumento (:92-109), SaveImagesProductosMx (:117-131), condicionespago (:132-146, GET). NO EXISTE en ServicioSAP ninguna ruta CreditoWeb_FormDatos, CreditoWeb_SaveFirstData, CreditoWeb_SaveData_Articulos, CreditoWeb_SaveData, CreditoWeb_Solicitud, CreditoWeb_SolicitudPrimerGuardado, CreditoWeb_Seguro ni CreditoWeb_Informacion (grep "CreditoWeb" en ServicioSAP Controllers/ y Methods/: 0 resultados fuera de comentarios de OrderMethods.cs:936).

Punto de entrada del pedido (para completar el grafo): DMZ Controllers/OrdersController.cs:15 [RoutePrefix("order")], :107-109 [Route("setOrder")] Set(OrderRequest order) -> :196 `curl.PostSAP("order/new", ...)` -> ServicioSAP OrderController order/new. La ruta DMZ "order/authorizationResult" (:422-427) recibe el callback del liberador y lo reenvia a URL_MAGENTO + "rest/V1/omnipro-credito/authorizationResult".

## rutas_credit_lan

ARCHIVO BASE: //CATECINF214034/Compartida/Migracion SAP/LAN/WebApiMagento/
Cabecera Controllers/CreditController.cs:16-18: `[Authorize] [RoutePrefix("credit")] public class CreditController : ApiController`.

=== A) CreditController.cs:207-234 — CreditoWeb_SaveData_Articulos (llama a SP_CREDITO_WEB_DATOS via Credit.Methods) ===
207|        [HttpPost]
208|        [Route("CreditoWeb_SaveData_Articulos")]
209|        public IHttpActionResult CreditoWeb_SaveData_Articulos(DataArticulos da)
210|        {
211|            string response;
212|            CreditMethods cm = new CreditMethods();
213|
214|            try
215|            {
216|                Logger.Credit("INFO", JsonConvert.SerializeObject(da));
217|                if (da.op.Equals("Update"))
218|                {
219|                    _ = Task.Run(async () => {
220|                        await Task.Delay(10000);
221|                        cm.CreditoWeb_SaveData_Articulos(da.op, da.data, da.articulos, da.prospecto); 
222|                    });
223|                    return Ok("");
224|                }
225|                
226|                response = cm.CreditoWeb_SaveData_Articulos(da.op, da.data, da.articulos, da.prospecto);
227|            }
228|            catch (Exception e)
229|            {
230|                throw new HttpResponseException(HttpStatusCode.InternalServerError);
231|            }
232|
233|            return Ok(response);
234|        }
Modelo LAN Models/CreditRequest.cs:53-59 `public class DataArticulos { public string op; public string[] data; public string[] articulos; public string prospecto; }` (identico al DMZ).
Cadena: Metodos/CreditMethods.cs:466-504 CreditoWeb_SaveData_Articulos(op, data, articulos, prospecto): `string cond = data[35], retorno = "", uen = data[34];` (:468), `data[33] = "";` (:470), `string resultado = Credit.Methods.CreditoWeb_SaveData(op, data, prospecto);` (:472); si op == "Insert" || "Insert_2" y resultado != "0": `CreditoWeb_InsertArticuloMX(articulos, resultado, data[35], data[14].Trim());` (:478), cupon `if ((data.Length > 72 && data[72] != "")) CodigoPromocion(data[72], "Elimina", data[66])` (:480-483), `retorno = resultado` (:496); si no, "0" (:500).

=== B) CreditController.cs:403-421 — CreditoWeb_SaveData (llama a SP_CREDITO_WEB_DATOS via CredyPrestamoMethods) ===
403|        [HttpPost]
404|        [Route("CreditoWeb_SaveData")]
405|        public IHttpActionResult CreditoWeb_SaveData(CreditoWebSaveDataRequest req) {
406|            CredyPrestamoMethods cm = new CredyPrestamoMethods();
407|            Logger.CredilanaClienteNuevo("CreditoWeb_SaveData ", JsonConvert.SerializeObject(req));
408|            try {
409|                if (req.op.Equals("Update"))
410|                {
411|                    _ = Task.Run(async () => {
412|                        await Task.Delay(10000);
413|                        cm.CreditoWeb_SaveData(req.op, req.data);
414|                    });
415|                    return Ok("");
416|                }
417|                return Ok(cm.CreditoWeb_SaveData(req.op, req.data));
418|            } catch (Exception) {
419|                throw new HttpResponseException(HttpStatusCode.InternalServerError);
420|            }
421|        }
Modelo Metodos/Credit/CredYPrestamo/ModelRequest.cs:17-20 `public class CreditoWebSaveDataRequest { public string op; public string[] data; }`; :12-16 `CreditoWebRequest { op; string[] data; int uen; }`.
Cadena: Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs:29-130 CreditoWeb_SaveData(op, data): `var cliente = cte_prospecto();` (:33), EXEC posicional :38-44 `SP_CREDITO_WEB_DATOS @Id, @Op, @apellido_p, @apellido_m, @nombre, @nombre_2, @fecha_nacimiento, @rfc, @sexo, @email, @direccion, @exterior, @interior, @entre_calles, @years_old, @months_old, @codigo_postal, @delegacion, @poblacion, @estado, @colonia, @estado_civil, @vive_en_calidad, @sueldo, @tarjeta, @tarjeta_digitos, @credito_hipoteca, @credito_automotriz, @lada_particular, @telefono_particular, @lada_celular, @telefono_celular, @ext_archivo_1, @ext_archivo_2, @ext_archivo_3, @articulo, @uen, @condicion, @cliente, @utmSource, @die, @sucursal, @origen, @parentesco_ref, @nombre_ref, @apellido_p_ref, @apellido_m_ref, @lada_particular_ref, @telefono_particular_ref, @tipo_tel_ref, @codigo, @ClienteMagento, @idMagento,@MetodoEnvio, @estatus, @CodigoRecomendador, @SucursalDestino, @Agente, 0, NULL, NULL, NULL, NULL, @Curp`. Mismos data[0..69] que Methods.cs (abajo); diferencias: @SucursalDestino = 0 fijo (:103), @Agente = data[70] (:104), @Curp = data[71] (:105); sin @OrigenIdMagento/@LadaValidar/@TelefonoValidar (van como NULL posicionales); NO inserta referencias.

=== C) Otras acciones CreditoWeb del mismo controller ===
143-183 CreditoWeb_FormDatos(FormDatos fd): if fd.op in {GetAnioMes, EstadosMA, EstadosVIU, DelegacionMA, DelegacionVIU, GetAtencionClientes} -> CredyPrestamoMethods().GetCredilanaInfo<List<List<string>>>(...); else `cm.CreditoWeb_FormDatos(fd.op, fd.search, fd.uen)` (:177). NO toca SP_CREDITO_WEB_DATOS.
185-205 CreditoWeb_SaveFirstData(SaveFirstData sf) -> `cm.CreditoWeb_SaveFirstData(sf.op, sf.data)` (:196) -> Metodos/CreditMethods.cs:506-526 EXEC `SpCREDISolicitudWebPrimerGuardado @op, @idSolicitud, @nombre, @nombre_2, @apellido_p, @apellido_m, @telefono_celular, @uen, @nip, @validacion, @origen, @IdWEB_DATOS_TEMP, @Articulo, @Importe, @Correo, @Telefono`. NO toca SP_CREDITO_WEB_DATOS.

=== D) Metodos/CreditMethods.cs:94-262 — ProductosCreditoWeb_SaveData (la llamada por NOMBRE con 38 parametros que ServicioSAP replica; invocada desde LAN OrderMethods.cs:624 en setOrder credito) ===
94|        public string ProductosCreditoWeb_SaveData(string[] data, string[] articulos, string[] datosped,
95|            string utmSource, int sucursalDestino = 0, string cp = null, float RedimirMonedero = 0,
96|            string entreCalles = "", string numeroDelSms = "", bool isValidated = false,
97|            string origenIdMagento = "", string entityId = "", string origen = "")
98|        {
99|            //data[0] = Cliente
100|            //data[1] = UEN
101|            //data[2] = idMagento 
102|            //data[3] = email
103|            //data[4] = total
104|            //data[5] = Condicion 
105|            //data[6] = Codigo Promotor
106|
107|            string res = "";
108|            string IdSolicitud = "";
109|            int uen = int.Parse(data[1]);
110|            //string condicion = getCondicion(data[5]);
111|            string condicion = data[5];
112|
113|            datosped[21] = Regex.Replace(datosped[21], @"[^0-9]", "");
114|
115|            Connection cadenac = new Connection();
116|
117|            using (cnn = new SqlConnection(cadenac.sCadenaConexionAndriod))
118|            {
119|                cnn.Open();
120|
121|                SqlCommand command = new SqlCommand("SP_CREDITO_WEB_DATOS", cnn);
122|                command.CommandType = CommandType.StoredProcedure;
123|
124|                if (checkCliente(data[0]))
125|                {
126|                    if (decimal.Parse(data[4]) > checkSaldo(data[0]))
127|                    {
128|                        res = "insuficiente";
129|                    }
130|                    else
131|                    {
132|                        res = "OK";
133|                    }
134|
135|                    try
136|                    {
137|                        List<string> datosCliente = getClientInfo(data[0]);
138|
139|                        var ladaDeDos = new string[] { "33", "55", "81" };
140|                        var telAux = datosped[21];
141|                        var ladaLength = (ladaDeDos.Contains(telAux.Substring(0, 2))) ? 2 : 3;
142|                        var ladaTel = telAux.Substring(0, ladaLength);
143|                        var telNum = telAux.Substring(ladaLength);
144|
145|                        telAux = numeroDelSms.Length > 0 ? numeroDelSms : datosped[21];
146|                        ladaLength = (ladaDeDos.Contains(telAux.Substring(0, 2))) ? 2 : 3;
147|                        var ladaValidar = telAux.Substring(0, ladaLength);
148|                        var telefonoValidar = telAux.Substring(ladaLength);
149|
150|                        command.Parameters.Add("@Id", SqlDbType.Int).Value = 0;
151|                        command.Parameters.Add("@Op", SqlDbType.VarChar).Value = "Insert";
152|                        command.Parameters.Add("@apellido_p", SqlDbType.VarChar).Value = datosCliente[1];
153|                        command.Parameters.Add("@apellido_m", SqlDbType.VarChar).Value = datosCliente[2];
154|                        command.Parameters.Add("@nombre", SqlDbType.VarChar).Value = datosCliente[3];
155|                        //command.Parameters.Add("@nombre_2", SqlDbType.VarChar).Value = data[3];
156|                        command.Parameters.Add("@fecha_nacimiento", SqlDbType.VarChar).Value = datosCliente[4];
157|                        command.Parameters.Add("@rfc", SqlDbType.VarChar).Value = datosCliente[5];
158|                        command.Parameters.Add("@sexo", SqlDbType.VarChar).Value = datosCliente[6];
159|                        command.Parameters.Add("@email", SqlDbType.VarChar).Value = data[3];
160|                        command.Parameters.Add("@direccion", SqlDbType.VarChar).Value = datosped[14];
161|                        command.Parameters.Add("@exterior", SqlDbType.VarChar).Value = datosped[15];
162|                        command.Parameters.Add("@interior", SqlDbType.VarChar).Value = datosped[16];
163|                        command.Parameters.Add("@entre_calles", SqlDbType.VarChar).Value = entreCalles.Length > 0 ? entreCalles : datosCliente[10];
164|                        command.Parameters.Add("@codigo_postal", SqlDbType.VarChar).Value = datosped[17];
165|                        command.Parameters.Add("@delegacion", SqlDbType.VarChar).Value = datosped[18];
166|                        command.Parameters.Add("@poblacion", SqlDbType.VarChar).Value = datosped[18];
167|                        command.Parameters.Add("@estado", SqlDbType.VarChar).Value = datosped[20];
168|                        command.Parameters.Add("@colonia", SqlDbType.VarChar).Value = datosped[19];
169|                        command.Parameters.Add("@estado_civil", SqlDbType.VarChar).Value = datosCliente[16];
170|                        command.Parameters.Add("@articulo", SqlDbType.VarChar).Value = "";
171|                        command.Parameters.Add("@uen", SqlDbType.Int).Value = uen;
172|                        command.Parameters.Add("@condicion", SqlDbType.VarChar).Value = condicion;
173|                        command.Parameters.Add("@cliente", SqlDbType.VarChar).Value = datosCliente[0];
174|                        command.Parameters.Add("@utmSource", SqlDbType.VarChar).Value = utmSource;
175|                        command.Parameters.Add("@sucursal", SqlDbType.Int).Value = (uen.Equals(2)) ? 505 : 504;
176|                        command.Parameters.Add("@origen", SqlDbType.VarChar).Value = origen; //data[39];
177|                        command.Parameters.Add("@idMagento", SqlDbType.VarChar).Value = data[2];
178|                        command.Parameters.Add("@MetodoEnvio", SqlDbType.VarChar).Value = datosped[31];
179|                        command.Parameters.Add("@lada_particular", SqlDbType.VarChar).Value = ladaTel;
180|                        command.Parameters.Add("@telefono_particular", SqlDbType.VarChar).Value = telNum;
181|                        command.Parameters.Add("@lada_celular", SqlDbType.VarChar).Value = ladaTel;
182|                        command.Parameters.Add("@telefono_celular", SqlDbType.VarChar).Value = telNum;
183|                        command.Parameters.Add("@sucursalDestino", SqlDbType.Int).Value = sucursalDestino;
184|                        command.Parameters.Add("@RedimirMonedero", SqlDbType.Money).Value = RedimirMonedero;
185|                        command.Parameters.Add("@ValidacionTelefono", SqlDbType.Bit).Value = (!isValidated) || !IsInTableStd(datosCliente[0]) ? 1 : 0;
186|                        command.Parameters.Add("@OrigenIdMagento", SqlDbType.VarChar).Value = origenIdMagento;
187|                        command.Parameters.Add("@LadaValidar", SqlDbType.VarChar).Value = ladaValidar;
188|                        command.Parameters.Add("@TelefonoValidar", SqlDbType.VarChar).Value = telefonoValidar;
189|
190|                        SqlDataReader dr = command.ExecuteReader();
191|                        if (dr.HasRows)
192|                        {
193|                            while (dr.Read())
194|                            {
195|                                IdSolicitud = dr[0].ToString();
196|                            }
197|                        }
198|
199|                        if (IdSolicitud != "")
200|                        {
201|                            CreditoWeb_InsertArticulo(articulos, IdSolicitud, condicion, cp);
202|
203|                            if (data[6].Length > 0) // Setear codigo promotor
204|                            {
205|                                Logger.Credit("INFO ", CodigoPromocion(data[6], "Elimina", data[2]));
206|                            }
207|
208|                            if (data[0].ToUpper().StartsWith("C"))
209|                            {
210|                                string capturedEntityId = entityId;
211|                                string capturedCliente = data[0];
212|                                int capturedIdSol = int.Parse(IdSolicitud);
213|                                int capturedUen = uen;
214|
215|                                var liberadorThread = new System.Threading.Thread(() =>
216|                                {
217|                                    try
218|                                    {
219|                                        var liberador = new LiberadorCreditoMethods();
220|                                        LiberadorResult resultado = liberador.LiberarCliente(capturedCliente, capturedIdSol, capturedUen);
221|                                        OrderMethods.CallMagentoAuthorizationCallback(
222|                                            entityId: capturedEntityId,
223|                                            status: resultado.Status,
224|                                            cuenta: capturedCliente,
225|                                            idSolicitud: resultado.IdVenta > 0 ? resultado.IdVenta : capturedIdSol
226|                                        );
227|                                    }
228|                                    catch (Exception ex)
229|                                    {
230|                                        Logger.SetOrder("ERROR LiberadorThread", $"entityId={capturedEntityId} {ex.Message}");
231|                                        OrderMethods.CallMagentoAuthorizationCallback(
232|                                            entityId: capturedEntityId,
233|                                            status: "RECHAZADO",
234|                                            cuenta: capturedCliente,
235|                                            idSolicitud: capturedIdSol
236|                                        );
237|                                    }
238|                                });
239|                                liberadorThread.IsBackground = true;
240|                                liberadorThread.Start();
241|                            }
242|                        }
243|                        return res;
244|
245|                    }
246|                    catch (Exception ex)
247|                    {
248|                        string v = "Error en productos a credito";
249|                        string[] textolog = new string[] { v + " " + ex.ToString() };
250|                        Logger.Credit("ERROR ", ex.Message);
251|                        return "err";
252|                    }
253|
254|                }
255|                else
256|                {
257|                    return "sin cuenta";
258|                }
259|
260|            }
261|            //return res;
262|        }
Helpers usados: checkCliente(cliente) (:725-763, SP SpCREDIDatosSolicitudCreditoArt @Op='CheckCliente', return value 1); checkSaldo (:766-802, @Op='GetSaldo'); getClientInfo (:804-868, @Op='GetInfo', devuelve lista en orden: [0]Cliente,[1]PersonalApellidoPaterno,[2]PersonalApellidoMaterno,[3]PersonalNombres,[4]FechaNacimiento yyyy-MM-dd,[5]RFC,[6]Sexo,[7]Direccion,[8]DireccionNumero,[9]DireccionNumeroInt,[10]EntreCalles,[11]CodigoPostal,[12]Delegacion,[13]Poblacion,[14]Estado,[15]Colonia,[16]EstadoCivil,[17]TipoCalle,[18]ViveEnCalidad); IsInTableStd (:1967-1989). datosped = sDatosPedido de LAN OrderMethods (misma convencion de indices que ServicioSAP ToArray: 14 direccion, 15 numExt, 16 numInt, 17 codigoPostal, 18 municipio, 19 colonia, 20 estado, 21 telefono, 31 metodoEnvio).

=== E) Metodos/Credit/Methods.cs:12-256 — CreditoWeb_SaveData (EXEC posicional + INSERT de referencias) — VERBATIM 69-139 y 171-249 ===
12|        public static string CreditoWeb_SaveData(string op, string[] data , string prospecto)
...
35|            if (prospecto.Length == 0)
36|                cliente = cte_prospecto();
37|            else
38|                cliente = prospecto;
...
66|            Connection cadenac = new Connection();
67|            cnn = new SqlConnection(cadenac.sCadenaConexionAndriod);
68|
69|            SqlCommand command = new SqlCommand(@"SP_CREDITO_WEB_DATOS @Id, @Op, @apellido_p, @apellido_m, @nombre, @nombre_2,
70|            @fecha_nacimiento, @rfc, @sexo, @email, @direccion,	@exterior, @interior, @entre_calles, @years_old,
71|            @months_old, @codigo_postal, @delegacion, @poblacion, @estado, @colonia, @estado_civil, @vive_en_calidad,
72|            @sueldo, @tarjeta, @tarjeta_digitos, @credito_hipoteca,	@credito_automotriz, @lada_particular, 
73|            @telefono_particular, @lada_celular, @telefono_celular, @ext_archivo_1, @ext_archivo_2, @ext_archivo_3, 
74|            @articulo, @uen, @condicion, @cliente, @utmSource, @die, @sucursal, @origen, @parentesco_ref, 
75|            @nombre_ref, @apellido_p_ref, @apellido_m_ref, @lada_particular_ref, @telefono_particular_ref, @tipo_tel_ref, @codigo, @ClienteMagento, @idMagento,@MetodoEnvio, @estatus, @CodigoRecomendador, 
76|            @SucursalDestino, '', 0, NULL, @OrigenIdMagento, @LadaValidar, @TelefonoValidar, @Curp", cnn);
77|
78|            command.Parameters.Add("@Id", SqlDbType.Int).Value = (data.Length > 68 && data[68] != "" && data[68] != null) ? int.Parse(data[68]) : 0;
79|            command.Parameters.Add("@Op", SqlDbType.VarChar).Value = (op == "Insert_2") ? "Insert" : op;
80|            command.Parameters.Add("@apellido_p", SqlDbType.VarChar).Value = CredyPrestamoMethods.RemoveTildes(data[0]);
81|            command.Parameters.Add("@apellido_m", SqlDbType.VarChar).Value = CredyPrestamoMethods.RemoveTildes(data[1]);
82|            command.Parameters.Add("@nombre", SqlDbType.VarChar).Value = CredyPrestamoMethods.RemoveTildes(data[2]);
83|            command.Parameters.Add("@nombre_2", SqlDbType.VarChar).Value = CredyPrestamoMethods.RemoveTildes(data[3]);
84|            command.Parameters.Add("@fecha_nacimiento", SqlDbType.VarChar).Value = data[4];
85|            command.Parameters.Add("@rfc", SqlDbType.VarChar).Value = data[5];
86|            command.Parameters.Add("@sexo", SqlDbType.VarChar).Value = data[6];
87|            command.Parameters.Add("@email", SqlDbType.VarChar).Value = data[7];
88|            command.Parameters.Add("@direccion", SqlDbType.VarChar).Value = data[8];
89|            command.Parameters.Add("@exterior", SqlDbType.VarChar).Value = data[9];
90|            command.Parameters.Add("@interior", SqlDbType.VarChar).Value = data[10];
91|            command.Parameters.Add("@entre_calles", SqlDbType.VarChar).Value = data[11];
92|            command.Parameters.Add("@years_old", SqlDbType.Int).Value = data[12] != "" ? int.Parse(data[12]) : 0;
93|            command.Parameters.Add("@months_old", SqlDbType.Int).Value = data[13] != "" ? int.Parse(data[13]) : 0;
94|            command.Parameters.Add("@codigo_postal", SqlDbType.VarChar).Value = data[14];
95|            command.Parameters.Add("@delegacion", SqlDbType.VarChar).Value = data[15];
96|            command.Parameters.Add("@poblacion", SqlDbType.VarChar).Value = data[16];
97|            command.Parameters.Add("@estado", SqlDbType.VarChar).Value = data[17];
98|            command.Parameters.Add("@colonia", SqlDbType.VarChar).Value = data[18];
99|            command.Parameters.Add("@estado_civil", SqlDbType.VarChar).Value = data[19] != null ? data[19] : "";
100|            command.Parameters.Add("@vive_en_calidad", SqlDbType.VarChar).Value = data[20] != null ? data[20] : "";
101|            command.Parameters.Add("@sueldo", SqlDbType.Money).Value = double.Parse(data[21]);
102|            command.Parameters.Add("@tarjeta", SqlDbType.VarChar).Value = data[22];
103|            command.Parameters.Add("@tarjeta_digitos", SqlDbType.Int).Value = (data[23] != null && data[23] != "") ? int.Parse(data[23]) : 0;
104|            command.Parameters.Add("@credito_hipoteca", SqlDbType.VarChar).Value = data[24];
105|            command.Parameters.Add("@credito_automotriz", SqlDbType.VarChar).Value = data[25];
106|            command.Parameters.Add("@lada_particular", SqlDbType.Int).Value = data[26] != "" ? int.Parse(data[26]) : 0;
107|            command.Parameters.Add("@telefono_particular", SqlDbType.VarChar).Value = data[26] != "" ? data[27].ToString() : "0";
108|            command.Parameters.Add("@lada_celular", SqlDbType.Int).Value = int.Parse(data[28]);
109|            command.Parameters.Add("@telefono_celular", SqlDbType.VarChar).Value = data[29].ToString();
110|            command.Parameters.Add("@ext_archivo_1", SqlDbType.VarChar).Value = data[30].ToString().ToLower();
111|            command.Parameters.Add("@ext_archivo_2", SqlDbType.VarChar).Value = data[31].ToString().ToLower();
112|            command.Parameters.Add("@ext_archivo_3", SqlDbType.VarChar).Value = data[32].ToString().ToLower();
113|            command.Parameters.Add("@articulo", SqlDbType.VarChar).Value = data[33];
114|            command.Parameters.Add("@uen", SqlDbType.Int).Value = int.Parse(data[34]);
115|            command.Parameters.Add("@condicion", SqlDbType.VarChar).Value = data[35];
116|            command.Parameters.Add("@cliente", SqlDbType.VarChar).Value = cliente;
117|            command.Parameters.Add("@utmSource", SqlDbType.VarChar).Value = data[36];
118|            command.Parameters.Add("@die", SqlDbType.Int).Value = data[37] != "" ? int.Parse(data[37]) : 0;
119|            command.Parameters.Add("@sucursal", SqlDbType.Int).Value = data[38] != "" ? int.Parse(data[38]) : 0;
120|            command.Parameters.Add("@origen", SqlDbType.VarChar).Value = data[39];
121|            command.Parameters.Add("@parentesco_ref", SqlDbType.VarChar).Value = "";
122|            command.Parameters.Add("@nombre_ref", SqlDbType.VarChar).Value = "";
123|            command.Parameters.Add("@apellido_p_ref", SqlDbType.VarChar).Value = "";
124|            command.Parameters.Add("@apellido_m_ref", SqlDbType.VarChar).Value = "";
125|            command.Parameters.Add("@lada_particular_ref", SqlDbType.Int).Value = 0;
126|            command.Parameters.Add("@telefono_particular_ref", SqlDbType.VarChar).Value = "0";
127|            command.Parameters.Add("@tipo_tel_ref", SqlDbType.Int).Value = 0;
128|            command.Parameters.Add("@codigo", SqlDbType.VarChar).Value = data[64]; //codigo que generan las fotografias para shm
129|            command.Parameters.Add("@ClienteMagento", SqlDbType.Int).Value = (data.Length > 65 && data[65] != "") ? int.Parse(data[65]) : 0;
130|            command.Parameters.Add("@idMagento", SqlDbType.VarChar).Value = (data.Length > 65 && data[66] != "") ? data[66] : "0";
131|            command.Parameters.Add("@MetodoEnvio", SqlDbType.VarChar).Value = "";
132|            //en caso de que el data[67] venga con algo mandamos el estatus, de lo contrario mandaremos un 0 para seguir su flujo normal
133|            command.Parameters.Add("@estatus", SqlDbType.VarChar).Value = (data.Length > 67 && data[67] != "" && data[67] != null) ? data[67] : "0";
134|            command.Parameters.Add("@CodigoRecomendador", SqlDbType.VarChar).Value = (data.Length > 69 && data[69] != "" && data[69] != null) ? data[69] : "";
135|            command.Parameters.Add("@SucursalDestino", SqlDbType.Int).Value = (data.Length > 70 && data[70] != "") ? int.Parse(data[70]) : 0;
136|            command.Parameters.Add("@OrigenIdMagento", SqlDbType.VarChar).Value = (data.Length > 71 && data[71] != "") ? data[71] : "";
137|            command.Parameters.Add("@LadaValidar", SqlDbType.VarChar).Value = (data.Length > 73 && data[73] != "") ? int.Parse(data[73]) : 0;
138|            command.Parameters.Add("@TelefonoValidar", SqlDbType.VarChar).Value = (data.Length > 74 && data[74] != "") ? long.Parse(data[74]) : 0;
139|            command.Parameters.Add("@Curp", SqlDbType.VarChar).Value = (data.Length > 75 && data[75] != "") ? data[75] : "";
140|
141|            var oper = op;
142|            cnn.Open();
143|            DataSet ds = new DataSet();
144|            SqlDataAdapter da = new SqlDataAdapter(command);
145|            da.Fill(ds);
146|            try
147|            {
148|                IdSolicitud = ds.Tables[0].Rows[0][0].ToString();
149|                res = IdSolicitud;
...(151-162: if data[39] == "DIMAS MX" { /* DIMAWeb_SendMail_Revision comentado */ })
165|            catch (Exception w)
166|            {
167|                res = "0";
168|            }
169|            cnn.Close();
170|
171|            referencia = Convert.ToInt32(data[40]);
172|            if (referencia == 1)
173|            {
174|
175|                string query = @"INSERT INTO TrWACW00041_RefSolCredWeb (IDSolicitud, Parentesco, Nombre, ApellidoP, ApellidoM, TipoTel, LadaTel, NumeroTel)
176|                                VALUES (@IDSolicitud, @Parentesco, @Nombre, @ApellidoP, @ApellidoM, @TipoTel, @LadaTel, @NumeroTel)";
177|                using (SqlConnection conn = new SqlConnection(new Connection().sCadenaConexionAndriod))
178|                {
179|                    conn.Open();
180|
181|                    using (SqlCommand cmd = new SqlCommand(query, conn))
182|                    {
183|                        cmd.Parameters.Add(new SqlParameter("@IDSolicitud", SqlDbType.Int)).Value = int.Parse(IdSolicitud);
184|                        cmd.Parameters.Add(new SqlParameter("@Parentesco", SqlDbType.VarChar)).Value = data[41];
185|                        cmd.Parameters.Add(new SqlParameter("@Nombre", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[42]);
186|                        cmd.Parameters.Add(new SqlParameter("@ApellidoP", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[43]);
187|                        cmd.Parameters.Add(new SqlParameter("@ApellidoM", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[44]);
188|                        cmd.Parameters.Add(new SqlParameter("@LadaTel", SqlDbType.Int)).Value = data[45] != "" ? int.Parse(data[45]) : 0;
189|                        cmd.Parameters.Add(new SqlParameter("@NumeroTel", SqlDbType.BigInt)).Value = data[46] != "" ? long.Parse(data[46]) : 0;
190|                        cmd.Parameters.Add(new SqlParameter("@TipoTel", SqlDbType.Int)).Value = data[47] != "" ? long.Parse(data[47]) : 0;
191|
192|
193|                        cmd.ExecuteNonQuery();
194|                    }
195|                }
196|
197|            }
198|
199|            referencia = Convert.ToInt32(data[48]);
200|            if (referencia == 1)
201|            {
202|                string query = @"INSERT INTO TrWACW00041_RefSolCredWeb (IDSolicitud, Parentesco, Nombre, ApellidoP, ApellidoM, TipoTel, LadaTel, NumeroTel)
203|                                VALUES (@IDSolicitud, @Parentesco, @Nombre, @ApellidoP, @ApellidoM, @TipoTel, @LadaTel, @NumeroTel)";
204|                using (SqlConnection conn = new SqlConnection(new Connection().sCadenaConexionAndriod))
205|                {
206|                    conn.Open();
207|
208|                    using (SqlCommand cmd = new SqlCommand(query, conn))
209|                    {
210|                        cmd.Parameters.Add(new SqlParameter("@IDSolicitud", SqlDbType.Int)).Value = int.Parse(IdSolicitud);
211|                        cmd.Parameters.Add(new SqlParameter("@Parentesco", SqlDbType.VarChar)).Value = data[49];
212|                        cmd.Parameters.Add(new SqlParameter("@Nombre", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[50]);
213|                        cmd.Parameters.Add(new SqlParameter("@ApellidoP", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[51]);
214|                        cmd.Parameters.Add(new SqlParameter("@ApellidoM", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[52]);
215|                        cmd.Parameters.Add(new SqlParameter("@LadaTel", SqlDbType.Int)).Value = data[53] != "" ? int.Parse(data[53]) : 0;
216|                        cmd.Parameters.Add(new SqlParameter("@NumeroTel", SqlDbType.BigInt)).Value = data[54] != "" ? long.Parse(data[54]) : 0;
217|                        cmd.Parameters.Add(new SqlParameter("@TipoTel", SqlDbType.Int)).Value = data[55] != "" ? long.Parse(data[55]) : 0;
218|
219|
220|                        cmd.ExecuteNonQuery();
221|                    }
222|                }
223|            }
224|
225|            referencia = Convert.ToInt32(data[56]);
226|            if (referencia == 1)
227|            {
228|                string query = @"INSERT INTO TrWACW00041_RefSolCredWeb (IDSolicitud, Parentesco, Nombre, ApellidoP, ApellidoM, TipoTel, LadaTel, NumeroTel)
229|                                VALUES (@IDSolicitud, @Parentesco, @Nombre, @ApellidoP, @ApellidoM, @TipoTel, @LadaTel, @NumeroTel)";
230|                using (SqlConnection conn = new SqlConnection(new Connection().sCadenaConexionAndriod))
231|                {
232|                    conn.Open();
233|
234|                    using (SqlCommand cmd = new SqlCommand(query, conn))
235|                    {
236|                        cmd.Parameters.Add(new SqlParameter("@IDSolicitud", SqlDbType.Int)).Value = int.Parse(IdSolicitud);
237|                        cmd.Parameters.Add(new SqlParameter("@Parentesco", SqlDbType.VarChar)).Value = data[57];
238|                        cmd.Parameters.Add(new SqlParameter("@Nombre", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[58]);
239|                        cmd.Parameters.Add(new SqlParameter("@ApellidoP", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[59]);
240|                        cmd.Parameters.Add(new SqlParameter("@ApellidoM", SqlDbType.VarChar)).Value = CredyPrestamoMethods.RemoveTildes(data[60]);
241|                        cmd.Parameters.Add(new SqlParameter("@LadaTel", SqlDbType.Int)).Value = data[61] != "" ? int.Parse(data[62]) : 0;
242|                        cmd.Parameters.Add(new SqlParameter("@NumeroTel", SqlDbType.BigInt)).Value = data[62] != "" ? long.Parse(data[62]) : 0;
243|                        cmd.Parameters.Add(new SqlParameter("@TipoTel", SqlDbType.Int)).Value = data[63] != "" ? long.Parse(data[63]) : 0;
244|
245|
246|                        cmd.ExecuteNonQuery();
247|                    }
248|                }
249|            }
250|
251|            if (oper == "Insert_2")
252|            {
253|                res = res + "/" + cliente;
254|            }
255|            return res;
256|        }
(:258-287 cte_prospecto(): `exec SP_GeneraConsecutivoCteMavi 'MAVI'` sobre sCadenaConexion, devuelve dr.GetString(0). Nota literal del codigo: en :241 @LadaTel de la 3a referencia usa `data[61] != "" ? int.Parse(data[62])` — indice 62, no 61, tal cual esta en el fuente.)

CONTRATO REAL DEL BODY (data[] por indice, derivado de Methods.cs:78-139 y 171-249; los headers de cada bloque de referencia son data[40], data[48], data[56] == "1"):
0 apellido_p | 1 apellido_m | 2 nombre | 3 nombre_2 | 4 fecha_nacimiento | 5 rfc | 6 sexo | 7 email | 8 direccion | 9 exterior | 10 interior | 11 entre_calles | 12 years_old | 13 months_old | 14 codigo_postal | 15 delegacion | 16 poblacion | 17 estado | 18 colonia | 19 estado_civil | 20 vive_en_calidad | 21 sueldo | 22 tarjeta | 23 tarjeta_digitos | 24 credito_hipoteca | 25 credito_automotriz | 26 lada_particular | 27 telefono_particular | 28 lada_celular | 29 telefono_celular | 30 ext_archivo_1 | 31 ext_archivo_2 | 32 ext_archivo_3 | 33 articulo (CreditMethods.cs:470 lo fuerza a "") | 34 uen | 35 condicion | 36 utmSource | 37 die | 38 sucursal | 39 origen | 40 flag ref1 (=="1") | 41 parentesco ref1 | 42 nombre ref1 | 43 apellidoP ref1 | 44 apellidoM ref1 | 45 lada ref1 | 46 numero ref1 | 47 tipoTel ref1 | 48 flag ref2 | 49 parentesco ref2 | 50 nombre ref2 | 51 apellidoP ref2 | 52 apellidoM ref2 | 53 lada ref2 | 54 numero ref2 | 55 tipoTel ref2 | 56 flag ref3 | 57 parentesco ref3 | 58 nombre ref3 | 59 apellidoP ref3 | 60 apellidoM ref3 | 61 lada ref3 (flag) | 62 numero ref3 (tambien usado como lada por :241) | 63 tipoTel ref3 | 64 codigo (fotos shm) | 65 ClienteMagento | 66 idMagento | 67 estatus | 68 Id (para Update) | 69 CodigoRecomendador | 70 SucursalDestino | 71 OrigenIdMagento | 72 codigo promotor (solo CreditMethods.cs:480-482, no va al SP) | 73 LadaValidar | 74 TelefonoValidar | 75 Curp.
Para la ruta credit/CreditoWeb_SaveData (CredyPrestamoMethods.cs:46-105) el mismo arreglo hasta 69, pero 70 = @Agente y 71 = @Curp; @SucursalDestino fijo 0; sin OrigenIdMagento/LadaValidar/TelefonoValidar; no inserta referencias.

## dim11_con_filtro

IMPORTANTE (hecho verificable): en el flujo de credito DIM11 NO se consulta. SetOrderAsync retorna en la FASE 3 (OrderMethods.cs:1869-1891) antes de la FASE 4 donde vive la validacion de stock (:1906 `ValidarStockArticulosAsync`). DIM11 solo aplica a pedidos que siguen hacia SAP.

=== OrderMethods.cs:2105-2162 — ValidarStockArticulosAsync (unico uso de DIM11 con filtro material+planta en OrderMethods) ===
2105|        /// <summary>
2106|        /// Valida stock disponible para cada artículo en la orden.
2107|        /// Si insuficiente: Retorna un OrderResponse con error, detiene proceso.
2108|        /// </summary>
2109|        private async Task<OrderResponse> ValidarStockArticulosAsync(OrderRequest order, string plant, string incrementId)
2110|        {
2111|            try
2112|            {
2113|                if (order?.articulos == null || order.articulos.Count == 0)
2114|                    return null;
2115|
2116|                Console.WriteLine($"[ValidarStockArticulos] Consultando stock para plant {plant} por articulo");
2117|
2118|                // Validar cada artículo individualmente contra SAP usando $filter
2119|                foreach (var articulo in order.articulos)
2120|                {
2121|                    // Buscar stock en SAP para este material en la planta indicada usando la API DIM11 con filtro
2122|                    var stocks = await _productMethods.GetStockAsync(material: articulo.sku, plant: plant).ConfigureAwait(false);
2123|                    var stockArticulo = stocks?.FirstOrDefault();
2124|
2125|                    if (stockArticulo == null)
2126|                    {
2127|                        string errorMsg = $"SKU {articulo.sku} no encontrado en stock para plant {plant}";
2128|                        Console.WriteLine($"[ValidarStockArticulos] {errorMsg}");
2129|                        return new OrderResponse { Resultado = "Error", Zidecomm = incrementId, Zobservaciones = errorMsg };
2130|                    }
2131|
2132|                    // Convertir UnrestrictedUseStock a número
2133|                    if (!decimal.TryParse(stockArticulo.UnrestrictedUseStock, out decimal stockDisponible))
2134|                    {
2135|                        string errorMsg = $"No se puede parsear stock para SKU {articulo.sku}";
2136|                        Console.WriteLine($"[ValidarStockArticulos] {errorMsg}");
2137|                        return new OrderResponse { Resultado = "Error", Zidecomm = incrementId, Zobservaciones = errorMsg };
2138|                    }
2139|
2140|                    // Validar cantidad
2141|                    if (stockDisponible < articulo.cantidad)
2142|                    {
2143|                        string errorMsg = $"Stock insuficiente para SKU {articulo.sku}: disponible {stockDisponible}, requerido {articulo.cantidad}";
2144|                        Console.WriteLine($"[ValidarStockArticulos] {errorMsg}");
2145|                        return new OrderResponse { Resultado = "Error", Zidecomm = incrementId, Zobservaciones = errorMsg };
2146|                    }
2147|
2148|                    Console.WriteLine(
2149|                        $"[ValidarStockArticulos] SKU {articulo.sku}: " +
2150|                        $"stock {stockDisponible} >= cantidad {articulo.cantidad}. OK");
2151|                }
2152|
2153|                Console.WriteLine("[ValidarStockArticulos] Validación completada exitosamente");
2154|                return null; // Todo OK
2155|            }
2156|            catch (Exception ex)
2157|            {
2158|                string errorMsg = $"Error interno en validación de stock: {ex.Message}";
2159|                Console.WriteLine($"[ValidarStockArticulos] {errorMsg}");
2160|                return new OrderResponse { Resultado = "Error", Zidecomm = incrementId, Zobservaciones = errorMsg };
2161|            }
2162|        }
Llamada: OrderMethods.cs:1900 `string plant = DeterminarPlant(orderRequest);` (:343-351 -> DeterminarPlantYOficina(storeId, isCredito, out sapPlant, out _), :353+) y :1906 `var stockValidationResult = await ValidarStockArticulosAsync(orderRequest, plant, incrementId)`. `_productMethods` es campo `private readonly ProductMethods _productMethods;` (:35) instanciado en el ctor (:81).

=== Methods/MaterialManagement/ProductMethods.cs:166-244 (namespace ServicioSap.Methods.MaterialManagement) ===
166|        /// <summary>
167|        /// Retrieve information from SAP DM-IM-11 Consulta de existencias applying filter with SAP format
168|        /// </summary>
169|        /// <returns>List<Product></returns>
170|        public async Task<List<Stock>> GetFilterProductsStockAsync(string filter)
171|        {
172|            var stocks = new List<Stock>();
173|            var url = Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV,Conexion.Nodos.SERVICE_URL) + $"/ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia?sap-client=110&$format=json&sap-language=ES&$filter={filter}";
174|
175|            try
176|            {
177|                var apiService = TokenGenerator.CreateClientS4();
178|
179|                var request = new HttpRequestMessage(HttpMethod.Get, url);
180|                request.Headers.Add("Accept", "application/json");
181|
182|                var response = await apiService.SendAsync(request).ConfigureAwait(false);
183|                string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
184|
185|                if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent))
186|                {
187|                    throw new Exception("Error al realizar la peticion a SAP. StatusCode: " + response.StatusCode + " Content: " + responseContent);
188|                }
189|
190|                var root = JsonSerializer.Deserialize<SapResponse>(responseContent);
191|                JsonElement results = root.d.results;
192|                stocks = JsonSerializer.Deserialize<List<Stock>>(results.GetRawText());
193|
194|                return stocks;
195|            }
196|            catch (Exception e)
197|            {
198|                throw new Exception($"Ocurrio un error al intentar obtener el stock de productos: {e.Message}");
199|            }
200|        }
201|
202|        /// <summary>
203|        /// Retrieve stock with individual filters (Material, Plant, StorageLoc)
204|        /// </summary>
205|        /// <returns>List<Stock></returns>
206|        public async Task<List<Stock>> GetStockAsync(string material = null, string plant = null, string storageLoc = null)
207|        {
208|            var stocks = new List<Stock>();
209|
210|            var filters = new List<string>();
211|            if (!string.IsNullOrEmpty(material))
212|                filters.Add($"Material eq '{material}'");
213|            if (!string.IsNullOrEmpty(plant))
214|                filters.Add($"Plant eq '{plant}'");
215|            if (!string.IsNullOrEmpty(storageLoc))
216|                filters.Add($"StorageLoc eq '{storageLoc}'");
217|
218|            var filterQuery = filters.Count > 0 ? $"&$filter={string.Join(" and ", filters)}" : "";
219|            var url = Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV,Conexion.Nodos.SERVICE_URL) + $"/ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia?sap-client=110&$format=json&sap-language=ES{filterQuery}";
220|
221|            try
222|            {
223|                var apiService = TokenGenerator.CreateClientS4();
224|
225|                var request = new HttpRequestMessage(HttpMethod.Get, url);
226|                request.Headers.Add("Accept", "application/json");
227|
228|                var response = await apiService.SendAsync(request).ConfigureAwait(false);
229|                string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
230|
231|                if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent))
232|                    throw new Exception("Error al realizar la peticion a SAP. StatusCode: " + response.StatusCode + " Content: " + responseContent);
233|
234|                var root = JsonSerializer.Deserialize<SapResponse>(responseContent);
235|                JsonElement results = root.d.results;
236|                stocks = JsonSerializer.Deserialize<List<Stock>>(results.GetRawText());
237|
238|                return stocks;
239|            }
240|            catch (Exception e)
241|            {
242|                throw new Exception($"Ocurrio un error al obtener stock: {e.Message}");
243|            }
244|        }
(Variantes del mismo archivo: :100-128 GetProductsStockAsync sin filtro con $expand=to_lotes,to_series; :250+ GetSerialStockAsync(material, plant, storageLoc, serialNumber) con $expand=to_series (:263) y filtra stock.to_series.results por SerialNumber (:282-290), devuelve List<SerialStockResponse>.)

=== Models/SAP/MaterialManagement/Stock.cs (completo) ===
1|using System.Collections.Generic;
2|
3|namespace ServicioSap.Models.SAP
4|{
5|    /// <summary>
6|    /// <c>Stock</c> model stands for the result of retrieve information from SAP object "D-IM-11 Consulta de existencias".
7|    /// </summary>
8|    public class Stock
9|    {
10|        public string Material { get; set; }
11|        public string Plant { get; set; }
12|        public string StorageLoc { get; set; }
13|        public string UnrestrictedUseStock { get; set; }
14|        public string BlockedStock { get; set; }
15|        public string BaseUnit { get; set; }
16|        public string ProductName { get; set; }
17|        public string ProductGroup { get; set; }
18|        public string CrossPlantStatus { get; set; }
19|        public StockSerieResult to_series { get; set; }
20|    }
21|
22|    public class StockSerieResult
23|    {
24|        public List<StockSerie> results { get; set; }
25|    }
26|}
(Nota: el namespace del modelo es ServicioSap.Models.SAP, no ...MaterialManagement, aunque el archivo vive en esa carpeta. SapResponse (Models/SapResponse.cs) expone `d.results` como JsonElement; el patron de deserializacion System.Text.Json `root.d.results.GetRawText()` es el estandar del proyecto.)