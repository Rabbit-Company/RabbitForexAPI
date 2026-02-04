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

const CLICK_ACTIONS = [
	{ id: "graph", label: "Show price history graph" },
	{ id: "clipboard", label: "Copy to clipboard" },
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

const PRICE_CHANGE_MODES = [
	{ id: "none", label: "Disabled" },
	{ id: "previous-update", label: "Previous update" },
	{ id: "hour-ago", label: "1 hour ago" },
	{ id: "day-start", label: "Start of day" },
	{ id: "day-ago", label: "24 hours ago" },
	{ id: "week-start", label: "Start of week" },
	{ id: "week-ago", label: "7 days ago" },
	//{ id: "month-start", label: "Start of month" },
	{ id: "month-ago", label: "30 days ago" },
	{ id: "custom", label: "Custom date" },
];

const FIRST_DAY_OF_WEEK_OPTIONS = [
	{ id: "monday", label: "Monday" },
	{ id: "tuesday", label: "Tuesday" },
	{ id: "wednesday", label: "Wednesday" },
	{ id: "thursday", label: "Thursday" },
	{ id: "friday", label: "Friday" },
	{ id: "saturday", label: "Saturday" },
	{ id: "sunday", label: "Sunday" },
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

		const currencyModel = new Gtk.StringList();
		for (const currency of COMMON_FIATS) {
			currencyModel.append(currency);
		}

		const currencyRow = new Adw.ComboRow({
			title: "Primary Currency",
			subtitle: "Prices will be displayed in this currency",
			model: currencyModel,
		});

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

		const showCurrencyInPanelRow = new Adw.SwitchRow({
			title: "Show Currency in Panel",
			subtitle: "Display currency symbol/code alongside rates in the panel",
		});
		showCurrencyInPanelRow.active = settings.get_boolean("show-currency-in-panel");
		showCurrencyInPanelRow.connect("notify::active", () => {
			settings.set_boolean("show-currency-in-panel", showCurrencyInPanelRow.active);
		});
		panelGroup.add(showCurrencyInPanelRow);

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

		const panelPositionModel = new Gtk.StringList();
		for (const option of PANEL_POSITION_OPTIONS) {
			panelPositionModel.append(option.label);
		}

		const panelPositionRow = new Adw.ComboRow({
			title: "Panel Position",
			subtitle: "Where to place the indicator in the panel",
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

		const panelIndexRow = new Adw.SpinRow({
			title: "Panel Index",
			subtitle: "Order within panel area",
			adjustment: new Gtk.Adjustment({
				lower: 0,
				upper: 20,
				step_increment: 1,
				page_increment: 1,
				value: settings.get_int("panel-index"),
			}),
		});
		panelIndexRow.adjustment.connect("value-changed", (adj) => {
			settings.set_int("panel-index", adj.value);
		});
		panelGroup.add(panelIndexRow);

		const separatorRow = new Adw.EntryRow({ title: "Panel Separator" });
		separatorRow.text = settings.get_string("panel-separator");
		separatorRow.connect("changed", () => {
			settings.set_string("panel-separator", separatorRow.text);
		});
		panelGroup.add(separatorRow);

		const templateRow = new Adw.EntryRow({ title: "Panel Item Template" });
		templateRow.text = settings.get_string("panel-item-template");
		templateRow.connect("changed", () => {
			settings.set_string("panel-item-template", templateRow.text);
		});
		panelGroup.add(templateRow);

		const panelTemplateHelpRow = new Adw.ActionRow({
			title: "Template Placeholders",
			subtitle: "Use {symbol}, {rate}, {change}, {percent}. Supports Pango markup.",
		});
		panelTemplateHelpRow.sensitive = false;
		panelGroup.add(panelTemplateHelpRow);

		// Price Change Indicator Group
		const priceChangeGroup = new Adw.PreferencesGroup({
			title: "Price Change Indicator",
			description: "Configure how price changes are displayed",
		});
		generalPage.add(priceChangeGroup);

		const priceChangeModeModel = new Gtk.StringList();
		for (const mode of PRICE_CHANGE_MODES) {
			priceChangeModeModel.append(mode.label);
		}

		const priceChangeModeRow = new Adw.ComboRow({
			title: "Price Change Mode",
			subtitle: "How to determine if price increased or decreased",
			model: priceChangeModeModel,
		});

		const currentPriceChangeMode = settings.get_string("price-change-mode");
		const priceChangeModeIndex = PRICE_CHANGE_MODES.findIndex((m) => m.id === currentPriceChangeMode);
		priceChangeModeRow.selected = priceChangeModeIndex >= 0 ? priceChangeModeIndex : 0;

		priceChangeGroup.add(priceChangeModeRow);

		const firstDayOfWeekModel = new Gtk.StringList();
		for (const day of FIRST_DAY_OF_WEEK_OPTIONS) {
			firstDayOfWeekModel.append(day.label);
		}
		const firstDayOfWeekRow = new Adw.ComboRow({
			title: "First Day of Week",
			subtitle: "Which day starts the week for 'Start of week' mode",
			model: firstDayOfWeekModel,
		});

		const currentFirstDay = settings.get_string("first-day-of-week");
		const firstDayIndex = FIRST_DAY_OF_WEEK_OPTIONS.findIndex((d) => d.id === currentFirstDay);
		firstDayOfWeekRow.selected = firstDayIndex >= 0 ? firstDayIndex : 0;

		// Only show when week-start mode is selected
		firstDayOfWeekRow.visible = currentPriceChangeMode === "week-start";

		firstDayOfWeekRow.connect("notify::selected", () => {
			const selected = FIRST_DAY_OF_WEEK_OPTIONS[firstDayOfWeekRow.selected].id;
			settings.set_string("first-day-of-week", selected);
		});
		priceChangeGroup.add(firstDayOfWeekRow);

		// Custom Date Row - Compact date picker with popover calendar
		const customDateRow = new Adw.ActionRow({
			title: "Reference Date",
			subtitle: "Select a date to compare prices against",
		});

		customDateRow.visible = currentPriceChangeMode === "custom";

		const dateButtonBox = new Gtk.Box({
			orientation: Gtk.Orientation.HORIZONTAL,
			spacing: 6,
			valign: Gtk.Align.CENTER,
		});

		// Button that shows the selected date and opens the calendar popover
		const dateButton = new Gtk.MenuButton({
			valign: Gtk.Align.CENTER,
			css_classes: ["flat"],
		});

		// Calendar in a popover
		const calendarPopover = new Gtk.Popover();
		const popoverBox = new Gtk.Box({
			orientation: Gtk.Orientation.VERTICAL,
			spacing: 6,
			margin_start: 6,
			margin_end: 6,
			margin_top: 6,
			margin_bottom: 6,
		});

		const calendar = new Gtk.Calendar();
		popoverBox.append(calendar);

		// Info label showing available range
		const rangeLabel = new Gtk.Label({
			css_classes: ["dim-label", "caption"],
			wrap: true,
			max_width_chars: 25,
		});
		popoverBox.append(rangeLabel);

		calendarPopover.set_child(popoverBox);
		dateButton.set_popover(calendarPopover);

		const fetchDatesButton = new Gtk.Button({
			icon_name: "view-refresh-symbolic",
			valign: Gtk.Align.CENTER,
			tooltip_text: "Fetch available date range from server",
			css_classes: ["flat"],
		});

		const dateSpinner = new Gtk.Spinner({
			valign: Gtk.Align.CENTER,
			visible: false,
		});

		dateButtonBox.append(dateButton);
		dateButtonBox.append(fetchDatesButton);
		dateButtonBox.append(dateSpinner);
		customDateRow.add_suffix(dateButtonBox);

		// Track available date range
		let minAvailableDate = null;
		let maxAvailableDate = null;

		const formatDate = (year, month, day) => {
			const y = year.toString();
			const m = (month + 1).toString().padStart(2, "0");
			const d = day.toString().padStart(2, "0");
			return `${y}-${m}-${d}`;
		};

		const parseDate = (dateStr) => {
			if (!dateStr || dateStr.length !== 10) return null;
			const parts = dateStr.split("-");
			return {
				year: parseInt(parts[0], 10),
				month: parseInt(parts[1], 10) - 1,
				day: parseInt(parts[2], 10),
			};
		};

		// Update the button label with current date
		const updateButtonLabel = () => {
			const currentDate = settings.get_string("custom-reference-date");
			if (currentDate && currentDate.length === 10) {
				dateButton.label = currentDate;
			} else {
				dateButton.label = "Select date...";
			}
		};

		// Update range label
		const updateRangeLabel = () => {
			if (minAvailableDate && maxAvailableDate) {
				rangeLabel.label = `Available: ${minAvailableDate} to ${maxAvailableDate}`;
			} else {
				rangeLabel.label = "Click refresh to load available dates";
			}
		};

		// Initialize calendar with current setting
		const initializeCalendar = () => {
			const currentDate = settings.get_string("custom-reference-date");
			const parsed = parseDate(currentDate);
			if (parsed) {
				const gdate = GLib.DateTime.new_utc(parsed.year, parsed.month + 1, parsed.day, 0, 0, 0);
				if (gdate) {
					calendar.select_day(gdate);
				}
			}
			updateButtonLabel();
		};

		// Load cached dates and set range
		const cachedDates = settings.get_strv("available-history-dates");
		if (cachedDates.length > 0) {
			maxAvailableDate = cachedDates[0];
			minAvailableDate = cachedDates[cachedDates.length - 1];
		}

		initializeCalendar();
		updateRangeLabel();

		// Handle calendar date selection
		calendar.connect("day-selected", () => {
			const selectedDate = calendar.get_date();
			const year = selectedDate.get_year();
			const month = selectedDate.get_month() - 1;
			const day = selectedDate.get_day_of_month();
			const dateStr = formatDate(year, month, day);

			// Check if date is within available range
			if (minAvailableDate && maxAvailableDate) {
				if (dateStr < minAvailableDate) {
					// Date too old, snap to minimum
					const parsed = parseDate(minAvailableDate);
					if (parsed) {
						const gdate = GLib.DateTime.new_utc(parsed.year, parsed.month + 1, parsed.day, 0, 0, 0);
						calendar.select_day(gdate);
					}
					return;
				}
				if (dateStr > maxAvailableDate) {
					// Date too new, snap to maximum
					const parsed = parseDate(maxAvailableDate);
					if (parsed) {
						const gdate = GLib.DateTime.new_utc(parsed.year, parsed.month + 1, parsed.day, 0, 0, 0);
						calendar.select_day(gdate);
					}
					return;
				}
			}

			settings.set_string("custom-reference-date", dateStr);
			updateButtonLabel();
			calendarPopover.popdown();
		});

		// Fetch available dates button
		fetchDatesButton.connect("clicked", async () => {
			fetchDatesButton.sensitive = false;
			dateSpinner.visible = true;
			dateSpinner.spinning = true;

			try {
				const dates = await this._fetchAvailableHistoryDates();
				settings.set_strv("available-history-dates", dates);

				if (dates.length > 0) {
					maxAvailableDate = dates[0];
					minAvailableDate = dates[dates.length - 1];
					updateRangeLabel();

					// If no date is set or current date is out of range, set to most recent
					const currentDate = settings.get_string("custom-reference-date");
					if (!currentDate || currentDate < minAvailableDate || currentDate > maxAvailableDate) {
						settings.set_string("custom-reference-date", maxAvailableDate);
						const parsed = parseDate(maxAvailableDate);
						if (parsed) {
							const gdate = GLib.DateTime.new_utc(parsed.year, parsed.month + 1, parsed.day, 0, 0, 0);
							calendar.select_day(gdate);
						}
						updateButtonLabel();
					}
				}
			} catch (error) {
				rangeLabel.label = `Error: ${error.message}`;
			}

			dateSpinner.spinning = false;
			dateSpinner.visible = false;
			fetchDatesButton.sensitive = true;
		});

		priceChangeGroup.add(customDateRow);

		priceChangeModeRow.connect("notify::selected", () => {
			const selected = PRICE_CHANGE_MODES[priceChangeModeRow.selected].id;
			settings.set_string("price-change-mode", selected);

			firstDayOfWeekRow.visible = selected === "week-start";
			customDateRow.visible = selected === "custom";
		});

		const templateUpRow = new Adw.EntryRow({ title: "Panel Template (Price Up)" });
		templateUpRow.text = settings.get_string("panel-item-template-up");
		templateUpRow.connect("changed", () => {
			settings.set_string("panel-item-template-up", templateUpRow.text);
		});
		priceChangeGroup.add(templateUpRow);

		const templateDownRow = new Adw.EntryRow({ title: "Panel Template (Price Down)" });
		templateDownRow.text = settings.get_string("panel-item-template-down");
		templateDownRow.connect("changed", () => {
			settings.set_string("panel-item-template-down", templateDownRow.text);
		});
		priceChangeGroup.add(templateDownRow);

		const priceChangeHelpRow = new Adw.ActionRow({
			title: "Template Placeholders",
			subtitle: "Use {symbol}, {rate}, {change}, {percent}. Supports Pango markup.",
		});
		priceChangeHelpRow.sensitive = false;
		priceChangeGroup.add(priceChangeHelpRow);

		// Menu Settings Group
		const menuGroup = new Adw.PreferencesGroup({
			title: "Menu Settings",
			description: "Configure how rates appear in the dropdown menu",
		});
		generalPage.add(menuGroup);

		const menuTemplateRow = new Adw.EntryRow({ title: "Menu Item Template" });
		menuTemplateRow.text = settings.get_string("menu-item-template");
		menuTemplateRow.connect("changed", () => {
			settings.set_string("menu-item-template", menuTemplateRow.text);
		});
		menuGroup.add(menuTemplateRow);

		const menuTemplateUpRow = new Adw.EntryRow({ title: "Menu Template (Price Up)" });
		menuTemplateUpRow.text = settings.get_string("menu-item-template-up");
		menuTemplateUpRow.connect("changed", () => {
			settings.set_string("menu-item-template-up", menuTemplateUpRow.text);
		});
		menuGroup.add(menuTemplateUpRow);

		const menuTemplateDownRow = new Adw.EntryRow({ title: "Menu Template (Price Down)" });
		menuTemplateDownRow.text = settings.get_string("menu-item-template-down");
		menuTemplateDownRow.connect("changed", () => {
			settings.set_string("menu-item-template-down", menuTemplateDownRow.text);
		});
		menuGroup.add(menuTemplateDownRow);

		const menuTemplateHelpRow = new Adw.ActionRow({
			title: "Template Placeholders",
			subtitle: "Use {symbol}, {rate}, {change}, {percent}. Supports Pango markup.",
		});
		menuTemplateHelpRow.sensitive = false;
		menuGroup.add(menuTemplateHelpRow);

		// Number Format Group
		const formatGroup = new Adw.PreferencesGroup({
			title: "Number Formatting",
			description: "Configure how prices are displayed",
		});
		generalPage.add(formatGroup);

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

		const useSymbolsRow = new Adw.SwitchRow({
			title: "Use Currency Symbols",
			subtitle: "Display € instead of EUR, $ instead of USD, etc.",
		});
		useSymbolsRow.active = settings.get_boolean("use-currency-symbols");
		useSymbolsRow.connect("notify::active", () => {
			settings.set_boolean("use-currency-symbols", useSymbolsRow.active);
		});
		symbolsGroup.add(useSymbolsRow);

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

		// Click Action Group
		const clickActionGroup = new Adw.PreferencesGroup({
			title: "Click Action",
			description: "Configure what happens when clicking a rate",
		});
		generalPage.add(clickActionGroup);

		const clickActionModel = new Gtk.StringList();
		for (const action of CLICK_ACTIONS) {
			clickActionModel.append(action.label);
		}

		const clickActionRow = new Adw.ComboRow({
			title: "Action",
			subtitle: "What to do when clicking a rate in the menu",
			model: clickActionModel,
		});

		const currentClickAction = settings.get_string("click-action");
		const clickActionIndex = CLICK_ACTIONS.findIndex((a) => a.id === currentClickAction);
		clickActionRow.selected = clickActionIndex >= 0 ? clickActionIndex : 0;

		clickActionRow.connect("notify::selected", () => {
			const selected = CLICK_ACTIONS[clickActionRow.selected].id;
			settings.set_string("click-action", selected);

			clipboardOptionsGroup.visible = selected === "clipboard";
		});
		clickActionGroup.add(clickActionRow);

		// Clipboard Options Group (only visible when click action is clipboard)
		const clipboardOptionsGroup = new Adw.PreferencesGroup({
			title: "Clipboard Options",
			description: "Configure clipboard behavior",
		});
		clipboardOptionsGroup.visible = currentClickAction === "clipboard";
		generalPage.add(clipboardOptionsGroup);

		const clipboardNotificationRow = new Adw.SwitchRow({
			title: "Show Notification",
			subtitle: "Display a notification when a rate is copied to clipboard",
		});
		clipboardNotificationRow.active = settings.get_boolean("clipboard-notification");
		clipboardNotificationRow.connect("notify::active", () => {
			settings.set_boolean("clipboard-notification", clipboardNotificationRow.active);
		});
		clipboardOptionsGroup.add(clipboardNotificationRow);

		const clipboardModel = new Gtk.StringList();
		for (const format of CLIPBOARD_FORMATS) {
			clipboardModel.append(format.label);
		}

		const clipboardRow = new Adw.ComboRow({
			title: "Clipboard Format",
			subtitle: "Format of copied text when clicking a rate",
			model: clipboardModel,
		});

		const currentClipboard = settings.get_string("clipboard-format");
		const clipboardIndex = CLIPBOARD_FORMATS.findIndex((f) => f.id === currentClipboard);
		clipboardRow.selected = clipboardIndex >= 0 ? clipboardIndex : 0;

		clipboardRow.connect("notify::selected", () => {
			const selected = CLIPBOARD_FORMATS[clipboardRow.selected].id;
			settings.set_string("clipboard-format", selected);
		});
		clipboardOptionsGroup.add(clipboardRow);

		const clipboardTemplateRow = new Adw.EntryRow({ title: "Clipboard Template" });
		clipboardTemplateRow.text = settings.get_string("clipboard-template");
		clipboardTemplateRow.connect("changed", () => {
			settings.set_string("clipboard-template", clipboardTemplateRow.text);
		});
		clipboardOptionsGroup.add(clipboardTemplateRow);

		const clipboardTemplateHelpRow = new Adw.ActionRow({
			title: "Template Placeholders",
			subtitle: "Used when format is 'As displayed'. Use {symbol} and {rate}.",
		});
		clipboardTemplateHelpRow.sensitive = false;
		clipboardOptionsGroup.add(clipboardTemplateHelpRow);

		// Metals Unit Group
		const metalsGroup = new Adw.PreferencesGroup({
			title: "Metals Display",
			description: "Configure how metal prices are displayed",
		});
		generalPage.add(metalsGroup);

		const unitModel = new Gtk.StringList();
		unitModel.append("Gram");
		unitModel.append("Troy Ounce");

		const unitRow = new Adw.ComboRow({
			title: "Weight Unit",
			subtitle: "Unit for displaying metal prices",
			model: unitModel,
		});

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

		// Support & Donations Group
		const donationGroup = new Adw.PreferencesGroup({
			title: "Support the Project",
			description: "Help cover server costs and support development",
		});
		generalPage.add(donationGroup);

		const donationRow = new Adw.ActionRow({
			title: "💝 Donate",
			subtitle: "Support Rabbit Forex with a donation",
			activatable: true,
		});

		const donationLinkIcon = new Gtk.Image({
			icon_name: "emblem-web-symbolic",
			valign: Gtk.Align.CENTER,
		});
		donationRow.add_suffix(donationLinkIcon);

		const donationArrow = new Gtk.Image({
			icon_name: "go-next-symbolic",
			valign: Gtk.Align.CENTER,
		});
		donationRow.add_suffix(donationArrow);

		donationRow.connect("activated", () => {
			Gio.AppInfo.launch_default_for_uri("https://rabbit-company.com/donation", null);
		});
		donationGroup.add(donationRow);

		const aboutRow = new Adw.ActionRow({
			title: "Your support helps keep this extension free and maintained",
			subtitle: "Thank you for using Rabbit Forex! ❤️",
		});
		aboutRow.sensitive = false;
		donationGroup.add(aboutRow);

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

		const watchedEntry = new Adw.EntryRow({ title: "Symbols (comma-separated)" });
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

		const panelEntry = new Adw.EntryRow({ title: "Panel Symbols (comma-separated)" });
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

		const availableExpander = new Adw.ExpanderRow({
			title: "Available Symbols",
			subtitle: 'Click "Fetch" to load symbols',
		});
		fetchGroup.add(availableExpander);

		let symbolRows = [];

		fetchButton.connect("clicked", async () => {
			fetchButton.sensitive = false;
			spinner.visible = true;
			spinner.spinning = true;

			try {
				const symbols = await this._fetchAvailableSymbols(category);

				for (const row of symbolRows) {
					try {
						availableExpander.remove(row);
					} catch (e) {}
				}
				symbolRows = [];

				for (const symbol of symbols) {
					const symbolRow = new Adw.ActionRow({ title: symbol });

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

	async _fetchAvailableHistoryDates() {
		// Fetch from the daily history endpoint to get available dates
		const url = `${API_BASE}/rates/history/EUR/daily`;
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

		if (!data.data || !Array.isArray(data.data)) {
			throw new Error("Invalid response format");
		}

		// Extract unique dates from the data points and sort them (newest first)
		const dates = data.data
			.map((dp) => {
				const ts = dp.timestamp;
				// Handle both full ISO timestamps and date-only strings
				if (ts && ts.includes("T")) {
					return ts.split("T")[0];
				}
				return ts;
			})
			.filter((date) => date && date.length === 10);

		// Remove duplicates and sort newest first
		const uniqueDates = [...new Set(dates)].sort().reverse();

		return uniqueDates;
	}
}
