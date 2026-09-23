

## namespaces

RootNamespace del csproj: `ServicioSap` (ServicioSap.csproj:15). Namespaces REALES por carpeta (archivo:linea):

- Controllers\ -> `namespace ServicioSap.Controllers` (Controllers\CreditController.cs:7; Controllers\OrderController.cs:10)
- Methods\Credit\ -> `namespace ServicioSap.Methods.Credit` (Methods\Credit\CreditMethods.cs:9; Methods\Credit\CredilanaMethods.cs:7; Methods\Credit\DocumentMethods.cs:14; Methods\Credit\LiberadorCreditoMethods.cs:7)
- Methods\Order\ -> `namespace ServicioSap.Methods.Order` (Methods\Order\OrderMethods.cs:29)
- Methods\BusinessPartner\ -> `namespace ServicioSap.Methods.BusinessPartner` (Methods\BusinessPartner\BusinessPartnerMethods.cs:20)
- Methods\MaterialManagement\ -> `namespace ServicioSap.Methods.MaterialManagement` (Methods\MaterialManagement\ProductMethods.cs:24). OJO: Methods\WalletCustomer\WalletCustomerMethods.cs:12 TAMBIEN declara `ServicioSap.Methods.MaterialManagement` (no sigue la carpeta).
- Methods\Wallet\ -> `namespace ServicioSap.Methods.Wallet` (Methods\Wallet\WalletMethods.cs:11)
- Methods\Utils\ -> `namespace ServicioSap.Methods.Utils` (Methods\Utils\RequestMethods.cs:9)
- Methods\SalesDistribution\ -> `namespace ServicioSap.Methods.SalesDistribution` (Methods\SalesDistribution\MovBitaMethods.cs:9)
- Models\SAP\Credit\ -> `namespace ServicioSap.Models.SAP.Credit` (Models\SAP\Credit\SendSmsNewNumberRequest.cs:3; CreditAmountModels.cs:3; DocumentModels.cs:1; CondicionPagoResponse.cs:4)
- Models\SAP\Order\ -> `namespace ServicioSap.Models.SAP.Order` (Models\SAP\Order\InfoClienteRequest.cs:1; OrderRequest.cs:3)
- Models\SAP\BusinessPartner\ -> `namespace ServicioSap.Models.SAP.BusinessPartner` (Models\SAP\BusinessPartner\CteTel.cs:6; Partner.cs:6; Client.cs:8; Cte.cs:5). Subcarpeta BP05MA -> `ServicioSap.Models.SAP.BusinessPartner.BP05MA` (BusinessPartnerMa.cs:3)
- Models\SAP\WalletCustomer\ -> `namespace ServicioSap.Models.SAP` (NO lleva .WalletCustomer) (Models\SAP\WalletCustomer\CatalogoConfiguracion.cs:3; WalletCustomer.cs:7; MinimumCostToRedeemRequest.cs:3)
- Models\SAP\MaterialManagement\ -> `namespace ServicioSap.Models.SAP` (Product.cs:5; Stock.cs:3)
- Models\Database\ -> `namespace ServicioSap.Models.Database` (Models\Database\TempItemList.cs:6; ExistenciaAlmacen.cs:1)
- Models\ (raiz) -> `namespace ServicioSap.Models` (Models\SapResponse.cs:7; SapSingleResponse.cs:7; Login.cs:6)
- Models\Ecommerce\ -> `namespace ServicioSap.Models.Ecommerce` (Models\Ecommerce\AlmacenesConfig.cs:4). Excepcion: Models\Ecommerce\FamiliaLineaResponse.cs:6 = `ServicioSap.Models.SAP`.
- Helpers\ (raiz) -> `namespace ServicioSap.Helpers` (Helpers\Logger.cs:4; Helpers\TokenGenerator.cs:19; Helpers\PaymentConditionCatalog.cs:4; Helpers\TokenValidationHandler.cs:13; Helpers\ConexionSAP\ConexionSapConfig.cs:4)
- Helpers\ConexionDB\ -> `namespace ServicioSap.Helpers.ConexionDB` (Helpers\ConexionDB\ConexionSQL.cs:7; SQLiteDb.cs:7)
- Helpers\Logger\GeneradorLog.cs:4 -> `namespace ServicioSap.Helper` (singular, sin s)
- Helpers\Catalog\CatalogoMethods.cs:8 -> `namespace ServicioSap.Methods.Catalogs`; Helpers\CatalogState\CatalogoEstados.cs:5 -> `namespace ServicioSap.Methods.CatalogState`; Helpers\ConexionDMZ\Curl.cs:10 -> `ServicioSap.Helpers.ConexionDMZ`; Helpers\Impersonation\Impersonation.cs:5 -> `ServicioSap.Helpers.Impersonation`
- Namespace externo (DLL): `Conexion` (using Conexion;) -> clases `Conexion.Data` y enum `Conexion.Nodos` (Helpers\ConexionSAP\Conexion.dll, referenciada en ServicioSap.csproj:48-51).

Para archivos NUEVOS en Methods\Credit usar `ServicioSap.Methods.Credit`; en Models\SAP\Credit usar `ServicioSap.Models.SAP.Credit`; en Models\Database usar `ServicioSap.Models.Database`.

## forma_clase_methods

=== Methods\Credit\CreditMethods.cs (clase ESTATICA-por-uso: todos los metodos son `public static async`/`private static async`; no tiene constructor; el controller la llama como `CreditMethods.GetPlazosAsync()` sin instanciar). Lineas 1-12 y 117-156 y 262-295 VERBATIM:

```csharp
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ServicioSap.Helpers.ConexionDB;
using ServicioSap.Models.SAP.Credit;

namespace ServicioSap.Methods.Credit
{
    public class CreditMethods
    {
```
(:117-156)
```csharp
        public static async Task<Dictionary<string, int>> SendSmsNewNumberAsync(SendSmsNewNumberRequest request)
        {
            request.NumeroTelefono = Regex.Replace(request.NumeroTelefono, "[^0-9]", "");
            try
            {
                var conexionHelper = new conexionSQL();
                using (var sqlConnection = await conexionHelper.obtenerConexionAndroidAsync().ConfigureAwait(false))
                {
                    var idRef = await GetIdRefAsync(request.Cliente, request.IdCarrito, conexionHelper).ConfigureAwait(false);
                    if (idRef == "0" || string.IsNullOrEmpty(idRef))
                    {
                        idRef = await InsertCodigoVerificacionAsync(request.Cliente, request.IdCarrito, conexionHelper).ConfigureAwait(false);
                    }

                    // Si sigue vacio no avanzamos
                    if (string.IsNullOrEmpty(idRef)) return new Dictionary<string, int> { { "result", -1 } };

                    int idMensaje = !request.EsCredito ? 60 : 23;
                    string identificador = !request.EsCredito ? "DM0312" : "DM0363";
                    
                    var strQuery = string.Format(@"INSERT INTO TcAAEA00030_EnvioMensajes 
                    (IdRegistro, IdMensaje, Cliente, FechaEnvio, EstatusEnvio, ClienteF, Tipo, IntentoRespuesta, 
                     IntentoEnvio, Modem, Identificador, Telefono)
                    VALUES ({0}, {1}, '{2}', GETDATE(), 1, NULL, 0, 0, 0, NULL, '{3}', '{4}')",
                        idRef, idMensaje, request.Cliente, identificador, request.NumeroTelefono);
                    
                    using (var sqlCommand = new SqlCommand(strQuery, sqlConnection))
                    {
                        sqlCommand.CommandTimeout = 9999999;
                        var recordsAffected = await sqlCommand.ExecuteNonQueryAsync().ConfigureAwait(false);
                        return new Dictionary<string, int> { { "result", recordsAffected } };
                    }
                }
            }
            catch (Exception ex)
            {
                ServicioSap.Helpers.Logger.SAP("[CREDIT SendSmsNewNumber ERROR] ", ex.Message);
                return new Dictionary<string, int> { { "result", -1 } };
            }
        }
```
(:262-295)
```csharp
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
```
Otros metodos publicos estaticos de la clase: `GetPlazosAsync()` (:13), `IsValidatedAsync(string cliente)` (:230, instancia `new ServicioSap.Methods.BusinessPartner.BusinessPartnerMethods()` y hace `await bpMethods.GetClientAsync(cliente).ConfigureAwait(false)`), `GetCondicionesPagoAsync(string filter = null)` (:297).

=== Methods\Credit\CredilanaMethods.cs (clase de INSTANCIA, metodo generico): lineas 1-38 verbatim:
```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Newtonsoft.Json;
using ServicioSap.Helpers.ConexionDB;

namespace ServicioSap.Methods.Credit
{
    /// E-06 — lectura de la caché de Credilana en SQLite.
    /// Portado de APIMagento: Metodos\Credit\CredYPrestamo\CredyPrestamoMethods.cs::GetCredilanaInfo.
    public class CredilanaMethods
    {
        /// Devuelve el contenido de `data` deserializado al tipo pedido.
        public async Task<T> GetCredilanaInfoAsync<T>(string field, int uen)
        {
            var db = new SQLiteDb();
            string query = "SELECT data FROM mavi_credilana_info WHERE field = @field AND uen = @uen;";
            var parametros = new Dictionary<string, object>
            {
                { "@field", field },
                { "@uen", uen }
            };

            var tabla = await db.GetAsync(query, parametros);
            if (tabla == null || tabla.Rows.Count == 0)
                throw new InvalidOperationException(
                    $"mavi_credilana_info no tiene fila para field='{field}' uen={uen}. " +
                    "La llena M-07 (credit/SaveCredilanaInfo).");

            string data = tabla.Rows[0]["data"].ToString();
            if (string.IsNullOrWhiteSpace(data))
                throw new InvalidOperationException(
                    $"mavi_credilana_info.data vacío para field='{field}' uen={uen}.");

            return JsonConvert.DeserializeObject<T>(data);
        }
    }
}
```

=== Methods\Credit\DocumentMethods.cs cabecera (:1-49) — clase de INSTANCIA con const + propiedad estatica leyendo AppSettings:
```csharp
using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ServicioSap.Helpers;
using ServicioSap.Helpers.ConexionDB;
using ServicioSap.Models.SAP.Credit;

namespace ServicioSap.Methods.Credit
{
    /// E-07 y E-08 — guardado de documentos e imágenes de expediente en MAVI_DOC_CTE (AdminDoc)
    /// y en el sistema de archivos.
    /// ... (comentario largo omitido aqui, esta en :16-32)
    public class DocumentMethods
    {
        /// Ruta donde se guardan los archivos de E-08.
        private const string FallbackImagesPath = @"C:\inetpub\wwwroot\sap\images\credit";

        private static string ImagesPath
        {
            get
            {
                string configurada = ConfigurationManager.AppSettings["IMAGES_CREDIT_PATH"];
                return string.IsNullOrWhiteSpace(configurada) ? FallbackImagesPath : configurada;
            }
        }

        #region E-07 — credit/guardardocumento
        public async Task<object> GuardarDocumentoAsync(BodyImagenBase64 bodyMultipart)
        {
```

=== Methods\Order\OrderMethods.cs cabecera (:1-83) VERBATIM — clase de INSTANCIA con colaboradores en campos readonly y constantes privadas:
```csharp
using Conexion;
using ServicioSap.Helpers;
using ServicioSap.Helpers.ConexionDB;
using ServicioSap.Helpers.ConexionDMZ;
using ServicioSap.Methods.BusinessPartner;
using ServicioSap.Methods.Credit;
using ServicioSap.Methods.MaterialManagement;
using ServicioSap.Methods.SalesDistribution;
using ServicioSap.Methods.Utils;
using ServicioSap.Models;
using ServicioSap.Models.SAP.BusinessPartner;
using ServicioSap.Models.SAP.Order;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using OrderModel = ServicioSap.Models.SAP.Order.Order;
using OrderResponse = ServicioSap.Models.SAP.Order.Response;

namespace ServicioSap.Methods.Order
{

    public class OrderMethods
    {
        // Dependencias
        private readonly ProductMethods _productMethods;
        private readonly FinalListProperMethods _preciosMethods;

        // Términos de pago y partner
        private const string PaymentTermsContado = "ACEF";
        private const string PaymentTermsMeses = "12IA";
        private const string GuestCashPartnerNumber = "1500003857";
        
        // Métodos de pago (del código LAN)
        private const string CREDIT_METHOD = "omnipro_pago_credito";
        private const string OPENPAY_METHOD = "openpay_cards";
        private const string PAYPAL_METHOD = "paypal_express";
        private const string OPENPAY_STORES_METHOD = "openpay_stores";
        
        // Condiciones de pago
        private const string CONDICION_CONTADO = "ACEF";
        private const string CONDICION_12M_IA = "12IA";
        private const string CONDICION_12M_DA = "12DA";
        private const string CONDICION_12M_VIU_PP = "12 M VIU PP";
        private const string CONDICION_12M_MA_P_DIF = "12 M MA P DIF";
        private const string CONDICION_12M_MA_P_INM = "12 M MA P INM";
        
        // Métodos de envío y tiendas
        private const string METODO_ENVIO_PICKUP = "instore_pickup";
        private const string STORE_MA = "muebles_america";
        private const string STORE_VIU = "viu";

        // (comentario :62-71 sobre Agente Z1)
        private const string AGENTE_Z1_SIN_ASIGNAR = "";

        // Constantes de UEN y regiones
        private const string UEN_MUEBLES_AMERICA = "1";
        private const string UEN_VIU = "2";

        // Constructor
        public OrderMethods()
        {
            _productMethods = new ProductMethods();
            _preciosMethods = new FinalListProperMethods();
        }

        #region FASE 1 - PRE-SAP: Transformación & Validación
```

