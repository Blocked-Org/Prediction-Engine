import { SignUp } from '@clerk/nextjs'

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <SignUp
        routing="path"
        path={`/${locale}/sign-up`}
        signInUrl={`/${locale}/sign-in`}
        forceRedirectUrl={`/${locale}/onboarding`}
      />
    </main>
  )
}
