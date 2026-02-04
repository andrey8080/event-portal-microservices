import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { MapsService } from '../../../services/maps.service';
import { Event } from '../../../models/event.model';
import { FeedbackService, Feedback } from '../../../services/feedback.service';
import { MetricaService } from '../../../services/metrica.service';
import { NotificationService } from '../../../services/notification.service';
import { QuizService } from '../../../services/quiz.service';
import { Quiz } from '../../../models/quiz.model';

@Component({
    selector: 'app-event-detail',
    templateUrl: './event-detail.component.html',
    styleUrls: ['./event-detail.component.scss'],
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule]
})
export class EventDetailComponent implements OnInit {
    eventId: number = 0;
    event: Event | null = null;
    isLoading: boolean = true;
    error: string | null = null;
    isRegistered: boolean = false;
    isRegistering: boolean = false;

    // Feedback
    feedbacks: Feedback[] = [];
    feedbackForm: FormGroup;
    rating: number = 0;
    hoverRating: number = 0;
    isSubmittingFeedback: boolean = false;
    hasSubmittedFeedback: boolean = false;

    // Quizzes
    quizzes: Quiz[] = [];
    isQuizzesLoading: boolean = false;
    errorMessage: string | undefined;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private eventService: EventService,
        private authService: AuthService,
        private mapsService: MapsService,
        private feedbackService: FeedbackService,
        private metricaService: MetricaService,
        private fb: FormBuilder,
        private notificationService: NotificationService,
        private quizService: QuizService
    ) {
        this.feedbackForm = this.fb.group({
            comment: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        // Get event ID from route params
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.eventId = +id;
                this.loadEvent();
            } else {
                this.error = 'Неверный идентификатор события';
                this.isLoading = false;
            }
        });
        // Убираем дублирующий вызов loadEvent()
        // this.loadEvent(); <- Этот вызов нужно удалить, так как он уже происходит выше
    }

    loadEvent(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (isNaN(id)) {
            this.router.navigate(['/events']);
            return;
        }

        this.isLoading = true;
        this.eventService.getEvent(id).subscribe({
            next: (event: Event | null) => {
                this.event = event;
                this.isLoading = false;

                console.log(`Event loaded successfully, ID: ${event?.id}, title: ${event?.title}`);

                // Проверяем, зарегистрирован ли текущий пользователь
                if (this.authService.isAuthenticated() && event) {
                    console.log(`Authenticated user, checking registration for event ${event.id}`);
                    this.checkRegistrationStatus();
                } else {
                    console.log('User not authenticated or event is null, skipping registration check');
                    this.isRegistered = false;
                }

                // Загружаем отзывы
                if (this.event) {
                    this.loadFeedbacks(this.event.id);
                }

                // Даем немного времени на обновление DOM перед инициализацией карты
                setTimeout(() => {
                    this.initializeMap();
                }, 500); // Увеличиваем задержку до 500мс для гарантии загрузки DOM
            },
            error: (err: any) => {
                console.error('Failed to load event:', err);
                this.isLoading = false;
                this.errorMessage = 'Не удалось загрузить событие';
            }
        });
    }

    initializeMap(): void {
        // Проверяем наличие элемента на странице перед инициализацией карты
        if (this.event?.location && document.getElementById('event-map')) {
            const address = this.event.location.address;
            const lat = this.event.location.latitude;
            const lng = this.event.location.longitude;

            this.mapsService.createMap('event-map', address, lat, lng)
                .then(() => {
                    console.log('Map initialized successfully');
                })
                .catch(err => {
                    console.error('Error initializing map:', err);
                });
        } else {
            console.log('Map element not found or location data missing');
        }
    }

    checkRegistrationStatus(): void {
        if (!this.event) {
            console.warn('Cannot check registration status: event is null');
            return;
        }

        console.log(`Checking registration status for event: ${this.event.id}, current user: ${this.authService.getCurrentUser()?.id}`);

        this.eventService.checkRegistration(this.event.id).subscribe({
            next: (isRegistered) => {
                console.log(`Registration status received for event ${this.event?.id}: ${isRegistered}`);
                this.isRegistered = isRegistered;

                // Сохраняем статус в localStorage для подстраховки
                if (isRegistered) {
                    localStorage.setItem(`registered_event_${this.event?.id}`, 'true');
                    console.log(`Saved registration status in localStorage for event ${this.event?.id}`);
                }
            },
            error: (error) => {
                console.error(`Error checking registration status for event ${this.event?.id}:`, error);
                // Проверяем кэшированный статус в localStorage
                const cachedStatus = localStorage.getItem(`registered_event_${this.event?.id}`);
                if (cachedStatus === 'true') {
                    console.log(`Using cached registration status for event ${this.event?.id}: true`);
                    this.isRegistered = true;
                } else {
                    this.isRegistered = false;
                }
            }
        });
    }

    loadFeedbacks(eventId: number): void {
        console.log('Loading feedbacks for event ID:', eventId);

        this.feedbackService.getEventFeedbacks(eventId).subscribe({
            next: (feedbacks) => {
                console.log('Successfully loaded feedbacks:', feedbacks);
                this.feedbacks = feedbacks;

                // Check if current user has already submitted feedback
                if (this.authService.isAuthenticated()) {
                    const userId = this.authService.getCurrentUser()?.id;
                    this.hasSubmittedFeedback = feedbacks.some(f => f.userId === userId);
                    console.log('User has submitted feedback:', this.hasSubmittedFeedback);
                }
            },
            error: (err) => {
                console.error('Error loading feedbacks:', err);
                this.notificationService.error('Ошибка при загрузке отзывов');
            }
        });
    }

    // loadEventQuizzes(eventId: number): void {
    //     this.isQuizzesLoading = true;
    //     this.quizService.getEventQuizzes(eventId).subscribe({
    //         next: (quizzes) => {
    //             this.quizzes = quizzes;
    //             this.isQuizzesLoading = false;
    //         },
    //         error: (error) => {
    //             console.error('Error loading quizzes:', error);
    //             this.isQuizzesLoading = false;
    //         }
    //     });
    // }

    registerForEvent(): void {
        if (!this.event || !this.authService.isAuthenticated()) {
            this.notificationService.error('Для регистрации на событие необходимо авторизоваться');
            this.router.navigate(['/login'], { queryParams: { returnUrl: `/events/${this.event?.id}` } });
            return;
        }

        this.isRegistering = true;
        console.log(`Attempting to register for event ${this.event.id}`);

        this.eventService.registerForEvent(this.event.id).subscribe({
            next: () => {
                console.log(`Successfully registered for event ${this.event?.id}`);
                this.notificationService.success('Вы успешно зарегистрировались на событие');
                this.isRegistered = true;
                this.isRegistering = false;

                // Сохраняем статус в localStorage
                localStorage.setItem(`registered_event_${this.event?.id}`, 'true');

                // Обновляем счетчик участников
                if (this.event) {
                    this.event.registeredParticipants = (this.event.registeredParticipants || 0) + 1;
                }

                // Отслеживаем регистрацию для аналитики
                if (this.event) {
                    this.metricaService.trackEventRegistration(this.event.id, this.event.title);
                }

                // Не вызываем checkRegistrationStatus() после успешной регистрации,
                // так как мы уже знаем, что пользователь зарегистрирован
            },
            error: (error) => {
                console.error(`Error registering for event ${this.event?.id}:`, error);
                this.notificationService.error(error.error?.message || 'Ошибка при регистрации на событие');
                this.isRegistering = false;
            }
        });
    }

    cancelRegistration(): void {
        if (!this.event || !this.isRegistered) return;

        if (confirm('Вы уверены, что хотите отменить регистрацию?')) {
            console.log(`Attempting to cancel registration for event ${this.event.id}`);

            this.eventService.cancelRegistration(this.event.id).subscribe({
                next: () => {
                    console.log(`Successfully cancelled registration for event ${this.event?.id}`);
                    this.notificationService.success('Регистрация успешно отменена');
                    this.isRegistered = false;

                    // Удаляем статус из localStorage
                    localStorage.removeItem(`registered_event_${this.event?.id}`);

                    // Корректно обновляем количество участников
                    if (this.event && this.event.registeredParticipants > 0) {
                        this.event.registeredParticipants -= 1;
                    }

                    // Не вызываем checkRegistrationStatus() после отмены регистрации,
                    // так как мы уже знаем, что регистрация отменена
                }
            });
        }
    }

    // createQuiz(): void {
    //     if (!this.event) return;
    //     this.router.navigate(['/quiz/create'], { queryParams: { eventId: this.event.id } });
    // }

    // editQuiz(quizId: number): void {
    //     if (!this.event) return;
    //     this.router.navigate(['/quiz/edit'], { queryParams: { quizId, eventId: this.event.id } });
    // }

    // deleteQuiz(quizId: number): void {
    //     if (!confirm('Вы уверены, что хотите удалить этот квиз?')) return;

    //     this.quizService.deleteQuiz(quizId).subscribe({
    //         next: () => {
    //             this.notificationService.success('Квиз успешно удален');
    //             this.loadEventQuizzes(this.event!.id);
    //         },
    //         error: (error) => {
    //             console.error('Error deleting quiz:', error);
    //             this.notificationService.error(error.error?.message || 'Ошибка при удалении квиза');
    //         }
    //     });
    // }

    // takeQuiz(quizId: number): void {
    //     this.router.navigate(['/quiz/take', quizId], { queryParams: { eventId: this.event?.id } });
    // }

    // viewQuizResults(quizId: number): void {
    //     this.router.navigate(['/quiz/results'], { queryParams: { quizId, eventId: this.event?.id } });
    // }

    // canTakeQuiz(): boolean {
    //     return this.isRegistered && !this.isPastEvent();
    // }

    submitFeedback(): void {
        if (!this.event || this.rating === 0) return;

        this.isSubmittingFeedback = true;
        const comment = this.feedbackForm.get('comment')?.value;
        console.log('Submitting feedback:', { eventId: this.event.id, rating: this.rating, comment });

        this.feedbackService.submitFeedback(this.event.id, this.rating, comment).subscribe({
            next: (response) => {
                console.log('Feedback submitted successfully:', response);
                this.notificationService.success('Отзыв успешно отправлен');
                this.hasSubmittedFeedback = true;
                this.isSubmittingFeedback = false;
                this.feedbackForm.reset();
                this.rating = 0;

                // Reload feedbacks after a short delay to ensure the server has time to process
                setTimeout(() => {
                    this.loadFeedbacks(this.event!.id);
                }, 500);
            },
            error: (err) => {
                console.error('Error submitting feedback:', err);
                this.isSubmittingFeedback = false;
                this.notificationService.error('Произошла ошибка при отправке отзыва');
            }
        });
    }

    deleteFeedback(feedbackId: number): void {
        if (confirm('Вы уверены, что хотите удалить этот отзыв?')) {
            if (!this.event) {
                return;
            }
            this.feedbackService.deleteFeedback(this.event.id, feedbackId).subscribe({
                next: () => {
                    // Remove feedback from list
                    this.feedbacks = this.feedbacks.filter(f => f.id !== feedbackId);
                    alert('Отзыв успешно удален');
                },
                error: (err) => {
                    console.error('Error deleting feedback:', err);
                    alert('Произошла ошибка при удалении отзыва');
                }
            });
        }
    }

    deleteEvent(): void {
        if (!this.event) return;

        if (confirm('Вы уверены, что хотите удалить это событие?')) {
            this.eventService.deleteEvent(this.event.id).subscribe({
                next: () => {
                    alert('Событие успешно удалено');
                    this.router.navigate(['/events']);
                },
                error: (err) => {
                    console.error('Error deleting event:', err);
                    alert('Произошла ошибка при удалении события');
                }
            });
        }
    }

    isPastEvent(): boolean {
        if (!this.event) return false;
        return new Date(this.event.endDate) < new Date();
    }

    isEventFull(): boolean {
        if (!this.event) return false;
        return this.event.maxParticipants > 0 && this.event.registeredParticipants >= this.event.maxParticipants;
    }

    isOrganizerOrAdmin(): boolean {
        if (!this.event || !this.authService.isAuthenticated()) return false;

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) return false;

        return this.authService.isAdmin() ||
            (this.event.organizerId === currentUser.id && this.authService.isOrganizer());
    }

    /**
     * Форматирует дату события в удобочитаемом формате
     */
    formatEventDate(date: Date | string): string {
        const eventDate = new Date(date);
        const today = new Date();

        // Устанавливаем время в 00:00:00 для корректного сравнения дат
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

        // Разница в днях
        const diffTime = eventDateOnly.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Сегодня, ' + eventDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Завтра, ' + eventDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === -1) {
            return 'Вчера, ' + eventDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays > 1 && diffDays < 7) {
            // День недели для дат в текущей неделе
            const options: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit'
            };
            return eventDate.toLocaleDateString('ru-RU', options);
        } else {
            // Полная дата для остальных случаев
            const options: Intl.DateTimeFormatOptions = {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            };
            if (eventDate.getFullYear() !== today.getFullYear()) {
                options.year = 'numeric';
            }
            return eventDate.toLocaleDateString('ru-RU', options);
        }
    }

    /**
     * Проверяет, был ли отзыв оставлен указанным пользователем
     */
    isUserFeedback(feedback: Feedback): boolean {
        const currentUser = this.authService.getCurrentUser();
        return currentUser ? feedback.userId === currentUser.id : false;
    }

    /**
     * Генерирует ссылку на событие для шаринга
     */
    getShareLink(): string {
        return window.location.href;
    }

    /**
     * Открывает диалог для шаринга события
     */
    shareEvent(): void {
        if (navigator.share) {
            navigator.share({
                title: this.event?.title,
                text: `Проверь это событие: ${this.event?.title}`,
                url: window.location.href
            }).catch((error) => console.error('Ошибка при шаринге:', error));
        } else {
            // Если Web Share API не поддерживается, копируем ссылку в буфер обмена
            const dummy = document.createElement('input');
            document.body.appendChild(dummy);
            dummy.value = window.location.href;
            dummy.select();
            document.execCommand('copy');
            document.body.removeChild(dummy);

            this.notificationService.success('Ссылка на событие скопирована в буфер обмена');
        }
    }
}
