

## firma_66

FUENTE: "//CATECINF214034/Compartida/Migracion SAP/.agents/skills/lan-sap-migration/SPsOrden/SP_CREDITO_WEB_DATOS.sql" (623 lineas; la ultima linea `END` no tiene salto final, por eso `wc -l` reporta 622).
Contexto de cabecera: `USE [ServicioAndroid]` (:1), `SET ANSI_NULLS ON` (:4), `SET QUOTED_IDENTIFIER OFF` (:6), `ALTER PROCEDURE [dbo].[SP_CREDITO_WEB_DATOS]` (:92). Conteo verificado programaticamente: 66 parametros en :92-159 (cuadra).

Ramas: INS = `IF (@Op = 'Insert')` (:172-349) | UPD = `IF (@Op = 'Update')` (:351-368) | REF = `IF (@Op = 'InsertReferencia')` (:370-603). "linea uso" = lineas donde el parametro se lee/escribe dentro de la rama.

#  | nombre                    | tipo SQL exacto | default | rama(s) donde se usa (lineas)                                                                 | linea decl
---|---------------------------|-----------------|---------|-----------------------------------------------------------------------------------------------|-----------
1  | @Id                       | INT             | NULL    | UPD (:365 WHERE id = @Id, :367 SELECT @Id); REF (:388, :398 SET @Id=SCOPE_IDENTITY(), :400, :580, :599, :601). NO se usa en INS | 92
2  | @Op                       | VARCHAR(20)     | NULL    | discriminador (:172 'Insert', :351 'Update', :370 'InsertReferencia')                          | 93
3  | @apellido_p               | VARCHAR(30)     | NULL    | INS (:285)                                                                                     | 94
4  | @apellido_m               | VARCHAR(30)     | NULL    | INS (:286)                                                                                     | 95
5  | @nombre                   | VARCHAR(25)     | NULL    | INS (:287)                                                                                     | 96
6  | @nombre_2                 | VARCHAR(30)     | NULL    | INS (:288)                                                                                     | 97
7  | @fecha_nacimiento         | DATE            | NULL    | INS (:289)                                                                                     | 98
8  | @rfc                      | VARCHAR(13)     | NULL    | INS (:290)                                                                                     | 99
9  | @sexo                     | VARCHAR(9)      | NULL    | INS (:291)                                                                                     | 100
10 | @email                    | VARCHAR(50)     | NULL    | INS (:292)                                                                                     | 101
11 | @direccion                | VARCHAR(30)     | NULL    | INS (:293)                                                                                     | 102
12 | @exterior                 | VARCHAR(8)      | NULL    | INS (:294)                                                                                     | 103
13 | @interior                 | VARCHAR(8)      | NULL    | INS (:295)                                                                                     | 104
14 | @entre_calles             | VARCHAR(80)     | NULL    | INS (:296)                                                                                     | 105
15 | @years_old                | INT             | NULL    | INS (:297 -> col antiguedadAnios)                                                              | 106
16 | @months_old               | INT             | NULL    | INS (:298 -> col antiguedadMeses)                                                              | 107
17 | @codigo_postal            | VARCHAR(6)      | NULL    | INS (:299)                                                                                     | 108
18 | @delegacion               | VARCHAR(25)     | NULL    | INS (:300)                                                                                     | 109
19 | @poblacion                | VARCHAR(30)     | NULL    | INS (:301)                                                                                     | 110
20 | @estado                   | VARCHAR(30)     | NULL    | INS (:302)                                                                                     | 111
21 | @colonia                  | VARCHAR(30)     | NULL    | INS (:303)                                                                                     | 112
22 | @estado_civil             | VARCHAR(11)     | NULL    | INS (:304)                                                                                     | 113
23 | @vive_en_calidad          | VARCHAR(11)     | NULL    | INS (:305)                                                                                     | 114
24 | @sueldo                   | MONEY           | NULL    | INS (:306)                                                                                     | 115
25 | @tarjeta                  | VARCHAR(1)      | NULL    | INS (:307); UPD (:361)                                                                         | 116
26 | @tarjeta_digitos          | INT             | NULL    | INS (:308); UPD (:362)                                                                         | 117
27 | @credito_hipoteca         | VARCHAR(1)      | NULL    | INS (:309); UPD (:363)                                                                         | 118
28 | @credito_automotriz       | VARCHAR(1)      | NULL    | INS (:310); UPD (:364)                                                                         | 119
29 | @lada_particular          | INT             | NULL    | INS (:311)                                                                                     | 120
30 | @telefono_particular      | VARCHAR(10)     | NULL    | INS (:312)                                                                                     | 121
31 | @lada_celular             | INT             | NULL    | INS (:313)                                                                                     | 122
32 | @telefono_celular         | VARCHAR(10)     | NULL    | INS (:314)                                                                                     | 123
33 | @ext_archivo_1            | VARCHAR(5)      | NULL    | INS (:315); UPD (:358)                                                                         | 124
34 | @ext_archivo_2            | VARCHAR(5)      | NULL    | INS (:316); UPD (:359)                                                                         | 125
35 | @ext_archivo_3            | VARCHAR(5)      | NULL    | INS (:317); UPD (:360)                                                                         | 126
36 | @articulo                 | VARCHAR(20)     | NULL    | INS (:318). SOBREESCRITO en :177 (`@Articulo = Codigo`) cuando @origen = 'DIMAS MX'             | 127
37 | @uen                      | INT             | NULL    | INS (:319)                                                                                     | 128
38 | @condicion                | VARCHAR(20)     | NULL    | INS (:320). SOBREESCRITO en :176 (`@Condicion = Condicion`) cuando @origen = 'DIMAS MX'         | 129
39 | @cliente                  | VARCHAR(9)      | NULL    | INS (:189, :199, :207 filtros de lectura; :216 SUBSTRING(@cliente,1,1); :321)                  | 130
40 | @utmSource                | VARCHAR(100)    | NULL    | INS (:322)                                                                                     | 131
41 | @die                      | BIT             | NULL    | INS (:323)                                                                                     | 132
42 | @sucursal                 | INT             | NULL    | INS (:324)                                                                                     | 133
43 | @origen                   | VARCHAR(20)     | NULL    | INS (:174 condicion 'DIMAS MX'; :325)                                                          | 134
44 | @parentesco_ref           | VARCHAR(15)     | NULL    | REF (:389, :581)                                                                               | 137
45 | @nombre_ref               | VARCHAR(40)     | NULL    | REF (:390, :582)                                                                               | 138
46 | @apellido_p_ref           | VARCHAR(30)     | NULL    | REF (:391, :583)                                                                               | 139
47 | @apellido_m_ref           | VARCHAR(4000)   | NULL    | REF (:374 discriminador fnSplit '~'; :392; :453 fnSplit '|'; :527 SET @apellido_m_ref = @Valor; :584) | 140
48 | @lada_particular_ref      | INT             | NULL    | REF (:394, :586)                                                                               | 141
49 | @telefono_particular_ref  | VARCHAR(10)     | NULL    | REF (:395, :587)                                                                               | 142
50 | @tipo_tel_ref             | INT             | NULL    | REF (:393, :585)                                                                               | 143
51 | @codigo                   | VARCHAR(40)     | NULL    | INS (:328); UPD (:357)                                                                         | 144
52 | @ClienteMagento           | VARCHAR(12)     | NULL    | INS (:330)                                                                                     | 145
53 | @idMagento                | VARCHAR(12)     | NULL    | INS (:329)                                                                                     | 146
54 | @MetodoEnvio              | VARCHAR(12)     | NULL    | INS (:331)                                                                                     | 147
55 | @estatus                  | INT             | 0       | INS (:332); UPD (:356)                                                                         | 148
56 | @CodigoRecomendador       | VARCHAR(15)     | NULL    | INS (:333)                                                                                     | 149
57 | @SucursalDestino          | INT             | 0       | INS (:335)                                                                                     | 150
58 | @Agente                   | VARCHAR(10)     | NULL    | INS (:334)                                                                                     | 151
59 | @RedimirMonedero          | MONEY           | NULL    | INS (:336 como `ISNULL(@RedimirMonedero, 0.00)`)                                               | 152
60 | @ValidacionTelefono       | BIT             | NULL    | INS (:337). El valor de ENTRADA NUNCA se lee: siempre se sobreescribe en :216 o :220           | 153
61 | @OrigenIdMagento          | VARCHAR(20)     | NULL    | INS (:338)                                                                                     | 154
62 | @LadaValidar              | INT             | NULL    | INS (:339)                                                                                     | 155
63 | @TelefonoValidar          | VARCHAR(10)     | NULL    | INS (:340)                                                                                     | 156
64 | @Curp                     | VARCHAR(20)     | NULL    | INS (:341)                                                                                     | 157
65 | @FechaCita                | DATE            | NULL    | INS (:342)                                                                                     | 158
66 | @HoraCita                 | VARCHAR(100)    | NULL    | INS (:343)                                                                                     | 159

Observaciones factuales (no interpretacion):
- Solo 2 parametros tienen default distinto de NULL: @estatus INT = 0 (:148) y @SucursalDestino INT = 0 (:150).
- No hay parametros OUTPUT. No hay RETURN. No hay SET NOCOUNT ON. No hay BEGIN TRAN / TRY-CATCH en todo el SP.
- Si @Op no coincide con ninguna de las 3 literales, el SP no ejecuta nada y no devuelve ningun result set (solo corre el epilogo :608-622).
- El resultado de cada rama es un SELECT de una sola columna SIN alias: `SELECT @IdSolicitud` (:348), `SELECT @Id` (:367), `SELECT @Id` (:400 / :601).

