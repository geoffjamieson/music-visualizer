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
3. **Music library.** Next:
   - First-run setup: ask where the music folder is, save it to a config file (`MUSIC_DIR` as a developer override)
   - Stream songs from that folder, with the same path-safety check as `public/`
   - `/api/songs`: list the library as JSON (recursively, through artist/album folders)
   - Read titles, artists, albums etc. from the files' ID3 tags, parsed by hand
   - A plain playlist page: one flat list sorted by artist, album and track; play, pause, seek, next, previous
   - Small extras: shuffle and repeat
4. **The visualizer.** Web Audio analysis driving bars, meters and readouts, with a look inspired by 2000s music gadgets (think Winamp with its Milkdrop visualizer). Optional: a Winamp-style 10-band EQ. Ideas are collected in [IDEAS.md](IDEAS.md).
5. **Make it an app.** Wrap it in Electron: its own window, and a native folder picker for the music library.

Later: a multiplayer game over hand-written WebSockets, at which point the server gets pulled out into its own small framework.

## Scope

A visualizer that can play music, not a music library manager. In scope: pointing at a music folder, listing songs, basic playback controls, and the visualizer. Out of scope (that's what Swinsian is for): saved playlists, ratings, play counts, search, tag editing, album art browsing, organising the library.

## Running it

Requires Node.js 22.18 or newer, which can run TypeScript files directly.

```bash
npm install
node --watch server.ts
```

Then open http://localhost:3000.

Music files aren't included in the repo. To try playback, put an MP3 in the `public` folder and point the `<audio>` tag in `public/index.html` at it. Audio files in `public` are ignored by Git.

## What the server does

- Parses raw HTTP requests by hand (method, path, headers)
- Serves files from `public`, with clean URLs (`/about` → `about.html`)
- Sets `Content-Type` from the file extension and sends files as raw bytes
- Supports **range requests**: reads the `Range` header and answers `206 Partial Content` with just the requested bytes, plus `Content-Range` and `Accept-Ranges`, so audio seeking works
- **Streams** files in chunks with `createReadStream`, so a song is never loaded into memory whole
- **Live reload**: watches `public/`, injects a small script into every HTML page, and tells open pages to reload over Server-Sent Events
- Blocks path traversal (`/../server.ts` gets a `403 Forbidden`)
- Survives clients hanging up mid-response instead of crashing
- Logs one color-coded line per request, e.g. `GET /song.mp3 -> 206 Partial Content`

## What I learned

- **Seeking needs range requests.** Audio players ask for parts of a file with a header like `Range: bytes=1000000-`. If the server ignores it and always answers `200 OK` with the whole file, the browser won't let you skip around.
- **Ranges are inclusive.** `bytes=0-99` means 100 bytes including byte 99, so the length is `end - start + 1`. `createReadStream`'s `end` is inclusive too, but `Buffer.subarray`'s isn't.
- **`Number("")` is `0`, not "nothing".** An empty end in `bytes=1000000-` means "to the end of the file" and has to be handled separately.
- **Browsers hang up constantly.** An `<audio>` tag fetches the start of a song to learn its length, then closes the connection. Without an `error` handler on the socket, that `EPIPE` error crashes the server.
- **Git history is permanent until you rewrite it.** Deleting a file in a new commit doesn't remove it from old ones; `git filter-repo` does, and it's only safe before pushing.
- **A response doesn't have to end.** Server-Sent Events are a normal HTTP response that never closes: the server keeps the socket and writes `data: ...` messages down it whenever it wants.
