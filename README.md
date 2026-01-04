# RabbitForexAPI 🐰💱

A high-performance foreign exchange (Forex), precious metals, stocks, and cryptocurrency API built with Bun that fetches real-time exchange rate data from multiple sources and serves it through a REST API.

## Features

- 🚀 Blazing Fast - Built with Bun for optimal performance
- 💱 Real-time Forex Data - Automatically updates exchange rates at configurable intervals
- ₿ Cryptocurrency Support - Real-time crypto prices from multiple exchanges (Binance, Kraken, Gate, KuCoin, BingX, ByBit, Crypto.com, Bitfinex)
- 📈 Stock Prices - Real-time stock data from Trading212
- 🌍 Multi-currency Support - Convert between 150+ currencies with accurate cross-rates
- 🥇 Metals - Gold, Silver, Palladium, Copper
- 📊 Wise - Reliable source for exchange rates
- 📜 Historical Data - Store and query historical prices with ClickHouse (raw, hourly, daily aggregates)
- 🔄 Smart Price Aggregation - Combines multiple crypto exchanges for optimal pricing with outlier detection
- 🐳 Docker Ready - Easy deployment with Docker and Docker Compose
- 🥐 Health Checks - Built-in monitoring and health endpoints
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

# Wise API Configuration
# Get your API key from https://wise.com (Read Only)
# Required for fetching forex rates
WISE_API_KEY="your_wise_api_key_here"

# Update Interval (in seconds)
# How often to fetch new exchange rates from Wise API
# Default: 30 (30 seconds)
UPDATE_INTERVAL=30

# Trading212 Configuration
# Get your API key from https://www.trading212.com
TRADING212_API_KEY="your_trading212_api_key_here"
TRADING212_API_SECRET="your_trading212_api_secret_here"

# Stock Update Interval (in seconds)
# How often to fetch new stock prices from Trading212 API
# Default: 30 (30 seconds) - Minimum: 10 (10 seconds)
STOCK_UPDATE_INTERVAL=30

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

# Enable or disable OpenMetrics endpoint
# Default: false
OPEN_METRICS_ENABLED=false

# Protect OpenMetrics API endpoint with Bearer authentication
# Set to "none" to disable authentication (not recommended for production)
# Default: none
OPEN_METRICS_AUTH_TOKEN=none

# Enable/disable history recording
HISTORY_ENABLED=true

# ClickHouse Connection
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=rabbitforex
CLICKHOUSE_USERNAME=rabbitforex_user
CLICKHOUSE_PASSWORD=rabbitforex_password

