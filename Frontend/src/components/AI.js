import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Menu, X, Send, Square, Volume2, Save, Trash, Mic, ChevronDown, Code } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { API_BASE_URL } from "../config/api";
import { useTheme } from "../context/ThemeContext";

const AI_SERVICE_URL =
  process.env.REACT_APP_AI_SERVICE_URL || "https://ai.bitecodes.com/api/generate";
const AI_TIMEOUT_MS = 20000;

const SUGGESTED_PROMPTS = [
  "Explain big-O notation with a real example",
  "Write a SQL query that joins orders with customers",
  "Quiz me on operating system deadlocks",
];

// Simplified language detection - uses first line as language identifier
const detectLanguage = (firstLine) => {
  if (!firstLine) return 'text';
  const lang = firstLine.trim().toLowerCase();
  return lang || 'text';
};

// Text-to-speech function
const speakText = (text, onStart, onEnd) => {
  if (!window.speechSynthesis) return false;
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/```[\s\S]*?```/g, "Code block omitted for speech.").replace(/[^\w\s.,?!;:'"()\-\u0080-\uFFFF]/g, "");
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  utterance.onerror = (event) => {
    console.error("Speech error:", event);
    if (onEnd) onEnd();
  };
  window.speechSynthesis.speak(utterance);
  return true;
};

const themes = {
  dark: {
    card: "bg-gray-900 shadow-lg ring-1 ring-white/10",
    header: "bg-gray-900 border-gray-800",
    chat: "bg-gray-950",
    input: "bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-400",
    codeBg: "bg-gray-800",
    button: "bg-gray-800 text-gray-200 hover:bg-gray-700",
    sidebar: "bg-gray-900 ring-1 ring-white/10 text-gray-100",
    sidebarHover: "hover:bg-gray-800",
    bubble: "bg-gray-800 text-gray-100",
  },
  light: {
    card: "bg-white shadow-lg ring-1 ring-black/5",
    header: "bg-white border-gray-200",
    chat: "bg-gray-50",
    input: "bg-white border border-gray-200 text-gray-900 placeholder-gray-500",
    codeBg: "bg-gray-100",
    button: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    sidebar: "bg-white ring-1 ring-black/5 text-gray-900",
    sidebarHover: "hover:bg-gray-100",
    bubble: "bg-white text-gray-800 ring-1 ring-gray-200",
  },
};

const LearnWithoutLimitsAI = () => {
  const { resolvedTheme } = useTheme();
  const [theme, setTheme] = useState(resolvedTheme);
  const [showSidebar, setShowSidebar] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [streamingState, setStreamingState] = useState({
    tempText: "",
    currentCodeBlock: "",
    codeLanguage: "",
    isInCodeBlock: false,
  });
  const [showCodeSections, setShowCodeSections] = useState({});
  const [channels, setChannels] = useState(null);

  const chatContainerRef = useRef(null);
  const controllerRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const localStorageKey = "LearnWithoutLimitsChat";
  const historyStorageKey = "LearnWithoutLimitsHistory";

  // Extract code blocks from text (simplified version)
  const extractCodeFromText = (text) => {
    if (!text) return { code: null, text: "" };
    
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const codeBlocks = [];
    let lastIndex = 0;
    let match;
    let remainingText = "";
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const fullBlock = match[1].trim();
      const firstNewLine = fullBlock.indexOf('\n');
      const languageLine = firstNewLine > 0 ? fullBlock.substring(0, firstNewLine) : '';
      const codeContent = firstNewLine > 0 ? fullBlock.substring(firstNewLine + 1) : fullBlock;
      
      codeBlocks.push({
        language: detectLanguage(languageLine),
        code: codeContent,
      });
      remainingText += text.slice(lastIndex, match.index);
      lastIndex = codeBlockRegex.lastIndex;
    }
    remainingText += text.slice(lastIndex);
    
    return {
      code: codeBlocks.length ? codeBlocks : null,
      text: remainingText.trim() || text,
    };
  };

  // Save message to localStorage whenever chatMessages changes
  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Load saved chat from localStorage on initial render
  useEffect(() => {
    const savedChat = localStorage.getItem(localStorageKey);
    if (savedChat) {
      try {
        const parsedChat = JSON.parse(savedChat);
        setChatMessages(parsedChat);
      } catch (e) {
        console.error("Error loading chat:", e);
      }
    }
  }, []);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    const node = chatContainerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chatMessages, loading]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      window.speechSynthesis?.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Single source of truth: this page follows the app-wide theme.
  useEffect(() => {
    setTheme(resolvedTheme);
  }, [resolvedTheme]);

  const appendMessage = useCallback((text, className, code = null, isTyping = false) => {
    const newMessage = {
      id: Date.now(),
      text,
      className,
      code,
      timestamp: new Date().toISOString(),
      isTyping,
    };

    setChatMessages(prev => [...prev.slice(-150), newMessage]);
    setShowCodeSections(prev => ({ ...prev, [newMessage.id]: !!code?.length }));
  }, []);

  const updateLastMessage = useCallback((text, code = null, isTyping = false) => {
    setChatMessages(prev => {
      if (!prev.length) return prev;
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      const updatedMessage = {
        ...lastMessage,
        text,
        code,
        timestamp: new Date().toISOString(),
        isTyping,
      };
      updated[updated.length - 1] = updatedMessage;
      return updated;
    });
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast("📋 Copied!"))
      .catch(() => showToast("❌ Copy failed"));
  };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-indigo-600 text-white shadow-lg`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  // Load messaging channel links (Telegram / WhatsApp) when the server has them configured
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/assistant/channels`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setChannels(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Deterministic fallback used whenever the external AI service is unavailable
  const askOfflineAssistant = async (text) => {
    const response = await fetch(`${API_BASE_URL}/api/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    if (!response.ok) throw new Error(`Assistant responded with ${response.status}`);
    const data = await response.json();
    if (!data?.reply) throw new Error("Empty assistant reply");
    return `Offline study assistant (AI service unavailable)\n\n${data.reply}`;
  };

  // overrideText lets the suggested prompts send without waiting for the textarea
  // state to flush; a click event must never be treated as the message.
  const generate = async (overrideText) => {
    const text = (typeof overrideText === "string" ? overrideText : message).trim();
    if (!text) return;
    const userMessage = text;
    setMessage("");
    setLoading(true);
    appendMessage(userMessage, "user-message");
    const controller = new AbortController();
    controllerRef.current = controller;
    let timedOut = false;
    let placeholderAdded = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AI_TIMEOUT_MS);
    setStreamingState({
      tempText: "",
      currentCodeBlock: "",
      codeLanguage: "",
      isInCodeBlock: false,
    });

    try {
      const response = await fetch(AI_SERVICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "stable-code:3b", prompt: userMessage, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to fetch response");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      appendMessage("", "ai-message", null, true);
      placeholderAdded = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        chunk.split("\n").forEach((line) => {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.replace("data: ", "").trim());
              if (json?.response) {
                const text = json.response;
                setStreamingState(prev => {
                  let { tempText, currentCodeBlock, codeLanguage, isInCodeBlock } = prev;
                
                  if (text.includes("```")) {
                    const parts = text.split("```");
                    
                    if (isInCodeBlock) {
                      // Closing code block
                      const finalCode = currentCodeBlock + parts[0];
                      const { code, text: remainingText } = extractCodeFromText(
                        `\`\`\`${codeLanguage}\n${finalCode}\n\`\`\``
                      );
                      
                      updateLastMessage(
                        tempText + remainingText,
                        code,
                        true
                      );
                      
                      return {
                        tempText: tempText + remainingText + (parts.length > 1 ? parts.slice(1).join("```") : ""),
                        currentCodeBlock: "",
                        codeLanguage: "",
                        isInCodeBlock: false,
                      };
                    } else {
                      // Opening code block
                      const beforeCode = parts[0];
                      const afterTicks = parts[1] || "";
                      
                      // First line is language, rest is code
                      const langMatch = afterTicks.match(/^([^\n]*)\n?/);
                      const detectedLanguage = langMatch ? langMatch[1] : 'text';
                      const codeContent = langMatch ? afterTicks.slice(langMatch[0].length) : afterTicks;
                      
                      updateLastMessage(
                        tempText + beforeCode,
                        null,
                        true
                      );
                      
                      return {
                        tempText: tempText + beforeCode,
                        currentCodeBlock: codeContent,
                        codeLanguage: detectedLanguage,
                        isInCodeBlock: true,
                      };
                    }
                  } else if (isInCodeBlock) {
                    // Inside code block - just accumulate
                    updateLastMessage(
                      tempText,
                      [{
                        language: codeLanguage,
                        code: currentCodeBlock + text,
                      }],
                      true
                    );
                    return {
                      ...prev,
                      currentCodeBlock: currentCodeBlock + text,
                    };
                  } else {
                    // Regular text
                    updateLastMessage(
                      tempText + text,
                      null,
                      true
                    );
                    return {
                      ...prev,
                      tempText: tempText + text,
                    };
                  }
                });
              }
            } catch (e) {
              console.error("JSON parse error:", e);
            }
          }
        });
      }
    } catch (error) {
      console.error("Generate error:", error);
      if (error.name === "AbortError" && !timedOut) {
        if (placeholderAdded) {
          const { code, text } = extractCodeFromText(
            streamingState.tempText +
              (streamingState.isInCodeBlock ? `\`\`\`${streamingState.codeLanguage}\n${streamingState.currentCodeBlock}\n\`\`\`` : "")
          );
          updateLastMessage(text || "Generation stopped.", code, false);
        }
      } else {
        try {
          const reply = await askOfflineAssistant(userMessage);
          if (placeholderAdded) {
            updateLastMessage(reply, null, false);
          } else {
            appendMessage(reply, "ai-message");
          }
          showToast("AI offline: answered by the built-in assistant");
        } catch (fallbackError) {
          console.error("Offline assistant error:", fallbackError);
          const failure =
            "The AI service is unavailable and the built-in assistant could not be reached. " +
            "Please check your connection and try again.";
          if (placeholderAdded) {
            updateLastMessage(failure, null, false);
          } else {
            appendMessage(failure, "ai-message");
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      controllerRef.current = null;
      setStreamingState({
        tempText: "",
        currentCodeBlock: "",
        codeLanguage: "",
        isInCodeBlock: false,
      });
    }
  };

  const stopGeneration = () => {
    if (controllerRef.current) {
      const finalContent = streamingState.tempText + 
        (streamingState.isInCodeBlock ? 
          `\`\`\`${streamingState.codeLanguage}\n${streamingState.currentCodeBlock}\n\`\`\`` : 
          "");
      
      const { code, text } = extractCodeFromText(finalContent);
      updateLastMessage(text, code, false);
      
      controllerRef.current.abort();
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      loading ? stopGeneration() : generate();
    }
  };

  const speakMessage = (text) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const success = speakText(
      text,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
    if (!success) showToast("❌ Speech failed");
  };

  const saveConversation = () => {
    const item = {
      id: Date.now(),
      title: message.slice(0, 50) || chatMessages[chatMessages.length - 1]?.text.slice(0, 50) || "Chat",
      messages: chatMessages,
      timestamp: new Date().toISOString(),
    };
    setConversationHistory(prev => {
      const updated = [...prev, item];
      localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      return updated;
    });
    showToast("💾 Saved!");
  };

  const loadConversation = (item) => {
    setChatMessages(item.messages);
    const initialCodeSections = {};
    item.messages.forEach(msg => {
      initialCodeSections[msg.id] = !!msg.code?.length;
    });
    setShowCodeSections(initialCodeSections);
    setShowSidebar(false);
    showToast("📂 Loaded!");
  };

  const deleteConversation = (id) => {
    setConversationHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      return updated;
    });
    showToast("🗑️ Deleted!");
  };

  const startVoiceInput = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      showToast("❌ Speech recognition not supported");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = "en-US";
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (event) =>
      setMessage(Array.from(event.results).map(result => result[0].transcript).join(""));
    recognitionRef.current.onend = () => setIsRecording(false);
    recognitionRef.current.onerror = (event) => {
      console.error("Speech error:", event);
      showToast("❌ Speech failed");
      setIsRecording(false);
    };
    recognitionRef.current.start();
    setIsRecording(true);
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleCodeSection = (messageId) => {
    setShowCodeSections(prev => {
      const newState = {
        ...prev,
        [messageId]: !prev[messageId]
      };
      localStorage.setItem("CodeSectionStates", JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="chat-viewport transition-colors duration-500 sm:p-4"
    >
      <div className="mx-auto flex h-full w-full max-w-screen-xl justify-center">
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              key="chat-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            />
          )}
          {showSidebar && (
            <motion.aside
              key="chat-drawer"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              aria-label="Saved conversations"
              className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto p-4 sm:static sm:z-auto sm:h-full sm:w-64 sm:max-w-none sm:rounded-2xl sm:mr-4 ${themes[theme].sidebar}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">History</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSidebar(false)}
                  aria-label="Close history"
                  className={`p-2 rounded-full ${themes[theme].button}`}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="mb-6">
                {conversationHistory.length === 0 && (
                  <p className="text-sm opacity-70">
                    Nothing saved yet. Use Save Chat in the composer to keep a conversation here.
                  </p>
                )}
                {conversationHistory.map((item) => (
                  <div key={item.id} className="flex justify-between items-center mb-2">
                    <button
                      type="button"
                      className={`text-left cursor-pointer ${themes[theme].sidebarHover} rounded px-3 py-3 min-h-[44px] text-sm truncate`}
                      onClick={() => loadConversation(item)}
                    >
                      {item.title} ({new Date(item.timestamp).toLocaleDateString()})
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => deleteConversation(item.id)}
                      aria-label={`Delete ${item.title}`}
                      className="p-1 rounded-full bg-red-600 text-white"
                    >
                      <Trash className="w-4 h-4" />
                    </motion.button>
                  </div>
                ))}
              </div>
              {(channels?.telegram?.url || channels?.whatsapp?.url) && (
                <div className="mt-8 border-t border-current/10 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider opacity-60">
                    Or ask a human
                  </p>
                  <div className="flex flex-col gap-2">
                    {channels?.telegram?.url && (
                      <a
                        href={channels.telegram.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-h-[44px] rounded-lg px-3 py-2 text-sm ${themes[theme].button} ${themes[theme].sidebarHover}`}
                      >
                        Telegram
                      </a>
                    )}
                    {channels?.whatsapp?.url && (
                      <a
                        href={channels.whatsapp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`min-h-[44px] rounded-lg px-3 py-2 text-sm ${themes[theme].button} ${themes[theme].sidebarHover}`}
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`flex h-full w-full flex-col overflow-hidden shadow-2xl sm:max-w-4xl sm:rounded-3xl ${themes[theme].card}`}
        >
          <header className={`flex shrink-0 items-center justify-between gap-2 border-b p-3 sm:p-5 ${themes[theme].header}`}>
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSidebar(!showSidebar)}
                aria-expanded={showSidebar}
                aria-label={showSidebar ? "Hide history" : "Show history"}
                className={`flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full ${themes[theme].button}`}
              >
                <Menu className="w-5 h-5" />
              </motion.button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-base font-bold text-white sm:h-10 sm:w-10 sm:text-lg">
                🤖
              </div>
              <h1 className="truncate text-base font-bold text-gray-900 sm:text-2xl dark:text-white">
                Learn Without Limits AI
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {channels?.telegram?.url && (
                <a
                  href={channels.telegram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`min-h-[44px] px-3 py-1 rounded-full text-sm ${themes[theme].button} ${themes[theme].sidebarHover}`}
                >
                  Telegram
                </a>
              )}
              {channels?.whatsapp?.url && (
                <a
                  href={channels.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`min-h-[44px] px-3 py-1 rounded-full text-sm ${themes[theme].button} ${themes[theme].sidebarHover}`}
                >
                  WhatsApp
                </a>
              )}
            </div>
          </header>

            <div ref={chatContainerRef} className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 ${themes[theme].chat}`}>
              {chatMessages.length === 0 && !loading && (
                <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                  <div className="max-w-md">
                    <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
                      Ask anything about what you are learning
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 sm:text-base dark:text-gray-400">
                      Explanations, code and practice questions. If the AI service is down, the
                      built-in study assistant answers instead.
                    </p>
                  </div>
                  <div className="flex w-full max-w-md flex-col gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => generate(prompt)}
                        className={`min-h-[44px] touch-manipulation rounded-2xl px-4 py-3 text-left text-sm transition-colors ${themes[theme].bubble} ${themes[theme].sidebarHover}`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <AnimatePresence>
                {chatMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mb-4 flex ${msg.className === "user-message" ? "justify-end" : "justify-start"} items-end max-w-[80%] ${msg.className === "user-message" ? "ml-auto" : "mr-auto"}`}
                  >
                    {msg.className === "ai-message" && (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold mr-3 shrink-0">
                        AI
                      </div>
                    )}
                    <div className="flex flex-col max-w-full">
                      {msg.text && (
                        <div
                          className={`p-4 rounded-2xl ${
                            msg.className === "user-message"
                              ? "bg-indigo-600 text-white shadow-md"
                              : themes[theme].bubble
                          } text-left text-base whitespace-pre-wrap ${msg.isTyping ? "animate-pulse" : ""}`}
                        >
                          {msg.text}
                          {msg.className === "ai-message" && (
                            <div className="mt-2 flex space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => speakMessage(msg.text)}
                                aria-label="Read message aloud"
                                className="p-1 text-xs opacity-70 hover:opacity-100"
                              >
                                <Volume2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          )}
                        </div>
                      )}
                      {msg.code && msg.code.length > 0 && (
                        <div className="mt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleCodeSection(msg.id)}
                            className={`flex items-center p-2 rounded-md ${themes[theme].button} w-full justify-between`}
                          >
                            <div className="flex items-center">
                              <Code className="w-4 h-4 mr-2" />
                              <span>{showCodeSections[msg.id] ? "Hide Code" : "Show Code"}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {msg.code[0].language}
                            </span>
                          </motion.button>
                          
                          <AnimatePresence>
                            {showCodeSections[msg.id] && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`mt-2 p-3 rounded-xl ${themes[theme].codeBg} max-h-[500px] overflow-y-auto`}
                              >
                                {msg.code.map(({ language, code }, i) => (
                                  <div key={i} className="relative mb-4 last:mb-0">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-bold text-sm">
                                        {language.toUpperCase()}
                                      </span>
                                      <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => copyToClipboard(code)}
                                        aria-label="Copy code"
                                        className={`p-1 rounded-md ${themes[theme].button} transition-all`}
                                      >
                                        <Copy className="w-4 h-4" />
                                      </motion.button>
                                    </div>
                                    <SyntaxHighlighter
                                      language={language.toLowerCase()}
                                      style={theme === "dark" ? oneDark : oneLight}
                                      customStyle={{ 
                                        fontSize: "0.875rem",
                                        margin: 0,
                                        padding: "1rem",
                                        background: 'transparent'
                                      }}
                                      showLineNumbers
                                    >
                                      {code}
                                    </SyntaxHighlighter>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                    {msg.className === "user-message" && (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ml-3 shrink-0 ${themes[theme].button}`}>
                        You
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && chatMessages.length && !chatMessages[chatMessages.length - 1].isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center items-center py-4"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500 animate-pulse"></div>
                </motion.div>
              )}
            </div>

            <div className={`shrink-0 border-t p-3 sm:p-5 ${themes[theme].header} transition-colors duration-300`}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ask me anything..."
                  aria-label="Message the AI assistant"
                  className={`min-h-[44px] flex-1 resize-none rounded-2xl px-4 py-3 text-base shadow-inner transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${themes[theme].input}`}
                  style={{ maxHeight: "150px" }}
                ></textarea>

                {/* Mic or Recording */}
                {isRecording ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={stopVoiceInput}
                    aria-label="Stop voice input"
                    className="h-11 w-11 shrink-0 rounded-full bg-red-600 text-white shadow-md flex items-center justify-center"
                  >
                    <div className="flex space-x-1 items-center h-5">
                      {[0, 100, 200].map((delay, i) => (
                        <div
                          key={i}
                          className="recording-wave bg-white w-1 h-3 sm:h-5 rounded-full animate-pulse"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={startVoiceInput}
                    aria-label="Start voice input"
                    className={`h-11 w-11 shrink-0 rounded-full ${themes[theme].button} shadow-md flex items-center justify-center`}
                  >
                    <Mic className="w-5 h-5" />
                  </motion.button>
                )}

                <div className="relative shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowActions(!showActions)}
                    aria-expanded={showActions}
                    aria-haspopup="true"
                    aria-label="More chat actions"
                    className={`h-11 w-11 flex items-center justify-center rounded-full ${themes[theme].button} shadow-md`}
                  >
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${showActions ? "rotate-180" : ""}`} />
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showActions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`absolute bottom-full right-0 mb-2 p-2 rounded-xl ${themes[theme].sidebar} shadow-lg z-10 w-44`}
                      >
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={saveConversation}
                          className={`p-2 flex items-center justify-start ${themes[theme].button} rounded-md w-full mb-2`}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          <span className="text-sm">Save Chat</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            localStorage.removeItem(localStorageKey);
                            setChatMessages([]);
                            setShowCodeSections({});
                            showToast("🧹 Cleared chat!");
                          }}
                          className="p-2 flex items-center justify-start bg-red-600 text-white rounded-md w-full"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          <span className="text-sm">Clear Chat</span>
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Send / Stop Generation */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => (loading ? stopGeneration() : generate())}
                  aria-label={loading ? "Stop generating" : "Send message"}
                  className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  {loading ? <Square className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LearnWithoutLimitsAI;
                      