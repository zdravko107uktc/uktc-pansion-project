package bg.uktc.pansion.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** One login attempt, used to drive temporary account lockout after repeated failures. */
@Entity
@Table(name = "login_attempts")
public class LoginAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "successful", nullable = false)
    private boolean successful;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected LoginAttempt() {
        // for JPA
    }

    public LoginAttempt(String email, String ipAddress, boolean successful) {
        this.email = email;
        this.ipAddress = ipAddress;
        this.successful = successful;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public boolean isSuccessful() {
        return successful;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
