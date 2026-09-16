import { useMockAuth } from "@/contexts/MockAuthContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useMockAuth();

  // While the initial Supabase session is being checked, don't redirect yet.
  // Without this guard, a hard refresh (F5) would redirect logged-in users
  // to /auth because isAuthenticated starts as false before getSession() resolves.
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
