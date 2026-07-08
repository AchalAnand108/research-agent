/* ══════════════════════════════════════════════════════════════════
   AI Research Agent — Frontend Logic
   IBM watsonx.ai + Granite · app.js
   ══════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
const STATE = {
  sessionId:    localStorage.getItem("researchSessionId") || generateId(),
  theme:        localStorage.getItem("theme") || "light",
  currentTab:   "chat",
  lastReport:   { content: "", title: "" },
  lastResult:   { content: "", title: "" },
  compareCount: 2,
};

// Persist session
localStorage.setItem("researchSessionId", STATE.sessionId);

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(STATE.theme);
  updateSessionBadge();
  checkHealth();
  bindNavigation();
  bindSidebar();
  bindThemeToggle();
  bindNewSession();
  bindClearBtn();
  bindUploadZone();
  autoResizeTextarea();
});

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function generateId() {
  return "ses_" + Math.random().toString(36).slice(2, 11);
}

function el(id) { return document.getElementById(id); }

function show(id)   { el(id)?.classList.remove("d-none"); }
function hide(id)   { el(id)?.classList.add("d-none"); }
function toggle(id) { el(id)?.classList.toggle("d-none"); }

function setHtml(id, html) { if (el(id)) el(id).innerHTML = html; }
function setText(id, text) { if (el(id)) el(id).textContent = text; }

function formatTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function renderMarkdown(text) {
  if (typeof marked !== "undefined") {
    return marked.parse(text || "");
  }
  // Fallback: basic escaping + newlines
  return (text || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function apiFetch(path, body = null, method = "POST") {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast notifications
// ─────────────────────────────────────────────────────────────────────────────
function showToast(message, type = "info") {
  const icons = { info: "info-circle", success: "check-circle-fill",
                  error: "exclamation-triangle-fill", warning: "exclamation-circle" };
  const colors = { info: "#3b82d4", success: "#22c55e",
                   error: "#ef4444", warning: "#f59e0b" };
  const id = "toast_" + Date.now();
  const html = `
    <div id="${id}" class="toast show align-items-center" role="alert" aria-live="assertive">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi bi-${icons[type]}" style="color:${colors[type]}"></i>
          ${escapeHtml(message)}
        </div>
        <button type="button" class="btn-close me-2 m-auto" onclick="this.closest('.toast').remove()"></button>
      </div>
    </div>`;
  el("toastContainer").insertAdjacentHTML("beforeend", html);
  setTimeout(() => el(id)?.remove(), 4000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  STATE.theme = theme;
  localStorage.setItem("theme", theme);
  const btn = el("themeToggle");
  if (btn) btn.innerHTML = theme === "dark"
    ? `<i class="bi bi-sun-fill"></i> Light`
    : `<i class="bi bi-moon-fill"></i> Dark`;
}

function bindThemeToggle() {
  el("themeToggle")?.addEventListener("click", () => {
    applyTheme(STATE.theme === "dark" ? "light" : "dark");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────
async function checkHealth() {
  const badge = el("modelStatus");
  try {
    const data = await apiFetch("/api/health", null, "GET");
    if (data.model_ready) {
      if (badge) badge.innerHTML = `<i class="bi bi-circle-fill text-success"></i> ${data.model}`;
    } else {
      if (badge) badge.innerHTML = `<i class="bi bi-circle-fill text-warning"></i> No API key`;
    }
  } catch {
    if (badge) badge.innerHTML = `<i class="bi bi-circle-fill text-danger"></i> Offline`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────
const TAB_TITLES = {
  chat:     "Research Chat",
  search:   "Paper Search",
  review:   "Literature Review",
  compare:  "Compare Papers",
  gaps:     "Research Gaps",
  upload:   "Upload Document",
  citations:"Citation Manager",
  report:   "Generate Report",
  history:  "Research History",
};

function bindNavigation() {
  document.querySelectorAll(".nav-item[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  STATE.currentTab = tab;

  // Update nav
  document.querySelectorAll(".nav-item[data-tab]").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });

  // Update panels
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.toggle("active", p.id === `tab-${tab}`);
  });

  // Update title
  setText("pageTitle", TAB_TITLES[tab] || tab);

  // Close sidebar on mobile
  el("sidebar")?.classList.remove("open");

  // Lazy-load history
  if (tab === "history") loadSessions();
  if (tab === "citations") refreshCitations();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar (mobile)
// ─────────────────────────────────────────────────────────────────────────────
function bindSidebar() {
  el("sidebarToggle")?.addEventListener("click", () => {
    el("sidebar")?.classList.toggle("open");
  });
  el("sidebarClose")?.addEventListener("click", () => {
    el("sidebar")?.classList.remove("open");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Session management
// ─────────────────────────────────────────────────────────────────────────────
function updateSessionBadge() {
  const short = STATE.sessionId.slice(-6).toUpperCase();
  setText("sessionBadge", `Session: ${short}`);
}

function bindNewSession() {
  el("newSession")?.addEventListener("click", () => {
    STATE.sessionId = generateId();
    localStorage.setItem("researchSessionId", STATE.sessionId);
    updateSessionBadge();
    // Clear chat
    const msgs = el("chatMessages");
    if (msgs) msgs.innerHTML = buildWelcomeCard();
    showToast("New research session started.", "success");
  });
}

function bindClearBtn() {
  el("clearBtn")?.addEventListener("click", () => {
    const tab = STATE.currentTab;
    if (tab === "chat") {
      setHtml("chatMessages", buildWelcomeCard());
    } else {
      ["searchResults","reviewResult","compareResult","gapsResult",
       "uploadResult","citationsFormatted","reportResult"].forEach(id => {
        el(id)?.classList.add("d-none");
      });
    }
    showToast("Cleared.", "info");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome card builder
// ─────────────────────────────────────────────────────────────────────────────
function buildWelcomeCard() {
  return `
    <div class="welcome-card">
      <div class="welcome-icon">🔬</div>
      <h2>AI Research Agent</h2>
      <p>Powered by IBM watsonx.ai · Granite 3 · 8B Instruct</p>
      <div class="quick-actions">
        <button class="quick-btn" onclick="quickPrompt('Summarize recent advances in large language models')">
          <i class="bi bi-robot"></i> LLM Advances
        </button>
        <button class="quick-btn" onclick="quickPrompt('What are the key research gaps in quantum computing?')">
          <i class="bi bi-cpu"></i> Quantum Gaps
        </button>
        <button class="quick-btn" onclick="quickPrompt('Explain the CRISPR-Cas9 methodology and its limitations')">
          <i class="bi bi-dna"></i> CRISPR Methods
        </button>
        <button class="quick-btn" onclick="quickPrompt('Compare transformer vs recurrent neural network architectures')">
          <i class="bi bi-diagram-3"></i> Compare Architectures
        </button>
      </div>
    </div>`;
}

function quickPrompt(text) {
  const input = el("chatInput");
  if (input) { input.value = text; input.focus(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────────────────────
function autoResizeTextarea() {
  const ta = el("chatInput");
  if (!ta) return;
  ta.addEventListener("input", () => {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  });
}

function handleChatKey(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChat();
  }
}

function appendMessage(role, content, ts) {
  const msgs = el("chatMessages");
  const welcome = msgs.querySelector(".welcome-card");
  if (welcome) welcome.remove();

  const avatar = role === "user"
    ? `<i class="bi bi-person-fill"></i>`
    : `<i class="bi bi-robot"></i>`;
  const bubbleContent = role === "assistant"
    ? renderMarkdown(content)
    : escapeHtml(content);

  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div>
      <div class="msg-bubble">${bubbleContent}</div>
      <div class="msg-time">${formatTime(ts)}</div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendChat() {
  const input = el("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const btn = el("sendBtn");
  input.value = "";
  input.style.height = "auto";
  btn.disabled = true;

  appendMessage("user", message);
  show("typingIndicator");

  try {
    const data = await apiFetch("/api/chat", {
      message,
      session_id: STATE.sessionId,
    });
    hide("typingIndicator");
    appendMessage("assistant", data.response, data.ts);
  } catch (err) {
    hide("typingIndicator");
    appendMessage("assistant", `⚠️ Error: ${err.message}`);
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Paper Search
// ─────────────────────────────────────────────────────────────────────────────
// Store search results for use in paper action callbacks
let _lastSearchResults = [];

el("searchQuery")?.addEventListener("keydown", e => {
  if (e.key === "Enter") searchPapers();
});

function buildPaperCard(p, i) {
  const authors = (p.authors || []).slice(0, 3).join(", ");
  const year    = (p.published || "").slice(0, 4);
  const cats    = (p.categories || []).slice(0, 2)
    .map(c => `<span class="badge-tag">${escapeHtml(c)}</span>`).join(" ");
  return `
    <div class="paper-card">
      <div class="paper-title">${escapeHtml(p.title)}</div>
      <div class="paper-meta">
        <span><i class="bi bi-people"></i> ${escapeHtml(authors)}</span>
        <span><i class="bi bi-calendar3"></i> ${year}</span>
        <span><i class="bi bi-journal"></i> ${escapeHtml(p.source || "arXiv")}</span>
        ${cats}
      </div>
      <div class="paper-abstract">${escapeHtml(p.abstract)}</div>
      <div class="paper-actions">
        <button class="btn-sm-action" onclick="summarizePaper(${i})">
          <i class="bi bi-card-text"></i> Summarize
        </button>
        <button class="btn-sm-action" onclick="addPaperToCitations(${i})">
          <i class="bi bi-bookmark-plus"></i> Cite
        </button>
        ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" class="btn-sm-action">
          <i class="bi bi-box-arrow-up-right"></i> View
        </a>` : ""}
      </div>
    </div>`;
}

async function searchPapers() {
  const query = el("searchQuery").value.trim();
  const limit = parseInt(el("searchLimit").value);
  if (!query) { showToast("Please enter a search query.", "warning"); return; }

  show("searchLoading");
  hide("searchResults");

  try {
    const data = await apiFetch("/api/search", { query, limit });
    _lastSearchResults = data.papers;
    hide("searchLoading");

    setHtml("searchInsight", renderMarkdown(data.insight));
    setHtml("paperCards", data.papers.length
      ? data.papers.map(buildPaperCard).join("")
      : `<div class="empty-state"><i class="bi bi-search"></i><p>No papers found.</p></div>`
    );
    show("searchResults");
    showToast(`Found ${data.papers.length} papers.`, "success");
  } catch (err) {
    hide("searchLoading");
    showToast(err.message, "error");
  }
}

async function summarizePaper(idx) {
  const p = _lastSearchResults[idx];
  if (!p) return;
  switchTab("chat");
  const msg = `Please summarize this paper:\n\nTitle: ${p.title}\nAuthors: ${(p.authors||[]).join(", ")}\nAbstract: ${p.abstract}`;
  const input = el("chatInput");
  if (input) { input.value = msg; }
  sendChat();
}

function addPaperToCitations(idx) {
  const p = _lastSearchResults[idx];
  if (!p) return;
  apiFetch("/api/citations/add", {
    session_id: STATE.sessionId,
    title:   p.title,
    authors: p.authors,
    year:    (p.published || "").slice(0, 4),
    url:     p.url,
    source:  p.source,
  }).then(() => {
    showToast("Added to citations.", "success");
    refreshCitations();
  }).catch(e => showToast(e.message, "error"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Literature Review
// ─────────────────────────────────────────────────────────────────────────────
async function generateReview() {
  const topic = el("reviewTopic").value.trim();
  if (!topic) { showToast("Please enter a research topic.", "warning"); return; }

  show("reviewLoading");
  hide("reviewResult");

  try {
    const data = await apiFetch("/api/literature-review", {
      topic,
      session_id: STATE.sessionId,
    });
    hide("reviewLoading");
    setHtml("reviewContent", renderMarkdown(data.review));
    show("reviewResult");
    STATE.lastResult = { content: data.review, title: `Literature Review: ${topic}` };
    showToast("Literature review generated.", "success");
    refreshCitations();
  } catch (err) {
    hide("reviewLoading");
    showToast(err.message, "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare Papers
// ─────────────────────────────────────────────────────────────────────────────
function addPaperInput() {
  const container = el("compareInputs");
  const idx = STATE.compareCount++;
  const card = document.createElement("div");
  card.className = "paper-input-card";
  card.id = `paperInput${idx}`;
  card.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <label class="form-label fw-semibold mb-0">Paper ${idx + 1}</label>
      <button class="btn-sm-action" onclick="this.closest('.paper-input-card').remove()">
        <i class="bi bi-trash3"></i> Remove
      </button>
    </div>
    <input type="text" class="form-control mb-2" placeholder="Title" data-field="title" />
    <input type="text" class="form-control mb-2" placeholder="Authors (comma-separated)" data-field="authors" />
    <input type="text" class="form-control mb-2" placeholder="Year" data-field="year" />
    <textarea class="form-control" rows="3" placeholder="Abstract or key content" data-field="abstract"></textarea>`;
  container.appendChild(card);
}

function collectPaperInputs() {
  return Array.from(document.querySelectorAll(".paper-input-card")).map(card => ({
    title:    card.querySelector('[data-field="title"]')?.value.trim() || "",
    authors:  (card.querySelector('[data-field="authors"]')?.value || "").split(",").map(s => s.trim()),
    year:     card.querySelector('[data-field="year"]')?.value.trim() || "",
    abstract: card.querySelector('[data-field="abstract"]')?.value.trim() || "",
  })).filter(p => p.title);
}

async function comparePapers() {
  const papers = collectPaperInputs();
  if (papers.length < 2) { showToast("Add at least 2 papers to compare.", "warning"); return; }

  show("compareLoading");
  hide("compareResult");

  try {
    const data = await apiFetch("/api/compare", { papers });
    hide("compareLoading");
    setHtml("compareContent", renderMarkdown(data.comparison));
    show("compareResult");
    showToast("Comparison complete.", "success");
  } catch (err) {
    hide("compareLoading");
    showToast(err.message, "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Research Gaps
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeGaps() {
  const topic = el("gapTopic").value.trim();
  if (!topic) { showToast("Please enter a research topic.", "warning"); return; }

  show("gapsLoading");
  hide("gapsResult");

  try {
    const data = await apiFetch("/api/gaps", { topic });
    hide("gapsLoading");
    setHtml("gapsContent", renderMarkdown(data.analysis));
    show("gapsResult");
    STATE.lastResult = { content: data.analysis, title: `Gap Analysis: ${topic}` };
    showToast("Gap analysis complete.", "success");
  } catch (err) {
    hide("gapsLoading");
    showToast(err.message, "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Document
// ─────────────────────────────────────────────────────────────────────────────
function bindUploadZone() {
  el("uploadZone")?.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "I") return;
    el("fileInput")?.click();
  });
}

function handleDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file) uploadFile(file);
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) uploadFile(file);
}

async function uploadFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["pdf","docx","txt"].includes(ext)) {
    showToast("Only PDF, DOCX, and TXT files are supported.", "warning");
    return;
  }
  const action = document.querySelector('input[name="uploadAction"]:checked')?.value || "summarize";

  show("uploadLoading");
  hide("uploadResult");

  setHtml("uploadZone", `
    <i class="bi bi-file-earmark-check upload-icon" style="color:var(--accent)"></i>
    <p class="upload-text">${escapeHtml(file.name)}</p>
    <p class="upload-sub">Uploading & analyzing…</p>`);

  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("action", action);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");

    hide("uploadLoading");
    setHtml("uploadResultLabel",
      `<i class="bi bi-file-earmark-text"></i> ${escapeHtml(action)} — ${escapeHtml(data.filename)}`);
    setHtml("uploadContent", renderMarkdown(data.result));
    show("uploadResult");
    STATE.lastResult = { content: data.result, title: `${action}: ${data.filename}` };
    showToast(`Analyzed ${data.filename} (${data.chars_extracted} chars).`, "success");
  } catch (err) {
    hide("uploadLoading");
    showToast(err.message, "error");
  }

  // Reset upload zone
  el("uploadZone").innerHTML = `
    <i class="bi bi-cloud-upload upload-icon"></i>
    <p class="upload-text">Drag &amp; drop a PDF, DOCX, or TXT file here</p>
    <p class="upload-sub">or click to browse</p>
    <input type="file" id="fileInput" accept=".pdf,.docx,.txt" class="d-none"
           onchange="handleFileSelect(event)" />
    <button class="btn-primary-action mt-3" onclick="document.getElementById('fileInput').click()">
      <i class="bi bi-folder2-open"></i> Browse Files
    </button>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Citations
// ─────────────────────────────────────────────────────────────────────────────
async function refreshCitations() {
  try {
    const data = await apiFetch(`/api/citations?session_id=${STATE.sessionId}`, null, "GET");
    renderCitationsList(data.citations || []);
  } catch { /* silent */ }
}

