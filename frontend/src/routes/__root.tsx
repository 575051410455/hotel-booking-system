// src/routes/__root.tsx
import { Outlet, createRootRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuthStore } from "@/hooks/auth";

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
    navigate({ to: "/login" });
  };

  const handleViewLogs = () => {
    navigate({ to: "/logs" }); // ถ้ายังไม่มีหน้า /logs ก็เปลี่ยน path ได้เลย
  };

    const handleViewUsers = () => {
    navigate({ to: "/users" }); // ถ้ายังไม่มีหน้า /logs ก็เปลี่ยน path ได้เลย
  };

  // ถ้ายังไม่ล็อกอิน → ไม่ต้องมี Header
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    );
  }

  // ล็อกอินแล้ว → แสดง Header + เนื้อหาแต่ละหน้า
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        user={user}
        onLogout={handleLogout}
        onViewLogs={user.role === "admin" ? handleViewLogs : undefined}
        onViewUsers={user.role === "admin" ? handleViewUsers : undefined}
      />

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
