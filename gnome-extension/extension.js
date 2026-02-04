import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Soup from "gi://Soup";
import St from "gi://St";
import Clutter from "gi://Clutter";
import Cairo from "gi://cairo";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as ModalDialog from "resource:///org/gnome/shell/ui/modalDialog.js";

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

const PRICE_DIRECTION = {
	UNCHANGED: 0,
	UP: 1,
	DOWN: -1,
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
			this._previousRates = {};
			this._previousTimestamps = {};
			this._lastKnownTimestamps = {};
			this._referenceRates = {};
			this._updateTimeout = null;
			this._historyFetchTimeout = null;

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
			this._fetchHistoricalRatesIfNeeded();
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

		_getHistoryEndpoint(category, symbol) {
			const primaryCurrency = this._settings.get_string("primary-currency");
			const mode = this._settings.get_string("price-change-mode");

			let resolution = "";
			if (mode === "day-start" || mode === "day-ago") {
				resolution = "/hourly";
			} else if (mode === "week-start" || mode === "week-ago" || mode === "month-start" || mode === "month-ago" || mode === "custom") {
				resolution = "/daily";
			}

			switch (category) {
				case "fiat":
					return `${API_BASE}/rates/history/${symbol}${resolution}`;
				case "metals":
					return `${API_BASE}/metals/history/${symbol}/currency/${primaryCurrency}${resolution}`;
				case "crypto":
					return `${API_BASE}/crypto/history/${symbol}/currency/${primaryCurrency}${resolution}`;
				case "stocks":
					return `${API_BASE}/stocks/history/${symbol}/currency/${primaryCurrency}${resolution}`;
				default:
					return null;
			}
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
				this._fetchHistoricalRatesIfNeeded();
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

		_startHistoryFetchTimer() {
			if (this._historyFetchTimeout) {
				GLib.source_remove(this._historyFetchTimeout);
				this._historyFetchTimeout = null;
			}

			const mode = this._settings.get_string("price-change-mode");
			if (mode === "none" || mode === "previous-update") {
				return;
			}

			let interval;
			if (mode === "hour-ago") {
				interval = 300;
			} else if (mode === "day-start" || mode === "day-ago") {
				interval = 900;
			} else {
				interval = 1800;
			}

			this._historyFetchTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
				this._fetchHistoricalRatesIfNeeded();
				return GLib.SOURCE_CONTINUE;
			});
		}

		_onSettingsChanged() {
			this._startUpdateTimer();
			this._startHistoryFetchTimer();
			this._fetchAllRates();
			this._fetchHistoricalRatesIfNeeded();
		}

		async _fetchAllRates() {
			const mode = this._settings.get_string("price-change-mode");

			const ratesBeforeFetch = {};
			if (mode === "previous-update") {
				for (const category of CATEGORIES) {
					if (this._rates[category]) {
						ratesBeforeFetch[category] = { ...this._rates[category] };
					}
				}
			}

			for (const category of CATEGORIES) {
				if (this._hasWatchedItems(category)) {
					await this._fetchRates(category);
				}
			}

			// For previous-update mode: only update previousRates when backend timestamp changes
			if (mode === "previous-update") {
				for (const category of CATEGORIES) {
					if (this._rates[category] && this._timestamps[category]) {
						const currentTimestamp = this._getRelevantTimestamp(category);
						const lastKnownTimestamp = this._lastKnownTimestamps[category];

						// Check if the backend has actually updated the prices
						if (currentTimestamp && currentTimestamp !== lastKnownTimestamp) {
							// Backend has new data - the rates we had before this fetch become "previous"
							if (ratesBeforeFetch[category]) {
								if (!this._previousRates[category]) {
									this._previousRates[category] = {};
								}
								if (!this._previousTimestamps[category]) {
									this._previousTimestamps[category] = {};
								}

								for (const symbol of Object.keys(ratesBeforeFetch[category])) {
									this._previousRates[category][symbol] = ratesBeforeFetch[category][symbol];
									this._previousTimestamps[category][symbol] = lastKnownTimestamp;
								}
							}

							// Update the last known timestamp
							this._lastKnownTimestamps[category] = currentTimestamp;
						}
					}
				}
			}

			this._updateDisplay();
		}

		_getRelevantTimestamp(category) {
			const timestamps = this._timestamps[category];
			if (!timestamps) return null;

			switch (category) {
				case "fiat":
					return timestamps.currency;
				case "metals":
					return timestamps.metal || timestamps.currency;
				case "crypto":
					return timestamps.crypto || timestamps.currency;
				case "stocks":
					return timestamps.stock || timestamps.currency;
				default:
					return null;
			}
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

		async _fetchHistoricalRatesIfNeeded() {
			const mode = this._settings.get_string("price-change-mode");

			if (mode === "none" || mode === "previous-update") {
				return;
			}

			for (const category of CATEGORIES) {
				const watched = this._getWatchedCategory(category);
				const panelSymbols = this._getPanelCategory(category);
				const allSymbols = [...new Set([...watched, ...panelSymbols])];

				for (const symbol of allSymbols) {
					await this._fetchHistoricalRate(category, symbol);
				}
			}

			this._updateDisplay();
		}

		async _fetchHistoricalRate(category, symbol) {
			const url = this._getHistoryEndpoint(category, symbol);
			if (!url) return;

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

				const referencePrice = this._extractReferencePrice(data, category);
				if (referencePrice !== null) {
					if (!this._referenceRates[category]) {
						this._referenceRates[category] = {};
					}
					this._referenceRates[category][symbol] = referencePrice;
				}
			} catch (error) {}
		}

		_extractReferencePrice(historyData, category) {
			const mode = this._settings.get_string("price-change-mode");
			const dataPoints = historyData.data;

			if (!dataPoints || dataPoints.length === 0) {
				return null;
			}

			const now = new Date();

			if (mode === "hour-ago") {
				// Find the data point closest to 1 hour ago
				const targetTime = new Date(now.getTime() - 60 * 60 * 1000);
				return this._findPriceAtOrBefore(dataPoints, targetTime, category);
			} else if (mode === "day-start") {
				// Find the data point for the start of today (00:00 UTC)
				const startOfDay = new Date(now);
				startOfDay.setUTCHours(0, 0, 0, 0);
				return this._findPriceAtOrBefore(dataPoints, startOfDay, category);
			} else if (mode === "day-ago") {
				// Find the data point closest to 24 hours ago
				const targetTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				return this._findPriceAtOrBefore(dataPoints, targetTime, category);
			} else if (mode === "week-ago") {
				// Find the data point closest to 7 days ago
				const targetTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				return this._findPriceAtOrBefore(dataPoints, targetTime, category);
			} else if (mode === "week-start") {
				const firstDayOfWeek = this._settings.get_string("first-day-of-week");

				const dayMap = {
					sunday: 0,
					monday: 1,
					tuesday: 2,
					wednesday: 3,
					thursday: 4,
					friday: 5,
					saturday: 6,
				};

				const targetDayNum = dayMap[firstDayOfWeek] ?? 1; // Default to Monday

				const startOfWeek = new Date(now);
				startOfWeek.setUTCHours(0, 0, 0, 0);

				const currentDayNum = startOfWeek.getUTCDay();

				// Calculate days since the target first day of week
				let daysSinceFirstDay = currentDayNum - targetDayNum;
				if (daysSinceFirstDay < 0) {
					daysSinceFirstDay += 7;
				}

				startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysSinceFirstDay);
				return this._findPriceAtOrBefore(dataPoints, startOfWeek, category);
			} else if (mode === "month-ago") {
				// Find the data point closest to 30 days ago
				const targetTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				return this._findPriceAtOrBefore(dataPoints, targetTime, category);
			} else if (mode === "month-start") {
				// Find the data point for the start of this month (1st day 00:00 UTC)
				const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
				return this._findPriceAtOrBefore(dataPoints, startOfMonth, category);
			} else if (mode === "custom") {
				// Find the data point for the custom reference date
				const customDate = this._settings.get_string("custom-reference-date");
				if (!customDate || customDate.length !== 10) {
					return null;
				}

				// Parse the custom date and set to end of day to find data at or before that date
				const targetTime = new Date(customDate + "T23:59:59Z");
				return this._findPriceAtOrBefore(dataPoints, targetTime, category);
			}

			return null;
		}

		_findPriceAtOrBefore(dataPoints, targetTime, category) {
			const target = targetTime.getTime();

			for (let i = dataPoints.length - 1; i >= 0; i--) {
				const dp = dataPoints[i];
				let timestamp = dp.timestamp;
				if (timestamp && timestamp.length === 10 && timestamp.includes("-")) {
					timestamp = timestamp + "T00:00:00Z";
				}
				const t = Date.parse(timestamp);
				if (t <= target) {
					const price = dp.price ?? dp.open ?? dp.avg;
					if (price === undefined) return null;
					return category === "fiat" ? 1 / price : price;
				}
			}

			return null;
		}

		_getPriceDirection(category, symbol, currentRate) {
			const mode = this._settings.get_string("price-change-mode");

			if (mode === "none") {
				return PRICE_DIRECTION.UNCHANGED;
			}

			let referenceRate;

			if (mode === "previous-update") {
				referenceRate = this._previousRates[category]?.[symbol];
			} else {
				const referencePrice = this._referenceRates[category]?.[symbol];
				if (referencePrice !== undefined) {
					if (category === "fiat") {
						referenceRate = referencePrice;
					} else {
						referenceRate = 1 / referencePrice;
					}
				}
			}

			if (referenceRate === undefined) {
				return PRICE_DIRECTION.UNCHANGED;
			}

			const currentPrice = this._getRawPrice(currentRate, category);
			const referencePrice = this._getRawPrice(referenceRate, category);

			const minPercentThreshold = 0.01;
			const percentChange = referencePrice !== 0 ? Math.abs((currentPrice - referencePrice) / referencePrice) * 100 : 0;

			if (percentChange < minPercentThreshold) {
				return PRICE_DIRECTION.UNCHANGED;
			} else if (currentPrice > referencePrice) {
				return PRICE_DIRECTION.UP;
			} else {
				return PRICE_DIRECTION.DOWN;
			}
		}

		_getPriceChange(category, symbol, currentRate) {
			const mode = this._settings.get_string("price-change-mode");

			if (mode === "none") {
				return { change: 0, percent: 0 };
			}

			let referenceRate;

			if (mode === "previous-update") {
				referenceRate = this._previousRates[category]?.[symbol];
			} else {
				const referencePrice = this._referenceRates[category]?.[symbol];
				if (referencePrice !== undefined) {
					if (category === "fiat") {
						referenceRate = referencePrice;
					} else {
						referenceRate = 1 / referencePrice;
					}
				}
			}

			if (referenceRate === undefined) {
				return { change: 0, percent: 0 };
			}

			const currentPrice = this._getRawPrice(currentRate, category);
			const referencePrice = this._getRawPrice(referenceRate, category);

			const change = currentPrice - referencePrice;
			const percent = referencePrice !== 0 ? (change / referencePrice) * 100 : 0;

			return { change, percent };
		}

		_applyTemplate(template, symbol, formattedRate, change, percent) {
			const changeStr = this._formatNumber(Math.abs(change));
			const percentStr = Math.abs(percent).toFixed(2);

			return template.replace("{symbol}", symbol).replace("{rate}", formattedRate).replace("{change}", changeStr).replace("{percent}", percentStr);
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
			const panelItemTemplateUp = this._settings.get_string("panel-item-template-up");
			const panelItemTemplateDown = this._settings.get_string("panel-item-template-down");
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
						const direction = this._getPriceDirection(category, symbol, rate);
						const { change, percent } = this._getPriceChange(category, symbol, rate);

						let template;
						if (direction === PRICE_DIRECTION.UP) {
							template = panelItemTemplateUp;
						} else if (direction === PRICE_DIRECTION.DOWN) {
							template = panelItemTemplateDown;
						} else {
							template = panelItemTemplate;
						}

						const panelItem = this._applyTemplate(template, symbol, formattedRate, change, percent);
						allPanelItems.push({ symbol, price, panelItem, direction });
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
				this._panelLabel.clutter_text.set_markup("Rabbit Forex");
			} else {
				this._panelLabel.clutter_text.set_markup(panelItems.join(panelSeparator));
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
			const menuItemTemplateUp = this._settings.get_string("menu-item-template-up");
			const menuItemTemplateDown = this._settings.get_string("menu-item-template-down");

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
						const direction = this._getPriceDirection(category, symbol, rate);
						const { change, percent } = this._getPriceChange(category, symbol, rate);

						let template;
						if (direction === PRICE_DIRECTION.UP) {
							template = menuItemTemplateUp;
						} else if (direction === PRICE_DIRECTION.DOWN) {
							template = menuItemTemplateDown;
						} else {
							template = menuItemTemplate;
						}

						const menuItemText = this._applyTemplate(template, symbol, displayRate, change, percent);

						const rateItem = new PopupMenu.PopupMenuItem(`    `, { reactive: true });
						rateItem.label.clutter_text.set_markup(`    ${menuItemText}`);

						rateItem.connect("activate", () => {
							const clickAction = this._settings.get_string("click-action");

							if (clickAction === "graph") {
								this._showPriceGraph(symbol, category, primaryCurrency);
							} else {
								const clipboardText = this._getClipboardText(symbol, rawPrice, displayRate, primaryCurrency, category);
								const clipboard = St.Clipboard.get_default();
								clipboard.set_text(St.ClipboardType.CLIPBOARD, clipboardText);
								if (this._settings.get_boolean("clipboard-notification")) {
									Main.notify("Copied to clipboard", clipboardText);
								}
							}
						});

						this._ratesSection.addMenuItem(rateItem);
					} else {
						const menuItemText = this._applyTemplate(menuItemTemplate, symbol, "N/A", 0, 0);
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

		async _showPriceGraph(symbol, category, primaryCurrency) {
			this.menu.close();

			// Create the dialog
			const dialog = new ModalDialog.ModalDialog({
				styleClass: "price-graph-dialog",
			});

			// Create main content box
			const contentBox = new St.BoxLayout({
				vertical: true,
				style: "spacing: 12px;",
			});

			// Header row with symbol on left, price on right
			const headerBox = new St.BoxLayout({
				style: "spacing: 20px; padding: 0 10px;",
				x_expand: true,
			});

			// Left side: symbol and currency badge
			const leftBox = new St.BoxLayout({
				style: "spacing: 10px;",
				x_align: Clutter.ActorAlign.START,
				y_align: Clutter.ActorAlign.CENTER,
				x_expand: true,
			});

			const symbolLabel = new St.Label({
				text: symbol,
				style: "font-size: 28px; font-weight: bold;",
				y_align: Clutter.ActorAlign.CENTER,
			});
			leftBox.add_child(symbolLabel);

			// Show unit info for metals
			let badgeText = primaryCurrency;
			if (category === "metals") {
				const metalsUnit = this._settings.get_string("metals-unit");
				const unitLabel = metalsUnit === "troy-ounce" ? "oz" : "g";
				badgeText = `${primaryCurrency}/${unitLabel}`;
			}

			const currencyBadge = new St.Label({
				text: badgeText,
				style: "font-size: 13px; color: #888; padding: 4px 10px; border-radius: 4px; background-color: rgba(255,255,255,0.1);",
				y_align: Clutter.ActorAlign.CENTER,
			});
			leftBox.add_child(currencyBadge);

			headerBox.add_child(leftBox);

			// Right side: price and change
			const rightBox = new St.BoxLayout({
				style: "spacing: 12px;",
				x_align: Clutter.ActorAlign.END,
				y_align: Clutter.ActorAlign.CENTER,
			});

			// Placeholder for price (will be updated after data loads)
			this._priceLabel = new St.Label({
				text: "...",
				style: "font-size: 28px; font-weight: bold;",
				y_align: Clutter.ActorAlign.CENTER,
			});
			rightBox.add_child(this._priceLabel);

			this._changeLabel = new St.Label({
				text: "",
				style: "font-size: 18px;",
				y_align: Clutter.ActorAlign.CENTER,
			});
			rightBox.add_child(this._changeLabel);

			headerBox.add_child(rightBox);

			contentBox.add_child(headerBox);

			// Loading indicator
			const loadingBox = new St.BoxLayout({
				vertical: true,
				style: "padding: 40px;",
				x_align: Clutter.ActorAlign.CENTER,
			});

			const loadingLabel = new St.Label({
				text: "Loading...",
				style: "font-size: 14px; color: #888;",
			});
			loadingBox.add_child(loadingLabel);
			contentBox.add_child(loadingBox);

			dialog.contentLayout.add_child(contentBox);

			// Add close button
			dialog.addButton({
				label: "Close",
				action: () => {
					dialog.close();
				},
				key: Clutter.KEY_Escape,
			});

			dialog.open();

			// Fetch and display data
			try {
				const historyData = await this._fetchGraphData(symbol, category, primaryCurrency);

				if (historyData && historyData.data && historyData.data.length > 0) {
					contentBox.remove_child(loadingBox);

					// Process data for the graph
					const dataPoints = this._processGraphData(historyData.data, category);

					if (dataPoints.length > 0) {
						// Update price and change in header
						this._updatePriceLabels(dataPoints, primaryCurrency);

						// Create graph widget
						const graphWidget = this._createGraphWidget(dataPoints, symbol, primaryCurrency);
						contentBox.add_child(graphWidget);

						// Add stats below the graph
						const statsBox = this._createStatsBox(dataPoints, primaryCurrency);
						contentBox.add_child(statsBox);
					} else {
						loadingLabel.text = "No data available";
						contentBox.add_child(loadingBox);
					}
				} else {
					loadingLabel.text = "No historical data available";
				}
			} catch (error) {
				loadingLabel.text = `Error: ${error.message}`;
			}
		}

		_updatePriceLabels(dataPoints, primaryCurrency) {
			const firstPrice = dataPoints[0].price;
			const lastPrice = dataPoints[dataPoints.length - 1].price;
			const change = lastPrice - firstPrice;
			const changePercent = (change / firstPrice) * 100;
			const isUp = change >= 0;

			this._priceLabel.text = this._formatPrice(lastPrice, true, primaryCurrency);

			const changeColor = isUp ? "#69F0AE" : "#FF6B6B";
			const changeIcon = isUp ? "▲" : "▼";
			this._changeLabel.text = `${changeIcon} ${Math.abs(changePercent).toFixed(2)}%`;
			this._changeLabel.style = `font-size: 18px; color: ${changeColor};`;
		}

		_formatPrice(price, includeCurrency = false, primaryCurrency = null) {
			let formattedPrice = this._formatNumber(price);

			if (includeCurrency && primaryCurrency) {
				return this._addCurrencySymbol(formattedPrice, primaryCurrency);
			}

			return formattedPrice;
		}

		_formatGraphPrice(price, includeCurrency = false, primaryCurrency = null) {
			let formattedPrice;
			if (price >= 1000000) {
				formattedPrice = (price / 1000000).toFixed(1) + "M";
			} else if (price >= 1000) {
				formattedPrice = (price / 1000).toFixed(1) + "K";
			} else if (price >= 1) {
				formattedPrice = price.toFixed(2);
			} else if (price >= 0.01) {
				formattedPrice = price.toFixed(4);
			} else {
				formattedPrice = price.toExponential(2);
			}

			if (includeCurrency && primaryCurrency) {
				return this._addCurrencySymbol(formattedPrice, primaryCurrency);
			}

			return formattedPrice;
		}

		_addCurrencySymbol(formattedPrice, primaryCurrency) {
			const useCurrencySymbols = this._settings.get_boolean("use-currency-symbols");
			if (!useCurrencySymbols) {
				return `${formattedPrice} ${primaryCurrency}`;
			}

			const currencySymbol = CURRENCY_SYMBOLS[primaryCurrency] || primaryCurrency;
			const symbolPosition = this._settings.get_string("symbol-position");
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

		async _fetchGraphData(symbol, category, primaryCurrency) {
			let url;
			switch (category) {
				case "fiat":
					url = `${API_BASE}/rates/history/${symbol}/daily`;
					break;
				case "metals":
					url = `${API_BASE}/metals/history/${symbol}/currency/${primaryCurrency}/daily`;
					break;
				case "crypto":
					url = `${API_BASE}/crypto/history/${symbol}/currency/${primaryCurrency}/daily`;
					break;
				case "stocks":
					url = `${API_BASE}/stocks/history/${symbol}/currency/${primaryCurrency}/daily`;
					break;
				default:
					return null;
			}

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
				throw new Error(`HTTP ${message.status_code}`);
			}

			const decoder = new TextDecoder("utf-8");
			const text = decoder.decode(bytes.get_data());
			return JSON.parse(text);
		}

		_processGraphData(dataPoints, category) {
			const processed = [];

			for (const dp of dataPoints) {
				let timestamp = dp.timestamp;
				if (timestamp && timestamp.length === 10 && timestamp.includes("-")) {
					timestamp = timestamp + "T00:00:00Z";
				}

				const time = Date.parse(timestamp);
				let price = dp.price ?? dp.close ?? dp.open ?? dp.avg;

				if (price === undefined) continue;

				// Convert rate to price for fiat
				if (category === "fiat") {
					price = 1 / price;
				}

				// Apply metals unit conversion
				if (category === "metals") {
					const metalsUnit = this._settings.get_string("metals-unit");
					if (metalsUnit === "troy-ounce") {
						price = price * TROY_OUNCE_TO_GRAM;
					}
				}

				processed.push({ time, price, date: timestamp });
			}

			// Sort by time ascending
			processed.sort((a, b) => a.time - b.time);

			return processed;
		}

		_createGraphWidget(dataPoints, symbol, primaryCurrency) {
			const width = 500;
			const height = 250;
			const padding = { top: 20, right: 70, bottom: 40, left: 30 };
			const graphWidth = width - padding.left - padding.right;
			const graphHeight = height - padding.top - padding.bottom;

			// Find min/max values
			const prices = dataPoints.map((d) => d.price);
			const minPrice = Math.min(...prices);
			const maxPrice = Math.max(...prices);
			const priceRange = maxPrice - minPrice || 1;

			// Add some padding to the range
			const paddedMin = minPrice - priceRange * 0.05;
			const paddedMax = maxPrice + priceRange * 0.05;
			const paddedRange = paddedMax - paddedMin;

			const minTime = dataPoints[0].time;
			const maxTime = dataPoints[dataPoints.length - 1].time;
			const timeRange = maxTime - minTime || 1;

			// Create drawing area using St.DrawingArea
			const canvas = new St.DrawingArea({
				width: width,
				height: height,
			});

			canvas.connect("repaint", (area) => {
				const cr = area.get_context();
				const [areaWidth, areaHeight] = area.get_surface_size();

				// Determine if price went up or down overall
				const firstPrice = dataPoints[0].price;
				const lastPrice = dataPoints[dataPoints.length - 1].price;
				const isUp = lastPrice >= firstPrice;

				// Draw subtle horizontal grid lines
				cr.setSourceRGBA(0.5, 0.5, 0.5, 0.2);
				cr.setLineWidth(1);

				for (let i = 0; i <= 4; i++) {
					const y = padding.top + (graphHeight * i) / 4;
					cr.moveTo(padding.left, y);
					cr.lineTo(width - padding.right, y);
					cr.stroke();
				}

				// Draw price labels on the right
				cr.setSourceRGBA(0.6, 0.6, 0.6, 1);
				cr.selectFontFace("Sans", Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
				cr.setFontSize(12);

				for (let i = 0; i <= 4; i++) {
					const y = padding.top + (graphHeight * i) / 4;
					const price = paddedMax - (paddedRange * i) / 4;
					const priceText = this._formatGraphPrice(price, true, primaryCurrency);
					cr.moveTo(width - padding.right + 5, y + 4);
					cr.showText(priceText);
				}

				// Draw the line graph
				if (dataPoints.length > 1) {
					// Fill area under the line first (gradient effect)
					const gradient = new Cairo.LinearGradient(0, padding.top, 0, padding.top + graphHeight);
					if (isUp) {
						gradient.addColorStopRGBA(0, 0.41, 0.94, 0.68, 0.3);
						gradient.addColorStopRGBA(1, 0.41, 0.94, 0.68, 0.02);
					} else {
						gradient.addColorStopRGBA(0, 1, 0.42, 0.42, 0.3);
						gradient.addColorStopRGBA(1, 1, 0.42, 0.42, 0.02);
					}

					cr.moveTo(padding.left + ((dataPoints[0].time - minTime) / timeRange) * graphWidth, padding.top + graphHeight);
					for (let i = 0; i < dataPoints.length; i++) {
						const dp = dataPoints[i];
						const x = padding.left + ((dp.time - minTime) / timeRange) * graphWidth;
						const y = padding.top + ((paddedMax - dp.price) / paddedRange) * graphHeight;
						cr.lineTo(x, y);
					}
					cr.lineTo(padding.left + ((dataPoints[dataPoints.length - 1].time - minTime) / timeRange) * graphWidth, padding.top + graphHeight);
					cr.closePath();
					cr.setSource(gradient);
					cr.fill();

					// Draw the main line
					if (isUp) {
						cr.setSourceRGBA(0.41, 0.94, 0.68, 1); // Green #69F0AE
					} else {
						cr.setSourceRGBA(1, 0.42, 0.42, 1); // Red #FF6B6B
					}

					cr.setLineWidth(2.5);
					cr.setLineCap(Cairo.LineCap.ROUND);
					cr.setLineJoin(Cairo.LineJoin.ROUND);

					for (let i = 0; i < dataPoints.length; i++) {
						const dp = dataPoints[i];
						const x = padding.left + ((dp.time - minTime) / timeRange) * graphWidth;
						const y = padding.top + ((paddedMax - dp.price) / paddedRange) * graphHeight;

						if (i === 0) {
							cr.moveTo(x, y);
						} else {
							cr.lineTo(x, y);
						}
					}
					cr.stroke();

					// Draw endpoint dot
					const lastDp = dataPoints[dataPoints.length - 1];
					const lastX = padding.left + ((lastDp.time - minTime) / timeRange) * graphWidth;
					const lastY = padding.top + ((paddedMax - lastDp.price) / paddedRange) * graphHeight;

					cr.arc(lastX, lastY, 4, 0, 2 * Math.PI);
					cr.fill();
				}

				// Draw date labels at bottom
				cr.setSourceRGBA(0.6, 0.6, 0.6, 1);
				cr.setFontSize(11);

				const numLabels = Math.min(5, dataPoints.length);
				for (let i = 0; i < numLabels; i++) {
					const idx = Math.floor((i * (dataPoints.length - 1)) / (numLabels - 1));
					const dp = dataPoints[idx];
					const x = padding.left + ((dp.time - minTime) / timeRange) * graphWidth;
					const dateStr = new Date(dp.time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
					cr.moveTo(x - 18, height - 10);
					cr.showText(dateStr);
				}

				cr.$dispose();
			});

			return canvas;
		}

		_createStatsBox(dataPoints, primaryCurrency) {
			const statsBox = new St.BoxLayout({
				style: "spacing: 40px; padding-top: 10px;",
				x_align: Clutter.ActorAlign.CENTER,
			});

			const minPrice = Math.min(...dataPoints.map((d) => d.price));
			const maxPrice = Math.max(...dataPoints.map((d) => d.price));

			// Date range
			const firstDate = new Date(dataPoints[0].time);
			const lastDate = new Date(dataPoints[dataPoints.length - 1].time);
			const dateRangeStr = `${firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

			const stats = [
				{ label: "Period", value: dateRangeStr },
				{ label: "Low", value: this._formatPrice(minPrice, true, primaryCurrency) },
				{ label: "High", value: this._formatPrice(maxPrice, true, primaryCurrency) },
			];

			for (const stat of stats) {
				const statBox = new St.BoxLayout({
					vertical: true,
					style: "spacing: 4px;",
					x_align: Clutter.ActorAlign.CENTER,
				});

				const labelWidget = new St.Label({
					text: stat.label,
					style: "font-size: 13px; color: #888;",
				});

				const valueWidget = new St.Label({
					text: stat.value,
					style: "font-size: 15px;",
				});

				statBox.add_child(labelWidget);
				statBox.add_child(valueWidget);
				statsBox.add_child(statBox);
			}

			return statsBox;
		}

		destroy() {
			if (this._updateTimeout) {
				GLib.source_remove(this._updateTimeout);
				this._updateTimeout = null;
			}

			if (this._historyFetchTimeout) {
				GLib.source_remove(this._historyFetchTimeout);
				this._historyFetchTimeout = null;
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
	},
);

export default class RabbitForexExtension extends Extension {
	enable() {
		this._settings = this.getSettings();
		this._addIndicator(false);

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

	_addIndicator(preserveState = false) {
		let rates = {};
		let timestamps = {};
		let previousRates = {};
		let previousTimestamps = {};
		let lastKnownTimestamps = {};
		let referenceRates = {};

		if (preserveState && this._indicator) {
			rates = this._indicator._rates;
			timestamps = this._indicator._timestamps;
			previousRates = this._indicator._previousRates;
			previousTimestamps = this._indicator._previousTimestamps;
			lastKnownTimestamps = this._indicator._lastKnownTimestamps;
			referenceRates = this._indicator._referenceRates;
			this._indicator.destroy();
			this._indicator = null;
		}

		this._indicator = new RabbitForexIndicator(this);

		if (preserveState) {
			this._indicator._rates = rates;
			this._indicator._timestamps = timestamps;
			this._indicator._previousRates = previousRates;
			this._indicator._previousTimestamps = previousTimestamps;
			this._indicator._lastKnownTimestamps = lastKnownTimestamps;
			this._indicator._referenceRates = referenceRates;
		}

		const position = this._settings.get_string("panel-position");
		const index = this._settings.get_int("panel-index");
		const box = this._getBoxFromPosition(position);
		Main.panel.addToStatusArea(this.uuid, this._indicator, index, box);

		if (preserveState) {
			this._indicator._updateDisplay();
		}
	}

	_repositionIndicator() {
		if (this._indicator) {
			this._addIndicator(true);
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
