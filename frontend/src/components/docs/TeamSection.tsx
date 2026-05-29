'use client'

import { TeamMember } from '@/lib/docs-config'
import { Mail, Briefcase, User } from 'lucide-react'
import Image from 'next/image'

interface Props {
  locale: 'en' | 'bn'
  teamMembers: TeamMember[]
}

export function TeamSection({ locale, teamMembers }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {teamMembers.map((member) => {
        const name = locale === 'bn' ? member.nameBn : member.name
        const role = locale === 'bn' ? member.roleBn : member.role
        const tags = locale === 'bn' ? member.tagsBn : member.tags

        return (
          <div
            key={member.id}
            className="group relative flex flex-col items-center p-6 rounded-2xl bg-card border border-border/40 card-hover-lift shadow-sm hover:border-primary/30 transition-all duration-300"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
            
            {/* Profile Image */}
            <div className="relative mb-6 flex justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-md scale-110 group-hover:bg-primary/40 transition-colors" />
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-xl ring-2 ring-border/50 group-hover:ring-primary/50 transition-all bg-muted flex items-center justify-center">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 128px, 128px"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground/50" />
                )}
              </div>
              {member.isLeader && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md border border-background">
                  {locale === 'bn' ? 'লিডার' : 'Leader'}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="text-center relative z-10 flex-grow flex flex-col">
              <h3 className="text-xl font-bold text-foreground tracking-tight mb-1">{name}</h3>
              <p className="text-sm font-medium text-primary mb-4 flex items-center justify-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {role}
              </p>
              
              {/* Tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-auto">
                <a
                  href={`mailto:${member.email || `${member.id}@brandos.io`}`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium transition-colors bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-full border border-border/50 hover:border-border"
                >
                  <Mail className="w-4 h-4" />
                  {locale === 'bn' ? 'ইমেইল করুন' : 'Contact'}
                </a>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
