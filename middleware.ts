import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/api/track') ||
      pathname === '/login' ||
      pathname === '/register') {
    return NextResponse.next()
  }

  // Require auth for dashboard routes
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/jobs') ||
      pathname.startsWith('/compose') ||
      pathname.startsWith('/pipeline') ||
      pathname.startsWith('/sequences') ||
      pathname.startsWith('/warmup') ||
      pathname.startsWith('/offers') ||
      pathname.startsWith('/insights') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/profile')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
    
    // Redirect to onboarding if not complete
    if (!session.user.onboardingComplete && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', req.nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
