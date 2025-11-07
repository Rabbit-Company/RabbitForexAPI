import { Logger } from "./logger";
import type { ExchangeRates } from "./types";

interface MetalsDevResponse {
	status: string;
	currency: string;
	unit: string;
	metals: Record<string, number>;
	currencies: Record<string, number>;
	timestamps: {
		metal: string;
		currency: string;
	};
}

export class Exchange {
	private rates: ExchangeRates = {};
	private metals: Set<string> = new Set();
	private currencies: Set<string> = new Set();
	private lastMetalUpdate: Date | null = null;
	private lastCurrencyUpdate: Date | null = null;
	private lastUpdate: Date | null = null;
	private updateInterval: number = parseInt(process.env.UPDATE_INTERVAL || "60") || 60;
	private intervalId: NodeJS.Timeout | null = null;
	private apiKey: string;
	private baseCurrency: string = "USD";

	constructor() {
		this.apiKey = process.env.METALS_DEV_API_KEY || "";
		if (!this.apiKey) {
			throw new Error("METALS_DEV_API_KEY is required in environment variables");
		}
	}

	async initialize(): Promise<void> {
		await this.updateRates();
		this.startPeriodicUpdate();
	}

	async updateRates(): Promise<void> {
		try {
			const response = await fetch(`https://api.metals.dev/v1/latest?api_key=${this.apiKey}&currency=${this.baseCurrency}&unit=g`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as MetalsDevResponse;

			if (data.status !== "success") {
				throw new Error(`API returned non-success status: ${data.status}`);
			}

			// Metals
			const filteredMetals: Record<string, number> = {};
			const metals: Set<string> = new Set();
			for (const [metal, rate] of Object.entries(data.metals)) {
				if (!metal.includes("_")) {
					const metalUpper = metal.toUpperCase();
					filteredMetals[metalUpper] = rate;
					metals.add(metalUpper);
				}
			}
			if (metals.size) this.metals = metals;
			this.lastMetalUpdate = new Date(data.timestamps.metal);

			// Currencies
			const currencies: Set<string> = new Set();
			for (const currency of Object.keys(data.currencies)) {
				currencies.add(currency);
			}
			if (currencies.size) this.currencies = currencies;
			this.lastCurrencyUpdate = new Date(data.timestamps.currency);

			const usdBaseRates: Record<string, number> = {
				...data.currencies,
				...filteredMetals,
			};

			const allRates: ExchangeRates = {};
			const assets = Object.keys(usdBaseRates);

			for (const from of assets) {
				allRates[from] = {};
				for (const to of assets) {
					if (from === to) {
						allRates[from][to] = 1;
					} else if (from === this.baseCurrency) {
						allRates[from][to] = this.roundRate(1 / usdBaseRates[to]!);
					} else if (to === this.baseCurrency) {
						allRates[from][to] = this.roundRate(usdBaseRates[from]!);
					} else {
						allRates[from][to] = this.roundRate(usdBaseRates[from]! / usdBaseRates[to]!);
					}
				}
			}

			this.rates = allRates;
			this.lastUpdate = new Date();

			Logger.debug(`[Exchange] Exchange rates updated for ${this.currencies.size} currencies and ${this.metals.size} metals (${assets.length} total assets).`);
		} catch (err: any) {
			Logger.error("[Exchange] Failed to update exchange rates:", err);
			throw err; // Re-throw on initialization to prevent server start with no data
		}
	}

	startPeriodicUpdate(): void {
		this.intervalId = setInterval(async () => {
			try {
				await this.updateRates();
			} catch (err: any) {
				Logger.error("[Exchange] Failed to update exchange rates during periodic update:", err);
				// Don't throw here - keep using cached rates
			}
		}, this.updateInterval * 1000);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	convert(amount: number, fromCurrency: string, toCurrency: string): number | undefined {
		if (fromCurrency === toCurrency) return amount;

		const fromRates = this.rates[fromCurrency];
		if (!fromRates) return undefined;

		const rate = fromRates[toCurrency];
		if (!rate) return undefined;

		return amount * rate;
	}

	getRate(fromCurrency: string, toCurrency: string): number | undefined {
		if (fromCurrency === toCurrency) return 1;
		const fromRates = this.rates[fromCurrency];
		if (!fromRates) return undefined;
		return fromRates[toCurrency];
	}

	getRates(symbol: string = "USD") {
		return this.rates[symbol] || {};
	}

	getSupportedCurrencies(): string[] {
		return Array.from(this.currencies).sort();
	}

	getSupportedMetals(): string[] {
		return Array.from(this.metals).sort();
	}

	getSupportedAssets(): string[] {
		return Object.keys(this.rates).sort();
	}

	isMetal(symbol: string): boolean {
		return this.metals.has(symbol);
	}

	isCurrency(symbol: string): boolean {
		return this.currencies.has(symbol);
	}

	getLastUpdate(): Date | null {
		return this.lastUpdate;
	}

	getLastCurrencyUpdate(): Date | null {
		return this.lastCurrencyUpdate;
	}

	getLastMetalUpdate(): Date | null {
		return this.lastMetalUpdate;
	}

	private roundRate(rate: number): number {
		if (rate >= 1) {
			return Math.round(rate * 10000) / 10000; // 4 decimals for rates >= 1
		} else if (rate >= 0.1) {
			return Math.round(rate * 100000) / 100000; // 5 decimals for rates 0.1-1
		} else if (rate >= 0.01) {
			return Math.round(rate * 1000000) / 1000000; // 6 decimals for rates 0.01-0.1
		} else if (rate >= 0.001) {
			return Math.round(rate * 10000000) / 10000000; // 7 decimals for rates 0.001-0.01
		} else if (rate >= 0.0001) {
			return Math.round(rate * 100000000) / 100000000; // 8 decimals for rates 0.0001-0.001
		} else if (rate >= 0.00001) {
			return Math.round(rate * 1000000000) / 1000000000; // 9 decimals for rates 0.00001-0.0001
		} else if (rate >= 0.000001) {
			return Math.round(rate * 10000000000) / 10000000000; // 10 decimals for rates 0.000001-0.00001
		} else {
			return rate; // No rounding for very small rates
		}
	}
}