FIRMA VERBATIM (:92-160):
ALTER PROCEDURE [dbo].[SP_CREDITO_WEB_DATOS] @Id INT = NULL
	,@Op VARCHAR(20) = NULL
	,@apellido_p VARCHAR(30) = NULL
	,@apellido_m VARCHAR(30) = NULL
	,@nombre VARCHAR(25) = NULL
	,@nombre_2 VARCHAR(30) = NULL
	,@fecha_nacimiento DATE = NULL
	,@rfc VARCHAR(13) = NULL
	,@sexo VARCHAR(9) = NULL
	,@email VARCHAR(50) = NULL
	,@direccion VARCHAR(30) = NULL
	,@exterior VARCHAR(8) = NULL
	,@interior VARCHAR(8) = NULL
	,@entre_calles VARCHAR(80) = NULL
	,@years_old INT = NULL
	,@months_old INT = NULL
	,@codigo_postal VARCHAR(6) = NULL
	,@delegacion VARCHAR(25) = NULL
	,@poblacion VARCHAR(30) = NULL
	,@estado VARCHAR(30) = NULL
	,@colonia VARCHAR(30) = NULL
	,@estado_civil VARCHAR(11) = NULL
	,@vive_en_calidad VARCHAR(11) = NULL
	,@sueldo MONEY = NULL
	,@tarjeta VARCHAR(1) = NULL
	,@tarjeta_digitos INT = NULL
	,@credito_hipoteca VARCHAR(1) = NULL
	,@credito_automotriz VARCHAR(1) = NULL
	,@lada_particular INT = NULL
	,@telefono_particular VARCHAR(10) = NULL
	,@lada_celular INT = NULL
	,@telefono_celular VARCHAR(10) = NULL
	,@ext_archivo_1 VARCHAR(5) = NULL
	,@ext_archivo_2 VARCHAR(5) = NULL
	,@ext_archivo_3 VARCHAR(5) = NULL
	,@articulo VARCHAR(20) = NULL
	,@uen INT = NULL
	,@condicion VARCHAR(20) = NULL
	,@cliente VARCHAR(9) = NULL
	,@utmSource VARCHAR(100) = NULL
	,@die BIT = NULL
	,@sucursal INT = NULL
	,@origen VARCHAR(20) = NULL
	,
	--Referencias
	@parentesco_ref VARCHAR(15) = NULL
	,@nombre_ref VARCHAR(40) = NULL
	,@apellido_p_ref VARCHAR(30) = NULL
	,@apellido_m_ref VARCHAR(4000) = NULL
	,@lada_particular_ref INT = NULL
	,@telefono_particular_ref VARCHAR(10) = NULL
	,@tipo_tel_ref INT = NULL
	,@codigo VARCHAR(40) = NULL
	,@ClienteMagento VARCHAR(12) = NULL
	,@idMagento VARCHAR(12) = NULL
	,@MetodoEnvio VARCHAR(12) = NULL
	,@estatus INT = 0
	,@CodigoRecomendador VARCHAR(15) = NULL
	,@SucursalDestino INT = 0
	,@Agente VARCHAR(10) = NULL
	,@RedimirMonedero MONEY = NULL
	,@ValidacionTelefono BIT = NULL
	,@OrigenIdMagento VARCHAR(20) = NULL
	,@LadaValidar INT = NULL
	,@TelefonoValidar VARCHAR(10) = NULL
	,@Curp VARCHAR(20) = NULL
	,@FechaCita DATE = NULL
	,@HoraCita VARCHAR(100) = NULL
AS

## insert_59

INSERT INTO CRED_SOLICITUD_WEB_DATOS_TEMP (SP:223) — base ServicioAndroid (local). Conteo verificado: 59 columnas (:224-282) y 59 valores (:285-343); cuadra 1 a 1 en orden posicional. Despues del INSERT: `SET @IdSolicitud = SCOPE_IDENTITY();` (:346) y `SELECT @IdSolicitud` (:348, una columna sin alias).

#  | columna              | expresion de valor EXACTA                                   | tipo   | linea col | linea valor
---|----------------------|-------------------------------------------------------------|--------|-----------|------------
1  | apellidoP            | @apellido_p                                                 | param  | 224 | 285
2  | apellidoM            | @apellido_m                                                 | param  | 225 | 286
3  | nombre               | @nombre                                                     | param  | 226 | 287
4  | nombre2              | @nombre_2                                                   | param  | 227 | 288
5  | fechaNacimiento      | @fecha_nacimiento                                           | param  | 228 | 289
6  | rfc                  | @rfc                                                        | param  | 229 | 290
7  | sexo                 | @sexo                                                       | param  | 230 | 291
8  | email                | @email                                                      | param  | 231 | 292
9  | direccion            | @direccion                                                  | param  | 232 | 293
10 | exterior             | @exterior                                                   | param  | 233 | 294
11 | interior             | @interior                                                   | param  | 234 | 295
12 | entreCalles          | @entre_calles                                               | param  | 235 | 296
13 | antiguedadAnios      | @years_old                                                  | param  | 236 | 297
14 | antiguedadMeses      | @months_old                                                 | param  | 237 | 298
15 | codigoPostal         | @codigo_postal                                              | param  | 238 | 299
16 | delegacion           | @delegacion                                                 | param  | 239 | 300
17 | poblacion            | @poblacion                                                  | param  | 240 | 301
18 | estado               | @estado                                                     | param  | 241 | 302
19 | colonia              | @colonia                                                    | param  | 242 | 303
20 | estadoCivil          | @estado_civil                                               | param  | 243 | 304
21 | viveEnCalidad        | @vive_en_calidad                                            | param  | 244 | 305
22 | sueldo               | @sueldo                                                     | param  | 245 | 306
23 | tarjeta              | @tarjeta                                                    | param  | 246 | 307
24 | tarjetaDigitos       | @tarjeta_digitos                                            | param  | 247 | 308
25 | creditoHipoteca      | @credito_hipoteca                                           | param  | 248 | 309
26 | creditoAutomotriz    | @credito_automotriz                                         | param  | 249 | 310
27 | ladaParticular       | @lada_particular                                            | param  | 250 | 311
28 | telefonoParticular   | @telefono_particular                                        | param  | 251 | 312
29 | ladaCelular          | @lada_celular                                               | param  | 252 | 313
30 | telefonoCelular      | @telefono_celular                                           | param  | 253 | 314
31 | extencionArchivo_1   | @ext_archivo_1                                              | param  | 254 | 315
32 | extencionArchivo_2   | @ext_archivo_2                                              | param  | 255 | 316
33 | extencionArchivo_3   | @ext_archivo_3                                              | param  | 256 | 317
34 | articulo             | @articulo  (CALCULADA si @origen='DIMAS MX': `@Articulo = Codigo` de ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt con MAX(IdCondicionArt), :176-182) | param/calc | 257 | 318
35 | uen                  | @uen                                                        | param  | 258 | 319
36 | condicion            | @condicion (CALCULADA si @origen='DIMAS MX': `@Condicion = Condicion` de la misma fila, :176-182) | param/calc | 259 | 320
37 | cliente              | @cliente                                                    | param  | 260 | 321
38 | utmSource            | @utmSource                                                  | param  | 261 | 322
39 | die                  | @die                                                        | param  | 262 | 323
40 | sucursal             | @sucursal                                                   | param  | 263 | 324
41 | origen               | @origen                                                     | param  | 264 | 325
42 | fecha                | @fecha  (variable local DATETIME = GETDATE(), :162/:170)     | calc   | 265 | 326
43 | confirmado           | 1                                                           | literal| 266 | 327
44 | codigo               | @codigo                                                     | param  | 267 | 328
45 | idMagento            | @idMagento                                                  | param  | 268 | 329
46 | ClienteMagento       | @ClienteMagento                                             | param  | 269 | 330
47 | MetodoEnvio          | @MetodoEnvio                                                | param  | 270 | 331
48 | estatus              | @estatus  (default 0)                                       | param  | 271 | 332
49 | CodigoRecomendador   | @CodigoRecomendador                                         | param  | 272 | 333
50 | Agente               | @Agente                                                     | param  | 273 | 334
51 | SucursalDestino      | @SucursalDestino  (default 0)                               | param  | 274 | 335
52 | RedimirMonedero      | ISNULL(@RedimirMonedero, 0.00)                              | calc   | 275 | 336
53 | ValidacionTelefono   | @ValidacionTelefono  (CALCULADA SIEMPRE en :210-221: `IIF(SUBSTRING(@cliente, 1, 1) != 'P', 1, 0)` si @TelefonoValidado IS NULL OR @ValidacionOrigen IS NULL OR @TelefonoValidado != @TelefonoAValidar; si no, 0. El valor recibido como parametro se descarta) | calc | 276 | 337
54 | OrigenIdMagento      | @OrigenIdMagento                                            | param  | 277 | 338
55 | LadaValidar          | @LadaValidar                                                | param  | 278 | 339
56 | TelefonoValidar      | @TelefonoValidar                                            | param  | 279 | 340
57 | CURP                 | @Curp                                                       | param  | 280 | 341
58 | FechaCita            | @FechaCita                                                  | param  | 281 | 342
59 | HoraCita             | @HoraCita                                                   | param  | 282 | 343

Columnas NO alimentadas por parametro directo: #34/#36 (condicionalmente), #42 fecha, #43 confirmado, #52 RedimirMonedero (ISNULL), #53 ValidacionTelefono (siempre calculada).

