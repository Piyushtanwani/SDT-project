import { useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebook, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa";

export const Footer = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Learn */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Learn</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link to="/courses" className="hover:text-indigo-400 transition-colors">Courses</Link>
              </li>
              <li>
                <Link to="/compiler" className="hover:text-indigo-400 transition-colors">Online Compiler</Link>
              </li>
              <li>
                <Link to="/ai" className="hover:text-indigo-400 transition-colors">AI Learning Assistant</Link>
              </li>
              <li>
                <Link to="/community" className="hover:text-indigo-400 transition-colors">Community Hub</Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Company</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link to="/about" className="hover:text-indigo-400 transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-indigo-400 transition-colors">Contact</Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-indigo-400 transition-colors">Leaderboard</Link>
              </li>
              <li>
                <Link to="/credential-verify" className="hover:text-indigo-400 transition-colors">Verify Certificate</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Legal</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link to="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-indigo-400 transition-colors">Cookie Policy</Link>
              </li>
            </ul>
          </div>

          {/* Subscribe */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Stay Updated</h3>
            <p className="text-sm text-slate-400">
              Get weekly curated coding challenges and free learning resources.
            </p>
            {submitted ? (
              <p className="text-emerald-400 text-sm font-medium">Thank you for subscribing!</p>
            ) : (
              <form
                className="flex items-center border border-slate-700 focus-within:border-indigo-500 rounded-lg overflow-hidden text-sm bg-slate-800/80 transition-all"
                onSubmit={handleSubmit}
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 bg-transparent text-white focus:outline-none placeholder-slate-500 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition-all text-white font-medium text-sm"
                >
                  Join
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Learn Without Limits. All rights reserved.</p>
          {/* Social Icons */}
          <div className="flex space-x-5 text-lg mt-3 md:mt-0">
            <Link to="/socialmedia" className="hover:text-indigo-400 transition-colors">
              <FaFacebook />
            </Link>
            <Link to="/socialmedia" className="hover:text-indigo-400 transition-colors">
              <FaTwitter />
            </Link>
            <Link to="/socialmedia" className="hover:text-indigo-400 transition-colors">
              <FaLinkedin />
            </Link>
            <Link to="/socialmedia" className="hover:text-indigo-400 transition-colors">
              <FaYoutube />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
