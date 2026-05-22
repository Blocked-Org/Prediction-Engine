'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { DOCS_DATA, DocArticle } from '@/lib/docs-data'
import ReactMarkdown from 'react-markdown'
import { Search, BookOpen, ChevronRight, Menu, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function DocsPage() {
  const t = useTranslations('DocsPage')
  const locale = useLocale() as 'en' | 'bn'
  const params = useParams()
  const router = useRouter()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Resolve slug from route parameters
  const slugArray = params.slug as string[] | undefined
  const activeSlug = slugArray?.[0] || 'getting-started'

  // Categories list for grouping
  const categories = [
    { id: 'getting_started', label: t('categories.getting_started') },
    { id: 'simulation', label: t('categories.simulation') },
    { id: 'attribution', label: t('categories.attribution') },
    { id: 'api_reference', label: t('categories.api_reference') },
  ]

  // Find active article
  const activeArticle = useMemo(() => {
    return DOCS_DATA.find((art) => art.slug === activeSlug) || DOCS_DATA[0]
  }, [activeSlug])

  // Filtered articles based on search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_DATA
    const q = searchQuery.toLowerCase()
    return DOCS_DATA.filter((art) => {
      const title = (art.title[locale] || '').toLowerCase()
      const content = (art.content[locale] || '').toLowerCase()
      return title.includes(q) || content.includes(q)
    })
  }, [searchQuery, locale])

  // Group filtered articles by category
  const groupedArticles = useMemo(() => {
    const groups: Record<string, DocArticle[]> = {}
    categories.forEach((cat) => {
      groups[cat.id] = filteredArticles.filter((art) => art.category === cat.id)
    })
    return groups
  }, [filteredArticles])

  // Sidebar Render Component
  const SidebarContent = () => (
    <div className="flex flex-col gap-6 w-full">
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border/40 rounded-full w-full focus-visible:ring-primary/40"
        />
      </div>

      {/* Categories & Articles navigation */}
      <nav className="flex flex-col gap-6">
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
                  const isActive = art.slug === activeSlug
                  return (
                    <Link
                      key={art.slug}
                      href={`/docs/${art.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between py-1.5 px-3 rounded-r-lg text-sm transition-all border-l-2 -ml-[1px] ${
                        isActive
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                    >
                      <span>{art.title[locale]}</span>
                      {isActive && <ChevronRight className="h-4 w-4" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
    </div>
  )

  return (
    <div className="relative min-h-screen flex flex-col bg-background font-sans">
      <Navbar />

      <main className="z-10 flex-grow max-w-7xl w-full mx-auto px-4 md:px-8 pt-24 pb-20 flex flex-col lg:flex-row gap-8">
        
        {/* Mobile Sidebar Trigger Toggle */}
        <div className="lg:hidden flex items-center justify-between border-b border-border/30 pb-4 mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>{activeArticle.title[locale]}</span>
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
          <div className="lg:hidden fixed inset-0 top-[64px] z-40 bg-background/95 backdrop-blur-md p-6 overflow-y-auto animate-in fade-in duration-200">
            <SidebarContent />
          </div>
        )}

        {/* Desktop Sidebar (Left side) */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border/20 pr-6 h-[calc(100vh-140px)] overflow-y-auto sticky top-24">
          <SidebarContent />
        </aside>

        {/* Main Documentation Article Content (Right side) */}
        <article className="flex-1 max-w-3xl lg:px-4">
          <div className="prose prose-invert prose-slate max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-6 pb-4 border-b border-border/20">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-foreground tracking-tight mt-8 mb-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-foreground tracking-tight mt-6 mb-3">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed mb-4 text-base">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 space-y-2 mb-4 text-muted-foreground">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="text-base">
                    {children}
                  </li>
                ),
                code: ({ children }) => (
                  <code className="bg-muted border border-border/50 rounded px-1.5 py-0.5 text-xs font-mono text-primary">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-muted border border-border/30 rounded-xl p-4 overflow-x-auto font-mono text-sm mb-6 shadow-inner text-foreground">
                    {children}
                  </pre>
                ),
              }}
            >
              {activeArticle.content[locale]}
            </ReactMarkdown>
          </div>
        </article>

      </main>

      <Footer />
    </div>
  )
}
