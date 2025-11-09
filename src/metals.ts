import { Logger } from "./logger";

interface GoldAPIResponse {
	name: string;
	price: number;
	symbol: string;
	updatedAt: string;
	updatedAtReadable: string;
}

interface MetalData {
	price: number; // Price per gram in USD
	updated: number;
}

export interface MetalsResponse {
	metals: Record<string, MetalData>;
}

export class MetalExchange {
	private metals: Record<string, MetalData> = {};
	private lastUpdate: Date | null = null;
	private updateInterval: number;

	private intervalId: NodeJS.Timeout | null = null;

	// Metal symbols mapping
	private metalSymbols = ["XAU", "XAG", "XPD", "HG"];
	private metalMapping: { [key: string]: string } = {
		XAU: "GOLD",
		XAG: "SILVER",
		XPD: "PALLADIUM",
		HG: "COPPER",
	};

	constructor() {
		this.updateInterval = parseInt(process.env.METAL_UPDATE_INTERVAL || "30") || 30;
	}

	async initialize(): Promise<void> {
		await this.updateMetalPrices();
		this.startPeriodicUpdate();

		Logger.info(`[MetalExchange] Metal monitoring initialized with ${this.getMetalCount()} metals`);
	}

	async updateMetalPrices(): Promise<void> {
		try {
			const metalPrices = await this.fetchMetalPrices();

			const timestamp = Date.now();
			const newMetals: Record<string, MetalData> = {};

			for (const [symbol, price] of Object.entries(metalPrices)) {
				if (price > 0) {
					// Convert (price per ounce or price per pound) to price per gram
					const pricePerGram = symbol === "HG" ? price / 453.59237 : price / 28.349523125;
					const metalCode = this.metalMapping[symbol];
					if (metalCode) {
						newMetals[metalCode] = {
							price: pricePerGram,
							updated: timestamp,
						};
					}
				}
			}

			this.metals = newMetals;
			this.lastUpdate = new Date();

			Logger.debug(`[MetalExchange] Updated ${Object.keys(this.metals).length} metal prices`);
		} catch (error: any) {
			Logger.error("[MetalExchange] Error updating metal prices", error);
			throw error;
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
					Logger.warn(`[MetalExchange] Failed to fetch price for ${symbol}`);
					metalPrices[symbol] = 0; // Mark as failed
				}
			}
		} catch (err: any) {
			Logger.error("[MetalExchange] Error fetching metal prices:", err);
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
				Logger.silly(`[MetalExchange] ${symbol} price: ${data.price}`);
				return data.price;
			} else {
				throw new Error(`Invalid price for ${symbol}: ${data.price}`);
			}
		} catch (err: any) {
			Logger.error(`[MetalExchange] Failed to fetch ${symbol} price:`, err.message);
			return null;
		}
	}

	startPeriodicUpdate(): void {
		const actualInterval = Math.max(this.updateInterval, 10);
		this.intervalId = setInterval(async () => {
			try {
				await this.updateMetalPrices();
			} catch (err: any) {
				Logger.error("[MetalExchange] Failed to update metal prices during periodic update:", err);
			}
		}, actualInterval * 1000);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	getMetals(): MetalsResponse {
		return { metals: { ...this.metals } };
	}

	getMetal(symbol: string): MetalData | undefined {
		return this.metals[symbol];
	}

	getSupportedMetals(): string[] {
		return Object.keys(this.metals).sort();
	}

	getMetalCount(): number {
		return Object.keys(this.metals).length;
	}

	getLastUpdate(): Date | null {
		return this.lastUpdate;
	}

	getMetalPriceInUSD(metal: string): number | undefined {
		return this.metals[metal]?.price;
	}
}
