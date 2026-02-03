import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { useAuthStore } from "@/hooks/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {

  return <Outlet />;

}