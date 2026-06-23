package com.notetaker.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "captions")
public class Caption {
    @Id
    private String id;
    private String meetingId;
    private String text;
    private String speaker;
    private Long timestamp;
}
