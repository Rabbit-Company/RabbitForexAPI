import { Logger } from "./logger";

interface KrakenTickerResponse {
	error: string[];
	result: {
		[pair: string]: {
			a: [string, string, string];
			b: [string, string, string];
			c: [string, string];
			v: [string, string];
			p: [string, string];
			t: [number, number];
			l: [string, string];
			h: [string, string];
			o: string;
		};
	};
}

interface BinanceTickerResponse {
	symbol: string;
	price: string;
}

interface GateTickerResponse {
	currency_pair: string;
	last: string;
	lowest_ask: string;
	highest_bid: string;
	change_percentage: string;
	base_volume: string;
	quote_volume: string;
	high_24h: string;
	low_24h: string;
}

interface KuCoinPricesResponse {
	code: string;
	data: {
		[crypto: string]: string;
	};
}

interface BingXTickerResponse {
	code: number;
	msg: string;
	data: {
		symbol: string;
		price: string;
		time: number;
	}[];
}

interface ByBitTickerResponse {
	retCode: number;
	retMsg: string;
	result: {
		category: string;
		list: {
			symbol: string;
			bid1Price: string;
			bid1Size: string;
			ask1Price: string;
			ask1Size: string;
			lastPrice: string;
			prevPrice24h: string;
			price24hPcnt: string;
			highPrice24h: string;
			lowPrice24h: string;
			turnover24h: string;
			volume24h: string;
			usdIndexPrice: string;
		}[];
	};
	retExtInfo: Record<string, unknown>;
	time: number;
}

interface CryptoTickerResponse {
	id: number;
	method: string;
	code: number;
	result: {
		data: {
			i: string; // Instrument name
			h: string; // 24h highest trade
			l: string; // 24h lowest trade
			a: string; // Latest trade price
			v: string; // 24h traded volume
			vv: string; // 24h traded volume value (USD)
			c: string; // 24h price change
			b: string; // Current best bid price
			k: string; // Current best ask price
			oi: string | null; // Open interest
			t: number; // Timestamp
		}[];
	};
}

type BitfinexTickerResponse = Array<Array<string | number>>;

interface ExchangeRates {
	[crypto: string]: number;
}

export interface CryptocurrencyRates {
	[crypto: string]: number;
}

export interface CryptoRateDetails {
	price: number;
	sources: string[];
	timestamp: Date;
}

export class CryptoExchange {
	private rates: CryptocurrencyRates = {};
	private rateDetails: Map<string, CryptoRateDetails> = new Map();
	private cryptocurrencies: Set<string> = new Set();
	private lastUpdate: Date | null = null;
	private updateInterval: number = parseInt(process.env.CRYPTO_UPDATE_INTERVAL || "30") || 30;
	private intervalId: NodeJS.Timeout | null = null;

	private allowedCryptos: Set<string> = new Set();

	private useBinance: boolean = true;
	private useKraken: boolean = true;
	private useGate: boolean = true;
	private useKuCoin: boolean = true;
	private useBingX: boolean = true;
	private useByBit: boolean = true;
	private useCryptoCom: boolean = true;
	private useBitfinex: boolean = true;

	constructor() {}

	async initialize(): Promise<void> {
		const envCryptos = process.env.ENABLED_CRYPTOS ? process.env.ENABLED_CRYPTOS.split(",").map((s) => s.trim().toUpperCase()) : [];
		this.allowedCryptos = new Set(envCryptos);
		this.useBinance = process.env.USE_BINANCE !== "false";
		this.useKraken = process.env.USE_KRAKEN !== "false";
		this.useGate = process.env.USE_GATE !== "false";
		this.useKuCoin = process.env.USE_KUCOIN !== "false";
		this.useBingX = process.env.USE_BINGX !== "false";
		this.useByBit = process.env.USE_BYBIT !== "false";
		this.useCryptoCom = process.env.USE_CRYPTOCOM !== "false";
		this.useBitfinex = process.env.USE_BITFINEX !== "false";

		if (
			!this.useBinance &&
			!this.useKraken &&
			!this.useGate &&
			!this.useKuCoin &&
			!this.useBingX &&
			!this.useByBit &&
			!this.useCryptoCom &&
			!this.useBitfinex
		) {
			throw new Error("At least one crypto exchange must be enabled (Binance, Kraken, Gate, KuCoin, BingX, ByBit, Crypto.com or Bitfinex)");
		}

		await this.updateRates();
		this.startPeriodicUpdate();
	}

