"use client"

import * as React from "react"
import { Link } from "@tanstack/react-router"
import {
  IconChartBar,
  IconDashboard,
  IconFileAi,
  IconFolder,
  IconListDetails,
  IconSettings,
  IconUsers,
  IconAlertCircle,
} from "@tabler/icons-react"
import { 
  LayoutDashboard, 
  CheckSquare, 
} from 'lucide-react';

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth";


const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navAdmin: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "Tasks",
      url: "/tasks",
      icon: IconListDetails,
    },
    {
      title: "Report Issue",
      url: "/report-issue",
      icon: IconAlertCircle,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "/team",
      icon: IconUsers,
    },
  ],
  navUser: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      isActive: true,
      url: "/",
    },
    {
      title: "All Tasks",
      icon: CheckSquare,
      url: "/tasks",
    },
    {
      title: "Report Issue",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  // Get navigattion item base on user role
  const navItems = user?.role === 'admin'
      ? data.navAdmin
      : data.navUser
  
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/">
                <img src="/images/logoeasy.png" className="w-5 h-5" alt="Logo" />
                <span className="text-base font-semibold">Easy Connect Equipment</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}