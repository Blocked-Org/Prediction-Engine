import { SignIn } from '@clerk/nextjs'

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <SignIn
        routing="path"
        path={`/${locale}/sign-in`}
        signUpUrl={`/${locale}/sign-up`}
        forceRedirectUrl={`/${locale}/dashboard`}
      />
    </main>
  )
}
