import * as vscode from 'vscode'
import * as path from 'path'
const execa = require('execa')
const { XMLParser, XMLBuilder, XMLValidator } = require('fast-xml-parser')

export function activate(context: vscode.ExtensionContext) {
	const collection = vscode.languages.createDiagnosticCollection('test')
	if (vscode.window.activeTextEditor) {
		updateDiagnostics(vscode.window.activeTextEditor.document, collection)
	}
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				updateDiagnostics(editor.document, collection)
			}
		}),
	)
}

async function updateDiagnostics(
	document: vscode.TextDocument,
	collection: vscode.DiagnosticCollection,
): Promise<void> {
	const channel = vscode.window.createOutputChannel('vscode-cppcheck')
	channel.appendLine('Thing here')

	// if (document && path.basename(document.uri.fsPath) === 'thing.rs') {
		channel.appendLine(JSON.stringify(document.uri))
		collection.clear()
		// collection.set(document.uri, [
		// 	{
		// 		code: '',
		// 		message: 'cannot assign twice to immutable variable `x`',
		// 		range: new vscode.Range(
		// 			new vscode.Position(3, 4),
		// 			new vscode.Position(3, 10),
		// 		),
		// 		severity: vscode.DiagnosticSeverity.Error,
		// 		source: '',
		// 		relatedInformation: [
		// 			new vscode.DiagnosticRelatedInformation(
		// 				new vscode.Location(
		// 					document.uri,
		// 					new vscode.Range(
		// 						new vscode.Position(1, 8),
		// 						new vscode.Position(1, 9),
		// 					),
		// 				),
		// 				'first assignment to `x`',
		// 			),
		// 		],
		// 	},
		// ])

		const command = await execa('./.hidden/cppcheck-2.9/build/bin/cppcheck', [
			'--xml',
			'./.hidden/test.cpp',
		])
		if (command.exitCode !== 0) {
			console.log(command)
			return
		}

		const xmldata = command.stderr

		const parser = new XMLParser({
			ignoreAttributes: false,
		})
		let obj = parser.parse(xmldata)
		channel.appendLine(JSON.stringify(obj, null, '\t'))

		const results = obj.results
		const things: vscode.Diagnostic[] = []
		for (const error of results.errors.error) {
			const loc = { line: 0, column: 0 }
			if (Array.isArray(error.location)) {
				loc.line = error.location[0]['@_line']
				loc.column = error.location[0]['@_column']
			} else {
				// is object
				loc.line = error.location['@_line']
				loc.column = error.location['@_column']
			}

			things.push({
				code: '',
				message: error['@_msg'],
				range: new vscode.Range(
					new vscode.Position(loc.line, loc.column),
					new vscode.Position(
						loc.line,
						loc.column < 0 ? loc.column + 1 : loc.column - 1,
					),
				),
				severity: vscode.DiagnosticSeverity.Error,
				source: '',
			})
		}
		collection.set(document.uri, things)
	// } else {
	// 	collection.clear()
	// }
}

export function deactivate() {}
