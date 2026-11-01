import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";

// Router state is client-set, so treat it as untrusted: only ever send the user to
// an in-app path, never to "//host" or "https://host" which would leave the site.
const safeRedirect = (from) => (typeof from === "string" && /^\/(?!\/)/.test(from) ? from : "/");

export const LoginSignup = () => {
  const { login, googleLogin } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeRedirect(location.state?.from);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await login(email, password);
    if (result.success) {
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const result = await googleLogin(credentialResponse);
    if (result.ok) {
      navigate(redirectTo, { replace: true });
    } else {
      setError(result.message || "Google authentication failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden ring-1 ring-gray-200/70 dark:ring-white/10"
      >
        <div className="px-8 py-12">
          <div className="mb-10 text-center">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Learn Without Limits
            </motion.h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Elevate Your Learning Experience</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                <FiMail className="mr-2 text-indigo-500 dark:text-indigo-400" />
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                <FiLock className="mr-2 text-indigo-500 dark:text-indigo-400" />
                Password
              </label>
              <div className="relative">
                <input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-900 border border-indigo-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={submitting ? undefined : { scale: 1.02 }}
              whileTap={submitting ? undefined : { scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing in…" : "Continue"}
            </motion.button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg border border-pink-100 dark:border-pink-800"
              >
                <FiAlertCircle className="flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </form>

          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-indigo-100 dark:border-indigo-800" />
            <span className="px-4 text-gray-600 dark:text-gray-400 text-sm">or continue with</span>
            <div className="flex-1 border-t border-indigo-100 dark:border-indigo-800" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => setError("Google sign-in failed. Please try again.")}
              theme={resolvedTheme === "dark" ? "filled_black" : "filled_white"}
              shape="pill"
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              New here?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="inline-flex min-h-[44px] items-center rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium underline underline-offset-4 hover:underline-offset-2 transition-all"
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
      <div className="absolute bottom-8 right-8 animate-bounce" aria-hidden="true">
        <FiAlertCircle className="text-indigo-400 dark:text-indigo-500 w-8 h-8 opacity-50 hover:opacity-75 cursor-help transition-opacity" />
      </div>
    </div>
  );
};