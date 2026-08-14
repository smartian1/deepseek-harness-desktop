const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DSH_REL = path.join("@deepseek-ai", "dsh", "lib", "bin.js");

function resolveResourcesDir(context) {
  if (context.electronPlatformName === "darwin") {
    return path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      "Contents",
      "Resources",
    );
  }
  return path.join(context.appOutDir, "resources");
}

function resolveNodeBinary(resourcesDir, electronPlatformName) {
  if (electronPlatformName === "win32") {
    return path.join(resourcesDir, "runtime", "node", "node.exe");
  }
  return path.join(resourcesDir, "runtime", "node", "bin", "node");
}

function copySidecarModules(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  if (process.platform === "win32") {
    const result = spawnSync(
      "robocopy",
      [src, dest, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np", "/XF", "*.map", ".package-lock.json", "/XD", ".cache"],
      { windowsHide: true, encoding: "utf8" },
    );
    // robocopy: 0-7 are success (copied / extra / mismatched / etc.)
    if (result.status !== null && result.status < 8) return;
    throw new Error(
      `robocopy sidecar modules failed (code ${result.status}): ${result.stderr || result.stdout || ""}`,
    );
  }
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (srcPath) => {
      if (srcPath.endsWith(".map")) return false;
      if (srcPath.includes(`${path.sep}.cache${path.sep}`)) return false;
      return path.basename(srcPath) !== ".package-lock.json";
    },
  });
}

module.exports = async function afterPack(context) {
  const resourcesDir = resolveResourcesDir(context);
  const destModules = path.join(resourcesDir, "runtime", "node_modules");
  const srcModules = path.join(
    context.packager.projectDir,
    "resources",
    "runtime",
    "node_modules",
  );
  const dshEntry = path.join(destModules, DSH_REL);
  const srcEntry = path.join(srcModules, DSH_REL);
  const nodeBinary = resolveNodeBinary(resourcesDir, context.electronPlatformName);

  if (!fs.existsSync(nodeBinary)) {
    throw new Error(`Packed Node binary is missing: ${nodeBinary}`);
  }
  if (!fs.existsSync(srcEntry)) {
    throw new Error(`Sidecar runtime is not prepared. Missing: ${srcEntry}\nRun: pnpm prepare:runtime`);
  }

  copySidecarModules(srcModules, destModules);

  if (!fs.existsSync(dshEntry)) {
    throw new Error(
      `Packed dsh entry is missing: ${dshEntry}\n` +
        "electron-builder skips a top-level node_modules in extraResources; afterPack must copy it.",
    );
  }
};
