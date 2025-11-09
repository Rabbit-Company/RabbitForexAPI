import pkg from "../package.json";

export const openapi = {
	openapi: "3.1.1",
	info: {
		title: "RabbitForexAPI",
		description: "Foreign exchange (Forex), precious metals, stocks and cryptocurrency API",
		version: pkg.version,
		contact: {
			name: "Rabbit Company",
			url: "https://rabbit-company.com/contact",
			email: "info@rabbit-company.com",
		},
		license: {
			name: "GPL-3.0-only",
			url: "https://github.com/Rabbit-Company/RabbitForexAPI/blob/main/LICENSE",
		},
	},
	servers: [
		{
			url: "https://forex.rabbitmonitor.com",
		},
	],
	tags: [
		{
			name: "Health",
			description: "Health check and statistics endpoints",
		},
		{
			name: "Rates",
			description: "Exchange rates endpoints",
		},
		{
			name: "Metals",
			description: "Precious metals prices and exchange rates endpoints",
		},
		{
			name: "Crypto",
			description: "Cryptocurrency exchange rates endpoints",
		},
		{
			name: "Stocks",
			description: "Stock prices and exchange rates endpoints",
		},
		{
			name: "Assets",
			description: "Supported currencies, metals, stocks and cryptocurrencies information",
		},
	],
	paths: {
		"/": {
			get: {
				tags: ["Health"],
				summary: "Health check and statistics",
				description: "Returns health status and API statistics",
				operationId: "getHealth",
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/HealthResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/rates": {
			get: {
				tags: ["Rates"],
				summary: "Get all exchange rates with USD as base",
				description: "Returns all exchange rates with USD as the base currency",
				operationId: "getAllRates",
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/RatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/rates/{asset}": {
			get: {
				tags: ["Rates"],
				summary: "Get all exchange rates with specified asset as base",
				description: "Returns all exchange rates with the specified currency or metal as base",
				operationId: "getRatesByAsset",
				parameters: [
					{
						name: "asset",
						in: "path",
						required: true,
						description: "Currency code (e.g., USD, EUR, JPY) or metal code (e.g., GOLD, SILVER)",
						schema: {
							type: "string",
							example: "EUR",
						},
					},
				],
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/RatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/metals/rates": {
			get: {
				tags: ["Metals"],
				summary: "Get all metal rates with USD as base",
				description: "Returns all metal exchange rates with USD as the base currency",
				operationId: "getAllMetalRates",
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/MetalRatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/metals/rates/{asset}": {
			get: {
				tags: ["Metals"],
				summary: "Get all metal rates with specified asset as base",
				description: "Returns all metal exchange rates with the specified currency or metal as base",
				operationId: "getMetalRatesByAsset",
				parameters: [
					{
						name: "asset",
						in: "path",
						required: true,
						description: "Currency code (e.g., USD, EUR, JPY) or metal code (e.g., GOLD, SILVER)",
						schema: {
							type: "string",
							example: "GOLD",
						},
					},
				],
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/MetalRatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/crypto/rates": {
			get: {
				tags: ["Crypto"],
				summary: "Get all cryptocurrency rates with USD as base",
				description: "Returns all cryptocurrency exchange rates with USD as the base currency",
				operationId: "getAllCryptoRates",
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/CryptoRatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/crypto/rates/{asset}": {
			get: {
				tags: ["Crypto"],
				summary: "Get all cryptocurrency rates with specified asset as base",
				description: "Returns all cryptocurrency exchange rates with the specified currency or cryptocurrency as base",
				operationId: "getCryptoRatesByAsset",
				parameters: [
					{
						name: "asset",
						in: "path",
						required: true,
						description: "Currency code (e.g., USD, EUR) or cryptocurrency code (e.g., BTC, ETH)",
						schema: {
							type: "string",
							example: "EUR",
						},
					},
				],
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/CryptoRatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/stocks/rates": {
			get: {
				tags: ["Stocks"],
				summary: "Get all stock rates with USD as base",
				description: "Returns all stock exchange rates with USD as the base currency",
				operationId: "getAllStockRates",
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/StockRatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/stocks/rates/{asset}": {
			get: {
				tags: ["Stocks"],
				summary: "Get all stock rates with specified asset as base",
				description: "Returns all stock exchange rates with the specified currency or stock as base",
				operationId: "getStockRatesByAsset",
				parameters: [
					{
						name: "asset",
						in: "path",
						required: true,
						description: "Currency code (e.g., USD, EUR) or stock symbol (e.g., MSFT, NET)",
						schema: {
							type: "string",
							example: "EUR",
						},
					},
				],
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/StockRatesResponse",
								},
							},
						},
					},
				},
			},
		},
		"/v1/assets": {
			get: {
				tags: ["Assets"],
				summary: "Get lists of all supported currencies, metals, stocks and cryptocurrencies",
				description: "Returns all supported currency, metal, stock, and cryptocurrency codes",
				operationId: "getAssets",
				responses: {
					"200": {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/AssetsResponse",
								},
							},
						},
					},
				},
			},
		},
	},
	components: {
		schemas: {
			HealthResponse: {
				type: "object",
				properties: {
					program: {
						type: "string",
						example: "RabbitForexAPI",
					},
					version: {
						type: "string",
						example: pkg.version,
					},
					sourceCode: {
						type: "string",
						example: "https://github.com/Rabbit-Company/RabbitForexAPI",
					},
					monitorStats: {
						$ref: "#/components/schemas/MonitorStats",
					},
					httpStats: {
						$ref: "#/components/schemas/HttpStats",
					},
					lastUpdate: {
						type: "string",
						format: "date-time",
						example: "2025-11-07T07:07:54.995Z",
					},
				},
				required: ["program", "version", "sourceCode", "monitorStats", "httpStats", "lastUpdate"],
			},
			MonitorStats: {
				type: "object",
				properties: {
					currencyCount: {
						type: "integer",
						example: 162,
					},
					metalCount: {
						type: "integer",
						example: 4,
					},
					cryptoCount: {
						type: "integer",
						example: 2885,
					},
					stockCount: {
						type: "integer",
						example: 23,
					},
					totalAssetCount: {
						type: "integer",
						example: 3075,
					},
					updateInterval: {
						type: "string",
						example: "60s",
					},
				},
				required: ["currencyCount", "metalCount", "cryptoCount", "stockCount", "totalAssetCount", "updateInterval"],
			},
			HttpStats: {
				type: "object",
				properties: {
					pendingRequests: {
						type: "integer",
						example: 1,
					},
				},
				required: ["pendingRequests"],
			},
			RatesResponse: {
				type: "object",
				properties: {
					base: {
						type: "string",
						description: "Base currency or metal code",
						example: "USD",
					},
					rates: {
						type: "object",
						additionalProperties: {
							type: "number",
						},
						description: "Exchange rates from base to target assets",
						example: {
							USD: 1,
							EUR: 0.86702,
							JPY: 153.4793,
							GBP: 0.7624,
							CHF: 0.80776,
						},
					},
					timestamps: {
						$ref: "#/components/schemas/CurrencyTimestamps",
					},
				},
				required: ["base", "rates", "timestamps"],
			},
			MetalRatesResponse: {
				type: "object",
				properties: {
					base: {
						type: "string",
						description: "Base currency or metal code",
						example: "USD",
					},
					rates: {
						type: "object",
						additionalProperties: {
							type: "number",
						},
						description: "Metal exchange rates from base to target assets",
						example: {
							GOLD: 0.0077614,
							SILVER: 0.63833,
							PLATINUM: 0.020007,
							COPPER: 93.4827,
						},
					},
					timestamps: {
						$ref: "#/components/schemas/MetalTimestamps",
					},
				},
				required: ["base", "rates", "timestamps"],
			},
			CryptoRatesResponse: {
				type: "object",
				properties: {
					base: {
						type: "string",
						description: "Base currency, metal, or cryptocurrency code",
						example: "USD",
					},
					rates: {
						type: "object",
						additionalProperties: {
							type: "number",
						},
						description: "Cryptocurrency exchange rates from base to target assets",
						example: {
							BTC: 0.0000098082,
							ETH: 0.00029232,
							SOL: 0.0062949,
							ADA: 1.7876,
							XRP: 0.4379,
							DOT: 0.32144,
						},
					},
					timestamps: {
						$ref: "#/components/schemas/CryptoTimestamps",
					},
				},
				required: ["base", "rates", "timestamps"],
			},
			StockRatesResponse: {
				type: "object",
				properties: {
					base: {
						type: "string",
						description: "Base currency or stock symbol",
						example: "USD",
					},
					rates: {
						type: "object",
						additionalProperties: {
							type: "number",
						},
						description: "Stock exchange rates from base to target assets",
						example: {
							VOW3d: 0.01227,
							NET: 0.004275,
							MSFT: 0.0020088,
							ASMLa: 0.0013276,
							V: 0.0029717,
							UBNT: 0.0016181,
						},
					},
					timestamps: {
						$ref: "#/components/schemas/StockTimestamps",
					},
				},
				required: ["base", "rates", "timestamps"],
			},
			AssetsResponse: {
				type: "object",
				properties: {
					currencies: {
						type: "array",
						items: {
							type: "string",
						},
						description: "List of supported currency codes",
						example: ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "EUR", "USD", "GBP", "JPY", "CHF", "CAD"],
					},
					metals: {
						type: "array",
						items: {
							type: "string",
						},
						description: "List of supported metal codes",
						example: ["GOLD", "SILVER", "PALLADIUM", "COPPER"],
					},
					cryptocurrencies: {
						type: "array",
						items: {
							type: "string",
						},
						description: "List of supported cryptocurrency codes",
						example: ["BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "DOGE", "AVAX", "LINK"],
					},
					stocks: {
						type: "array",
						items: {
							type: "string",
						},
						description: "List of supported stock symbols",
						example: ["VOW3d", "NET", "MSFT", "ASMLa", "V", "UBNT", "SMSDl", "FB"],
					},
					timestamps: {
						$ref: "#/components/schemas/AssetTimestamps",
					},
				},
				required: ["currencies", "metals", "cryptocurrencies", "stocks", "timestamps"],
			},
			CurrencyTimestamps: {
				type: "object",
				properties: {
					currency: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last currency data update timestamp",
						example: "2025-11-07T07:06:10.544Z",
					},
				},
				required: ["currency"],
			},
			MetalTimestamps: {
				type: "object",
				properties: {
					currency: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last currency data update timestamp",
						example: "2025-11-07T07:06:10.544Z",
					},
					metal: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last metal data update timestamp",
						example: "2025-11-07T07:06:07.016Z",
					},
				},
				required: ["currency", "metal"],
			},
			CryptoTimestamps: {
				type: "object",
				properties: {
					currency: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last currency data update timestamp",
						example: "2025-11-07T07:06:10.544Z",
					},
					crypto: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last cryptocurrency data update timestamp",
						example: "2025-11-07T07:06:05.123Z",
					},
				},
				required: ["currency", "crypto"],
			},
			StockTimestamps: {
				type: "object",
				properties: {
					currency: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last currency data update timestamp",
						example: "2025-11-07T07:06:10.544Z",
					},
					stock: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last stock data update timestamp",
						example: "2025-11-07T07:06:05.123Z",
					},
				},
				required: ["currency", "stock"],
			},
			AssetTimestamps: {
				type: "object",
				properties: {
					currency: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last currency data update timestamp",
						example: "2025-11-07T07:06:10.544Z",
					},
					metal: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last metal data update timestamp",
						example: "2025-11-07T07:06:07.016Z",
					},
					crypto: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last cryptocurrency data update timestamp",
						example: "2025-11-07T07:06:05.123Z",
					},
					stock: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last stock data update timestamp",
						example: "2025-11-07T07:06:05.123Z",
					},
				},
				required: ["currency", "metal", "crypto", "stock"],
			},
		},
		responses: {},
		parameters: {
			AssetParameter: {
				name: "asset",
				in: "path",
				required: true,
				description: "Currency or metal code",
				schema: {
					type: "string",
					example: "EUR",
				},
			},
			CryptoAssetParameter: {
				name: "asset",
				in: "path",
				required: true,
				description: "Currency, metal, or cryptocurrency code",
				schema: {
					type: "string",
					example: "BTC",
				},
			},
			StockAssetParameter: {
				name: "asset",
				in: "path",
				required: true,
				description: "Currency or stock symbol",
				schema: {
					type: "string",
					example: "MSFT",
				},
			},
		},
		examples: {
			USDBaseRates: {
				summary: "USD base rates example",
				value: {
					base: "USD",
					rates: {
						USD: 1,
						EUR: 0.86702,
						JPY: 153.4793,
						GBP: 0.7624,
						CHF: 0.80776,
					},
					timestamps: {
						currency: "2025-11-07T07:06:10.544Z",
					},
				},
			},
			GoldBaseRates: {
				summary: "Gold base rates example",
				value: {
					base: "GOLD",
					rates: {
						USD: 128.8432,
						EUR: 111.7092,
						JPY: 19774.7612,
						GBP: 98.2304,
						GOLD: 1,
						SILVER: 82.2438,
						PLATINUM: 2.5778,
					},
					timestamps: {
						currency: "2025-11-07T07:06:10.544Z",
						metal: "2025-11-07T07:06:07.016Z",
					},
				},
			},
			USDCryptoRates: {
				summary: "USD base cryptocurrency rates example",
				value: {
					base: "USD",
					rates: {
						USD: 1,
						EUR: 0.86702,
						BTC: 0.000015,
						ETH: 0.00023,
						SOL: 0.0056,
						ADA: 1.2345,
						XRP: 2.5678,
						DOT: 0.089,
					},
					timestamps: {
						currency: "2025-11-07T07:06:10.544Z",
						crypto: "2025-11-07T07:06:05.123Z",
					},
				},
			},
			USDStockRates: {
				summary: "USD base stock rates example",
				value: {
					base: "USD",
					rates: {
						VOW3d: 0.01227,
						NET: 0.004275,
						MSFT: 0.0020088,
						ASMLa: 0.0013276,
						V: 0.0029717,
						UBNT: 0.0016181,
					},
					timestamps: {
						currency: "2025-11-07T07:06:10.544Z",
						stock: "2025-11-07T07:06:05.123Z",
					},
				},
			},
			BTCCryptoRates: {
				summary: "BTC base cryptocurrency rates example",
				value: {
					base: "BTC",
					rates: {
						USD: 65000,
						EUR: 56355,
						BTC: 1,
						ETH: 15.333,
						SOL: 373.333,
						ADA: 82233.333,
					},
					timestamps: {
						currency: "2025-11-07T07:06:10.544Z",
						crypto: "2025-11-07T07:06:05.123Z",
					},
				},
			},
			NETStockRates: {
				summary: "NET base stock rates example",
				value: {
					base: "NET",
					rates: {
						USD: 233.92,
						EUR: 202.75,
						NET: 1,
						MSFT: 0.47,
						V: 0.695,
					},
					timestamps: {
						currency: "2025-11-07T07:06:10.544Z",
						stock: "2025-11-07T07:06:05.123Z",
					},
				},
			},
			AssetsList: {
				summary: "Supported assets example",
				value: {
					currencies: ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "EUR", "USD", "GBP", "JPY", "CHF", "CAD"],
					metals: ["GOLD", "SILVER", "PALLADIUM", "COPPER"],
					cryptocurrencies: ["BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "DOGE", "AVAX", "LINK"],
					stocks: ["VOW3d", "NET", "MSFT", "ASMLa", "V", "UBNT", "SMSDl", "FB"],
					timestamps: {
						currency: "2025-11-07T07:06:10.544Z",
						metal: "2025-11-07T07:06:07.016Z",
						crypto: "2025-11-07T07:06:05.123Z",
						stock: "2025-11-07T07:06:05.123Z",
					},
				},
			},
		},
	},
};
