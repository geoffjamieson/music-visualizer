import { styleText } from "node:util";

// Any color name styleText accepts.
type Color = Parameters<typeof styleText>[0];

// First digit of the status code → log color (2xx ok, 3xx redirect, 4xx bad request, 5xx server error).
const statusColors: Record<string, Color> = {
  "2": "green",
  "3": "cyan",
  "4": "yellow",
  "5": "red",
};

// Log one colored line per request, e.g. 'GET /FML.mp3 -> 206 Partial Content'.
export function logRequest(method: string, path: string, status: string) {
  const statusColor = statusColors[status[0]] ?? "white";
  console.log(styleText(statusColor, `${method} ${path} -> ${status}`));
}
