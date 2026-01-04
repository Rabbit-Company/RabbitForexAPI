import { Web } from "@rabbit-company/web";
import { Exchange } from "./exchange";
import { Logger } from "./logger";
import { IP_EXTRACTION_PRESETS, ipExtract } from "@rabbit-company/web-middleware/ip-extract";
import type { CloudProvider } from "./types";
import { logger } from "@rabbit-company/web-middleware/logger";
import { cors } from "@rabbit-company/web-middleware/cors";
import pkg from "../package.json";
import { openapi } from "./openapi";
import { httpRequests, registry } from "./metrics";
import { bearerAuth } from "@rabbit-company/web-middleware/bearer-auth";
import { historyService } from "./history";

const host = process.env.SERVER_HOST || "0.0.0.0";
const port = parseInt(process.env.SERVER_PORT || "3000") || 3000;
const proxy = Object.keys(IP_EXTRACTION_PRESETS).includes(process.env.PROXY || "direct") ? (process.env.PROXY as CloudProvider) : "direct";
const updateInterval = parseInt(process.env.UPDATE_INTERVAL || "30") || 30;
const openMetricsEnabled = process.env.OPEN_METRICS_ENABLED === "true";

const cacheControl = [
	"public",
	`max-age=${updateInterval}`,
	`s-maxage=${updateInterval}`,
	`stale-while-revalidate=${updateInterval * 10}`,
	`stale-if-error=31536000`,
].join(", ");

const rawCacheControl = `public, max-age=${updateInterval}, s-maxage=${updateInterval}, stale-while-revalidate=${updateInterval * 10}, stale-if-error=86400`;
const hourlyCacheControl = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400";
const dailyCacheControl = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800";

Logger.setLevel(parseInt(process.env.LOGGER_LEVEL || "3") || 3);

const exchange = new Exchange();

try {
	await exchange.initialize();
} catch (error: any) {
	Logger.error("Failed to initialize Exchange:", error);
	process.exit(1);
}

const app = new Web();

app.use(ipExtract(proxy));

app.use(
	logger({
		logger: Logger,
		logResponses: false,
	})
);

app.use(
	cors({
		allowMethods: ["GET"],
	})
);

