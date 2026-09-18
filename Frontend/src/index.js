import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "./config/api";
import { AuthProvider } from "./context/AuthContext"; // ✅ Import AuthProvider
import { GoogleOAuthProvider } from "@react-oauth/google"; // ✅ Import GoogleOAuthProvider

const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "REDACTED";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId={clientId}> {/* ✅ Wrap with GoogleOAuthProvider */}
    <AuthProvider> {/* ✅ Wrap App inside AuthProvider */}
      <App />
    </AuthProvider>
  </GoogleOAuthProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// reportWebVitals();
