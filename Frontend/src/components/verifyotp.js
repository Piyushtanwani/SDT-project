import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertCircle } from "react-icons/fi";
import { API_BASE_URL } from "../config/api";

export const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages
  
    setVerifying(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
  
      if (response.ok) {
        navigate("/login");
        return;
      }
      setMessage("That code wasn't accepted. Check the 6 digits and try again.");
    } catch (error) {
      console.error("OTP verification failed:", error);
      setMessage("We couldn't reach the verification service. Please try again.");
    } finally {
      setVerifying(false);
    }
  };
  
  
  const handleResendOtp = async () => {
    if (!email) {
      setResendMessage("Your email is missing. Go back and register again.");
      return;
    }
    
    setIsResending(true);
    setResendMessage("");

    try {
      const response = await fetch(`${apiUrl}/api/auth/resend-otp/${email}`, {
        method: "POST",
      });

      if (response.ok) {
        setResendMessage("A new 6-digit code has been sent.");
      } else {
        setResendMessage("We couldn't send a new code right now. Please try again in a minute.");
      }
    } catch (error) {
      console.error("OTP resend failed:", error);
      setResendMessage("We couldn't reach the verification service. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden ring-1 ring-gray-200/70 dark:ring-white/10 p-8"
      >
        <h1 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400 mb-6">Verify OTP</h1>
        <p id="otpHelp" className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4">
          Enter the 6-digit code we sent to {email}. Codes expire shortly — you can request a new one below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="otpInput" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
            Verification code
          </label>
          <input
            id="otpInput"
            type="text"
            value={otp}
            onChange={handleOtpChange}
            placeholder="6-digit code"
            maxLength="6"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-describedby="otpHelp"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-center text-lg tracking-widest bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 outline-none"
          />
          <motion.button
            whileHover={verifying ? undefined : { scale: 1.02 }}
            whileTap={verifying ? undefined : { scale: 0.98 }}
            type="submit"
            disabled={verifying || otp.length !== 6}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {verifying ? "Verifying…" : "Verify OTP"}
          </motion.button>
        </form>

        {message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="alert"
            className="flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg border border-pink-100 dark:border-pink-700 mt-4"
          >
            <FiAlertCircle className="flex-shrink-0" />
            <span>{message}</span>
          </motion.div>
        )}

        <div className="mt-4 text-center text-gray-600 dark:text-gray-300">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isResending}
            className="inline-flex min-h-[44px] items-center rounded-lg text-indigo-600 dark:text-indigo-400 underline disabled:opacity-60"
          >
            {isResending ? "Resending…" : "Resend a new 6-digit code"}
          </button>
        </div>

        {resendMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            className="text-center text-sm text-indigo-600 dark:text-indigo-400 mt-2"
          >
            {resendMessage}
          </motion.div>
        )}

        <div className="mt-2 text-center text-gray-600 dark:text-gray-400">
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="inline-flex min-h-[44px] items-center rounded-lg text-indigo-600 dark:text-indigo-400 underline"
          >
            Go back
          </button>
        </div>
      </motion.div>
    </div>
  );
};