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

import com.notetaker.model.Meeting;
import com.notetaker.repository.MeetingRepository;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/meetingAi")
public class MeetingChatController {

    @Autowired
    private CaptionRepository captionRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Value("${python.service.url}")
    private String pythonServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/index/{meetingId}")
    public ResponseEntity<?> indexMeeting(@PathVariable String meetingId) {
        List<Caption> captions = captionRepository.findByMeetingIdOrderByTimestampAsc(meetingId);
        String fullText = captions.stream()
                .map(c -> (c.getSpeaker() != null ? c.getSpeaker() : "Unknown") + ": " + c.getText())
                .collect(Collectors.joining("\n"));

        Map<String, Object> indexResponse = null;
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    pythonServiceUrl + "/index",
                    Map.of("meetingId", meetingId, "transcript", fullText),
                    Map.class);
            indexResponse = response.getBody();
        } catch (Exception e) {
            System.err.println("Warning: Qdrant indexing failed: " + e.getMessage());
        }

        // Fetch AI Summary
        String summary = "";
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    pythonServiceUrl + "/summary",
                    Map.of("transcript", fullText),
                    Map.class);
            if (response.getBody() != null) {
                summary = (String) response.getBody().get("summary");
            }
        } catch (Exception e) {
            System.err.println("Warning: AI summary retrieval failed: " + e.getMessage());
        }

        // Fetch AI Highlights, Action Items, Decisions, Risks
        List<Map<String, Object>> highlightsList = null;
        List<Map<String, Object>> actionItemsList = null;
        List<String> decisionsList = null;
        List<String> risksList = null;
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    pythonServiceUrl + "/highlights",
                    Map.of("transcript", fullText),
                    Map.class);
            Map<String, Object> highlightsMap = response.getBody();
            if (highlightsMap != null) {
                highlightsList = (List<Map<String, Object>>) highlightsMap.get("highlights");
                actionItemsList = (List<Map<String, Object>>) highlightsMap.get("actionItems");
                decisionsList = (List<String>) highlightsMap.get("decisions");
                risksList = (List<String>) highlightsMap.get("risks");
            }
        } catch (Exception e) {
            System.err.println("Warning: AI highlights retrieval failed: " + e.getMessage());
        }

        // Save everything to MongoDB
        try {
            Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
            if (meeting == null) {
                meeting = new Meeting();
                meeting.setId(meetingId);
                meeting.setCreatedAt(System.currentTimeMillis());
            }

            if (meeting.getTitle() == null || meeting.getTitle().trim().isEmpty()) {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm");
                meeting.setTitle("Meeting - " + sdf.format(new Date()));
            }

            meeting.setSummary(summary);
            meeting.setHighlights(highlightsList);
            meeting.setActionItems(actionItemsList);
            meeting.setDecisions(decisionsList);
            meeting.setRisks(risksList);

            meetingRepository.save(meeting);
        } catch (Exception e) {
            System.err.println("Error saving meeting details to MongoDB: " + e.getMessage());
        }

        return ResponseEntity.ok(indexResponse != null ? indexResponse : Map.of("message", "Processed successfully."));
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
