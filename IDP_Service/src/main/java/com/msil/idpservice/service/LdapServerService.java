package com.msil.idpservice.service;

import com.unboundid.ldap.listener.InMemoryDirectoryServer;
import com.unboundid.ldap.listener.InMemoryDirectoryServerConfig;
import com.unboundid.ldap.listener.InMemoryListenerConfig;
import com.unboundid.ldap.sdk.Entry;
import com.unboundid.ldap.sdk.SearchResult;
import com.unboundid.ldap.sdk.SearchResultEntry;
import com.unboundid.ldap.sdk.SearchScope;
import com.unboundid.ldif.LDIFReader;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class LdapServerService {

    @Value("${mockidp.ldap.base-dn}")
    private String baseDn;

    @Value("${mockidp.ldap.listener-port}")
    private int port;

    @Value("${mockidp.ldap.ldif}")
    private Resource ldifResource;

    @Value("${mockidp.ldap.manager-dn}")
    private String managerDn;

    @Value("${mockidp.ldap.manager-password}")
    private String managerPassword;

    private InMemoryDirectoryServer directoryServer;

    @PostConstruct
    public void startLdapServer() {
        try {
            InMemoryDirectoryServerConfig config = new InMemoryDirectoryServerConfig(baseDn);
            config.addAdditionalBindCredentials(managerDn, managerPassword);
            config.setListenerConfigs(InMemoryListenerConfig.createLDAPConfig("default", port));
            directoryServer = new InMemoryDirectoryServer(config);
            
            // Load initial entries
            reset();
            
            directoryServer.startListening();
            System.out.println("Started mock LDAP/AD server on port: " + port);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to start mock LDAP/AD server", e);
        }
    }

    @PreDestroy
    public void stopLdapServer() {
        if (directoryServer != null) {
            directoryServer.shutDown(true);
            System.out.println("Stopped mock LDAP/AD server.");
        }
    }

    public String getBaseDn() {
        return baseDn;
    }

    public InMemoryDirectoryServer getDirectoryServer() {
        return directoryServer;
    }


    public void reset() throws Exception {
        directoryServer.clear();
        try (InputStream inputStream = ldifResource.getInputStream();
             LDIFReader reader = new LDIFReader(inputStream)) {
            while (true) {
                Entry entry = reader.readEntry();
                if (entry == null) {
                    break;
                }
                directoryServer.add(entry);
            }
        }
    }

    public List<String> getAllUserDns() throws Exception {
        SearchResult result = directoryServer.search(baseDn, SearchScope.SUB, "(objectClass=inetOrgPerson)");
        List<String> dns = new ArrayList<>();
        for (SearchResultEntry entry : result.getSearchEntries()) {
            dns.add(entry.getDN());
        }
        return dns;
    }

    public void createUser(String uid, String cn, String sn, String mail, String password) throws Exception {
        createUser(uid, cn, sn, mail, password, null);
    }

    public void createUser(String uid, String cn, String sn, String mail, String password, String employeeNumber) throws Exception {
        String dn = "uid=" + uid + ",ou=People," + baseDn;
        Entry entry = new Entry(dn);
        entry.addAttribute("objectClass", "top", "person", "organizationalPerson", "inetOrgPerson");
        entry.addAttribute("uid", uid);
        entry.addAttribute("cn", cn);
        entry.addAttribute("sn", sn);
        entry.addAttribute("mail", mail);
        entry.addAttribute("userPassword", password);
        if (employeeNumber != null && !employeeNumber.trim().isEmpty()) {
            entry.addAttribute("employeeNumber", employeeNumber);
        }
        directoryServer.add(entry);
    }

    public void deleteUser(String uid) throws Exception {
        String dn = "uid=" + uid + ",ou=People," + baseDn;
        directoryServer.delete(dn);
    }

    public void importLdif(InputStream inputStream) throws Exception {
        try (LDIFReader reader = new LDIFReader(inputStream)) {
            while (true) {
                Entry entry = reader.readEntry();
                if (entry == null) {
                    break;
                }
                if (directoryServer.getEntry(entry.getDN()) != null) {
                    directoryServer.delete(entry.getDN());
                }
                directoryServer.add(entry);
            }
        }
    }

    public SearchResultEntry findUser(String username) throws Exception {
        SearchResult result = directoryServer.search(baseDn, SearchScope.SUB, "(uid=" + username + ")");
        if (result.getEntryCount() == 0) {
            return null;
        }
        return result.getSearchEntries().get(0);
    }
}
