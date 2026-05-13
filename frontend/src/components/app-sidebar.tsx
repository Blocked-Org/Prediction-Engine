/**
 * @file app-sidebar.tsx
 * @description Sidebar navigation component using shadcn/ui sidebar context.
 * Integrates localization via next-intl and authentication via Clerk.
 */
"use client"
import * as React from "react"
import { LayoutDashboard, Settings, BarChart3, Home } from "lucide-react"

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
import { Link } from "@/i18n/routing"
import { UserButton, Show } from "@clerk/nextjs"

const data = {
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ],
}

/**
 * Application Sidebar Component.
 * Renders the main navigation, user profile button, and handles responsive state.
 *
 * @param {React.ComponentProps<typeof Sidebar>} props - Standard HTML attributes for the sidebar element.
 * @returns {JSX.Element} The composed sidebar element.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Home className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">SimEngine</span>
                  <span className="">v1.0.0</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
             <div className="flex items-center gap-2 px-2 py-1">
               <Show when="signed-in">
                 <UserButton showName />
               </Show>
             </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
