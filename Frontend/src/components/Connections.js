import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import formatRole from "../utils/formatRole";

export const Connections = () => {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("authToken");
  const [acceptedConnections, setAcceptedConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState(null);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  const loadConnections = useCallback(async () => {
    if (!userId || !token) {
      setError("Please log in to view your connections.");
      navigate("/");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
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
      setError(error.response?.data?.message || "Unable to load your connections. Please try again.");
      setAcceptedConnections([]);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, navigate, token, userId]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const loadAvailableUsers = useCallback(async () => {
    if (!userId || !token) {
      setIsLoadingUsers(false);
      return;
    }
    setIsLoadingUsers(true);
    setUsersError("");
    try {
      const [response, statusResponse] = await Promise.all([
        axios.get(`${apiUrl}/api/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${apiUrl}/api/auth/connection-status/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const users = Array.isArray(response.data) ? response.data : [];
      const connectedIds = new Set(
        Object.keys(statusResponse.data?.statuses || {})
      );
      setAvailableUsers(
        users
          .filter(
            (candidate) =>
              Number(candidate.id) !== Number(userId) &&
              !connectedIds.has(String(candidate.id))
          )
          .sort((a, b) =>
            (a.name || a.username || "").localeCompare(b.name || b.username || "")
          )
      );
    } catch (err) {
      console.error("Error fetching community members:", err);
      setAvailableUsers([]);
      setUsersError("Could not load community members. Use the Community page to find people.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [apiUrl, token, userId]);

  useEffect(() => {
    loadAvailableUsers();
  }, [loadAvailableUsers]);

  const handleSendConnectionRequest = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      await axios.post(
        `${apiUrl}/api/auth/connect`,
        { senderId: userId, receiverId: parseInt(selectedUserId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const target = availableUsers.find(
        (candidate) => Number(candidate.id) === Number(selectedUserId)
      );
      setNotice(
        `Connection request sent${target ? ` to ${target.name || target.username}` : ""}.`
      );
      setSelectedUserId("");
      setError("");
      setAvailableUsers((prev) =>
        prev.filter((candidate) => Number(candidate.id) !== Number(selectedUserId))
      );
      const pendingResponse = await axios.get(`${apiUrl}/api/auth/pending/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRequests(pendingResponse.data);
    } catch (error) {
      console.error("Error sending connection request:", error);
      setNotice("");
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
                  <select
                    aria-label="Select a community member"
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setNotice("");
                    }}
                    disabled={isLoadingUsers || availableUsers.length === 0}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:outline-none text-sm disabled:opacity-60"
                  >
                    <option value="">
                      {isLoadingUsers
                        ? "Loading members..."
                        : availableUsers.length > 0
                          ? "Select a community member"
                          : "No new members available"}
                    </option>
                    {availableUsers.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name
                          ? `${candidate.name} (@${candidate.username})`
                          : `@${candidate.username}`}
                      </option>
                    ))}
                  </select>
                  {usersError && (
                    <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                      {usersError}
                    </p>
                  )}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!selectedUserId}
                    className={`w-full py-2 rounded-lg text-white text-sm font-medium transition-colors ${
                      selectedUserId
                        ? "bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                        : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                    }`}
                  >
                    Send Request
                  </motion.button>
                </form>
                <button
                  type="button"
                  onClick={() => navigate("/community")}
                  className="mt-3 w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Browse members in the Community
                </button>
                {notice && (
                  <p className="mt-3 text-sm text-green-600 dark:text-green-400" role="status">
                    {notice}
                  </p>
                )}
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
                      {formatRole(selectedConnection.role) && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                          {formatRole(selectedConnection.role)}
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
            className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-red-600 dark:text-red-400 text-sm"
          >
            <span>{error}</span>
            <button
              onClick={loadConnections}
              className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
            >
              Try again
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Connections;