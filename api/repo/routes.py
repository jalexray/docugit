import os
import json
from flask import request, jsonify, abort
from . import bp
from .git_service import GitService
from git import InvalidGitRepositoryError, GitCommandError

CONFIG_FILE = os.path.join(os.path.dirname(__file__), '..', '.docugit_config.json')


def _load_config():
    try:
        with open(CONFIG_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"repo_path": None}


def _save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def _get_repo_path():
    config = _load_config()
    path = config.get("repo_path")
    if not path or not os.path.isdir(path):
        return None
    return path


def _safe_path(repo_path, filepath):
    """Resolve filepath within repo_path, preventing path traversal."""
    real_repo = os.path.realpath(repo_path)
    real_path = os.path.realpath(os.path.join(repo_path, filepath))
    if not real_path.startswith(real_repo + os.sep) and real_path != real_repo:
        abort(403, "Path traversal detected")
    return real_path


# --- Config endpoints ---

@bp.get("/config")
def get_config():
    return jsonify(_load_config())


@bp.post("/config")
def set_config():
    data = request.get_json()
    repo_path = data.get("repo_path", "").strip()
    if not repo_path:
        return jsonify({"error": "repo_path is required"}), 400

    repo_path = os.path.expanduser(repo_path)
    repo_path = os.path.realpath(repo_path)

    if not os.path.isdir(repo_path):
        return jsonify({"error": "Directory does not exist", "valid": False}), 400

    # Check if it's a git repo
    try:
        GitService(repo_path)
    except InvalidGitRepositoryError:
        return jsonify({"error": "Not a git repository", "valid": False}), 400

    config = {"repo_path": repo_path}
    _save_config(config)
    return jsonify({"repo_path": repo_path, "valid": True})


@bp.get("/discover")
def discover_repos():
    parent = request.args.get("path", "").strip()
    if not parent:
        return jsonify({"error": "path query param is required"}), 400
    parent = os.path.expanduser(parent)
    parent = os.path.realpath(parent)
    if not os.path.isdir(parent):
        return jsonify({"error": "Directory does not exist"}), 400
    repos = GitService.discover_repos(parent)
    return jsonify({"repos": repos})


@bp.get("/detect")
def detect_repo():
    path = request.args.get("path", "").strip()
    if not path:
        return jsonify({"error": "path query param is required"}), 400
    path = os.path.expanduser(path)
    result = GitService.detect_repo(path)
    if result:
        return jsonify({"repo_path": result})
    return jsonify({"error": "No git repository found"}), 404


@bp.get("/browse")
def browse_dir():
    """List directory contents for the file browser."""
    path = request.args.get("path", "").strip() or "~"
    path = os.path.expanduser(path)
    path = os.path.realpath(path)

    if not os.path.isdir(path):
        return jsonify({"error": "Not a directory"}), 400

    items = []
    try:
        for entry in sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower())):
            if entry.name.startswith('.'):
                continue
            if entry.is_dir():
                items.append({"name": entry.name, "type": "directory"})
            elif entry.name.lower().endswith('.md'):
                items.append({"name": entry.name, "type": "file"})
    except PermissionError:
        return jsonify({"error": "Permission denied"}), 403

    return jsonify({
        "path": path,
        "parent": os.path.dirname(path),
        "items": items,
    })


@bp.get("/open-doc")
def open_doc():
    """Given an absolute path to a markdown file, detect its repo and return both."""
    path = request.args.get("path", "").strip()
    if not path:
        return jsonify({"error": "path query param is required"}), 400
    path = os.path.expanduser(path)
    path = os.path.realpath(path)

    if not os.path.isfile(path):
        return jsonify({"error": "File not found"}), 404
    if not path.lower().endswith('.md'):
        return jsonify({"error": "Not a markdown file"}), 400

    repo_path = GitService.detect_repo(path)
    if not repo_path:
        return jsonify({"error": "No git repository found for this file"}), 404

    # Compute relative path within the repo
    relative_path = os.path.relpath(path, repo_path)

    # Save repo config
    config = {"repo_path": repo_path}
    _save_config(config)

    # Read file content
    with open(path, 'r') as f:
        content = f.read()

    return jsonify({
        "repo_path": repo_path,
        "relative_path": relative_path,
        "content": content,
    })


# --- File endpoints ---

@bp.get("/files")
def list_files():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400

    def build_tree(directory, prefix=""):
        items = []
        try:
            entries = sorted(os.listdir(directory))
        except PermissionError:
            return items

        for entry in entries:
            if entry.startswith('.'):
                continue
            if entry in ('node_modules', '__pycache__', 'venv', '.git'):
                continue

            full_path = os.path.join(directory, entry)
            rel_path = os.path.join(prefix, entry) if prefix else entry

            if os.path.isdir(full_path):
                children = build_tree(full_path, rel_path)
                # Only include directories that contain markdown files (directly or nested)
                if children:
                    items.append({
                        "name": entry,
                        "path": rel_path,
                        "type": "directory",
                        "children": children,
                    })
            elif entry.lower().endswith('.md'):
                items.append({
                    "name": entry,
                    "path": rel_path,
                    "type": "file",
                })
        return items

    tree = build_tree(repo_path)
    return jsonify({"tree": tree})


