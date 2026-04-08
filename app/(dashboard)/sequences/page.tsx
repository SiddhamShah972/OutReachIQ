'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Zap, Pause, Play, Trash2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

interface SequenceStep {
  day: number
  subject: string
  body: string
}

interface Sequence {
  id: string
  name: string
  status: string
  currentStep: number
  steps: SequenceStep[]
  nextRunAt?: string
  job?: { title: string; company: string }
  createdAt: string
}

export default function SequencesPage() {
  const { toast } = useToast()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSequences() {
      try {
        const res = await fetch('/api/jobs')
        if (!res.ok) throw new Error()
        // Sequences are job-related; show placeholder if no dedicated API
        setSequences([])
      } catch {
        setSequences([])
      } finally {
        setLoading(false)
      }
    }
    fetchSequences()
  }, [])

  const toggleSequence = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    setSequences((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus } : s))
    toast({ title: `Sequence ${newStatus}` })
  }

  const deleteSequence = async (id: string) => {
    setSequences((prev) => prev.filter((s) => s.id !== id))
    toast({ title: 'Sequence deleted' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sequences</h1>
          <p className="text-muted-foreground">Automated multi-step follow-up campaigns</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Sequence
        </Button>
      </div>

      {/* How It Works */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">How Sequences Work</h3>
              <p className="text-sm text-muted-foreground">
                Create automated follow-up chains for job applications. Each step sends an email on a scheduled
                delay. AI generates personalized content for each step based on previous responses.
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600">1</div>
                  <span>Initial Email</span>
                </div>
                <ChevronRight className="h-3 w-3" />
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600">2</div>
                  <span>Day 3 Follow-up</span>
                </div>
                <ChevronRight className="h-3 w-3" />
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600">3</div>
                  <span>Day 7 Final</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold mb-1">No sequences yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a sequence to automate follow-ups for a job application.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Your First Sequence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <Card key={seq.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{seq.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={seq.status === 'active' ? 'success' : 'secondary'}>
                      {seq.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleSequence(seq.id, seq.status)}
                    >
                      {seq.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteSequence(seq.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {seq.job && (
                  <CardDescription>{seq.job.title} at {seq.job.company}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Step {seq.currentStep + 1} of {seq.steps.length}</span>
                  {seq.nextRunAt && (
                    <span className="text-muted-foreground">· Next: {new Date(seq.nextRunAt).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {seq.steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < seq.currentStep ? 'bg-primary' : i === seq.currentStep ? 'bg-primary/50' : 'bg-gray-200 dark:bg-gray-700'}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
