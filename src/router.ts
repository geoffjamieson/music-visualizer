import type { Socket } from "node:net";
import type { parseRange } from "./request.ts";
import { sendResponse, type HttpResponse } from "./response.ts";
import { logRequest } from "./logger.ts";

/** One route: which requests it answers, and the function that answers them. */
export type Route = {
  method: string;
  path: string;
  handler: (ctx: Context) => void;
  prefix?: boolean; // match any path that starts with 'path'
};

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

/** The first route matching this method and path, or undefined (then it's a static file). */
export function findRoute(routes: Route[], method: string, path: string) {
  return routes.find(
    (r) =>
      r.method === method &&
      (r.prefix ? path.startsWith(r.path) : path === r.path),
  );
}