INSERT VERBATIM (:223-348):
		INSERT INTO CRED_SOLICITUD_WEB_DATOS_TEMP (
			apellidoP
			,apellidoM
			,nombre
			,nombre2
			,fechaNacimiento
			,rfc
			,sexo
			,email
			,direccion
			,exterior
			,interior
			,entreCalles
			,antiguedadAnios
			,antiguedadMeses
			,codigoPostal
			,delegacion
			,poblacion
			,estado
			,colonia
			,estadoCivil
			,viveEnCalidad
			,sueldo
			,tarjeta
			,tarjetaDigitos
			,creditoHipoteca
			,creditoAutomotriz
			,ladaParticular
			,telefonoParticular
			,ladaCelular
			,telefonoCelular
			,extencionArchivo_1
			,extencionArchivo_2
			,extencionArchivo_3
			,articulo
			,uen
			,condicion
			,cliente
			,utmSource
			,die
			,sucursal
			,origen
			,fecha
			,confirmado
			,codigo
			,idMagento
			,ClienteMagento
			,MetodoEnvio
			,estatus
			,CodigoRecomendador
			,Agente
			,SucursalDestino
			,RedimirMonedero
			,ValidacionTelefono
			,OrigenIdMagento
			,LadaValidar
			,TelefonoValidar
			,CURP
			,FechaCita
			,HoraCita
			)
		VALUES (
			@apellido_p
			,@apellido_m
			,@nombre
			,@nombre_2
			,@fecha_nacimiento
			,@rfc
			,@sexo
			,@email
			,@direccion
			,@exterior
			,@interior
			,@entre_calles
			,@years_old
			,@months_old
			,@codigo_postal
			,@delegacion
			,@poblacion
			,@estado
			,@colonia
			,@estado_civil
			,@vive_en_calidad
			,@sueldo
			,@tarjeta
			,@tarjeta_digitos
			,@credito_hipoteca
			,@credito_automotriz
			,@lada_particular
			,@telefono_particular
			,@lada_celular
			,@telefono_celular
			,@ext_archivo_1
			,@ext_archivo_2
			,@ext_archivo_3
			,@articulo
			,@uen
			,@condicion
			,@cliente
			,@utmSource
			,@die
			,@sucursal
			,@origen
			,@fecha
			,1
			,@codigo
			,@idMagento
			,@ClienteMagento
			,@MetodoEnvio
			,@estatus
			,@CodigoRecomendador
			,@Agente
			,@SucursalDestino
			,ISNULL(@RedimirMonedero, 0.00)
			,@ValidacionTelefono
			,@OrigenIdMagento
			,@LadaValidar
			,@TelefonoValidar
			,@Curp
			,@FechaCita
			,@HoraCita
			)

		SET @IdSolicitud = SCOPE_IDENTITY();

		SELECT @IdSolicitud
	END

## prologo_insert_verbatim

SP_CREDITO_WEB_DATOS.sql:160-222 VERBATIM (indentacion con tabs como en el archivo; el archivo es CRLF):

AS
BEGIN
	DECLARE @fecha DATETIME
		,@IdSolicitud INT
		,@ValidacionOrigen VARCHAR(25) = NULL
		,@TelefonoValidado VARCHAR(10) = NULL
		,@TelefonoAValidar VARCHAR(10) = NULL

	SELECT @IdSolicitud = 0

	SELECT @fecha = GETDATE()

	IF (@Op = 'Insert')
	BEGIN
		IF (@origen = 'DIMAS MX')
		BEGIN
			SELECT @Condicion = Condicion
				,@Articulo = Codigo
			FROM ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt WITH (NOLOCK)
			WHERE IdCondicionArt = (
					SELECT MAX(IdCondicionArt)
					FROM ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt WITH (NOLOCK)
					)
		END

		--Validacion con la tabla de app origen
		SELECT TOP 1 @ValidacionOrigen = RTRIM(LTRIM(tsdt.Nombre))
		FROM ERPMAVI.IntelisisTmp.dbo.TablaStD tsdt WITH (NOLOCK)
		INNER JOIN ERPMAVI.IntelisisTmp.dbo.CteTel ct WITH (NOLOCK) ON RTRIM(LTRIM(ct.AppOrigen)) = RTRIM(LTRIM(tsdt.Nombre))
		WHERE ct.Cliente = @cliente
			AND tsdt.TablaSt = 'ORIGEN VALIDACION NUMERO CTE'
			AND ct.ValidacionTel = 1;

		--Validacion con la tabla de CteTel
		SELECT TOP 1 @TelefonoValidado = CONCAT (
				ct.Lada
				,ct.Telefono
				)
		FROM ERPMAVI.IntelisisTmp.dbo.CteTel ct WITH (NOLOCK)
		WHERE ct.Cliente = @cliente
			AND ct.Tipo = 'Movil'
			AND ct.ValidacionTel = 1
		ORDER BY Fecha DESC;

		--Validar con el telefono en tabla SMS
		SELECT TOP 1 @TelefonoAValidar = Telefono
		FROM TcAAEA00030_EnvioMensajes WITH (NOLOCK)
		WHERE Cliente = @cliente
		ORDER BY Id DESC

		IF (
				@TelefonoValidado IS NULL
				OR @ValidacionOrigen IS NULL
				OR @TelefonoValidado != @TelefonoAValidar
				)
		BEGIN
			SELECT @ValidacionTelefono = IIF(SUBSTRING(@cliente, 1, 1) != 'P', 1, 0);
		END
		ELSE
		BEGIN
			SELECT @ValidacionTelefono = 0;
		END

--- Observaciones factuales del prologo (para portar con semantica identica) ---
- :162-166 declara 5 locales: @fecha DATETIME (sin init), @IdSolicitud INT (sin init; :168 lo pone en 0), @ValidacionOrigen VARCHAR(25)=NULL, @TelefonoValidado VARCHAR(10)=NULL, @TelefonoAValidar VARCHAR(10)=NULL.
- :176-177 escribe en @Condicion / @Articulo: son los mismos parametros @condicion / @articulo (T-SQL no distingue mayusculas en nombres de variables). Solo ocurre si @origen = 'DIMAS MX'. Si la tabla esta vacia, el SELECT no asigna y los parametros conservan su valor de entrada.
- Lectura 1 (:186-191): TOP 1 SIN ORDER BY sobre TablaStD JOIN CteTel (linked server ERPMAVI.IntelisisTmp). Filtros: ct.Cliente = @cliente, tsdt.TablaSt = 'ORIGEN VALIDACION NUMERO CTE', ct.ValidacionTel = 1, join por RTRIM(LTRIM(ct.AppOrigen)) = RTRIM(LTRIM(tsdt.Nombre)). Asigna RTRIM(LTRIM(tsdt.Nombre)). Si no hay filas, @ValidacionOrigen queda NULL.
- Lectura 2 (:194-202): TOP 1 ORDER BY Fecha DESC sobre CteTel (linked server). Filtros: ct.Cliente = @cliente, ct.Tipo = 'Movil', ct.ValidacionTel = 1. Asigna CONCAT(ct.Lada, ct.Telefono) a un VARCHAR(10). Si no hay filas, queda NULL.
- Lectura 3 (:205-208): TOP 1 ORDER BY Id DESC sobre TcAAEA00030_EnvioMensajes (LOCAL, ServicioAndroid). Filtro: Cliente = @cliente. Asigna Telefono a VARCHAR(10). Si no hay filas, queda NULL.
- IF (:210-221): la condicion es `@TelefonoValidado IS NULL OR @ValidacionOrigen IS NULL OR @TelefonoValidado != @TelefonoAValidar`. Nota: si @TelefonoAValidar es NULL y los otros dos no son NULL, `@TelefonoValidado != NULL` es UNKNOWN y se cae al ELSE (@ValidacionTelefono = 0). Rama verdadera: `IIF(SUBSTRING(@cliente, 1, 1) != 'P', 1, 0)`; si @cliente es NULL, SUBSTRING devuelve NULL, la comparacion es UNKNOWN y IIF devuelve 0.
- El parametro de entrada @ValidacionTelefono nunca se lee; siempre queda con el valor de :216 o :220.

## update_9

SP_CREDITO_WEB_DATOS.sql:351-368 VERBATIM:

	IF (@Op = 'Update')
	BEGIN
		UPDATE CRED_SOLICITUD_WEB_DATOS_TEMP
		WITH (ROWLOCK)

		SET estatus = @estatus
			,codigo = @codigo
			,extencionArchivo_1 = @ext_archivo_1
			,extencionArchivo_2 = @ext_archivo_2
			,extencionArchivo_3 = @ext_archivo_3
			,tarjeta = @tarjeta
			,tarjetaDigitos = @tarjeta_digitos
			,creditoHipoteca = @credito_hipoteca
			,creditoAutomotriz = @credito_automotriz
		WHERE id = @Id

		SELECT @Id
	END

Conteo verificado: 9 columnas en SET (:356-364); cuadra.

# | columna            | valor              | tipo param       | default | linea
--|--------------------|--------------------|------------------|---------|------
1 | estatus            | @estatus           | INT              | 0       | 356
2 | codigo             | @codigo            | VARCHAR(40)      | NULL    | 357
3 | extencionArchivo_1 | @ext_archivo_1     | VARCHAR(5)       | NULL    | 358
4 | extencionArchivo_2 | @ext_archivo_2     | VARCHAR(5)       | NULL    | 359
5 | extencionArchivo_3 | @ext_archivo_3     | VARCHAR(5)       | NULL    | 360
6 | tarjeta            | @tarjeta           | VARCHAR(1)       | NULL    | 361
7 | tarjetaDigitos     | @tarjeta_digitos   | INT              | NULL    | 362
8 | creditoHipoteca    | @credito_hipoteca  | VARCHAR(1)       | NULL    | 363
9 | creditoAutomotriz  | @credito_automotriz| VARCHAR(1)       | NULL    | 364

Observaciones factuales:
- Tabla: CRED_SOLICITUD_WEB_DATOS_TEMP (local ServicioAndroid), hint WITH (ROWLOCK). Filtro: `WHERE id = @Id` (:365).
- Los 9 valores se escriben tal cual (incluyendo NULL si el parametro viene NULL; no hay ISNULL/COALESCE). @estatus por default vale 0.
- Devuelve `SELECT @Id` (:367): el mismo @Id recibido, una columna sin alias. No verifica @@ROWCOUNT: si el id no existe, no falla y devuelve @Id igualmente.

## referencias_verbatim

