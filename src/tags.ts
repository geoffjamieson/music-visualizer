/*
 * Reads song info from the ID3v2 tag at the start of an MP3, parsed by hand.
 *
 * Tag header (10 bytes)
 * 0–2    "ID3" (no tag if missing)
 * 3–5    Version, revision, flags (ignored)
 * 6–9    Size of the frames that follow (syncsafe)
 *
 * Each frame (10-byte header, then the content)
 * 0–3    ID, e.g. "TIT2"
 * 4–7    Size of the content
 * 8–9    Flags (ignored)
 * 10…    Content. For text frames: 1 encoding byte, then the text.
 */

import { openSync, readSync, closeSync } from "node:fs";

/** What we read from a song's ID3 tag. Any field can be missing. */
export type Tags = {
  title?: string;
  artist?: string;
  album?: string;
  track?: string;
};

/** The frames we want, and which Tags field each one fills. */
const wantedFrames: Record<string, keyof Tags> = {
  TIT2: "title",
  TPE1: "artist",
  TALB: "album",
  TRCK: "track",
};

/**
 * Decode a text frame's content, from its encoding byte up to `end`.
 * Encoding 2 (UTF-16 without a BOM) is rare and Node can't decode it, so it
 * falls back to latin1 like any unknown encoding.
 */
function readText(buf: Buffer, start: number, end: number): string {
  const encoding = buf[start];

  // UTF-16 text starts with a 2-byte BOM (255 254) that isn't part of the text.
  if (encoding === 1) return buf.toString("utf16le", start + 3, end);
  if (encoding === 3) return buf.toString("utf8", start + 1, end);
  return buf.toString("latin1", start + 1, end);
}

/** Read the title, artist, album and track from an MP3's ID3 tag. */
export function readTags(path: string): Tags {
  const fd = openSync(path, "r");

  // finally closes the file on every way out: early return, error or the end.
  try {
    const header = Buffer.alloc(10);
    readSync(fd, header, 0, 10, 0);

    if (header.toString("latin1", 0, 3) !== "ID3") return {};

    // Syncsafe: each byte uses only its low 7 bits, so this is base 128. It
    // keeps 0xFF out of the size, so players can't mistake it for audio.
    const tagSize =
      header[6] * 128 ** 3 + header[7] * 128 ** 2 + header[8] * 128 + header[9];
    const audioStart = 10 + tagSize;

    // Read only up to the audio, header included, so frames start at 10.
    const tag = Buffer.alloc(audioStart);
    readSync(fd, tag, 0, audioStart, 0);

    const tags: Tags = {};
    let pos = 10;

    while (pos < audioStart) {
      // A zero byte where an ID should be means padding: no more frames.
      if (tag[pos] === 0) break;

      const id = tag.toString("latin1", pos, pos + 4);
      // Plain base 256 in ID3v2.3. (ID3v2.4 makes this syncsafe too.)
      const size =
        tag[pos + 4] * 256 ** 3 +
        tag[pos + 5] * 256 ** 2 +
        tag[pos + 6] * 256 +
        tag[pos + 7];
      const contentStart = pos + 10;
      const contentEnd = contentStart + size;

      if (id in wantedFrames) {
        tags[wantedFrames[id]] = readText(tag, contentStart, contentEnd);
      }

      pos = contentEnd;
    }

    return tags;
  } finally {
    closeSync(fd);
  }
}
