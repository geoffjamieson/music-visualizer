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
