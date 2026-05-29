'use client'

import { useState, useMemo, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { DOCS_DATA, DocArticle } from '@/lib/docs-data'
import { BookOpen, ChevronRight, Menu, X, Presentation, FileText, Search, Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PitchDeck } from './PitchDeck'
import { TechDocs } from './TechDocs'
import { DocsSearch } from './DocsSearch'
import { DocsConfigData } from '@/lib/docs-config'

interface Props {
  locale: 'en' | 'bn'
  initialSlug: string
  config: DocsConfigData
}

export function DocsLayout({ locale, initialSlug, config }: Props) {
  const [viewMode, setViewMode] = useState<'pitch' | 'tech'>('pitch')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSlug, setActiveSlug] = useState(initialSlug)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeHeading, setActiveHeading] = useState<string>('')

  // Scroll spy setup for tech docs TOC
  useEffect(() => {
    if (viewMode !== 'tech') return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -80% 0px' }
    )
    const headings = document.querySelectorAll('h2[id], h3[id]')
    headings.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [viewMode, activeSlug])

  const categories = [
    { id: 'litepaper', label: locale === 'bn' ? 'লাইটপেপার' : 'Litepaper' },
    { id: 'user_manual', label: locale === 'bn' ? 'ব্যবহারবিধি' : 'User Manual' },
    { id: 'api_reference', label: locale === 'bn' ? 'এপিআই রেফারেন্স' : 'API Reference' },
  ]

  const groupedArticles = useMemo(() => {
    const groups: Record<string, DocArticle[]> = {}
    categories.forEach((cat) => {
      groups[cat.id] = DOCS_DATA.filter((art) => art.category === cat.id)
    })
    return groups
  }, [locale])

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'BrandOS Documentation',
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert(locale === 'bn' ? 'লিংক কপি করা হয়েছে!' : 'Link copied to clipboard!')
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col gap-6 w-full">
      {/* Mode Switcher */}
      <div className="bg-card/50 p-1 rounded-xl border border-border/40 flex items-center mb-2">
        <button
          onClick={() => setViewMode('pitch')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'pitch' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Presentation className="w-4 h-4" />
          {locale === 'bn' ? 'পিচ ডেক' : 'Pitch'}
        </button>
        <button
          onClick={() => setViewMode('tech')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'tech' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          {locale === 'bn' ? 'ডকুমেন্ট' : 'Docs'}
        </button>
      </div>

      {/* Global Search Trigger */}
      <button 
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-xl hover:bg-muted hover:text-foreground transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">{locale === 'bn' ? 'খুঁজুন...' : 'Search docs...'}</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Navigation (Only show fully when in Tech mode or always?) We'll show always for easy jumping */}
      <nav className="flex flex-col gap-6 mt-4">
        {categories.map((cat) => {
          const articles = groupedArticles[cat.id] || []
          if (articles.length === 0) return null

          return (
            <div key={cat.id} className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                {cat.label}
              </h3>
              <div className="flex flex-col gap-1 border-l border-border/20 ml-2">
                {articles.map((art) => {
                  const isActive = viewMode === 'tech' && art.slug === activeSlug
                  return (
                    <button
                      key={art.slug}
                      onClick={() => {
                        setActiveSlug(art.slug)
                        setViewMode('tech')
                        setMobileMenuOpen(false)
                        // update URL without hard reload
                        window.history.pushState({}, '', `/${locale}/docs/${art.slug}`)
                      }}
                      className={`flex items-center justify-between py-1.5 px-3 rounded-r-lg text-sm transition-all border-l-2 -ml-[1px] text-left ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                    >
                      <span>{art.title[locale]}</span>
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
      
      {/* Actions */}
      <div className="mt-auto pt-6 border-t border-border/20 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handlePrint}>
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleShare}>
          <Share2 className="w-4 h-4" /> Share
        </Button>
      </div>
    </div>
  )

  const activeArticle = DOCS_DATA.find((art) => art.slug === activeSlug) || DOCS_DATA[0]

  return (
    <div className="relative min-h-screen flex flex-col bg-background font-sans selection:bg-primary/30" suppressHydrationWarning>
      <Navbar />

      <main className="z-10 flex-grow max-w-[1600px] w-full mx-auto px-4 md:px-6 pt-[72px] flex flex-col lg:flex-row gap-6">
        
        {/* Mobile Header / Trigger */}
        <div className="lg:hidden flex items-center justify-between border-b border-border/30 pb-4 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>{viewMode === 'pitch' ? 'Pitch Deck' : activeArticle.title[locale]}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2 rounded-full border-border/40"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>Menu</span>
          </Button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-[72px] z-40 bg-background/95 backdrop-blur-md p-6 overflow-y-auto animate-in fade-in duration-200">
            <SidebarContent />
          </div>
        )}

        {/* Desktop Sidebar (Left side) */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border/10 pr-6 h-[calc(100vh-72px)] overflow-y-auto sticky top-[72px] py-6 custom-scrollbar print:hidden">
          <SidebarContent />
        </aside>

        <div className="flex-1 min-w-0 pb-12 pt-6">
          {viewMode === 'pitch' ? (
            <PitchDeck locale={locale} onSwitchMode={() => setViewMode('tech')} config={config} />
          ) : (
            <TechDocs locale={locale} activeSlug={activeSlug} activeHeading={activeHeading} />
          )}
        </div>
      </main>

      {/* Docs Search Overlay */}
      <DocsSearch locale={locale} open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
