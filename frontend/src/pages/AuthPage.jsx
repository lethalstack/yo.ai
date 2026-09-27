import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import Logo from "../components/Logo";
import GoogleButton from "../components/GoogleButton";

const STEP = Object.freeze({
  LOGIN: "login",
  SIGNUP: "signup",
  VERIFY: "verify",
  USERNAME: "username",
  FORGOT: "forgot",
  RESET: "reset",
});

const inputCls =
  "w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 " +
  "text-[15px] text-white placeholder:text-gray-600 " +
  "focus:outline-none focus:border-white/30 transition-colors";

const btnCls =
  "w-full h-11 rounded-xl bg-white text-black text-sm font-medium " +
  "hover:opacity-85 transition-opacity disabled:opacity-40 disabled:pointer-events-none";

export default function AuthPage() {
  const { user, loading, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [step, setStep] = useState(
    searchParams.get("mode") === "signup" ? STEP.SIGNUP : STEP.LOGIN
  );
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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

useEffect(() => {
  function handleUsernameRequired() {
    clearMessages();
    setUsername("");
    setStep(STEP.USERNAME);
  }

  window.addEventListener("yo:username-required", handleUsernameRequired);

  return () => {
    window.removeEventListener("yo:username-required", handleUsernameRequired);
  };
}, []);

// already signed in and visiting /auth → straight into the app
if (!loading && user && user.username) {
  return <Navigate to={from} replace />;
}

  async function handleLogin(e) {
    e.preventDefault();
    clearMessages();
    setBusy(true);
    try {
      const d = await api.login(email.trim(), password);
      if (!d.user?.username) {
        setUsername("");
        setStep(STEP.USERNAME);
      } else {
        setUser(d.user);
      }
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
      await api.register(username.trim(), email.trim(), password);
      setStep(STEP.VERIFY);
      setNotice(`We sent a 6-digit code to ${email.trim()}.`);
      setCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUsernameSetup(e) {
  e.preventDefault();
  clearMessages();

  const cleanUsername = username.trim();

  if (!/^[A-Za-z0-9_]{3,20}$/.test(cleanUsername)) {
    setError(
      "Username must be 3–20 characters using only letters, numbers, or underscores."
    );
    return;
  }

  setBusy(true);

  try {
    const d = await api.setUsername(cleanUsername);

    if (!d.user) {
      throw new Error("Unable to save username.");
    }

    setUser(d.user);
  } catch (err) {
    setError(err.message || "Unable to save username.");
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
    <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center px-4 py-10">

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="flex justify-center mb-8 hover:opacity-75 transition-opacity">
          <Logo className="text-2xl font-semibold tracking-[-0.03em] text-white" />
        </Link>

        <div className="border border-white/10 rounded-2xl bg-white/[0.02] p-7">
          <h1 className="text-lg font-semibold text-center mb-6">{titles[step]}</h1>

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
                      className="text-gray-500 hover:text-white transition-colors">
                      Create account
                    </button>
                    <button type="button" onClick={() => { clearMessages(); setStep(STEP.FORGOT); }}
                      className="text-gray-500 hover:text-white transition-colors">
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
                    placeholder="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={20}
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
                  className="text-[13px] text-gray-500 hover:text-white transition-colors disabled:opacity-40">
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </button>
                <button type="button" onClick={() => { clearMessages(); setStep(STEP.SIGNUP); }}
                  className="text-[13px] text-gray-600 hover:text-gray-400 transition-colors">
                  Wrong email? Go back
                </button>
              </form>
            )}

            {step === STEP.USERNAME && (
              <form onSubmit={handleUsernameSetup} className="flex flex-col gap-3">
                <div className="text-center mb-2">
                  <h2 className="text-white text-base font-medium">Choose your username</h2>
                  <p className="text-[13px] text-gray-500 mt-1">
                    This is how you'll appear in yo.
                  </p>
                </div>

                <input
                  className={inputCls}
                  type="text"
                  placeholder="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[A-Za-z0-9_]{3,20}"
                />

                <button className={btnCls} disabled={busy}>
                  {busy ? "..." : "Continue"}
                </button>
              </form>
            )}

            {step === STEP.FORGOT && (
              <form onSubmit={handleForgot} className="flex flex-col gap-3">
                <input className={inputCls} type="email" placeholder="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button className={btnCls} disabled={busy}>{busy ? "..." : "Send reset code"}</button>
                <button type="button" onClick={() => { clearMessages(); setStep(STEP.LOGIN); }}
                  className="text-[13px] text-gray-500 hover:text-white transition-colors">
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