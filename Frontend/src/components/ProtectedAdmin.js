import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function ProtectedAdmin() {
    const role = sessionStorage.getItem("role");
    const userEmail = sessionStorage.getItem("userEmail");
    const isAdmin = (role && role.toUpperCase() === "ADMIN") || userEmail === "bitecodes.global@gmail.com";

    return isAdmin ? <Outlet /> : <Navigate to="/" />;
}

export default ProtectedAdmin;
