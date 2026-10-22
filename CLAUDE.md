# music-visualizer: notes for Claude

## How we work

- I'm a front-end dev (Vue, TS, React) learning how things work under the hood. I write the code; you review and teach.
- **Read my current files (and `git diff`) before giving advice.** Never assume where I am.
- Don't give me the answer unless I ask for help. Hints first.
- Problem first, then the solution. Give a short overview before starting something new.
- Keep it short. If I'm lost, slow down and go step by step; once I've got it, stop explaining.
- Comments are lean: the why, not the what. `/** */` doc comments on functions and state.
- You can edit comments and docs when I ask. Otherwise, don't edit my code.

## Project rules

- The server is raw TCP (`node:net`): no Express, no `node:http`. Node 22.18+ runs `.ts` directly.
- Stay in scope: a visualizer that can play music, not a library manager (see "Scope" in the README).
- Test on copies outside the project (a temp folder, a different port, `MUSIC_DIR` pointing at a fake library), not on my real setup.
- Music files and `config.json` never go in Git.
- One commit per idea. Stage specific files, never `git add .`.
- Don't create files in the project unless I ask.

## Where things are

- **Plan and progress:** the Status checklist in `README.md`. It's the single source of truth, so don't copy it here.
- Visualizer ideas: `IDEAS.md`. Design moodboard (for Milestone 4): https://www.figma.com/board/ZGndEYypaAB6N6I9R6F9wi/Music-Visualizer---Moodboard
- Port 3000 stuck? `lsof -ti :3000 | xargs kill`

## Workflow

One goal per session. Start with "let's do <goal>". When it's finished, I run `/done`, then clear.
