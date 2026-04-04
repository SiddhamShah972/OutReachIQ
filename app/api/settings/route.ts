import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const settingsSchema = z.object({
  name: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompanies: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  dailySendLimit: z.number().min(1).max(100).optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validated = settingsSchema.parse(body)

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: validated,
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      targetRole: true,
      targetCompanies: true,
      skills: true,
      dailySendLimit: true,
      warmupPhase: true,
      gmailAddress: true,
      onboardingComplete: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user)
}
