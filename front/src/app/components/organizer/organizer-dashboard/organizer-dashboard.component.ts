import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Event } from '../../../models/event.model';
import { Quiz, Question, QuizResult, QuestionType } from '../../../models/quiz.model';
import { User } from '../../../models/user.model';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { QuizService } from '../../../services/quiz.service';
import { OrganizerService } from '../../../services/organizer.service';

// For bootstrap modals
declare var bootstrap: any;

import { Router } from '@angular/router';

@Component({
    selector: 'app-organizer-dashboard',
    templateUrl: './organizer-dashboard.component.html',
    styleUrls: ['./organizer-dashboard.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule]
})
export class OrganizerDashboardComponent implements OnInit {
    // Make Math available in the template
    Math = Math;

    // Tabs
    activeTab = 'dashboard';

    upcomingEvents: Event[] = [];
    recentFeedbacks: any[] = [];
    isLoading = true;

    // Events management
    myEvents: Event[] = [];
    isLoadingEvents = false;

    allParticipiantsCount: number = 0;

    // Participants management
    selectedEventId: number | null = null;
    participants: User[] = [];
    isLoadingParticipants = false;
    selectedParticipant: User | null = null;
    participantDetailsModal: any;

    // Email sending
    emailForm: FormGroup;
    emailModal: any;
    isSendingEmail = false;

    // Quizzes management
    selectedQuizEventId: number | null = null;
    quizzes: Quiz[] = [];
    isLoadingQuizzes = false;
    quizQuestions: { [quizId: number]: Question[] } = {};
    quizAttempts: { [quizId: number]: number } = {};

    // Quiz form
    quizForm: FormGroup;
    quizModal: any;
    editingQuiz: Quiz | null = null;
    isSavingQuiz = false;

    // Quiz results
    quizResultsModal: any;
    selectedQuiz: Quiz | null = null;
    quizResults: QuizResult[] = [];
    isLoadingQuizResults = false;

    selectedEvent: any = null;
    averageRating: number = 0;

    constructor(
        private fb: FormBuilder,
        private eventService: EventService,
        private authService: AuthService,
        private quizService: QuizService,
        private organizerService: OrganizerService,
        private router: Router
    ) {
        // Initialize forms
        this.emailForm = this.fb.group({
            subject: ['', Validators.required],
            message: ['', Validators.required]
        });

        this.quizForm = this.fb.group({
            description: ['', Validators.required],
            timeToPass: [300, [Validators.required, Validators.min(10)]],
            questions: this.fb.array([])
        });
    }

    ngOnInit(): void {
        // Check if user is organizer
        if (!this.authService.isOrganizer() && !this.authService.isAdmin()) {
            this.router.navigate(['/']);
            return;
        }

        this.loadDashboardData();
        this.loadMyEvents();

        // Initialize modals
        setTimeout(() => {
            this.initModals();
        }, 500);
    }

    initModals() {
        const emailModalEl = document.getElementById('emailModal');
        if (emailModalEl) {
            this.emailModal = new bootstrap.Modal(emailModalEl);
        }

        const quizModalEl = document.getElementById('quizModal');
        if (quizModalEl) {
            this.quizModal = new bootstrap.Modal(quizModalEl);
        }

        const quizResultsModalEl = document.getElementById('quizResultsModal');
        if (quizResultsModalEl) {
            this.quizResultsModal = new bootstrap.Modal(quizResultsModalEl);
        }

        const participantDetailsModalEl = document.getElementById('participantDetailsModal');
        if (participantDetailsModalEl) {
            this.participantDetailsModal = new bootstrap.Modal(participantDetailsModalEl);
        }
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;

        // Load data based on active tab
        switch (tab) {
            case 'events':
                this.loadMyEvents();
                break;
            case 'participants':
                // Если есть уже выбранное событие, загрузим его участников
                if (this.selectedEventId) {
                    this.loadParticipants();
                }
                break;
            case 'quizzes':
                // Загрузим события для выбора, если они еще не загружены
                if (this.myEvents.length === 0) {
                    this.loadMyEvents();
                }
                // Если уже есть выбранное событие для викторин, загрузим их
                if (this.selectedQuizEventId) {
                    this.loadQuizzes();
                }
                break;
        }
    }

    // Dashboard methods
    loadDashboardData(): void {
        this.isLoading = true;

        // Загружаем количество зарегистрированных пользователей
        this.organizerService.getCountRegisteredUsers().subscribe({
            next: (data) => {
                this.allParticipiantsCount = data.count;
            }
        });

        this.organizerService.getAverageFeedbackRating().subscribe({
            next: (data) => {
                this.averageRating = data.score;
            }
        });
    }

    // Events methods
    loadMyEvents(): void {
        this.isLoadingEvents = true;

        this.organizerService.getOrganizerEvents().subscribe({
            next: (events) => {
                this.myEvents = events;
                this.isLoadingEvents = false;
            },
            error: (err) => {
                console.error('Error loading events:', err);
                this.isLoadingEvents = false;
            }
        });
    }

    isPastEvent(event: Event): boolean {
        return new Date(event.endDate) < new Date();
    }

    deleteEvent(event: Event): void {
        if (confirm(`Вы уверены, что хотите удалить событие "${event.title}"?`)) {
            this.eventService.deleteEvent(event.id).subscribe({
                next: () => {
                    this.myEvents = this.myEvents.filter(e => e.id !== event.id);
                },
                error: (err) => {
                    console.error('Error deleting event:', err);
                }
            });
        }
    }

    // Participants methods
    loadParticipants(): void {
        if (!this.selectedEventId && this.selectedEventId !== 0) return;

        this.isLoadingParticipants = true;
        console.log('Loading participants for event:', this.selectedEventId);

        this.organizerService.getEventParticipants(this.selectedEventId).subscribe({
            next: (participants) => {
                this.participants = participants;
                this.isLoadingParticipants = false;
            },
            error: (err) => {
                console.error('Error loading participants:', err);
                this.isLoadingParticipants = false;
            }
        });
    }

    viewParticipantDetails(participant: User): void {
        this.selectedParticipant = participant;
        this.participantDetailsModal.show();
    }

    // Email methods
    sendEmailToParticipants(): void {
        this.emailForm.reset();

        // Найдем название события по selectedEventId
        if (this.selectedEventId) {
            const selectedEvent = this.myEvents.find(event => event.id === this.selectedEventId);
            if (selectedEvent) {
                // Устанавливаем автоматическую тему письма
                this.emailForm.patchValue({
                    subject: `EventPortal, информация о событие "${selectedEvent.title}" от организатора`
                });
            }
        }

        this.emailModal.show();
    }

    sendEmailToSingleParticipant(participant: User): void {
        this.emailForm.reset();
        this.participantDetailsModal.hide();

        // Найдем название события по selectedEventId
        if (this.selectedEventId) {
            const selectedEvent = this.myEvents.find(event => event.id === this.selectedEventId);
            if (selectedEvent) {
                // Устанавливаем автоматическую тему письма
                this.emailForm.patchValue({
                    subject: `EventPortal, информация о событие "${selectedEvent.title}" от организатора`
                });
            }
        }

        this.emailModal.show();
    }

    sendEmail(): void {
        if (this.emailForm.invalid || !this.selectedEventId) {
            return;
        }

        this.isSendingEmail = true;

        const emailData = {
            ...this.emailForm.value,

        };

        this.organizerService.sendEmailToParticipants(emailData, this.selectedEventId).subscribe({
            next: () => {
                this.isSendingEmail = false;
                this.emailModal.hide();
                alert('Сообщение успешно отправлено участникам');
            },
            error: (err) => {
                console.error('Error sending email:', err);
                this.isSendingEmail = false;
                alert('Произошла ошибка при отправке сообщения');
            }
        });
    }

    // Quizzes methods
    loadQuizzes(): void {
        if (!this.selectedQuizEventId && this.selectedQuizEventId !== 0) return;

        this.isLoadingQuizzes = true;

        this.quizService.getEventQuizzes(this.selectedQuizEventId).subscribe({
            next: (quizzes) => {
                this.quizzes = quizzes;
                this.isLoadingQuizzes = false;
                this.loadQuizzesData(); // Загружаем дополнительные данные о викторинах
            },
            error: (err) => {
                console.error('Error loading quizzes:', err);
                this.isLoadingQuizzes = false;
            }
        });
    }

    // Загрузка дополнительных данных о викторинах (вопросы и попытки)
    loadQuizzesData(): void {
        if (!this.quizzes || this.quizzes.length === 0) return;

        // Загружаем информацию о вопросах и попытках для каждой викторины
        this.quizzes.forEach(quiz => {
            // Загрузка вопросов
            this.quizService.getQuizQuestions(quiz.id).subscribe({
                next: (questions) => {
                    this.quizQuestions[quiz.id] = questions;
                },
                error: (err) => {
                    console.error(`Error loading questions for quiz ${quiz.id}:`, err);
                }
            });

            // Загрузка количества попыток
            // this.quizService.getQuizAttempts(quiz.id).subscribe({
            //     next: (attempts) => {
            //         this.quizAttempts[quiz.id] = attempts.length;
            //     },
            //     error: (err) => {
            //         console.error(`Error loading attempts for quiz ${quiz.id}:`, err);
            //     }
            // });
        });
    }

    openCreateQuizModal(): void {
        if (!this.selectedQuizEventId) {
            alert('Пожалуйста, выберите событие для создания викторины');
            return;
        }

        this.editingQuiz = null;
        this.quizForm.reset({
            description: '',
            timeToPass: 300
        });
        this.quizForm.setControl('questions', this.fb.array([]));
        // Добавляем хотя бы один вопрос для викторины
        this.addQuestion();

        this.quizModal.show();
    }

    // Удалить дублирующий метод openQuizModal и использовать editQuiz для редактирования
    editQuiz(quiz: Quiz): void {
        this.editingQuiz = quiz;

        this.quizForm.patchValue({
            description: quiz.description,
            timeToPass: quiz.timeToPass
        });

        // Load quiz questions and set form
        this.quizService.getQuizQuestions(quiz.id).subscribe({
            next: (questions) => {
                const questionsArray = this.fb.array([]);

                questions.forEach(question => {
                    const questionGroup = this.fb.group({
                        text: [question.text, Validators.required],
                        type: [question.type, Validators.required],
                        correctAnswer: [''],
                        answers: this.fb.array([])
                    });

                    // В текущем API нет correct-answer и нет признака isCorrect в ответах.
                    // Для TEXT оставляем correctAnswer пустым, для остальных — подгружаем ответы (только text).
                    if (question.type !== 'TEXT') {
                        this.quizService.getQuestionAnswers(question.id!, quiz.id).subscribe({
                            next: (answers) => {
                                const answersArray = questionGroup.get('answers') as FormArray;

                                answers.forEach(answer => {
                                    answersArray.push(this.fb.group({
                                        text: [answer.text, Validators.required],
                                        isCorrect: [false]
                                    }));
                                });
                            },
                            error: (err) => {
                                console.error('Error loading question answers:', err);
                            }
                        });
                    }

                    (questionsArray as FormArray).push(questionGroup);
                });

                this.quizForm.setControl('questions', questionsArray);
                this.quizModal.show();
            },
            error: (err) => {
                console.error(`Error loading questions for quiz ${quiz.id}:`, err);
                alert('Ошибка загрузки вопросов викторины');
            }
        });
    }

    saveQuiz(): void {
        if (this.quizForm.invalid) {
            return;
        }

        this.isSavingQuiz = true;

        const quizData = this.quizForm.value;

        if (this.editingQuiz) {
            alert('Редактирование квиза не поддерживается текущим API');
            this.isSavingQuiz = false;
            return;
        } else {
            this.quizService.createQuiz(this.selectedQuizEventId!, quizData).subscribe({
                next: () => {
                    this.isSavingQuiz = false;
                    this.quizModal.hide();
                    this.loadQuizzes();
                },
                error: (err) => {
                    console.error('Error creating quiz:', err);
                    this.isSavingQuiz = false;
                }
            });
        }
    }

    deleteQuiz(quiz: Quiz): void {
        void quiz;
        alert('Удаление квиза не поддерживается текущим API');
    }

    // Quiz results methods
    loadQuizResults(quiz: Quiz): void {
        this.selectedQuiz = quiz;
        this.isLoadingQuizResults = true;

        this.quizService.getQuizResults(quiz.id).subscribe({
            next: (results) => {
                this.quizResults = results;
                this.isLoadingQuizResults = false;
                this.quizResultsModal.show();
            },
            error: (err) => {
                console.error('Error loading quiz results:', err);
                this.isLoadingQuizResults = false;
            }
        });
    }

    exportQuizResults(): void {
        if (!this.selectedQuiz) return;

        alert('Экспорт результатов не поддерживается текущим API');
    }

    // Form array helpers
    get questions(): FormArray {
        return this.quizForm.get('questions') as FormArray;
    }

    removeQuestion(index: number): void {
        this.questions.removeAt(index);
    }

    getAnswers(questionIndex: number): FormArray {
        return this.questions.at(questionIndex).get('answers') as FormArray;
    }

    addAnswer(questionIndex: number): void {
        const answers = this.getAnswers(questionIndex);

        answers.push(this.fb.group({
            text: ['', Validators.required],
            isCorrect: [false]
        }));
    }

    removeAnswer(questionIndex: number, answerIndex: number): void {
        const answers = this.getAnswers(questionIndex);
        answers.removeAt(answerIndex);
    }

    // Добавим отсутствующие методы для работы с квизами
    getQuizQuestionCount(quizId: number): number {
        return this.quizQuestions[quizId]?.length || 0;
    }

    getQuizAttemptCount(quizId: number): number {
        return this.quizAttempts[quizId] || 0;
    }

    viewQuizResults(quiz: Quiz): void {
        this.loadQuizResults(quiz);
    }

    buildQuizForm(quiz?: Quiz): void {
        this.quizForm = this.fb.group({
            title: [quiz?.title || '', [Validators.required, Validators.minLength(5)]],
            description: [quiz?.description || '', [Validators.required]],
            eventId: [quiz?.eventId || this.selectedEvent?.id || null, [Validators.required]],
            timeLimit: [quiz?.timeLimit || 30, [Validators.required, Validators.min(5)]],
            passScore: [quiz?.passScore || 70, [Validators.required, Validators.min(1), Validators.max(100)]],
            questions: this.fb.array([])
        });

        if (quiz && quiz.questions) {
            quiz.questions.forEach(question => this.addQuestion(question));
        } else {
            this.addQuestion();
        }
    }

    // Получаем вопросы как FormArray
    get questionsArray(): FormArray {
        return this.quizForm.get('questions') as FormArray;
    }

    // Добавляем вопрос в форму
    addQuestion(question?: Question): void {
        const questionGroup = this.fb.group({
            text: [question?.text || '', [Validators.required]],
            type: [question?.type || QuestionType.SINGLE_CHOICE, [Validators.required]],
            correctAnswer: [question?.correctAnswer || ''],
            answers: this.fb.array([])
        });

        // Добавляем ответы, если они есть
        if (question && question.possibleAnswers) {
            question.possibleAnswers.forEach(answer => {
                this.addAnswerToQuestion(questionGroup.get('answers') as FormArray, answer);
            });
        } else {
            // Добавляем по умолчанию 4 варианта ответа для вопросов с выбором
            const questionType = questionGroup.get('type')?.value;
            // if (questionType === 'SINGLE' || questionType === 'MULTIPLE') {
            //     for (let i = 0; i < 4; i++) {
            //         this.addAnswerToQuestion(questionGroup.get('answers') as FormArray);
            //     }
            // }
        }

        this.questionsArray.push(questionGroup);
    }

    // Методы для работы с ответами в вопросах
    addAnswerToQuestion(answersArray: FormArray, answer?: any): void {
        const answerGroup = this.fb.group({
            text: [answer?.text || '', Validators.required],
            isCorrect: [answer?.isCorrect || false]
        });
        answersArray.push(answerGroup);
    }

    // Обработка изменения типа вопроса
    onQuestionTypeChanged(questionIndex: number): void {
        const questionGroup = this.questions.at(questionIndex);
        const questionType = questionGroup.get('type')?.value;
        const answersArray = questionGroup.get('answers') as FormArray;

        // Очищаем текущие ответы
        while (answersArray.length) {
            answersArray.removeAt(0);
        }

        // Добавляем ответы для типов SINGLE и MULTIPLE
        if (questionType === 'SINGLE' || questionType === 'MULTIPLE') {
            // Добавляем по умолчанию 4 варианта ответа
            for (let i = 0; i < 4; i++) {
                this.addAnswerToQuestion(answersArray);
            }
        }
    }
}
