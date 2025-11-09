import { CryptoExchange } from "./crypto";
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
	private forexRates: ExchangeRates = {};
	private cryptoRates: ExchangeRates = {};

	private metals: Set<string> = new Set();
	private currencies: Set<string> = new Set();
	private cryptocurrencies: Set<string> = new Set();

	private lastMetalUpdate: Date | null = null;
	private lastCurrencyUpdate: Date | null = null;
	private lastCryptoUpdate: Date | null = null;
	private lastUpdate: Date | null = null;

	private updateInterval: number = parseInt(process.env.UPDATE_INTERVAL || "60") || 60;

	private intervalId: NodeJS.Timeout | null = null;
	private apiKey: string;
	private baseCurrency: string = "USD";
	private cryptoExchange: CryptoExchange;

	constructor() {
		this.apiKey = process.env.METALS_DEV_API_KEY || "";
		if (!this.apiKey) {
			throw new Error("METALS_DEV_API_KEY is required in environment variables");
		}
		this.cryptoExchange = new CryptoExchange();
	}

	async initialize(): Promise<void> {
		await this.cryptoExchange.initialize();
		await this.updateRates();
		this.startPeriodicUpdate();
	}

	async updateRates(): Promise<void> {
		try {
			const response = await fetch(`https://api.metals.dev/v1/latest?api_key=${this.apiKey}&currency=${this.baseCurrency}&unit=g`, {
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as MetalsDevResponse;

			if (data.status !== "success") {
				throw new Error(`API returned non-success status: ${data.status}`);
			}

			await this.updateForexRates(data);
			await this.updateCryptoRates();
			this.lastUpdate = new Date();
		} catch (err: any) {
			Logger.error("[Exchange] Failed to update exchange rates:", err);
			throw err; // Re-throw on initialization to prevent server start with no data
		}
	}

	private async updateForexRates(data: MetalsDevResponse): Promise<void> {
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
		this.metals = metals;
		this.lastMetalUpdate = new Date(data.timestamps.metal);

		// Currencies
		const currencies: Set<string> = new Set();
		for (const currency of Object.keys(data.currencies)) {
			currencies.add(currency);
		}
		this.currencies = currencies;
		this.lastCurrencyUpdate = new Date(data.timestamps.currency);

		const usdBaseRates: Record<string, number> = {
			...data.currencies,
			...filteredMetals,
		};

		const forexAssets = Object.keys(usdBaseRates);
		this.forexRates = this.buildRateMatrix(usdBaseRates, forexAssets);

		Logger.debug(`[Exchange] Forex rates updated for ${forexAssets.length} assets.`);
	}

	private async updateCryptoRates(): Promise<void> {
		const cryptoRates = this.cryptoExchange.getRates();
		this.cryptocurrencies = new Set(Object.keys(cryptoRates));
		this.lastCryptoUpdate = this.cryptoExchange.getLastUpdate();

		const allForexAssets = [...this.currencies, ...this.metals];
		const allCryptoAssets = Object.keys(cryptoRates);

		this.cryptoRates = this.buildCryptoRateMatrix(cryptoRates, allCryptoAssets, allForexAssets);

		Logger.debug(`[Exchange] Crypto rates updated for ${allCryptoAssets.length} cryptocurrencies.`);
	}

	private buildRateMatrix(usdBaseRates: Record<string, number>, assets: string[]): ExchangeRates {
		const rates: ExchangeRates = {};

		for (const from of assets) {
			rates[from] = {};

			for (const to of assets) {
				if (from === to) {
					rates[from][to] = 1;
					continue;
				}

				if (from === this.baseCurrency) {
					rates[from][to] = this.roundRate(1 / usdBaseRates[to]!);
				} else if (to === this.baseCurrency) {
					rates[from][to] = this.roundRate(usdBaseRates[from]!);
				} else {
					rates[from][to] = this.roundRate(usdBaseRates[from]! / usdBaseRates[to]!);
				}
			}
		}

		return rates;
	}

	private buildCryptoRateMatrix(cryptoRates: Record<string, number>, cryptoAssets: string[], forexAssets: string[]): ExchangeRates {
		const rates: ExchangeRates = {};
		const usdRate = 1;

		// Build crypto to forex rates
		for (const crypto of cryptoAssets) {
			rates[crypto] = {};
			const cryptoUsdRate = cryptoRates[crypto]!;

			// Crypto to USD (direct)
			rates[crypto]["USD"] = this.roundRate(cryptoUsdRate);

			// Crypto to other forex (via USD)
			for (const forex of forexAssets) {
				if (forex === "USD") continue;

				// Get forex to USD rate from forex rates
				const forexToUsd = this.forexRates["USD"]?.[forex];
				if (forexToUsd && forexToUsd > 0) {
					// crypto -> USD -> forex
					rates[crypto][forex] = this.roundRate(cryptoUsdRate / forexToUsd);
				}
			}
		}

		// Build forex to crypto rates
		for (const forex of forexAssets) {
			if (!rates[forex]) {
				rates[forex] = {};
			}

			const forexToUsd = this.forexRates["USD"]?.[forex];
			if (forexToUsd && forexToUsd > 0) {
				for (const crypto of cryptoAssets) {
					const cryptoUsdRate = cryptoRates[crypto]!;
					// forex -> USD -> crypto
					rates[forex][crypto] = this.roundRate(forexToUsd / cryptoUsdRate);
				}
			}
		}

		// Ensure USD has all crypto rates
		if (!rates["USD"]) {
			rates["USD"] = {};
		}
		for (const crypto of cryptoAssets) {
			const cryptoUsdRate = cryptoRates[crypto]!;
			rates["USD"][crypto] = this.roundRate(1 / cryptoUsdRate);
		}

		return rates;
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

	convertForex(amount: number, from: string, to: string): number | undefined {
		const fromRates = this.forexRates[from];
		if (!fromRates) return undefined;
		const rate = fromRates[to];
		if (!rate) return undefined;
		return amount * rate;
	}

	convertCrypto(amount: number, from: string, to: string): number | undefined {
		const fromRates = this.cryptoRates[from];
		if (!fromRates) return undefined;
		const rate = fromRates[to];
		if (!rate) return undefined;
		return amount * rate;
	}

	convert(amount: number, from: string, to: string): number | undefined {
		const fromIsCrypto = this.isCryptocurrency(from);
		const toIsCrypto = this.isCryptocurrency(to);

		if (fromIsCrypto || toIsCrypto) {
			return this.convertCrypto(amount, from, to);
		} else {
			return this.convertForex(amount, from, to);
		}
	}

	getForexRates(base: string = "USD"): Record<string, number> {
		return this.forexRates[base] || {};
	}

	getCryptoRates(base: string = "USD"): Record<string, number> {
		return this.cryptoRates[base] || {};
	}

	getSupportedCurrencies(): string[] {
		return Array.from(this.currencies).sort();
	}

	getSupportedMetals(): string[] {
		return Array.from(this.metals).sort();
	}

	getSupportedCryptocurrencies(): string[] {
		return Array.from(this.cryptocurrencies).sort();
	}

	getSupportedAssets(): string[] {
		return [...this.getSupportedCurrencies(), ...this.getSupportedMetals(), ...this.getSupportedCryptocurrencies()].sort();
	}

	isMetal(symbol: string): boolean {
		return this.metals.has(symbol);
	}

	isCurrency(symbol: string): boolean {
		return this.currencies.has(symbol);
	}

	isCryptocurrency(symbol: string): boolean {
		return this.cryptocurrencies.has(symbol);
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

	getLastCryptoUpdate(): Date | null {
		return this.lastCryptoUpdate;
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
