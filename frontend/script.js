/**
 * AI Chat Application - Frontend
 * ===============================
 * Vanilla JavaScript - no frameworks.
 * Handles: sidebar, chat rendering, theme toggle, API calls, localStorage.
 */

// ===== CONFIGURATION =====
// Empty = same origin (use when opening from http://127.0.0.1:5000)
// Or set to "http://127.0.0.1:5000" if frontend is on a different port
const API_BASE = "";

// ===== DOM ELEMENTS =====
const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");
const messagesContainer = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const themeBtn = document.getElementById("themeBtn");
const profileBtn = document.getElementById("profileBtn");
const settingsBtn = document.getElementById("settingsBtn");

// ===== STATE =====
let currentChatId = null;  // ID of the chat we're currently viewing
let currentMessages = [];  // Messages in the current chat
let isLoading = false;     // Prevent double-send while waiting for AI

// ===== THEME TOGGLE =====
// Check saved preference or default to light
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme === "dark" ? "dark" : "light");
updateThemeButtonText();

themeBtn.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const newTheme = isDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeButtonText();
});

function updateThemeButtonText() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  themeBtn.textContent = isDark ? "Light mode" : "Dark mode";
}

// ===== SIDEBAR: NEW CHAT =====
newChatBtn.addEventListener("click", () => {
  currentChatId = null;
  currentMessages = [];
  renderMessages();
  loadChatList();
  messageInput.focus();
});

// ===== SIDEBAR: CHAT LIST =====
// Load list of previous chats from backend
async function loadChatList() {
  try {
    const res = await fetch(`${API_BASE}/chats`);
    const chats = await res.json();
    renderChatList(chats);
  } catch (err) {
    console.error("Failed to load chats:", err);
    chatList.innerHTML = "<p class='chat-item' style='color: var(--text-secondary);'>Could not load chats</p>";
  }
}

function renderChatList(chats) {
  chatList.innerHTML = "";
  if (chats.length === 0) {
    chatList.innerHTML = "<p class='chat-item' style='color: var(--text-secondary); font-style: italic;'>No chats yet</p>";
    return;
  }
  chats.forEach((chat) => {
    const div = document.createElement("div");
    div.className = "chat-item" + (chat.id === currentChatId ? " active" : "");
    div.textContent = chat.title || "New chat";
    div.addEventListener("click", () => loadChat(chat.id));
    chatList.appendChild(div);
  });
}

// Load a specific chat's messages from backend
async function loadChat(chatId) {
  currentChatId = chatId;
  currentMessages = [];
  try {
    const res = await fetch(`${API_BASE}/chats/${chatId}`);
    const data = await res.json();
    currentMessages = data.messages || [];
  } catch (err) {
    console.error("Failed to load chat:", err);
  }
  renderMessages();
  loadChatList(); // Refresh list to update active state
}

// ===== CHAT RENDERING =====
function renderMessages() {
  // Hide welcome when we have messages
  if (currentMessages.length > 0) {
    welcomeEl.classList.add("hidden");
  } else {
    welcomeEl.classList.remove("hidden");
  }

  // Remove old messages (keep welcome)
  const oldMessages = messagesContainer.querySelectorAll(".message, .typing-indicator");
  oldMessages.forEach((el) => el.remove());

  // Add each message
  currentMessages.forEach((msg) => {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;
    div.innerHTML = `<div class="message-content">${formatMessage(msg.content)}</div>`;
    messagesContainer.appendChild(div);
  });

  scrollToBottom();
}

// Simple markdown-like formatting: **bold**, `code`, ```blocks```, lists
function formatMessage(text) {
  if (!text) return "";
  let html = escapeHtml(text);

  // Code blocks (triple backticks) - do before inline code
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // Inline code (single backticks)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Lists: wrap consecutive <li> in <ul>
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*?<\/li>[\s\n]*)+/g, (m) => "<ul>" + m.trim() + "</ul>");

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Add a message to the UI (and state)
function addMessage(role, content) {
  currentMessages.push({ role, content });
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = `<div class="message-content">${formatMessage(content)}</div>`;
  messagesContainer.appendChild(div);
  scrollToBottom();
}

// Show "AI is typing..." indicator
function showTypingIndicator() {
  const div = document.createElement("div");
  div.className = "typing-indicator";
  div.id = "typingIndicator";
  div.innerHTML = '<span class="typing-dots">Gt is typing<span>.</span><span>.</span><span>.</span></span>';
  messagesContainer.appendChild(div);
  scrollToBottom();
}

function hideTypingIndicator() {
  document.getElementById("typingIndicator")?.remove();
}

// Auto-scroll to latest message
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== API: SEND MESSAGE =====
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;

  addMessage("user", text);
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Hide welcome, show typing
  welcomeEl.classList.add("hidden");
  showTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, chat_id: currentChatId }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }

    currentChatId = data.chat_id;
    addMessage("assistant", data.response);
    loadChatList();
  } catch (err) {
    addMessage("assistant", `Error: ${err.message}. Make sure the backend is running.`);
  } finally {
    hideTypingIndicator();
    isLoading = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// ===== INPUT HANDLING =====
messageInput.addEventListener("input", () => {
  sendBtn.disabled = !messageInput.value.trim();
  // Auto-resize textarea
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + "px";
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// ===== PROFILE / SETTINGS (UI only - no functionality yet) =====
profileBtn.addEventListener("click", () => alert("Profile - Coming soon"));
settingsBtn.addEventListener("click", () => alert("Settings - Coming soon"));

// ===== INIT =====
loadChatList();
messageInput.focus();
