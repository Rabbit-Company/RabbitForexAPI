import { createClient, type ClickHouseClient, type ClickHouseSettings } from "@clickhouse/client";
import { Logger } from "./logger";
import type { AssetType } from "./types";
import { clickhouseResponseDuration } from "./metrics";

export interface ClickHouseConfig {
	host: string;
	port: number;
	database: string;
	username: string;
	password: string;
	compression?: boolean;
	maxOpenConnections?: number;
	requestTimeout?: number;
}

export class ClickHouseWrapper {
	private client: ClickHouseClient;
	private config: ClickHouseConfig;
	private isConnected: boolean = false;

	constructor(config?: Partial<ClickHouseConfig>) {
		this.config = {
			host: process.env.CLICKHOUSE_HOST || "localhost",
			port: parseInt(process.env.CLICKHOUSE_PORT || "8123") || 8123,
			database: process.env.CLICKHOUSE_DATABASE || "rabbitforex",
			username: process.env.CLICKHOUSE_USERNAME || "default",
			password: process.env.CLICKHOUSE_PASSWORD || "",
			compression: process.env.CLICKHOUSE_COMPRESSION === "true",
			maxOpenConnections: parseInt(process.env.CLICKHOUSE_MAX_CONNECTIONS || "10") || 10,
			requestTimeout: parseInt(process.env.CLICKHOUSE_TIMEOUT || "30000") || 30000,
			...config,
		};

		this.client = createClient({
			url: `http://${this.config.host}:${this.config.port}`,
			username: this.config.username,
			password: this.config.password,
			database: this.config.database,
			compression: {
				request: this.config.compression,
				response: this.config.compression,
			},
			max_open_connections: this.config.maxOpenConnections,
			request_timeout: this.config.requestTimeout,
			clickhouse_settings: {
				async_insert: 1,
				wait_for_async_insert: 0,
			} as ClickHouseSettings,
		});
	}

	async initialize(): Promise<void> {
		try {
			const res = await this.client.ping();
			if (!res.success) throw res.error;

			this.isConnected = true;
			Logger.info("[ClickHouse] Connected successfully");

			await this.runMigrations();
		} catch (error: any) {
			Logger.error("[ClickHouse] Failed to connect:", error);
			throw error;
		}
	}

	private async runMigrations(): Promise<void> {
		Logger.info("[ClickHouse] Running migrations...");

		await this.client.command({
			query: `CREATE DATABASE IF NOT EXISTS ${this.config.database}`,
		});

		// Raw prices table - stores all incoming prices (kept for 1 day)
		await this.client.command({
			query: `
				CREATE TABLE IF NOT EXISTS ${this.config.database}.prices_raw (
					symbol LowCardinality(String),
					asset_type Enum8('currency' = 1, 'metal' = 2, 'crypto' = 3, 'stock' = 4),
					price_usd Float64,
					timestamp DateTime64(3, 'UTC'),

					INDEX idx_symbol symbol TYPE bloom_filter GRANULARITY 4,
					INDEX idx_asset_type asset_type TYPE minmax GRANULARITY 1
				)
				ENGINE = ReplacingMergeTree()
				PARTITION BY toYYYYMMDD(timestamp)
				ORDER BY (asset_type, symbol, timestamp)
				TTL toDateTime(timestamp) + INTERVAL 1 DAY
				SETTINGS index_granularity = 8192
			`,
		});

		// Hourly aggregated prices - kept for 90 days
		// Populated by aggregation job from prices_raw after each hour completes
		await this.client.command({
			query: `
				CREATE TABLE IF NOT EXISTS ${this.config.database}.prices_hourly (
					symbol LowCardinality(String),
					asset_type Enum8('currency' = 1, 'metal' = 2, 'crypto' = 3, 'stock' = 4),
					hour DateTime('UTC'),
					price_min Float64,
					price_max Float64,
					price_avg Float64,
					price_open Float64,
					price_close Float64,
					sample_count UInt32,

					INDEX idx_symbol symbol TYPE bloom_filter GRANULARITY 4,
					INDEX idx_asset_type asset_type TYPE minmax GRANULARITY 1
				)
				ENGINE = ReplacingMergeTree(sample_count)
				PARTITION BY toYYYYMM(hour)
				ORDER BY (asset_type, symbol, hour)
				TTL hour + INTERVAL 90 DAY
				SETTINGS index_granularity = 8192
			`,
		});

		// Daily aggregated prices - kept indefinitely
		// Populated by aggregation job from prices_hourly
		await this.client.command({
			query: `
				CREATE TABLE IF NOT EXISTS ${this.config.database}.prices_daily (
					symbol LowCardinality(String),
					asset_type Enum8('currency' = 1, 'metal' = 2, 'crypto' = 3, 'stock' = 4),
					date Date,
					price_min Float64,
					price_max Float64,
					price_avg Float64,
					price_open Float64,
					price_close Float64,
					sample_count UInt32,

					INDEX idx_symbol symbol TYPE bloom_filter GRANULARITY 4,
					INDEX idx_asset_type asset_type TYPE minmax GRANULARITY 1
				)
				ENGINE = ReplacingMergeTree(sample_count)
				PARTITION BY toYear(date)
				ORDER BY (asset_type, symbol, date)
				SETTINGS index_granularity = 8192
			`,
		});

		Logger.info("[ClickHouse] Migrations completed successfully");
	}

