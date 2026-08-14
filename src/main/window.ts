import { BrowserWindow, shell } from "electron";
import { resolveIcon, resolveLoadingPage, resolvePreload, type PathContext } from "../core/paths.js";
import {
  isBenignNavigationError,
  isLoadingPageUrl,
  isLocalHarnessUrl,
  normalizeUrl,
  shouldOpenHarnessUi,
} from "../core/sidecar-plan.js";
import type { SidecarState } from "../core/types.js";

export function createMainWindow(ctx: PathContext): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#100e0b",
    title: "DeepSeek Harness",
    icon: resolveIcon(ctx),
    autoHideMenuBar: true,
    webPreferences: {
      preload: resolvePreload(ctx),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isLocalHarnessUrl(url)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file:")) return;
    if (isLocalHarnessUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  return win;
}

async function navigate(loader: () => Promise<void>): Promise<void> {
  try {
    await loader();
  } catch (error) {
    if (!isBenignNavigationError(error)) throw error;
  }
}

export async function loadLoadingPage(win: BrowserWindow, ctx: PathContext): Promise<void> {
  if (isLoadingPageUrl(win.webContents.getURL() ?? "")) return;
  await navigate(() => win.loadFile(resolveLoadingPage(ctx)));
}

export async function syncWindowToState(
  win: BrowserWindow,
  ctx: PathContext,
  state: SidecarState,
  entered = false,
): Promise<void> {
  if (win.isDestroyed()) return;
  if (shouldOpenHarnessUi(state, entered) && state.url) {
    const targetUrl = state.url;
    const current = normalizeUrl(win.webContents.getURL() ?? "");
    const target = normalizeUrl(targetUrl);
    if (current !== target) {
      await navigate(() => win.loadURL(targetUrl));
    }
    return;
  }
  await loadLoadingPage(win, ctx);
}

export function revealWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
