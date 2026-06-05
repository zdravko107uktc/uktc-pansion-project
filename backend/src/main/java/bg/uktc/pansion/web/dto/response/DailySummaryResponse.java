package bg.uktc.pansion.web.dto.response;

public record DailySummaryResponse(
        String day,
        long enrolled_count,
        long unenrolled_count,
        long pending_count
) {
}
