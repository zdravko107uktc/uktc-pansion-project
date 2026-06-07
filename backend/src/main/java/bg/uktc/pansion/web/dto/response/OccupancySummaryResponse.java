package bg.uktc.pansion.web.dto.response;

import java.util.List;

/**
 * Live occupancy snapshot for the admin/counselor dashboard: aggregate totals plus a per-dormitory
 * breakdown. {@code unknown} counts students whose latest status is neither enrolled, away nor pending
 * (e.g. they have never checked in).
 */
public record OccupancySummaryResponse(
        long total_students,
        long enrolled,
        long away,
        long pending,
        long unknown,
        List<DormitoryOccupancy> dormitories
) {
    public record DormitoryOccupancy(
            String dormitory,
            long total,
            long enrolled,
            long away,
            long pending,
            long unknown
    ) {
    }
}
