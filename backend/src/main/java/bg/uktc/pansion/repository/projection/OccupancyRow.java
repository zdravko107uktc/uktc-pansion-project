package bg.uktc.pansion.repository.projection;

/** Live occupancy counts for one dormitory, derived from each student's most recent status. */
public interface OccupancyRow {
    String getDormitory();

    long getEnrolledCount();

    long getAwayCount();

    long getPendingCount();

    long getTotalCount();
}
