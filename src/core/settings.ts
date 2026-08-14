import { DEFAULT_LOCALE, parseLocale, type Locale } from "./i18n.js";

export interface DesktopSettings {
  workspace: string;
  locale: Locale;
}

export function parseSettings(raw: string, fallbackWorkspace: string): DesktopSettings {
  try {
    const data = JSON.parse(raw) as Partial<DesktopSettings>;
    const workspace =
      typeof data.workspace === "string" && data.workspace.trim().length > 0
        ? data.workspace
        : fallbackWorkspace;
    return { workspace, locale: parseLocale(data.locale) };
  } catch {
    // ignore corrupt settings and fall back
  }
  return { workspace: fallbackWorkspace, locale: DEFAULT_LOCALE };
}

export function serializeSettings(settings: DesktopSettings): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}
