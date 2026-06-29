import React, { useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideoSlash } from "react-icons/fa";

interface LocalVideoProps {
  stream: MediaStream | null;
  userName: string;
  micOn: boolean;
  videoOn: boolean;
  isActiveSpeaker: boolean;
}

const LocalVideo: React.FC<LocalVideoProps> = ({
  stream,
  userName,
  micOn,
  videoOn,
  isActiveSpeaker,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-card local ${isActiveSpeaker ? "active-speaker" : ""}`}>
      {/* Always keep video mounted so stream stays attached */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="video-element mirrored"
        style={{ display: videoOn && stream ? "block" : "none" }}
      />
      {(!videoOn || !stream) && (
        <div className="avatar-placeholder">
          <div className="avatar-circle">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="placeholder-text">Camera Off</span>
        </div>
      )}

      <div className="video-info-overlay">
        <span className="participant-name">{userName} (You)</span>
        <div className="status-badges">
          <span className={`badge mic-badge ${micOn ? "on" : "off"}`}>
            {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </span>
          {!videoOn && (
            <span className="badge camera-badge off">
              <FaVideoSlash />
            </span>
          )}
          {isActiveSpeaker && (
            <span className="badge speaker-badge">Speaking</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalVideo;
