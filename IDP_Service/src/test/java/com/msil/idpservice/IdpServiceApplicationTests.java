package com.msil.idpservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class IdpServiceApplicationTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    void contextLoads() {
    }

    @Test
    void testAuthSuccess() throws Exception {
        String requestBody = "{\"username\":\"dev\",\"password\":\"password123\"}";

        String responseString = mockMvc.perform(post("/api/auth")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token", notNullValue()))
                .andExpect(jsonPath("$.token_type", is("Bearer")))
                .andExpect(jsonPath("$.expires_in", is(3600)))
                .andExpect(jsonPath("$.user").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        String token = com.jayway.jsonpath.JsonPath.read(responseString, "$.access_token");
        verifyJwtClaims(token, "dev", "Dev", "dev@msil.co.in", "1001");
    }

    @Test
    void testAuthFailure() throws Exception {
        String requestBody = "{\"username\":\"dev\",\"password\":\"wrongpassword\"}";

        mockMvc.perform(post("/api/auth")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", containsString("Invalid")));
    }

    @Test
    void testRateLimiting() throws Exception {
        String requestBody = "{\"username\":\"dev\",\"password\":\"password123\"}";
        String clientIp = "192.168.1.50";

        // 5 requests should be allowed (returning 200 OK)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth")
                    .header("X-Forwarded-For", clientIp)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody))
                    .andExpect(status().isOk());
        }

        // The 6th request from the same IP should be blocked
        mockMvc.perform(post("/api/auth")
                .header("X-Forwarded-For", clientIp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error", containsString("Too many requests")));
    }

    @Test
    void testPublicKeyAndJwks() throws Exception {
        mockMvc.perform(get("/public-key"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("BEGIN PUBLIC KEY")));

        mockMvc.perform(get("/.well-known/jwks.json"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keys", hasSize(1)))
                .andExpect(jsonPath("$.keys[0].kty", is("RSA")))
                .andExpect(jsonPath("$.keys[0].alg", is("RS256")))
                .andExpect(jsonPath("$.keys[0].kid", is("mock-idp-key-id")));
    }

    @Test
    void testUserManagementLifecycle() throws Exception {
        // 1. Get initial users
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$", hasItem(containsString("uid=dev"))))
                .andExpect(jsonPath("$", hasItem(containsString("uid=john"))))
                .andExpect(jsonPath("$", hasItem(containsString("uid=rakesh"))))
                .andExpect(jsonPath("$", hasItem(containsString("uid=satyam"))))
                .andExpect(jsonPath("$", hasItem(containsString("uid=soumya"))))
                .andExpect(jsonPath("$", hasItem(containsString("uid=asish"))));

        // 2. Create new user
        String newUserBody = "{\"uid\":\"alice\",\"cn\":\"Alice\",\"sn\":\"Wonder\",\"mail\":\"alice@msil.co.in\",\"password\":\"alice123\",\"employeeId\":\"1003\"}";
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(newUserBody))
                .andExpect(status().isCreated());

        // 3. Verify user created
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7)))
                .andExpect(jsonPath("$", hasItem(containsString("uid=alice"))));

        // 4. Authenticate new user
        String authAlice = "{\"username\":\"alice\",\"password\":\"alice123\"}";
        String responseString = mockMvc.perform(post("/api/auth")
                .contentType(MediaType.APPLICATION_JSON)
                .content(authAlice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        String token = com.jayway.jsonpath.JsonPath.read(responseString, "$.access_token");
        verifyJwtClaims(token, "alice", "Alice", "alice@msil.co.in", "1003");

        // 5. Delete user
        mockMvc.perform(delete("/api/users/alice"))
                .andExpect(status().isOk());

        // 6. Verify user deleted
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$", not(hasItem(containsString("uid=alice")))));
    }

    @Test
    void testReset() throws Exception {
        // Create user
        String newUserBody = "{\"uid\":\"temp\",\"cn\":\"Temp\",\"sn\":\"User\",\"mail\":\"temp@msil.co.in\",\"password\":\"temp123\"}";
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(newUserBody))
                .andExpect(status().isCreated());

        // Reset LDAP server
        mockMvc.perform(post("/api/reset"))
                .andExpect(status().isOk());

        // Verify user list is back to original 6 users
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$", not(hasItem(containsString("uid=temp")))));
    }

    @Test
    void testAuthRakeshSuccess() throws Exception {
        String requestBody = "{\"username\":\"rakesh\",\"password\":\"password123\"}";

        String responseString = mockMvc.perform(post("/api/auth")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        String token = com.jayway.jsonpath.JsonPath.read(responseString, "$.access_token");
        var decoded = com.auth0.jwt.JWT.decode(token);
        org.junit.jupiter.api.Assertions.assertEquals("mock-idp", decoded.getIssuer());
        org.junit.jupiter.api.Assertions.assertEquals("rakesh", decoded.getSubject());
        org.junit.jupiter.api.Assertions.assertEquals("Rakesh Pandey", decoded.getClaim("displayName").asString());
        org.junit.jupiter.api.Assertions.assertEquals("rakesh@msil.co.in", decoded.getClaim("mail").asString());
        org.junit.jupiter.api.Assertions.assertEquals("1003", decoded.getClaim("employeeId").asString());

        var memberOf = decoded.getClaim("memberOf").asList(String.class);
        org.junit.jupiter.api.Assertions.assertNotNull(memberOf);
        org.junit.jupiter.api.Assertions.assertTrue(memberOf.contains("DE_CGV4"));
        org.junit.jupiter.api.Assertions.assertTrue(memberOf.contains("DE_CGV4_ADMIN"));
        org.junit.jupiter.api.Assertions.assertTrue(memberOf.contains("DE_CGV4_MANAGER"));

        var roles = decoded.getClaim("roles").asList(String.class);
        org.junit.jupiter.api.Assertions.assertNotNull(roles);
        org.junit.jupiter.api.Assertions.assertTrue(roles.contains("ROLE_ADMIN"));
        org.junit.jupiter.api.Assertions.assertTrue(roles.contains("ROLE_MANAGER"));
    }

    private void verifyJwtClaims(String token, String expectedUsername, String expectedCn, String expectedMail, String expectedEmployeeId) {
        var decoded = com.auth0.jwt.JWT.decode(token);
        org.junit.jupiter.api.Assertions.assertEquals("mock-idp", decoded.getIssuer());
        org.junit.jupiter.api.Assertions.assertEquals(expectedUsername, decoded.getSubject());
        org.junit.jupiter.api.Assertions.assertEquals(expectedUsername, decoded.getClaim("sAMAccountName").asString());
        org.junit.jupiter.api.Assertions.assertEquals(expectedUsername + "@msil.co.in", decoded.getClaim("userPrincipalName").asString());
        org.junit.jupiter.api.Assertions.assertEquals(expectedCn, decoded.getClaim("displayName").asString());
        org.junit.jupiter.api.Assertions.assertEquals(expectedCn, decoded.getClaim("name").asString());
        org.junit.jupiter.api.Assertions.assertEquals(expectedMail, decoded.getClaim("mail").asString());
        org.junit.jupiter.api.Assertions.assertEquals(expectedEmployeeId, decoded.getClaim("employeeId").asString());

        var roles = decoded.getClaim("roles").asList(String.class);
        org.junit.jupiter.api.Assertions.assertNotNull(roles);
        org.junit.jupiter.api.Assertions.assertTrue(roles.contains("EMPLOYEE"));
    }
}
