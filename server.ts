import { createServer } from "node:net";
import { styleText } from "node:util";
import { parseRange, parseRequest } from "./src/request.ts";
import { createFileResponse, resolvePublicPath } from "./src/static-files.ts";
import {
  htmlResponse,
  sendResponse,
  type HttpResponse,
} from "./src/response.ts";
import { logRequest } from "./src/logger.ts";

const server = createServer((socket) => {
  // Handle errors on this connection so one broken connection can't crash the whole server.
  // EPIPE / ECONNRESET mean the browser hung up mid-response (e.g. it only needed the start
  // of a song, or you skipped ahead). That's normal, so ignore it; log anything else.
  socket.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE" || error.code === "ECONNRESET") return;
    console.log(styleText("red", `connection error: ${error.message}`));
  });

  socket.on("data", (data) => {
    // ---- Parse the request ----

    // Turn the raw request text into method, path and headers.
    const request = data.toString();
    const { method, path, headers } = parseRequest(request);

    // Byte range the client asked for, or undefined if it wants the whole file.
    const range = parseRange(headers.range);

    // ---- Build the response ----
    let response: HttpResponse;

    const filePath = resolvePublicPath(path);

    // No safe path means the request tried to escape the public folder.
    if (!filePath) {
      response = htmlResponse("403 Forbidden", "<h1>403: Not allowed</h1>");
    } else {
      response = createFileResponse(filePath, range);
    }

    // ---- Send the response ----

    logRequest(method, path, response.status);
    sendResponse(socket, response);
  });
});

server.listen(3000, () => {
  console.log("Listening on port 3000\n");
});
