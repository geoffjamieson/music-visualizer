import { createServer, type Socket } from "node:net";
import { styleText } from "node:util";
import { statSync, watch } from "node:fs";
import { parseRange, parseRequest } from "./src/request.ts";
import {
  createFileResponse,
  resolvePublicPath,
  publicDir,
} from "./src/static-files.ts";
import {
  htmlResponse,
  jsonResponse,
  sendResponse,
  type HttpResponse,
} from "./src/response.ts";
import { logRequest } from "./src/logger.ts";

const reloadClients = new Set<Socket>();

// Debounce: a burst of file events sends only one reload
let reloadTimer: ReturnType<typeof setTimeout> | undefined;

watch(publicDir, () => {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const socket of reloadClients) {
      socket.write("data: reload\n\n");
    }
  }, 100);
});

function handleRequest(socket: Socket, request: string) {
  const { method, path, headers, body } = parseRequest(request);

  const range = parseRange(headers.range);

  let response: HttpResponse;

  // Route GET /events: live reload. Keep this connection open and send reload messages down it later.
  if (method === "GET" && path === "/events") {
    const responseHeaders =
      "HTTP/1.1 200 OK\r\n" +
      "Content-Type: text/event-stream\r\n" +
      "Cache-Control: no-cache\r\n" +
      "\r\n";
    logRequest(method, path, "200 OK");
    socket.write(responseHeaders);

    // Remember this connection so the watcher can message it later.
    reloadClients.add(socket);

    // Forget it when the browser disconnects (tab closed, page reloaded).
    socket.on("close", () => reloadClients.delete(socket));

    // Stop here: no body and no socket.end(), so the connection stays open.
    return;
  }

  // Route POST /api/settings: the page sends the music folder path here, as JSON.
  if (method === "POST" && path === "/api/settings") {
    let data;

    try {
      data = JSON.parse(body);
    } catch {
      // Not valid JSON: answer 400 instead of letting JSON.parse crash the server.
      const response = jsonResponse("400 Bad Request", {
        error: "Body must be JSON",
      });
      logRequest(method, path, response.status);
      sendResponse(socket, response);
      return;
    }

    const musicDir = data?.musicDir;

    if (typeof musicDir !== "string") {
      const response = jsonResponse("400 Bad Request", {
        error: "musicDir must be a string",
      });
      logRequest(method, path, response.status);
      sendResponse(socket, response);
      return;
    }

    const stats = statSync(musicDir, { throwIfNoEntry: false });

    if (!stats || !stats.isDirectory()) {
      const response = jsonResponse("400 Bad Request", {
        error: "musicDir must be an existing folder",
      });
      logRequest(method, path, response.status);
      sendResponse(socket, response);
      return;
    }

    const response = jsonResponse("200 OK", { ok: true, musicDir });
    logRequest(method, path, response.status);
    sendResponse(socket, response);
    return;
  }

  const filePath = resolvePublicPath(path);

  // No safe path means the request tried to escape the public folder.
  if (!filePath) {
    response = htmlResponse("403 Forbidden", "<h1>403: Not allowed</h1>");
  } else {
    response = createFileResponse(filePath, range);
  }

  logRequest(method, path, response.status);
  sendResponse(socket, response);
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
