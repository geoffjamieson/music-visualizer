---
name: done
description: Wrap up the current goal: check the work, bring the README up to date, and commit. Run when Geoff says a goal is finished.
disable-model-invocation: true
---

# Wrap up a goal

Keep each step short.

1. **Check the work.** Read `git status` and `git diff`. Look for bugs, leftover debug code, and comments that no longer match the code. If the server changed, test it on a copy outside the project with curl. If something's wrong, say what and stop: Geoff fixes his own code.
2. **Bring the README up to date** so it matches the code:
   - Status checklist: tick the goal (⬜ → ✅), and reword it if what got built differs from the plan.
   - The API table, "What the server does" and "Running it", if any of them changed.
   - "What I learned": ask Geoff whether this goal taught him something worth a bullet, and write it in his voice.
3. **Update `CLAUDE.md`** only if a preference or project rule changed.
4. **Commit.** Stage specific files. Suggest a one-line message (imperative, says what changed), and separate commits if the goal held separate ideas. Commit once Geoff says yes.
5. **Next:** name the next unticked item in the checklist, and remind Geoff to clear the session.
