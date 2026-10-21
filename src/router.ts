import type { Socket } from "node:net";
import type { parseRange } from "./request.ts";
import { sendResponse, type HttpResponse } from "./response.ts";
import { logRequest } from "./logger.ts";

/** Everything a route handler needs to know about one request. */
export type Context = {
  socket: Socket;
  method: string;
  path: string;
  body: string;
  range: ReturnType<typeof parseRange>;
};

/** Log the request and send its response: the last step of every route. */
export function respond(ctx: Context, response: HttpResponse) {
  logRequest(ctx.method, ctx.path, response.status);
  sendResponse(ctx.socket, response);
}
