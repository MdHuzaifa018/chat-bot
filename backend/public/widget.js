/**
 * SupportAI - Standalone Multi-Tenant Chatbot Widget
 * Embed with:
 * <script src="https://your-domain/widget.js" data-chatbot-id="bot_xxx" async></script>
 */
(function () {
  "use strict";

  // Prevent duplicate execution
  if (window.__SUPPORT_AI_WIDGET_LOADED__) return;
  window.__SUPPORT_AI_WIDGET_LOADED__ = true;

  // 1. Locate configuration script tag
  const currentScript =
    document.currentScript ||
    document.querySelector("script[data-chatbot-id]") ||
    document.querySelector("script[src*='widget.js']");

  const publicChatbotId =
    currentScript?.getAttribute("data-chatbot-id") ||
    window.SUPPORT_AI_CHATBOT_ID || "";
  if (!publicChatbotId) { console.error("SupportAI widget requires data-chatbot-id."); return; }

  // Determine API base URL
  let apiBase = window.SUPPORT_AI_API_URL;
  if (!apiBase) {
    if (currentScript?.src) {
      try {
        const scriptUrl = new URL(currentScript.src);
        // If loaded from frontend (port 3000), backend is port 5000 in dev or relative /api
        if (scriptUrl.port === "3000") {
          apiBase = `${scriptUrl.protocol}//${scriptUrl.hostname}:5000`;
        } else {
          apiBase = scriptUrl.origin;
        }
      } catch {
        apiBase = "http://localhost:5000";
      }
    } else {
      apiBase = "http://localhost:5000";
    }
  }

  // 2. Create host container and Shadow DOM
  const container = document.createElement("div");
  container.id = "support-ai-widget-host";
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: "open" });

  // 3. Inject encapsulated styles
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--primary-color, #0F172A);
      color: #FFFFFF;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      outline: none;
    }

    .launcher:hover {
      transform: scale(1.08);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.35);
    }

    .launcher:active {
      transform: scale(0.96);
    }

    .launcher.pos-left {
      right: auto;
      left: 24px;
    }

    .launcher svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.25s ease;
    }

    .window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 390px;
      max-width: calc(100vw - 32px);
      height: 620px;
      max-height: calc(100vh - 120px);
      background: #FFFFFF;
      border-radius: 20px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 1px 1px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      z-index: 999999;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .window.pos-left {
      right: auto;
      left: 24px;
    }

    .window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .header {
      background: var(--primary-color, #0F172A);
      color: #FFFFFF;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #FFFFFF;
      object-fit: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .title-group {
      display: flex;
      flex-direction: column;
    }

    .title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #FFFFFF;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      margin-top: 1px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22C55E;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #F8FAFC;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      display: flex;
      flex-direction: column;
      max-width: 84%;
      animation: fadeIn 0.25s ease forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      align-self: flex-end;
    }

    .message.assistant {
      align-self: flex-start;
    }

    .bubble {
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
    }

    .message.user .bubble {
      background: var(--primary-color, #0F172A);
      color: #FFFFFF;
      border-bottom-right-radius: 4px;
    }

    .message.assistant .bubble {
      background: #FFFFFF;
      color: #1E293B;
      border-bottom-left-radius: 4px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .timestamp {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 4px;
      align-self: flex-end;
    }

    .suggested-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }

    .suggested-title {
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .pill-btn {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      padding: 8px 12px;
      font-size: 13px;
      color: #334155;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .pill-btn:hover {
      background: #F1F5F9;
      border-color: var(--secondary-color, #3B82F6);
      color: var(--secondary-color, #3B82F6);
      transform: translateX(2px);
    }

    .typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      width: fit-content;
    }

    .dot {
      width: 6px;
      height: 6px;
      background: #94A3B8;
      border-radius: 50%;
      animation: pulse 1.4s infinite ease-in-out;
    }

    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes pulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1.1); opacity: 1; }
    }

    .footer {
      background: #FFFFFF;
      padding: 14px 16px;
      border-top: 1px solid #E2E8F0;
    }

    .input-form {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 24px;
      padding: 4px 6px 4px 16px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .input-form:focus-within {
      border-color: var(--secondary-color, #3B82F6);
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
    }

    .chat-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 14px;
      color: #1E293B;
      padding: 6px 0;
    }

    .chat-input::placeholder {
      color: #94A3B8;
    }

    .send-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-color, #0F172A);
      color: #FFFFFF;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .send-btn:hover {
      opacity: 0.9;
      transform: scale(1.05);
    }

    .send-btn:disabled {
      background: #CBD5E1;
      cursor: not-allowed;
      transform: none;
    }

    .branding {
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
      margin-top: 6px;
    }

    .branding a {
      color: #64748B;
      text-decoration: none;
      font-weight: 500;
    }

    .branding a:hover {
      text-decoration: underline;
    }

    .contact-prompt-bar {
      margin-top: 10px;
      padding: 8px 12px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      background: #FFFFFF;
      border: 1px dashed #CBD5E1;
      border-radius: 12px;
    }

    .contact-prompt-btn {
      background: none;
      border: none;
      color: var(--secondary-color, #254B35);
      font-weight: 600;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-left: 4px;
    }

    .contact-prompt-btn:hover {
      opacity: 0.85;
    }

    .contact-drawer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #FFFFFF;
      z-index: 10;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .contact-drawer.open {
      transform: translateY(0);
    }

    .contact-drawer-header {
      background: var(--primary-color, #0F172A);
      color: #FFFFFF;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .contact-drawer-title {
      font-size: 15px;
      font-weight: 600;
      color: #FFFFFF;
    }

    .contact-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contact-input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .contact-label {
      font-size: 12px;
      font-weight: 500;
      color: #475569;
    }

    .contact-input, .contact-textarea {
      width: 100%;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 13px;
      color: #1E293B;
      background: #F8FAFC;
      outline: none;
      transition: border-color 0.15s ease;
      box-sizing: border-box;
    }

    .contact-input:focus, .contact-textarea:focus {
      border-color: var(--secondary-color, #254B35);
      background: #FFFFFF;
    }

    .contact-submit-btn {
      margin-top: 8px;
      background: var(--primary-color, #0F172A);
      color: #FFFFFF;
      border: none;
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }

    .contact-submit-btn:hover {
      opacity: 0.9;
    }

    .contact-cancel-btn {
      background: transparent;
      border: 1px solid #E2E8F0;
      color: #64748B;
      border-radius: 12px;
      padding: 8px 16px;
      font-size: 13px;
      cursor: pointer;
      text-align: center;
    }

    @media (max-width: 480px) {
      .window {
        bottom: 0 !important;
        right: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
      }
    }
  `;
  shadow.appendChild(styleEl);

  // 4. Initial DOM Structure
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button class="launcher" id="launcher-btn" aria-label="Open Customer Support Chat">
      <svg id="icon-open" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg id="icon-close" viewBox="0 0 24 24" style="display: none;">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <div class="window" id="chat-window">
      <div class="header">
        <div class="header-info">
          <div class="avatar" id="bot-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2">
              <path d="M12 2a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2z"></path>
              <circle cx="9" cy="13" r="1"></circle>
              <circle cx="15" cy="13" r="1"></circle>
            </svg>
          </div>
          <div class="title-group">
            <span class="title" id="bot-title">AI Support Assistant</span>
            <span class="status"><span class="status-dot"></span> Online</span>
          </div>
        </div>
        <button class="close-btn" id="header-close-btn" aria-label="Close Chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="body" id="messages-body">
        <!-- Messages rendered here -->
      </div>

      <div class="footer">
        <form class="input-form" id="chat-form">
          <input type="text" class="chat-input" id="chat-input" placeholder="Type your message..." autocomplete="off" />
          <button type="submit" class="send-btn" id="send-btn" aria-label="Send Message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div class="branding">Powered by <a href="/" target="_blank" rel="noopener">SupportAI</a></div>
      </div>

      <!-- In-Widget Contact Drawer -->
      <div class="contact-drawer" id="contact-drawer">
        <div class="contact-drawer-header">
          <span class="contact-drawer-title">Email Our Team</span>
          <button class="close-btn" id="contact-drawer-close" aria-label="Close Contact Form">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form class="contact-drawer-body" id="contact-form">
          <p style="font-size: 12px; color: #64748B; margin-bottom: 2px;">
            Didn't find your answer? Send a direct message to our support team and we will get back to you via email.
          </p>
          <div class="contact-input-group">
            <label class="contact-label" for="contact-name">Your Name *</label>
            <input type="text" id="contact-name" class="contact-input" placeholder="e.g. Rahul Sharma" required />
          </div>
          <div class="contact-input-group">
            <label class="contact-label" for="contact-email">Your Email *</label>
            <input type="email" id="contact-email" class="contact-input" placeholder="e.g. rahul@example.com" required />
          </div>
          <div class="contact-input-group">
            <label class="contact-label" for="contact-subject">Subject (Optional)</label>
            <input type="text" id="contact-subject" class="contact-input" placeholder="Question or request details..." />
          </div>
          <div class="contact-input-group">
            <label class="contact-label" for="contact-message">Message *</label>
            <textarea id="contact-message" class="contact-textarea" rows="3" placeholder="How can our team help you?" required></textarea>
          </div>
          <button type="submit" class="contact-submit-btn" id="contact-submit-btn">Send Message</button>
          <button type="button" class="contact-cancel-btn" id="contact-cancel-btn">Back to Chat</button>
        </form>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // Element handles
  const launcherBtn = shadow.getElementById("launcher-btn");
  const iconOpen = shadow.getElementById("icon-open");
  const iconClose = shadow.getElementById("icon-close");
  const chatWindow = shadow.getElementById("chat-window");
  const headerCloseBtn = shadow.getElementById("header-close-btn");
  const messagesBody = shadow.getElementById("messages-body");
  const chatForm = shadow.getElementById("chat-form");
  const chatInput = shadow.getElementById("chat-input");
  const botTitle = shadow.getElementById("bot-title");
  const botAvatar = shadow.getElementById("bot-avatar");

  // Contact drawer handles
  const contactDrawer = shadow.getElementById("contact-drawer");
  const contactDrawerClose = shadow.getElementById("contact-drawer-close");
  const contactCancelBtn = shadow.getElementById("contact-cancel-btn");
  const contactForm = shadow.getElementById("contact-form");
  const contactNameInput = shadow.getElementById("contact-name");
  const contactEmailInput = shadow.getElementById("contact-email");
  const contactSubjectInput = shadow.getElementById("contact-subject");
  const contactMessageInput = shadow.getElementById("contact-message");
  const contactSubmitBtn = shadow.getElementById("contact-submit-btn");

  let isOpen = false;
  let visitorId = "";
  let conversationId = "";
  let sessionToken = "";

  // Toggle open/close
  function toggleChat(openState) {
    isOpen = typeof openState === "boolean" ? openState : !isOpen;
    if (isOpen) {
      chatWindow.classList.add("open");
      iconOpen.style.display = "none";
      iconClose.style.display = "block";
      chatInput.focus();
    } else {
      chatWindow.classList.remove("open");
      iconOpen.style.display = "block";
      iconClose.style.display = "none";
    }
  }

  launcherBtn.addEventListener("click", () => toggleChat());
  headerCloseBtn.addEventListener("click", () => toggleChat(false));

  // Render message bubble
  function appendMessage(role, text, sources = []) {
    const msgEl = document.createElement("div");
    msgEl.className = `message ${role}`;

    const bubbleEl = document.createElement("div");
    bubbleEl.className = "bubble";
    bubbleEl.textContent = text;

    msgEl.appendChild(bubbleEl);

    // Optional source citations
    if (sources && sources.length > 0) {
      const srcEl = document.createElement("div");
      srcEl.style.fontSize = "11px";
      srcEl.style.color = "#64748B";
      srcEl.style.marginTop = "4px";
      srcEl.textContent = `Sources: ${sources.map((s) => s.title).join(", ")}`;
      msgEl.appendChild(srcEl);
    }

    const timeEl = document.createElement("div");
    timeEl.className = "timestamp";
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    msgEl.appendChild(timeEl);

    messagesBody.appendChild(msgEl);
    ensureContactPromptBar();
    messagesBody.scrollTop = messagesBody.scrollHeight;
  }

  // Render or re-position the fallback contact inquiry prompt
  function ensureContactPromptBar() {
    let bar = shadow.getElementById("contact-prompt-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "contact-prompt-bar";
      bar.className = "contact-prompt-bar";
      bar.innerHTML = `Didn't find your answer? <button type="button" class="contact-prompt-btn" id="open-contact-drawer-btn">Email our team</button>`;
      messagesBody.appendChild(bar);
      const openBtn = bar.querySelector("#open-contact-drawer-btn");
      if (openBtn) {
        openBtn.addEventListener("click", () => {
          contactDrawer.classList.add("open");
          contactNameInput.focus();
        });
      }
    } else {
      messagesBody.appendChild(bar);
    }
  }

  // Contact drawer close listeners
  if (contactDrawerClose) {
    contactDrawerClose.addEventListener("click", () => contactDrawer.classList.remove("open"));
  }
  if (contactCancelBtn) {
    contactCancelBtn.addEventListener("click", () => contactDrawer.classList.remove("open"));
  }

  // Contact form submit listener
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = contactNameInput.value.trim();
      const email = contactEmailInput.value.trim();
      const subject = contactSubjectInput.value.trim();
      const message = contactMessageInput.value.trim();

      if (!name || !email || !message) return;

      contactSubmitBtn.disabled = true;
      contactSubmitBtn.textContent = "Sending...";

      try {
        const res = await fetch(`${apiBase}/api/widget/${publicChatbotId}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, subject, message }),
        });
        const json = await res.json();
        contactDrawer.classList.remove("open");
        contactForm.reset();
        appendMessage(
          "assistant",
          `✅ ${json?.data?.message || "Thank you! Your message has been sent to our team. We will get back to you shortly."}`
        );
      } catch (err) {
        alert("Failed to send message. Please check your connection and try again.");
      } finally {
        contactSubmitBtn.disabled = false;
        contactSubmitBtn.textContent = "Send Message";
      }
    });
  }

  // Render typing indicator
  function showTyping() {
    const typing = document.createElement("div");
    typing.id = "typing-indicator";
    typing.className = "typing";
    typing.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    messagesBody.appendChild(typing);
    messagesBody.scrollTop = messagesBody.scrollHeight;
  }

  function hideTyping() {
    const typing = shadow.getElementById("typing-indicator");
    if (typing) typing.remove();
  }

  // Load configuration from backend
  async function loadConfig() {
    try {
      const res = await fetch(`${apiBase}/api/widget/${publicChatbotId}/config`);
      if (!res.ok) throw new Error("Failed to load widget config");

      const { data } = await res.json();
      const { config, suggestedQuestions } = data;

      // Apply dynamic colors
      if (config.primary_color) {
        shadow.host.style.setProperty("--primary-color", config.primary_color);
      }
      if (config.secondary_color) {
        shadow.host.style.setProperty("--secondary-color", config.secondary_color);
      }

      // Position
      if (config.position === "bottom-left") {
        launcherBtn.classList.add("pos-left");
        chatWindow.classList.add("pos-left");
      }

      // Title & Logo
      if (config.chatbot_name) botTitle.textContent = config.chatbot_name;
      if (config.placeholder_text) chatInput.placeholder = config.placeholder_text;
      if (config.logo_url) {
        botAvatar.innerHTML = `<img src="${config.logo_url}" alt="${config.chatbot_name}" onerror="this.style.display='none'"/>`;
      }

      // Welcome message
      appendMessage("assistant", config.welcome_message || "Hi there! How can I help you today?");

      // Suggested questions
      if (suggestedQuestions && suggestedQuestions.length > 0) {
        const section = document.createElement("div");
        section.className = "suggested-section";
        section.innerHTML = `<div class="suggested-title">Suggested Questions</div>`;

        suggestedQuestions.forEach((q) => {
          const btn = document.createElement("button");
          btn.className = "pill-btn";
          btn.textContent = q;
          btn.addEventListener("click", () => {
            chatInput.value = q;
            chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
          });
          section.appendChild(btn);
        });

        messagesBody.appendChild(section);
      }

    } catch (err) {
      console.warn("[SupportAI Widget] Config fallback:", err);
      appendMessage("assistant", "Chatbot is temporarily unavailable. Please try again later.");
    }
  }

  // Start visitor session
  async function initSession() {
    try {
      const res = await fetch(`${apiBase}/api/widget/${publicChatbotId}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
      if (res.ok) {
        const { data } = await res.json();
        visitorId = data.visitorId;
        conversationId = data.conversationId;
        sessionToken = data.sessionToken;
      }
    } catch (error) {
      console.warn("[SupportAI Widget] Could not start visitor session:", error);
    }
  }

  // Send message
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    appendMessage("user", text);
    showTyping();

    try {
      if (!conversationId || !sessionToken) await initSession();
      if (!conversationId || !sessionToken) throw new Error("Could not start a chat session.");
      const res = await fetch(`${apiBase}/api/widget/${publicChatbotId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          sessionToken,
        }),
      });

      hideTyping();

      if (!res.ok) {
        throw new Error("Server error");
      }

      const { data } = await res.json();
      appendMessage("assistant", data.answer, data.sources);
    } catch {
      hideTyping();
      appendMessage(
        "assistant",
        "I am currently having trouble connecting to the server. Please try again or reach out to support."
      );
    }
  });

  // Init
  loadConfig();
  initSession();
})();
