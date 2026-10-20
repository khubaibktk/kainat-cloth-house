import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "./Admin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (sessionStorage.getItem("adminToken")) return <Navigate to="/admin/dashboard" replace />;

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/admin/login", { method: "POST", body: { username, password } });
      if (!data.token) throw new Error("The server did not return a login token.");
      sessionStorage.setItem("adminToken", data.token);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ad-login">
      <form className="ad-login-card" onSubmit={handleLogin}>
        <Link className="ad-brand mb-4" to="/">
          <span lang="ur" dir="rtl">کائنات کلاتھ ہاؤس</span>
          <small>Kainat Cloth House</small>
        </Link>
        <h1 className="h3">Admin sign in</h1>
        <p className="text-secondary">Manage sales, stock and profit.</p>

        <label className="form-label" htmlFor="username">Username</label>
        <input id="username" className="form-control mb-3" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />

        <label className="form-label" htmlFor="password">Password</label>
        <input id="password" type="password" className="form-control mb-3" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

        <button className="btn btn-dark w-100 rounded-pill py-2" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <Link className="d-block text-center mt-3 small" to="/">Back to the store</Link>
      </form>
    </main>
  );
}
