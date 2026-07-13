package com.msil.idpservice.service;

import com.unboundid.ldap.sdk.SearchResultEntry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AuthenticationService {

    private final LdapServerService ldapServerService;
    private final GroupService groupService;
    private final ActiveDirectoryMapper activeDirectoryMapper;
    private final JwtService jwtService;

    @Autowired
    public AuthenticationService(LdapServerService ldapServerService,
                                 GroupService groupService,
                                 ActiveDirectoryMapper activeDirectoryMapper,
                                 JwtService jwtService) {
        this.ldapServerService = ldapServerService;
        this.groupService = groupService;
        this.activeDirectoryMapper = activeDirectoryMapper;
        this.jwtService = jwtService;
    }

    public Map<String, Object> authenticate(String username, String password) throws Exception {
        if (username == null || username.trim().isEmpty() || password == null || password.isEmpty()) {
            throw new IllegalArgumentException("Username and password are required");
        }

        SearchResultEntry userEntry = ldapServerService.findUser(username);
        if (userEntry == null) {
            throw new BadCredentialsException("Invalid username or password");
        }

        String storedPassword = userEntry.getAttributeValue("userPassword");
        if (storedPassword == null || !storedPassword.equals(password)) {
            throw new BadCredentialsException("Invalid username or password");
        }

        // 1. Get user DN
        String userDn = userEntry.getDN();

        // 2. Load LDAP groups containing user DN
        List<String> groups = groupService.getGroupsForUser(userDn);

        // 3. Map LDAP User to AD-compatible Identity claims
        Map<String, Object> claims = activeDirectoryMapper.mapUser(userEntry, groups);

        // 4. Generate signed RS256 JWT
        String token = jwtService.generateToken(username, claims);

        // 5. Return oauth-style payload
        return Map.of(
                "access_token", token,
                "token_type", "Bearer",
                "expires_in", jwtService.getExpirySeconds()
        );
    }
}
