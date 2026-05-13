import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex w-full flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-4 font-semibold">Simulation Engine Dashboard</div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/20 p-4 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
