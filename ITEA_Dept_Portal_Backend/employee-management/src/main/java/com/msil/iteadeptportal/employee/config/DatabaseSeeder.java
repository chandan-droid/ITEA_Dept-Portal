package com.msil.iteadeptportal.employee.config;

import com.msil.iteadeptportal.employee.model.Role;
import com.msil.iteadeptportal.employee.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        List<String> defaultRoles = List.of("ROLE_PORTAL_USER", "ROLE_PORTAL_ADMIN", "ROLE_MANAGER");
        for (String roleName : defaultRoles) {
            if (roleRepository.findByRoleName(roleName).isEmpty()) {
                roleRepository.save(Role.builder()
                        .roleName(roleName)
                        .build());
            }
        }
    }
}
