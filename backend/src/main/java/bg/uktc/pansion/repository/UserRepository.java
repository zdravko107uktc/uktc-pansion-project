package bg.uktc.pansion.repository;

import bg.uktc.pansion.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    List<User> findAllByOrderByCreatedAtDesc();

    /**
     * Emails that should be notified about events in a given dormitory: all admins plus the
     * counselors of that dormitory (or all counselors when {@code dormitory} is null).
     */
    @Query("""
            select distinct u.email from User u
            where u.role = bg.uktc.pansion.domain.enums.Role.ADMIN
               or (u.role = bg.uktc.pansion.domain.enums.Role.COUNSELOR
                   and (:dormitory is null or u.dormitory = :dormitory))
            """)
    List<String> findStaffEmailsForDormitory(@Param("dormitory") bg.uktc.pansion.domain.enums.Dormitory dormitory);
}
