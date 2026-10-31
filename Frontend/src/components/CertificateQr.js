import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiAlertCircle, FiAward, FiCalendar, FiCheckCircle, FiHash } from "react-icons/fi";
import { API_BASE_URL } from "../config/api";

export const CertificateQr = () => {
  const { credentialId } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiUrl = API_BASE_URL;

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const certResponse = await fetch(`${apiUrl}/api/certificates/credential/${credentialId}`);
        if (!certResponse.ok) {
          throw new Error(certResponse.status === 404 ? "Certificate not found" : "Verification service unavailable");
        }

        const certData = await certResponse.json();
        if (!certData?.credentialId) throw new Error("Certificate not found");

        setCertificate(certData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [credentialId, apiUrl]);

  return (
    <div className="w-full min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-100 to-purple-200 dark:from-gray-950 dark:to-indigo-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 md:p-10 w-full max-w-lg transition-all duration-300 hover:shadow-2xl border border-blue-100 dark:border-gray-700"
      >
        <div className="text-center mb-6">
          <FiAward className="w-14 h-14 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Credential Verification</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            Validate the authenticity of this certificate.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-300" role="status">
            Fetching details...
          </p>
        ) : certificate ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-50 to-purple-100 dark:from-gray-900 dark:to-indigo-900/30 p-6 rounded-xl border border-blue-200 dark:border-gray-600 shadow-md"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-serif font-bold text-blue-800 dark:text-blue-300">{certificate.holderName}</h2>
              <p className="text-gray-700 dark:text-gray-300 text-lg">has successfully completed</p>

              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{certificate.courseName}</h3>
                <div className="flex justify-center items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">{certificate.score}%</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Final Score</span>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-inner mt-4 text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Issued On</span>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-gray-500 dark:text-gray-400" />
                    <span>{new Date(certificate.issuedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-medium">Valid Through</span>
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="text-green-500 dark:text-green-400" />
                    <span>{certificate.expiryDate ? new Date(certificate.expiryDate).toLocaleDateString() : "Lifetime"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-medium">Credential ID</span>
                  <div className="flex items-center gap-2">
                    <FiHash className="text-gray-500 dark:text-gray-400" />
                    <span className="font-mono">{certificate.credentialId}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-4 flex flex-col sm:flex-row sm:justify-between text-xs md:text-sm text-gray-600 dark:text-gray-400">
              <span className="block sm:inline text-center sm:text-left">
                <strong>Verify at:</strong>
                <a
                  href={`${window.location.origin}/credential-verify`}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  {window.location.host}/credential-verify
                </a>
              </span>
              <span className="block sm:inline text-center sm:text-right mt-2 sm:mt-0">
                <strong>Powered by:</strong>
                <span className="text-purple-600 dark:text-purple-400 font-semibold"> Learn Without Limits</span>
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="alert"
            className="text-center p-5 bg-red-50 dark:bg-red-900/30 rounded-xl mt-4"
          >
            <div className="flex items-center justify-center gap-3">
              <FiAlertCircle className="text-red-600 dark:text-red-400 w-6 h-6 flex-shrink-0" />
              <span className="text-red-700 dark:text-red-300 text-lg font-medium">{error || "No certificate found for this ID"}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Try again
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};