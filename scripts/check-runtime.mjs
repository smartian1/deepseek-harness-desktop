import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.join(root, "resources", "runtime");
const nodeName = process.platform === "win32" ? "node.exe" : path.join("bin", "node");
const required = [
  path.join(runtimeRoot, "node", nodeName),
  path.join(runtimeRoot, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js"),
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

const missing = [];
for (const filePath of required) {
  if (!(await exists(filePath))) missing.push(filePath);
}

if (missing.length > 0) {
  console.error("Sidecar runtime is not prepared. Missing:");
  for (const filePath of missing) console.error(`  ${filePath}`);
  console.error("\nRun:  pnpm prepare:runtime");
  process.exit(1);
}
