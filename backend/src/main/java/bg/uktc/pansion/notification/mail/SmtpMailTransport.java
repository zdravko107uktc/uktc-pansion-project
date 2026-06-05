package bg.uktc.pansion.notification.mail;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * SMTP delivery strategy backed by Spring's {@link JavaMailSender}. Spring Boot only auto-configures
 * a {@code JavaMailSender} when {@code spring.mail.host} is set, so the sender is injected lazily via
 * {@link ObjectProvider}; when no host is configured the transport simply reports itself unavailable
 * and the dispatcher falls back to log-only mode.
 */
@Component
public class SmtpMailTransport implements MailTransport {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String configuredHost;

    public SmtpMailTransport(ObjectProvider<JavaMailSender> mailSenderProvider,
                             @Value("${spring.mail.host:}") String configuredHost) {
        this.mailSenderProvider = mailSenderProvider;
        this.configuredHost = configuredHost;
    }

    @Override
    public boolean isAvailable() {
        return configuredHost != null && !configuredHost.isBlank() && mailSenderProvider.getIfAvailable() != null;
    }

    @Override
    public void send(MailMessage message) throws Exception {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new IllegalStateException("No JavaMailSender configured (set spring.mail.host).");
        }
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
        helper.setFrom(buildFrom(message));
        helper.setTo(message.to());
        helper.setSubject(message.subject());
        helper.setText(message.body(), false);
        mailSender.send(mimeMessage);
    }

    private InternetAddress buildFrom(MailMessage message) throws UnsupportedEncodingException {
        return new InternetAddress(message.fromEmail(), message.fromName(), StandardCharsets.UTF_8.name());
    }
}
