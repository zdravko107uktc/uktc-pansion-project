package bg.uktc.pansion.service;

/** Counts from a bulk review: how many requests were updated and how many were skipped. */
public record BulkReviewOutcome(int processed, int skipped) {
}