Metodo async representativo de OrderMethods (:621-650, `IsValidatedAsync`, lee BP05MA y filtra en memoria):
```csharp
        private async Task<string> IsValidatedAsync(string cliente)
        {
            try
            {
                var bpMethods = new BusinessPartnerMethods();
                var partnerMa = await bpMethods.GetClientMaAsync(cliente).ConfigureAwait(false);

                var telefonos = partnerMa?.To_CteTel?.Results;
                if (telefonos == null || telefonos.Count == 0)
                    return "";

                // Replica el WHERE del legacy sobre la coleccion:
                //   Tipo = 'Movil'  ->  ZtipoCte (en SAP llega como "MOVIL")
                //   ValidacionTel=1 ->  Zvaltel
                //   IsInTableStd    ->  ZappOrig con origen registrado
                var validado = telefonos.FirstOrDefault(t =>
                    t != null
                    && t.Zvaltel
                    && !string.IsNullOrWhiteSpace(t.ZappOrig)
                    && !string.IsNullOrWhiteSpace(t.ZtelCte)
                    && string.Equals(t.ZtipoCte, "MOVIL", StringComparison.OrdinalIgnoreCase));

                return validado?.ZtelCte ?? "";
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error IsValidated() => " + ex.Message);
                return "";
            }
        }
```
Y el orquestador de credito (:682-802 `ProcessCreditPaymentAsync`), fragmento clave :706-716 (parseo de lada y llamada al SP):
```csharp
                // Parsear teléfono validado
                var ladaDeDos = new string[] { "33", "55", "81" };
                var telAux = !string.IsNullOrWhiteSpace(numeroDelSms) ? numeroDelSms : (!string.IsNullOrWhiteSpace(numeroValidado) ? numeroValidado : (order.infoCliente?.telefono ?? "0"));
                var ladaLength = (telAux.Length >= 2 && ladaDeDos.Contains(telAux.Substring(0, 2))) ? 2 : 3;
                var ladaValidar = telAux.Length >= ladaLength ? telAux.Substring(0, ladaLength) : "0";
                var telefonoValidar = telAux.Length >= ladaLength ? telAux.Substring(ladaLength) : "0";

                // Crear solicitud en Android
                int idSolicitud = await CrearSolicitudCreditoAsync(order, datosArray, ladaValidar, telefonoValidar).ConfigureAwait(false);
                if (idSolicitud <= 0)
                    throw new Exception("No se pudo generar la solicitud de crédito.");
```
Llamador (:1869-1891 en `SetOrderAsync`): `var numeroDelSms = await ObtenerNumeroTablaSmsAsync(sDatosPedido[36]).ConfigureAwait(false); var numeroValidado = await IsValidatedAsync(sDatosPedido[36]).ConfigureAwait(false); var isValidated = numeroValidado == numeroDelSms; string cuentaCredito = await ProcessCreditPaymentAsync(orderRequest, sDatosPedido, articulos, numeroValidado, numeroDelSms, isValidated).ConfigureAwait(false);` y devuelve `new OrderResponse { Resultado = "Concluido", Zctefinal = cuentaCredito, Zidecomm = incrementId }`.
Helper privado `ValidateOnlyNumbers` (:308-312): `private string ValidateOnlyNumbers(string input) { if (string.IsNullOrWhiteSpace(input)) return string.Empty; return System.Text.RegularExpressions.Regex.Replace(input, "[^0-9]", ""); }`
Firma del orquestador: `public async Task<OrderResponse> SetOrderAsync(OrderRequest orderRequest, string tipo = "")` (:1812). El controller lo instancia: `var orderMethods = new OrderMethods(); var newOrder = await orderMethods.SetOrderAsync(order, "Insert");` (Controllers\OrderController.cs:24-27).

## sql_android_patron

=== Helpers\ConexionDB\ConexionSQL.cs COMPLETO (196 lineas). Nombre de clase en minuscula: `conexionSQL`. Namespace `ServicioSap.Helpers.ConexionDB`. TODOS los metodos devuelven la conexion YA ABIERTA (no volver a abrir).

```csharp
using Conexion;
using System;
using System.Data;
using System.Data.SqlClient;
using System.Reflection;
using System.Threading.Tasks;
namespace ServicioSap.Helpers.ConexionDB
{
    public class conexionSQL
    {
        public SqlConnection obtenerConexionSigMavi()
        {
            SqlConnection con = null;

            Properties.Settings settings = new Properties.Settings();
            
            try
            {
                con = Conexion.Data.getconexion(settings.Server, "SIGMavi");

                if (con != null)
                {
                    SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder(con.ConnectionString);
                    builder.ApplicationName = Assembly.GetCallingAssembly().GetName().Name;
                    con.ConnectionString = builder.ConnectionString;
                    if (con.State != ConnectionState.Open)
                    {
                        con.Open();
                    }
                }
                return con;
            }
            catch (Exception ex)
            {
                if (con != null && con.State == ConnectionState.Open) con.Close();
                throw new Exception("Error en obtenerConexionSigMavi: " + ex.Message, ex);
            }
        }

        public SqlConnection obtenerConexionAndroid()
        {
            SqlConnection con = null;
            
            try
            {
                // Extraer de Web.config
                string connectionString = System.Configuration.ConfigurationManager.ConnectionStrings["MAVICBOSANDROID"]?.ConnectionString;
                if (string.IsNullOrEmpty(connectionString))
                    throw new Exception("No se encontró la cadena de conexión MAVICBOSANDROID en el Web.config.");

                con = new SqlConnection(connectionString);

                if (con != null)
                {
                    SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder(con.ConnectionString);
                    builder.ApplicationName = Assembly.GetCallingAssembly().GetName().Name;
                    con.ConnectionString = builder.ConnectionString;
                    if (con.State != ConnectionState.Open)
                    {
                        con.Open();
                    }
                }
                return con;
            }
            catch (Exception ex)
            {
                if (con != null && con.State == ConnectionState.Open) con.Close();
                throw new Exception("Error en obtenerConexionAndroid: " + ex.Message, ex);
            }
        }

        public async Task<SqlConnection> obtenerConexionSigMaviAsync()
        {
            SqlConnection con = null;
            Properties.Settings settings = new Properties.Settings();
            
            try
            {
                con = Conexion.Data.getconexion(settings.Server, "SIGMavi");

                if (con != null)
                {
                    SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder(con.ConnectionString);
                    builder.ApplicationName = Assembly.GetCallingAssembly().GetName().Name;
                    con.ConnectionString = builder.ConnectionString;
                    if (con.State != ConnectionState.Open)
                    {
                        await con.OpenAsync();
                    }
                }
                return con;
            }
            catch (Exception ex)
            {
                if (con != null && con.State == ConnectionState.Open) con.Close();
                throw new Exception("Error en obtenerConexionSigMaviAsync: " + ex.Message, ex);
            }
        }

        public async Task<SqlConnection> obtenerConexionAndroidAsync()
        {
            SqlConnection con = null;

            try
            {
                string connectionString = System.Configuration.ConfigurationManager.ConnectionStrings["MAVICBOSANDROID"]?.ConnectionString;
                if (string.IsNullOrEmpty(connectionString))
                    throw new Exception("No se encontró la cadena de conexión MAVICBOSANDROID en el Web.config.");

                con = new SqlConnection(connectionString);

                if (con != null)
                {
                    SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder(con.ConnectionString);
                    builder.ApplicationName = Assembly.GetCallingAssembly().GetName().Name;
                    con.ConnectionString = builder.ConnectionString;
                    if (con.State != ConnectionState.Open)
                    {
                        await con.OpenAsync();
                    }
                }
                return con;
            }
            catch (Exception ex)
            {
                if (con != null && con.State == ConnectionState.Open) con.Close();
                throw new Exception("Error en obtenerConexionAndroidAsync: " + ex.Message, ex);
            }
        }

        // H-01: portado de APIMagento (Conn\Connection.cs: sCadenaConexionAdminDoc).
        // La necesitan E-07 (credit/guardardocumento) y E-08 (credit/SaveImagesProductosMx)
        // para escribir en MAVI_DOC_CTE — mismo patrón que obtenerConexionAndroid().
        public SqlConnection obtenerConexionAdminDoc()
        {
            SqlConnection con = null;

            try
            {
                string connectionString = System.Configuration.ConfigurationManager.ConnectionStrings["ADMINDOC"]?.ConnectionString;
                if (string.IsNullOrEmpty(connectionString))
                    throw new Exception("No se encontró la cadena de conexión ADMINDOC en el Web.config.");

                con = new SqlConnection(connectionString);

                if (con != null)
                {
                    SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder(con.ConnectionString);
                    builder.ApplicationName = Assembly.GetCallingAssembly().GetName().Name;
                    con.ConnectionString = builder.ConnectionString;
                    if (con.State != ConnectionState.Open)
                    {
                        con.Open();
                    }
                }
                return con;
            }
            catch (Exception ex)
            {
                if (con != null && con.State == ConnectionState.Open) con.Close();
                throw new Exception("Error en obtenerConexionAdminDoc: " + ex.Message, ex);
            }
        }

        public async Task<SqlConnection> obtenerConexionAdminDocAsync()
        {
            SqlConnection con = null;

            try
            {
                string connectionString = System.Configuration.ConfigurationManager.ConnectionStrings["ADMINDOC"]?.ConnectionString;
                if (string.IsNullOrEmpty(connectionString))
                    throw new Exception("No se encontró la cadena de conexión ADMINDOC en el Web.config.");

                con = new SqlConnection(connectionString);

                if (con != null)
                {
                    SqlConnectionStringBuilder builder = new SqlConnectionStringBuilder(con.ConnectionString);
                    builder.ApplicationName = Assembly.GetCallingAssembly().GetName().Name;
                    con.ConnectionString = builder.ConnectionString;
                    if (con.State != ConnectionState.Open)
                    {
                        await con.OpenAsync();
                    }
                }
                return con;
            }
            catch (Exception ex)
            {
                if (con != null && con.State == ConnectionState.Open) con.Close();
                throw new Exception("Error en obtenerConexionAdminDocAsync: " + ex.Message, ex);
            }
        }
    }
}
```
Como se leen los connection strings: Android y AdminDoc via `System.Configuration.ConfigurationManager.ConnectionStrings["MAVICBOSANDROID"]?.ConnectionString` (:47, :106) / `["ADMINDOC"]` (:140, :171). SigMavi NO sale de Web.config: sale de `Conexion.Data.getconexion(settings.Server, "SIGMavi")` (:19, :79) donde `settings.Server` = `Properties.Settings.Server` = "DEVMAVI" (Properties\Settings.Designer.cs:26-36; Web.config:158-164 `<applicationSettings><ServicioSap.Properties.Settings><setting name="Server">DEVMAVI`).

=== USO REAL: Methods\Order\OrderMethods.cs:862-932 `CrearSolicitudCreditoAsync` (llamada actual al SP_CREDITO_WEB_DATOS, binding por NOMBRE, 38 parametros) VERBATIM:
```csharp
        private async Task<int> CrearSolicitudCreditoAsync(OrderRequest order, string[] datosArray, string ladaValidar, string telefonoValidar)
        {
            try
            {
                var db = new conexionSQL();
                using (var cnn = await db.obtenerConexionAndroidAsync().ConfigureAwait(false))
                using (var command = new SqlCommand("SP_CREDITO_WEB_DATOS", cnn) { CommandType = CommandType.StoredProcedure })
                {
                    var info = order.infoCliente ?? new InfoClienteRequest();
                    int uen = order.storeId?.ToUpper().Equals("VIU") == true ? 2 : 1;

                    command.Parameters.Add("@Id", SqlDbType.Int).Value = 0;
                    command.Parameters.Add("@Op", SqlDbType.VarChar).Value = "Insert";
                    command.Parameters.Add("@apellido_p", SqlDbType.VarChar).Value = info.apellidoPaternoClienteMavi ?? "";
                    command.Parameters.Add("@apellido_m", SqlDbType.VarChar).Value = info.apellidoMaternoClienteMavi ?? "";
                    command.Parameters.Add("@nombre", SqlDbType.VarChar).Value = info.nombreClienteMavi ?? "";
                    command.Parameters.Add("@fecha_nacimiento", SqlDbType.VarChar).Value = "";
                    command.Parameters.Add("@rfc", SqlDbType.VarChar).Value = "";
                    command.Parameters.Add("@sexo", SqlDbType.VarChar).Value = "";
                    command.Parameters.Add("@email", SqlDbType.VarChar).Value = info.correo ?? "";
                    command.Parameters.Add("@direccion", SqlDbType.VarChar).Value = info.direccion ?? "";
                    command.Parameters.Add("@exterior", SqlDbType.VarChar).Value = info.numExt ?? "";
                    command.Parameters.Add("@interior", SqlDbType.VarChar).Value = info.numInt ?? "";
                    command.Parameters.Add("@entre_calles", SqlDbType.VarChar).Value = "";
                    command.Parameters.Add("@codigo_postal", SqlDbType.VarChar).Value = info.codigoPostal ?? "";
                    command.Parameters.Add("@delegacion", SqlDbType.VarChar).Value = info.municipio ?? "";
                    command.Parameters.Add("@poblacion", SqlDbType.VarChar).Value = info.municipio ?? "";
                    command.Parameters.Add("@estado", SqlDbType.VarChar).Value = info.estado ?? "";
                    command.Parameters.Add("@colonia", SqlDbType.VarChar).Value = info.colonia ?? "";
                    command.Parameters.Add("@estado_civil", SqlDbType.VarChar).Value = "";
                    command.Parameters.Add("@articulo", SqlDbType.VarChar).Value = "";
                    command.Parameters.Add("@uen", SqlDbType.Int).Value = uen;
                    command.Parameters.Add("@condicion", SqlDbType.VarChar).Value = order.articulos?.FirstOrDefault()?.condicion ?? "";
                    command.Parameters.Add("@cliente", SqlDbType.VarChar).Value = info.cuenta ?? "";
                    command.Parameters.Add("@utmSource", SqlDbType.VarChar).Value = order.utmSource ?? "";
                    command.Parameters.Add("@sucursal", SqlDbType.Int).Value = uen.Equals(2) ? 505 : 504;
                    command.Parameters.Add("@origen", SqlDbType.VarChar).Value = "PRODUCTOS MX";
                    command.Parameters.Add("@idMagento", SqlDbType.VarChar).Value = order.incrementId ?? "0";
                    command.Parameters.Add("@MetodoEnvio", SqlDbType.VarChar).Value = order.metodoEnvio ?? "";
                    command.Parameters.Add("@lada_particular", SqlDbType.VarChar).Value = "0";
                    command.Parameters.Add("@telefono_particular", SqlDbType.VarChar).Value = "0";
                    command.Parameters.Add("@lada_celular", SqlDbType.VarChar).Value = "0";
                    command.Parameters.Add("@telefono_celular", SqlDbType.VarChar).Value = ValidateOnlyNumbers(info.telefono ?? "0");
                    command.Parameters.Add("@sucursalDestino", SqlDbType.Int).Value = order.sucursalDestino;
                    command.Parameters.Add("@RedimirMonedero", SqlDbType.Money).Value = (decimal)order.RedimirMonedero;
                    command.Parameters.Add("@ValidacionTelefono", SqlDbType.Bit).Value = DBNull.Value;
                    command.Parameters.Add("@OrigenIdMagento", SqlDbType.VarChar).Value = info.OrigenIdMagento ?? "";
                    command.Parameters.Add("@LadaValidar", SqlDbType.VarChar).Value = ladaValidar;
                    command.Parameters.Add("@TelefonoValidar", SqlDbType.VarChar).Value = telefonoValidar;

                    //cnn.Open();
                    var ds = new DataSet();
                    var da = new SqlDataAdapter(command);
                    da.Fill(ds);

                    if (ds.Tables.Count > 0 && ds.Tables[0].Rows.Count > 0)
                    {
                        string res = ds.Tables[0].Rows[0][0].ToString();
                        int.TryParse(res, out int idSolicitudGenerada);
                        return idSolicitudGenerada;
                    }
                    return 0;
                }
            }
            catch (Exception ex)
            {
                // El mensaje de log se conserva sin el sufijo Async a proposito (Regla 5).
                Console.WriteLine("Error CrearSolicitudCredito: " + ex.Message);
                return 0;
            }
        }
```
(El <remarks> :846-861 documenta: "Replica 1 a 1 la llamada de LAN (WebApiMagento\Metodos\CreditMethods.cs:121-190): los mismos 38 parametros... @rfc, @sexo, @fecha_nacimiento, @estado_civil: LAN los toma del maestro de cliente (getClientInfo). El equivalente en SAP es BP05; falta conectarlo... @ValidacionTelefono lo manda LAN calculado, pero el SP lo PISA siempre (SP_CREDITO_WEB_DATOS.sql:215-221)".)

