package bg.uktc.pansion.repository;

import bg.uktc.pansion.domain.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    @Query("select t from EmailVerificationToken t join fetch t.user where t.tokenHash = :tokenHash")
    Optional<EmailVerificationToken> findByTokenHash(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("update EmailVerificationToken t set t.usedAt = :now where t.user.id = :userId and t.usedAt is null")
    void invalidateAllForUser(@Param("userId") Long userId, @Param("now") Instant now);
}
