export const deriveEffectiveStatus = (history = []) => {
  const effectiveEntry = history.find(
    (entry) => entry?.status === "enrolled" || entry?.approval_status === "approved"
  );

  return effectiveEntry?.status || null;
};

export const hasPendingUnenrollmentRequest = (history = []) =>
  history.some((entry) => entry?.status === "unenrolled" && entry?.approval_status === "pending");

export const getLatestReviewOutcome = (history = []) =>
  history.find(
    (entry) => entry?.status === "unenrolled" && ["approved", "rejected"].includes(entry?.approval_status)
  ) || null;
