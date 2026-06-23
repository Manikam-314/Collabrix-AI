package com.notetaker.controller;

import com.notetaker.model.Caption;
import com.notetaker.repository.CaptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/meetingAi")
public class MeetingChatController {

    @Autowired
    private CaptionRepository captionRepository;

    @Value("${python.service.url}")
    private String pythonServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/index/{meetingId}")
    public ResponseEntity<?> indexMeeting(@PathVariable String meetingId) {
        List<Caption> captions = captionRepository.findByMeetingIdOrderByTimestampAsc(meetingId);
        String fullText = captions.stream()
                .map(c -> (c.getSpeaker() != null ? c.getSpeaker() : "Unknown") + ": " + c.getText())
                .collect(Collectors.joining("\n"));

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    pythonServiceUrl + "/index",
                    Map.of("meetingId", meetingId, "transcript", fullText),
                    Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/meetings/{meetingId}/ask")
    public ResponseEntity<?> askQuestion(@PathVariable String meetingId, @RequestBody Map<String, String> payload) {
        String question = payload.get("question");
        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));
        }

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    pythonServiceUrl + "/ask",
                    Map.of("meetingId", meetingId, "question", question),
                    Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
