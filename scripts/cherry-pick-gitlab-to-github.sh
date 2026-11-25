#!/usr/bin/env bash
# Cherry-pick commits from GitLab sync branch onto GitHub main and open a PR.
#
# Remotes (as configured in this clone):
#   origin              → GitLab: intelliaide-debug/intelliaide-intermediate-deliverables
#   github-intelliaide  → GitHub: chirag-wrk/Intelliaide
#
# Usage:
#   ./scripts/cherry-pick-gitlab-to-github.sh              # list commits to pick
#   COMMIT_SHA=<sha> BRANCH=feat/my-pick ./scripts/cherry-pick-gitlab-to-github.sh
#   COMMIT_SHA=<old>..<new> BRANCH=feat/range ./scripts/cherry-pick-gitlab-to-github.sh

set -euo pipefail

GITLAB="${GITLAB_REMOTE:-origin}"
GITHUB="${GITHUB_REMOTE:-github-intelliaide}"
GITLAB_SYNC_REF="${GITLAB_SYNC_REF:-sync/github-main}"
GITHUB_MAIN="${GITHUB_MAIN:-main}"

fetch() {
  git fetch "$GITLAB"
  git fetch "$GITHUB"
}

list_commits() {
  echo "Commits on ${GITLAB}/${GITLAB_SYNC_REF} not in ${GITHUB}/${GITHUB_MAIN}:"
  git log "${GITHUB}/${GITHUB_MAIN}..${GITLAB}/${GITLAB_SYNC_REF}" --oneline
}

cherry_pick_and_push() {
  local sha="${COMMIT_SHA:?Set COMMIT_SHA to one commit or OLD^..NEW}"
  local branch="${BRANCH:?Set BRANCH to a new feature branch name}"

  git checkout -B "$branch" "${GITHUB}/${GITHUB_MAIN}"
  git cherry-pick "$sha"
  git push -u "$GITHUB" HEAD

  echo ""
  echo "Open a PR on GitHub (set title/body as needed):"
  echo "  gh pr create --repo chirag-wrk/Intelliaide --title \"<title>\" --body \"<body>\""
}

mirror_github_main_to_gitlab_sync() {
  git fetch "$GITHUB" "$GITHUB_MAIN"
  git push "$GITLAB" "${GITHUB}/${GITHUB_MAIN}:${GITLAB_SYNC_REF}"
  echo "Pushed ${GITHUB}/${GITHUB_MAIN} → ${GITLAB}/${GITLAB_SYNC_REF}"
}

case "${1:-list}" in
  list | "")
    fetch
    list_commits
    ;;
  pick)
    fetch
    cherry_pick_and_push
    ;;
  mirror)
    fetch
    mirror_github_main_to_gitlab_sync
    ;;
  *)
    echo "Usage: $0 [list|pick|mirror]" >&2
    echo "  list   — show commits on GitLab sync not on GitHub main (default)" >&2
    echo "  pick   — requires COMMIT_SHA and BRANCH env vars" >&2
    echo "  mirror — after PR merge: push GitHub main to GitLab sync/github-main" >&2
    exit 1
    ;;
esac
