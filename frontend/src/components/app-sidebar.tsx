/**
 * @file app-sidebar.tsx
 * @description Sidebar navigation component using shadcn/ui sidebar context.
 * Integrates localization via next-intl and authentication via Clerk.
 * Uses intent-based prefetching (hover/touch) to save bandwidth on 2G/3G.
 */
"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Settings, BarChart3, Home, FileText } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, usePathname } from "@/i18n/routing"
import { useTranslations, useLocale } from "next-intl"
import { UserButton, Show } from "@clerk/nextjs"

/**
 * Application Sidebar Component.
 * Renders the main navigation, user profile button, and handles responsive state.
 * Implements intent-based prefetching: links have `prefetch={false}` to avoid
 * wasteful data on mobile, but `onMouseEnter` / `onTouchStart` triggers
 * `router.prefetch()` for instant navigation on user intent.
 *
 * @param {React.ComponentProps<typeof Sidebar>} props - Standard HTML attributes for the sidebar element.
 * @returns {JSX.Element} The composed sidebar element.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const navMain = [
    { title: t('title'), url: "/dashboard", icon: LayoutDashboard, iconColor: "text-blue-400" },
    { title: t('advanced_visualizations'), url: "/dashboard/analytics", icon: BarChart3, iconColor: "text-emerald-400", hasNotification: true },
    { title: t('reporting'), url: "/dashboard/reporting", icon: FileText, iconColor: "text-violet-400" },
    { title: t('docs_admin') || 'Docs Admin', url: "/dashboard/docs-admin", icon: FileText, iconColor: "text-amber-400" },
    { title: t('settings'), url: "/dashboard/settings", icon: Settings, iconColor: "text-zinc-400" },
  ];

  /** Prefetch a locale-aware route on hover/touch intent */
  const handlePrefetch = React.useCallback(
    (url: string) => {
      router.prefetch(`/${locale}${url}`);
    },
    [router, locale]
  );

  return (
    <Sidebar
      {...props}
      className="bg-sidebar/85 backdrop-blur-md relative border-r border-r-indigo-500/10 shadow-xl after:absolute after:right-0 after:top-0 after:h-full after:w-[1px] after:bg-gradient-to-b after:from-transparent after:via-indigo-500/40 after:to-transparent after:content-[''] transition-all duration-300"
    >
      <SidebarHeader className="border-b border-sidebar-border/50 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/" prefetch={false} className="flex items-center gap-3">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/10 transition-all duration-300 hover:scale-105">
                  <Home className="size-4" />
                </div>
                <div className="flex flex-col gap-1 leading-none">
                  <div className="flex items-center gap-1">
                    <span className="font-normal text-foreground">Brand</span>
                    <span className="font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Sim</span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full w-fit">v1.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-noto-bengali">{t('menu')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`relative transition-all duration-200 hover:translate-x-1 group/btn ${
                        isActive
                          ? "bg-sidebar-accent/60 font-medium text-sidebar-accent-foreground border-l-2 border-indigo-500 pl-[6px]"
                          : "hover:bg-sidebar-accent/30"
                      }`}
                    >
                      <Link
                        href={item.url}
                        prefetch={false}
                        onMouseEnter={() => handlePrefetch(item.url)}
                        onTouchStart={() => handlePrefetch(item.url)}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className={`size-4 transition-colors duration-200 ${item.iconColor} ${isActive ? "scale-105" : "opacity-80 group-hover/btn:opacity-100"}`} />
                          <span className="font-noto-bengali">{item.title}</span>
                        </div>
                        {item.hasNotification && (
                          <span className="relative flex h-2 w-2 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/30 transition-all duration-200">
              <div className="flex items-center gap-2">
                <Show when="signed-in">
                  <UserButton showName appearance={{
                    elements: {
                      userButtonBox: "hover:opacity-90 transition-opacity",
                      userButtonOuterIdentifier: "text-xs text-muted-foreground font-medium"
                    }
                  }} />
                </Show>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-wider leading-none animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
