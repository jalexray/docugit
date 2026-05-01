# Getting Started with Git in DocuGit

This guide walks you through the full edit-commit-push workflow. Follow along using this document -- edit it as you go.

## Step 1: Edit and Save

You're already looking at a markdown file in the WYSIWYG editor. Make a change to this document right now:

**Try it:** Add your name here: ___________

Press **Cmd+S** (or Ctrl+S) to save. You should see:

- The orange **\*** next to the filename disappears (no more unsaved changes)
- The **Git panel** on the right updates to show your changed file

## Step 2: Stage Your Changes

In the Git panel on the right, you'll see a **Changes** section listing modified files.

1. Check the box next to the file you want to commit
2. Click **Stage** (or **Stage all** to grab everything)

The file moves to the green **Staged** section -- these are the changes that will be included in your next commit.

Changed your mind? Check a staged file and click **Unstage** to move it back.

## Step 3: Commit

With files staged, write a commit message in the text area at the bottom of the Git panel.

**Good commit messages are short and descriptive:**

- "Update welcome doc with my name"
- "Add project roadmap draft"
- "Fix typo in getting-started guide"

Click **Commit** to create the commit. You'll see a confirmation with the commit SHA.

## Step 4: Push

After committing, the **Unpushed** section shows commits that exist locally but haven't been sent to the remote yet. Review them, then click **Push** to send them upstream.

If there's no remote configured, you'll see an error -- that's expected for a fresh local repo.

## Step 5: Branching

Click the **branch name** at the top of the Git panel to:

- **Switch** to an existing branch (sorted by most recent activity)
- **Create** a new branch with the "+ New branch" link

New branches are created from your current HEAD and checked out automatically.

## Tips

- **Cmd+S** saves the current file
- **Cmd+B** bolds selected text
- **Cmd+I** italicizes selected text
- Click **Browse for Document** in the sidebar to open any markdown file on your machine
- The Git panel toggles with the **Git** button in the top-right corner
