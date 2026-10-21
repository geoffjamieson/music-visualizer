import { jsonResponse } from "../response.ts";
import { listSongs, type Song } from "../library.ts";
import { respond, type Context } from "../router.ts";
import { getMusicDir } from "../settings.ts";

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