@bp.get("/files/<path:filepath>")
def read_file(filepath):
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400

    full_path = _safe_path(repo_path, filepath)
    if not os.path.isfile(full_path):
        return jsonify({"error": "File not found"}), 404

    with open(full_path, 'r') as f:
        content = f.read()
    return jsonify({"path": filepath, "content": content})


@bp.put("/files/<path:filepath>")
def save_file(filepath):
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400

    data = request.get_json()
    content = data.get("content", "")

    full_path = _safe_path(repo_path, filepath)
    if not os.path.isfile(full_path):
        return jsonify({"error": "File not found"}), 404

    with open(full_path, 'w') as f:
        f.write(content)
    return jsonify({"path": filepath, "saved": True})


@bp.post("/files/<path:filepath>")
def create_file(filepath):
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400

    full_path = _safe_path(repo_path, filepath)
    if os.path.exists(full_path):
        return jsonify({"error": "File already exists"}), 409

    # Create parent directories if needed
    parent_dir = os.path.dirname(full_path)
    os.makedirs(parent_dir, exist_ok=True)

    with open(full_path, 'w') as f:
        f.write('')
    return jsonify({"path": filepath, "created": True}), 201


# --- Git endpoints ---

@bp.get("/git/status")
def git_status():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    try:
        svc = GitService(repo_path)
        return jsonify(svc.get_status())
    except InvalidGitRepositoryError:
        return jsonify({"error": "Not a git repository"}), 400


@bp.get("/git/branches")
def git_branches():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    try:
        svc = GitService(repo_path)
        return jsonify(svc.list_branches())
    except InvalidGitRepositoryError:
        return jsonify({"error": "Not a git repository"}), 400


@bp.post("/git/branches")
def git_create_branch():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    try:
        svc = GitService(repo_path)
        svc.create_branch(name)
        return jsonify({"branch": name})
    except (InvalidGitRepositoryError, GitCommandError) as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/git/checkout")
def git_checkout():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    try:
        svc = GitService(repo_path)
        svc.switch_branch(name)
        return jsonify({"branch": name})
    except (InvalidGitRepositoryError, GitCommandError) as e:
        return jsonify({"error": str(e)}), 400


@bp.get("/git/diff")
def git_diff():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    path = request.args.get("path")
    try:
        svc = GitService(repo_path)
        return jsonify({"diff": svc.get_diff(path)})
    except InvalidGitRepositoryError:
        return jsonify({"error": "Not a git repository"}), 400


@bp.post("/git/stage")
def git_stage():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    data = request.get_json()
    paths = data.get("paths", [])
    if not paths:
        return jsonify({"error": "paths is required"}), 400
    try:
        svc = GitService(repo_path)
        staged = svc.stage_files(paths)
        return jsonify({"staged": staged})
    except (InvalidGitRepositoryError, GitCommandError) as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/git/unstage")
def git_unstage():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    data = request.get_json()
    paths = data.get("paths", [])
    if not paths:
        return jsonify({"error": "paths is required"}), 400
    try:
        svc = GitService(repo_path)
        unstaged = svc.unstage_files(paths)
        return jsonify({"unstaged": unstaged})
    except (InvalidGitRepositoryError, GitCommandError) as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/git/commit")
def git_commit():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    data = request.get_json()
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400
    try:
        svc = GitService(repo_path)
        result = svc.commit(message)
        return jsonify(result)
    except (InvalidGitRepositoryError, GitCommandError) as e:
        return jsonify({"error": str(e)}), 400


@bp.post("/git/push")
def git_push():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    try:
        svc = GitService(repo_path)
        svc.push()
        return jsonify({"pushed": True})
    except (InvalidGitRepositoryError, GitCommandError) as e:
        return jsonify({"error": str(e)}), 400


@bp.get("/git/unpushed")
def git_unpushed():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    try:
        svc = GitService(repo_path)
        commits = svc.unpushed_commits()
        return jsonify({"commits": commits})
    except (InvalidGitRepositoryError, GitCommandError):
        return jsonify({"commits": []})


@bp.get("/git/log")
def git_log():
    repo_path = _get_repo_path()
    if not repo_path:
        return jsonify({"error": "No repo configured"}), 400
    limit = request.args.get("limit", 20, type=int)
    try:
        svc = GitService(repo_path)
        commits = svc.log(limit)
        return jsonify({"commits": commits})
    except InvalidGitRepositoryError:
        return jsonify({"error": "Not a git repository"}), 400