# ClickHouse Performance Settings
CLICKHOUSE_COMPRESSION=true
CLICKHOUSE_MAX_CONNECTIONS=10
CLICKHOUSE_TIMEOUT=30000
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
  -e WISE_API_KEY="your_wise_api_key_here" \
  -e UPDATE_INTERVAL=30 \
  -e TRADING212_API_KEY="your_trading212_api_key_here" \
  -e TRADING212_API_SECRET="your_trading212_api_secret_here" \
  -e STOCK_UPDATE_INTERVAL=30 \
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
	"version": "4.1.0",
	"sourceCode": "https://github.com/Rabbit-Company/RabbitForexAPI",
	"monitorStats": {
		"currencyCount": 162,
		"metalCount": 4,
		"cryptoCount": 2886,
		"stockCount": 23,
		"totalAssetCount": 3075,
		"updateInterval": "30s",
		"historyEnabled": true
	},
	"httpStats": {
		"pendingRequests": 1
	},
	"lastUpdate": "2025-11-07T07:07:54.995Z"
}
```

### GET `/metrics`

Returns metrics in OpenMetrics format for Prometheus monitoring.

**Authentication**: Protected with Bearer token (configure via `OPEN_METRICS_AUTH_TOKEN` environment variable)

**Response**: OpenMetrics text format

**Example**:

```text
# TYPE rabbitforex_http_requests counter
# HELP rabbitforex_http_requests Total HTTP requests
rabbitforex_http_requests_total 0 1764012335.777
rabbitforex_http_requests_total{endpoint="/metrics"} 52 1764012466.32
rabbitforex_http_requests_total{endpoint="/"} 18 1764012414.1
rabbitforex_http_requests_created 1764012335.777 1764012335.777
rabbitforex_http_requests_created{endpoint="/metrics"} 1764012396.269 1764012466.32
rabbitforex_http_requests_created{endpoint="/"} 1764012410.614 1764012414.1
# EOF
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
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z"
	}
}
```

### GET `/v1/rates/:asset`

Get all exchange rates with specified asset as base

Example: `/v1/rates/EUR` - Euro as base

```json
{
	"base": "EUR",
	"rates": {
		"EUR": 1,
		"USD": 1.1534,
		"JPY": 177.02,
		"GBP": 0.87934,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z"
	}
}
```

### GET `/v1/rates/history/:symbol`

Get raw price history for a currency (last 24 hours)

Example: `/v1/rates/history/EUR`

```json
{
	"symbol": "EUR",
	"base": "USD",
	"resolution": "raw",
	"data": [
		{
			"timestamp": "2025-11-07T06:30:00.000Z",
			"price": 1.0892
		},
		{
			"timestamp": "2025-11-07T06:30:30.000Z",
			"price": 1.0895
		}
	]
}
```

### GET `/v1/rates/history/:symbol/hourly`

Get hourly aggregated price history for a currency (last 90 days)

Example: `/v1/rates/history/EUR/hourly`

```json
{
	"symbol": "EUR",
	"base": "USD",
	"resolution": "hourly",
	"data": [
		{
			"timestamp": "2025-11-07T06:00:00Z",
			"avg": 1.0898,
			"min": 1.0885,
			"max": 1.0912,
			"open": 1.0892,
			"close": 1.0905,
			"sampleCount": 120
		}
	]
}
```

### GET `/v1/rates/history/:symbol/daily`

Get daily aggregated price history for a currency (all time)

Example: `/v1/rates/history/EUR/daily`

```json
{
	"symbol": "EUR",
	"base": "USD",
	"resolution": "daily",
	"data": [
		{
			"timestamp": "2025-11-07",
			"avg": 1.09,
			"min": 1.085,
			"max": 1.095,
			"open": 1.0875,
			"close": 1.092,
			"sampleCount": 2880
		}
	]
}
```

### GET `/v1/metals/rates`

Get all metal rates with USD as base (default)

```json
{
	"base": "USD",
	"rates": {
		"GOLD": 0.0077614,
		"SILVER": 0.63833,
		"PLATINUM": 0.020007,
		"COPPER": 93.4827
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"metal": "2025-11-07T07:06:07.016Z"
	}
}
```

### GET `/v1/metals/rates/:asset`

Get all metal rates with specified asset as base (currency or metal)

**Example**: `/v1/metals/rates/GOLD` - Gold as base

```json
{
	"base": "GOLD",
	"rates": {
		"USD": 128.8432,
		"EUR": 111.7092,
		"JPY": 19774.7612,
		"GBP": 98.2304,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"metal": "2025-11-07T07:06:07.016Z"
	}
}
```

Example: `/v1/metals/rates/EUR` - Euro as base

```json
{
	"base": "EUR",
	"rates": {
		"GOLD": 0.0081904,
		"SILVER": 0.67794,
		"PALLADIUM": 0.023327,
		"COPPER": 108.0754
	},
	"timestamps": {
		"currency": "2025-11-09T21:00:31.465Z",
		"metal": "2025-11-09T21:00:31.153Z"
	}
}
```

### GET `/v1/metals/history/:symbol`

Get raw price history for a metal (last 24 hours)

Example: `/v1/metals/history/GOLD`

```json
{
	"symbol": "GOLD",
	"base": "USD",
	"resolution": "raw",
	"data": [
		{
			"timestamp": "2025-11-07T06:30:00.000Z",
			"price": 4332.32
		}
	]
}
```

### GET `/v1/metals/history/:symbol/hourly`

Get hourly aggregated price history for a metal (last 90 days)

Example: `/v1/metals/history/GOLD/hourly`

```json
{
	"symbol": "GOLD",
	"base": "USD",
	"resolution": "hourly",
	"data": [
		{
			"timestamp": "2025-11-07T06:00:00Z",
			"avg": 4332.32,
			"min": 4246.65,
			"max": 4374.73,
			"open": 4314.41,
			"close": 4353.63,
			"sampleCount": 120
		}
	]
}
```

### GET `/v1/metals/history/:symbol/daily`

Get daily aggregated price history for a metal (all time)

Example: `/v1/metals/history/GOLD/daily`

```json
{
	"symbol": "GOLD",
	"base": "USD",
	"resolution": "daily",
	"data": [
		{
			"timestamp": "2025-11-07",
			"avg": 4332.32,
			"min": 4246.65,
			"max": 4374.73,
			"open": 4314.41,
			"close": 4353.63,
			"sampleCount": 2880
		}
	]
}
```

### GET `/v1/metals/history/:symbol/currency/:base`

Get raw price history for a metal converted to specified currency using historical exchange rates (last 24 hours)

Example: `/v1/metals/history/GOLD/currency/EUR`

```json
{
	"symbol": "GOLD",
	"base": "EUR",
	"resolution": "raw",
	"data": [
		{
			"timestamp": "2025-11-07T06:30:00.000Z",
			"price": 3978.54
		}
	]
}
```

### GET `/v1/metals/history/:symbol/currency/:base/hourly`

Get hourly aggregated price history for a metal converted to specified currency using historical exchange rates (last 90 days)

Example: `/v1/metals/history/GOLD/currency/EUR/hourly`

```json
{
	"symbol": "GOLD",
	"base": "EUR",
	"resolution": "hourly",
	"data": [
		{
			"timestamp": "2025-11-07T06:00:00Z",
			"avg": 3978.54,
			"min": 3899.85,
			"max": 4017.43,
			"open": 3962.13,
			"close": 3998.27,
			"sampleCount": 120
		}
	]
}
```

### GET `/v1/metals/history/:symbol/currency/:base/daily`

Get daily aggregated price history for a metal converted to specified currency using historical exchange rates (all time)

Example: `/v1/metals/history/GOLD/currency/EUR/daily`

```json
{
	"symbol": "GOLD",
	"base": "EUR",
	"resolution": "daily",
	"data": [
		{
			"timestamp": "2025-11-07",
			"avg": 3978.54,
			"min": 3899.85,
			"max": 4017.43,
			"open": 3962.13,
			"close": 3998.27,
			"sampleCount": 2880
		}
	]
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
		"crypto": "2025-11-07T07:06:05.123Z"
	}
}
```

### GET `/v1/crypto/rates/:asset`

Get all cryptocurrency rates with specified asset as base (currency or cryptocurrency)

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
		"crypto": "2025-11-07T07:06:05.123Z"
	}
}
```

