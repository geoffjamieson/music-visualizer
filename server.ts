import { createServer } from "node:net";
import { styleText } from "node:util";
import { logRequest } from "./src/logger.ts";
import { parseRange, parseRequest } from "./src/request.ts";
import { createFileResponse, resolvePublicPath } from "./src/static-files.ts";
import { htmlResponse, type HttpResponse } from "./src/response.ts";

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

    // Status line and headers, each ending in \r\n.
    // Accept-Ranges tells the browser it may ask for parts of files (enables seeking).
    let responseHeaders =
      `HTTP/1.1 ${response.status}\r\n` +
      `Content-Type: ${response.contentType}\r\n` +
      `Content-Length: ${response.body.length}\r\n` +
      "Accept-Ranges: bytes\r\n";

    if (response.contentRange) {
      responseHeaders += `Content-Range: ${response.contentRange}\r\n`;
    }

    // Blank line = end of headers. Must come last, after every header.
    responseHeaders += "\r\n";

    logRequest(method, path, response.status);

    // Headers go out as text, the body as raw bytes, then close the connection.
    socket.write(responseHeaders);
    socket.write(response.body);
    socket.end();
  });
});

server.listen(3000, () => {
  console.log("Listening on port 3000\n");
});
