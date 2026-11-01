package com.elearning.response_request;

import java.util.Map;

/** Answers held on the server while the candidate works, so a crash cannot lose the sheet. */
public class ExamAutosaveRequest {

    private Map<Long, String> answers;

    public Map<Long, String> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<Long, String> answers) {
        this.answers = answers;
    }
}
