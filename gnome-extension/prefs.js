import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import GLib from "gi://GLib";
import Soup from "gi://Soup";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const API_BASE = "https://forex.rabbitmonitor.com/v1";
const ENDPOINTS = {
	fiat: `${API_BASE}/rates/USD`,
	metals: `${API_BASE}/metals/rates/USD`,
	crypto: `${API_BASE}/crypto/rates/USD`,
	stocks: `${API_BASE}/stocks/rates/USD`,
};

const POPULAR_SYMBOLS = {
	fiat: ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "MXN", "BRL"],
	metals: ["GOLD", "SILVER", "PALLADIUM", "COPPER"],
	crypto: ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "LINK", "AVAX", "MATIC"],
	stocks: ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "FB", "NFLX", "AMD", "V"],
};

const COMMON_FIATS = [
	"AED",
	"AFN",
	"ALL",
	"AMD",
	"ANG",
	"AOA",
	"ARS",
	"AUD",
	"AWG",
	"AZN",
	"BAM",
	"BBD",
	"BDT",
	"BGN",
	"BHD",
	"BIF",
	"BMD",
	"BND",
	"BOB",
	"BRL",
	"BSD",
	"BTN",
	"BWP",
	"BYN",
	"BZD",
	"CAD",
	"CDF",
	"CHF",
	"CLP",
	"CNY",
	"COP",
	"CRC",
	"CUC",
	"CUP",
	"CVE",
	"CZK",
	"DJF",
	"DKK",
	"DOP",
	"DZD",
	"EGP",
	"ERN",
	"ETB",
	"EUR",
	"FJD",
	"FKP",
	"GBP",
	"GEL",
	"GGP",
	"GHS",
	"GIP",
	"GMD",
	"GNF",
	"GTQ",
	"GYD",
	"HKD",
	"HNL",
	"HRK",
	"HTG",
	"HUF",
	"IDR",
	"ILS",
	"IMP",
	"INR",
	"IQD",
	"IRR",
	"ISK",
	"JEP",
	"JMD",
	"JOD",
	"JPY",
	"KES",
	"KGS",
	"KHR",
	"KMF",
	"KPW",
	"KRW",
	"KWD",
	"KYD",
	"KZT",
	"LAK",
	"LBP",
	"LKR",
	"LRD",
	"LSL",
	"LYD",
	"MAD",
	"MDL",
	"MGA",
	"MKD",
	"MMK",
	"MNT",
	"MOP",
	"MRU",
	"MUR",
	"MVR",
	"MWK",
	"MXN",
	"MYR",
	"MZN",
	"NAD",
	"NGN",
	"NIO",
	"NOK",
	"NPR",
	"NZD",
	"OMR",
	"PAB",
	"PEN",
	"PGK",
	"PHP",
	"PKR",
	"PLN",
	"PYG",
	"QAR",
	"RON",
	"RSD",
	"RUB",
	"RWF",
	"SAR",
	"SBD",
	"SCR",
	"SDG",
	"SEK",
	"SGD",
	"SHP",
	"SLE",
	"SLL",
	"SOS",
	"SRD",
	"STN",
	"SVC",
	"SYP",
	"SZL",
	"THB",
	"TJS",
	"TMT",
	"TND",
	"TOP",
	"TRY",
	"TTD",
	"TWD",
	"TZS",
	"UAH",
	"UGX",
	"USD",
	"UYU",
	"UZS",
	"VEF",
	"VES",
	"VND",
	"VUV",
	"WST",
	"XAF",
	"XCD",
	"XCG",
	"XOF",
	"XPF",
	"YER",
	"ZAR",
	"ZMW",
	"ZWG",
	"ZWL",
];

const CATEGORY_LABELS = {
	fiat: "Fiat Currencies",
	metals: "Precious Metals",
	crypto: "Cryptocurrencies",
	stocks: "Stocks",
};

const NUMBER_FORMATS = [
	{ id: "auto", label: "Auto (smart scaling)" },
	{ id: "fixed", label: "Fixed decimals" },
	{ id: "locale", label: "Locale format" },
	{ id: "compact", label: "Compact (K, M, B)" },
];

