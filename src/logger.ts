import { styleText } from "node:util";

/** Any color or style name that `styleText` accepts, e.g. "green" or "bold". */
type Color = Parameters<typeof styleText>[0];

/** Log color for each status, keyed by the first digit of its code ("2" → 2xx). */
const statusColors: Record<string, Color> = {
  "2": "green",
  "3": "cyan",
  "4": "yellow",
  "5": "red",
};

/** Print one colored line per request, e.g. 'GET /song.mp3 -> 206 Partial Content'. */
export function logRequest(method: string, path: string, status: string) {
  const statusColor = statusColors[status[0]] ?? "white";
  console.log(styleText(statusColor, `${method} ${path} -> ${status}`));
}
