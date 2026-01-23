/**
 * Extracts the username from an email address (part before @)
 * @param email - The email address
 * @returns The username (part before @) or "Anonymous" if email is invalid/missing
 */
export function extractUsernameFromEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string") {
    return "Anonymous"
  }

  const atIndex = email.indexOf("@")
  if (atIndex === -1) {
    return "Anonymous"
  }

  const username = email.substring(0, atIndex).trim()
  return username || "Anonymous"
}


