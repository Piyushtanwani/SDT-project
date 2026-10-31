import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const POLICY_TABS = ['License Agreement', 'Terms & Conditions', 'Privacy Policy', 'Cookie Policy'];

const LegalTermsPage = () => {
  const [searchParams] = useSearchParams();
  // Footer links deep-link a policy tab (?tab=2 → Privacy Policy).
  const initialTab = Number(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState(
    Number.isInteger(initialTab) && initialTab >= 0 && initialTab < POLICY_TABS.length ? initialTab : 0
  );
  const [animating, setAnimating] = useState(false);

  const handleTabChange = (index) => {
    if (index !== activeTab) {
      setAnimating(true);
      setActiveTab(index);

      // Reset animation state after animation completes
      setTimeout(() => {
        setAnimating(false);
      }, 400);
    }
  };

  useEffect(() => {
    // Add a subtle entrance animation when component mounts
    const header = document.querySelector('.header-animation');
    if (header) {
      header.style.opacity = '1';
      header.style.transform = 'translateY(0)';
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className={`p-6 ${animating ? 'animate-fade-in' : ''}`}>
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">End User License Agreement (EULA)</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Effective Date: February 26, 2025</p>

              <p className="mb-4 text-gray-700 dark:text-gray-300">
                This End User License Agreement ("Agreement") is a legal agreement between you (either an individual or a single entity) 
                and our eLearning platform for the use of our educational content and services.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">1. License Grant</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Subject to the terms of this Agreement, we grant you a limited, non-exclusive, non-transferable, 
                revocable license to access and use our Services for personal, non-commercial educational purposes.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">2. Content License</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                All course materials, including but not limited to videos, presentations, documents, quizzes, and exercises, 
                are our property or that of our content partners and are protected by intellectual property laws.
              </p>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Your purchase of a course or subscription grants you a limited license to access and use the Content for 
                personal educational purposes only. You may not:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li className="mb-2">Copy, reproduce, or download Content except as explicitly permitted</li>
                <li className="mb-2">Distribute, publicly display, publicly perform, or broadcast any Content</li>
                <li className="mb-2">Modify, adapt, translate, or create derivative works based on the Content</li>
                <li className="mb-2">Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li className="mb-2">Remove any copyright, trademark, or other proprietary notices</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">3. Account Responsibility</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">4. Disclaimer of Warranty</h3>
              <p className="mb-4 uppercase text-sm text-gray-700 dark:text-gray-300">
                The service is provided "as is" without warranty of any kind, either express or implied, including without 
                limitation any implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
              </p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className={`p-6 ${animating ? 'animate-fade-in' : ''}`}>
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Terms and Conditions</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Last Updated: February 26, 2025</p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">1. Acceptance of Terms</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                By accessing or using our Platform, you agree to be bound by these Terms and Conditions and our Privacy Policy. 
                If you do not agree to these terms, please do not use our Platform.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">2. Registration and User Accounts</h3>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Account Creation:</strong> To access certain features of the Platform, you must register for an account. 
                You agree to provide accurate, current, and complete information during the registration process.
              </p>

              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Account Security:</strong> You are responsible for safeguarding your password and for all activities 
                that occur under your account. Notify us immediately if you suspect any unauthorized use of your account.
              </p>

              <p className="mb-4 text-gray-700 dark:text-gray-300">
                <strong>Age Restriction:</strong> You must be at least 16 years old to create an account. If you are under 18, 
                you represent that you have your parent's or legal guardian's permission to use the Platform.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">3. Course Enrollment and Completion</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                When you enroll in a course, you gain access to the educational content for personal use. Course completion 
                is based on satisfying all requirements as specified in the course. Certificates are issued upon successful completion.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">4. User Content</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                You retain ownership of any content you submit, post, or display on or through the Platform. By submitting content, 
                you grant us a worldwide, non-exclusive, royalty-free license to use, copy, modify, create derivative works from, 
                distribute, publicly display, and publicly perform your content for the purposes of operating and improving the Platform.
              </p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className={`p-6 ${animating ? 'animate-fade-in' : ''}`}>
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Privacy Policy</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Last Updated: February 26, 2025</p>

              <p className="mb-4 text-gray-700 dark:text-gray-300">
                This Privacy Policy describes how we collect, use, and disclose information when you use our eLearning platform.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">1. Information We Collect</h3>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Personal Information:</strong> When you register, we collect your name, email address, and password.
              </p>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Profile Information:</strong> You may choose to provide additional information such as profile picture, 
                biography, educational background, and professional information.
              </p>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Course Data:</strong> We collect information about the courses you enroll in, your progress, 
                quiz and assignment results, and certificates earned.
              </p>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                <strong>Usage Data:</strong> We automatically collect information about how you interact with our platform, 
                including access times, pages viewed, and the time spent on various pages.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">2. How We Use Your Information</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">We use your information to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li className="mb-2">Provide, maintain, and improve our services</li>
                <li className="mb-2">Process transactions and send related information</li>
                <li className="mb-2">Track your progress and issue certificates</li>
                <li className="mb-2">Personalize your experience and provide content recommendations</li>
                <li className="mb-2">Communicate with you about new courses, features, and updates</li>
                <li className="mb-2">Respond to your comments, questions, and support requests</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">3. Sharing Your Information</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">We do not sell your personal information. We may share your information with:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
                <li className="mb-2">Service providers who help us operate our platform</li>
                <li className="mb-2">Instructors, solely for course-related communications</li>
                <li className="mb-2">Other users, if you choose to make your profile or activity public</li>
                <li className="mb-2">Legal authorities when required by law</li>
              </ul>
            </div>
          </div>
        );
      case 3:
        return (
          <div className={`p-6 ${animating ? 'animate-fade-in' : ''}`}>
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Cookie Policy</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Last Updated: February 26, 2025</p>

              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Our website uses cookies to enhance your browsing experience, analyze site traffic, and personalize content.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">1. What Are Cookies</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Cookies are small text files that are stored on your device when you visit a website. They are widely used to make 
                websites work more efficiently and provide information to the website owners.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">2. Types of Cookies We Use</h3>
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Essential Cookies:</strong> These cookies are necessary for the website to function properly 
                and cannot be switched off in our systems. They are usually only set in response to actions made by you, such as setting 
                your privacy preferences, logging in, or filling in forms.
              </p>

              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Analytical Cookies:</strong> These cookies allow us to count visits and traffic sources so we 
                can measure and improve the performance of our site. They help us know which pages are the most and least popular and see 
                how visitors move around the site.
              </p>

              <p className="mb-2 text-gray-700 dark:text-gray-300">
                <strong>Functional Cookies:</strong> These cookies enable the website to provide enhanced functionality 
                and personalization. They may be set by us or by third-party providers whose services we have added to our pages.
              </p>

              <p className="mb-4 text-gray-700 dark:text-gray-300">
                <strong>Targeting Cookies:</strong> These cookies may be set through our site by our advertising partners. 
                They may be used by those companies to build a profile of your interests and show you relevant advertisements on other sites.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">3. Managing Cookies</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of 
                websites to set cookies, you may impact your overall user experience. To find out more about cookies, including how to see 
                what cookies have been set and how to manage and delete them, visit{' '}
                <a href="https://www.allaboutcookies.org" className="text-blue-600 dark:text-blue-400 hover:underline">
                  www.allaboutcookies.org
                </a>.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">4. Cookie Consent</h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                When you first visit our website, you will be presented with a cookie banner that allows you to accept or decline non-essential cookies.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 dark:bg-gradient-to-b dark:from-gray-950 dark:to-gray-900">
      {/* Add custom animation keyframes */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes slideIn {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
            70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          }

          .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
          }

          .header-animation {
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.8s ease-out;
          }

          .tab-item {
            position: relative;
            transition: all 0.3s ease;
          }

          .tab-item:hover {
            background-color: rgba(59, 130, 246, 0.1);
          }

          .tab-item::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 50%;
            width: 0;
            height: 2px;
            background-color: #3b82f6;
            transition: all 0.3s ease;
            transform: translateX(-50%);
          }

          .dark .tab-item::after {
            background-color: #60a5fa;
          }

          .tab-item:hover::after {
            width: 70%;
          }

          .tab-item.active::after {
            width: 100%;
          }

          .content-card {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            transition: all 0.3s ease;
          }

          .dark .content-card {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          }

          .content-card:hover {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            transform: translateY(-2px);
          }

          .dark .content-card:hover {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>

      <div className="max-w-5xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 header-animation">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl mb-3 inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500">
            Legal Terms & Policies
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 mx-auto mt-2 mb-6 rounded-full"></div>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Please review our legal terms and policies to understand your rights and responsibilities.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden content-card transition-all duration-300">
          <div className="flex flex-wrap sm:flex-nowrap border-b border-gray-100 dark:border-gray-700" role="tablist" aria-label="Policy sections">
            {POLICY_TABS.map((tab, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                id={`policy-tab-${index}`}
                aria-selected={activeTab === index}
                aria-controls={`policy-panel-${activeTab}`}
                onClick={() => handleTabChange(index)}
                className={`tab-item flex-1 py-5 px-4 text-center font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${
                  activeTab === index ? 'active bg-blue-50 dark:bg-indigo-900/30 text-blue-700 dark:text-blue-400 font-semibold' : ''
                }`}
                style={{
                  animation: activeTab === index ? 'pulse 2s infinite' : 'none',
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <span
                  className="relative inline-block"
                  style={{
                    animation: activeTab === index ? 'slideIn 0.3s ease-out forwards' : 'none',
                  }}
                >
                  {tab}
                  {activeTab === index && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-500 dark:bg-blue-400 transform origin-left"></span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div
            className="relative overflow-hidden"
            role="tabpanel"
            id={`policy-panel-${activeTab}`}
            aria-labelledby={`policy-tab-${activeTab}`}
          >
            {renderTabContent()}
          </div>
        </div>

        <div className="mt-12 text-center header-animation" style={{ transitionDelay: '0.3s' }}>
          <p className="text-gray-600 dark:text-gray-400">
            If you have any questions about our policies, please contact us at{' '}
            <a
              href="mailto:legal@yourelearning.com"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline relative inline-block transition-all duration-300"
            >
              legal@yourelearning.com
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 dark:bg-blue-300 transform scale-x-0 transition-transform duration-300 origin-left hover:scale-x-100"></span>
            </a>
          </p>

          <div className="mt-8">
            <button className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-50 transition-all duration-300 transform hover:-translate-y-1">
              Download All Policies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalTermsPage;