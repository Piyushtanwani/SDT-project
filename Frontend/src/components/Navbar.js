import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, User, Award, Clock, LogOut, Settings } from "lucide-react";

export const Navbar = () => {
  const { logout, isAuthenticated, userFirstName, userEmail, role } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/");
    window.scrollTo(0, 0); // Scroll to top
    setIsMobileMenuOpen(false); // Close mobile menu on logout
  };

  const handleLoginSignup = () => {
    navigate("/login");
    window.scrollTo(0, 0); // Scroll to top
    setIsMobileMenuOpen(false); // Close mobile menu on login/signup
  };

  const handleNavigation = (path) => {
    navigate(path);
    window.scrollTo(0, 0); // Scroll to top
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Check if user is admin
  const isAdmin = (role && role.toUpperCase() === "ADMIN") || userEmail === "bitecodes.global@gmail.com";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        event.target.id !== "mobile-menu-button"
      ) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Navigation links array for DRY code
  const navLinks = [
    { title: "Courses", path: "/courses" },
    { title: "AI Assistant", path: "/ai" },
    { title: "Compiler", path: "/compiler" },
    { title: "Community", path: "/community" },
    { title: "LeaderBoard", path: "/leaderboard" },
    { title: "Credential", path: "/credential-verify" },
    { title: "About", path: "/about" },
    { title: "Contact", path: "/contact" },
  ];

  return (
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 dark:from-indigo-500 dark:via-purple-400 dark:to-indigo-500 bg-clip-text text-transparent">
                <button
                  onClick={() => {
                    navigate("/");
                    window.scrollTo(0, 0);
                  }}
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-300 flex items-center"
                >
                  Learn Without Limits
                </button>
              </h1>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    window.scrollTo(0, 0);
                  }}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  {link.title}
                </button>
              ))}
            </div>

            {/* Authentication Section for Desktop */}
            <div className="hidden md:flex items-center space-x-3">


              {isAuthenticated ? (
                <div className="relative ml-3" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/30 transition-all duration-200"
                  >
                    <span className="font-medium mr-1">
                      {userFirstName || "User"}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fadeIn">
                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate("/profile");
                            window.scrollTo(0, 0);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                        >
                          <span className="material-symbols-outlined mr-3 text-indigo-500 dark:text-indigo-400">person</span>
                          <span>Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate("/certificates");
                            window.scrollTo(0, 0);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                        >
                          <span className="material-symbols-outlined mr-3 text-indigo-500 dark:text-indigo-400">license</span>
                          <span>My Certifications</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate("/attempts");
                            window.scrollTo(0, 0);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                        >
                          <span className="material-symbols-outlined mr-3 text-indigo-500 dark:text-indigo-400">history</span>
                          <span>Attempts</span>
                        </button>
                        <button
                          onClick={() => handleNavigation("/connections")}
                          className="w-full text-left flex items-center px-4 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200"
                        >
                          <span className="material-symbols-outlined mr-3 text-indigo-500 dark:text-indigo-400">group</span>
                          <span>Connections</span>
                        </button>
                        
                        {/* Admin Button - Only shown for specific email */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              navigate("/admin");
                              window.scrollTo(0, 0);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                          >
                            <Settings size={18} className="mr-3 text-purple-500 dark:text-purple-400" />
                            <span className="font-medium text-purple-600 dark:text-purple-400">Admin Panel</span>
                          </button>
                        )}
                        
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                        >
                          <LogOut size={18} className="mr-3" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleLoginSignup}
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Login / Signup
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-1">
            
              
              <button
                id="mobile-menu-button"
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-all duration-200"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          ref={mobileMenuRef}
          className={`md:hidden transition-all duration-300 ease-in-out transform ${
            isMobileMenuOpen
              ? "opacity-100 translate-y-0 max-h-screen"
              : "opacity-0 -translate-y-4 max-h-0 overflow-hidden"
          } bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-inner`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavigation(link.path)}
                className="w-full text-left block px-4 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200"
              >
                {link.title}
              </button>
            ))}
          </div>

          {/* Mobile Authentication Menu */}
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-800">
            {isAuthenticated ? (
              <div className="px-2 space-y-1">
                <div className="px-4 py-2 text-center">
                  <span className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                    Hi, {userFirstName || "User"}!
                  </span>
                </div>
                <button
                  onClick={() => handleNavigation("/profile")}
                  className="w-full text-left flex items-center px-4 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200"
                >
                  <User size={18} className="mr-3 text-indigo-500 dark:text-indigo-400" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => handleNavigation("/certificates")}
                  className="w-full text-left flex items-center px-4 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200"
                >
                  <Award size={18} className="mr-3 text-indigo-500 dark:text-indigo-400" />
                  <span>My Certifications</span>
                </button>
                <button
                  onClick={() => handleNavigation("/attempts")}
                  className="w-full text-left flex items-center px-4 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200"
                >
                  <Clock size={18} className="mr-3 text-indigo-500 dark:text-indigo-400" />
                  <span>Attempts</span>
                </button>
                <button
                  onClick={() => handleNavigation("/connections")}
                  className="w-full text-left flex items-center px-4 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200"
                >
                  <span className="material-symbols-outlined mr-3 text-indigo-500 dark:text-indigo-400">group</span>
                  <span>Connections</span>
                </button>
                
                {/* Admin Button for Mobile - Only shown for specific email */}
                {isAdmin && (
                  <button
                    onClick={() => handleNavigation("/admin")}
                    className="w-full text-left flex items-center px-4 py-3 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200"
                  >
                    <Settings size={18} className="mr-3 text-purple-500 dark:text-purple-400" />
                    <span className="font-medium text-purple-600 dark:text-purple-400">Admin Panel</span>
                  </button>
                )}
                
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full mt-4 px-4 py-3 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
                >
                  <LogOut size={18} className="mr-3" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="px-5 py-4 flex justify-center">
                <button
                  onClick={handleLoginSignup}
                  className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg font-medium hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800"
                >
                  Login / Signup
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
  );
};