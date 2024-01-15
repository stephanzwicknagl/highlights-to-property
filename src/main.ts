import {Plugin, Notice, addIcon, TextFileView} from "obsidian"
import ExtractHighlightsPluginSettings from "./ExtractHighlightsPluginSettings"
import ExtractHighlightsPluginSettingsTab from "./ExtractHighlightsPluginSettingsTab"

addIcon(
  'highlight_marker',
  '<svg viewBox="0 0 576 512"><path fill="#646464" d="m315 315l158.4-215l-29.3-29.4L229 229zm-187 5v-71.7c0-15.3 7.2-29.6 19.5-38.6L420.6 8.4C428 2.9 437 0 446.2 0c11.4 0 22.4 4.5 30.5 12.6l54.8 54.8c8.1 8.1 12.6 19 12.6 30.5c0 9.2-2.9 18.2-8.4 25.6l-201.3 273c-9 12.3-23.4 19.5-38.6 19.5H224l-25.4 25.4c-12.5 12.5-32.8 12.5-45.3 0l-50.7-50.7c-12.5-12.5-12.5-32.8 0-45.3zM7 466.3l63-63l70.6 70.6l-31 31c-4.5 4.5-10.6 7-17 7H24c-13.3 0-24-10.7-24-24v-4.7c0-6.4 2.5-12.5 7-17z"/></svg>'
);

export default class ExtractHighlightsPlugin extends Plugin {
	public settings: ExtractHighlightsPluginSettings;
	public statusBar: HTMLElement;

	async onload() {
		this.loadSettings();
		this.addSettingTab(
			new ExtractHighlightsPluginSettingsTab(this.app, this)
		);

		this.statusBar = this.addStatusBarItem();

		this.addRibbonIcon(
			"highlight_marker",
			"Add Highlights to Property",
			() => {
				this.saveHighlightsToProperty();
			}
		);

		this.addCommand({
			id: "shortcut-extract-highlights",
			name: "Shortcut adding highlights to a property",
			callback: () => this.saveHighlightsToProperty(),
		});
	}

	loadSettings() {
		this.settings = new ExtractHighlightsPluginSettings();
		(async () => {
			const loadedSettings = await this.loadData();
			if (loadedSettings) {
				// console.log("Found existing settings file");
				this.settings.useBoldForHighlights =
					loadedSettings.useBoldForHighlights;
				this.settings.useHighlightr = loadedSettings.useHighlightr;
				this.settings.customHighlightRegex =
					loadedSettings.customHighlightRegex;
				this.settings.autoCapitalize = loadedSettings.autoCapitalize;
				this.settings.createContextualQuotes =
					loadedSettings.createContextualQuotes;
			} else {
				// console.log("No settings file found, saving...");
				this.saveData(this.settings);
			}
		})();
	}

	async saveHighlightsToProperty() {
		const activeView: TextFileView | null =
			this.app.workspace.getActiveViewOfType(TextFileView);
		if (activeView == null || activeView.file == null) {
			return;
		}
		const processResults = this.processHighlights(activeView);
		const highlightsText = processResults.highlights;

		try {
			await this.app.fileManager.processFrontMatter(
				activeView.file,
				(frontmatter) => {
					let existing = false;
					if (frontmatter['highlights'] != null) {
						existing = true;
					}
					frontmatter['highlights'] = highlightsText;
					
					new Notice(
						`Highlights ${
							existing ? "property was updated." : "added as property!"
						} `,
						4000
					);
				},
				{}
				);
		} catch (e: any) {
			if (e?.name === "YAMLParseError") {
				const errorMessage = `Adding property failed. Malformed frontmatter:

${e.message}`;
				new Notice(errorMessage, 4000);
				console.error(errorMessage);
				return {
					status: "error",
					error: e,
				};
			}
		}
		return {
			status: "ok",
		};
	}

	processHighlights(view: TextFileView) {
		const patterns: string[] = ["==(.*?)==", "<mark>(.*?)</mark>"];
		const custom_patterns: string[] =
			this.settings.customHighlightRegex.split("\n");
		custom_patterns.forEach((v) => {
			if (v.length > 0) {
				try {
					new RegExp(v);
				} catch (e) {
					console.error("Invalid regular expression:", v);
				}
				patterns.push("(" + v + ")");
			}
		});
		if (this.settings.useBoldForHighlights) {
			// eslint-disable-next-line no-useless-escape
			patterns.push("\\*\\*(.*?)\\*\\*");
		}
		if (this.settings.useHighlightr) {
			patterns.push("<mark[^>]*?>(.*?)<\\/mark>");
		}

		// eslint-disable-next-line no-useless-escape
		const regexStr = patterns.join("|");
		const re = new RegExp(regexStr, "g");

		const markdownText = view.data;

		const highlights: string[] = [];
		const lines = markdownText.split("\n");
		const cleanedLines: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			if (!(lines[i] == "")) {
				cleanedLines.push(lines[i]);
			}
		}

		let match;
		while ((match = re.exec(markdownText)) !== null) {
			const full = match[0];
			match.reverse().map((entry) => {
				if (entry && entry !== full) {
					// Keep surrounding paragraph for context
					if (this.settings.createContextualQuotes) {
						for (let i = 0; i < cleanedLines.length; i++) {
							const matched_line = cleanedLines[i].match(entry);
							if (
								!(matched_line == null) &&
								matched_line.length > 0
							) {
								const val = cleanedLines[i];

								if (!highlights.contains(val)) {
									highlights.push(val);
								}
							}
						}
					}

					let trim = entry.trim();

					if (this.settings.autoCapitalize) {
						if (trim != null) {
							trim = this.capitalizeFirstLetter(trim);
						}
					}
					highlights.push(trim);
					return false;
				}
			});
		}

		return { highlights:  highlights};
	}

	saveToClipboard(data: string): string {
		if (data.length > 0) {
			navigator.clipboard.writeText(data);
			return "Highlights copied to clipboard!";
		} else {
			return "No highlights found";
		}
	}

	capitalizeFirstLetter(s: string) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
}
