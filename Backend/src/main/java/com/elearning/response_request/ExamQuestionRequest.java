package com.elearning.response_request;


import java.util.List;

import com.elearning.models.ExamQuestion;

public class ExamQuestionRequest {
    private List<ExamQuestion> questions;

    public List<ExamQuestion> getQuestions() {
        return questions;
    }

    public void setQuestions(List<ExamQuestion> questions) {
        this.questions = questions;
    }
}
