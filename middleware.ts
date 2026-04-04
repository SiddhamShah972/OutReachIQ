import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  if (
    pathname === '/' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/track') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/onboarding'
  ) {
    return NextResponse.next()
  }

  // Protected app routes
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/compose') ||
    pathname.startsWith('/pipeline') ||
    pathname.startsWith('/sequences') ||
    pathname.startsWith('/warmup') ||
    pathname.startsWith('/offers') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile')
  ) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}