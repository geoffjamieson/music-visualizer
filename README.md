# music-visualizer

A personal music player with a visualizer that reacts to the music, built from the ground up. The server is written on raw TCP sockets (Node's `node:net`), with no Express and no `node:http`, so every part of the stack is code I wrote and understand.

It started from my [tiny-http-server](https://github.com/geoffjamieson/tiny-http-server) project and grows from there.

## Status

Work in progress. The plan, in milestones:

1. **Static file server.** ✅ See tiny-http-server.
2. **Streaming audio.** ✅ MP3s play and seeking works, using HTTP range requests.
3. **Music API.** Next: a `/api/songs` endpoint that lists a music folder as JSON, shown as a playlist.
4. **The visualizer.** Web Audio analysis driving a Three.js scene, with a look inspired by 2000s music gadgets.

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
- Blocks path traversal (`/../server.ts` gets a `403 Forbidden`)
- Survives clients hanging up mid-response instead of crashing
- Logs one color-coded line per request, e.g. `GET /song.mp3 -> 206 Partial Content`

## What I learned

- **Seeking needs range requests.** Audio players ask for parts of a file with a header like `Range: bytes=1000000-`. If the server ignores it and always answers `200 OK` with the whole file, the browser won't let you skip around.
- **Ranges are inclusive, slices aren't.** `bytes=0-99` means 100 bytes including byte 99, but `Buffer.subarray(0, 99)` stops before 99, so the slice needs `end + 1`.
- **`Number("")` is `0`, not "nothing".** An empty end in `bytes=1000000-` means "to the end of the file" and has to be handled separately.
- **Browsers hang up constantly.** An `<audio>` tag fetches the start of a song to learn its length, then closes the connection. Without an `error` handler on the socket, that `EPIPE` error crashes the server.
- **Git history is permanent until you rewrite it.** Deleting a file in a new commit doesn't remove it from old ones; `git filter-repo` does, and it's only safe before pushing.
