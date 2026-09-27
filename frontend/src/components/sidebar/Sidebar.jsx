import { useState, useRef, useEffect } from "react";
import { Trash2, X, PanelLeftClose, Pin, PinOff, Edit2, Check, XCircle, MoreVertical, Settings, Download, LogOut, ArrowLeft, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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

    const { user, logout } = useAuth();
  const navigate = useNavigate();

    async function handleLogout() {
    setConfirmLogout(false);
    setSettingsOpen(false);
    await logout();
    navigate("/");
  }

  // Frontend-only export: fetches the active chat's messages on demand
  // and downloads them as a markdown file. No backend involved.
  async function handleExportChat() {
    if (!activeChatId || exporting) return;
    setExporting(true);
    try {
      const data = await api.getChatMessages(activeChatId);
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      if (msgs.length === 0) return;

      const lines = [
        `# ${data.title || "Chat"}`,
        ``,
        `_Exported from yo — ${new Date().toLocaleString()}_`,
        ``,
      ];
      for (const m of msgs) {
        if (m.user) lines.push(`**You:**`, ``, m.user, ``);
        if (m.ai) lines.push(`**yo:**`, ``, m.ai, ``);
      }

      const slug =
        (data.title || "chat")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40) || "chat";

      const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yo-${slug}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  }

    // The one account action the backend actually supports today
  // (POST /api/auth/username). Merged into the existing user object —
  // the endpoint's response omits profile_picture, and overwriting the
  // whole user would blank the avatar until the next /me fetch.
  async function saveUsername() {
    const next = (usernameDraft || "").trim();
    if (!next || next === user?.username) {
      setUsernameDraft(null);
      setUsernameError("");
      return;
    }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(next)) {
      setUsernameError("3–20 characters — letters, numbers, underscores only.");
      return;
    }
    setUsernameSaving(true);
    setUsernameError("");
    try {
      const d = await api.setUsername(next);
      if (d.user?.username) {
        setUser(prev => ({ ...prev, username: d.user.username }));
      }
      setUsernameDraft(null);
    } catch (e) {
      setUsernameError(e.message || "Couldn't save username.");
    } finally {
      setUsernameSaving(false);
    }
  }

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [menuState, setMenuState] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settingsView, setSettingsView] = useState("settings"); // "settings" | "account"
  const [usernameDraft, setUsernameDraft] = useState(null); // null = not editing
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");

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
      // −12: sidebar's left edge now sits at the container's sm:p-3 padding,
      // so raw clientX would leave the handle trailing the cursor by 12px
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - 12)));
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

    // Close settings panel on outside tap — same pattern as the chat menu
  useEffect(() => {
    if (!settingsOpen) return;
    const close = (e) => {
      if (
        !e.target.closest("[data-settings-btn]") &&
        !e.target.closest("[data-settings-panel]")
      ) {
        setSettingsOpen(false);
        setConfirmLogout(false);
      }
    };
    const t = setTimeout(() => {
      document.addEventListener("pointerdown", close);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", close);
    };
  }, [settingsOpen]);

  // never reopen the panel with stale state — logout confirm, a
  // half-finished username edit, or the account view itself
  useEffect(() => {
    if (!settingsOpen) {
      setConfirmLogout(false);
      setUsernameDraft(null);
      setUsernameError("");
      setSettingsView("settings");
    }
  }, [settingsOpen]);

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
          fixed sm:relative inset-y-2 left-2 sm:inset-auto z-40 sm:z-auto
          w-[280px] sm:w-64
          bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/40
          text-gray-300 flex flex-col
          ${isOpen ? "translate-x-0" : "translate-x-[calc(-100%_-_0.5rem)]"}
          sm:translate-x-0 transition-transform duration-300 ease-out
          will-change-transform
        `}
      >
        {/* Desktop drag handle */}
        <div
          onMouseDown={startResize}
          className="hidden sm:block absolute top-3 right-0 bottom-3 w-1 cursor-col-resize hover:bg-white/15 active:bg-white/25 transition-colors z-10"
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
        <div className="mt-auto border-t border-white/10 p-4 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex-1 min-w-0 h-10 px-2.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02]"
              title={user?.username}
            >
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] text-gray-400">
                    {(user?.username || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <span className="text-[13px] text-gray-400 truncate">
                {user?.username || "Set username"}
              </span>
            </div>

            <button
              data-settings-btn
              onClick={() => setSettingsOpen(v => !v)}
              className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                settingsOpen
                  ? "text-white bg-white/10"
                  : "text-gray-500 hover:text-white hover:bg-white/10"
              }`}
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>


                 {/* Floating Settings panel — two views: settings / account */}
      {settingsOpen && (
        <div data-settings-panel className="absolute bottom-20 left-3 right-3 z-50">
          <div className="max-h-[min(440px,calc(100dvh-10rem))] flex flex-col rounded-2xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">

            {/* header */}
            <div className="shrink-0 flex items-center justify-between pl-4 pr-2.5 py-2.5">
              <p className="text-[13px] font-medium text-white">
                {settingsView === "account" ? "Account" : "Settings"}
              </p>

              {settingsView === "account" ? (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setSettingsView("settings")}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="overflow-y-auto px-2 pb-2">
              {settingsView === "settings" ? (

                /* ── SETTINGS VIEW ── */
                <>
                  {/* identity — the main account surface */}
                  <button
                    onClick={() => setSettingsView("account")}
                    className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left"
                  >
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-[14px] text-gray-400">
                          {(user?.username || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-gray-100 truncate">
                        {user?.username || "Set username"}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {user?.email || "yo account"}
                      </p>
                    </div>

                    <ChevronRight size={15} className="text-gray-600 shrink-0" />
                  </button>

                  {/* actions — spacing only, no dividers */}
                  <div className="pt-1.5 flex flex-col gap-0.5">
                    <button
                      onClick={handleExportChat}
                      disabled={!activeChatId || exporting}
                      className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left text-gray-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <Download size={15} className="shrink-0 text-gray-500" />
                      <span className="text-[13px]">
                        {exporting ? "Preparing…" : "Export current chat"}
                      </span>
                    </button>

                    {confirmLogout ? (
                      <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] border border-white/10 p-1">
                        <span className="flex-1 min-w-0 px-2 text-[12px] text-gray-300 truncate">
                          Log out of yo?
                        </span>
                        <button
                          onClick={handleLogout}
                          className="shrink-0 h-7 px-2.5 rounded-lg text-[12px] font-medium text-red-400 hover:bg-red-500/15 transition-colors"
                        >
                          Log out
                        </button>
                        <button
                          onClick={() => setConfirmLogout(false)}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmLogout(true)}
                        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
                      >
                        <LogOut size={15} className="shrink-0 text-gray-500" />
                        <span className="text-[13px]">Log out</span>
                      </button>
                    )}
                  </div>
                </>

              ) : (

                /* ── ACCOUNT VIEW ── */
                <>
                  <div className="flex flex-col items-center text-center px-4 pt-2 pb-4">
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-lg text-gray-400">
                          {(user?.username || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <p className="mt-2.5 text-[15px] font-medium text-white truncate max-w-full">
                      {user?.username || "Set username"}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-full">
                      {user?.email || "yo account"}
                    </p>
                  </div>

                  {/* actions — only what the backend actually supports */}
                  <div className="flex flex-col gap-0.5">
                    {usernameDraft === null ? (
                      <button
                        onClick={() => {
                          setUsernameError("");
                          setUsernameDraft(user?.username || "");
                        }}
                        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <Edit2 size={15} className="shrink-0 text-gray-500" />
                        <span className="text-[13px]">Edit username</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                        <input
                          autoFocus
                          value={usernameDraft}
                          maxLength={20}
                          onChange={(e) => setUsernameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveUsername();
                            if (e.key === "Escape") { setUsernameDraft(null); setUsernameError(""); }
                          }}
                          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-white placeholder:text-gray-600"
                          placeholder="username"
                        />
                        <button
                          onClick={saveUsername}
                          disabled={usernameSaving}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-green-400 hover:bg-white/10 transition-colors disabled:opacity-40"
                          title="Save"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => { setUsernameDraft(null); setUsernameError(""); }}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                    {usernameError && (
                      <p className="px-2.5 pt-1 text-[11px] text-red-400">{usernameError}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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