import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
      </div>
    );
  }

  if (!user) {
  return <Navigate to="/auth" replace state={{ from: location }} />;
}

if (!user.username) {
  return <Navigate to="/auth" replace state={{ from: location }} />;
}

  return children;
}