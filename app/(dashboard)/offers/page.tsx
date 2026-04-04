'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Award, DollarSign, Calendar, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

interface Offer {
  id: string
  company: string
  role: string
  salary?: number
  equity?: string
  benefits: string[]
  deadline?: string
  status: string
  aiAnalysis?: string
  notes?: string
  createdAt: string
}

const STATUS_COLORS: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'destructive',
  negotiating: 'default',
}

export default function OffersPage() {
  const { toast } = useToast()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [form, setForm] = useState({
    company: '',
    role: '',
    salary: '',
    equity: '',
    deadline: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchOffers() {
      try {
        const res = await fetch('/api/jobs?type=offers')
        // Use a dedicated endpoint pattern if available; for now show empty state
        setOffers([])
      } catch {
        setOffers([])
      } finally {
        setLoading(false)
      }
    }
    fetchOffers()
  }, [])

  const addOffer = async () => {
    if (!form.company || !form.role) {
      toast({ title: 'Company and role are required', variant: 'destructive' })
      return
    }
    const newOffer: Offer = {
      id: Date.now().toString(),
      company: form.company,
      role: form.role,
      salary: form.salary ? parseFloat(form.salary) : undefined,
      equity: form.equity || undefined,
      benefits: [],
      deadline: form.deadline || undefined,
      status: 'pending',
      notes: form.notes || undefined,
      createdAt: new Date().toISOString(),
    }
    setOffers((prev) => [newOffer, ...prev])
    setForm({ company: '', role: '', salary: '', equity: '', deadline: '', notes: '' })
    setShowDialog(false)
    toast({ title: 'Offer added!', description: 'Use AI analysis to evaluate it.' })
  }

  const analyzeOffer = async (offer: Offer) => {
    setAnalyzing(offer.id)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'offer', offer }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, aiAnalysis: data.analysis } : o))
      toast({ title: 'Analysis complete!' })
    } catch {
      toast({ title: 'Analysis failed', variant: 'destructive' })
    } finally {
      setAnalyzing(null)
    }
  }

  const updateOfferStatus = (id: string, status: string) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
    toast({ title: `Offer ${status}` })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offers</h1>
          <p className="text-muted-foreground">Track and compare your job offers</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Offer
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-32" /></CardContent></Card>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold mb-1">No offers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              When you receive job offers, add them here to compare and get AI analysis.
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Your First Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{offer.role}</CardTitle>
                      <CardDescription>{offer.company}</CardDescription>
                    </div>
                    <Badge variant={STATUS_COLORS[offer.status] ?? 'secondary'}>
                      {offer.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {offer.salary && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">
                          ${offer.salary.toLocaleString()}/yr
                        </span>
                      </div>
                    )}
                    {offer.equity && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Equity:</span>
                        <span className="font-medium">{offer.equity}</span>
                      </div>
                    )}
                    {offer.deadline && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(offer.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {offer.aiAnalysis && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> AI Analysis
                      </p>
                      <p className="text-xs text-muted-foreground">{offer.aiAnalysis}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {offer.status === 'pending' && (
                      <>
                        <Button size="sm" variant="default" onClick={() => updateOfferStatus(offer.id, 'accepted')}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateOfferStatus(offer.id, 'negotiating')}>
                          Negotiate
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateOfferStatus(offer.id, 'declined')}>
                          Decline
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => analyzeOffer(offer)}
                      disabled={analyzing === offer.id}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {analyzing === offer.id ? 'Analyzing...' : 'AI Analyze'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      onClick={() => setOffers((prev) => prev.filter((o) => o.id !== offer.id))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Job Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Company *</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" />
              </div>
              <div className="space-y-1">
                <Label>Role *</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Senior Engineer" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Salary ($/yr)</Label>
                <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="150000" />
              </div>
              <div className="space-y-1">
                <Label>Equity</Label>
                <Input value={form.equity} onChange={(e) => setForm({ ...form, equity: e.target.value })} placeholder="0.5%" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Decision Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes about the offer..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addOffer}>Add Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
