package com.msil.iteadeptportal.shared.service;

import com.msil.iteadeptportal.shared.api.BadRequestException;
import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import com.msil.iteadeptportal.shared.api.ResourceNotFoundException;
import com.msil.iteadeptportal.shared.event.NotificationEvent;
import com.msil.iteadeptportal.shared.model.Announcement;
import com.msil.iteadeptportal.shared.repository.AnnouncementRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final JdbcTemplate jdbcTemplate;

    @Data
    public static class CreateAnnouncementRequest {
        private String title;
        private String message;
        private String priority; // LOW, MEDIUM, HIGH
        private LocalDateTime publishFrom;
        private LocalDateTime publishUntil;
    }

    @Data
    public static class UpdateAnnouncementRequest {
        private String title;
        private String message;
        private String priority;
        private LocalDateTime publishFrom;
        private LocalDateTime publishUntil;
    }

    @Data
    public static class ScheduleAnnouncementRequest {
        private LocalDateTime publishFrom;
        private LocalDateTime publishUntil;
    }

    @Transactional
    public Announcement createAnnouncement(CreateAnnouncementRequest request, Long adminUserId) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("Title is required.");
        }
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new BadRequestException("Message is required.");
        }

        Announcement announcement = Announcement.builder()
                .title(request.getTitle().trim())
                .message(request.getMessage().trim())
                .priority(request.getPriority() != null ? request.getPriority().toUpperCase() : "MEDIUM")
                .status("DRAFT")
                .publishFrom(request.getPublishFrom())
                .publishUntil(request.getPublishUntil())
                .createdBy(adminUserId)
                .build();

        return announcementRepository.save(announcement);
    }

    @Transactional
    public Announcement updateAnnouncement(Long announcementId, UpdateAnnouncementRequest request, Long adminUserId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        if (!"DRAFT".equals(announcement.getStatus()) && !"SCHEDULED".equals(announcement.getStatus())) {
            throw new BadRequestException("Only DRAFT or SCHEDULED announcements can be updated.");
        }

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            announcement.setTitle(request.getTitle().trim());
        }
        if (request.getMessage() != null && !request.getMessage().isBlank()) {
            announcement.setMessage(request.getMessage().trim());
        }
        if (request.getPriority() != null) {
            announcement.setPriority(request.getPriority().toUpperCase());
        }
        if (request.getPublishFrom() != null) {
            announcement.setPublishFrom(request.getPublishFrom());
        }
        if (request.getPublishUntil() != null) {
            announcement.setPublishUntil(request.getPublishUntil());
        }

        return announcementRepository.save(announcement);
    }

    @Transactional
    public Announcement publishAnnouncement(Long announcementId, Long adminUserId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        if ("PUBLISHED".equals(announcement.getStatus())) {
            return announcement;
        }

        LocalDateTime now = LocalDateTime.now();
        announcement.setStatus("PUBLISHED");
        announcement.setPublishedAt(now);
        announcement = announcementRepository.save(announcement);

        // 🚀 Broadcast NotificationEvent for ALL active users EXCEPT the creator
        List<Long> allUserIds = getAllActiveUserIds();
        List<Long> recipients = allUserIds.stream()
                .filter(uid -> !uid.equals(adminUserId))
                .toList();
        eventPublisher.publishEvent(new NotificationEvent(
                recipients,
                "ANNOUNCEMENT",
                "Announcement: " + announcement.getTitle(),
                announcement.getMessage(),
                "ANNOUNCEMENT",
                announcement.getAnnouncementId()
        ));

        log.info("Announcement {} published by admin user {}. Broadcasted to {} users (creator excluded).", announcementId, adminUserId, recipients.size());
        return announcement;
    }

    @Transactional
    public Announcement scheduleAnnouncement(Long announcementId, ScheduleAnnouncementRequest request, Long adminUserId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        if (!"DRAFT".equals(announcement.getStatus())) {
            throw new BadRequestException("Only DRAFT announcements can be scheduled.");
        }

        if (request.getPublishFrom() == null) {
            throw new BadRequestException("publishFrom timestamp is required for scheduling.");
        }

        announcement.setStatus("SCHEDULED");
        announcement.setPublishFrom(request.getPublishFrom());
        if (request.getPublishUntil() != null) {
            announcement.setPublishUntil(request.getPublishUntil());
        }

        return announcementRepository.save(announcement);
    }

    @Transactional
    public Announcement archiveAnnouncement(Long announcementId, Long adminUserId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        announcement.setStatus("ARCHIVED");
        announcement.setArchivedAt(LocalDateTime.now());
        return announcementRepository.save(announcement);
    }

    @Transactional
    public void deleteAnnouncement(Long announcementId, Long adminUserId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        if (!"DRAFT".equals(announcement.getStatus()) && !"ARCHIVED".equals(announcement.getStatus())) {
            throw new BadRequestException("Only DRAFT or ARCHIVED announcements can be deleted.");
        }

        announcementRepository.delete(announcement);
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<Announcement> getAnnouncements(boolean isAdmin, String statusFilter, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Announcement> pageResult;

        if (!isAdmin) {
            pageResult = announcementRepository.findPublishedAnnouncements(pageable);
        } else if (statusFilter != null && !statusFilter.isBlank()) {
            pageResult = announcementRepository.findByStatus(statusFilter.toUpperCase(), pageable);
        } else {
            pageResult = announcementRepository.findAll(pageable);
        }

        return PaginatedResponse.from(pageResult);
    }

    
    @Transactional(readOnly = true)
    public Announcement getAnnouncementDetails(Long announcementId) {
        return announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));
    }

    public List<Long> getAllActiveUserIds() {
        try {
            return jdbcTemplate.queryForList("SELECT user_id FROM users WHERE status = 'ACTIVE'", Long.class);
        } catch (Exception e) {
            log.error("Failed to query active user IDs: {}", e.getMessage());
            return List.of();
        }
    }
}
