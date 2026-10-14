import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";

export const Profile = () => {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("userId");
  const token = sessionStorage.getItem("authToken");
  const [userData, setUserData] = useState(null);
  const [skills, setSkills] = useState([]); // State to store skill details
  const [error, setError] = useState("");

  const apiUrl =
    process.env.REACT_APP_ENV === "production"
      ? process.env.REACT_APP_LIVE_API
      : process.env.REACT_APP_LOCAL_API;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!userId || !token) {
          setError("Please log in to view your profile.");
          navigate("/");
          return;
        }

        // Fetch user data
        const userResponse = await axios.get(`${apiUrl}/api/auth/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userResponse.data) {
          console.log(userResponse.data);
          setUserData(userResponse.data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load profile data.");
      }
    };

    const fetchSkills = async () => {
      try {
        // Fetch all skills from the /api/skills endpoint
        const skillsResponse = await axios.get(`${apiUrl}/api/skills`);
        if (skillsResponse.data) {
          setSkills(skillsResponse.data); // Store skills in state
        }
      } catch (error) {
        console.error("Error fetching skills:", error);
        setError("Failed to load skills.");
      }
    };

    fetchUserData();
    fetchSkills();
  }, [userId, token, apiUrl, navigate]);

  // Map skillIds to skill names
  const getSkillNames = () => {
    if (!userData?.skillIds || !skills.length) return [];
    return userData.skillIds
      .map((skillId) => skills.find((skill) => skill.id === skillId))
      .filter((skill) => skill); // Filter out undefined skills
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-600 dark:text-gray-400 text-lg font-semibold"
        >
          Loading profile...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500/20 via-purple-400/20 to-blue-400/20 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            Your Profile
          </h1>

          <div className="space-y-6">
            {/* Profile Image and Name */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-gray-700 shadow-md mb-4"
              >
                <img
                  src={userData.profileurl || "https://webcrumbs.cloud/placeholder"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {userData.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">@{userData.username}</p>
            </div>

            {/* Role */}
            {userData.role && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Role
                </label>
                <p className="text-gray-900 dark:text-gray-100">{userData.role}</p>
              </div>
            )}

            {/* Skills */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Skills
              </label>
              {getSkillNames().length > 0 ? (
                <div className="flex flex-row flex-wrap justify-center gap-2">
                  {getSkillNames().map((skill) => (
                    <motion.span
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full text-sm font-medium"
                    >
                      {skill.name}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No skills added.</p>
              )}
            </div>

            {/* Bio */}
            {userData.bio && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Bio
                </label>
                <p className="text-gray-900 dark:text-gray-100">{userData.bio}</p>
              </div>
            )}

            {/* Other Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {userData.email && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{userData.email}</p>
                </div>
              )}
              {userData.phonenum && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Phone
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{userData.phonenum}</p>
                </div>
              )}
              {userData.state && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    State
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{userData.state}</p>
                </div>
              )}
              {userData.timezone && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Timezone
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{userData.timezone}</p>
                </div>
              )}
              {userData.availability && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Availability
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{userData.availability}</p>
                </div>
              )}
            </div>

            {/* Edit Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/updateprofile")}
              className="w-full py-3 bg-indigo-500 dark:bg-indigo-600 text-white rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 shadow-md transition-colors"
            >
              Edit Profile
            </motion.button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex items-center justify-center text-red-600 dark:text-red-400"
            >
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;