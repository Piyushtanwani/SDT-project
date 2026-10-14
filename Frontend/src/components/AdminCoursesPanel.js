import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./AdminSlidebar"; // Assuming this is unchanged
import { AddCourse } from "./AddCourse"; // Using the modernized AddCourse
import { X, Trash2 } from "lucide-react";

export const AdminCoursePanel = () => {
  const [courses, setCourses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${apiUrl}/course/getCourses`);
      setCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourseId) return;
    try {
      await axios.delete(`${apiUrl}/course/deletecourse/${selectedCourseId}`);
      setCourses(courses.filter((course) => course.id !== selectedCourseId));
      setIsConfirmOpen(false);
    } catch (error) {
      console.error("Error deleting course:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col p-4 sm:p-6">
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 mb-6 sm:mb-8">
          Admin Course Panel
        </h1>

        {/* Add Course Button */}
        <div className="flex justify-end mb-6">
          <motion.button
            onClick={() => setIsModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="py-3 px-6 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)]"
          >
            + Add Course
          </motion.button>
        </div>

        {/* Course Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <img
                src={course.thumbnailUrl || "/default-thumbnail.png"}
                alt={course.name}
                className="w-full h-48 object-cover bg-gray-200"
                onError={(e) => (e.target.src = "/default-thumbnail.png")}
              />
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {course.name}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {course.description}
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-500 dark:text-blue-400">
                    ⏳ {course.duration} hrs
                  </span>
                  <span className="text-sm font-medium text-yellow-500 dark:text-yellow-400">
                    ⭐ {course.rating || "N/A"}
                  </span>
                </div>
              </div>
              {/* Delete Button */}
              <motion.button
                onClick={() => {
                  setSelectedCourseId(course.id);
                  setIsConfirmOpen(true);
                }}
                className="absolute top-2 right-2 bg-red-500/90 text-white p-2 rounded-full hover:bg-red-600 transition-all duration-300 shadow-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Trash2 size={18} />
              </motion.button>
              {/* Glowing Border */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl border border-transparent hover:border-blue-400/30 transition-all duration-300" />
            </motion.div>
          ))}
        </motion.div>

        {/* Add Course Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <AddCourse
              closeModal={() => setIsModalOpen(false)}
              refreshCourses={fetchCourses}
            />
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {isConfirmOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4"
            >
              <div className="relative max-w-sm w-full bg-gradient-to-b from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-900/60 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Are you sure you want to delete this course?
                </h2>
                <div className="flex justify-end space-x-4">
                  <motion.button
                    onClick={() => setIsConfirmOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleDeleteCourse}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminCoursePanel;