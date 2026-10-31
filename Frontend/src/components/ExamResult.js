import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL, getAuthHeaders } from "../config/api";

export const ExamResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const apiUrl = API_BASE_URL;

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiUrl}/api/exams/result/${attemptId}`, {
      headers: { ...getAuthHeaders() },
    })
      .then((res) => {
        if (res.status === 403) throw new Error("This result belongs to another account.");
        if (res.status === 404) throw new Error("This result could not be found.");
        if (!res.ok) throw new Error("We could not load this result. Please try again.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.score !== "number") {
          setError("This result is unavailable.");
          return;
        }
        setResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [attemptId, apiUrl]);

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-950 dark:to-indigo-950 flex justify-center items-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-10 text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Result unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{error}</p>
          <button
            className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => navigate("/attempts")}
          >
            Go to My Exam History
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
            <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded w-full mb-6"></div>
          </div>
        </div>
      </div>
    );
  }

  const { score, passed } = result;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-950 dark:to-indigo-950 flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-10 text-center">
        <h1 className={`text-3xl font-bold ${passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {passed ? "Congratulations, you passed!" : "Not this time"}
        </h1>
        <p className="text-2xl mt-4 text-gray-800 dark:text-gray-300">
          Your Score: <span className="font-bold">{score}%</span>
        </p>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {passed
            ? "You met the 80% pass mark. You can now get your certificate from My Exam History."
            : "You need at least 80% to earn a certificate. Review the material and try again."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => navigate("/attempts")}
          >
            Go to My Exam History
          </button>
          {passed && (
            <button
              className="bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-gray-600 px-6 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
              onClick={() => navigate("/certificates")}
            >
              View Certificates
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
