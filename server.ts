import { createServer, type Socket } from "node:net";
import { styleText } from "node:util";
import { watch } from "node:fs";
import { parseRange, parseRequest } from "./src/request.ts";
import {
  createFileResponse,
  resolvePublicPath,
  publicDir,
} from "./src/static-files.ts";
import {
  htmlResponse,
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

const server = createServer((socket) => {
  // Without this, one broken connection crashes the server.
  // EPIPE / ECONNRESET = the browser hung up early, which is normal.
  socket.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE" || error.code === "ECONNRESET") return;
    console.log(styleText("red", `connection error: ${error.message}`));
  });

  socket.on("data", (data) => {
    const request = data.toString();
    const { method, path, headers } = parseRequest(request);

    const range = parseRange(headers.range);

    let response: HttpResponse;

    // Live reload: keep this connection open and send reload messages down it later.
    if (path === "/events") {
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

    const filePath = resolvePublicPath(path);

    // No safe path means the request tried to escape the public folder.
    if (!filePath) {
      response = htmlResponse("403 Forbidden", "<h1>403: Not allowed</h1>");
    } else {
      response = createFileResponse(filePath, range);
    }

    logRequest(method, path, response.status);
    sendResponse(socket, response);
  });
});

server.listen(3000, () => {
  console.log("Listening on port 3000\n");
});
