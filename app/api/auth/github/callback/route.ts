import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || ''
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || ''

interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

// GET /api/auth/github/callback - Handle GitHub OAuth callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(new URL(`/claim?error=${error}`, request.url))
  }
  
  if (!code) {
    return NextResponse.redirect(new URL('/claim?error=no_code', request.url))
  }
  
  // Parse state
  let redirectTo = '/claim'
  let redPocketId = ''
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
      redirectTo = decoded.redirectTo || '/claim'
      redPocketId = decoded.redPocketId || ''
    } catch {
      // Ignore parse errors
    }
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    
    const tokenData = await tokenResponse.json()
    
    if (tokenData.error) {
      return NextResponse.redirect(new URL(`/claim?error=${tokenData.error}`, request.url))
    }
    
    const accessToken = tokenData.access_token
    
    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })
    
    const user: GitHubUser = await userResponse.json()
    
    // Get user email if not public
    let email = user.email
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })
      const emails = await emailsResponse.json()
      const primaryEmail = emails.find((e: { primary: boolean }) => e.primary)
      email = primaryEmail?.email || null
    }
    
    // Store user info in cookie (in production, use a proper session store)
    const cookieStore = await cookies()
    const githubUser = {
      id: user.id,
      login: user.login,
      name: user.name,
      email,
      avatar: user.avatar_url,
      platform: 'github',
      platformId: `github_${user.id}`,
    }
    
    cookieStore.set('github_user', JSON.stringify(githubUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    
    // Redirect back to claim page
    const redirectUrl = redPocketId 
      ? `${redirectTo}/${redPocketId}?github_auth=success`
      : `${redirectTo}?github_auth=success`
    
    return NextResponse.redirect(new URL(redirectUrl, request.url))
    
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    return NextResponse.redirect(new URL('/claim?error=oauth_failed', request.url))
  }
}