SP_CREDITO_WEB_DATOS.sql:370-603 VERBATIM COMPLETO (tabs como en el archivo):

	IF (@Op = 'InsertReferencia')
	BEGIN
		IF (
				SELECT COUNT(item)
				FROM fnSplit(@apellido_m_ref, '~')
				) = 1
		BEGIN
			INSERT INTO TrWACW00041_RefSolCredWeb (
				IDSolicitud
				,Parentesco
				,Nombre
				,ApellidoP
				,ApellidoM
				,TipoTel
				,LadaTel
				,NumeroTel
				)
			VALUES (
				@Id
				,@parentesco_ref
				,@nombre_ref
				,@apellido_p_ref
				,@apellido_m_ref
				,@tipo_tel_ref
				,@lada_particular_ref
				,@telefono_particular_ref
				)

			SET @Id = SCOPE_IDENTITY();

			SELECT @Id
		END
		ELSE
		BEGIN
			DECLARE @DireccionAux VARCHAR(50) = NULL
				,@EntreCallesAux VARCHAR(50) = NULL
				,@NumIntAux VARCHAR(7) = NULL
				,@NumExtAux VARCHAR(7) = NULL
				,@CodigoPostalAux INT = NULL
				,@MunicipioAux VARCHAR(80) = NULL
				,@PoblacionAux VARCHAR(80) = NULL
				,@EstadoAux VARCHAR(30) = NULL
				,@ColoniaAux VARCHAR(80) = NULL

			IF EXISTS (
					SELECT NAME
					FROM TEMPDB.SYS.SYSOBJECTS
					WHERE TYPE = 'U'
						AND ID = OBJECT_ID('Tempdb.dbo.#Datos')
					)
				DROP TABLE #Datos

			IF EXISTS (
					SELECT NAME
					FROM TEMPDB.SYS.SYSOBJECTS
					WHERE TYPE = 'U'
						AND ID = OBJECT_ID('Tempdb.dbo.#DatosCampoValor')
					)
				DROP TABLE #DatosCampoValor

			--Tabla principal que contiene la informacion de los datos a insertar
			CREATE TABLE #Datos (
				ID INT IDENTITY(1, 1)
				,Datos VARCHAR(max)
				,Campo VARCHAR(max)
				,TipoDato VARCHAR(1)
				,Valor VARCHAR(max)
				)

			--Tabla auxiliar
			CREATE TABLE #DatosCampoValor (
				ID INT IDENTITY(1, 1)
				,Dato VARCHAR(max)
				)

			-- Este insert se auxilia de la funcion fnSplit el cual recibe como parametro una cadena de texto
			-- y un delimitador, para este caso nos ayuda a obtener de manera individual una cadena de texto que 
			-- representa un dato que se insertará en la tabla.
			-- Nota: la cadena que recibe la funcion para este caso guarda la siguiente estructura.
			--       'NombreCampo~TipoDeDato~Valor|NombreCampo~TipoDeDato~Valor|NombreCampo~TipoDeDato~Valor'
			--       La cadena aun debe atomizarse (dividir en mas partes) antes de poder procesarse
			INSERT INTO #Datos (Datos)
			SELECT item
			FROM fnSplit(@apellido_m_ref, '|')

			DECLARE @NumeroRegistro INT = (
					SELECT COUNT(*)
					FROM #Datos
					)
				,@Contador INT = 1
				,@CampoValor VARCHAR(max)
				,@Campo VARCHAR(max)
				,@TipoDato VARCHAR(1)
				,@Valor VARCHAR(max)
				,@IdSol INT
				,@Instruccion VARCHAR(max)

			-- El siguiente ciclo atomiza la cadena de texto delimitado por el simbolo '~' del campo Datos de la
			-- tabla #Datos en campos ejemplo: supongamos que tenemos la siguiente cadena de texto
			-- 'Direccion~T~Avenida Cruz Del Sur' dicha cadena contiene y almacena la siguiente estructura
			-- 'NombreDelCampo~TipoDeDato~Valor' al desmenuzarse obtenemos de manera individual tres valores
			-- Donde @TipoDeDato puede contener los siguientes valores: T -> Texto; E -> Entero ; F -> Fecha
			WHILE @Contador <= @NumeroRegistro
			BEGIN
				-- Obtenemos la cadena de texto a atomizar (dividir en partes más pequeñas)
				SELECT @CampoValor = Datos
				FROM #Datos
				WHERE ID = @Contador

				-- Atomizamos la cadena y almacenamos los valores de manera individual en una tabla temporal
				INSERT INTO #DatosCampoValor (Dato)
				SELECT item
				FROM fnSplit(@CampoValor, '~')

				-- Los datos almacenados los recuperamos en las variables: @Campo, @TipoDato y @Valor
				SELECT @Campo = (
						SELECT Dato
						FROM #DatosCampoValor
						WHERE Id = (@Contador * 3) - 2
						)

				SELECT @TipoDato = (
						SELECT Dato
						FROM #DatosCampoValor
						WHERE Id = (@Contador * 3) - 1
						)

				SELECT @Valor = (
						SELECT Dato
						FROM #DatosCampoValor
						WHERE Id = (@Contador * 3)
						)

				-- Actualizamos la tabla #Datos en los campos <Campo>, <TipoDato> y <Valor> con las
				-- variables obtenidas en el paso anterior.
				UPDATE #Datos
				SET Campo = @Campo
					,TipoDato = @TipoDato
					,Valor = @Valor
				WHERE ID = @Contador

				-- Incrementamos el contador para atomizar la siguiente cadena de texto
				SET @Contador += 1
			END --FIN DEL CICLO WHILE

			SET @Contador = 1

			WHILE (@Contador <= @NumeroRegistro)
			BEGIN
				SELECT @Campo = Campo
					,@TipoDato = TipoDato
					,@Valor = Valor
				FROM #Datos
				WHERE ID = @Contador

				IF @Campo = 'ApellidoM'
					AND @Valor <> '{0}'
					SET @apellido_m_ref = @Valor
				ELSE IF @Campo = 'Direccion'
					AND @Valor <> '{0}'
					SET @DireccionAux = @Valor
				ELSE IF @Campo = 'EntreCalles'
					AND @Valor <> '{0}'
					SET @EntreCallesAux = @Valor
				ELSE IF @Campo = 'NumInt'
					AND @Valor <> '{0}'
					SET @NumIntAux = @Valor
				ELSE IF @Campo = 'NumExt'
					AND @Valor <> '{0}'
					SET @NumExtAux = @Valor
				ELSE IF @Campo = 'CodigoPostal'
					AND @Valor <> '{0}'
					SET @CodigoPostalAux = (
							SELECT CAST(@Valor AS INT)
							)
				ELSE IF @Campo = 'Municipio'
					AND @Valor <> '{0}'
					SET @MunicipioAux = @Valor
				ELSE IF @Campo = 'Poblacion'
					AND @Valor <> '{0}'
					SET @PoblacionAux = @Valor
				ELSE IF @Campo = 'Estado'
					AND @Valor <> '{0}'
					SET @EstadoAux = @Valor
				ELSE IF @Campo = 'Colonia'
					AND @Valor <> '{0}'
					SET @ColoniaAux = @Valor
				SET @Contador += 1
			END --FIN DEL CICLO WHILE

			INSERT INTO TrWACW00041_RefSolCredWeb (
				IDSolicitud
				,Parentesco
				,Nombre
				,ApellidoP
				,ApellidoM
				,TipoTel
				,LadaTel
				,NumeroTel
				,Direccion
				,EntreCalles
				,NumInt
				,NumExt
				,CodigoPostal
				,Municipio
				,Poblacion
				,Estado
				,Colonia
				)
			VALUES (
				@Id
				,@parentesco_ref
				,@nombre_ref
				,@apellido_p_ref
				,@apellido_m_ref
				,@tipo_tel_ref
				,@lada_particular_ref
				,@telefono_particular_ref
				,@DireccionAux
				,@EntreCallesAux
				,@NumIntAux
				,@NumExtAux
				,@CodigoPostalAux
				,@MunicipioAux
				,@PoblacionAux
				,@EstadoAux
				,@ColoniaAux
				)

			SET @Id = SCOPE_IDENTITY();

			SELECT @Id
		END --FIN DEL BLOQUE ELSE
	END --FIN DE LA OPCION -> InsertReferencia

=== CONTEOS VERIFICADOS ===
- Camino corto INSERT: 8 columnas (:378-385) / 8 valores (:388-395). Cuadra.
- Camino largo: 9 declaraciones Aux (:404-412); INSERT 17 columnas (:561-577) / 17 valores (:580-596). Cuadra. Las primeras 8 columnas/valores son identicas al camino corto; las 9 adicionales (Direccion, EntreCalles, NumInt, NumExt, CodigoPostal, Municipio, Poblacion, Estado, Colonia) reciben las 9 variables Aux en el mismo orden.
- Declaraciones del WHILE (:455-465): @NumeroRegistro INT = COUNT(*) de #Datos, @Contador INT = 1, @CampoValor VARCHAR(max), @Campo VARCHAR(max), @TipoDato VARCHAR(1), @Valor VARCHAR(max), @IdSol INT, @Instruccion VARCHAR(max). @IdSol e @Instruccion se declaran y NUNCA se usan. @TipoDato se lee y se guarda pero NUNCA condiciona nada (el mapeo de tipo T/E/F del comentario :471 no tiene efecto en el codigo; el unico CAST es el de CodigoPostal a INT en :543).

=== TABLA columnas camino corto (8) ===
# | columna     | valor                    | linea col | linea val
1 | IDSolicitud | @Id                      | 378 | 388
2 | Parentesco  | @parentesco_ref          | 379 | 389
3 | Nombre      | @nombre_ref              | 380 | 390
4 | ApellidoP   | @apellido_p_ref          | 381 | 391
5 | ApellidoM   | @apellido_m_ref          | 382 | 392
6 | TipoTel     | @tipo_tel_ref            | 383 | 393
7 | LadaTel     | @lada_particular_ref     | 384 | 394
8 | NumeroTel   | @telefono_particular_ref | 385 | 395

=== TABLA columnas camino largo (17) ===
#  | columna      | valor                                       | tipo var Aux   | linea col | linea val
1  | IDSolicitud  | @Id                                         | INT (param)    | 561 | 580
2  | Parentesco   | @parentesco_ref                             | VARCHAR(15)    | 562 | 581
3  | Nombre       | @nombre_ref                                 | VARCHAR(40)    | 563 | 582
4  | ApellidoP    | @apellido_p_ref                             | VARCHAR(30)    | 564 | 583
5  | ApellidoM    | @apellido_m_ref (posiblemente reasignado :527) | VARCHAR(4000) | 565 | 584
6  | TipoTel      | @tipo_tel_ref                               | INT            | 566 | 585
7  | LadaTel      | @lada_particular_ref                        | INT            | 567 | 586
8  | NumeroTel    | @telefono_particular_ref                    | VARCHAR(10)    | 568 | 587
9  | Direccion    | @DireccionAux                               | VARCHAR(50)    | 569 | 588
10 | EntreCalles  | @EntreCallesAux                             | VARCHAR(50)    | 570 | 589
11 | NumInt       | @NumIntAux                                  | VARCHAR(7)     | 571 | 590
12 | NumExt       | @NumExtAux                                  | VARCHAR(7)     | 572 | 591
13 | CodigoPostal | @CodigoPostalAux                            | INT            | 573 | 592
14 | Municipio    | @MunicipioAux                               | VARCHAR(80)    | 574 | 593
15 | Poblacion    | @PoblacionAux                               | VARCHAR(80)    | 575 | 594
16 | Estado       | @EstadoAux                                  | VARCHAR(30)    | 576 | 595
17 | Colonia      | @ColoniaAux                                 | VARCHAR(80)    | 577 | 596

