package com.notetaker.repository;

import com.notetaker.model.Meeting;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MeetingRepository extends MongoRepository<Meeting, String> {
    List<Meeting> findByHostIdOrderByCreatedAtDesc(String hostId);
}
