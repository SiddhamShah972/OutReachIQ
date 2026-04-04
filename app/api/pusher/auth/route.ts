import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')!
  const channelName = params.get('channel_name')!

  // Only allow users to subscribe to their own channel
  if (!channelName.includes(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
    user_id: session.user.id,
  })

  return NextResponse.json(authResponse)
}
