# RabbitForexAPI 🐰💱

A high-performance foreign exchange (Forex) and precious metals API built with Bun that fetches real-time exchange rate and metal price data from metals.dev and serves it through a REST API.

## Features

- 🚀 Blazing Fast - Built with Bun for optimal performance
- 💱 Real-time Forex Data - Automatically updates exchange rates at configurable intervals
- 🌍 Multi-currency Support - Convert between 150+ currencies with accurate cross-rates
- 🥇 Precious & Base Metals - Gold, Silver, Platinum, Palladium, Copper, Aluminum, Lead, Nickel, Zinc
- 📊 Metals.dev Data - Reliable source for both currency exchange rates and metal prices
- 🐳 Docker Ready - Easy deployment with Docker and Docker Compose
- 🏥 Health Checks - Built-in monitoring and health endpoints
- 🔄 Auto-restart - Automatic recovery on failures
- 📈 Smart Caching - Efficient cache control headers for optimal performance

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Environment Variables

Create a `.env` file in your project root:

```toml
# Server Configuration
SERVER_HOST="0.0.0.0"
SERVER_PORT=3000

# Metals.dev API Configuration
# Get your API key from https://metals.dev
# Required for fetching exchange rates
METALS_DEV_API_KEY="your_api_key_here"

# Update Interval (in seconds)
# How often to fetch new exchange rates from Metals.dev API
# Default: 60 (1 minute)
UPDATE_INTERVAL=60 # 1 minute

# Logging Configuration
# 0 = ERROR, 1 = WARN, 2 = AUDIT, 3 = INFO, 4 = HTTP, 5 = DEBUG, 6 = VERBOSE, 7 = SILLY
# Default: 3 (INFO) - Recommended: 3 for production, 5 for development
LOGGER_LEVEL=3

# Proxy Configuration
# Important: Set this to match your deployment environment to prevent IP spoofing
# Options: "aws" (AWS ELB/ALB), "azure" (Azure), "cloudflare" (Cloudflare),
#          "gcp" (Google Cloud), "nginx" (Nginx), "vercel" (Vercel),
#          "direct" (no proxy/development), "development" (dev with proxy headers)
# Default: "direct"
PROXY=direct
```

### Running with Docker Compose

```bash
docker-compose up -d
```

### Manual Docker Run

```bash
docker run -d \
  --name rabbitforexapi \
  -p 3000:3000 \
	-e METALS_DEV_API_KEY="your_api_key_here" \
  -e UPDATE_INTERVAL=60 \
  -e LOGGER_LEVEL=3 \
  -e PROXY=direct \
  rabbitcompany/rabbitforexapi:latest
```

## API Endpoints ([Swagger](https://docs.forex.rabbitmonitor.com))

### GET `/`

Health Check and Statistics

```json
{
	"program": "RabbitForexAPI",
	"version": "2.0.0",
	"sourceCode": "https://github.com/Rabbit-Company/RabbitForexAPI",
	"monitorStats": {
		"currencyCount": 174,
		"metalCount": 9,
		"totalAssetCount": 183,
		"updateInterval": "60s"
	},
	"httpStats": {
		"pendingRequests": 1
	},
	"lastUpdate": "2025-11-07T07:07:54.995Z"
}
```

### GET `/openapi.json`

OpenAPI specification

### GET `/v1/rates`

Get all exchange rates with USD as base (default)

```json
{
	"base": "USD",
	"rates": {
		"USD": 1,
		"EUR": 0.86702,
		"JPY": 153.4793,
		"GBP": 0.7624,
		"CHF": 0.80776,
		"GOLD": 0.0077614,
		"SILVER": 0.63833,
		"PLATINUM": 0.020007,
		"...": "..."
	},
	"timestamps": {
		"metal": "2025-11-07T07:06:07.016Z",
		"currency": "2025-11-07T07:06:10.544Z"
	}
}
```

### GET `/v1/rates/:asset`

Get all exchange rates with specified asset as base (currency or metal)

**Example**: `/v1/rates/GOLD` - Gold as base

```json
{
	"base": "GOLD",
	"rates": {
		"USD": 128.8432,
		"EUR": 111.7092,
		"JPY": 19774.7612,
		"GBP": 98.2304,
		"GOLD": 1,
		"SILVER": 82.2438,
		"PLATINUM": 2.5778,
		"...": "..."
	},
	"timestamps": {
		"metal": "2025-11-07T07:06:07.016Z",
		"currency": "2025-11-07T07:06:10.544Z"
	}
}
```

Example: `/v1/rates/EUR` - Euro as base

```json
{
	"base": "EUR",
	"rates": {
		"EUR": 1,
		"USD": 1.1534,
		"JPY": 177.02,
		"GBP": 0.87934,
		"GOLD": 0.0089518,
		"SILVER": 0.73623,
		"...": "..."
	},
	"timestamps": {
		"metal": "2025-11-07T07:06:07.016Z",
		"currency": "2025-11-07T07:06:10.544Z"
	}
}
```

### GET `/v1/assets`

Get lists of all supported currencies and metals

```json
{
	"currencies": ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "EUR", "USD", "GBP", "JPY", "CHF", "CAD", "..."],
	"metals": ["ALUMINUM", "COPPER", "GOLD", "LEAD", "NICKEL", "PALLADIUM", "PLATINUM", "SILVER", "ZINC"],
	"timestamps": {
		"metal": "2025-11-07T07:06:07.016Z",
		"currency": "2025-11-07T07:06:10.544Z"
	}
}
```

## Supported Assets

### Currencies (150+)

The API supports 150+ currencies, including:

- **Major Currencies**: USD, EUR, JPY, GBP, CHF, CAD, AUD, CNY
- **Emerging Markets**: BRL, INR, RUB, ZAR, TRY, MXN
- **Cryptocurrencies**: BTC
- **Regional Currencies**: AED, SAR, KWD, QAR, OMR
- **Asian Currencies**: SGD, HKD, KRW, THB, MYR, PHP, IDR
- **European Currencies**: NOK, SEK, DKK, PLN, CZK, HUF, RON
- **African Currencies**: NGN, KES, EGP, MAD, TND
- **American Currencies**: ARS, CLP, COP, PEN, UYU
- And many more...

### Metals (9)

**Precious Metals**:

- GOLD - Gold (per gram)
- SILVER - Silver (per gram)
- PLATINUM - Platinum (per gram)
- PALLADIUM - Palladium (per gram)

**Base Metals**:

- COPPER - Copper (per gram)
- ALUMINUM - Aluminum (per gram)
- LEAD - Lead (per gram)
- NICKEL - Nickel (per gram)
- ZINC - Zinc (per gram)

## Rate Calculation

Exchange rates are calculated using USD as the reference currency from metals.dev data:

- **USD to X**: Inverse of metals.dev rate (1 / rate)
- **X to USD**: Direct rate from metals.dev
- **X to Y**: Cross-rate calculation (USD/X ÷ USD/Y)

Rates are rounded intelligently based on their magnitude:

- **Rates ≥ 1**: 4 decimal places
- **Rates 0.1-1**: 5 decimal places
- **Rates 0.01-0.1**: 6 decimal places
- And progressively more precision for smaller rates
