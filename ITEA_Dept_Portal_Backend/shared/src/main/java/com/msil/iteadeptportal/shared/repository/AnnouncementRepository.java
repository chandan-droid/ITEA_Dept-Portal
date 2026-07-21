package com.msil.iteadeptportal.shared.repository;

import com.msil.iteadeptportal.shared.model.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    Page<Announcement> findByStatus(String status, Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.status = 'PUBLISHED' ORDER BY a.publishedAt DESC")
    Page<Announcement> findPublishedAnnouncements(Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.status = 'SCHEDULED' AND a.publishFrom <= :now")
    List<Announcement> findScheduledAnnouncementsToPublish(@Param("now") LocalDateTime now);

    @Query("SELECT a FROM Announcement a WHERE a.status = 'PUBLISHED' AND a.publishUntil IS NOT NULL AND a.publishUntil <= :now")
    List<Announcement> findPublishedAnnouncementsToExpire(@Param("now") LocalDateTime now);
}