	async insertPrices(
		prices: Array<{
			symbol: string;
			assetType: AssetType;
			priceUsd: number;
			timestamp: Date;
		}>
	): Promise<void> {
		if (prices.length === 0) return;

		const assetTypeMap = {
			currency: 1,
			metal: 2,
			crypto: 3,
			stock: 4,
		};

		try {
			const start = process.hrtime.bigint();
			await this.client.insert({
				table: "prices_raw",
				values: prices.map((p) => ({
					symbol: p.symbol,
					asset_type: assetTypeMap[p.assetType],
					price_usd: p.priceUsd,
					timestamp: p.timestamp.toISOString().replace("T", " ").replace("Z", ""),
				})),
				format: "JSONEachRow",
			});
			const end = process.hrtime.bigint();
			clickhouseResponseDuration.labels({ method: "insertPrices", type: "batch" }).observe(Number(end - start) / 1_000_000_000);

			Logger.debug(`[ClickHouse] Inserted ${prices.length} price records`);
		} catch (error: any) {
			Logger.error("[ClickHouse] Failed to insert prices:", error);
			throw error;
		}
	}

	/**
	 * Get ALL raw prices for a symbol (entire raw table - last 24h due to TTL)
	 */
	async getAllRawPrices(
		symbol: string,
		assetType: AssetType
	): Promise<
		Array<{
			symbol: string;
			price_usd: number;
			timestamp: string;
		}>
	> {
		const assetTypeMap = { currency: 1, metal: 2, crypto: 3, stock: 4 };

		const query = `
			SELECT
				symbol,
				price_usd,
				formatDateTime(timestamp, '%Y-%m-%dT%H:%i:%s.000Z') as timestamp
			FROM prices_raw
			WHERE symbol = {symbol:String} AND asset_type = {assetType:UInt8}
			ORDER BY timestamp ASC
		`;

		const start = process.hrtime.bigint();
		const result = await this.client.query({
			query,
			query_params: {
				symbol: symbol,
				assetType: assetTypeMap[assetType],
			},
			format: "JSONEachRow",
		});
		const end = process.hrtime.bigint();
		clickhouseResponseDuration.labels({ method: "getAllRawPrices", type: assetType }).observe(Number(end - start) / 1_000_000_000);

		return result.json();
	}

	/**
	 * Get ALL hourly prices for a symbol (last 90 days)
	 * Reads from prices_hourly table (populated by aggregation job)
	 * Falls back to prices_raw for current incomplete hour
	 */
	async getAllHourlyPrices(
		symbol: string,
		assetType: AssetType
	): Promise<
		Array<{
			symbol: string;
			hour: string;
			price_min: number;
			price_max: number;
			price_avg: number;
			price_open: number;
			price_close: number;
			sample_count: number;
		}>
	> {
		const assetTypeMap = { currency: 1, metal: 2, crypto: 3, stock: 4 };

		// Query completed hours from prices_hourly (clean, aggregated data)
		// Plus current incomplete hour from prices_raw
		const query = `
			SELECT
				symbol,
				formatDateTime(hour, '%Y-%m-%dT%H:00:00Z') as hour,
				price_min,
				price_max,
				price_avg,
				price_open,
				price_close,
				sample_count
			FROM (
				-- Completed hours from hourly table
				SELECT
					symbol,
					hour,
					price_min,
					price_max,
					price_avg,
					price_open,
					price_close,
					sample_count
				FROM prices_hourly FINAL
				WHERE symbol = {symbol:String} AND asset_type = {assetType:UInt8}

				UNION ALL

				-- Current incomplete hour from raw table
				SELECT
					symbol,
					toStartOfHour(timestamp) AS hour,
					min(price_usd) AS price_min,
					max(price_usd) AS price_max,
					avg(price_usd) AS price_avg,
					argMin(price_usd, timestamp) AS price_open,
					argMax(price_usd, timestamp) AS price_close,
					count() AS sample_count
				FROM prices_raw
				WHERE symbol = {symbol:String}
					AND asset_type = {assetType:UInt8}
					AND toStartOfHour(timestamp) = toStartOfHour(now())
				GROUP BY symbol, toStartOfHour(timestamp)
			)
			ORDER BY hour ASC
		`;

		const start = process.hrtime.bigint();
		const result = await this.client.query({
			query,
			query_params: {
				symbol: symbol,
				assetType: assetTypeMap[assetType],
			},
			format: "JSONEachRow",
		});
		const end = process.hrtime.bigint();
		clickhouseResponseDuration.labels({ method: "getAllHourlyPrices", type: assetType }).observe(Number(end - start) / 1_000_000_000);

		return result.json();
	}

