package com.msil.iteadeptportal.shared.listener;

import com.msil.iteadeptportal.shared.event.NotificationEvent;
import com.msil.iteadeptportal.shared.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNotificationEvent(NotificationEvent event) {
        log.debug("Received NotificationEvent via Spring Event Bus: {}", event);
        try {
            notificationService.processEvent(event);
        } catch (Exception e) {
            log.error("Async notification listener processing failed: {}", e.getMessage(), e);
        }
    }
}
