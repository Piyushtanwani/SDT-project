import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export const ExamResult = () => {
  const { attemptId } = useParams(); // Get attemptId from URL
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const apiUrl = API_BASE_URL;

  useEffect(() => {
    fetch(`${apiUrl}/api/exams/result/${attemptId}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Exam Result:", data);
        setResult(data);
      })
      .catch((err) => console.error("Error fetching result:", err));
  }, [attemptId, apiUrl]);

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
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-950 dark:to-indigo-950 flex justify-center items-center">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-10 text-center">
        {passed ? (
          <h1 className="text-4xl font-bold text-green-600 dark:text-green-400">🎉 Congratulations! You Passed! 🎉</h1>
        ) : (
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-400">😢 You Failed! Try Again!</h1>
        )}
        <p className="text-2xl mt-4 text-gray-800 dark:text-gray-300">
          Your Score: <span className="font-bold">{score}%</span>
        </p>
        <button
          className="mt-6 bg-blue-500 dark:bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800"
          onClick={() => navigate("/attempts")}
        >
          Go to Attempts
        </button>
      </div>
    </div>
  );
};