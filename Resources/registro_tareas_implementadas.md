# Registro General de Tareas Implementadas en ServicioSAP

Este documento engloba de forma generalizada todas las tareas arquitectónicas y de desarrollo que se han realizado en la capa `ServicioSAP` (.NET 4.7.2) para cada Controlador y Método, conectando Magento/DMZ con S/4HANA.

## 🛠️ Tareas Generales por Componente

### 1. Controladores (`ServicioSap\Controllers`)[Optimista: 1 día, Promedio:  3 días, Pesimista:  6 días]
Esta capa actúa como el nuevo Gateway receptor que reemplaza al antiguo proyecto LAN. Las tareas principales implementadas aquí son:
*   **Recepción y Parseo de Payloads(Magento to C#):** Conversión de los JSONs entrantes a modelos C# simplificados heredados de la versión anterior (ej. `OrderRequest`, `CustomerRequest`, `OrderRMA`). [Optimista:  1 hora, Promedio: 2 horas, Pesimista: 3 horas]
*   **Enrutamiento y Definición de API Rest:** Creación de decoradores `[RoutePrefix]` y `[Route]` equivalentes a los que existían en LAN para recibir las peticiones de la DMZ sin alterar el enrutamiento original (ej. `order/new`, `partner/client`). [Optimista: 4 horas, Promedio: 1 días, Pesimista: 2 días]
*   **Orquestación de Respuestas Simplificadas(Limpieza Odata to Magento):** Transformación de la respuesta compleja de OData V2 (que puede traer decenas de nodos anidados) hacia un objeto anónimo resumido (ej. `{ BP, SalesDocument, Message, Resultado }`) para mantener la compatibilidad con lo que espera recibir Magento y la DMZ. [Optimista: 1 hora, Promedio: 4 horas, Pesimista:1 día]
* Implementacion y pruebas de puente Servicio SAP a Magento. 
  Envio: Magento -> DMZ ->SAP 
  Return: SAP->DMZ -> Magento [Optimista: 6 horas, Promedio: 1 días, Pesimista: 2 días]

### 2. Equivalencia de Bodys y Mapeo de DTOs (Modelos/Metodos) [Optimista:  3 días, Promedio:  6 días, Pesimista:  12 días]

Una de las tareas más críticas es la transformación de las entidades del Frontend a las entidades requeridas por el ERP:

*   **Conversion de datos de magento a SAP - Construcción de Wrappers y Adaptadores Ejemplos (`BuildClientFromCustomerRequest`, `BuilAdapterReturn`):** Métodos dedicados exclusivamente para
	* Inyectar las reglas de negocio [Optimista: 2 días, Promedio: 4 días, Pesimista: 8 días]
	* transformar campos (ej. convertir ID genéricos de eCommerce a las llaves maestras `purchNoC`) y estructurar los objetos de cabecera e items requeridos por SAP. [Optimista: 1 días, Promedio: 2 días, Pesimista: 4 días]
*   **Generacion de modelos de Envio y de Respuesta SAP (`ServicioSap\Models\SAP`):** Mapeo estricto de las estructuras OData (`Client`, `Order`, `to_result`, `to_return`, `SaleD`) respetando la nomenclatura nativa exacta de los servicios OData de S/4HANA para evitar errores de serialización (Bad Requests 400).[Automatizado por el agente IA en base a metadata Odata]

### 3. Implementación Wrapper API SAP (`ServicioSap\Methods`) [Optimista: 5 días, Promedio: 8 días, Pesimista: 12 días]
Toda la lógica pesada de negocio y comunicación con S/4HANA reside en las clases de la carpeta `Methods` (ej. `OrderMethods`, `BusinessPartnerMethods`, `SalesMethods`),[[master_migration_summary_unified]] Este archivo tiene habla del porcentual 66% + 14% y falta realizar el 20% de descubrimiento de wrapper(Falta por implementar o ya implementado):
*   **Ejecución de Operaciones OData (CRUD):** 
    *   **POST (Creación/Inserción):** Inyección de datos para crear pedidos SD01 (`SetOrder`) o registrar Business Partners (`SubmitClientInfoAsync`). [Optimista: 2 días, Promedio:  4 días, Pesimista: 5 día]
    *   **PATCH (Actualización):** Envío de parches a clientes existentes o documentos comerciales (`UpdateClient`). [Optimista: 2 días, Promedio: 2 días, Pesimista: 3 días]
    *   **GET (Obtención de Datos Faltantes):** Implementación de peticiones GET combinadas con query strings nativas de OData (ej. `$filter=`) para realizar búsquedas o consultar el estatus en tiempo real de un documento (`CheckDocumentExistsSD36Async(purchNoC)`). [Optimista: 8 horas desarrollo, Promedio: 1 dia - 5 horas, Pesimista: 2 días]
*   **Manejo Interceptivo de Errores (Error Handling):** Recepción de errores arrojados por SAP (ej. fallas de validación, cortes de stock ATP). El wrapper intercepta la respuesta fallida, busca el nodo de error nativo de SAP (como el campo extendido `Zobservaciones` o el arreglo `to_return.results`) y lo sube a la superficie para que el controlador lo devuelva en formato legible. [Optimista: 5 horas, Promedio:  8 horas desarrollo , Pesimista: 2 día]

### 4.  Clases de objeto de utilidad

* Creacion de catalogos ya sea por Json o solicitar API. [Optimista: 30 minutos, Promedio:  1 hora , Pesimista: 1 dia]

### 5. Estimación de Puntos Faltantes (GAP Crítico)

Al requerir construirse desde cero, la estimación de cada uno de los endpoints faltantes contempla el ciclo de vida completo de desarrollo calculado en los puntos 1, 2 y 3 (Controladores + DTOs + Wrappers SAP/BD).
**Cálculo base por endpoint:** 
*   **Punto 1 (Controladores):** Opt: 1 día / Prom: 3 días / Pes: 6 días
*   **Punto 2 (DTOs):** Opt: 3 días / Prom: 6 días / Pes: 12 días
*   **Punto 3 (Wrappers):** Opt: 5 días / Prom: 8 días / Pes: 12 días
*   **Total por Endpoint:** [Optimista: 9 días, Promedio: 17 días, Pesimista: 30 días]

**Módulo de Crédito**
*   **SMS (`credit/getSms`):** BD Local (Android/Sigmavi). [Optimista: 1 hora, Promedio: 4horas, Pesimista: 1 dia ]
*   **Código Promoción (`credit/codigoPromocion`):** Wrapper de API externa (SuccessFactors / Sigmavi). Contempla el tiempo de obtención de accesos y descubrimiento de la API. [Optimista: 9 días, Promedio: 17 días, Pesimista: 30 días]
*   **Código Recomendado (`credit/codigoRecomendado`):** BD Local (Sigmavi). [Optimista: 1 hora, Promedio: 4horas, Pesimista: 1 dia ]
*   **Monedero (`credit/MonederoSaldoCredito`):** OData SAP Existente (SD18). [Optimista: 9 días, Promedio: 17 días, Pesimista: 30 días]
*   **RFC y Teléfono (`credit/ExistRFCAndPhoneCte`):** OData SAP Existente (BP05). [Optimista: 1 hora, Promedio: 4horas, Pesimista: 1 dia ]
*   **Plazos (`credit/getPlazos`):** OData SAP Nuevo (SD40). Implementación desde cero, requiere documentación y validación. [Optimista: 9 días, Promedio: 17 días, Pesimista: 30 días]

**Módulo de Órdenes**
*   **Anulación de Facturas (`order/getPosCancellations`):** OData SAP Existente (SD48). [Optimista: 5 hora, Promedio: 8 horas, Pesimista: 2 dias ]
*   **Código de Recolección (`order/GetPickUpCode`):** BD Local (Sigmavi).  [Sin Estimar]
*   **Fechas de Entrega (`order/estimated-delivery`):** *Pendiente de definición técnica de Códigos Postales por el equipo.* [Sin estimar]

**Módulo de Customer Service**
*   **Multipago BBVA (`ApplyPaymentAdvanced` / `UpdateStatusPayment...`):** OData SAP Nuevo (API de Ponce `ZFICRUD_COBREF_SRV`). [Optimista: 9 días, Promedio: 17 días, Pesimista: 30 días]
*   **Tipos de Garantía (`obtenerTipoGarantia`):** OData SAP Existente (SD08) + BD Local (Android). [Optimista: 9 días, Promedio: 17 días, Pesimista: 30 días]
*   **Unir Cuenta Magento (`unirCuenta`):** OData SAP Existente (BP05 actualizando ZID_MAGENTO). [Optimista: 8 horas, Promedio: 1 dia, Pesimista: 3 dia ]
*   **Quejas y Atención (`bitacoraAtencionClientes`):** BD Local (Android/Sigmavi). [Optimista: 1 hora, Promedio: 4horas, Pesimista: 1 dia ]
*   **Cobertura CP (`validarCoberturaPorCP`):** *Pendiente de nombre del SP o API.* [Sin estimar]


---
**Nota de Arquitectura:** Estas tareas han sentado las bases robustas del framework en `ServicioSAP`. Cualquier nuevo controlador o endpoint (como los faltantes del "GAP Crítico") deberá adherirse a estas mismas directrices de abstracción (Recepción en Controller -> Adaptador de DTO -> Wrapper/Method de API SAP).
