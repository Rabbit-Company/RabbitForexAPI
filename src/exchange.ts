import { CryptoExchange } from "./crypto";
import { Logger } from "./logger";
import type { ExchangeRates } from "./types";

interface WiseRate {
	source: string;
	target: string;
	rate: number;
	time: string;
}

interface GoldAPIResponse {
	name: string;
	price: number;
	symbol: string;
	updatedAt: string;
	updatedAtReadable: string;
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
	private wiseApiKey: string;
	private baseCurrency: string = "USD";
	private cryptoExchange: CryptoExchange;

	// Metal symbols mapping
	private metalSymbols = ["XAU", "XAG", "XPD", "HG"];
	private metalMapping: { [key: string]: string } = {
		XAU: "GOLD",
		XAG: "SILVER",
		XPD: "PALLADIUM",
		HG: "COPPER",
	};

	constructor() {
		this.wiseApiKey = process.env.WISE_API_KEY || "";

		if (!this.wiseApiKey) {
			throw new Error("WISE_API_KEY is required in environment variables");
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
			await this.updateForexRates();
			await this.updateMetalRates();
			await this.updateCryptoRates();
			this.lastUpdate = new Date();
		} catch (err: any) {
			Logger.error("[Exchange] Failed to update exchange rates:", err);
			throw err;
		}
	}

	private async updateForexRates(): Promise<void> {
		try {
			const response = await fetch(`https://api.wise.com/v1/rates?source=${this.baseCurrency}`, {
				signal: AbortSignal.timeout(5000),
				headers: {
					Authorization: `Bearer ${this.wiseApiKey}`,
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`Wise API HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as WiseRate[];

			const currencies: Set<string> = new Set();
			currencies.add(this.baseCurrency);

			// Build USD base rates
			const usdBaseRates: Record<string, number> = {
				[this.baseCurrency]: 1,
			};

			for (const rate of data) {
				if (rate.source === this.baseCurrency && rate.target !== this.baseCurrency) {
					usdBaseRates[rate.target] = rate.rate;
					currencies.add(rate.target);
				}
			}

			this.currencies = currencies;
			this.lastCurrencyUpdate = new Date();

			const forexAssets = Array.from(currencies);
			this.forexRates = this.buildRateMatrix(usdBaseRates, forexAssets);

			Logger.debug(`[Exchange] Forex rates updated for ${forexAssets.length} currencies.`);
		} catch (err: any) {
			Logger.error("[Exchange] Failed to fetch forex rates:", err);
			throw err;
		}
	}

	private async updateMetalRates(): Promise<void> {
		try {
			const metalPrices = await this.fetchMetalPrices();

			const metals: Set<string> = new Set();
			const usdBaseRates: Record<string, number> = { ...(this.forexRates[this.baseCurrency] || {}) };

			for (const [symbol, price] of Object.entries(metalPrices)) {
				if (price > 0) {
					// Convert (price per ounce or price per pound) to price per gram
					const pricePerGram = symbol === "HG" ? price / 453.59237 : price / 28.349523125;
					const metalCode = this.metalMapping[symbol];
					if (metalCode) {
						usdBaseRates[metalCode] = pricePerGram;
						metals.add(metalCode);
					}
				}
			}

			this.metals = metals;
			this.lastMetalUpdate = new Date();

			// Update forex rates to include metals
			const allAssets = [...Array.from(this.currencies), ...Array.from(metals)];
			this.forexRates = this.buildRateMatrix(usdBaseRates, allAssets);

			Logger.debug(`[Exchange] Metal rates updated for ${metals.size} metals.`);
		} catch (err: any) {
			Logger.error("[Exchange] Failed to fetch metal rates:", err);
			// Don't throw - metals are secondary, continue with forex rates only
		}
	}

	private async fetchMetalPrices(): Promise<{ [symbol: string]: number }> {
		const metalPrices: { [symbol: string]: number } = {};
		const promises = [];

		// Fetch all metal prices in parallel
		for (const symbol of this.metalSymbols) {
			promises.push(this.fetchSingleMetalPrice(symbol));
		}

		try {
			const results = await Promise.allSettled(promises);

			for (let i = 0; i < results.length; i++) {
				const result = results[i]!;
				const symbol = this.metalSymbols[i]!;

				if (result.status === "fulfilled" && result.value !== null) {
					metalPrices[symbol] = result.value;
				} else {
					Logger.warn(`[Exchange] Failed to fetch price for ${symbol}`);
					metalPrices[symbol] = 0; // Mark as failed
				}
			}
		} catch (err: any) {
			Logger.error("[Exchange] Error fetching metal prices:", err);
		}

		return metalPrices;
	}

	private async fetchSingleMetalPrice(symbol: string): Promise<number | null> {
		try {
			const response = await fetch(`https://api.gold-api.com/price/${symbol}`, {
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				throw new Error(`Gold-API HTTP error for ${symbol}! status: ${response.status}`);
			}

			const data = (await response.json()) as GoldAPIResponse;

			if (data.price && data.price > 0) {
				Logger.silly(`[Exchange] ${symbol} price: ${data.price}`);
				return data.price;
			} else {
				throw new Error(`Invalid price for ${symbol}: ${data.price}`);
			}
		} catch (err: any) {
			Logger.error(`[Exchange] Failed to fetch ${symbol} price:`, err.message);
			return null;
		}
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
					rates[from][to] = this.roundRate(1 / (usdBaseRates[to] || 1));
				} else if (to === this.baseCurrency) {
					rates[from][to] = this.roundRate(usdBaseRates[from] || 1);
				} else {
					const fromToUsd = usdBaseRates[from] || 1;
					const toToUsd = usdBaseRates[to] || 1;
					rates[from][to] = this.roundRate(fromToUsd / toToUsd);
				}
			}
		}

		return rates;
	}

	private buildCryptoRateMatrix(cryptoRates: Record<string, number>, cryptoAssets: string[], forexAssets: string[]): ExchangeRates {
		const rates: ExchangeRates = {};

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
					rates[crypto][forex] = this.roundRate(cryptoUsdRate * forexToUsd);
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
			}
		}, this.updateInterval * 1000);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.cryptoExchange.stop();
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
			return Math.round(rate * 10000) / 10000;
		} else if (rate >= 0.1) {
			return Math.round(rate * 100000) / 100000;
		} else if (rate >= 0.01) {
			return Math.round(rate * 1000000) / 1000000;
		} else if (rate >= 0.001) {
			return Math.round(rate * 10000000) / 10000000;
		} else if (rate >= 0.0001) {
			return Math.round(rate * 100000000) / 100000000;
		} else if (rate >= 0.00001) {
			return Math.round(rate * 1000000000) / 1000000000;
		} else if (rate >= 0.000001) {
			return Math.round(rate * 10000000000) / 10000000000;
		} else {
			return rate;
		}
	}
}
