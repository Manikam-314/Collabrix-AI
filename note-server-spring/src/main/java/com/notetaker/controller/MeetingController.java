package com.notetaker.controller;

import com.notetaker.model.Meeting;
import com.notetaker.repository.MeetingRepository;
import com.notetaker.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/meetings")
public class MeetingController {

    @Autowired
    private MeetingRepository meetingRepository;

    @GetMapping("/create-meeting")
    public ResponseEntity<?> createMeeting() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        String meetingId = UUID.randomUUID().toString();

        Meeting meeting = new Meeting();
        meeting.setId(meetingId);
        meeting.setHostId(userDetails.getId());
        meeting.setCreatedAt(System.currentTimeMillis());
        
        meetingRepository.save(meeting);

        return ResponseEntity.ok(Map.of("meetingId", meetingId, "hostId", userDetails.getId()));
    }

    @GetMapping("/get-meeting/{meetingId}")
    public ResponseEntity<?> getMeeting(@PathVariable String meetingId) {
        return meetingRepository.findById(meetingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/past-meetings")
    public ResponseEntity<?> getPastMeetings() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        java.util.List<Meeting> meetings = meetingRepository.findByHostIdOrderByCreatedAtDesc(userDetails.getId());
        return ResponseEntity.ok(meetings);
    }
}
