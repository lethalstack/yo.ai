import { useState, useRef, useEffect } from "react";
import { Trash2, X, PanelLeftClose, Pin, PinOff, Edit2, Check, XCircle, MoreVertical, Settings, Download, FileText, LogOut, ArrowLeft, ChevronRight } from "lucide-react";
import LogoFlat from "../landing/LogoFlat";
import InstallPill from "../InstallPill";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 280;
const MOBILE_SIDEBAR_W = 300;
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
  refreshChats,
  onHistoryCleared,
  hasMessages,
  chatsLoading
}) {
  // restore the last dragged width — without this, every refresh snapped
  // back to the default and any resize the user did was silently lost
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("yo-sidebar-width"));
      if (saved >= MIN_WIDTH && saved <= MAX_WIDTH) return saved;
    } catch {}
    return DEFAULT_WIDTH;
  });
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 640 : true
  );
  const resizingRef = useRef(false);
  const widthRef = useRef(width); // mirror for the window-level mouseup handler

  const { user, logout, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

    async function handleLogout() {
    setConfirmLogout(false);
    setSettingsOpen(false);
    await logout();
    navigate("/");
  }

  // Frontend-only export: fetches the active chat's messages on demand,
  // then offers PDF (browser print engine) or Markdown. No backend involved.
  async function openExportChooser() {
    if (!activeChatId || exporting) return;
    setExporting(true);
    try {
      const data = await api.getChatMessages(activeChatId);
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      if (msgs.length === 0) {
        setExporting(false);
        return;
      }
      setExportData({ title: data.title || "Chat", messages: msgs });
      setExporting(false);
    } catch (e) {
      console.error("Export failed:", e);
      setExporting(false);
    }
  }

  function buildMarkdown(title, msgs) {
    const lines = [
      `# ${title}`,
      ``,
      `_Exported from yo — ${new Date().toLocaleString()}_`,
      ``,
    ];
    for (const m of msgs) {
      if (m.user) lines.push(`**You:**`, ``, m.user, ``);
      if (m.ai) lines.push(`**yo:**`, ``, m.ai, ``);
    }
    return lines.join("\n");
  }

  function downloadMarkdown() {
    if (!exportData) return;
    const slug =
      (exportData.title || "chat")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "chat";
    const blob = new Blob([buildMarkdown(exportData.title, exportData.messages)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yo-${slug}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    closeExport();
  }

  function exportPdf() {
    if (!exportData) return;
    const slug =
      (exportData.title || "chat")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "chat";
    window.pdfExport = { ...exportData, slug };
    document.body.classList.add("pdf-exporting");
    window.print();
    closeExport();
  }

  function closeExport() {
    setExportData(null);
    setExporting(false);
  }

  // Edit display name — POST /api/auth/display-name. The response
  // includes profile_picture, so the user object can be merged without
  // blanking the avatar.
  async function saveDisplayName() {
    const next = (nameDraft || "").trim();
    if (!next || next === user?.display_name) {
      setNameDraft(null);
      setNameError("");
      return;
    }
    setNameSaving(true);
    setNameError("");
    try {
      const d = await api.setDisplayName(next);
      if (d.user) {
        setUser(prev => ({ ...prev, ...d.user }));
      }
      setNameDraft(null);
    } catch (e) {
      setNameError(e.message || "Couldn't save name.");
    } finally {
      setNameSaving(false);
    }
  }

    async function handleClearHistory() {
    if (clearing) return;
    setClearing(true);
    setClearError("");
    try {
      const d = await api.clearChatHistory();
      if (d.error) throw new Error(d.error);
      setConfirmClear(false);
      setJustCleared(true);
      setTimeout(() => setJustCleared(false), 2500);
      onHistoryCleared?.();
    } catch (e) {
      setClearError(e.message || "Couldn't clear history. Nothing was deleted.");
    } finally {
      setClearing(false);
    }
  }

  // The backend resolves the account from the session — no IDs are sent
  // from the frontend. On success the session is gone server-side, so we
  // drop local auth state and leave /app immediately. On failure nothing
  // is cleared locally.
  async function handleDeleteAccount() {
    if (deleteText !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const d = await api.deleteAccount();
      if (d.error) throw new Error(d.error);
      setUser(null);
      setSettingsOpen(false);
      navigate("/");
    } catch (e) {
      setDeleteError(e.message || "Couldn't delete the account. It's untouched.");
      setDeleting(false);
    }
  }

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [menuState, setMenuState] = useState(null);
  // mobile: long-press a non-active row to reveal its action pill
  const [pressMenu, setPressMenu] = useState(null); // { id, x, y } | null
  const pressTimerRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState(null); // { title, messages, slug } — drives the chooser + print view
  const [settingsView, setSettingsView] = useState("settings"); // "settings" | "account"
  const [nameDraft, setNameDraft] = useState(null); // null = not editing
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [justCleared, setJustCleared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // after the print dialog closes (Save as PDF or Cancel), remove the
  // print-only stylesheet so the app returns to normal rendering
  useEffect(() => {
    const done = () => document.body.classList.remove("pdf-exporting");
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, isDesktop]);

  // clear a pending long-press timer if the sidebar ever unmounts
  useEffect(() => () => cancelPress(), []);

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
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - 12));
      widthRef.current = next;
      setWidth(next);
    }
    function onMouseUp() {
      if (resizingRef.current) {
        resizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        try { localStorage.setItem("yo-sidebar-width", String(widthRef.current)); } catch {}
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Close menu / long-press pill / export chooser on outside tap
  useEffect(() => {
    if (!menuState && !pressMenu && !exportData) return;
    const close = (e) => {
      if (
        !e.target.closest("[data-menu-btn]") &&
        !e.target.closest("[data-menu-dropdown]") &&
        !e.target.closest("[data-export-chooser]")
      ) {
        setMenuState(null);
        setConfirmDeleteId(null);
        setPressMenu(null);
        setExportData(null);
        setExporting(false);
      }
    };
    const t = setTimeout(() => {
      document.addEventListener("pointerdown", close);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", close);
    };
  }, [menuState, pressMenu, exportData]);

  // Close menu / long-press pill on scroll
  useEffect(() => {
    if (!menuState && !pressMenu) return;
    const el = document.querySelector("[data-sidebar-list]");
    if (!el) return;
    const onScroll = () => { setMenuState(null); setConfirmDeleteId(null); setPressMenu(null); };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [menuState, pressMenu]);

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
  // half-finished name edit, or the account view itself
  useEffect(() => {
    if (!settingsOpen) {
      setConfirmLogout(false);
      setNameDraft(null);
      setNameError("");
      setSettingsView("settings");
      setConfirmClear(false);
      setClearError("");
      setConfirmDelete(false);
      setDeleteText("");
      setDeleteError("");
    }
  }, [settingsOpen]);

  function startResize(e) {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

    // desktop: right-click any row → menu at cursor.
  // mobile: just suppress the native menu (long-press pill handles it).
  function handleRowContext(e, chatId) {
    e.preventDefault();
    if (!isDesktop) return;
    const menuH = confirmDeleteId === chatId ? 176 : 132;
    const gap = 6;
    let x = Math.max(gap, Math.min(e.clientX, window.innerWidth - MENU_W - gap));
    let y = e.clientY;
    if (window.innerHeight - e.clientY < menuH + gap) {
      y = e.clientY - menuH - gap;
    }
    y = Math.max(gap, Math.min(y, window.innerHeight - menuH - gap));
    setPressMenu(null);
    setMenuState({ id: chatId, x, y });
    setConfirmDeleteId(null);
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

    function startPress(e, chatId) {
    if (isDesktop) return;
    const x = e.touches?.[0]?.clientX ?? 0;
    const y = e.touches?.[0]?.clientY ?? 0;
    pressTimerRef.current = setTimeout(() => {
      pressTimerRef.current = null;
      // pill pops above the finger, clamped to the sidebar's 300px width
      setPressMenu({
        id: chatId,
        x: Math.min(Math.max(60, x), MOBILE_SIDEBAR_W - 60),
        y: Math.max(60, y - 76),
      });
    }, 450);
  }

  function cancelPress() {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }

  function closePress() {
    setPressMenu(null);
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
          w-[300px] sm:w-[280px]
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
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity" aria-label="yo — home">
            <LogoFlat size={30} />
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
          {chatsLoading && chats.length === 0 && (
            <div className="px-3 py-3 space-y-2.5" aria-label="Loading chats">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-9 rounded-full bg-white/[0.05] animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s`, width: `${88 - i * 14}%` }}
                />
              ))}
            </div>
          )}

          {!chatsLoading && chats.length === 0 && (
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
                  onStartPress={startPress}
                  onCancelPress={cancelPress}
                  onPressSelect={() => !!pressMenu}
                  onRowContext={handleRowContext}
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
                  onStartPress={startPress}
                  onCancelPress={cancelPress}
                  onPressSelect={() => !!pressMenu}
                  onRowContext={handleRowContext}
                />
              ))}
            </div>
          )}
        </div>

        {/* Install card — desktop only (mobile uses the floating toast) */}
        <InstallPill variant="card" />

        {/* Export current chat — standalone action between history and account */}
        {activeChatId && (
          <div className="px-4 pb-2 shrink-0">
            <button
            onClick={openExportChooser}
              title={hasMessages ? "Export this conversation as markdown" : "Nothing to export yet"}
              className={`w-full h-9 px-3 flex items-center justify-center gap-2 rounded-xl border text-[12.5px] transition-colors duration-200 ${
                hasMessages
                  ? "border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.06]"
                  : "border-white/[0.06] bg-transparent text-gray-600"
              }`}
            >
              <Download size={13} className="shrink-0" />
              {exporting ? "Preparing…" : "Export chat"}
            </button>
          </div>
        )}

                {/* Footer */}
        <div className="mt-auto border-t border-white/10 p-4 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex-1 min-w-0 h-10 px-2.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02]"
              title={user?.display_name || user?.email}
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
                    {(user?.display_name || user?.email || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <span className="text-[13px] text-gray-400 truncate">
                {user?.display_name || user?.email?.split("@")[0] || "yo user"}
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
          <div className="max-h-[min(480px,calc(100dvh-10rem))] flex flex-col rounded-2xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">

            {/* header */}
            <div className="shrink-0 flex items-center justify-between pl-4 pr-2.5 py-2.5">
              <p className="text-[13px] font-medium text-white">
                {settingsView === "profile" ? "Profile" : "Settings"}
              </p>

              {settingsView === "profile" ? (
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
                  {/* profile — primary navigation surface */}
                  <button
                    onClick={() => setSettingsView("profile")}
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
                          {(user?.display_name || user?.email || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-gray-100 truncate">
                        {user?.display_name || user?.email?.split("@")[0] || "yo user"}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {user?.email || "yo account"}
                      </p>
                    </div>

                    <ChevronRight size={15} className="text-gray-600 shrink-0" />
                  </button>

                  {/* log out — main screen only, never inside Profile */}
                  <div className="pt-1.5 flex flex-col gap-0.5">
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
                  <div className="flex items-center gap-3 px-2.5 pt-1.5 pb-3">
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-[15px] text-gray-400">
                          {(user?.display_name || user?.email || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-white truncate">
                        {user?.display_name || user?.email?.split("@")[0] || "yo user"}
                      </p>
                      <p className="text-[11.5px] text-gray-500 truncate mt-0.5">
                        {user?.email || "yo account"}
                      </p>
                    </div>
                  </div>

                  {/* edit name */}
                  <div className="flex flex-col gap-0.5">
                    {nameDraft === null ? (
                      <button
                        onClick={() => {
                          setNameError("");
                          setNameDraft(user?.display_name || "");
                        }}
                        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <Edit2 size={15} className="shrink-0 text-gray-500" />
                        <span className="text-[13px]">Edit name</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                        <input
                          autoFocus
                          value={nameDraft}
                          maxLength={40}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveDisplayName();
                            if (e.key === "Escape") { setNameDraft(null); setNameError(""); }
                          }}
                          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-white placeholder:text-gray-600"
                          placeholder="your name"
                        />
                        <button
                          onClick={saveDisplayName}
                          disabled={nameSaving}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-green-400 hover:bg-white/10 transition-colors disabled:opacity-40"
                          title="Save"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={() => { setNameDraft(null); setNameError(""); }}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                    {nameError && (
                      <p className="px-2.5 pt-1 text-[11px] text-red-400">{nameError}</p>
                    )}
                  </div>


                  {/* appearance — theme */}
                  <div className="px-0.5 pt-3.5">
                    <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                      Appearance
                    </p>
                    <div className="mt-1.5 flex p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors ${
                          theme === "dark"
                            ? "bg-white/10 text-white"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors ${
                          theme === "light"
                            ? "bg-white/10 text-white"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Light
                      </button>
                    </div>
                  </div>

                  {/* data — clear history */}
                  <div className="px-0.5 pt-3.5 pb-1">
                    <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                      Data
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {confirmClear ? (
                        <div className="mx-0.5 mt-1 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3">
                          <p className="text-[13px] font-medium text-red-400">Clear chat history?</p>
                          <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
                            This will permanently delete all of your conversations and their associated study data.
                          </p>
                          <div className="mt-2.5 flex gap-2">
                            <button
                              onClick={() => { setConfirmClear(false); setClearError(""); }}
                              className="flex-1 h-8 rounded-lg border border-white/10 text-[12px] text-gray-300 hover:text-white hover:border-white/25 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleClearHistory}
                              disabled={clearing}
                              className="flex-1 h-8 rounded-lg bg-red-500/90 text-white text-[12px] font-medium hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                              {clearing ? "Clearing…" : "Clear history"}
                            </button>
                          </div>
                          {clearError && (
                            <p className="mt-2 text-[11px] text-red-400">{clearError}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setConfirmClear(true); setJustCleared(false); }}
                          disabled={chats.length === 0}
                          title={chats.length === 0 ? "Nothing to clear" : undefined}
                          className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left text-gray-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          <Trash2 size={15} className="shrink-0 text-gray-500" />
                          <span className="text-[13px]">Clear chat history</span>
                        </button>
                      )}

                      {justCleared && (
                        <p className="px-2.5 pt-1 text-[11px] text-green-400">History cleared ✓</p>
                      )}
                    </div>
                  </div>

                  {/* delete account */}
                  <div className="px-0.5 pt-4 pb-1">
                    <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-gray-600">
                      Delete account
                    </p>

                    {confirmDelete ? (
                      <div className="mt-1.5 mx-0.5 rounded-xl border border-red-500/25 bg-red-500/[0.05] p-3">
                        <p className="text-[13px] font-medium text-red-400">Delete account?</p>
                        <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
                          This permanently deletes your YO account, conversations, documents, quizzes, and other data associated with YO. This action cannot be undone.
                        </p>
                        <input
                          value={deleteText}
                          onChange={(e) => setDeleteText(e.target.value)}
                          placeholder="Type DELETE to confirm"
                          autoComplete="off"
                          className="mt-2.5 w-full h-9 px-3 rounded-lg bg-black/20 border border-white/10 text-[12px] text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40"
                        />
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => { setConfirmDelete(false); setDeleteText(""); setDeleteError(""); }}
                            className="flex-1 h-8 rounded-lg border border-white/10 text-[12px] text-gray-300 hover:text-white hover:border-white/25 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteText !== "DELETE" || deleting}
                            className="flex-1 h-8 rounded-lg bg-red-500/90 text-white text-[12px] font-medium hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                          >
                            {deleting ? "Deleting…" : "Delete account"}
                          </button>
                        </div>
                        {deleteError && (
                          <p className="mt-2 text-[11px] text-red-400">{deleteError}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="mt-1 w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                      >
                        <Trash2 size={15} className="shrink-0 text-gray-500" />
                        <span className="text-[13px]">Delete account permanently</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export chooser — PDF or Markdown */}
      {exportData && (() => {
        const chat = chats.find(c => c.id === activeChatId);
        return (
          <div
            data-export-chooser
            className="absolute z-[70] bottom-[80px] left-3 right-3 bg-neutral-800 rounded-2xl border border-white/[0.12] shadow-2xl shadow-black/40 overflow-hidden"
            style={{ animation: "menuIn 120ms ease-out" }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 pl-4 pr-2 pt-3 pb-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-white truncate">
                  {exportData.title}
                </p>
                <p className="text-[10.5px] text-gray-500 mt-0.5">
                  {exportData.messages.length} messages · choose format
                </p>
              </div>
              <button
                onClick={closeExport}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-2 pt-0 space-y-1">
              <button
                onClick={exportPdf}
                className="w-full text-left px-3 py-2.5 text-[13px] text-gray-200 hover:bg-white/10 active:bg-white/15 rounded-lg transition-colors flex items-center gap-2.5"
              >
                <FileText size={14} className="text-gray-400 shrink-0" />
                <span className="flex-1">PDF</span>
                <span className="text-[10px] text-gray-500">opens print preview</span>
              </button>
              <button
                onClick={downloadMarkdown}
                className="w-full text-left px-3 py-2.5 text-[13px] text-gray-200 hover:bg-white/10 active:bg-white/15 rounded-lg transition-colors flex items-center gap-2.5"
              >
                <Download size={14} className="text-gray-400 shrink-0" />
                <span className="flex-1">Markdown (.md)</span>
              </button>
            </div>
          </div>
        );
      })()}
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

            {/* Mobile long-press action pill */}
      {pressMenu && (() => {
        const chat = chats.find(c => c.id === pressMenu.id);
        if (!chat) return null;
        return (
          <div
            className="fixed z-[60] bg-neutral-800 rounded-full border border-white/[0.12] shadow-2xl shadow-black/40 flex items-center p-1"
            style={{ left: pressMenu.x, top: pressMenu.y, transform: "translateX(-50%)", animation: "pillIn 140ms ease-out" }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { closePress(); startRename(chat.id, chat.title); }}
              className="px-3 h-8 rounded-full text-[12.5px] text-gray-300 hover:bg-white/10 active:bg-white/15 transition-colors flex items-center gap-1.5"
            >
              <Edit2 size={13} className="text-gray-500" /> Rename
            </button>
            <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
            <button
              onClick={() => { closePress(); setConfirmDeleteId(chat.id); setMenuState({ id: chat.id, x: Math.max(6, pressMenu.x - MENU_W / 2), y: pressMenu.y + 48 }); }}
              className="px-3 h-8 rounded-full text-[12.5px] text-red-400 hover:bg-red-500/15 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        );
      })()}

      {/* hidden PDF print view — only visible under body.pdf-exporting */}
      <div id="pdf-export-root" aria-hidden="true">
        {exportData && (
          <>
            <p className="pdf-title">{exportData.title}</p>
            <p className="pdf-meta">Exported from yo — {new Date().toLocaleString()}</p>
            {exportData.messages.map((m, i) => (
              <div key={i} className="pdf-turn">
                {m.user && <p className="pdf-msg-user">You</p>}
                {m.user && <p className="pdf-msg-ai" style={{ fontWeight: 400, color: "#111111" }}>{m.user}</p>}
                {m.ai && <p className="pdf-msg-user" style={{ fontSize: 12.5 }}>yo</p>}
                {m.ai && <p className="pdf-msg-ai">{m.ai}</p>}
              </div>
            ))}
          </>
        )}
      </div>

      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pillIn {
          from { opacity: 0; transform: translateX(-50%) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
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
  onStartPress, onCancelPress, onPressSelect,
  onRowContext,
}) {
  // clicking ✕ fires the input's blur first — without this guard the
  // blur handler saves the draft and "Cancel" actually renames the chat
  const cancelRenameRef = useRef(false);

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
          onBlur={() => {
            if (!cancelRenameRef.current) onSaveRename(chat.id);
            cancelRenameRef.current = false;
          }}
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
          onMouseDown={() => { cancelRenameRef.current = true; }}
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
        group flex items-center rounded-full select-none transition-colors duration-200
        ${active ? "bg-white/[0.08]" : "hover:bg-white/[0.06] active:bg-white/[0.08]"}
      `}
      onTouchStart={(e) => onStartPress(e, chat.id)}
      onTouchEnd={onCancelPress}
      onTouchMove={onCancelPress}
      onContextMenu={(e) => onRowContext(e, chat.id)}
    >
      <button
        onClick={() => { if (!onPressSelect()) onSelect(chat.id); }}
        className={`
          flex-1 min-w-0 text-left pl-3 pr-1 py-2.5 text-sm truncate
          flex items-center gap-2 transition-colors
          ${active ? "text-white" : "text-gray-400 group-hover:text-gray-200"}
        `}
      >
        {chat.is_pinned && <Pin size={11} className="shrink-0 text-gray-500" />}
        <span className="truncate">{chat.title}</span>
      </button>

      {active && (
        <button
          data-menu-btn
          onClick={(e) => onMenu(e, chat.id)}
          aria-label="Chat options"
          className={`shrink-0 w-8 h-8 mr-1 flex items-center justify-center rounded-full transition-all duration-150 ${
            menuOpen
              ? "text-white bg-white/10"
              : "text-gray-400 opacity-100 hover:text-white hover:bg-white/10"
          }`}
        >
          <MoreVertical size={15} />
        </button>
      )}
    </div>
  );
}