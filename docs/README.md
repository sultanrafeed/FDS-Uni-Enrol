# UniEnroll Learning Coach

An iPhone-friendly study app (installable web app) for the UTS 32555 University Enrolment System,
Cmp1-07 Group 3. It lives only in this `docs/` folder and **does not change the project code**.

## Publish on GitHub Pages
1. Repository **Settings → Pages**.
2. **Source:** "Deploy from a branch".
3. **Branch:** the branch that contains this folder (e.g. `claude/vibrant-pasteur-j70qxn`, or `main` after merging), folder **`/docs`** → Save.
4. After a minute the app is at `https://<owner>.github.io/<repo>/`.

## Install on iPhone
Open the link in **Safari** → Share → **Add to Home Screen**. It then opens full-screen and works offline.

## Updating after code changes
- In the app: Me → Import / update repository (reads the public repo; nothing is written).
- Or rebuild the snapshot: `python3 docs/tools/build_repo_data.py`, then check:
  - `node docs/tools/validate.js` – every hand-written note still matches its line
  - `node docs/tools/compare_sim.js` – the CLI simulator still prints exactly what `main.py` prints
