import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import LogoFlat from "../components/landing/LogoFlat";
import GoogleButton from "../components/GoogleButton";

const STEP = Object.freeze({
  LOGIN: "login",
  SIGNUP: "signup",
  VERIFY: "verify",
  FORGOT: "forgot",
  RESET: "reset",
});

const inputCls =
  "w-full h-11 px-5 rounded-full bg-white/[0.03] border border-white/[0.08] " +
  "text-[14.5px] text-white placeholder:text-gray-600 " +
  "focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.05] transition-colors";

const btnCls =
  "auth-btn w-full h-11 rounded-full bg-white text-black text-[14px] font-medium " +
  "hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none";
export default function AuthPage() {
  const { user, loading, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [step, setStep] = useState(
    searchParams.get("mode") === "signup" ? STEP.SIGNUP : STEP.LOGIN
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef(null);

const from = location.state?.from?.pathname || "/app";

useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === STEP.VERIFY) codeRef.current?.focus();
  }, [step]);

function clearMessages() {
  setError("");
  setNotice("");
}

// already signed in and visiting /auth → straight into the app
if (!loading && user) {
  return <Navigate to={from} replace />;
}

  async function handleLogin(e) {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
    const d = await api.login(email.trim(), password);
      setUser(d.user);
    } catch (err) {
      if (err.status === 403) {
        setStep(STEP.VERIFY);
        setNotice("Verify your email to continue — enter the 6-digit code we sent you.");
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    clearMessages();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await api.register(name.trim(), email.trim(), password);
      setStep(STEP.VERIFY);
      setNotice(`We sent a 6-digit code to ${email.trim()}.`);
      setCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      const d = await api.verify(email.trim(), code.trim());
      setUser(d.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    clearMessages();
    setBusy(true);
    try {
      await api.resendVerification(email.trim());
      setNotice("Code sent — check your inbox.");
      setCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setStep(STEP.RESET);
      setNotice(`If an account exists for ${email.trim()}, a reset code is on its way.`);
      setCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    clearMessages();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(email.trim(), code.trim(), newPassword);
      setStep(STEP.LOGIN);
      setPassword("");
      setCode("");
      setNewPassword("");
      setNotice("Password updated — sign in with your new password.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    [STEP.LOGIN]: "welcome back",
    [STEP.SIGNUP]: "create your account",
    [STEP.VERIFY]: "check your inbox",
    [STEP.FORGOT]: "reset password",
    [STEP.RESET]: "set a new password",
  };

  return (
    <div className="yo-shell relative min-h-dvh bg-black text-white flex flex-col items-center justify-center px-4 py-10 overflow-hidden isolate">

      {/* ghost mark — faint brand signature, cropped at the top, behind everything */}
      <div
        aria-hidden="true"
        className="auth-ghost pointer-events-none select-none absolute left-1/2 -translate-x-1/2 -top-24 -z-10"
      >
        <svg viewBox="320 243 601 760" className="block w-[min(80vw,540px)] h-auto" fill="currentColor">
          <path d="M340 263H428V402L507 484V263H604V710L428 530V600L604 832V983L362 662L340 636Z" />
          <path d="M641 263H760V353H727V718L760 678V822L641 973Z" />
          <path d="M781 263H901V636L781 795V648L816 602V353H781Z" />
        </svg>
      </div>

      {/* mark */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-7"
      >
        <Link to="/" aria-label="yo — home" className="flex items-center">
          <LogoFlat size={40} />
        </Link>
      </motion.div>

      {/* heading — floats on the canvas, serif for personality */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        className="text-center mb-7"
      >
        <h1 className="yo-serif text-[30px] sm:text-[34px] leading-[1.08] text-white">
          {titles[step]}
        </h1>
      <p className="mt-2.5 font-['Bebas_Neue'] text-[13px] tracking-[0.18em] text-gray-600 uppercase">
        THE GAME JUST CHANGED
      </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
        className="w-full max-w-[340px]"
      >
        <div>

          {notice && (
            <p className="text-[13px] text-gray-400 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 mb-4">
              {notice}
            </p>
          )}
          {error && (
            <p className="text-[13px] text-red-400 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-4">
              {error}
            </p>
          )}

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {step === STEP.LOGIN && (
              <>
                <form onSubmit={handleLogin} className="flex flex-col gap-3">
                  <input className={inputCls} type="email" placeholder="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <input className={inputCls} type="password" placeholder="password" autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button className={btnCls} disabled={busy}>{busy ? "..." : "Sign in"}</button>
                  <div className="flex items-center justify-between mt-1 text-[13px]">
                    <button type="button" onClick={() => { clearMessages(); setStep(STEP.SIGNUP); }}
                      className="text-gray-500 hover:text-gray-300 transition-colors">
                      Create account
                    </button>
                    <button type="button" onClick={() => { clearMessages(); setStep(STEP.FORGOT); }}
                      className="text-gray-500 hover:text-gray-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                </form>

                <div className="flex items-center gap-3 my-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[12px] text-gray-600">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <GoogleButton onError={setError} />
              </>
            )}

            {step === STEP.SIGNUP && (
              <>
                <form onSubmit={handleSignup} className="flex flex-col gap-3">
                  <input
                    className={inputCls}
                    type="text"
                    placeholder="your name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={40}
                  />

                  <input className={inputCls} type="email" placeholder="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <input className={inputCls} type="password" placeholder="password (min 8 characters)" autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <input className={inputCls} type="password" placeholder="confirm password" autoComplete="new-password"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  <button className={btnCls} disabled={busy}>{busy ? "..." : "Create account"}</button>
                  <p className="text-[13px] text-gray-500 text-center mt-1">
                    Already have an account?{" "}
                    <button type="button" onClick={() => { clearMessages(); setStep(STEP.LOGIN); }}
                      className="text-white hover:underline">
                      Sign in
                    </button>
                  </p>
                </form>

                <div className="flex items-center gap-3 my-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[12px] text-gray-600">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <GoogleButton onError={setError} />
              </>
            )}

            {step === STEP.VERIFY && (
              <form onSubmit={handleVerify} className="flex flex-col gap-3">
                <p className="text-[13px] text-gray-500 text-center -mt-2">{email}</p>
                <input
                  ref={codeRef}
                  className={`${inputCls} text-center text-xl tracking-[0.5em]`}
                  inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  placeholder="······"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
                <button className={btnCls} disabled={busy || code.length !== 6}>
                  {busy ? "..." : "Verify & continue"}
                </button>
                <button type="button" onClick={handleResend}
                  disabled={busy || cooldown > 0}
                  className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
                <button type="button" onClick={() => { clearMessages(); setStep(STEP.SIGNUP); }}
                  className="text-[13px] text-gray-600 hover:text-gray-400 transition-colors">
                  Wrong email? Go back
                </button>
              </form>
            )}

            {step === STEP.FORGOT && (
              <form onSubmit={handleForgot} className="flex flex-col gap-3">
                <input className={inputCls} type="email" placeholder="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button className={btnCls} disabled={busy}>{busy ? "..." : "Send reset code"}</button>
                <button type="button" onClick={() => { clearMessages(); setStep(STEP.LOGIN); }}
                  className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">
                  Back to sign in
                </button>
              </form>
            )}

            {step === STEP.RESET && (
              <form onSubmit={handleReset} className="flex flex-col gap-3">
                <p className="text-[13px] text-gray-500 text-center -mt-2">{email}</p>
                <input
                  className={`${inputCls} text-center tracking-[0.5em]`}
                  inputMode="numeric" maxLength={6} placeholder="······"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
                <input className={inputCls} type="password" placeholder="new password (min 8 characters)" autoComplete="new-password"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
                <button className={btnCls} disabled={busy}>{busy ? "..." : "Update password"}</button>
              </form>
            )}
          </motion.div>
        </div>

        <p className="text-center text-[13px] text-gray-600 mt-6">
          <Link to="/" className="hover:text-gray-400 transition-colors">← back to yo</Link>
        </p>
      </motion.div>
    </div>
  );
}