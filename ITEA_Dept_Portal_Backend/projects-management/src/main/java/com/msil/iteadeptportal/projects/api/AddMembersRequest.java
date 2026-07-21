package com.msil.iteadeptportal.projects.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AddMembersRequest {
    private List<MemberEntry> members;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MemberEntry {
        private Long userId;
        private String projectRole;
    }
}
