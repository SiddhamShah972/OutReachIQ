'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Save, Upload, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

interface ProfileData {
  name: string
  email: string
  image?: string
  targetRole: string
  skills: string[]
  resumeUrl?: string
  gmailAddress?: string
  targetCompanies: string[]
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [companyInput, setCompanyInput] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) =>
        setProfile({
          name: session?.user?.name ?? '',
          email: session?.user?.email ?? '',
          image: session?.user?.image ?? undefined,
          targetRole: data.targetRole ?? '',
          skills: data.skills ?? [],
          resumeUrl: data.resumeUrl,
          gmailAddress: data.gmailAddress,
          targetCompanies: data.targetCompanies ?? [],
        })
      )
      .catch(() =>
        setProfile({
          name: session?.user?.name ?? '',
          email: session?.user?.email ?? '',
          targetRole: '',
          skills: [],
          targetCompanies: [],
        })
      )
      .finally(() => setLoading(false))
  }, [session])

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: profile.targetRole,
          skills: profile.skills,
          targetCompanies: profile.targetCompanies,
        }),
      })
      toast({ title: 'Profile updated!' })
      setEditing(false)
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    if (skillInput && profile && !profile.skills.includes(skillInput)) {
      setProfile({ ...profile, skills: [...profile.skills, skillInput] })
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    if (profile) setProfile({ ...profile, skills: profile.skills.filter((s) => s !== skill) })
  }

  const addCompany = () => {
    if (companyInput && profile && !profile.targetCompanies.includes(companyInput)) {
      setProfile({ ...profile, targetCompanies: [...profile.targetCompanies, companyInput] })
      setCompanyInput('')
    }
  }

  const removeCompany = (company: string) => {
    if (profile) setProfile({ ...profile, targetCompanies: profile.targetCompanies.filter((c) => c !== company) })
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-32" />
        <Card><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      {/* Identity */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.image ?? ''} alt={profile?.name} />
              <AvatarFallback className="text-xl">{profile?.name?.charAt(0) ?? 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{profile?.name}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              {profile?.gmailAddress && (
                <p className="text-xs text-muted-foreground mt-1">
                  Gmail: {profile.gmailAddress}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Job Preferences</CardTitle>
          <CardDescription>Used to personalize AI-generated emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Target Role</Label>
            <Input
              value={profile?.targetRole ?? ''}
              onChange={(e) => profile && setProfile({ ...profile, targetRole: e.target.value })}
              disabled={!editing}
              placeholder="e.g. Senior Software Engineer"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Skills</Label>
            {editing && (
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  placeholder="Add a skill..."
                />
                <Button variant="outline" size="icon" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(profile?.skills ?? []).map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                  {editing && (
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => removeSkill(skill)}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
              {(profile?.skills ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No skills added yet</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Target Companies</Label>
            {editing && (
              <div className="flex gap-2">
                <Input
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCompany()}
                  placeholder="e.g. Stripe, Airbnb..."
                />
                <Button variant="outline" size="icon" onClick={addCompany}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(profile?.targetCompanies ?? []).map((company) => (
                <Badge key={company} variant="outline">
                  {company}
                  {editing && (
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => removeCompany(company)}
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
              {(profile?.targetCompanies ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No target companies added yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume */}
      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>Your uploaded resume used for email personalization</CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.resumeUrl ? (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                  <span className="text-xs font-bold text-red-600">PDF</span>
                </div>
                <span className="text-sm font-medium">Resume uploaded</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('resumeUpdate')?.click()}
                >
                  <Upload className="mr-1 h-3 w-3" /> Update
                </Button>
              </div>
              <input id="resumeUpdate" type="file" accept=".pdf" className="hidden" />
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById('resumeUpload')?.click()}
            >
              <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload resume (PDF)</p>
              <input id="resumeUpload" type="file" accept=".pdf" className="hidden" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
