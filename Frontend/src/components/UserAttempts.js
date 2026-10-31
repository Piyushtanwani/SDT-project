import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrophyIcon, CalendarDaysIcon, CheckBadgeIcon } from "@heroicons/react/24/solid";
import { getAuthHeaders } from "../config/api";

const PASSING_SCORE = 80;
const CERTIFICATE_FEE_INR = 50;

export const UserAttempts = () => {
  const [attempts, setAttempts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const userId = sessionStorage.getItem("userId");
  const navigate = useNavigate();

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    fetch(`${apiUrl}/api/attempts/user/${userId}`, {
      headers: { ...getAuthHeaders() },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setAttempts(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching attempts:", err);
        setLoadError("Couldn't load your exam history. Please check your connection and try again.");
      })
      .finally(() => setLoading(false));
  }, [userId, apiUrl, reloadKey]);

  useEffect(() => {
    fetch(`${apiUrl}/course/getCourses`)
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching courses:", err));
  }, [apiUrl]);

  useEffect(() => {
    fetch(`${apiUrl}/api/certificates/user/${userId}`, {
      headers: { ...getAuthHeaders() },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json();
      })
      .then((data) => setCertificates(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error fetching certificates:", err);
        setLoadError("Couldn't load your certificate status. Please refresh the page and try again.");
      });
  }, [userId, apiUrl, reloadKey]);

  const hasCertificate = (courseId) => {
    return Array.isArray(certificates) && certificates.some((cert) => cert.courseId === courseId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCourseName = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? course.name : "Unknown Course";
  };

  const issueCertificate = async (attempt) => {
    const certParams = new URLSearchParams({
      userId: attempt.userId,
      courseId: attempt.courseId,
    });
    const response = await fetch(`${apiUrl}/api/certificates?${certParams.toString()}`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Certificate issuance failed.");
    }
    return response.json();
  };

  const handlePayment = async (attempt) => {
    try {
      const params = new URLSearchParams({ userId: attempt.userId });

      const paymentResponse = await fetch(`${apiUrl}/payments/initiate?${params.toString()}`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
      });

      const result = await paymentResponse.json().catch(() => ({}));

      if (paymentResponse.status === 503) {
        // Payments are unavailable; passing learners can still issue their certificate.
        await issueCertificate(attempt);
        alert("Payment isn't available right now, so your certificate was issued for free.");
        navigate("/certificates");
        return;
      }

      if (!paymentResponse.ok || !result.transactionId) {
        alert("We couldn't start the payment. Please try again.");
        return;
      }

      if (!window.Razorpay) {
        alert("The payment window could not load. Please disable any blockers and try again.");
        return;
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_mQf2cASnEwehms",
        amount: CERTIFICATE_FEE_INR * 100,
        currency: "INR",
        name: "Learn Without Limits",
        description: "Certificate Issuance Verification",
        order_id: result.transactionId,
        handler: async function (response) {
          try {
            const verifyParams = new URLSearchParams({
              razorpay_order_id: response.razorpay_order_id || result.transactionId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            const verifyResponse = await fetch(`${apiUrl}/payments/verify?${verifyParams.toString()}`, {
              method: "POST",
              headers: { ...getAuthHeaders() },
            });

            if (!verifyResponse.ok) {
              const errData = await verifyResponse.json().catch(() => ({}));
              throw new Error(errData.message || "Payment verification failed on server");
            }

            await issueCertificate(attempt);

            alert("Payment verified! Your certificate has been issued.");
            navigate("/certificates");
          } catch (err) {
            console.error("Verification failed:", err);
            alert("We couldn't verify your payment. Your certificate was not issued. Please try again.");
          }
        },
        prefill: {
          name: sessionStorage.getItem("userName") || "User",
          email: sessionStorage.getItem("userEmail") || "user@example.com",
        },
        theme: { color: "#3399cc" },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on("payment.failed", function (response) {
        console.error("Payment Failed:", response);
        alert("Payment Failed. Please try again.");
      });
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Error processing payment.");
    }
  };

  const filteredAttempts =
    selectedCourse === "all"
      ? attempts
      : attempts.filter((attempt) => attempt.courseId === parseInt(selectedCourse));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="w-full min-h-screen flex flex-col items-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4 md:p-10"
    >
      <div className="w-full max-w-6xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 bg-clip-text text-transparent mb-8 text-center">
          My Exam History
        </h1>

        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <label htmlFor="courseFilter" className="text-lg font-medium text-gray-700 dark:text-gray-300">Filter by Course:</label>
          <select
            id="courseFilter"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full md:w-72 px-4 py-3 border-2 border-purple-100 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-700 focus:border-purple-500 dark:focus:border-purple-400 transition-all cursor-pointer"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-lg text-gray-600 dark:text-gray-300" role="status">
            Loading your exam history...
          </p>
        ) : loadError ? (
          <div className="text-center p-8 rounded-xl bg-rose-50 dark:bg-rose-900/20" role="alert">
            <p className="text-rose-700 dark:text-rose-300 text-lg">{loadError}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredAttempts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-8 rounded-xl bg-purple-50/50 dark:bg-purple-900/20"
          >
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {selectedCourse === "all"
                ? "No attempts yet — take your first test to see your results here."
                : "No attempts found for this course. Try another filter or take the course test."}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAttempts.map((attempt, index) => (
              <motion.div
                key={attempt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.02 }}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl p-6 flex flex-col transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-indigo-900/30 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
                <div className="relative z-10">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    {getCourseName(attempt.courseId)}
                  </h2>

                  <div className="flex items-center gap-2 mb-3">
                    <TrophyIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    <span
                      className={`text-sm font-medium ${
                        attempt.score >= PASSING_SCORE ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400"
                      }`}
                    >
                      {attempt.score}% Score · {attempt.score >= PASSING_SCORE ? "Passed" : "Not passed"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(attempt.attemptedAt)}
                    </span>
                  </div>

                  <div className="mt-4 w-full">
                    {hasCertificate(attempt.courseId) ? (
                      <div className="flex items-center justify-center gap-2 bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 py-2.5 rounded-xl text-sm">
                        <CheckBadgeIcon className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                        Certificate Issued
                      </div>
                    ) : attempt.score >= PASSING_SCORE ? (
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePayment(attempt)}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700 text-white py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        Get Certificate - ₹{CERTIFICATE_FEE_INR}
                      </motion.button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 bg-rose-100/80 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 py-2.5 rounded-xl text-sm">
                        <span>Better luck next time!</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};