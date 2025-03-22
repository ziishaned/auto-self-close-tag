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
  // Remove closing tag when converting to self-closing
  const removeClosingTagDisposable = workspace.onDidChangeTextDocument(
    (event: TextDocumentChangeEvent) => {
      const editor = window.activeTextEditor;
      if (!editor) {
        return;
      }

      // Check if we're in a relevant file type
      const supportedLanguages = [
        "html",
        "xml",
        "php",
        "javascript",
        "javascriptreact",
        "typescriptreact",
      ];
      if (!supportedLanguages.includes(editor.document.languageId)) {
        return;
      }

      // Check changes
      for (const change of event.contentChanges) {
        // Check if the change is adding a "/" character
        if (change.text === "/") {
          const position = change.range.start;
          const line = editor.document.lineAt(position.line).text;
          const charBeforeSlash = line.charAt(position.character - 1);

          // Check if we're converting a tag to self-closing (i.e., adding / before >)
          if (
            charBeforeSlash === "<" ||
            line
              .substring(0, position.character)
              .match(/<[a-zA-Z][a-zA-Z0-9]*(\s+[^>]*)?$/)
          ) {
            // We need to find the corresponding closing tag
            const fullText = editor.document.getText();
            const cursorOffset = editor.document.offsetAt(position);

            // Find the tag name we're working with
            const textBeforeCursor = fullText.substring(0, cursorOffset);
            const tagMatch = textBeforeCursor.match(
              /<([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?$/
            );

            if (tagMatch) {
              const tagName = tagMatch[1];

              // Look for corresponding closing tag
              const remainingText = fullText.substring(cursorOffset);
              const closeTagRegex = new RegExp(`<\\/${tagName}>`, "i");
              const match = remainingText.match(closeTagRegex);

              if (match && match.index !== undefined) {
                const closeTagStartOffset = cursorOffset + match.index;
                const closeTagEndOffset = closeTagStartOffset + match[0].length;

                const startPos =
                  editor.document.positionAt(closeTagStartOffset);
                const endPos = editor.document.positionAt(closeTagEndOffset);

                // Remove the closing tag
                editor.edit((editBuilder) => {
                  editBuilder.delete(new Range(startPos, endPos));
                });
              }
            }
          }
        }
      }
    }
  );

  // Auto-complete ">" when typing "<tag /"
  const autoCompleteClosingBracketDisposable =
    workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
      const editor = window.activeTextEditor;
      if (!editor) {
        return;
      }

      const supportedLanguages = [
        "html",
        "xml",
        "php",
        "javascript",
        "javascriptreact",
        "typescriptreact",
      ];
      if (!supportedLanguages.includes(editor.document.languageId)) {
        return;
      }

      // Check changes
      for (const change of event.contentChanges) {
        // Check if the change is adding a "/" character
        if (change.text === "/") {
          const position = change.range.start;
          const line = editor.document.lineAt(position.line).text;
          const textBeforeSlash = line.substring(0, position.character);

          // Check if we have an opening tag pattern without closing bracket
          const tagPattern = /<([a-zA-Z][a-zA-Z0-9]*)(\s+[^>]*)?$/;
          const match = textBeforeSlash.match(tagPattern);

          if (match) {
            // We have "<tag " or "<tag" pattern, add the closing ">"
            const insertPosition = new Position(
              position.line,
              position.character + 1
            );

            editor
              .edit((editBuilder) => {
                editBuilder.insert(insertPosition, ">");
              })
              .then((success) => {
                if (success) {
                  // Optionally move cursor after the ">"
                  const newPosition = new Position(
                    insertPosition.line,
                    insertPosition.character + 1
                  );
                  editor.selection = new Selection(newPosition, newPosition);
                }
              });
          }
        }
      }
    });

  context.subscriptions.push(
    removeClosingTagDisposable,
    autoCompleteClosingBracketDisposable
  );
}

export function deactivate(): void {}