=== USO REAL: lectura de TcAAEA00030_EnvioMensajes en OrderMethods.cs:573-603 VERBATIM (variante con CreateCommand + parametro tipado + ExecuteScalarAsync; NOTA: el WHERE difiere de la copia de CreditMethods.cs:270-273):
```csharp
        #region FASE 5 - CRÉDITO & VALIDACIÓN PHONE

        /// <summary>
        /// Obtiene número de teléfono SMS del cliente desde tabla de envío de mensajes.
        /// Busca el número más reciente registrado.
        /// </summary>
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
```

=== USO REAL: INSERT directo a tabla de Android con parametros reutilizados en loop, OrderMethods.cs:980-1006 (`InsertCreditArticlesAsync`):
```csharp
            var db = new conexionSQL();
            using (var cnn = await db.obtenerConexionAndroidAsync().ConfigureAwait(false))
            {
                try
                {
                    // obtenerConexionAndroidAsync YA devuelve la conexion abierta (ConexionSQL.cs:117-120).
                    // El Open() que habia aqui lanzaba InvalidOperationException y el catch lo silenciaba,
                    // por lo que NUNCA se insertaba una sola linea. Se deja solo una guarda defensiva.
                    if (cnn.State != System.Data.ConnectionState.Open)
                        await cnn.OpenAsync().ConfigureAwait(false);

                    int orden = 1;
                    string prevArt = "";

                    string query = @"INSERT INTO MAVIANDROID01.ServicioAndroid.dbo.VTASdArtCreditoWeb 
                                     (IdArtCreditoWeb, cantidad, articulo, precio, Orden, Abono, costo) 
                                     VALUES (@IdCredito, @Cantidad, @Articulo, @Precio, @Orden, @Abono, @Costo)";

                    using (var cmd = new SqlCommand(query, cnn))
                    {
                        var pId = cmd.Parameters.Add("@IdCredito", SqlDbType.Int);
                        var pCantidad = cmd.Parameters.Add("@Cantidad", SqlDbType.Int);
                        var pArticulo = cmd.Parameters.Add("@Articulo", SqlDbType.VarChar);
                        var pPrecio = cmd.Parameters.Add("@Precio", SqlDbType.Float);
                        var pOrden = cmd.Parameters.Add("@Orden", SqlDbType.Int);
                        var pAbono = cmd.Parameters.Add("@Abono", SqlDbType.Float);
                        var pCosto = cmd.Parameters.Add("@Costo", SqlDbType.Float);
```

=== USO REAL: INSERT parametrizado con SqlParameter{Value} y DBNull, DocumentMethods.cs:136-137 y :170-184 (AdminDoc, mismo servidor):
```csharp
                var conexionHelper = new conexionSQL();
                using (SqlConnection sqlConnection = await conexionHelper.obtenerConexionAdminDocAsync())
                {
                    ...
                    using (SqlCommand command = new SqlCommand(guardarDocumentoGeneralSql, sqlConnection))
                    {
                        command.CommandType = CommandType.Text;
                        command.Parameters.Add(new SqlParameter("@Opcion", SqlDbType.VarChar) { Value = escliente ? "Cliente" : "Token" });
                        command.Parameters.Add(new SqlParameter("@Documento", SqlDbType.VarBinary) { Value = bdoc });
                        command.Parameters.Add(new SqlParameter("@Tipo", SqlDbType.Int) { Value = bodyMultipart.TipoDoc });
                        command.Parameters.Add(new SqlParameter("@Cliente", SqlDbType.VarChar) { Value = bodyMultipart.Cliente ?? (object)DBNull.Value });
                        ...
                        using (SqlDataReader reader = await command.ExecuteReaderAsync())
                        {
                            if (reader.HasRows)
```

=== USO REAL SigMavi (por si hace falta): OrderMethods.cs:3423-3455 `public static async Task<string> GetCondicionAsync(string condicionMagento, string storeId)` usa `conexionHelper.obtenerConexionSigMaviAsync()`, query `SELECT TOP 1 Condicion FROM CondicionesCredVtaLinea WITH (NOLOCK) WHERE CondicionMagento = @CondicionMagento AND REPLACE(TiendaVirtual, ' ', '_') = @StoreId`, `sc.Parameters.Add("@CondicionMagento", SqlDbType.VarChar).Value = condicionMagento;`, `ExecuteScalarAsync`, catch -> `Logger.SAP("[ORDER GetCondicion ERROR] ", ex.Message);` y fallback `return PaymentConditionCatalog.GetSapPaymentCode(condicionMagento);`.

=== SQLite (Helpers\ConexionDB\SQLiteDb.cs): API publica: `void Set(string query)` (:40), `List<List<string>> Get(string query, List<string> campos)` (:60), `Task SetAsync(string query)` (:158, TRAGA la excepcion), `Task<List<List<string>>> GetAsync(string query, List<string> campos)` (:178), `Task<DataTable> GetAsync(string query)` (:211), `Task<DataTable> GetAsync(string query, IDictionary<string, object> parametros)` (:240, esta SI propaga excepcion, usa `cmd.Parameters.AddWithValue(p.Key, p.Value ?? DBNull.Value)`). Ruta: AppSettings["SQLITE_DB_PATH"] + "data.db" (:11-21).

=== Parametros del SP para no inventar nombres (SPsOrden\SP_CREDITO_WEB_DATOS.sql:92-159): @Id INT, @Op VARCHAR(20), @apellido_p VARCHAR(30), @apellido_m VARCHAR(30), @nombre VARCHAR(25), @nombre_2 VARCHAR(30), @fecha_nacimiento DATE, @rfc VARCHAR(13), @sexo VARCHAR(9), @email VARCHAR(50), @direccion VARCHAR(30), @exterior VARCHAR(8), @interior VARCHAR(8), @entre_calles VARCHAR(80), @years_old INT, @months_old INT, @codigo_postal VARCHAR(6), @delegacion VARCHAR(25), @poblacion VARCHAR(30), @estado VARCHAR(30), @colonia VARCHAR(30), @estado_civil VARCHAR(11), @vive_en_calidad VARCHAR(11), @sueldo MONEY, @tarjeta VARCHAR(1), @tarjeta_digitos INT, @credito_hipoteca VARCHAR(1), @credito_automotriz VARCHAR(1), @lada_particular INT, @telefono_particular VARCHAR(10), @lada_celular INT, @telefono_celular VARCHAR(10), @ext_archivo_1/2/3 VARCHAR(5), @articulo VARCHAR(20), @uen INT, @condicion VARCHAR(20), @cliente VARCHAR(9), @utmSource VARCHAR(100), @die BIT, @sucursal INT, @origen VARCHAR(20), @parentesco_ref VARCHAR(15), @nombre_ref VARCHAR(40), @apellido_p_ref VARCHAR(30), @apellido_m_ref VARCHAR(4000), @lada_particular_ref INT, @telefono_particular_ref VARCHAR(10), @tipo_tel_ref INT, @codigo VARCHAR(40), @ClienteMagento VARCHAR(12), @idMagento VARCHAR(12), @MetodoEnvio VARCHAR(12), @estatus INT = 0, @CodigoRecomendador VARCHAR(15), @SucursalDestino INT = 0, @Agente VARCHAR(10), @RedimirMonedero MONEY, @ValidacionTelefono BIT, @OrigenIdMagento VARCHAR(20), @LadaValidar INT, @TelefonoValidar VARCHAR(10), @Curp VARCHAR(20), @FechaCita DATE, @HoraCita VARCHAR(100). Todos `= NULL` salvo donde se indica.

## odata_get_patron

=== GET OData V2 canonico: Methods\BusinessPartner\BusinessPartnerMethods.cs:24-69 `GetClientAsync` VERBATIM:
```csharp
        /// <summary>
        /// Retrieve information from SAP "BP05 Exposicion de datos BP a POS"
        /// </summary>
        public async Task<Partner> GetClientAsync(string clientId)
        {
            var partner = new List<Partner>();
            var url = Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL) + $"/ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter=BusinessPartner eq '{clientId}'&$top=1&sap-client=110&$format=json";
            try
            {
                var apiService = TokenGenerator.CreateClientS4();

                using (var request = new HttpRequestMessage(HttpMethod.Get, url))
                {
                    request.Headers.Add("Accept", "application/json");

                    using (var response = await apiService.SendAsync(request).ConfigureAwait(false))
                    {
                        string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

                        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent))
                        {
                            throw new Exception("Error SAP. StatusCode: " + response.StatusCode + " Content: " + responseContent);
                        }

                        if (responseContent.TrimStart().StartsWith("<html", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new Exception("SAP devolvio HTML en lugar de JSON. Content: " + responseContent);
                        }

                        var root = JsonSerializer.Deserialize<SapResponse>(responseContent);
                        JsonElement results = root.d.results;
                        partner = JsonSerializer.Deserialize<List<Partner>>(results.GetRawText()) ?? new List<Partner>();
                        if (partner.Count <= 0)
                        {
                            throw new Exception("No se encontraron clientes");
                        }

                        return partner[0];
                    }
                }
            }
            catch (Exception e)
            {
                throw new Exception($"Ocurrio un error al intentar obtener el listado de clientes: {e.Message}");
            }
        }
```
Usings de ese archivo (:1-18): `using Conexion; using Newtonsoft.Json.Linq; using ServicioSap.Helpers; using ServicioSap.Methods.CatalogState; using ServicioSap.Models; using ServicioSap.Models.SAP.BusinessPartner; using ServicioSap.Models.SAP.BusinessPartner.BP05MA; using ServicioSap.Models.SAP.SuccessFactor; using ServicioSap.Models.SAP.Order; using System; using System.Collections.Generic; using System.Configuration; using System.Linq; using System.Net.Http; using System.Text; using System.Text.Json; using System.Text.Json.Serialization; using System.Threading.Tasks;`

=== GET OData con clave compuesta + $expand (BP05MA), BusinessPartnerMethods.cs:297-340 `GetClientMaAsync`:
```csharp
        public async Task<BusinessPartnerMa> GetClientMaAsync(string partnerId, string client = "110")
        {
            var expandQuery = "to_CteTel,to_CteDomicilio,to_CteSociedad,to_CtePersonalAdr,to_CteContacto,to_CteCliente,to_CteDatosComerciales,to_Cte,to_CtePersonaContacto,to_CteDatosBancarios,to_CteFuncInterlocutor,to_CteImpuestos";

            var url = Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL) 
                      + $"/ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='{partnerId}',Client='{client}')?$expand={expandQuery}&sap-client={client}&$format=json";

            try
            {
                var apiService = TokenGenerator.CreateClientS4();

                using (var request = new HttpRequestMessage(HttpMethod.Get, url))
                {
                    request.Headers.Add("Accept", "application/json");

                    using (var response = await apiService.SendAsync(request).ConfigureAwait(false))
                    {
                        string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

                        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent))
                        {
                            throw new Exception("Error SAP BP05MA. StatusCode: " + response.StatusCode + " Content: " + responseContent);
                        }

                        if (responseContent.TrimStart().StartsWith("<html", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new Exception("SAP devolvio HTML en lugar de JSON. Content: " + responseContent);
                        }

                        var root = JsonSerializer.Deserialize<BusinessPartnerMaResponse>(responseContent);
                        if (root?.Data == null)
                        {
                            throw new Exception("No se encontro informacion del cliente en BP05MA");
                        }

                        return root.Data;
                    }
                }
            }
            catch (Exception e)
            {
                throw new Exception($"Ocurrio un error al intentar obtener el cliente BP05MA: {e.Message}");
            }
        }
```
Wrapper de esa respuesta: Models\SAP\BusinessPartner\BP05MA\BusinessPartnerMa.cs:1-9: `using System.Text.Json.Serialization; namespace ServicioSap.Models.SAP.BusinessPartner.BP05MA { public class BusinessPartnerMaResponse { [JsonPropertyName("d")] public BusinessPartnerMa Data { get; set; } } public class BusinessPartnerMa { public string Partner {get;set;} ... }`. En OrderMethods.cs:628 se navega `partnerMa?.To_CteTel?.Results` y cada item tiene `Zvaltel`, `ZappOrig`, `ZtelCte`, `ZtipoCte` (:636-641).

=== GET OData V4 con path externalizado en Web.config (ZAPI_CONDPAGO): Methods\Credit\CreditMethods.cs:297-349 `GetCondicionesPagoAsync` VERBATIM:
```csharp
        public static async Task<List<CondicionPagoResult>> GetCondicionesPagoAsync(string filter = null)
        {
            try
            {
                string baseUrl = Conexion.Data.obtenerUrl(Conexion.Nodos.ENVIROMENT_DEV, Conexion.Nodos.SERVICE_URL);
                baseUrl = baseUrl.Replace("/odata/sap", "/odata4/sap");

                string zapiCondpago = System.Configuration.ConfigurationManager.AppSettings["ZAPI_CONDPAGO"];
                if (string.IsNullOrEmpty(zapiCondpago))
                {
                    throw new Exception("No se encontró la configuración ZAPI_CONDPAGO en el Web.config");
                }
                // obtenerUrl no trae "/" final: se normaliza para tolerar la llave con o sin barra.
                if (!zapiCondpago.StartsWith("/"))
                    zapiCondpago = "/" + zapiCondpago;

                string s4Url = $"{baseUrl.TrimEnd('/')}{zapiCondpago}?sap-client=110&sap-language=ES";

                if (!string.IsNullOrWhiteSpace(filter))
                {
                    s4Url += $"&$filter={filter}";
                }

                var apiService = ServicioSap.Helpers.TokenGenerator.CreateClientS4();

                using (var request = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Get, s4Url))
                {
                    request.Headers.Add("Accept", "application/json");

                    using (var response = await apiService.SendAsync(request).ConfigureAwait(false))
                    {
                        string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

                        if (!response.IsSuccessStatusCode)
                        {
                            throw new Exception($"Error en SAP Condiciones Pago (SD40). StatusCode: {response.StatusCode} Content: {responseContent}");
                        }

                        if (string.IsNullOrWhiteSpace(responseContent))
                        {
                            return new List<CondicionPagoResult>();
                        }

                        var jsonResponse = Newtonsoft.Json.JsonConvert.DeserializeObject<CondicionPagoResponse>(responseContent);
                        return jsonResponse?.Value ?? new List<CondicionPagoResult>();
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Error intentando obtener las condiciones de pago (SD40): {ex.Message}", ex);
            }
        }
```

=== Variante GET con Newtonsoft y wrapper propio D/Results: BusinessPartnerMethods.cs:875-905 `GetConsultaAnexosAsync`: url = `$"{baseUrl}/ZQBC_CODEMSTRD_SRV/WACODEMSTRDSet?$filter=ZcodeProgram eq '{valorAnexo}'&$format=json&sap-client=110"`, `var httpClient = TokenGenerator.CreateClientS4(); var response = await httpClient.GetAsync(url).ConfigureAwait(false);`, deserializa `Newtonsoft.Json.JsonConvert.DeserializeObject<AnexosResponse>(responseContent)` y devuelve `jsonResponse?.D?.Results ?? new List<AnexosResult>()`; catch: `ServicioSap.Helpers.Logger.SAP("[BusinessPartnerMethods GetConsultaAnexosAsync ERROR] ", ex.Message); throw new Exception($"Error al consultar anexos en SAP: {ex.Message}");`.

