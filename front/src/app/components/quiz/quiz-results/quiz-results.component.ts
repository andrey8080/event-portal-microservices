import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuizService } from '../../../services/quiz.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { QuizResult } from '../../../models/quiz.model';

@Component({
    selector: 'app-quiz-results',
    templateUrl: './quiz-results.component.html',
    // styleUrls: ['./quiz-results.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export class QuizResultsComponent implements OnInit {
    quizId: number = 0;
    eventId: number = 0;
    results: QuizResult[] = [];
    isLoading: boolean = true;
    error: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private quizService: QuizService,
        private authService: AuthService,
        private notificationService: NotificationService
    ) { }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.quizId = +params['quizId'] || 0;
            this.eventId = +params['eventId'] || 0;

            if (!this.quizId || !this.eventId) {
                this.error = 'Необходимы идентификаторы квиза и события';
                this.isLoading = false;
                return;
            }

            this.loadResults();
        });
    }

    loadResults(): void {
        this.isLoading = true;

        if (this.eventId) {
            // Если передан eventId, получаем результаты по событию
            this.quizService.getQuizResultsByEvent(this.eventId).subscribe({
                next: (results: QuizResult[]) => {
                    this.results = results.filter(r => r.quizId === this.quizId);
                    this.isLoading = false;
                },
                error: (error: any) => {
                    this.notificationService.error('Ошибка при загрузке результатов');
                    this.isLoading = false;
                }
            });
        } else if (this.quizId) {
            // Иначе получаем результаты только для конкретного квиза
            this.quizService.getQuizResults(this.quizId).subscribe({
                next: (results: QuizResult[]) => {
                    this.results = results;
                    this.isLoading = false;
                },
                error: (error: any) => {
                    this.notificationService.error('Ошибка при загрузке результатов');
                    this.isLoading = false;
                }
            });
        }
    }

    formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getScoreClass(percentageScore: number): string {
        if (percentageScore >= 80) {
            return 'text-success';
        } else if (percentageScore >= 60) {
            return 'text-warning';
        } else {
            return 'text-danger';
        }
    }

    goBack(): void {
        this.router.navigate(['/events', this.eventId]);
    }

    // Новые методы для вычислений
    getAveragePercentage(): string {
        if (!this.results || this.results.length === 0) {
            return '0%';
        }

        const average = this.results.reduce((sum, result) => {
            // Безопасно добавляем percentageScore с проверкой на undefined
            return sum + (result.percentageScore || 0);
        }, 0) / this.results.length;

        return average.toFixed(1) + '%';
    }

    getSuccessfulAttemptsCount(): number {
        if (!this.results) {
            return 0;
        }
        // Безопасная проверка свойства passed
        return this.results.filter(r => r.passed === true).length;
    }
}
