import { app, BrowserWindow, dialog, ipcMain } from "electron";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseLocale, uiCopy, type Locale } from "../core/i18n.js";
import type { PathContext } from "../core/paths.js";
import type { DesktopSettings } from "../core/settings.js";
import { canEnterHarness } from "../core/sidecar-plan.js";
import type { SidecarPhase } from "../core/types.js";
import { loadSettings, saveSettings } from "./settings-store.js";
import { SidecarController } from "./sidecar.js";
import { applyTrayMenu, createTray, type TrayHandlers } from "./tray.js";
import { createMainWindow, revealWindow, syncWindowToState } from "./window.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function createPathContext(): PathContext {
  return {
    packaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    projectRoot: app.isPackaged ? app.getAppPath() : projectRoot,
    platform: process.platform,
    env: process.env,
    userData: app.getPath("userData"),
  };
}

let mainWindow: BrowserWindow | null = null;
let quitting = false;
let sidecar: SidecarController | null = null;
let uiEntered = false;
let settings: DesktopSettings | null = null;
let tray: ReturnType<typeof createTray> | null = null;
let trayHandlers: TrayHandlers | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => revealWindow(mainWindow));
  void app.whenReady().then(boot);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && quitting) app.quit();
});

app.on("activate", () => {
  revealWindow(mainWindow);
});

app.on("before-quit", (event) => {
  if (quitting) return;
  event.preventDefault();
  void quitApp();
});

async function boot(): Promise<void> {
  const ctx = createPathContext();
  settings = await loadSettings(app.getPath("userData"), os.homedir());
  sidecar = new SidecarController(ctx, settings.workspace, settings.locale);
  mainWindow = createMainWindow(ctx);

  mainWindow.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });

  trayHandlers = {
    show: () => revealWindow(mainWindow),
    restart: () => {
      void sidecar?.restart();
    },
    update: () => {
      revealWindow(mainWindow);
      void sidecar?.updateSidecar();
    },
    restore: () => {
      void restoreBundled();
    },
    chooseWorkspace: () => {
      void chooseWorkspace();
    },
    quit: () => {
      void quitApp();
    },
  };
  tray = createTray(ctx, settings.locale, trayHandlers);

  ipcMain.handle("sidecar:state", () => sidecar?.getSnapshot());
  ipcMain.handle("sidecar:retry", async () => {
    await sidecar?.restart();
    return sidecar?.getSnapshot();
  });
  ipcMain.handle("sidecar:update", async () => {
    await sidecar?.updateSidecar();
    return sidecar?.getSnapshot();
  });
  ipcMain.handle("sidecar:restore", async () => {
    await restoreBundled();
    return sidecar?.getSnapshot();
  });
  ipcMain.handle("sidecar:enter", async () => {
    const state = sidecar?.getSnapshot();
    if (!mainWindow || !state || !canEnterHarness(state)) return state;
    uiEntered = true;
    await syncWindowToState(mainWindow, ctx, state, uiEntered);
    return state;
  });
  ipcMain.handle("sidecar:chooseWorkspace", async () => {
    await chooseWorkspace();
    return sidecar?.getSnapshot();
  });
  ipcMain.handle("desktop:setLocale", async (_event, next: unknown) => {
    await setLocale(parseLocale(next));
    return sidecar?.getSnapshot();
  });

  let lastPhase: SidecarPhase | null = null;
  let lastUrl: string | null = null;
  sidecar.onChange((state) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!canEnterHarness(state)) uiEntered = false;
    mainWindow.webContents.send("sidecar:state", state);
    if (state.phase === lastPhase && state.url === lastUrl) return;
    lastPhase = state.phase;
    lastUrl = state.url;
    void syncWindowToState(mainWindow, ctx, state, uiEntered);
  });

  await sidecar.start();
}

async function setLocale(locale: Locale): Promise<void> {
  if (!settings || !sidecar) return;
  if (settings.locale === locale) return;
  settings = { ...settings, locale };
  sidecar.setLocale(locale);
  await saveSettings(app.getPath("userData"), settings);
  if (tray && trayHandlers) applyTrayMenu(tray, locale, trayHandlers);
}

async function restoreBundled(): Promise<void> {
  if (!mainWindow || !sidecar) return;
  const copy = uiCopy(settings?.locale ?? "en");
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: [copy.restoreConfirm, copy.restoreCancel],
    defaultId: 1,
    cancelId: 1,
    title: copy.restoreTitle,
    message: copy.restoreMessage,
  });
  if (result.response !== 0) return;
  await sidecar.restoreBundled();
}

async function chooseWorkspace(): Promise<void> {
  if (!mainWindow || !sidecar || !settings) return;
  const current = sidecar.getSnapshot().workspace;
  const copy = uiCopy(settings.locale);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: copy.workspaceDialog,
    defaultPath: current,
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths[0] === undefined) return;
  const workspace = result.filePaths[0];
  if (workspace === current) return;
  sidecar.setWorkspace(workspace);
  settings = { ...settings, workspace };
  await saveSettings(app.getPath("userData"), settings);
  await sidecar.restart();
}

async function quitApp(): Promise<void> {
  if (quitting) return;
  quitting = true;
  try {
    await sidecar?.stop();
  } finally {
    app.exit(0);
  }
}
