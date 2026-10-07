import { useState, memo, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Copy, Check, Pencil, X, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown, FileText } from "lucide-react";

// Custom code block — adds language label + copy button
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);

  async function handleCopy() {
    const text = codeRef.current?.textContent || "";
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.log("Code copy failed", e);
    }
  }

  return (
    <div className="relative group/code rounded-2xl overflow-hidden bg-[#111] w-full">
      <button
        onClick={handleCopy}
        className="
          absolute top-2 right-2 z-10
          flex items-center gap-1.5
          px-2 py-1 rounded-md
          text-[11px] font-medium text-white/30
          hover:text-white/60 hover:bg-white/[0.06]
          transition-colors duration-150
          opacity-100
          sm:opacity-0 sm:group-hover/code:opacity-100
        "
      >
        {copied ? (
          <>
            <Check size={12} className="text-green-400" />
            Copied
          </>
        ) : (
          <Copy size={12} />
        )}
      </button>
      <pre className="!m-0 !border-none !shadow-none !bg-transparent overflow-x-auto code-block-pre">
        <code ref={codeRef} className={className} style={{ background: 'transparent', padding: 0 }}>
          {children}
        </code>
      </pre>
    </div>
  );
}

function MessageBubble({
  type, text, streaming, messageId, messageIndex, feedback,
  onRegenerate, onFeedback, onEdit, thinking, images
}) {

  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(feedback || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const editTextareaRef = useRef(null);
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef(null);

  // focus + auto-resize when entering edit mode
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      const el = editTextareaRef.current;
      el.focus();
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [isEditing]);

  // keep textarea sized to content while editing
  useEffect(() => {
    if (!isEditing) return;
    const frame = requestAnimationFrame(() => {
      const el = editTextareaRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    });
    return () => cancelAnimationFrame(frame);
  }, [editText, isEditing]);

  // sync local edit buffer if the prop changes
  useEffect(() => {
    setEditText(text);
  }, [text]);

  // ─── long-press handlers (mobile) ──────────────────────────

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchMove() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // ─── copy ──────────────────────────────────────────────────

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.log("Copy failed", error);
    }
  }

  // ─── edit ──────────────────────────────────────────────────

  function handleEditSave() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === text) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    onEdit?.(messageIndex, trimmed);
  }

  function handleEditCancel() {
    setIsEditing(false);
    setEditText(text);
  }

  // ─── USER BUBBLE ───────────────────────────────────────────

  if (type === "user") {

    // EDIT MODE
    if (isEditing) {
      return (
        <div className="flex justify-end msg-enter">
          <div className="max-w-[85%] sm:max-w-md w-full">
          {images && images.length > 0 && (
            <div className="flex flex-col gap-2 mb-2 items-end">
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="max-w-full max-h-[420px] w-auto h-auto rounded-2xl border border-white/10"
                />
              ))}
            </div>
          )}
            <div className="
              bg-white/[0.08] rounded-2xl
              border border-white/[0.08]
              overflow-hidden
              transition-all duration-200 ease-premium
            ">
              <textarea
                ref={editTextareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleEditSave();
                  }
                  if (e.key === "Escape") handleEditCancel();
                }}
                className="
                  w-full bg-transparent outline-none resize-none
                  text-white text-[15px] leading-relaxed
                  px-4 py-2.5
                  min-h-[40px] max-h-[200px] overflow-y-auto
                "
                rows={1}
              />
              <div className="flex items-center justify-end gap-1.5 px-3 pb-2.5">
                <button
                  onClick={handleEditCancel}
                  className="
                    h-7 px-2.5 flex items-center gap-1.5
                    rounded-lg text-[12px] font-medium
                    text-gray-400 hover:text-gray-200
                    hover:bg-white/[0.06]
                    transition-colors duration-150
                  "
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editText.trim() || editText.trim() === text}
                  className="
                    h-7 px-2.5 flex items-center gap-1.5
                    rounded-lg text-[12px] font-medium
                    bg-white text-black
                    disabled:bg-white/10 disabled:text-gray-600
                    hover:opacity-80
                    transition-all duration-150
                  "
                >
                  <CheckCircle2 size={12} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // DISPLAY MODE
    return (
      <div
        className="flex justify-end group/user msg-enter"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="max-w-[85%] sm:max-w-md flex flex-col items-end">
          {images && images.length > 0 && (
            <div className="flex flex-col gap-2 mb-2 items-end">
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="max-w-full max-h-[420px] w-auto h-auto rounded-2xl border border-white/10"
                />
              ))}
            </div>
          )}
          {text && (
  <>
    {(() => {
      const attachmentMatch = text.match(/\[attached:\s*(.*?)\]/i);
      const attachmentName = attachmentMatch?.[1]?.trim();
      // hide the "[sent N image(s): ...]" label the backend stores —
      // the image itself is rendered above the text pill
      const visibleText = text
        .replace(/\s*\[attached:\s*.*?\]\s*/i, "")
        .replace(/\s*\[sent\s+\d+\s+image\(s\)[^\]]*\]\s*/i, "")
        .trim();

      return (
        <>
          {attachmentName && (
            <div className="mb-2 flex justify-end">
              <div
                className="
                  flex items-center gap-3
                  w-[260px] max-w-full
                  rounded-2xl
                  border border-white/[0.08]
                  bg-white/[0.08]
                  px-3.5 py-3
                "
              >
                <div
                  className="
                    w-10 h-10 shrink-0
                    rounded-xl
                    bg-white/[0.06]
                    flex items-center justify-center
                  "
                >
                  <FileText size={19} className="text-gray-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">
                    {attachmentName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    PDF document
                  </p>
                </div>
              </div>
            </div>
          )}

          {visibleText && (
            <div className="self-end bg-white/15 text-white rounded-2xl px-3.5 py-2 text-[14px] leading-snug break-words max-w-full w-fit">
              {visibleText}
            </div>
          )}
        </>
      );
    })()}

              <div
                className={`
                  flex items-center justify-end gap-0.5 mt-1 h-7
                  transition-opacity duration-200 ease-premium
                  ${showActions ? 'opacity-100' : 'opacity-0'}
                  sm:opacity-0 sm:group-hover/user:opacity-100
                `}
              >
                <button
                  onClick={handleCopy}
                  className="
                    w-7 h-7 flex items-center justify-center
                    rounded-lg text-gray-400 hover:text-gray-600
                    hover:bg-black/[0.04]
                    transition-colors duration-150
                  "
                  title={copied ? "Copied!" : "Copy"}
                >
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </button>
                {onEdit && (
                  <button
                    onClick={() => {
                      setEditText(text);
                      setIsEditing(true);
                    }}
                    className="
                      w-7 h-7 flex items-center justify-center
                      rounded-lg text-gray-400 hover:text-gray-600
                      hover:bg-black/[0.04]
                      transition-colors duration-150
                    "
                    title="Edit message"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

      // ─── AI BUBBLE ─────────────────────────────────────────────

  return (
    <div className="w-full max-w-full msg-enter">

      <p className="chat-ai-label text-xs mb-2">
        yo
      </p>

      {streaming ? (
        <div className="text-[15px] text-white/90 leading-[1.7] whitespace-pre-wrap">
          {text}
          <span className="inline-block w-[7px] h-[15px] ml-0.5 bg-white/70 translate-y-[2px] animate-pulse rounded-sm" />
        </div>
      ) : (
        <>
                    <div
            className="
              prose prose-invert prose-chat max-w-none
              text-[15px] text-white/90
              prose-p:my-3
              prose-ul:my-3 prose-ol:my-3
              prose-headings:mt-5 prose-headings:mb-2
              prose-strong:text-white prose-strong:font-semibold
              prose-code:text-white prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[13px]
              prose-pre:overflow-x-auto
              prose-a:text-white prose-a:underline prose-a:underline-offset-2
            "
          >

            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  if (!inline && className) {
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  }
                  return <code className={className} {...props}>{children}</code>;
                }
              }}
            >
              {text}
            </ReactMarkdown>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="
                inline-flex items-center
                text-gray-500 hover:text-gray-300
                transition-colors duration-200
              "
              title={copied ? "Copied!" : "Copy response"}
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>

            {onRegenerate && (
              <button
                onClick={() => onRegenerate(messageIndex)}
                className="
                  inline-flex items-center
                  text-gray-500 hover:text-gray-300
                  transition-colors duration-200
                "
                title="Regenerate response"
              >
                <RotateCcw size={14} />
              </button>
            )}

            {onFeedback && (
              <>
                <button
                  onClick={() => {
                    const newFeedback = feedbackGiven === "thumbsup" ? null : "thumbsup";
                    setFeedbackGiven(newFeedback);
                    onFeedback(messageId, newFeedback);
                  }}
                  className={`
                    inline-flex items-center transition-colors duration-200
                    ${feedbackGiven === "thumbsup" ? "text-green-500" : "text-gray-500 hover:text-gray-300"}
                  `}
                  title="Helpful"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  onClick={() => {
                    const newFeedback = feedbackGiven === "thumbsdown" ? null : "thumbsdown";
                    setFeedbackGiven(newFeedback);
                    onFeedback(messageId, newFeedback);
                  }}
                  className={`
                    inline-flex items-center transition-colors duration-200
                    ${feedbackGiven === "thumbsdown" ? "text-red-500" : "text-gray-500 hover:text-gray-300"}
                  `}
                  title="Not helpful"
                >
                  <ThumbsDown size={14} />
                </button>
              </>
            )}
          </div>
        </>
      )}

    </div>
  );
}

export default memo(MessageBubble);