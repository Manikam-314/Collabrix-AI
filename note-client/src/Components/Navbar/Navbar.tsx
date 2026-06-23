import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../style/Component/NavBar/_navbar.scss";
import { useEffect, useState } from "react";

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <header className="nav">
      <Link className="brand" to="/">
        <span className="brand-mark" aria-hidden="true"></span>
        <span className="brand-text">Collabrix</span>
      </Link>

      <nav className="nav-links">
        <a href="/#features">Features</a>
        <a href="/#ai-notes">AI Notes</a>
        <a href="/#security">Security</a>
        <a href="/#faq">FAQ</a>
      </nav>

      <div className="nav-cta">
        {isLoggedIn ? (
          <button className="btn outline" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <>
            <Link className="btn outline" to="/login">
              Login
            </Link>
            <Link className="btn solid" to="/register">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
