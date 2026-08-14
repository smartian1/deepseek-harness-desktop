import { spawn, type ChildProcess } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_LOCALE, parseLocale, type Locale } from "../core/i18n.js";
import {
  DEFAULT_HOST,
  LOG_LIMIT,
  PORT_SCAN_LIMIT,
  PREFERRED_PORT,
  READY_TIMEOUT_MS,
  STOP_GRACE_MS,
  createInitialState,
  type SidecarState,
} from "../core/types.js";
import { appendLog, createLineSplitter, parseReadyUrl } from "../core/log.js";
import {
  overlayIsReady,
  resolveDshEntry,
  resolveDshHome,
  resolveNodeBinary,
  resolveNodeDir,
  resolvePnpmBinDir,
  resolveRuntimeRoot,
  type PathContext,
} from "../core/paths.js";
import { choosePort } from "../core/port.js";
import { probeLocal, waitForDsh } from "../core/probe.js";
import { buildSidecarPlan } from "../core/sidecar-plan.js";
import { shouldInstall } from "../core/update.js";
import {
  installSidecarOverlay,
  queryLatestDsh,
  readDshVersion,
  removeSidecarOverlay,
} from "./runtime-update.js";

export type StateListener = (state: SidecarState) => void;

export class SidecarController {
  private state: SidecarState;
  private child: ChildProcess | null = null;
  private generation = 0;
  private updateInFlight = false;
  private readonly listeners = new Set<StateListener>();

  constructor(
    private readonly ctx: PathContext,
    workspace: string,
    locale: Locale = DEFAULT_LOCALE,
  ) {
    this.state = createInitialState(workspace, DEFAULT_HOST, parseLocale(locale));
  }

  getSnapshot(): SidecarState {
    return this.state;
  }

  onChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setWorkspace(workspace: string): void {
    this.patch({ workspace });
  }

  setLocale(locale: Locale): void {
    this.patch({ locale: parseLocale(locale) });
  }

  async start(options: { skipAttach?: boolean } = {}): Promise<void> {
    const gen = ++this.generation;
    await this.stopOwnedProcess();
    await this.refreshRuntimeMeta();
    this.patch({
      phase: "probing",
      error: null,
      url: null,
      port: null,
      ownedProcess: false,
    });
    this.log("Probing for an existing dsh web server");

    try {
      const existing = options.skipAttach
        ? { kind: "empty" as const }
        : await probeLocal(this.state.host, PREFERRED_PORT);
      if (this.stale(gen)) return;
      if (existing.kind === "dsh") {
        this.patch({
          phase: "attached",
          url: existing.url,
          port: PREFERRED_PORT,
          ownedProcess: false,
        });
        this.log(`Attached to existing server at ${existing.url}`);
        return;
      }

      const port =
        existing.kind === "other"
          ? await choosePort(PREFERRED_PORT + 1, this.state.host, PORT_SCAN_LIMIT)
          : await choosePort(PREFERRED_PORT, this.state.host, PORT_SCAN_LIMIT);
      if (this.stale(gen)) return;

      await this.spawnOwned(gen, port);
    } catch (error) {
      if (this.stale(gen)) return;
      this.fail(error);
    }
  }

  async stop(): Promise<void> {
    this.generation += 1;
    this.patch({ phase: "stopping" });
    await this.stopOwnedProcess();
    this.patch({
      phase: "idle",
      url: null,
      port: null,
      ownedProcess: false,
    });
  }

  async restart(): Promise<void> {
    await this.start();
  }

  async updateSidecar(): Promise<void> {
    if (this.updateInFlight) {
      this.log("Update already running");
      return;
    }
    this.updateInFlight = true;
    const gen = ++this.generation;
    await this.stopOwnedProcess();
    await this.refreshRuntimeMeta();
    this.patch({
      phase: "updating",
      error: null,
      url: null,
      port: null,
      ownedProcess: false,
    });
    this.log("Checking npm for a newer @deepseek-ai/dsh");
    try {
      const current = this.state.dshVersion;
      const latest = await queryLatestDsh(this.ctx, (line) => this.log(line));
      if (this.stale(gen)) return;
      this.log(`Installed ${current ?? "unknown"}; registry latest ${latest.version}`);
      if (!shouldInstall(current, latest.version)) {
        this.log("Already on the newest published dsh");
        await this.start({ skipAttach: true });
        return;
      }
      await installSidecarOverlay(this.ctx, latest.version, latest.registry, (line) => this.log(line));
      if (this.stale(gen)) return;
      this.log(`Updated sidecar to ${latest.version}`);
      await this.start({ skipAttach: true });
    } catch (error) {
      if (this.stale(gen)) return;
      this.fail(error);
    } finally {
      this.updateInFlight = false;
    }
  }

