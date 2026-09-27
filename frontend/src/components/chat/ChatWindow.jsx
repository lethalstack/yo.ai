import { useState, useRef, useEffect, useCallback } from "react";
import * as api from "../../services/api";
import { PanelLeft, ListChecks, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import QuizModal from "./QuizModal";

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
}) {
    const displayName =
    user?.email
      ?.split("@")[0]
      ?.replace(/[._-]+/g, " ")
      ?.replace(/\b\w/g, (char) => char.toUpperCase()) || "there";

  const [messages, setMessages] = useState([]);
  const [activeMode, setActiveMode] = useState(sessionMode || "chill");
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

  // Load messages whenever the active chat changes (e.g. user clicks
  // a different conversation in the sidebar)
  useEffect(() => {

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

   if (!chatId) {
      setMessages([]);
      setActiveMode(sessionMode || "chill");
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
        setActiveMode(data.mode || "chill");
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
  setActiveMode(sessionMode || "chill");
  setStudySet(null);
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
        const newChatData = await api.newChat(sessionMode || "chill");
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

  }, [chatId, sessionMode, onChatCreated, refreshChats]);

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

    <div className="flex-1 h-full flex flex-col bg-black text-white min-w-0 overflow-hidden relative">

      {/* mobile-only floating menu toggle — FIXED to prevent keyboard scroll */}
      <button
        onClick={onOpenSidebar}
        className="
          sm:hidden
          fixed top-3 left-3 z-20
          w-9 h-9 flex flex-col items-center justify-center gap-[4px]
          rounded-full text-gray-200
          bg-neutral-900/95 border border-white/10
          active:bg-white/10
          transition-colors
        "
      >
        <span className="block h-[1.5px] w-3.5 bg-current rounded-full" />
        <span className="block h-[1.5px] w-2 bg-current rounded-full self-start ml-[11px]" />
      </button>

      {/* mobile-only floating yo pill — FIXED to prevent keyboard scroll */}
      <Link
        to="/"
        className="
          sm:hidden
          fixed top-3 right-3 z-20
          h-9 px-3 flex items-center
          rounded-full text-[12px] font-semibold tracking-[-0.03em] text-white
          bg-neutral-900/95 border border-white/10
        "
      >
        yo<span className="opacity-40"></span>
      </Link>

      {/* desktop-only floating re-expand icon, shown when the sidebar is collapsed —
          floats directly over the content, doesn't reserve a header strip */}
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

      {/* Study tools */}
        {modeSelected && (
          <div className="absolute top-3 left-1/2 z-30 w-[calc(100%-2rem)] -translate-x-1/2 sm:w-[calc(100%-5rem)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-neutral-950/90 px-4 py-1 backdrop-blur-xl">
            <span className="text-sm text-gray-500">
              {MODE_META[activeMode]?.label || "Chill Mode"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStudySet({ kind: "quiz" })}
                disabled={!chatId}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ListChecks size={15} />
                Quiz
              </button>

              <button
                type="button"
                onClick={() => setStudySet({ kind: "flashcards" })}
                disabled={!chatId}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Layers size={15} />
                Cards
              </button>
            </div>
          </div>
        </div>
        )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-10 pt-16 sm:pt-8 pb-24 sm:pb-20"
        style={{ contain: "content" }}
      >

        {messages.length === 0 ? (

          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight">
                yo wassup. leave the rest to me.
              </h1>

              <p className="text-gray-500 mt-4">
                ideas, code, exams, whatever - just say it.
              </p>

              <div className="mt-10">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-600 mb-4">
                  What are we doing?
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {Object.entries(MODE_META).map(([mode, meta]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setActiveMode(mode);
                        setModeSelected(true);
                      }}
                      className="
                        group flex items-center gap-2
                        rounded-full border border-white/[0.08]
                        bg-white/[0.025]
                        px-4 py-2
                        text-sm text-gray-400
                        transition-all duration-200
                        hover:-translate-y-0.5
                        hover:border-white/[0.16]
                        hover:bg-white/[0.06]
                        hover:text-white
                        active:scale-[0.97]
                      "
                    >
                      <span className="text-sm transition-transform duration-200 group-hover:scale-110">
                        {meta.emoji}
                      </span>

                      <span>{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        ) : (

          <div className="max-w-3xl mx-auto space-y-8">

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

      {modeSelected && (
        <ChatInput
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