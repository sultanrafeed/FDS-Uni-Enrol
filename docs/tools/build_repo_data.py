"""Snapshot the project source into docs/js/repo-data.js.

Run from the repository root:  python3 docs/tools/build_repo_data.py
It only READS the project files; nothing in the project is changed.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "js" / "repo-data.js"


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).stdout.strip()


def main():
    tracked = git("ls-files").splitlines()
    files = {}
    for name in tracked:
        if name.startswith("docs/") or name == ".gitignore":
            continue
        path = ROOT / name
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        authors = git("log", "--no-merges", "--format=%an", "--", name).splitlines()
        counts = {}
        for a in authors:
            counts[a] = counts.get(a, 0) + 1
        files[name] = {"text": text, "authors": counts}

    commits = []
    for line in git("log", "--no-merges", "--format=%h|%an|%ad|%s", "--date=short", "main").splitlines():
        h, a, d, s = line.split("|", 3)
        commits.append({"hash": h, "author": a, "date": d, "subject": s})

    data = {
        "repo": "sultanrafeed/FDS-Uni-Enrol",
        "branch": "main",
        "commit": git("rev-parse", "--short", "main"),
        "snapshotDate": git("log", "-1", "--format=%ad", "--date=short", "main"),
        "files": files,
        "commits": commits,
    }
    OUT.write_text("window.REPO = " + json.dumps(data, indent=1) + ";\n", encoding="utf-8")
    print("wrote", OUT, len(files), "files")


if __name__ == "__main__":
    main()
