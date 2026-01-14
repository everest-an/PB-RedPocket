import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET /api/auth/me - Get current authenticated user
export async function GET() {
  const cookieStore = await cookies()
  const githubUserCookie = cookieStore.get('github_user')
  
  if (githubUserCookie) {
    try {
      const user = JSON.parse(githubUserCookie.value)
      return NextResponse.json({ 
        authenticated: true, 
        user,
        platform: 'github'
      })
    } catch {
      // Invalid cookie
    }
  }
  
  return NextResponse.json({ 
    authenticated: false, 
    user: null,
    platform: null
  })
}

// DELETE /api/auth/me - Logout
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('github_user')
  
  return NextResponse.json({ success: true })
}
