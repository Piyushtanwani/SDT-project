import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "./config/api";
import { AuthProvider } from "./context/AuthContext"; // ✅ Import AuthProvider
import { ThemeProvider } from "./context/ThemeContext";
import { GoogleOAuthProvider } from "@react-oauth/google"; // ✅ Import GoogleOAuthProvider

const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "758102529675-tjpsc3j5qd5rqun6hk8jbgf270ncu43q.apps.googleusercontent.com";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId={clientId}> {/* ✅ Wrap with GoogleOAuthProvider */}
    <ThemeProvider>
      <AuthProvider> {/* ✅ Wrap App inside AuthProvider */}
        <App />
      </AuthProvider>
    </ThemeProvider>
  </GoogleOAuthProvider>
);
