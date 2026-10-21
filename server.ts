import { createServer, type Socket } from "node:net";
import { styleText } from "node:util";
import { watch } from "node:fs";
import { parseRange, parseRequest } from "./src/request.ts";
import {
  createFileResponse,
  resolvePublicPath,
  publicDir,
} from "./src/static-files.ts";
import { htmlResponse } from "./src/response.ts";
import { logRequest } from "./src/logger.ts";
import { respond, type Context } from "./src/router.ts";
import { getSongs, streamSong } from "./src/routes/songs.ts";
import { getSettings, saveSettings } from "./src/routes/settings.ts";

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
function streamEvents(ctx: Context) {
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

/** One route: which requests it answers, and the function that answers them. */
type Route = {
  method: string;
  path: string;
  handler: (ctx: Context) => void;
  prefix?: boolean; // match any path that starts with 'path'
};

/** Every route the server has. The first match wins; anything else is a static file. */
const routes: Route[] = [
  { method: "GET", path: "/events", handler: streamEvents },
  { method: "GET", path: "/api/settings", handler: getSettings },
  { method: "POST", path: "/api/settings", handler: saveSettings },
  { method: "GET", path: "/api/songs", handler: getSongs },
  { method: "GET", path: "/music/", handler: streamSong, prefix: true },
];

function handleRequest(socket: Socket, request: string) {
  const { method, path, headers, body } = parseRequest(request);

  const range = parseRange(headers.range);

  const ctx: Context = { socket, method, path, body, range };

  const route = routes.find(
    (r) =>
      r.method === method &&
      (r.prefix ? path.startsWith(r.path) : path === r.path),
  );

  if (route) return route.handler(ctx);

  const filePath = resolvePublicPath(path);

  // No safe path means the request tried to escape the public folder.
  if (!filePath) {
    return respond(
      ctx,
      htmlResponse("403 Forbidden", "<h1>403: Not allowed</h1>"),
    );
  }

  return respond(ctx, createFileResponse(filePath, range));
}

const server = createServer((socket) => {
  // Bytes received on this connection that haven't been handled yet.
  // A request can arrive in several pieces, so they're collected here.
  let received = Buffer.alloc(0);

  // Without this, one broken connection crashes the server.
  // EPIPE / ECONNRESET = the browser hung up early, which is normal.
  socket.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE" || error.code === "ECONNRESET") return;
    console.log(styleText("red", `connection error: ${error.message}`));
  });

  socket.on("data", (data: Buffer) => {
    received = Buffer.concat([received, data]);

    // No blank line yet: the headers aren't complete, so wait for more.
    const headersEnd = received.indexOf("\r\n\r\n");
    if (headersEnd === -1) return;

    // How many body bytes to expect (0 if there's no body, like a GET).
    const { headers } = parseRequest(received.toString());
    const contentLength = Number(headers["content-length"] ?? 0);
    const bodyStart = headersEnd + 4;

    // Body bytes so far vs. promised. Fewer: the rest is still on its way, so wait.
    if (received.length - bodyStart < contentLength) return;

    handleRequest(socket, received.toString());
    received = Buffer.alloc(0);
  });
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Listening on port 3000\n");
});