=== Wrappers genericos (System.Text.Json), Models\SapResponse.cs COMPLETO:
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Text.Json;

namespace ServicioSap.Models
{
    public class SapResponse
    {
        public D d { get; set; }
    }

    public class D
    {
        public JsonElement results { get; set; }
    }
}
```
Models\SapSingleResponse.cs COMPLETO:
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Text.Json;

namespace ServicioSap.Models
{
    public class SapSingleResponse
    {
        public JsonElement d { get; set; }
    }
}
```
Uso: `var root = JsonSerializer.Deserialize<SapResponse>(responseContent); JsonElement results = root.d.results; var lista = JsonSerializer.Deserialize<List<T>>(results.GetRawText());` (coleccion) y `var root = JsonSerializer.Deserialize<SapSingleResponse>(responseContent); JsonElement results = root.d; var obj = JsonSerializer.Deserialize<T>(results.GetRawText());` (entidad unica, BusinessPartnerMethods.cs:112-114).

=== Conexion.Data.obtenerUrl / Nodos (reflexion sobre Helpers\ConexionSAP\Conexion.dll): `public static string Conexion.Data.obtenerUrl(Nodos enviroment, Nodos nodo)`; `Conexion.Data.getconexion(...)` (overload con strings usada en ConexionSQL.cs:19). Enum `Conexion.Nodos`: ENVIROMENT_DEV=0, ENVIROMENT=1, SERVICE_URL=2, usuarioServicio=3, contrasenaServicio=4, usuarioSuccess=5, contrasenaSuccess=6, urlSuccess=7. NO hay fuente .cs de la DLL en el proyecto (NO EXISTE conf.ini ni Web.local.config en disco). Segun SKILL.md:87 y :99-100 devuelve `https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap` SIN barra final; la barra la pone el path del servicio.

## odata_escritura_patron

=== POST con CSRF: Methods\BusinessPartner\BusinessPartnerMethods.cs:71-156 `SubmitClientInfoAsync` VERBATIM:
```csharp
        /// <summary>
        /// Submit information to "BP01-BP02 Creacion y actualizacion", if partner is empty, it will create a new record, if not, it will update an existing one if exists
        /// </summary>
        public async Task<Client> SubmitClientInfoAsync(Client newClient)
        {
            var url = Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL) + "/ZAPI_BP01_PARTNER_SRV/BPartnerSet?sap-client=110";
            var serviceUrl = Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL) + "/ZAPI_BP01_PARTNER_SRV/?sap-client=110&sap-language=ES";
            try
            {
                var apiService = TokenGenerator.CreateClientS4();
                var csrfToken = await TokenGenerator.GetTokenSapAsync(apiService, serviceUrl).ConfigureAwait(false);

                var options = new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                };
                var jsonBody = JsonSerializer.Serialize(newClient, options);
                ServicioSap.Helpers.Logger.SAP("[SAP BP REQUEST] ", jsonBody);

                using (var request = new HttpRequestMessage(HttpMethod.Post, url))
                {
                    request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                    request.Headers.Add("Accept", "application/json");
                    request.Headers.Add("X-CSRF-Token", csrfToken);

                    using (var response = await apiService.SendAsync(request).ConfigureAwait(false))
                    {
                        string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        ServicioSap.Helpers.Logger.SAP("[SAP BP RESPONSE] ", responseContent);

                        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent))
                        {
                            ServicioSap.Helpers.Logger.SAP("[SAP BP ERROR] ", $"StatusCode: {response.StatusCode}. Content: {responseContent}");
                            throw new Exception("Error SAP. StatusCode: " + response.StatusCode + " Content: " + responseContent);
                        }

                        if (responseContent.TrimStart().StartsWith("<html", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new Exception("SAP devolvio HTML en lugar de JSON. Content: " + responseContent);
                        }

                        var root = JsonSerializer.Deserialize<SapSingleResponse>(responseContent);
                        JsonElement results = root.d;
                        var partner = JsonSerializer.Deserialize<Client>(results.GetRawText());

                        // (bloque :116-146 comentado: habilitacion de combinacion BP, se omite)

                        return partner;
                    }
                }
            }
            catch (Exception e)
            {
                throw new Exception($"Ocurrio un error al intentar enviar la informacion del cliente: {e.Message}");
            }
        }
```

=== PATCH por clave de negocio: BusinessPartnerMethods.cs:829-873 `LinkMagentoAccountAsync` VERBATIM:
```csharp
        /// <summary>
        /// Vincula la cuenta de un cliente externo (ej. Magento) al Business Partner existente enviando el ID a SAP.
        /// Utiliza la API ZSDT_CTE_ODATA_SRV con método PATCH para actualizar atómicamente el ZidMagento.
        /// </summary>
        public async Task<string> LinkMagentoAccountAsync(UnirCuentaRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.partner_id) || request.id_magento <= 0)
            {
                throw new ArgumentException("El partner_id y el id_magento son obligatorios.");
            }

            var serviceUrl = Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL) + "/ZSDT_CTE_ODATA_SRV/";
            var patchUrl = serviceUrl + $"ZSDT_CTE_ENTITYSet(ZclienteBp='{request.partner_id}')";

            var apiService = TokenGenerator.CreateClientS4();
            var csrfToken = await TokenGenerator.GetTokenSapAsync(apiService, serviceUrl).ConfigureAwait(false);

            var payload = new
            {
                ZidMagento = request.id_magento
            };
            
            var jsonBody = JsonSerializer.Serialize(payload);
            ServicioSap.Helpers.Logger.SAP("[SAP ZidMagento PATCH REQUEST] ", jsonBody);

            using (var requestMsg = new HttpRequestMessage(new HttpMethod("PATCH"), patchUrl))
            {
                requestMsg.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                requestMsg.Headers.Add("Accept", "application/json");
                requestMsg.Headers.Add("X-CSRF-Token", csrfToken);

                using (var response = await apiService.SendAsync(requestMsg).ConfigureAwait(false))
                {
                    string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                    ServicioSap.Helpers.Logger.SAP("[SAP ZidMagento PATCH RESPONSE] ", responseContent);

                    if (!response.IsSuccessStatusCode)
                    {
                        throw new Exception($"Error SAP al unir cuenta (PATCH). StatusCode: {response.StatusCode} Content: {responseContent}");
                    }
                    
                    return "Cuenta vinculada exitosamente en SAP";
                }
            }
        }
```

=== Helpers\TokenGenerator.cs — `CreateClientS4` (:113-133) y `GetTokenSapAsync` (:135-171) VERBATIM (namespace ServicioSap.Helpers, clase `public class TokenGenerator`, usings :1-18: Conexion, Microsoft.IdentityModel.Tokens, Newtonsoft.Json, RestSharp, ServicioSap.Helper, ServicioSap.Methods.Utils, ServicioSap.Models.SAP.Order, System, System.Collections.Generic, System.Configuration, System.IdentityModel.Tokens.Jwt, System.Linq, System.Net, System.Net.Http, System.Net.Http.Headers, System.Reflection, System.Security.Claims, System.Threading.Tasks):
```csharp
        public static HttpClient CreateClientS4()
        {
            RequestMethods.EnableTrustedHosts();

            var handler = new HttpClientHandler
            {
                UseCookies = true,
                CookieContainer = new CookieContainer(),
                ServerCertificateCustomValidationCallback = (message, cert, chain, errors) => true
            };

            string s4Token = GetAuthS4();

            var apiService = new HttpClient(handler);
            apiService.Timeout = TimeSpan.FromSeconds(60);
            apiService.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", s4Token);
            apiService.DefaultRequestHeaders.Accept.Clear();
            apiService.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            return apiService;
        }

        public static async Task<string> GetTokenSapAsync(HttpClient apiService, string serviceUrl)
        {
            try
            {
                using (var fetchRequest = new HttpRequestMessage(HttpMethod.Get, serviceUrl))
                {
                    fetchRequest.Headers.Add("X-CSRF-Token", "fetch");

                    using (var response = await apiService.SendAsync(fetchRequest).ConfigureAwait(false))
                    {
                        if (!response.IsSuccessStatusCode)
                        {
                            string body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                            throw new Exception($"Fetch CSRF falló. Status: {response.StatusCode} Body: {body}");
                        }

                        IEnumerable<string> tokenValues;
                        if (!response.Headers.TryGetValues("X-CSRF-Token", out tokenValues))
                            response.Headers.TryGetValues("x-csrf-token", out tokenValues);

                        string csrfToken = tokenValues?.FirstOrDefault();

                        if (string.IsNullOrWhiteSpace(csrfToken) ||
                            csrfToken.Equals("Required", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new Exception($"Token CSRF recibido es inválido: '{csrfToken}'");
                        }

                        return csrfToken;
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception("Error obteniendo CSRF Token SAP (Async): " + ex.Message + " InnerException: " + ex.InnerException?.Message + " InnerInner: " + ex.InnerException?.InnerException?.Message, ex);
            }
        }
```
Complementos de TokenGenerator: `GetAuthS4()` (:60-82) arma Basic con `Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.usuarioServicio)` y `Nodos.contrasenaServicio`, cacheado en `_s4AuthToken` con lock; `CreateClientExternal()` (:108-111) devuelve un HttpClient ESTATICO sin Authorization (:98-106, Timeout 60s, Accept application/json) para AWS / *.mavi.fun; `ClearAuthS4()` (:84-90). `RequestMethods.EnableTrustedHosts()` (Methods\Utils\RequestMethods.cs:18-38) fija Tls12 y acepta el host de AppSettings["DOMINIO_SAP"].

Formato de fecha V2 en escrituras: `FormatDateSapOData` es `private static` en BusinessPartnerMethods.cs:813-827 (`/Date({epochMs})/` con `new DateTimeOffset(DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc)).ToUnixTimeMilliseconds()`), y esta reimplementado inline en OrderMethods.cs:1545-1547 (`long millis = new DateTimeOffset(DateTime.UtcNow.Date).ToUnixTimeMilliseconds(); string sapDate = $"/Date({millis})/";`). Modelo toCteTel que se manda en el POST BP01 (OrderMethods.cs:2927-2942): `new CteTel { Partner = "", ZidcteTel = "", ZtipoCte = "MOVIL", ZtelCte = phone, Zfecha = null, ZenvioNip = false, ZvalTel = false, ZappOrig = "", ZfechaCap = "", ZtelExist = false, ZtraeTel = false, Zintentos = "", ZtipoValid = "" }` (Models\SAP\BusinessPartner\CteTel.cs:8-23: bools NO anulables).

## canal_aws_patron

=== Methods\Wallet\WalletMethods.cs:1-61 VERBATIM (el helper es **private** de instancia; la clase es publica con constructor que lee AwsBaseUrl con fallback hardcodeado):
```csharp
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using ServicioSap.Methods.MaterialManagement;
using ServicioSap.Models.SAP;

namespace ServicioSap.Methods.Wallet
{
    public class WalletMethods
    {
        private readonly string awsBaseUrl;

        public WalletMethods()
        {
            awsBaseUrl = ConfigurationManager.AppSettings["AwsBaseUrl"] ?? "https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/";
        }

        /// <summary>
        /// Obtiene un catálogo de configuración desde AWS API Gateway (FastAPI).
        /// Resuelve el endpoint dinámicamente y parsea arreglos directos de JSON devueltos por el API.
        /// </summary>
        /// <param name="nombreCatalogo">Nombre del catálogo (ej. "MINIMO PARA REDIMIR MONEDERO")</param>
        /// <returns>Lista de configuraciones deserializadas en CatalogoConfiguracion</returns>
        private async Task<List<CatalogoConfiguracion>> GetCatalogoConfiguracionAsync(string nombreCatalogo)
        {
            try
            {
                using (var client = new HttpClient())
                {
                    // URL endpoint using API Gateway format
                    var url = $"{awsBaseUrl.TrimEnd('/')}/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO={Uri.EscapeDataString(nombreCatalogo)}";
                    var response = await client.GetAsync(url).ConfigureAwait(false);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        using (var doc = JsonDocument.Parse(content))
                        {
                            if (doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("value", out JsonElement valueElement))
                            {
                                return JsonSerializer.Deserialize<List<CatalogoConfiguracion>>(valueElement.GetRawText()) ?? new List<CatalogoConfiguracion>();
                            }
                            else if (doc.RootElement.ValueKind == JsonValueKind.Array)
                            {
                                return JsonSerializer.Deserialize<List<CatalogoConfiguracion>>(doc.RootElement.GetRawText()) ?? new List<CatalogoConfiguracion>();
                            }
                            
                            return new List<CatalogoConfiguracion>();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching {nombreCatalogo}: {ex.Message}");
            }
            return new List<CatalogoConfiguracion>();
        }
```
Visibilidad: `private async Task<List<CatalogoConfiguracion>>` (instancia, NO static, NO public). Desde una clase nueva en Methods\Credit NO es invocable: hay que (a) hacerlo public, o (b) usar el equivalente PUBLICO de ProductMethods (abajo). Uso interno: `await GetCatalogoConfiguracionAsync("MINIMO PARA REDIMIR MONEDERO").ConfigureAwait(false)` (:77), filtrando luego con LINQ sobre `Valor1..Valor4` e `IdConfiguracionCatalogos` (:83-95).

=== Models\SAP\WalletCustomer\CatalogoConfiguracion.cs COMPLETO (namespace `ServicioSap.Models.SAP`, System.Text.Json):
```csharp
using System.Text.Json.Serialization;

namespace ServicioSap.Models.SAP
{
    public class CatalogoConfiguracion
    {
        [JsonPropertyName("IDCONFIGURACIONCATALOGOS")]
        public int IdConfiguracionCatalogos { get; set; }

        [JsonPropertyName("NOMBRECATALOGO")]
        public string NombreCatalogo { get; set; }

        [JsonPropertyName("USO")]
        public string Uso { get; set; }

        [JsonPropertyName("VALOR1")]
        public string Valor1 { get; set; }

        [JsonPropertyName("VALOR2")]
        public string Valor2 { get; set; }

        [JsonPropertyName("VALOR3")]
        public string Valor3 { get; set; }

        [JsonPropertyName("VALOR4")]
        public string Valor4 { get; set; }
    }
}
```

