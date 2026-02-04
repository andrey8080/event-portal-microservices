package back.quiz.dto;

public class QuizResultDTO {
    private int id;
    private String name;
    private String email;
    private float result;

    public QuizResultDTO() {
    }

    public QuizResultDTO(int id, String name, String email, float result) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.result = result;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public float getResult() {
        return result;
    }

    public void setResult(float result) {
        this.result = result;
    }
}