	/**
	 * Get ALL daily prices for a symbol (all time)
	 * Reads from prices_daily table (populated by aggregation job)
	 * Falls back to prices_hourly for current incomplete day
	 */
	async getAllDailyPrices(
		symbol: string,
		assetType: AssetType
	): Promise<
		Array<{
			symbol: string;
			date: string;
			price_min: number;
			price_max: number;
			price_avg: number;
			price_open: number;
			price_close: number;
			sample_count: number;
		}>
	> {
		const assetTypeMap = { currency: 1, metal: 2, crypto: 3, stock: 4 };

		// Query completed days from prices_daily (clean, aggregated data)
		// Plus current incomplete day from prices_hourly + prices_raw
		const query = `
			SELECT
				symbol,
				date,
				price_min,
				price_max,
				price_avg,
				price_open,
				price_close,
				sample_count
			FROM (
				-- Completed days from daily table
				SELECT
					symbol,
					toString(date) as date,
					price_min,
					price_max,
					price_avg,
					price_open,
					price_close,
					sample_count
				FROM prices_daily FINAL
				WHERE symbol = {symbol:String} AND asset_type = {assetType:UInt8}

				UNION ALL

				-- Current incomplete day aggregated from hourly + current hour from raw
				SELECT
					symbol,
					toString(toDate(hour)) as date,
					min(price_min) AS price_min,
					max(price_max) AS price_max,
					sum(price_avg * samples) / sum(samples) AS price_avg,
					argMin(price_open, hour) AS price_open,
					argMax(price_close, hour) AS price_close,
					sum(samples) AS sample_count
				FROM (
					-- Today's completed hours from hourly table
					SELECT
						symbol,
						hour,
						price_min,
						price_max,
						price_avg,
						price_open,
						price_close,
						sample_count AS samples
					FROM prices_hourly FINAL
					WHERE symbol = {symbol:String}
						AND asset_type = {assetType:UInt8}
						AND toDate(hour) = today()

					UNION ALL

					-- Current incomplete hour from raw
					SELECT
						symbol,
						toStartOfHour(timestamp) AS hour,
						min(price_usd) AS price_min,
						max(price_usd) AS price_max,
						avg(price_usd) AS price_avg,
						argMin(price_usd, timestamp) AS price_open,
						argMax(price_usd, timestamp) AS price_close,
						count() AS samples
					FROM prices_raw
					WHERE symbol = '${symbol}'
						AND asset_type = ${assetTypeMap[assetType]}
						AND toStartOfHour(timestamp) = toStartOfHour(now())
					GROUP BY symbol, toStartOfHour(timestamp)
				)
				GROUP BY symbol, toDate(hour)
				HAVING toDate(hour) = today()
			)
			ORDER BY date ASC
		`;

		const start = process.hrtime.bigint();
		const result = await this.client.query({
			query,
			query_params: {
				symbol: symbol,
				assetType: assetTypeMap[assetType],
			},
			format: "JSONEachRow",
		});
		const end = process.hrtime.bigint();
		clickhouseResponseDuration.labels({ method: "getAllDailyPrices", type: assetType }).observe(Number(end - start) / 1_000_000_000);

		return result.json();
	}

	async close(): Promise<void> {
		await this.client.close();
		this.isConnected = false;
		Logger.info("[ClickHouse] Connection closed");
	}

	/**
	 * Execute a command (INSERT, ALTER, etc.)
	 */
	async command(query: string): Promise<boolean> {
		try {
			await this.client.command({ query });
			return true;
		} catch (error: any) {
			Logger.error("[ClickHouse] Command failed:", error);
			throw error;
		}
	}

	isReady(): boolean {
		return this.isConnected;
	}
}
