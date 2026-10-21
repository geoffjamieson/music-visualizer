import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** What POST /api/settings accepts, and what config.json stores. */
export type Settings = { musicDir: string };

/** Settings file in the project root (gitignored, since the path is specific to this computer). */
const configPath = resolve(import.meta.dirname, "..", "config.json");

/** The saved music folder, or undefined if none is set yet. MUSIC_DIR overrides it. */
function loadMusicDir(): string | undefined {
  // MUSIC_DIR (set when starting the server) wins.
  if (process.env.MUSIC_DIR) return process.env.MUSIC_DIR;

  // Otherwise, use the folder saved in config.json.
  try {
    const settings: Partial<Settings> = JSON.parse(
      readFileSync(configPath, "utf8"),
    );
    return settings.musicDir;
  } catch {
    // No config.json yet (first run), so no folder is set.
    return undefined;
  }
}

/** Save the music folder to config.json. */
function saveMusicDir(musicDir: string) {
  const settings: Settings = { musicDir };

  writeFileSync(configPath, JSON.stringify(settings, null, 2));
}

/** The current music folder. Private: read it with getMusicDir, change it with setMusicDir. */
let musicDir = loadMusicDir();

/** The music folder in use, or undefined if none is set yet. */
export function getMusicDir() {
  return musicDir;
}

/** Change the music folder: saves it to config.json and uses it right away. */
export function setMusicDir(dir: string) {
  saveMusicDir(dir);
  musicDir = dir;
}