function renderCitationsList(citations) {
  const list = el("citationsList");
  if (!list) return;
  if (!citations.length) {
    list.innerHTML = `<div class="empty-state"><i class="bi bi-bookmark"></i><p>No citations yet.</p></div>`;
    return;
  }
  list.innerHTML = citations.map((c, i) => `
    <div class="citation-item" id="cit-${c.id}">
      <div class="citation-num">${i + 1}</div>
      <div class="citation-body">
        <div class="citation-title">${escapeHtml(c.title)}</div>
        <div class="citation-meta">
          ${c.authors?.length ? `<i class="bi bi-people"></i> ${escapeHtml(c.authors.slice(0,3).join(", "))}` : ""}
          ${c.year   ? ` · ${escapeHtml(c.year)}`   : ""}
          ${c.journal ? ` · ${escapeHtml(c.journal)}` : ""}
          ${c.source  ? ` · <span class="badge-tag">${escapeHtml(c.source)}</span>` : ""}
        </div>
        ${c.url ? `<a href="${escapeHtml(c.url)}" target="_blank" class="citation-meta">
          <i class="bi bi-box-arrow-up-right"></i> ${escapeHtml(c.url.slice(0, 60))}…</a>` : ""}
      </div>
      <div class="citation-actions">
        <button class="btn-sm-action" onclick="deleteCitation('${c.id}')">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>`).join("");
}