	private normalizeKrakenSymbol(pair: string): string {
		const krakenSymbolMap: Record<string, string> = {
			XBT: "BTC",
			XXBT: "BTC",
			XETH: "ETH",
			XDG: "DOGE",
			XXRP: "XRP",
			XXMR: "XMR",
			XXLM: "XLM",
			XZEC: "ZEC",
		};

		let base = pair.replace(/(USD|USDT)$/i, "");
		base = base.replace(/^X/, "").replace(/Z$/, "");
		return krakenSymbolMap[base] || base;
	}

	private normalizeBinanceSymbol(symbol: string): string {
		return symbol.replace(/USDT$|USD$/, "");
	}

	private normalizeGateIOSymbol(currencyPair: string): string {
		return currencyPair.replace("_USDT", "").replace("_USD", "");
	}

	private normalizeBingXSymbol(symbol: string): string {
		return symbol.replace("-USDT", "").replace("-USD", "");
	}

	private normalizeByBitSymbol(symbol: string): string {
		return symbol.replace("USDT", "").replace("USD", "");
	}

	private normalizeCryptoComSymbol(instrument: string): string {
		return instrument.replace("_USDT", "").replace("_USD", "");
	}

	private normalizeBitfinexSymbol(symbol: string): string {
		return symbol.replace(/^t/, "").replace(/(USD|USDT)$/, "");
	}

