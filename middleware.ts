// Middleware for protected routes
// File: middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // TEMPORARILY DISABLED: Authentication is bypassed
  // User requested to disable login functionality
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  /* ORIGINAL AUTH CODE (DISABLED)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Middleware: Missing Supabase environment variables');
      }

      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value,
                ...options,
              })
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              response.cookies.set({
                name,
                value,
                ...options,
              })
            },
            remove(name: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value: '',
                ...options,
              })
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              response.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
          // Auth error is expected if no session
      }

      const protectedRoutes = ['/dashboard', '/customers', '/invoices', '/payments']
      const isProtectedRoute = protectedRoutes.some(route => 
        request.nextUrl.pathname.startsWith(route)
      )

      if (isProtectedRoute && !user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      if (request.nextUrl.pathname === '/login' && user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }

      return response

  } catch (e) {
      console.error('Middleware Error:', e);
      return response;
  }
  */
}

export const config = {
  matcher: ['/dashboard/:path*', '/customers/:path*', '/invoices/:path*', '/payments/:path*', '/login', '/register'],
}
