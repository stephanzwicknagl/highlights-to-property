import {App, PluginSettingTab, Setting} from "obsidian";
import ExtractHighlightsPlugin from "./main";

export default class ExtractHighlightsPluginSettingsTab extends PluginSettingTab {
	private readonly plugin: ExtractHighlightsPlugin;

	constructor(app: App, plugin: ExtractHighlightsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl("h2", {text: "Extract Highlights Plugin"});

		new Setting(containerEl)
			.setName('Use bold for highlights')
			.setDesc(
				'If enabled, will include classic markdown bold (**) sections as highlights',
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useBoldForHighlights).onChange((value) => {
					this.plugin.settings.useBoldForHighlights = value;
					this.plugin.saveData(this.plugin.settings);
				}),
			);

		new Setting(containerEl)
            .setName('Support Highlightr plugin')
            .setDesc('If enabled, will include highlights of the highlightr plugin (<mark class="hltr-color"></mark>)')
            .addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useHighlightr).onChange((value) => {
					this.plugin.settings.useHighlightr = value;
					this.plugin.saveData(this.plugin.settings);
				}),
			);

		new Setting(containerEl)
			.setName('Custom Highlight Regex')
			.setDesc('Regular expression to extract additional highlights. Enter one expression per line.')
			.addTextArea((text) =>
				text
					.setPlaceholder('e.g. --(.*?)--')
					.setValue(this.plugin.settings.customHighlightRegex)
					.onChange((value) => {
						this.plugin.settings.customHighlightRegex = value;
						this.plugin.saveData(this.plugin.settings);
					}),
			);

		new Setting(containerEl)
			.setName('Auto-capitalize first letter')
			.setDesc(
				'If enabled, capitalizes the first letter of each highlight.',
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoCapitalize).onChange((value) => {
					this.plugin.settings.autoCapitalize = value;
					this.plugin.saveData(this.plugin.settings);
				}),
			);

		new Setting(containerEl)
			.setName('Create contextual quotes')
			.setDesc(
				'If enabled, will quote the full line of your highlight, not just the highlight itself. Useful for keeping the context of your highlight.',
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.createContextualQuotes).onChange((value) => {
					this.plugin.settings.createContextualQuotes = value;
					this.plugin.saveData(this.plugin.settings);
				}),
			);
	}
}