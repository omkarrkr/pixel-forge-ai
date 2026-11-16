import { parse } from "@babel/parser";

const SUPPORTED_IMPORTS = new Set(["react", "lucide-react"]);
const MAX_CODE_LENGTH = 200_000;

/** Checks the single-file preview contract. Does not execute code or prove safety. */
export function validateGeneratedCode(code: string): string | null {
  if (!code.trim()) return "The component is empty.";
  if (code.length > MAX_CODE_LENGTH) return "The component is too large to preview (maximum 200,000 characters).";
  if (code.trim().startsWith("```")) return "Remove Markdown code fences and return only React JSX.";
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  } catch (error) {
    return `Invalid React JSX: ${error instanceof Error ? error.message : "The component could not be parsed."}`;
  }

  let hasDefault = false;
  for (const statement of ast.program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      hasDefault = true;
      if (!["FunctionDeclaration", "ClassDeclaration", "ArrowFunctionExpression",
        "FunctionExpression", "ClassExpression", "Identifier", "CallExpression",
        "MemberExpression"].includes(statement.declaration.type)) {
        return "The default export must be a React component, not a value such as text, an object, or a JSX element.";
      }
    }
    if (statement.type === "ExportNamedDeclaration" && statement.specifiers.some(
      specifier => specifier.exported.type === "Identifier"
        ? specifier.exported.name === "default" : specifier.exported.value === "default"
    )) hasDefault = true;
  }
  if (!hasDefault) return "Export one React component as default, for example: export default function App() { ... }";

  // Visit all nodes so nested imports and require() cannot bypass the contract.
  function check(node: unknown): string | null {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const error = check(child);
        if (error) return error;
      }
      return null;
    }
    const item = node as Record<string, unknown>;
    if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(String(item.type))) {
      const source = item.source as { value?: string } | null;
      if (source?.value && !SUPPORTED_IMPORTS.has(source.value)) {
        return `Unsupported import "${source.value}". This preview supports only react and lucide-react; keep the component in one file.`;
      }
    }
    const callee = item.callee as { type?: string; name?: string } | undefined;
    if (item.type === "ImportExpression" || (item.type === "CallExpression" &&
      (callee?.type === "Import" || (callee?.type === "Identifier" && callee.name === "require")))) {
      return "Dynamic imports and require() are not supported. Use static imports from react or lucide-react.";
    }
    for (const [key, child] of Object.entries(item)) {
      if (["loc", "start", "end", "comments", "tokens"].includes(key)) continue;
      const error = check(child);
      if (error) return error;
    }
    return null;
  }
  return check(ast.program);
}
