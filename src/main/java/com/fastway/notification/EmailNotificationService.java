package com.fastway.notification;

import com.fastway.order.Order;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * SMTP email delivery is deliberately optional. A missing SMTP account must never
 * make order placement or payment confirmation fail.
 */
@Service
@Slf4j
public class EmailNotificationService {
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final NotificationSettingsRepository settingsRepository;

    @Value("${mail.enabled:false}")
    private boolean enabled;

    @Value("${mail.from:}")
    private String from;

    public EmailNotificationService(ObjectProvider<JavaMailSender> mailSenderProvider, NotificationSettingsRepository settingsRepository) {
        this.mailSenderProvider = mailSenderProvider;
        this.settingsRepository = settingsRepository;
    }

    @Async
    public void sendOrderPlaced(Order order) {
        if (order == null || order.getUser() == null) return;
        boolean emailEnabled = settingsRepository.findByUserId(order.getUser().getId())
                .map(NotificationSettings::getEmailEnabled)
                .orElse(true);
        if (!emailEnabled) {
            log.debug("User has disabled order email notifications; skipping.");
            return;
        }
        send(order.getUser().getEmail(), "Fastway order #FW-" + order.getId() + " placed",
                "Your Fastway order #FW-" + order.getId() + " has been placed successfully.\n\nTotal: \u20B9" + order.getTotalAmount() +
                        "\nPayment mode: " + order.getPaymentMode() + "\nPayment status: " + order.getPaymentStatus());
    }

    @Async
    public void sendPaymentUpdate(Order order, boolean successful) {
        if (order == null || order.getUser() == null) return;
        boolean emailEnabled = settingsRepository.findByUserId(order.getUser().getId())
                .map(NotificationSettings::getEmailEnabled)
                .orElse(true);
        if (!emailEnabled) {
            log.debug("User has disabled order email notifications; skipping.");
            return;
        }
        String state = successful ? "successful" : "failed";
        send(order.getUser().getEmail(), "Fastway payment " + state + " for order #FW-" + order.getId(),
                "Your payment for Fastway order #FW-" + order.getId() + " was " + state + ".\n\nPayment status: " + order.getPaymentStatus());
    }

    private void send(String recipient, String subject, String body) {
        if (!enabled) {
            log.debug("SMTP email disabled; skipped notification to {}", recipient);
            return;
        }
        if (recipient == null || recipient.isBlank()) {
            log.info("Skipping SMTP notification because the user has no email address");
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null || from == null || from.isBlank()) {
            log.warn("SMTP email is enabled but MAIL_FROM/SMTP sender is not configured; notification skipped");
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            log.info("SMTP notification sent to {}", recipient);
        } catch (Exception ex) {
            log.error("SMTP notification failed for {}: {}", recipient, ex.getMessage());
        }
    }
}