=== Otro uso (PUBLICO, de instancia): Methods\MaterialManagement\ProductMethods.cs:705-734 VERBATIM (con la indentacion irregular original):
```csharp
        /// <summary>
        /// Obtiene configuración de catálogo desde API AWS
        /// </summary>
   public async Task<List<ConfiguracionCatalogo>> GetConfiguracionCatalogoAsync(string nombreCatalogo)
{
    var resultado = new List<ConfiguracionCatalogo>();
    var url = AWS_BASE_URL + $"AI_GET_CatalogoConfiguracion?NOMBRECATALOGO={nombreCatalogo}";

    try
    {
        // AWS API Gateway: cliente SIN credenciales de S4 (Regla 29, auth por destino).
        var apiService = TokenGenerator.CreateClientExternal();

        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Accept", "application/json");

        var response = await apiService.SendAsync(request).ConfigureAwait(false);
        string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent))
            throw new Exception($"Status: {response.StatusCode}, Content: {responseContent}");

        resultado = JsonSerializer.Deserialize<List<ConfiguracionCatalogo>>(responseContent);

        return resultado ?? new List<ConfiguracionCatalogo>();
    }
    catch (Exception e)
    {
        throw new Exception($"Error catálogo {nombreCatalogo}. URL: {url}. Detalle: {e.Message}");
    }
```
Donde `private static readonly string AWS_BASE_URL = ConfigurationManager.AppSettings["AwsBaseUrl"];` (ProductMethods.cs:28) y el modelo `ConfiguracionCatalogo` (duplicado byte a byte de CatalogoConfiguracion pero con OTRO nombre y OTRO namespace) esta en Models\Ecommerce\AlmacenesConfig.cs:65-87, namespace `ServicioSap.Models.Ecommerce`, mismos 7 `[JsonPropertyName]`. Consumo real desde OrderMethods.cs:1150: `var catalogos = await _productMethods.GetConfiguracionCatalogoAsync("Código de promotor").ConfigureAwait(false);` y filtro `catalogos?.Any(c => string.Equals(c.Valor1, depto, StringComparison.OrdinalIgnoreCase) && string.Equals(c.Valor2, puesto, StringComparison.OrdinalIgnoreCase)) ?? false`. Existen DOS modelos y DOS helpers para el mismo endpoint AWS; el publico reutilizable hoy es `ProductMethods.GetConfiguracionCatalogoAsync` (devuelve `List<ServicioSap.Models.Ecommerce.ConfiguracionCatalogo>`).

## controller_patron

Controllers\CreditController.cs COMPLETO (149 lineas) VERBATIM:
```csharp
using ServicioSap.Methods.Credit;
using ServicioSap.Models.SAP.Credit;
using System;
using System.Threading.Tasks;
using System.Web.Http;

namespace ServicioSap.Controllers
{
    [Authorize]
    [RoutePrefix("credit")]
    public class CreditController : ApiController
    {
        /// Contrato portado de APIMagento: Controllers\CreditController.cs
        /// (ruta credit/SendSmsNewNumber, mismo verbo y mismo modelo de request).
        /// (APIMagentoDMZ: Controllers\CreditController.cs) antes de reenviar a la LAN
        [HttpPost]
        [Route("SendSmsNewNumber")]
        public async Task<IHttpActionResult> SendSmsNewNumber(SendSmsNewNumberRequest request)
        {
            if (request == null)
                return BadRequest("Datos incompletos.");

            return Ok(await CreditMethods.SendSmsNewNumberAsync(request));
        }

        [HttpGet]
        [Route("getPlazos")]
        public async Task<IHttpActionResult> GetPlazos()
        {
            try
            {
                var response = await CreditMethods.GetPlazosAsync();
                return Ok(response);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// E-06. Devuelve los montos de crédito cacheados para un artículo y una UEN.
        /// Contrato portado de APIMagento: Controllers\CreditController.cs::GetCreditAmounts (línea 314).
        ///
        /// El campo que se consulta depende de la combinación articulo + tipo:
        ///   "nuevo" + "CREDITO"        -> montos_cte_nuevo
        ///   "nuevo" + cualquier otro   -> montos_cte_nuevo_apertura
        ///   "casa"                     -> montos_cte_casa
        ///   cualquier otro articulo    -> 400
        

        [HttpPost]
        [Route("GetCreditAmounts")]
        public async Task<IHttpActionResult> GetCreditAmounts(ArticuloUenRequest req)
        {
            if (req == null)
                return BadRequest("Datos incompletos.");

            var credilana = new CredilanaMethods();
            try
            {
                if (req.articulo.Equals("nuevo"))
                {
                    if (req.tipo == "CREDITO")
                        return Ok(await credilana.GetCredilanaInfoAsync<CteNuevoResponseModel>("montos_cte_nuevo", req.uen));

                    // Apertura
                    return Ok(await credilana.GetCredilanaInfoAsync<CteNuevoResponseModel>("montos_cte_nuevo_apertura", req.uen));
                }

                if (req.articulo.Equals("casa"))
                {
                    return Ok(await credilana.GetCredilanaInfoAsync<CteNuevoResponseModel>("montos_cte_casa", req.uen));
                }
            }
            catch (System.Exception e)
            {
                ServicioSap.Helpers.Logger.SAP("[CREDIT GetCreditAmounts ERROR] ",
                    $"articulo={req.articulo} tipo={req.tipo} uen={req.uen} => {e.Message}");
                throw new HttpResponseException(System.Net.HttpStatusCode.InternalServerError);
            }

            return BadRequest();
        }

        /// E-07. Guarda un documento del expediente del cliente en MAVI_DOC_CTE.
        /// Contrato portado de APIMagento: Controllers\CreditController.cs::GuardarDocumento (línea 591).
        ///
        /// La DMZ recibe multipart/form-data y lo traduce a este JSON antes de reenviar
        /// (APIMagentoDMZ: CreditController.cs:443), así que aquí llega ya como BodyImagenBase64.
        /// Ojo: esa ruta de la DMZ está marcada [AllowAnonymous]; la de ServicioSAP no, porque
        /// el [Authorize] del controller aplica a todo y la DMZ sí se autentica contra nosotros.
        [HttpPost]
        [Route("guardardocumento")]
        public async Task<IHttpActionResult> GuardarDocumento([FromBody] BodyImagenBase64 request)
        {
            if (request == null)
                return BadRequest("Invalid JSON payload");

            try
            {
                var documentMethods = new DocumentMethods();
                var result = await documentMethods.GuardarDocumentoAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// E-08. Guarda las imágenes del expediente de crédito.
        /// Contrato portado de APIMagento: Controllers\CreditController.cs::SaveImagesProductosMx (línea 271).
        ///
        /// ⚠️ Responde antes de hacer el trabajo: el método lanza un Task con 10 segundos de
        /// espera y devuelve true de inmediato. Un 200 con `true` **no** significa que las
        /// imágenes se guardaran. Es el comportamiento del legado y se conserva.
        [HttpPost]
        [Route("SaveImagesProductosMx")]
        public async Task<IHttpActionResult> SaveImagesProductosMx(SaveImagesRequest request)
        {
            try
            {
                var documentMethods = new DocumentMethods();
                return Ok(await documentMethods.SaveImagesProductosMxAsync(request));
            }
            catch (Exception e)
            {
                ServicioSap.Helpers.Logger.SAP("[CREDIT SaveImagesProductosMx ERROR] ", e.Message);
                return Ok(Newtonsoft.Json.JsonConvert.SerializeObject(false));
            }
        }
        [HttpGet]
        [Route("condicionespago")]
        public async Task<IHttpActionResult> GetCondicionesPago()
        {
            try
            {
                var result = await CreditMethods.GetCondicionesPagoAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                ServicioSap.Helpers.Logger.SAP("[CREDIT GetCondicionesPago ERROR] ", ex.Message);
                return InternalServerError(ex);
            }
        }
    }
}
```
Resumen del patron: `[Authorize]` + `[RoutePrefix("credit")]` a nivel clase, hereda `ApiController`; cada accion `[HttpPost]/[HttpGet]` + `[Route("...")]`, firma `public async Task<IHttpActionResult> X(ModelRequest request)`; guard `if (request == null) return BadRequest("...")`; los Methods estaticos se llaman `CreditMethods.XAsync(...)` y los de instancia con `var x = new DocumentMethods();` dentro de la accion (no hay DI); respuestas `Ok(obj)`, `BadRequest(string)`, `InternalServerError(ex)`, `throw new HttpResponseException(HttpStatusCode...)`. NO se usa `Content(...)` en este controller (NO EXISTE en Controllers\). En el controller NO se usa ConfigureAwait(false) (los await son sin ConfigureAwait). `[HttpPatch]` existe en BusinessPartnerController.cs:56,77, PartnerAddressController.cs:60,80, ProductController.cs:434. `[FromBody]` se usa mixto (CreditController.cs:94, WalletCustomerController.cs:59). `[AllowAnonymous]` solo en LoginController.cs:14. Ruteo: `config.MapHttpAttributeRoutes()` + handler JWT `TokenValidationHandler` (App_Start\WebApiConfig.cs:16-17). Variante OrderController (Controllers\OrderController.cs:16-48): valida con `throw new HttpResponseException(HttpStatusCode.BadRequest)`, y en catch loguea `ServicioSap.Helpers.Logger.SAP("[ORDER NEW ERROR] ", $"incrementId={order?.incrementId} :: {e}"); return Ok("Error, " + e.Message);` (HTTP 200 por paridad con LAN).

## modelos_patron

=== Models\SAP\Credit\SendSmsNewNumberRequest.cs COMPLETO (POCO sin atributos JSON; los nombres van en PascalCase y coinciden con el JSON del cliente):
```csharp
using System;

namespace ServicioSap.Models.SAP.Credit
{
    public class SendSmsNewNumberRequest
    {
        public string Cliente { get; set; }
        public string NumeroTelefono { get; set; }
        public string IdCarrito { get; set; }
        public bool EsCredito { get; set; }
    }
}
```

=== Models\SAP\Credit\CreditAmountModels.cs COMPLETO (varias clases por archivo, nombres en snake_case cuando viajan asi en el JSON, comentarios `///` sin <summary>):
```csharp
using System.Collections.Generic;

namespace ServicioSap.Models.SAP.Credit
{
    /// E-06 — modelos de credit/GetCreditAmounts.
    /// Portados de APIMagento: Metodos\Credit\CredYPrestamo\ModelRequest.cs y
    /// CredYprestamoModels.cs. Se conservan los nombres en minúscula con guion bajo
    /// porque son los que viajan en el JSON hacia el cliente; renombrarlos rompería
    /// el contrato aunque en C# no sea la convención habitual.
    public class ArticuloUenRequest
    {
        public string articulo { get; set; }
        public int uen { get; set; }
        public string tipo { get; set; }
    }

    public class InfoPagoPuntualModel
    {
        public string articulo { get; set; }
        public decimal monto { get; set; }
        public decimal total_sin_bonificacion { get; set; }
        public decimal total_con_bonificacion { get; set; }
        public int meses { get; set; }
        public int semanas { get; set; }
        public string condicion { get; set; }
        public int bonificacion { get; set; }
        public decimal abono_sin_bonificacion { get; set; }
        public string tipo_de_abono { get; set; }
        public decimal abono_con_bonificacion { get; set; }
        public decimal tasa_con_bonificacion { get; set; }
        public decimal cat_con_bonificacion { get; set; }
        public decimal interes_con_bonificacion { get; set; }
        public decimal tasa_sin_bonificacion { get; set; }
        public decimal cat_sin_bonificacion { get; set; }
        public decimal interes_sin_bonificacion { get; set; }
    }

    /// Las tres ramas de GetCreditAmounts deserializan a este tipo, incluida la de "casa".
    /// En el legado existe ademas un CteCasaResponseModel que nadie usa desde este endpoint;
    /// se replica el comportamiento real, no el que sugieren los nombres.
    public class CteNuevoResponseModel
    {
        public decimal hasta_un_maximo_de_prestamo { get; set; }
        public int hasta_una_bonificacion_de { get; set; }
        public IEnumerable<InfoPagoPuntualModel> articulos { get; set; }
    }

    // Modelos para S2-04 getPlazos
    public class PlazosResponse
    {
        public List<PlazoDetail> Diferidos { get; set; }
        public List<PlazoDetail> Inmediatos { get; set; }

        public PlazosResponse()
        {
            Diferidos = new List<PlazoDetail>();
            Inmediatos = new List<PlazoDetail>();
        }
    }

    public class PlazoDetail
    {
        public int Days { get; set; }
        public string StoreCode { get; set; }
    }
}
```

=== Models\SAP\Credit\CondicionPagoResponse.cs (DTO OData V4 con Newtonsoft `[JsonProperty]`), :1-20 y :62-65:
```csharp
using Newtonsoft.Json;
using System.Collections.Generic;

namespace ServicioSap.Models.SAP.Credit
{
    public class CondicionPagoResponse
    {
        [JsonProperty("value")]
        public List<CondicionPagoResult> Value { get; set; }
    }

    public class CondicionPagoResult
    {
        [JsonProperty("Bukrs")]
        public string Bukrs { get; set; }

        [JsonProperty("Zterm")]
        public string Zterm { get; set; }
        ... (Zgrupogral, Zgrupopropre, Ztipoventa, Ztipocondicion, Zproductounico bool?, Zdima bool?, Zplazoeje bool?, Zplazo, Zdiasgracia, Zperiodicidad, Zestatus, Zdiferido bool?, Vkorg, Vtweg)
        [JsonProperty("Zfechadif")]
        public string Zfechadif { get; set; }
    }
}
```

=== Models\Database\TempItemList.cs COMPLETO (POCO, usings de plantilla VS aunque no se usen):
```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ServicioSap.Models.Database
{
    public class TempItemList
    {
        public string Item { get; set; }
        public string ShortName { get; set; }
        public string ELongName { get; set; }
        public string Family { get; set; }
        public string Line { get; set; }
        public string EBrand { get; set; }
        public string Status { get; set; }
        public string Stock { get; set; }
        public float Price { get; set; }
        public float CreditPrice { get; set; }
        public string Descripcion1 { get; set; }
        public string Volumetric { get; set; }
        public string Type { get; set; }
        public string MetaKeywords1 { get; set; }
        public string MetaDescription1 { get; set; }
        public int List3 { get; set; }
    }
}
```
Otro Models\Database mas escueto, ExistenciaAlmacen.cs COMPLETO: `namespace ServicioSap.Models.Database { public class ExistenciaAlmacen { public string Item { get; set; } public string Almacen { get; set; } public int Disponible { get; set; } public string TipoAlmacen { get; set; } } }` (sin usings).

=== Que atributo JSON usan (conteo real en Models\): `[JsonPropertyName]` (System.Text.Json) en 25 archivos (p.ej. CatalogoConfiguracion.cs, Client.cs, BusinessPartnerMa.cs, Product.cs, AlmacenesConfig.cs); `[JsonProperty]` (Newtonsoft) en 8 archivos (CondicionPagoResponse.cs, SucursalResponse.cs, AnexosResponse.cs, MovBitaResponse.cs, DocNoCompResponse.cs, ZSplitDto.cs, Product.cs, Etiquetas.cs). Los DTOs de BP (Partner.cs, Cte.cs, CteTel.cs) NO llevan atributo: el nombre de la propiedad C# ES el nombre SAP (PascalCase Z...). La regla 18 del SKILL pide `[JsonProperty]` Newtonsoft, pero la mayoria del codigo real usa System.Text.Json.

