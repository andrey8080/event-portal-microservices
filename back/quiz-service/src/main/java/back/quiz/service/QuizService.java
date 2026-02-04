package back.quiz.service;

import back.quiz.dto.QuizAnswerDTO;
import back.quiz.dto.QuizDTO;
import back.quiz.dto.QuizQuestionDTO;
import back.quiz.dto.QuizResultDTO;
import back.quiz.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QuizService {
    private final JdbcTemplate jdbcTemplate;
    private final UserService userService;

    public QuizService(JdbcTemplate jdbcTemplate, UserService userService) {
        this.jdbcTemplate = jdbcTemplate;
        this.userService = userService;
    }

    public String createQuiz(String token, QuizDTO dto) {
        String tokenWithoutPrefix = token.startsWith("Bearer ") ? token.substring(7) : token;
        String email = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(email);
        if (user == null || "participant".equals(user.getStringRole())) {
            return "Only organizers and admins can create quizzes.";
        }

        String sql = """
                INSERT INTO \"Quiz\" (\"event\", \"description\", \"time_to_pass\")
                VALUES (?, ?, ?)
                """;
        jdbcTemplate.update(sql, dto.getEventId(), dto.getDescription(), dto.getTimeToPass());
        return "Quiz created successfully.";
    }

    public List<QuizDTO> getQuizzesForEvent(int eventId) {
        String sql = """
                SELECT \"ID\", \"event\", \"description\", \"time_to_pass\"
                FROM \"Quiz\"
                WHERE \"event\" = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new QuizDTO(
                rs.getInt("ID"),
                rs.getInt("event"),
                rs.getString("description"),
                rs.getInt("time_to_pass")), eventId);
    }

    public List<QuizResultDTO> getQuizResults(int quizId) {
        String sql = """
                SELECT u.\"ID\", u.\"name\", u.\"email\", r.\"result\"
                FROM \"UserQuizResult\" r
                JOIN \"User\" u ON r.\"user\" = u.\"ID\"
                WHERE r.\"quiz\" = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new QuizResultDTO(
                rs.getInt("ID"),
                rs.getString("name"),
                rs.getString("email"),
                rs.getFloat("result")), quizId);
    }

    public String addQuestionToQuiz(String token, QuizQuestionDTO dto) {
        String tokenWithoutPrefix = token.startsWith("Bearer ") ? token.substring(7) : token;
        String email = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(email);
        if (user == null || "participant".equals(user.getStringRole())) {
            return "Only organizers and admins can create quizzes.";
        }

        String sql = """
                INSERT INTO \"QuizQuestion\" (\"quiz\", \"text\", \"type\")
                VALUES (?, ?, ?)
                """;
        jdbcTemplate.update(sql, dto.getQuizId(), dto.getText(), dto.getType());
        return "Question added successfully.";
    }

    public String addAnswerToQuestion(String token, QuizAnswerDTO dto) {
        String tokenWithoutPrefix = token.startsWith("Bearer ") ? token.substring(7) : token;
        String email = userService.extractEmail(tokenWithoutPrefix);
        User user = userService.getUserByEmail(email);
        if (user == null || "participant".equals(user.getStringRole())) {
            return "Only organizers and admins can create quizzes.";
        }

        String sql = """
                INSERT INTO \"QuizAnswer\" (\"quiz_question\", \"text\")
                VALUES (?, ?)
                """;
        jdbcTemplate.update(sql, dto.getQuestionId(), dto.getText());
        return "Answer added successfully.";
    }

    public List<QuizQuestionDTO> getQuestionsForQuiz(int quizId) {
        String sql = """
                SELECT \"ID\", \"quiz\", \"text\", \"type\"
                FROM \"QuizQuestion\"
                WHERE \"quiz\" = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new QuizQuestionDTO(
                rs.getInt("ID"),
                rs.getInt("quiz"),
                rs.getString("text"),
                rs.getString("type")), quizId);
    }

    public List<QuizAnswerDTO> getAnswersForQuestion(int questionId) {
        String sql = """
                SELECT \"ID\", \"quiz_question\", \"text\"
                FROM \"QuizAnswer\"
                WHERE \"quiz_question\" = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new QuizAnswerDTO(
                rs.getInt("ID"),
                rs.getInt("quiz_question"),
                rs.getString("text")), questionId);
    }

    public String saveQuizResult(String token, int quizId, float result) {
        String email = userService.extractEmail(token);
        if (email == null) {
            return "Invalid token.";
        }

        User user = userService.getUserByEmail(email);
        if (user == null) {
            return "User not found.";
        }

        String response = jdbcTemplate.queryForObject(
                "SELECT save_quiz_result(?, ?, ?)",
                String.class,
                user.getId(),
                quizId,
                result);

        return response != null ? response : "Quiz result saved successfully.";
    }
}
