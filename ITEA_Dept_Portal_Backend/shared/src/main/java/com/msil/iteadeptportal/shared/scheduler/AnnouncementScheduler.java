package com.msil.iteadeptportal.shared.scheduler;

import com.msil.iteadeptportal.shared.event.NotificationEvent;
import com.msil.iteadeptportal.shared.model.Announcement;
import com.msil.iteadeptportal.shared.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class AnnouncementScheduler {

    private final AnnouncementRepository announcementRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Checks every 1 minute for scheduled announcements whose publishFrom timestamp has arrived,
     * transitions status to PUBLISHED, and emits broadcast notifications for all active users.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void processScheduledAnnouncements() {
        LocalDateTime now = LocalDateTime.now();
        List<Announcement> toPublish = announcementRepository.findScheduledAnnouncementsToPublish(now);

        for (Announcement announcement : toPublish) {
            try {
                announcement.setStatus("PUBLISHED");
                announcement.setPublishedAt(now);
                announcementRepository.save(announcement);

                List<Long> allUserIds = jdbcTemplate.queryForList("SELECT user_id FROM users WHERE status = 'ACTIVE'", Long.class);
                // Exclude creator from notification recipients
                final Long creatorId = announcement.getCreatedBy();
                List<Long> recipients = allUserIds.stream()
                        .filter(uid -> !uid.equals(creatorId))
                        .toList();
                eventPublisher.publishEvent(new NotificationEvent(
                        recipients,
                        "ANNOUNCEMENT",
                        "Announcement: " + announcement.getTitle(),
                        announcement.getMessage(),
                        "ANNOUNCEMENT",
                        announcement.getAnnouncementId()
                ));

                log.info("Scheduled Announcement ID {} automatically published. Notifications broadcasted.", announcement.getAnnouncementId());
            } catch (Exception e) {
                log.error("Failed to process scheduled announcement ID {}: {}", announcement.getAnnouncementId(), e.getMessage());
            }
        }

        // Process expiration of published announcements whose publishUntil has passed
        List<Announcement> toExpire = announcementRepository.findPublishedAnnouncementsToExpire(now);
        for (Announcement announcement : toExpire) {
            try {
                announcement.setStatus("EXPIRED");
                announcementRepository.save(announcement);
                log.info("Announcement ID {} automatically set to EXPIRED.", announcement.getAnnouncementId());
            } catch (Exception e) {
                log.error("Failed to expire announcement ID {}: {}", announcement.getAnnouncementId(), e.getMessage());
            }
        }
    }
}
