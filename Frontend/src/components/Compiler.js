"use client";
import React, { useCallback, useState, useEffect, useRef } from "react";
import { PlusCircle, X, Play, Copy, Save, Loader2, Code, FileCode, CheckCircle, ExternalLink, BookOpen, Trophy, Users, Star, Menu } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { EditorView } from '@codemirror/view';
import { keymap } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";

// Custom Themes
const draculaTheme = createTheme({
  theme: 'dark',
  settings: {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    caret: '#f5e0dc',
    selection: '#45475a',
    selectionMatch: '#45475a',
    lineHighlight: '#31324450',
    gutterBackground: '#1e1e2e',
    gutterForeground: '#6c7086',
  },
  styles: [
    { tag: t.comment, color: '#6c7086' },
    { tag: t.variableName, color: '#cdd6f4' },
    { tag: [t.string, t.special(t.brace)], color: '#a6e3a1' },
    { tag: t.number, color: '#f9e2af' },
    { tag: t.bool, color: '#f9e2af' },
    { tag: t.null, color: '#f9e2af' },
    { tag: t.keyword, color: '#cba6f7' },
    { tag: t.operator, color: '#cba6f7' },
    { tag: t.className, color: '#89dceb' },
    { tag: t.definition(t.typeName), color: '#89dceb' },
    { tag: t.typeName, color: '#89dceb' },
    { tag: t.angleBracket, color: '#cba6f7' },
    { tag: t.tagName, color: '#cba6f7' },
    { tag: t.attributeName, color: '#f38ba8' },
  ],
});

const githubLightTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#f8fafc',
    foreground: '#24292e',
    caret: '#3b82f6',
    selection: '#dbeafe',
    selectionMatch: '#dbeafe',
    lineHighlight: '#f1f5f9',
    gutterBackground: '#f8fafc',
    gutterForeground: '#6b7280',
    gutterBorder: 'transparent',
  },
  styles: [
    { tag: t.comment, color: '#6b7280', fontStyle: 'italic' },
    { tag: t.variableName, color: '#1f2937' },
    { tag: [t.string, t.special(t.brace)], color: '#15803d' },
    { tag: t.number, color: '#b91c1c' },
    { tag: t.bool, color: '#b91c1c' },
    { tag: t.null, color: '#b91c1c' },
    { tag: t.keyword, color: '#7c3aed' },
    { tag: t.operator, color: '#1f2937' },
    { tag: t.className, color: '#b91c1c' },
    { tag: t.definition(t.typeName), color: '#0369a1' },
    { tag: t.typeName, color: '#0369a1' },
    { tag: t.angleBracket, color: '#6b7280' },
    { tag: t.tagName, color: '#15803d' },
    { tag: t.attributeName, color: '#7c3aed' },
  ],
});

// Boilerplates
const boilerplates = {
  javascript: "console.log('Hello World!');\n",
  python: "print('Hello World!')\n",
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}\n`,
  cpp: `#include <iostream>\n\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}\n`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>`,
  css: `body {\n    margin: 0;\n    padding: 20px;\n}`,
};

// Languages with Extensions
const languages = {
  javascript: { ext: "js", version: "18.15.0", extension: javascript(), label: "JavaScript" },
  python: { ext: "py", version: "3.10.0", extension: python(), label: "Python" },
  java: { ext: "java", version: "15.0.2", extension: java(), label: "Java" },
  cpp: { ext: "cpp", version: "10.2.0", extension: cpp(), label: "C++" },
  c: { ext: "c", version: "10.2.0", extension: cpp(), label: "C" },
  html: { ext: "html", version: "latest", extension: html({ autoCloseTags: true }), label: "HTML" },
  css: { ext: "css", version: "latest", extension: css(), label: "CSS" },
};

