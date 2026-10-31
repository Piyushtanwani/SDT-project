import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Upload, X } from "lucide-react";
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
      const data = error.response?.data;
      setError((typeof data === "string" ? data : data?.message) || "Failed to add course. Please try again.");
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
      <div className="relative max-w-md w-full bg-gradient-to-b from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-900/60 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
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
              className="mb-4 bg-green-500/90 text-white px-4 py-2 rounded-lg flex items-center shadow-lg"
            >
              <CheckCircle className="mr-2" size={20} />
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
              className="mb-4 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center shadow-lg"
            >
              <AlertCircle className="mr-2" size={20} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Course Name
            </label>
            <input
              type="text"
              className="mt-1 w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-300"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter course name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Description
            </label>
            <textarea
              className="mt-1 w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-300"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Duration (hours)
            </label>
            <input
              type="number"
              className="mt-1 w-full px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-300"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Course Thumbnail <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="mt-1 flex items-center justify-center px-4 py-6 bg-white/30 dark:bg-gray-800/30 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-300">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="text-gray-400 dark:text-gray-500 mb-2" size={24} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {image ? image.name : "Upload a cover image"}
                </span>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
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
            className="w-full py-3 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)]"
            disabled={loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
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
                Adding Course...
              </span>
            ) : (
              "Add Course"
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

// CourseList Component (Display up to 3 courses per row)
const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { userToken } = useAuth();

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  const fetchCourses = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/course`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setCourses(response.data.slice(0, 3)); // Limit to 3 courses
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    }
  }, [apiUrl, userToken]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      {/* Add Course Button */}
      <div className="max-w-7xl mx-auto mb-8">
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className="py-3 px-6 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Add New Course
        </motion.button>
      </div>

      {/* Course Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <motion.div
            key={course.id}
            className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <img
              src={course.thumbnailUrl}
              alt={course.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {course.name}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {course.description}
              </p>
              <p className="mt-2 text-sm font-medium text-blue-500 dark:text-blue-400">
                {course.duration} hours
              </p>
            </div>
            {/* Glowing Border Effect */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-transparent hover:border-blue-400/30 transition-all duration-300" />
          </motion.div>
        ))}
      </div>

      {/* Add Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <AddCourse
            closeModal={() => setIsModalOpen(false)}
            refreshCourses={fetchCourses}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourseList;