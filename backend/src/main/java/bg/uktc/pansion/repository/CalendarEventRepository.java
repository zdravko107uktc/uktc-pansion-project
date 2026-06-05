package bg.uktc.pansion.repository;

import bg.uktc.pansion.domain.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    /** Events whose [eventDate, endDate] range overlaps the requested [start, end] window. */
    @Query("""
            select e from CalendarEvent e
            join fetch e.createdBy
            where e.eventDate <= :end
              and coalesce(e.endDate, e.eventDate) >= :start
            order by e.eventDate asc, e.createdAt desc
            """)
    List<CalendarEvent> findOverlapping(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("select e from CalendarEvent e join fetch e.createdBy where e.id = :id")
    Optional<CalendarEvent> findByIdWithCreator(@Param("id") Long id);
}
