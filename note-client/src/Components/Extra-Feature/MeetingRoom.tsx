import React, { useRef, useState, useEffect } from "react";
import "../../style/Component/MeetingRoom/_meetingroom.scss";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhone,
  FaDesktop,
  FaDownload,
  FaFileAlt,
  FaCircle,
} from "react-icons/fa";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, WS_BASE_URL } from "../../apiConfig";
import VideoGrid from "./WebRTC/VideoGrid";
import type { RemoteParticipant } from "./WebRTC/VideoGrid";
import ParticipantList from "./WebRTC/ParticipantList";

const MeetingRoom: React.FC = () => {
  const navigate = useNavigate();
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRestartingRef = useRef<boolean>(false);

  const [videoOn, setVideoOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [captions, setCaptions] = useState<string>("");
  const [captionsOn, setCaptionsOn] = useState<boolean>(true);

  const { id: meetingId } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<{ text: string; sent: boolean }[]>([]);
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const [currentTime, setCurrentTime] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [highlights, setHighlights] = useState<{ speaker: string; text: string }[]>([]);
  const [actionItems, setActionItems] = useState<{ task: string; owner: string; deadline: string }[]>([]);
  const [decisions, setDecisions] = useState<string[]>([]);
  const [risks, setRisks] = useState<string[]>([]);

  // --- Auth & Host States ---
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState("");
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [denied, setDenied] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<{ userId: string; userName: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"insights" | "participants" | "chat">("insights");
  const [ragInput, setRagInput] = useState("");
  const [ragMessages, setRagMessages] = useState<{ query: string; answer: string; sources: any[] }[]>([]);
  const [ragLoading, setRagLoading] = useState(false);

  const askAiMemory = async () => {
    if (!ragInput.trim()) return;
    const question = ragInput.trim();
    setRagInput("");
    setRagLoading(true);

    setRagMessages((prev) => [...prev, { query: question, answer: "Thinking...", sources: [] }]);

    try {
      const res = await axios.post(`${API_BASE_URL}/meetingAi/meetings/${meetingId}/ask`, {
        question
      });
      setRagMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          query: question,
          answer: res.data.answer,
          sources: res.data.sources || []
        };
        return updated;
      });
    } catch (err) {
      console.error("AI Memory error:", err);
      setRagMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].answer = "Sorry, failed to get an answer from AI memory.";
        return updated;
      });
    } finally {
      setRagLoading(false);
    }
  };

  // --- WebRTC States & Refs ---
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextsRef = useRef<Map<string, { context: AudioContext; analyser: AnalyserNode }>>(new Map());

  // --- Recording States ---
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("");

  // --- Time updater ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Fetch Meeting details to identify host ---
  useEffect(() => {
    if (!meetingId) return;

    const fetchMeeting = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/meetings/get-meeting/${meetingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const currentUserId = localStorage.getItem("userId");
        if (res.data.hostId === currentUserId) {
          setIsHost(true);
          setIsAdmitted(true);
        }
        setHostId(res.data.hostId);
      } catch (err) {
        console.error("Error fetching meeting:", err);
      }
    };
    fetchMeeting();
  }, [meetingId]);



  // --- Trigger Media Stream Initialization on Admission ---
  useEffect(() => {
    if (isAdmitted) {
      initLocalStream();
    }
  }, [isAdmitted]);

  // --- Initialize Local Media Stream ---
  const initLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setLocalStream(stream);
      setVideoOn(true);
      setMicOn(true);

      // Notify WebSocket server that we have joined the media room
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "JOIN_ROOM",
          })
        );
      }
    } catch (err) {
      console.error("Error accessing user media (audio + video):", err);
      // Fallback to audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        streamRef.current = stream;
        setLocalStream(stream);
        setVideoOn(false);
        setMicOn(true);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "JOIN_ROOM",
            })
          );
        }
      } catch (audioErr) {
        console.error("Error accessing audio media only:", audioErr);
        // Fallback: Join with no media tracks
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "JOIN_ROOM",
            })
          );
        }
      }
    }
  };

  // --- Initialize RTCPeerConnection ---
  const initPeerConnection = (targetUserId: string, userName: string, _isInitiator: boolean) => {
    // Create new RTCPeerConnection configured with public STUN and placeholder Coturn STUN/TURN servers
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:coturn.collabrix.net:3478" },
        {
          urls: "turn:coturn.collabrix.net:3478?transport=udp",
          username: "collabrix_user",
          credential: "secure_password_here",
        },
      ],
    });

    peersRef.current.set(targetUserId, pc);

    // Attach local media tracks to the peer connection
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });
    }

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteParticipants((prev) => {
        const idx = prev.findIndex((p) => p.userId === targetUserId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], stream: remoteStream };
          return updated;
        } else {
          return [
            ...prev,
            {
              userId: targetUserId,
              userName,
              stream: remoteStream,
              micOn: true,
              videoOn: true,
              isActiveSpeaker: false,
              connectionState: pc.connectionState,
              screenSharing: false,
            },
          ];
        }
      });
    };

    // Handle local ICE candidates discovered
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ICE_CANDIDATE",
            targetUserId,
            candidate: event.candidate,
          })
        );
      }
    };

    // Track RTCPeerConnection connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setRemoteParticipants((prev) =>
        prev.map((p) => (p.userId === targetUserId ? { ...p, connectionState: state } : p))
      );

      if (state === "failed" || state === "disconnected") {
        console.warn(`Connection to ${targetUserId} transitioned to ${state}. Attempting auto-reconnect...`);
        reconnectPeer(targetUserId);
      }
    };

    return pc;
  };

  // --- Auto-Reconnection Mechanism ---
  const reconnectPeer = async (targetUserId: string) => {
    const oldPc = peersRef.current.get(targetUserId);
    if (oldPc) {
      oldPc.close();
    }

    const p = remoteParticipants.find((x) => x.userId === targetUserId);
    const name = p ? p.userName : "Participant";

    // Initialize a new peer connection and renegotiate
    const pc = initPeerConnection(targetUserId, name, true);
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "SDP_OFFER",
            targetUserId,
            offer,
          })
        );
      }
    } catch (err) {
      console.error(`Failed to reconnect with user ${targetUserId}:`, err);
    }
  };

  // --- Helper to broadcast client media states (mic, camera, etc.) ---
  const broadcastState = (type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          ...data,
        })
      );
    }
  };

  // --- WebSocket Setup ---
  useEffect(() => {
    if (!meetingId || !hostId) return;
    const token = localStorage.getItem("token");
    const currentUserId = localStorage.getItem("userId");

    const wsUrl = WS_BASE_URL.replace("ws://", API_BASE_URL.startsWith("https") ? "wss://" : "ws://");
    const ws = new WebSocket(`${wsUrl}?meetingId=${meetingId}&token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket:", meetingId);
      if (currentUserId !== hostId) {
        // Send join request
        ws.send(JSON.stringify({ type: "JOIN_REQUEST" }));
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, senderUserId, senderUserName } = data;

        if (type === "JOIN_REQUEST") {
          setPendingRequests((prev) => {
            if (prev.some((r) => r.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId, userName: data.userName }];
          });
        } 
        else if (type === "ADMIT") {
          setIsAdmitted(true);
        } 
        else if (type === "DENY") {
          setDenied(true);
          ws.close();
        } 
        else if (type === "KICK") {
          alert("You have been kicked out of the meeting by the host.");
          hangUp();
        } 
        else if (type === "MUTE_MIC") {
          if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach((track) => (track.enabled = false));
          }
          setMicOn(false);
          broadcastState("TOGGLE_MIC", { micOn: false });
          alert("The host has muted your microphone.");
        } 
        else if (type === "CAMERA_OFF") {
          if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach((track) => (track.enabled = false));
          }
          setVideoOn(false);
          broadcastState("TOGGLE_CAMERA", { videoOn: false });
          alert("The host has turned off your camera.");
        }
        else if (type === "JOIN_ROOM") {
          console.log(`👤 User joined the room: ${senderUserName} (${senderUserId})`);


          setRemoteParticipants((prev) => {
            if (prev.some((p) => p.userId === senderUserId)) return prev;
            return [
              ...prev,
              {
                userId: senderUserId,
                userName: senderUserName,
                stream: null,
                micOn: true,
                videoOn: true,
                isActiveSpeaker: false,
                connectionState: "connecting",
                screenSharing: false,
              },
            ];
          });

          // Existing participants act as the Offerer, creating an SDP offer towards the new participant
          const pc = initPeerConnection(senderUserId, senderUserName, true);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(
              JSON.stringify({
                type: "SDP_OFFER",
                targetUserId: senderUserId,
                offer,
              })
            );
          } catch (err) {
            console.error("Failed to create SDP offer for new user:", err);
          }
        } 
        else if (type === "SDP_OFFER") {
          console.log(`SDP Offer received from ${senderUserName}`);
          let pc = peersRef.current.get(senderUserId);
          if (!pc) {
            pc = initPeerConnection(senderUserId, senderUserName, false);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(
            JSON.stringify({
              type: "SDP_ANSWER",
              targetUserId: senderUserId,
              answer,
            })
          );
        } 
        else if (type === "SDP_ANSWER") {
          console.log(`SDP Answer received from ${senderUserName}`);
          const pc = peersRef.current.get(senderUserId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        } 
        else if (type === "ICE_CANDIDATE") {
          const pc = peersRef.current.get(senderUserId);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } 
        else if (type === "LEAVE_ROOM") {
          console.log(`👤 User left the room: ${senderUserId}`);
          
          // Cleanup peer connection resources
          const pc = peersRef.current.get(senderUserId);
          if (pc) {
            pc.close();
            peersRef.current.delete(senderUserId);
          }

          // Cleanup Audio Analyser node
          const contextItem = audioContextsRef.current.get(senderUserId);
          if (contextItem) {
            contextItem.context.close();
            audioContextsRef.current.delete(senderUserId);
          }

          setRemoteParticipants((prev) => prev.filter((p) => p.userId !== senderUserId));
        } 
        else if (type === "TOGGLE_MIC") {
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.userId === senderUserId ? { ...p, micOn: data.micOn } : p))
          );
        } 
        else if (type === "TOGGLE_CAMERA") {
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.userId === senderUserId ? { ...p, videoOn: data.videoOn } : p))
          );
        } 
        else if (type === "SCREEN_SHARE_START") {
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.userId === senderUserId ? { ...p, screenSharing: true } : p))
          );
        } 
        else if (type === "SCREEN_SHARE_STOP") {
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.userId === senderUserId ? { ...p, screenSharing: false } : p))
          );
        }
        else if (type === "START_RECORDING") {
          setRecording(true);
          setRecordingStatus("Recording meeting...");
        }
        else if (type === "STOP_RECORDING") {
          setRecording(false);
          setRecordingStatus("");
        }
      } catch (err) {
        // Parse chat text messages
        setMessages((prev) => [...prev, { text: event.data.toString(), sent: false }]);
      }
    };

    ws.onclose = () => console.log("❌ WebSocket disconnected");

    return () => ws.close();
  }, [meetingId, hostId]);

  // --- Active Speaker Detection Loop ---
  const detectActiveSpeaker = () => {
    let maxVolume = 0;
    let speakerId: string | null = null;

    // Check remote audio levels
    remoteParticipants.forEach((p) => {
      if (p.stream && p.micOn) {
        const analyser = getOrCreateAnalyser(p.userId, p.stream);
        if (analyser) {
          const volume = getStreamVolume(analyser);
          if (volume > maxVolume && volume > 15) {
            maxVolume = volume;
            speakerId = p.userId;
          }
        }
      }
    });

    // Check local audio level
    if (localStream && micOn) {
      const analyser = getOrCreateAnalyser("local", localStream);
      if (analyser) {
        const volume = getStreamVolume(analyser);
        if (volume > maxVolume && volume > 15) {
          maxVolume = volume;
          speakerId = "local";
        }
      }
    }

    if (speakerId !== activeSpeakerId) {
      setActiveSpeakerId(speakerId);
      // Synchronize in the remoteParticipants array for rendering
      setRemoteParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          isActiveSpeaker: p.userId === speakerId,
        }))
      );
    }
  };

  const getOrCreateAnalyser = (id: string, stream: MediaStream): AnalyserNode | null => {
    if (audioContextsRef.current.has(id)) {
      return audioContextsRef.current.get(id)!.analyser;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextsRef.current.set(id, { context, analyser });
      return analyser;
    } catch (err) {
      console.warn("Failed to create AudioContext:", err);
      return null;
    }
  };

  const getStreamVolume = (analyser: AnalyserNode): number => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / dataArray.length;
  };

  // Run detector every 250ms
  useEffect(() => {
    const interval = setInterval(detectActiveSpeaker, 250);
    return () => {
      clearInterval(interval);
      audioContextsRef.current.forEach((item) => {
        item.context.close();
      });
      audioContextsRef.current.clear();
    };
  }, [remoteParticipants, localStream, micOn, activeSpeakerId]);

  // --- Host Control Actions ---
  const admitParticipant = (userId: string, _userName: string) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "ADMIT", targetUserId: userId }));
      setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
    }
  };

  const denyParticipant = (userId: string) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "DENY", targetUserId: userId }));
      setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
    }
  };

  const kickParticipant = (userId: string) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "KICK", targetUserId: userId }));
    }
  };

  const muteParticipant = (userId: string) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "MUTE_MIC", targetUserId: userId }));
    }
  };

  const turnOffCamera = (userId: string) => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "CAMERA_OFF", targetUserId: userId }));
    }
  };

  const sendMessage = () => {
    if (!input || !wsRef.current) return;
    wsRef.current.send(input);
    setMessages((prev) => [...prev, { text: input, sent: true }]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  // --- Video/Mic/Screen controls ---
  const toggleVideo = async () => {
    if (videoOn) {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => (track.enabled = false));
      }
      setVideoOn(false);
      broadcastState("TOGGLE_CAMERA", { videoOn: false });
    } else {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => (track.enabled = true));
      }
      setVideoOn(true);
      broadcastState("TOGGLE_CAMERA", { videoOn: true });
    }
  };

  const toggleMic = () => {
    const nextState = !micOn;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState;
      });
    }
    setMicOn(nextState);
    broadcastState("TOGGLE_MIC", { micOn: nextState });
  };

  const indexMeeting = async () => {
    try {
      await axios.post(`${API_BASE_URL}/meetingAi/index/${meetingId}`);
      console.log("Meeting successfully indexed in Qdrant.");
    } catch (err) {
      console.error("Error indexing meeting:", err);
    }
  };

  const hangUp = async () => {
    // Stop local stream
    streamRef.current?.getTracks().forEach((track) => track.stop());
    // Stop screen sharing stream
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());

    // Close and cleanup RTCPeerConnections
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    // Close AudioContexts
    audioContextsRef.current.forEach((item) => item.context.close());
    audioContextsRef.current.clear();

    // Notify others we are leaving
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "LEAVE_ROOM" }));
    }

    // Trigger AI Indexing before leaving
    await indexMeeting();

    setCaptions("");
    navigate("/");
  };

  const shareScreen = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        screenStreamRef.current = screenStream;

        // Replace the video track inside all active peer connections
        peersRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        });

        // Trigger action when screen sharing is ended via the browser's native overlay
        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setScreenSharing(true);
        broadcastState("SCREEN_SHARE_START", {});
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Restore the camera track in all active peer connections
    if (streamRef.current) {
      const cameraTrack = streamRef.current.getVideoTracks()[0];
      if (cameraTrack) {
        peersRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(cameraTrack);
          }
        });
      }
    }

    setScreenSharing(false);
    broadcastState("SCREEN_SHARE_STOP", {});
  };

  // --- Simulated Meeting Recording with MinIO Upload ---
  const toggleRecording = () => {
    if (!recording) {
      setRecording(true);
      setRecordingStatus("Recording meeting...");
      broadcastState("START_RECORDING", {});
    } else {
      setRecording(false);
      setRecordingStatus("Saving recording chunks...");
      broadcastState("STOP_RECORDING", {});

      setTimeout(() => {
        alert("Recording stopped!\nUploading chunks to MinIO S3 object store...");
        setTimeout(() => {
          alert(
            "MinIO Upload Complete! ✅\nAvailable in bucket: 'collabrix-recordings'\nURL: s3://collabrix-recordings/meeting_" +
              meetingId +
              "_" +
              Date.now() +
              ".mp4"
          );
          setRecordingStatus("");
        }, 1500);
      }, 500);
    }
  };

  const toggleCaptions = () => {
    setCaptionsOn((prev) => !prev);
    if (captionsOn) setCaptions("");
  };

  // --- Speech Recognition ---
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = async (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const finalText = result[0].transcript.trim();
            setCaptions(finalText);

            if (meetingId && finalText) {
              try {
                const localUserName = localStorage.getItem("name") || "You";
                await axios.post(`${API_BASE_URL}/meetingAi/caption`, {
                  meetingId,
                  transcript: finalText,
                  speaker: localUserName,
                });
              } catch (err) {
                console.error("❌ Error saving caption:", err);
              }
            }
          } else {
            interimTranscript += result[0].transcript + " ";
          }
        }
        if (captionsOn && micOn && interimTranscript) {
          setCaptions(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (["aborted", "no-speech", "network"].includes(event.error)) {
          if (!isRestartingRef.current) {
            isRestartingRef.current = true;
            setTimeout(() => {
              if (micOn && !screenSharing) recognition.start();
              isRestartingRef.current = false;
            }, 1000);
          }
        }
      };

      recognition.onend = () => {
        if (!isRestartingRef.current && micOn && !screenSharing) {
          setTimeout(() => recognition.start(), 500);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    }

    return () => recognitionRef.current?.stop();
  }, [captionsOn, micOn, screenSharing, meetingId]);

  const fetchSummaryAndHighlights = async () => {
    try {
      const summaryRes = await axios.get(`${API_BASE_URL}/meetingAi/summary/${meetingId}`);
      setSummary(summaryRes.data.summary || "");

      const highlightRes = await axios.get(`${API_BASE_URL}/meetingAi/highlights/${meetingId}`);
      const data = highlightRes.data;

      if (data && Array.isArray(data.highlights)) {
        setHighlights(data.highlights);
      } else {
        setHighlights([]);
      }

      if (data && Array.isArray(data.actionItems)) {
        setActionItems(data.actionItems);
      } else {
        setActionItems([]);
      }

      if (data && Array.isArray(data.decisions)) {
        setDecisions(data.decisions);
      } else {
        setDecisions([]);
      }

      if (data && Array.isArray(data.risks)) {
        setRisks(data.risks);
      } else {
        setRisks([]);
      }
    } catch (err) {
      console.error("Error fetching summary/highlights:", err);
    }
  };

  const downloadSummary = () => {
    if (!summary) return;
    const element = document.createElement("a");
    const file = new Blob([summary], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `summary_${meetingId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadHighlights = () => {
    if (highlights.length === 0 && actionItems.length === 0 && decisions.length === 0 && risks.length === 0) return;
    
    let content = `MEETING INSIGHTS - ROOM ${meetingId}\n`;
    content += `==========================================\n\n`;

    if (highlights.length > 0) {
      content += `KEY HIGHLIGHTS:\n`;
      highlights.forEach((h) => {
        content += `- [${h.speaker}]: ${h.text}\n`;
      });
      content += `\n`;
    }

    if (actionItems.length > 0) {
      content += `ACTION ITEMS:\n`;
      actionItems.forEach((item) => {
        content += `- Task: ${item.task}\n`;
        content += `  Owner: ${item.owner}\n`;
        content += `  Deadline: ${item.deadline}\n`;
      });
      content += `\n`;
    }

    if (decisions.length > 0) {
      content += `DECISIONS MADE:\n`;
      decisions.forEach((d) => {
        content += `- ${d}\n`;
      });
      content += `\n`;
    }

    if (risks.length > 0) {
      content += `RISKS / BLOCKERS:\n`;
      risks.forEach((r) => {
        content += `- ${r}\n`;
      });
      content += `\n`;
    }

    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `highlights_${meetingId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- Conditional Rendering for Waiting Room ---
  if (denied) {
    return (
      <div className="waiting-room-container">
        <div className="waiting-card">
          <h2>Entry Denied ❌</h2>
          <p>The meeting host has denied your request to join this session.</p>
          <button className="btn solid" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmitted) {
    return (
      <div className="waiting-room-container">
        <div className="waiting-card">
          <div className="spinner"></div>
          <h2>Waiting to Join... ⏳</h2>
          <p>Please wait. The host will let you into the meeting room shortly.</p>
          <button className="btn danger" onClick={() => navigate("/")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const localUserId = localStorage.getItem("userId") || "local";
  const localUserName = localStorage.getItem("name") || "You";

  return (
    <div className="meeting-room">
      <header className="meeting-top-nav">
        <div className="nav-brand-section">
          <Link to="/" className="brand">
            Collabrix
          </Link>
          {recording && (
            <div className="recording-status-indicator">
              <span className="rec-dot pulsing-red"></span>
              <span className="rec-text">REC</span>
            </div>
          )}
        </div>
        <div className="meeting-info">
          <h2>Room: {meetingId}</h2>
        </div>
        <div className="current-time">{currentTime}</div>
      </header>

      {/* Host Pending Request Notifications */}
      {isHost && pendingRequests.length > 0 && (
        <div className="pending-requests-banner">
          {pendingRequests.map((req) => (
            <div key={req.userId} className="request-item">
              <span>
                <strong>{req.userName}</strong> wants to join the meeting.
              </span>
              <div className="request-actions">
                <button className="btn-success" onClick={() => admitParticipant(req.userId, req.userName)}>
                  Admit
                </button>
                <button className="btn-danger" onClick={() => denyParticipant(req.userId)}>
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="main-layout">
        <div className="video-container">
          <VideoGrid
            localStream={localStream}
            localUserName={localUserName}
            localMicOn={micOn}
            localVideoOn={videoOn}
            localIsSpeaker={activeSpeakerId === "local"}
            remoteParticipants={remoteParticipants}
            onReconnectPeer={reconnectPeer}
            screenShareStream={
              screenSharing
                ? screenStreamRef.current
                : remoteParticipants.find((p) => p.screenSharing)?.stream || null
            }
            screenShareUser={
              screenSharing
                ? "You"
                : remoteParticipants.find((p) => p.screenSharing)?.userName || null
            }
          />
          {captionsOn && captions && <div className="live-captions">{captions}</div>}
          {recordingStatus && <div className="recording-status-toast">{recordingStatus}</div>}
        </div>

        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
            >
              Meeting Insights
            </button>
            <button
              className={`tab-btn ${activeTab === "participants" ? "active" : ""}`}
              onClick={() => setActiveTab("participants")}
            >
              Participants ({remoteParticipants.length + 1})
            </button>
            <button
              className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              AI Chat
            </button>
          </div>

          <div className="sidebar-scroll">
            {activeTab === "insights" ? (
              <section className="notes-section">
                <div className="btn-group">
                  <button onClick={fetchSummaryAndHighlights} className="summary-btn">
                    <FaFileAlt /> Generate AI Insights
                  </button>
                </div>

                {summary && (
                  <div className="content-block">
                    <div className="content-header">
                      <h4>Summary</h4>
                      <button onClick={downloadSummary} className="download-btn-small" title="Download Summary">
                        <FaDownload /> Download
                      </button>
                    </div>
                    <p className="summary-text">{summary}</p>
                  </div>
                )}

                {(highlights.length > 0 || actionItems.length > 0 || decisions.length > 0 || risks.length > 0) && (
                  <div className="content-block">
                    <div className="content-header">
                      <h4>Meeting Intelligence</h4>
                      <button onClick={downloadHighlights} className="download-btn-small" title="Download Highlights">
                        <FaDownload /> Download
                      </button>
                    </div>

                    {highlights.length > 0 && (
                      <div className="sub-content-block">
                        <h5>Key Highlights</h5>
                        <ul className="highlights-list">
                          {highlights.map((h, i) => (
                            <li key={i}>
                              <span className="speaker-badge">{h.speaker}</span>: {h.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {actionItems.length > 0 && (
                      <div className="sub-content-block">
                        <h5>Action Items</h5>
                        <div className="action-items-grid">
                          {actionItems.map((item, i) => (
                            <div key={i} className="action-card">
                              <p className="action-task">{item.task}</p>
                              <div className="action-meta">
                                <span className="action-owner" title="Owner">👤 {item.owner}</span>
                                <span className="action-deadline" title="Deadline">📅 {item.deadline}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {decisions.length > 0 && (
                      <div className="sub-content-block">
                        <h5>Decisions Made</h5>
                        <ul className="decisions-list">
                          {decisions.map((d, i) => (
                            <li key={i}>✅ {d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {risks.length > 0 && (
                      <div className="sub-content-block">
                        <h5>Risks & Blockers</h5>
                        <ul className="risks-list">
                          {risks.map((r, i) => (
                            <li key={i}>⚠️ {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : activeTab === "chat" ? (
              <section className="chat-section" style={{ padding: "15px", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
                <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px" }}>
                  {ragMessages.map((m, i) => (
                    <div key={i} style={{ marginBottom: "15px", background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ marginBottom: "8px", color: "#e2e8f0" }}><strong>You:</strong> {m.query}</div>
                      <div style={{ color: "#60a5fa", lineHeight: "1.5" }}>
                        <strong>Collabrix AI:</strong> {m.answer}
                        {m.sources && m.sources.length > 0 && (
                          <div style={{ marginTop: "12px", fontSize: "0.85em", color: "#94a3b8", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "6px" }}>
                            <strong style={{ display: "block", marginBottom: "4px" }}>Citations:</strong>
                            <ul style={{ margin: "0 0 0 15px", padding: 0 }}>
                              {m.sources.map((s: any, idx: number) => (
                                <li key={idx} style={{ marginBottom: "4px" }}><em>{s.speaker}:</em> "{s.text}"</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {ragMessages.length === 0 && (
                    <div style={{ textAlign: "center", marginTop: "40px", color: "#94a3b8" }}>
                      <p style={{ fontSize: "1.1em", marginBottom: "10px" }}>🧠 AI Meeting Memory</p>
                      <p style={{ fontSize: "0.9em" }}>Ask any question about what was discussed in this or past meetings!</p>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
                  <input 
                    type="text" 
                    value={ragInput} 
                    onChange={(e) => setRagInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && askAiMemory()}
                    placeholder="E.g., Who owns the payment task?"
                    disabled={ragLoading}
                    style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.3)", color: "white" }}
                  />
                  <button 
                    onClick={askAiMemory} 
                    disabled={ragLoading} 
                    style={{ padding: "0 20px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    Ask
                  </button>
                </div>
              </section>
            ) : (
              <ParticipantList
                participants={[
                  {
                    userId: localUserId,
                    userName: localUserName,
                    isHost: isHost,
                    micOn: micOn,
                    videoOn: videoOn,
                    screenSharing: screenSharing,
                  },
                  ...remoteParticipants.map((p) => ({
                    userId: p.userId,
                    userName: p.userName,
                    isHost: p.userId === hostId,
                    micOn: p.micOn,
                    videoOn: p.videoOn,
                    screenSharing: p.screenSharing,
                  })),
                ]}
                isLocalHost={isHost}
                localUserId={localUserId}
                onMute={muteParticipant}
                onTurnOffCamera={turnOffCamera}
                onKick={kickParticipant}
              />
            )}
          </div>

          <div className="chat-container">
            <div className="messages">
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.sent ? "sent" : "received"}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message team..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </aside>
      </div>

      <footer className="control-bar">
        <div className="controls">
          <button className={`btn-circle ${videoOn ? "active" : ""}`} onClick={toggleVideo}>
            {videoOn ? <FaVideo /> : <FaVideoSlash />}
          </button>
          <button className={`btn-circle ${micOn ? "active" : ""}`} onClick={toggleMic}>
            {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>
          <button className={`btn-circle ${captionsOn ? "active" : ""}`} onClick={toggleCaptions}>
            CC
          </button>
          <button className={`btn-circle ${screenSharing ? "active" : ""}`} onClick={shareScreen}>
            <FaDesktop />
          </button>
          <button className={`btn-circle recording-btn ${recording ? "active" : ""}`} onClick={toggleRecording}>
            <FaCircle />
          </button>
          <button className="btn-circle danger" onClick={hangUp}>
            <FaPhone />
          </button>
        </div>
        <div className="actions">
          <button className="btn-ghost" onClick={() => setActiveTab("participants")}>
            Participants
          </button>
        </div>
      </footer>
    </div>
  );
};

export default MeetingRoom;
