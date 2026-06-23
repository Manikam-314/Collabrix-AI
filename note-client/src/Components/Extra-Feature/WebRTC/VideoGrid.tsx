import React from "react";
import LocalVideo from "./LocalVideo";
import RemoteVideo from "./RemoteVideo";

export interface RemoteParticipant {
  userId: string;
  userName: string;
  stream: MediaStream | null;
  micOn: boolean;
  videoOn: boolean;
  isActiveSpeaker: boolean;
  connectionState: RTCPeerConnectionState;
  screenSharing: boolean;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localUserName: string;
  localMicOn: boolean;
  localVideoOn: boolean;
  localIsSpeaker: boolean;
  remoteParticipants: RemoteParticipant[];
  onReconnectPeer: (userId: string) => void;
  screenShareStream: MediaStream | null;
  screenShareUser: string | null; // ID or name of screen sharer
}

const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  localUserName,
  localMicOn,
  localVideoOn,
  localIsSpeaker,
  remoteParticipants,
  onReconnectPeer,
  screenShareStream,
  screenShareUser,
}) => {
  const totalParticipants = remoteParticipants.length + 1;

  // Determine CSS class based on participant count & screen sharing
  const getLayoutClass = () => {
    if (screenShareStream) {
      return "layout-screen-share";
    }
    if (totalParticipants === 1) return "layout-solo";
    if (totalParticipants === 2) return "layout-duo";
    if (totalParticipants <= 4) return "layout-quad";
    return "layout-mesh";
  };

  return (
    <div className={`video-grid-container ${getLayoutClass()}`}>
      {/* Screen Share Feature Panel */}
      {screenShareStream && (
        <div className="screen-share-feature">
          <video
            ref={(ref) => {
              if (ref && ref.srcObject !== screenShareStream) {
                ref.srcObject = screenShareStream;
              }
            }}
            autoPlay
            playsInline
            className="screen-share-video"
          />
          <div className="screen-share-overlay">
            <span className="sharer-name">
              {screenShareUser === "You"
                ? "You are sharing your screen"
                : `${screenShareUser || "Someone"} is sharing their screen`}
            </span>
          </div>
        </div>
      )}

      {/* Grid of User Video Streams */}
      <div className="participants-grid">
        {/* Local Participant */}
        {/* Don't render local stream in normal grid if local is sharing screen and we want to hide it, or keep it */}
        <LocalVideo
          stream={localStream}
          userName={localUserName}
          micOn={localMicOn}
          videoOn={localVideoOn}
          isActiveSpeaker={localIsSpeaker}
        />

        {/* Remote Participants */}
        {remoteParticipants.map((participant) => (
          <RemoteVideo
            key={participant.userId}
            stream={participant.stream}
            userName={participant.userName}
            micOn={participant.micOn}
            videoOn={participant.videoOn}
            isActiveSpeaker={participant.isActiveSpeaker}
            connectionState={participant.connectionState}
            onReconnect={() => onReconnectPeer(participant.userId)}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;
