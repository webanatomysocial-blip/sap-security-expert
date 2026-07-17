import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute - Guards routes from unauthenticated access.
 * If the user is not authenticated according to AuthContext,
 * they are redirected to the admin login page.
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, authLoading, role } = useAuth();

  // Wait for session verification to complete before deciding to redirect.
  // Without this, isAuthenticated is false on first render and the route
  // redirects away before verifySession() can confirm the user is logged in.
  if (authLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
