import { prisma } from './prisma'
import { decrypt, encrypt } from './crypto'

const GMAIL_SEND_LIMITS: Record<number, number> = {
  1: 5,
  2: 10,
  3: 20,
  4: 30,
  5: 50,
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  if (!user.gmailAccessToken || !user.gmailRefreshToken) {
    throw new Error('No Gmail tokens found for user')
  }

  const now = new Date()
  const expiry = user.gmailTokenExpiry || new Date(0)

  // If token is still valid (5 min buffer)
  if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
    return decrypt(user.gmailAccessToken)
  }

  // Refresh the token
  const refreshToken = decrypt(user.gmailRefreshToken)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`)
  }

  const data = await response.json()
  const newExpiry = new Date(Date.now() + data.expires_in * 1000)

  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailAccessToken: encrypt(data.access_token),
      gmailTokenExpiry: newExpiry,
    },
  })

  return data.access_token
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function buildRfc2822Message({
  to,
  from,
  subject,
  body,
  pixelId,
  attachmentBase64,
  attachmentName,
  attachmentMime,
}: {
  to: string
  from: string
  subject: string
  body: string
  pixelId: string
  attachmentBase64?: string
  attachmentName?: string
  attachmentMime?: string
}): string {
  const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${pixelId}" width="1" height="1" style="display:none" />`
  const htmlBody = `${body.replace(/\n/g, '<br>')}\n${trackingPixel}`

  if (!attachmentBase64) {
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
    ].join('\r\n')
    return encodeBase64Url(message)
  }

  const boundary = `boundary_${Date.now()}`
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
    '',
    `--${boundary}`,
    `Content-Type: ${attachmentMime || 'application/octet-stream'}; name="${attachmentName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    '',
    attachmentBase64,
    '',
    `--${boundary}--`,
  ].join('\r\n')
  return encodeBase64Url(message)
}

export async function sendEmail({
  userId,
  to,
  subject,
  body,
  jobId,
  sequenceId,
  isWarmup = false,
  attachmentBase64,
  attachmentName,
  attachmentMime,
}: {
  userId: string
  to: string
  subject: string
  body: string
  jobId?: string
  sequenceId?: string
  isWarmup?: boolean
  attachmentBase64?: string
  attachmentName?: string
  attachmentMime?: string
}): Promise<{ gmailMsgId: string; threadId: string; pixelId: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  // Check daily send limit
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sentToday = await prisma.emailSent.count({
    where: { userId, sentAt: { gte: today }, isWarmup: false },
  })

  const warmupLimit = GMAIL_SEND_LIMITS[user.warmupPhase] || 5
  const limit = isWarmup ? warmupLimit : user.dailySendLimit

  if (sentToday >= limit) {
    throw new Error(`Daily send limit reached (${limit})`)
  }

  const pixelId = crypto.randomUUID()
  const from = user.gmailAddress || user.email || ''

  async function doSend(retry = false): Promise<{ id: string; threadId: string }> {
    const accessToken = await getValidAccessToken(userId)
    const rawMessage = buildRfc2822Message({
      to,
      from,
      subject,
      body,
      pixelId,
      attachmentBase64,
      attachmentName,
      attachmentMime,
    })

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage }),
      }
    )

    if (response.status === 401 && !retry) {
      await prisma.user.update({
        where: { id: userId },
        data: { gmailTokenExpiry: new Date(0) },
      })
      return doSend(true)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gmail send failed: ${errorText}`)
    }

    return response.json()
  }

  const { id: gmailMsgId, threadId } = await doSend()

  // Save to database
  await prisma.emailSent.create({
    data: {
      userId,
      jobId,
      sequenceId,
      to,
      subject,
      body,
      gmailMsgId,
      threadId,
      pixelId,
      isWarmup,
    },
  })

  // Update warmup log
  if (isWarmup) {
    await prisma.warmupLog.upsert({
      where: { id: `${userId}-${today.toISOString().split('T')[0]}` },
      create: {
        id: `${userId}-${today.toISOString().split('T')[0]}`,
        userId,
        date: today,
        emailsSent: 1,
        phase: user.warmupPhase,
      },
      update: { emailsSent: { increment: 1 } },
    })
  }

  return { gmailMsgId, threadId, pixelId }
}

export async function checkForReplies(userId: string, threadId: string): Promise<{
  hasReply: boolean
  replyBody?: string
  replyFrom?: string
} | null> {
  try {
    const accessToken = await getValidAccessToken(userId)
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!response.ok) return null

    const thread = await response.json()
    const messages = thread.messages || []

    if (messages.length <= 1) return { hasReply: false }

    // Get the latest message (not our own)
    const latestMsg = messages[messages.length - 1]
    const fromHeader = latestMsg.payload?.headers?.find(
      (h: { name: string }) => h.name === 'From'
    )?.value || ''

    const user = await prisma.user.findUnique({ where: { id: userId } })
    const isOurEmail = fromHeader.includes(user?.gmailAddress || user?.email || '')

    if (isOurEmail) return { hasReply: false }

    // Extract body
    let body = ''
    const parts = latestMsg.payload?.parts || [latestMsg.payload]
    for (const part of parts) {
      if (part?.mimeType === 'text/plain' && part?.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8')
        break
      }
    }

    return { hasReply: true, replyBody: body, replyFrom: fromHeader }
  } catch {
    return null
  }
}
