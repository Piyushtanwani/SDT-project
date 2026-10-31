import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FiUserPlus, FiMessageSquare, FiInfo, FiClock, FiCalendar, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import formatRole from "../utils/formatRole";

const UserProfileCard = ({
  user,
  currentUserId,
  connectionState,
  statusKnown = true,
  allSkills = [],
  onStatusChange,
}) => {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  const token = sessionStorage.getItem("authToken");

  const isSelf = currentUserId != null && Number(user.id) === Number(currentUserId);
  const status = !currentUserId || !user.id
    ? "INVALID"
    : isSelf
    ? "SELF"
    : !statusKnown
    ? "LOADING"
    : connectionState?.status || "NONE";

  const canConnect = status === "NONE";
  const canAccept = status === "PENDING_RECEIVED";
  const canChat = status === "CONNECTED";

  const connectLabel =
    status === "PENDING_SENT"
      ? "Request Sent"
      : status === "PENDING_RECEIVED"
      ? "Accept Request"
      : status === "CONNECTED"
      ? "Connected"
      : status === "LOADING"
      ? "Loading..."
      : "Connect";
  const connectDisabled = !canConnect && !canAccept;

  const skillsData = (() => {
    if (Array.isArray(user.skillIds) && user.skillIds.length > 0) {
      const byId = new Map(allSkills.map((skill) => [skill.id, skill]));
      return user.skillIds.map((id) => byId.get(id)).filter(Boolean);
    }
    return Array.isArray(user.skills) ? user.skills : [];
  })();

  const handleConnect = async () => {
    if (!currentUserId || !token || !user.id || busy) return;
    setBusy(true);
    setError("");
    try {
      await axios.post(
        `${apiUrl}/api/auth/connect`,
        { senderId: currentUserId, receiverId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onStatusChange?.({ status: "PENDING_SENT" });
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the connection request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!token || busy) return;
    const connectionId = connectionState?.connectionId;
    if (!connectionId) {
      setError("This request is no longer available. Refresh the page to see the latest status.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await axios.put(
        `${apiUrl}/api/auth/connect/${connectionId}`,
        { status: "ACCEPTED" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onStatusChange?.({ status: "CONNECTED" });
    } catch (err) {
      setError(err.response?.data?.message || "Could not accept the request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleChatNavigation = () => {
    if (!canChat || !user.id || isNaN(user.id)) {
      return;
    }
    navigate(`/chat/${user.id}`);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const skillColors = [
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  ];

  const skillBadgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        type: "spring",
        stiffness: 300,
      },
    }),
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      <div className="p-5 flex flex-col flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <motion.div
            className="relative flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img
              src={user.profileurl || "https://webcrumbs.cloud/placeholder"}
              alt={user.username}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md"
            />
            {user.online && (
              <motion.span
                className="absolute bottom-1 right-1 h-3 w-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-800"
                animate={{
                  boxShadow: ["0 0 0 0 rgba(34, 197, 94, 0.4)", "0 0 0 10px rgba(34, 197, 94, 0)"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              ></motion.span>
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-lg sm:text-xl text-left font-semibold text-gray-800 dark:text-gray-100 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {user.name || user.username}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-xs sm:text-sm text-left font-medium text-indigo-600 dark:text-indigo-400"
            >
              {formatRole(user.role) || "Community Member"}
            </motion.p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-4"
        >
          <p className="text-gray-600 text-left dark:text-gray-300 text-sm sm:text-base pl-3">
            {user.bio || "No bio available."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mb-5 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg"
        >
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
            <FiInfo className="mr-2 text-indigo-500 dark:text-indigo-400" />
            <span>Skills</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {skillsData.length > 0 ? (
              skillsData.map((skill, index) => (
                <motion.span
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={skillBadgeVariants}
                  key={skill.id || skill.name}
                  className={`${skillColors[index % skillColors.length]} text-xs font-medium px-3 py-1.5 rounded-full shadow-sm`}
                  whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                >
                  {skill.name}
                </motion.span>
              ))
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">No skills listed</span>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="flex items-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg"
          >
            <FiClock className="text-indigo-500 dark:text-indigo-400 mr-3 text-lg" />
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Timezone</h4>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user.timezone || "Not set"}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            className="flex items-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg"
          >
            <FiCalendar
              className="mr-3 text-lg"
              style={{
                color: user.availability ? "#10b981" : "#ef4444",
              }}
            />
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Availability</h4>
              <div className="flex items-center gap-1">
                {user.availability ? (
                  <>
                    <FiCheckCircle className="text-green-500 dark:text-green-400" />
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">{user.availability}</p>
                  </>
                ) : (
                  <>
                    <FiXCircle className="text-red-500 dark:text-red-400" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Not set</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="mt-auto"
        >
          {error && (
            <p className="mb-3 text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={connectDisabled ? undefined : { scale: 1.03 }}
              whileTap={connectDisabled ? undefined : { scale: 0.97 }}
              onClick={canAccept ? handleAccept : canConnect ? handleConnect : undefined}
              disabled={connectDisabled || busy}
              title={status === "SELF" ? "This is your own profile" : undefined}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition ${
                connectDisabled || busy
                  ? status === "CONNECTED"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cursor-default"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : canAccept
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
                  : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white shadow-md"
              }`}
            >
              <FiUserPlus className="text-lg" />
              <span>{busy ? "Please wait..." : connectLabel}</span>
            </motion.button>

            <motion.button
              whileHover={canChat ? { scale: 1.03 } : undefined}
              whileTap={canChat ? { scale: 0.97 } : undefined}
              onClick={handleChatNavigation}
              disabled={!canChat}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition ${
                canChat
                  ? "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 shadow-md"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              <FiMessageSquare className="text-lg" />
              <span>Message</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UserProfileCard;
