package bg.uktc.pansion.domain.entity;

import bg.uktc.pansion.domain.enums.ApprovalStatus;
import bg.uktc.pansion.domain.enums.EnrollmentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * An append-only record of a student's check-in/check-out action.
 *
 * <p>An {@link EnrollmentStatus#ENROLLED} entry is auto-approved; an
 * {@link EnrollmentStatus#UNENROLLED} entry starts as {@link ApprovalStatus#PENDING} and must be
 * approved/rejected by staff, optionally carrying student and reviewer signatures.</p>
 */
@Entity
@Table(name = "student_status")
public class StudentStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "status", nullable = false)
    private EnrollmentStatus status;

    @Column(name = "location")
    private String location;

    @Column(name = "signature", columnDefinition = "MEDIUMTEXT")
    private String signature;

    @Column(name = "review_signature", columnDefinition = "MEDIUMTEXT")
    private String reviewSignature;

    @Column(name = "approval_status", nullable = false)
    private ApprovalStatus approvalStatus = ApprovalStatus.APPROVED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @CreationTimestamp
    @Column(name = "timestamp", updatable = false)
    private Instant timestamp;

    protected StudentStatus() {
        // for JPA
    }

    public static StudentStatus enrolled(User student) {
        StudentStatus record = new StudentStatus();
        record.student = student;
        record.status = EnrollmentStatus.ENROLLED;
        record.approvalStatus = ApprovalStatus.APPROVED;
        return record;
    }

    public static StudentStatus unenrollmentRequest(User student, String location, String signature) {
        StudentStatus record = new StudentStatus();
        record.student = student;
        record.status = EnrollmentStatus.UNENROLLED;
        record.location = location;
        record.signature = signature;
        record.approvalStatus = ApprovalStatus.PENDING;
        return record;
    }

    public void approve(User reviewer, String reviewSignature, Instant when) {
        this.approvalStatus = ApprovalStatus.APPROVED;
        this.approvedBy = reviewer;
        this.reviewSignature = reviewSignature;
        this.approvedAt = when;
    }

    public void reject(User reviewer, String reviewSignature, Instant when) {
        this.approvalStatus = ApprovalStatus.REJECTED;
        this.approvedBy = reviewer;
        this.reviewSignature = reviewSignature;
        this.approvedAt = when;
    }

    public boolean isPending() {
        return approvalStatus == ApprovalStatus.PENDING;
    }

    public Long getId() {
        return id;
    }

    public User getStudent() {
        return student;
    }

    public EnrollmentStatus getStatus() {
        return status;
    }

    public String getLocation() {
        return location;
    }

    public String getSignature() {
        return signature;
    }

    public String getReviewSignature() {
        return reviewSignature;
    }

    public ApprovalStatus getApprovalStatus() {
        return approvalStatus;
    }

    public User getApprovedBy() {
        return approvedBy;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
