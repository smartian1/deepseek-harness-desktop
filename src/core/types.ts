import { DEFAULT_LOCALE, type Locale } from "./i18n.js";

export type SidecarPhase =
  | "idle"
  | "probing"
  | "starting"
  | "waiting"
  | "ready"
  | "attached"
  | "updating"
  | "error"
  | "stopping";

export type RuntimeSource = "bundled" | "overlay";

export interface SidecarState {
  phase: SidecarPhase;
  url: string | null;
  host: string;
  port: number | null;
  error: string | null;
  ownedProcess: boolean;
  workspace: string;
  logs: string[];
  dshVersion: string | null;
  runtimeSource: RuntimeSource;
  locale: Locale;
}

export function createInitialState(
  workspace: string,
  host: string,
  locale: Locale = DEFAULT_LOCALE,
): SidecarState {
  return {
    phase: "idle",
    url: null,
    host,
    port: null,
    error: null,
    ownedProcess: false,
    workspace,
    logs: [],
    dshVersion: null,
    runtimeSource: "bundled",
    locale,
  };
}

export const PREFERRED_PORT = 3080;
export const DEFAULT_HOST = "127.0.0.1";
export const PORT_SCAN_LIMIT = 20;
export const READY_TIMEOUT_MS = 120_000;
export const STOP_GRACE_MS = 5_000;
export const LOG_LIMIT = 200;
