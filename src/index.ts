import { Web } from "@rabbit-company/web";
import { EuropeanCentralBankExchange } from "./exchanges/ecb";
import { Logger } from "./logger";
import { IP_EXTRACTION_PRESETS, ipExtract } from "@rabbit-company/web-middleware/ip-extract";
import type { CloudProvider } from "./types";
import { logger } from "@rabbit-company/web-middleware/logger";
import { cors } from "@rabbit-company/web-middleware/cors";
import pkg from "../package.json";

const host = process.env.SERVER_HOST || "0.0.0.0";
const port = parseInt(process.env.SERVER_PORT || "3000") || 3000;
const proxy = Object.keys(IP_EXTRACTION_PRESETS).includes(process.env.PROXY || "direct") ? (process.env.PROXY as CloudProvider) : "direct";
const updateInterval = parseInt(process.env.UPDATE_INTERVAL || "3600") || 3600;

const cacheControl = "public, s-maxage=43200, max-age=300, stale-while-revalidate=86400, stale-if-error=259200";

Logger.setLevel(parseInt(process.env.LOGGER_LEVEL || "3") || 3);

const ecb = new EuropeanCentralBankExchange();

try {
	await ecb.initialize();
} catch (error: any) {
	Logger.error("Failed to initialize European Central Bank Exchange:", error);
	process.exit(1);
}

const app = new Web();

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

app.use(ipExtract(proxy));

app.get("/", (c) => {
	return c.json(
		{
			program: "RabbitForexAPI",
			version: pkg.version,
			sourceCode: "https://github.com/Rabbit-Company/RabbitForexAPI",
			monitorStats: {
				currencyCount: ecb.getSupportedCurrencies().length,
				updateInterval: `${updateInterval}s`,
			},
			httpStats: {
				pendingRequests: server.pendingRequests,
			},
			lastUpdate: new Date().toISOString(),
		},
		200,
		{ "Cache-Control": "public, s-maxage=5, max-age=2, stale-while-revalidate=300, stale-if-error=86400" }
	);
});

app.get("/v1/rates", (c) => {
	return c.json({ base: "EUR", rates: ecb.getRates("EUR"), lastUpdate: ecb.getLastUpdate()?.toISOString() }, 200, {
		"Cache-Control": cacheControl,
	});
});

app.get("/v1/rates/:currency", (c) => {
	const currency = c.params["currency"]?.toUpperCase();
	return c.json({ base: currency, rates: ecb.getRates(currency), lastUpdate: ecb.getLastUpdate()?.toISOString() }, 200, {
		"Cache-Control": cacheControl,
	});
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
Logger.info("	GET /v1/rates              - Exchange rate data for EUR");
Logger.info("	GET /v1/rates/:currency    - Exchange rate data for specified currency");
