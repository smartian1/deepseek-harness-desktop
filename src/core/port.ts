import net from "node:net";

export function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function choosePort(
  preferred: number,
  host: string,
  limit: number,
): Promise<number> {
  for (let offset = 0; offset < limit; offset += 1) {
    const port = preferred + offset;
    if (await isPortFree(port, host)) return port;
  }
  throw new Error(`No free port in ${preferred}–${preferred + limit - 1} on ${host}`);
}
