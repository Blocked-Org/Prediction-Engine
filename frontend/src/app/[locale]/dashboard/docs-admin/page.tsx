'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { DEFAULT_DOCS_SCHEDULE, type DocsSchedule, type DocsConfigData } from '@/lib/docs-config'
import { Save, ExternalLink, CalendarClock, ShieldAlert, Eye, EyeOff } from 'lucide-react'

export default function DocsAdminPage() {
  const [schedule, setSchedule] = useState<DocsSchedule>(DEFAULT_DOCS_SCHEDULE)
  const [config, setConfig] = useState<DocsConfigData | null>(null)
  const [isSaving, setIsSaving] = useState(false)


  useEffect(() => {
    fetch('/api/docs-config')
      .then(res => res.json())
      .then(data => {
        if (data && data.schedule) {
          setSchedule(data.schedule)
          setConfig(data)
        }
      })
      .catch(err => console.error("Failed to load config", err))
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload: DocsConfigData = {
        schedule,
        team_members: config?.team_members || [],
        pitch_sections: config?.pitch_sections || []
      }
      const res = await fetch('/api/docs-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error("Save failed")
      alert('Documentation settings saved successfully')
    } catch (e) {
      alert('Failed to save settings')
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = () => {
    window.open('/en/docs', '_blank')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Documentation Settings</h1>
        <p className="text-muted-foreground">Manage the visibility, scheduling, and content of the public /docs page.</p>
      </div>

      <div className="grid gap-8">
        
        {/* Master Toggle Card */}
        <Card className="border-primary/20 shadow-md">
          <CardHeader className="bg-primary/5 border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  Master Visibility
                </CardTitle>
                <CardDescription className="mt-1">
                  Absolute control over whether the documentation is accessible.
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2 bg-background p-2 rounded-lg border border-border/50">
                <Switch
                  id="master-toggle"
                  checked={schedule.enabled}
                  onCheckedChange={(c) => setSchedule({ ...schedule, enabled: c })}
                />
                <Label htmlFor="master-toggle" className="font-bold mr-2">
                  {schedule.enabled ? (
                    <span className="text-emerald-500 flex items-center gap-1"><Eye className="w-4 h-4"/> ENABLED</span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1"><EyeOff className="w-4 h-4"/> DISABLED</span>
                  )}
                </Label>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Scheduling Card */}
        <Card className={`transition-opacity ${!schedule.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              Availability Window
            </CardTitle>
            <CardDescription>
              Set the exact date and time when the documentation becomes publicly accessible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Override Schedule</Label>
                <p className="text-sm text-muted-foreground">
                  Bypass the dates below and make it instantly available right now.
                </p>
              </div>
              <Switch
                checked={schedule.overrideActive}
                onCheckedChange={(c) => setSchedule({ ...schedule, overrideActive: c })}
              />
            </div>

            <div className={`grid md:grid-cols-2 gap-6 ${schedule.overrideActive ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={schedule.startDate.substring(0, 16)}
                  onChange={(e) => setSchedule({ ...schedule, startDate: e.target.value + ':00+06:00' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={schedule.endDate.substring(0, 16)}
                  onChange={(e) => setSchedule({ ...schedule, endDate: e.target.value + ':00+06:00' })}
                />
              </div>
            </div>

          </CardContent>
          <CardFooter className="bg-muted/20 border-t border-border/40 py-4 flex justify-between">
            <Button variant="outline" onClick={handlePreview} className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Preview Live Site
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}
