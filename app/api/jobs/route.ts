import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { fetchAndScoreJobs } from '@/lib/jobs'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const source = searchParams.get('source')
  const minScore = searchParams.get('minScore')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Record<string, unknown> = { userId: session.user.id }
  if (status) where.status = status
  if (source) where.source = source
  if (minScore) where.matchScore = { gte: parseInt(minScore) }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.job.count({ where }),
  ])

  return NextResponse.json({ jobs, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { query, location } = await req.json()
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
    })

    // Trigger job fetch in background (don't await)
    fetchAndScoreJobs(
      session.user.id,
      query || user.targetRole || 'software engineer',
      location || 'remote',
      user.skills,
      user.resumeText || ''
    ).catch(console.error)

    return NextResponse.json({ success: true, message: 'Job fetch started' })
  } catch (error) {
    console.error('Job refresh error:', error)
    return NextResponse.json({ error: 'Failed to refresh jobs' }, { status: 500 })
  }
}
