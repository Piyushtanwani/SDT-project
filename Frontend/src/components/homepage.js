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
  FaClock 
} from "react-icons/fa";
import { BsCodeSquare } from "react-icons/bs";
import { Binary, Database, GitBranch, Sparkles, Sun } from "lucide-react";
import { API_BASE_URL } from "../config/api";

const heroSamples = [
  {
    subject: "Version Control",
    difficulty: "Medium",
    icon: GitBranch,
    text: "After a rebase, why does the same commit show up under a brand new hash?",
  },
  {
    subject: "Databases",
    difficulty: "Hard",
    icon: Database,
    text: "When does SELECT * cost you an index-only scan and force a full table read?",
  },
  {
    subject: "Algorithms",
    difficulty: "Easy",
    icon: Binary,
    text: "What input actually drives quicksort down to O(n²) — and why that one?",
  },
];

export const HomePage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liftedCard, setLiftedCard] = useState(null);
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const heroRef = useRef(null);

  // Pointer parallax for the hero decorations. Written straight to CSS custom
  // properties inside a rAF so moving the mouse never re-renders the page, and
  // skipped entirely for touch and reduced-motion users.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const write = (x, y) => {
      el.style.setProperty("--hx", `${(x * 26).toFixed(1)}px`);
      el.style.setProperty("--hy", `${(y * 18).toFixed(1)}px`);
    };
    const onMove = (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = el.getBoundingClientRect();
        write((event.clientX - rect.left) / rect.width - 0.5, (event.clientY - rect.top) / rect.height - 0.5);
      });
    };
    const onLeave = () => write(0, 0);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

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
      <div className="group relative bg-white dark:bg-gray-900 rounded-xl p-6 ring-1 ring-gray-200/50 dark:ring-gray-800 flex flex-col h-full">
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
              <div className="flex mr-2" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400 text-xs" />
                ))}
              </div>
              <button 
                onClick={() => navigate(`/course/${course.id}/modules`)}
                aria-label={`Open ${course.name.trim()} modules`}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300"
              >
                <FaArrowRight size={12} />
              </button>
            </div>
          </div>
      </div>
    );
  };

  // Premium Feature Card
  const FeatureCard = ({ icon, title, description, buttonText, onClick }) => {
    return (
      <div className="group relative bg-white dark:bg-gray-900 rounded-xl p-6 ring-1 ring-gray-200/50 dark:ring-gray-800 flex flex-col h-full">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 mb-2 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
              <span className="text-indigo-600 dark:text-indigo-400">
                {icon}
              </span>
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{description}</p>
          
          <button 
            onClick={onClick}
            className="mt-auto flex items-center justify-center py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors duration-200"
          >
            {buttonText}
            <FaArrowRight className="ml-2 text-xs" />
          </button>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Section */}
      <section ref={heroRef} className="relative isolate -mt-16 overflow-hidden pt-28 pb-20 md:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 dark:hidden"
          style={{ background: "linear-gradient(115deg, #E9E4FA 0%, #F3EFFA 45%, #FBF2E7 100%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{ background: "linear-gradient(115deg, #191634 0%, #131226 48%, #0B0B18 100%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(93,86,160,0.16) 1px, transparent 1px), linear-gradient(0deg, rgba(93,86,160,0.16) 1px, transparent 1px)",
            backgroundSize: "72px 12px, 12px 72px",
            maskImage: "radial-gradient(ellipse 72% 62% at 50% 38%, #000 25%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse 72% 62% at 50% 38%, #000 25%, transparent 78%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[7%] top-[30%] hidden h-12 w-12 items-center justify-center rounded-full bg-indigo-300 text-indigo-900 shadow-[0_14px_30px_-10px_rgba(23,20,41,0.5)] ring-1 ring-black/5 md:flex dark:bg-indigo-400/80 dark:text-indigo-950"
          style={{ transform: "translate3d(calc(var(--hx, 0px) * 1.5), calc(var(--hy, 0px) * 1.5), 0)" }}
        >
          <Sparkles size={20} />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[9%] top-[46%] hidden h-11 w-11 items-center justify-center rounded-full bg-amber-300 text-amber-900 shadow-[0_14px_30px_-10px_rgba(23,20,41,0.5)] ring-1 ring-black/5 md:flex dark:bg-amber-300/85 dark:text-amber-950"
          style={{ transform: "translate3d(calc(var(--hx, 0px) * -1.2), calc(var(--hy, 0px) * -1.2), 0)" }}
        >
          <Sun size={18} />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-serif text-[2.6rem] leading-[1.08] tracking-[-0.02em] text-[#171429] sm:text-6xl md:text-[4.25rem] dark:text-white">
            <span className="block">Find out what you</span>
            <span className="block">actually know.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-[#5B5870] sm:text-lg dark:text-gray-300">
            Objective-type assessments, a code compiler that runs in your browser, and a community of people
            who already hit the same wall.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/courses")}
              className="rounded-full bg-[#171429] px-7 py-3.5 text-base font-semibold text-white transition-colors duration-200 hover:bg-[#2A2545] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100"
            >
              Explore courses
            </button>
            <button
              type="button"
              onClick={() => navigate("/ai")}
              className="rounded-full bg-white/70 px-7 py-3.5 text-base font-semibold text-[#171429] ring-1 ring-black/10 backdrop-blur-sm transition-colors duration-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:bg-white/10 dark:text-white dark:ring-white/20 dark:hover:bg-white/20"
            >
              Ask the AI tutor
            </button>
          </div>
        </div>

        <div
          className="relative mx-auto mt-16 flex max-w-4xl justify-center px-4"
          style={{ transform: "translate3d(calc(var(--hx, 0px) * 0.35), calc(var(--hy, 0px) * 0.35), 0)" }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 120 100"
            className="pointer-events-none absolute -top-14 left-2 hidden w-36 text-indigo-300 sm:block lg:left-10 dark:text-indigo-500/50"
          >
            <path
              d="M60 4C90 4 116 26 116 58c0 26-25 38-56 38S4 84 4 58C4 26 30 4 60 4Z"
              fill="currentColor"
            />
            <circle cx="44" cy="54" r="6" className="fill-[#171429] dark:fill-white" />
            <circle cx="76" cy="54" r="6" className="fill-[#171429] dark:fill-white" />
            <circle cx="46" cy="52" r="2" className="fill-white" />
            <circle cx="78" cy="52" r="2" className="fill-white" />
          </svg>

          {heroSamples.map((sample, index) => {
            const center = index === 1;
            const lifted = liftedCard === index;
            const receding = liftedCard !== null && !lifted;
            const rotation = center ? 0 : index === 0 ? -7 : 7;
            const Icon = sample.icon;
            return (
              <button
                key={sample.subject}
                type="button"
                onClick={() => navigate("/courses")}
                onMouseEnter={() => setLiftedCard(index)}
                onMouseLeave={() => setLiftedCard(null)}
                onFocus={() => setLiftedCard(index)}
                onBlur={() => setLiftedCard(null)}
                aria-label={`${sample.subject} sample question: ${sample.text} Browse courses`}
                style={{
                  transform: `rotate(${lifted ? 0 : rotation}deg) translateY(${lifted ? -12 : center ? 0 : 18}px) scale(${
                    receding ? 0.98 : lifted ? 1.03 : 1
                  })`,
                  opacity: receding ? 0.72 : 1,
                  zIndex: lifted ? 40 : center ? 30 : 20,
                }}
                className={`w-[16rem] shrink-0 rounded-2xl px-5 py-6 text-center shadow-[0_22px_45px_-22px_rgba(23,20,41,0.45)] transition-[transform,opacity] duration-300 ease-out will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:-mx-3 ${
                  center
                    ? "bg-indigo-100 ring-1 ring-indigo-200/80 dark:bg-indigo-500/15 dark:ring-indigo-400/25"
                    : "hidden bg-[#FBF7EF] ring-1 ring-black/5 sm:block dark:bg-gray-900 dark:ring-white/10"
                }`}
              >
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/85 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/15">
                  <Icon size={16} className="text-indigo-600 dark:text-indigo-300" />
                </span>
                <span className="mt-4 block font-serif text-[15px] leading-snug text-[#171429] dark:text-white">
                  {sample.text}
                </span>
                <span className="mt-4 block text-xs text-[#565371] dark:text-gray-400">
                  {sample.subject}
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  {sample.difficulty}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
                  <div className="mr-4 text-gray-400 select-none text-xs">
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
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-green-700 to-green-800 shadow-xl flex items-center justify-center text-white text-lg font-bold">JS</div>
                </div>
              </div>
              
              <div className="avatar-container absolute left-1/2 transform -translate-x-1/2 z-20">
                <div className="relative">
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-xl flex items-center justify-center text-white text-xl font-bold">PY</div>
                </div>
              </div>
              
              <div className="avatar-container absolute left-3/4 transform -translate-x-1/2 z-10">
                <div className="relative">
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-pink-600 to-pink-700 shadow-xl flex items-center justify-center text-white text-lg font-bold">GO</div>
                </div>
              </div>
            </div>
            
            {/* Buddy Cards */}
            <div className="space-y-4">
              {/* Active Card with Glow Effect */}
              <div className="relative group">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 flex items-center shadow-md">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 flex items-center justify-center text-green-700 dark:text-green-300 font-medium text-lg">A</div>
                  <div className="ml-4 flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">Alice Johnson</h4>
                    <div className="flex items-center mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 mr-1.5">Python</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">JavaScript</span>
                      <span className="flex items-center ml-auto text-xs text-green-700 dark:text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                        Online
                      </span>
                    </div>
                  </div>
                  <button className="ml-2 flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-600 hover:text-white dark:hover:bg-green-600 transition-colors duration-200" aria-hidden="true" tabIndex={-1}>
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
                <button className="ml-2 flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-green-600 hover:text-white dark:hover:bg-green-600 transition-colors duration-200" aria-hidden="true" tabIndex={-1}>
                  <FaUserPlus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Side */}
        <div className="md:w-1/2 p-8 md:p-10">
          <div className="inline-block text-base font-medium px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full mb-3">
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
              className="px-6 py-3 bg-green-700 text-white rounded-lg shadow-md hover:bg-green-800 transition-all duration-200 flex items-center justify-center"
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
    
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-800 relative">
      <div className="flex flex-col md:flex-row">
        {/* Content Side */}
        <div className="md:w-1/2 p-8 md:p-10">
          <div className="inline-block text-base font-medium px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full mb-3">
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
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                <FaLightbulb size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Smart Recommendations</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Personalized learning paths based on your progress</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                <FaCode size={16} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white text-left">Code Analysis</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Instant feedback and optimization suggestions</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
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
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center"
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
        <div className="md:w-1/2 bg-gray-100 dark:bg-gray-900 p-8 md:p-10 flex items-center justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-indigo-600">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white dark:bg-gray-800">
              <FaRobot className="text-4xl text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
</div>
    </div>
  );
};