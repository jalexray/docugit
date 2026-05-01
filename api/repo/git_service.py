import os
from git import Repo, InvalidGitRepositoryError, GitCommandError


class GitService:
    def __init__(self, repo_path):
        self.repo_path = repo_path
        self.repo = Repo(repo_path)

    def get_status(self):
        """Return branch name and lists of changed, staged, and untracked files."""
        repo = self.repo
        branch = repo.active_branch.name if not repo.head.is_detached else "(detached)"

        # Staged files (diff between index and HEAD)
        staged = []
        if repo.head.is_valid():
            for diff in repo.index.diff(repo.head.commit):
                staged.append({"path": diff.a_path or diff.b_path, "type": diff.change_type})
        else:
            # New repo with no commits — everything in index is staged
            for entry in repo.index.entries:
                staged.append({"path": entry[0], "type": "A"})

        # Changed (unstaged) files — diff between working tree and index
        changed = []
        for diff in repo.index.diff(None):
            changed.append({"path": diff.a_path or diff.b_path, "type": diff.change_type})

        # Untracked files
        untracked = repo.untracked_files

        return {
            "branch": branch,
            "staged": staged,
            "changed": changed,
            "untracked": untracked,
        }

    def list_branches(self):
        """Return local branches sorted by most recent commit, with age info."""
        active = self.repo.active_branch.name if not self.repo.head.is_detached else None
        branch_info = []
        for b in self.repo.branches:
            try:
                commit = b.commit
                branch_info.append({
                    "name": b.name,
                    "last_commit_date": commit.committed_datetime.isoformat(),
                    "last_commit_msg": commit.message.strip().split('\n')[0][:80],
                })
            except Exception:
                branch_info.append({
                    "name": b.name,
                    "last_commit_date": None,
                    "last_commit_msg": "",
                })
        # Sort by commit date descending (most recent first), None last
        branch_info.sort(key=lambda b: b["last_commit_date"] or "", reverse=True)
        return {"branches": branch_info, "active": active}

    def create_branch(self, name):
        """Create a new branch from HEAD and check it out."""
        self.repo.git.checkout('-b', name)
        return name

    def switch_branch(self, name):
        """Switch to an existing branch."""
        self.repo.git.checkout(name)
        return name

    def get_diff(self, path=None):
        """Return diff of working tree changes."""
        if path:
            return self.repo.git.diff("--", path)
        return self.repo.git.diff()

    def stage_files(self, paths):
        """Stage files for commit. Supports both tracked and untracked files."""
        self.repo.index.add(paths)
        return paths

    def unstage_files(self, paths):
        """Unstage files (reset from index)."""
        if self.repo.head.is_valid():
            self.repo.index.reset(self.repo.head.commit, paths=paths)
        else:
            self.repo.index.remove(paths, cached=True)
        return paths

    def commit(self, message):
        """Commit staged changes."""
        commit = self.repo.index.commit(message)
        return {"sha": str(commit.hexsha), "message": commit.message}

    def push(self):
        """Push to origin remote."""
        if not self.repo.remotes:
            raise GitCommandError("push", "No remotes configured")
        origin = self.repo.remotes.origin
        info = origin.push()
        # Check for errors
        for push_info in info:
            if push_info.flags & push_info.ERROR:
                raise GitCommandError("push", f"Push failed: {push_info.summary}")
        return True

    def log(self, limit=20):
        """Return recent commit log."""
        if not self.repo.head.is_valid():
            return []
        commits = []
        for commit in self.repo.iter_commits(max_count=limit):
            commits.append({
                "sha": str(commit.hexsha)[:8],
                "message": commit.message.strip(),
                "author": str(commit.author),
                "date": commit.committed_datetime.isoformat(),
            })
        return commits

    def unpushed_commits(self):
        """Return commits that exist locally but not on the remote tracking branch."""
        repo = self.repo
        if not repo.head.is_valid():
            return []
        try:
            tracking = repo.active_branch.tracking_branch()
        except (TypeError, ValueError):
            tracking = None
        if not tracking:
            # No remote tracking branch — all commits are unpushed
            commits = []
            for commit in repo.iter_commits(max_count=50):
                commits.append({
                    "sha": str(commit.hexsha)[:8],
                    "message": commit.message.strip(),
                    "author": str(commit.author),
                    "date": commit.committed_datetime.isoformat(),
                })
            return commits
        # Commits in HEAD that aren't in the tracking branch
        rev = f"{tracking.name}..HEAD"
        commits = []
        for commit in repo.iter_commits(rev):
            commits.append({
                "sha": str(commit.hexsha)[:8],
                "message": commit.message.strip(),
                "author": str(commit.author),
                "date": commit.committed_datetime.isoformat(),
            })
        return commits

    @staticmethod
    def discover_repos(parent_path, max_depth=2):
        """Walk a parent directory and find git repos up to max_depth levels deep."""
        repos = []
        parent_path = os.path.realpath(parent_path)
        if not os.path.isdir(parent_path):
            return repos

        for root, dirs, _files in os.walk(parent_path):
            depth = root[len(parent_path):].count(os.sep)
            if depth >= max_depth:
                dirs.clear()
                continue
            # Skip hidden directories (except .git check)
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            git_dir = os.path.join(root, '.git')
            if os.path.isdir(git_dir):
                repos.append({
                    "path": root,
                    "name": os.path.basename(root),
                })
                dirs.clear()  # Don't recurse into git repos
        return sorted(repos, key=lambda r: r["name"].lower())

    @staticmethod
    def detect_repo(file_path):
        """Walk up from a file path to find the nearest git root."""
        path = os.path.realpath(file_path)
        if os.path.isfile(path):
            path = os.path.dirname(path)
        while path != os.path.dirname(path):  # Stop at filesystem root
            if os.path.isdir(os.path.join(path, '.git')):
                return path
            path = os.path.dirname(path)
        return None
