import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Soup from "gi://Soup";
import St from "gi://St";
import Clutter from "gi://Clutter";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

const API_BASE = "https://forex.rabbitmonitor.com/v1";
const TROY_OUNCE_TO_GRAM = 31.1034768;

const CATEGORIES = ["fiat", "metals", "crypto", "stocks"];

const CATEGORY_ICONS = {
	fiat: "💱",
	metals: "🥇",
	crypto: "₿",
	stocks: "📈",
};

const CURRENCY_SYMBOLS = {
	AED: "د.إ",
	AFN: "؋",
	ALL: "L",
	AMD: "֏",
	ANG: "ƒ",
	AOA: "Kz",
	ARS: "$",
	AUD: "$",
	AWG: "ƒ",
	AZN: "₼",
	BAM: "KM",
	BBD: "$",
	BDT: "৳",
	BGN: "лв",
	BHD: ".د.ب",
	BIF: "FBu",
	BMD: "$",
	BND: "$",
	BOB: "$b",
	BRL: "R$",
	BSD: "$",
	BTN: "Nu.",
	BWP: "P",
	BYN: "Br",
	BZD: "BZ$",
	CAD: "$",
	CDF: "FC",
	CHF: "CHF",
	CLP: "$",
	CNY: "¥",
	COP: "$",
	CRC: "₡",
	CUC: "$",
	CUP: "₱",
	CVE: "$",
	CZK: "Kč",
	DJF: "Fdj",
	DKK: "kr",
	DOP: "RD$",
	DZD: "دج",
	EGP: "£",
	ERN: "Nfk",
	ETB: "Br",
	EUR: "€",
	FJD: "$",
	FKP: "£",
	GBP: "£",
	GEL: "₾",
	GGP: "£",
	GHS: "GH₵",
	GIP: "£",
	GMD: "D",
	GNF: "FG",
	GTQ: "Q",
	GYD: "$",
	HKD: "$",
	HNL: "L",
	HRK: "kn",
	HTG: "G",
	HUF: "Ft",
	IDR: "Rp",
	ILS: "₪",
	IMP: "£",
	INR: "₹",
	IQD: "ع.د",
	IRR: "﷼",
	ISK: "kr",
	JEP: "£",
	JMD: "J$",
	JOD: "JD",
	JPY: "¥",
	KES: "KSh",
	KGS: "лв",
	KHR: "៛",
	KMF: "CF",
	KPW: "₩",
	KRW: "₩",
	KWD: "KD",
	KYD: "$",
	KZT: "₸",
	LAK: "₭",
	LBP: "£",
	LKR: "₨",
	LRD: "$",
	LSL: "M",
	LYD: "LD",
	MAD: "MAD",
	MDL: "lei",
	MGA: "Ar",
	MKD: "ден",
	MMK: "K",
	MNT: "₮",
	MOP: "MOP$",
	MRU: "UM",
	MUR: "₨",
	MVR: "Rf",
	MWK: "MK",
	MXN: "$",
	MYR: "RM",
	MZN: "MT",
	NAD: "$",
	NGN: "₦",
	NIO: "C$",
	NOK: "kr",
	NPR: "₨",
	NZD: "$",
	OMR: "﷼",
	PAB: "B/.",
	PEN: "S/.",
	PGK: "K",
	PHP: "₱",
	PKR: "₨",
	PLN: "zł",
	PYG: "Gs",
	QAR: "﷼",
	RON: "lei",
	RSD: "Дин.",
	RUB: "₽",
	RWF: "R₣",
	SAR: "﷼",
	SBD: "$",
	SCR: "₨",
	SDG: "ج.س.",
	SEK: "kr",
	SGD: "S$",
	SHP: "£",
	SLL: "Le",
	SOS: "S",
	SRD: "$",
	STN: "Db",
	SVC: "$",
	SYP: "£",
	SZL: "E",
	THB: "฿",
	TJS: "SM",
	TMT: "T",
	TND: "د.ت",
	TOP: "T$",
	TRY: "₺",
	TTD: "TT$",
	TWD: "NT$",
	TZS: "TSh",
	UAH: "₴",
	UGX: "USh",
	USD: "$",
	UYU: "$U",
	UZS: "лв",
	VEF: "Bs",
	VES: "Bs.S",
	VND: "₫",
	VUV: "VT",
	WST: "WS$",
	XAF: "FCFA",
	XCD: "$",
	XOF: "CFA",
	XPF: "₣",
	YER: "﷼",
	ZAR: "R",
	ZMW: "ZK",
	ZWL: "$",
};

