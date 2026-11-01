import { Link } from "react-router-dom";
import { FaFacebook, FaLinkedin, FaTwitter, FaYoutube } from "react-icons/fa";

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Learn */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Learn</h3>
            <ul className="space-y-1 text-slate-400 text-sm">
              <li>
                <Link to="/courses" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Courses</Link>
              </li>
              <li>
                <Link to="/compiler" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Online Compiler</Link>
              </li>
              <li>
                <Link to="/ai" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">AI Learning Assistant</Link>
              </li>
              <li>
                <Link to="/community" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Community Hub</Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Company</h3>
            <ul className="space-y-1 text-slate-400 text-sm">
              <li>
                <Link to="/contact" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Contact</Link>
              </li>
              <li>
                <Link to="/leaderboard" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Leaderboard</Link>
              </li>
              <li>
                <Link to="/credential-verify" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Verify Certificate</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Legal</h3>
            <ul className="space-y-1 text-slate-400 text-sm">
              <li>
                <Link to="/terms?tab=1" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/terms?tab=2" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms?tab=3" className="inline-flex min-h-[44px] items-center hover:text-indigo-400 transition-colors">Cookie Policy</Link>
              </li>
            </ul>
          </div>

          {/* Subscribe */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white tracking-wider uppercase">Stay Updated</h3>
            <p className="text-sm text-slate-400">
              Weekly curated coding challenges and free learning resources are shared in the community hub.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link
                to="/community"
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                Join the community
              </Link>
              <Link
                to="/contact"
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                Email us your question
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Learn Without Limits. All rights reserved.</p>
          {/* Social Icons */}
          <div className="flex mt-3 md:mt-0">
            <Link to="/socialmedia" aria-label="Learn Without Limits on Facebook" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-slate-800 hover:text-indigo-400 transition-colors">
              <FaFacebook />
            </Link>
            <Link to="/socialmedia" aria-label="Learn Without Limits on Twitter" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-slate-800 hover:text-indigo-400 transition-colors">
              <FaTwitter />
            </Link>
            <Link to="/socialmedia" aria-label="Learn Without Limits on LinkedIn" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-slate-800 hover:text-indigo-400 transition-colors">
              <FaLinkedin />
            </Link>
            <Link to="/socialmedia" aria-label="Learn Without Limits on YouTube" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-slate-800 hover:text-indigo-400 transition-colors">
              <FaYoutube />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
