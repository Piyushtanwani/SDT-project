import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { FiAlertCircle, FiLock, FiMail } from "react-icons/fi";

export const LoginSignup = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const success = await googleLogin(credentialResponse);
    if (success) {
      navigate("/");
    } else {
      setError("Google authentication failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:to-indigo-950 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-gradient-to-r from-blue-400/30 to-purple-300/30 dark:from-blue-900/20 dark:to-purple-900/20 w-64 h-64 rounded-full blur-[100px]"
            initial={{ scale: 0, rotate: Math.random() * 360 }}
            animate={{
              scale: [0, 1, 0],
              x: [0, Math.random() * 400 - 200, 0],
              y: [0, Math.random() * 400 - 200, 0],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-indigo-900/30 rounded-2xl shadow-2xl overflow-hidden border border-indigo-100 dark:border-indigo-800"
      >
        <div className="px-8 py-12">
          <div className="mb-10 text-center">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-500 dark:to-purple-400 bg-clip-text text-transparent mb-4"
            >
              Learn Without Limits
            </motion.h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Elevate Your Learning Experience</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                <FiMail className="mr-2 text-indigo-500 dark:text-indigo-400" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                <FiLock className="mr-2 text-indigo-500 dark:text-indigo-400" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 hover:from-indigo-400 hover:to-purple-400 dark:hover:from-indigo-700 dark:hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-indigo-300/30 dark:hover:shadow-indigo-700/30"
            >
              Continue
            </motion.button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg border border-pink-100 dark:border-pink-800"
              >
                <FiAlertCircle className="flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </form>

          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-indigo-100 dark:border-indigo-800" />
            <span className="px-4 text-gray-500 dark:text-gray-400 text-sm">or continue with</span>
            <div className="flex-1 border-t border-indigo-100 dark:border-indigo-800" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => setError("Google Login Failed")}
              theme="filled_white"
              shape="pill"
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              New here?{" "}
              <button
                onClick={() => navigate("/register")}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium underline underline-offset-4 hover:underline-offset-2 transition-all"
              >
                Create account
              </button>
            </p>
          </div>
        </div>

        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-indigo-100 dark:border-indigo-800" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-indigo-100 dark:border-indigo-800" />
      </motion.div>

      {/* Floating helper icon */}
      <div className="absolute bottom-8 right-8 animate-bounce">
        <FiAlertCircle className="text-indigo-400 dark:text-indigo-500 w-8 h-8 opacity-50 hover:opacity-75 cursor-help transition-opacity" />
      </div>
    </div>
  );
};