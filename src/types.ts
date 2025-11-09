export type CloudProvider = "aws" | "azure" | "cloudflare" | "development" | "direct" | "gcp" | "nginx" | "vercel";

export interface ExchangeRates {
	[baseCurrency: string]: {
		[targetCurrency: string]: number;
	};
}

export interface CryptocurrencyRates {
	[crypto: string]: number;
}
