package com.elearning.response_request;

import java.util.Map;

public class ExamAttemptRequest {
    private Long userId;
    private Long courseId;
    private Map<Long, String> answers;
    private String drawToken;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }

    public Map<Long, String> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<Long, String> answers) {
        this.answers = answers;
    }

    public String getDrawToken() {
        return drawToken;
    }

    public void setDrawToken(String drawToken) {
        this.drawToken = drawToken;
    }
}
