package com.msil.iteadeptportal.employee.service;

import com.msil.iteadeptportal.employee.model.Permission;
import com.msil.iteadeptportal.employee.model.Role;
import com.msil.iteadeptportal.employee.repository.PermissionRepository;
import com.msil.iteadeptportal.employee.repository.RoleRepository;
import com.msil.iteadeptportal.employee.repository.UserRepository;
import com.msil.iteadeptportal.employee.repository.UserRoleRepository;
import com.msil.iteadeptportal.employee.repository.LoginAuditRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private LoginAuditRepository loginAuditRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private UserService userService;

    @Test
    public void testGetPermissionsByUserId_WithInheritedRoles() {
        Long userId = 1L;

        // Mock roles:
        // Role 1 (User Role) has Parent Role 2 (Manager Role)
        // Role 2 has Parent Role 3 (Admin Role)
        Role role1 = Role.builder().roleId(10L).roleName("ROLE_USER").parentRoleId(20L).build();
        Role role2 = Role.builder().roleId(20L).roleName("ROLE_MANAGER").parentRoleId(30L).build();
        Role role3 = Role.builder().roleId(30L).roleName("ROLE_ADMIN").parentRoleId(null).build();

        when(roleRepository.findRolesByUserId(userId)).thenReturn(List.of(role1));
        when(roleRepository.findById(10L)).thenReturn(Optional.of(role1));
        when(roleRepository.findById(20L)).thenReturn(Optional.of(role2));
        when(roleRepository.findById(30L)).thenReturn(Optional.of(role3));

        Permission p1 = Permission.builder().permissionId(100L).permissionName("VIEW").moduleName("Dashboard").build();
        Permission p2 = Permission.builder().permissionId(200L).permissionName("CREATE").moduleName("Task").build();

        // The method should request permissions for all role IDs in hierarchy (10L, 20L, 30L)
        List<Long> expectedRoleIds = List.of(10L, 20L, 30L);
        when(permissionRepository.findPermissionsByRoleIds(argThat(list -> 
            list.containsAll(expectedRoleIds) && list.size() == 3
        ))).thenReturn(List.of(p1, p2));

        List<Permission> result = userService.getPermissionsByUserId(userId);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertTrue(result.contains(p1));
        assertTrue(result.contains(p2));
    }

    @Test
    public void testActivateUser_Success() {
        Long userId = 1L;
        com.msil.iteadeptportal.employee.model.User user = com.msil.iteadeptportal.employee.model.User.builder()
                .userId(userId)
                .status("INACTIVE")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findRolesByUserId(userId)).thenReturn(List.of(
                Role.builder().roleName("ROLE_USER").build()
        ));

        userService.activateUser(userId);

        assertEquals("ACTIVE", user.getStatus());
        verify(userRepository).save(user);
    }

    @Test
    public void testActivateUser_TargetIsAdmin_ThrowsException() {
        Long userId = 1L;
        com.msil.iteadeptportal.employee.model.User user = com.msil.iteadeptportal.employee.model.User.builder()
                .userId(userId)
                .status("INACTIVE")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findRolesByUserId(userId)).thenReturn(List.of(
                Role.builder().roleName("ROLE_ADMIN").build()
        ));

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            userService.activateUser(userId);
        });

        assertEquals("Action not allowed on admin users", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    public void testDeactivateUser_Success() {
        Long userId = 1L;
        com.msil.iteadeptportal.employee.model.User user = com.msil.iteadeptportal.employee.model.User.builder()
                .userId(userId)
                .status("ACTIVE")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findRolesByUserId(userId)).thenReturn(List.of(
                Role.builder().roleName("ROLE_USER").build()
        ));

        userService.deactivateUser(userId);

        assertEquals("INACTIVE", user.getStatus());
        verify(userRepository).save(user);
    }

    @Test
    public void testDeactivateUser_TargetIsAdmin_ThrowsException() {
        Long userId = 1L;
        com.msil.iteadeptportal.employee.model.User user = com.msil.iteadeptportal.employee.model.User.builder()
                .userId(userId)
                .status("ACTIVE")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findRolesByUserId(userId)).thenReturn(List.of(
                Role.builder().roleName("ROLE_ADMIN").build()
        ));

        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            userService.deactivateUser(userId);
        });

        assertEquals("Action not allowed on admin users", exception.getMessage());
        verify(userRepository, never()).save(any());
    }
}
