import { Navigate } from "react-router-dom";
import { useAuth, hasPermission } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: string;
}

export function ProtectedRoute({ children, module }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

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

  if (module && !hasPermission(role, module)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}