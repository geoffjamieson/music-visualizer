import { readdirSync } from "node:fs";
import { audioExtensions } from "./static-files.ts";
import { basename, extname } from "node:path";

/** One song in the library, as the page sees it. */
export type Song = {
  title: string;
  path: string;
};

/** Every audio file in the music folder (including subfolders), sorted by path. */
export function listSongs(musicDir: string): Song[] {
  const files = readdirSync(musicDir, { recursive: true, encoding: "utf8" });

  return (
    files
      // Keep only audio files (same check as the /music/ route).
      .filter((file) => audioExtensions.includes(extname(file).toLowerCase()))
      // 'The Blue Nile/Hats/06. Seven A.M.mp3' → { title: '06. Seven A.M', path: '…' }
      .map((file) => ({ title: basename(file, extname(file)), path: file }))
      // Group by artist, then album, then track number.
      .sort((a, b) => a.path.localeCompare(b.path))
  );
}