=== SEMANTICA OBSERVABLE DEL ALGORITMO (solo lo que dice el codigo) ===
1. Discriminador (:372-375): `(SELECT COUNT(item) FROM fnSplit(@apellido_m_ref, '~')) = 1` -> camino corto; cualquier otro conteo (0, 2, 3, ...) -> camino largo. Que devuelve fnSplit para NULL o cadena vacia NO SE SABE (fuente NO EXISTE, ver campo fnsplit).
2. Camino largo, particion nivel 1 (:451-453): cada `item` de fnSplit(@apellido_m_ref, '|') se inserta en #Datos.Datos con ID IDENTITY(1,1) consecutivo; @NumeroRegistro = COUNT(*) (:455-458).
3. WHILE 1 (:472-513): para @Contador = 1..@NumeroRegistro, toma #Datos.Datos WHERE ID = @Contador, inserta TODOS los `item` de fnSplit(@CampoValor, '~') en #DatosCampoValor (tabla ACUMULATIVA: no se trunca entre iteraciones). Luego lee Campo = Dato WHERE Id = (@Contador*3)-2, TipoDato = Id (@Contador*3)-1, Valor = Id (@Contador*3). Esta aritmetica asume EXACTAMENTE 3 tokens por segmento; si un segmento produce distinto numero de tokens, los indices se desfasan para todos los segmentos siguientes (comportamiento a replicar tal cual, no a corregir). Si el Id no existe, el subselect devuelve NULL y la variable queda NULL. Actualiza #Datos (Campo, TipoDato, Valor) WHERE ID = @Contador.
4. WHILE 2 (:517-558): para cada fila de #Datos, cadena IF/ELSE IF con comparacion exacta de @Campo contra las 10 literales: 'ApellidoM', 'Direccion', 'EntreCalles', 'NumInt', 'NumExt', 'CodigoPostal', 'Municipio', 'Poblacion', 'Estado', 'Colonia'. Cada rama exige ademas `@Valor <> '{0}'` (el literal '{0}' es el marcador de "sin valor"; si @Valor es NULL la comparacion es UNKNOWN y no se asigna). Campos no listados se ignoran. 'ApellidoM' SOBREESCRIBE el parametro @apellido_m_ref; si ningun segmento es 'ApellidoM' con valor valido, en ApellidoM se inserta la cadena completa original (VARCHAR(4000)). 'CodigoPostal' hace `CAST(@Valor AS INT)` (falla si no es numerico).
5. Ambos caminos: `SET @Id = SCOPE_IDENTITY()` (:398 / :599) y `SELECT @Id` (:400 / :601): el valor devuelto es el IDENTITY del nuevo registro en TrWACW00041_RefSolCredWeb, NO el @Id de la solicitud recibido.
6. Tipos: los VARCHAR(max) de #Datos/#DatosCampoValor se asignan a variables Aux de longitud fija (VARCHAR(50)/(7)/(80)/(30)) sin proteccion; T-SQL trunca silenciosamente en asignacion a variable.

## presolicitud_firma

FUENTE: "//CATECINF214034/Compartida/Migracion SAP/.agents/skills/lan-sap-migration/SPsOrden/SpCREDISolicitudWebPrimerGuardado.sql" (483 lineas). Cabecera: `USE [ServicioAndroid]` (:1), `SET ANSI_NULLS ON` (:4), `SET QUOTED_IDENTIFIER OFF` (:6). Conteo verificado: 17 parametros en :29-45 (cuadra).

VERBATIM (:29-46):
ALTER PROCEDURE [dbo].[SpCREDISolicitudWebPrimerGuardado] @op VARCHAR(40) = NULL
	,@idSolicitud INT = NULL
	,@nombre VARCHAR(25) = NULL
	,@nombre_2 VARCHAR(30) = NULL
	,@apellido_p VARCHAR(30) = NULL
	,@apellido_m VARCHAR(30) = NULL
	,@telefono_celular BIGINT = NULL
	,@uen INT = NULL
	,@nip INT = NULL
	,@validacion INT = NULL
	,@origen VARCHAR(20) = NULL
	,@IdWEB_DATOS_TEMP INT = NULL
	,@Articulo VARCHAR(10) = NULL
	,@Importe MONEY = NULL
	,@Correo VARCHAR(50) = NULL
	,@Telefono BIGINT = NULL
	,@ClaveMensaje VARCHAR(20) = NULL
AS

TABLA:
#  | nombre             | tipo SQL exacto | default | linea
1  | @op                | VARCHAR(40)     | NULL    | 29
2  | @idSolicitud       | INT             | NULL    | 30
3  | @nombre            | VARCHAR(25)     | NULL    | 31
4  | @nombre_2          | VARCHAR(30)     | NULL    | 32
5  | @apellido_p        | VARCHAR(30)     | NULL    | 33
6  | @apellido_m        | VARCHAR(30)     | NULL    | 34
7  | @telefono_celular  | BIGINT          | NULL    | 35
8  | @uen               | INT             | NULL    | 36
9  | @nip               | INT             | NULL    | 37
10 | @validacion        | INT             | NULL    | 38
11 | @origen            | VARCHAR(20)     | NULL    | 39
12 | @IdWEB_DATOS_TEMP  | INT             | NULL    | 40
13 | @Articulo          | VARCHAR(10)     | NULL    | 41
14 | @Importe           | MONEY           | NULL    | 42
15 | @Correo            | VARCHAR(50)     | NULL    | 43
16 | @Telefono          | BIGINT          | NULL    | 44
17 | @ClaveMensaje      | VARCHAR(20)     | NULL    | 45

Notas factuales de contraste con SP_CREDITO_WEB_DATOS: aqui @telefono_celular y @Telefono son BIGINT (en SP_CREDITO_WEB_DATOS los telefonos son VARCHAR(10)); @Articulo es VARCHAR(10) (vs VARCHAR(20)); @nombre VARCHAR(25) coincide. Todos los defaults son NULL. Sin OUTPUT, sin RETURN, sin transacciones, sin TRY/CATCH, sin SET NOCOUNT ON.

Mapa de las 11 operaciones (valor exacto de @Op, linea):
1 'SaveFirstData' :48 | 2 'UpdateFirstData' :113 | 3 'UpdateFirstDom' :129 | 4 'SaveRef' :140 | 5 'SaveNip' :189 | 6 'ValNip' :268 | 7 'ValidaNip' :288 | 8 'SaveIdDatosTemp' :308 | 9 'UpdateNumberCel' :317 | 10 'SaveCelNip' :372 | 11 'UpdateValNip' :460.
Operaciones que devuelven result set: SaveFirstData (`SELECT @idSolicitud AS idSolicitud` :110), ValNip (`SELECT @validacion AS validacion` :285), ValidaNip (:305 idem), SaveCelNip (`SELECT @idSolicitud AS idSolicitud` :416, emitido ANTES de los dos INSERT de SMS/historico :419-457), UpdateValNip (`SELECT 1 AS validacion` :477 / `SELECT 0 AS validacion` :481). Las otras 6 (UpdateFirstData, UpdateFirstDom, SaveRef, SaveNip, SaveIdDatosTemp, UpdateNumberCel) no devuelven nada.
Reutilizacion de parametros con otro significado (tal cual el codigo): UpdateFirstDom usa @nombre->Delegacion, @apellido_p->Poblacion, @apellido_m->Estado (:134-136). SaveRef usa @uen como NumReferencia (:152, :164, :179), @Correo como Nombre (:158, :180), @nip=1 como selector de TipoTel 'Celular'/'Particular' (:142-146), @Telefono como Telefono.

## presolicitud_ops_verbatim

SpCREDISolicitudWebPrimerGuardado.sql:47-484 VERBATIM COMPLETO (incluye BEGIN :47 y END :484 del cuerpo; tabs como en el archivo):

