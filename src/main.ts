import {Plugin, Notice, addIcon, View, MarkdownView, Workspace} from "obsidian"
import ExtractHighlightsPluginSettings from "./ExtractHighlightsPluginSettings"
import ExtractHighlightsPluginSettingsTab from "./ExtractHighlightsPluginSettingsTab"
import ToggleHighlight from "./ToggleHighlight";

addIcon(
  'highlight_marker',
  '<svg viewBox="0 0 576 512"><path fill="#646464" d="m315 315l158.4-215l-29.3-29.4L229 229zm-187 5v-71.7c0-15.3 7.2-29.6 19.5-38.6L420.6 8.4C428 2.9 437 0 446.2 0c11.4 0 22.4 4.5 30.5 12.6l54.8 54.8c8.1 8.1 12.6 19 12.6 30.5c0 9.2-2.9 18.2-8.4 25.6l-201.3 273c-9 12.3-23.4 19.5-38.6 19.5H224l-25.4 25.4c-12.5 12.5-32.8 12.5-45.3 0l-50.7-50.7c-12.5-12.5-12.5-32.8 0-45.3zM7 466.3l63-63l70.6 70.6l-31 31c-4.5 4.5-10.6 7-17 7H24c-13.3 0-24-10.7-24-24v-4.7c0-6.4 2.5-12.5 7-17z"/></svg>'
);

export default class ExtractHighlightsPlugin extends Plugin {

	public settings: ExtractHighlightsPluginSettings;
	public statusBar: HTMLElement
	public counter: 0;
	private editor: CodeMirror.Editor;

	async onload() {
		this.counter = 0;
		this.loadSettings();
		this.addSettingTab(new ExtractHighlightsPluginSettingsTab(this.app, this));

		this.statusBar = this.addStatusBarItem()

		this.addRibbonIcon('highlight_marker', 'Extract Highlights', () => {
			this.extractHighlights();
		});

		this.addCommand({
			id: "shortcut-extract-highlights",
			name: "Shortcut for extracting highlights",
			callback: () => this.extractHighlights(),
			hotkeys: [
				{
					modifiers: ["Alt", "Shift"],
					key: "±",
				},
			],
		});

		this.addCommand({
			id: "shortcut-highlight-sentence",
			name: "Shortcut for highlighting sentence cursor is in",
			callback: () => this.createHighlight(),
			hotkeys: [
				{
					modifiers: ["Alt", "Shift"],
					key: "—",
				},
			],
		});
	}

	loadSettings() {
		this.settings = new ExtractHighlightsPluginSettings();
		(async () => {
		  const loadedSettings = await this.loadData();
		  if (loadedSettings) {
			// console.log("Found existing settings file");
			this.settings.headlineText = loadedSettings.headlineText;
			this.settings.addFootnotes = loadedSettings.addFootnotes;
			this.settings.createLinks = loadedSettings.createLinks;
			this.settings.autoCapitalize = loadedSettings.autoCapitalize;
			this.settings.createNewFile = loadedSettings.createNewFile;
			this.settings.explodeIntoNotes = loadedSettings.explodeIntoNotes;
			this.settings.openExplodedNotes = loadedSettings.openExplodedNotes;
			this.settings.createContextualQuotes = loadedSettings.createContextualQuotes;
		  } else {
			// console.log("No settings file found, saving...");
			this.saveData(this.settings);
		  }
		})();
	}

	async extractHighlights() {
		let activeLeaf: any = this.app.workspace.activeLeaf ?? null

		let name = activeLeaf?.view.file.basename;

		try {
			if (activeLeaf?.view?.data) {
				let processResults = this.processHighlights(activeLeaf.view);
				let highlightsText = processResults.markdown;
				let highlights = processResults.highlights;
				let baseNames = processResults.baseNames;
				let contexts = processResults.contexts;
				let saveStatus = this.saveToClipboard(highlightsText);
				new Notice(saveStatus);

				const newBasenameMOC = "Highlights for " + name + ".md";
				if (this.settings.createNewFile) {
					// Add link back to Original
					highlightsText += `## Source\n- [[${name}]]`;

					await this.saveToFile(newBasenameMOC, highlightsText);
					await this.app.workspace.openLinkText(newBasenameMOC, newBasenameMOC, true);
				}

				if(this.settings.createNewFile && this.settings.createLinks && this.settings.explodeIntoNotes) {
					for(var i = 0; i < baseNames.length; i++) {
						// console.log("Creating file for " + baseNames[i]);
						var content = "";
						// add highlight as quote
						content += "## Source\n"
						if(this.settings.createContextualQuotes) {
							// context quote
							content += `> ${contexts[i]}[^1]`;
						} else {
							// regular highlight quote
							content += `> ${highlights[i]}[^1]`;
						}
						content += "\n\n";
						content += `[^1]: [[${name}]]`;
						content += "\n";
						// console.log(content);

						const newBasename = baseNames[i] + ".md";

						await this.saveToFile(newBasename, content);

						if(this.settings.openExplodedNotes) {
							await this.app.workspace.openLinkText(newBasename, newBasename, true);
						}
					}
				}

			} else {
				new Notice("No highlights to extract.");
			}
		} catch (e) {
			console.log(e.message)
		}
	}

