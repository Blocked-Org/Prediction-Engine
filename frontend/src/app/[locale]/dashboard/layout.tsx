import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { getTranslations } from "next-intl/server"
import { BackendHealthBanner } from "@/components/dashboard/BackendHealthBanner"
import { ChatWidgetWrapper } from "@/components/chat/ChatWidgetWrapper"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('Dashboard')

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex flex-1 min-w-0 flex-col min-h-screen bg-white transition-all duration-300 ease-in-out">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E5E5E5] px-4 bg-white">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-[#0A0A0A] hover:bg-[#F5F5F0]" />
              <div className="ml-4 font-semibold font-noto-bengali text-[#0A0A0A]">{t('header_title')}</div>
            </div>
            <LanguageSwitcher />
          </header>
          <div className="flex-1 overflow-auto bg-[#F5F5F0] p-4 md:p-8">
            {/* Day 6: surface backend degradation during integration testing */}
            <div className="mb-4">
              <BackendHealthBanner />
            </div>
            {children}
          </div>
        </main>
      </SidebarProvider>

      {/* Floating AI Chatbot — renders independently of page layout */}
      <ChatWidgetWrapper simulationData={null} />
    </>
  )
}
