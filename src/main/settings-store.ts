import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseSettings, serializeSettings, type DesktopSettings } from "../core/settings.js";
import { settingsPath } from "../core/sidecar-plan.js";

export async function loadSettings(
  userData: string,
  fallbackWorkspace: string,
): Promise<DesktopSettings> {
  try {
    const raw = await readFile(settingsPath(userData), "utf8");
    return parseSettings(raw, fallbackWorkspace);
  } catch {
    return parseSettings("{}", fallbackWorkspace);
  }
}

export async function saveSettings(userData: string, settings: DesktopSettings): Promise<void> {
  await mkdir(path.dirname(settingsPath(userData)), { recursive: true });
  await writeFile(settingsPath(userData), serializeSettings(settings), "utf8");
}
