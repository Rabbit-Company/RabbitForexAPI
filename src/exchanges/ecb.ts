import { XMLParser } from "fast-xml-parser";
import { Logger } from "../logger";
import type { FiatRates } from "../types";

export class EuropeanCentralBankExchange {
	private rates: FiatRates = {};
	private lastUpdate: Date | null = null;
	private updateInterval: number = parseInt(process.env.UPDATE_INTERVAL || "3600") || 3600;
	private intervalId: NodeJS.Timeout | null = null;

	constructor() {}

	async initialize(): Promise<void> {
		await this.updateRates();
		this.startPeriodicUpdate();
	}

	async updateRates(): Promise<void> {
		try {
			const response = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
			const text = await response.text();

			const parser = new XMLParser({ ignoreAttributes: false });
			const obj = parser.parse(text);

			const fiats = obj?.["gesmes:Envelope"]?.Cube?.Cube?.Cube || [];

			const eurBaseRates: Record<string, number> = { EUR: 1 };

			fiats.forEach((fiat: any) => {
				const currency = fiat["@_currency"];
				const rate = parseFloat(fiat["@_rate"]);
				eurBaseRates[currency] = rate;
			});

			const allRates: FiatRates = {};
			const currencies = Object.keys(eurBaseRates);

			for (const from of currencies) {
				allRates[from] = {};
				for (const to of currencies) {
					if (from === to) {
						allRates[from][to] = 1;
					} else if (from === "EUR") {
						allRates[from][to] = this.roundRate(eurBaseRates[to]!);
					} else if (to === "EUR") {
						allRates[from][to] = this.roundRate(1 / eurBaseRates[from]!);
					} else {
						allRates[from][to] = this.roundRate(eurBaseRates[to]! / eurBaseRates[from]!);
					}
				}
			}

			this.rates = allRates;
			this.lastUpdate = new Date();

			Logger.info(`[ECB] Exchange rates updated for ${currencies.length} currencies.`);
		} catch (err: any) {
			Logger.error("[ECB] Failed to update exchange rates:", err);
		}
	}

	startPeriodicUpdate(): void {
		this.intervalId = setInterval(() => {
			this.updateRates();
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

	getRates(symbol: string = "EUR") {
		return this.rates[symbol] || {};
	}

	getSupportedCurrencies(): string[] {
		return Object.keys(this.rates);
	}

	getLastUpdate(): Date | null {
		return this.lastUpdate;
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
