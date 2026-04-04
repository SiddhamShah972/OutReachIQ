import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './lib/prisma'
import { encrypt } from './lib/crypto'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
          ].join(' '),
          prompt: 'consent',
          access_type: 'offline',
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && account.access_token) {
        try {
          const dbUser = await prisma.user.upsert({
            where: { email: user.email! },
            create: {
              email: user.email!,
              name: user.name,
              image: user.image,
              gmailAddress: user.email!,
              gmailAccessToken: encrypt(account.access_token),
              gmailRefreshToken: account.refresh_token ? encrypt(account.refresh_token) : undefined,
              gmailTokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
            },
            update: {
              gmailAddress: user.email!,
              gmailAccessToken: encrypt(account.access_token),
              gmailRefreshToken: account.refresh_token ? encrypt(account.refresh_token) : undefined,
              gmailTokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
            },
            select: { id: true, onboardingComplete: true, gmailAddress: true },
          })

            // persist values on user object for jwt callback on sign-in
            ; (user as any).id = dbUser.id
            ; (user as any).onboardingComplete = dbUser.onboardingComplete
            ; (user as any).gmailAddress = dbUser.gmailAddress
        } catch (error) {
          console.error('Failed to store Gmail tokens:', error)
        }
      }
      return true
    },

    async jwt({ token, user }) {
      // IMPORTANT: no prisma calls here (runs on edge via middleware)
      if (user) {
        token.id = (user as any).id ?? token.id
        token.onboardingComplete = (user as any).onboardingComplete ?? false
        token.gmailAddress = (user as any).gmailAddress ?? null
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.onboardingComplete = (token.onboardingComplete as boolean) ?? false
        session.user.gmailAddress = (token.gmailAddress as string | null) ?? null
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
})