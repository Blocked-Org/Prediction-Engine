import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { getTranslations } from "next-intl/server"
import { auth } from "@clerk/nextjs/server"
import { BackendHealthBanner } from "@/components/dashboard/BackendHealthBanner"
import { ChatWidgetWrapper } from "@/components/chat/ChatWidgetWrapper"
import { fetchDashboardResults, toDashboardData } from "@/lib/dashboard"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations('Dashboard')

  // Fetch simulation data for the floating chat widget
  let simulationData = null;
  try {
    const { userId } = await auth();
    if (userId) {
      const results = await fetchDashboardResults(userId);
      if (results) {
        simulationData = toDashboardData(results);
      }
    }
  } catch {
    // Silently degrade — chat widget simply won't appear
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex flex-1 min-w-0 flex-col min-h-screen transition-all duration-300 ease-in-out">
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

      {/* Floating AI Chatbot — renders independently of page layout */}
      <ChatWidgetWrapper simulationData={simulationData} />
    </>
  )
}
