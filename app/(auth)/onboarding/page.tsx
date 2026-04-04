'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Upload, ArrowRight, ArrowLeft, Briefcase, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const STEPS = ['Welcome', 'Resume', 'Gmail', 'Complete']

const SUGGESTED_SKILLS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Next.js', 'AWS', 'Docker',
  'GraphQL', 'PostgreSQL', 'Redis', 'Kubernetes', 'Go', 'Rust', 'Vue.js',
]

interface Step1Data {
  targetRole: string
  skills: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [targetRole, setTargetRole] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [gmailVerified, setGmailVerified] = useState(false)

  const progress = ((step + 1) / STEPS.length) * 100

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill])
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const handleResumeUpload = async () => {
    if (!resumeFile) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', resumeFile)
      const res = await fetch('/api/upload/resume', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      toast({ title: 'Resume uploaded!', description: 'Your resume has been processed.' })
      setStep(2)
    } catch {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, skills }),
      })
      setStep(3)
    } catch {
      toast({ title: 'Error', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? 'text-primary font-medium' : ''}>{s}</span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Welcome + Role/Skills */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <CardTitle>Tell us about your goals</CardTitle>
                  </div>
                  <CardDescription>
                    Help us personalize your job search and email outreach.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetRole">Target Role</Label>
                    <Input
                      id="targetRole"
                      placeholder="e.g. Senior Software Engineer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill..."
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSkill(skillInput)}
                      />
                      <Button variant="outline" onClick={() => addSkill(skillInput)}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 6).map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                          onClick={() => addSkill(s)}
                        >
                          + {s}
                        </Badge>
                      ))}
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skills.map((s) => (
                          <Badge key={s} className="cursor-pointer" onClick={() => removeSkill(s)}>
                            {s} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setStep(1)}
                    disabled={!targetRole || skills.length === 0}
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 1: Resume Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <CardTitle>Upload your resume</CardTitle>
                  </div>
                  <CardDescription>
                    We&apos;ll extract your experience to personalize email templates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => document.getElementById('resumeInput')?.click()}
                  >
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    {resumeFile ? (
                      <p className="text-sm font-medium text-primary">{resumeFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Click to upload resume</p>
                        <p className="text-xs text-muted-foreground">PDF up to 10MB</p>
                      </>
                    )}
                    <input
                      id="resumeInput"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(0)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleResumeUpload}
                      disabled={!resumeFile || loading}
                    >
                      {loading ? 'Uploading...' : 'Upload & Continue'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(2)}>
                    Skip for now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Gmail Verification */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle>Connect Gmail</CardTitle>
                  </div>
                  <CardDescription>
                    OutreachIQ sends emails on your behalf via your Gmail account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg border ${gmailVerified ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <div className="flex items-center gap-3">
                      {gmailVerified ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Gmail Authorization</p>
                        <p className="text-xs text-muted-foreground">
                          {gmailVerified ? 'Connected successfully' : 'Grant permission to send emails'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!gmailVerified && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setGmailVerified(true)}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Authorize Gmail Access
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleComplete}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Complete Setup'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Card className="text-center">
                <CardContent className="pt-8 pb-8 space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
                  <p className="text-muted-foreground">
                    OutreachIQ is ready to help you land your dream job. Start by exploring available jobs.
                  </p>
                  <Button className="w-full" size="lg" onClick={() => router.push('/')}>
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
