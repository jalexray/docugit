# DocuGit

A lightweight, Word-like WYSIWYG editor for markdown files that live in git repos. Built for developers who generate docs as part of their workflow and want a cleaner editing experience than an IDE.

## Features

- **WYSIWYG markdown editing** -- TipTap-powered rich text editor with full formatting toolbar (headings, bold, italic, lists, code blocks, blockquotes, links)
- **Markdown round-tripping** -- opens `.md` files as rich text, saves back as clean markdown
- **Git integration** -- stage, commit, and push without leaving the editor
- **Branch management** -- switch branches or create new ones from the UI
- **File browser** -- navigate your filesystem to find and open documents, with automatic git repo detection
- **Multiple repo access** -- open by path, scan a parent directory, or auto-detect the repo from any file
- **New file creation** -- create `.md` files directly from the sidebar
- **Push preview** -- see unpushed commits before pushing
- **Keyboard shortcuts** -- Cmd/Ctrl+S to save, plus standard formatting shortcuts

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS 4, TipTap v3
- **Backend**: Flask 3.1, GitPython
- **No database** -- config persisted to a local JSON file

## Getting Started

### Prerequisites

- Node.js
- Python 3.12+

### Install

```bash
# Frontend
npm install

# Backend
python3 -m venv api/venv
api/venv/bin/pip install -r api/requirements.txt
```

### Run

Start both servers in separate terminals:

```bash
npm run dev     # Vite dev server (http://localhost:5175)
npm run api     # Flask API (http://localhost:5015)
```

Open http://localhost:5175 in your browser.

### Try It

The repo includes sample docs in `docs/` so you can test immediately. Once the app is running, enter the path to this repo (e.g. `~/software/docugit`) using the **Path** tab, then open `docs/welcome.md` to start editing. The `docs/getting-started.md` file walks you through staging, committing, and pushing.

### Usage

1. Click **Browse for Document** to navigate to a markdown file, or use **Path/Scan/Detect** modes to open a repo
2. Click any `.md` file in the sidebar to open it in the editor
3. Edit with the formatting toolbar or keyboard shortcuts
4. **Cmd+S** to save
5. Use the **Git panel** (right side) to stage, commit, and push changes

## Project Structure

```
docugit/
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
```
