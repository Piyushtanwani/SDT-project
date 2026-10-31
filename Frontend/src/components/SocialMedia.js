import React from "react";
import { Link } from "react-router-dom";

const networks = [
  { name: "Instagram", icon: "fa-brands fa-instagram" },
  { name: "Twitter", icon: "fa-brands fa-twitter" },
  { name: "Facebook", icon: "fa-brands fa-facebook" },
  { name: "LinkedIn", icon: "fa-brands fa-linkedin" },
];

export const SocialMedia = () => {
  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 md:p-12 ring-1 ring-gray-200/50 dark:ring-gray-800 text-center">
          <div className="flex justify-center mb-6">
            <svg
              className="w-16 h-16 text-indigo-600 dark:text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">Coming soon</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-10">
            We're building our social media presence. Follow us for course launches, assessment updates, and study tips.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {networks.map((network) => (
              <button
                key={network.name}
                type="button"
                disabled
                aria-label={`${network.name} (not available yet)`}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 opacity-60 cursor-not-allowed"
              >
                <i className={`${network.icon} text-xl`} aria-hidden="true"></i>
              </button>
            ))}
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors duration-200"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
};
