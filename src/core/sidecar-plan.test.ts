import { describe, expect, it } from "vitest";
import {
  buildSidecarArgs,
  buildSidecarEnv,
  canEnterHarness,
  isBenignNavigationError,
  isLoadingPageUrl,
  isLocalHarnessUrl,
  prependPath,
  shouldOpenHarnessUi,
} from "./sidecar-plan.js";

describe("buildSidecarArgs", () => {
  it("launches the official web alias on loopback", () => {
    expect(buildSidecarArgs("D:\\runtime\\dsh\\lib\\bin.js", "127.0.0.1", 3080)).toEqual([
      "D:\\runtime\\dsh\\lib\\bin.js",
      "web",
      "--host",
      "127.0.0.1",
      "--port",
      "3080",
    ]);
  });
});

describe("buildSidecarEnv", () => {
  it("sets DSH_HOME and prepends runtime bins", () => {
    const env = buildSidecarEnv({
      baseEnv: { PATH: "C:\\Windows\\System32", USERNAME: "gaoyang" },
      extraPathDirs: ["C:\\runtime\\node", "C:\\runtime\\node_modules\\.bin"],
      dshHome: "C:\\Users\\gaoyang\\.dsh",
      pathDelimiter: ";",
    });
    expect(env.DSH_HOME).toBe("C:\\Users\\gaoyang\\.dsh");
    expect(env.PATH).toBe(
      "C:\\runtime\\node;C:\\runtime\\node_modules\\.bin;C:\\Windows\\System32",
    );
    expect(env.USERNAME).toBe("gaoyang");
  });
});

describe("prependPath", () => {
  it("deduplicates entries", () => {
    expect(prependPath("a;b", ["a", "c"], ";")).toBe("a;c;b");
  });
});

describe("isBenignNavigationError", () => {
  it("recognizes Electron aborted loads", () => {
    expect(isBenignNavigationError(new Error("ERR_ABORTED (-3) loading 'file:///x'"))).toBe(true);
    expect(isBenignNavigationError(new Error("net::ERR_FAILED"))).toBe(false);
  });
});

describe("isLoadingPageUrl", () => {
  it("matches the packaged loading page", () => {
    expect(isLoadingPageUrl("file:///F:/code/deepseek-harness/resources/loading/index.html")).toBe(
      true,
    );
    expect(isLoadingPageUrl("http://127.0.0.1:3080/")).toBe(false);
  });
});

describe("shouldOpenHarnessUi", () => {
  it("stays on the home page until the user enters", () => {
    const ready = { phase: "ready", url: "http://127.0.0.1:3080" };
    expect(canEnterHarness(ready)).toBe(true);
    expect(shouldOpenHarnessUi(ready, false)).toBe(false);
    expect(shouldOpenHarnessUi(ready, true)).toBe(true);
    expect(shouldOpenHarnessUi({ phase: "waiting", url: null }, true)).toBe(false);
  });
});

describe("isLocalHarnessUrl", () => {
  it("allows loopback http", () => {
    expect(isLocalHarnessUrl("http://127.0.0.1:3080")).toBe(true);
    expect(isLocalHarnessUrl("http://localhost:3081/session")).toBe(true);
  });

  it("rejects remote or unknown schemes", () => {
    expect(isLocalHarnessUrl("https://example.com")).toBe(false);
    expect(isLocalHarnessUrl("file:///tmp/x")).toBe(false);
  });
});
