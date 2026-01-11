import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const nav = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", to: "/_authenticated/dashboard" },
      { title: "Users", to: "/_authenticated/users" },
      { title: "Settings", to: "/_authenticated/settings" },
    ],
  },
  {
    label: "Bookings",
    items: [
      { title: "Bookings", to: "/bookings" },
      { title: "New Booking", to: "/bookings/new" },
      { title: "Confirm", to: "/bookings/confirm" },
    ],
  },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
 <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-3 py-3">
        <div className="text-sm font-semibold leading-none">
          HOTEL BOOKING
        </div>
        <div className="text-xs text-muted-foreground">
          Admin Panel
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.to as any}
                        activeProps={{ className: "font-semibold" }}
                      >
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <Separator />

      <SidebarFooter className="p-3 text-xs text-muted-foreground">
        v1.0.0
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
