# Workshop setup

Get a working copy of this repo as fast as possible. The full upstream Excalidraw history is large (~88 MB of pack data) and a vanilla `git clone` pulls all of it. The two steps below keep things fast.

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

### If you need more history later

A shallow clone is enough for the workshop. If you later want full history (e.g. to run `git blame` or `git log` across older commits):

```bash
git fetch --unshallow
```

Or fetch just the last 50 commits:

```bash
git fetch --depth 50
```

## 3. Install and run

```bash
yarn
yarn start
```

The app will open at [http://localhost:3000](http://localhost:3000).

## Next steps

- See [`CLAUDE.md`](./CLAUDE.md) for the project layout and common commands.
- See [`.cursor/rules/`](./.cursor/rules) for workshop conventions (branch naming, PR format, safe paths).
