# RabbitForexAPI 🐰💱

A high-performance foreign exchange (Forex), precious metals, and cryptocurrency API built with Bun that fetches real-time exchange rate data from multiple sources and serves it through a REST API.

## Features

- 🚀 Blazing Fast - Built with Bun for optimal performance
- 💱 Real-time Forex Data - Automatically updates exchange rates at configurable intervals
- ₿ Cryptocurrency Support - Real-time crypto prices from multiple exchanges (Binance, Kraken, Gate, KuCoin, BingX, ByBit, Crypto.com, Bitfinex)
- 🌍 Multi-currency Support - Convert between 150+ currencies with accurate cross-rates
- 🥇 Precious & Base Metals - Gold, Silver, Platinum, Palladium, Copper, Aluminum, Lead, Nickel, Zinc
- 📊 Metals.dev Data - Reliable source for both currency exchange rates and metal prices
- 🔄 Smart Price Aggregation - Combines multiple crypto exchanges for optimal pricing with outlier detection
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
UPDATE_INTERVAL=60

# Crypto Exchange Configuration
# Enable or disable fetching prices from crypto exchanges
USE_KRAKEN=true
USE_BINANCE=true
USE_GATEIO=true
USE_KUCOIN=true
USE_BINGX=true
USE_BYBIT=true
USE_CRYPTOCOM=true
USE_BITFINEX=true

# How often to fetch cryptocurrency prices from enabled crypto exchanges (in seconds)
# Default: 30 (30 seconds)
CRYPTO_UPDATE_INTERVAL=30

# Cryptocurrencies to monitor (comma-separated list)
# Example: BTC,ETH,SOL,ADA,XRP
ENABLED_CRYPTOS=AAVE,ADA,ALGO,ARB,ATOM,AVAX,BCH,BNB,BTC,CELO,CRO,DASH,DOGE,DOT,EGLD,EOS,ETC,ETH,FIL,FLOW,GRT,HNT,ICP,IMX,INJ,IOTA,KAS,LINK,LTC,MINA,NANO,NEAR,NEO,POL,QTUM,RUNE,RVN,S,SEI,SOL,STX,THETA,TIA,TON,TRX,VET,WAVES,XLM,XMR,XRP,XTZ,ZEC,ZIL

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
	-e CRYPTO_UPDATE_INTERVAL=30 \
	-e ENABLED_CRYPTOS="BTC,ETH,SOL,ADA,XRP" \
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
	"version": "3.0.1",
	"sourceCode": "https://github.com/Rabbit-Company/RabbitForexAPI",
	"monitorStats": {
		"currencyCount": 174,
		"metalCount": 9,
		"cryptoCount": 2885,
		"totalAssetCount": 3068,
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

### GET `/v1/crypto/rates`

Get all cryptocurrency rates with USD as base (default)

```json
{
	"base": "USD",
	"rates": {
		"BTC": 0.0000098082,
		"ETH": 0.00029232,
		"SOL": 0.0062949,
		"ADA": 1.7876,
		"XRP": 0.4379,
		"DOT": 0.32144,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"metal": "2025-11-07T07:06:07.016Z",
		"crypto": "2025-11-07T07:06:05.123Z"
	}
}
```

### GET `/v1/crypto/rates/:asset`

Get all cryptocurrency rates with specified asset as base (currency, metal, or cryptocurrency)

Example: `/v1/crypto/rates/BTC` - Bitcoin as base

```json
{
	"base": "BTC",
	"rates": {
		"USD": 101565.0019,
		"EUR": 87787.71,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"metal": "2025-11-07T07:06:07.016Z",
		"crypto": "2025-11-07T07:06:05.123Z"
	}
}
```

Example: `/v1/crypto/rates/EUR` - Euro as base for crypto rates

```json
{
	"base": "EUR",
	"rates": {
		"BTC": 0.000011571,
		"ETH": 0.00034673,
		"SOL": 0.0074452,
		"ADA": 2.1322,
		"XRP": 0.52006,
		"DOT": 0.38543,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"metal": "2025-11-07T07:06:07.016Z",
		"crypto": "2025-11-07T07:06:05.123Z"
	}
}
```

### GET `/v1/assets`

Get lists of all supported currencies, metals and cryptocurrencies

```json
{
	"currencies": ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "EUR", "USD", "GBP", "JPY", "CHF", "CAD", "..."],
	"metals": ["ALUMINUM", "COPPER", "GOLD", "LEAD", "NICKEL", "PALLADIUM", "PLATINUM", "SILVER", "ZINC"],
	"cryptocurrencies": ["BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "DOGE", "AVAX", "LINK", "..."],
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"metal": "2025-11-07T07:06:07.016Z",
		"crypto": "2025-11-07T07:06:05.123Z"
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

- **GOLD** - Gold (per gram)
- **SILVER** - Silver (per gram)
- **PLATINUM** - Platinum (per gram)
- **PALLADIUM** - Palladium (per gram)

**Base Metals**:

- **COPPER** - Copper (per gram)
- **ALUMINUM** - Aluminum (per gram)
- **LEAD** - Lead (per gram)
- **NICKEL** - Nickel (per gram)
- **ZINC** - Zinc (per gram)

### Cryptocurrencies (2500+)

The API supports 2500+ major cryptocurrencies, including:

- **Major Cryptocurrencies**: BTC, ETH, BNB, SOL, XRP, ADA, DOGE, AVAX, DOT, TRX
- **DeFi Tokens**: AAVE, UNI, LINK, MKR, COMP, SUSHI
- **Layer 2 & Scaling**: ARB, OP, POL, IMX
- **Interoperability**: ATOM, DOT, NEAR
- **Meme Coins**: DOGE, SHIB
- **Privacy Coins**: XMR, ZEC
- **Gaming & Metaverse**: SAND, MANA, AXS
- And many more...

## Rate Calculation

### Forex & Metals Rates

Exchange rates are calculated using USD as the reference currency from metals.dev data:

- **USD to X**: Inverse of metals.dev rate (1 / rate)
- **X to USD**: Direct rate from metals.dev
- **X to Y**: Cross-rate calculation (USD/X ÷ USD/Y)

Rates are rounded intelligently based on their magnitude:

- **Rates ≥ 1**: 4 decimal places
- **Rates 0.1-1**: 5 decimal places
- **Rates 0.01-0.1**: 6 decimal places
- And progressively more precision for smaller rates

### Cryptocurrency Rates

Cryptocurrency prices are aggregated from multiple exchanges for optimal pricing:

- **Supported Exchanges**: Binance, Kraken, Gate, KuCoin, BingX, ByBit, Crypto.com, Bitfinex
- **Smart Aggregation**: Combines prices from multiple sources with outlier detection
- **Optimal Pricing**: Uses average of filtered prices (removing outliers beyond 20% deviation)
- **Fallback Logic**: Falls back to median if all prices are outliers

Rates are rounded intelligently based on their magnitude:

- **Rates ≥ 1**: 4 decimal places
- **Rates 0.1-1**: 5 decimal places
- **Rates 0.01-0.1**: 6 decimal places
- And progressively more precision for smaller rates
