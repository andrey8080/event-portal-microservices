package back.quiz.dto;

public class QuizQuestionDTO {
    private int id;
    private int quizId;
    private String text;
    private String type;

    public QuizQuestionDTO() {
    }

    public QuizQuestionDTO(int id, int quizId, String text, String type) {
        this.id = id;
        this.quizId = quizId;
        this.text = text;
        this.type = type;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getQuizId() {
        return quizId;
    }

    public void setQuizId(int quizId) {
        this.quizId = quizId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
