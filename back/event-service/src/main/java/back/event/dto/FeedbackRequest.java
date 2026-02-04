package back.event.dto;

public class FeedbackRequest {
    private int rating;
    private String comment;

    public FeedbackRequest() {
    }

    public FeedbackRequest(int rating, String comment) {
        this.rating = rating;
        this.comment = comment;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
