package com.elearning.response_request;

import java.util.Map;

/**
 * A finished answer sheet. The attempt id and the signed draw token together say which question
 * set was served, so the score denominator cannot be chosen by the sender.
 */
public class ExamSubmitRequest {

    private Long attemptId;
    private String drawToken;
    private Map<Long, String> answers;

    public Long getAttemptId() {
        return attemptId;
    }

    public void setAttemptId(Long attemptId) {
        this.attemptId = attemptId;
    }

    public String getDrawToken() {
        return drawToken;
    }

    public void setDrawToken(String drawToken) {
        this.drawToken = drawToken;
    }

    public Map<Long, String> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<Long, String> answers) {
        this.answers = answers;
    }
}
