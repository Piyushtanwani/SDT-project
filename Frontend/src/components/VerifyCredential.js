import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiAlertCircle, FiAward, FiCopy, FiCheckCircle, FiShield, FiClock, FiUsers } from "react-icons/fi";
import { API_BASE_URL } from "../config/api";

export const VerifyCredential = () => {
  const [credentialId, setCredentialId] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const apiUrl = API_BASE_URL;

  const handleCopyId = () => {
    if (certificate?.credentialId) {
      navigator.clipboard
        .writeText(certificate.credentialId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => console.error("Failed to copy: ", err));
    }
  };

  const handleSearch = async () => {
    if (!credentialId.trim()) {
      setError("Please enter a Credential ID.");
      return;
    }

    setLoading(true);
    setError("");
    setCertificate(null);

    try {
      const certResponse = await fetch(`${apiUrl}/api/certificates/credential/${credentialId.trim()}`);

      if (!certResponse.ok) {
        throw new Error(
          certResponse.status === 404
            ? "Certificate not found"
            : `Server error: ${certResponse.status}`
        );
      }

      const certData = await certResponse.json();

      const [userResponse, courseResponse] = await Promise.all([
        fetch(`${apiUrl}/api/auth/getUsername/${certData.userId}`),
        fetch(`${apiUrl}/course/getCourseName/${certData.courseId}`),
      ]);

      if (!userResponse.ok) throw new Error("User information unavailable");
      if (!courseResponse.ok) throw new Error("Course information unavailable");

      const userName = await userResponse.text();
      const courseName = await courseResponse.text();

      setCertificate({
        ...certData,
        userFirstName: userName,
        courseName: courseName,
      });
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Sample credential ID for demonstration
  const sampleCredentialId = "bcd-5678-efgh-9012";

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950 flex flex-col items-center">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Hero Section */}
        <div className="flex justify-center">
          <div className="max-w-4xl w-full flex flex-col items-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block text-lg font-medium px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full mb-4"
            >
              Credential Verification
            </motion.h2>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              Digital Credential Verification
            </motion.h1>
          </div>
        </div>

        {/* Verification Card */}
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-lg relative z-10 ring-1 ring-gray-200/50 dark:ring-gray-800 transition-all duration-300 hover:shadow-2xl"
          >
            <div className="text-center mb-6 md:mb-8">
              <FiAward className="w-12 h-12 md:w-16 md:h-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">Verify Credential</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
                Enter your credential ID to verify authenticity
              </p>

              {/* Sample Credential ID */}
              {!certificate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-xs text-gray-400 dark:text-gray-500"
                >
                  Sample ID: {sampleCredentialId}
                </motion.div>
              )}
            </div>

            {/* Input Section */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={credentialId}
                  onChange={(e) => {
                    setCredentialId(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter Credential ID"
                  className="pl-4 pr-4 py-3 md:px-6 md:py-4 rounded-full border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 w-full shadow-md hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -bottom-6 left-0 text-red-500 dark:text-red-400 text-xs md:text-sm flex items-center gap-1"
                    >
                      <FiAlertCircle /> <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !credentialId.trim()}
                className={`px-4 py-3 md:px-6 md:py-4 rounded-full text-white font-medium flex items-center justify-center gap-2 ${
                  loading
                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                    : credentialId.trim()
                    ? "bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 hover:shadow-lg active:scale-95"
                    : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                } transition-all duration-200`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <FiSearch className="text-lg" />
                    <span>Verify</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Section */}
            <AnimatePresence>
              {certificate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 p-6 md:p-8 rounded-xl border border-gray-200/50 dark:border-gray-800 mt-4 overflow-hidden"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded-lg backdrop-blur-sm">
                    <span className="text-indigo-800 dark:text-indigo-400 text-xs md:text-sm font-medium">
                      #{certificate.credentialId}
                    </span>
                    <button
                      onClick={handleCopyId}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      {copied ? <FiCheckCircle className="text-green-500 dark:text-green-400" /> : <FiCopy />}
                    </button>
                  </div>

                  <div className="text-center space-y-3">
                    <div className="mb-4">
                      <h2 className="text-2xl md:text-4xl font-serif font-bold text-indigo-800 dark:text-indigo-300">
                        {certificate.userFirstName}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg">
                        has successfully completed
                      </p>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-3 md:p-4 rounded-lg shadow-inner mb-4 ring-1 ring-gray-200/50 dark:ring-gray-800">
                      <h3 className="text-lg md:text-2xl font-semibold text-gray-800 dark:text-white">
                        {certificate.courseName}
                      </h3>
                      <div className="flex justify-center items-baseline gap-2 mt-2">
                        <span className="text-2xl md:text-4xl font-bold text-purple-600 dark:text-purple-400">
                          {certificate.score}%
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Final Score</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 text-gray-500 dark:text-gray-400 text-sm md:text-base">
                      <div>
                        <span className="block font-medium text-gray-600 dark:text-gray-300">Issued On</span>
                        <span className="font-medium text-indigo-700 dark:text-indigo-400">
                          {formatDate(certificate.issuedAt)}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                      <div>
                        <span className="block font-medium text-gray-600 dark:text-gray-300">Valid Through</span>
                        <span className="font-medium text-indigo-700 dark:text-indigo-400">Lifetime</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col sm:flex-row sm:justify-between text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    <span className="block sm:inline text-center sm:text-left">
                      <strong>Verify at:</strong>
                      <a
                        href="https://elearning.bitecodes.com/credential-verify"
                        className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline ml-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        elearning.bitecodes.com/credential-verify
                      </a>
                    </span>
                    <span className="block sm:inline text-center sm:text-right mt-2 sm:mt-0">
                      <strong>Powered by:</strong>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold ml-1">
                        Learn Without Limits
                      </span>
                    </span>
                  </div>
                </motion.div>
              )}

              {error === "Certificate not found" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center p-6 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl mt-4 flex flex-col items-center justify-center gap-3"
                >
                  <FiAlertCircle className="text-yellow-600 dark:text-yellow-400 text-2xl" />
                  <div>
                    <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                      No certificate found with this ID
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
                      Please check the ID and try again
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="flex justify-center">
          <motion.div
            className="grid md:grid-cols-3 gap-6 mt-12 w-full max-w-6xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow ring-1 ring-gray-200/50 dark:ring-gray-800">
              <FiShield className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Secure Verification</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Blockchain-powered verification ensures credentials are tamper-proof and authentic
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow ring-1 ring-gray-200/50 dark:ring-gray-800">
              <FiClock className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Lifetime Validity</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Digital credentials never expire and can be verified anytime, anywhere
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow ring-1 ring-gray-200/50 dark:ring-gray-800">
              <FiUsers className="w-8 h-8 text-green-600 dark:text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Global Recognition</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Accepted by employers and institutions worldwide
              </p>
            </div>
          </motion.div>
        </div>
      </main>

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