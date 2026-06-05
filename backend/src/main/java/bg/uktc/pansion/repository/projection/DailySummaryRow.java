package bg.uktc.pansion.repository.projection;

/** Aggregated attendance counts for a single calendar day (admin monthly summary). */
public interface DailySummaryRow {
    String getDay();

    long getEnrolledCount();

    long getUnenrolledCount();

    long getPendingCount();
}
