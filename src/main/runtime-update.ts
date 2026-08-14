import { spawn } from "node:child_process";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  resolveBundledPnpmCli,
  resolveBundledRuntimeRoot,
  resolveDshEntryFromRoot,
  resolveNodeBinary,
  resolveOverlayRuntimeRoot,
  resolveOverlayStagingRoot,
  type PathContext,
} from "../core/paths.js";
import {
  DEFAULT_PNPM_VERSION,
  fetchLatestDshVersionWithFallback,
  overlayPackageManifest,
  overlayStamp,
  parsePackageVersion,
  parseRuntimeStamp,
  pnpmInstallArgs,
} from "../core/update.js";

export async function readDshVersion(runtimeRoot: string): Promise<string | null> {
  try {
    const raw = await readFile(
      path.join(runtimeRoot, "node_modules", "@deepseek-ai", "dsh", "package.json"),
      "utf8",
    );
    const version = parsePackageVersion(raw);
    if (version) return version;
  } catch {
    // fall through to stamp
  }
  try {
    return parseRuntimeStamp(await readFile(path.join(runtimeRoot, "runtime.json"), "utf8")).dsh ?? null;
  } catch {
    return null;
  }
}

export async function readBundledPnpmVersion(ctx: PathContext): Promise<string> {
  try {
    const stamp = parseRuntimeStamp(
      await readFile(path.join(resolveBundledRuntimeRoot(ctx), "runtime.json"), "utf8"),
    );
    if (stamp.pnpm) return stamp.pnpm;
  } catch {
    // use default
  }
  return DEFAULT_PNPM_VERSION;
}

export async function readBundledNodeVersion(ctx: PathContext): Promise<string | undefined> {
  try {
    return parseRuntimeStamp(
      await readFile(path.join(resolveBundledRuntimeRoot(ctx), "runtime.json"), "utf8"),
    ).node;
  } catch {
    return undefined;
  }
}

export async function queryLatestDsh(
  ctx: PathContext,
  log: (line: string) => void,
): Promise<{ version: string; registry: string }> {
  return fetchLatestDshVersionWithFallback(ctx.env, fetch, (registry) => {
    log(`Checking ${registry} for @deepseek-ai/dsh`);
  });
}

export async function installSidecarOverlay(
  ctx: PathContext,
  latest: string,
  registry: string,
  log: (line: string) => void,
): Promise<void> {
  const nodePath = resolveNodeBinary(ctx);
  const pnpmCli = resolveBundledPnpmCli(ctx);
  await access(nodePath);
  await access(pnpmCli);

  const staging = resolveOverlayStagingRoot(ctx);
  const overlay = resolveOverlayRuntimeRoot(ctx);
  const pnpmVersion = await readBundledPnpmVersion(ctx);
  const nodeVersion = await readBundledNodeVersion(ctx);

  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  await writeFile(path.join(staging, "package.json"), overlayPackageManifest(latest, pnpmVersion), "utf8");

  log(`Installing @deepseek-ai/dsh@${latest} into ${staging}`);
  await runLogged(nodePath, [pnpmCli, ...pnpmInstallArgs()], staging, {
    ...ctx.env,
    npm_config_registry: registry,
    NPM_CONFIG_REGISTRY: registry,
  }, log);

  const entry = resolveDshEntryFromRoot(staging);
  await access(entry);
  const stamp = {
    dsh: latest,
    pnpm: pnpmVersion,
    registry,
    updatedAt: new Date().toISOString(),
    ...(nodeVersion ? { node: nodeVersion } : {}),
  };
  await writeFile(path.join(staging, "runtime.json"), overlayStamp(stamp), "utf8");

  await rm(overlay, { recursive: true, force: true });
  await rename(staging, overlay);
  log(`Overlay ready at ${overlay}`);
}

export async function removeSidecarOverlay(ctx: PathContext): Promise<void> {
  await rm(resolveOverlayRuntimeRoot(ctx), { recursive: true, force: true });
  await rm(resolveOverlayStagingRoot(ctx), { recursive: true, force: true });
}

function runLogged(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  log: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const onChunk = (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split(/\r?\n/)) {
        const trimmed = line.trimEnd();
        if (trimmed.length > 0) log(trimmed);
      }
    };
    child.stdout?.on("data", onChunk);
    child.stderr?.on("data", onChunk);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} ${args[0] ?? ""} exited ${code}`));
    });
  });
}
