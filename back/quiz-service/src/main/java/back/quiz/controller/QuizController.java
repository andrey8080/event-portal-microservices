package back.quiz.controller;

import back.quiz.dto.QuizAnswerDTO;
import back.quiz.dto.QuizDTO;
import back.quiz.dto.QuizQuestionDTO;
import back.quiz.dto.QuizResultDTO;
import back.quiz.service.QuizService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class QuizController {
    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping("/quizzes")
    public ResponseEntity<?> createQuiz(@RequestHeader("Authorization") String token, @RequestBody QuizDTO dto) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Unauthorized\"}");
        }
        String result = quizService.createQuiz(token, dto);
        if (result.equals("Quiz created successfully.")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @GetMapping("/quizzes")
    public ResponseEntity<?> getQuizzesForEvent(@RequestParam("eventId") int eventId) {
        List<QuizDTO> quizzes = quizService.getQuizzesForEvent(eventId);
        return ResponseEntity.ok(quizzes);
    }

    @PostMapping("/quizzes/{quizId}/questions")
    public ResponseEntity<?> addQuestionToQuiz(@RequestHeader("Authorization") String token,
            @PathVariable int quizId,
            @RequestBody QuizQuestionDTO dto) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Unauthorized\"}");
        }
        dto.setQuizId(quizId);
        String result = quizService.addQuestionToQuiz(token, dto);
        if (result.equals("Question added successfully.")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @PostMapping("/quizzes/{quizId}/questions/{questionId}/answers")
    public ResponseEntity<?> addAnswerToQuestion(@RequestHeader("Authorization") String token,
            @PathVariable int quizId,
            @PathVariable int questionId,
            @RequestBody QuizAnswerDTO dto) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Unauthorized\"}");
        }
        dto.setQuestionId(questionId);
        String result = quizService.addAnswerToQuestion(token, dto);
        if (result.equals("Answer added successfully.")) {
            return ResponseEntity.ok("{\"message\":\"" + result + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + result + "\"}");
    }

    @GetMapping("/quizzes/{quizId}/questions")
    public ResponseEntity<?> getQuestionsForQuiz(@PathVariable int quizId) {
        return ResponseEntity.ok(quizService.getQuestionsForQuiz(quizId));
    }

    @GetMapping("/quizzes/{quizId}/questions/{questionId}/answers")
    public ResponseEntity<?> getAnswersForQuestion(@PathVariable int quizId, @PathVariable int questionId) {
        return ResponseEntity.ok(quizService.getAnswersForQuestion(questionId));
    }

    @GetMapping("/quizzes/{quizId}/results")
    public ResponseEntity<?> getQuizResults(@PathVariable int quizId) {
        List<QuizResultDTO> results = quizService.getQuizResults(quizId);
        return ResponseEntity.ok(results);
    }

    @PutMapping("/quizzes/{quizId}/results/me")
    public ResponseEntity<?> saveMyQuizResult(@RequestHeader("Authorization") String token,
            @PathVariable int quizId,
            @RequestParam("result") float result) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body("{\"error\":\"Unauthorized\"}");
        }
        String tokenWithoutPrefix = token.substring(7);
        String response = quizService.saveQuizResult(tokenWithoutPrefix, quizId, result);
        if (response.equals("Quiz result saved successfully.")
                || response.equals("Quiz result updated successfully.")) {
            return ResponseEntity.ok("{\"message\":\"" + response + "\"}");
        }
        return ResponseEntity.status(403).body("{\"error\":\"" + response + "\"}");
    }
}
