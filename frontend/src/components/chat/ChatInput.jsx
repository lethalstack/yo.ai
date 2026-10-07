import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ArrowUp, X, FileText, ArrowDown, Mic } from "lucide-react";

// All composer state (message text, attachments) lives HERE, not in
// ChatWindow. That's the actual fix for the typing lag: before, every
// keystroke called setMessage() inside ChatWindow, which re-rendered the
// entire component tree — including the full message list and every
// MessageBubble. Now a keystroke only re-renders this small component.
// Wrapped in memo() so it also doesn't re-render just because ChatWindow
// re-rendered for an unrelated reason (e.g. a streaming chunk arriving).
function ChatInput({ resetSignal, showJumpButton, onJumpToLatest, onSend, variant = "docked", injected = null, modeTag = null }) {
  const hero = variant === "hero";

  // set once per mount — the starting composer's size is fixed for the session

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const dictationBaseRef = useRef("");

  // suggestion click → fill the composer (parent passes {text, id})
  useEffect(() => {
    if (injected?.text) {
      setMessage(injected.text);
      textareaRef.current?.focus();
    }
  }, [injected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // capsule when one line · rounded rectangle when the text wraps
  const multiline = message.split("\n").length > 1 || message.length > 90;

  // stop the mic if the component unmounts mid-dictation
  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  // "New Chat" was clicked (signaled by the parent via resetSignal) —
  // clear the composer. Same logic that used to live in ChatWindow.
  useEffect(() => {
    if (resetSignal === 0) return; // skip on initial mount
    setMessage("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [resetSignal]);

  // Auto-grow the textarea as the user types, up to a max height.
  // Deferred to the next animation frame rather than running synchronously
  // on every keystroke: reading scrollHeight forces the browser to flush
  // layout immediately, and in a chat with a lot of rendered markdown/code
  // that reflow gets expensive. Deferring it means the typed character
  // paints first — the resize catches up a frame later — so typing feels
  // instant instead of blocking on layout work every keystroke.
  const resizeFrameRef = useRef(null);
  useEffect(() => {
    if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
    resizeFrameRef.current = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    });
    return () => {
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
    };
  }, [message]);

  // release object URLs when the composer unmounts. NOTE: deliberately
  // NOT revoked when attachments clear on send — ChatWindow keeps those
  // URLs alive to render the image preview in the chat.
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(a => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
  }, []);

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);

    const newAttachments = files.map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      isImage: file.type.startsWith("image/"),
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    // allow re-selecting the same file again later
    e.target.value = "";
  }

  function removeAttachment(id) {
    setAttachments(prev => {
      const target = prev.find(a => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(a => a.id !== id);
    });
  }

    function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;   // text appears as it's recognized
    rec.continuous = false;      // one phrase per tap — chat-input sized

    // whatever the user already typed stays; dictation appends after it
    dictationBaseRef.current = message
      ? (message.endsWith(" ") ? message : message + " ")
      : "";

    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setMessage(dictationBaseRef.current + transcript);
    };

    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.log("Voice input error:", e.error);
      }
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  function handleSend() {
    if (!message.trim() && attachments.length === 0) return;

    const userMessage = message;
    const pendingAttachments = attachments;

    // clear immediately — the actual send/streaming work happens in the
    // parent, but the composer shouldn't wait on it to feel responsive
    setMessage("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    onSend(userMessage, pendingAttachments);
  }

  return (
    <div className={hero || variant === "compact" ? "w-full" : "absolute bottom-0 left-0 right-0 z-30 px-4 sm:px-6 pb-2 sm:pb-3 pt-2 pointer-events-none"}>



      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* ═══ DOCKED — thin opaque floating pill: + · input · mic/↑ ═══ */}
           {variant === "docked" && (
        <div
            className={`relative max-w-3xl mx-auto p-px overflow-hidden bg-white/[0.12] focus-within:bg-white/25 transition-colors duration-300 pointer-events-auto ${
              multiline || attachments.length > 0 ? "rounded-2xl" : "rounded-full"
            }`}
        >
          <motion.div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 aspect-square w-[400%] text-white opacity-40"
            style={{ x: "-50%", y: "-50%", background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, currentColor 342deg, transparent 357deg)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, ease: "linear", repeat: Infinity }}
          />

                    {attachments.length > 0 && (
            <div className="relative z-10 flex gap-2 px-2 pt-2 flex-wrap bg-neutral-900 rounded-t-[15px]">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="relative rounded-xl overflow-hidden border border-white/15"
                >
                  {a.isImage ? (
                    <img
                      src={a.previewUrl}
                      alt=""
                      className="w-12 h-12 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-white/[0.06]">
                      <FileText size={16} className="text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    aria-label="Remove attachment"
                    className="absolute top-0.5 right-0.5 w-4 h-4 p-0.5 flex items-center justify-center rounded-full bg-black/70 text-gray-300 hover:text-white transition-colors"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className={`relative bg-neutral-900 pl-1.5 pr-1.5 flex items-center gap-1 transition-colors duration-300 ${
              attachments.length > 0
                ? "rounded-b-[15px] py-2 items-stretch"
                : multiline
                  ? "rounded-[15px] py-2 items-stretch"
                  : "rounded-full py-1.5 items-center"
            }`}
          >




          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Add photos or files"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
          >
            <Plus size={17} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask yo..."
            className={`flex-1 min-w-0 bg-transparent outline-none resize-none text-white placeholder:text-gray-500 text-[14px] leading-[1.5] max-h-[120px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              multiline ? "py-1" : "py-2"
            }`}
          />

          {message.trim() ? (
            <button
              onClick={handleSend}
              aria-label="Send"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:opacity-85 active:scale-90 transition-all duration-200"
            >
              <ArrowUp size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleDictation}
              aria-label="Voice input"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
            >
              <Mic size={15} />
            </button>
          )}
          </div>
        </div>
      )}

            {/* ═══ COMPACT — mobile starting-page composer: one thin floating row ═══ */}
      {variant === "compact" && (
        <div className="w-full">
          <div
            className={`relative w-full p-px overflow-hidden bg-white/[0.12] focus-within:bg-white/25 transition-colors duration-300 ${
              multiline || attachments.length > 0 ? "rounded-2xl" : "rounded-full"
            }`}
          >
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 aspect-square w-[300%] text-white opacity-40"
              style={{ x: "-50%", y: "-50%", background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, currentColor 342deg, transparent 357deg)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 10, ease: "linear", repeat: Infinity }}
            />
            {attachments.length > 0 && (
              <div className="relative z-10 flex gap-2 px-2 pt-2 flex-wrap bg-neutral-900 rounded-t-[15px]">
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="relative rounded-xl overflow-hidden border border-white/15"
                  >
                    {a.isImage ? (
                      <img
                        src={a.previewUrl}
                        alt=""
                        className="w-12 h-12 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-white/[0.06]">
                        <FileText size={16} className="text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      aria-label="Remove attachment"
                      className="absolute top-0.5 right-0.5 w-4 h-4 p-0.5 flex items-center justify-center rounded-full bg-black/70 text-gray-300 hover:text-white transition-colors"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div
              className={`relative bg-neutral-900 pl-1.5 pr-1.5 flex items-center gap-1 transition-colors duration-300 ${
                attachments.length > 0
                  ? "rounded-b-[15px] py-2 items-stretch"
                  : multiline
                    ? "rounded-[15px] py-2 items-stretch"
                    : "rounded-full py-1.5 items-center"
              }`}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Add photos or files"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
              >
                <Plus size={17} />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything..."
                className={`flex-1 min-w-0 bg-transparent outline-none resize-none text-white placeholder:text-gray-500 text-[14px] leading-[1.5] max-h-[120px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                  multiline ? "py-1" : "py-2"
                }`}
              />


              {message.trim() ? (
                <button
                  onClick={handleSend}
                  aria-label="Send"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:opacity-85 active:scale-90 transition-all duration-200"
                >
                  <ArrowUp size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleDictation}
                  aria-label="Voice input"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
                >
                  <Mic size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HERO — large starting-page composer (unchanged) ═══ */}
            {hero && (
        <div className="w-full">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFilesSelected}
            className="hidden"
          />

                               <div className="relative w-full rounded-[20px] sm:rounded-[28px] p-px overflow-hidden bg-white/[0.12] focus-within:bg-white/25 transition-colors duration-200 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.8)]">
                      <motion.div
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 aspect-square w-[400%] text-white opacity-40"
                        style={{ x: "-50%", y: "-50%", background: "conic-gradient(from 0deg, transparent 0deg, transparent 300deg, currentColor 342deg, transparent 357deg)" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                      />
                      <div className="relative w-full rounded-[19px] sm:rounded-[27px] bg-neutral-900 px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-1.5">

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 pb-1">
                {attachments.map((a) => (
                  <div key={a.id} className="relative group flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl pl-2 pr-2.5 py-1.5 max-w-[180px]">
                    {a.isImage ? (
                      <img src={a.previewUrl} alt={a.file.name} className="w-7 h-7 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-gray-300" />
                      </div>
                    )}
                    <span className="text-xs text-gray-300 truncate">{a.file.name}</span>
                    <button type="button" onClick={() => removeAttachment(a.id)} className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors duration-150">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything..."
                                        className="w-full bg-transparent outline-none resize-none text-white placeholder:text-gray-500 text-[15px] leading-relaxed px-1 min-h-[36px] sm:min-h-[52px] max-h-[200px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            />

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200" title="Add photos or files">
                <Plus size={19} />
              </button>

              {SpeechRecognition && (
                <button type="button" onClick={toggleDictation} className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200 ${listening ? "bg-white/10 text-red-400 animate-pulse" : "text-gray-400 hover:text-white hover:bg-white/10"}`} title="Voice input">
                  <Mic size={18} />
                </button>
              )}

              <span className="flex-1" />

                            <AnimatePresence mode="popLayout">
                {modeTag && (
                                    <motion.span
                    key={modeTag}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeOut" } }}
                    transition={{ duration: 0.8, ease: [0.45, 0.05, 0.25, 1] }}
                    className="mr-2 text-[11px] font-mono text-gray-500 select-none whitespace-nowrap"
                  >
                    {modeTag}
                  </motion.span>
                )}
              </AnimatePresence>

              <button
                onClick={handleSend}
                disabled={!message.trim() && attachments.length === 0}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white text-black disabled:bg-white/10 disabled:text-gray-600 hover:opacity-80 transition-all duration-200"
              >
                               <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default memo(ChatInput);