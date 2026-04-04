import { Worker } from 'bullmq'
import { prisma } from '../lib/prisma'
import { redisConnection, WarmupJobData } from '../lib/queue'

const PHASE_UPGRADE_DAYS = 7

const worker = new Worker<WarmupJobData>(
  'warmup',
  async (job) => {
    const { userId } = job.data
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return

    // Check if user should upgrade phase
    const sevenDaysAgo = new Date(Date.now() - PHASE_UPGRADE_DAYS * 24 * 60 * 60 * 1000)
    const recentLogs = await prisma.warmupLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
    })

    if (recentLogs.length >= PHASE_UPGRADE_DAYS && user.warmupPhase < 5) {
      await prisma.user.update({
        where: { id: userId },
        data: { warmupPhase: user.warmupPhase + 1 },
      })
      console.log(`User ${userId} upgraded to warmup phase ${user.warmupPhase + 1}`)
    }
  },
  { connection: redisConnection }
)

worker.on('completed', (job) => {
  console.log(`Warmup job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Warmup job ${job?.id} failed:`, err)
})

console.log('Warmup worker started')
