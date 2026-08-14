export function stripAnsi(text: string): string {
  return text.replace(/\u001B\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
}

export function createLineSplitter(onLine: (line: string) => void): (chunk: Buffer | string) => void {
  let buffer = "";
  return (chunk) => {
    buffer += String(chunk);
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = stripAnsi(part).trimEnd();
      if (line.length > 0) onLine(line);
    }
  };
}

export function appendLog(logs: string[], line: string, limit: number): string[] {
  const next = [...logs, line];
  if (next.length <= limit) return next;
  return next.slice(next.length - limit);
}

export function parseReadyUrl(line: string): string | null {
  const match = line.match(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+\b/i);
  return match?.[0] ?? null;
}

export function looksLikeDshHtml(body: string): boolean {
  return /<title>\s*DeepSeek Harness\s*<\/title>/i.test(body);
}
