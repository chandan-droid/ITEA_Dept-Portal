package com.msil.iteadeptportal.employee.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMeDTO {
    private UserDTO user;
    private List<RoleDTO> roles;
    private Map<String, List<String>> permissions;
}
