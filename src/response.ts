import type { ReadStream } from "node:fs";
import type { Socket } from "node:net";

/** Everything needed to send a reply: decided first, then sent by the server. */
export type HttpResponse = {
  status: string;
  contentType: string;
  body: Buffer | ReadStream;
  contentLength: number;
  contentRange?: string; // only for 206 responses
};

/** Build a small HTML page response, e.g. for 403 and 404 errors. */
export function htmlResponse(status: string, html: string): HttpResponse {
  const body = Buffer.from(html);

  return {
    status,
    contentType: "text/html; charset=utf-8",
    body,
    contentLength: body.length,
  };
}

/** Write the status line, headers and body to the socket, then close it. */
export function sendResponse(socket: Socket, response: HttpResponse) {
  // Status line and headers, each ending in \r\n.
  // Accept-Ranges tells the browser it may ask for parts of files (enables seeking).
  let responseHeaders =
    `HTTP/1.1 ${response.status}\r\n` +
    `Content-Type: ${response.contentType}\r\n` +
    `Content-Length: ${response.contentLength}\r\n` +
    "Accept-Ranges: bytes\r\n";

  if (response.contentRange) {
    responseHeaders += `Content-Range: ${response.contentRange}\r\n`;
  }

  // Blank line = end of headers. Must come last, after every header.
  responseHeaders += "\r\n";

  // Headers go out first, as text.
  socket.write(responseHeaders);

  if (Buffer.isBuffer(response.body)) {
    // All the bytes are in hand: write them, then close.
    socket.write(response.body);
    socket.end();
  } else {
    // A stream: pipe sends each chunk as it's read, and closes the socket when the file ends.
    response.body.pipe(socket);
  }
}
