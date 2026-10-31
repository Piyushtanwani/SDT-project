import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Sidebar from "./AdminSlidebar";
import { motion } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const formatUpdatedAt = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const ModuleList = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [modulesError, setModulesError] = useState("");
  const latestModulesRequest = useRef(0);

  const apiUrl = API_BASE_URL;

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError("");
    try {
      const { data } = await axios.get(`${apiUrl}/course/getCourses`);
      const courseList = Array.isArray(data) ? data : [];
      setCourses(courseList);
      setSelectedCourse((current) => {
        if (current && courseList.some((course) => String(course.id) === String(current))) {
          return current;
        }
        return courseList.length > 0 ? courseList[0].id : "";
      });
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
      setSelectedCourse("");
      setCoursesError("We couldn't load the course list. Please try again.");
    } finally {
      setCoursesLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const fetchModules = useCallback(async (courseId) => {
    const requestId = latestModulesRequest.current + 1;
    latestModulesRequest.current = requestId;
    setLoading(true);
    setModulesError("");
    try {
      const { data } = await axios.get(`${apiUrl}/module/course/${courseId}`);
      if (latestModulesRequest.current !== requestId) return;
      setModules(Array.isArray(data) ? data : []);
    } catch (error) {
      if (latestModulesRequest.current !== requestId) return;
      console.error("Error fetching modules:", error);
      setModules([]);
      setModulesError("We couldn't load the modules for this course. Please try again.");
    } finally {
      if (latestModulesRequest.current === requestId) setLoading(false);
    }
  }, [apiUrl]);

  // Fetch modules when course changes
  useEffect(() => {
    if (selectedCourse) {
      fetchModules(selectedCourse);
    } else {
      setModules([]);
      setModulesError("");
      setLoading(false);
    }
  }, [selectedCourse, fetchModules]);

  const showLoading = coursesLoading || loading;

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto w-full"
        >
          {/* Header */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700 dark:from-blue-400 dark:to-purple-500 mb-6 sm:mb-8">
            Course Modules
          </h2>

          {/* Main Content */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
            {/* Course Selection Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Select Course
              </label>
              <div className="relative">
                <motion.select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={coursesLoading}
                  className="w-full px-4 py-3 bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all duration-300 appearance-none shadow-glow hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={coursesLoading ? undefined : { scale: 1.02 }}
                  whileFocus={{ scale: 1.02 }}
                >
                  {courses.length === 0 && (
                    <option value="">
                      {coursesLoading ? "Loading courses…" : "No courses available"}
                    </option>
                  )}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </motion.select>
                <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                  size={20}
                />
              </div>

              {coursesError && (
                <div
                  role="alert"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                >
                  <span>{coursesError}</span>
                  <button
                    type="button"
                    onClick={fetchCourses}
                    disabled={coursesLoading}
                    className="font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!coursesLoading && !coursesError && courses.length === 0 && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  No courses yet.{" "}
                  <Link to="/admincourses" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Create a course
                  </Link>{" "}
                  before adding modules.
                </p>
              )}
            </div>

            {/* Modules List */}
            {showLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full"
                ></motion.div>
                <p className="mt-4 text-blue-600 dark:text-blue-400 font-medium">
                  Loading modules...
                </p>
              </div>
            ) : modulesError ? (
              <div
                role="alert"
                className="text-center py-12 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30"
              >
                <p className="text-gray-700 dark:text-gray-300">{modulesError}</p>
                <button
                  type="button"
                  onClick={() => fetchModules(selectedCourse)}
                  className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition"
                >
                  Try again
                </button>
              </div>
            ) : modules.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                {modules.map((mod, index) => (
                  <motion.div
                    key={mod[0]}
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden relative"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className={`h-2 ${
                        index % 3 === 0
                          ? "bg-blue-500 dark:bg-blue-600"
                          : index % 3 === 1
                          ? "bg-purple-500 dark:bg-purple-600"
                          : "bg-indigo-500 dark:bg-indigo-600"
                      }`}
                    ></div>
                    <Link
                      to={`/course/${selectedCourse}/module/${mod[0]}`}
                      className="block p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${
                            index % 3 === 0
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                              : index % 3 === 1
                              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          <BookOpen size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                            Module {mod[0]}: {mod[1]}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Last updated: {formatUpdatedAt(mod[2])}
                          </p>
                        </div>
                      </div>
                    </Link>
                    <div className="absolute inset-0 pointer-events-none rounded-xl border border-transparent hover:border-blue-400/30 transition-all duration-300" />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
                  {courses.length === 0
                    ? "Add a course to start creating modules."
                    : "No modules available for this course."}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Embedded Styles */}
      <style>{`
        .shadow-glow {
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        .shadow-glow-hover:hover {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.7);
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ModuleList;