	async saveToFile(filePath: string, mdString: string) {
		//If files exists then append content to existing file
		const fileExists = await this.app.vault.adapter.exists(filePath);
		if (fileExists) {
			// console.log("File exists already...");
		} else {
			await this.app.vault.create(filePath, mdString);
		}
	}

	processHighlights(view: any) {

		var re;

		if(this.settings.useBoldForHighlights) {
			re = /(==|\<mark\>|\*\*)([\s\S]*?)(==|\<\/mark\>|\*\*)/g;
		} else {
			re = /(==|\<mark\>)([\s\S]*?)(==|\<\/mark\>)/g;
		}

		let markdownText = view.data;
		let basename = view.file.basename;
		let matches = markdownText.match(re);
		this.counter += 1;

		var result = "";
		var highlights = [];
		var baseNames = [];
		let contexts: any[][] = [];
		let lines = markdownText.split("\n");
		let cleanedLines = [];

		for(var i = 0; i < lines.length; i++) {
			if(!(lines[i] == "")) {
				cleanedLines.push(lines[i]);
			}
		}

		if (matches != null) {
			if(this.settings.headlineText != "") { 
				let text = this.settings.headlineText.replace(/\$NOTE_TITLE/, `${basename}`)
				result += `## ${text}\n`;
			}

			for (let entry of matches) {
				// Keep surrounding paragraph for context
				if(this.settings.createContextualQuotes) {
					for(var i = 0; i < cleanedLines.length; i++) {
						let match = cleanedLines[i].match(entry);
						if(!(match == null) && match.length > 0) {
							let val = cleanedLines[i];

							if(!contexts.contains(val)) {
								contexts.push(val);
							}
						}
					}
				}

				// Clean up highlighting match
				var removeNewline = entry.replace(/\n/g, " ");
				let removeHighlightStart = removeNewline.replace(/==/g, "")
				let removeHighlightEnd = removeHighlightStart.replace(/\<mark\>/g, "")
				let removeMarkClosing = removeHighlightEnd.replace(/\<\/mark\>/g, "")
				let removeBold = removeMarkClosing.replace(/\*\*/g, "")
				let removeDoubleSpaces = removeBold.replace("  ", " ");

				removeDoubleSpaces = removeDoubleSpaces.replace("  ", " ");
				removeDoubleSpaces = removeDoubleSpaces.trim();

				if(this.settings.autoCapitalize) {
					if(removeDoubleSpaces != null) {
						removeDoubleSpaces = this.capitalizeFirstLetter(removeDoubleSpaces);
					}
				}

				result += "- "

				if(this.settings.createLinks) {
					// First, sanitize highlight to be used as a file-link
					// * " \ / | < > : ?
					let sanitized = removeDoubleSpaces.replace(/\*|\"|\\|\/|\<|\>|\:|\?|\|/gm, "");
					sanitized = sanitized.trim();

					let baseName = sanitized;
					if(baseName.length > 100) {
						baseName = baseName.substr(0, 99);
						baseName += "..."
					}

					result += "[[" + baseName + "]]";
					highlights.push(sanitized);
					baseNames.push(baseName);
				} else {
					result += removeDoubleSpaces;
					highlights.push(removeDoubleSpaces);
				}

				if(this.settings.addFootnotes) {
					result += `[^${this.counter}]`;
				} 

				result += "\n";
			}

			if(this.settings.addFootnotes) {
				result += "\n"
				result += `[^${this.counter}]: [[${basename}]]\n`
			}

			result += "\n";
		}

		return {markdown: result, baseNames: baseNames, highlights: highlights, contexts: contexts};
	}

	saveToClipboard(data: string): string {
		if (data.length > 0) {
			navigator.clipboard.writeText(data);
			return "Highlights copied to clipboard!";
		} else {
			return "No highlights found";
		}
	}

	createHighlight() {
		const mdView = this.app.workspace.activeLeaf.view as MarkdownView;
		const doc = mdView.sourceMode.cmEditor;
		this.editor = doc;

		const cursorPosition = this.editor.getCursor();
		let lineText = this.editor.getLine(cursorPosition.line);

		// use our fancy class to figure this out
		let th = new ToggleHighlight();
		let result = th.toggleHighlight(lineText, cursorPosition.ch);

		// catch up on cursor
		let cursorDifference = -2;
		if(result.length > lineText.length) { cursorDifference = 2 }

		this.editor.replaceRange(result, {line: cursorPosition.line, ch: 0}, {line: cursorPosition.line, ch: lineText.length})
		this.editor.setCursor({line: cursorPosition.line, ch: cursorPosition.ch + cursorDifference});
	}


	capitalizeFirstLetter(s: string) {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}
}
