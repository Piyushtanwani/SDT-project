import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Sidebar from "./AdminSlidebar";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, CheckCircle, Upload, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const AddModule = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [content, setContent] = useState([{ text: "", imageUrl: "" }]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const apiUrl = API_BASE_URL;

  const fetchCourses = useCallback(() => {
    setCoursesLoading(true);
    setCoursesError("");
    axios
      .get(`${apiUrl}/course/getCourses`)
      .then((response) => setCourses(Array.isArray(response.data) ? response.data : []))
      .catch((error) => {
        console.error("Error fetching courses:", error);
        setCourses([]);
        setCoursesError("We couldn't load the course list. Please try again.");
      })
      .finally(() => setCoursesLoading(false));
  }, [apiUrl]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleContentChange = (e, index) => {
    setContent((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text: e.target.value } : item))
    );
  };

  const handleImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");

    const formData = new FormData();
    formData.append("thumbnailUrl", file);

    try {
      const { data } = await axios.post(`${apiUrl}/upload/profilephoto`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setContent((prev) =>
        prev.map((item, i) => (i === index ? { ...item, imageUrl: data.imageUrl || data } : item))
      );
    } catch (uploadFailure) {
      console.warn("Image upload failed; the module can be saved without it.", uploadFailure);
      setUploadError("Image upload is unavailable right now. You can still add the module without an image.");
    } finally {
      e.target.value = "";
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedCourse) {
      setError("Please select a course.");
      return;
    }

    const title = moduleTitle.trim();
    if (!title) {
      setError("Enter a module title.");
      return;
    }
    if (title.length > 255) {
      setError("Module title must be 255 characters or fewer.");
      return;
    }

    const trimmedContent = content.map((item) => item.text.trim());
    if (trimmedContent.some((text) => !text)) {
      setError("Content sections cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${apiUrl}/module/add/${selectedCourse}`, {
        moduleTitle: title,
        content: trimmedContent,
        imageUrls: content.some((item) => item.imageUrl)
          ? content.map((item) => item.imageUrl || "")
          : [],
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setModuleTitle("");
      setContent([{ text: "", imageUrl: "" }]);
      setSelectedCourse("");
    } catch (submitFailure) {
      console.error("Error adding module:", submitFailure);
      const data = submitFailure.response?.data;
      setError(
        (typeof data === "string" && data) ||
          data?.message ||
          "Could not add the module. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = submitting || coursesLoading || courses.length === 0;

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto w-full"
        >
          {/* Header */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 mb-6 sm:mb-8">
            Add Module
          </h2>

          {/* Main Content */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleAddModule} className="space-y-6">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Select Course
                </label>
                <div className="relative">
                  <motion.select
                    className="w-full px-4 py-3 bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-300 appearance-none shadow-glow hover:shadow-glow-hover disabled:opacity-60 disabled:cursor-not-allowed"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                    disabled={coursesLoading}
                    whileHover={coursesLoading ? undefined : { scale: 1.02 }}
                    whileFocus={{ scale: 1.02 }}
                  >
                    <option value="">
                      {coursesLoading
                        ? "Loading courses…"
                        : courses.length === 0
                          ? "No courses available"
                          : "-- Select Course --"}
                    </option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </motion.select>
                  <svg
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                {coursesError && (
                  <div
                    role="alert"
                    className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300"
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

              {/* Module Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Module Title
                </label>
                <motion.input
                  type="text"
                  className="w-full px-4 py-3 bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-300 shadow-glow hover:shadow-glow-hover"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  required
                  whileHover={{ scale: 1.02 }}
                  whileFocus={{ scale: 1.02 }}
                />
              </div>

              {/* Content Sections */}
              {content.map((item, index) => (
                <div key={index} className="space-y-4">
                  {/* Content Text */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Content {index + 1}
                    </label>
                    <motion.input
                      type="text"
                      className="w-full px-4 py-3 bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-300 shadow-glow hover:shadow-glow-hover"
                      value={item.text}
                      onChange={(e) => handleContentChange(e, index)}
                      required
                      whileHover={{ scale: 1.02 }}
                      whileFocus={{ scale: 1.02 }}
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Content Image <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <motion.label
                        className="flex items-center justify-center w-full px-4 py-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-800/30 cursor-pointer transition-all duration-300 shadow-glow hover:shadow-glow-hover"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Upload size={20} className="mr-2" />
                        {item.imageUrl ? "Change Image" : "Upload Image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageChange(e, index)}
                        />
                      </motion.label>
                    </div>
                    {item.imageUrl && (
                      <motion.img
                        src={item.imageUrl}
                        alt={`Uploaded ${index + 1}`}
                        className="mt-4 w-full h-40 object-cover rounded-lg shadow-md"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {uploadError && (
                <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle size={16} className="shrink-0" />
                  {uploadError}
                </p>
              )}

              {/* Add More Content Button */}
              <motion.button
                type="button"
                onClick={() => setContent([...content, { text: "", imageUrl: "" }])}
                className="flex items-center bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-glow hover:shadow-glow-hover transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlusCircle size={20} className="mr-2" />
                Add More Content
              </motion.button>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={submitDisabled}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 text-white py-3 rounded-lg font-medium shadow-glow hover:shadow-glow-hover transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                whileHover={submitDisabled ? undefined : { scale: 1.05 }}
                whileTap={submitDisabled ? undefined : { scale: 0.95 }}
              >
                {submitting ? "Adding Module..." : "Add Module"}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Success Notification */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-10 right-4 sm:right-10 bg-green-500/90 dark:bg-green-600/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg flex items-center shadow-glow-green"
            >
              <CheckCircle size={20} className="mr-2" />
              Module added successfully!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Embedded Styles */}
      <style>{`
        .shadow-glow {
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        .shadow-glow-hover:hover {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.7);
        }
        .shadow-glow-green {
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
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

export default AddModule;