import { CryptoExchange } from "./crypto";
import { Logger } from "./logger";
import { MetalExchange } from "./metals";
import { StockExchange } from "./stock";
import type { ExchangeRates, MetalData, StockData } from "./types";

interface WiseRate {
	source: string;
	target: string;
	rate: number;
	time: string;
}

export class Exchange {
	private forexRates: ExchangeRates = {};
	private cryptoRates: ExchangeRates = {};
	private stockRates: ExchangeRates = {};
	private metalRates: ExchangeRates = {};

	private metals: Set<string> = new Set();
	private currencies: Set<string> = new Set();
	private cryptocurrencies: Set<string> = new Set();
	private stocks: Set<string> = new Set();

	private lastMetalUpdate: Date | null = null;
	private lastCurrencyUpdate: Date | null = null;
	private lastCryptoUpdate: Date | null = null;
	private lastStockUpdate: Date | null = null;
	private lastUpdate: Date | null = null;

	private updateInterval: number = parseInt(process.env.UPDATE_INTERVAL || "60") || 60;

	private intervalId: NodeJS.Timeout | null = null;
	private wiseApiKey: string;
	private baseCurrency: string = "USD";
	private cryptoExchange: CryptoExchange;
	private stockExchange: StockExchange;
	private metalExchange: MetalExchange;

	constructor() {
		this.wiseApiKey = process.env.WISE_API_KEY || "";

		if (!this.wiseApiKey) {
			throw new Error("WISE_API_KEY is required in environment variables");
		}

		this.cryptoExchange = new CryptoExchange();
		this.stockExchange = new StockExchange();
		this.metalExchange = new MetalExchange();
	}

	async initialize(): Promise<void> {
		await this.cryptoExchange.initialize();
		await this.stockExchange.initialize();
		await this.metalExchange.initialize();
		await this.updateRates();
		this.startPeriodicUpdate();
	}

	async updateRates(): Promise<void> {
		try {
			await this.updateForexRates();
			await this.updateMetalRates();
			await this.updateCryptoRates();
			await this.updateStockRates();
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
					usdBaseRates[rate.target] = 1 / rate.rate;
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
		const metalData = this.metalExchange.getMetals();
		this.metals = new Set(Object.keys(metalData.metals));
		this.lastMetalUpdate = this.metalExchange.getLastUpdate();

		const allForexAssets = Array.from(this.currencies);
		const allMetalAssets = Array.from(this.metals);

		this.metalRates = this.buildMetalRateMatrix(metalData.metals, allMetalAssets, allForexAssets);

		Logger.debug(`[Exchange] Metal rates updated for ${allMetalAssets.length} metals.`);
	}

	private buildMetalRateMatrix(metalRates: Record<string, MetalData>, metalAssets: string[], forexAssets: string[]): ExchangeRates {
		const rates: ExchangeRates = {};

		// Build metal to forex rates
		for (const metal of metalAssets) {
			rates[metal] = {};
			const metalData = metalRates[metal];
			if (!metalData) continue;

			const metalPriceUSD = metalData.price;

			// Metal to USD (direct)
			rates[metal]["USD"] = this.roundRate(metalPriceUSD);

			// Metal to other forex (via USD)
			for (const forex of forexAssets) {
				if (forex === "USD") continue;

				// Get USD to forex rate from forex rates
				const usdToForex = this.forexRates["USD"]?.[forex];
				if (usdToForex && usdToForex > 0) {
					// metal -> USD -> forex
					rates[metal][forex] = this.roundRate(metalPriceUSD * usdToForex);
				}
			}
		}

		// Build forex to metal rates
		for (const forex of forexAssets) {
			if (!rates[forex]) {
				rates[forex] = {};
			}

			// Get USD to forex rate from forex rates
			const usdToForex = this.forexRates["USD"]?.[forex];
			if (usdToForex && usdToForex > 0) {
				for (const metal of metalAssets) {
					const metalData = metalRates[metal];
					if (!metalData) continue;

					const metalPriceUSD = metalData.price;
					// forex -> USD -> metal
					// If 1 USD = X forex, then 1 forex = 1/X USD
					// So 1 forex = (1/X) / metalPriceUSD grams of metal
					rates[forex][metal] = this.roundRate(1 / usdToForex / metalPriceUSD);
				}
			}
		}

		// Ensure USD has all metal rates
		if (!rates["USD"]) {
			rates["USD"] = {};
		}
		for (const metal of metalAssets) {
			const metalData = metalRates[metal];
			if (metalData) {
				rates["USD"][metal] = this.roundRate(1 / metalData.price);
			}
		}

		return rates;
	}

	private async updateCryptoRates(): Promise<void> {
		const cryptoRates = this.cryptoExchange.getRates();
		this.cryptocurrencies = new Set(Object.keys(cryptoRates));
		this.lastCryptoUpdate = this.cryptoExchange.getLastUpdate();

		const allForexAssets = [...this.currencies];
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

				const fromToUsd = from === "USD" ? 1 : usdBaseRates[from] || 1;
				const toToUsd = to === "USD" ? 1 : usdBaseRates[to] || 1;

				// from -> USD -> to
				rates[from][to] = this.roundRate(fromToUsd / toToUsd);
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

				// Get USD to forex rate from forex rates
				const usdToForex = this.forexRates["USD"]?.[forex];
				if (usdToForex && usdToForex > 0) {
					// crypto -> USD -> forex
					rates[crypto][forex] = this.roundRate(cryptoUsdRate * usdToForex);
				}
			}
		}

