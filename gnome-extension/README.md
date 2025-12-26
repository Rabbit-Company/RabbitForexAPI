# Rabbit Forex - GNOME Shell Extension

A GNOME Shell extension that monitors exchange rates for fiat currencies, precious metals, cryptocurrencies, and stocks.

## Features

- **Multi-category monitoring**: Track fiat currencies, metals, crypto, and stocks all in one place
- **Configurable refresh interval**: Set how often to fetch new rates (default: 30 seconds)
- **Panel display**: Show selected rates directly in the GNOME top panel
- **Dropdown menu**: View all watched rates with detailed information
- **Quick copy**: Click any rate in the dropdown to copy to clipboard
- **Easy configuration**: Graphical preferences with quick-add buttons for popular symbols

## API Endpoints

The extension fetches data from:

- Fiat: `https://forex.rabbitmonitor.com/v1/rates/USD`
- Metals: `https://forex.rabbitmonitor.com/v1/metals/rates/USD`
- Crypto: `https://forex.rabbitmonitor.com/v1/crypto/rates/USD`
- Stocks: `https://forex.rabbitmonitor.com/v1/stocks/rates/USD`

## Installation

### Manual Installation

```bash
# Run the install script
./install.sh

# Or manually:
mkdir -p ~/.local/share/gnome-shell/extensions/rabbitforex@rabbit-company.com
cp -r * ~/.local/share/gnome-shell/extensions/rabbitforex@rabbit-company.com/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/rabbitforex@rabbit-company.com/schemas/
```

### Enable the Extension

1. Restart GNOME Shell:

   - Press `Alt+F2`, type `r`, press `Enter`
   - Or log out and log back in
   - On Wayland: log out and log back in

2. Enable the extension:

```bash
gnome-extensions enable rabbitforex@rabbit-company.com
```

## Configuration

Open preferences with:

```bash
gnome-extensions prefs rabbitforex@rabbit-company.com
```

Or use the GNOME Extensions app.

### Settings

**General Settings:**

- **Update Interval**: How often to fetch new rates (10-3600 seconds)
- **Max Panel Items**: Maximum rates to show in the top panel (1-10)

**Per-Category Settings:**

- **Watched Symbols**: All symbols you want to monitor (shown in dropdown)
- **Panel Symbols**: Subset of watched symbols to show in the top panel

### Default Symbols

The extension comes pre-configured with:

- **Fiat**: EUR, GBP, JPY (EUR shown in panel)
- **Metals**: GOLD, SILVER
- **Crypto**: BTC, ETH (BTC shown in panel)
- **Stocks**: AAPL, GOOGL, MSFT

## File Structure

```
rabbitforex@rabbit-company.com/
├── extension.js          # Main extension code
├── prefs.js              # Preferences UI
├── metadata.json         # Extension metadata
├── stylesheet.css        # Custom styles
├── install.sh            # Installation script
├── README.md             # This file
└── schemas/
    └── org.gnome.shell.extensions.rabbitforex.gschema.xml
```

## Compatibility

- GNOME Shell 47, 48, 49

## Troubleshooting

### Extension not loading

1. Check GNOME Shell version compatibility
2. Look at logs: `journalctl -f -o cat /usr/bin/gnome-shell`

### Rates not updating

1. Check internet connection
2. Verify API endpoints are accessible
3. Check logs for error messages

### Reset to defaults

```bash
dconf reset -f /org/gnome/shell/extensions/rabbitforex/
```
