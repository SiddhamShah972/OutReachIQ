import { Worker } from 'bullmq'
import { prisma } from '../lib/prisma'
import { checkForReplies } from '../lib/gmail'
import { generateJSON, PROMPTS } from '../lib/anthropic'
import { broadcastToUser } from '../lib/pusher'
import { redisConnection, TrackerJobData } from '../lib/queue'

const worker = new Worker<TrackerJobData>(
  'tracker',
  async (job) => {
    const { userId } = job.data
    
    // Find unreplied emails from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const unrepliedEmails = await prisma.emailSent.findMany({
      where: {
        userId,
        repliedAt: null,
        threadId: { not: null },
        sentAt: { gte: thirtyDaysAgo },
      },
      take: 20,
    })

    for (const email of unrepliedEmails) {
      if (!email.threadId) continue

      try {
        const replyCheck = await checkForReplies(userId, email.threadId)
        
        if (replyCheck?.hasReply && replyCheck.replyBody) {
          // Classify sentiment
          const sentiment = await generateJSON<{
            sentiment: string
            suggestedAction: string
            summary: string
          }>(PROMPTS.replySentiment(replyCheck.replyBody))

          // Update email record
          await prisma.emailSent.update({
            where: { id: email.id },
            data: {
              repliedAt: new Date(),
              sentiment: sentiment.sentiment,
            },
          })

          // Pause sequence if replied
          if (email.sequenceId) {
            await prisma.sequence.update({
              where: { id: email.sequenceId },
              data: { status: 'paused' },
            })
          }

          // Update job pipeline status
          if (email.jobId) {
            await prisma.job.update({
              where: { id: email.jobId },
              data: { status: 'replied' },
            })
          }

          // Broadcast via Pusher
          await broadcastToUser(userId, 'reply-received', {
            emailId: email.id,
            jobId: email.jobId,
            sentiment: sentiment.sentiment,
            summary: sentiment.summary,
            suggestedAction: sentiment.suggestedAction,
            from: replyCheck.replyFrom,
          })
        }
      } catch (err) {
        console.error(`Failed to check replies for email ${email.id}:`, err)
      }
    }
  },
  { connection: redisConnection }
)

worker.on('completed', (job) => {
  console.log(`Tracker job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Tracker job ${job?.id} failed:`, err)
})

console.log('Reply tracker worker started')
