import { Counter, Registry } from "@rabbit-company/openmetrics-client";

export const registry = new Registry({
	prefix: "rabbitforex",
});

export const httpRequests = new Counter({
	name: "http_requests",
	help: "Total HTTP requests",
	labelNames: ["endpoint"],
	registry,
});