=== Que serializador usa cada Methods: CreditMethods.cs -> Newtonsoft `Newtonsoft.Json.JsonConvert.DeserializeObject<CondicionPagoResponse>` (:340) (1 uso, sin `using Newtonsoft.Json`, nombre calificado). CredilanaMethods.cs -> Newtonsoft `JsonConvert.DeserializeObject<T>` (:35). OrderMethods.cs -> MIXTO: `using System.Text.Json` (:24) con `JsonSerializer.` x16 usos, y Newtonsoft calificado `Newtonsoft.Json.JsonConvert...`/`Newtonsoft.Json.Linq.JObject` x3 usos (:1199-1200). BusinessPartnerMethods.cs -> System.Text.Json (`JsonSerializer.Serialize/Deserialize`, `JsonSerializerOptions{DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull}` :83-87) y Newtonsoft solo en GetConsultaAnexosAsync (:897). WalletMethods.cs / ProductMethods.cs -> System.Text.Json. REGLA PRACTICA: si el DTO lleva `[JsonPropertyName]` deserializa con `System.Text.Json.JsonSerializer`; si lleva `[JsonProperty]` usa `Newtonsoft.Json.JsonConvert`. Mezclarlos ignora los atributos silenciosamente.

=== DTOs de entrada del flujo de credito que ya existen (para no inventar propiedades): Models\SAP\Order\InfoClienteRequest.cs:3-80 (`nombre, cliente, cuenta, telefono, direccion, numExt, numInt, codigoPostal, municipio, colonia, estado, referencia, entreCalles, pais, razonSocial, correo, nombreClienteMavi, apellidoPaternoClienteMavi, apellidoMaternoClienteMavi, telefonoClienteMavi, int idMagento, idCarrito, codigo_promotor, OrigenIdMagento, int uen, rfc, sexo, bpGroup, fiscalRegimen, usoCfdi`, todo string salvo lo marcado) y Models\SAP\Order\OrderRequest.cs:5-54 (`entityId, incrementId, storeId, status, decimal subTotal, decimal total, cuotas, decimal impuesto, metodoPago, decimal costoEnvio, metodoEnvio, docType, salesOrg, distrChan, division, salesOff, pmnttrms, usuarioPos, refDoc, refDocCat, List<ArticuloRequest> articulos, InfoClienteRequest infoCliente, codigoRecogerSucursal, int sucursalDestino, forzarOrder, state, float RedimirMonedero, Agente, utmSource`).

## csproj

Formato exacto: `    <Compile Include="Carpeta\Sub\Archivo.cs" />` (4 espacios de sangria, backslash Windows, self-closing, ServicioSap.csproj:213-441). TODOS los .cs viven en UN SOLO `<ItemGroup>` que abre en la linea 212 y cierra en la 442 (el orden interno NO es alfabetico estricto; se agregan donde caiga). Formato antiguo del proyecto: `<Project ToolsVersion="15.0" DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">` (:2), sin globbing: **cualquier .cs nuevo que no se registre con `<Compile Include=.../>` NO se compila** (confirmado: no hay `<Compile Include="**\*.cs">` ni SDK-style; SKILL.md regla 19).

Entradas actuales de Methods\Credit (:255-258, consecutivas dentro del bloque de Methods):
```xml
    <Compile Include="Methods\Credit\CredilanaMethods.cs" />
    <Compile Include="Methods\Credit\CreditMethods.cs" />
    <Compile Include="Methods\Credit\DocumentMethods.cs" />
    <Compile Include="Methods\Credit\LiberadorCreditoMethods.cs" />
```
Entradas actuales de Models\SAP\Credit (dispersas): `<Compile Include="Models\SAP\Credit\CondicionPagoResponse.cs" />` (:342), `<Compile Include="Models\SAP\Credit\CreditAmountModels.cs" />` (:364), `<Compile Include="Models\SAP\Credit\DocumentModels.cs" />` (:365), `<Compile Include="Models\SAP\Credit\SendSmsNewNumberRequest.cs" />` (:372).
Entradas de Models\Database (:280-282 y :285-288): ArticuloIEMay.cs, ArticuloPropiedad.cs, ExistenciaAlmacen.cs, PrecioArticulo.cs, ProductoExport.cs, TempEcommerceItemExport.cs, TempItemList.cs.
Entradas vecinas utiles: Controllers\CreditController.cs (:221), Helpers\ConexionDB\ConexionSQL.cs (:241), Helpers\Logger.cs (:247), Helpers\TokenGenerator.cs (:250), Methods\Order\OrderMethods.cs (:271), Methods\Wallet\WalletMethods.cs (:427), Models\SAP\WalletCustomer\CatalogoConfiguracion.cs (:428), Models\SAP\Order\InfoClienteRequest.cs (:385), Models\SAP\Order\OrderRequest.cs (:390), Models\SapResponse.cs (:334), Models\SapSingleResponse.cs (:335).
Referencias relevantes ya presentes (no hay que agregar paquetes): Newtonsoft.Json 12.0.2 (:155-157), System.Text.Json 8.0.5 (:130-132), System.Data (:100), System.Configuration (:149), System.Net.Http (:158), System.Web.Http 5.2.7 (:169-171), System.Data.SQLite 1.0.113 (:101-103), Conexion.dll via HintPath Helpers\ConexionSAP\Conexion.dll (:48-51), RestSharp 106.15 (:84-86). Web.config se registra como `<Content Include="Web.config" />` (:447). TargetFrameworkVersion v4.7.2 (:17), RootNamespace/AssemblyName ServicioSap (:15-16).

## web_config_claves

Web.config (\\CATECINF214034\...\ServicioSap\Web.config). connectionStrings (:12-16):
- :13 `MAVICBOSANDROID` = `server=mavicbosandroid.grupomavi.com;uid= usrintranet ;password=****;database=ServicioAndroid` providerName System.Data.SqlClient (OJO: uid y password llevan espacios dentro del valor, asi esta en el archivo)
- :15 `ADMINDOC` = `server=mavicbosandroid.grupomavi.com;uid= usrintranet ;password=****;database=AdminDoc`

appSettings (:20-90), el elemento es `<appSettings file="Web.local.config">` (:20; Web.local.config NO EXISTE en disco, se ignora):
- :21 URL_SALES_DISTRIBUTION_API = https://salesanddistribution-api.mavi.fun
- :22 webpages:Version = 3.0.0.0 ; :23 webpages:Enabled = false ; :24 ClientValidationEnabled = true ; :25 UnobtrusiveJavaScriptEnabled = true
- :26 SAP_BASE_URL = https://10.30.2.135:44300/sap/opu/odata/sap/  (NO se lee desde ningun .cs: 0 usos; la base S4 real sale de Conexion.dll)
- :27 DOMINIO_SAP = https://kdll3fhcyo-lan.grupomavi.com/SAP/  (leido en Methods\Utils\RequestMethods.cs:15 para TrustedHosts)
- :28 AwsBaseUrl = https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/
- :29 URL_ANDROID_API = https://android-api.mavi.fun
- :30 URL_BP_API = https://businesspartner-api.mavi.fun
- :31 URL_CONFIGURACIONES_API = https://configuraciones-api.mavi.fun
- :32 JWT_SECRET_KEY = **** ; :33 JWT_AUDIENCE_TOKEN = https://kdll3fhcyo-lan.grupomavi.com/ ; :34 JWT_ISSUER_TOKEN = https://kdll3fhcyo-lan.grupomavi.com/ ; :35 SAP_STAGE = https://kdll3fhcyo-lan.grupomavi.com/SAP/ ; :36 JWT_EXPIRE_MINUTES = 180
- :37 USER_HASH = **** ; :38 USER_SALT = **** ; :39 PASS_HASH = **** ; :40 PASS_SALT = ****
- :41 AUTENTICACION_URL_LIBERADOR = http://172.16.215.51:3026/api/login/authenticate ; :42 PASSWORD_AUTENTICACION_LIBERADOR = **** ; :43 VETA_URL_LIBERADOR = http://172.16.215.51:3026/api/venta
- :46 ZAPI_SALESORDER_SRV = /ZAPI_SALESORDER_SRV/A_SALES_ORDERSet
- :49 ZAPI_CAMPANA_BONIFICACION_SRV = ZAPI_CAMPANA_BONIFICACION_SRV/REQUESTSet
- :52 ZAPI_EX01_NOCOMP_SRV = ZAPI_EX01_NOCOMP_SRV ; :53 ZAPI_TZ01_ZSPLIT_MERC = zsb_ntz01_zsplit_merc/srvd_a2x/sap/zsd_ntz01_zsplit_merc/0001
- :56 USER_DMZ = {"Username": "User-ILXTAL","Password": "****"} ; :57 URL_DMZ = https://localhost:44302/
- :60 SQLITE_DB_PATH = C:\inetpub\wwwroot\sap\
- :63 IMAGES_CREDIT_PATH = C:\inetpub\wwwroot\sap\images\credit
- :67 IGNORE_ATTRIBUTES_PATH = C:\inetpub\wwwroot\sap\ignoreAttributes.txt
- :70 CASH_REPORT_LOCAL_PATH = C:\inetpub\wwwroot\sap\files\ ; :71 CASH_REPORT_SHARE_PATH = \\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\
- :75 IMAGES_PRODUCT_SHARE_PATH = \\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\ ; :76 IMAGES_PRODUCT_PATH = C:\inetpub\wwwroot\sap\images\
- :80 MULTIPAGOS_APIKEY_URL = http://172.16.215.51:3024/WSeCommerceMX.asmx?wsdl ; :81 CODIGO_ENT = ****
- :84 SMB_IMPERSONATION_DOMAIN = GRUPOMAVI ; :85 SMB_IMPERSONATION_USER = auxsvrwea05qai ; :86 SMB_IMPERSONATION_PASSWORD = ****
- :89 ZAPI_CONDPAGO = /zsb_sd40_condpago/srvd_a2x/sap/zsd_sd40_condpago/0001/zapi_condpago
applicationSettings (:158-164): `ServicioSap.Properties.Settings` -> `Server` = DEVMAVI (usado por conexionSQL.obtenerConexionSigMavi via `Properties.Settings`).
system.web (:92-95): compilation debug=true targetFramework 4.7.2; httpRuntime maxRequestLength=51200; customErrors Off. requestLimits maxAllowedContentLength=52428800 (:102).

COMO SE LEEN DESDE CODIGO (dos mecanismos distintos, no intercambiables):
1) Todo lo que NO es S/4HANA -> `System.Configuration.ConfigurationManager.AppSettings["KEY"]` / `.ConnectionStrings["KEY"]?.ConnectionString`. Ejemplos verbatim: `var baseUrl = ConfigurationManager.AppSettings["URL_BP_API"]; if (string.IsNullOrWhiteSpace(baseUrl)) { throw new Exception("URL_BP_API no esta configurada en Web.config"); } var url = $"{baseUrl.TrimEnd('/')}/AC_POST_HabilitaCombinacionBP";` (BusinessPartnerMethods.cs:204-210); `string baseAndroid = System.Configuration.ConfigurationManager.AppSettings["URL_ANDROID_API"]; if (string.IsNullOrEmpty(baseAndroid)) { throw new Exception("URL_ANDROID_API no configurada en AppSettings"); } string url = $"{baseAndroid.TrimEnd('/')}/employees/get_personalById?user_id={userId}&status=0&centro=";` (:344-350); `private static readonly string AWS_BASE_URL = ConfigurationManager.AppSettings["AwsBaseUrl"]; private static readonly string CONFIGURACIONES_BASE_URL = ConfigurationManager.AppSettings["URL_CONFIGURACIONES_API"];` (ProductMethods.cs:28-29); `var baseUrl = ConfigurationManager.AppSettings["URL_SALES_DISTRIBUTION_API"]; if (string.IsNullOrWhiteSpace(baseUrl)) { throw new Exception("La configuración 'URL_SALES_DISTRIBUTION_API' no se encuentra en el Web.config."); } var url = $"{baseUrl.TrimEnd('/')}/AI_GET_ZSDT_MOVBITA?Vbeln={vbeln}";` (MovBitaMethods.cs:17-23); path OData externalizado `System.Configuration.ConfigurationManager.AppSettings["ZAPI_CONDPAGO"]` con normalizacion de barra inicial (CreditMethods.cs:304-311).
2) S/4HANA -> `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` (requiere `using Conexion;` o calificar `Conexion.Nodos.X`). `Nodos` es un ENUM publico de la DLL externa Helpers\ConexionSAP\Conexion.dll (namespace `Conexion`), miembros: ENVIROMENT_DEV=0, ENVIROMENT=1, SERVICE_URL=2, usuarioServicio=3, contrasenaServicio=4, usuarioSuccess=5, contrasenaSuccess=6, urlSuccess=7 (obtenido por reflexion; NO hay .cs fuente en el proyecto). `obtenerUrl` firma: `public static string obtenerUrl(Nodos enviroment, Nodos nodo)`. En todo el proyecto solo se usan ENVIROMENT_DEV + SERVICE_URL (55 call sites) y ENVIROMENT_DEV + usuarioServicio/contrasenaServicio (TokenGenerator.cs:70-71). Devuelve la base sin barra final; el codigo concatena `+ "/ZAPI_..._SRV/EntitySet?...&sap-client=110&$format=json"` (V2) o hace `.Replace("/odata/sap", "/odata4/sap")` para V4 (CreditMethods.cs:302). Helpers\ConexionSAP\ConexionSapConfig.cs es una clase estatica VACIA (todo comentado, :8-21). La conexion SigMavi tambien sale de la DLL: `Conexion.Data.getconexion(settings.Server, "SIGMavi")` (ConexionSQL.cs:19,79).

## convenciones

