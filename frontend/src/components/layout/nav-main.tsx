"use client"
import { type LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react"
import { useMatchRoute } from "@tanstack/react-router"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@/hooks/useAuth"

export function NavMain({
  items,
}: {
items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean 
    items?: {
      title: string
      url: string
      isActive?: boolean 
    }[]
  }[]
}) {

  const matchRoute = useMatchRoute()
  
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated)  return null;

  
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = matchRoute({ to: item.url, fuzzy: true })
          
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || !!isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={!!isActive}>
                    {item.icon && <item.icon />}
                    <Link to={item.url}>
                      <span>{item.title}</span>
                    </Link>
                    {item.items && (
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {item.items && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isSubActive = matchRoute({ to: subItem.url, fuzzy: true })
                        
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={!!isSubActive}>
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
