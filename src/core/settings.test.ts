import { describe, expect, it } from "vitest";
import { parseSettings, serializeSettings } from "./settings.js";

describe("parseSettings", () => {
  it("returns the stored workspace and defaults locale to English", () => {
    expect(parseSettings('{"workspace":"F:\\\\code\\\\proj"}', "C:\\Users\\me")).toEqual({
      workspace: "F:\\code\\proj",
      locale: "en",
    });
  });

  it("keeps a stored Chinese locale", () => {
    expect(parseSettings('{"workspace":"D:\\\\work","locale":"zh"}', "C:\\Users\\me")).toEqual({
      workspace: "D:\\work",
      locale: "zh",
    });
  });

  it("falls back on invalid json", () => {
    expect(parseSettings("not-json", "C:\\Users\\me")).toEqual({
      workspace: "C:\\Users\\me",
      locale: "en",
    });
  });
});

describe("serializeSettings", () => {
  it("round-trips workspace and locale", () => {
    const raw = serializeSettings({ workspace: "D:\\work", locale: "zh" });
    expect(parseSettings(raw, "fallback")).toEqual({ workspace: "D:\\work", locale: "zh" });
  });
});
