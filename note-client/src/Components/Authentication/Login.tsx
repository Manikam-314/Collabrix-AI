import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar/Navbar";
import { API_BASE_URL } from "../../apiConfig";

interface User {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  userId: string;
}

const Login: React.FC = () => {
  const [user, setUser] = useState<User>({
    email: "",
    password: "",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  // ✅ type the event properly
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post<LoginResponse>(
        `${API_BASE_URL}/auth/Login`,
        {
          email: user.email,
          password: user.password,
        },
        { timeout: 5000 } // avoid infinite waiting
      );

      if (res.data?.token && res.data?.userId) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("userId", res.data.userId);
        localStorage.setItem("name", (res.data as any).name || "User");

        alert("Login successful ✅");

        // ✅ use navigate instead of window.location.href
        navigate("/authenticated-home");
      } else {
        throw new Error("Invalid server response");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed ❌"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Navbar />
    <section className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back 👋</h2>
        <p className="auth-subtitle">Log in to continue to Collabrix</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={user.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={user.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn solid full-width"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {error && <p className="error-message">{error}</p>}

          <p className="auth-footer">
            Don’t have an account? <Link to="/register">Register here</Link>
          </p>
        </form>
      </div>
    </section>
    </>
  );
};

export default Login;
