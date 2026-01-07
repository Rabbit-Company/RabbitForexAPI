import { Counter, Histogram, Registry } from "@rabbit-company/openmetrics-client";

export const registry = new Registry({
	prefix: "rabbitforex",
});

export const httpRequests = new Counter({
	name: "http_requests",
	help: "Total HTTP requests",
	labelNames: ["endpoint"],
	registry,
});

export const clickhouseResponseDuration = new Histogram({
	name: "clickhouse_response_duration_seconds",
	help: "ClickHouse response duration in seconds",
	unit: "seconds",
	labelNames: ["method", "type"],
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
	registry,
});
