
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NavUser } from "@/components/layout/nav-user"
import { Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { AnimatedGradientText } from "./ui/animated-gradient-text"

interface HeaderProps {
  onLogout: () => void;
  data: {
    username: string,
    email: string,
    avatar: string | undefined,
  }
}




export function SiteHeader({  onLogout, data }: HeaderProps) {


  
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <AnimatedGradientText 
          speed={2}
          colorFrom="#6ec3f4"
          colorTo="#b9beff"
          className="text-2xl font-semibold tracking-tight"
          >
          Dashboard
        </AnimatedGradientText>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Bell className="w-4 h-4" />
          </Button>
          <NavUser user={data} onLogout={onLogout}/>
        </div>
      </div>
    </header>
  )
}
