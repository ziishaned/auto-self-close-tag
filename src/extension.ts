import {
  Range,
  window,
  Position,
  workspace,
  Selection,
  ExtensionContext,
  TextDocumentChangeEvent,
} from "vscode";

export function activate(context: ExtensionContext) {
  const supportedLanguages = [
    "html",
    "xml",
    "php",
    "javascript",
    "javascriptreact",
    "typescriptreact",
  ];

  const textChangeListener = workspace.onDidChangeTextDocument(
    (event: TextDocumentChangeEvent) => {
      const editor = window.activeTextEditor;
      if (!editor || !supportedLanguages.includes(editor.document.languageId)) {
        return;
      }

      for (const change of event.contentChanges) {
        if (change.text === "/") {
          const position = change.range.start;
          const line = editor.document.lineAt(position.line).text;
          const charBeforeSlash = line.charAt(position.character - 1);

          if (
            charBeforeSlash === "<" ||
            line
              .substring(0, position.character)
              .match(/<[a-zA-Z][a-zA-Z0-9]*(\s+[^>]*)?$/)
          ) {
            const fullText = editor.document.getText();
            const cursorOffset = editor.document.offsetAt(position);
            const textBeforeCursor = fullText.substring(0, cursorOffset);
            const tagMatch = textBeforeCursor.match(
              /<([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?$/
            );

            if (tagMatch) {
              const tagName = tagMatch[1];
              const remainingText = fullText.substring(cursorOffset);
              const closeTagRegex = new RegExp(`<\\/${tagName}>`, "i");
              const match = remainingText.match(closeTagRegex);

              if (match && match.index !== undefined) {
                const closeTagStartOffset = cursorOffset + match.index;
                const closeTagEndOffset = closeTagStartOffset + match[0].length;
                const startPos =
                  editor.document.positionAt(closeTagStartOffset);
                const endPos = editor.document.positionAt(closeTagEndOffset);

                editor.edit((editBuilder) => {
                  editBuilder.delete(new Range(startPos, endPos));
                });
              }
            }
          }

          const textBeforeSlash = line.substring(0, position.character);
          const tagPattern = /<([a-zA-Z][a-zA-Z0-9]*)(\s+[^>]*)?$/;
          const match = textBeforeSlash.match(tagPattern);

          if (match) {
            const insertPosition = new Position(
              position.line,
              position.character + 1
            );

            editor
              .edit((editBuilder) => {
                editBuilder.insert(insertPosition, ">");
              })
              .then(() => {
                const newPosition = new Position(
                  insertPosition.line,
                  insertPosition.character + 1
                );
                editor.selection = new Selection(newPosition, newPosition);
              });
          }
        }
      }
    }
  );

  context.subscriptions.push(textChangeListener);
}

export function deactivate(): void {}
