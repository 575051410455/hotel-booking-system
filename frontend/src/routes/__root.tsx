import { Outlet, createRootRoute, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/hooks/auth";
import { Toaster, toast } from "sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleLogout = () => {
    logout();
    toast.success("Logged Out"); // จะเด้งขึ้นมาแล้วครับ
    navigate({ to: "/login" });
  };
  const handleViewLogs = () => {
    navigate({ to: "/logs" }); // ถ้ายังไม่มีหน้า /logs ก็เปลี่ยน path ได้เลย
  };

  const handleViewUsers = () => {
    navigate({ to: "/users" });
  }

  // ถ้ายังไม่ล็อกอิน → ไม่ต้องมี Header
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Outlet />
        {/* 2. ใส่ Toaster ไว้ตรงนี้ด้วย เพื่อให้หน้า Login ก็แจ้งเตือนได้ */}
        <Toaster richColors position="top-right" />
      </div>
    );
  }

  // ล็อกอินแล้ว → แสดง Header + เนื้อหาแต่ละหน้า
  return (
    <SidebarProvider>
      <SidebarInset>
        <AppHeader user={user} onLogout={handleLogout} onViewLogs={handleViewLogs} onViewUser={handleViewUsers} />
        <Outlet />
      </SidebarInset>
      {/* 3. ใส่ Toaster ไว้ท้ายสุดของ Layout หลัก */}
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
