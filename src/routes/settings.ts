import { statSync } from "node:fs";
import { respond, type Context } from "../router.ts";
import { getMusicDir, setMusicDir } from "../settings.ts";
import { jsonResponse } from "../response.ts";

/** GET /api/settings: tells the page which music folder is set (or null). */
export function getSettings(ctx: Context) {
  const musicDir = getMusicDir();

  respond(ctx, jsonResponse("200 OK", { musicDir: musicDir ?? null }));
}

/** POST /api/settings: the page sends the music folder path here, as JSON. Validates and saves it. */
export function saveSettings(ctx: Context) {
  let data;

  try {
    data = JSON.parse(ctx.body);
  } catch {
    // Not valid JSON: answer 400 instead of letting JSON.parse crash the server.
    respond(
      ctx,
      jsonResponse("400 Bad Request", {
        error: "Body must be JSON",
      }),
    );
    return;
  }

  const requestedDir = data?.musicDir;

  if (typeof requestedDir !== "string") {
    respond(
      ctx,
      jsonResponse("400 Bad Request", {
        error: "musicDir must be a string",
      }),
    );
    return;
  }

  const stats = statSync(requestedDir, { throwIfNoEntry: false });

  if (!stats || !stats.isDirectory()) {
    respond(
      ctx,
      jsonResponse("400 Bad Request", {
        error: "musicDir must be an existing folder",
      }),
    );
    return;
  }

  setMusicDir(requestedDir);

  respond(
    ctx,
    jsonResponse("200 OK", {
      ok: true,
      musicDir: requestedDir,
    }),
  );
}
