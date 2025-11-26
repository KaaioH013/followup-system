'use server'

import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function login(prevState: any, formData: FormData) {
    const password = formData.get('password') as string
    const correctPassword = process.env.ACCESS_PASSWORD

    if (!correctPassword) {
        console.error("ACCESS_PASSWORD not set in environment variables");
        return { error: 'Erro de configuração do servidor' };
    }

    if (password === correctPassword) {
        const secret = new TextEncoder().encode(correctPassword)
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('30d')
            .sign(secret)

        const cookieStore = await cookies()

        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
        })

        redirect('/')
    } else {
        return { error: 'Senha incorreta' }
    }
}
