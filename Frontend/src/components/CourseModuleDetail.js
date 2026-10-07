import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ChevronLeft, ChevronRight, Image, X, BookOpen, Award, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CourseModuleDetail = () => {
  const { courseId, moduleNumber } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalModules, setTotalModules] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(null);

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [moduleNumber]);

  useEffect(() => {
    let isMounted = true;

    const fetchModuleData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${apiUrl}/module/course/${courseId}/module/${moduleNumber}`
        );
        if (isMounted) setModule(response.data);

        const totalResponse = await axios.get(
          `${apiUrl}/module/course/${courseId}`
        );
        if (isMounted) setTotalModules(totalResponse.data.length);
      } catch (error) {
        console.error("Error fetching module:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchModuleData();
    return () => {
      isMounted = false;
    };
  }, [courseId, moduleNumber, apiUrl]);

  const handleNavigation = (direction) => {
    setLoading(true);
    const newModuleNumber =
      direction === "next"
        ? parseInt(moduleNumber) + 1
        : parseInt(moduleNumber) - 1;

    navigate(`/course/${courseId}/module/${newModuleNumber}`);
  };

  const handleTakeExam = () => {
    navigate(`/course/${courseId}/exam`);
  };

  const showImage = (index) => {
    setActiveImageIndex(index);
    document.body.style.overflow = "hidden";
  };

  const hideImage = () => {
    setActiveImageIndex(null);
    document.body.style.overflow = "auto";
  };

  // Simplified animation variants
  const pageTransition = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 },
    },
  };

  // Get icon for content block
  const getContentIcon = (index) => {
    const icons = ["📚", "🧩", "📊", "💡", "🔍", "🛠️", "📝", "🧠"];
    return icons[index % icons.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-950 dark:to-indigo-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-700 dark:via-purple-700 dark:to-blue-700 text-white py-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center hover:text-white hover:bg-white/20 dark:hover:bg-white/10 px-3 py-1 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm sm:text-base font-medium">Back to Course</span>
          </button>

          <div className="flex items-center bg-white/20 dark:bg-white/10 px-3 py-1 rounded-lg">
            <Clock className="w-4 h-4 mr-1 text-white" />
            <span className="text-sm font-medium">Module {moduleNumber} of {totalModules}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24"
            >
              {/* Simple loader circle without rotation */}
              <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full mb-8 animate-pulse-slow"></div>

              <p className="mt-6 text-indigo-700 dark:text-indigo-400 font-medium text-center">
                Loading module content...
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-8"
            >
              {/* Module Title */}
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-500 dark:via-purple-500 dark:to-blue-500 bg-clip-text text-transparent">
                  {module.moduleTitle}
                </h1>
                <div className="mt-3 inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Module {moduleNumber}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="max-w-xl mx-auto">
                <div className="h-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 dark:from-indigo-600 dark:via-purple-600 dark:to-blue-600 rounded-full"
                    style={{ width: `${(parseInt(moduleNumber) / totalModules) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                  <span>Module 1</span>
                  <span>Module {moduleNumber}/{totalModules}</span>
                  <span>Complete</span>
                </div>
              </div>

              {/* Content */}
              <div className="mt-12 space-y-6">
                {module.imageUrls?.map((url, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-indigo-100 dark:border-indigo-800"
                  >
                    <div
                      className={`h-2 ${
                        index % 3 === 0
                          ? "bg-indigo-500 dark:bg-indigo-600"
                          : index % 3 === 1
                          ? "bg-purple-500 dark:bg-purple-600"
                          : "bg-blue-500 dark:bg-blue-600"
                      }`}
                    ></div>
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${
                            index % 3 === 0
                              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                              : index % 3 === 1
                              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          <span className="text-2xl">{getContentIcon(index)}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                            Concept {index + 1}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{Math.floor(Math.random() * 10) + 5} min</span>
                          </div>
                        </div>
                      </div>

                      {module.content[index] && (
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {module.content[index]}
                        </p>
                      )}

                      <div className="mt-6">
                        <button
                          onClick={() => showImage(index)}
                          className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md hover:bg-indigo-700 dark:hover:bg-indigo-800"
                        >
                          <Image className="w-4 h-4 mr-2" />
                          View Practical Example
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!module.imageUrls?.length && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-indigo-100 dark:border-indigo-800 p-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      Key Concepts
                    </h3>

                    <div className="space-y-4">
                      {module.content?.map((item, index) => (
                        <div
                          key={index}
                          className="flex rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex-shrink-0 mr-4">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                                index % 3 === 0
                                  ? "bg-indigo-600 dark:bg-indigo-700"
                                  : index % 3 === 1
                                  ? "bg-purple-600 dark:bg-purple-700"
                                  : "bg-blue-600 dark:bg-blue-700"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-6 pb-12 mt-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-6 border border-indigo-100 dark:border-indigo-800">
                {parseInt(moduleNumber) > 1 ? (
                  <button
                    onClick={() => handleNavigation("prev")}
                    className="flex items-center px-5 py-3 bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 rounded-lg shadow-sm hover:shadow-md transition-all mb-4 sm:mb-0"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    <span>Previous Module</span>
                  </button>
                ) : (
                  <div />
                )}

                {parseInt(moduleNumber) < totalModules ? (
                  <button
                    onClick={() => handleNavigation("next")}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-700 dark:via-purple-700 dark:to-blue-700 hover:from-indigo-700 hover:via-purple-700 hover:to-blue-700 dark:hover:from-indigo-800 dark:hover:via-purple-800 dark:hover:to-blue-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    <span className="flex items-center">
                      Continue to Next Module
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleTakeExam}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 dark:from-emerald-600 dark:to-blue-600 hover:from-emerald-600 hover:to-blue-600 dark:hover:from-emerald-700 dark:hover:to-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center"
                  >
                    <Award className="w-5 h-5 mr-2" />
                    Take Final Exam
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Need help with this module? Contact our support team</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Improved Image Modal */}
      <AnimatePresence>
        {activeImageIndex !== null && module?.imageUrls?.[activeImageIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 dark:bg-black/90 z-50 flex flex-col items-center justify-center p-4"
            onClick={hideImage}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header above image */}
              <div className="bg-white dark:bg-gray-900 rounded-t-xl p-4 flex justify-between items-center">
                <h3 className="text-gray-800 dark:text-white font-medium">Practical Example {activeImageIndex + 1}</h3>
                <button
                  onClick={hideImage}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image */}
              <div className="bg-white dark:bg-gray-900 p-2 pb-6 rounded-b-xl">
                <img
                  src={module.imageUrls[activeImageIndex]}
                  alt={`Practical demonstration ${activeImageIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* CSS Animations */}
      <style>{`
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

export default CourseModuleDetail;