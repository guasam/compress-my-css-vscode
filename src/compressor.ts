import { window, Position, Range, TextDocumentWillSaveEvent, workspace } from 'vscode';

interface CompressorSettings {
  compressOnSave?: boolean;
  showInfoDialog?: boolean;
  defaultMode?: 'stacked' | 'minified';
}

export default class Compressor {
  startTagName = '@compress-my-css';
  endTagName = '@end-compress-my-css';
  formatTypes = ['ignore', 'stacked'];
  settings: CompressorSettings = {};

  constructor() {
    this.loadSettings();
  }

  loadSettings(): void {
    const config = workspace.getConfiguration('compress-my-css');
    this.settings.compressOnSave = config.get('compressOnSave', false);
    this.settings.showInfoDialog = config.get('showInfoDialog', false);
    this.settings.defaultMode = config.get('defaultMode', 'stacked');
  }

  /**
   * Execute Run Command
   * @returns
   *
   */
  executeRunCommand(): void {
    let content = this.getEditorContent();
    // Show information message for empty content
    if (!content) {
      return;
    }

    const formats = '(' + this.formatTypes.join('|') + ')';
    const startTagRegex = `\\/\\* ${this.startTagName} (?:\\: ${formats} )?\\*\\/`;
    const endTagRegex = `\\/\\* ${this.endTagName} \\*\\/`;
    const regex = new RegExp('(?<=' + startTagRegex + '\\s+).*?(?=\\s+' + endTagRegex + ')', 'gs');

    content = content.replace(regex, this.compress);
    console.log(content);
  }

  onSaveTextDocument(event: TextDocumentWillSaveEvent): void {
    console.log(event.document.languageId);
    if (event.document.languageId === 'scss') {
      console.log('checking');
    }
  }

  /**
   * Get active text editor content
   * @returns
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

  compress(content: string, type: string): string {
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

    return content.trim();
  }
}
