import { ClickHouseWrapper } from "./clickhouse";
import { AggregationJob } from "./aggregation";
import { Logger } from "./logger";
import type { Exchange } from "./exchange";
import type { AggregatedPriceRecord, AssetType, HistoryResponse, PricePoint, RawPriceRecord } from "./types";

export class HistoryService {
	private clickhouse: ClickHouseWrapper;
	private aggregationJob: AggregationJob;
	private exchange: Exchange | null = null;
	private recordingEnabled: boolean = false;
	private batchBuffer: PricePoint[] = [];
	private batchTimeout: NodeJS.Timeout | null = null;
	private readonly BATCH_SIZE = 1000;
	private readonly BATCH_INTERVAL = 5000;

	constructor() {
		this.clickhouse = new ClickHouseWrapper();
		this.aggregationJob = new AggregationJob(this.clickhouse);
	}

	async initialize(exchange?: Exchange): Promise<void> {
		this.exchange = exchange || null;

		const historyEnabled = process.env.HISTORY_ENABLED === "true";
		if (!historyEnabled) {
			Logger.info("[HistoryService] History recording is disabled");
			return;
		}

		try {
			await this.clickhouse.initialize();
			this.recordingEnabled = true;

			this.aggregationJob.start();

			Logger.info("[HistoryService] History service initialized");
		} catch (error: any) {
			Logger.error("[HistoryService] Failed to initialize:", error);
			// Don't throw - allow the app to continue without history
			this.recordingEnabled = false;
		}
	}

	setExchange(exchange: Exchange): void {
		this.exchange = exchange;
	}

	isEnabled(): boolean {
		return this.recordingEnabled;
	}

	/**
	 * Record current prices from all asset types
	 */
	async recordCurrentPrices(): Promise<void> {
		if (!this.recordingEnabled || !this.exchange) return;

		const timestamp = new Date();
		const prices: PricePoint[] = [];

		try {
			// Record currency rates (USD is base, so we record 1/rate for each currency)
			const forexRates = this.exchange.getForexRates("USD");
			for (const [symbol, rate] of Object.entries(forexRates)) {
				if (symbol === "USD") continue;

				prices.push({
					symbol,
					assetType: "currency",
					priceUsd: 1 / rate,
					timestamp,
				});
			}

			prices.push({
				symbol: "USD",
				assetType: "currency",
				priceUsd: 1,
				timestamp,
			});

			const metalRates = this.exchange.getMetalRates("USD");
			for (const metal of this.exchange.getSupportedMetals()) {
				const usdRate = metalRates[metal];
				if (usdRate && usdRate > 0) {
					prices.push({
						symbol: metal,
						assetType: "metal",
						priceUsd: 1 / usdRate,
						timestamp,
					});
				}
			}

			const cryptoRates = this.exchange.getCryptoRates("USD");
			for (const crypto of this.exchange.getSupportedCryptocurrencies()) {
				const usdRate = cryptoRates[crypto];
				if (usdRate && usdRate > 0) {
					prices.push({
						symbol: crypto,
						assetType: "crypto",
						priceUsd: 1 / usdRate,
						timestamp,
					});
				}
			}

			const stockRates = this.exchange.getStockRates("USD");
			for (const stock of this.exchange.getSupportedStocks()) {
				const usdRate = stockRates[stock];
				if (usdRate && usdRate > 0) {
					prices.push({
						symbol: stock,
						assetType: "stock",
						priceUsd: 1 / usdRate,
						timestamp,
					});
				}
			}

			this.addToBatch(prices);

			Logger.debug(`[HistoryService] Queued ${prices.length} price records`);
		} catch (error: any) {
			Logger.error("[HistoryService] Failed to record prices:", error);
		}
	}

	private addToBatch(prices: PricePoint[]): void {
		this.batchBuffer.push(...prices);

		if (this.batchBuffer.length >= this.BATCH_SIZE) {
			this.flushBatch();
			return;
		}

		if (!this.batchTimeout) {
			this.batchTimeout = setTimeout(() => {
				this.flushBatch();
			}, this.BATCH_INTERVAL);
		}
	}

