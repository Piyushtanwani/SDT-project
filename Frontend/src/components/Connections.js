import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";

export const Connections = () => {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("authToken");
  const [acceptedConnections, setAcceptedConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [newConnectionId, setNewConnectionId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState(null);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        if (!userId || !token) {
          setError("Please log in to view your connections.");
          navigate("/");
          return;
        }

        const acceptedResponse = await axios.get(`${apiUrl}/api/auth/connections/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAcceptedConnections(acceptedResponse.data);

        const pendingResponse = await axios.get(`${apiUrl}/api/auth/pending/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingRequests(pendingResponse.data);

        if (acceptedResponse.data.length > 0) {
          setSelectedConnection(acceptedResponse.data[0]);
        }
      } catch (error) {
        console.error("Error fetching connections:", error);
        setError("Failed to load connections. Using mock data.");
        setAcceptedConnections([
          {
            id: 2,
            username: "johndoe",
            name: "John Doe",
            profileurl: "https://webcrumbs.cloud/placeholder",
            role: "Software Developer",
            skills: ["JavaScript", "Python"],
            bio: "Passionate coder and tech enthusiast.",
          },
        ]);
        setPendingRequests([
          {
            connectionId: 1,
            id: 3,
            username: "janedoe",
            name: "Jane Doe",
            profileurl: "https://webcrumbs.cloud/placeholder",
            role: "Data Scientist",
            skills: ["Python"],
            bio: "Loves data and AI.",
          },
        ]);
        setSelectedConnection({
          id: 2,
          username: "johndoe",
          name: "John Doe",
          profileurl: "https://webcrumbs.cloud/placeholder",
          role: "Software Developer",
          skills: ["JavaScript", "Python"],
          bio: "Passionate coder and tech enthusiast.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [userId, token, apiUrl, navigate]);

  const handleSendConnectionRequest = async (e) => {
    e.preventDefault();
    if (!newConnectionId) return;

    try {
      await axios.post(
        `${apiUrl}/api/auth/connect`,
        { senderId: userId, receiverId: parseInt(newConnectionId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewConnectionId("");
      setError("");
      const pendingResponse = await axios.get(`${apiUrl}/api/auth/pending/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRequests(pendingResponse.data);
    } catch (error) {
      console.error("Error sending connection request:", error);
      setError(error.response?.data?.message || "Failed to send connection request.");
    }
  };

  const handleUpdateConnection = async (connectionId, status) => {
    try {
      await axios.put(
        `${apiUrl}/api/auth/connect/${connectionId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const acceptedResponse = await axios.get(`${apiUrl}/api/auth/connections/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAcceptedConnections(acceptedResponse.data);
      const pendingResponse = await axios.get(`${apiUrl}/api/auth/pending/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRequests(pendingResponse.data);
      if (acceptedResponse.data.length > 0 && !selectedConnection) {
        setSelectedConnection(acceptedResponse.data[0]);
      }
      setError("");
    } catch (error) {
      console.error("Error updating connection:", error);
      setError(error.response?.data?.message || "Failed to update connection.");
    }
  };

  const handleChatRedirect = (connectionId) => {
    navigate(`/chat/${connectionId}`);
  };

  const handleSelectConnection = (connection) => {
    setSelectedConnection(connection);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">
          Your Connections
        </h1>

        {isLoading ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-600 dark:text-gray-400 text-lg font-semibold text-center"
          >
            Loading connections...
          </motion.p>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Connections Sidebar */}
            <div className="lg:w-1/3 space-y-6">
              {/* Send Connection Request */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Connect with Someone
                </h2>
                <form onSubmit={handleSendConnectionRequest} className="flex flex-col gap-3">
                  <input
                    type="number"
                    value={newConnectionId}
                    onChange={(e) => setNewConnectionId(e.target.value)}
                    placeholder="Enter user ID"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none text-sm"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!newConnectionId}
                    className={`w-full py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                      newConnectionId
                        ? "bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                        : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                    }`}
                  >
                    Send Request
                  </motion.button>
                </form>
              </div>

              {/* Pending Requests */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Pending Requests
                </h2>
                {pendingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <motion.div
                        key={request.connectionId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={request.profileurl || "https://webcrumbs.cloud/placeholder"}
                            alt={request.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 dark:border-gray-600"
                          />
                          <div>
                            <p className="text-gray-900 dark:text-gray-100 text-sm font-medium">
                              {request.name}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                              @{request.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleUpdateConnection(request.connectionId, "ACCEPTED")}
                            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs"
                          >
                            Accept
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleUpdateConnection(request.connectionId, "REJECTED")}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs"
                          >
                            Reject
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No pending requests.</p>
                )}
              </div>

              {/* Accepted Connections */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  Your Connections
                </h2>
                {acceptedConnections.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {acceptedConnections.map((connection) => (
                      <motion.div
                        key={connection.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectConnection(connection)}
                        className={`max-w-full flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConnection?.id === connection.id
                            ? "bg-indigo-50 dark:bg-indigo-900"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={connection.profileurl || "https://webcrumbs.cloud/placeholder"}
                            alt={connection.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 dark:border-gray-600"
                          />
                          <div>
                            <p className="text-gray-900 dark:text-gray-100 text-sm font-medium">
                              {connection.name}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                              @{connection.username}
                            </p>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChatRedirect(connection.id);
                          }}
                          className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg text-xs"
                        >
                          Chat
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No connections yet.</p>
                )}
              </div>
            </div>

            {/* Connection Details */}
            <div className="lg:w-2/3 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              {selectedConnection ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-gray-700 shadow-md"
                    >
                      <img
                        src={selectedConnection.profileurl || "https://webcrumbs.cloud/placeholder"}
                        alt={selectedConnection.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    <div className="text-center sm:text-left flex-1">
                      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                        {selectedConnection.name}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        @{selectedConnection.username}
                      </p>
                      {selectedConnection.role && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                          {selectedConnection.role}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedConnection.skills && selectedConnection.skills.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm text-left ms-2 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-2 ms-1">
                        {selectedConnection.skills.map((skill, index) => (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-xs font-medium"
                          >
                            {skill}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedConnection.bio && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Bio
                      </h3>
                      <p className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
                        {selectedConnection.bio}
                      </p>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChatRedirect(selectedConnection.id)}
                    className="w-full sm:w-auto px-6 py-2 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-md"
                  >
                    Start Chat
                  </motion.button>
                </motion.div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center text-sm py-8">
                  Select a connection to view details.
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex items-center justify-center text-red-600 dark:text-red-400 text-sm"
          >
            <span>{error}</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Connections;