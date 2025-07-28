import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import yamlWorker from "./yaml.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { registerWorker } from "@fast-crud/editor-code";
export function setupMonaco() {
  registerWorker("json", jsonWorker);
  registerWorker(["css", "less", "scss"], cssWorker);
  registerWorker(["html", "handlebars", "razor"], htmlWorker);
  registerWorker(["yaml", "yml"], yamlWorker);
  registerWorker(["typescript", "javascript"], tsWorker);
  registerWorker("*", editorWorker);
}
