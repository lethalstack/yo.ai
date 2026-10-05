import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LogoMark from "./landing/LogoMark";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const dark = theme !== "light";

  if (loading) {
    return (
      <div
        className="h-dvh flex items-center justify-center"
        style={{ backgroundColor: dark ? "#000000" : "#f5f3ef" }}
      >
        <LogoMark size={70} speed={2} theme={dark ? "dark" : "light"} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return children;
}