const RabbitForexIndicator = GObject.registerClass(
	class RabbitForexIndicator extends PanelMenu.Button {
		_init(extension) {
			super._init(0.0, "Rabbit Forex");

			this._extension = extension;
			this._settings = extension.getSettings();
			this._httpSession = new Soup.Session();
			this._rates = {};
			this._timestamps = {};
			this._updateTimeout = null;

			// Create the panel button layout
			this._box = new St.BoxLayout({
				style_class: "panel-status-menu-box",
			});

			// Label to show rates in panel
			this._panelLabel = new St.Label({
				text: "Rabbit Forex",
				y_align: Clutter.ActorAlign.CENTER,
			});
			this._box.add_child(this._panelLabel);

			this.add_child(this._box);

			// Build the dropdown menu
			this._buildMenu();

			// Connect to settings changes
			this._settingsChangedId = this._settings.connect("changed", () => {
				this._onSettingsChanged();
			});

			this._fetchAllRates();
			this._startUpdateTimer();
		}

		_getEndpoints() {
			const primaryCurrency = this._settings.get_string("primary-currency");
			return {
				fiat: `${API_BASE}/rates/${primaryCurrency}`,
				metals: `${API_BASE}/metals/rates/${primaryCurrency}`,
				crypto: `${API_BASE}/crypto/rates/${primaryCurrency}`,
				stocks: `${API_BASE}/stocks/rates/${primaryCurrency}`,
			};
		}

		_getWatchedCategory(category) {
			if (!CATEGORIES.includes(category)) return [];

			return this._settings.get_strv(`watched-${category}`) ?? [];
		}

		_getPanelCategory(category) {
			if (!CATEGORIES.includes(category)) return [];

			return this._settings.get_strv(`panel-${category}`) ?? [];
		}

		_getCurrencySymbol(currency) {
			const useCurrencySymbols = this._settings.get_boolean("use-currency-symbols");
			if (!useCurrencySymbols) return currency;
			return CURRENCY_SYMBOLS[currency] || currency;
		}

		_buildMenu() {
			// Rates section - will be populated dynamically
			this._ratesSection = new PopupMenu.PopupMenuSection();
			this.menu.addMenuItem(this._ratesSection);

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

			// Refresh button
			const refreshItem = new PopupMenu.PopupMenuItem("🔄 Refresh Now");
			refreshItem.connect("activate", () => {
				this._fetchAllRates();
			});
			this.menu.addMenuItem(refreshItem);

			// Settings button
			const settingsItem = new PopupMenu.PopupMenuItem("⚙️ Settings");
			settingsItem.connect("activate", () => {
				this._extension.openPreferences();
			});
			this.menu.addMenuItem(settingsItem);

			// Last updated timestamp
			this._timestampItem = new PopupMenu.PopupMenuItem("Last updated: --", {
				reactive: false,
			});
			this.menu.addMenuItem(this._timestampItem);
		}

		_startUpdateTimer() {
			if (this._updateTimeout) {
				GLib.source_remove(this._updateTimeout);
				this._updateTimeout = null;
			}

			const interval = this._settings.get_int("update-interval");
			this._updateTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
				this._fetchAllRates();
				return GLib.SOURCE_CONTINUE;
			});
		}

		_onSettingsChanged() {
			this._startUpdateTimer();
			this._fetchAllRates();
		}

		async _fetchAllRates() {
			for (const category of CATEGORIES) {
				if (this._hasWatchedItems(category)) {
					await this._fetchRates(category);
				}
			}

			this._updateDisplay();
		}

		_hasWatchedItems(category) {
			const watched = this._getWatchedCategory(category);
			return watched.length > 0;
		}

		async _fetchRates(category) {
			const endpoints = this._getEndpoints();
			const url = endpoints[category];

			try {
				const message = Soup.Message.new("GET", url);

				const bytes = await new Promise((resolve, reject) => {
					this._httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
						try {
							const bytes = session.send_and_read_finish(result);
							resolve(bytes);
						} catch (e) {
							reject(e);
						}
					});
				});

				if (message.status_code !== 200) {
					return;
				}

				const decoder = new TextDecoder("utf-8");
				const text = decoder.decode(bytes.get_data());
				const data = JSON.parse(text);

				this._rates[category] = data.rates;
				this._timestamps[category] = data.timestamps;
			} catch (error) {
				// Silently fail - rates will show as N/A
			}
		}

		_updateDisplay() {
			this._updatePanelLabel();
			this._updateMenuRates();
			this._updateTimestamp();
		}

		_updatePanelLabel() {
			const maxPanelItems = this._settings.get_int("max-panel-items");
			const showCurrencyInPanel = this._settings.get_boolean("show-currency-in-panel");
			const panelSeparator = this._settings.get_string("panel-separator");
			const panelItemTemplate = this._settings.get_string("panel-item-template");
			const sortOrder = this._settings.get_string("panel-sort-order");

			const allPanelItems = [];

			for (const category of CATEGORIES) {
				if (!this._rates[category]) continue;

				const showInPanel = this._getPanelCategory(category);

				for (const symbol of showInPanel) {
					if (this._rates[category][symbol] !== undefined) {
						const rate = this._rates[category][symbol];
						const price = this._getRawPrice(rate, category);
						const formattedRate = this._formatPanelRate(rate, category, symbol, showCurrencyInPanel);
						const panelItem = panelItemTemplate.replace("{symbol}", symbol).replace("{rate}", formattedRate);
						allPanelItems.push({ symbol, price, panelItem });
					}
				}
			}

			if (sortOrder === "symbol-asc") {
				allPanelItems.sort((a, b) => a.symbol.localeCompare(b.symbol));
			} else if (sortOrder === "symbol-desc") {
				allPanelItems.sort((a, b) => b.symbol.localeCompare(a.symbol));
			} else if (sortOrder === "price-asc") {
				allPanelItems.sort((a, b) => a.price - b.price);
			} else if (sortOrder === "price-desc") {
				allPanelItems.sort((a, b) => b.price - a.price);
			}

			const panelItems = allPanelItems.slice(0, maxPanelItems).map((item) => item.panelItem);

			if (panelItems.length === 0) {
				this._panelLabel.text = "Rabbit Forex";
			} else {
				this._panelLabel.text = panelItems.join(panelSeparator);
			}
		}

		_updateMenuRates() {
			this._ratesSection.removeAll();

			const categoryLabels = {
				fiat: "Fiat Currencies",
				metals: "Precious Metals",
				crypto: "Cryptocurrencies",
				stocks: "Stocks",
			};

			const primaryCurrency = this._settings.get_string("primary-currency");
			const metalsUnit = this._settings.get_string("metals-unit");
			const menuItemTemplate = this._settings.get_string("menu-item-template");

			let hasAnyRates = false;

			// Determine which categories will actually be shown
			const visibleCategories = CATEGORIES.filter((category) => {
				const watched = this._getWatchedCategory(category);
				return watched.length > 0 && this._rates[category];
			});

			for (let i = 0; i < visibleCategories.length; i++) {
				const category = visibleCategories[i];
				const watched = this._getWatchedCategory(category);

				hasAnyRates = true;

				// Category header (with unit info for metals)
				let headerText = `${CATEGORY_ICONS[category]} ${categoryLabels[category]}`;
				if (category === "metals") {
					const unitLabel = metalsUnit === "troy-ounce" ? "per troy oz" : "per gram";
					headerText += ` (${unitLabel})`;
				}

				const categoryHeader = new PopupMenu.PopupMenuItem(headerText, {
					reactive: false,
				});
				this._ratesSection.addMenuItem(categoryHeader);

				// Rate items
				for (const symbol of watched) {
					if (this._rates[category][symbol] !== undefined) {
						const rate = this._rates[category][symbol];
						const rawPrice = this._getRawPrice(rate, category);
						const displayRate = this._formatDisplayRate(rate, category, symbol, primaryCurrency);
						const menuItemText = menuItemTemplate.replace("{symbol}", symbol).replace("{rate}", displayRate);

						const rateItem = new PopupMenu.PopupMenuItem(`    ${menuItemText}`, { reactive: true });

						rateItem.connect("activate", () => {
							const clipboardText = this._getClipboardText(symbol, rawPrice, displayRate, primaryCurrency, category);
							const clipboard = St.Clipboard.get_default();
							clipboard.set_text(St.ClipboardType.CLIPBOARD, clipboardText);
							if (this._settings.get_boolean("clipboard-notification")) {
								Main.notify("Copied to clipboard", clipboardText);
							}
						});

						this._ratesSection.addMenuItem(rateItem);
					} else {
						const menuItemText = menuItemTemplate.replace("{symbol}", symbol).replace("{rate}", "N/A");
						const rateItem = new PopupMenu.PopupMenuItem(`    ${menuItemText}`, { reactive: false });
						this._ratesSection.addMenuItem(rateItem);
					}
				}

				// Add separator only if this is NOT the last visible category
				if (i < visibleCategories.length - 1) {
					this._ratesSection.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
				}
			}

			if (!hasAnyRates) {
				const noRatesItem = new PopupMenu.PopupMenuItem("No rates configured. Open Settings to add symbols.", { reactive: false });
				this._ratesSection.addMenuItem(noRatesItem);
			}
		}

		_getRawPrice(rate, category) {
			if (category === "metals") {
				let price = 1 / rate;
				const metalsUnit = this._settings.get_string("metals-unit");
				if (metalsUnit === "troy-ounce") {
					price = price * TROY_OUNCE_TO_GRAM;
				}
				return price;
			}

			if (category === "stocks" || category === "crypto" || category === "fiat") {
				return 1 / rate;
			}

			return rate;
		}

		_getClipboardText(symbol, rawPrice, displayRate, primaryCurrency, category) {
			const clipboardFormat = this._settings.get_string("clipboard-format");

			switch (clipboardFormat) {
				case "price-only":
					return rawPrice.toString();
				case "formatted-price":
					return this._formatNumber(rawPrice);
				case "display-format":
				default:
					const clipboardTemplate = this._settings.get_string("clipboard-template");
					return clipboardTemplate.replace("{symbol}", symbol).replace("{rate}", displayRate);
			}
		}

		_formatPanelRate(rate, category, symbol, showCurrency = false) {
			let price;

			if (category === "metals") {
				price = 1 / rate;
				const metalsUnit = this._settings.get_string("metals-unit");
				if (metalsUnit === "troy-ounce") {
					price = price * TROY_OUNCE_TO_GRAM;
				}
			} else if (category === "stocks" || category === "crypto") {
				price = 1 / rate;
			} else {
				// fiat
				price = rate;
			}

			const formattedPrice = this._formatNumber(price);

			if (!showCurrency) {
				return formattedPrice;
			}

			// Show currency in panel
			const primaryCurrency = this._settings.get_string("primary-currency");
			const currencySymbol = this._getCurrencySymbol(primaryCurrency);
			const symbolPosition = this._settings.get_string("symbol-position");
			const useCurrencySymbols = this._settings.get_boolean("use-currency-symbols");

			if (!useCurrencySymbols) {
				return `${formattedPrice} ${primaryCurrency}`;
			}

			const isSymbol = CURRENCY_SYMBOLS[primaryCurrency] && CURRENCY_SYMBOLS[primaryCurrency] !== primaryCurrency;

			if (!isSymbol) {
				return `${formattedPrice} ${primaryCurrency}`;
			}

			if (symbolPosition === "before") {
				return `${currencySymbol}${formattedPrice}`;
			} else {
				return `${formattedPrice} ${currencySymbol}`;
			}
		}

		_formatDisplayRate(rate, category, symbol, primaryCurrency) {
			const currencySymbol = this._getCurrencySymbol(primaryCurrency);
			const symbolPosition = this._settings.get_string("symbol-position");

			if (category === "metals") {
				let price = 1 / rate;
				const metalsUnit = this._settings.get_string("metals-unit");
				if (metalsUnit === "troy-ounce") {
					price = price * TROY_OUNCE_TO_GRAM;
				}
				return this._formatWithCurrency(price, currencySymbol, primaryCurrency, symbolPosition);
			}

			if (category === "stocks") {
				const price = 1 / rate;
				return this._formatWithCurrency(price, currencySymbol, primaryCurrency, symbolPosition);
			}

			if (category === "fiat") {
				const price = 1 / rate;
				return this._formatWithCurrency(price, currencySymbol, primaryCurrency, symbolPosition);
			}

			if (category === "crypto") {
				const price = 1 / rate;
				return this._formatWithCurrency(price, currencySymbol, primaryCurrency, symbolPosition);
			}

			return this._formatNumber(rate);
		}

		_formatWithCurrency(price, currencySymbol, primaryCurrency, position) {
			const formattedPrice = this._formatNumber(price);
			const useCurrencySymbols = this._settings.get_boolean("use-currency-symbols");

			if (!useCurrencySymbols) {
				return `${formattedPrice} ${primaryCurrency}`;
			}

			const isSymbol = CURRENCY_SYMBOLS[primaryCurrency] && CURRENCY_SYMBOLS[primaryCurrency] !== primaryCurrency;

			if (!isSymbol) {
				return `${formattedPrice} ${primaryCurrency}`;
			}

			if (position === "before") {
				return `${currencySymbol}${formattedPrice}`;
			} else {
				return `${formattedPrice} ${currencySymbol}`;
			}
		}

		_formatNumber(num) {
			const formatStyle = this._settings.get_string("number-format");
			const decimalPlaces = this._settings.get_int("decimal-places");

			if (formatStyle === "auto") {
				if (num >= 1000000) {
					return (num / 1000000).toFixed(2) + "M";
				} else if (num >= 1) {
					return num.toLocaleString("en-US", { maximumFractionDigits: decimalPlaces });
				} else if (num >= 0.01) {
					return num.toFixed(Math.max(decimalPlaces, 4));
				} else if (num >= 0.0001) {
					return num.toFixed(Math.max(decimalPlaces, 6));
				} else {
					return num.toExponential(4);
				}
			} else if (formatStyle === "fixed") {
				return num.toFixed(decimalPlaces);
			} else if (formatStyle === "locale") {
				return num.toLocaleString(undefined, {
					minimumFractionDigits: decimalPlaces,
					maximumFractionDigits: decimalPlaces,
				});
			} else if (formatStyle === "compact") {
				if (num >= 1000000000) {
					return (num / 1000000000).toFixed(decimalPlaces) + "B";
				} else if (num >= 1000000) {
					return (num / 1000000).toFixed(decimalPlaces) + "M";
				} else if (num >= 1000) {
					return (num / 1000).toFixed(decimalPlaces) + "K";
				} else {
					return num.toFixed(decimalPlaces);
				}
			}

			return num.toFixed(decimalPlaces);
		}

		_updateTimestamp() {
			const now = new Date();
			const timeStr = now.toLocaleTimeString();
			this._timestampItem.label.text = `Last updated: ${timeStr}`;
		}

		destroy() {
			if (this._updateTimeout) {
				GLib.source_remove(this._updateTimeout);
				this._updateTimeout = null;
			}

			if (this._settingsChangedId) {
				this._settings.disconnect(this._settingsChangedId);
				this._settingsChangedId = null;
			}

			if (this._httpSession) {
				this._httpSession.abort();
				this._httpSession = null;
			}

			super.destroy();
		}
	}
);