BEGIN
	IF (@Op = 'SaveFirstData')
	BEGIN
		IF (ISNULL(@Importe, 0) = 0)
		BEGIN
			IF (@origen <> 'PRODUCTOS MX')
			BEGIN
				SELECT @Importe = CASE 
						WHEN LEFT(Articulo, 4) = 'VALR'
							AND ISNULL(capital, 0) = 0
							THEN REPLACE(SUBSTRING(Descripcion1, 8, CHARINDEX('PE', Descripcion1) - 9), ' ', '')
						ELSE ISNULL(capital, 0)
						END
				FROM ERPMAVI.IntelisisTmp.dbo.art WITH (NOLOCK)
				WHERE articulo = @Articulo
			END
			ELSE
			BEGIN
				SELECT @Importe = ISNULL(MIN(p.Precio), 0)
				FROM ERPMAVI.IntelisisTmp.dbo.PropreListaDFinal p WITH (NOLOCK)
				JOIN ERPMAVI.IntelisisTmp.dbo.VTASCCondicionesCredVtaLinea c WITH (NOLOCK) ON c.CondicionPropre = p.Condicion
				WHERE c.CondicionWeb = '12 meses'
					AND c.Condicion NOT LIKE '%CEL%'
					AND c.TiendaVirtual = CASE 
						WHEN @uen = 1
							THEN 'Muebles America'
						ELSE 'VIU'
						END
					AND p.Articulo = @Articulo
			END
		END

		INSERT INTO CREDIDSolicitudWebDatosPrimerGuardado (
			Nombre
			,SegundoNombre
			,ApellidoPaterno
			,ApellidoMaterno
			,Celular
			,Uen
			,Origen
			,Fecha
			,Articulo
			,Importe
			,Correo
			,Telefono
			)
		VALUES (
			@nombre
			,@nombre_2
			,@apellido_p
			,@apellido_m
			,@telefono_celular
			,@uen
			,@origen
			,GETDATE()
			,@Articulo
			,@Importe
			,@Correo
			,@Telefono
			)

		SET @idSolicitud = SCOPE_IDENTITY();

		SELECT @idSolicitud AS idSolicitud
	END

	IF (@Op = 'UpdateFirstData')
	BEGIN
		UPDATE CREDIDSolicitudWebDatosPrimerGuardado
		WITH (ROWLOCK)

		SET Nombre = @nombre
			,SegundoNombre = @nombre_2
			,ApellidoPaterno = @apellido_p
			,ApellidoMaterno = @apellido_m
			,Celular = @telefono_celular
			,Uen = @uen
			,Correo = @Correo
			,Telefono = @Telefono
		WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud
	END

	IF (@Op = 'UpdateFirstDom')
	BEGIN
		UPDATE CREDIDSolicitudWebDatosPrimerGuardado
		WITH (ROWLOCK)

		SET Delegacion = @nombre
			,Poblacion = @apellido_p
			,Estado = @apellido_m
		WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud
	END

	IF (@Op = 'SaveRef')
	BEGIN
		DECLARE @tipoTel VARCHAR(20) = CASE 
				WHEN @nip = 1
					THEN 'Celular'
				ELSE 'Particular'
				END

		IF EXISTS (
				SELECT IDSolicitudWebDatosPrimerGuardado
				FROM CREDIDRefPrimerGuardadoCredWeb WITH (NOLOCK)
				WHERE IDSolicitudWebDatosPrimerGuardado = @idSolicitud
					AND NumReferencia = @uen
				)
		BEGIN
			UPDATE CREDIDRefPrimerGuardadoCredWeb
			WITH (ROWLOCK)

			SET Nombre = @Correo
				,ApellidoP = @apellido_p
				,ApellidoM = @apellido_m
				,TipoTel = @tipoTel
				,Telefono = @Telefono
			WHERE IDSolicitudWebDatosPrimerGuardado = @idSolicitud
				AND NumReferencia = @uen
		END
		ELSE
		BEGIN
			INSERT INTO CREDIDRefPrimerGuardadoCredWeb (
				IDSolicitudWebDatosPrimerGuardado
				,NumReferencia
				,Nombre
				,ApellidoP
				,ApellidoM
				,TipoTel
				,Telefono
				)
			VALUES (
				@idSolicitud
				,@uen
				,@Correo
				,@apellido_p
				,@apellido_m
				,@tipoTel
				,@Telefono
				)
		END
	END

	IF (@Op = 'SaveNip')
	BEGIN
		UPDATE CREDIDSolicitudWebDatosPrimerGuardado
		WITH (ROWLOCK)

		SET Celular = @telefono_celular
			,Validacion = @validacion
			,fechaValidacion = (
				CASE 
					WHEN @validacion = 1
						THEN GETDATE()
					ELSE NULL
					END
				)
		WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud

		IF (@validacion != 1)
		BEGIN
			IF (
					@nip = ''
					OR @nip = 0
					OR @nip = '0'
					OR @nip IS NULL
					)
			BEGIN
				SET @nip = (
						SELECT FLOOR(RAND() * (999999 - 100000) + 100000)
						);
			END

			UPDATE CREDIDSolicitudWebDatosPrimerGuardado
			WITH (ROWLOCK)

			SET Nip = @nip
			WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud

			--Envio sms
			INSERT INTO TcAAea00030_EnvioMensajes (
				IdRegistro
				,IdMensaje
				,Cliente
				,FechaEnvio
				,EstatusEnvio
				,ClienteF
				,Tipo
				,IntentoRespuesta
				,IntentoEnvio
				,Modem
				,Clave
				)
			VALUES (
				@idSolicitud
				,14
				,'CW00001'
				,GETDATE()
				,1
				,NULL
				,0
				,0
				,0
				,NULL
				,@ClaveMensaje
				)

			INSERT INTO CREDIHSolicitudWebHistoricoNip (
				IdSolicitudWebDatosPrimerGuardado
				,Celular
				,Nip
				,Fecha
				)
			VALUES (
				@idSolicitud
				,@telefono_celular
				,@nip
				,GETDATE()
				)
		END
	END

	IF (@Op = 'ValNip')
	BEGIN
		DECLARE @nipVal INT = (
				SELECT Nip
				FROM CREDIDSolicitudWebDatosPrimerGuardado WITH (NOLOCK)
				WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud
				)

		IF (@nip = @nipVal)
		BEGIN
			SET @validacion = 1
		END
		ELSE
		BEGIN
			SET @validacion = 0
		END

		SELECT @validacion AS validacion
	END

	IF (@Op = 'ValidaNip')
	BEGIN
		DECLARE @autorizar INT = (
				SELECT Validacion
				FROM CREDIDSolicitudWebDatosPrimerGuardado WITH (NOLOCK)
				WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud
				)

		IF (@autorizar = 1)
		BEGIN
			SET @validacion = 1
		END
		ELSE
		BEGIN
			SET @validacion = 0
		END

		SELECT @validacion AS validacion
	END

	IF (@Op = 'SaveIdDatosTemp')
	BEGIN
		UPDATE CREDIDSolicitudWebDatosPrimerGuardado
		WITH (ROWLOCK)

		SET IdSOLICITUD_WEB_DATOS_TEMP = @IdWEB_DATOS_TEMP
		WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud
	END

	IF (@Op = 'UpdateNumberCel')
	BEGIN
		SET @nip = (
				SELECT FLOOR(RAND() * (999999 - 100000) + 100000)
				);

		UPDATE CREDIDSolicitudWebDatosPrimerGuardado
		WITH (ROWLOCK)

		SET Celular = @telefono_celular
			,Nip = @nip
		WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud

		--codigo de enviar sms 
		INSERT INTO TcAAea00030_EnvioMensajes (
			IdRegistro
			,IdMensaje
			,Cliente
			,FechaEnvio
			,EstatusEnvio
			,ClienteF
			,Tipo
			,IntentoRespuesta
			,IntentoEnvio
			,Modem
			,Clave
			)
		VALUES (
			@idSolicitud
			,14
			,'CW00001'
			,GETDATE()
			,1
			,NULL
			,0
			,0
			,0
			,NULL
			,@ClaveMensaje
			)

		INSERT INTO CREDIHSolicitudWebHistoricoNip (
			IdSolicitudWebDatosPrimerGuardado
			,Celular
			,Nip
			,Fecha
			)
		VALUES (
			@idSolicitud
			,@telefono_celular
			,@nip
			,GETDATE()
			)
	END

	IF (@Op = 'SaveCelNip')
	BEGIN
		SET @nip = (
				SELECT FLOOR(RAND() * (999999 - 100000) + 100000)
				);

		SELECT @Importe = CASE 
				WHEN LEFT(Articulo, 4) = 'VALR'
					AND ISNULL(capital, 0) = 0
					THEN REPLACE(SUBSTRING(Descripcion1, 8, CHARINDEX('PE', Descripcion1) - 9), ' ', '')
				ELSE ISNULL(capital, 0)
				END
		FROM ERPMAVI.IntelisisTmp.dbo.art WITH (NOLOCK)
		WHERE articulo = @Articulo

		INSERT INTO CREDIDSolicitudWebDatosPrimerGuardado (
			Nombre
			,SegundoNombre
			,ApellidoPaterno
			,ApellidoMaterno
			,Celular
			,Articulo
			,UEN
			,Nip
			,Origen
			,Fecha
			,Importe
			)
		VALUES (
			@nombre
			,@nombre_2
			,@apellido_p
			,@apellido_m
			,@telefono_celular
			,@Articulo
			,@uen
			,@nip
			,@origen
			,GETDATE()
			,@Importe
			)

		SET @idSolicitud = SCOPE_IDENTITY();

		SELECT @idSolicitud AS idSolicitud

		--codigo de enviar sms 
		INSERT INTO TcAAea00030_EnvioMensajes (
			IdRegistro
			,IdMensaje
			,Cliente
			,FechaEnvio
			,EstatusEnvio
			,ClienteF
			,Tipo
			,IntentoRespuesta
			,IntentoEnvio
			,Modem
			,Clave
			)
		VALUES (
			@idSolicitud
			,14
			,'CW00001'
			,GETDATE()
			,1
			,NULL
			,0
			,0
			,0
			,NULL
			,@ClaveMensaje
			)

		INSERT INTO CREDIHSolicitudWebHistoricoNip (
			IdSolicitudWebDatosPrimerGuardado
			,Celular
			,Nip
			,Fecha
			)
		VALUES (
			@idSolicitud
			,@telefono_celular
			,@nip
			,GETDATE()
			)
	END

	IF (@Op = 'UpdateValNip')
	BEGIN
		UPDATE CREDIDSolicitudWebDatosPrimerGuardado
		WITH (ROWLOCK)

		SET Validacion = @validacion
			,FechaValidacion = GETDATE()
		WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud

		IF (
				(
					SELECT Validacion
					FROM CREDIDSolicitudWebDatosPrimerGuardado WITH (NOLOCK)
					WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud
					) = 1
				)
		BEGIN
			SELECT 1 AS validacion
		END
		ELSE
		BEGIN
			SELECT 0 AS validacion
		END
	END
END

