package com.msil.iteadeptportal.employee.api;

import com.msil.iteadeptportal.shared.api.PaginatedResponse;
import java.util.List;
import java.util.Optional;

public interface UserFacade {
    Optional<UserDTO> getUserBySamAccountName(String samAccountName);
    Optional<UserDTO> getUserById(Long userId);
    UserDTO createOrUpdateUser(UserDTO userDTO);
    void auditLogin(Long userId, String jwtId, String ipAddress, String userAgent, String status, String failureReason);
    UserMeDTO getUserMeDetails(String samAccountName);
    PaginatedResponse<EmployeeSummaryDTO> listEmployees(int page, int size, String search, String role, String status, String sort);
    EmployeeDetailsDTO getEmployeeDetails(Long userId);
    List<String> getUserAuthorities(String samAccountName);
    void activateUser(Long userId);
    void deactivateUser(Long userId);
    List<Long> getAllActiveUserIds();
}
