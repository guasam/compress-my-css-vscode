import { window, Position, Range, TextDocumentWillSaveEvent, workspace, ExtensionContext, commands } from 'vscode';

type CompressionMode = 'stacked' | 'minified' | 'ignore';

interface CompressorSettings {
  compressOnSave?: boolean;
  showInfoDialog?: boolean;
  defaultMode?: CompressionMode;
  spaceAfterRuleSelector?: boolean;
  spaceInsideParantheses?: boolean;
  spaceBetweenProperties?: boolean;
}

export default class Compressor {
  startTagName = '@compress-my-css';
  endTagName = '@end-compress-my-css';
  formatTypes = ['stacked', 'minified', 'ignore'];
  settings: CompressorSettings = {};
  output = '';

  constructor() {
    this.loadSettings();
  }

  /**
   * Load Extension Settings
   */
  loadSettings(): void {
    const config = workspace.getConfiguration('compress-my-css');
    this.settings.compressOnSave = config.get('compressOnSave', false);
    this.settings.showInfoDialog = config.get('showInfoDialog', false);
    this.settings.defaultMode = config.get('defaultMode', 'stacked');
    this.settings.spaceAfterRuleSelector = config.get('spaceAfterRuleSelector', true);
    this.settings.spaceInsideParantheses = config.get('spaceInsideParantheses', true);
    this.settings.spaceBetweenProperties = config.get('spaceBetweenProperties', true);
  }

  /**
   * Handle given Extension Context
   *
   * @param context Extension Context
   */
  handleContext(context: ExtensionContext): void {
    // Load settings on change
    context.subscriptions.push(workspace.onDidChangeConfiguration(this.loadSettings.bind(this)));

    // Register run command
    context.subscriptions.push(commands.registerCommand('compress-my-css.run', this.executeRunCommand.bind(this)));

    // Compress on save handler
    context.subscriptions.push(workspace.onWillSaveTextDocument(this.onSaveTextDocument.bind(this)));
  }

  /**
   * Execute Run Command
   */
  executeRunCommand(): void {
    let content = this.getEditorContent();
    // Show information message for empty content
    if (!content) {
      return;
    }

    const formats = '(' + this.formatTypes.join('|') + ')';
    const startTagRegex = `(\\/\\* ${this.startTagName} (?:\\: ${formats} )?\\*\\/)`;
    const endTagRegex = `(\\/\\* ${this.endTagName} \\*\\/)`;
    const regex = new RegExp('(?<=' + startTagRegex + '\\s+).*?(?=\\s+' + endTagRegex + ')', 'gs');

    content = content.replace(regex, this.compress.bind(this));

    console.log(content);
  }

  /**
   * On Text Document Save
   *
   * @param event
   */
  onSaveTextDocument(event: TextDocumentWillSaveEvent): void {
    if (this.settings.compressOnSave) {
      this.executeRunCommand();
    }
  }

  /**
   * Get active text editor content
   *
   * @returns string
   */
  getEditorContent(): string {
    // Check if active text editor available
    if (window.activeTextEditor === undefined) {
      return '';
    }

    // Gather useful variables
    const editor = window.activeTextEditor;
    const document = editor.document;
    const start = new Position(0, 0);
    const end = new Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
    const range = new Range(start, end);
    return document.getText(range);
  }

  /**
   * Compress Editor Content with compression mode
   *
   * @param content Editor Content
   * @param mode Compression
   * @returns string
   */
  compress(
    content: string,
    startTag: string,
    mode: CompressionMode,
    endTag: string,
    _token: number,
    _fullContent: string,
  ): string {
    //

    // Ignore compression mode?
    if (mode === 'ignore') {
      return content;
    }

    // Remove all newlines, linebreaks etc.
    content = content.replace(/(\r\n|\n|\r|\t)/gm, '');

    // Remove whitespaces around parantheses
    content = content.replace(/\s+{/gm, '{');
    content = content.replace(/\{\s+/gm, '{');
    content = content.replace(/\s+\}/gm, '}');

    // Remove whitespaces around colon
    content = content.replace(/\s+:/gm, ':');
    content = content.replace(/:\s+/gm, ':');

    // Remove whitespaces around semicolon
    content = content.replace(/\s+;/gm, ';');
    content = content.replace(/;\s+/gm, ';');

    // Stacked Compression Mode
    if (mode ?? this.settings.defaultMode === 'stacked') {
      // New line after closing parantheses
      content = content.replace(/}/gm, '}\r\n');
      // New line between ;|@ to make @at-rules neat
      content = content.replace(/\;\@/gm, ';\r\n@');
    }

    // Space after rule selector
    if (this.settings.spaceAfterRuleSelector) {
      content = content.replace(/{/gm, ' {');
    }

    // Space inside rule parantheses
    if (this.settings.spaceInsideParantheses) {
      content = content.replace(/{/gm, '{ ');
      content = content.replace(/}/gm, ' }');
    }

    // Space between rule properties
    if (this.settings.spaceBetweenProperties) {
      content = content.replace(/;/gm, '; ');
      content = content.replace(/\s+}/gm, ' }');
    }

    // New lines at begining to have spacing between startTag
    content = "\n\r\n\r" + content.trim();

    return content;
  }
}
