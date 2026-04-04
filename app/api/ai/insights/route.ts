import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateJSON, PROMPTS } from '@/lib/anthropic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [emailStats, jobStats, recentEmails] = await Promise.all([
    prisma.emailSent.aggregate({
      where: { userId: session.user.id },
      _count: { id: true },
    }),
    prisma.job.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: true,
    }),
    prisma.emailSent.findMany({
      where: { userId: session.user.id },
      orderBy: { sentAt: 'desc' },
      take: 5,
      select: { subject: true, to: true, sentAt: true, openedAt: true, repliedAt: true },
    }),
  ])

  const metrics = {
    totalEmails: emailStats._count.id,
    jobsByStatus: jobStats,
  }

  try {
    const insights = await generateJSON(
      PROMPTS.insightEngine(metrics, JSON.stringify(recentEmails))
    )
    return NextResponse.json({ insights, metrics })
  } catch {
    return NextResponse.json({ insights: null, metrics })
  }
}
