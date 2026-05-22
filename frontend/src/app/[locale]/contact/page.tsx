'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useState } from 'react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Send } from 'lucide-react'

export default function ContactPage() {
  const t = useTranslations('ContactPage')
  const locale = useLocale()

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
    <div className="relative min-h-screen flex flex-col bg-background font-sans">
      <Navbar />

      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] right-[20%] w-[45%] h-[45%] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <main className="z-10 flex-grow pt-24 px-4 md:px-8 pb-20 flex flex-col items-center">
        
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center py-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Contact Form Box */}
        <div className="w-full max-w-lg bg-card border border-border/40 backdrop-blur-md rounded-3xl p-8 shadow-xl">
          
          {isSuccess ? (
            <div className="flex flex-col items-center text-center gap-6 py-8 animate-in zoom-in duration-300">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {t('success_title')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {t('success_desc')}
                </p>
              </div>
              <Button
                onClick={() => setIsSuccess(false)}
                className="mt-4 rounded-full px-6"
                variant="outline"
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Name Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-sm font-semibold text-muted-foreground">
                  {t('name')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Adnan Rahman"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`bg-background border-border/40 focus-visible:ring-primary/40 ${errors.name ? 'border-destructive/60 focus-visible:ring-destructive/30' : ''}`}
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive mt-0.5">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm font-semibold text-muted-foreground">
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. adnan@brand.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`bg-background border-border/40 focus-visible:ring-primary/40 ${errors.email ? 'border-destructive/60 focus-visible:ring-destructive/30' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs font-semibold text-destructive mt-0.5">{errors.email}</p>
                )}
              </div>

              {/* Message Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="message" className="text-sm font-semibold text-muted-foreground">
                  {t('message')}
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your brand budget optimization targets..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={`bg-background border-border/40 focus-visible:ring-primary/40 resize-none ${errors.message ? 'border-destructive/60 focus-visible:ring-destructive/30' : ''}`}
                />
                {errors.message && (
                  <p className="text-xs font-semibold text-destructive mt-0.5">{errors.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-full font-bold text-base mt-2 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-primary/25"
              >
                {isSubmitting ? (
                  <span>{t('sending')}</span>
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

      </main>

      <Footer />
    </div>
  )
}