export default class RabbitForexExtension extends Extension {
	enable() {
		this._settings = this.getSettings();
		this._addIndicator();

		this._positionChangedId = this._settings.connect("changed::panel-position", () => {
			this._repositionIndicator();
		});

		this._indexChangedId = this._settings.connect("changed::panel-index", () => {
			this._repositionIndicator();
		});
	}

	_getBoxFromPosition(position) {
		const allowed = ["left", "center", "right"];
		return allowed.includes(position) ? position : "right";
	}

	_addIndicator() {
		this._indicator = new RabbitForexIndicator(this);
		const position = this._settings.get_string("panel-position");
		const index = this._settings.get_int("panel-index");
		const box = this._getBoxFromPosition(position);
		Main.panel.addToStatusArea(this.uuid, this._indicator, index, box);
	}

	_repositionIndicator() {
		if (this._indicator) {
			const rates = this._indicator._rates;
			const timestamps = this._indicator._timestamps;

			this._indicator.destroy();
			this._indicator = null;

			this._indicator = new RabbitForexIndicator(this);

			this._indicator._rates = rates;
			this._indicator._timestamps = timestamps;

			const position = this._settings.get_string("panel-position");
			const index = this._settings.get_int("panel-index");
			const box = this._getBoxFromPosition(position);
			Main.panel.addToStatusArea(this.uuid, this._indicator, index, box);

			this._indicator._updateDisplay();
		}
	}

	disable() {
		if (this._positionChangedId) {
			this._settings.disconnect(this._positionChangedId);
			this._positionChangedId = null;
		}

		if (this._indexChangedId) {
			this._settings.disconnect(this._indexChangedId);
			this._indexChangedId = null;
		}

		if (this._indicator) {
			this._indicator.destroy();
			this._indicator = null;
		}

		this._settings = null;
	}
}
