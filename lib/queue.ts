import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'

const redisUrl = process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379'

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: redisUrl.startsWith('rediss://') ? {} : undefined,
})

// Queue definitions
export const followupQueue = new Queue('followup', { connection: redisConnection })
export const warmupQueue = new Queue('warmup', { connection: redisConnection })
export const trackerQueue = new Queue('tracker', { connection: redisConnection })

// Job types
export interface FollowUpJobData {
  userId: string
  sequenceId: string
}

export interface WarmupJobData {
  userId: string
}

export interface TrackerJobData {
  userId: string
}

export async function scheduleFollowUp(userId: string, sequenceId: string, delayMs: number) {
  await followupQueue.add(
    'process-followup',
    { userId, sequenceId } as FollowUpJobData,
    { delay: delayMs, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  )
}

export async function scheduleWarmup(userId: string) {
  await warmupQueue.add(
    'process-warmup',
    { userId } as WarmupJobData,
    { repeat: { pattern: '0 9 * * *' }, attempts: 3 }
  )
}

export async function scheduleTracker(userId: string) {
  await trackerQueue.add(
    'check-replies',
    { userId } as TrackerJobData,
    { repeat: { pattern: '*/15 * * * *' }, attempts: 3 }
  )
}
