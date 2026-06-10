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
import { ShowGuideAgainButton } from "@/components/companion/BuniDashboardGuide"

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
    { title: t('title'), url: "/dashboard", icon: LayoutDashboard, iconColor: "text-[#0A0A0A]" },
    { title: t('advanced_visualizations'), url: "/dashboard/analytics", icon: BarChart3, iconColor: "text-[#0A0A0A]", hasNotification: true },
    { title: t('reporting'), url: "/dashboard/reporting", icon: FileText, iconColor: "text-[#0A0A0A]" },
    { title: t('docs_admin') || 'Docs Admin', url: "/dashboard/docs-admin", icon: FileText, iconColor: "text-[#6B6B6B]" },
    { title: t('settings'), url: "/dashboard/settings", icon: Settings, iconColor: "text-[#6B6B6B]" },
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
      className="bg-white border-r border-[#E5E5E5] transition-all duration-300"
    >
      <SidebarHeader className="border-b border-[#E5E5E5] pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <Link href="/" prefetch={false} className="flex items-center gap-3">
                <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-[#0A0A0A] text-white shadow-sm transition-all duration-300 hover:scale-105">
                  <Home className="size-4" />
                </div>
                <div className="flex flex-col gap-1 leading-none">
                  <div className="flex items-center gap-0.5">
                    <span className="font-normal text-[#0A0A0A]">Brand</span>
                    <span className="font-extrabold text-[#0A0A0A]">OS</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#6B6B6B] bg-[#F5F5F0] px-1.5 py-0.5 rounded-full w-fit border border-[#E5E5E5]">v1.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-noto-bengali text-[#6B6B6B] text-xs font-semibold uppercase tracking-wider">{t('menu')}</SidebarGroupLabel>
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
                          ? "bg-[#0A0A0A] text-white font-medium rounded-lg"
                          : "text-[#0A0A0A] hover:bg-[#F5F5F0] rounded-lg"
                      }`}
                    >
                      <Link
                        href={item.url}
                        prefetch={false}
                        onMouseEnter={() => handlePrefetch(item.url)}
                        onTouchStart={() => handlePrefetch(item.url)}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon className={`size-4 transition-colors duration-200 ${isActive ? "text-white" : item.iconColor}`} />
                          <span className="font-noto-bengali text-sm">{item.title}</span>
                        </div>
                        {item.hasNotification && (
                          <span className="relative flex h-2 w-2 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FACC15] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FACC15]"></span>
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
      <SidebarFooter className="border-t border-[#E5E5E5] pt-4">
        <SidebarMenu>
          {/* Show Buni Guide Again */}
          <SidebarMenuItem>
            <ShowGuideAgainButton />
          </SidebarMenuItem>

          <SidebarMenuItem>
            <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-[#F5F5F0] transition-all duration-200">
              <div className="flex items-center gap-2">
                <Show when="signed-in">
                  <UserButton showName appearance={{
                    elements: {
                      userButtonBox: "hover:opacity-90 transition-opacity",
                      userButtonOuterIdentifier: "text-xs text-[#6B6B6B] font-medium"
                    }
                  }} />
                </Show>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#F5F5F0] border border-[#E5E5E5] text-[9px] font-bold text-[#0A0A0A] uppercase tracking-wider leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                Online
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
