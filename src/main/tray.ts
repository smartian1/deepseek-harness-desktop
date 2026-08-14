import { Menu, Tray, nativeImage, type NativeImage } from "electron";
import { uiCopy, type Locale } from "../core/i18n.js";
import { resolveIcon, type PathContext } from "../core/paths.js";

export type TrayHandlers = {
  show: () => void;
  restart: () => void;
  update: () => void;
  restore: () => void;
  chooseWorkspace: () => void;
  quit: () => void;
};

export function createTray(ctx: PathContext, locale: Locale, handlers: TrayHandlers): Tray {
  const image = loadTrayImage(ctx);
  const tray = new Tray(image);
  applyTrayMenu(tray, locale, handlers);
  tray.on("click", handlers.show);
  return tray;
}

export function applyTrayMenu(tray: Tray, locale: Locale, handlers: TrayHandlers): void {
  const copy = uiCopy(locale);
  tray.setToolTip("DeepSeek Harness");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: copy.trayShow, click: handlers.show },
      { label: copy.trayRestart, click: handlers.restart },
      { label: copy.trayUpdate, click: handlers.update },
      { label: copy.trayRestore, click: handlers.restore },
      { label: copy.trayWorkspace, click: handlers.chooseWorkspace },
      { type: "separator" },
      { label: copy.trayQuit, click: handlers.quit },
    ]),
  );
}

function loadTrayImage(ctx: PathContext): NativeImage {
  const image = nativeImage.createFromPath(resolveIcon(ctx));
  if (image.isEmpty()) return nativeImage.createEmpty();
  return image.resize({ width: 16, height: 16 });
}
