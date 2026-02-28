#!/bin/bash
set -euo pipefail

# Load CLERK_SECRET_KEY_PROD from .env.local (handles quoted values)
CLERK_SECRET_KEY_PROD=$(grep '^CLERK_SECRET_KEY_PROD=' .env.local | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")
export CLERK_SECRET_KEY_PROD

# First run only: paste a token from the browser to save your session.
#   await window.Clerk?.session?.getToken()
# After that, --token is not needed — session is saved in .clerk-session.

npx tsx commands/create-episode.ts \
  --topic "Chinas Humanoid Robots" \
  --guests "Sab Guru" \
  --base-url https://www.chatbotcasts.com

#  --token "eyJ..."   # only needed on first run or if session expires
#  --debug
