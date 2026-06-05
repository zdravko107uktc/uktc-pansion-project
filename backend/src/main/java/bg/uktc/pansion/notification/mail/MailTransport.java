package bg.uktc.pansion.notification.mail;

/**
 * Strategy abstraction for delivering an email. Implementations decide the wire protocol (SMTP,
 * future API providers, etc.). The dispatcher depends only on this interface (Open/Closed +
 * Dependency Inversion), so new transports can be added without touching the dispatch logic.
 */
public interface MailTransport {

    /** @return true if this transport is configured and able to deliver mail. */
    boolean isAvailable();

    /** Deliver the message. Implementations throw on any delivery failure. */
    void send(MailMessage message) throws Exception;
}