Observadas en el codigo (archivo:linea):
- Sufijo `Async` en TODO metodo async, incluidos privados (CreditMethods.cs:158,191,262; OrderMethods.cs:579,621,862). Los mensajes de log/consola conservan el nombre SIN Async ("Error CrearSolicitudCredito: ", OrderMethods.cs:928-929; "Error ObtenerNumeroTablaSms() => ", :600).
- `ConfigureAwait(false)` en TODOS los await dentro de Methods\ (CreditMethods.cs:18,22,32,36,123,125,128,146; BusinessPartnerMethods.cs:39,41,81,96,98; OrderMethods.cs:584,594,626,867). Excepciones reales sin ConfigureAwait: DocumentMethods.cs:137,184; CredilanaMethods.cs:24; MovBitaMethods.cs:27-28; SQLiteDb.cs. En Controllers NO se usa ConfigureAwait (CreditController.cs:23,32,102).
- Prohibido `.Result`/`.Wait()` (comentario BusinessPartnerMethods.cs:175-181 "DIRECTRIZ: Todos los métodos de ServicioSAP DEBEN ser nativamente 'async Task<T>'"; CreditMethods.cs:236 "Await directo (sin sync-sobre-async)").
- Instanciacion de colaboradores: `new` directo, sin DI: `var conexionHelper = new conexionSQL();` / `var db = new conexionSQL();` (CreditMethods.cs:21,122; OrderMethods.cs:583,866); `var bpMethods = new BusinessPartnerMethods();` (OrderMethods.cs:625) o con nombre calificado `new ServicioSap.Methods.BusinessPartner.BusinessPartnerMethods()` (CreditMethods.cs:235); dependencias de larga vida como campos `private readonly` inicializados en el constructor (OrderMethods.cs:35-36,79-83).
- Clases Methods: mezcla de estaticas-por-uso (CreditMethods: todo `public static`/`private static`) e instancia (OrderMethods, BusinessPartnerMethods, DocumentMethods, CredilanaMethods, WalletMethods). Los helpers `GetCondicionAsync` (OrderMethods.cs:3423) y `GetCondicionesPagoAsync` (CreditMethods.cs:297) son `public static` para reutilizarse entre clases.
- Constantes de negocio como `private const string` en la cabecera de la clase (OrderMethods.cs:39-76). Config leida en `private static readonly string` (ProductMethods.cs:28-29) o en constructor a campo `private readonly string` (WalletMethods.cs:15-20; LiberadorCreditoMethods.cs:17-19,41-46).
- Idioma: nombres de metodos/clases en INGLES o ESPANOL mezclados (`ObtenerNumeroTablaSmsAsync`, `CrearSolicitudCreditoAsync`, `GetClientAsync`, `SubmitClientInfoAsync`); variables locales en espanol (`conexionHelper`, `telefono`, `idRef`) e ingles (`response`, `request`); propiedades de DTOs de request en camelCase espanol tal como viajan en JSON (`infoCliente.apellidoPaternoClienteMavi`); propiedades SAP en PascalCase con prefijo Z tal cual (`ZtelCte`, `ZidMagento`). SQL en mayusculas con `WITH (NOLOCK)` en SELECT (CreditMethods.cs:26,166,270; OrderMethods.cs:588-589,3431).
- Comentarios: mezcla de `/// <summary>` XML (OrderMethods.cs:575-578, BusinessPartnerMethods.cs:24-26) y `///` libre sin tags (CreditAmountModels.cs:5-9, DocumentMethods.cs:16-32, CredilanaMethods.cs:9-13). Los comentarios de migracion citan "Portado de APIMagento: ...linea N" y reglas ("Regla 5", "Regla 29", "H-01", "E-07"). Se anotan defectos del legado y decisiones fechadas ("decisión del 20-ago-2026", DocumentMethods.cs:118).
- Manejo de null/vacio: `?? ""` al pasar a SqlParameter (OrderMethods.cs:875-908), `?? (object)DBNull.Value` (DocumentMethods.cs:176-182), `?? new List<T>()` tras deserializar (BusinessPartnerMethods.cs:55,277), `result?.ToString() ?? ""` (OrderMethods.cs:595), `string.IsNullOrWhiteSpace` para validar config (BusinessPartnerMethods.cs:205; MovBitaMethods.cs:18). Guard de request nulo en controller -> `BadRequest("Datos incompletos.")` (CreditController.cs:20-21).
- Propagacion de errores (tres estilos coexistentes, elegir segun el llamador): (a) capa OData/HTTP -> `throw new Exception($"Ocurrio un error al intentar ...: {e.Message}")` envolviendo (BusinessPartnerMethods.cs:65-68,152-155; CreditMethods.cs:345-348 con `, ex` inner); (b) helpers SQL de lectura -> loguean y devuelven valor neutro: `return "";` / `return telefono;` / `return 0;` / `return false;` / `return new Dictionary<string,int>{{"result",-1}}` (CreditMethods.cs:153-154,186-187,225-226,257-258,292-293; OrderMethods.cs:598-602,926-931); (c) orquestador -> `Console.WriteLine("Error X: " + ex.Message); throw;` (OrderMethods.cs:797-801). Un fallo secundario NO debe cambiar la respuesta al cliente: se captura, se registra con `Logger.SAP` y se continua (OrderMethods.cs:721-737 "PARIDAD DE CONTRATO").
- Validacion de respuesta SAP: `if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent)) throw new Exception("Error SAP. StatusCode: " + response.StatusCode + " Content: " + responseContent);` + chequeo `responseContent.TrimStart().StartsWith("<html", StringComparison.OrdinalIgnoreCase)` (BusinessPartnerMethods.cs:43-51).
- Logging: `ServicioSap.Helpers.Logger.SAP("[TAG] ", mensaje)` calificado completo (87 usos) con tag entre corchetes + espacio final; `Console.WriteLine` como traza secundaria (108 usos en Methods, 94 en OrderMethods.cs); `System.Diagnostics.Debug.WriteLine` ocasional (CreditMethods.cs:112). `GeneradorLog.SapLog` existe pero tiene 0 llamadores.
- Timeouts SQL exagerados heredados: `sqlCommand.CommandTimeout = 9999999;` / `99999;` (CreditMethods.cs:145,171,208,277; OrderMethods.cs:591).
- SQL: se prefieren parametros tipados `cmd.Parameters.Add("@X", SqlDbType.VarChar).Value = ...` (OrderMethods.cs:592,873-910,3437-3438) o `new SqlParameter("@X", SqlDbType.Y) { Value = ... }` (DocumentMethods.cs:173-182); `AddWithValue` solo en OrderMethods.cs:1128,1182-1183 y SQLiteDb. Aun sobrevive `string.Format` con concatenacion directa en CreditMethods.cs:137-141,165-167,270-273 (legado, no imitar para valores nuevos). El id generado por SP se lee con `DataSet`+`SqlDataAdapter.Fill` y `int.TryParse(ds.Tables[0].Rows[0][0].ToString(), out int id)` (OrderMethods.cs:913-921); en lecturas escalares `ExecuteScalarAsync` (OrderMethods.cs:594,3440).
- UEN/sucursal: `int uen = order.storeId?.ToUpper().Equals("VIU") == true ? 2 : 1;` y `@sucursal = uen.Equals(2) ? 505 : 504` (OrderMethods.cs:871,897); tiendas `"MUEBLES AMERICA"`/`"VIU"` con `.Replace(' ', '_')` como StoreCode (CreditMethods.cs:38-55).
- Regiones `#region FASE N - ...` para agrupar dentro de OrderMethods (:85,573); DocumentMethods usa `#region E-07 — credit/guardardocumento` (:51).
- Ruta HTTP -> nombre de orquestador: `order/new` -> `SetOrderAsync`, `credit/SendSmsNewNumber` -> `SendSmsNewNumberAsync`, `credit/getPlazos` -> `GetPlazosAsync`, `credit/guardardocumento` -> `GuardarDocumentoAsync` (SKILL regla 28).
- Helpers de fecha SAP y de `ValidateOnlyNumbers` son PRIVADOS de sus clases (BusinessPartnerMethods.cs:813 `private static string FormatDateSapOData`; OrderMethods.cs:308 `private string ValidateOnlyNumbers`): desde Methods\Credit no son alcanzables sin promoverlos.
- `Console.WriteLine` con prefijo de metodo entre corchetes en flujos nuevos: `Console.WriteLine($"[SetOrder] ...")`, `$"[InsertCreditArticles] ..."` (OrderMethods.cs:950,972,1884).

## logging

=== Helpers\Logger.cs COMPLETO (namespace ServicioSap.Helpers; firma unica `public static void SAP(string type, string message)`):
```csharp
using System;
using System.IO;

namespace ServicioSap.Helpers
{
    public class Logger
    {
        public static void SAP(string type, string message)
        {
            // LOGS STAGE / PRODUCCION:
            string file = @"C:\inetpub\wwwroot\log\sap.log";
            try 
            {
                var dir = System.IO.Path.GetDirectoryName(file);
                if (System.IO.Directory.Exists(dir))
                {
                    using(StreamWriter sw = File.AppendText(file)) 
                    { 
                        sw.WriteLine(DateTime.Now.ToString("[yyyy-MM-dd HH:mm:ss] ") + type + message); 
                    } 
                }
            } 
            catch { } // Silencioso si no existen permisos o el dir en local

            //LOGS LOCALES PARA PRUEBAS:
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string localLogDir = Path.Combine(baseDir, "Logs");
            if (!Directory.Exists(localLogDir))
            {
                Directory.CreateDirectory(localLogDir);
            }
            string fileLocal = Path.Combine(localLogDir, "sap.log");

            try
            {
                using (StreamWriter sw = File.AppendText(fileLocal))
                {
                    sw.WriteLine(DateTime.Now.ToString("[yyyy-MM-dd HH:mm:ss] ") + type + message);
                }
            }
            catch { }


            System.Diagnostics.Debug.WriteLine(DateTime.Now.ToString("[yyyy-MM-dd HH:mm:ss] ") + " [SAP] " + type + message);
        }
    }
}
```
Escribe en C:\inetpub\wwwroot\log\sap.log (si existe el dir) y SIEMPRE en <BaseDirectory>\Logs\sap.log. No hay otros metodos (no existe Logger.SetOrder ni niveles).

=== Helpers\Logger\GeneradorLog.cs (namespace `ServicioSap.Helper` SINGULAR; firma `public static void SapLog(string type, string message)`; solo escribe en C:\inetpub\wwwroot\log\sap.log con try/catch vacio, :8-19; bloque local comentado :21-38). Tiene 0 llamadores en el proyecto (grep `GeneradorLog.SapLog` -> No matches). Usar `Logger.SAP`, no este.

=== 3 ejemplos de uso VERBATIM:
1) CreditMethods.cs:151-155 (error en helper SQL, devuelve valor neutro):
```csharp
            catch (Exception ex)
            {
                ServicioSap.Helpers.Logger.SAP("[CREDIT SendSmsNewNumber ERROR] ", ex.Message);
                return new Dictionary<string, int> { { "result", -1 } };
            }
```
2) BusinessPartnerMethods.cs:88 y :99-104 (request/response/error de una escritura OData):
```csharp
                var jsonBody = JsonSerializer.Serialize(newClient, options);
                ServicioSap.Helpers.Logger.SAP("[SAP BP REQUEST] ", jsonBody);
                ...
                        string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        ServicioSap.Helpers.Logger.SAP("[SAP BP RESPONSE] ", responseContent);

                        if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(responseContent))
                        {
                            ServicioSap.Helpers.Logger.SAP("[SAP BP ERROR] ", $"StatusCode: {response.StatusCode}. Content: {responseContent}");
                            throw new Exception("Error SAP. StatusCode: " + response.StatusCode + " Content: " + responseContent);
                        }
```
3) OrderMethods.cs:731-737 (fallo secundario registrado sin alterar la respuesta, con contexto de negocio en el mensaje):
```csharp
                catch (Exception exArt)
                {
                    ServicioSap.Helpers.Logger.SAP(
                        "[CREDITO ARTICULOS ERROR] ",
                        $"solicitud={idSolicitud} incrementId={order.incrementId} cuenta={order.infoCliente?.cuenta} :: {exArt.Message}");
                    Console.WriteLine($"[ProcessCreditPayment] La solicitud {idSolicitud} quedo SIN LINEAS DE ARTICULO: {exArt.Message}");
                }
```
Ejemplos adicionales: CreditController.cs:77-78 `ServicioSap.Helpers.Logger.SAP("[CREDIT GetCreditAmounts ERROR] ", $"articulo={req.articulo} tipo={req.tipo} uen={req.uen} => {e.Message}");`; OrderController.cs:45 `ServicioSap.Helpers.Logger.SAP("[ORDER NEW ERROR] ", $"incrementId={order?.incrementId} :: {e}");`; DocumentMethods.cs:112-114 (con `using ServicioSap.Helpers;` llama `Logger.SAP("[CREDIT guardardocumento] ", $"Iniciando - Cliente: {bodyMultipart.Cliente}, TipoDoc: {bodyMultipart.TipoDoc}, Base64Length: {bodyMultipart.FileInputBase64?.Length ?? 0}");`); OrderMethods.cs:3451 `Logger.SAP("[ORDER GetCondicion ERROR] ", ex.Message);`. Convencion del tag: `"[MODULO Metodo ERROR] "` en mayusculas con espacio final; 87 usos en 19 archivos. Traza secundaria por `Console.WriteLine("Error X: " + ex.Message)` (108 usos en Methods).

## canal_api_intermedia_patron

=== URL_BP_API en Methods\Order\OrderMethods.cs:1188-1206 (dentro de `public async Task<string> HandlePromoCodeAsync(string codigo, string idMagento = null, string operacion = "ValidarCupon")`, :1112) VERBATIM, incluido el parseo del envoltorio OData `d.results` con Newtonsoft JObject/JArray:
```csharp
                    // 4. Regenerar Cupón
                    string sucursalEmpresa = null;
                    string baseBp = System.Configuration.ConfigurationManager.AppSettings["URL_BP_API"];
                    if (string.IsNullOrEmpty(baseBp)) throw new Exception("URL_BP_API no configurada en AppSettings");
                    string urlAgente = $"{baseBp.TrimEnd('/')}/AS_GET_ZQBP_AGENTE?Zagente={codigo}";
                    using (var httpClient = new HttpClient())
                    {
                        var responseAgente = await httpClient.GetAsync(urlAgente).ConfigureAwait(false);
                        if (responseAgente.IsSuccessStatusCode)
                        {
                            var jsonStr = await responseAgente.Content.ReadAsStringAsync().ConfigureAwait(false);
                            var agenteObj = Newtonsoft.Json.JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(jsonStr);
                            var resultsArray = agenteObj["d"]?["results"] as Newtonsoft.Json.Linq.JArray;
                            if (resultsArray != null && resultsArray.Count > 0)
                            {
                                sucursalEmpresa = resultsArray[0]["Werks"]?.ToString();
                            }
                        }
                    }
```
(Continua :1208-1224: `var accountMethods = new ServicioSap.Methods.MaterialManagement.AccountMethods(); var sucursalesList = await accountMethods.GetSucursalAsync(sucursalEmpresa).ConfigureAwait(false);` con try/catch que hace `Console.WriteLine("Error obteniendo la sucursal: " + ex.Message);`.)

=== URL_BP_API escritura (POST JSON sin CSRF, sin Basic S4) en Methods\BusinessPartner\BusinessPartnerMethods.cs:199-244 `EnableBpCombinationAsync` VERBATIM:
```csharp
        /// <summary>
        /// Enable BP combination for multiple sales channels (01 cash, 02 credit)
        /// </summary>
        public async Task<string> EnableBpCombinationAsync(BpCombinationRequest request)
        {
            var baseUrl = ConfigurationManager.AppSettings["URL_BP_API"];
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                throw new Exception("URL_BP_API no esta configurada en Web.config");
            }
            
            var url = $"{baseUrl.TrimEnd('/')}/AC_POST_HabilitaCombinacionBP";

            try
            {
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                    
                    var options = new JsonSerializerOptions
                    {
                        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                    };
                    var jsonBody = JsonSerializer.Serialize(request, options);

                    using (var content = new StringContent(jsonBody, Encoding.UTF8, "application/json"))
                    {
                        using (var response = await httpClient.PostAsync(url, content).ConfigureAwait(false))
                        {
                            string responseContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

                            if (!response.IsSuccessStatusCode)
                            {
                                throw new Exception($"Error en HabilitaCombinacionBP. StatusCode: {response.StatusCode} Content: {responseContent}");
                            }

                            return responseContent;
                        }
                    }
                }
            }
            catch (Exception e)
            {
                throw new Exception($"Ocurrio un error al intentar habilitar la combinacion del BP: {e.Message}");
            }
        }
```

