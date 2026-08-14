import net from "node:net";
import { describe, expect, it } from "vitest";
import { choosePort, isPortFree } from "./port.js";

function listen(port: number): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen({ port, host: "127.0.0.1", exclusive: true }, () => resolve(server));
    server.once("error", reject);
  });
}

function close(server: net.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

describe("choosePort", () => {
  it("returns the preferred port when it is free", async () => {
    const port = await choosePort(43180, "127.0.0.1", 5);
    expect(port).toBe(43180);
  });

  it("skips an occupied preferred port", async () => {
    const occupied = await listen(43190);
    try {
      const port = await choosePort(43190, "127.0.0.1", 5);
      expect(port).toBeGreaterThan(43190);
      expect(await isPortFree(43190, "127.0.0.1")).toBe(false);
    } finally {
      await close(occupied);
    }
  });
});
