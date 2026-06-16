import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";
import { useLocation } from "react-router-dom";

/**
 * AuthContext — provides { user, role, permissions, isAuthenticated, setAuth, clearAuth }
 * to all admin components without prop drilling.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("guest");
  const [permissions, setPermissions] = useState({});
  const location = useLocation();

  const verifySession = async (adminAuth) => {
    try {
      const { data } = await api.get("/verify_session.php");
      if (data.status === "success" && data.authenticated) {
        setAuth({
          user: data.user,
          role: data.role || data.user.role || "admin",
          permissions: data.permissions || {},
          csrf_token: data.csrf_token,
        });
      } else {
        // Only clear admin auth if we thought we were an admin
        if (adminAuth === "true") clearAuth();
      }
    } catch {
      if (adminAuth === "true") clearAuth();
    }
  };

  // 1. Rehydrate from localStorage on mount AND verify with backend
  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth");
    const memberAuth = localStorage.getItem("memberAuth");

    // Always try to verify session if there is any existing auth state
    if (adminAuth === "true" || memberAuth === "true") {
      verifySession(adminAuth, memberAuth);
    }
  }, []);

  // 2. Navigation-based verification: If navigating to /admin but not authenticated, 
  // check if we can auto-login via member session.
  useEffect(() => {
    const memberAuth = localStorage.getItem("memberAuth");
    const adminAuth = localStorage.getItem("adminAuth");
    
    if (
      location.pathname.startsWith("/admin") && 
      !isAuthenticated && 
      memberAuth === "true" &&
      adminAuth !== "true" // Only if we haven't already failed/cleared admin auth in this session? 
                           // Actually, better to always try if pathname is /admin.
    ) {
      verifySession(adminAuth, memberAuth);
    }
  }, [location.pathname, isAuthenticated]);

  const setAuth = ({ user, role, permissions, csrf_token }) => {
    setIsAuthenticated(true);
    setUser(user);
    setRole(role || "admin");
    setPermissions(permissions || {});

    localStorage.setItem("adminAuth", "true");
    localStorage.setItem("adminUser", JSON.stringify(user));
    localStorage.setItem("userRole", role || "admin");
    localStorage.setItem("userPermissions", JSON.stringify(permissions || {}));
    if (csrf_token) {
      localStorage.setItem("csrf_token", csrf_token);
    }
  };

  const clearAuth = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRole("guest");
    setPermissions({});
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("csrf_token");
  };

  /** Quick permission helper for components */
  const can = (key) => role === "admin" || !!permissions[key];

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        role,
        permissions,
        can,
        setAuth,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export default AuthContext;
