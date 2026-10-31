import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Stomp from "stompjs";
import SockJS from "sockjs-client";
import { API_BASE_URL } from "../config/api";
import formatRole from "../utils/formatRole";

const toMessage = (msg) => ({
  id: msg.id,
  content: msg.content,
  timestamp: msg.timestamp,
  sender: {
    id: msg.senderId ?? msg.sender?.id,
    username: msg.senderUsername ?? msg.sender?.username,
  },
});

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("authToken");
  const apiUrl = API_BASE_URL;

  const [currentUser, setCurrentUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierError, setEarlierError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const stompClient = useRef(null);
  const messagesEndRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const chatId =
    userId && id && !isNaN(id)
      ? Math.min(userId, id) + "-" + Math.max(userId, id)
      : null;

  useEffect(() => {
    if (!userId || !token) {
      navigate("/login");
      return;
    }
    if (!id || isNaN(id)) {
      setError("That conversation does not exist.");
      return;
    }

    let cancelled = false;
    setError("");
    setOtherUser(null);

    const fetchUsers = async () => {
      try {
        const currentUserResponse = await axios.get(`${apiUrl}/api/auth/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setCurrentUser(currentUserResponse.data);

        const connectionsResponse = await axios.get(`${apiUrl}/api/auth/connections/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const validConnections = (connectionsResponse.data || []).filter((conn) => conn.id && !isNaN(conn.id));

        // Check the connection before revealing the other user's profile
        if (!validConnections.some((conn) => conn.id === parseInt(id))) {
          if (!cancelled) setError("You can only chat with people you are connected to.");
          return;
        }

        const otherUserResponse = await axios.get(`${apiUrl}/api/auth/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setOtherUser(otherUserResponse.data);

        try {
          const messagesResponse = await axios.get(`${apiUrl}/api/messages/history/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled) return;
          const history = Array.isArray(messagesResponse.data)
            ? messagesResponse.data
            : messagesResponse.data.messages || [];
          setMessages(history.map(toMessage));
          setHasMore(Boolean(messagesResponse.data.hasMore));
        } catch (historyErr) {
          console.error("Failed to fetch message history:", historyErr);
          if (!cancelled) {
            setError("Could not load this conversation's history. Please try again.");
          }
        }
      } catch (err) {
        console.error("Error fetching chat data:", err);
        if (cancelled) return;
        if (err.response?.status === 404) {
          setError("This user no longer exists.");
        } else {
          setError("Failed to load chat. Please try again.");
        }
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [userId, token, id, apiUrl, navigate]);

  const connectWebSocket = useCallback(() => {
    if (!chatId || error) return;

    const socket = new SockJS(`${apiUrl}/ws`);
    stompClient.current = Stomp.over(socket);
    stompClient.current.debug = () => {};
    stompClient.current.connect(
      { Authorization: `Bearer ${token}` },
      () => {
        stompClient.current.subscribe(`/topic/messages/${chatId}`, (message) => {
          try {
            const receivedMessage = JSON.parse(message.body);
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === receivedMessage.id)) {
                return prev;
              }
              return [...prev, toMessage(receivedMessage)];
            });
          } catch (parseError) {
            console.error("Ignoring malformed chat message:", parseError);
          }
        });
        setIsConnected(true);
        reconnectAttempts.current = 0;
      },
      (err) => {
        console.error("WebSocket connection failed:", err);
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          setTimeout(connectWebSocket, 3000);
        } else {
          setError("Chat is unavailable right now. Please refresh the page to try again.");
        }
      }
    );
  }, [chatId, apiUrl, token, error]);

  useEffect(() => {
    if (!currentUser || !otherUser || error) return undefined;
    connectWebSocket();
    return () => {
      try {
        stompClient.current?.disconnect();
      } catch (disconnectError) {
        console.error("Failed to close chat connection:", disconnectError);
      }
      stompClient.current = null;
      setIsConnected(false);
    };
  }, [currentUser, otherUser, error, connectWebSocket]);

  useEffect(() => {
    const newestId = messages.length > 0 ? messages[messages.length - 1].id : null;
    if (newestId !== null && newestId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = newestId;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadEarlierMessages = async () => {
    if (!hasMore || loadingEarlier || messages.length === 0) return;
    setLoadingEarlier(true);
    setEarlierError("");
    try {
      const response = await axios.get(`${apiUrl}/api/messages/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { beforeId: messages[0].id },
      });
      const older = (response.data.messages || []).map(toMessage);
      setMessages((prev) => [...older, ...prev]);
      setHasMore(Boolean(response.data.hasMore));
    } catch (err) {
      console.error("Failed to load earlier messages:", err);
      setEarlierError("Could not load earlier messages. Please try again.");
    } finally {
      setLoadingEarlier(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isConnected || !currentUser || isSending) return;

    const messagePayload = {
      senderId: parseInt(userId),
      senderUsername: currentUser.username,
      receiverId: parseInt(id),
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    setIsSending(true);
    setSendError("");
    try {
      const response = await axios.post(`${apiUrl}/api/messages/send`, messagePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sent = toMessage(response.data);
      setMessages((prev) => (prev.some((msg) => msg.id === sent.id) ? prev : [...prev, sent]));
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setSendError(
        err.response?.status === 429
          ? "You are sending messages too quickly. Please wait a few seconds."
          : "Your message did not send. It is still in the message field, so you can try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center max-w-md"
        >
          <p className="text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              Try again
            </button>
            <Link
              to="/connections"
              className="inline-block min-h-[44px] px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              Back to Connections
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentUser || !otherUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-gray-600 dark:text-gray-300 text-center"
          role="status"
        >
          Loading chat...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col h-[80vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <img
              src={otherUser.profileurl || "https://webcrumbs.cloud/placeholder"}
              alt={otherUser.username}
              className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 dark:border-gray-600"
            />
            <div className="text-left">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {otherUser.name || "@"+otherUser.username}
              </h1>
              {formatRole(otherUser.role) && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatRole(otherUser.role)}
                </p>
              )}
            </div>
            <p
              role="status"
              className={`ml-auto shrink-0 flex items-center gap-2 text-xs font-medium ${
                isConnected
                  ? "text-green-700 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-600 dark:bg-green-400" : "bg-gray-400 dark:bg-gray-500"
                }`}
              />
              {isConnected ? "Connected" : "Connecting to chat..."}
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900"
          aria-live="polite"
        >
          {hasMore && (
            <div className="flex flex-col items-center gap-1 mb-4">
              <button
                type="button"
                onClick={loadEarlierMessages}
                disabled={loadingEarlier}
                className="min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-700 disabled:opacity-60"
              >
                {loadingEarlier ? "Loading..." : "Load earlier messages"}
              </button>
              {earlierError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">{earlierError}</p>
              )}
            </div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 flex ${msg.sender?.id === parseInt(userId) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
                  msg.sender?.id === parseInt(userId)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-90 mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              No messages yet. Say hello to start the conversation.
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {sendError && (
            <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">
              {sendError}
            </p>
          )}
          {!isConnected && !sendError && (
            <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
              Connecting to chat — sending is paused until the connection is ready.
            </p>
          )}
          <div className="flex items-end gap-3">
            <textarea
              aria-label="Message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              maxLength={2000}
              className="flex-1 touch-manipulation p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none text-sm"
              rows="2"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected || isSending}
              className={`min-h-[44px] touch-manipulation px-4 py-2 rounded-lg text-sm font-medium ${
                !newMessage.trim() || !isConnected || isSending
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
              }`}
            >
              {isSending ? "Sending..." : "Send message"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatPage;