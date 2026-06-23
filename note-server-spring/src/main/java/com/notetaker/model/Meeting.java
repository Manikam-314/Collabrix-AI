package com.notetaker.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "meetings")
public class Meeting {
    @Id
    private String id;
    private String hostId;
    private Long createdAt;
}
