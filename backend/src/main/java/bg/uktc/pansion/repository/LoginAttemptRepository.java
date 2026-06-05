package bg.uktc.pansion.repository;

import bg.uktc.pansion.domain.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

    long countByEmailIgnoreCaseAndSuccessfulFalseAndCreatedAtAfter(String email, Instant after);

    @Transactional
    void deleteByEmailIgnoreCase(String email);
}
