"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Bot, 
  User, 
  BookOpen, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  BarChart3,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { sendChatMessage, checkBackendHealth, ChatResponse, SourceItem } from "../lib/api";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
  retrievalScores?: number[];
  sources?: SourceItem[];
}

const SUGGESTED_QUESTIONS = [
  "What is the TNEA code of SECE?",
  "Tell me about placements.",
  "What departments are available?",
  "What facilities are available?",
  "Tell me about international internships?"
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check backend health on mount
  useEffect(() => {
    verifyStatus();
    // Pre-populate with a friendly welcome message
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Hello! I am your official **SECE Information Assistant**. Ask me anything about Sri Eshwar College of Engineering, Coimbatore—such as details on admissions, placements, departments, curriculum, or facilities.",
        timestamp: new Date()
      }
    ]);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const verifyStatus = async () => {
    setBackendStatus("checking");
    try {
      const health = await checkBackendHealth();
      if (health.status === "healthy") {
        setBackendStatus("online");
      } else {
        setBackendStatus("offline");
      }
    } catch (error) {
      console.error("Health check error:", error);
      setBackendStatus("offline");
    }
  };

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const result: ChatResponse = await sendChatMessage(text);
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: result.answer,
        timestamp: new Date(),
        retrievalScores: result.retrieval_scores,
        sources: result.sources
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        text: "The server is warming up or temporarily unavailable. Please wait 30 seconds and try again.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear this chat?")) {
      setMessages([
        {
          id: "welcome",
          sender: "assistant",
          text: "Chat cleared. Ask me anything about Sri Eshwar College of Engineering!",
          timestamp: new Date()
        }
      ]);
    }
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  // Renders message text: detects **bold** and https:// URLs and makes them interactive
  const renderMessageText = (text: string) => {
    // Split on bold markers and URLs
    const parts = text.split(/(\*\*.*?\*\*|https?:\/\/[^\s)]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-cyan underline hover:text-white transition-colors duration-150 inline-flex items-center gap-0.5"
          >
            {part}<ExternalLink className="w-3 h-3 inline ml-0.5" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-screen bg-brand-dark overflow-hidden font-sans">
      
      {/* Sidebar - Branding & Controls */}
      <aside className="w-full lg:w-80 bg-gradient-to-b from-brand-navy/90 to-brand-dark border-b lg:border-b-0 lg:border-r border-brand-border backdrop-blur-md p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-orange flex items-center justify-center shadow-orange-glow shrink-0">
              <Bot className="w-6 h-6 text-brand-dark" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-brand-cyan to-white bg-clip-text text-transparent leading-none">
                SECE AI Assistant
              </h1>
              <p className="text-xs text-gray-400 mt-1">v1.0 (Sentence Transformers + Groq)</p>
            </div>
          </div>
          
          <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-3 rounded-lg border border-brand-border">
            Ask questions about Sri Eshwar College of Engineering, Coimbatore. Explore admissions, curriculum, placements, and campus life.
          </p>

          {/* Status Indicator */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-brand-border text-xs">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-brand-cyan shrink-0" /> Backend Status:
            </span>
            <div className="flex items-center gap-1.5">
              {backendStatus === "checking" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-yellow-500">Checking...</span>
                </>
              )}
              {backendStatus === "online" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400">FAISS Online</span>
                </>
              )}
              {backendStatus === "offline" && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-400">Offline</span>
                  <button 
                    onClick={verifyStatus}
                    className="p-1 hover:bg-white/10 rounded transition text-gray-400 hover:text-white"
                    title="Retry Health Check"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Suggested Questions Grid */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-brand-cyan uppercase tracking-wider flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Suggested Questions
            </span>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => !isLoading && handleSend(q)}
                  disabled={isLoading}
                  className="text-left text-xs bg-white/5 hover:bg-white/10 active:bg-brand-cyan/20 border border-brand-border hover:border-brand-cyan/50 p-2.5 rounded-lg text-gray-300 hover:text-white transition duration-200 shadow-sm grow lg:grow-0"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="mt-6 lg:mt-0 pt-4 border-t border-brand-border flex items-center justify-between">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 rounded-lg border border-transparent hover:border-red-900/50 transition duration-200"
          >
            <Trash2 className="w-4 h-4" /> Clear Conversation
          </button>
          <span className="text-[10px] text-gray-500">TNEA Code: 2739</span>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full bg-gradient-to-tr from-brand-dark via-brand-dark to-brand-navy/30 relative">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-cyan/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-orange/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 max-w-4xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-md ${
                  msg.sender === "user"
                    ? "bg-gradient-to-br from-brand-cyan to-brand-blue border border-brand-cyan/30 text-brand-dark"
                    : "bg-white/5 border border-brand-border text-brand-cyan"
                }`}
              >
                {msg.sender === "user" ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              {/* Message Content & Panel */}
              <div className="space-y-2 max-w-[85%]">
                <div
                  className={`p-4 rounded-2xl shadow-glass border transition duration-200 relative group ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-brand-blue/60 to-brand-navy/80 border-brand-cyan/20 text-gray-100"
                      : "bg-brand-card border-brand-border text-gray-200 backdrop-blur-md"
                  }`}
                >
                  {/* Floating Action Bar (Copy Button) */}
                  {msg.sender === "assistant" && msg.id !== "welcome" && (
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="p-1.5 bg-brand-navy border border-brand-border rounded-md hover:bg-white/10 transition text-gray-400 hover:text-white"
                        title="Copy Response"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Body Text */}
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {renderMessageText(msg.text)}
                  </p>

                  {/* Message Timestamp */}
                  <span className="text-[10px] text-gray-500 block mt-2 text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Citations / Search Inspector Panel */}
                {msg.sender === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="bg-white/5 border border-brand-border rounded-xl p-3 backdrop-blur-sm space-y-2 shadow-sm">
                    <button
                      onClick={() => toggleSources(msg.id)}
                      className="flex items-center justify-between w-full text-left text-xs font-semibold text-brand-cyan/80 hover:text-brand-cyan transition duration-150"
                    >
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5" /> 
                        Inspect Vector Retrieval ({msg.sources.length} matches)
                      </span>
                      {expandedSources[msg.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {expandedSources[msg.id] && (
                      <div className="pt-2 border-t border-brand-border/50 space-y-3 animate-fadeIn">
                        {/* Retrieval scores summary */}
                        <div className="flex gap-2 items-center flex-wrap pb-1 border-b border-brand-border/20">
                          <span className="text-[10px] text-gray-400 uppercase">Cosine Similarity:</span>
                          {msg.retrievalScores?.map((score, i) => (
                            <span 
                              key={i} 
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                score >= 0.6 ? "bg-green-950/80 border border-green-800/50 text-green-400" :
                                score >= 0.4 ? "bg-yellow-950/80 border border-yellow-800/50 text-yellow-400" :
                                "bg-red-950/80 border border-red-800/50 text-red-400"
                              }`}
                            >
                              Rank {i+1}: {score.toFixed(4)}
                            </span>
                          ))}
                        </div>

                        {/* List of text chunks and sources */}
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {msg.sources.map((src, i) => (
                            <div key={src.chunk_id} className="bg-white/5 border border-brand-border rounded-lg p-2.5 text-xs space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400">
                                <span className="flex items-center gap-1 text-brand-orange">
                                  <BookOpen className="w-3 h-3" />
                                  [{src.category}] Chunk {i+1}
                                </span>
                                <a 
                                  href={src.source}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-0.5 text-brand-cyan hover:underline hover:text-white transition duration-150"
                                >
                                  {src.source.replace("https://", "")} <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                              <p className="text-gray-300 italic font-light leading-relaxed pl-1 border-l-2 border-brand-border">
                                &ldquo;{src.text}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-4 mr-auto max-w-xl">
              <div className="w-9 h-9 rounded-lg bg-white/5 border border-brand-border text-brand-cyan flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div className="p-4 bg-brand-card border border-brand-border rounded-2xl shadow-glass flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-cyan animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-brand-cyan animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-brand-cyan animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Area */}
        <div className="p-6 border-t border-brand-border bg-brand-navy/40 backdrop-blur-md z-10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="flex gap-2 max-w-4xl mx-auto bg-white/5 border border-brand-border hover:border-brand-border*2 focus-within:border-brand-cyan/50 p-1.5 rounded-xl transition duration-200"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Ask anything about SECE..."
              className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-brand-cyan*1.1 hover:to-brand-blue*1.1 text-brand-dark hover:text-white rounded-lg transition duration-200 font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:hover:text-brand-dark disabled:bg-none disabled:bg-gray-600 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </form>
          <div className="text-[10px] text-gray-500 text-center mt-2">
            AI Assistant is strictly bounded by official Sri Eshwar College of Engineering source materials.
          </div>
        </div>
      </main>
    </div>
  );
}
