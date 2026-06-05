package bg.uktc.pansion.repository;

import bg.uktc.pansion.domain.entity.PasswordHistory;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PasswordHistoryRepository extends JpaRepository<PasswordHistory, Long> {

    List<PasswordHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Limit limit);

    List<PasswordHistory> findByUserIdOrderByCreatedAtDesc(Long userId);
}
