import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const LeaderBoard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" });
  const [filterValue, setFilterValue] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/api/certificates/leaderboard`);
        if (!response.ok) {
          throw new Error("unavailable");
        }
        const data = await response.json();
        setLeaderboard(data);
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        setError("The leaderboard did not respond. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [apiUrl]);

  const getMedal = (rank) => {
    return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-700 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-700 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const sortLeaderboard = useCallback(
    (key) => {
      let direction = "ascending";
      if (sortConfig.key === key && sortConfig.direction === "ascending") {
        direction = "descending";
      }
      setSortConfig({ key, direction });
    },
    [sortConfig]
  );

  const filteredLeaderboard = useCallback(() => {
    let filtered = [...leaderboard];

    if (filterValue) {
      filtered = filtered.filter(
        (student) =>
          student.userName.toLowerCase().includes(filterValue.toLowerCase()) ||
          student.courseName.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    if (activeTab === "top10") {
      filtered = filtered.slice(0, 10);
    } else if (activeTab === "exceptional") {
      filtered = filtered.filter((student) => student.score >= 90);
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [leaderboard, sortConfig, filterValue, activeTab]);

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950 flex flex-col items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="inline-block text-lg font-medium px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full mb-4">
            Celebrate Excellence
          </h2>
          <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-6">
            🏆 Leaderboard
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-xl mx-auto">
            Track the top performers and celebrate their achievements in our learning community!
          </p>
        </motion.div>

        {/* Controls Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-3xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
        >
          {/* Tabs */}
          <div className="flex space-x-2 bg-white dark:bg-gray-900 rounded-full p-1 shadow-md ring-1 ring-gray-200/50 dark:ring-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              aria-pressed={activeTab === "all"}
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === "all"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("top10")}
              aria-pressed={activeTab === "top10"}
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === "top10"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              Top 10
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("exceptional")}
              aria-pressed={activeTab === "exceptional"}
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === "exceptional"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              Exceptional (90%+)
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <svg
              aria-hidden="true"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              aria-label="Search students or courses"
              placeholder="Search students or courses..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="pl-10 pr-4 py-3 rounded-full border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 w-full shadow-md hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </motion.div>

        {/* Leaderboard Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-3xl ring-1 ring-gray-200/50 dark:ring-gray-800"
        >
          {loading && (
            <div className="space-y-4" role="status">
              <span className="sr-only">Loading leaderboard...</span>
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-24 w-full rounded-lg mb-6"></div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 w-full rounded-lg"></div>
              ))}
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              role="alert"
              className="text-center p-6 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
            >
              <svg
                aria-hidden="true"
                className="w-12 h-12 text-red-400 dark:text-red-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Couldn&apos;t load the leaderboard</h3>
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 min-h-[44px] px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
              >
                Try again
              </button>
            </motion.div>
          )}

          {/* Highlighted Top Performers Podium */}
          {!loading && !error && leaderboard.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-8">
                Top Performers
              </h2>
              <div className="flex flex-col sm:flex-row items-end justify-center gap-2 sm:gap-6 min-h-[400px] sm:min-h-[300px] relative">
                {/* First Place */}
                {leaderboard[0] && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="w-full sm:w-[240px] h-[280px] bg-gradient-to-b from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/50 rounded-t-xl flex flex-col items-center relative order-2 sm:order-1 z-10 border-4 border-yellow-400 dark:border-yellow-600 shadow-lg"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, duration: 0.5, type: "spring" }}
                      className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-yellow-400 dark:bg-yellow-600 rounded-full flex items-center justify-center z-10 shadow-lg"
                    >
                      <span className="text-4xl">👑</span>
                    </motion.div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 dark:bg-yellow-600"></div>
                    <span className="absolute top-3 left-3 text-4xl">🥇</span>
                    <div className="flex flex-col items-center justify-end pb-8 h-full w-full">
                      <div className="w-20 h-20 bg-yellow-500 dark:bg-yellow-600 rounded-full mb-4 flex items-center justify-center text-2xl font-bold text-gray-900">
                        {leaderboard[0].userName?.charAt(0)}
                      </div>
                      <p className="font-bold text-yellow-800 dark:text-yellow-300 text-lg text-center px-2 truncate w-full">
                        {leaderboard[0].userName}
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-1 px-2 truncate w-full">
                        {leaderboard[0].courseName}
                      </p>
                      <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-400">
                        {leaderboard[0].score}%
                      </p>
                    </div>
                  </motion.div>
                )}
                {/* Second Place */}
                {leaderboard[1] && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="w-full sm:w-[200px] h-[220px] bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 rounded-t-xl flex flex-col items-center relative order-1 sm:order-2 border-4 border-gray-400 dark:border-gray-600 shadow-lg"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-400 dark:bg-gray-600"></div>
                    <span className="absolute top-3 left-3 text-3xl">🥈</span>
                    <div className="flex flex-col items-center justify-end pb-6 h-full w-full">
                      <div className="w-16 h-16 bg-gray-400 dark:bg-gray-600 rounded-full mb-4 flex items-center justify-center text-xl font-bold text-gray-900 dark:text-gray-100">
                        {leaderboard[1].userName?.charAt(0)}
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-gray-300 text-center px-2 truncate w-full">
                        {leaderboard[1].userName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 px-2 truncate w-full">
                        {leaderboard[1].courseName}
                      </p>
                      <p className={`text-xl font-bold ${getScoreColor(leaderboard[1].score)}`}>
                        {leaderboard[1].score}%
                      </p>
                    </div>
                  </motion.div>
                )}
                {/* Third Place */}
                {leaderboard[2] && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="w-full sm:w-[200px] h-[180px] bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 rounded-t-xl flex flex-col items-center relative order-3 sm:order-3 border-4 border-amber-500 dark:border-amber-600 shadow-lg"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-600"></div>
                    <span className="absolute top-3 left-3 text-3xl">🥉</span>
                    <div className="flex flex-col items-center justify-end pb-4 h-full w-full">
                      <div className="w-14 h-14 bg-amber-500 dark:bg-amber-600 rounded-full mb-4 flex items-center justify-center text-lg font-bold text-gray-900">
                        {leaderboard[2].userName?.charAt(0)}
                      </div>
                      <p className="font-semibold text-amber-800 dark:text-amber-300 text-center px-2 truncate w-full">
                        {leaderboard[2].userName}
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-400 mb-1 px-2 truncate w-full">
                        {leaderboard[2].courseName}
                      </p>
                      <p className={`text-xl font-bold ${getScoreColor(leaderboard[2].score)}`}>
                        {leaderboard[2].score}%
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Leaderboard Table (Hidden on Mobile) */}
          <div className="hidden sm:block">
            {!loading && !error && filteredLeaderboard().length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="overflow-hidden rounded-xl shadow-md border border-gray-200 dark:border-gray-800"
              >
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <th scope="col" className="p-4 text-left font-semibold">Rank</th>
                      <th
                        scope="col"
                        aria-sort={
                          sortConfig.key === "userName"
                            ? sortConfig.direction === "ascending"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className="p-0"
                      >
                        <button
                          type="button"
                          onClick={() => sortLeaderboard("userName")}
                          className="w-full min-h-[44px] p-4 text-left font-semibold cursor-pointer hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
                        >
                          Student Name {getSortIndicator("userName")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        aria-sort={
                          sortConfig.key === "courseName"
                            ? sortConfig.direction === "ascending"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className="p-0"
                      >
                        <button
                          type="button"
                          onClick={() => sortLeaderboard("courseName")}
                          className="w-full min-h-[44px] p-4 text-left font-semibold cursor-pointer hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
                        >
                          Course {getSortIndicator("courseName")}
                        </button>
                      </th>
                      <th
                        scope="col"
                        aria-sort={
                          sortConfig.key === "score"
                            ? sortConfig.direction === "ascending"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className="p-0"
                      >
                        <button
                          type="button"
                          onClick={() => sortLeaderboard("score")}
                          className="w-full min-h-[44px] p-4 text-left font-semibold cursor-pointer hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
                        >
                          Score {getSortIndicator("score")}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredLeaderboard().map((student, index) => (
                        <motion.tr
                          key={index}
                          variants={itemVariants}
                          exit={{ opacity: 0, x: -100 }}
                          className="hover:bg-indigo-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                        >
                          <td className="p-4 font-bold">
                            <div className="flex items-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white transition-all">
                                {getMedal(index + 1)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {student.userName}
                            </div>
                          </td>
                          <td className="p-4 text-gray-700 dark:text-gray-300">{student.courseName}</td>
                          <td className="p-4">
                            <span className={`font-bold ${getScoreColor(student.score)}`}>
                              {student.score}%
                            </span>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  student.score >= 90
                                    ? "bg-green-500 dark:bg-green-400"
                                    : student.score >= 80
                                    ? "bg-blue-500 dark:bg-blue-400"
                                    : student.score >= 70
                                    ? "bg-yellow-500 dark:bg-yellow-400"
                                    : "bg-red-500 dark:bg-red-400"
                                }`}
                                style={{ width: `${student.score}%` }}
                              ></div>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </motion.div>
            ) : (
              !loading &&
              !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <svg
                    aria-hidden="true"
                    className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No results</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {filterValue
                      ? "No certificates match that search. Try a different name or course."
                      : "No certificates have been scored yet. Results appear here once courses are completed."}
                  </p>
                  {filterValue && (
                    <button
                      type="button"
                      onClick={() => setFilterValue("")}
                      className="mt-4 min-h-[44px] px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </motion.div>
              )
            )}
          </div>

          {/* Mobile-Friendly Card Layout */}
          <div className="sm:hidden">
            {!loading && !error && filteredLeaderboard().length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col space-y-4"
              >
                {filteredLeaderboard().map((student, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    exit={{ opacity: 0, x: -100 }}
                    className={`p-4 rounded-lg shadow-md ring-1 ring-gray-200/50 dark:ring-gray-800 ${
                      index === 0
                        ? "bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/50 border-l-4 border-yellow-400 dark:border-yellow-600"
                        : index === 1
                        ? "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-l-4 border-gray-400 dark:border-gray-600"
                        : index === 2
                        ? "bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 border-l-4 border-amber-500 dark:border-amber-600"
                        : "bg-white dark:bg-gray-900 border-l-4 border-indigo-400 dark:border-indigo-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 font-bold text-sm mr-2">
                          {getMedal(index + 1)}
                        </span>
                        <p className="font-bold text-gray-800 dark:text-white">{student.userName}</p>
                      </div>
                      <span className={`font-bold ${getScoreColor(student.score)}`}>{student.score}%</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{student.courseName}</p>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          student.score >= 90
                            ? "bg-green-500 dark:bg-green-400"
                            : student.score >= 80
                            ? "bg-blue-500 dark:bg-blue-400"
                            : student.score >= 70
                            ? "bg-yellow-500 dark:bg-yellow-400"
                            : "bg-red-500 dark:bg-red-400"
                        }`}
                        style={{ width: `${student.score}%` }}
                      ></div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              !loading &&
              !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <svg
                    aria-hidden="true"
                    className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No results</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {filterValue
                      ? "No certificates match that search. Try a different name or course."
                      : "No certificates have been scored yet. Results appear here once courses are completed."}
                  </p>
                  {filterValue && (
                    <button
                      type="button"
                      onClick={() => setFilterValue("")}
                      className="mt-4 min-h-[44px] px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </motion.div>
              )
            )}
          </div>
        </motion.div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};