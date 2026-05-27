'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { DOCS_DATA, DocArticle } from '@/lib/docs-data'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Search, BookOpen, ChevronRight, Menu, X, Terminal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function DocsPage() {
  const t = useTranslations('DocsPage')
  const locale = useLocale() as 'en' | 'bn'
  const params = useParams()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeHeading, setActiveHeading] = useState<string>('')

  // Resolve slug from route parameters
  const slugArray = params.slug as string[] | undefined
  const activeSlug = slugArray?.[0] || 'executive-summary'

  // Categories list for grouping
  const categories = [
    { id: 'litepaper', label: t('categories.litepaper') },
    { id: 'user_manual', label: t('categories.user_manual') },
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

  // Extract headings for Table of Contents
  const tableOfContents = useMemo(() => {
    const text = activeArticle.content[locale] || ''
    const matches = Array.from(text.matchAll(/^(#{2,3})\s+(.+)$/gm))
    return matches.map((match) => {
      const level = match[1].length
      const title = match[2].replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/[*`]/g, '')
      const id = title.toLowerCase().replace(/[^\w]+/g, '-')
      return { level, title, id }
    })
  }, [activeArticle, locale])

  // Setup intersection observer for scroll spy
  useEffect(() => {
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
    
    tableOfContents.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [tableOfContents])

  // Sidebar Render Component
  const SidebarContent = () => (
    <div className="flex flex-col gap-6 w-full">
      {/* Search Input with shortcut hint */}
      <div className="relative w-full group">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder={t('search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-14 bg-card/50 border-border/40 rounded-xl w-full focus-visible:ring-primary/40 backdrop-blur-sm"
        />
        <div className="absolute right-3 top-2.5 flex items-center gap-1">
           <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
             <span className="text-xs">⌘</span>K
           </kbd>
        </div>
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
    <div className="relative min-h-screen flex flex-col bg-background font-sans selection:bg-primary/30" suppressHydrationWarning>
      <Navbar />

      <main className="z-10 flex-grow max-w-screen-2xl w-full mx-auto px-4 md:px-8 pt-24 pb-20 flex flex-col lg:flex-row gap-8">
        
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
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border/10 pr-6 h-[calc(100vh-140px)] overflow-y-auto sticky top-24 custom-scrollbar">
          <SidebarContent />
        </aside>

        {/* Main Documentation Article Content (Center) */}
        <article className="flex-1 max-w-4xl lg:px-6 min-w-0">
          <div className="prose prose-invert prose-slate max-w-none animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto my-8">
                    <table className="w-full text-left border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="border-b border-border/50 bg-muted/50">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-border/30">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-muted/30 transition-colors">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 font-semibold text-foreground border-b border-border/50">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-muted-foreground align-top">
                    {children}
                  </td>
                ),
                h1: ({ children }) => (
                  <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-8 pb-4 border-b border-border/20">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => {
                  const id = children?.toString().toLowerCase().replace(/[^\w]+/g, '-')
                  return (
                    <h2 id={id} className="text-2xl font-bold text-foreground tracking-tight mt-12 mb-4 pt-4 flex items-center group cursor-pointer">
                      <a href={`#${id}`} className="absolute -ml-6 opacity-0 group-hover:opacity-100 text-primary transition-opacity text-xl">#</a>
                      {children}
                    </h2>
                  )
                },
                h3: ({ children }) => {
                  const id = children?.toString().toLowerCase().replace(/[^\w]+/g, '-')
                  return (
                    <h3 id={id} className="text-xl font-semibold text-foreground tracking-tight mt-8 mb-3 pt-2">
                      {children}
                    </h3>
                  )
                },
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed mb-6 text-[15px]">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 space-y-2 mb-6 text-muted-foreground text-[15px]">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">
                    {children}
                  </li>
                ),
                code: ({ children, className }) => {
                  // Inline code
                  if (!className) {
                    return (
                      <code className="bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5 text-[13px] font-mono text-primary font-medium">
                        {children}
                      </code>
                    )
                  }
                  // Block code will be handled by pre
                  return <code className={className}>{children}</code>
                },
                pre: ({ children }) => (
                  <div className="relative group mb-8 rounded-xl overflow-hidden bg-[#0d1117] border border-border/30 shadow-2xl">
                    {/* Fake macOS window header */}
                    <div className="flex items-center px-4 py-3 bg-zinc-900/50 border-b border-white/5">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <div className="ml-4 flex items-center text-xs font-mono text-zinc-500 gap-2">
                         <Terminal className="h-3 w-3" />
                         <span>terminal</span>
                      </div>
                    </div>
                    <pre className="p-4 overflow-x-auto font-mono text-sm text-zinc-300 leading-relaxed custom-scrollbar">
                      {children}
                    </pre>
                  </div>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/50 pl-4 py-1 bg-primary/5 rounded-r-lg my-6 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {activeArticle.content[locale]}
            </ReactMarkdown>
          </div>
        </article>
        
        {/* Table of Contents (Right side) */}
        {tableOfContents.length > 0 && (
          <aside className="hidden xl:block w-64 shrink-0 h-[calc(100vh-140px)] sticky top-24 pl-6 border-l border-border/10">
            <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">On this page</h4>
            <nav className="flex flex-col gap-2.5">
              {tableOfContents.map((heading, idx) => (
                <a
                  key={idx}
                  href={`#${heading.id}`}
                  className={`text-sm transition-colors ${
                    activeHeading === heading.id 
                      ? 'text-primary font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={{ paddingLeft: `${(heading.level - 2) * 12}px` }}
                >
                  {heading.title}
                </a>
              ))}
            </nav>
          </aside>
        )}

      </main>

      <Footer />
    </div>
  )
}
