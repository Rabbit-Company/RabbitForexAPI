import pkg from "../package.json";

export const openapi = {
	openapi: "3.1.1",
	info: {
		title: "RabbitForexAPI",
		description: "Foreign exchange (Forex), precious metals, stocks and cryptocurrency API with historical data",
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
	servers: [{ url: "https://forex.rabbitmonitor.com" }],
	tags: [
		{ name: "Health", description: "Health check and statistics endpoints" },
		{ name: "Rates", description: "Live currency exchange rates" },
		{ name: "Metals", description: "Live precious metals prices" },
		{ name: "Crypto", description: "Live cryptocurrency prices" },
		{ name: "Stocks", description: "Live stock prices" },
		{ name: "Assets", description: "Supported assets information" },
		{ name: "History", description: "Historical price data" },
	],
	paths: {
		"/": {
			get: {
				tags: ["Health"],
				summary: "Health check and statistics",
				operationId: "getHealth",
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } } } },
			},
		},
		"/v1/assets": {
			get: {
				tags: ["Assets"],
				summary: "Get all supported assets",
				operationId: "getAssets",
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AssetsResponse" } } } } },
			},
		},
		// Currency endpoints
		"/v1/rates": {
			get: {
				tags: ["Rates"],
				summary: "Get currency rates with USD as base",
				operationId: "getAllRates",
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RatesResponse" } } } } },
			},
		},
		"/v1/rates/{base}": {
			get: {
				tags: ["Rates"],
				summary: "Get currency rates with specified base",
				operationId: "getRatesByBase",
				parameters: [{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } }],
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RatesResponse" } } } } },
			},
		},
		"/v1/rates/history/{symbol}": {
			get: {
				tags: ["History"],
				summary: "Get currency raw history (last 24 hours)",
				description: "Returns all raw price data points from the last 24 hours",
				operationId: "getCurrencyRawHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "EUR" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RawHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/rates/history/{symbol}/hourly": {
			get: {
				tags: ["History"],
				summary: "Get currency hourly history (last 90 days)",
				description: "Returns hourly aggregated price data from the last 90 days",
				operationId: "getCurrencyHourlyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "EUR" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/rates/history/{symbol}/daily": {
			get: {
				tags: ["History"],
				summary: "Get currency daily history (all time)",
				description: "Returns daily aggregated price data from all available history",
				operationId: "getCurrencyDailyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "EUR" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		// Metal endpoints
		"/v1/metals/rates": {
			get: {
				tags: ["Metals"],
				summary: "Get metal rates with USD as base",
				operationId: "getAllMetalRates",
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/MetalRatesResponse" } } } } },
			},
		},
		"/v1/metals/rates/{base}": {
			get: {
				tags: ["Metals"],
				summary: "Get metal rates with specified base",
				operationId: "getMetalRatesByBase",
				parameters: [{ name: "base", in: "path", required: true, schema: { type: "string", example: "GOLD" } }],
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/MetalRatesResponse" } } } } },
			},
		},
		"/v1/metals/history/{symbol}": {
			get: {
				tags: ["History"],
				summary: "Get metal raw history (last 24 hours)",
				operationId: "getMetalRawHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "GOLD" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RawHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/metals/history/{symbol}/hourly": {
			get: {
				tags: ["History"],
				summary: "Get metal hourly history (last 90 days)",
				operationId: "getMetalHourlyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "GOLD" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/metals/history/{symbol}/daily": {
			get: {
				tags: ["History"],
				summary: "Get metal daily history (all time)",
				operationId: "getMetalDailyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "GOLD" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/metals/history/{symbol}/currency/{base}": {
			get: {
				tags: ["History"],
				summary: "Get metal raw history in specified currency (last 24 hours)",
				description: "Returns raw price data converted to the specified currency using historical exchange rates",
				operationId: "getMetalRawHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "GOLD" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RawHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/metals/history/{symbol}/currency/{base}/hourly": {
			get: {
				tags: ["History"],
				summary: "Get metal hourly history in specified currency (last 90 days)",
				description: "Returns hourly aggregated price data converted to the specified currency using historical exchange rates",
				operationId: "getMetalHourlyHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "GOLD" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/metals/history/{symbol}/currency/{base}/daily": {
			get: {
				tags: ["History"],
				summary: "Get metal daily history in specified currency (all time)",
				description: "Returns daily aggregated price data converted to the specified currency using historical exchange rates",
				operationId: "getMetalDailyHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "GOLD" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		// Crypto endpoints
		"/v1/crypto/rates": {
			get: {
				tags: ["Crypto"],
				summary: "Get crypto rates with USD as base",
				operationId: "getAllCryptoRates",
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/CryptoRatesResponse" } } } } },
			},
		},
		"/v1/crypto/rates/{base}": {
			get: {
				tags: ["Crypto"],
				summary: "Get crypto rates with specified base",
				operationId: "getCryptoRatesByBase",
				parameters: [{ name: "base", in: "path", required: true, schema: { type: "string", example: "BTC" } }],
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/CryptoRatesResponse" } } } } },
			},
		},
		"/v1/crypto/history/{symbol}": {
			get: {
				tags: ["History"],
				summary: "Get crypto raw history (last 24 hours)",
				operationId: "getCryptoRawHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "BTC" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RawHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/crypto/history/{symbol}/hourly": {
			get: {
				tags: ["History"],
				summary: "Get crypto hourly history (last 90 days)",
				operationId: "getCryptoHourlyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "BTC" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/crypto/history/{symbol}/daily": {
			get: {
				tags: ["History"],
				summary: "Get crypto daily history (all time)",
				operationId: "getCryptoDailyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "BTC" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/crypto/history/{symbol}/currency/{base}": {
			get: {
				tags: ["History"],
				summary: "Get crypto raw history in specified currency (last 24 hours)",
				description: "Returns raw price data converted to the specified currency using historical exchange rates",
				operationId: "getCryptoRawHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "BTC" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RawHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/crypto/history/{symbol}/currency/{base}/hourly": {
			get: {
				tags: ["History"],
				summary: "Get crypto hourly history in specified currency (last 90 days)",
				description: "Returns hourly aggregated price data converted to the specified currency using historical exchange rates",
				operationId: "getCryptoHourlyHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "BTC" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/crypto/history/{symbol}/currency/{base}/daily": {
			get: {
				tags: ["History"],
				summary: "Get crypto daily history in specified currency (all time)",
				description: "Returns daily aggregated price data converted to the specified currency using historical exchange rates",
				operationId: "getCryptoDailyHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "BTC" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		// Stock endpoints
		"/v1/stocks/rates": {
			get: {
				tags: ["Stocks"],
				summary: "Get stock rates with USD as base",
				operationId: "getAllStockRates",
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StockRatesResponse" } } } } },
			},
		},
		"/v1/stocks/rates/{base}": {
			get: {
				tags: ["Stocks"],
				summary: "Get stock rates with specified base",
				operationId: "getStockRatesByBase",
				parameters: [{ name: "base", in: "path", required: true, schema: { type: "string", example: "MSFT" } }],
				responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/StockRatesResponse" } } } } },
			},
		},
		"/v1/stocks/history/{symbol}": {
			get: {
				tags: ["History"],
				summary: "Get stock raw history (last 24 hours)",
				operationId: "getStockRawHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "MSFT" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RawHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/stocks/history/{symbol}/hourly": {
			get: {
				tags: ["History"],
				summary: "Get stock hourly history (last 90 days)",
				operationId: "getStockHourlyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "MSFT" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/stocks/history/{symbol}/daily": {
			get: {
				tags: ["History"],
				summary: "Get stock daily history (all time)",
				operationId: "getStockDailyHistory",
				parameters: [{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "MSFT" } }],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/stocks/history/{symbol}/currency/{base}": {
			get: {
				tags: ["History"],
				summary: "Get stock raw history in specified currency (last 24 hours)",
				description: "Returns raw price data converted to the specified currency using historical exchange rates",
				operationId: "getStockRawHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "MSFT" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/RawHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/stocks/history/{symbol}/currency/{base}/hourly": {
			get: {
				tags: ["History"],
				summary: "Get stock hourly history in specified currency (last 90 days)",
				description: "Returns hourly aggregated price data converted to the specified currency using historical exchange rates",
				operationId: "getStockHourlyHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "MSFT" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
		"/v1/stocks/history/{symbol}/currency/{base}/daily": {
			get: {
				tags: ["History"],
				summary: "Get stock daily history in specified currency (all time)",
				description: "Returns daily aggregated price data converted to the specified currency using historical exchange rates",
				operationId: "getStockDailyHistoryInCurrency",
				parameters: [
					{ name: "symbol", in: "path", required: true, schema: { type: "string", example: "MSFT" } },
					{ name: "base", in: "path", required: true, schema: { type: "string", example: "EUR" } },
				],
				responses: {
					"200": { content: { "application/json": { schema: { $ref: "#/components/schemas/AggregatedHistoryResponse" } } } },
					"503": { content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
				},
			},
		},
	},
	components: {
		schemas: {
			HealthResponse: {
				type: "object",
				properties: {
					program: { type: "string", example: "RabbitForexAPI" },
					version: { type: "string", example: pkg.version },
					sourceCode: { type: "string" },
					monitorStats: {
						type: "object",
						properties: {
							currencyCount: { type: "integer", example: 162 },
							metalCount: { type: "integer", example: 4 },
							cryptoCount: { type: "integer", example: 2500 },
							stockCount: { type: "integer", example: 25 },
							totalAssetCount: { type: "integer", example: 2691 },
							updateInterval: { type: "string", example: "30s" },
							historyEnabled: { type: "boolean", example: true },
						},
					},
					httpStats: { type: "object", properties: { pendingRequests: { type: "integer" } } },
					lastUpdate: { type: "string", format: "date-time" },
				},
			},
			AssetsResponse: {
				type: "object",
				properties: {
					currencies: { type: "array", items: { type: "string" }, example: ["USD", "EUR", "GBP"] },
					metals: { type: "array", items: { type: "string" }, example: ["GOLD", "SILVER"] },
					cryptocurrencies: { type: "array", items: { type: "string" }, example: ["BTC", "ETH"] },
					stocks: { type: "array", items: { type: "string" }, example: ["MSFT", "AAPL"] },
					timestamps: {
						type: "object",
						properties: {
							currency: { type: "string", format: "date-time", nullable: true },
							metal: { type: "string", format: "date-time", nullable: true },
							crypto: { type: "string", format: "date-time", nullable: true },
							stock: { type: "string", format: "date-time", nullable: true },
						},
					},
				},
			},
			RatesResponse: {
				type: "object",
				properties: {
					base: { type: "string", example: "USD" },
					rates: { type: "object", additionalProperties: { type: "number" }, example: { EUR: 0.92, GBP: 0.79 } },
					timestamps: { type: "object", properties: { currency: { type: "string", format: "date-time", nullable: true } } },
				},
			},
			MetalRatesResponse: {
				type: "object",
				properties: {
					base: { type: "string", example: "USD" },
					rates: { type: "object", additionalProperties: { type: "number" } },
					timestamps: {
						type: "object",
						properties: {
							currency: { type: "string", format: "date-time", nullable: true },
							metal: { type: "string", format: "date-time", nullable: true },
						},
					},
				},
			},
			CryptoRatesResponse: {
				type: "object",
				properties: {
					base: { type: "string", example: "USD" },
					rates: { type: "object", additionalProperties: { type: "number" } },
					timestamps: {
						type: "object",
						properties: {
							currency: { type: "string", format: "date-time", nullable: true },
							crypto: { type: "string", format: "date-time", nullable: true },
						},
					},
				},
			},
			StockRatesResponse: {
				type: "object",
				properties: {
					base: { type: "string", example: "USD" },
					rates: { type: "object", additionalProperties: { type: "number" } },
					timestamps: {
						type: "object",
						properties: {
							currency: { type: "string", format: "date-time", nullable: true },
							stock: { type: "string", format: "date-time", nullable: true },
						},
					},
				},
			},
			RawHistoryResponse: {
				type: "object",
				properties: {
					symbol: { type: "string", example: "BTC" },
					base: { type: "string", example: "USD" },
					resolution: { type: "string", enum: ["raw"], example: "raw" },
					data: {
						type: "array",
						items: {
							type: "object",
							properties: {
								timestamp: { type: "string", format: "date-time" },
								price: { type: "number", example: 97500.1234 },
							},
						},
					},
				},
			},
			AggregatedHistoryResponse: {
				type: "object",
				properties: {
					symbol: { type: "string", example: "BTC" },
					base: { type: "string", example: "USD" },
					resolution: { type: "string", enum: ["hourly", "daily"], example: "hourly" },
					data: {
						type: "array",
						items: {
							type: "object",
							properties: {
								timestamp: { type: "string", example: "2024-01-15T12:00:00Z" },
								avg: { type: "number", example: 97500 },
								min: { type: "number", example: 96000 },
								max: { type: "number", example: 99000 },
								open: { type: "number", example: 96500 },
								close: { type: "number", example: 98000 },
								sampleCount: { type: "integer", example: 120 },
							},
						},
					},
				},
			},
			ErrorResponse: {
				type: "object",
				properties: {
					error: { type: "string", example: "History service is not enabled" },
				},
			},
		},
	},
};