const CLIPBOARD_FORMATS = [
	{ id: "display-format", label: "As displayed" },
	{ id: "formatted-price", label: "Formatted price" },
	{ id: "price-only", label: "Raw price" },
];

const SYMBOL_POSITIONS = [
	{ id: "before", label: "Before price ($100)" },
	{ id: "after", label: "After price (100 $)" },
];

const PANEL_SORT_OPTIONS = [
	{ id: "none", label: "No sorting" },
	{ id: "symbol-asc", label: "Symbol (A → Z)" },
	{ id: "symbol-desc", label: "Symbol (Z → A)" },
	{ id: "price-asc", label: "Price (Low → High)" },
	{ id: "price-desc", label: "Price (High → Low)" },
];

const PANEL_POSITION_OPTIONS = [
	{ id: "left", label: "Left" },
	{ id: "center", label: "Center" },
	{ id: "right", label: "Right" },
];

export default class RabbitForexPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		const settings = this.getSettings();

		// General Settings Page
		const generalPage = new Adw.PreferencesPage({
			title: "General",
			icon_name: "preferences-system-symbolic",
		});
		window.add(generalPage);

		// Primary Currency Group
		const currencyGroup = new Adw.PreferencesGroup({
			title: "Display Currency",
			description: "Select the primary currency for displaying prices",
		});
		generalPage.add(currencyGroup);

		// Primary currency dropdown
		const currencyModel = new Gtk.StringList();
		for (const currency of COMMON_FIATS) {
			currencyModel.append(currency);
		}

		const currencyRow = new Adw.ComboRow({
			title: "Primary Currency",
			subtitle: "Prices will be displayed in this currency",
			model: currencyModel,
		});

		// Set current value
		const currentCurrency = settings.get_string("primary-currency");
		const currencyIndex = COMMON_FIATS.indexOf(currentCurrency);
		if (currencyIndex >= 0) {
			currencyRow.selected = currencyIndex;
		}

		currencyRow.connect("notify::selected", () => {
			const selected = COMMON_FIATS[currencyRow.selected];
			settings.set_string("primary-currency", selected);
		});
		currencyGroup.add(currencyRow);

		// Panel Settings Group
		const panelGroup = new Adw.PreferencesGroup({
			title: "Panel Settings",
			description: "Configure how rates appear in the top panel",
		});
		generalPage.add(panelGroup);

		// Show currency in panel toggle
		const showCurrencyInPanelRow = new Adw.SwitchRow({
			title: "Show Currency in Panel",
			subtitle: "Display currency symbol/code alongside rates in the panel",
		});
		showCurrencyInPanelRow.active = settings.get_boolean("show-currency-in-panel");
		showCurrencyInPanelRow.connect("notify::active", () => {
			settings.set_boolean("show-currency-in-panel", showCurrencyInPanelRow.active);
		});
		panelGroup.add(showCurrencyInPanelRow);

		// Max panel items
		const maxPanelRow = new Adw.SpinRow({
			title: "Max Panel Items",
			subtitle: "Maximum number of rates to show in the panel",
			adjustment: new Gtk.Adjustment({
				lower: 1,
				upper: 20,
				step_increment: 1,
				page_increment: 1,
				value: settings.get_int("max-panel-items"),
			}),
		});
		maxPanelRow.adjustment.connect("value-changed", (adj) => {
			settings.set_int("max-panel-items", adj.value);
		});
		panelGroup.add(maxPanelRow);

		// Panel sort order dropdown
		const sortModel = new Gtk.StringList();
		for (const option of PANEL_SORT_OPTIONS) {
			sortModel.append(option.label);
		}

		const sortRow = new Adw.ComboRow({
			title: "Sort Order",
			subtitle: "How to sort items displayed in the panel",
			model: sortModel,
		});

		const currentSort = settings.get_string("panel-sort-order");
		const sortIndex = PANEL_SORT_OPTIONS.findIndex((o) => o.id === currentSort);
		sortRow.selected = sortIndex >= 0 ? sortIndex : 0;

		sortRow.connect("notify::selected", () => {
			const selected = PANEL_SORT_OPTIONS[sortRow.selected].id;
			settings.set_string("panel-sort-order", selected);
		});
		panelGroup.add(sortRow);

		// Panel position dropdown
		const panelPositionModel = new Gtk.StringList();
		for (const option of PANEL_POSITION_OPTIONS) {
			panelPositionModel.append(option.label);
		}

		const panelPositionRow = new Adw.ComboRow({
			title: "Panel Position",
			subtitle: "Where to place the indicator",
			model: panelPositionModel,
		});

		const currentPanelPosition = settings.get_string("panel-position");
		const panelPositionIndex = PANEL_POSITION_OPTIONS.findIndex((o) => o.id === currentPanelPosition);
		panelPositionRow.selected = panelPositionIndex >= 0 ? panelPositionIndex : 2;

		panelPositionRow.connect("notify::selected", () => {
			const selected = PANEL_POSITION_OPTIONS[panelPositionRow.selected].id;
			settings.set_string("panel-position", selected);
		});
		panelGroup.add(panelPositionRow);

		// Panel separator
		const separatorRow = new Adw.EntryRow({
			title: "Panel Separator",
		});
		separatorRow.text = settings.get_string("panel-separator");
		separatorRow.connect("changed", () => {
			settings.set_string("panel-separator", separatorRow.text);
		});
		panelGroup.add(separatorRow);

		// Panel item template
		const templateRow = new Adw.EntryRow({
			title: "Panel Item Template",
		});
		templateRow.text = settings.get_string("panel-item-template");
		templateRow.connect("changed", () => {
			settings.set_string("panel-item-template", templateRow.text);
		});
		panelGroup.add(templateRow);

		// Panel template help text
		const panelTemplateHelpRow = new Adw.ActionRow({
			title: "Template Placeholders",
			subtitle: "Use {symbol} for the symbol name and {rate} for the formatted rate",
		});
		panelTemplateHelpRow.sensitive = false;
		panelGroup.add(panelTemplateHelpRow);

		// Menu Settings Group
		const menuGroup = new Adw.PreferencesGroup({
			title: "Menu Settings",
			description: "Configure how rates appear in the dropdown menu",
		});
		generalPage.add(menuGroup);

		// Menu item template
		const menuTemplateRow = new Adw.EntryRow({
			title: "Menu Item Template",
		});
		menuTemplateRow.text = settings.get_string("menu-item-template");
		menuTemplateRow.connect("changed", () => {
			settings.set_string("menu-item-template", menuTemplateRow.text);
		});
		menuGroup.add(menuTemplateRow);

		// Menu template help text
		const menuTemplateHelpRow = new Adw.ActionRow({
			title: "Template Placeholders",
			subtitle: "Use {symbol} for the symbol name and {rate} for the formatted rate",
		});
		menuTemplateHelpRow.sensitive = false;
		menuGroup.add(menuTemplateHelpRow);

		// Number Format Group
		const formatGroup = new Adw.PreferencesGroup({
			title: "Number Formatting",
			description: "Configure how prices are displayed",
		});
		generalPage.add(formatGroup);

		// Number format dropdown
		const formatModel = new Gtk.StringList();
		for (const format of NUMBER_FORMATS) {
			formatModel.append(format.label);
		}

		const formatRow = new Adw.ComboRow({
			title: "Number Format",
			subtitle: "How numbers are formatted",
			model: formatModel,
		});

		const currentFormat = settings.get_string("number-format");
		const formatIndex = NUMBER_FORMATS.findIndex((f) => f.id === currentFormat);
		formatRow.selected = formatIndex >= 0 ? formatIndex : 0;

		formatRow.connect("notify::selected", () => {
			const selected = NUMBER_FORMATS[formatRow.selected].id;
			settings.set_string("number-format", selected);
		});
		formatGroup.add(formatRow);

		// Decimal places
		const decimalRow = new Adw.SpinRow({
			title: "Decimal Places",
			subtitle: "Number of decimal places to display",
			adjustment: new Gtk.Adjustment({
				lower: 0,
				upper: 10,
				step_increment: 1,
				page_increment: 1,
				value: settings.get_int("decimal-places"),
			}),
		});
		decimalRow.adjustment.connect("value-changed", (adj) => {
			settings.set_int("decimal-places", adj.value);
		});
		formatGroup.add(decimalRow);

		// Currency Symbols Group
		const symbolsGroup = new Adw.PreferencesGroup({
			title: "Currency Symbols",
			description: "Use symbols like €, $, £ instead of currency codes",
		});
		generalPage.add(symbolsGroup);

		// Use currency symbols toggle
		const useSymbolsRow = new Adw.SwitchRow({
			title: "Use Currency Symbols",
			subtitle: "Display € instead of EUR, $ instead of USD, etc.",
		});
		useSymbolsRow.active = settings.get_boolean("use-currency-symbols");
		useSymbolsRow.connect("notify::active", () => {
			settings.set_boolean("use-currency-symbols", useSymbolsRow.active);
		});
		symbolsGroup.add(useSymbolsRow);

		// Symbol position dropdown
		const positionModel = new Gtk.StringList();
		for (const pos of SYMBOL_POSITIONS) {
			positionModel.append(pos.label);
		}

		const positionRow = new Adw.ComboRow({
			title: "Symbol Position",
			subtitle: "Where to place the currency symbol",
			model: positionModel,
		});

		const currentPosition = settings.get_string("symbol-position");
		const positionIndex = SYMBOL_POSITIONS.findIndex((p) => p.id === currentPosition);
		positionRow.selected = positionIndex >= 0 ? positionIndex : 0;

		positionRow.connect("notify::selected", () => {
			const selected = SYMBOL_POSITIONS[positionRow.selected].id;
			settings.set_string("symbol-position", selected);
		});
		symbolsGroup.add(positionRow);

		// Clipboard Group
		const clipboardGroup = new Adw.PreferencesGroup({
			title: "Clipboard",
			description: "Configure what gets copied when clicking a rate",
		});
		generalPage.add(clipboardGroup);

		// Clipboard format dropdown
		const clipboardModel = new Gtk.StringList();
		for (const format of CLIPBOARD_FORMATS) {
			clipboardModel.append(format.label);
		}

		const clipboardRow = new Adw.ComboRow({
			title: "Clipboard Format",
			subtitle: "Format of copied text when clicking a rate",
			model: clipboardModel,
		});

		// Clipboard notification toggle
		const clipboardNotificationRow = new Adw.SwitchRow({
			title: "Show Notification",
			subtitle: "Display a notification when a rate is copied to clipboard",
		});
		clipboardNotificationRow.active = settings.get_boolean("clipboard-notification");
		clipboardNotificationRow.connect("notify::active", () => {
			settings.set_boolean("clipboard-notification", clipboardNotificationRow.active);
		});
		clipboardGroup.add(clipboardNotificationRow);

		const currentClipboard = settings.get_string("clipboard-format");
		const clipboardIndex = CLIPBOARD_FORMATS.findIndex((f) => f.id === currentClipboard);
		clipboardRow.selected = clipboardIndex >= 0 ? clipboardIndex : 0;

		clipboardRow.connect("notify::selected", () => {
			const selected = CLIPBOARD_FORMATS[clipboardRow.selected].id;
			settings.set_string("clipboard-format", selected);
		});
		clipboardGroup.add(clipboardRow);

		// Clipboard template
		const clipboardTemplateRow = new Adw.EntryRow({
			title: "Clipboard Template",
		});
		clipboardTemplateRow.text = settings.get_string("clipboard-template");
		clipboardTemplateRow.connect("changed", () => {
			settings.set_string("clipboard-template", clipboardTemplateRow.text);
		});
		clipboardGroup.add(clipboardTemplateRow);

		// Clipboard template help text
		const clipboardTemplateHelpRow = new Adw.ActionRow({
			title: "Template Placeholders",
			subtitle: "Used when format is 'As displayed'. Use {symbol} and {rate}.",
		});
		clipboardTemplateHelpRow.sensitive = false;
		clipboardGroup.add(clipboardTemplateHelpRow);

		// Metals Unit Group
		const metalsGroup = new Adw.PreferencesGroup({
			title: "Metals Display",
			description: "Configure how metal prices are displayed",
		});
		generalPage.add(metalsGroup);

		// Metals unit dropdown
		const unitModel = new Gtk.StringList();
		unitModel.append("Gram");
		unitModel.append("Troy Ounce");

		const unitRow = new Adw.ComboRow({
			title: "Weight Unit",
			subtitle: "Unit for displaying metal prices",
			model: unitModel,
		});

		// Set current value
		const currentUnit = settings.get_string("metals-unit");
		unitRow.selected = currentUnit === "troy-ounce" ? 1 : 0;

		unitRow.connect("notify::selected", () => {
			const selected = unitRow.selected === 1 ? "troy-ounce" : "gram";
			settings.set_string("metals-unit", selected);
		});
		metalsGroup.add(unitRow);

		// Update Settings Group
		const updateGroup = new Adw.PreferencesGroup({
			title: "Update Settings",
			description: "Configure how often rates are fetched",
		});
		generalPage.add(updateGroup);

		// Update interval
		const intervalRow = new Adw.SpinRow({
			title: "Update Interval",
			subtitle: "How often to fetch new rates (in seconds)",
			adjustment: new Gtk.Adjustment({
				lower: 10,
				upper: 3600,
				step_increment: 10,
				page_increment: 60,
				value: settings.get_int("update-interval"),
			}),
		});
		intervalRow.adjustment.connect("value-changed", (adj) => {
			settings.set_int("update-interval", adj.value);
		});
		updateGroup.add(intervalRow);

		// Category Pages
		const categories = ["fiat", "metals", "crypto", "stocks"];

		for (const category of categories) {
			const page = this._createCategoryPage(category, settings, window);
			window.add(page);
		}
	}

	_createCategoryPage(category, settings, window) {
		const icons = {
			fiat: "accessories-calculator-symbolic",
			metals: "emoji-symbols-symbolic",
			crypto: "emblem-documents-symbolic",
			stocks: "view-paged-symbolic",
		};

		const page = new Adw.PreferencesPage({
			title: CATEGORY_LABELS[category],
			icon_name: icons[category],
		});

		// Watched Symbols Group
		const watchedGroup = new Adw.PreferencesGroup({
			title: "Watched Symbols",
			description: "Symbols to monitor in the dropdown menu",
		});
		page.add(watchedGroup);

		// Current watched symbols display
		const watchedEntry = new Adw.EntryRow({
			title: "Symbols (comma-separated)",
		});

		const watched = settings.get_strv(`watched-${category}`);
		watchedEntry.text = watched.join(", ");

		watchedEntry.connect("changed", () => {
			const text = watchedEntry.text;
			const symbols = text
				.split(",")
				.map((s) => s.trim().toUpperCase())
				.filter((s) => s.length > 0);
			settings.set_strv(`watched-${category}`, symbols);
		});
		watchedGroup.add(watchedEntry);

		// Panel Symbols Group
		const panelSymbolsGroup = new Adw.PreferencesGroup({
			title: "Panel Display",
			description: "Symbols to show in the top panel (subset of watched)",
		});
		page.add(panelSymbolsGroup);

		const panelEntry = new Adw.EntryRow({
			title: "Panel Symbols (comma-separated)",
		});

		const panelSymbols = settings.get_strv(`panel-${category}`);
		panelEntry.text = panelSymbols.join(", ");

		panelEntry.connect("changed", () => {
			const text = panelEntry.text;
			const symbols = text
				.split(",")
				.map((s) => s.trim().toUpperCase())
				.filter((s) => s.length > 0);
			settings.set_strv(`panel-${category}`, symbols);
		});
		panelSymbolsGroup.add(panelEntry);

		// Quick Add Popular Symbols Group
		const popularGroup = new Adw.PreferencesGroup({
			title: "Quick Add Popular Symbols",
			description: "Click to add popular symbols",
		});
		page.add(popularGroup);

		// Create a flow box for popular symbol buttons
		const flowBox = new Gtk.FlowBox({
			selection_mode: Gtk.SelectionMode.NONE,
			homogeneous: true,
			column_spacing: 6,
			row_spacing: 6,
			margin_start: 12,
			margin_end: 12,
			margin_top: 6,
			margin_bottom: 6,
		});

		const popular = POPULAR_SYMBOLS[category] || [];
		for (const symbol of popular) {
			const button = new Gtk.Button({
				label: symbol,
				css_classes: ["suggested-action"],
			});

			button.connect("clicked", () => {
				const currentWatched = settings.get_strv(`watched-${category}`);
				if (!currentWatched.includes(symbol)) {
					currentWatched.push(symbol);
					settings.set_strv(`watched-${category}`, currentWatched);
					watchedEntry.text = currentWatched.join(", ");
				}
			});

			flowBox.append(button);
		}

		const flowBoxRow = new Adw.ActionRow();
		flowBoxRow.set_child(flowBox);
		popularGroup.add(flowBoxRow);

		// Fetch Available Symbols Group
		const fetchGroup = new Adw.PreferencesGroup({
			title: "Available Symbols",
			description: "Fetch all available symbols from the API",
		});
		page.add(fetchGroup);

		const fetchRow = new Adw.ActionRow({
			title: "Fetch Available Symbols",
			subtitle: "Load all symbols from the server",
		});

		const fetchButton = new Gtk.Button({
			label: "Fetch",
			valign: Gtk.Align.CENTER,
			css_classes: ["suggested-action"],
		});

		const spinner = new Gtk.Spinner({
			valign: Gtk.Align.CENTER,
			visible: false,
		});

		fetchRow.add_suffix(spinner);
		fetchRow.add_suffix(fetchButton);
		fetchGroup.add(fetchRow);

		// Available symbols list (expandable)
		const availableExpander = new Adw.ExpanderRow({
			title: "Available Symbols",
			subtitle: 'Click "Fetch" to load symbols',
		});
		fetchGroup.add(availableExpander);

		// Store reference to clear rows later
		let symbolRows = [];

		fetchButton.connect("clicked", async () => {
			fetchButton.sensitive = false;
			spinner.visible = true;
			spinner.spinning = true;

			try {
				const symbols = await this._fetchAvailableSymbols(category);

				// Clear ALL existing rows first
				for (const row of symbolRows) {
					try {
						availableExpander.remove(row);
					} catch (e) {
						// Row might already be removed
					}
				}
				symbolRows = [];

				const displaySymbols = symbols;
				for (const symbol of displaySymbols) {
					const symbolRow = new Adw.ActionRow({
						title: symbol,
					});

					const addButton = new Gtk.Button({
						icon_name: "list-add-symbolic",
						valign: Gtk.Align.CENTER,
						css_classes: ["flat"],
					});

					addButton.connect("clicked", () => {
						const currentWatched = settings.get_strv(`watched-${category}`);
						if (!currentWatched.includes(symbol)) {
							currentWatched.push(symbol);
							settings.set_strv(`watched-${category}`, currentWatched);
							watchedEntry.text = currentWatched.join(", ");
						}
					});

					symbolRow.add_suffix(addButton);
					availableExpander.add_row(symbolRow);
					symbolRows.push(symbolRow);
				}

				availableExpander.subtitle = `${symbols.length} symbols available`;
			} catch (error) {
				availableExpander.subtitle = `Error: ${error.message}`;
			}

			spinner.spinning = false;
			spinner.visible = false;
			fetchButton.sensitive = true;
		});

		return page;
	}

	async _fetchAvailableSymbols(category) {
		const url = ENDPOINTS[category];
		const session = new Soup.Session();
		const message = Soup.Message.new("GET", url);

		const bytes = await new Promise((resolve, reject) => {
			session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
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
		const data = JSON.parse(text);

		return Object.keys(data.rates).sort();
	}
}
