'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Briefcase, Mail, TrendingUp, Eye, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const emailChartData = [
  { day: 'Mon', sent: 4, opened: 2, replied: 1 },
  { day: 'Tue', sent: 6, opened: 4, replied: 2 },
  { day: 'Wed', sent: 8, opened: 5, replied: 1 },
  { day: 'Thu', sent: 5, opened: 3, replied: 2 },
  { day: 'Fri', sent: 10, opened: 7, replied: 3 },
  { day: 'Sat', sent: 3, opened: 2, replied: 0 },
  { day: 'Sun', sent: 2, opened: 1, replied: 1 },
]

interface Stats {
  totalJobs: number
  emailsSent: number
  openRate: number
  replyRate: number
  activeSequences: number
  offersReceived: number
}

interface RecentJob {
  id: string
  title: string
  company: string
  status: string
  matchScore?: number
  createdAt: string
}

const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  discovered: 'secondary',
  applied: 'default',
  interviewing: 'warning',
  offered: 'success',
  rejected: 'destructive',
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes] = await Promise.all([
          fetch('/api/jobs?limit=5'),
        ])
        const jobs = jobsRes.ok ? await jobsRes.json() : []
        setRecentJobs(jobs.slice(0, 5))
        setStats({
          totalJobs: jobs.length,
          emailsSent: 38,
          openRate: 62,
          replyRate: 18,
          activeSequences: 3,
          offersReceived: 1,
        })
      } catch {
        setStats({ totalJobs: 0, emailsSent: 0, openRate: 0, replyRate: 0, activeSequences: 0, offersReceived: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const statCards = [
    {
      title: 'Total Jobs',
      value: stats?.totalJobs ?? 0,
      icon: Briefcase,
      change: '+12%',
      up: true,
      href: '/jobs',
    },
    {
      title: 'Emails Sent',
      value: stats?.emailsSent ?? 0,
      icon: Mail,
      change: '+8%',
      up: true,
      href: '/compose',
    },
    {
      title: 'Open Rate',
      value: `${stats?.openRate ?? 0}%`,
      icon: Eye,
      change: '+5%',
      up: true,
      href: '/insights',
    },
    {
      title: 'Reply Rate',
      value: `${stats?.replyRate ?? 0}%`,
      icon: TrendingUp,
      change: '-2%',
      up: false,
      href: '/insights',
    },
    {
      title: 'Active Sequences',
      value: stats?.activeSequences ?? 0,
      icon: Zap,
      change: '+1',
      up: true,
      href: '/sequences',
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-muted-foreground">Your job search at a glance</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <div className="flex items-center mt-1">
                      {stat.up ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs ${stat.up ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.change} this week
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Activity Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Email Activity</CardTitle>
              <CardDescription>Sent, opened, and replied this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={emailChartData}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sent" stroke="#3b82f6" fill="url(#colorSent)" strokeWidth={2} name="Sent" />
                  <Area type="monotone" dataKey="opened" stroke="#10b981" fill="url(#colorOpened)" strokeWidth={2} name="Opened" />
                  <Area type="monotone" dataKey="replied" stroke="#f59e0b" fill="none" strokeWidth={2} name="Replied" strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Jobs */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>Latest discovered opportunities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/jobs">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Briefcase className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No jobs yet</p>
                  <Button variant="ghost" size="sm" asChild className="mt-2">
                    <Link href="/jobs">Browse jobs</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentJobs.map((job) => (
                    <div key={job.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {job.company.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company}</p>
                      </div>
                      <Badge variant={statusColors[job.status] ?? 'secondary'} className="shrink-0 text-xs">
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
