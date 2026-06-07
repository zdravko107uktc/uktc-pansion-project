package bg.uktc.pansion.web.dto.response;

/**
 * Result of a bulk approve/reject. {@code processed} requests were updated; {@code skipped} were
 * ignored because they were no longer pending or fell outside the reviewer's dormitory.
 */
public record BulkReviewResponse(
        int processed,
        int skipped,
        String message
) {
}
