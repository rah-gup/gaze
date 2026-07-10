#!/usr/bin/env bash
# One-time setup: GitHub repo + push. Then connect Git in Vercel dashboard.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_NAME="${1:-gaze}"

if ! command -v gh &>/dev/null; then
  echo "GitHub CLI not found. Install with: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Log in to GitHub (browser will open)..."
  gh auth login -h github.com -p https -w
fi

OWNER="$(gh api user -q .login)"
REMOTE="git@github.com:${OWNER}/${REPO_NAME}.git"

if git remote get-url origin &>/dev/null; then
  echo "Remote origin already set: $(git remote get-url origin)"
else
  if gh repo view "${OWNER}/${REPO_NAME}" &>/dev/null; then
    echo "Using existing repo ${OWNER}/${REPO_NAME}"
    git remote add origin "$REMOTE"
  else
    echo "Creating public repo ${OWNER}/${REPO_NAME}..."
    gh repo create "$REPO_NAME" --public --source=. --remote=origin \
      --description "Interactive eye-gaze demo — portfolio Play experiment"
  fi
fi

echo "Pushing main..."
git push -u origin main

echo ""
echo "Done. Last step — connect Git in Vercel (one time):"
echo "https://vercel.com/rahul20illinois-5857s-projects/gaze/settings/git"
echo ""
echo "Select ${OWNER}/${REPO_NAME}, production branch: main."
echo "Future deploys: just git push."