  async restoreBundled(): Promise<void> {
    if (this.updateInFlight) {
      this.log("Update already running");
      return;
    }
    this.updateInFlight = true;
    const gen = ++this.generation;
    await this.stopOwnedProcess();
    this.patch({
      phase: "updating",
      error: null,
      url: null,
      port: null,
      ownedProcess: false,
    });
    this.log("Removing userData sidecar overlay");
    try {
      await removeSidecarOverlay(this.ctx);
      if (this.stale(gen)) return;
      await this.start({ skipAttach: true });
    } catch (error) {
      if (this.stale(gen)) return;
      this.fail(error);
    } finally {
      this.updateInFlight = false;
    }
  }

  private async spawnOwned(gen: number, port: number): Promise<void> {
    const nodePath = resolveNodeBinary(this.ctx);
    const dshEntry = resolveDshEntry(this.ctx);
    await access(nodePath);
    await access(dshEntry);

    const plan = buildSidecarPlan({
      nodePath,
      dshEntry,
      host: this.state.host,
      port,
      cwd: this.state.workspace,
      dshHome: resolveDshHome(this.ctx.env, os.homedir()),
      extraPathDirs: [resolveNodeDir(this.ctx), resolvePnpmBinDir(this.ctx)],
      baseEnv: this.ctx.env,
      pathDelimiter: path.delimiter,
    });

    this.patch({ phase: "starting", port, ownedProcess: true });
    this.log(`Starting sidecar: ${plan.command} ${plan.args.join(" ")}`);
    this.log(`cwd=${plan.cwd}`);

    const child = spawn(plan.command, plan.args, {
      cwd: plan.cwd,
      env: plan.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    this.child = child;

    const onLine = createLineSplitter((line) => {
      if (this.stale(gen)) return;
      this.log(line);
      const url = parseReadyUrl(line);
      if (url && (this.state.phase === "starting" || this.state.phase === "waiting")) {
        this.patch({ phase: "waiting", url });
      }
    });
    child.stdout?.on("data", onLine);
    child.stderr?.on("data", onLine);

    child.once("error", (error) => {
      if (this.stale(gen)) return;
      this.fail(error);
    });
    child.once("exit", (code, signal) => {
      if (this.child === child) this.child = null;
      if (this.stale(gen)) return;
      if (this.state.phase === "stopping") return;
      this.patch({
        phase: "error",
        error: `dsh exited (code ${code ?? "null"}, signal ${signal ?? "null"})`,
        ownedProcess: false,
        url: null,
      });
    });

    this.patch({ phase: "waiting" });
    const url = await waitForDsh(this.state.host, port, {
      timeoutMs: READY_TIMEOUT_MS,
    });
    if (this.stale(gen)) return;
    this.patch({ phase: "ready", url, port, ownedProcess: true });
    this.log(`Ready at ${url}`);
  }

  private async stopOwnedProcess(): Promise<void> {
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null || child.pid === undefined) return;
    await terminate(child, STOP_GRACE_MS);
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.patch({
      phase: "error",
      error: message,
      ownedProcess: false,
    });
    this.log(message);
  }

  private log(line: string): void {
    this.patch({ logs: appendLog(this.state.logs, line, LOG_LIMIT) });
  }

  private patch(partial: Partial<SidecarState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener(this.state);
  }

  private stale(gen: number): boolean {
    return gen !== this.generation;
  }

  private async refreshRuntimeMeta(): Promise<void> {
    const source = overlayIsReady(this.ctx) ? "overlay" : "bundled";
    const version = await readDshVersion(resolveRuntimeRoot(this.ctx));
    this.patch({
      runtimeSource: source,
      dshVersion: version,
    });
    this.log(`Using ${source} sidecar ${version ?? "unknown"}`);
  }
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function terminate(child: ChildProcess, graceMs: number): Promise<void> {
  if (child.exitCode !== null || child.pid === undefined) return;
  child.kill("SIGTERM");
  if (await waitForExit(child, graceMs)) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore",
    });
  } else {
    child.kill("SIGKILL");
  }
  await waitForExit(child, 2000);
}
