import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { useTranslations } from "next-intl"
import { BackendHealthBanner } from "@/components/dashboard/BackendHealthBanner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('Dashboard')

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex w-full flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="ml-4 font-semibold font-noto-bengali">{t('header_title')}</div>
          </div>
          <LanguageSwitcher />
        </header>
        <div className="flex-1 overflow-auto bg-muted/20 p-4 md:p-8">
          {/* Day 6: surface backend degradation during integration testing */}
          <div className="mb-4">
            <BackendHealthBanner />
          </div>
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
