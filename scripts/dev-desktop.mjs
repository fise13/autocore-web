#!/usr/bin/env node
/**
 * Starts Next.js for Tauri dev, or reuses an existing server on port 3000.
 */
import { spawn } from "node:child_process";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

if (await isPortOpen(PORT)) {
  console.log(`[dev:desktop] Reusing Next.js on http://127.0.0.1:${PORT}`);
  process.exit(0);
}

console.log(`[dev:desktop] Starting Next.js on port ${PORT}`);

const child = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
