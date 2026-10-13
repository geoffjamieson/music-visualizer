import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { styleText } from "node:util";
import { logRequest } from "./src/logger.ts";
import { parseRange, parseRequest } from "./src/request.ts";

// File extension → Content-Type label sent to the browser.
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
};

// Absolute path to the folder we serve files from.
const publicDir = resolve(import.meta.dirname, "public");

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
    let status: string;
    let body: Buffer;
    let contentType: string;
    let contentRange: string | undefined; // only set for 206 responses
    let filePath: string;

    // Turn the URL path into a full file path inside public.
    // The "." makes the path relative, so resolve keeps publicDir in front.
    if (path === "/") {
      // '/' → 'public/index.html'
      filePath = resolve(publicDir, "index.html");
    } else if (path.includes(".")) {
      // '/style.css' → 'public/style.css'
      filePath = resolve(publicDir, `.${path}`);
    } else {
      // '/about' → 'public/about.html'
      filePath = resolve(publicDir, `.${path}.html`);
    }

    // Refuse any path that ends up outside the public folder (e.g. '/../server.ts').
    if (!filePath.startsWith(publicDir + sep)) {
      status = "403 Forbidden";
      body = Buffer.from("<h1>403: Not allowed</h1>");
      contentType = contentTypes[".html"];
    } else {
      // Read the file as raw bytes; if it doesn't exist, send a 404.
      try {
        const file = readFileSync(filePath);
        contentType =
          contentTypes[extname(filePath)] ?? "application/octet-stream";

        // Range requested: send only those bytes as 206 Partial Content.
        // Works for any file type; browsers just use it mostly for audio and video.
        // No Range header: send the whole file as 200 OK.
        if (range) {
          status = "206 Partial Content";

          // No end given → go to the last byte (positions start at 0).
          const start = range.start;
          const end = range.end ?? file.length - 1;

          // subarray stops *before* its second argument, so +1 keeps the last byte.
          body = file.subarray(start, end + 1);

          // Tells the browser which bytes it got and the full size: 'bytes 1000000-2578611/2578612'
          contentRange = `bytes ${start}-${end}/${file.length}`;
        } else {
          status = "200 OK";
          body = file;
        }
      } catch (error) {
        status = "404 Not Found";
        body = Buffer.from("<h1>404: Nothing here</h1>");
        contentType = contentTypes[".html"];
      }
    }

    // ---- Send the response ----

    // Status line and headers, each ending in \r\n.
    // Accept-Ranges tells the browser it may ask for parts of files (enables seeking).
    let responseHeaders =
      `HTTP/1.1 ${status}\r\n` +
      `Content-Type: ${contentType}\r\n` +
      `Content-Length: ${body.length}\r\n` +
      "Accept-Ranges: bytes\r\n";

    if (contentRange) {
      responseHeaders += `Content-Range: ${contentRange}\r\n`;
    }

    // Blank line = end of headers. Must come last, after every header.
    responseHeaders += "\r\n";

    logRequest(method, path, status);

    // Headers go out as text, the body as raw bytes, then close the connection.
    socket.write(responseHeaders);
    socket.write(body);
    socket.end();
  });
});

server.listen(3000, () => {
  console.log("Listening on port 3000\n");
});
