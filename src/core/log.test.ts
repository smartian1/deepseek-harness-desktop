import { describe, expect, it } from "vitest";
import { appendLog, looksLikeDshHtml, parseReadyUrl, stripAnsi } from "./log.js";

describe("stripAnsi", () => {
  it("removes CSI sequences", () => {
    expect(stripAnsi("\u001B[32mdsh web:\u001B[0m ready")).toBe("dsh web: ready");
  });
});

describe("parseReadyUrl", () => {
  it("extracts the printed localhost url", () => {
    expect(parseReadyUrl("dsh web: http://127.0.0.1:3080")).toBe("http://127.0.0.1:3080");
  });

  it("accepts localhost", () => {
    expect(parseReadyUrl("listening on http://localhost:3091/ui")).toBe("http://localhost:3091");
  });

  it("returns null when no url is present", () => {
    expect(parseReadyUrl("booting profile web")).toBeNull();
  });
});

describe("looksLikeDshHtml", () => {
  it("matches the official web title", () => {
    expect(looksLikeDshHtml("<html><head><title>DeepSeek Harness</title></head></html>")).toBe(
      true,
    );
  });

  it("rejects unrelated pages", () => {
    expect(looksLikeDshHtml("<title>IIS Windows</title>")).toBe(false);
  });
});

describe("appendLog", () => {
  it("caps the buffer at the limit", () => {
    const logs = appendLog(["a", "b", "c"], "d", 3);
    expect(logs).toEqual(["b", "c", "d"]);
  });
});
