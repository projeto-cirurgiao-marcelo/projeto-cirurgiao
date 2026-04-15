# Secrets Warning — 2026-04-15

This note records the secret-handling state after the `chore/repo-cleanup` branch landed the initial cleanup.

## What was found at cleanup time

1. **`gcp-service-account-key/`** — GCP service account JSON (`projeto-cirurgiao-5b9e6cafa4fc.json`). Already in `.gitignore` (line 160). **Never committed to git.** File remains on disk locally.
2. **`knowledge/CREDENCIAIS_PRODUCAO.md`** — production credentials file. Was untracked (parent `knowledge/` folder is not tracked). **Deleted from disk** during Task 1 of the cleanup.

## What the cleanup did NOT do

- No history rewriting (`git filter-repo`, `git filter-branch`).
- No push or remote operations.
- No credential rotation.

Both secrets are believed to have never been committed to `main`, based on `git ls-files` returning empty for both paths at HEAD `52c7dcc`. Verify before publishing by running:

```bash
git log --all --full-history --source -- "gcp-service-account-key/*"
git log --all --full-history --source -- "knowledge/CREDENCIAIS_PRODUCAO.md"
```

If either command returns commits, those commits contain the secret and must be purged (filter-repo) or avoided by publishing a fresh orphan commit as the first public commit.

## Required follow-up actions before publishing the repo publicly

1. **Rotate the GCP service account key** in Google Cloud Console. Create a new key, update all environments that use it, then disable/delete the old key. This is defensive — do it even if the key was never committed.
2. **Rotate every credential** that was in `knowledge/CREDENCIAIS_PRODUCAO.md`. The file is gone from disk but you may still have the content in backups, Git reflog, or editor history.
3. **Run the two `git log` commands above** before any public push. If they return any result, do not push.
4. **Add new secret patterns to `.gitignore`** — already done in Task 1. Patterns added: `**/CREDENCIAIS_*.md`, `**/credentials*.json`, `**/service-account*.json`.

## Context

- Cleanup branch: `chore/repo-cleanup`
- Cleanup plan: `docs/superpowers/plans/2026-04-15-repo-cleanup.md`
- Starting HEAD: `52c7dcc`