### GET `/v1/crypto/history/:symbol`

Get raw price history for a cryptocurrency (last 24 hours)

Example: `/v1/crypto/history/BTC`

```json
{
	"symbol": "BTC",
	"base": "USD",
	"resolution": "raw",
	"data": [
		{
			"timestamp": "2025-11-07T06:30:00.000Z",
			"price": 97500.1234
		},
		{
			"timestamp": "2025-11-07T06:30:30.000Z",
			"price": 97520.5678
		}
	]
}
```

### GET `/v1/crypto/history/:symbol/hourly`

Get hourly aggregated price history for a cryptocurrency (last 90 days)

Example: `/v1/crypto/history/BTC/hourly`

```json
{
	"symbol": "BTC",
	"base": "USD",
	"resolution": "hourly",
	"data": [
		{
			"timestamp": "2025-11-07T06:00:00Z",
			"avg": 97500.0,
			"min": 96000.0,
			"max": 99000.0,
			"open": 96500.0,
			"close": 98000.0,
			"sampleCount": 120
		}
	]
}
```

### GET `/v1/crypto/history/:symbol/daily`

Get daily aggregated price history for a cryptocurrency (all time)

Example: `/v1/crypto/history/BTC/daily`

```json
{
	"symbol": "BTC",
	"base": "USD",
	"resolution": "daily",
	"data": [
		{
			"timestamp": "2025-11-07",
			"avg": 97500.0,
			"min": 95000.0,
			"max": 100000.0,
			"open": 96000.0,
			"close": 99000.0,
			"sampleCount": 2880
		}
	]
}
```

