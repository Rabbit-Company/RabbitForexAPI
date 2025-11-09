import { Logger } from "./logger";
import type { Instrument, PortfolioItem, StockData, StocksResponse } from "./types";

export class StockExchange {
	private stocks: Record<string, StockData> = {};
	private instruments: Map<string, string> = new Map(); // ticker -> currencyCode
	private updateInterval: number;
	private intervalId: NodeJS.Timeout | null = null;
	private lastUpdate: Date | null = null;

	constructor() {
		this.updateInterval = parseInt(process.env.STOCK_UPDATE_INTERVAL || "30") || 30;
	}

	async initialize(): Promise<void> {
		await this.fetchInstruments();
		await this.updateStockPrices();
		this.startPeriodicUpdate();

		Logger.info(`[StockExchange] Stock monitoring initialized with ${this.getStockCount()} stocks`);
	}

	private async fetchInstruments(): Promise<void> {
		try {
			Logger.debug("[StockExchange] Fetching instruments metadata...");

			const response = await fetch("https://live.trading212.com/api/v0/equity/metadata/instruments", {
				headers: {
					Authorization: `Basic ${Buffer.from(`${process.env.TRADING212_API_KEY}:${process.env.TRADING212_API_SECRET}`).toString("base64")}`,
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(3000),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const instruments = (await response.json()) as Instrument[];

			this.instruments.clear();
			instruments.forEach((instrument) => {
				this.instruments.set(instrument.ticker, instrument.currencyCode);
			});
			Logger.debug(`[StockExchange] Loaded ${instruments.length} instruments`);
		} catch (error: any) {
			Logger.error("[StockExchange] Error fetching instruments", error);
			throw error;
		}
	}

	async updateStockPrices(): Promise<void> {
		try {
			Logger.debug("[StockExchange] Fetching portfolio data...");

			const response = await fetch("https://live.trading212.com/api/v0/equity/portfolio", {
				headers: {
					Authorization: `Basic ${Buffer.from(`${process.env.TRADING212_API_KEY}:${process.env.TRADING212_API_SECRET}`).toString("base64")}`,
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(3000),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const portfolio = (await response.json()) as PortfolioItem[];

			const timestamp = Date.now();
			const newStocks: Record<string, StockData> = {};

			portfolio.forEach((item) => {
				const symbol = item.ticker.split("_")?.[0] || "";
				let currency = this.instruments.get(item.ticker) || "UNKNOWN";
				let price = item.currentPrice;

				// Handle GBX (British penny stocks) conversion
				if (currency === "GBX") {
					currency = "GBP";
					price = price / 100;
				}

				newStocks[symbol] = {
					price,
					currency,
					updated: timestamp,
				};
			});

			this.stocks = newStocks;
			this.lastUpdate = new Date();

			Logger.debug(`[StockExchange] Updated ${Object.keys(this.stocks).length} stock prices`);
		} catch (error: any) {
			Logger.error("[StockExchange] Error updating stock prices", error);
			//throw error;
		}
	}

	startPeriodicUpdate(): void {
		const actualInterval = Math.max(this.updateInterval, 10);
		this.intervalId = setInterval(async () => {
			try {
				await this.updateStockPrices();
			} catch (err: any) {
				Logger.error("[StockExchange] Failed to update stock prices during periodic update:", err);
			}
		}, actualInterval * 1000);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	getStocks(): StocksResponse {
		return { stocks: { ...this.stocks } };
	}

	getStock(symbol: string): StockData | undefined {
		return this.stocks[symbol];
	}

	getSupportedStocks(): string[] {
		return Object.keys(this.stocks).sort();
	}

	getStockCount(): number {
		return Object.keys(this.stocks).length;
	}

	getInstrumentCount(): number {
		return this.instruments.size;
	}

	getLastUpdate(): Date | null {
		return this.lastUpdate;
	}
}
