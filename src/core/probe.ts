import { looksLikeDshHtml } from "./log.js";

export type ProbeResult =
  | { kind: "empty" }
  | { kind: "dsh"; url: string }
  | { kind: "other"; status: number };

export function localUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

export async function probeLocal(
  host: string,
  port: number,
  timeoutMs = 800,
): Promise<ProbeResult> {
  const url = `${localUrl(host, port)}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    const body = await response.text();
    if (looksLikeDshHtml(body)) {
      return { kind: "dsh", url: localUrl(host, port) };
    }
    return { kind: "other", status: response.status };
  } catch {
    return { kind: "empty" };
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForDsh(
  host: string,
  port: number,
  options: {
    timeoutMs: number;
    intervalMs?: number;
    signal?: AbortSignal;
  },
): Promise<string> {
  const deadline = Date.now() + options.timeoutMs;
  const intervalMs = options.intervalMs ?? 300;
  while (Date.now() < deadline) {
    if (options.signal?.aborted) {
      throw new Error("Cancelled while waiting for dsh");
    }
    const result = await probeLocal(host, port, 700);
    if (result.kind === "dsh") return result.url;
    await sleep(intervalMs);
  }
  throw new Error(`dsh did not become ready on ${localUrl(host, port)} within ${options.timeoutMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
