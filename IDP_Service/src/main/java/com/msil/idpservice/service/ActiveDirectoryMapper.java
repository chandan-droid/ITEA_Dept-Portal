package com.msil.idpservice.service;

import com.unboundid.ldap.sdk.SearchResultEntry;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ActiveDirectoryMapper {

    public Map<String, Object> mapUser(SearchResultEntry entry, List<String> groups) {
        Map<String, Object> claims = new HashMap<>();

        String uid = entry.getAttributeValue("uid");
        String cn = entry.getAttributeValue("cn");
        String sn = entry.getAttributeValue("sn");
        String mail = entry.getAttributeValue("mail");
        String employeeNumber = entry.getAttributeValue("employeeNumber");
        String dn = entry.getDN();

        claims.put("sAMAccountName", uid != null ? uid : "");
        claims.put("userPrincipalName", uid != null ? uid + "@msil.co.in" : "");
        claims.put("displayName", cn != null ? cn : "");
        claims.put("name", cn != null ? cn : "");
        claims.put("surname", sn != null ? sn : "");
        claims.put("mail", mail != null ? mail : "");
        claims.put("employeeId", employeeNumber != null ? employeeNumber : "");
        claims.put("distinguishedName", dn != null ? dn : "");
        claims.put("memberOf", groups);

        // Derive roles from groups. Defaults to "EMPLOYEE" if they are in "Employees" group.
        List<String> roles = new ArrayList<>();
        if (groups.contains("Employees")) {
            roles.add("EMPLOYEE");
        } else {
            roles.add("EMPLOYEE"); // Fallback default role
        }
        if (groups.contains("ADMIN")) {
            roles.add("ROLE_PORTAL_ADMIN");
        }
        if (groups.contains("MANAGER")) {
            roles.add("ROLE_MANAGER");
        }
        claims.put("roles", roles);


        return claims;
    }
}
