import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)

    // Define public paths that don't satisfy the protection logic
    const isLoginPage = request.nextUrl.pathname === '/login'
    const isPublicPath =
        request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.includes('.') // file extensions (favicon.ico, etc)

    // 1. If user is verified and on login page, redirect to dashboard
    if (isLoginPage && token) {
        try {
            await jwtVerify(token, secret)
            return NextResponse.redirect(new URL('/dashboard', request.url))
        } catch (err) {
            // Invalid token, stay on login page (and maybe clear cookie?)
            const response = NextResponse.next()
            response.cookies.delete('auth_token')
            return response
        }
    }

    // 2. If path is protected and no valid token, redirect to login
    if (!isLoginPage && !isPublicPath) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        try {
            await jwtVerify(token, secret)
            // Token is valid, proceed
            return NextResponse.next()
        } catch (err) {
            // Token is invalid/expired
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
