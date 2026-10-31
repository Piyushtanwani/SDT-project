package com.elearning.response_request;

import com.elearning.models.User;

import java.util.List;

public record PublicUserDTO(
        Long id,
        String username,
        String name,
        String profileurl,
        String role,
        String bio,
        String timezone,
        String availability,
        List<Long> skillIds) {

    public static PublicUserDTO from(User user) {
        return new PublicUserDTO(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getProfileurl(),
                user.getRole(),
                user.getBio(),
                user.getTimezone(),
                user.getAvailability(),
                user.getSkillIds());
    }
}
