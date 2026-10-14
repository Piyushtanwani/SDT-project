import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FiUserPlus, FiMessageSquare, FiInfo, FiClock, FiCalendar, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const UserProfileCard = ({ user, currentUserId }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [error, setError] = useState("");
  const [skillsData, setSkillsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;
  
  const token = sessionStorage.getItem("authToken");

  useEffect(() => {
    if (!currentUserId || !token || !user.id || user.id === currentUserId) {
      setConnectionStatus("INVALID");
    } else {
      checkConnectionStatus();
    }
    
    fetchSkillsData();
  }, [currentUserId, user.id, token]);

  const fetchSkillsData = async () => {
    try {
      setIsLoading(true);
      // Fetch all skills from the skill endpoint
      const response = await axios.get(`${apiUrl}/api/skills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // If user has skill IDs, map them to actual skill objects
      if (user.skillIds && Array.isArray(user.skillIds) && user.skillIds.length > 0) {
        const userSkills = response.data.filter(skill => 
          user.skillIds.includes(skill.id)
        );
        setSkillsData(userSkills);
      } else if (user.skills && Array.isArray(user.skills)) {
        // Use existing skill data if available
        setSkillsData(user.skills);
      }
    } catch (err) {
      console.error("Failed to fetch skills:", err);
      setError("Failed to load skills data.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      // Check pending requests (sent or received)
      const pendingResponse = await axios.get(`${apiUrl}/api/auth/pending/${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pendingRequests = pendingResponse.data;
      if (pendingRequests.some((req) => req.id === user.id)) {
        setConnectionStatus("PENDING");
        return;
      }

      // Check accepted connections
      const connectionsResponse = await axios.get(`${apiUrl}/api/auth/connections/${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const connections = connectionsResponse.data;
      if (connections.some((conn) => conn.id === user.id)) {
        setConnectionStatus("CONNECTED");
      } else {
        setConnectionStatus("NONE");
      }
    } catch (err) {
      console.error("Failed to check connection status:", err);
      setError("Failed to load connection status.");
    }
  };

  const handleConnect = async () => {
    if (!currentUserId || !token || !user.id) {
      setError("Cannot connect at this time.");
      return;
    }
    try {
      const response = await axios.post(
        `${apiUrl}/api/auth/connect`,
        {
          senderId: currentUserId,
          receiverId: user.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setConnectionStatus("PENDING");
      }
    } catch (err) {
      console.error("Failed to send connection request:", err);
      setError("Failed to send connection request.");
    }
  };

  const handleChatNavigation = () => {
    if (!user.id || isNaN(user.id)) {
      setError("Invalid user ID for chat.");
      return;
    }
    navigate(`/chat/${user.id}`);
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Generate random colors for skills to make them visually distinct
  const skillColors = [
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
  ];

  // Animation variants for skill badges
  const skillBadgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: i => ({
      opacity: 1,
      scale: 1,
      transition: { 
        delay: i * 0.1,
        duration: 0.3,
        type: "spring",
        stiffness: 300
      }
    })
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      <div className="p-5">
        {/* Header with profile image and name side by side */}
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
                  ease: "easeOut"
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
              {user.role?.toLowerCase() === "user" ? "Community Member" : user.role || "Community Member"}
            </motion.p>
          </div>
        </div>
        
        {/* Bio section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-4"
        >
          <p className="text-gray-600 text-left dark:text-gray-300 text-sm sm:text-base  pl-3">
            {user.bio || "No bio available."}
          </p>
        </motion.div>
        
        {/* Skills badges */}
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
            {isLoading ? (
              <div className="animate-pulse flex space-x-2">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : skillsData && skillsData.length > 0 ? (
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
        
        {/* Info grid */}
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
            <FiCalendar className="mr-3 text-lg" style={{ 
              color: user.availability ? "#10b981" : "#ef4444",
            }} />
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
        
        {/* Action buttons - stack on mobile, side by side on larger screens */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleConnect}
            disabled={
              !currentUserId ||
              !user.id ||
              user.id === currentUserId ||
              connectionStatus === "PENDING" ||
              connectionStatus === "CONNECTED" ||
              connectionStatus === "INVALID"
            }
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition ${
              !currentUserId ||
              !user.id ||
              user.id === currentUserId ||
              connectionStatus === "PENDING" ||
              connectionStatus === "CONNECTED" ||
              connectionStatus === "INVALID"
                ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white shadow-md"
            }`}
          >
            <FiUserPlus className="text-lg" />
            <span>
              {connectionStatus === "PENDING"
                ? "Request Sent"
                : connectionStatus === "CONNECTED"
                ? "Connected"
                : "Connect"}
            </span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleChatNavigation}
            disabled={connectionStatus !== "CONNECTED"}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition ${
              connectionStatus !== "CONNECTED"
                ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 shadow-md"
            }`}
          >
            <FiMessageSquare className="text-lg" />
            <span>Message</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UserProfileCard;