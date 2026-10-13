import { resolve, sep } from "node:path";

/** Absolute path to the folder we serve files from (one level up from src/). */
const publicDir = resolve(import.meta.dirname, "..", "public");

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
