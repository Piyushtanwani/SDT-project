package com.elearning;

import com.elearning.controller.SkillController;
import com.elearning.models.Skill;
import com.elearning.repositories.SkillRepository;
import com.elearning.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SkillControllerTest {

    @Mock
    private SkillRepository skillRepository;

    @Mock
    private UserRepository userRepository;

    private SkillController skillController;

    @BeforeEach
    void setUp() {
        skillController = new SkillController(skillRepository, userRepository);
    }

    @Test
    @DisplayName("Skill names are unique regardless of letter case")
    void duplicateNameWithDifferentCaseIsRejected() {
        when(skillRepository.findByNameIgnoreCase("java")).thenReturn(Optional.of(skill(1L, "Java")));

        var response = skillController.createSkill(skill(null, "java"));

        assertEquals(400, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Skill name already exists", response.getBody().getMessage());
        verify(skillRepository, never()).save(any());
    }

    @Test
    @DisplayName("A skill still assigned to members cannot be deleted")
    void deletingAssignedSkillIsRejected() {
        when(skillRepository.existsById(5L)).thenReturn(true);
        when(userRepository.countBySkills_Id(5L)).thenReturn(2L);

        var response = skillController.deleteSkill(5L);

        assertEquals(409, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().getMessage().contains("assigned to 2 member(s)"));
        verify(skillRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("An unused skill can be deleted")
    void deletingUnusedSkillSucceeds() {
        when(skillRepository.existsById(5L)).thenReturn(true);
        when(userRepository.countBySkills_Id(5L)).thenReturn(0L);

        var response = skillController.deleteSkill(5L);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(skillRepository).deleteById(5L);
    }

    private static Skill skill(Long id, String name) {
        Skill skill = new Skill();
        skill.setId(id);
        skill.setName(name);
        return skill;
    }
}