app.get("/", (c) => {
	httpRequests.labels({ endpoint: "/" }).inc();

	return c.json(
		{
			program: "RabbitForexAPI",
			version: pkg.version,
			sourceCode: "https://github.com/Rabbit-Company/RabbitForexAPI",
			monitorStats: {
				currencyCount: exchange.getSupportedCurrencies().length,
				metalCount: exchange.getSupportedMetals().length,
				cryptoCount: exchange.getSupportedCryptocurrencies().length,
				stockCount: exchange.getSupportedStocks().length,
				totalAssetCount: exchange.getSupportedAssets().length,
				updateInterval: `${updateInterval}s`,
				historyEnabled: historyService.isEnabled(),
			},
			httpStats: {
				pendingRequests: server.pendingRequests,
			},
			lastUpdate: new Date().toISOString(),
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

if (openMetricsEnabled) {
	app.get(
		"/metrics",
		bearerAuth({
			validate(token) {
				return token === process.env.OPEN_METRICS_AUTH_TOKEN;
			},
			skip() {
				return process.env.OPEN_METRICS_AUTH_TOKEN === "none";
			},
		}),
		(c) => {
			httpRequests.labels({ endpoint: "/metrics" }).inc();

			return c.text(registry.metricsText(), 200, {
				"Content-Type": registry.contentType,
				"Cache-Control": "no-store",
			});
		}
	);
}

app.get("/openapi.json", (c) => {
	httpRequests.labels({ endpoint: "/openapi.json" }).inc();

	return c.json(openapi, 200, { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=36000, stale-if-error=31536000" });
});

app.get("/v1/assets", (c) => {
	httpRequests.labels({ endpoint: "/v1/assets" }).inc();

	return c.json(
		{
			currencies: exchange.getSupportedCurrencies(),
			metals: exchange.getSupportedMetals(),
			cryptocurrencies: exchange.getSupportedCryptocurrencies(),
			stocks: exchange.getSupportedStocks(),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
				metal: exchange.getLastMetalUpdate()?.toISOString(),
				crypto: exchange.getLastCryptoUpdate()?.toISOString(),
				stock: exchange.getLastStockUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

// LIVE RATES ENDPOINTS

app.get("/v1/rates", (c) => {
	httpRequests.labels({ endpoint: "/v1/rates" }).inc();

	return c.json(
		{
			base: "USD",
			rates: exchange.getForexRates("USD"),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/rates/:base", (c) => {
	const base = c.params["base"]!.toUpperCase();

	httpRequests.labels({ endpoint: "/v1/rates/:base" }).inc();

	return c.json(
		{
			base: base,
			rates: exchange.getForexRates(base),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/metals/rates", (c) => {
	httpRequests.labels({ endpoint: "/v1/metals/rates" }).inc();

	return c.json(
		{
			base: "USD",
			rates: exchange.getMetalRates("USD"),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
				metal: exchange.getLastMetalUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/metals/rates/:base", (c) => {
	const base = c.params["base"]!.toUpperCase();

	httpRequests.labels({ endpoint: "/v1/metals/rates/:base" }).inc();

	return c.json(
		{
			base: base,
			rates: exchange.getMetalRates(base),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
				metal: exchange.getLastMetalUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/crypto/rates", (c) => {
	httpRequests.labels({ endpoint: "/v1/crypto/rates" }).inc();

	return c.json(
		{
			base: "USD",
			rates: exchange.getCryptoRates("USD"),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
				crypto: exchange.getLastCryptoUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/crypto/rates/:base", (c) => {
	const base = c.params["base"]!.toUpperCase();

	httpRequests.labels({ endpoint: "/v1/crypto/rates/:base" }).inc();

	return c.json(
		{
			base: base,
			rates: exchange.getCryptoRates(base),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
				crypto: exchange.getLastCryptoUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/stocks/rates", (c) => {
	httpRequests.labels({ endpoint: "/v1/stocks/rates" }).inc();

	return c.json(
		{
			base: "USD",
			rates: exchange.getStockRates("USD"),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
				stock: exchange.getLastStockUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/stocks/rates/:base", (c) => {
	const base = c.params["base"]!.toUpperCase();

	httpRequests.labels({ endpoint: "/v1/stocks/rates/:base" }).inc();

	return c.json(
		{
			base: base,
			rates: exchange.getStockRates(base),
			timestamps: {
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
				stock: exchange.getLastStockUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

// HISTORY ENDPOINTS

// Currency history - raw (last 24h)
app.get("/v1/rates/history/:symbol", async (c) => {
	httpRequests.labels({ endpoint: "/v1/rates/history/:symbol" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getRawHistory(symbol, "currency", "USD");
		return c.json(result, 200, { "Cache-Control": rawCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Currency history - hourly (last 90 days)
app.get("/v1/rates/history/:symbol/hourly", async (c) => {
	httpRequests.labels({ endpoint: "/v1/rates/history/:symbol/hourly" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getHourlyHistory(symbol, "currency", "USD");
		return c.json(result, 200, { "Cache-Control": hourlyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Currency history - daily (all time)
app.get("/v1/rates/history/:symbol/daily", async (c) => {
	httpRequests.labels({ endpoint: "/v1/rates/history/:symbol/daily" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getDailyHistory(symbol, "currency", "USD");
		return c.json(result, 200, { "Cache-Control": dailyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Metal history - raw (last 24h)
app.get("/v1/metals/history/:symbol", async (c) => {
	httpRequests.labels({ endpoint: "/v1/metals/history/:symbol" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getRawHistory(symbol, "metal", "USD");
		return c.json(result, 200, { "Cache-Control": rawCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Metal history - hourly (last 90 days)
app.get("/v1/metals/history/:symbol/hourly", async (c) => {
	httpRequests.labels({ endpoint: "/v1/metals/history/:symbol/hourly" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getHourlyHistory(symbol, "metal", "USD");
		return c.json(result, 200, { "Cache-Control": hourlyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Metal history - daily (all time)
app.get("/v1/metals/history/:symbol/daily", async (c) => {
	httpRequests.labels({ endpoint: "/v1/metals/history/:symbol/daily" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getDailyHistory(symbol, "metal", "USD");
		return c.json(result, 200, { "Cache-Control": dailyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Crypto history - raw (last 24h)
app.get("/v1/crypto/history/:symbol", async (c) => {
	httpRequests.labels({ endpoint: "/v1/crypto/history/:symbol" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getRawHistory(symbol, "crypto", "USD");
		return c.json(result, 200, { "Cache-Control": rawCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Crypto history - hourly (last 90 days)
app.get("/v1/crypto/history/:symbol/hourly", async (c) => {
	httpRequests.labels({ endpoint: "/v1/crypto/history/:symbol/hourly" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getHourlyHistory(symbol, "crypto", "USD");
		return c.json(result, 200, { "Cache-Control": hourlyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Crypto history - daily (all time)
app.get("/v1/crypto/history/:symbol/daily", async (c) => {
	httpRequests.labels({ endpoint: "/v1/crypto/history/:symbol/daily" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getDailyHistory(symbol, "crypto", "USD");
		return c.json(result, 200, { "Cache-Control": dailyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Stock history - raw (last 24h)
app.get("/v1/stocks/history/:symbol", async (c) => {
	httpRequests.labels({ endpoint: "/v1/stocks/history/:symbol" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getRawHistory(symbol, "stock", "USD");
		return c.json(result, 200, { "Cache-Control": rawCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Stock history - hourly (last 90 days)
app.get("/v1/stocks/history/:symbol/hourly", async (c) => {
	httpRequests.labels({ endpoint: "/v1/stocks/history/:symbol/hourly" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getHourlyHistory(symbol, "stock", "USD");
		return c.json(result, 200, { "Cache-Control": hourlyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Stock history - daily (all time)
app.get("/v1/stocks/history/:symbol/daily", async (c) => {
	httpRequests.labels({ endpoint: "/v1/stocks/history/:symbol/daily" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const result = await historyService.getDailyHistory(symbol, "stock", "USD");
		return c.json(result, 200, { "Cache-Control": dailyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Metal history with currency - raw (last 24h)
app.get("/v1/metals/history/:symbol/currency/:base", async (c) => {
	httpRequests.labels({ endpoint: "/v1/metals/history/:symbol/currency/:base" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getRawHistory(symbol, "metal", base, true);
		return c.json(result, 200, { "Cache-Control": rawCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Metal history with currency - hourly (last 90 days)
app.get("/v1/metals/history/:symbol/currency/:base/hourly", async (c) => {
	httpRequests.labels({ endpoint: "/v1/metals/history/:symbol/currency/:base/hourly" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getHourlyHistory(symbol, "metal", base, true);
		return c.json(result, 200, { "Cache-Control": hourlyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Metal history with currency - daily (all time)
app.get("/v1/metals/history/:symbol/currency/:base/daily", async (c) => {
	httpRequests.labels({ endpoint: "/v1/metals/history/:symbol/currency/:base/daily" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getDailyHistory(symbol, "metal", base, true);
		return c.json(result, 200, { "Cache-Control": dailyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Crypto history with currency - raw (last 24h)
app.get("/v1/crypto/history/:symbol/currency/:base", async (c) => {
	httpRequests.labels({ endpoint: "/v1/crypto/history/:symbol/currency/:base" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getRawHistory(symbol, "crypto", base, true);
		return c.json(result, 200, { "Cache-Control": rawCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Crypto history with currency - hourly (last 90 days)
app.get("/v1/crypto/history/:symbol/currency/:base/hourly", async (c) => {
	httpRequests.labels({ endpoint: "/v1/crypto/history/:symbol/currency/:base/hourly" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getHourlyHistory(symbol, "crypto", base, true);
		return c.json(result, 200, { "Cache-Control": hourlyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Crypto history with currency - daily (all time)
app.get("/v1/crypto/history/:symbol/currency/:base/daily", async (c) => {
	httpRequests.labels({ endpoint: "/v1/crypto/history/:symbol/currency/:base/daily" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getDailyHistory(symbol, "crypto", base, true);
		return c.json(result, 200, { "Cache-Control": dailyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Stock history with currency - raw (last 24h)
app.get("/v1/stocks/history/:symbol/currency/:base", async (c) => {
	httpRequests.labels({ endpoint: "/v1/stocks/history/:symbol/currency/:base" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getRawHistory(symbol, "stock", base, true);
		return c.json(result, 200, { "Cache-Control": rawCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Stock history with currency - hourly (last 90 days)
app.get("/v1/stocks/history/:symbol/currency/:base/hourly", async (c) => {
	httpRequests.labels({ endpoint: "/v1/stocks/history/:symbol/currency/:base/hourly" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getHourlyHistory(symbol, "stock", base, true);
		return c.json(result, 200, { "Cache-Control": hourlyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

// Stock history with currency - daily (all time)
app.get("/v1/stocks/history/:symbol/currency/:base/daily", async (c) => {
	httpRequests.labels({ endpoint: "/v1/stocks/history/:symbol/currency/:base/daily" }).inc();

	if (!historyService.isEnabled()) {
		return c.json({ error: "History service is not enabled" }, 503);
	}

	try {
		const symbol = c.params["symbol"]!.toUpperCase();
		const base = c.params["base"]!.toUpperCase();
		const result = await historyService.getDailyHistory(symbol, "stock", base, true);
		return c.json(result, 200, { "Cache-Control": dailyCacheControl });
	} catch (error: any) {
		Logger.error("[History] Error:", error);
		return c.json({ error: error.message }, 500);
	}
});

export const server = await app.listen({
	hostname: host,
	port: port,
});

// Graceful shutdown
process.on("SIGTERM", async () => {
	Logger.info("Received SIGTERM, shutting down gracefully...");
	await exchange.stop();
	server.stop();
	process.exit(0);
});

process.on("SIGINT", async () => {
	Logger.info("Received SIGINT, shutting down gracefully...");
	await exchange.stop();
	server.stop();
	process.exit(0);
});

Logger.info("RabbitForexAPI started successfully");
Logger.info(`Server running on http://${host}:${port}`);
Logger.info(`Exchange rates updates every ${updateInterval}s`);
Logger.info(`History recording: ${historyService.isEnabled() ? "enabled" : "disabled"}`);
Logger.info("Available endpoints:");
Logger.info("  GET /                                                   - Health check and stats");
Logger.info("  GET /metrics                                            - OpenMetrics format");
Logger.info("  GET /openapi.json                                       - OpenAPI specification");
Logger.info("  GET /v1/assets                                          - List all supported assets");
Logger.info("  GET /v1/rates                                           - Currency rates (USD base)");
Logger.info("  GET /v1/rates/:base                                     - Currency rates (custom base)");
Logger.info("  GET /v1/rates/history/:symbol                           - Currency history (raw, last 24h)");
Logger.info("  GET /v1/rates/history/:symbol/hourly                    - Currency history (hourly, last 90d)");
Logger.info("  GET /v1/rates/history/:symbol/daily                     - Currency history (daily, all time)");
Logger.info("  GET /v1/metals/rates                                    - Metal rates (USD base)");
Logger.info("  GET /v1/metals/rates/:base                              - Metal rates (custom base)");
Logger.info("  GET /v1/metals/history/:symbol                          - Metal history (raw, last 24h)");
Logger.info("  GET /v1/metals/history/:symbol/hourly                   - Metal history (hourly, last 90d)");
Logger.info("  GET /v1/metals/history/:symbol/daily                    - Metal history (daily, all time)");
Logger.info("  GET /v1/metals/history/:symbol/currency/:base           - Metal history in currency (raw)");
Logger.info("  GET /v1/metals/history/:symbol/currency/:base/hourly    - Metal history in currency (hourly)");
Logger.info("  GET /v1/metals/history/:symbol/currency/:base/daily     - Metal history in currency (daily)");
Logger.info("  GET /v1/crypto/rates                                    - Crypto rates (USD base)");
Logger.info("  GET /v1/crypto/rates/:base                              - Crypto rates (custom base)");
Logger.info("  GET /v1/crypto/history/:symbol                          - Crypto history (raw, last 24h)");
Logger.info("  GET /v1/crypto/history/:symbol/hourly                   - Crypto history (hourly, last 90d)");
Logger.info("  GET /v1/crypto/history/:symbol/daily                    - Crypto history (daily, all time)");
Logger.info("  GET /v1/crypto/history/:symbol/currency/:base           - Crypto history in currency (raw)");
Logger.info("  GET /v1/crypto/history/:symbol/currency/:base/hourly    - Crypto history in currency (hourly)");
Logger.info("  GET /v1/crypto/history/:symbol/currency/:base/daily     - Crypto history in currency (daily)");
Logger.info("  GET /v1/stocks/rates                                    - Stock rates (USD base)");
Logger.info("  GET /v1/stocks/rates/:base                              - Stock rates (custom base)");
Logger.info("  GET /v1/stocks/history/:symbol                          - Stock history (raw, last 24h)");
Logger.info("  GET /v1/stocks/history/:symbol/hourly                   - Stock history (hourly, last 90d)");
Logger.info("  GET /v1/stocks/history/:symbol/daily                    - Stock history (daily, all time)");
Logger.info("  GET /v1/stocks/history/:symbol/currency/:base           - Stock history in currency (raw)");
Logger.info("  GET /v1/stocks/history/:symbol/currency/:base/hourly    - Stock history in currency (hourly)");
Logger.info("  GET /v1/stocks/history/:symbol/currency/:base/daily     - Stock history in currency (daily)");
