export const DSH_PACKAGE = "@deepseek-ai/dsh";
export const DEFAULT_PNPM_VERSION = "10.15.1";
export const DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org";
export const MIRROR_NPM_REGISTRY = "https://registry.npmmirror.com";

export interface RuntimeStamp {
  node?: string;
  dsh?: string;
  pnpm?: string;
}

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function registryCandidates(env: NodeJS.ProcessEnv): string[] {
  const configured = env.npm_config_registry ?? env.NPM_CONFIG_REGISTRY;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return [trimTrailingSlash(configured.trim())];
  }
  return [DEFAULT_NPM_REGISTRY, MIRROR_NPM_REGISTRY];
}

export function packumentUrl(registry: string, name: string): string {
  const encoded = name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : name;
  return `${trimTrailingSlash(registry)}/${encoded}`;
}

export function parsePackageVersion(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as { version?: unknown };
    return typeof data.version === "string" && data.version.length > 0 ? data.version : null;
  } catch {
    return null;
  }
}

export function parseRuntimeStamp(raw: string): RuntimeStamp {
  try {
    const data = JSON.parse(raw) as RuntimeStamp;
    const stamp: RuntimeStamp = {};
    if (typeof data.node === "string") stamp.node = data.node;
    if (typeof data.dsh === "string") stamp.dsh = data.dsh;
    if (typeof data.pnpm === "string") stamp.pnpm = data.pnpm;
    return stamp;
  } catch {
    return {};
  }
}

export function parseLatestFromPackument(body: unknown): string {
  if (!body || typeof body !== "object") {
    throw new Error("invalid npm packument");
  }
  const record = body as { "dist-tags"?: { latest?: unknown }; version?: unknown };
  if (typeof record["dist-tags"]?.latest === "string") return record["dist-tags"].latest;
  if (typeof record.version === "string") return record.version;
  throw new Error("npm packument has no latest version");
}

export async function fetchLatestDshVersion(
  registry: string,
  fetcher: typeof fetch,
): Promise<string> {
  const url = packumentUrl(registry, DSH_PACKAGE);
  const response = await fetcher(url, {
    headers: { Accept: "application/vnd.npm.install-v1+json" },
  });
  if (!response.ok) {
    throw new Error(`registry ${response.status} ${url}`);
  }
  return parseLatestFromPackument(await response.json());
}

export async function fetchLatestDshVersionWithFallback(
  env: NodeJS.ProcessEnv,
  fetcher: typeof fetch,
  onTry?: (registry: string) => void,
): Promise<{ version: string; registry: string }> {
  const errors: string[] = [];
  for (const registry of registryCandidates(env)) {
    onTry?.(registry);
    try {
      const version = await fetchLatestDshVersion(registry, fetcher);
      return { version, registry };
    } catch (error) {
      errors.push(`${registry}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`failed to query ${DSH_PACKAGE}\n${errors.join("\n")}`);
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function parseSemver(version: string): { core: number[]; pre: Array<string | number> } | null {
  const match = version.trim().replace(/^v/, "").match(VERSION_RE);
  if (!match) return null;
  const core = [Number(match[1]), Number(match[2]), Number(match[3])];
  const pre =
    match[4] === undefined
      ? []
      : match[4].split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  return { core, pre };
}

export function compareNpmVersions(left: string, right: string): number {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return left === right ? 0 : left < right ? -1 : 1;
  for (let i = 0; i < 3; i += 1) {
    const left = a.core[i] ?? 0;
    const right = b.core[i] ?? 0;
    if (left !== right) return left - right;
  }
  if (a.pre.length === 0 && b.pre.length === 0) return 0;
  if (a.pre.length === 0) return 1;
  if (b.pre.length === 0) return -1;
  const n = Math.max(a.pre.length, b.pre.length);
  for (let i = 0; i < n; i += 1) {
    const av = a.pre[i];
    const bv = b.pre[i];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av === bv) continue;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    if (typeof av === "number") return -1;
    if (typeof bv === "number") return 1;
    return av < bv ? -1 : 1;
  }
  return 0;
}

export function shouldInstall(current: string | null, latest: string): boolean {
  if (current === null || current.length === 0) return true;
  return compareNpmVersions(latest, current) > 0;
}

export function overlayPackageManifest(dshVersion: string, pnpmVersion: string): string {
  return `${JSON.stringify(
    {
      name: "dsh-sidecar-overlay",
      private: true,
      version: "0.0.0",
      dependencies: {
        [DSH_PACKAGE]: dshVersion,
        pnpm: pnpmVersion,
      },
    },
    null,
    2,
  )}\n`;
}

export function pnpmInstallArgs(): string[] {
  return ["install", "--ignore-workspace"];
}

export function overlayStamp(options: {
  node?: string;
  dsh: string;
  pnpm: string;
  registry: string;
  updatedAt: string;
}): string {
  const body: Record<string, string> = {
    dsh: options.dsh,
    pnpm: options.pnpm,
    registry: options.registry,
    source: "overlay",
    updatedAt: options.updatedAt,
  };
  if (options.node) body.node = options.node;
  return `${JSON.stringify(body, null, 2)}\n`;
}
