'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

const STAGES = [
  { id: 'discovered', label: 'Discovered', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'applied', label: 'Applied', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 'offered', label: 'Offered', color: 'bg-green-50 dark:bg-green-900/20' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-50 dark:bg-red-900/20' },
]

interface Job {
  id: string
  title: string
  company: string
  matchScore?: number
  status: string
}

function JobCard({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <p className="font-medium text-sm">{job.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
          {job.matchScore && (
            <Badge variant="success" className="mt-2 text-xs">{job.matchScore}% match</Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PipelinePage() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeJob, setActiveJob] = useState<Job | null>(null)

  useEffect(() => {
    fetch('/api/jobs')
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to fetch jobs (${r.status} ${r.statusText}). Please try again.`)
        const data = await r.json()
        if (data == null) throw new Error('Jobs response is null or undefined')
        if (Array.isArray(data)) return data
        const maybeJobs = typeof data === 'object' ? (data as { jobs?: unknown }).jobs : undefined
        if (Array.isArray(maybeJobs)) return maybeJobs as Job[]
        throw new Error('Unexpected jobs response shape')
      })
      .then(setJobs)
      .catch(() => toast({ title: 'Error loading jobs', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleDragStart = (event: DragStartEvent) => {
    const job = jobs.find((j) => j.id === event.active.id)
    setActiveJob(job ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveJob(null)
    const { active, over } = event
    if (!over) return

    const draggedJob = jobs.find((j) => j.id === active.id)
    const targetStage = STAGES.find((s) => s.id === over.id)

    if (draggedJob && targetStage && draggedJob.status !== targetStage.id) {
      setJobs((prev) => prev.map((j) => j.id === draggedJob.id ? { ...j, status: targetStage.id } : j))
      try {
        await fetch(`/api/jobs/${draggedJob.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStage.id }),
        })
      } catch {
        setJobs((prev) => prev.map((j) => j.id === draggedJob.id ? { ...j, status: draggedJob.status } : j))
        toast({ title: 'Failed to update status', variant: 'destructive' })
      }
    }
  }

  const jobsByStage = (stageId: string) => jobs.filter((j) => j.status === stageId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">Drag jobs between stages to update their status</p>
      </div>

      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto">
          {STAGES.map((stage) => {
            const stageJobs = jobsByStage(stage.id)
            return (
              <div key={stage.id} className={`rounded-lg p-3 min-h-[400px] ${stage.color}`} id={stage.id}>
                <CardHeader className="p-0 mb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{stage.label}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{stageJobs.length}</Badge>
                  </div>
                </CardHeader>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
                  </div>
                ) : (
                  <SortableContext items={stageJobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {stageJobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                      {stageJobs.length === 0 && (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                          Drop jobs here
                        </div>
                      )}
                    </div>
                  </SortableContext>
                )}
              </div>
            )
          })}
        </div>
        <DragOverlay>
          {activeJob && (
            <Card className="shadow-xl rotate-2">
              <CardContent className="p-3">
                <p className="font-medium text-sm">{activeJob.title}</p>
                <p className="text-xs text-muted-foreground">{activeJob.company}</p>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </motion.div>
  )
}
