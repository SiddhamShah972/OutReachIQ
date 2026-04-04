'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Thermometer, TrendingUp, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface WarmupData {
  phase: number
  dailyLimit: number
  emailsSentToday: number
  totalWarmupEmails: number
  recentLogs: { date: string; emailsSent: number; phase: number }[]
}

const PHASE_INFO = [
  { phase: 1, label: 'Cold Start', limit: 5, description: 'Building initial reputation' },
  { phase: 2, label: 'Warming Up', limit: 10, description: 'Establishing sending patterns' },
  { phase: 3, label: 'Moderate', limit: 20, description: 'Consistent activity detected' },
  { phase: 4, label: 'Active', limit: 40, description: 'Strong sender reputation' },
  { phase: 5, label: 'Full Send', limit: 80, description: 'Maximum deliverability' },
]

export default function WarmupPage() {
  const [data, setData] = useState<WarmupData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWarmup() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error()
        const settings = await res.json()
        setData({
          phase: settings.warmupPhase ?? 1,
          dailyLimit: settings.dailySendLimit ?? 20,
          emailsSentToday: 3,
          totalWarmupEmails: 47,
          recentLogs: [
            { date: 'Mon', emailsSent: 5, phase: 1 },
            { date: 'Tue', emailsSent: 5, phase: 1 },
            { date: 'Wed', emailsSent: 8, phase: 2 },
            { date: 'Thu', emailsSent: 8, phase: 2 },
            { date: 'Fri', emailsSent: 10, phase: 2 },
            { date: 'Sat', emailsSent: 10, phase: 2 },
            { date: 'Sun', emailsSent: 3, phase: 2 },
          ],
        })
      } catch {
        setData({
          phase: 1,
          dailyLimit: 5,
          emailsSentToday: 0,
          totalWarmupEmails: 0,
          recentLogs: [],
        })
      } finally {
        setLoading(false)
      }
    }
    fetchWarmup()
  }, [])

  const currentPhaseInfo = PHASE_INFO.find((p) => p.phase === (data?.phase ?? 1)) ?? PHASE_INFO[0]
  const progressToNextPhase = data ? Math.min((data.totalWarmupEmails / 50) * 100, 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">Email Warmup</h1>
        <p className="text-muted-foreground">Gradually increase sending volume to build inbox reputation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Thermometer className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Phase</p>
                    <p className="text-xl font-bold">Phase {data?.phase}</p>
                    <p className="text-xs text-muted-foreground">{currentPhaseInfo.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Limit</p>
                    <p className="text-xl font-bold">{data?.dailyLimit} emails/day</p>
                    <p className="text-xs text-muted-foreground">{data?.emailsSentToday} sent today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Warmup</p>
                    <p className="text-xl font-bold">{data?.totalWarmupEmails}</p>
                    <p className="text-xs text-muted-foreground">warmup emails sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Progression</CardTitle>
          <CardDescription>Complete warmup cycles to unlock higher sending limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress to Phase {(data?.phase ?? 1) + 1}</span>
              <span className="text-muted-foreground">{Math.round(progressToNextPhase)}%</span>
            </div>
            <Progress value={progressToNextPhase} />
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PHASE_INFO.map((phase) => {
              const isComplete = (data?.phase ?? 1) > phase.phase
              const isCurrent = (data?.phase ?? 1) === phase.phase
              return (
                <div
                  key={phase.phase}
                  className={`p-3 rounded-lg border text-center ${
                    isComplete
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : isCurrent
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 opacity-50'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
                  ) : isCurrent ? (
                    <Thermometer className="h-4 w-4 text-primary mx-auto mb-1" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                  )}
                  <p className="text-xs font-medium">Phase {phase.phase}</p>
                  <p className="text-xs text-muted-foreground">{phase.limit}/day</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Warmup Activity</CardTitle>
            <Badge variant="outline" className="flex items-center gap-1">
              <Info className="h-3 w-3" /> Auto-managed
            </Badge>
          </div>
          <CardDescription>Daily warmup emails sent this week</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.recentLogs ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="emailsSent" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} name="Emails Sent" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
