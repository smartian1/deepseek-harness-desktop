import { describe, expect, it } from "vitest";
import {
  compareNpmVersions,
  overlayPackageManifest,
  packumentUrl,
  parseLatestFromPackument,
  parsePackageVersion,
  parseRuntimeStamp,
  pnpmInstallArgs,
  registryCandidates,
  shouldInstall,
} from "./update.js";

describe("registryCandidates", () => {
  it("uses an explicit npm registry only", () => {
    expect(registryCandidates({ npm_config_registry: "https://registry.npmmirror.com/" })).toEqual([
      "https://registry.npmmirror.com",
    ]);
  });

  it("falls back to npmjs then the China mirror", () => {
    expect(registryCandidates({})).toEqual([
      "https://registry.npmjs.org",
      "https://registry.npmmirror.com",
    ]);
  });
});

describe("packumentUrl", () => {
  it("encodes the scoped package name", () => {
    expect(packumentUrl("https://registry.npmjs.org", "@deepseek-ai/dsh")).toBe(
      "https://registry.npmjs.org/@deepseek-ai%2Fdsh",
    );
  });
});

describe("parseLatestFromPackument", () => {
  it("reads dist-tags.latest", () => {
    expect(parseLatestFromPackument({ "dist-tags": { latest: "0.1.0-rc.7" } })).toBe("0.1.0-rc.7");
  });

  it("accepts the abbreviated version field", () => {
    expect(parseLatestFromPackument({ version: "0.1.0" })).toBe("0.1.0");
  });
});

describe("parsePackageVersion", () => {
  it("reads package.json", () => {
    expect(parsePackageVersion('{"name":"@deepseek-ai/dsh","version":"0.1.0-rc.6"}')).toBe(
      "0.1.0-rc.6",
    );
  });
});

describe("parseRuntimeStamp", () => {
  it("reads the prepare-runtime stamp", () => {
    expect(parseRuntimeStamp('{"node":"22.23.2","dsh":"0.1.0-rc.6","pnpm":"10.15.1"}')).toEqual({
      node: "22.23.2",
      dsh: "0.1.0-rc.6",
      pnpm: "10.15.1",
    });
  });
});

describe("compareNpmVersions", () => {
  it("orders prereleases before the matching release", () => {
    expect(compareNpmVersions("0.1.0-rc.6", "0.1.0-rc.7")).toBeLessThan(0);
    expect(compareNpmVersions("0.1.0", "0.1.0-rc.9")).toBeGreaterThan(0);
    expect(compareNpmVersions("0.2.0-rc.1", "0.1.0")).toBeGreaterThan(0);
  });
});

describe("shouldInstall", () => {
  it("installs when missing or newer", () => {
    expect(shouldInstall(null, "0.1.0-rc.6")).toBe(true);
    expect(shouldInstall("0.1.0-rc.6", "0.1.0-rc.6")).toBe(false);
    expect(shouldInstall("0.1.0-rc.6", "0.1.0-rc.7")).toBe(true);
    expect(shouldInstall("0.1.0", "0.1.0-rc.7")).toBe(false);
  });
});

describe("overlayPackageManifest", () => {
  it("pins dsh and pnpm", () => {
    const manifest = JSON.parse(overlayPackageManifest("0.1.0-rc.7", "10.15.1")) as {
      dependencies: Record<string, string>;
    };
    expect(manifest.dependencies).toEqual({
      "@deepseek-ai/dsh": "0.1.0-rc.7",
      pnpm: "10.15.1",
    });
    expect(pnpmInstallArgs()).toEqual(["install", "--ignore-workspace"]);
  });
});
