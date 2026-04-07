import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateJSON, PROMPTS } from '@/lib/anthropic'

interface AIInsightPayload {
  summary?: string
  insights?: Array<{ title?: string; description?: string; action?: string }>
  weeklyGoals?: string[]
}

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

  const totalEmails = emailStats._count?.id ?? 0
  const openedCount = recentEmails.filter((email) => email.openedAt).length
  const repliedCount = recentEmails.filter((email) => email.repliedAt).length

  const openRate = totalEmails > 0 ? Math.round((openedCount / totalEmails) * 100) : 0
  const replyRate = totalEmails > 0 ? Math.round((repliedCount / totalEmails) * 100) : 0

  const replyDurationsInDays = recentEmails
    .filter((email) => email.repliedAt)
    .map((email) => {
      const repliedAt = email.repliedAt
      if (!(repliedAt instanceof Date)) return -1
      return (repliedAt.getTime() - email.sentAt.getTime()) / (1000 * 60 * 60 * 24)
    })
    .filter((days) => days >= 0)

  const avgResponseDays = replyDurationsInDays.length > 0
    ? replyDurationsInDays.reduce((sum, days) => sum + days, 0) / replyDurationsInDays.length
    : null

  const avgResponseTime = replyDurationsInDays.length > 0
    ? `${avgResponseDays?.toFixed(1)} days`
    : 'N/A'

  const statusBreakdown = jobStats.map((job) => ({
    name: job.status,
    value: job._count,
  }))

  const subjectPerformanceMap = new Map<string, { subject: string; opens: number; replies: number }>()
  for (const email of recentEmails) {
    const subject = email.subject || '(No subject)'
    const current = subjectPerformanceMap.get(subject) ?? { subject, opens: 0, replies: 0 }
    current.opens += email.openedAt ? 1 : 0
    current.replies += email.repliedAt ? 1 : 0
    subjectPerformanceMap.set(subject, current)
  }
  const subjectPerformance = Array.from(subjectPerformanceMap.values())

  const metrics = {
    totalEmails,
    jobsByStatus: jobStats,
  }

  try {
    const insights = await generateJSON(
      PROMPTS.insightEngine(metrics, JSON.stringify(recentEmails))
    )
    const parsedInsights = insights as AIInsightPayload

    const recommendations = [
      ...(parsedInsights.weeklyGoals ?? []),
      ...((parsedInsights.insights ?? [])
        .map((insight) => insight.action)
        .filter((action): action is string => Boolean(action))),
    ]

    return NextResponse.json({
      summary: parsedInsights.summary ?? 'No AI summary available yet.',
      recommendations: recommendations.length > 0
        ? recommendations
        : ['Keep sending consistent, personalized outreach and follow-ups.'],
      emailStats: {
        total: totalEmails,
        openRate,
        replyRate,
        avgResponseTime,
      },
      subjectPerformance,
      statusBreakdown,
    })
  } catch {
    return NextResponse.json({
      summary: 'Your outreach metrics are ready. Keep consistency and iterate on messaging quality.',
      recommendations: ['Personalize subject lines and follow up with non-responders within 3-5 days to maintain momentum.'],
      emailStats: {
        total: totalEmails,
        openRate,
        replyRate,
        avgResponseTime,
      },
      subjectPerformance,
      statusBreakdown,
    })
  }
}
