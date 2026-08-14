import path from "node:path";

export interface SidecarPlan {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export function buildSidecarArgs(entry: string, host: string, port: number): string[] {
  return [entry, "web", "--host", host, "--port", String(port)];
}

export function prependPath(
  current: string | undefined,
  extraDirs: string[],
  delimiter: string,
): string {
  const existing = current?.split(delimiter).filter(Boolean) ?? [];
  const merged = [...extraDirs, ...existing];
  return [...new Set(merged)].join(delimiter);
}

export function buildSidecarEnv(options: {
  baseEnv: NodeJS.ProcessEnv;
  extraPathDirs: string[];
  dshHome: string;
  pathDelimiter: string;
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...options.baseEnv,
    DSH_HOME: options.dshHome,
    PATH: prependPath(options.baseEnv.PATH, options.extraPathDirs, options.pathDelimiter),
  };
  return env;
}

export function buildSidecarPlan(options: {
  nodePath: string;
  dshEntry: string;
  host: string;
  port: number;
  cwd: string;
  dshHome: string;
  extraPathDirs: string[];
  baseEnv: NodeJS.ProcessEnv;
  pathDelimiter: string;
}): SidecarPlan {
  return {
    command: options.nodePath,
    args: buildSidecarArgs(options.dshEntry, options.host, options.port),
    cwd: options.cwd,
    env: buildSidecarEnv({
      baseEnv: options.baseEnv,
      extraPathDirs: options.extraPathDirs,
      dshHome: options.dshHome,
      pathDelimiter: options.pathDelimiter,
    }),
  };
}

export function isBenignNavigationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ERR_ABORTED/.test(message);
}

export function isLoadingPageUrl(url: string): boolean {
  return url.startsWith("file:") && url.includes("/loading/index.html");
}

export function canEnterHarness(state: { phase: string; url: string | null }): boolean {
  return (state.phase === "ready" || state.phase === "attached") && Boolean(state.url);
}

export function shouldOpenHarnessUi(
  state: { phase: string; url: string | null },
  entered: boolean,
): boolean {
  return entered && canEnterHarness(state);
}

export function isLocalHarnessUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function settingsPath(userData: string): string {
  return path.join(userData, "desktop.json");
}
