// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, workspace } from 'vscode';
import Compressor from './Compressor';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  // Create new compressor instance
  const compressor = new Compressor();

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = commands.registerCommand('compress-my-css.run', () => {
    // The code you place here will be executed every time your command is executed
    compressor.executeRunCommand();
  });

  context.subscriptions.push(disposable);

  // Compress on save handler
  context.subscriptions.push(workspace.onWillSaveTextDocument(compressor.onSaveTextDocument));
}

// this method is called when your extension is deactivated
export function deactivate() {}
