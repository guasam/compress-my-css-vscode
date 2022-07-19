import { TextEncoder } from 'util';
import {
  window,
  Position,
  Range,
  TextDocumentWillSaveEvent,
  workspace,
  ExtensionContext,
  commands,
  TextEditor,
} from 'vscode';

/**
 * Compressor
 *
 * This is the back bone behind extension for compressing css in various
 * modes and settings of Visual Studio Code.
 *
 * @author  guasam
 * @url     https://github.com/guasam
 */
export default class Compressor {
  startTagName = '@compress-my-css';
  endTagName = '@end-compress-my-css';
  formatTypes = ['stacked', 'minified', 'ignore'];
  settings: CompressorSettings = {};
  output = '';
  editor: TextEditor | undefined;
  range: Range | undefined;
  inputBytes = 0;
  outputBytes = 0;
  savingsAverage = '';

  constructor() {
    this.loadSettings();
  }

  /**
   * Load Extension Settings
   */
  loadSettings(): void {
    const config = workspace.getConfiguration('compress-my-css');
    this.settings.compressOnSave = config.get('compressOnSave', true);
    this.settings.showInfoDialog = config.get('showInfoDialog', true);
    this.settings.defaultMode = config.get('defaultMode', 'stacked');
    this.settings.spaceAfterRuleSelector = config.get('spaceAfterRuleSelector', true);
    this.settings.spaceInsideParantheses = config.get('spaceInsideParantheses', true);
    this.settings.spaceBetweenProperties = config.get('spaceBetweenProperties', true);
    this.settings.removeComments = config.get('removeComments', false);
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

    // Set input bytes to display savings % with info dialog
    if (this.settings.showInfoDialog) {
      this.inputBytes = new TextEncoder().encode(content).length;
    }

    // Regex Lunacy!!
    const formats = '(' + this.formatTypes.join('|') + ')';
    const startTagRegex = `(\\/\\* ${this.startTagName} (?:\\: ${formats} )?\\*\\/)`;
    const endTagRegex = `(\\/\\* ${this.endTagName} \\*\\/)`;
    const regex = new RegExp('(?<=' + startTagRegex + '\\s+).*?(?=\\s+' + endTagRegex + ')', 'gs');

    // Lets do compression
    content = content.replace(regex, this.compress.bind(this));

    // Apply content into editor
    if (content && this.range) {
      const range = this.range;
      this.editor?.edit((edit) => edit.replace(range, content));

      // Show information dialog?
      if (this.settings.showInfoDialog) {
        this.outputBytes = new TextEncoder().encode(content).length;
        this.savingsAverage = (100 - (this.outputBytes / this.inputBytes) * 100).toFixed(2);
        if (parseInt(this.savingsAverage) > 0) {
          window.showInformationMessage(
            `Compress My Css : Applied compression with total size ${this.savingsAverage}%`,
          );
        }
      }
    }
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
    this.editor = window.activeTextEditor;
    const document = this.editor.document;
    const start = new Position(0, 0);
    const end = new Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
    this.range = new Range(start, end);

    // Return editor text
    return document.getText(this.range);
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

    // Fallback compression mode if not provided to default
    mode = mode ?? this.settings.defaultMode;

    // Ignore compression mode?
    if (mode === 'ignore') {
      return content;
    }

    // Remove comments
    if (this.settings.removeComments) {
      content = content.replace(/\/\*.+\*\//gm, '');
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
    if (mode === 'stacked') {
      // New line after closing parantheses
      content = content.replace(/}/gm, '}\r\n');
      // New line between ;|@ to make @at-rules neat
      content = content.replace(/\;\@/gm, ';\r\n@');
    }

    // Space after rule selector
    if (this.settings.spaceAfterRuleSelector) {
      content = content.replace(/{/gm, ' {');
    }

    // Not minified mode?
    if (mode !== 'minified') {
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
    }

    // New line at begining to have spacing between startTag
    content = '\n\r' + content.trim();

    return content;
  }
}
