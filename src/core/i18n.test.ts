import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, parseLocale, uiCopy } from "./i18n.js";

describe("parseLocale", () => {
  it("defaults to English", () => {
    expect(parseLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("fr")).toBe("en");
    expect(parseLocale("zh")).toBe("zh");
  });
});

describe("uiCopy", () => {
  it("returns Start in English and 启动 in Chinese", () => {
    expect(uiCopy("en").start).toBe("Start");
    expect(uiCopy("zh").start).toBe("启动");
    expect(uiCopy("en").update).toBe("Update");
    expect(uiCopy("zh").update).toBe("更新程序");
  });

  it("covers every sidecar phase on the home page", () => {
    const phases = [
      "idle",
      "probing",
      "starting",
      "waiting",
      "ready",
      "attached",
      "updating",
      "error",
      "stopping",
    ];
    for (const locale of ["en", "zh"] as const) {
      for (const phase of phases) {
        expect(uiCopy(locale).detail[phase]).toBeTruthy();
      }
    }
  });
});
