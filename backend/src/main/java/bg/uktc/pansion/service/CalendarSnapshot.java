package bg.uktc.pansion.service;

import bg.uktc.pansion.domain.entity.CalendarEvent;
import bg.uktc.pansion.domain.entity.StudentStatus;
import bg.uktc.pansion.repository.projection.DailySummaryRow;

import java.util.List;

/**
 * Read-model for a month of the calendar. Admins additionally receive the aggregated daily summary;
 * students receive their own attendance entries.
 */
public record CalendarSnapshot(
        String month,
        List<CalendarEvent> events,
        boolean canManageEvents,
        List<DailySummaryRow> dailySummary,
        List<StudentStatus> attendance
) {
}
