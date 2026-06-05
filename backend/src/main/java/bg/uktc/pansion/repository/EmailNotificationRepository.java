package bg.uktc.pansion.repository;

import bg.uktc.pansion.domain.entity.EmailNotification;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailNotificationRepository extends JpaRepository<EmailNotification, Long> {

    List<EmailNotification> findAllByOrderByCreatedAtDesc(Limit limit);
}
