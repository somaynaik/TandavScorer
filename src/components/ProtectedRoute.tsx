import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();
  const configuredAdminEmail = (
    import.meta.env.VITE_ADMIN_EMAIL ?? ""
  ).toLowerCase();
  const isAdminEmail =
    !!configuredAdminEmail &&
    (user?.email ?? "").toLowerCase() === configuredAdminEmail;
  const canAccessAdmin = isAdmin || isAdminEmail;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Checking authentication…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (requireAdmin && !canAccessAdmin) {
    return (
      <div className="container py-16 text-center space-y-4 max-w-sm mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mx-auto">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          Admin Access Required
        </h2>
        <p className="text-sm text-muted-foreground">
          Your account does not have admin privileges. Contact a super-admin to
          grant you access.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
