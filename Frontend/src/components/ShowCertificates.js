import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { QRCodeCanvas } from "qrcode.react";
import { FiDownload, FiAward, FiCalendar, FiHash } from "react-icons/fi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { 
  SiPython, SiCplusplus, SiMysql, SiMongodb, SiRust, 
  SiReact, SiJavascript, SiHtml5, SiNodedotjs,
  SiPhp, SiAngular, SiVuedotjs
} from "react-icons/si";
import { DiJava } from "react-icons/di";
import { BsCodeSquare, BsShield } from "react-icons/bs";
import { FaGraduationCap, FaMedal } from "react-icons/fa";
import confetti from "canvas-confetti";
import { getAuthHeaders } from "../config/api";

// Extended course icons with fallback categories
const courseIcons = {
  // Programming Languages
  python: <SiPython size={50} color="#306998" />,
  java: <DiJava size={50} color="#007396" />,
  javascript: <SiJavascript size={50} color="#F7DF1E" />,
  "c++": <SiCplusplus size={50} color="#00599C" />,
  "c#": <BsCodeSquare size={50} color="#512BD4" />,
  rust: <SiRust size={50} color="#DEA584" />,
  php: <SiPhp size={50} color="#777BB4" />,
  
  // Databases
  mysql: <SiMysql size={50} color="#4479A1" />,
  mongodb: <SiMongodb size={50} color="#47A248" />,
  postgresql: <BsCodeSquare size={50} color="#336791" />,
  
  // Frontend
  react: <SiReact size={50} color="#61DAFB" />,
  angular: <SiAngular size={50} color="#DD0031" />,
  vue: <SiVuedotjs size={50} color="#4FC08D" />,
  
  // Backend & Frameworks
  node: <SiNodedotjs size={50} color="#339933" />,
  
  // Category icons for fallbacks
  frontend: <SiHtml5 size={50} color="#E34F26" />,
  backend: <SiNodedotjs size={50} color="#339933" />,
  database: <SiMysql size={50} color="#4479A1" />,
  security: <BsShield size={50} color="#4050B5" />
};

