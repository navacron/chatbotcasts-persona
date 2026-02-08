import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // Get the password from environment variable
    const correctPassword = process.env.TEST_UI_PASSWORD

    // If no password is configured (e.g. local dev), allow access
    if (!correctPassword || correctPassword.trim() === "") {
      return NextResponse.json({ authenticated: true })
    }

    // Check if password matches
    const authenticated = password === correctPassword

    return NextResponse.json({ authenticated })
  } catch (error) {
    console.error("[v0] Error verifying password:", error)
    return NextResponse.json({ authenticated: false, error: "Verification failed" }, { status: 500 })
  }
}
