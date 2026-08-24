import { memo, useEffect, useRef, useState } from "react";
import { Plus, ArrowUp, X, FileText, ArrowDown } from "lucide-react";

// All composer state (message text, attachments) lives HERE, not in
// ChatWindow. That's the actual fix for the typing lag: before, every
// keystroke called setMessage() inside ChatWindow, which re-rendered the
// entire component tree — including the full message list and every
// MessageBubble. Now a keystroke only re-renders this small component.
// Wrapped in memo() so it also doesn't re-render just because ChatWindow
// re-rendered for an unrelated reason (e.g. a streaming chunk arriving).
function ChatInput({ resetSignal, showJumpButton, onJumpToLatest, onSend }) {

  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // release object URLs when attachments change or component unmounts,
  // to avoid leaking memory
  useEffect(() => {
    return () => {
      attachments.forEach(a => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    };
  }, [attachments]);

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
    <div className="absolute bottom-0 left-0 right-0 z-30 px-4 sm:px-6 pb-5 sm:pb-6 pt-2 pointer-events-none">

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div className="
        relative
        max-w-3xl mx-auto
        border border-white/[0.12] rounded-[28px]
        bg-neutral-900
        shadow-[0_20px_60px_-12px_rgba(0,0,0,0.8)]
        px-3 py-2.5
        flex flex-col gap-1.5
        focus-within:border-white/25
        focus-within:shadow-[0_20px_70px_-10px_rgba(0,0,0,0.9)]
        transition-all duration-200
        pointer-events-auto
      ">

        {/* jump-to-latest — anchored to the composer box's own right
            edge (not the wide outer wrapper), so it always sits right
            above it regardless of viewport/sidebar width */}
        <button
          onClick={onJumpToLatest}
          className={`
            absolute -top-14 right-3 z-20
            w-9 h-9 flex items-center justify-center
            rounded-full text-gray-200
            bg-neutral-800/95 border border-white/10
            shadow-lg shadow-black/30
            hover:bg-neutral-700/90
            transition-all duration-200
            ${showJumpButton ? "opacity-100 -translate-y-2 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"}
          `}
          title="Jump to latest"
        >
          <ArrowDown size={16} />
        </button>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 pb-1">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="
                  relative group
                  flex items-center gap-2
                  bg-white/[0.05] border border-white/10
                  rounded-xl pl-2 pr-2.5 py-1.5
                  max-w-[180px]
                "
              >
                {a.isImage ? (
                  <img
                    src={a.previewUrl}
                    alt={a.file.name}
                    className="w-7 h-7 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-gray-300" />
                  </div>
                )}

                <span className="text-xs text-gray-300 truncate">
                  {a.file.name}
                </span>

                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="
                    shrink-0 w-4 h-4 rounded-full
                    flex items-center justify-center
                    text-gray-500 hover:text-white hover:bg-white/10
                    transition-colors duration-150
                  "
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* single unified row — plus, textarea, and send all inline and
            vertically aligned, instead of the textarea and buttons
            sitting in separate stacked rows */}
        <div className="flex items-end gap-2">

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="
              shrink-0 w-9 h-9 mb-0.5 flex items-center justify-center
              rounded-full text-gray-400
              hover:text-white hover:bg-white/10
              transition-colors duration-200
            "
            title="Add photos or files"
          >
            <Plus size={19} />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            className="
              flex-1 min-w-0
              bg-transparent outline-none resize-none
              text-white placeholder:text-gray-500
              text-[15px]
              max-h-[160px] overflow-y-auto
              leading-relaxed
              py-2
            "
            placeholder="Ask yo..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            onClick={handleSend}
            disabled={!message.trim() && attachments.length === 0}
            className="
              shrink-0 w-9 h-9 mb-0.5 flex items-center justify-center
              rounded-full
              bg-white text-black
              disabled:bg-white/10 disabled:text-gray-600
              hover:opacity-80
              transition-all duration-200
            "
          >
            <ArrowUp size={16} />
          </button>

        </div>

      </div>

    </div>
  );
}

export default memo(ChatInput);