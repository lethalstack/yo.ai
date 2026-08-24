import Sidebar from "../components/sidebar/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import * as api from "../services/api";

// use whatever host the page was loaded from instead of a hardcoded
// 127.0.0.1 — required for this to work when opened from a phone on
// the same network (127.0.0.1 on a phone means the phone itself, not
// the laptop running Flask)


const VALID_MODES = ["chill", "exam", "coding", "interview"];

export default function StudyApp() {

  const [searchParams] = useSearchParams();

  // landing page "Try it" links arrive as /app?mode=exam etc. — this is
  // the mode any NEW chat created during this visit will use
  const modeParam = searchParams.get("mode");
  const [sessionMode] = useState(
    VALID_MODES.includes(modeParam) ? modeParam : "chill"
  );

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop collapse state

  const refreshChats = useCallback(async () => {
  try {

    const data = await api.getChats();

    if (!Array.isArray(data)) {
      console.error("Failed to load chats:", data);
      return;
    }

    setChats(data);

  } catch (error) {
    console.log("Failed to load chats", error);
  }
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  function handleNewChat() {
    // don't hit the backend yet — the chat only gets created (and shows
    // up in the sidebar) once the user actually sends a first message
    setActiveChatId(null);
    setResetSignal(prev => prev + 1);
    setSidebarOpen(false);
  }

  function handleSelectChat(id) {
    setActiveChatId(id);
    setSidebarOpen(false);
  }

  function handleChatCreated(id) {
    setActiveChatId(id);
    setChats(prev => [{ id, title: "New Chat", mode: sessionMode }, ...prev]);
  }

  async function handleDeleteChat(id) {
  try {

    await api.deleteChat(id);

    if (id === activeChatId) {
      setActiveChatId(null);
    }

    await refreshChats();

  } catch (error) {
    console.error("Failed to delete chat", error);
  }
}

  return (

    <div className="flex h-dvh bg-black relative overflow-hidden">

      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        refreshChats={refreshChats}
      />

      <div className="flex-1 text-white min-w-0">

        <ChatWindow
          chatId={activeChatId}
          resetSignal={resetSignal}
          sessionMode={sessionMode}
          onChatCreated={handleChatCreated}
          refreshChats={refreshChats}
          onOpenSidebar={() => setSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onExpandSidebar={() => setSidebarCollapsed(false)}
        />

      </div>

    </div>

  )

}