import { existsSync } from "node:fs";
import path from "node:path";

export interface PathContext {
  packaged: boolean;
  resourcesPath: string;
  projectRoot: string;
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  userData: string;
}

export function resolveBundledRuntimeRoot(ctx: PathContext): string {
  if (ctx.packaged) return path.join(ctx.resourcesPath, "runtime");
  return path.join(ctx.projectRoot, "resources", "runtime");
}

export function resolveOverlayRuntimeRoot(ctx: PathContext): string {
  return path.join(ctx.userData, "runtime");
}

export function resolveOverlayStagingRoot(ctx: PathContext): string {
  return path.join(ctx.userData, "runtime.next");
}

export function resolveDshEntryFromRoot(runtimeRoot: string): string {
  return path.join(runtimeRoot, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js");
}

export function overlayIsReady(ctx: PathContext): boolean {
  return existsSync(resolveDshEntryFromRoot(resolveOverlayRuntimeRoot(ctx)));
}

export function resolveRuntimeRoot(ctx: PathContext): string {
  if (overlayIsReady(ctx)) return resolveOverlayRuntimeRoot(ctx);
  return resolveBundledRuntimeRoot(ctx);
}

export function resolveNodeBinary(ctx: PathContext): string {
  if (ctx.env.DSH_NODE_PATH) return ctx.env.DSH_NODE_PATH;
  const bundled = resolveBundledRuntimeRoot(ctx);
  if (ctx.platform === "win32") {
    return path.join(bundled, "node", "node.exe");
  }
  return path.join(bundled, "node", "bin", "node");
}

export function resolveDshEntry(ctx: PathContext): string {
  return resolveDshEntryFromRoot(resolveRuntimeRoot(ctx));
}

export function resolvePnpmBinDir(ctx: PathContext): string {
  return path.join(resolveRuntimeRoot(ctx), "node_modules", ".bin");
}

export function resolveBundledPnpmCli(ctx: PathContext): string {
  return path.join(resolveBundledRuntimeRoot(ctx), "node_modules", "pnpm", "bin", "pnpm.cjs");
}

export function resolveNodeDir(ctx: PathContext): string {
  return path.dirname(resolveNodeBinary(ctx));
}

export function resolveDshHome(env: NodeJS.ProcessEnv, homedir: string): string {
  return env.DSH_HOME ?? path.join(homedir, ".dsh");
}

export function resolveLoadingPage(ctx: PathContext): string {
  if (ctx.packaged) {
    return path.join(ctx.projectRoot, "resources", "loading", "index.html");
  }
  return path.join(ctx.projectRoot, "resources", "loading", "index.html");
}

export function resolvePreload(ctx: PathContext): string {
  return path.join(ctx.projectRoot, "resources", "preload", "index.cjs");
}

export function resolveIcon(ctx: PathContext): string {
  if (ctx.packaged) return path.join(ctx.resourcesPath, "icon.png");
  return path.join(ctx.projectRoot, "resources", "icon.png");
}
