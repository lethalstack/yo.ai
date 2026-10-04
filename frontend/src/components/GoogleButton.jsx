import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

export default function GoogleButton({ onError }) {
  const { setUser } = useAuth();
  const btnRef = useRef(null);
  const [ready, setReady] = useState(false);

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // load Google's script once, on demand
  useEffect(() => {
    if (!CLIENT_ID) return;

    if (window.google?.accounts?.id) {
      setReady(true);
      return;
    }

    if (document.getElementById("google-gsi")) return;

    const s = document.createElement("script");
    s.id = "google-gsi";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => setReady(true);

    document.head.appendChild(s);
  }, [CLIENT_ID]);

  // render the real Google button once the script is ready
  useEffect(() => {
    if (!ready || !btnRef.current || !CLIENT_ID) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async (response) => {
        try {
          const d = await api.googleSignIn(response.credential);
          setUser(d.user);
        } catch (err) {
          onError?.(err.message || "Google sign-in failed.");
        }
      },
    });

    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      width: 320,
      text: "continue_with",
      logo_alignment: "center",
    });
  }, [ready, CLIENT_ID, setUser, onError]);

  // not configured → hide cleanly
  if (!CLIENT_ID) return null;

  return (
    <div className="relative mx-auto h-[40px] w-[320px]">
      {/* YO visual button */}
      <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-full bg-[#252527] text-[15px] font-normal text-white">
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          className="h-[20px] w-[20px]"
        />
        <span>Continue with Google</span>
      </div>

      {/* Real Google button — invisible but still clickable */}
      <div
        ref={btnRef}
        className="absolute inset-0 z-10 overflow-hidden opacity-0"
      />
    </div>
  );
}