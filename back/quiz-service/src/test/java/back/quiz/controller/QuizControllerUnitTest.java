package back.quiz.controller;

import back.quiz.dto.QuizDTO;
import back.quiz.service.QuizService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class QuizControllerUnitTest {

    @Test
    void createQuizShouldReturnUnauthorizedWhenTokenIsInvalid() {
        QuizService quizService = mock(QuizService.class);
        QuizController controller = new QuizController(quizService);

        ResponseEntity<?> response = controller.createQuiz("invalid-token", new QuizDTO());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(quizService);
    }
}
