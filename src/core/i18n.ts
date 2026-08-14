export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export interface UiCopy {
  eyebrow: string;
  subtitle: string;
  detail: Record<string, string>;
  url: string;
  workspace: string;
  version: string;
  change: string;
  start: string;
  update: string;
  restart: string;
  log: string;
  bundled: string;
  overlay: string;
  bridgeMissing: string;
  trayShow: string;
  trayRestart: string;
  trayUpdate: string;
  trayRestore: string;
  trayWorkspace: string;
  trayQuit: string;
  restoreTitle: string;
  restoreMessage: string;
  restoreConfirm: string;
  restoreCancel: string;
  workspaceDialog: string;
}

const en: UiCopy = {
  eyebrow: "Local agent runtime",
  subtitle: "When the runtime is ready, click Start to enter.",
  detail: {
    idle: "Waiting",
    probing: "Checking for a local server",
    starting: "Starting the runtime",
    waiting: "Waiting until the server is ready",
    ready: "Ready. Click Start to enter.",
    attached: "Attached to a local server. Click Start to enter.",
    updating: "Updating the program",
    error: "Failed to start",
    stopping: "Stopping",
  },
  url: "URL",
  workspace: "Workspace",
  version: "Version",
  change: "Change",
  start: "Start",
  update: "Update",
  restart: "Restart",
  log: "Runtime log",
  bundled: "bundled",
  overlay: "updated",
  bridgeMissing: "Desktop bridge is unavailable",
  trayShow: "Show window",
  trayRestart: "Restart server",
  trayUpdate: "Update program",
  trayRestore: "Restore bundled version",
  trayWorkspace: "Choose workspace…",
  trayQuit: "Quit",
  restoreTitle: "Restore bundled version",
  restoreMessage:
    "Delete the downloaded runtime update and go back to the copy shipped in this install?",
  restoreConfirm: "Restore",
  restoreCancel: "Cancel",
  workspaceDialog: "Choose workspace",
};

const zh: UiCopy = {
  eyebrow: "Local agent runtime",
  subtitle: "运行时准备完成后，点击启动进入。",
  detail: {
    idle: "等待准备",
    probing: "正在检查本机服务",
    starting: "正在准备运行时",
    waiting: "等待服务就绪",
    ready: "已就绪，点击启动进入",
    attached: "已接入本机服务，点击启动进入",
    updating: "正在更新程序",
    error: "启动失败",
    stopping: "正在停止",
  },
  url: "URL",
  workspace: "工作区",
  version: "版本",
  change: "更改",
  start: "启动",
  update: "更新程序",
  restart: "重新启动",
  log: "运行日志",
  bundled: "内置",
  overlay: "已更新",
  bridgeMissing: "桌面桥接不可用",
  trayShow: "显示窗口",
  trayRestart: "重启服务",
  trayUpdate: "更新程序",
  trayRestore: "恢复内置版本",
  trayWorkspace: "选择工作区…",
  trayQuit: "退出",
  restoreTitle: "恢复内置版本",
  restoreMessage: "删除已下载的程序更新，回到安装包内置的 DeepSeek Harness 运行时？",
  restoreConfirm: "恢复",
  restoreCancel: "取消",
  workspaceDialog: "选择工作区",
};

const catalogs: Record<Locale, UiCopy> = { en, zh };

export function parseLocale(value: unknown): Locale {
  return value === "zh" ? "zh" : DEFAULT_LOCALE;
}

export function uiCopy(locale: Locale): UiCopy {
  return catalogs[parseLocale(locale)];
}

export function clockLocale(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}
