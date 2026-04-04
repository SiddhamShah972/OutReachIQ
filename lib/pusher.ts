import Pusher from 'pusher'
import PusherClient from 'pusher-js'

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export const getPusherClient = (() => {
  let client: PusherClient | null = null
  return () => {
    if (typeof window === 'undefined') return null
    if (!client) {
      client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      })
    }
    return client
  }
})()

export async function broadcastToUser(
  userId: string,
  event: string,
  data: object
): Promise<void> {
  await pusherServer.trigger(`private-user-${userId}`, event, data)
}
