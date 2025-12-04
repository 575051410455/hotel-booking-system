import { Button } from '../ui/button';
import { Bell } from 'lucide-react';
import type { User } from '@/routes/dash';
import { NavUser } from './nav-user';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
}

export function Header({ currentUser, onLogout }: HeaderProps) {
  return (
    <header className="flex justify-between items-center h-16 shrink-0 gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
            <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                Building Your Application
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
        </div>

        <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
            </Button>
            <NavUser user={{
                name: currentUser.name,
                email: currentUser.username,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random&size=128`
            }}
            onLogout={onLogout}
            />
        </div>
    </header>
  );
}