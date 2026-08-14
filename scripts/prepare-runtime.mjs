import { createWriteStream } from "node:fs";
import { mkdir, rm, rename, stat, cp, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NODE_VERSION = "22.23.2";
const DSH_VERSION = "0.1.0-rc.6";
const PNPM_VERSION = "10.15.1";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.join(root, "resources", "runtime");
const cacheDir = path.join(root, "resources", ".cache");

function nodeDistName(platform, arch) {
  const nodeArch = arch === "arm64" ? "arm64" : "x64";
  if (platform === "win32") return `node-v${NODE_VERSION}-win-${nodeArch}`;
  if (platform === "darwin") return `node-v${NODE_VERSION}-darwin-${nodeArch}`;
  return `node-v${NODE_VERSION}-linux-${nodeArch}`;
}

function nodeArchiveName(platform, arch) {
  const base = nodeDistName(platform, arch);
  return platform === "win32" ? `${base}.zip` : `${base}.tar.gz`;
}

function nodeBinaryRel(platform) {
  return platform === "win32" ? "node.exe" : path.join("bin", "node");
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await exists(dest)) {
    console.log(`Using cached ${path.basename(dest)}`);
    return;
  }
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed ${res.status} ${url}`);
  }
  await mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  await pipeline(res.body, createWriteStream(tmp));
  await rename(tmp, dest);
}

async function extractArchive(archive, destDir, platform) {
  await mkdir(destDir, { recursive: true });
  if (platform === "win32") {
    await run("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${archive.replaceAll("'", "''")}' -DestinationPath '${destDir.replaceAll("'", "''")}' -Force`,
    ], destDir);
    return;
  }
  await run("tar", ["-xzf", archive, "-C", destDir], destDir);
}

async function prepareNode(platform, arch) {
  const dist = nodeDistName(platform, arch);
  const archive = nodeArchiveName(platform, arch);
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${archive}`;
  const archivePath = path.join(cacheDir, archive);
  await download(url, archivePath);

  const extractRoot = path.join(cacheDir, "node-extract");
  await rm(extractRoot, { recursive: true, force: true });
  await extractArchive(archivePath, extractRoot, platform);

  const unpacked = path.join(extractRoot, dist);
  const nodeDir = path.join(runtimeRoot, "node");
  await rm(nodeDir, { recursive: true, force: true });
  await mkdir(runtimeRoot, { recursive: true });
  await cp(unpacked, nodeDir, { recursive: true, force: true });
  await rm(extractRoot, { recursive: true, force: true });

  const binary = path.join(nodeDir, nodeBinaryRel(platform));
  if (!(await exists(binary))) {
    throw new Error(`Node binary missing after extract: ${binary}`);
  }
  console.log(`Node ${NODE_VERSION} ready at ${binary}`);
  return binary;
}

async function preparePackages() {
  const manifest = {
    name: "dsh-sidecar-runtime",
    private: true,
    version: "0.1.0",
    dependencies: {
      "@deepseek-ai/dsh": DSH_VERSION,
      pnpm: PNPM_VERSION,
    },
  };
  await writeFile(
    path.join(runtimeRoot, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";
  await run(
    npmCli,
    ["install", "--omit=dev", "--no-fund", "--no-audit"],
    runtimeRoot,
  );

  const dshEntry = path.join(
    runtimeRoot,
    "node_modules",
    "@deepseek-ai",
    "dsh",
    "lib",
    "bin.js",
  );
  if (!(await exists(dshEntry))) {
    throw new Error(`dsh entry missing after install: ${dshEntry}`);
  }
  console.log(`Installed @deepseek-ai/dsh@${DSH_VERSION}`);
}

async function main() {
  const platform = process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  await mkdir(runtimeRoot, { recursive: true });
  await prepareNode(platform, arch);
  await preparePackages();

  const stamp = {
    node: NODE_VERSION,
    dsh: DSH_VERSION,
    pnpm: PNPM_VERSION,
    platform,
    arch,
    preparedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(runtimeRoot, "runtime.json"),
    `${JSON.stringify(stamp, null, 2)}\n`,
    "utf8",
  );
  console.log("Runtime ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
