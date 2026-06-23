import React from "react";
import "../../style/Component/Register/_newmeeting.scss";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import axios from "axios";
import { API_BASE_URL } from "../../apiConfig";

const NewMeeting: React.FC = () => {
  const [meetingId, setMeetingId] = React.useState<string>("");
  const [meetingUrl, setMeetingUrl] = React.useState<string>("Generating…");
  const navigate = useNavigate();

  React.useEffect(() => {
    const initMeeting = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/meetings/create-meeting`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const id = res.data.meetingId;
        setMeetingId(id);
        setMeetingUrl(`${window.location.origin}/meeting/${id}`);
        localStorage.setItem("lastMeetingId", id);
      } catch (err) {
        console.error("Error creating meeting:", err);
        setMeetingUrl("Error generating link. Please try again.");
      }
    };
    initMeeting();
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    alert("Meeting link copied!");
  };

  const startMeeting = () => {
    if (meetingId) {
      navigate(`/meeting/${meetingId}`);
    }
  };

  return (
    <>
    <Navbar />
    <div className="new-meeting-page">
      {/* Box */}
      <div className="new-meeting-box">
        <h2>Here’s your joining information</h2>
        <p>
          Share this link with people you want to meet with. Save it so you can
          join later too.
        </p>

        <div className="meeting-link-box">
          <span>{meetingUrl}</span>
          <button className="copy-btn" onClick={copyLink} disabled={!meetingId}>
            Copy
          </button>
        </div>

        <button 
          className="btn solid" 
          onClick={startMeeting} 
          disabled={!meetingId}
          style={{ opacity: meetingId ? 1 : 0.5, cursor: meetingId ? "pointer" : "not-allowed" }}
        >
          Start Meeting
        </button>
      </div>
    </div>
    </>
  );
};

export default NewMeeting;