### GET `/v1/crypto/history/:symbol/currency/:base`

Get raw price history for a cryptocurrency converted to specified currency using historical exchange rates (last 24 hours)

Example: `/v1/crypto/history/BTC/currency/EUR`

```json
{
	"symbol": "BTC",
	"base": "EUR",
	"resolution": "raw",
	"data": [
		{
			"timestamp": "2025-11-07T06:30:00.000Z",
			"price": 89523.45
		},
		{
			"timestamp": "2025-11-07T06:30:30.000Z",
			"price": 89542.12
		}
	]
}
```

### GET `/v1/crypto/history/:symbol/currency/:base/hourly`

Get hourly aggregated price history for a cryptocurrency converted to specified currency using historical exchange rates (last 90 days)

Example: `/v1/crypto/history/BTC/currency/EUR/hourly`

```json
{
	"symbol": "BTC",
	"base": "EUR",
	"resolution": "hourly",
	"data": [
		{
			"timestamp": "2025-11-07T06:00:00Z",
			"avg": 89500.0,
			"min": 88120.0,
			"max": 90880.0,
			"open": 88567.0,
			"close": 89943.0,
			"sampleCount": 120
		}
	]
}
```

### GET `/v1/crypto/history/:symbol/currency/:base/daily`

Get daily aggregated price history for a cryptocurrency converted to specified currency using historical exchange rates (all time)

Example: `/v1/crypto/history/BTC/currency/EUR/daily`

```json
{
	"symbol": "BTC",
	"base": "EUR",
	"resolution": "daily",
	"data": [
		{
			"timestamp": "2025-11-07",
			"avg": 89500.0,
			"min": 87210.0,
			"max": 91800.0,
			"open": 88105.0,
			"close": 90873.0,
			"sampleCount": 2880
		}
	]
}
```

### GET `/v1/stocks/rates`

Get all stock rates with USD as base (default)

```json
{
	"base": "USD",
	"rates": {
		"VOW3d": 0.01227,
		"NET": 0.004275,
		"MSFT": 0.0020088,
		"ASMLa": 0.0013276,
		"V": 0.0029717,
		"UBNT": 0.0016181,
		"SMSDl": 0.00078125,
		"FB": 0.0015993,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"stock": "2025-11-07T07:06:05.123Z"
	}
}
```

### GET `/v1/stocks/rates/:asset`

Get all stock rates with specified asset as base (currency or stock)

Example: `/v1/stocks/rates/NET` - Cloudflare as base

```json
{
	"base": "NET",
	"rates": {
		"USD": 233.92,
		"HRK": 35.8903,
		"GHS": 21.4114,
		"BSD": 233.92,
		"BAM": 138.2631,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"stock": "2025-11-07T07:06:05.123Z"
	}
}
```

Example: `/v1/stocks/rates/EUR` - Euro as base for stock rates

