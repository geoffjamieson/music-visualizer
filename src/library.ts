import { readdirSync } from "node:fs";
import { audioExtensions } from "./static-files.ts";
import { basename, extname, join, sep } from "node:path";
import { readTags } from "./tags.ts";

/** One song in the library, as the page sees it. */
export type Song = {
  title: string;
  artist: string;
  album: string;
  track?: number; // Missing when neither the tag nor the filename has one.
  path: string;
};

/** Build one song from its file: the ID3 tags first, the folder path where they're missing. */
function songFromFile(musicDir: string, file: string): Song {
  const tags = readTags(join(musicDir, file));

  // 'tottomori/Shoreline Mistward/16. Waiting dreams.flac' → artist, album, filename
  const parts = file.split(sep);

  // '16. Waiting dreams'
  const name = basename(file, extname(file));

  // parseInt reads the leading number: '1/3' → 1, '01' → 1, '16. Waiting dreams' → 16.
  // NaN when there's none ('live set …').
  const track = parseInt(tags.track ?? name);

  return {
    // Drop the leading track number: '16. Waiting dreams' → 'Waiting dreams'.
    title: tags.title ?? name.replace(/^\d+\.\s*/, ""),
    artist: tags.artist ?? parts[0],
    album: tags.album ?? parts[1],
    track: Number.isNaN(track) ? undefined : track,
    path: file,
  };
}

/** Every audio file in the music folder (including subfolders), sorted by path. */
export function listSongs(musicDir: string): Song[] {
  const files = readdirSync(musicDir, { recursive: true, encoding: "utf8" });

  return (
    files
      // Keep only audio files (same check as the /music/ route).
      .filter((file) => audioExtensions.includes(extname(file).toLowerCase()))
      // 'The Blue Nile/Hats/06. Seven A.M.mp3' → { title: 'Seven A.M', artist: 'The Blue Nile', … }
      .map((file) => songFromFile(musicDir, file))
      // Group by artist, then album, then track number.
      .sort((a, b) => a.path.localeCompare(b.path))
  );
}
