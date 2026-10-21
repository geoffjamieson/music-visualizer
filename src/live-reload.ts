import type { Socket } from "node:net";
import { watch } from "node:fs";
import { publicDir } from "./static-files.ts";
import type { Context } from "./router.ts";
import { logRequest } from "./logger.ts";

const reloadClients = new Set<Socket>();

// Debounce: a burst of file events sends only one reload.
let reloadTimer: ReturnType<typeof setTimeout> | undefined;

watch(publicDir, () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const socket of reloadClients) {
      socket.write("data: reload\n\n");
    }
  }, 100);
});

/** GET /events: live reload. Keep this connection open and send reload messages down it later. */
export function streamEvents(ctx: Context) {
  const responseHeaders =
    "HTTP/1.1 200 OK\r\n" +
    "Content-Type: text/event-stream\r\n" +
    "Cache-Control: no-cache\r\n" +
    "\r\n";
  logRequest(ctx.method, ctx.path, "200 OK");
  ctx.socket.write(responseHeaders);

  // Remember this connection so the watcher can message it later.
  reloadClients.add(ctx.socket);

  // Forget it when the browser disconnects (tab closed, page reloaded).
  ctx.socket.on("close", () => reloadClients.delete(ctx.socket));

  // No socket.end(): the connection stays open for reload messages.
}
