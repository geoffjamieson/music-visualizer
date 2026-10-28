# music-visualizer

A personal music player with a visualizer that reacts to the music, built from the ground up. The server is written on raw TCP sockets (Node's `node:net`), with no Express and no `node:http`, so every part of the stack is code I wrote and understand.

It started from my [tiny-http-server](https://github.com/geoffjamieson/tiny-http-server) project and grows from there.

## Status

Work in progress. The plan, in milestones:

1. **Static file server.** ✅ See tiny-http-server.
2. **Streaming audio.** ✅ MP3s play and seeking works, using HTTP range requests.
   - ✅ Refactor into `src/` modules (request parsing, static files, responses, logging)
   - ✅ Live reload with Server-Sent Events
   - ✅ Stream files with `createReadStream` instead of reading them whole
   - ✅ `416 Range Not Satisfiable` for ranges past the end of a file
3. **Music library.** In progress:
   - ✅ Read request bodies, including requests that arrive in several pieces
   - ✅ Setup page: ask where the music folder is, save it to `config.json` (`MUSIC_DIR` as a developer override)
   - ✅ Stream songs from that folder, with the same path-safety check as `public/`
   - ✅ `/api/songs`: list the library as JSON (recursively, through artist/album folders)
   - ✅ Refactor: a small hand-written router, with each route in its own file
   - ✅ A plain playlist page: one flat list sorted by artist, album and track; play, pause and seek with the browser's audio controls; previous, next, auto-advance and the current song in bold
   - ✅ Read title, artist, album and track from the files' ID3 tags, parsed by hand, with the folder names as a fallback (FLAC and M4A files have no ID3 tag)
   - ⬜ Small extras: shuffle and repeat
4. **The visualizer.** Web Audio analysis driving bars, meters and readouts, with a look inspired by 2000s music gadgets (think Winamp with its Milkdrop visualizer). Optional: a Winamp-style 10-band EQ. Ideas are collected in [IDEAS.md](IDEAS.md).
5. **Make it an app.** Wrap it in Electron: its own window, and a native folder picker for the music library. The folder will usually be a playlist (songs from many albums), so play it in the folder's own order (e.g. by file name) instead of re-sorting by artist, album and track.

Later: a multiplayer game over hand-written WebSockets, at which point the server gets pulled out into its own small framework.

## Scope

A visualizer that can play music, not a music library manager. In scope: pointing at a music folder, listing songs, basic playback controls, and the visualizer. Out of scope (that's what Swinsian is for): saved playlists, ratings, play counts, search, tag editing, album art browsing, organising the library.

## Running it

Requires Node.js 22.18 or newer, which can run TypeScript files directly.

```bash
npm install
node --watch server.ts
```

Then open http://localhost:3000 and enter the path to your music folder (e.g. `/Users/you/Music/My Library`). It's saved to `config.json` (ignored by Git), so it's remembered next time.

To skip the setup page, set the folder when starting the server:

```bash
MUSIC_DIR="$HOME/Music/My Library" node --watch server.ts
```

No music is included in the repo; the server reads it straight from your folder.

## API

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/settings` | `{ "musicDir": "…" }`, or `null` if no folder is set |
| `POST` | `/api/settings` | Body `{ "musicDir": "…" }`. Saves it if it's an existing folder, otherwise `400` with `{ "error": "…" }` |
| `GET` | `/api/songs` | Every song in the library: `[{ "title": "…", "artist": "…", "album": "…", "track": 1, "path": "Artist/Album/Song.mp3" }]`. `track` is left out when there isn't one |
| `GET` | `/music/<path>` | Streams one song (supports ranges). `<path>` is a `path` from `/api/songs`, URL-encoded |
| `GET` | `/events` | Live reload stream (Server-Sent Events) |

Anything else is served from `public/`.

## What the server does

- Parses raw HTTP requests by hand (method, path, headers, body), and waits for the whole request even when it arrives in several pieces
- Routes requests with a small hand-written router: a table of method + path → handler, with prefix matching for `/music/…`
- Reads each song's title, artist, album and track from its **ID3v2 tag** by hand: only the tag's bytes are read from disk, never the audio, and text is decoded as latin1, UTF-16 or UTF-8 as the tag says
- A JSON API with input validation: bad input gets a `400` with a message instead of crashing the server
- Serves files from `public`, with clean URLs (`/about` → `about.html`)
- Sets `Content-Type` from the file extension and sends files as raw bytes
- Supports **range requests**: reads the `Range` header and answers `206 Partial Content` with just the requested bytes, plus `Content-Range` and `Accept-Ranges`, so audio seeking works
- **Streams** files in chunks with `createReadStream`, so a song is never loaded into memory whole
- **Live reload**: watches `public/`, injects a small script into every HTML page, and tells open pages to reload over Server-Sent Events
- Blocks path traversal (`/../server.ts` gets a `403 Forbidden`), in `public/` and in the music folder alike
- Serves only audio files from the music folder, and decodes URL-encoded paths (`%20` → space) before checking them
- Listens on `127.0.0.1` only, so other devices on the network can't reach it
- Survives clients hanging up mid-response instead of crashing
- Logs one color-coded line per request, e.g. `GET /song.mp3 -> 206 Partial Content`

## What I learned

- **Seeking needs range requests.** Audio players ask for parts of a file with a header like `Range: bytes=1000000-`. If the server ignores it and always answers `200 OK` with the whole file, the browser won't let you skip around.
- **Ranges are inclusive.** `bytes=0-99` means 100 bytes including byte 99, so the length is `end - start + 1`. `createReadStream`'s `end` is inclusive too, but `Buffer.subarray`'s isn't.
- **`Number("")` is `0`, not "nothing".** An empty end in `bytes=1000000-` means "to the end of the file" and has to be handled separately.
- **Browsers hang up constantly.** An `<audio>` tag fetches the start of a song to learn its length, then closes the connection. Without an `error` handler on the socket, that `EPIPE` error crashes the server.
- **Git history is permanent until you rewrite it.** Deleting a file in a new commit doesn't remove it from old ones; `git filter-repo` does, and it's only safe before pushing.
- **A response doesn't have to end.** Server-Sent Events are a normal HTTP response that never closes: the server keeps the socket and writes `data: ...` messages down it whenever it wants.
- **TCP doesn't keep messages in one piece.** A request can arrive split across several `data` events. `Content-Length` is how the server knows when it has the whole body.
- **Never trust the input.** One `JSON.parse("hello")` without a `try` took the whole server down. Every request body gets checked before it's used.
- **Decode, then check.** `%2F` is an encoded `/`, so `..%2F` only becomes an escape attempt after decoding. The path-safety check has to run on the decoded path.
- **An imported variable is read-only.** To share state that changes (the music folder), one module owns it and exposes `getMusicDir` / `setMusicDir`, like a tiny store.
- **Types vanish at runtime.** Node strips TypeScript types before running, so importing a type needs `import type`, or Node looks for an export that doesn't exist.
- **Bytes don't explain themselves.** The same byte can be a number, a letter or part of a size, depending on where it sits. A position (`pos + 4`) and the value at that position (`buf[pos + 4]`) are easy to mix up.
- **Text needs an encoding.** `"2/2"` can be 3 bytes (latin1) or 8 (UTF-16 with a byte order mark). Decode it the wrong way and you get `ÿþ2 / 2`.
- **You don't have to read the whole file.** `openSync` + `readSync` read just the 66 KB tag at the start of a 7 MB song, and `try / finally` makes sure the file is closed on every way out, even an early `return`.