=== Conteos verificados por operacion ===
- SaveFirstData: INSERT 12 columnas (:80-91) / 12 valores (:94-105). Cuadra.
- UpdateFirstData: 8 columnas SET (:118-125).
- UpdateFirstDom: 3 columnas SET (:134-136).
- SaveRef: UPDATE 5 columnas (:158-162); INSERT 7 columnas (:169-175) / 7 valores (:178-184). Cuadra.
- SaveNip: UPDATE 3 columnas (:194-202) + UPDATE 1 columna (:222); INSERT SMS 11 columnas (:227-237) / 11 valores (:240-250); INSERT historico 4/4 (:254-257 / :260-263). Cuadra.
- UpdateNumberCel: UPDATE 2 columnas (:326-327); INSERT SMS 11/11 (:332-342 / :345-355); INSERT historico 4/4 (:359-362 / :365-368). Cuadra.
- SaveCelNip: INSERT 11 columnas (:388-398) / 11 valores (:401-411). Cuadra. INSERT SMS 11/11 (:420-430 / :433-443); INSERT historico 4/4 (:447-450 / :453-456). Cuadra.
- SaveIdDatosTemp: 1 columna (:313). UpdateValNip: 2 columnas (:465-466).
- Los 3 INSERT a TcAAea00030_EnvioMensajes son identicos: IdRegistro=@idSolicitud, IdMensaje=14, Cliente='CW00001', FechaEnvio=GETDATE(), EstatusEnvio=1, ClienteF=NULL, Tipo=0, IntentoRespuesta=0, IntentoEnvio=0, Modem=NULL, Clave=@ClaveMensaje.
- NIP: `FLOOR(RAND() * (999999 - 100000) + 100000)` (:215, :320, :375) -> entero de 6 digitos en [100000, 999999]. En SaveNip solo se genera si `@nip = '' OR @nip = 0 OR @nip = '0' OR @nip IS NULL` (:208-211; @nip es INT, '' y '0' se comparan por conversion implicita a 0) y solo dentro de `IF (@validacion != 1)` (:205).
- Importe (SaveFirstData :50-77): solo se calcula si ISNULL(@Importe,0)=0; si @origen <> 'PRODUCTOS MX' lee art (linked server) con el CASE VALR/capital; si @origen = 'PRODUCTOS MX' lee MIN(p.Precio) de PropreListaDFinal JOIN VTASCCondicionesCredVtaLinea con CondicionWeb='12 meses', Condicion NOT LIKE '%CEL%', TiendaVirtual = 'Muebles America' si @uen=1 si no 'VIU', p.Articulo=@Articulo. Si @origen es NULL, `@origen <> 'PRODUCTOS MX'` es UNKNOWN y entra al ELSE (PropreListaDFinal). En SaveCelNip (:378-385) el CASE de art se ejecuta SIEMPRE, sin condicion sobre @Importe.

## tablas_tocadas

Ambos SPs viven en la base LOCAL `ServicioAndroid` (`USE [ServicioAndroid]` :1 en los dos archivos). Los objetos con prefijo `ERPMAVI.IntelisisTmp.dbo.` / `ERPMAVI.IntelisisTMP.dbo.` se leen por linked server ERPMAVI, base IntelisisTmp (la diferencia TMP/Tmp es solo de mayusculas, :178/:181 vs :187/:188/:198). Todo acceso a linked server es SOLO LECTURA (SELECT) en los dos SPs; todas las escrituras son en ServicioAndroid.

=== A) SP_CREDITO_WEB_DATOS.sql ===
objeto | base | operacion | rama | lineas
ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt | IntelisisTmp (linked ERPMAVI) | SELECT (Condicion, Codigo; MAX(IdCondicionArt)) WITH (NOLOCK) | Insert / @origen='DIMAS MX' | 178, 181
ERPMAVI.IntelisisTmp.dbo.TablaStD (alias tsdt) | IntelisisTmp (linked) | SELECT TOP 1 WITH (NOLOCK) (cols: Nombre, TablaSt) | Insert | 187
ERPMAVI.IntelisisTmp.dbo.CteTel (alias ct) | IntelisisTmp (linked) | INNER JOIN WITH (NOLOCK) (cols: AppOrigen, Cliente, ValidacionTel) | Insert | 188
ERPMAVI.IntelisisTmp.dbo.CteTel (alias ct) | IntelisisTmp (linked) | SELECT TOP 1 ORDER BY Fecha DESC WITH (NOLOCK) (cols: Lada, Telefono, Cliente, Tipo, ValidacionTel, Fecha) | Insert | 198
TcAAEA00030_EnvioMensajes | ServicioAndroid (local) | SELECT TOP 1 ORDER BY Id DESC WITH (NOLOCK) (cols: Telefono, Cliente, Id) | Insert | 206
CRED_SOLICITUD_WEB_DATOS_TEMP | ServicioAndroid (local) | INSERT (59 col) + SCOPE_IDENTITY() | Insert | 223-346
CRED_SOLICITUD_WEB_DATOS_TEMP | ServicioAndroid (local) | UPDATE WITH (ROWLOCK) (9 col) WHERE id = @Id | Update | 353-365
fnSplit(@apellido_m_ref, '~') | ServicioAndroid (local, funcion tabla; sin esquema explicito -> dbo) | SELECT COUNT(item) | InsertReferencia (discriminador) | 373-374
TrWACW00041_RefSolCredWeb | ServicioAndroid (local) | INSERT (8 col) + SCOPE_IDENTITY() | InsertReferencia / corto | 377-398
TEMPDB.SYS.SYSOBJECTS | tempdb (sistema) | SELECT (IF EXISTS) | InsertReferencia / largo | 416, 424
#Datos | tempdb (temporal de sesion) | DROP TABLE (condicional) | InsertReferencia / largo | 420
#DatosCampoValor | tempdb (temporal) | DROP TABLE (condicional) | InsertReferencia / largo | 428
#Datos | tempdb | CREATE TABLE (ID INT IDENTITY(1,1), Datos VARCHAR(max), Campo VARCHAR(max), TipoDato VARCHAR(1), Valor VARCHAR(max)) | largo | 431-437
#DatosCampoValor | tempdb | CREATE TABLE (ID INT IDENTITY(1,1), Dato VARCHAR(max)) | largo | 440-443
fnSplit(@apellido_m_ref, '|') | ServicioAndroid (local) | SELECT item | largo | 452-453
#Datos | tempdb | INSERT (Datos) | largo | 451
#Datos | tempdb | SELECT COUNT(*) | largo | 456-457
#Datos | tempdb | SELECT Datos WHERE ID = @Contador | largo / WHILE 1 | 475-477
fnSplit(@CampoValor, '~') | ServicioAndroid (local) | SELECT item | largo / WHILE 1 | 481-482
#DatosCampoValor | tempdb | INSERT (Dato) | largo / WHILE 1 | 480
#DatosCampoValor | tempdb | SELECT Dato WHERE Id = (@Contador*3)-2 / -1 / *3 | largo / WHILE 1 | 486-488, 492-494, 498-500
#Datos | tempdb | UPDATE Campo, TipoDato, Valor WHERE ID = @Contador | largo / WHILE 1 | 505-509
#Datos | tempdb | SELECT Campo, TipoDato, Valor WHERE ID = @Contador | largo / WHILE 2 | 519-523
TrWACW00041_RefSolCredWeb | ServicioAndroid (local) | INSERT (17 col) + SCOPE_IDENTITY() | InsertReferencia / largo | 560-599
TEMPDB.SYS.SYSOBJECTS | tempdb (sistema) | SELECT (IF EXISTS) | epilogo (siempre) | 610, 618
#Datos | tempdb | DROP TABLE (condicional) | epilogo | 614
#DatosCampoValor | tempdb | DROP TABLE (condicional) | epilogo | 622
Funciones del sistema usadas: GETDATE() :170; SCOPE_IDENTITY() :346, :398, :599; IIF/SUBSTRING :216; CONCAT :194; RTRIM/LTRIM :186, :188; ISNULL :336; CAST :543; OBJECT_ID :418, :426, :612, :620.

=== B) SpCREDISolicitudWebPrimerGuardado.sql ===
objeto | base | operacion | op | lineas
ERPMAVI.IntelisisTmp.dbo.art | IntelisisTmp (linked ERPMAVI) | SELECT WITH (NOLOCK) (cols: Articulo, capital, Descripcion1, articulo) | SaveFirstData (si ISNULL(@Importe,0)=0 y @origen <> 'PRODUCTOS MX') | 54-61
ERPMAVI.IntelisisTmp.dbo.PropreListaDFinal (alias p) | IntelisisTmp (linked) | SELECT MIN(p.Precio) WITH (NOLOCK) (cols: Precio, Condicion, Articulo) | SaveFirstData (ELSE = 'PRODUCTOS MX' o @origen NULL) | 65-66, 75
ERPMAVI.IntelisisTmp.dbo.VTASCCondicionesCredVtaLinea (alias c) | IntelisisTmp (linked) | JOIN WITH (NOLOCK) (cols: CondicionPropre, CondicionWeb, Condicion, TiendaVirtual) | SaveFirstData (ELSE) | 67-74
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid (local) | INSERT (12 col) + SCOPE_IDENTITY() | SaveFirstData | 79-108
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | UPDATE WITH (ROWLOCK) (8 col) WHERE IdSolicitudWebDatosPrimerGuardado = @idSolicitud | UpdateFirstData | 115-126
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | UPDATE WITH (ROWLOCK) (Delegacion, Poblacion, Estado) | UpdateFirstDom | 131-137
CREDIDRefPrimerGuardadoCredWeb | ServicioAndroid | SELECT (IF EXISTS) WITH (NOLOCK) WHERE IDSolicitudWebDatosPrimerGuardado = @idSolicitud AND NumReferencia = @uen | SaveRef | 148-153
CREDIDRefPrimerGuardadoCredWeb | ServicioAndroid | UPDATE WITH (ROWLOCK) (Nombre, ApellidoP, ApellidoM, TipoTel, Telefono) | SaveRef (existe) | 155-164
CREDIDRefPrimerGuardadoCredWeb | ServicioAndroid | INSERT (7 col) | SaveRef (no existe) | 168-185
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | UPDATE WITH (ROWLOCK) (Celular, Validacion, fechaValidacion) | SaveNip | 191-203
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | UPDATE WITH (ROWLOCK) (Nip) | SaveNip (@validacion != 1) | 219-223
TcAAea00030_EnvioMensajes | ServicioAndroid | INSERT (11 col) | SaveNip (@validacion != 1) | 226-251
CREDIHSolicitudWebHistoricoNip | ServicioAndroid | INSERT (4 col) | SaveNip (@validacion != 1) | 253-264
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | SELECT Nip WITH (NOLOCK) | ValNip | 270-274
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | SELECT Validacion WITH (NOLOCK) | ValidaNip | 290-294
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | UPDATE WITH (ROWLOCK) (IdSOLICITUD_WEB_DATOS_TEMP) | SaveIdDatosTemp | 310-314
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | UPDATE WITH (ROWLOCK) (Celular, Nip) | UpdateNumberCel | 323-328
TcAAea00030_EnvioMensajes | ServicioAndroid | INSERT (11 col) | UpdateNumberCel | 331-356
CREDIHSolicitudWebHistoricoNip | ServicioAndroid | INSERT (4 col) | UpdateNumberCel | 358-369
ERPMAVI.IntelisisTmp.dbo.art | IntelisisTmp (linked) | SELECT WITH (NOLOCK) (CASE VALR/capital) | SaveCelNip (siempre) | 378-385
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | INSERT (11 col) + SCOPE_IDENTITY() | SaveCelNip | 387-414
TcAAea00030_EnvioMensajes | ServicioAndroid | INSERT (11 col) | SaveCelNip | 419-444
CREDIHSolicitudWebHistoricoNip | ServicioAndroid | INSERT (4 col) | SaveCelNip | 446-457
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | UPDATE WITH (ROWLOCK) (Validacion, FechaValidacion) | UpdateValNip | 462-467
CREDIDSolicitudWebDatosPrimerGuardado | ServicioAndroid | SELECT Validacion WITH (NOLOCK) | UpdateValNip | 470-474
Funciones del sistema: GETDATE() :101, :199, :243, :263, :348, :368, :410, :437, :456, :466; SCOPE_IDENTITY() :108, :414; RAND()/FLOOR :215, :320, :375; LEFT/SUBSTRING/CHARINDEX/REPLACE :55-57, :379-381; ISNULL :50, :56, :58, :65, :380, :382; MIN :65.

