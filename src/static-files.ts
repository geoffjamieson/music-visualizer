import { resolve, sep, extname } from "node:path";
import { readFileSync } from "node:fs";
import { parseRange } from "./request.ts";
import { htmlResponse, type HttpResponse } from "./response.ts";

/** Absolute path to the folder we serve files from (one level up from src/). */
const publicDir = resolve(import.meta.dirname, "..", "public");

/** File extension → Content-Type label sent to the browser. */
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

/**
 * Turn a URL path into a full file path inside the public folder.
 * Returns undefined if the path would end up outside it (e.g. '/../server.ts').
 */
export function resolvePublicPath(path: string) {
  let filePath: string;

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

  // Refuse any path that ends up outside the public folder.
  if (!filePath.startsWith(publicDir + sep)) {
    return undefined;
  }

  return filePath;
}

/**
 * Read a file and build its response: 206 if a range was asked for, 200 otherwise.
 * Returns a 404 page if the file can't be read.
 */
export function createFileResponse(
  filePath: string,
  range: ReturnType<typeof parseRange>,
): HttpResponse {
  try {
    const file = readFileSync(filePath);

    const contentType =
      contentTypes[extname(filePath)] ?? "application/octet-stream";

    // Range requested → send only those bytes (browsers do this for audio and video).
    if (range) {
      // No end given → go to the last byte (positions start at 0).
      const start = range.start;
      const end = range.end ?? file.length - 1;

      return {
        status: "206 Partial Content",
        contentType,
        // subarray stops *before* its second argument, so +1 keeps the last byte.
        body: file.subarray(start, end + 1),
        // Which bytes these are, out of the total: 'bytes 1000000-2578611/2578612'
        contentRange: `bytes ${start}-${end}/${file.length}`,
      };
    }

    // No range → send the whole file.
    return { status: "200 OK", contentType, body: file };
  } catch {
    return htmlResponse("404 Not Found", "<h1>404: Nothing here</h1>");
  }
}
