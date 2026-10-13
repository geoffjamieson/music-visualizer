/**
 * Turn raw request text into { method, path, version, headers }.
 * Header names are lowercased, so 'Range' is found as headers.range.
 */
export function parseRequest(request: string) {
  const lines = request.split("\r\n");

  // First line: 'GET /song.mp3 HTTP/1.1' → method, path, version.
  const firstLine = lines[0];
  const [method, path, version] = firstLine.split(" ");

  // Every line after the first is a header: 'Range: bytes=0-' → { range: "bytes=0-" }
  const headers: Record<string, string> = {};

  for (const line of lines.slice(1)) {
    if (line === "") break;

    // split at the FIRST ': ' only. Values can contain colons, e.g. 'Host: localhost:3000'
    const separator = line.indexOf(": ");
    const name = line.slice(0, separator).toLowerCase();
    const value = line.slice(separator + 2);

    headers[name] = value;
  }

  return { method, path, version, headers };
}

/**
 * Turn a Range header value like 'bytes=1000000-' into { start, end }.
 * Returns undefined when there's no Range header.
 */
export function parseRange(rangeHeader: string | undefined) {
  if (!rangeHeader) {
    return undefined;
  }

  // 'bytes=1000000-' → '1000000-' → start '1000000', end ''
  const [, byteRange] = rangeHeader.split("=");
  const [startingBytes, endingBytes] = byteRange.split("-");

  const start = Number(startingBytes);
  // An empty end means "to the end of the file" (Number("") would wrongly give 0).
  const end = endingBytes === "" ? undefined : Number(endingBytes);

  return { start, end };
}
