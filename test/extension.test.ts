import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import * as vscode from "vscode";

suite("HTML Self-Closing Tag Extension Test Suite", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vscode-test-"));
  let testDocument: vscode.TextDocument;
  let editor: vscode.TextEditor;

  suiteSetup(async () => {
    // Create a temp file for testing
    const testFilePath = path.join(tempDir, "test.html");
    fs.writeFileSync(testFilePath, "<p>Hello world</p>");

    // Open the file
    const uri = vscode.Uri.file(testFilePath);
    testDocument = await vscode.workspace.openTextDocument(uri);
    editor = await vscode.window.showTextDocument(testDocument);
  });

  suiteTeardown(async () => {
    // Close editor and clean up temp directory
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("Remove closing tag when converting to self-closing", async () => {
    // Reset content
    await editor.edit((editBuilder) => {
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        testDocument.lineAt(testDocument.lineCount - 1).range.end
      );
      editBuilder.replace(fullRange, "<p>Hello world</p>");
    });

    // Move cursor to position between p and >
    const position = new vscode.Position(0, 2); // Position after "<p"
    editor.selection = new vscode.Selection(position, position);

    // Insert a slash to convert to self-closing tag
    await editor.edit((editBuilder) => {
      editBuilder.insert(position, "/");
    });

    // Wait for our extension to process
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check that closing tag is removed and we now have self-closing tag
    assert.strictEqual(testDocument.getText(), "<p/>Hello world");
  });

  test("Auto-complete closing bracket when typing self-closing tag", async () => {
    // Reset content
    await editor.edit((editBuilder) => {
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        testDocument.lineAt(testDocument.lineCount - 1).range.end
      );
      editBuilder.replace(fullRange, "<div>\n  \n</div>");
    });

    // Move cursor to second line
    const position = new vscode.Position(1, 2);
    editor.selection = new vscode.Selection(position, position);

    // Type "<p "
    await editor.edit((editBuilder) => {
      editBuilder.insert(position, "<p ");
    });

    // Add the slash
    const slashPosition = new vscode.Position(1, 5);
    await editor.edit((editBuilder) => {
      editBuilder.insert(slashPosition, "/");
    });

    // Wait for our extension to process
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check that ">" was automatically added
    assert.strictEqual(testDocument.lineAt(1).text.trim(), "<p />");
  });
});