export const ShowCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const certificateRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();

  const { userFirstName, userId } = useAuth();

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    const fetchData = async () => {
      let certFailed = false;
      try {
        setFetchError("");
        const certRes = await fetch(`${apiUrl}/api/certificates/user/${userId}`, {
          headers: { ...getAuthHeaders() },
        });
        if (certRes.ok) {
          const certData = await certRes.json();
          setCertificates(Array.isArray(certData) ? certData : []);
        } else {
          certFailed = true;
          setCertificates([]);
        }

        const courseRes = await fetch(`${apiUrl}/course/getCourses`);
        const courseData = await courseRes.json();
        setCourses(Array.isArray(courseData) ? courseData : []);
        
        // Extract unique categories and filter out any undefined values
        if (Array.isArray(courseData)) {
          const uniqueCategories = [...new Set(
            courseData
              .map(course => course.category)
              .filter(category => category !== undefined)
          )];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        certFailed = true;
        setCertificates([]);
      } finally {
        if (certFailed) {
          setFetchError("Couldn't load your certificates. Please check your connection and try again.");
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, apiUrl, reloadKey]);

  const getCourseName = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? course.name.toLowerCase() : "unknown course";
  };

  const getCourseCategory = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    return course && course.category ? course.category : "Coding";
  };

  const getCourseIcon = (courseId) => {
    const courseName = getCourseName(courseId);
    const category = getCourseCategory(courseId);
    
    // First try direct match by course name
    if (courseIcons[courseName]) {
      return courseIcons[courseName];
    }
    
    // Try to match by course name substring
    for (const key in courseIcons) {
      if (courseName.includes(key)) {
        return courseIcons[key];
      }
    }
    
    // Fall back to category
    if (category && courseIcons[category.toLowerCase()]) {
      return courseIcons[category.toLowerCase()];
    }
    
    // Ultimate fallback
    return <FaGraduationCap size={50} color="#6B7280" />;
  };

  const handleCertificateClick = (certificate) => {
    setSelectedCertificate((prev) => {
      if (prev?.id === certificate.id) {
        return null;
      } else {
        // Trigger confetti when a new certificate is selected
        if (certificate) {
          triggerConfetti();
        }
        return certificate;
      }
    });
  };

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4F46E5', '#3B82F6', '#EC4899', '#8B5CF6']
      });
      
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#4F46E5', '#3B82F6', '#EC4899', '#8B5CF6']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    
    setLoadingDownload(true);
    setDownloadError("");

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(certificateRef.current, {
          backgroundColor: "#ffffff",
          scale: window.innerWidth < 768 ? 2 : 3,
          useCORS: true,
          // Paper is always light: without this, dark-mode text renders white-on-white.
          onclone: (doc) => doc.documentElement.classList.remove("dark"),
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("landscape", "mm", "a4");
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight) * 0.9;
        
        const x = (pdfWidth - canvasWidth * ratio) / 2;
        const y = (pdfHeight - canvasHeight * ratio) / 2;
        
        pdf.addImage(imgData, "PNG", x, y, canvasWidth * ratio, canvasHeight * ratio);
        pdf.save(`${getCourseName(selectedCertificate.courseId)}_certificate.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        setDownloadError("Couldn't generate the PDF. Please try again.");
      } finally {
        setLoadingDownload(false);
      }
    }, 500);
  };

  const filteredCertificates = activeCategory === "all" 
    ? certificates
    : certificates.filter(cert => {
        const category = getCourseCategory(cert.courseId);
        return category && category.toLowerCase() === activeCategory.toLowerCase();
      });

  return (
    <div className="w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 min-h-screen p-4 md:p-8">
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header with badge icon */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-full flex items-center justify-center mb-4 shadow-lg"
          >
            <FiAward className="text-white text-4xl" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 dark:text-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 bg-clip-text text-transparent">
            Your Achievements
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-center max-w-lg">
            Showcase your hard-earned certificates and share your accomplishments with the world.
          </p>
        </div>

        {/* Filter tabs */}
        {categories.length > 0 && !loading && certificates.length > 0 && (
          <div className="mb-6 overflow-x-auto pb-2">
            <div className="flex space-x-2 min-w-max">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-pressed={activeCategory === "all"}
                className={`px-4 py-2 rounded-full transition-all ${
                  activeCategory === "all"
                    ? "bg-indigo-600 dark:bg-indigo-700 text-white font-semibold shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                onClick={() => setActiveCategory("all")}
              >
                All Certificates
              </motion.button>
              
              {categories.map(category => (
                <motion.button
                  key={category}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={activeCategory === category.toLowerCase()}
                  className={`px-4 py-2 rounded-full transition-all ${
                    activeCategory === category.toLowerCase()
                      ? "bg-indigo-600 dark:bg-indigo-700 text-white font-semibold shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  onClick={() => setActiveCategory(category.toLowerCase())}
                >
                  {category}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="w-16 h-16 border-4 border-indigo-200 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400 rounded-full mb-4"
            ></motion.div>
            <p className="text-indigo-700 dark:text-indigo-300 font-medium">Loading your achievements...</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-12 bg-rose-50 dark:bg-rose-900/20 rounded-xl" role="alert">
            <p className="text-rose-700 dark:text-rose-300 text-lg">{fetchError}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : certificates.length > 0 ? (
          <>
            <AnimatePresence>
              {filteredCertificates.length > 0 ? (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredCertificates.map((certificate) => (
                    <motion.div
                      key={certificate.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedCertificate?.id === certificate.id}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleCertificateClick(certificate);
                        }
                      }}
                      className={`bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-900/30 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 ${
                        selectedCertificate?.id === certificate.id ? "ring-2 ring-indigo-500 dark:ring-indigo-400" : ""
                      }`}
                      onClick={() => handleCertificateClick(certificate)}
                      whileHover={{ y: -5 }}
                      layout
                    >
                      <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700"></div>
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-3 flex items-center justify-center">
                            {getCourseIcon(certificate.courseId)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 capitalize">
                              {getCourseName(certificate.courseId)}
                            </h3>
                            <div className="flex items-center mt-2 text-gray-600 dark:text-gray-400">
                              <FaMedal className="text-amber-500 dark:text-amber-400 mr-1" />
                              <span className="text-sm">Score: <span className="font-medium">{certificate.score}%</span></span>
                            </div>
                            <div className="flex items-center mt-1 text-gray-600 dark:text-gray-400">
                              <FiCalendar className="mr-1" />
                              <span className="text-sm">
                                {new Date(certificate.issuedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="inline-block mt-3 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded-full">
                              {getCourseCategory(certificate.courseId)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <p className="text-gray-600 dark:text-gray-300">No certificates found in this category.</p>
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div
            className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAward className="text-gray-400 dark:text-gray-500 text-4xl" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Certificates Yet</h3>
            <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              Pass a final exam with 80% or higher, then issue your certificate from My Exam History.
            </p>
            <button
              onClick={() => navigate("/attempts")}
              className="mt-5 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go to My Exam History
            </button>
          </motion.div>
        )}

        {/* Selected Certificate View */}
        <AnimatePresence>
          {selectedCertificate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700"
            >
              <div
                ref={certificateRef}
                className="certificate-container relative p-2 md:p-8 bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
              >
                {/* Certificate border decoration */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-[15px] border-indigo-100 dark:border-gray-700 rounded-xl"></div>
                  <div className="absolute inset-[15px] border-[2px] border-dashed border-indigo-300 dark:border-gray-600 rounded-xl"></div>
                </div>
                
                {/* Certificate Content */}
                <div className="relative py-10 px-8 text-center">
                  {/* Certificate Header */}
                  <div className="mb-6">
                    <div className="flex justify-center mb-3">
                      <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 rounded-full flex items-center justify-center">
                        <FiAward className="text-white text-2xl" />
                      </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-1">
                      Certificate of Achievement
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 mx-auto mb-3 rounded-full"></div>
                    <p className="text-gray-600 dark:text-gray-400 italic">This certifies that</p>
                  </div>
                  
                  {/* Recipient Name */}
                  <h2 className="text-3xl md:text-4xl font-bold text-indigo-800 dark:text-indigo-300 my-4 font-serif certificate-name">
                    {userFirstName}
                  </h2>
                  
                  {/* Course Details */}
                  <p className="text-lg text-gray-600 dark:text-gray-400 mt-4">has successfully completed the course</p>
                  <div className="flex flex-col items-center justify-center mt-3 mb-6">
                    <div className="flex items-center justify-center my-2">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-full">
                        {getCourseIcon(selectedCertificate.courseId)}
                      </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2 capitalize">
                      {getCourseName(selectedCertificate.courseId)}
                    </h3>
                    <span className="inline-block mt-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full">
                      {getCourseCategory(selectedCertificate.courseId)}
                    </span>
                  </div>
                  
                  {/* Certificate Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 max-w-2xl mx-auto">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 flex flex-col items-center">
                      <div className="flex items-center justify-center mb-1">
                        <FaMedal className="text-amber-500 dark:text-amber-400 mr-1" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Score</span>
                      </div>
                      <span className="font-bold text-lg text-indigo-800 dark:text-indigo-300">
                        {selectedCertificate.score}%
                      </span>
                    </div>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 flex flex-col items-center">
                      <div className="flex items-center justify-center mb-1">
                        <FiCalendar className="text-indigo-600 dark:text-indigo-400 mr-1" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Issued On</span>
                      </div>
                      <span className="font-bold text-indigo-800 dark:text-indigo-300">
                        {new Date(selectedCertificate.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 flex flex-col items-center">
                      <div className="flex items-center justify-center mb-1">
                        <FiHash className="text-indigo-600 dark:text-indigo-400 mr-1" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Credential ID</span>
                      </div>
                      <span className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">
                        {selectedCertificate.credentialId.substring(0, 12)}
                      </span>
                    </div>
                  </div>
                  
                  {/* QR Code Section */}
                  <div className="mt-8 flex justify-center">
                    <div className="bg-white dark:bg-gray-700 p-3 rounded-xl shadow-md border border-gray-200 dark:border-gray-600">
                      <QRCodeCanvas
                        value={`${window.location.origin}/credential/${selectedCertificate.credentialId}`}
                        size={120}
                        bgColor="#ffffff"
                        fgColor="#1F2937"
                        level="H"
                        includeMargin={true}
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 text-center font-medium">Scan to Verify</p>
                    </div>
                  </div>
                  
                  {/* Certificate Footer */}
                  <div className="mt-8 border-t border-gray-200 dark:border-gray-600 pt-4 text-sm text-gray-600 dark:text-gray-400">
                    <p>This certificate verifies the completion of the online course as indicated above.</p>
                  </div>
                </div>
              </div>
              
              {/* Download Button */}
              <motion.div 
                className="text-center mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={handleDownloadPDF}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 text-white px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
                  disabled={loadingDownload}
                >
                  {loadingDownload ? (
                    <AiOutlineLoading3Quarters className="animate-spin text-xl" />
                  ) : (
                    <FiDownload className="text-xl" />
                  )}
                  {loadingDownload ? "Generating PDF…" : "Download Certificate"}
                </button>
                {downloadError && (
                  <p className="mt-3 text-red-600 dark:text-red-400" role="alert">
                    {downloadError}
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};