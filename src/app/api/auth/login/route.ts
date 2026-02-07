import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { username, password } = body

        const adminUsername = process.env.ADMIN_USERNAME
        const adminPassword = process.env.ADMIN_PASSWORD
        const jwtSecret = process.env.JWT_SECRET

        if (!adminUsername || !adminPassword || !jwtSecret) {
            console.error("Missing Auth Environment Variables")
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
        }

        if (username === adminUsername && password === adminPassword) {
            // Generate JWT
            const secret = new TextEncoder().encode(jwtSecret)
            const token = await new SignJWT({ role: 'admin' })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('24h') // 24 hour session
                .sign(secret)

            // Create response
            const response = NextResponse.json({ success: true })

            // Set HTTP-Only Cookie
            response.cookies.set({
                name: 'auth_token',
                value: token,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24, // 24 hours
                path: '/',
            })

            return response
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
