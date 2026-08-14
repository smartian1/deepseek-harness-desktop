window.HARNESS_I18N = {
  en: {
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
  },
  zh: {
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
  },
};

window.harnessCopy = function harnessCopy(locale) {
  return window.HARNESS_I18N[locale === "zh" ? "zh" : "en"];
};

window.harnessClockLocale = function harnessClockLocale(locale) {
  return locale === "zh" ? "zh-CN" : "en-US";
};