async function addCitation() {
  const title   = el("citTitle").value.trim();
  if (!title) { showToast("Title is required.", "warning"); return; }
  const authors = el("citAuthors").value.split(",").map(s => s.trim()).filter(Boolean);
  const year    = el("citYear").value.trim();
  const journal = el("citJournal").value.trim();
  const url     = el("citUrl").value.trim();

  try {
    await apiFetch("/api/citations/add", {
      session_id: STATE.sessionId, title, authors, year, journal, url,
    });
    bootstrap.Modal.getInstance(el("addCitationModal"))?.hide();
    ["citTitle","citAuthors","citYear","citJournal","citUrl"].forEach(id => {
      if (el(id)) el(id).value = "";
    });
    await refreshCitations();
    showToast("Citation added.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteCitation(cid) {
  try {
    await apiFetch("/api/citations/delete", { session_id: STATE.sessionId, citation_id: cid });
    await refreshCitations();
    showToast("Citation removed.", "info");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function formatAllCitations() {
  const fmt = el("citationFormat").value;
  show("citationsLoading");
  hide("citationsFormatted");

  try {
    const citData = await apiFetch(`/api/citations?session_id=${STATE.sessionId}`, null, "GET");
    if (!citData.citations.length) {
      hide("citationsLoading");
      showToast("No citations to format.", "warning");
      return;
    }
    const data = await apiFetch("/api/citations/format", {
      citations: citData.citations, format: fmt,
    });
    hide("citationsLoading");
    setHtml("citationsFormattedContent", renderMarkdown(data.formatted));
    show("citationsFormatted");
    showToast(`Formatted in ${fmt} style.`, "success");
  } catch (err) {
    hide("citationsLoading");
    showToast(err.message, "error");
  }
}

async function exportCitations() {
  try {
    const data = await apiFetch(`/api/citations?session_id=${STATE.sessionId}`, null, "GET");
    if (!data.citations.length) { showToast("No citations to export.", "warning"); return; }
    const text = data.citations.map((c, i) =>
      `[${i+1}] ${(c.authors||[]).join(", ")} (${c.year || "n.d."}). ` +
      `${c.title}. ${c.journal || ""} ${c.url ? c.url : ""}`
    ).join("\n\n");
    downloadText(text, "citations.txt");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────────────────────────────────────
async function generateReport() {
  const topic = el("reportTopic").value.trim();
  const type  = el("reportType").value;
  if (!topic) { showToast("Please enter a research topic.", "warning"); return; }

  show("reportLoading");
  hide("reportResult");

  try {
    const data = await apiFetch("/api/report", {
      topic, type, session_id: STATE.sessionId,
    });
    hide("reportLoading");
    setHtml("reportContent", renderMarkdown(data.report));
    show("reportResult");
    STATE.lastReport = { content: data.report, title: topic };
    showToast("Report generated.", "success");
  } catch (err) {
    hide("reportLoading");
    showToast(err.message, "error");
  }
}

async function exportReport(fmt) {
  if (!STATE.lastReport.content) {
    showToast("Generate a report first.", "warning");
    return;
  }
  await doExportContent(STATE.lastReport.content, STATE.lastReport.title, fmt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export helpers
// ─────────────────────────────────────────────────────────────────────────────
function exportResult(contentId, title) {
  const text = el(contentId)?.innerText || "";
  STATE.lastResult = { content: text, title };
  // Show export modal
  const modal = new bootstrap.Modal(el("exportModal"));
  modal.show();
}

async function doExport(fmt) {
  bootstrap.Modal.getInstance(el("exportModal"))?.hide();
  await doExportContent(STATE.lastResult.content, STATE.lastResult.title, fmt);
}

async function doExportContent(content, title, fmt) {
  showToast(`Exporting as ${fmt.toUpperCase()}…`, "info");
  try {
    const res = await fetch("/api/export", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ content, title, format: fmt }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || "Export failed");
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research_report_${Date.now()}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported as ${fmt.toUpperCase()}.`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function copyResult(contentId) {
  const text = el(contentId)?.innerText || "";
  navigator.clipboard.writeText(text)
    .then(() => showToast("Copied to clipboard.", "success"))
    .catch(() => showToast("Clipboard access denied.", "error"));
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// History / Sessions
// ─────────────────────────────────────────────────────────────────────────────
async function loadSessions() {
  const list = el("sessionsList");
  if (!list) return;
  list.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><p>Loading sessions…</p></div>`;

  try {
    const data = await apiFetch("/api/sessions", null, "GET");
    if (!data.sessions.length) {
      list.innerHTML = `<div class="empty-state"><i class="bi bi-clock"></i><p>No sessions yet.</p></div>`;
      return;
    }
    list.innerHTML = data.sessions.map(s => `
      <div class="session-item" onclick="loadSession('${s.id}')">
        <div>
          <div class="session-title">${escapeHtml(s.title || "Untitled Session")}</div>
          <div class="session-meta">
            <i class="bi bi-chat"></i> ${s.messages} messages ·
            <i class="bi bi-bookmark"></i> ${s.citations} citations ·
            <i class="bi bi-calendar3"></i> ${formatDate(s.created)}
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn-sm-action" onclick="event.stopPropagation(); deleteSession('${s.id}')">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>`).join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-circle"></i><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function loadSession(sessionId) {
  STATE.sessionId = sessionId;
  localStorage.setItem("researchSessionId", sessionId);
  updateSessionBadge();
  switchTab("chat");
  showToast("Session loaded.", "success");
  refreshCitations();
}

async function deleteSession(sessionId) {
  try {
    await apiFetch("/api/sessions/delete", { session_id: sessionId });
    showToast("Session deleted.", "info");
    loadSessions();
    if (STATE.sessionId === sessionId) {
      STATE.sessionId = generateId();
      localStorage.setItem("researchSessionId", STATE.sessionId);
      updateSessionBadge();
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}
