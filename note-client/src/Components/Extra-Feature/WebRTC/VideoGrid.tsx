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
  screenShareUser: string | null;
  layoutMode: "grid" | "speaker";
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
  layoutMode,
}) => {
  const totalParticipants = remoteParticipants.length + 1;

  // Determine CSS class based on participant count & screen sharing
  const getLayoutClass = () => {
    if (screenShareStream) {
      return "layout-screen-share";
    }
    if (layoutMode === "speaker" && totalParticipants > 1) {
      return "layout-speaker-view";
    }
    if (totalParticipants === 1) return "layout-solo";
    if (totalParticipants === 2) return "layout-duo";
    if (totalParticipants <= 4) return "layout-quad";
    return "layout-mesh";
  };

  // Find who is the active speaker for speaker view
  const getActiveSpeaker = () => {
    if (localIsSpeaker) return "local";
    const activeRemote = remoteParticipants.find((p) => p.isActiveSpeaker);
    if (activeRemote) return activeRemote.userId;
    // Default: if there are remote participants, show first remote as main; else local
    if (remoteParticipants.length > 0) return remoteParticipants[0].userId;
    return "local";
  };

  const activeSpeakerId = getActiveSpeaker();
  const useSpeakerView = layoutMode === "speaker" && totalParticipants > 1 && !screenShareStream;

  // Render the main (big) speaker video
  const renderMainSpeaker = () => {
    if (activeSpeakerId === "local") {
      return (
        <LocalVideo
          stream={localStream}
          userName={localUserName}
          micOn={localMicOn}
          videoOn={localVideoOn}
          isActiveSpeaker={true}
        />
      );
    }
    const participant = remoteParticipants.find((p) => p.userId === activeSpeakerId);
    if (participant) {
      return (
        <RemoteVideo
          stream={participant.stream}
          userName={participant.userName}
          micOn={participant.micOn}
          videoOn={participant.videoOn}
          isActiveSpeaker={true}
          connectionState={participant.connectionState}
          onReconnect={() => onReconnectPeer(participant.userId)}
        />
      );
    }
    return null;
  };

  // Render the small strip of other participants
  const renderSmallStrip = () => {
    const elements: React.ReactNode[] = [];

    // Add local user if they are NOT the main speaker
    if (activeSpeakerId !== "local") {
      elements.push(
        <LocalVideo
          key="local"
          stream={localStream}
          userName={localUserName}
          micOn={localMicOn}
          videoOn={localVideoOn}
          isActiveSpeaker={false}
        />
      );
    }

    // Add remote participants who are NOT the main speaker
    remoteParticipants
      .filter((p) => p.userId !== activeSpeakerId)
      .forEach((participant) => {
        elements.push(
          <RemoteVideo
            key={participant.userId}
            stream={participant.stream}
            userName={participant.userName}
            micOn={participant.micOn}
            videoOn={participant.videoOn}
            isActiveSpeaker={false}
            connectionState={participant.connectionState}
            onReconnect={() => onReconnectPeer(participant.userId)}
          />
        );
      });

    return elements;
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

      {/* Speaker View: Main speaker big + small strip */}
      {useSpeakerView ? (
        <>
          <div className="main-speaker-container">
            {renderMainSpeaker()}
          </div>
          <div className="small-participants-strip">
            {renderSmallStrip()}
          </div>
        </>
      ) : (
        /* Grid View: All participants in equal grid */
        <div className="participants-grid">
          <LocalVideo
            stream={localStream}
            userName={localUserName}
            micOn={localMicOn}
            videoOn={localVideoOn}
            isActiveSpeaker={localIsSpeaker}
          />
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
      )}
    </div>
  );
};

export default VideoGrid;
