import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './lib/prisma'
import { encrypt } from './lib/crypto'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
          await prisma.user.upsert({
            where: { email: user.email! },
            create: {
              email: user.email!,
              name: user.name,
              image: user.image,
              gmailAddress: user.email!,
              gmailAccessToken: encrypt(account.access_token),
              gmailRefreshToken: account.refresh_token ? encrypt(account.refresh_token) : undefined,
              gmailTokenExpiry: account.expires_at
                ? new Date(account.expires_at * 1000)
                : undefined,
            },
            update: {
              gmailAddress: user.email!,
              gmailAccessToken: encrypt(account.access_token),
              gmailRefreshToken: account.refresh_token ? encrypt(account.refresh_token) : undefined,
              gmailTokenExpiry: account.expires_at
                ? new Date(account.expires_at * 1000)
                : undefined,
            },
          })
        } catch (error) {
          console.error('Failed to store Gmail tokens:', error)
        }
      }
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { onboardingComplete: true, gmailAddress: true },
        })
        session.user.onboardingComplete = dbUser?.onboardingComplete ?? false
        session.user.gmailAddress = dbUser?.gmailAddress ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'database' },
})
