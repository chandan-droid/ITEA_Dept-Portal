package com.msil.iteadeptportal.employee.api;

import java.util.Optional;

public interface UserFacade {
    Optional<UserDTO> getUserBySamAccountName(String samAccountName);
    UserDTO createOrUpdateUser(UserDTO userDTO);
    void auditLogin(Long userId, String jwtId, String ipAddress, String userAgent, String status, String failureReason);
}
