document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatContainer = document.getElementById("chat-messages-container");
    const inspectorPanel = document.getElementById("inspector-panel");
    const inspectorContent = document.getElementById("inspector-content-area");
    const closeInspector = document.getElementById("close-inspector");
    const toggleInspector = document.getElementById("toggle-inspector");
    
    // Store message citations globally so they can be inspected dynamically
    let lastRetrievedSources = [];

    // Setup toggle buttons for Inspector Panel (Responsive layout)
    if (toggleInspector) {
        toggleInspector.addEventListener("click", () => {
            inspectorPanel.classList.toggle("open");
        });
    }

    if (closeInspector) {
        closeInspector.addEventListener("click", () => {
            inspectorPanel.classList.remove("open");
        });
    }

    // Attach click listeners to quick prompt buttons
    document.querySelectorAll(".prompt-btn").forEach(button => {
        button.addEventListener("click", () => {
            const question = button.getAttribute("data-question");
            if (question) {
                chatInput.value = question;
                chatForm.dispatchEvent(new Event("submit"));
            }
        });
    });

    // Handle Form Submit (Message Send)
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const messageText = chatInput.value.trim();
        if (!messageText) return;
        
        // 1. Add User Message to Chat
        appendMessage(messageText, "user");
        chatInput.value = "";
        
        // 2. Add Typing Indicator for Bot
        const typingIndicator = appendTypingIndicator();
        scrollToBottom();

        try {
            // 3. Request API
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: messageText })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to communicate with API server");
            }

            const data = await response.json();
            
            // Remove Typing Indicator
            typingIndicator.remove();

            // 4. Add Bot Response to Chat
            appendMessage(data.answer, "bot", data.sources);
            
            // 5. Update FAISS Inspector Sidebar
            updateInspector(data.sources, messageText);
            
            // Auto open inspector on large screens if not already open
            if (window.innerWidth > 1024 && data.sources.length > 0) {
                inspectorPanel.classList.add("open");
            }

        } catch (error) {
            console.error("Chat error:", error);
            typingIndicator.remove();
            appendMessage(`⚠️ Error: ${error.message}. Please check your Groq API key and server log.`, "system");
        }
        
        scrollToBottom();
    });

    // Helper: Append User or Bot Message Bubble
    function appendMessage(text, sender, sources = []) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");
        
        if (sender === "user") {
            messageDiv.classList.add("user-msg");
            messageDiv.innerHTML = `
                <div class="user-avatar-inner">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="message-bubble">
                    <p>${escapeHTML(text)}</p>
                </div>
            `;
        } else if (sender === "bot") {
            messageDiv.classList.add("bot-msg");
            
            // Basic formatting for Bot text (Markdown bold and newlines)
            let formattedText = formatBotResponse(text);
            
            let sourcesHTML = "";
            if (sources && sources.length > 0) {
                sourcesHTML = `
                    <div class="message-sources-summary">
                        ${sources.map((src, i) => {
                            const scorePct = Math.round(src.score * 100);
                            const scoreClass = src.score >= 0.6 ? "score-high" : "score-med";
                            return `
                                <span class="source-tag" onclick="highlightInspectorCard(${i})">
                                    <i class="fa-solid fa-file-lines"></i> Chunk #${i+1}
                                    <span class="score-badge ${scoreClass}">${scorePct}% match</span>
                                </span>
                            `;
                        }).join("")}
                        <span class="view-sources-trigger" onclick="openInspectorPanel()">
                            Details <i class="fa-solid fa-chevron-right"></i>
                        </span>
                    </div>
                `;
            }

            messageDiv.innerHTML = `
                <div class="bot-avatar-inner">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="message-bubble">
                    ${formattedText}
                    ${sourcesHTML}
                </div>
            `;
        } else {
            // System / Error message
            messageDiv.classList.add("system-msg");
            messageDiv.innerHTML = `
                <div class="bot-avatar-inner" style="background: var(--error);">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <div class="message-bubble" style="border-color: var(--error); background: rgba(239, 68, 68, 0.05);">
                    <p>${escapeHTML(text)}</p>
                </div>
            `;
        }

        chatContainer.appendChild(messageDiv);
    }

    // Helper: Create and Append Typing Indicator
    function appendTypingIndicator() {
        const typingDiv = document.createElement("div");
        typingDiv.classList.add("message", "bot-msg");
        typingDiv.id = "typing-indicator";
        
        typingDiv.innerHTML = `
            <div class="bot-avatar-inner">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-bubble typing-indicator-container">
                <div class="typing-status">Searching FAISS & generating answer...</div>
                <div class="typing-bubbles">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(typingDiv);
        return typingDiv;
    }

    // Helper: Update FAISS Index Inspector Panel
    function updateInspector(sources, query) {
        lastRetrievedSources = sources;
        
        if (!sources || sources.length === 0) {
            inspectorContent.innerHTML = `
                <div class="empty-inspector-state">
                    <div class="state-icon" style="color: var(--warning); border-color: var(--warning);">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <h3>No Sources Retrieved</h3>
                    <p>The vector search returned matches below the similarity relevance threshold (0.30) for query: "<em>${escapeHTML(query)}</em>".</p>
                    <p>The system defaulted directly to the official fallback route referring to sece.ac.in.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="margin-bottom: 0.5rem;">
                <p style="font-size: 0.75rem; color: var(--text-muted);">QUERY SUBMITTED</p>
                <p style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-top: 0.2rem; background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 0.4rem; border: 1px solid var(--border-color);">"${escapeHTML(query)}"</p>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; margin-top: 0.5rem;">
                Top 4 FAISS Matches (Cosine Similarity)
            </div>
        `;

        sources.forEach((src, idx) => {
            const scorePct = Math.round(src.score * 100);
            const scoreVal = src.score.toFixed(4);
            const scoreClass = src.score >= 0.6 ? "score-high" : "score-med";
            
            html += `
                <div class="inspector-card" id="inspector-card-${idx}">
                    <div class="card-metadata">
                        <span class="source-rank">MATCH #${idx + 1}</span>
                        <div class="source-score-container">
                            <span class="source-score-label">Cosine Score:</span>
                            <span class="score-badge-large ${scoreClass}">${scoreVal} (${scorePct}%)</span>
                        </div>
                    </div>
                    <div class="card-text">${escapeHTML(src.text)}</div>
                </div>
            `;
        });

        inspectorContent.innerHTML = html;
    }

    // Helper: Scroll Message Container to Bottom
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Helper: Basic HTML escaping to prevent XSS
    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Helper: Format Bot Response with Basic Markdown
    function formatBotResponse(text) {
        let escaped = escapeHTML(text);
        
        // Convert double asterisks (**text**) to bold (<strong>text</strong>)
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        
        // Convert single asterisks (* text) or dashes (- text) to bullet lists if they appear at start of line
        // But since we are doing escapeHTML, newlines are preserved. Let's convert newlines to <br> or list elements
        const lines = escaped.split("\n");
        let processedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
                return `<li>${trimmed.substring(2)}</li>`;
            }
            return line;
        });

        // Group <li> elements together into <ul>
        let finalHTML = "";
        let inList = false;
        
        for (let i = 0; i < processedLines.length; i++) {
            const line = processedLines[i];
            if (line.startsWith("<li>")) {
                if (!inList) {
                    finalHTML += "<ul>";
                    inList = true;
                }
                finalHTML += line;
            } else {
                if (inList) {
                    finalHTML += "</ul>";
                    inList = false;
                }
                finalHTML += (line === "" ? "<br>" : `<p>${line}</p>`);
            }
        }
        if (inList) {
            finalHTML += "</ul>";
        }
        
        return finalHTML;
    }

    // Expose functions globally for inline HTML event binding
    window.openInspectorPanel = () => {
        inspectorPanel.classList.add("open");
    };

    window.highlightInspectorCard = (idx) => {
        // Open the panel
        window.openInspectorPanel();
        
        // Highlight the card with a brief flash animation
        setTimeout(() => {
            const card = document.getElementById(`inspector-card-${idx}`);
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.style.borderColor = "var(--accent-secondary)";
                card.style.boxShadow = "var(--glow-shadow)";
                card.style.background = "rgba(139, 92, 246, 0.1)";
                
                // Reset after 2 seconds
                setTimeout(() => {
                    card.style.borderColor = "";
                    card.style.boxShadow = "";
                    card.style.background = "";
                }, 2000);
            }
        }, 150);
    };
});
