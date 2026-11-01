import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Soft sign-in prompt: the first rows stay readable, and the rest fades behind a
 * login card once the visitor scrolls onto it. This is a prompt, not protection —
 * the data is already on the page, so anything genuinely private must be gated
 * server-side.
 */
export const LoginGate = ({
  children,
  clipHeight = "19rem",
  title = "Sign in to keep going",
  message = "Log in to unlock the rest of this course, save your progress and take the exam.",
  className = "",
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const contentRef = useRef(null);
  const sentinelRef = useRef(null);
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (isAuthenticated || !sentinel || typeof IntersectionObserver !== "function") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        const content = contentRef.current;
        const clip = sentinel.offsetTop;
        // A block barely longer than the free preview has nothing behind the fold,
        // so locking it would only hide things for no reason.
        if (content && content.getBoundingClientRect().height > clip + 24) {
          setEngaged(true);
          observer.disconnect();
        }
      },
      // The sentinel sits at the end of the free preview, so the lock engages exactly
      // where the readable part runs out rather than on page load.
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isAuthenticated]);

  if (isAuthenticated) return <>{children}</>;

  const from = `${location.pathname}${location.search}`;

  return (
    <div className={`relative ${className}`.trim()}>
      <span
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 w-full"
        style={{ top: clipHeight, height: 1 }}
      />
      <div
        ref={contentRef}
        aria-hidden={engaged ? "true" : undefined}
        className={
          engaged
            ? "select-none overflow-hidden blur-[7px] transition-[max-height,filter] duration-500"
            : ""
        }
        style={engaged ? { maxHeight: clipHeight } : undefined}
      >
        {children}
      </div>

      {engaged && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0 flex items-end justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-gray-950 dark:via-gray-950/80" />
          <div className="relative m-4 w-full max-w-md rounded-2xl border border-gray-200/80 bg-white/95 p-6 text-center shadow-xl dark:border-gray-700/70 dark:bg-gray-900/95">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Lock size={20} />
            </span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/login"
                state={{ from }}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950 sm:w-auto"
              >
                Log in to continue
              </Link>
              <Link
                to="/register"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-500/10 sm:w-auto"
              >
                Create a free account
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LoginGate;
