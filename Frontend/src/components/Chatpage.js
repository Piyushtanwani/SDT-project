import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Stomp from "stompjs";
import SockJS from "sockjs-client";
import ScrollToTop from "./ScrollToTop";

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("authToken");
  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  const [currentUser, setCurrentUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState("");
  const stompClient = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const chatId =
    userId && id && !isNaN(id)
      ? Math.min(userId, id) + "-" + Math.max(userId, id)
      : null;

  useEffect(() => {
    console.log("ChatPage mounted, useParams:", { id }, "URL:", window.location.pathname);
    if (!userId || !token) {
      setError("Please log in to chat.");
      navigate("/");
      return;
    }
    if (!id || isNaN(id)) {
      console.error("Invalid chat ID from useParams:", id, "URL:", window.location.pathname);
      setError("Invalid user ID. Please select a valid user to chat with.");
      navigate("/profile");
      return;
    }

    const fetchUsers = async () => {
      try {
        console.log("Fetching data for chat with ID:", id);
        const currentUserResponse = await axios.get(`${apiUrl}/api/auth/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(currentUserResponse.data);

        const otherUserResponse = await axios.get(`${apiUrl}/api/auth/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOtherUser(otherUserResponse.data);

        const connectionsResponse = await axios.get(`${apiUrl}/api/auth/connections/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const validConnections = connectionsResponse.data.filter((conn) => conn.id && !isNaN(conn.id));
        console.log("Connections in ChatPage:", validConnections);
        if (!validConnections.some((conn) => conn.id === parseInt(id))) {
          setError("You can only chat with connected users.");
          navigate("/profile");
          return;
        }

        try {
          const messagesResponse = await axios.get(`${apiUrl}/api/messages/history/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setMessages(messagesResponse.data.map(msg => ({
            id: msg.id,
            content: msg.content,
            timestamp: msg.timestamp,
            sender: { id: msg.sender.id, username: msg.sender.username }
          })));
        } catch (historyErr) {
          console.error("Failed to fetch message history:", historyErr);
          setError("Could not load chat history. You can still send messages.");
          setMessages([]);
        }
      } catch (err) {
        console.error("Error fetching chat data:", err);
        setError(err.response?.data?.message || "Failed to load chat. Please try again.");
      }
    };

    fetchUsers();
  }, [userId, token, id, apiUrl, navigate]);

  const connectWebSocket = () => {
    if (!chatId || error) return;

    console.log("Attempting WebSocket connection to:", `${apiUrl}/ws`);
    const socket = new SockJS(`${apiUrl}/ws`, null, {
      headers: { Authorization: `Bearer ${token}` }
    });
    stompClient.current = Stomp.over(socket);
    stompClient.current.connect(
      {},
      () => {
        console.log("WebSocket connected for chatId:", chatId);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        stompClient.current.subscribe(`/topic/messages/${chatId}`, (message) => {
          console.log("Received message:", message.body);
          const receivedMessage = JSON.parse(message.body);
          setMessages((prev) => [
            ...prev,
            {
              id: receivedMessage.id,
              content: receivedMessage.content,
              timestamp: receivedMessage.timestamp,
              sender: { id: receivedMessage.senderId, username: receivedMessage.senderUsername }
            }
          ]);
        });
      },
      (err) => {
        console.error("WebSocket connection failed:", err);
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          console.log(`Reconnecting WebSocket, attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          setTimeout(connectWebSocket, 3000);
        } else {
          setError("Failed to connect to chat after multiple attempts. Please refresh.");
        }
      }
    );
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (stompClient.current) {
        console.log("Disconnecting WebSocket for chatId:", chatId);
        stompClient.current.disconnect();
        setIsConnected(false);
      }
    };
  }, [chatId, error, apiUrl, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isConnected || !currentUser) return;

    const messagePayload = {
      senderId: parseInt(userId),
      senderUsername: currentUser.username,
      receiverId: parseInt(id),
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await axios.post(`${apiUrl}/api/messages/send`, messagePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Message sent via HTTP:", response.data);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
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
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-red-600 dark:text-red-400 text-center"
        >
          {error}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {otherUser.role}
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 flex ${msg.sender.id === parseInt(userId) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
                  msg.sender.id === parseInt(userId)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none text-sm"
              rows="2"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                !newMessage.trim() || !isConnected
                  ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
              }`}
            >
              Send
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatPage;