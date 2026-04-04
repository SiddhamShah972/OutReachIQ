import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateJSON, PROMPTS } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { jobId, tone, recipientName } = await req.json()
    
    const [user, job] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
      jobId ? prisma.job.findFirst({ where: { id: jobId, userId: session.user.id } }) : null,
    ])

    const result = await generateJSON<{
      subject: string
      body: string
      subjectB: string
    }>(
      PROMPTS.emailComposer(
        recipientName || 'Hiring Manager',
        job?.title || user.targetRole || 'the position',
        job?.company || 'your company',
        user.skills,
        tone || 'professional',
        user.resumeText?.slice(0, 500) || ''
      )
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Email generation error:', error)
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 })
  }
}
