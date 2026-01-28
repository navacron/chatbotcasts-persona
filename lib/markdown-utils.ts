/**
 * Strips markdown formatting from text to make it more readable
 * Removes: **bold**, *italic*, `code`, [links](url), # headings, etc.
 */
export function stripMarkdown(text: string): string {
  if (!text || typeof text !== "string") {
    return text
  }

  let cleaned = text

  // Remove bold/italic markdown (**text**, *text*, __text__, _text_)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1") // *italic*
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1") // __bold__
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1") // _italic_

  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1")

  // Remove links but keep the text ([text](url) -> text)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  // NOTE: We intentionally keep bare citation markers like [1], [2]
  // so that inline references remain visible to the user.

  // Remove heading markers (# ## ###)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "")

  // Remove horizontal rules (---, ***)
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, "")

  // Remove blockquotes (> text)
  cleaned = cleaned.replace(/^>\s+/gm, "")

  // Remove list markers (-, *, +, 1.)
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "")
  cleaned = cleaned.replace(/^\d+\.\s+/gm, "")

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n") // Max 2 newlines
  cleaned = cleaned.trim()

  return cleaned
}

