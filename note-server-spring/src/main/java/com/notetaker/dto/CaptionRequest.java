package com.notetaker.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CaptionRequest {
    @NotBlank
    private String meetingId;
    private String text;
    private String transcript;
    private Long timestamp;
    private String speaker;

    public String getText() {
        if (text != null && !text.isBlank()) {
            return text;
        }
        return transcript;
    }
}