		// Build forex to crypto rates
		for (const forex of forexAssets) {
			if (!rates[forex]) {
				rates[forex] = {};
			}

			// Get USD to forex rate from forex rates
			const usdToForex = this.forexRates["USD"]?.[forex];
			if (usdToForex && usdToForex > 0) {
				for (const crypto of cryptoAssets) {
					const cryptoUsdRate = cryptoRates[crypto]!;
					// forex -> USD -> crypto
					// If 1 USD = X forex, then 1 forex = 1/X USD
					// So 1 forex = (1/X) / cryptoUsdRate crypto
					rates[forex][crypto] = this.roundRate(1 / usdToForex / cryptoUsdRate);
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

	private async updateStockRates(): Promise<void> {
		const stockData = this.stockExchange.getStocks();
		this.stocks = new Set(Object.keys(stockData.stocks));
		this.lastStockUpdate = this.stockExchange.getLastUpdate();

		const allForexAssets = Array.from(this.currencies);
		const allStockAssets = Array.from(this.stocks);

		this.stockRates = this.buildStockRateMatrix(stockData.stocks, allStockAssets, allForexAssets);

		Logger.debug(`[Exchange] Stock rates updated for ${allStockAssets.length} stocks.`);
	}

	private buildStockRateMatrix(stockRates: Record<string, StockData>, stockAssets: string[], forexAssets: string[]): ExchangeRates {
		const rates: ExchangeRates = {};

		// Build stock to forex rates
		for (const stock of stockAssets) {
			rates[stock] = {};
			const stockData = stockRates[stock];
			if (!stockData) continue;

			const stockPrice = stockData.price;
			const stockCurrency = stockData.currency;

			// Stock to its own currency (direct)
			rates[stock][stockCurrency] = this.roundRate(stockPrice);

			// Stock to other forex (via stock's currency)
			for (const forex of forexAssets) {
				if (forex === stockCurrency) continue;

				// Get stock currency to forex conversion rate from forex rates
				const currencyToForex = this.forexRates[stockCurrency]?.[forex];
				if (currencyToForex && currencyToForex > 0) {
					// stock -> stockCurrency -> forex
					rates[stock][forex] = this.roundRate(stockPrice * currencyToForex);
				}
			}
		}

		// Build forex to stock rates
		for (const forex of forexAssets) {
			if (!rates[forex]) {
				rates[forex] = {};
			}

			for (const stock of stockAssets) {
				const stockData = stockRates[stock];
				if (!stockData) continue;

				const stockPrice = stockData.price;
				const stockCurrency = stockData.currency;

				// Get forex to stock's currency rate
				const forexToCurrency = this.forexRates[forex]?.[stockCurrency];
				if (forexToCurrency && forexToCurrency > 0) {
					// forex -> stockCurrency -> stock
					rates[forex][stock] = this.roundRate(forexToCurrency / stockPrice);
				}
			}
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
		this.stockExchange.stop();
		this.metalExchange.stop();
	}

	convert(amount: number, from: string, to: string): number | undefined {
		if (from === to) return amount;

		// Try direct conversion first
		let rate: number | undefined;

		if (this.isCurrency(from) && this.isCurrency(to)) {
			rate = this.forexRates[from]?.[to];
		} else if (this.isMetal(from) && this.isMetal(to)) {
			rate = this.metalRates[from]?.[to];
		} else if (this.isCryptocurrency(from) && this.isCryptocurrency(to)) {
			rate = this.cryptoRates[from]?.[to];
		} else if (this.isStock(from) && this.isStock(to)) {
			rate = this.stockRates[from]?.[to];
		} else {
			// Cross-asset conversion via USD
			const fromUsdValue = this.getUsdValue(from);
			if (fromUsdValue === undefined) return undefined;

			const usdAmount = amount * fromUsdValue;
			return this.getAssetFromUsd(usdAmount, to);
		}

		return rate !== undefined ? amount * rate : undefined;
	}

	private getUsdValue(asset: string): number | undefined {
		if (asset === "USD") return 1;

		if (this.isCurrency(asset)) {
			return this.forexRates[asset]?.["USD"];
		} else if (this.isMetal(asset)) {
			return this.metalRates[asset]?.["USD"];
		} else if (this.isCryptocurrency(asset)) {
			return this.cryptoRates[asset]?.["USD"];
		} else if (this.isStock(asset)) {
			const stockData = this.stockExchange.getStocks().stocks[asset];
			if (!stockData) return undefined;
			const currencyRate = this.forexRates[stockData.currency]?.["USD"];
			if (!currencyRate) return undefined;
			return stockData.price * currencyRate;
		}
		return undefined;
	}

	private getAssetFromUsd(usdAmount: number, toAsset: string): number | undefined {
		if (toAsset === "USD") return usdAmount;

		if (this.isCurrency(toAsset)) {
			const rate = this.forexRates["USD"]?.[toAsset];
			return rate ? usdAmount * rate : undefined;
		} else if (this.isMetal(toAsset)) {
			const rate = this.metalRates["USD"]?.[toAsset];
			return rate ? usdAmount * rate : undefined;
		} else if (this.isCryptocurrency(toAsset)) {
			const rate = this.cryptoRates["USD"]?.[toAsset];
			return rate ? usdAmount * rate : undefined;
		} else if (this.isStock(toAsset)) {
			const stockData = this.stockExchange.getStocks().stocks[toAsset];
			if (!stockData) return undefined;
			const currencyRate = this.forexRates["USD"]?.[stockData.currency];
			if (!currencyRate) return undefined;
			return (usdAmount * currencyRate) / stockData.price;
		}
		return undefined;
	}

	getForexRates(base: string = "USD"): Record<string, number> {
		return this.forexRates[base] || {};
	}

	getCryptoRates(base: string = "USD"): Record<string, number> {
		return this.cryptoRates[base] || {};
	}

	getStockRates(base: string = "USD"): Record<string, number> {
		return this.stockRates[base] || {};
	}

	getMetalRates(base: string = "USD"): Record<string, number> {
		return this.metalRates[base] || {};
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

	getSupportedStocks(): string[] {
		return Array.from(this.stocks).sort();
	}

	getSupportedAssets(): string[] {
		return [...this.getSupportedCurrencies(), ...this.getSupportedMetals(), ...this.getSupportedCryptocurrencies(), ...this.getSupportedStocks()].sort();
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

	isStock(symbol: string): boolean {
		return this.stocks.has(symbol);
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

	getLastStockUpdate(): Date | null {
		return this.lastStockUpdate;
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
