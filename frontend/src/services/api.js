const API_URL = "/api";


async function request(endpoint, options = {}) {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    options
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Something went wrong");
  }

  return response;
}


// Create new chat
export async function newChat(mode = "chill") {
  const response = await request("/new-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode,
    }),
  });

  return response.json();
}


// Get all chats
export async function getChats() {
  const response = await request("/chats");
  return response.json();
}


// Get single chat messages
export async function getChatMessages(id) {
  const response = await request(`/chat/${id}`);
  return response.json();
}


// Get single chat
export async function getChat(id) {
  const response = await request(`/chat/${id}`);
  return response.json();
}


// Send message + files
export async function sendMessage(chatId, message, files = []) {
  const formData = new FormData();
  formData.append("message", message);
  formData.append("chat_id", chatId);

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(
    `${API_URL}/chat`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  return response;
}


// Delete chat
export async function deleteChat(id) {
  const response = await request(`/chat/${id}`, {
    method: "DELETE",
  });

  return response.json();
}


// Rename chat
export async function renameChat(id, newTitle) {
  const response = await request(`/chats/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: newTitle,
    }),
  });

  return response.json();
}


// Pin/unpin chat
export async function pinChat(id, isPinned) {
  const response = await request(`/chats/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      is_pinned: isPinned,
    }),
  });

  return response.json();
}


// Set message feedback (thumbsup, thumbsdown, or null)
export async function setMessageFeedback(messageId, feedback) {
  const response = await request(`/message/${messageId}/feedback`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feedback,
    }),
  });

  return response.json();
}