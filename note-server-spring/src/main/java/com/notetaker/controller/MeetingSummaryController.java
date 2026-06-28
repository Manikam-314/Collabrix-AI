package com.notetaker.controller;

import com.notetaker.dto.CaptionRequest;
import com.notetaker.model.Caption;
import com.notetaker.model.Meeting;
import com.notetaker.repository.CaptionRepository;
import com.notetaker.repository.MeetingRepository;
import jakarta.validation.Valid;
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
public class MeetingSummaryController {

    @Autowired
    private CaptionRepository captionRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Value("${python.service.url}")
    private String pythonServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/caption")
    public ResponseEntity<?> saveCaption(@Valid @RequestBody CaptionRequest captionRequest) {
        Caption caption = new Caption();
        caption.setMeetingId(captionRequest.getMeetingId());
        caption.setText(captionRequest.getText());
        caption.setSpeaker(captionRequest.getSpeaker() != null ? captionRequest.getSpeaker() : "Unknown");
        caption.setTimestamp(captionRequest.getTimestamp() != null ? captionRequest.getTimestamp() : System.currentTimeMillis());
        
        captionRepository.save(caption);
        return ResponseEntity.ok(Map.of("message", "Caption saved"));
    }

    @GetMapping("/summary/{meetingId}")
    public ResponseEntity<?> getSummary(@PathVariable String meetingId) {
        List<Caption> captions = captionRepository.findByMeetingIdOrderByTimestampAsc(meetingId);
        String fullText = captions.stream()
                .map(c -> (c.getSpeaker() != null ? c.getSpeaker() : "Unknown") + ": " + c.getText())
                .collect(Collectors.joining("\n"));
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    pythonServiceUrl + "/summary", 
                    Map.of("transcript", fullText), 
                    Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("summary")) {
                String summaryText = (String) body.get("summary");
                meetingRepository.findById(meetingId).ifPresent(m -> {
                    m.setSummary(summaryText);
                    meetingRepository.save(m);
                });
            }
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/highlights/{meetingId}")
    public ResponseEntity<?> getHighlights(@PathVariable String meetingId) {
        List<Caption> captions = captionRepository.findByMeetingIdOrderByTimestampAsc(meetingId);
        String fullText = captions.stream()
                .map(c -> (c.getSpeaker() != null ? c.getSpeaker() : "Unknown") + ": " + c.getText())
                .collect(Collectors.joining("\n"));
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    pythonServiceUrl + "/highlights", 
                    Map.of("transcript", fullText), 
                    Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null) {
                meetingRepository.findById(meetingId).ifPresent(m -> {
                    if (body.containsKey("highlights")) {
                        m.setHighlights((List<Map<String, Object>>) body.get("highlights"));
                    }
                    if (body.containsKey("actionItems")) {
                        m.setActionItems((List<Map<String, Object>>) body.get("actionItems"));
                    }
                    if (body.containsKey("decisions")) {
                        m.setDecisions((List<String>) body.get("decisions"));
                    }
                    if (body.containsKey("risks")) {
                        m.setRisks((List<String>) body.get("risks"));
                    }
                    meetingRepository.save(m);
                });
            }
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/captions/{meetingId}")
    public ResponseEntity<?> getCaptions(@PathVariable String meetingId) {
        try {
            List<Caption> captions = captionRepository.findByMeetingIdOrderByTimestampAsc(meetingId);
            return ResponseEntity.ok(captions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
