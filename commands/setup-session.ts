/**
 * One-time setup: saves your Clerk session ID so create-episode.ts
 * can generate tokens automatically on every run.
 *
 * Usage:
 *   1. Open chatbotcasts.com in your browser and log in
 *   2. Open DevTools console and run:
 *        await window.Clerk?.session?.getToken()
 *   3. Copy the token and run:
 *        npx tsx commands/setup-session.ts --token "eyJhbGci..."
 *
 * After this, just run ./run.sh — no token needed.
 */

import { parseArgs } from "node:util"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

const SESSION_FILE = resolve(process.cwd(), ".clerk-session")

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".")
  if (parts.length < 2) return {}
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { token: { type: "string" } },
})

if (!values.token) {
  process.stderr.write(`
Error: --token is required.

Get one from the browser console on chatbotcasts.com:
  await window.Clerk?.session?.getToken()

Then run:
  npx tsx commands/setup-session.ts --token "eyJhbGci..."
`)
  process.exit(1)
}

let payload: Record<string, unknown>
try {
  payload = decodeJwtPayload(values.token)
} catch {
  process.stderr.write(`Error: could not decode token — make sure you copied it correctly.\n`)
  process.exit(1)
}

const sessionId = payload.sid as string | undefined
const userId = payload.sub as string | undefined
const name = (payload.name || payload.given_name || "unknown") as string

if (!sessionId) {
  process.stderr.write(`Error: token does not contain a session ID (sid). Is this a valid Clerk JWT?\n`)
  process.exit(1)
}

writeFileSync(SESSION_FILE, sessionId, "utf8")

process.stderr.write(`
Session saved successfully!
  User:       ${name} (${userId})
  Session ID: ${sessionId}
  Saved to:   .clerk-session

You can now run episodes without --token:
  ./run.sh
`)
