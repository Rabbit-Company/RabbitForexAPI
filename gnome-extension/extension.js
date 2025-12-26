import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Soup from "gi://Soup?version=3.0";
import St from "gi://St";
import Clutter from "gi://Clutter";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

const API_BASE = "https://forex.rabbitmonitor.com/v1";
const TROY_OUNCE_TO_GRAM = 31.1034768;

const CATEGORY_ICONS = {
	fiat: "💱",
	metals: "🥇",
	crypto: "₿",
	stocks: "📈",
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
			this._isDestroyed = false;

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

			console.log("Rabbit Forex: Extension initialized");
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

		_buildMenu() {
			// Header
			/*
			const headerItem = new PopupMenu.PopupMenuItem("🐰 Rabbit Forex", {
				reactive: false,
			});
			this.menu.addMenuItem(headerItem);

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
			*/

			// Rates section - will be populated dynamically
			this._ratesSection = new PopupMenu.PopupMenuSection();
			this.menu.addMenuItem(this._ratesSection);

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

			// Last updated timestamp
			this._timestampItem = new PopupMenu.PopupMenuItem("Last updated: --", {
				reactive: false,
			});
			this.menu.addMenuItem(this._timestampItem);

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
		}

		_startUpdateTimer() {
			if (this._updateTimeout) {
				GLib.source_remove(this._updateTimeout);
				this._updateTimeout = null;
			}

			const interval = this._settings.get_int("update-interval");
			this._updateTimeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, interval, () => {
				if (this._isDestroyed) {
					return GLib.SOURCE_REMOVE;
				}
				this._fetchAllRates();
				return GLib.SOURCE_CONTINUE;
			});
		}

		_onSettingsChanged() {
			if (this._isDestroyed) return;
			this._startUpdateTimer();
			// Re-fetch rates when settings change (especially primary currency)
			this._fetchAllRates();
		}

		async _fetchAllRates() {
			if (this._isDestroyed) return;

			const categories = ["fiat", "metals", "crypto", "stocks"];

			for (const category of categories) {
				if (this._isDestroyed) return;
				if (this._hasWatchedItems(category)) {
					await this._fetchRates(category);
				}
			}

			if (!this._isDestroyed) {
				this._updateDisplay();
			}
		}

		_hasWatchedItems(category) {
			try {
				const watched = this._settings.get_strv(`watched-${category}`);
				return watched && watched.length > 0;
			} catch (e) {
				console.error(`Rabbit Forex: Error checking watched-${category}:`, e);
				return false;
			}
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
					console.error(`Rabbit Forex: Failed to fetch ${category} rates: HTTP ${message.status_code}`);
					return;
				}

				const decoder = new TextDecoder("utf-8");
				const text = decoder.decode(bytes.get_data());
				const data = JSON.parse(text);

				this._rates[category] = data.rates;
				this._timestamps[category] = data.timestamps;
			} catch (error) {
				console.error(`Rabbit Forex: Error fetching ${category} rates:`, error.message);
			}
		}

		_updateDisplay() {
			if (this._isDestroyed) return;
			this._updatePanelLabel();
			this._updateMenuRates();
			this._updateTimestamp();
		}

		_updatePanelLabel() {
			const panelItems = [];
			const categories = ["fiat", "metals", "crypto", "stocks"];
			const maxPanelItems = this._settings.get_int("max-panel-items");
			const primaryCurrency = this._settings.get_string("primary-currency");

			for (const category of categories) {
				if (!this._rates[category]) continue;

				try {
					const showInPanel = this._settings.get_strv(`panel-${category}`);

					for (const symbol of showInPanel) {
						if (panelItems.length >= maxPanelItems) break;

						if (this._rates[category][symbol] !== undefined) {
							const rate = this._rates[category][symbol];
							const formattedRate = this._formatPanelRate(rate, category, symbol);
							panelItems.push(`${symbol}: ${formattedRate}`);
						}
					}
				} catch (e) {
					console.error(`Rabbit Forex: Error getting panel-${category}:`, e);
				}
			}

			if (panelItems.length === 0) {
				this._panelLabel.text = "Rabbit Forex";
			} else {
				this._panelLabel.text = panelItems.join(" | ");
			}
		}

		_updateMenuRates() {
			this._ratesSection.removeAll();

			const categories = ["fiat", "metals", "crypto", "stocks"];
			const categoryLabels = {
				fiat: "Fiat Currencies",
				metals: "Precious Metals",
				crypto: "Cryptocurrencies",
				stocks: "Stocks",
			};

			const primaryCurrency = this._settings.get_string("primary-currency");
			const metalsUnit = this._settings.get_string("metals-unit");

			let hasAnyRates = false;

			// Determine which categories will actually be shown
			const visibleCategories = categories.filter((category) => {
				try {
					const watched = this._settings.get_strv(`watched-${category}`);
					return watched && watched.length > 0 && this._rates[category];
				} catch (e) {
					console.error(`Rabbit Forex: Error getting watched-${category}:`, e);
					return false;
				}
			});

			for (let i = 0; i < visibleCategories.length; i++) {
				const category = visibleCategories[i];
				const watched = this._settings.get_strv(`watched-${category}`);

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
						const displayRate = this._formatDisplayRate(rate, category, symbol, primaryCurrency);

						const rateItem = new PopupMenu.PopupMenuItem(`    ${symbol}: ${displayRate}`, { reactive: true });

						// Copy to clipboard on click
						rateItem.connect("activate", () => {
							const clipboard = St.Clipboard.get_default();
							clipboard.set_text(St.ClipboardType.CLIPBOARD, `${symbol}: ${displayRate}`);
							Main.notify("Copied to clipboard", `${symbol}: ${displayRate}`);
						});

						this._ratesSection.addMenuItem(rateItem);
					} else {
						const rateItem = new PopupMenu.PopupMenuItem(`    ${symbol}: N/A`, { reactive: false });
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

		_formatPanelRate(rate, category, symbol) {
			const primaryCurrency = this._settings.get_string("primary-currency");

			if (category === "metals") {
				let price = 1 / rate;
				const metalsUnit = this._settings.get_string("metals-unit");
				if (metalsUnit === "troy-ounce") {
					price = price * TROY_OUNCE_TO_GRAM;
				}
				return this._formatNumber(price);
			}

			if (category === "stocks") {
				const price = 1 / rate;
				return this._formatNumber(price);
			}

			if (category === "crypto") {
				const price = 1 / rate;
				return this._formatNumber(price);
			}

			return this._formatNumber(rate);
		}

		_formatDisplayRate(rate, category, symbol, primaryCurrency) {
			if (category === "metals") {
				let price = 1 / rate;
				const metalsUnit = this._settings.get_string("metals-unit");
				if (metalsUnit === "troy-ounce") {
					price = price * TROY_OUNCE_TO_GRAM;
				}
				return `${this._formatNumber(price)} ${primaryCurrency}`;
			}

			if (category === "stocks") {
				const price = 1 / rate;
				return `${this._formatNumber(price)} ${primaryCurrency}`;
			}

			if (category === "fiat") {
				const price = 1 / rate;
				return `${this._formatNumber(price)} ${primaryCurrency}`;
			}

			if (category === "crypto") {
				const price = 1 / rate;
				return `${this._formatNumber(price)} ${primaryCurrency}`;
			}

			return this._formatNumber(rate);
		}

		_formatNumber(num) {
			if (num >= 1000000) {
				return (num / 1000000).toFixed(2) + "M";
			} else if (num >= 1) {
				return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
			} else if (num >= 0.01) {
				return num.toFixed(4);
			} else if (num >= 0.0001) {
				return num.toFixed(6);
			} else {
				return num.toExponential(4);
			}
		}

		_updateTimestamp() {
			const now = new Date();
			const timeStr = now.toLocaleTimeString();
			this._timestampItem.label.text = `Last updated: ${timeStr}`;
		}

		destroy() {
			this._isDestroyed = true;

			if (this._updateTimeout) {
				GLib.source_remove(this._updateTimeout);
				this._updateTimeout = null;
			}

			if (this._settingsChangedId) {
				this._settings.disconnect(this._settingsChangedId);
				this._settingsChangedId = null;
			}

			this._httpSession = null;

			console.log("Rabbit Forex: Extension destroyed");

			super.destroy();
		}
	}
);

export default class RabbitForexExtension extends Extension {
	enable() {
		console.log("Rabbit Forex: Enabling extension");
		this._indicator = new RabbitForexIndicator(this);
		Main.panel.addToStatusArea(this.uuid, this._indicator);
		console.log("Rabbit Forex: Extension enabled");
	}

	disable() {
		console.log("Rabbit Forex: Disabling extension");
		if (this._indicator) {
			this._indicator.destroy();
			this._indicator = null;
		}
		console.log("Rabbit Forex: Extension disabled");
	}
}
