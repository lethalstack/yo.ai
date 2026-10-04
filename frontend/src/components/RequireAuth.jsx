import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LogoMark from "./landing/LogoMark";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-dvh bg-black flex items-center justify-center">
        <LogoMark size={70} speed={2} theme="dark" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
}