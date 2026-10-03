import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, RotateCcw } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import * as api from "../../../services/api";

const EASE = [0.16, 1, 0.3, 1];
const API_URL = import.meta.env.VITE_API_URL || "/api";
const GUEST_LIMIT = 12;
const SUGGESTION = "Why does my code keep calling itself when there's no loop?";
const LOOP = ["Ask", "Explain", "Example", "Analogy", "Check"];

const reveal = (d = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: EASE, delay: d },
});

/* strip leading "..." / dots YO sometimes emits — never render bare dot-pills */
function displayYo(text) {
  if (!text) return text;
  return text.replace(/^[.\s·…]+/, "");
}

export default function AskShowcase() {
  const reduce = useReducedMotion();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [guestSent, setGuestSent] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);

  const chatIdRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const authed = !!user;
  const guestRemaining = GUEST_LIMIT - guestSent;
  const inputDisabled = sending || (!authed && (limitReached || guestRemaining <= 0));

  // follow the newest response — chat container only, never the page
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 200) {
      el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    }
  }, [messages, reduce]);

  async function send(textRaw) {
    const text = (textRaw ?? input).trim();
    if (!text || sending || inputDisabled) return;

    setError("");
    setInput("");
    setSending(true);

    const base = [...messagesRef.current, { role: "user", content: text }];
    setMessages(base);

    try {
      let reader;

      if (authed) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        if (!chatIdRef.current) {
          const d = await api.newChat("chill");
          chatIdRef.current = d.chat_id;
        }
        const res = await api.sendMessage(chatIdRef.current, text, []);
        reader = res.body.getReader();
      } else {
        const history = base.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        const res = await fetch(`${API_URL}/guest/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: text, history }),
        });

        if (res.status === 429) {
          setMessages((prev) => prev.slice(0, -1));
          setLimitReached(true);
          setSending(false);
          return;
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Couldn't reach yo. Try again.");
        }
        reader = res.body.getReader();
      }

      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snapshot };
          return next;
        });
      }

      if (!authed) {
        const sent = guestSent + 1;
        setGuestSent(sent);
        if (sent >= GUEST_LIMIT) setLimitReached(true);
      }
    } catch (e) {
      console.error("Landing chat failed:", e);
      setError(e.message || "Something went wrong. Try again.");
      setMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant" && prev[prev.length - 1].content === ""
          ? prev.slice(0, -1)
          : prev
      );
    } finally {
      setSending(false);
    }
  }

  /* live learning progression — mirrors chat state */
  const currentStage = Math.min(messages.filter((m) => m.role === "user").length, 4);
  const stageDetail = {
    Ask: "Start with a question.",
    Explain: "Get a clear first answer.",
    Example: "See it in real code.",
    Analogy: "Make it click.",
    Check: "Prove you got it.",
  };

  return (
    <section id="ask" className="yol-section relative">
      <div className="yol-container">
        <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">

          {/* ═══ LEFT — compact learning map ═══ */}
          <div className="lg:pt-2">
            <motion.div {...reveal(0)} className="flex items-center gap-4">
              <span className="yol-eyebrow">Ask</span>
              <span className="flex-1 h-px bg-[var(--yol-border)]" />
            </motion.div>

            <motion.h2 {...reveal(0.06)} className="yol-h2 mt-5">
              Ask without
              <span className="block text-[var(--yol-muted)]">knowing how.</span>
            </motion.h2>

            <motion.p {...reveal(0.12)} className="yol-body mt-5 max-w-md">
              YO helps you turn a rough question into something you can actually
              understand.
            </motion.p>

            <motion.div {...reveal(0.18)} className="mt-8" aria-hidden="true">
              {LOOP.map((s, i) => {
                const done = i < currentStage;
                const active = i === currentStage;
                return (
                  <div key={s} className="relative flex items-start gap-4 pb-4 last:pb-0">
                    {i < LOOP.length - 1 && (
                      <span
                        className={`absolute left-[3px] top-[13px] w-px h-[calc(100%-10px)] transition-colors duration-700 ${
                          done ? "bg-[var(--yol-border-strong)]" : "bg-[var(--yol-border)]"
                        }`}
                      />
                    )}
                    <span
                      className={`relative mt-[2px] w-[7px] h-[7px] rounded-full shrink-0 border transition-all duration-500 ${
                        active
                          ? "bg-[var(--yol-fg)] border-[var(--yol-fg)] scale-110"
                          : done
                            ? "bg-[var(--yol-muted)] border-[var(--yol-muted)]"
                            : "bg-transparent border-[var(--yol-faint)]"
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-[11px] font-mono uppercase tracking-[0.22em] transition-colors duration-500 ${
                          active ? "text-[var(--yol-fg)]" : done ? "text-[var(--yol-muted)]" : "text-[var(--yol-faint)]"
                        }`}
                      >
                        {s}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] font-light transition-opacity duration-500 ${
                          active ? "text-[var(--yol-faint)] opacity-100" : "opacity-0 h-0 overflow-hidden"
                        }`}
                      >
                        {stageDetail[s]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* ═══ RIGHT — product surface ═══ */}
          <motion.div {...reveal(0.1)} className="relative">
            <div className="rounded-2xl border border-[var(--yol-border)] bg-[var(--yol-bg)] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col">

              {/* header — accurate session state */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--yol-border)] shrink-0">
                <span className="text-[10px] font-mono uppercase tracking-[0.26em] text-[var(--yol-muted)]">
                  yo <span className="text-[var(--yol-faint)]">—</span> chat
                </span>
                <span className="text-[9px] font-mono tracking-[0.14em] text-[var(--yol-faint)] uppercase">
                  {authed ? "signed in · saving" : "guest · not saved"}
                </span>
              </div>

              {/* messages — bottom padding reserves composer space */}
              <div
                ref={scrollRef}
                className="px-5 sm:px-6 pt-6 space-y-4 min-h-[360px] max-h-[540px] overflow-y-auto pb-16 sm:pb-24"
                aria-live="polite"
              >
                {messages.length === 0 && (
                  <div className="min-h-[240px] flex flex-col items-center justify-center text-center gap-3">
                    <p className="text-[13px] text-[var(--yol-muted)] font-light">Ask YO anything.</p>
                    <p className="text-[11px] text-[var(--yol-faint)] font-light">
                      Try a question about something you're learning.
                    </p>
                    {!authed && (
                      <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--yol-faint)] opacity-70">
                        {GUEST_LIMIT} free messages · not saved
                      </p>
                    )}
                    <button
                      onClick={() => send(SUGGESTION)}
                      disabled={sending}
                      className="group mt-1 max-w-full px-4 py-2.5 rounded-xl border border-dashed border-[var(--yol-border-strong)] text-[12.5px] text-[var(--yol-muted)] hover:text-[var(--yol-fg)] hover:border-[var(--yol-fg)]/40 hover:bg-[var(--yol-surface)] transition-colors disabled:opacity-40"
                    >
                      <span className="text-[var(--yol-faint)] font-mono text-[9px] uppercase tracking-[0.18em] mr-2 group-hover:text-[var(--yol-muted)]">try</span>
                      {SUGGESTION}
                    </button>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] ${m.role === "user" ? "min-w-0" : "w-[92%]"}`}>
                      <div className={`text-[8.5px] font-mono uppercase tracking-[0.22em] text-[var(--yol-faint)] mb-1 ${m.role === "user" ? "text-right" : ""}`}>
                        {m.role === "user" ? "You" : "yo"}
                      </div>
                      {m.role === "user" ? (
                        <div className="inline-block rounded-xl rounded-tr-[4px] bg-[var(--yol-surface-2)] border border-[var(--yol-border)] px-3.5 py-2 text-[13px] leading-[1.55]">
                          {m.content}
                        </div>
                                            ) : (
                            <p className="text-[13.5px] leading-[1.7] text-[var(--yol-fg)] whitespace-pre-wrap pt-1 pb-1">
                          {displayYo(m.content)}
                          {sending && i === messages.length - 1 && !m.content && (
                            <span
                              className="cursor-stream inline-block ml-1"
                              style={{ height: "13px", background: "var(--yol-fg)", boxShadow: "none" }}
                              aria-label="yo is thinking"
                            />
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

                            {/* gate — occupies the composer slot when the limit hits */}
              {limitReached && !authed ? (
                <div className="relative shrink-0 h-[150px] sm:h-[128px]">
                  <div className="absolute inset-x-3 bottom-3">
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="rounded-2xl border border-[var(--yol-border-strong)] bg-[var(--yol-surface-2)] px-4 py-3.5 shadow-[0_12px_36px_-14px_rgba(0,0,0,0.65)]"
                    >
                      <p className="text-[13px] font-medium">Enjoying YO?</p>
                      <p className="mt-0.5 text-[11.5px] text-[var(--yol-muted)] leading-[1.5]">
                        You've reached the guest chat limit. Sign in to continue and save chats.
                        <span className="block text-[10px] text-[var(--yol-faint)] mt-0.5">
                          Guest chats aren't saved.
                        </span>
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <Link
                          to="/auth"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] text-[12px] font-medium hover:opacity-85 transition-opacity min-h-[36px]"
                        >
                          Log in <span aria-hidden="true">→</span>
                        </Link>
                        <Link
                          to="/auth?mode=signup"
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-full border border-[var(--yol-border-strong)] text-[12px] text-[var(--yol-muted)] hover:text-[var(--yol-fg)] transition-colors min-h-[36px]"
                        >
                          Create account
                        </Link>
                      </div>
                    </motion.div>
                  </div>
                </div>
              ) : (
                /* ═══ floating composer — slimmer command bar ═══ */
                <div className="shrink-0 sm:relative sm:shrink-0 sm:h-[74px]">
                  <div className="px-3 pb-3 pt-1 sm:absolute sm:inset-x-3 sm:bottom-3 sm:p-0">
                    {error && (
                      <p className="px-2 pb-1.5 text-[11.5px] text-red-400">{error}</p>
                    )}
                    <div
                      className={`flex items-center gap-2 rounded-2xl border bg-[var(--yol-surface-2)] pl-4 pr-1.5 py-1.5 shadow-[0_12px_36px_-14px_rgba(0,0,0,0.65)] transition-colors ${
                        focused ? "border-[var(--yol-border-strong)]" : "border-[var(--yol-border)]"
                      }`}
                    >
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        maxLength={2000}
                        disabled={inputDisabled}
                        placeholder={authed ? "Ask yo anything…" : "Ask yo anything — no account needed"}
                        className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] text-[var(--yol-fg)] placeholder:text-[var(--yol-faint)] disabled:opacity-40"
                      />
                      <button
                        onClick={() => send()}
                        disabled={inputDisabled || !input.trim()}
                        aria-label="Send"
                        className={`shrink-0 w-[32px] h-[32px] rounded-full flex items-center justify-center border transition-all ${
                          inputDisabled || !input.trim()
                            ? "bg-[var(--yol-surface)] text-[var(--yol-faint)] border-[var(--yol-border)] opacity-60 pointer-events-none"
                            : "bg-[var(--yol-accent)] text-[var(--yol-accent-fg)] border-transparent hover:opacity-85 active:scale-90"
                        }`}
                      >
                        <ArrowUp size={13} />
                      </button>
                      {messages.length > 0 && !sending && (
                        <button
                          onClick={() => { setMessages([]); setGuestSent(0); setLimitReached(false); setError(""); chatIdRef.current = null; }}
                          title="Clear this conversation"
                          aria-label="Clear conversation"
                          className="shrink-0 w-[32px] h-[32px] rounded-full border border-[var(--yol-border)] text-[var(--yol-faint)] hover:text-[var(--yol-muted)] hover:border-[var(--yol-border-strong)] hover:rotate-[-90deg] transition-all duration-300"
                        >
                          <RotateCcw size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}