# DocuGit

A lightweight, Word-like WYSIWYG editor for markdown files that live in git repos. Built for technical teams who use markdown docs as part of their workflow and want a cleaner editing experience than an IDE.

## Quick Start

Requires [Node.js](https://nodejs.org/) and Python 3.12+.

```bash
git clone https://github.com/jalexray/docugit.git
cd docugit
./start.sh
```

That's it! The script installs dependencies, starts both servers, and prints the URL.

## Features

- **WYSIWYG markdown editing** — TipTap-powered rich text editor with formatting toolbar (headings, bold, italic, lists, code blocks, blockquotes, links)
- **Markdown round-tripping** — opens `.md` files as rich text, saves back as clean markdown
- **Git integration** — stage, commit, and push without leaving the editor
- **Branch management** — switch branches or create new ones from the UI
- **File browser** — navigate your filesystem to find and open documents, with automatic git repo detection
- **Multiple repo access** — open by path, scan a parent directory, or auto-detect the repo from any file
- **New file creation** — create `.md` files directly from the sidebar
- **Push preview** — see unpushed commits before pushing
- **Keyboard shortcuts** — Cmd/Ctrl+S to save, Cmd+B bold, Cmd+I italic

## Try It Out

The repo includes sample docs in `docs/` so you can test immediately:

1. Run `./start.sh` and open the URL it prints
2. Click **Browse for Document** and navigate to `docs/welcome.md`
3. Edit the document — try the formatting toolbar
4. Press **Cmd+S** to save
5. Open the **Git panel** (right side) to stage, commit, and push

The `docs/getting-started.md` file has a full walkthrough of the git workflow.

## Tech Stack

## Project Structure

```
docugit/
  start.sh                 # One-line setup and run script
  api/                     # Flask backend
    repo/
      routes.py            # File I/O and git API endpoints
      git_service.py       # GitPython wrapper
  src/                     # React frontend
    api.js                 # API client
    components/
      Sidebar/             # Repo picker, file browser, file tree
      Editor/              # TipTap editor + formatting toolbar
      GitPanel/            # Git status, branch selector, commit, push
  docs/                    # Sample documents for testing
```

## License

MIT