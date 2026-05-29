'use client'

import React from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Terminal } from 'lucide-react'
import { DOCS_DATA } from '@/lib/docs-data'

interface Props {
  locale: 'en' | 'bn'
  activeSlug: string
  activeHeading: string
}

export function TechDocs({ locale, activeSlug, activeHeading }: Props) {
  const activeArticle = DOCS_DATA.find((art) => art.slug === activeSlug) || DOCS_DATA[0]
  
  // Extract headings for Table of Contents
  const tableOfContents = React.useMemo(() => {
    const text = activeArticle.content[locale] || ''
    const matches = Array.from(text.matchAll(/^(#{2,3})\s+(.+)$/gm))
    return matches.map((match) => {
      const level = match[1].length
      const title = match[2].replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/[*`]/g, '')
      const id = title.toLowerCase().replace(/[^\w]+/g, '-')
      return { level, title, id }
    })
  }, [activeArticle, locale])

  return (
    <div className="flex w-full">
      {/* Main Documentation Article Content (Center) */}
      <article className="flex-1 max-w-4xl lg:px-6 min-w-0">
        <div className="prose prose-invert prose-slate max-w-none animate-in fade-in slide-in-from-bottom-4 duration-700">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => (
                <div className="overflow-x-auto my-8 border border-border/30 rounded-xl bg-card">
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
                  <h2 id={id} className="scroll-m-24 text-2xl font-bold text-foreground tracking-tight mt-12 mb-4 pt-4 flex items-center group cursor-pointer">
                    <a href={`#${id}`} className="absolute -ml-6 opacity-0 group-hover:opacity-100 text-primary transition-opacity text-xl">#</a>
                    {children}
                  </h2>
                )
              },
              h3: ({ children }) => {
                const id = children?.toString().toLowerCase().replace(/[^\w]+/g, '-')
                return (
                  <h3 id={id} className="scroll-m-24 text-xl font-semibold text-foreground tracking-tight mt-8 mb-3 pt-2">
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
                if (!className) {
                  return (
                    <code className="bg-primary/10 border border-primary/20 rounded-md px-1.5 py-0.5 text-[13px] font-mono text-primary font-medium">
                      {children}
                    </code>
                  )
                }
                return <code className={className}>{children}</code>
              },
              pre: ({ children }) => (
                <div className="relative group mb-8 rounded-xl overflow-hidden bg-[#0d1117] border border-border/30 shadow-2xl">
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
          <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">
            {locale === 'bn' ? 'এই পাতায়' : 'On this page'}
          </h4>
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
    </div>
  )
}
