export type CloudProvider = "aws" | "azure" | "cloudflare" | "development" | "direct" | "gcp" | "nginx" | "vercel";

export interface FiatRates {
	[baseCurrency: string]: {
		[targetCurrency: string]: number;
	};
}
