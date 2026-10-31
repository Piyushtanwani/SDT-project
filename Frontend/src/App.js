import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import { AddCourse } from "./components/AddCourse";
import AddModule from "./components/AddModule";
import { AdminCoursePanel } from "./components/AdminCoursesPanel";
import AdminPanel from "./components/AdminPanel";
import { Contact } from "./components/Contact";
import { CourseModule } from "./components/CourseModule";
import CourseModuleDetail from "./components/CourseModuleDetail";
import { Courses } from "./components/Courses";
import { ExamResult } from "./components/ExamResult";
import { Footer } from "./components/Footer";
import { HomePage } from "./components/homepage";
import { LoginSignup } from "./components/login-signup";
import ModuleList from "./components/ModuleList";
import { Navbar } from "./components/Navbar";
import { Profile } from "./components/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Register } from "./components/register";
import { ShowCertificates } from "./components/ShowCertificates";
import { TakeExam } from "./components/TakeExam";
import { UpdateProfile } from "./components/UpdateProfile";
import { UserAttempts } from "./components/UserAttempts";
import { VerifyOtp } from "./components/verifyotp";
import { VerifyCredential } from "./components/VerifyCredential";

import { LeaderBoard } from "./components/LeaderBoard";
import { CertificateQr } from "./components/CertificateQr";
import { SocialMedia } from "./components/SocialMedia";
import LegalTermsPage from "./components/LegalTermsPage";
import AI from "./components/AI";
import OnlineCompiler from "./components/Compiler";
import CommunityPage from "./components/CommunityPage";
import ChatPage from "./components/Chatpage";
import AdminUserPanel from "./components/AdminUserPanel";
import Connections from "./components/Connections";
import ScrollToTop from "./components/ScrollToTop";
import AdminSkillPanel from "./components/AdminSkillpanel";
import ProtectedAdmin from "./components/ProtectedAdmin";
import ErrorBoundary from "./components/ErrorBoundary";

const NotFound = () => (
  <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
    <p className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">404</p>
    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
      We couldn't find that page
    </h1>
    <p className="text-sm text-gray-600 dark:text-gray-300">
      The link may be out of date, or the page may have moved.
    </p>
    <Link
      to="/courses"
      className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
    >
      Browse courses
    </Link>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <ScrollToTop />
          {/* Keyboard users land on the navigation on every page; this jumps past it. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" tabIndex={-1}>
            <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/login" element={<LoginSignup />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/credential/:credentialId" element={<CertificateQr />} />
            <Route path="/socialmedia" element={<SocialMedia />} />
            <Route path="/terms" element={<LegalTermsPage />} />
            <Route path="/compiler" element={<OnlineCompiler />} />
            <Route
              path="/course/:courseId/module/:moduleNumber"
              element={<CourseModuleDetail />}
            />
            <Route path="/course/:courseId/modules" element={<CourseModule />} />
            <Route path="/leaderboard" element={<LeaderBoard />} />
            <Route path="/credential-verify" element={<VerifyCredential />} />
            <Route path="/ai" element={<AI />} />
            <Route path="/course/:courseId/exam" element={<ProtectedRoute><TakeExam /></ProtectedRoute>} />
            <Route path="/certificates" element={<ProtectedRoute><ShowCertificates /></ProtectedRoute>} />
            <Route path="/result/:attemptId" element={<ProtectedRoute><ExamResult /></ProtectedRoute>} />
            <Route path="/attempts" element={<ProtectedRoute><UserAttempts /></ProtectedRoute>} />

            {/* Admin */}
            <Route element={<ProtectedAdmin />}>
              <Route path="/admincourses" element={<AdminCoursePanel />} />
              <Route path="/admin/*" element={<AdminPanel />} />
              <Route path="/admin/skills" element={<AdminSkillPanel />} />
              <Route path="/admin/add-course" element={<AddCourse />} />
              <Route path="/course/add-module" element={<AddModule />} />
              <Route path="/course/modules" element={<ModuleList />} />
              <Route path="/admin/users" element={<AdminUserPanel />} />
            </Route>

            <Route
              path="/updateprofile"
              element={
                <ProtectedRoute>
                  <UpdateProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
