'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Send, Globe2, Zap, Shield, Clock } from 'lucide-react'

export default function ContactPage() {
  const t = useTranslations('ContactPage')

  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (formData.name.trim().length < 2) {
      newErrors.name = t('errors.name')
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = t('errors.email')
    }
    
    if (formData.message.trim().length < 10) {
      newErrors.message = t('errors.message')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    // Simulate API Submission
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
      setFormData({ name: '', email: '', message: '' })
    }, 1500)
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-background font-sans overflow-x-hidden" suppressHydrationWarning>
      <Navbar />

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] right-[20%] w-[45%] h-[45%] rounded-full bg-primary/10 blur-[150px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <main className="z-10 flex-grow pt-24 px-4 md:px-8 pb-32 flex flex-col items-center">
        
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center py-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent pb-2">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Split Layout Container */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Trust Markers */}
          <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-left-8 duration-1000 delay-150">
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold text-foreground">{t('why_title')}</h2>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                {t('why_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-sm">
                <Clock className="h-6 w-6 text-primary mb-1" />
                <h4 className="font-semibold text-foreground">{t('card_fast_title')}</h4>
                <p className="text-sm text-muted-foreground">{t('card_fast_desc')}</p>
              </div>
              
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-sm">
                <Shield className="h-6 w-6 text-emerald-500 mb-1" />
                <h4 className="font-semibold text-foreground">{t('card_privacy_title')}</h4>
                <p className="text-sm text-muted-foreground">{t('card_privacy_desc')}</p>
              </div>

              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-sm">
                <Globe2 className="h-6 w-6 text-blue-500 mb-1" />
                <h4 className="font-semibold text-foreground">{t('card_scale_title')}</h4>
                <p className="text-sm text-muted-foreground">{t('card_scale_desc')}</p>
              </div>

              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-sm">
                <Zap className="h-6 w-6 text-amber-500 mb-1" />
                <h4 className="font-semibold text-foreground">{t('card_solutions_title')}</h4>
                <p className="text-sm text-muted-foreground">{t('card_solutions_desc')}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form Box */}
          <div className="w-full bg-card/60 border border-border/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-primary/5 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 relative overflow-hidden">
            {/* Subtle internal glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            {isSuccess ? (
              <div className="flex flex-col items-center text-center gap-6 py-12 animate-in zoom-in duration-500">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400 relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                  <CheckCircle2 className="h-10 w-10 relative z-10" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-bold text-foreground">
                    {t('success_title')}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {t('success_desc')}
                  </p>
                </div>
                <Button
                  onClick={() => setIsSuccess(false)}
                  className="mt-6 rounded-full px-8 h-12"
                  variant="outline"
                >
                  {t('send_another')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
                
                {/* Name Field */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-foreground/80">
                    {t('name')}
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Adnan Rahman"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`bg-background/50 border-border/50 h-12 rounded-xl focus-visible:ring-primary/40 ${errors.name ? 'border-destructive/60 focus-visible:ring-destructive/30' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-xs font-semibold text-destructive mt-0.5">{errors.name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground/80">
                    {t('email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. adnan@brand.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`bg-background/50 border-border/50 h-12 rounded-xl focus-visible:ring-primary/40 ${errors.email ? 'border-destructive/60 focus-visible:ring-destructive/30' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-xs font-semibold text-destructive mt-0.5">{errors.email}</p>
                  )}
                </div>

                {/* Message Field */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="message" className="text-sm font-semibold text-foreground/80">
                    {t('message')}
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your brand budget optimization targets..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className={`bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary/40 resize-none py-3 ${errors.message ? 'border-destructive/60 focus-visible:ring-destructive/30' : ''}`}
                  />
                  {errors.message && (
                    <p className="text-xs font-semibold text-destructive mt-0.5">{errors.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-xl font-bold text-base mt-2 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.2)]"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">{t('sending')}</span>
                  ) : (
                    <>
                      <span>{t('submit')}</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>

              </form>
            )}

          </div>
        </div>

      </main>

      <Footer />
    </div>
  )
}
