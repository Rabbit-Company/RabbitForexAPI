import pkg from "../package.json";

export const openapi = {
	openapi: "3.1.1",
	info: {
		title: "RabbitForexAPI",
		description: "Foreign exchange (Forex) and precious metals API",
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
			description: "Exchange rates and metal prices endpoints",
		},
		{
			name: "Assets",
			description: "Supported currencies and metals information",
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
		"/v1/assets": {
			get: {
				tags: ["Assets"],
				summary: "Get lists of all supported currencies and metals",
				description: "Returns all supported currency and metal codes",
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
						example: "2.0.0",
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
						example: 174,
					},
					metalCount: {
						type: "integer",
						example: 9,
					},
					totalAssetCount: {
						type: "integer",
						example: 183,
					},
					updateInterval: {
						type: "string",
						example: "60s",
					},
				},
				required: ["currencyCount", "metalCount", "totalAssetCount", "updateInterval"],
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
							GOLD: 0.0077614,
							SILVER: 0.63833,
							PLATINUM: 0.020007,
						},
					},
					timestamps: {
						$ref: "#/components/schemas/Timestamps",
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
						example: ["ALUMINUM", "COPPER", "GOLD", "LEAD", "NICKEL", "PALLADIUM", "PLATINUM", "SILVER", "ZINC"],
					},
					timestamps: {
						$ref: "#/components/schemas/Timestamps",
					},
				},
				required: ["currencies", "metals", "timestamps"],
			},
			Timestamps: {
				type: "object",
				properties: {
					metal: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last metal data update timestamp",
						example: "2025-11-07T07:06:07.016Z",
					},
					currency: {
						type: "string",
						format: "date-time",
						nullable: true,
						description: "Last currency data update timestamp",
						example: "2025-11-07T07:06:10.544Z",
					},
				},
				required: ["metal", "currency"],
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
						GOLD: 0.0077614,
						SILVER: 0.63833,
						PLATINUM: 0.020007,
					},
					timestamps: {
						metal: "2025-11-07T07:06:07.016Z",
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
						metal: "2025-11-07T07:06:07.016Z",
						currency: "2025-11-07T07:06:10.544Z",
					},
				},
			},
			AssetsList: {
				summary: "Supported assets example",
				value: {
					currencies: ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "EUR", "USD", "GBP", "JPY", "CHF", "CAD"],
					metals: ["ALUMINUM", "COPPER", "GOLD", "LEAD", "NICKEL", "PALLADIUM", "PLATINUM", "SILVER", "ZINC"],
					timestamps: {
						metal: "2025-11-07T07:06:07.016Z",
						currency: "2025-11-07T07:06:10.544Z",
					},
				},
			},
		},
	},
};
