import type { ClickHouseWrapper } from "./clickhouse";
import { Logger } from "./logger";

export class AggregationJob {
	private clickhouse: ClickHouseWrapper;
	private intervalId: NodeJS.Timeout | null = null;
	private readonly INTERVAL_MS = 10 * 60 * 1000;
	private isRunning: boolean = false;

	constructor(clickhouse: ClickHouseWrapper) {
		this.clickhouse = clickhouse;
	}

	start(): void {
		if (this.intervalId) return;

		Logger.info("[AggregationJob] Starting aggregation job (runs every 10 minutes)");

		this.runAggregation();

		this.intervalId = setInterval(() => {
			this.runAggregation();
		}, this.INTERVAL_MS);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		Logger.info("[AggregationJob] Stopped");
	}

	private async runAggregation(): Promise<void> {
		if (this.isRunning) {
			Logger.debug("[AggregationJob] Previous run still in progress, skipping");
			return;
		}

		this.isRunning = true;

		try {
			Logger.debug("[AggregationJob] Running aggregation...");
			await this.aggregateHourly();
			await this.aggregateDaily();
			Logger.debug("[AggregationJob] Aggregation completed");
		} catch (error: any) {
			Logger.error("[AggregationJob] Aggregation failed:", error);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Find completed hours missing from prices_hourly and aggregate from prices_raw
	 */
	private async aggregateHourly(): Promise<void> {
		// Find hours that:
		// 1. Exist in prices_raw
		// 2. Are completed (hour < current hour)
		// 3. Don't exist in prices_hourly (or have different sample counts)
		const query = `
			INSERT INTO prices_hourly (
				symbol, asset_type, hour,
				price_min, price_max, price_avg,
				price_open, price_close, sample_count
			)
			SELECT
				symbol,
				asset_type,
				hour,
				price_min,
				price_max,
				price_avg,
				price_open,
				price_close,
				total_samples AS sample_count
			FROM (
				-- Aggregate all completed hours from raw data
				SELECT
					symbol,
					asset_type,
					toStartOfHour(timestamp) AS hour,
					min(price_usd) AS price_min,
					max(price_usd) AS price_max,
					avg(price_usd) AS price_avg,
					argMin(price_usd, timestamp) AS price_open,
					argMax(price_usd, timestamp) AS price_close,
					count() AS total_samples
				FROM prices_raw
				WHERE toStartOfHour(timestamp) < toStartOfHour(now())
				GROUP BY symbol, asset_type, toStartOfHour(timestamp)
			) AS r
			LEFT JOIN (
				-- Get existing hourly aggregates with their sample counts
				SELECT
					symbol AS h_symbol,
					asset_type AS h_asset_type,
					hour AS h_hour,
					sum(sample_count) AS existing_samples
				FROM prices_hourly
				GROUP BY symbol, asset_type, hour
			) AS h ON r.symbol = h.h_symbol
				AND r.asset_type = h.h_asset_type
				AND r.hour = h.h_hour
			-- Only insert if missing or sample count differs (means we have more data)
			WHERE h.h_symbol IS NULL OR h.existing_samples < r.total_samples
		`;

		await this.clickhouse.command(query);
	}

	/**
	 * Find completed days missing from prices_daily and aggregate from prices_hourly
	 */
	private async aggregateDaily(): Promise<void> {
		// Find days that:
		// 1. Have complete hourly data (24 hours or day has passed)
		// 2. Are completed (date < today)
		// 3. Don't exist in prices_daily (or have different sample counts)
		const query = `
			INSERT INTO prices_daily (
				symbol, asset_type, date,
				price_min, price_max, price_avg,
				price_open, price_close, sample_count
			)
			SELECT
				symbol,
				asset_type,
				date,
				price_min,
				price_max,
				price_avg,
				price_open,
				price_close,
				total_samples AS sample_count
			FROM (
				-- Aggregate all completed days from hourly data
				SELECT
					symbol,
					asset_type,
					toDate(hour) AS date,
					min(price_min) AS price_min,
					max(price_max) AS price_max,
					sum(price_avg * sample_count) / sum(sample_count) AS price_avg,
					argMin(price_open, hour) AS price_open,
					argMax(price_close, hour) AS price_close,
					sum(sample_count) AS total_samples
				FROM prices_hourly
				WHERE toDate(hour) < today()
				GROUP BY symbol, asset_type, toDate(hour)
			) AS h
			LEFT JOIN (
				-- Get existing daily aggregates with their sample counts
				SELECT
					symbol AS d_symbol,
					asset_type AS d_asset_type,
					date AS d_date,
					sum(sample_count) AS existing_samples
				FROM prices_daily
				GROUP BY symbol, asset_type, date
			) AS d ON h.symbol = d.d_symbol
				AND h.asset_type = d.d_asset_type
				AND h.date = d.d_date
			-- Only insert if missing or sample count differs
			WHERE d.d_symbol IS NULL OR d.existing_samples < h.total_samples
		`;

		await this.clickhouse.command(query);
	}
}
