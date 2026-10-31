import { createContext, useContext, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { API_BASE_URL } from "../config/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!sessionStorage.getItem("authToken")
  );
  const [userEmail, setUserEmail] = useState(sessionStorage.getItem("userEmail"));
  const [userName, setUserName] = useState(sessionStorage.getItem("userName"));
  const [userToken, setUserToken] = useState(sessionStorage.getItem("authToken"));
  const [userState, setUserState] = useState(sessionStorage.getItem("userState"));
  const [userPhonenum, setUserPhonenum] = useState(sessionStorage.getItem("userPhonenum"));
  const [userId, setUserId] = useState(sessionStorage.getItem("userId"));
  const [userFirstName, setUserFirstName] = useState(sessionStorage.getItem("userFirstName"));
  const [userProfileUrl, setUserProfileUrl] = useState(sessionStorage.getItem("userProfileUrl"));
  const [role, setRole] = useState(sessionStorage.getItem("role"));

  const apiUrl = API_BASE_URL;

  // Regular login with email & password
  const login = async (email, password) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 200) {
        const data = await response.json();
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("userEmail", data.email);
        sessionStorage.setItem("userName", data.username);
        sessionStorage.setItem("userPhonenum", data.phonenum);
        sessionStorage.setItem("userState", data.state);
        sessionStorage.setItem("userId", data.userid);
        sessionStorage.setItem("userFirstName", data.name);
        sessionStorage.setItem("userProfileUrl", data.profileurl);
        sessionStorage.setItem("role", data.role);

        setIsAuthenticated(true);
        setUserEmail(data.email);
        setUserId(data.userid);
        setUserPhonenum(data.phonenum);
        setUserState(data.state);
        setUserName(data.username);
        setUserToken(data.token);
        setUserProfileUrl(data.profileurl);
        setUserFirstName(data.name);
        setRole(data.role);

        return { success: true };
      } else {
        let message = "Invalid email or password.";
        try {
          const data = await response.json();
          if (data?.message) message = data.message;
        } catch (parseError) {
          console.error("Could not read login error response:", parseError);
        }
        return { success: false, error: message };
      }
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, error: "Unable to reach the server. Please try again." };
    }
  };

  // Google OAuth Login
  const googleLogin = async (credentialResponse) => {
    try {
      const googleToken = credentialResponse.credential;
      const decoded = jwtDecode(googleToken);
      const { email, name, picture } = decoded; // Google token details
  
      // Send Google user data to backend for authentication
      const response = await fetch(`${apiUrl}/api/auth/google-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: googleToken, email, name, picture }),
      });
  
      const data = await response.json();
  
      if (data.success) {
        //  Store the backend JWT token, not the Google token
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("userEmail", data.email);
        sessionStorage.setItem("userName", data.username);
        sessionStorage.setItem("userProfileUrl", data.profileurl);
        sessionStorage.setItem("userId", data.userid);
        sessionStorage.setItem("userFirstName", data.name);
        sessionStorage.setItem("role", data.role);
  
        //  Update React state
        setIsAuthenticated(true);
        setUserEmail(data.email);
        setUserName(data.username);
        setUserFirstName(data.name);
        setUserToken(data.token);
        setUserProfileUrl(data.profileurl);
        setRole(data.role);
        console.log("Google Login Successful:", data);
        return true;
      } else {
        console.error("Google Login Failed:", data.message);
        return false;
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      return false;
    }
  };

  const logout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserName(null);
    setUserId(null);
    setUserToken(null);
    setUserPhonenum(null);
    setUserState(null);
    setUserFirstName(null);
    setUserProfileUrl(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        login,
        googleLogin, // Google login function added
        logout,
        userName,
        userToken,
        userPhonenum,
        userState,
        userId,
        userFirstName,
        userProfileUrl,
        setUserProfileUrl,
        role,
        setRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
