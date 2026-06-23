package com.notetaker.repository;

import com.notetaker.model.Caption;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CaptionRepository extends MongoRepository<Caption, String> {
    List<Caption> findByMeetingIdOrderByTimestampAsc(String meetingId);
}
