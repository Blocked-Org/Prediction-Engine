import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'
import { SignInButton, UserButton, Show } from '@clerk/nextjs'

export default function HomePage() {
  const t = useTranslations('HomePage')
  const locale = useLocale()
  const dashboardUrl = `/${locale}/dashboard`

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Simulation Engine
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl={dashboardUrl} signUpForceRedirectUrl={dashboardUrl}>
              <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Sign In</button>
            </SignInButton>
          </Show>
        </div>
      </div>

      <div className="mt-32 flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-balance font-noto-bengali">
          {t('title')}
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-2xl font-noto-bengali">
          {t('description')}
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/" locale="en" className="rounded bg-gray-200 px-4 py-2 dark:bg-gray-800">English</Link>
          <Link href="/" locale="bn" className="rounded bg-gray-200 px-4 py-2 dark:bg-gray-800">বাংলা</Link>
        </div>
      </div>
    </main>
  )
}
