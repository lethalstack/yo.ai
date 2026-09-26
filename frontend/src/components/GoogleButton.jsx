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

  // render the official button once the script is ready
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

  // not configured → hide cleanly (email login still works)
  if (!CLIENT_ID) return null;

  return <div ref={btnRef} className="flex justify-center min-h-[40px]" />;
}