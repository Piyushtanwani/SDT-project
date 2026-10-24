import React, { useEffect } from "react";

export const SocialMedia = () => {
  // Add custom animation keyframes on component mount
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-15px); }
        100% { transform: translateY(0px); }
      }
      
      @keyframes pulse-slow {
        0% { opacity: 0.4; }
        50% { opacity: 0.7; }
        100% { opacity: 0.4; }
      }
      
      .animate-float {
        animation: float 6s ease-in-out infinite;
      }
      
      .animate-pulse-slow {
        animation: pulse-slow 4s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen w-full p-4 bg-gray-900">
      <div className="w-full max-w-4xl min-h-[600px] bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 rounded-xl p-6 md:p-10 relative overflow-hidden shadow-2xl">
        {/* Animated background effects */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute w-1/3 h-1/3 max-w-[200px] max-h-[200px] top-10 left-10 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute w-1/2 h-1/2 max-w-[300px] max-h-[300px] bottom-10 right-10 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute w-1/4 h-1/4 max-w-[150px] max-h-[150px] top-1/2 left-1/3 bg-cyan-400 rounded-full blur-3xl opacity-10 animate-ping"></div>
        </div>
      
        <div className="relative z-10">
          <div className="flex flex-col items-center justify-center mt-8 md:mt-12">
            {/* Logo/Icon */}
            <div className="mb-4 md:mb-6">
              <svg className="w-20 h-20 md:w-28 md:h-28 text-blue-400 animate-float" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          
            {/* Headline */}
            <h1 className="text-3xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-cyan-200 to-purple-300 mb-4 md:mb-6 tracking-tight text-center">
              Coming Soon
            </h1>
            
            {/* Subtitle */}
            <div className="text-lg md:text-2xl text-blue-200 mb-8 md:mb-12 text-center max-w-2xl px-2">
              We're crafting our social media presence. Stay tuned for awesome content!
            </div>
            
            {/* Social Media Icons */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-10 md:mb-14">
              {/* Instagram */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse-slow"></div>
                <button className="relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-1">
                  <i className="fa-brands fa-instagram text-2xl md:text-3xl"></i>
                </button>
              </div>
              
              {/* Twitter */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse-slow"></div>
                <button className="relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-1">
                  <i className="fa-brands fa-twitter text-2xl md:text-3xl"></i>
                </button>
              </div>
              
              {/* Facebook */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse-slow"></div>
                <button className="relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-1">
                  <i className="fa-brands fa-facebook text-2xl md:text-3xl"></i>
                </button>
              </div>
              
              {/* LinkedIn */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse-slow"></div>
                <button className="relative flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-900 text-white hover:bg-blue-800 transition-all duration-300 transform group-hover:scale-110 group-hover:-translate-y-1">
                  <i className="fa-brands fa-linkedin text-2xl md:text-3xl"></i>
                </button>
              </div>
            </div>
          
            {/* Return to Home Button */}
            <a href="/" className="relative group">
              <span className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-cyan-500 blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500 rounded-full"></span>
              <button className="relative px-6 py-3 md:px-10 md:py-4 rounded-full text-lg md:text-xl font-bold text-white bg-blue-800/90 backdrop-blur-sm transition-all duration-500 transform group-hover:scale-105 group-hover:-translate-y-1 shadow-lg shadow-blue-500/50 group-hover:shadow-blue-400/70 overflow-hidden">
                <span className="relative z-10">Return to Home</span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 opacity-0 group-hover:opacity-40 transition-opacity duration-500"></span>
              </button>
            </a>
          </div>
        </div>
        
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 w-full left-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-300 to-purple-500"></div>
      </div>
    </div>
  );
};