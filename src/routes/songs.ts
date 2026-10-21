import { extname } from "node:path";
import { jsonResponse } from "../response.ts";
import { listSongs, type Song } from "../library.ts";
import { respond, type Context } from "../router.ts";
import { getMusicDir } from "../settings.ts";
import {
  audioExtensions,
  resolveInside,
  createFileResponse,
} from "../static-files.ts";

/** GET /api/songs: every song in the music library, as JSON. */
export function getSongs(ctx: Context) {
  const musicDir = getMusicDir();

  if (!musicDir) {
    respond(
      ctx,
      jsonResponse("404 Not Found", {
        error: "No music folder set",
      }),
    );
    return;
  }

  let songs: Song[];

  try {
    songs = listSongs(musicDir);
  } catch {
    // The folder vanished or can't be read (moved, unplugged, no permission).
    respond(
      ctx,
      jsonResponse("500 Internal Server Error", {
        error: "Couldn't read the music folder",
      }),
    );
    return;
  }

  respond(ctx, jsonResponse("200 OK", songs));
}

/** GET /music/…: stream a song from the music library (audio files only, never outside the folder). */
export function streamSong(ctx: Context) {
  const musicDir = getMusicDir();

  if (!musicDir) {
    respond(
      ctx,
      jsonResponse("404 Not Found", {
        error: "No music folder set",
      }),
    );
    return;
  }

  // '/music/Two%20Weeks.mp3' → 'Two Weeks.mp3'
  let songPath: string;
  try {
    songPath = decodeURIComponent(ctx.path.slice("/music/".length));
  } catch {
    // Broken encoding like '%zz': answer 400 instead of crashing.
    respond(
      ctx,
      jsonResponse("400 Bad Request", {
        error: "Bad song path",
      }),
    );
    return;
  }

  if (!audioExtensions.includes(extname(songPath).toLowerCase())) {
    respond(
      ctx,
      jsonResponse("403 Forbidden", {
        error: "Not an audio file",
      }),
    );
    return;
  }

  const filePath = resolveInside(musicDir, songPath);

  // Tried to escape the library folder (e.g. '/music/../../.ssh/id_rsa').
  if (!filePath) {
    return respond(
      ctx,
      jsonResponse("403 Forbidden", { error: "Not allowed" }),
    );
  }

  respond(ctx, createFileResponse(filePath, ctx.range));
}
