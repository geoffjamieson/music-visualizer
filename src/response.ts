import type { Socket } from "node:net";

/** Everything needed to send a reply: decided first, then sent by the server. */
export type HttpResponse = {
  status: string;
  contentType: string;
  body: Buffer;
  contentRange?: string; // only for 206 responses
};

/** Build a small HTML page response, e.g. for 403 and 404 errors. */
export function htmlResponse(status: string, html: string): HttpResponse {
  return {
    status,
    contentType: "text/html; charset=utf-8",
    body: Buffer.from(html),
  };
}

/** Write the status line, headers and body to the socket, then close it. */
export function sendResponse(socket: Socket, response: HttpResponse) {
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

  // Headers go out as text, the body as raw bytes, then close the connection.
  socket.write(responseHeaders);
  socket.write(response.body);
  socket.end();
}
