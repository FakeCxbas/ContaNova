import { Navigate } from "react-router-dom";
import { useAuth, hasPermission } from "@/hooks/useAuth";
import ForcePasswordChange from "@/pages/ForcePasswordChange";

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
}

export function ProtectedRoute({ children, module }: ProtectedRouteProps) {
  const { user, role, mustChangePassword, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  if (module && !hasPermission(role, module)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
