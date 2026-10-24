import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { motion } from "framer-motion";
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock, FiAlertCircle, FiCheck } from "react-icons/fi";
import { API_BASE_URL } from "../config/api";

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "USER",
  });
  const [message, setMessage] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTermsChange = (e) => {
    setTermsChecked(e.target.checked);
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setMessage("Username cannot be empty.");
      return false;
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      setMessage("Please enter a valid email address.");
      return false;
    }
    if (formData.password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      return false;
    }
    if (!termsChecked) {
      setMessage("You must agree to the Terms and Conditions.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, formData);
      console.log("Registration successful:", response.data);
      navigate("/verify-otp", { state: { email: formData.email } });
    } catch (error) {
      console.error("Registration failed:", error.response?.data || error);
      setMessage(error.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <GoogleOAuthProvider clientId="373447199487-17q7ruiigmv5c612s0sjbdb65dmcpm5i.apps.googleusercontent.com">
      <div className="min-h-screen bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
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
                Join Our Community
              </motion.h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Start your learning journey</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {["username", "email", "password", "confirmPassword"].map((field) => (
                <div key={field} className="relative">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center">
                    {field === "username" && <FiUser className="mr-2 text-indigo-500 dark:text-indigo-400" />}
                    {field === "email" && <FiMail className="mr-2 text-indigo-500 dark:text-indigo-400" />}
                    {field.includes("password") && <FiLock className="mr-2 text-indigo-500 dark:text-indigo-400" />}
                    {field.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <div className="relative">
                    <input
                      type={
                        field.includes("password")
                          ? field === "password"
                            ? showPassword
                              ? "text"
                              : "password"
                            : showConfirmPassword
                            ? "text"
                            : "password"
                          : "text"
                      }
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100 transition-all"
                      placeholder={`Enter your ${field.replace(/([A-Z])/g, " $1").toLowerCase().trim()}`}
                      required
                    />
                    {field.includes("password") && (
                      <button
                        type="button"
                        onClick={() =>
                          field === "password"
                            ? setShowPassword(!showPassword)
                            : setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-4 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                      >
                        {field === "password" ? (
                          showPassword ? (
                            <FiEyeOff />
                          ) : (
                            <FiEye />
                          )
                        ) : showConfirmPassword ? (
                          <FiEyeOff />
                        ) : (
                          <FiEye />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center text-sm">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsChecked}
                  onChange={handleTermsChange}
                  className="h-5 w-5 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-300"
                />
                <label htmlFor="terms" className="ml-3 text-gray-600 dark:text-gray-400">
                  I agree to the{" "}
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer">
                    Terms & Conditions
                  </span>
                </label>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 hover:from-indigo-400 hover:to-purple-400 dark:hover:from-indigo-700 dark:hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-indigo-300/30 dark:hover:shadow-indigo-700/30"
              >
                Create Account
              </motion.button>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg border border-pink-100 dark:border-pink-800"
                >
                  <FiAlertCircle className="flex-shrink-0" />
                  <span>{message}</span>
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
                onSuccess={() => navigate("/login")}
                onError={() => setMessage("Google Login Failed")}
                theme="filled_white"
                shape="pill"
              />
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium underline underline-offset-4 hover:underline-offset-2 transition-all"
                >
                  Sign in
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
          <FiCheck className="text-indigo-400 dark:text-indigo-500 w-8 h-8 opacity-50 hover:opacity-75 cursor-help transition-opacity" />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};