```json
{
	"base": "EUR",
	"rates": {
		"VOW3d": 0.010613,
		"NET": 0.0036976,
		"MSFT": 0.0017375,
		"ASMLa": 0.0011484,
		"V": 0.0025703,
		"UBNT": 0.0013996,
		"SMSDl": 0.00067573,
		"FB": 0.0013833,
		"...": "..."
	},
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"stock": "2025-11-07T07:06:05.123Z"
	}
}
```

### GET `/v1/stocks/history/:symbol`

Get raw price history for a stock (last 24 hours)

Example: `/v1/stocks/history/NET`

```json
{
	"symbol": "NET",
	"base": "USD",
	"resolution": "raw",
	"data": [
		{
			"timestamp": "2025-11-07T06:30:00.000Z",
			"price": 196.1853
		},
		{
			"timestamp": "2025-11-07T06:30:30.000Z",
			"price": 198.9521
		}
	]
}
```

### GET `/v1/stocks/history/:symbol/hourly`

Get hourly aggregated price history for a stock (last 90 days)

Example: `/v1/stocks/history/NET/hourly`

```json
{
	"symbol": "NET",
	"base": "USD",
	"resolution": "hourly",
	"data": [
		{
			"timestamp": "2025-11-07T06:00:00Z",
			"avg": 197.1243,
			"min": 184.5493,
			"max": 210.4347,
			"open": 186.9825,
			"close": 205.7362,
			"sampleCount": 120
		}
	]
}
```

### GET `/v1/stocks/history/:symbol/daily`

Get daily aggregated price history for a stock (all time)

Example: `/v1/stocks/history/NET/daily`

```json
{
	"symbol": "NET",
	"base": "USD",
	"resolution": "daily",
	"data": [
		{
			"timestamp": "2025-11-07",
			"avg": 197.1243,
			"min": 184.5493,
			"max": 210.4347,
			"open": 186.9825,
			"close": 205.7362,
			"sampleCount": 2880
		}
	]
}
```

### GET `/v1/stocks/history/:symbol/currency/:base`

Get raw price history for a stock converted to specified currency using historical exchange rates (last 24 hours)

Example: `/v1/stocks/history/NET/currency/EUR`

```json
{
	"symbol": "NET",
	"base": "EUR",
	"resolution": "raw",
	"data": [
		{
			"timestamp": "2025-11-07T06:30:00.000Z",
			"price": 180.12
		},
		{
			"timestamp": "2025-11-07T06:30:30.000Z",
			"price": 182.65
		}
	]
}
```

### GET `/v1/stocks/history/:symbol/currency/:base/hourly`

Get hourly aggregated price history for a stock converted to specified currency using historical exchange rates (last 90 days)

Example: `/v1/stocks/history/NET/currency/EUR/hourly`

```json
{
	"symbol": "NET",
	"base": "EUR",
	"resolution": "hourly",
	"data": [
		{
			"timestamp": "2025-11-07T06:00:00Z",
			"avg": 180.94,
			"min": 169.39,
			"max": 193.16,
			"open": 171.62,
			"close": 188.83,
			"sampleCount": 120
		}
	]
}
```

### GET `/v1/stocks/history/:symbol/currency/:base/daily`

Get daily aggregated price history for a stock converted to specified currency using historical exchange rates (all time)

Example: `/v1/stocks/history/NET/currency/EUR/daily`

```json
{
	"symbol": "NET",
	"base": "EUR",
	"resolution": "daily",
	"data": [
		{
			"timestamp": "2025-11-07",
			"avg": 180.94,
			"min": 169.39,
			"max": 193.16,
			"open": 171.62,
			"close": 188.83,
			"sampleCount": 2880
		}
	]
}
```

### GET `/v1/assets`

Get lists of all supported currencies, metals and cryptocurrencies

