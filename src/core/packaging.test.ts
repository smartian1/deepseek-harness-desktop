import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const yml = readFileSync(path.join(root, "electron-builder.yml"), "utf8");
const afterPack = readFileSync(path.join(root, "scripts", "after-pack.cjs"), "utf8");

describe("packaged sidecar runtime", () => {
  it("does not ask electron-builder to copy the top-level node_modules", () => {
    // app-builder-lib createFilter() returns false when relative === "node_modules".
    expect(yml).toMatch(/!node_modules\/\*\*/);
    expect(yml).not.toMatch(/from:\s*resources\/runtime\/node_modules/);
  });

  it("copies the sidecar tree in afterPack", () => {
    expect(yml).toMatch(/afterPack:\s*\.\/scripts\/after-pack\.cjs/);
    expect(afterPack).toContain("copySidecarModules");
    expect(afterPack).toContain("@deepseek-ai");
    expect(afterPack).toContain("robocopy");
  });
});
