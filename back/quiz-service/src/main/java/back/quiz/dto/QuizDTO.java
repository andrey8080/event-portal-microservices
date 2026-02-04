package back.quiz.dto;

public class QuizDTO {
    private int id;
    private int eventId;
    private String description;
    private int timeToPass;

    public QuizDTO() {
    }

    public QuizDTO(int id, int eventId, String description, int timeToPass) {
        this.id = id;
        this.eventId = eventId;
        this.description = description;
        this.timeToPass = timeToPass;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getEventId() {
        return eventId;
    }

    public void setEventId(int eventId) {
        this.eventId = eventId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getTimeToPass() {
        return timeToPass;
    }

    public void setTimeToPass(int timeToPass) {
        this.timeToPass = timeToPass;
    }
}
