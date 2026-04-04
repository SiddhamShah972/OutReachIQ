import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(
  req: NextRequest,
  { params }: { params: { pixelId: string } }
) {
  try {
    await prisma.emailSent.update({
      where: { pixelId: params.pixelId },
      data: { openedAt: new Date() },
    })
  } catch {
    // Ignore errors (pixel might be invalid)
  }

  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
}