// Practice Questions
const practiceQuestions = {
  javascript: [
    { id: 1, title: "Reverse a String", difficulty: "Easy", description: "Write a function that reverses a string without using built-in methods.", tags: ["String", "Algorithm"] },
    { id: 2, title: "Fibonacci Sequence", difficulty: "Medium", description: "Generate the nth Fibonacci number efficiently.", tags: ["Math", "Recursion"] },
    { id: 3, title: "Promise Chain", difficulty: "Hard", description: "Handle a chain of asynchronous operations with promises.", tags: ["Async", "Promises"] },
  ],
  python: [
    { id: 4, title: "List Comprehension", difficulty: "Easy", description: "Create a list of squares using list comprehension.", tags: ["List", "Syntax"] },
    { id: 5, title: "Binary Search", difficulty: "Medium", description: "Implement binary search on a sorted list.", tags: ["Algorithm", "Search"] },
    { id: 6, title: "Decorator Function", difficulty: "Hard", description: "Create a decorator to log function execution time.", tags: ["Functions", "Advanced"] },
  ],
  java: [
    { id: 7, title: "Linked List", difficulty: "Medium", description: "Implement a singly linked list with add and remove methods.", tags: ["Data Structures"] },
    { id: 8, title: "Thread Synchronization", difficulty: "Hard", description: "Create a producer-consumer model using threads.", tags: ["Concurrency"] },
  ],
  cpp: [
    { id: 9, title: "Vector Operations", difficulty: "Easy", description: "Implement basic vector operations like push and pop.", tags: ["STL", "Basics"] },
    { id: 10, title: "Graph BFS", difficulty: "Medium", description: "Implement breadth-first search on a graph.", tags: ["Graph", "Algorithm"] },
  ],
  c: [
    { id: 11, title: "Pointer Arithmetic", difficulty: "Medium", description: "Use pointers to manipulate an array.", tags: ["Pointers", "Memory"] },
  ],
  html: [
    { id: 12, title: "Responsive Navbar", difficulty: "Easy", description: "Create a responsive navigation bar using HTML and CSS.", tags: ["Layout", "CSS"] },
  ],
  css: [
    { id: 13, title: "CSS Grid Layout", difficulty: "Medium", description: "Design a dashboard layout using CSS Grid.", tags: ["Grid", "Design"] },
  ],
};

