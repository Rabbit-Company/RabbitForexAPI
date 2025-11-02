# RabbitForexAPI 🐰💱

A high-performance foreign exchange (Forex) API built with Bun that fetches real-time exchange rate data from the European Central Bank and serves it through a REST API.

## Features

- 🚀 Blazing Fast - Built with Bun for optimal performance
- 💱 Real-time Forex Data - Automatically updates exchange rates at configurable intervals
- 🌍 Multi-currency Support - Convert between 30+ currencies with accurate cross-rates
- 📊 European Central Bank Data - Reliable and official exchange rate source
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

# Update Interval (in seconds)
# How often to fetch new exchange rates from ECB
# Default: 3600 (1 hour) - ECB updates rates daily around 16:00 CET
UPDATE_INTERVAL=3600

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
  -e UPDATE_INTERVAL=3600 \
  -e LOGGER_LEVEL=3 \
  -e PROXY=direct \
  rabbitcompany/rabbitforexapi:latest
```

## API Endpoints

### GET `/`

Health Check and Statistics

```json
{
	"program": "RabbitForexAPI",
	"version": "1.0.0",
	"sourceCode": "https://github.com/Rabbit-Company/RabbitForexAPI",
	"monitorStats": {
		"currencyCount": 31,
		"updateInterval": "3600s"
	},
	"httpStats": {
		"pendingRequests": 1
	},
	"lastUpdate": "2025-11-02T16:43:29.092Z"
}
```

### GET `/v1/rates`

Get all exchange rates with EUR as base currency

```json
{
	"base": "EUR",
	"rates": {
		"EUR": 1,
		"USD": 1.1554,
		"JPY": 178.14,
		"BGN": 1.9558,
		"CZK": 24.327,
		"DKK": 7.4677,
		"GBP": 0.8816,
		"HUF": 388.1,
		"PLN": 4.256,
		"RON": 5.0858,
		"SEK": 10.925,
		"CHF": 0.9287,
		"ISK": 144.8,
		"NOK": 11.6485,
		"TRY": 48.5832,
		"AUD": 1.7672,
		"BRL": 6.2171,
		"CAD": 1.6207,
		"CNY": 8.222,
		"HKD": 8.9787,
		"IDR": 19251.16,
		"ILS": 3.7544,
		"INR": 102.507,
		"KRW": 1650.07,
		"MXN": 21.4286,
		"MYR": 4.8388,
		"NZD": 2.0212,
		"PHP": 67.835,
		"SGD": 1.5039,
		"THB": 37.348,
		"ZAR": 20.0452
	},
	"lastUpdate": "2025-11-02T16:22:27.144Z"
}
```

### GET `/v1/rates/:currency`

Get all exchange rates with specified currency as base

**Example**: `/v1/rates/USD`

```json
{
	"base": "USD",
	"rates": {
		"EUR": 0.8655,
		"USD": 1,
		"JPY": 154.1804,
		"BGN": 1.6927,
		"CZK": 21.055,
		"DKK": 6.4633,
		"GBP": 0.76303,
		"HUF": 335.901,
		"PLN": 3.6836,
		"RON": 4.4018,
		"SEK": 9.4556,
		"CHF": 0.80379,
		"ISK": 125.3246,
		"NOK": 10.0818,
		"TRY": 42.0488,
		"AUD": 1.5295,
		"BRL": 5.3809,
		"CAD": 1.4027,
		"CNY": 7.1162,
		"HKD": 7.7711,
		"IDR": 16661.9006,
		"ILS": 3.2494,
		"INR": 88.7199,
		"KRW": 1428.1374,
		"MXN": 18.5465,
		"MYR": 4.188,
		"NZD": 1.7494,
		"PHP": 58.7113,
		"SGD": 1.3016,
		"THB": 32.3247,
		"ZAR": 17.3491
	},
	"lastUpdate": "2025-11-02T16:22:27.144Z"
}
```

## Supported Currencies

The API supports all currencies provided by the European Central Bank, including:

- **EUR** - Euro
- **USD** - US Dollar
- **JPY** - Japanese Yen
- **GBP** - British Pound
- **CHF** - Swiss Franc
- **CAD** - Canadian Dollar
- **AUD** - Australian Dollar
- **CNY** - Chinese Yuan
- And 20+ other major currencies

## Rate Calculation

Exchange rates are calculated using EUR as the reference currency from ECB data:

- **EUR to X**: Direct rate from ECB
- **X to EUR**: Inverse of ECB rate (1 / rate)
- **X to Y**: Cross-rate calculation (EUR/Y ÷ EUR/X)

Rates are rounded intelligently based on their magnitude:

- **Rates ≥ 1**: 4 decimal places
- **Rates 0.1-1**: 5 decimal places
- **Rates 0.01-0.1**: 6 decimal places
- And progressively more precision for smaller rates
