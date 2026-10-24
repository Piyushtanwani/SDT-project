import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertCircle } from "react-icons/fi";

export const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages
  
    try {
      const response = await fetch(`${apiUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
  
      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        navigate("/login");
      } else {
        const errorResponse = await response.text(); // Read as plain text
        setMessage(errorResponse || "Verification failed. Please try again.");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    }
  };
  
  
  const handleResendOtp = async () => {
    if (!email) {
      setResendMessage("Email is missing.");
      return;
    }
    
    setIsResending(true);
    setResendMessage("");

    try {
      const response = await fetch(`${apiUrl}/api/auth/resend-otp/${email}`, {
        method: "POST",
      });

      if (response.ok) {
        setResendMessage("OTP sent successfully.");
      } else {
        const errorResponse = await response.text();
        setResendMessage(errorResponse || "Failed to resend OTP.");
      }
    } catch (error) {
      setResendMessage("An error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4 relative overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-gradient-to-r from-blue-400/30 to-purple-300/30 dark:from-blue-900/30 dark:to-purple-900/30 w-64 h-64 rounded-full blur-[100px]"
          initial={{ scale: 0, rotate: Math.random() * 360 }}
          animate={{ scale: [0, 1, 0], x: [0, Math.random() * 400 - 200, 0], y: [0, Math.random() * 400 - 200, 0] }}
          transition={{ duration: 15 + Math.random() * 10, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-900/30 rounded-2xl shadow-2xl overflow-hidden border border-indigo-100 dark:border-gray-600 p-8"
      >
        <h1 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400 mb-6">Verify OTP</h1>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">Enter the OTP sent to {email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={otp}
            onChange={handleOtpChange}
            placeholder="Enter OTP"
            maxLength="6"
            className="w-full px-4 py-3 border rounded-xl text-center text-lg tracking-widest bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white py-3 rounded-xl shadow-lg hover:shadow-indigo-300/30 dark:hover:shadow-indigo-700/30"
          >
            Verify OTP
          </motion.button>
        </form>

        {message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg border border-pink-100 dark:border-pink-700 mt-4"
          >
            <FiAlertCircle className="flex-shrink-0" />
            <span>{message}</span>
          </motion.div>
        )}

        <div className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Didn't receive the code?{" "}
          <button
            onClick={handleResendOtp}
            disabled={isResending}
            className="text-indigo-600 dark:text-indigo-400 underline"
          >
            {isResending ? "Resending..." : "Resend OTP"}
          </button>
        </div>

        {resendMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-indigo-600 dark:text-indigo-400 mt-2"
          >
            {resendMessage}
          </motion.div>
        )}

        <div className="mt-2 text-center text-gray-600 dark:text-gray-400">
          <button onClick={() => navigate("/register")} className="text-indigo-600 dark:text-indigo-400 underline">
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
};