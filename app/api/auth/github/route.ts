import { NextRequest, NextResponse } from 'next/server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''
const GITHUB_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`
  : 'http://localhost:3000/api/auth/github/callback'

// GET /api/auth/github - Redirect to GitHub OAuth
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const redirectTo = searchParams.get('redirect') || '/claim'
  const redPocketId = searchParams.get('redPocketId') || ''
  
  // Store state for CSRF protection
  const state = Buffer.from(JSON.stringify({ redirectTo, redPocketId })).toString('base64')
  
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID)
  githubAuthUrl.searchParams.set('redirect_uri', GITHUB_REDIRECT_URI)
  githubAuthUrl.searchParams.set('scope', 'read:user user:email')
  githubAuthUrl.searchParams.set('state', state)
  
  return NextResponse.redirect(githubAuthUrl.toString())
}
