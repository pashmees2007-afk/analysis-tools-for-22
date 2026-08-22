import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const sourcePath = fileURLToPath(new URL("../examples/AnalysisEvidencePanel.tsx", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const result = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
  fileName: sourcePath,
});

const errors = (result.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
  }
  process.exit(1);
}

console.log("Frontend evidence example syntax check passed.");
