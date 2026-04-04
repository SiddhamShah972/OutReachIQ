import { Worker } from 'bullmq'
import { prisma } from '../lib/prisma'
import { sendEmail } from '../lib/gmail'
import { redisConnection, FollowUpJobData } from '../lib/queue'

const worker = new Worker<FollowUpJobData>(
  'followup',
  async (job) => {
    const { userId, sequenceId } = job.data
    
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: { job: true },
    })

    if (!sequence || sequence.status !== 'active') return

    const steps = sequence.steps as Array<{
      delay: number
      subject: string
      body: string
    }>

    const currentStep = steps[sequence.currentStep]
    if (!currentStep) {
      await prisma.sequence.update({
        where: { id: sequenceId },
        data: { status: 'completed' },
      })
      return
    }

    // Send the email
    if (sequence.job?.companyEmail) {
      await sendEmail({
        userId,
        to: sequence.job.companyEmail,
        subject: currentStep.subject,
        body: currentStep.body,
        jobId: sequence.jobId || undefined,
        sequenceId,
      })

      // Advance to next step
      const nextStep = sequence.currentStep + 1
      await prisma.sequence.update({
        where: { id: sequenceId },
        data: {
          currentStep: nextStep,
          nextRunAt: nextStep < steps.length
            ? new Date(Date.now() + (steps[nextStep].delay || 3 * 24 * 60 * 60 * 1000))
            : null,
          status: nextStep >= steps.length ? 'completed' : 'active',
        },
      })
    }
  },
  { connection: redisConnection }
)

worker.on('completed', (job) => {
  console.log(`Follow-up job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Follow-up job ${job?.id} failed:`, err)
})

console.log('Follow-up worker started')
