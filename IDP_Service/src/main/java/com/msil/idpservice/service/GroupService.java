package com.msil.idpservice.service;

import com.unboundid.ldap.sdk.SearchResult;
import com.unboundid.ldap.sdk.SearchResultEntry;
import com.unboundid.ldap.sdk.SearchScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class GroupService {

    private final LdapServerService ldapServerService;

    @Autowired
    public GroupService(LdapServerService ldapServerService) {
        this.ldapServerService = ldapServerService;
    }

    public List<String> getGroupsForUser(String userDn) {
        List<String> groups = new ArrayList<>();
        try {
            String filter = "(&(objectClass=groupOfNames)(member=" + userDn + "))";
            SearchResult searchResult = ldapServerService.getDirectoryServer()
                    .search(ldapServerService.getBaseDn(), SearchScope.SUB, filter);
            
            for (SearchResultEntry entry : searchResult.getSearchEntries()) {
                String cn = entry.getAttributeValue("cn");
                if (cn != null) {
                    groups.add(cn);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to retrieve groups for user DN: " + userDn + " - " + e.getMessage());
        }
        return groups;
    }
}
