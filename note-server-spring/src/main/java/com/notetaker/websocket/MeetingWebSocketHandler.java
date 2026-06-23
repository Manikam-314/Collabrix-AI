package com.notetaker.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notetaker.model.Caption;
import com.notetaker.model.Meeting;
import com.notetaker.model.User;
import com.notetaker.repository.CaptionRepository;
import com.notetaker.repository.MeetingRepository;
import com.notetaker.repository.UserRepository;
import com.notetaker.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class MeetingWebSocketHandler extends TextWebSocketHandler {

    @Autowired
    private CaptionRepository captionRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final Map<WebSocketSession, String> sessionRooms = new ConcurrentHashMap<>();
    private final Map<WebSocketSession, String> sessionUsers = new ConcurrentHashMap<>();
    private final Map<WebSocketSession, Boolean> sessionHosts = new ConcurrentHashMap<>();
    private final Map<WebSocketSession, String> sessionUserNames = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        String query = uri.getQuery();
        String meetingId = null;
        String token = null;

        if (query != null) {
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("meetingId=")) {
                    meetingId = param.substring(10);
                } else if (param.startsWith("token=")) {
                    token = param.substring(6);
                }
            }
        }

        if (meetingId == null || token == null || !jwtUtil.validateJwtToken(token)) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        String email = jwtUtil.getUserNameFromJwtToken(token);
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        User user = userOpt.get();
        String userId = user.getId();
        String userName = user.getName();

        Optional<Meeting> meetingOpt = meetingRepository.findById(meetingId);
        boolean isHost = meetingOpt.isPresent() && meetingOpt.get().getHostId().equals(userId);

        rooms.computeIfAbsent(meetingId, k -> new CopyOnWriteArraySet<>()).add(session);
        sessionRooms.put(session, meetingId);
        sessionUsers.put(session, userId);
        sessionHosts.put(session, isHost);
        sessionUserNames.put(session, userName);
        
        System.out.println("Client connected to meeting: " + meetingId + " as " + (isHost ? "Host" : "Participant") + " userId: " + userId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        String meetingId = sessionRooms.get(session);
        String userId = sessionUsers.get(session);
        String userName = sessionUserNames.get(session);
        Boolean isHost = sessionHosts.get(session);

        if (meetingId == null) return;

        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String type = (String) data.get("type");

            if ("JOIN_REQUEST".equals(type)) {
                // Forward request to host
                data.put("userId", userId);
                data.put("userName", userName);
                String forwardPayload = objectMapper.writeValueAsString(data);
                sendMessageToHost(meetingId, forwardPayload);
            } 
            else if (isHost != null && isHost && ("ADMIT".equals(type) || "DENY".equals(type) || "KICK".equals(type) || "MUTE_MIC".equals(type) || "CAMERA_OFF".equals(type))) {
                // Host command directed at a specific user
                String targetUserId = (String) data.get("targetUserId");
                if (targetUserId != null) {
                    sendMessageToUser(meetingId, targetUserId, payload);
                }
            }
            // WebRTC Signaling: Targeted message routing
            else if ("SDP_OFFER".equals(type) || "SDP_ANSWER".equals(type) || "ICE_CANDIDATE".equals(type)) {
                String targetUserId = (String) data.get("targetUserId");
                if (targetUserId != null) {
                    data.put("senderUserId", userId);
                    data.put("senderUserName", userName);
                    String updatedPayload = objectMapper.writeValueAsString(data);
                    sendMessageToUser(meetingId, targetUserId, updatedPayload);
                }
            }
            // WebRTC Broadcasting Actions & Media Control events
            else if ("JOIN_ROOM".equals(type) || "LEAVE_ROOM".equals(type) || 
                     "TOGGLE_MIC".equals(type) || "TOGGLE_CAMERA".equals(type) || 
                     "SCREEN_SHARE_START".equals(type) || "SCREEN_SHARE_STOP".equals(type) ||
                     "START_RECORDING".equals(type) || "STOP_RECORDING".equals(type)) {
                data.put("senderUserId", userId);
                data.put("senderUserName", userName);
                String updatedPayload = objectMapper.writeValueAsString(data);
                broadcastMessageToRoom(meetingId, session.getId(), updatedPayload);
            }
            else {
                // General broadcast (captions or other un-typed data)
                if (data.containsKey("text")) {
                    Caption caption = new Caption();
                    caption.setMeetingId(meetingId);
                    caption.setText((String) data.get("text"));
                    caption.setTimestamp(System.currentTimeMillis());
                    captionRepository.save(caption);
                }
                
                // Broadcast to all other clients in the room
                broadcastMessageToRoom(meetingId, session.getId(), payload);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void broadcastMessageToRoom(String meetingId, String excludeSessionId, String payload) {
        Set<WebSocketSession> roomSessions = rooms.get(meetingId);
        if (roomSessions != null) {
            for (WebSocketSession s : roomSessions) {
                if (s.isOpen() && (excludeSessionId == null || !s.getId().equals(s.getId()))) { // Keep standard exclusion check or excludeSessionId comparison
                    // Wait, let's write it correctly: s.getId().equals(excludeSessionId) is what we want! Let's check:
                    if (excludeSessionId != null && s.getId().equals(excludeSessionId)) {
                        continue;
                    }
                    try {
                        s.sendMessage(new TextMessage(payload));
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    private void sendMessageToHost(String meetingId, String payload) {
        Set<WebSocketSession> roomSessions = rooms.get(meetingId);
        if (roomSessions != null) {
            for (WebSocketSession s : roomSessions) {
                Boolean isHost = sessionHosts.get(s);
                if (s.isOpen() && isHost != null && isHost) {
                    try {
                        s.sendMessage(new TextMessage(payload));
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    private void sendMessageToUser(String meetingId, String targetUserId, String payload) {
        Set<WebSocketSession> roomSessions = rooms.get(meetingId);
        if (roomSessions != null) {
            for (WebSocketSession s : roomSessions) {
                String uId = sessionUsers.get(s);
                if (s.isOpen() && targetUserId.equals(uId)) {
                    try {
                        s.sendMessage(new TextMessage(payload));
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String meetingId = sessionRooms.remove(session);
        String userId = sessionUsers.remove(session);
        sessionHosts.remove(session);
        sessionUserNames.remove(session);
        
        if (meetingId != null) {
            Set<WebSocketSession> roomSessions = rooms.get(meetingId);
            if (roomSessions != null) {
                roomSessions.remove(session);
                if (roomSessions.isEmpty()) {
                    rooms.remove(meetingId);
                }
            }
            if (userId != null) {
                Map<String, Object> leaveData = Map.of(
                    "type", "LEAVE_ROOM",
                    "senderUserId", userId
                );
                String leavePayload = objectMapper.writeValueAsString(leaveData);
                broadcastMessageToRoom(meetingId, null, leavePayload);
            }
        }
    }
}