```json
{
	"currencies": ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "EUR", "USD", "GBP", "JPY", "CHF", "CAD", "..."],
	"metals": ["GOLD", "SILVER", "PALLADIUM", "COPPER"],
	"cryptocurrencies": ["BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "DOGE", "AVAX", "LINK", "..."],
	"stocks": ["VOW3d", "NET", "MSFT", "ASMLa", "V", "UBNT", "SMSDl", "FB", "..."],
	"timestamps": {
		"currency": "2025-11-07T07:06:10.544Z",
		"metal": "2025-11-07T07:06:07.016Z",
		"crypto": "2025-11-07T07:06:05.123Z",
		"stock": "2025-11-07T07:06:05.123Z"
	}
}
```

## Historical Data

The API supports historical price data storage and retrieval using ClickHouse. When `HISTORY_ENABLED=true`, prices are recorded and aggregated at multiple resolutions.

### Data Retention

| Resolution | Endpoint Suffix | Data Retention | Cache TTL  |
| ---------- | --------------- | -------------- | ---------- |
| Raw        | (none)          | 1 day          | 30 seconds |
| Hourly     | `/hourly`       | 90 days        | 5 minutes  |
| Daily      | `/daily`        | Forever        | 1 hour     |

### Aggregation

An aggregation job runs every 10 minutes to compute:

- **Hourly aggregates**: From raw data after each hour completes
- **Daily aggregates**: From hourly data after each day completes

### Historical Currency Conversion

The API supports converting historical prices to different currencies using historical exchange rates. This ensures accurate price representation at the time of each data point.

**Endpoints with currency conversion:**

- `/v1/metals/history/:symbol/currency/:base[/hourly|/daily]`
- `/v1/crypto/history/:symbol/currency/:base[/hourly|/daily]`
- `/v1/stocks/history/:symbol/currency/:base[/hourly|/daily]`

**How it works:**

1. Fetch asset prices in USD from ClickHouse
2. Fetch historical currency rates for the target currency
3. For each data point, apply the historical conversion rate from the same time period
4. If no exact match is found, the closest available rate is used
5. Falls back to current rate if no historical data is available

**Example:** `/v1/crypto/history/BTC/currency/EUR/daily` returns Bitcoin prices converted to EUR using the EUR/USD rate from each respective day.

### Response Fields

**Raw data** includes:

- `price` - The price at that moment
- `timestamp` - ISO 8601 timestamp

**Aggregated data** (hourly/daily) includes:

- `timestamp` - Period start time
- `avg` - Average price in the period
- `min` - Minimum price in the period
- `max` - Maximum price in the period
- `open` - Opening price (first price)
- `close` - Closing price (last price)
- `sampleCount` - Number of data points

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

### Metals (4)

- **GOLD** - Gold (per gram)
- **SILVER** - Silver (per gram)
- **PALLADIUM** - Palladium (per gram)
- **COPPER** - Copper (per gram)

### Stocks (20+)

The API supports various stocks from major exchanges including:

- **Technology**: MSFT, NET, FB, UBNT, ASMLa
- **Automotive**: VOW3d
- **Financial**: V
- **Telecommunications**: SMSDl
- And many more...

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

Exchange rates are calculated using USD as the reference currency from Wise data:

- **USD to X**: Inverse of Wise rate (1 / rate)
- **X to USD**: Direct rate from Wise
- **X to Y**: Cross-rate calculation (USD/X ÷ USD/Y)

Rates are rounded intelligently based on their magnitude:

- **Rates ≥ 1**: 4 decimal places
- **Rates 0.1-1**: 5 decimal places
- **Rates 0.01-0.1**: 6 decimal places
- And progressively more precision for smaller rates

### Stock Rates

Stock prices are fetched from Trading212 API:

- **Direct Pricing**: Stocks are priced in their native currency (USD, EUR, GBP, etc.)
- **Cross-currency Conversion**: Stock prices are converted to other currencies using forex rates
- **GBX Handling**: British penny stocks (GBX) are automatically converted to GBP

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
