package com.notetaker.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.Map;

@Data
@Document(collection = "meetings")
public class Meeting {
    @Id
    private String id;
    private String hostId;
    private Long createdAt;
    private String title;
    private String summary;
    private List<Map<String, Object>> highlights;
    private List<Map<String, Object>> actionItems;
    private List<String> decisions;
    private List<String> risks;
}
