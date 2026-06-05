package bg.uktc.pansion.web.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/** Top-level keys are camelCase to match the SPA ({@code dailySummary}, {@code canManageEvents}). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CalendarDataResponse(
        String month,
        List<CalendarEventResponse> events,
        boolean canManageEvents,
        List<DailySummaryResponse> dailySummary,
        List<AttendanceResponse> attendance
) {
}
