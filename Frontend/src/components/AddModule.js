import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./AdminSlidebar";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, CheckCircle, Upload } from "lucide-react";

const AddModule = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [content, setContent] = useState([{ text: "", imageUrl: "" }]);
  const [showSuccess, setShowSuccess] = useState(false);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    axios
      .get(`${apiUrl}/course/getCourses`)
      .then((response) => setCourses(response.data))
      .catch((error) => console.error("Error fetching courses:", error));
  }, []);

  const handleContentChange = (e, index) => {
    setContent((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text: e.target.value } : item))
    );
  };

  const handleImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("thumbnailUrl", file);

    try {
      const { data } = await axios.post(`${apiUrl}/upload/profilephoto`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setContent((prev) =>
        prev.map((item, i) => (i === index ? { ...item, imageUrl: data.imageUrl || data } : item))
      );
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      alert("Please select a course");
      return;
    }

    try {
      await axios.post(`${apiUrl}/module/add/${selectedCourse}`, {
        moduleTitle,
        content: content.map((item) => item.text),
        imageUrls: content.map((item) => item.imageUrl || ""),
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setModuleTitle("");
      setContent([{ text: "", imageUrl: "" }]);
      setSelectedCourse("");
    } catch (error) {
      console.error("Error adding module:", error);
    }
  };

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
            <form onSubmit={handleAddModule} className="space-y-6">
              {/* Course Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Select Course
                </label>
                <div className="relative">
                  <motion.select
                    className="w-full px-4 py-3 bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all duration-300 appearance-none shadow-glow hover:shadow-glow-hover"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                    whileHover={{ scale: 1.02 }}
                    whileFocus={{ scale: 1.02 }}
                  >
                    <option value="">-- Select Course --</option>
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
                      Upload Image
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
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 text-white py-3 rounded-lg font-medium shadow-glow hover:shadow-glow-hover transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Add Module
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