=== URL_ANDROID_API en BusinessPartnerMethods.cs:342-374 `GetSuccessFactorEmployeeAsync` VERBATIM (respuesta es arreglo plano, NO envoltorio d.results; System.Text.Json):
```csharp
        public async Task<List<SuccessFactorEmployee>> GetSuccessFactorEmployeeAsync(string userId)
        {
            string baseAndroid = System.Configuration.ConfigurationManager.AppSettings["URL_ANDROID_API"];
            if (string.IsNullOrEmpty(baseAndroid)) 
            {
                throw new Exception("URL_ANDROID_API no configurada en AppSettings");
            }

            string url = $"{baseAndroid.TrimEnd('/')}/employees/get_personalById?user_id={userId}&status=0&centro=";

            using (var httpClient = new HttpClient())
            {
                try
                {
                    var response = await httpClient.GetAsync(url).ConfigureAwait(false);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        var jsonStr = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        var employeeList = JsonSerializer.Deserialize<List<SuccessFactorEmployee>>(jsonStr);
                        return employeeList;
                    }
                    else
                    {
                        throw new Exception($"Error al consultar SuccessFactors: StatusCode {response.StatusCode}");
                    }
                }
                catch (Exception ex)
                {
                    throw new Exception($"Error intentando obtener el empleado en SuccessFactors: {ex.Message}");
                }
            }
        }
```
Comentario que fija el criterio (BusinessPartnerMethods.cs:379-383): "CONSULTA de canal de venta = SD52, directo a S/4HANA (Regla 29). Antes apuntaba a URL_ANDROID_API/AS_GET_ZQSD_EditarCliente_CanalVenta, que es el endpoint de EDICION (POST) del canal de venta, no el de consulta; ademas se deserializaba con el envoltorio OData "d.results" sin serlo. Si mas adelante se necesita EDITAR el canal, ese POST si va por URL_ANDROID_API."

=== Variante con Newtonsoft y wrapper tipado D/Results (URL_SALES_DISTRIBUTION_API), MovBitaMethods.cs:13-48: `var url = $"{baseUrl.TrimEnd('/')}/AI_GET_ZSDT_MOVBITA?Vbeln={vbeln}"; using (var httpClient = new HttpClient()) { var response = await httpClient.GetAsync(url); string responseContent = await response.Content.ReadAsStringAsync(); if (!response.IsSuccessStatusCode) throw ...; if (string.IsNullOrWhiteSpace(responseContent)) return new List<MovBitaResult>(); var jsonResponse = JsonConvert.DeserializeObject<MovBitaResponse>(responseContent); return jsonResponse?.D?.Results ?? new List<MovBitaResult>(); }`. Variante con cliente estatico sin credenciales `TokenGenerator.CreateClientExternal()` + `SapResponse` (URL_CONFIGURACIONES_API): ProductMethods.cs:354-394 (`var url = CONFIGURACIONES_BASE_URL.TrimEnd('/') + $"/AS_GET_FamiliaLineaFilter?Class={clase}"; var apiService = TokenGenerator.CreateClientExternal(); ... var root = JsonSerializer.Deserialize<SapResponse>(responseContent); if (root == null || root.d.results.ValueKind != JsonValueKind.Array) return familias;`). Regla: a estas APIs intermedias (*.mavi.fun, AWS) NUNCA se manda el Basic de S4 (`new HttpClient()` o `CreateClientExternal()`), y el prefijo de ruta indica el verbo: `AS_GET_`/`AI_GET_` lectura GET, `AC_POST_` escritura POST.

## reglas_skill_aplicables

Fuente: "\\CATECINF214034\Compartida\Migracion SAP\.agents\skills\lan-sap-migration\SKILL.md", seccion "## Reglas Arquitectónicas Core" (linea 37). Reglas que afectan a escribir codigo nuevo en Methods\Credit y Models (cita textual + linea):

- Regla 1 (:41): "Los SPs y tablas de Intelisis son obsoletos, pero **LAS TABLAS LOCALES NO LO SON POR DEFECTO**. Antes de eliminar un SP legacy, debes **CONSULTAR** si esa tabla fue migrada a `SigMavi` para persistencia local, o si se reemplazará por SAP."
- Regla 2 (:42): "**Cero Consultas Directas a SAP DB:** C# no hará sentencias `INSERT/SELECT` contra tablas `Z` de SAP. Toda persistencia usa OData (SD, BP, MM) a través de DTOs mapeados."
- Regla 3 (:43): "**SQLite (OpenPay / Guías):** Se mantiene **temporalmente** para rastros de webhooks y guías de envío."
- Regla 4 (:44): "**Android DB (MAVICBOSANDROID):** Se **MANTIENE** la conexión directa a ese servidor. Aplica a **cualquier tabla que resida ahí**, no a una lista cerrada: `TcAAEA00030_EnvioMensajes` (SMS) y `VTASdArtCreditoWeb` (crédito web) son solo **ejemplos**. **No reportes como violación** el acceso a otra tabla del servidor de Android por no estar en esa lista. La conexión se obtiene siempre de `ConexionSQL.obtenerConexionAndroidAsync()` (Regla 27), que además **ya devuelve la conexión ABIERTA**: no la vuelvas a abrir."
- Regla 6 (:46): "**Validación Cruzada (LAN vs SAP):** Antes de programar, haz un `grep_search` y `view_file` del método homólogo en el proyecto LAN para no perder retries, autenticaciones OAuth o callbacks."
- Regla 7 (:47): "**Abstracción de Configuraciones:** Prohibido hardcodear URLs. Usa `ConfigurationManager.AppSettings` manteniendo la nomenclatura de LAN."
- Regla 8 (:48): "**Trazabilidad (Logs Nivel Producción):** Estructura el código replicando el comportamiento de `Logger.SetOrder`." (NOTA: en ServicioSAP NO EXISTE `Logger.SetOrder`; el unico metodo es `Logger.SAP(type, message)`.)
- Regla 9 (:49): "**Dinamicidad de URLs S4HANA (Regla de Oro S4):** NUNCA se deben hardcodear las URLs base para peticiones a S4. La Base URL y credenciales SIEMPRE deben extraerse desde la DLL del proyecto."
- Regla 10 (:50): "**Cero Suposiciones (Uso de `/grill-me`):** Está estrictamente prohibido asumir reglas de negocio. Si en cualquier instrucción falta información o existen dudas de diseño, debes cuestionar al usuario..."
- Regla 11 (:51): "**Uso Obligatorio de Payloads de Referencia:** Cualquier mapeo de DTOs (...) debe referenciarse de los payloads reales en `...\Resources` (...). NUNCA adivines el nombre de una propiedad SAP."
- Regla 12 (:52): "**Programación Asíncrona (Async/Await) y Limpieza de Código:** Todo código nuevo o modificado DEBE estar bajo el estándar `async/await` para evitar bloqueos en operaciones I/O o peticiones HTTP. Está estrictamente prohibido usar `.Result` o `.Wait()`. Además, durante cualquier refactorización, [Atlas] debe analizar el código existente e identificar fragmentos inútiles o muertos (código comentado, métodos obsoletos, validaciones redundantes) y señalarlos al usuario para determinar si se eliminan." (Es la regla de REUTILIZAR/no duplicar; la regla 28 la refuerza: "Prohibido reimplementar en línea lo que en LAN era un helper compartido".)
- Regla 13 (:53): "**Prevención de Errores 404 en OData (Regla de la Diagonal):** Al concatenar URLs usando `Conexion.Data.obtenerUrl(...)`, SIEMPRE asegúrate de anteponer una diagonal `/` al inicio del nombre del servicio OData (ej. `... + "/ZAPI..."`)."
- Regla 15 (:55): "**Exclusión Estricta de CrediLana:** Todo flujo, código o tabla relacionada exclusivamente con solicitudes o frontend de "CrediLana" queda **FUERA DEL ALCANCE** de la migración a SAP."
- Regla 17 (:57): "**Separación de Responsabilidades (Controllers vs Methods):** Vanguard tiene ESTRICTAMENTE PROHIBIDO colocar lógica de negocio o llamadas a SAP dentro de los archivos de la carpeta `Controllers\`. Los controladores solo deben recibir el request. Toda la lógica OData debe vivir en clases dedicadas dentro de la carpeta `Methods\` (ej. `Methods\Order\OrderMethods.cs`)."
- Regla 18 (:58): "**Ubicación de los DTOs OData:** Todo JSON payload de SAP debe ser mapeado a clases en C#. Estas clases DEBEN crearse obligatoriamente dentro de la ruta `Models\SAP\[Módulo]\`. Se debe utilizar el decorador `[JsonProperty("NombrePropiedadSAP")]` de Newtonsoft.Json para mapear los campos, manteniendo las propiedades de C# en PascalCase." (Contraste con el codigo real: 25 archivos usan `[JsonPropertyName]` System.Text.Json vs 8 con `[JsonProperty]`; el design doc §8-P lo deja como decision abierta.)
- Regla 19 (:59): "**Regla de Compilación Legacy (.csproj):** Dado que ServicioSAP es un proyecto .NET Framework tradicional, si se crea un nuevo archivo `.cs` (Model, Method o Controller), es OBLIGATORIO recordar que el archivo físico debe registrarse dentro de `ServicioSap.csproj` con una etiqueta `<Compile Include="..." />`. Si no se registra, el servidor no lo compilará."
- Regla 20 (:60): "**Centralización en Web.config:** Queda prohibido hardcodear rutas a endpoints OData en el código. Rutas como `/ZAPI_SALESORDER_SRV` ya existen en el `Web.config`. Cualquier ruta nueva hacia SAP debe agregarse al bloque `<appSettings>` del Web.config y consumirse vía `ConfigurationManager.AppSettings["KEY"]`." (En la practica solo 5 servicios estan externalizados; el resto va inline tras obtenerUrl.)
- Regla 24 (:64): "**Cero Invención:** NUNCA inventes información ni alucines datos."
- Regla 25 (:65): "**Pruebas End-to-End Obligatorias:** Siempre que termines la migración de un endpoint, método o ruta en general, DEBERÁS hacer pruebas end-to-end (E2E) para verificar que todo funcione perfectamente. Deberás indicar de manera explícita y documentada qué información enviaste en el Request de prueba y cuál fue el Response exacto que te devolvió el servicio."
- Regla 26 (:66): "**Prohibición Estricta de Entity Framework:** Está estrictamente prohibido utilizar Entity Framework (EF) o cualquier ORM pesado para la persistencia o consulta de datos. Todo acceso a datos debe realizarse a través de ADO.NET clásico (clases `SqlConnection`, `SqlCommand`, `SqlDataReader`, etc.) o los helpers ya existentes." (La regla 12 es async; la 26 es no-EF.)
- Regla 27 (:67): "**Gestión Centralizada de Conexiones DB:** ... Para bases de datos SQL Server, se deben invocar los métodos de la clase `ServicioSap\Helpers\ConexionDB\ConexionSQL.cs` (ej. `obtenerConexionSigMavi()`, `obtenerConexionAndroid()`, etc.). Para operaciones con SQLite, se debe utilizar `ServicioSap\Helpers\ConexionDB\SQLiteDb.cs`. No se deben inicializar conexiones crudas en ninguna otra parte del código."
- Regla 28 (:68-78) Nomenclatura Trazable DMZ → ServicioSAP: "**Orquestador** (el que invoca el controlador): se nombra igual que **la ruta que el DMZ consume**. Ejemplos correctos: la ruta `order/cancelOrder` la atiende `CancelOrderAsync`; `order/setreturn` la atiende `SetReturnAsync`; `order/new` la atiende `SetOrderAsync`." (:69) / "**Helper heredado de LAN:** si en LAN existe un método invocado desde **dos o más** sitios, al migrarlo se crea en ServicioSAP **con el mismo nombre que tiene en LAN** ... lo único que se adapta es la convención de C# (PascalCase inicial y sufijo `Async` cuando aplique)." (:70) / "**Dónde vive:** en la clase `Methods\[Dominio]\` del dominio al que pertenece, o en `Methods\Utils\` si lo consumen dominios distintos (Regla 17). Nunca copiado en cada archivo que lo usa." (:71) / "**Pasos internos** (...) se nombran por **la operación SAP** que ejecutan ... Ejemplos correctos: `PostCancelInvoiceAsync` (SD48), `PostReverseGoodsIssueAsync` (SD46)." (:74) / "**Prohibido** reutilizar un orquestador para dos rutas distintas mediante un flag de modo." (:76) / "**Prohibido reimplementar en línea** lo que en LAN era un helper compartido. Si el mismo cálculo aparece copiado dentro de dos o más métodos de ServicioSAP, es un defecto **aunque el código funcione**" (:77).
- Regla 29 (:80-112) Resolución de URLs por destino: tabla :85-96 (S/4HANA via `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)`; URL_ANDROID_API, URL_BP_API, URL_SALES_DISTRIBUTION_API, VETA_URL_LIBERADOR, AwsBaseUrl, SQLITE_DB_PATH, IMAGES_CREDIT_PATH via `ConfigurationManager.AppSettings`; mandante `sap-client=110`). "**`obtenerUrl` NO devuelve barra final.** ... la barra la aporta el path del servicio" (:100). "**Paths de servicio en Web.config.** ... Al leerlos **normaliza la barra inicial** (`if (!p.StartsWith("/")) p = "/" + p;`)" (:101). "**El destino lo determina el RESOLVEDOR, no la naturaleza del dato.** ... **NUNCA marques como defecto** que un dato "que conceptualmente vive en SAP" se consuma por una API de MAVI" (:110). "**Autenticación por destino.** S/4HANA usa **`Authorization: Basic`** vía `TokenGenerator.CreateClientS4()`" (:111). "**AWS: dos URLs distintas son la MISMA API** ... Se resuelve siempre por la AppSetting `AwsBaseUrl`" (:105-109). "Para **OData v4** se cambia el segmento con `.Replace("/odata/sap", "/odata4/sap")`" (:99).
- Regla 31 (:123): "**Solo se pide una fuente (SP/función) si un proceso de ServicioSAP la consume HOY.** No se pide por aparecer en el grafo de dependencias de los `.sql`. Antes de pedir un archivo, **traza la cadena completa**..."
- Regla 32 (:114-117): "**Un `HttpClient` por petición a SAP: es diseño, NO deuda. No lo "optimices".** El token **CSRF de S/4HANA es único por petición** y está **ligado a la cookie de sesión** del `CookieContainer` de ese cliente. ... Patrón obligatorio: `CreateClientS4()` → `await GetTokenSapAsync(apiService, serviceUrl)` → `request.Headers.Add("X-CSRF-Token", csrfToken)` **sobre ese mismo cliente**. **Prohibido** convertirlo en un `HttpClient` estático compartido".
- Regla 30 (:119-121) fuera de alcance APP mercancias (no afecta a credito). Reglas 5, 14, 16, 21, 22, 23 son de proceso/documentacion, no de codigo.
Arbol de decision (:133-134): "**Flujos Periféricos Locales (Webhooks, SMS, Guías, Android):** *SI encuentras lógica de OpenPay, Guías o SMS (`TcAAEA00030_EnvioMensajes`)* -> MANTENER la persistencia local conectándote a SQLite o Android DB. No mezclar estos rastros dentro del payload de SAP."