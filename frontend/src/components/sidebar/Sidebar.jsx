import { useState, useRef, useEffect } from "react";
import { Trash2, X, PanelLeftClose, Pin, PinOff, Edit2, Check, XCircle, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import * as api from "../../services/api";

const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 256;
const MOBILE_SIDEBAR_W = 280;
const MENU_W = 168;

export default function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
  refreshChats
}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );
  const resizingRef = useRef(false);

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [menuState, setMenuState] = useState(null);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, isDesktop]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Drag resize — desktop
  useEffect(() => {
    function onMouseMove(e) {
      if (!resizingRef.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    }
    function onMouseUp() {
      if (resizingRef.current) {
        resizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Close menu on outside tap
  useEffect(() => {
    if (!menuState) return;
    const close = (e) => {
      if (
        !e.target.closest("[data-menu-btn]") &&
        !e.target.closest("[data-menu-dropdown]")
      ) {
        setMenuState(null);
        setConfirmDeleteId(null);
      }
    };
    const t = setTimeout(() => {
      document.addEventListener("pointerdown", close);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", close);
    };
  }, [menuState]);

  // Close menu on scroll
  useEffect(() => {
    if (!menuState) return;
    const el = document.querySelector("[data-sidebar-list]");
    if (!el) return;
    const onScroll = () => { setMenuState(null); setConfirmDeleteId(null); };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [menuState]);

  function startResize(e) {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function openMenu(e, chatId) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuH = confirmDeleteId === chatId ? 176 : 132;
    const gap = 6;

    let x = rect.right - MENU_W - gap;
    x = Math.max(gap, x);
    if (!isDesktop) {
      x = Math.min(x, MOBILE_SIDEBAR_W - MENU_W - gap);
    } else {
      x = Math.min(x, window.innerWidth - MENU_W - gap);
    }

    const below = window.innerHeight - rect.bottom;
    let y = below >= menuH + gap
      ? rect.bottom + gap
      : rect.top - menuH - gap;
    y = Math.max(gap, Math.min(y, window.innerHeight - menuH - gap));

    setMenuState({ id: chatId, x, y });
    setConfirmDeleteId(null);
  }

  function closeMenu() {
    setMenuState(null);
    setConfirmDeleteId(null);
  }

  function dismiss() {
    closeMenu();
    onClose();
  }

  function startRename(chatId, title) {
    setEditingId(chatId);
    setEditingTitle(title);
    closeMenu();
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function saveRename(chatId) {
    const t = editingTitle.trim();
    if (!t) { setEditingId(null); return; }
    try {
      await api.renameChat(chatId, t);
      setEditingId(null);
      refreshChats?.();
    } catch (e) {
      console.error("Rename failed:", e);
      setEditingId(null);
    }
  }

  async function togglePin(chatId, pinned) {
    try {
      await api.pinChat(chatId, !pinned);
      closeMenu();
      refreshChats?.();
    } catch (e) {
      console.error("Pin failed:", e);
      closeMenu();
    }
  }

  async function doDelete(chatId) {
    try {
      await onDeleteChat(chatId);
      closeMenu();
    } catch (e) {
      console.error("Delete failed:", e);
      closeMenu();
    }
  }

  if (collapsed && isDesktop) return null;

  const pinned = chats.filter(c => c.is_pinned);
  const recent = chats.filter(c => !c.is_pinned);
  const hasDivider = pinned.length > 0 && recent.length > 0;

  return (
    <>
      {/* Mobile backdrop — taps here CLOSE THE SIDEBAR */}
      {isOpen && (
        <div
          onClick={dismiss}
          className="fixed inset-0 z-30 bg-black/60 sm:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        style={isDesktop ? { width } : undefined}
        className={`
          fixed sm:relative inset-y-0 left-0 z-40 sm:z-auto
          w-[280px] sm:w-64
          h-dvh bg-neutral-950 border-r border-white/10
          text-gray-300 flex flex-col
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          sm:translate-x-0 transition-transform duration-300 ease-out
          will-change-transform
        `}
      >
        {/* Desktop drag handle */}
        <div
          onMouseDown={startResize}
          className="hidden sm:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-white/15 active:bg-white/25 transition-colors z-10"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <Link to="/" className="text-xl font-semibold text-white hover:opacity-75 transition-opacity">
            yo<span className="opacity-40" />
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCollapse}
              className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={17} />
            </button>
            <button
              onClick={dismiss}
              className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* New chat */}
        <div className="px-3 shrink-0">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition text-sm"
          >
            <span className="text-lg leading-none">＋</span>
            New Chat
          </button>
        </div>

        {/* Chat list — no conditional section headers, stable layout */}
        <div
          data-sidebar-list
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 mt-5 overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {chats.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-2">No conversations yet</p>
          )}

          {chats.length > 0 && (
            <div className="space-y-0.5">
              {pinned.map(c => (
                <Item
                  key={c.id} chat={c}
                  active={c.id === activeChatId}
                  editing={editingId === c.id}
                  editTitle={editingTitle}
                  editRef={editInputRef}
                  menuOpen={menuState?.id === c.id}
                  onSelect={onSelectChat}
                  onMenu={openMenu}
                  onRename={startRename}
                  onSaveRename={saveRename}
                  onTitleChange={setEditingTitle}
                  onCancelEdit={() => setEditingId(null)}
                />
              ))}

              {/* Thin divider between pinned and recent — no heading shift */}
              {hasDivider && (
                <div className="my-2 mx-2 h-px bg-white/[0.06]" />
              )}

              {recent.map(c => (
                <Item
                  key={c.id} chat={c}
                  active={c.id === activeChatId}
                  editing={editingId === c.id}
                  editTitle={editingTitle}
                  editRef={editInputRef}
                  menuOpen={menuState?.id === c.id}
                  onSelect={onSelectChat}
                  onMenu={openMenu}
                  onRename={startRename}
                  onSaveRename={saveRename}
                  onTitleChange={setEditingTitle}
                  onCancelEdit={() => setEditingId(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-white/10 p-4 shrink-0">
          <div className="group relative w-full h-11 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05] transition-colors duration-300 overflow-hidden cursor-default">
            <span className="absolute text-sm font-semibold tracking-[-0.03em] text-white transition-all duration-300 ease-out group-hover:opacity-0 group-hover:-translate-y-2">
              yo<span className="opacity-40" />
            </span>
            <span className="absolute text-sm font-medium text-white/70 opacity-0 translate-y-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
              Still Evolving ✨
            </span>
          </div>
        </div>
      </div>

      {/* Fixed dropdown */}
      {menuState && (() => {
        const chat = chats.find(c => c.id === menuState.id);
        if (!chat) return null;
        const isConfirm = confirmDeleteId === chat.id;
        return (
          <div
            data-menu-dropdown
            className="fixed z-[60] bg-neutral-800 rounded-xl border border-white/[0.12] shadow-2xl shadow-black/40 overflow-hidden"
            style={{
              left: menuState.x,
              top: menuState.y,
              width: MENU_W,
              animation: "menuIn 120ms ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => startRename(chat.id, chat.title)}
              className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-300 hover:bg-white/10 active:bg-white/15 transition-colors flex items-center gap-2.5"
            >
              <Edit2 size={14} className="text-gray-500 shrink-0" />
              Rename
            </button>
            <button
              onClick={() => togglePin(chat.id, chat.is_pinned)}
              className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-300 hover:bg-white/10 active:bg-white/15 transition-colors flex items-center gap-2.5"
            >
              {chat.is_pinned
                ? <PinOff size={14} className="text-gray-500 shrink-0" />
                : <Pin size={14} className="text-gray-500 shrink-0" />
              }
              {chat.is_pinned ? "Unpin" : "Pin"}
            </button>

            <div className="h-px bg-white/[0.08] mx-2" />

            {isConfirm ? (
              <>
                <button
                  onClick={() => doDelete(chat.id)}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-500/15 active:bg-red-500/25 transition-colors flex items-center gap-2.5"
                >
                  <Trash2 size={14} className="shrink-0" />
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-400 hover:bg-white/10 active:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(chat.id)}
                className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-500/15 active:bg-red-500/25 transition-colors flex items-center gap-2.5"
              >
                <Trash2 size={14} className="shrink-0" />
                Delete
              </button>
            )}
          </div>
        );
      })()}

      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}

/* ────────── Chat Item ────────── */

function Item({
  chat, active, editing, editTitle, editRef,
  menuOpen, onSelect, onMenu, onRename,
  onSaveRename, onTitleChange, onCancelEdit,
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5 rounded-xl bg-white/[0.04]">
        <input
          ref={editRef}
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveRename(chat.id);
            if (e.key === "Escape") onCancelEdit();
          }}
          onBlur={() => onSaveRename(chat.id)}
          className="flex-1 min-w-0 px-2.5 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40"
          placeholder="Chat name..."
          autoFocus
        />
        <button
          onClick={(e) => { e.stopPropagation(); onSaveRename(chat.id); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-green-400 hover:bg-white/10 shrink-0"
        >
          <Check size={15} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 shrink-0"
        >
          <XCircle size={15} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`
        group flex items-center rounded-xl transition-colors duration-100
        ${active ? "bg-white/[0.08]" : "hover:bg-white/[0.06] active:bg-white/[0.08]"}
      `}
    >
      <button
        onClick={() => onSelect(chat.id)}
        className={`
          flex-1 min-w-0 text-left px-3 py-2.5 text-sm truncate
          flex items-center gap-2 transition-colors
          ${active ? "text-white" : "text-gray-400 group-hover:text-gray-200"}
        `}
      >
        {chat.is_pinned && <Pin size={11} className="shrink-0 text-gray-500" />}
        <span className="truncate">{chat.title}</span>
      </button>

      <button
        data-menu-btn
        onClick={(e) => onMenu(e, chat.id)}
        className={`
          shrink-0 w-8 h-8 flex items-center justify-center -mr-1 rounded-lg
          transition-all duration-100
          ${menuOpen
            ? "text-white bg-white/10"
            : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10"
          }
        `}
      >
        <MoreVertical size={15} />
      </button>
    </div>
  );
}