// Middleware for protected routes
// File: middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Protected routes
  const protectedRoutes = ['/dashboard', '/customers', '/invoices', '/payments']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // Check for auth token in cookies
  const token = req.cookies.get('sb-access-token')
  const hasSession = !!token

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !hasSession) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing login with active session
  if (req.nextUrl.pathname === '/login' && hasSession) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/customers/:path*', '/invoices/:path*', '/payments/:path*', '/login'],
}
