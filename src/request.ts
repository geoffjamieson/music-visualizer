// Turn a Range header like 'Range: bytes=1000000-' into { start, end }.
// Returns undefined when there's no Range header.
export function parseRange(rangeHeader: string | undefined) {
  if (!rangeHeader) {
    return undefined;
  }

  // 'Range: bytes=1000000-' → '1000000-' → start '1000000', end ''
  const [, byteRange] = rangeHeader.split("=");
  const [startingBytes, endingBytes] = byteRange.split("-");

  const start = Number(startingBytes);
  // An empty end means "to the end of the file" (Number("") would wrongly give 0).
  const end = endingBytes === "" ? undefined : Number(endingBytes);

  return { start, end };
}
