import path from "node:path";
import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import {
  resolveBundledRuntimeRoot,
  resolveDshEntry,
  resolveDshHome,
  resolveNodeBinary,
  resolveOverlayRuntimeRoot,
  resolvePnpmBinDir,
  resolveRuntimeRoot,
  type PathContext,
} from "./paths.js";

const windowsCtx: PathContext = {
  packaged: true,
  resourcesPath: "C:\\App\\resources",
  projectRoot: "C:\\App\\resources\\app.asar",
  platform: "win32",
  env: {},
  userData: "C:\\Users\\gaoyang\\AppData\\Roaming\\DeepSeek Harness",
};

describe("resolveRuntimeRoot", () => {
  it("uses extraResources/runtime when packaged and no overlay exists", () => {
    expect(resolveBundledRuntimeRoot(windowsCtx)).toBe(path.join("C:\\App\\resources", "runtime"));
    expect(resolveRuntimeRoot(windowsCtx)).toBe(path.join("C:\\App\\resources", "runtime"));
  });

  it("uses project resources/runtime in development", () => {
    expect(
      resolveRuntimeRoot({
        ...windowsCtx,
        packaged: false,
        projectRoot: "F:\\code\\deepseek-harness",
      }),
    ).toBe(path.join("F:\\code\\deepseek-harness", "resources", "runtime"));
  });

  it("prefers a complete userData overlay", () => {
    const userData = mkdtempSync(path.join(os.tmpdir(), "dsh-overlay-"));
    const entry = path.join(
      userData,
      "runtime",
      "node_modules",
      "@deepseek-ai",
      "dsh",
      "lib",
      "bin.js",
    );
    mkdirSync(path.dirname(entry), { recursive: true });
    writeFileSync(entry, "ok\n");
    const ctx = { ...windowsCtx, userData };
    expect(resolveOverlayRuntimeRoot(ctx)).toBe(path.join(userData, "runtime"));
    expect(resolveRuntimeRoot(ctx)).toBe(path.join(userData, "runtime"));
    expect(resolveDshEntry(ctx)).toBe(entry);
    expect(resolveNodeBinary(ctx)).toBe(path.join("C:\\App\\resources", "runtime", "node", "node.exe"));
  });
});

describe("resolveNodeBinary", () => {
  it("prefers DSH_NODE_PATH", () => {
    expect(
      resolveNodeBinary({
        ...windowsCtx,
        env: { DSH_NODE_PATH: "D:\\custom\\node.exe" },
      }),
    ).toBe("D:\\custom\\node.exe");
  });

  it("points at the bundled Windows binary", () => {
    expect(resolveNodeBinary(windowsCtx)).toBe(
      path.join("C:\\App\\resources", "runtime", "node", "node.exe"),
    );
  });

  it("points at the bundled unix binary", () => {
    expect(
      resolveNodeBinary({
        ...windowsCtx,
        platform: "linux",
        resourcesPath: "/opt/app/resources",
      }),
    ).toBe(path.join("/opt/app/resources", "runtime", "node", "bin", "node"));
  });
});

describe("resolveDshEntry", () => {
  it("resolves the published CLI entry", () => {
    expect(resolveDshEntry(windowsCtx)).toBe(
      path.join(
        "C:\\App\\resources",
        "runtime",
        "node_modules",
        "@deepseek-ai",
        "dsh",
        "lib",
        "bin.js",
      ),
    );
  });
});

describe("resolvePnpmBinDir", () => {
  it("exposes runtime node_modules/.bin so dsh plugin can find pnpm", () => {
    expect(resolvePnpmBinDir(windowsCtx)).toBe(
      path.join("C:\\App\\resources", "runtime", "node_modules", ".bin"),
    );
  });
});

describe("resolveDshHome", () => {
  it("uses the official ~/.dsh default", () => {
    expect(resolveDshHome({}, "C:\\Users\\gaoyang")).toBe(path.join("C:\\Users\\gaoyang", ".dsh"));
  });

  it("honors DSH_HOME", () => {
    expect(resolveDshHome({ DSH_HOME: "E:\\dsh-home" }, "C:\\Users\\gaoyang")).toBe("E:\\dsh-home");
  });
});
