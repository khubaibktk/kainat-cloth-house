import { Navigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard.jsx";

export default function ProtectedAdmin() {
  return sessionStorage.getItem("adminToken") ? (
    <AdminDashboard />
  ) : (
    <Navigate to="/admin/login" replace />
  );
}
