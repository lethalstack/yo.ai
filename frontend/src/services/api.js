const API_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // expired/invalid session on an app endpoint → back to auth.
    // /auth/* endpoints are exempt (failed login is also a 401).
    if (response.status === 401 && !endpoint.startsWith("/auth")) {
      window.location.assign("/auth");
    }
    throw new ApiError(data.error || "Something went wrong", response.status);
  }

  return response;
}

/* ── Auth ── */

export async function register(email, password) {
  const r = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}

export async function verify(email, code) {
  const r = await request("/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  return r.json();
}

export async function resendVerification(email) {
  const r = await request("/auth/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return r.json();
}

export async function login(email, password) {
  const r = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
}

export async function logout() {
  const r = await request("/auth/logout", { method: "POST" });
  return r.json();
}

export async function me() {
  const r = await request("/auth/me");
  return r.json();
}

export async function forgotPassword(email) {
  const r = await request("/auth/forgot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return r.json();
}

export async function resetPassword(email, code, new_password) {
  const r = await request("/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, new_password }),
  });
  return r.json();
}

/* ── Chats ── */

export async function newChat(mode = "chill") {
  const r = await request("/new-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  return r.json();
}

export async function getChats() {
  const r = await request("/chats");
  return r.json();
}

export async function getChatMessages(id) {
  const r = await request(`/chat/${id}`);
  return r.json();
}

export async function sendMessage(chatId, message, files = []) {
  const formData = new FormData();
  formData.append("message", message);
  formData.append("chat_id", chatId);
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) window.location.assign("/auth");
    throw new ApiError(data.error || "Failed to send message", response.status);
  }

  return response;
}

export async function deleteChat(id) {
  const r = await request(`/chat/${id}`, { method: "DELETE" });
  return r.json();
}

export async function renameChat(id, newTitle) {
  const r = await request(`/chats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle }),
  });
  return r.json();
}

export async function pinChat(id, isPinned) {
  const r = await request(`/chats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_pinned: isPinned }),
  });
  return r.json();
}

// remove the pair the user is regenerating/editing, plus everything after it
export async function truncateMessages(chatId, fromId) {
  const q = fromId ? `?from_id=${fromId}` : "";
  const r = await request(`/chat/${chatId}/messages${q}`, { method: "DELETE" });
  return r.json();
}

export async function setMessageFeedback(messageId, feedback) {
  const r = await request(`/message/${messageId}/feedback`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  return r.json();
}

export async function googleSignIn(credential) {
  const r = await request("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return r.json();
}