=== C) Tabla compartida entre los dos SPs ===
TcAAEA00030_EnvioMensajes / TcAAea00030_EnvioMensajes (misma tabla, distinta capitalizacion): SP_CREDITO_WEB_DATOS la LEE (:205-208, columnas Telefono, Cliente, Id) y SpCREDISolicitudWebPrimerGuardado la ESCRIBE (:226, :331, :419). Nota factual: los INSERT del segundo SP escriben Cliente = 'CW00001' (literal) e IdRegistro = @idSolicitud, mientras que la lectura del primero filtra `WHERE Cliente = @cliente`.

=== D) Conexiones disponibles en el proyecto destino (Web.config, solo nombres) ===
- "MAVICBOSANDROID" -> server=mavicbosandroid.grupomavi.com; database=ServicioAndroid (Web.config:13). Es la base local de ambos SPs.
- "ADMINDOC" -> database=AdminDoc (Web.config:15). No la usan estos SPs.
- Cadena de conexion directa a ERPMAVI / IntelisisTmp en Web.config: NO EXISTE (solo las 2 anteriores). Las 6 lecturas por linked server (CREDICCondicionArt, TablaStD, CteTel x2, art x2, PropreListaDFinal, VTASCCondicionesCredVtaLinea) no tienen hoy una conexion propia en el proyecto; es una duda a resolver con el usuario, no una decision a asumir.

## fnsplit

NO EXISTE.

Busqueda realizada (solo lectura) en toda "//CATECINF214034/Compartida/Migracion SAP":
1. grep recursivo de "fnSplit" (insensible a mayusculas) sobre TODOS los archivos de cualquier extension, incluyendo .venv: 8 archivos coinciden y NINGUNO contiene una definicion (`CREATE FUNCTION` / `ALTER FUNCTION`); todos son consumidores o documentos que la mencionan.
2. grep de `CREATE FUNCTION ... fnSplit` sobre todos los *.sql del share (excluyendo .venv, node_modules, bin, obj, .vs): 0 coincidencias.
3. find de archivos cuyo nombre contenga "fnsplit": 0 resultados.
4. No se inspecciono el interior de ".agents.zip" (snapshot del 07-Ago del folder .agents; no se extrajo por ser solo lectura).
Conclusion: la fuente de fnSplit y de fnSplitV2 NO EXISTE en el corpus. Sigue siendo el bloqueo duro que ya senala FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md:290-291 y :514.

=== Consumidores encontrados (archivo:linea, texto exacto) ===
fnSplit:
- SPsOrden/SP_CREDITO_WEB_DATOS.sql:374  `FROM fnSplit(@apellido_m_ref, '~')`  (dentro de `SELECT COUNT(item)` :373)
- SPsOrden/SP_CREDITO_WEB_DATOS.sql:453  `FROM fnSplit(@apellido_m_ref, '|')`  (`SELECT item` :452)
- SPsOrden/SP_CREDITO_WEB_DATOS.sql:482  `FROM fnSplit(@CampoValor, '~')`  (`SELECT item` :481)
- SPsOrden/SP_CREDITO_WEB_DATOS.sql:445  (comentario) `-- Este insert se auxilia de la funcion fnSplit el cual recibe como parametro una cadena de texto`
- SPsOrden/SP_eCommerceexportaMA.sql:4749 y :4757  `FROM fnSplit(c.Linea, ' ')`  (contexto: `SELECT TOP 1 item ... ORDER BY 1 DESC`, :4748-4750 / :4756-4758)
- SPsOrden/SP_eCommerceexportaVIU.sql:5180 y :5188  `FROM fnSplit(c.Linea, ' ')`  (mismo contexto, :5179-5181 / :5187-5189)
- SPsOrden/SpVTASVentaCupon.sql:93  `FROM dbo.fnSplit(@Puestos, ',')`  (contexto :91-95: `IF EXISTS ( SELECT ID FROM dbo.fnSplit(@Puestos, ',') WHERE item = @Puesto )`)
fnSplitV2:
- SPsOrden/SpCREDICodigoRecomendador.sql:176  `FROM fnSplitV2(@search, '|')`  (contexto :173-176: `INSERT INTO CREDIDCodigoRecomendador (Codigo) SELECT item AS Codigo FROM fnSplitV2(@search, '|')`)
Documentos que la mencionan (no son fuente): MappingMetods/FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md:244, :269, :290-291, :514, :558; MappingMetods/GUIA_MIGRACION_FABLE.md:571; MappingMetods/_ANALISIS_PREVIO/BRIEFING-migracion-18-endpoints.md:442.
Proyecto C# destino (ServicioSAP/ServicioSap/ServicioSap): ninguna referencia a fnSplit ni port equivalente; los unicos `.Split(` existentes son MagentoCatalogMethods.cs:168 (`Split(',')`), CustomerServiceMethods.cs:179 (`Split(' ')`), OrderMethods.cs:1010 (`Split(',')`), sin relacion con este flujo.

=== Lo UNICO que se puede afirmar de fnSplit a partir de sus consumidores (sin inventar) ===
- Es una funcion con valor de tabla de 2 argumentos: (cadena, delimitador de 1 caracter). Delimitadores observados: '~', '|', ' ', ','.
- Expone al menos las columnas `item` (SP_CREDITO_WEB_DATOS:373/452/481, exportaMA/VIU, VentaCupon:94, CodigoRecomendador:175 para V2) e `ID` (SpVTASVentaCupon.sql:92 `SELECT ID FROM dbo.fnSplit(...)`).
- Reside en el esquema dbo de ServicioAndroid (SpVTASVentaCupon la califica como `dbo.fnSplit`; SP_CREDITO_WEB_DATOS la invoca sin esquema desde `USE [ServicioAndroid]`).
- DESCONOCIDO (no inferible del corpus): si devuelve fila para tokens vacios / delimitadores consecutivos, si recorta espacios, si devuelve 0 o 1 filas para NULL o cadena vacia, si el orden de `item` coincide con `ID`, y en que difiere fnSplitV2 de fnSplit. De esto depende el discriminador :372-375 (COUNT = 1) y la aritmetica de indices :488/:494/:500.

## epilogo_verbatim

SP_CREDITO_WEB_DATOS.sql:603-623 VERBATIM:

	END --FIN DE LA OPCION -> InsertReferencia

	-- ========================================================================================================================================
	-- DESTRUCCION DE TABLAS TEMPORALES
	-- ========================================================================================================================================  
	IF EXISTS (
			SELECT NAME
			FROM TEMPDB.SYS.SYSOBJECTS
			WHERE TYPE = 'U'
				AND ID = OBJECT_ID('Tempdb.dbo.#Datos')
			)
		DROP TABLE #Datos

	IF EXISTS (
			SELECT NAME
			FROM TEMPDB.SYS.SYSOBJECTS
			WHERE TYPE = 'U'
				AND ID = OBJECT_ID('Tempdb.dbo.#DatosCampoValor')
			)
		DROP TABLE #DatosCampoValor
END

(La ultima linea `END` (:623) no lleva salto de linea final en el archivo.)

=== SET / RETURN fuera de las ramas ===
- Antes de las ramas (:168 y :170), unicos SET/SELECT de asignacion fuera de un IF:
	SELECT @IdSolicitud = 0

	SELECT @fecha = GETDATE()
- RETURN: NO EXISTE en todo el SP (ninguna sentencia RETURN en las 623 lineas). Tampoco existe SET NOCOUNT ON, BEGIN TRAN/COMMIT/ROLLBACK, TRY/CATCH ni RAISERROR/THROW.
- Despues de las ramas solo esta el epilogo :608-622 (dos DROP TABLE condicionales que se ejecutan SIEMPRE, sea cual sea @Op). No hay SELECT final: si @Op no coincide con 'Insert', 'Update' ni 'InsertReferencia', el SP termina sin devolver ningun result set.
- Las 3 ramas son IF independientes (no ELSE IF); como las literales son mutuamente excluyentes, a lo sumo una se ejecuta por llamada.

=== Resumen de conteos reportados (todos cuadran) ===
SP_CREDITO_WEB_DATOS: 66 parametros (:92-159) | INSERT 59 columnas (:224-282) = 59 valores (:285-343) | UPDATE 9 columnas (:356-364) | INSERT referencia corto 8 col (:378-385) = 8 val (:388-395) | INSERT referencia largo 17 col (:561-577) = 17 val (:580-596) | 9 variables Aux (:404-412) | 623 lineas.
SpCREDISolicitudWebPrimerGuardado: 17 parametros (:29-45) | 11 operaciones (:48, :113, :129, :140, :189, :268, :288, :308, :317, :372, :460) | 483 lineas.
Ninguna discrepancia encontrada entre lo pedido y lo contado.