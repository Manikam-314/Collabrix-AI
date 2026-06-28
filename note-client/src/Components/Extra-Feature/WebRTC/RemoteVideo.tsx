import React, { useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideoSlash, FaSync } from "react-icons/fa";

interface RemoteVideoProps {
  stream: MediaStream | null;
  userName: string;
  micOn: boolean;
  videoOn: boolean;
  isActiveSpeaker: boolean;
  connectionState: RTCPeerConnectionState;
  onReconnect?: () => void;
}

const RemoteVideo: React.FC<RemoteVideoProps> = ({
  stream,
  userName,
  micOn,
  videoOn,
  isActiveSpeaker,
  connectionState,
  onReconnect,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoOn]);

  const getConnectionStateClass = () => {
    switch (connectionState) {
      case "connecting":
        return "state-connecting";
      case "disconnected":
      case "failed":
        return "state-failed";
      case "connected":
      default:
        return "state-connected";
    }
  };

  const getConnectionStateLabel = () => {
    switch (connectionState) {
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      case "failed":
        return "Failed";
      default:
        return "";
    }
  };

  return (
    <div
      className={`video-card remote ${isActiveSpeaker ? "active-speaker" : ""} ${getConnectionStateClass()}`}
    >
      {/* Connection State Overlay */}
      {(connectionState === "connecting" ||
        connectionState === "disconnected" ||
        connectionState === "failed") && (
        <div className="connection-state-overlay">
          <div className="state-content">
            {connectionState === "connecting" && <div className="loader-mini" />}
            <span className="state-text">{getConnectionStateLabel()}</span>
            {connectionState === "failed" && onReconnect && (
              <button
                className="reconnect-btn"
                title="Reconnect Peer"
                onClick={onReconnect}
              >
                <FaSync /> Retry
              </button>
            )}
          </div>
        </div>
      )}

      {videoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="video-element"
        />
      ) : (
        <div className="avatar-placeholder">
          <div className="avatar-circle">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="placeholder-text">{userName} (Camera Off)</span>
        </div>
      )}

      <div className="video-info-overlay">
        <span className="participant-name">{userName}</span>
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

export default RemoteVideo;
