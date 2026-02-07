import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const response = NextResponse.json({ success: true })

    // Clear the cookie
    response.cookies.set({
        name: 'auth_token',
        value: '',
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    })

    return response
}
