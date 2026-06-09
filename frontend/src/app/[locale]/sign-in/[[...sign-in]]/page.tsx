import { SignIn } from '@clerk/nextjs'
import { Activity } from 'lucide-react'

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Background Mesh Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[55%] h-[55%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[150px]" />
      </div>

      <div className="z-10 flex flex-col items-center gap-6 w-full max-w-md">
        
        {/* Brand Identity */}
        <div className="flex items-center gap-2 font-bold text-2xl tracking-tight text-foreground mb-2">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
          <span>Buni<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">OS</span></span>
        </div>

        {/* Clerk Sign In Card Container */}
        <div className="w-full bg-card/40 backdrop-blur-md border border-border/40 p-4 sm:p-6 rounded-3xl shadow-2xl flex justify-center">
          <SignIn
            routing="path"
            path={`/${locale}/sign-in`}
            signUpUrl={`/${locale}/sign-up`}
            forceRedirectUrl={`/${locale}/dashboard`}
          />
        </div>

      </div>
    </main>
  )
}
