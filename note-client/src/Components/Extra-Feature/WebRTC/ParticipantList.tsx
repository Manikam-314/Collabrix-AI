import React from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop } from "react-icons/fa";

export interface ParticipantDetail {
  userId: string;
  userName: string;
  isHost: boolean;
  micOn: boolean;
  videoOn: boolean;
  screenSharing: boolean;
}

interface ParticipantListProps {
  participants: ParticipantDetail[];
  isLocalHost: boolean;
  localUserId: string;
  onMute: (userId: string) => void;
  onTurnOffCamera: (userId: string) => void;
  onKick: (userId: string) => void;
}

const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  isLocalHost,
  localUserId,
  onMute,
  onTurnOffCamera,
  onKick,
}) => {
  return (
    <div className="participants-section">
      <ul className="participants-list">
        {participants.map((p) => {
          const isSelf = p.userId === localUserId;
          return (
            <li key={p.userId} className="participant-item">
              <div className="participant-info">
                <span className="participant-name">
                  {p.userName} {isSelf && " (You)"}
                </span>
                <span className={`role-tag ${p.isHost ? "host" : "guest"}`}>
                  {p.isHost ? "Host" : "Participant"}
                </span>
              </div>

              <div className="participant-status-icons">
                <span className={`status-icon ${p.micOn ? "active" : "muted"}`} title={p.micOn ? "Microphone On" : "Microphone Muted"}>
                  {p.micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </span>
                <span className={`status-icon ${p.videoOn ? "active" : "muted"}`} title={p.videoOn ? "Camera On" : "Camera Muted"}>
                  {p.videoOn ? <FaVideo /> : <FaVideoSlash />}
                </span>
                {p.screenSharing && (
                  <span className="status-icon active screen-share" title="Sharing Screen">
                    <FaDesktop />
                  </span>
                )}
              </div>

              {/* Host Controls */}
              {isLocalHost && !isSelf && !p.isHost && (
                <div className="participant-controls">
                  {p.micOn && (
                    <button
                      className="ctrl-btn mute"
                      title="Mute Mic"
                      onClick={() => onMute(p.userId)}
                    >
                      Mute
                    </button>
                  )}
                  {p.videoOn && (
                    <button
                      className="ctrl-btn cam"
                      title="Turn off Camera"
                      onClick={() => onTurnOffCamera(p.userId)}
                    >
                      Stop Cam
                    </button>
                  )}
                  <button
                    className="ctrl-btn kick"
                    title="Kick from Meeting"
                    onClick={() => onKick(p.userId)}
                  >
                    Kick
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ParticipantList;
