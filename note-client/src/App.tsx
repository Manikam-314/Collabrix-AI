import "./_main.scss";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./Components/Authentication/SignUp";
import Login from "./Components/Authentication/Login";
import Home from "./Pages/Home";
import NewMeeting from "./Components/Extra-Feature/NewMeetingPage";
import MeetingRoom from "./Components/Extra-Feature/MeetingRoom";
import MeetingDetails from "./Components/Extra-Feature/MeetingDetails";

const isTokenExpired = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (exp && Date.now() >= exp * 1000) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("name");
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/login" element={<Login/>}/>
          <Route path="/authenticated-home" element={<Home/>}/>
          <Route path="/new-meeting" element={<ProtectedRoute><NewMeeting/></ProtectedRoute>}/>
          <Route path="/meeting/:id" element={<ProtectedRoute><MeetingRoom/></ProtectedRoute>}/>
          <Route path="/meeting-details/:id" element={<ProtectedRoute><MeetingDetails/></ProtectedRoute>}/>
        </Routes>
      </Router>
    </>
  );
}

export default App;