	private async fetchKrakenRates(): Promise<ExchangeRates> {
		const krakenRates: ExchangeRates = {};

		try {
			const response = await fetch("https://api.kraken.com/0/public/Ticker", { signal: AbortSignal.timeout(5000) });

			if (!response.ok) {
				throw new Error(`Kraken HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as KrakenTickerResponse;

			if (data.error && data.error.length > 0) {
				throw new Error(`Kraken API returned errors: ${data.error.join(", ")}`);
			}

			for (const [pair, ticker] of Object.entries(data.result)) {
				if (pair.endsWith("USD") || pair.endsWith("USDT")) {
					const crypto = this.normalizeKrakenSymbol(pair);

					if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

					const price = parseFloat(ticker.c[0]);
					if (!isNaN(price) && price > 0) {
						krakenRates[crypto] = price;
					}
				}
			}

			Logger.debug(`[CryptoExchange] Kraken rates fetched for ${Object.keys(krakenRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch Kraken rates:", err);
		}

		return krakenRates;
	}

	private async fetchBinanceRates(): Promise<ExchangeRates> {
		const binanceRates: ExchangeRates = {};

		try {
			const response = await fetch("https://api.binance.com/api/v3/ticker/price", { signal: AbortSignal.timeout(5000) });

			if (!response.ok) {
				throw new Error(`Binance HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as BinanceTickerResponse[];

			for (const ticker of data) {
				if (ticker.symbol.endsWith("USDT")) {
					const crypto = this.normalizeBinanceSymbol(ticker.symbol);

					if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

					const price = parseFloat(ticker.price);
					if (!isNaN(price) && price > 0) {
						binanceRates[crypto] = price;
					}
				}
			}

			Logger.debug(`[CryptoExchange] Binance rates fetched for ${Object.keys(binanceRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch Binance rates:", err);
		}

		return binanceRates;
	}

	private async fetchGateRates(): Promise<ExchangeRates> {
		const gateRates: ExchangeRates = {};

		try {
			const response = await fetch("https://api.gateio.ws/api/v4/spot/tickers", { signal: AbortSignal.timeout(5000) });

			if (!response.ok) {
				throw new Error(`Gate HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as GateTickerResponse[];

			for (const ticker of data) {
				if (ticker.currency_pair.endsWith("_USDT") || ticker.currency_pair.endsWith("_USD")) {
					const crypto = this.normalizeGateIOSymbol(ticker.currency_pair);

					if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

					const price = parseFloat(ticker.last);
					if (!isNaN(price) && price > 0) {
						gateRates[crypto] = price;
					}
				}
			}

			Logger.debug(`[CryptoExchange] Gate rates fetched for ${Object.keys(gateRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch Gate rates:", err);
		}

		return gateRates;
	}

	private async fetchKuCoinRates(): Promise<ExchangeRates> {
		const kuCoinRates: ExchangeRates = {};

		try {
			const response = await fetch("https://api.kucoin.com/api/v1/prices", { signal: AbortSignal.timeout(5000) });

			if (!response.ok) {
				throw new Error(`KuCoin HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as KuCoinPricesResponse;

			if (data.code !== "200000") {
				throw new Error(`KuCoin API returned error code: ${data.code}`);
			}

			for (const [crypto, priceStr] of Object.entries(data.data)) {
				if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

				const price = parseFloat(priceStr);
				if (!isNaN(price) && price > 0) {
					kuCoinRates[crypto] = price;
				}
			}

			Logger.debug(`[CryptoExchange] KuCoin rates fetched for ${Object.keys(kuCoinRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch KuCoin rates:", err);
		}

		return kuCoinRates;
	}

	private async fetchBingXRates(): Promise<ExchangeRates> {
		const bingXRates: ExchangeRates = {};

		try {
			const response = await fetch("https://open-api.bingx.com/openApi/swap/v1/ticker/price", {
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				throw new Error(`BingX HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as BingXTickerResponse;

			if (data.code !== 0) {
				throw new Error(`BingX API returned error code: ${data.code}, message: ${data.msg}`);
			}

			for (const ticker of data.data) {
				if (ticker.symbol.endsWith("-USDT") || ticker.symbol.endsWith("-USD")) {
					const crypto = this.normalizeBingXSymbol(ticker.symbol);

					if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

					const price = parseFloat(ticker.price);
					if (!isNaN(price) && price > 0) {
						bingXRates[crypto] = price;
					}
				}
			}

			Logger.debug(`[CryptoExchange] BingX rates fetched for ${Object.keys(bingXRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch BingX rates:", err);
		}

		return bingXRates;
	}

	private async fetchByBitRates(): Promise<ExchangeRates> {
		const byBitRates: ExchangeRates = {};

		try {
			const response = await fetch("https://api.bybit.com/v5/market/tickers?category=spot", {
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				throw new Error(`ByBit HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as ByBitTickerResponse;

			if (data.retCode !== 0) {
				throw new Error(`ByBit API returned error code: ${data.retCode}, message: ${data.retMsg}`);
			}

			for (const ticker of data.result.list) {
				if (ticker.symbol.endsWith("USDT") || ticker.symbol.endsWith("USD")) {
					const crypto = this.normalizeByBitSymbol(ticker.symbol);

					if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

					const price = parseFloat(ticker.lastPrice);
					if (!isNaN(price) && price > 0) {
						byBitRates[crypto] = price;
					}
				}
			}

			Logger.debug(`[CryptoExchange] ByBit rates fetched for ${Object.keys(byBitRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch ByBit rates:", err);
		}

		return byBitRates;
	}

	private async fetchCryptoComRates(): Promise<ExchangeRates> {
		const cryptoComRates: ExchangeRates = {};

		try {
			const response = await fetch("https://api.crypto.com/exchange/v1/public/get-tickers", {
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				throw new Error(`Crypto.com HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as CryptoTickerResponse;

			if (data.code !== 0) {
				throw new Error(`Crypto.com API returned error code: ${data.code}`);
			}

			for (const ticker of data.result.data) {
				if (ticker.i.endsWith("_USDT") || ticker.i.endsWith("_USD")) {
					const crypto = this.normalizeCryptoComSymbol(ticker.i);

					if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;
					let price: number = parseFloat(ticker.a);

					if (!isNaN(price) && price > 0) {
						cryptoComRates[crypto] = price;
					}
				}
			}

			Logger.debug(`[CryptoExchange] Crypto.com rates fetched for ${Object.keys(cryptoComRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch Crypto.com rates:", err);
		}

		return cryptoComRates;
	}

	private async fetchBitfinexRates(): Promise<ExchangeRates> {
		const bitfinexRates: ExchangeRates = {};

		try {
			const response = await fetch("https://api-pub.bitfinex.com/v2/tickers?symbols=ALL", {
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				throw new Error(`Bitfinex HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as BitfinexTickerResponse;

			for (const ticker of data) {
				const symbol = ticker[0] as string;

				if (symbol.startsWith("t") && (symbol.endsWith("USD") || symbol.endsWith("USDT"))) {
					const crypto = this.normalizeBitfinexSymbol(symbol);
					if (crypto.includes(":")) continue;

					if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

					// Bitfinex trading pair ticker structure:
					// [0] SYMBOL, [1] BID, [2] BID_SIZE, [3] ASK, [4] ASK_SIZE,
					// [5] DAILY_CHANGE, [6] DAILY_CHANGE_RELATIVE, [7] LAST_PRICE,
					// [8] VOLUME, [9] HIGH, [10] LOW

					// Use LAST_PRICE (index 7) as the primary price, fallback to mid price if not available
					let price: number;
					const lastPrice = ticker[7] as number;

					if (lastPrice && lastPrice > 0) {
						price = lastPrice;
					} else {
						// Calculate mid price from bid/ask if last price is not available
						const bid = ticker[1] as number;
						const ask = ticker[3] as number;
						if (bid > 0 && ask > 0) {
							price = (bid + ask) / 2;
						} else {
							continue;
						}
					}

					if (!isNaN(price) && price > 0) {
						bitfinexRates[crypto] = price;
					}
				}
			}

			Logger.debug(`[CryptoExchange] Bitfinex rates fetched for ${Object.keys(bitfinexRates).length} cryptocurrencies.`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to fetch Bitfinex rates:", err);
		}

		return bitfinexRates;
	}

	private calculateOptimalPrice(
		crypto: string,
		krakenPrice: number | undefined,
		binancePrice: number | undefined,
		gatePrice: number | undefined,
		kuCoinPrice: number | undefined,
		bingXPrice: number | undefined,
		byBitPrice: number | undefined,
		cryptoComPrice: number | undefined,
		bitfinexPrice: number | undefined
	): { price: number; sources: string[] } {
		const prices: { price: number; source: string }[] = [];

		if (krakenPrice !== undefined) prices.push({ price: krakenPrice, source: "kraken" });
		if (binancePrice !== undefined) prices.push({ price: binancePrice, source: "binance" });
		if (gatePrice !== undefined) prices.push({ price: gatePrice, source: "gate" });
		if (kuCoinPrice !== undefined) prices.push({ price: kuCoinPrice, source: "kucoin" });
		if (bingXPrice !== undefined) prices.push({ price: bingXPrice, source: "bingx" });
		if (byBitPrice !== undefined) prices.push({ price: byBitPrice, source: "bybit" });
		if (cryptoComPrice !== undefined) prices.push({ price: cryptoComPrice, source: "cryptocom" });
		if (bitfinexPrice !== undefined) prices.push({ price: bitfinexPrice, source: "bitfinex" });

		if (prices.length === 0) {
			throw new Error("No prices available from any exchange");
		}

		if (prices.length === 1) {
			return { price: prices[0]!.price, sources: [prices[0]!.source] };
		}

		const filteredPrices = this.removeOutliersPercentage(prices);

		let finalPrice: number;
		let finalSources: string[];

		if (filteredPrices.length === 0) {
			// Fallback to median if all prices are considered outliers
			finalPrice = this.calculateMedian(prices.map((p) => p.price));
			finalSources = prices.map((p) => p.source);
			Logger.silly(`[CryptoExchange] All prices considered outliers for ${crypto}, using median: ${finalPrice}`);
		} else if (filteredPrices.length === 1) {
			// Use the single remaining price
			finalPrice = filteredPrices[0]!.price;
			finalSources = [filteredPrices[0]!.source];
			Logger.silly(`[CryptoExchange] Only one price remaining after outlier removal for ${crypto}: ${finalPrice} from ${finalSources[0]}`);
		} else {
			// Use average of filtered prices (no outliers)
			finalPrice = this.calculateAverage(filteredPrices.map((p) => p.price));
			finalSources = filteredPrices.map((p) => p.source);

			if (filteredPrices.length < prices.length) {
				const removedCount = prices.length - filteredPrices.length;
				Logger.silly(`[CryptoExchange] Removed ${removedCount} outlier(s) for ${crypto}`);
			}
		}

		return { price: finalPrice, sources: finalSources };
	}

	private calculateAverage(values: number[]): number {
		if (values.length === 0) return 0;
		const sum = values.reduce((acc, price) => acc + price, 0);
		return sum / values.length;
	}

	private removeOutliersPercentage(prices: { price: number; source: string }[]): { price: number; source: string }[] {
		if (prices.length < 2) return prices;

		const median = this.calculateMedian(prices.map((p) => p.price));
		const maxDeviation = median * 0.2; // 20% threshold
		const filtered = prices.filter((p) => Math.abs(p.price - median) <= maxDeviation);

		return filtered.length > 0 ? filtered : prices;
	}

	private calculateMedian(values: number[]): number {
		if (values.length === 0) return 0;

		const sorted = [...values].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);

		if (sorted.length % 2 === 0) {
			return (sorted[mid - 1]! + sorted[mid]!) / 2;
		} else {
			return sorted[mid]!;
		}
	}

	async updateRates(): Promise<void> {
		try {
			const promises = [];
			if (this.useKraken) promises.push(this.fetchKrakenRates());
			if (this.useBinance) promises.push(this.fetchBinanceRates());
			if (this.useGate) promises.push(this.fetchGateRates());
			if (this.useKuCoin) promises.push(this.fetchKuCoinRates());
			if (this.useBingX) promises.push(this.fetchBingXRates());
			if (this.useByBit) promises.push(this.fetchByBitRates());
			if (this.useCryptoCom) promises.push(this.fetchCryptoComRates());
			if (this.useBitfinex) promises.push(this.fetchBitfinexRates());

			const results = await Promise.all(promises);

			let resultIndex = 0;
			const krakenRates = this.useKraken ? results[resultIndex++]! : {};
			const binanceRates = this.useBinance ? results[resultIndex++]! : {};
			const gateRates = this.useGate ? results[resultIndex++]! : {};
			const kuCoinRates = this.useKuCoin ? results[resultIndex++]! : {};
			const bingXRates = this.useBingX ? results[resultIndex++]! : {};
			const byBitRates = this.useByBit ? results[resultIndex++]! : {};
			const cryptoComRates = this.useCryptoCom ? results[resultIndex++]! : {};
			const bitfinexRates = this.useBitfinex ? results[resultIndex++]! : {};

			const allCryptos = new Set([
				...Object.keys(krakenRates),
				...Object.keys(binanceRates),
				...Object.keys(gateRates),
				...Object.keys(kuCoinRates),
				...Object.keys(bingXRates),
				...Object.keys(byBitRates),
				...Object.keys(cryptoComRates),
				...Object.keys(bitfinexRates),
			]);

			const newRates: CryptocurrencyRates = {};
			const newRateDetails: Map<string, CryptoRateDetails> = new Map();
			const enabledCryptos: Set<string> = new Set();

			for (const crypto of allCryptos) {
				if (this.allowedCryptos.size > 0 && !this.allowedCryptos.has(crypto)) continue;

				try {
					const krakenPrice = krakenRates[crypto];
					const binancePrice = binanceRates[crypto];
					const gatePrice = gateRates[crypto];
					const kuCoinPrice = kuCoinRates[crypto];
					const bingXPrice = bingXRates[crypto];
					const byBitPrice = byBitRates[crypto];
					const cryptoComPrice = cryptoComRates[crypto];
					const bitfinexPrice = bitfinexRates[crypto];

					const { price, sources } = this.calculateOptimalPrice(
						crypto,
						krakenPrice,
						binancePrice,
						gatePrice,
						kuCoinPrice,
						bingXPrice,
						byBitPrice,
						cryptoComPrice,
						bitfinexPrice
					);

					newRates[crypto] = price;
					newRateDetails.set(crypto, {
						price,
						sources,
						timestamp: new Date(),
					});
					enabledCryptos.add(crypto);

					if (sources.length > 1) {
						Logger.silly(`[CryptoExchange] ${crypto}: ${price} (avg of ${sources.join(", ")})`);
					} else {
						Logger.silly(`[CryptoExchange] ${crypto}: ${price} (${sources[0]} only)`);
					}
				} catch (err: any) {
					Logger.warn(`[CryptoExchange] Could not calculate price for ${crypto}:`, err);
				}
			}

			this.rates = newRates;
			this.rateDetails = newRateDetails;
			this.cryptocurrencies = enabledCryptos;
			this.lastUpdate = new Date();

			Logger.debug(`[CryptoExchange] Combined rates updated for ${this.cryptocurrencies.size} cryptocurrencies.`);
			Logger.debug(`[CryptoExchange] Enabled cryptos: ${Array.from(enabledCryptos).sort().join(", ")}`);
		} catch (err: any) {
			Logger.error("[CryptoExchange] Failed to update cryptocurrency rates:", err);
			throw err;
		}
	}

	startPeriodicUpdate(): void {
		this.intervalId = setInterval(async () => {
			try {
				await this.updateRates();
			} catch (err: any) {
				Logger.error("[CryptoExchange] Failed to update cryptocurrency rates during periodic update:", err);
			}
		}, this.updateInterval * 1000);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	getRate(cryptocurrency: string): number | undefined {
		return this.rates[cryptocurrency];
	}

	getRateDetails(cryptocurrency: string): CryptoRateDetails | undefined {
		return this.rateDetails.get(cryptocurrency);
	}

	getRates(): CryptocurrencyRates {
		return { ...this.rates };
	}

	getAllRateDetails(): Map<string, CryptoRateDetails> {
		return new Map(this.rateDetails);
	}

	getSupportedCryptocurrencies(): string[] {
		return Array.from(this.cryptocurrencies).sort();
	}

	getLastUpdate(): Date | null {
		return this.lastUpdate;
	}

	getExchangeStatus(): {
		kraken: boolean;
		binance: boolean;
		gate: boolean;
		kucoin: boolean;
		bingx: boolean;
		bybit: boolean;
		cryptocom: boolean;
		bitfinex: boolean;
	} {
		return {
			kraken: this.useKraken,
			binance: this.useBinance,
			gate: this.useGate,
			kucoin: this.useKuCoin,
			bingx: this.useBingX,
			bybit: this.useByBit,
			cryptocom: this.useCryptoCom,
			bitfinex: this.useBitfinex,
		};
	}
}
