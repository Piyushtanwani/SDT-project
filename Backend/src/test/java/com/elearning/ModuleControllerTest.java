package com.elearning;

import com.elearning.controller.ModuleController;
import com.elearning.models.Module;
import com.elearning.repositories.CourseRepository;
import com.elearning.repositories.ModuleRepository;
import com.elearning.services.ModuleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ModuleControllerTest {

    @Mock
    private ModuleRepository moduleRepository;

    @Mock
    private CourseRepository courseRepository;

    private ModuleController moduleController;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        ModuleService moduleService = new ModuleService(moduleRepository);
        moduleController = new ModuleController(moduleService, courseRepository);
        mockMvc = MockMvcBuilders.standaloneSetup(moduleController).build();
    }

    @Test
    @DisplayName("A module cannot be added to a course that does not exist")
    void addingModuleToMissingCourseIsRejected() {
        when(courseRepository.existsById(99L)).thenReturn(false);

        var response = moduleController.addModule(99L, module("Valid title", List.of("Content")));

        assertEquals(404, response.getStatusCode().value());
        verify(moduleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Modules with a blank title are rejected")
    void addingModuleWithBlankTitleIsRejected() {
        when(courseRepository.existsById(1L)).thenReturn(true);

        var response = moduleController.addModule(1L, module("   ", List.of("Content")));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Module title is required.", response.getBody());
        verify(moduleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Modules with an empty content section are rejected")
    void addingModuleWithEmptyContentIsRejected() {
        when(courseRepository.existsById(1L)).thenReturn(true);

        var response = moduleController.addModule(1L, module("Valid", List.of("Intro", "   ")));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Each module needs at least one non-empty content section.", response.getBody());
        verify(moduleRepository, never()).save(any());
    }

    @Test
    @DisplayName("A valid module is trimmed, numbered, and saved")
    void addingValidModuleSucceeds() {
        when(courseRepository.existsById(1L)).thenReturn(true);
        when(moduleRepository.findLastModuleNumberByCourseId(1L)).thenReturn(2);

        var response = moduleController.addModule(1L, module("  Getting started  ", List.of("Step one")));

        assertEquals(201, response.getStatusCode().value());
        ArgumentCaptor<Module> captor = ArgumentCaptor.forClass(Module.class);
        verify(moduleRepository).save(captor.capture());
        Module saved = captor.getValue();
        assertEquals("Getting started", saved.getModuleTitle());
        assertEquals(3, saved.getModuleNumber());
        assertEquals(1L, saved.getCourseId());
        assertNotNull(saved.getLastUpdated());
    }

    @Test
    @DisplayName("Updating a missing module surfaces a not-found error")
    void updatingMissingModuleFails() {
        when(moduleRepository.findById(9L)).thenReturn(Optional.empty());

        NoSuchElementException error = assertThrows(
                NoSuchElementException.class,
                () -> moduleController.updateModule(9L, module("Title", List.of("Content")))
        );

        assertEquals("Module not found.", error.getMessage());
        verify(moduleRepository, never()).save(any());
    }

    @Test
    @DisplayName("Fetching a missing module returns 404 instead of 500")
    void missingModuleReturnsNotFound() throws Exception {
        when(moduleRepository.findByCourseIdAndModuleNumber(1L, 42)).thenReturn(Optional.empty());

        mockMvc.perform(get("/module/course/1/module/42"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Module 42 was not found for this course."));
    }

    @Test
    @DisplayName("Deleting a missing module returns 404")
    void deletingMissingModuleReturnsNotFound() throws Exception {
        when(moduleRepository.existsById(77L)).thenReturn(false);

        mockMvc.perform(delete("/module/delete/77"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Module not found."));
        verify(moduleRepository, never()).deleteById(anyLong());
    }

    private static Module module(String title, List<String> content) {
        Module module = new Module();
        module.setModuleTitle(title);
        module.setContent(content);
        return module;
    }
}