// Main Component
export default function CodingPlatform() {
  // IDE States
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState([{ name: "main.js", content: boilerplates.javascript, language: "javascript" }]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [fontSize, setFontSize] = useState(14);
  const [savedCodes, setSavedCodes] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const previewIframeRef = useRef(null);

  // Practice Question States
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  // Load Saved Codes
  useEffect(() => {
    const saved = localStorage.getItem("savedCodes");
    if (saved) setSavedCodes(JSON.parse(saved));
  }, []);

  const updatePreview = useCallback(() => {
    if (!previewIframeRef.current) return;
    const currentTab = tabs[activeTab];
    if (currentTab.language === "html") {
      const iframe = previewIframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(currentTab.content);
      doc.close();
    }
  }, [tabs, activeTab]);

  // Update HTML Preview
  useEffect(() => {
    if (previewVisible && tabs[activeTab]?.language === "html") updatePreview();
  }, [previewVisible, tabs, activeTab, updatePreview]);

  // Handle Tab Change
  const handleTabChange = (index) => {
    setActiveTab(index);
    document.querySelector(".cm-editor")?.focus();
    setPreviewVisible(tabs[index]?.language === "html");
  };

  // Add New Tab
  const addNewTab = () => {
    const lang = "javascript";
    const newTab = { name: `file${tabs.length + 1}.${languages[lang].ext}`, content: boilerplates[lang], language: lang };
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  // Close Tab
  const closeTab = (index, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((_, i) => i !== index);
    setTabs(newTabs);
    setActiveTab(Math.min(activeTab, newTabs.length - 1));
  };

  // Change Language
  const changeLanguage = (e) => {
    const newLang = e.target.value;
    if (!languages[newLang]) return;
    const updatedTabs = [...tabs];
    const currentTab = updatedTabs[activeTab];
    const isUsingBoilerplate = Object.values(boilerplates).some(bp => currentTab.content === bp || currentTab.content.trim() === "");
    currentTab.language = newLang;
    currentTab.name = `${currentTab.name.split('.')[0]}.${languages[newLang].ext}`;
    if (isUsingBoilerplate) currentTab.content = boilerplates[newLang] || "";
    setTabs(updatedTabs);
    setPreviewVisible(newLang === "html");
  };

  // Update HTML Preview
  // Execute Code
  const executeCode = async () => {
    setLoading(true);
    setOutput("🚀 Executing code...");
    const currentTab = tabs[activeTab];

    if (currentTab.language === "html") {
      setPreviewVisible(true);
      updatePreview();
      setOutput("HTML preview updated.");
      setLoading(false);
      return;
    }

    // Isolated JavaScript runner (Server Piston sandbox with isolated Web Worker fallback)
    if (currentTab.language === "javascript") {
      try {
        // Try Piston API first (isolated remote container)
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: "javascript",
            version: "18.15.0",
            files: [{ content: currentTab.content }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const out = data.run.output || (data.run.stderr ? `❌ Error: ${data.run.stderr}` : "Code executed successfully (no output).");
          setOutput(out);
          setLoading(false);
          return;
        }
      } catch (networkErr) {
        // Piston unreachable, fallback to strictly isolated Web Worker sandbox
      }

      // Fallback: Isolated Web Worker (no access to window, document, or sessionStorage)
      try {
        const workerScript = `
          self.onmessage = function(e) {
            var logs = [];
            var originalLog = console.log;
            var originalError = console.error;
            console.log = function() {
              var args = Array.prototype.slice.call(arguments);
              logs.push(args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '));
            };
            console.error = function() {
              var args = Array.prototype.slice.call(arguments);
              logs.push("Error: " + args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '));
            };
            try {
              var fn = new Function(e.data);
              var res = fn();
              if (res !== undefined) {
                logs.push("=> " + (typeof res === 'object' ? JSON.stringify(res) : String(res)));
              }
              self.postMessage({ success: true, output: logs.length > 0 ? logs.join("\\n") : "Code executed successfully (no output)." });
            } catch(err) {
              self.postMessage({ success: false, output: "❌ Runtime Error: " + err.message });
            }
          };
        `;
        const blob = new Blob([workerScript], { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        const timeout = setTimeout(() => {
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          setOutput("❌ Execution timed out (3s limit). Infinite loop detected and halted.");
          setLoading(false);
        }, 3000);

        worker.onmessage = (e) => {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          setOutput(e.data.output);
          setLoading(false);
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          setOutput(`❌ Worker Error: ${err.message}`);
          setLoading(false);
        };

        worker.postMessage(currentTab.content);
        return;
      } catch (err) {
        setOutput(`❌ Execution Error: ${err.message}`);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: currentTab.language === "c" ? "c" : currentTab.language,
          version: languages[currentTab.language]?.version || "latest",
          files: [{ content: currentTab.content }],
        }),
      });

      if (response.status === 401) {
        setOutput("⚠️ Notice: The public Piston execution service (emkc.org) is currently whitelist-restricted. To run compiled languages like C++, Java, or Python, please connect a self-hosted Piston or Judge0 instance in settings. JavaScript and HTML can be executed directly.");
      } else if (!response.ok) {
        const errorText = await response.text();
        setOutput(`❌ Execution Service Error (${response.status}): ${errorText || response.statusText}`);
      } else {
        const data = await response.json();
        setOutput(data.run?.output || data.run?.stderr || "No output");
      }
    } catch (error) {
      setOutput(`❌ Execution Error: ${error.message}`);
    }
    setLoading(false);
  };

  // Copy Code
  const copyCode = () => {
    navigator.clipboard.writeText(tabs[activeTab].content);
    showToast("📋 Code copied to clipboard!");
  };

  // Save Code
  const saveCode = () => {
    const currentTab = tabs[activeTab];
    const newSavedCode = { id: Date.now(), name: currentTab.name, language: currentTab.language, content: currentTab.content };
    const updatedSavedCodes = [...savedCodes, newSavedCode];
    setSavedCodes(updatedSavedCodes);
    localStorage.setItem("savedCodes", JSON.stringify(updatedSavedCodes));
    showToast("💾 Code saved successfully!");
  };

  // Load Saved Code
  const loadSavedCode = (code) => {
    setTabs([...tabs, { name: code.name, language: code.language, content: code.content }]);
    setActiveTab(tabs.length);
    showToast("📂 Loaded saved code");
  };

  // Delete Saved Code
  const deleteSavedCode = (id, e) => {
    e.stopPropagation();
    const updatedSavedCodes = savedCodes.filter(code => code.id !== id);
    setSavedCodes(updatedSavedCodes);
    localStorage.setItem("savedCodes", JSON.stringify(updatedSavedCodes));
    showToast("🗑️ Code deleted");
  };

  // Show Toast
  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-lg z-50 transition-transform transform scale-100 opacity-100 animate-bounce`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("scale-0");
      toast.classList.remove("opacity-100");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  // Get Editor Theme
  const getEditorTheme = () => [
    theme === 'dark' ? draculaTheme : githubLightTheme,
    EditorView.theme({
      "&": { fontSize: `${fontSize}px` },
      ".cm-content": { fontSize: `${fontSize}px`, textAlign: "left" },
      ".cm-gutters": { fontSize: `${fontSize}px` },
    }),
  ];

  // Load Practice Question
  const loadPracticeQuestion = (question) => {
    const lang = selectedLanguage;
    setTabs([{ name: `practice.${languages[lang].ext}`, content: `// ${question.title}\n// ${question.description}\n`, language: lang }]);
    setActiveTab(0);
    setIsLeftSidebarOpen(false); // Close sidebar on mobile
    showToast(`📚 Loaded ${question.title}`);
  };

  // Fallback Extension
  const getLanguageExtension = (language) => {
    return languages[language]?.extension || javascript();
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-800 text-gray-100' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 text-gray-900'} transition-colors duration-500 font-sans`}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/20 md:hidden">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
          <Code className="mr-2 h-5 w-5" /> Learn Without Limits
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} className="p-2 rounded-lg hover:bg-indigo-500/20">
            <Menu className="h-5 w-5 text-indigo-400" />
          </button>
          <button onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} className="p-2 rounded-lg hover:bg-indigo-500/20">
            <Users className="h-5 w-5 text-indigo-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Sidebar */}
        <div className={`w-full md:w-80 flex-shrink-0 border-r border-gray-700/20 backdrop-blur-lg ${theme === 'dark' ? 'bg-gray-800/20' : 'bg-gray-50'} flex flex-col transition-all duration-300 ${isLeftSidebarOpen ? 'block' : 'hidden md:block'}`}>
          <div className="p-4 md:p-6 border-b border-gray-700/20 hidden md:block">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
              <Code className="mr-2 h-6 w-6" /> Learn Without Limits
            </h1>
          </div>
          <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">
            {/* Practice Questions */}
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center">
                <BookOpen className="h-4 md:h-5 w-4 md:w-5 mr-2 text-indigo-400" /> Practice Challenges
              </h3>
              <div className="space-y-4">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700/50 text-gray-100' : 'bg-white/50 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-300 touch-manipulation`}
                >
                  {Object.entries(languages).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700/50 text-gray-100' : 'bg-white/50 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-300 touch-manipulation`}
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <div className="space-y-3 max-h-[50vh] md:max-h-96 overflow-y-auto pr-2 overscroll-contain">
                  {(practiceQuestions[selectedLanguage] || [])
                    .filter(q => difficultyFilter === "All" || q.difficulty === difficultyFilter)
                    .map((question) => (
                      <div
                        key={question.id}
                        onClick={() => loadPracticeQuestion(question)}
                        className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/30 hover:bg-gray-600/30' : 'bg-gray-100 hover:bg-gray-200'} cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg border ${theme === 'dark' ? 'border-gray-700/10' : 'border-gray-300'} touch-manipulation`}
                      >
                        <div className={`text-sm font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'}`}>{question.title}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{question.difficulty}</div>
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} truncate mt-1`}>{question.description}</div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {question.tags.map(tag => (
                            <span key={tag} className={`text-xs px-2 py-0.5 ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'} rounded-full`}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            {/* Documentation */}
            <div>
              <h3 className="text-base md:text-lg font-semibold mb-3 flex items-center">
                <ExternalLink className="h-4 md:h-5 w-4 md:w-5 mr-2 text-indigo-400" /> Resources
              </h3>
              <div className="space-y-2 text-sm">
                <a href="https://developer.mozilla.org/" target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg hover:bg-indigo-500/20 transition-all duration-300 hover:text-indigo-300">MDN Web Docs</a>
                <a href="https://docs.python.org/3/" target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg hover:bg-indigo-500/20 transition-all duration-300 hover:text-indigo-300">Python Docs</a>
                <a href="https://docs.oracle.com/en/java/" target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg hover:bg-indigo-500/20 transition-all duration-300 hover:text-indigo-300">Java Docs</a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Workspace (IDE) */}
        <div className="flex-1 p-4 md:p-6 flex flex-col">
          <div className={`rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-lg border border-gray-700/10`}>
            {/* File Tabs */}
            <div className="flex items-center border-b border-gray-700/20 bg-gray-900/20 overflow-x-auto">
              {tabs.map((tab, index) => (
                <div
                  key={index}
                  onClick={() => handleTabChange(index)}
                  className={`group flex items-center px-3 md:px-4 py-2 md:py-3 border-r border-gray-700/20 cursor-pointer transition-all duration-300 flex-shrink-0 ${
                    activeTab === index 
                      ? theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white text-indigo-700' 
                      : theme === 'dark' ? 'bg-gray-800/20 hover:bg-gray-700/20' : 'bg-gray-100/20 hover:bg-gray-50/20'
                  }`}
                >
                  <FileCode className="mr-2 h-3 md:h-4 w-3 md:w-4 text-indigo-400" />
                  <span className="text-xs md:text-sm font-mono">{tab.name}</span>
                  <X
                    onClick={(e) => closeTab(index, e)}
                    className="ml-2 h-3 md:h-4 w-3 md:w-4 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all duration-300"
                  />
                </div>
              ))}
              <button
                onClick={addNewTab}
                className={`px-3 md:px-4 py-2 md:py-3 ${theme === 'dark' ? 'text-gray-400 hover:text-indigo-300' : 'text-gray-600 hover:text-indigo-700'} transition-colors duration-300 flex-shrink-0`}
              >
                <PlusCircle className="h-3 md:h-4 w-3 md:w-4" />
              </button>
            </div>

            {/* Editor Controls */}
            <div className={`flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-3 ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/30'} space-y-2 md:space-y-0`}>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="text-xs md:text-sm font-medium">Language:</label>
                  <select
                    value={tabs[activeTab]?.language || "javascript"}
                    onChange={changeLanguage}
                    className={`w-full md:w-auto px-3 py-1.5 text-xs md:text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700/50 text-gray-100' : 'bg-white/50 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-300 touch-manipulation`}
                  >
                    {Object.entries(languages).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="text-xs md:text-sm font-medium">Theme:</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className={`w-full md:w-auto px-3 py-1.5 text-xs md:text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700/50 text-gray-100' : 'bg-white/50 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-300 touch-manipulation`}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <label className="text-xs md:text-sm font-medium">Font Size:</label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className={`w-full md:w-auto px-3 py-1.5 text-xs md:text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700/50 text-gray-100' : 'bg-white/50 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all duration-300 touch-manipulation`}
                  >
                    {[12, 14, 16, 18, 20].map(size => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={executeCode}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 text-sm shadow-md w-full md:w-auto touch-manipulation"
                >
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />} Run
                </button>
                <button
                  onClick={copyCode}
                  className={`flex items-center px-3 py-2 ${theme === 'dark' ? 'bg-gray-600/50 hover:bg-gray-500/50' : 'bg-gray-200 hover:bg-gray-300'} ${theme === 'dark' ? 'text-white' : 'text-gray-900'} rounded-lg transition-all duration-300 text-sm shadow-md w-full md:w-auto touch-manipulation`}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={saveCode}
                  className={`flex items-center px-3 py-2 ${theme === 'dark' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-400 hover:bg-blue-500'} text-white rounded-lg transition-all duration-300 text-sm shadow-md w-full md:w-auto touch-manipulation`}
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Code Editor */}
            <div className="h-[50vh] sm:h-[60vh] md:h-[400px]">
              <CodeMirror
                value={tabs[activeTab]?.content || ""}
                height="100%"
                extensions={[
                  getLanguageExtension(tabs[activeTab]?.language),
                  keymap.of([
                    { key: "Ctrl-s", run: saveCode, preventDefault: true },
                    { key: "Ctrl-Enter", run: executeCode, preventDefault: true },
                  ]),
                  autocompletion(),
                ]}
                onChange={(value) => {
                  const updatedTabs = [...tabs];
                  updatedTabs[activeTab].content = value;
                  setTabs(updatedTabs);
                  if (previewVisible && updatedTabs[activeTab].language === "html") updatePreview();
                }}
                theme={getEditorTheme()}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  autocompletion: true,
                }}
                className="rounded-b-lg overflow-auto touch-manipulation"
              />
            </div>

            {/* Output Console or Preview */}
            <div className={`border-t ${theme === 'dark' ? 'border-gray-700/20' : 'border-gray-300/20'}`}>
              {previewVisible && tabs[activeTab]?.language === "html" ? (
                <div className="flex-1 flex flex-col">
                  <div className={`p-3 ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/30'} flex justify-between items-center`}>
                    <h3 className="text-xs md:text-sm font-semibold text-indigo-300">HTML Preview</h3>
                    <button
                      onClick={() => setPreviewVisible(false)}
                      className={`text-xs md:text-sm px-3 py-1 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-200/50 hover:bg-gray-300/50'} transition-all duration-300 text-indigo-300 touch-manipulation`}
                    >
                      Hide
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto bg-white">
                    <iframe
                      ref={previewIframeRef}
                      title="HTML Preview"
                      className="w-full h-full border-none"
                      sandbox="allow-scripts"
                    ></iframe>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className={`p-3 ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/30'} flex items-center`}>
                    <h3 className="text-xs md:text-sm font-semibold flex items-center text-indigo-300">
                      <ExternalLink className="h-3 md:h-4 w-3 md:w-4 mr-2 text-indigo-400" /> Output Console
                    </h3>
                  </div>
                  <pre className={`font-mono text-xs md:text-sm ${theme === 'dark' ? 'text-gray-300 bg-gray-850/30' : 'text-gray-700 bg-gray-50'} p-4 overflow-auto flex-1 overscroll-contain`}>
                    {loading ? '⏳ Processing...' : output || "// Output will appear here"}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={`w-full md:w-80 flex-shrink-0 border-l border-gray-700/20 backdrop-blur-lg ${theme === 'dark' ? 'bg-gray-800/20' : 'bg-gray-50'} flex flex-col transition-all duration-300 ${isRightSidebarOpen ? 'block' : 'hidden md:block'}`}>
          <div className="p-4 md:p-6 border-b border-gray-700/20">
            <h3 className={`text-base md:text-lg font-semibold flex items-center ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-900'}`}>
              <Users className="h-4 md:h-5 w-4 md:w-5 mr-2 text-indigo-400" /> Community Hub
            </h3>
          </div>
          <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6 overscroll-contain">
            {/* Saved Snippets */}
            <div>
              <h4 className={`text-xs md:text-sm font-semibold mb-3 flex items-center ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-900'}`}>
                <CheckCircle className="h-3 md:h-4 w-3 md:w-4 mr-2 text-indigo-400" /> Saved Snippets
              </h4>
              {savedCodes.length === 0 ? (
                <div className={`text-xs md:text-sm italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No saved snippets yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedCodes.map((code) => (
                    <div
                      key={code.id}
                      onClick={() => loadSavedCode(code)}
                      className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/30 hover:bg-gray-600/30' : 'bg-gray-100 hover:bg-gray-200'} cursor-pointer transition-all duration-300 group relative border ${theme === 'dark' ? 'border-gray-700/10' : 'border-gray-300'} touch-manipulation`}
                    >
                      <div className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'} truncate`}>{code.name}</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {languages[code.language]?.label || code.language}
                      </div>
                      <button
                        onClick={(e) => deleteSavedCode(code.id, e)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 touch-manipulation"
                      >
                        <X className="h-3 md:h-4 w-3 md:w-4 text-red-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Community Feed */}
            <div>
              <h4 className={`text-xs md:text-sm font-semibold mb-3 flex items-center ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-900'}`}>
                <Star className="h-3 md:h-4 w-3 md:w-4 mr-2 text-indigo-400" /> Community Snippets
              </h4>
              <div className="space-y-3">
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700/10' : 'border-gray-300'}`}>
                  <div className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'}`}>Quick Sort in Python</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>by CodeMaster</div>
                </div>
                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700/10' : 'border-gray-300'}`}>
                  <div className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'}`}>React Hooks Example</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>by DevGuru</div>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            <div>
              <h4 className={`text-xs md:text-sm font-semibold mb-3 flex items-center ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-900'}`}>
                <Trophy className="h-3 md:h-4 w-3 md:w-4 mr-2 text-indigo-400" /> Leaderboard
              </h4>
              <div className="space-y-3">
                <div className={`flex items-center p-3 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20' : 'bg-yellow-100'} border ${theme === 'dark' ? 'border-yellow-400/10' : 'border-gray-300'}`}>
                  <span className={`text-xs md:text-sm font-medium mr-2 ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}>1.</span>
                  <span className={`text-xs md:text-sm ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'}`}>Ismail</span>
                  <span className={`text-xs md:text-sm ml-auto ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}>1200 pts</span>
                </div>
                <div className={`flex items-center p-3 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/20' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-400/10' : 'border-gray-300'}`}>
                  <span className={`text-xs md:text-sm font-medium mr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>2.</span>
                  <span className={`text-xs md:text-sm ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'}`}>Karan</span>
                  <span className={`text-xs md:text-sm ml-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>1150 pts</span>
                </div>
                <div className={`flex items-center p-3 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/20' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-400/10' : 'border-gray-300'}`}>
                  <span className={`text-xs md:text-sm font-medium mr-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>3.</span>
                  <span className={`text-xs md:text-sm ${theme === 'dark' ? 'text-indigo-300' : 'text-gray-800'}`}>Hamzah</span>
                  <span className={`text-xs md:text-sm ml-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>1100 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}