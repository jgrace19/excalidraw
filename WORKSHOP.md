# Workshop setup

Welcome to the Cursor Workshop! Our goal is to get you hands-on with Cursor as fast as possible. Follow the steps below to fork and clone the Excalidraw repo.
## 1. Fork this repo

Open [github.com/jgrace19/excalidraw](https://github.com/jgrace19/excalidraw) and click **Fork** (top right). Fork into your own GitHub account — your workshop changes will live on a branch in your fork, and you'll open a pull request back to `jgrace19/excalidraw` at the end.

If you already have an unrelated fork of `excalidraw/excalidraw`, fork this repo into a different account or rename the existing fork; GitHub only allows one fork per repo per account.

## 2. Clone your fork (shallow, single branch)

Replace `<your-handle>` with your GitHub username:

```bash
git clone --depth 1 --single-branch --branch master \
  https://github.com/<your-handle>/excalidraw.git
cd excalidraw
```

What the flags do:

- `--depth 1` — fetch only the latest commit, not the full history. Drops the download from ~120 MB to ~20–30 MB.
- `--single-branch` — fetch only `master`, not every remote branch.
- `--branch master` — explicit so you don't accidentally land on a different default.

You'll have a fully working tree. You can still create branches, commit, and push normally.
