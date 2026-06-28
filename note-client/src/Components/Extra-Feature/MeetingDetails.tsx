import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar/Navbar";
import { API_BASE_URL } from "../../apiConfig";
import "../../style/Component/MeetingRoom/_meetingdetails.scss";

interface Highlight {
  speaker: string;
  text: string;
}

interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
}

interface Caption {
  speaker: string;
  text: string;
  timestamp: number;
}

interface Meeting {
  id: string;
  hostId: string;
  createdAt: number;
  title: string;
  summary: string;
  highlights: Highlight[];
  actionItems: ActionItem[];
  decisions: string[];
  risks: string[];
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  sources?: { speaker: string; text: string }[];
}

const MeetingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [activeTab, setActiveTab] = useState<"summary" | "highlights" | "transcript">("summary");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };
        
        const meetingRes = await axios.get(`${API_BASE_URL}/meetings/get-meeting/${id}`, config);
        setMeeting(meetingRes.data);

        // Fetch captions directly from backend query
        try {
          const captionsRes = await axios.get(`${API_BASE_URL}/meetingAi/captions/${id}`, config);
          setCaptions(captionsRes.data || []);
        } catch (e) {
          console.warn("Could not load captions directly:", e);
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading meeting details:", err);
        setError("Failed to load meeting details. Please make sure the meeting exists.");
        setLoading(false);
      }
    };

    fetchMeetingData();
  }, [id]);

  useEffect(() => {
    // Scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = { sender: "user", text: chatInput };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await axios.post(
        `${API_BASE_URL}/meetingAi/meetings/${id}/ask`,
        { question: userMessage.text },
        config
      );

      const aiMessage: ChatMessage = {
        sender: "ai",
        text: response.data.answer || "No response received.",
        sources: response.data.sources || []
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Error asking question:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Sorry, I encountered an error retrieving answers for this meeting." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Navbar />
        <div className="loading-spinner-box">
          <div className="spinner"></div>
          <p>Analyzing meeting intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="error-container">
        <Navbar />
        <div className="error-box">
          <h2>Oops! 🚨</h2>
          <p>{error || "Meeting not found."}</p>
          <button className="btn solid" onClick={() => navigate("/")}>
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(meeting.createdAt).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="meeting-details-page">
      <Navbar />
      
      <div className="details-header-section">
        <div className="header-nav">
          <button className="btn-back" onClick={() => navigate("/")}>
            ← Back to Dashboard
          </button>
        </div>
        <div className="title-area">
          <h1>{meeting.title || `Meeting - ${id}`}</h1>
          <span className="meeting-date">{formattedDate}</span>
        </div>
      </div>

      <div className="details-main-layout">
        {/* Left Side: Summary & Insights */}
        <div className="insights-panel">
          <div className="tab-navigation">
            <button
              className={`tab-link ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              📝 AI Summary
            </button>
            <button
              className={`tab-link ${activeTab === "highlights" ? "active" : ""}`}
              onClick={() => setActiveTab("highlights")}
            >
              ⚡ Highlights & Actions
            </button>
            <button
              className={`tab-link ${activeTab === "transcript" ? "active" : ""}`}
              onClick={() => setActiveTab("transcript")}
            >
              📜 Transcript
            </button>
          </div>

          <div className="tab-content-area">
            {activeTab === "summary" && (
              <div className="tab-pane summary-pane">
                <div className="pane-section">
                  <h3>Overview</h3>
                  <p className="summary-paragraph">
                    {meeting.summary || "No summary generated for this meeting yet."}
                  </p>
                </div>

                <div className="split-grid">
                  <div className="pane-section card-section decisions">
                    <h3>💡 Key Decisions</h3>
                    {meeting.decisions && meeting.decisions.length > 0 ? (
                      <ul>
                        {meeting.decisions.map((decision, idx) => (
                          <li key={idx}>{decision}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No specific decisions recorded.</p>
                    )}
                  </div>

                  <div className="pane-section card-section risks">
                    <h3>⚠️ Risks & Blockers</h3>
                    {meeting.risks && meeting.risks.length > 0 ? (
                      <ul>
                        {meeting.risks.map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No potential risks/blockers flagged.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "highlights" && (
              <div className="tab-pane highlights-pane">
                <div className="pane-section">
                  <h3>🎯 Action Items</h3>
                  {meeting.actionItems && meeting.actionItems.length > 0 ? (
                    <div className="action-items-table-wrapper">
                      <table className="action-table">
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Owner</th>
                            <th>Deadline</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meeting.actionItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="task-cell">{item.task}</td>
                              <td>
                                <span className="owner-badge">{item.owner}</span>
                              </td>
                              <td>
                                <span className="deadline-badge">{item.deadline}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="no-data">No action items assigned.</p>
                  )}
                </div>

                <div className="pane-section">
                  <h3>📌 Noteworthy Highlights</h3>
                  {meeting.highlights && meeting.highlights.length > 0 ? (
                    <div className="highlights-list">
                      {meeting.highlights.map((item, idx) => (
                        <div key={idx} className="highlight-item-card">
                          <span className="speaker-name">{item.speaker}:</span>
                          <span className="highlight-text">"{item.text}"</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No contextual highlights flagged.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="tab-pane transcript-pane">
                <h3>Meeting Transcript</h3>
                <div className="transcript-scroller">
                  <p style={{ color: "#64748b", fontStyle: "italic", marginBottom: "16px" }}>
                    The complete spoken dialogue recorded during the live call.
                  </p>
                  
                  <div className="transcript-lines">
                    {captions && captions.length > 0 ? (
                      <div className="transcript-box" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {captions.map((cap, idx) => (
                          <div key={idx} className="transcript-line" style={{ display: "flex", gap: "8px" }}>
                            <strong style={{ color: "#0ea5e9" }}>{cap.speaker}:</strong>
                            <span style={{ color: "#334155" }}>{cap.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="transcript-box">
                        <p className="caption-paragraph">
                          No transcript captions recorded for this meeting.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive AI Assistant */}
        <div className="chat-panel">
          <div className="chat-panel-header">
            <h3>🤖 AI Meeting Assistant</h3>
            <p>Ask questions about what was discussed in this meeting.</p>
          </div>

          <div className="chat-messages-container">
            {messages.length === 0 ? (
              <div className="empty-chat-state">
                <span className="chat-icon">💬</span>
                <p>Hi! I've indexed this meeting's transcript.</p>
                <p className="subtext">
                  You can ask questions like:
                  <br />
                  <em>"What were the action items for Ravi?"</em> or
                  <br />
                  <em>"Did we decide on a timeline?"</em>
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`chat-message-bubble ${msg.sender}`}>
                  <div className="message-content">{msg.text}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="message-sources">
                      <span className="source-label">Sources:</span>
                      <div className="sources-list">
                        {msg.sources.map((src, sIdx) => (
                          <div key={sIdx} className="source-item">
                            <strong>{src.speaker}:</strong> "{src.text}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="chat-message-bubble ai loading">
                <div className="typing-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              placeholder="Ask about this meeting..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
            />
            <button type="submit" className="btn solid" disabled={chatLoading || !chatInput.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetails;
