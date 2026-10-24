import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FiFilter, FiChevronDown } from "react-icons/fi";
import UserProfileCard from "./UserProfileCard";

const CommunityPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    skills: [],
    role: "",
    timezone: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("authToken");

  useEffect(() => {
    if (!userId || !token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser();
    fetchUsers();
  }, [userId, token, filters]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/auth/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(response.data);
    } catch (err) {
      console.error("Failed to load current user:", err);
      setError("Failed to load user data. Please log in again.");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("authToken");
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.skills.length) params.append("skills", filters.skills.join(","));
      if (filters.role) params.append("role", filters.role);
      if (filters.timezone) params.append("timezone", filters.timezone);

      const endpoint = filters.skills.length || filters.role || filters.timezone
        ? `${apiUrl}/api/auth/filter`
        : `${apiUrl}/api/auth/users`;

      const response = await axios.get(endpoint, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        console.error("Expected an array, received:", response.data);
        setUsers([]);
        setError("Unexpected response from server.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.response?.data?.message || "Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSkillToggle = (skill) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const skillsList = [
    "JavaScript",
    "Python",
    "Java",
    "React",
    "Node.js",
    "SQL",
    "HTML",
    "CSS",
    "TypeScript",
    "Angular",
    "Vue.js",
    "MongoDB",
    "AWS",
    "Docker",
    "Kubernetes",
  ];
  const rolesList = [
    "Software Developer",
    "Data Scientist",
    "DevOps Engineer",
    "UI/UX Designer",
    "Product Manager",
    "Other",
  ];
  const timezonesList = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Asia/Tokyo",
    "Asia/Kolkata",
    "Australia/Sydney",
    "America/Chicago",
    "Europe/Paris",
    "Asia/Singapore",
  ];

  const filteredSkills = skillsList.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  );
  const displayedSkills = filteredSkills.slice(0, 3);
  const dropdownSkills = filteredSkills.slice(3);

  if (!userId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-gray-700 dark:text-gray-300 text-base sm:text-lg font-medium"
        >
          Please log in to access the community.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 p-4 sm:p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-6xl mx-auto"
      >
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center text-indigo-700 dark:text-indigo-300 mb-4"
        >
          Discover Your Coding Community
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-gray-600 dark:text-gray-400 mb-10 text-base sm:text-lg md:text-xl max-w-xl mx-auto"
        >
          Connect with developers worldwide, collaborate on projects, and grow your skills together.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl shadow-2xl mb-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-6">
            <FiFilter className="text-indigo-600 dark:text-indigo-400 text-xl sm:text-2xl" />
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">Refine Your Search</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Skills
              </label>
              <input
                type="text"
                placeholder="Search skills..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 rounded-lg text-sm sm:text-base text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
              <div className="flex flex-wrap gap-2">
                {displayedSkills.map((skill) => (
                  <motion.button
                    key={skill}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSkillToggle(skill)}
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                      filters.skills.includes(skill)
                        ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                        : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
                    }`}
                  >
                    {skill}
                  </motion.button>
                ))}
                {dropdownSkills.length > 0 && (
                  <div className="relative">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-gray-200 dark:bg-gray-600 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all"
                    >
                      More
                      <FiChevronDown className="ml-1" />
                    </motion.button>
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-8 left-0 w-full sm:w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-48 overflow-y-auto"
                        >
                          <div className="p-2">
                            {dropdownSkills.map((skill) => (
                              <motion.button
                                key={skill}
                                type="button"
                                whileHover={{ backgroundColor: "#e5e7eb" }}
                                onClick={() => {
                                  handleSkillToggle(skill);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm rounded-md ${
                                  filters.skills.includes(skill)
                                    ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                                    : "text-gray-800 dark:text-gray-200"
                                }`}
                              >
                                {skill}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Role
              </label>
              <motion.select
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
                whileHover={{ scale: 1.02 }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 rounded-lg text-sm sm:text-base text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              >
                <option value="">Any Role</option>
                {rolesList.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </motion.select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Timezone
              </label>
              <motion.select
                name="timezone"
                value={filters.timezone}
                onChange={handleFilterChange}
                whileHover={{ scale: 1.02 }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 rounded-lg text-sm sm:text-base text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              >
                <option value="">Any Timezone</option>
                {timezonesList.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </motion.select>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-purple-500 dark:border-t-purple-400 rounded-full"
            ></motion.div>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-red-600 dark:text-red-400 text-base sm:text-lg"
          >
            {error}
          </motion.div>
        ) : (
          <AnimatePresence>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              {users.length > 0 ? (
                users.map((u) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                    className="relative z-0"
                  >
                    <UserProfileCard user={u} currentUserId={currentUser?.id} />
                  </motion.div>
                ))
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-600 dark:text-gray-400 col-span-1 sm:col-span-2 lg:col-span-3 text-base sm:text-lg"
                >
                  No users found matching your criteria.
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default CommunityPage;