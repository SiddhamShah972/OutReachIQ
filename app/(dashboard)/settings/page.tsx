'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, RefreshCw, Mail, Sliders, Bell, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

interface Settings {
  dailySendLimit: number
  warmupPhase: number
  gmailAddress?: string
  targetRole?: string
  notifications: {
    emailOpened: boolean
    emailReplied: boolean
    weeklyDigest: boolean
  }
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) =>
        setSettings({
          dailySendLimit: data.dailySendLimit ?? 20,
          warmupPhase: data.warmupPhase ?? 1,
          gmailAddress: data.gmailAddress,
          targetRole: data.targetRole,
          notifications: {
            emailOpened: true,
            emailReplied: true,
            weeklyDigest: true,
          },
        })
      )
      .catch(() =>
        setSettings({
          dailySendLimit: 20,
          warmupPhase: 1,
          notifications: { emailOpened: true, emailReplied: true, weeklyDigest: false },
        })
      )
      .finally(() => setLoading(false))
  }, [])

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailySendLimit: settings.dailySendLimit,
          targetRole: settings.targetRole,
        }),
      })
      toast({ title: 'Settings saved!' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" />Email</TabsTrigger>
          <TabsTrigger value="sending"><Sliders className="mr-2 h-4 w-4" />Sending</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Account</CardTitle>
              <CardDescription>Configure your Gmail sending account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Gmail Address</Label>
                <Input
                  value={settings?.gmailAddress ?? ''}
                  placeholder="you@gmail.com"
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Connected via Google OAuth. Sign out and back in to change accounts.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Target Role</Label>
                <Input
                  value={settings?.targetRole ?? ''}
                  placeholder="e.g. Senior Software Engineer"
                  onChange={(e) => settings && setSettings({ ...settings, targetRole: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sending Limits</CardTitle>
              <CardDescription>Control your daily email sending volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Daily Send Limit</Label>
                <Select
                  value={String(settings?.dailySendLimit ?? 20)}
                  onValueChange={(v) => settings && setSettings({ ...settings, dailySendLimit: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 30, 40, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} emails/day</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher limits require a higher warmup phase. Currently in Phase {settings?.warmupPhase}.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Warmup Phase</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${((settings?.warmupPhase ?? 1) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">Phase {settings?.warmupPhase}/5</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Warmup phase advances automatically based on email engagement.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose when to receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailOpened' as const, label: 'Email Opened', description: 'Notify when a recipient opens your email' },
                { key: 'emailReplied' as const, label: 'Email Replied', description: 'Notify when you receive a reply' },
                { key: 'weeklyDigest' as const, label: 'Weekly Digest', description: 'Weekly summary of your outreach performance' },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={settings?.notifications[key] ?? false}
                    onCheckedChange={(checked) =>
                      settings && setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, [key]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Account secured with Google OAuth
                  </p>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Your Gmail tokens are encrypted at rest using AES-256.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Data & Privacy</p>
                <p className="text-xs text-muted-foreground">
                  OutreachIQ only accesses your Gmail to send emails you explicitly compose.
                  We never read your existing emails.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
