'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, Send, RefreshCw, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Job {
  id: string
  title: string
  company: string
  companyEmail?: string
}

function ComposeContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('jobId') ?? '')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  const selectedJob = jobs.find((j) => j.id === selectedJobId)

  useEffect(() => {
    fetch('/api/jobs').then((r) => r.json()).then(setJobs).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedJob?.companyEmail) {
      setTo(selectedJob.companyEmail)
    }
  }, [selectedJob])

  const generateEmail = useCallback(async () => {
    if (!selectedJobId) {
      toast({ title: 'Select a job first', variant: 'destructive' })
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setSubject(data.subject ?? '')
      setBody(data.body ?? '')
      toast({ title: 'Email generated!', description: 'Review and send when ready.' })
    } catch {
      toast({ title: 'Generation failed', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }, [selectedJobId, toast])

  const sendEmail = async () => {
    if (!to || !subject || !body) {
      toast({ title: 'Fill all fields', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId || undefined, to, subject, body }),
      })
      if (!res.ok) throw new Error('Send failed')
      toast({ title: 'Email sent!', description: `Sent to ${to}` })
      setTo('')
      setSubject('')
      setBody('')
      setSelectedJobId('')
    } catch {
      toast({ title: 'Failed to send', description: 'Check your Gmail connection.', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const copyBody = async () => {
    await navigator.clipboard.writeText(body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-3xl"
    >
      <div>
        <h1 className="text-2xl font-bold">Compose</h1>
        <p className="text-muted-foreground">Write or AI-generate outreach emails</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Email Generator
          </CardTitle>
          <CardDescription>
            Select a job and let AI craft a personalized cold email using your resume.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Job (optional)</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job to personalize..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title} at {j.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedJob && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedJob.company}</Badge>
              {selectedJob.companyEmail && (
                <Badge variant="outline">{selectedJob.companyEmail}</Badge>
              )}
            </div>
          )}

          <Button
            variant="outline"
            onClick={generateEmail}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {generating ? 'Generating...' : 'Generate with AI'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              placeholder="recruiter@company.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Experienced Engineer – Interested in [Role]"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Body</Label>
              {body && (
                <Button variant="ghost" size="sm" onClick={copyBody}>
                  {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
            <Textarea
              id="body"
              placeholder="Your email body..."
              className="min-h-[200px] font-mono text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={sendEmail}
            disabled={sending || !to || !subject || !body}
          >
            {sending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <ComposeContent />
    </Suspense>
  )
}
