export type CloudProvider = "aws" | "azure" | "cloudflare" | "development" | "direct" | "gcp" | "nginx" | "vercel";

export interface ExchangeRates {
	[baseCurrency: string]: {
		[targetCurrency: string]: number;
	};
}

export interface CryptocurrencyRates {
	[crypto: string]: number;
}

export interface Instrument {
	ticker: string;
	type: string;
	workingScheduleId: number;
	isin: string;
	currencyCode: string;
	name: string;
	shortName: string;
	maxOpenQuantity: number;
	addedOn: string;
}

export interface PortfolioItem {
	ticker: string;
	quantity: number;
	averagePrice: number;
	currentPrice: number;
	ppl: number;
	fxPpl: number | null;
	initialFillDate: string;
	frontend: string;
	maxBuy: number;
	maxSell: number;
	picQuantity: number;
}

export interface StockData {
	price: number;
	currency: string;
	updated: number;
}

export interface StocksResponse {
	stocks: Record<string, StockData>;
}

export interface MetalData {
	price: number; // Price per gram in USD
	updated: number;
}

export interface MetalsResponse {
	metals: Record<string, MetalData>;
}

export interface MetalRatesResponse {
	base: string;
	rates: Record<string, number>;
	timestamps: {
		metal: string | null;
		currency: string | null;
	};
}

export type AssetType = "currency" | "metal" | "crypto" | "stock";
export type Resolution = "raw" | "hourly" | "daily";

export interface PricePoint {
	symbol: string;
	assetType: AssetType;
	priceUsd: number;
	timestamp: Date;
}

export interface RawPriceRecord {
	timestamp: string;
	price: number;
}

export interface AggregatedPriceRecord {
	timestamp: string;
	avg: number;
	min: number;
	max: number;
	open: number;
	close: number;
	sampleCount: number;
}

export interface HistoryResponse {
	symbol: string;
	base: string;
	resolution: Resolution;
	data: RawPriceRecord[] | AggregatedPriceRecord[];
}
