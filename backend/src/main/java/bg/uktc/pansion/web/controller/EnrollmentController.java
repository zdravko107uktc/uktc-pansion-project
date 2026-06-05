package bg.uktc.pansion.web.controller;

import bg.uktc.pansion.security.AppUserPrincipal;
import bg.uktc.pansion.service.EnrollmentService;
import bg.uktc.pansion.service.command.StatusChangeCommand;
import bg.uktc.pansion.web.dto.request.ReviewRequest;
import bg.uktc.pansion.web.dto.request.StatusChangeRequest;
import bg.uktc.pansion.web.dto.response.HistoryEntryResponse;
import bg.uktc.pansion.web.dto.response.MessageResponse;
import bg.uktc.pansion.web.dto.response.PendingRequestResponse;
import bg.uktc.pansion.web.dto.response.WeekRecordResponse;
import bg.uktc.pansion.web.mapper.ApiMapper;
import bg.uktc.pansion.web.mapper.RequestParser;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/enrollment")
public class EnrollmentController {

    private static final int HISTORY_LIMIT = 10;

    private final EnrollmentService enrollmentService;

    public EnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PostMapping("/status")
    public MessageResponse submitStatus(@AuthenticationPrincipal AppUserPrincipal principal,
                                        @Valid @RequestBody StatusChangeRequest request) {
        String message = enrollmentService.submitStatusChange(principal.getId(), new StatusChangeCommand(
                RequestParser.enrollmentStatus(request.status()), request.location(), request.signature()));
        return new MessageResponse(message);
    }

    @GetMapping("/history")
    public List<HistoryEntryResponse> myHistory(@AuthenticationPrincipal AppUserPrincipal principal) {
        return enrollmentService.getHistory(principal.getId(), HISTORY_LIMIT).stream()
                .map(ApiMapper::toHistoryEntry).toList();
    }

    @GetMapping("/records/week")
    @PreAuthorize("hasAnyRole('ADMIN','COUNSELOR')")
    public List<WeekRecordResponse> weekRecords(@AuthenticationPrincipal AppUserPrincipal principal) {
        return enrollmentService.getWeekRecords(principal.getId()).stream()
                .map(ApiMapper::toWeekRecord).toList();
    }

    @GetMapping("/requests/pending")
    @PreAuthorize("hasAnyRole('ADMIN','COUNSELOR')")
    public List<PendingRequestResponse> pendingRequests(@AuthenticationPrincipal AppUserPrincipal principal) {
        return enrollmentService.getPendingRequests(principal.getId()).stream()
                .map(ApiMapper::toPendingRequest).toList();
    }

    @PostMapping("/requests/{statusId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','COUNSELOR')")
    public MessageResponse approve(@AuthenticationPrincipal AppUserPrincipal principal,
                                   @PathVariable Long statusId,
                                   @Valid @RequestBody ReviewRequest request) {
        return new MessageResponse(
                enrollmentService.reviewRequest(principal.getId(), statusId, true, request.reviewSignature()));
    }

    @PostMapping("/requests/{statusId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','COUNSELOR')")
    public MessageResponse reject(@AuthenticationPrincipal AppUserPrincipal principal,
                                  @PathVariable Long statusId,
                                  @Valid @RequestBody ReviewRequest request) {
        return new MessageResponse(
                enrollmentService.reviewRequest(principal.getId(), statusId, false, request.reviewSignature()));
    }
}
