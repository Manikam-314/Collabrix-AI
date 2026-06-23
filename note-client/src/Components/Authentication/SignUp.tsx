import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import "../../style/Component/Register/_register.scss";
import { API_BASE_URL } from "../../apiConfig";

function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match 🚨");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/SignUp`,
        formData
      );
      console.log(response.data);
      alert("Registration successful! ✅ Please log in.");
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      navigate("/login");
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        console.error(err.response?.data); // Validation or server error
        
        let errorMessage = err.response?.data.message || "An error occurred";
        
        // If there are specific validation errors, append them
        if (err.response?.data.errors && err.response?.data.errors.length > 0) {
          const specificError = err.response?.data.errors[0].msg;
          errorMessage += ": " + specificError;
        }
        
        alert(errorMessage);
      }
    }
  };

  return (
    <>
      <Navbar />
      <section className="auth-container">
      <div className="auth-card">
        <h2>Create Account 🚀</h2>
        <p className="auth-subtitle">Join Collabrix today</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn solid full-width">
            Register
          </button>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </form>
      </div>
    </section>
    </>
  );
}

export default SignUp;