	private async flushBatch(): Promise<void> {
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.batchTimeout = null;
		}

		if (this.batchBuffer.length === 0) return;

		const batch = this.batchBuffer.splice(0);

		try {
			await this.clickhouse.insertPrices(batch);
			Logger.debug(`[HistoryService] Flushed ${batch.length} records to ClickHouse`);
		} catch (error: any) {
			Logger.error("[HistoryService] Failed to flush batch:", error);
			// Re-add failed items to buffer for retry
			this.batchBuffer.unshift(...batch);
		}
	}

	/**
	 * Get conversion rate from USD to target currency
	 */
	private getConversionRate(base: string): number {
		if (base === "USD" || !this.exchange) return 1;

		const forexRates = this.exchange.getForexRates("USD");
		const rate = forexRates[base];
		if (rate && rate > 0) return rate;

		return 1;
	}

	/**
	 * Get raw prices for a symbol (last 24 hours - all data from raw table)
	 */
	async getRawHistory(symbol: string, assetType: AssetType, base: string = "USD"): Promise<HistoryResponse> {
		if (!this.recordingEnabled) {
			throw new Error("History service is not enabled");
		}

		const conversionRate = this.getConversionRate(base);
		const rawData = await this.clickhouse.getAllRawPrices(symbol, assetType);

		const data: RawPriceRecord[] = rawData.map((r) => ({
			timestamp: r.timestamp,
			price: this.roundPrice(r.price_usd * conversionRate),
		}));

		return {
			symbol,
			base,
			resolution: "raw",
			data,
		};
	}

	/**
	 * Get hourly prices for a symbol (last 90 days - all data from hourly table)
	 */
	async getHourlyHistory(symbol: string, assetType: AssetType, base: string = "USD"): Promise<HistoryResponse> {
		if (!this.recordingEnabled) {
			throw new Error("History service is not enabled");
		}

		const conversionRate = this.getConversionRate(base);
		const hourlyData = await this.clickhouse.getAllHourlyPrices(symbol, assetType);

		const data: AggregatedPriceRecord[] = hourlyData.map((r) => ({
			timestamp: r.hour,
			avg: this.roundPrice(r.price_avg * conversionRate),
			min: this.roundPrice(r.price_min * conversionRate),
			max: this.roundPrice(r.price_max * conversionRate),
			open: this.roundPrice(r.price_open * conversionRate),
			close: this.roundPrice(r.price_close * conversionRate),
			sampleCount: r.sample_count,
		}));

		return {
			symbol,
			base,
			resolution: "hourly",
			data,
		};
	}

	/**
	 * Get daily prices for a symbol (all time - all data from daily table)
	 */
	async getDailyHistory(symbol: string, assetType: AssetType, base: string = "USD"): Promise<HistoryResponse> {
		if (!this.recordingEnabled) {
			throw new Error("History service is not enabled");
		}

		const conversionRate = this.getConversionRate(base);
		const dailyData = await this.clickhouse.getAllDailyPrices(symbol, assetType);

		const data: AggregatedPriceRecord[] = dailyData.map((r) => ({
			timestamp: r.date,
			avg: this.roundPrice(r.price_avg * conversionRate),
			min: this.roundPrice(r.price_min * conversionRate),
			max: this.roundPrice(r.price_max * conversionRate),
			open: this.roundPrice(r.price_open * conversionRate),
			close: this.roundPrice(r.price_close * conversionRate),
			sampleCount: r.sample_count,
		}));

		return {
			symbol,
			base,
			resolution: "daily",
			data,
		};
	}

	private roundPrice(price: number): number {
		if (price >= 1) {
			return Math.round(price * 10000) / 10000;
		} else if (price >= 0.0001) {
			return Math.round(price * 100000000) / 100000000;
		} else {
			return price;
		}
	}

	async stop(): Promise<void> {
		this.aggregationJob.stop();
		await this.flushBatch();

		if (this.recordingEnabled) {
			await this.clickhouse.close();
		}
		Logger.info("[HistoryService] Stopped");
	}
}

export const historyService = new HistoryService();
