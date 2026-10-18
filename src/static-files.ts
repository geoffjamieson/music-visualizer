import { resolve, sep, extname } from "node:path";
import { readFileSync, statSync, createReadStream } from "node:fs";
import { parseRange } from "./request.ts";
import { htmlResponse, type HttpResponse } from "./response.ts";

/** Absolute path to the folder we serve files from (one level up from src/). */
export const publicDir = resolve(import.meta.dirname, "..", "public");

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

/** Injected into every HTML page so it reloads when a file in public/ changes. */
const reloadScript = `
    <script>
      const events = new EventSource("/events");
      events.addEventListener("message", () => location.reload());
    </script>
`;

/**
 * Join a relative path onto a folder.
 * Returns undefined if the result would end up outside it (e.g. '../server.ts').
 */
export function resolveInside(baseDir: string, relativePath: string) {
  const base = resolve(baseDir);

  // The "./" keeps it relative, so a leading "/" can't jump to the root of the disk.
  const fullPath = resolve(base, `./${relativePath}`);

  // Refuse anything that ends up outside the folder.
  if (!fullPath.startsWith(base + sep)) return undefined;

  return fullPath;
}

/**
 * Turn a URL path into a full file path inside the public folder.
 * Returns undefined if the path would end up outside it (e.g. '/../server.ts').
 */
export function resolvePublicPath(path: string) {
  // '/' → 'public/index.html'
  if (path === "/") {
    return resolveInside(publicDir, "index.html");
  }

  // '/style.css' → 'public/style.css'
  if (path.includes(".")) {
    return resolveInside(publicDir, path);
  }

  // '/about' → 'public/about.html'
  return resolveInside(publicDir, `${path}.html`);
}

/**
 * Build a file's response: 206 if a range was asked for, 200 otherwise.
 * HTML is read whole (to inject the reload script); everything else is streamed.
 * Returns a 404 page if the file can't be found.
 */
export function createFileResponse(
  filePath: string,
  range: ReturnType<typeof parseRange>,
): HttpResponse {
  try {
    const contentType =
      contentTypes[extname(filePath)] ?? "application/octet-stream";

    // HTML: read the whole page so the reload script can be injected.
    if (extname(filePath) === ".html") {
      const html = readFileSync(filePath).toString();
      const body = Buffer.from(
        html.replace("</body>", `${reloadScript}</body>`),
      );

      return {
        status: "200 OK",
        contentType,
        body,
        contentLength: body.length,
      };
    }

    // Everything else gets streamed: get the size without reading the file.
    const fileSize = statSync(filePath).size;

    // Range requested → send only those bytes (browsers do this for audio and video).
    if (range) {
      const start = range.start;

      // Starts past the last byte: nothing to send. Tell the client the real size.
      if (start >= fileSize) {
        return {
          ...htmlResponse(
            "416 Range Not Satisfiable",
            "<h1>416: Range not satisfiable</h1>",
          ),
          contentRange: `bytes */${fileSize}`,
        };
      }

      const lastByte = fileSize - 1;

      // No end given → go to the last byte.
      const requestedEnd = range.end ?? lastByte;

      // Never past the last byte, even if the client asks for more.
      const end = Math.min(requestedEnd, lastByte);

      return {
        status: "206 Partial Content",
        contentType,
        // Reads only these bytes. Its end is inclusive, like HTTP ranges, so no +1.
        body: createReadStream(filePath, { start, end }),
        // Which bytes these are, out of the total: 'bytes 1000000-2578611/2578612'
        contentRange: `bytes ${start}-${end}/${fileSize}`,
        // Both ends count: bytes 0-99 is 100 bytes.
        contentLength: end - start + 1,
      };
    }

    // No range → send the whole file.
    return {
      status: "200 OK",
      contentType,
      body: createReadStream(filePath),
      contentLength: fileSize,
    };
  } catch {
    return htmlResponse("404 Not Found", "<h1>404: Nothing here</h1>");
  }
}
