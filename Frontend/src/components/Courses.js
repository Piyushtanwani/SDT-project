import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BiSearch } from "react-icons/bi";
import { DiJava, DiReact } from "react-icons/di";
import { SiPython, SiMysql, SiMongodb, SiRust, SiCplusplus } from "react-icons/si";
import { FaArrowRight, FaStar, FaBookOpen } from "react-icons/fa";
import { API_BASE_URL } from "../config/api";

export const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  const apiUrl = API_BASE_URL;

  const fetchCourses = useCallback(async () => {
    try {
      setLoadError("");
      const response = await axios.get(`${apiUrl}/course/getCourses`);
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setLoadError("Could not load the course list. Check that the server is running, then try again.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const courseIcons = {
    python: <SiPython size={40} color="#306998" />,
    java: <DiJava size={40} color="#007396" />,
    "c++": <SiCplusplus size={40} color="#00599C" />,
    mysql: <SiMysql size={40} color="#4479A1" />,
    mongodb: <SiMongodb size={40} color="#47A248" />,
    rust: <SiRust size={40} color="#DEA584" />,
    react: <DiReact size={40} color="#61DAFB" />,
  };

  const CourseCard = ({ course }) => {
    const normalizedName = course.name.trim().toLowerCase();
    
    return (
      <div className="group relative h-full">
        <div className="lift relative bg-white dark:bg-gray-900 rounded-2xl p-6 ring-1 ring-gray-200/70 dark:ring-white/10 shadow-lg flex flex-col h-full">
          <div className="flex items-center mb-5">
            <div className="flex-shrink-0 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
              <span className="text-indigo-600 dark:text-indigo-400">
                {courseIcons[normalizedName] || <DiReact size={40} color="#61DAFB" />}
              </span>
            </div>
            <h2 className="ml-4 text-lg font-medium text-gray-900 dark:text-white">{course.name.trim()}</h2>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{course.description}</p>
          
          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
              <FaBookOpen className="mr-1" />
              {course.modulesCount ?? 0} modules
            </span>
            
            <div className="flex items-center">
              {typeof course.rating === "number" && (
                <span
                  className="mr-3 inline-flex items-center text-xs font-medium text-gray-700 dark:text-gray-300"
                  aria-label={`Average rating ${course.rating.toFixed(1)} out of 5`}
                >
                  <FaStar className="mr-1 text-yellow-500" aria-hidden="true" />
                  {course.rating.toFixed(1)}
                </span>
              )}
              <button
                onClick={() => navigate(`/course/${course.id}/modules`)}
                aria-label={`Open ${course.name.trim()} modules`}
                className="flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <FaArrowRight size={12} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <header className="text-center mb-12 relative">
          <p className="inline-block text-lg font-medium px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full mb-4">Expand Your Knowledge</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Available Courses
          </h1>
          <p className="text-lg mb-8 max-w-2xl mx-auto text-gray-700 dark:text-gray-300">
            Explore our comprehensive collection of programming courses designed to take your skills to the next level
          </p>
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-full max-w-md">
              <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Search Courses"
                aria-label="Search Courses"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-full border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:focus:ring-indigo-500 w-full shadow-md hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </header>

        {loadError && !loading ? (
          <div
            role="alert"
            className="mb-20 rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-200/70 dark:ring-white/10 shadow-md p-12 text-center"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">The course list did not load</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{loadError}</p>
            <button
              type="button"
              onClick={fetchCourses}
              className="min-h-[44px] px-6 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
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
          ) : filteredCourses.length > 0 ? (
            filteredCourses.map((course, index) => (
              <CourseCard key={course.id || index} course={course} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-900 rounded-2xl shadow-md">
              <div className="text-5xl mb-4" aria-hidden="true">😕</div>
              <h2 className="text-center text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm.trim() ? "No courses match that search" : "No courses yet"}
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400">
                {searchTerm.trim() ? "Try a shorter term, or the language name on its own." : "Courses appear here as soon as an admin publishes them."}
              </p>
              {searchTerm.trim() && (
                <button
                  className="mt-6 min-h-[44px] px-6 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all duration-200"
                  onClick={() => setSearchTerm("")}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
};