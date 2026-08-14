import http from "node:http";
import { describe, expect, it } from "vitest";
import { probeLocal } from "./probe.js";

function serve(body: string, status = 200): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("failed to bind"));
        return;
      }
      resolve({
        port: address.port,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
    server.once("error", reject);
  });
}

describe("probeLocal", () => {
  it("detects a DeepSeek Harness page", async () => {
    const server = await serve("<!doctype html><title>DeepSeek Harness</title>");
    try {
      await expect(probeLocal("127.0.0.1", server.port)).resolves.toMatchObject({
        kind: "dsh",
      });
    } finally {
      await server.close();
    }
  });

  it("flags a foreign occupant", async () => {
    const server = await serve("<title>Other</title>");
    try {
      await expect(probeLocal("127.0.0.1", server.port)).resolves.toEqual({
        kind: "other",
        status: 200,
      });
    } finally {
      await server.close();
    }
  });

  it("treats connection refused as empty", async () => {
    await expect(probeLocal("127.0.0.1", 1, 200)).resolves.toEqual({ kind: "empty" });
  });
});
