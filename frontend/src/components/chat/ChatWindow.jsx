import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import * as api from "../../services/api";
import { PanelLeft, ListChecks, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import QuizModal from "./QuizModal";
import PersonalityStreams from "./PersonalityStreams";

const EASE = [0.16, 1, 0.3, 1];

// use whatever host the page was loaded from (localhost, 127.0.0.1, or a
// LAN IP like 192.168.x.x) instead of a hardcoded 127.0.0.1 — this is
// what makes the app actually work when opened from a phone on the
// same network, since "127.0.0.1" on a phone means the phone itself
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const MODE_META = {
  chill: {
    emoji: "😎",
    label: "Chill",
    description: "Explore freely",
  },
  exam: {
    emoji: "📚",
    label: "Exam",
    description: "Focus & revise",
  },
  coding: {
    emoji: "💻",
    label: "Coding",
    description: "Build & debug",
  },
  interview: {
    emoji: "💼",
    label: "Interview",
    description: "Practice & prepare",
  },
};

export default function ChatWindow({
  user,
  chatId,
  resetSignal,
  sessionMode,
  onChatCreated,
  refreshChats,
  onOpenSidebar,
  sidebarCollapsed,
  onExpandSidebar,
  onMessagesChange,
}) {
    const reduce = useReducedMotion();
    const userName =
    user?.display_name ||
    user?.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "there";

  const [messages, setMessages] = useState([]);
  const [activeMode, setActiveMode] = useState(sessionMode || null);
  const [modeSelected, setModeSelected] = useState(false);
  const [messageIds, setMessageIds] = useState({}); // track AI message DB IDs
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(null); // which message is thinking
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const shouldAutoScrollRef = useRef(true);
  const [studySet, setStudySet] = useState(null);
  const [documents, setDocuments] = useState([]);
  const skipNextFetchRef = useRef(false);

  // report whether the open chat has messages — the sidebar's Export
  // pill dims itself while a fresh chat is still empty
  const hasMessages = messages.length > 0;
  useEffect(() => {
    onMessagesChange?.(hasMessages);
  }, [hasMessages, onMessagesChange]);


  // Load messages whenever the active chat changes (e.g. user clicks
  // a different conversation in the sidebar)
  useEffect(() => {

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

   if (!chatId) {
      setMessages([]);
      setActiveMode(sessionMode || null);
      setStudySet(null);
      setDocuments([]);
      setModeSelected(false);
      return;
    }

    async function loadMessages() {
      try {
      const data = await api.getChatMessages(chatId);

      if (data.error) {
        console.error("Failed to load chat:", data.error);
        return;
      }
        shouldAutoScrollRef.current = true;

        setMessages(data.messages || []);
        setActiveMode(data.mode || null);
        setDocuments(data.documents || []);
        setModeSelected(true);
      }
      catch (error) {
        console.log("Failed to load chat", error);
      }
    }

    loadMessages();

  }, [chatId]);


  // "New Chat" was clicked — clear the message list. The composer clears
  // itself separately (see ChatInput's own resetSignal effect).
  useEffect(() => {
  if (resetSignal === 0) return;
  shouldAutoScrollRef.current = true;
  setMessages([]);
    setActiveMode(sessionMode || null);
  setStudySet(null);
  // fresh state = no active-chat chrome, or the docked composer stays
  // mounted under the starting composer (the "two composers" bug)
  setModeSelected(false);
}, [resetSignal]);


  // Auto scroll — but only if the user is already near the bottom.
  // Force-scrolling on every update (including streaming) would yank
  // someone back down even after they've scrolled up to read earlier
  // messages, which defeats the point of the jump-to-latest button.
  useEffect(() => {
  if (shouldAutoScrollRef.current) {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }
}, [messages]);


  // track whether the user has scrolled up, away from the latest
  // message, to decide whether to show the "jump to latest" button
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    function checkPosition() {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowJumpButton(distanceFromBottom > 150);
    }

    checkPosition();
    el.addEventListener("scroll", checkPosition);
    return () => el.removeEventListener("scroll", checkPosition);
  }, [chatId]);

  // also re-check whenever the message list itself changes (new message,
  // or a streaming reply growing the page height) — a scroll event alone
  // wouldn't fire just because content grew underneath an unmoved viewport
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpButton(distanceFromBottom > 150);
  }, [messages]);

  // stable reference — passed down to the memoized ChatInput, so it
  // doesn't cause ChatInput to re-render on every ChatWindow render
  const jumpToLatest = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Handle message feedback (thumbsup/thumbsdown)
  const handleFeedback = useCallback((messageId, feedback) => {
      api.setMessageFeedback(messageId, feedback).catch(err => {
      console.error("Failed to save feedback:", err);
    });
  }, []);

  // Takes the composed message/attachments as parameters instead of
  // reading them from component state — the actual text/attachment state
  // now lives in ChatInput, not here. Wrapped in useCallback with a
  // narrow dependency list (using functional setMessages updates) so the
  // function reference passed to ChatInput stays stable across renders.
  const sendMessage = useCallback(async (userMessage, pendingAttachments) => {
    // first send from the starting page: reveal the active-chat chrome
    // (navbar + docked composer). New chats skip the chatId-fetch effect,
    // so modeSelected would otherwise stay false until the chat is
    // reopened from history.
    setModeSelected(true);

    const displayText = userMessage || (
  pendingAttachments.length > 0
    ? `📎 ${pendingAttachments.map(a => a.file.name).join(", ")}`
    : ""
);

// Grab preview URLs for images so we can display them in the bubble
const imagePreviews = pendingAttachments
  .filter(a => a.isImage && a.previewUrl)
  .map(a => a.previewUrl);

const newMessageIndex = messages.length;
setMessages(prev => [
  ...prev,
  {
    user: displayText,
    ai: "",
    streaming: true,
    thinking: true,
    images: imagePreviews
  }
]);
    setThinkingMessageIndex(newMessageIndex);

    let currentChatId = chatId;

    try {

      // first message of a brand-new conversation: create the chat row now
      if (!currentChatId) {
      const newChatData = await api.newChat(activeMode || "chill");
        currentChatId = newChatData.chat_id;

        skipNextFetchRef.current = true;
        onChatCreated(currentChatId);

        if (refreshChats) {
          refreshChats();
        }
      }

      const response = await api.sendMessage(
        currentChatId,
        userMessage,
        pendingAttachments.map((a) => a.file)
      );

      // stream the reply in as it arrives, updating the last bubble live
      // instead of waiting for the whole response — throttled to avoid
      // re-rendering on every single tiny chunk, which is what caused
      // the laggy/glitchy feeling before
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
            let accumulated = "";
      let lastRenderAt = 0;
      let thinkingCleared = false;
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        if (!thinkingCleared && accumulated.length > 0) {
          thinkingCleared = true;
          setThinkingMessageIndex(null);
        }

        // First chunk: render instantly (no waiting).
        // Rest: throttle at 50ms for smooth readable pace.
        const now = performance.now();
        if (isFirstChunk || now - lastRenderAt > 65) {
          isFirstChunk = false;
          lastRenderAt = now;
          setMessages(prev =>
            prev.map((msg, index) =>
              index === prev.length - 1
                ? { ...msg, ai: accumulated, streaming: true, thinking: false }
                : msg
            )
          );
        }
      }

      // final flush — guarantees the last bit isn't dropped by the
      // throttle, and flips streaming off so it renders as real
      // formatted markdown now that the full text is in
      setMessages(prev =>
        prev.map((msg, index) =>
          index === prev.length - 1
            ? { ...msg, ai: accumulated, streaming: false }
            : msg
        )
      );

            // pick up real message IDs from the DB (needed for feedback,
      // regenerate and edit) — silent, no scroll jump
      try {
        const fresh = await api.getChatMessages(currentChatId);
        if (Array.isArray(fresh.messages)) {
          // re-attach this turn's image previews — the DB stores only the
          // "[sent N image(s)]" text; blob URLs stay valid for the session
          if (imagePreviews.length > 0 && fresh.messages.length > 0) {
            fresh.messages[fresh.messages.length - 1].images = imagePreviews;
          }
          setMessages(fresh.messages);
        }
      } catch (e) {
        console.log("Post-stream refresh failed:", e);
      }

      // backend may have just auto-titled this chat (first message) —
      // refresh the sidebar so the real title shows up
      refreshChats();

    }
    catch (error) {

      console.error("Send message failed:", error);

      setMessages(prev =>
        prev.map((msg, index) =>
          index === prev.length - 1
            ? { ...msg, ai: `that didn't land right. try again? (${error.message})`, streaming: false }
            : msg
        )
      );

    }

  }, [chatId, sessionMode, activeMode, onChatCreated, refreshChats]);

  // Regenerate the latest AI response
  // Called with messageIndex to regenerate that specific message
    const handleRegenerate = useCallback(async (messageIndex) => {
    const pair = messages[messageIndex];
    if (!pair || !chatId) return;
    const userMessage = pair.user;
    if (!userMessage) return;

    try {
      await api.truncateMessages(chatId, pair.id);
    } catch (e) {
      console.error("Truncate failed:", e);
      return;
    }

    setMessages(prev => prev.slice(0, messageIndex));
    sendMessage(userMessage, []);
  }, [messages, chatId, sendMessage]);

  const handleEditMessage = useCallback(async (messageIndex, newText) => {
    const pair = messages[messageIndex];
    if (!pair || !chatId) return;

    try {
      await api.truncateMessages(chatId, pair.id);
    } catch (e) {
      console.error("Truncate failed:", e);
      return;
    }

    shouldAutoScrollRef.current = true;
    setMessages(prev => prev.slice(0, messageIndex));
    sendMessage(newText, []);
  }, [messages, chatId, sendMessage]);


  return (

    <div className="flex-1 h-full flex flex-col bg-black text-white min-w-0 overflow-hidden relative isolate">

     

      {/* desktop-only floating re-expand icon, shown when the sidebar is collapsed —
          floats directly over the content, doesn't reserve a header strip */}

                {/* ghost watermark — the mark, huge and barely-there, pinned to the top.
          Behind all content (negative z, root is isolated). Starting page only. */}
      {messages.length === 0 && (
        <div
          aria-hidden="true"
          className="yo-ghost yo-ghost-wrap pointer-events-none select-none absolute inset-x-0 mx-auto -z-10 w-[100vw] sm:w-[min(66vw,780px)]"
        >
          <svg viewBox="320 243 601 760" className="block w-full h-auto" fill="currentColor" shapeRendering="geometricPrecision">
            <path d="M340 263H428V402L507 484V263H604V710L428 530V600L604 832V983L362 662L340 636Z" />
            <path d="M641 263H760V353H727V718L760 678V822L641 973Z" />
            <path d="M781 263H901V636L781 795V648L816 602V353H781Z" />
          </svg>
        </div>
      )}

      {messages.length === 0 && (
        <PersonalityStreams />
      )}

      {sidebarCollapsed && (
        <button
          onClick={onExpandSidebar}
          className="
            hidden sm:flex
            absolute top-4 left-4 z-20
            w-9 h-9 items-center justify-center
            rounded-lg text-gray-300 hover:bg-white/10
            transition-colors
          "
          title="Expand sidebar"
        >
          <PanelLeft size={18} />
        </button>
      )}

      {/* ═══ floating nav — mobile: ☰ + pill in one row · desktop: centered pill ═══ */}
      <div className="sm:hidden absolute top-3 left-2 right-2 z-30 flex items-center gap-1.5">
        <button
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className={`shrink-0 h-11 px-3.5 flex items-center text-gray-200 transition-all ${
            modeSelected
              ? "rounded-full border border-white/[0.12] bg-neutral-900/70 backdrop-blur-xl active:bg-white/10"
              : "active:opacity-70"
          }`}
        >
          <span className="flex flex-col gap-[4px]">
            <span className="block h-[1.5px] w-3.5 bg-current rounded-full" />
            <span className="block h-[1.5px] w-2.5 bg-current rounded-full" />
          </span>
        </button>

        <div
                    className={`flex-1 flex items-center h-11 rounded-full border border-white/[0.12] bg-neutral-900/95 backdrop-blur-xl pl-4 pr-1.5 gap-2 transition-opacity duration-300 ${
            modeSelected ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <span className="text-[13px] font-medium text-white whitespace-nowrap">
            {activeMode ? MODE_META[activeMode]?.label : "YO"}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setStudySet({ kind: "quiz" })}
            disabled={!chatId}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 h-8 text-[12px] text-gray-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ListChecks size={13} /> Quiz
          </button>
          <button
            type="button"
            onClick={() => setStudySet({ kind: "flashcards" })}
            disabled={!chatId}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 h-8 text-[12px] text-gray-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Layers size={13} /> Cards
          </button>
        </div>
      </div>

      <div
        className={`hidden sm:flex absolute top-3 left-0 right-0 z-20 mx-auto items-center h-12 rounded-full border border-white/[0.12] bg-neutral-900/95 backdrop-blur-xl pl-5 pr-2 gap-3 max-w-3xl transition-opacity duration-300 ${
          modeSelected ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-[13px] font-medium text-white">
          {activeMode ? MODE_META[activeMode]?.label : "YO"}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setStudySet({ kind: "quiz" })}
          disabled={!chatId}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 h-8 text-[12px] text-gray-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ListChecks size={13} /> Quiz
        </button>
        <button
          type="button"
          onClick={() => setStudySet({ kind: "flashcards" })}
          disabled={!chatId}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 h-8 text-[12px] text-gray-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Layers size={13} /> Cards
        </button>
      </div>
      {messages.length > 0 && (
        <>
          <div aria-hidden="true" className="yo-blur-band yo-blur-band--top" />
          <div aria-hidden="true" className="yo-blur-band yo-blur-band--bottom" />
        </>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-10 pt-20 sm:pt-20 pb-[60px] sm:pb-[60px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ contain: "content" }}
      >

        {messages.length === 0 ? (

          <div className="h-full flex flex-col items-center px-4 pb-8">
            {/* intentional empty space above — the composition sits low */}
            <div className="h-[50vh] sm:h-[24vh]" aria-hidden="true" />

            {/* ═══ MOBILE — editorial hero · text mode selector · composer low ═══ */}
            <div className="lg:hidden w-full self-start pl-4 pr-4 order-1">
              <span className="block font-mono text-[16px] tracking-[0.04em] text-gray-400 pl-[2.1em]">
                  yo {userName}
                </span>
              <span className="yo-serif block whitespace-nowrap text-[clamp(26px,8.6vw,42px)] leading-[1.05] text-white mt-0">
                Leave the rest to me
              </span>
            </div>

            {/* mobile modes — one quiet text line, not buttons */}
            <div className="lg:hidden order-2 mt-4 self-start pl-4 flex flex-wrap items-center gap-x-2 gap-y-1">
              {Object.entries(MODE_META).map(([mode, meta], i) => (
                <span key={mode} className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-gray-600 text-[12px]" aria-hidden="true">·</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveMode(mode)}
                    className={`text-[14px] transition-colors duration-200 ${
                      activeMode === mode
                        ? "text-white underline underline-offset-[6px] decoration-current"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {meta.label}
                  </button>
                </span>
              ))}
            </div>

            {/* mobile composer — pinned toward the bottom */}
            {!chatId && (
              <div className="lg:hidden order-3 w-full mt-2">
                <ChatInput
                  variant="compact"
                  resetSignal={resetSignal}
                  showJumpButton={showJumpButton}
                  onJumpToLatest={jumpToLatest}
                  onSend={sendMessage}
                />

                {/* selected mode — quiet label under the composer */}
                <AnimatePresence mode="popLayout">
                  {activeMode && (
                    <motion.span
                      key={activeMode}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeOut" } }}
                      transition={{ duration: 0.8, ease: [0.45, 0.05, 0.25, 1] }}
                      className="block mt-2.5 pl-3 text-[11px] font-mono text-gray-500 select-none whitespace-nowrap"
                    >
                      {MODE_META[activeMode]?.emoji} {MODE_META[activeMode]?.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ═══ DESKTOP — low editorial hero · composer · mode pills below ═══ */}
                        <div className="hidden lg:flex flex-col items-center w-full flex-1 min-h-0">
                        <div className="h-[calc(22vh_+_24px)]" aria-hidden="true" />

                            <div className="text-left">
                <span className="block font-mono text-[16px] tracking-[0.04em] text-gray-400 pl-[2.1em]">
                  yo {userName}
                </span>
                <span className="hero-breathe block text-[60px] leading-[1.04] font-semibold tracking-[-0.035em] text-white mt-2">
                  Leave the rest to me
                </span>
              </div>

              {!chatId && (
                <div className="w-full max-w-2xl mt-8">
                  <ChatInput
                    variant="hero"
                    modeTag={activeMode ? `${MODE_META[activeMode]?.emoji} ${activeMode} mode` : null}
                    resetSignal={resetSignal}
                    showJumpButton={showJumpButton}
                    onJumpToLatest={jumpToLatest}
                    onSend={sendMessage}
                  />
                </div>
              )}

                            {/* desktop mode pills — BELOW the composer */}
              <div className="mt-6 flex items-center justify-center gap-3">
                {Object.entries(MODE_META).map(([mode, meta]) => (
                                    <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveMode(mode)}
                    className={`relative overflow-hidden rounded-full p-px text-[13px] transition-all duration-200 active:scale-[0.97] ${
                      activeMode === mode
                        ? "bg-white/25 text-white"
                        : "bg-white/[0.08] text-gray-400 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                                        <motion.span
                      aria-hidden="true"
                      className="absolute left-1/2 top-1/2 aspect-square w-[300%] text-white opacity-40"
                      style={{ x: "-50%", y: "-50%", background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, currentColor 342deg, transparent 357deg)" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                    />
                    <span className={`relative flex items-center gap-2 h-[34px] px-4 rounded-full ${activeMode === mode ? "yo-mode-active bg-neutral-700" : "bg-neutral-900"}`}>
                      <span className="text-[13px] leading-none">{meta.emoji}</span>
                      <span className="font-medium">{meta.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (

                   <div className="max-w-3xl mx-auto space-y-8 pt-4 sm:pt-12">

            {messages.map((msg, index) => (
  <div key={index} className="space-y-4">
    <MessageBubble
      type="user"
      text={msg.user}
      images={msg.images}
      messageIndex={index}
      onEdit={handleEditMessage}
    />
    <MessageBubble
      type="ai"
      text={msg.ai}
      streaming={msg.streaming}
      thinking={msg.thinking}
      messageId={msg.id}
      feedback={msg.feedback}
      messageIndex={index}
      onRegenerate={handleRegenerate}
      onFeedback={handleFeedback}
    />
  </div>
))}

            <div ref={bottomRef} />

          </div>

        )}

      </div>

      {modeSelected && messages.length > 0 && (
        <ChatInput
          variant="docked"
          resetSignal={resetSignal}
          showJumpButton={showJumpButton}
          onJumpToLatest={jumpToLatest}
          onSend={sendMessage}
        />
      )}

      {studySet && chatId && (
        <QuizModal
          chatId={chatId}
          kind={studySet.kind}
          documents={documents}
          onClose={() => setStudySet(null)}
        />
      )}

    </div>

  )

}