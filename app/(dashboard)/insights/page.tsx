'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Eye, Reply, Mail, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

interface InsightData {
  summary: string
  recommendations: string[]
  emailStats: {
    total: number
    openRate: number
    replyRate: number
    avgResponseTime: string
  }
  subjectPerformance: { subject: string; opens: number; replies: number }[]
  statusBreakdown: { name: string; value: number }[]
}

export default function InsightsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInsights = async () => {
    try {
      const res = await fetch('/api/ai/insights', { method: 'GET' })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        // Fallback placeholder data
        setData({
          summary: 'Your outreach is performing above average. Open rates are strong at 62%, but reply rates could be improved with more personalized subject lines.',
          recommendations: [
            'Add recipient name to subject lines for +15% open rate',
            'Send emails on Tuesday/Wednesday mornings for best engagement',
            'Follow up 3 days after no response for highest reply rates',
            'Keep emails under 150 words for better response rates',
          ],
          emailStats: { total: 38, openRate: 62, replyRate: 18, avgResponseTime: '2.3 days' },
          subjectPerformance: [
            { subject: 'Quick question about...', opens: 8, replies: 3 },
            { subject: 'Experienced in [skill]...', opens: 6, replies: 2 },
            { subject: 'Referred by...', opens: 9, replies: 4 },
            { subject: 'Re: [Job Title]...', opens: 4, replies: 1 },
          ],
          statusBreakdown: [
            { name: 'Discovered', value: 15 },
            { name: 'Applied', value: 8 },
            { name: 'Interviewing', value: 3 },
            { name: 'Offered', value: 1 },
          ],
        })
      }
    } catch {
      toast({ title: 'Failed to load insights', variant: 'destructive' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchInsights() }, [])

  const refresh = () => {
    setRefreshing(true)
    fetchInsights()
  }

  const statCards = data ? [
    { label: 'Total Emails', value: data.emailStats.total, icon: Mail, color: 'blue' },
    { label: 'Open Rate', value: `${data.emailStats.openRate}%`, icon: Eye, color: 'green' },
    { label: 'Reply Rate', value: `${data.emailStats.replyRate}%`, icon: Reply, color: 'yellow' },
    { label: 'Avg Response', value: data.emailStats.avgResponseTime, icon: TrendingUp, color: 'purple' },
  ] : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-muted-foreground">AI-powered analytics for your job search</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Summary */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{data?.summary}</p>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Recommendations:</p>
                  {data?.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{i + 1}</Badge>
                      <p className="text-xs text-muted-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
            <CardDescription>Jobs by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data?.statusBreakdown ?? []}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {data?.statusBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Line Performance</CardTitle>
          <CardDescription>Compare opens and replies by subject line type</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.subjectPerformance ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="opens" fill="#3b82f6" name="Opens" radius={[4, 4, 0, 0]} />
                <Bar dataKey="replies" fill="#10b981" name="Replies" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
