'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { DOCS_DATA } from '@/lib/docs-data'
import { FileText } from 'lucide-react'

interface Props {
  locale: 'en' | 'bn'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocsSearch({ locale, open, onOpenChange }: Props) {
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange]
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={locale === 'bn' ? 'ডকুমেন্টেশন খুঁজুন...' : 'Search documentation...'} />
      <CommandList>
        <CommandEmpty>{locale === 'bn' ? 'কোনো ফলাফল পাওয়া যায়নি।' : 'No results found.'}</CommandEmpty>
        <CommandGroup heading={locale === 'bn' ? 'আর্টিকেলসমূহ' : 'Articles'}>
          {DOCS_DATA.map((doc) => (
            <CommandItem
              key={doc.slug}
              value={doc.title[locale]}
              onSelect={() => {
                runCommand(() => router.push(`/${locale}/docs/${doc.slug}`))
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{doc.title[locale]}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
