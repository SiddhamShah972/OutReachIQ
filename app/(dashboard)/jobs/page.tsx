'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Filter, ExternalLink, Mail, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  company: string
  location?: string
  salary?: string
  status: string
  matchScore?: number
  skills: string[]
  skillsGap: string[]
  companyEmail?: string
  createdAt: string
  url?: string
}

const STATUS_OPTIONS = ['all', 'discovered', 'applied', 'interviewing', 'offered', 'rejected']
const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  discovered: 'secondary',
  applied: 'default',
  interviewing: 'warning',
  offered: 'success',
  rejected: 'destructive',
}

export default function JobsPage() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data: unknown = await res.json()
      const normalizedJobs = Array.isArray(data)
        ? data
        : (data && typeof data === 'object' && Array.isArray((data as { jobs?: unknown }).jobs))
          ? (data as { jobs: Job[] }).jobs
          : []
      setJobs(normalizedJobs)
    } catch {
      toast({ title: 'Error', description: 'Failed to load jobs', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status } : j))
      toast({ title: 'Status updated' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    }
  }

  const deleteJob = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
      setJobs((prev) => prev.filter((j) => j.id !== id))
      toast({ title: 'Job removed' })
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const filtered = jobs.filter((j) =>
    (j.title + j.company).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">{jobs.length} opportunities tracked</p>
        </div>
        <Button asChild>
          <Link href="/compose">
            <Plus className="mr-2 h-4 w-4" /> Add Job
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No jobs found. Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{job.title}</h3>
                        {job.matchScore && (
                          <Badge variant="success" className="shrink-0">
                            {job.matchScore}% match
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {job.company} {job.location && `· ${job.location}`} {job.salary && `· ${job.salary}`}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 5).map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                        {job.skillsGap.length > 0 && (
                          <Badge variant="warning" className="text-xs">
                            Gap: {job.skillsGap.slice(0, 2).join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select value={job.status} onValueChange={(v) => updateStatus(job.id, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <Badge variant={statusColors[job.status] ?? 'secondary'} className="text-xs">
                            {job.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.filter((s) => s !== 'all').map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {job.companyEmail && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/compose?jobId=${job.id}`}>
                            <Mail className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {job.url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteJob(job.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
