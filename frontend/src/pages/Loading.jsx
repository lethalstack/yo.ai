import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import LogoMark from "../components/landing/LogoMark";
import { useTheme } from "../context/ThemeContext";

const ease = [0.16, 1, 0.3, 1];

const HOLD_MS = 1700;   // brief splash — logo launch animation still plays, chat opens fast
const EXIT_MS = 500;    // fade/scale-out duration before actually navigating

export default function Loading() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exiting, setExiting] = useState(false);
  const { theme } = useTheme();

  const dark = theme !== "light";

  // only allow navigating into the app itself — never an arbitrary
  // external/open redirect via this param
  const rawTo = searchParams.get("to") || "/app";
  const to = rawTo.startsWith("/app") ? rawTo : "/app";

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), HOLD_MS);
    const navTimer = setTimeout(() => navigate(to, { replace: true }), HOLD_MS + EXIT_MS);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(navTimer);
    };
  }, [to, navigate]);

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: dark ? "#000000" : "#f5f3ef" }}
    >


      {/* the mark — pinned to the exact viewport center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-fit">
          <LogoMark size={70} speed={2} theme={dark ? "dark" : "light"} />
        </div>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.9); }
          50% { opacity: 0.9; transform: scale(1); }
        }
      `}</style>
    </motion.div>
  );
}