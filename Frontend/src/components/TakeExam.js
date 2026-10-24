import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

export const TakeExam = () => {
  const { courseId } = useParams();
  const userId = sessionStorage.getItem("userId");
  const navigate = useNavigate();
  
  // Refs for handling focus trapping
  const modalRef = useRef(null);
  const firstFocusableElementRef = useRef(null);
  const lastFocusableElementRef = useRef(null);
  
  // State for popup modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [attemptedToLeave, setAttemptedToLeave] = useState(false);
  
  // Exam states
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(40 * 60);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const apiUrl = useMemo(() => 
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API,
    []
  );

  // Fetch questions when component mounts
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/api/exams/course/${courseId}/random`);
        
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }
        
        const data = await response.json();
        setQuestions(data);
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError("Failed to load exam questions. Please try again.");
      } finally {
        setLoading(false);
        // Auto-open modal when questions are loaded
        setIsModalOpen(true);
      }
    };

    if (courseId && apiUrl) {
      fetchQuestions();
    }
  }, [courseId, apiUrl]);

  // Timer effect
  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;
    
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    
    if (timeLeft <= 0) {
      submitExam();
    }
    
    return () => clearInterval(timer);
  }, [timeLeft, examStarted]);

  // Format time
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = String(timeLeft % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  // Progress calculation
  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Object.keys(answers).length / questions.length * 100;
  }, [answers, questions]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!questions.length) return false;
    return !!answers[questions[currentQuestionIndex]?.id];
  }, [answers, questions, currentQuestionIndex]);

  // Handle answer selection
  const handleAnswerChange = useCallback((questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  }, []);

  // Navigation functions
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  }, [questions.length]);

  // Submit exam function
  const submitExam = useCallback(async () => {
    if (submitting) return;
    
    try {
      setSubmitting(true);
      
      // Create completed answers with 'E' for unanswered questions
      const completedAnswers = questions.reduce((acc, question) => {
        acc[question.id] = answers[question.id] || 'E';
        return acc;
      }, {});

      const response = await fetch(`${apiUrl}/api/exams/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId, answers: completedAnswers }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      const data = await response.json();
      setIsModalOpen(false);
      navigate(`/result/${data.id}`);
    } catch (err) {
      console.error("Error submitting exam:", err);
      setError("Failed to submit exam. Please try again.");
      setSubmitting(false);
    }
  }, [apiUrl, userId, courseId, answers, navigate, submitting, questions]);

  // Handle start exam
  const handleStartExam = () => {
    setExamStarted(true);
    document.body.style.overflow = "hidden"; // Prevent scrolling
  };

  // Watch for keyboard navigation
  useEffect(() => {
    if (!examStarted) return;
    
    const handleKeyDown = (e) => {
      if (loading || submitting) return;
      
      if (e.key === "ArrowLeft") {
        prevQuestion();
      } else if (e.key === "ArrowRight") {
        nextQuestion();
      } else if (e.key >= "1" && e.key <= "4" && questions[currentQuestionIndex]) {
        const optionMap = { "1": "A", "2": "B", "3": "C", "4": "D" };
        handleAnswerChange(questions[currentQuestionIndex].id, optionMap[e.key]);
      } else if (e.key === "Tab") {
        // Trap focus within the modal
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length) {
            firstFocusableElementRef.current = focusableElements[0];
            lastFocusableElementRef.current = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstFocusableElementRef.current) {
              e.preventDefault();
              lastFocusableElementRef.current.focus();
            } else if (!e.shiftKey && document.activeElement === lastFocusableElementRef.current) {
              e.preventDefault();
              firstFocusableElementRef.current.focus();
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, submitting, prevQuestion, nextQuestion, handleAnswerChange, questions, currentQuestionIndex, examStarted]);

  // Handle browser leave/refresh warnings
  useEffect(() => {
    if (!examStarted) return;

    const handleBeforeUnload = (e) => {
      if (Object.keys(answers).length > 0 && !submitting) {
        e.preventDefault();
        e.returnValue = "You have unsaved exam progress. Are you sure you want to leave? All your progress will be lost.";
        return e.returnValue;
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setAttemptedToLeave(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.body.style.overflow = "auto"; // Restore scrolling
    };
  }, [answers, submitting, examStarted]);

  // Get current question
  const currentQuestion = useMemo(() => 
    questions[currentQuestionIndex] || null,
    [questions, currentQuestionIndex]
  );

  // Close modal handler (with confirmation)
  const handleCloseAttempt = () => {
    if (Object.keys(answers).length > 0 && !submitting) {
      if (window.confirm("Are you sure you want to exit? All your progress will be lost.")) {
        setIsModalOpen(false);
        setExamStarted(false);
        navigate(-1);
      }
    } else {
      setIsModalOpen(false);
      setExamStarted(false);
      navigate(-1);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-indigo-100 to-purple-200 dark:from-gray-950 dark:to-indigo-950 flex flex-col items-center justify-center p-4">
      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 dark:bg-opacity-85 z-50 flex items-center justify-center">
          {/* Attempted to leave warning */}
          {attemptedToLeave && (
            <div className="absolute top-0 left-0 right-0 bg-red-600 dark:bg-red-700 text-white py-2 px-4 text-center font-semibold">
              Warning: Leaving this tab or window may result in losing your exam progress!
            </div>
          )}
          
          <div 
            ref={modalRef}
            className="w-full max-w-5xl h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700 p-4 flex justify-between items-center">
              <h1 id="modal-title" className="text-2xl font-bold text-white">Online Examination</h1>
              
              {/* Timer display */}
              <div className="flex items-center space-x-4">
                {examStarted && (
                  <div className="flex items-center bg-white dark:bg-gray-700 bg-opacity-20 rounded-lg px-4 py-1">
                    <span className="mr-2 text-white font-medium">Time Remaining:</span>
                    <div className="px-3 py-1 bg-white dark:bg-gray-600 rounded-md">
                      <span className="text-lg font-semibold text-red-600 dark:text-red-400" aria-live="polite" role="timer">
                        {formattedTime}
                      </span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleCloseAttempt}
                  className="text-white bg-red-500 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 rounded-full p-1"
                  aria-label="Close exam"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            {!examStarted ? (
              /* Exam Start Screen */
              <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Examination Rules</h2>
                <div className="max-w-2xl bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-8 text-left">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 text-green-600 dark:text-green-400">✓</span>
                      <span className="text-gray-800 dark:text-gray-300">You have <strong>40 minutes</strong> to complete the exam.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 text-green-600 dark:text-green-400">✓</span>
                      <span className="text-gray-800 dark:text-gray-300">Do not leave the examination screen or switch tabs/applications.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 text-green-600 dark:text-green-400">✓</span>
                      <span className="text-gray-800 dark:text-gray-300">All unanswered questions will be marked as option E (not answered).</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 text-green-600 dark:text-green-400">✓</span>
                      <span className="text-gray-800 dark:text-gray-300">Use keyboard shortcuts: Arrow keys (navigation), Numbers 1-4 (options A-D).</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2 mt-1 text-green-600 dark:text-green-400">✓</span>
                      <span className="text-gray-800 dark:text-gray-300">The exam will automatically submit when the timer reaches zero.</span>
                    </li>
                  </ul>
                </div>
                
                <button
                  onClick={handleStartExam}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  Start Exam Now
                </button>
              </div>
            ) : (
              /* Main Exam Content */
              <div className="flex-grow flex flex-col p-4 overflow-auto bg-gray-50 dark:bg-gray-900">
                {/* Progress bar */}
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full mb-6">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>

                {/* Loading state */}
                {loading ? (
                  <div className="flex-grow flex justify-center items-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 dark:border-indigo-400 border-t-purple-500 dark:border-t-purple-400 rounded-full animate-spin" aria-label="Loading"></div>
                  </div>
                ) : error ? (
                  /* Error state */
                  <div className="flex-grow flex flex-col items-center justify-center">
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4 max-w-md text-center">
                      <p className="text-lg font-medium mb-2">Error Loading Exam</p>
                      <p>{error}</p>
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg font-semibold"
                    >
                      Try Again
                    </button>
                  </div>
                ) : submitting ? (
                  /* Submitting state */
                  <div className="flex-grow flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-indigo-500 dark:border-indigo-400 border-t-purple-500 dark:border-t-purple-400 rounded-full animate-spin mb-4" aria-label="Submitting"></div>
                      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Submitting your exam...</p>
                      <p className="text-gray-500 dark:text-gray-400 mt-2">Please wait, don't close this window.</p>
                    </div>
                  </div>
                ) : questions.length > 0 && currentQuestion ? (
                  <div className="flex-grow flex flex-col md:flex-row gap-6">
                    {/* Question navigation sidebar */}
                    <div className="w-full md:w-56 flex-shrink-0 md:h-[calc(100vh-220px)] md:overflow-y-auto bg-white dark:bg-gray-800 p-4 rounded-lg">
                      <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Question Navigator</h2>
                      <div className="grid grid-cols-5 md:grid-cols-3 gap-2 mb-4">
                        {questions.map((q, idx) => (
                          <button
                            key={q.id}
                            onClick={() => goToQuestion(idx)}
                            className={`w-full h-10 flex items-center justify-center rounded-md font-medium transition-all
                              ${currentQuestionIndex === idx 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white ring-2 ring-offset-2 ring-blue-300 dark:ring-blue-500' 
                                : answers[q.id] 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-600' 
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            aria-label={`Go to question ${idx + 1}${answers[q.id] ? ' (answered)' : ''}`}
                            aria-current={currentQuestionIndex === idx ? 'true' : 'false'}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                      
                      {/* Summary */}
                      <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Exam Progress</h3>
                        <div className="space-y-2">
                          <p className="text-sm flex justify-between text-gray-800 dark:text-gray-300">
                            <span>Total Questions:</span>
                            <span className="font-medium">{questions.length}</span>
                          </p>
                          <p className="text-sm flex justify-between text-gray-800 dark:text-gray-300">
                            <span>Answered:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{Object.keys(answers).length}</span>
                          </p>
                          <p className="text-sm flex justify-between text-gray-800 dark:text-gray-300">
                            <span>Remaining:</span>
                            <span className="font-medium text-red-500 dark:text-red-400">{questions.length - Object.keys(answers).length}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Submit button for small screens */}
                      <div className="mt-4 md:hidden">
                        <button
                          className={`w-full py-3 text-white rounded-lg font-semibold transition-colors
                            ${Object.keys(answers).length === questions.length
                              ? "bg-green-500 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-800"
                              : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-800"}`}
                          onClick={submitExam}
                        >
                          {Object.keys(answers).length === questions.length ? "Submit Exam" : `Submit (${questions.length - Object.keys(answers).length} unanswered)`}
                        </button>
                      </div>
                    </div>
                    
                    {/* Main question area */}
                    <div className="flex-grow flex flex-col">
                      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm mb-4 flex-grow">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                            Question {currentQuestionIndex + 1} of {questions.length}
                          </h2>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium
                            ${isCurrentQuestionAnswered ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"}`}>
                            {isCurrentQuestionAnswered ? "Answered" : "Not Answered"}
                          </span>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                          {currentQuestion.questionText}
                        </h3>

                        {/* Options */}
                        <div className="space-y-3">
                          {["A", "B", "C", "D"].map((option) => (
                            <label
                              key={option}
                              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                                ${answers[currentQuestion.id] === option
                                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 text-blue-800 dark:text-blue-300 shadow-sm"
                                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300"}`}
                              htmlFor={`question-${currentQuestion.id}-option-${option}`}
                            >
                              <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 border-2
                                ${answers[currentQuestion.id] === option
                                  ? "bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 text-white"
                                  : "border-gray-300 dark:border-gray-500"}`}>
                                {answers[currentQuestion.id] === option && (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <input
                                id={`question-${currentQuestion.id}-option-${option}`}
                                type="radio"
                                name={`question-${currentQuestion.id}`}
                                value={option}
                                checked={answers[currentQuestion.id] === option}
                                onChange={() => handleAnswerChange(currentQuestion.id, option)}
                                className="sr-only"
                              />
                              <div>
                                <span className="font-medium">{option}.</span> {currentQuestion[`option${option}`]}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex justify-between mt-auto">
                        <button
                          className={`px-6 py-3 rounded-lg font-semibold transition-all
                            ${currentQuestionIndex === 0 
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed" 
                              : "bg-gray-700 dark:bg-gray-600 hover:bg-gray-900 dark:hover:bg-gray-500 text-white shadow hover:shadow-md"}`}
                          onClick={prevQuestion}
                          disabled={currentQuestionIndex === 0}
                          aria-label="Previous question"
                        >
                          ← Previous
                        </button>

                        {/* Submit button (desktop) */}
                        {currentQuestionIndex === questions.length - 1 && (
                          <div className="hidden md:block">
                            <button
                              className={`px-8 py-3 text-white rounded-lg font-semibold transition-all shadow hover:shadow-md
                                ${Object.keys(answers).length === questions.length
                                  ? "bg-green-500 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-800"
                                  : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-800"}`}
                              onClick={submitExam}
                            >
                              {Object.keys(answers).length === questions.length ? "Submit Exam" : `Submit (${questions.length - Object.keys(answers).length} unanswered)`}
                            </button>
                          </div>
                        )}

                        <button
                          className={`px-6 py-3 rounded-lg font-semibold transition-all shadow hover:shadow-md
                            ${currentQuestionIndex === questions.length - 1
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                              : "bg-blue-600 dark:bg-blue-700 hover:bg-blue-800 dark:hover:bg-blue-900 text-white"}`}
                          onClick={nextQuestion}
                          disabled={currentQuestionIndex === questions.length - 1}
                          aria-label="Next question"
                        >
                          {isCurrentQuestionAnswered ? "Next →" : "Skip →"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center">
                    <p className="text-center text-gray-600 dark:text-gray-400">No questions available for this exam.</p>
                  </div>
                )}
                
                {/* Keyboard shortcuts help */}
                {examStarted && !loading && !submitting && questions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                      <div className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 mr-2">←→</div>
                      <span className="mr-4">Navigate between questions</span>
                      
                      <div className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 mr-2">1-4</div>
                      <span>Select options A-D</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Background content (hidden when modal is open) */}
      <div className={`w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 ${isModalOpen ? 'blur-sm' : ''}`}>
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6">Online Examination System</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">Please wait while we prepare your examination...</p>
        
        <div className="flex justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 dark:border-blue-400 border-t-purple-500 dark:border-t-purple-400 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};