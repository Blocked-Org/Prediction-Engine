import { DocsLayout } from '@/components/docs/DocsLayout'
import { DocsUnavailable } from '@/components/docs/DocsUnavailable'
import { isDocsPubliclyAvailable, getDocsConfig } from '@/lib/docs-config'
import { auth } from '@clerk/nextjs/server'

// Keep the Next.js cache revalidation settings
export const revalidate = 60 // revalidate frequently as it's an admin setting

export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'bn'; slug?: string[] }>
}) {
  const resolvedParams = await params
  const locale = resolvedParams.locale
  const slugArray = resolvedParams.slug || []
  const initialSlug = slugArray.length > 0 ? slugArray.join('/') : 'executive-summary'

  // Server-side access control check
  const config = await getDocsConfig()
  const schedule = config.schedule
  const isAvailable = isDocsPubliclyAvailable(schedule)

  // Bypass if user is an admin
  const { sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as any)?.role
  const isOwnerOrAdmin = role === 'admin' || role === 'super_admin' || role === 'owner' || role === 'org:admin'

  if (!isAvailable && !isOwnerOrAdmin) {
    return <DocsUnavailable schedule={schedule} locale={locale} />
  }

  return <DocsLayout locale={locale} initialSlug={initialSlug} config={config} />
}
