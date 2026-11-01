import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Upload, X } from "lucide-react";
import Sidebar from "./AdminSlidebar";
import { API_BASE_URL } from "../config/api";
import { useNavigate } from "react-router-dom";

// AddCourse Modal Component
export const AddCourse = ({ closeModal, refreshCourses }) => {
  const navigate = useNavigate();
  const handleClose = closeModal || (() => navigate("/admincourses"));
  const notifyRefresh = refreshCourses || (() => {});
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const apiUrl = API_BASE_URL;
  const { userToken } = useAuth();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // The cover image is optional: course creation must not depend on external storage.
    let imageUrl = "";
    if (image) {
      const formData = new FormData();
      formData.append("thumbnailUrl", image);
      try {
        const uploadResponse = await axios.post(`${apiUrl}/upload/profilephoto`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${userToken}`,
          },
        });
        imageUrl = uploadResponse.data;
      } catch (uploadError) {
        console.warn("Cover image upload failed; creating the course without it.", uploadError);
      }
    }

    try {
      const courseData = {
        name: courseName,
        description: description,
        duration: parseInt(duration, 10),
        thumbnailUrl: imageUrl,
      };

      const courseResponse = await axios.post(`${apiUrl}/course/add`, courseData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (courseResponse.status === 200) {
        setSuccess(true);
        notifyRefresh();
        setTimeout(() => {
          setSuccess(false);
          handleClose();
        }, 2000);
      }
    } catch (error) {
      setError("Could not add the course. Please check the details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
    >
      <div
        className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 ring-1 ring-gray-200/70 dark:ring-white/10"
        role="dialog"
        aria-label="Add course"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Success Notification */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              role="status"
              className="mb-4 bg-green-700 dark:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center shadow-lg"
            >
              <CheckCircle className="mr-2" size={20} aria-hidden="true" />
              Course added successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              role="alert"
              className="mb-4 bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center shadow-lg"
            >
              <AlertCircle className="mr-2" size={20} aria-hidden="true" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Name */}
          <div>
            <label htmlFor="course-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Course Name
            </label>
            <input
              id="course-name"
              type="text"
              className="min-h-[44px] mt-1 w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter course name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Description
            </label>
            <textarea
              id="course-description"
              className="min-h-[44px] mt-1 w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={loading}
              rows={3}
              placeholder="Describe the course"
            />
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="course-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Duration (hours)
            </label>
            <input
              id="course-duration"
              type="number"
              className="min-h-[44px] mt-1 w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-300"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              disabled={loading}
              min="1"
              placeholder="Enter duration"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Course Thumbnail <span className="text-gray-600 dark:text-gray-300 font-normal">(optional)</span>
            </label>
            <div className="mt-1 flex items-center justify-center px-4 py-6 bg-gray-50 dark:bg-gray-800/40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="text-gray-500 dark:text-gray-400 mb-2" size={24} aria-hidden="true" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {image ? image.name : "Upload a cover image"}
                </span>
                <input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  accept="image/*"
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="w-full py-3 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all duration-300 shadow-sm hover:shadow-md"
            disabled={loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                  />
                </svg>
                Adding course…
              </span>
            ) : (
              "Add course"
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

// Page mounted at /admin/add-course: opens the modal and lists what already exists.
const AddCoursePage = () => {
  const [courses, setCourses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const apiUrl = API_BASE_URL;

  const fetchCourses = useCallback(async () => {
    try {
      setLoadError("");
      const response = await axios.get(`${apiUrl}/course/getCourses`);
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch {
      setLoadError("Could not load courses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 sm:p-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Add a course
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          A course needs modules before learners can take it. Add those from the module pages afterwards.
        </p>

        <div className="max-w-7xl w-full mx-auto mb-8">
          <motion.button
            onClick={() => setIsModalOpen(true)}
            className="py-3 px-6 rounded-xl text-white font-medium bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 shadow-sm hover:shadow-md"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            Add New Course
          </motion.button>
        </div>

        {isLoading && courses.length === 0 && (
          <p role="status" className="text-center text-gray-600 dark:text-gray-400 py-10">
            Loading courses…
          </p>
        )}

        {!isLoading && loadError && (
          <div className="max-w-7xl w-full mx-auto mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                fetchCourses();
              }}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !loadError && courses.length === 0 && (
          <p className="text-center text-gray-600 dark:text-gray-400 py-10">
            No courses yet. Add the first one above.
          </p>
        )}

        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <motion.div
              key={course.id}
              className="lift relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-md ring-1 ring-gray-200/70 dark:ring-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                src={course.thumbnailUrl || "/default-thumbnail.svg"}
                alt={course.name}
                className="w-full h-48 object-cover bg-gray-200 dark:bg-gray-700"
                onError={(e) => (e.target.src = "/default-thumbnail.svg")}
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {course.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {course.description}
                </p>
                <p className="mt-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {course.duration ? `${course.duration} hours` : "Self-paced"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <AddCourse
              closeModal={() => setIsModalOpen(false)}
              refreshCourses={fetchCourses}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AddCoursePage;