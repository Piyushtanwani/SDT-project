import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { SiPython, SiMysql, SiMongodb, SiRust, SiCplusplus } from "react-icons/si";
import { DiJava, DiReact } from "react-icons/di";
import { 
  FaArrowRight, 
  FaStar, 
  FaBookOpen, 
  FaGraduationCap, 
  FaRobot, 
  FaUsers, 
  FaCode, 
  FaCheck, 
  FaShareAlt, 
  FaUserPlus, 
  FaUserCheck, 
  FaFilter, 
  FaLaptopCode, 
  FaLightbulb, 
  FaClock, 
  FaBrain 
} from "react-icons/fa";
import { BsCodeSquare } from "react-icons/bs";
import { API_BASE_URL } from "../config/api";

export const HomePage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  const apiUrl = API_BASE_URL;

  const fetchCourses = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/course/getCourses`);
      setCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchCourses();
    }
  }, [fetchCourses]);

  const courseIcons = {
    python: <SiPython size={40} />,
    java: <DiJava size={40} />,
    "c++": <SiCplusplus size={40} />,
    mysql: <SiMysql size={40} />,
    mongodb: <SiMongodb size={40} />,
    rust: <SiRust size={40} />,
    react: <DiReact size={40} />,
  };

  // Premium Animated Course Card
  const CourseCard = ({ course }) => {
    const normalizedName = course.name.trim().toLowerCase();
    
    return (
      <div className="group relative">
        {/* Animated Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-80 transition duration-1000 group-hover:duration-300 animate-pulse-slow"></div>
        
        <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 ring-1 ring-gray-200/50 dark:ring-gray-800 shadow-lg flex flex-col h-full transition-all duration-300 group-hover:translate-y-1">
          <div className="flex items-center mb-5">
            <div className="flex-shrink-0 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
              <span className="text-indigo-600 dark:text-indigo-400">
                {courseIcons[normalizedName] || <DiReact size={40} />}
              </span>
            </div>
            <h3 className="ml-4 text-lg font-medium text-gray-900 dark:text-white">{course.name.trim()}</h3>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{course.description}</p>
          
          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
              <FaBookOpen className="mr-1" />
              {course.modulesCount ?? 0} modules
            </span>
            
            <div className="flex items-center">
              <div className="flex mr-2">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400 text-xs" />
                ))}
              </div>
              <button 
                onClick={() => navigate(`/course/${course.id}/modules`)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300"
              >
                <FaArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Premium Feature Card
  const FeatureCard = ({ icon, title, description, buttonText, onClick }) => {
    return (
      <div className="group relative">
        {/* Subtle Animated Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-70 transition duration-1000 group-hover:duration-300"></div>
        
        <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 ring-1 ring-gray-200/50 dark:ring-gray-800 shadow-lg flex flex-col h-full transition-all duration-300 group-hover:translate-y-1">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 mb-2 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30">
              <span className="text-indigo-600 dark:text-indigo-400">
                {icon}
              </span>
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{description}</p>
          
          <button 
            onClick={onClick}
            className="mt-auto flex items-center justify-center py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 group-hover:shadow-lg"
          >
            {buttonText}
            <FaArrowRight className="ml-2 text-xs" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950">
      {/* Subtle background patterns */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGM0LjQxOCAwIDgtMy41ODIgOC04cy0zLjU4Mi04LTgtOC04IDMuNTgyLTggOCAzLjU4MiA4IDggOHoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIvPjxwYXRoIGQ9Ik0zMCAzMGMwLTMuMzE0LTIuNjg2LTYtNi02cy02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNiA2LTIuNjg2IDYtNnoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')]"></div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Hero Section */}
        <section className="mb-24 relative">
          {/* Hero background effects */}
          <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-full max-w-3xl h-20 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-10 blur-3xl rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow"></div>
          
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 drop-shadow-sm">
              Learn. Code. Connect.
            </h1>
            <p className="text-lg mb-10 text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
              Master programming with expert-led courses, hands-on projects, and live collaboration. 
              Elevate your skills with our interactive platform and AI assistance.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={() => navigate("/courses")} className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg shadow-indigo-200/50 flex items-center justify-center font-medium">
                <FaGraduationCap className="mr-2 text-indigo-200" />
                <span>Explore Courses</span>
              </button>
              <button onClick={() => navigate("/ai")} className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg shadow-purple-200/50 flex items-center justify-center font-medium">
                <FaRobot className="mr-2 text-purple-200" />
                <span>AI Assistant</span>
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-24">
          <div className="mb-12 text-center">
            <h2 className="inline-block text-lg font-medium px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full mb-4">Features</h2>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">Supercharge Your Learning Journey</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<FaGraduationCap size={24} />}
              title="Expert-Led Courses"
              description="Interactive lessons and practical projects designed by industry professionals"
              buttonText="Browse Courses"
              onClick={() => navigate("/courses")}
            />
            
            <FeatureCard 
              icon={<BsCodeSquare size={24} />}
              title="Multi-Language IDE"
              description="In-browser compiler supporting all major programming languages"
              buttonText="Start Coding"
              onClick={() => navigate("/compiler")}
            />
            
            <FeatureCard 
              icon={<FaUsers size={24} />}
              title="Coding Community"
              description="Find partners for pair programming and collaborative projects"
              buttonText="Connect Now"
              onClick={() => navigate("/community")}
            />
            
            <FeatureCard 
              icon={<FaRobot size={24} />}
              title="AI Assistance"
              description="Get real-time solutions to your coding challenges with AI help"
              buttonText="Ask AI"
              onClick={() => navigate("/ai")}
            />
          </div>
        </section>

        {/* Courses Section */}
        <section className="mb-16">
          <div className="text-center mb-10">
            <div>
              <h2 className="inline-block text-lg font-medium px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full mb-4">Courses</h2>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-5">Popular Learning Paths</h3>
            </div>
            <button
              className="group flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
              onClick={() => navigate("/courses")}
            >
              <span className="mr-2">View All Courses</span>
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <FaArrowRight size={12} />
              </span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array(6).fill().map((_, index) => (
                <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-6 ring-1 ring-gray-200/50 dark:ring-gray-800 shadow-lg animate-pulse">
                  <div className="flex items-center mb-5">
                    <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    <div className="ml-4 w-2/3 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="w-5/6 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="w-4/6 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                  <div className="w-full h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))
            ) : courses.length > 0 ? (
              courses.map((course, index) => (
                <CourseCard key={course.id || index} course={course} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                <FaBookOpen size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No courses available at the moment.</p>
                <p className="text-sm">Check back soon for new learning paths.</p>
              </div>
            )}
          </div>
        </section>
   

        {/* Code Compiler Section */}
<section className="mb-24 relative z-10">
  <div className="relative">
    {/* Subtle background glow */}
    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-xl opacity-20"></div>
    
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-800 relative">
      <div className="flex flex-col md:flex-row">
        {/* Content Side */}
        <div className="md:w-1/2 p-8 md:p-10">
          <div className="inline-block text-base font-medium px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full mb-3">
            Code Anywhere
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-5 text-gray-900 dark:text-white">
            Powerful Online IDE
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
            Write, compile, and run code in multiple programming languages directly in your browser. 
            Perfect for learning, testing, and quick prototyping with real-time feedback.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FaCode size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-left font-medium text-gray-900 dark:text-white">Multiple Languages</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Support for Python, JavaScript, Java, Go, and more</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FaCheck size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Real-time Feedback</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Instant error checking and syntax highlighting</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FaShareAlt size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Share & Collaborate</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Save, version, and share your code with others</p>
              </div>
            </div>
          </div>
          
          <div className="inline-flex group">
            <button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
              onClick={() => navigate("/compiler")}
            >
              <BsCodeSquare className="mr-2" />
              <span>Open Compiler</span>
              <div className="w-0 overflow-hidden group-hover:w-6 transition-all duration-300 ease-in-out">
                <FaArrowRight className="ml-2" />
              </div>
            </button>
          </div>
        </div>
        
        {/* Visual Side */}
        <div className="md:w-1/2 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 md:p-10 flex items-center justify-center">
          <div className="relative code-editor-preview w-full max-w-md">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg opacity-50 blur"></div>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
              {/* Editor Top Bar */}
              <div className="h-10 bg-gray-800 flex items-center px-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex items-center ml-4 space-x-2">
                  <div className="px-2 py-0.5 rounded text-xs bg-blue-600 text-white">main.py</div>
                  <div className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">utils.py</div>
                </div>
              </div>
              
              {/* Editor Content */}
              <div className="p-4 text-left font-mono">
                <div className="flex">
                  <div className="mr-4 text-gray-600 select-none text-xs">
                    {Array(7).fill().map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <div><span className="text-pink-400">def</span> <span className="text-blue-400">greet</span><span className="text-gray-400">(</span><span className="text-orange-300">name</span><span className="text-gray-400">):</span></div>
                    <div>    <span className="text-pink-400">return</span> <span className="text-green-300">f"Hello, {'{'}name{'}'}"</span></div>
                    <div></div>
                    <div><span className="text-green-400"># Test the function</span></div>
                    <div><span className="text-blue-300">print</span><span className="text-gray-400">(</span><span className="text-blue-400">greet</span><span className="text-gray-400">(</span><span className="text-green-300">"Coder"</span><span className="text-gray-400">))</span></div>
                    <div></div>
                    <div className="flex items-center">
                      <span className="text-green-400"># Output: Hello, Coder!</span>
                      <span className="ml-1 w-2 h-5 bg-white opacity-70 inline-block animate-pulse"></span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Terminal Output */}
              <div className="border-t border-gray-700 bg-gray-800 p-3 text-sm text-green-400">
                <span className="text-gray-400">$</span> python main.py<br />
                Hello, Coder!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* Find Coding Buddy Section */}
<section className="mb-24 relative z-10">
  <div className="relative">
    {/* Subtle background glow */}
    <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-20"></div>
    
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-800 relative">
      <div className="flex flex-col-reverse md:flex-row">
        {/* Visual Side */}
        <div className="md:w-1/2 bg-gradient-to-br from-green-500/5 to-emerald-500/5 dark:from-green-900/20 dark:to-emerald-900/20 p-8 md:p-10 flex items-center justify-center">
          <div className="buddy-finder-preview w-full max-w-md">
            {/* Connected Avatars */}
            <div className="buddy-graph relative h-48 flex items-center justify-center mb-4">
              {/* Connection lines with animated gradient */}
              <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="connectionGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.6">
                      <animate attributeName="stopColor" values="#10b981;#6366f1;#10b981" dur="4s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6">
                      <animate attributeName="stopColor" values="#6366f1;#10b981;#6366f1" dur="4s" repeatCount="indefinite"/>
                    </stop>
                  </linearGradient>
                  <linearGradient id="connectionGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6">
                      <animate attributeName="stopColor" values="#6366f1;#ec4899;#6366f1" dur="4s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6">
                      <animate attributeName="stopColor" values="#ec4899;#6366f1;#ec4899" dur="4s" repeatCount="indefinite"/>
                    </stop>
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <line x1="30%" y1="50%" x2="50%" y2="50%" stroke="url(#connectionGradient1)" strokeWidth="2" filter="url(#glow)" />
                <line x1="50%" y1="50%" x2="70%" y2="50%" stroke="url(#connectionGradient2)" strokeWidth="2" filter="url(#glow)" />
              </svg>
              
              {/* Developer Avatars */}
              <div className="avatar-container absolute left-1/4 transform -translate-x-1/2 z-10">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full opacity-70 blur-sm"></div>
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-xl flex items-center justify-center text-white text-lg font-bold">JS</div>
                </div>
              </div>
              
              <div className="avatar-container absolute left-1/2 transform -translate-x-1/2 z-20">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full opacity-70 blur-sm"></div>
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-xl flex items-center justify-center text-white text-xl font-bold">PY</div>
                </div>
              </div>
              
              <div className="avatar-container absolute left-3/4 transform -translate-x-1/2 z-10">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full opacity-70 blur-sm"></div>
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 shadow-xl flex items-center justify-center text-white text-lg font-bold">GO</div>
                </div>
              </div>
            </div>
            
            {/* Buddy Cards */}
            <div className="space-y-4">
              {/* Active Card with Glow Effect */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg opacity-70 blur-sm group-hover:opacity-100 transition duration-200"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 flex items-center shadow-md">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 flex items-center justify-center text-green-700 dark:text-green-300 font-medium text-lg">A</div>
                  <div className="ml-4 flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">Alice Johnson</h4>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 mr-1.5">Python</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">JavaScript</span>
                      <span className="flex items-center ml-auto text-xs text-green-600 dark:text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                        Online
                      </span>
                    </div>
                  </div>
                  <button className="ml-2 flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-600 hover:text-white dark:hover:bg-green-600 transition-colors duration-200">
                    <FaUserPlus size={14} />
                  </button>
                </div>
              </div>
              
              {/* Regular Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 flex items-center shadow-md hover:shadow-lg transition-shadow duration-200">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-lg">B</div>
                <div className="ml-4 flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">Bob Smith</h4>
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-1.5">Go</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">React</span>
                    <span className="flex items-center ml-auto text-xs text-gray-500 dark:text-gray-400">
                      <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600 mr-1"></span>
                      Available tonight
                    </span>
                  </div>
                </div>
                <button className="ml-2 flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-green-600 hover:text-white dark:hover:bg-green-600 transition-colors duration-200">
                  <FaUserPlus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Side */}
        <div className="md:w-1/2 p-8 md:p-10">
          <div className="inline-block text-base font-medium px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 rounded-full mb-3">
            Community
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-5 text-gray-900 dark:text-white">
            Find Your Coding Partner
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
            Accelerate your learning and tackle bigger projects by connecting with like-minded developers. 
            Pair program, collaborate, and build your portfolio together.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <FaUserCheck size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Skill Matching</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Connect with developers at your skill level</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <FaFilter size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Smart Filters</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Find buddies by language, timezone and availability</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <FaLaptopCode size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Built-in Collaboration</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Integrated tools for pair programming sessions</p>
              </div>
            </div>
          </div>
          
          <div className="inline-flex group">
            <button
              className="px-6 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-all duration-200 flex items-center justify-center"
              onClick={() => navigate("/community")}
            >
              <FaUsers className="mr-2" />
              <span>Find a Buddy</span>
              <div className="w-0 overflow-hidden group-hover:w-6 transition-all duration-300 ease-in-out">
                <FaArrowRight className="ml-2" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* AI Assistant Section */}
<section className="mb-24 relative z-10">
  <div className="relative">
    {/* Subtle background glow */}
    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-20"></div>
    
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-800 relative">
      <div className="flex flex-col md:flex-row">
        {/* Content Side */}
        <div className="md:w-1/2 p-8 md:p-10">
          <div className="inline-block text-base font-medium px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-full mb-3">
            AI Powered
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-5 text-gray-900 dark:text-white">
            Your Intelligent Coding Assistant
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300 leading-relaxed">
            Get personalized help, instant code reviews, and answers to your programming questions 
            with our advanced AI assistant available 24/7.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <FaLightbulb size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Smart Recommendations</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Personalized learning paths based on your progress</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <FaCode size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Code Analysis</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Instant feedback and optimization suggestions</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <FaClock size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Always Available</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">24/7 assistance whenever you need help</p>
              </div>
            </div>
          </div>
          
          <div className="inline-flex group">
            <button
              className="px-6 py-3 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition-all duration-200 flex items-center justify-center"
              onClick={() => navigate("/ai")}
            >
              <FaRobot className="mr-2" />
              <span>Talk to AI Assistant</span>
              <div className="w-0 overflow-hidden group-hover:w-6 transition-all duration-300 ease-in-out">
                <FaArrowRight className="ml-2" />
              </div>
            </button>
          </div>
        </div>
        
        {/* Visual Side */}
        <div className="md:w-1/2 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-900/20 dark:to-purple-900/20 p-8 md:p-10 flex items-center justify-center">
          <div className="relative ai-assistant-visual">
            {/* Orbital rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 rounded-full border border-indigo-200 dark:border-indigo-800 opacity-30 animate-spin-slow"></div>
              <div className="absolute h-72 w-72 rounded-full border border-purple-200 dark:border-purple-800 opacity-20 animate-spin-slow-reverse"></div>
              <div className="absolute h-40 w-40 rounded-full border border-blue-200 dark:border-blue-800 opacity-40 animate-spin-medium"></div>
            </div>
            
            {/* Main AI Circle */}
            <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group">
              {/* Glowing effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-70 blur-md group-hover:opacity-100 transition duration-200"></div>
              
              {/* Robot icon with pulse effect */}
              <div className="relative z-10 rounded-full h-28 w-28 bg-white dark:bg-gray-800 flex items-center justify-center">
                <FaRobot className="text-4xl text-indigo-600 dark:text-indigo-400" />
                
                {/* Pulsing circle */}
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-20"></div>
              </div>
            </div>
            
            {/* Orbiting elements */}
            <div className="absolute top-5 right-5 h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 shadow-md flex items-center justify-center text-white animate-float">
              <FaCode size={20} />
            </div>
            
            <div className="absolute bottom-10 right-10 h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 shadow-md flex items-center justify-center text-white animate-float-delayed">
              <FaBrain size={16} />
            </div>
            
            <div className="absolute bottom-5 left-5 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-md flex items-center justify-center text-white animate-float-reverse">
              <FaLightbulb size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
</main>
{/* Add necessary CSS */}
<style>{`
  /* Subtle animations */
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes float-delayed {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  
  @keyframes float-reverse {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(8px); }
  }
  
  .animate-float {
    animation: float 5s ease-in-out infinite;
  }
  
  .animate-float-delayed {
    animation: float-delayed 7s ease-in-out infinite;
  }
  
  .animate-float-reverse {
    animation: float-reverse 6s ease-in-out infinite;
  }
  
  .animate-spin-slow {
    animation: spin 30s linear infinite;
  }
  
  .animate-spin-slow-reverse {
    animation: spin 25s linear infinite reverse;
  }
  
  .animate-spin-medium {
    animation: spin 15s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Pulsing animations */
  @keyframes ping {
    0% { transform: scale(1); opacity: 1; }
    75%, 100% { transform: scale(1.5); opacity: 0; }
  }
  
  .animate-ping {
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  
  /* Group hover transitions */
  .group:hover .group-hover\\:w-6 {
    width: 1.5rem;
  }
`}</style>
    </div>
  );
};