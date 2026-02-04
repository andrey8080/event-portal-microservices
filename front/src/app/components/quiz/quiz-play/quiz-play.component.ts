import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Quiz, Question, QuizResult } from '../../../models/quiz.model';
import { QuizService } from '../../../services/quiz.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-quiz-play',
    templateUrl: './quiz-play.component.html',
    // styleUrls: ['./quiz-play.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class QuizPlayComponent implements OnInit, OnDestroy {
    quiz: Quiz | null = null;
    questions: Question[] = [];
    eventId: number | null = null;
    quizId: number | null = null;
    eventTitle = '';
    isLoading = true;
    isStarted = false;
    isSubmitting = false;
    isFinished = false;
    currentQuestionIndex = 0;
    timeRemaining = 0;
    timerInterval: any;
    answers: { [questionId: number]: string } = {};
    score = 0;
    totalQuestions = 0;
    errorMessage = '';
    selectedAnswer: string | null = null;
    isAnswered = false;
    quizCompleted = false;
    Math = Math; // Добавляем Math для использования в шаблоне
    startTime = new Date(); // Добавляем свойство startTime

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private quizService: QuizService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        // Получаем параметры из URL
        const eventIdParam = this.route.snapshot.paramMap.get('eventId');
        const quizIdParam = this.route.snapshot.paramMap.get('quizId') ||
            this.route.snapshot.queryParamMap.get('quizId');

        this.eventId = eventIdParam ? +eventIdParam : null;
        this.quizId = quizIdParam ? +quizIdParam : null;

        if (!this.eventId) {
            this.errorMessage = 'Необходимо указать ID события';
            this.isLoading = false;
            return;
        }

        this.loadQuizFromEvent(this.eventId, this.quizId);
    }

    ngOnDestroy(): void {
        this.clearTimer();
    }

    loadQuizFromEvent(eventId: number, quizId: number | null): void {
        this.isLoading = true;

        this.quizService.getQuizzes(eventId).subscribe({
            next: (quizzes: Quiz[]) => {
                if (!quizzes || quizzes.length === 0) {
                    this.errorMessage = 'Для данного события не найдено квизов';
                    this.isLoading = false;
                    return;
                }

                const selected = quizId ? quizzes.find(q => q.id === quizId) : quizzes[0];
                if (!selected) {
                    this.errorMessage = 'Квиз не найден для данного события';
                    this.isLoading = false;
                    return;
                }

                this.quiz = selected;
                this.quizId = selected.id;
                this.timeRemaining = selected.timeToPass || 300;
                this.loadQuestions(selected.id);
            },
            error: (err: any) => {
                this.errorMessage = 'Ошибка загрузки квиза: ' + err.message;
                this.isLoading = false;
            }
        });
    }

    loadQuestions(quizId: number): void {
        this.quizService.getQuestions(quizId).subscribe({
            next: (questions: Question[]) => {
                this.questions = questions;
                this.totalQuestions = questions.length;
                this.isLoading = false;
            },
            error: (err: any) => {
                this.errorMessage = 'Ошибка загрузки вопросов: ' + err.message;
                this.isLoading = false;
            }
        });
    }

    startQuiz(): void {
        if (!this.quiz) return;

        this.isStarted = true;
        this.startTime = new Date(); // Устанавливаем время начала прохождения квиза
        this.startTimer();
    }

    startTimer(): void {
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining > 0) {
                this.timeRemaining--;
            } else {
                this.finishQuiz();
            }
        }, 1000);
    }

    clearTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    getFormattedTime(): string {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getCurrentQuestion(): Question | null {
        return this.questions.length > 0 && this.currentQuestionIndex < this.questions.length
            ? this.questions[this.currentQuestionIndex]
            : null;
    }

    // Метод для выбора ответа на текущий вопрос
    selectAnswer(answer: string): void {
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion && currentQuestion.id) {
            // Здесь обрабатываем все типы вопросов
            this.answers[currentQuestion.id] = answer;
            this.selectedAnswer = answer;
            this.isAnswered = true;
        }
    }

    nextQuestion(): void {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.selectedAnswer = this.getCurrentQuestionAnswer();
            this.isAnswered = !!this.selectedAnswer;
        } else {
            this.quizCompleted = true;
        }
    }

    previousQuestion(): void {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.selectedAnswer = this.getCurrentQuestionAnswer();
            this.isAnswered = !!this.selectedAnswer;
        }
    }

    // Получить ответ пользователя на текущий вопрос
    getCurrentQuestionAnswer(): string | null {
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion && currentQuestion.id && this.answers[currentQuestion.id]) {
            return this.answers[currentQuestion.id];
        }
        return null;
    }

    // Проверить, ответил ли пользователь на все вопросы
    areAllQuestionsAnswered(): boolean {
        return this.questions.every(question => question.id && !!this.answers[question.id]);
    }

    finishQuiz(): void {
        this.clearTimer();
        this.submitQuiz();
    }

    submitQuiz(): void {
        this.isSubmitting = true;

        if (!this.quiz) return;

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) {
            this.errorMessage = 'Пользователь не авторизован';
            this.isSubmitting = false;
            return;
        }

        // В текущем quiz-service нет отправки ответов по вопросам, сохраняется только итоговый результат.
        this.sendQuizResult(currentUser);
    }

    // Вспомогательный метод для отправки результата квиза
    private sendQuizResult(currentUser: any): void {
        if (!this.quizId) {
            this.errorMessage = 'Не удалось определить ID квиза';
            this.isSubmitting = false;
            return;
        }

        const answeredCount = Object.keys(this.answers)
            .map(k => +k)
            .filter(id => !!this.answers[id] && this.answers[id].trim().length > 0)
            .length;

        const total = this.totalQuestions || 0;
        const percentage = total > 0 ? (answeredCount / total) * 100 : 0;

        const quizResult: QuizResult = {
            id: 0,
            quizId: this.quizId,
            userId: currentUser.id,
            userName: currentUser.name || [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' '),
            userEmail: currentUser.email,
            result: percentage,
            startTime: this.startTime // Добавляем время начала
        };

        this.quizService.submitQuizResult(quizResult).subscribe({
            next: (result) => {
                this.isSubmitting = false;
                this.isFinished = true;
                this.score = result.result || 0;
                // Можно также сохранить результат и отобразить статистику
            },
            error: (err: any) => {
                this.errorMessage = 'Ошибка при отправке результатов: ' + err.message;
                this.isSubmitting = false;
            }
        });
    }

    returnToEvent(): void {
        if (this.eventId) {
            this.router.navigate(['/events', this.eventId]);
        } else {
            this.router.navigate(['/events']);
        }
    }
}
