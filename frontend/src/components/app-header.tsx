// src/components/layout/app-header.tsx
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useNavigate } from "@tanstack/react-router"
import { Activity, Users2 } from "lucide-react"
import type { User } from "@/hooks/auth"

type AppHeaderProps = {
  user: User
  onLogout: () => void
  onViewLogs?: () => void
  onViewUser?: () => void
}

export function AppHeader({ user, onLogout, onViewLogs, onViewUser }: AppHeaderProps) {
  const navigate = useNavigate()


  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      sales: 'bg-blue-100 text-blue-800',
      salescoordinator: 'bg-orange-100 text-orange-800',
      frontoffice: 'bg-green-100 text-green-800',
      housekeeping: 'bg-yellow-100 text-yellow-800',
      manager: 'bg-indigo-100 text-indigo-800',
      staff: 'bg-teal-100 text-teal-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return badges[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleText = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'ผู้ดูแลระบบ',
      sales: 'ฝ่ายขาย',
      salescoordinator: 'Sales Coordinator',
      frontoffice: 'Front Office',
      housekeeping: 'Housekeeping',
      manager: 'ผู้จัดการ',
      staff: 'พนักงาน',
      user: 'ผู้ใช้งาน',
    };
    return roles[role] || role;
  };


  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />

        <div className="flex-1">
            <div className="text-sm font-medium">Hotel Booking System</div>
            <div className="text-xs text-muted-foreground">
            {user.role === "admin" ? "Admin Console" : "User Console"}
            </div>
        </div>
        {user.role === 'admin' && (
        <Button
            variant="outline"
            size="sm"
            onClick={onViewLogs}
        >
            <Activity className="w-5 h-5" />
            <span className="hidden sm:inline">Activity Logs</span>
        </Button>
        )}

        <DropdownMenu>
            {user.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={onViewUser}>
                <Users2 className="w-5 h-5" />
                <span>Manage Users</span>
            </Button>
            )}
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                    {user.fullName}
                </Button>
            </DropdownMenuTrigger>



            <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                Profile
            </DropdownMenuItem>

            <DropdownMenuItem
                onClick={() => {
                onLogout()
                toast.success("Logged out")
                }}
            >
                Logout
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </header>
  )
}
