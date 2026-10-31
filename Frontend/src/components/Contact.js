import {
  faFacebookF,
  faInstagram,
  faLinkedin,
  faXTwitter,
} from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";

export const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSending(true);
    const formData = new FormData(e.target);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setIsSubmitted(true);
        e.target.reset();
        setTimeout(() => setIsSubmitted(false), 2500);
      } else {
        setError("We couldn't send your message right now. Please email us at bitecodes.global@gmail.com.");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setError("We couldn't send your message right now. Please email us at bitecodes.global@gmail.com.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="webcrumbs">
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-indigo-950">
        {/* Success Animation */}
        {isSubmitted && (
          <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm transition-all">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl text-center animate-pop-in">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="checkmark animate-checkmark"
                  viewBox="0 0 52 52"
                  style={{ width: 32, height: 32 }}
                >
                  <path
                    className="checkmark__check"
                    fill="none"
                    stroke="#FFF"
                    strokeWidth="4"
                    strokeLinecap="round"
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Success!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our team will reach out to you shortly!
              </p>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-16">
          <section className="text-left max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 ring-1 ring-gray-200/50 dark:ring-gray-800">
            <h2 className="text-4xl font-bold text-center mb-8 animate-pulse text-gray-900 dark:text-white">
              Contact Us
            </h2>
            <form
              onSubmit={handleSubmit}
              method="POST"
              className="grid md:grid-cols-2 gap-12"
            >
              <input
                type="hidden"
                name="access_key"
                value="87c6a13e-cb0a-4053-991b-c8c151167bff"
              ></input>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    required
                    type="text"
                    name="Name"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Your Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    name="Email"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Subject
                  </label>
                  <input
                    required
                    type="text"
                    name="Query"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Message
                  </label>
                  <textarea
                    required
                    name="Message"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 h-32 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Your message here..."
                  />
                </div>

                <button
                  disabled={isSending}
                  className="w-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white px-6 py-3 rounded-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSending ? "Sending..." : "Send Message"}
                </button>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Get in Touch</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    We'd love to hear from you. Our friendly team is always here
                    to chat.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/30 transition-colors duration-200">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                        location_on
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Office</h4>
                      <p className="text-gray-600 dark:text-gray-400">Ahmedabad</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/30 transition-colors duration-200">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">
                        mail
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Email</h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        bitecodes.global@gmail.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/30 transition-colors duration-200">
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                        phone
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Phone</h4>
                      <p className="text-gray-600 dark:text-gray-400">+91 94287-67709</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Follow Us</h3>
                  <div className="flex space-x-4">
                    <a
                      href="/socialmedia"
                      className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                      aria-label="Facebook (coming soon)"
                    >
                      <FontAwesomeIcon icon={faFacebookF} className="text-gray-600 dark:text-gray-400" />
                    </a>
                    <a
                      href="/socialmedia"
                      className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                      aria-label="X (coming soon)"
                    >
                      <FontAwesomeIcon icon={faXTwitter} className="text-gray-600 dark:text-gray-400" />
                    </a>
                    <a
                      href="https://www.linkedin.com/in/bite-codes/"
                      rel="noreferrer"
                      target="_blank"
                      className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <FontAwesomeIcon icon={faLinkedin} className="text-gray-600 dark:text-gray-400" />
                    </a>
                    <a
                      href="https://www.instagram.com/bitecodes.co"
                      rel="noreferrer"
                      target="_blank"
                      className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <FontAwesomeIcon icon={faInstagram} className="text-gray-600 dark:text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
};
export default Contact;