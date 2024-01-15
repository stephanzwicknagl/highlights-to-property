export default class ExtractHighlightsPluginSettings {
  public useBoldForHighlights: boolean;
  public useHighlightr: boolean;
  public customHighlightRegex: string;
  public autoCapitalize: boolean;
  public createContextualQuotes: boolean;

  constructor() {
    this.useBoldForHighlights = false;
    this.useHighlightr = true;
    this.createContextualQuotes = false;
    this.autoCapitalize = false;
    this.customHighlightRegex = '';
  }
}