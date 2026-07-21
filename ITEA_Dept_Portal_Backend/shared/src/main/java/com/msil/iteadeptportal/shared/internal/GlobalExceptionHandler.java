package com.msil.iteadeptportal.shared.internal;

import com.msil.iteadeptportal.shared.api.ApiResponse;
import com.msil.iteadeptportal.shared.api.BadRequestException;
import com.msil.iteadeptportal.shared.api.ResourceNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        String userMsg = (ex.getMessage() != null && !ex.getMessage().isBlank() && !ex.getMessage().contains("org.springframework"))
                ? ex.getMessage()
                : "You do not have permission to perform this action.";
        return new ResponseEntity<>(ApiResponse.error(userMsg), HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error(sanitizeErrorMessage(ex.getMessage())), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error(sanitizeErrorMessage(ex.getMessage())), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentAndState(RuntimeException ex) {
        log.warn("Validation error/Invalid state: {}", ex.getMessage());
        String userMsg = ex.getMessage() != null ? sanitizeErrorMessage(ex.getMessage()) : "Invalid request parameters or state.";
        return new ResponseEntity<>(ApiResponse.error(userMsg), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .filter(m -> m != null && !m.isBlank())
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: {}", errorMessage);
        if (errorMessage.isEmpty()) {
            errorMessage = "Invalid request arguments. Please check your input.";
        }
        return new ResponseEntity<>(ApiResponse.error(errorMessage), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        log.warn("Constraint violation: {}", ex.getMessage());
        String userMsg = ex.getConstraintViolations().stream()
                .map(v -> v.getMessage())
                .filter(m -> m != null && !m.isBlank())
                .collect(Collectors.joining(", "));
        if (userMsg.isEmpty()) {
            userMsg = "Invalid input parameter value.";
        }
        return new ResponseEntity<>(ApiResponse.error(userMsg), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("Data integrity violation internal details: ", ex);
        String rootMsg = ex.getRootCause() != null ? ex.getRootCause().getMessage() : "";
        String userMsg = "The request could not be completed due to a data conflict.";
        if (rootMsg.toLowerCase().contains("duplicate") || rootMsg.toLowerCase().contains("unique")) {
            userMsg = "A record with these details already exists.";
        } else if (rootMsg.toLowerCase().contains("foreign key") || rootMsg.toLowerCase().contains("violates foreign key constraint")) {
            userMsg = "Referenced record or item does not exist.";
        }
        return new ResponseEntity<>(ApiResponse.error(userMsg), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        log.warn("File upload size limit exceeded: {}", ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error("File size exceeds the maximum allowed upload limit."), HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Http message not readable: {}", ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error("Malformed JSON request payload or invalid parameters."), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Method argument type mismatch: {}", ex.getMessage());
        String message = String.format("Parameter '%s' contains an invalid value format.", ex.getName());
        return new ResponseEntity<>(ApiResponse.error(message), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex) {
        log.error("Unhandled internal server exception: ", ex);
        String userMsg = "An unexpected error occurred. Please try again later or contact support if the issue persists.";
        if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("storage service error")) {
            userMsg = "Unable to process file upload/download at this time. Please try again later.";
        }
        return new ResponseEntity<>(ApiResponse.error(userMsg), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private String sanitizeErrorMessage(String msg) {
        if (msg == null || msg.isBlank()) return "An error occurred while processing your request.";
        String lower = msg.toLowerCase();
        if (lower.contains("select ") || lower.contains("insert ") || lower.contains("update ")
                || lower.contains("delete ") || lower.contains("postgres") || lower.contains("sql")
                || lower.contains("hibernate") || lower.contains("exception") || lower.contains("table ")
                || lower.contains("column ") || lower.contains("constraint") || lower.contains("nullpointer")
                || lower.contains("bucket") || lower.contains("supabase") || lower.contains("s3")) {
            return "Unable to complete request due to a server error. Please try again.";
        }
        return msg;
    }
}
