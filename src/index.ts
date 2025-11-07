import { Web } from "@rabbit-company/web";
import { Exchange } from "./exchange";
import { Logger } from "./logger";
import { IP_EXTRACTION_PRESETS, ipExtract } from "@rabbit-company/web-middleware/ip-extract";
import type { CloudProvider } from "./types";
import { logger } from "@rabbit-company/web-middleware/logger";
import { cors } from "@rabbit-company/web-middleware/cors";
import pkg from "../package.json";

const host = process.env.SERVER_HOST || "0.0.0.0";
const port = parseInt(process.env.SERVER_PORT || "3000") || 3000;
const proxy = Object.keys(IP_EXTRACTION_PRESETS).includes(process.env.PROXY || "direct") ? (process.env.PROXY as CloudProvider) : "direct";
const updateInterval = parseInt(process.env.UPDATE_INTERVAL || "60") || 60;

const cacheControl = [
	"public",
	`max-age=${updateInterval}`,
	`s-maxage=${updateInterval}`,
	`stale-while-revalidate=${updateInterval * 10}`,
	`stale-if-error=31536000`,
].join(", ");

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
	return c.json(
		{
			program: "RabbitForexAPI",
			version: pkg.version,
			sourceCode: "https://github.com/Rabbit-Company/RabbitForexAPI",
			monitorStats: {
				currencyCount: exchange.getSupportedCurrencies().length,
				metalCount: exchange.getSupportedMetals().length,
				totalAssetCount: exchange.getSupportedAssets().length,
				updateInterval: `${updateInterval}s`,
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

app.get("/v1/rates", (c) => {
	return c.json(
		{
			base: "USD",
			rates: exchange.getRates("USD"),
			timestamps: {
				metal: exchange.getLastMetalUpdate()?.toISOString(),
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/rates/:currency", (c) => {
	const currency = c.params["currency"]?.toUpperCase();
	return c.json(
		{
			base: currency,
			rates: exchange.getRates(currency),
			timestamps: {
				metal: exchange.getLastMetalUpdate()?.toISOString(),
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

app.get("/v1/assets", (c) => {
	return c.json(
		{
			currencies: exchange.getSupportedCurrencies(),
			metals: exchange.getSupportedMetals(),
			timestamps: {
				metal: exchange.getLastMetalUpdate()?.toISOString(),
				currency: exchange.getLastCurrencyUpdate()?.toISOString(),
			},
		},
		200,
		{ "Cache-Control": cacheControl }
	);
});

export const server = await app.listen({
	hostname: host,
	port: port,
});

Logger.info("RabbitForexAPI started successfully");
Logger.info(`Server running on http://${host}:${port}`);
Logger.info(`Exchange rates updates every ${updateInterval}s`);
Logger.info("Available endpoints:");
Logger.info("	GET /                      - Health check and stats");
Logger.info("	GET /v1/rates              - Exchange rates for USD (default)");
Logger.info("	GET /v1/rates/:asset       - Exchange rates for specified asset");
Logger.info("	GET /v1/assets             - List all supported currencies and metals");
