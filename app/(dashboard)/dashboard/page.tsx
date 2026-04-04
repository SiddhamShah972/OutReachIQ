import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingComplete: true },
  })

  if (!user?.onboardingComplete) {
    redirect('/onboarding')
  }

  return (
    <div>
      {/* your existing dashboard UI */}
      Dashboard
    </div>
  )
}